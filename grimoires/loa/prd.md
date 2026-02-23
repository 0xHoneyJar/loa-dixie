# PRD: Hounfour v7.9.2 Full Adoption — Civilizational Protocol Compliance

**Version**: 3.0.0
**Date**: 2026-02-23
**Author**: Merlin (Product), Claude (Synthesis)
**Cycle**: cycle-003
**Status**: Draft
**Predecessor**: cycle-002 PRD v2.0.0 (Dixie Phase 2 — Experience Orchestrator)

> Sources: loa-finn#66 (launch readiness gap analysis), adr-hounfour-alignment.md (maturity levels),
> loa-hounfour v7.9.2 API surface analysis, loa-hounfour CHANGELOG.md (v7.0.0–v7.9.2),
> loa-hounfour MIGRATION.md, cycle-002 sprint-13 (Level 1 achieved), cycle-002 sprint-26
> (Level 2 partial), existing types.ts type audit, protocol-compliance.test.ts

---

## 1. Problem Statement

Dixie achieved Hounfour Level 1 (Interface) in cycle-001 sprint-13 and partial Level 2 (Structural) in cycle-002 sprint-26. After 42 sprints across 2 cycles, Dixie imports **4 types** from `@0xhoneyjar/loa-hounfour` while hand-rolling ~350 lines of logic that hounfour v7.9.2 already provides as battle-tested, cross-field-validated utilities.

**The gap is not cosmetic — it's constitutional.**

Hounfour v7.9.2 has evolved from a type library to a full constitutional protocol contracts package: 87+ TypeBox schemas, 51+ constraint files, 36 evaluator builtins, and 34+ utility functions covering access control, economic boundary evaluation, reputation, governance, pricing, and integrity verification. Dixie's hand-rolled alternatives miss edge cases, lack hysteresis, use `number` arithmetic where BigInt is required for precision, and cannot participate in cross-system E2E validation.

| What Dixie Has | What Hounfour v7.9.2 Provides | Gap |
|---|---|---|
| `checkAccessPolicy()` — 4 policy types, no hysteresis | `evaluateAccessPolicy()` — 6 types including `reputation_gated`, `compound`, with oscillation prevention | Missing 2 policy types + safety |
| `validateAccessPolicy()` — 5 invariant checks | TypeCompiler-cached validator with 10+ cross-field invariants | Incomplete validation |
| `validateSealingPolicy()` — 4 checks | Full schema + cross-field validator with encryption↔key_rotation invariants | Missing invariants |
| `computeCost()` — `number` arithmetic | `computeCostMicro()` — BigInt-only, ceil rounding, conservation verification | Precision loss risk |
| Custom `CircuitState` with naming divergence | Protocol `CircuitState` with `AGENT_LIFECYCLE_TRANSITIONS` | Naming + validation gap |
| Custom stream event types | `StreamStart`, `StreamChunk`, `StreamToolCall`, `StreamUsage`, `StreamEnd` | Type drift |
| No economic boundary evaluation | `evaluateEconomicBoundary()` — Trust × Capital → Access decisions | Missing capability |
| No micro-USD parsing | `parseMicroUsd()` — strict grammar, discriminated union, never throws | Missing safety |
| No request hashing | `computeReqHash()`, `deriveIdempotencyKey()` | Missing idempotency |
| No reputation utilities | `reconstructAggregateFromEvents()`, `computeCredentialPrior()` | Missing capability |

**Cross-system consequence**: Until Dixie achieves Level 4, it cannot pass the Freeside PR #63 E2E validator — meaning deployment requires manual verification that Dixie's contracts align with loa-finn and arrakis. Every deployment is a trust exercise instead of a mechanical proof.

> Sources: adr-hounfour-alignment.md:14-23 (maturity levels), types.ts:1-44 (type audit), loa-finn#66 §1 (P0: adopt loa-hounfour)

## 2. Product Vision

**From ad-hoc alignment to constitutional compliance.** Dixie becomes a first-class citizen of the Hounfour protocol — not a consumer that imports a few types, but a system whose every API boundary, state transition, and economic calculation can be mechanically verified against the shared constitutional contract.

