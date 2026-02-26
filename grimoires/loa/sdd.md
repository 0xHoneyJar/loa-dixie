# SDD: From Fleet to Collective — Agent Ecology & Governed Sovereignty

**Version**: 13.0.0
**Date**: 2026-02-26
**Author**: Claude (Architecture), Merlin (Direction)
**Cycle**: cycle-013
**Status**: Draft
**PRD Reference**: PRD v13.0.0 — From Fleet to Collective

---

## 1. System Overview

Cycle-013 adds four new services and one new subsystem to the conductor layer, plus
extends three existing services. All new code lives within the existing Hono server
process, sharing database pool, NATS connection, and governance infrastructure.

### 1.1 Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          DIXIE BFF (Hono Server)                               │
│                                                                                │
│  ┌──────────────────────── CONDUCTOR ENGINE v2 ─────────────────────────────┐ │
│  │                                                                           │ │
│  │  ┌───────────────────── EXISTING (cycle-012) ──────────────────────────┐ │ │
│  │  │ TaskRegistry │ AgentSpawner │ FleetMonitor │ AgentModelRouter       │ │ │
│  │  │ RetryEngine  │ FleetSaga   │ Notifications │ ContextEnrichment     │ │ │
│  │  │ FleetGovernor│ EventBus    │ OutboxWorker  │ FleetMetrics          │ │ │
│  │  └──────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                           │ │
│  │  ┌───────────────────── NEW (cycle-013) ───────────────────────────────┐ │ │
│  │  │                                                                     │ │ │
│  │  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │ │ │
│  │  │  │ AgentIdentity    │  │ CollectiveInsight │  │ Sovereignty     │  │ │ │
│  │  │  │ Service          │  │ Service           │  │ Engine          │  │ │ │
│  │  │  │                  │  │                   │  │                 │  │ │ │
│  │  │  │ • identity CRUD  │  │ • InsightPool     │  │ • GovernedRes   │  │ │ │
│  │  │  │ • reputation     │  │ • harvest cycle   │  │   <Autonomy>    │  │ │ │
│  │  │  │   accumulation   │  │ • relevance score │  │ • level compute │  │ │ │
│  │  │  │ • history window │  │ • prompt injection│  │ • resource alloc│  │ │ │
│  │  │  └──────────────────┘  └──────────────────┘  └─────────────────┘  │ │ │
│  │  │                                                                     │ │ │
│  │  │  ┌──────────────────┐  ┌──────────────────────────────────────────┐│ │ │
│  │  │  │ Circulation      │  │ MeetingGeometryRouter                    ││ │ │
│  │  │  │ Protocol         │  │                                          ││ │ │
│  │  │  │                  │  │ • factory (parallel, no cross-comms)     ││ │ │
│  │  │  │ • dynamic cost   │  │ • jam (shared InsightPool, real-time)    ││ │ │
│  │  │  │ • utilization    │  │ • study_group (implement-review rotation)││ │ │
│  │  │  │ • reputation adj │  │                                          ││ │ │
│  │  │  └──────────────────┘  └──────────────────────────────────────────┘│ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌───────────── GOVERNANCE LAYER (extended) ───────────────────────────────┐  │
│  │  FleetGovernor │ SovereigntyEngine │ GovernorRegistry │ EventBus        │  │
│  │  INV-001..018 (existing) + INV-019..024 (new circulation invariants)    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow: Cross-Agent Insight Propagation

```
Agent A (running)                    CollectiveInsightService
    │                                         │
    ├── git commit "discovered X" ──→ harvest()──→ InsightPool
    │                                         │         │
    │                                         │    relevance
    │                                         │    scoring
    │                                         │         │
Agent B (spawning)                            │         ▼
    │                                         │   filtered
    ├── ContextEnrichment.buildPrompt() ←─────┤   insights
    │       includes CROSS_AGENT sections     │
    ▼                                         │
  prompt with insights from Agent A           │
```

---

## 2. New Types

### 2.1 Agent Identity Types (`app/src/types/agent-identity.ts`)

