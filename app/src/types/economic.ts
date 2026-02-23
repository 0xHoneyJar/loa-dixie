/**
 * Economic Metadata Types — Phase 2
 *
 * Defines the economic tracking types for per-response cost transparency.
 * Every response includes economic metadata: inference cost, model used,
 * token breakdown. This enables the Web4 economic relationship.
 *
 * v2 (Sprint 2): Migrated to BigInt-safe pricing via hounfour's computeCostMicro.
 * MODEL_PRICING is now a Map<string, PricingInput> with string fields for BigInt
 * compatibility. computeCost() is a backward-compatible facade that delegates to
 * computeCostBigInt() internally.
 *
 * See: SDD §4.4, PRD FR-7
 */

import type { TokenBreakdown } from './stream-events.js';
import type { PricingInput, ConservationResult } from '@0xhoneyjar/loa-hounfour/economy';
import { computeCostMicro, verifyPricingConservation } from '@0xhoneyjar/loa-hounfour/economy';

/**
 * EconomicMetadata — attached to every response for cost transparency.
 *
 * Computed after stream completes from the usage event + model pricing table.
 */
export interface EconomicMetadata {
  readonly cost_micro_usd: number;
  readonly model: string;
  readonly pool: string;
  readonly tokens: TokenBreakdown;
  readonly computedAt: string;
}

/**
 * Model pricing table — lookup cost per 1M tokens by model (BigInt-safe strings).
 *
 * Prices in micro-USD per million tokens. Conversion from legacy per-1K:
 * per_1M = per_1K * 1000 (exact integer multiplication, no precision loss).
 *
 * Updated periodically. Fallback: 0 cost (free tier) for unknown models.
 */
export const MODEL_PRICING: ReadonlyMap<string, PricingInput> = new Map<string, PricingInput>([
  ['claude-sonnet-4-6', { input_per_million_micro: '3000000', output_per_million_micro: '15000000' }],
  ['claude-haiku-4-5',  { input_per_million_micro: '800000',  output_per_million_micro: '4000000' }],
  ['claude-opus-4-6',   { input_per_million_micro: '15000000', output_per_million_micro: '75000000' }],
  ['gpt-4o',            { input_per_million_micro: '2500000', output_per_million_micro: '10000000' }],
  ['gpt-4o-mini',       { input_per_million_micro: '150000',  output_per_million_micro: '600000' }],
]);

/**
 * Resolve pricing for a model by longest-prefix match.
 * Returns undefined for unknown models (free tier).
 */
function resolvePricing(model: string): PricingInput | undefined {
  // Exact match first
  const exact = MODEL_PRICING.get(model);
  if (exact) return exact;

  // Longest-prefix match for model variants (e.g., 'claude-sonnet-4-6-20260101')
  let bestMatch: PricingInput | undefined;
  let bestLen = 0;
  for (const [key, pricing] of MODEL_PRICING) {
    if (model.startsWith(key) && key.length > bestLen) {
      bestMatch = pricing;
      bestLen = key.length;
    }
  }
  return bestMatch;
}

/**
 * Compute cost in micro-USD as a BigInt-serialized string.
 *
 * Uses hounfour's computeCostMicro for BigInt-safe arithmetic with ceil rounding.
 * Returns '0' for unknown models.
 */
export function computeCostBigInt(model: string, promptTokens: number, completionTokens: number): string {
  const pricing = resolvePricing(model);
  if (!pricing) return '0';

  return computeCostMicro(pricing, {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
  });
}

/**
 * Compute cost in micro-USD from token counts and model.
 *
 * Backward-compatible facade: returns number. Delegates internally to
 * computeCostBigInt() for BigInt-safe arithmetic, then converts to number.
 *
 * Safe for amounts up to ~$9 trillion (Number.MAX_SAFE_INTEGER micro-USD).
 */
export function computeCost(model: string, promptTokens: number, completionTokens: number): number {
  return Number(computeCostBigInt(model, promptTokens, completionTokens));
}

/**
 * Verify that a billing amount matches the computed cost from pricing and usage.
 *
 * Wraps hounfour's verifyPricingConservation. Conservation holds when
 * billed cost exactly matches computed cost for the given usage.
 */
export function verifyBilling(
  billing: { cost_micro: string; pricing_snapshot?: PricingInput },
  usage: { prompt_tokens: number; completion_tokens: number; reasoning_tokens?: number },
): ConservationResult {
  return verifyPricingConservation(billing, usage);
}

/**
 * InteractionSignal — emitted to NATS after each chat completion.
 *
 * Feeds the compound learning pipeline (SDD §4.5).
 */
export interface InteractionSignal {
  readonly nftId: string;
  readonly wallet: string;
  readonly sessionId: string;
  readonly messageId: string;
  readonly model: string;
  readonly tokens: TokenBreakdown;
  readonly cost_micro_usd: number;
  readonly topics: string[];
  readonly knowledgeSources: string[];
  readonly toolsUsed: string[];
  readonly durationMs: number;
  readonly timestamp: string;
}
