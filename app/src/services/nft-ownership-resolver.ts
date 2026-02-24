/**
 * NftOwnershipResolver — centralized NFT identity resolution via loa-finn.
 *
 * Replaces 4 duplicated inline lambdas in server.ts that each independently
 * called the loa-finn identity graph endpoints.
 *
 * @since cycle-006 Sprint 3 — FR-4 NFT Ownership Resolution Centralization
 */
import type { FinnClient } from '../proxy/finn-client.js';

export interface NftOwnershipInfo {
  nftId: string;
  ownerWallet: string;
  delegatedWallets: string[];
}

export class NftOwnershipResolver {
  constructor(private readonly finnClient: FinnClient) {}

  /**
   * Resolve wallet → nftId via loa-finn identity graph.
   * Returns null when the wallet has no associated dNFT.
   */
  async resolveNftId(wallet: string): Promise<string | null> {
    try {
      const result = await this.finnClient.request<{ nftId: string }>(
        'GET',
        `/api/identity/wallet/${encodeURIComponent(wallet)}/nft`,
      );
      return result.nftId;
    } catch {
      return null;
    }
  }

  /**
   * Resolve wallet → { nftId } ownership.
   * Used by schedule and learning routes for ownership verification.
   *
   * LIMITATION: Returns first NFT only — wallets with multiple dNFTs will only
   * resolve the primary. Multi-NFT support tracked in loa-finn.
   */
  async resolveOwnership(wallet: string): Promise<{ nftId: string } | null> {
    try {
      return await this.finnClient.request<{ nftId: string }>(
        'GET',
        `/api/identity/wallet/${encodeURIComponent(wallet)}/nft`,
      );
    } catch {
      return null;
    }
  }

  /**
   * Resolve wallet → full ownership info including delegation.
   * Used by memory routes for authorization with delegation support.
   */
  async resolveFullOwnership(wallet: string): Promise<NftOwnershipInfo | null> {
    try {
      return await this.finnClient.request<NftOwnershipInfo>(
        'GET',
        `/api/identity/wallet/${encodeURIComponent(wallet)}/ownership`,
      );
    } catch {
      return null;
    }
  }
}