```typescript
/** Autonomy level — earned through demonstrated competence. */
export type AutonomyLevel = 'constrained' | 'standard' | 'autonomous';

/** Persistent agent identity across tasks. */
export interface AgentIdentityRecord {
  readonly id: string;              // UUID
  readonly operatorId: string;
  readonly model: string;
  readonly autonomyLevel: AutonomyLevel;
  readonly aggregateReputation: number;  // 0.0–1.0, EMA-dampened
  readonly taskCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly lastTaskId: string | null;
  readonly createdAt: string;
  readonly lastActiveAt: string;
  readonly version: number;         // Optimistic concurrency
}

/** Autonomy resource allocation based on level. */
export interface AutonomyResources {
  readonly timeoutMinutes: number;
  readonly maxRetries: number;
  readonly contextTokens: number;
  readonly canSelfModifyPrompt: boolean;
}

/** Event types for sovereignty state machine. */
export type AutonomyEvent =
  | { type: 'TASK_COMPLETED'; taskId: string; outcome: 'merged' | 'ready' }
  | { type: 'TASK_FAILED'; taskId: string; outcome: 'failed' | 'abandoned' }
  | { type: 'REPUTATION_UPDATED'; newScore: number }
  | { type: 'MANUAL_OVERRIDE'; newLevel: AutonomyLevel; reason: string };

/** Invariant identifiers for sovereignty governance. */
export type AutonomyInvariant = 'INV-019' | 'INV-020';
```

### 2.2 Insight Types (`app/src/types/insight.ts`)

```typescript
/** A discoverable insight from a running agent. */
export interface AgentInsight {
  readonly id: string;              // UUID
  readonly sourceTaskId: string;
  readonly sourceAgentId: string;   // AgentIdentityRecord.id
  readonly groupId: string | null;  // Geometry group partition
  readonly content: string;         // Summary of discovery
  readonly keywords: readonly string[];
  readonly relevanceContext: string; // What makes this relevant
  readonly capturedAt: string;
  readonly expiresAt: string;       // TTL based on source task
}

/** Meeting geometry for agent collaboration. */
export type MeetingGeometry = 'factory' | 'jam' | 'study_group';

/** Geometry group for coordinated agents. */
export interface GeometryGroup {
  readonly groupId: string;
  readonly geometry: MeetingGeometry;
  readonly taskIds: readonly string[];
  readonly operatorId: string;
  readonly createdAt: string;
}
```

### 2.3 Circulation Types (`app/src/types/circulation.ts`)

```typescript
/** Dynamic cost breakdown for a spawn request. */
export interface SpawnCost {
  readonly baseCost: number;             // 1.0 (normalized)
  readonly utilizationMultiplier: number;
  readonly reputationDiscount: number;
  readonly complexityFactor: number;
  readonly finalCost: number;            // Product of all factors
  readonly breakdown: string;            // Human-readable explanation
}
```

### 2.4 Extended Fleet Types

Add to existing `app/src/types/fleet.ts`:

```typescript
// New optional fields on SpawnRequest
readonly geometry?: MeetingGeometry;
readonly groupId?: string;

// New optional fields on SpawnResult
readonly agentIdentityId?: string;
readonly autonomyLevel?: AutonomyLevel;
readonly spawnCost?: SpawnCost;

// New optional field on FleetTaskRecord
readonly agentIdentityId?: string;
```

---

## 3. Service Specifications

### 3.1 AgentIdentityService

**File**: `app/src/services/agent-identity-service.ts`
**Responsibility**: CRUD + reputation accumulation for persistent agent identities.

**Methods**:
- `resolveIdentity(operatorId, model)`: Find or create identity for (operator, model) tuple
- `recordTaskOutcome(identityId, taskId, outcome)`: Update reputation, task count, success/failure
- `getHistory(identityId, limit?)`: Return recent task IDs and outcomes
- `getOrNull(identityId)`: Fetch by ID

**Reputation formula** (reuses INV-006 EMA pattern):
```
new_reputation = alpha * task_score + (1 - alpha) * old_reputation
where:
  task_score = 1.0 if merged/ready, 0.3 if failed (learned from), 0.0 if abandoned
  alpha = 0.1 + 0.2 * min(1, task_count / 20)  // Ramp from 0.1 to 0.3
```

**DB table**: `agent_identities` (migration 015)

### 3.2 CollectiveInsightService

**File**: `app/src/services/collective-insight-service.ts`
**Responsibility**: Harvest, store, score, and inject cross-agent insights.

**Methods**:
- `harvest(taskId, worktreePath)`: Extract insights from recent commits and changes
- `addInsight(insight)`: Add to pool, enforce INV-021 bounds
- `getRelevantInsights(taskDescription, groupId?, limit?)`: Score and return relevant insights
- `pruneExpired()`: Remove insights from completed/failed tasks
- `getPoolStats()`: Return count, size, oldest/newest

