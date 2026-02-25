# PRD: Hounfour v8.2.0 Full Adoption — Commons Governance Substrate

**Version**: 7.0.0
**Date**: 2026-02-25
**Author**: Merlin (Product), Claude (Synthesis)
**Cycle**: cycle-007
**Status**: Draft
**Predecessor**: cycle-006 PRD (Phase 3 — Production Wiring & Live Integration)

> Sources: loa-hounfour CHANGELOG v8.0.0–v8.2.0, MIGRATION.md (Dixie consumer path),
> cycle-005 (Hounfour v7.11.0 Full Adoption, 5 sprints — Level 6+ foundation),
> cycle-006 (Phase 3 — Production Wiring, 8 sprints — event sourcing + crypto hardening),
> codebase analysis (42 files import hounfour, 8 service files need refactoring)

---

## 1. Problem Statement

Dixie achieved Hounfour Level 6+ protocol compliance in cycle-005 against v7.11.0 and wired production infrastructure in cycle-006. Since then, Hounfour has advanced through three releases (v8.0.0, v8.1.0, v8.2.0) introducing a **governance substrate** — the `commons` module with 21 schemas, an enforcement SDK, and the 4th ReputationEvent variant.

**The gap**: The local `loa-hounfour` package is already at v8.2.0 (symlinked at `file:../../loa-hounfour`), but **Dixie has not adopted any v8.x functionality**. The existing code works (backward compatible) but leaves significant protocol surface unused, and Dixie still maintains local patterns for things that now have canonical protocol implementations:

| Local Pattern | File | Hounfour v8.2.0 Canonical | Gap |
|---|---|---|---|
| Hardcoded conservation checks | `conviction-boundary.ts:327-339` | `ConservationLaw<T>` factories + `buildSumInvariant()` | Local checks bypass protocol verification |
| Scattered error types | `errors.ts`, `access-policy-validator.ts`, `conformance-signal.ts` | `GovernanceError` discriminated union (6 variants) | No structured governance error taxonomy |
| Plain state machine objects | `state-machine.ts:95-155` | `StateMachineConfig` with invariants + audit hooks | Missing cross-state constraints and audit |
| Custom hash chain tracker | `scoring-path-tracker.ts` | `AuditTrail<T>` with `verifyAuditTrailIntegrity()` | Missing checkpoint/verification infrastructure |
| Generic resource governor | `resource-governor.ts` | `GovernedResource<T>` with mutation tracking | Missing governed mutations + versioning |
| `QualityEvent` (3 fields) | `quality-feedback.ts:40-51` | `ModelPerformanceEvent` + `QualityObservation` | No model-level performance tracking |
| No `'unspecified'` TaskType handling | `conviction-boundary.ts:261-286` | `'unspecified'` literal with aggregate-only routing | Silent fallthrough on missing task metadata |
| No governance mutations | — | `GovernanceMutation` with required `actor_id` | No auditable policy change trail |
| No protocol versioning | — | `DynamicContract` + `ContractNegotiation` | No capability negotiation with clients |
| No quarantine mechanism | — | `QuarantineStatus` + `QuarantineRecord` | No unsafe state isolation |
| `invariants.yaml` pinned to 7.0.0 | `grimoires/loa/invariants.yaml:9` | Protocol version 8.2.0 | Stale protocol declaration |

**Why this matters**: Hounfour v8.0.0 introduced the commons module specifically to **canonicalize governance patterns that every consumer was implementing independently**. Dixie has conservation invariants, state machines, audit trails, resource governance, and error handling — all implemented locally. Each local implementation diverges from the protocol's verified, tested, and cross-consumer-compatible patterns. The v8.2.0 release adds `ModelPerformanceEvent` which closes the autopoietic feedback loop (Dixie evaluation → scoring → routing → Finn) — without it, Dixie's quality signals don't feed back into model selection.

> Sources: loa-hounfour CHANGELOG v8.0.0 ("commons module introduces governance substrate"),
> v8.1.0 ("GovernanceMutation.actor_id required"), v8.2.0 ("ModelPerformanceEvent closes autopoietic loop"),
> MIGRATION.md (Dixie consumer path), codebase analysis

