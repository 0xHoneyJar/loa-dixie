/**
 * Fleet Monitor — Process Health Monitoring + Startup Reconciliation
 *
 * Periodic monitoring loop that checks agent process health, detects PRs,
 * updates CI status, and handles stalls/timeouts. On startup, reconciles
 * DB state against actual running processes to recover from crashes.
 *
 * All subprocess invocations use execFile with argument arrays — never
 * shell strings — to prevent injection attacks.
 *
 * See: SDD §3.1 (monitor cycle), §3.2 (reconciliation), §3.3 (GitHub CLI)
 * @since cycle-012 — Sprint 88
 */
import { execFile as execFileRaw } from 'node:child_process';
import { promisify } from 'node:util';

import type { TaskRegistry } from './task-registry.js';
import type { AgentSpawner, AgentHandle } from './agent-spawner.js';
import type { FleetTaskRecord, FleetTaskStatus } from '../types/fleet.js';
import type { AgentIdentityService } from './agent-identity-service.js';
import type { CollectiveInsightService } from './collective-insight-service.js';
import type { TaskOutcome } from '../types/agent-identity.js';

const execFile = promisify(execFileRaw);

// ---------------------------------------------------------------------------
// Exported Types
// ---------------------------------------------------------------------------

/** Result of a startup reconciliation pass. */
export interface ReconcileResult {
  /** Number of DB records transitioned to 'failed' (orphaned). */
  readonly orphanedMarkedFailed: number;
  /** Number of OS-level processes found with no matching DB record. */
  readonly untrackedProcesses: number;
  /** Task IDs that were orphaned. */
  readonly orphanedTaskIds: readonly string[];
  /** Task IDs of untracked processes. */
  readonly untrackedTaskIds: readonly string[];
}

/** Result of a single monitor cycle. */
export interface MonitorCycleResult {
  /** Number of tasks checked in this cycle. */
  readonly tasksChecked: number;
  /** Number of dead agents detected. */
  readonly deadAgentsDetected: number;
  /** Number of PRs newly discovered. */
  readonly prsDetected: number;
  /** Number of CI status updates applied. */
  readonly ciUpdates: number;
  /** Number of stalls detected (no commits for stall threshold). */
  readonly stallsDetected: number;
  /** Number of timeouts triggered (exceeded max duration). */
  readonly timeoutsTriggered: number;
  /** Task IDs where errors occurred (isolated, not propagated). */
  readonly errorTaskIds: readonly string[];
}

/** Health status of the FleetMonitor. */
export interface MonitorHealth {
  /** Whether the monitor loop is currently running. */
  readonly running: boolean;
  /** Duration of the last completed cycle in milliseconds. */
  readonly lastCycleMs: number;
  /** Total number of cycles completed since start. */
  readonly cycleCount: number;
  /** Cumulative error count across all cycles. */
  readonly errors: number;
}

/** Configuration for the FleetMonitor. */
export interface FleetMonitorConfig {
  /** Interval between monitor cycles in milliseconds. Default: 30_000. */
  readonly intervalMs?: number;
  /** Maximum cycle duration before logging a warning, in milliseconds. Default: 25_000. */
  readonly cycleDeadlineMs?: number;
  /** Stall threshold: seconds since last commit to consider an agent stalled. Default: 1800 (30 min). */
  readonly stallThresholdSec?: number;
  /** Timeout threshold: minutes since spawn to consider an agent timed out. Default: 120. */
  readonly timeoutMinutes?: number;
  /** Logger implementation. Defaults to console. */
  readonly logger?: MonitorLogger;
  /** Ecology: insight harvesting service (T-6.6). Optional — skipped when null. */
  readonly insightService?: CollectiveInsightService;
  /** Ecology: agent identity service for outcome recording (T-6.7). Optional. */
  readonly identityService?: AgentIdentityService;
}

/** Minimal logger interface for the FleetMonitor. */
export interface MonitorLogger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// GitHubCli Helper
// ---------------------------------------------------------------------------

/** PR information returned by GitHubCli. */
export interface PrInfo {
  readonly number: number;
  readonly state: string;
  readonly url: string;
}

/** CI status information returned by GitHubCli. */
export interface CiStatusInfo {
  readonly status: string;
  readonly conclusion: string | null;
}

/**
 * Thin wrapper around the `gh` CLI for GitHub operations.
 * All calls use execFile with argument arrays — never shell strings.
 */
export class GitHubCli {
  private readonly logger: MonitorLogger;

