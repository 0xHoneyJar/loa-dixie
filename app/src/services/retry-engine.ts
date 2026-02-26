/**
 * Retry Engine — Exponential Backoff Retry with OOM-Aware Context Reduction
 *
 * Manages the retry lifecycle for failed fleet tasks. Checks retry budget,
 * records failure context, builds enriched retry prompts, and respawns
 * agents with exponential backoff + jitter.
 *
 * OOM detection (exit code 137 or "out of memory" in error output) triggers
 * a 25% reduction in maxPromptTokens to fit within container memory limits.
 *
 * Invariant: Cancelled tasks are NEVER retried (INV-015 / Flatline SKP-005).
 *
 * See: SDD §4.2 (retry engine), §4.3 (OOM handling)
 * @since cycle-012 — Sprint 90, Tasks T-5.1, T-5.2
 */
import type { TaskRegistry } from './task-registry.js';
import type { AgentSpawner } from './agent-spawner.js';
import type { ContextEnrichmentEngine } from './context-enrichment-engine.js';
import type { CrossGovernorEventBus } from './cross-governor-event-bus.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Configuration for the RetryEngine. */
export interface RetryEngineConfig {
  /** Maximum number of retry attempts per task. */
  readonly maxRetries: number;
  /** Base delay between retries in milliseconds. */
  readonly retryDelayMs: number;
  /** Whether to reduce prompt token budget on OOM failures. */
  readonly reduceContextOnOom: boolean;
  /** Maximum prompt tokens for enriched retry prompts. */
  readonly maxPromptTokens: number;
  /** Injectable sleep function for testability (BF-003). Defaults to real setTimeout. */
  readonly sleep?: (ms: number) => Promise<void>;
}

/** Result of an attemptRetry() call. */
export interface RetryResult {
  /** Whether the retry was attempted. */
  readonly retried: boolean;
  /** Human-readable reason for the result. */
  readonly reason: string;
  /** The new task version after state transitions (if retried). */
  readonly newTaskVersion?: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: RetryEngineConfig = {
  maxRetries: 3,
  retryDelayMs: 30_000,
  reduceContextOnOom: true,
  maxPromptTokens: 8000,
};

/** Maximum backoff cap in milliseconds (2 minutes). */
const MAX_BACKOFF_MS = 120_000;

/** Maximum jitter added to backoff in milliseconds. */
const MAX_JITTER_MS = 1000;

// ---------------------------------------------------------------------------
// OOM Detection
// ---------------------------------------------------------------------------

/**
 * Detect OOM from failure context.
 * Exit code 137 (SIGKILL) or error message containing "out of memory".
 */
function isOomFailure(failureContext: Record<string, unknown> | null): boolean {
  if (!failureContext) return false;
  if (failureContext.exitCode === 137) return true;
  const error = String(failureContext.error ?? '').toLowerCase();
  return error.includes('out of memory');
}

// ---------------------------------------------------------------------------
// Backoff Calculation
// ---------------------------------------------------------------------------

/**
 * Compute retry delay with exponential backoff + jitter.
 *
 * Formula: min(baseDelay * 2^attempt + random(0, MAX_JITTER_MS), MAX_BACKOFF_MS)
 */
export function computeBackoffDelay(baseDelayMs: number, attempt: number): number {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
  return Math.min(exponential + jitter, MAX_BACKOFF_MS);
}

// ---------------------------------------------------------------------------
// RetryEngine
// ---------------------------------------------------------------------------

/**
 * Retry Engine — manages retry lifecycle for failed fleet tasks.
 *
 * @since cycle-012 — Sprint 90
 */
/** Default sleep using real setTimeout. */
const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class RetryEngine {
  private readonly config: RetryEngineConfig;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly registry: TaskRegistry,
    private readonly spawner: AgentSpawner,
    private readonly enrichmentEngine: ContextEnrichmentEngine,
    private readonly eventBus: CrossGovernorEventBus,
    config?: Partial<RetryEngineConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sleep = config?.sleep ?? defaultSleep;
  }

