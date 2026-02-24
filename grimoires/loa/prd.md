# PRD: Hounfour v7.11.0 Full Adoption — Task-Dimensional Protocol Compliance

**Version**: 5.0.0
**Date**: 2026-02-24
**Author**: Merlin (Product), Claude (Synthesis)
**Cycle**: cycle-005
**Status**: Draft
**Predecessor**: cycle-004 PRD v4.0.0 (Tag Release v2.0.0)

> Sources: loa-finn#66 §6 Sprint A (Protocol Adoption), loa-hounfour CHANGELOG v7.10.0–v7.11.0,
> cycle-003 (Hounfour v7.9.2 Full Adoption, 12 sprints — Level 6 foundation),
> Migration surface analysis (5 files, 3 critical replacements, 1 new feature)

---

## 1. Problem Statement

Dixie achieved Hounfour Level 6 protocol compliance in cycle-003 against v7.9.2. Since then, Hounfour has advanced through three releases (v7.10.0, v7.10.1, v7.11.0) totaling **261 files changed, +4671/-685 lines**. These releases upstream Dixie's own task-dimensional reputation types into the shared protocol — the exact types Dixie defined locally in Sprint 52.

**The gap**: Dixie has **local stub definitions** for types that now exist as **canonical protocol exports** in Hounfour. Specifically:

| Local Type | File | Hounfour Canonical | Gap |
|---|---|---|---|
| `TaskType` (fixed 5-type array) | `types/reputation-evolution.ts:36-45` | `TaskTypeSchema` (open enum + namespace:type) | Local is subset of protocol |
| `TaskTypeCohort` (ModelCohort &) | `types/reputation-evolution.ts:62-65` | `TaskTypeCohortSchema` (+confidence_threshold) | Missing protocol field |
| `ReputationEvent` (generic payload) | `types/reputation-evolution.ts:104-111` | `ReputationEventSchema` (3-variant discriminated union) | Underspecified stub |
| `ScoringPathLog` (3 fields) | `types/reputation-evolution.ts:122-129` | `ScoringPathLogSchema` (+hash chain, +reason, +scored_at) | Missing audit trail |

Additionally, Hounfour v7.11.0 introduces **hash chain infrastructure** (`computeScoringPathHash()`, `SCORING_PATH_GENESIS_HASH`) for scoring path audit trails — a feature Dixie should implement to complete its economic boundary observability.

**Why this matters**: Running local stubs alongside canonical protocol exports creates **drift risk**. Hounfour's types include validation schemas, conformance vectors, and constitutional constraints that local stubs lack. Every release widens the gap. The types were upstreamed *from* Dixie — adopting them back closes the loop.

> Sources: loa-hounfour CHANGELOG v7.10.0 ("upstream shared vocabulary from Dixie"),
> types/reputation-evolution.ts (local definitions), migration surface analysis

## 2. Product Vision

**Replace Dixie's local reputation type stubs with canonical Hounfour v7.11.0 protocol imports, and implement the scoring path hash chain audit trail.**

This is a **protocol adoption cycle** (like cycle-003), not a feature cycle. The types already exist on both sides — the work is replacing local definitions with shared contract imports, gaining schema validation, conformance vectors, and constitutional constraints for free.

The hash chain implementation is the one genuinely new feature: each scoring path decision in `conviction-boundary.ts` will produce a hash-linked audit entry, enabling tamper-evident scoring audit trails.

## 3. Success Metrics

| ID | Metric | Target |
|----|--------|--------|
| H-1 | Local type stubs eliminated | 0 local definitions for types available in Hounfour v7.11.0 |
| H-2 | Hounfour import coverage | All 4 type families imported from `@0xhoneyjar/loa-hounfour/governance` |
| H-3 | Open enum adoption | TaskType accepts community namespace:type pattern per ADR-003 |
| H-4 | Hash chain operational | Scoring path decisions produce hash-linked ScoringPathLog entries |
| H-5 | Conformance vectors | New v7.10.0–v7.11.0 vectors pass in Dixie's conformance suite |
| H-6 | Zero regressions | All existing tests pass (1011+ baseline) |
| H-7 | Type audit updated | `types.ts` header comment reflects v7.11.0 import surface |

