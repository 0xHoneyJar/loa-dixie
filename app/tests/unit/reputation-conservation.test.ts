/**
 * Reputation Conservation Test Suite — INV-013 Verification
 *
 * INV-013: "For any agent, blended_score at time T must be derivable from
 * collection_score, personal_score, sample_count, and pseudo_count at time T."
 *
 * Proves the conservation invariant by:
 * 1. Processing events through ReputationService.processEvent() (live path)
 * 2. Replaying the same events through reconstructAggregateFromEvents() (reconstruction path)
 * 3. Verifying the blended_score matches between live aggregate and reconstructed aggregate
 * 4. Independently computing blended_score from the 4 parameters and verifying it matches
 *
 * @since cycle-011 — Sprint 4, Task T-4.2
 */

import { describe, it, expect } from 'vitest';
import {
  ReputationService,
  InMemoryReputationStore,
  reconstructAggregateFromEvents,
  DEFAULT_COLLECTION_SCORE,
  DEFAULT_PSEUDO_COUNT,
} from '../../src/services/reputation-service.js';
import { computeBlendedScore } from '@0xhoneyjar/loa-hounfour/governance';
import type { ReputationEvent } from '../../src/types/reputation-evolution.js';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a cold aggregate suitable for seeding the store before event processing. */
function makeColdAggregate(overrides?: Partial<ReputationAggregate>): ReputationAggregate {
  return {
    personality_id: 'p1',
    collection_id: 'c1',
    pool_id: 'pool-1',
    state: 'cold',
    personal_score: null,
    collection_score: DEFAULT_COLLECTION_SCORE,
    blended_score: DEFAULT_COLLECTION_SCORE,
    sample_count: 0,
    pseudo_count: DEFAULT_PSEUDO_COUNT,
    contributor_count: 0,
    min_sample_count: 10,
    created_at: '2026-02-25T00:00:00Z',
    last_updated: '2026-02-25T00:00:00Z',
    transition_history: [],
    model_cohorts: [],
    contract_version: '8.2.0',
    ...overrides,
  };
}

/**
 * Independently verify INV-013 on an aggregate: blended_score must equal
 * computeBlendedScore(personal_score, collection_score, sample_count, pseudo_count).
 * For cold aggregates (personal_score === null), blended_score === collection_score.
 */
function assertConservationHolds(aggregate: ReputationAggregate): void {
  if (aggregate.personal_score === null) {
    expect(aggregate.blended_score).toBe(aggregate.collection_score);
  } else {
    const expected = computeBlendedScore(
      aggregate.personal_score,
      aggregate.collection_score,
      aggregate.sample_count,
      aggregate.pseudo_count,
    );
    expect(aggregate.blended_score).toBeCloseTo(expected, 10);
  }
}

// ---------------------------------------------------------------------------
// INV-013 Test Suite
// ---------------------------------------------------------------------------

