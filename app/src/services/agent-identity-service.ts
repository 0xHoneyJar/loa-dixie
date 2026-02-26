/**
 * Agent Identity Service — Persistent identity across fleet tasks.
 *
 * Agents accumulate reputation via EMA-dampened scoring (reusing the INV-006
 * pattern from ReputationService). Identity is resolved by (operatorId, model)
 * tuple — the same operator using the same model gets the same identity across
 * tasks, providing continuity and enabling reputation-driven autonomy.
 *
 * Reputation formula:
 *   new_rep = alpha * task_score + (1 - alpha) * old_rep
 *   alpha   = ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * min(1, task_count / RAMP)
 *
 * @since cycle-013 — Sprint 94, Tasks T-1.6 through T-1.8
 */
import type { DbPool } from '../db/client.js';
import type {
  AgentIdentityRecord,
  TaskOutcome,
} from '../types/agent-identity.js';
import { OUTCOME_SCORES } from '../types/agent-identity.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** EMA alpha ramp parameters (matches INV-006 pattern). */
const ALPHA_MIN = 0.1;
const ALPHA_MAX = 0.3;
const ALPHA_RAMP = 20;

// ---------------------------------------------------------------------------
// Row Mapping
// ---------------------------------------------------------------------------

interface IdentityRow {
  id: string;
  operator_id: string;
  model: string;
  autonomy_level: string;
  aggregate_reputation: number;
  task_count: number;
  success_count: number;
  failure_count: number;
  last_task_id: string | null;
  version: number;
  created_at: string;
  last_active_at: string;
}

function rowToRecord(row: IdentityRow): AgentIdentityRecord {
  return {
    id: row.id,
    operatorId: row.operator_id,
    model: row.model,
    autonomyLevel: row.autonomy_level as AgentIdentityRecord['autonomyLevel'],
    aggregateReputation: row.aggregate_reputation,
    taskCount: row.task_count,
    successCount: row.success_count,
    failureCount: row.failure_count,
    lastTaskId: row.last_task_id,
    version: row.version,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class StaleIdentityVersionError extends Error {
  constructor(identityId: string, expectedVersion: number) {
    super(
      `Stale version for identity ${identityId}: expected ${expectedVersion}`,
    );
    this.name = 'StaleIdentityVersionError';
  }
}

// ---------------------------------------------------------------------------
// AgentIdentityService
// ---------------------------------------------------------------------------

export class AgentIdentityService {
  constructor(private readonly pool: DbPool) {}

  // -------------------------------------------------------------------------
  // CRUD — T-1.6
  // -------------------------------------------------------------------------

  /**
   * Resolve identity for (operatorId, model) tuple.
   *
   * Creates on first call, reuses on subsequent calls. Uses INSERT ... ON
   * CONFLICT to handle race conditions atomically.
   */
  async resolveIdentity(
    operatorId: string,
    model: string,
  ): Promise<AgentIdentityRecord> {
    const result = await this.pool.query<IdentityRow>(
      `INSERT INTO agent_identities (operator_id, model)
       VALUES ($1, $2)
       ON CONFLICT (operator_id, model) DO UPDATE
         SET last_active_at = NOW()
       RETURNING *`,
      [operatorId, model],
    );
    return rowToRecord(result.rows[0]);
  }

  /** Fetch identity by ID. Returns null if not found. */
  async getOrNull(identityId: string): Promise<AgentIdentityRecord | null> {
    const result = await this.pool.query<IdentityRow>(
      'SELECT * FROM agent_identities WHERE id = $1',
      [identityId],
    );
    return result.rows.length > 0 ? rowToRecord(result.rows[0]) : null;
  }

  /** List all identities for an operator. */
  async getByOperator(operatorId: string): Promise<AgentIdentityRecord[]> {
    const result = await this.pool.query<IdentityRow>(
      'SELECT * FROM agent_identities WHERE operator_id = $1 ORDER BY last_active_at DESC LIMIT 100',
      [operatorId],
    );
    return result.rows.map(rowToRecord);
  }

  // -------------------------------------------------------------------------
  // Reputation Accumulation — T-1.7
  // -------------------------------------------------------------------------

  /**
   * Record a task outcome and update reputation via EMA.
   *
   * Score mapping:
   *   merged/ready = 1.0 (full success)
   *   failed       = 0.3 (learned from failure)
   *   abandoned    = 0.0 (no value extracted)
   *
   * Uses optimistic concurrency: UPDATE WHERE version = expected.
   * Throws StaleIdentityVersionError on version mismatch.
   */
  async recordTaskOutcome(
    identityId: string,
    taskId: string,
    outcome: TaskOutcome,
  ): Promise<AgentIdentityRecord> {
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const identity = await this.getOrNull(identityId);
      if (!identity) {
        throw new Error(`Agent identity not found: ${identityId}`);
      }

      const taskScore = OUTCOME_SCORES[outcome];
      const alpha = computeAlpha(identity.taskCount);
      const newReputation =
        alpha * taskScore + (1 - alpha) * identity.aggregateReputation;

      const isSuccess = outcome === 'merged' || outcome === 'ready';
      const successIncrement = isSuccess ? 1 : 0;
      const failureIncrement = isSuccess ? 0 : 1;

      // BF-020: Compute autonomy level from new reputation
      const newTaskCount = identity.taskCount + 1;
      const newAutonomyLevel =
        (newReputation >= 0.8 && newTaskCount >= 10) ? 'autonomous' :
        (newReputation >= 0.6 && newTaskCount >= 3) ? 'standard' :
        'constrained';

      const result = await this.pool.query<IdentityRow>(
        `UPDATE agent_identities
         SET aggregate_reputation = $1,
             task_count = task_count + 1,
             success_count = success_count + $2,
             failure_count = failure_count + $3,
             last_task_id = $4,
             autonomy_level = $5,
             version = version + 1
         WHERE id = $6 AND version = $7
         RETURNING *`,
        [
          newReputation,
          successIncrement,
          failureIncrement,
          taskId,
          newAutonomyLevel,
          identityId,
          identity.version,
        ],
      );

      if (result.rows.length > 0) {
        return rowToRecord(result.rows[0]);
      }
      // Version mismatch — retry (BF-017)
    }

    throw new StaleIdentityVersionError(identityId, -1);
  }

  // -------------------------------------------------------------------------
  // History — T-1.8
  // -------------------------------------------------------------------------

  /**
   * Get recent task history for an identity.
   *
   * Returns tasks linked to this identity in reverse chronological order.
   */
  async getHistory(
    identityId: string,
    limit: number = 50,
  ): Promise<
    Array<{
      taskId: string;
      status: string;
      description: string;
      completedAt: string | null;
    }>
  > {
    const result = await this.pool.query<{
      id: string;
      status: string;
      description: string;
      completed_at: string | null;
    }>(
      `SELECT id, status, description, completed_at
       FROM fleet_tasks
       WHERE agent_identity_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [identityId, limit],
    );

    return result.rows.map((row) => ({
      taskId: row.id,
      status: row.status,
      description: row.description,
      completedAt: row.completed_at,
    }));
  }
}

// ---------------------------------------------------------------------------
// Pure Functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Compute EMA alpha based on task count (ramp from ALPHA_MIN to ALPHA_MAX).
 *
 * Low task count → low alpha → conservative updates (prior-dominated).
 * High task count → high alpha → responsive updates (observation-dominated).
 */
export function computeAlpha(taskCount: number): number {
  const rampFactor = Math.min(1, taskCount / ALPHA_RAMP);
  return ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * rampFactor;
}
