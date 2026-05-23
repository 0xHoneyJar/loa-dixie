// Phase 30E — Dixie dev-sign served-path proof.
//
// Phase 30C proved a wedge-aligned request reaches the Straylight seam, but
// its fixture signature was shape-realistic and NOT cryptographically
// self-consistent — competence/keyring fixture material was minimal and the
// seam never returned `outcome: 'served'` end-to-end through the Dixie
// route. Phase 30E closes that gap with a single integration test that:
//
//   1. builds a wedge-aligned RecallIntakeRequest,
//   2. signs it with a self-consistent `dev_signature` (HMAC_SHA256 over
//      the canonical recall payload hash, keyed by `key_ref`, prefixed
//      with `dev:`),
//   3. seeds the Dixie bounded store with a policy/signature-competent
//      Straylight `Actor`, `ActorEstate`, and `Keyring` (with signer
//      entries, a `recall_estate_context` competence rule, an empty
//      revoked-keys list, and matching `valid_from` / status), and
//   4. asserts the route returns HTTP 200 with `outcome: "served"` and a
//      wedge `pack` + `receipt` envelope.
//
// Constraints honored (Phase 30E task spec):
//   * No new endpoint, no production route behavior changes, no relaxation
//     of Phase 30C ingress rejection. Only test material is added.
//   * Test is self-contained — no Straylight runtime VALUE imports beyond
//     the route's already-allowed `@loa/straylight/runtime/recall-intake`
//     value-import path. The dev-sign algorithm is reproduced LOCALLY here
//     using `node:crypto`, mirroring the algorithm in
//     `loa-straylight/src/straylight/signatures.ts` +
//     `loa-straylight/src/straylight/canonical.ts`.
//   * Type-only imports from `@loa/straylight` and `@loa/straylight/host`
//     are unchanged from existing test files.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
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
import type { Actor, ActorEstate, Keyring, RecallPack, RecallReceipt } from '@loa/straylight';

// ── Capability env key + tenant id ──────────────────────────────────────────
const KEY = 'phase-30e-served-key-32-bytes-aaaaaa';
const WALLET = '0xabcdef0000000000000000000000000000000030';

// ── Logical clock pinned for the test ───────────────────────────────────────
// The seeded signer's `valid_from` MUST be ≤ this instant so signer-currently-
// valid checks pass; the recall signature's `signed_at` is set to the same
// instant for deterministic competence + audit timestamps.
const NOW_ISO = '2026-05-23T00:00:00.000Z';

// ── Local re-implementation of the Straylight dev-sign algorithm ────────────
//
// Source of truth (read-only references, not imported as values per the
// runtime-import-discipline rule):
//   * loa-straylight/src/straylight/canonical.ts (canonicalize, sha256)
//   * loa-straylight/src/straylight/signatures.ts (devSignatureFor,
//     recallSignedPayload, verifyEnvelopeSelfConsistency)
//
// Algorithm summary:
//   1. canonical(payload) — sorted-key JCS-shaped serializer; objects sort
//      by key, strings via JSON.stringify, numbers via JSON.stringify,
//      booleans literal, null literal, arrays serialize element-by-element.
//      Drops `undefined` properties.
//   2. signed_payload_hash = `sha256:` + hex(sha256(canonical(payload))).
//   3. signature = `dev:` + hex(HMAC_SHA256(key_ref, signed_payload_hash)).
//   4. verifyEnvelopeSelfConsistency only checks (3): signature ===
//      `dev:` + hex(HMAC_SHA256(envelope.key_ref, envelope.signed_payload_hash)).
//      `signed_payload_hash` is NOT recomputed at verify time — but Phase
//      30E intentionally derives it from the canonical recall payload so
//      the envelope is self-consistent in the strongest sense the wedge
//      algorithm supports.

