/**
 * Tests for CollectionScoreAggregator startup seeding (cycle-011, Sprint 82, T1.4/T1.6).
 *
 * Verifies two-phase seeding from PG:
 * 1. Empty store → aggregator mean = 0.5 (neutral)
 * 2. Store with agents → aggregator mean ≈ empirical mean
 * 3. reconstructAggregateFromEvents uses provided collection score
 * 4. restore() method round-trips correctly
 *
 * @since cycle-011 — Sprint 82, Task T1.6
 */
import { describe, it, expect } from 'vitest';
import {
  InMemoryReputationStore,
  CollectionScoreAggregator,
  seedCollectionAggregator,
  reconstructAggregateFromEvents,
  DEFAULT_COLLECTION_SCORE,
} from '../../../app/src/services/reputation-service.js';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';

function makeAggregate(overrides: Partial<ReputationAggregate> = {}): ReputationAggregate {
  return {
    personality_id: 'test-agent',
    collection_id: 'collection-1',
    pool_id: 'pool-1',
    state: 'warming',
    personal_score: 0.5,
    collection_score: 0.5,
    blended_score: 0.5,
    sample_count: 10,
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

describe('CollectionScoreAggregator startup seeding', () => {
  it('empty store → aggregator mean = 0.5 (neutral)', async () => {
    const store = new InMemoryReputationStore();
    const result = await seedCollectionAggregator(store);

    expect(result.seeded).toBe(false);
    expect(result.agentCount).toBe(0);
    expect(result.aggregator.mean).toBe(DEFAULT_COLLECTION_SCORE);
    expect(result.aggregator.mean).toBe(0.5);
  });

  it('store with 3 agents → aggregator mean ≈ empirical mean', async () => {
    const store = new InMemoryReputationStore();
    await store.put('nft-1', makeAggregate({ personal_score: 0.8 }));
    await store.put('nft-2', makeAggregate({ personal_score: 0.6 }));
    await store.put('nft-3', makeAggregate({ personal_score: 0.7 }));

    const result = await seedCollectionAggregator(store);

    expect(result.seeded).toBe(true);
    expect(result.agentCount).toBe(3);
    // Mean of 0.8, 0.6, 0.7 = 0.7
    expect(result.aggregator.mean).toBeCloseTo(0.7, 10);
    expect(result.aggregator.populationSize).toBe(3);
  });

  it('skips agents with null personal_score (cold agents)', async () => {
    const store = new InMemoryReputationStore();
    await store.put('nft-cold', makeAggregate({ personal_score: null, state: 'cold' }));
    await store.put('nft-warm', makeAggregate({ personal_score: 0.9 }));

    const result = await seedCollectionAggregator(store);

    expect(result.seeded).toBe(true);
    expect(result.agentCount).toBe(1); // Only the warm agent
    expect(result.aggregator.mean).toBeCloseTo(0.9, 10);
  });

  it('handles store error gracefully → neutral fallback', async () => {
    // Create a store that throws on listAll
    const store = new InMemoryReputationStore();
    store.listAll = () => Promise.reject(new Error('PG connection lost'));

    const result = await seedCollectionAggregator(store);

    expect(result.seeded).toBe(false);
    expect(result.agentCount).toBe(0);
    expect(result.aggregator.mean).toBe(0.5);
  });
});

describe('reconstructAggregateFromEvents with provided collection score', () => {
  it('uses provided collectionScore parameter', () => {
    const events = [
      {
        type: 'quality_signal' as const,
        score: 0.8,
        event_id: '1',
        agent_id: 'a',
        collection_id: 'c',
        timestamp: '2026-01-01T00:00:00Z',
      },
    ];

    const aggregate = reconstructAggregateFromEvents(events, 0.7);

    // With collectionScore=0.7, personalScore≈0.8, sampleCount=1, pseudoCount=10:
    // blended = (10*0.7 + 1*0.8) / (10+1) = (7.0 + 0.8) / 11 ≈ 0.709
    expect(aggregate.collection_score).toBe(0.7);
    expect(aggregate.blended_score).toBeCloseTo(0.709, 2);
  });

  it('defaults to DEFAULT_COLLECTION_SCORE (0.5) when not provided', () => {
    const aggregate = reconstructAggregateFromEvents([]);

    expect(aggregate.collection_score).toBe(DEFAULT_COLLECTION_SCORE);
    expect(aggregate.collection_score).toBe(0.5);
    // Cold agent: blended = collectionScore
    expect(aggregate.blended_score).toBe(0.5);
  });
});

describe('CollectionScoreAggregator.restore', () => {
  it('restores state from snapshot', () => {
    const original = new CollectionScoreAggregator();
    original.update(0.6);
    original.update(0.8);
    original.update(0.7);

    const snapshot = original.toJSON();

    const target = new CollectionScoreAggregator();
    expect(target.mean).toBe(0.5); // empty → neutral default

    target.restore(snapshot);

    expect(target.mean).toBeCloseTo(original.mean, 10);
    expect(target.populationSize).toBe(original.populationSize);
    expect(target.variance).toBeCloseTo(original.variance, 10);
  });

  it('toJSON → fromJSON → toJSON round-trips exactly', () => {
    const original = new CollectionScoreAggregator();
    original.update(0.3);
    original.update(0.9);

    const snap1 = original.toJSON();
    const restored = CollectionScoreAggregator.fromJSON(snap1);
    const snap2 = restored.toJSON();

    expect(snap2).toEqual(snap1);
  });
});
