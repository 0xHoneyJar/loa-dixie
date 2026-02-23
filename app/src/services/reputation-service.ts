/**
 * Reputation Service — Foundation wiring for Hounfour governance types.
 *
 * Wraps Hounfour v7.9.2 governance functions with typed Dixie service methods.
 * Provides a typed API surface for the reputation aggregate lifecycle
 * (quality events, state transitions, cross-model scoring).
 *
 * Sprint 6 adds a persistence layer via ReputationStore interface with
 * constructor injection. The default InMemoryReputationStore is Map-backed
 * for development and testing. A PostgreSQL adapter is planned for
 * production (interface ready, implementation deferred).
 *
 * See: Hounfour governance sub-package, SDD §2.3 (ReputationAggregate FR-3)
 * @since Sprint 3 — Reputation Service Foundation
 * @since Sprint 6 — ReputationStore persistence layer
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
 * ReputationStore — persistence interface for reputation aggregates.
 *
 * Decouples ReputationService from storage implementation.
 * - `get(nftId)` — retrieve a single aggregate by dNFT ID
 * - `put(nftId, aggregate)` — upsert an aggregate
 * - `listCold()` — list all aggregates in the 'cold' reputation state
 *
 * Implementations:
 * - InMemoryReputationStore (Map-backed, for dev/test)
 * - TODO: PostgreSQLReputationStore (for production — see ADR)
 *
 * @since Sprint 6 — Task 6.1
 */
export interface ReputationStore {
  get(nftId: string): ReputationAggregate | undefined;
  put(nftId: string, aggregate: ReputationAggregate): void;
  listCold(): Array<{ nftId: string; aggregate: ReputationAggregate }>;
  /** Return the total number of stored aggregates. */
  count(): number;
}

/**
 * InMemoryReputationStore — Map-backed implementation for dev/test.
 *
 * Not suitable for production (data lost on restart). Use the
 * PostgreSQL adapter when it's implemented.
 *
 * @since Sprint 6 — Task 6.1
 */
export class InMemoryReputationStore implements ReputationStore {
  private readonly store = new Map<string, ReputationAggregate>();

  get(nftId: string): ReputationAggregate | undefined {
    return this.store.get(nftId);
  }

  put(nftId: string, aggregate: ReputationAggregate): void {
    this.store.set(nftId, aggregate);
  }

  listCold(): Array<{ nftId: string; aggregate: ReputationAggregate }> {
    const results: Array<{ nftId: string; aggregate: ReputationAggregate }> = [];
    for (const [nftId, aggregate] of this.store) {
      if (aggregate.state === 'cold') {
        results.push({ nftId, aggregate });
      }
    }
    return results;
  }

  count(): number {
    return this.store.size;
  }

  /** Clear all stored aggregates (for testing). */
  clear(): void {
    this.store.clear();
  }
}

/**
 * ReputationService — typed wrapper around Hounfour governance functions
 * with pluggable persistence via ReputationStore.
 *
 * Computation methods remain synchronous and pure.
 * The store provides CRUD access to reputation aggregates.
 *
 * @since Sprint 3 — Reputation Service Foundation
 * @since Sprint 6 — Constructor injection of ReputationStore
 */
export class ReputationService {
  readonly store: ReputationStore;

  /**
   * @param store - Optional persistence layer. Defaults to InMemoryReputationStore.
   */
  constructor(store?: ReputationStore) {
    this.store = store ?? new InMemoryReputationStore();
  }
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