## 2. Product Vision

**Replace Dixie's local governance patterns with canonical Hounfour v8.2.0 commons implementations, close the autopoietic feedback loop with ModelPerformanceEvent, and enable runtime protocol negotiation via DynamicContract.**

This is a **deep protocol adoption cycle** — not just type imports (cycle-005) but behavioral alignment. Dixie already implements the right patterns; the work is replacing local implementations with protocol-canonical equivalents that gain:
- Verified conservation law enforcement (property-tested in hounfour)
- Structured governance error taxonomy (6-variant discriminated union)
- Audit trail checkpointing and integrity verification
- Mutation-tracked resource governance
- Protocol capability negotiation for client compatibility
- Quarantine mechanism for unsafe state isolation

The autopoietic loop closure is the highest-value functional change: model performance observations from Finn inference flow back through reputation scoring, influencing future model routing decisions. This makes the Oracle self-improving — the defining characteristic of the system's architecture.

## 3. Success Metrics

| ID | Metric | Target |
|----|--------|--------|
| C-1 | Local governance pattern elimination | 0 local implementations where hounfour commons equivalent exists |
| C-2 | Commons module imports | All 6 commons subsystems integrated (conservation, error, state, audit, resource, contract) |
| C-3 | ModelPerformanceEvent operational | Finn inference quality → ReputationEvent → scoring → routing (functional loop) |
| C-4 | QualityObservation emission | Every quality assessment produces structured observation with score [0,1] |
| C-5 | GovernanceMutation trail | All policy changes produce auditable mutation with `actor_id` attribution |
| C-6 | `'unspecified'` TaskType handled | Explicit aggregate-only routing when task metadata unavailable |
| C-7 | Protocol versioning active | `X-Protocol-Version` header on all responses, capability negotiation functional |
| C-8 | Conformance vectors | v8.2.0 vectors pass (217+ total) |
| C-9 | Zero regressions | All existing tests pass (baseline from cycle-006) |
| C-10 | `invariants.yaml` updated | Protocol pin at `loa-hounfour@8.2.0` |
| C-11 | Quarantine operational | Unsafe state isolation with automatic recovery |
| C-12 | Audit trail checkpoints | Checkpoint creation, continuity verification, and pruning functional |

## 4. Functional Requirements

### Tier 1: Required Protocol Compliance

#### FR-1: Handle ModelPerformanceEvent (4th ReputationEvent Variant)

**Current**: `ReputationEvent` is a 3-variant discriminated union (`quality_signal`, `task_completion`, `credential_update`). Dixie's `reputation-service.ts` and `quality-feedback.ts` handle these three variants but have no handling for `model_performance`.

**Target**: Full integration of the 4th variant:

1. `quality-feedback.ts` emits `ModelPerformanceEvent` after Finn inference completes, capturing:
   - `model_id`: which model was used
   - `provider`: model provider (e.g., `'anthropic'`, `'openai'`)
   - `pool_id`: routing pool identifier
   - `quality`: `QualityObservation` (score [0,1], optional dimensions, latency, evaluator)
2. `reputation-service.ts` processes `model_performance` events in the discriminated union handler
3. Model performance feeds into blended score computation, influencing future routing
4. Exhaustive switch coverage ensures type safety (no `default` fallthrough)

**Acceptance Criteria**:
- [ ] `ModelPerformanceEvent` type imported from `@0xhoneyjar/loa-hounfour/governance`
- [ ] `quality-feedback.ts` emits model performance events after Finn inference
- [ ] `reputation-service.ts` handles `model_performance` variant in event processing
- [ ] Model performance scores influence blended reputation computation
- [ ] Exhaustive switch on `ReputationEvent.type` (4 cases, no default)
- [ ] Tests verify end-to-end: inference → event emission → reputation update

> Sources: loa-hounfour CHANGELOG v8.2.0 ("ModelPerformanceEvent closes autopoietic loop"),
> quality-feedback.ts:40-51, reputation-service.ts event handling

#### FR-2: Emit QualityObservation for Structured Evaluation Output

