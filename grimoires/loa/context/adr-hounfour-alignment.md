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
| 2 | Structural | Aggregate boundaries enforced; state machines use protocol transitions | Target: Sprint 15 |
| 3 | Behavioral | Formal temporal invariants; protocol-level validation at runtime | Future |
| 4 | Civilizational | Cross-system E2E validator (Freeside PR #63) can mechanically verify compliance | Future |

## Current State (Post Sprint 13)

### Types Aligned

| Dixie Type | Hounfour Type | Alignment |
|------------|---------------|-----------|
| `AllowlistData.policy` | `AccessPolicy` | Imported, optional field |
| `OracleIdentity` | `AgentIdentity` | Documented subset |
| `CircuitState` | `CircuitState` | Naming divergence (`half-open` vs `half_open`) |
| `ServiceHealth` | — | Dixie-specific (BFF aggregation) |
| `HealthResponse` | — | Dixie-specific (BFF aggregation) |
| `ErrorResponse` | — | Dixie-specific (BFF error format) |
| `AuditEntry` | `AuditTrailEntry` | Simpler subset |

### Types Still Custom

These types are genuinely Dixie-specific and have no Hounfour equivalent:
- `ServiceHealth` — BFF-level service health aggregation
- `HealthResponse` — Multi-service health composition
- `FinnHealthResponse` — loa-finn health shape (upstream contract)
- `ErrorResponse` — BFF error format for API consumers
- `DixieConfig` — BFF configuration

## Progression Roadmap

### Level 1 → Level 2 (Structural)

**What's needed**: Use Hounfour state machines for lifecycle transitions.

```typescript
// Level 1 (current): Custom circuit breaker states
type CircuitState = 'closed' | 'open' | 'half-open';

// Level 2 (target): Hounfour state machine with validated transitions
import { CircuitState, isValidTransition } from '@0xhoneyjar/loa-hounfour';
// The circuit breaker transitionTo() method validates transitions
// against the protocol's state machine definition.
```

**Milestone**: When integration tests (Sprint 15) exercise real loa-finn, validate that Dixie's state machine transitions align with loa-finn's expectations.

### Level 2 → Level 3 (Behavioral)

**What's needed**: Runtime validation of protocol invariants.

```typescript
// Level 3 (future): Protocol-level invariant checking
import { validateAccessPolicy } from '@0xhoneyjar/loa-hounfour';

// Before applying an AccessPolicy, validate cross-field constraints:
// - time_limited requires duration_hours
// - role_based requires roles array
const result = validateAccessPolicy(policy, { strict: true });
if (!result.valid) throw new ProtocolViolationError(result.errors);
```

**Milestone**: When soul memory governance (Sprint 17 architecture) requires per-conversation access policies, add runtime validation.

### Level 3 → Level 4 (Civilizational)

**What's needed**: Compliance with Freeside PR #63's cross-system E2E validator.

The E2E validator will mechanically verify that:
1. All API request/response shapes conform to Hounfour schemas
2. State transitions follow protocol-defined state machines
3. Billing flows conserve tokens (no creation or destruction)
4. Access policies are enforced consistently across services

**Milestone**: When the E2E validator ships, Dixie should pass without modification because Levels 1-3 are already in place.

## Design Principles

1. **Import, don't duplicate.** When Hounfour has a type, use it. Don't create local copies.
2. **Retain genuinely novel types.** BFF-specific types (ServiceHealth, ErrorResponse) are not protocol concerns.
3. **Document divergence.** When naming conventions differ (half-open vs half_open), document the mapping explicitly.
4. **Progressive adoption.** Don't jump to Level 4 immediately. Each level provides value independently.
5. **Test compliance.** Protocol compliance tests (Sprint 13, Task 13.4) catch drift automatically.

## Related Documents

- `app/src/types.ts` — Type audit and Hounfour imports
- `app/tests/unit/protocol-compliance.test.ts` — Protocol compliance tests
- `grimoires/loa/context/adr-communitarian-agents.md` — Why the governance types matter
