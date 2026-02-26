/**
 * E2E-3: Chat inference smoke test.
 *
 * Validates the chat endpoint accepts prompts and returns a response.
 * This test requires loa-finn to be running and accessible.
 *
 * @since cycle-014 Sprint 3 — Task T3
 */
import { describe, it, expect } from 'vitest';
import { post, get } from './helpers/http.js';
import { TEST_WALLET, createTestSiweMessage, signMessage } from './helpers/siwe-wallet.js';

async function getAuthToken(): Promise<string> {
  const message = createTestSiweMessage();
  const signature = await signMessage(message);
  const res = await post<{ token: string }>('/api/auth/siwe', {
    message,
    signature,
  });
  return res.body.token;
}

describe('E2E-3: Chat Inference', () => {
  it('accepts a prompt and returns a response', async () => {
    const token = await getAuthToken();

    const res = await post(
      '/api/chat',
      { prompt: 'Hello, what is Berachain?' },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30_000,
      },
    );

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('returns a sessionId', async () => {
    const token = await getAuthToken();

    const res = await post<{ sessionId: string }>(
      '/api/chat',
      { prompt: 'Tell me about BGT.' },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30_000,
      },
    );

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBeDefined();
    expect(typeof res.body.sessionId).toBe('string');
  });

  it('rejects empty prompts', async () => {
    const token = await getAuthToken();

    const res = await post(
      '/api/chat',
      { prompt: '' },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
