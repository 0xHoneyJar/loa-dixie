import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NftOwnershipResolver } from '../../src/services/nft-ownership-resolver.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';

function createMockFinnClient() {
  return {
    request: vi.fn(),
  } as unknown as FinnClient;
}

describe('NftOwnershipResolver', () => {
  let finnClient: ReturnType<typeof createMockFinnClient>;
  let resolver: NftOwnershipResolver;

  beforeEach(() => {
    finnClient = createMockFinnClient();
    resolver = new NftOwnershipResolver(finnClient);
  });

  describe('resolveNftId', () => {
    it('returns nftId from loa-finn identity graph', async () => {
      (finnClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ nftId: 'nft-42' });
      const result = await resolver.resolveNftId('0xWallet123');
      expect(result).toBe('nft-42');
      expect(finnClient.request).toHaveBeenCalledWith(
        'GET',
        '/api/identity/wallet/0xWallet123/nft',
      );
    });

    it('returns null when wallet has no NFT', async () => {
      (finnClient.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('404'));
      const result = await resolver.resolveNftId('0xNoNft');
      expect(result).toBeNull();
    });

    it('URL-encodes wallet address', async () => {
      (finnClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ nftId: 'nft-1' });
      await resolver.resolveNftId('0x special+chars');
      expect(finnClient.request).toHaveBeenCalledWith(
        'GET',
        '/api/identity/wallet/0x%20special%2Bchars/nft',
      );
    });
  });

  describe('resolveOwnership', () => {
    it('returns { nftId } from loa-finn', async () => {
      (finnClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ nftId: 'nft-99' });
      const result = await resolver.resolveOwnership('0xWallet');
      expect(result).toEqual({ nftId: 'nft-99' });
    });

    it('returns null on error', async () => {
      (finnClient.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('500'));
      const result = await resolver.resolveOwnership('0xBadWallet');
      expect(result).toBeNull();
    });
  });

  describe('resolveFullOwnership', () => {
    it('returns full ownership info with delegation', async () => {
      const ownership = {
        nftId: 'nft-1',
        ownerWallet: '0xOwner',
        delegatedWallets: ['0xDelegate1', '0xDelegate2'],
      };
      (finnClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ownership);
      const result = await resolver.resolveFullOwnership('0xOwner');
      expect(result).toEqual(ownership);
      expect(finnClient.request).toHaveBeenCalledWith(
        'GET',
        '/api/identity/wallet/0xOwner/ownership',
      );
    });

    it('returns null on error', async () => {
      (finnClient.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'));
      const result = await resolver.resolveFullOwnership('0xDisconnected');
      expect(result).toBeNull();
    });
  });
});
