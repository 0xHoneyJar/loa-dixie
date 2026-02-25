# Engineer Review -- Sprint 7 (G-71): Event Sourcing Foundation

**Reviewer**: Claude Opus 4.6 (Senior Technical Lead)
**Date**: 2026-02-25
**Review Cycle**: 1
**Status**: APPROVED -- All good

---

## Review Summary

Sprint 7 (G-71) implements the event sourcing foundation for reputation tracking, multi-currency type scaffolding, per-community reputation scoping, and multi-rail payment types. All 6 tasks are properly implemented. Code quality is high, tests are comprehensive, and the full test suite passes with zero regressions (77 files, 1,230 tests).

---

## Task-by-Task Verification

### Task 7.1: Snapshot compaction trigger -- PASS

**File**: `app/src/db/pg-reputation-store.ts` (lines 145-183)

**Acceptance Criteria Check**:
- [x] `compactSnapshot()` atomically updates aggregate and resets event_count -- Uses `BEGIN`/`COMMIT` transaction via pool.connect() client. The UPSERT sets `event_count = 0` alongside `snapshot_version` increment in a single SQL statement within the transaction.
- [x] `needsCompaction()` returns true when event_count exceeds threshold -- Reads `event_count` from `reputation_aggregates` and compares against threshold (default: 100).
- [x] Transaction rollback on failure -- `catch` block calls `ROLLBACK`, `finally` block calls `client.release()`.
- [x] Default compaction threshold is 100 events -- `threshold = 100` as default parameter.

**Implementation Notes**:
- The `compactSnapshot` method correctly acquires a dedicated client from the pool (not using the pool directly), which is the proper pattern for multi-statement transactions in node-postgres.
- The `needsCompaction` method returns `false` for non-existent aggregates (line 181), which is correct -- nothing to compact if no aggregate exists.
- The compaction UPSERT at line 149-157 combines the put() semantics with event_count reset into a single SQL statement, which is more efficient than the sprint plan's suggested two-statement approach while being semantically equivalent.

**Tests**: 5 tests in `pg-reputation-store.test.ts`:
- Transaction with BEGIN/UPSERT/COMMIT (line 273)
- Rollback on failure (line 292)
- needsCompaction true when exceeding threshold (line 309)
- needsCompaction false below threshold (line 316)
- needsCompaction with custom threshold (line 328)

---

### Task 7.2: Full event replay in reconstructAggregateFromEvents -- PASS

**File**: `app/src/services/reputation-service.ts` (lines 514-579)

**Acceptance Criteria Check**:
- [x] Replay of N quality signal events produces aggregate with `sample_count === N` -- Each `quality_signal` event increments `sampleCount` (line 533).
- [x] Replay produces valid state transitions (cold -> warming -> established) -- State machine at lines 546-556 transitions based on sample_count thresholds.
- [x] Blended score computed using Hounfour's `computeBlendedScore` -- Called at line 535 during replay and again at line 559 for the final aggregate.
- [x] `contract_version` set to current protocol version -- Set to `'7.11.0'` at line 576.
- [x] Stub comment removed -- No stub comments remain; full implementation replaces the previous placeholder.

**Implementation Notes**:
- The function accepts an optional `options` parameter with `pseudoCount` and `collectionScore` (line 516-517), matching the sprint plan specification.
- State transitions are validated via `isValidReputationTransition` (line 553) before being applied, ensuring only legal transitions occur.
- Transition history is recorded with timestamps from the events themselves (line 554).
- The `created_at` and `last_updated` fields are derived from the event stream boundaries (line 573-574), which is the correct behavior for reconstruction.
- The score extraction at line 531 uses a cast pattern `(event as Record<string, unknown>).score` which works with the Hounfour `QualitySignalEvent` type that carries a `score` field. This is a pragmatic approach given the discriminated union type structure.

**Tests**: 7 tests in `reputation-evolution.test.ts`:
- Empty event stream returns cold aggregate (line 499)
- Quality signals transition to warming (line 507)
- Sufficient events transition to established (line 521)
- Blended score computed correctly (line 535)
- Options for pseudo count and collection score (line 548)
- Transition history recorded with timestamps (line 561)
- Mixed event types processed correctly (existing cold-start tests)

---

### Task 7.3: Retention automation query helpers -- PASS

**File**: `app/src/db/pg-reputation-store.ts` (lines 193-233)

**Acceptance Criteria Check**:
- [x] `countEventsBefore` uses parameterized query with `WHERE created_at < $1` -- Exact query at line 195.
- [x] `deleteEventsBefore` with `dryRun: true` (default) returns count without deleting -- Delegates to `countEventsBefore` (line 211).
- [x] `deleteEventsBefore` with `dryRun: false` performs DELETE -- `DELETE FROM reputation_events WHERE created_at < $1` at line 214.
- [x] `getOldestEventDate` returns null when table is empty -- `MIN()` returns null for empty tables, handled at line 232.

**Implementation Notes**:
- The `dryRun` parameter defaults to `true` (line 209), preventing accidental data deletion. This is a critical safety feature.
- `deleteEventsBefore` returns `result.rowCount ?? 0` (line 217), using the nullish coalescing operator to handle the case where pg driver returns null rowCount.
- `getOldestEventDate` uses `MIN(created_at)` which is O(1) with a btree index on `created_at`, making it efficient for alerting.
- All three methods use parameterized queries, preventing SQL injection.

