import { describe, it, expect, beforeEach } from 'vitest';
import { createJwksRoutes, resetJwksCache } from '../../src/routes/jwks.js';
import { Hono } from 'hono';

// Test EC P-256 keys — generated for test fixtures only
const TEST_KEY_CURRENT = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg+EHKW5vbwJKQllrg
2RPvEdz9xF42k3aPfKpZPJOvw7ihRANCAARaF5eERqgje5jIAfIhFEsK8BGq5Rvb
opOLESxXI7KYXZMNXlipr5GQDyroynuJcJQsZ/nHwy2OzCP51xVmnA6E
-----END PRIVATE KEY-----`;

const TEST_KEY_PREVIOUS = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg3a6lrVqlvR3eLekg
tGKprC/ielfTbf8agGfuMuK1L/WhRANCAATpH0/mz720oc/GYcQ83Nankhtkffnl
9BkyoqbulSWmqYZhppesk+jRkwW1Tj/b7Lsb3UCethFf2RZefIerlGiE
-----END PRIVATE KEY-----`;

describe('JWKS routes', () => {
  beforeEach(() => {
    resetJwksCache();
  });

  it('returns empty key set when isEs256 is false', async () => {
    const app = new Hono();
    app.route('/auth', createJwksRoutes({
      jwtPrivateKey: 'not-a-pem-key',
      isEs256: false,
    }));

    const res = await app.request('/auth/.well-known/jwks.json');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keys).toEqual([]);
  });

  it('returns single key when isEs256 with no previous key', async () => {
    const app = new Hono();
    app.route('/auth', createJwksRoutes({
      jwtPrivateKey: TEST_KEY_CURRENT,
      isEs256: true,
    }));

    const res = await app.request('/auth/.well-known/jwks.json');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keys).toHaveLength(1);
    expect(body.keys[0].kid).toBe('dixie-es256-v1');
    expect(body.keys[0].alg).toBe('ES256');
    expect(body.keys[0].use).toBe('sig');
    expect(body.keys[0].kty).toBe('EC');
    expect(body.keys[0].crv).toBe('P-256');
  });

  it('returns two keys during rotation (current + previous)', async () => {
    const app = new Hono();
    app.route('/auth', createJwksRoutes({
      jwtPrivateKey: TEST_KEY_CURRENT,
      isEs256: true,
      jwtPreviousKey: TEST_KEY_PREVIOUS,
    }));

    const res = await app.request('/auth/.well-known/jwks.json');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keys).toHaveLength(2);

    // Current key
    expect(body.keys[0].kid).toBe('dixie-es256-v1');
    expect(body.keys[0].alg).toBe('ES256');

    // Previous key
    expect(body.keys[1].kid).toBe('dixie-es256-v0');
    expect(body.keys[1].alg).toBe('ES256');

    // Keys should have different public coordinates
    expect(body.keys[0].x).not.toBe(body.keys[1].x);
  });

  it('sets Cache-Control header for ES256 response', async () => {
    const app = new Hono();
    app.route('/auth', createJwksRoutes({
      jwtPrivateKey: TEST_KEY_CURRENT,
      isEs256: true,
    }));

    const res = await app.request('/auth/.well-known/jwks.json');
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
  });

  it('does not set Cache-Control when HS256 (empty key set)', async () => {
    const app = new Hono();
    app.route('/auth', createJwksRoutes({
      jwtPrivateKey: 'not-a-pem-key',
      isEs256: false,
    }));

    const res = await app.request('/auth/.well-known/jwks.json');
    expect(res.headers.get('cache-control')).toBeNull();
  });

  it('caches JWKS response across requests', async () => {
    const app = new Hono();
    app.route('/auth', createJwksRoutes({
      jwtPrivateKey: TEST_KEY_CURRENT,
      isEs256: true,
    }));

    const res1 = await app.request('/auth/.well-known/jwks.json');
    const body1 = await res1.json();
    const res2 = await app.request('/auth/.well-known/jwks.json');
    const body2 = await res2.json();

    // Same key coordinates — served from cache
    expect(body1.keys[0].x).toBe(body2.keys[0].x);
    expect(body1.keys[0].y).toBe(body2.keys[0].y);
  });
});