This is the difference between "we think our billing is correct" and "the conservation invariant proves it."

**Three outcomes**:

1. **Zero hand-rolled protocol logic**: Every function that duplicates hounfour capability is replaced with the canonical implementation. No more drift, no more missed edge cases.

2. **Economic boundary integration**: Conviction tier resolution gains Trust × Capital evaluation from `evaluateEconomicBoundary()`. Denial codes provide actionable feedback ("your trust score is 0.3, threshold is 0.5") instead of opaque "access denied."

3. **E2E verifiable**: Dixie's API request/response shapes, state transitions, billing flows, and access policies can be mechanically verified by the cross-system validator. Deployment confidence moves from "reviewed by humans" to "proven by protocol."

> Sources: adr-hounfour-alignment.md:83-93 (Level 4 milestone), loa-finn#66 §1 (cross-system contracts)

## 3. Success Metrics

| ID | Metric | Target | Measurement |
|----|--------|--------|-------------|
| H-1 | Hounfour type imports | 100% of protocol-equivalent types imported | Grep for hand-rolled types that have hounfour equivalents = 0 |
| H-2 | Validator replacement | 100% of hand-rolled validators replaced | `validateAccessPolicy`, `validateSealingPolicy` → hounfour equivalents |
| H-3 | Evaluator adoption | `evaluateAccessPolicy()` + `evaluateEconomicBoundary()` in production paths | Memory auth + conviction gating use canonical functions |
| H-4 | BigInt economic arithmetic | 0 `number`-typed micro-USD computations | All pricing uses `computeCostMicro()` or `parseMicroUsd()` |
| H-5 | Stream type alignment | Dixie stream events structurally compatible with hounfour stream types | Type tests verify assignability |
| H-6 | Integrity utilities | Request hashing + idempotency keys in API paths | `computeReqHash()` and `deriveIdempotencyKey()` integrated |
| H-7 | Cross-field constraint compliance | All hounfour cross-field validators pass for Dixie-generated payloads | Test suite exercises all relevant validators |
| H-8 | E2E validator pass | Dixie passes Freeside PR #63 cross-system E2E validator | CI/CD gate or manual verification |
| H-9 | Economic boundary gating | Conviction resolver uses `evaluateEconomicBoundary()` | Denial codes surfaced in API responses |
| H-10 | Zero custom protocol logic | 0 lines of hand-rolled logic where hounfour equivalent exists | Code audit confirms no duplication |

## 4. User & Stakeholder Context

### Primary Stakeholders

