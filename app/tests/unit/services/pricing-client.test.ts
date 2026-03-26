/**
 * PricingClient tests (cycle-022, Sprint 119, T3.9).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PricingClient } from '../../../src/services/pricing-client.js';

describe('PricingClient', () => {
  let client: PricingClient;

  beforeEach(() => {
    client = new PricingClient({ pricingApiUrl: null, ttlMs: 5000 });
  });

  describe('getModelPricing()', () => {
    it('returns fallback pricing when no API configured', async () => {
      const pricing = await client.getModelPricing('default');
      expect(pricing.inputPricePerToken).toBe(0.000003);
      expect(pricing.outputPricePerToken).toBe(0.000015);
      expect(pricing.currency).toBe('USD');
    });

    it('returns default pricing for unknown model', async () => {
      const pricing = await client.getModelPricing('unknown-model');
      expect(pricing.modelId).toBe('default');
    });
  });

  describe('computeCost()', () => {
    it('computes cost in micro-USD using fallback pricing', async () => {
      // 1000 input * 0.000003 + 500 output * 0.000015 = 0.003 + 0.0075 = 0.0105 USD = 10500 micro-USD
      const cost = await client.computeCost('default', 1000, 500);
      expect(cost).toBe(10500);
    });

    it('rounds up to nearest micro-USD', async () => {
      const cost = await client.computeCost('default', 1, 1);
      // 1 * 0.000003 + 1 * 0.000015 = 0.000018 USD * 1,000,000 = 18 micro-USD
      expect(cost).toBe(18);
    });
  });

  describe('getPricingSource()', () => {
    it('returns fallback when no API configured', async () => {
      await client.getModelPricing('default');
      expect(client.getPricingSource()).toBe('fallback');
    });
  });

  describe('caching', () => {
    it('caches pricing results', async () => {
      const p1 = await client.getModelPricing('default');
      const p2 = await client.getModelPricing('default');
      expect(p1).toEqual(p2);
    });

    it('clearCache forces re-fetch', async () => {
      await client.getModelPricing('default');
      client.clearCache();
      expect(client.getPricingSource()).toBe('fallback');
    });
  });
});
