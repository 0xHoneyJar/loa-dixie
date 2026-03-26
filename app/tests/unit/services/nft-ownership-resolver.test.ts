/**
 * NftOwnershipResolver tests (cycle-022, Sprint 118, T2.5).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NftOwnershipResolver } from '../../../src/services/nft-ownership-resolver.js';

// Mock FinnClient
function createMockFinnClient(responses: Record<string, unknown> = {}) {
  return {
    request: vi.fn(async (_method: string, path: string) => {
      if (responses[path]) return responses[path];
      throw new Error(`Not found: ${path}`);
    }),
  } as any;
}

describe('NftOwnershipResolver', () => {
  let resolver: NftOwnershipResolver;

  describe('resolve()', () => {
    it('returns NFTs from plural endpoint', async () => {
      const finnClient = createMockFinnClient({
        '/api/identity/wallet/0xWallet/nfts': {
          nfts: [
            { nftId: 'nft-1' },
            { nftId: 'nft-2' },
          ],
        },
      });
      resolver = new NftOwnershipResolver(finnClient);

      const result = await resolver.resolve('0xWallet');
      expect(result).toHaveLength(2);
      expect(result[0].nftId).toBe('nft-1');
      expect(result[1].nftId).toBe('nft-2');
    });

    it('falls back to singular endpoint when plural returns 404', async () => {
      const finnClient = createMockFinnClient({
        '/api/identity/wallet/0xWallet/nft': { nftId: 'nft-solo' },
      });
      resolver = new NftOwnershipResolver(finnClient);

      const result = await resolver.resolve('0xWallet');
      expect(result).toHaveLength(1);
      expect(result[0].nftId).toBe('nft-solo');
    });

    it('returns empty array when both endpoints fail', async () => {
      const finnClient = createMockFinnClient({});
      resolver = new NftOwnershipResolver(finnClient);

      const result = await resolver.resolve('0xNoNfts');
      expect(result).toEqual([]);
    });

    it('caches results and avoids duplicate calls', async () => {
      const finnClient = createMockFinnClient({
        '/api/identity/wallet/0xCached/nfts': {
          nfts: [{ nftId: 'cached-1' }],
        },
      });
      resolver = new NftOwnershipResolver(finnClient, 5000);

      await resolver.resolve('0xCached');
      await resolver.resolve('0xCached');
      await resolver.resolve('0xCached');

      expect(finnClient.request).toHaveBeenCalledTimes(1);
    });

    it('caches negative results', async () => {
      const finnClient = createMockFinnClient({});
      resolver = new NftOwnershipResolver(finnClient, 5000, 5000);

      await resolver.resolve('0xEmpty');
      await resolver.resolve('0xEmpty');

      // Plural fails → singular fails → cached. Only 2 calls (plural + singular), not 4.
      expect(finnClient.request).toHaveBeenCalledTimes(2);
    });

    it('normalizes wallet address to lowercase for cache', async () => {
      // The API call uses the original wallet, but the cache key is lowercased.
      // So the first call hits the API, subsequent calls with different casing hit cache.
      const finnClient = createMockFinnClient({
        '/api/identity/wallet/0xMixedCase/nfts': {
          nfts: [{ nftId: 'case-test' }],
        },
      });
      resolver = new NftOwnershipResolver(finnClient, 5000);

      const r1 = await resolver.resolve('0xMixedCase');
      expect(r1).toHaveLength(1);

      // These should hit cache (lowercased key matches)
      const r2 = await resolver.resolve('0xmixedcase');
      const r3 = await resolver.resolve('0xMIXEDCASE');
      expect(r2).toEqual(r1);
      expect(r3).toEqual(r1);

      expect(finnClient.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('resolvePrimary()', () => {
    it('returns first NFT from resolved set', async () => {
      const finnClient = createMockFinnClient({
        '/api/identity/wallet/0xPrimary/nfts': {
          nfts: [{ nftId: 'first' }, { nftId: 'second' }],
        },
      });
      resolver = new NftOwnershipResolver(finnClient);

      const result = await resolver.resolvePrimary('0xPrimary');
      expect(result).toEqual({ nftId: 'first' });
    });

    it('returns null when no NFTs found', async () => {
      const finnClient = createMockFinnClient({});
      resolver = new NftOwnershipResolver(finnClient);

      const result = await resolver.resolvePrimary('0xNone');
      expect(result).toBeNull();
    });
  });

  describe('resolveOwnership()', () => {
    it('returns full ownership data from /ownership endpoint', async () => {
      const finnClient = createMockFinnClient({
        '/api/identity/wallet/0xOwner/ownership': {
          nftId: 'owned-1',
          ownerWallet: '0xOwner',
          delegatedWallets: ['0xDelegate1'],
        },
      });
      resolver = new NftOwnershipResolver(finnClient);

      const result = await resolver.resolveOwnership('0xOwner');
      expect(result).toEqual({
        nftId: 'owned-1',
        ownerWallet: '0xOwner',
        delegatedWallets: ['0xDelegate1'],
      });
    });

    it('returns null when ownership endpoint fails', async () => {
      const finnClient = createMockFinnClient({});
      resolver = new NftOwnershipResolver(finnClient);

      const result = await resolver.resolveOwnership('0xFailed');
      expect(result).toBeNull();
    });
  });

  describe('clearCache()', () => {
    it('clears both positive and negative caches', async () => {
      const finnClient = createMockFinnClient({
        '/api/identity/wallet/0xClear/nfts': {
          nfts: [{ nftId: 'clear-1' }],
        },
      });
      resolver = new NftOwnershipResolver(finnClient, 60000);

      await resolver.resolve('0xClear');
      expect(finnClient.request).toHaveBeenCalledTimes(1);

      resolver.clearCache();

      await resolver.resolve('0xClear');
      expect(finnClient.request).toHaveBeenCalledTimes(2);
    });
  });
});
