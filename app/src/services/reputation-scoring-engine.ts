/**
 * Reputation Scoring Engine — Pure scoring computation extracted from ReputationService.
 *
 * Contains all stateless, pure functions for reputation score computation:
 * - EMA dampening (feedback loop safety)
 * - Bayesian blending (personal × collection)
 * - Dimensional quality decomposition
 * - Task-aware cross-model scoring
 * - Collection-level population statistics (Welford's algorithm)
 *
 * Extraction motivated by BB-DEEP-03: ReputationService was approaching god object
 * status (1253 lines, 8+ responsibilities). This module handles the "scoring engine"
 * responsibility as a focused, testable unit.
 *
 * @since cycle-014 Sprint 105 — BB-DEEP-03 (ReputationService extraction)
 */
import {
  computeBlendedScore,
  computeCrossModelScore,
} from '@0xhoneyjar/loa-hounfour/governance';
import {
  computeDampenedScore as canonicalDampenedScore,
  FEEDBACK_DAMPENING_ALPHA_MIN,
  FEEDBACK_DAMPENING_ALPHA_MAX,
  DAMPENING_RAMP_SAMPLES,
} from '@0xhoneyjar/loa-hounfour/commons';
import type { DixieReputationAggregate } from '../types/reputation-evolution.js';

// Re-export canonical constants for backward compatibility.
// Consumers that imported these from reputation-scoring-engine.ts continue working.
export { FEEDBACK_DAMPENING_ALPHA_MIN, FEEDBACK_DAMPENING_ALPHA_MAX, DAMPENING_RAMP_SAMPLES };

// ---------------------------------------------------------------------------
// Feedback Dampening — Configurable Wrapper (ADR-005, P1 Migration)
// ---------------------------------------------------------------------------

/**
 * Dixie-specific dampening configuration.
 *
 * Extends hounfour's canonical `FeedbackDampeningConfig` with two Dixie-specific
 * fields that control behavioral divergence points identified in the bridge
 * deep review (PR #64):
 *
 * - `rampDirection`: Controls whether alpha increases (conservative-first) or
 *   decreases (responsive-first) with sample count. See ADR-005.
 * - `coldStartStrategy`: Controls first-observation behavior. See ADR-005.
 *
 * @since cycle-019 — Sprint 119, Task T4.3 (P1 canonical migration)
 */
export interface FeedbackDampeningConfig {
  /** Alpha ramp direction. 'ascending' = Dixie's conservative-first (default).
   *  'descending' = hounfour's responsive-first (ML best practice). */
  readonly rampDirection: 'ascending' | 'descending';
  /** Cold-start strategy for first observation (oldScore === null).
   *  'direct' = return newScore (Dixie default). 'bayesian' = pseudo-count prior.
   *  'dual-track' = Bayesian for governance, direct for display (see DualTrackScoreResult). */
  readonly coldStartStrategy: 'direct' | 'bayesian' | 'dual-track';
}

/**
 * Default config: preserves exact current Dixie behavior.
 * ascending ramp (0.1→0.5) + direct cold-start (trust first observation).
 * @since cycle-019 — Sprint 119, Task T4.3
 */
export const DIXIE_DAMPENING_DEFAULTS: Readonly<FeedbackDampeningConfig> = {
  rampDirection: 'ascending',
  coldStartStrategy: 'direct',
} as const;

/**
 * Result of dual-track cold-start scoring.
 * Provides both the governance score (Bayesian prior) and the display score
 * (direct observed) with observation count for UI consumption.
 * @since cycle-019 — Sprint 119, Task T4.4
 */
export interface DualTrackScoreResult {
  /** Internal score for governance decisions (Bayesian prior, ≈0.541 for first obs). */
  readonly internalScore: number;
  /** Display score for human-facing UI (direct observed value). */
  readonly displayScore: number;
  /** Number of observations (for "N observations" badge in UI). */
  readonly observationCount: number;
}

/**
 * Compute a dampened reputation score using hounfour's canonical EMA with
 * Dixie-specific ramp direction and cold-start strategy.
 *
 * With default config ({ascending, direct}), produces output identical to the
 * pre-migration local implementation — verified by shadow comparison tests.
 *
 * @param oldScore - Current personal score (null for first observation)
 * @param newScore - New observation score
 * @param sampleCount - Current sample count (before this observation)
 * @param config - Dixie dampening config (defaults to DIXIE_DAMPENING_DEFAULTS)
 * @returns Dampened score in [0, 1]
 * @since cycle-019 — Sprint 119, Task T4.3 (replaces local computeDampenedScore)
 */
