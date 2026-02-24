# Sprint Plan: Dixie Phase 3 — Production Wiring & Live Integration

**Version**: 6.0.0
**Date**: 2026-02-25
**Cycle**: cycle-006
**PRD**: v6.0.0 | **SDD**: v6.0.0
**Global Sprint Counter**: 65–68

---

## Sprint 1 (Global 65): Persistent Reputation

**Focus**: FR-1 (PostgresReputationStore) + FR-7 (Migration)
**Dependencies**: None
**Branch**: `feature/dixie-phase3-sprint-1`

### Tasks

#### Task 1.1: Create Migration 005_reputation.sql
**File**: `app/src/db/migrations/005_reputation.sql`
**FR**: FR-7
**Description**: Create the 3 reputation tables (reputation_aggregates, reputation_task_cohorts, reputation_events) with appropriate indexes. Follow existing migration pattern from 003/004.
**Acceptance Criteria**:
- [ ] Three tables created with IF NOT EXISTS
- [ ] Indexes: state on aggregates, (nft_id, created_at) on events, nft_id on cohorts
- [ ] JSONB columns for complex types
- [ ] Composite primary key (nft_id, model_id, task_type) on cohorts

#### Task 1.2: Implement PostgresReputationStore
**File**: `app/src/db/pg-reputation-store.ts`
**FR**: FR-1
**Description**: Implement all 8 ReputationStore interface methods using PostgreSQL. JSONB storage for aggregates, task cohorts, and events. Constructor takes pg.Pool.
**Acceptance Criteria**:
- [ ] Implements get, put, listCold, count, listAll
- [ ] Implements getTaskCohort, putTaskCohort
- [ ] Implements appendEvent, getEventHistory
- [ ] All methods use parameterized queries (no SQL injection)
- [ ] put/putTaskCohort use INSERT ... ON CONFLICT DO UPDATE (upsert)

#### Task 1.3: Wire PostgresReputationStore in server.ts
**File**: `app/src/server.ts` (line 192)
**FR**: FR-1
**Description**: Conditionally use PostgresReputationStore when dbPool is available, fallback to InMemoryReputationStore when not.
**Acceptance Criteria**:
- [ ] `dbPool ? new PostgresReputationStore(dbPool) : new InMemoryReputationStore()`
- [ ] All existing 1,146 tests pass unchanged (they have no DATABASE_URL)
- [ ] Import added for PostgresReputationStore

#### Task 1.4: Unit Tests for PostgresReputationStore
**File**: `app/tests/unit/pg-reputation-store.test.ts`
**FR**: FR-1
**Description**: Test all 8 methods with a mock pg.Pool. Verify SQL patterns, JSONB serialization, and error handling.
**Acceptance Criteria**:
- [ ] Test each interface method
- [ ] Verify JSONB round-trip (aggregate → JSON → aggregate)
- [ ] Test upsert behavior (put same nftId twice)
- [ ] Test appendEvent ordering
- [ ] Test listCold filters correctly

#### Task 1.5: Integration Test for Reputation Persistence
**File**: `app/tests/integration/pg-reputation-store.integration.test.ts`
**FR**: FR-1, FR-7
**Description**: Run against real PostgreSQL (skipped when DATABASE_URL not set). Full round-trip: migration → put → get → listCold → appendEvent → getEventHistory.
**Acceptance Criteria**:
- [ ] Skipped gracefully when no DATABASE_URL
- [ ] Creates tables via migration SQL
- [ ] Full CRUD round-trip passes
- [ ] Task cohort composite key works correctly

---

## Sprint 2 (Global 66): Auth Hardening

**Focus**: FR-2 (ES256 JWT Migration + JWKS)
**Dependencies**: None (independent of Sprint 1)
**Branch**: `feature/dixie-phase3-sprint-2`

### Tasks

#### Task 2.1: ES256 Config Detection
**File**: `app/src/config.ts`
**FR**: FR-2
**Description**: Make loadConfig async. Auto-detect PEM prefix in DIXIE_JWT_PRIVATE_KEY to determine ES256 vs HS256. Parse PEM to KeyLike when ES256. Derive public key for JWKS.
**Acceptance Criteria**:
- [ ] `loadConfig()` returns Promise<DixieConfig>
- [ ] PEM prefix (`-----BEGIN`) triggers ES256 path
- [ ] Short raw string triggers HS256 path (existing behavior)
- [ ] `es256PrivateKey` and `es256PublicKey` fields populated when PEM
- [ ] All callers of loadConfig updated to await
- [ ] Existing tests pass (they use short HS256 keys)

