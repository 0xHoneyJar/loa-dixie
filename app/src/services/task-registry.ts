/**
 * Fleet Task Registry — CRUD + State Machine + Failure Recording
 *
 * PG-backed registry for fleet tasks with optimistic concurrency control,
 * typed state machine transitions, and atomic failure recording.
 *
 * See: SDD §1.2 (lifecycle), §2.1-§2.3 (type contracts), §3.1 (schema)
 * @since cycle-012 — Sprint 86, Tasks T-1.3, T-1.4, T-1.5, T-1.6
 */
import type { DbPool } from '../db/client.js';
import type {
  FleetTaskStatus,
  FleetTaskRecord,
  CreateFleetTaskInput,
  TransitionMetadata,
  TaskQueryFilters,
} from '../types/fleet.js';

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

export class InvalidTransitionError extends Error {
  readonly from: FleetTaskStatus;
  readonly to: FleetTaskStatus;

  constructor(from: FleetTaskStatus, to: FleetTaskStatus) {
    super(`Invalid transition: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
  }
}

export class StaleVersionError extends Error {
  readonly taskId: string;
  readonly expectedVersion: number;

  constructor(taskId: string, expectedVersion: number) {
    super(`Stale version for task ${taskId}: expected version ${expectedVersion}`);
    this.name = 'StaleVersionError';
    this.taskId = taskId;
    this.expectedVersion = expectedVersion;
  }
}

export class TaskNotFoundError extends Error {
  readonly taskId: string;

  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
    this.taskId = taskId;
  }
}

export class ActiveTaskDeletionError extends Error {
  readonly taskId: string;
  readonly status: FleetTaskStatus;

  constructor(taskId: string, status: FleetTaskStatus) {
    super(`Cannot delete active task ${taskId} (status: ${status})`);
    this.name = 'ActiveTaskDeletionError';
    this.taskId = taskId;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// T-1.6: State Machine Constants
// ---------------------------------------------------------------------------

/** Valid transition map for the fleet task lifecycle (SDD §1.2). */
export const VALID_TRANSITIONS: Record<FleetTaskStatus, readonly FleetTaskStatus[]> = {
  proposed:   ['spawning'],
  spawning:   ['running', 'failed'],
  running:    ['pr_created', 'failed', 'cancelled'],
  pr_created: ['reviewing', 'cancelled'],
  reviewing:  ['ready', 'rejected'],
  ready:      ['merged'],
  failed:     ['retrying', 'abandoned'],
  rejected:   ['retrying'],
  retrying:   ['spawning', 'abandoned'],
  merged:     [],
  abandoned:  [],
  cancelled:  [],
} as const;

/** Terminal statuses — no outgoing transitions. */
export const TERMINAL_STATUSES: Set<FleetTaskStatus> = new Set(
  (Object.entries(VALID_TRANSITIONS) as [FleetTaskStatus, readonly FleetTaskStatus[]][])
    .filter(([, targets]) => targets.length === 0)
    .map(([status]) => status),
);

// ---------------------------------------------------------------------------
// Row Mapping
// ---------------------------------------------------------------------------

interface FleetTaskRow {
  id: string;
  operator_id: string;
  agent_type: string;
  model: string;
  task_type: string;
  description: string;
  branch: string;
  worktree_path: string | null;
  container_id: string | null;
  tmux_session: string | null;
  status: string;
  version: number;
  pr_number: number | null;
  ci_status: string | null;
  review_status: Record<string, unknown> | null;
  retry_count: number;
  max_retries: number;
  context_hash: string | null;
  failure_context: Record<string, unknown> | null;
  spawned_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: FleetTaskRow): FleetTaskRecord {
  return {
    id: row.id,
    operatorId: row.operator_id,
    agentType: row.agent_type as FleetTaskRecord['agentType'],
    model: row.model,
    taskType: row.task_type as FleetTaskRecord['taskType'],
    description: row.description,
    branch: row.branch,
    worktreePath: row.worktree_path,
    containerId: row.container_id,
    tmuxSession: row.tmux_session,
    status: row.status as FleetTaskStatus,
    version: row.version,
    prNumber: row.pr_number,
    ciStatus: row.ci_status,
    reviewStatus: row.review_status,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    contextHash: row.context_hash,
    failureContext: row.failure_context,
    spawnedAt: row.spawned_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// TaskRegistry
// ---------------------------------------------------------------------------

export class TaskRegistry {
  constructor(private readonly pool: DbPool) {}

  // -------------------------------------------------------------------------
  // T-1.3: CRUD Operations
  // -------------------------------------------------------------------------

  /** Create a new task in `proposed` status. Returns the full record. */
  async create(input: CreateFleetTaskInput): Promise<FleetTaskRecord> {
    const result = await this.pool.query<FleetTaskRow>(
      `INSERT INTO fleet_tasks (
        operator_id, agent_type, model, task_type,
        description, branch, max_retries, context_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        input.operatorId,
        input.agentType,
        input.model,
        input.taskType,
        input.description,
        input.branch,
        input.maxRetries ?? 3,
        input.contextHash ?? null,
      ],
    );
    return rowToRecord(result.rows[0]);
  }

