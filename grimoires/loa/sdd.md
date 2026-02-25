# SDD: Institutional Memory — Durable Governance, Knowledge Sovereignty & the Court of Record

**Version**: 9.0.0
**Date**: 2026-02-26
**Author**: Claude (Architecture), Merlin (Direction)
**Cycle**: cycle-009
**Status**: Draft
**PRD Reference**: PRD v9.0.0 — Institutional Memory
**Predecessor**: cycle-006 SDD (Phase 3 Production Wiring)

---

## 1. Executive Summary

Cycle-009 transforms Dixie from a governance protocol with ephemeral state into an institutional memory — a durable court of record. The architecture leverages two complementary layers:

1. **Schema layer** (Hounfour commons v8.x): `GovernedReputation`, `GovernedFreshness`, `GovernanceMutation`, `AuditTrail` — formal type-safe schemas with conservation laws, audit trails, and state machines.
2. **Service layer** (Dixie): `ResourceGovernor<T>`, `GovernorRegistry`, `ReputationStore` — runtime governance with pluggable persistence, health monitoring, and self-knowledge.

The key insight: Hounfour defines WHAT governance looks like (data shape). Dixie defines HOW governance runs (runtime behavior). Cycle-009 bridges these layers with PostgreSQL persistence, making governance durable.

### Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Dixie Service Layer                         │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ ReputationService │  │ ScoringPath      │  │ Knowledge        │  │
│  │ (ResourceGovernor)│  │ Tracker          │  │ Governor         │  │
│  └────────┬─────────┘  └──────────────────┘  └────────┬─────────┘  │
│           │                                            │            │
│  ┌────────┴────────────────────────────────────────────┴─────────┐  │
│  │                     GovernorRegistry                          │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                      │
│  ┌───────────────────────────┴───────────────────────────────────┐  │
│  │                    Persistence Layer                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │  │
│  │  │ PostgreSQL   │  │ Mutation    │  │ Audit Trail          │  │  │
│  │  │ Reputation   │  │ Log        │  │ Store                │  │  │
│  │  │ Store        │  │ Store      │  │                      │  │  │
│  │  └──────┬───────┘  └─────┬──────┘  └──────────┬───────────┘  │  │
│  │         └────────────────┼────────────────────┘               │  │
│  │                    ┌─────┴──────┐                              │  │
│  │                    │ Migration  │                              │  │
│  │                    │ Runner     │                              │  │
│  │                    └─────┬──────┘                              │  │
│  │                          │                                     │  │
│  └──────────────────────────┼────────────────────────────────────┘  │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                        ┌──────┴──────┐
                        │ PostgreSQL  │
                        │ (pg pool)   │
                        └─────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| Runtime | Bun / Node.js | >=18 | Existing runtime |
| Framework | Hono | ^4.7.0 | Existing HTTP framework |
| Database | PostgreSQL | >=15 | Already configured in `db/client.ts`, pool ready |
| DB Driver | pg | ^8.18.0 | Already in dependencies |
| Schema Validation | TypeBox (via Hounfour) | — | Hounfour commons schemas |
| Hashing | SHA-256 (RFC 8785 canonical JSON) | — | Existing pattern from `ScoringPathTracker` |
| Protocol Types | `@0xhoneyjar/loa-hounfour` | v8.2.0 | Symlinked at `../../loa-hounfour` |
| Testing | Vitest | ^3.0.0 | Existing test framework |

### New Dependencies

None. All required packages (`pg`, `@types/pg`, `@0xhoneyjar/loa-hounfour`) are already in `package.json`.

---

## 3. Component Design

### 3.1 PostgreSQL ReputationStore (FR-1)

**File**: `app/src/services/pg-reputation-store.ts`

Implements the existing `ReputationStore` interface with PostgreSQL backing. Drop-in replacement for `InMemoryReputationStore`.

