# Sprint Plan: Hounfour v7.11.0 Full Adoption

**Version**: 5.0.0
**Date**: 2026-02-24
**Cycle**: cycle-005
**PRD**: v5.0.0 | **SDD**: v5.0.0
**Sprints**: 2 (global IDs: 60-61)
**Estimated Tasks**: 12

---

## Sprint Overview

| Sprint | Global ID | Label | Focus | Tasks |
|--------|-----------|-------|-------|-------|
| sprint-1 | 60 | Type Migration & Re-export Barrel | FR-1, FR-2, FR-3, FR-4, FR-7 | 6 |
| sprint-2 | 61 | Hash Chain Implementation & Conformance | FR-5, FR-6 + hardening | 6 |

**Sequencing rationale**: Sprint 1 handles all type replacements first — this is the foundation that Sprint 2's hash chain implementation depends on (ScoringPathLog must be the hounfour version before hash chain fields can be used).

---

## Sprint 1: Type Migration & Re-export Barrel

**Global ID**: 60
**Goal**: Replace all 4 local type definitions with canonical Hounfour v7.11.0 imports via re-export barrel. Update all consumers. Zero regressions.
**Success Criteria**: H-1 (stubs eliminated), H-2 (import coverage), H-3 (open enum), H-6 (zero regressions), H-7 (type audit)

### Task 1.1: Rewrite reputation-evolution.ts as re-export barrel

**FR**: FR-1, FR-2, FR-3, FR-4
**File**: `app/src/types/reputation-evolution.ts`
**Priority**: P0

**Description**: Replace the entire file contents. Remove all local type definitions (TaskType, TASK_TYPES, TaskTypeCohort, ReputationEvent, ScoringPathLog). Replace with re-exports from `@0xhoneyjar/loa-hounfour/governance`. Preserve the `DixieReputationAggregate` extension type as the one local definition.

**Acceptance Criteria**:
- [ ] `TASK_TYPES` re-exported from hounfour (open enum, not fixed array)
- [ ] `TaskType` re-exported from hounfour (accepts namespace:type community pattern)
- [ ] `TaskTypeCohort` re-exported from hounfour (includes `confidence_threshold`)
- [ ] `validateTaskCohortUniqueness` re-exported from hounfour
- [ ] `ReputationEvent`, `QualitySignalEvent`, `TaskCompletedEvent`, `CredentialUpdateEvent` re-exported
- [ ] `ScoringPath`, `ScoringPathLog` re-exported from hounfour
- [ ] `DixieReputationAggregate` retained as local extension type
- [ ] File JSDoc updated to reference v7.11.0

**Testing**: Compile check (all consumers resolve). Existing tests pass unchanged.

### Task 1.2: Update reputation-service.ts imports and re-exports

**FR**: FR-3
**File**: `app/src/services/reputation-service.ts`
**Priority**: P0

**Description**: Update import paths and re-exports at the bottom of the file. The reputation-evolution.ts re-export barrel preserves the import path, so the main import statement (line 41-45) should continue to work. Update the re-exports at lines 499-515 to include the new types (`QualitySignalEvent`, `TaskCompletedEvent`, `CredentialUpdateEvent`, `ScoringPath`). Update `contract_version` in `reconstructAggregateFromEvents()` from `'7.9.2'` to `'7.11.0'`.

**Acceptance Criteria**:
- [ ] Import from `../types/reputation-evolution.js` resolves to hounfour types
- [ ] Re-exports at bottom include all new event variant types
- [ ] `ScoringPath` type re-exported
- [ ] `contract_version` updated to `'7.11.0'` in `reconstructAggregateFromEvents()`
- [ ] `InMemoryReputationStore` generics remain compatible with narrowed `ReputationEvent` type

**Testing**: Existing reputation service tests pass. Type compilation succeeds.

### Task 1.3: Update conviction-boundary.ts ScoringPathLog usage

