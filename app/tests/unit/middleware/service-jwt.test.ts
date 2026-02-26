/**
 * Service-to-service JWT middleware tests (cycle-011, Sprint 83, T2.4b).
 *
 * Tests ES256 verification, claim validation, clock tolerance, and error handling.
 * Uses jose to generate ephemeral EC P-256 keypairs for testing.
 *
 * @since cycle-011 — Sprint 83, Task T2.4b
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Hono } from 'hono';
import * as jose from 'jose';
import { createServiceJwtMiddleware, _resetKeyCache } from '../../../src/middleware/service-jwt.js';

// ---------------------------------------------------------------------------
// Test keypair (generated once per suite)
// ---------------------------------------------------------------------------

let privateKey: jose.KeyLike;
let publicKeyPem: string;

beforeAll(async () => {
  const { privateKey: priv, publicKey: pub } = await jose.generateKeyPair('ES256');
  privateKey = priv;
  publicKeyPem = await jose.exportSPKI(pub);
});

afterEach(() => {
  _resetKeyCache();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function signToken(
  overrides: Partial<{ iss: string; aud: string; sub: string; exp: number }> = {},
  key?: jose.KeyLike,
) {
  const signer = new jose.SignJWT({ sub: overrides.sub ?? 'finn-service' })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setIssuer(overrides.iss ?? 'loa-finn')
    .setAudience(overrides.aud ?? 'loa-dixie');

  if (overrides.exp !== undefined) {
    signer.setExpirationTime(overrides.exp);
  } else {
    signer.setExpirationTime('5m');
  }

  return signer.sign(key ?? privateKey);
}

function createTestApp(publicKey: string) {
  const app = new Hono();
  const middleware = createServiceJwtMiddleware({ publicKey });
  app.use('/api/reputation/*', middleware);
  app.get('/api/reputation/query', (c) => c.json({ ok: true }));
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createServiceJwtMiddleware', () => {
  it('allows valid ES256 token with correct iss/aud', async () => {
    const app = createTestApp(publicKeyPem);
    const token = await signToken();

    const res = await app.request('/api/reputation/query', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('rejects request without Bearer token', async () => {
    const app = createTestApp(publicKeyPem);

    const res = await app.request('/api/reputation/query');

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
  });

  it('rejects token with wrong issuer', async () => {
    const app = createTestApp(publicKeyPem);
    const token = await signToken({ iss: 'evil-service' });

    const res = await app.request('/api/reputation/query', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain('invalid_claims');
  });

  it('rejects token with wrong audience', async () => {
    const app = createTestApp(publicKeyPem);
    const token = await signToken({ aud: 'wrong-audience' });

    const res = await app.request('/api/reputation/query', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(403);
  });

  it('rejects expired token with 401', async () => {
    const app = createTestApp(publicKeyPem);
    // Set expiration to 1 second in the past (well beyond 30s tolerance)
    const token = await signToken({ exp: Math.floor(Date.now() / 1000) - 60 });

    const res = await app.request('/api/reputation/query', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toContain('expired');
  });

  it('rejects token signed with different key', async () => {
    const app = createTestApp(publicKeyPem);
    const { privateKey: wrongKey } = await jose.generateKeyPair('ES256');
    const token = await signToken({}, wrongKey);

    const res = await app.request('/api/reputation/query', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain('invalid_signature');
  });

  it('rejects malformed token', async () => {
    const app = createTestApp(publicKeyPem);

    const res = await app.request('/api/reputation/query', {
      headers: { authorization: 'Bearer not-a-jwt' },
    });

    expect(res.status).toBe(403);
  });
});
