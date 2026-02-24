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
    // Warn when a valid-looking Ethereum address fails checksum — this indicates
    // a potential cache key bifurcation (checksum vs lowercase producing different keys).
    // Short/test addresses are expected to fail and stay silent.
    if (address.startsWith('0x') && address.length === 42) {
      console.warn('[wallet-normalization] checksum-fallback', { prefix: address.slice(0, 10) });
    }
    return address.toLowerCase();
  }
}
