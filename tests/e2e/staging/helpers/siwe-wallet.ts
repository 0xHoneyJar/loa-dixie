/**
 * Deterministic test wallet for E2E SIWE auth flows.
 *
 * Uses Hardhat account #0 — publicly known private key, NEVER holds real funds.
 * This wallet is pre-seeded in the staging allowlist.
 */
export const TEST_WALLET = {
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const,
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const,
};

/**
 * Create a SIWE message for the test wallet.
 * @param nonce - Nonce from the /auth/nonce endpoint
 * @param domain - Domain for the SIWE message (default: localhost)
 */
export function createTestSiweMessage(nonce: string, domain = 'localhost'): string {
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
