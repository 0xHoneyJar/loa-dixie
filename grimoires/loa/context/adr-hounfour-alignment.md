# ADR: Hounfour Protocol Alignment Strategy

**Status**: Accepted
**Date**: 2026-02-20
**Source**: Bridgebuilder Persona Review Part V (S-1, Decision Trail Gap), Part VI (Autopoiesis)
**References**: loa-hounfour PR #1, PR #2, Freeside PR #63 (E2E validator)

## Context

Dixie is a consumer of the Hounfour protocol — the shared type system that defines how loa-finn, arrakis (freeside), and downstream services communicate. Protocol compliance is not optional; it's the mechanism by which cross-system validation works.

The Bridgebuilder review identified Hounfour alignment as the highest-priority strategic recommendation (S-1, HIGH) and noted that Dixie defines custom types where protocol types already exist.

## Protocol Maturity Levels

Hounfour defines six levels of protocol maturity:

| Level | Name | What It Means | Dixie Status |
|-------|------|---------------|-------------|
| 1 | Interface | Types are imported and used for API shapes | **Achieved (Sprint 13)** |
| 2 | Structural | Aggregate boundaries enforced; state machines use protocol transitions | **Achieved (Sprint 1)** |
| 3 | Behavioral | Formal temporal invariants; protocol-level validation at runtime | **Achieved (Sprints 2-3)** |
| 4 | Civilizational | Cross-system E2E validator (Freeside PR #63) can mechanically verify compliance | **Achieved (Sprint 4)** |
| 5 | Runtime Constitutional Enforcement | Every payload crossing a protocol boundary is validated at runtime; invalid payloads rejected or logged; conformance is mechanical, not social | **Foundation (Sprint 7)** |
| 6 | Adaptive Protocol Co-Evolution | Protocol changes auto-detected via diff engine, migration proposals generated, human approval required for breaking changes; constitutional amendment process governs schema evolution | **Foundation (Sprint 12)** |

## Current State (Post Sprint 4 — Level 4 Achieved)

### Types Aligned

| Dixie Type | Hounfour Type | Alignment | Since |
|------------|---------------|-----------|-------|
| `AllowlistData.policy` | `AccessPolicy` | Imported, validated at runtime | Sprint 13 |
| `OracleIdentity` | `AgentIdentity` | Documented subset | Sprint 13 |
| `CircuitState` | `CircuitState` | Naming divergence (`half-open` vs `half_open`); protocol mapping via `CircuitStateMachine` | Sprint 13 |
| `ServiceHealth` | — | Dixie-specific (BFF aggregation) | — |
| `HealthResponse` | — | Dixie-specific (BFF aggregation) | — |
| `ErrorResponse` | — | Dixie-specific (BFF error format) | — |
| `AuditEntry` | `AuditTrailEntry` | Simpler subset | Sprint 13 |
| `CircuitStateMachine` | `isValidTransition` | State machine uses `HounfourCircuitState` | Sprint 1 |
| `AccessPolicyValidator` | `validators.accessPolicy()` + `validateAccessPolicy()` | Full schema + cross-field validation | Sprint 1 |
| `EconomicMetadata` | `PricingInput` / `computeCostMicro` | BigInt-safe pricing via hounfour | Sprint 2 |
| `verifyBilling` | `verifyPricingConservation` | Conservation verification wrapper | Sprint 2 |
| `FinnClient integrity` | `computeReqHash` / `deriveIdempotencyKey` | Request hashing + idempotency headers | Sprint 3 |
| `ConvictionBoundary` | `evaluateEconomicBoundary` | Tier → trust mapping + boundary evaluation | Sprint 3 |
| `ReputationService` | `computeBlendedScore` / `isReliableReputation` | Governance function wiring | Sprint 3 |
| `ConformanceSuite` | `validate` / `validators` | E2E schema conformance validation | Sprint 4 |
| `StreamEvents` | `StreamStartSchema` etc. | Type re-exports for protocol compatibility | Sprint 1 |

### Types Still Custom

These types are genuinely Dixie-specific and have no Hounfour equivalent:
- `ServiceHealth` — BFF-level service health aggregation
- `HealthResponse` — Multi-service health composition
- `FinnHealthResponse` — loa-finn health shape (upstream contract)
- `ErrorResponse` — BFF error format for API consumers
- `DixieConfig` — BFF configuration

## Progression Roadmap

### Level 1 → Level 2 (Structural) — Achieved Sprint 1

Hounfour state machines adopted for lifecycle transitions. `CircuitStateMachine` uses
`HounfourCircuitState` type. `AccessPolicyValidator` runs TypeBox schema + cross-field
invariant validation. `isValidTransition` imported for protocol state machine reference.

### Level 2 → Level 3 (Behavioral) — Achieved Sprints 2-3

Runtime validation of protocol invariants implemented:
- BigInt-safe economic arithmetic via `computeCostMicro` (Sprint 2)
- Billing conservation verification via `verifyPricingConservation` (Sprint 2)
- Request integrity via `computeReqHash` + `deriveIdempotencyKey` (Sprint 3)
- Economic boundary evaluation via `evaluateEconomicBoundary` (Sprint 3)
- Reputation governance wiring via `computeBlendedScore`, `isReliableReputation` (Sprint 3)

### Level 3 → Level 4 (Civilizational) — Achieved Sprint 4

E2E conformance suite validates all protocol-touching payloads mechanically:
1. `ConformanceSuite.runFullSuite()` validates all sample payloads against schemas
2. `hounfour-conformance.test.ts` — comprehensive test file covering all 9 conformance areas
3. `protocol-compliance.test.ts` — expanded with economic boundary, stream, conservation, integrity tests
4. All Dixie payloads pass `validators.accessPolicy()`, `validators.conversationSealingPolicy()`
5. Billing conservation holds for all pricing paths (BigInt-verified)
6. State machine transitions match hounfour canonical definitions
7. Request hashes deterministic, idempotency keys collision-resistant

### Level 4 → Level 5 (Runtime Constitutional Enforcement) — Foundation Sprint 7

Level 4 proves compliance mechanically via test suites that run at build time. Level 5
extends this to **runtime**: every payload that crosses a protocol boundary is validated
before it reaches the consumer. Invalid payloads are rejected (development) or logged
with full diagnostic context (production).

**Analogy**: Kubernetes admission webhooks. In Kubernetes, a ValidatingAdmissionWebhook
intercepts every API request and rejects those that violate policy — regardless of who
submitted them. Level 5 is the same concept applied to protocol payloads: the middleware
intercepts every outgoing response and validates it against hounfour schemas.

**Components (Sprint 7)**:
1. `conformance-middleware.ts` — Hono middleware factory with configurable sampling
2. `conformance-signal.ts` — Wires violations into NATS signal pipeline
3. `generate-conformance-fixtures.ts` — Auto-generates valid samples from hounfour schemas
4. `ConformanceViolationSignal` — Signal type for telemetry/alerting

**Progression Criteria (Level 5 Fully Achieved)**:
- [ ] Middleware deployed on all protocol-boundary routes (not just opt-in)
- [ ] Sample rate tuned per environment (1.0 dev, 0.001 prod)
- [ ] Violation alerting wired to CloudWatch/PagerDuty
- [ ] Zero violations sustained for 7 days in production
- [ ] Auto-generated fixtures cover all 53 hounfour schemas (requires upstream defaults)

**What Level 5 guarantees that Level 4 does not**:
- Level 4: "Our test payloads conform" (build-time assurance)
- Level 5: "Every payload conforms" (runtime assurance)
- The gap between these is the gap between sample-based testing and monitoring.
  Level 5 closes it by treating schema conformance as a runtime property, not
  just a test property.

### Level 5 → Level 6 (Adaptive Protocol Co-Evolution) — Foundation Sprint 12

Level 5 guarantees that every runtime payload conforms. Level 6 extends this to
**protocol evolution**: when hounfour itself changes, consumers automatically detect
the changes, generate migration proposals, and follow a constitutional amendment process
for breaking changes.

**Analogy**: Apache Avro and Google Protocol Buffers both define schema evolution rules.
In Avro, reader and writer schemas must be "compatible" according to formal rules
(backward, forward, or full compatibility). In Protobuf, fields can be added but not
removed from a message. Level 6 applies this concept to the hounfour ecosystem:
schema changes are classified (patch/minor/major), compatibility is checked mechanically,
and migration proposals are generated automatically.

**Components (Sprint 12)**:
1. `protocol-diff-engine.ts` — Snapshots hounfour's schema registry and diffs two versions
2. `migration-proposal.ts` — Generates actionable MigrationProposal from a ProtocolChangeManifest
3. `adr-constitutional-amendment.md` — Formal amendment process (patch/minor/major categories)
4. `protocol-evolution.test.ts` — Tests for diff engine, migration proposals, and code map completeness

**Progression Criteria (Level 6 Fully Achieved)**:
- [x] Protocol Diff Engine can snapshot and compare hounfour versions (Sprint 12)
- [x] Migration Proposal Generator produces actionable items with effort/priority (Sprint 12)
- [x] Constitutional Amendment ADR defines patch/minor/major process (Sprint 12)
- [x] Code maps (DENIAL_CODE_MAP, ALLOWED_CODE_MAP) validated for completeness (Sprint 12)
- [ ] Cross-repo conformance orchestrator runs as CI pipeline (Future — Phase 2)
- [ ] Protocol diff runs automatically on hounfour PRs (Future — Phase 2)
- [ ] Breaking changes auto-block until all consumers approve (Future — Phase 3)
- [ ] N-1 support policy enforced mechanically (Future — Phase 3)

**What Level 6 guarantees that Level 5 does not**:
- Level 5: "Every payload conforms to the current version" (runtime assurance)
- Level 6: "Version transitions are safe, planned, and reversible" (evolution assurance)
- The gap between these is the gap between static compliance and adaptive compliance.
  Level 5 answers "do we conform now?" Level 6 answers "will we still conform after
  the protocol changes?"

**Avro/Protobuf Schema Evolution Parallel**:
| Concept | Avro | Protobuf | Hounfour Level 6 |
|---|---|---|---|
| Schema registry | Confluent Schema Registry | Buf Schema Registry | ProtocolDiffEngine snapshots |
| Compatibility check | `avro-tools` compatibility | `buf breaking` | ProtocolChangeManifest |
| Migration guide | Manual | `buf migrate` | MigrationProposal generator |
| Evolution rules | BACKWARD/FORWARD/FULL | Field presence rules | Semver (patch/minor/major) |
| Breaking change detection | Schema mismatch at read time | `buf breaking --against` | ProtocolDiffEngine.diffVersions() |

## Design Principles

1. **Import, don't duplicate.** When Hounfour has a type, use it. Don't create local copies.
2. **Retain genuinely novel types.** BFF-specific types (ServiceHealth, ErrorResponse) are not protocol concerns.
3. **Document divergence.** When naming conventions differ (half-open vs half_open), document the mapping explicitly.
4. **Progressive adoption.** Don't jump to Level 4 immediately. Each level provides value independently.
5. **Test compliance.** Protocol compliance tests (Sprint 13, Task 13.4) catch drift automatically.

## Related Documents

- `app/src/types.ts` — Type audit and Hounfour imports
- `app/src/services/conformance-suite.ts` — E2E conformance suite service (Sprint 4)
- `app/src/middleware/conformance-middleware.ts` — Runtime conformance middleware (Sprint 7, Level 5)
- `app/src/services/conformance-signal.ts` — Conformance violation signal pipeline (Sprint 7)
- `app/scripts/generate-conformance-fixtures.ts` — Auto-fixture generation from hounfour (Sprint 7)
- `app/tests/unit/level5-foundation.test.ts` — Level 5 foundation tests (Sprint 7)
- `app/tests/fixtures/hounfour-generated-samples.json` — Auto-generated conformance samples
- `app/tests/unit/hounfour-conformance.test.ts` — Level 4 conformance tests (Sprint 4)
- `app/tests/unit/protocol-compliance.test.ts` — Protocol compliance tests (Sprint 13, expanded Sprint 4)
- `app/src/services/access-policy-validator.ts` — Runtime AccessPolicy validation (Sprint 1)
- `app/src/services/state-machine.ts` — Hounfour-aligned state machines (Sprint 1)
- `app/src/services/conviction-boundary.ts` — Economic boundary integration (Sprint 3)
- `app/src/services/reputation-service.ts` — Governance function wiring (Sprint 3)
- `grimoires/loa/context/adr-communitarian-agents.md` — Why the governance types matter
- `grimoires/loa/context/adr-dixie-enrichment-tier.md` — Dixie as context enrichment tier (Sprint 7)
- `app/src/services/protocol-diff-engine.ts` — Protocol Diff Engine (Sprint 12, Level 6)
- `app/src/services/migration-proposal.ts` — Migration Proposal Generator (Sprint 12, Level 6)
- `grimoires/loa/context/adr-constitutional-amendment.md` — Constitutional amendment process (Sprint 12)
- `app/tests/unit/protocol-evolution.test.ts` — Level 6 foundation tests (Sprint 12)
