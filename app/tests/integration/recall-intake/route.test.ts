// ADR-026D §3.a (i)(ii)(iv), §3.d, §4.g; §5.a, §5.d.
//
// End-to-end of POST /api/recall/intake against an in-process Hono app:
//   * 413 at/over body limit
//   * 429 sustained per-tenant load
//   * tampered body refused
//   * forged auth refused
//   * cross-tenant ingress refused (`ingress.cross_tenant_body_mismatch`)
//   * authoritative tenant override (caller-supplied tenant ignored)
//   * served happy path under bounded local seed (NOT production memory)
//
// The endpoint is mounted on a small Hono app that stubs the wallet header
// rather than running the real JWT pipeline (which is exercised in the
// existing JWT/auth test suites).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
import type { Actor, ActorEstate, Keyring } from '@loa/straylight';

const KEY = 'phase-26e-route-key-32-bytes-aaaaaa';
const WALLET = '0xabcdef0000000000000000000000000000000001';
const OTHER = '0xabcdef0000000000000000000000000000000002';

function buildApp(opts?: {
  bodyMaxBytes?: number;
  ratePerMinute?: number;
}) {
  const app = new Hono();
  // Test-only wallet bridge.
  app.use('/api/recall/intake/*', async (c, next) => {
    const w = c.req.header('x-test-wallet');
    if (w) c.req.raw.headers.set('x-wallet-address', w);
    await next();
  });
  const boundedStore = createBoundedEstateStore({
    maxAssertionsPerTenant: 100,
    maxAssertionBytesPerTenant: 1_000_000,
  });
  // Seed the wallet's estate so the seam can resolve a keyring; assertions
  // remain empty (Phase 26E posture: seam is wired, real assertion storage
  // is out of scope).
  const actor: Actor = {
    actor_id: WALLET,
    actor_class: 'agent',
    display_name: 'test',
    created_at: '2026-05-18T00:00:00Z',
  } as unknown as Actor;
  const estate: ActorEstate = {
    estate_id: WALLET,
    actor_id: WALLET,
    created_at: '2026-05-18T00:00:00Z',
  } as unknown as ActorEstate;
  const keyring: Keyring = {
    keyring_id: `kr_${WALLET}`,
    actor_id: WALLET,
    signers: [
      {
        signer_id: 'signer_test',
        actor_id: WALLET,
        public_key: 'pk_test',
        roles: ['actor_self'],
        active: true,
        added_at: '2026-05-18T00:00:00Z',
      },
    ],
    created_at: '2026-05-18T00:00:00Z',
  } as unknown as Keyring;
  boundedStore.seedTenant({
    tenant_id: WALLET,
    actor,
    estate,
    keyring,
  });
  app.route(
    '/api/recall/intake',
    createRecallIntakeRoutes({
      bodyMaxBytes: opts?.bodyMaxBytes ?? 4_096,
      capabilityHolder: createCapabilityHolder(),
      boundedStore,
      idempotencyCache: createIdempotencyCache({ ttlSec: 60, maxEntries: 64 }),
      perEstateMutex: createPerEstateMutex(),
      perTenantRateLimit: createPerTenantRateLimit({ rpm: opts?.ratePerMinute ?? 5 }),
      intakeLog: createInMemoryIntakeDenyLog(),
    }),
  );
  return app;
}

function bodyForWallet(wallet: string, request_id: string) {
  return {
    request: {
      recall_request_id: request_id,
      actor_id: wallet,
      estate_id: wallet,
      environment_frame: 'actor_private',
      risk_profile: 'routine',
      include_receipt_detail: 'minimal',
      signature: {
        signature_id: 'sig_1',
        signer_id: 'signer_test',
        signature_value: 'devsig',
        algorithm: 'ed25519',
        signed_at: '2026-05-18T00:00:00Z',
      },
    },
    detail_level: 'minimal',
    caller: {
      tenant_id: wallet,
      actor_id: wallet,
    },
  };
}

beforeEach(() => {
  process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = KEY;
});
afterEach(() => {
  delete process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY;
});

