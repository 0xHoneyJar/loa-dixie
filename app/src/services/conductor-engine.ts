/**
 * ConductorEngine — Fleet Orchestration Coordinator
 *
 * The main orchestrator that wires together all fleet services:
 * TaskRegistry, FleetGovernor, AgentSpawner, FleetMonitor,
 * AgentModelRouter, ContextEnrichmentEngine, CrossGovernorEventBus,
 * NotificationService, and FleetSaga.
 *
 * Each method delegates to the appropriate specialized service.
 * The conductor never contains domain logic itself — it sequences
 * calls and maps between service boundaries.
 *
 * See: SDD §6.1 (Conductor Engine), §6.2 (spawn flow)
 * @since cycle-012 — Sprint 91, Task T-6.1
 */
import * as crypto from 'node:crypto';

import type { TaskRegistry } from './task-registry.js';
import { TERMINAL_STATUSES, TaskNotFoundError, ActiveTaskDeletionError } from './task-registry.js';
import type { FleetGovernor } from './fleet-governor.js';
import { SpawnDeniedError } from './fleet-governor.js';
import type { AgentSpawner, AgentHandle } from './agent-spawner.js';
import type { FleetMonitor } from './fleet-monitor.js';
import type { AgentModelRouter } from './agent-model-router.js';
import type { ContextEnrichmentEngine } from './context-enrichment-engine.js';
import { createSection } from './context-enrichment-engine.js';
import type { CrossGovernorEventBus } from './cross-governor-event-bus.js';
import type { NotificationService } from './notification-service.js';
import type { ConvictionTier } from '../types/conviction.js';
import type {
  SpawnRequest,
  SpawnResult,
  FleetStatusSummary,
  FleetTaskSummary,
  FleetTaskRecord,
  FleetTaskStatus,
} from '../types/fleet.js';

// ---------------------------------------------------------------------------
// FleetSaga Interface (minimal — saga service may not exist yet)
// ---------------------------------------------------------------------------

/**
 * FleetSaga provides compensating transactions for the spawn flow.
 * If any step fails after the task is inserted, the saga rolls back
 * prior steps (e.g., cancel the DB record, remove worktree).
 */