export function computeDampenedScore(
  oldScore: number | null,
  newScore: number,
  sampleCount: number,
  config: FeedbackDampeningConfig = DIXIE_DAMPENING_DEFAULTS,
): number {
  // Cold start: apply configured strategy
  if (oldScore === null) {
    if (config.coldStartStrategy === 'direct') {
      return newScore;
    }
    // 'bayesian' and 'dual-track' both use canonical Bayesian prior for governance score
    return canonicalDampenedScore(null, newScore, sampleCount);
  }

  // Steady state: apply configured ramp direction
  if (config.rampDirection === 'descending') {
    // Canonical behavior: alpha_max at n=0, alpha_min at n=ramp
    return canonicalDampenedScore(oldScore, newScore, sampleCount);
  }

  // Ascending ramp (Dixie default): alpha_min at n=0, alpha_max at n=ramp
  // This is Dixie's original formula — conservative-first.
  const rampFraction = Math.min(1, sampleCount / DAMPENING_RAMP_SAMPLES);
  const alpha = FEEDBACK_DAMPENING_ALPHA_MIN
    + (FEEDBACK_DAMPENING_ALPHA_MAX - FEEDBACK_DAMPENING_ALPHA_MIN) * rampFraction;

  return oldScore + alpha * (newScore - oldScore);
}

/**
 * Compute dual-track scores for cold-start scenarios.
 *
 * Returns both the Bayesian internal score (for governance decisions like
 * admission and task routing) and the direct display score (for human-facing
 * UI with observation count). After warm-up, both strategies converge.
 *
 * @param oldScore - Current personal score (null for first observation)
 * @param newScore - New observation score
 * @param sampleCount - Current sample count (before this observation)
 * @returns Dual-track result with internal, display, and observation count
 * @since cycle-019 — Sprint 119, Task T4.4
 */
export function computeDualTrackScore(
  oldScore: number | null,
  newScore: number,
  sampleCount: number,
): DualTrackScoreResult {
  return {
    internalScore: computeDampenedScore(oldScore, newScore, sampleCount, {
      rampDirection: 'ascending',
      coldStartStrategy: 'bayesian',
    }),
    displayScore: computeDampenedScore(oldScore, newScore, sampleCount, {
      rampDirection: 'ascending',
      coldStartStrategy: 'direct',
    }),
    observationCount: sampleCount + 1,
  };
}

// ---------------------------------------------------------------------------
// Default Economic Parameters (Bridgebuilder F4 — single source of truth)
// ---------------------------------------------------------------------------

/**
 * Default pseudo count for Bayesian reputation blending.
 * Represents the strength of the collection prior: higher values make the
 * system more conservative (slower to deviate from the collection score).
 * A value of 10 means an agent needs ~10 observations before its personal
 * score starts significantly outweighing the collection prior.
 * @since cycle-007 — Sprint 78, Task S1-T5 (Bridgebuilder F4)
 */
export const DEFAULT_PSEUDO_COUNT = 10;

/**
 * Default collection score for Bayesian reputation blending.
 * The prior mean — what we assume an agent's quality is before any observations.
 * 0.5 represents "no opinion" — the neutral Bayesian prior (neither penalized nor boosted).
 * Distinguished from empirical mean: 0.5 is epistemic neutrality, not observed average.
 * @since cycle-007 — Sprint 78, Task S1-T5 (Bridgebuilder F4)
 * @since cycle-011 — T1.3: Changed from 0 to 0.5 (neutral prior, Flatline SKP-004)
 */
export const DEFAULT_COLLECTION_SCORE = 0.5;

// ---------------------------------------------------------------------------
// Collection Score Aggregator (FR-6: Empirical Collection Score)
// ---------------------------------------------------------------------------

/**
 * CollectionScoreAggregator — Maintains running population statistics
 * for Bayesian prior calibration. Replaces DEFAULT_COLLECTION_SCORE = 0
 * with the empirically observed mean across all agents.
 *
 * Uses Welford's online algorithm for numerically stable mean/variance.
 * Standard approach used by NumPy, Apache Spark, and PostgreSQL's var_pop().
 *
 * @since cycle-008 — FR-6 (empirical collection score)
 */
export class CollectionScoreAggregator {
  private _count = 0;
  private _mean = 0;
  private _m2 = 0; // Welford's running sum of squares

  /**
   * Update with a new personal score observation.
   * Uses Welford's algorithm: stable for large N, O(1) amortized.
   */
  update(score: number): void {
    this._count++;
    const delta = score - this._mean;
    this._mean += delta / this._count;
    const delta2 = score - this._mean;
    this._m2 += delta * delta2;
  }

  /** Population mean. Returns 0 when no observations (fallback to DEFAULT_COLLECTION_SCORE). */
  get mean(): number {
    return this._count > 0 ? this._mean : DEFAULT_COLLECTION_SCORE;
  }

  /** Number of observations. */
  get populationSize(): number {
    return this._count;
  }

  /** Population variance (for future adaptive pseudo_count). */
  get variance(): number {
    return this._count > 1 ? this._m2 / this._count : 0;
  }

  /** Snapshot for persistence. */
  toJSON(): { count: number; mean: number; m2: number } {
    return { count: this._count, mean: this._mean, m2: this._m2 };
  }

  /** Restore from persistence snapshot. */
  static fromJSON(data: { count: number; mean: number; m2: number }): CollectionScoreAggregator {
    const agg = new CollectionScoreAggregator();
    agg._count = data.count;
    agg._mean = data.mean;
    agg._m2 = data.m2;
    return agg;
  }

