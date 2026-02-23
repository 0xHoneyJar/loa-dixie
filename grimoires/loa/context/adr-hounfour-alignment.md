# ADR: Hounfour Protocol Alignment Strategy

**Status**: Accepted
**Date**: 2026-02-20
**Source**: Bridgebuilder Persona Review Part V (S-1, Decision Trail Gap), Part VI (Autopoiesis)
**References**: loa-hounfour PR #1, PR #2, Freeside PR #63 (E2E validator)

## Context

Dixie is a consumer of the Hounfour protocol — the shared type system that defines how loa-finn, arrakis (freeside), and downstream services communicate. Protocol compliance is not optional; it's the mechanism by which cross-system validation works.

The Bridgebuilder review identified Hounfour alignment as the highest-priority strategic recommendation (S-1, HIGH) and noted that Dixie defines custom types where protocol types already exist.

## Protocol Maturity Levels

Hounfour defines four levels of protocol maturity:

| Level | Name | What It Means | Dixie Status |
|-------|------|---------------|-------------|
| 1 | Interface | Types are imported and used for API shapes | **Achieved (Sprint 13)** |
| 2 | Structural | Aggregate boundaries enforced; state machines use protocol transitions | **Achieved (Sprint 1)** |
| 3 | Behavioral | Formal temporal invariants; protocol-level validation at runtime | **Achieved (Sprints 2-3)** |
| 4 | Civilizational | Cross-system E2E validator (Freeside PR #63) can mechanically verify compliance | **Achieved (Sprint 4)** |

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

## Progression Roadmap (All Levels Achieved)

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

## Design Principles

1. **Import, don't duplicate.** When Hounfour has a type, use it. Don't create local copies.
2. **Retain genuinely novel types.** BFF-specific types (ServiceHealth, ErrorResponse) are not protocol concerns.
3. **Document divergence.** When naming conventions differ (half-open vs half_open), document the mapping explicitly.
4. **Progressive adoption.** Don't jump to Level 4 immediately. Each level provides value independently.
5. **Test compliance.** Protocol compliance tests (Sprint 13, Task 13.4) catch drift automatically.

## Related Documents

- `app/src/types.ts` — Type audit and Hounfour imports
- `app/src/services/conformance-suite.ts` — E2E conformance suite service (Sprint 4)
- `app/tests/unit/hounfour-conformance.test.ts` — Level 4 conformance tests (Sprint 4)
- `app/tests/unit/protocol-compliance.test.ts` — Protocol compliance tests (Sprint 13, expanded Sprint 4)
- `app/src/services/access-policy-validator.ts` — Runtime AccessPolicy validation (Sprint 1)
- `app/src/services/state-machine.ts` — Hounfour-aligned state machines (Sprint 1)
- `app/src/services/conviction-boundary.ts` — Economic boundary integration (Sprint 3)
- `app/src/services/reputation-service.ts` — Governance function wiring (Sprint 3)
- `grimoires/loa/context/adr-communitarian-agents.md` — Why the governance types matter