**Current**: `quality-feedback.ts` computes a quality score via severity-weighted sum (`1 / (1 + weighted_count)`) but stores it as a bare number within `QualityEvent`. No structured observation schema.

**Target**: Replace `QualityEvent` with `QualityObservation` from hounfour governance:
- `score`: [0,1] float — computed from severity distribution (existing algorithm preserved)
- `dimensions`: optional record of named dimension scores (max 20)
- `latency_ms`: optional inference latency
- `evaluated_by`: evaluator identifier (e.g., `'dixie-quality-feedback'`)

**Acceptance Criteria**:
- [ ] `QualityObservation` and `QualityObservationSchema` imported from hounfour governance
- [ ] `QualityEvent` interface replaced with `QualityObservation` usage
- [ ] Severity-weighted score computation preserved (backward compatible output)
- [ ] `dimensions` populated with per-severity breakdown
- [ ] `evaluated_by` field identifies the evaluation source
- [ ] Conformance suite validates `QualityObservation` payloads

> Sources: loa-hounfour CHANGELOG v8.2.0 ("QualityObservation schema"),
> quality-feedback.ts:84-94 (severity weights)

#### FR-3: Handle `'unspecified'` TaskType

**Current**: When `taskType` is undefined or doesn't match any cohort, `conviction-boundary.ts` falls through to aggregate scoring silently. No explicit handling of the `'unspecified'` literal.

**Target**: Explicit routing:
1. When `taskType === 'unspecified'` or `taskType === undefined`: route to aggregate-only scoring (skip cohort lookup entirely)
2. Record scoring path as `{ path: 'aggregate', reason: 'unspecified task type' }`
3. No cohort entry created for `'unspecified'` (aggregate-only)

**Acceptance Criteria**:
- [ ] Explicit `'unspecified'` check before cohort lookup in `conviction-boundary.ts`
- [ ] Scoring path records `'unspecified'` handling with clear reason
- [ ] No `TaskTypeCohort` entries created for `'unspecified'` task type
- [ ] Tests verify `'unspecified'` routes to aggregate-only scoring
- [ ] Backward compatible: `undefined` taskType still works identically

> Sources: loa-hounfour CHANGELOG v8.2.0 ("'unspecified' TaskType literal"),
> MIGRATION.md ("route to aggregate-only scoring"), conviction-boundary.ts:261-286

#### FR-4: Update Conformance Suite for v8.2.0

**Current**: Conformance suite validates against governance schemas from v7.11.0 (6 schema types: AccessPolicy, ConversationSealingPolicy, TaskType, TaskTypeCohort, ReputationEvent, ScoringPathLog).

**Target**: Extend coverage to include all v8.2.0 additions:
- `QualityObservation` validation
- `ModelPerformanceEvent` as 4th ReputationEvent variant
- `GovernanceMutation` validation (with required `actor_id`)
- `ConservationLaw` validation
- `AuditTrail` validation (including integrity verification)
- `DynamicContract` validation
- `GovernanceError` validation (all 6 variants)

**Acceptance Criteria**:
- [ ] Conformance suite schema enum extended with v8.2.0 types
- [ ] Sample payloads for each new schema type
- [ ] v8.0.0–v8.2.0 conformance vectors referenced (217+ total)
- [ ] `runFullSuite()` includes commons schema validation
- [ ] Integration test verifies full suite passes

> Sources: conformance-suite.ts:24-204, loa-hounfour RELEASE-INTEGRITY.json (219 vectors)

### Tier 2: Commons Governance Substrate

#### FR-5: Adopt ConservationLaw Factories for Existing Invariants

**Current**: `conviction-boundary.ts` documents 3 conservation invariants as comments (I-1 through I-3) and checks them inline. `invariants.yaml` declares 5 cross-repo invariants (INV-001 through INV-005). These are verified by tests but not expressed as protocol objects.

**Target**: Replace inline checks with `ConservationLaw<T>` factories from commons:

