# SDD: Autopoietic Loop Closure — Reputation Query Surface & Governance Hardening

**Version**: 11.0.0
**Date**: 2026-02-26
**Author**: Claude (Architecture), Merlin (Direction)
**Cycle**: cycle-011
**Status**: Draft
**PRD Reference**: PRD v11.0.0 — Autopoietic Loop Closure

---

## 1. Executive Summary

Cycle-011 closes the autopoietic feedback loop by exposing dixie's reputation
data as an HTTP API that finn can query at routing time. The architecture adds
a thin reputation route layer over existing services, fixes the collection score
startup seeding gap, and optionally completes the three-witness PG durability
story and cross-governor event coordination.

### Architecture at a Glance

```
                         loa-finn (consumer)
                              │
                    GET /api/reputation/query
                    ?poolId=X&routingKey=Y
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Dixie BFF Layer                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              NEW: Reputation Routes (FR-4..FR-8)              │   │
│  │                                                               │   │
│  │  GET /reputation/:nftId         → agent reputation summary    │   │
│  │  GET /reputation/:nftId/cohorts → per-model breakdown         │   │
│  │  GET /reputation/query          → ReputationQueryFn bridge    │   │
│  │  GET /reputation/population     → collection stats (admin)    │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                          │                                          │
│  ┌──────────────────┐   │   ┌──────────────────┐  ┌────────────┐  │
│  │ ReputationService │◄──┘   │ ScoringPath      │  │ Knowledge  │  │
│  │ + CollectionScore │       │ Tracker          │  │ Governor   │  │
│  │   Aggregator      │       │ (GovernedRes)    │  │ (+PG: FR-9)│  │
│  └────────┬──────────┘       └──────────────────┘  └──────┬─────┘  │
│           │                                               │        │
│  ┌────────┴───────────────────────────────────────────────┴─────┐  │
│  │                   GovernorRegistry                            │  │
│  │                   + Event Bus (FR-10)                         │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                              │                                      │
│  ┌──────────────────────────┴──────────────────────────────────┐   │
│  │                    Persistence Layer                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │   │
│  │  │ PG Reputation │  │ PG Knowledge │  │ Mutation/Audit  │   │   │
│  │  │ Store         │  │ Store (FR-9) │  │ Stores          │   │   │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Route module per `learning.ts` pattern | Proven dependency injection, testable |
| `/reputation/query` returns `{ score }` only | Minimal response = minimal latency for finn |
| Collection aggregator seeded from PG on boot | Population mean available immediately, no cold-start penalty |
| Event bus is advisory, not command | Decoupled governors; failure isolation |
| KnowledgeGovernorStore mirrors ReputationStore | Consistent persistence interface; proven mock pool test pattern |

---

## 2. Component Design

### 2.1 Reputation Routes (`routes/reputation.ts`) — NEW

**Pattern**: Follows `learning.ts` route factory.

```typescript
interface ReputationRouteDeps {
  readonly reputationService: ReputationService;
  readonly adminKey?: string;
  readonly reputationCache?: LRUCache<string, number | null>; // [Flatline IMP-003]
  readonly serviceJWTVerifier?: ServiceJWTVerifier;            // [Flatline SKP-001]
}

