/**
 * Dynamic pricing client — queries freeside for per-model pricing.
 *
 * Falls back to hardcoded rates when API is unavailable.
 * Caches pricing with configurable TTL.
 *
 * @since cycle-022 — Sprint 119, Task 3.5
 */

export interface ModelPricing {
  modelId: string;
  inputPricePerToken: number;   // USD per token
  outputPricePerToken: number;  // USD per token
  currency: string;
  updatedAt: string;
}

export interface PricingClientConfig {
  pricingApiUrl: string | null;
  ttlMs: number;
  /** Request timeout in milliseconds. Default: 3000 */
  timeoutMs?: number;
}

/** Hardcoded fallback pricing (matches existing formula in agent.ts) */
const FALLBACK_PRICING: Record<string, ModelPricing> = {
  default: {
    modelId: 'default',
    inputPricePerToken: 0.000003,   // $3/1M tokens
    outputPricePerToken: 0.000015,  // $15/1M tokens
    currency: 'USD',
    updatedAt: '2026-01-01T00:00:00Z',
  },
};

export class PricingClient {
  private cache: { pricing: Record<string, ModelPricing>; expiresAt: number } | null = null;
  private source: 'api' | 'fallback' = 'fallback';

  constructor(private config: PricingClientConfig) {}

  async getModelPricing(model: string): Promise<ModelPricing> {
    const allPricing = await this.fetchPricing();
    return allPricing[model] ?? allPricing['default'] ?? FALLBACK_PRICING['default'];
  }

  async computeCost(model: string, inputTokens: number, outputTokens: number): Promise<number> {
    const pricing = await this.getModelPricing(model);
    const costUsd = inputTokens * pricing.inputPricePerToken + outputTokens * pricing.outputPricePerToken;
    return Math.ceil(costUsd * 1_000_000); // micro-USD
  }

  /** Get the current pricing source for health endpoint */
  getPricingSource(): 'api' | 'fallback' {
    return this.source;
  }

  private async fetchPricing(): Promise<Record<string, ModelPricing>> {
    // Return cached if fresh
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.pricing;
    }

    // Try API
    if (this.config.pricingApiUrl) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 3_000);
        const res = await fetch(`${this.config.pricingApiUrl}/api/pricing/models`, {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json() as { models: ModelPricing[] };
          const pricing: Record<string, ModelPricing> = { ...FALLBACK_PRICING };
          for (const m of data.models) {
            pricing[m.modelId] = m;
          }
          this.cache = { pricing, expiresAt: Date.now() + this.config.ttlMs };
          this.source = 'api';
          return pricing;
        }
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback to hardcoded
    this.cache = { pricing: FALLBACK_PRICING, expiresAt: Date.now() + this.config.ttlMs };
    this.source = 'fallback';
    return FALLBACK_PRICING;
  }

  /** Clear cache — for testing */
  clearCache(): void {
    this.cache = null;
    this.source = 'fallback';
  }
}
