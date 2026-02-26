/**
 * E2E-2: SIWE auth smoke test.
 *
 * Validates the SIWE nonce → sign → verify flow against the staging BFF.
 *
 * @since cycle-014 Sprint 3 — Task T2
 */
import { describe, it, expect } from 'vitest';
import { post, get } from './helpers/http.js';
import { TEST_WALLET, createTestSiweMessage, signMessage } from './helpers/siwe-wallet.js';

interface SiweResponse {
  token: string;
  wallet: string;
  expiresIn: string;
}

interface VerifyResponse {
  wallet: string;
  role: string;
  exp: number;
}

describe('E2E-2: SIWE Authentication', () => {
  it('authenticates with SIWE message and returns JWT', async () => {
    const message = createTestSiweMessage();
    const signature = await signMessage(message);

    const res = await post<SiweResponse>('/api/auth/siwe', {
      message,
      signature,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.token.length).toBeGreaterThan(20);
    expect(res.body.wallet.toLowerCase()).toBe(TEST_WALLET.toLowerCase());
  });

  it('JWT verifies and contains correct wallet', async () => {
    const message = createTestSiweMessage();
    const signature = await signMessage(message);

    const authRes = await post<SiweResponse>('/api/auth/siwe', {
      message,
      signature,
    });

    const verifyRes = await get<VerifyResponse>('/api/auth/verify', {
      headers: { Authorization: `Bearer ${authRes.body.token}` },
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.wallet.toLowerCase()).toBe(TEST_WALLET.toLowerCase());
  });

  it('rejects invalid signatures', async () => {
    const message = createTestSiweMessage();
    const invalidSignature = '0x' + 'ff'.repeat(65);

    const res = await post('/api/auth/siwe', {
      message,
      signature: invalidSignature,
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
