# PRD: Autopoietic Loop Closure — Reputation Query Surface & Governance Hardening

**Version**: 11.0.0
**Date**: 2026-02-26
**Author**: Merlin (Product), Claude (Synthesis)
**Cycle**: cycle-011
**Status**: Draft
**Predecessor**: cycle-010 PRD v10.0.0 (Architectural Excellence — ADR Coverage & Vision Exploration)

> Sources: loa-finn #66 Round 10 comment (2026-02-26), Bridgebuilder review
> (PR #107 REFRAME-1: autopoietic gap, MEDIUM-1: parallel scoring),
> loa-dixie issues #36/#38/#43 (bridge-gap bugs), #29/#30/#33/#35
> (speculation/vision), cycle-009 NOTES.md (deferred items),
> code reality (reputation-service.ts, pg-reputation-store.ts,
> quality-feedback.ts, enrichment-service.ts, server.ts)

---

## 1. Problem Statement

Cycles 007–010 built the infrastructure for the autopoietic feedback loop:
model inference produces quality signals, quality signals update reputation,
reputation should influence model selection. But the loop is **open between
stages 3 and 4** — dixie's `PostgresReputationStore` holds reputation data
that finn's `resolvePoolWithReputation()` cannot query.

Simultaneously, three bridge-gap bugs (#36, #38, #43) mean the reputation
data itself has correctness issues: blended scores go stale, new agents get
penalized by a zero-default prior, and scoring path checkpoints never trigger.

### The Gap in One Sentence

Dixie has the reputation data. Finn has the routing logic. There is no bridge.

### What the Code Says

| Signal | Location | What It Means |
|--------|----------|---------------|
| `ReputationQueryFn = (poolId, routingKey) => Promise<number \| null>` | loa-finn `resolvePoolWithReputation()` | Finn is waiting for a provider |
| `store.get(nftId)` returns `ReputationAggregate` | pg-reputation-store.ts | Data exists but is not exposed as an API |
| `DEFAULT_COLLECTION_SCORE = 0` | reputation-service.ts | New agents assumed worthless (issue #38) |
| `handleQualitySignal()` skips blended recompute | reputation-service.ts | Blended score drifts between model perf events (issue #36) |
| `checkpointInterval` stored but never checked | scoring-path-tracker.ts | False safety — callers believe checkpointing works (issue #43) |
| No `/reputation` route exists | routes/ | No way to query reputation externally |
| `enrichment-service.ts` reads reputation internally | enrichment-service.ts | Pattern exists but is not an external API |

---

## 2. Goals & Success Criteria

### Primary Goals

| # | Goal | Measurable Outcome |
|---|------|-------------------|
| G-1 | Close the stage 3→4 autopoietic gap | Finn can call dixie's reputation endpoint and receive scores |
| G-2 | Fix reputation data correctness | Blended scores never stale; collection prior reflects population |
| G-3 | Harden scoring path lifecycle | Auto-checkpoint triggers at configured intervals |

### Stretch Goals

| # | Goal | Measurable Outcome |
|---|------|-------------------|
| G-4 | Complete three-witness durability | KnowledgeGovernor backed by PostgreSQL (issue #30) |
| G-5 | Enable cross-governor coordination | Event bus on GovernorRegistry (issue #33) |
| G-6 | Adaptive retrieval from self-knowledge | Freshness-weighted scoring in enrichment (issue #35) |

### Success Metrics

| Metric | Target | Method |
|--------|--------|--------|
| Reputation query latency (p99) | < 50ms | In-process benchmark test |
| Blended score staleness | 0 events with stale blended | Unit test: every event path recomputes |
| Collection score accuracy | Within 0.05 of true population mean | Unit test: Welford's vs naive comparison |
| Auto-checkpoint reliability | 100% trigger rate at interval | Unit test: record() triggers at boundary |
| Test count increase | +60–90 new tests | `vitest` count before/after |

---

## 3. User & Stakeholder Context

### Primary Consumer: loa-finn (Agent)

Finn's `resolvePoolWithReputation()` needs a `ReputationQueryFn`-compatible
provider. The function signature is:

```typescript
type ReputationQueryFn = (poolId: string, routingKey: string) => Promise<number | null>;
```

Where `poolId` maps to a model pool and `routingKey` maps to an nftId or
collection context. Finn calls this at request time during model routing.

### Secondary Consumer: Admin/Operator

Health dashboard needs reputation query surface for observability:
population stats, per-agent reputation, governance summary.

### Tertiary Consumer: Cross-Leg Integration Tests

Docker compose E2E tests need the reputation endpoint to validate
the full autopoietic loop across finn and dixie.

---

## 4. Functional Requirements

### Tier 1: Bug Fixes (Correctness Foundation)

**Note**: Code audit revealed #36 and #43 are already fixed in cycles 007–008.
Issues should be closed. Only #38 remains partially open.

| ID | Requirement | Issue | Acceptance Criteria |
|----|-------------|-------|-------------------|
| FR-1 | **Close issues #36 and #43** (already fixed) | #36, #43 | Verify with targeted regression tests, then close both issues. `buildUpdatedAggregate` (line 757) already handles #36. `record()` lines 254-257 already handle #43. |
| FR-2 | **Collection score startup seeding + neutral fallback** | #38 | On boot, seed `CollectionScoreAggregator` from existing PG aggregates (all `listAll()` personal_scores). Change `DEFAULT_COLLECTION_SCORE` from 0 to 0.5 as neutral fallback when population is empty. Fix `reconstructAggregateFromEvents()` (line 1116) to accept a collection score parameter instead of hardcoding 0. Test: fresh boot with existing PG data uses population mean. |

### Tier 2: Reputation Query Endpoint (The Bridge)

| ID | Requirement | Acceptance Criteria |
|----|-------------|-------------------|
| FR-4 | **GET `/api/reputation/:nftId`** | Returns `{ blended_score, personal_score, sample_count, state, reliability, dimensions, snapshot_at }`. Auth: conviction tier `builder+`. Latency: < 50ms. 404 for unknown nftId. |
| FR-5 | **GET `/api/reputation/:nftId/cohorts`** | Returns per-model task cohorts: `{ cohorts: TaskTypeCohort[], cross_model_score }`. Enables finn to query model-specific reputation. |
| FR-6 | **GET `/api/reputation/query`** | `ReputationQueryFn`-compatible endpoint. Query params: `poolId`, `routingKey`. Returns `{ score: number \| null }`. This is the endpoint finn calls at routing time. Minimal response body. **Auth: service-to-service signed JWT** (using existing `jose` stack) — mTLS in production. Rate-limited. `routingKey` schema: `nft:<id>` prefix, validated on receipt. See §4.1 Security Contract. |
| FR-7 | **GET `/api/reputation/population`** | Returns `{ mean, variance, count, dimensions }` from `CollectionScoreAggregator`. Admin-gated. For dashboard observability. |
| FR-8 | **Reputation route module** | `createReputationRoutes(deps)` following the `learning.ts` route pattern. Wired into server.ts. |

### §4.1 API Security & Contract [Flatline Integration]

**routingKey Schema** (resolves SKP-002):
- Format: `nft:<nftId>` — unambiguous prefix encoding
- Validation: regex `/^nft:[a-zA-Z0-9_-]+$/`
- Future: `collection:<collectionId>` for aggregate queries (not in v1)
- Contract tests: shared TypeBox schema between finn and dixie via hounfour

**Service-to-Service Auth** (resolves SKP-001, IMP-001):
- FR-6 requires signed JWT (ES256) with `iss: loa-finn`, `aud: loa-dixie`
- JWT verification uses existing `jose` stack (no new dependencies)
- Allowed callers whitelist in config
- Rate limit: 1000 req/s per caller (circuit breaker at 5000)

**Response Contract** (resolves IMP-002):
```typescript
// FR-6 response — minimal for latency
{ score: number | null }

// FR-4 response — full agent reputation
{
  blended_score: number | null;
  personal_score: number | null;
  sample_count: number;
  state: 'cold' | 'warming' | 'established' | 'authoritative';
  reliability: boolean;
  dimensions: Record<string, number>;
  snapshot_at: string; // ISO 8601
}

// Error responses — all endpoints
{ error: string; message: string }
// Status codes: 400 (bad params), 401 (no auth), 403 (insufficient tier),
//               404 (not found), 429 (rate limit), 503 (warming up)
```

**Caching Strategy** (resolves IMP-003, SKP-003):
- Write-through cache on `processEvent()`: invalidates affected nftId entry
- TTL: 5s for FR-6 (routing-time), 30s for FR-4 (dashboard)
- Cache key: `reputation:${routingKey}`
- In-memory LRU (no Redis dependency) — bounded at 10K entries
- p99 target: < 5ms from cache, < 50ms from PG

**Readiness Gating** (resolves IMP-008, SKP-004):
- Seeding is paginated (batch size 1000) via `LIMIT/OFFSET`
- Aggregator snapshot (mean, variance, count) persisted to PG `reputation_metadata` row
- On restart: load snapshot first (< 1ms), then incrementally seed from events since snapshot
- Health endpoint reports `{ seeding: true }` during warmup
- FR-6 returns `{ score: null }` during warmup (not an error — finn uses collection prior)

### Tier 3: Stretch — Governance Evolution

| ID | Requirement | Issue | Acceptance Criteria |
|----|-------------|-------|-------------------|
| FR-9 | **PG-backed KnowledgeGovernor** | #30 | `KnowledgeGovernorStore` mirroring `pg-reputation-store` pattern. Maps to `knowledge_freshness` table (migration 010 already exists). Mock pool test coverage. Wired into GovernorRegistry. All 3 witnesses equally durable. |
| FR-10 | **Cross-governor event bus** | #33 | `governor.emit(event)` / `registry.on(eventType, handler)`. Event types: `KNOWLEDGE_DRIFT`, `REPUTATION_SHIFT`, `INVARIANT_VIOLATION`. Cycle detection. Async delivery. Optional — governors work without it. |
| FR-11 | **Adaptive retrieval from self-knowledge** | #35 | Freshness-weighted confidence in enrichment pipeline. Stale corpora get lower weight. Configurable staleness thresholds per corpus. Freshness disclaimers in response metadata. |

---

## 5. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Reputation query endpoint p99 latency | < 50ms (in-memory store), < 100ms (PostgreSQL) |
| NFR-2 | No breaking changes to existing routes | All current endpoints unchanged |
| NFR-3 | Backward compatibility with in-memory store | Reputation routes work with both InMemory and PG stores |
| NFR-4 | No new dependencies | Use existing Hono, pg, jose stack |
| NFR-5 | Test coverage | Every FR has at least one test. Bug fixes have regression tests. |
| NFR-6 | Service-to-service auth on FR-6 | Signed JWT (ES256) via existing jose stack. Allowed callers: `loa-finn`. SSRF threat model documented. | [Flatline IMP-001, SKP-001] |
| NFR-7 | Caching strategy for reputation queries | Write-through cache with configurable TTL (default 5s). Cache keyed by `routingKey`. Invalidation on `processEvent()`. Staleness budget: 5s for FR-6, 30s for FR-4. | [Flatline IMP-003, SKP-003] |
| NFR-8 | Readiness gating for startup seeding | Server health reports `warming` state during seeding. FR-6 returns `{ score: null }` (not error) during warmup. Seeding paginated (batch size 1000). Aggregator snapshot persisted to PG for fast restart. | [Flatline IMP-008, SKP-004] |

---

## 6. Scope & Prioritization

### In Scope (Cycle-011)

| Priority | Items | Sprints |
|----------|-------|---------|
| **P0** | FR-1 (close stale issues), FR-2 (startup seeding) | Sprint 1 |
| **P0** | FR-4, FR-5, FR-6, FR-7, FR-8 (reputation endpoint) | Sprints 2–3 |
| **P1** | FR-9 (PG KnowledgeGovernor) | Sprint 4 |
| **P2** | FR-10, FR-11 (event bus, adaptive retrieval) | Sprint 5 |

### Out of Scope

| Item | Why |
|------|-----|
| Finn-side wiring of reputation query | Finn repo owns this (Round 10 item #5) |
| Goodhart protection mechanisms | Finn repo owns this (Round 10 item #6) |
| Parallel reputation scoring (`Promise.allSettled`) | Finn repo optimization |
| `ReputationQueryProtocol` schema in hounfour | Hounfour repo (Round 10 item #8) |
| `QuarantineContext` discriminated union | Hounfour repo (Round 10 item #10) |
| Docker compose E2E | Cross-repo infra (Round 10 item #9) |
| x402 payment activation | Separate concern |
| Meta-governor (#34) | Depends on event bus (#33); deferred to cycle-012 |
| Advisory lock for audit chain (#29) | Performance optimization; current `FOR UPDATE` works |
| Event-sourced MutationLog (#32) | Optimization; current approach sufficient |
| Chain verification pagination (#31) | Scale concern; chains are small today |

---

## 7. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `CollectionScoreAggregator` not populated at startup | HIGH | Blended scores use fallback until first events | Fall back to 0.5 neutral default; populate from existing PG aggregates on boot |
| Reputation query endpoint adds latency to finn routing | MEDIUM | Slower model selection | Keep response minimal; benchmark; consider caching |
| KnowledgeGovernor PG migration conflicts with existing migration 010 | LOW | Schema mismatch | Migration 010 already exists and matches; verify column alignment |
| Event bus introduces governance coupling | MEDIUM | One governor failure cascades | Events are advisory, not commands; async delivery with error isolation |

### Dependencies

| Dependency | Status | Required By |
|------------|--------|-------------|
| Hounfour v8.2.0 types | Available (local symlink) | All FRs |
| PostgreSQL (for PG store path) | Available (cycle-009 migrations) | FR-9, production FR-6 |
| `CollectionScoreAggregator` (cycle-009) | Built | FR-2 |
| `enrichment-service.ts` pattern | Built | FR-4, FR-5 pattern reference |
| `learning.ts` route pattern | Built | FR-8 |

---

## 8. Estimated Effort

| Sprint | Focus | Tasks (est.) | Tests (est.) |
|--------|-------|-------------|-------------|
| Sprint 1 | Correctness + startup seeding (FR-1, FR-2) | 4–5 | 8–10 |
| Sprint 2 | Reputation route scaffold + basic query (FR-4, FR-6, FR-8) | 6–7 | 15–18 |
| Sprint 3 | Cohort + population endpoints + wiring (FR-5, FR-7) | 5–6 | 10–12 |
| Sprint 4 | PG-backed KnowledgeGovernor (FR-9) | 6–7 | 12–15 |
| Sprint 5 | Event bus + adaptive retrieval (FR-10, FR-11) | 6–8 | 12–15 |
| **Total** | | **27–33** | **57–70** |

---

## 9. Cross-Repo Integration Points

This cycle produces dixie's side of the autopoietic loop. The matching work
in other repos (from Round 10 comment):

| Repo | What | Depends On |
|------|------|-----------|
| **loa-finn** | Wire `ReputationQueryFn` to dixie's `/api/reputation/query` endpoint | FR-6 complete |
| **loa-finn** | Implement Goodhart protection (temporal decay, exploration budget) | FR-6 complete |
| **loa-hounfour** | Define `ReputationQueryProtocol` versioned schema | FR-6 API shape stabilized |
| **loa-freeside** | v8.2.0 adoption PR | Independent |

The contract: dixie exposes `GET /api/reputation/query?poolId=X&routingKey=Y`
returning `{ score: number | null }`. Finn calls it. Hounfour schemas formalize it.
