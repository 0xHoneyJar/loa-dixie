// Phase 26E — POST /api/recall/intake.
//
// Authorized by ADR-026D (loa-straylight). Consumer obligations:
// ADR-026C §3.1–§3.8. Endpoint prerequisites: ADR-026D §3.a–§3.d.
// Fail-closed catalogue: ADR-026D §4.a–§4.g.
//
// Phase 30C — Recall-intake contract preflight: the ingress zod schema is
// structurally aligned with `@loa/straylight/host`'s `RecallIntakeRequest`
// so no `as unknown as` cast is required at the seam. Host-ish / legacy
// shapes (e.g. `signature_value`, `algorithm`, `risk_profile: routine`,
// `environment_frame: actor_private`) are refused at ingress with
// `ingress.invalid_request` rather than silently passed through.
//
// Pipeline (per request):
//   1. zod validation of body shape (strict — wedge-aligned)
//   2. authenticated wallet resolution (existing JWT middleware)
//   3. AUTHORITATIVE tenant/actor override — caller-supplied
//      `caller.tenant_id`, `caller.actor_id`, and `request.actor_id`
//      that disagree with the session wallet are REJECTED at ingress
//      with `ingress.cross_tenant_body_mismatch` (ADR-026D §3.d).
//   4. endpoint-local body cap (stricter than the global /api/* limit)
//   5. endpoint-local per-tenant rate limit (token-bucket)
//   6. Idempotency-Key required; cache lookup returns prior response
//      verbatim (ADR-026D §3.b (i))
//   7. per-estate mutex acquire (ADR-026D §3.c (i))
//   8. capability holder mints / re-mints; passes capability through
//      to handleRecallIntake as the fourth argument (ADR-026C §3.5)
//   9. response → refusal-mapping; cache populate; mutex release
//
// Subpath discipline: this file value-imports ONLY from
// `@loa/straylight/runtime/recall-intake`. `@loa/straylight` and
// `@loa/straylight/host` types are imported type-only.

import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { handleRecallIntake } from '@loa/straylight/runtime/recall-intake';
import type {
  IntakeDeps,
  RecallIntakeRequest,
  RecallIntakeResponse,
} from '@loa/straylight/host';
import type { EstateStore } from '@loa/straylight';
import { getRequestContext } from '../validation.js';
import {
  type BoundedEstateStore,
  BoundedStoreCapExceededError,
  type CapabilityHolder,
  type IdempotencyCache,
  type PerEstateMutex,
  type PerTenantRateLimit,
  ingressRefusal,
  guardRefusal,
  mapSeamResponseToRefusal,
} from '../services/straylight-recall-intake/index.js';
import { checkSameTenant } from '../services/straylight-host/tenant-resolver.js';
import type {
  IntakeDenyLog,
  TenantResolver,
} from '@loa/straylight/host';

// Phase 30C — wedge-aligned ingress schema.
//
// The schema below is the *real* `RecallIntakeRequest` shape exported by
// `@loa/straylight/host`. The route refuses anything else at ingress
// rather than silently casting a host-ish body to the wedge type.
//
// Closed enums (mirrored from `@loa/straylight`):
//   * SignerType, SignatureType — wedge `SignatureEnvelope`
//   * AssertionClass, AssertionStatus — wedge `RecallRequest` filter sets
//   * EnvironmentFrame — full wedge vocabulary (the host narrows to
//     {actor_private, public_discord} for surface 4/6 via `HostFrame`,
//     but the underlying `RecallRequest.environment_frame` is the wedge
//     enum, NOT the host one — Surface 1 intake reuses the wedge type
//     directly, so the route schema must accept the wedge vocabulary).
//   * RiskLevel — wedge `RecallRequest.risk_profile`
//   * ReceiptDetailLevel — `'minimal' | 'standard' | 'debug'`
//   * HostFrame — narrowed enum on `caller.frame` (host-side)
//
// A compile-time tripwire below (`_RecallIntakeBodyMatchesHost`) ensures
// the inferred zod output is assignable to the host's `RecallIntakeRequest`
// without an unsafe cast.

