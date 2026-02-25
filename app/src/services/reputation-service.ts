/**
 * Reputation Service — Foundation wiring for Hounfour governance types.
 *
 * Wraps Hounfour governance functions with typed Dixie service methods.
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
 * cycle-007 (v8.2.0) extends with:
 * - processEvent() method with exhaustive 4-variant switch
 * - model_performance variant handling (decomposes into quality_signal pipeline)
 * - Updated reconstructAggregateFromEvents with 4-variant support
 *
 * See: Hounfour governance sub-package, SDD §2.3 (ReputationAggregate FR-3)
 * @since Sprint 3 — Reputation Service Foundation
 * @since Sprint 6 — ReputationStore persistence layer
 * @since Sprint 10 — Reputation Evolution (per-model per-task cohorts)
 * @since cycle-007 — Sprint 73, Task S1-T4 (v8.2.0 model_performance variant)
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
import type { GovernedReputation } from '@0xhoneyjar/loa-hounfour/commons';
import type { GovernanceMutation } from '@0xhoneyjar/loa-hounfour/commons';
import type {
  TaskTypeCohort,
  ReputationEvent,
  DixieReputationAggregate,
} from '../types/reputation-evolution.js';
import { MutationLog, createMutation } from './governance-mutation.js';
import type { MutationLogPersistence } from './governance-mutation.js';

// ---------------------------------------------------------------------------
// Feedback Dampening (Bridgebuilder F1 — autopoietic loop safety)
// ---------------------------------------------------------------------------

/**
 * Minimum dampening alpha — applied to cold/new agents with few observations.
 * Low alpha = conservative: new observations have minimal impact on the score.
 * This prevents a single outlier observation from dominating early reputation.
 * @since cycle-007 — Sprint 78, Task S1-T1 (Bridgebuilder F1)
 */
export const FEEDBACK_DAMPENING_ALPHA_MIN = 0.1;

/**
 * Maximum dampening alpha — applied to mature agents with many observations.
 * High alpha = responsive: the score tracks recent performance more closely.
 * Mature agents have enough history that individual observations matter more.
 * @since cycle-007 — Sprint 78, Task S1-T1 (Bridgebuilder F1)
 */
export const FEEDBACK_DAMPENING_ALPHA_MAX = 0.5;

/**
 * Number of samples needed to ramp alpha from MIN to MAX.
 * At 50 samples, alpha reaches ALPHA_MAX and the agent is fully responsive.
 * @since cycle-007 — Sprint 78, Task S1-T1 (Bridgebuilder F1)
 */
export const DAMPENING_RAMP_SAMPLES = 50;

/**
 * Compute a dampened reputation score using exponential moving average.
 *
 * Prevents runaway convergence or death spirals in the autopoietic feedback loop.
 * Alpha grows linearly with sample count:
 *   alpha = ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * min(1, sampleCount / RAMP)
 *   dampened = alpha * newScore + (1 - alpha) * oldScore
 *
 * On cold start (oldScore === null), returns newScore directly — no dampening
 * applies because there's no running average to blend with.
 *
 * @param oldScore - Current personal score (null for first observation)
 * @param newScore - New observation score from quality signal or model performance
 * @param sampleCount - Current sample count (before this observation)
 * @returns Dampened score in [0, 1]
 * @since cycle-007 — Sprint 78, Task S1-T1 (Bridgebuilder F1)
 */
