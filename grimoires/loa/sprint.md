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

## Sprint 4: ADR Documentation, Merge Prep & Cross-Repo Communication

**Global ID**: 85 | **Local ID**: sprint-4
**Focus**: Bridgebuilder-suggested ADR improvements, invariant documentation, merge readiness, finn #66 command deck update
**Estimated Tests**: 3–5 (invariant verification)

### Context

The Bridgebuilder deep review (PR #46 comment) identified two documentation gaps:
1. **INV-013 (Reputation Conservation)** — blended_score must be derivable from events. Already enforced by code but not declared as a system invariant.
2. **ADR: Autopoietic Loop Closure** — document WHY the loop was closed this way, what invariants it establishes, and what it unblocks.

Additionally, PR #46 is CLEAN/MERGEABLE with 1488 tests passing and bridge flatline at 0.03. The final step is cross-repo communication: update finn #66 with what this work unblocked and what the next priority is.

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-4.1 | **Add INV-013: Reputation Conservation invariant** | Add to `invariants.yaml`: "For any agent, blended_score at time T is derivable from collection_score, personal_score, sample_count, and pseudo_count at time T." Severity: critical. Category: conservation. Verified_in: `reconstructAggregateFromEvents()` at reputation-service.ts, `verifyAggregateConsistency()` from hounfour, plus test references. | `grimoires/loa/invariants.yaml` |
| T-4.2 | **Add INV-013 verification test** | Test that `reconstructAggregateFromEvents()` for any agent produces a blended_score matching the live aggregate. Replays 3+ events and verifies derivation. | `app/tests/unit/reputation-conservation.test.ts` |
| T-4.3 | **Create ADR: Autopoietic Loop Closure** | Document in `app/docs/adr/` (new directory): Decision to close the loop via HTTP query surface (not event streaming, not shared DB). Record context (4 lineages converging), decision drivers (finn's `ReputationQueryFn` contract, eventual consistency acceptable, ES256 directional trust), consequences (5s cache staleness, JWT deployment dependency), and invariants established (INV-006 dampening, INV-013 conservation). Cross-reference: finn #66 Round 10, Bridgebuilder deep review. | `app/docs/adr/001-autopoietic-loop-closure.md` |
| T-4.4 | **Post finn #66 Command Deck Update** | Post a structured comment on [loa-finn #66](https://github.com/0xHoneyJar/loa-finn/issues/66) with: (1) PR #46 merged status and what it delivers, (2) updated Protocol Version Matrix showing all 4 repos on v8.2.0, (3) what this unblocks for finn (wire `ReputationQueryFn`, Goodhart protection, parallel scoring), (4) next priority items by repo, (5) updated dependency graph. | GitHub comment on finn #66 |
| T-4.5 | **Merge PR #46** | Squash-merge PR #46 into main. Verify merge state CLEAN, all checks passing, 1488 tests green. Close issues #36, #38, #43 that are fixed by this PR. | GitHub PR #46 |

---

## Deferred to Future Cycles

The following stretch sprints from the original plan are deferred:
- **PG-Backed KnowledgeGovernor** (#30) — improves durability but doesn't block loop closure
- **Event Bus & Adaptive Retrieval** (#33) — improves coordination but doesn't block loop closure
- **Meta-governor** (#34) — depends on event bus

---

## Summary

| Sprint | Global ID | Tasks | Tests (est.) | Focus |
|--------|-----------|-------|-------------|-------|
| 1 | 82 | 6 | 10–12 | Correctness + seeding |
| 2 | 83 | 9 | 18–22 | Route scaffold + finn bridge (T2.4 split into 3) |
| 3 | 84 | 6 | 12–14 | Cohort + population + contract tests |
| 4 | 85 | 5 | 3–5 | ADR + invariant + merge + finn #66 update |
| **Total** | 82–85 | **26** | **45–53** | |

## MVP Cutline [Flatline IMP-010]

**Sprints 1–3 are MVP** (loop closure). Sprint 4 is the **merge-readiness and documentation sprint**
that completes the cycle by documenting architectural decisions and communicating cross-repo.

- **MVP complete** = finn can call dixie's reputation query endpoint and get scores.
  Bugs fixed, endpoints tested, contract validated. This closes the autopoietic loop.
- **Sprint 4** = ADR documentation, reputation conservation invariant, merge, and
  cross-repo communication. This is the "close the loop on the loop closure" sprint.
- **Deferred** = PG KnowledgeGovernor, event bus, adaptive retrieval — all deferrable
  without leaving an incomplete story.

## Dependencies Between Sprints

```
Sprint 1 (correctness) ─────► Sprint 2 (route scaffold)
                                    │
                                    ▼
                              Sprint 3 (cohort + population + contract)
                                    │
                                    ▼
                              Sprint 4 (ADR + merge + finn update)
```

Sprint 4 depends on Sprints 1–3 (documents the architecture they built).
All stretch work deferred to future cycles.
