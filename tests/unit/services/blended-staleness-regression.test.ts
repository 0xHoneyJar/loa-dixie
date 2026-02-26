/**
 * Regression test for GitHub issue #36 — blended score staleness.
 *
 * Bug: processEvent() with quality_signal updated personal_score but left
 * blended_score stale. Fixed in cycle-008 via buildUpdatedAggregate which
 * recomputes blended_score on every score-affecting event.
 *
 * @see https://github.com/0xHoneyJar/loa-dixie/issues/36
 * @since cycle-011 — Sprint 82, Task T1.1
 */
import { describe, it, expect } from 'vitest';
import {
  ReputationService,
  InMemoryReputationStore,
  CollectionScoreAggregator,
} from '../../../app/src/services/reputation-service.js';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';

function makeAggregate(overrides: Partial<ReputationAggregate> = {}): ReputationAggregate {
  return {
    personality_id: 'test-agent',
    collection_id: 'collection-1',
    pool_id: 'pool-1',
    state: 'warming',
    personal_score: 0.6,
    collection_score: 0.5,
    blended_score: 0.55,
    sample_count: 5,
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

describe('Regression: #36 — blended score staleness', () => {
  it('processEvent with quality_signal updates blended_score (not just personal_score)', async () => {
    const store = new InMemoryReputationStore();
    const aggregator = new CollectionScoreAggregator();
    // Seed the aggregator with some population data
    aggregator.update(0.7);
    aggregator.update(0.8);
    const service = new ReputationService(store, aggregator);

    const initial = makeAggregate({
      personal_score: 0.6,
      blended_score: 0.55,
      sample_count: 5,
    });
    await store.put('nft-regression-36', initial);

    // Process a quality_signal event
    await service.processEvent('nft-regression-36', {
      type: 'quality_signal',
      score: 0.9,
      event_id: 'evt-1',
      agent_id: 'nft-regression-36',
      collection_id: 'collection-1',
      timestamp: '2026-02-26T00:00:00Z',
    });

    const updated = await store.get('nft-regression-36');
    expect(updated).toBeDefined();

    // The critical assertion: blended_score MUST change from the initial 0.55
    // because buildUpdatedAggregate recomputes it using the new personal score
    expect(updated!.blended_score).not.toBe(initial.blended_score);
    expect(updated!.personal_score).not.toBe(initial.personal_score);
    expect(updated!.sample_count).toBe(initial.sample_count + 1);
  });

  it('processEvent with model_performance also updates blended_score', async () => {
    const store = new InMemoryReputationStore();
    const aggregator = new CollectionScoreAggregator();
    aggregator.update(0.7);
    const service = new ReputationService(store, aggregator);

    const initial = makeAggregate({
      personal_score: 0.5,
      blended_score: 0.5,
      sample_count: 3,
    });
    await store.put('nft-regression-36b', initial);

    await service.processEvent('nft-regression-36b', {
      type: 'model_performance',
      model_id: 'gpt-4o',
      provider: 'openai',
      pool_id: 'pool-1',
      task_type: 'code_review',
      quality_observation: { score: 0.95 },
      event_id: 'evt-2',
      agent_id: 'nft-regression-36b',
      collection_id: 'collection-1',
      timestamp: '2026-02-26T00:01:00Z',
    });

    const updated = await store.get('nft-regression-36b');
    expect(updated).toBeDefined();
    // Blended score must reflect the new personal score, not remain stale
    expect(updated!.blended_score).not.toBe(initial.blended_score);
    expect(updated!.sample_count).toBe(initial.sample_count + 1);
  });
});
