# SDD: Hounfour v7.11.0 Full Adoption — Task-Dimensional Protocol Compliance

**Version**: 5.0.0
**Date**: 2026-02-24
**Author**: Merlin (Product), Claude (Architecture)
**Cycle**: cycle-005
**Status**: Draft
**PRD Reference**: `grimoires/loa/prd.md` v5.0.0
**Predecessor**: SDD v3.0.0 (cycle-003, Hounfour v7.9.2 Full Adoption)

---

## 1. Executive Summary

This SDD designs the migration of 4 local type definitions to canonical Hounfour v7.11.0 imports, plus the implementation of a scoring path hash chain audit trail. The architecture is a **type replacement pattern** — no new modules, no new routes, no structural changes. Five existing files are modified, one new service module is added (scoring path tracker), and the conformance suite is extended.

The design follows the precedent set in cycle-003 (v7.9.2 adoption): replace local stubs with protocol imports, update consumers, extend conformance coverage, and verify zero regressions.

## 2. Architecture Overview

### 2.1 Change Topology

```
                    @0xhoneyjar/loa-hounfour v7.11.0
                    ┌──────────────────────────────────┐
                    │  /governance barrel               │
                    │  ├── TaskType, TASK_TYPES         │
                    │  ├── TaskTypeCohort               │
                    │  ├── validateTaskCohortUniqueness  │
                    │  ├── ReputationEvent (union)      │
                    │  │   ├── QualitySignalEvent       │
                    │  │   ├── TaskCompletedEvent       │
                    │  │   └── CredentialUpdateEvent    │
                    │  ├── ScoringPath, ScoringPathLog  │
                    │  ├── computeScoringPathHash       │
                    │  └── SCORING_PATH_GENESIS_HASH    │
                    └──────────┬───────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
          ▼                    ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ reputation-      │ │ conviction-      │ │ conformance-     │
│ evolution.ts     │ │ boundary.ts      │ │ suite.ts         │
│ (type source)    │ │ (hash chain)     │ │ (validation)     │
│                  │ │                  │ │                  │
│ REMOVES local    │ │ ADDS hash chain  │ │ EXTENDS schema   │
│ definitions,     │ │ tracking via     │ │ coverage with    │
│ RE-EXPORTS from  │ │ ScoringPath      │ │ governance       │
│ hounfour         │ │ Tracker          │ │ types            │
└────────┬─────────┘ └────────┬─────────┘ └──────────────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐ ┌──────────────────┐
│ reputation-      │ │ scoring-path-    │
│ service.ts       │ │ tracker.ts       │
│ (consumers)      │ │ (NEW module)     │
│                  │ │                  │
│ UPDATE imports   │ │ Hash chain state │
│ to use hounfour  │ │ management +     │
│ typed events     │ │ computation      │
└──────────────────┘ └──────────────────┘
```

### 2.2 Files Modified

| File | Change Type | FR |
|---|---|---|
| `app/src/types/reputation-evolution.ts` | **Major**: Remove 4 local definitions, re-export from hounfour | FR-1,2,3,4 |
| `app/src/services/reputation-service.ts` | **Medium**: Update imports, typed event handling | FR-3 |
| `app/src/services/conviction-boundary.ts` | **Medium**: Add hash chain tracking, update ScoringPathLog usage | FR-4,5 |
| `app/src/services/scoring-path-tracker.ts` | **New**: Hash chain state management | FR-5 |
| `app/src/services/conformance-suite.ts` | **Medium**: Extend with governance schemas | FR-6 |
| `app/src/types.ts` | **Minor**: Update type audit documentation | FR-7 |

## 3. Component Design

### 3.1 Type Migration — reputation-evolution.ts (FR-1, FR-2, FR-3, FR-4)

**Strategy**: Replace local definitions with re-exports from hounfour. Preserve `DixieReputationAggregate` as the one Dixie-specific extension type.

**Before** (current):
```typescript
// Local definitions
export const TASK_TYPES = ['code_review', ...] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export type TaskTypeCohort = ModelCohort & { readonly task_type: TaskType };
export interface ReputationEvent { type: string; timestamp: string; payload: unknown; }
export interface ScoringPathLog { path: ...; model?: string; task_type?: TaskType; }
```

