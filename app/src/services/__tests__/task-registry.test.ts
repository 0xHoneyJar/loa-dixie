/**
 * Task Registry Unit Tests — CRUD, State Machine, Failure Recording
 *
 * Uses mocked PG pool. Tests all CRUD operations, every valid/invalid
 * state transition, optimistic concurrency, and failure recording.
 *
 * @since cycle-012 — Sprint 86, Tasks T-1.7, T-1.8, T-1.9
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TaskRegistry,
  VALID_TRANSITIONS,
  TERMINAL_STATUSES,
  InvalidTransitionError,
  StaleVersionError,
  TaskNotFoundError,
  ActiveTaskDeletionError,
} from '../task-registry.js';
import type { FleetTaskStatus } from '../../types/fleet.js';

// ---------------------------------------------------------------------------
// Mock PG Pool
// ---------------------------------------------------------------------------

function createMockPool() {
  return {
    query: vi.fn(),
  } as unknown as import('../../db/client.js').DbPool;
}

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'test-uuid-1',
    operator_id: 'operator-1',
    agent_type: 'claude_code',
    model: 'claude-opus-4-6',
    task_type: 'feature',
    description: 'Test task',
    branch: 'fleet/test-uuid-1',
    worktree_path: null,
    container_id: null,
    tmux_session: null,
    status: 'proposed',
    version: 0,
    pr_number: null,
    ci_status: null,
    review_status: null,
    retry_count: 0,
    max_retries: 3,
    context_hash: null,
    failure_context: null,
    spawned_at: null,
    completed_at: null,
    created_at: '2026-02-26T00:00:00Z',
    updated_at: '2026-02-26T00:00:00Z',
    agent_identity_id: null,
    group_id: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T-1.7: CRUD Tests
// ---------------------------------------------------------------------------

describe('TaskRegistry — CRUD', () => {
  let pool: ReturnType<typeof createMockPool>;
  let registry: TaskRegistry;

  beforeEach(() => {
    pool = createMockPool();
    registry = new TaskRegistry(pool as import('../../db/client.js').DbPool);
  });

  describe('create()', () => {
    it('inserts a record and returns it with proposed status', async () => {
      const row = makeRow();
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [row] });

      const result = await registry.create({
        operatorId: 'operator-1',
        agentType: 'claude_code',
        model: 'claude-opus-4-6',
        taskType: 'feature',
        description: 'Test task',
        branch: 'fleet/test-uuid-1',
      });

      expect(result.id).toBe('test-uuid-1');
      expect(result.status).toBe('proposed');
      expect(result.version).toBe(0);
      expect(result.operatorId).toBe('operator-1');
    });

    it('uses default maxRetries of 3', async () => {
      const row = makeRow({ max_retries: 3 });
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [row] });

      await registry.create({
        operatorId: 'op-1',
        agentType: 'claude_code',
        model: 'claude-opus-4-6',
        taskType: 'feature',
        description: 'Test',
        branch: 'fleet/test',
      });

      const call = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1][6]).toBe(3); // maxRetries param
    });

    it('uses provided maxRetries', async () => {
      const row = makeRow({ max_retries: 5 });
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [row] });

      await registry.create({
        operatorId: 'op-1',
        agentType: 'claude_code',
        model: 'claude-opus-4-6',
        taskType: 'feature',
        description: 'Test',
        branch: 'fleet/test',
        maxRetries: 5,
      });

      const call = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1][6]).toBe(5);
    });
  });

  describe('get()', () => {
    it('returns record for existing task', async () => {
      const row = makeRow();
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [row] });

      const result = await registry.get('test-uuid-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('test-uuid-1');
    });

    it('returns null for unknown ID', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

      const result = await registry.get('unknown-id');
      expect(result).toBeNull();
    });
  });

  describe('query()', () => {
    it('returns all tasks when no filters', async () => {
      const rows = [makeRow(), makeRow({ id: 'test-uuid-2' })];
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows });

      const results = await registry.query();
      expect(results).toHaveLength(2);
    });

    it('filters by status (single)', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [makeRow()] });

      await registry.query({ status: 'proposed' });
      const sql = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sql).toContain('status = $1');
    });

    it('filters by status (array)', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

      await registry.query({ status: ['proposed', 'running'] });
      const sql = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sql).toContain('status = ANY($1)');
    });

    it('filters by operatorId', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

      await registry.query({ operatorId: 'op-1' });
      const sql = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(sql).toContain('operator_id = $1');
    });

    it('respects limit default of 50', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

      await registry.query();
      const params = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params[params.length - 1]).toBe(50);
    });

    it('respects custom limit', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

      await registry.query({ limit: 10 });
      const params = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params[params.length - 1]).toBe(10);
    });
  });

  describe('countActive()', () => {
    it('counts non-terminal tasks for operator', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      const count = await registry.countActive('op-1');
      expect(count).toBe(5);
      const params = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(params[0]).toBe('op-1');
    });
  });

  describe('countAllActive()', () => {
    it('counts all non-terminal tasks', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [{ count: '12' }],
      });

      const count = await registry.countAllActive();
      expect(count).toBe(12);
    });
  });

  describe('delete()', () => {
    it('succeeds for terminal tasks', async () => {
      // get() call
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [makeRow({ status: 'merged' })],
      });
      // delete() call
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

      await expect(registry.delete('test-uuid-1')).resolves.toBeUndefined();
    });

    it('throws ActiveTaskDeletionError for active tasks', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [makeRow({ status: 'running' })],
      });

      await expect(registry.delete('test-uuid-1')).rejects.toThrow(ActiveTaskDeletionError);
    });

    it('throws TaskNotFoundError for unknown tasks', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

      await expect(registry.delete('unknown')).rejects.toThrow(TaskNotFoundError);
    });
  });

  describe('listLive()', () => {
    it('returns non-terminal tasks ordered by created_at', async () => {
      const rows = [
        makeRow({ status: 'running' }),
        makeRow({ id: 'test-uuid-2', status: 'spawning' }),
      ];
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows });

      const results = await registry.listLive();
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('running');
    });
  });
});

// ---------------------------------------------------------------------------
// T-1.8: State Machine Transition Tests
// ---------------------------------------------------------------------------

describe('TaskRegistry — State Machine', () => {
  let pool: ReturnType<typeof createMockPool>;
  let registry: TaskRegistry;

  beforeEach(() => {
    pool = createMockPool();
    registry = new TaskRegistry(pool as import('../../db/client.js').DbPool);
  });

  describe('VALID_TRANSITIONS constant', () => {
    it('has entries for all 12 statuses', () => {
      const allStatuses: FleetTaskStatus[] = [
        'proposed', 'spawning', 'running', 'pr_created', 'reviewing',
        'ready', 'merged', 'failed', 'retrying', 'abandoned', 'rejected', 'cancelled',
      ];
      for (const status of allStatuses) {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
      }
    });

    it('terminal statuses have empty transition arrays', () => {
      expect(VALID_TRANSITIONS.merged).toEqual([]);
      expect(VALID_TRANSITIONS.abandoned).toEqual([]);
      expect(VALID_TRANSITIONS.cancelled).toEqual([]);
    });
  });

  describe('TERMINAL_STATUSES constant', () => {
    it('contains merged, abandoned, cancelled', () => {
      expect(TERMINAL_STATUSES.has('merged')).toBe(true);
      expect(TERMINAL_STATUSES.has('abandoned')).toBe(true);
      expect(TERMINAL_STATUSES.has('cancelled')).toBe(true);
    });

    it('does not contain active statuses', () => {
      expect(TERMINAL_STATUSES.has('proposed')).toBe(false);
      expect(TERMINAL_STATUSES.has('running')).toBe(false);
      expect(TERMINAL_STATUSES.has('retrying')).toBe(false);
    });
  });

  // Test all VALID transitions
  const validTransitionCases: [FleetTaskStatus, FleetTaskStatus][] = [
    ['proposed', 'spawning'],
    ['spawning', 'running'],
    ['spawning', 'failed'],
    ['running', 'pr_created'],
    ['running', 'failed'],
    ['running', 'cancelled'],
    ['pr_created', 'reviewing'],
    ['pr_created', 'cancelled'],
    ['reviewing', 'ready'],
    ['reviewing', 'rejected'],
    ['ready', 'merged'],
    ['failed', 'retrying'],
    ['failed', 'abandoned'],
    ['rejected', 'retrying'],
    ['retrying', 'spawning'],
    ['retrying', 'abandoned'],
  ];

  describe('valid transitions', () => {
    for (const [from, to] of validTransitionCases) {
      it(`allows ${from} → ${to}`, async () => {
        // get() for validation
        (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          rows: [makeRow({ status: from, version: 0 })],
        });
        // UPDATE ... RETURNING
        (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          rows: [makeRow({ status: to, version: 1 })],
        });

        const result = await registry.transition('test-uuid-1', 0, to);
        expect(result.status).toBe(to);
        expect(result.version).toBe(1);
      });
    }
  });

  // Test INVALID transitions
  const invalidTransitionCases: [FleetTaskStatus, FleetTaskStatus][] = [
    ['proposed', 'running'],
    ['proposed', 'failed'],
    ['proposed', 'merged'],
    ['running', 'spawning'],
    ['running', 'merged'],
    ['merged', 'proposed'],
    ['merged', 'running'],
    ['merged', 'failed'],
    ['abandoned', 'retrying'],
    ['abandoned', 'spawning'],
    ['cancelled', 'running'],
    ['cancelled', 'retrying'],
    ['ready', 'failed'],
    ['reviewing', 'running'],
    ['rejected', 'merged'],
  ];

  describe('invalid transitions', () => {
    for (const [from, to] of invalidTransitionCases) {
      it(`rejects ${from} → ${to}`, async () => {
        (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          rows: [makeRow({ status: from })],
        });

        await expect(registry.transition('test-uuid-1', 0, to)).rejects.toThrow(
          InvalidTransitionError,
        );
      });
    }
  });

  describe('optimistic concurrency', () => {
    it('throws StaleVersionError when version mismatch', async () => {
      // get() returns version 2 but we pass expectedVersion 0
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [makeRow({ status: 'proposed', version: 2 })],
      });
      // UPDATE returns 0 rows (version mismatch)
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [],
      });

      await expect(registry.transition('test-uuid-1', 0, 'spawning')).rejects.toThrow(
        StaleVersionError,
      );
    });
  });

  describe('metadata during transition', () => {
    it('updates prNumber during transition', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [makeRow({ status: 'running' })],
      });
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [makeRow({ status: 'pr_created', pr_number: 42 })],
      });

      const result = await registry.transition('test-uuid-1', 0, 'pr_created', {
        prNumber: 42,
      });
      expect(result.prNumber).toBe(42);
    });

    it('updates spawnedAt during transition', async () => {
      const ts = '2026-02-26T12:00:00Z';
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [makeRow({ status: 'proposed' })],
      });
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [makeRow({ status: 'spawning', spawned_at: ts })],
      });

      const result = await registry.transition('test-uuid-1', 0, 'spawning', {
        spawnedAt: ts,
      });
      expect(result.spawnedAt).toBe(ts);
    });

    it('updates completedAt during transition', async () => {
      const ts = '2026-02-26T14:00:00Z';
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [makeRow({ status: 'ready' })],
      });
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [makeRow({ status: 'merged', completed_at: ts })],
      });

      const result = await registry.transition('test-uuid-1', 0, 'merged', {
        completedAt: ts,
      });
      expect(result.completedAt).toBe(ts);
    });

    it('updates ciStatus during transition', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [makeRow({ status: 'pr_created' })],
      });
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [makeRow({ status: 'reviewing', ci_status: 'passing' })],
      });

      const result = await registry.transition('test-uuid-1', 0, 'reviewing', {
        ciStatus: 'passing',
      });
      expect(result.ciStatus).toBe('passing');
    });
  });

  describe('error cases', () => {
    it('throws TaskNotFoundError for unknown task', async () => {
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ rows: [] });

      await expect(registry.transition('unknown', 0, 'spawning')).rejects.toThrow(
        TaskNotFoundError,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// T-1.9: Failure Recording Tests
// ---------------------------------------------------------------------------

describe('TaskRegistry — Failure Recording', () => {
  let pool: ReturnType<typeof createMockPool>;
  let registry: TaskRegistry;

  beforeEach(() => {
    pool = createMockPool();
    registry = new TaskRegistry(pool as import('../../db/client.js').DbPool);
  });

  it('increments retry_count and stores failure_context', async () => {
    const ctx = { error: 'OOM', exitCode: 137 };
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [makeRow({ retry_count: 1, failure_context: ctx })],
    });

    const result = await registry.recordFailure('test-uuid-1', ctx);
    expect(result).not.toBeNull();
    expect(result!.retryCount).toBe(1);
    expect(result!.failureContext).toEqual(ctx);
  });

  it('stores failure_context as JSONB', async () => {
    const ctx = { error: 'timeout', elapsed: 7200 };
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [makeRow({ failure_context: ctx })],
    });

    await registry.recordFailure('test-uuid-1', ctx);
    const params = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0][1];
    // First param should be stringified JSON
    expect(params[0]).toBe(JSON.stringify(ctx));
  });

  it('returns null when retry_count at max_retries', async () => {
    // UPDATE returns 0 rows (WHERE retry_count < max_retries fails)
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [],
    });

    const result = await registry.recordFailure('test-uuid-1', { error: 'max reached' });
    expect(result).toBeNull();
  });

  it('uses atomic WHERE guard for concurrent safety', async () => {
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [makeRow({ retry_count: 1 })],
    });

    await registry.recordFailure('test-uuid-1', { error: 'test' });
    const sql = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(sql).toContain('retry_count < max_retries');
  });
});
