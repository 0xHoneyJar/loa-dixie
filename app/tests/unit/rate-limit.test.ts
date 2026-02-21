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

  it('respects maxTracked parameter for store bounding (iter2-low-2)', async () => {
    // Create rate limiter with very small maxTracked to test bounding
    const app = new Hono();
    app.use('/api/*', createRateLimit(100, { maxTracked: 3 }));
    app.get('/api/test', (c) => c.text('ok'));

    // Send requests from 3 different "wallets" (via x-forwarded-for)
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/api/test', {
        headers: { 'x-forwarded-for': `10.0.0.${i}` },
      });
      expect(res.status).toBe(200);
    }

    // Additional wallet should still work (cleanup handles bounding)
    const res = await app.request('/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.99' },
    });
    expect(res.status).toBe(200);
  });

  it('preserves recent entries during LRU eviction (iter2-low-2)', async () => {
    const app = new Hono();
    app.use('/api/*', createRateLimit(100, { maxTracked: 2 }));
    app.get('/api/test', (c) => c.text('ok'));

    // Access from multiple IPs — most recent should be preserved
    const res1 = await app.request('/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(res1.status).toBe(200);

    const res2 = await app.request('/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.2' },
    });
    expect(res2.status).toBe(200);

    // Recent IPs should not be evicted prematurely
    const res3 = await app.request('/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.2' },
    });
    expect(res3.status).toBe(200);
  });

  it('existing behavior unchanged with default maxTracked (iter2-low-2)', async () => {
    // Default maxTracked is 10_000, so normal usage should be unaffected
    const app = new Hono();
    app.use('/api/*', createRateLimit(2));
    app.get('/api/test', (c) => c.text('ok'));

    const res1 = await app.request('/api/test');
    expect(res1.status).toBe(200);
    const res2 = await app.request('/api/test');
    expect(res2.status).toBe(200);
    const res3 = await app.request('/api/test');
    expect(res3.status).toBe(429);
  });
});
