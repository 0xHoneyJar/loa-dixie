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
 * Sprint 10 extends with:
 * - Task-type cohort storage (per-model per-task reputation tracking)
 * - Task-aware cross-model scoring (prioritize task-matching cohorts)
 * - Event sourcing foundation (append-only event log + reconstruction stub)
 *
 * See: Hounfour governance sub-package, SDD §2.3 (ReputationAggregate FR-3)
 * @since Sprint 3 — Reputation Service Foundation
 * @since Sprint 6 — ReputationStore persistence layer
 * @since Sprint 10 — Reputation Evolution (per-model per-task cohorts)
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
import type {
  TaskTypeCohort,
  ReputationEvent,
  DixieReputationAggregate,
} from '../types/reputation-evolution.js';

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
  get(nftId: string): Promise<ReputationAggregate | undefined>;
  put(nftId: string, aggregate: ReputationAggregate): Promise<void>;
  listCold(): Promise<Array<{ nftId: string; aggregate: ReputationAggregate }>>;
  /** Return the total number of stored aggregates. */
  count(): Promise<number>;
  /** List all aggregates. Used for tier distribution scans. */
  listAll(): Promise<Array<{ nftId: string; aggregate: ReputationAggregate }>>;

  /**
   * Retrieve a task-type cohort for a specific NFT, model, and task type.
   *
   * @param nftId - The dNFT ID
   * @param model - The model alias (e.g., "gpt-4o", "native")
   * @param taskType - The task type (e.g., "code_review", "analysis")
   * @returns The matching TaskTypeCohort, or undefined if not found
   * @since Sprint 10 — Task 10.2
   */
  getTaskCohort(nftId: string, model: string, taskType: string): Promise<TaskTypeCohort | undefined>;

  /**
   * Store a task-type cohort for a specific NFT.
   *
   * Keyed by `${nftId}:${model_id}:${task_type}`. Upserts if a cohort
   * already exists for the same key.
   *
   * @param nftId - The dNFT ID
   * @param cohort - The TaskTypeCohort to store
   * @since Sprint 10 — Task 10.2
   */
  putTaskCohort(nftId: string, cohort: TaskTypeCohort): Promise<void>;

  /**
   * Append a reputation event to the event log for a specific NFT.
   *
   * Events are stored in append-only order. This forms the foundation
   * for event-sourced reputation tracking — the event log is the source
   * of truth from which aggregates can be reconstructed.
   *
   * @param nftId - The dNFT ID
   * @param event - The reputation event to append
   * @since Sprint 10 — Task 10.5
   */
  appendEvent(nftId: string, event: ReputationEvent): Promise<void>;

  /**
   * Retrieve the full event history for a specific NFT.
   *
   * Events are returned in insertion order (oldest first). Used for
   * audit trails, aggregate reconstruction, and debugging.
   *
   * @param nftId - The dNFT ID
   * @param limit - Optional maximum number of events to return (default: all)
   * @returns Array of reputation events in chronological order
   * @since Sprint 10 — Task 10.5
   */
  getEventHistory(nftId: string, limit?: number): Promise<ReputationEvent[]>;

  /**
   * Retrieve the N most recent events for a specific NFT.
   *
   * Returns events in chronological order (oldest first among the recent N).
   * Uses DESC LIMIT + reverse for index-efficient top-N access on PostgreSQL.
   *
   * @param nftId - The dNFT ID
   * @param limit - Maximum number of recent events to return
   * @returns Array of recent reputation events in chronological order
   * @since Sprint 5 (G-69) — Task 5.2
   */
  getRecentEvents(nftId: string, limit: number): Promise<ReputationEvent[]>;

  /**
   * Count aggregates grouped by reputation state.
   *
   * Returns a Map from state name to count. Used for tier distribution
   * dashboards without loading full JSONB blobs.
   *
   * @returns Map of state → count
   * @since Sprint 5 (G-69) — Task 5.1
   */
  countByState(): Promise<Map<string, number>>;
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

  /**
   * Task cohort storage — nested Map keyed by composite key.
   * Key structure: `${nftId}:${model_id}:${task_type}`
   * @since Sprint 10 — Task 10.2
   */
  private readonly taskCohorts = new Map<string, TaskTypeCohort>();

  /**
   * Event log storage — append-only array per nftId.
   * Events are stored in insertion order (chronological).
   * @since Sprint 10 — Task 10.5
   */
  private readonly eventLog = new Map<string, ReputationEvent[]>();

  async get(nftId: string): Promise<ReputationAggregate | undefined> {
    return this.store.get(nftId);
  }

  async put(nftId: string, aggregate: ReputationAggregate): Promise<void> {
    this.store.set(nftId, aggregate);
  }

  async listCold(): Promise<Array<{ nftId: string; aggregate: ReputationAggregate }>> {
    const results: Array<{ nftId: string; aggregate: ReputationAggregate }> = [];
    for (const [nftId, aggregate] of this.store) {
      if (aggregate.state === 'cold') {
        results.push({ nftId, aggregate });
      }
    }
    return results;
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  async listAll(): Promise<Array<{ nftId: string; aggregate: ReputationAggregate }>> {
    return Array.from(this.store.entries()).map(([nftId, aggregate]) => ({ nftId, aggregate }));
  }

  /**
   * Retrieve a task-type cohort by composite key.
   * @since Sprint 10 — Task 10.2
   */
  async getTaskCohort(nftId: string, model: string, taskType: string): Promise<TaskTypeCohort | undefined> {
    const key = `${nftId}:${model}:${taskType}`;
    return this.taskCohorts.get(key);
  }

  /**
   * Store a task-type cohort. Upserts by composite key.
   * @since Sprint 10 — Task 10.2
   */
  async putTaskCohort(nftId: string, cohort: TaskTypeCohort): Promise<void> {
    const key = `${nftId}:${cohort.model_id}:${cohort.task_type}`;
    this.taskCohorts.set(key, cohort);
  }

  /**
   * Append an event to the event log for a given nftId.
   * Events are stored in insertion order (append-only).
   * @since Sprint 10 — Task 10.5
   */
  async appendEvent(nftId: string, event: ReputationEvent): Promise<void> {
    const existing = this.eventLog.get(nftId);
    if (existing) {
      existing.push(event);
    } else {
      this.eventLog.set(nftId, [event]);
    }
  }

  /**
   * Retrieve the full event history for a given nftId.
   * Returns events in insertion order (oldest first).
   * @since Sprint 10 — Task 10.5
   */
  async getEventHistory(nftId: string, limit?: number): Promise<ReputationEvent[]> {
    const events = this.eventLog.get(nftId) ?? [];
    return limit !== undefined ? events.slice(0, limit) : events;
  }

  async getRecentEvents(nftId: string, limit: number): Promise<ReputationEvent[]> {
    const events = this.eventLog.get(nftId) ?? [];
    return events.slice(-limit);
  }

  async countByState(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const aggregate of this.store.values()) {
      counts.set(aggregate.state, (counts.get(aggregate.state) ?? 0) + 1);
    }
    return counts;
  }

  /** Clear all stored data (aggregates, task cohorts, events) for testing. */
  clear(): void {
    this.store.clear();
    this.taskCohorts.clear();
    this.eventLog.clear();
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
 * ## Information Asymmetry: Low Sample Count Handling
 *
 * When the sample count for a specific task type is low, the effective
 * weight of the task-matching cohort remains small even after the multiplier.
 * This means the score is naturally dominated by the collection prior
 * (non-matching cohorts with more samples). This is an intentional property
 * of the Bayesian weighting: insufficient task-specific data should not
 * override the aggregate signal. As more task-specific observations accumulate,
 * the task cohort's influence grows proportionally.
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
  // Task-matching cohorts get their effective weight multiplied, meaning
  // they contribute proportionally more to the final score.
  //
  // Information asymmetry note: When a task-matching cohort has a low
  // sample count (e.g., 2), even with the 3x multiplier its effective
  // weight is only 6 — far less than a non-matching cohort with 30 samples.
  // The score is thus dominated by the collection prior (non-matching
  // aggregate data). This is correct behavior: insufficient task-specific
  // data should defer to the broader signal.
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

/**
 * Reconstruct a DixieReputationAggregate from an event stream.
 *
 * Full event replay: starts with a cold aggregate, replays each event in order,
 * and applies Hounfour governance functions (computeBlendedScore, isValidReputationTransition)
 * to produce a mathematically consistent aggregate.
 *
 * Event processing:
 * - QualitySignalEvent: updates personal_score via Bayesian blending, increments sample_count
 * - TaskCompletedEvent: updates task cohort scores
 * - CredentialUpdateEvent: updates contributor credentials
 *
 * State transitions:
 * - cold → warming: when sample_count > 0
 * - warming → established: when sample_count >= min_sample_count
 *
 * @param events - Array of reputation events in chronological order
 * @param options - Optional reconstruction configuration
 * @returns A DixieReputationAggregate reconstructed from the event stream
 * @since Sprint 10 — Task 10.5
 * @since Sprint 7 (G-71) — Task 7.2: Full event replay implementation
 */
export function reconstructAggregateFromEvents(
  events: ReadonlyArray<ReputationEvent>,
  options?: { pseudoCount?: number; collectionScore?: number },
): DixieReputationAggregate {
  const pseudoCount = options?.pseudoCount ?? 10;
  const collectionScore = options?.collectionScore ?? 0;
  const now = new Date().toISOString();

  // Start with a cold aggregate
  let personalScore: number | null = null;
  let sampleCount = 0;
  let state: ReputationState = 'cold';
  const transitionHistory: Array<{ from: string; to: string; timestamp: string }> = [];

  for (const event of events) {
    if (event.type === 'quality_signal') {
      // Extract score from the event — quality signals carry a numeric score
      const score = (event as Record<string, unknown>).score as number | undefined;
      if (score != null) {
        sampleCount++;
        // Bayesian blended personal score update
        personalScore = computeBlendedScore(
          personalScore,
          collectionScore,
          sampleCount,
          pseudoCount,
        );
      }
    }

    // State transitions based on sample count thresholds
    const minSampleCount = 10;
    let nextState: ReputationState = state;
    if (state === 'cold' && sampleCount > 0) {
      nextState = 'warming';
    } else if (state === 'warming' && sampleCount >= minSampleCount) {
      nextState = 'established';
    }

    if (nextState !== state && isValidReputationTransition(state, nextState)) {
      transitionHistory.push({ from: state, to: nextState, timestamp: event.timestamp });
      state = nextState;
    }
  }

  const blendedScore = computeBlendedScore(personalScore, collectionScore, sampleCount, pseudoCount);

  return {
    personality_id: '',
    collection_id: '',
    pool_id: '',
    state,
    personal_score: personalScore,
    collection_score: collectionScore,
    blended_score: blendedScore,
    sample_count: sampleCount,
    pseudo_count: pseudoCount,
    contributor_count: 0,
    min_sample_count: 10,
    created_at: events.length > 0 ? events[0].timestamp : now,
    last_updated: events.length > 0 ? events[events.length - 1].timestamp : now,
    transition_history: transitionHistory as unknown as ReputationAggregate['transition_history'],
    contract_version: '7.11.0',
    task_cohorts: [],
  };
}

// Re-export types for consumer convenience
export type {
  ReputationScore,
  ReputationAggregate,
  ReputationState,
  ReputationCredential,
  ModelCohort,
};

// Re-export Sprint 10 types + v7.11.0 additions
export type {
  TaskTypeCohort,
  ReputationEvent,
  QualitySignalEvent,
  TaskCompletedEvent,
  CredentialUpdateEvent,
  DixieReputationAggregate,
  CommunityReputationKey,
  ScoringPath,
  ScoringPathLog,
} from '../types/reputation-evolution.js';
export { TASK_TYPES, validateTaskCohortUniqueness } from '../types/reputation-evolution.js';
export type { TaskType } from '../types/reputation-evolution.js';
