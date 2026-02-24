# SDD: Hounfour v7.9.2 Full Adoption — Civilizational Protocol Compliance

**Version**: 3.0.0
**Date**: 2026-02-23
**Author**: Merlin (Product), Claude (Architecture)
**Cycle**: cycle-003
**Status**: Draft
**PRD Reference**: `grimoires/loa/prd.md` v3.0.0
**Predecessor**: SDD v2.0.0 (cycle-002, Dixie Phase 2 — Experience Orchestrator)

> Sources: PRD v3.0.0, SDD v2.0.0 (Phase 2), adr-hounfour-alignment.md,
> loa-hounfour v7.9.2 API surface (87+ schemas, 34+ utilities),
> loa-hounfour MIGRATION.md, types.ts type audit, protocol-compliance.test.ts

---

## 1. Executive Summary

This SDD describes the internal refactoring required to upgrade Dixie from Hounfour Level 1/2 (partial type imports) to Level 4 (civilizational compliance). The system architecture, middleware pipeline, route structure, and external API contracts are **unchanged**. What changes is the *implementation* behind those contracts — hand-rolled validators, evaluators, and economic arithmetic are replaced with canonical hounfour v7.9.2 utilities.

### Design Principles (Cycle-003)

| Principle | Description |
|-----------|-------------|
| **Replace, don't wrap** | Delete hand-rolled logic entirely; don't wrap hounfour in local abstractions |
| **BigInt at the core, number at the edge** | All economic arithmetic in BigInt; convert to `number` only at JSON serialization boundary |
| **Fail-closed by default** | All hounfour evaluators are fail-closed; preserve this in integration |
| **Barrel-specific imports** | Import from specific barrels (`/core`, `/economy`, `/governance`) not root barrel |
| **Zero custom protocol logic** | If hounfour has it, use it. No "thin wrappers" that duplicate logic. |
| **Additive API evolution** | External HTTP/WS API unchanged; new fields (denial_codes, evaluation_gap) are additive |

---

## 2. Integration Architecture

### 2.1 Import Strategy

Hounfour exports via 9 sub-package barrels. Dixie uses specific barrels to minimize coupling:

```
@0xhoneyjar/loa-hounfour          → evaluateAccessPolicy, validate, validators,
                                      evaluateEconomicBoundary, parseMicroUsd,
                                      reconstructAggregateFromEvents, computeCredentialPrior,
                                      isCredentialExpired, computeEventStreamHash,
                                      verifyAggregateConsistency
@0xhoneyjar/loa-hounfour/core     → AgentIdentity, CircuitState, HealthStatus,
                                      StreamStart, StreamChunk, StreamToolCall,
                                      StreamUsage, StreamEnd, StreamError,
                                      ConversationSealingPolicy, AgentLifecycleState,
                                      AGENT_LIFECYCLE_TRANSITIONS, DomainEvent
@0xhoneyjar/loa-hounfour/economy  → computeCostMicro, computeCostMicroSafe,
                                      verifyPricingConservation, parseNftId,
                                      formatNftId, isValidNftId, checksumAddress,
                                      AccessPolicy (type)
@0xhoneyjar/loa-hounfour/integrity → computeReqHash, verifyReqHash,
                                      deriveIdempotencyKey, EMPTY_BODY_HASH
@0xhoneyjar/loa-hounfour/governance → ReputationScore, isReliableReputation,
                                       computeGovernanceWeight
```

### 2.2 Module Dependency Map (Post-Refactor)