**FR**: FR-4
**File**: `app/src/services/conviction-boundary.ts`
**Priority**: P0

**Description**: Update the ScoringPathLog construction at lines 228, 257-261, 276. Change field name `model` to `model_id` (aligning with hounfour schema). Add `reason` field with descriptive text to each scoring path entry. Update the import at line 30 (the re-export barrel handles this transparently). Update the `ScoringPathLog` re-export at line 593.

**Acceptance Criteria**:
- [ ] `model:` field renamed to `model_id:` at scoring path construction sites
- [ ] `reason` field added to all 3 scoring path entries (task_cohort, aggregate, tier_default)
- [ ] Import resolves to hounfour's `ScoringPathLog` (via re-export barrel)
- [ ] `console.debug` log at line 282 still produces valid JSON
- [ ] Re-export at line 593 updated

**Testing**: Existing conviction boundary tests pass. Field name change verified in test fixtures.

### Task 1.4: Update type audit documentation in types.ts

**FR**: FR-7
**File**: `app/src/types.ts`
**Priority**: P1

**Description**: Update the header comment's type audit table (lines 7-42) to reflect v7.11.0 import surface. Add new rows for governance barrel imports (TaskType, TaskTypeCohort, ReputationEvent variants, ScoringPathLog, hash chain utilities). Update protocol maturity level from "Level 4 (Civilizational) ACHIEVED" to "Level 6+ with task-dimensional vocabulary". Add note about ADR-001 collision resolution.

**Acceptance Criteria**:
- [ ] Type audit table includes all v7.11.0 governance imports
- [ ] Protocol maturity comment updated to Level 6+
- [ ] ADR-001 collision resolution noted (GovernanceTaskType alias)
- [ ] Version references updated from v7.9.2 to v7.11.0

**Testing**: N/A (documentation only).

### Task 1.5: Run full test suite — regression gate

**FR**: H-6
**Priority**: P0

**Description**: Run `cd app && npx vitest run` to verify all 1011+ existing tests pass after the type migration. This is the Sprint 1 gate — no progression to Sprint 2 if regressions exist.

**Acceptance Criteria**:
- [ ] All existing test files pass (0 failures)
- [ ] No TypeScript compilation errors
- [ ] Test count >= 1011 (no tests lost)

**Testing**: Full vitest suite execution.

### Task 1.6: npm install refresh

**FR**: Technical
**Priority**: P0 (prerequisite for all other tasks)

**Description**: Run `cd app && npm install` to refresh the `@0xhoneyjar/loa-hounfour` symlink from `file:../../loa-hounfour`. This ensures the v7.11.0 dist/ files are available. Verify the governance barrel exports resolve.

**Acceptance Criteria**:
- [ ] `npm install` completes without errors
- [ ] `node -e "require('@0xhoneyjar/loa-hounfour/governance')"` resolves
- [ ] `computeScoringPathHash` is importable from governance barrel

**Testing**: Import verification.

---

## Sprint 2: Hash Chain Implementation & Conformance

**Global ID**: 61
**Goal**: Implement scoring path hash chain audit trail. Extend conformance suite with governance schemas. Harden and verify.
**Success Criteria**: H-4 (hash chain operational), H-5 (conformance vectors), H-6 (zero regressions)
**Depends on**: Sprint 1 complete (ScoringPathLog must be hounfour version)

### Task 2.1: Create ScoringPathTracker service

**FR**: FR-5
**File**: `app/src/services/scoring-path-tracker.ts` (NEW)
**Priority**: P0

**Description**: Implement the `ScoringPathTracker` class per SDD §3.3. The tracker manages hash chain state — each call to `record()` computes `entry_hash` via `computeScoringPathHash()` (RFC 8785 + SHA-256) and links to the previous entry via `previous_hash`. First entry links to `SCORING_PATH_GENESIS_HASH`.

