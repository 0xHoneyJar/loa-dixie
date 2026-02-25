# Sprint Plan: Institutional Memory — Durable Governance, Knowledge Sovereignty & the Court of Record

**Version**: 9.0.0
**Date**: 2026-02-26
**Cycle**: cycle-009
**PRD**: v9.0.0 | **SDD**: v9.0.0
**Sprints**: 6 (global IDs: 73-78)
**Estimated Tasks**: 38
**Estimated New Tests**: ~105

---

## Sprint Overview

| Sprint | Global ID | Label | Key FRs | Tasks | New Tests |
|--------|-----------|-------|---------|-------|-----------|
| sprint-1 | 73 | Database Foundation & Migration Framework | FR-1, FR-13 | 7 | ~25 |
| sprint-2 | 74 | Durable Governance — Mutation Log & Audit Trail | FR-2, FR-3 | 6 | ~20 |
| sprint-3 | 75 | Knowledge Governance — The Third Witness | FR-4, FR-5, FR-6 | 7 | ~15 |
| sprint-4 | 76 | Capability Evolution — DynamicContract Adoption | FR-7, FR-8 | 6 | ~13 |
| sprint-5 | 77 | Self-Improvement — UCB1 & Dimension Covariance | FR-9, FR-10 | 6 | ~22 |
| sprint-6 | 78 | Integration & Hardening — Three-Witness Convergence | FR-11, FR-12 | 6 | ~10 |

---

## Sprint 1: Database Foundation & Migration Framework

**Global ID**: 73
**Goal**: Establish the persistence foundation — migration framework, PostgreSQL ReputationStore, and transaction helper. After this sprint, governance state survives process restarts.
**Priority**: P0 — Everything else depends on this.
**Success Criteria**: All existing tests pass with both InMemoryReputationStore and PostgreSQLReputationStore. Migrations are idempotent.

### Task 1.1: Migration Framework — migrate.ts

**File**: `app/src/db/migrate.ts`
**Priority**: P0
**FR**: FR-13

**Description**: Implement a forward-only migration runner that discovers SQL files in `app/src/db/migrations/`, tracks applied migrations in a `_migrations` table, and applies pending ones in order. Must handle existing migrations (003, 004) retroactively — if those tables exist but aren't tracked, seed the `_migrations` table.

**Acceptance Criteria**:
- [ ] `migrate(pool)` returns `MigrationResult` with applied/skipped counts
- [ ] `_migrations` table created on first run with `id`, `filename`, `checksum`, `applied_at`
- [ ] SQL files discovered from `migrations/` directory, sorted numerically
- [ ] Checksum verification: warn if a previously-applied migration file has changed
- [ ] Re-running `migrate()` is always safe (idempotent)
- [ ] Tests: migration runner unit tests (~3 tests)

**Testing**: Unit test with mock pool. Integration test against real PostgreSQL.

### Task 1.2: Reputation Aggregates Schema — Migration 005

**File**: `app/src/db/migrations/005_reputation_aggregates.sql`
**Priority**: P0
**FR**: FR-1

**Description**: Create the `reputation_aggregates` table with hybrid JSONB + indexed columns strategy. The `data` column stores the full `ReputationAggregate` as JSONB. Key fields (`state`, `blended_score`, `sample_count`, `version`) are lifted to columns for indexed queries.

**Acceptance Criteria**:
- [ ] `reputation_aggregates` table with `nft_id` TEXT PRIMARY KEY
- [ ] Indexed columns: `state`, `version`
- [ ] `data` JSONB column for full aggregate
- [ ] `version` column for optimistic concurrency (default 0)
- [ ] `created_at`, `updated_at` TIMESTAMPTZ columns
- [ ] All DDL uses `IF NOT EXISTS`

**Testing**: Migration applies cleanly. Re-run is safe.

### Task 1.3: Task Cohorts & Events Schemas — Migrations 006, 007

**Files**: `app/src/db/migrations/006_reputation_task_cohorts.sql`, `app/src/db/migrations/007_reputation_events.sql`
**Priority**: P0
**FR**: FR-1

**Description**: Create the `reputation_task_cohorts` table (composite primary key: `nft_id`, `model_id`, `task_type`) and `reputation_events` table (append-only, BIGSERIAL primary key for ordering).

**Acceptance Criteria**:
- [ ] `reputation_task_cohorts` with composite PK and `data` JSONB column
- [ ] `reputation_events` with BIGSERIAL `id`, append-only design
- [ ] Index on `reputation_events(nft_id, id)` for per-NFT queries
- [ ] Index on `reputation_task_cohorts(nft_id)` for listing
- [ ] All DDL uses `IF NOT EXISTS`

**Testing**: Migrations apply cleanly in sequence.