function createReputationRoutes(deps: ReputationRouteDeps): Hono
```

#### Endpoints

**GET `/api/reputation/:nftId`** (FR-4)

Auth: conviction tier `builder+` via `x-conviction-tier` header, backed by
JWT-verified claims from the gateway. Defense-in-depth: verify JWT signature
even when behind proxy (prevents header forgery via SSRF). [Flatline SKP-006]

```typescript
// Handler pseudocode
const aggregate = await deps.reputationService.store.get(nftId);
if (!aggregate) return c.json({ error: 'not_found' }, 404);
const reliability = deps.reputationService.checkReliability(aggregate.blended_score);
return c.json({
  blended_score: aggregate.blended_score,
  personal_score: aggregate.personal_score,
  sample_count: aggregate.sample_count,
  state: aggregate.state,
  reliability: reliability.reliable,
  dimensions: aggregate.dimension_scores ?? {},
  snapshot_at: new Date().toISOString(),
});
```

Response schema:
```typescript
{
  blended_score: number | null;
  personal_score: number | null;
  sample_count: number;
  state: 'cold' | 'warming' | 'established' | 'authoritative';
  reliability: boolean;
  dimensions: Record<string, number>;
  snapshot_at: string; // ISO 8601
}
```

**GET `/api/reputation/query`** (FR-6) — The Finn Bridge

Auth: service-to-service signed JWT (ES256). Caller must present token with
`iss: loa-finn`, `aud: loa-dixie`. Verified via existing `jose` stack. [Flatline SKP-001]

```typescript
// Handler pseudocode — optimized for latency
const jwt = c.req.header('authorization')?.replace('Bearer ', '');
if (!jwt || !await verifyServiceJWT(jwt, { iss: 'loa-finn', aud: 'loa-dixie' })) {
  return c.json({ error: 'unauthorized' }, 401);
}
const { poolId, routingKey } = c.req.query();
if (!routingKey?.startsWith('nft:')) return c.json({ score: null });
const nftId = routingKey.slice(4);
// Write-through LRU cache (5s TTL, 10K entries) [Flatline IMP-003]
const cached = deps.reputationCache?.get(nftId);
if (cached !== undefined) return c.json({ score: cached });
const aggregate = await deps.reputationService.store.get(nftId);
if (!aggregate || aggregate.blended_score === null) {
  return c.json({ score: null });
}
deps.reputationCache?.set(nftId, aggregate.blended_score);
return c.json({ score: aggregate.blended_score });
```

Response: `{ score: number | null }` — matches `ReputationQueryFn` return type.

Design notes:
- `routingKey` uses `nft:<id>` prefix encoding, validated on receipt [Flatline PRD SKP-002]
- `poolId` is passed for future per-pool reputation but not used in v1
- Service-to-service JWT prevents exposure via SSRF/misconfigured ingress [Flatline IMP-001]
- Write-through LRU cache invalidated on `processEvent()` [Flatline IMP-003]
- Rate limited: 1000 req/s per caller, circuit breaker at 5000 [Flatline IMP-002]
- Returns `null` (not error) for unknown agents — finn treats null as "use collection prior"
- Returns `null` during warmup (readiness gating) — not 503 [Flatline IMP-004]
- API version: `Accept: application/vnd.dixie.reputation.v1+json` [Flatline IMP-005]

**GET `/api/reputation/:nftId/cohorts`** (FR-5)

Auth: conviction tier `builder+`.

```typescript
const aggregate = await deps.reputationService.store.get(nftId);
if (!aggregate) return c.json({ error: 'not_found' }, 404);
const cohorts = (aggregate as DixieReputationAggregate).task_cohorts ?? [];
const crossModel = deps.reputationService.computeCrossModel(cohorts);
return c.json({
  cohorts,
  cross_model_score: crossModel,
});
```

**GET `/api/reputation/population`** (FR-7)

Auth: admin-gated via Bearer token (same pattern as `/health/governance`).

```typescript
const agg = deps.reputationService.collectionAggregator;
const count = await deps.reputationService.store.count();
return c.json({
  mean: agg.mean,
  variance: agg.variance,
  population_size: agg.populationSize,
  store_count: count,
});
```

### 2.2 Collection Score Startup Seeding (FR-2)

**Problem**: On fresh boot, `CollectionScoreAggregator` is empty. The `mean`
property falls back to `DEFAULT_COLLECTION_SCORE = 0`, penalizing new agents.

**Solution**: Two-phase seeding with PG snapshot + incremental catchup. [Flatline IMP-004, SKP-002]

```typescript
// Phase 1: Load persisted snapshot (< 1ms)
async function loadAggregatorSnapshot(pool: DbPool): Promise<AggregatorSnapshot | null> {
  const row = await pool.query('SELECT mean, variance, count FROM reputation_metadata LIMIT 1');
  return row.rows[0] ?? null;
}

