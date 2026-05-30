// Phase 32K — dev/operator seeded live estate, end-to-end through the real
// Dixie app and the REAL Straylight runtime (no `vi.mock` of
// handleRecallIntake).
//
// Phase 32J (PR #116) established that a live recall-intake reaches the
// Straylight seam but returns `seam.storage_unavailable` because the
// process-local bounded estate store has no seeded tenant slot. Phase 32K
// wires a default-off, dev/operator-only, idempotent in-process seed after
// createBoundedEstateStore. This test proves the seam returns a served
// recall for the seeded tenant through the production route + middleware
// stack, while every fail-closed guarantee is preserved.
//
// Canonical seed reference (Phase 32J correction): the real-runtime served
// seed shape is `served-path.test.ts` (buildSeedMaterial + seedTenant
// against the real Straylight runtime). Phase 32B/32C are the additional
// mocked-seam served pass-through / replay proofs. This test deliberately
// exercises the REAL runtime via the real seed helper — it does NOT mock the
// seam — so a green run is the live-equivalent served proof for the seeded
// dev/operator tenant.
//
// The `dev_signature` is computed HERE by the caller (the role a real
// dev/operator caller plays) using the PUBLIC `DEV_SEED_KEY_REF` label
// exported by the seed helper. No secret is stored in the seed or this test.
// The dev-sign algorithm is reproduced locally with node:crypto, mirroring
// `@loa/straylight` signatures.ts/canonical.ts (the same approach
// served-path.test.ts uses) so this file takes no extra Straylight runtime
// value import.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createHash, createHmac } from 'node:crypto';
import * as jose from 'jose';
import { createDixieApp, type DixieApp } from '../../../src/server.js';
import type { DixieConfig } from '../../../src/config.js';
import {
  DEV_SEED_KEY_REF,
  DEV_SEED_SIGNER_ID,
  DEV_SEED_SIGNER_TYPE,
} from '../../../src/services/straylight-recall-intake/index.js';
import type { RecallPack, RecallReceipt } from '@loa/straylight';

// ── Synthetic, public-safe identities (no live ids/secrets) ─────────────────
const JWT_SECRET = 'phase-32k-dev-seed-jwt-secret-32chars!!';
const RUNTIME_KEY = 'phase-32k-runtime-dixie-key-32-bytes-aa';
// Seeded dev/operator tenant. Synthetic 0x + 40 hex, ALL-LOWERCASE so viem's
// getAddress() (used by the allowlist gate) accepts and re-checksums it
// without throwing on a bad mixed-case checksum. The JWT `sub`, the route's
// `x-wallet-address`, the body caller/actor/estate ids, and the seed tenant
// id are all this exact lowercase string, so every exact-string comparison
// (route tenant override, bounded-store slot key) lines up. UNSEEDED_TENANT
// is genuinely unseeded for the negative case below.
const SEEDED_TENANT = '0xabcdef0000000000000000000000000000000032';
const UNSEEDED_TENANT = '0xabcdef0000000000000000000000000000000099';
const CROSS_TENANT = '0xabcdef0000000000000000000000000000000077';

