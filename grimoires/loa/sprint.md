# Sprint Plan: Correctness & Maintainability (Bridge Iter 1)

**Version**: 5.1.0
**Date**: 2026-02-24
**Cycle**: cycle-005
**PRD**: v5.0.0 | **SDD**: v5.0.0
**Sprint**: 3 (global ID: 62)
**Source**: Bridgebuilder Review — Iteration 1 (bridge-20260224-hf711adopt)
**Estimated Tasks**: 4

---

## Sprint Overview

| Sprint | Global ID | Label | Focus | Tasks |
|--------|-----------|-------|-------|-------|
| sprint-3 | 62 | Correctness & Maintainability (Bridge Iter 1) | MEDIUM-1, LOW-1, LOW-2 | 4 |

**Source findings**: 1 MEDIUM, 2 LOW from bridge iteration 1 review.

---

## Sprint 3: Correctness & Maintainability (Bridge Iter 1)

**Global ID**: 62
**Goal**: Address all actionable findings from Bridgebuilder iteration 1. Extract shared content field builder to eliminate hash/return divergence risk, add chain length observability, simplify type discriminator.
**Success Criteria**: All 3 findings resolved, all existing tests pass, no API surface changes.

### Task 3.1: Extract shared buildContentFields helper in ScoringPathTracker

**Finding**: MEDIUM-1 — Optional field spreading duplicated between hash input and return value
**File**: `app/src/services/scoring-path-tracker.ts`
**Priority**: P0

**Description**: The optional field spreading pattern (`entry.model_id !== undefined && { model_id: entry.model_id }`) is duplicated between the hashInput construction (lines 46-52) and the return value construction (lines 58-66). Extract a shared `buildContentFields(entry, scored_at)` helper that both the hash input and return value consume. This ensures the hash always covers exactly the fields present in the returned entry.

**Acceptance Criteria**:
- [ ] `buildContentFields()` private helper extracts shared field construction
- [ ] Hash input uses `buildContentFields()` output
- [ ] Return value uses `buildContentFields()` output + hash chain fields
- [ ] Existing tests pass unchanged (determinism, chaining, genesis)
- [ ] No API surface change (record() signature and return type unchanged)

**Testing**: All existing scoring-path-tracker tests pass. Hash determinism verified.

### Task 3.2: Add chain length accessor to ScoringPathTracker

**Finding**: LOW-1 — ScoringPathTracker lacks chain length accessor
**File**: `app/src/services/scoring-path-tracker.ts`
**Priority**: P1

**Description**: Add a `private entryCount: number = 0` field, increment in `record()`, reset in `reset()`, expose via `get length(): number`. This supports operational observability (log aggregation, anomaly detection).

**Acceptance Criteria**:
- [ ] `get length(): number` accessor exposed on ScoringPathTracker
- [ ] Returns 0 after construction
- [ ] Returns N after N `record()` calls
- [ ] Returns 0 after `reset()`
- [ ] New test verifying length behavior

**Testing**: 1 new test scenario in scoring-path-tracker.test.ts.

### Task 3.3: Simplify discriminator in conviction-boundary.ts

**Finding**: LOW-2 — Conviction boundary options discriminator is a growing conditional
**File**: `app/src/services/conviction-boundary.ts`
**Priority**: P1

**Description**: Replace the 5-field OR chain at line 210 with a negative check: `!('min_trust_score' in criteriaOrOpts)`. QualificationCriteria always has `min_trust_score` — its absence definitively indicates EconomicBoundaryOptions. This is a single check that scales regardless of how many fields are added to EconomicBoundaryOptions.

**Acceptance Criteria**:
- [ ] Discriminator reduced from 5-field OR chain to single negative check
- [ ] All existing conviction-boundary tests pass unchanged
- [ ] All existing conviction-boundary-hashchain tests pass unchanged
- [ ] Comment explains the discrimination strategy

**Testing**: All existing tests pass. No new tests needed (behavior unchanged).

### Task 3.4: Run full test suite — regression gate

**Priority**: P0

**Description**: Run complete test suite. Verify all existing tests + new length test pass. Final gate.

**Acceptance Criteria**:
- [ ] All existing tests pass (0 failures)
- [ ] New length accessor test passes
- [ ] Total test count >= 1121
- [ ] No TypeScript compilation errors

**Testing**: Full vitest suite execution.

---

## Dependencies

```
Task 3.1 (buildContentFields)
    │
    ├──→ Task 3.2 (length accessor) [independent]
    │
    └──→ Task 3.4 (regression gate)

Task 3.3 (discriminator) [independent]
    │
    └──→ Task 3.4 (regression gate)
```

---

*Sprint plan for bridge iteration 1 findings: 1 sprint, 4 tasks, focused on DRY extraction (Task 3.1), observability (Task 3.2), and maintainability (Task 3.3). All changes are internal — zero API surface changes.*
