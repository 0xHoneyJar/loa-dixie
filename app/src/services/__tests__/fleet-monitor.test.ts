/**
 * Fleet Monitor Unit Tests — GitHubCli, Reconciliation, Monitor Cycle
 *
 * Tests verify:
 * - T-3.5: GitHubCli: PR lookup, CI status, last commit timestamp
 * - T-3.6: Reconciliation: orphans, untracked, healthy, empty, mixed
 * - T-3.7: Monitor cycle: dead agents, PR detection, CI updates, stall/timeout,
 *          error isolation, start/stop lifecycle, overlap prevention, health
 *
 * @since cycle-012 — Sprint 88, Tasks T-3.5, T-3.6, T-3.7
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — node:child_process (same pattern as agent-spawner.test.ts)
// ---------------------------------------------------------------------------

import { promisify } from 'node:util';

/** Spy that records all execFile calls and controls their resolution. */
const execFileSpy = vi.fn();

/**
 * Build the mock for node:child_process.execFile.
 * Attaches [util.promisify.custom] so that `promisify(execFile)` delegates
 * to our spy, returning Promise<{ stdout, stderr }>.
 */
function buildExecFileMock() {
  const base = (..._args: unknown[]) => {
    return { stdin: null, stdout: null, stderr: null, pid: 0 };
  };

  const customPromisified = (
    cmd: string,
    args: string[],
    opts?: Record<string, unknown>,
  ) => {
    return execFileSpy(cmd, args, opts);
  };

  (base as unknown as Record<symbol, unknown>)[promisify.custom] = customPromisified;
  return base;
}

vi.mock('node:child_process', () => ({
  execFile: buildExecFileMock(),
}));

