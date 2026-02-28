# loa-dixie

**Dixie is a governed multi-agent BFF (Backend-for-Frontend) for the HoneyJar ecosystem.**

It sits between clients and the knowledge infrastructure, enforcing conviction-based access control, managing soul memory, orchestrating agent-to-agent communication, and tracking reputation -- all through a 47-endpoint API surface governed by community staking.

> *"The Dixie Flatline remembered everything."* -- William Gibson, Neuromancer

## Architecture

```
                    Clients
                       |
            +----------+----------+
            |     loa-dixie       |
            |   (this repo)       |
            |                     |
            |  15-layer middleware |
            |  47 API endpoints   |
            |  5-tier conviction  |
            |  4 resource govs    |
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

**Dixie** -- Governed BFF. Authentication, authorization, soul memory, scheduling, reputation, agent API. 15 middleware positions enforce community governance before any request reaches downstream services.

**Finn** -- Knowledge enrichment pipeline. Document loading, embedding, model routing via hounfour provider abstraction. The Oracle's brain.

**Hounfour** -- Protocol type definitions. Agent identity (EIP-55), billing entries, conversation sealing, reputation aggregates. Shared contract between all services.

**Freeside** -- Economic layer. FIFO credit ledger, x402 micropayments, BYOK proxy. Controls the flow of value.

## Quick Start

```bash
# Clone and start all services
git clone https://github.com/0xHoneyJar/loa-dixie.git
cd loa-dixie
docker compose -f deploy/docker-compose.yml up

# Health check
curl http://localhost:3001/api/health
```

### Local Development

```bash
cd app
npm install
cp .env.example .env    # configure FINN_URL, JWT_PRIVATE_KEY, ADMIN_KEY
npm run dev             # starts on port 3001
npm test                # run test suite
```

## API Overview

Dixie exposes 16 route modules (47 endpoints total, 41 active). Protocol version `8.2.0` is advertised via the `X-Protocol-Version` response header on every request.

| Module | Mount Point | Endpoints | Auth | Description |
|--------|-------------|-----------|------|-------------|
| health | `/api/health` | 2 | Public / Admin | System health, governor status |
| auth | `/api/auth` | 2 | Public | SIWE wallet auth, JWT issuance |
| admin | `/api/admin` | 3 | Admin key | Allowlist management |
| chat | `/api/chat` | 1 | JWT | Chat message proxy to Finn |
| sessions | `/api/sessions` | 2 | JWT | Session list and detail |
| identity | `/api/identity` | 1 | JWT | Oracle dNFT identity |
| ws-ticket | `/api/ws/ticket` | 1 | JWT | WebSocket auth ticket issuance |
| personality | `/api/personality` | 2 | JWT | BEAUVOIR personality display |
| memory | `/api/memory` | 4 | JWT + ownership | Soul memory CRUD with sealing |
| autonomous | `/api/autonomous` | 4 | JWT + sovereign | Autonomous mode management |
| schedule | `/api/schedule` | 5 | JWT + builder+ | NL scheduling with cron |
| agent | `/api/agent` | 7 | TBA + architect+ | Agent-to-Oracle communication |
| learning | `/api/learning` | 2 | JWT + ownership | Compound learning insights |
| reputation | `/api/reputation` | 4 | JWT + builder+ | Reputation query surface |
| enrich | `/api/enrich` | 1 | JWT + builder+ | Review context enrichment |
| fleet | `/api/fleet` | 6 | Operator | Fleet orchestration *(not wired)* |

Full endpoint documentation: [docs/api-reference.md](docs/api-reference.md)

## Governance

Dixie implements conviction-based commons governance inspired by Elinor Ostrom's principles. Access to API capabilities is determined by BGT staking (conviction tier), not role-based permissions.

### Conviction Tiers

| Tier | BGT Threshold | Capabilities |
|------|---------------|-------------|
| Observer | None | Health, auth, basic chat |
| Participant | Low | Priority voting |
| Builder | Medium | Scheduling, enrichment, reputation queries |
| Architect | High | Agent API, fleet spawn |
| Sovereign | Highest | Autonomous mode, full governance |

### GovernedResource Implementations

Four services implement the `GovernedResource` interface, providing invariant checking, event tracking, and health reporting through the unified governor registry:

| Governor | Resource Type | Purpose |
|----------|--------------|---------|
| **FleetGovernor** | `fleet-governor` | Fleet spawn limits, task lifecycle invariants |
| **SovereigntyEngine** | `sovereignty-engine` | Agent autonomy boundaries, delegation rules |
| **ReputationService** | `reputation` | Scoring integrity, collection aggregator health |
| **ScoringPathTracker** | `scoring-path` | Scoring path validation, audit trail |

All governors are queryable via `GET /api/health/governance` (admin-gated).

### Middleware Pipeline

The 15-position middleware pipeline encodes governance priorities as constitutional ordering. Community membership (allowlist) gates economic access (payment), which gates capability access (routes):

```
requestId -> tracing -> secureHeaders -> protocolVersion -> cors -> bodyLimit
-> responseTime -> logger -> jwt -> walletBridge -> rateLimit -> allowlist
-> payment -> convictionTier -> memoryContext -> economicMetadata -> ROUTES
```

## Deployment

| Environment | URL | Status |
|-------------|-----|--------|
| Armitage Ring | `dixie-armitage.arrakis.community` | Active |

Health endpoint: `GET /api/health`

Infrastructure dependencies (graceful degradation when unavailable):
- **PostgreSQL** -- reputation store, governance stores, migration management
- **Redis** -- projection caching, distributed rate limiting
- **NATS** -- signal emission for compound learning pipeline

## Project Structure

```
app/
  src/
    routes/          # 16 route modules
    middleware/       # 15 middleware positions
    services/        # Business logic, governors, caches
    proxy/           # Finn client with circuit breaker
    types/           # TypeScript types, Zod schemas
    db/              # PostgreSQL migrations
deploy/
  docker-compose.yml # Full stack deployment
docs/
  api-reference.md   # Complete API documentation
  architecture.md    # System architecture
  ecosystem-architecture.md  # Cross-repo architecture
  adr/               # Architecture Decision Records
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System architecture and design patterns |
| [API Reference](docs/api-reference.md) | All 47 endpoints with request/response schemas |
| [Getting Started](docs/getting-started.md) | Setup guide and first steps |
| [Operations Runbook](docs/operations/runbook.md) | Deployment, monitoring, incident response |
| [Ecosystem Architecture](docs/ecosystem-architecture.md) | Cross-repo integration map |
| [ADRs](docs/adr/) | Architecture Decision Records |

## Naming

The HoneyJar ecosystem draws from two mythological traditions:

**Vodou** (loa, hounfour, cheval, peristyle) -- Spirits (loa) ride horses (cheval) in the temple (hounfour). Models are spirits, adapters are horses, the platform is the temple.

**Neuromancer** (finn, flatline, dixie, simstim, ICE, freeside) -- The Finn knows the street. The Dixie Flatline is a ROM construct: a recorded consciousness that can be consulted. Freeside is the orbital habitat with its own economy.

## Status

Phase 2 (Experience Orchestrator) complete. 13 sprints, 2,431 tests across 128 test files. Governance layer active with 4 GovernedResource implementations and conviction-gated access across all sensitive endpoints.

## Maintainer

[@janitooor](https://github.com/janitooor)

## License

[AGPL-3.0](LICENSE.md) -- Use, modify, distribute freely. Network service deployments must release source code.

Commercial licenses available for organizations that wish to use loa-dixie without AGPL obligations.

---

Ridden with [Loa](https://github.com/0xHoneyJar/loa)