describe('INV-013: Reputation Conservation — blended_score derivability', () => {

  // ─── Test 1: Single event reconstruction ──────────────────────────

  it('single quality_signal event: reconstructed blended_score matches live aggregate', async () => {
    const nftId = 'agent-inv013-single';
    const store = new InMemoryReputationStore();
    const service = new ReputationService(store);

    // Seed a cold aggregate
    await store.put(nftId, makeColdAggregate());

    const event: ReputationEvent = {
      type: 'quality_signal',
      score: 0.8,
      event_id: 'evt-1',
      agent_id: nftId,
      collection_id: 'c1',
      timestamp: '2026-02-25T01:00:00Z',
    };

    // Live path: process through service
    await service.processEvent(nftId, event);
    const liveAggregate = await store.get(nftId);
    expect(liveAggregate).toBeDefined();

    // Reconstruction path: replay from event log
    const events = await store.getEventHistory(nftId);
    expect(events).toHaveLength(1);
    const reconstructed = reconstructAggregateFromEvents(events, liveAggregate!.collection_score);

    // INV-013: blended_score must match between live and reconstructed
    expect(reconstructed.blended_score).toBeCloseTo(liveAggregate!.blended_score, 10);
    expect(reconstructed.personal_score).toBeCloseTo(liveAggregate!.personal_score!, 10);
    expect(reconstructed.sample_count).toBe(liveAggregate!.sample_count);

    // Independent derivation: blended_score is derivable from the 4 parameters
    assertConservationHolds(liveAggregate!);
    assertConservationHolds(reconstructed);
  });

  // ─── Test 2: Multi-event reconstruction ───────────────────────────

  it('multiple mixed events: reconstructed blended_score matches live aggregate', async () => {
    const nftId = 'agent-inv013-multi';
    const store = new InMemoryReputationStore();
    const service = new ReputationService(store);

    // Seed a cold aggregate
    await store.put(nftId, makeColdAggregate());

    const events: ReputationEvent[] = [
      {
        type: 'quality_signal',
        score: 0.75,
        event_id: 'evt-1',
        agent_id: nftId,
        collection_id: 'c1',
        timestamp: '2026-02-25T01:00:00Z',
      },
      {
        type: 'quality_signal',
        score: 0.9,
        event_id: 'evt-2',
        agent_id: nftId,
        collection_id: 'c1',
        timestamp: '2026-02-25T02:00:00Z',
      },
      {
        type: 'credential_update',
        credential_id: 'cred-1',
        action: 'issued',
        event_id: 'evt-3',
        agent_id: nftId,
        collection_id: 'c1',
        timestamp: '2026-02-25T03:00:00Z',
      },
      {
        type: 'model_performance',
        model_id: 'gpt-4o',
        provider: 'openai',
        pool_id: 'pool-1',
        task_type: 'code_review',
        quality_observation: { score: 0.88 },
        event_id: 'evt-4',
        agent_id: nftId,
        collection_id: 'c1',
        timestamp: '2026-02-25T04:00:00Z',
      },
    ];

    // Live path: process events sequentially
    for (const event of events) {
      await service.processEvent(nftId, event);
    }
    const liveAggregate = await store.get(nftId);
    expect(liveAggregate).toBeDefined();

    // Reconstruction path: replay from stored event log
    const storedEvents = await store.getEventHistory(nftId);
    expect(storedEvents).toHaveLength(4);
    const reconstructed = reconstructAggregateFromEvents(storedEvents, liveAggregate!.collection_score);

    // INV-013: blended_score must match between live and reconstructed
    expect(reconstructed.blended_score).toBeCloseTo(liveAggregate!.blended_score, 10);
    expect(reconstructed.personal_score).toBeCloseTo(liveAggregate!.personal_score!, 10);
    expect(reconstructed.sample_count).toBe(liveAggregate!.sample_count);

    // Independent derivation check
    assertConservationHolds(liveAggregate!);
    assertConservationHolds(reconstructed);
  });

  // ─── Test 3: Empty events reconstruction ──────────────────────────

  it('empty events: reconstruction produces default/neutral aggregate', () => {
    const reconstructed = reconstructAggregateFromEvents([]);

    // Cold aggregate: no events processed
    expect(reconstructed.state).toBe('cold');
    expect(reconstructed.personal_score).toBeNull();
    expect(reconstructed.sample_count).toBe(0);
    expect(reconstructed.pseudo_count).toBe(DEFAULT_PSEUDO_COUNT);
    expect(reconstructed.collection_score).toBe(DEFAULT_COLLECTION_SCORE);

    // INV-013: blended_score for cold aggregate must equal collection_score
    expect(reconstructed.blended_score).toBe(DEFAULT_COLLECTION_SCORE);
    assertConservationHolds(reconstructed);
  });

  // ─── Test 4: Custom collection_score parameter ────────────────────

  it('reconstructAggregateFromEvents accepts custom collection_score and uses it in blending', () => {
    const customCollectionScore = 0.72;

    const events: ReputationEvent[] = [
      {
        type: 'quality_signal',
        score: 0.85,
        event_id: 'evt-1',
        agent_id: 'agent-custom',
        collection_id: 'c1',
        timestamp: '2026-02-25T01:00:00Z',
      },
    ];

    // Reconstruct with custom collection score
    const reconstructed = reconstructAggregateFromEvents(events, customCollectionScore);

    // The collection_score in the output must match what was passed in
    expect(reconstructed.collection_score).toBe(customCollectionScore);

    // Verify blended_score uses the custom collection_score, not DEFAULT_COLLECTION_SCORE
    const expectedBlended = computeBlendedScore(
      reconstructed.personal_score!,
      customCollectionScore,
      reconstructed.sample_count,
      reconstructed.pseudo_count,
    );
    expect(reconstructed.blended_score).toBeCloseTo(expectedBlended, 10);

    // Compare with default collection score to prove the parameter matters
    const defaultReconstructed = reconstructAggregateFromEvents(events);
    expect(defaultReconstructed.collection_score).toBe(DEFAULT_COLLECTION_SCORE);

    // The blended scores must differ when collection_score differs
    // (since personal_score is 0.85 and collection scores are 0.72 vs 0.5)
    expect(reconstructed.blended_score).not.toBeCloseTo(defaultReconstructed.blended_score, 5);

    // Both must independently satisfy INV-013
    assertConservationHolds(reconstructed);
    assertConservationHolds(defaultReconstructed);
  });

  // ─── Test 5: Derivability from 4 parameters at each step ─────────

  it('blended_score is derivable from 4 parameters at every intermediate step', async () => {
    const nftId = 'agent-inv013-stepwise';
    const store = new InMemoryReputationStore();
    const service = new ReputationService(store);

    await store.put(nftId, makeColdAggregate());

    const scores = [0.7, 0.85, 0.6, 0.95, 0.78];

    for (let i = 0; i < scores.length; i++) {
      const event: ReputationEvent = {
        type: 'quality_signal',
        score: scores[i],
        event_id: `evt-${i + 1}`,
        agent_id: nftId,
        collection_id: 'c1',
        timestamp: `2026-02-25T0${i + 1}:00:00Z`,
      };

      await service.processEvent(nftId, event);
      const aggregate = await store.get(nftId);
      expect(aggregate).toBeDefined();

      // INV-013 at every step: blended_score must be derivable from the 4 parameters
      assertConservationHolds(aggregate!);
    }

    // Final reconstruction must also satisfy INV-013
    const allEvents = await store.getEventHistory(nftId);
    const finalLive = await store.get(nftId);
    const finalReconstructed = reconstructAggregateFromEvents(allEvents, finalLive!.collection_score);

    expect(finalReconstructed.blended_score).toBeCloseTo(finalLive!.blended_score, 10);
    assertConservationHolds(finalReconstructed);
  });
});
