/**
 * Circulation Protocol — Dynamic admission economics.
 *
 * Computes spawn costs based on fleet utilization, operator reputation,
 * and task complexity. Ensures INV-023: finalCost >= floor (no free spawns).
 *
 * Cost formula:
 *   finalCost = max(floor, baseCost * utilization * reputation * complexity)
 *
 * @since cycle-013 — Sprint 97
 */
import type { DbPool } from '../db/client.js';
import type { SpawnCost, UtilizationSnapshot } from '../types/circulation.js';
import type { TaskType } from '../types/fleet.js';
import type { AgentIdentityRecord } from '../types/agent-identity.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface CirculationProtocolConfig {
  readonly baseCost?: number;          // default 1.0
  readonly costFloor?: number;         // default 0.1 (INV-023)
  readonly reputationWeight?: number;  // default 0.4
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_BASE_COST = 1.0;
const DEFAULT_COST_FLOOR = 0.1;
const DEFAULT_REPUTATION_WEIGHT = 0.4;

// ---------------------------------------------------------------------------
// Pure Functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Compute utilization multiplier from fleet utilization ratio.
 *
 * Low utilization (<40%) gives a discount (0.7x), normal (40-80%) is 1x,
 * high (80-95%) adds a surcharge (1.5x), and critical (>= 95%) is 3x.
 */
export function computeUtilizationMultiplier(utilization: number): number {
  if (utilization < 0.4) return 0.7;
  if (utilization < 0.8) return 1.0;
  if (utilization < 0.95) return 1.5;
  return 3.0;
}

/**
 * Compute reputation discount from average reputation score.
 *
 * Higher reputation yields lower cost. Clamped to [0.5, 1.0] range.
 * At reputation=0 no discount is applied (1.0x). At reputation=1.0
 * with default weight=0.4, discount is 0.6x. Minimum is 0.5x.
 */
export function computeReputationDiscount(
  averageReputation: number,
  weight: number = DEFAULT_REPUTATION_WEIGHT,
): number {
  return Math.max(0.5, 1.0 - averageReputation * weight);
}

/**
 * Compute complexity factor from task type and description length.
 *
 * Base factors per task type:
 *   review: 0.6, docs: 0.7, bug_fix: 0.8, refactor: 0.9, feature: 1.0
 *
 * Long descriptions (>1000 chars) add 0.4, medium (>500) adds 0.2.
 * Capped at 1.5.
 */
export function computeComplexityFactor(
  taskType: TaskType,
  descriptionLength: number,
): number {
  const bases: Record<TaskType, number> = {
    bug_fix: 0.8,
    refactor: 0.9,
    docs: 0.7,
    feature: 1.0,
    review: 0.6,
  };

  let factor = bases[taskType];

  if (descriptionLength > 1000) {
    factor += 0.4;
  } else if (descriptionLength > 500) {
    factor += 0.2;
  }

  return Math.min(1.5, factor);
}

// ---------------------------------------------------------------------------
// CirculationProtocol
// ---------------------------------------------------------------------------

export class CirculationProtocol {
  private readonly pool: DbPool | null;
  private readonly baseCost: number;
  private readonly costFloor: number;
  private readonly reputationWeight: number;

  constructor(pool?: DbPool, config: CirculationProtocolConfig = {}) {
    this.pool = pool ?? null;
    this.baseCost = config.baseCost ?? DEFAULT_BASE_COST;
    this.costFloor = config.costFloor ?? DEFAULT_COST_FLOOR;
    this.reputationWeight = config.reputationWeight ?? DEFAULT_REPUTATION_WEIGHT;
  }

  // -------------------------------------------------------------------------
  // Utilization
  // -------------------------------------------------------------------------

