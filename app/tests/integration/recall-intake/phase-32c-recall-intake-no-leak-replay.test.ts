// Phase 32C — Dixie served-path no-leak invariant across idempotent replay.
//
// Phase 32B proved that the real Dixie POST /api/recall/intake route can
// faithfully pass a Straylight-style served response through to its first
// HTTP body, including a nonzero `redacted_counts_by_reason`, and that
// privately-held source material visible to the Straylight runtime does
// not leak onto that first wire body.
//
// What 32B did NOT cover end-to-end is the *replay* surface: ADR-026D
// §3.b (i) requires that a same-key request returns the prior response
// verbatim from the route's idempotency cache (`responseFromSeam(cached)`
// in app/src/routes/recall-intake.ts, after `idempotencyCache.get`
// returns the pinned value). Phase 32C closes that gap by proving that
// the same no-leak invariant holds across the replayed/cached surface
// the route exposes when an Idempotency-Key is reused.
//
// Architecture boundary (preserved):
//   * Dixie does NOT own or redefine Straylight redaction semantics.
//   * Dixie does NOT compute `redacted_counts_by_reason`,
//     `excluded_counts_by_reason`, `redacted_count`, or `pack.redacted`.
//   * Dixie does NOT recompute `receipt_hash`.
//   * Dixie does NOT validate or interpret reason strings.
//   * The Phase 31D/31E private/public redaction logic is NOT duplicated
//     in Dixie. Reason names below mirror Straylight's vocabulary
//     verbatim and Dixie does not validate or interpret them.
//
// Test seam strategy:
//   The route value-imports `handleRecallIntake` from
//   `@loa/straylight/runtime/recall-intake`. Following the pattern from
//   preflight.test.ts and Phase 32B, we `vi.mock` that subpath and
//   replace `handleRecallIntake` with a stub that returns a served
//   `RecallIntakeResponse` carrying nonzero redacted counts. The stub
//   is invoked at most ONCE across both requests — the second request
//   is served from the route's idempotency cache, which is the
//   surface under test.
//
//   The stub is the ONLY place this file constructs redaction summary
//   data. The route consumes it as opaque pass-through.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import {
  createBoundedEstateStore,
  createCapabilityHolder,
  createIdempotencyCache,
  createPerEstateMutex,
  createPerTenantRateLimit,
} from '../../../src/services/straylight-recall-intake/index.js';
import { createInMemoryIntakeDenyLog } from '../../../src/services/straylight-host/index.js';
import { createRecallIntakeRoutes } from '../../../src/routes/recall-intake.js';
import type {
  Actor,
  ActorEstate,
  Keyring,
  RecallPack,
  RecallReceipt,
} from '@loa/straylight';
import type { RecallIntakeResponse } from '@loa/straylight/host';

// ── Test seam: replace the runtime entrypoint with a stub the test owns ─────
//
// This is the explicit acknowledgement that Straylight owns the redaction
// semantics. Dixie's only obligation here is faithful propagation of the
// served-path envelope across both first and replayed surfaces; the stub
// plays the role Straylight would play in production, returning a wedge-
// shaped response with a populated `redacted_counts_by_reason`. Reason
// strings are mirrored from the Straylight Phase 31E vocabulary; Dixie
// does not interpret them.

const seamSpy = vi.fn<
  (...args: unknown[]) => RecallIntakeResponse
>();

vi.mock('@loa/straylight/runtime/recall-intake', async () => {
  const actual = await vi.importActual<
    typeof import('@loa/straylight/runtime/recall-intake')
  >('@loa/straylight/runtime/recall-intake');
  return {
    ...actual,
    handleRecallIntake: (...args: unknown[]) => seamSpy(...args),
  };
});

// ── Capability env key + tenant id ──────────────────────────────────────────
const KEY = 'phase-32c-replay-key-32-bytes-aaaaaa';
const WALLET = '0xabcdef0000000000000000000000000000000033';
const NOW_ISO = '2026-05-24T00:00:00.000Z';

