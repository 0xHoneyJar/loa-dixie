/**
 * Fleet Saga — Compensating Transaction for Agent Spawn Lifecycle
 *
 * Implements the Saga pattern for the multi-step agent spawn process.
 * Each step has a compensating action that is executed in reverse order
 * if any step fails, ensuring the system returns to a consistent state.
 *
 * Steps:
 * 1. admitAndInsert — governor admission + DB insert (compensate: delete task)
 * 2. transition proposed -> spawning (compensate: transition to failed)
 * 3. spawn agent (compensate: kill agent + cleanup worktree)
 * 4. transition spawning -> running (compensate: transition to failed)
 *
 * Idempotency: uses SHA-256 of (description + operatorId + date) as dedup token.
 *
 * See: SDD §4.4 (saga orchestration), §4.5 (compensation)
 * @since cycle-012 — Sprint 90, Task T-5.11
 */
import { createHash } from 'node:crypto';

import type { TaskRegistry } from './task-registry.js';
import type { AgentSpawner, AgentHandle } from './agent-spawner.js';
import type { FleetGovernor } from './fleet-governor.js';
import type { ContextEnrichmentEngine } from './context-enrichment-engine.js';
import type { CrossGovernorEventBus } from './cross-governor-event-bus.js';
import type { CreateFleetTaskInput, FleetTaskRecord } from '../types/fleet.js';
import type { ConvictionTier } from '../types/conviction.js';

// ---------------------------------------------------------------------------
// Saga Step Interface
// ---------------------------------------------------------------------------