**After** (target):
```typescript
// Canonical protocol imports — re-exported for consumer convenience
export {
  TASK_TYPES,
  type TaskType,
  type TaskTypeCohort,
  validateTaskCohortUniqueness,
} from '@0xhoneyjar/loa-hounfour/governance';

export type {
  ReputationEvent,
  QualitySignalEvent,
  TaskCompletedEvent,
  CredentialUpdateEvent,
} from '@0xhoneyjar/loa-hounfour/governance';

export type {
  ScoringPath,
  ScoringPathLog,
} from '@0xhoneyjar/loa-hounfour/governance';

// Dixie-specific extension — extends Hounfour's ReputationAggregate
// with task-type cohort tracking
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';
import type { TaskTypeCohort } from '@0xhoneyjar/loa-hounfour/governance';

export type DixieReputationAggregate = ReputationAggregate & {
  readonly task_cohorts?: TaskTypeCohort[];
};
```

**Key design decisions**:

1. **Re-export pattern**: `reputation-evolution.ts` becomes a re-export barrel rather than a definition file. This preserves the existing import paths for all consumers — no files outside this module need import path changes.

2. **DixieReputationAggregate stays local**: This type extends hounfour's `ReputationAggregate` with Dixie-specific `task_cohorts`. It is NOT in hounfour and should remain local.

3. **Field name migration**: Hounfour's `ScoringPathLog` uses `model_id` where Dixie used `model`. The conviction-boundary.ts code at line 259 (`model: activeCohort.model_id`) already assigns from `model_id` — the field name change in the type definition aligns with existing usage.

### 3.2 Reputation Service Updates (FR-3)

**Scope**: Import path changes + typed event handling in the store interface.

**Changes**:

1. **Import source**: Change `from '../types/reputation-evolution.js'` to use the re-export barrel (no path change needed since reputation-evolution.ts will re-export from hounfour).

2. **Store interface**: `appendEvent()` and `getEventHistory()` signatures remain the same — they accept/return `ReputationEvent`. The type becomes more specific (discriminated union instead of generic interface), which is backward-compatible.

3. **reconstructAggregateFromEvents()**: Update `contract_version` from `'7.9.2'` to `'7.11.0'`. The function remains a stub per PRD scope (event sourcing deferred).

4. **Re-exports at bottom**: Update to re-export the new types (`QualitySignalEvent`, `TaskCompletedEvent`, `CredentialUpdateEvent`, `ScoringPath`).

### 3.3 Scoring Path Tracker — NEW (FR-5)

**Purpose**: Manage hash chain state for scoring path audit entries. Each evaluation produces a `ScoringPathLog` entry with `entry_hash` and `previous_hash` linking to the prior entry.

**Module**: `app/src/services/scoring-path-tracker.ts`

```typescript
import type { ScoringPathLog } from '@0xhoneyjar/loa-hounfour/governance';
import {
  computeScoringPathHash,
  SCORING_PATH_GENESIS_HASH,
} from '@0xhoneyjar/loa-hounfour/governance';

export class ScoringPathTracker {
  private lastHash: string;

  constructor() {
    this.lastHash = SCORING_PATH_GENESIS_HASH;
  }

  /**
   * Record a scoring path decision with hash chain linking.
   *
   * Computes entry_hash from content fields via RFC 8785 canonical JSON,
   * and links to the previous entry via previous_hash.
   */
  record(entry: {
    path: 'task_cohort' | 'aggregate' | 'tier_default';
    model_id?: string;
    task_type?: string;
    reason?: string;
  }): ScoringPathLog {
    const scored_at = new Date().toISOString();
    const previous_hash = this.lastHash;

    const entry_hash = computeScoringPathHash({
      path: entry.path,
      model_id: entry.model_id,
      task_type: entry.task_type,
      reason: entry.reason,
      scored_at,
    });

    this.lastHash = entry_hash;

    return {
      ...entry,
      scored_at,
      entry_hash,
      previous_hash,
    };
  }

  /** Reset the chain (e.g., for a new session). */
  reset(): void {
    this.lastHash = SCORING_PATH_GENESIS_HASH;
  }

  /** Get the current chain tip hash. */
  get tipHash(): string {
    return this.lastHash;
  }
}
```

**Design decisions**:

1. **Class with mutable state**: The tracker holds `lastHash` as mutable state because hash chains are inherently sequential — each entry depends on the previous. A per-request instance or per-session singleton are both valid usage patterns.

2. **Injection into conviction-boundary**: The tracker will be passed as an optional parameter to `evaluateEconomicBoundaryForWallet()` via the `EconomicBoundaryOptions` interface. When absent, no hash chain is computed (backward compatible).

3. **No persistence**: Hash chain entries are logged via `console.debug` (matching existing scoring path logging at conviction-boundary.ts:282). Persistence is a future concern — the chain provides in-memory audit trail and can be serialized to the event log later.

### 3.4 Conviction Boundary Integration (FR-4, FR-5)

**Changes to `evaluateEconomicBoundaryForWallet()`**:

