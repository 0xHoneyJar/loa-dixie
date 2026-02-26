/**
 * Fleet Invariants Verification Tests — INV-014 through INV-018
 *
 * Integration-style tests verifying all 5 fleet invariants hold across
 * component interactions (TaskRegistry + FleetGovernor + RetryEngine +
 * NotificationService). Uses integrated mocks to simulate cross-component
 * state transitions.
 *
 * See: SDD §8, Tasks T-5.10, T-8.8
 * @since cycle-012 — Sprint 93
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  FleetGovernor,
  SpawnDeniedError,
  DEFAULT_TIER_LIMITS,
} from '../fleet-governor.js';
import {
  TaskRegistry,
  VALID_TRANSITIONS,
  TERMINAL_STATUSES,
  InvalidTransitionError,
} from '../task-registry.js';
import { RetryEngine } from '../retry-engine.js';
import { NotificationService } from '../notification-service.js';
import type { FleetTaskStatus, FleetTaskRecord, CreateFleetTaskInput } from '../../types/fleet.js';
import type { ConvictionTier } from '../../types/conviction.js';

// ---------------------------------------------------------------------------
// Mock Factories
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

function makeTask(overrides: Partial<FleetTaskRecord> = {}): FleetTaskRecord {
  return {
    id: 'task-1',
    operatorId: 'op-1',
    agentType: 'claude_code',
    model: 'claude-opus-4-6',
    taskType: 'feature',
    description: 'Test task',
    branch: 'fleet/task-1',
    worktreePath: '/tmp/fleet/task-1',
    containerId: null,
    tmuxSession: null,
    status: 'failed',
    version: 2,
    prNumber: null,
    ciStatus: null,
    reviewStatus: null,
    retryCount: 0,
    maxRetries: 3,
    contextHash: null,
    failureContext: { error: 'test error' },
    spawnedAt: '2026-02-26T00:00:00Z',
    completedAt: null,
    createdAt: '2026-02-26T00:00:00Z',
    updatedAt: '2026-02-26T00:00:00Z',
    ...overrides,
  };
}

function createMockRegistry() {
  return {
    get: vi.fn(),
    create: vi.fn(),
    query: vi.fn(),
    transition: vi.fn(),
    recordFailure: vi.fn(),
    delete: vi.fn(),
    listLive: vi.fn(),
    countActive: vi.fn(),
    countAllActive: vi.fn(),
  };
}

function createMockSpawner() {
  return {
    spawn: vi.fn().mockResolvedValue({
      taskId: 'task-1',
      branch: 'fleet/task-1',
      worktreePath: '/tmp/fleet/task-1',
      processRef: 'fleet-task-1',
      mode: 'local' as const,
      spawnedAt: '2026-02-26T00:00:00Z',
    }),
    kill: vi.fn(),
    cleanup: vi.fn(),
    isAlive: vi.fn(),
    getLogs: vi.fn(),
    listActive: vi.fn(),
  };
}

function createMockEnrichmentEngine() {
  return {
    buildPrompt: vi.fn().mockReturnValue({
      prompt: 'enriched retry prompt',
      contextHash: 'abc123',
      sections: [],
      totalTokenEstimate: 100,
      truncated: false,
    }),
    captureFailureContext: vi.fn().mockReturnValue([]),
  };
}

function createMockEventBus() {
  return {
    emit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests: Fleet Invariants
// ---------------------------------------------------------------------------

describe('Fleet Invariants', () => {
  // -------------------------------------------------------------------------
  // INV-014: Tier limit enforcement — active_count <= tier_limit
  // -------------------------------------------------------------------------

  describe('INV-014: Tier limit enforcement — active_count <= tier_limit', () => {
    let mockClient: ReturnType<typeof createMockClient>;
    let mockPool: ReturnType<typeof createMockPool>;
    let governor: FleetGovernor;

    beforeEach(() => {
      vi.restoreAllMocks();
      mockClient = createMockClient();
      mockPool = createMockPool(mockClient);
      governor = new FleetGovernor(mockPool as unknown as import('../../db/client.js').DbPool);
    });

    it('admitAndInsert denies when active count equals tier limit', async () => {
      // Builder tier limit = 1, active count already at 1
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // SELECT COUNT — at limit
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        governor.admitAndInsert(makeInput(), 'builder'),
      ).rejects.toThrow(SpawnDeniedError);
    });

    it('admitAndInsert denies when active count exceeds tier limit', async () => {
      // Architect tier limit = 3, active count already at 5 (data corruption scenario)
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // SELECT COUNT — over limit
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        governor.admitAndInsert(makeInput(), 'architect'),
      ).rejects.toThrow(SpawnDeniedError);
    });

    it('admitAndInsert permits when active count below tier limit', async () => {
      const row = makeFleetTaskRow();
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // SELECT COUNT — under limit
        .mockResolvedValueOnce({ rows: [row] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await governor.admitAndInsert(makeInput(), 'architect');
      expect(result.id).toBe('task-uuid-1');
    });

    it('canSpawn pre-check rejects zero-limit tiers', () => {
      expect(governor.canSpawn('op-1', 'observer')).toBe(false);
      expect(governor.canSpawn('op-1', 'participant')).toBe(false);
    });

    it('verify(INV-014) confirms the invariant holds after admission', async () => {
      const row = makeFleetTaskRow();
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce(undefined);

      await governor.admitAndInsert(makeInput(), 'architect');

      const result = governor.verify('INV-014');
      expect(result.satisfied).toBe(true);
      expect(result.detail).toContain('within tier limit');
    });

    it('verify(INV-014) detects violation after tier downgrade', async () => {
      // Admit at architect level (limit=3)
      const row = makeFleetTaskRow();
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce(undefined);

      await governor.admitAndInsert(makeInput(), 'builder');
      // State: activeCount=1, tierLimit=1

      // Downgrade to observer (limit=0)
      await governor.transition(
        { type: 'TIER_CHANGED', operatorId: 'operator-1', newTier: 'observer' },
        'system',
      );

      const result = governor.verify('INV-014');
      expect(result.satisfied).toBe(false);
    });

    it('invariant holds for all tiers at default limits', () => {
      const tiers: ConvictionTier[] = ['observer', 'participant', 'builder', 'architect', 'sovereign'];
      for (const tier of tiers) {
        expect(DEFAULT_TIER_LIMITS[tier]).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // -------------------------------------------------------------------------
  // INV-015: Cancelled tasks never retried
  // -------------------------------------------------------------------------

  describe('INV-015: Cancelled tasks never retried — state machine structural', () => {
    it('VALID_TRANSITIONS["cancelled"] is an empty array', () => {
      expect(VALID_TRANSITIONS.cancelled).toEqual([]);
    });

    it('cancelled is a terminal status', () => {
      expect(TERMINAL_STATUSES.has('cancelled')).toBe(true);
    });

    it('RetryEngine.canRetry returns false for cancelled tasks', async () => {
      const registry = createMockRegistry();
      const spawner = createMockSpawner();
      const enrichment = createMockEnrichmentEngine();
      const eventBus = createMockEventBus();

      const engine = new RetryEngine(
        registry as any,
        spawner as any,
        enrichment as any,
        eventBus as any,
      );

      registry.get.mockResolvedValue(makeTask({ status: 'cancelled', retryCount: 0 }));

      const canRetry = await engine.canRetry('task-1');
      expect(canRetry).toBe(false);
    });

    it('RetryEngine.attemptRetry refuses cancelled tasks', async () => {
      const registry = createMockRegistry();
      const spawner = createMockSpawner();
      const enrichment = createMockEnrichmentEngine();
      const eventBus = createMockEventBus();

      const engine = new RetryEngine(
        registry as any,
        spawner as any,
        enrichment as any,
        eventBus as any,
      );

      registry.get.mockResolvedValue(makeTask({ status: 'cancelled', retryCount: 0 }));

      const result = await engine.attemptRetry('task-1');
      expect(result.retried).toBe(false);
      expect(result.reason).toContain('Cancelled');
    });

    it('TaskRegistry.transition rejects cancelled -> retrying', async () => {
      const pool = { query: vi.fn() };
      const registry = new TaskRegistry(pool as unknown as import('../../db/client.js').DbPool);

      // get() returns a cancelled task
      pool.query.mockResolvedValueOnce({
        rows: [makeFleetTaskRow({ status: 'cancelled' })],
      });

      await expect(
        registry.transition('task-uuid-1', 0, 'retrying'),
      ).rejects.toThrow(InvalidTransitionError);
    });

    it('TaskRegistry.transition rejects cancelled -> running', async () => {
      const pool = { query: vi.fn() };
      const registry = new TaskRegistry(pool as unknown as import('../../db/client.js').DbPool);

      pool.query.mockResolvedValueOnce({
        rows: [makeFleetTaskRow({ status: 'cancelled' })],
      });

      await expect(
        registry.transition('task-uuid-1', 0, 'running'),
      ).rejects.toThrow(InvalidTransitionError);
    });

    it('no status has a transition TO cancelled that allows escape', () => {
      // Verify that once cancelled, there are truly no outgoing transitions
      const cancelledTransitions = VALID_TRANSITIONS.cancelled;
      expect(cancelledTransitions).toHaveLength(0);
    });

    it('FleetGovernor.verify(INV-015) confirms structural enforcement', () => {
      const mockClient = createMockClient();
      const mockPool = createMockPool(mockClient);
      const governor = new FleetGovernor(mockPool as unknown as import('../../db/client.js').DbPool);

      const result = governor.verify('INV-015');
      expect(result.satisfied).toBe(true);
      expect(result.detail).toContain('structurally impossible');
    });
  });

  // -------------------------------------------------------------------------
  // INV-016: Tier downgrade cannot spawn above new limit
  // -------------------------------------------------------------------------

  describe('INV-016: Tier downgrade safe — cannot spawn above new tier limit', () => {
    let mockClient: ReturnType<typeof createMockClient>;
    let mockPool: ReturnType<typeof createMockPool>;
    let governor: FleetGovernor;

    beforeEach(() => {
      vi.restoreAllMocks();
      mockClient = createMockClient();
      mockPool = createMockPool(mockClient);
      governor = new FleetGovernor(mockPool as unknown as import('../../db/client.js').DbPool);
    });

    it('canSpawn checks current tier limit, not historical', () => {
      // Initially architect (limit=3) — can spawn
      expect(governor.canSpawn('op-1', 'architect')).toBe(true);

      // "Downgrade" by checking with lower tier — should respect new limit
      expect(governor.canSpawn('op-1', 'observer')).toBe(false);
    });

    it('admitAndInsert uses the provided tier limit, not a cached one', async () => {
      // First admit at architect level
      const row = makeFleetTaskRow();
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // SELECT COUNT
        .mockResolvedValueOnce({ rows: [row] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      await governor.admitAndInsert(makeInput(), 'architect');

      // Now try with observer (limit=0) — should deny immediately
      await expect(
        governor.admitAndInsert(makeInput(), 'observer'),
      ).rejects.toThrow(SpawnDeniedError);
    });

    it('after TIER_CHANGED to lower tier, verify(INV-016) detects overflow', async () => {
      // Populate with 1 agent at builder level (limit=1)
      const row = makeFleetTaskRow();
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce(undefined);

      await governor.admitAndInsert(makeInput(), 'builder');

      // Downgrade tier
      await governor.transition(
        { type: 'TIER_CHANGED', operatorId: 'operator-1', newTier: 'observer' },
        'system',
      );

      const result = governor.verify('INV-016');
      expect(result.satisfied).toBe(false);
      expect(result.detail).toContain('tier downgrade violation');
    });

    it('after TIER_CHANGED to higher tier, verify(INV-016) passes', async () => {
      // Populate with 1 agent at builder level
      const row = makeFleetTaskRow();
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce(undefined);

      await governor.admitAndInsert(makeInput(), 'builder');

      // Upgrade tier to architect (limit=3)
      await governor.transition(
        { type: 'TIER_CHANGED', operatorId: 'operator-1', newTier: 'architect' },
        'system',
      );

      const result = governor.verify('INV-016');
      expect(result.satisfied).toBe(true);
      expect(result.detail).toContain('tier downgrade safe');
    });
  });

  // -------------------------------------------------------------------------
  // INV-017: Retry count bounded by maxRetries
  // -------------------------------------------------------------------------

  describe('INV-017: Retry count bounded — retryCount never exceeds maxRetries', () => {
    it('TaskRegistry.recordFailure uses WHERE retry_count < max_retries guard', async () => {
      const pool = { query: vi.fn() };
      const registry = new TaskRegistry(pool as unknown as import('../../db/client.js').DbPool);

      pool.query.mockResolvedValueOnce({
        rows: [makeFleetTaskRow({ retry_count: 1 })],
      });

      await registry.recordFailure('task-uuid-1', { error: 'test' });

      const sql = pool.query.mock.calls[0][0] as string;
      expect(sql).toContain('retry_count < max_retries');
    });

    it('recordFailure returns null when retry_count already at max', async () => {
      const pool = { query: vi.fn() };
      const registry = new TaskRegistry(pool as unknown as import('../../db/client.js').DbPool);

      // DB returns 0 rows — WHERE clause prevented the update
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await registry.recordFailure('task-uuid-1', { error: 'max' });
      expect(result).toBeNull();
    });

    it('RetryEngine.canRetry returns false when retryCount >= maxRetries', async () => {
      const registry = createMockRegistry();
      const spawner = createMockSpawner();
      const enrichment = createMockEnrichmentEngine();
      const eventBus = createMockEventBus();

      const engine = new RetryEngine(
        registry as any,
        spawner as any,
        enrichment as any,
        eventBus as any,
      );

      // retryCount == maxRetries
      registry.get.mockResolvedValue(makeTask({ status: 'failed', retryCount: 3, maxRetries: 3 }));
      expect(await engine.canRetry('task-1')).toBe(false);
    });

    it('RetryEngine.attemptRetry transitions to abandoned when budget exhausted', async () => {
      vi.useFakeTimers();

      const registry = createMockRegistry();
      const spawner = createMockSpawner();
      const enrichment = createMockEnrichmentEngine();
      const eventBus = createMockEventBus();

      const engine = new RetryEngine(
        registry as any,
        spawner as any,
        enrichment as any,
        eventBus as any,
      );

      const task = makeTask({ retryCount: 3, maxRetries: 3, version: 5 });
      registry.get.mockResolvedValue(task);
      registry.transition.mockResolvedValue({ ...task, status: 'abandoned', version: 6 });

      const result = await engine.attemptRetry('task-1');

      expect(result.retried).toBe(false);
      expect(result.reason).toContain('budget exhausted');
      expect(registry.transition).toHaveBeenCalledWith('task-1', 5, 'abandoned');

      vi.useRealTimers();
    });

    it('recordFailure atomically increments — no TOCTOU gap', async () => {
      const pool = { query: vi.fn() };
      const registry = new TaskRegistry(pool as unknown as import('../../db/client.js').DbPool);

      pool.query.mockResolvedValueOnce({
        rows: [makeFleetTaskRow({ retry_count: 2 })],
      });

      await registry.recordFailure('task-uuid-1', { error: 'test' });

      // Verify the SQL uses a single atomic UPDATE (not SELECT then UPDATE)
      const sql = pool.query.mock.calls[0][0] as string;
      expect(sql).toContain('SET retry_count = retry_count + 1');
      expect(sql).toContain('WHERE');
      expect(sql).toContain('retry_count < max_retries');
    });
  });

  // -------------------------------------------------------------------------
  // INV-018: Notification record exists for every terminal state transition
  // -------------------------------------------------------------------------

  describe('INV-018: Notification guarantee — record inserted before delivery', () => {
    it('NotificationService.send() inserts records before delivery', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [{ id: 'notif-uuid-1' }] }),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      // Spy on stdout to capture CLI output without noise
      const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      const service = new NotificationService({
        pool: mockPool as any,
        fetch: mockFetch as any,
        maxRetries: 0,
      });

      await service.send(
        {
          operatorId: 'op-1',
          discordWebhookUrl: 'https://discord.example.com/webhook',
          notifyOnSpawn: true,
          notifyOnComplete: true,
          notifyOnFailure: true,
        },
        {
          taskId: 'task-1',
          operatorId: 'op-1',
          type: 'spawn',
          status: 'spawning',
          description: 'Test spawn',
          agentType: 'claude_code',
          model: 'claude-opus-4-6',
          taskType: 'feature',
          branch: 'fleet/task-1',
        },
      );

      // Get the insert calls (INSERT INTO fleet_notifications)
      const insertCalls = mockPool.query.mock.calls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO fleet_notifications'),
      );

      // Records should be inserted BEFORE any fetch calls
      expect(insertCalls.length).toBeGreaterThan(0);

      // The first pool.query call should be an INSERT (records before delivery)
      const firstCall = mockPool.query.mock.calls[0][0] as string;
      expect(firstCall).toContain('INSERT INTO fleet_notifications');

      stdoutSpy.mockRestore();
    });

    it('notification record is created even if delivery fails', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [{ id: 'notif-uuid-1' }] }),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue('Forbidden'),
      });

      const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      const service = new NotificationService({
        pool: mockPool as any,
        fetch: mockFetch as any,
        maxRetries: 0,
      });

      const results = await service.send(
        {
          operatorId: 'op-1',
          discordWebhookUrl: 'https://discord.example.com/webhook',
          notifyOnSpawn: true,
          notifyOnComplete: true,
          notifyOnFailure: true,
        },
        {
          taskId: 'task-1',
          operatorId: 'op-1',
          type: 'failure',
          status: 'failed',
          description: 'Agent crashed',
          agentType: 'claude_code',
          model: 'claude-opus-4-6',
          taskType: 'feature',
          branch: 'fleet/task-1',
        },
      );

      // Record was inserted despite delivery failure
      const insertCalls = mockPool.query.mock.calls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO fleet_notifications'),
      );
      expect(insertCalls.length).toBeGreaterThan(0);

      // Delivery should have a non-success result for discord
      const discordResult = results.find((r) => r.channel === 'discord');
      expect(discordResult?.success).toBe(false);

      stdoutSpy.mockRestore();
    });

    it('terminal statuses (merged, abandoned, cancelled) are in TERMINAL_STATUSES', () => {
      // INV-018 requires notification records for terminal state transitions.
      // Verify terminal statuses are correctly identified.
      expect(TERMINAL_STATUSES.has('merged')).toBe(true);
      expect(TERMINAL_STATUSES.has('abandoned')).toBe(true);
      expect(TERMINAL_STATUSES.has('cancelled')).toBe(true);
    });

    it('record is updated with delivery outcome after attempt', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [{ id: 'notif-uuid-1' }] }),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      const service = new NotificationService({
        pool: mockPool as any,
        fetch: mockFetch as any,
        maxRetries: 0,
      });

      await service.send(
        {
          operatorId: 'op-1',
          discordWebhookUrl: 'https://discord.example.com/webhook',
          notifyOnSpawn: true,
          notifyOnComplete: true,
          notifyOnFailure: true,
        },
        {
          taskId: 'task-1',
          operatorId: 'op-1',
          type: 'complete',
          status: 'merged',
          description: 'Agent completed',
          agentType: 'claude_code',
          model: 'claude-opus-4-6',
          taskType: 'feature',
          branch: 'fleet/task-1',
        },
      );

      // Verify UPDATE calls exist (record updated after delivery)
      const updateCalls = mockPool.query.mock.calls.filter(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('UPDATE fleet_notifications'),
      );
      expect(updateCalls.length).toBeGreaterThan(0);

      stdoutSpy.mockRestore();
    });
  });
});