**Relevance scoring** (keyword overlap):
```
score = |keywords(insight) ∩ keywords(task)| / |keywords(task)|
threshold = 0.2 (at least 20% keyword overlap)
```

**InsightPool**: In-memory Map<string, AgentInsight> backed by `fleet_insights` table.
Max 1000 entries (INV-021), FIFO eviction when exceeded.

### 3.3 SovereigntyEngine

**File**: `app/src/services/sovereignty-engine.ts`
**Responsibility**: Compute autonomy levels and resource allocations.
**Implements**: `GovernedResource<AgentAutonomy, AutonomyEvent, AutonomyInvariant>`

**State type**:
```typescript
interface AgentAutonomy {
  readonly identityId: string;
  readonly level: AutonomyLevel;
  readonly reputation: number;
  readonly taskCount: number;
  readonly resources: AutonomyResources;
}
```

**Level computation** (pure function):
```typescript
function computeAutonomyLevel(reputation: number, taskCount: number): AutonomyLevel {
  if (reputation >= 0.8 && taskCount >= 10) return 'autonomous';
  if (reputation >= 0.6 && taskCount >= 3) return 'standard';
  return 'constrained';
}
```

**Resource allocation** (pure function):
```typescript
const AUTONOMY_RESOURCES: Record<AutonomyLevel, AutonomyResources> = {
  constrained: { timeoutMinutes: 60, maxRetries: 2, contextTokens: 6000, canSelfModifyPrompt: false },
  standard:    { timeoutMinutes: 120, maxRetries: 3, contextTokens: 8000, canSelfModifyPrompt: false },
  autonomous:  { timeoutMinutes: 240, maxRetries: 5, contextTokens: 12000, canSelfModifyPrompt: true },
};
```

**Invariants**:
- INV-019: Identity conservation (task count matches)
- INV-020: Autonomy monotonicity within session (never downgraded mid-task)

### 3.4 CirculationProtocol

**File**: `app/src/services/circulation-protocol.ts`
**Responsibility**: Compute dynamic spawn costs.

**Methods**:
- `computeCost(operatorId, taskType, tier)`: Returns SpawnCost
- `getUtilizationMultiplier()`: Based on fleet capacity ratio
- `getReputationDiscount(operatorId)`: Based on agent identity track records
- `getComplexityFactor(taskType, descriptionLength)`: Estimated complexity

**Utilization curve** (piecewise linear):
```
utilization = active_tasks / total_capacity
if utilization < 0.4:  multiplier = 0.7  (encourage usage)
if 0.4 ≤ util < 0.8:   multiplier = 1.0  (normal)
if 0.8 ≤ util < 0.95:  multiplier = 1.5  (pressure)
if utilization ≥ 0.95:  multiplier = 3.0  (severe pressure)
```

**Floor**: finalCost is always ≥ 0.1 (INV-023).

### 3.5 MeetingGeometryRouter

**File**: `app/src/services/meeting-geometry-router.ts`
**Responsibility**: Select collaboration geometry and manage groups.

**Methods**:
- `resolveGeometry(request)`: Explicit geometry or auto-detect
- `createGroup(geometry, operatorId)`: Create new geometry group
- `addToGroup(groupId, taskId)`: Add task to existing group
- `getGroup(groupId)`: Fetch group details
- `dissolveGroup(groupId)`: Remove group when all tasks complete

**Auto-detection**: When ≥ 2 tasks from same operator with overlapping keywords
are spawned within 5 minutes, suggest `jam` geometry (operator can override).

---

## 4. Database Schema Changes

### 4.1 Migration 015: Agent Ecology

```sql
-- Agent Identities
CREATE TABLE IF NOT EXISTS agent_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id TEXT NOT NULL,
  model TEXT NOT NULL,
  autonomy_level TEXT NOT NULL DEFAULT 'constrained'
    CHECK (autonomy_level IN ('constrained', 'standard', 'autonomous')),
  aggregate_reputation REAL NOT NULL DEFAULT 0.5,
  task_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_task_id UUID REFERENCES fleet_tasks(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_id, model)
);

CREATE INDEX idx_agent_identities_operator ON agent_identities(operator_id);

-- Fleet Insights
CREATE TABLE IF NOT EXISTS fleet_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id UUID NOT NULL REFERENCES fleet_tasks(id) ON DELETE CASCADE,
  source_agent_id UUID REFERENCES agent_identities(id) ON DELETE SET NULL,
  group_id UUID,
  content TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  relevance_context TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_fleet_insights_group ON fleet_insights(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_fleet_insights_expires ON fleet_insights(expires_at);

-- Geometry Groups
CREATE TABLE IF NOT EXISTS geometry_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geometry TEXT NOT NULL CHECK (geometry IN ('factory', 'jam', 'study_group')),
  operator_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dissolved_at TIMESTAMPTZ
);

-- Add agent_identity_id to fleet_tasks
ALTER TABLE fleet_tasks ADD COLUMN IF NOT EXISTS agent_identity_id UUID
  REFERENCES agent_identities(id) ON DELETE SET NULL;

-- Add group_id to fleet_tasks
ALTER TABLE fleet_tasks ADD COLUMN IF NOT EXISTS group_id UUID
  REFERENCES geometry_groups(id) ON DELETE SET NULL;
```