```
┌──────────────────────────────────────────────────────────────────┐
│                    @0xhoneyjar/loa-hounfour v7.9.2               │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  /core   │ │ /economy │ │/integrity│ │   root barrel    │   │
│  │          │ │          │ │          │ │                   │   │
│  │ Types    │ │ Pricing  │ │ ReqHash  │ │ evaluateAccess.. │   │
│  │ Streams  │ │ NftId    │ │ Idempot. │ │ evaluateEcon..   │   │
│  │ Lifecycle│ │ Lifecycle│ │          │ │ validate()       │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬──────────┘   │
│       │             │            │                 │              │
└───────┼─────────────┼────────────┼─────────────────┼──────────────┘
        │             │            │                 │
        ▼             ▼            ▼                 ▼
┌───────────────────────────────────────────────────────────────────┐
│                        Dixie BFF (app/src/)                       │
│                                                                   │
│  types.ts ◄──── /core (AgentIdentity, CircuitState, streams)     │
│  types/memory.ts ◄── /core (AccessPolicy, SealingPolicy)         │
│  types/economic.ts ◄── /economy (computeCostMicro)               │
│  types/conviction.ts (Dixie-specific — no hounfour equivalent)   │
│  types/stream-events.ts ◄── /core (StreamChunk, StreamEnd, etc.) │
│                                                                   │
│  services/memory-auth.ts ◄── root (evaluateAccessPolicy)         │
│  services/access-policy-validator.ts ◄── root (validate)         │
│  services/memory-store.ts ◄── /core (types)                      │
│  services/conviction-resolver.ts ◄── root (evaluateEconomicBndry)│
│  services/stream-enricher.ts ◄── /economy (computeCostMicro)     │
│  services/state-machine.ts ◄── /core (CircuitState, transitions) │
│  services/nft-transfer-handler.ts ◄── /economy (checksumAddress) │
│                                                                   │
│  proxy/finn-client.ts ◄── /integrity (computeReqHash, idempot.)  │
│                                                                   │
│  services/reputation-service.ts [NEW] ◄── root (replay, cred.)   │
│  services/conformance-suite.ts [NEW] ◄── root (validate, schemas)│
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. File-by-File Refactoring Plan

### 3.1 types.ts — Protocol Type Hub (FR-1, FR-5, FR-7)

**Before** (4 exports from hounfour):
```typescript
export type { AccessPolicy, AgentIdentity, CircuitState as HounfourCircuitState } from '@0xhoneyjar/loa-hounfour';
```

**After** (expanded protocol surface):
```typescript
// Core protocol types
export type {
  AccessPolicy,
  AgentIdentity,
  AgentDescriptor,
  AgentLifecycleState,
  CircuitState as HounfourCircuitState,
  HealthStatus as HounfourHealthStatus,
  DomainEvent,
} from '@0xhoneyjar/loa-hounfour/core';

// Economic types
export type {
  EconomicBoundary,
  QualificationCriteria,
  TrustLayerSnapshot,
  CapitalLayerSnapshot,
  DenialCode,
} from '@0xhoneyjar/loa-hounfour';

// Governance types (foundation)
export type {
  ReputationScore,
  ReputationAggregate,
} from '@0xhoneyjar/loa-hounfour/governance';
```

**Retained Dixie-specific types** (no hounfour equivalent):
- `ServiceHealth` — BFF-level aggregation with latency_ms
- `HealthResponse` — Multi-service health composition
- `FinnHealthResponse` — Upstream health shape
- `ErrorResponse` — BFF error format
- `CircuitState` ('half-open' kebab) — Dixie-internal circuit breaker

### 3.2 services/memory-auth.ts — Access Control (FR-1)

**Before** (95 lines, 4 policy types, no hysteresis):
```typescript
import type { AccessPolicy } from '@0xhoneyjar/loa-hounfour';
// hand-rolled checkAccessPolicy() with Record<string, unknown> casting
```

**After**:
```typescript
import { evaluateAccessPolicy } from '@0xhoneyjar/loa-hounfour';
import type { AccessPolicy, AccessPolicyContext, AccessPolicyResult } from '@0xhoneyjar/loa-hounfour';