### Task 1.4: Transaction Helper — withTransaction

**File**: `app/src/db/transaction.ts`
**Priority**: P0
**FR**: FR-1

**Description**: Implement `withTransaction<T>(pool, fn)` helper that acquires a client from the pool, runs `BEGIN`, executes the callback, and either `COMMIT`s on success or `ROLLBACK`s on error. Always releases the client.

**Acceptance Criteria**:
- [ ] `withTransaction()` exported with typed signature
- [ ] Callback receives `pg.PoolClient` for transactional queries
- [ ] `COMMIT` on success, `ROLLBACK` on error
- [ ] Client always released in `finally` block
- [ ] Tests: success path, rollback path, client release (~3 tests)

**Testing**: Integration tests against real PostgreSQL.

### Task 1.5: PostgreSQLReputationStore Implementation

**File**: `app/src/services/pg-reputation-store.ts`
**Priority**: P0
**FR**: FR-1

**Description**: Implement all `ReputationStore` interface methods against PostgreSQL. Core methods: `get()` (SELECT by PK), `put()` (UPSERT with version check), `listCold()` (WHERE state='cold'), `count()` (SELECT COUNT), `listAll()`, `getTaskCohort()` (composite key lookup), `putTaskCohort()` (UPSERT), `appendEvent()` (INSERT), `getEventHistory()` (SELECT ORDER BY id).

**Acceptance Criteria**:
- [ ] Implements `ReputationStore` interface exactly (all 9 methods)
- [ ] `put()` uses optimistic concurrency: `WHERE version = $expected` with `version + 1`
- [ ] `put()` throws typed `ConflictError` on version mismatch
- [ ] `appendEvent()` is append-only (INSERT only, never UPDATE/DELETE)
- [ ] All queries use parameterized statements (no SQL concatenation)
- [ ] JSONB serialization/deserialization round-trips correctly
- [ ] Tests: all ReputationStore methods (~12 tests)

**Testing**: Integration tests against real PostgreSQL. Verify round-trip fidelity.

### Task 1.6: PostgreSQL Test Fixture

**File**: `app/tests/fixtures/pg-test.ts`
**Priority**: P0
**FR**: FR-1

**Description**: Create shared PostgreSQL test infrastructure. `setupTestDb()` creates a pool, runs migrations. `teardownTestDb()` closes the pool. `cleanTables()` truncates all test tables between tests.

**Acceptance Criteria**:
- [ ] `setupTestDb()` exported, returns `DbPool`
- [ ] `teardownTestDb()` exported, closes pool
- [ ] `cleanTables()` truncates reputation_aggregates, task_cohorts, events
- [ ] Uses `TEST_DATABASE_URL` env var with localhost fallback
- [ ] Works with vitest `beforeAll`/`afterAll` lifecycle

**Testing**: Fixture works with integration test suite.

### Task 1.7: Existing Test Compatibility Verification

**Priority**: P0
**FR**: FR-1

**Description**: Run the complete existing test suite to verify zero regressions. All 1307+ tests must pass. Verify that `new ReputationService()` (no args) still uses `InMemoryReputationStore` by default. Verify PostgreSQLReputationStore passes the same test scenarios as InMemoryReputationStore.

**Acceptance Criteria**:
- [ ] All existing tests pass (0 failures, 0 skipped)
- [ ] `new ReputationService()` defaults to `InMemoryReputationStore`
- [ ] `new ReputationService(pgStore)` uses PostgreSQL store
- [ ] No TypeScript compilation errors
- [ ] Total test count reported

**Testing**: Full `vitest` suite execution.

---

## Sprint 2: Durable Governance — Mutation Log & Audit Trail

**Global ID**: 74
**Goal**: Make every governance action durable and auditable. The mutation log records what happened. The audit trail proves the chain of custody with cryptographic hash linking.
**Priority**: P0-P1
**Success Criteria**: Every governance mutation is recorded. Audit trail hash chain verifies successfully.

### Task 2.1: Mutation Log Schema — Migration 008

**File**: `app/src/db/migrations/008_mutation_log.sql`
**Priority**: P0
**FR**: FR-2

**Description**: Create the `governance_mutations` table for durable recording of every governance mutation. UUID primary key for idempotency. Indexes on `session_id`, `resource_type`, and `actor_id` for query flexibility.

**Acceptance Criteria**:
- [ ] `governance_mutations` table with fields per SDD 3.3 schema
- [ ] Three indexes: session, resource+time, actor+time
- [ ] All DDL uses `IF NOT EXISTS`

**Testing**: Migration applies cleanly.

### Task 2.2: MutationLogStore Implementation

**File**: `app/src/services/mutation-log-store.ts`
**Priority**: P0
**FR**: FR-2