// Phase 2: Incremental catchup (paginated, bounded)
async function seedCollectionAggregator(
  store: ReputationStore,
  aggregator: CollectionScoreAggregator,
  options: { batchSize: number; maxDuration: number } = { batchSize: 1000, maxDuration: 5000 },
): Promise<{ seeded: number; complete: boolean }> {
  const start = Date.now();
  let offset = 0;
  let seeded = 0;
  // Paginated seeding — never loads full table [Flatline SKP-002]
  while (Date.now() - start < options.maxDuration) {
    const batch = await store.listPage(offset, options.batchSize);
    if (batch.length === 0) return { seeded, complete: true };
    for (const { aggregate } of batch) {
      if (aggregate.personal_score !== null) {
        aggregator.update(aggregate.personal_score);
        seeded++;
      }
    }
    offset += options.batchSize;
  }
  return { seeded, complete: false }; // Timed out — serve with partial data
}

// Server startup
const snapshot = dbPool ? await loadAggregatorSnapshot(dbPool) : null;
if (snapshot) {
  reputationService.collectionAggregator = CollectionScoreAggregator.fromJSON(snapshot);
}
// Async catchup — does not block readiness
seedCollectionAggregator(reputationStore, reputationService.collectionAggregator)
  .then(({ seeded, complete }) => log.info({ seeded, complete }, 'collection aggregator seeded'));
```

**Single-instance scoping** [Flatline SKP-003]: The `CollectionScoreAggregator`
is scoped to a single process. INV-013 (convergence) applies per-process only.
For multi-replica deployments, compute population stats via PG aggregate query
(`SELECT AVG(personal_score), VAR_POP(personal_score), COUNT(*) FROM reputation_aggregates`)
rather than in-memory aggregator. This is a future optimization — dixie is single-instance for now.
```

**Fallback change**: Update `DEFAULT_COLLECTION_SCORE` from `0` to `0.5`
as a neutral Bayesian prior when no population data exists.

**`reconstructAggregateFromEvents` fix**: Accept optional `collectionScore`
parameter instead of hardcoding `DEFAULT_COLLECTION_SCORE` at line 1116.

### 2.3 Server Wiring

New wiring in `server.ts`:

```typescript
// After existing route registrations
app.route('/api/reputation', createReputationRoutes({
  reputationService,
  adminKey: config.adminKey,
}));
```

The `DixieApp` interface gains:
```typescript
interface DixieApp {
  // ... existing fields ...
  reputationRoutes: Hono; // NEW
}
```

### 2.4 PG-Backed KnowledgeGovernor (FR-9) — Stretch

**Pattern**: Mirrors `pg-reputation-store.ts`.

```typescript
interface KnowledgeStore {
  get(corpusId: string): Promise<KnowledgeItem | undefined>;
  put(corpusId: string, item: KnowledgeItem): Promise<void>;
  list(): Promise<KnowledgeItem[]>;
  appendEvent(event: GovernanceEvent): Promise<void>;
  getEventHistory(): Promise<GovernanceEvent[]>;
  getVersion(): Promise<number>;
  incrementVersion(): Promise<number>;
}
```

**Implementation classes**:
- `InMemoryKnowledgeStore` — extracted from current `KnowledgeGovernor` Map-based state
- `PostgresKnowledgeStore` — uses existing `knowledge_freshness` table (migration 010)

**Migration alignment**: Migration 010 created `knowledge_freshness` with columns
matching `KnowledgeItem` fields. No new migration needed for the corpus table.
A new migration (012) adds `knowledge_events` for the event log.

