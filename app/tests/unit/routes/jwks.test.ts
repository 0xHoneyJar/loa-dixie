/**
 * JWKS endpoint tests (cycle-022, Sprint 117, T1.6).
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Hono } from 'hono';
import * as jose from 'jose';
import { createJwksRoutes } from '../../../src/routes/jwks.js';
import { initJwtKeys, _resetJwtKeys } from '../../../src/middleware/jwt.js';

let privateKeyPem: string;

beforeAll(async () => {
  const { privateKey } = await jose.generateKeyPair('ES256', { extractable: true });
  privateKeyPem = await jose.exportPKCS8(privateKey);
});

afterEach(() => {
  _resetJwtKeys();
});

function createTestApp() {
  const app = new Hono();
  app.route('/api/auth', createJwksRoutes());
  return app;
}

describe('JWKS endpoint', () => {
  it('returns JWK Set with Cache-Control header in ES256 mode', async () => {
    await initJwtKeys({
      jwtPrivateKey: privateKeyPem,
      jwtAlgorithm: 'ES256',
      issuer: 'dixie-bff',
    });

    const app = createTestApp();
    const res = await app.request('/api/auth/.well-known/jwks.json');

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('max-age=3600, public');

    const body = await res.json();
    expect(body.keys).toHaveLength(1);
    expect(body.keys[0].kty).toBe('EC');
    expect(body.keys[0].alg).toBe('ES256');
    expect(body.keys[0].use).toBe('sig');
    expect(body.keys[0].kid).toBeDefined();
    expect(body.keys[0].d).toBeUndefined(); // no private component
  });

  it('returns empty keys array in HS256 mode', async () => {
    await initJwtKeys({
      jwtPrivateKey: 'a-very-long-test-secret-that-is-at-least-32-chars!!',
      jwtAlgorithm: 'HS256',
      issuer: 'dixie-bff',
    });

    const app = createTestApp();
    const res = await app.request('/api/auth/.well-known/jwks.json');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keys).toHaveLength(0);
  });

  it('JWK from endpoint can verify ES256-signed tokens', async () => {
    await initJwtKeys({
      jwtPrivateKey: privateKeyPem,
      jwtAlgorithm: 'ES256',
      issuer: 'dixie-bff',
    });

    const app = createTestApp();
    const res = await app.request('/api/auth/.well-known/jwks.json');
    const body = await res.json();
    const jwk = body.keys[0];

    // Sign a token with the private key
    const privKey = await jose.importPKCS8(privateKeyPem, 'ES256');
    const token = await new jose.SignJWT({ role: 'team' })
      .setProtectedHeader({ alg: 'ES256', kid: jwk.kid })
      .setSubject('0xVerifyWallet')
      .setIssuer('dixie-bff')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privKey);

    // Verify using the JWK from the endpoint
    const pubKey = await jose.importJWK(jwk, 'ES256');
    const { payload } = await jose.jwtVerify(token, pubKey, { issuer: 'dixie-bff' });
    expect(payload.sub).toBe('0xVerifyWallet');
  });
});