| Invariant | Factory | Predicate |
|-----------|---------|-----------|
| I-1: Budget conservation | `buildSumInvariant()` | `committed + reserved + available === limit` |
| I-2: Pricing conservation | `buildSumInvariant()` | `SUM(recipients) === total_cost` |
| I-3: Cache coherence | `buildBoundedInvariant()` | `abs(redis_value - postgres_value) <= threshold` |
| INV-001: Cost conservation | `buildSumInvariant()` | `cost_micro * 1_000_000 + remainder == tokens * price_per_million` |
| INV-002: Non-negative spend | `buildNonNegativeInvariant()` | `daily_spend >= 0` |
| INV-004: Budget monotonicity | `createMonotonicConservation()` | `daily_spend(t+1) >= daily_spend(t)` |

**Acceptance Criteria**:
- [ ] `ConservationLaw`, `buildSumInvariant`, `buildNonNegativeInvariant`, `buildBoundedInvariant`, `createMonotonicConservation` imported from `@0xhoneyjar/loa-hounfour/commons`
- [ ] Budget conservation (I-1) expressed as protocol `ConservationLaw<BudgetState>`
- [ ] Pricing conservation (I-2) expressed as protocol `ConservationLaw<BillingEntry>`
- [ ] Cache coherence (I-3) expressed as protocol `ConservationLaw<CacheState>`
- [ ] Inline conservation checks in `conviction-boundary.ts` replaced with factory-produced law evaluation
- [ ] `invariants.yaml` updated to `loa-hounfour@8.2.0` and invariants reference commons types
- [ ] Tests verify conservation law evaluation produces same results as inline checks

> Sources: loa-hounfour CHANGELOG v8.1.0 ("conservation law factories"),
> conviction-boundary.ts:20-30 (invariant comments), invariants.yaml

#### FR-6: Adopt GovernanceError Discriminated Union

**Current**: Error handling is scattered across files:
- `errors.ts`: `BffError` class with `status` + `body`
- `access-policy-validator.ts`: policy validation errors with `violations[]`
- `conformance-signal.ts`: `ConformanceViolationSignal` interface
- `conviction-boundary.ts`: `buildConvictionDenialResponse()` with `denial_codes[]`

**Target**: Introduce `GovernanceError` from commons as canonical governance error type:
- Map existing error patterns to 6-variant discriminated union
- Add `severity`, `remediation`, and `provenance` fields
- Preserve HTTP status mapping (400, 403, 409, 429)

| Current Pattern | GovernanceError Variant | HTTP Status |
|----------------|------------------------|-------------|
| Policy validation failure | `PolicyValidationError` | 400 |
| Access/conviction denied | `AccessBoundaryError` | 403 |
| Conformance violation | `ConformanceViolationError` | 400 |
| Budget exhausted | `ResourceExhaustedError` | 429 |
| State transition invalid | `StateConflictError` | 409 |
| Protocol version mismatch | `ProtocolVersionError` | 422 |

**Acceptance Criteria**:
- [ ] `GovernanceError` and all 6 variants imported from `@0xhoneyjar/loa-hounfour/commons`
- [ ] `errors.ts` extended with `GovernanceError` → `BffError` mapping utility
- [ ] `access-policy-validator.ts` produces `PolicyValidationError` instances
- [ ] `conviction-boundary.ts` denial responses use `AccessBoundaryError`
- [ ] `conformance-signal.ts` violations use `ConformanceViolationError`
- [ ] All governance errors include `severity` and optional `remediation`
- [ ] Tests verify error mapping preserves HTTP status codes

> Sources: loa-hounfour CHANGELOG v8.0.0 ("GovernanceError 6-variant union"),
> errors.ts, access-policy-validator.ts:36-69, conviction-boundary.ts:362-401

#### FR-7: Wire GovernanceMutation with Required `actor_id`

**Current**: No governance mutation tracking exists. Policy changes (e.g., conviction tier thresholds, access matrix updates) happen without audit trail.

**Target**: Implement `GovernanceMutation` from commons for all policy changes:
1. Every governance policy change produces a mutation record with required `actor_id`
2. `evaluateGovernanceMutation()` validates mutation before application
3. Mutation history provides auditable trail of governance evolution

