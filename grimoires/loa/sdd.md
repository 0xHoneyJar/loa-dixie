# SDD: Hounfour v8.2.0 Full Adoption — Commons Governance Substrate

**Version**: 7.0.0
**Date**: 2026-02-25
**Author**: Merlin (Product), Claude (Architecture)
**Cycle**: cycle-007
**Status**: Draft
**PRD Reference**: `grimoires/loa/prd.md` v7.0.0
**Predecessor**: SDD v6.0.0 (cycle-006, Phase 3 — Production Wiring)

---

## 1. Executive Summary

This SDD designs the deep adoption of loa-hounfour v8.2.0's commons governance substrate into Dixie. Unlike cycle-005 (type replacement) or cycle-006 (production wiring), this cycle **replaces local behavioral patterns** with protocol-canonical implementations. Eight existing service files are refactored, three new modules are created, the conformance suite is extended, and the autopoietic feedback loop is closed.

The architecture follows a **composition-over-replacement** strategy: existing services compose with commons primitives rather than being rewritten. `ScoringPathTracker` composes with `AuditTrail<T>`, `ReputationService` wraps `GovernedReputation`, state machines adopt `StateMachineConfig`, and conservation invariants are expressed as `ConservationLaw<T>` factory outputs. This preserves existing test coverage while gaining protocol verification.

### Change Surface

| Category | Files Modified | Files Created | Files Deprecated |
|----------|---------------|---------------|------------------|
| Tier 1: Protocol Compliance | 4 | 0 | 0 |
| Tier 2: Commons Substrate | 7 | 2 | 1 |
| Tier 3: Future-Ready | 2 | 1 | 0 |
| Cross-cutting | 3 | 0 | 0 |
| **Total** | **~12 unique** | **3** | **1** |

## 2. Architecture Overview

### 2.1 Change Topology

```
                @0xhoneyjar/loa-hounfour v8.2.0
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  /governance barrel (existing + v8.2.0)                   │
│  ├── ModelPerformanceEvent (NEW v8.2.0)                   │
│  ├── QualityObservation, QualityObservationSchema         │
│  ├── TaskType (now includes 'unspecified')                │
│  └── ReputationEvent (4-variant union)                    │
│                                                           │
│  /commons barrel (NEW v8.0.0–v8.2.0)                     │
│  ├── ConservationLaw, buildSumInvariant, ...              │
│  ├── GovernanceError (6-variant union)                    │
│  ├── GovernanceMutation, evaluateGovernanceMutation       │
│  ├── AuditTrail, createCheckpoint, verifyIntegrity        │
│  ├── GovernedCredits, GovernedReputation, GovernedFreshness│
│  ├── StateMachineConfig, State, Transition                │
│  ├── DynamicContract, ContractNegotiation                 │
│  ├── QuarantineStatus, QuarantineRecord                   │
│  └── HashChainDiscontinuity                               │
│                                                           │
└─────────────┬─────────────────────────┬───────────────────┘
              │                         │
    ┌─────────┴─────────┐     ┌────────┴────────────┐
    │  TIER 1            │     │  TIER 2              │
    │  Protocol Compliance│     │  Commons Substrate   │
    │                    │     │                      │
    │  quality-feedback  │     │  conservation-laws   │ (NEW)
    │  reputation-service│     │  governance-errors   │ (NEW)
    │  conviction-boundary│     │  scoring-path-tracker│
    │  conformance-suite │     │  state-machine       │
    │                    │     │  resource-governor   │
    │                    │     │  reputation-service  │
    │                    │     │  governor-registry   │
    │                    │     │  conviction-boundary │
    └────────────────────┘     └──────────┬──────────┘
                                          │
                               ┌──────────┴──────────┐
                               │  TIER 3              │
                               │  Future-Ready        │
                               │                      │
                               │  protocol-version    │ (NEW)
                               │  scoring-path-tracker│
                               │  conformance-suite   │
                               └──────────────────────┘
```

### 2.2 Files Modified / Created

| File | Change Type | FRs | Sprint |
|---|---|---|---|
| `services/quality-feedback.ts` | **Major**: QualityObservation + ModelPerformanceEvent emission | FR-1, FR-2 | 1 |
| `services/reputation-service.ts` | **Major**: 4th variant handler + GovernedReputation composition | FR-1, FR-9 | 1, 3 |
| `services/conviction-boundary.ts` | **Medium**: `'unspecified'` handling + ConservationLaw composition | FR-3, FR-5 | 1, 2 |
| `services/conformance-suite.ts` | **Major**: v8.2.0 schema extension (7+ new schema types) | FR-4 | 1 |
| `services/conservation-laws.ts` | **New**: ConservationLaw factory definitions | FR-5 | 2 |
| `services/governance-errors.ts` | **New**: GovernanceError mapping + BffError bridge | FR-6 | 2 |
| `errors.ts` | **Medium**: GovernanceError → BffError mapping utility | FR-6 | 2 |
| `services/scoring-path-tracker.ts` | **Major**: AuditTrail<T> composition + checkpoints | FR-8, FR-12 | 3, 5 |
| `services/state-machine.ts` | **Major**: StateMachineConfig adoption | FR-10 | 4 |
| `services/resource-governor.ts` | **Deprecated**: Replaced by commons GovernedResource<T> | FR-9 | 3 |
| `services/governor-registry.ts` | **Medium**: Updated to work with GovernedResource<T> | FR-9 | 3 |
| `services/protocol-version.ts` | **New**: DynamicContract + negotiation middleware | FR-11 | 4 |
| `types/reputation-evolution.ts` | **Minor**: Re-export ModelPerformanceEvent, QualityObservation | FR-1, FR-2 | 1 |
| `types.ts` | **Minor**: Type audit update | Cross-cutting | 5 |
| `grimoires/loa/invariants.yaml` | **Minor**: Protocol pin 7.0.0 → 8.2.0 | Cross-cutting | 5 |