const SIGNER_TYPES = [
  'actor_controller',
  'operator',
  'runtime',
  'reviewer',
  'policy_service',
  'admin',
  'wallet',
  'service_key',
] as const;

const SIGNATURE_TYPES = [
  'ed25519',
  'secp256k1',
  'hmac',
  'dev_signature',
] as const;

const ASSERTION_CLASSES = [
  'observation',
  'event',
  'claim',
  'assumption',
  'preference',
  'reflection',
  'identity',
  'relationship',
  'permission',
  'plan',
  'action_trace',
  'feedback_signal',
  'evaluation_result',
  'challenge',
  'revocation',
  'commitment',
] as const;

const ASSERTION_STATUSES = [
  'proposed',
  'active',
  'contested',
  'demoted',
  'revoked',
  'forgotten_from_recall',
  'superseded',
  'sealed',
] as const;

const ENVIRONMENT_FRAMES = [
  'private_operator',
  'private_chat',
  'public_discord',
  'public_telegram',
  'repo_workflow',
  'tool_action_precheck',
  'audit_review',
] as const;

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

const RECEIPT_DETAIL_LEVELS = ['minimal', 'standard', 'debug'] as const;

const HOST_FRAMES = ['actor_private', 'public_discord'] as const;

const SignatureEnvelopeSchema = z
  .object({
    signature_id: z.string().min(1).max(256),
    signer_id: z.string().min(1).max(256),
    signer_type: z.enum(SIGNER_TYPES),
    signature_type: z.enum(SIGNATURE_TYPES),
    signed_payload_hash: z.string().min(1).max(512),
    signature: z.string().min(1).max(4096),
    signed_at: z.string().min(1).max(64),
    key_ref: z.string().min(1).max(512),
  })
  .strict();

const RecallRequestSchema = z
  .object({
    recall_request_id: z.string().min(1).max(256),
    actor_id: z.string().min(1).max(256),
    estate_id: z.string().min(1).max(256),
    requested_by: z.string().min(1).max(256),
    task: z.string().min(1).max(2048),
    intent: z.string().min(1).max(2048).optional(),
    environment_frame: z.enum(ENVIRONMENT_FRAMES),
    risk_profile: z.enum(RISK_LEVELS),
    requested_classes: z.array(z.enum(ASSERTION_CLASSES)).max(64).optional(),
    excluded_classes: z.array(z.enum(ASSERTION_CLASSES)).max(64).optional(),
    include_statuses: z.array(z.enum(ASSERTION_STATUSES)).max(16).optional(),
    mark_statuses: z.array(z.enum(ASSERTION_STATUSES)).max(16).optional(),
    exclude_statuses: z.array(z.enum(ASSERTION_STATUSES)).max(16).optional(),
    max_items: z.number().int().min(1).max(1024).optional(),
    freshness_window: z.string().min(1).max(64).optional(),
    include_provenance: z.boolean().optional(),
    include_receipt_detail: z.enum(RECEIPT_DETAIL_LEVELS),
    signature: SignatureEnvelopeSchema,
    created_at: z.string().min(1).max(64),
  })
  .strict();

const HostCallerSchema = z
  .object({
    tenant_id: z.string().min(1).max(256),
    actor_id: z.string().min(1).max(256),
    session_id: z.string().min(1).max(256).optional(),
    frame: z.enum(HOST_FRAMES).optional(),
  })
  .strict();

const RecallIntakeBodySchema = z
  .object({
    request: RecallRequestSchema,
    detail_level: z.enum(RECEIPT_DETAIL_LEVELS),
    caller: HostCallerSchema,
  })
  .strict();

// Compile-time tripwire — Phase 30C contract preflight.
//
// If a future Straylight type bump renames or widens any field on
// `RecallIntakeRequest`, this assignment fails at typecheck and forces a
// deliberate update of the ingress schema rather than allowing a silent
// drift. The check is type-only; no runtime value is produced.
type _ZodRecallIntakeBody = z.infer<typeof RecallIntakeBodySchema>;
type _RecallIntakeBodyMatchesHost = _ZodRecallIntakeBody extends RecallIntakeRequest
  ? true
  : false;
const _recallIntakeBodyMatchesHost: _RecallIntakeBodyMatchesHost = true;
void _recallIntakeBodyMatchesHost;