1. **Import update**: Replace `ScoringPathLog` import from local types with hounfour governance.

2. **ScoringPathLog field alignment**: Change `model:` to `model_id:` at the construction site (line 259). Add `reason` field with descriptive text.

3. **Hash chain integration**: When a `ScoringPathTracker` is provided in options, use it to produce hash-linked entries instead of plain objects.

**Options extension**:
```typescript
export interface EconomicBoundaryOptions {
  criteria?: QualificationCriteria;
  budgetPeriodDays?: number;
  reputationAggregate?: ReputationAggregate | DixieReputationAggregate | null;
  taskType?: TaskType;
  /** Optional scoring path tracker for hash chain audit trail. */
  scoringPathTracker?: ScoringPathTracker;
}
```

**Scoring path construction** (replaces lines 228-277):
```typescript
// Build the scoring path entry
let scoringEntry: { path: ...; model_id?: string; task_type?: string; reason?: string };

if (usedTaskCohort) {
  scoringEntry = {
    path: 'task_cohort' as const,
    model_id: activeCohort.model_id,
    task_type: taskType,
    reason: `Task cohort match: ${activeCohort.model_id}/${taskType}`,
  };
} else if (reputationAggregate?.personal_score !== null) {
  scoringEntry = {
    path: 'aggregate' as const,
    reason: 'Aggregate personal score available',
  };
} else {
  scoringEntry = {
    path: 'tier_default' as const,
    reason: `Cold start: tier ${tier}`,
  };
}

// Produce hash-linked entry when tracker is available, plain entry otherwise
const scoringPath: ScoringPathLog = opts?.scoringPathTracker
  ? opts.scoringPathTracker.record(scoringEntry)
  : scoringEntry;
```

### 3.5 Conformance Suite Extension (FR-6)

**Strategy**: Add governance schema validation alongside existing core schema validation.

**New schema names** added to `ConformanceSchemaName`:
```typescript
export type ConformanceSchemaName =
  | 'accessPolicy'
  | 'conversationSealingPolicy'
  | 'streamEvent'
  | 'billingEntry'
  | 'domainEvent'
  | 'agentDescriptor'
  | 'healthStatus'
  // v7.11.0 governance schemas
  | 'taskType'
  | 'taskTypeCohort'
  | 'reputationEvent'
  | 'scoringPathLog';
```

**New imports**:
```typescript
import {
  TaskTypeSchema,
  TaskTypeCohortSchema,
  ReputationEventSchema,
  ScoringPathLogSchema,
} from '@0xhoneyjar/loa-hounfour/governance';
```

**New sample payloads** added to `getSamplePayloads()`:

| Schema | Sample | Description |
|---|---|---|
| `taskType` | `'code_review'` | Protocol-defined literal |
| `taskType` | `'legal-guild:contract_review'` | Community namespace:type |
| `taskTypeCohort` | Full cohort with confidence_threshold | Validates all fields |
| `reputationEvent` (quality_signal) | Score 0.85, with task_type | Quality observation |
| `reputationEvent` (task_completed) | Success, 1500ms duration | Task completion |
| `reputationEvent` (credential_update) | Action: 'issued' | Credential event |
| `scoringPathLog` | task_cohort path with hash chain | Full audit entry |
| `scoringPathLog` | tier_default path without hash chain | Backward-compatible entry |

### 3.6 Type Audit Update (FR-7)

Update the header comment in `app/src/types.ts` to document v7.11.0 imports:

**New rows in the import table**:

| File | Import | Barrel |
|---|---|---|
| types/reputation-evolution | TaskType, TASK_TYPES, TaskTypeCohort, validateTaskCohortUniqueness | governance |
| types/reputation-evolution | ReputationEvent, QualitySignalEvent, TaskCompletedEvent, CredentialUpdateEvent | governance |
| types/reputation-evolution | ScoringPath, ScoringPathLog | governance |
| services/scoring-path-tracker | computeScoringPathHash, SCORING_PATH_GENESIS_HASH | governance |
| services/conformance-suite | TaskTypeSchema, TaskTypeCohortSchema, ReputationEventSchema, ScoringPathLogSchema | governance |

**Protocol maturity update**: Level 6 → Level 6+ (task-dimensional vocabulary adopted from protocol).

## 4. Data Architecture

No database changes. No new tables. No migration files.

The hash chain is in-memory only — `ScoringPathTracker` holds `lastHash` as instance state. Hash chain entries are logged via `console.debug` for observability.

**Future consideration**: When event sourcing is implemented (out of scope), `ScoringPathLog` entries with hash chain fields can be persisted to the reputation event log for tamper-evident audit trails.

