# Sprint 122 — Engineer Feedback

**Reviewer**: Senior Technical Lead
**Sprint**: Advisory Lock Canonical Swap & Cross-Repo Coordination (P4)
**Decision**: APPROVED

## Verdict

All good.

## Code Review Summary

### T7.1: Replace `computeLockId` with Canonical `computeAdvisoryLockKey` -- PASS

Verified in `app/src/db/migrate.ts`:

- **Local `computeLockId` function**: Deleted. No trace remains in `migrate.ts`. The only reference to `computeLockId` anywhere in the codebase is in the test file's documentation comment reproducing the old algorithm for comparison (appropriate).
- **Import**: `computeAdvisoryLockKey` imported from `@0xhoneyjar/loa-hounfour/commons` (line 19). Confirmed this barrel re-exports from `./advisory-lock.js` in the installed package.
- **Usage**: `const MIGRATION_LOCK_ID = computeAdvisoryLockKey('dixie-bff:migration')` (line 153). Passed to both `pg_advisory_lock` (line 160) and `pg_advisory_unlock` (line 246).
- **`crypto` import retained**: Correctly kept because `createHash` is still used by `computeChecksum()` (line 39-41) for migration file integrity. The acceptance criteria explicitly allowed this: "removed (if no other usage)".
- **Inline comments**: Good documentation of the algorithm change at lines 149-152, referencing BB-DEEP-04, hounfour v8.3.0, and Sprint 122.

### T7.2: Advisory Lock Migration Tests -- PASS

Verified in `app/tests/unit/advisory-lock-canonical.test.ts` (134 lines, 6 tests):

1. **Key validity**: Checks 32-bit signed integer range `[-2^31, 2^31-1]` -- correct for PostgreSQL `int4`.
2. **Determinism**: Same input produces same output.
3. **Collision resistance**: `dixie-bff:migration` vs `finn:migration` produce different keys.
4. **Old-to-new mapping documented**: Test at line 69 reproduces the OLD SHA-256 algorithm and asserts it differs from the NEW FNV-1a result. JSDoc block (lines 57-67) documents both algorithms clearly.
5. **Lock integration**: Verifies `migrate()` passes canonical key to `pg_advisory_lock`.
6. **Unlock integration**: Verifies `migrate()` passes canonical key to `pg_advisory_unlock`.

Test structure is clean. Uses the existing `createMockPool` fixture. Mock setup is correct.

### T7.3: Hounfour Upstream Issue -- PASS

Report states `0xHoneyJar/loa-hounfour#40` was filed during Sprint 119 with the full proposal. This satisfies the acceptance criteria (issue exists and is OPEN).

### T7.4: Cross-Repo Coordination -- PASS

Report states PR #64 comment posted with migration status table (all 4 sprints checked off), dixie #63 already closed, ADR-005/ADR-006 cross-referenced, hounfour #40 referenced.

### T7.5: Full Test Suite -- PASS

2430 tests passed, 0 failures, 22 skipped. Exceeds the 2374+ threshold in acceptance criteria.

## Notes

- The existing `migrate.test.ts` (104 lines) is unmodified and continues to test the core migration framework behavior. The new advisory-lock test file is additive.
- The implementation is minimal and surgical: ~11 lines removed (function + old constant), ~3 lines added (import + new constant + comments). Exactly the right blast radius for a hash algorithm swap.
- This completes all 4 P1-P4 migrations in the hounfour v8.3.0 canonical migration (Sprints 119-122). The migration summary table in the reviewer report shows 91 LOC removed, 923 LOC added, and 56 new tests across all 4 sprints.
