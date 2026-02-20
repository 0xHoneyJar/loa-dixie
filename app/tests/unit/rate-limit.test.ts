import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createRateLimit } from '../../src/middleware/rate-limit.js';

describe('rate limit middleware', () => {
  it('allows requests under the limit', async () => {
    const app = new Hono();
    app.use('/api/*', createRateLimit(5));
    app.get('/api/test', (c) => c.text('ok'));

    for (let i = 0; i < 5; i++) {
      const res = await app.request('/api/test');
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 when limit exceeded', async () => {
    const app = new Hono();
    app.use('/api/*', createRateLimit(3));
    app.get('/api/test', (c) => c.text('ok'));

    // First 3 requests succeed
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/api/test');
      expect(res.status).toBe(200);
    }

    // 4th request should be rate limited
    const res = await app.request('/api/test');
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('rate_limited');
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('includes Retry-After header', async () => {
    const app = new Hono();
    app.use('/api/*', createRateLimit(1));
    app.get('/api/test', (c) => c.text('ok'));

    await app.request('/api/test'); // exhaust limit
    const res = await app.request('/api/test');
    expect(res.status).toBe(429);
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '0', 10);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });
});