  /** Get a task by ID. Returns null if not found. */
  async get(id: string): Promise<FleetTaskRecord | null> {
    const result = await this.pool.query<FleetTaskRow>(
      'SELECT * FROM fleet_tasks WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) return null;
    return rowToRecord(result.rows[0]);
  }

  /** Query tasks with filters. */
  async query(filters: TaskQueryFilters = {}): Promise<FleetTaskRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters.operatorId) {
      conditions.push(`operator_id = $${paramIdx++}`);
      params.push(filters.operatorId);
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(`status = ANY($${paramIdx++})`);
        params.push(filters.status);
      } else {
        conditions.push(`status = $${paramIdx++}`);
        params.push(filters.status);
      }
    }

    if (filters.agentType) {
      conditions.push(`agent_type = $${paramIdx++}`);
      params.push(filters.agentType);
    }

    if (filters.taskType) {
      conditions.push(`task_type = $${paramIdx++}`);
      params.push(filters.taskType);
    }

    if (filters.contextHash) {
      conditions.push(`context_hash = $${paramIdx++}`);
      params.push(filters.contextHash);
    }

    if (filters.since) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(filters.since);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 50;

    const result = await this.pool.query<FleetTaskRow>(
      `SELECT * FROM fleet_tasks ${where} ORDER BY created_at DESC LIMIT $${paramIdx}`,
      [...params, limit],
    );
    return result.rows.map(rowToRecord);
  }

  /** Count non-terminal tasks for a specific operator. */
  async countActive(operatorId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM fleet_tasks
       WHERE operator_id = $1 AND status NOT IN ($2, $3, $4, $5, $6)`,
      [operatorId, 'merged', 'abandoned', 'cancelled', 'failed', 'rejected'],
    );
    return parseInt(result.rows[0].count, 10);
  }

  /** Count all non-terminal tasks across all operators. */
  async countAllActive(): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM fleet_tasks
       WHERE status NOT IN ($1, $2, $3, $4, $5)`,
      ['merged', 'abandoned', 'cancelled', 'failed', 'rejected'],
    );
    return parseInt(result.rows[0].count, 10);
  }

  /** Delete a task. Only allowed for terminal statuses. */
  async delete(id: string): Promise<void> {
    const task = await this.get(id);
    if (!task) throw new TaskNotFoundError(id);
    if (!TERMINAL_STATUSES.has(task.status)) {
      throw new ActiveTaskDeletionError(id, task.status);
    }
    await this.pool.query('DELETE FROM fleet_tasks WHERE id = $1', [id]);
  }

  /** List non-terminal tasks for reconciliation. */
  async listLive(): Promise<FleetTaskRecord[]> {
    const result = await this.pool.query<FleetTaskRow>(
      `SELECT * FROM fleet_tasks
       WHERE status NOT IN ($1, $2, $3, $4, $5)
       ORDER BY created_at ASC`,
      ['merged', 'abandoned', 'cancelled', 'failed', 'rejected'],
    );
    return result.rows.map(rowToRecord);
  }

  // -------------------------------------------------------------------------
  // T-1.4: State Machine Transitions
  // -------------------------------------------------------------------------

  /**
   * Transition a task to a new status with optimistic concurrency.
   *
   * @throws InvalidTransitionError if the transition is not in VALID_TRANSITIONS
   * @throws StaleVersionError if the version has been modified by another writer
   * @throws TaskNotFoundError if the task doesn't exist
   */
  async transition(
    id: string,
    expectedVersion: number,
    newStatus: FleetTaskStatus,
    metadata?: TransitionMetadata,
  ): Promise<FleetTaskRecord> {
    // Fetch current to validate the transition
    const current = await this.get(id);
    if (!current) throw new TaskNotFoundError(id);

    const validTargets = VALID_TRANSITIONS[current.status];
    if (!validTargets.includes(newStatus)) {
      throw new InvalidTransitionError(current.status, newStatus);
    }

    // Build dynamic SET clause for optional metadata
    const setClauses = ['status = $1', 'version = version + 1'];
    const params: unknown[] = [newStatus];
    let paramIdx = 2;

    if (metadata?.worktreePath !== undefined) {
      setClauses.push(`worktree_path = $${paramIdx++}`);
      params.push(metadata.worktreePath);
    }
    if (metadata?.containerId !== undefined) {
      setClauses.push(`container_id = $${paramIdx++}`);
      params.push(metadata.containerId);
    }
    if (metadata?.tmuxSession !== undefined) {
      setClauses.push(`tmux_session = $${paramIdx++}`);
      params.push(metadata.tmuxSession);
    }
    if (metadata?.prNumber !== undefined) {
      setClauses.push(`pr_number = $${paramIdx++}`);
      params.push(metadata.prNumber);
    }
    if (metadata?.ciStatus !== undefined) {
      setClauses.push(`ci_status = $${paramIdx++}`);
      params.push(metadata.ciStatus);
    }
    if (metadata?.reviewStatus !== undefined) {
      setClauses.push(`review_status = $${paramIdx++}`);
      params.push(JSON.stringify(metadata.reviewStatus));
    }
    if (metadata?.failureContext !== undefined) {
      setClauses.push(`failure_context = $${paramIdx++}`);
      params.push(JSON.stringify(metadata.failureContext));
    }
    if (metadata?.spawnedAt !== undefined) {
      setClauses.push(`spawned_at = $${paramIdx++}`);
      params.push(metadata.spawnedAt);
    }
    if (metadata?.completedAt !== undefined) {
      setClauses.push(`completed_at = $${paramIdx++}`);
      params.push(metadata.completedAt);
    }

    const setClause = setClauses.join(', ');
    const idParam = `$${paramIdx++}`;
    const versionParam = `$${paramIdx}`;
    params.push(id, expectedVersion);

    const result = await this.pool.query<FleetTaskRow>(
      `UPDATE fleet_tasks SET ${setClause}
       WHERE id = ${idParam} AND version = ${versionParam}
       RETURNING *`,
      params,
    );

    if (result.rows.length === 0) {
      throw new StaleVersionError(id, expectedVersion);
    }

    return rowToRecord(result.rows[0]);
  }

  // -------------------------------------------------------------------------
  // T-1.5: Failure Recording
  // -------------------------------------------------------------------------

  /**
   * Atomically increment retry_count and record failure context.
   * Uses a WHERE guard to prevent incrementing past max_retries.
   *
   * @returns Updated record, or null if retry_count was already at max
   */
  async recordFailure(
    id: string,
    failureContext: Record<string, unknown>,
  ): Promise<FleetTaskRecord | null> {
    const result = await this.pool.query<FleetTaskRow>(
      `UPDATE fleet_tasks
       SET retry_count = retry_count + 1,
           failure_context = $1
       WHERE id = $2 AND retry_count < max_retries
       RETURNING *`,
      [JSON.stringify(failureContext), id],
    );

    if (result.rows.length === 0) return null;
    return rowToRecord(result.rows[0]);
  }
}