## 4. Functional Requirements

### FR-1: Replace Local TaskType with Hounfour Open Enum

**Current**: `types/reputation-evolution.ts:36-45` defines `TASK_TYPES` as a fixed 5-element const array and `TaskType` as a derived union type.

**Target**: Import `TaskTypeSchema`, `TASK_TYPES`, and `type TaskType` from `@0xhoneyjar/loa-hounfour/governance`. The Hounfour version is an **open enum** (ADR-003) that accepts:
- 5 protocol-defined literals: `code_review`, `creative_writing`, `analysis`, `summarization`, `general`
- Community-defined pattern: `namespace:type` (e.g., `legal-guild:contract_review`)

**Acceptance Criteria**:
- [ ] Local `TASK_TYPES` const removed from `reputation-evolution.ts`
- [ ] Local `TaskType` type removed from `reputation-evolution.ts`
- [ ] `TaskType` and `TASK_TYPES` imported from hounfour governance barrel
- [ ] All files that import from `reputation-evolution.ts` updated if needed
- [ ] Community namespace:type pattern accepted by type system

> Sources: loa-hounfour src/governance/task-type.ts:42-76, ADR-003

### FR-2: Replace Local TaskTypeCohort with Hounfour Schema

**Current**: `types/reputation-evolution.ts:62-65` defines `TaskTypeCohort` as `ModelCohort & { readonly task_type: TaskType }`.

**Target**: Import `type TaskTypeCohort` from hounfour governance. The Hounfour version adds:
- `confidence_threshold` (integer, optional, default 30) — cold-start blending threshold
- Uses `COHORT_BASE_FIELDS` (shared leaf module, v7.10.1)
- `validateTaskCohortUniqueness()` helper for composite key validation

**Acceptance Criteria**:
- [ ] Local `TaskTypeCohort` removed from `reputation-evolution.ts`
- [ ] Imported from `@0xhoneyjar/loa-hounfour/governance`
- [ ] `DixieReputationAggregate` updated to use hounfour's `TaskTypeCohort`
- [ ] `validateTaskCohortUniqueness()` imported and used where task cohorts are constructed

> Sources: loa-hounfour src/governance/task-type-cohort.ts:26-74

### FR-3: Replace Local ReputationEvent with Hounfour Discriminated Union

**Current**: `types/reputation-evolution.ts:104-111` defines `ReputationEvent` as a generic interface with `type` discriminator and `payload: unknown`.

**Target**: Import the full discriminated union from hounfour governance:
- `ReputationEvent` (union of 3 variants)
- `QualitySignalEvent` — score (0-1), optional dimensions record, optional task_type
- `TaskCompletedEvent` — required task_type, success boolean, optional duration_ms
- `CredentialUpdateEvent` — credential_id (UUID), action enum

All variants share an envelope: `event_id` (UUID), `agent_id`, `collection_id`, `timestamp`, optional `sequence`.

**Acceptance Criteria**:
- [ ] Local `ReputationEvent` interface removed from `reputation-evolution.ts`
- [ ] All 4 types imported from hounfour governance barrel
- [ ] `reputation-service.ts` updated to use typed event variants (not `payload: unknown`)
- [ ] Event construction sites produce well-typed events with required envelope fields
- [ ] `reconstructAggregateFromEvents()` stub updated with typed event handling

> Sources: loa-hounfour src/governance/reputation-event.ts:133-145

### FR-4: Replace Local ScoringPathLog with Hounfour Schema

**Current**: `types/reputation-evolution.ts:122-129` defines `ScoringPathLog` with 3 fields (path, model?, task_type?).

**Target**: Import `ScoringPath` and `ScoringPathLog` from hounfour governance. The Hounfour version adds:
- `model_id` (replaces `model`) — field name alignment
- `reason` (string, max 500 chars) — human explanation
- `scored_at` (ISO 8601) — timestamp
- `entry_hash` (sha256: format) — content hash
- `previous_hash` (sha256: format) — chain link