#### Task 2.2: ES256 Token Issuance
**File**: `app/src/routes/auth.ts`
**FR**: FR-2
**Description**: Update issueJwt to use ES256 when es256PrivateKey is available. Add kid header. AuthConfig extended with optional es256PrivateKey.
**Acceptance Criteria**:
- [ ] ES256 issuance with kid header when PEM key configured
- [ ] HS256 fallback when no PEM key
- [ ] AuthConfig.es256PrivateKey optional field
- [ ] Existing SIWE → JWT flow unchanged for HS256

#### Task 2.3: Dual-Algorithm JWT Verification
**File**: `app/src/middleware/jwt.ts`
**FR**: FR-2
**Description**: Try ES256 verification first (if public key available), fall back to HS256. Middleware signature extended with optional es256PublicKey parameter.
**Acceptance Criteria**:
- [ ] ES256 tokens verify correctly
- [ ] HS256 tokens still verify (backward compat)
- [ ] Mixed tokens during transition period work
- [ ] Error logging distinguishes algorithm

#### Task 2.4: JWKS Endpoint
**File**: `app/src/routes/jwks.ts`
**FR**: FR-2
**Description**: Create GET /api/auth/.well-known/jwks.json endpoint. Returns ES256 JWK when available, empty keys array when HS256 mode.
**Acceptance Criteria**:
- [ ] Returns valid JWKS JSON with alg, use, kid
- [ ] Empty keys array in HS256 mode (not 404)
- [ ] JWK can be used by jose.importJWK to verify tokens

#### Task 2.5: ES256 Unit Tests
**File**: `app/tests/unit/jwt-es256.test.ts`
**FR**: FR-2
**Description**: Test ES256 sign → verify round-trip, HS256 fallback, JWKS endpoint, config detection.
**Acceptance Criteria**:
- [ ] Generate test EC P-256 keypair in test
- [ ] ES256 round-trip: issue → verify → extract wallet
- [ ] HS256 still works when no PEM key
- [ ] JWKS returns correct JWK for test key
- [ ] Config correctly detects PEM vs raw

---

## Sprint 3 (Global 67): Payment & Refactor

**Focus**: FR-3 (Payment Scaffold) + FR-4 (NFT Resolver) + FR-5 (Terraform)
**Dependencies**: None (can run parallel with Sprint 1/2)
**Branch**: `feature/dixie-phase3-sprint-3`

### Tasks

#### Task 3.1: Config-Gated Payment Scaffold
**Files**: `app/src/middleware/payment.ts`, `app/src/config.ts`
**FR**: FR-3
**Description**: Replace noop with config-gated scaffold. Add x402Enabled to DixieConfig. When enabled, set X-Payment-Status and X-Payment-Wallet headers.
**Acceptance Criteria**:
- [ ] Default behavior unchanged (x402Enabled defaults false)
- [ ] Enabled mode sets X-Payment-Status: scaffold
- [ ] Enabled mode sets X-Payment-Wallet from JWT context
- [ ] No dependency on @x402/hono
- [ ] DIXIE_X402_ENABLED env var parsed

#### Task 3.2: NftOwnershipResolver Service
**File**: `app/src/services/nft-ownership-resolver.ts`
**FR**: FR-4
**Description**: Create NftOwnershipResolver class with resolveNftId and resolveOwnership methods. Constructor takes FinnClient.
**Acceptance Criteria**:
- [ ] resolveNftId returns string | null
- [ ] resolveOwnership returns full OwnershipResult | null
- [ ] Both methods catch errors and return null
- [ ] FinnClient injected via constructor

#### Task 3.3: Replace Inline NFT Lambdas in server.ts
**File**: `app/src/server.ts` (lines 302-427)
**FR**: FR-4
**Description**: Replace 4 inline NFT resolution lambdas with NftOwnershipResolver method references. Create resolver instance after FinnClient.
**Acceptance Criteria**:
- [ ] All 4 lambdas replaced (memoryContext, schedule, learning, memory routes)
- [ ] NftOwnershipResolver instantiated once
- [ ] All existing 1,146 tests pass unchanged
- [ ] No behavioral change in route responses

