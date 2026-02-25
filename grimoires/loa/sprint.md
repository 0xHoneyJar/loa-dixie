# Sprint Plan: Governance Isomorphism — Unified GovernedResource<T> Platform

**Version**: 8.0.0
**Date**: 2026-02-25
**Cycle**: cycle-008
**PRD**: `grimoires/loa/prd.md` v8.0.0
**SDD**: `grimoires/loa/sdd.md` v8.0.0
**Status**: Ready

---

## Overview

| Metric | Value |
|--------|-------|
| **Sprints** | 6 |
| **Total Tasks** | 35 |
| **FRs Covered** | 14 (all) |
| **Tiers** | 5 (Consistency → Integrity → Self-Calibration → Platform → Intelligence) |
| **Estimated New Tests** | ≥55 |
| **Target Test Total** | ≥1346 (1291 existing + ≥55 new) |
| **Branch** | `feature/cycle-008-governance-isomorphism` |
| **Base** | `main` (after PR #15 merge) |

### Team

| Role | Assignment |
|------|-----------|
| Architect | Claude (autonomous) |
| Implementer | Claude (autonomous) |
| Reviewer | Bridgebuilder (post-sprint) |
| Auditor | Claude (per-sprint audit) |

### Dependency Graph

```
Sprint 1 (Consistency) ──→ Sprint 2 (Integrity)
         │                          │
         ├──→ Sprint 3 (Self-Calibration)
         │                          │
         └──→ Sprint 4 (Adaptive Routing)
                                    │
Sprint 2 + 3 + 4 ──→ Sprint 5 (GovernedResource Platform)
                                    │
         All ──→ Sprint 6 (Integration & Hardening)
```

### Prioritization Rationale

**Tiers 1–2 (Sprints 1–2)** are MVP — they fix the 6 Bridgebuilder gaps with small, targeted changes. Each task is independent within its sprint. If cycle-008 were cut short, these alone would resolve all known architectural debts.

**Tier 3 (Sprints 3–4)** transforms from self-observing to self-calibrating. These build on the consistent blended score (FR-1) and clear API (FR-3) from Sprint 1.

**Tier 4 (Sprint 5)** establishes the GovernedResource<T> platform. This depends on all foundations being in place — the protocol abstraction captures what Sprints 1–4 build.

**Tier 5 (Sprint 6)** is the capstone — integration tests proving the complete autopoietic loop and the INV-008 declaration.

---

## Sprint 1: Consistency Foundations

**Global ID**: sprint-81
**FRs**: FR-1, FR-2, FR-3
**Goal**: Fix the three consistency gaps where the code already knows what it wants to be. Every event path produces consistent state. The checkpoint fires. The API is legible.
**Dependencies**: None
**Estimated Tasks**: 7

### Task 1.1: Extract buildUpdatedAggregate() shared helper

**File**: `app/src/services/reputation-service.ts`
**FR**: FR-1

**Description**: Extract the common pattern from `handleModelPerformance()` — `computeDampenedScore()` → `computeBlendedScore()` → construct updated aggregate — into a shared `buildUpdatedAggregate()` helper. This helper will be called by both `handleQualitySignal()` and `handleModelPerformance()`, ensuring every event path produces a fully consistent aggregate with fresh blended_score.

**Acceptance Criteria**:
- [ ] `buildUpdatedAggregate(existing, newPersonalScore, collectionScore, pseudoCount)` helper function extracted
- [ ] Helper computes blended_score via `computeBlendedScore()` (same formula as handleModelPerformance)
- [ ] `handleModelPerformance()` refactored to use the shared helper
- [ ] No behavioral change to `handleModelPerformance()` (existing tests pass)
- [ ] Helper is a private method on ReputationService (not exported)

**Testing**:
- [ ] Existing `handleModelPerformance()` tests pass unchanged

**Effort**: Small (refactor, no new behavior)

---

### Task 1.2: Fix blended score staleness in handleQualitySignal()

**File**: `app/src/services/reputation-service.ts`
**FR**: FR-1

**Description**: Update `handleQualitySignal()` to use the shared `buildUpdatedAggregate()` helper, ensuring `blended_score` is recomputed after every quality signal event. Currently, `handleQualitySignal()` (lines 550-569) updates `personal_score` and increments `sample_count` but leaves `blended_score` stale.

**Acceptance Criteria**:
- [ ] `handleQualitySignal()` calls `buildUpdatedAggregate()` after computing new personal score
- [ ] `blended_score` is always fresh after quality signal processing
- [ ] Test: 10 quality signals in sequence → blended_score reflects ALL 10 observations
- [ ] Test: interleave quality signals and model performance events → blended_score always consistent
- [ ] Test: single quality signal changes both personal_score AND blended_score

**Testing**:
- [ ] 3 new tests for blended score consistency after quality signals
- [ ] All existing quality signal tests pass unchanged

**Effort**: Small (use existing helper from Task 1.1)
**Depends on**: Task 1.1

---

### Task 1.3: Implement auto-checkpoint in record()

**File**: `app/src/services/scoring-path-tracker.ts`
**FR**: FR-2

**Description**: Add auto-checkpoint triggering to `record()`. When `this.length % this._options.checkpointInterval === 0` after appending an entry, call `this.checkpoint()`. The checkpoint must come AFTER the audit trail append so the checkpoint covers the current entry.

**Acceptance Criteria**:
- [ ] `record()` auto-triggers `checkpoint()` when `length % checkpointInterval === 0`
- [ ] Check happens AFTER the entry is added and after `appendToAuditTrail()`
- [ ] Default interval of 100 entries preserved
- [ ] `checkpointInterval: 0` disables auto-checkpointing
- [ ] Test: record 100 entries → checkpoint exists after entry 100
- [ ] Test: record 250 entries → 2 checkpoints exist (at 100 and 200)
- [ ] Test: `checkpointInterval: 0` → no auto-checkpoint even after 200 entries

**Testing**:
- [ ] 3 new tests for auto-checkpoint behavior
- [ ] All existing scoring path tests pass unchanged

**Effort**: Small (3 lines of code + tests)

---

### Task 1.4: Create evaluateEconomicBoundaryCanonical() with clear signature

**File**: `app/src/services/conviction-boundary.ts`
**FR**: FR-3

**Description**: Create a new `evaluateEconomicBoundaryCanonical()` function with a clear, non-overloaded signature. This is the canonical API that accepts `EconomicBoundaryOptions` directly. Named `Canonical` to avoid collision with the `evaluateEconomicBoundary` import from `@0xhoneyjar/loa-hounfour` at line 20.

**Acceptance Criteria**:
- [ ] `evaluateEconomicBoundaryCanonical(wallet, tier, budgetRemainingMicroUsd, options: EconomicBoundaryOptions)` function created
- [ ] No union type or runtime type discrimination in the parameter list
- [ ] Contains the core boundary evaluation logic (extracted from existing function)
- [ ] Test: canonical function produces correct results for all tier levels
- [ ] Test: canonical function with exploration options works correctly

**Testing**:
- [ ] 3 new tests for canonical boundary evaluation
- [ ] Covers all tier levels and option combinations

**Effort**: Medium (extract + restructure logic)

---

### Task 1.5: Create evaluateEconomicBoundaryLegacy() adapter

**File**: `app/src/services/conviction-boundary.ts`
**FR**: FR-3

**Description**: Create `evaluateEconomicBoundaryLegacy()` that adapts the old `QualificationCriteria` parameter format to `EconomicBoundaryOptions` and delegates to the canonical function. The existing `evaluateEconomicBoundaryForWallet()` becomes a thin deprecated wrapper that calls the legacy adapter.

**Acceptance Criteria**:
- [ ] `evaluateEconomicBoundaryLegacy(wallet, tier, budgetRemainingMicroUsd, criteria?, budgetPeriodDays?)` function created
- [ ] Legacy function maps `QualificationCriteria` to `EconomicBoundaryOptions` internally
- [ ] `evaluateEconomicBoundaryForWallet()` marked `@deprecated`, delegates to canonical
- [ ] All existing callers work unchanged (backward compatible)
- [ ] Test: legacy function produces identical results to previous implementation

**Testing**:
- [ ] 2 new tests verifying legacy adapter equivalence
- [ ] All existing boundary evaluation tests pass unchanged

**Effort**: Small (adapter pattern)
**Depends on**: Task 1.4

---

### Task 1.6: Update exports and re-export barrel

**File**: `app/src/services/conviction-boundary.ts`, type files
**FR**: FR-3

**Description**: Update the module exports to include the new canonical and legacy functions. Ensure all existing imports continue to work. Add deprecation JSDoc to the old function.

**Acceptance Criteria**:
- [ ] `evaluateEconomicBoundaryCanonical` exported
- [ ] `evaluateEconomicBoundaryLegacy` exported
- [ ] `evaluateEconomicBoundaryForWallet` still exported (deprecated)
- [ ] No breaking changes to existing imports

**Testing**:
- [ ] All existing import-dependent tests pass

**Effort**: Trivial

---

### Task 1.7: Sprint 1 regression validation

**Description**: Run full test suite to validate zero regressions from Sprint 1 changes. Verify all 1291 existing tests pass plus new tests from Tasks 1.1–1.6.

**Acceptance Criteria**:
- [ ] All 1291 existing tests pass
- [ ] ≥8 new tests pass (from Tasks 1.2, 1.3, 1.4, 1.5)
- [ ] No TypeScript compilation errors
- [ ] No lint warnings in modified files

**Effort**: Validation only

---

## Sprint 2: Integrity Infrastructure

**Global ID**: sprint-82
**FRs**: FR-4, FR-5
**Goal**: Make institutional guarantees real — transaction safety and cross-chain tamper detection. Crash between store operations can't corrupt state. Two independent hash chains verify each other.
**Dependencies**: Sprint 1 (buildUpdatedAggregate helper from FR-1)
**Estimated Tasks**: 6

### Task 2.1: Add transact<T>() to ReputationStore interface

**File**: `app/src/services/reputation-service.ts`
**FR**: FR-4

**Description**: Add `transact<T>(fn: (store: ReputationStore) => Promise<T>): Promise<T>` to the `ReputationStore` interface. This is the minimal interface change that makes the store transaction-aware without forcing all callers to change.

**Acceptance Criteria**:
- [ ] `transact<T>()` method added to `ReputationStore` interface
- [ ] Method signature: `transact<T>(fn: (store: ReputationStore) => Promise<T>): Promise<T>`
- [ ] JSDoc documents: in-memory = snapshot/restore; PostgreSQL = BEGIN/COMMIT

**Testing**:
- [ ] Interface-only change, no runtime tests yet

**Effort**: Trivial (interface addition)

---

### Task 2.2: Implement transact<T>() in InMemoryReputationStore

**File**: `app/src/services/reputation-service.ts`
**FR**: FR-4

**Description**: Implement `transact<T>()` in `InMemoryReputationStore` using snapshot/restore semantics. Before calling `fn`, snapshot the current state of both the aggregates Map and task cohorts Map. If `fn` throws, restore from snapshots. If `fn` succeeds, keep the mutations.

**Acceptance Criteria**:
- [ ] `transact<T>()` takes snapshot of aggregates and task cohorts before calling fn
- [ ] On success: returns fn result, state reflects mutations
- [ ] On error: restores pre-transaction state, re-throws error
- [ ] Snapshot is a shallow clone of Maps (sufficient for single-writer in-memory)
- [ ] Test: successful transaction persists both aggregate and cohort updates
- [ ] Test: failed transaction rolls back aggregate state to pre-transaction
- [ ] Test: failed transaction rolls back cohort state to pre-transaction
- [ ] Test: error from fn is re-thrown to caller

**Testing**:
- [ ] 4 new tests for transaction semantics

**Effort**: Medium (snapshot/restore logic)
**Depends on**: Task 2.1

---

### Task 2.3: Wrap handleModelPerformance() in transact()

**File**: `app/src/services/reputation-service.ts`
**FR**: FR-4

**Description**: Update `handleModelPerformance()` to wrap its aggregate + cohort updates inside `this.store.transact()`. Also wrap `handleQualitySignal()` for consistency (even though it currently has a single put, wrapping it ensures future cohort additions are automatically atomic).

**Acceptance Criteria**:
- [ ] `handleModelPerformance()` wraps `store.put()` + `store.putTaskCohort()` in `transact()`
- [ ] `handleQualitySignal()` wraps its `store.put()` in `transact()`
- [ ] All existing model performance and quality signal tests pass unchanged
- [ ] Test: inject failure between put and putTaskCohort → state rolled back

**Testing**:
- [ ] 1 new test for transactional rollback in model performance path
- [ ] All existing tests pass

**Effort**: Small (wrap existing calls)
**Depends on**: Task 2.2

---

### Task 2.4: Implement verifyCrossChainConsistency()

**File**: `app/src/services/scoring-path-tracker.ts`
**FR**: FR-5

**Description**: Add `verifyCrossChainConsistency(): CrossChainVerificationResult` method that confirms the two independent hash chains (original scoring path chain and commons AuditTrail chain) agree. Verification checks: (1) entry count matches between chains, (2) tip hashes are consistent with their respective chains, (3) sample point hashes agree.

**Acceptance Criteria**:
- [ ] `CrossChainVerificationResult` type: `{ consistent: boolean; divergence_point?: number; detail: string }`
- [ ] `verifyCrossChainConsistency()` method added
- [ ] Checks entry count agreement between chains
- [ ] Checks tip hash consistency
- [ ] Returns `consistent: true` for normal operation
- [ ] Returns `consistent: false` with `divergence_point` when tampered
- [ ] Test: normal operation → consistent
- [ ] Test: tamper with audit trail entry → divergence detected
- [ ] Test: empty chains → consistent (vacuously true)

**Testing**:
- [ ] 3 new tests for cross-chain verification

**Effort**: Medium (two-chain comparison logic)

---

### Task 2.5: Add periodic cross-verification in record()

**File**: `app/src/services/scoring-path-tracker.ts`
**FR**: FR-5

**Description**: Add periodic cross-chain verification in `record()`. Every N entries (configurable via `crossVerifyInterval` in options, default: 10), call `verifyCrossChainConsistency()`. If divergence detected, trigger quarantine via existing `enterQuarantine()` mechanism.

**Acceptance Criteria**:
- [ ] `crossVerifyInterval` added to `ScoringPathTrackerOptions` (default: 10)
- [ ] `record()` calls `verifyCrossChainConsistency()` every `crossVerifyInterval` entries
- [ ] Divergence triggers `enterQuarantine()` with discontinuity info
- [ ] `crossVerifyInterval: 0` disables periodic verification
- [ ] Test: 15 normal entries → cross-verify at entry 10, passes
- [ ] Test: tampered chain → cross-verify triggers quarantine
- [ ] Test: interval 0 → no cross-verification

**Testing**:
- [ ] 3 new tests for periodic cross-verification
- [ ] All existing scoring path tests pass

**Effort**: Small (periodic check + quarantine trigger)
**Depends on**: Task 2.4

---

### Task 2.6: Sprint 2 regression validation

**Description**: Run full test suite to validate zero regressions from Sprint 2 changes.

**Acceptance Criteria**:
- [ ] All existing tests pass (including new Sprint 1 tests)
- [ ] ≥11 new tests from Sprint 2 (Tasks 2.2, 2.3, 2.4, 2.5)
- [ ] No TypeScript compilation errors
- [ ] No lint warnings in modified files

**Effort**: Validation only

---

## Sprint 3: Self-Calibration Core

**Global ID**: sprint-83
**FRs**: FR-6, FR-7
**Goal**: Transform from empirical ignorance to empirical wisdom. New agents start at population mean, not zero. Quality is multi-dimensional — "good at review" ≠ "good at reasoning" becomes expressible.
**Dependencies**: Sprint 1 (FR-1 buildUpdatedAggregate helper, consistent blending)
**Estimated Tasks**: 6

### Task 3.1: Implement CollectionScoreAggregator

**File**: `app/src/services/reputation-service.ts`
**FR**: FR-6

**Description**: Implement `CollectionScoreAggregator` using Welford's online algorithm for numerically stable running mean and variance computation. The aggregator tracks the empirical collection score — the population mean of all personal scores across all agents.

**Acceptance Criteria**:
- [ ] `CollectionScoreAggregator` class with `update(personalScore)`, `mean`, `populationSize`, `variance` properties
- [ ] Uses Welford's online algorithm (numerically stable for large populations)
- [ ] `mean` returns 0 when `count === 0` (fallback to DEFAULT_COLLECTION_SCORE)
- [ ] `variance` available for future adaptive pseudo_count
- [ ] Serializable to `{ count, mean, m2 }` for persistence
- [ ] Test: empty aggregator returns mean=0, count=0
- [ ] Test: 100 observations with mean 0.7 → aggregator mean ≈ 0.7
- [ ] Test: extreme observation with large population barely moves mean
- [ ] Test: Welford's produces same result as naive algorithm for small N

**Testing**:
- [ ] 4 new tests for CollectionScoreAggregator

**Effort**: Medium (Welford's algorithm implementation)

---

### Task 3.2: Wire CollectionScoreAggregator into ReputationService

**File**: `app/src/services/reputation-service.ts`
**FR**: FR-6

**Description**: Integrate `CollectionScoreAggregator` into `ReputationService`. Both `handleQualitySignal()` and `handleModelPerformance()` update the aggregator when personal scores change. `buildUpdatedAggregate()` uses `aggregator.mean` as the collection_score instead of `DEFAULT_COLLECTION_SCORE`.

**Acceptance Criteria**:
- [ ] `ReputationService` holds a `CollectionScoreAggregator` instance
- [ ] `handleQualitySignal()` calls `aggregator.update()` after computing new personal score
- [ ] `handleModelPerformance()` calls `aggregator.update()` after computing new personal score
- [ ] `buildUpdatedAggregate()` uses `aggregator.mean` for collection_score
- [ ] When `aggregator.count === 0`, falls back to `DEFAULT_COLLECTION_SCORE` (0)
- [ ] Test: after 100 observations with mean 0.7, new agent blended_score starts near 0.7
- [ ] Test: empty population → new agent still starts at 0 (backward compatible)
- [ ] `ReputationStore` extended with optional `getCollectionMetrics()` / `putCollectionMetrics()` for persistence

**Testing**:
- [ ] 3 new tests for integrated collection score behavior
- [ ] All existing tests pass (when population is empty, behavior identical to before)

**Effort**: Small (wiring into existing event paths)
**Depends on**: Task 3.1, Task 1.1 (buildUpdatedAggregate)

---

### Task 3.3: Define DimensionalBlendInput/Output types

**File**: `app/src/types/reputation-evolution.ts`
**FR**: FR-7

**Description**: Define the types for multi-dimensional quality blending. Each dimension gets its own blended score computed independently.

**Acceptance Criteria**:
- [ ] `DimensionalBlendInput` type: `{ overall: BlendInput; dimensions: Record<string, BlendInput> }`
- [ ] `DimensionalBlendOutput` type: `{ overall: number; dimensions: Record<string, number> }`
- [ ] `BlendInput` type: `{ personalScore: number; collectionScore: number; sampleCount: number; pseudoCount: number }`
- [ ] Types exported from reputation-evolution barrel
- [ ] `DixieReputationAggregate` extended with `dimension_scores?: Record<string, number>`

**Testing**:
- [ ] Type-only change; compilation validates

**Effort**: Small (type definitions)

---

### Task 3.4: Implement computeDimensionalBlended()

**File**: `app/src/services/reputation-service.ts`
**FR**: FR-7

**Description**: Implement `computeDimensionalBlended()` that blends each quality dimension independently using the same EMA dampening as the overall score. Dimensions are optional — when no dimensions are provided, only the overall score is computed (backward compatible).

**Acceptance Criteria**:
- [ ] `computeDimensionalBlended(input: DimensionalBlendInput): DimensionalBlendOutput` function
- [ ] Each dimension blended independently with its own EMA dampening pipeline
- [ ] Overall score computed from dimensions if present (configurable weights, default: equal)
- [ ] Missing dimensions fall back to overall score
- [ ] Test: model with accuracy=0.9, coherence=0.3 → dimensions blended independently
- [ ] Test: no dimensions provided → overall-only result (backward compatible)
- [ ] Test: equal weight default produces correct aggregation

**Testing**:
- [ ] 3 new tests for dimensional blending

**Effort**: Medium (per-dimension EMA computation)

---

### Task 3.5: Thread dimensions through handleModelPerformance()

**File**: `app/src/services/reputation-service.ts`
**FR**: FR-7

**Description**: Update `handleModelPerformance()` to extract `quality_observation.dimensions` from the event and pass them through the dimensional blending pipeline. Store resulting dimension_scores in the aggregate.

**Acceptance Criteria**:
- [ ] `handleModelPerformance()` extracts `dimensions` from `quality_observation`
- [ ] Dimensions passed to `computeDimensionalBlended()` when present
- [ ] `dimension_scores` stored in `DixieReputationAggregate`
- [ ] Events without dimensions work identically to before (backward compatible)
- [ ] Test: event with dimensions → aggregate has dimension_scores
- [ ] Test: event without dimensions → aggregate has no dimension_scores (unchanged)

**Testing**:
- [ ] 2 new tests for dimension threading
- [ ] All existing model performance tests pass unchanged

**Effort**: Small (wire existing computation)
**Depends on**: Tasks 3.3, 3.4

---

### Task 3.6: Sprint 3 regression validation

**Description**: Run full test suite to validate zero regressions from Sprint 3 changes.

**Acceptance Criteria**:
- [ ] All existing tests pass (including Sprint 1 and 2 tests)
- [ ] ≥12 new tests from Sprint 3
- [ ] No TypeScript compilation errors
- [ ] Collection score behavior verified: empty population = backward compatible

**Effort**: Validation only

---

## Sprint 4: Adaptive Routing

**Global ID**: sprint-84
**FRs**: FR-8, FR-9
**Goal**: Record routing decisions for feedback attribution. Add ε-greedy exploration to prevent the exploitation trap. The autopoietic loop gains routing intelligence.
**Dependencies**: Sprint 1 (FR-3 canonical API)
**Estimated Tasks**: 6

### Task 4.1: Define RoutingAttribution type

**File**: `app/src/services/scoring-path-tracker.ts` (or types file)
**FR**: FR-8

**Description**: Define the `RoutingAttribution` type that records routing context — which model was recommended, which was actually routed, the pool, the reason, and whether this was an exploration decision.

**Acceptance Criteria**:
- [ ] `RoutingAttribution` type defined with fields: `recommended_model?`, `routed_model`, `pool_id?`, `routing_reason?`, `exploration?`
- [ ] Type exported for use by conviction-boundary and scoring-path-tracker
- [ ] `RecordOptions` extended with `routing?: RoutingAttribution`

**Testing**:
- [ ] Type-only change; compilation validates

**Effort**: Small (type definition)

---

### Task 4.2: Record routing attribution in scoring path

**File**: `app/src/services/scoring-path-tracker.ts`
**FR**: FR-8

**Description**: Update `record()` to include routing attribution in scoring path entries and the audit trail. The routing data should be included as structured metadata in the log entry and propagated to the commons audit trail.

**Acceptance Criteria**:
- [ ] `record()` accepts `routing` in options and includes it in the log entry
- [ ] Routing attribution appears in `ScoringPathLogEntry` as `routing_attribution`
- [ ] Routing data included in audit trail entry metadata
- [ ] `logScoringPath()` formats routing attribution in structured output
- [ ] Hash chain includes routing data (tamper-evident routing decisions)
- [ ] Test: routing attribution appears in scoring path log
- [ ] Test: routing divergence (recommended ≠ routed) recorded with reason
- [ ] Test: entry without routing attribution works unchanged

**Testing**:
- [ ] 3 new tests for routing attribution recording

**Effort**: Medium (extend record + hash + log)
**Depends on**: Task 4.1

---

### Task 4.3: Define ExplorationConfig type

**File**: `app/src/services/conviction-boundary.ts`
**FR**: FR-9

**Description**: Define `ExplorationConfig` with epsilon (probability of exploring), warmup (minimum observations before exploration), and optional seed (for deterministic testing via seeded PRNG). Extend `EconomicBoundaryOptions` with `exploration?: ExplorationConfig`.

**Acceptance Criteria**:
- [ ] `ExplorationConfig` type: `{ epsilon: number; warmup: number; seed?: string }`
- [ ] `EconomicBoundaryOptions` extended with `exploration?: ExplorationConfig`
- [ ] Type exported

**Testing**:
- [ ] Type-only change; compilation validates

**Effort**: Trivial

---

### Task 4.4: Implement seeded PRNG (Mulberry32)

**File**: `app/src/services/conviction-boundary.ts`
**FR**: FR-9

**Description**: Implement Mulberry32 seeded PRNG for deterministic exploration decisions in tests. When `seed` is provided, use seeded PRNG. When no seed, use `Math.random()`. The PRNG must be lightweight (< 0.01ms per call).

**Acceptance Criteria**:
- [ ] `mulberry32(seed: number): () => number` function (returns 0-1 float generator)
- [ ] `seedFromString(s: string): number` function (deterministic string-to-seed)
- [ ] Test: seeded PRNG produces deterministic sequence
- [ ] Test: same seed always produces same sequence

**Testing**:
- [ ] 2 new tests for PRNG determinism

**Effort**: Small (well-known algorithm)

---

### Task 4.5: Implement ε-greedy exploration in evaluateEconomicBoundaryCanonical()

**File**: `app/src/services/conviction-boundary.ts`
**FR**: FR-9

**Description**: Add ε-greedy exploration to the canonical boundary evaluation. With probability ε (after warmup), select a non-optimal model from the cohort. Record `exploration: true` in the result and provide routing attribution for the scoring path.

**Acceptance Criteria**:
- [ ] When `exploration.epsilon > 0` and sample_count >= warmup: with probability ε, select non-optimal
- [ ] Exploration records `exploration: true` in the evaluation result
- [ ] Warmup period: no exploration until minimum observations met
- [ ] `epsilon: 0.0` → never explores (existing behavior, backward compatible)
- [ ] `epsilon: 1.0` → always explores (for testing)
- [ ] Deterministic with seed (seeded PRNG from Task 4.4)
- [ ] Test: `epsilon: 1.0` → always explores
- [ ] Test: `epsilon: 0.0` → never explores
- [ ] Test: warmup not met → no exploration regardless of epsilon
- [ ] Test: `epsilon: 0.1` over 1000 seeded evaluations → ~10% exploration (statistical)

**Testing**:
- [ ] 4 new tests for exploration behavior

**Effort**: Medium (exploration logic + PRNG integration)
**Depends on**: Tasks 4.3, 4.4, 1.4 (canonical API)

---

### Task 4.6: Sprint 4 regression validation

**Description**: Run full test suite to validate zero regressions from Sprint 4 changes.

**Acceptance Criteria**:
- [ ] All existing tests pass (including Sprints 1–3 tests)
- [ ] ≥9 new tests from Sprint 4
- [ ] No TypeScript compilation errors
- [ ] Exploration mechanism verified with deterministic seeds

**Effort**: Validation only

---

## Sprint 5: GovernedResource<T> Platform

**Global ID**: sprint-85
**FRs**: FR-10, FR-11, FR-12, FR-13
**Goal**: Name the isomorphism. Create the unified `GovernedResource<T>` protocol abstraction. Reputation and ScoringPath become implementations. The GovernorRegistry manages them uniformly. This is the CRD moment.
**Dependencies**: Sprints 1–4 (all foundations must be in place)
**Estimated Tasks**: 6

### Task 5.1: Define GovernedResource<T> protocol and GovernedResourceBase

**File**: `app/src/services/governed-resource.ts` (NEW)
**FR**: FR-10

**Description**: Create the unified governance abstraction — `GovernedResource<TState, TEvent, TInvariant>` interface and `GovernedResourceBase` abstract class. This is the protocol-level abstraction that makes the governance isomorphism explicit across reputation, scoring paths, and future domains.

**Acceptance Criteria**:
- [ ] `GovernedResource<TState, TEvent, TInvariant>` interface defined per SDD §6.1
- [ ] `TransitionResult<TState>` discriminated union type (success | failure)
- [ ] `InvariantResult` type with invariant_id, satisfied, detail, checked_at
- [ ] `GovernedResourceBase` abstract class with `verifyAll()` default implementation
- [ ] Imports from `@0xhoneyjar/loa-hounfour/commons` for AuditTrail and GovernanceMutation
- [ ] Test: interface compiles and is importable
- [ ] Test: GovernedResourceBase subclass can be instantiated

**Testing**:
- [ ] 2 new tests for protocol abstraction

**Effort**: Medium (new file, interface design)

---

### Task 5.2: Implement GovernedResource on ReputationService

**File**: `app/src/services/reputation-service.ts`
**FR**: FR-11

**Description**: `ReputationService` implements `GovernedResource<ReputationAggregate | undefined, ReputationEvent, ReputationInvariant>`. The `transition()` method dispatches to existing handlers. `verify()` checks INV-006 (dampening bounded) and INV-007 (session scoped). All existing methods and behavior preserved.

**Acceptance Criteria**:
- [ ] `ReputationService` class declaration includes `implements GovernedResource<...>`
- [ ] `resourceId`, `resourceType`, `current`, `version` properties added
- [ ] `transition()` records mutation and delegates to `processEvent()`
- [ ] `verify('INV-006')` checks dampening bounds
- [ ] `verify('INV-007')` checks session scope
- [ ] `verifyAll()` returns results for both invariants
- [ ] `auditTrail` and `mutationLog` getters implemented
- [ ] All 1291+ existing tests pass unchanged
- [ ] Test: transition with quality_signal event → success with updated state
- [ ] Test: verifyAll returns 2 results (INV-006, INV-007), both satisfied

**Testing**:
- [ ] 3 new tests for GovernedResource implementation on ReputationService

**Effort**: Medium (interface implementation, delegation to existing code)

---

### Task 5.3: Implement GovernedResource on ScoringPathTracker

**File**: `app/src/services/scoring-path-tracker.ts`
**FR**: FR-12

**Description**: `ScoringPathTracker` implements `GovernedResource<ScoringPathState, ScoringPathEvent, ScoringPathInvariant>`. The `transition()` method maps event types to existing operations (record, checkpoint, quarantine). `verify()` includes chain integrity, cross-chain consistency (FR-5), and checkpoint coverage checks.

**Acceptance Criteria**:
- [ ] `ScoringPathTracker` class declaration includes `implements GovernedResource<...>`
- [ ] `ScoringPathState` type defined per SDD §6.3
- [ ] `ScoringPathEvent` and `ScoringPathInvariant` types defined
- [ ] `transition()` dispatches to record(), checkpoint(), enterQuarantine()
- [ ] `verify('chain_integrity')` delegates to verifyIntegrity()
- [ ] `verify('cross_chain_consistency')` delegates to verifyCrossChainConsistency() (FR-5)
- [ ] `verify('checkpoint_coverage')` checks checkpoint exists when expected
- [ ] All existing scoring path tests pass unchanged
- [ ] Test: transition with record event → success with updated state
- [ ] Test: verifyAll returns 3 invariant results

**Testing**:
- [ ] 2 new tests for GovernedResource implementation on ScoringPathTracker

**Effort**: Medium (interface implementation, delegation)
**Depends on**: Task 5.1, Task 2.4 (cross-chain verification)

---

### Task 5.4: Unify GovernorRegistry for GovernedResource<T>

**File**: `app/src/services/governor-registry.ts`
**FR**: FR-13

**Description**: Update `GovernorRegistry` to manage `GovernedResource<T>` instances alongside legacy `ResourceGovernor<T>`. Add `registerResource()`, `verifyAllResources()`, `getAuditSummary()`, and `getResource()` methods per SDD §6.4. Maintain backward compatibility with existing `register()` API.

**Acceptance Criteria**:
- [ ] `registerResource(resource: GovernedResource<...>)` method added
- [ ] `verifyAllResources()` returns `Map<string, InvariantResult[]>` across all resources
- [ ] `getAuditSummary()` aggregates version, entry count, mutation count per resource
- [ ] `getResource(type)` retrieves a registered GovernedResource
- [ ] Legacy `register()` still works (deprecated alias)
- [ ] Duplicate registration throws descriptive error
- [ ] Test: register reputation + scoring-path → verifyAllResources returns both
- [ ] Test: getAuditSummary returns entry for each registered resource
- [ ] Test: getResource returns correct resource by type

**Testing**:
- [ ] 3 new tests for unified GovernorRegistry

**Effort**: Small (additive methods on existing class)
**Depends on**: Tasks 5.1, 5.2, 5.3

---

### Task 5.5: Register resources at initialization

**File**: `app/src/services/reputation-service.ts` or initialization code
**FR**: FR-13

**Description**: At ReputationService construction, register both `ReputationService` and `ScoringPathTracker` as GovernedResource instances in the GovernorRegistry singleton.

**Acceptance Criteria**:
- [ ] ReputationService registers itself in GovernorRegistry on construction
- [ ] ScoringPathTracker registers itself in GovernorRegistry on construction
- [ ] `governorRegistry.verifyAllResources()` returns results for both resources
- [ ] Test: after construction, both resources are registered

**Testing**:
- [ ] 1 new test for auto-registration

**Effort**: Small

---

### Task 5.6: Sprint 5 regression validation

**Description**: Run full test suite to validate zero regressions from Sprint 5 changes.

**Acceptance Criteria**:
- [ ] All existing tests pass (including Sprints 1–4 tests)
- [ ] ≥11 new tests from Sprint 5
- [ ] New `governed-resource.ts` file has no lint warnings
- [ ] GovernedResource protocol is fully functional

**Effort**: Validation only

---

## Sprint 6: Integration & Hardening

**Global ID**: sprint-86
**FRs**: FR-14, INV-008
**Goal**: Prove the complete autopoietic loop is genuinely self-calibrating. Declare INV-008 in invariants.yaml. The constitution is written.
**Dependencies**: All previous sprints
**Estimated Tasks**: 4

### Task 6.1: Create autopoietic-loop-v2 integration test

**File**: `app/src/services/__tests__/autopoietic-loop-v2.test.ts` (NEW)
**FR**: FR-14

**Description**: End-to-end integration test that traces the complete self-calibrating loop: stake → evaluate → route → observe → score → re-evaluate. Verifies all FRs compose correctly: consistent blended score (FR-1), transaction safety (FR-4), empirical collection score (FR-6), dimensional blending (FR-7), routing attribution (FR-8), exploration budget (FR-9), and GovernedResource verification (FR-10–13).

**Acceptance Criteria**:
- [ ] `loop converges to observation mean over 100 iterations`: blended_score → 0.8 after 100 events with score 0.8
- [ ] `exploration discovers improved model`: model B discovered via ε-greedy and reputation tracks
- [ ] `dimensional scores diverge by task type`: accuracy ≈ 0.9, coherence ≈ 0.3 after dimensional events
- [ ] `cross-chain verification catches tampering`: tampered chain → quarantine triggered
- [ ] `transaction rollback prevents partial state`: injected failure → aggregate rolls back
- [ ] `GovernedResource.verifyAll() covers all resources`: INV-006, INV-007, chain_integrity, cross_chain_consistency, checkpoint_coverage all verified
- [ ] `collection score provides welcoming cold-start`: new agent starts at population mean, not 0

**Testing**:
- [ ] 7 new integration tests covering the complete loop

**Effort**: Large (comprehensive integration test suite)

---

### Task 6.2: Declare INV-008 in invariants.yaml

**File**: `app/src/invariants.yaml`
**FR**: INV-008

**Description**: Add INV-008 (governance isomorphism) to the invariants registry. This declares that all governed resources implement the `GovernedResource<T>` protocol with identity, transitions, invariants, and audit trail. Cross-references the implementations in reputation-service.ts and scoring-path-tracker.ts.

**Acceptance Criteria**:
- [ ] INV-008 added to invariants.yaml per SDD §8.3
- [ ] Category: structural
- [ ] Severity: important
- [ ] Properties list all GovernedResource interface requirements
- [ ] `verified_in` references governed-resource.ts, reputation-service.ts, scoring-path-tracker.ts
- [ ] YAML valid and lint-clean

**Testing**:
- [ ] YAML validation passes

**Effort**: Small (YAML addition)

---

### Task 6.3: Update NOTES.md with cycle-008 observations

**File**: `grimoires/loa/NOTES.md`

**Description**: Record architectural observations from cycle-008 implementation: the governance isomorphism pattern, the empirical collection score discovery, the cross-chain verification approach, and any insights that emerged during implementation.

**Acceptance Criteria**:
- [ ] Key observations from cycle-008 recorded
- [ ] Bridgebuilder gap resolutions documented
- [ ] GovernedResource<T> adoption notes for future cycles
- [ ] Any deferred items noted for cycle-009

**Effort**: Small

---

### Task 6.4: Sprint 6 final validation

**Description**: Complete regression and integration validation. Verify all success metrics from PRD §3 are met.

**Acceptance Criteria**:
- [ ] M-1: All 6 Bridgebuilder gaps resolved ✓
- [ ] M-2: Blended score consistent after every event type ✓
- [ ] M-3: Transaction safety with rollback ✓
- [ ] M-4: Cold-start at empirical population mean ✓
- [ ] M-5: Auto-checkpoint fires at interval boundary ✓
- [ ] M-6: Cross-chain verification detects divergence ✓
- [ ] M-7: No union type discrimination in boundary API ✓
- [ ] M-8: ≥2 resource types implement GovernedResource<T> ✓ (reputation + scoring-path)
- [ ] M-9: Multi-dimensional scores propagate through pipeline ✓
- [ ] M-10: Routing attribution in scoring path ✓
- [ ] M-11: ε-greedy exploration functional ✓
- [ ] M-12: All 1291 existing tests pass ✓
- [ ] M-13: ≥55 new tests (total ≥1346) ✓
- [ ] No TypeScript compilation errors
- [ ] No lint warnings in modified files

**Effort**: Validation only

---

## Risk Mitigation

| Risk | Sprint | Mitigation |
|------|--------|------------|
| Welford's precision at scale | 3 | Validated against naive algorithm in tests; used by PostgreSQL |
| Cross-chain false positives | 2 | Conservative interval (10); quarantine is recoverable |
| GovernedResource interface bloat | 5 | Base class provides defaults; interface stays minimal |
| Exploration quality dip | 4 | Warmup period (50 obs); small default ε (5%); scoring path records context |
| Transaction rollback losing writes | 2 | Snapshot/restore is deterministic; tested with injected failures |
| Collection score inflation loop | 3 | EMA dampening on individual scores bounds interaction; monitor mean |

## Buffer & Contingency

- **Sprint buffer**: Each sprint includes a regression validation task that also serves as buffer time for unexpected issues
- **Cut point**: If cycle must be shortened, Sprints 1–2 (Tiers 1–2) are independently valuable as MVP
- **Second cut point**: Sprints 1–4 (Tiers 1–3) deliver self-calibration without the platform abstraction
- **Full cycle**: All 6 sprints deliver the complete governance isomorphism platform

---

## Success Criteria Summary

| Sprint | Key Deliverable | New Tests |
|--------|----------------|-----------|
| 1 | Consistent blended score, auto-checkpoint, clear API | ≥8 |
| 2 | Transaction safety, cross-chain verification | ≥11 |
| 3 | Empirical collection score, dimensional blending | ≥12 |
| 4 | Routing attribution, ε-greedy exploration | ≥9 |
| 5 | GovernedResource<T> protocol, unified registry | ≥11 |
| 6 | Autopoietic loop integration, INV-008 | ≥7 |
| **Total** | **14 FRs, 8 invariants, self-calibrating loop** | **≥58** |

---

*"The code knows what it wants to be. The sprint plan makes that journey explicit."*

*Sprint Plan v8.0.0 — Governance Isomorphism, cycle-008*
