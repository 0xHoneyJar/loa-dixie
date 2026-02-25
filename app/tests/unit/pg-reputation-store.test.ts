/**
 * PostgreSQLReputationStore Tests — cycle-009 Sprint 1, Task 1.5
 *
 * Validates all 9 ReputationStore interface methods against mock PG pool:
 * - get/put with JSONB round-trip
 * - listCold, listAll, count
 * - getTaskCohort/putTaskCohort
 * - appendEvent/getEventHistory
 * - Optimistic concurrency (ConflictError)
 *
 * Uses mock pool — no real PostgreSQL required.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  PostgreSQLReputationStore,
  ConflictError,
} from '../../src/services/pg-reputation-store.js';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';
import type { TaskTypeCohort } from '../../src/types/reputation-evolution.js';
import { createMockPool } from '../fixtures/pg-test.js';

function makeAggregate(overrides?: Partial<ReputationAggregate>): ReputationAggregate {
  return {
    personality_id: 'test-personality',
    collection_id: 'test-collection',
    pool_id: 'test-pool',
    state: 'cold',
    personal_score: null,
    collection_score: 0.5,
    blended_score: 0.5,
    sample_count: 0,
    pseudo_count: 10,
    contributor_count: 0,
    min_sample_count: 10,
    model_cohorts: [],
    created_at: '2026-01-01T00:00:00Z',
    last_updated: '2026-01-01T00:00:00Z',
    transition_history: [],
    contract_version: '7.11.0',
    ...overrides,
  };
}

describe('PostgreSQLReputationStore', () => {
  let pool: ReturnType<typeof createMockPool>;
  let store: PostgreSQLReputationStore;

  beforeEach(() => {
    pool = createMockPool();
    store = new PostgreSQLReputationStore(
      pool as unknown as import('../../src/db/client.js').DbPool,
    );
  });

  describe('get()', () => {
    it('returns undefined when no aggregate exists', async () => {
      const result = await store.get('nft-1');
      expect(result).toBeUndefined();
    });

    it('returns the aggregate when found', async () => {
      const agg = makeAggregate({ state: 'warming' });
      pool._setResponse('SELECT data FROM reputation_aggregates', {
        rows: [{ data: agg }],
        rowCount: 1,
      });

      const result = await store.get('nft-1');
      expect(result).toEqual(agg);
      expect(result?.state).toBe('warming');
    });
  });

  describe('put()', () => {
    it('inserts a new aggregate when none exists', async () => {
      const agg = makeAggregate({ blended_score: 0.75, sample_count: 5 });

      // UPDATE returns 0 (no existing row), INSERT succeeds
      pool._setResponse('UPDATE reputation_aggregates', {
        rows: [],
        rowCount: 0,
      });
      pool._setResponse('INSERT INTO reputation_aggregates', {
        rows: [{ version: 0 }],
        rowCount: 1,
      });

      await expect(store.put('nft-1', agg)).resolves.toBeUndefined();
    });

    it('updates an existing aggregate with version increment', async () => {
      const agg = makeAggregate({ blended_score: 0.8 });

      // UPDATE succeeds (version matched)
      pool._setResponse('UPDATE reputation_aggregates', {
        rows: [{ version: 2 }],
        rowCount: 1,
      });

      await expect(store.put('nft-1', agg)).resolves.toBeUndefined();
    });

    it('succeeds with correct expectedVersion', async () => {
      const agg = makeAggregate({ blended_score: 0.9 });

      // UPDATE with version match succeeds
      pool._setResponse('UPDATE reputation_aggregates', {
        rows: [{ version: 6 }],
        rowCount: 1,
      });

      await expect(store.put('nft-1', agg, 5)).resolves.toBeUndefined();

      // Verify the query included the version parameter
      const updateQuery = pool._queries.find(
        (q) => q.text.includes('UPDATE') && q.text.includes('version'),
      );
      expect(updateQuery).toBeDefined();
      expect(updateQuery!.values).toContain(5);
    });

    it('throws ConflictError when expectedVersion is stale', async () => {
      const agg = makeAggregate({ blended_score: 0.9 });

      // UPDATE with stale version returns 0 rows
      pool._setResponse('UPDATE reputation_aggregates', {
        rows: [],
        rowCount: 0,
      });

      await expect(store.put('nft-1', agg, 3)).rejects.toThrow(ConflictError);
      await expect(store.put('nft-1', agg, 3)).rejects.toThrow('nft-1');
    });
  });

  describe('listCold()', () => {
    it('returns only aggregates in cold state', async () => {
      const coldAgg = makeAggregate({ state: 'cold' });
      pool._setResponse('WHERE state', {
        rows: [{ nft_id: 'nft-1', data: coldAgg }],
        rowCount: 1,
      });

      const result = await store.listCold();
      expect(result).toHaveLength(1);
      expect(result[0].nftId).toBe('nft-1');
      expect(result[0].aggregate.state).toBe('cold');
    });
  });

  describe('count()', () => {
    it('returns the total number of aggregates', async () => {
      pool._setResponse('COUNT(*)', {
        rows: [{ count: '42' }],
        rowCount: 1,
      });

      const result = await store.count();
      expect(result).toBe(42);
    });
  });

  describe('listAll()', () => {
    it('returns all aggregates', async () => {
      const agg1 = makeAggregate({ state: 'cold' });
      const agg2 = makeAggregate({ state: 'warming' });
      pool._setResponse('SELECT nft_id, data FROM reputation_aggregates', {
        rows: [
          { nft_id: 'nft-1', data: agg1 },
          { nft_id: 'nft-2', data: agg2 },
        ],
        rowCount: 2,
      });

      const result = await store.listAll();
      expect(result).toHaveLength(2);
    });
  });

  describe('getTaskCohort()', () => {
    it('returns undefined when cohort not found', async () => {
      const result = await store.getTaskCohort('nft-1', 'gpt-4o', 'code_review');
      expect(result).toBeUndefined();
    });

    it('returns cohort when found', async () => {
      const cohort: TaskTypeCohort = {
        model_id: 'gpt-4o',
        task_type: 'code_review',
        personal_score: 0.85,
        sample_count: 15,
        last_updated: '2026-01-01T00:00:00Z',
      };
      pool._setResponse('SELECT data FROM reputation_task_cohorts', {
        rows: [{ data: cohort }],
        rowCount: 1,
      });

      const result = await store.getTaskCohort('nft-1', 'gpt-4o', 'code_review');
      expect(result?.personal_score).toBe(0.85);
    });
  });

  describe('putTaskCohort()', () => {
    it('upserts a task cohort', async () => {
      const cohort: TaskTypeCohort = {
        model_id: 'gpt-4o',
        task_type: 'analysis',
        personal_score: 0.9,
        sample_count: 20,
        last_updated: '2026-01-01T00:00:00Z',
      };

      pool._setResponse('INSERT INTO reputation_task_cohorts', {
        rows: [],
        rowCount: 1,
      });

      await expect(store.putTaskCohort('nft-1', cohort)).resolves.toBeUndefined();
    });
  });

  describe('appendEvent()', () => {
    it('inserts a reputation event', async () => {
      const event = {
        type: 'quality_signal' as const,
        event_id: 'evt-1',
        agent_id: 'agent-1',
        collection_id: 'col-1',
        timestamp: '2026-01-01T00:00:00Z',
        model_id: 'gpt-4o',
        task_type: 'code_review',
        quality_score: 0.85,
        confidence: 0.9,
      };

      pool._setResponse('INSERT INTO reputation_events', {
        rows: [],
        rowCount: 1,
      });

      await expect(store.appendEvent('nft-1', event)).resolves.toBeUndefined();
    });
  });

  describe('getEventHistory()', () => {
    it('returns empty array when no events exist', async () => {
      const result = await store.getEventHistory('nft-1');
      expect(result).toEqual([]);
    });

    it('returns events in insertion order', async () => {
      const events = [
        {
          type: 'quality_signal',
          event_id: 'evt-1',
          timestamp: '2026-01-01T00:00:00Z',
        },
        {
          type: 'quality_signal',
          event_id: 'evt-2',
          timestamp: '2026-01-01T01:00:00Z',
        },
      ];
      pool._setResponse('SELECT data FROM reputation_events', {
        rows: events.map((e) => ({ data: e })),
        rowCount: 2,
      });

      const result = await store.getEventHistory('nft-1');
      expect(result).toHaveLength(2);
      expect(result[0].event_id).toBe('evt-1');
    });
  });
});

describe('ConflictError', () => {
  it('has correct properties', () => {
    const err = new ConflictError('nft-1', 5);
    expect(err.name).toBe('ConflictError');
    expect(err.nftId).toBe('nft-1');
    expect(err.expectedVersion).toBe(5);
    expect(err.message).toContain('nft-1');
    expect(err.message).toContain('5');
  });
});