**Acceptance Criteria**:
- [ ] Local `ScoringPathLog` interface removed from `reputation-evolution.ts`
- [ ] `ScoringPath` and `ScoringPathLog` imported from hounfour governance
- [ ] Field name `model` updated to `model_id` at all usage sites
- [ ] `conviction-boundary.ts` produces ScoringPathLog entries with all required fields

> Sources: loa-hounfour src/governance/scoring-path-log.ts:26-81

### FR-5: Implement Scoring Path Hash Chain

**Current**: No hash chain implementation exists. Scoring path decisions are not hash-linked.

**Target**: Implement hash chain audit trail using hounfour's `computeScoringPathHash()` and `SCORING_PATH_GENESIS_HASH`:

1. Each scoring path decision in `conviction-boundary.ts` produces a `ScoringPathLog` entry
2. `entry_hash` is computed via `computeScoringPathHash()` (RFC 8785 canonical JSON + SHA-256)
3. `previous_hash` chains to the prior entry's `entry_hash` (or `SCORING_PATH_GENESIS_HASH` for first entry)
4. `scored_at` timestamp records evaluation time
5. Hash pair constraint: both `entry_hash` and `previous_hash` present or both absent

**Acceptance Criteria**:
- [ ] `computeScoringPathHash` and `SCORING_PATH_GENESIS_HASH` imported from hounfour governance
- [ ] Scoring path hash computed for each economic boundary evaluation
- [ ] Hash chain links consecutive scoring decisions (previous_hash → prior entry_hash)
- [ ] Genesis hash used for first entry in a chain
- [ ] Hash chain entries include `scored_at` timestamp
- [ ] Tests verify hash chain integrity (determinism, chain linking, genesis sentinel)

> Sources: loa-hounfour src/governance/scoring-path-hash.ts:49-65,
> constraints/ScoringPathLog.constraints.json (scoring-path-hash-pair, scoring-path-chain-integrity)

### FR-6: Update Conformance Suite

**Current**: Conformance suite validates against v7.9.2 schemas (7 schema types).

**Target**: Extend conformance coverage to include v7.11.0 governance schemas:
- TaskType validation (protocol + community patterns)
- TaskTypeCohort validation (including uniqueness constraint)
- ReputationEvent validation (all 3 variants)
- ScoringPathLog validation (including hash chain constraints)

**Acceptance Criteria**:
- [ ] Conformance suite schema enum extended with governance types
- [ ] Sample payloads added for new schema types
- [ ] v7.10.0–v7.11.0 conformance vectors referenced in test assertions
- [ ] `runFullSuite()` includes governance schema validation

> Sources: services/conformance-suite.ts:24-204

### FR-7: Update Type Audit Documentation

**Current**: `types.ts` header comment documents v7.9.2 import surface (12 imports across 8 files).

**Target**: Update the type audit table to reflect v7.11.0 imports, including:
- New governance barrel imports (TaskType, TaskTypeCohort, ReputationEvent variants, ScoringPathLog)
- Hash chain utilities (computeScoringPathHash, SCORING_PATH_GENESIS_HASH)
- ADR-001 aliasing note (GovernanceTaskType vs core TaskType)

**Acceptance Criteria**:
- [ ] Type audit table in `types.ts` updated with all v7.11.0 imports
- [ ] Protocol maturity level updated (Level 6 → Level 6+ with task-dimensional vocabulary)
- [ ] ADR-001 collision resolution documented

## 5. Non-Functional Requirements

### NFR-1: Zero Breaking Changes

All changes are internal type replacements. No public API surface changes. No new routes, no changed response shapes. External consumers see identical behavior.

### NFR-2: Backward Compatibility

- `DixieReputationAggregate.task_cohorts` remains optional (backward compatible with pre-task-type aggregates)
- Hash chain fields on `ScoringPathLog` are optional per Hounfour schema (existing logs without hashes remain valid)
- `confidence_threshold` on `TaskTypeCohort` has a default value (30) — existing cohorts without it are valid