**Description**: Implement `MutationLogStore` with `append()`, `query()`, and `countBySession()` methods. The `query()` method supports filtering by `session_id`, `actor_id`, `resource_type`, `since`, and `limit`. Uses Hounfour's `GovernanceMutation` envelope as schema reference.

**Acceptance Criteria**:
- [ ] `append()` inserts a `MutationLogEntry` with idempotent UUID key
- [ ] `query()` supports all filter combinations (all optional)
- [ ] `countBySession()` returns count for a specific session
- [ ] Parameterized queries only (no SQL concatenation)
- [ ] Tests: append, query filters, idempotency, count (~8 tests)

**Testing**: Integration tests against real PostgreSQL.

### Task 2.3: Audit Trail Schema — Migration 009

**File**: `app/src/db/migrations/009_audit_trail.sql`
**Priority**: P1
**FR**: FR-3

**Description**: Create the `audit_entries` table for hash-chained audit trail. Each entry carries `entry_hash` (SHA-256) and `previous_hash` linking to its predecessor. The `hash_domain_tag` records the exact domain separation string used.

**Acceptance Criteria**:
- [ ] `audit_entries` table with fields per SDD 3.4 schema
- [ ] Indexes on `resource_type+created_at` and `entry_hash`
- [ ] All DDL uses `IF NOT EXISTS`

**Testing**: Migration applies cleanly.

### Task 2.4: AuditTrailStore Implementation

**File**: `app/src/services/audit-trail-store.ts`
**Priority**: P1
**FR**: FR-3

**Description**: Implement `AuditTrailStore` with `append()`, `getTipHash()`, `getEntries()`, and `verifyIntegrity()`. The `append()` method computes the entry hash using Hounfour's `computeAuditEntryHash()` and links to the chain tip. `verifyIntegrity()` re-walks the chain and verifies every hash.

**Acceptance Criteria**:
- [ ] `append()` computes `entry_hash` via `computeAuditEntryHash()` from Hounfour
- [ ] `append()` fetches tip hash and sets `previous_hash` (genesis hash for first entry)
- [ ] `getTipHash()` returns latest hash or `AUDIT_TRAIL_GENESIS_HASH` if empty
- [ ] `getEntries()` returns entries ordered by `created_at` with optional limit
- [ ] `verifyIntegrity()` walks chain, verifies each hash, returns result
- [ ] Hash domain tag format: `loa-dixie:audit:<resource_type>:<version>`
- [ ] Tests: append chain, tip hash, verify integrity, tamper detection (~10 tests)

**Testing**: Integration tests including integrity verification and tamper detection.

### Task 2.5: Cross-Chain Verification Helper

**File**: `app/src/services/audit-trail-store.ts` (extension)
**Priority**: P1
**FR**: FR-3

**Description**: Add `verifyCrossChain(scoringPathTipHash)` method that compares the scoring path tracker's tip hash against the latest audit trail entry for `resource_type: 'scoring-path'`. Detects divergence between the in-memory scoring chain and the durable audit chain.

**Acceptance Criteria**:
- [ ] `verifyCrossChain()` takes a scoring path tip hash string
- [ ] Returns `{ consistent: boolean, detail: string }`
- [ ] Consistent when audit trail's latest scoring entry hash matches
- [ ] Inconsistent with clear detail when hashes diverge
- [ ] Tests: consistent case, divergent case (~2 tests)

**Testing**: Unit tests with mocked audit entries.

### Task 2.6: Mutation Log + Audit Trail Regression Gate

**Priority**: P0

**Description**: Run full test suite. Verify all existing tests + all new mutation log and audit trail tests pass.

**Acceptance Criteria**:
- [ ] All existing tests pass (0 failures)
- [ ] All new mutation log tests pass (~8)
- [ ] All new audit trail tests pass (~12)
- [ ] No TypeScript compilation errors
- [ ] Total test count >= 1330

**Testing**: Full vitest suite execution.

---

## Sprint 3: Knowledge Governance — The Third Witness

**Global ID**: 75
**Goal**: Prove the governance isomorphism with a third concrete witness. Knowledge freshness becomes a governed resource with its own state machine, invariants, and event log. The GovernorRegistry now tracks 3 resource types.
**Priority**: P1
**Success Criteria**: `KnowledgeGovernor` registered in GovernorRegistry. INV-009 and INV-010 verifiable.

### Task 3.1: KnowledgeItem Type & Knowledge Event Types

**File**: `app/src/types/knowledge-governance.ts`
**Priority**: P1
**FR**: FR-4

**Description**: Define `KnowledgeItem` interface, `KnowledgeEvent` discriminated union (ingest, decay, citation, retraction), and `KnowledgeFreshnessState` type. Align with Hounfour's `GovernedFreshness` schema field naming.