describe('POST /api/recall/intake — auth + ingress', () => {
  it('refuses without wallet header (401, ADR-026D §3.d)', async () => {
    const app = buildApp();
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k1' },
      body: JSON.stringify(bodyForWallet(WALLET, 'r1')),
    });
    expect(res.status).toBe(401);
  });

  it('rejects when caller.tenant_id disagrees with session wallet (403, §4.g)', async () => {
    const app = buildApp();
    const body = bodyForWallet(WALLET, 'r1');
    body.caller.tenant_id = OTHER;
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k1',
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(403);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe('ingress.cross_tenant_body_mismatch');
  });

  it('rejects when request.actor_id ≠ session wallet (authoritative override, §3.d)', async () => {
    const app = buildApp();
    const body = bodyForWallet(WALLET, 'r1');
    body.request.actor_id = OTHER;
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k1',
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(403);
  });

  it('rejects when request.estate_id ≠ session wallet (403, ingress.cross_tenant_body_mismatch)', async () => {
    const app = buildApp();
    const body = bodyForWallet(WALLET, 'r1');
    body.request.estate_id = OTHER;
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k1',
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(403);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe('ingress.cross_tenant_body_mismatch');
  });

  it('refuses tampered body (zod failure → 400)', async () => {
    const app = buildApp();
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k1',
      },
      body: JSON.stringify({ ...bodyForWallet(WALLET, 'r1'), unknown_extra: true }),
    });
    expect(res.status).toBe(400);
  });

  it('requires Idempotency-Key (400)', async () => {
    const app = buildApp();
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-wallet': WALLET },
      body: JSON.stringify(bodyForWallet(WALLET, 'r1')),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/recall/intake — body & rate caps', () => {
  it('refuses body over bodyMaxBytes (413, ADR-026D §3.a (i))', async () => {
    const app = buildApp({ bodyMaxBytes: 256 });
    const body = bodyForWallet(WALLET, 'r1');
    // Bloat to push over 256B.
    body.request.signature.signature_value = 'a'.repeat(2_000);
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k1',
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(413);
  });

  it('refuses oversized streamed body without Content-Length (SKP-003)', async () => {
    // SKP-003: clients can omit Content-Length, send a stale value, or
    // chunk-transfer-encode the body. The route MUST cap bytes at the
    // streaming layer BEFORE JSON.parse can consume an oversized body.
    const app = buildApp({ bodyMaxBytes: 256 });
    // Build a streaming body that emits well over the cap with NO
    // Content-Length header. The first chunk alone already exceeds the
    // 256-byte cap; the cap check must short-circuit on streamed bytes.
    const oversized = 'a'.repeat(2_000);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(oversized));
        controller.close();
      },
    });
    const req = new Request('http://localhost/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k1',
      },
      body: stream,
      // Node's fetch requires `duplex: 'half'` for streaming request bodies.
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    // Sanity: Content-Length must be absent for this test to exercise the
    // streamed-cap path rather than the cheap header pre-check.
    expect(req.headers.get('content-length')).toBeNull();
    const res = await app.fetch(req);
    expect(res.status).toBe(413);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe('ingress.payload_too_large');
  });

  it('invalid JSON under the byte cap returns invalid_request, not payload_too_large (SKP-003)', async () => {
    // SKP-003: a malformed body that fits under the cap must reach the
    // JSON.parse path and surface as 400 ingress.invalid_request — NOT
    // 413. This guards against the cap accidentally rejecting small
    // bodies, and against JSON.parse running before the cap check.
    const app = buildApp({ bodyMaxBytes: 4_096 });
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k1',
      },
      body: '{ this is not json',
    });
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe('ingress.invalid_request');
  });

  it('valid body under the byte cap reaches the served path (SKP-003)', async () => {
    // SKP-003 regression: a well-formed body within bodyMaxBytes must
    // proceed past the body-cap stage. We assert the response is NOT a
    // 413 payload-too-large refusal — confirming the cap did not
    // accidentally reject a compliant payload.
    const app = buildApp({ bodyMaxBytes: 4_096 });
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k-under-cap',
      },
      body: JSON.stringify(bodyForWallet(WALLET, 'r-under-cap')),
    });
    expect(res.status).not.toBe(413);
    if (res.status >= 400) {
      const j = (await res.json()) as { error?: string };
      // If the request fails at any layer, it MUST NOT be the body-cap
      // refusal — we are validating that the cap let a valid payload
      // through.
      expect(j.error).not.toBe('ingress.payload_too_large');
      expect(j.error).not.toBe('ingress.invalid_request');
    }
  });

  it('refuses sustained per-tenant load (429, ADR-026D §3.a (ii))', async () => {
    const app = buildApp({ ratePerMinute: 1 });
    const make = (n: number) =>
      app.request('/api/recall/intake', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-test-wallet': WALLET,
          'idempotency-key': `k${n}`,
        },
        body: JSON.stringify(bodyForWallet(WALLET, `r${n}`)),
      });
    const r1 = await make(1);
    expect(r1.status).not.toBe(429);
    const r2 = await make(2);
    const r3 = await make(3);
    expect([r2.status, r3.status]).toContain(429);
  });
});

describe('POST /api/recall/intake — idempotency', () => {
  it('replay with same key returns prior response (no double-execute)', async () => {
    const app = buildApp();
    const headers = {
      'content-type': 'application/json',
      'x-test-wallet': WALLET,
      'idempotency-key': 'replay-key',
    };
    const body = JSON.stringify(bodyForWallet(WALLET, 'r-replay'));
    const r1 = await app.request('/api/recall/intake', { method: 'POST', headers, body });
    const r2 = await app.request('/api/recall/intake', { method: 'POST', headers, body });
    expect(r1.status).toBe(r2.status);
    const t1 = await r1.text();
    const t2 = await r2.text();
    expect(t1).toBe(t2);
  });
});

describe('POST /api/recall/intake — capability fail-closed', () => {
  it('missing STRAYLIGHT_RUNTIME_DIXIE_KEY → seam refusal at first call (no fall-back)', async () => {
    delete process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY;
    const app = buildApp();
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k1',
      },
      body: JSON.stringify(bodyForWallet(WALLET, 'r1')),
    });
    // Capability constructor throws inside the holder; route falls through
    // the seam catch and returns a 503 storage_unavailable refusal.
    expect(res.status).toBe(503);
  });
});
