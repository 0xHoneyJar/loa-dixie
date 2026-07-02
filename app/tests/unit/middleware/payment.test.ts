/**
 * Payment gate middleware tests (cycle-022, Sprint 119, T3.9).
 */
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createPaymentGate, _isProtectedRoute, FREE_ROUTE_POLICY, type PaymentGateConfig } from '../../../src/middleware/payment.js';

function createTestApp(config?: PaymentGateConfig) {
  const app = new Hono();
  app.use('/api/*', createPaymentGate(config));
  app.get('/api/chat', (c) => c.json({ ok: true }));
  app.get('/api/health', (c) => c.json({ ok: true }));
  app.get('/api/admin/status', (c) => c.json({ ok: true }));
  app.get('/api/auth/.well-known/jwks.json', (c) => c.json({ keys: [] }));
  app.post('/api/agent/query', (c) => c.json({ ok: true }));
  app.post('/api/fleet/spawn', (c) => c.json({ ok: true }));
  app.get('/api/reputation/query', (c) => c.json({ ok: true }));
  return app;
}

describe('createPaymentGate', () => {
  describe('disabled (default)', () => {
    it('passes through all requests when x402 disabled', async () => {
      const app = createTestApp();
      const res = await app.request('/api/chat');
      expect(res.status).toBe(200);
    });

    it('passes through when no config provided', async () => {
      const app = createTestApp(undefined);
      const res = await app.request('/api/chat');
      expect(res.status).toBe(200);
    });
  });

  describe('enabled', () => {
    const config: PaymentGateConfig = {
      x402Enabled: true,
      x402FacilitatorUrl: 'https://freeside.example.com',
      nodeEnv: 'production',
      validatePaymentHeader: async () => true,
    };

    it('returns 402 for protected route without payment header', async () => {
      const app = createTestApp(config);
      const res = await app.request('/api/chat');
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error).toBe('payment_required');
      expect(body.facilitator).toBe('https://freeside.example.com');
    });

    it('passes through protected route with payment header', async () => {
      const app = createTestApp(config);
      const res = await app.request('/api/chat', {
        headers: { 'x-payment': 'valid-payment-token' },
      });
      expect(res.status).toBe(200);
    });

    it('passes through protected route with x-402-payment header', async () => {
      const app = createTestApp(config);
      const res = await app.request('/api/chat', {
        headers: { 'x-402-payment': 'valid-payment-token' },
      });
      expect(res.status).toBe(200);
    });

    it('returns 402 when payment header validation fails', async () => {
      const app = createTestApp({
        ...config,
        validatePaymentHeader: async () => false,
      });
      const res = await app.request('/api/chat', {
        headers: { 'x-payment': 'invalid-payment-token' },
      });
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error).toBe('invalid_payment');
    });

    it('returns 503 when payment header validation is unavailable', async () => {
      const app = createTestApp({
        ...config,
        validatePaymentHeader: async () => {
          throw new Error('validator unavailable');
        },
      });
      const res = await app.request('/api/chat', {
        headers: { 'x-payment': 'payment-token' },
      });
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe('payment_validation_unavailable');
    });

    it('fails closed in production when no validator is configured', () => {
      expect(() => createTestApp({
        x402Enabled: true,
        x402FacilitatorUrl: 'https://freeside.example.com',
        nodeEnv: 'production',
      })).toThrow(/validatePaymentHeader/);
    });

    it('allows free routes without payment', async () => {
      const app = createTestApp(config);

      const health = await app.request('/api/health');
      expect(health.status).toBe(200);

      const admin = await app.request('/api/admin/status');
      expect(admin.status).toBe(200);

      const reputation = await app.request('/api/reputation/query');
      expect(reputation.status).toBe(200);
    });

    it('requires payment for /api/agent/query', async () => {
      const app = createTestApp(config);
      const res = await app.request('/api/agent/query', { method: 'POST' });
      expect(res.status).toBe(402);
    });

    it('requires payment for /api/fleet/spawn', async () => {
      const app = createTestApp(config);
      const res = await app.request('/api/fleet/spawn', { method: 'POST' });
      expect(res.status).toBe(402);
    });
  });
});

