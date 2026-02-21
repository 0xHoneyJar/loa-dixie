import { describe, it, expect } from 'vitest';
import { computeCost, MODEL_PRICING } from '../../src/types/economic.js';

describe('computeCost', () => {
  it('computes correct cost for claude-sonnet-4-6', () => {
    // input: 3000 micro-usd per 1K tokens
    // output: 15000 micro-usd per 1K tokens
    const cost = computeCost('claude-sonnet-4-6', 1000, 500);
    // input: 1000/1000 * 3000 = 3000
    // output: ceil(500/1000 * 15000) = ceil(7500) = 7500
    expect(cost).toBe(10500);
  });

  it('computes correct cost for claude-haiku-4-5', () => {
    // input: 800 micro-usd per 1K tokens
    // output: 4000 micro-usd per 1K tokens
    const cost = computeCost('claude-haiku-4-5', 2000, 1000);
    // input: 2000/1000 * 800 = 1600
    // output: 1000/1000 * 4000 = 4000
    expect(cost).toBe(5600);
  });

  it('computes correct cost for claude-opus-4-6', () => {
    // input: 15000 micro-usd per 1K tokens
    // output: 75000 micro-usd per 1K tokens
    const cost = computeCost('claude-opus-4-6', 500, 200);
    // input: ceil(500/1000 * 15000) = ceil(7500) = 7500
    // output: ceil(200/1000 * 75000) = ceil(15000) = 15000
    expect(cost).toBe(22500);
  });

  it('computes correct cost for gpt-4o', () => {
    const cost = computeCost('gpt-4o', 1000, 1000);
    // input: 1000/1000 * 2500 = 2500
    // output: 1000/1000 * 10000 = 10000
    expect(cost).toBe(12500);
  });

  it('computes correct cost for gpt-4o-mini', () => {
    const cost = computeCost('gpt-4o-mini', 1000, 1000);
    // input: 1000/1000 * 150 = 150
    // output: 1000/1000 * 600 = 600
    expect(cost).toBe(750);
  });

  it('returns 0 for unknown model', () => {
    expect(computeCost('unknown-model', 1000, 500)).toBe(0);
  });

  it('returns 0 for zero tokens', () => {
    expect(computeCost('claude-sonnet-4-6', 0, 0)).toBe(0);
  });

  it('handles fractional token counts with ceiling', () => {
    // 1 token of claude-sonnet-4-6 input: ceil(1/1000 * 3000) = ceil(3) = 3
    // 1 token of claude-sonnet-4-6 output: ceil(1/1000 * 15000) = ceil(15) = 15
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
    // input: 1000000/1000 * 15000 = 15,000,000
    // output: 500000/1000 * 75000 = 37,500,000
    expect(cost).toBe(52_500_000);
  });
});

describe('MODEL_PRICING', () => {
  it('has pricing for all expected models', () => {
    const models = MODEL_PRICING.map((p) => p.model);
    expect(models).toContain('claude-sonnet-4-6');
    expect(models).toContain('claude-haiku-4-5');
    expect(models).toContain('claude-opus-4-6');
    expect(models).toContain('gpt-4o');
    expect(models).toContain('gpt-4o-mini');
  });

  it('all pricing values are positive', () => {
    for (const p of MODEL_PRICING) {
      expect(p.input_per_1k_micro_usd).toBeGreaterThan(0);
      expect(p.output_per_1k_micro_usd).toBeGreaterThan(0);
    }
  });

  it('output pricing is always >= input pricing (standard LLM pricing pattern)', () => {
    for (const p of MODEL_PRICING) {
      expect(p.output_per_1k_micro_usd).toBeGreaterThanOrEqual(p.input_per_1k_micro_usd);
    }
  });
});
