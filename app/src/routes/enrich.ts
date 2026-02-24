/**
 * Enrichment API — POST /api/enrich/review-context
 *
 * Provides governance context for review prompt enrichment. The endpoint
 * assembles conviction, conformance, reputation, and knowledge governance
 * state into a structured context that reviewers (bridge, flatline, audit)
 * can use to ground their recommendations in the community's actual state.
 *
 * Access control: builder+ conviction tier required (Ostrom graduated access).
 * Latency budget: 50ms — returns partial context with `partial: true` on timeout.
 *
 * See: SDD §2.3 (Autopoietic Loop), PRD FR-3 (Self-Improving Quality)
 * @since Sprint 11 (Global 53) — Task 11.2
 */

import { Hono } from 'hono';
import { tierMeetsRequirement } from '../types/conviction.js';
import { buildConvictionDenialResponse } from '../services/conviction-boundary.js';
import type { ConvictionTier } from '../types/conviction.js';
import type { EnrichmentService, EnrichmentContext } from '../services/enrichment-service.js';

/** Valid review types for enrichment context requests. */
export type EnrichmentReviewType = 'bridge' | 'flatline' | 'audit';

/** Request body for POST /api/enrich/review-context. */
export interface EnrichmentRequest {
  readonly nft_id: string;
  readonly review_type: EnrichmentReviewType;
  readonly scope?: string;
}

/** Response body for POST /api/enrich/review-context. */
export interface EnrichmentResponse extends EnrichmentContext {
  // Inherits all EnrichmentContext fields plus any endpoint-specific additions
}

/** Latency budget in milliseconds — assembly must complete within this window. */
const LATENCY_BUDGET_MS = 50;

/** Minimum conviction tier required to access the enrichment endpoint. */
const REQUIRED_TIER: ConvictionTier = 'builder';

export interface EnrichmentRouteDeps {
  enrichmentService: EnrichmentService;
}

/**
 * Create enrichment API routes.
 *
 * POST /review-context — assemble governance context for review enrichment.
 * Enforces conviction-based access control and a 50ms latency budget.
 */
export function createEnrichmentRoutes(deps: EnrichmentRouteDeps): Hono {
  const { enrichmentService } = deps;
  const app = new Hono();

  app.post('/review-context', async (c) => {
    // --- Access Control: builder+ tier required ---
    const tier = (c.req.header('x-conviction-tier') ?? 'observer') as ConvictionTier;
    if (!tierMeetsRequirement(tier, REQUIRED_TIER)) {
      const denial = buildConvictionDenialResponse(
        tier,
        REQUIRED_TIER,
        'Enrichment context requires builder+ conviction tier',
      );
      return c.json(denial, 403);
    }

    // --- Request validation ---
    let body: EnrichmentRequest;
    try {
      body = await c.req.json<EnrichmentRequest>();
    } catch {
      return c.json({ error: 'bad_request', message: 'Invalid JSON body' }, 400);
    }

    if (!body.nft_id || typeof body.nft_id !== 'string') {
      return c.json({ error: 'bad_request', message: 'nft_id is required' }, 400);
    }

    const validReviewTypes: EnrichmentReviewType[] = ['bridge', 'flatline', 'audit'];
    if (!body.review_type || !validReviewTypes.includes(body.review_type)) {
      return c.json({
        error: 'bad_request',
        message: `review_type must be one of: ${validReviewTypes.join(', ')}`,
      }, 400);
    }

    // --- Assemble with latency budget ---
    const start = Date.now();

    try {
      const context = await Promise.race([
        enrichmentService.assembleContext(body.nft_id),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), LATENCY_BUDGET_MS)),
      ]);

      const elapsed = Date.now() - start;

      if (context === null) {
        // Latency budget exceeded — return partial context
        return c.json({
          conviction_context: {
            tier_distribution: { observer: 0, participant: 0, builder: 0, architect: 0, sovereign: 0 },
            total_bgt_staked: 0,
            snapshot_at: new Date().toISOString(),
          },
          conformance_context: {
            violation_rate: 0,
            top_violated_schemas: [],
            sample_rate: 0,
            total_violations: 0,
            snapshot_at: new Date().toISOString(),
          },
          reputation_context: {
            trajectory: 'cold' as const,
            blended_score: null,
            sample_count: 0,
            reputation_state: 'cold',
            snapshot_at: new Date().toISOString(),
          },
          knowledge_context: {
            active_votes: 0,
            priority_rankings: [],
            snapshot_at: new Date().toISOString(),
          },
          assembled_at: new Date().toISOString(),
          partial: true,
        } satisfies EnrichmentResponse);
      }

      // Set latency header for observability
      c.header('X-Enrichment-Latency-Ms', String(elapsed));

      return c.json(context satisfies EnrichmentResponse);
    } catch (err) {
      // Assembly error — return 500 with partial flag
      return c.json({
        error: 'internal_error',
        message: err instanceof Error ? err.message : 'Enrichment context assembly failed',
        partial: true,
      }, 500);
    }
  });

  return app;
}
