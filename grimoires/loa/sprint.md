# Sprint Plan: Autopoietic Loop Closure — Reputation Query Surface & Governance Hardening

**Version**: 11.0.0
**Date**: 2026-02-26
**Cycle**: cycle-011
**PRD**: v11.0.0 | **SDD**: v11.0.0
**Global Sprint Counter Start**: 82

---

## Sprint 1: Correctness Foundation & Startup Seeding

**Global ID**: 82 | **Local ID**: sprint-1
**Focus**: FR-1 (close stale bugs), FR-2 (collection score seeding)
**Estimated Tests**: 10–12

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-1.1 | **Regression test for #36 (blended staleness)** | Test that `processEvent()` with a `quality_signal` event updates `blended_score` (not just `personal_score`). Verify `buildUpdatedAggregate` is called. This proves the fix from cycle-008. | `tests/unit/services/blended-staleness-regression.test.ts` |
| T-1.2 | **Regression test for #43 (auto-checkpoint)** | Test that `ScoringPathTracker.record()` triggers `checkpoint()` when `entryCount % checkpointInterval === 0`. Verify with `checkpointInterval: 5`, record 5 entries, assert checkpoint was called. | `tests/unit/services/checkpoint-regression.test.ts` |
| T-1.3 | **Change `DEFAULT_COLLECTION_SCORE` from 0 to 0.5** | Update constant at reputation-service.ts:141. Update all tests that assert against `DEFAULT_COLLECTION_SCORE = 0`. The neutral 0.5 prior means new agents are neither penalized nor boosted. **Semantic**: 0.5 = "no opinion", not "average" — distinguished from empirical mean. **Backward compat**: document change in CHANGELOG; update `reconstructAggregateFromEvents` callers. [Flatline SKP-004] | `app/src/services/reputation-service.ts` |
| T-1.4 | **Seed `CollectionScoreAggregator` from PG on boot** | Two-phase seeding per SDD §2.2: (1) load PG snapshot (mean/variance/count) if exists, (2) async paginated catchup (batch 1000, 5s max). Aggregates `personal_score` (correct field — this IS the Bayesian prior for blending). Health reports `{ seeding: true }` during warmup. Swap-on-complete pattern: build fresh aggregator then atomic swap. Failure: serve with 0.5 neutral default. [Flatline IMP-001, IMP-004, SKP-001, SKP-003] | `app/src/server.ts`, `app/src/services/reputation-service.ts` |
| T-1.5 | **Fix `reconstructAggregateFromEvents` to accept collection score** | Add optional `collectionScore` parameter (default 0.5) to `reconstructAggregateFromEvents()` at line 1116. Currently hardcodes `DEFAULT_COLLECTION_SCORE`. | `app/src/services/reputation-service.ts` |
| T-1.6 | **Tests for startup seeding** | Test: empty store → aggregator mean = 0.5 (neutral). Test: store with 3 agents (0.8, 0.6, 0.7) → aggregator mean ≈ 0.7. Test: reconstructAggregateFromEvents uses provided collection score. | `tests/unit/services/collection-seed.test.ts` |

---

## Sprint 2: Reputation Route Scaffold & Finn Bridge

**Global ID**: 83 | **Local ID**: sprint-2
**Focus**: FR-4, FR-6, FR-8 (route module, agent query, finn bridge)
**Estimated Tests**: 15–18

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-2.1 | **Create `ReputationRouteDeps` interface** | Interface with `reputationService: ReputationService` and optional `adminKey?: string`. Follow `LearningRouteDeps` pattern from learning.ts. | `app/src/routes/reputation.ts` |
| T-2.2 | **Implement `createReputationRoutes(deps)` factory** | Returns `Hono` instance. Register all reputation endpoints. Export from routes barrel. | `app/src/routes/reputation.ts` |
| T-2.3 | **GET `/api/reputation/:nftId`** (FR-4) | Returns `{ blended_score, personal_score, sample_count, state, reliability, dimensions, snapshot_at }`. Auth via `x-conviction-tier` header (builder+). 404 for unknown nftId. Validates nftId with `isValidPathParam`. | `app/src/routes/reputation.ts` |
| T-2.4a | **GET `/api/reputation/query` — core endpoint logic** (FR-6) | Query params: `poolId`, `routingKey` (format: `nft:<id>`, validated via regex). Returns `{ score: number \| null }`. Returns null for missing/cold agents and during warmup. Input validation: reject malformed routingKey with `{ score: null }`. [Flatline beads SKP-002 split] | `app/src/routes/reputation.ts` |
| T-2.4b | **Service-to-service JWT middleware** | ES256 JWT verification via existing `jose` stack. Required claims: `iss: loa-finn`, `aud: loa-dixie`. Clock skew tolerance: 30s. Reject: unsigned, expired, wrong iss/aud. Key source: configurable JWKS or shared secret. Negative tests: invalid signature, expired, wrong audience. [Flatline IMP-003, SKP-005] | `app/src/middleware/service-jwt.ts` |
| T-2.4c | **Write-through LRU cache** | In-memory LRU cache for reputation scores. Config: 5s TTL, 10K max entries. Cache key: `reputation:${nftId}`. Invalidation: on `processEvent()` for affected nftId. Negative caching: cache `null` for cold agents (prevents repeated PG misses). Eviction: LRU. Rate limit: 1000 req/s per caller. [Flatline IMP-002, IMP-003] | `app/src/services/reputation-cache.ts` |
| T-2.5 | **Wire reputation routes into server.ts** | Add `app.route('/api/reputation', createReputationRoutes({...}))`. Pass `reputationService` and `adminKey`. Update `DixieApp` interface. | `app/src/server.ts` |
| T-2.6 | **Route unit tests: nftId endpoint** | Test: known agent → 200 with full response. Test: unknown agent → 404. Test: missing conviction tier → 403. Test: response includes `snapshot_at` as ISO 8601. | `tests/unit/routes/reputation.test.ts` |
| T-2.7 | **Route unit tests: query endpoint** | Test: known agent → `{ score: 0.75 }`. Test: unknown agent → `{ score: null }`. Test: cold agent (blended_score null) → `{ score: null }`. Test: missing query params → `{ score: null }`. | `tests/unit/routes/reputation.test.ts` |