  /**
   * Query fleet utilization from the database and compute multiplier.
   *
   * Counts active tasks (status IN running, spawning, reviewing, pr_created)
   * against total capacity. Falls back to multiplier=1.0 if no pool.
   */
  async getUtilizationSnapshot(): Promise<UtilizationSnapshot> {
    if (!this.pool) {
      return {
        multiplier: 1.0,
        utilization: 0.0,
        capacityUsed: 0,
        capacityTotal: 0,
      };
    }

    const result = await this.pool.query<{
      active_count: string;
      total_capacity: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('running', 'spawning', 'reviewing', 'pr_created')) AS active_count,
         GREATEST(COUNT(*), 1) AS total_capacity
       FROM fleet_tasks
       WHERE created_at > NOW() - INTERVAL '24 hours'`,
    );

    const row = result.rows[0];
    const capacityUsed = parseInt(row.active_count, 10);
    const capacityTotal = parseInt(row.total_capacity, 10);
    const utilization = capacityTotal > 0 ? capacityUsed / capacityTotal : 0;

    return {
      multiplier: computeUtilizationMultiplier(utilization),
      utilization,
      capacityUsed,
      capacityTotal,
    };
  }

  // -------------------------------------------------------------------------
  // Reputation
  // -------------------------------------------------------------------------

  /**
   * Query operator's agent identities and compute average reputation discount.
   *
   * Falls back to discount=1.0 (no discount) if no pool is available.
   */
  async getReputationDiscount(operatorId: string): Promise<number> {
    if (!this.pool) {
      return 1.0;
    }

    const result = await this.pool.query<Pick<AgentIdentityRecord, 'aggregateReputation'>>(
      `SELECT aggregate_reputation AS "aggregateReputation"
       FROM agent_identities
       WHERE operator_id = $1`,
      [operatorId],
    );

    if (result.rows.length === 0) {
      return 1.0;
    }

    const totalReputation = result.rows.reduce(
      (sum, row) => sum + row.aggregateReputation,
      0,
    );
    const averageReputation = totalReputation / result.rows.length;

    return computeReputationDiscount(averageReputation, this.reputationWeight);
  }

  // -------------------------------------------------------------------------
  // Cost Computation
  // -------------------------------------------------------------------------

  /**
   * Compute the dynamic spawn cost for an admission request.
   *
   * Combines utilization multiplier, reputation discount, and complexity
   * factor. Enforces INV-023: finalCost >= costFloor (no free spawns).
   *
   * @param operatorId - Operator requesting the spawn
   * @param taskType   - Classification of the task
   * @param descriptionLength - Length of the task description in characters
   * @returns SpawnCost with breakdown string explaining each component
   */
  async computeCost(
    operatorId: string,
    taskType: TaskType,
    descriptionLength: number,
  ): Promise<SpawnCost> {
    // 1. Get utilization multiplier
    const utilSnapshot = await this.getUtilizationSnapshot();
    const utilizationMultiplier = utilSnapshot.multiplier;

    // 2. Get reputation discount
    const reputationDiscount = await this.getReputationDiscount(operatorId);

    // 3. Get complexity factor
    const complexityFactor = computeComplexityFactor(taskType, descriptionLength);

    // 4. Compute final cost with floor enforcement (INV-023)
    const rawCost =
      this.baseCost * utilizationMultiplier * reputationDiscount * complexityFactor;
    const finalCost = Math.max(this.costFloor, rawCost);

    // 5. Build breakdown string
    const breakdown = [
      `base=${this.baseCost}`,
      `utilization=${utilizationMultiplier}x (${(utilSnapshot.utilization * 100).toFixed(1)}% used)`,
      `reputation=${reputationDiscount.toFixed(3)}x`,
      `complexity=${complexityFactor}x (${taskType}, ${descriptionLength} chars)`,
      `raw=${rawCost.toFixed(4)}`,
      `floor=${this.costFloor}`,
      `final=${finalCost.toFixed(4)}`,
    ].join(' | ');

    return {
      baseCost: this.baseCost,
      utilizationMultiplier,
      reputationDiscount,
      complexityFactor,
      finalCost,
      breakdown,
    };
  }
}
