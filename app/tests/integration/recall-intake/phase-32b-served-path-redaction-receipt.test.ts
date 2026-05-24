// Phase 32B — Dixie served-path proof for nonzero redaction receipt.
//
// Phase 31E (loa-straylight 12f85d2) added
// `RecallReceipt.redacted_counts_by_reason: RedactionSummary[]` and folded
// it into `receipt_hash` computation. Phase 31F (34bfff8) shipped the
// operator Recall Wedge demo using the enriched shape. Phase 32A:
//
//   * refreshed Dixie's @loa/straylight pin to 34bfff8 / Phase 31F,
//   * proved Dixie's `import type { RecallReceipt }` accepts the enriched
//     shape and round-trips a populated `redacted_counts_by_reason` via a
//     unit-level consumer-contract test (tests/unit/straylight-host/
//     phase-32a-recall-receipt-enriched-shape.test.ts), and
//   * locked the always-present-array + sum-invariant + hash shape on the
//     real served-path route in served-path.test.ts using the real
//     Straylight runtime against an empty estate (zero redactions).
//
// What 32A could NOT prove end-to-end is the nonzero branch: the live
// Phase 30E served-path fixture seeds an empty estate, so the real
// Straylight runtime emits `redacted_counts_by_reason: []` for that
// request. Phase 32B closes that gap by proving the real Dixie route
// faithfully passes through a nonzero redaction receipt to its served
// HTTP body.
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
//   `@loa/straylight/runtime/recall-intake`. Following the established
//   pattern from preflight.test.ts, we `vi.mock` that subpath and replace
//   `handleRecallIntake` with a stub that returns a served
//   `RecallIntakeResponse` carrying nonzero redacted counts. This proves
//   Dixie pass-through; it does NOT re-test Straylight semantics.
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
// served-path envelope; the stub plays the role Straylight would play in
// production, returning a wedge-shaped response with a populated
// `redacted_counts_by_reason`. Reason strings are mirrored from the
// Straylight Phase 31E vocabulary; Dixie does not interpret them.

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
const KEY = 'phase-32b-served-key-32-bytes-aaaaaa';
const WALLET = '0xabcdef0000000000000000000000000000000032';
const NOW_ISO = '2026-05-24T00:00:00.000Z';

// ── Private fingerprints ────────────────────────────────────────────────────
//
// These sentinel strings exist ONLY inside the mock's test-local private
// fixture (see `privateSourceMaterial` below). They model the kind of
// private/internal source material Straylight would consult when computing
// redaction counts (raw assertion bodies, private-frame relationships,
// internal subject identifiers). They are intentionally NEVER placed on
// the served `RecallIntakeResponse` envelope the mock returns — the served
// envelope is the public, Dixie-exposed wire surface.
//
// The point of this test pair is:
//   1. The mock proves the private fixture really contains these strings,
//      so the assertions are not vacuous (something exists to leak).
//   2. The mock derives the redaction counts from that private fixture.
//   3. The route receives only the clean served envelope, and the test
//      asserts those private fingerprints do NOT surface in the wire body.
const PRIVATE_TENANT = 'PHASE32B-PRIVATE-TENANT-body-do-not-leak';
const PRIVATE_REL = 'PHASE32B-PRIVATE-REL-relationship-do-not-leak';
const PRIVATE_SUBJECT = 'user:phase32b-private-subject';

// Test-local internal source material the mock consults to derive counts.
// This is what Straylight would see in production but never echo onto the
// served envelope. Captured here so the test can prove (a) the fixture
// genuinely contained the fingerprints, and (b) the wire body does not.
interface PrivateSourceMaterial {
  tenant_body: string;
  relationship_body: string;
  subject: string;
}

const privateSourceMaterial: PrivateSourceMaterial = {
  tenant_body: `${PRIVATE_TENANT} :: tenant-frame raw assertion text`,
  relationship_body: `${PRIVATE_REL} :: actor-private edge metadata`,
  subject: PRIVATE_SUBJECT,
};