const IDEMPOTENCY_HEADER = 'idempotency-key';
const MAX_IDEMPOTENCY_KEY_LEN = 256;

export interface RecallIntakeRouteDeps {
  bodyMaxBytes: number;
  capabilityHolder: CapabilityHolder;
  boundedStore: BoundedEstateStore;
  idempotencyCache: IdempotencyCache;
  perEstateMutex: PerEstateMutex;
  perTenantRateLimit: PerTenantRateLimit;
  intakeLog: IntakeDenyLog;
  /** Logical clock injection for tests. */
  now?: () => Date;
  /** Audit emit hook. Defaults to no-op (Dixie audit pipeline is wired
   * via mutation-log/audit-trail stores when DB is present; this route
   * does not synthesise audit-trail rows for non-existent estates). */
  emitAudit?: (event: {
    event: 'recall_intake.refused' | 'recall_intake.served' | 'recall_intake.replayed';
    refusal_class?: string;
    tenant_id?: string;
    caller_actor_id?: string;
    raw_reasons?: string[];
    request_id?: string;
  }) => void;
}

export function createRecallIntakeRoutes(deps: RecallIntakeRouteDeps): Hono {
  const app = new Hono();
  const now = deps.now ?? (() => new Date());
  const emit = deps.emitAudit ?? (() => undefined);

  app.post('/', async (c) => {
    const { wallet, requestId } = getRequestContext(c);

    // Auth check.
    if (!wallet) {
      const r = ingressRefusal('ingress.unauthenticated', 'wallet required', {});
      emit({ ...r.audit, request_id: requestId });
      return c.json(r.body, r.http_status);
    }

    // Body-size pre-check by Content-Length (cheap, before any read).
    // SKP-003: the Content-Length check is opportunistic (clients may
    // omit it, send a stale value, or chunked-encode the body). The
    // authoritative bound is the streamed-byte check below, which runs
    // BEFORE the full JSON parse and short-circuits as soon as any byte
    // beyond `bodyMaxBytes` arrives.
    const contentLengthHeader = c.req.header('content-length');
    if (contentLengthHeader) {
      const len = Number.parseInt(contentLengthHeader, 10);
      if (Number.isFinite(len) && len > deps.bodyMaxBytes) {
        const r = ingressRefusal(
          'ingress.payload_too_large',
          `body exceeds ${deps.bodyMaxBytes} bytes`,
          { tenant_id: wallet },
        );
        emit({ ...r.audit, request_id: requestId });
        return c.json(r.body, r.http_status);
      }
    }

    // Per-tenant rate limit (authoritative tenant = session wallet).
    const allowed = deps.perTenantRateLimit.consume(wallet, Date.now());
    if (!allowed) {
      const r = ingressRefusal(
        'ingress.rate_limited',
        'per-tenant rate limit exceeded',
        { tenant_id: wallet },
      );
      emit({ ...r.audit, request_id: requestId });
      return c.json(r.body, r.http_status);
    }

    // Idempotency-Key required.
    const idempotencyKey = c.req.header(IDEMPOTENCY_HEADER);
    if (!idempotencyKey || idempotencyKey.length === 0 || idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LEN) {
      const r = ingressRefusal(
        'ingress.missing_idempotency_key',
        'Idempotency-Key header required (1-256 chars)',
        { tenant_id: wallet },
      );
      emit({ ...r.audit, request_id: requestId });
      return c.json(r.body, r.http_status);
    }

    // SKP-003: read the body with a hard byte cap BEFORE attempting
    // JSON.parse. Reading from the underlying ReadableStream means we
    // never buffer more than `bodyMaxBytes + 1` regardless of whether
    // Content-Length was present, accurate, or absent (chunked).
    const bodyText = await readBodyWithCap(c, deps.bodyMaxBytes);
    if (bodyText === BODY_OVER_CAP) {
      const r = ingressRefusal(
        'ingress.payload_too_large',
        `body exceeds ${deps.bodyMaxBytes} bytes`,
        { tenant_id: wallet },
      );
      emit({ ...r.audit, request_id: requestId });
      return c.json(r.body, r.http_status);
    }

    // Body parse + zod, now safely bounded.
    let raw: unknown;
    try {
      raw = bodyText.length === 0 ? null : JSON.parse(bodyText);
    } catch {
      raw = null;
    }
    if (raw === null || typeof raw !== 'object') {
      const r = ingressRefusal('ingress.invalid_request', 'invalid JSON body', {
        tenant_id: wallet,
      });
      emit({ ...r.audit, request_id: requestId });
      return c.json(r.body, r.http_status);
    }

    const parsed = RecallIntakeBodySchema.safeParse(raw);
    if (!parsed.success) {
      const r = ingressRefusal(
        'ingress.invalid_request',
        parsed.error.issues[0]?.message ?? 'invalid body shape',
        { tenant_id: wallet },
      );
      emit({ ...r.audit, request_id: requestId });
      return c.json(r.body, r.http_status);
    }
    const body = parsed.data;

    // Authoritative tenant override — ADR-026D §3.d.
    // caller.tenant_id / caller.actor_id, request.actor_id, and
    // request.estate_id MUST equal the session wallet. Disagreement is
    // rejected at ingress.
    if (
      body.caller.tenant_id !== wallet ||
      body.caller.actor_id !== wallet ||
      body.request.actor_id !== wallet ||
      body.request.estate_id !== wallet
    ) {
      const r = ingressRefusal(
        'ingress.cross_tenant_body_mismatch',
        'caller and request fields must match authenticated session',
        { tenant_id: wallet, caller_actor_id: body.caller.actor_id },
      );
      emit({ ...r.audit, request_id: requestId });
      return c.json(r.body, r.http_status);
    }

    const idempotencyKeyTuple = {
      tenant_id: wallet,
      caller_actor_id: wallet,
      request_key: idempotencyKey,
    };

    // Idempotency cache lookup. ADR-026D §3.b: replay returns prior response
    // verbatim, never appends duplicate state. SKP-002: a same-key request
    // arriving while a prior request is still in-flight awaits the same
    // execution rather than racing the seam.
    const cachedReplay = deps.idempotencyCache.get(idempotencyKeyTuple, Date.now());
    if (cachedReplay !== undefined) {
      emit({
        event: 'recall_intake.replayed',
        tenant_id: wallet,
        caller_actor_id: wallet,
        request_id: requestId,
      });
      return responseFromSeam(c, cachedReplay);
    }

    // Per-estate serialization. ADR-026D §3.c (i).
    // SKP-002: idempotencyCache.runOnce coalesces concurrent same-key calls
    // onto a single in-flight promise. The exec body acquires the per-
    // estate mutex and invokes the seam; cap-exceeded refusals are thrown
    // out so they bypass the cache (guard refusals must remain
    // re-evaluable on subsequent retries when caps are relaxed).
    const estateKey = body.request.estate_id;
    let seamResponse: RecallIntakeResponse;
    try {
      seamResponse = await deps.idempotencyCache.runOnce(
        idempotencyKeyTuple,
        Date.now(),
        () =>
          deps.perEstateMutex.withLock(estateKey, async () => {
            // SKP-001: tenant identity is captured per-request via
            // `forTenant`, not via a shared mutable active-tenant slot.
            // Concurrent requests for different tenants get independent
            // views.
            const tenantStore = deps.boundedStore.forTenant(wallet);
            const tenantResolver: TenantResolver = (_id: string) => wallet;
            const intakeDeps: IntakeDeps = {
              tenantResolver,
              intakeLog: deps.intakeLog,
              now: now().toISOString(),
            };
            // Phase 30C — wedge-aligned ingress means `body` is already
            // structurally a `RecallIntakeRequest` (enforced by the zod
            // schema + the `_RecallIntakeBodyMatchesHost` tripwire).
            // No `as unknown as` cast at the seam call site. Caller fields
            // are normalized to the authoritative session wallet (cross-
            // tenant body mismatches were rejected above).
            const seamReq: RecallIntakeRequest = {
              request: body.request,
              detail_level: body.detail_level,
              caller: { ...body.caller, tenant_id: wallet, actor_id: wallet },
            };
            // Sole isolated cast at the seam call site: Phase 26E uses a
            // Dixie-local structural store conformant with executeRecall's
            // surface; the Straylight types declare `EstateStore` (a class)
            // as the parameter. We cast through `unknown` here and
            // document the structural-conformance rationale in
            // bounded-estate-store.ts.
            const store = tenantStore as unknown as EstateStore;
            try {
              return await deps.capabilityHolder.withCapability((cap) =>
                handleRecallIntake(store, seamReq, intakeDeps, cap),
              );
            } catch (err) {
              // BoundedStoreCapExceededError must escape `runOnce` so the
              // cache does NOT pin a guard refusal; bubble it to the
              // outer catch.
              if (err instanceof BoundedStoreCapExceededError) throw err;
              // Unknown internal error → fall back to a denied response
              // shape so the cache pins it (replay invariant).
              const fallbackResp: RecallIntakeResponse = {
                outcome: 'denied',
                reason: 'storage_unavailable',
                raw_reasons: [
                  err instanceof Error
                    ? `runtime_seam:internal:${err.message}`
                    : 'runtime_seam:internal:unknown',
                ],
              };
              return fallbackResp;
            }
          }),
      );
    } catch (err) {
      if (err instanceof BoundedStoreCapExceededError) {
        const cls =
          err.dimension === 'assertion_count'
            ? 'guard.tenant_assertion_cap'
            : 'guard.tenant_byte_budget';
        const r = guardRefusal(cls, err.message, {
          tenant_id: wallet,
          caller_actor_id: wallet,
        });
        emit({ ...r.audit, request_id: requestId });
        return c.json(r.body, r.http_status);
      }
      throw err;
    }

    if (seamResponse.outcome === 'served') {
      emit({
        event: 'recall_intake.served',
        tenant_id: wallet,
        caller_actor_id: wallet,
        request_id: requestId,
      });
      return c.json(seamResponse, 200);
    }

    const refusal = mapSeamResponseToRefusal(seamResponse, {
      tenant_id: wallet,
      caller_actor_id: wallet,
    });
    if (refusal) {
      emit({ ...refusal.audit, request_id: requestId });
      return c.json(refusal.body, refusal.http_status);
    }
    return c.json(seamResponse, 200);
  });

  return app;
}

