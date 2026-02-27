/**
 * Deterministic test wallet for E2E SIWE auth flows.
 *
 * Uses Hardhat account #0 — publicly known private key, NEVER holds real funds.
 * This wallet is pre-seeded in the staging allowlist.
 */
import { privateKeyToAccount } from 'viem/accounts';

export const TEST_WALLET = {
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const,
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const,
};

const account = privateKeyToAccount(TEST_WALLET.privateKey);

/**
 * Sign a message with the test wallet (Hardhat account #0).
 * Account is eagerly initialized at module import time.
 */
export async function signMessage(message: string): Promise<string> {
  return account.signMessage({ message });
}

/**
 * Create a SIWE message for the test wallet.
 * @param nonce - Nonce value (default: test nonce, no server endpoint exists)
 * @param domain - Domain for the SIWE message (default: localhost)
 *
 * TODO: When /api/auth/nonce endpoint is added, replace static nonce with
 * async function fetchNonce(baseUrl: string): Promise<string> that calls the endpoint.
 * Current static nonce works because server-side SIWE verify doesn't validate nonces.
 */
export function createTestSiweMessage(nonce = 'test-nonce-00000000', domain = 'localhost'): string {
  const now = new Date().toISOString();
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    TEST_WALLET.address,
    '',
    'Sign in to Dixie BFF',
    '',
    `URI: http://${domain}:3001`,
    'Version: 1',
    `Chain ID: 1`,
    `Nonce: ${nonce}`,
    `Issued At: ${now}`,
  ].join('\n');
}
