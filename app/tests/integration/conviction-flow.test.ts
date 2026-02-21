import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { createConvictionTierMiddleware } from '../../src/middleware/conviction-tier.js';
import { ConvictionResolver } from '../../src/services/conviction-resolver.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';
import type { AllowlistStore } from '../../src/middleware/allowlist.js';

function mockFinnClient(responses?: Record<string, unknown>) {
  return {
    request: vi.fn().mockImplementation((_method: string, path: string) => {
      if (responses && responses[path]) {
        return Promise.resolve(responses[path]);
      }
      return Promise.reject(new Error('Not found'));
    }),
  } as unknown as FinnClient;
}

function mockAllowlistStore(wallets: string[] = []) {
  return {
    hasWallet: vi.fn().mockImplementation((w: string) => wallets.includes(w.toLowerCase())),
  } as unknown as AllowlistStore;
}

function createTestApp(resolver: ConvictionResolver) {
  const app = new Hono();

  app.use('*', createConvictionTierMiddleware(resolver));

  // Test route that reads conviction headers
  app.get('/test', (c) => {
    return c.json({
      tier: c.req.header('x-conviction-tier'),
      modelPool: c.req.header('x-model-pool'),
      source: c.req.header('x-conviction-source'),
    });
  });

  return app;
}

describe('conviction flow integration', () => {
  it('resolves freeside tier and propagates via headers', async () => {
    const finnClient = mockFinnClient({
      '/api/conviction/0xabc123/staking': { wallet: '0xabc123', bgtStaked: 5000 },
    });
    const resolver = new ConvictionResolver(finnClient, null, null);
    const app = createTestApp(resolver);

    const res = await app.request('/test', {
      headers: { 'x-wallet-address': '0xabc123' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('x-conviction-tier')).toBe('architect');

    const body = await res.json() as { tier: string; modelPool: string; source: string };
    expect(body.tier).toBe('architect');
    expect(body.modelPool).toBe('pool_premium');
    expect(body.source).toBe('freeside');
  });

  it('falls back to legacy allowlist tier', async () => {
    const finnClient = mockFinnClient(); // all fail
    const allowlist = mockAllowlistStore(['0xlegacy']);
    const resolver = new ConvictionResolver(finnClient, null, allowlist);
    const app = createTestApp(resolver);

    const res = await app.request('/test', {
      headers: { 'x-wallet-address': '0xlegacy' },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { tier: string; source: string };
    expect(body.tier).toBe('architect');
    expect(body.source).toBe('legacy_allowlist');
  });

  it('defaults to observer when no wallet', async () => {
    const finnClient = mockFinnClient();
    const resolver = new ConvictionResolver(finnClient, null, null);
    const app = createTestApp(resolver);

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-conviction-tier')).toBe('observer');

    const body = await res.json() as { tier: string; source: string };
    expect(body.tier).toBe('observer');
    expect(body.source).toBe('default');
  });

  it('sovereign tier resolves for high BGT staker', async () => {
    const finnClient = mockFinnClient({
      '/api/conviction/0xwhale/staking': { wallet: '0xwhale', bgtStaked: 50000 },
    });
    const resolver = new ConvictionResolver(finnClient, null, null);
    const app = createTestApp(resolver);

    const res = await app.request('/test', {
      headers: { 'x-wallet-address': '0xwhale' },
    });

    const body = await res.json() as { tier: string; modelPool: string };
    expect(body.tier).toBe('sovereign');
    expect(body.modelPool).toBe('pool_premium');
  });

  it('observer tier for unknown wallet with freeside failure', async () => {
    const finnClient = mockFinnClient();
    const allowlist = mockAllowlistStore();
    const resolver = new ConvictionResolver(finnClient, null, allowlist);
    const app = createTestApp(resolver);

    const res = await app.request('/test', {
      headers: { 'x-wallet-address': '0xunknown' },
    });

    const body = await res.json() as { tier: string; source: string };
    expect(body.tier).toBe('observer');
    expect(body.source).toBe('default');
  });

  it('response header X-Conviction-Tier is set on response', async () => {
    const finnClient = mockFinnClient({
      '/api/conviction/0xabc/staking': { wallet: '0xabc', bgtStaked: 100 },
    });
    const resolver = new ConvictionResolver(finnClient, null, null);
    const app = createTestApp(resolver);

    const res = await app.request('/test', {
      headers: { 'x-wallet-address': '0xabc' },
    });

    expect(res.headers.get('x-conviction-tier')).toBe('builder');
  });
});
