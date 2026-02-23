/**
 * Economic Conservation Test Suite — Sprint 2, Task 2.4
 *
 * Verifies BigInt pricing migration correctness:
 * 1. computeCostBigInt matches computeCost for all MODEL_PRICING entries
 * 2. verifyBilling passes for Dixie-computed bills
 * 3. BigInt → number conversion preserves value for amounts up to $1M
 * 4. parseMicroUsd rejects invalid inputs
 */

import { describe, it, expect } from 'vitest';
import { computeCost, computeCostBigInt, MODEL_PRICING, verifyBilling } from '../../src/types/economic.js';
import { parseMicroUsd } from '@0xhoneyjar/loa-hounfour';

describe('economic-conservation', () => {
  // ─── BigInt ↔ Number consistency ────────────────────────────────

  describe('computeCostBigInt matches computeCost for all models', () => {
    const testCases = [
      { prompt: 0, completion: 0 },
      { prompt: 1, completion: 1 },
      { prompt: 100, completion: 50 },
      { prompt: 1000, completion: 500 },
      { prompt: 10000, completion: 5000 },
      { prompt: 100000, completion: 50000 },
    ];

    for (const [model] of MODEL_PRICING) {
      for (const { prompt, completion } of testCases) {
        it(`${model}: ${prompt} prompt + ${completion} completion tokens`, () => {
          const bigIntResult = computeCostBigInt(model, prompt, completion);
          const numberResult = computeCost(model, prompt, completion);
          expect(Number(bigIntResult)).toBe(numberResult);
        });
      }
    }
  });

  // ─── Conservation: verifyBilling ───────────────────────────────

  describe('verifyBilling passes for Dixie-computed bills', () => {
    for (const [model, pricing] of MODEL_PRICING) {
      it(`conservation holds for ${model}`, () => {
        const promptTokens = 1000;
        const completionTokens = 500;
        const computedCost = computeCostBigInt(model, promptTokens, completionTokens);

        const result = verifyBilling(
          { cost_micro: computedCost, pricing_snapshot: pricing },
          { prompt_tokens: promptTokens, completion_tokens: completionTokens },
        );

        expect(result.conserved).toBe(true);
        expect(result.status).toBe('conserved');
        expect(result.delta).toBe('0');
      });
    }

    it('conservation holds for zero-token usage', () => {
      const pricing = MODEL_PRICING.get('claude-sonnet-4-6')!;
      const computedCost = computeCostBigInt('claude-sonnet-4-6', 0, 0);

      const result = verifyBilling(
        { cost_micro: computedCost, pricing_snapshot: pricing },
        { prompt_tokens: 0, completion_tokens: 0 },
      );

      expect(result.conserved).toBe(true);
      expect(result.delta).toBe('0');
    });

    it('conservation holds for large token counts', () => {
      const pricing = MODEL_PRICING.get('claude-opus-4-6')!;
      const computedCost = computeCostBigInt('claude-opus-4-6', 1_000_000, 500_000);

      const result = verifyBilling(
        { cost_micro: computedCost, pricing_snapshot: pricing },
        { prompt_tokens: 1_000_000, completion_tokens: 500_000 },
      );

      expect(result.conserved).toBe(true);
    });

    it('detects violation when billed amount differs', () => {
      const pricing = MODEL_PRICING.get('claude-sonnet-4-6')!;
      const computedCost = computeCostBigInt('claude-sonnet-4-6', 1000, 500);
      const inflatedCost = String(Number(computedCost) + 1);

      const result = verifyBilling(
        { cost_micro: inflatedCost, pricing_snapshot: pricing },
        { prompt_tokens: 1000, completion_tokens: 500 },
      );

      expect(result.conserved).toBe(false);
      expect(result.status).toBe('violated');
    });

    it('returns unverifiable without pricing snapshot', () => {
      const result = verifyBilling(
        { cost_micro: '10500' },
        { prompt_tokens: 1000, completion_tokens: 500 },
      );

      expect(result.conserved).toBe(false);
      expect(result.status).toBe('unverifiable');
    });
  });

  // ─── BigInt → number conversion ────────────────────────────────

  describe('BigInt to number conversion preserves value for amounts up to $1M', () => {
    it('preserves value at $0', () => {
      const value = '0';
      expect(Number(value)).toBe(0);
    });

    it('preserves value at $1 (1_000_000 micro-USD)', () => {
      const value = '1000000';
      expect(Number(value)).toBe(1_000_000);
    });

    it('preserves value at $1,000 (1_000_000_000 micro-USD)', () => {
      const value = '1000000000';
      expect(Number(value)).toBe(1_000_000_000);
    });

    it('preserves value at $1M (10^12 micro-USD)', () => {
      const value = '1000000000000';
      const converted = Number(value);
      expect(converted).toBe(1_000_000_000_000);
      // Verify round-trip: number -> string -> bigint preserves exact value
      expect(BigInt(converted)).toBe(BigInt(value));
    });

    it('preserves value at Number.MAX_SAFE_INTEGER', () => {
      const value = String(Number.MAX_SAFE_INTEGER);
      expect(Number(value)).toBe(Number.MAX_SAFE_INTEGER);
      expect(BigInt(Number(value))).toBe(BigInt(value));
    });

    it('$1M is well within MAX_SAFE_INTEGER', () => {
      const oneMillion = 1_000_000_000_000n; // 10^12 micro-USD = $1M
      expect(oneMillion).toBeLessThan(BigInt(Number.MAX_SAFE_INTEGER));
    });
  });

  // ─── parseMicroUsd validation ──────────────────────────────────

  describe('parseMicroUsd rejects invalid inputs', () => {
    it('rejects empty string', () => {
      const result = parseMicroUsd('');
      expect(result.valid).toBe(false);
    });

    it('rejects leading zeros', () => {
      const result = parseMicroUsd('007');
      expect(result.valid).toBe(false);
      expect(result.valid === false && result.reason).toContain('leading zeros');
    });

    it('accepts "0" (single zero is valid)', () => {
      const result = parseMicroUsd('0');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.amount).toBe(0n);
      }
    });

    it('rejects negative values', () => {
      const result = parseMicroUsd('-100');
      expect(result.valid).toBe(false);
    });

    it('rejects non-numeric strings', () => {
      const result = parseMicroUsd('abc');
      expect(result.valid).toBe(false);
    });

    it('rejects decimal values', () => {
      const result = parseMicroUsd('100.5');
      expect(result.valid).toBe(false);
    });

    it('rejects strings with spaces', () => {
      const result = parseMicroUsd(' 100');
      expect(result.valid).toBe(false);
    });

    it('rejects hex strings', () => {
      const result = parseMicroUsd('0xff');
      expect(result.valid).toBe(false);
    });

    it('accepts valid positive integer strings', () => {
      const result = parseMicroUsd('12345678');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.amount).toBe(12345678n);
      }
    });

    it('accepts large valid values', () => {
      const result = parseMicroUsd('999999999999999999999999999999'); // 30 digits
      expect(result.valid).toBe(true);
    });

    it('rejects values exceeding 30 digits', () => {
      const result = parseMicroUsd('1' + '0'.repeat(30)); // 31 digits
      expect(result.valid).toBe(false);
    });
  });
});
