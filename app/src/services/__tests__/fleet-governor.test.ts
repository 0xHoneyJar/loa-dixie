/**
 * Fleet Governor Unit Tests — Conviction-Gated Spawn Admission
 *
 * Tests canSpawn pre-check, DB-transactional admitAndInsert,
 * state transitions, invariant verification, and cache management.
 *
 * @since cycle-012 — Sprint 90, Task T-5.8
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import {
  FleetGovernor,
  SpawnDeniedError,
  DEFAULT_TIER_LIMITS,
} from '../fleet-governor.js';
import type { FleetState, FleetEvent, FleetInvariant } from '../fleet-governor.js';
import type { ConvictionTier } from '../../types/conviction.js';
import type { CreateFleetTaskInput } from '../../types/fleet.js';

// ---------------------------------------------------------------------------
// Mock PG Pool + Client
// ---------------------------------------------------------------------------

function createMockClient() {
  return {
    query: vi.fn(),
    release: vi.fn(),
  };
}

function createMockPool(mockClient?: ReturnType<typeof createMockClient>) {
  const client = mockClient ?? createMockClient();
  return {
    query: vi.fn(),
    connect: vi.fn().mockResolvedValue(client),
    _client: client,
  };
}

function makeFleetTaskRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'task-uuid-1',
    operator_id: 'operator-1',
    agent_type: 'claude_code',
    model: 'claude-opus-4-6',
    task_type: 'feature',
    description: 'Test task',
    branch: 'fleet/task-uuid-1',
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
    ...overrides,
  };
}

function makeInput(overrides: Partial<CreateFleetTaskInput> = {}): CreateFleetTaskInput {
  return {
    operatorId: 'operator-1',
    agentType: 'claude_code',
    model: 'claude-opus-4-6',
    taskType: 'feature',
    description: 'Build the thing',
    branch: 'fleet/task-uuid-1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FleetGovernor', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockPool: ReturnType<typeof createMockPool>;
  let governor: FleetGovernor;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockClient = createMockClient();
    mockPool = createMockPool(mockClient);
    governor = new FleetGovernor(mockPool as unknown as import('../../db/client.js').DbPool);
  });

  // -------------------------------------------------------------------------
  // DEFAULT_TIER_LIMITS
  // -------------------------------------------------------------------------

  describe('DEFAULT_TIER_LIMITS', () => {
    it('has correct values for all tiers', () => {
      expect(DEFAULT_TIER_LIMITS).toEqual({
        observer: 0,
        participant: 0,
        builder: 1,
        architect: 3,
        sovereign: 10,
      });
    });
  });

  // -------------------------------------------------------------------------
  // canSpawn — per conviction tier
  // -------------------------------------------------------------------------

  describe('canSpawn', () => {
    it('denies observer (limit=0)', () => {
      expect(governor.canSpawn('op-1', 'observer')).toBe(false);
    });

    it('denies participant (limit=0)', () => {
      expect(governor.canSpawn('op-1', 'participant')).toBe(false);
    });

    it('allows builder with no cache entry (limit=1, optimistic)', () => {
      expect(governor.canSpawn('op-1', 'builder')).toBe(true);
    });

    it('allows architect with no cache entry (limit=3, optimistic)', () => {
      expect(governor.canSpawn('op-1', 'architect')).toBe(true);
    });

    it('allows sovereign with no cache entry (limit=10, optimistic)', () => {
      expect(governor.canSpawn('op-1', 'sovereign')).toBe(true);
    });

    it('returns false when cached count equals tier limit', async () => {
      // Use admitAndInsert to populate the cache with count=1 for builder (limit=1)
      // Instead, we'll use a governor with custom cache setup via admitAndInsert
      // Simulate cache by doing a successful admitAndInsert first
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // SELECT COUNT
        .mockResolvedValueOnce({ rows: [makeFleetTaskRow()] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      await governor.admitAndInsert(makeInput(), 'builder');

      // Now cache has count=1 for operator-1, builder limit=1
      expect(governor.canSpawn('operator-1', 'builder')).toBe(false);
    });

    it('returns true with no cache entry (optimistic)', () => {
      // No cache populated — should optimistically allow
      expect(governor.canSpawn('unknown-operator', 'builder')).toBe(true);
    });

    it('returns true with stale cache entry (optimistic)', async () => {
      // Create governor with very short TTL
      const shortTtlGovernor = new FleetGovernor(
        mockPool as unknown as import('../../db/client.js').DbPool,
        { cacheTtlMs: 1 },
      );

      // Populate cache via admitAndInsert
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // SELECT COUNT
        .mockResolvedValueOnce({ rows: [makeFleetTaskRow()] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      await shortTtlGovernor.admitAndInsert(makeInput(), 'builder');

      // Wait for cache to go stale
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Stale cache should optimistically allow
      expect(shortTtlGovernor.canSpawn('operator-1', 'builder')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // transition()
  // -------------------------------------------------------------------------

  describe('transition', () => {
    it('handles SPAWN_REQUESTED event', async () => {
      const event: FleetEvent = {
        type: 'SPAWN_REQUESTED',
        operatorId: 'op-1',
        tier: 'architect',
      };

      const result = await governor.transition(event, 'actor-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.operatorId).toBe('op-1');
        expect(result.state.tier).toBe('architect');
        expect(result.state.tierLimit).toBe(3);
        expect(result.version).toBe(1);
      }
    });

    it('handles AGENT_COMPLETED event', async () => {
      const event: FleetEvent = { type: 'AGENT_COMPLETED', taskId: 'task-1', operatorId: 'op-1' };
      const result = await governor.transition(event, 'actor-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.version).toBe(1);
      }
    });

    it('handles AGENT_FAILED event', async () => {
      const event: FleetEvent = { type: 'AGENT_FAILED', taskId: 'task-1', operatorId: 'op-1' };
      const result = await governor.transition(event, 'actor-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.version).toBe(1);
      }
    });

    it('handles TIER_CHANGED event', async () => {
      const event: FleetEvent = {
        type: 'TIER_CHANGED',
        operatorId: 'op-1',
        newTier: 'sovereign',
      };

      const result = await governor.transition(event, 'actor-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.operatorId).toBe('op-1');
        expect(result.state.tier).toBe('sovereign');
        expect(result.state.tierLimit).toBe(10);
      }
    });

    it('returns success:false for unknown event type', async () => {
      const event = { type: 'UNKNOWN_EVENT' } as unknown as FleetEvent;
      const result = await governor.transition(event, 'actor-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('Unknown event type');
        expect(result.code).toBe('UNKNOWN_EVENT');
      }
    });

    it('increments version on each transition', async () => {
      expect(governor.version).toBe(0);

      await governor.transition(
        { type: 'SPAWN_REQUESTED', operatorId: 'op-1', tier: 'builder' },
        'actor-1',
      );
      expect(governor.version).toBe(1);

      await governor.transition(
        { type: 'AGENT_COMPLETED', taskId: 'task-1', operatorId: 'op-1' },
        'actor-1',
      );
      expect(governor.version).toBe(2);
    });

    it('AGENT_COMPLETED invalidates cache for current operator', async () => {
      // First, set up state with an operator
      await governor.transition(
        { type: 'SPAWN_REQUESTED', operatorId: 'op-1', tier: 'builder' },
        'actor-1',
      );

      // Populate the cache manually via admitAndInsert
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // SELECT COUNT
        .mockResolvedValueOnce({ rows: [makeFleetTaskRow()] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      await governor.admitAndInsert(makeInput({ operatorId: 'op-1' }), 'builder');

      // Cache should be populated — canSpawn should return false (1/1)
      expect(governor.canSpawn('op-1', 'builder')).toBe(false);

      // AGENT_COMPLETED should invalidate cache
      await governor.transition(
        { type: 'AGENT_COMPLETED', taskId: 'task-1', operatorId: 'op-1' },
        'actor-1',
      );

      // After invalidation, no cache entry -> optimistic true
      expect(governor.canSpawn('op-1', 'builder')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // admitAndInsert
  // -------------------------------------------------------------------------

  describe('admitAndInsert', () => {
    it('succeeds when under limit (full DB transaction sequence)', async () => {
      const row = makeFleetTaskRow();

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // SELECT COUNT ... FOR UPDATE
        .mockResolvedValueOnce({ rows: [row] }) // INSERT ... RETURNING *
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await governor.admitAndInsert(makeInput(), 'builder');

      expect(result.id).toBe('task-uuid-1');
      expect(result.operatorId).toBe('operator-1');
      expect(result.agentType).toBe('claude_code');
      expect(result.status).toBe('proposed');

      // Verify transaction sequence
      const calls = mockClient.query.mock.calls;
      expect(calls[0][0]).toBe('BEGIN');
      expect(calls[1][0]).toContain('SELECT COUNT');
      expect(calls[1][0]).toContain('FOR UPDATE');
      expect(calls[2][0]).toContain('INSERT INTO fleet_tasks');
      expect(calls[3][0]).toBe('COMMIT');

      // Verify client released
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('throws SpawnDeniedError and rolls back when at limit', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // SELECT COUNT — at limit (builder=1)
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        governor.admitAndInsert(makeInput(), 'builder'),
      ).rejects.toThrow(SpawnDeniedError);

      // Verify ROLLBACK was called
      const calls = mockClient.query.mock.calls;
      expect(calls[2][0]).toBe('ROLLBACK');

      // Verify client released
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('throws SpawnDeniedError immediately for tier limit=0', async () => {
      await expect(
        governor.admitAndInsert(makeInput(), 'observer'),
      ).rejects.toThrow(SpawnDeniedError);

      // Should never even connect to the pool
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('throws SpawnDeniedError with correct properties', async () => {
      try {
        await governor.admitAndInsert(makeInput(), 'observer');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(SpawnDeniedError);
        const sde = err as SpawnDeniedError;
        expect(sde.operatorId).toBe('operator-1');
        expect(sde.tier).toBe('observer');
        expect(sde.tierLimit).toBe(0);
        expect(sde.reason).toContain('limit=0');
        expect(sde.name).toBe('SpawnDeniedError');
      }
    });

    it('updates cache after successful insertion', async () => {
      const row = makeFleetTaskRow();
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // SELECT COUNT
        .mockResolvedValueOnce({ rows: [row] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      await governor.admitAndInsert(makeInput(), 'architect'); // limit=3, count=2

      // After insert, cache should have count=3
      // canSpawn should return false since 3 >= 3
      expect(governor.canSpawn('operator-1', 'architect')).toBe(false);
    });

    it('updates current state and version after successful insertion', async () => {
      const row = makeFleetTaskRow();
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // SELECT COUNT
        .mockResolvedValueOnce({ rows: [row] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      await governor.admitAndInsert(makeInput(), 'architect');

      expect(governor.current.operatorId).toBe('operator-1');
      expect(governor.current.tier).toBe('architect');
      expect(governor.current.activeCount).toBe(2); // 1 + 1
      expect(governor.current.tierLimit).toBe(3);
      expect(governor.version).toBe(1);
    });

    it('rolls back and rethrows on unexpected DB errors', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB connection lost')); // SELECT COUNT fails

      await expect(
        governor.admitAndInsert(makeInput(), 'builder'),
      ).rejects.toThrow('DB connection lost');

      // Verify ROLLBACK was attempted
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');

      // Client still released
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('swallows rollback errors on unexpected failure', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB connection lost')) // SELECT COUNT fails
        .mockRejectedValueOnce(new Error('ROLLBACK failed too')); // ROLLBACK also fails

      await expect(
        governor.admitAndInsert(makeInput(), 'builder'),
      ).rejects.toThrow('DB connection lost');

      // Client still released despite double failure
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('passes correct params to INSERT query', async () => {
      const input = makeInput({
        operatorId: 'op-42',
        agentType: 'codex',
        model: 'codex-mini',
        taskType: 'bug_fix',
        description: 'Fix the bug',
        branch: 'fleet/fix-42',
        maxRetries: 5,
        contextHash: 'abc123',
      });

      const row = makeFleetTaskRow({
        operator_id: 'op-42',
        agent_type: 'codex',
        model: 'codex-mini',
      });

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // SELECT COUNT
        .mockResolvedValueOnce({ rows: [row] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      await governor.admitAndInsert(input, 'architect');

      const insertCall = mockClient.query.mock.calls[2];
      const params = insertCall[1];
      expect(params[0]).toBe('op-42');
      expect(params[1]).toBe('codex');
      expect(params[2]).toBe('codex-mini');
      expect(params[3]).toBe('bug_fix');
      expect(params[4]).toBe('Fix the bug');
      expect(params[5]).toBe('fleet/fix-42');
      expect(params[6]).toBe(5);
      expect(params[7]).toBe('abc123');
    });

    it('uses default maxRetries=3 and contextHash=null when not provided', async () => {
      const input = makeInput(); // no maxRetries/contextHash
      const row = makeFleetTaskRow();

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // SELECT COUNT
        .mockResolvedValueOnce({ rows: [row] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      await governor.admitAndInsert(input, 'builder');

      const insertCall = mockClient.query.mock.calls[2];
      const params = insertCall[1];
      expect(params[6]).toBe(3); // default maxRetries
      expect(params[7]).toBeNull(); // default contextHash
    });
  });

  // -------------------------------------------------------------------------
  // Invariant Verification
  // -------------------------------------------------------------------------

  describe('verify', () => {
    describe('INV-014: active_count <= tier_limit', () => {
      it('passes when active count within limit', async () => {
        await governor.transition(
          { type: 'SPAWN_REQUESTED', operatorId: 'op-1', tier: 'architect' },
          'actor-1',
        );

        const result = governor.verify('INV-014');
        expect(result.invariant_id).toBe('INV-014');
        expect(result.satisfied).toBe(true);
        expect(result.detail).toContain('within tier limit');
        expect(result.checked_at).toBeDefined();
      });

      it('fails when active count exceeds limit', async () => {
        // Manually force an invalid state for testing
        // We'll use TIER_CHANGED to a lower tier after populating cache
        // First build up count
        mockClient.query
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // SELECT COUNT
          .mockResolvedValueOnce({ rows: [makeFleetTaskRow()] }) // INSERT
          .mockResolvedValueOnce(undefined); // COMMIT

        await governor.admitAndInsert(makeInput(), 'builder');
        // State: activeCount=1, tierLimit=1 for builder

        // Now change tier to observer (limit=0) - this creates a violation state
        await governor.transition(
          { type: 'TIER_CHANGED', operatorId: 'operator-1', newTier: 'observer' },
          'actor-1',
        );

        // Note: getCachedActiveCount returns 1 from the cache
        // but observer limit is 0, so activeCount(1) > tierLimit(0)
        const result = governor.verify('INV-014');
        expect(result.invariant_id).toBe('INV-014');
        expect(result.satisfied).toBe(false);
        expect(result.detail).toContain('exceeds tier limit');
      });
    });

    describe('INV-015: cancelled tasks never retried', () => {
      it('always passes (structural enforcement)', () => {
        const result = governor.verify('INV-015');
        expect(result.invariant_id).toBe('INV-015');
        expect(result.satisfied).toBe(true);
        expect(result.detail).toContain('structurally impossible');
      });
    });

    describe('INV-016: tier downgrade cannot spawn above new limit', () => {
      it('passes when within current tier limit', async () => {
        await governor.transition(
          { type: 'SPAWN_REQUESTED', operatorId: 'op-1', tier: 'architect' },
          'actor-1',
        );

        const result = governor.verify('INV-016');
        expect(result.invariant_id).toBe('INV-016');
        expect(result.satisfied).toBe(true);
        expect(result.detail).toContain('tier downgrade safe');
      });

      it('fails when active count exceeds current tier limit', async () => {
        // Same setup as INV-014 failure test
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [{ count: '0' }] })
          .mockResolvedValueOnce({ rows: [makeFleetTaskRow()] })
          .mockResolvedValueOnce(undefined);

        await governor.admitAndInsert(makeInput(), 'builder');

        // Downgrade tier
        await governor.transition(
          { type: 'TIER_CHANGED', operatorId: 'operator-1', newTier: 'observer' },
          'actor-1',
        );

        const result = governor.verify('INV-016');
        expect(result.invariant_id).toBe('INV-016');
        expect(result.satisfied).toBe(false);
        expect(result.detail).toContain('tier downgrade violation');
      });
    });
  });

  describe('verifyAll', () => {
    it('returns 3 invariant results', () => {
      const results = governor.verifyAll();
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.invariant_id)).toEqual([
        'INV-014',
        'INV-015',
        'INV-016',
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Cache Management
  // -------------------------------------------------------------------------

  describe('invalidateCache', () => {
    it('removes the cache entry for the operator', async () => {
      // Populate cache
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // SELECT COUNT
        .mockResolvedValueOnce({ rows: [makeFleetTaskRow()] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      await governor.admitAndInsert(makeInput(), 'builder');
      expect(governor.canSpawn('operator-1', 'builder')).toBe(false); // cached count=1

      governor.invalidateCache('operator-1');

      // No cache -> optimistic true
      expect(governor.canSpawn('operator-1', 'builder')).toBe(true);
    });
  });

  describe('invalidateAllCaches', () => {
    it('clears all cached entries', async () => {
      // Populate two operators' caches
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [makeFleetTaskRow()] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [makeFleetTaskRow({ operator_id: 'operator-2' })] })
        .mockResolvedValueOnce(undefined);

      await governor.admitAndInsert(makeInput({ operatorId: 'operator-1' }), 'builder');
      await governor.admitAndInsert(makeInput({ operatorId: 'operator-2' }), 'builder');

      expect(governor.canSpawn('operator-1', 'builder')).toBe(false);
      expect(governor.canSpawn('operator-2', 'builder')).toBe(false);

      governor.invalidateAllCaches();

      expect(governor.canSpawn('operator-1', 'builder')).toBe(true);
      expect(governor.canSpawn('operator-2', 'builder')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getTierLimit
  // -------------------------------------------------------------------------

  describe('getTierLimit', () => {
    it('returns correct default limits for each tier', () => {
      expect(governor.getTierLimit('observer')).toBe(0);
      expect(governor.getTierLimit('participant')).toBe(0);
      expect(governor.getTierLimit('builder')).toBe(1);
      expect(governor.getTierLimit('architect')).toBe(3);
      expect(governor.getTierLimit('sovereign')).toBe(10);
    });

    it('respects custom tier limits from constructor opts', () => {
      const custom = new FleetGovernor(
        mockPool as unknown as import('../../db/client.js').DbPool,
        { tierLimits: { builder: 5, sovereign: 25 } },
      );

      expect(custom.getTierLimit('observer')).toBe(0); // default
      expect(custom.getTierLimit('builder')).toBe(5); // custom
      expect(custom.getTierLimit('architect')).toBe(3); // default
      expect(custom.getTierLimit('sovereign')).toBe(25); // custom
    });
  });

  // -------------------------------------------------------------------------
  // GovernedResource interface properties
  // -------------------------------------------------------------------------

  describe('GovernedResource interface', () => {
    it('has correct resourceId and resourceType', () => {
      expect(governor.resourceId).toBe('fleet-governor-singleton');
      expect(governor.resourceType).toBe('fleet-governor');
    });

    it('provides auditTrail', () => {
      expect(governor.auditTrail).toBeDefined();
      expect(governor.auditTrail.entries).toEqual([]);
    });

    it('provides mutationLog', () => {
      expect(governor.mutationLog).toBeDefined();
      expect(governor.mutationLog).toEqual([]);
    });

    it('initial state has empty operatorId and observer tier', () => {
      expect(governor.current.operatorId).toBe('');
      expect(governor.current.tier).toBe('observer');
      expect(governor.current.activeCount).toBe(0);
      expect(governor.current.tierLimit).toBe(0);
    });
  });
});
