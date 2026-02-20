import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as jose from 'jose';
import { AllowlistStore } from '../../src/middleware/allowlist.js';
import { createAuthRoutes } from '../../src/routes/auth.js';

const JWT_SECRET = 'test-jwt-secret-at-least-32-chars!!';

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
});
