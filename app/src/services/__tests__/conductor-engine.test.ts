/**
 * ConductorEngine Unit Tests — Fleet Orchestration Coordinator
 *
 * Tests the conductor's delegation to specialized services:
 * spawn, getStatus, getTask, stopTask, deleteTask, start, shutdown.
 *
 * All dependencies are mocked with vi.fn().
 *
 * @since cycle-012 — Sprint 91, Task T-6.2
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConductorEngine } from '../conductor-engine.js';
import { SpawnDeniedError } from '../fleet-governor.js';
import { TaskNotFoundError, ActiveTaskDeletionError, TERMINAL_STATUSES } from '../task-registry.js';
import type { FleetTaskRecord, SpawnRequest } from '../../types/fleet.js';
import type { ConvictionTier } from '../../types/conviction.js';

// ---------------------------------------------------------------------------
// Mock Factories
// ---------------------------------------------------------------------------

function makeTaskRecord(overrides: Partial<FleetTaskRecord> = {}): FleetTaskRecord {
  return {
    id: 'task-001',
    operatorId: 'operator-1',
    agentType: 'claude_code',
    model: 'claude-opus-4-6',
    taskType: 'feature',
    description: 'Build the thing',
    branch: 'fleet/task-001',
    worktreePath: '/tmp/fleet/task-001',
    containerId: null,
    tmuxSession: 'fleet-task-001',
    status: 'running',
    version: 1,
    prNumber: null,
    ciStatus: null,
    reviewStatus: null,
    retryCount: 0,
    maxRetries: 3,
    contextHash: null,
    failureContext: null,
    spawnedAt: '2026-02-26T00:00:00Z',
    completedAt: null,
    createdAt: '2026-02-26T00:00:00Z',
    updatedAt: '2026-02-26T00:00:00Z',
    ...overrides,
  };
}

function makeSpawnRequest(overrides: Partial<SpawnRequest> = {}): SpawnRequest {
  return {
    operatorId: 'operator-1',
    description: 'Build the thing',
    taskType: 'feature',
    repository: 'org/repo',
    ...overrides,
  };
}

function createMockRegistry() {
  return {
    create: vi.fn(),
    get: vi.fn(),
    query: vi.fn(),
    delete: vi.fn(),
    transition: vi.fn(),
    countActive: vi.fn(),
    countAllActive: vi.fn(),
    listLive: vi.fn(),
    recordFailure: vi.fn(),
  };
}

function createMockGovernor() {
  return {
    canSpawn: vi.fn().mockReturnValue(true),
    admitAndInsert: vi.fn(),
    getTierLimit: vi.fn().mockReturnValue(3),
    invalidateCache: vi.fn(),
    invalidateAllCaches: vi.fn(),
    // GovernedResource interface
    resourceId: 'fleet-governor-singleton',
    resourceType: 'fleet-governor',
    current: { operatorId: '', tier: 'observer' as ConvictionTier, activeCount: 0, tierLimit: 0 },
    version: 0,
    auditTrail: { entries: [], hash_chain_head: null },
    mutationLog: [],
    transition: vi.fn(),
    verify: vi.fn(),
    verifyAll: vi.fn(),
  };
}

function createMockSpawner() {
  return {
    spawn: vi.fn(),
    isAlive: vi.fn(),
    kill: vi.fn(),
    getLogs: vi.fn().mockResolvedValue('some log output'),
    cleanup: vi.fn(),
    listActive: vi.fn(),
  };
}

function createMockMonitor() {
  return {
    reconcile: vi.fn().mockResolvedValue({
      orphanedMarkedFailed: 0,
      untrackedProcesses: 0,
      orphanedTaskIds: [],
      untrackedTaskIds: [],
    }),
    start: vi.fn().mockResolvedValue({
      orphanedMarkedFailed: 0,
      untrackedProcesses: 0,
      orphanedTaskIds: [],
      untrackedTaskIds: [],
    }),
    stop: vi.fn(),
    runCycle: vi.fn(),
    getHealth: vi.fn(),
  };
}

function createMockRouter() {
  return {
    selectModel: vi.fn().mockReturnValue({
      agentType: 'claude_code',
      model: 'claude-opus-4-6',
      reason: 'task_type_default',
      reputationScore: null,
    }),
    setModelAvailability: vi.fn(),
    isAvailable: vi.fn(),
  };
}

function createMockEnrichment() {
  return {
    buildPrompt: vi.fn().mockReturnValue({
      prompt: 'enriched prompt text',
      contextHash: 'abc123hash',
      sections: [],
      totalTokenEstimate: 100,
      truncated: false,
    }),
    captureFailureContext: vi.fn(),
  };
}

function createMockEventBus() {
  return {
    emit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    removeAllHandlers: vi.fn(),
    handlerCount: 0,
  };
}

function createMockNotifications() {
  return {
    send: vi.fn().mockResolvedValue([]),
  };
}

function createMockSaga() {
  return {
    execute: vi.fn().mockResolvedValue({
      taskRecord: makeTaskRecord({ status: 'spawning' }),
      handle: {
        taskId: 'task-001',
        branch: 'fleet/task-001',
        worktreePath: '/tmp/fleet/task-001',
        processRef: 'fleet-task-001',
        mode: 'local' as const,
        spawnedAt: '2026-02-26T00:00:00Z',
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('ConductorEngine', () => {
  let registry: ReturnType<typeof createMockRegistry>;
  let governor: ReturnType<typeof createMockGovernor>;
  let spawner: ReturnType<typeof createMockSpawner>;
  let monitor: ReturnType<typeof createMockMonitor>;
  let router: ReturnType<typeof createMockRouter>;
  let enrichment: ReturnType<typeof createMockEnrichment>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let notifications: ReturnType<typeof createMockNotifications>;
  let saga: ReturnType<typeof createMockSaga>;
  let conductor: ConductorEngine;

  beforeEach(() => {
    vi.restoreAllMocks();

    registry = createMockRegistry();
    governor = createMockGovernor();
    spawner = createMockSpawner();
    monitor = createMockMonitor();
    router = createMockRouter();
    enrichment = createMockEnrichment();
    eventBus = createMockEventBus();
    notifications = createMockNotifications();
    saga = createMockSaga();

    conductor = new ConductorEngine(
      registry as any,
      governor as any,
      spawner as any,
      monitor as any,
      router as any,
      enrichment as any,
      eventBus as any,
      notifications as any,
      saga as any,
    );
  });

  // -------------------------------------------------------------------------
  // spawn()
  // -------------------------------------------------------------------------

  describe('spawn', () => {
    it('happy path: governor allows, model selected, saga executed, result returned', async () => {
      const request = makeSpawnRequest();
      const result = await conductor.spawn(request, 'architect');

      // Governor pre-check
      expect(governor.canSpawn).toHaveBeenCalledWith('operator-1', 'architect');

      // Model routing
      expect(router.selectModel).toHaveBeenCalledWith('feature', {
        explicitModel: undefined,
      });

      // Enrichment
      expect(enrichment.buildPrompt).toHaveBeenCalledOnce();

      // Saga execution
      expect(saga.execute).toHaveBeenCalledOnce();
      const sagaArgs = saga.execute.mock.calls[0][0];
      expect(sagaArgs.request).toBe(request);
      expect(sagaArgs.operatorTier).toBe('architect');
      expect(sagaArgs.model).toBe('claude-opus-4-6');
      expect(sagaArgs.agentType).toBe('claude_code');
      expect(sagaArgs.prompt).toBe('enriched prompt text');
      expect(sagaArgs.contextHash).toBe('abc123hash');
      expect(sagaArgs.idempotencyToken).toBeDefined();

      // Event emission
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AGENT_SPAWNED',
          taskId: 'task-001',
          operatorId: 'operator-1',
        }),
      );

      // Result shape
      expect(result).toEqual({
        taskId: 'task-001',
        branch: 'fleet/task-001',
        worktreePath: '/tmp/fleet/task-001',
        agentType: 'claude_code',
        model: 'claude-opus-4-6',
        status: 'spawning',
      });
    });

    it('passes explicit model override to router', async () => {
      const request = makeSpawnRequest({ model: 'codex-mini-latest' });
      await conductor.spawn(request, 'architect');

      expect(router.selectModel).toHaveBeenCalledWith('feature', {
        explicitModel: 'codex-mini-latest',
      });
    });

    it('governor pre-check denies: SpawnDeniedError propagated', async () => {
      governor.canSpawn.mockReturnValue(false);
      governor.getTierLimit.mockReturnValue(0);

      await expect(
        conductor.spawn(makeSpawnRequest(), 'observer'),
      ).rejects.toThrow(SpawnDeniedError);

      // Saga should never be called
      expect(saga.execute).not.toHaveBeenCalled();
    });

    it('saga failure propagates to caller', async () => {
      saga.execute.mockRejectedValue(new Error('Worktree creation failed'));

      await expect(
        conductor.spawn(makeSpawnRequest(), 'architect'),
      ).rejects.toThrow('Worktree creation failed');
    });

    it('includes contextOverrides as BACKGROUND sections in enrichment', async () => {
      const request = makeSpawnRequest({
        contextOverrides: { 'Style Guide': 'Use functional patterns' },
      });

      await conductor.spawn(request, 'architect');

      const buildPromptCall = enrichment.buildPrompt.mock.calls[0][0];
      const backgroundSections = buildPromptCall.filter(
        (s: any) => s.tier === 'BACKGROUND',
      );
      expect(backgroundSections).toHaveLength(1);
      expect(backgroundSections[0].label).toBe('Style Guide');
      expect(backgroundSections[0].content).toBe('Use functional patterns');
    });
  });

  // -------------------------------------------------------------------------
  // getStatus()
  // -------------------------------------------------------------------------

  describe('getStatus', () => {
    it('returns correct FleetStatusSummary counts', async () => {
      registry.query.mockResolvedValue([
        makeTaskRecord({ id: 't-1', status: 'running' }),
        makeTaskRecord({ id: 't-2', status: 'spawning' }),
        makeTaskRecord({ id: 't-3', status: 'merged' }),
        makeTaskRecord({ id: 't-4', status: 'failed' }),
        makeTaskRecord({ id: 't-5', status: 'cancelled' }),
      ]);

      const status = await conductor.getStatus('operator-1');

      expect(status.activeTasks).toBe(2);
      expect(status.completedTasks).toBe(1);
      expect(status.failedTasks).toBe(2);
      expect(status.tasks).toHaveLength(5);
    });

    it('passes operatorId filter to registry.query', async () => {
      registry.query.mockResolvedValue([]);

      await conductor.getStatus('operator-1');

      expect(registry.query).toHaveBeenCalledWith({ operatorId: 'operator-1' });
    });

    it('omits operatorId filter when called without argument', async () => {
      registry.query.mockResolvedValue([]);

      await conductor.getStatus();

      expect(registry.query).toHaveBeenCalledWith({});
    });

    it('computes durationMinutes from spawnedAt', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
      registry.query.mockResolvedValue([
        makeTaskRecord({ spawnedAt: twoHoursAgo }),
      ]);

      const status = await conductor.getStatus();
      expect(status.tasks[0].durationMinutes).toBeGreaterThanOrEqual(119);
    });

    it('returns null durationMinutes when spawnedAt is null', async () => {
      registry.query.mockResolvedValue([
        makeTaskRecord({ spawnedAt: null }),
      ]);

      const status = await conductor.getStatus();
      expect(status.tasks[0].durationMinutes).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getTask()
  // -------------------------------------------------------------------------

  describe('getTask', () => {
    it('returns task record when found', async () => {
      const task = makeTaskRecord();
      registry.get.mockResolvedValue(task);

      const result = await conductor.getTask('task-001');

      expect(result).toBe(task);
      expect(registry.get).toHaveBeenCalledWith('task-001');
    });

    it('returns null when task not found', async () => {
      registry.get.mockResolvedValue(null);

      const result = await conductor.getTask('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // stopTask()
  // -------------------------------------------------------------------------

  describe('stopTask', () => {
    it('kills agent, transitions to cancelled, emits event', async () => {
      const task = makeTaskRecord({ status: 'running' });
      registry.get.mockResolvedValue(task);
      registry.transition.mockResolvedValue(
        makeTaskRecord({ status: 'cancelled' }),
      );

      await conductor.stopTask('task-001');

      // Kill was called
      expect(spawner.kill).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-001',
          processRef: 'fleet-task-001',
        }),
      );

      // Transition to cancelled
      expect(registry.transition).toHaveBeenCalledWith(
        'task-001',
        1,
        'cancelled',
        expect.objectContaining({ completedAt: expect.any(String) }),
      );

      // Event emitted
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AGENT_CANCELLED',
          taskId: 'task-001',
          operatorId: 'operator-1',
        }),
      );
    });

    it('throws TaskNotFoundError when task does not exist', async () => {
      registry.get.mockResolvedValue(null);

      await expect(conductor.stopTask('nonexistent')).rejects.toThrow(
        TaskNotFoundError,
      );
    });

    it('continues even if spawner.kill fails', async () => {
      const task = makeTaskRecord({ status: 'running' });
      registry.get.mockResolvedValue(task);
      registry.transition.mockResolvedValue(
        makeTaskRecord({ status: 'cancelled' }),
      );
      spawner.kill.mockRejectedValue(new Error('Process not found'));

      // Should not throw
      await conductor.stopTask('task-001');

      // Transition should still be called
      expect(registry.transition).toHaveBeenCalled();
    });

    it('sends notification after stopping', async () => {
      const task = makeTaskRecord({ status: 'running' });
      registry.get.mockResolvedValue(task);
      registry.transition.mockResolvedValue(
        makeTaskRecord({ status: 'cancelled' }),
      );

      await conductor.stopTask('task-001');

      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ operatorId: 'operator-1' }),
        expect.objectContaining({
          taskId: 'task-001',
          type: 'status_change',
          status: 'cancelled',
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getTaskLogs()
  // -------------------------------------------------------------------------

  describe('getTaskLogs', () => {
    it('delegates to spawner.getLogs', async () => {
      const task = makeTaskRecord();
      registry.get.mockResolvedValue(task);

      const logs = await conductor.getTaskLogs('task-001', 100);

      expect(spawner.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 'task-001' }),
        100,
      );
      expect(logs).toBe('some log output');
    });

    it('throws TaskNotFoundError when task does not exist', async () => {
      registry.get.mockResolvedValue(null);

      await expect(conductor.getTaskLogs('nonexistent')).rejects.toThrow(
        TaskNotFoundError,
      );
    });

    it('returns empty string when task has no process ref', async () => {
      const task = makeTaskRecord({
        tmuxSession: null,
        containerId: null,
      });
      registry.get.mockResolvedValue(task);

      const logs = await conductor.getTaskLogs('task-001');
      expect(logs).toBe('');
      expect(spawner.getLogs).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // deleteTask()
  // -------------------------------------------------------------------------

  describe('deleteTask', () => {
    it('validates terminal state, cleans up worktree, deletes from registry', async () => {
      const task = makeTaskRecord({ status: 'merged' });
      registry.get.mockResolvedValue(task);

      await conductor.deleteTask('task-001');

      expect(spawner.cleanup).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 'task-001' }),
      );
      expect(registry.delete).toHaveBeenCalledWith('task-001');
    });

    it('rejects active tasks with ActiveTaskDeletionError', async () => {
      const task = makeTaskRecord({ status: 'running' });
      registry.get.mockResolvedValue(task);

      await expect(conductor.deleteTask('task-001')).rejects.toThrow(
        ActiveTaskDeletionError,
      );
      expect(registry.delete).not.toHaveBeenCalled();
    });

    it('throws TaskNotFoundError when task does not exist', async () => {
      registry.get.mockResolvedValue(null);

      await expect(conductor.deleteTask('nonexistent')).rejects.toThrow(
        TaskNotFoundError,
      );
    });

    it('succeeds even if worktree cleanup fails', async () => {
      const task = makeTaskRecord({ status: 'cancelled' });
      registry.get.mockResolvedValue(task);
      spawner.cleanup.mockRejectedValue(new Error('Worktree not found'));

      await conductor.deleteTask('task-001');

      expect(registry.delete).toHaveBeenCalledWith('task-001');
    });

    it('allows deletion for all terminal statuses', async () => {
      for (const status of TERMINAL_STATUSES) {
        vi.restoreAllMocks();
        registry.get.mockResolvedValue(makeTaskRecord({ status }));
        registry.delete.mockResolvedValue(undefined);
        spawner.cleanup.mockResolvedValue(undefined);

        await expect(conductor.deleteTask('task-001')).resolves.toBeUndefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // start()
  // -------------------------------------------------------------------------

  describe('start', () => {
    it('calls reconcile then starts monitor', async () => {
      await conductor.start();

      expect(monitor.reconcile).toHaveBeenCalledOnce();
      expect(monitor.start).toHaveBeenCalledOnce();

      // reconcile should be called before start
      const reconcileOrder = monitor.reconcile.mock.invocationCallOrder[0];
      const startOrder = monitor.start.mock.invocationCallOrder[0];
      expect(reconcileOrder).toBeLessThan(startOrder);
    });
  });

  // -------------------------------------------------------------------------
  // shutdown()
  // -------------------------------------------------------------------------

  describe('shutdown', () => {
    it('stops monitor', async () => {
      await conductor.shutdown();

      expect(monitor.stop).toHaveBeenCalledOnce();
    });
  });
});