describe('isProtectedRoute', () => {
  it('identifies protected routes', () => {
    expect(_isProtectedRoute('/api/chat')).toBe(true);
    expect(_isProtectedRoute('/api/chat/stream')).toBe(true);
    expect(_isProtectedRoute('/api/agent/query')).toBe(true);
    expect(_isProtectedRoute('/api/fleet/spawn')).toBe(true);
  });

  it('identifies free routes', () => {
    expect(_isProtectedRoute('/api/health')).toBe(false);
    expect(_isProtectedRoute('/api/health/governance')).toBe(false);
    expect(_isProtectedRoute('/api/auth/siwe')).toBe(false);
    expect(_isProtectedRoute('/api/admin/allowlist')).toBe(false);
    expect(_isProtectedRoute('/api/identity/oracle')).toBe(false);
    expect(_isProtectedRoute('/api/reputation/query')).toBe(false);
  });

  describe('route-boundary matching (issue #208)', () => {
    it('keeps near-prefix paths protected', () => {
      expect(_isProtectedRoute('/api/healthzzz')).toBe(true);
      expect(_isProtectedRoute('/api/health-check')).toBe(true);
      expect(_isProtectedRoute('/api/administrator')).toBe(true);
      expect(_isProtectedRoute('/api/identityX')).toBe(true);
      expect(_isProtectedRoute('/api/reputations')).toBe(true);
      expect(_isProtectedRoute('/api/authors/1')).toBe(true);
    });

    it('treats the exact free path and trailing-slash variants as free', () => {
      expect(_isProtectedRoute('/api/health/')).toBe(false);
      expect(_isProtectedRoute('/api/admin')).toBe(false);
      expect(_isProtectedRoute('/api/admin/')).toBe(false);
      expect(_isProtectedRoute('/api/identity')).toBe(false);
    });

    it('normalizes duplicate slashes and dot segments before matching', () => {
      expect(_isProtectedRoute('//api//health')).toBe(false);
      expect(_isProtectedRoute('/api/./health')).toBe(false);
      // Traversal that resolves INTO a protected route stays protected
      expect(_isProtectedRoute('/api/health/../chat')).toBe(true);
      expect(_isProtectedRoute('/api/admin/../agent/query')).toBe(true);
    });

    it('percent-decodes before matching', () => {
      expect(_isProtectedRoute('/api/%68ealth')).toBe(false);
      // Encoded traversal into a protected route stays protected
      expect(_isProtectedRoute('/api/health/%2e%2e/chat')).toBe(true);
    });

    it('fails closed on unclassifiable paths', () => {
      expect(_isProtectedRoute('/api/%zz')).toBe(true);
      expect(_isProtectedRoute('/api/health%00')).toBe(true);
    });
  });
});

describe('FREE_ROUTE_POLICY (issues #206, #230)', () => {
  it('documents a reason for every payment-free prefix', () => {
    expect(FREE_ROUTE_POLICY.length).toBeGreaterThan(0);
    for (const entry of FREE_ROUTE_POLICY) {
      expect(entry.prefix.startsWith('/')).toBe(true);
      expect(entry.reason.length).toBeGreaterThan(10);
    }
  });

  it('documents at least one independent guard for every payment-free prefix', () => {
    for (const entry of FREE_ROUTE_POLICY) {
      expect(entry.guards.length).toBeGreaterThan(0);
    }
  });

  it('is the single source for payment exemption', () => {
    for (const entry of FREE_ROUTE_POLICY) {
      const representative = entry.prefix.endsWith('/')
        ? `${entry.prefix}representative`
        : entry.prefix;
      expect(_isProtectedRoute(representative)).toBe(false);
    }
  });
});
