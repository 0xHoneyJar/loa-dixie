import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettlementClient } from '../../../src/services/settlement-client.js';

describe('SettlementClient.validatePaymentHeader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('delegates payment header validation to the facilitator', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new SettlementClient({
      enabled: true,
      facilitatorUrl: 'https://freeside.example.com',
      getServiceToken: async () => 'service-token',
    });

    await expect(client.validatePaymentHeader({
      paymentHeader: 'payment-token',
      path: '/api/chat',
    })).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://freeside.example.com/api/settlement/validate-payment',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer service-token',
        },
        body: JSON.stringify({
          paymentHeader: 'payment-token',
          path: '/api/chat',
        }),
      }),
    );
  });

  it('returns false when the facilitator rejects the payment header', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ valid: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));

    const client = new SettlementClient({
      enabled: true,
      facilitatorUrl: 'https://freeside.example.com',
    });

    await expect(client.validatePaymentHeader({
      paymentHeader: 'payment-token',
      path: '/api/chat',
    })).resolves.toBe(false);
  });
});