**Transactional semantics** [Flatline SKP-009]: All state mutations
(appendEvent + incrementVersion) run inside a single transaction with
`SELECT ... FOR UPDATE` on the version row. Single-writer assumption
(same as ReputationStore pattern). Event append is idempotent via
`event_id` unique constraint. Rollback: forward-only migrations
(same as cycle-009 decision D-022).

**KnowledgeGovernor refactor**:
```typescript
class KnowledgeGovernor implements ResourceGovernor<KnowledgeItem> {
  constructor(private store: KnowledgeStore) { ... }
  // All methods delegate to store instead of internal Map
}
```

### 2.5 Cross-Governor Event Bus (FR-10) — Stretch

**Design**: Lightweight pub/sub on `GovernorRegistry`.

```typescript
type GovernanceEventType = 'KNOWLEDGE_DRIFT' | 'REPUTATION_SHIFT' | 'INVARIANT_VIOLATION';

interface GovernanceBusEvent {
  type: GovernanceEventType;
  source: string;      // resourceType of emitting governor
  detail: unknown;
  timestamp: string;
}

// Added to GovernorRegistry
class GovernorRegistry {
  private listeners = new Map<GovernanceEventType, Set<GovernanceEventHandler>>();

  on(type: GovernanceEventType, handler: GovernanceEventHandler): void;
  off(type: GovernanceEventType, handler: GovernanceEventHandler): void;
  emit(event: GovernanceBusEvent): void;
}
```

**Cycle detection**: Track `emitting` flag per event type. If handler triggers
re-emission of the same event type, log warning and drop.

**Async delivery**: Handlers are called via `queueMicrotask()` — non-blocking,
same tick. Errors are caught and logged, never propagated.

### 2.6 Adaptive Retrieval from Self-Knowledge (FR-11) — Stretch

**Design**: Freshness-weighted confidence in the enrichment pipeline.

```typescript
// In enrichment-service.ts
async assembleKnowledgeContext(nftId: string): Promise<KnowledgeContext> {
  const health = knowledgeGovernor.getHealth();
  const freshnessWeight = this.computeFreshnessWeight(health);
  return {
    ...existingContext,
    freshness_weight: freshnessWeight,    // [0, 1]
    freshness_disclaimer: freshnessWeight < 0.5
      ? 'Knowledge sources may be outdated'
      : undefined,
  };
}

private computeFreshnessWeight(health: ResourceHealth): number {
  if (health.status === 'healthy') return 1.0;
  if (health.status === 'degraded') return 0.7;
  return 0.3; // unhealthy
}
```

---

## 3. Data Model Changes

### 3.1 No New Tables for Core (Sprints 1–3)

The reputation query endpoint reads from existing tables:
- `reputation_aggregates` (migration 005)
- `reputation_events` (migration 007)
- `task_cohorts` (migration 006)

### 3.2 New Migration 012: Knowledge Events (Sprint 4, FR-9)

```sql
CREATE TABLE IF NOT EXISTS knowledge_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  detail JSONB NOT NULL,
  author TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_events_type ON knowledge_events(event_type);
CREATE INDEX idx_knowledge_events_created ON knowledge_events(created_at);
```

---

## 4. API Contract Summary

| Endpoint | Method | Auth | Response | Latency Target |
|----------|--------|------|----------|----------------|
| `/api/reputation/:nftId` | GET | conviction `builder+` | Full agent reputation | < 50ms |
| `/api/reputation/:nftId/cohorts` | GET | conviction `builder+` | Per-model cohorts | < 50ms |
| `/api/reputation/query` | GET | none (internal) | `{ score }` | < 20ms |
| `/api/reputation/population` | GET | admin Bearer | Collection stats | < 100ms |

### Error Responses

All endpoints return consistent error format:
```typescript
{ error: string; message: string }
```