**Acceptance Criteria**:
- [ ] `KnowledgeItem` interface with all fields per SDD 3.5
- [ ] `KnowledgeFreshnessState` type: `'fresh' | 'decaying' | 'stale' | 'expired'`
- [ ] `KnowledgeEvent` discriminated union with 4 event types
- [ ] Type exports barrel in knowledge-governance.ts
- [ ] Tests: type compile checks, fixture factory functions (~3 tests)

**Testing**: Type compilation + fixture factories.

### Task 3.2: Freshness State Machine

**File**: `app/src/services/knowledge-governor.ts`
**Priority**: P1
**FR**: FR-4, FR-5

**Description**: Implement the freshness state machine using the existing `StateMachine<S>` pattern from `state-machine.ts`. Transitions: `fresh -> decaying` (score < 0.7), `decaying -> stale` (score < 0.3), `stale -> expired` (score < 0.1), `expired -> fresh` (re-ingestion). Implement decay formula: `score(t) = exp(-lambda * days_since_refresh)`.

**Acceptance Criteria**:
- [ ] `FreshnessStateMachine` defined using `StateMachine<KnowledgeFreshnessState>` pattern
- [ ] `computeFreshnessDecay(item, now)` returns decayed score using exponential formula
- [ ] Default decay rate `lambda = 0.023` (~30 day half-life)
- [ ] State transitions triggered by threshold crossings
- [ ] Re-ingestion resets score to 1.0 and state to 'fresh'
- [ ] Tests: decay computation, state transitions, re-ingestion reset (~5 tests)

**Testing**: Unit tests with deterministic time inputs.

### Task 3.3: KnowledgeGovernor — ResourceGovernor Implementation

**File**: `app/src/services/knowledge-governor.ts`
**Priority**: P1
**FR**: FR-5

**Description**: Implement `KnowledgeGovernor` class implementing `ResourceGovernor<KnowledgeItem>`. Manages a corpus registry (Map-backed for now), tracks governance events, computes health, and provides self-knowledge. Register in GovernorRegistry as `resourceType: 'knowledge'`.

**Acceptance Criteria**:
- [ ] Implements `ResourceGovernor<KnowledgeItem>` interface fully
- [ ] `getHealth()` returns health based on stale/expired corpus ratio
- [ ] `getGovernorSelfKnowledge()` returns confidence and last mutation
- [ ] `getEventLog()` returns governance events in order
- [ ] Event recording on every knowledge transition
- [ ] Registered in `governorRegistry` as `resourceType: 'knowledge'`
- [ ] Tests: health computation, self-knowledge, event logging (~5 tests)

**Testing**: Unit tests with mock corpus data.

### Task 3.4: Knowledge Invariants — INV-009 and INV-010

**File**: `app/src/services/knowledge-governor.ts`
**Priority**: P1
**FR**: FR-6

**Description**: Implement `verifyFreshnessBound()` (INV-009: freshness_score decreases monotonically between ingestion events) and `verifyCitationIntegrity()` (INV-010: every citation references an existing source). Both return `{ satisfied: boolean; detail: string }`.

**Acceptance Criteria**:
- [ ] `verifyFreshnessBound(item)` checks monotonic decay since last ingestion
- [ ] `verifyCitationIntegrity(item, knownSources)` checks all citations resolve
- [ ] Both return structured result with `satisfied` boolean and `detail` string
- [ ] INV-009 violation when score increases without ingestion event
- [ ] INV-010 violation when citation references unknown source
- [ ] Tests: satisfied cases, violation cases for both invariants (~4 tests)

**Testing**: Unit tests with crafted violation scenarios.

### Task 3.5: Knowledge Freshness Schema — Migration 010

**File**: `app/src/db/migrations/010_knowledge_freshness.sql`
**Priority**: P1
**FR**: FR-4, FR-5

**Description**: Create the `knowledge_freshness` table for persisting knowledge governance state. Columns for all KnowledgeItem fields plus governance metadata (`version`, timestamps).

**Acceptance Criteria**:
- [ ] `knowledge_freshness` table with `corpus_id` TEXT PRIMARY KEY
- [ ] All fields per SDD 3.5 schema
- [ ] `version` column for optimistic concurrency
- [ ] All DDL uses `IF NOT EXISTS`

**Testing**: Migration applies cleanly.

### Task 3.6: Knowledge Governor Integration with GovernorRegistry

**Priority**: P1
**FR**: FR-5, FR-11

**Description**: Wire `KnowledgeGovernor` into the application initialization. Ensure `governorRegistry.getAll()` returns snapshots for all registered governors including knowledge.