**Acceptance Criteria**:
- [ ] `GovernanceMutation`, `GovernanceMutationSchema`, `evaluateGovernanceMutation` imported from `@0xhoneyjar/loa-hounfour/commons`
- [ ] Mutation envelope includes `mutation_id` (UUID), `expected_version`, `mutated_at`, `actor_id`
- [ ] `evaluateGovernanceMutation()` called before any policy modification
- [ ] Mutation history stored and queryable
- [ ] `actor_id` required on all mutations (v8.1.0 breaking change compliance)
- [ ] Tests verify mutation validation rejects missing `actor_id`

> Sources: loa-hounfour CHANGELOG v8.1.0 ("GovernanceMutation.actor_id required"),
> MIGRATION.md (actor_id migration pattern)

#### FR-8: Adopt AuditTrail from Commons

**Current**: `scoring-path-tracker.ts` implements a custom hash chain with `computeScoringPathHash()` and `SCORING_PATH_GENESIS_HASH`. It works but lacks checkpoint support, integrity verification, and pruning capabilities.

**Target**: Refactor `ScoringPathTracker` to compose with `AuditTrail<ScoringPathLog>` from commons:
1. Core hash chain computation preserved (same hash algorithm)
2. Add `createCheckpoint()` for periodic chain snapshots
3. Add `verifyCheckpointContinuity()` for integrity verification between checkpoints
4. Add `pruneBeforeCheckpoint()` for managed log rotation
5. Add `verifyAuditTrailIntegrity()` for full chain verification

**Acceptance Criteria**:
- [ ] `AuditTrail`, `createCheckpoint`, `verifyCheckpointContinuity`, `pruneBeforeCheckpoint`, `verifyAuditTrailIntegrity`, `AUDIT_TRAIL_GENESIS_HASH` imported from commons
- [ ] `ScoringPathTracker` refactored to compose with `AuditTrail<ScoringPathLog>`
- [ ] Existing hash chain behavior preserved (genesis linking, chain integrity)
- [ ] Checkpoint creation functional after N entries (configurable)
- [ ] Continuity verification detects tampered entries
- [ ] Pruning removes entries before checkpoint without breaking chain
- [ ] Metadata (`reputation_freshness`, `routed_model_id`) preserved through refactoring
- [ ] All existing `scoring-path-tracker.test.ts` tests pass unchanged

> Sources: loa-hounfour CHANGELOG v8.1.0 ("checkpoint utilities"),
> scoring-path-tracker.ts, scoring-path-tracker.test.ts

#### FR-9: Adopt GovernedResource Patterns

**Current**: `resource-governor.ts` defines a generic `ResourceGovernor<T>` interface. `governor-registry.ts` provides a registry. `reputation-service.ts` manages reputation but doesn't implement `ResourceGovernor<T>`. Credits and freshness are managed ad-hoc.

**Target**: Replace local `ResourceGovernor<T>` with hounfour's `GovernedResource<T>` pattern:

| Resource | Current | GovernedResource<T> Pattern |
|----------|---------|----------------------------|
| Reputation | `ReputationService` + `InMemoryReputationStore` | `GovernedReputation` with event log + mutation tracking |
| Credits | Ad-hoc budget checks in conviction-boundary | `GovernedCredits` with conservation law enforcement |
| Freshness | `freshness-disclaimer.ts` confidence mapping | `GovernedFreshness` with TTL validation |

**Acceptance Criteria**:
- [ ] `GovernedResource`, `GovernedCredits`, `GovernedReputation`, `GovernedFreshness`, `GOVERNED_RESOURCE_FIELDS` imported from commons
- [ ] `ReputationService` extended to track mutations via `GovernanceMutation`
- [ ] Credit balance managed through `GovernedCredits` with conservation enforcement
- [ ] Freshness metadata uses `GovernedFreshness` with protocol-standard TTL
- [ ] `GovernorRegistry` updated to work with commons `GovernedResource<T>`
- [ ] `resource-governor.ts` local interface deprecated in favor of commons pattern
- [ ] Tests verify governed resource mutation tracking

> Sources: loa-hounfour CHANGELOG v8.0.0 ("GovernedResource<T>"),
> resource-governor.ts, governor-registry.ts, reputation-service.ts

#### FR-10: Adopt StateMachineConfig for State Machines

