# Sprint 121 — Implementation Report

**Sprint**: Chain-Bound Hash Version-Aware Verification (P3)
**Global ID**: 121 (cycle-019, sprint-6)
**Branch**: `feature/hounfour-v830-canonical-migration`

## Summary

Implemented ADR-006: version-aware hash verification for the audit trail chain.
New entries use hounfour's canonical `computeChainBoundHash` (direct concatenation +
SHA-256) with `v10` domain tags. Existing entries remain verifiable using the preserved
legacy `computeChainBoundHash_v9` (double-hash via synthetic entry). A single chain
may contain entries from both eras — verification dispatches per-entry based on domain
tag format (dots = legacy, no dots = canonical).

## Key Discovery: Domain Tag Compatibility

Hounfour's canonical `validateDomainTag()` requires segments matching `/^[a-z0-9][a-z0-9_-]*$/` —
dots are rejected. Dixie's existing domain tags used `9.0.0` which fails this validation.
The solution uses `v10` (dot-free) for new entries, making the domain tag itself the
algorithm discriminator. This is structurally identical to TLS cipher suite negotiation.

## Task Completion

| Task | Description | Status | Notes |
|------|-------------|--------|-------|
| T6.1 | Write ADR-006 | DONE | `docs/adr/006-chain-bound-hash-migration.md` — documents algorithm divergence, migration strategy, decision rationale |
| T6.2 | Rename local → computeChainBoundHash_v9 | DONE | Renamed + marked `@deprecated` with ADR-006 reference |
| T6.3 | Wire canonical computeChainBoundHash for new entries | DONE | `append()` uses canonical algorithm with v10 domain tag |
| T6.4 | Version-aware verification dispatch | DONE | `isLegacyDomainTag()` + `computeChainBoundHashVersionAware()` — dispatches per entry in `verifyIntegrity()` |
| T6.5 | Cross-version verification tests | DONE | 17 tests across 7 describe blocks |
| T6.6 | Full test suite | DONE | 2424 passed, 0 failures |

## Implementation Decisions

### T6.1: ADR-006 — Three options evaluated

1. **In-place swap (rejected)**: Invalidates all existing chain entries. Unacceptable for governance audit.
2. **Version-aware verification (chosen)**: Zero data migration, both algorithms coexist, domain tag as discriminator.
3. **Parallel chains (rejected)**: Unnecessary complexity, no benefit over dispatch.

### T6.2 + T6.3: Algorithm coexistence

- Legacy function renamed to `computeChainBoundHash_v9`, marked `@deprecated`
- Canonical imported as `canonicalChainBoundHash` to avoid naming collision
- `buildDomainTag()` now returns `loa-dixie:audit:{type}:v10` (canonical-compatible)
- `append()` uses canonical directly — all new entries get v10 domain tag

### T6.4: Version detection via domain tag

```typescript
function isLegacyDomainTag(domainTag: string): boolean {
  const segments = domainTag.split(':');
  const version = segments[segments.length - 1];
  return version?.includes('.') ?? true;
}
```

Dots in the last segment = legacy (e.g., `9.0.0`). No dots = canonical (e.g., `v10`).
Default to legacy if version segment is unclear — safe fallback since v9 produces
deterministic output and will fail verification if wrong.

### T6.5: Test coverage

Cross-version test file covers:
- `isLegacyDomainTag` — 5 cases (semver, multi-digit semver, v10, v11, edge cases)
- `computeChainBoundHashVersionAware` — 3 cases (legacy dispatch, canonical dispatch, different outputs)
- `computeChainBoundHash_v9` — 1 case (double-hash via synthetic entry)
- Pure legacy chain — 3-entry verification
- Pure canonical chain — 3-entry verification + tamper detection
- Mixed chain (v9 → v10 transition) — 3 cases:
  - 2 v9 + 1 v10 entry (transition boundary)
  - Tamper at transition boundary
  - 2 v9 + 3 v10 (longer chain, different resource type)
- Canonical append — 3 cases (v10 tag, canonical hash pattern, chain linking)

Existing test mock updated to include `computeChainBoundHash` (canonical) mock.
Domain tag expectations updated from `9.0.0` to `v10` in append tests.

## Files Changed

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| `docs/adr/006-chain-bound-hash-migration.md` | NEW | 105 |
| `app/src/services/audit-trail-store.ts` | REWRITTEN | 333 → 413 |
| `app/tests/unit/audit-trail-store.test.ts` | MODIFIED | Mock updated, domain tag expectations |
| `app/tests/unit/audit-trail-version-aware.test.ts` | NEW | ~420 |

## Algorithm Comparison

| Property | v9 (Legacy) | Canonical (v10) |
|----------|-------------|-----------------|
| Content hash | `computeAuditEntryHash(entry, tag)` | `computeAuditEntryHash(entry, tag)` |
| Chain binding | Synthetic entry double-hash | `sha256(contentHash + ":" + previousHash)` |
| Domain tag | `loa-dixie:audit:{type}:9.0.0` | `loa-dixie:audit:{type}:v10` |
| Same inputs | Different hashes | Different hashes |
| Cross-service | Dixie-only | Compatible with hounfour ecosystem |

## Test Results

```
Test Files  126 passed | 1 skipped (127)
     Tests  2424 passed | 22 skipped (2446)
  Duration  10.27s
```

New cross-version tests: 17 passed covering all ADR-006 scenarios.
Existing tests: Updated mock + expectations, all passing.
