import { describe, it, expect } from 'vitest';
import { computeCost, computeCostBigInt, MODEL_PRICING, verifyBilling } from '../../src/types/economic.js';

describe('computeCost', () => {
  it('computes correct cost for claude-sonnet-4-6', () => {
    // input: 3000000 micro-usd per 1M tokens → 3000 per 1K
    // output: 15000000 micro-usd per 1M tokens → 15000 per 1K
    const cost = computeCost('claude-sonnet-4-6', 1000, 500);
    // input: ceil(1000 * 3000000 / 1000000) = 3000
    // output: ceil(500 * 15000000 / 1000000) = 7500
    // BigInt sum-then-ceil: ceil((3000000000 + 7500000000) / 1000000) = 10500
    expect(cost).toBe(10500);
  });

  it('computes correct cost for claude-haiku-4-5', () => {
    const cost = computeCost('claude-haiku-4-5', 2000, 1000);
    // input: ceil(2000 * 800000 / 1000000) = 1600
    // output: ceil(1000 * 4000000 / 1000000) = 4000
    expect(cost).toBe(5600);
  });

  it('computes correct cost for claude-opus-4-6', () => {
    const cost = computeCost('claude-opus-4-6', 500, 200);
    // input: ceil(500 * 15000000 / 1000000) = 7500
    // output: ceil(200 * 75000000 / 1000000) = 15000
    expect(cost).toBe(22500);
  });

  it('computes correct cost for gpt-4o', () => {
    const cost = computeCost('gpt-4o', 1000, 1000);
    // input: ceil(1000 * 2500000 / 1000000) = 2500
    // output: ceil(1000 * 10000000 / 1000000) = 10000
    expect(cost).toBe(12500);
  });

  it('computes correct cost for gpt-4o-mini', () => {
    const cost = computeCost('gpt-4o-mini', 1000, 1000);
    // input: ceil(1000 * 150000 / 1000000) = 150
    // output: ceil(1000 * 600000 / 1000000) = 600
    expect(cost).toBe(750);
  });

  it('returns 0 for unknown model', () => {
    expect(computeCost('unknown-model', 1000, 500)).toBe(0);
  });

  it('returns 0 for zero tokens', () => {
    expect(computeCost('claude-sonnet-4-6', 0, 0)).toBe(0);
  });

  it('handles fractional token counts with ceiling', () => {
    // 1 token of claude-sonnet-4-6 input: ceil(1 * 3000000 / 1000000) = ceil(3) = 3
    // 1 token of claude-sonnet-4-6 output: ceil(1 * 15000000 / 1000000) = ceil(15) = 15
    // BigInt: ceil((3000000 + 15000000) / 1000000) = ceil(18) = 18
    const cost = computeCost('claude-sonnet-4-6', 1, 1);
    expect(cost).toBe(18);
  });

  it('uses prefix matching for model variants', () => {
    // Model name might include version suffix
    const cost = computeCost('claude-sonnet-4-6-20260101', 1000, 500);
    // Should match 'claude-sonnet-4-6' pricing
    expect(cost).toBe(10500);
  });

  it('handles large token counts without overflow', () => {
    // 1M tokens in, 500K tokens out with Opus pricing
    const cost = computeCost('claude-opus-4-6', 1_000_000, 500_000);
    // input: ceil(1000000 * 15000000 / 1000000) = 15,000,000
    // output: ceil(500000 * 75000000 / 1000000) = 37,500,000
    expect(cost).toBe(52_500_000);
  });
});

describe('computeCostBigInt', () => {
  it('returns string result matching computeCost', () => {
    const bigIntResult = computeCostBigInt('claude-sonnet-4-6', 1000, 500);
    const numberResult = computeCost('claude-sonnet-4-6', 1000, 500);
    expect(bigIntResult).toBe('10500');
    expect(Number(bigIntResult)).toBe(numberResult);
  });

  it('returns "0" for unknown model', () => {
    expect(computeCostBigInt('unknown-model', 1000, 500)).toBe('0');
  });
});

describe('MODEL_PRICING', () => {
  it('has pricing for all expected models', () => {
    expect(MODEL_PRICING.has('claude-sonnet-4-6')).toBe(true);
    expect(MODEL_PRICING.has('claude-haiku-4-5')).toBe(true);
    expect(MODEL_PRICING.has('claude-opus-4-6')).toBe(true);
    expect(MODEL_PRICING.has('gpt-4o')).toBe(true);
    expect(MODEL_PRICING.has('gpt-4o-mini')).toBe(true);
  });

  it('all pricing values are valid positive BigInt strings', () => {
    for (const [, pricing] of MODEL_PRICING) {
      const inputRate = BigInt(pricing.input_per_million_micro);
      const outputRate = BigInt(pricing.output_per_million_micro);
      expect(inputRate).toBeGreaterThan(0n);
      expect(outputRate).toBeGreaterThan(0n);
    }
  });

  it('output pricing is always >= input pricing (standard LLM pricing pattern)', () => {
    for (const [, pricing] of MODEL_PRICING) {
      const inputRate = BigInt(pricing.input_per_million_micro);
      const outputRate = BigInt(pricing.output_per_million_micro);
      expect(outputRate).toBeGreaterThanOrEqual(inputRate);
    }
  });
});

describe('verifyBilling', () => {
  it('conserved when billed matches computed', () => {
    const pricing = MODEL_PRICING.get('claude-sonnet-4-6')!;
    const computedCost = computeCostBigInt('claude-sonnet-4-6', 1000, 500);
    const result = verifyBilling(
      { cost_micro: computedCost, pricing_snapshot: pricing },
      { prompt_tokens: 1000, completion_tokens: 500 },
    );
    expect(result.conserved).toBe(true);
    expect(result.status).toBe('conserved');
    expect(result.delta).toBe('0');
  });

  it('violated when billed does not match computed', () => {
    const pricing = MODEL_PRICING.get('claude-sonnet-4-6')!;
    const result = verifyBilling(
      { cost_micro: '99999', pricing_snapshot: pricing },
      { prompt_tokens: 1000, completion_tokens: 500 },
    );
    expect(result.conserved).toBe(false);
    expect(result.status).toBe('violated');
  });

  it('unverifiable without pricing snapshot', () => {
    const result = verifyBilling(
      { cost_micro: '10500' },
      { prompt_tokens: 1000, completion_tokens: 500 },
    );
    expect(result.conserved).toBe(false);
    expect(result.status).toBe('unverifiable');
  });
});