**Cross-System Validators** (automated): The E2E validator (Freeside PR #63) that mechanically verifies protocol compliance across loa-finn, arrakis, and Dixie. This is the ultimate consumer — if it passes, deployment is safe.

**loa-finn Runtime**: Upstream service that produces hounfour-typed payloads. When Dixie consumes these with canonical types, schema mismatches become compile-time errors instead of runtime surprises.

**Operators (Jani, team)**: Gain confidence that Dixie's economic calculations are correct (BigInt conservation), access policies are complete (6 types instead of 4), and state machines are validated.

### Secondary Stakeholders

**dNFT Owners**: Experience improved denial messages ("your BGT stake of 50 is below the 100 threshold for builder tier" instead of "access denied"). Economic metadata becomes provably correct.

**Future Agents**: Agent-to-agent interactions rely on shared protocol types. Full hounfour adoption means agents can trust Dixie's responses without schema validation overhead.

> Sources: loa-finn#66 §4 (E2E gap), adr-hounfour-alignment.md:95-101 (design principles)

## 5. Functional Requirements

### FR-1: Replace Hand-Rolled Access Control (Level 2 → Level 3)

**Current**: `memory-auth.ts:checkAccessPolicy()` — handles 4 policy types (`none`, `read_only`, `time_limited`, `role_based`), no hysteresis, `Record<string, unknown>` casting.

**Target**: Import and use `evaluateAccessPolicy()` from hounfour root barrel. Handles 6 policy types (`+ reputation_gated`, `+ compound`), includes hysteresis to prevent oscillation, enforces `policy_created_at` expiry (v7.2.0+).

**Acceptance Criteria**:
- [ ] `memory-auth.ts` uses `evaluateAccessPolicy()` for all policy evaluation
- [ ] `reputation_gated` and `compound` policy types handled (even if not yet created by Dixie)
- [ ] Hysteresis parameter configurable via BFF config
- [ ] Existing tests updated to exercise hounfour evaluator
- [ ] No `as Record<string, unknown>` casting in access policy code

### FR-2: Replace Hand-Rolled Validators (Level 2 → Level 3)

**Current**: `access-policy-validator.ts` (65 lines), `memory-auth.ts:validateSealingPolicy()` (35 lines) — incomplete invariant coverage.

**Target**: Use hounfour's `validate()` function with TypeCompiler-cached validators from the `validators` object.

**Acceptance Criteria**:
- [ ] `access-policy-validator.ts` replaced with hounfour `validators.accessPolicy`
- [ ] Sealing policy validation uses `validators.conversationSealingPolicy`
- [ ] All API boundary validation uses `validate(schema, data, { crossField: true })`
- [ ] `assertValidAccessPolicy()` wraps hounfour validator with HTTP 400 response

### FR-3: BigInt Economic Arithmetic (Level 3)

**Current**: `economic.ts:computeCost()` — uses `number` type, floating-point `Math.ceil()`, per-1K-token multiplication.

**Target**: `computeCostMicro()` from hounfour economy barrel — BigInt-only arithmetic, ceil rounding (AWS/Stripe standard), conservation verification via `verifyPricingConservation()`.

**Acceptance Criteria**:
- [ ] All micro-USD computations use BigInt
- [ ] `computeCost()` replaced with `computeCostMicro()` (or thin wrapper that returns `number` for JSON serialization)
- [ ] `parseMicroUsd()` used for any string → micro-USD conversion
- [ ] `verifyPricingConservation()` called in billing paths
- [ ] `MODEL_PRICING` table adapted to BigInt input/output format
- [ ] Stream enricher uses BigInt internally, converts to `number` only at serialization boundary

### FR-4: Economic Boundary Integration (Level 3)

**Current**: Conviction tiers are a standalone Dixie-specific system (BGT staking → 5 tiers → capabilities).

**Target**: Wire `evaluateEconomicBoundary()` into the conviction resolution path. The existing 5-tier model maps to hounfour's Trust × Capital evaluation:
- **Trust**: Reputation score from interaction history (maps to conviction tiers)
- **Capital**: BGT staking amount (maps directly)

**Acceptance Criteria**:
- [ ] `conviction-resolver.ts` calls `evaluateEconomicBoundary()` as part of tier resolution
- [ ] Structured denial codes (`TRUST_SCORE_BELOW_THRESHOLD`, `CAPITAL_BELOW_THRESHOLD`, etc.) surfaced in 402/403 responses
- [ ] Evaluation gaps included in denial responses for actionable feedback
- [ ] Existing `tierMeetsRequirement()` remains as convenience helper; gating logic delegates to hounfour
- [ ] `EconomicBoundary` configuration loadable from BFF config

### FR-5: Protocol Stream Type Alignment (Level 2)

**Current**: Custom `StreamEvent` union in `stream-events.ts` — structurally similar to hounfour's stream types but independently defined.

**Target**: Dixie stream event types derive from or are structurally compatible with hounfour's `StreamStart`, `StreamChunk`, `StreamToolCall`, `StreamUsage`, `StreamEnd`, `StreamError`.

**Acceptance Criteria**:
- [ ] Hounfour stream types imported from `@0xhoneyjar/loa-hounfour/core`
- [ ] Dixie-specific stream events (Phase 2 enrichments) extend/supplement protocol types
- [ ] Type compatibility tests verify assignability between Dixie events and hounfour events
- [ ] Backward compatibility maintained — existing WebSocket consumers see no breaking changes

### FR-6: Integrity & Idempotency Utilities (Level 3)

**Current**: No request hashing or idempotency key derivation.

**Target**: Integrate hounfour integrity barrel for request deduplication and audit trail.

**Acceptance Criteria**:
- [ ] `computeReqHash()` used for request fingerprinting in proxy layer
- [ ] `deriveIdempotencyKey()` integrated for mutation endpoints (memory writes, sealing, scheduling)
- [ ] Request hashes logged in structured logs for correlation
- [ ] Idempotency keys checked against Redis for duplicate request detection

### FR-7: State Machine Protocol Alignment (Level 2 → Level 3)

**Current**: `state-machine.ts` defines 4 custom state machines with generic validation. `HounfourCircuitState` duplicates the protocol type.

**Target**: State machine definitions reference hounfour's canonical transition maps where they exist. Dixie-specific machines (MemoryEncryption, AutonomousMode, ScheduleLifecycle) remain custom but use hounfour's constraint evaluation for invariant checking.

**Acceptance Criteria**:
- [ ] `CircuitStateMachine` transitions verified against hounfour's canonical definition
- [ ] `HounfourCircuitState` type in `state-machine.ts` imported from hounfour, not redefined
- [ ] Agent lifecycle transitions reference `AGENT_LIFECYCLE_TRANSITIONS` from hounfour core
- [ ] Runtime transition validation produces structured errors compatible with hounfour's format

### FR-8: Reputation & Governance Foundation (Level 3 → Level 4)

**Current**: No reputation computation. No governance utilities.

**Target**: Integrate reputation replay and credential utilities for future agent interaction verification.

**Acceptance Criteria**:
- [ ] `reconstructAggregateFromEvents()` available in service layer for Oracle verification
- [ ] `computeCredentialPrior()` usable for reputation bootstrapping on NFT transfer
- [ ] `isReliableReputation()` available for trust decisions
- [ ] Governance weight computation (`computeGovernanceWeight()`) available for conviction voting
- [ ] These are wired as importable services, not necessarily called in all paths yet — foundation for Level 4

### FR-9: E2E Validator Compliance (Level 4)

**Current**: No E2E validation capability.

**Target**: All Dixie API request/response shapes pass the cross-system E2E validator.

**Acceptance Criteria**:
- [ ] Conformance test suite validates Dixie payloads against hounfour JSON schemas
- [ ] All response envelopes use hounfour-compatible shapes
- [ ] Billing events conserve tokens (verified by conservation property)
- [ ] Access policy enforcement consistent with protocol definition
- [ ] State transitions follow protocol-defined machines
- [ ] Test suite runnable in CI as a gate

### FR-10: NFT Identity Utilities (Level 2)

**Current**: Raw wallet addresses with manual `toLowerCase()` comparison.

**Target**: Use hounfour's `parseNftId()`, `formatNftId()`, `isValidNftId()`, `checksumAddress()` for type-safe identity handling.

**Acceptance Criteria**:
- [ ] All NFT ID parsing uses `parseNftId()`
- [ ] Wallet comparisons use `checksumAddress()` instead of `toLowerCase()`
- [ ] Invalid NFT IDs rejected with structured errors at API boundaries

## 6. Non-Functional Requirements

### NFR-1: No Runtime Regression
- All existing tests pass after migration
- Response latency P99 unchanged (< 200ms for cached paths)
- No new runtime dependencies beyond what hounfour already pulls (`@noble/hashes`, `@sinclair/typebox`, `canonicalize`, `jose`)

### NFR-2: Backward-Compatible API
- WebSocket stream format unchanged for existing clients
- HTTP API response shapes unchanged (or strictly additive — new fields like `denial_code`)
- Conviction tier names and capabilities unchanged

### NFR-3: Type Safety
- Zero `as Record<string, unknown>` casts in protocol-touching code
- Zero `any` types in protocol-touching code
- TypeScript strict mode passes without suppressions

## 7. Scope & Prioritization

### In Scope (This Cycle)

| Priority | Requirement | Rationale |
|----------|-------------|-----------|
| P0 | FR-1 (Access Control) | Highest ROI — replaces most hand-rolled logic |
| P0 | FR-2 (Validators) | Prerequisite for Level 3 |
| P0 | FR-3 (BigInt Economics) | Precision safety — prevents real billing errors |
| P0 | FR-4 (Economic Boundary) | User-requested; unlocks actionable denial codes |
| P1 | FR-5 (Stream Types) | Type alignment reduces drift |
| P1 | FR-7 (State Machines) | Structural compliance |
| P1 | FR-10 (NFT Utilities) | Address safety |
| P2 | FR-6 (Integrity) | New capability; foundation for Level 4 |
| P2 | FR-8 (Reputation) | Foundation wiring; not yet called in all paths |
| P3 | FR-9 (E2E Validator) | Final gate; requires all other FRs complete |

### Out of Scope

- Changes to loa-hounfour itself (consumed as-is at v7.9.2)
- Changes to loa-finn's API contracts
- New user-facing features (this is a refactor cycle)
- Web frontend changes (BFF-only)
- Database schema changes

## 8. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| BigInt serialization breaks JSON responses | Medium | High | Thin wrapper converts BigInt → number at serialization boundary only |
| `evaluateAccessPolicy()` semantics differ from hand-rolled version | Low | Medium | Write migration tests that exercise both old and new paths |
| Stream type alignment breaks WebSocket consumers | Low | High | Type compatibility tests; additive-only changes to event shapes |
| hounfour v7.9.2 has undocumented breaking changes from v7.0.0 | Low | Medium | hounfour is post-ejection (FINAL); MIGRATION.md covers all breaks |
| E2E validator not available for testing | Medium | Low | Write conformance tests locally using hounfour JSON schemas |
| Economic boundary evaluation adds latency to conviction resolution | Low | Low | `evaluateEconomicBoundary()` is a pure function — sub-microsecond |

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| `@0xhoneyjar/loa-hounfour` v7.9.2 | Package | Available (file:../../loa-hounfour) |
| loa-hounfour JSON schemas | Test fixtures | Available in loa-hounfour/schemas/ |
| Freeside PR #63 E2E validator | FR-9 gate | Research status — may not be available for CI |
| Node.js >= 22 | Runtime | Already met |

## 9. Technical Context

### Import Path Strategy

Hounfour exports via 9 sub-package barrels. Dixie should use specific barrels to minimize bundle impact:

```typescript
// Prefer specific barrels over root barrel
import { evaluateAccessPolicy } from '@0xhoneyjar/loa-hounfour';           // Root — utilities
import type { AgentIdentity, CircuitState } from '@0xhoneyjar/loa-hounfour/core';
import { computeCostMicro } from '@0xhoneyjar/loa-hounfour/economy';
import { validate, validators } from '@0xhoneyjar/loa-hounfour';           // Root — validators
import { computeReqHash } from '@0xhoneyjar/loa-hounfour/integrity';
import type { ReputationScore } from '@0xhoneyjar/loa-hounfour/governance';
```

### BigInt Serialization Strategy

JSON doesn't natively support BigInt. Strategy:
1. Use BigInt internally for all economic arithmetic
2. Convert to `number` at the serialization boundary (JSON response construction)
3. Verify conservation invariant BEFORE conversion
4. Log a warning if BigInt value exceeds `Number.MAX_SAFE_INTEGER`

### Backward Compatibility Strategy

All changes are internal refactors. External API contract unchanged:
- HTTP response shapes: identical (or additive `denial_code` field)
- WebSocket stream format: identical (Dixie stream events are BFF-specific enrichments)
- Error codes: identical (new codes are additive)

## 10. Related Documents

| Document | Purpose |
|----------|---------|
| `grimoires/loa/context/adr-hounfour-alignment.md` | Protocol maturity levels and progression roadmap |
| `grimoires/loa/sdd.md` | Software Design Document (to be updated for cycle-003) |
| `app/src/types.ts` | Current type audit with alignment table |
| `app/tests/unit/protocol-compliance.test.ts` | Existing protocol compliance tests |
| `loa-hounfour/CHANGELOG.md` | Version history for v7.0.0–v7.9.2 |
| `loa-hounfour/MIGRATION.md` | Breaking changes between major versions |
| `loa-finn#66` | Launch readiness gap analysis (source issue) |