## 3. Component Design — Tier 1: Protocol Compliance

### 3.1 ModelPerformanceEvent + QualityObservation (FR-1, FR-2)

**Strategy**: Extend the existing autopoietic feedback pipeline. `quality-feedback.ts` already converts review findings into `ReputationEvent`. We add a new emission path for model inference quality.

#### 3.1.1 quality-feedback.ts Changes

```typescript
// NEW imports from hounfour governance
import type {
  ModelPerformanceEvent,
  QualityObservation,
} from '@0xhoneyjar/loa-hounfour/governance';
import {
  QualityObservationSchema,
} from '@0xhoneyjar/loa-hounfour/governance';

// REPLACE QualityEvent with QualityObservation-based structure
export interface ModelQualityInput {
  readonly source: QualityEventSource;
  readonly finding_count: number;
  readonly severity_distribution: Record<string, number>;
  readonly nft_id: string;
  readonly model_id: string;
  readonly provider: string;
  readonly pool_id: string;
  readonly task_type: TaskType;
  readonly latency_ms?: number;
  readonly request_id?: string;
}

// Existing computeQualityScore() preserved — returns [0,1] score
// NEW: wraps result in QualityObservation
export function buildQualityObservation(
  input: ModelQualityInput,
): QualityObservation {
  const score = computeQualityScore(input.severity_distribution);
  return {
    score,
    dimensions: buildDimensionBreakdown(input.severity_distribution),
    latency_ms: input.latency_ms,
    evaluated_by: `dixie-quality-feedback:${input.source}`,
  };
}

// NEW: emit ModelPerformanceEvent (4th variant)
export function emitModelPerformanceEvent(
  input: ModelQualityInput,
  reputationService: ReputationService,
): ModelPerformanceEvent {
  const observation = buildQualityObservation(input);
  const event: ModelPerformanceEvent = {
    type: 'model_performance',
    event_id: crypto.randomUUID(),
    agent_id: input.nft_id,
    collection_id: input.nft_id,
    timestamp: new Date().toISOString(),
    model_id: input.model_id,
    provider: input.provider,
    pool_id: input.pool_id,
    task_type: input.task_type,
    quality_observation: observation,
    request_context: input.request_id
      ? { request_id: input.request_id }
      : undefined,
  };
  // Fire-and-forget into reputation service
  reputationService.processEvent(event);
  return event;
}
```

**Key decisions**:
- `computeQualityScore()` algorithm preserved (backward compatible severity-weighted sigmoid)
- `QualityObservation.dimensions` populated with per-severity breakdown (e.g., `{ blocker: 0.0, high: 0.3, medium: 0.6 }`)
- `evaluated_by` format: `dixie-quality-feedback:<source>` for traceability
- Emission is fire-and-forget — no latency impact on response pipeline

#### 3.1.2 reputation-service.ts Changes

```typescript
// ADD to existing imports
import type { ModelPerformanceEvent } from '@0xhoneyjar/loa-hounfour/governance';

// EXTEND event processing (existing processEvent method)
public async processEvent(event: ReputationEvent): Promise<void> {
  switch (event.type) {
    case 'quality_signal':
      await this.handleQualitySignal(event);
      break;
    case 'task_completed':
      await this.handleTaskCompleted(event);
      break;
    case 'credential_update':
      await this.handleCredentialUpdate(event);
      break;
    case 'model_performance':
      await this.handleModelPerformance(event);
      break;
    // No default — exhaustive switch enforced by TypeScript
  }
}

// NEW handler
private async handleModelPerformance(
  event: ModelPerformanceEvent,
): Promise<void> {
  const aggregate = await this.store.get(event.agent_id);
  if (!aggregate) return; // Cold start — no aggregate to update

  // Model performance score feeds into overall quality signal
  const qualityEvent: QualitySignalEvent = {
    type: 'quality_signal',
    event_id: crypto.randomUUID(),
    agent_id: event.agent_id,
    collection_id: event.collection_id,
    timestamp: event.timestamp,
    score: event.quality_observation.score,
    task_type: event.task_type,
    dimensions: event.quality_observation.dimensions,
  };
  await this.handleQualitySignal(qualityEvent);
}
```