// ── Local re-implementation of the Straylight dev-sign algorithm ────────────
// (read-only mirror of signatures.ts/canonical.ts; not a value import).
function canonicalize(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error('canonicalize: non-finite number');
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
function devSignatureFor(keyRef: string, payloadHash: string): string {
  return `dev:${createHmac('sha256', keyRef).update(payloadHash).digest('hex')}`;
}

// Build a fully self-consistent wedge-aligned recall-intake body. `actor_id`,
// `estate_id`, caller.* are all bound to `wallet` (the route's authoritative
// tenant override requires this). The signature is computed by the caller —
// no stored secret.
function buildSignedBody(opts: {
  wallet: string;
  requestId: string;
  task: string;
  signerId?: string;
  signerType?:
    | 'actor_controller'
    | 'operator'
    | 'runtime'
    | 'reviewer'
    | 'policy_service'
    | 'admin'
    | 'wallet'
    | 'service_key';
  keyRef?: string;
}) {
  const signerId = opts.signerId ?? DEV_SEED_SIGNER_ID;
  const signerType = opts.signerType ?? DEV_SEED_SIGNER_TYPE;
  const keyRef = opts.keyRef ?? DEV_SEED_KEY_REF;
  const payload = {
    actor_id: opts.wallet,
    estate_id: opts.wallet,
    task: opts.task,
    environment_frame: 'private_chat',
    risk_profile: 'low',
  };
  const signed_payload_hash = sha256Of(payload);
  const signature = devSignatureFor(keyRef, signed_payload_hash);
  return {
    request: {
      recall_request_id: opts.requestId,
      actor_id: opts.wallet,
      estate_id: opts.wallet,
      requested_by: opts.wallet,
      task: opts.task,
      environment_frame: 'private_chat' as const,
      risk_profile: 'low' as const,
      include_receipt_detail: 'standard' as const,
      signature: {
        signature_id: 'sig_phase32k',
        signer_id: signerId,
        signer_type: signerType,
        signature_type: 'dev_signature' as const,
        signed_payload_hash,
        signature,
        signed_at: '2026-05-30T00:00:00.000Z',
        key_ref: keyRef,
      },
      created_at: '2026-05-30T00:00:00.000Z',
    },
    detail_level: 'standard' as const,
    caller: { tenant_id: opts.wallet, actor_id: opts.wallet },
  };
}

async function mintJwt(wallet: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({ sub: wallet, tier: 'free' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setIssuer('dixie-bff')
    .setAudience('dixie-bff')
    .sign(secret);
}

async function mintExpiredJwt(wallet: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({ sub: wallet })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
    .setIssuer('dixie-bff')
    .setAudience('dixie-bff')
    .sign(secret);
}

// ── Mock loa-finn (only health is touched in these tests) ───────────────────
function createMockFinn(): Hono {
  const mock = new Hono();
  mock.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0-mock' }));
  return mock;
}

function baseConfig(finnPort: number): DixieConfig {
  return {
    port: 3599,
    finnUrl: `http://localhost:${finnPort}`,
    finnWsUrl: `ws://localhost:${finnPort}`,
    corsOrigins: ['*'],
    allowlistPath: '',
    adminKey: 'phase-32k-admin-key',
    jwtPrivateKey: JWT_SECRET,
    jwtAlgorithm: 'HS256',
    jwtLegacyHs256Secret: null,
    nodeEnv: 'test',
    logLevel: 'error',
    rateLimitRpm: 1000,
    otelEndpoint: null,
    databaseUrl: null,
    redisUrl: null,
    natsUrl: null,
    memoryProjectionTtlSec: 300,
    memoryMaxEventsPerQuery: 100,
    convictionTierTtlSec: 300,
    personalityTtlSec: 1800,
    autonomousPermissionTtlSec: 300,
    autonomousBudgetDefaultMicroUsd: 100_000,
    databasePoolSize: 10,
    rateLimitBackend: 'memory',
    scheduleCallbackSecret: 'phase-32k-callback-secret',
    x402Enabled: false,
    x402FacilitatorUrl: null,
    billingJwtSecret: null,
    pricingApiUrl: null,
    pricingTtlSec: 300,
    recallIntakeEnabled: true,
    straylightRuntimeDixieKey: RUNTIME_KEY,
    recallIntakeBodyMaxBytes: 32_768,
    recallIntakeRateRpm: 1000,
    recallIntakeMaxAssertionsPerTenant: 512,
    recallIntakeMaxAssertionBytesPerTenant: 1_048_576,
    recallIntakeIdempotencyTtlSec: 900,
    recallIntakeIdempotencyMaxEntries: 4_096,
    // Phase 32K dev seed defaults (overridden per-suite below).
    recallIntakeDevSeedEnabled: false,
    recallIntakeDevSeedTenantId: '',
  };
}

let mockFinnServer: ReturnType<typeof serve>;
const MOCK_FINN_PORT = 14800 + Math.floor(Math.random() * 700);

beforeAll(() => {
  mockFinnServer = serve({ fetch: createMockFinn().fetch, port: MOCK_FINN_PORT });
});
afterAll(() => {
  mockFinnServer?.close();
});

// The capability holder reads STRAYLIGHT_RUNTIME_DIXIE_KEY from env at mint
// time (per-request). Set it for the whole suite.
beforeEach(() => {
  process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = RUNTIME_KEY;
});
afterEach(() => {
  delete process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY;
});

function buildSeededApp(): DixieApp {
  const config: DixieConfig = {
    ...baseConfig(MOCK_FINN_PORT),
    recallIntakeDevSeedEnabled: true,
    recallIntakeDevSeedTenantId: SEEDED_TENANT,
  };
  const app = createDixieApp(config);
  // Allowlist the seeded + unseeded + cross tenants so requests clear the
  // allowlist gate and reach the recall route (the route's own
  // tenant/seed/seam logic is what's under test, not the allowlist).
  app.allowlistStore.addEntry('wallet', SEEDED_TENANT);
  app.allowlistStore.addEntry('wallet', UNSEEDED_TENANT);
  app.allowlistStore.addEntry('wallet', CROSS_TENANT);
  return app;
}

async function postRecall(
  app: DixieApp,
  jwt: string | null,
  body: unknown,
  idempotencyKey: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'idempotency-key': idempotencyKey,
  };
  if (jwt) headers.authorization = `Bearer ${jwt}`;
  return app.app.request('/api/recall/intake', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

// Private fingerprints that must never appear on the served wire surface.
// (The served envelope for an empty seeded estate carries no tenant payload;
// these guard against any future regression that echoes internals.)
const NO_LEAK_TOKENS = [
  'no slot for tenant',
  'bounded-estate-store',
  'BoundedStore',
  'runtime_seam:',
  'getKeyring',
  RUNTIME_KEY,
  JWT_SECRET,
  DEV_SEED_KEY_REF,
];

// Phase 32K — internal/store fingerprints that must never appear on an
// UNSEEDED / default-off `503` storage_unavailable denial body. Before this
// patch the host coerced the bounded store's `getKeyring()` throw into
// `raw_reasons:['bounded-estate-store: no slot for tenant <tenant_id>']`
// (producer A), and the route internal fallback into
// `raw_reasons:['runtime_seam:internal:<message>']` (producer C); both were
// forwarded verbatim into the public body via refusal-mapping. The public
// body must now expose neither the `raw_reasons` key nor any of these
// tokens — including the raw tenant ids, which are the request identities
// the unseeded throw embeds.
const DENIAL_NO_LEAK_TOKENS = [
  'raw_reasons',
  'bounded-estate-store',
  'BoundedStore',
  'no slot for tenant',
  'runtime_seam:internal',
  'runtime_seam:',
  'getKeyring',
  'stack',
  'at Object.',
  '.ts:',
  SEEDED_TENANT,
  UNSEEDED_TENANT,
  CROSS_TENANT,
  RUNTIME_KEY,
  JWT_SECRET,
  DEV_SEED_KEY_REF,
];

// Assert an unseeded/default-off storage_unavailable denial leaks no raw
// reasons, bounded-store detail, tenant material, or internal seam/debug
// text — on BOTH the parsed JSON shape and the raw wire text.
function expectStorageDenialIsSanitized(
  bodyText: string,
  body: Record<string, unknown>,
): void {
  // No raw_reasons key at all on the public body (omitted, not empty).
  expect(body.raw_reasons).toBeUndefined();
  expect(Object.prototype.hasOwnProperty.call(body, 'raw_reasons')).toBe(false);
  // The public message is classification-only — not the bounded-store throw.
  expect(typeof body.message).toBe('string');
  // Wire-text scan: none of the internal/store/tenant fingerprints survive.
  for (const tok of DENIAL_NO_LEAK_TOKENS) {
    expect(bodyText).not.toContain(tok);
  }
  // No JWT/token material and no stack-ish frames.
  expect(bodyText).not.toMatch(/eyJ[A-Za-z0-9_-]+\./);
}

describe('Phase 32K — dev/operator seeded live estate (real route + real seam)', () => {
  it('seeded tenant returns HTTP 200 served/allow recall through the real route', async () => {
    const app = buildSeededApp();
    const jwt = await mintJwt(SEEDED_TENANT);
    const body = buildSignedBody({
      wallet: SEEDED_TENANT,
      requestId: 'rreq_phase32k_served',
      task: 'phase-32k-dev-seed-smoke',
    });
    const res = await postRecall(app, jwt, body, 'phase-32k-served-1');

    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      outcome: string;
      pack?: RecallPack;
      receipt?: RecallReceipt;
    };
    // Served / governed recall through the REAL Straylight runtime.
    expect(j.outcome).toBe('served');
    expect(j.pack).toBeDefined();
    expect(j.receipt).toBeDefined();
    expect(j.pack?.policy_decision.decision).toBe('allow');
    expect(j.pack?.actor_id).toBe(SEEDED_TENANT);
    expect(j.pack?.estate_id).toBe(SEEDED_TENANT);
    // Empty seeded estate → nothing included/marked.
    expect(j.pack?.included).toEqual([]);
    expect(j.pack?.marked).toEqual([]);
    expect(j.pack?.pack_hash?.startsWith('sha256:')).toBe(true);
    expect(j.receipt?.pack_hash).toBe(j.pack?.pack_hash);
    expect(j.receipt?.receipt_hash?.startsWith('sha256:')).toBe(true);
  });

  it('seed is idempotent / safe to initialize more than once', async () => {
    // Two independent app instances seed the same synthetic tenant on
    // construction; both must serve identically. This models re-seeding on
    // process restart (the seed replaces the slot — no duplication, no throw).
    const a = buildSeededApp();
    const b = buildSeededApp();
    const jwt = await mintJwt(SEEDED_TENANT);
    const body = buildSignedBody({
      wallet: SEEDED_TENANT,
      requestId: 'rreq_phase32k_idem',
      task: 'phase-32k-idempotent',
    });
    const r1 = await postRecall(a, jwt, body, 'phase-32k-idem-a');
    const r2 = await postRecall(b, jwt, body, 'phase-32k-idem-b');
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const j1 = (await r1.json()) as { outcome: string; pack?: RecallPack };
    const j2 = (await r2.json()) as { outcome: string; pack?: RecallPack };
    // Re-seeding the same synthetic tenant on a second startup is safe: no
    // throw, no duplication, and the seeded estate serves an identical
    // governed-recall SHAPE. (pack_hash itself is content-addressed over the
    // request-time `now`, which the production server path does not pin, so
    // hashes legitimately differ across instants — the seed identity, not the
    // wall clock, is what must be stable.)
    expect(j1.outcome).toBe('served');
    expect(j2.outcome).toBe('served');
    expect(j1.pack?.policy_decision.decision).toBe('allow');
    expect(j2.pack?.policy_decision.decision).toBe('allow');
    expect(j1.pack?.actor_id).toBe(SEEDED_TENANT);
    expect(j2.pack?.actor_id).toBe(SEEDED_TENANT);
    expect(j1.pack?.estate_id).toBe(SEEDED_TENANT);
    expect(j2.pack?.estate_id).toBe(SEEDED_TENANT);
    expect(j1.pack?.included).toEqual([]);
    expect(j2.pack?.included).toEqual([]);
    expect(j1.pack?.marked).toEqual([]);
    expect(j2.pack?.marked).toEqual([]);
  });

  it('re-seeding the SAME store instance is a safe no-op-equivalent overwrite', async () => {
    // Direct seed-helper idempotency: seeding the same tenant twice on one
    // store must not throw and must leave a single empty estate (zero
    // assertions), confirming seedTenant replaces (not appends to) the slot.
    const { createBoundedEstateStore, seedDevOperatorEstate } = await import(
      '../../../src/services/straylight-recall-intake/index.js'
    );
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 512,
      maxAssertionBytesPerTenant: 1_048_576,
    });
    seedDevOperatorEstate(store, SEEDED_TENANT);
    seedDevOperatorEstate(store, SEEDED_TENANT);
    const footprint = store.inspectTenant(SEEDED_TENANT);
    expect(footprint.assertions).toBe(0);
    expect(footprint.bytes).toBe(0);
  });

  it('served wire body leaks no secrets/internals/tenant-debug material', async () => {
    const app = buildSeededApp();
    const jwt = await mintJwt(SEEDED_TENANT);
    const body = buildSignedBody({
      wallet: SEEDED_TENANT,
      requestId: 'rreq_phase32k_noleak',
      task: 'phase-32k-no-leak',
    });
    const res = await postRecall(app, jwt, body, 'phase-32k-noleak-1');
    expect(res.status).toBe(200);
    const text = await res.text();
    for (const tok of NO_LEAK_TOKENS) {
      expect(text).not.toContain(tok);
    }
    // No JWT/token material, no raw assertion-store internals, no stack
    // traces. (Note: the served receipt's `filters_applied` legitimately
    // contains the frame token "private_chat" — that is public wedge
    // vocabulary, not private payload — so we do NOT blanket-ban "private".)
    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]+\./); // no JWT
    expect(text).not.toContain('at Object.');
    expect(text).not.toContain('.ts:');
  });

  it('UNSEEDED tenant still returns safe seam.storage_unavailable (503)', async () => {
    const app = buildSeededApp();
    const jwt = await mintJwt(UNSEEDED_TENANT);
    const body = buildSignedBody({
      wallet: UNSEEDED_TENANT,
      requestId: 'rreq_phase32k_unseeded',
      task: 'phase-32k-unseeded',
    });
    const res = await postRecall(app, jwt, body, 'phase-32k-unseeded-1');
    // Producer (A) from Phase 32J §2: unseeded slot → getKeyring throws →
    // host coerces to storage_unavailable → 503 refusal. Preserved exactly.
    expect(res.status).toBe(503);
    const bodyText = await res.text();
    const j = JSON.parse(bodyText) as { outcome: string; error: string };
    expect(j.outcome).toBe('denied');
    expect(j.error).toBe('seam.storage_unavailable');
    // Critically: a served pack/receipt MUST NOT appear for an unseeded
    // tenant even though another tenant is seeded in the same store.
    expect((j as { pack?: unknown }).pack).toBeUndefined();
    expect((j as { receipt?: unknown }).receipt).toBeUndefined();
    // Phase 32K — the public denial body must NOT forward the host's
    // bounded-store throw text (which embeds the raw tenant id) nor any
    // internal seam/debug material. raw_reasons is sanitized out entirely.
    expectStorageDenialIsSanitized(bodyText, j as Record<string, unknown>);
  });

  it('unauthenticated recall-intake still fails closed (401)', async () => {
    const app = buildSeededApp();
    const body = buildSignedBody({
      wallet: SEEDED_TENANT,
      requestId: 'rreq_phase32k_noauth',
      task: 'phase-32k-noauth',
    });
    const res = await postRecall(app, null, body, 'phase-32k-noauth-1');
    // No JWT → JWT middleware sets no wallet → allowlist gate returns 401
    // before the route runs. Fail-closed; no served body.
    expect(res.status).toBe(401);
  });

  it('expired token still fails closed (401, unchanged)', async () => {
    const app = buildSeededApp();
    const jwt = await mintExpiredJwt(SEEDED_TENANT);
    const body = buildSignedBody({
      wallet: SEEDED_TENANT,
      requestId: 'rreq_phase32k_expired',
      task: 'phase-32k-expired',
    });
    const res = await postRecall(app, jwt, body, 'phase-32k-expired-1');
    // Expired JWT → no wallet set → allowlist gate 401. No served body.
    expect(res.status).toBe(401);
  });

  it('cross-tenant body mismatch still returns 403 (authoritative override)', async () => {
    const app = buildSeededApp();
    // Authenticate as CROSS_TENANT but address the seeded tenant in the body.
    const jwt = await mintJwt(CROSS_TENANT);
    const body = buildSignedBody({
      wallet: SEEDED_TENANT, // body claims the seeded tenant
      requestId: 'rreq_phase32k_cross',
      task: 'phase-32k-cross-tenant',
    });
    const res = await postRecall(app, jwt, body, 'phase-32k-cross-1');
    expect(res.status).toBe(403);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe('ingress.cross_tenant_body_mismatch');
    // The mismatch must be rejected at ingress BEFORE any seam/seed work —
    // the attacker must not borrow the seeded tenant's served estate.
    expect((j as { pack?: unknown }).pack).toBeUndefined();
  });
});

