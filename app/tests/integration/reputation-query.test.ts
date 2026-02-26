/**
 * Integration test: full reputation query cycle (cycle-011, Sprint 84, T3.5).
 *
 * End-to-end: seed agent → emit events → query reputation → verify blended
 * score → query cohorts → verify cross-model. Uses Hono test client with real
 * services (in-memory store).
 *
 * @since cycle-011 — Sprint 84, Task T3.5
 */
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import {
  ReputationService,
  InMemoryReputationStore,
  CollectionScoreAggregator,
} from '../../src/services/reputation-service.js';
import { createReputationRoutes } from '../../src/routes/reputation.js';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';

function makeAggregate(overrides: Partial<ReputationAggregate> = {}): ReputationAggregate {
  return {
    personality_id: 'test-agent',
    collection_id: 'coll-1',
    pool_id: 'pool-1',
    state: 'warming',
    personal_score: 0.5,
    collection_score: 0.5,
    blended_score: 0.5,
    sample_count: 1,
    pseudo_count: 10,
    contributor_count: 1,
    min_sample_count: 10,
    created_at: '2026-01-01T00:00:00Z',
    last_updated: '2026-02-01T00:00:00Z',
    transition_history: [],
    contract_version: '8.2.0',
    ...overrides,
  };
}

function buildApp() {
  const store = new InMemoryReputationStore();
  const aggregator = new CollectionScoreAggregator();
  const service = new ReputationService(store, aggregator);

  const app = new Hono();
  app.route('/api/reputation', createReputationRoutes({
    reputationService: service,
    adminKey: 'integration-test-key',
  }));

  return { app, service, store, aggregator };
}

describe('Reputation query: full cycle integration', () => {
  it('seed agent → emit event → query score → verify blended', async () => {
    const { app, service, store } = buildApp();
    const nftId = 'nft-integration-1';

    // Phase 1: Seed the agent in the store (simulating initial registration)
    await store.put(nftId, makeAggregate({
      personal_score: 0.6,
      blended_score: 0.55,
      sample_count: 5,
    }));

    // Phase 2: Emit a quality signal event (updates personal + blended)
    await service.processEvent(nftId, {
      type: 'quality_signal',
      score: 0.9,
      event_id: 'evt-1',
      agent_id: nftId,
      collection_id: 'coll-1',
      timestamp: new Date().toISOString(),
    });

    // Phase 3: Query via /query endpoint (finn bridge path)
    const queryRes = await app.request(
      `/api/reputation/query?routingKey=nft:${nftId}`,
    );
    expect(queryRes.status).toBe(200);
    const queryBody = await queryRes.json();
    expect(queryBody.score).not.toBeNull();
    expect(typeof queryBody.score).toBe('number');

    // Phase 4: Query full aggregate via /:nftId
    const fullRes = await app.request(`/api/reputation/${nftId}`, {
      headers: { 'x-conviction-tier': 'builder' },
    });
    expect(fullRes.status).toBe(200);
    const fullBody = await fullRes.json();
    expect(fullBody.blended_score).not.toBeNull();
    expect(fullBody.personal_score).not.toBeNull();
    // sample_count should have incremented from 5 to 6
    expect(fullBody.sample_count).toBe(6);
    expect(fullBody.state).toBeDefined();
    expect(fullBody.snapshot_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Blended score from /query should match full aggregate
    expect(queryBody.score).toBe(fullBody.blended_score);
  });

  it('query cohorts → verify cross-model response', async () => {
    const { app, store } = buildApp();
    const nftId = 'nft-integration-2';

    // Seed agent with task cohorts
    await store.put(nftId, makeAggregate({
      task_cohorts: [
        { model_id: 'gpt-4o', task_type: 'code_review', personal_score: 0.8, sample_count: 5, last_updated: '2026-02-26T00:00:00Z' },
        { model_id: 'claude-3', task_type: 'analysis', personal_score: 0.7, sample_count: 3, last_updated: '2026-02-25T00:00:00Z' },
      ],
    }));

    // Query cohorts endpoint
    const cohortRes = await app.request(`/api/reputation/${nftId}/cohorts`, {
      headers: { 'x-conviction-tier': 'builder' },
    });
    expect(cohortRes.status).toBe(200);
    const cohortBody = await cohortRes.json();
    expect(cohortBody.cohorts).toHaveLength(2);
    expect(cohortBody.cross_model_score).not.toBeNull();
    expect(typeof cohortBody.cross_model_score).toBe('number');
  });

  it('population stats reflect store contents', async () => {
    const { app, store, aggregator } = buildApp();

    // Seed multiple agents
    for (const [id, score] of [['nft-pop-1', 0.7], ['nft-pop-2', 0.8], ['nft-pop-3', 0.6]] as const) {
      await store.put(id, makeAggregate({ personal_score: score, blended_score: score }));
      aggregator.update(score);
    }

    const popRes = await app.request('/api/reputation/population', {
      headers: { authorization: 'Bearer integration-test-key' },
    });
    expect(popRes.status).toBe(200);
    const popBody = await popRes.json();
    expect(popBody.population_size).toBe(3);
    expect(popBody.store_count).toBe(3);
    expect(popBody.mean).toBeCloseTo(0.7, 1);
  });

  it('cold agent returns null score via query endpoint', async () => {
    const { app } = buildApp();

    // Query an agent that was never created
    const res = await app.request('/api/reputation/query?routingKey=nft:nft-cold-ghost');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBeNull();
  });
});