**Key decision**: `model_performance` events are decomposed into `quality_signal` events internally. This preserves the existing scoring pipeline while adding model-level provenance. The original `ModelPerformanceEvent` is stored in the event log for audit; the derived `quality_signal` feeds scoring.

#### 3.1.3 reputation-evolution.ts Changes

```typescript
// ADD re-exports for new v8.2.0 types
export type { ModelPerformanceEvent } from '@0xhoneyjar/loa-hounfour/governance';
export type { QualityObservation } from '@0xhoneyjar/loa-hounfour/governance';
export { QualityObservationSchema } from '@0xhoneyjar/loa-hounfour/governance';
```

### 3.2 Unspecified TaskType Handling (FR-3)

**Strategy**: Add explicit guard before cohort lookup in `conviction-boundary.ts`.

```typescript
// In evaluateEconomicBoundaryForWallet(), scoring path resolution section:

// BEFORE (implicit fallthrough):
if (taskType && taskCohorts && taskCohorts.length > 0) {
  const matchingCohorts = taskCohorts.filter(c => c.task_type === taskType);
  // ...
}

// AFTER (explicit 'unspecified' handling):
const isUnspecifiedTask = !taskType || taskType === 'unspecified';

if (!isUnspecifiedTask && taskCohorts && taskCohorts.length > 0) {
  const matchingCohorts = taskCohorts.filter(c => c.task_type === taskType);
  // ... existing cohort lookup
} else if (isUnspecifiedTask) {
  // Explicit aggregate-only routing — skip cohort lookup entirely
  scoringPath = {
    path: 'aggregate' as const,
    reason: isUnspecifiedTask && taskType === 'unspecified'
      ? 'unspecified task type — aggregate-only scoring'
      : 'no task type provided — aggregate-only scoring',
  };
}
```

**Key decision**: `undefined` and `'unspecified'` are treated identically (both route to aggregate-only) but the scoring path `reason` differentiates them for observability.

### 3.3 Conformance Suite Extension (FR-4)

**Strategy**: Extend `ConformanceSchemaName` union and `GOVERNANCE_SCHEMAS` map with v8.2.0 types.

```typescript
// NEW imports
import {
  QualityObservationSchema,
  ModelPerformanceEventSchema,
} from '@0xhoneyjar/loa-hounfour/governance';
import {
  GovernanceMutationSchema,
  ConservationLawSchema,
  AuditTrailSchema,
  DynamicContractSchema,
  GovernanceErrorSchema,
} from '@0xhoneyjar/loa-hounfour/commons';

// EXTEND type
export type ConformanceSchemaName =
  | 'accessPolicy'
  | 'conversationSealingPolicy'
  | 'streamEvent'
  | 'billingEntry'
  | 'domainEvent'
  | 'agentDescriptor'
  | 'healthStatus'
  | 'taskType'
  | 'taskTypeCohort'
  | 'reputationEvent'
  | 'scoringPathLog'
  // v8.2.0 additions
  | 'qualityObservation'
  | 'governanceMutation'
  | 'conservationLaw'
  | 'auditTrail'
  | 'dynamicContract'
  | 'governanceError';

// EXTEND schema map
const GOVERNANCE_SCHEMAS: Record<string, unknown> = {
  // existing
  taskType: TaskTypeSchema,
  taskTypeCohort: TaskTypeCohortSchema,
  reputationEvent: ReputationEventSchema,
  scoringPathLog: ScoringPathLogSchema,
  // v8.2.0
  qualityObservation: QualityObservationSchema,
  governanceMutation: GovernanceMutationSchema,
  conservationLaw: ConservationLawSchema,
  auditTrail: AuditTrailSchema,
  dynamicContract: DynamicContractSchema,
  governanceError: GovernanceErrorSchema,
};
```

Sample payloads for each new schema will be added to `runFullSuite()`.

## 4. Component Design — Tier 2: Commons Governance Substrate

### 4.1 Conservation Laws (FR-5) — `services/conservation-laws.ts` (NEW)

**Strategy**: Create a centralized conservation law registry. Each invariant from `conviction-boundary.ts` comments and `invariants.yaml` is expressed as a `ConservationLaw` using hounfour factories.

