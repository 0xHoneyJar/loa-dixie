import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { generateKeyPairSync, createPrivateKey } from 'node:crypto';
import * as jose from 'jose';
import { AllowlistStore } from '../../src/middleware/allowlist.js';
import { createAuthRoutes, resetAuthKeyCache } from '../../src/routes/auth.js';
import { createJwksRoutes, resetJwksCache } from '../../src/routes/jwks.js';
import { createJwtMiddleware } from '../../src/middleware/jwt.js';

let ES256_PRIVATE_PEM: string;

beforeAll(() => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  ES256_PRIVATE_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
});

describe('ES256 auth routes', () => {
  let tmpDir: string;
  let store: AllowlistStore;
  let app: Hono;

  beforeEach(() => {
    resetAuthKeyCache();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dixie-es256-'));
    store = new AllowlistStore(path.join(tmpDir, 'allowlist.json'));
    app = new Hono();
    app.route(
      '/api/auth',
      createAuthRoutes(store, {
        jwtPrivateKey: ES256_PRIVATE_PEM,
        issuer: 'dixie-bff',
        expiresIn: '1h',
        isEs256: true,
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  describe('verify endpoint (ES256)', () => {
    it('verifies ES256 token and returns wallet', async () => {
      const privateKey = createPrivateKey(ES256_PRIVATE_PEM);
      const token = await new jose.SignJWT({ role: 'team' })
        .setProtectedHeader({ alg: 'ES256', kid: 'dixie-es256-v1' })
        .setSubject('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
        .setIssuer('dixie-bff')
        .setExpirationTime('1h')
        .sign(privateKey);

      const res = await app.request('/api/auth/verify', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.wallet).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
      expect(body.role).toBe('team');
    });

    it('rejects HS256 token when ES256 is configured', async () => {
      const secret = new TextEncoder().encode('fake-hs256-secret-at-least-32-chars');
      const token = await new jose.SignJWT({ role: 'team' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
        .setIssuer('dixie-bff')
        .setExpirationTime('1h')
        .sign(secret);

      const res = await app.request('/api/auth/verify', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(401);
    });

    it('rejects token signed with wrong key', async () => {
      const { privateKey: wrongKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
      const token = await new jose.SignJWT({ role: 'team' })
        .setProtectedHeader({ alg: 'ES256' })
        .setSubject('0xWrongSigner')
        .setIssuer('dixie-bff')
        .setExpirationTime('1h')
        .sign(wrongKey);

      const res = await app.request('/api/auth/verify', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(401);
    });
  });
});

describe('ES256 JWT middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use('/api/*', createJwtMiddleware(ES256_PRIVATE_PEM, 'dixie-bff', true));
    app.get('/api/test', (c) => {
      const wallet = c.get('wallet');
      return c.json({ wallet: wallet ?? null });
    });
  });

  it('extracts wallet from valid ES256 token', async () => {
    const privateKey = createPrivateKey(ES256_PRIVATE_PEM);
    const token = await new jose.SignJWT({ role: 'team' })
      .setProtectedHeader({ alg: 'ES256' })
      .setSubject('0xTestWallet123')
      .setIssuer('dixie-bff')
      .setExpirationTime('1h')
      .sign(privateKey);

    const res = await app.request('/api/test', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wallet).toBe('0xTestWallet123');
  });

  it('does not set wallet for invalid ES256 token', async () => {
    const { privateKey: wrongKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const token = await new jose.SignJWT({ role: 'team' })
      .setProtectedHeader({ alg: 'ES256' })
      .setSubject('0xBadWallet')
      .setIssuer('dixie-bff')
      .setExpirationTime('1h')
      .sign(wrongKey);

    const res = await app.request('/api/test', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wallet).toBeNull();
  });

  it('passes through requests without Bearer token', async () => {
    const res = await app.request('/api/test');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wallet).toBeNull();
  });
});

describe('JWKS endpoint', () => {
  let app: Hono;

  beforeEach(() => {
    resetJwksCache();
  });

  it('returns public key in JWKS format when ES256', async () => {
    app = new Hono();
    app.route(
      '/api/auth',
      createJwksRoutes({ jwtPrivateKey: ES256_PRIVATE_PEM, isEs256: true }),
    );

    const res = await app.request('/api/auth/.well-known/jwks.json');
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.keys).toHaveLength(1);
    const key = body.keys[0];
    expect(key.kty).toBe('EC');
    expect(key.crv).toBe('P-256');
    expect(key.kid).toBe('dixie-es256-v1');
    expect(key.use).toBe('sig');
    expect(key.alg).toBe('ES256');
    // Must NOT contain private key component
    expect(key.d).toBeUndefined();
    // Must contain public key components
    expect(key.x).toBeDefined();
    expect(key.y).toBeDefined();
  });

  it('returns empty key set when HS256', async () => {
    app = new Hono();
    app.route(
      '/api/auth',
      createJwksRoutes({ jwtPrivateKey: 'not-a-pem', isEs256: false }),
    );

    const res = await app.request('/api/auth/.well-known/jwks.json');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keys).toHaveLength(0);
  });

  it('JWKS public key can verify ES256 tokens', async () => {
    app = new Hono();
    app.route(
      '/api/auth',
      createJwksRoutes({ jwtPrivateKey: ES256_PRIVATE_PEM, isEs256: true }),
    );

    // Get JWKS
    const jwksRes = await app.request('/api/auth/.well-known/jwks.json');
    const jwks = await jwksRes.json();

    // Import public key from JWKS
    const publicKey = await jose.importJWK(jwks.keys[0], 'ES256');

    // Sign a token with the private key
    const privateKey = createPrivateKey(ES256_PRIVATE_PEM);
    const token = await new jose.SignJWT({ role: 'team' })
      .setProtectedHeader({ alg: 'ES256', kid: 'dixie-es256-v1' })
      .setSubject('0xTestWallet')
      .setIssuer('dixie-bff')
      .setExpirationTime('1h')
      .sign(privateKey);

    // Verify with JWKS-derived public key
    const { payload } = await jose.jwtVerify(token, publicKey, {
      issuer: 'dixie-bff',
    });
    expect(payload.sub).toBe('0xTestWallet');
  });

  it('sets Cache-Control header', async () => {
    app = new Hono();
    app.route(
      '/api/auth',
      createJwksRoutes({ jwtPrivateKey: ES256_PRIVATE_PEM, isEs256: true }),
    );

    const res = await app.request('/api/auth/.well-known/jwks.json');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });
});
