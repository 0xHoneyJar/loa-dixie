# PRD: Dixie Phase 3 — Production Wiring & Live Integration

**Version**: 6.0.0
**Date**: 2026-02-25
**Author**: Merlin (Product), Claude (Synthesis)
**Cycle**: cycle-006
**Status**: Draft
**Predecessor**: cycle-005 PRD v5.0.0 (Hounfour v7.11.0 Adoption)

> Sources: loa-finn#66 §7 (Command Deck — Dixie Phase 3), loa-dixie#6 (Phase 3 epic),
> loa-freeside#88 (production stack merged), codebase reality analysis 2026-02-25.

## 1. Problem Statement

Dixie has 15 API endpoints, 30+ services, 1,146 passing tests, and full Hounfour v7.11.0
compliance — but it cannot launch to production. Four critical gaps remain:

1. **Volatile reputation**: InMemoryReputationStore loses all reputation data on restart.
   Production requires PostgreSQL persistence with the existing ReputationStore interface.

2. **Symmetric JWT auth**: HS256 means loa-finn must share Dixie's signing secret to verify
   tokens. ES256 (asymmetric) lets Finn verify without being able to forge — required for
   multi-service trust.

3. **Payment noop**: The x402 payment middleware is a pass-through. A config-gated scaffold
   is needed so the payment gate can be activated with a flag when loa-finn #85 ships.

4. **Missing infrastructure wiring**: Terraform lacks DATABASE_URL/REDIS_URL/NATS_URL
   environment variables, and the integration test environment lacks PostgreSQL.

## 2. Goals

- **G-1**: Persist reputation aggregates, task cohorts, and events in PostgreSQL with zero
  breaking changes (InMemory fallback when DATABASE_URL is absent).
- **G-2**: Migrate JWT issuance and verification to ES256 with JWKS endpoint for
  cross-service verification. Dual-algorithm transition period (ES256 primary, HS256 fallback).
- **G-3**: Build config-gated payment scaffold (`DIXIE_X402_ENABLED`) without requiring
  `@x402/hono` package dependency.
- **G-4**: Centralize 4 duplicated NFT ownership resolution lambdas into a shared service.
- **G-5**: Wire production Terraform with infrastructure connection env vars.
- **G-6**: Add PostgreSQL to integration test environment and create E2E smoke tests.

## 3. Non-Goals