  /**
   * Attempt to retry a failed task.
   *
   * Steps:
   * 1. Load task from registry
   * 2. Check retry budget (retryCount < maxRetries)
   * 3. If exhausted: transition to 'abandoned', emit AGENT_FAILED, return {retried: false}
   * 4. Record failure in registry
   * 5. Build enriched retry prompt with failure analysis
   * 6. Transition: failed -> retrying
   * 7. Wait retryDelayMs with exponential backoff + jitter
   * 8. Transition: retrying -> spawning
   * 9. Spawn new agent
   * 10. Emit AGENT_RETRYING event
   * 11. Return {retried: true}
   *
   * On OOM: reduce maxPromptTokens by 25% for the retry prompt.
   */
  async attemptRetry(taskId: string): Promise<RetryResult> {
    // Step 1: Load task
    const task = await this.registry.get(taskId);
    if (!task) {
      return { retried: false, reason: `Task not found: ${taskId}` };
    }

    // Cancelled tasks cannot be retried (INV-015 / Flatline SKP-005)
    if (task.status === 'cancelled') {
      return { retried: false, reason: 'Cancelled tasks cannot be retried (INV-015)' };
    }

    // Must be in 'failed' status to retry
    if (task.status !== 'failed') {
      return { retried: false, reason: `Task is not in failed status: ${task.status}` };
    }

    // Step 2: Check retry budget
    if (task.retryCount >= task.maxRetries) {
      // Step 3: Budget exhausted — transition to abandoned
      const abandoned = await this.registry.transition(
        taskId,
        task.version,
        'abandoned',
      );

      await this.eventBus.emit({
        type: 'AGENT_FAILED',
        taskId,
        operatorId: task.operatorId,
        timestamp: new Date().toISOString(),
        metadata: { reason: 'retry_budget_exhausted', retryCount: task.retryCount },
      });

      return {
        retried: false,
        reason: `Retry budget exhausted (${task.retryCount}/${task.maxRetries})`,
        newTaskVersion: abandoned.version,
      };
    }

    // Step 4: Record failure
    const failureContext = task.failureContext ?? { error: 'unknown' };
    await this.registry.recordFailure(taskId, failureContext);

    // Step 5: Build enriched retry prompt
    // Detect OOM and reduce token budget if configured
    let promptTokenBudget = this.config.maxPromptTokens;
    if (this.config.reduceContextOnOom && isOomFailure(task.failureContext)) {
      promptTokenBudget = Math.floor(promptTokenBudget * 0.75);
    }

    const failureSections = this.enrichmentEngine.captureFailureContext(
      '',  // diff — not available at this layer
      String(failureContext.error ?? 'Unknown error'),
    );

    const enrichedPrompt = this.enrichmentEngine.buildPrompt(failureSections, {
      maxPromptTokens: promptTokenBudget,
    });

    // Step 6: Transition failed -> retrying
    const retrying = await this.registry.transition(
      taskId,
      task.version,
      'retrying',
    );

    // Step 7: Wait with exponential backoff + jitter (uses injectable sleep — BF-003)
    const delay = computeBackoffDelay(this.config.retryDelayMs, task.retryCount);
    await this.sleep(delay);

    // Step 8: Transition retrying -> spawning
    const spawning = await this.registry.transition(
      taskId,
      retrying.version,
      'spawning',
    );

    // Step 9: Spawn new agent
    await this.spawner.spawn(
      taskId,
      task.branch,
      task.agentType,
      enrichedPrompt.prompt,
    );

    // Step 10: Emit AGENT_RETRYING event
    await this.eventBus.emit({
      type: 'AGENT_RETRYING',
      taskId,
      operatorId: task.operatorId,
      timestamp: new Date().toISOString(),
      metadata: {
        retryCount: task.retryCount + 1,
        promptTokenBudget,
        oomDetected: isOomFailure(task.failureContext),
      },
    });

    // Step 11: Return success
    return {
      retried: true,
      reason: `Retry ${task.retryCount + 1}/${task.maxRetries} initiated`,
      newTaskVersion: spawning.version,
    };
  }

  /**
   * Check if a task can be retried.
   *
   * A task can be retried if:
   * - It exists
   * - It is in 'failed' status (NOT cancelled — INV-015)
   * - Its retryCount is below maxRetries
   */
  async canRetry(taskId: string): Promise<boolean> {
    const task = await this.registry.get(taskId);
    if (!task) return false;
    if (task.status !== 'failed') return false;
    return task.retryCount < task.maxRetries;
  }
}
