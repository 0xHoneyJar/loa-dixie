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
    agentIdentityId: null,
    groupId: null,
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
    linkEcologyFields: vi.fn().mockResolvedValue(undefined),
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
    executeSpawn: vi.fn().mockResolvedValue({
      success: true,
      taskId: 'task-001',
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
    const runningTask = makeTaskRecord({ status: 'running', worktreePath: '/tmp/fleet/task-001' });

    it('happy path: governor allows, model selected, saga executed, result returned', async () => {
      // After saga succeeds, conductor fetches the task from registry
      registry.get.mockResolvedValue(runningTask);

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

      // Saga execution — now calls executeSpawn with positional args (BF-001)
      expect(saga.executeSpawn).toHaveBeenCalledOnce();
      const [sagaInput, tier, prompt, token] = saga.executeSpawn.mock.calls[0];
      expect(sagaInput.operatorId).toBe('operator-1');
      expect(sagaInput.taskType).toBe('feature');
      expect(sagaInput.description).toBe('Build the thing');
      expect(sagaInput.model).toBe('claude-opus-4-6');
      expect(sagaInput.agentType).toBe('claude_code');
      expect(tier).toBe('architect');
      expect(prompt).toBe('enriched prompt text');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // SHA-256 hex = 64 chars

      // Event NOT emitted by conductor (BF-006 — saga owns this)
      expect(eventBus.emit).not.toHaveBeenCalled();

      // Registry.get called to fetch task after saga
      expect(registry.get).toHaveBeenCalledWith('task-001');

      // Result shape
      expect(result).toEqual({
        taskId: 'task-001',
        branch: 'fleet/task-001',
        worktreePath: '/tmp/fleet/task-001',
        agentType: 'claude_code',
        model: 'claude-opus-4-6',
        status: 'running',
      });
    });

    it('passes explicit model override to router', async () => {
      registry.get.mockResolvedValue(runningTask);
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
      expect(saga.executeSpawn).not.toHaveBeenCalled();
    });

    it('saga failure (rejected promise) propagates to caller', async () => {
      saga.executeSpawn.mockRejectedValue(new Error('Worktree creation failed'));

      await expect(
        conductor.spawn(makeSpawnRequest(), 'architect'),
      ).rejects.toThrow('Worktree creation failed');
    });

    it('saga failure (success: false) throws descriptive error', async () => {
      saga.executeSpawn.mockResolvedValue({
        success: false,
        taskId: 'task-001',
        failedStep: 'spawnAgent',
        error: 'Docker daemon not running',
      });

      await expect(
        conductor.spawn(makeSpawnRequest(), 'architect'),
      ).rejects.toThrow("Saga failed at step 'spawnAgent': Docker daemon not running");
    });

    it('uses deterministic idempotency token (BF-002)', async () => {
      registry.get.mockResolvedValue(runningTask);
      const request = makeSpawnRequest();

      await conductor.spawn(request, 'architect');
      const token1 = saga.executeSpawn.mock.calls[0][3];

      // Same request should produce same token (deterministic)
      saga.executeSpawn.mockClear();
      saga.executeSpawn.mockResolvedValue({ success: true, taskId: 'task-001' });
      await conductor.spawn(request, 'architect');
      const token2 = saga.executeSpawn.mock.calls[0][3];

      expect(token1).toBe(token2);
    });

    it('includes contextOverrides as BACKGROUND sections in enrichment', async () => {
      registry.get.mockResolvedValue(runningTask);
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
  // spawn() — Ecology Integration (T-6.10)
  // -------------------------------------------------------------------------

  describe('spawn — ecology integration', () => {
    const mockIdentity = {
      id: 'identity-001',
      operatorId: 'operator-1',
      model: 'claude-opus-4-6',
      autonomyLevel: 'autonomous' as const,
      aggregateReputation: 0.85,
      taskCount: 15,
      successCount: 12,
      failureCount: 3,
      lastTaskId: null,
      version: 1,
      createdAt: '2026-02-26T00:00:00Z',
      lastActiveAt: '2026-02-26T00:00:00Z',
    };

    const mockResources = {
      timeoutMinutes: 240,
      maxRetries: 5,
      contextTokens: 12000,
      canSelfModifyPrompt: true,
    };

    const mockSpawnCost = {
      baseCost: 1.0,
      utilizationMultiplier: 1.0,
      reputationDiscount: 0.66,
      complexityFactor: 1.0,
      finalCost: 0.66,
      breakdown: 'base=1.0 | final=0.66',
    };

    const mockGeometry = {
      geometry: 'jam' as const,
      groupId: 'group-001',
      autoDetected: false,
    };

    const mockInsight = {
      id: 'insight-001',
      sourceTaskId: 'task-099',
      sourceAgentId: 'agent-099',
      groupId: 'group-001',
      content: 'Auth module needs CORS headers',
      keywords: ['auth', 'cors', 'headers'],
      relevanceContext: 'Commits from task-099',
      capturedAt: '2026-02-26T00:00:00Z',
      expiresAt: '2026-02-26T04:00:00Z',
    };

    function createMockIdentityService() {
      return {
        resolveIdentity: vi.fn().mockResolvedValue(mockIdentity),
        getOrNull: vi.fn().mockResolvedValue(mockIdentity),
        getByOperator: vi.fn(),
        recordTaskOutcome: vi.fn(),
        getHistory: vi.fn(),
      };
    }

    function createMockSovereignty() {
      return {
        getResources: vi.fn().mockReturnValue(mockResources),
        transition: vi.fn(),
        verify: vi.fn(),
        verifyAll: vi.fn(),
        current: { identityId: '', level: 'constrained' as const, reputation: 0, taskCount: 0, resources: mockResources },
        version: 0,
        auditTrail: { entries: [], hash_chain_head: null },
        mutationLog: [],
        resourceId: 'sovereignty-engine-singleton',
        resourceType: 'sovereignty-engine',
      };
    }

    function createMockCirculation() {
      return {
        computeCost: vi.fn().mockResolvedValue(mockSpawnCost),
        getUtilizationSnapshot: vi.fn(),
        getReputationDiscount: vi.fn(),
      };
    }

    function createMockInsightService() {
      return {
        getRelevantInsights: vi.fn().mockReturnValue([mockInsight]),
        harvest: vi.fn(),
        pruneExpired: vi.fn(),
        persist: vi.fn(),
        loadFromDb: vi.fn(),
        pruneExpiredFromDb: vi.fn(),
        pruneByTask: vi.fn(),
        getPoolStats: vi.fn(),
        poolRef: {} as any,
      };
    }

    function createMockGeometryRouter() {
      return {
        resolveGeometry: vi.fn().mockResolvedValue(mockGeometry),
        createGroup: vi.fn(),
        addToGroup: vi.fn(),
        getGroup: vi.fn(),
        dissolveGroup: vi.fn(),
        detectGeometry: vi.fn(),
      };
    }

    const runningTask = makeTaskRecord({ status: 'running', worktreePath: '/tmp/fleet/task-001' });

    it('full spawn with all ecology services — identity resolved and linked', async () => {
      const identitySvc = createMockIdentityService();
      const sovereigntySvc = createMockSovereignty();
      const circulationSvc = createMockCirculation();
      const insightSvc = createMockInsightService();
      const geometrySvc = createMockGeometryRouter();

      registry.get.mockResolvedValue(runningTask);

      const ecoConductor = new ConductorEngine(
        registry as any,
        governor as any,
        spawner as any,
        monitor as any,
        router as any,
        enrichment as any,
        eventBus as any,
        notifications as any,
        saga as any,
        undefined, // config
        identitySvc as any,
        sovereigntySvc as any,
        circulationSvc as any,
        insightSvc as any,
        geometrySvc as any,
      );

      const result = await ecoConductor.spawn(makeSpawnRequest(), 'architect');

      // Identity resolved
      expect(identitySvc.resolveIdentity).toHaveBeenCalledWith('operator-1', 'claude-opus-4-6');

      // Identity linked to task via linkEcologyFields (version-independent)
      expect(registry.linkEcologyFields).toHaveBeenCalledWith(
        'task-001',
        expect.objectContaining({ agentIdentityId: 'identity-001' }),
      );

      // Result includes identity
      expect(result.agentIdentityId).toBe('identity-001');
    });

    it('autonomy resources applied from sovereignty', async () => {
      const identitySvc = createMockIdentityService();
      const sovereigntySvc = createMockSovereignty();

      registry.get.mockResolvedValue(runningTask);

      const ecoConductor = new ConductorEngine(
        registry as any, governor as any, spawner as any, monitor as any,
        router as any, enrichment as any, eventBus as any, notifications as any,
        saga as any, undefined,
        identitySvc as any, sovereigntySvc as any,
      );

      const result = await ecoConductor.spawn(makeSpawnRequest(), 'architect');

      expect(sovereigntySvc.getResources).toHaveBeenCalledWith(mockIdentity);
      expect(result.autonomyLevel).toBe('autonomous');
    });

    it('spawn cost computed and returned', async () => {
      const circulationSvc = createMockCirculation();

      registry.get.mockResolvedValue(runningTask);

      const ecoConductor = new ConductorEngine(
        registry as any, governor as any, spawner as any, monitor as any,
        router as any, enrichment as any, eventBus as any, notifications as any,
        saga as any, undefined,
        undefined, undefined, circulationSvc as any,
      );

      const result = await ecoConductor.spawn(makeSpawnRequest(), 'architect');

      expect(circulationSvc.computeCost).toHaveBeenCalledWith(
        'operator-1',
        'feature',
        'Build the thing'.length,
      );
      expect(result.spawnCost).toEqual(mockSpawnCost);
    });

    it('cross-agent insights injected as CROSS_AGENT sections', async () => {
      const insightSvc = createMockInsightService();

      registry.get.mockResolvedValue(runningTask);

      const ecoConductor = new ConductorEngine(
        registry as any, governor as any, spawner as any, monitor as any,
        router as any, enrichment as any, eventBus as any, notifications as any,
        saga as any, undefined,
        undefined, undefined, undefined, insightSvc as any,
      );

      await ecoConductor.spawn(makeSpawnRequest(), 'architect');

      // insightService.getRelevantInsights was called
      expect(insightSvc.getRelevantInsights).toHaveBeenCalledWith(
        'Build the thing',
        null, // no groupId without geometry router
      );

      // Enrichment should include the CROSS_AGENT section
      const buildPromptCall = enrichment.buildPrompt.mock.calls[0][0];
      const crossAgentSections = buildPromptCall.filter(
        (s: any) => s.tier === 'CROSS_AGENT',
      );
      expect(crossAgentSections).toHaveLength(1);
      expect(crossAgentSections[0].content).toBe('Auth module needs CORS headers');
    });

    it('geometry resolved and groupId linked to task', async () => {
      const geometrySvc = createMockGeometryRouter();

      registry.get.mockResolvedValue(runningTask);

      const ecoConductor = new ConductorEngine(
        registry as any, governor as any, spawner as any, monitor as any,
        router as any, enrichment as any, eventBus as any, notifications as any,
        saga as any, undefined,
        undefined, undefined, undefined, undefined, geometrySvc as any,
      );

      await ecoConductor.spawn(makeSpawnRequest(), 'architect');

      expect(geometrySvc.resolveGeometry).toHaveBeenCalled();

      // groupId linked to task via linkEcologyFields (version-independent)
      expect(registry.linkEcologyFields).toHaveBeenCalledWith(
        'task-001',
        expect.objectContaining({ groupId: 'group-001' }),
      );
    });

    it('graceful degradation when all ecology services are null (backward compat)', async () => {
      registry.get.mockResolvedValue(runningTask);

      // Use the default conductor (no ecology services)
      const result = await conductor.spawn(makeSpawnRequest(), 'architect');

      // Should succeed without ecology fields
      expect(result.taskId).toBe('task-001');
      expect(result.agentIdentityId).toBeUndefined();
      expect(result.autonomyLevel).toBeUndefined();
      expect(result.spawnCost).toBeUndefined();
    });

    it('identity resolution failure is non-fatal', async () => {
      const identitySvc = createMockIdentityService();
      identitySvc.resolveIdentity.mockRejectedValue(new Error('DB down'));

      registry.get.mockResolvedValue(runningTask);

      const ecoConductor = new ConductorEngine(
        registry as any, governor as any, spawner as any, monitor as any,
        router as any, enrichment as any, eventBus as any, notifications as any,
        saga as any, undefined,
        identitySvc as any,
      );

      const result = await ecoConductor.spawn(makeSpawnRequest(), 'architect');

      // Should succeed without identity
      expect(result.taskId).toBe('task-001');
      expect(result.agentIdentityId).toBeUndefined();
    });

    it('circulation failure is non-fatal', async () => {
      const circulationSvc = createMockCirculation();
      circulationSvc.computeCost.mockRejectedValue(new Error('Cost service down'));

      registry.get.mockResolvedValue(runningTask);

      const ecoConductor = new ConductorEngine(
        registry as any, governor as any, spawner as any, monitor as any,
        router as any, enrichment as any, eventBus as any, notifications as any,
        saga as any, undefined,
        undefined, undefined, circulationSvc as any,
      );

      const result = await ecoConductor.spawn(makeSpawnRequest(), 'architect');

      expect(result.taskId).toBe('task-001');
      expect(result.spawnCost).toBeUndefined();
    });

    it('geometry with insights — groupId passed to getRelevantInsights', async () => {
      const geometrySvc = createMockGeometryRouter();
      const insightSvc = createMockInsightService();

      registry.get.mockResolvedValue(runningTask);
      registry.transition.mockResolvedValue(runningTask);

      const ecoConductor = new ConductorEngine(
        registry as any, governor as any, spawner as any, monitor as any,
        router as any, enrichment as any, eventBus as any, notifications as any,
        saga as any, undefined,
        undefined, undefined, undefined, insightSvc as any, geometrySvc as any,
      );

      await ecoConductor.spawn(makeSpawnRequest(), 'architect');

      // Insight service should receive the groupId from geometry
      expect(insightSvc.getRelevantInsights).toHaveBeenCalledWith(
        'Build the thing',
        'group-001',
      );
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

  // -------------------------------------------------------------------------
  // backward compatibility (T-7.8)
  // -------------------------------------------------------------------------

  describe('backward compatibility (T-7.8)', () => {
    it('works without ecology services (original 9 args)', async () => {
      // Construct conductor with ONLY the original 9 positional args — no ecology services
      const legacyConductor = new ConductorEngine(
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

      const runningTask = makeTaskRecord({ status: 'running', worktreePath: '/tmp/fleet/task-001' });
      registry.get.mockResolvedValue(runningTask);

      const result = await legacyConductor.spawn(makeSpawnRequest(), 'architect');

      // Core spawn should work identically to cycle-012
      expect(result.taskId).toBe('task-001');
      expect(result.branch).toBe('fleet/task-001');
      expect(result.agentType).toBe('claude_code');
      expect(result.model).toBe('claude-opus-4-6');
      expect(result.status).toBe('running');

      // Ecology fields should be absent
      expect(result.agentIdentityId).toBeUndefined();
      expect(result.autonomyLevel).toBeUndefined();
      expect(result.spawnCost).toBeUndefined();
    });

    it('getStatus works without ecology services', async () => {
      const legacyConductor = new ConductorEngine(
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

      registry.query.mockResolvedValue([
        makeTaskRecord({ id: 't-1', status: 'running' }),
        makeTaskRecord({ id: 't-2', status: 'merged' }),
      ]);

      const status = await legacyConductor.getStatus('operator-1');

      expect(status.activeTasks).toBe(1);
      expect(status.completedTasks).toBe(1);
      expect(status.tasks).toHaveLength(2);
    });

    it('stopTask works without ecology services', async () => {
      const legacyConductor = new ConductorEngine(
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

      const task = makeTaskRecord({ status: 'running' });
      registry.get.mockResolvedValue(task);
      registry.transition.mockResolvedValue(makeTaskRecord({ status: 'cancelled' }));

      await legacyConductor.stopTask('task-001');

      expect(registry.transition).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'AGENT_CANCELLED' }),
      );
    });

    it('start and shutdown work without ecology services', async () => {
      const legacyConductor = new ConductorEngine(
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

      await legacyConductor.start();
      expect(monitor.reconcile).toHaveBeenCalledOnce();
      expect(monitor.start).toHaveBeenCalledOnce();

      await legacyConductor.shutdown();
      expect(monitor.stop).toHaveBeenCalledOnce();
    });
  });
});