**Current**: `state-machine.ts` defines 4 state machines as plain objects with a generic `StateMachine<S>` interface. Transitions are validated manually. No cross-state invariants or audit hooks.

**Target**: Replace local `StateMachine<S>` with `StateMachineConfig` from commons:

| Machine | Current States | Enhancement |
|---------|---------------|-------------|
| CircuitStateMachine | closed → open → half_open → {closed, open} | Add max_open_duration invariant |
| MemoryEncryptionMachine | unsealed → sealing → sealed ↔ unsealing | Add sealing timeout invariant |
| AutonomousModeMachine | disabled → enabled → {suspended, confirming} | Add auto-suspend on error threshold |
| ScheduleLifecycleMachine | pending → {active, cancelled} with retry | Add retry budget invariant |

**Acceptance Criteria**:
- [ ] `StateMachineConfig`, `State`, `Transition` imported from `@0xhoneyjar/loa-hounfour/commons`
- [ ] All 4 state machines expressed as `StateMachineConfig` instances
- [ ] `validateTransition()` and `assertTransition()` refactored to use commons validation
- [ ] Cross-state invariants declared (at minimum: circuit max_open_duration)
- [ ] Transition audit hooks wired to emit governance events
- [ ] All existing `state-machine.test.ts` tests pass unchanged
- [ ] New tests for cross-state invariant enforcement

> Sources: loa-hounfour CHANGELOG v8.0.0 ("StateMachineConfig"),
> state-machine.ts:95-155, state-machine.test.ts

### Tier 3: Future-Ready Infrastructure

#### FR-11: Implement DynamicContract + Protocol Versioning

**Current**: No protocol versioning or capability negotiation exists. All clients receive the same response format regardless of their protocol awareness.

**Target**: Implement runtime protocol capability negotiation:

1. **Protocol version header**: `X-Protocol-Version` on all API responses
2. **Capability matrix**: Declare what each protocol version supports
3. **DynamicContract**: Define Dixie's protocol surface as a negotiable contract
4. **ContractNegotiation**: Enable clients to assert required capabilities
5. **Backward compatibility**: Support current version + 2 prior versions
6. **Monotonic expansion verification**: New versions only add capabilities, never remove

**Acceptance Criteria**:
- [ ] `DynamicContract`, `DynamicContractSchema`, `ContractNegotiation`, `ContractNegotiationSchema` imported from commons
- [ ] `isNegotiationValid()`, `computeNegotiationExpiry()`, `verifyMonotonicExpansion()` imported from commons
- [ ] Protocol version constant defined (e.g., `DIXIE_PROTOCOL_VERSION = '8.2.0'`)
- [ ] `X-Protocol-Version` header emitted on all API responses
- [ ] Capability negotiation middleware validates client capability requirements
- [ ] Backward compatibility for 2 prior protocol versions
- [ ] Contract monotonic expansion verified on version bump
- [ ] Tests verify negotiation, capability resolution, and version headers

> Sources: loa-hounfour CHANGELOG v8.0.0 ("DynamicContract"), v8.1.0 ("isNegotiationValid, verifyMonotonicExpansion"),
> MIGRATION.md ("wire DynamicContract at gateway")

#### FR-12: Implement Audit Trail Checkpoints

**Current**: `ScoringPathTracker` maintains an unbounded in-memory chain. No checkpoint or pruning mechanism exists.

**Target**: Production-ready audit trail management:

1. **Automatic checkpointing**: Create checkpoint after every N entries (configurable, default 100)
2. **Continuity verification**: Verify chain integrity between checkpoints on startup
3. **Managed pruning**: Prune entries before oldest active checkpoint
4. **Discontinuity detection**: `HashChainDiscontinuity` schema for detecting and recording chain breaks

**Acceptance Criteria**:
- [ ] `HashChainDiscontinuity`, `HashChainDiscontinuitySchema` imported from commons
- [ ] Checkpoint creation configurable via service options
- [ ] Continuity verification runs on service initialization
- [ ] Pruning preserves checkpoint entries and all entries after latest checkpoint
- [ ] Discontinuity events detected and recorded (not silently ignored)
- [ ] Tests verify checkpoint lifecycle: create → verify → prune → verify