  constructor(logger?: MonitorLogger) {
    this.logger = logger ?? console;
  }

  /**
   * Get the PR associated with a branch.
   * Returns null if no PR exists or on error.
   */
  async getPrForBranch(branch: string): Promise<PrInfo | null> {
    try {
      const { stdout } = await execFile('gh', [
        'pr', 'list',
        '--head', branch,
        '--json', 'number,state,url',
        '--limit', '1',
      ]);

      const parsed = JSON.parse(stdout.trim()) as PrInfo[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return null;
      }

      return {
        number: parsed[0].number,
        state: parsed[0].state,
        url: parsed[0].url,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // Detect rate limiting
      if (message.includes('rate limit') || message.includes('403')) {
        this.logger.warn('GitHub rate limit hit during PR lookup', { branch });
      }

      return null;
    }
  }

  /**
   * Get the CI status for a branch (latest commit checks).
   * Returns null on error.
   */
  async getCiStatus(branch: string): Promise<CiStatusInfo | null> {
    try {
      const { stdout } = await execFile('gh', [
        'api',
        `repos/{owner}/{repo}/commits/${branch}/check-runs`,
        '--jq', '.check_runs[0] | {status: .status, conclusion: .conclusion}',
      ]);

      const trimmed = stdout.trim();
      if (!trimmed || trimmed === 'null') {
        return null;
      }

      const parsed = JSON.parse(trimmed) as CiStatusInfo;
      return {
        status: parsed.status ?? 'unknown',
        conclusion: parsed.conclusion ?? null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the timestamp of the last commit on a branch.
   * Returns null on error.
   */
  async getLastCommitTimestamp(branch: string): Promise<string | null> {
    try {
      const { stdout } = await execFile('gh', [
        'api',
        `repos/{owner}/{repo}/commits/${branch}`,
        '--jq', '.commit.committer.date',
      ]);

      const trimmed = stdout.trim();
      if (!trimmed || trimmed === 'null') {
        return null;
      }

      return trimmed;
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Live statuses — tasks that should have a running process
// ---------------------------------------------------------------------------

const LIVE_STATUSES: Set<FleetTaskStatus> = new Set([
  'spawning',
  'running',
  'pr_created',
  'reviewing',
]);

// ---------------------------------------------------------------------------
// FleetMonitor
// ---------------------------------------------------------------------------

export class FleetMonitor {
  private readonly registry: TaskRegistry;
  private readonly spawner: AgentSpawner;
  private readonly ghCli: GitHubCli;
  private readonly config: Required<Omit<FleetMonitorConfig, 'logger' | 'insightService' | 'identityService'>> & { logger: MonitorLogger };

  // Ecology services (optional — graceful degradation)
  private readonly insightService: CollectiveInsightService | null;
  private readonly identityService: AgentIdentityService | null;

  // Interval state
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private cycleInProgress = false;

  // Health tracking
  private _running = false;
  private _lastCycleMs = 0;
  private _cycleCount = 0;
  private _errors = 0;

  constructor(
    registry: TaskRegistry,
    spawner: AgentSpawner,
    config?: FleetMonitorConfig,
  ) {
    this.registry = registry;
    this.spawner = spawner;
    this.config = {
      intervalMs: config?.intervalMs ?? 30_000,
      cycleDeadlineMs: config?.cycleDeadlineMs ?? 25_000,
      stallThresholdSec: config?.stallThresholdSec ?? 1800,
      timeoutMinutes: config?.timeoutMinutes ?? 120,
      logger: config?.logger ?? console,
    };
    this.insightService = config?.insightService ?? null;
    this.identityService = config?.identityService ?? null;
    this.ghCli = new GitHubCli(this.config.logger);
  }

  // -------------------------------------------------------------------------
  // Reconciliation (startup crash recovery)
  // -------------------------------------------------------------------------

  /**
   * Reconcile DB state against actual running processes.
   *
   * 1. Find DB records in live statuses that have no corresponding OS process.
   *    Mark them as 'failed' with failure context explaining the orphan.
   * 2. Find OS processes that have no matching DB record.
   *    Log a warning (do not kill — operator may want to inspect).
   */
  async reconcile(): Promise<ReconcileResult> {
    const logger = this.config.logger;
    logger.info('Starting fleet reconciliation');

    // Step 1: Get all live tasks from DB
    const liveTasks = await this.registry.listLive();
    const liveTaskMap = new Map<string, FleetTaskRecord>();
    for (const task of liveTasks) {
      if (LIVE_STATUSES.has(task.status)) {
        liveTaskMap.set(task.id, task);
      }
    }

    // Step 2: Get all running processes from the spawner
    const activeHandles = await this.spawner.listActive();
    const activeTaskIds = new Set(activeHandles.map((h) => h.taskId));

    // Step 3: Find orphaned records (in DB but no process)
    const orphanedTaskIds: string[] = [];
    for (const [taskId, task] of liveTaskMap) {
      if (!activeTaskIds.has(taskId)) {
        orphanedTaskIds.push(taskId);

        // Transition to 'failed' if the task is in a state that allows it
        try {
          if (task.status === 'spawning' || task.status === 'running') {
            await this.registry.transition(task.id, task.version, 'failed', {
              failureContext: {
                reason: 'orphaned_on_reconcile',
                message: `Task ${taskId} was in '${task.status}' but no OS process found`,
                reconciledAt: new Date().toISOString(),
              },
              completedAt: new Date().toISOString(),
            });
            logger.warn('Orphaned task marked as failed', {
              taskId,
              previousStatus: task.status,
            });
          } else {
            // pr_created, reviewing — these may not have a running process
            // but we still flag them
            logger.warn('Orphaned task detected (non-running status)', {
              taskId,
              status: task.status,
            });
          }
        } catch (err) {
          logger.error('Failed to reconcile orphaned task', {
            taskId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Step 4: Find untracked processes (running but no DB record)
    const untrackedTaskIds: string[] = [];
    for (const handle of activeHandles) {
      if (!liveTaskMap.has(handle.taskId)) {
        untrackedTaskIds.push(handle.taskId);
        logger.warn('Untracked process detected (no DB record)', {
          taskId: handle.taskId,
          processRef: handle.processRef,
          mode: handle.mode,
        });
      }
    }

    const result: ReconcileResult = {
      orphanedMarkedFailed: orphanedTaskIds.length,
      untrackedProcesses: untrackedTaskIds.length,
      orphanedTaskIds,
      untrackedTaskIds,
    };

    logger.info('Fleet reconciliation complete', {
      orphaned: result.orphanedMarkedFailed,
      untracked: result.untrackedProcesses,
    });

    return result;
  }

  // -------------------------------------------------------------------------
  // Monitor Cycle
  // -------------------------------------------------------------------------

  /**
   * Run a single monitor cycle. For each live task:
   * 1. Check if the agent process is alive
   * 2. If dead, transition to 'failed'
   * 3. If alive and running, check for PRs
   * 4. If PR detected, transition to 'pr_created'
   * 5. Update CI status
   * 6. Detect stalls (no commit activity)
   * 7. Detect timeouts (exceeded max duration)
   *
   * Errors for individual tasks are isolated and logged, never propagated.
   */
  async runCycle(): Promise<MonitorCycleResult> {
    const logger = this.config.logger;
    const liveTasks = await this.registry.listLive();

    let deadAgentsDetected = 0;
    let prsDetected = 0;
    let ciUpdates = 0;
    let stallsDetected = 0;
    let timeoutsTriggered = 0;
    const errorTaskIds: string[] = [];

    for (const task of liveTasks) {
      try {
        // Build a handle for the spawner
        const handle = this.buildHandle(task);
        if (!handle) {
          continue;
        }

        // 1. Check if alive
        const alive = await this.spawner.isAlive(handle);

        if (!alive && (task.status === 'spawning' || task.status === 'running')) {
          // Dead agent — transition to failed
          deadAgentsDetected++;
          try {
            await this.registry.transition(task.id, task.version, 'failed', {
              failureContext: {
                reason: 'agent_died',
                message: `Agent process for task ${task.id} is no longer running`,
                detectedAt: new Date().toISOString(),
              },
              completedAt: new Date().toISOString(),
            });
            logger.warn('Dead agent detected and marked failed', {
              taskId: task.id,
              status: task.status,
            });

            // T-6.7: Record identity outcome on dead agent (terminal status)
            await this.recordIdentityOutcome(task.id, task.agentIdentityId, 'failed');
          } catch (transitionErr) {
            logger.error('Failed to transition dead agent to failed', {
              taskId: task.id,
              error: transitionErr instanceof Error ? transitionErr.message : String(transitionErr),
            });
            errorTaskIds.push(task.id);
          }
          continue;
        }

        // 2. PR detection (only for 'running' tasks without a PR)
        if (task.status === 'running' && task.prNumber === null) {
          const prInfo = await this.ghCli.getPrForBranch(task.branch);
          if (prInfo) {
            prsDetected++;
            try {
              await this.registry.transition(task.id, task.version, 'pr_created', {
                prNumber: prInfo.number,
              });
              logger.info('PR detected for task', {
                taskId: task.id,
                prNumber: prInfo.number,
              });
            } catch (transitionErr) {
              logger.error('Failed to transition task to pr_created', {
                taskId: task.id,
                error: transitionErr instanceof Error ? transitionErr.message : String(transitionErr),
              });
              errorTaskIds.push(task.id);
            }
            continue;
          }
        }

        // 3. CI status update (for tasks with a PR)
        if (task.prNumber !== null) {
          const ciInfo = await this.ghCli.getCiStatus(task.branch);
          if (ciInfo) {
            const newCiStatus = ciInfo.conclusion ?? ciInfo.status;
            if (newCiStatus !== task.ciStatus) {
              ciUpdates++;
              try {
                // Use a metadata-only update via transition to the same status
                // We re-fetch the task to get current version for the update
                const fresh = await this.registry.get(task.id);
                if (fresh) {
                  await this.registry.transition(fresh.id, fresh.version, fresh.status, {
                    ciStatus: newCiStatus,
                  });
                }
              } catch (transitionErr) {
                // CI update failure is non-critical
                logger.warn('Failed to update CI status', {
                  taskId: task.id,
                  error: transitionErr instanceof Error ? transitionErr.message : String(transitionErr),
                });
              }
            }
          }
        }

        // 4. Stall detection (for 'running' tasks)
        if (task.status === 'running') {
          const lastCommit = await this.ghCli.getLastCommitTimestamp(task.branch);
          if (lastCommit) {
            const commitAge = (Date.now() - new Date(lastCommit).getTime()) / 1000;
            if (commitAge > this.config.stallThresholdSec) {
              stallsDetected++;
              logger.warn('Agent stall detected', {
                taskId: task.id,
                lastCommitAge: Math.round(commitAge),
                thresholdSec: this.config.stallThresholdSec,
              });
            }
          }
        }

        // 5. Timeout detection
        if (task.spawnedAt) {
          const ageMinutes = (Date.now() - new Date(task.spawnedAt).getTime()) / 60_000;
          if (ageMinutes > this.config.timeoutMinutes) {
            timeoutsTriggered++;
            try {
              if (task.status === 'running' || task.status === 'spawning') {
                await this.registry.transition(task.id, task.version, 'failed', {
                  failureContext: {
                    reason: 'timeout',
                    message: `Task ${task.id} exceeded timeout of ${this.config.timeoutMinutes} minutes`,
                    ageMinutes: Math.round(ageMinutes),
                    detectedAt: new Date().toISOString(),
                  },
                  completedAt: new Date().toISOString(),
                });
                logger.warn('Agent timeout triggered', {
                  taskId: task.id,
                  ageMinutes: Math.round(ageMinutes),
                });

                // T-6.7: Record identity outcome on timeout (terminal status)
                await this.recordIdentityOutcome(task.id, task.agentIdentityId, 'failed');
              }
            } catch (transitionErr) {
              logger.error('Failed to transition timed-out agent', {
                taskId: task.id,
                error: transitionErr instanceof Error ? transitionErr.message : String(transitionErr),
              });
              errorTaskIds.push(task.id);
            }
          }
        }

        // 6. Insight harvesting (T-6.6) — harvest for running tasks with worktreePath
        if (this.insightService && task.worktreePath && task.status === 'running') {
          try {
            await this.insightService.harvest(task.id, task.worktreePath);
          } catch {
            // Harvest failure is non-fatal — never break the cycle
          }
        }
      } catch (err) {
        // Isolate per-task errors — never let one task's failure break the cycle
        errorTaskIds.push(task.id);
        logger.error('Error processing task in monitor cycle', {
          taskId: task.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // End-of-cycle: prune expired insights (T-6.6)
    if (this.insightService) {
      try {
        await this.insightService.pruneExpired();
      } catch {
        // Prune failure is non-fatal
      }
    }

    return {
      tasksChecked: liveTasks.length,
      deadAgentsDetected,
      prsDetected,
      ciUpdates,
      stallsDetected,
      timeoutsTriggered,
      errorTaskIds,
    };
  }

  // -------------------------------------------------------------------------
  // Start / Stop
  // -------------------------------------------------------------------------

  /**
   * Start the monitor loop. Runs reconcile() on first start, then
   * runs cycles at the configured interval.
   *
   * Overlap prevention: if a cycle is still in progress when the next
   * interval fires, the new cycle is skipped.
   *
   * Cycle deadline: if a cycle exceeds the deadline, a warning is logged
   * but the cycle is allowed to complete.
   */
  async start(): Promise<ReconcileResult> {
    const logger = this.config.logger;

    if (this._running) {
      logger.warn('FleetMonitor.start() called but already running');
      return {
        orphanedMarkedFailed: 0,
        untrackedProcesses: 0,
        orphanedTaskIds: [],
        untrackedTaskIds: [],
      };
    }

    // Run reconciliation on startup
    let reconcileResult: ReconcileResult;
    try {
      reconcileResult = await this.reconcile();
    } catch (err) {
      logger.error('Reconciliation failed on startup (degraded mode)', {
        error: err instanceof Error ? err.message : String(err),
      });
      reconcileResult = {
        orphanedMarkedFailed: 0,
        untrackedProcesses: 0,
        orphanedTaskIds: [],
        untrackedTaskIds: [],
      };
    }

    this._running = true;

    // Start interval loop
    this.intervalHandle = setInterval(() => {
      void this.tick();
    }, this.config.intervalMs);

    logger.info('FleetMonitor started', {
      intervalMs: this.config.intervalMs,
      reconcileResult: {
        orphaned: reconcileResult.orphanedMarkedFailed,
        untracked: reconcileResult.untrackedProcesses,
      },
    });

    return reconcileResult;
  }

  /**
   * Stop the monitor loop. Waits for any in-progress cycle to complete
   * before resolving.
   */
  stop(): void {
    const logger = this.config.logger;

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this._running = false;
    logger.info('FleetMonitor stopped', { cycleCount: this._cycleCount });
  }

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------

  /** Get current health status of the monitor. */
  getHealth(): MonitorHealth {
    return {
      running: this._running,
      lastCycleMs: this._lastCycleMs,
      cycleCount: this._cycleCount,
      errors: this._errors,
    };
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /** Run a single tick of the monitor loop with overlap prevention. */
  private async tick(): Promise<void> {
    const logger = this.config.logger;

    if (this.cycleInProgress) {
      logger.warn('Monitor cycle skipped (previous cycle still in progress)');
      return;
    }

    this.cycleInProgress = true;
    const start = Date.now();

    try {
      const result = await this.runCycle();
      const elapsed = Date.now() - start;

      this._lastCycleMs = elapsed;
      this._cycleCount++;
      this._errors += result.errorTaskIds.length;

      // Cycle deadline warning
      if (elapsed > this.config.cycleDeadlineMs) {
        logger.warn('Monitor cycle exceeded deadline', {
          elapsed,
          deadline: this.config.cycleDeadlineMs,
          tasksChecked: result.tasksChecked,
        });
      }
    } catch (err) {
      this._errors++;
      logger.error('Monitor cycle failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.cycleInProgress = false;
    }
  }

  /**
   * Record a task outcome against the agent identity (T-6.7).
   *
   * Maps task terminal status to TaskOutcome and calls identityService.recordTaskOutcome().
   * Non-fatal — errors are logged but never propagated.
   */
  private async recordIdentityOutcome(
    taskId: string,
    agentIdentityId: string | null | undefined,
    status: string,
  ): Promise<void> {
    if (!this.identityService || !agentIdentityId) return;

    const outcomeMap: Record<string, TaskOutcome> = {
      merged: 'merged',
      failed: 'failed',
      abandoned: 'abandoned',
      cancelled: 'abandoned',
    };

    const outcome = outcomeMap[status];
    if (!outcome) return;

    try {
      await this.identityService.recordTaskOutcome(agentIdentityId, taskId, outcome);
    } catch (err) {
      this.config.logger.warn('Failed to record identity outcome (non-fatal)', {
        taskId,
        agentIdentityId,
        outcome,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Build an AgentHandle from a task record for spawner operations.
   * Returns null if the task lacks the required fields.
   */
  private buildHandle(task: FleetTaskRecord): AgentHandle | null {
    const processRef = task.tmuxSession ?? task.containerId;
    if (!processRef) {
      return null;
    }

    return {
      taskId: task.id,
      branch: task.branch,
      worktreePath: task.worktreePath ?? '',
      processRef,
      mode: task.containerId ? 'container' : 'local',
      spawnedAt: task.spawnedAt ?? task.createdAt,
    };
  }
}
