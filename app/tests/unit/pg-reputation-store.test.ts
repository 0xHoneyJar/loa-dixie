import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresReputationStore } from '../../src/db/pg-reputation-store.js';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';
import type { TaskTypeCohort, ReputationEvent } from '../../src/types/reputation-evolution.js';

/** Create a mock pg.Pool that tracks queries */
function createMockPool() {
  const queryFn = vi.fn();
  return { query: queryFn } as unknown as import('pg').Pool;
}

function makeAggregate(overrides: Partial<ReputationAggregate> = {}): ReputationAggregate {
  return {
    personality_id: 'test-nft-1',
    collection_id: 'col-1',
    pool_id: 'pool-1',
    state: 'cold',
    personal_score: null,
    collection_score: 0.5,
    blended_score: 0.5,
    sample_count: 0,
    pseudo_count: 10,
    contributor_count: 0,
    min_sample_count: 10,
    created_at: '2026-01-01T00:00:00Z',
    last_updated: '2026-01-01T00:00:00Z',
    transition_history: [],
    contract_version: '7.11.0',
    ...overrides,
  };
}

function makeCohort(overrides: Partial<TaskTypeCohort> = {}): TaskTypeCohort {
  return {
    model_id: 'gpt-4o',
    task_type: 'code_review',
    personal_score: 0.8,
    sample_count: 15,
    collection_id: 'col-1',
    pool_id: 'pool-1',
    ...overrides,
  } as TaskTypeCohort;
}

function makeEvent(type: string = 'quality_signal'): ReputationEvent {
  return {
    type,
    event_id: 'evt-1',
    agent_id: 'agent-1',
    collection_id: 'col-1',
    timestamp: '2026-01-01T00:00:00Z',
    task_type: 'code_review',
    score: 0.9,
    model_id: 'gpt-4o',
  } as unknown as ReputationEvent;
}

describe('PostgresReputationStore', () => {
  let pool: ReturnType<typeof createMockPool>;
  let store: PostgresReputationStore;

  beforeEach(() => {
    pool = createMockPool();
    store = new PostgresReputationStore(pool);
  });

  describe('get', () => {
    it('returns aggregate when found', async () => {
      const aggregate = makeAggregate();
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ aggregate }],
      });
      const result = await store.get('nft-1');
      expect(result).toEqual(aggregate);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT aggregate FROM reputation_aggregates'),
        ['nft-1'],
      );
    });

    it('returns undefined when not found', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
      const result = await store.get('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('put', () => {
    it('upserts aggregate with state extraction', async () => {
      const aggregate = makeAggregate({ state: 'warming' });
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
      await store.put('nft-1', aggregate);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (nft_id) DO UPDATE'),
        ['nft-1', 'warming', JSON.stringify(aggregate)],
      );
    });

    it('extracts state field for indexing', async () => {
      const aggregate = makeAggregate({ state: 'established' });
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
      await store.put('nft-1', aggregate);
      const args = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(args[1]).toBe('established');
    });
  });

  describe('listCold', () => {
    it('returns only cold aggregates', async () => {
      const agg1 = makeAggregate();
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ nft_id: 'nft-1', aggregate: agg1 }],
      });
      const result = await store.listCold();
      expect(result).toEqual([{ nftId: 'nft-1', aggregate: agg1 }]);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("state = 'cold'"),
      );
    });
  });

  describe('count', () => {
    it('returns total count', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ count: 42 }],
      });
      const result = await store.count();
      expect(result).toBe(42);
    });
  });

  describe('listAll', () => {
    it('returns all aggregates', async () => {
      const agg1 = makeAggregate();
      const agg2 = makeAggregate({ state: 'warming' });
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [
          { nft_id: 'nft-1', aggregate: agg1 },
          { nft_id: 'nft-2', aggregate: agg2 },
        ],
      });
      const result = await store.listAll();
      expect(result).toHaveLength(2);
      expect(result[0].nftId).toBe('nft-1');
      expect(result[1].nftId).toBe('nft-2');
    });
  });

  describe('getTaskCohort', () => {
    it('returns cohort when found', async () => {
      const cohort = makeCohort();
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ cohort }],
      });
      const result = await store.getTaskCohort('nft-1', 'gpt-4o', 'code_review');
      expect(result).toEqual(cohort);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('model_id = $2 AND task_type = $3'),
        ['nft-1', 'gpt-4o', 'code_review'],
      );
    });

    it('returns undefined when not found', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
      const result = await store.getTaskCohort('nft-1', 'gpt-4o', 'analysis');
      expect(result).toBeUndefined();
    });
  });

  describe('putTaskCohort', () => {
    it('upserts on composite key', async () => {
      const cohort = makeCohort({ model_id: 'native', task_type: 'analysis' });
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
      await store.putTaskCohort('nft-1', cohort);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (nft_id, model_id, task_type) DO UPDATE'),
        ['nft-1', 'native', 'analysis', JSON.stringify(cohort)],
      );
    });
  });

  describe('appendEvent', () => {
    it('inserts event with extracted type', async () => {
      const event = makeEvent('quality_signal');
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
      await store.appendEvent('nft-1', event);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reputation_events'),
        ['nft-1', 'quality_signal', JSON.stringify(event)],
      );
    });
  });

  describe('getEventHistory', () => {
    it('returns events in chronological order', async () => {
      const evt1 = makeEvent('quality_signal');
      const evt2 = makeEvent('task_completed');
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ event: evt1 }, { event: evt2 }],
      });
      const result = await store.getEventHistory('nft-1');
      expect(result).toHaveLength(2);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at ASC'),
        ['nft-1', 1000],
      );
    });

    it('returns empty array when no events', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
      const result = await store.getEventHistory('nft-1');
      expect(result).toEqual([]);
    });
  });

  describe('JSONB round-trip', () => {
    it('aggregate serializes and deserializes correctly', async () => {
      const aggregate = makeAggregate({
        state: 'established',
        personal_score: 0.85,
        sample_count: 25,
        transition_history: [
          { from: 'cold', to: 'warming', timestamp: '2026-01-01T00:00:00Z' },
          { from: 'warming', to: 'established', timestamp: '2026-01-02T00:00:00Z' },
        ] as unknown as ReputationAggregate['transition_history'],
      });

      // Simulate put (serialization)
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });
      await store.put('nft-round-trip', aggregate);
      const putArgs = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const serialized = putArgs[2] as string;

      // Simulate get (deserialization)
      const parsed = JSON.parse(serialized);
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ aggregate: parsed }],
      });
      const result = await store.get('nft-round-trip');

      expect(result).toEqual(aggregate);
    });
  });
});
