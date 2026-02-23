# Sprint 10 (Global 52) — Reputation Evolution: Per-Model Per-Task Cohorts

## Implementation Report

**Status**: COMPLETED
**Date**: 2026-02-24
**Cycle**: cycle-003 (Hounfour v7.9.2 Full Adoption)
**Tests**: 36 new tests, 948 total (0 regressions)

## Tasks Completed

### Task 10.1: Extend ModelCohort with task-type dimensionality
- **File**: `app/src/types/reputation-evolution.ts` (new)
- Created `TASK_TYPES` const array: `code_review`, `creative_writing`, `analysis`, `summarization`, `general`
- Created `TaskType` union type derived from const array
- Created `TaskTypeCohort` as intersection of `ModelCohort & { task_type: TaskType }`
- Created `DixieReputationAggregate` as intersection of `ReputationAggregate & { task_cohorts?: TaskTypeCohort[] }`
- Created `ReputationEvent` interface for event sourcing foundation
- Created `ScoringPathLog` interface for observability

### Task 10.2: Task-type keyed reputation storage
- **File**: `app/src/services/reputation-service.ts` (modified)
- Extended `ReputationStore` interface with `getTaskCohort()` and `putTaskCohort()`
- `InMemoryReputationStore` uses composite key: `${nftId}:${model_id}:${task_type}`
- Backward compatible: existing `get()`, `put()`, `listCold()`, `count()` unaffected
- `clear()` also clears task cohorts and event log

### Task 10.3: Enhanced cross-model scoring with task awareness
- **File**: `app/src/services/reputation-service.ts` (modified)
- Added `computeTaskAwareCrossModelScore()` function
- When `taskType` provided, matching cohorts weighted by `TASK_MATCH_WEIGHT_MULTIPLIER` (3.0x)
- When no `taskType`, delegates to standard `computeCrossModelScore()` (full backward compat)
- Information asymmetry explicitly handled: low sample count task cohorts defer to collection prior
- Extensive JSDoc documenting the Bayesian weighting semantics

### Task 10.4: Wire task-type reputation into economic boundary
- **File**: `app/src/services/conviction-boundary.ts` (modified)
- Added `taskType?: TaskType` to `EconomicBoundaryOptions`
- `evaluateEconomicBoundaryForWallet` now uses 3-tier scoring path:
  1. `task_cohort` — Task-specific cohort exists with non-null personal_score
  2. `aggregate` — Fall back to overall aggregate personal score
  3. `tier_default` — Fall back to static tier-based score (cold start)
- Scoring path logged via `console.debug` for observability
- Backward compatible: existing callers without `taskType` behave identically

### Task 10.5: Event sourcing foundation for ReputationStore
- **File**: `app/src/services/reputation-service.ts` (modified)
- Extended `ReputationStore` interface with `appendEvent()` and `getEventHistory()`
- `InMemoryReputationStore` stores events in append-only array per nftId
- Added `reconstructAggregateFromEvents()` stub (returns cold-start aggregate)
- Created `ReputationEvent` type with 3 event types: `quality_signal`, `task_completed`, `credential_update`

### Task 10.6: Reputation evolution test suite
- **File**: `app/tests/unit/reputation-evolution.test.ts` (new)
- 36 tests organized by task:
  - 4 tests: TASK_TYPES taxonomy and type structure
  - 6 tests: Task-type keyed storage (CRUD, upsert, isolation, backward compat)
  - 7 tests: Task-aware cross-model scoring (task weighting, cold handling, low sample count)
  - 6 tests: Economic boundary with task-specific reputation (3-tier fallback, logging)
  - 7 tests: Event sourcing (append, ordering, isolation, append-only, reconstruction stub)
  - 6 tests: Cold start to warm path transition

## Architecture Decisions

### Intersection types over interface extension
Used `ModelCohort & { task_type: TaskType }` rather than a new interface extending ModelCohort. This preserves full compatibility with Hounfour's type system — any function accepting ModelCohort also accepts TaskTypeCohort.

### Composite key strategy for InMemoryReputationStore
Key structure `${nftId}:${model_id}:${task_type}` chosen over nested Map for simplicity and O(1) lookups. The composite key is collision-free because model_id and task_type are constrained enums.

### TASK_MATCH_WEIGHT_MULTIPLIER = 3.0
A task-matching cohort with 10 samples has equivalent influence to a non-matching cohort with 30 samples. This balances task specificity against over-sensitivity to small task-specific datasets.

### Console.debug for scoring path logging
Lightweight observability without introducing a structured logging dependency. Production deployments can capture debug-level logs; development environments see the scoring path for debugging.

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `app/src/types/reputation-evolution.ts` | Created | ~120 |
| `app/src/services/reputation-service.ts` | Modified | +200 |
| `app/src/services/conviction-boundary.ts` | Modified | +45 |
| `app/tests/unit/reputation-evolution.test.ts` | Created | ~380 |
| `grimoires/loa/ledger.json` | Modified | status update |
