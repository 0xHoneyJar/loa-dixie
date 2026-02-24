import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createPrivateKey } from 'node:crypto';
import * as jose from 'jose';
import { AllowlistStore } from '../../src/middleware/allowlist.js';
import { createAuthRoutes, resetAuthKeyCache } from '../../src/routes/auth.js';

const JWT_SECRET = 'test-jwt-secret-at-least-32-chars!!';

// Test EC P-256 keys — generated for test fixtures only
const ES256_KEY_CURRENT = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg+EHKW5vbwJKQllrg
2RPvEdz9xF42k3aPfKpZPJOvw7ihRANCAARaF5eERqgje5jIAfIhFEsK8BGq5Rvb
opOLESxXI7KYXZMNXlipr5GQDyroynuJcJQsZ/nHwy2OzCP51xVmnA6E
-----END PRIVATE KEY-----`;

const ES256_KEY_PREVIOUS = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg3a6lrVqlvR3eLekg
tGKprC/ielfTbf8agGfuMuK1L/WhRANCAATpH0/mz720oc/GYcQ83Nankhtkffnl
9BkyoqbulSWmqYZhppesk+jRkwW1Tj/b7Lsb3UCethFf2RZefIerlGiE
-----END PRIVATE KEY-----`;

describe('auth routes', () => {
  let tmpDir: string;
  let store: AllowlistStore;
  let app: Hono;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dixie-test-'));
    store = new AllowlistStore(path.join(tmpDir, 'allowlist.json'));
    app = new Hono();
    app.route(
      '/api/auth',
      createAuthRoutes(store, {
        jwtPrivateKey: JWT_SECRET,
        issuer: 'dixie-bff',
        expiresIn: '1h',
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns 400 for missing message or signature', async () => {
    const res = await app.request('/api/auth/siwe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid SIWE signature', async () => {
    const res = await app.request('/api/auth/siwe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: 'invalid siwe message',
        signature: '0xdeadbeef',
      }),
    });
    expect(res.status).toBe(401);
  });

  describe('verify endpoint', () => {
    it('returns 401 without token', async () => {
      const res = await app.request('/api/auth/verify');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await app.request('/api/auth/verify', {
        headers: { authorization: 'Bearer invalid.token.here' },
      });
      expect(res.status).toBe(401);
    });

    it('verifies valid JWT and returns wallet', async () => {
      // Create a valid JWT manually
      const secret = new TextEncoder().encode(JWT_SECRET);
      const token = await new jose.SignJWT({ role: 'team' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
        .setIssuer('dixie-bff')
        .setExpirationTime('1h')
        .sign(secret);

      const res = await app.request('/api/auth/verify', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.wallet).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
      expect(body.role).toBe('team');
    });

    it('rejects expired JWT', async () => {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const token = await new jose.SignJWT({ role: 'team' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
        .setIssuer('dixie-bff')
        .setExpirationTime(0) // already expired
        .sign(secret);

      const res = await app.request('/api/auth/verify', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('ES256 verify with key rotation', () => {
    let es256App: Hono;

    beforeEach(() => {
      resetAuthKeyCache();
      es256App = new Hono();
      es256App.route(
        '/api/auth',
        createAuthRoutes(store, {
          jwtPrivateKey: ES256_KEY_CURRENT,
          issuer: 'dixie-bff',
          expiresIn: '1h',
          isEs256: true,
          previousEs256Key: ES256_KEY_PREVIOUS,
        }),
      );
    });

    afterEach(() => {
      resetAuthKeyCache();
    });

    it('verifies token signed with current ES256 key', async () => {
      const privateKey = createPrivateKey(ES256_KEY_CURRENT);
      const token = await new jose.SignJWT({ role: 'team' })
        .setProtectedHeader({ alg: 'ES256', kid: 'dixie-es256-v1' })
        .setSubject('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
        .setIssuer('dixie-bff')
        .setExpirationTime('1h')
        .sign(privateKey);

      const res = await es256App.request('/api/auth/verify', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.wallet).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
      expect(body.role).toBe('team');
    });

    it('verifies token signed with previous ES256 key (rotation grace)', async () => {
      const previousKey = createPrivateKey(ES256_KEY_PREVIOUS);
      const token = await new jose.SignJWT({ role: 'team' })
        .setProtectedHeader({ alg: 'ES256', kid: 'dixie-es256-v0' })
        .setSubject('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')
        .setIssuer('dixie-bff')
        .setExpirationTime('1h')
        .sign(previousKey);

      const res = await es256App.request('/api/auth/verify', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.wallet).toBe('0xABCDEF1234567890ABCDEF1234567890ABCDEF12');
    });

    it('rejects token signed with unknown ES256 key', async () => {
      // Generate a third key not known to the app
      const { privateKey } = await jose.generateKeyPair('ES256');
      const token = await new jose.SignJWT({ role: 'team' })
        .setProtectedHeader({ alg: 'ES256' })
        .setSubject('0x0000000000000000000000000000000000000000')
        .setIssuer('dixie-bff')
        .setExpirationTime('1h')
        .sign(privateKey);

      const res = await es256App.request('/api/auth/verify', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(401);
    });

    it('falls back to HS256 when configured', async () => {
      resetAuthKeyCache();
      const fallbackApp = new Hono();
      fallbackApp.route(
        '/api/auth',
        createAuthRoutes(store, {
          jwtPrivateKey: ES256_KEY_CURRENT,
          issuer: 'dixie-bff',
          expiresIn: '1h',
          isEs256: true,
          hs256FallbackSecret: JWT_SECRET,
        }),
      );

      // Sign with HS256 secret
      const secret = new TextEncoder().encode(JWT_SECRET);
      const token = await new jose.SignJWT({ role: 'team' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
        .setIssuer('dixie-bff')
        .setExpirationTime('1h')
        .sign(secret);

      const res = await fallbackApp.request('/api/auth/verify', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.wallet).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    });
  });
});
