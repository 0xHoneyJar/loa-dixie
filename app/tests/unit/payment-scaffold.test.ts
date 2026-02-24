import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createPaymentGate } from '../../src/middleware/payment.js';

describe('payment scaffold', () => {
  it('passes through when x402 disabled (default)', async () => {
    const app = new Hono();
    app.use('*', createPaymentGate());
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Payment-Status')).toBeNull();
  });

  it('passes through when x402 explicitly disabled', async () => {
    const app = new Hono();
    app.use('*', createPaymentGate({ x402Enabled: false }));
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Payment-Status')).toBeNull();
  });

  it('sets X-Payment-Status header when x402 enabled', async () => {
    const app = new Hono();
    app.use('*', createPaymentGate({ x402Enabled: true }));
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Payment-Status')).toBe('scaffold');
  });
});
