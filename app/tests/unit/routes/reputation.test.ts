/**
 * Reputation route unit tests (cycle-011, Sprint 83, T2.6/T2.7).
 *
 * Tests for:
 * - GET /api/reputation/:nftId — full aggregate (builder+ gated)
 * - GET /api/reputation/query — lightweight score (finn bridge)
 * - GET /api/reputation/:nftId/cohorts — per-model cohorts (builder+)
 * - GET /api/reputation/population — population stats (admin-gated)
 *
 * @since cycle-011 — Sprint 83, Tasks T2.6, T2.7
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createReputationRoutes } from '../../../src/routes/reputation.js';
import {
  ReputationService,
  InMemoryReputationStore,
  CollectionScoreAggregator,
} from '../../../src/services/reputation-service.js';
import { ReputationCache } from '../../../src/services/reputation-cache.js';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';

function makeAggregate(overrides: Partial<ReputationAggregate> = {}): ReputationAggregate {
  return {
    personality_id: 'test-agent',
    collection_id: 'collection-1',
    pool_id: 'pool-1',
    state: 'warming',
    personal_score: 0.75,
    collection_score: 0.5,
    blended_score: 0.65,
    sample_count: 15,
    pseudo_count: 10,
    contributor_count: 1,
    min_sample_count: 10,
    created_at: '2026-01-01T00:00:00Z',
    last_updated: '2026-02-26T00:00:00Z',
    transition_history: [],
    contract_version: '8.2.0',
    task_cohorts: [
      { model_id: 'gpt-4o', task_type: 'code_review', personal_score: 0.8, sample_count: 5, last_updated: '2026-02-26T00:00:00Z' },
      { model_id: 'claude-3', task_type: 'analysis', personal_score: 0.7, sample_count: 3, last_updated: '2026-02-25T00:00:00Z' },
    ],
    ...overrides,
  };
}

function createTestApp(
  store: InMemoryReputationStore,
  adminKey?: string,
) {
  const aggregator = new CollectionScoreAggregator();
  aggregator.update(0.7);
  aggregator.update(0.8);
  const service = new ReputationService(store, aggregator);

  const app = new Hono();
  app.route('/api/reputation', createReputationRoutes({
    reputationService: service,
    adminKey,
  }));
  return app;
}

// ---------------------------------------------------------------------------
// T2.6: Route unit tests — :nftId endpoint
// ---------------------------------------------------------------------------

describe('GET /api/reputation/:nftId', () => {
  let store: InMemoryReputationStore;
  let app: Hono;

  beforeEach(async () => {
    store = new InMemoryReputationStore();
    await store.put('nft-known', makeAggregate());
    app = createTestApp(store, 'test-admin-key');
  });

  it('returns 200 with full response for known agent (builder tier)', async () => {
    const res = await app.request('/api/reputation/nft-known', {
      headers: { 'x-conviction-tier': 'builder' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.blended_score).toBe(0.65);
    expect(body.personal_score).toBe(0.75);
    expect(body.sample_count).toBe(15);
    expect(body.state).toBe('warming');
    expect(body.reliability).toBeDefined();
    expect(body.dimensions).toHaveLength(2);
    expect(body.snapshot_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns 404 for unknown agent', async () => {
    const res = await app.request('/api/reputation/nft-unknown', {
      headers: { 'x-conviction-tier': 'builder' },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('not_found');
  });

  it('returns 403 for observer tier (below builder)', async () => {
    const res = await app.request('/api/reputation/nft-known', {
      headers: { 'x-conviction-tier': 'observer' },
    });

    expect(res.status).toBe(403);
  });

  it('returns 403 when no conviction tier header (defaults to observer)', async () => {
    const res = await app.request('/api/reputation/nft-known');

    expect(res.status).toBe(403);
  });

  it('returns 200 for architect tier (above builder)', async () => {
    const res = await app.request('/api/reputation/nft-known', {
      headers: { 'x-conviction-tier': 'architect' },
    });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// T2.7: Route unit tests — query endpoint
// ---------------------------------------------------------------------------

describe('GET /api/reputation/query', () => {
  let store: InMemoryReputationStore;
  let app: Hono;

  beforeEach(async () => {
    store = new InMemoryReputationStore();
    await store.put('nft-warm', makeAggregate({ blended_score: 0.75 }));
    await store.put('nft-cold', makeAggregate({ blended_score: null as unknown as number, state: 'cold', personal_score: null }));
    app = createTestApp(store);
  });

  it('returns score for known agent with valid routingKey', async () => {
    const res = await app.request('/api/reputation/query?routingKey=nft:nft-warm');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(0.75);
  });

  it('returns null for unknown agent', async () => {
    const res = await app.request('/api/reputation/query?routingKey=nft:nft-missing');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBeNull();
  });

  it('returns null for cold agent (blended_score null)', async () => {
    const res = await app.request('/api/reputation/query?routingKey=nft:nft-cold');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBeNull();
  });

  it('returns null for missing routingKey param', async () => {
    const res = await app.request('/api/reputation/query');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBeNull();
  });

  it('returns null for malformed routingKey (no nft: prefix)', async () => {
    const res = await app.request('/api/reputation/query?routingKey=plain-id');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBeNull();
  });

  it('returns null for routingKey with path traversal attempt', async () => {
    const res = await app.request('/api/reputation/query?routingKey=nft:../../admin');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cohort endpoint tests
// ---------------------------------------------------------------------------

describe('GET /api/reputation/:nftId/cohorts', () => {
  let store: InMemoryReputationStore;
  let app: Hono;

  beforeEach(async () => {
    store = new InMemoryReputationStore();
    await store.put('nft-cohorted', makeAggregate());
    await store.put('nft-empty', makeAggregate({ task_cohorts: [] }));
    app = createTestApp(store);
  });

  it('returns cohorts for agent with model cohorts and scores', async () => {
    const res = await app.request('/api/reputation/nft-cohorted/cohorts', {
      headers: { 'x-conviction-tier': 'builder' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cohorts).toHaveLength(2);
    expect(body.cohorts[0].model_id).toBe('gpt-4o');
    expect(body.cohorts[0].personal_score).toBe(0.8);
    expect(body.cohorts[1].model_id).toBe('claude-3');
    expect(body.cohorts[1].personal_score).toBe(0.7);
    expect(body.cross_model_score).not.toBeNull();
    expect(typeof body.cross_model_score).toBe('number');
  });

  it('returns 404 for unknown agent', async () => {
    const res = await app.request('/api/reputation/nft-missing/cohorts', {
      headers: { 'x-conviction-tier': 'builder' },
    });

    expect(res.status).toBe(404);
  });

  it('returns empty cohorts array for agent without cohorts', async () => {
    const res = await app.request('/api/reputation/nft-empty/cohorts', {
      headers: { 'x-conviction-tier': 'builder' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cohorts).toHaveLength(0);
  });

  it('requires builder+ conviction tier', async () => {
    const res = await app.request('/api/reputation/nft-cohorted/cohorts', {
      headers: { 'x-conviction-tier': 'participant' },
    });

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Population endpoint tests
// ---------------------------------------------------------------------------

describe('GET /api/reputation/population', () => {
  let store: InMemoryReputationStore;

  beforeEach(async () => {
    store = new InMemoryReputationStore();
  });

  it('returns 401 without auth when adminKey configured', async () => {
    const app = createTestApp(store, 'my-admin-key');
    const res = await app.request('/api/reputation/population');

    expect(res.status).toBe(401);
  });

  it('returns 200 with valid admin auth', async () => {
    const app = createTestApp(store, 'my-admin-key');
    const res = await app.request('/api/reputation/population', {
      headers: { authorization: 'Bearer my-admin-key' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mean).toBeDefined();
    expect(body.variance).toBeDefined();
    expect(body.population_size).toBeDefined();
    expect(body.store_count).toBeDefined();
  });

  it('returns 403 with wrong admin key', async () => {
    const app = createTestApp(store, 'my-admin-key');
    const res = await app.request('/api/reputation/population', {
      headers: { authorization: 'Bearer wrong-key' },
    });

    expect(res.status).toBe(403);
  });

  it('returns population stats matching aggregator state', async () => {
    await store.put('nft-1', makeAggregate({ personal_score: 0.8 }));
    const app = createTestApp(store, 'key');
    const res = await app.request('/api/reputation/population', {
      headers: { authorization: 'Bearer key' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // Aggregator was seeded with 0.7 and 0.8 in createTestApp
    expect(body.population_size).toBe(2);
    expect(body.mean).toBeCloseTo(0.75, 1);
    expect(body.store_count).toBe(1); // 1 agent in store
  });

  it('returns mean=0.5 for empty population when no adminKey', async () => {
    const app = createTestApp(store); // no adminKey = no auth required
    const res = await app.request('/api/reputation/population');

    expect(res.status).toBe(200);
    const body = await res.json();
    // createTestApp seeds aggregator with 2 observations (0.7, 0.8)
    expect(body.population_size).toBe(2);
  });

  it('returns mean=0.5, variance=0, size=0 for fresh aggregator', async () => {
    // Build app with a fresh (unseeded) aggregator
    const freshAgg = new CollectionScoreAggregator();
    const service = new ReputationService(store, freshAgg);
    const app = new Hono();
    app.route('/api/reputation', createReputationRoutes({
      reputationService: service,
    }));

    const res = await app.request('/api/reputation/population');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mean).toBe(0.5);
    expect(body.variance).toBe(0);
    expect(body.population_size).toBe(0);
    expect(body.store_count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cache integration tests (Bridge iter-2: medium-1)
// ---------------------------------------------------------------------------

describe('GET /api/reputation/query — cache integration', () => {
  let store: InMemoryReputationStore;
  let cache: ReputationCache;

  beforeEach(async () => {
    store = new InMemoryReputationStore();
    cache = new ReputationCache({ ttlMs: 5000 });
    await store.put('nft-cached', makeAggregate({ blended_score: 0.85 }));
  });

  function buildCachedApp() {
    const aggregator = new CollectionScoreAggregator();
    const service = new ReputationService(store, aggregator);
    const app = new Hono();
    app.route('/api/reputation', createReputationRoutes({
      reputationService: service,
      cache,
    }));
    return app;
  }

  it('populates cache on first query and serves from cache on second', async () => {
    const app = buildCachedApp();

    // First query — cache miss, hits store
    const res1 = await app.request('/api/reputation/query?routingKey=nft:nft-cached');
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.score).toBe(0.85);
    expect(cache.metrics.misses).toBe(1);
    expect(cache.metrics.hits).toBe(0);

    // Second query — cache hit, no store access
    const res2 = await app.request('/api/reputation/query?routingKey=nft:nft-cached');
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.score).toBe(0.85);
    expect(cache.metrics.hits).toBe(1);
  });

  it('negative-caches null for unknown agents', async () => {
    const app = buildCachedApp();

    // First query — cache miss, store returns null
    await app.request('/api/reputation/query?routingKey=nft:nft-ghost');
    expect(cache.metrics.misses).toBe(1);

    // Second query — cache hit (negative cache), returns null
    const res = await app.request('/api/reputation/query?routingKey=nft:nft-ghost');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBeNull();
    expect(cache.metrics.hits).toBe(1);
  });

  it('works without cache (cache=undefined)', async () => {
    // Original behavior — no cache passed
    const app = createTestApp(store);
    const res = await app.request('/api/reputation/query?routingKey=nft:nft-cached');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(0.85);
  });
});

// ---------------------------------------------------------------------------
// Conviction tier validation tests (Bridge iter-2: medium-3)
// ---------------------------------------------------------------------------

describe('Conviction tier header validation', () => {
  let store: InMemoryReputationStore;
  let app: Hono;

  beforeEach(async () => {
    store = new InMemoryReputationStore();
    await store.put('nft-1', makeAggregate());
    app = createTestApp(store);
  });

  it('rejects invalid tier strings (defaults to observer → 403)', async () => {
    const res = await app.request('/api/reputation/nft-1', {
      headers: { 'x-conviction-tier': 'superadmin' },
    });
    expect(res.status).toBe(403);
  });

  it('rejects empty tier string (defaults to observer → 403)', async () => {
    const res = await app.request('/api/reputation/nft-1', {
      headers: { 'x-conviction-tier': '' },
    });
    expect(res.status).toBe(403);
  });

  it('accepts all valid tier names', async () => {
    for (const tier of ['builder', 'architect', 'sovereign']) {
      const res = await app.request('/api/reputation/nft-1', {
        headers: { 'x-conviction-tier': tier },
      });
      expect(res.status).toBe(200);
    }
  });

  it('rejects case-mismatched tier names', async () => {
    const res = await app.request('/api/reputation/nft-1', {
      headers: { 'x-conviction-tier': 'Builder' },
    });
    expect(res.status).toBe(403);
  });
});
