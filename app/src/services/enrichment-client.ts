/**
 * Enrichment Client — Client-side of the enrichment API with timeout membrane.
 *
 * Provides a client for consuming the POST /api/enrich/review-context endpoint
 * with a configurable timeout (default: 100ms). When the timeout expires or
 * the endpoint is unreachable, the client returns a graceful degradation
 * response, allowing the system to revert to allopoietic mode (reviews
 * without governance context enrichment).
 *
 * The timeout membrane is a critical safety boundary: it ensures that a
 * slow or failing enrichment service never blocks the review pipeline.
 * This is the autopoietic → allopoietic degradation path described in
 * SDD §2.3.
 *
 * Configuration:
 * - `DIXIE_ENRICHMENT_TIMEOUT_MS` env var (default: 100)
 * - `DIXIE_ENRICHMENT_BASE_URL` env var (default: http://localhost:3000)
 *
 * See: SDD §2.3 (Autopoietic/Allopoietic Mode), PRD FR-3
 * @since Sprint 11 (Global 53) — Task 11.3
 */

import type { EnrichmentContext } from './enrichment-service.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Review types supported by the enrichment API. */
export type EnrichmentReviewType = 'bridge' | 'flatline' | 'audit';

/** Successful enrichment fetch result. */
export interface EnrichmentAvailable {
  readonly available: true;
  readonly context: EnrichmentContext;
}

/** Degraded enrichment fetch result. */
export interface EnrichmentUnavailable {
  readonly available: false;
  readonly reason: 'timeout' | 'unavailable' | 'error' | 'access_denied';
}

/** Union result type for enrichment fetch. */
export type EnrichmentResult = EnrichmentAvailable | EnrichmentUnavailable;

/** Configuration options for EnrichmentClient. */
export interface EnrichmentClientOptions {
  /** Base URL for the enrichment API (default: from env or http://localhost:3000). */
  baseUrl?: string;
  /** Timeout in milliseconds (default: from env or 100). */
  timeoutMs?: number;
  /** Custom fetch implementation (for testing/SSR). */
  fetch?: typeof globalThis.fetch;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default timeout for enrichment requests in milliseconds. */
const DEFAULT_TIMEOUT_MS = 100;

/** Default base URL for the enrichment API. */
const DEFAULT_BASE_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// EnrichmentClient
// ---------------------------------------------------------------------------

/**
 * EnrichmentClient — fetches governance context from the enrichment endpoint
 * with a configurable timeout membrane.
 *
 * On timeout or error, returns `{ available: false, reason }` so callers
 * can gracefully degrade to allopoietic mode (no enrichment context).
 *
 * @since Sprint 11 (Global 53) — Task 11.3
 */
export class EnrichmentClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(options: EnrichmentClientOptions = {}) {
    this.baseUrl = options.baseUrl
      ?? process.env.DIXIE_ENRICHMENT_BASE_URL
      ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs
      ?? parseEnvTimeout()
      ?? DEFAULT_TIMEOUT_MS;
    this.fetchFn = options.fetch ?? globalThis.fetch;
  }

  /**
   * Fetch governance context for a review.
   *
   * Applies the timeout membrane: if the request does not complete within
   * `timeoutMs`, returns `{ available: false, reason: 'timeout' }`.
   *
   * @param nftId - The dNFT ID of the requesting agent
   * @param reviewType - The type of review requesting enrichment
   * @param scope - Optional scope qualifier
   * @returns EnrichmentResult — either the context or a degradation response
   */
  async fetchContext(
    nftId: string,
    reviewType: EnrichmentReviewType,
    scope?: string,
  ): Promise<EnrichmentResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.baseUrl}/api/enrich/review-context`;
      const body: Record<string, unknown> = {
        nft_id: nftId,
        review_type: reviewType,
      };
      if (scope) body.scope = scope;

      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 403) {
        return { available: false, reason: 'access_denied' };
      }

      if (!response.ok) {
        return { available: false, reason: 'unavailable' };
      }

      const context = await response.json() as EnrichmentContext;
      return { available: true, context };
    } catch (err) {
      // AbortError = timeout, everything else = unavailable
      if (err instanceof Error && err.name === 'AbortError') {
        return { available: false, reason: 'timeout' };
      }
      return { available: false, reason: 'unavailable' };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Expose configured timeout for observability/testing. */
  get configuredTimeoutMs(): number {
    return this.timeoutMs;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse timeout from environment variable.
 * Returns undefined if not set or invalid.
 */
function parseEnvTimeout(): number | undefined {
  const val = process.env.DIXIE_ENRICHMENT_TIMEOUT_MS;
  if (!val) return undefined;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
}
