# ADR-001: Autopoietic Loop Closure

**Status**: Accepted
**Date**: 2026-02-26
**Deciders**: Bridgebuilder review on PR #46
**Supersedes**: N/A

## Context

Dixie's reputation system accumulates quality signals (model performance events, quality
observations, task completions) and maintains per-agent blended scores. Finn's multi-model
router needs these scores at request time to bias pool selection toward higher-reputation
agents. Without closing this loop, reputation data accumulates in dixie but never influences
routing decisions — the system is open-loop.

PR #46 sits at the convergence of four architectural lineages:

1. **Hounfour governance substrate** — TypeBox schemas, conformance vectors,
   `GovernedResource<T>` interface that ReputationService implements.
2. **Dixie Phase 2+3** — persistent reputation via `pg-reputation-store`, audit trails,
   hash chains, knowledge governance.
3. **Finn routing** — multi-model routing with cost/quality/capability tradeoffs.
   Finn's `ReputationQueryFn` contract is `(poolId, routingKey) => Promise<number | null>`.
4. **Freeside governance** — billing, conservation invariants, Ostrom governance patterns.

The Bridgebuilder deep review recommended documenting the closure mechanism as an ADR:
"Why the autopoietic loop was closed this way, and what invariants it establishes."

## Decision

Close the autopoietic feedback loop via an **HTTP query surface** (`GET /api/reputation/query`)
that finn polls at routing time.

### Alternatives Considered

| Alternative | Rejection Reason |
|---|---|
| **Event streaming** (SSE/WebSocket push from dixie to finn) | Adds operational complexity; finn needs request-time scores, not event streams. Score changes are infrequent relative to routing requests. |
| **Shared database** (finn reads dixie's reputation tables directly) | Violates service boundary; creates deployment coupling. Schema changes in dixie would require coordinated finn releases. |
| **gRPC** | HTTP is simpler, team has deeper familiarity, and polling cadence (~seconds) does not require streaming or bidirectional communication. |

### Key Design Decisions

**1. ReputationQueryFn contract drives API shape.**
Finn's existing interface — `(poolId, routingKey) => Promise<number | null>` — dictates that
the query endpoint returns a single nullable numeric score. The `routingKey` uses `nft:<id>`
prefix format (validated by `ROUTING_KEY_RE` in `routes/reputation.ts`). The endpoint returns
`{ score: number | null }` — null signals "no opinion" for cold/unknown agents.

**2. ES256 asymmetric JWT for service-to-service auth.**
`service-jwt.ts` verifies finn's identity using ECDSA P-256 (ES256) with SPKI public keys.
Directional trust: finn holds the private key to prove identity; dixie holds only the public
key and cannot forge tokens. Required claims: `iss = 'loa-finn'`, `aud = 'loa-dixie'`.
Clock skew tolerance: 30s.

**3. 5-second TTL LRU cache.**
`ReputationCache` (10K max entries, LRU eviction) sits between the query endpoint and
PostgreSQL. The 5s TTL is a deliberate CAP trade-off: availability over strong consistency.
Score writes land in PG immediately but the cache serves the prior value until TTL expires.
This is acceptable because finn's polling cadence does not require sub-second freshness.
For tighter consistency, `invalidate(nftId)` is available after `processEvent()`.

**4. DEFAULT_COLLECTION_SCORE = 0.5 — Maximum Entropy Principle.**
The Bayesian prior for unknown agents is 0.5 (neutral), not 0 (pessimistic) or 1 (optimistic).
This is epistemic neutrality: "no opinion" rather than "bad agent." The
`CollectionScoreAggregator` (Welford's online algorithm) gradually replaces this prior with
the empirical population mean as observations accumulate.

**5. Negative caching prevents thundering herd on cold keys.**
When an agent has no reputation record, the cache stores `null` for that key. Without this,
repeated finn queries for cold/new agents would each hit PostgreSQL — a thundering herd
pattern during onboarding surges.

**6. Conviction tier gating.**
Detailed reputation data (`GET /:nftId`) requires `builder+` conviction tier. The lightweight
query endpoint (`GET /query`) is gated only by service JWT — finn needs scores regardless of
the querying human's conviction level.

## Invariants Established

**INV-006: Feedback Dampening (EMA bounds).**
The `computeDampenedScore` function uses an exponential moving average with alpha in
`[0.1, 0.5]`, ramping linearly over 50 samples. This prevents runaway convergence: a single
outlier observation cannot dominate an agent's score. Cold-start agents (alpha = 0.1) are
conservative; mature agents (alpha = 0.5) are responsive. Verified by
`ReputationService.verify('INV-006')`.

**INV-013: Reputation Conservation (blended_score derivable from events).**
`reconstructAggregateFromEvents()` can rebuild any agent's aggregate by replaying the event
log. This ensures the blended score is a deterministic function of the event history — no
hidden state, full auditability. The event log is append-only; `credential_update` events are
recorded for audit but do not alter scores.

## Consequences

### What This Unblocks

- **Finn wiring**: `resolvePoolWithReputation()` can call dixie's query endpoint with the
  agent's routing key and receive a score that biases model selection.
- **Goodhart protection**: Temporal decay and exploration budget (future work) build on the
  dampened score foundation established here.
- **Cross-service E2E testing**: Docker Compose integration with real ES256 JWT exchange
  between finn and dixie.

### Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Cache staleness causes stale routing | 5s TTL bounds max staleness; `invalidate()` available for tighter consistency |
| Cold agents penalized by lack of data | `null` score signals "no data" — finn treats null as neutral, not negative |
| Single point of failure (dixie down) | Finn should implement circuit breaker; `null` response is safe fallback |
| Score gaming via repeated positive signals | EMA dampening bounds convergence rate; exploration budget (future) adds noise |

### Operational Notes

- Cache metrics available via `ReputationCache.metrics` (hits, misses, size, hit rate).
- Population statistics available at `GET /api/reputation/population` (admin-gated).
- Event replay via `reconstructAggregateFromEvents()` enables offline auditing.
