import { describe, it, expect, vi } from 'vitest';
import {
  bgtToTier,
  tierMeetsRequirement,
  tierHasCapability,
  TIER_THRESHOLDS,
  TIER_CAPABILITIES,
  TIER_MODEL_POOLS,
  TIER_ORDER,
} from '../../src/types/conviction.js';
import { ConvictionResolver } from '../../src/services/conviction-resolver.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';
import type { AllowlistStore } from '../../src/middleware/allowlist.js';

// --- Type tests ---

describe('conviction types', () => {
  describe('bgtToTier', () => {
    it('returns observer for 0 BGT', () => {
      expect(bgtToTier(0)).toBe('observer');
    });

    it('returns participant for 1 BGT', () => {
      expect(bgtToTier(1)).toBe('participant');
    });

    it('returns participant for 99 BGT', () => {
      expect(bgtToTier(99)).toBe('participant');
    });

    it('returns builder for 100 BGT', () => {
      expect(bgtToTier(100)).toBe('builder');
    });

    it('returns builder for 999 BGT', () => {
      expect(bgtToTier(999)).toBe('builder');
    });

    it('returns architect for 1000 BGT', () => {
      expect(bgtToTier(1_000)).toBe('architect');
    });

    it('returns architect for 9999 BGT', () => {
      expect(bgtToTier(9_999)).toBe('architect');
    });

    it('returns sovereign for 10000 BGT', () => {
      expect(bgtToTier(10_000)).toBe('sovereign');
    });

    it('returns sovereign for very large BGT', () => {
      expect(bgtToTier(1_000_000)).toBe('sovereign');
    });
  });

  describe('tierMeetsRequirement', () => {
    it('observer meets observer', () => {
      expect(tierMeetsRequirement('observer', 'observer')).toBe(true);
    });

    it('observer does not meet participant', () => {
      expect(tierMeetsRequirement('observer', 'participant')).toBe(false);
    });

    it('sovereign meets all tiers', () => {
      for (const tier of TIER_ORDER) {
        expect(tierMeetsRequirement('sovereign', tier)).toBe(true);
      }
    });

    it('architect meets builder', () => {
      expect(tierMeetsRequirement('architect', 'builder')).toBe(true);
    });

    it('builder does not meet architect', () => {
      expect(tierMeetsRequirement('builder', 'architect')).toBe(false);
    });
  });

  describe('tierHasCapability', () => {
    it('observer has chat', () => {
      expect(tierHasCapability('observer', 'chat')).toBe(true);
    });

    it('observer does not have memory', () => {
      expect(tierHasCapability('observer', 'memory')).toBe(false);
    });

    it('participant has memory', () => {
      expect(tierHasCapability('participant', 'memory')).toBe(true);
    });

    it('builder has scheduling', () => {
      expect(tierHasCapability('builder', 'scheduling')).toBe(true);
    });

    it('builder does not have agent_api', () => {
      expect(tierHasCapability('builder', 'agent_api')).toBe(false);
    });

    it('architect has agent_api', () => {
      expect(tierHasCapability('architect', 'agent_api')).toBe(true);
    });

    it('architect does not have autonomous_mode', () => {
      expect(tierHasCapability('architect', 'autonomous_mode')).toBe(false);
    });

    it('sovereign has autonomous_mode', () => {
      expect(tierHasCapability('sovereign', 'autonomous_mode')).toBe(true);
    });

    it('sovereign has all capabilities', () => {
      expect(TIER_CAPABILITIES['sovereign'].length).toBe(8);
    });
  });

  describe('tier model pools', () => {
    it('observer gets pool_observer', () => {
      expect(TIER_MODEL_POOLS['observer']).toBe('pool_observer');
    });

    it('participant gets pool_standard', () => {
      expect(TIER_MODEL_POOLS['participant']).toBe('pool_standard');
    });

    it('sovereign gets pool_premium', () => {
      expect(TIER_MODEL_POOLS['sovereign']).toBe('pool_premium');
    });
  });
});