```typescript
import {
  buildSumInvariant,
  buildNonNegativeInvariant,
  buildBoundedInvariant,
  createBalanceConservation,
  createNonNegativeConservation,
  createMonotonicConservation,
  type ConservationLaw,
} from '@0xhoneyjar/loa-hounfour/commons';

/**
 * I-1: Budget Conservation
 * committed + reserved + available = limit
 * "Community resources are finite and accounted for"
 */
export const BUDGET_CONSERVATION = createBalanceConservation(
  ['committed', 'reserved', 'available'],
  'limit',
  'strict',
);

/**
 * I-2: Pricing Conservation
 * SUM(recipients) = total_cost
 * "Every credit lot is fully consumed"
 */
export const PRICING_CONSERVATION = createBalanceConservation(
  ['input_cost', 'output_cost', 'reasoning_cost'],
  'total_cost',
  'strict',
);

/**
 * I-3: Cache Coherence
 * |redis_value - postgres_value| <= threshold
 * "Fast storage matches durable storage"
 */
export const CACHE_COHERENCE = {
  invariants: [
    buildBoundedInvariant(
      'INV-I3',
      'Cache coherence drift',
      'abs_drift',
      0,
      1000, // 1000 micro-USD tolerance
    ),
  ],
  enforcement: 'advisory' as const,
  scope: 'aggregate' as const,
};

/**
 * INV-002: Non-negative Spend
 * daily_spend >= 0 at all times
 */
export const NON_NEGATIVE_SPEND = createNonNegativeConservation(
  ['daily_spend'],
  'strict',
);

/**
 * INV-004: Budget Monotonicity
 * daily_spend(t+1) >= daily_spend(t)
 */
export const BUDGET_MONOTONICITY = createMonotonicConservation(
  'daily_spend',
  'increasing',
  'strict',
);

/**
 * All conservation laws in a single registry for validation.
 */
export const CONSERVATION_REGISTRY = {
  budget: BUDGET_CONSERVATION,
  pricing: PRICING_CONSERVATION,
  cache_coherence: CACHE_COHERENCE,
  non_negative_spend: NON_NEGATIVE_SPEND,
  budget_monotonicity: BUDGET_MONOTONICITY,
} as const;
```

**Integration with conviction-boundary.ts**: The inline invariant comments (I-1, I-2, I-3) are replaced with references to `CONSERVATION_REGISTRY`. The actual enforcement point remains in the function body but now delegates to protocol-verified law evaluation where applicable.

### 4.2 Governance Error Taxonomy (FR-6) — `services/governance-errors.ts` (NEW)

**Strategy**: Bridge hounfour's 6-variant `GovernanceError` to Dixie's HTTP error model.

```typescript
import type {
  GovernanceError,
  InvariantViolation,
  InvalidTransition,
  GuardFailure,
  HashDiscontinuityError,
  PartialApplication,
} from '@0xhoneyjar/loa-hounfour/commons';
import { BffError } from '../errors.js';

/**
 * Map GovernanceError variant → HTTP status code.
 */
const ERROR_STATUS_MAP: Record<GovernanceError['type'], number> = {
  INVARIANT_VIOLATION: 400,
  INVALID_TRANSITION: 409,
  GUARD_FAILURE: 403,
  EVALUATION_ERROR: 500,
  HASH_DISCONTINUITY: 500,
  PARTIAL_APPLICATION: 409,
};

/**
 * Convert a hounfour GovernanceError to a BffError for HTTP responses.
 */
export function toBffError(error: GovernanceError): BffError {
  const status = ERROR_STATUS_MAP[error.type];
  return new BffError(status, {
    error: error.type.toLowerCase(),
    message: error.message,
    error_code: error.error_code,
    affected_fields: error.affected_fields,
    retryable: error.retryable,
    audit_entry_id: error.audit_entry_id,
    timestamp: error.timestamp,
  });
}

/**
 * Create a GovernanceError for access boundary denials.
 * Used by conviction-boundary.ts buildConvictionDenialResponse().
 */
export function createAccessBoundaryError(
  message: string,
  denialCodes: string[],
  auditEntryId?: string,
): GovernanceError {
  return {
    type: 'GUARD_FAILURE',
    error_code: 'ACCESS_BOUNDARY_DENIED',
    message,
    guard_expression: denialCodes.join(' && '),
    affected_fields: denialCodes,
    retryable: false,
    audit_entry_id: auditEntryId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a GovernanceError for conformance violations.
 * Used by conformance-signal.ts.
 */
export function createConformanceError(
  schemaName: string,
  errorPath: string,
  message: string,
): GovernanceError {
  return {
    type: 'INVARIANT_VIOLATION',
    error_code: 'CONFORMANCE_VIOLATION',
    message,
    invariant_id: `CONF-${schemaName}`,
    expression: `validate(${schemaName}, payload)`,
    affected_fields: [errorPath],
    retryable: false,
    timestamp: new Date().toISOString(),
  };
}
```

**Integration points**:
- `errors.ts` gains `toBffError()` re-export
- `access-policy-validator.ts` produces `GovernanceError` via `createAccessBoundaryError()`
- `conviction-boundary.ts` `buildConvictionDenialResponse()` produces `GovernanceError`
- `conformance-signal.ts` `ConformanceViolationSignal` wraps `GovernanceError`
- Existing `BffError` HTTP contracts preserved through mapping

### 4.3 GovernanceMutation (FR-7)

**Strategy**: Add mutation tracking to policy-affecting operations. Mutations are validated before application and stored in an append-only log.

```typescript
// In services that modify governance state:
import {
  evaluateGovernanceMutation,
  type GovernanceMutation,
} from '@0xhoneyjar/loa-hounfour/commons';

function createMutation(
  actorId: string,
  expectedVersion: number,
): GovernanceMutation {
  return {
    mutation_id: crypto.randomUUID(),
    expected_version: expectedVersion,
    mutated_at: new Date().toISOString(),
    actor_id: actorId,
  };
}

// Before any policy modification:
const mutation = createMutation(walletAddress, currentVersion);
const evalResult = evaluateGovernanceMutation(mutation, accessPolicy, context);
if (!evalResult.authorized) {
  throw toBffError(createAccessBoundaryError(
    evalResult.reason,
    ['MUTATION_UNAUTHORIZED'],
  ));
}
// Apply mutation...
// Store mutation in append-only log...
```