```typescript
import type { DbPool } from '../db/client.js';
import type { ReputationStore } from './reputation-service.js';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';
import type { TaskTypeCohort, ReputationEvent } from '../types/reputation-evolution.js';

export class PostgreSQLReputationStore implements ReputationStore {
  constructor(private readonly pool: DbPool) {}

  async get(nftId: string): Promise<ReputationAggregate | undefined>;
  async put(nftId: string, aggregate: ReputationAggregate): Promise<void>;
  async listCold(): Promise<Array<{ nftId: string; aggregate: ReputationAggregate }>>;
  async count(): Promise<number>;
  async listAll(): Promise<Array<{ nftId: string; aggregate: ReputationAggregate }>>;
  async getTaskCohort(nftId: string, model: string, taskType: string): Promise<TaskTypeCohort | undefined>;
  async putTaskCohort(nftId: string, cohort: TaskTypeCohort): Promise<void>;
  async appendEvent(nftId: string, event: ReputationEvent): Promise<void>;
  async getEventHistory(nftId: string): Promise<ReputationEvent[]>;
}
```

#### Storage Strategy

The `ReputationAggregate` is a complex nested object. Rather than normalizing every field into columns, we use a hybrid approach:

| Table | Strategy | Rationale |
|-------|----------|-----------|
| `reputation_aggregates` | JSONB column + indexed fields | Aggregate shape varies by Hounfour version; JSONB absorbs schema evolution. Key fields (`nft_id`, `state`, `version`) are lifted to columns for queries. |
| `reputation_task_cohorts` | Relational columns | Fixed schema, queried by composite key (`nft_id`, `model_id`, `task_type`). |
| `reputation_events` | Append-only with JSONB payload | Event sourcing pattern. Never updated or deleted. `seq` column for ordering. |

#### Optimistic Concurrency

```sql
-- put() with version check
UPDATE reputation_aggregates
SET data = $2, version = version + 1, updated_at = now()
WHERE nft_id = $1 AND version = $3
RETURNING version;
-- If 0 rows affected: version conflict -> throw ConflictError
```

#### Transaction Support

For batch operations that need atomicity:

```typescript
// app/src/db/transaction.ts
export async function withTransaction<T>(
  pool: DbPool,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### 3.2 Migration Framework (FR-13)

**File**: `app/src/db/migrate.ts`

Lightweight, forward-only migration runner. Continues the existing pattern from `migrations/003_schedules.sql` and `migrations/004_autonomous_permissions.sql`.

```typescript
export interface MigrationResult {
  applied: string[];
  skipped: string[];
  total: number;
}

export async function migrate(pool: DbPool): Promise<MigrationResult>;
```

#### Migration Table

```sql
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Migration Numbering

| Migration | Purpose | FR |
|-----------|---------|-----|
| `005_reputation_aggregates.sql` | Reputation aggregate storage | FR-1 |
| `006_reputation_task_cohorts.sql` | Per-model per-task cohort storage | FR-1 |
| `007_reputation_events.sql` | Append-only event log | FR-1 |
| `008_mutation_log.sql` | Governance mutation log | FR-2 |
| `009_audit_trail.sql` | Hash-chained audit entries | FR-3 |
| `010_knowledge_freshness.sql` | Knowledge governance state | FR-4, FR-5 |
| `011_dynamic_contracts.sql` | DynamicContract storage | FR-7 |

#### Idempotency

Migrations use `IF NOT EXISTS` for table/index creation. The `_migrations` table tracks which files have been applied. Re-running `migrate()` is always safe.

### 3.3 Mutation Log Store (FR-2)

**File**: `app/src/services/mutation-log-store.ts`

Durable recording of every governance mutation. Uses Hounfour's `GovernanceMutation` envelope as the schema foundation.

```typescript
import type { GovernanceMutation } from '@0xhoneyjar/loa-hounfour/commons';
import type { DbPool } from '../db/client.js';

export interface MutationLogEntry {
  readonly mutation_id: string;
  readonly session_id: string;
  readonly actor_id: string;
  readonly resource_type: string;
  readonly mutation_type: string;
  readonly payload: Record<string, unknown>;
  readonly created_at: string;
}

export interface MutationLogQuery {
  session_id?: string;
  actor_id?: string;
  resource_type?: string;
  since?: string;
  limit?: number;
}

export class MutationLogStore {
  constructor(private readonly pool: DbPool) {}

  async append(entry: MutationLogEntry): Promise<void>;
  async query(filter: MutationLogQuery): Promise<MutationLogEntry[]>;
  async countBySession(sessionId: string): Promise<number>;
}
```

#### Schema