function canonicalize(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`canonicalize: non-finite number`);
    return JSON.stringify(v);
  }
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const child = obj[k];
      if (child === undefined) continue;
      parts.push(JSON.stringify(k) + ':' + canonicalize(child));
    }
    return '{' + parts.join(',') + '}';
  }
  throw new Error(`canonicalize: unsupported type ${typeof v}`);
}

function sha256Of(value: unknown): string {
  const bytes = typeof value === 'string' ? value : canonicalize(value);
  return 'sha256:' + createHash('sha256').update(bytes).digest('hex');
}

function devSignatureFor(key_ref: string, payload_hash: string): string {
  const mac = createHmac('sha256', key_ref).update(payload_hash).digest('hex');
  return `dev:${mac}`;
}

function recallSignedPayload(input: {
  actor_id: string;
  estate_id: string;
  task: string;
  environment_frame: string;
  risk_profile: string;
}): unknown {
  return input;
}

// ── Build a fully self-consistent wedge-aligned body ────────────────────────

interface BuildOpts {
  wallet: string;
  request_id: string;
  signer_id: string;
  signer_type: 'actor_controller' | 'operator' | 'runtime' | 'reviewer';
  key_ref: string;
  task: string;
  environment_frame:
    | 'private_operator'
    | 'private_chat'
    | 'public_discord'
    | 'public_telegram'
    | 'repo_workflow'
    | 'tool_action_precheck'
    | 'audit_review';
  risk_profile: 'low' | 'medium' | 'high' | 'critical';
  signed_at: string;
}

function buildSignedBody(opts: BuildOpts) {
  const payload = recallSignedPayload({
    actor_id: opts.wallet,
    estate_id: opts.wallet,
    task: opts.task,
    environment_frame: opts.environment_frame,
    risk_profile: opts.risk_profile,
  });
  const signed_payload_hash = sha256Of(payload);
  const signature = devSignatureFor(opts.key_ref, signed_payload_hash);
  return {
    request: {
      recall_request_id: opts.request_id,
      actor_id: opts.wallet,
      estate_id: opts.wallet,
      requested_by: opts.wallet,
      task: opts.task,
      environment_frame: opts.environment_frame,
      risk_profile: opts.risk_profile,
      include_receipt_detail: 'standard' as const,
      signature: {
        signature_id: 'sig_phase30e',
        signer_id: opts.signer_id,
        signer_type: opts.signer_type,
        signature_type: 'dev_signature' as const,
        signed_payload_hash,
        signature,
        signed_at: opts.signed_at,
        key_ref: opts.key_ref,
      },
      created_at: opts.signed_at,
    },
    detail_level: 'standard' as const,
    caller: { tenant_id: opts.wallet, actor_id: opts.wallet },
  };
}

// ── Seed material: actor + estate + competence-shaped keyring ───────────────
//
// The Straylight wedge `Keyring` requires:
//   * `signer_entries[]` with `signer_id`, `signer_type`, `key_ref`,
//     `status`, `valid_from`.
//   * `competence_rules[]` with at least one rule whose `transition_type`
//     is `recall_estate_context` and whose `required_signer_roles`
//     contains the signer's `signer_type`.
//   * `revoked_key_refs[]` (empty for the served path).
//
// `evaluateCompetence` rejects when the signer's `key_ref` is in
// `revoked_key_refs`, when status !== 'active', when `valid_from > now`,
// when `entry.signer_type !== sig.signer_type`, or when the role is not
// in `required_signer_roles`. All five branches are negated below.

const KEYRING_VALID_FROM = '2026-01-01T00:00:00Z';
const SEED_AT = '2026-05-23T00:00:00.000Z';
const SIGNER_ID = 'signer:phase30e-controller';
const SIGNER_TYPE = 'actor_controller' as const;
const KEY_REF = 'dev-key:phase30e-controller';