- Full x402 payment processing (awaits loa-finn #85)
- Multi-NFT resolution (awaits loa-finn #93)
- NATS event streaming activation (infrastructure exists, activation deferred)
- Database migration tooling (manual `psql -f` is sufficient for now)

## 4. Functional Requirements

### FR-1: Persistent Reputation Storage (PostgresReputationStore) — P0

**Description**: Implement `PostgresReputationStore` class that fulfills the existing
`ReputationStore` interface (8 methods) using PostgreSQL as the backing store.

**Interface to implement** (from `app/src/services/reputation-service.ts:75-131`):

| Method | Signature | SQL Pattern |
|--------|-----------|-------------|
| `get` | `(nftId: string) => Promise<ReputationAggregate \| undefined>` | `SELECT FROM reputation_aggregates WHERE nft_id = $1` |
| `put` | `(nftId: string, aggregate: ReputationAggregate) => Promise<void>` | `INSERT ... ON CONFLICT (nft_id) DO UPDATE` |
| `listCold` | `() => Promise<Array<{nftId, aggregate}>>` | `SELECT WHERE state = 'cold'` |
| `count` | `() => Promise<number>` | `SELECT COUNT(*)` |
| `listAll` | `() => Promise<Array<{nftId, aggregate}>>` | `SELECT *` |
| `getTaskCohort` | `(nftId, model, taskType) => Promise<TaskTypeCohort \| undefined>` | `SELECT FROM reputation_task_cohorts WHERE ...` |
| `putTaskCohort` | `(nftId, cohort) => Promise<void>` | `INSERT ... ON CONFLICT DO UPDATE` |
| `appendEvent` | `(nftId, event) => Promise<void>` | `INSERT INTO reputation_events` |
| `getEventHistory` | `(nftId) => Promise<ReputationEvent[]>` | `SELECT ... ORDER BY created_at ASC` |

**Acceptance criteria**:
- Implements all 8 ReputationStore interface methods
- Round-trip test: put → get returns identical aggregate (JSONB serialization)
- `listCold()` correctly filters by state
- `putTaskCohort` upserts on `(nft_id, model_id, task_type)` composite key
- `appendEvent` preserves chronological insertion order
- `getEventHistory` returns events oldest-first
- Constructor accepts a `pg.Pool` instance (dependency injection)

### FR-2: ES256 JWT Migration + JWKS Endpoint — P0

**Description**: Migrate JWT signing from HS256 (symmetric) to ES256 (asymmetric ECDSA P-256).
Provide a JWKS endpoint for cross-service key discovery.

**Dual-algorithm transition**:
1. **Detection**: If `DIXIE_JWT_PRIVATE_KEY` starts with `-----BEGIN`, treat as PEM (ES256).
   Otherwise, treat as raw secret (HS256 — backward compatible).
2. **Issuance** (`auth.ts:issueJwt`): Use ES256 when PEM detected, HS256 otherwise.
3. **Verification** (`jwt.ts`): Try ES256 first, fall back to HS256.
4. **JWKS** (`routes/jwks.ts`): `GET /api/auth/.well-known/jwks.json` serves the public key.

**Acceptance criteria**:
- ES256 sign → ES256 verify round-trip works
- HS256 existing tokens still verify (backward compatibility)
- Config auto-detects PEM vs raw secret (no new env var needed)
- JWKS endpoint returns valid JWK with `alg: "ES256"`, `use: "sig"`, `kid` header
- All existing 1,146 tests pass unchanged (they use short HS256 secrets)
- `config.ts` validation updated: ≥32 chars for HS256, PEM prefix check for ES256

### FR-3: Payment Middleware Scaffold (config-gated x402) — P1

**Description**: Replace the noop payment middleware with a config-gated scaffold that
prepares request/response context for x402 integration.

**Behavior**:
- When `DIXIE_X402_ENABLED=false` (default): Pass-through (current behavior)
- When `DIXIE_X402_ENABLED=true`: Set payment context headers, log payment checkpoint,
  but still pass-through (no actual payment processing until `@x402/hono` is available)

**Acceptance criteria**:
- Default behavior unchanged (all existing tests pass)
- `DIXIE_X402_ENABLED=true` sets `X-Payment-Status: scaffold` response header
- Config field `x402Enabled: boolean` added to `DixieConfig`
- Payment middleware reads wallet from context (set by JWT middleware)
- No dependency on `@x402/hono` package

### FR-4: NFT Ownership Resolution Centralization — P1

**Description**: Extract 4 duplicated NFT ownership resolution lambdas from `server.ts`
(lines 302-315, 350-361, 397-408, 414-427) into a shared `NftOwnershipResolver` service.

**Current duplication** (all in `server.ts`):
1. `createMemoryContext` — `resolveNftId: async (wallet) => { ... finnClient.request(...'/nft') }`
2. `createScheduleRoutes` — `resolveNftOwnership: async (wallet) => { ... finnClient.request(...'/nft') }`
3. `createLearningRoutes` — `resolveNftOwnership: async (wallet) => { ... finnClient.request(...'/nft') }`
4. `createMemoryRoutes` — `resolveNftOwnership: async (wallet) => { ... finnClient.request(...'/ownership') }`

**Target**: Single `NftOwnershipResolver` class that provides:
- `resolveNftId(wallet: string): Promise<string | null>` — returns nftId only
- `resolveOwnership(wallet: string): Promise<OwnershipResult | null>` — returns full ownership

**Acceptance criteria**:
- All 4 inline lambdas replaced with method references to shared resolver
- FinnClient is injected into resolver constructor
- No behavioral change (all existing tests pass)
- Resolver class is independently testable

### FR-5: Production Environment Configuration (Terraform) — P0

**Description**: Add missing infrastructure connection environment variables to the ECS
task definition in `deploy/terraform/dixie.tf`.

**Missing environment variables** (lines 284-289):
- `DATABASE_URL` — PostgreSQL connection string (from Secrets Manager)
- `REDIS_URL` — Redis connection string (from freeside shared Redis)
- `NATS_URL` — NATS server URL (from freeside shared NATS)

**Also needed**:
- Security group egress rules for PostgreSQL (5432) and NATS (4222)
- Secrets Manager reference for DATABASE_URL

**Acceptance criteria**:
- `terraform plan` shows additive changes only (no destructive modifications)
- DATABASE_URL sourced from Secrets Manager (contains credentials)
- REDIS_URL and NATS_URL set as plain environment variables (no credentials)
- New security group egress rules for ports 5432 and 4222

### FR-6: E2E Integration Test Infrastructure — P1

**Description**: Add PostgreSQL service to `docker-compose.integration.yml` and create
E2E smoke tests that validate the full SIWE → JWT → protected endpoint flow.

**Acceptance criteria**:
- `docker-compose.integration.yml` includes PostgreSQL 16 service with health check
- `DATABASE_URL` wired to dixie-bff service in compose
- E2E test file at `app/tests/e2e/live-integration.test.ts`
- Tests cover: health endpoint reports PostgreSQL, auth flow issues JWT, chat proxy round-trip
- Tests are tagged/skippable for CI (they require Docker)

### FR-7: Reputation Database Migration (005_reputation.sql) — P0

**Description**: Create SQL migration that defines the 3 reputation tables.

**Tables**:

```sql
-- Table 1: reputation_aggregates
-- Stores the main ReputationAggregate (JSONB for complex nested types)
CREATE TABLE reputation_aggregates (
  nft_id TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'cold',
  aggregate JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: reputation_task_cohorts
-- Per-model per-task reputation (composite key for uniqueness)
CREATE TABLE reputation_task_cohorts (
  nft_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  cohort JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (nft_id, model_id, task_type)
);

-- Table 3: reputation_events (append-only event log)
CREATE TABLE reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Acceptance criteria**:
- Migration file at `app/src/db/migrations/005_reputation.sql`
- All three tables created with appropriate indexes
- Index on `reputation_events(nft_id, created_at)` for chronological queries
- Index on `reputation_aggregates(state)` for `listCold()` queries
- JSONB storage for complex types (ReputationAggregate, TaskTypeCohort, ReputationEvent)

### FR-8: Health Endpoint Enhancement — P2

**Description**: Enhance the health endpoint to report reputation store type (in-memory vs
postgres) and pool health metrics when PostgreSQL is active.

**Acceptance criteria**:
- Health response includes `reputation_service.store_type: "memory" | "postgres"`
- When PostgreSQL store active: include `pool_total`, `pool_idle`, `pool_waiting` counts
- No change when using InMemoryReputationStore (backward compatible)

## 5. Non-Functional Requirements

| NFR | Description | Target |
|-----|-------------|--------|
| NFR-1 | Zero breaking API changes | All existing endpoints return identical responses |
| NFR-2 | Backward compatibility | InMemory fallback when DATABASE_URL absent |
| NFR-3 | Test stability | All 1,146 existing tests pass unchanged |
| NFR-4 | New test coverage | Minimum 1 test per FR acceptance criterion |
| NFR-5 | Migration safety | SQL migration is idempotent (`IF NOT EXISTS`) |
| NFR-6 | Performance | PostgresReputationStore operations < 10ms p95 |
| NFR-7 | Security | No secrets in Terraform plaintext; PEM keys via Secrets Manager |

## 6. Architecture Decisions

### AD-1: JSONB Storage for Reputation Aggregates

Store the full `ReputationAggregate` object as JSONB rather than flattening to columns.

**Rationale**: The aggregate contains nested arrays (`model_cohorts`, `transition_history`)
and evolving schema (Hounfour protocol upgrades add fields). JSONB accommodates schema
evolution without migrations. The `state` and `nft_id` columns are extracted for indexing.

**Trade-off**: Slightly more expensive queries for field-level filtering, but reputation
queries are always by `nft_id` (point lookup) or `state` (indexed).

### AD-2: Dual-Algorithm JWT Transition

Auto-detect algorithm from key format rather than adding a new config variable.

**Rationale**: PEM keys have an unambiguous `-----BEGIN` prefix. This avoids config
proliferation and makes the transition transparent — operators just swap the secret value
from a raw string to a PEM key. Existing deployments with HS256 secrets work unchanged.

### AD-3: Config-Gated Payment (No Package Dependency)

Build the payment scaffold without importing `@x402/hono`.

**Rationale**: The package may not be published yet (depends on loa-finn #85). The scaffold
prepares the middleware context (wallet extraction, payment status headers) so that activating
x402 is a single-file change when the package is ready.

### AD-4: NftOwnershipResolver as Service Class

Extract to a class rather than a utility function.

**Rationale**: The resolver needs `FinnClient` injection and will gain caching/multi-NFT
support in future phases. A class provides the right abstraction boundary.

## 7. Dependencies

| Dependency | Type | Status | Impact if Unavailable |
|------------|------|--------|----------------------|
| loa-hounfour v7.11.0 | Package | Adopted (PR #9) | N/A — already integrated |
| loa-finn #85 (x402 payments) | External | In progress | FR-3 scaffold-only (no actual payment) |
| loa-finn #84 (E2E contracts) | External | In progress | FR-6 tests use existing API shape |
| Freeside shared PostgreSQL | Infra | Available (PR #88) | FR-5 terraform references it |
| Freeside shared Redis | Infra | Available | Already wired in Phase 2 |

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test count | ≥1,200 (current 1,146 + new) | `vitest --run` |
| Reputation round-trip | < 10ms p95 | Integration test benchmarks |
| ES256 verify latency | < 5ms | Unit test timing |
| Zero regression | 1,146/1,146 pass | CI pipeline |
| Terraform additive | 0 destroy/modify | `terraform plan` |

## 9. Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| JSONB serialization loses type precision | Medium | High | Round-trip tests with real Hounfour types |
| ES256 key rotation complexity | Low | Medium | Single kid, rotation support deferred |
| x402 package API changes | Medium | Low | Scaffold is config-gated, easy to adapt |
| PostgreSQL pool exhaustion under load | Low | High | Conservative pool size (max 10), health monitoring |

## 10. Sprint Decomposition (Preview)

| Sprint | Focus | FRs | Est. Tasks |
|--------|-------|-----|-----------|
| Sprint 1 (G-65) | Persistent Reputation | FR-1, FR-7 | 5-7 |
| Sprint 2 (G-66) | Auth Hardening | FR-2 | 5-6 |
| Sprint 3 (G-67) | Payment & Refactor | FR-3, FR-4, FR-5 | 5-7 |
| Sprint 4 (G-68) | E2E & Polish | FR-6, FR-8 | 4-6 |