### NFR-3: Test Coverage

- All existing 1011+ tests must pass unchanged
- New tests for: hash chain computation, chain integrity, typed event construction, open enum validation
- Minimum 3 test scenarios per new feature per EDD policy

## 6. Technical Constraints

| Constraint | Detail |
|---|---|
| Hounfour version | v7.11.0 (local: `file:../../loa-hounfour`) |
| Import barrels | `@0xhoneyjar/loa-hounfour/governance` (primary), root barrel for aliased exports |
| ADR-001 compliance | Use `GovernanceTaskType` alias when importing from root barrel; unaliased from governance sub-package |
| ADR-004 compliance | TaskType assigned exogenously by routing layer — Dixie already compliant (no changes needed) |
| Hash algorithm | SHA-256 via `@noble/hashes` (browser-compatible, not `node:crypto`) |
| Canonicalization | RFC 8785 (JSON Canonicalization Scheme) for deterministic hash inputs |
| Native enforcement | Constraints with `expression: "true"` sentinel require runtime validation per ADR-002 |

## 7. Scope

### In Scope

- Replace 4 local type definitions with canonical hounfour imports
- Implement scoring path hash chain audit trail
- Extend conformance suite with governance schemas
- Update type audit documentation
- Add tests for all new functionality

### Out of Scope

- E2E cross-system integration (loa-finn#66 Sprint B — separate cycle)
- Production deployment (loa-finn#66 Sprint C — separate cycle)
- NFT personality surfacing (loa-finn#66 Sprint D — separate cycle)
- Event sourcing full implementation (`reconstructAggregateFromEvents()` remains stub — requires persistence layer design)
- Community TaskType registry infrastructure (ADR-003 Tier 2 — future governance feature)
- New API endpoints or route changes

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Type shape mismatch between local stubs and hounfour schemas | Low | Medium | Migration analysis confirmed compatibility; hounfour types are supersets |
| Hash chain performance overhead | Low | Low | Hash is computed once per scoring decision (~1ms); not on hot path |
| `@noble/hashes` dependency | Low | Low | Already a transitive dependency of hounfour; no new dep for Dixie |
| Open enum allowing unexpected community types | Medium | Low | Protocol types validated at schema level; community pattern validated by regex |
| Conformance suite expansion increases test time | Low | Low | Governance schemas are small; marginal test time increase |

## 9. Dependencies

| Dependency | Type | Status |
|---|---|---|
| `@0xhoneyjar/loa-hounfour` v7.11.0 | Local package | Available at `../../loa-hounfour` |
| `@noble/hashes` | Transitive (via hounfour) | Already installed |
| Hounfour ADR-001 (barrel precedence) | Convention | Published in hounfour docs/adr/ |
| Hounfour ADR-002 (native enforcement sentinel) | Convention | Published in hounfour docs/adr/ |
| Hounfour ADR-003 (TaskType governance) | Convention | Published in hounfour docs/adr/ |
| Hounfour ADR-004 (exogenous task type) | Meta-constraint | Already compliant |
| Hounfour ADR-005 (enum governance) | Convention | Published in hounfour docs/adr/ |

## 10. Estimated Effort

| Sprint | Focus | Tasks (est.) |
|---|---|---|
| Sprint 1 | Type migration (FR-1 through FR-4) + type audit (FR-7) | 5-7 |
| Sprint 2 | Hash chain implementation (FR-5) + conformance (FR-6) + hardening | 5-7 |

**Estimated: 2 sprints.** This is a focused adoption cycle — all types are already designed and tested in hounfour. The work is mechanical replacement plus one new feature (hash chain).

---

*This PRD scopes the narrow adoption of loa-hounfour v7.11.0 into loa-dixie, replacing local type stubs with canonical protocol imports and implementing the scoring path hash chain audit trail. Broader launch readiness items from loa-finn#66 are deferred to subsequent cycles.*
