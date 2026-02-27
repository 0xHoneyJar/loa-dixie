/**
 * Reputation routes — query surface for the autopoietic feedback loop.
 *
 * Endpoints:
 * - GET /:nftId — Full reputation aggregate for a specific agent (builder+)
 * - GET /query — Lightweight score query for finn bridge (JWT auth)
 * - GET /:nftId/cohorts — Per-model task cohorts (builder+)
 * - GET /population — Population stats (admin-gated)
 *
 * @since cycle-011 — Sprint 83, Tasks T2.1–T2.5
 */
import { Hono } from 'hono';
import type { ReputationService } from '../services/reputation-service.js';
import { isValidPathParam } from '../validation.js';
import { tierMeetsRequirement, parseConvictionTier } from '../types/conviction.js';
import type { ConvictionTier } from '../types/conviction.js';
import { safeEqual } from '../utils/crypto.js';
import { ReputationCache } from '../services/reputation-cache.js';

// ---------------------------------------------------------------------------
// T2.1: ReputationRouteDeps interface
// ---------------------------------------------------------------------------

export interface ReputationRouteDeps {
  reputationService: ReputationService;
  adminKey?: string;
  cache?: ReputationCache;
}

// ---------------------------------------------------------------------------
// Routing key validation — nft:<id> prefix per Flatline SKP-002
// ---------------------------------------------------------------------------

const ROUTING_KEY_RE = /^nft:[a-zA-Z0-9_-]+$/;

function parseRoutingKey(routingKey: string): string | null {
  if (routingKey.length > 132) return null; // 4-char prefix + 128-char max nftId
  if (!ROUTING_KEY_RE.test(routingKey)) return null;
  return routingKey.slice(4); // strip 'nft:' prefix
}

// ---------------------------------------------------------------------------
// Conviction tier requirement
// ---------------------------------------------------------------------------

const REQUIRED_TIER: ConvictionTier = 'builder';


// ---------------------------------------------------------------------------
// T2.2: createReputationRoutes factory
// ---------------------------------------------------------------------------

export function createReputationRoutes(deps: ReputationRouteDeps): Hono {
  const { reputationService, adminKey, cache } = deps;
  const app = new Hono();

  // -------------------------------------------------------------------------
  // T2.4a: GET /query — Lightweight score query for finn bridge
  // -------------------------------------------------------------------------

  app.get('/query', async (c) => {
    const routingKey = c.req.query('routingKey');
    if (!routingKey) {
      return c.json({ score: null });
    }

    const nftId = parseRoutingKey(routingKey);
    if (!nftId) {
      return c.json({ score: null });
    }

    // Cache-aside: check cache first (includes negative caching for cold agents)
    if (cache) {
      const cached = cache.get(nftId);
      if (cached !== undefined) {
        return c.json({ score: cached });
      }
    }

    const aggregate = await reputationService.store.get(nftId);
    if (!aggregate) {
      cache?.set(nftId, null); // Negative cache: prevent PG storms on cold keys
      return c.json({ score: null });
    }

    // Return null for cold agents (no observations yet)
    if (aggregate.blended_score === null || aggregate.blended_score === undefined) {
      cache?.set(nftId, null);
      return c.json({ score: null });
    }

    cache?.set(nftId, aggregate.blended_score);
    return c.json({ score: aggregate.blended_score });
  });

  // -------------------------------------------------------------------------
  // GET /population — Population stats (admin-gated, T3.2 placeholder)
  // -------------------------------------------------------------------------

  app.get('/population', async (c) => {
    if (adminKey) {
      const authHeader = c.req.header('authorization');
      if (!authHeader) {
        return c.json({ error: 'unauthorized', message: 'Admin key required' }, 401);
      }
      const key = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      if (!safeEqual(key, adminKey)) {
        return c.json({ error: 'forbidden', message: 'Invalid admin key' }, 403);
      }
    }

    const agg = reputationService.collectionAggregator;
    const storeCount = await reputationService.store.count();

    return c.json({
      mean: agg.mean,
      variance: agg.variance,
      population_size: agg.populationSize,
      store_count: storeCount,
    });
  });

  // -------------------------------------------------------------------------
  // T2.3: GET /:nftId — Full reputation aggregate (builder+ conviction tier)
  // -------------------------------------------------------------------------

  app.get('/:nftId', async (c) => {
    const nftId = c.req.param('nftId');
    if (!isValidPathParam(nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    // Conviction tier gating: builder+
    const tier = parseConvictionTier(c.req.header('x-conviction-tier'));
    if (!tierMeetsRequirement(tier, REQUIRED_TIER)) {
      return c.json({ error: 'forbidden', message: 'Requires builder+ conviction tier' }, 403);
    }

    const aggregate = await reputationService.store.get(nftId);
    if (!aggregate) {
      return c.json({ error: 'not_found', message: 'Agent not found' }, 404);
    }

    return c.json({
      blended_score: aggregate.blended_score,
      personal_score: aggregate.personal_score,
      sample_count: aggregate.sample_count,
      state: aggregate.state,
      reliability: reputationService.checkReliability(aggregate as unknown as Parameters<typeof reputationService.checkReliability>[0]),
      dimensions: aggregate.task_cohorts ?? [],
      snapshot_at: new Date().toISOString(),
    });
  });

  // -------------------------------------------------------------------------
  // GET /:nftId/cohorts — Per-model task cohorts (builder+, T3.1 placeholder)
  // -------------------------------------------------------------------------

  app.get('/:nftId/cohorts', async (c) => {
    const nftId = c.req.param('nftId');
    if (!isValidPathParam(nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    const tier = parseConvictionTier(c.req.header('x-conviction-tier'));
    if (!tierMeetsRequirement(tier, REQUIRED_TIER)) {
      return c.json({ error: 'forbidden', message: 'Requires builder+ conviction tier' }, 403);
    }

    const aggregate = await reputationService.store.get(nftId);
    if (!aggregate) {
      return c.json({ error: 'not_found', message: 'Agent not found' }, 404);
    }

    const cohorts = aggregate.task_cohorts ?? [];
    const crossModelScore = reputationService.computeCrossModel(cohorts);

    return c.json({
      cohorts,
      cross_model_score: crossModelScore,
    });
  });

  return app;
}