**Acceptance Criteria**:
- [ ] `KnowledgeGovernor` registered in GovernorRegistry at startup
- [ ] `governorRegistry.getAll()` includes knowledge resource type
- [ ] Health endpoint reflects knowledge governor status
- [ ] Tests: registry with knowledge governor, getAll snapshot (~2 tests)

**Testing**: Unit tests verifying registry integration.

### Task 3.7: Knowledge Governance Regression Gate

**Priority**: P0

**Description**: Run full test suite. Verify all existing tests + all new knowledge governance tests pass.

**Acceptance Criteria**:
- [ ] All existing tests pass (0 failures)
- [ ] All new knowledge governance tests pass (~15)
- [ ] No TypeScript compilation errors
- [ ] Total test count >= 1345

**Testing**: Full vitest suite execution.

---

## Sprint 4: Capability Evolution — DynamicContract Adoption

**Global ID**: 76
**Goal**: Adopt Hounfour's DynamicContract for capability-gated access. Agents earn capabilities through reputation progression. Contracts are persisted in PostgreSQL with monotonic expansion verification.
**Priority**: P2
**Success Criteria**: DynamicContract state transitions functional. Capability-gated access integrated with conviction boundary. Backward compatible.

### Task 4.1: DynamicContract Schema — Migration 011

**File**: `app/src/db/migrations/011_dynamic_contracts.sql`
**Priority**: P2
**FR**: FR-7

**Description**: Create the `dynamic_contracts` table for persisting DynamicContract state. JSONB `contract_data` column stores the full Hounfour DynamicContract object. `nft_id` is the primary key (one contract per agent).

**Acceptance Criteria**:
- [ ] `dynamic_contracts` table with fields per SDD 3.6 schema
- [ ] UNIQUE constraint on `contract_id`
- [ ] All DDL uses `IF NOT EXISTS`

**Testing**: Migration applies cleanly.

### Task 4.2: DynamicContractStore Implementation

**File**: `app/src/services/dynamic-contract-store.ts`
**Priority**: P2
**FR**: FR-7

**Description**: Implement `DynamicContractStore` with `getContract()`, `putContract()`, and `getSurface()`. The `putContract()` method runs `verifyMonotonicExpansion()` from Hounfour before saving — rejects contracts that violate monotonic expansion.

**Acceptance Criteria**:
- [ ] `getContract(nftId)` retrieves from PostgreSQL, deserializes JSONB
- [ ] `putContract(nftId, contract)` verifies monotonic expansion, then upserts
- [ ] `putContract()` throws if `verifyMonotonicExpansion()` returns violations
- [ ] `getSurface(nftId, reputationState)` returns the ProtocolSurface for a state
- [ ] All queries use parameterized statements
- [ ] Tests: CRUD, monotonic enforcement, surface lookup (~6 tests)

**Testing**: Integration tests against real PostgreSQL.

### Task 4.3: Capability-Gated Access — ConvictionBoundary Extension

**File**: `app/src/services/conviction-boundary.ts`
**Priority**: P2
**FR**: FR-8

**Description**: Extend `EconomicBoundaryOptions` with optional `dynamicContract` field. When present, evaluate capability requirements against the contract's surface for the agent's reputation state. If required capability is missing, deny access with a clear reason in the evaluation result.

**Acceptance Criteria**:
- [ ] `EconomicBoundaryOptions.dynamicContract` field added (optional)
- [ ] When `dynamicContract` is `undefined`, existing behavior unchanged
- [ ] When present, surface lookup by reputation state
- [ ] Missing capability produces typed denial reason
- [ ] Scoring path records capability check result
- [ ] Tests: no contract (backward compat), capability present, capability missing (~4 tests)

**Testing**: Unit tests verifying backward compatibility and new capability checks.

### Task 4.4: DynamicContract Type Re-exports

**File**: `app/src/types/reputation-evolution.ts` or new `types/dynamic-contract.ts`
**Priority**: P2
**FR**: FR-7

**Description**: Create re-export barrel for DynamicContract types from Hounfour commons. Export `DynamicContract`, `ProtocolSurface`, `ProtocolCapability`, `RateLimitTier`, `MonotonicExpansionResult`, `verifyMonotonicExpansion`.

**Acceptance Criteria**:
- [ ] Clean re-export barrel for DynamicContract types
- [ ] All types importable from local barrel (not direct Hounfour path)
- [ ] Tests: import verification (~1 test)

**Testing**: Compile-time verification.

### Task 4.5: DynamicContract Mutation Log Integration

**Priority**: P2
**FR**: FR-2, FR-7

**Description**: Record all DynamicContract mutations (create, update, surface expansion) in the MutationLogStore. Each `putContract()` call produces a mutation log entry with `resource_type: 'dynamic-contract'`.