describe('Phase 32K — default-off preserves the current unseeded failure path', () => {
  function buildUnseededApp(): DixieApp {
    // Dev seed DISABLED (default). Recall route still mounted.
    const app = createDixieApp(baseConfig(MOCK_FINN_PORT));
    app.allowlistStore.addEntry('wallet', SEEDED_TENANT);
    return app;
  }

  it('with the dev seed OFF, the SAME tenant returns seam.storage_unavailable', async () => {
    const app = buildUnseededApp();
    const jwt = await mintJwt(SEEDED_TENANT);
    const body = buildSignedBody({
      wallet: SEEDED_TENANT,
      requestId: 'rreq_phase32k_off',
      task: 'phase-32k-default-off',
    });
    const res = await postRecall(app, jwt, body, 'phase-32k-off-1');
    // No seed → exact pre-Phase-32K behavior: 503 storage_unavailable.
    expect(res.status).toBe(503);
    const bodyText = await res.text();
    const j = JSON.parse(bodyText) as { outcome: string; error: string };
    expect(j.outcome).toBe('denied');
    expect(j.error).toBe('seam.storage_unavailable');
    expect((j as { pack?: unknown }).pack).toBeUndefined();
    // Phase 32K — default-off denial body is sanitized identically: no raw
    // reasons, no bounded-store detail, no tenant material, no internal seam
    // text. The safe status + classification are preserved.
    expectStorageDenialIsSanitized(bodyText, j as Record<string, unknown>);
  });
});