```sql
CREATE TABLE IF NOT EXISTS governance_mutations (
  mutation_id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  actor_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  mutation_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mutations_session ON governance_mutations(session_id);
CREATE INDEX idx_mutations_resource ON governance_mutations(resource_type, created_at);
CREATE INDEX idx_mutations_actor ON governance_mutations(actor_id, created_at);
```

### 3.4 Audit Trail Store (FR-3)

**File**: `app/src/services/audit-trail-store.ts`

Durable, hash-chained audit entries using Hounfour's `AuditEntry` and `AuditTrail` schemas. Each governance action produces an audit entry with SHA-256 hash linking.

```typescript
import type { AuditEntry } from '@0xhoneyjar/loa-hounfour/commons';
import { computeAuditEntryHash, AUDIT_TRAIL_GENESIS_HASH } from '@0xhoneyjar/loa-hounfour/commons';
import type { DbPool } from '../db/client.js';

export class AuditTrailStore {
  constructor(private readonly pool: DbPool) {}

  /** Append a new audit entry, computing its hash and linking to the chain. */
  async append(
    resourceType: string,
    entry: Omit<AuditEntry, 'entry_hash' | 'previous_hash'>,
  ): Promise<AuditEntry>;

  /** Get the latest hash for a resource type's audit chain. */
  async getTipHash(resourceType: string): Promise<string>;

  /** Retrieve audit entries for a resource type. */
  async getEntries(resourceType: string, limit?: number): Promise<AuditEntry[]>;

  /** Verify integrity of the audit chain for a resource type. */
  async verifyIntegrity(
    resourceType: string,
  ): Promise<{ valid: boolean; entries_checked: number }>;
}
```

#### Schema

```sql
CREATE TABLE IF NOT EXISTS audit_entries (
  entry_id UUID PRIMARY KEY,
  resource_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT,
  payload JSONB,
  entry_hash TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  hash_domain_tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_resource ON audit_entries(resource_type, created_at);
CREATE INDEX idx_audit_hash ON audit_entries(entry_hash);
```

#### Cross-Chain Verification

The existing `ScoringPathTracker` maintains an in-memory hash chain for scoring decisions. The `AuditTrailStore` maintains a durable hash chain for governance actions. Cross-chain verification compares the scoring path's tip hash against the audit trail's latest scoring-related entry to detect divergence.

### 3.5 Knowledge Governor (FR-4, FR-5, FR-6)

**File**: `app/src/services/knowledge-governor.ts`

The third `ResourceGovernor<T>` implementation, governing knowledge freshness. Uses Hounfour's `GovernedFreshness` schema as the type foundation.

```typescript
import type {
  ResourceGovernor, ResourceHealth, ResourceSelfKnowledge, GovernanceEvent,
} from './resource-governor.js';
import type { GovernedFreshness } from '@0xhoneyjar/loa-hounfour/commons';

export interface KnowledgeItem {
  readonly corpus_id: string;
  readonly source_count: number;
  readonly citation_count: number;
  readonly freshness_score: number;
  readonly freshness_state: 'fresh' | 'decaying' | 'stale' | 'expired';
  readonly last_ingested: string;
  readonly dimension_scores: {
    accuracy: number;
    coverage: number;
    recency: number;
  };
}

export class KnowledgeGovernor implements ResourceGovernor<KnowledgeItem> {
  readonly resourceType = 'knowledge';

  getHealth(nowOverride?: Date): ResourceHealth | null;
  getGovernorSelfKnowledge(nowOverride?: Date): ResourceSelfKnowledge | null;
  getEventLog(): ReadonlyArray<GovernanceEvent>;
  getLatestEvent(): GovernanceEvent | null;
  invalidateCache(): void;
  warmCache(): void;

  /** Knowledge-specific: compute freshness decay for a corpus. */
  computeFreshnessDecay(item: KnowledgeItem, now?: Date): number;

  /** Verify freshness bound invariant (INV-009). */
  verifyFreshnessBound(
    item: KnowledgeItem,
  ): { satisfied: boolean; detail: string };

  /** Verify citation integrity invariant (INV-010). */
  verifyCitationIntegrity(
    item: KnowledgeItem,
    knownSources: Set<string>,
  ): { satisfied: boolean; detail: string };
}
```

#### Freshness State Machine

Aligned with Hounfour's `GovernedFreshness` decay model:

