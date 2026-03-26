/**
 * SettlementClient tests (cycle-022, Sprint 119, T3.9).
 */
import { describe, it, expect } from 'vitest';
import { SettlementClient } from '../../../src/services/settlement-client.js';

describe('SettlementClient', () => {
  describe('disabled mode (mock)', () => {
    const client = new SettlementClient({ facilitatorUrl: null, enabled: false });

    it('returns mock quote', async () => {
      const quote = await client.quote({
        model: 'test-model',
        estimatedTokens: 1000,
        walletAddress: '0xTest',
      });
      expect(quote.quoteId).toMatch(/^mock-quote-/);
      expect(quote.amountMicroUsd).toBeGreaterThan(0);
      expect(quote.expiresAt).toBeDefined();
    });

    it('returns mock settlement receipt', async () => {
      const receipt = await client.settle({
        quoteId: 'mock-quote-123',
        idempotencyKey: 'idem-key-abc',
        actualInputTokens: 500,
        actualOutputTokens: 200,
      });
      expect(receipt.receiptId).toMatch(/^mock-rcpt-/);
      expect(receipt.transactionHash).toMatch(/^0xmock/);
      expect(receipt.settledAt).toBeDefined();
    });
  });

  describe('enabled mode (no real server)', () => {
    it('throws when facilitator is unreachable', async () => {
      const client = new SettlementClient({
        facilitatorUrl: 'http://localhost:19999',
        enabled: true,
      });

      await expect(client.quote({
        model: 'test',
        estimatedTokens: 100,
        walletAddress: '0xTest',
      })).rejects.toThrow();
    });
  });
});
