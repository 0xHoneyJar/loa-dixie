// Phase 26E — POST /api/recall/intake.
//
// Authorized by ADR-026D (loa-straylight). Consumer obligations:
// ADR-026C §3.1–§3.8. Endpoint prerequisites: ADR-026D §3.a–§3.d.
// Fail-closed catalogue: ADR-026D §4.a–§4.g.
//
// Pipeline (per request):
//   1. zod validation of body shape
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

const RecallSignatureSchema = z
  .object({
    signature_id: z.string().min(1).max(256),
    signer_id: z.string().min(1).max(256),
    signature_value: z.string().min(1).max(4096),
    algorithm: z.string().min(1).max(64),
    signed_at: z.string().min(1).max(64),
  })
  .strict();

const RecallRequestSchema = z
  .object({
    recall_request_id: z.string().min(1).max(256),
    actor_id: z.string().min(1).max(256),
    estate_id: z.string().min(1).max(256),
    environment_frame: z.enum(['actor_private', 'public_discord']),
    risk_profile: z.enum(['routine', 'sensitive']).default('routine'),
    requested_classes: z.array(z.string().min(1).max(128)).max(64).optional(),
    excluded_classes: z.array(z.string().min(1).max(128)).max(64).optional(),
    exclude_statuses: z.array(z.string().min(1).max(64)).max(16).optional(),
    mark_statuses: z.array(z.string().min(1).max(64)).max(16).optional(),
    include_statuses: z.array(z.string().min(1).max(64)).max(16).optional(),
    max_items: z.number().int().min(1).max(1024).optional(),
    include_provenance: z.boolean().optional(),
    include_receipt_detail: z.enum(['minimal', 'standard', 'debug']).default('minimal'),
    signature: RecallSignatureSchema,
  })
  .strict();

const HostCallerSchema = z
  .object({
    tenant_id: z.string().min(1).max(256),
    actor_id: z.string().min(1).max(256),
    session_id: z.string().min(1).max(256).optional(),
    frame: z.enum(['actor_private', 'public_discord']).optional(),
  })
  .strict();

const RecallIntakeBodySchema = z
  .object({
    request: RecallRequestSchema,
    detail_level: z.enum(['minimal', 'standard', 'debug']),
    caller: HostCallerSchema,
  })
  .strict();

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

    // Body-size pre-check by Content-Length (cheap, before parse).
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

    // Body parse + zod.
    const raw = await c.req.json().catch(() => null);
    if (raw === null || typeof raw !== 'object') {
      const r = ingressRefusal('ingress.invalid_request', 'invalid JSON body', {
        tenant_id: wallet,
      });
      emit({ ...r.audit, request_id: requestId });
      return c.json(r.body, r.http_status);
    }

    // Byte-budget post-parse cross-check (catches chunked / unset Content-Length).
    const bodyBytes = Buffer.byteLength(JSON.stringify(raw), 'utf8');
    if (bodyBytes > deps.bodyMaxBytes) {
      const r = ingressRefusal(
        'ingress.payload_too_large',
        `body exceeds ${deps.bodyMaxBytes} bytes`,
        { tenant_id: wallet },
      );
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
    // verbatim, never appends duplicate state.
    const replayed = deps.idempotencyCache.get(idempotencyKeyTuple, Date.now());
    if (replayed !== undefined) {
      emit({
        event: 'recall_intake.replayed',
        tenant_id: wallet,
        caller_actor_id: wallet,
        request_id: requestId,
      });
      return responseFromSeam(c, replayed);
    }

    // Per-estate serialization. ADR-026D §3.c (i).
    const estateKey = body.request.estate_id;
    const seamResponse = await deps.perEstateMutex.withLock(estateKey, async () => {
      // Fail-closed bounded-store guard. The store throws when the active
      // tenant's caps are exceeded; the guardRefusal path uses 503 + audit.
      try {
        deps.boundedStore.setActiveTenant(wallet);
        const tenantResolver: TenantResolver = (_id: string) => wallet;
        const intakeDeps: IntakeDeps = {
          tenantResolver,
          intakeLog: deps.intakeLog,
          now: now().toISOString(),
        };
        // Construct the seam request from validated body. Caller is always
        // the authoritative session wallet (cross-tenant body mismatches
        // were rejected above).
        const seamReq: RecallIntakeRequest = {
          request: body.request as unknown as RecallIntakeRequest['request'],
          detail_level: body.detail_level,
          caller: { ...body.caller, tenant_id: wallet, actor_id: wallet },
        };
        // Sole isolated cast at the seam call site: Phase 26E uses a
        // Dixie-local structural store conformant with executeRecall's
        // surface; the Straylight types declare `EstateStore` (a class) as
        // the parameter. We cast through `unknown` here and document the
        // structural-conformance rationale in bounded-estate-store.ts.
        const store = deps.boundedStore as unknown as EstateStore;
        return await deps.capabilityHolder.withCapability((cap) =>
          handleRecallIntake(store, seamReq, intakeDeps, cap),
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
          return { __guard__: r } as const;
        }
        // Unknown error inside the seam path. We treat as storage_unavailable.
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
      } finally {
        // Clear the bounded-store's active tenant slot so a subsequent
        // request without a fresh setActiveTenant can never inherit a
        // stale tenant binding from this one.
        deps.boundedStore.setActiveTenant(undefined);
      }
    });

    if ('__guard__' in seamResponse) {
      return c.json(seamResponse.__guard__.body, seamResponse.__guard__.http_status);
    }

    // Populate idempotency cache before responding so concurrent retries
    // collide on the cache rather than re-execute.
    deps.idempotencyCache.put(idempotencyKeyTuple, seamResponse, Date.now());

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

// Re-export the same-tenant helper as a convenience for tests that want
// to compose the in-repo tenant-check primitive without taking a runtime
// dependency on Straylight types.
export { checkSameTenant };