export interface FleetSaga {
  /**
   * Execute the spawn saga:
   * 1. admitAndInsert via governor (creates DB record)
   * 2. Spawn agent via spawner
   * 3. Transition task through status lifecycle
   *
   * On failure at any step, compensating actions undo prior steps.
   */
  execute(params: {
    request: SpawnRequest;
    operatorTier: ConvictionTier;
    model: string;
    agentType: SpawnResult['agentType'];
    prompt: string;
    contextHash: string;
    idempotencyToken: string;
  }): Promise<{
    taskRecord: FleetTaskRecord;
    handle: AgentHandle;
  }>;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface ConductorEngineConfig {
  readonly defaultTimeoutMinutes?: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export { SpawnDeniedError, TaskNotFoundError, ActiveTaskDeletionError };

// ---------------------------------------------------------------------------
// ConductorEngine
// ---------------------------------------------------------------------------

export class ConductorEngine {
  private readonly defaultTimeoutMinutes: number;

  constructor(
    private readonly registry: TaskRegistry,
    private readonly governor: FleetGovernor,
    private readonly spawner: AgentSpawner,
    private readonly monitor: FleetMonitor,
    private readonly router: AgentModelRouter,
    private readonly enrichment: ContextEnrichmentEngine,
    private readonly eventBus: CrossGovernorEventBus,
    private readonly notifications: NotificationService,
    private readonly saga: FleetSaga,
    config?: ConductorEngineConfig,
  ) {
    this.defaultTimeoutMinutes = config?.defaultTimeoutMinutes ?? 120;
  }

  // -------------------------------------------------------------------------
  // spawn — T-6.1
  // -------------------------------------------------------------------------

  /**
   * Spawn a new fleet agent.
   *
   * Flow:
   * 1. Fast pre-check via governor.canSpawn (cache-only, no DB)
   * 2. Select model via router (explicit override or task-type default)
   * 3. Build enriched prompt via context enrichment engine
   * 4. Generate idempotency token
   * 5. Execute saga (admitAndInsert -> spawn -> transitions)
   * 6. Emit AGENT_SPAWNED event
   * 7. Return SpawnResult
   *
   * @throws SpawnDeniedError if admission is denied (pre-check or DB)
   */
  async spawn(request: SpawnRequest, operatorTier: ConvictionTier): Promise<SpawnResult> {
    // Step 1: Fast pre-check (cache-only)
    const canSpawn = this.governor.canSpawn(request.operatorId, operatorTier);
    if (!canSpawn) {
      throw new SpawnDeniedError(
        {
          operatorId: request.operatorId,
          tier: operatorTier,
          activeCount: 0,
          tierLimit: this.governor.getTierLimit(operatorTier),
        },
        `Pre-check denied: operator ${request.operatorId} at tier '${operatorTier}' cannot spawn`,
      );
    }

    // Step 2: Select model
    const routing = this.router.selectModel(request.taskType, {
      explicitModel: request.model,
    });

    // Step 3: Build enriched prompt
    const sections = [
      createSection('CRITICAL', 'Task Definition', request.description),
      createSection('CRITICAL', 'Task Type', request.taskType),
      createSection('RELEVANT', 'Repository', request.repository),
    ];

    if (request.baseBranch) {
      sections.push(createSection('RELEVANT', 'Base Branch', request.baseBranch));
    }

    if (request.contextOverrides) {
      for (const [key, value] of Object.entries(request.contextOverrides)) {
        sections.push(createSection('BACKGROUND', key, value));
      }
    }

    const enriched = this.enrichment.buildPrompt(sections);

    // Step 4: Generate idempotency token
    const idempotencyToken = crypto.randomUUID();

    // Step 5: Execute saga
    const { taskRecord, handle } = await this.saga.execute({
      request,
      operatorTier,
      model: routing.model,
      agentType: routing.agentType,
      prompt: enriched.prompt,
      contextHash: enriched.contextHash,
      idempotencyToken,
    });

    // Step 6: Emit event
    await this.eventBus.emit({
      type: 'AGENT_SPAWNED',
      taskId: taskRecord.id,
      operatorId: request.operatorId,
      timestamp: new Date().toISOString(),
      metadata: {
        model: routing.model,
        agentType: routing.agentType,
        routingReason: routing.reason,
        branch: taskRecord.branch,
      },
    });

    // Step 7: Return result
    return {
      taskId: taskRecord.id,
      branch: taskRecord.branch,
      worktreePath: handle.worktreePath,
      agentType: routing.agentType,
      model: routing.model,
      status: taskRecord.status,
    };
  }

  // -------------------------------------------------------------------------
  // getStatus — T-6.3
  // -------------------------------------------------------------------------

  /**
   * Get fleet status summary.
   *
   * When operatorId is provided, scopes to that operator's tasks.
   * When omitted, returns all tasks (admin view).
   */
  async getStatus(operatorId?: string): Promise<FleetStatusSummary> {
    const tasks = await this.registry.query(
      operatorId ? { operatorId } : {},
    );

    const activeStatuses = new Set<FleetTaskStatus>([
      'proposed', 'spawning', 'running', 'pr_created', 'reviewing', 'ready', 'retrying',
    ]);
    const completedStatuses = new Set<FleetTaskStatus>(['merged']);
    const failedStatuses = new Set<FleetTaskStatus>([
      'failed', 'abandoned', 'rejected', 'cancelled',
    ]);

    let activeTasks = 0;
    let completedTasks = 0;
    let failedTasks = 0;

    const taskSummaries: FleetTaskSummary[] = tasks.map((task) => {
      if (activeStatuses.has(task.status)) activeTasks++;
      else if (completedStatuses.has(task.status)) completedTasks++;
      else if (failedStatuses.has(task.status)) failedTasks++;

      const durationMinutes = task.spawnedAt
        ? Math.round(
            (Date.now() - new Date(task.spawnedAt).getTime()) / 60_000,
          )
        : null;

      return {
        id: task.id,
        status: task.status,
        description: task.description,
        agentType: task.agentType,
        model: task.model,
        branch: task.branch,
        prNumber: task.prNumber,
        ciStatus: task.ciStatus,
        retryCount: task.retryCount,
        spawnedAt: task.spawnedAt,
        durationMinutes,
      };
    });

    return {
      activeTasks,
      completedTasks,
      failedTasks,
      tasks: taskSummaries,
    };
  }

  // -------------------------------------------------------------------------
  // getTask — T-6.4
  // -------------------------------------------------------------------------

  /**
   * Get a single task by ID.
   * Returns null if the task does not exist.
   */
  async getTask(taskId: string): Promise<FleetTaskRecord | null> {
    return this.registry.get(taskId);
  }

  // -------------------------------------------------------------------------
  // stopTask — T-6.4
  // -------------------------------------------------------------------------

  /**
   * Stop a running task.
   *
   * 1. Fetch task from registry
   * 2. Build agent handle
   * 3. Kill agent process via spawner
   * 4. Transition task to 'cancelled'
   * 5. Emit AGENT_CANCELLED event
   * 6. Send notification
   */
  async stopTask(taskId: string): Promise<void> {
    const task = await this.registry.get(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    // Build handle for the spawner
    const handle = this.buildHandle(task);
    if (handle) {
      try {
        await this.spawner.kill(handle);
      } catch {
        // Kill failure is non-fatal — the process may already be dead
      }
    }

    // Transition to cancelled (only valid from running, pr_created)
    await this.registry.transition(task.id, task.version, 'cancelled', {
      completedAt: new Date().toISOString(),
    });

    // Emit event
    await this.eventBus.emit({
      type: 'AGENT_CANCELLED',
      taskId: task.id,
      operatorId: task.operatorId,
      timestamp: new Date().toISOString(),
    });

    // Send notification (best-effort)
    try {
      await this.notifications.send(
        {
          operatorId: task.operatorId,
          notifyOnSpawn: false,
          notifyOnComplete: false,
          notifyOnFailure: true,
        },
        {
          taskId: task.id,
          operatorId: task.operatorId,
          type: 'status_change',
          status: 'cancelled',
          description: task.description,
          agentType: task.agentType,
          model: task.model,
          taskType: task.taskType,
          branch: task.branch,
        },
      );
    } catch {
      // Notification failure is non-fatal
    }
  }

  // -------------------------------------------------------------------------
  // getTaskLogs — T-6.5
  // -------------------------------------------------------------------------

  /**
   * Get logs from a running agent process.
   * Delegates to spawner.getLogs().
   */
  async getTaskLogs(taskId: string, lines?: number): Promise<string> {
    const task = await this.registry.get(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    const handle = this.buildHandle(task);
    if (!handle) {
      return '';
    }

    return this.spawner.getLogs(handle, lines);
  }

  // -------------------------------------------------------------------------
  // deleteTask — T-6.5
  // -------------------------------------------------------------------------

  /**
   * Delete a task from the registry.
   *
   * Only allowed for tasks in terminal states (merged, abandoned, cancelled,
   * failed, rejected). Active tasks must be stopped first.
   *
   * Also cleans up the worktree if it still exists.
   */
  async deleteTask(taskId: string): Promise<void> {
    const task = await this.registry.get(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    if (!TERMINAL_STATUSES.has(task.status)) {
      throw new ActiveTaskDeletionError(taskId, task.status);
    }

    // Cleanup worktree if present
    const handle = this.buildHandle(task);
    if (handle) {
      try {
        await this.spawner.cleanup(handle);
      } catch {
        // Cleanup failure is non-fatal — worktree may already be removed
      }
    }

    await this.registry.delete(taskId);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Start the conductor engine.
   *
   * 1. Run reconciliation to recover from any crash state
   * 2. Start the fleet monitor loop
   */
  async start(): Promise<void> {
    await this.monitor.reconcile();
    await this.monitor.start();
  }

  /**
   * Shut down the conductor engine.
   *
   * Stops the monitor loop. Does not kill running agents —
   * they will be reconciled on next startup.
   */
  async shutdown(): Promise<void> {
    this.monitor.stop();
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /**
   * Build an AgentHandle from a task record for spawner operations.
   * Returns null if the task lacks the required process reference.
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