**Acceptance Criteria**:
- [ ] `putContract()` records mutation via `MutationLogStore.append()`
- [ ] Mutation entry includes contract_id, nft_id, mutation_type
- [ ] Tests: mutation recorded on contract creation/update (~2 tests)

**Testing**: Integration test verifying mutation log entries.

### Task 4.6: DynamicContract Regression Gate

**Priority**: P0

**Description**: Run full test suite. Verify all existing tests + all new DynamicContract tests pass. Verify backward compatibility — all conviction-boundary tests pass without modification.

**Acceptance Criteria**:
- [ ] All existing tests pass (0 failures)
- [ ] All new DynamicContract tests pass (~13)
- [ ] All conviction-boundary tests pass unchanged (backward compat verified)
- [ ] No TypeScript compilation errors
- [ ] Total test count >= 1358

**Testing**: Full vitest suite execution.

---

## Sprint 5: Self-Improvement — UCB1 & Dimension Covariance

**Global ID**: 77
**Goal**: Upgrade the autopoietic loop from self-observing to self-improving. UCB1 exploration adapts to model catalog changes. Dimension covariance reveals quality correlations across models.
**Priority**: P2-P3
**Success Criteria**: UCB1 correctly selects unobserved models. Covariance streaming is numerically stable. Both are backward compatible (opt-in).

### Task 5.1: ExplorationConfig & Strategy Types

**File**: `app/src/services/exploration.ts`
**Priority**: P2
**FR**: FR-9

**Description**: Define `ExplorationStrategy` type, `ExplorationConfig` interface, and `ModelObservation` interface. Create `createPRNG(seed?)` function using Mulberry32 algorithm (matching existing pattern from conviction-boundary.ts).

**Acceptance Criteria**:
- [ ] `ExplorationStrategy = 'epsilon-greedy' | 'ucb1'` exported
- [ ] `ExplorationConfig` with `strategy`, `epsilon?`, `ucb1_c?`, `seed?`
- [ ] `ModelObservation` with `model_id`, `observation_count`, `mean_quality`
- [ ] `createPRNG(seed?)` returns `() => number` (deterministic PRNG)
- [ ] Tests: type validation, PRNG determinism (~3 tests)

**Testing**: Unit tests verifying PRNG determinism with seeds.

### Task 5.2: UCB1 Score Computation

**File**: `app/src/services/exploration.ts`
**Priority**: P2
**FR**: FR-9

**Description**: Implement `computeUCB1Score(model, totalObservations, c)`. Returns `Infinity` for unobserved models (always explore). Otherwise: `mean_quality + c * sqrt(ln(total) / model_observations)`. Default `c = sqrt(2)`.

**Acceptance Criteria**:
- [ ] Unobserved model returns `Infinity`
- [ ] Score increases with higher mean_quality
- [ ] Score increases with lower observation_count (uncertainty bonus)
- [ ] Score decreases as observation_count grows (exploitation)
- [ ] `c` parameter controls exploration-exploitation tradeoff
- [ ] Tests: unobserved, well-observed, boundary cases, c sensitivity (~5 tests)

**Testing**: Unit tests with analytical verification of expected scores.

### Task 5.3: Model Selection — selectModel()

**File**: `app/src/services/exploration.ts`
**Priority**: P2
**FR**: FR-9

**Description**: Implement `selectModel(models, config, prng)`. For `epsilon-greedy`: with probability epsilon, select random model via PRNG; otherwise select highest mean_quality. For `ucb1`: select model with highest UCB1 score; use PRNG for tie-breaking.

**Acceptance Criteria**:
- [ ] `epsilon-greedy` mode: random exploration at rate epsilon
- [ ] `epsilon-greedy` mode: exploits best model otherwise
- [ ] `ucb1` mode: selects highest UCB1 score
- [ ] Tie-breaking via seeded PRNG (deterministic tests)
- [ ] Default strategy is `epsilon-greedy` (backward compatible)
- [ ] Tests: epsilon exploration, exploitation, ucb1 selection, tie-breaking (~6 tests)

**Testing**: Deterministic tests with seeded PRNG.

### Task 5.4: CollectionScoreAggregator — Welford's Mean & Variance

**File**: `app/src/services/collection-score-aggregator.ts`
**Priority**: P3
**FR**: FR-10

**Description**: Implement `CollectionScoreAggregator` with `update(observation)` and `getStats(dimension)`. Uses Welford's online algorithm for numerically stable running mean and variance. Each observation is a `Record<string, number>` of dimension scores.

