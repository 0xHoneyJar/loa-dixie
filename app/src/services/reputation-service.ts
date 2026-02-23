/**
 * Reputation Service — Foundation wiring for Hounfour governance types.
 *
 * Wraps Hounfour v7.9.2 governance functions with typed Dixie service methods.
 * This is foundation wiring — not yet called from routes. Provides a typed
 * API surface for future sprint integration with the reputation aggregate
 * lifecycle (quality events, state transitions, cross-model scoring).
 *
 * See: Hounfour governance sub-package, SDD §2.3 (ReputationAggregate FR-3)
 * @since Sprint 3 — Reputation Service Foundation
 */
import type {
  ReputationScore,
} from '@0xhoneyjar/loa-hounfour/governance';
import type {
  ReputationAggregate,
  ReputationState,
  ReputationCredential,
  ModelCohort,
} from '@0xhoneyjar/loa-hounfour/governance';
import {
  isReliableReputation,
  isValidReputationTransition,
  computeBlendedScore,
  computePersonalWeight,
  computeDecayedSampleCount,
  computeCrossModelScore,
  getModelCohort,
} from '@0xhoneyjar/loa-hounfour/governance';

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

/**
 * ReputationService — typed wrapper around Hounfour governance functions.
 *
 * All methods are synchronous and pure (no side effects, no I/O).
 * State persistence is deferred to a future sprint that integrates
 * with the PostgreSQL reputation aggregate store.
 */
export class ReputationService {
  /**
   * Check if a reputation score is reliable enough to make decisions on.
   *
   * A reputation is considered reliable when it has sufficient sample size
   * and the score hasn't decayed below the minimum threshold.
   *
   * @param score - ReputationScore from the governance module
   * @param now - Optional timestamp for decay calculation (defaults to Date.now())
   * @returns Reliability assessment with reasons if unreliable
   */
  checkReliability(score: ReputationScore, now?: number): ReliabilityResult {
    return isReliableReputation(score, now);
  }

  /**
   * Validate whether a reputation state transition is allowed.
   *
   * The reputation state machine enforces:
   * - cold -> warming (initial observations received)
   * - warming -> established (sufficient sample count)
   * - established -> authoritative (consistent high quality)
   * - * -> cold (reset from any state — sanctions, decay)
   *
   * @param from - Current reputation state
   * @param to - Target reputation state
   * @returns true if the transition is valid
   */
  isValidTransition(from: ReputationState, to: ReputationState): boolean {
    return isValidReputationTransition(from, to);
  }

  /**
   * Compute the Bayesian blended reputation score.
   *
   * Blends personal quality score with the collection-level prior
   * using Bayesian inference: (k * q_collection + n * q_personal) / (k + n)
   *
   * When the agent is cold (personalScore === null), returns the collection
   * score as the best available estimate.
   *
   * @param input - Personal score, collection score, sample count, pseudo count
   * @returns Blended score in [0, 1]
   */
  computeBlended(input: BlendedScoreInput): number {
    return computeBlendedScore(
      input.personalScore,
      input.collectionScore,
      input.sampleCount,
      input.pseudoCount,
    );
  }

  /**
   * Compute the personal weight for Bayesian blending.
   *
   * Formula: w = n / (k + n) where n = sample count, k = pseudo count.
   * Higher sample counts give more weight to the personal score.
   *
   * @param sampleCount - Number of quality observations
   * @param pseudoCount - Collection prior strength
   * @returns Personal weight in [0, 1)
   */
  computeWeight(sampleCount: number, pseudoCount: number): number {
    return computePersonalWeight(sampleCount, pseudoCount);
  }

  /**
   * Compute effective sample count after temporal decay.
   *
   * Applies exponential decay: n_effective = n * exp(-lambda * days)
   * Prevents stale aggregates from retaining artificially high weight.
   *
   * @param sampleCount - Raw sample count
   * @param daysSinceUpdate - Days since the aggregate was last updated
   * @param halfLifeDays - Decay half-life (default: 30 days)
   * @returns Effective sample count after decay
   */
  computeDecayed(sampleCount: number, daysSinceUpdate: number, halfLifeDays?: number): number {
    return computeDecayedSampleCount(sampleCount, daysSinceUpdate, halfLifeDays);
  }

  /**
   * Compute cross-model meta-score from per-model cohorts.
   *
   * Each cohort's contribution is weighted by its sample count.
   * Returns null when all cohorts are cold (no personal scores).
   *
   * @param cohorts - Array of model cohort data (personal_score, sample_count)
   * @returns Weighted meta-score or null if all cold
   */
  computeCrossModel(cohorts: ReadonlyArray<{ personal_score: number | null; sample_count: number }>): number | null {
    return computeCrossModelScore(cohorts);
  }

  /**
   * Look up a specific model's cohort within a reputation aggregate.
   *
   * @param aggregate - The reputation aggregate to search
   * @param modelId - The model alias to look up (e.g. "native", "gpt-4o")
   * @returns The matching ModelCohort, or undefined if not found
   */
  getModelCohort(aggregate: ReputationAggregate, modelId: string): ModelCohort | undefined {
    return getModelCohort(aggregate, modelId);
  }
}

// Re-export types for consumer convenience
export type {
  ReputationScore,
  ReputationAggregate,
  ReputationState,
  ReputationCredential,
  ModelCohort,
};