## 5. API Design

No API changes. No new endpoints. No changed response shapes. All changes are internal type migrations.

## 6. Security Architecture

### 6.1 Hash Chain Integrity

The scoring path hash chain uses:
- **SHA-256** via `@noble/hashes` (constant-time, browser-compatible)
- **RFC 8785** canonical JSON for deterministic serialization
- **Runtime field stripping** prevents structural subtyping leakage into hash input

**Threat model**: The hash chain provides tamper evidence, not tamper prevention. If an attacker can modify the tracker's memory, they can forge entries. This is acceptable for the current use case (observability/audit) — production tamper prevention requires persistence to an append-only store (deferred).

### 6.2 Open Enum Safety

Hounfour's `TaskType` open enum accepts community-defined patterns (`namespace:type`). Dixie validates task types via schema validation (TypeBox) which enforces:
- Protocol types: exact literal match
- Community types: regex pattern `^[a-z][a-z0-9_-]+:[a-z][a-z0-9_]+$`

No injection risk — task types are used as classification labels, never as executable code or SQL parameters.

### 6.3 ADR-004 Compliance

Task types are assigned exogenously by Dixie's routing layer, not by scored models. This is already the case in the current architecture (conviction-boundary.ts receives `taskType` from the request context, not from model output). No changes needed.

## 7. Testing Strategy

### 7.1 Type Migration Tests

Existing tests (1011+) serve as regression suite. No test file changes expected — the re-export pattern preserves import paths.

### 7.2 New Tests

| Test File | Scope | Scenarios (min 3 per EDD) |
|---|---|---|
| `scoring-path-tracker.test.ts` | Hash chain computation | Genesis hash, chain linking, determinism, reset, field stripping |
| `hounfour-v711-conformance.test.ts` | Governance schema validation | All 8 new sample payloads (protocol types, community types, event variants, hash chain) |
| `conviction-boundary-hashchain.test.ts` | Integration: boundary eval + hash chain | Tier default with hash, task cohort with hash, aggregate with hash, no tracker (backward compat) |

### 7.3 Test Execution

```bash
cd app && npx vitest run
```

All tests in `app/tests/` directory, executed via vitest.

## 8. Migration Safety

### 8.1 Re-export Compatibility

The re-export pattern (`reputation-evolution.ts` re-exports from hounfour) ensures **zero import path changes** for consumers. Files importing from `'../types/reputation-evolution.js'` continue to work.

**Verification**: After migration, search for all imports from `reputation-evolution` and confirm they resolve.

### 8.2 Type Compatibility

| Local Type | Hounfour Type | Compatible? | Notes |
|---|---|---|---|
| `TaskType` (string union) | `TaskType` (string union + pattern) | Yes — superset | Open enum accepts all previous values plus community types |
| `TaskTypeCohort` (ModelCohort &) | `TaskTypeCohort` (base fields + task_type + confidence_threshold) | Yes — superset | Adds optional `confidence_threshold` (default 30) |
| `ReputationEvent` (generic) | `ReputationEvent` (discriminated union) | Yes — narrowing | More specific types are assignable where generic was expected |
| `ScoringPathLog` (3 fields) | `ScoringPathLog` (7 fields) | Yes — superset | New fields are all optional |

### 8.3 Rollback

If issues are discovered post-migration:
1. Revert the re-export in `reputation-evolution.ts` to local definitions
2. All consumers continue working (import paths unchanged)
3. No database migration to revert, no API contract changes

## 9. Technical Risks

| Risk | Mitigation |
|---|---|
| Hounfour governance barrel not exporting expected symbols | Verified: dist/governance/ contains all .d.ts files; checked exports manually |
| `computeScoringPathHash` relies on `@noble/hashes` not in Dixie's direct deps | Verified: transitive via hounfour; also `@noble/hashes` is a pure-JS package with no native addons |
| TypeBox schema validation differs from TypeScript type checking | Conformance suite validates runtime shapes; TypeScript validates compile-time types. Both must pass. |

## 10. Deployment

No deployment changes. No infrastructure changes. No environment variable changes. No Docker changes.

The `file:../../loa-hounfour` dependency already points to v7.11.0 on disk. After implementation:
1. Run `npm install` in `app/` to refresh the symlink
2. TypeScript compilation validates all imports resolve
3. Tests verify runtime behavior

---

*This SDD designs a focused type migration from local stubs to canonical Hounfour v7.11.0 protocol imports, plus a scoring path hash chain audit trail. The architecture preserves all existing import paths via re-export, adds one new module (ScoringPathTracker), and extends conformance coverage. Zero API changes, zero database changes, zero deployment changes.*
