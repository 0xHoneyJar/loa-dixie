/**
 * Reputation Evolution — Re-export Barrel for Hounfour v7.11.0 Governance Types
 *
 * This module re-exports canonical protocol types from @0xhoneyjar/loa-hounfour/governance.
 * Local stub definitions have been replaced with protocol-canonical imports as of v7.11.0.
 *
 * The only local definition is DixieReputationAggregate, which extends the protocol's
 * ReputationAggregate with Dixie-specific task_cohorts tracking.
 *
 * Migration summary (v7.9.2 → v7.11.0):
 * - TaskType: fixed 5-literal union → open enum (5 protocol + namespace:type community pattern)
 * - TaskTypeCohort: ModelCohort intersection → canonical schema with confidence_threshold
 * - ReputationEvent: generic {type, timestamp, payload} → discriminated union of 3 structured variants
 * - ScoringPathLog: 3 fields → 7 fields (adds reason, scored_at, entry_hash, previous_hash)
 *
 * See: Hounfour v7.11.0 governance barrel, ADR-001 (barrel precedence), ADR-003 (community task types)
 * @since Sprint 10 — Reputation Evolution (Per-Model Per-Task Cohorts)
 * @since cycle-005 — Hounfour v7.11.0 Full Adoption (re-export barrel)
 */
import type {
  ReputationAggregate,
  TaskTypeCohort,
} from '@0xhoneyjar/loa-hounfour/governance';

// ─── Task Type Vocabulary (v7.10.0) ─────────────────────────────────────────
// TaskType is an open enum: 5 protocol literals + community-defined namespace:type pattern.
// TASK_TYPES const array contains the 5 protocol-defined task types only.
export { TASK_TYPES } from '@0xhoneyjar/loa-hounfour/governance';
export type { TaskType } from '@0xhoneyjar/loa-hounfour/governance';

// ─── Task Type Cohorts (v7.10.0) ────────────────────────────────────────────
// TaskTypeCohort includes optional confidence_threshold field (default: 30).
// validateTaskCohortUniqueness enforces the (model_id, task_type) uniqueness invariant.
export type { TaskTypeCohort } from '@0xhoneyjar/loa-hounfour/governance';
export { validateTaskCohortUniqueness } from '@0xhoneyjar/loa-hounfour/governance';

// ─── Reputation Events (v7.10.0) ────────────────────────────────────────────
// ReputationEvent is a discriminated union of 3 structured event variants.
// Each variant has envelope fields (event_id, agent_id, collection_id, timestamp)
// plus variant-specific data fields.
export type {
  ReputationEvent,
  QualitySignalEvent,
  TaskCompletedEvent,
  CredentialUpdateEvent,
} from '@0xhoneyjar/loa-hounfour/governance';

// ─── Scoring Path (v7.10.0 + v7.11.0 hash chain) ───────────────────────────
// ScoringPath: 'task_cohort' | 'aggregate' | 'tier_default'
// ScoringPathLog: includes optional hash chain fields (entry_hash, previous_hash, scored_at, reason)
export type {
  ScoringPath,
  ScoringPathLog,
} from '@0xhoneyjar/loa-hounfour/governance';

// ─── Dixie-Specific Extension ───────────────────────────────────────────────

/**
 * DixieReputationAggregate — Extension of Hounfour's ReputationAggregate
 * with task-type cohort tracking.
 *
 * Adds a `task_cohorts` array that contains per-model per-task reputation
 * data. The existing `model_cohorts` field (from Hounfour) tracks per-model
 * aggregates across all task types; `task_cohorts` provides the finer-grained
 * per-task breakdown.
 *
 * Relationship:
 * - model_cohorts[i] = aggregate across all task types for model i
 * - task_cohorts[j] = score for model X on task type Y (one entry per combo)
 *
 * The task_cohorts array is optional to maintain backward compatibility
 * with aggregates that pre-date task-type tracking.
 */
export type DixieReputationAggregate = ReputationAggregate & {
  /** Per-model per-task reputation cohorts. */
  readonly task_cohorts?: TaskTypeCohort[];
};
