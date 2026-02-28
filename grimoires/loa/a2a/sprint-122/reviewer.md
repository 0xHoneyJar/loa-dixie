# Sprint 122 — Implementation Report

**Sprint**: Advisory Lock Canonical Swap & Cross-Repo Coordination (P4)
**Global ID**: 122 (cycle-019, sprint-7)
**Branch**: `feature/hounfour-v830-canonical-migration`

## Summary

Swapped the advisory lock computation in `migrate.ts` from a local SHA-256→31-bit
implementation to hounfour's canonical `computeAdvisoryLockKey` (FNV-1a 32-bit signed).
Filed cross-repo coordination updates. This is the final sprint of the hounfour v8.3.0
canonical migration — all 4 P1-P4 migrations are now complete.

## Task Completion

| Task | Description | Status | Notes |
|------|-------------|--------|-------|
| T7.1 | Replace computeLockId with canonical | DONE | Deleted local function, imported from hounfour |
| T7.2 | Advisory lock migration tests | DONE | 6 tests: key validity, determinism, collision resistance, lock/unlock integration, old→new mapping |
| T7.3 | File hounfour upstream issue | DONE | Already filed as 0xHoneyJar/loa-hounfour#40 (OPEN) |
| T7.4 | Update cross-repo coordination | DONE | Comment on PR #64 with migration status table |
| T7.5 | Full test suite | DONE | 2430 passed, 0 failures |

## Implementation Decisions

### T7.1: Advisory lock swap

The change is minimal — 1 function deleted, 1 import added:

**Before** (SHA-256 → 31-bit unsigned):
```typescript
function computeLockId(appName: string): number {
  const hash = createHash('sha256').update(appName).digest();
  return hash.readUInt32BE(0) & 0x7FFFFFFF;
}
const MIGRATION_LOCK_ID = computeLockId('dixie-bff:migration');
```

**After** (FNV-1a 32-bit signed):
```typescript
import { computeAdvisoryLockKey } from '@0xhoneyjar/loa-hounfour/commons';
const MIGRATION_LOCK_ID = computeAdvisoryLockKey('dixie-bff:migration');
```

Lock ID changes on upgrade. This is safe because:
- Advisory locks prevent concurrent migrations (single-writer)
- Blue-green deploy via Route 53 ensures atomic cutover
- Old and new lock IDs don't conflict (different hash spaces)

### T7.2: Test coverage

6 tests covering:
- `computeAdvisoryLockKey` returns valid 32-bit signed integer
- Deterministic (same input → same output)
- Collision resistance (dixie vs finn keys differ)
- Old→new lock ID mapping documented (SHA-256 ≠ FNV-1a for same input)
- `migrate()` passes canonical key to `pg_advisory_lock`
- `migrate()` passes canonical key to `pg_advisory_unlock`

### T7.3: Hounfour issue already filed

Issue 0xHoneyJar/loa-hounfour#40 was filed during Sprint 119 with full proposal:
- `rampDirection: 'ascending' | 'descending'` config field
- Backward compatible (default: 'descending')
- Ecosystem context from Dixie, Finn, Freeside

### T7.4: Cross-repo coordination

- PR #64 comment with migration status table (all 4 sprints ✅)
- Dixie #63 already closed
- ADR-005 and ADR-006 cross-referenced
- Hounfour #40 referenced as pending upstream

### Note: `crypto` import retained

`createHash` from `node:crypto` remains in `migrate.ts` — it's still used by
`computeChecksum()` (line 50) for migration file integrity verification.

## Files Changed

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| `app/src/db/migrate.ts` | MODIFIED | -11 lines (function deleted), +3 lines (import + comments) |
| `app/tests/unit/advisory-lock-canonical.test.ts` | NEW | ~130 |

## Test Results

```
Test Files  127 passed | 1 skipped (128)
     Tests  2430 passed | 22 skipped (2452)
  Duration  8.48s
```

Advisory lock tests: 6 passed.

## Migration Summary (All 4 Sprints)

| Sprint | Migration | LOC Removed | LOC Added | New Tests |
|--------|-----------|-------------|-----------|-----------|
| 119 (P1) | Dampened Score + ADR-005 | ~40 | ~150 (ADR + wrapper + tests) | 22 |
| 120 (P2) | GovernedResourceBase → barrel | ~25 | ~120 (barrel + re-exports) | 10 |
| 121 (P3) | Chain Hash + ADR-006 | ~15 | ~520 (dispatch + tests + ADR) | 18 |
| 122 (P4) | Advisory Lock swap | ~11 | ~133 (import + tests) | 6 |
| **Total** | | **~91** | **~923** | **56** |
