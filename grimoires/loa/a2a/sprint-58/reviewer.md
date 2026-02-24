# Sprint 58: Correctness & Security Hardening — Implementation Report

**Sprint**: 4 (Global #58)
**Cycle**: cycle-004 (bridge iteration 2)
**Status**: COMPLETE
**Tests**: 1090 passing (14 new)

---

## Task 1.1: Add Observability to normalizeWallet Fallback Path

**Status**: COMPLETE

**File**: `app/src/utils/normalize-wallet.ts:13-19`

When the `checksumAddress` call fails on a valid-looking Ethereum address (starts with `0x`, length 42), now emits `console.warn('[wallet-normalization] checksum-fallback', { prefix })`. Short/test addresses stay silent — they're expected to fail.

**AC Verification**: Test verifies warning emitted for 42-char hex address, silent for short addresses ✓

## Task 1.2: Tighten Legacy Error Handler with Deprecation Warning

**Status**: COMPLETE

**File**: `app/src/utils/error-handler.ts:19-27`

Legacy branch (plain objects with `status` + `body`) now emits `console.warn('[error-handler] legacy error pattern', { status })` on every invocation. BffError path and generic Error path do NOT emit. This makes legacy usage observable for sunset planning.

**AC Verification**: Test verifies warning for legacy objects, no warning for BffError/generic Error ✓

## Task 1.3: Add Cardinality Guard to Enrichment Service listAll()

**Status**: COMPLETE

**Files**: `app/src/services/enrichment-service.ts:201, 250-257`

Added `MAX_SCAN_SIZE = 10_000` static constant. When `listAll()` returns more than 10k entries, logs `[enrichment] tier-distribution scan exceeds cardinality limit` and falls back to percentage estimation using the array length (not a separate count query). This prevents O(n) memory duplication at scale.

**AC Verification**: Test mocks listAll with 10,001 entries, verifies warning emitted and estimation used ✓

## Task 1.4: Extract Agent Route Validation Constants

**Status**: COMPLETE

**Files**: `app/src/validation.ts:12-24`, `app/src/routes/agent.ts:5-11, 175-187`

Extracted magic numbers to named, exported constants in `validation.ts`:
- `AGENT_QUERY_MAX_LENGTH = 10_000`
- `AGENT_MAX_TOKENS_MIN = 1`
- `AGENT_MAX_TOKENS_MAX = 4_096`
- `AGENT_KNOWLEDGE_DOMAIN_MAX_LENGTH = 100`

Agent.ts now imports and uses these constants. Error messages use template literals with the constant values.

**AC Verification**: No magic number literals in agent route validation. Constants exported and tested ✓

## Task 1.5: Hardening Test Suite

**Status**: COMPLETE

**New file**: `app/tests/unit/bridge-iter2-hardening.test.ts` — 14 tests

| Section | Tests | Coverage |
|---------|-------|----------|
| normalizeWallet observability | 4 | Warning for valid-looking addresses, silent for short/non-0x/valid |
| Legacy error handler warning | 4 | Warning for legacy, no warning for BffError/generic, correct response |
| Enrichment cardinality guard | 2 | Guard triggers at threshold, MAX_SCAN_SIZE value |
| Validation constants | 4 | Value verification, type verification |

**AC Verification**: All 14 tests pass ✓

---

## Files Changed

| File | Change |
|------|--------|
| `app/src/utils/normalize-wallet.ts` | Add checksum-fallback warning for valid-looking addresses |
| `app/src/utils/error-handler.ts` | Add legacy pattern deprecation warning |
| `app/src/services/enrichment-service.ts` | Add MAX_SCAN_SIZE guard with estimation fallback |
| `app/src/validation.ts` | Add AGENT_* validation constants |
| `app/src/routes/agent.ts` | Import and use named validation constants |
| `app/tests/unit/bridge-iter2-hardening.test.ts` | NEW — 14 tests |