**Where mutations are needed**:
- Conviction tier threshold changes (currently static constants)
- Access matrix updates (currently `CONVICTION_ACCESS_MATRIX`)
- Conservation law parameter changes (currently hardcoded)
- Any future governance parameter evolution

**Storage**: Mutation log is in-memory for this cycle (append-only array). Persistence deferred to a future cycle per PRD scope.

### 4.4 AuditTrail Composition (FR-8)

**Strategy**: `ScoringPathTracker` composes with commons `AuditTrail<T>` rather than implementing its own hash chain. The existing public API is preserved.

```typescript
import {
  verifyAuditTrailIntegrity,
  AUDIT_TRAIL_GENESIS_HASH,
  computeAuditEntryHash,
  buildDomainTag,
  type AuditTrail,
  type AuditEntry,
} from '@0xhoneyjar/loa-hounfour/commons';
import {
  computeScoringPathHash,
  SCORING_PATH_GENESIS_HASH,
} from '@0xhoneyjar/loa-hounfour/governance';

export class ScoringPathTracker {
  // Internal state: AuditTrail<ScoringPathLog> for checkpointing
  private trail: AuditTrail;
  // Preserve existing lastHash/entries for backward compat
  private lastHash: string = SCORING_PATH_GENESIS_HASH;
  private entries: ScoringPathLog[] = [];
  private domainTag: string;

  constructor(options?: ScoringPathTrackerOptions) {
    this.domainTag = buildDomainTag('scoring-path', '8.2.0');
    this.trail = {
      entries: [],
      hash_algorithm: 'sha256',
      genesis_hash: `sha256:${SCORING_PATH_GENESIS_HASH.replace('sha256:', '')}`,
      integrity_status: 'verified',
    };
  }

  /**
   * Record a scoring path entry.
   * Preserves existing API — adds AuditTrail composition internally.
   */
  record(
    entry: Pick<ScoringPathLog, 'path' | 'model_id' | 'task_type' | 'reason'>,
    options?: RecordOptions,
  ): ScoringPathLog {
    // Existing hash chain logic preserved
    const scored_at = new Date().toISOString();
    const contentFields = this.buildContentFields(entry, scored_at);
    const entry_hash = computeScoringPathHash(contentFields);
    const previous_hash = this.lastHash;
    this.lastHash = entry_hash;

    const result: ScoringPathLog = {
      ...contentFields,
      entry_hash,
      previous_hash,
    };
    this.entries.push(result);

    // NEW: Mirror to AuditTrail for checkpoint support
    this.appendToAuditTrail(result);

    return result;
  }

  /**
   * Verify integrity of the full audit trail.
   */
  verifyIntegrity(): { valid: boolean; failure_index?: number } {
    return verifyAuditTrailIntegrity(this.trail);
  }

  /** Access the underlying AuditTrail for checkpoint operations. */
  get auditTrail(): Readonly<AuditTrail> {
    return this.trail;
  }

  // ... existing tipHash, length, lastRecordOptions getters preserved
}
```

**Key design decision**: Dual-track state. The `ScoringPathTracker` maintains both its original `entries[]` (for backward-compatible access) and the commons `AuditTrail` (for checkpoint/verification). This avoids breaking existing consumers while enabling new capabilities.

### 4.5 GovernedResource Pattern (FR-9)

**Strategy**: Extend `ReputationService` with `GovernedResource<T>` fields. Deprecate local `ResourceGovernor<T>` interface.

```typescript
// reputation-service.ts additions:
import type {
  GovernedReputation,
  GovernanceMutation,
} from '@0xhoneyjar/loa-hounfour/commons';
import { GOVERNED_RESOURCE_FIELDS } from '@0xhoneyjar/loa-hounfour/commons';

export class ReputationService {
  // Existing store + methods preserved
  readonly store: ReputationStore;

  // NEW: mutation log for governance tracking
  private mutations: GovernanceMutation[] = [];

  // NEW: governed resource metadata
  private governedState: GovernedReputation = {
    ...GOVERNED_RESOURCE_FIELDS,
    version: 0,
    governance_class: 'protocol-fixed',
    // conservation_law, audit_trail, state_machine filled at init
  };

  /** Track a governance mutation. */
  recordMutation(mutation: GovernanceMutation): void {
    this.mutations.push(mutation);
    this.governedState.version++;
  }

  /** Get governed resource metadata. */
  getGovernedState(): Readonly<GovernedReputation> {
    return this.governedState;
  }
}
```

**resource-governor.ts** is deprecated with a JSDoc `@deprecated` tag pointing to `@0xhoneyjar/loa-hounfour/commons`. The interface remains for one cycle to avoid breaking existing consumers, then is removed.

**governor-registry.ts** is updated to accept both `ResourceGovernor<T>` (deprecated) and services that expose `getGovernedState()`. The `GovernorSnapshot` type is extended with optional `governedResource` field.