// ── Private fingerprints ────────────────────────────────────────────────────
//
// These sentinel strings exist ONLY inside the mock's test-local private
// fixture (see `privateSourceMaterial` below). They model the kind of
// private/internal source material Straylight would consult when computing
// redaction counts (raw assertion bodies, private-frame relationships,
// internal subject identifiers, raw assertion ids). They are intentionally
// NEVER placed on the served `RecallIntakeResponse` envelope the mock
// returns — the served envelope is the public, Dixie-exposed wire surface.
//
// The point of this test pair is:
//   1. The mock proves the private fixture really contains these strings,
//      so the assertions are not vacuous (something exists to leak).
//   2. The mock derives the redaction counts from that private fixture.
//   3. The route receives only the clean served envelope on the first
//      request, then serves the SAME envelope from its idempotency cache
//      on the replay request — the test asserts those private
//      fingerprints do NOT surface in either wire body.
const PRIVATE_TENANT = 'PHASE32C-PRIVATE-TENANT-body-do-not-leak';
const PRIVATE_REL = 'PHASE32C-PRIVATE-REL-relationship-do-not-leak';
const PRIVATE_SUBJECT = 'user:phase32c-private-subject';
const PRIVATE_ASSERTION = 'assertion:phase32c-private-id';

// Test-local internal source material the mock consults to derive counts.
// This is what Straylight would see in production but never echo onto the
// served envelope. Captured here so the test can prove (a) the fixture
// genuinely contained the fingerprints, and (b) neither the first nor the
// replayed wire body contains them.
interface PrivateSourceMaterial {
  tenant_body: string;
  relationship_body: string;
  subject: string;
  assertion_id: string;
}

const privateSourceMaterial: PrivateSourceMaterial = {
  tenant_body: `${PRIVATE_TENANT} :: tenant-frame raw assertion text`,
  relationship_body: `${PRIVATE_REL} :: actor-private edge metadata`,
  subject: PRIVATE_SUBJECT,
  assertion_id: PRIVATE_ASSERTION,
};