#### Task 3.4: Terraform Production Wiring
**File**: `deploy/terraform/dixie.tf`
**FR**: FR-5
**Description**: Add DATABASE_URL (secret), REDIS_URL (env), NATS_URL (env) to ECS task definition. Add security group egress for PostgreSQL (5432) and NATS (4222). Add Secrets Manager reference for database URL.
**Acceptance Criteria**:
- [ ] DATABASE_URL from Secrets Manager
- [ ] REDIS_URL and NATS_URL as plain environment variables
- [ ] Egress rules for ports 5432 and 4222
- [ ] IAM policy includes new secret ARN
- [ ] terraform validate passes

#### Task 3.5: Payment + NFT Resolver Unit Tests
**Files**: `app/tests/unit/payment-scaffold.test.ts`, `app/tests/unit/nft-ownership-resolver.test.ts`
**FR**: FR-3, FR-4
**Description**: Test payment scaffold config gating and header behavior. Test NFT resolver with mock FinnClient.
**Acceptance Criteria**:
- [ ] Payment: disabled mode is noop, enabled mode sets headers
- [ ] NFT resolver: resolveNftId success/failure, resolveOwnership success/failure
- [ ] Mock FinnClient for both

---

## Sprint 4 (Global 68): E2E & Polish

**Focus**: FR-6 (E2E Tests) + FR-8 (Health Enhancement)
**Dependencies**: Sprint 1 (needs PostgresReputationStore for E2E), Sprint 2 (needs ES256 for auth flow E2E)
**Branch**: `feature/dixie-phase3-sprint-4`

### Tasks

#### Task 4.1: Add PostgreSQL to docker-compose.integration.yml
**File**: `deploy/docker-compose.integration.yml`
**FR**: FR-6
**Description**: Add postgres:16-alpine service with health check. Wire DATABASE_URL to dixie-bff. Add dependency ordering.
**Acceptance Criteria**:
- [ ] PostgreSQL 16 service with ephemeral storage
- [ ] Health check via pg_isready
- [ ] dixie-bff depends_on postgres (service_healthy)
- [ ] DATABASE_URL wired to dixie-bff environment

#### Task 4.2: Health Endpoint Enhancement
**File**: `app/src/routes/health.ts`
**FR**: FR-8
**Description**: Report store_type (memory/postgres) and pool metrics when PostgreSQL store is active.
**Acceptance Criteria**:
- [ ] store_type field in reputation_service object
- [ ] pool_total, pool_idle, pool_waiting when postgres store active
- [ ] No change when InMemoryReputationStore (backward compat)

#### Task 4.3: E2E Smoke Tests
**File**: `app/tests/e2e/live-integration.test.ts`
**FR**: FR-6
**Description**: Create E2E tests that run against docker-compose integration environment. Skipped when INTEGRATION_TEST_URL not set.
**Acceptance Criteria**:
- [ ] Health endpoint test (reports PostgreSQL)
- [ ] Auth flow test (SIWE → JWT)
- [ ] Chat proxy round-trip test
- [ ] Reputation persistence test
- [ ] All gracefully skipped in normal CI

#### Task 4.4: Health Enhancement Unit Tests
**File**: `app/tests/unit/health-enhanced.test.ts`
**FR**: FR-8
**Description**: Test store type reporting in health endpoint for both memory and postgres stores.
**Acceptance Criteria**:
- [ ] Memory store reports store_type: "memory"
- [ ] No pool metrics for memory store
- [ ] Test structure for postgres store type (mock)

---

## Verification Checklist

After all 4 sprints:

- [ ] All existing 1,146 tests pass unchanged
- [ ] New unit tests pass (target: 50+ new tests)
- [ ] PostgresReputationStore round-trip works
- [ ] ES256 sign → verify works
- [ ] HS256 backward compatibility preserved
- [ ] Payment scaffold is config-gated (default off)
- [ ] 4 NFT lambdas consolidated into NftOwnershipResolver
- [ ] Terraform shows additive changes only
- [ ] Docker-compose includes PostgreSQL
- [ ] E2E tests pass against integration environment
- [ ] Health endpoint reports store type