**Implementation**:
- Import `computeScoringPathHash`, `SCORING_PATH_GENESIS_HASH` from hounfour governance
- Class with `lastHash` private field (initialized to genesis)
- `record(entry)` method: computes hash, updates chain, returns full `ScoringPathLog`
- `reset()` method: resets chain to genesis
- `tipHash` getter: returns current chain tip

**Acceptance Criteria**:
- [ ] `ScoringPathTracker` class implemented with `record()`, `reset()`, `tipHash`
- [ ] First record() call produces `previous_hash: SCORING_PATH_GENESIS_HASH`
- [ ] Consecutive record() calls chain correctly (entry N's previous_hash = entry N-1's entry_hash)
- [ ] `entry_hash` is deterministic for same inputs
- [ ] `scored_at` timestamp included in every entry
- [ ] Hash pair constraint: both entry_hash and previous_hash always present

**Testing**: 5+ test scenarios in `scoring-path-tracker.test.ts`:
1. Genesis hash for first entry
2. Chain linking across 3 consecutive entries
3. Determinism (same input → same hash)
4. Reset returns to genesis
5. Field stripping (extra fields don't affect hash)

### Task 2.2: Integrate ScoringPathTracker into conviction-boundary.ts

**FR**: FR-5
**File**: `app/src/services/conviction-boundary.ts`
**Priority**: P0

**Description**: Add optional `scoringPathTracker` parameter to `EconomicBoundaryOptions`. When provided, use `tracker.record()` to produce hash-linked scoring path entries instead of plain objects. When absent, produce plain entries (backward compatible).

**Implementation** (per SDD §3.4):
- Add `scoringPathTracker?: ScoringPathTracker` to `EconomicBoundaryOptions` interface
- Add `reason` strings to all 3 scoring path branches
- Use `tracker.record()` when tracker is available, plain object otherwise
- Import `ScoringPathTracker` from new module

**Acceptance Criteria**:
- [ ] `EconomicBoundaryOptions.scoringPathTracker` is optional
- [ ] When tracker provided: `entry_hash` and `previous_hash` present on scoring path
- [ ] When tracker absent: scoring path is plain object (backward compatible)
- [ ] `reason` field populated for all 3 paths (task_cohort, aggregate, tier_default)
- [ ] `console.debug` log includes hash chain fields when present

**Testing**: 4+ scenarios in `conviction-boundary-hashchain.test.ts`:
1. Tier default with tracker → has entry_hash + previous_hash (genesis)
2. Task cohort with tracker → has entry_hash chained from previous
3. Aggregate with tracker → chain integrity
4. No tracker → plain object (no hash fields) — backward compat

### Task 2.3: Extend conformance suite with governance schemas

**FR**: FR-6
**File**: `app/src/services/conformance-suite.ts`
**Priority**: P1

**Description**: Add governance schema validation to the conformance suite per SDD §3.5. Import `TaskTypeSchema`, `TaskTypeCohortSchema`, `ReputationEventSchema`, `ScoringPathLogSchema` from hounfour governance. Add 4 new schema names to `ConformanceSchemaName`. Add 8 sample payloads covering protocol types, community types, event variants, and hash chain entries. Extend `validatePayload()` with governance schema branches. Extend `runFullSuite()` to include them.

**Acceptance Criteria**:
- [ ] `ConformanceSchemaName` includes `taskType`, `taskTypeCohort`, `reputationEvent`, `scoringPathLog`
- [ ] `TaskTypeSchema` validates protocol literal (`'code_review'`)
- [ ] `TaskTypeSchema` validates community pattern (`'legal-guild:contract_review'`)
- [ ] `TaskTypeCohortSchema` validates full cohort with `confidence_threshold`
- [ ] `ReputationEventSchema` validates all 3 variants (quality_signal, task_completed, credential_update)
- [ ] `ScoringPathLogSchema` validates entry with hash chain fields
- [ ] `ScoringPathLogSchema` validates entry without hash chain (backward compat)
- [ ] `runFullSuite()` includes all new schemas and passes

**Testing**: 3+ scenarios in `hounfour-v711-conformance.test.ts`:
1. All governance sample payloads pass validation
2. Invalid payloads rejected (wrong TaskType format, missing event fields)
3. Full suite passes with governance schemas included

### Task 2.4: Run full test suite — final regression gate

**FR**: H-6
**Priority**: P0

**Description**: Run complete test suite. Verify all existing tests + new tests pass. Final gate before sprint completion.

**Acceptance Criteria**:
- [ ] All existing tests pass (0 failures)
- [ ] New tests pass: scoring-path-tracker, conviction-boundary-hashchain, hounfour-v711-conformance
- [ ] Total test count > 1011 (new tests added)
- [ ] No TypeScript compilation errors
- [ ] `console.debug` output for scoring paths is valid JSON

**Testing**: Full vitest suite execution.

### Task 2.5: Validate hash chain end-to-end

**FR**: FR-5, H-4
**Priority**: P1

**Description**: Write an integration-style test that exercises the full flow: create a ScoringPathTracker, run 3 economic boundary evaluations with different scoring paths (tier_default → aggregate → task_cohort), and verify the hash chain links correctly across all 3.

**Acceptance Criteria**:
- [ ] 3 consecutive evaluations produce a valid 3-entry hash chain
- [ ] Entry 1: `previous_hash = SCORING_PATH_GENESIS_HASH`
- [ ] Entry 2: `previous_hash = entry_1.entry_hash`
- [ ] Entry 3: `previous_hash = entry_2.entry_hash`
- [ ] Each `entry_hash` can be independently recomputed from content fields
- [ ] Tracker's `tipHash` matches last entry's `entry_hash`

**Testing**: Integration test in `conviction-boundary-hashchain.test.ts`.

### Task 2.6: Validate validateTaskCohortUniqueness integration

**FR**: FR-2
**Priority**: P1

**Description**: Verify that `validateTaskCohortUniqueness()` (imported from hounfour) correctly validates Dixie's `DixieReputationAggregate.task_cohorts` arrays. Write tests that confirm: unique cohorts pass, duplicate (model_id, task_type) pairs fail.

**Acceptance Criteria**:
- [ ] `validateTaskCohortUniqueness([])` returns true (empty)
- [ ] Unique cohorts (different model_id or task_type) return true
- [ ] Duplicate (model_id, task_type) pair returns false
- [ ] Function is accessible via re-export from `reputation-evolution.ts`

**Testing**: 3 scenarios in existing or new test file.

---

## Dependencies

```
Task 1.6 (npm install)
    │
    ├──→ Task 1.1 (re-export barrel)
    │        │
    │        ├──→ Task 1.2 (reputation-service)
    │        ├──→ Task 1.3 (conviction-boundary)
    │        └──→ Task 1.4 (type audit)
    │
    └──→ Task 1.5 (regression gate)
              │
              ├──→ Task 2.1 (ScoringPathTracker)
              │        │
              │        └──→ Task 2.2 (integration)
              │                 │
              │                 ├──→ Task 2.4 (final gate)
              │                 └──→ Task 2.5 (E2E validation)
              │
              ├──→ Task 2.3 (conformance suite)
              └──→ Task 2.6 (uniqueness validation)
```

## Risk Mitigation

| Risk | Sprint | Mitigation |
|---|---|---|
| Re-export barrel breaks imports | 1 | Task 1.5 regression gate before Sprint 2 |
| Hounfour governance barrel missing exports | 1 | Task 1.6 verifies imports before code changes |
| Hash chain performance | 2 | SHA-256 is ~1ms; only runs once per boundary evaluation |
| Open enum accepts unexpected values | 1 | Conformance suite (Task 2.3) validates both valid and invalid |

---

*Sprint plan for cycle-005: 2 sprints, 12 tasks, focused on type migration (Sprint 1) and hash chain implementation (Sprint 2). All changes are internal — zero API surface changes.*
