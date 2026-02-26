/**
 * Reputation Event Store — Event sourcing operations extracted from ReputationService.
 *
 * Contains event replay and aggregate reconstruction:
 * - reconstructAggregateFromEvents(): Rebuild aggregate from event stream
 * - seedCollectionAggregator(): Bootstrap population statistics from store
 *
 * Extraction motivated by BB-DEEP-03: ReputationService was approaching god object
 * status (1253 lines, 8+ responsibilities). This module handles the "event sourcing"
 * responsibility as a focused, testable unit.
 *
 * @since cycle-014 Sprint 105 — BB-DEEP-03 (ReputationService extraction)
 */
import {
  computeBlendedScore,
} from '@0xhoneyjar/loa-hounfour/governance';
import type {
  ReputationAggregate,
} from '@0xhoneyjar/loa-hounfour/governance';
import type {
  TaskTypeCohort,
  ReputationEvent,
  DixieReputationAggregate,
} from '../types/reputation-evolution.js';
import {
  computeDampenedScore,
  DEFAULT_PSEUDO_COUNT,
  DEFAULT_COLLECTION_SCORE,
  CollectionScoreAggregator,
} from './reputation-scoring-engine.js';
import type { ReputationStore } from './reputation-service.js';

// ---------------------------------------------------------------------------
// Event Replay — Aggregate Reconstruction
// ---------------------------------------------------------------------------

/**
 * Reconstruct a DixieReputationAggregate from an event stream.
 *
 * Replays events in chronological order through the 4-variant handler:
 * - quality_signal: updates personal_score with the signal's score
 * - task_completed: increments sample count (success tracking)
 * - credential_update: recorded but no score impact
 * - model_performance: extracts quality_observation.score + updates task cohorts
 *
 * The reconstruction pattern:
 * 1. Start with a cold aggregate (zero scores, zero samples)
 * 2. Replay each event in order, updating scores and state
 * 3. Return the final aggregate state with task_cohorts
 *
 * @param events - Array of reputation events in chronological order
 * @returns A DixieReputationAggregate reconstructed from the event stream
 * @since Sprint 10 — Task 10.5
 * @since cycle-007 — Sprint 73, Task S1-T4 (4-variant support)
 */
export function reconstructAggregateFromEvents(
  events: ReadonlyArray<ReputationEvent>,
  collectionScore: number = DEFAULT_COLLECTION_SCORE,
): DixieReputationAggregate {
  let personalScore: number | null = null;
  let sampleCount = 0;
  const taskCohortMap = new Map<string, TaskTypeCohort>();

  for (const event of events) {
    switch (event.type) {
      case 'quality_signal':
        personalScore = computeDampenedScore(personalScore, event.score, sampleCount);
        sampleCount++;
        break;
      case 'task_completed':
        sampleCount++;
        break;
      case 'credential_update':
        // No score impact
        break;
      case 'model_performance': {
        const score = event.quality_observation.score;
        personalScore = computeDampenedScore(personalScore, score, sampleCount);
        sampleCount++;
        // Update task cohort — apply EMA dampening to match live path (S5-F12)
        const key = `${event.model_id}:${event.task_type}`;
        const existing = taskCohortMap.get(key);
        if (existing) {
          const dampenedCohortScore = computeDampenedScore(
            existing.personal_score,
            score,
            existing.sample_count,
          );
          taskCohortMap.set(key, {
            ...existing,
            personal_score: dampenedCohortScore,
            sample_count: existing.sample_count + 1,
            last_updated: event.timestamp,
          });
        } else {
          taskCohortMap.set(key, {
            model_id: event.model_id,
            task_type: event.task_type,
            personal_score: score,
            sample_count: 1,
            last_updated: event.timestamp,
          });
        }
        break;
      }
    }
  }

  const pseudoCount = DEFAULT_PSEUDO_COUNT;
  const blendedScore = personalScore !== null
    ? computeBlendedScore(personalScore, collectionScore, sampleCount, pseudoCount)
    : collectionScore;

  return {
    personality_id: '',
    collection_id: '',
    pool_id: '',
    state: sampleCount === 0 ? 'cold' as const : 'warming' as const,
    personal_score: personalScore,
    collection_score: collectionScore,
    blended_score: blendedScore,
    sample_count: sampleCount,
    pseudo_count: pseudoCount,
    contributor_count: 0,
    min_sample_count: 10,
    created_at: events.length > 0 ? events[0].timestamp : new Date().toISOString(),
    last_updated: events.length > 0 ? events[events.length - 1].timestamp : new Date().toISOString(),
    transition_history: [],
    contract_version: '8.2.0',
    task_cohorts: Array.from(taskCohortMap.values()),
  };
}

// ---------------------------------------------------------------------------
// Startup Seeding — Two-Phase CollectionScoreAggregator Bootstrap
// ---------------------------------------------------------------------------

/**
 * Seed a CollectionScoreAggregator from an existing ReputationStore.
 *
 * Two-phase approach per SDD §2.2:
 * 1. Load all aggregates from PG (paginated batch of 1000, 5s max)
 * 2. Feed each agent's personal_score into a fresh aggregator
 * 3. Return the seeded aggregator for swap-on-complete
 *
 * On failure, returns a neutral aggregator (mean=0.5 via DEFAULT_COLLECTION_SCORE).
 *
 * @param store - The reputation store to read from
 * @param timeoutMs - Maximum time for seeding (default: 5000ms)
 * @returns Promise<{ aggregator, seeded, agentCount }>
 * @since cycle-011 — Sprint 82, Task T1.4
 */
export async function seedCollectionAggregator(
  store: ReputationStore,
  timeoutMs = 5000,
): Promise<{ aggregator: CollectionScoreAggregator; seeded: boolean; agentCount: number }> {
  const aggregator = new CollectionScoreAggregator();

  try {
    const deadline = Date.now() + timeoutMs;
    const allAgents = await store.listAll();

    let count = 0;
    for (const { aggregate } of allAgents) {
      if (Date.now() > deadline) break;
      if (aggregate.personal_score !== null) {
        aggregator.update(aggregate.personal_score);
        count++;
      }
    }

    return { aggregator, seeded: count > 0, agentCount: count };
  } catch {
    // Failure: return neutral aggregator (mean defaults to DEFAULT_COLLECTION_SCORE = 0.5)
    return { aggregator: new CollectionScoreAggregator(), seeded: false, agentCount: 0 };
  }
}
