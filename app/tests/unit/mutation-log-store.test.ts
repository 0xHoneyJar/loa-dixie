/**
 * MutationLogStore Tests — cycle-009 Sprint 2, Task 2.2
 *
 * Validates:
 * - append with idempotent UUID key
 * - query with various filter combinations
 * - countBySession
 * - parameterized queries (no SQL concatenation)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MutationLogStore } from '../../src/services/mutation-log-store.js';
import type { MutationLogEntry } from '../../src/services/mutation-log-store.js';
import { createMockPool } from '../fixtures/pg-test.js';

function makeEntry(overrides?: Partial<MutationLogEntry>): MutationLogEntry {
  return {
    mutation_id: 'aaaaaaaa-1111-2222-3333-444444444444',
    session_id: 'bbbbbbbb-1111-2222-3333-444444444444',
    actor_id: 'wallet-0x123',
    resource_type: 'reputation',
    mutation_type: 'quality_update',
    payload: { score: 0.85, model: 'gpt-4o' },
    created_at: '2026-02-26T00:00:00Z',
    ...overrides,
  };
}

describe('MutationLogStore', () => {
  let pool: ReturnType<typeof createMockPool>;
  let store: MutationLogStore;

  beforeEach(() => {
    pool = createMockPool();
    store = new MutationLogStore(
      pool as unknown as import('../../src/db/client.js').DbPool,
    );
  });

  describe('append()', () => {
    it('inserts a mutation log entry', async () => {
      const entry = makeEntry();
      pool._setResponse('INSERT INTO governance_mutations', {
        rows: [],
        rowCount: 1,
      });

      await expect(store.append(entry)).resolves.toBeUndefined();

      // Verify parameterized query was used
      const insertQuery = pool._queries.find((q) =>
        q.text.includes('INSERT INTO governance_mutations'),
      );
      expect(insertQuery).toBeDefined();
      expect(insertQuery!.values).toContain(entry.mutation_id);
      expect(insertQuery!.values).toContain(entry.session_id);
    });

    it('uses ON CONFLICT DO NOTHING for idempotency', async () => {
      const entry = makeEntry();
      pool._setResponse('INSERT INTO governance_mutations', {
        rows: [],
        rowCount: 0, // Duplicate — no rows affected
      });

      // Should not throw even on duplicate
      await expect(store.append(entry)).resolves.toBeUndefined();
    });

    it('serializes payload as JSON', async () => {
      const entry = makeEntry({ payload: { nested: { key: 'value' } } });
      pool._setResponse('INSERT INTO governance_mutations', {
        rows: [],
        rowCount: 1,
      });

      await store.append(entry);

      const insertQuery = pool._queries.find((q) =>
        q.text.includes('INSERT INTO governance_mutations'),
      );
      // payload should be JSON-serialized string
      const payloadParam = insertQuery!.values![5];
      expect(typeof payloadParam).toBe('string');
      expect(JSON.parse(payloadParam as string)).toEqual({ nested: { key: 'value' } });
    });
  });

  describe('query()', () => {
    it('queries without filters (returns all)', async () => {
      const entries = [
        makeEntry({ mutation_id: 'aaa-1', mutation_type: 'update' }),
        makeEntry({ mutation_id: 'aaa-2', mutation_type: 'create' }),
      ];
      pool._setResponse('SELECT mutation_id', {
        rows: entries,
        rowCount: 2,
      });

      const result = await store.query({});
      expect(result).toHaveLength(2);
    });

    it('queries with session_id filter', async () => {
      pool._setResponse('SELECT mutation_id', {
        rows: [makeEntry()],
        rowCount: 1,
      });

      const result = await store.query({
        session_id: 'bbbbbbbb-1111-2222-3333-444444444444',
      });
      expect(result).toHaveLength(1);

      // Verify parameterized query
      const selectQuery = pool._queries.find((q) =>
        q.text.includes('session_id'),
      );
      expect(selectQuery!.values).toContain(
        'bbbbbbbb-1111-2222-3333-444444444444',
      );
    });

    it('queries with multiple filters', async () => {
      pool._setResponse('SELECT mutation_id', {
        rows: [],
        rowCount: 0,
      });

      await store.query({
        actor_id: 'wallet-0x123',
        resource_type: 'reputation',
        limit: 10,
      });

      const selectQuery = pool._queries.find((q) =>
        q.text.includes('SELECT mutation_id'),
      );
      expect(selectQuery!.values).toContain('wallet-0x123');
      expect(selectQuery!.values).toContain('reputation');
      expect(selectQuery!.values).toContain(10);
    });

    it('queries with since filter', async () => {
      pool._setResponse('SELECT mutation_id', {
        rows: [],
        rowCount: 0,
      });

      await store.query({ since: '2026-02-25T00:00:00Z' });

      const selectQuery = pool._queries.find((q) =>
        q.text.includes('created_at >='),
      );
      expect(selectQuery).toBeDefined();
    });
  });

  describe('countBySession()', () => {
    it('returns count for a specific session', async () => {
      pool._setResponse('COUNT(*)', {
        rows: [{ count: '7' }],
        rowCount: 1,
      });

      const count = await store.countBySession(
        'bbbbbbbb-1111-2222-3333-444444444444',
      );
      expect(count).toBe(7);
    });

    it('returns 0 for empty session', async () => {
      pool._setResponse('COUNT(*)', {
        rows: [{ count: '0' }],
        rowCount: 1,
      });

      const count = await store.countBySession('non-existent');
      expect(count).toBe(0);
    });
  });
});