### 4.6 StateMachineConfig Adoption (FR-10)

**Strategy**: Replace plain `StateMachine<S>` objects with `StateMachineConfig` instances from commons. Preserve `validateTransition()` and `assertTransition()` public API.

```typescript
import type {
  StateMachineConfig,
  State,
  Transition,
} from '@0xhoneyjar/loa-hounfour/commons';

// Helper: convert existing transition record → commons Transition[]
function toTransitions<S extends string>(
  record: Record<S, readonly S[]>,
): Transition[] {
  return Object.entries(record).flatMap(([from, targets]) =>
    (targets as S[]).map(to => ({ from_state: from, to_state: to }))
  );
}

// Helper: extract unique states from transition record
function toStates<S extends string>(
  record: Record<S, readonly S[]>,
  initial: S,
): State[] {
  const names = new Set<string>([initial]);
  for (const [from, targets] of Object.entries(record)) {
    names.add(from);
    for (const t of targets as S[]) names.add(t);
  }
  return [...names].map(name => ({ name }));
}

// REPLACE existing CircuitStateMachine
export const CircuitStateMachine: StateMachineConfig = {
  states: toStates({
    closed: ['open'],
    open: ['half_open'],
    half_open: ['closed', 'open'],
  }, 'closed'),
  transitions: toTransitions({
    closed: ['open'],
    open: ['half_open'],
    half_open: ['closed', 'open'],
  }),
  initial_state: 'closed',
  terminal_states: [],
};

// Similarly for MemoryEncryptionMachine, AutonomousModeMachine,
// ScheduleLifecycleMachine

// validateTransition/assertTransition implementations updated to use
// StateMachineConfig.transitions instead of StateMachine.transitions record
```

**Key decision**: Helper functions `toTransitions()` and `toStates()` convert the existing concise record format to commons' explicit array format. This is a one-time conversion at module load — zero runtime overhead.

## 5. Component Design — Tier 3: Future-Ready Infrastructure

### 5.1 DynamicContract + Protocol Versioning (FR-11) — `services/protocol-version.ts` (NEW)

**Strategy**: Create a Hono middleware for protocol version negotiation and a DynamicContract representing Dixie's protocol surface.

```typescript
import type {
  DynamicContract,
  ContractNegotiation,
  ProtocolSurface,
} from '@0xhoneyjar/loa-hounfour/commons';
import {
  isNegotiationValid,
  verifyMonotonicExpansion,
} from '@0xhoneyjar/loa-hounfour/commons';

export const DIXIE_PROTOCOL_VERSION = '8.2.0';

/**
 * Dixie's protocol surface per reputation state.
 * Higher reputation = more capabilities.
 */
export const DIXIE_CONTRACT: DynamicContract = {
  contract_id: crypto.randomUUID(),
  contract_version: DIXIE_PROTOCOL_VERSION,
  created_at: new Date().toISOString(),
  surfaces: {
    cold: {
      schemas: ['AccessPolicy', 'StreamEvent'],
      capabilities: ['inference'],
      rate_limit_tier: 'restricted',
    },
    warming: {
      schemas: ['AccessPolicy', 'StreamEvent', 'ReputationEvent'],
      capabilities: ['inference', 'tools'],
      rate_limit_tier: 'standard',
    },
    established: {
      schemas: ['AccessPolicy', 'StreamEvent', 'ReputationEvent',
                'ScoringPathLog', 'ConservationLaw'],
      capabilities: ['inference', 'tools', 'governance'],
      rate_limit_tier: 'extended',
    },
    authoritative: {
      schemas: ['AccessPolicy', 'StreamEvent', 'ReputationEvent',
                'ScoringPathLog', 'ConservationLaw', 'DynamicContract'],
      capabilities: ['inference', 'tools', 'governance', 'ensemble'],
      rate_limit_tier: 'unlimited',
    },
  },
};

/**
 * Hono middleware: adds X-Protocol-Version header to all responses.
 * Optionally validates client-requested capabilities.
 */
export function protocolVersionMiddleware() {
  return async (c: Context, next: Next) => {
    // Set version header on response
    c.header('X-Protocol-Version', DIXIE_PROTOCOL_VERSION);

    // Check client version header (optional)
    const clientVersion = c.req.header('X-Protocol-Version');
    if (clientVersion) {
      c.set('clientProtocolVersion', clientVersion);
    }

    await next();
  };
}
```

**Key decision**: Protocol versioning starts simple — a response header and a contract definition. Capability negotiation is available but not enforced by default. Clients that don't send `X-Protocol-Version` get full capabilities (backward compatible).

### 5.2 Audit Trail Checkpoints (FR-12)

**Strategy**: Extend `ScoringPathTracker` with checkpoint lifecycle management.