function buildSeedMaterial(wallet: string): {
  actor: Actor;
  estate: ActorEstate;
  keyring: Keyring;
} {
  const actor = {
    actor_id: wallet,
    actor_type: 'agent',
    estate_id: wallet,
    keyring_id: `kr_${wallet}`,
    status: 'active',
    controller_refs: [wallet],
    schema_version: '0.1.0',
    created_at: SEED_AT,
    updated_at: SEED_AT,
  } as unknown as Actor;

  const estate = {
    estate_id: wallet,
    actor_id: wallet,
    schema_version: '0.1.0',
    status: 'active',
    assertion_index_ref: `index:${wallet}`,
    keyring_id: `kr_${wallet}`,
    policy_id: 'straylight.default-agent-estate.v0',
    audit_log_ref: `audit:${wallet}`,
    created_at: SEED_AT,
    updated_at: SEED_AT,
  } as unknown as ActorEstate;

  const keyring = {
    keyring_id: `kr_${wallet}`,
    actor_id: wallet,
    estate_id: wallet,
    version: '0.1.0',
    signer_entries: [
      {
        signer_id: SIGNER_ID,
        signer_type: SIGNER_TYPE,
        key_ref: KEY_REF,
        status: 'active',
        valid_from: KEYRING_VALID_FROM,
        scopes: [`estate:${wallet}`],
      },
    ],
    competence_rules: [
      {
        rule_id: 'rule:phase30e-recall-default',
        transition_type: 'recall_estate_context',
        required_signer_roles: [SIGNER_TYPE, 'operator', 'runtime', 'reviewer'],
      },
    ],
    revoked_key_refs: [] as string[],
    created_at: SEED_AT,
    updated_at: SEED_AT,
  } as unknown as Keyring;

  return { actor, estate, keyring };
}

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
  const { actor, estate, keyring } = buildSeedMaterial(WALLET);
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
      // Pin logical clock so signer `valid_from` and audit `created_at`
      // are deterministic across the wedge call.
      now: () => new Date(NOW_ISO),
    }),
  );
  return app;
}

beforeEach(() => {
  process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = KEY;
});
afterEach(() => {
  delete process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY;
});

describe('Phase 30E — POST /api/recall/intake served path with self-consistent dev_signature', () => {
  it('returns 200 outcome=served with wedge pack + receipt for a competence-passing request', async () => {
    const app = buildApp();
    const body = buildSignedBody({
      wallet: WALLET,
      request_id: 'rreq_phase30e_served',
      signer_id: SIGNER_ID,
      signer_type: SIGNER_TYPE,
      key_ref: KEY_REF,
      task: 'phase-30e-served-path',
      environment_frame: 'private_chat',
      risk_profile: 'low',
      signed_at: NOW_ISO,
    });
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'phase-30e-served-1',
      },
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      outcome: string;
      pack?: RecallPack;
      receipt?: RecallReceipt;
      audit_event_id?: string;
    };
    expect(j.outcome).toBe('served');
    // Wedge served-path envelope must carry both pack and receipt.
    expect(j.pack).toBeDefined();
    expect(j.receipt).toBeDefined();
    // Pack identity is request-scoped: the wedge stamps the request_id and
    // bound estate/actor, and emits a content-addressed receipt id.
    expect(j.pack?.recall_request_id).toBe('rreq_phase30e_served');
    expect(j.pack?.actor_id).toBe(WALLET);
    expect(j.pack?.estate_id).toBe(WALLET);
    expect(j.pack?.included).toEqual([]);
    expect(j.pack?.marked).toEqual([]);
    expect(j.receipt?.recall_request_id).toBe('rreq_phase30e_served');
    expect(j.receipt?.actor_id).toBe(WALLET);
    expect(j.receipt?.estate_id).toBe(WALLET);
    // Pack hash is sha256-prefixed; receipt hash chains off it.
    expect(j.pack?.pack_hash?.startsWith('sha256:')).toBe(true);
    expect(j.receipt?.pack_hash).toBe(j.pack?.pack_hash);
    // Policy decision must be `allow` for a competence-passing low/private
    // recall; needs_review or deny would mean the seed is wrong.
    expect(j.pack?.policy_decision.decision).toBe('allow');
  });
});
