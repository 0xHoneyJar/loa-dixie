import { checksumAddress } from '@0xhoneyjar/loa-hounfour/economy';

/**
 * Normalize a wallet address to EIP-55 checksum format.
 *
 * Replaces inconsistent `wallet.toLowerCase()` patterns with the
 * canonical checksumAddress from hounfour. Ensures all wallet comparisons
 * and cache keys use the same normalization.
 *
 * @since Sprint 56 — Task 2.4 (Bridgebuilder finding: wallet normalization inconsistency)
 */
export function normalizeWallet(address: string): string {
  try {
    return checksumAddress(address);
  } catch {
    // Fallback for non-standard addresses (e.g., test wallets, non-EVM chains)
    return address.toLowerCase();
  }
}