export function authorizeMemoryAccess(params: {
  wallet: string;
  ownerWallet: string;
  delegatedWallets: string[];
  accessPolicy: AccessPolicy;
  operation: MemoryOperation;
  roles?: string[];
  previouslyGranted?: boolean;  // hysteresis support
}): AuthorizationResult {
  // 1. Owner check (unchanged)
  // 2. Delegation check (unchanged)
  // 3. Policy evaluation → delegates to evaluateAccessPolicy()
  const context: AccessPolicyContext = {
    role: params.roles?.[0],
    timestamp: new Date().toISOString(),
    action: mapOperationToAction(params.operation),
    previously_granted: params.previouslyGranted,
  };
  const result = evaluateAccessPolicy(params.accessPolicy, context);
  return { allowed: result.allowed, reason: result.reason };
}
```

**Key change**: `checkAccessPolicy()` deleted. `evaluateAccessPolicy()` handles 6 policy types including `reputation_gated` and `compound`. No more `Record<string, unknown>` casting.

### 3.3 services/access-policy-validator.ts — Validation (FR-2)

**Before** (82 lines, incomplete invariants):
```typescript
export function validateAccessPolicy(policy: AccessPolicy): PolicyValidationResult { ... }
export function assertValidAccessPolicy(policy: AccessPolicy): void { ... }
```

**After**:
```typescript
import { validate, validators } from '@0xhoneyjar/loa-hounfour';
import type { AccessPolicy } from '@0xhoneyjar/loa-hounfour/core';

export interface PolicyValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

export function validateAccessPolicy(policy: AccessPolicy): PolicyValidationResult {
  const result = validate(validators.accessPolicy(), policy, { crossField: true });
  return {
    valid: result.valid,
    errors: result.valid ? [] : result.errors,
  };
}

export function assertValidAccessPolicy(policy: AccessPolicy): void {
  const result = validateAccessPolicy(policy);
  if (!result.valid) {
    throw {
      status: 400,
      body: {
        error: 'invalid_policy',
        message: result.errors.join('; '),
        violations: result.errors,
      },
    };
  }
}
```

**Key change**: Body reduced from ~60 lines of switch/case to ~5 lines delegating to hounfour's TypeCompiler-cached validator with cross-field invariants.

### 3.4 types/economic.ts — BigInt Pricing (FR-3)

**Before** (59 lines, `number` arithmetic):
```typescript
export function computeCost(model: string, promptTokens: number, completionTokens: number): number {
  // Math.ceil with number — precision loss risk
}
```

**After**:
```typescript
import { computeCostMicro, computeCostMicroSafe, verifyPricingConservation } from '@0xhoneyjar/loa-hounfour/economy';
import type { PricingInput, UsageInput } from '@0xhoneyjar/loa-hounfour/economy';

// Pricing table adapted for hounfour's per-million format
export const MODEL_PRICING: ReadonlyMap<string, PricingInput> = new Map([
  ['claude-sonnet-4-6', { input_per_million_micro: '3000000', output_per_million_micro: '15000000' }],
  ['claude-haiku-4-5', { input_per_million_micro: '800000', output_per_million_micro: '4000000' }],
  ['claude-opus-4-6', { input_per_million_micro: '15000000', output_per_million_micro: '75000000' }],
  ['gpt-4o', { input_per_million_micro: '2500000', output_per_million_micro: '10000000' }],
  ['gpt-4o-mini', { input_per_million_micro: '150000', output_per_million_micro: '600000' }],
]);

/**
 * Compute cost in micro-USD using BigInt arithmetic.
 * Returns number for JSON serialization compatibility.
 */
export function computeCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = findPricing(model);
  if (!pricing) return 0;

  const usage: UsageInput = { prompt_tokens: promptTokens, completion_tokens: completionTokens };
  const result = computeCostMicroSafe(pricing, usage);
  if (!result.ok) return 0;

  // BigInt → number at serialization boundary
  return Number(result.cost);
}

/**
 * Compute cost as BigInt string (internal use).
 */
export function computeCostBigInt(model: string, usage: UsageInput): string {
  const pricing = findPricing(model);
  if (!pricing) return '0';
  return computeCostMicro(pricing, usage);
}

/**
 * Verify billing conservation invariant.
 */