```
fresh --(decay)--> decaying --(decay)--> stale --(decay)--> expired
  ^                                                            |
  +--------------------(re-ingestion)---------------------------+
```

**Transitions:**
- `fresh -> decaying`: `freshness_score` drops below 0.7
- `decaying -> stale`: `freshness_score` drops below 0.3
- `stale -> expired`: `freshness_score` drops below `minimum_freshness` (0.1)
- `expired -> fresh`: re-ingestion event (score reset to 1.0)

**Decay formula**: `score(t) = exp(-lambda * (t - last_refresh))` where `lambda` is the decay rate per day. Default `lambda = 0.023` gives a half-life of ~30 days (matching reputation decay).

#### Knowledge Invariants

| ID | Name | Expression | Severity |
|----|------|-----------|----------|
| INV-009 | Freshness Bound | `freshness_score` decreases monotonically between ingestion events | error |
| INV-010 | Citation Integrity | Every citation references an existing source | error |

#### Schema

```sql
CREATE TABLE IF NOT EXISTS knowledge_freshness (
  corpus_id TEXT PRIMARY KEY,
  source_count INTEGER NOT NULL DEFAULT 0,
  citation_count INTEGER NOT NULL DEFAULT 0,
  freshness_score NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  freshness_state TEXT NOT NULL DEFAULT 'fresh',
  decay_rate NUMERIC(8,6) NOT NULL DEFAULT 0.023,
  minimum_freshness NUMERIC(5,4) NOT NULL DEFAULT 0.1,
  last_ingested TIMESTAMPTZ NOT NULL DEFAULT now(),
  dimension_scores JSONB NOT NULL DEFAULT '{"accuracy":0,"coverage":0,"recency":0}',
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.6 DynamicContract Adoption (FR-7, FR-8)

**File**: `app/src/services/dynamic-contract-store.ts`

Adopts Hounfour's `DynamicContract` type for capability-gated access. Stores contract state in PostgreSQL and integrates with the conviction boundary.

```typescript
import type { DynamicContract, ProtocolSurface } from '@0xhoneyjar/loa-hounfour/commons';
import { verifyMonotonicExpansion } from '@0xhoneyjar/loa-hounfour/commons';
import type { DbPool } from '../db/client.js';

export class DynamicContractStore {
  constructor(private readonly pool: DbPool) {}

  /** Get the active contract for an NFT. */
  async getContract(nftId: string): Promise<DynamicContract | undefined>;

  /** Create or update a contract. Verifies monotonic expansion before saving. */
  async putContract(nftId: string, contract: DynamicContract): Promise<void>;