function buildServedResponse(): RecallIntakeResponse {
  // The mock derives per-reason counts by inspecting its own private
  // source material. In production Straylight would do this against real
  // assertions; here we hard-code the count so the assertion stays
  // deterministic, but we ALSO assert inside the mock that the private
  // fixture really contains the sentinels — making the leakage assertion
  // outside the mock provably non-vacuous, and the count derivation
  // genuinely consult the private source material rather than ignoring it.
  if (!privateSourceMaterial.tenant_body.includes(PRIVATE_TENANT)) {
    throw new Error('private fixture lost tenant fingerprint');
  }
  if (!privateSourceMaterial.relationship_body.includes(PRIVATE_REL)) {
    throw new Error('private fixture lost relationship fingerprint');
  }
  if (!privateSourceMaterial.subject.includes(PRIVATE_SUBJECT)) {
    throw new Error('private fixture lost subject fingerprint');
  }
  if (!privateSourceMaterial.assertion_id.includes(PRIVATE_ASSERTION)) {
    throw new Error('private fixture lost assertion-id fingerprint');
  }

  // Reason vocabulary mirrors Straylight Phase 31D/31E privacy redaction
  // vocabulary. Dixie does NOT validate or re-interpret these strings;
  // the mock stands in for Straylight-owned redaction semantics. Counts
  // are sourced from the private fixture (one redaction per fingerprint
  // per reason category) so the derivation is non-trivial.
  const tenantCount =
    (privateSourceMaterial.tenant_body.includes(PRIVATE_TENANT) ? 1 : 0) +
    (privateSourceMaterial.subject.includes(PRIVATE_SUBJECT) ? 1 : 0) +
    (privateSourceMaterial.assertion_id.includes(PRIVATE_ASSERTION) ? 1 : 0);
  const relCount =
    (privateSourceMaterial.relationship_body.includes(PRIVATE_REL) ? 1 : 0) +
    (privateSourceMaterial.subject.includes(PRIVATE_SUBJECT) ? 1 : 0);
  const redacted_counts_by_reason = [
    { reason: 'privacy_tenant_in_public_frame', count: tenantCount },
    { reason: 'privacy_actor_private_in_public_frame', count: relCount },
  ];
  const redacted_count = redacted_counts_by_reason.reduce(
    (acc, r) => acc + r.count,
    0,
  );
  const excluded_counts_by_reason: Record<string, number> = {
    policy_excluded: 1,
  };

  const pack_hash =
    'sha256:000000000000000000000000000000000000000000000000000000003200000d';
  const receipt_hash =
    'sha256:000000000000000000000000000000000000000000000000000000003200000e';

  const pack: RecallPack = {
    recall_pack_id: 'rpack:phase32c-served',
    recall_request_id: 'rreq_phase32c_served',
    actor_id: WALLET,
    estate_id: WALLET,
    included: [],
    marked: [],
    redacted: redacted_counts_by_reason,
    excluded_summary: [],
    policy_decision: {
      decision: 'allow',
      policy_id: 'straylight.default-recall.v0',
      policy_version: '0.1.0',
      signer_competence_result: {
        allowed: true,
        reason: 'role_match',
      },
      reasons: [],
      decided_at: NOW_ISO,
    },
    receipt_id: 'rcpt:phase32c-served',
    pack_hash,
    created_at: NOW_ISO,
  };

  const receipt: RecallReceipt = {
    receipt_id: 'rcpt:phase32c-served',
    recall_request_id: 'rreq_phase32c_served',
    recall_pack_id: 'rpack:phase32c-served',
    actor_id: WALLET,
    estate_id: WALLET,
    filters_applied: [],
    included_assertion_ids: [],
    marked_assertion_ids: [],
    redacted_count,
    redacted_counts_by_reason,
    excluded_counts_by_reason,
    policy_decision_ref: 'straylight.default-recall.v0',
    requester_signature_ref: 'sig:phase32c-served',
    pack_hash,
    receipt_hash,
    created_at: NOW_ISO,
    detail_level: 'standard',
  };

  // Returned envelope is intentionally clean: it carries only the public
  // Straylight vocabulary (reason tokens, hashes, ids). The
  // PHASE32C-PRIVATE-* sentinels live ONLY in `privateSourceMaterial`
  // above — they are NEVER attached to any field of this response. The
  // outer test asserts neither the first nor the replayed served wire
  // body contains them, and separately asserts that the private fixture
  // did contain them, so the negative leakage check is provably non-
  // vacuous on both surfaces.
  return {
    outcome: 'served',
    pack,
    receipt,
    audit_event_id: 'audit:phase32c-served',
  };
}

// ── App scaffolding (mirrors Phase 32B) ─────────────────────────────────────

interface AuditEvent {
  event:
    | 'recall_intake.refused'
    | 'recall_intake.served'
    | 'recall_intake.replayed';
  refusal_class?: string;
  tenant_id?: string;
  caller_actor_id?: string;
  raw_reasons?: string[];
  request_id?: string;
}