```typescript
import {
  createCheckpoint,
  verifyCheckpointContinuity,
  pruneBeforeCheckpoint,
  type CheckpointResult,
} from '@0xhoneyjar/loa-hounfour/commons';
import type { HashChainDiscontinuity } from '@0xhoneyjar/loa-hounfour/commons';

export interface ScoringPathTrackerOptions {
  /** Entries between automatic checkpoints. Default: 100. */
  checkpointInterval?: number;
  /** Verify chain integrity on construction. Default: true. */
  verifyOnInit?: boolean;
}

// In ScoringPathTracker class:

/** Create a checkpoint at the current position. */
checkpoint(): CheckpointResult {
  return createCheckpoint(this.trail);
}

/** Verify chain integrity from last checkpoint. */
verifyContinuity(): AuditTrailVerificationResult {
  return verifyCheckpointContinuity(this.trail);
}

/** Prune entries before the last checkpoint. */
prune(): AuditTrail {
  this.trail = pruneBeforeCheckpoint(this.trail);
  return this.trail;
}
```

### 5.3 Quarantine Mechanism (FR-13)

**Strategy**: Add quarantine capability to `ScoringPathTracker` and `GovernorRegistry`. When integrity fails, resources are quarantined rather than hard-failing.

```typescript
import type {
  QuarantineStatus,
  QuarantineRecord,
  HashChainDiscontinuity,
} from '@0xhoneyjar/loa-hounfour/commons';

// In ScoringPathTracker:
private quarantine: QuarantineRecord | null = null;

/** Check if the tracker is quarantined. */
get isQuarantined(): boolean {
  return this.quarantine?.status === 'active';
}

/** Trigger quarantine on integrity failure. */
private enterQuarantine(
  discontinuity: HashChainDiscontinuity,
): QuarantineRecord {
  this.quarantine = {
    quarantine_id: crypto.randomUUID(),
    discontinuity_id: discontinuity.discontinuity_id,
    resource_type: 'scoring_path',
    resource_id: 'primary',
    status: 'active',
    quarantined_at: new Date().toISOString(),
    first_affected_index: discontinuity.last_known_good_index + 1,
    last_affected_index: discontinuity.entry_index,
  };
  this.trail.integrity_status = 'quarantined';
  return this.quarantine;
}

/** Attempt recovery: re-verify and release if clean. */
recover(): boolean {
  const result = verifyAuditTrailIntegrity(this.trail);
  if (result.valid && this.quarantine) {
    this.quarantine.status = 'reconciled';
    this.quarantine.resolved_at = new Date().toISOString();
    this.trail.integrity_status = 'verified';
    return true;
  }
  return false;
}
```

**Integration with conviction-boundary.ts**: When `ScoringPathTracker.isQuarantined` is true, scoring decisions fall back to tier defaults (safe fallback) and the quarantine status is surfaced in the `GovernanceError` response.

## 6. Data Architecture

### 6.1 No Schema Changes

All new data structures are in-memory for this cycle:
- Conservation laws: static constants (module load)
- Governance mutations: append-only array
- Audit trail checkpoints: in-memory chain state
- Quarantine records: nullable field on tracker
- Dynamic contract: static constant

### 6.2 Existing Data Unaffected

| Storage | Contents | Change |
|---------|----------|--------|
| PostgreSQL | Reputation aggregates, wallet data | None |
| Redis | Budget cache, session data | None |
| NATS | Conformance signals, interaction signals | Signal payloads gain `GovernanceError` structure |

## 7. API Design

### 7.1 No New Routes

All changes are internal. The existing API surface is preserved.

### 7.2 Response Header Addition

| Header | Value | Direction | Required |
|--------|-------|-----------|----------|
| `X-Protocol-Version` | `8.2.0` | Response | All responses |
| `X-Protocol-Version` | Client version | Request | Optional |

### 7.3 Error Response Enhancement

Governance errors now include structured fields:

```json
{
  "error": "guard_failure",
  "message": "Conviction tier insufficient for requested capability",
  "error_code": "ACCESS_BOUNDARY_DENIED",
  "affected_fields": ["TRUST_SCORE_LOW", "REPUTATION_STATE_COLD"],
  "retryable": false,
  "timestamp": "2026-02-25T00:00:00Z"
}
```

This is **additive** — existing `error` and `message` fields preserved.

## 8. Security Architecture

### 8.1 GovernanceMutation `actor_id` Requirement

All governance mutations require `actor_id` (v8.1.0 breaking change). In Dixie's context:
- **Human operations**: `actor_id` = wallet address (EIP-55 checksummed)
- **System operations**: `actor_id` = `system:dixie-bff` (service identifier)
- **Autonomous operations**: `actor_id` = `autonomous:<nft_id>` (delegation context)

### 8.2 Quarantine as Security Boundary

Quarantined resources are excluded from scoring decisions. This prevents:
- Tampered hash chains from influencing access decisions
- Corrupted aggregates from granting unearned privileges
- Invalid state machine states from bypassing transition guards

### 8.3 Audit Trail Integrity

All scoring decisions are hash-chained. Checkpoints enable:
- Periodic integrity verification without full chain scan
- Managed log rotation without losing provenance
- Tamper detection between sessions

## 9. Testing Strategy

### 9.1 Test Categories