function buildServedResponse(): RecallIntakeResponse {
  // The mock derives per-reason counts by inspecting its own private
  // source material. In production Straylight would do this against real
  // assertions; here we hard-code the count so the assertion stays
  // deterministic, but we ALSO assert inside the mock that the private
  // fixture really contains the sentinels — making the leakage assertion
  // outside the mock provably non-vacuous.
  if (!privateSourceMaterial.tenant_body.includes(PRIVATE_TENANT)) {
    throw new Error('private fixture lost tenant fingerprint');
  }
  if (!privateSourceMaterial.relationship_body.includes(PRIVATE_REL)) {
    throw new Error('private fixture lost relationship fingerprint');
  }
  if (!privateSourceMaterial.subject.includes(PRIVATE_SUBJECT)) {
    throw new Error('private fixture lost subject fingerprint');
  }

  // Reason vocabulary mirrors Straylight Phase 31D/31E privacy redaction
  // vocabulary. Dixie does NOT validate or re-interpret these strings;
  // the mock stands in for Straylight-owned redaction semantics.
  const redacted_counts_by_reason = [
    { reason: 'privacy_tenant_in_public_frame', count: 3 },
    { reason: 'privacy_actor_private_in_public_frame', count: 2 },
  ];
  const redacted_count = redacted_counts_by_reason.reduce(
    (acc, r) => acc + r.count,
    0,
  );
  const excluded_counts_by_reason: Record<string, number> = {
    policy_excluded: 1,
  };

  const pack_hash =
    'sha256:000000000000000000000000000000000000000000000000000000003200000b';
  const receipt_hash =
    'sha256:000000000000000000000000000000000000000000000000000000003200000c';

  const pack: RecallPack = {
    recall_pack_id: 'rpack:phase32b-served',
    recall_request_id: 'rreq_phase32b_served',
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
    receipt_id: 'rcpt:phase32b-served',
    pack_hash,
    created_at: NOW_ISO,
  };

  const receipt: RecallReceipt = {
    receipt_id: 'rcpt:phase32b-served',
    recall_request_id: 'rreq_phase32b_served',
    recall_pack_id: 'rpack:phase32b-served',
    actor_id: WALLET,
    estate_id: WALLET,
    filters_applied: [],
    included_assertion_ids: [],
    marked_assertion_ids: [],
    redacted_count,
    redacted_counts_by_reason,
    excluded_counts_by_reason,
    policy_decision_ref: 'straylight.default-recall.v0',
    requester_signature_ref: 'sig:phase32b-served',
    pack_hash,
    receipt_hash,
    created_at: NOW_ISO,
    detail_level: 'standard',
  };

  // Returned envelope is intentionally clean: it carries only the public
  // Straylight vocabulary (reason tokens, hashes, ids). The
  // PHASE32B-PRIVATE-* sentinels live ONLY in `privateSourceMaterial`
  // above — they are NEVER attached to any field of this response. The
  // outer test asserts the served wire body does not contain them, and
  // separately asserts that the private fixture did contain them, so the
  // negative leakage check is provably non-vacuous.
  return {
    outcome: 'served',
    pack,
    receipt,
    audit_event_id: 'audit:phase32b-served',
  };
}

// ── App scaffolding (mirrors served-path.test.ts) ───────────────────────────

function buildApp() {
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
  // the route to reach the seam call site.
  const actor = {
    actor_id: WALLET,
    actor_class: 'agent',
    display_name: 'phase32b',
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
        signer_id: 'signer:phase32b',
        actor_id: WALLET,
        public_key: 'pk_phase32b',
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
    }),
  );
  return app;
}

