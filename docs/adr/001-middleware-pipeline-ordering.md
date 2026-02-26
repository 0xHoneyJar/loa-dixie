# ADR-001: Middleware Pipeline as Constitutional Ordering

**Status**: Accepted
**Date**: 2026-02-26
**Source**: Bridgebuilder Deep Review BB-DEEP-05

## Context

The Dixie BFF middleware pipeline is not a performance optimization — it encodes governance priorities. Community membership (allowlist) gates economic access (payment), which gates capability access (routes). Reordering these middlewares would change the governance model of the system.

This ordering was initially documented as a code comment in `server.ts:300-327`. This ADR elevates it to a first-class architectural decision record.

## Decision

The middleware pipeline follows a 15-position constitutional ordering:

| Position | Middleware | Rationale |
|----------|-----------|-----------|
| 1 | `requestId` | Generate trace ID before anything else |
| 2 | `tracing` | OpenTelemetry spans need the request ID |
| 3 | `secureHeaders` | Security headers on every response |
| 4 | `cors` | CORS must precede body parsing |
| 5 | `bodyLimit` | Reject oversized payloads early |
| 6 | `responseTime` | Wraps all downstream processing |
| 7 | `logger` | Logs with response time available |
| 8 | `jwt` | Extracts wallet from token |
| 9 | `walletBridge` | Copy wallet to header for route handlers |
| 10 | `rateLimit` | Rate-limit by wallet/IP (Redis-backed) |
| 11 | `allowlist` | Gate by wallet/API key (community membership) |
| 12 | `payment` | x402 micropayment hook (economic access) |
| 13 | `convictionTier` | BGT conviction resolver (governance tier) |
| 14 | `memoryContext` | Soul memory injection |
| 15 | `economicMetadata` | Cost tracking setup |

### Governance Ordering Invariant

The critical governance ordering is positions 11 → 12 → 13:

```
allowlist (community membership) → payment (economic access) → convictionTier (capability access)
```

This ensures community governance controls economic flows, not the other way around. A request that is not in the allowlist never reaches the payment gate. A request that hasn't paid never has its conviction tier resolved.

### Architectural Parallels

- **Google Zanzibar (2019)**: Authorization is not a feature but a coordination substrate. Dixie's middleware ordering IS the authorization model.
- **Facebook TAO**: Data access patterns encode organizational politics. The middleware sequence encodes governance politics.
- **Ostrom's Commons Governance**: The ordering implements graduated sanctions (rate limit → circuit breaker → deny) and nested enterprises (governor registry with multi-resource coordination).

## Consequences

- Changing the middleware ordering is an architectural decision, not a code change
- New middleware must be inserted at the correct position with documented rationale
- The comment block in `server.ts` references this ADR for the full reasoning
- RTFM validation can verify the ADR exists and is current