// Import after mocks
import {
  GitHubCli,
  FleetMonitor,
  type ReconcileResult,
  type MonitorCycleResult,
  type FleetMonitorConfig,
  type MonitorLogger,
  type MonitorHealth,
} from '../fleet-monitor.js';
import type { TaskRegistry } from '../task-registry.js';
import type { AgentSpawner, AgentHandle } from '../agent-spawner.js';
import type { FleetTaskRecord, FleetTaskStatus } from '../../types/fleet.js';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** Create a mock logger that captures all calls. */
function createMockLogger(): MonitorLogger & {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
} {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

/** Factory: build a FleetTaskRecord for testing. */
function makeTask(overrides: Partial<FleetTaskRecord> = {}): FleetTaskRecord {
  return {
    id: 'task-001',
    operatorId: 'op-1',
    agentType: 'claude_code',
    model: 'claude-opus-4-6',
    taskType: 'feature',
    description: 'Test task',
    branch: 'fleet/task-001',
    worktreePath: '/tmp/dixie-fleet/task-001',
    containerId: null,
    tmuxSession: 'fleet-task-001',
    status: 'running' as FleetTaskStatus,
    version: 0,
    prNumber: null,
    ciStatus: null,
    reviewStatus: null,
    retryCount: 0,
    maxRetries: 3,
    contextHash: null,
    failureContext: null,
    spawnedAt: '2026-02-26T00:00:00.000Z',
    completedAt: null,
    createdAt: '2026-02-26T00:00:00.000Z',
    updatedAt: '2026-02-26T00:00:00.000Z',
    agentIdentityId: null,
    groupId: null,
    ...overrides,
  };
}

/** Factory: build an AgentHandle for testing. */
function makeHandle(overrides: Partial<AgentHandle> = {}): AgentHandle {
  return {
    taskId: 'task-001',
    branch: 'fleet/task-001',
    worktreePath: '/tmp/dixie-fleet/task-001',
    processRef: 'fleet-task-001',
    mode: 'local',
    spawnedAt: '2026-02-26T00:00:00.000Z',
    ...overrides,
  };
}

/** Create a mock TaskRegistry with all methods as vi.fn(). */
function createMockRegistry(): Mocked<TaskRegistry> {
  return {
    create: vi.fn(),
    get: vi.fn(),
    query: vi.fn(),
    countActive: vi.fn(),
    countAllActive: vi.fn(),
    delete: vi.fn(),
    listLive: vi.fn().mockResolvedValue([]),
    transition: vi.fn(),
    recordFailure: vi.fn(),
  } as unknown as Mocked<TaskRegistry>;
}

/** Create a mock AgentSpawner with all methods as vi.fn(). */
function createMockSpawner(): Mocked<AgentSpawner> {
  return {
    spawn: vi.fn(),
    isAlive: vi.fn().mockResolvedValue(true),
    kill: vi.fn(),
    getLogs: vi.fn(),
    cleanup: vi.fn(),
    listActive: vi.fn().mockResolvedValue([]),
  } as unknown as Mocked<AgentSpawner>;
}

/** Reset the execFile spy with default success behavior. */
function resetExecFile() {
  execFileSpy.mockReset();
  execFileSpy.mockResolvedValue({ stdout: '', stderr: '' });
  return execFileSpy;
}

// ---------------------------------------------------------------------------
// T-3.5: GitHubCli Tests
// ---------------------------------------------------------------------------

describe('GitHubCli', () => {
  let logger: ReturnType<typeof createMockLogger>;
  let cli: GitHubCli;

  beforeEach(() => {
    resetExecFile();
    logger = createMockLogger();
    cli = new GitHubCli(logger);
  });

  // -------------------------------------------------------------------------
  // getPrForBranch
  // -------------------------------------------------------------------------

  describe('getPrForBranch()', () => {
    it('returns PR info when a PR is found', async () => {
      const prData = [{ number: 42, state: 'OPEN', url: 'https://github.com/org/repo/pull/42' }];
      execFileSpy.mockResolvedValue({ stdout: JSON.stringify(prData), stderr: '' });

      const result = await cli.getPrForBranch('fleet/task-001');

      expect(result).toEqual({
        number: 42,
        state: 'OPEN',
        url: 'https://github.com/org/repo/pull/42',
      });

      // Verify execFile was called with correct gh arguments
      const [cmd, args] = execFileSpy.mock.calls[0];
      expect(cmd).toBe('gh');
      expect(args).toEqual([
        'pr', 'list',
        '--head', 'fleet/task-001',
        '--json', 'number,state,url',
        '--limit', '1',
      ]);
    });

    it('returns null when no PR exists (empty array)', async () => {
      execFileSpy.mockResolvedValue({ stdout: '[]', stderr: '' });

      const result = await cli.getPrForBranch('fleet/no-pr-branch');

      expect(result).toBeNull();
    });

    it('returns null when gh returns empty string', async () => {
      execFileSpy.mockResolvedValue({ stdout: '', stderr: '' });

      // Empty string will fail JSON.parse -> caught by try/catch
      const result = await cli.getPrForBranch('fleet/empty-branch');

      expect(result).toBeNull();
    });

    it('returns null on rate limit error and logs warning', async () => {
      execFileSpy.mockRejectedValue(new Error('API rate limit exceeded'));

      const result = await cli.getPrForBranch('fleet/rate-limited');

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'GitHub rate limit hit during PR lookup',
        { branch: 'fleet/rate-limited' },
      );
    });

    it('returns null on 403 error and logs warning', async () => {
      execFileSpy.mockRejectedValue(new Error('HTTP 403: Forbidden'));

      const result = await cli.getPrForBranch('fleet/forbidden');

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'GitHub rate limit hit during PR lookup',
        { branch: 'fleet/forbidden' },
      );
    });

    it('returns null on generic error without logging rate limit warning', async () => {
      execFileSpy.mockRejectedValue(new Error('network timeout'));

      const result = await cli.getPrForBranch('fleet/net-error');

      expect(result).toBeNull();
      // Should NOT have logged a rate limit warning
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('handles non-Error thrown values gracefully', async () => {
      execFileSpy.mockRejectedValue('string error');

      const result = await cli.getPrForBranch('fleet/string-err');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getCiStatus
  // -------------------------------------------------------------------------

  describe('getCiStatus()', () => {
    it('returns passing CI status', async () => {
      const ciData = { status: 'completed', conclusion: 'success' };
      execFileSpy.mockResolvedValue({ stdout: JSON.stringify(ciData), stderr: '' });

      const result = await cli.getCiStatus('fleet/task-001');

      expect(result).toEqual({
        status: 'completed',
        conclusion: 'success',
      });
    });

    it('returns failing CI status', async () => {
      const ciData = { status: 'completed', conclusion: 'failure' };
      execFileSpy.mockResolvedValue({ stdout: JSON.stringify(ciData), stderr: '' });

      const result = await cli.getCiStatus('fleet/task-001');

      expect(result).toEqual({
        status: 'completed',
        conclusion: 'failure',
      });
    });

    it('returns pending CI status with null conclusion', async () => {
      const ciData = { status: 'in_progress', conclusion: null };
      execFileSpy.mockResolvedValue({ stdout: JSON.stringify(ciData), stderr: '' });

      const result = await cli.getCiStatus('fleet/task-001');

      expect(result).toEqual({
        status: 'in_progress',
        conclusion: null,
      });
    });

    it('returns null when response is "null" string', async () => {
      execFileSpy.mockResolvedValue({ stdout: 'null', stderr: '' });

      const result = await cli.getCiStatus('fleet/task-001');

      expect(result).toBeNull();
    });

    it('returns null when response is empty', async () => {
      execFileSpy.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await cli.getCiStatus('fleet/task-001');

      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      execFileSpy.mockRejectedValue(new Error('API error'));

      const result = await cli.getCiStatus('fleet/task-001');

      expect(result).toBeNull();
    });

    it('defaults status to "unknown" when missing', async () => {
      const ciData = { conclusion: 'success' };
      execFileSpy.mockResolvedValue({ stdout: JSON.stringify(ciData), stderr: '' });

      const result = await cli.getCiStatus('fleet/task-001');

      expect(result).toEqual({
        status: 'unknown',
        conclusion: 'success',
      });
    });

    it('defaults conclusion to null when missing', async () => {
      const ciData = { status: 'completed' };
      execFileSpy.mockResolvedValue({ stdout: JSON.stringify(ciData), stderr: '' });

      const result = await cli.getCiStatus('fleet/task-001');

      expect(result).toEqual({
        status: 'completed',
        conclusion: null,
      });
    });
  });

  // -------------------------------------------------------------------------
  // getLastCommitTimestamp
  // -------------------------------------------------------------------------

  describe('getLastCommitTimestamp()', () => {
    it('returns valid timestamp', async () => {
      const ts = '2026-02-26T10:30:00Z';
      execFileSpy.mockResolvedValue({ stdout: `${ts}\n`, stderr: '' });

      const result = await cli.getLastCommitTimestamp('fleet/task-001');

      expect(result).toBe(ts);
    });

    it('trims whitespace from output', async () => {
      execFileSpy.mockResolvedValue({ stdout: '  2026-02-26T10:30:00Z  \n', stderr: '' });

      const result = await cli.getLastCommitTimestamp('fleet/task-001');

      expect(result).toBe('2026-02-26T10:30:00Z');
    });

    it('returns null when output is "null"', async () => {
      execFileSpy.mockResolvedValue({ stdout: 'null', stderr: '' });

      const result = await cli.getLastCommitTimestamp('fleet/task-001');

      expect(result).toBeNull();
    });

    it('returns null when output is empty', async () => {
      execFileSpy.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await cli.getLastCommitTimestamp('fleet/task-001');

      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      execFileSpy.mockRejectedValue(new Error('command failed'));

      const result = await cli.getLastCommitTimestamp('fleet/task-001');

      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// T-3.6: Reconciliation Tests
// ---------------------------------------------------------------------------

describe('FleetMonitor — reconcile()', () => {
  let registry: ReturnType<typeof createMockRegistry>;
  let spawner: ReturnType<typeof createMockSpawner>;
  let logger: ReturnType<typeof createMockLogger>;
  let monitor: FleetMonitor;

  beforeEach(() => {
    resetExecFile();
    registry = createMockRegistry();
    spawner = createMockSpawner();
    logger = createMockLogger();
    monitor = new FleetMonitor(registry as unknown as TaskRegistry, spawner as unknown as AgentSpawner, {
      logger,
      intervalMs: 60_000, // Long interval to prevent auto-ticking during tests
    });
  });

  it('marks orphaned records (in DB, no running process) as failed', async () => {
    const orphanTask = makeTask({ id: 'orphan-1', status: 'running', version: 3 });
    registry.listLive.mockResolvedValue([orphanTask]);
    spawner.listActive.mockResolvedValue([]); // No running processes
    registry.transition.mockResolvedValue(makeTask({ id: 'orphan-1', status: 'failed' }));

    const result = await monitor.reconcile();

    expect(result.orphanedMarkedFailed).toBe(1);
    expect(result.orphanedTaskIds).toContain('orphan-1');
    expect(registry.transition).toHaveBeenCalledWith(
      'orphan-1',
      3,
      'failed',
      expect.objectContaining({
        failureContext: expect.objectContaining({
          reason: 'orphaned_on_reconcile',
        }),
      }),
    );
  });

  it('marks orphaned spawning tasks as failed', async () => {
    const spawningTask = makeTask({ id: 'orphan-spawn', status: 'spawning', version: 1 });
    registry.listLive.mockResolvedValue([spawningTask]);
    spawner.listActive.mockResolvedValue([]);
    registry.transition.mockResolvedValue(makeTask({ id: 'orphan-spawn', status: 'failed' }));

    const result = await monitor.reconcile();

    expect(result.orphanedMarkedFailed).toBe(1);
    expect(registry.transition).toHaveBeenCalledWith(
      'orphan-spawn',
      1,
      'failed',
      expect.objectContaining({
        failureContext: expect.objectContaining({
          reason: 'orphaned_on_reconcile',
        }),
      }),
    );
  });

  it('logs untracked processes (running, no DB record) but does NOT kill them', async () => {
    registry.listLive.mockResolvedValue([]);
    spawner.listActive.mockResolvedValue([
      makeHandle({ taskId: 'untracked-1', processRef: 'fleet-untracked-1' }),
    ]);

    const result = await monitor.reconcile();

    expect(result.untrackedProcesses).toBe(1);
    expect(result.untrackedTaskIds).toContain('untracked-1');
    expect(logger.warn).toHaveBeenCalledWith(
      'Untracked process detected (no DB record)',
      expect.objectContaining({ taskId: 'untracked-1' }),
    );
    // Should NOT kill or stop the process
    expect(spawner.kill).not.toHaveBeenCalled();
  });

  it('counts healthy matches correctly (both in DB and running)', async () => {
    const healthyTask = makeTask({ id: 'healthy-1', status: 'running' });
    registry.listLive.mockResolvedValue([healthyTask]);
    spawner.listActive.mockResolvedValue([
      makeHandle({ taskId: 'healthy-1' }),
    ]);

    const result = await monitor.reconcile();

    expect(result.orphanedMarkedFailed).toBe(0);
    expect(result.untrackedProcesses).toBe(0);
    expect(result.orphanedTaskIds).toEqual([]);
    expect(result.untrackedTaskIds).toEqual([]);
  });

  it('returns zeros for empty fleet (no processes, no records)', async () => {
    registry.listLive.mockResolvedValue([]);
    spawner.listActive.mockResolvedValue([]);

    const result = await monitor.reconcile();

    expect(result).toEqual({
      orphanedMarkedFailed: 0,
      untrackedProcesses: 0,
      orphanedTaskIds: [],
      untrackedTaskIds: [],
    });
  });

  it('handles mixed scenario: 2 healthy, 1 orphan, 1 untracked', async () => {
    const healthy1 = makeTask({ id: 'h-1', status: 'running' });
    const healthy2 = makeTask({ id: 'h-2', status: 'spawning' });
    const orphan = makeTask({ id: 'orphan-1', status: 'running', version: 2 });
    registry.listLive.mockResolvedValue([healthy1, healthy2, orphan]);
    registry.transition.mockResolvedValue(makeTask({ id: 'orphan-1', status: 'failed' }));

    spawner.listActive.mockResolvedValue([
      makeHandle({ taskId: 'h-1' }),
      makeHandle({ taskId: 'h-2' }),
      makeHandle({ taskId: 'untracked-1', processRef: 'fleet-untracked-1' }),
    ]);

    const result = await monitor.reconcile();

    expect(result.orphanedMarkedFailed).toBe(1);
    expect(result.orphanedTaskIds).toEqual(['orphan-1']);
    expect(result.untrackedProcesses).toBe(1);
    expect(result.untrackedTaskIds).toEqual(['untracked-1']);
  });

  it('logs orphaned pr_created/reviewing tasks without transitioning to failed', async () => {
    const prTask = makeTask({ id: 'pr-orphan', status: 'pr_created', version: 1 });
    registry.listLive.mockResolvedValue([prTask]);
    spawner.listActive.mockResolvedValue([]);

    const result = await monitor.reconcile();

    // Counted as orphaned
    expect(result.orphanedMarkedFailed).toBe(1);
    expect(result.orphanedTaskIds).toContain('pr-orphan');
    // But transition is NOT called for pr_created (only spawning/running get transitioned)
    expect(registry.transition).not.toHaveBeenCalled();
    // Warning logged instead
    expect(logger.warn).toHaveBeenCalledWith(
      'Orphaned task detected (non-running status)',
      expect.objectContaining({ taskId: 'pr-orphan', status: 'pr_created' }),
    );
  });

  it('handles transition error gracefully during reconciliation', async () => {
    const orphanTask = makeTask({ id: 'err-orphan', status: 'running', version: 0 });
    registry.listLive.mockResolvedValue([orphanTask]);
    spawner.listActive.mockResolvedValue([]);
    registry.transition.mockRejectedValue(new Error('stale version'));

    const result = await monitor.reconcile();

    // Still counted as orphaned
    expect(result.orphanedMarkedFailed).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to reconcile orphaned task',
      expect.objectContaining({ taskId: 'err-orphan' }),
    );
  });
});

// ---------------------------------------------------------------------------
// T-3.7: Monitor Cycle Tests
// ---------------------------------------------------------------------------

describe('FleetMonitor — runCycle()', () => {
  let registry: ReturnType<typeof createMockRegistry>;
  let spawner: ReturnType<typeof createMockSpawner>;
  let logger: ReturnType<typeof createMockLogger>;
  let monitor: FleetMonitor;

  beforeEach(() => {
    resetExecFile();
    registry = createMockRegistry();
    spawner = createMockSpawner();
    logger = createMockLogger();
    monitor = new FleetMonitor(registry as unknown as TaskRegistry, spawner as unknown as AgentSpawner, {
      logger,
      intervalMs: 60_000,
      stallThresholdSec: 1800,
      timeoutMinutes: 120,
    });
  });

  it('detects dead agent (not alive, running status) and transitions to failed', async () => {
    const deadTask = makeTask({ id: 'dead-1', status: 'running', version: 5 });
    registry.listLive.mockResolvedValue([deadTask]);
    spawner.isAlive.mockResolvedValue(false);
    registry.transition.mockResolvedValue(makeTask({ id: 'dead-1', status: 'failed' }));

    const result = await monitor.runCycle();

    expect(result.deadAgentsDetected).toBe(1);
    expect(registry.transition).toHaveBeenCalledWith(
      'dead-1',
      5,
      'failed',
      expect.objectContaining({
        failureContext: expect.objectContaining({
          reason: 'agent_died',
        }),
      }),
    );
  });

  it('detects dead agent in spawning status and transitions to failed', async () => {
    const deadSpawning = makeTask({ id: 'dead-spawn', status: 'spawning', version: 1 });
    registry.listLive.mockResolvedValue([deadSpawning]);
    spawner.isAlive.mockResolvedValue(false);
    registry.transition.mockResolvedValue(makeTask({ id: 'dead-spawn', status: 'failed' }));

    const result = await monitor.runCycle();

    expect(result.deadAgentsDetected).toBe(1);
    expect(registry.transition).toHaveBeenCalledWith(
      'dead-spawn',
      1,
      'failed',
      expect.objectContaining({
        failureContext: expect.objectContaining({ reason: 'agent_died' }),
      }),
    );
  });

  it('detects new PR for alive running agent and transitions to pr_created', async () => {
    const runningTask = makeTask({ id: 'pr-task', status: 'running', prNumber: null });
    registry.listLive.mockResolvedValue([runningTask]);
    spawner.isAlive.mockResolvedValue(true);
    registry.transition.mockResolvedValue(makeTask({ id: 'pr-task', status: 'pr_created', prNumber: 99 }));

    // Mock gh CLI to return a PR
    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr' && args[1] === 'list') {
        return Promise.resolve({
          stdout: JSON.stringify([{ number: 99, state: 'OPEN', url: 'https://github.com/org/repo/pull/99' }]),
          stderr: '',
        });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await monitor.runCycle();

    expect(result.prsDetected).toBe(1);
    expect(registry.transition).toHaveBeenCalledWith(
      'pr-task',
      0,
      'pr_created',
      expect.objectContaining({ prNumber: 99 }),
    );
  });

  it('updates CI status on existing PR when status changes', async () => {
    const prTask = makeTask({
      id: 'ci-task',
      status: 'pr_created',
      prNumber: 42,
      ciStatus: 'in_progress',
      version: 3,
    });
    registry.listLive.mockResolvedValue([prTask]);
    spawner.isAlive.mockResolvedValue(true);
    // get() call for fresh version
    registry.get.mockResolvedValue(makeTask({
      id: 'ci-task',
      status: 'pr_created',
      prNumber: 42,
      ciStatus: 'in_progress',
      version: 3,
    }));
    registry.transition.mockResolvedValue(makeTask({
      id: 'ci-task',
      status: 'pr_created',
      ciStatus: 'success',
    }));

    // Mock gh CLI: getCiStatus returns new status
    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'api' && args[1].includes('check-runs')) {
        return Promise.resolve({
          stdout: JSON.stringify({ status: 'completed', conclusion: 'success' }),
          stderr: '',
        });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await monitor.runCycle();

    expect(result.ciUpdates).toBe(1);
    expect(registry.transition).toHaveBeenCalledWith(
      'ci-task',
      3,
      'pr_created',
      expect.objectContaining({ ciStatus: 'success' }),
    );
  });

  it('does NOT update CI status when status unchanged', async () => {
    const prTask = makeTask({
      id: 'ci-same',
      status: 'pr_created',
      prNumber: 42,
      ciStatus: 'success',
    });
    registry.listLive.mockResolvedValue([prTask]);
    spawner.isAlive.mockResolvedValue(true);

    // Mock gh CLI: getCiStatus returns same status
    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'api' && args[1].includes('check-runs')) {
        return Promise.resolve({
          stdout: JSON.stringify({ status: 'completed', conclusion: 'success' }),
          stderr: '',
        });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await monitor.runCycle();

    expect(result.ciUpdates).toBe(0);
    expect(registry.transition).not.toHaveBeenCalled();
  });

  it('detects stall when no commits for longer than stall threshold', async () => {
    // Create a task with a branch that has an old last commit
    const stalledTask = makeTask({ id: 'stall-1', status: 'running', prNumber: null });
    registry.listLive.mockResolvedValue([stalledTask]);
    spawner.isAlive.mockResolvedValue(true);

    // Mock gh CLI: no PR found, but last commit is very old
    const oldTimestamp = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago, > 1800s threshold
    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr' && args[1] === 'list') {
        return Promise.resolve({ stdout: '[]', stderr: '' });
      }
      if (cmd === 'gh' && args[0] === 'api' && args[1].includes('commits/fleet')) {
        return Promise.resolve({ stdout: oldTimestamp, stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await monitor.runCycle();

    expect(result.stallsDetected).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Agent stall detected',
      expect.objectContaining({ taskId: 'stall-1' }),
    );
  });

  it('does NOT detect stall when last commit is recent', async () => {
    const activeTask = makeTask({ id: 'active-1', status: 'running', prNumber: null });
    registry.listLive.mockResolvedValue([activeTask]);
    spawner.isAlive.mockResolvedValue(true);

    // Mock: no PR, recent commit
    const recentTimestamp = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr' && args[1] === 'list') {
        return Promise.resolve({ stdout: '[]', stderr: '' });
      }
      if (cmd === 'gh' && args[0] === 'api' && args[1].includes('commits/fleet')) {
        return Promise.resolve({ stdout: recentTimestamp, stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await monitor.runCycle();

    expect(result.stallsDetected).toBe(0);
  });

  it('detects timeout when agent exceeds max duration', async () => {
    // spawnedAt is far in the past (> 120 minutes)
    const oldSpawn = new Date(Date.now() - 150 * 60_000).toISOString();
    const timedOutTask = makeTask({
      id: 'timeout-1',
      status: 'running',
      spawnedAt: oldSpawn,
      prNumber: null,
      version: 2,
    });
    registry.listLive.mockResolvedValue([timedOutTask]);
    spawner.isAlive.mockResolvedValue(true);
    registry.transition.mockResolvedValue(makeTask({ id: 'timeout-1', status: 'failed' }));

    // Mock: no PR, no stall (recent commit)
    const recentCommit = new Date().toISOString();
    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr' && args[1] === 'list') {
        return Promise.resolve({ stdout: '[]', stderr: '' });
      }
      if (cmd === 'gh' && args[0] === 'api' && args[1].includes('commits/fleet')) {
        return Promise.resolve({ stdout: recentCommit, stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await monitor.runCycle();

    expect(result.timeoutsTriggered).toBe(1);
    expect(registry.transition).toHaveBeenCalledWith(
      'timeout-1',
      2,
      'failed',
      expect.objectContaining({
        failureContext: expect.objectContaining({
          reason: 'timeout',
        }),
      }),
    );
  });

  it('does NOT timeout when agent is within max duration', async () => {
    const recentSpawn = new Date(Date.now() - 30 * 60_000).toISOString(); // 30 min ago
    const recentTask = makeTask({
      id: 'recent-1',
      status: 'running',
      spawnedAt: recentSpawn,
      prNumber: null,
    });
    registry.listLive.mockResolvedValue([recentTask]);
    spawner.isAlive.mockResolvedValue(true);

    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr' && args[1] === 'list') {
        return Promise.resolve({ stdout: '[]', stderr: '' });
      }
      if (cmd === 'gh' && args[0] === 'api') {
        return Promise.resolve({ stdout: new Date().toISOString(), stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await monitor.runCycle();

    expect(result.timeoutsTriggered).toBe(0);
  });

  it('isolates error in one task — does NOT crash cycle for other tasks', async () => {
    const goodTask = makeTask({ id: 'good-1', status: 'running', prNumber: null });
    const badTask = makeTask({
      id: 'bad-1',
      status: 'running',
      prNumber: null,
      // This task will have a buildHandle that returns null -> skipped
      // We need to make isAlive throw for this task
    });
    registry.listLive.mockResolvedValue([badTask, goodTask]);

    // isAlive: throw for bad-1, succeed for good-1
    spawner.isAlive.mockImplementation(async (handle: AgentHandle) => {
      if (handle.taskId === 'bad-1') {
        throw new Error('process check failed unexpectedly');
      }
      return true;
    });

    // Mock gh calls for good-1
    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr') {
        return Promise.resolve({ stdout: '[]', stderr: '' });
      }
      if (cmd === 'gh' && args[0] === 'api') {
        return Promise.resolve({ stdout: new Date().toISOString(), stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await monitor.runCycle();

    // bad-1 should be in error list, but cycle should still process good-1
    expect(result.errorTaskIds).toContain('bad-1');
    expect(result.tasksChecked).toBe(2);
    expect(logger.error).toHaveBeenCalledWith(
      'Error processing task in monitor cycle',
      expect.objectContaining({ taskId: 'bad-1' }),
    );
  });

  it('skips tasks without processRef (buildHandle returns null)', async () => {
    // Task with no tmuxSession and no containerId -> buildHandle returns null
    const noProcessTask = makeTask({
      id: 'no-proc',
      status: 'running',
      tmuxSession: null,
      containerId: null,
      worktreePath: null,
    });
    registry.listLive.mockResolvedValue([noProcessTask]);

    const result = await monitor.runCycle();

    expect(result.tasksChecked).toBe(1);
    expect(result.deadAgentsDetected).toBe(0);
    // isAlive should not have been called since buildHandle returned null
    expect(spawner.isAlive).not.toHaveBeenCalled();
  });

  it('counts dead agent transition error in errorTaskIds', async () => {
    const deadTask = makeTask({ id: 'dead-err', status: 'running', version: 0 });
    registry.listLive.mockResolvedValue([deadTask]);
    spawner.isAlive.mockResolvedValue(false);
    registry.transition.mockRejectedValue(new Error('stale version'));

    const result = await monitor.runCycle();

    expect(result.deadAgentsDetected).toBe(1);
    expect(result.errorTaskIds).toContain('dead-err');
  });

  it('handles empty live task list gracefully', async () => {
    registry.listLive.mockResolvedValue([]);

    const result = await monitor.runCycle();

    expect(result).toEqual({
      tasksChecked: 0,
      deadAgentsDetected: 0,
      prsDetected: 0,
      ciUpdates: 0,
      stallsDetected: 0,
      timeoutsTriggered: 0,
      errorTaskIds: [],
    });
  });

  it('handles PR transition error in errorTaskIds', async () => {
    const runningTask = makeTask({ id: 'pr-err', status: 'running', prNumber: null });
    registry.listLive.mockResolvedValue([runningTask]);
    spawner.isAlive.mockResolvedValue(true);
    registry.transition.mockRejectedValue(new Error('transition conflict'));

    // Mock gh CLI: return a PR
    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr' && args[1] === 'list') {
        return Promise.resolve({
          stdout: JSON.stringify([{ number: 77, state: 'OPEN', url: 'https://github.com/org/repo/pull/77' }]),
          stderr: '',
        });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await monitor.runCycle();

    expect(result.prsDetected).toBe(1);
    expect(result.errorTaskIds).toContain('pr-err');
  });

  it('builds handle with containerId when tmuxSession is null', async () => {
    const containerTask = makeTask({
      id: 'container-1',
      status: 'running',
      tmuxSession: null,
      containerId: 'abc123',
      prNumber: null,
    });
    registry.listLive.mockResolvedValue([containerTask]);
    spawner.isAlive.mockResolvedValue(true);

    execFileSpy.mockResolvedValue({ stdout: '[]', stderr: '' });

    await monitor.runCycle();

    // Verify isAlive was called with a container-mode handle
    expect(spawner.isAlive).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'container-1',
        processRef: 'abc123',
        mode: 'container',
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// T-3.7: start()/stop() Lifecycle, Overlap Prevention, Health
// ---------------------------------------------------------------------------

describe('FleetMonitor — start()/stop() lifecycle', () => {
  let registry: ReturnType<typeof createMockRegistry>;
  let spawner: ReturnType<typeof createMockSpawner>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    resetExecFile();
    vi.useFakeTimers();
    registry = createMockRegistry();
    spawner = createMockSpawner();
    logger = createMockLogger();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs reconcile on start and sets running flag', async () => {
    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, intervalMs: 30_000 },
    );

    const result = await monitor.start();

    expect(result).toEqual({
      orphanedMarkedFailed: 0,
      untrackedProcesses: 0,
      orphanedTaskIds: [],
      untrackedTaskIds: [],
    });
    expect(monitor.getHealth().running).toBe(true);

    monitor.stop();
  });

  it('double-start guard returns empty reconcile result and logs warning', async () => {
    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, intervalMs: 30_000 },
    );

    await monitor.start();
    const secondResult = await monitor.start();

    expect(secondResult).toEqual({
      orphanedMarkedFailed: 0,
      untrackedProcesses: 0,
      orphanedTaskIds: [],
      untrackedTaskIds: [],
    });
    expect(logger.warn).toHaveBeenCalledWith('FleetMonitor.start() called but already running');

    monitor.stop();
  });

  it('stop() clears interval and sets running to false', async () => {
    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, intervalMs: 30_000 },
    );

    await monitor.start();
    expect(monitor.getHealth().running).toBe(true);

    monitor.stop();
    expect(monitor.getHealth().running).toBe(false);
    expect(logger.info).toHaveBeenCalledWith(
      'FleetMonitor stopped',
      expect.objectContaining({ cycleCount: 0 }),
    );
  });

  it('stop() is safe to call when not running', () => {
    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, intervalMs: 30_000 },
    );

    // Should not throw
    expect(() => monitor.stop()).not.toThrow();
  });

  it('getHealth() returns correct initial values', () => {
    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, intervalMs: 30_000 },
    );

    const health = monitor.getHealth();

    expect(health).toEqual({
      running: false,
      lastCycleMs: 0,
      cycleCount: 0,
      errors: 0,
    });
  });

  it('getHealth() updates after cycles run', async () => {
    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, intervalMs: 1_000, cycleDeadlineMs: 50_000 },
    );

    await monitor.start();

    // Advance timer to trigger a cycle
    await vi.advanceTimersByTimeAsync(1_000);

    const health = monitor.getHealth();
    expect(health.running).toBe(true);
    expect(health.cycleCount).toBe(1);

    monitor.stop();
  });

  it('overlap prevention skips cycle when previous is still running', async () => {
    vi.useRealTimers();

    // Make runCycle slow by making listLive resolve slowly
    let resolveSlowCycle!: () => void;
    const slowPromise = new Promise<FleetTaskRecord[]>((resolve) => {
      resolveSlowCycle = () => resolve([]);
    });

    // First listLive call (reconcile): resolve immediately
    registry.listLive.mockResolvedValueOnce([]);
    // Second call (first cycle): block
    registry.listLive.mockReturnValueOnce(slowPromise);
    // Third call (second cycle): resolve immediately
    registry.listLive.mockResolvedValue([]);

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, intervalMs: 50, cycleDeadlineMs: 50_000 },
    );

    await monitor.start();

    // Wait enough for at least two interval ticks to fire
    await new Promise((r) => setTimeout(r, 150));

    // Should have logged a skip warning
    expect(logger.warn).toHaveBeenCalledWith(
      'Monitor cycle skipped (previous cycle still in progress)',
    );

    // Now resolve the slow cycle and clean up
    resolveSlowCycle();
    await new Promise((r) => setTimeout(r, 10));

    monitor.stop();
    vi.useFakeTimers();
  });

  it('cycle deadline warning logged when cycle exceeds deadline', async () => {
    vi.useRealTimers();

    // Make the cycle take time by adding a small delay in listLive
    // First call: reconcile (fast)
    registry.listLive.mockResolvedValueOnce([]);
    // Second call: cycle (add a delay to exceed deadline)
    registry.listLive.mockImplementationOnce(() =>
      new Promise((resolve) => setTimeout(() => resolve([]), 30)),
    );

    // Use a very short deadline (1ms) so any real cycle exceeds it
    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, intervalMs: 50, cycleDeadlineMs: 1 },
    );

    await monitor.start();

    // Wait for at least one cycle to complete
    await new Promise((r) => setTimeout(r, 150));

    expect(logger.warn).toHaveBeenCalledWith(
      'Monitor cycle exceeded deadline',
      expect.objectContaining({
        deadline: 1,
      }),
    );

    monitor.stop();
    vi.useFakeTimers();
  });

  it('handles reconciliation failure on startup gracefully (degraded mode)', async () => {
    // Make listLive throw during reconcile
    registry.listLive.mockRejectedValueOnce(new Error('DB connection failed'));

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, intervalMs: 30_000 },
    );

    const result = await monitor.start();

    // Should return empty result, not throw
    expect(result).toEqual({
      orphanedMarkedFailed: 0,
      untrackedProcesses: 0,
      orphanedTaskIds: [],
      untrackedTaskIds: [],
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Reconciliation failed on startup (degraded mode)',
      expect.objectContaining({ error: 'DB connection failed' }),
    );
    // Monitor should still be running
    expect(monitor.getHealth().running).toBe(true);

    monitor.stop();
  });

  it('tracks cumulative errors across cycles', async () => {
    // Task that will cause error
    const badTask = makeTask({ id: 'err-task', status: 'running' });

    // First call for reconcile (empty), subsequent calls return bad task
    registry.listLive.mockResolvedValueOnce([]); // reconcile call
    registry.listLive.mockResolvedValue([badTask]); // cycle calls
    spawner.isAlive.mockRejectedValue(new Error('process check failed'));

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, intervalMs: 1_000, cycleDeadlineMs: 50_000 },
    );

    await monitor.start();

    // Run two cycles
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(1_000);

    const health = monitor.getHealth();
    expect(health.errors).toBe(2);
    expect(health.cycleCount).toBe(2);

    monitor.stop();
  });

  it('uses default config values when none provided', () => {
    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
    );

    // The monitor should be constructable without config
    const health = monitor.getHealth();
    expect(health.running).toBe(false);
    expect(health.cycleCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// T-3.7: Monitor Cycle — Additional edge cases
// ---------------------------------------------------------------------------

describe('FleetMonitor — runCycle() edge cases', () => {
  let registry: ReturnType<typeof createMockRegistry>;
  let spawner: ReturnType<typeof createMockSpawner>;
  let logger: ReturnType<typeof createMockLogger>;
  let monitor: FleetMonitor;

  beforeEach(() => {
    resetExecFile();
    registry = createMockRegistry();
    spawner = createMockSpawner();
    logger = createMockLogger();
    monitor = new FleetMonitor(registry as unknown as TaskRegistry, spawner as unknown as AgentSpawner, {
      logger,
      intervalMs: 60_000,
      stallThresholdSec: 1800,
      timeoutMinutes: 120,
    });
  });

  it('does not transition alive agent in pr_created status to failed when dead', async () => {
    // pr_created status is NOT in the dead-agent transition check (only spawning/running)
    const prCreatedTask = makeTask({
      id: 'pr-alive',
      status: 'pr_created',
      prNumber: 42,
    });
    registry.listLive.mockResolvedValue([prCreatedTask]);
    spawner.isAlive.mockResolvedValue(false);

    // Mock CI status call
    execFileSpy.mockResolvedValue({ stdout: '', stderr: '' });

    const result = await monitor.runCycle();

    // Dead agent detection only applies to spawning/running
    expect(result.deadAgentsDetected).toBe(0);
  });

  it('skips PR detection when task already has prNumber', async () => {
    const taskWithPr = makeTask({
      id: 'has-pr',
      status: 'running',
      prNumber: 55,
    });
    registry.listLive.mockResolvedValue([taskWithPr]);
    spawner.isAlive.mockResolvedValue(true);
    registry.get.mockResolvedValue(taskWithPr);

    // Mock: CI status unchanged
    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'api' && args[1].includes('check-runs')) {
        return Promise.resolve({
          stdout: JSON.stringify({ status: 'completed', conclusion: 'success' }),
          stderr: '',
        });
      }
      if (cmd === 'gh' && args[0] === 'api' && args[1].includes('commits/fleet')) {
        return Promise.resolve({ stdout: new Date().toISOString(), stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    await monitor.runCycle();

    // getPrForBranch should NOT have been called (gh pr list)
    const prListCalls = (execFileSpy.mock.calls as [string, string[]][]).filter(
      (c) => c[0] === 'gh' && c[1][0] === 'pr',
    );
    expect(prListCalls).toHaveLength(0);
  });

  it('handles timeout for spawning agent', async () => {
    const oldSpawn = new Date(Date.now() - 150 * 60_000).toISOString();
    const timedOutSpawning = makeTask({
      id: 'timeout-spawn',
      status: 'spawning',
      spawnedAt: oldSpawn,
      version: 1,
    });
    registry.listLive.mockResolvedValue([timedOutSpawning]);
    // spawning + alive -> not dead, but still check timeout
    spawner.isAlive.mockResolvedValue(true);
    registry.transition.mockResolvedValue(makeTask({ id: 'timeout-spawn', status: 'failed' }));

    // No PR calls needed for spawning
    execFileSpy.mockResolvedValue({ stdout: '', stderr: '' });

    const result = await monitor.runCycle();

    expect(result.timeoutsTriggered).toBe(1);
    expect(registry.transition).toHaveBeenCalledWith(
      'timeout-spawn',
      1,
      'failed',
      expect.objectContaining({
        failureContext: expect.objectContaining({ reason: 'timeout' }),
      }),
    );
  });

  it('does NOT timeout pr_created/reviewing tasks (no transition)', async () => {
    const oldSpawn = new Date(Date.now() - 150 * 60_000).toISOString();
    const oldPrTask = makeTask({
      id: 'old-pr',
      status: 'pr_created',
      prNumber: 10,
      spawnedAt: oldSpawn,
    });
    registry.listLive.mockResolvedValue([oldPrTask]);
    spawner.isAlive.mockResolvedValue(true);
    registry.get.mockResolvedValue(oldPrTask);

    execFileSpy.mockResolvedValue({ stdout: '', stderr: '' });

    const result = await monitor.runCycle();

    // Timeout is detected but transition only happens for running/spawning
    expect(result.timeoutsTriggered).toBe(1);
    // Transition should NOT be called for pr_created status timeout
    expect(registry.transition).not.toHaveBeenCalled();
  });

  it('handles timeout transition error in errorTaskIds', async () => {
    const oldSpawn = new Date(Date.now() - 150 * 60_000).toISOString();
    const timeoutErrTask = makeTask({
      id: 'timeout-err',
      status: 'running',
      spawnedAt: oldSpawn,
      prNumber: null,
      version: 0,
    });
    registry.listLive.mockResolvedValue([timeoutErrTask]);
    spawner.isAlive.mockResolvedValue(true);
    registry.transition.mockRejectedValue(new Error('version conflict'));

    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr') {
        return Promise.resolve({ stdout: '[]', stderr: '' });
      }
      if (cmd === 'gh' && args[0] === 'api') {
        return Promise.resolve({ stdout: new Date().toISOString(), stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await monitor.runCycle();

    expect(result.timeoutsTriggered).toBe(1);
    expect(result.errorTaskIds).toContain('timeout-err');
  });

  it('does NOT run stall detection for non-running status tasks', async () => {
    const prCreatedTask = makeTask({
      id: 'no-stall',
      status: 'pr_created',
      prNumber: 42,
    });
    registry.listLive.mockResolvedValue([prCreatedTask]);
    spawner.isAlive.mockResolvedValue(true);
    registry.get.mockResolvedValue(prCreatedTask);

    // CI status unchanged
    execFileSpy.mockResolvedValue({ stdout: '', stderr: '' });

    const result = await monitor.runCycle();

    expect(result.stallsDetected).toBe(0);
    // getLastCommitTimestamp should not be called for pr_created tasks
    const commitCalls = (execFileSpy.mock.calls as [string, string[]][]).filter(
      (c) =>
        c[0] === 'gh' && c[1][0] === 'api' && c[1][1] && !c[1][1].includes('check-runs'),
    );
    expect(commitCalls).toHaveLength(0);
  });

  it('does NOT stall-detect when getLastCommitTimestamp returns null', async () => {
    const runningTask = makeTask({ id: 'no-commit', status: 'running', prNumber: null });
    registry.listLive.mockResolvedValue([runningTask]);
    spawner.isAlive.mockResolvedValue(true);

    // No PR, no commit data
    execFileSpy.mockResolvedValue({ stdout: '', stderr: '' });

    const result = await monitor.runCycle();

    // No stall because there's no commit timestamp to compare against
    expect(result.stallsDetected).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// T-6.11: Insight Harvesting in runCycle()
// ---------------------------------------------------------------------------

describe('FleetMonitor — insight harvesting (T-6.11)', () => {
  let registry: ReturnType<typeof createMockRegistry>;
  let spawner: ReturnType<typeof createMockSpawner>;
  let logger: ReturnType<typeof createMockLogger>;

  function createMockInsightService() {
    return {
      harvest: vi.fn().mockResolvedValue(null),
      pruneExpired: vi.fn().mockResolvedValue(0),
      getRelevantInsights: vi.fn().mockReturnValue([]),
      persist: vi.fn(),
      loadFromDb: vi.fn(),
      pruneExpiredFromDb: vi.fn(),
      pruneByTask: vi.fn(),
      getPoolStats: vi.fn(),
      poolRef: {} as any,
    };
  }

  beforeEach(() => {
    resetExecFile();
    registry = createMockRegistry();
    spawner = createMockSpawner();
    logger = createMockLogger();
  });

  it('harvest called for running tasks with worktreePath', async () => {
    const insightSvc = createMockInsightService();
    const runningTask = makeTask({
      id: 'harvest-1',
      status: 'running',
      worktreePath: '/tmp/fleet/harvest-1',
      prNumber: null,
    });
    registry.listLive.mockResolvedValue([runningTask]);
    spawner.isAlive.mockResolvedValue(true);

    // Mock gh calls to avoid interference
    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr') {
        return Promise.resolve({ stdout: '[]', stderr: '' });
      }
      if (cmd === 'gh' && args[0] === 'api') {
        return Promise.resolve({ stdout: new Date().toISOString(), stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, insightService: insightSvc as any },
    );

    await monitor.runCycle();

    expect(insightSvc.harvest).toHaveBeenCalledWith('harvest-1', '/tmp/fleet/harvest-1', undefined, null);
  });

  it('harvest passes groupId to insightService (BF-025)', async () => {
    const insightSvc = createMockInsightService();
    const groupedTask = makeTask({
      id: 'harvest-g',
      status: 'running',
      worktreePath: '/tmp/fleet/harvest-g',
      prNumber: null,
      groupId: 'group-abc',
    });
    registry.listLive.mockResolvedValue([groupedTask]);
    spawner.isAlive.mockResolvedValue(true);

    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr') {
        return Promise.resolve({ stdout: '[]', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, insightService: insightSvc as any },
    );

    await monitor.runCycle();

    expect(insightSvc.harvest).toHaveBeenCalledWith('harvest-g', '/tmp/fleet/harvest-g', undefined, 'group-abc');
  });

  it('harvest skipped for tasks without worktreePath', async () => {
    const insightSvc = createMockInsightService();
    const noWorktreeTask = makeTask({
      id: 'no-wt',
      status: 'running',
      worktreePath: null,
      prNumber: null,
    });
    registry.listLive.mockResolvedValue([noWorktreeTask]);
    spawner.isAlive.mockResolvedValue(true);
    execFileSpy.mockResolvedValue({ stdout: '[]', stderr: '' });

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, insightService: insightSvc as any },
    );

    await monitor.runCycle();

    expect(insightSvc.harvest).not.toHaveBeenCalled();
  });

  it('harvest error does not crash cycle', async () => {
    const insightSvc = createMockInsightService();
    insightSvc.harvest.mockRejectedValue(new Error('git failed'));

    const runningTask = makeTask({
      id: 'harvest-err',
      status: 'running',
      worktreePath: '/tmp/fleet/harvest-err',
      prNumber: null,
    });
    registry.listLive.mockResolvedValue([runningTask]);
    spawner.isAlive.mockResolvedValue(true);

    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr') {
        return Promise.resolve({ stdout: '[]', stderr: '' });
      }
      if (cmd === 'gh' && args[0] === 'api') {
        return Promise.resolve({ stdout: new Date().toISOString(), stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, insightService: insightSvc as any },
    );

    // Should not throw
    const result = await monitor.runCycle();
    expect(result.tasksChecked).toBe(1);
    // Error should NOT appear in errorTaskIds since harvest failure is isolated
    expect(result.errorTaskIds).toHaveLength(0);
  });

  it('pruneExpired called at end of cycle', async () => {
    const insightSvc = createMockInsightService();
    registry.listLive.mockResolvedValue([]);

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, insightService: insightSvc as any },
    );

    await monitor.runCycle();

    expect(insightSvc.pruneExpired).toHaveBeenCalledOnce();
  });

  it('pruneExpired error is non-fatal', async () => {
    const insightSvc = createMockInsightService();
    insightSvc.pruneExpired.mockRejectedValue(new Error('prune failed'));
    registry.listLive.mockResolvedValue([]);

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, insightService: insightSvc as any },
    );

    // Should not throw
    const result = await monitor.runCycle();
    expect(result.tasksChecked).toBe(0);
  });

  it('no harvest or prune when insightService is not provided', async () => {
    registry.listLive.mockResolvedValue([
      makeTask({ id: 'no-svc', status: 'running', worktreePath: '/tmp/wt', prNumber: null }),
    ]);
    spawner.isAlive.mockResolvedValue(true);
    execFileSpy.mockResolvedValue({ stdout: '[]', stderr: '' });

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger },
    );

    // Should run without any insight-related errors
    const result = await monitor.runCycle();
    expect(result.tasksChecked).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// T-6.12: Identity Outcome Recording
// ---------------------------------------------------------------------------

describe('FleetMonitor — identity outcome recording (T-6.12)', () => {
  let registry: ReturnType<typeof createMockRegistry>;
  let spawner: ReturnType<typeof createMockSpawner>;
  let logger: ReturnType<typeof createMockLogger>;

  function createMockIdentityService() {
    return {
      resolveIdentity: vi.fn(),
      getOrNull: vi.fn(),
      getByOperator: vi.fn(),
      recordTaskOutcome: vi.fn().mockResolvedValue({}),
      getHistory: vi.fn(),
    };
  }

  beforeEach(() => {
    resetExecFile();
    registry = createMockRegistry();
    spawner = createMockSpawner();
    logger = createMockLogger();
  });

  it('outcome recorded on dead agent detection (task failure)', async () => {
    const identitySvc = createMockIdentityService();
    const deadTask = makeTask({
      id: 'dead-id',
      status: 'running',
      agentIdentityId: 'identity-001',
      version: 0,
    });
    registry.listLive.mockResolvedValue([deadTask]);
    spawner.isAlive.mockResolvedValue(false);
    registry.transition.mockResolvedValue(makeTask({ id: 'dead-id', status: 'failed' }));

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, identityService: identitySvc as any },
    );

    await monitor.runCycle();

    expect(identitySvc.recordTaskOutcome).toHaveBeenCalledWith(
      'identity-001',
      'dead-id',
      'failed',
    );
  });

  it('outcome recorded on timeout detection', async () => {
    const identitySvc = createMockIdentityService();
    const oldSpawn = new Date(Date.now() - 150 * 60_000).toISOString();
    const timedOutTask = makeTask({
      id: 'timeout-id',
      status: 'running',
      agentIdentityId: 'identity-002',
      spawnedAt: oldSpawn,
      prNumber: null,
      version: 1,
    });
    registry.listLive.mockResolvedValue([timedOutTask]);
    spawner.isAlive.mockResolvedValue(true);
    registry.transition.mockResolvedValue(makeTask({ id: 'timeout-id', status: 'failed' }));

    execFileSpy.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'gh' && args[0] === 'pr') {
        return Promise.resolve({ stdout: '[]', stderr: '' });
      }
      if (cmd === 'gh' && args[0] === 'api') {
        return Promise.resolve({ stdout: new Date().toISOString(), stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, identityService: identitySvc as any },
    );

    await monitor.runCycle();

    expect(identitySvc.recordTaskOutcome).toHaveBeenCalledWith(
      'identity-002',
      'timeout-id',
      'failed',
    );
  });

  it('missing agentIdentityId — outcome recording skipped', async () => {
    const identitySvc = createMockIdentityService();
    const deadTask = makeTask({
      id: 'no-identity',
      status: 'running',
      agentIdentityId: null, // No identity linked
      version: 0,
    });
    registry.listLive.mockResolvedValue([deadTask]);
    spawner.isAlive.mockResolvedValue(false);
    registry.transition.mockResolvedValue(makeTask({ id: 'no-identity', status: 'failed' }));

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, identityService: identitySvc as any },
    );

    await monitor.runCycle();

    // recordTaskOutcome should NOT be called when agentIdentityId is null
    expect(identitySvc.recordTaskOutcome).not.toHaveBeenCalled();
  });

  it('identity service error is non-fatal', async () => {
    const identitySvc = createMockIdentityService();
    identitySvc.recordTaskOutcome.mockRejectedValue(new Error('DB down'));

    const deadTask = makeTask({
      id: 'id-err',
      status: 'running',
      agentIdentityId: 'identity-003',
      version: 0,
    });
    registry.listLive.mockResolvedValue([deadTask]);
    spawner.isAlive.mockResolvedValue(false);
    registry.transition.mockResolvedValue(makeTask({ id: 'id-err', status: 'failed' }));

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger, identityService: identitySvc as any },
    );

    // Should not throw
    const result = await monitor.runCycle();
    expect(result.deadAgentsDetected).toBe(1);

    // Warning should be logged
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to record identity outcome (non-fatal)',
      expect.objectContaining({
        taskId: 'id-err',
        agentIdentityId: 'identity-003',
      }),
    );
  });

  it('no outcome recording when identityService is not provided', async () => {
    const deadTask = makeTask({
      id: 'no-svc',
      status: 'running',
      agentIdentityId: 'identity-004',
      version: 0,
    });
    registry.listLive.mockResolvedValue([deadTask]);
    spawner.isAlive.mockResolvedValue(false);
    registry.transition.mockResolvedValue(makeTask({ id: 'no-svc', status: 'failed' }));

    const monitor = new FleetMonitor(
      registry as unknown as TaskRegistry,
      spawner as unknown as AgentSpawner,
      { logger }, // No identityService
    );

    // Should run without errors
    const result = await monitor.runCycle();
    expect(result.deadAgentsDetected).toBe(1);
  });
});