> Sources: loa-hounfour CHANGELOG v8.0.0 ("HashChainDiscontinuity"), v8.1.0 ("checkpoint utilities")

#### FR-13: Implement Quarantine for Unsafe States

**Current**: No quarantine mechanism exists. Unsafe states (corrupted aggregates, broken hash chains, invalid policy states) are either silently tolerated or cause hard failures.

**Target**: Introduce quarantine mechanism using hounfour commons:

1. **QuarantineStatus**: Track which resources are quarantined and why
2. **QuarantineRecord**: Full quarantine event with trigger, timestamp, severity
3. **Automatic quarantine triggers**:
   - Hash chain integrity failure → quarantine scoring path
   - Conservation law violation → quarantine affected resource
   - State machine invariant violation → quarantine machine
4. **Recovery path**: Manual or automatic release from quarantine with re-verification

**Acceptance Criteria**:
- [ ] `QuarantineStatus`, `QuarantineStatusSchema`, `QuarantineRecord` imported from commons
- [ ] Quarantine triggered automatically on integrity failures
- [ ] Quarantined resources excluded from scoring/routing decisions (safe fallback)
- [ ] Quarantine events surfaced in governance error responses
- [ ] Recovery requires passing integrity verification
- [ ] Tests verify quarantine triggers, isolation, and recovery

> Sources: loa-hounfour CHANGELOG v8.0.0 ("QuarantineStatus, QuarantineRecord")

## 5. Non-Functional Requirements

### NFR-1: Zero Breaking External Changes

All changes are internal governance refactoring. No public API surface changes. No new routes, no changed response shapes (except added `X-Protocol-Version` header). External consumers see identical behavior.

### NFR-2: Backward Compatibility