### 4.2 RLS Policies

All new tables inherit tenant isolation:
- `agent_identities`: operator_id scoped
- `fleet_insights`: join through fleet_tasks to operator_id
- `geometry_groups`: operator_id scoped

---

## 5. Extended Services (Modifications)

### 5.1 ConductorEngine.spawn() — Extended Flow

New steps added to existing spawn flow:

```
1. Pre-check (existing)
2. Select model (existing)
3. Resolve agent identity (NEW — AgentIdentityService)
4. Compute autonomy level (NEW — SovereigntyEngine)
5. Compute spawn cost (NEW — CirculationProtocol)
6. Resolve geometry + group (NEW — MeetingGeometryRouter)
7. Build enriched prompt with cross-agent insights (EXTENDED — CollectiveInsightService)
8. Execute saga (existing, with autonomy-derived resources)
9. Link task to identity and group (NEW)
10. Return extended SpawnResult
```

### 5.2 ContextEnrichmentEngine — New Priority Tier

Add `CROSS_AGENT` priority tier between `RELEVANT` and `BACKGROUND`:

```typescript
export type ContextTier = 'CRITICAL' | 'RELEVANT' | 'CROSS_AGENT' | 'BACKGROUND';
```

Priority ordering: CRITICAL (0) > RELEVANT (1) > CROSS_AGENT (2) > BACKGROUND (3).
Token budget allocation: CRITICAL gets unlimited, RELEVANT/CROSS_AGENT share remaining
budget equally, BACKGROUND gets whatever's left.

### 5.3 FleetMonitor.runCycle() — Insight Harvesting

Add insight harvest step after process health check:

```
For each running task:
  1. Check process alive (existing)
  2. Harvest insights from recent commits (NEW)
  3. Check for PR (existing)
  ...
```

### 5.4 RetryEngine — Autonomy-Aware Retry Budget

Consult SovereigntyEngine for autonomy-derived maxRetries instead of fixed config:

```typescript
const identity = await this.identityService.getOrNull(task.agentIdentityId);
const resources = this.sovereignty.getResources(identity);
const effectiveMaxRetries = resources.maxRetries;
```

---

## 6. Invariants

### 6.1 New Invariants (INV-019 through INV-024)

| ID | Category | Severity | Description |
|----|----------|----------|-------------|
| INV-019 | circulation-identity | important | Agent identity conservation — task_count == actual linked tasks |
| INV-020 | circulation-autonomy | important | Autonomy monotonicity — level never decreases within a single task execution |
| INV-021 | circulation-bounded | important | Insight pool bounded — count ≤ max_pool_size with FIFO eviction |
| INV-022 | circulation-bounded | important | Cross-agent injection bounded — at most max_cross_sections per prompt |
| INV-023 | circulation-economics | high | Dynamic cost non-negative — finalCost ≥ floor (0.1) |
| INV-024 | circulation-isolation | high | Geometry group isolation — no cross-group insight leakage |

---

## 7. Testing Strategy

| Layer | Coverage Target | Approach |
|-------|----------------|----------|
| Unit: AgentIdentityService | ≥ 90% | Mock DB, test CRUD + reputation EMA |
| Unit: CollectiveInsightService | ≥ 90% | Mock DB, test harvest + relevance + bounds |
| Unit: SovereigntyEngine | ≥ 95% | Pure functions, exhaustive level/resource tests |
| Unit: CirculationProtocol | ≥ 95% | Pure functions, piecewise curve verification |
| Unit: MeetingGeometryRouter | ≥ 90% | Mock DB, test auto-detect + group lifecycle |
| Integration: invariants | 100% | Cross-service verification for INV-019..024 |
| Integration: ConductorEngine v2 | ≥ 85% | Full spawn flow with all new services |
| Estimated new tests | 90–110 | |
