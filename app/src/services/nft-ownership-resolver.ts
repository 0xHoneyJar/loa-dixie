/**
 * Centralized NFT ownership resolution — replaces 4 inline lambdas in server.ts.
 *
 * Resolves wallet → NFT ownership via loa-finn identity graph.
 * Supports multi-NFT wallets (plural endpoint) with singular fallback.
 *
 * @since cycle-022 — Sprint 118, Task 2.1
 */
import type { FinnClient } from '../proxy/finn-client.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NftOwnership {
  nftId: string;
  ownerWallet?: string;
  delegatedWallets?: string[];
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export class NftOwnershipResolver {
  private cache = new Map<string, { nfts: NftOwnership[]; expiresAt: number }>();
  private negativeCache = new Map<string, number>(); // wallet → expiresAt

  constructor(
    private finnClient: FinnClient,
    private ttlMs: number = 300_000,         // 5 min default
    private negativeTtlMs: number = 60_000,  // 1 min for 404s
  ) {}

  /**
   * Resolve all NFTs owned by a wallet.
   * Tries plural endpoint first, falls back to singular.
   */
  async resolve(wallet: string): Promise<NftOwnership[]> {
    const normalizedWallet = wallet.toLowerCase();

    // Check negative cache
    const negExpiry = this.negativeCache.get(normalizedWallet);
    if (negExpiry && Date.now() < negExpiry) return [];

    // Check positive cache
    const cached = this.cache.get(normalizedWallet);
    if (cached && Date.now() < cached.expiresAt) return cached.nfts;

    try {
      // Try plural endpoint first (multi-NFT)
      const result = await this.finnClient.request<{ nfts: NftOwnership[] }>(
        'GET',
        `/api/identity/wallet/${encodeURIComponent(wallet)}/nfts`,
      );
      const nfts = result.nfts;
      this.cache.set(normalizedWallet, { nfts, expiresAt: Date.now() + this.ttlMs });
      this.negativeCache.delete(normalizedWallet);
      return nfts;
    } catch {
      // Fallback to singular endpoint
      try {
        const result = await this.finnClient.request<{ nftId: string }>(
          'GET',
          `/api/identity/wallet/${encodeURIComponent(wallet)}/nft`,
        );
        const nfts = [{ nftId: result.nftId }];
        this.cache.set(normalizedWallet, { nfts, expiresAt: Date.now() + this.ttlMs });
        this.negativeCache.delete(normalizedWallet);
        return nfts;
      } catch {
        // No NFTs found — cache negative result
        this.negativeCache.set(normalizedWallet, Date.now() + this.negativeTtlMs);
        return [];
      }
    }
  }

  /**
   * Resolve primary (first) NFT for a wallet.
   * Backward-compatible with existing single-NFT consumers.
   */
  async resolvePrimary(wallet: string): Promise<NftOwnership | null> {
    const nfts = await this.resolve(wallet);
    return nfts[0] ?? null;
  }

  /**
   * Resolve full ownership info (including ownerWallet, delegatedWallets).
   * Uses the /ownership endpoint which returns richer data.
   */
  async resolveOwnership(wallet: string): Promise<NftOwnership | null> {
    try {
      const result = await this.finnClient.request<{
        nftId: string;
        ownerWallet: string;
        delegatedWallets: string[];
      }>('GET', `/api/identity/wallet/${encodeURIComponent(wallet)}/ownership`);
      return result;
    } catch {
      return null;
    }
  }

  /** Clear all caches — for testing */
  clearCache(): void {
    this.cache.clear();
    this.negativeCache.clear();
  }
}
