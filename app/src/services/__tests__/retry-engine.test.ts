/**
 * Retry Engine Unit Tests
 *
 * Tests retry lifecycle, budget exhaustion, OOM detection,
 * exponential backoff, and event emission.
 *
 * @since cycle-012 — Sprint 90, Tasks T-5.1, T-5.2
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetryEngine, computeBackoffDelay } from '../retry-engine.js';
import type { RetryEngineConfig } from '../retry-engine.js';
import type { FleetTaskRecord } from '../../types/fleet.js';

// ---------------------------------------------------------------------------
// Mock Factories
// ---------------------------------------------------------------------------

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
// Tests
// ---------------------------------------------------------------------------

/** Instant-resolve sleep for testing (BF-003). */
const instantSleep = vi.fn().mockResolvedValue(undefined);

describe('RetryEngine', () => {
  let registry: ReturnType<typeof createMockRegistry>;
  let spawner: ReturnType<typeof createMockSpawner>;
  let enrichment: ReturnType<typeof createMockEnrichmentEngine>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let engine: RetryEngine;

  beforeEach(() => {
    instantSleep.mockClear();
    registry = createMockRegistry();
    spawner = createMockSpawner();
    enrichment = createMockEnrichmentEngine();
    eventBus = createMockEventBus();
    engine = new RetryEngine(
      registry as any,
      spawner as any,
      enrichment as any,
      eventBus as any,
      { retryDelayMs: 100, maxRetries: 3, maxPromptTokens: 8000, sleep: instantSleep },
    );
  });

  // -------------------------------------------------------------------------
  // attemptRetry — success path
  // -------------------------------------------------------------------------

  describe('attemptRetry()', () => {
    it('retries a failed task with budget remaining', async () => {
      const task = makeTask({ retryCount: 1, maxRetries: 3, version: 2 });
      registry.get.mockResolvedValue(task);
      registry.recordFailure.mockResolvedValue(task);
      registry.transition
        .mockResolvedValueOnce({ ...task, status: 'retrying', version: 3 })  // failed -> retrying
        .mockResolvedValueOnce({ ...task, status: 'spawning', version: 4 }); // retrying -> spawning

      const result = await engine.attemptRetry('task-1');

      expect(result.retried).toBe(true);
      expect(result.reason).toContain('Retry 2/3');
      expect(result.newTaskVersion).toBe(4);
      expect(spawner.spawn).toHaveBeenCalledWith(
        'task-1',
        'fleet/task-1',
        'claude_code',
        'enriched retry prompt',
      );
      // Verify sleep was called with computed backoff delay
      expect(instantSleep).toHaveBeenCalledOnce();
      expect(instantSleep.mock.calls[0][0]).toBeGreaterThan(0);
    });

    it('transitions to abandoned when retry budget exhausted', async () => {
      const task = makeTask({ retryCount: 3, maxRetries: 3, version: 5 });
      registry.get.mockResolvedValue(task);
      registry.transition.mockResolvedValue({ ...task, status: 'abandoned', version: 6 });

      const result = await engine.attemptRetry('task-1');

      expect(result.retried).toBe(false);
      expect(result.reason).toContain('budget exhausted');
      expect(result.newTaskVersion).toBe(6);
      expect(registry.transition).toHaveBeenCalledWith('task-1', 5, 'abandoned');
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AGENT_FAILED',
          taskId: 'task-1',
        }),
      );
    });

    it('returns not-retried for task not found', async () => {
      registry.get.mockResolvedValue(null);

      const result = await engine.attemptRetry('nonexistent');

      expect(result.retried).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('returns not-retried for cancelled task', async () => {
      registry.get.mockResolvedValue(makeTask({ status: 'cancelled' }));

      const result = await engine.attemptRetry('task-1');

      expect(result.retried).toBe(false);
      expect(result.reason).toContain('Cancelled');
    });

    it('returns not-retried for non-failed task', async () => {
      registry.get.mockResolvedValue(makeTask({ status: 'running' }));

      const result = await engine.attemptRetry('task-1');

      expect(result.retried).toBe(false);
      expect(result.reason).toContain('not in failed status');
    });

    it('emits AGENT_RETRYING event on successful retry', async () => {
      const task = makeTask({ retryCount: 0, maxRetries: 3, version: 2 });
      registry.get.mockResolvedValue(task);
      registry.recordFailure.mockResolvedValue(task);
      registry.transition
        .mockResolvedValueOnce({ ...task, status: 'retrying', version: 3 })
        .mockResolvedValueOnce({ ...task, status: 'spawning', version: 4 });

      await engine.attemptRetry('task-1');

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AGENT_RETRYING',
          taskId: 'task-1',
          metadata: expect.objectContaining({
            retryCount: 1,
          }),
        }),
      );
    });

    // OOM detection
    it('reduces context on OOM (exit code 137)', async () => {
      const task = makeTask({
        retryCount: 0,
        maxRetries: 3,
        version: 2,
        failureContext: { error: 'process killed', exitCode: 137 },
      });
      registry.get.mockResolvedValue(task);
      registry.recordFailure.mockResolvedValue(task);
      registry.transition
        .mockResolvedValueOnce({ ...task, status: 'retrying', version: 3 })
        .mockResolvedValueOnce({ ...task, status: 'spawning', version: 4 });

      await engine.attemptRetry('task-1');

      // buildPrompt should be called with reduced token budget (8000 * 0.75 = 6000)
      expect(enrichment.buildPrompt).toHaveBeenCalledWith(
        expect.anything(),
        { maxPromptTokens: 6000 },
      );
    });

    it('reduces context on OOM ("out of memory" in error)', async () => {
      const task = makeTask({
        retryCount: 0,
        maxRetries: 3,
        version: 2,
        failureContext: { error: 'Container ran Out Of Memory' },
      });
      registry.get.mockResolvedValue(task);
      registry.recordFailure.mockResolvedValue(task);
      registry.transition
        .mockResolvedValueOnce({ ...task, status: 'retrying', version: 3 })
        .mockResolvedValueOnce({ ...task, status: 'spawning', version: 4 });

      await engine.attemptRetry('task-1');

      expect(enrichment.buildPrompt).toHaveBeenCalledWith(
        expect.anything(),
        { maxPromptTokens: 6000 },
      );
    });

    it('does not reduce context for non-OOM failures', async () => {
      const task = makeTask({
        retryCount: 0,
        maxRetries: 3,
        version: 2,
        failureContext: { error: 'syntax error' },
      });
      registry.get.mockResolvedValue(task);
      registry.recordFailure.mockResolvedValue(task);
      registry.transition
        .mockResolvedValueOnce({ ...task, status: 'retrying', version: 3 })
        .mockResolvedValueOnce({ ...task, status: 'spawning', version: 4 });

      await engine.attemptRetry('task-1');

      expect(enrichment.buildPrompt).toHaveBeenCalledWith(
        expect.anything(),
        { maxPromptTokens: 8000 },
      );
    });
  });

  // -------------------------------------------------------------------------
  // canRetry
  // -------------------------------------------------------------------------

  describe('canRetry()', () => {
    it('returns true for failed task with retry budget', async () => {
      registry.get.mockResolvedValue(makeTask({ status: 'failed', retryCount: 1, maxRetries: 3 }));
      expect(await engine.canRetry('task-1')).toBe(true);
    });

    it('returns false for cancelled task', async () => {
      registry.get.mockResolvedValue(makeTask({ status: 'cancelled', retryCount: 0 }));
      expect(await engine.canRetry('task-1')).toBe(false);
    });

    it('returns false when retry budget exhausted', async () => {
      registry.get.mockResolvedValue(makeTask({ status: 'failed', retryCount: 3, maxRetries: 3 }));
      expect(await engine.canRetry('task-1')).toBe(false);
    });

    it('returns false for running task', async () => {
      registry.get.mockResolvedValue(makeTask({ status: 'running' }));
      expect(await engine.canRetry('task-1')).toBe(false);
    });

    it('returns false for nonexistent task', async () => {
      registry.get.mockResolvedValue(null);
      expect(await engine.canRetry('nonexistent')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Backoff computation
// ---------------------------------------------------------------------------

describe('computeBackoffDelay()', () => {
  it('applies exponential backoff', () => {
    // Mock Math.random to return 0 (no jitter) for deterministic test
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(computeBackoffDelay(1000, 0)).toBe(1000); // 1000 * 2^0 = 1000
    expect(computeBackoffDelay(1000, 1)).toBe(2000); // 1000 * 2^1 = 2000
    expect(computeBackoffDelay(1000, 2)).toBe(4000); // 1000 * 2^2 = 4000
    expect(computeBackoffDelay(1000, 3)).toBe(8000); // 1000 * 2^3 = 8000

    vi.restoreAllMocks();
  });

  it('caps at 120_000ms', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    // 1000 * 2^10 = 1_024_000, capped to 120_000
    expect(computeBackoffDelay(1000, 10)).toBe(120_000);

    vi.restoreAllMocks();
  });

  it('includes jitter', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // 1000 * 2^0 + floor(0.5 * 1000) = 1000 + 500 = 1500
    expect(computeBackoffDelay(1000, 0)).toBe(1500);

    vi.restoreAllMocks();
  });
});