export function verifyBilling(billedCostMicro: string, model: string, usage: UsageInput) {
  const pricing = findPricing(model);
  if (!pricing) return { conserved: false, status: 'unverifiable' as const, delta: '0', computed: '0', reason: 'unknown model' };
  return verifyPricingConservation({ cost_micro: billedCostMicro, pricing_snapshot: pricing }, usage);
}

function findPricing(model: string): PricingInput | undefined {
  // Exact match first, then longest prefix
  if (MODEL_PRICING.has(model)) return MODEL_PRICING.get(model);
  for (const [key, value] of [...MODEL_PRICING.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (model.startsWith(key)) return value;
  }
  return undefined;
}
```

**Key changes**:
- Pricing table uses BigInt-compatible string format (`per_million_micro`)
- `computeCost()` preserved as backward-compatible facade (returns `number`)
- New `computeCostBigInt()` for internal use
- New `verifyBilling()` for conservation checking
- `computeCostMicroSafe()` used (never throws)

### 3.5 services/conviction-resolver.ts — Economic Boundary (FR-4)

**Integration point**: The existing `ConvictionResolver` class gains an economic boundary evaluation step.

```typescript
import { evaluateEconomicBoundary } from '@0xhoneyjar/loa-hounfour';
import type {
  TrustLayerSnapshot,
  CapitalLayerSnapshot,
  QualificationCriteria,
  EconomicBoundaryEvaluationResult,
  DenialCode,
} from '@0xhoneyjar/loa-hounfour';

// New method on ConvictionResolver:
evaluateEconomicBoundaryForWallet(
  wallet: string,
  tier: ConvictionTier,
  bgtStaked: number,
): EconomicBoundaryEvaluationResult {
  const trust: TrustLayerSnapshot = {
    blended_score: this.tierToTrustScore(tier),
    reputation_state: this.tierToReputationState(tier),
  };
  const capital: CapitalLayerSnapshot = {
    budget_remaining: String(bgtStaked * 1_000_000), // BGT → micro-USD equivalent
  };
  const criteria: QualificationCriteria = this.loadCriteriaFromConfig();

  return evaluateEconomicBoundary(trust, capital, criteria, new Date().toISOString());
}
```

**Mapping convention**:
| Conviction Tier | Trust Score | Reputation State |
|-----------------|-------------|------------------|
| observer | 0.0 | cold |
| participant | 0.2 | warming |
| builder | 0.5 | established |
| architect | 0.8 | established |
| sovereign | 1.0 | authoritative |

**Denial code surfacing**: When `evaluateEconomicBoundary` returns `granted: false`, the denial codes and evaluation gaps are included in the HTTP 402/403 response body:

```json
{
  "error": "insufficient_conviction",
  "denial_codes": ["TRUST_SCORE_BELOW_THRESHOLD"],
  "evaluation_gap": {
    "trust_score_gap": 0.3,
    "budget_gap": "50000000"
  }
}
```

### 3.6 types/stream-events.ts — Stream Type Alignment (FR-5)

**Strategy**: Import hounfour's stream types as the protocol base. Dixie-specific enrichment events (Phase 2) are additive — they supplement protocol events, not replace them.

```typescript
// Protocol stream events (from hounfour)
import type {
  StreamStart as HfStreamStart,
  StreamChunk as HfStreamChunk,
  StreamToolCall as HfStreamToolCall,
  StreamUsage as HfStreamUsage,
  StreamEnd as HfStreamEnd,
  StreamError as HfStreamError,
} from '@0xhoneyjar/loa-hounfour/core';

// Re-export protocol types for consumers
export type {
  HfStreamStart,
  HfStreamChunk,
  HfStreamToolCall,
  HfStreamUsage,
  HfStreamEnd,
  HfStreamError,
};

// Dixie-specific enrichment events (BFF-only, not protocol)
// These are ADDITIVE — they supplement protocol events
export interface ReasoningTraceEvent { ... }  // unchanged
export interface EconomicEvent { ... }        // unchanged
export interface PersonalityEvent { ... }     // unchanged
export interface MemoryInjectEvent { ... }    // unchanged
```

**Type compatibility**: Add compile-time assignability tests to verify Dixie's `ChunkEvent` is structurally compatible with hounfour's `StreamChunk`:

```typescript
// In protocol-compliance.test.ts:
const _assignable: HfStreamChunk = { type: 'stream.chunk', stream_id: '', delta: '', index: 0 };
```

### 3.7 services/state-machine.ts — Protocol Alignment (FR-7)

**Before**: Custom `HounfourCircuitState` type redefined locally.

**After**: Import from hounfour core:
```typescript
import type { CircuitState as HounfourCircuitState } from '@0xhoneyjar/loa-hounfour/core';
import { AGENT_LIFECYCLE_TRANSITIONS } from '@0xhoneyjar/loa-hounfour/core';

// CircuitStateMachine: verify transitions match hounfour's canonical definition
// MemoryEncryptionMachine, AutonomousModeMachine, ScheduleLifecycleMachine: Dixie-specific (retained)
```

### 3.8 proxy/finn-client.ts — Integrity Utilities (FR-6)

**New capabilities**: Request hashing and idempotency key derivation.

```typescript
import { computeReqHash, deriveIdempotencyKey } from '@0xhoneyjar/loa-hounfour/integrity';

// In request() method, for mutation endpoints:
const bodyBuffer = Buffer.from(JSON.stringify(opts?.body));
const reqHash = computeReqHash(bodyBuffer);
const idempotencyKey = deriveIdempotencyKey(
  nftId,          // tenant
  reqHash,
  'loa-finn',     // provider
  'bff-proxy',    // model (BFF context)
);
headers['X-Idempotency-Key'] = idempotencyKey;
headers['X-Req-Hash'] = reqHash;
```

### 3.9 services/nft-transfer-handler.ts — NFT Identity (FR-10)

**Before**: Raw `toLowerCase()` wallet comparison.

**After**:
```typescript
import { checksumAddress, isValidNftId } from '@0xhoneyjar/loa-hounfour/economy';

// Replace: wallet.toLowerCase() === other.toLowerCase()
// With: checksumAddress(wallet) === checksumAddress(other)
```

### 3.10 services/reputation-service.ts — NEW (FR-8)

New service file — foundation wiring for reputation utilities:

```typescript
import {
  reconstructAggregateFromEvents,
  verifyAggregateConsistency,
  computeEventStreamHash,
  computeCredentialPrior,
  isCredentialExpired,
} from '@0xhoneyjar/loa-hounfour';

export class ReputationService {
  /** Reconstruct reputation from event history (Oracle verification) */
  reconstructFromEvents(...) { ... }

  /** Verify stored aggregate matches event stream */
  verifyConsistency(...) { ... }

  /** Compute credential prior for NFT transfer (warm-start reputation) */
  computeTransferPrior(...) { ... }
}
```

### 3.11 services/conformance-suite.ts — NEW (FR-9)

New service file — E2E validator conformance tests:

```typescript
import { validate, validators } from '@0xhoneyjar/loa-hounfour';
import * as schemas from '@0xhoneyjar/loa-hounfour/schemas';

export class ConformanceSuite {
  /** Validate a Dixie response payload against hounfour schema */
  validatePayload(schemaName: string, payload: unknown): ValidationResult { ... }

  /** Run full conformance check against all relevant schemas */
  runFullSuite(): ConformanceReport { ... }
}
```

---

## 4. BigInt Serialization Strategy

JSON does not natively support BigInt. The conversion boundary is clearly defined:

```
  ┌─────────────────────┐     ┌─────────────────┐     ┌────────────┐
  │  Hounfour Utilities  │────▶│  Dixie Services  │────▶│ HTTP/WS    │
  │  (BigInt internally) │     │  (BigInt domain)  │     │ (number)   │
  └─────────────────────┘     └─────────────────┘     └────────────┘
         BigInt                      BigInt               Number
                                                    (conversion here)
```

**Rule**: Convert BigInt → `number` ONLY in:
1. Route handlers (before `c.json()`)
2. Stream enricher (before WebSocket write)
3. Signal emitter (before NATS publish)

**Guard**: If `BigInt(value) > Number.MAX_SAFE_INTEGER`, log a warning. This should never happen for micro-USD values (max ~$9 trillion).

---

## 5. Backward Compatibility

### 5.1 External API — Zero Breaking Changes

| Surface | Change | Impact |
|---------|--------|--------|
| HTTP response shapes | Additive `denial_codes`, `evaluation_gap` fields in 402/403 | None — additive |
| WebSocket stream format | Unchanged | None |
| Error codes | Existing codes preserved; new codes additive | None |
| Conviction tier names | Unchanged (observer/participant/builder/architect/sovereign) | None |
| Capability names | Unchanged | None |

### 5.2 Internal API — Intentional Breaking Changes

| Module | Change | Migration |
|--------|--------|-----------|
| `computeCost()` | Same signature, different implementation (BigInt internally) | Transparent |
| `authorizeMemoryAccess()` | New optional `previouslyGranted` param | Backward compatible |
| `validateAccessPolicy()` | Same signature, hounfour backend | Transparent |
| `memory-auth.ts` exports | `validateSealingPolicy()` removed | Use `validate(validators.conversationSealingPolicy(), ...)` |
| `MODEL_PRICING` | Array → Map, string values | Internal consumers updated |

---

## 6. Testing Strategy

### 6.1 Migration Safety Tests

For each replaced function, write a test that exercises the same inputs against both old (snapshot) and new (hounfour) implementations:

```typescript
describe('migration safety: checkAccessPolicy → evaluateAccessPolicy', () => {
  const MIGRATION_VECTORS = [
    { policy: { type: 'none' }, expected: false },
    { policy: { type: 'read_only' }, operation: 'read', expected: true },
    { policy: { type: 'time_limited', duration_hours: 24 }, expected: true },
    { policy: { type: 'role_based', roles: ['admin'] }, role: 'admin', expected: true },
    // NEW: reputation_gated (not possible with old implementation)
    { policy: { type: 'reputation_gated', min_reputation_score: 0.5 }, score: 0.6, expected: true },
  ];
});
```

### 6.2 Conformance Test Suite

New test file: `app/tests/unit/hounfour-conformance.test.ts`

```typescript
// Validates Dixie-generated payloads against hounfour schemas
describe('hounfour conformance', () => {
  test('AccessPolicy payloads pass schema validation');
  test('EconomicMetadata payloads pass schema validation');
  test('Stream events structurally compatible with hounfour stream types');
  test('Billing conservation holds for all pricing paths');
  test('State machine transitions match hounfour canonical definitions');
  test('NFT IDs pass format validation');
  test('Request hashes are deterministic');
  test('Idempotency keys are collision-resistant');
});
```

### 6.3 Conservation Property Tests

```typescript
describe('economic conservation', () => {
  test('computeCostMicro matches computeCost for all MODEL_PRICING entries');
  test('verifyPricingConservation passes for Dixie-computed bills');
  test('BigInt → number conversion preserves value for realistic amounts');
});
```

---

## 7. Files Modified Summary

| File | Action | FR |
|------|--------|-----|
| `app/src/types.ts` | Expand hounfour imports | FR-1,5,7 |
| `app/src/types/memory.ts` | No change (already imports correctly) | — |
| `app/src/types/economic.ts` | BigInt migration + hounfour pricing | FR-3 |
| `app/src/types/stream-events.ts` | Import protocol stream types | FR-5 |
| `app/src/types/conviction.ts` | No change (Dixie-specific) | — |
| `app/src/services/memory-auth.ts` | Replace checkAccessPolicy with evaluateAccessPolicy | FR-1 |
| `app/src/services/access-policy-validator.ts` | Replace with hounfour validate() | FR-2 |
| `app/src/services/memory-store.ts` | No change (types flow through) | — |
| `app/src/services/conviction-resolver.ts` | Add evaluateEconomicBoundary integration | FR-4 |
| `app/src/services/stream-enricher.ts` | Use computeCostMicro internally | FR-3 |
| `app/src/services/state-machine.ts` | Import canonical CircuitState + transitions | FR-7 |
| `app/src/services/nft-transfer-handler.ts` | Use checksumAddress for wallet comparison | FR-10 |
| `app/src/proxy/finn-client.ts` | Add request hashing + idempotency headers | FR-6 |
| `app/src/routes/identity.ts` | Use AgentIdentity type properly | FR-7 |
| `app/src/services/reputation-service.ts` | **NEW** — reputation utility wiring | FR-8 |
| `app/src/services/conformance-suite.ts` | **NEW** — E2E schema validation | FR-9 |
| `app/tests/unit/protocol-compliance.test.ts` | Expand with conformance tests | FR-9 |
| `app/tests/unit/hounfour-conformance.test.ts` | **NEW** — full conformance suite | FR-9 |
| `app/tests/unit/migration-safety.test.ts` | **NEW** — old vs new behavior parity | ALL |
| `app/tests/unit/economic-conservation.test.ts` | **NEW** — BigInt conservation tests | FR-3 |

**Total**: 13 modified files, 5 new files, ~350 lines deleted, ~200 lines added.

---

## 8. Risk Mitigation

### 8.1 BigInt Serialization

**Risk**: `JSON.stringify(bigintValue)` throws `TypeError`.
**Mitigation**: All conversion happens at defined boundaries (§4). Add a `toJSON` helper:

```typescript
function microUsdToNumber(value: string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    console.warn(`micro-USD value ${value} exceeds safe integer range`);
  }
  return n;
}
```

### 8.2 Semantic Drift Between Old and New Access Policy Evaluation

**Risk**: `evaluateAccessPolicy()` might behave differently for edge cases.
**Mitigation**: Migration safety tests (§6.1) exercise all current test vectors against both implementations. Any divergence fails the test.

### 8.3 Hounfour Import Failures

**Risk**: TypeScript resolution fails for barrel imports.
**Mitigation**: `file:../../loa-hounfour` already works. Test all barrel imports in preflight:

```typescript
import '@0xhoneyjar/loa-hounfour';
import '@0xhoneyjar/loa-hounfour/core';
import '@0xhoneyjar/loa-hounfour/economy';
import '@0xhoneyjar/loa-hounfour/integrity';
import '@0xhoneyjar/loa-hounfour/governance';
```

---

## 9. Conformance Level Mapping

| Level | Requirement | Sprint Target |
|-------|-------------|---------------|
| **Level 2 (Structural)** | Types imported, state machines aligned | Sprint 1 |
| **Level 3 (Behavioral)** | Runtime validators, evaluators, BigInt economics | Sprint 2-3 |
| **Level 4 (Civilizational)** | Conformance suite, conservation proofs, E2E pass | Sprint 4 |

---

## 10. ADR Updates

The existing `adr-hounfour-alignment.md` should be updated post-cycle to reflect:

| Field | Old | New |
|-------|-----|-----|
| Dixie Status (Level 1) | Achieved (Sprint 13) | Achieved (Sprint 13) |
| Dixie Status (Level 2) | Target: Sprint 15 | Achieved (cycle-003) |
| Dixie Status (Level 3) | Future | Achieved (cycle-003) |
| Dixie Status (Level 4) | Future | Achieved (cycle-003) |

---

## 11. Related Documents

| Document | Purpose |
|----------|---------|
| `grimoires/loa/prd.md` v3.0.0 | Requirements for this cycle |
| `grimoires/loa/context/adr-hounfour-alignment.md` | Protocol maturity progression |
| `app/src/types.ts` | Type audit (to be updated) |
| `loa-hounfour/CHANGELOG.md` | v7.0.0–v7.9.2 changes |
| `loa-hounfour/MIGRATION.md` | Breaking change guidance |