/** A single step in a saga with execute and compensate actions. */
export interface SagaStep<T> {
  /** Human-readable name for logging and error reporting. */
  readonly name: string;
  /** Execute the step's forward action. */
  execute(): Promise<T>;
  /** Compensate (undo) the step on failure. */
  compensate(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Saga Result
// ---------------------------------------------------------------------------

/** Result of a saga execution. */
export interface SagaResult {
  /** Whether all steps completed successfully. */
  readonly success: boolean;
  /** The task ID (set on success or partial completion). */
  readonly taskId?: string;
  /** The step name where failure occurred (if any). */
  readonly failedStep?: string;
  /** Error message from the failed step. */
  readonly error?: string;
  /** Errors from compensation steps (if any failed during rollback). */
  readonly compensationErrors?: string[];
}

// ---------------------------------------------------------------------------
// FleetSaga
// ---------------------------------------------------------------------------

/**
 * Fleet Saga — orchestrates the multi-step spawn lifecycle with compensation.
 *
 * @since cycle-012 — Sprint 90
 */
export class FleetSaga {
  constructor(
    private readonly registry: TaskRegistry,
    private readonly spawner: AgentSpawner,
    private readonly governor: FleetGovernor,
    private readonly enrichmentEngine: ContextEnrichmentEngine,
    private readonly eventBus: CrossGovernorEventBus,
  ) {}

  /**
   * Execute the full spawn saga with compensation on failure.
   *
   * Steps (each compensatable):
   * 1. admitAndInsert (compensate: delete task)
   * 2. transition proposed -> spawning (compensate: transition to failed)
   * 3. spawn agent (compensate: kill agent + cleanup worktree)
   * 4. transition spawning -> running (compensate: transition to failed)
   *
   * On failure at any step: compensation runs in REVERSE order for
   * all previously completed steps.
   *
   * Idempotency: if a task with the matching dedup token already exists,
   * return it without re-executing the saga.
   */
  async executeSpawn(
    input: CreateFleetTaskInput,
    tier: ConvictionTier,
    prompt: string,
    idempotencyToken: string,
  ): Promise<SagaResult> {
    // Idempotency check: indexed query by contextHash (BF-007)
    const existing = await this.registry.query({
      contextHash: idempotencyToken,
      operatorId: input.operatorId,
      limit: 1,
    });

    if (existing.length > 0) {
      return {
        success: true,
        taskId: existing[0].id,
      };
    }

    // Inject idempotency token as contextHash for dedup
    const inputWithToken: CreateFleetTaskInput = {
      ...input,
      contextHash: idempotencyToken,
    };

    // Track completed steps for compensation
    const completedSteps: SagaStep<unknown>[] = [];

    // Mutable state shared across steps
    let taskRecord: FleetTaskRecord | undefined;
    let agentHandle: AgentHandle | undefined;

    // Step 1: Admit and insert
    const step1: SagaStep<FleetTaskRecord> = {
      name: 'admitAndInsert',
      execute: async () => {
        const record = await this.governor.admitAndInsert(inputWithToken, tier);
        taskRecord = record;
        return record;
      },
      compensate: async () => {
        if (taskRecord) {
          // Transition to a terminal state before delete
          try {
            await this.registry.transition(
              taskRecord.id,
              taskRecord.version,
              'failed' as never,
            );
          } catch {
            // Best effort — may already be in a different state
          }
          try {
            // Reload to get current version for delete
            const current = await this.registry.get(taskRecord.id);
            if (current) {
              // Only terminal tasks can be deleted; try to reach terminal state
              if (!['merged', 'abandoned', 'cancelled'].includes(current.status)) {
                // Force to abandoned if possible
                try {
                  const failed = await this.registry.transition(current.id, current.version, 'failed');
                  await this.registry.transition(failed.id, failed.version, 'abandoned');
                } catch {
                  // Swallow — best effort
                }
              }
              const refreshed = await this.registry.get(taskRecord.id);
              if (refreshed && ['merged', 'abandoned', 'cancelled'].includes(refreshed.status)) {
                await this.registry.delete(taskRecord.id);
              }
            }
          } catch {
            // Best effort cleanup
          }
        }
      },
    };

    // Step 2: Transition proposed -> spawning
    const step2: SagaStep<FleetTaskRecord> = {
      name: 'transitionToSpawning',
      execute: async () => {
        const record = await this.registry.transition(
          taskRecord!.id,
          taskRecord!.version,
          'spawning',
        );
        taskRecord = record;
        return record;
      },
      compensate: async () => {
        if (taskRecord) {
          try {
            await this.registry.transition(
              taskRecord.id,
              taskRecord.version,
              'failed',
            );
          } catch {
            // Best effort
          }
        }
      },
    };

    // Step 3: Spawn agent
    const step3: SagaStep<AgentHandle> = {
      name: 'spawnAgent',
      execute: async () => {
        const handle = await this.spawner.spawn(
          taskRecord!.id,
          taskRecord!.branch,
          taskRecord!.agentType,
          prompt,
        );
        agentHandle = handle;
        return handle;
      },
      compensate: async () => {
        if (agentHandle) {
          try {
            await this.spawner.kill(agentHandle);
          } catch {
            // Best effort
          }
          try {
            await this.spawner.cleanup(agentHandle);
          } catch {
            // Best effort
          }
        }
      },
    };

    // Step 4: Transition spawning -> running
    const step4: SagaStep<FleetTaskRecord> = {
      name: 'transitionToRunning',
      execute: async () => {
        const record = await this.registry.transition(
          taskRecord!.id,
          taskRecord!.version,
          'running',
          {
            worktreePath: agentHandle!.worktreePath,
            spawnedAt: agentHandle!.spawnedAt,
          },
        );
        taskRecord = record;
        return record;
      },
      compensate: async () => {
        if (taskRecord) {
          try {
            await this.registry.transition(
              taskRecord.id,
              taskRecord.version,
              'failed',
            );
          } catch {
            // Best effort
          }
        }
      },
    };

    // Execute steps sequentially with compensation on failure
    const steps: SagaStep<unknown>[] = [step1, step2, step3, step4];

    for (const step of steps) {
      try {
        await step.execute();
        completedSteps.push(step);
      } catch (err) {
        // Compensate in reverse order
        const compensationErrors: string[] = [];
        for (let i = completedSteps.length - 1; i >= 0; i--) {
          try {
            await completedSteps[i].compensate();
          } catch (compErr) {
            compensationErrors.push(
              `${completedSteps[i].name}: ${compErr instanceof Error ? compErr.message : String(compErr)}`,
            );
          }
        }

        return {
          success: false,
          taskId: taskRecord?.id,
          failedStep: step.name,
          error: err instanceof Error ? err.message : String(err),
          compensationErrors: compensationErrors.length > 0 ? compensationErrors : undefined,
        };
      }
    }

    // All steps succeeded — emit event
    await this.eventBus.emit({
      type: 'AGENT_SPAWNED',
      taskId: taskRecord!.id,
      operatorId: input.operatorId,
      timestamp: new Date().toISOString(),
      metadata: {
        agentType: input.agentType,
        branch: input.branch,
        tier,
      },
    });

    return {
      success: true,
      taskId: taskRecord!.id,
    };
  }

  /**
   * Generate a deterministic idempotency token.
   *
   * SHA-256 of description + operatorId + current date (day precision).
   * Ensures the same spawn request on the same day produces the same token.
   */
  static generateIdempotencyToken(description: string, operatorId: string): string {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const input = `${description}|${operatorId}|${today}`;
    return createHash('sha256').update(input).digest('hex');
  }
}
