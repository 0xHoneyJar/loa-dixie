import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettlementClient } from '../../../src/services/settlement-client.js';

describe('SettlementClient.validatePaymentHeader', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns false when settlement is disabled', async () => {
    const client = new SettlementClient({ enabled: false, facilitatorUrl: 'https://freeside.example' });
    await expect(client.validatePaymentHeader({ paymentHeader: 'token', path: '/api/chat' })).resolves.toBe(false);
  });

  it('returns true only when facilitator confirms validity', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ valid: true }), { status: 200 })) as typeof fetch;
    const client = new SettlementClient({ enabled: true, facilitatorUrl: 'https://freeside.example' });

    await expect(client.validatePaymentHeader({ paymentHeader: 'token', path: '/api/chat' })).resolves.toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://freeside.example/api/settlement/validate-payment',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns false when facilitator rejects the payment header', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ valid: false }), { status: 200 })) as typeof fetch;
    const client = new SettlementClient({ enabled: true, facilitatorUrl: 'https://freeside.example' });

    await expect(client.validatePaymentHeader({ paymentHeader: 'token', path: '/api/chat' })).resolves.toBe(false);
  });

  it('treats authorization-style facilitator rejections as invalid payments', async () => {
    for (const status of [402, 403]) {
      globalThis.fetch = vi.fn(async () => new Response('', { status })) as typeof fetch;
      const client = new SettlementClient({ enabled: true, facilitatorUrl: 'https://freeside.example' });
      await expect(client.validatePaymentHeader({ paymentHeader: 'token', path: '/api/chat' })).resolves.toBe(false);
    }
  });

  it('throws on facilitator availability failures so the middleware can fail closed', async () => {
    globalThis.fetch = vi.fn(async () => new Response('', { status: 503 })) as typeof fetch;
    const client = new SettlementClient({ enabled: true, facilitatorUrl: 'https://freeside.example' });

    await expect(client.validatePaymentHeader({ paymentHeader: 'token', path: '/api/chat' })).rejects.toThrow(/Payment validation failed/);
  });
});
