/**
 * Reputation Service — Orchestration layer for Hounfour governance types.
 *
 * Wraps Hounfour governance functions with typed Dixie service methods.
 * Provides a typed API surface for the reputation aggregate lifecycle
 * (quality events, state transitions, cross-model scoring).
 *
 * BB-DEEP-03 extraction (cycle-014 Sprint 105):
 * - Pure scoring computation → reputation-scoring-engine.ts
 * - Event sourcing operations → reputation-event-store.ts
 * - This file: lifecycle orchestration, CRUD, GovernedResource interface
 *
 * See: Hounfour governance sub-package, SDD §2.3 (ReputationAggregate FR-3)
 * @since Sprint 3 — Reputation Service Foundation
 * @since Sprint 6 — ReputationStore persistence layer
 * @since Sprint 10 — Reputation Evolution (per-model per-task cohorts)
 * @since cycle-007 — Sprint 73, Task S1-T4 (v8.2.0 model_performance variant)
 * @since cycle-014 — Sprint 105, BB-DEEP-03 (scoring engine + event store extraction)
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
import type { AuditTrail } from '@0xhoneyjar/loa-hounfour/commons';
import type { GovernanceMutation } from '@0xhoneyjar/loa-hounfour/commons';
import type { GovernedResource, TransitionResult, InvariantResult } from './governed-resource.js';
import type {
  TaskTypeCohort,
  ReputationEvent,
  DixieReputationAggregate,
} from '../types/reputation-evolution.js';
import { MutationLog, createMutation } from './governance-mutation.js';
import { startSanitizedSpan, addSanitizedAttributes } from '../utils/span-sanitizer.js';

/**
 * @deprecated Import directly from `reputation-scoring-engine.ts` instead.
 * These re-exports exist for backward compatibility only and will be
 * removed in cycle-016. See BB-DEEP-03 T6 for extraction rationale.
 * @since cycle-014 Sprint 105 (extraction), Sprint 106 T5 (deprecation notice)
 */
export {
  computeDampenedScore,
  computeDualTrackScore,
  computeDimensionalBlended,
  computeTaskAwareCrossModelScore,
  CollectionScoreAggregator,
  FEEDBACK_DAMPENING_ALPHA_MIN,
  FEEDBACK_DAMPENING_ALPHA_MAX,
  DAMPENING_RAMP_SAMPLES,
  DEFAULT_PSEUDO_COUNT,
  DEFAULT_COLLECTION_SCORE,
  TASK_MATCH_WEIGHT_MULTIPLIER,
  DIXIE_DAMPENING_DEFAULTS,
} from './reputation-scoring-engine.js';
/** @deprecated Import directly from `reputation-scoring-engine.ts`. Removal: cycle-016. */
export type { ReliabilityResult, BlendedScoreInput, FeedbackDampeningConfig, DualTrackScoreResult } from './reputation-scoring-engine.js';

/**
 * @deprecated Import directly from `reputation-event-store.ts` instead.
 * These re-exports exist for backward compatibility only and will be
 * removed in cycle-016. See BB-DEEP-03 T6 for extraction rationale.
 */
export {
  reconstructAggregateFromEvents,
  seedCollectionAggregator,
} from './reputation-event-store.js';

