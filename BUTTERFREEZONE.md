<!-- AGENT-CONTEXT
name: loa-dixie
type: governed-bff
purpose: Governed multi-agent BFF for the Armitage Ring — conviction-based API gateway
key_files: [app/src/server.ts, app/src/services/governed-resource.ts, app/src/services/protocol-version.ts, app/src/config.ts]
interfaces:
  http: 47 endpoints across 16 route modules (41 active, 6 pending)
  governance: 4 GovernedResource implementations
  middleware: 15-position constitutional pipeline
dependencies: [loa-finn (HTTP/WS), loa-hounfour (npm, v8.3.0), loa-freeside (pending), PostgreSQL, Redis, NATS]
protocol_version: 8.2.0
trust_level: L2-verified
-->

# loa-dixie

<!-- provenance: CODE-FACTUAL -->
**Dixie is a governed multi-agent BFF (Backend-for-Frontend) for the Armitage Ring.**

Built with TypeScript on the Hono framework, Dixie mediates between clients and the loa-finn
knowledge infrastructure, enforcing conviction-based access control via a 15-position middleware
pipeline, 4 GovernedResource implementations, and 5-tier commons governance.

Protocol version: **8.2.0** (`app/src/services/protocol-version.ts:18`)

## Key Capabilities

<!-- provenance: CODE-FACTUAL -->

### API Surface

16 route modules exposing 47 endpoints (41 active, 6 pending fleet routes):

| Module | Mount Point | Endpoints | Auth |
|--------|-------------|-----------|------|
| health | `/api/health` | 2 | Public / Admin |
| auth | `/api/auth` | 2 | Public (SIWE) |
| admin | `/api/admin` | 3 | Admin key |
| chat | `/api/chat` | 1 | JWT |
| sessions | `/api/sessions` | 2 | JWT |
| identity | `/api/identity` | 1 | JWT |
| ws-ticket | `/api/ws/ticket` | 1 | JWT |
| personality | `/api/personality` | 2 | JWT |
| memory | `/api/memory` | 4 | JWT + ownership |
| autonomous | `/api/autonomous` | 4 | JWT + sovereign |
| schedule | `/api/schedule` | 5 | JWT + builder+ |
| agent | `/api/agent` | 7 | TBA + architect+ |
| learning | `/api/learning` | 2 | JWT + ownership |
| reputation | `/api/reputation` | 4 | JWT + builder+ |
| enrich | `/api/enrich` | 1 | JWT + builder+ |
| fleet | `/api/fleet` | 6 | Operator (not wired) |

Source: `app/src/server.ts:414-531` (route registration)

### Governance Model

4 GovernedResource implementations providing state management, transition validation, and
invariant checking through the unified governor registry:

| Governor | Resource Type | Source |
|----------|--------------|--------|
| FleetGovernor | `fleet-governor` | `app/src/services/fleet-governor.ts:181` |
| SovereigntyEngine | `sovereignty-engine` | `app/src/services/sovereignty-engine.ts:103` |
| ReputationService | `reputation` | `app/src/services/reputation-service.ts:316` |
| ScoringPathTracker | `scoring-path` | `app/src/services/scoring-path-tracker.ts:171` |

Interface: `app/src/services/governed-resource.ts:95-127`

### Conviction Tiers

5-tier commons governance model determining API capability access via BGT staking:

| Tier | Capabilities |
|------|-------------|
| Observer | Health, auth, basic chat |
| Participant | Priority voting |
| Builder | Scheduling, enrichment, reputation queries |
| Architect | Agent API, fleet spawn |
| Sovereign | Autonomous mode, full governance |

### Middleware Pipeline

15-position constitutional ordering encoding governance priorities (`app/src/server.ts:302-412`):

```
requestId -> tracing -> secureHeaders -> protocolVersion -> cors -> bodyLimit
-> responseTime -> logger -> jwt -> walletBridge -> rateLimit -> allowlist
-> payment -> convictionTier -> memoryContext -> economicMetadata -> ROUTES
```

Governance invariant: allowlist (position 11) -> payment (position 12) -> convictionTier
(position 13). Community membership gates economic access, which gates capability access.