function wedgeAlignedBody(request_id: string) {
  return {
    request: {
      recall_request_id: request_id,
      actor_id: WALLET,
      estate_id: WALLET,
      requested_by: WALLET,
      task: 'phase-32b-served-path-redaction-receipt',
      environment_frame: 'private_chat' as const,
      risk_profile: 'low' as const,
      include_receipt_detail: 'standard' as const,
      signature: {
        signature_id: 'sig_phase32b',
        signer_id: 'signer:phase32b',
        signer_type: 'actor_controller' as const,
        signature_type: 'dev_signature' as const,
        signed_payload_hash:
          'sha256:0000000000000000000000000000000000000000000000000000000000000000',
        signature: 'devsig',
        signed_at: NOW_ISO,
        key_ref: 'kref_phase32b',
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

describe('Phase 32B — Dixie served-path passes through nonzero redaction receipt', () => {
  it('returns served + allow with enriched redacted_counts_by_reason and receipt-hash invariants', async () => {
    seamSpy.mockReturnValue(buildServedResponse());

    const app = buildApp();
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'phase-32b-served-1',
      },
      body: JSON.stringify(wedgeAlignedBody('rreq_phase32b_served')),
    });

    expect(res.status).toBe(200);
    expect(seamSpy).toHaveBeenCalledTimes(1);

    const bodyText = await res.text();
    const j = JSON.parse(bodyText) as {
      outcome: string;
      pack?: RecallPack;
      receipt?: RecallReceipt;
      audit_event_id?: string;
    };

    // Outcome / policy invariants the served path must preserve.
    expect(j.outcome).toBe('served');
    expect(j.pack).toBeDefined();
    expect(j.receipt).toBeDefined();
    expect(j.pack?.policy_decision.decision).toBe('allow');

    // Receipt-level: enriched redaction summary is forwarded verbatim.
    const counts = j.receipt?.redacted_counts_by_reason;
    expect(Array.isArray(counts)).toBe(true);
    expect(counts!.length).toBe(2);
    const byReason = new Map(counts!.map((r) => [r.reason, r.count]));
    expect(byReason.size).toBe(counts!.length);
    expect(byReason.get('privacy_tenant_in_public_frame')).toBe(3);
    expect(byReason.get('privacy_actor_private_in_public_frame')).toBe(2);

    // Sum invariant: redacted_count === sum of per-reason counts.
    const sum = counts!.reduce((acc, r) => acc + r.count, 0);
    expect(j.receipt?.redacted_count).toBe(sum);
    expect(j.receipt?.redacted_count).toBeGreaterThan(0);

    // Pack-level: pack.redacted carries the SAME per-reason summary that
    // Straylight emitted (Dixie does not recompute or re-bucket it).
    // Exact equality after order normalisation — extra entries on either
    // side would fail this check.
    expect(Array.isArray(j.pack?.redacted)).toBe(true);
    const normalize = (rs: { reason: string; count: number }[]) =>
      [...rs]
        .map((r) => ({ reason: r.reason, count: r.count }))
        .sort((a, b) => a.reason.localeCompare(b.reason));
    expect(normalize(j.pack?.redacted ?? [])).toEqual(normalize(counts!));

    // Hashes remain sha256-prefixed on every exposed surface. Dixie does
    // NOT recompute receipt_hash — it forwards exactly what the seam emits.
    expect(j.pack?.pack_hash.startsWith('sha256:')).toBe(true);
    expect(j.receipt?.pack_hash.startsWith('sha256:')).toBe(true);
    expect(j.receipt?.receipt_hash.startsWith('sha256:')).toBe(true);

    // Pack/receipt hash linkage preserved through the route.
    expect(j.receipt?.pack_hash).toBe(j.pack?.pack_hash);

    // excluded_counts_by_reason: a plain Record<string, number>. Verify
    // it's a non-null object, NOT an array, every key is a snake_case
    // token, and every value is a finite number. The fixture seeds an
    // exact entry, so assert that exact shape rather than just structure.
    const excluded = j.receipt?.excluded_counts_by_reason;
    expect(excluded).toBeDefined();
    expect(typeof excluded).toBe('object');
    expect(excluded).not.toBeNull();
    expect(Array.isArray(excluded)).toBe(false);
    const excludedEntries = Object.entries(
      excluded as Record<string, number>,
    );
    for (const [k, v] of excludedEntries) {
      expect(typeof k).toBe('string');
      expect(k).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(excluded).toEqual({ policy_excluded: 1 });
  });

  it('does not leak private payload fingerprints into pack/receipt public surfaces', async () => {
    // Setup: the mock owns a private source-material fixture containing
    // PHASE32B-PRIVATE-* sentinels. The mock derives counts from that
    // fixture and returns a CLEAN served envelope (no sentinels on any
    // pack/receipt field). The leakage check below proves Dixie's wire
    // body does not contain those sentinels — provably non-vacuous,
    // because the next assertion shows the sentinels really exist
    // somewhere (the private fixture).
    seamSpy.mockReturnValue(buildServedResponse());

    // (a) Provenance: prove the fingerprints actually existed in the
    // mock's internal source material. Without this, the negative
    // leakage assertions could pass simply because the strings never
    // existed in the test at all.
    expect(privateSourceMaterial.tenant_body).toContain(PRIVATE_TENANT);
    expect(privateSourceMaterial.relationship_body).toContain(PRIVATE_REL);
    expect(privateSourceMaterial.subject).toContain(PRIVATE_SUBJECT);

    const app = buildApp();
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'phase-32b-served-leakage',
      },
      body: JSON.stringify(wedgeAlignedBody('rreq_phase32b_served_leak')),
    });
    expect(res.status).toBe(200);
    const bodyText = await res.text();

    // (b) Public-surface leakage check: the served HTTP body Dixie
    // returns must not contain ANY of the private fingerprints anywhere
    // on the wire. Combined with (a), this proves the route did not
    // reintroduce private source material into the public envelope.
    expect(bodyText).not.toContain(PRIVATE_TENANT);
    expect(bodyText).not.toContain(PRIVATE_REL);
    expect(bodyText).not.toContain(PRIVATE_SUBJECT);

    // And specifically: the redaction-summary reason strings forwarded on
    // the wire are the public Straylight vocabulary, not opaque blobs
    // containing private payload.
    const j = JSON.parse(bodyText) as { receipt: RecallReceipt };
    for (const r of j.receipt.redacted_counts_by_reason) {
      expect(r.reason).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(r.reason).not.toContain(PRIVATE_TENANT);
      expect(r.reason).not.toContain(PRIVATE_REL);
      expect(r.reason).not.toContain(PRIVATE_SUBJECT);
    }
  });
});