---

## Sprint 3: Cohort & Population Endpoints

**Global ID**: 84 | **Local ID**: sprint-3
**Focus**: FR-5, FR-7 (per-model cohorts, population stats)
**Estimated Tests**: 10–12

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-3.1 | **GET `/api/reputation/:nftId/cohorts`** (FR-5) | Returns `{ cohorts: TaskTypeCohort[], cross_model_score: number \| null }`. Auth via conviction tier (builder+). 404 for unknown nftId. Uses `computeCrossModel()` for aggregate score. | `app/src/routes/reputation.ts` |
| T-3.2 | **GET `/api/reputation/population`** (FR-7) | Returns `{ mean, variance, population_size, store_count }`. Admin-gated via Bearer token (same as `/health/governance`). | `app/src/routes/reputation.ts` |
| T-3.3 | **Cohort endpoint tests** | Test: agent with 3 model cohorts → returns all with scores. Test: agent with no cohorts → empty array. Test: cross_model_score computed correctly from cohorts. Test: conviction tier enforcement. | `tests/unit/routes/reputation.test.ts` |
| T-3.4 | **Population endpoint tests** | Test: admin auth required (401 without, 200 with). Test: returns Welford stats matching aggregator state. Test: empty population returns mean=0.5, variance=0, size=0. | `tests/unit/routes/reputation.test.ts` |
| T-3.5 | **Integration test: full query cycle** | End-to-end: create agent → emit events → query reputation → verify blended score → query cohorts → verify cross-model. Uses mock Hono test client with real services (in-memory store). | `tests/integration/reputation-query.test.ts` |
| T-3.6 | **Consumer-driven contract tests** | Export TypeBox schema for FR-6 response (`{ score: number \| null }`). Test: response validates against schema. This schema is the shared contract finn will import from hounfour. [Flatline IMP-010] | `tests/unit/routes/reputation-contract.test.ts` |

---

## Sprint 4: PG-Backed KnowledgeGovernor (Stretch)

**Global ID**: 85 | **Local ID**: sprint-4
**Focus**: FR-9 (three-witness durability)
**Estimated Tests**: 12–15

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-4.1 | **Define `KnowledgeStore` interface** | Methods: `get(corpusId)`, `put(corpusId, item)`, `list()`, `appendEvent(event)`, `getEventHistory()`, `getVersion()`, `incrementVersion()`. Mirrors `ReputationStore` pattern. | `app/src/services/knowledge-governor.ts` |
| T-4.2 | **Extract `InMemoryKnowledgeStore`** | Extract current Map-based state from `KnowledgeGovernor` into `InMemoryKnowledgeStore` implementing `KnowledgeStore`. Governor's constructor accepts optional `KnowledgeStore`. Backward compatible — default is in-memory. | `app/src/services/knowledge-governor.ts` |
| T-4.3 | **Create migration 012: `knowledge_events` table** | Table: `id SERIAL, event_type TEXT, detail JSONB, author TEXT, version INTEGER, created_at TIMESTAMPTZ DEFAULT NOW()`. Indexes on `event_type` and `created_at`. | `app/src/db/migrations/012-knowledge-events.sql` |
| T-4.4 | **Implement `PostgresKnowledgeStore`** | Uses `knowledge_freshness` table (migration 010) for corpus items. Uses `knowledge_events` table (migration 012) for events. Parameterized queries. Follows `pg-reputation-store` patterns. | `app/src/services/pg-knowledge-store.ts` |
| T-4.5 | **Wire PG KnowledgeStore into server.ts** | When `dbPool` available, create `PostgresKnowledgeStore(dbPool)` and pass to `KnowledgeGovernor`. Otherwise fall back to `InMemoryKnowledgeStore`. | `app/src/server.ts` |
| T-4.6 | **Unit tests: InMemoryKnowledgeStore** | Test: CRUD operations, event append/history, version increment. Verify extraction didn't break existing behavior. | `tests/unit/services/knowledge-store.test.ts` |
| T-4.7 | **Unit tests: PostgresKnowledgeStore** | Use `createMockPool()` pattern. Test: get/put/list queries. Test: event append. Test: version management. | `tests/unit/services/pg-knowledge-store.test.ts` |

