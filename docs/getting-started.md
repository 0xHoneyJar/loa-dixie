# Getting Started with Dixie

> Developer onboarding guide for the Dixie BFF (Backend-for-Frontend) service.

## Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 22+ | Runtime (see `app/package.json` `engines` field) |
| **Docker** | Latest | Local development via docker-compose |
| **Git** | Latest | Version control |

Optional:
- **AWS CLI v2** -- required only for staging/production deployment (see [Runbook](operations/runbook.md))

---

## Clone and Setup

```bash
# Clone the repository
git clone git@github.com:0xHoneyJar/loa-dixie.git
cd loa-dixie

# Install application dependencies
npm install --prefix app
```

The `--prefix app` flag is necessary because the Node.js application lives in the `app/` subdirectory, not the repository root.

---

## Local Development

### Using Docker Compose (Recommended)

The simplest way to run Dixie locally with all dependencies:

```bash
docker compose -f deploy/docker-compose.yml up
```

This starts two services:

| Service | Port | Description |
|---------|------|-------------|
| **dixie-bff** | `http://localhost:3001` | Dixie BFF server |
| **loa-finn** | `http://localhost:4000` | Finn runtime (pulled from `ghcr.io/0xhoneyjar/loa-finn:latest`) |

Dixie depends on Finn and will wait for Finn's health check to pass before starting. Finn's health check runs every 10 seconds with a 15-second start period.

### Verify It Works

```bash
curl -s http://localhost:3001/api/health | jq .
```

You should see a response with `"status": "healthy"` (or `"degraded"` if optional infrastructure like PG/Redis/NATS is not configured).

### Running Without Docker

For faster iteration on the Dixie application code:

```bash
# Terminal 1: Start Finn (or point to an existing Finn instance)
# You need a running Finn instance -- use docker-compose for just Finn,
# or set FINN_URL to a remote instance.

# Terminal 2: Start Dixie in watch mode
cd app
FINN_URL=http://localhost:4000 \
DIXIE_JWT_PRIVATE_KEY="dev-secret-key-at-least-32-chars-long" \
npm run dev
```

The `dev` script uses `tsx watch` for automatic reloading on file changes.

---

## Running Tests

From the `app/` directory:

```bash
# Run all unit tests
npm run test --prefix app

# Run tests in watch mode (re-runs on file changes)
npm run test:watch --prefix app

# Run end-to-end tests
npm run test:e2e --prefix app

# Type checking (no emit)
npm run typecheck --prefix app

# Linting
npm run lint --prefix app
```

| Script | Command | Description |
|--------|---------|-------------|
| `test` | `vitest run` | Run all unit tests once |
| `test:watch` | `vitest` | Run tests in watch mode |
| `test:e2e` | `vitest run --config vitest.e2e.config.ts` | End-to-end tests with separate config |
| `typecheck` | `tsc --noEmit` | TypeScript type checking without output |
| `lint` | `eslint src/ tests/` | ESLint across source and test files |
| `build` | `tsc` | Compile TypeScript to `dist/` |

---

## Project Structure

```
loa-dixie/
  app/                      # Node.js application (Hono + TypeScript)
    src/
      config.ts             # Environment variable loading and validation
      index.ts              # Application entry point
      server.ts             # Hono app setup, middleware pipeline, route mounting
      types.ts              # Core type definitions (hounfour-aligned)
      telemetry.ts          # OpenTelemetry initialization
      validation.ts         # Input validation utilities
      errors.ts             # Error type hierarchy
      ws-upgrade.ts         # WebSocket upgrade handling
      db/                   # PostgreSQL client, migrations, connection pool
      middleware/            # 15-position middleware pipeline (see ADR-001)
      routes/               # HTTP route handlers (16 modules)
      services/             # Business logic, governors, caches, stores
      types/                # Extended type modules (economic, reputation, etc.)
      utils/                # Shared utilities (crypto, etc.)
      __tests__/            # Unit tests co-located with source
    tests/                  # Integration and e2e test suites
    package.json            # Dependencies including @0xhoneyjar/loa-hounfour#v8.3.0
  deploy/                   # Deployment configuration
    Dockerfile              # Multi-stage production build
    docker-compose.yml      # Local dev: Dixie + Finn
    docker-compose.*.yml    # Variant configs (integration, staging, test)
    terraform/              # Infrastructure-as-code
    scripts/                # Deployment helper scripts
  docs/                     # Documentation
    adr/                    # Architecture Decision Records (ADR-001 through ADR-006)
    architecture/           # Deep architecture docs
    integration/            # Runtime contract documentation
    operations/             # Operational runbook
  knowledge/                # Oracle knowledge corpus and source definitions
    sources/                # Knowledge source files
    sources.json            # Source registry
    oracle-binding.yaml     # Oracle personality binding
  persona/                  # Agent persona definition (oracle.md)
  evals/                    # Evaluation suites for oracle quality
  tests/                    # Repository-level test infrastructure
  web/                      # Frontend application (Vite + React + Tailwind)
  grimoires/                # Loa framework state (session memory, sprint artifacts)
  scripts/                  # Repository-level utility scripts
```

---

## Key Concepts

### Middleware Pipeline Ordering

The middleware pipeline is not arbitrary -- it encodes governance priorities in a 15-position constitutional ordering. Changing the order changes the governance model.

**Read ADR-001** (`docs/adr/001-middleware-pipeline-ordering.md`) before modifying any middleware registration in `server.ts`. The pipeline flows through:

- **Request infrastructure** (request ID, tracing, secure headers, protocol version)
- **Transport limits** (CORS, body limit, response time, logging)
- **Authentication** (JWT extraction, wallet bridge)
- **Access control** (rate limiting, allowlist, payment, conviction tier)
- **Context injection** (memory context, economic metadata)

The critical governance invariant is positions 11-12-13: **allowlist -> payment -> convictionTier**. Community membership gates economic access, which gates capability access. See [Architecture](architecture.md#3-middleware-pipeline) for the full 15-position sequence with source references.

### Hounfour Protocol Types

Dixie consumes the `@0xhoneyjar/loa-hounfour` package (v8.3.0) for shared governance types, schema validators, and economic conservation laws. All types in `app/src/types.ts` document their alignment with hounfour protocol types.

### Circuit Breaker (Finn Connection)

The connection to Finn uses a circuit breaker pattern (see ADR-002). After 3 consecutive failures, the circuit opens for 30 seconds. During this window, agent routes return HTTP 503 and the health endpoint reports `unhealthy`.

---

## Branch and Commit Conventions

### Branching

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Merges trigger the post-merge automation pipeline. |
| `feature/dixie-mvp` | Active development branch for the Dixie MVP. |
| `feature/*` | Feature branches for specific work items. |

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

| Type | When to Use |
|------|------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or correcting tests |
| `chore` | Maintenance tasks (dependencies, CI, etc.) |

Scope is typically the sprint number (e.g., `sprint-126`) or subsystem (e.g., `config`, `health`).

---

## Next Steps

- Read the [API Reference](api-reference.md) for endpoint documentation
- Read the [Architecture Overview](architecture.md) for system design decisions
- Read the [Ecosystem Architecture](ecosystem-architecture.md) for how Dixie fits into the larger system
- Read the [Operational Runbook](operations/runbook.md) for deployment and troubleshooting
