import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createPaymentGate } from '../../src/middleware/payment.js';

describe('createPaymentGate', () => {
  it('passes through without blocking', async () => {
    const app = new Hono();
    app.use('*', createPaymentGate());
    app.get('/test', (c) => c.text('ok'));

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });
});
