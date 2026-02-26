# ADR-002: Circuit Breaker Topology — Singleton to Fleet

**Status**: Accepted
**Date**: 2026-02-26
**Source**: Bridgebuilder Deep Review BB-DEEP-02

## Context

`FinnClient` uses a library-level circuit breaker with in-memory state (`consecutiveFailures`, `lastFailureAt`, `circuitState`). In staging (single docker-compose instance), this works correctly. In production (ECS Fargate auto-scaling groups per STAGING.md §10), multiple dixie-bff instances will maintain independent circuit state.

This is the same problem Netflix encountered with Hystrix: library-level circuit breakers work at single-instance scale but produce unpredictable fleet-level behavior when instances disagree on circuit state.

## Decision

For staging, the singleton circuit breaker is acceptable — document the limitation. For production, evaluate three migration options:

### Option A: Redis-Backed Shared State

Share circuit state across instances via Redis sorted sets with TTL:

```
Key: dixie:circuit:finn
Members: failure timestamps (score = unix epoch)
State: SCARD > threshold → open
```

**Pros**: Simple, leverages existing Redis infrastructure.
**Cons**: Redis becomes a circuit breaker dependency (circular failure risk).

### Option B: Service Mesh Delegation (Envoy)

Delegate circuit breaking to the ALB/service mesh layer. Envoy sidecar configuration:

```yaml
circuit_breakers:
  thresholds:
    - max_connections: 100
      max_pending_requests: 50
      max_retries: 3
```

**Pros**: Infrastructure-level, no application code changes.
**Cons**: Requires Envoy/Istio adoption.

### Option C: NATS-Coordinated Health Reporting

Each instance publishes circuit events to the existing NATS bus. Instances use event-sourced circuit state:

```
Subject: dixie.circuit.finn
Events: { type: 'failure' | 'success', instance: string, ts: number }
```

**Pros**: Uses existing NATS infrastructure, event-sourced (auditable).
**Cons**: More complex, eventually consistent.

## Recommendation

**Option A** for initial production deployment (simplest, leverages existing Redis). Evaluate **Option B** if/when a service mesh is adopted.

The circuit breaker should also be registered as a `GovernedResource` — it has state (closed/open/half-open), transitions (failure/success/cooldown), and invariants (max failures, window). The `circuitState` attribute on `dixie.finn.inference` spans already treats it as observable governance state.

## Consequences

- Staging operates with singleton circuit breaker (documented limitation)
- Production roadmap includes shared circuit state before auto-scaling
- Circuit breaker state appears in OTEL spans for observability regardless of topology