  /** Get the protocol surface for an NFT at a given reputation state. */
  async getSurface(
    nftId: string,
    reputationState: string,
  ): Promise<ProtocolSurface | undefined>;
}
```

#### Integration with ConvictionBoundary

Extend `EconomicBoundaryOptions` to include contract checking:

```typescript
// In conviction-boundary.ts
export interface EconomicBoundaryOptions {
  criteria?: QualificationCriteria;
  budgetPeriodDays?: number;
  reputationAggregate?: ReputationAggregate | DixieReputationAggregate | null;
  taskType?: TaskType;
  scoringPathTracker?: ScoringPathTracker;
  dynamicContract?: DynamicContract;  // NEW: capability check
}
```

When `dynamicContract` is present:
1. Look up the agent's reputation state
2. Get the `ProtocolSurface` for that state from the contract's `surfaces` map
3. Verify the required capability is in `surface.capabilities`
4. If capability missing: access denied with clear reason

**Backward compatibility**: When `dynamicContract` is `undefined`, the existing behavior is unchanged. Contracts are opt-in.

#### Schema

```sql
CREATE TABLE IF NOT EXISTS dynamic_contracts (
  nft_id TEXT PRIMARY KEY,
  contract_id UUID NOT NULL UNIQUE,
  contract_data JSONB NOT NULL,
  contract_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.7 Adaptive Exploration — UCB1 (FR-9)

**File**: `app/src/services/exploration.ts`

UCB1 (Upper Confidence Bound) as an opt-in alternative exploration strategy.

```typescript
export type ExplorationStrategy = 'epsilon-greedy' | 'ucb1';

export interface ExplorationConfig {
  strategy: ExplorationStrategy;
  /** For epsilon-greedy: exploration probability (0-1). */
  epsilon?: number;
  /** For UCB1: exploration constant (default: sqrt(2)). */
  ucb1_c?: number;
  /** Seeded PRNG for deterministic tie-breaking. */
  seed?: number;
}

export interface ModelObservation {
  model_id: string;
  observation_count: number;
  mean_quality: number;
}

/** Compute UCB1 score for a model. */
export function computeUCB1Score(
  model: ModelObservation,
  totalObservations: number,
  c: number,
): number {
  if (model.observation_count === 0) return Infinity; // Always explore unobserved
  return model.mean_quality + c * Math.sqrt(
    Math.log(totalObservations) / model.observation_count,
  );
}

/** Select the best model according to the configured strategy. */
export function selectModel(
  models: ModelObservation[],
  config: ExplorationConfig,
  prng: () => number,
): string;
```

**Default behavior**: `strategy: 'epsilon-greedy'` preserves existing behavior. UCB1 is strictly opt-in.

### 3.8 Dimension Covariance Tracking (FR-10)

**File**: `app/src/services/collection-score-aggregator.ts`

Streaming covariance estimation between quality dimensions using Welford's online algorithm extended to pairwise covariance.

```typescript
export interface DimensionPair {
  dim_a: string;
  dim_b: string;
  covariance: number;
  correlation: number; // Pearson's r
  sample_count: number;
}

export class CollectionScoreAggregator {
  private readonly means = new Map<string, number>();
  private readonly m2s = new Map<string, number>();     // Welford's M2
  private readonly co_m2s = new Map<string, number>();  // Pairwise co-moment
  private readonly counts = new Map<string, number>();

  /** Update with a new observation across multiple dimensions. O(d^2) per call. */
  update(observation: Record<string, number>): void;

  /** Get current mean and variance for a dimension. */
  getStats(
    dimension: string,
  ): { mean: number; variance: number; count: number } | undefined;

  /** Get pairwise covariance between two dimensions. */
  getCovariance(dimA: string, dimB: string): DimensionPair | undefined;

  /** Get all pairwise covariances. */
  getAllCovariances(): DimensionPair[];

  /** Serialize state for persistence. */
  toJSON(): Record<string, unknown>;

  /** Restore from serialized state. */
  static fromJSON(data: Record<string, unknown>): CollectionScoreAggregator;
}
```

**Streaming update** (Welford's extended to covariance):
```
For each pair (a, b):
  delta_a = x_a - mean_a
  mean_a += delta_a / n
  delta_b = x_b - mean_b
  mean_b += delta_b / n
  co_m2_ab += delta_a * (x_b - mean_b)
  covariance_ab = co_m2_ab / (n - 1)
```

### 3.9 GovernorRegistry (FR-11)

The existing `GovernorRegistry` on main has a clean single-Map implementation with no double-counting. The only change needed for cycle-009 is ensuring the `KnowledgeGovernor` is registered as the third governor alongside the existing corpus-meta governor.

No structural changes to `GovernorRegistry` itself. The registry's `getAll()` method already returns health snapshots for all registered governors.

### 3.10 Three-Resource Integration Test (FR-12)

**File**: `app/tests/integration/governance-three-witness.test.ts`

End-to-end test exercising the complete governance lifecycle across all three `ResourceGovernor` implementations.

```typescript
describe('Three-Witness Governance Integration', () => {
  // Setup: create GovernorRegistry with 3 governors
  // Test: register, transition, verify, audit for each resource type
  // Test: GovernorRegistry.getAll() returns 3 snapshots
  // Test: Cross-resource invariant: knowledge freshness decay rate
  // Test: Audit trail entries exist for each governance action
  // Test: Mutation log records all transitions
  // Minimum: 10 test cases
});
```

---

## 4. Data Architecture

### 4.1 Database Schema Overview

```
                    PostgreSQL Database

  Existing:
  +-------------------+  +-------------------------------+
  | schedules         |  | autonomous_permissions        |
  | (migration 003)   |  | (migration 004)               |
  +-------------------+  +-------------------------------+

  New (cycle-009):
  +------------------------+  +-------------------------+
  | reputation_aggregates  |  | reputation_task_cohorts  |
  | (migration 005)        |  | (migration 006)          |
  +------------------------+  +-------------------------+
  +------------------------+  +-------------------------+
  | reputation_events      |  | governance_mutations     |
  | (migration 007)        |  | (migration 008)          |
  +------------------------+  +-------------------------+
  +------------------------+  +-------------------------+
  | audit_entries          |  | knowledge_freshness      |
  | (migration 009)        |  | (migration 010)          |
  +------------------------+  +-------------------------+
  +------------------------+  +-------------------------+
  | dynamic_contracts      |  | _migrations              |
  | (migration 011)        |  | (migration 005 bootstrap)|
  +------------------------+  +-------------------------+
```

### 4.2 Table Definitions

#### `reputation_aggregates` (Migration 005)

```sql
CREATE TABLE IF NOT EXISTS reputation_aggregates (
  nft_id TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'cold',
  blended_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rep_agg_state ON reputation_aggregates(state);
CREATE INDEX idx_rep_agg_version ON reputation_aggregates(version);
```

#### `reputation_task_cohorts` (Migration 006)

```sql
CREATE TABLE IF NOT EXISTS reputation_task_cohorts (
  nft_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  personal_score NUMERIC(5,4),
  sample_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB NOT NULL,
  PRIMARY KEY (nft_id, model_id, task_type)
);

CREATE INDEX idx_cohort_nft ON reputation_task_cohorts(nft_id);
```

#### `reputation_events` (Migration 007)

```sql
CREATE TABLE IF NOT EXISTS reputation_events (
  id BIGSERIAL PRIMARY KEY,
  nft_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rep_events_nft ON reputation_events(nft_id, id);
```

### 4.3 Connection Pooling

Uses existing `db/client.ts` infrastructure:

```typescript
const pool = createDbPool({
  connectionString: config.databaseUrl!,
  minConnections: 2,
  maxConnections: 10,
  idleTimeoutMs: 30_000,
  connectionTimeoutMs: 5_000,
});
```

No changes to pool configuration needed.

---

## 5. Integration Points

### 5.1 Hounfour Commons (v8.x)

| Import | From | Used By |
|--------|------|---------|
| `GovernedFreshness` | `@0xhoneyjar/loa-hounfour/commons` | KnowledgeGovernor type alignment |
| `GovernanceMutation` | `@0xhoneyjar/loa-hounfour/commons` | MutationLogStore envelope |
| `AuditEntry`, `AuditTrail` | `@0xhoneyjar/loa-hounfour/commons` | AuditTrailStore schema |
| `computeAuditEntryHash` | `@0xhoneyjar/loa-hounfour/commons` | Hash chain computation |
| `AUDIT_TRAIL_GENESIS_HASH` | `@0xhoneyjar/loa-hounfour/commons` | Chain anchor |
| `DynamicContract` | `@0xhoneyjar/loa-hounfour/commons` | DynamicContractStore |
| `verifyMonotonicExpansion` | `@0xhoneyjar/loa-hounfour/commons` | Contract validation |
| `evaluateGovernanceMutation` | `@0xhoneyjar/loa-hounfour/commons` | Mutation authorization |

### 5.2 Existing Dixie Services

| Service | Integration |
|---------|-------------|
| `ReputationService` | Constructor injection: `new ReputationService(pgStore)` instead of `new ReputationService()` |
| `ScoringPathTracker` | Unchanged. Audit trail cross-references scoring path hashes. |
| `GovernorRegistry` | Registers `KnowledgeGovernor` as third governor. |
| `ConvictionBoundary` | `EconomicBoundaryOptions.dynamicContract` added for capability checks. |
| `CorpusMeta` | Existing knowledge service. KnowledgeGovernor wraps its freshness tracking. |

### 5.3 Initialization Order

```typescript
// In server.ts or init module:

// 1. Create DB pool
const pool = createDbPool({ connectionString: config.databaseUrl! });

// 2. Run migrations
await migrate(pool);

// 3. Create stores
const reputationStore = config.databaseUrl
  ? new PostgreSQLReputationStore(pool)
  : new InMemoryReputationStore();

const mutationLog = new MutationLogStore(pool);
const auditTrail = new AuditTrailStore(pool);
const contractStore = new DynamicContractStore(pool);

// 4. Create services with injected stores
const reputationService = new ReputationService(reputationStore);
const knowledgeGovernor = new KnowledgeGovernor();

// 5. Register governors
governorRegistry.register(knowledgeGovernor);
```

**Graceful degradation**: When `config.databaseUrl` is null, fall back to `InMemoryReputationStore`. This preserves the development and test experience where PostgreSQL is optional.

---

## 6. Security Architecture

### 6.1 Audit Trail Integrity

- All audit entries are hash-chained using domain-separated SHA-256.
- Hash domain tag format: `loa-dixie:audit:<resource_type>:<version>`.
- `verifyIntegrity()` can detect tampering by recomputing the chain.
- Audit entries are append-only (no UPDATE/DELETE on `audit_entries` table).

### 6.2 Optimistic Concurrency

- `reputation_aggregates.version` column prevents lost updates.
- Every `put()` checks `WHERE version = expected_version`.
- Version mismatch returns a typed `ConflictError`.

### 6.3 SQL Injection Prevention

- All queries use parameterized statements (`$1`, `$2`, etc.).
- No string concatenation for SQL construction.
- JSONB payloads are passed as parameters, not interpolated.

### 6.4 Connection Security

- Connection string from environment variable (`DATABASE_URL`).
- SSL mode configurable via connection string parameters.
- Connection timeout (5s) prevents hanging on network issues.

---

## 7. Testing Strategy

### 7.1 Test Matrix

| Layer | Type | PostgreSQL Required | Count |
|-------|------|---------------------|-------|
| `PostgreSQLReputationStore` | Integration | Yes (Docker) | ~20 |
| `MutationLogStore` | Integration | Yes | ~10 |
| `AuditTrailStore` | Integration | Yes | ~10 |
| `KnowledgeGovernor` | Unit | No | ~15 |
| `DynamicContractStore` | Integration | Yes | ~8 |
| `ExplorationConfig` + UCB1 | Unit | No | ~12 |
| `CollectionScoreAggregator` | Unit | No | ~10 |
| `ConvictionBoundary` (contract) | Unit | No | ~5 |
| Three-Witness Integration | Integration | Yes | ~10 |
| Migration Runner | Integration | Yes | ~5 |
| **Total new** | | | **~105** |

### 7.2 PostgreSQL Test Strategy

Integration tests that require PostgreSQL use a shared Docker container:

```typescript
// tests/fixtures/pg-test.ts
import { createDbPool, closeDbPool } from '../../src/db/client.js';
import { migrate } from '../../src/db/migrate.js';

let pool: DbPool;

export async function setupTestDb(): Promise<DbPool> {
  pool = createDbPool({
    connectionString: process.env.TEST_DATABASE_URL
      ?? 'postgresql://localhost:5432/dixie_test',
  });
  await migrate(pool);
  return pool;
}

export async function teardownTestDb(): Promise<void> {
  await closeDbPool(pool);
}
```

### 7.3 Backward Compatibility

All existing tests continue to pass without modification. The `InMemoryReputationStore` remains the default when no `ReputationStore` is injected.

---

## 8. Performance Considerations

### 8.1 Query Performance

| Operation | Expected Latency | Mitigation |
|-----------|-----------------|------------|
| `get(nftId)` | <5ms | Primary key lookup |
| `put(nftId, aggregate)` | <10ms | Single UPSERT with version check |
| `appendEvent(nftId, event)` | <5ms | Append-only INSERT |
| `getEventHistory(nftId)` | <20ms (1000 events) | Index on `(nft_id, id)` |
| `audit.verifyIntegrity()` | <100ms (1000 entries) | Sequential hash verification |

### 8.2 JSONB vs. Columns Tradeoff

`reputation_aggregates.data` uses JSONB for the full aggregate to absorb Hounfour schema evolution. Key fields (`state`, `blended_score`, `sample_count`, `version`) are lifted to columns for indexed queries. This avoids schema migrations when Hounfour adds new aggregate fields.

---

## 9. Deployment Considerations

### 9.1 PostgreSQL Requirement

Cycle-009 makes PostgreSQL required for production but optional for development/test:

| Environment | PostgreSQL | Behavior |
|-------------|-----------|----------|
| Production | Required (`DATABASE_URL` set) | `PostgreSQLReputationStore` + all durable stores |
| Development | Optional | Falls back to `InMemoryReputationStore` |
| Unit tests | Not needed | Uses in-memory stores |
| Integration tests | Docker container | Full PostgreSQL test suite |

### 9.2 Migration on Startup

`migrate()` runs automatically on server startup when `DATABASE_URL` is set. The migration runner is idempotent — safe to run on every deployment.

---

## 10. Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| PostgreSQL unavailability | Graceful degradation to `InMemoryReputationStore` when `DATABASE_URL` not set |
| Migration conflicts | Forward-only migrations with `IF NOT EXISTS`. No rollback needed. |
| Hounfour schema changes | JSONB aggregate storage absorbs schema evolution without migration |
| Performance regression | Integration tests include latency assertions. In-memory store remains default for unit tests. |
| DynamicContract incompatibility | Direct import from Hounfour v8.2.0 (pinned via symlink). Monotonic expansion verified at write time. |

---

## 11. File Inventory

### New Files

| File | Purpose | FR |
|------|---------|-----|
| `app/src/services/pg-reputation-store.ts` | PostgreSQL ReputationStore | FR-1 |
| `app/src/services/mutation-log-store.ts` | Governance mutation log | FR-2 |
| `app/src/services/audit-trail-store.ts` | Hash-chained audit trail | FR-3 |
| `app/src/services/knowledge-governor.ts` | Knowledge freshness governance | FR-4, FR-5, FR-6 |
| `app/src/services/dynamic-contract-store.ts` | DynamicContract persistence | FR-7 |
| `app/src/services/exploration.ts` | UCB1 + exploration strategies | FR-9 |
| `app/src/services/collection-score-aggregator.ts` | Dimension covariance | FR-10 |
| `app/src/db/migrate.ts` | Migration runner | FR-13 |
| `app/src/db/transaction.ts` | Transaction helper | FR-1 |
| `app/src/db/migrations/005_reputation_aggregates.sql` | Schema | FR-1 |
| `app/src/db/migrations/006_reputation_task_cohorts.sql` | Schema | FR-1 |
| `app/src/db/migrations/007_reputation_events.sql` | Schema | FR-1 |
| `app/src/db/migrations/008_mutation_log.sql` | Schema | FR-2 |
| `app/src/db/migrations/009_audit_trail.sql` | Schema | FR-3 |
| `app/src/db/migrations/010_knowledge_freshness.sql` | Schema | FR-4 |
| `app/src/db/migrations/011_dynamic_contracts.sql` | Schema | FR-7 |
| `app/tests/integration/governance-three-witness.test.ts` | Integration test | FR-12 |
| `app/tests/fixtures/pg-test.ts` | PostgreSQL test helpers | — |

### Modified Files

| File | Change | FR |
|------|--------|-----|
| `app/src/services/conviction-boundary.ts` | Add `dynamicContract` to `EconomicBoundaryOptions` | FR-8 |
| `app/src/server.ts` | Initialize PostgreSQL stores on startup | FR-1 |
| `app/src/types/reputation-evolution.ts` | Add knowledge event types | FR-4 |

### Unchanged Files

All existing service files, type files, middleware, routes, and tests remain unchanged. The `InMemoryReputationStore` continues to work for development.

---

## 12. Sprint Mapping

| Sprint | Components | FRs | New Tests |
|--------|-----------|------|-----------|
| **1** | Migration framework, PostgreSQLReputationStore, transaction helper | FR-1, FR-13 | ~25 |
| **2** | MutationLogStore, AuditTrailStore | FR-2, FR-3 | ~20 |
| **3** | KnowledgeGovernor, KnowledgeItem types, invariants INV-009/INV-010 | FR-4, FR-5, FR-6 | ~15 |
| **4** | DynamicContractStore, capability-gated access extension | FR-7, FR-8 | ~13 |
| **5** | UCB1 exploration, CollectionScoreAggregator covariance | FR-9, FR-10 | ~22 |
| **6** | GovernorRegistry integration, three-witness test, server wiring | FR-11, FR-12 | ~10 |
| **Total** | | 13 FRs | **~105** |

---

*"The interface was always the contract. The PostgreSQL adapter is just the court reporter finally taking their seat."*

*-- Bridgebuilder Review, PR #25*