## Architecture

<!-- provenance: CODE-FACTUAL -->

```
                    Clients
                       |
            +----------+----------+
            |     loa-dixie       |
            |   (Hono + TS)      |
            |                     |
            |  15-layer middleware |
            |  47 API endpoints   |
            |  5-tier conviction  |
            |  4 GovernedResource |
            +----------+----------+
                       |
          +------------+------------+
          |            |            |
   +------+------+  +-+--------+  ++-----------+
   |  loa-finn   |  | loa-     |  | loa-       |
   |  Knowledge  |  | hounfour |  | freeside   |
   |  Pipeline   |  | Protocol |  | Economics  |
   |  + Routing  |  | Types    |  | + Billing  |
   +-------------+  +----------+  +------------+
```

### Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | TypeScript / Node.js 22+ | Application language |
| Framework | [Hono](https://hono.dev/) | HTTP framework |
| Database | PostgreSQL | Reputation, governance, fleet, audit |
| Cache | Redis | Projection caching, rate limiting |
| Messaging | NATS | Signal emission (compound learning) |
| Telemetry | OpenTelemetry (Tempo) | Distributed tracing |
| Protocol | @0xhoneyjar/loa-hounfour v8.3.0 | Shared governance types |

### Ecosystem Dependencies

| Service | Repo | Relationship |
|---------|------|-------------|
| **Finn** | `loa-finn` | HTTP/WS runtime -- knowledge pipeline, model routing, agent sessions |
| **Hounfour** | `loa-hounfour` | npm dependency (v8.3.0) -- protocol types, state machines, economic contracts |
| **Freeside** | `loa-freeside` | Pending -- economic layer, billing, token-gated access |

### State Machines (hounfour Level 2)

4 runtime-validated state machines with 409 rejection on invalid transitions
(`app/src/services/state-machine.ts`):

- **CircuitState** (3 states) -- FinnClient circuit breaker
- **MemoryEncryptionState** (4 states) -- soul memory seal/unseal
- **AutonomousMode** (4 states) -- agent autonomy lifecycle
- **ScheduleLifecycle** (6 states) -- NL-parsed cron schedules

## Module Map

<!-- provenance: CODE-FACTUAL -->

| Directory | Purpose |
|-----------|---------|
| `app/src/routes/` | 16 route modules (47 endpoints) |
| `app/src/middleware/` | 15 middleware positions + 4 route-scoped |
| `app/src/services/` | 66 service modules (governors, caches, stores) |
| `app/src/proxy/` | FinnClient with circuit breaker |
| `app/src/types/` | TypeScript types, Zod schemas |
| `app/src/db/` | PostgreSQL migrations (13 up, 3 down) |
| `deploy/` | Dockerfile, docker-compose, Terraform |
| `docs/` | Architecture, API reference, ADRs, runbook |
| `knowledge/` | Oracle knowledge corpus and source definitions |

## Deployment

<!-- provenance: CODE-FACTUAL -->

| Environment | URL | Status |
|-------------|-----|--------|
| Armitage Ring | `dixie-armitage.arrakis.community` | Active |

Infrastructure: ECS Fargate on `arrakis-staging-cluster`, PostgreSQL (RDS), Redis (ElastiCache),
NATS (pending). Health: `GET /api/health`.

## Verification

<!-- provenance: CODE-FACTUAL -->
- Protocol Version: **8.2.0**
- 2,431 tests across 128 test files
- 4 GovernedResource implementations
- 6 Architecture Decision Records (ADR-001 through ADR-006)
- CI/CD: GitHub Actions

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System architecture with file:line references |
| [API Reference](docs/api-reference.md) | All 47 endpoints with request/response schemas |
| [Getting Started](docs/getting-started.md) | Setup guide and first steps |
| [Operations Runbook](docs/operations/runbook.md) | Deployment, monitoring, incident response |
| [Ecosystem Architecture](docs/ecosystem-architecture.md) | Cross-repo integration map |
| [ADR Index](docs/adr/README.md) | Architecture Decision Records |