export function computeDampenedScore(
  oldScore: number | null,
  newScore: number,
  sampleCount: number,
): number {
  // Cold start: no previous score to blend with
  if (oldScore === null) return newScore;

  // Trust assumption: inputs are in [0, 1] — validated at event ingestion boundary.
  // This function does not clamp to avoid masking upstream bugs.

  const rampFraction = Math.min(1, sampleCount / DAMPENING_RAMP_SAMPLES);
  const alpha = FEEDBACK_DAMPENING_ALPHA_MIN
    + (FEEDBACK_DAMPENING_ALPHA_MAX - FEEDBACK_DAMPENING_ALPHA_MIN) * rampFraction;

  return alpha * newScore + (1 - alpha) * oldScore;
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
 * Zero represents "no information" — the neutral starting point.
 * @since cycle-007 — Sprint 78, Task S1-T5 (Bridgebuilder F4)
 */
export const DEFAULT_COLLECTION_SCORE = 0;

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
   * @returns Array of reputation events in chronological order
   * @since Sprint 10 — Task 10.5
   */
  getEventHistory(nftId: string): Promise<ReputationEvent[]>;

  /**
   * Execute operations atomically. The callback receives the store itself.
   * In-memory: snapshot/restore semantics (rollback on error).
   * PostgreSQL: wraps in BEGIN/COMMIT with rollback on error.
   *
   * @since cycle-008 — FR-4 (transaction boundaries)
   */
  transact<T>(fn: (store: ReputationStore) => Promise<T>): Promise<T>;
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
  async getEventHistory(nftId: string): Promise<ReputationEvent[]> {
    return this.eventLog.get(nftId) ?? [];
  }

  /**
   * Execute operations atomically with snapshot/restore semantics.
   * Before calling fn, snapshots aggregates and task cohorts.
   * On error: restores pre-transaction state. On success: keeps mutations.
   * @since cycle-008 — FR-4
   */
  async transact<T>(fn: (store: ReputationStore) => Promise<T>): Promise<T> {
    const snapshot = new Map(this.store);
    const cohortSnapshot = new Map(this.taskCohorts);
    try {
      return await fn(this);
    } catch (err) {
      // Restore state on failure — the "rollback"
      this.store.clear();
      for (const [k, v] of snapshot) this.store.set(k, v);
      this.taskCohorts.clear();
      for (const [k, v] of cohortSnapshot) this.taskCohorts.set(k, v);
      throw err;
    }
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
   * Population-level statistics for Bayesian prior calibration.
   * Tracks the empirical mean across all agents — replaces DEFAULT_COLLECTION_SCORE.
   * @since cycle-008 — FR-6
   */
  readonly collectionAggregator: CollectionScoreAggregator;

  /**
   * Governed resource state — tracks governance metadata for the reputation system.
   * Uses GovernanceMutation for actor-attributed version tracking.
   * @since cycle-007 — Sprint 75, Task S3-T4
   */
  private readonly _mutationLog = new MutationLog();

  /**
   * @param store - Optional persistence layer. Defaults to InMemoryReputationStore.
   * @param collectionAggregator - Optional pre-seeded aggregator. Defaults to empty.
   */
  constructor(store?: ReputationStore, collectionAggregator?: CollectionScoreAggregator) {
    this.store = store ?? new InMemoryReputationStore();
    this.collectionAggregator = collectionAggregator ?? new CollectionScoreAggregator();
  }

  /**
   * Record a governance mutation against the reputation system.
   *
   * Wraps the mutation in a GovernanceMutation envelope with actor_id
   * attribution and version tracking. Appends to the append-only mutation log.
   *
   * @param actorId - The actor performing the mutation (from resolveActorId)
   * @returns The recorded GovernanceMutation envelope
   * @throws Error if version conflict (optimistic concurrency)
   * @since cycle-007 — Sprint 75, Task S3-T4
   */
  recordMutation(actorId: string): GovernanceMutation {
    const mutation = createMutation(actorId, this._mutationLog.version);
    this._mutationLog.append(mutation);
    return mutation;
  }

  /**
   * Get the governed resource state for the reputation system.
   *
   * Returns protocol-level metadata: current version, last mutation,
   * mutation history, and contract version. This is the governance
   * substrate view of the reputation resource — separate from the
   * domain-level ReputationAggregate data.
   *
   * @returns Readonly governed resource metadata
   * @since cycle-007 — Sprint 75, Task S3-T4
   */
  getGovernedState(): Readonly<{
    version: number;
    contract_version: string;
    governance_class: 'registry-extensible';
    mutation_count: number;
    latest_mutation: GovernanceMutation | undefined;
    mutation_history: ReadonlyArray<GovernanceMutation>;
    session_id: string;
  }> {
    return {
      version: this._mutationLog.version,
      contract_version: '8.2.0',
      governance_class: 'registry-extensible',
      mutation_count: this._mutationLog.history.length,
      latest_mutation: this._mutationLog.latest,
      mutation_history: this._mutationLog.history,
      session_id: this._mutationLog.sessionId,
    };
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

  /**
   * Process a reputation event through the appropriate handler.
   *
   * Exhaustive switch on all 4 ReputationEvent variants (v8.2.0).
   * Each variant is dispatched to its handler, which updates the
   * reputation aggregate accordingly.
   *
   * The model_performance variant is decomposed: the embedded
   * quality_observation score feeds into the blended reputation
   * computation as a quality signal, while the full event is
   * preserved in the event log for audit.
   *
   * @param nftId - The dNFT ID of the agent
   * @param event - The reputation event to process
   * @since cycle-007 — Sprint 73, Task S1-T4
   */
  async processEvent(nftId: string, event: ReputationEvent): Promise<void> {
    // Append the raw event to the log first (event sourcing)
    await this.store.appendEvent(nftId, event);

    // Dispatch by variant type (exhaustive)
    switch (event.type) {
      case 'quality_signal':
        await this.handleQualitySignal(nftId, event);
        break;
      case 'task_completed':
        await this.handleTaskCompleted(nftId, event);
        break;
      case 'credential_update':
        await this.handleCredentialUpdate(nftId, event);
        break;
      case 'model_performance':
        await this.handleModelPerformance(nftId, event);
        break;
      default:
        // TypeScript exhaustiveness check — should never reach here
        assertNever(event);
    }
  }

  /**
   * Build a fully consistent updated aggregate from a new personal score.
   *
   * Shared helper that ensures every event path (quality_signal, model_performance)
   * produces an aggregate with fresh blended_score. Extracted as part of
   * Bridgebuilder Gap 1 fix (FR-1): handleQualitySignal previously updated
   * personal_score but NOT blended_score.
   *
   * @param existing - Current aggregate state
   * @param newPersonalScore - New dampened personal score
   * @param timestamp - Event timestamp for last_updated
   * @returns Fully consistent aggregate with fresh blended_score
   * @since cycle-008 — Sprint 81, Task 1.1 (FR-1: consistent blended score)
   */
  private buildUpdatedAggregate(
    existing: ReputationAggregate,
    newPersonalScore: number,
    timestamp: string,
  ): ReputationAggregate {
    const newSampleCount = existing.sample_count + 1;

    // FR-6: Use empirical collection mean when population data available
    const collectionScore = this.collectionAggregator.populationSize > 0
      ? this.collectionAggregator.mean
      : existing.collection_score;

    const blended = this.computeBlended({
      personalScore: newPersonalScore,
      collectionScore,
      sampleCount: newSampleCount,
      pseudoCount: existing.pseudo_count,
    });

    // FR-6: Update population statistics with this observation
    this.collectionAggregator.update(newPersonalScore);

    return {
      ...existing,
      personal_score: newPersonalScore,
      blended_score: blended,
      collection_score: collectionScore,
      sample_count: newSampleCount,
      last_updated: timestamp,
    };
  }

  /**
   * Handle quality_signal event — update blended score.
   * @since cycle-007 — Sprint 73, Task S1-T4
   * @since cycle-008 — Sprint 81, Task 1.2 (FR-1: consistent blended score recomputation)
   * @since cycle-008 — Sprint 82, Task 2.3 (FR-4: transactional wrapper)
   */
  private async handleQualitySignal(
    nftId: string,
    event: Extract<ReputationEvent, { type: 'quality_signal' }>,
  ): Promise<void> {
    const aggregate = await this.store.get(nftId);
    if (!aggregate) return;

    const dampenedScore = computeDampenedScore(
      aggregate.personal_score,
      event.score,
      aggregate.sample_count,
    );
    const updated = this.buildUpdatedAggregate(aggregate, dampenedScore, event.timestamp);
    await this.store.transact(async (tx) => {
      await tx.put(nftId, updated);
    });
  }

  /**
   * Handle task_completed event — increment sample count.
   * @since cycle-007 — Sprint 73, Task S1-T4
   */
  private async handleTaskCompleted(
    nftId: string,
    event: Extract<ReputationEvent, { type: 'task_completed' }>,
  ): Promise<void> {
    const aggregate = await this.store.get(nftId);
    if (!aggregate) return;

    // Update task cohort if task_type is specified
    const cohort = await this.store.getTaskCohort(nftId, 'default', event.task_type);
    if (cohort) {
      await this.store.putTaskCohort(nftId, {
        ...cohort,
        sample_count: cohort.sample_count + 1,
        last_updated: event.timestamp,
      });
    }
  }

  /**
   * Handle credential_update event — record in event log (no aggregate change).
   *
   * **Current behavior**: Event recorded in event log (via processEvent's
   * appendEvent call above). No aggregate computation change.
   *
   * **Architectural rationale**: Credentials operate on the trust layer
   * (access policy evaluation via DynamicContract surfaces), while scores
   * operate on the quality layer (Bayesian blending via computeBlendedScore).
   * Mixing them couples "who you are" with "how well you perform."
   * This mirrors the OIDC separation between identity claims and authorization scopes.
   *
   * **Future consideration**: If credentials should contribute to reputation
   * (e.g., verified API key as trust signal), add a `credential_weight`
   * parameter to the blending function rather than mixing into quality scores.
   *
   * @since cycle-007 — Sprint 73, Task S1-T4
   * @since cycle-007 — Sprint 79, Task S2-T2 (Bridgebuilder F5: decision trail)
   */
  private async handleCredentialUpdate(
    _nftId: string,
    _event: Extract<ReputationEvent, { type: 'credential_update' }>,
  ): Promise<void> {
    // ADR: credentials ⊥ scores — see Bridgebuilder F5 (PR #15)
    // Credential updates are recorded in the event log (already done in processEvent).
    // No aggregate computation change — credentials affect access policy, not scores.
  }

  /**
   * Handle model_performance event — decompose into quality signal pipeline.
   * Wrapped in transact() so aggregate + cohort updates are atomic.
   * Threads dimensions through computeDimensionalBlended() when present.
   *
   * @since cycle-007 — Sprint 73, Task S1-T4
   * @since cycle-008 — Sprint 82, Task 2.3 (FR-4: transactional wrapper)
   * @since cycle-008 — Sprint 83, Task 3.5 (FR-7: dimensional blending)
   */
  private async handleModelPerformance(
    nftId: string,
    event: Extract<ReputationEvent, { type: 'model_performance' }>,
  ): Promise<void> {
    const aggregate = await this.store.get(nftId);
    if (!aggregate) return;

    const rawScore = event.quality_observation.score;
    const dampenedScore = computeDampenedScore(
      aggregate.personal_score,
      rawScore,
      aggregate.sample_count,
    );

    // Update aggregate via shared helper (FR-1: consistent blended score)
    const updated = this.buildUpdatedAggregate(aggregate, dampenedScore, event.timestamp);

    // FR-7: Thread dimensions when available in quality_observation
    const dimensions = (event.quality_observation as { dimensions?: Record<string, number> }).dimensions;
    const dixieAggregate = aggregate as DixieReputationAggregate;
    const collectionScore = this.collectionAggregator.populationSize > 0
      ? this.collectionAggregator.mean
      : aggregate.collection_score;
    const updatedWithDimensions = dimensions
      ? {
          ...updated,
          dimension_scores: computeDimensionalBlended(
            dimensions,
            dixieAggregate.dimension_scores,
            aggregate.sample_count,
            collectionScore,
            aggregate.pseudo_count,
          ),
        }
      : updated;

    // Atomic: aggregate + cohort update (FR-4: transaction boundary)
    await this.store.transact(async (tx) => {
      await tx.put(nftId, updatedWithDimensions);

      // Update task-specific cohort
      const existingCohort = await tx.getTaskCohort(nftId, event.model_id, event.task_type);
      if (existingCohort) {
        await tx.putTaskCohort(nftId, {
          ...existingCohort,
          personal_score: rawScore,
          sample_count: existingCohort.sample_count + 1,
          last_updated: event.timestamp,
        });
      } else {
        await tx.putTaskCohort(nftId, {
          model_id: event.model_id,
          task_type: event.task_type,
          personal_score: rawScore,
          sample_count: 1,
          last_updated: event.timestamp,
        });
      }
    });
  }
}

/**
 * Exhaustiveness check helper for discriminated unions.
 * TypeScript will error at compile time if a variant is not handled.
 */
function assertNever(x: never): never {
  throw new Error(`Unexpected event type: ${(x as { type: string }).type}`);
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
  const result: Record<string, number> = {};
  for (const [key, score] of Object.entries(dimensions)) {
    const existingScore = existingDimensions?.[key] ?? null;
    const dampened = computeDampenedScore(existingScore, score, sampleCount);
    result[key] = computeBlendedScore(dampened, collectionScore, sampleCount + 1, pseudoCount);
  }
  return result;
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
 * Replays events in chronological order through the 4-variant handler:
 * - quality_signal: updates personal_score with the signal's score
 * - task_completed: increments sample count (success tracking)
 * - credential_update: recorded but no score impact
 * - model_performance: extracts quality_observation.score + updates task cohorts
 *
 * The reconstruction pattern:
 * 1. Start with a cold aggregate (zero scores, zero samples)
 * 2. Replay each event in order, updating scores and state
 * 3. Return the final aggregate state with task_cohorts
 *
 * @param events - Array of reputation events in chronological order
 * @returns A DixieReputationAggregate reconstructed from the event stream
 * @since Sprint 10 — Task 10.5
 * @since cycle-007 — Sprint 73, Task S1-T4 (4-variant support)
 */
export function reconstructAggregateFromEvents(
  events: ReadonlyArray<ReputationEvent>,
): DixieReputationAggregate {
  let personalScore: number | null = null;
  let sampleCount = 0;
  const taskCohortMap = new Map<string, TaskTypeCohort>();

  for (const event of events) {
    switch (event.type) {
      case 'quality_signal':
        personalScore = computeDampenedScore(personalScore, event.score, sampleCount);
        sampleCount++;
        break;
      case 'task_completed':
        sampleCount++;
        break;
      case 'credential_update':
        // No score impact
        break;
      case 'model_performance': {
        const score = event.quality_observation.score;
        personalScore = computeDampenedScore(personalScore, score, sampleCount);
        sampleCount++;
        // Update task cohort
        const key = `${event.model_id}:${event.task_type}`;
        const existing = taskCohortMap.get(key);
        if (existing) {
          taskCohortMap.set(key, {
            ...existing,
            personal_score: score,
            sample_count: existing.sample_count + 1,
            last_updated: event.timestamp,
          });
        } else {
          taskCohortMap.set(key, {
            model_id: event.model_id,
            task_type: event.task_type,
            personal_score: score,
            sample_count: 1,
            last_updated: event.timestamp,
          });
        }
        break;
      }
    }
  }

  const pseudoCount = DEFAULT_PSEUDO_COUNT;
  const collectionScore = DEFAULT_COLLECTION_SCORE;
  const blendedScore = personalScore !== null
    ? computeBlendedScore(personalScore, collectionScore, sampleCount, pseudoCount)
    : collectionScore;

  return {
    personality_id: '',
    collection_id: '',
    pool_id: '',
    state: sampleCount === 0 ? 'cold' as const : 'warming' as const,
    personal_score: personalScore,
    collection_score: collectionScore,
    blended_score: blendedScore,
    sample_count: sampleCount,
    pseudo_count: pseudoCount,
    contributor_count: 0,
    min_sample_count: 10,
    created_at: events.length > 0 ? events[0].timestamp : new Date().toISOString(),
    last_updated: events.length > 0 ? events[events.length - 1].timestamp : new Date().toISOString(),
    transition_history: [],
    contract_version: '8.2.0',
    task_cohorts: Array.from(taskCohortMap.values()),
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

// Re-export Sprint 10 types + v7.11.0 + v8.2.0 additions
export type {
  TaskTypeCohort,
  ReputationEvent,
  QualitySignalEvent,
  TaskCompletedEvent,
  CredentialUpdateEvent,
  ModelPerformanceEvent,
  QualityObservation,
  DixieReputationAggregate,
  ScoringPath,
  ScoringPathLog,
} from '../types/reputation-evolution.js';
export { TASK_TYPES, validateTaskCohortUniqueness } from '../types/reputation-evolution.js';
export { QualityObservationSchema, ModelPerformanceEventSchema } from '../types/reputation-evolution.js';
export type { TaskType } from '../types/reputation-evolution.js';

// Re-export governance mutation types for consumer convenience
export type { MutationLogPersistence } from './governance-mutation.js';
export { MutationLog, createMutation, resolveActorId } from './governance-mutation.js';
export type { ActorType } from './governance-mutation.js';