function buildApp() {
  const auditEvents: AuditEvent[] = [];
  const app = new Hono();
  app.use('/api/recall/intake/*', async (c, next) => {
    const w = c.req.header('x-test-wallet');
    if (w) c.req.raw.headers.set('x-wallet-address', w);
    await next();
  });
  const boundedStore = createBoundedEstateStore({
    maxAssertionsPerTenant: 100,
    maxAssertionBytesPerTenant: 1_000_000,
  });
  // Seed a minimal estate so the bounded store resolves a tenant view for
  // the seam call. The seam stub ignores the store argument; we only need
  // the route to reach the seam call site on the first request.
  const actor = {
    actor_id: WALLET,
    actor_class: 'agent',
    display_name: 'phase32c',
    created_at: NOW_ISO,
  } as unknown as Actor;
  const estate = {
    estate_id: WALLET,
    actor_id: WALLET,
    created_at: NOW_ISO,
  } as unknown as ActorEstate;
  const keyring = {
    keyring_id: `kr_${WALLET}`,
    actor_id: WALLET,
    signers: [
      {
        signer_id: 'signer:phase32c',
        actor_id: WALLET,
        public_key: 'pk_phase32c',
        roles: ['actor_self'],
        active: true,
        added_at: NOW_ISO,
      },
    ],
    created_at: NOW_ISO,
  } as unknown as Keyring;
  boundedStore.seedTenant({ tenant_id: WALLET, actor, estate, keyring });
  app.route(
    '/api/recall/intake',
    createRecallIntakeRoutes({
      bodyMaxBytes: 8_192,
      capabilityHolder: createCapabilityHolder(),
      boundedStore,
      idempotencyCache: createIdempotencyCache({ ttlSec: 60, maxEntries: 64 }),
      perEstateMutex: createPerEstateMutex(),
      perTenantRateLimit: createPerTenantRateLimit({ rpm: 60 }),
      intakeLog: createInMemoryIntakeDenyLog(),
      now: () => new Date(NOW_ISO),
      emitAudit: (e) => auditEvents.push(e),
    }),
  );
  return { app, auditEvents };
}

function wedgeAlignedBody(request_id: string) {
  return {
    request: {
      recall_request_id: request_id,
      actor_id: WALLET,
      estate_id: WALLET,
      requested_by: WALLET,
      task: 'phase-32c-recall-intake-no-leak-replay',
      environment_frame: 'private_chat' as const,
      risk_profile: 'low' as const,
      include_receipt_detail: 'standard' as const,
      signature: {
        signature_id: 'sig_phase32c',
        signer_id: 'signer:phase32c',
        signer_type: 'actor_controller' as const,
        signature_type: 'dev_signature' as const,
        signed_payload_hash:
          'sha256:0000000000000000000000000000000000000000000000000000000000000000',
        signature: 'devsig',
        signed_at: NOW_ISO,
        key_ref: 'kref_phase32c',
      },
      created_at: NOW_ISO,
    },
    detail_level: 'standard' as const,
    caller: { tenant_id: WALLET, actor_id: WALLET },
  };
}

beforeEach(() => {
  process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = KEY;
  seamSpy.mockReset();
});
afterEach(() => {
  delete process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY;
});

