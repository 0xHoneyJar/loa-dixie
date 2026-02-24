/**
 * Reputation Evolution — Per-Model Per-Task Cohort Types
 *
 * Extends Hounfour's ModelCohort with task-type dimensionality. A single model
 * may perform differently across task types (code review vs. creative writing
 * vs. analysis), so reputation tracking must be task-aware.
 *
 * The task type taxonomy is intentionally small — 5 categories that cover
 * the primary interaction modes. New task types should only be added when
 * there is measurable quality divergence between the new type and existing
 * categories (i.e., a model's score for the new type would be statistically
 * different from its score for any existing type).
 *
 * See: Hounfour v7.9.2 ModelCohort, SDD §2.3 (ReputationAggregate FR-3)
 * @since Sprint 10 — Reputation Evolution (Per-Model Per-Task Cohorts)
 */
import type {
  ModelCohort,
  ReputationAggregate,
} from '@0xhoneyjar/loa-hounfour/governance';

/**
 * Task type taxonomy — the primary interaction modes for reputation tracking.
 *
 * Each task type represents a qualitatively distinct capability domain where
 * model performance may diverge. The taxonomy is kept intentionally small to
 * avoid over-segmentation (which dilutes sample counts and delays convergence
 * from the Bayesian prior).
 *
 * - code_review: Code analysis, review, debugging, refactoring suggestions
 * - creative_writing: Narrative, poetry, marketing copy, storytelling
 * - analysis: Data analysis, research synthesis, logical reasoning
 * - summarization: Condensing, extracting key points, TL;DR generation
 * - general: Default catch-all for interactions that don't fit above categories
 */
export const TASK_TYPES = [
  'code_review',
  'creative_writing',
  'analysis',
  'summarization',
  'general',
] as const;

/** Union type derived from the TASK_TYPES const array. */
export type TaskType = (typeof TASK_TYPES)[number];

/**
 * TaskTypeCohort — Dixie-specific extension of Hounfour's ModelCohort
 * that adds task-type dimensionality.
 *
 * A single model (e.g., "gpt-4o") may have multiple TaskTypeCohorts,
 * one per task type. This allows the reputation system to answer:
 * "How well does gpt-4o perform specifically at code_review for this agent?"
 *
 * Extends ModelCohort with:
 * - task_type: Which task category this cohort tracks
 *
 * The intersection type preserves all ModelCohort fields (model_id,
 * personal_score, sample_count, last_updated) while adding the task
 * dimension.
 */
export type TaskTypeCohort = ModelCohort & {
  /** The task category this cohort tracks. */
  readonly task_type: TaskType;
};

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

/**
 * ReputationEvent — Foundation for event-sourced reputation tracking.
 *
 * Events are the source of truth for reputation changes. Each event
 * records a discrete reputation-relevant action with its timestamp and
 * payload. The event log enables:
 *
 * 1. Audit trail: Full history of what changed reputation and when
 * 2. Reconstruction: Replay events to rebuild aggregate state
 * 3. Debugging: Trace unexpected reputation changes to their cause
 *
 * Event types:
 * - quality_signal: A quality observation from model output evaluation
 * - task_completed: A task was completed (affects sample count, score)
 * - credential_update: A reputation credential was issued or revoked
 */
export interface ReputationEvent {
  /** Discriminator for the event type. */
  readonly type: 'quality_signal' | 'task_completed' | 'credential_update';
  /** ISO 8601 timestamp of when the event occurred. */
  readonly timestamp: string;
  /** Event-specific payload. Structure depends on the event type. */
  readonly payload: unknown;
}

/**
 * ScoringPath — Diagnostic record of which reputation scoring path
 * was used for an economic boundary evaluation.
 *
 * Enables observability into whether the system used:
 * - task_cohort: Task-specific reputation data (most precise)
 * - aggregate: Overall reputation aggregate (fallback)
 * - tier_default: Static tier-based default (cold start)
 */
export interface ScoringPathLog {
  /** Which scoring path was chosen. */
  readonly path: 'task_cohort' | 'aggregate' | 'tier_default';
  /** Model ID used for scoring, if applicable. */
  readonly model?: string;
  /** Task type used for scoring, if applicable. */
  readonly task_type?: TaskType;
}