**Tests**: 4 tests in `pg-reputation-store.test.ts`:
- countEventsBefore query shape (line 337)
- deleteEventsBefore dryRun returns count (line 351)
- deleteEventsBefore execute deletes (line 366)
- getOldestEventDate null on empty (line 390)

---

### Task 7.4: Multi-currency budget type scaffold -- PASS

**File**: `app/src/types/multi-currency.ts` (new file, 63 lines)

**Acceptance Criteria Check**:
- [x] Types are exported and importable -- `Currency`, `CurrencyAmount`, `MultiBudget` interfaces and `MICRO_USD` constant all exported.
- [x] `MICRO_USD` constant matches current config semantics -- `{ code: 'micro-usd', decimals: 6 }` aligns with `autonomousBudgetDefaultMicroUsd`.
- [x] Types are extensible for community-scoped currencies -- `Currency.community` is optional, allowing global and community-scoped currencies.
- [x] No runtime code changes (type definitions only + constants) -- Only interfaces and one constant.

**Implementation Notes**:
- `CurrencyAmount` uses `bigint` for the amount field, avoiding floating-point precision issues in financial calculations. This is the correct choice.
- `MultiBudget` uses `ReadonlyMap<string, CurrencyAmount>` enforcing immutability at the type level.
- The `as const` on `MICRO_USD` (line 62) ensures the constant is deeply readonly.
- JSDoc at the module level (lines 1-16) clearly documents the relationship to existing code and the vision for ResourceGovernor evolution.

**Tests**: 4 tests in `multi-currency.test.ts`:
- MICRO_USD constant shape (line 6)
- Community-scoped currencies (line 12)
- CurrencyAmount bigint precision (line 21)
- MultiBudget multiple balances (line 30)

---

### Task 7.5: Per-community reputation scoping -- PASS

**File**: `app/src/types/reputation-evolution.ts` (lines 79-98)

**Acceptance Criteria Check**:
- [x] `DixieReputationAggregate` type extended with optional `community_id` -- `community_id?: string` at line 83.
- [x] `CommunityReputationKey` type exported -- Interface at lines 95-98.
- [x] Existing code unaffected (field is optional) -- Both fields use `?` optional marker.
- [x] JSDoc explains the per-community scoping vision -- Detailed comment at lines 72-78 explains the community dimension.

**Implementation Notes**:
- The `CommunityReputationKey` is correctly re-exported from `reputation-service.ts` (line 598) for consumer convenience.
- The JSDoc clearly articulates the two-dimensional reputation model: TaskTypeCohort for the task dimension, community_id for the community dimension.

**Tests**: 2 tests in `reputation-evolution.test.ts`:
- DixieReputationAggregate supports optional community_id (line 133) -- tests both with and without community_id.
- All existing tests pass unchanged (backward compatibility verified by full suite).

---

### Task 7.6: Multi-rail payment type scaffold -- PASS

**File**: `app/src/middleware/payment.ts` (lines 1-65)

**Acceptance Criteria Check**:
- [x] `PaymentRail` and `PaymentContext` types exported -- Union type at line 14, interface at lines 24-29.
- [x] Scaffold sets `X-Payment-Rail: x402` header alongside `X-Payment-Status: scaffold` -- Lines 58-59 set both headers.
- [x] Existing payment tests pass (additional header does not break assertions) -- All 5 tests pass.
- [x] Types are extensible for future payment rails -- Union type easily extended; PaymentContext uses optional fields for rail-specific data.

**Implementation Notes**:
- The four rails (`x402`, `nowpayments`, `stripe-connect`, `conviction-gated`) map exactly to the three revenue paths from Freeside #62 plus conviction-gated free access.
- JSDoc at lines 5-12 documents the revenue path provenance.
- The middleware correctly sets headers after `await next()` (line 54), which is the Hono pattern for response mutation.
- The wallet extraction from context (line 60) integrates with the existing JWT middleware's wallet injection.

**Tests**: 5 tests in `payment.test.ts`:
- Pass-through when disabled (line 7)
- X-Payment-Rail header set when enabled (line 17)
- No payment headers when disabled (line 28)
- PaymentRail type supports expected rails (line 38)
- PaymentContext type shape (line 43)

---

## Cross-Cutting Concerns

### Security
- No SQL injection vectors: all queries use parameterized statements.
- `deleteEventsBefore` defaults to `dryRun: true`, preventing accidental data loss.
- Transaction isolation in `compactSnapshot` prevents partial state corruption.

### Performance
- `getOldestEventDate` uses `MIN()` aggregate which leverages btree indexes.
- `needsCompaction` reads a single integer column, not full JSONB blobs.
- No N+1 query patterns introduced.

### Backward Compatibility
- All new type fields are optional (`community_id`, `task_cohorts`).
- New methods added to existing classes without changing signatures.
- Additional HTTP header (`X-Payment-Rail`) is additive, not breaking.

### Code Quality
- Consistent JSDoc with `@since` tags referencing sprint provenance.
- Clean separation between type scaffolds (Tasks 7.4, 7.5, 7.6) and runtime implementation (Tasks 7.1, 7.2, 7.3).
- Test mocking patterns consistent with existing codebase conventions.

---

## Test Results

- **77 test files**, **1,230 tests** passing
- Zero regressions
- 80 tests in the 4 Sprint 7-related test files

---

## Decision

**APPROVED** -- All 6 tasks properly implemented against their acceptance criteria. Code quality is high, tests are comprehensive, backward compatibility is maintained, and the full test suite passes clean.

Status: APPROVED