- All existing response formats preserved
- `X-Protocol-Version` header is additive (clients that don't send it get default behavior)
- Quarantine falls back to safe defaults (no hard failures)
- Conservation law factories produce identical results to inline checks

### NFR-3: Test Coverage

- All existing tests must pass unchanged
- New tests for every FR (minimum 3 scenarios per feature)
- Integration tests for: autopoietic loop (FR-1), conservation laws (FR-5), audit trail lifecycle (FR-12)
- Property-based tests for conservation law enforcement where applicable

### NFR-4: Performance

- Conservation law evaluation: <1ms per check (same as inline)
- GovernanceError construction: <0.1ms (object creation)
- AuditTrail checkpoint: <5ms (hash computation + write)
- Protocol negotiation: <0.5ms per request (header parsing + lookup)
- ModelPerformanceEvent emission: fire-and-forget (no latency impact on response)

## 6. Technical Constraints

| Constraint | Detail |
|---|---|
| Hounfour version | v8.2.0 (local: `file:../../loa-hounfour`) |
| Import barrels | `@0xhoneyjar/loa-hounfour/commons` (primary new), `/governance`, `/core`, `/economy` (existing) |
| Breaking: `actor_id` | `GovernanceMutation.actor_id` required (v8.1.0) — all mutations must identify actor |
| Hash algorithm | SHA-256 via `@noble/hashes` (unchanged from cycle-005) |
| Canonicalization | RFC 8785 (unchanged from cycle-005) |
| ADR-006 | Hash chain discontinuity detection (commons pattern) |
| ADR-007 | Commons module organization (barrel structure) |
| ADR-008 | Enforcement SDK design (Path B — factories + utilities) |
| ADR-009 | Dynamic contract integration pattern |

## 7. Scope

### In Scope

- **Tier 1**: ModelPerformanceEvent, QualityObservation, unspecified TaskType, conformance v8.2.0
- **Tier 2**: ConservationLaw factories, GovernanceError union, GovernanceMutation, AuditTrail, GovernedResource, StateMachineConfig
- **Tier 3**: DynamicContract, protocol versioning, audit checkpoints, quarantine mechanism
- **Cross-cutting**: invariants.yaml update, type audit update, conformance suite extension
- **Functional**: Autopoietic feedback loop operational end-to-end

### Out of Scope

- Database schema changes for audit trail persistence (current in-memory sufficient for this cycle)
- Cross-repo E2E integration testing with live Finn instance
- Production deployment changes
- Community TaskType registry infrastructure (ADR-003 Tier 2)
- Multi-agent governance orchestration (Agent Teams feature)

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Commons module API instability | Low | Medium | v8.2.0 is published with 6,393 passing tests; API surface verified |
| GovernanceError refactoring breaks error handling | Medium | Medium | Map existing HTTP status codes first; add new variants incrementally |
| Audit trail checkpoint performance | Low | Low | Checkpointing is configurable; default 100-entry interval is conservative |
| Protocol versioning complexity | Medium | Low | Start with single version; add backward compat incrementally |
| Quarantine false positives | Low | Medium | Conservative triggers only (integrity failures, not transient errors) |
| `actor_id` requirement on GovernanceMutation | Low | Low | Dixie always knows the actor (wallet address or system agent ID) |
| Large refactoring surface (8 service files) | Medium | Medium | Incremental by tier; each tier independently testable and deployable |

## 9. Dependencies

| Dependency | Type | Status |
|---|---|---|
| `@0xhoneyjar/loa-hounfour` v8.2.0 | Local package | Available at `../../loa-hounfour` (already v8.2.0) |
| `@noble/hashes` | Transitive (via hounfour) | Already installed |
| Hounfour ADR-006 (hash chain discontinuity) | Convention | Published in hounfour docs/adr/ |
| Hounfour ADR-007 (commons barrel structure) | Convention | Published in hounfour docs/adr/ |
| Hounfour ADR-008 (enforcement SDK) | Convention | Published in hounfour docs/adr/ |
| Hounfour ADR-009 (dynamic contract) | Convention | Published in hounfour docs/adr/ |
| All prior ADRs (001-005) | Convention | Already compliant from cycle-005 |

## 10. Estimated Effort

| Sprint | Focus | FRs | Tasks (est.) |
|---|---|---|---|
| Sprint 1 | **Protocol Compliance**: ModelPerformanceEvent + QualityObservation + unspecified TaskType + conformance | FR-1, FR-2, FR-3, FR-4 | 6-8 |
| Sprint 2 | **Conservation & Errors**: ConservationLaw factories + GovernanceError discriminated union | FR-5, FR-6 | 6-8 |
| Sprint 3 | **Governance Infrastructure**: GovernanceMutation + AuditTrail refactoring + GovernedResource | FR-7, FR-8, FR-9 | 7-9 |
| Sprint 4 | **State & Contracts**: StateMachineConfig + DynamicContract + protocol versioning | FR-10, FR-11 | 6-8 |
| Sprint 5 | **Safety & Hardening**: Audit checkpoints + quarantine + integration testing + type audit | FR-12, FR-13, cross-cutting | 5-7 |

**Estimated: 5 sprints.** This is a deep adoption cycle — refactoring established patterns to use canonical protocol implementations, closing the autopoietic feedback loop, and adding production safety infrastructure (quarantine, checkpoints, protocol negotiation).

## 11. Architecture Decision Context

This cycle builds on 6 previous cycles of protocol adoption. Key architectural decisions that inform this work:

| ADR | Decision | Relevance |
|-----|----------|-----------|
| adr-hounfour-alignment | Hounfour is source of truth for all protocol types | Extends to commons governance patterns |
| adr-separation-of-powers | Access control boundaries between layers | GovernanceError respects layer boundaries |
| adr-autopoietic-property | Self-improving system via feedback loops | ModelPerformanceEvent closes the loop |
| adr-conviction-currency-path | Reputation as economic signal | GovernedReputation formalizes this |
| adr-constitutional-amendment | Protocol evolution via governed mutation | GovernanceMutation provides the mechanism |

---

*This PRD scopes the full adoption of loa-hounfour v8.2.0 commons governance substrate into loa-dixie, replacing local governance patterns with canonical protocol implementations, closing the autopoietic feedback loop, and enabling runtime protocol negotiation. All three tiers (required, recommended, future-ready) are included per stakeholder direction to use hounfour as the single source of truth.*
