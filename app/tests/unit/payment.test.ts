import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createPaymentGate } from '../../src/middleware/payment.js';
import type { PaymentRail, PaymentContext } from '../../src/middleware/payment.js';

describe('createPaymentGate', () => {
  it('passes through without blocking when disabled', async () => {
    const app = new Hono();
    app.use('*', createPaymentGate());
    app.get('/test', (c) => c.text('ok'));

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('sets X-Payment-Rail header when enabled', async () => {
    const app = new Hono();
    app.use('*', createPaymentGate({ x402Enabled: true }));
    app.get('/test', (c) => c.text('ok'));

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-payment-rail')).toBe('x402');
    expect(res.headers.get('x-payment-status')).toBe('scaffold');
  });

  it('does not set payment headers when disabled', async () => {
    const app = new Hono();
    app.use('*', createPaymentGate({ x402Enabled: false }));
    app.get('/test', (c) => c.text('ok'));

    const res = await app.request('/test');
    expect(res.headers.get('x-payment-rail')).toBeNull();
    expect(res.headers.get('x-payment-status')).toBeNull();
  });

  it('PaymentRail type supports expected rails', () => {
    const rails: PaymentRail[] = ['x402', 'nowpayments', 'stripe-connect', 'conviction-gated'];
    expect(rails).toHaveLength(4);
  });

  it('PaymentContext type has correct shape', () => {
    const ctx: PaymentContext = {
      rail: 'x402',
      currency: 'micro-usd',
      wallet: '0xabc',
      communityId: 'community-1',
    };
    expect(ctx.rail).toBe('x402');
    expect(ctx.currency).toBe('micro-usd');
  });
});
