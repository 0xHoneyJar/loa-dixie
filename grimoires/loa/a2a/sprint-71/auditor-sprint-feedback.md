# Auditor Review -- Sprint 7 (G-71): Event Sourcing Foundation

**Auditor**: Paranoid Cypherpunk Auditor (Claude Opus 4.6)
**Date**: 2026-02-25
**Review Cycle**: 1
**Status**: APPROVED

---

## Security Audit Summary

Sprint 7 (G-71) passes all security checks. All 6 tasks were audited against the full security checklist. No vulnerabilities, no hardcoded secrets, no SQL injection vectors, no data deletion safety violations.

---

## Checklist Results

### 1. SQL Injection: CLEAN

All 17 SQL queries in `pg-reputation-store.ts` were individually verified. Every query accepting user-supplied input uses parameterized statements (`$1`, `$2`, etc.). No string concatenation or template literal interpolation in any SQL string. Specific verification:

- `compactSnapshot` (line 149): `$1, $2, $3` for nftId, state, aggregate
- `needsCompaction` (line 178): `$1` for nftId
- `countEventsBefore` (line 195): `$1` for cutoff Date
- `deleteEventsBefore` (line 214): `$1` for cutoff Date
- `getOldestEventDate` (line 229): No user input (aggregate function)

### 2. Transaction Safety: CLEAN

`compactSnapshot` (lines 145-166) uses the correct node-postgres transaction pattern:

- **Dedicated client via `pool.connect()`**: Required for multi-statement transactions (pool.query() would risk connection interleaving).
- **BEGIN/COMMIT lifecycle**: Explicit transaction boundaries.
- **ROLLBACK in catch**: On any error, transaction is rolled back before re-throwing.
- **client.release() in finally**: Guarantees connection return to pool, preventing connection exhaustion even on error.
- **Atomic UPSERT**: `event_count = 0` and `snapshot_version + 1` combined in a single SQL statement within the transaction, preventing partial state.

Minor robustness note: If `ROLLBACK` itself fails (connection lost), the ROLLBACK error shadows the original. PostgreSQL auto-rolls-back on connection close, so this is not a data integrity risk. The `finally` block still releases the client.

### 3. Data Deletion Safety: CLEAN

`deleteEventsBefore` (line 209) defaults `dryRun = true`. This is defense-in-depth -- a caller must explicitly pass `false` to perform actual deletion. The dry-run path delegates to `countEventsBefore()` (SELECT only, no mutation). The DELETE path uses parameterized `$1` for the cutoff date.

### 4. Type Safety: CLEAN

- **Financial amounts**: `CurrencyAmount.amount` uses `bigint`, avoiding IEEE 754 floating-point imprecision. Correct for monetary calculations.
- **Immutability**: `ReadonlyMap` on `MultiBudget.balances`, `readonly` on all interface fields, `as const` on `MICRO_USD`.
- **Backward compatibility**: `community_id?` and `task_cohorts?` are optional fields on `DixieReputationAggregate`.
- **Closed union**: `PaymentRail` is a 4-literal union type, not an open string.

### 5. No Secrets: CLEAN

All 9 files (5 implementation, 4 test) contain zero hardcoded credentials, API keys, tokens, connection strings, or environment variable reads for secrets. The PostgreSQL pool is injected via constructor DI.

### 6. Error Handling: CLEAN

- Errors in `compactSnapshot` propagate after ROLLBACK -- callers see the original error.
- `reconstructAggregateFromEvents` is a pure function with no error paths that leak internals.
- `createPaymentGate` sets `X-Payment-Wallet` from the JWT-extracted wallet (client's own data), not internal state.
- `deleteEventsBefore` returns only a count, not row data.

### 7. Backward Compatibility: CLEAN

- All new type fields are optional (no breaking changes).
- New methods added to `PostgresReputationStore` class, not to the `ReputationStore` interface (infrastructure-only extension).
- `X-Payment-Rail` response header is additive -- existing clients ignore unknown headers.
- `CommunityReputationKey` and multi-currency types are new exports, not modifications.

---

## Task-Level Audit

### Task 7.1: Snapshot compaction trigger -- PASS
- Transaction pattern is correct (BEGIN/UPSERT/COMMIT with ROLLBACK/release).
- `needsCompaction` safely returns `false` for non-existent aggregates.
- Default threshold (100) is a reasonable production value.
- 5 tests cover the transaction lifecycle including rollback.

### Task 7.2: Full event replay -- PASS
- `reconstructAggregateFromEvents` correctly starts from cold state.
- State transitions validated via `isValidReputationTransition` before application.
- Uses `computeBlendedScore` from Hounfour governance (not a custom implementation).
- The `(event as Record<string, unknown>).score` cast (line 531) is guarded by `!= null` check. Pragmatic type access with runtime safety.
- `contract_version` hardcoded to `'7.11.0'` -- correct for current protocol.
- 7 tests verify empty stream, warming, established, blended score, options, and transition history.

### Task 7.3: Retention query helpers -- PASS
- All three methods use parameterized queries.
- `deleteEventsBefore` dryRun defaults to `true` -- critical safety measure.
- `getOldestEventDate` returns `null` for empty tables (MIN() returns null).
- `rowCount ?? 0` handles node-postgres null rowCount edge case.
- 4 tests cover count, dry-run, execute, and empty table.

### Task 7.4: Multi-currency budget scaffold -- PASS
- Type-only module (no runtime logic beyond one constant).
- `bigint` for financial amounts is the correct choice.
- `ReadonlyMap` enforces immutability.
- JSDoc documents relationship to existing `DixieConfig.autonomousBudgetDefaultMicroUsd`.
- 4 tests verify constant shape, community scoping, bigint precision, and multi-balance.

### Task 7.5: Per-community reputation scoping -- PASS
- `community_id?: string` is optional, maintaining backward compatibility.
- `CommunityReputationKey` is correctly re-exported from `reputation-service.ts`.
- 2 tests verify both with and without community_id.

### Task 7.6: Multi-rail payment scaffold -- PASS
- `PaymentRail` is a closed 4-literal union mapping to the three revenue paths plus conviction-gated.
- Middleware correctly sets headers after `await next()` (Hono post-processing pattern).
- `X-Payment-Wallet` is conditionally set only when wallet exists in context.
- No payment enforcement logic (scaffold only) -- appropriate for this sprint.
- 5 tests verify pass-through, header setting, disabled state, rail types, and context shape.

---

## Observations (Non-Blocking)

1. **appendEvent non-transactional**: The INSERT + UPDATE event_count in `appendEvent` (lines 86-98) are two separate queries without a transaction. A crash between them could cause event_count to lag by one. This is pre-existing (not Sprint 7), and the undercount is fail-safe (delays compaction, never causes data loss). Not a blocker.

2. **Iterative Bayesian blending in replay**: `reconstructAggregateFromEvents` (line 535) feeds the running blended score back as `personalScore` for each iteration. This produces an iterative Bayesian update rather than a batch computation over raw scores. The behavior is internally consistent but produces different results than computing the average of all raw scores first, then blending once. This is a design choice, not a bug.

3. **ROLLBACK error shadowing**: If `client.query('ROLLBACK')` throws (connection lost), the original error in `compactSnapshot` is shadowed. PostgreSQL auto-rolls-back on connection close, so data integrity is preserved. The connection is still released via `finally`.

---

## Decision

**APPROVED** -- All 6 tasks pass the security audit. Zero vulnerabilities found. Parameterized queries throughout, correct transaction lifecycle, dryRun-default deletion safety, bigint financial precision, no secrets, proper error handling, and full backward compatibility.

Status: APPROVED