// Import for internal use
import {
  computeDampenedScore,
  computeDimensionalBlended,
  CollectionScoreAggregator,
  FEEDBACK_DAMPENING_ALPHA_MIN,
  FEEDBACK_DAMPENING_ALPHA_MAX,
} from './reputation-scoring-engine.js';
import type { BlendedScoreInput, ReliabilityResult } from './reputation-scoring-engine.js';

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
    const eventLogSnapshot = new Map(
      [...this.eventLog.entries()].map(([k, v]) => [k, [...v]]),
    );
    try {
      return await fn(this);
    } catch (err) {
      // Restore state on failure — the "rollback"
      // BB-008-001: Event log must be transactionally consistent with aggregates.
      // Without this, reconstructAggregateFromEvents() replays events whose
      // aggregate effects were rolled back, creating divergence.
      this.store.clear();
      for (const [k, v] of snapshot) this.store.set(k, v);
      this.taskCohorts.clear();
      for (const [k, v] of cohortSnapshot) this.taskCohorts.set(k, v);
      this.eventLog.clear();
      for (const [k, v] of eventLogSnapshot) this.eventLog.set(k, v);
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
/** Invariant IDs verifiable on the reputation resource. */
export type ReputationInvariant = 'INV-006' | 'INV-007';

export class ReputationService
  implements GovernedResource<ReputationAggregate | undefined, ReputationEvent, ReputationInvariant>
{
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

  // ---------------------------------------------------------------------------
  // GovernedResource<T> implementation (FR-11)
  // ---------------------------------------------------------------------------

  readonly resourceId = 'reputation-service';
  readonly resourceType = 'reputation';

  /** Most recently accessed aggregate (GovernedResource semantics). */
  private _lastAccessedAggregate?: ReputationAggregate;

  get current(): ReputationAggregate | undefined {
    return this._lastAccessedAggregate;
  }

  get version(): number {
    return this._mutationLog.version;
  }

  async transition(
    event: ReputationEvent,
    actorId: string,
  ): Promise<TransitionResult<ReputationAggregate | undefined>> {
    try {
      this.recordMutation(actorId);
      const agentId = (event as { agent_id?: string }).agent_id;
      if (agentId) {
        await this.processEvent(agentId, event);
        const updated = await this.store.get(agentId);
        this._lastAccessedAggregate = updated;
        return { success: true, state: updated, version: this.version };
      }
      return { success: false, reason: 'Event missing agent_id', code: 'MISSING_AGENT_ID' };
    } catch (err) {
      return {
        success: false,
        reason: err instanceof Error ? err.message : String(err),
        code: 'TRANSITION_FAILED',
      };
    }
  }

  verify(invariantId: ReputationInvariant): InvariantResult {
    const now = new Date().toISOString();
    switch (invariantId) {
      case 'INV-006':
        return {
          invariant_id: 'INV-006',
          satisfied: FEEDBACK_DAMPENING_ALPHA_MIN <= FEEDBACK_DAMPENING_ALPHA_MAX
            && FEEDBACK_DAMPENING_ALPHA_MAX <= 1.0,
          detail: `EMA bounds: α ∈ [${FEEDBACK_DAMPENING_ALPHA_MIN}, ${FEEDBACK_DAMPENING_ALPHA_MAX}]`,
          checked_at: now,
        };
      case 'INV-007':
        return {
          invariant_id: 'INV-007',
          satisfied: typeof this._mutationLog.sessionId === 'string'
            && this._mutationLog.sessionId.length > 0,
          detail: `Session ID: ${this._mutationLog.sessionId}`,
          checked_at: now,
        };
    }
  }

  verifyAll(): InvariantResult[] {
    return (['INV-006', 'INV-007'] as const).map(id => this.verify(id));
  }

  get auditTrail(): Readonly<AuditTrail> {
    return { entries: [], hash_algorithm: 'sha256', genesis_hash: '', integrity_status: 'verified' };
  }

  get mutationLog(): ReadonlyArray<GovernanceMutation> {
    return this._mutationLog.history;
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
    const spanAttrs: Record<string, unknown> = {
      model_id: 'type' in event && event.type === 'model_performance'
        ? (event as { model_id?: string }).model_id ?? 'unknown'
        : 'n/a',
      score: 0,
      ema_value: 0,
    };

    await startSanitizedSpan('dixie.reputation.update', spanAttrs, async (span) => {
      // BB-008-001: Wrap entire event processing in a single transaction so
      // event log and aggregate/cohort state are atomically consistent. If any
      // handler fails, both the event append and state changes are rolled back.
      // This ensures reconstructAggregateFromEvents() stays in sync with
      // materialized aggregates.
      await this.store.transact(async (tx) => {
        // Append event to log inside the transaction
        await tx.appendEvent(nftId, event);

        // Dispatch by variant type (exhaustive)
        switch (event.type) {
          case 'quality_signal':
            await this._handleQualitySignalInTx(tx, nftId, event);
            break;
          case 'task_completed':
            await this._handleTaskCompletedInTx(tx, nftId, event);
            break;
          case 'credential_update':
            // No-op: credentials affect access policy, not scores
            break;
          case 'model_performance':
            await this._handleModelPerformanceInTx(tx, nftId, event);
            break;
          default:
            // TypeScript exhaustiveness check — should never reach here
            assertNever(event);
        }
      });

      // Record actual computed scores after transaction completes.
      // (Bridgebuilder Finding BB-PR50-F6: span no longer shows placeholder score: 0)
      const aggregate = await this.store.get(nftId);
      if (aggregate) {
        addSanitizedAttributes(span, 'dixie.reputation.update', {
          score: aggregate.personal_score,
          ema_value: aggregate.blended_score,
        });
      }
    });
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

    // FR-6: Update population statistics AFTER blending — the current
    // observation must not influence its own Bayesian prior (BB-008-010).
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
   * In-transaction quality_signal handler. Operates on the provided store
   * (which is the transact() context from processEvent).
   * @since cycle-008 — BB-008-001 (event log transactional consistency)
   */
  private async _handleQualitySignalInTx(
    tx: ReputationStore,
    nftId: string,
    event: Extract<ReputationEvent, { type: 'quality_signal' }>,
  ): Promise<void> {
    const aggregate = await tx.get(nftId);
    if (!aggregate) return;

    const dampenedScore = computeDampenedScore(
      aggregate.personal_score,
      event.score,
      aggregate.sample_count,
    );
    const updated = this.buildUpdatedAggregate(aggregate, dampenedScore, event.timestamp);
    await tx.put(nftId, updated);
  }

  /**
   * In-transaction task_completed handler.
   * @since cycle-008 — BB-008-001 (event log transactional consistency)
   */
  private async _handleTaskCompletedInTx(
    tx: ReputationStore,
    nftId: string,
    event: Extract<ReputationEvent, { type: 'task_completed' }>,
  ): Promise<void> {
    const aggregate = await tx.get(nftId);
    if (!aggregate) return;

    const cohort = await tx.getTaskCohort(nftId, 'default', event.task_type);
    if (cohort) {
      await tx.putTaskCohort(nftId, {
        ...cohort,
        sample_count: cohort.sample_count + 1,
        last_updated: event.timestamp,
      });
    }
  }

  /**
   * In-transaction model_performance handler. Decomposes into quality
   * signal pipeline. Threads dimensions through computeDimensionalBlended()
   * when present. Applies dampening to task cohort scores (BB-008-009).
   *
   * @since cycle-007 — Sprint 73, Task S1-T4
   * @since cycle-008 — Sprint 82, Task 2.3 (FR-4: transactional wrapper)
   * @since cycle-008 — Sprint 83, Task 3.5 (FR-7: dimensional blending)
   * @since cycle-008 — BB-008-001 (event log transactional consistency)
   * @since cycle-008 — BB-008-009 (cohort dampening consistency)
   */
  private async _handleModelPerformanceInTx(
    tx: ReputationStore,
    nftId: string,
    event: Extract<ReputationEvent, { type: 'model_performance' }>,
  ): Promise<void> {
    const aggregate = await tx.get(nftId);
    if (!aggregate) return;

    const rawScore = event.quality_observation.score;
    const dampenedScore = computeDampenedScore(
      aggregate.personal_score,
      rawScore,
      aggregate.sample_count,
    );

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

    await tx.put(nftId, updatedWithDimensions);

    // Update task-specific cohort with dampened score (BB-008-009)
    const existingCohort = await tx.getTaskCohort(nftId, event.model_id, event.task_type);
    if (existingCohort) {
      const cohortDampened = computeDampenedScore(
        existingCohort.personal_score,
        rawScore,
        existingCohort.sample_count,
      );
      await tx.putTaskCohort(nftId, {
        ...existingCohort,
        personal_score: cohortDampened,
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
  }
}

/**
 * Exhaustiveness check helper for discriminated unions.
 * TypeScript will error at compile time if a variant is not handled.
 */
function assertNever(x: never): never {
  throw new Error(`Unexpected event type: ${(x as { type: string }).type}`);
}

// Dimensional blending and task-aware scoring extracted to reputation-scoring-engine.ts (BB-DEEP-03)

// Event replay and seeding extracted to reputation-event-store.ts (BB-DEEP-03)

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
