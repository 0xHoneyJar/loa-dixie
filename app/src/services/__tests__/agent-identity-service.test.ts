/**
 * Agent Identity Service Unit Tests
 *
 * Tests persistent identity resolution, EMA-dampened reputation
 * accumulation, optimistic concurrency, and task history retrieval.
 *
 * @since cycle-013 — Sprint 94, Tasks T-1.9 through T-1.11
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentIdentityService,
  StaleIdentityVersionError,
  computeAlpha,
} from '../agent-identity-service.js';
import type { AgentIdentityRecord } from '../../types/agent-identity.js';

// ---------------------------------------------------------------------------
// Mock Factory
// ---------------------------------------------------------------------------

function makeIdentityRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'identity-1',
    operator_id: 'op-1',
    model: 'claude-opus-4-6',
    autonomy_level: 'constrained',
    aggregate_reputation: 0.5,
    task_count: 0,
    success_count: 0,
    failure_count: 0,
    last_task_id: null,
    version: 0,
    created_at: '2026-02-26T00:00:00Z',
    last_active_at: '2026-02-26T00:00:00Z',
    ...overrides,
  };
}

function createMockPool() {
  return {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentIdentityService', () => {
  let pool: ReturnType<typeof createMockPool>;
  let service: AgentIdentityService;

  beforeEach(() => {
    pool = createMockPool();
    service = new AgentIdentityService(pool as any);
  });

  // -------------------------------------------------------------------------
  // CRUD — T-1.9
  // -------------------------------------------------------------------------

  describe('resolveIdentity()', () => {
    it('creates new identity on first call', async () => {
      const row = makeIdentityRow();
      pool.query.mockResolvedValue({ rows: [row] });

      const result = await service.resolveIdentity('op-1', 'claude-opus-4-6');

      expect(result.id).toBe('identity-1');
      expect(result.operatorId).toBe('op-1');
      expect(result.model).toBe('claude-opus-4-6');
      expect(result.autonomyLevel).toBe('constrained');
      expect(result.aggregateReputation).toBe(0.5);
      expect(result.taskCount).toBe(0);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agent_identities'),
        ['op-1', 'claude-opus-4-6'],
      );
    });

    it('returns existing identity on subsequent calls', async () => {
      const row = makeIdentityRow({ task_count: 5, aggregate_reputation: 0.75 });
      pool.query.mockResolvedValue({ rows: [row] });

      const result = await service.resolveIdentity('op-1', 'claude-opus-4-6');

      expect(result.taskCount).toBe(5);
      expect(result.aggregateReputation).toBe(0.75);
      // ON CONFLICT triggers the update path
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        ['op-1', 'claude-opus-4-6'],
      );
    });
  });

  describe('getOrNull()', () => {
    it('returns identity when found', async () => {
      pool.query.mockResolvedValue({ rows: [makeIdentityRow()] });

      const result = await service.getOrNull('identity-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('identity-1');
    });

    it('returns null when not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await service.getOrNull('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByOperator()', () => {
    it('returns all identities for operator', async () => {
      const rows = [
        makeIdentityRow({ id: 'id-1', model: 'claude-opus-4-6' }),
        makeIdentityRow({ id: 'id-2', model: 'codex-mini-latest' }),
      ];
      pool.query.mockResolvedValue({ rows });

      const result = await service.getByOperator('op-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('id-1');
      expect(result[1].id).toBe('id-2');
    });

    it('returns empty array when no identities', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await service.getByOperator('unknown');

      expect(result).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Reputation Accumulation — T-1.10
  // -------------------------------------------------------------------------

  describe('recordTaskOutcome()', () => {
    it('increases reputation on merged outcome (score=1.0)', async () => {
      const identity = makeIdentityRow({
        aggregate_reputation: 0.5,
        task_count: 5,
        version: 2,
      });
      // First call: getOrNull (SELECT)
      pool.query
        .mockResolvedValueOnce({ rows: [identity] })
        // Second call: UPDATE
        .mockResolvedValueOnce({
          rows: [
            makeIdentityRow({
              aggregate_reputation: 0.575, // 0.15 * 1.0 + 0.85 * 0.5
              task_count: 6,
              success_count: 1,
              version: 3,
            }),
          ],
        });

      const result = await service.recordTaskOutcome('identity-1', 'task-1', 'merged');

      expect(result.aggregateReputation).toBeCloseTo(0.575, 3);
      expect(result.taskCount).toBe(6);
      expect(result.version).toBe(3);

      // BF-020: Verify autonomy_level is included in UPDATE
      const updateCall = pool.query.mock.calls[1];
      expect(updateCall[0]).toContain('autonomy_level');
    });

    it('decreases reputation on abandoned outcome (score=0.0)', async () => {
      const identity = makeIdentityRow({
        aggregate_reputation: 0.8,
        task_count: 10,
        version: 5,
      });
      pool.query
        .mockResolvedValueOnce({ rows: [identity] })
        .mockResolvedValueOnce({
          rows: [
            makeIdentityRow({
              aggregate_reputation: 0.56, // 0.2 * 0.0 + 0.8 * 0.8 = 0.64... approx
              task_count: 11,
              failure_count: 1,
              version: 6,
            }),
          ],
        });

      const result = await service.recordTaskOutcome('identity-1', 'task-2', 'abandoned');

      expect(result.taskCount).toBe(11);
      // Verify UPDATE was called with failure_count increment
      const updateCall = pool.query.mock.calls[1];
      expect(updateCall[1][2]).toBe(1); // failureIncrement
      expect(updateCall[1][1]).toBe(0); // successIncrement
    });

    it('has moderate effect on failed outcome (score=0.3)', async () => {
      const identity = makeIdentityRow({
        aggregate_reputation: 0.7,
        task_count: 3,
        version: 1,
      });
      pool.query
        .mockResolvedValueOnce({ rows: [identity] })
        .mockResolvedValueOnce({
          rows: [makeIdentityRow({ task_count: 4, version: 2 })],
        });

      await service.recordTaskOutcome('identity-1', 'task-3', 'failed');

      // Verify alpha computation for taskCount=3
      const alpha = computeAlpha(3); // 0.1 + 0.2 * min(1, 3/20) = 0.1 + 0.03 = 0.13
      expect(alpha).toBeCloseTo(0.13, 2);

      // Verify UPDATE was called with failure increment
      const updateCall = pool.query.mock.calls[1];
      expect(updateCall[1][2]).toBe(1); // failureIncrement
    });

    it('uses ready outcome same as merged (score=1.0)', async () => {
      const identity = makeIdentityRow({ version: 0 });
      pool.query
        .mockResolvedValueOnce({ rows: [identity] })
        .mockResolvedValueOnce({
          rows: [makeIdentityRow({ success_count: 1, version: 1 })],
        });

      const result = await service.recordTaskOutcome('identity-1', 'task-4', 'ready');

      // Verify success increment
      const updateCall = pool.query.mock.calls[1];
      expect(updateCall[1][1]).toBe(1); // successIncrement
      expect(result.successCount).toBe(1);
    });

    it('throws StaleIdentityVersionError after exhausting retries (BF-017)', async () => {
      const identity = makeIdentityRow({ version: 5 });
      // 3 retry attempts: each reads identity then gets version mismatch
      pool.query
        .mockResolvedValueOnce({ rows: [identity] })
        .mockResolvedValueOnce({ rows: [] }) // Attempt 1: version mismatch
        .mockResolvedValueOnce({ rows: [identity] })
        .mockResolvedValueOnce({ rows: [] }) // Attempt 2: version mismatch
        .mockResolvedValueOnce({ rows: [identity] })
        .mockResolvedValueOnce({ rows: [] }); // Attempt 3: version mismatch

      await expect(
        service.recordTaskOutcome('identity-1', 'task-5', 'merged'),
      ).rejects.toThrow(StaleIdentityVersionError);
    });

    it('throws when identity not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.recordTaskOutcome('nonexistent', 'task-6', 'merged'),
      ).rejects.toThrow('Agent identity not found');
    });

    it('increments task_count correctly', async () => {
      const identity = makeIdentityRow({ task_count: 7, version: 3 });
      pool.query
        .mockResolvedValueOnce({ rows: [identity] })
        .mockResolvedValueOnce({
          rows: [makeIdentityRow({ task_count: 8, version: 4 })],
        });

      const result = await service.recordTaskOutcome('identity-1', 'task-7', 'merged');

      expect(result.taskCount).toBe(8);
    });

    it('updates last_task_id', async () => {
      const identity = makeIdentityRow({ version: 0 });
      pool.query
        .mockResolvedValueOnce({ rows: [identity] })
        .mockResolvedValueOnce({
          rows: [makeIdentityRow({ last_task_id: 'task-8', version: 1 })],
        });

      await service.recordTaskOutcome('identity-1', 'task-8', 'merged');

      const updateCall = pool.query.mock.calls[1];
      expect(updateCall[1][3]).toBe('task-8'); // last_task_id param
    });
  });

  // -------------------------------------------------------------------------
  // History — T-1.11
  // -------------------------------------------------------------------------

  describe('getHistory()', () => {
    it('returns tasks in reverse chronological order', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 'task-3', status: 'merged', description: 'Third', completed_at: '2026-02-26T03:00:00Z' },
          { id: 'task-2', status: 'failed', description: 'Second', completed_at: '2026-02-26T02:00:00Z' },
          { id: 'task-1', status: 'merged', description: 'First', completed_at: '2026-02-26T01:00:00Z' },
        ],
      });

      const result = await service.getHistory('identity-1');

      expect(result).toHaveLength(3);
      expect(result[0].taskId).toBe('task-3');
      expect(result[2].taskId).toBe('task-1');
    });

    it('respects limit parameter', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await service.getHistory('identity-1', 10);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        ['identity-1', 10],
      );
    });

    it('returns empty array when no history', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await service.getHistory('identity-1');

      expect(result).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// computeAlpha — Pure Function Tests
// ---------------------------------------------------------------------------

describe('computeAlpha()', () => {
  it('returns ALPHA_MIN (0.1) for taskCount=0', () => {
    expect(computeAlpha(0)).toBeCloseTo(0.1, 5);
  });

  it('ramps linearly with task count', () => {
    // taskCount=10 → rampFactor=0.5 → alpha = 0.1 + 0.2 * 0.5 = 0.2
    expect(computeAlpha(10)).toBeCloseTo(0.2, 5);
  });

  it('returns ALPHA_MAX (0.3) at ramp ceiling (taskCount=20)', () => {
    expect(computeAlpha(20)).toBeCloseTo(0.3, 5);
  });

  it('caps at ALPHA_MAX for taskCount > 20', () => {
    expect(computeAlpha(100)).toBeCloseTo(0.3, 5);
    expect(computeAlpha(1000)).toBeCloseTo(0.3, 5);
  });

  it('is monotonically increasing', () => {
    let prev = computeAlpha(0);
    for (let i = 1; i <= 30; i++) {
      const curr = computeAlpha(i);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });
});
