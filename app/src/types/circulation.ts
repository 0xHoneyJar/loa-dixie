/**
 * Circulation Types — Dynamic admission economics.
 *
 * Spawn costs reflect fleet utilization, operator reputation, and
 * task complexity. The CirculationProtocol computes costs that the
 * FleetGovernor uses for admission decisions.
 *
 * @since cycle-013 — Sprint 94, Task T-1.2
 */

// ---------------------------------------------------------------------------
// Spawn Cost
// ---------------------------------------------------------------------------

/** Dynamic cost breakdown for a spawn request. */
export interface SpawnCost {
  readonly baseCost: number;
  readonly utilizationMultiplier: number;
  readonly reputationDiscount: number;
  readonly complexityFactor: number;
  readonly finalCost: number;
  readonly breakdown: string;
}

// ---------------------------------------------------------------------------
// Utilization Snapshot
// ---------------------------------------------------------------------------

/** Fleet utilization at a point in time. */
export interface UtilizationSnapshot {
  readonly multiplier: number;
  readonly utilization: number;
  readonly capacityUsed: number;
  readonly capacityTotal: number;
}