| Status | Meaning |
|--------|---------|
| 400 | Missing required query params |
| 401 | Missing or invalid auth |
| 403 | Insufficient conviction tier |
| 404 | nftId not found |

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Component | Test File | Tests (est.) |
|-----------|-----------|-------------|
| Reputation routes | `tests/unit/routes/reputation.test.ts` | 15–18 |
| Startup seeding | `tests/unit/services/collection-seed.test.ts` | 5–6 |
| Regression: #36 blended staleness | `tests/unit/services/blended-staleness-regression.test.ts` | 3–4 |
| Regression: #43 auto-checkpoint | `tests/unit/services/checkpoint-regression.test.ts` | 2–3 |
| KnowledgeGovernorStore (FR-9) | `tests/unit/services/knowledge-store.test.ts` | 10–12 |
| GovernorRegistry event bus (FR-10) | `tests/unit/services/governor-event-bus.test.ts` | 8–10 |
| Adaptive retrieval (FR-11) | `tests/unit/services/adaptive-retrieval.test.ts` | 5–6 |

### 5.2 Integration Tests

| Scenario | Test File | Tests (est.) |
|----------|-----------|-------------|
| Full query → response cycle | `tests/integration/reputation-query.test.ts` | 5–6 |
| Startup seeding from mock PG | `tests/integration/collection-seed.test.ts` | 3–4 |
| Three-witness PG durability | `tests/integration/knowledge-pg.test.ts` | 4–5 |

### 5.3 Test Patterns

- **Route tests**: Use Hono test client (`app.request()`) with mock services
- **Store tests**: Use `createMockPool()` from `tests/fixtures/pg-test.ts`
- **Regression tests**: Reproduce the exact scenario from the bug report, verify fix

---

## 6. Invariants

### Existing (Verified)

| ID | Statement | Component |
|----|-----------|-----------|
| INV-006 | EMA-dampened score stays within [0, 1] | ReputationService |
| INV-007 | Session ID monotonically increases | ReputationService |
| INV-009 | Knowledge freshness decays monotonically between ingestions | KnowledgeGovernor |
| INV-010 | Citation integrity: all cited sources exist in known corpus | KnowledgeGovernor |

### New

| ID | Statement | Component |
|----|-----------|-----------|
| INV-013 | Collection score aggregator mean converges to true population mean within ε after N observations | CollectionScoreAggregator |
| INV-014 | Reputation query endpoint returns null (not error) for unknown agents | Reputation Routes |

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Reputation data leakage | conviction tier gating on agent-facing endpoints |
| Admin endpoint exposure | Bearer token auth (existing `adminKey` pattern) |
| Internal query endpoint abuse | No auth but network-gated; document deployment requirement |
| SQL injection on query params | Parameterized queries (existing pattern) |
| Timing attacks on reputation | Fixed-time response regardless of score existence |

---

## 8. Deployment Notes

### Network Topology

The `/api/reputation/query` endpoint is designed for inter-service calls:
- **Same-host deployment**: finn calls dixie via localhost — no auth needed
- **Separate-host deployment**: Requires network-level access control (VPC, firewall)
- **Future**: When `ReputationQueryProtocol` is formalized in hounfour, add JWT auth

### Backward Compatibility

- All existing endpoints unchanged
- New endpoints are additive only
- `DEFAULT_COLLECTION_SCORE` change from 0 to 0.5 affects cold-start behavior
  for agents with zero population data — this is an improvement, not a regression
- `reconstructAggregateFromEvents` gains optional parameter — backward compatible

---

## 9. Sprint Mapping

| Sprint | SDD Section | PRD FRs |
|--------|-------------|---------|
| Sprint 1 | §2.2, regression tests | FR-1, FR-2 |
| Sprint 2 | §2.1 (query, nftId, route module), §2.3 | FR-4, FR-6, FR-8 |
| Sprint 3 | §2.1 (cohorts, population) | FR-5, FR-7 |
| Sprint 4 | §2.4, §3.2 | FR-9 |
| Sprint 5 | §2.5, §2.6 | FR-10, FR-11 |