  /**
   * Restore this instance's state from a snapshot (in-place mutation).
   * Used for startup seeding — avoids constructing a new service.
   * @since cycle-011 — Sprint 82, Task T1.4
   */
  restore(data: { count: number; mean: number; m2: number }): void {
    if (!Number.isFinite(data.count) || data.count < 0) return;
    if (!Number.isFinite(data.mean)) return;
    if (!Number.isFinite(data.m2) || data.m2 < 0) return;
    this._count = data.count;
    this._mean = data.mean;
    this._m2 = data.m2;
  }
}

// ---------------------------------------------------------------------------
// Dimensional Quality Blending (FR-7)
// ---------------------------------------------------------------------------

/**
 * Blend each quality dimension independently using the same EMA dampening
 * + Bayesian pipeline as the overall score. "Good at review" ≠ "good at
 * reasoning" becomes expressible.
 *
 * @param dimensions - New dimension scores from the quality observation
 * @param existingDimensions - Previous dimension scores (undefined on first observation)
 * @param sampleCount - Current sample count (before this observation)
 * @param collectionScore - Collection prior for blending
 * @param pseudoCount - Bayesian prior strength
 * @returns Record of independently blended dimension scores
 * @since cycle-008 — FR-7 (multi-dimensional quality decomposition)
 */
export function computeDimensionalBlended(
  dimensions: Readonly<Record<string, number>>,
  existingDimensions: Readonly<Record<string, number>> | undefined,
  sampleCount: number,
  collectionScore: number,
  pseudoCount: number,
): Record<string, number> {
  // BB-008-003: Carry forward existing dimensions not present in the new
  // observation. Without this, intermittent dimension coverage causes data
  // loss — e.g., an observation with only {accuracy} would drop {coherence}
  // from a previous observation that had both.
  const result: Record<string, number> = { ...(existingDimensions ?? {}) };
  for (const [key, score] of Object.entries(dimensions)) {
    const existingScore = existingDimensions?.[key] ?? null;
    const dampened = computeDampenedScore(existingScore, score, sampleCount);
    result[key] = computeBlendedScore(dampened, collectionScore, sampleCount + 1, pseudoCount);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Task-Aware Cross-Model Scoring
// ---------------------------------------------------------------------------

/**
 * Default weight multiplier for task-matching cohorts in cross-model scoring.
 *
 * When a task type is provided, cohorts matching that task type have their
 * sample_count multiplied by this factor, increasing their influence in the
 * weighted average. This ensures task-specific reputation data dominates
 * when available while still incorporating non-matching cohort data.
 *
 * A multiplier of 3.0 means a task-matching cohort with 10 samples has
 * the same influence as a non-matching cohort with 30 samples.
 *
 * @since Sprint 10 — Task 10.3
 */
export const TASK_MATCH_WEIGHT_MULTIPLIER = 3.0;

/**
 * Compute task-aware cross-model meta-score from per-task cohorts.
 *
 * When a task type is provided, cohorts matching that task type are weighted
 * higher (by TASK_MATCH_WEIGHT_MULTIPLIER) in the weighted average. This
 * prioritizes task-specific reputation data while still incorporating
 * cross-task signal as a secondary input.
 *
 * When no task type is provided, falls back to the standard Hounfour
 * computeCrossModelScore behavior (all cohorts weighted equally by
 * sample count).
 *
 * @param cohorts - Array of TaskTypeCohort data
 * @param taskType - Optional task type to prioritize (e.g., "code_review")
 * @returns Weighted meta-score or null if all cohorts are cold
 * @since Sprint 10 — Task 10.3
 */
export function computeTaskAwareCrossModelScore(
  cohorts: ReadonlyArray<{
    personal_score: number | null;
    sample_count: number;
    task_type?: string;
  }>,
  taskType?: string,
): number | null {
  // When no task type specified, delegate to standard cross-model scoring.
  // This maintains full backward compatibility with existing behavior.
  if (!taskType) {
    return computeCrossModelScore(cohorts);
  }

  // Filter to cohorts that have a personal score (non-cold)
  const activeCohorts = cohorts.filter(
    (c): c is typeof c & { personal_score: number } => c.personal_score !== null,
  );

  if (activeCohorts.length === 0) {
    return null;
  }

  // Compute weighted average with task-type boost.
  let weightedSum = 0;
  let totalWeight = 0;

  for (const cohort of activeCohorts) {
    const isTaskMatch = cohort.task_type === taskType;
    const effectiveWeight = isTaskMatch
      ? cohort.sample_count * TASK_MATCH_WEIGHT_MULTIPLIER
      : cohort.sample_count;

    weightedSum += cohort.personal_score * effectiveWeight;
    totalWeight += effectiveWeight;
  }

  if (totalWeight === 0) {
    return null;
  }

  return weightedSum / totalWeight;
}

/** Result of a reputation reliability check. */
export interface ReliabilityResult {
  readonly reliable: boolean;
  readonly reasons: string[];
}

/** Blended score computation input. */
export interface BlendedScoreInput {
  readonly personalScore: number | null;
  readonly collectionScore: number;
  readonly sampleCount: number;
  readonly pseudoCount: number;
}