---

## Sprint 5: Event Bus & Adaptive Retrieval (Stretch)

**Global ID**: 86 | **Local ID**: sprint-5
**Focus**: FR-10 (event bus), FR-11 (adaptive retrieval)
**Estimated Tests**: 12–15

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-5.1 | **Define `GovernanceBusEvent` type and `GovernanceEventType` union** | Types: `KNOWLEDGE_DRIFT`, `REPUTATION_SHIFT`, `INVARIANT_VIOLATION`. Event shape: `{ type, source, detail, timestamp }`. | `app/src/services/governor-registry.ts` |
| T-5.2 | **Add `on/off/emit` to GovernorRegistry** | `on(type, handler)` registers listener. `off(type, handler)` removes. `emit(event)` calls handlers via `queueMicrotask()`. Errors caught and logged. Cycle detection via `emitting` flag. | `app/src/services/governor-registry.ts` |
| T-5.3 | **Event bus tests** | Test: register handler, emit event, handler called. Test: error in handler doesn't propagate. Test: cycle detection (handler that re-emits same type). Test: `off()` removes handler. Test: multiple handlers for same type. | `tests/unit/services/governor-event-bus.test.ts` |
| T-5.4 | **Freshness-weighted confidence in enrichment** | In `enrichment-service.ts`, query `KnowledgeGovernor.getHealth()`. Compute weight: healthy=1.0, degraded=0.7, unhealthy=0.3. Add `freshness_weight` and optional `freshness_disclaimer` to response. | `app/src/services/enrichment-service.ts` |
| T-5.5 | **Wire knowledge drift → reputation event** | When KnowledgeGovernor detects freshness state change (fresh→decaying, etc.), emit `KNOWLEDGE_DRIFT` event on registry bus. Optional: ReputationService listens and logs it. | `app/src/services/knowledge-governor.ts`, `app/src/server.ts` |
| T-5.6 | **Adaptive retrieval tests** | Test: healthy knowledge → weight 1.0, no disclaimer. Test: degraded → weight 0.7, disclaimer present. Test: unhealthy → weight 0.3. | `tests/unit/services/adaptive-retrieval.test.ts` |
| T-5.7 | **Integration: event bus with real governors** | Register both reputation and knowledge governors. Emit KNOWLEDGE_DRIFT from knowledge governor. Verify reputation governor's handler is invoked. | `tests/integration/governor-event-bus.test.ts` |

---

## Summary

| Sprint | Global ID | Tasks | Tests (est.) | Focus |
|--------|-----------|-------|-------------|-------|
| 1 | 82 | 6 | 10–12 | Correctness + seeding |
| 2 | 83 | 9 | 18–22 | Route scaffold + finn bridge (T2.4 split into 3) |
| 3 | 84 | 6 | 12–14 | Cohort + population + contract tests |
| 4 | 85 | 7 | 12–15 | PG KnowledgeGovernor (stretch) |
| 5 | 86 | 7 | 12–15 | Event bus + adaptive retrieval (stretch) |
| **Total** | 82–86 | **35** | **64–78** | |

## MVP Cutline [Flatline IMP-010]

**Sprints 1–3 are MVP** (loop closure). If the cycle must ship early, sprints 4–5
are cleanly deferrable without leaving an incomplete story:

- **MVP complete** = finn can call dixie's reputation query endpoint and get scores.
  Bugs fixed, endpoints tested, contract validated. This closes the autopoietic loop.
- **Stretch deferred** = KnowledgeGovernor stays in-memory, no event bus, no adaptive
  retrieval. These improve durability and coordination but don't block loop closure.

**Go/No-Go**: After Sprint 3, evaluate whether to proceed to Sprint 4 based on:
velocity, remaining context budget, and whether the MVP is stable.

## Dependencies Between Sprints

```
Sprint 1 (correctness) ─────► Sprint 2 (route scaffold)
                                    │
                                    ▼
                              Sprint 3 (cohort + population)
                                    │
Sprint 4 (PG Knowledge) ◄──────────┘ (independent, can run after S1)
                                    │
                                    ▼
                              Sprint 5 (event bus) requires S4
```

Sprint 4 only depends on Sprint 1 (needs stable reputation service).
Sprint 5 depends on Sprint 4 (event bus connects governors including PG-backed KnowledgeGovernor).
Sprints 2–3 are the critical path for loop closure.