**Acceptance Criteria**:
- [ ] `update()` updates running mean and M2 for each dimension
- [ ] `getStats()` returns `{ mean, variance, count }` for a dimension
- [ ] Variance is `M2 / (n - 1)` (Bessel's correction)
- [ ] Returns `undefined` for unknown dimensions
- [ ] Numerically stable for large sample counts
- [ ] Tests: single observation, multiple observations, numerical stability (~4 tests)

**Testing**: Unit tests with analytical verification.

### Task 5.5: CollectionScoreAggregator — Pairwise Covariance

**File**: `app/src/services/collection-score-aggregator.ts`
**Priority**: P3
**FR**: FR-10

**Description**: Extend `CollectionScoreAggregator` with `getCovariance(dimA, dimB)` and `getAllCovariances()`. Uses Welford's extended to pairwise co-moment tracking. Add `toJSON()` and `static fromJSON()` for serialization round-trips.

**Acceptance Criteria**:
- [ ] `getCovariance()` returns `DimensionPair` with covariance, correlation, count
- [ ] Correlation is Pearson's r = cov(A,B) / (stdA * stdB)
- [ ] `getAllCovariances()` returns all pairs
- [ ] `toJSON()` serializes complete state (means, M2s, co_M2s, counts)
- [ ] `fromJSON()` restores from serialized state
- [ ] Serialization round-trip produces identical results
- [ ] Tests: correlated dimensions, uncorrelated, serialization round-trip (~5 tests)

**Testing**: Unit tests with known correlations.

### Task 5.6: Self-Improvement Regression Gate

**Priority**: P0

**Description**: Run full test suite. Verify all existing tests + all new exploration and aggregator tests pass.

**Acceptance Criteria**:
- [ ] All existing tests pass (0 failures)
- [ ] All new exploration tests pass (~14)
- [ ] All new aggregator tests pass (~9)
- [ ] No TypeScript compilation errors
- [ ] Total test count >= 1380

**Testing**: Full vitest suite execution.

---

## Sprint 6: Integration & Hardening — Three-Witness Convergence

**Global ID**: 78
**Goal**: Wire everything together. GovernorRegistry unified with all 3 witnesses. End-to-end integration test proves the governance isomorphism. Server initialization uses PostgreSQL stores.
**Priority**: P1
**Success Criteria**: Three-witness integration test passes. GovernorRegistry returns 3 snapshots. Server boots with PostgreSQL stores when DATABASE_URL is set.

### Task 6.1: GovernorRegistry Verification Enhancement

**File**: `app/src/services/governor-registry.ts`
**Priority**: P1
**FR**: FR-11

**Description**: Add a `verifyAllResources()` method to GovernorRegistry that iterates all registered governors, calls `getHealth()`, and returns a summary. This provides the "what resources does this system govern, and what's their health?" surface described in the SDD.

**Acceptance Criteria**:
- [ ] `verifyAllResources()` returns array of `{ resourceType, health, selfKnowledge }`
- [ ] Includes all registered governors (no filtering)
- [ ] Handles governors that return `null` for health gracefully
- [ ] Tests: 0 governors, 1 governor, 3 governors (~3 tests)

**Testing**: Unit tests with mock governors.

### Task 6.2: Three-Witness Integration Test

**File**: `app/tests/integration/governance-three-witness.test.ts`
**Priority**: P1
**FR**: FR-12

**Description**: End-to-end integration test exercising the complete governance lifecycle across all three `ResourceGovernor` implementations. Tests: registration, transitions, verification, audit trail, mutation log, cross-resource queries.

**Acceptance Criteria**:
- [ ] GovernorRegistry has 3 registered governors after setup
- [ ] Each governor: register -> transition -> verify
- [ ] `verifyAllResources()` returns 3 resource types with health
- [ ] Audit trail entries exist for governance actions
- [ ] Mutation log records transitions
- [ ] INV-009 (freshness bound) verifiable end-to-end
- [ ] INV-010 (citation integrity) verifiable end-to-end
- [ ] Cross-resource query: knowledge + reputation in same registry
- [ ] Minimum 10 test cases
- [ ] Tests: 10+ integration tests

**Testing**: Integration tests (may require PostgreSQL for mutation/audit stores).

### Task 6.3: Server Initialization — PostgreSQL Store Wiring

**File**: `app/src/server.ts`
**Priority**: P1
**FR**: FR-1

**Description**: Update server initialization to create PostgreSQL stores when `DATABASE_URL` is configured. Run migrations on startup. Register KnowledgeGovernor. Graceful degradation: fall back to InMemoryReputationStore when DATABASE_URL is not set.

**Acceptance Criteria**:
- [ ] When `databaseUrl` is set: create pool, migrate, use PostgreSQLReputationStore
- [ ] When `databaseUrl` is null: use InMemoryReputationStore (existing behavior)
- [ ] MutationLogStore, AuditTrailStore, DynamicContractStore created when DB available
- [ ] KnowledgeGovernor registered in GovernorRegistry
- [ ] Migration runs before any store initialization
- [ ] Startup log indicates which store backend is active

**Testing**: Verify both code paths (with and without DATABASE_URL).

### Task 6.4: Health Endpoint Enhancement

**Priority**: P1
**FR**: FR-11, FR-12

**Description**: Update the health endpoint to include GovernorRegistry summary. Report governor count, resource types, and overall governance health.

**Acceptance Criteria**:
- [ ] Health response includes `governance` section
- [ ] `governance.governors` shows count and resource types
- [ ] `governance.health` summarizes all governor health statuses
- [ ] Tests: health with governors registered (~2 tests)

**Testing**: Unit tests with mock governors.

### Task 6.5: Final Regression Gate & Metrics

**Priority**: P0

**Description**: Run the complete test suite. Report final metrics. Verify all cycle-009 success criteria from PRD 10.

**Acceptance Criteria**:
- [ ] All existing tests pass (0 failures)
- [ ] All new cycle-009 tests pass (~105 total new)
- [ ] Total test count >= 1400 (PRD target)
- [ ] No TypeScript compilation errors
- [ ] GovernorRegistry reports 3 resource types
- [ ] Audit trail hash chain verifies
- [ ] Migration runner is idempotent (re-run is safe)

**Testing**: Full vitest suite execution.

### Task 6.6: NOTES.md Update

**Priority**: P1

**Description**: Update NOTES.md with cycle-009 completion status, key decisions, learnings, and deferred items for cycle-010.

**Acceptance Criteria**:
- [ ] Status updated to "cycle-009 complete"
- [ ] Key decisions documented
- [ ] Learnings captured (PostgreSQL adapter patterns, governor registry patterns)
- [ ] Deferred items for cycle-010 listed (meta-governance, x402, MCP)

**Testing**: N/A (documentation task).

---

## Dependencies

```
Sprint 1 (DB Foundation)
    |
    +---> Sprint 2 (Mutation Log + Audit Trail)
    |         |
    |         +---> Sprint 3 (Knowledge Governor)
    |         |         |
    |         |         +---> Sprint 4 (DynamicContract)
    |         |                   |
    |         |                   v
    |         +---> Sprint 6 (Integration)
    |                   ^
    +---> Sprint 5 (UCB1 + Covariance) [independent of 2-4]
              |
              +---> Sprint 6 (Integration)
```

**Critical path**: Sprint 1 -> Sprint 2 -> Sprint 3 -> Sprint 6
**Parallel path**: Sprint 5 can run in parallel with Sprints 2-4 (no DB dependencies for unit tests).

---

## Risk Assessment

| Risk | Sprint | Likelihood | Impact | Mitigation |
|------|--------|------------|--------|------------|
| PostgreSQL Docker unavailable for CI | 1 | Low | High | Fallback to InMemory for unit tests; PG only for integration |
| Hounfour `computeAuditEntryHash` signature mismatch | 2 | Low | Medium | Pin to v8.2.0; verify import at start of Sprint 2 |
| KnowledgeGovernor doesn't fit ResourceGovernor<T> | 3 | Low | Medium | Interface was designed for this; existing pattern proven |
| DynamicContract monotonic expansion too strict | 4 | Medium | Low | Verification before save; clear error messages |
| UCB1 tie-breaking non-deterministic | 5 | Low | Low | Seeded PRNG ensures deterministic tests |
| Integration test coordination across 3 governors | 6 | Medium | Medium | Build incrementally; each sprint has its own tests |

---

## Success Metrics (from PRD 10)

| # | Criterion | Sprint | Verification |
|---|-----------|--------|-------------|
| 1 | Process restart no longer destroys state | 1 | PostgreSQLReputationStore integration test |
| 2 | Every action has durable audit entry | 2 | AuditTrailStore.verifyIntegrity() |
| 3 | Knowledge is 3rd GovernedResource | 3 | GovernorRegistry.getAll() returns 3 types |
| 4 | GovernorRegistry verifies all 3 types | 6 | verifyAllResources() returns 3 |
| 5 | DynamicContract enables capability evolution | 4 | Contract state transitions functional |
| 6 | Exploration adapts to model changes | 5 | UCB1 selects unobserved models |
| 7 | All existing tests pass | 1-6 | Every sprint regression gate |
| 8 | >=10 invariants declared | 3 | INV-009, INV-010 bring total to 10+ |

---

*"The court reporter takes their seat, the clerk opens the ledger, and every gavel strike echoes into the permanent record."*

*-- cycle-009 Sprint Plan*
