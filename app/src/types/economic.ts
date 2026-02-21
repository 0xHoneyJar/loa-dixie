/**
 * Economic Metadata Types — Phase 2
 *
 * Defines the economic tracking types for per-response cost transparency.
 * Every response includes economic metadata: inference cost, model used,
 * token breakdown. This enables the Web4 economic relationship.
 *
 * See: SDD §4.4, PRD FR-7
 */

import type { TokenBreakdown } from './stream-events.js';

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
 * Model pricing table — lookup cost per 1K tokens by model.
 *
 * Updated periodically. Prices in micro-USD (1 cent = 10,000 micro-USD).
 */
export interface ModelPricing {
  readonly model: string;
  readonly input_per_1k_micro_usd: number;
  readonly output_per_1k_micro_usd: number;
}

/** Default pricing for known models. Fallback: 0 cost (free tier). */
export const MODEL_PRICING: ReadonlyArray<ModelPricing> = [
  { model: 'claude-sonnet-4-6', input_per_1k_micro_usd: 3000, output_per_1k_micro_usd: 15000 },
  { model: 'claude-haiku-4-5', input_per_1k_micro_usd: 800, output_per_1k_micro_usd: 4000 },
  { model: 'claude-opus-4-6', input_per_1k_micro_usd: 15000, output_per_1k_micro_usd: 75000 },
  { model: 'gpt-4o', input_per_1k_micro_usd: 2500, output_per_1k_micro_usd: 10000 },
  { model: 'gpt-4o-mini', input_per_1k_micro_usd: 150, output_per_1k_micro_usd: 600 },
];

/**
 * Compute cost in micro-USD from token counts and model.
 */
export function computeCost(model: string, promptTokens: number, completionTokens: number): number {
  // Match the longest prefix first to avoid gpt-4o matching before gpt-4o-mini
  const pricing = [...MODEL_PRICING]
    .sort((a, b) => b.model.length - a.model.length)
    .find(p => model.startsWith(p.model));
  if (!pricing) return 0;

  const inputCost = Math.ceil((promptTokens / 1000) * pricing.input_per_1k_micro_usd);
  const outputCost = Math.ceil((completionTokens / 1000) * pricing.output_per_1k_micro_usd);
  return inputCost + outputCost;
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