function responseFromSeam(c: Context, seam: RecallIntakeResponse) {
  if (seam.outcome === 'served') return c.json(seam, 200);
  const r = mapSeamResponseToRefusal(seam, {});
  if (r) return c.json(r.body, r.http_status);
  return c.json(seam, 200);
}

/** Sentinel returned by `readBodyWithCap` when the body exceeds the cap. */
const BODY_OVER_CAP = Symbol('body-over-cap');
type BodyOverCap = typeof BODY_OVER_CAP;

/**
 * SKP-003 — read the request body with a hard byte cap, BEFORE any JSON
 * parsing. Streams chunks from the underlying `ReadableStream` and
 * short-circuits the moment cumulative bytes exceed `maxBytes`. Works
 * correctly when `Content-Length` is absent, stale, or the request is
 * chunk-transfer-encoded.
 *
 * Returns the body as a UTF-8 string, or `BODY_OVER_CAP` when the cap is
 * exceeded. Stream reads are cancelled on overflow so we never buffer the
 * whole oversize body in memory.
 */
async function readBodyWithCap(
  c: Context,
  maxBytes: number,
): Promise<string | BodyOverCap> {
  const reader = c.req.raw.body?.getReader();
  if (!reader) {
    // No body stream — fall back to a bounded text read. `text()` here
    // will only resolve for short bodies; we still validate the byte
    // length defensively.
    const t = await c.req.raw.clone().text().catch(() => '');
    if (Buffer.byteLength(t, 'utf8') > maxBytes) return BODY_OVER_CAP;
    return t;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // Cancel may reject if the stream already errored — ignore;
          // the over-cap sentinel is the dominant signal.
        }
        return BODY_OVER_CAP;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const buf = Buffer.concat(chunks.map((u) => Buffer.from(u)));
  return buf.toString('utf8');
}

// Re-export the same-tenant helper as a convenience for tests that want
// to compose the in-repo tenant-check primitive without taking a runtime
// dependency on Straylight types.
export { checkSameTenant };