| Category | Files | Coverage Target |
|----------|-------|-----------------|
| Unit: conservation laws | `conservation-laws.test.ts` (NEW) | All 5 laws, boundary cases |
| Unit: governance errors | `governance-errors.test.ts` (NEW) | All 6 variants, HTTP mapping |
| Unit: model performance | `quality-feedback.test.ts` (EXTEND) | Emission, observation structure |
| Unit: reputation 4th variant | `reputation-service.test.ts` (EXTEND) | Event decomposition, scoring |
| Unit: unspecified TaskType | `conviction-boundary.test.ts` (EXTEND) | Explicit routing, scoring path |
| Unit: state machine config | `state-machine.test.ts` (EXTEND) | Config conversion, validation |
| Unit: checkpoint lifecycle | `scoring-path-tracker.test.ts` (EXTEND) | Create, verify, prune |
| Unit: quarantine | `quarantine.test.ts` (NEW) | Trigger, isolate, recover |
| Unit: protocol version | `protocol-version.test.ts` (NEW) | Header, negotiation |
| Integration: conformance | `conformance-suite.test.ts` (EXTEND) | All v8.2.0 schemas |
| Integration: autopoietic loop | `autopoietic-loop.test.ts` (NEW) | Inference → event → reputation |

### 9.2 Test Invariants

- All existing tests pass without modification
- Each new FR has minimum 3 test scenarios (per EDD policy)
- Conservation law tests use property-based approach where feasible
- Quarantine tests verify safe fallback behavior

## 10. Performance Considerations

| Operation | Latency Budget | Implementation |
|-----------|---------------|----------------|
| Conservation law evaluation | <1ms | Static law objects, predicate evaluation |
| GovernanceError construction | <0.1ms | Object literal creation |
| AuditTrail checkpoint | <5ms | SHA-256 hash + array slice |
| Protocol version header | <0.1ms | Static string assignment |
| ModelPerformanceEvent emission | Fire-and-forget | No response latency impact |
| StateMachineConfig validation | <0.1ms | Array lookup (converted at load time) |
| Quarantine check | <0.1ms | Nullable field read |

No performance regressions expected. All hot-path operations remain sub-millisecond.

## 11. Migration Plan

### 11.1 Sprint Sequencing

| Sprint | Tier | What Ships | Independently Deployable |
|--------|------|-----------|------------------------|
| Sprint 1 | 1 | ModelPerformanceEvent, QualityObservation, unspecified TaskType, conformance | Yes |
| Sprint 2 | 2 | ConservationLaw factories, GovernanceError taxonomy | Yes |
| Sprint 3 | 2 | GovernanceMutation, AuditTrail composition, GovernedResource | Yes (depends on Sprint 2 for error types) |
| Sprint 4 | 2+3 | StateMachineConfig, DynamicContract, protocol versioning | Yes |
| Sprint 5 | 3 | Checkpoints, quarantine, integration testing, type audit | Yes |

### 11.2 Rollback Strategy

Each sprint is independently reversible:
- **Sprint 1**: Revert event handlers to 3-variant switch
- **Sprint 2**: Remove conservation-laws.ts, governance-errors.ts modules
- **Sprint 3**: Restore direct hash chain (remove AuditTrail composition)
- **Sprint 4**: Remove protocol-version.ts, restore plain state machines
- **Sprint 5**: Remove checkpoint/quarantine code

### 11.3 invariants.yaml Update

Updated in Sprint 5 (final sprint) after all invariants are verified:

```yaml
schema_version: 1
protocol: loa-hounfour@8.2.0
```

## 12. Technical Risks & Mitigations

| Risk | Mitigation | Sprint |
|------|------------|--------|
| GovernanceError variant names don't map cleanly to existing error patterns | Mapping utility (`governance-errors.ts`) decouples protocol errors from HTTP errors | 2 |
| AuditTrail composition adds complexity to ScoringPathTracker | Dual-track state (original + commons) — existing API unchanged | 3 |
| StateMachineConfig format requires transition record conversion | Helper functions (`toTransitions`, `toStates`) at module load | 4 |
| DynamicContract surface definition may not match actual capabilities | Start with current capabilities; verify monotonic expansion on change | 4 |
| Quarantine false positives from transient hash computation issues | Conservative triggers (only on `verifyAuditTrailIntegrity` failure, not transient) | 5 |

## 13. Dependency Graph

```
Sprint 1 (independent)
    │
    ▼
Sprint 2 (independent — GovernanceError used by Sprint 3+)
    │
    ▼
Sprint 3 (depends on Sprint 2 for error types)
    │
    ▼
Sprint 4 (depends on Sprint 3 for GovernedResource pattern)
    │
    ▼
Sprint 5 (depends on Sprint 3 for AuditTrail, Sprint 4 for StateMachineConfig)
```

Sprints 1 and 2 can run in parallel if desired. Sprint 3+ is sequential.

---

*This SDD designs the composition of loa-hounfour v8.2.0 commons governance substrate into loa-dixie's existing service architecture. The design prioritizes composition over replacement: existing services gain commons capabilities through delegation and wrapping, preserving all existing test coverage and public APIs while eliminating local governance pattern implementations.*
