# Dixie Architecture — Governed Multi-Agent BFF

> **Version**: 8.2.0 (protocol version) | **Generated**: 2026-02-28 | **Sprint**: 124 (cycle-020)
>
> Every factual claim in this document cites a source file and line number.
> Format: `file:line` relative to repository root.

## 1. System Overview

Dixie is a **governed multi-agent Backend-for-Frontend (BFF)** built on [Hono](https://hono.dev/)
that serves as the API gateway for the Armitage Ring. It mediates between frontend clients and
the loa-finn backend, enforcing governance, authentication, rate limiting, and economic controls
at the middleware layer.

**Key architectural properties:**

- **Constitutional middleware ordering** -- 15-position pipeline encoding governance priorities
  (`app/src/server.ts:302-330`)
- **GovernedResource pattern** -- Unified governance protocol for state, transitions, and invariants
  (`app/src/services/governed-resource.ts:95-127`)
- **Hounfour L2 state machines** -- Runtime-validated state transitions with 409 rejection
  (`app/src/services/state-machine.ts:1-14`)
- **Graceful degradation** -- Infrastructure clients (PG, Redis, NATS) are nullable; the system
  operates with reduced capability when backends are unavailable
  (`app/src/server.ts:120-151`)
- **Protocol versioning** -- Every response includes `X-Protocol-Version: 8.2.0` header
  (`app/src/services/protocol-version.ts:18,84-95`)

**Entry point**: `app/src/index.ts:1-59` -- creates the app, starts the HTTP server, attaches
WebSocket upgrade handler, and registers graceful shutdown hooks for SIGTERM/SIGINT.

**App factory**: `app/src/server.ts:108` -- `createDixieApp(config)` returns a `DixieApp` struct
containing the Hono app, all service instances, and infrastructure clients.

---

## 2. Service Catalog

The codebase contains **66 service modules** in `app/src/services/`, organized below by domain.
Additionally there are 17 middleware modules, 16 route modules, 16 type definition files,
5 utility modules, 1 proxy module, and 7 core modules (133 source modules total).

### 2.1 Core Infrastructure (5 modules)

Services providing foundational capabilities that other domains depend on.

| Service | File | Line | Description |
|---------|------|------|-------------|
| redis-client | `app/src/services/redis-client.ts` | 1 | Redis client factory with `createRedisClient()` |
| ticket-store | `app/src/services/ticket-store.ts` | 1 | In-memory WebSocket ticket store for upgrade auth |
| memory-store | `app/src/services/memory-store.ts` | 1 | Soul memory CRUD via FinnClient + ProjectionCache |
| signal-emitter | `app/src/services/signal-emitter.ts` | 1 | NATS pub/sub emitter for cross-service events |
| projection-cache | `app/src/services/projection-cache.ts` | 1 | Generic Redis-backed TTL cache (`ProjectionCache<T>`) |

Instantiation: `app/src/server.ts:118-164`

### 2.2 Governance & Resource Management (12 modules)

The governance backbone implementing the GovernedResource pattern, invariant verification,
conformance checking, and conservation laws.

| Service | File | Line | Description |
|---------|------|------|-------------|
| governed-resource | `app/src/services/governed-resource.ts` | 95 | `GovernedResource<TState, TEvent, TInvariant>` interface |
| governor-registry | `app/src/services/governor-registry.ts` | 1 | Central registry for GovernedResource instances |
| resource-governor | `app/src/services/resource-governor.ts` | 1 | Base resource governance implementation |
| knowledge-governor | `app/src/services/knowledge-governor.ts` | 1 | Knowledge freshness governance (3rd ResourceGovernor witness) |
| fleet-governor | `app/src/services/fleet-governor.ts` | 181 | `GovernedResource<FleetState, FleetEvent, FleetInvariant>` |
| sovereignty-engine | `app/src/services/sovereignty-engine.ts` | 103 | `GovernedResource<AgentAutonomy, AutonomyEvent, AutonomyInvariant>` |
| access-policy-validator | `app/src/services/access-policy-validator.ts` | 1 | Policy validation for resource access |
| conformance-signal | `app/src/services/conformance-signal.ts` | 1 | Governance conformance signal emission |
| conformance-suite | `app/src/services/conformance-suite.ts` | 1 | Conformance test suite for governance rules |
| state-machine | `app/src/services/state-machine.ts` | 1 | hounfour L2 state machine validation (4 machines) |
| conservation-laws | `app/src/services/conservation-laws.ts` | 1 | Governance conservation law enforcement |
| conviction-boundary | `app/src/services/conviction-boundary.ts` | 1 | Conviction tier boundary calculations |

Registration: `app/src/server.ts:533-551` (governor-registry wiring)

### 2.3 Reputation & Scoring (10 modules)

Event-sourced reputation aggregation, scoring engines, and conviction resolution.

| Service | File | Line | Description |
|---------|------|------|-------------|
| reputation-service | `app/src/services/reputation-service.ts` | 316 | `GovernedResource<ReputationAggregate \| undefined, ReputationEvent, ReputationInvariant>` |
| reputation-cache | `app/src/services/reputation-cache.ts` | 1 | 5s TTL, 10K max entry reputation cache |
| reputation-event-store | `app/src/services/reputation-event-store.ts` | 1 | Append-only reputation event log |
| pg-reputation-store | `app/src/services/pg-reputation-store.ts` | 1 | PostgreSQL-backed ReputationStore implementation |
| reputation-scoring-engine | `app/src/services/reputation-scoring-engine.ts` | 1 | Pure scoring computation (BB-DEEP-03 extraction) |
| scoring-path-tracker | `app/src/services/scoring-path-tracker.ts` | 171 | `GovernedResource<ScoringPathState, ScoringPathEvent, ScoringPathInvariant>` |
| scoring-path-logger | `app/src/services/scoring-path-logger.ts` | 1 | Scoring path audit logging |
| collection-score-aggregator | `app/src/services/collection-score-aggregator.ts` | 1 | Population-level score aggregation |
| conviction-resolver | `app/src/services/conviction-resolver.ts` | 1 | Wallet -> BGT staking -> conviction tier resolution |
| conviction-boundary | `app/src/services/conviction-boundary.ts` | 1 | Conviction tier boundary calculations |

Backend selection: `app/src/server.ts:211-224` (PostgreSQL in production, InMemory in dev/test)

### 2.4 Fleet & Task Orchestration (15 modules)

Multi-agent fleet management, task lifecycle, agent spawning, and durable event delivery.

| Service | File | Line | Description |
|---------|------|------|-------------|
| conductor-engine | `app/src/services/conductor-engine.ts` | 65 | Fleet orchestration engine |
| fleet-governor | `app/src/services/fleet-governor.ts` | 181 | Conviction-gated spawn admission (SELECT FOR UPDATE) |
| fleet-monitor | `app/src/services/fleet-monitor.ts` | 1 | Fleet health and status monitoring |
| fleet-saga | `app/src/services/fleet-saga.ts` | 1 | Long-running fleet operation sagas |
| fleet-metrics | `app/src/services/fleet-metrics.ts` | 1 | Fleet performance metrics collection |
| task-registry | `app/src/services/task-registry.ts` | 1 | Task lifecycle management |
| agent-spawner | `app/src/services/agent-spawner.ts` | 1 | Agent process spawning |
| agent-identity-service | `app/src/services/agent-identity-service.ts` | 1 | Agent identity lifecycle |
| meeting-geometry-router | `app/src/services/meeting-geometry-router.ts` | 1 | Geometry-based agent meeting routing |
| agent-model-router | `app/src/services/agent-model-router.ts` | 1 | Model selection routing for agents |
| agent-secret-provider | `app/src/services/agent-secret-provider.ts` | 1 | Secure credential injection for agents |
| circulation-protocol | `app/src/services/circulation-protocol.ts` | 1 | Agent-to-agent message circulation |
| mutation-log-store | `app/src/services/mutation-log-store.ts` | 1 | Durable governance mutation recording (PG) |
| audit-trail-store | `app/src/services/audit-trail-store.ts` | 1 | Hash-chained audit trail (PG) |
| outbox-worker | `app/src/services/outbox-worker.ts` | 1 | Transactional outbox for at-least-once delivery |

Fleet DB tables: migrations 013, 014, 015 (`app/src/db/migrations/`)

### 2.5 Memory & Context (6 modules)

Soul memory storage, encryption, caching, and context injection.

| Service | File | Line | Description |
|---------|------|------|-------------|
| memory-store | `app/src/services/memory-store.ts` | 1 | Soul memory CRUD via FinnClient |
| memory-auth | `app/src/services/memory-auth.ts` | 1 | Memory access authorization |
| projection-cache | `app/src/services/projection-cache.ts` | 1 | Generic Redis TTL cache |
| enrichment-client | `app/src/services/enrichment-client.ts` | 1 | External enrichment API client |
| stream-enricher | `app/src/services/stream-enricher.ts` | 1 | Streaming context enrichment |
| context-enrichment-engine | `app/src/services/context-enrichment-engine.ts` | 1 | Cross-governor context enrichment |

Memory pipeline: `app/src/server.ts:163-164` (MemoryStore wiring)

### 2.6 Learning & Knowledge (9 modules)

Compound learning, knowledge governance, corpus management, and collective intelligence.

| Service | File | Line | Description |
|---------|------|------|-------------|
| compound-learning | `app/src/services/compound-learning.ts` | 1 | Batch learning engine (10 interactions) |
| knowledge-governor | `app/src/services/knowledge-governor.ts` | 1 | Knowledge freshness governance |
| knowledge-priority-store | `app/src/services/knowledge-priority-store.ts` | 1 | Conviction-weighted community voting |
| corpus-meta | `app/src/services/corpus-meta.ts` | 1 | Corpus metadata management |
| exploration | `app/src/services/exploration.ts` | 1 | Knowledge exploration service |
| enrichment-service | `app/src/services/enrichment-service.ts` | 1 | Autopoietic loop enrichment (Sprint 11) |
| bridge-insights | `app/src/services/bridge-insights.ts` | 1 | Bridge review insight extraction |
| collective-insight-service | `app/src/services/collective-insight-service.ts` | 1 | Cross-agent collective intelligence |
| protocol-version | `app/src/services/protocol-version.ts` | 18 | Protocol version `8.2.0`, compatibility checking |

Knowledge store wiring: `app/src/server.ts:286-290` (priority store with disk persistence)

### 2.7 Protocol & Evolution (7 modules)

Protocol versioning, diff computation, dynamic contracts, and governance mutation tracking.

| Service | File | Line | Description |
|---------|------|------|-------------|
| protocol-version | `app/src/services/protocol-version.ts` | 1 | Version string + middleware + compatibility |
| protocol-diff-engine | `app/src/services/protocol-diff-engine.ts` | 1 | Protocol version diff computation |
| migration-proposal | `app/src/services/migration-proposal.ts` | 1 | Governance migration proposal system |
| dynamic-contract-store | `app/src/services/dynamic-contract-store.ts` | 1 | hounfour DynamicContract persistence (PG) |
| quality-feedback | `app/src/services/quality-feedback.ts` | 1 | Quality signal feedback collection |
| freshness-disclaimer | `app/src/services/freshness-disclaimer.ts` | 1 | Knowledge freshness disclaimer generation |
| governance-mutation | `app/src/services/governance-mutation.ts` | 1 | Mutation creation and logging |

### 2.8 Economic & Access Control (6 modules)

Payment gating, autonomous operations, scheduling, and retry logic.

| Service | File | Line | Description |
|---------|------|------|-------------|
| access-policy-validator | `app/src/services/access-policy-validator.ts` | 1 | Policy-based access validation |
| personality-cache | `app/src/services/personality-cache.ts` | 1 | BEAUVOIR personality cache via FinnClient |
| autonomous-engine | `app/src/services/autonomous-engine.ts` | 1 | Autonomous operation engine (budget-capped) |
| schedule-store | `app/src/services/schedule-store.ts` | 1 | NL-parsed cron schedule management |
| retry-engine | `app/src/services/retry-engine.ts` | 1 | Exponential backoff retry engine |
| notification-service | `app/src/services/notification-service.ts` | 1 | Event notification delivery |

Autonomous budget default: 100,000 micro-USD (`app/src/config.ts:168`)

### 2.9 Cross-System Integration (9 modules)

Event bus, context enrichment, error taxonomy, NFT transfer handling, and governance errors.

| Service | File | Line | Description |
|---------|------|------|-------------|
| cross-governor-event-bus | `app/src/services/cross-governor-event-bus.ts` | 1 | Inter-governor event propagation |
| context-enrichment-engine | `app/src/services/context-enrichment-engine.ts` | 1 | Multi-governor context assembly |
| enrichment-client | `app/src/services/enrichment-client.ts` | 1 | External enrichment API client |
| governance-errors | `app/src/services/governance-errors.ts` | 1 | Governance error taxonomy |
| enrichment-service | `app/src/services/enrichment-service.ts` | 1 | Autopoietic loop enrichment assembly |
| collective-insight-service | `app/src/services/collective-insight-service.ts` | 1 | Cross-agent intelligence aggregation |
| nft-transfer-handler | `app/src/services/nft-transfer-handler.ts` | 1 | NFT ownership transfer event handling |
| governance-mutation | `app/src/services/governance-mutation.ts` | 1 | Mutation log helper (MutationLog class) |

---

## 3. Middleware Pipeline — 15-Position Constitutional Ordering

The middleware sequence is explicitly documented as a **constitutional ordering** that encodes
governance priorities. Allowlist (community membership) gates payment (economic access), which
gates conviction tier resolution (capability access). This ensures community governance controls
economic flows, not the other way around.

**Source**: `app/src/server.ts:302-412`

| Position | Middleware | Scope | File | Registration Line |
|----------|-----------|-------|------|-------------------|
| 1 | `requestId` | `*` | `app/src/middleware/request-id.ts` | `server.ts:333` |
| 2 | `tracing` | `*` | `app/src/middleware/tracing.ts` | `server.ts:334` |
| 3 | `secureHeaders` | `*` | hono built-in | `server.ts:335-345` |
| 3.5 | `protocolVersion` | `*` | `app/src/services/protocol-version.ts:84` | `server.ts:347` |
| 4 | `cors` | `/api/*` | `app/src/middleware/cors.ts` | `server.ts:349` |
| 5 | `bodyLimit` | `/api/*` | `app/src/middleware/body-limit.ts` | `server.ts:350` |
| 6 | `responseTime` | `*` | inline | `server.ts:353-357` |
| 7 | `logger` | `*` | `app/src/middleware/logger.ts` | `server.ts:360` |
| 8 | `jwt` | `/api/*` | `app/src/middleware/jwt.ts` | `server.ts:363` |
| 9 | `walletBridge` | `/api/*` | `app/src/middleware/wallet-bridge.ts` | `server.ts:368` |
| 10 | `rateLimit` | `/api/*` | `app/src/middleware/rate-limit.ts` | `server.ts:371-373` |
| 11 | `allowlist` | `/api/*` | `app/src/middleware/allowlist.ts` | `server.ts:376` |
| 12 | `payment` | `/api/*` | `app/src/middleware/payment.ts` | `server.ts:381` |
| 13 | `convictionTier` | `/api/*` | `app/src/middleware/conviction-tier.ts` | `server.ts:386` |
| 14 | `memoryContext` | `/api/*` | `app/src/middleware/memory-context.ts` | `server.ts:391-406` |
| 15 | `economicMetadata` | `/api/*` | `app/src/middleware/economic-metadata.ts` | `server.ts:412` |

### Governance Invariant: Positions 11 -> 12 -> 13

The ordering `allowlist -> payment -> convictionTier` is an **architectural invariant**
(`app/src/server.ts:302-310`):

1. **Allowlist** (position 11) -- community membership gate. Denied wallets never reach payment.
2. **Payment** (position 12) -- x402 micropayment hook. Only admitted wallets are billed.
3. **ConvictionTier** (position 13) -- BGT conviction resolution. Only paying wallets get
   tier-gated capabilities.

This ordering ensures community governance controls economic flows. Reordering these three
middlewares is an **architectural decision**, not a refactoring task.

### Additional Route-Scoped Middleware

| Middleware | Scope | File | Registration Line |
|-----------|-------|------|-------------------|
| `tba-auth` | `/api/agent/*` | `app/src/middleware/tba-auth.ts` | `server.ts:475-490` |
| `fleet-auth` | fleet routes | `app/src/middleware/fleet-auth.ts` | (route-level) |
| `conformance-middleware` | conformance routes | `app/src/middleware/conformance-middleware.ts` | (route-level) |
| `service-jwt` | service-to-service | `app/src/middleware/service-jwt.ts` | (route-level) |

---

## 4. GovernedResource Pattern

The `GovernedResource<TState, TEvent, TInvariant>` interface (`app/src/services/governed-resource.ts:95-127`)
provides a unified governance protocol for all domain-specific state management:

```typescript
interface GovernedResource<TState, TEvent, TInvariant extends string = string> {
  readonly resourceId: string;
  readonly resourceType: string;
  readonly current: TState;
  readonly version: number;
  transition(event: TEvent, actorId: string): Promise<TransitionResult<TState>>;
  verify(invariantId: TInvariant): InvariantResult;
  verifyAll(): InvariantResult[];
  readonly auditTrail: Readonly<AuditTrail>;
  readonly mutationLog: ReadonlyArray<GovernanceMutation>;
}
```

**Source**: `app/src/services/governed-resource.ts:95-127`

### 4.1 Four Implementations

| # | Class | Type Parameters | File:Line |
|---|-------|----------------|-----------|
| 1 | `FleetGovernor` | `GovernedResource<FleetState, FleetEvent, FleetInvariant>` | `app/src/services/fleet-governor.ts:181` |
| 2 | `SovereigntyEngine` | `GovernedResource<AgentAutonomy, AutonomyEvent, AutonomyInvariant>` | `app/src/services/sovereignty-engine.ts:103-104` |
| 3 | `ReputationService` | `GovernedResource<ReputationAggregate \| undefined, ReputationEvent, ReputationInvariant>` | `app/src/services/reputation-service.ts:316` |
| 4 | `ScoringPathTracker` | `GovernedResource<ScoringPathState, ScoringPathEvent, ScoringPathInvariant>` | `app/src/services/scoring-path-tracker.ts:171` |

**Design note** (`app/src/services/governed-resource.ts:17-19`): The `GovernedResourceBase`
abstract class was removed in cycle-019 (Sprint 120). All 4 implementors use
`implements GovernedResource<...>` directly.

### 4.2 Canonical Migration (Sprint 120)

Dixie maintains its own field names (e.g., `state` vs canonical `newState`, `satisfied` vs
`holds`, `invariant_id` vs `invariantId`) alongside canonical hounfour types via `Canonical*`
prefixed re-exports (`app/src/services/governed-resource.ts:43-48`).

A migration helper `toMutationContext()` (`app/src/services/governed-resource.ts:142-147`)
converts Dixie's `actorId: string` to canonical `MutationContext`.

### 4.3 Type Definitions

| Type | Definition | File:Line |
|------|-----------|-----------|
| `FleetState` | `{ activeCount, tierLimits, ... }` | `app/src/services/fleet-governor.ts:40` |
| `FleetEvent` | union type | `app/src/services/fleet-governor.ts:48` |
| `FleetInvariant` | `'INV-014' \| 'INV-015' \| 'INV-016'` | `app/src/services/fleet-governor.ts:55` |
| `AgentAutonomy` | `{ identityId, level, reputation, taskCount, resources }` | `app/src/services/sovereignty-engine.ts:34` |
| `AutonomyEvent` | imported from `types/agent-identity.ts` | `app/src/services/sovereignty-engine.ts:15` |
| `AutonomyInvariant` | imported from `types/agent-identity.ts` | `app/src/services/sovereignty-engine.ts:16` |
| `ReputationAggregate` | imported from `@0xhoneyjar/loa-hounfour/governance` | `app/src/services/reputation-service.ts:24` |
| `ReputationEvent` | imported from `types/reputation-evolution.ts` | `app/src/services/reputation-service.ts:43` |
| `ReputationInvariant` | `'INV-006' \| 'INV-007'` | `app/src/services/reputation-service.ts:313` |
| `ScoringPathState` | `{ ... }` | `app/src/services/scoring-path-tracker.ts:154` |
| `ScoringPathEvent` | union type | `app/src/services/scoring-path-tracker.ts:162` |
| `ScoringPathInvariant` | `'chain_integrity' \| 'cross_chain_consistency' \| 'checkpoint_coverage'` | `app/src/services/scoring-path-tracker.ts:168` |

---

## 5. State Machines — Hounfour Level 2 (Structural)

Four state machines provide runtime transition validation. Invalid transitions are rejected
with HTTP 409 via `TransitionError` (`app/src/services/state-machine.ts:50-72`).

**Source**: `app/src/services/state-machine.ts:122-271`

### 5.1 CircuitState (3 states)

Circuit breaker for the FinnClient proxy.

```
closed --> open --> half_open --> closed
                            \--> open
```

| From | Allowed Targets |
|------|----------------|
| `closed` | `open` |
| `open` | `half_open` |
| `half_open` | `closed`, `open` |

**Definition**: `app/src/services/state-machine.ts:131-139`
**Initial state**: `closed`
**Terminal states**: none (always recoverable)

### 5.2 MemoryEncryptionState (4 states)

Soul memory seal/unseal lifecycle.

```
unsealed --> sealing --> sealed --> unsealing --> unsealed
                  \--> unsealed          \--> sealed
```

| From | Allowed Targets |
|------|----------------|
| `unsealed` | `sealing` |
| `sealing` | `sealed`, `unsealed` (failure rollback) |
| `sealed` | `unsealing` |
| `unsealing` | `unsealed`, `sealed` (failure rollback) |

**Definition**: `app/src/services/state-machine.ts:147-156`
**Initial state**: `unsealed`
**Terminal states**: none (always reversible)

### 5.3 AutonomousMode (4 states)

Agent autonomous operation enable/disable lifecycle.

```
disabled --> enabled --> suspended --> enabled
                  |            \--> disabled
                  +--> disabled
                  +--> confirming --> enabled
                              \--> suspended
```

| From | Allowed Targets |
|------|----------------|
| `disabled` | `enabled` |
| `enabled` | `disabled`, `suspended`, `confirming` |
| `suspended` | `enabled`, `disabled` |
| `confirming` | `enabled`, `suspended` |

**Definition**: `app/src/services/state-machine.ts:164-173`
**Initial state**: `disabled`
**Terminal states**: none (can always re-enable)

### 5.4 ScheduleLifecycle (6 states)

NL-parsed cron schedule lifecycle.

```
pending --> active --> paused --> active
     |         |          \--> cancelled
     |         +--> completed
     |         +--> cancelled
     |         +--> failed --> pending (retry)
     |                  \--> cancelled
     \--> cancelled
```

| From | Allowed Targets |
|------|----------------|
| `pending` | `active`, `cancelled` |
| `active` | `paused`, `completed`, `cancelled`, `failed` |
| `paused` | `active`, `cancelled` |
| `completed` | (terminal) |
| `cancelled` | (terminal) |
| `failed` | `pending` (retry), `cancelled` |

**Definition**: `app/src/services/state-machine.ts:180-191`
**Initial state**: `pending`
**Terminal states**: `completed`, `cancelled`

### 5.5 Commons Conversion

All four machines are also expressed as `StateMachineConfig` from `@0xhoneyjar/loa-hounfour/commons`
via the `toStateMachineConfig()` helper (`app/src/services/state-machine.ts:203-213`).
Conversion happens once at module load -- zero runtime overhead per transition.

**Config instances**: `app/src/services/state-machine.ts:250-271`

---

## 6. Data Flow

### 6.1 Request Lifecycle

```
Client Request
    |
    v
[1] requestId        -- generate trace ID
[2] tracing           -- OpenTelemetry span
[3] secureHeaders     -- CSP, HSTS, X-Frame-Options
[3.5] protocolVersion -- X-Protocol-Version: 8.2.0
    |
    v  (scoped to /api/*)
[4] cors              -- CORS validation
[5] bodyLimit         -- 100KB payload limit
[6] responseTime      -- X-Response-Time header
[7] logger            -- structured JSON logging
[8] jwt               -- extract wallet from JWT
[9] walletBridge      -- copy wallet to x-wallet-address header
[10] rateLimit        -- per-identity rate limiting (memory or Redis)
[11] allowlist        -- community membership gate
[12] payment          -- x402 micropayment hook
[13] convictionTier   -- BGT conviction tier resolution
[14] memoryContext    -- soul memory injection
[15] economicMetadata -- cost tracking setup
    |
    v
Route Handler (/api/{domain})
    |
    v
Service Layer (66 services)
    |
    v
Persistence (PostgreSQL / Redis / NATS / FinnClient)
```

**Source**: `app/src/server.ts:332-412` (middleware registration), `server.ts:414-531` (route registration)

### 6.2 Route Registration

All routes are mounted under `/api/` via `app.route()` calls.

| Route | Handler Factory | File | Server Line |
|-------|----------------|------|-------------|
| `/api/health` | `createHealthRoutes` | `app/src/routes/health.ts` | `server.ts:415` |
| `/api/auth` | `createAuthRoutes` | `app/src/routes/auth.ts` | `server.ts:423` |
| `/api/admin` | `createAdminRoutes` | `app/src/routes/admin.ts` | `server.ts:428` |
| `/api/ws/ticket` | `createWsTicketRoutes` | `app/src/routes/ws-ticket.ts` | `server.ts:429` |
| `/api/chat` | `createChatRoutes` | `app/src/routes/chat.ts` | `server.ts:430` |
| `/api/sessions` | `createSessionRoutes` | `app/src/routes/sessions.ts` | `server.ts:431` |
| `/api/identity` | `createIdentityRoutes` | `app/src/routes/identity.ts` | `server.ts:432` |
| `/api/personality` | `createPersonalityRoutes` | `app/src/routes/personality.ts` | `server.ts:433` |
| `/api/autonomous` | `createAutonomousRoutes` | `app/src/routes/autonomous.ts` | `server.ts:434` |
| `/api/schedule` | `createScheduleRoutes` | `app/src/routes/schedule.ts` | `server.ts:435` |
| `/api/enrich` | `createEnrichmentRoutes` | `app/src/routes/enrich.ts` | `server.ts:458` |
| `/api/reputation` | `createReputationRoutes` | `app/src/routes/reputation.ts` | `server.ts:467` |
| `/api/agent` | `createAgentRoutes` | `app/src/routes/agent.ts` | `server.ts:491` |
| `/api/learning` | `createLearningRoutes` | `app/src/routes/learning.ts` | `server.ts:497` |
| `/api/memory` | `createMemoryRoutes` | `app/src/routes/memory.ts` | `server.ts:514` |

**SPA fallback**: `app/src/server.ts:554-556` returns `{ service: 'dixie-bff', status: 'running', version: '2.0.0' }`

---

## 7. External Dependencies

### 7.1 loa-finn (Circuit Breaker Proxy)

`FinnClient` (`app/src/proxy/finn-client.ts:31`) provides a typed HTTP client with a built-in
circuit breaker. States: `closed -> open -> half_open` (uses `CircuitStateMachine` from
`state-machine.ts`).

**Configuration**:
- `maxFailures`: consecutive failure threshold before circuit opens
- `windowMs`: failure counting window
- `cooldownMs`: time before half-open probe
- `timeoutMs`: per-request timeout

**Singleton limitation** (`app/src/proxy/finn-client.ts:18-27`): Circuit breaker state is
in-memory per instance. Multi-instance production requires Redis-backed state or service mesh
delegation.

### 7.2 PostgreSQL

Connection pool via `createDbPool()` (`app/src/db/client.ts`).

**Configuration**: `DATABASE_URL` env var, pool size via `DATABASE_POOL_SIZE` (default 10, max 100)
(`app/src/config.ts:171`).

**Nullable**: `dbPool` is `null` when `DATABASE_URL` not configured
(`app/src/server.ts:121-128`).

### 7.3 Redis

Client via `createRedisClient()` (`app/src/services/redis-client.ts`).

**Configuration**: `REDIS_URL` env var (`app/src/config.ts:153`).

**Nullable**: `redisClient` is `null` when `REDIS_URL` not configured
(`app/src/server.ts:130-136`).

**Used by**: ProjectionCache (memory, personality, conviction, autonomous, TBA), rate limiter.

### 7.4 NATS

Signal emitter via `SignalEmitter` (`app/src/services/signal-emitter.ts`).

**Configuration**: `NATS_URL` env var (`app/src/config.ts:154`).

**Nullable**: `signalEmitter` is `null` when `NATS_URL` not configured
(`app/src/server.ts:138-151`). Connects asynchronously -- does not block startup.

### 7.5 OpenTelemetry (Tempo)

Telemetry SDK initialization via `initTelemetry()` (`app/src/telemetry.ts`).

**Configuration**: `OTEL_EXPORTER_OTLP_ENDPOINT` env var (`app/src/config.ts:149`).
Null disables tracing export.

### 7.6 @0xhoneyjar/loa-hounfour

External package providing canonical governance types and functions.

**Sub-packages used**:
- `loa-hounfour/core` -- `CircuitState`, `isValidTransition` (`state-machine.ts:16-17`)
- `loa-hounfour/commons` -- `StateMachineConfig`, `AuditTrail`, `GovernanceMutation`, `MutationContext` (`governed-resource.ts:27-28`)
- `loa-hounfour/governance` -- `ReputationAggregate`, `ReputationScore`, scoring functions (`reputation-service.ts:20-37`)
- `loa-hounfour/integrity` -- `computeReqHash`, `deriveIdempotencyKey` (`finn-client.ts:2`)

---

## 8. Database Schema

### 8.1 Migration Files

16 migration files (including down migrations) in `app/src/db/migrations/`:

| Migration | Table(s) | Purpose | Domain |
|-----------|----------|---------|--------|
| `003_schedules.sql` | `schedules` | NL-parsed cron schedules | Economic |
| `004_autonomous_permissions.sql` | `autonomous_permissions` | Agent autonomy + delegated wallets | Economic |
| `005_reputation_aggregates.sql` | `reputation_aggregates` | Hybrid JSONB + indexed reputation | Reputation |
| `006_reputation_task_cohorts.sql` | `reputation_task_cohorts` | Per-model per-task cohorts | Reputation |
| `007_reputation_events.sql` | `reputation_events` | Append-only event sourcing log | Reputation |
| `008_mutation_log.sql` | `mutation_log` | Governance mutation recording | Governance |
| `009_audit_trail.sql` | `audit_trail` | Hash-chained audit entries | Governance |
| `010_knowledge_freshness.sql` | `knowledge_freshness` | Knowledge item freshness state | Knowledge |
| `011_dynamic_contracts.sql` | `dynamic_contracts` | hounfour DynamicContract JSONB | Protocol |
| `012_audit_chain_uniqueness.sql` | (index) | Prevents audit chain forking | Governance |
| `013_fleet_orchestration.sql` | `fleet_tasks`, `fleet_notifications`, `fleet_config` | Fleet orchestration with RLS | Fleet |
| `014_outbox.sql` | `fleet_outbox` | Transactional outbox for durable delivery | Fleet |
| `015_agent_ecology.sql` | `fleet_insights`, identity + geometry extensions | Agent ecology tables | Fleet |

**Migration runner**: `app/src/db/migrate.ts`, executed during async initialization
(`app/src/server.ts:242-254`).

### 8.2 Key Tables

| Table | Primary Key | Key Columns | Indexes |
|-------|------------|-------------|---------|
| `schedules` | `id` (UUID) | `nft_id`, `owner_wallet`, `cron_expression` | nft_id |
| `autonomous_permissions` | `nft_id` (TEXT) | `owner_wallet`, `enabled`, `capabilities` (JSONB) | -- |
| `reputation_aggregates` | `nft_id` (TEXT) | `state`, `blended_score` (NUMERIC 6,4), `data` (JSONB) | state, blended_score |
| `reputation_task_cohorts` | `(nft_id, model_id, task_type)` | cohort data | composite PK |
| `reputation_events` | `id` (BIGSERIAL) | `nft_id`, event data | nft_id, strict ordering |
| `mutation_log` | `id` (UUID) | resource_type, mutation data | resource_type |
| `audit_trail` | `id` | `resource_type`, `previous_hash` (SHA-256) | unique(resource_type, previous_hash) |
| `fleet_tasks` | task ID | status, owner, assignment data | status, owner |
| `fleet_outbox` | outbox ID | event type, payload, processed flag | processed |

---

## 9. Configuration

All configuration is loaded from environment variables via `loadConfig()`
(`app/src/config.ts:90-179`).

### 9.1 Required Variables

| Variable | Purpose | Source Line |
|----------|---------|-------------|
| `FINN_URL` | loa-finn backend URL | `config.ts:91-94` |
| `DIXIE_JWT_PRIVATE_KEY` | HS256 JWT signing secret (>=32 chars) | `config.ts:101-111` |

### 9.2 Optional Variables with Defaults

| Variable | Default | Purpose | Source Line |
|----------|---------|---------|-------------|
| `DIXIE_PORT` | `3001` | HTTP listen port | `config.ts:113` |
| `DIXIE_CORS_ORIGINS` | `http://localhost:{port}` | Allowed CORS origins | `config.ts:124-125` |
| `DIXIE_ADMIN_KEY` | `''` (required in production) | Admin API key | `config.ts:119-122` |
| `DIXIE_RATE_LIMIT_RPM` | `100` | Requests per minute per identity | `config.ts:148` |
| `DATABASE_URL` | `null` | PostgreSQL connection | `config.ts:152` |
| `REDIS_URL` | `null` | Redis connection | `config.ts:153` |
| `NATS_URL` | `null` | NATS server | `config.ts:154` |
| `DATABASE_POOL_SIZE` | `10` | PG connection pool max | `config.ts:171` |
| `DIXIE_MEMORY_PROJECTION_TTL` | `300` (5min) | Memory cache TTL (sec) | `config.ts:157` |
| `DIXIE_CONVICTION_TIER_TTL` | `300` (5min) | Conviction cache TTL (sec) | `config.ts:161` |
| `DIXIE_PERSONALITY_TTL` | `1800` (30min) | Personality cache TTL (sec) | `config.ts:164` |
| `DIXIE_AUTONOMOUS_PERMISSION_TTL` | `300` (5min) | Autonomous cache TTL (sec) | `config.ts:167` |
| `DIXIE_AUTONOMOUS_BUDGET` | `100000` | Default budget (micro-USD) | `config.ts:168` |
| `DIXIE_RATE_LIMIT_BACKEND` | `memory` (auto-upgrades to `redis`) | Rate limit backend | `config.ts:130-136` |
| `DIXIE_SCHEDULE_CALLBACK_SECRET` | `''` | Schedule callback HMAC | `config.ts:177` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `null` | OpenTelemetry collector | `config.ts:149` |

---

## 10. Security Model

### 10.1 Authentication Layers

| Layer | Middleware | Purpose | Source |
|-------|-----------|---------|--------|
| JWT (human users) | `jwt.ts` | Wallet extraction from HS256 token | `middleware/jwt.ts` |
| TBA (agent users) | `tba-auth.ts` | Token Bound Account verification via loa-finn | `middleware/tba-auth.ts` |
| Admin key | route-level | `DIXIE_ADMIN_KEY` header check | `routes/admin.ts` |
| Service JWT | `service-jwt.ts` | Service-to-service authentication | `middleware/service-jwt.ts` |

### 10.2 Defense in Depth

- **JWT key validation**: minimum 32 characters enforced at startup (`config.ts:107-111`)
- **Admin key required in production**: empty key throws at startup (`config.ts:120-122`)
- **Secure headers**: CSP, HSTS (1 year), X-Frame-Options DENY, strict referrer (`server.ts:335-345`)
- **Body limit**: 100KB on all `/api/*` routes (`server.ts:350`)
- **Rate limiting**: per-identity, Redis-backed when available (`server.ts:371-373`)
- **Wallet bridge** (SEC-003): JWT wallet copied to header for sub-app boundary crossing (`server.ts:365-368`)

### 10.3 Conviction Tier Access Control

Five tiers from `observer` (lowest) to `sovereign` (highest) gate access to capabilities.

Fleet spawn limits per tier (`app/src/services/fleet-governor.ts:58`):
- `observer`: 0 agents
- `participant`: 0 agents
- `builder`: 1 agent
- `architect`: 3 agents
- `sovereign`: 10 agents

---

## 11. Graceful Shutdown

Shutdown sequence (`app/src/index.ts:28-55`):

1. Stop accepting new connections (`server.close()`)
2. Flush pending OTEL spans (`shutdownTelemetry()`)
3. Close NATS connection (`signalEmitter.close()`)
4. Disconnect Redis (`redisClient.disconnect()`)
5. End PostgreSQL pool (`dbPool.end()`)
6. Safety net: force exit after 10 seconds if event loop does not drain

Triggered by: `SIGTERM`, `SIGINT` (`app/src/index.ts:57-58`)

---

## 12. Async Initialization

The `ready` promise (`app/src/server.ts:242-284`) runs after app creation:

1. Run database migrations via `migrate(dbPool)` (`server.ts:244-253`)
2. Seed `CollectionScoreAggregator` from PG reputation data (`server.ts:258-278`)
3. Log reputation store backend (`server.ts:280-283`)

Failure in migration rejects the promise and propagates to callers.
Failure in aggregator seeding falls back to neutral default (mean=0.5).
