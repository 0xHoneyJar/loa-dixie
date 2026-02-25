/**
 * Sprint 10: Reputation Evolution — Per-Model Per-Task Cohorts
 *
 * Tests for:
 * - Task 10.1: TaskTypeCohort types and TASK_TYPES taxonomy
 * - Task 10.2: Task-type keyed reputation storage (getTaskCohort, putTaskCohort)
 * - Task 10.3: Task-aware cross-model scoring (computeTaskAwareCrossModelScore)
 * - Task 10.4: Economic boundary uses task-specific reputation
 * - Task 10.5: Event sourcing foundation (append events, retrieve, reconstruct stub)
 * - Cold start → warm path transition for task-specific cohorts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InMemoryReputationStore,
  computeTaskAwareCrossModelScore,
  reconstructAggregateFromEvents,
  TASK_MATCH_WEIGHT_MULTIPLIER,
  TASK_TYPES,
} from '../../src/services/reputation-service.js';
import type {
  TaskTypeCohort,
  ReputationEvent,
  DixieReputationAggregate,
  ReputationAggregate,
} from '../../src/services/reputation-service.js';
import {
  evaluateEconomicBoundaryForWallet,
} from '../../src/services/conviction-boundary.js';
import type { EconomicBoundaryOptions } from '../../src/services/conviction-boundary.js';

// --- Fixtures ---

function makeTaskCohort(overrides: Partial<TaskTypeCohort> = {}): TaskTypeCohort {
  return {
    model_id: 'gpt-4o',
    personal_score: 0.85,
    sample_count: 15,
    last_updated: '2026-02-01T00:00:00Z',
    task_type: 'code_review',
    ...overrides,
  };
}

function makeAggregate(overrides: Partial<ReputationAggregate> = {}): ReputationAggregate {
  return {
    personality_id: 'p1',
    collection_id: 'c1',
    pool_id: 'pool1',
    state: 'established',
    personal_score: 0.8,
    collection_score: 0.7,
    blended_score: 0.75,
    sample_count: 20,
    pseudo_count: 10,
    contributor_count: 5,
    min_sample_count: 10,
    created_at: '2026-01-01T00:00:00Z',
    last_updated: '2026-02-01T00:00:00Z',
    transition_history: [],
    contract_version: '7.9.2',
    ...overrides,
  };
}

function makeDixieAggregate(
  overrides: Partial<DixieReputationAggregate> = {},
): DixieReputationAggregate {
  return {
    ...makeAggregate(),
    task_cohorts: [
      makeTaskCohort({ model_id: 'gpt-4o', task_type: 'code_review', personal_score: 0.9, sample_count: 12 }),
      makeTaskCohort({ model_id: 'gpt-4o', task_type: 'analysis', personal_score: 0.7, sample_count: 8 }),
      makeTaskCohort({ model_id: 'native', task_type: 'code_review', personal_score: 0.75, sample_count: 5 }),
    ],
    ...overrides,
  };
}

function makeEvent(overrides: Partial<ReputationEvent> = {}): ReputationEvent {
  return {
    type: 'quality_signal',
    timestamp: new Date().toISOString(),
    payload: { score: 0.85, model: 'gpt-4o' },
    ...overrides,
  };
}

// --- Tests ---

describe('Reputation Evolution — Sprint 10', () => {
  describe('Task 10.1: TaskTypeCohort types and TASK_TYPES taxonomy', () => {
    it('TASK_TYPES contains the 6 expected task categories', () => {
      expect(TASK_TYPES).toEqual([
        'code_review',
        'creative_writing',
        'analysis',
        'summarization',
        'general',
        'unspecified',
      ]);
      expect(TASK_TYPES).toHaveLength(6);
    });

    it('TASK_TYPES is readonly (frozen at type level)', () => {
      // The const assertion ensures type-level immutability.
      // At runtime, we verify the array contents are correct.
      const types: readonly string[] = TASK_TYPES;
      expect(types).toContain('code_review');
      expect(types).toContain('general');
    });

    it('TaskTypeCohort extends ModelCohort with task_type', () => {
      const cohort = makeTaskCohort();
      // All ModelCohort fields present
      expect(cohort.model_id).toBe('gpt-4o');
      expect(cohort.personal_score).toBe(0.85);
      expect(cohort.sample_count).toBe(15);
      expect(cohort.last_updated).toBe('2026-02-01T00:00:00Z');
      // Plus task_type
      expect(cohort.task_type).toBe('code_review');
    });

    it('DixieReputationAggregate extends ReputationAggregate with task_cohorts', () => {
      const agg = makeDixieAggregate();
      // Standard ReputationAggregate fields
      expect(agg.personality_id).toBe('p1');
      expect(agg.state).toBe('established');
      // Extended field
      expect(agg.task_cohorts).toBeDefined();
      expect(agg.task_cohorts!.length).toBe(3);
      expect(agg.task_cohorts![0].task_type).toBe('code_review');
    });
  });

  describe('Task 10.2: Task-type keyed reputation storage', () => {
    let store: InMemoryReputationStore;

    beforeEach(() => {
      store = new InMemoryReputationStore();
    });

    it('putTaskCohort stores and getTaskCohort retrieves by composite key', async () => {
      const cohort = makeTaskCohort({
        model_id: 'gpt-4o',
        task_type: 'code_review',
        personal_score: 0.9,
      });
      await store.putTaskCohort('nft-1', cohort);

      const retrieved = await store.getTaskCohort('nft-1', 'gpt-4o', 'code_review');
      expect(retrieved).toBeDefined();
      expect(retrieved!.personal_score).toBe(0.9);
      expect(retrieved!.task_type).toBe('code_review');
      expect(retrieved!.model_id).toBe('gpt-4o');
    });

    it('returns undefined for non-existent task cohort', async () => {
      const retrieved = await store.getTaskCohort('nft-1', 'gpt-4o', 'code_review');
      expect(retrieved).toBeUndefined();
    });

    it('stores multiple cohorts for same nftId with different model+taskType', async () => {
      await store.putTaskCohort('nft-1', makeTaskCohort({
        model_id: 'gpt-4o', task_type: 'code_review', personal_score: 0.9,
      }));
      await store.putTaskCohort('nft-1', makeTaskCohort({
        model_id: 'gpt-4o', task_type: 'analysis', personal_score: 0.7,
      }));
      await store.putTaskCohort('nft-1', makeTaskCohort({
        model_id: 'native', task_type: 'code_review', personal_score: 0.8,
      }));

      const cr = await store.getTaskCohort('nft-1', 'gpt-4o', 'code_review');
      const analysis = await store.getTaskCohort('nft-1', 'gpt-4o', 'analysis');
      const nativeCr = await store.getTaskCohort('nft-1', 'native', 'code_review');

      expect(cr!.personal_score).toBe(0.9);
      expect(analysis!.personal_score).toBe(0.7);
      expect(nativeCr!.personal_score).toBe(0.8);
    });

    it('upserts task cohort with same composite key', async () => {
      await store.putTaskCohort('nft-1', makeTaskCohort({
        model_id: 'gpt-4o', task_type: 'code_review', personal_score: 0.7,
      }));
      await store.putTaskCohort('nft-1', makeTaskCohort({
        model_id: 'gpt-4o', task_type: 'code_review', personal_score: 0.95,
      }));

      const retrieved = await store.getTaskCohort('nft-1', 'gpt-4o', 'code_review');
      expect(retrieved!.personal_score).toBe(0.95);
    });

    it('existing get/put unaffected by task cohort additions', async () => {
      const aggregate = makeAggregate();
      await store.put('nft-1', aggregate);
      await store.putTaskCohort('nft-1', makeTaskCohort());

      const retrieved = await store.get('nft-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.personality_id).toBe('p1');
      expect(retrieved!.state).toBe('established');
      expect(await store.count()).toBe(1);
    });

    it('clear removes task cohorts and events along with aggregates', async () => {
      await store.put('nft-1', makeAggregate());
      await store.putTaskCohort('nft-1', makeTaskCohort());
      await store.appendEvent('nft-1', makeEvent());

      store.clear();

      expect(await store.get('nft-1')).toBeUndefined();
      expect(await store.getTaskCohort('nft-1', 'gpt-4o', 'code_review')).toBeUndefined();
      expect(await store.getEventHistory('nft-1')).toEqual([]);
    });
  });

  describe('Task 10.3: Task-aware cross-model scoring', () => {
    it('returns null when all cohorts are cold', () => {
      const result = computeTaskAwareCrossModelScore([
        { personal_score: null, sample_count: 0, task_type: 'code_review' },
        { personal_score: null, sample_count: 0, task_type: 'analysis' },
      ], 'code_review');
      expect(result).toBeNull();
    });

    it('falls back to standard cross-model scoring when no taskType provided', () => {
      const result = computeTaskAwareCrossModelScore([
        { personal_score: 0.8, sample_count: 10, task_type: 'code_review' },
        { personal_score: 0.6, sample_count: 10, task_type: 'analysis' },
      ]);
      // Standard: (0.8*10 + 0.6*10) / (10+10) = 0.7
      expect(result).toBeCloseTo(0.7, 5);
    });

    it('weights task-matching cohorts higher when taskType provided', () => {
      const result = computeTaskAwareCrossModelScore([
        { personal_score: 0.9, sample_count: 10, task_type: 'code_review' },
        { personal_score: 0.6, sample_count: 10, task_type: 'analysis' },
      ], 'code_review');

      // code_review: weight = 10 * 3.0 = 30, contribution = 0.9 * 30 = 27
      // analysis:    weight = 10,            contribution = 0.6 * 10 = 6
      // total = 33 / 40 = 0.825
      expect(result).toBeCloseTo(0.825, 5);
    });

    it('task-matching cohort dominates with sufficient sample count', () => {
      const result = computeTaskAwareCrossModelScore([
        { personal_score: 0.95, sample_count: 50, task_type: 'code_review' },
        { personal_score: 0.5, sample_count: 5, task_type: 'analysis' },
      ], 'code_review');

      // code_review: weight = 50 * 3.0 = 150, contribution = 0.95 * 150 = 142.5
      // analysis:    weight = 5,               contribution = 0.5 * 5 = 2.5
      // total = 145 / 155 ≈ 0.9355
      expect(result).toBeCloseTo(145 / 155, 4);
      expect(result!).toBeGreaterThan(0.9);
    });

    it('low sample count task-matching cohort defers to collection prior', () => {
      // Information asymmetry: task cohort has only 2 samples
      const result = computeTaskAwareCrossModelScore([
        { personal_score: 0.95, sample_count: 2, task_type: 'code_review' },
        { personal_score: 0.6, sample_count: 30, task_type: 'analysis' },
      ], 'code_review');

      // code_review: weight = 2 * 3.0 = 6,   contribution = 0.95 * 6 = 5.7
      // analysis:    weight = 30,              contribution = 0.6 * 30 = 18
      // total = 23.7 / 36 ≈ 0.6583
      // The score is dominated by the analysis cohort (prior) because
      // task-specific data is insufficient.
      expect(result).toBeCloseTo(23.7 / 36, 3);
      expect(result!).toBeLessThan(0.7); // Dominated by the collection prior
    });

    it('ignores cold cohorts even with task_type match', () => {
      const result = computeTaskAwareCrossModelScore([
        { personal_score: null, sample_count: 0, task_type: 'code_review' },
        { personal_score: 0.7, sample_count: 10, task_type: 'analysis' },
      ], 'code_review');

      // Only analysis cohort is active (no match boost applies)
      expect(result).toBeCloseTo(0.7, 5);
    });

    it('TASK_MATCH_WEIGHT_MULTIPLIER is 3.0', () => {
      expect(TASK_MATCH_WEIGHT_MULTIPLIER).toBe(3.0);
    });
  });

  describe('Task 10.4: Economic boundary uses task-specific reputation', () => {
    // Suppress console.debug for scoring path logs
    beforeEach(() => {
      vi.spyOn(console, 'debug').mockImplementation(() => {});
    });

    it('uses task-specific cohort when taskType and task_cohorts provided', () => {
      const aggregate = makeDixieAggregate({
        personal_score: 0.5, // Low aggregate score
        state: 'established',
        task_cohorts: [
          makeTaskCohort({
            model_id: 'gpt-4o',
            task_type: 'code_review',
            personal_score: 0.95, // High task-specific score
            sample_count: 20,
          }),
        ],
      });

      const opts: EconomicBoundaryOptions = {
        reputationAggregate: aggregate,
        taskType: 'code_review',
      };

      // Builder tier with high task-specific reputation should pass
      const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100, opts);
      expect(result.access_decision.granted).toBe(true);
    });

    it('falls back to aggregate when task_cohorts do not match taskType', () => {
      const aggregate = makeDixieAggregate({
        personal_score: 0.85,
        state: 'established',
        task_cohorts: [
          makeTaskCohort({
            model_id: 'gpt-4o',
            task_type: 'code_review',
            personal_score: 0.9,
            sample_count: 12,
          }),
        ],
      });

      const opts: EconomicBoundaryOptions = {
        reputationAggregate: aggregate,
        taskType: 'creative_writing', // No matching cohort
      };

      // Should fall back to aggregate personal_score=0.85
      const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100, opts);
      expect(result.access_decision.granted).toBe(true);
    });

    it('falls back to tier_default when no aggregate provided', () => {
      const opts: EconomicBoundaryOptions = {
        taskType: 'code_review',
      };

      // Observer with no reputation data → tier_default path (cold/0.0)
      const result = evaluateEconomicBoundaryForWallet('0xabc', 'observer', 100, opts);
      expect(result.access_decision.granted).toBe(false);
    });

    it('falls back to aggregate when task cohort has null personal_score', () => {
      const aggregate = makeDixieAggregate({
        personal_score: 0.8,
        state: 'established',
        task_cohorts: [
          makeTaskCohort({
            model_id: 'gpt-4o',
            task_type: 'code_review',
            personal_score: null, // Cold task cohort
            sample_count: 0,
          }),
        ],
      });

      const opts: EconomicBoundaryOptions = {
        reputationAggregate: aggregate,
        taskType: 'code_review',
      };

      // Should fall back to aggregate (personal_score=0.8)
      const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100, opts);
      expect(result.access_decision.granted).toBe(true);
    });

    it('backward compatible: works without taskType in options', () => {
      const aggregate = makeAggregate({
        personal_score: 0.85,
        state: 'established',
      });

      const opts: EconomicBoundaryOptions = {
        reputationAggregate: aggregate,
      };

      const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100, opts);
      expect(result.access_decision.granted).toBe(true);
    });

    it('logs scoring path via console.debug', () => {
      const debugSpy = vi.spyOn(console, 'debug');

      const aggregate = makeDixieAggregate({
        task_cohorts: [
          makeTaskCohort({
            model_id: 'gpt-4o',
            task_type: 'code_review',
            personal_score: 0.9,
            sample_count: 10,
          }),
        ],
      });

      const opts: EconomicBoundaryOptions = {
        reputationAggregate: aggregate,
        taskType: 'code_review',
      };

      evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100, opts);

      expect(debugSpy).toHaveBeenCalledWith(
        '[conviction-boundary] scoring_path:',
        expect.stringContaining('task_cohort'),
      );
    });
  });

  describe('Task 10.5: Event sourcing foundation', () => {
    let store: InMemoryReputationStore;

    beforeEach(() => {
      store = new InMemoryReputationStore();
    });

    it('appendEvent stores events for an nftId', async () => {
      const event = makeEvent({ timestamp: '2026-02-01T00:00:00Z' });
      await store.appendEvent('nft-1', event);

      const history = await store.getEventHistory('nft-1');
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('quality_signal');
      expect(history[0].timestamp).toBe('2026-02-01T00:00:00Z');
    });

    it('preserves chronological ordering of events', async () => {
      const e1 = makeEvent({ timestamp: '2026-02-01T00:00:00Z', type: 'quality_signal' });
      const e2 = makeEvent({ timestamp: '2026-02-02T00:00:00Z', type: 'task_completed' });
      const e3 = makeEvent({ timestamp: '2026-02-03T00:00:00Z', type: 'credential_update' });

      await store.appendEvent('nft-1', e1);
      await store.appendEvent('nft-1', e2);
      await store.appendEvent('nft-1', e3);

      const history = await store.getEventHistory('nft-1');
      expect(history).toHaveLength(3);
      expect(history[0].timestamp).toBe('2026-02-01T00:00:00Z');
      expect(history[1].timestamp).toBe('2026-02-02T00:00:00Z');
      expect(history[2].timestamp).toBe('2026-02-03T00:00:00Z');
      expect(history[0].type).toBe('quality_signal');
      expect(history[1].type).toBe('task_completed');
      expect(history[2].type).toBe('credential_update');
    });

    it('returns empty array for nftId with no events', async () => {
      const history = await store.getEventHistory('nft-nonexistent');
      expect(history).toEqual([]);
    });

    it('events are isolated per nftId', async () => {
      await store.appendEvent('nft-1', makeEvent({ timestamp: '2026-02-01T00:00:00Z' }));
      await store.appendEvent('nft-2', makeEvent({ timestamp: '2026-02-02T00:00:00Z' }));

      const h1 = await store.getEventHistory('nft-1');
      const h2 = await store.getEventHistory('nft-2');

      expect(h1).toHaveLength(1);
      expect(h2).toHaveLength(1);
      expect(h1[0].timestamp).toBe('2026-02-01T00:00:00Z');
      expect(h2[0].timestamp).toBe('2026-02-02T00:00:00Z');
    });

    it('events are append-only (no mutation of existing events)', async () => {
      const event = makeEvent({ timestamp: '2026-02-01T00:00:00Z', payload: { score: 0.5 } });
      await store.appendEvent('nft-1', event);

      // Append another event
      await store.appendEvent('nft-1', makeEvent({ timestamp: '2026-02-02T00:00:00Z', payload: { score: 0.9 } }));

      const history = await store.getEventHistory('nft-1');
      // First event should be unchanged
      expect(history[0].payload).toEqual({ score: 0.5 });
      expect(history[0].timestamp).toBe('2026-02-01T00:00:00Z');
    });

    describe('reconstructAggregateFromEvents (stub)', () => {
      it('returns a cold-start aggregate from events', () => {
        const events: ReputationEvent[] = [
          makeEvent({ timestamp: '2026-02-01T00:00:00Z' }),
          makeEvent({ timestamp: '2026-02-02T00:00:00Z' }),
          makeEvent({ timestamp: '2026-02-03T00:00:00Z' }),
        ];

        const aggregate = reconstructAggregateFromEvents(events);
        expect(aggregate.state).toBe('warming');
        expect(aggregate.personal_score).toBeUndefined();
        expect(aggregate.sample_count).toBe(3); // Event count recorded
        expect(aggregate.created_at).toBe('2026-02-01T00:00:00Z');
        expect(aggregate.last_updated).toBe('2026-02-03T00:00:00Z');
        expect(aggregate.contract_version).toBe('8.2.0');
        expect(aggregate.task_cohorts).toEqual([]);
      });

      it('returns valid aggregate from empty event stream', () => {
        const aggregate = reconstructAggregateFromEvents([]);
        expect(aggregate.state).toBe('cold');
        expect(aggregate.sample_count).toBe(0);
        expect(aggregate.contract_version).toBe('8.2.0');
      });
    });
  });

  describe('Cold start → warm path transition for task-specific cohorts', () => {
    let store: InMemoryReputationStore;

    beforeEach(() => {
      store = new InMemoryReputationStore();
      vi.spyOn(console, 'debug').mockImplementation(() => {});
    });

    it('new task cohort starts cold (null personal_score)', async () => {
      const coldCohort = makeTaskCohort({
        personal_score: null,
        sample_count: 0,
      });
      await store.putTaskCohort('nft-1', coldCohort);

      const retrieved = await store.getTaskCohort('nft-1', 'gpt-4o', 'code_review');
      expect(retrieved!.personal_score).toBeNull();
      expect(retrieved!.sample_count).toBe(0);
    });

    it('task cohort warms up with increasing samples and non-null score', async () => {
      // Start cold
      await store.putTaskCohort('nft-1', makeTaskCohort({
        personal_score: null,
        sample_count: 0,
      }));

      // Simulate warm-up: first quality signal establishes a score
      await store.putTaskCohort('nft-1', makeTaskCohort({
        personal_score: 0.6,
        sample_count: 3,
      }));

      const warmed = await store.getTaskCohort('nft-1', 'gpt-4o', 'code_review');
      expect(warmed!.personal_score).toBe(0.6);
      expect(warmed!.sample_count).toBe(3);
    });

    it('task cohort score converges with more samples', async () => {
      // Early warm-up: unstable score
      await store.putTaskCohort('nft-1', makeTaskCohort({
        personal_score: 0.6,
        sample_count: 3,
      }));

      // Established: stable score with more samples
      await store.putTaskCohort('nft-1', makeTaskCohort({
        personal_score: 0.82,
        sample_count: 25,
      }));

      const established = await store.getTaskCohort('nft-1', 'gpt-4o', 'code_review');
      expect(established!.personal_score).toBe(0.82);
      expect(established!.sample_count).toBe(25);
    });

    it('cold task cohort in economic boundary falls back to aggregate', () => {
      const aggregate = makeDixieAggregate({
        personal_score: 0.75,
        state: 'established',
        task_cohorts: [
          makeTaskCohort({
            model_id: 'gpt-4o',
            task_type: 'code_review',
            personal_score: null, // Cold!
            sample_count: 0,
          }),
        ],
      });

      const opts: EconomicBoundaryOptions = {
        reputationAggregate: aggregate,
        taskType: 'code_review',
      };

      // Should NOT use the cold task cohort; should fall back to aggregate
      const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100, opts);
      expect(result.access_decision.granted).toBe(true);
    });

    it('warm task cohort in cross-model scoring contributes while cold ones do not', () => {
      const result = computeTaskAwareCrossModelScore([
        { personal_score: null, sample_count: 0, task_type: 'code_review' }, // Cold
        { personal_score: 0.8, sample_count: 10, task_type: 'code_review' }, // Warm
        { personal_score: null, sample_count: 0, task_type: 'analysis' },    // Cold
      ], 'code_review');

      // Only the warm code_review cohort contributes
      // weight = 10 * 3.0 = 30, score = 0.8 * 30 / 30 = 0.8
      expect(result).toBeCloseTo(0.8, 5);
    });

    it('event sourcing tracks the cold → warm transition', async () => {
      // Simulate the transition via events
      await store.appendEvent('nft-1', makeEvent({
        type: 'quality_signal',
        timestamp: '2026-02-01T00:00:00Z',
        payload: { model: 'gpt-4o', task_type: 'code_review', score: null },
      }));
      await store.appendEvent('nft-1', makeEvent({
        type: 'quality_signal',
        timestamp: '2026-02-02T00:00:00Z',
        payload: { model: 'gpt-4o', task_type: 'code_review', score: 0.7 },
      }));
      await store.appendEvent('nft-1', makeEvent({
        type: 'task_completed',
        timestamp: '2026-02-03T00:00:00Z',
        payload: { model: 'gpt-4o', task_type: 'code_review', score: 0.85 },
      }));

      const history = await store.getEventHistory('nft-1');
      expect(history).toHaveLength(3);

      // The first event represents cold state, subsequent events represent warm-up
      expect((history[0].payload as { score: number | null }).score).toBeNull();
      expect((history[1].payload as { score: number }).score).toBe(0.7);
      expect((history[2].payload as { score: number }).score).toBe(0.85);
    });
  });
});