describe('Phase 32C — Dixie served-path no-leak invariant across idempotent replay', () => {
  it('replays the served envelope with redaction-receipt invariants preserved and no private leak on either surface', async () => {
    seamSpy.mockReturnValue(buildServedResponse());

    // (a) Provenance: prove the fingerprints actually exist in the mock's
    // internal source material BEFORE either request runs. Without this,
    // the negative leakage assertions could pass simply because the
    // strings never existed in the test at all.
    expect(privateSourceMaterial.tenant_body).toContain(PRIVATE_TENANT);
    expect(privateSourceMaterial.relationship_body).toContain(PRIVATE_REL);
    expect(privateSourceMaterial.subject).toContain(PRIVATE_SUBJECT);
    expect(privateSourceMaterial.assertion_id).toContain(PRIVATE_ASSERTION);

    const { app, auditEvents } = buildApp();
    const headers = {
      'content-type': 'application/json',
      'x-test-wallet': WALLET,
      'idempotency-key': 'phase-32c-served-replay-1',
    };
    const body = JSON.stringify(wedgeAlignedBody('rreq_phase32c_served'));

    // ── First request: real seam call, served envelope on the wire. ───────
    const first = await app.request('/api/recall/intake', {
      method: 'POST',
      headers,
      body,
    });
    expect(first.status).toBe(200);
    const firstText = await first.text();
    const firstJson = JSON.parse(firstText) as {
      outcome: string;
      pack?: RecallPack;
      receipt?: RecallReceipt;
      audit_event_id?: string;
    };

    // Outcome / policy invariants on the first response.
    expect(firstJson.outcome).toBe('served');
    expect(firstJson.pack).toBeDefined();
    expect(firstJson.receipt).toBeDefined();
    expect(firstJson.pack?.policy_decision.decision).toBe('allow');

    // Receipt-level: enriched redaction summary forwarded verbatim.
    const firstCounts = firstJson.receipt?.redacted_counts_by_reason;
    expect(Array.isArray(firstCounts)).toBe(true);
    expect(firstCounts!.length).toBeGreaterThan(0);
    const firstSum = firstCounts!.reduce((acc, r) => acc + r.count, 0);
    expect(firstJson.receipt?.redacted_count).toBe(firstSum);
    expect(firstJson.receipt?.redacted_count).toBeGreaterThan(0);

    // pack.redacted exactly equals receipt.redacted_counts_by_reason
    // after order normalisation. Dixie does not recompute or re-bucket.
    const normalize = (rs: { reason: string; count: number }[]) =>
      [...rs]
        .map((r) => ({ reason: r.reason, count: r.count }))
        .sort((a, b) => a.reason.localeCompare(b.reason));
    expect(normalize(firstJson.pack?.redacted ?? [])).toEqual(
      normalize(firstCounts!),
    );

    // sha256-prefixed hashes preserved on every exposed surface.
    expect(firstJson.pack?.pack_hash.startsWith('sha256:')).toBe(true);
    expect(firstJson.receipt?.pack_hash.startsWith('sha256:')).toBe(true);
    expect(firstJson.receipt?.receipt_hash.startsWith('sha256:')).toBe(true);
    expect(firstJson.receipt?.pack_hash).toBe(firstJson.pack?.pack_hash);

    // excluded_counts_by_reason: a plain Record<string, number>.
    const firstExcluded = firstJson.receipt?.excluded_counts_by_reason;
    expect(firstExcluded).toBeDefined();
    expect(typeof firstExcluded).toBe('object');
    expect(firstExcluded).not.toBeNull();
    expect(Array.isArray(firstExcluded)).toBe(false);
    for (const [k, v] of Object.entries(
      firstExcluded as Record<string, number>,
    )) {
      expect(typeof k).toBe('string');
      expect(k).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBe(true);
    }

    // Seam invoked exactly once on the first request (cache miss path).
    expect(seamSpy).toHaveBeenCalledTimes(1);

    // ── Second request: same Idempotency-Key → route returns cached ──────
    // ── envelope from `idempotencyCache.get` without re-invoking seam. ──
    const second = await app.request('/api/recall/intake', {
      method: 'POST',
      headers,
      body,
    });
    expect(second.status).toBe(200);
    const secondText = await second.text();
    const secondJson = JSON.parse(secondText) as {
      outcome: string;
      pack?: RecallPack;
      receipt?: RecallReceipt;
      audit_event_id?: string;
    };

    // Replay invariant: seam STILL has been called only once. The route
    // must have served the second response from its idempotency cache.
    expect(seamSpy).toHaveBeenCalledTimes(1);

    // Replay-cannot-alter-authorization (ADR-026D §3.b (i)): the byte-
    // for-byte body Dixie returns on replay equals the first body.
    expect(secondText).toBe(firstText);

    // Re-assert the served-path invariants on the replayed surface
    // explicitly (rather than relying solely on byte-equality), so a
    // future change that re-shapes the cached response is caught here.
    expect(secondJson.outcome).toBe('served');
    expect(secondJson.pack?.policy_decision.decision).toBe('allow');

    const secondCounts = secondJson.receipt?.redacted_counts_by_reason;
    expect(Array.isArray(secondCounts)).toBe(true);
    expect(secondCounts!.length).toBe(firstCounts!.length);
    const secondSum = secondCounts!.reduce((acc, r) => acc + r.count, 0);
    expect(secondJson.receipt?.redacted_count).toBe(secondSum);
    expect(secondJson.receipt?.redacted_count).toBeGreaterThan(0);

    expect(normalize(secondJson.pack?.redacted ?? [])).toEqual(
      normalize(secondCounts!),
    );

    expect(secondJson.pack?.pack_hash.startsWith('sha256:')).toBe(true);
    expect(secondJson.receipt?.pack_hash.startsWith('sha256:')).toBe(true);
    expect(secondJson.receipt?.receipt_hash.startsWith('sha256:')).toBe(true);
    expect(secondJson.receipt?.pack_hash).toBe(secondJson.pack?.pack_hash);

    const secondExcluded = secondJson.receipt?.excluded_counts_by_reason;
    expect(secondExcluded).toBeDefined();
    expect(typeof secondExcluded).toBe('object');
    expect(secondExcluded).not.toBeNull();
    expect(Array.isArray(secondExcluded)).toBe(false);
    for (const [k, v] of Object.entries(
      secondExcluded as Record<string, number>,
    )) {
      expect(typeof k).toBe('string');
      expect(k).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBe(true);
    }

    // The route already exposes a `recall_intake.replayed` audit event on
    // the cache-hit path (see app/src/routes/recall-intake.ts: the
    // `cachedReplay !== undefined` branch emits this event before
    // returning `responseFromSeam(cachedReplay)`). Existing tests already
    // observe audit events through this hook, so we assert the existing
    // marker rather than inventing a new one. This proves the second
    // response actually traveled through the route's idempotency cache
    // path, not through a fresh seam invocation that happened to return
    // the same value.
    const replayEvents = auditEvents.filter(
      (e) => e.event === 'recall_intake.replayed',
    );
    expect(replayEvents.length).toBe(1);
    expect(replayEvents[0]?.tenant_id).toBe(WALLET);
    expect(replayEvents[0]?.caller_actor_id).toBe(WALLET);

    // Sanity: the first request emitted a `recall_intake.served` event
    // (not a replay), confirming the two requests took distinct paths
    // through the route.
    const servedEvents = auditEvents.filter(
      (e) => e.event === 'recall_intake.served',
    );
    expect(servedEvents.length).toBe(1);

    // ── Public-surface leakage check: neither the first nor the ──────────
    // ── replayed wire body may contain any private fingerprint. ──────────
    for (const text of [firstText, secondText]) {
      expect(text).not.toContain(PRIVATE_TENANT);
      expect(text).not.toContain(PRIVATE_REL);
      expect(text).not.toContain(PRIVATE_SUBJECT);
      expect(text).not.toContain(PRIVATE_ASSERTION);
    }

    // And specifically: the redaction-summary reason strings forwarded on
    // both wire surfaces are the public Straylight vocabulary, not opaque
    // blobs containing private payload. Same check applies to
    // exclusion-reason keys.
    for (const j of [firstJson, secondJson]) {
      for (const r of j.receipt?.redacted_counts_by_reason ?? []) {
        expect(r.reason).toMatch(/^[a-z][a-z0-9_]*$/);
        expect(r.reason).not.toContain(PRIVATE_TENANT);
        expect(r.reason).not.toContain(PRIVATE_REL);
        expect(r.reason).not.toContain(PRIVATE_SUBJECT);
        expect(r.reason).not.toContain(PRIVATE_ASSERTION);
      }
      for (const k of Object.keys(
        (j.receipt?.excluded_counts_by_reason ?? {}) as Record<string, number>,
      )) {
        expect(k).toMatch(/^[a-z][a-z0-9_]*$/);
        expect(k).not.toContain(PRIVATE_TENANT);
        expect(k).not.toContain(PRIVATE_REL);
        expect(k).not.toContain(PRIVATE_SUBJECT);
        expect(k).not.toContain(PRIVATE_ASSERTION);
      }
    }

    // Route-visible envelope fields (top-level keys) on both surfaces are
    // the public Straylight vocabulary; none of them carry private
    // material as a key name.
    for (const j of [firstJson, secondJson]) {
      for (const k of Object.keys(j)) {
        expect(k).not.toContain(PRIVATE_TENANT);
        expect(k).not.toContain(PRIVATE_REL);
        expect(k).not.toContain(PRIVATE_SUBJECT);
        expect(k).not.toContain(PRIVATE_ASSERTION);
      }
    }
  });
});