// --- Resolver tests ---

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

function mockCache() {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: vi.fn().mockImplementation((key: string, val: unknown) => {
      store.set(key, val);
      return Promise.resolve();
    }),
    invalidate: vi.fn().mockImplementation((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    _store: store,
  };
}

describe('ConvictionResolver', () => {
  it('resolves tier from freeside API', async () => {
    const finnClient = mockFinnClient({
      '/api/conviction/0xabc123/staking': { wallet: '0xabc123', bgtStaked: 500 },
    });
    const resolver = new ConvictionResolver(finnClient, null, null);

    const result = await resolver.resolve('0xabc123');
    expect(result.tier).toBe('builder');
    expect(result.bgtStaked).toBe(500);
    expect(result.source).toBe('freeside');
    expect(result.capabilities).toContain('scheduling');
  });

  it('falls back to legacy allowlist when freeside fails', async () => {
    const finnClient = mockFinnClient(); // no responses — all fail
    const allowlist = mockAllowlistStore(['0xabc123']);
    const resolver = new ConvictionResolver(finnClient, null, allowlist);

    const result = await resolver.resolve('0xabc123');
    expect(result.tier).toBe('architect');
    expect(result.source).toBe('legacy_allowlist');
    expect(result.capabilities).toContain('agent_api');
  });

  it('returns observer when both freeside and allowlist fail', async () => {
    const finnClient = mockFinnClient();
    const allowlist = mockAllowlistStore();
    const resolver = new ConvictionResolver(finnClient, null, allowlist);

    const result = await resolver.resolve('0xunknown');
    expect(result.tier).toBe('observer');
    expect(result.source).toBe('default');
  });

  it('returns observer for empty wallet', async () => {
    const finnClient = mockFinnClient();
    const resolver = new ConvictionResolver(finnClient, null, null);

    const result = await resolver.resolve('');
    expect(result.tier).toBe('observer');
    expect(result.source).toBe('default');
  });

  it('admin wallets always get sovereign', async () => {
    const finnClient = mockFinnClient();
    const resolver = new ConvictionResolver(finnClient, null, null, new Set(['0xadmin']));

    const result = await resolver.resolve('0xadmin');
    expect(result.tier).toBe('sovereign');
    expect(result.source).toBe('admin');
    expect(result.capabilities).toContain('autonomous_mode');
  });

  it('caches freeside results', async () => {
    const finnClient = mockFinnClient({
      '/api/conviction/0xabc/staking': { wallet: '0xabc', bgtStaked: 5000 },
    });
    const cache = mockCache();
    const resolver = new ConvictionResolver(finnClient, cache as never, null);

    // First call — fetches from freeside
    const result1 = await resolver.resolve('0xabc');
    expect(result1.tier).toBe('architect');
    expect(finnClient.request).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledTimes(1);

    // Second call — hits cache
    const result2 = await resolver.resolve('0xabc');
    expect(result2.tier).toBe('architect');
    expect(finnClient.request).toHaveBeenCalledTimes(1); // Not called again
  });

  it('invalidates cached conviction', async () => {
    const cache = mockCache();
    cache._store.set('0xabc', { tier: 'builder', source: 'freeside' });
    const finnClient = mockFinnClient();
    const resolver = new ConvictionResolver(finnClient, cache as never, null);

    await resolver.invalidate('0xabc');
    expect(cache.invalidate).toHaveBeenCalledWith('0xabc');
  });

  it('hasCapability checks tier capabilities', async () => {
    const finnClient = mockFinnClient({
      '/api/conviction/0xabc/staking': { wallet: '0xabc', bgtStaked: 200 },
    });
    const resolver = new ConvictionResolver(finnClient, null, null);

    expect(await resolver.hasCapability('0xabc', 'scheduling')).toBe(true);
    expect(await resolver.hasCapability('0xabc', 'agent_api')).toBe(false);
  });
});
