# Sprint Plan: From Fleet to Collective — Agent Ecology & Governed Sovereignty

**Version**: 13.0.0
**Date**: 2026-02-26
**Cycle**: cycle-013
**PRD**: v13.0.0 | **SDD**: v13.0.0
**Global Sprint Counter Start**: 94

---

## Sprint 1: Agent Identity Foundation

**Global ID**: 94 | **Local ID**: sprint-1
**Goal**: Persistent agent identity — migration 015, AgentIdentityService with EMA-dampened reputation accumulation, and all new type definitions.
**Focus**: FR-1 (Agent Identity Service), FR-6 (INV-019)
**Dependencies**: cycle-012 fleet services (complete)
**Estimated Tests**: 18–22

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-1.1 | **Create agent identity type definitions** | Define `AutonomyLevel`, `AgentIdentityRecord`, `AutonomyResources`, `AutonomyEvent`, `AutonomyInvariant` types per SDD §2.1. All fields `readonly`. Export from barrel. | `app/src/types/agent-identity.ts` |
| T-1.2 | **Create insight and circulation type definitions** | Define `AgentInsight`, `MeetingGeometry`, `GeometryGroup` per SDD §2.2. Define `SpawnCost` per SDD §2.3. Export from barrel. | `app/src/types/insight.ts`, `app/src/types/circulation.ts` |
| T-1.3 | **Extend fleet types with optional ecology fields** | Add optional `geometry?: MeetingGeometry`, `groupId?: string` to `SpawnRequest`. Add optional `agentIdentityId?: string`, `autonomyLevel?: AutonomyLevel`, `spawnCost?: SpawnCost` to `SpawnResult`. Add optional `agentIdentityId?: string` to `FleetTaskRecord`. All new fields optional (NFR-5). | `app/src/types/fleet.ts` |
| T-1.4 | **Create migration 015_agent_ecology.sql** | Three tables: `agent_identities` (with UNIQUE(operator_id, model), CHECK on autonomy_level, version for optimistic concurrency), `fleet_insights` (FK to fleet_tasks with CASCADE, TTL index on expires_at), `geometry_groups` (CHECK on geometry values). ALTER fleet_tasks to add `agent_identity_id` FK and `group_id` FK. Indexes: agent_identities(operator_id), fleet_insights(group_id) partial, fleet_insights(expires_at). Include `015_agent_ecology_down.sql` rollback. Idempotent (IF NOT EXISTS). | `app/src/db/migrations/015_agent_ecology.sql`, `app/src/db/migrations/015_agent_ecology_down.sql` |
| T-1.5 | **Add RLS policies for agent ecology tables** | Enable RLS on `agent_identities`, `fleet_insights`, `geometry_groups`. Policies: agent_identities scoped by operator_id, fleet_insights joins through fleet_tasks for tenant predicate, geometry_groups scoped by operator_id. Admin bypass via `app.is_admin`. | `app/src/db/migrations/015_agent_ecology.sql` |
| T-1.6 | **Implement AgentIdentityService — CRUD** | `resolveIdentity(operatorId, model)`: INSERT ... ON CONFLICT(operator_id, model) DO UPDATE SET last_active_at = NOW() RETURNING *. Creates identity on first spawn, reuses on subsequent. `getOrNull(identityId)`: SELECT by ID, returns null if not found. `getByOperator(operatorId)`: list all identities for operator. All queries parameterized. | `app/src/services/agent-identity-service.ts` |
| T-1.7 | **Implement AgentIdentityService — reputation accumulation** | `recordTaskOutcome(identityId, taskId, outcome)`: (1) Fetch identity, (2) Compute task_score (1.0 for merged/ready, 0.3 for failed, 0.0 for abandoned), (3) EMA update: new_rep = alpha * task_score + (1 - alpha) * old_rep where alpha = 0.1 + 0.2 * min(1, task_count / 20), (4) Increment task_count, success_count or failure_count, (5) Update last_task_id, last_active_at, version with optimistic concurrency. Returns updated record. | `app/src/services/agent-identity-service.ts` |
| T-1.8 | **Implement AgentIdentityService — history** | `getHistory(identityId, limit?)`: Query fleet_tasks WHERE agent_identity_id = $1 ORDER BY created_at DESC LIMIT $2 (default 50). Returns array of {taskId, status, description, completedAt}. | `app/src/services/agent-identity-service.ts` |
| T-1.9 | **Unit tests: AgentIdentityService CRUD** | Test resolveIdentity creates new identity on first call. Test resolveIdentity returns existing identity on second call (same operator + model). Test getOrNull returns null for unknown. Test getByOperator returns all identities. All DB calls mocked. | `app/src/services/__tests__/agent-identity-service.test.ts` |
| T-1.10 | **Unit tests: reputation accumulation** | Test EMA ramp: alpha = 0.1 for first task, increasing toward 0.3 at 20+ tasks. Test merged outcome (score=1.0) increases reputation. Test abandoned outcome (score=0.0) decreases reputation. Test failed outcome (score=0.3) has moderate effect. Test optimistic concurrency guard (stale version throws). Test task_count, success_count, failure_count incremented correctly. Minimum 8 test cases. | `app/src/services/__tests__/agent-identity-service.test.ts` |
| T-1.11 | **Unit tests: history retrieval** | Test getHistory returns tasks in reverse chronological order. Test limit parameter respected. Test empty history returns empty array. | `app/src/services/__tests__/agent-identity-service.test.ts` |
| T-1.12 | **INV-019: Agent identity conservation invariant** | Implement verify function: query COUNT(*) FROM fleet_tasks WHERE agent_identity_id = $1 and compare with identity.task_count. Add to invariants.yaml with verified_in references. Integration test proving conservation holds after recordTaskOutcome. | `app/src/services/__tests__/ecology-invariants.test.ts`, `grimoires/loa/invariants.yaml` |

---

## Sprint 2: Collective Insight Service

**Global ID**: 95 | **Local ID**: sprint-2
**Goal**: Cross-agent insight propagation — InsightPool with harvest, relevance scoring, TTL pruning, and bounded injection into the enrichment pipeline.
**Focus**: FR-2 (Collective Insight Service), FR-6 (INV-021, INV-022)
**Dependencies**: Sprint 1 (types, migration)
**Estimated Tests**: 16–20

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-2.1 | **Implement InsightPool — in-memory store** | In-memory `Map<string, AgentInsight>` with max 1000 entries (INV-021). `add(insight)`: if pool at capacity, evict oldest by capturedAt (FIFO). `get(id)`: return or null. `getAll()`: return array. `remove(id)`: delete entry. `size`: getter for current count. `clear()`: remove all. Thread-safe (single-process, but guard against concurrent async mutations). | `app/src/services/collective-insight-service.ts` |
| T-2.2 | **Implement InsightPool — DB persistence** | `persist(insight)`: INSERT into fleet_insights. `loadFromDb(limit?)`: SELECT with ORDER BY captured_at DESC LIMIT 1000. `pruneExpiredFromDb()`: DELETE FROM fleet_insights WHERE expires_at < NOW(). Called during service startup to restore pool state. | `app/src/services/collective-insight-service.ts` |
| T-2.3 | **Implement CollectiveInsightService — harvest** | `harvest(taskId, worktreePath)`: (1) Run `git -C <path> log --oneline -5 --format='%s'` via execFile to get recent commit messages. (2) Extract keywords from commit messages (split on spaces, filter stopwords, lowercase). (3) Build insight content from commit summaries. (4) Set expiresAt to task completion or 4 hours (whichever first). (5) Add to pool via InsightPool.add(). (6) Return the created insight. Handle git failures gracefully (return null). | `app/src/services/collective-insight-service.ts` |
| T-2.4 | **Implement CollectiveInsightService — relevance scoring** | `getRelevantInsights(taskDescription, groupId?, limit?)`: (1) Extract keywords from task description. (2) For each insight in pool (optionally filtered by groupId): compute relevance = |keywords(insight) ∩ keywords(task)| / max(|keywords(task)|, 1). (3) Filter by threshold (0.2). (4) Sort by relevance DESC. (5) Return top N (default 3, INV-022 max 5). | `app/src/services/collective-insight-service.ts` |
| T-2.5 | **Implement CollectiveInsightService — pruning** | `pruneExpired()`: Remove all insights where source task has reached terminal status OR expiresAt < now. Called by FleetMonitor at end of each cycle. Also prune from DB. `pruneByTask(taskId)`: Remove all insights from specific task (called on task completion). | `app/src/services/collective-insight-service.ts` |
| T-2.6 | **Implement CollectiveInsightService — pool stats** | `getPoolStats()`: Returns `{ count, totalSizeBytes, oldestCapturedAt, newestCapturedAt, byGroup: Map<string, number> }`. Used for monitoring and INV-021 verification. | `app/src/services/collective-insight-service.ts` |
| T-2.7 | **Extend ContextEnrichmentEngine with CROSS_AGENT tier** | Add `'CROSS_AGENT'` to `ContextTier` union. Update priority mapping: CRITICAL=0, RELEVANT=1, CROSS_AGENT=2, BACKGROUND=3. Update `buildPrompt()` to accept CROSS_AGENT sections. Token budget: CROSS_AGENT shares budget pool with RELEVANT (after CRITICAL allocated). Update `createSection()` to accept CROSS_AGENT tier. | `app/src/services/context-enrichment-engine.ts` |
| T-2.8 | **Unit tests: InsightPool bounds** | Test pool at max capacity evicts oldest on add. Test pool never exceeds 1000 entries. Test FIFO ordering (oldest evicted first). Test remove reduces count. Test clear empties pool. | `app/src/services/__tests__/collective-insight-service.test.ts` |
| T-2.9 | **Unit tests: harvest** | Test successful harvest from git commits. Test keyword extraction (stopword removal, lowercase). Test TTL set correctly. Test git failure returns null gracefully. | `app/src/services/__tests__/collective-insight-service.test.ts` |
| T-2.10 | **Unit tests: relevance scoring** | Test perfect keyword match returns 1.0. Test partial match returns proportional score. Test below-threshold insights filtered out. Test limit parameter respected. Test groupId filtering. Test empty pool returns empty array. | `app/src/services/__tests__/collective-insight-service.test.ts` |
| T-2.11 | **Unit tests: pruning** | Test expired insights removed. Test completed task insights removed. Test non-expired insights preserved. Test DB pruning called. | `app/src/services/__tests__/collective-insight-service.test.ts` |
| T-2.12 | **Unit tests: CROSS_AGENT tier in enrichment** | Test CROSS_AGENT sections included between RELEVANT and BACKGROUND. Test CROSS_AGENT sections omitted when token budget exceeded. Test priority ordering preserved. | `app/src/services/__tests__/context-enrichment-engine.test.ts` |
| T-2.13 | **INV-021 + INV-022: Bounded pool and injection invariants** | INV-021: verify pool.size <= MAX_POOL_SIZE after every add operation. INV-022: verify cross-agent sections in any enriched prompt ≤ MAX_CROSS_SECTIONS (5). Add to invariants.yaml with verified_in references. Integration tests proving bounds hold under stress (add 2000 insights, verify capped at 1000; build prompt with 10 cross-agent sections, verify only 5 injected). | `app/src/services/__tests__/ecology-invariants.test.ts`, `grimoires/loa/invariants.yaml` |

---

## Sprint 3: Sovereignty Engine

**Global ID**: 96 | **Local ID**: sprint-3
**Goal**: Reputation-driven autonomy levels via GovernedResource<AgentAutonomy> — pure computation of levels, resource allocation, governance transitions, and audit trail.
**Focus**: FR-3 (Sovereignty Engine), FR-6 (INV-020)
**Dependencies**: Sprint 1 (AgentIdentityService, types)
**Estimated Tests**: 14–18

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-3.1 | **Implement computeAutonomyLevel() pure function** | Pure function: `computeAutonomyLevel(reputation: number, taskCount: number): AutonomyLevel`. Returns `'autonomous'` if reputation ≥ 0.8 AND taskCount ≥ 10, `'standard'` if reputation ≥ 0.6 AND taskCount ≥ 3, `'constrained'` otherwise. Exported for direct testing. | `app/src/services/sovereignty-engine.ts` |
| T-3.2 | **Implement AUTONOMY_RESOURCES constant** | Exported `Record<AutonomyLevel, AutonomyResources>` with: constrained={timeout:60, retries:2, tokens:6000, selfModify:false}, standard={timeout:120, retries:3, tokens:8000, selfModify:false}, autonomous={timeout:240, retries:5, tokens:12000, selfModify:true}. Frozen with `as const`. | `app/src/services/sovereignty-engine.ts` |
| T-3.3 | **Implement SovereigntyEngine — GovernedResource<AgentAutonomy>** | Class implements `GovernedResource<AgentAutonomy, AutonomyEvent, AutonomyInvariant>`. State: `{ identityId, level, reputation, taskCount, resources }`. Transition events: TASK_COMPLETED triggers level recomputation. TASK_FAILED triggers level recomputation. REPUTATION_UPDATED triggers level recomputation. MANUAL_OVERRIDE sets level directly (admin). Version monotonically increases. All transitions recorded in mutationLog with actorId. | `app/src/services/sovereignty-engine.ts` |
| T-3.4 | **Implement SovereigntyEngine.verify() for INV-019, INV-020** | INV-019 (identity conservation): queries AgentIdentityService to verify task_count matches actual linked tasks. INV-020 (autonomy monotonicity): within a session (since last TASK_COMPLETED event), level must be ≥ previous level. verifyAll() checks both. | `app/src/services/sovereignty-engine.ts` |
| T-3.5 | **Implement SovereigntyEngine.getResources()** | `getResources(identity: AgentIdentityRecord | null): AutonomyResources`. If identity is null (first-time agent), return constrained resources. Otherwise compute level from identity's reputation and taskCount, return corresponding resources. Pure function, no DB access. | `app/src/services/sovereignty-engine.ts` |
| T-3.6 | **Implement SovereigntyEngine — level transition notification** | When a level transition occurs (constrained→standard, standard→autonomous, or downgrade on outcome), emit `AUTONOMY_LEVEL_CHANGED` event via CrossGovernorEventBus with identityId, oldLevel, newLevel, reputation, taskCount. | `app/src/services/sovereignty-engine.ts` |
| T-3.7 | **Unit tests: computeAutonomyLevel** | Test all boundary conditions: reputation=0.79 + tasks=10 → constrained. reputation=0.8 + tasks=9 → standard (if rep≥0.6, tasks≥3). reputation=0.8 + tasks=10 → autonomous. reputation=0.6 + tasks=3 → standard. reputation=0.59 + tasks=100 → constrained. reputation=0.0 → constrained. reputation=1.0 + tasks=1 → constrained. Minimum 10 test cases. | `app/src/services/__tests__/sovereignty-engine.test.ts` |
| T-3.8 | **Unit tests: AUTONOMY_RESOURCES** | Test constrained resources have lower limits than standard. Test standard lower than autonomous. Test autonomous has canSelfModifyPrompt=true. Test all three levels have non-zero values. | `app/src/services/__tests__/sovereignty-engine.test.ts` |
| T-3.9 | **Unit tests: GovernedResource transitions** | Test TASK_COMPLETED with good outcome upgrades level when thresholds crossed. Test TASK_FAILED with abandoned outcome downgrades level. Test REPUTATION_UPDATED recomputes level. Test MANUAL_OVERRIDE sets arbitrary level. Test version increments on each transition. Test mutationLog records all transitions. | `app/src/services/__tests__/sovereignty-engine.test.ts` |
| T-3.10 | **Unit tests: INV-019 and INV-020 verification** | Test INV-019 satisfied when counts match. Test INV-019 violated when task_count diverges from actual. Test INV-020 satisfied within session (level stable or increasing). Test INV-020 violation detected (level decreased without TASK_COMPLETED boundary). | `app/src/services/__tests__/sovereignty-engine.test.ts` |
| T-3.11 | **INV-020: Autonomy monotonicity invariant** | Add INV-020 to invariants.yaml with full verified_in references. Integration test: spawn agent at constrained, record successful tasks until standard, verify no intermediate downgrades within session. | `app/src/services/__tests__/ecology-invariants.test.ts`, `grimoires/loa/invariants.yaml` |

---

## Sprint 4: Circulation Protocol

**Global ID**: 97 | **Local ID**: sprint-4
**Goal**: Dynamic admission economics — utilization-aware spawn costs, reputation discounts, complexity estimation, and cost floor enforcement (INV-023).
**Focus**: FR-4 (Circulation Protocol), FR-6 (INV-023)
**Dependencies**: Sprint 1 (AgentIdentityService), Sprint 3 (SovereigntyEngine)
**Estimated Tests**: 14–16

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-4.1 | **Implement CirculationProtocol — utilization multiplier** | `getUtilizationMultiplier()`: Query active task count and total fleet capacity (sum of all tier limits for all operators). Compute utilization = active / total. Piecewise: <0.4→0.7, 0.4-0.8→1.0, 0.8-0.95→1.5, ≥0.95→3.0. Returns { multiplier, utilization, capacityUsed, capacityTotal }. If total capacity is 0, return multiplier=1.0 (no fleet). | `app/src/services/circulation-protocol.ts` |
| T-4.2 | **Implement CirculationProtocol — reputation discount** | `getReputationDiscount(operatorId)`: Query all agent identities for operator. Compute average reputation across identities. Discount = max(0.5, 1.0 - averageReputation * 0.4). So reputation=1.0 gets 0.6x cost, reputation=0.0 gets 1.0x cost. If no identities, return 1.0 (no discount). | `app/src/services/circulation-protocol.ts` |
| T-4.3 | **Implement CirculationProtocol — complexity factor** | `getComplexityFactor(taskType, descriptionLength)`: Base complexity by task type: bug_fix=0.8, refactor=0.9, docs=0.7, feature=1.0, review=0.6. Length adjustment: if description > 500 chars, add 0.2. If > 1000 chars, add 0.4. Cap at 1.5. Returns { factor, taskTypeBase, lengthAdjustment }. | `app/src/services/circulation-protocol.ts` |
| T-4.4 | **Implement CirculationProtocol.computeCost()** | `computeCost(operatorId, taskType, descriptionLength, tier)`: (1) Get utilization multiplier. (2) Get reputation discount. (3) Get complexity factor. (4) finalCost = baseCost(1.0) * utilization * reputationDiscount * complexity. (5) Apply floor: max(0.1, finalCost) (INV-023). (6) Return SpawnCost with full breakdown string. Pure composition of the three sub-functions. | `app/src/services/circulation-protocol.ts` |
| T-4.5 | **Implement CirculationProtocol — config** | `CirculationProtocolConfig` with: baseCost (default 1.0), costFloor (default 0.1), utilizationThresholds (configurable breakpoints), complexityBases (configurable per task type), reputationWeight (default 0.4). Constructor applies defaults via nullish coalescing. | `app/src/services/circulation-protocol.ts` |
| T-4.6 | **Unit tests: utilization multiplier** | Test empty fleet (0/0) returns 1.0. Test low utilization (20%) returns 0.7. Test normal utilization (50%) returns 1.0. Test high utilization (85%) returns 1.5. Test extreme utilization (98%) returns 3.0. Test boundary values (exactly 0.4, 0.8, 0.95). | `app/src/services/__tests__/circulation-protocol.test.ts` |
| T-4.7 | **Unit tests: reputation discount** | Test no identities returns 1.0. Test perfect reputation (1.0) returns 0.6. Test zero reputation returns 1.0. Test average reputation (0.5) returns 0.8. Test multiple identities averaged correctly. Test floor at 0.5 (even negative reputation can't make discount > 0.5). | `app/src/services/__tests__/circulation-protocol.test.ts` |
| T-4.8 | **Unit tests: complexity factor** | Test each task type returns correct base. Test short description adds nothing. Test medium description (>500 chars) adds 0.2. Test long description (>1000 chars) adds 0.4. Test cap at 1.5. | `app/src/services/__tests__/circulation-protocol.test.ts` |
| T-4.9 | **Unit tests: computeCost end-to-end** | Test nominal case (normal utilization, avg reputation, standard feature) returns ~1.0. Test best case (low util, high rep, simple docs) returns close to floor. Test worst case (high util, no rep, complex feature) returns high cost. Test floor enforcement: even in best case, cost ≥ 0.1. Test breakdown string contains all components. | `app/src/services/__tests__/circulation-protocol.test.ts` |
| T-4.10 | **INV-023: Dynamic cost non-negative invariant** | Implement verification: for any computeCost() call, assert result.finalCost ≥ config.costFloor. Add to invariants.yaml with verified_in references. Property-based test: randomize all inputs (utilization 0-1, reputation 0-1, all task types, description lengths 0-2000), verify cost ≥ floor for every combination. | `app/src/services/__tests__/ecology-invariants.test.ts`, `grimoires/loa/invariants.yaml` |

---

## Sprint 5: Meeting Geometry Router

**Global ID**: 98 | **Local ID**: sprint-5
**Goal**: Context-aware collaboration patterns — factory, jam, and study group geometries with group lifecycle management and geometry-scoped insight partitioning (INV-024).
**Focus**: FR-5 (Meeting Geometry Router), FR-6 (INV-024)
**Dependencies**: Sprint 2 (CollectiveInsightService), Sprint 1 (migration)
**Estimated Tests**: 12–16

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-5.1 | **Implement MeetingGeometryRouter — geometry resolution** | `resolveGeometry(request: SpawnRequest)`: (1) If request.geometry is explicit, validate and return. (2) If request.groupId is set, lookup group and return its geometry. (3) Default: return 'factory'. Validation: reject unknown geometry values. | `app/src/services/meeting-geometry-router.ts` |
| T-5.2 | **Implement MeetingGeometryRouter — group lifecycle** | `createGroup(geometry, operatorId)`: INSERT into geometry_groups, return group. `addToGroup(groupId, taskId)`: UPDATE fleet_tasks SET group_id = $1 WHERE id = $2. `getGroup(groupId)`: SELECT group with COUNT of tasks. `dissolveGroup(groupId)`: UPDATE geometry_groups SET dissolved_at = NOW(). Auto-dissolve: when last task in group reaches terminal status, dissolve group. | `app/src/services/meeting-geometry-router.ts` |
| T-5.3 | **Implement MeetingGeometryRouter — auto-detection** | `detectGeometry(operatorId, taskDescription)`: (1) Query recent spawn requests from same operator in last 5 minutes. (2) Extract keywords from current and recent task descriptions. (3) If ≥ 2 recent tasks with ≥ 30% keyword overlap, suggest 'jam' and return existing or new group. (4) Otherwise return 'factory' with no group. Returns `{ geometry, groupId?, autoDetected }`. | `app/src/services/meeting-geometry-router.ts` |
| T-5.4 | **Implement geometry-scoped insight partitioning** | CollectiveInsightService.getRelevantInsights() respects groupId: when groupId is provided, only return insights from the same group. When groupId is null (factory geometry), return insights from all unpartitioned agents. This enforces INV-024 (geometry group isolation). | `app/src/services/collective-insight-service.ts` |
| T-5.5 | **Unit tests: geometry resolution** | Test explicit geometry returned as-is. Test groupId lookup returns group's geometry. Test default returns 'factory'. Test invalid geometry rejected. | `app/src/services/__tests__/meeting-geometry-router.test.ts` |
| T-5.6 | **Unit tests: group lifecycle** | Test createGroup inserts and returns. Test addToGroup updates task record. Test getGroup returns group with task count. Test dissolveGroup sets dissolved_at. Test auto-dissolve on last task completion. | `app/src/services/__tests__/meeting-geometry-router.test.ts` |
| T-5.7 | **Unit tests: auto-detection** | Test no recent tasks returns factory. Test recent tasks with overlap suggests jam. Test recent tasks without overlap returns factory. Test 5-minute window respected (older tasks ignored). Test keyword overlap threshold (30%). | `app/src/services/__tests__/meeting-geometry-router.test.ts` |
| T-5.8 | **Unit tests: geometry-scoped insight partitioning** | Test jam group only receives insights from same group. Test factory agents receive all unpartitioned insights. Test different jam groups isolated from each other. | `app/src/services/__tests__/collective-insight-service.test.ts` |
| T-5.9 | **INV-024: Geometry group isolation invariant** | Verify: for any two agents in different groups, their insight sets have zero intersection. Add to invariants.yaml with verified_in references. Integration test: create two jam groups, add insights to each, verify cross-group query returns empty. | `app/src/services/__tests__/ecology-invariants.test.ts`, `grimoires/loa/invariants.yaml` |

---

## Sprint 6: Conductor Engine v2 — Integration

**Global ID**: 99 | **Local ID**: sprint-6
**Goal**: Wire all new services into ConductorEngine.spawn(), extend FleetMonitor with insight harvesting, extend RetryEngine with autonomy-aware budgets, and register SovereigntyEngine with GovernorRegistry.
**Focus**: SDD §5 (Extended Services)
**Dependencies**: Sprints 1–5 (all new services)
**Estimated Tests**: 16–20

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-6.1 | **Extend ConductorEngine constructor** | Add new dependencies: `identityService: AgentIdentityService`, `sovereignty: SovereigntyEngine`, `circulation: CirculationProtocol`, `insightService: CollectiveInsightService`, `geometryRouter: MeetingGeometryRouter`. All optional with graceful degradation — if any new service is null/undefined, skip the corresponding step and use defaults. | `app/src/services/conductor-engine.ts` |
| T-6.2 | **Extend ConductorEngine.spawn() — identity resolution** | After model selection (step 2), resolve agent identity via `identityService.resolveIdentity(operatorId, model)`. Pass identity to sovereignty engine. Store identityId for later linking. If identityService unavailable, skip (use null identity). | `app/src/services/conductor-engine.ts` |
| T-6.3 | **Extend ConductorEngine.spawn() — sovereignty and cost** | After identity resolution: (1) `sovereignty.getResources(identity)` to get autonomy-derived resource limits. (2) `circulation.computeCost(operatorId, taskType, description.length, tier)` to get spawn cost. (3) Pass autonomy resources to saga (override maxRetries, timeout from resources). If sovereignty/circulation unavailable, use existing defaults. | `app/src/services/conductor-engine.ts` |
| T-6.4 | **Extend ConductorEngine.spawn() — geometry and insights** | After enrichment prompt building: (1) `geometryRouter.resolveGeometry(request)` or auto-detect. (2) If geometry is jam or study_group, create/join group. (3) `insightService.getRelevantInsights(description, groupId)` to get cross-agent insights. (4) Add insights as CROSS_AGENT sections to enrichment. If geometry/insight services unavailable, skip. | `app/src/services/conductor-engine.ts` |
| T-6.5 | **Extend ConductorEngine.spawn() — result enrichment** | After saga completes: (1) Link task to identity: `UPDATE fleet_tasks SET agent_identity_id = $1 WHERE id = $2`. (2) Link task to group if applicable. (3) Return extended SpawnResult with agentIdentityId, autonomyLevel, spawnCost. | `app/src/services/conductor-engine.ts` |
| T-6.6 | **Extend FleetMonitor.runCycle() — insight harvesting** | After process health check for each running task: if task has worktreePath and insightService is available, call `insightService.harvest(taskId, worktreePath)`. At end of cycle: call `insightService.pruneExpired()`. Errors in harvesting are non-fatal (logged, cycle continues). | `app/src/services/fleet-monitor.ts` |
| T-6.7 | **Extend FleetMonitor — identity outcome recording** | When a task reaches terminal status (merged, failed, abandoned): look up task.agentIdentityId, if present call `identityService.recordTaskOutcome(identityId, taskId, outcome)`. This closes the reputation feedback loop. Errors non-fatal. | `app/src/services/fleet-monitor.ts` |
| T-6.8 | **Extend RetryEngine — autonomy-aware retry budget** | In `attemptRetry()`, after loading task: if task.agentIdentityId, lookup identity and compute autonomy resources. Use `resources.maxRetries` instead of config.maxRetries. Use `resources.contextTokens` for enrichment budget. If identity service unavailable, fall back to config defaults. | `app/src/services/retry-engine.ts` |
| T-6.9 | **Register SovereigntyEngine with GovernorRegistry** | In server startup, register SovereigntyEngine as a governed resource with GovernorRegistry. Verify it appears in `governorRegistry.verifyAllResources()` health check. This extends the three-witness quorum (INV-012) to four witnesses. | `app/src/services/sovereignty-engine.ts` |
| T-6.10 | **Unit tests: extended ConductorEngine.spawn()** | Test full spawn flow with all new services wired. Test identity resolved and linked. Test autonomy resources applied. Test spawn cost computed and returned. Test cross-agent insights injected. Test geometry resolved. Test graceful degradation when new services are null. Minimum 8 tests covering happy path and degradation. | `app/src/services/__tests__/conductor-engine.test.ts` |
| T-6.11 | **Unit tests: FleetMonitor insight harvesting** | Test harvest called for running tasks with worktreePath. Test harvest skipped for tasks without worktreePath. Test harvest error doesn't crash cycle. Test pruneExpired called at end of cycle. | `app/src/services/__tests__/fleet-monitor.test.ts` |
| T-6.12 | **Unit tests: FleetMonitor identity outcome recording** | Test outcome recorded on task completion (merged). Test outcome recorded on task failure. Test missing identityId skipped gracefully. Test identity service error doesn't crash monitor. | `app/src/services/__tests__/fleet-monitor.test.ts` |
| T-6.13 | **Unit tests: RetryEngine autonomy-aware budget** | Test autonomous agent gets 5 retries instead of default 3. Test constrained agent gets 2 retries. Test missing identity falls back to config. | `app/src/services/__tests__/retry-engine.test.ts` |

---

## Sprint 7: Invariant Suite + Hardening + E2E

**Global ID**: 100 | **Local ID**: sprint-7
**Goal**: Complete invariant integration tests for INV-019 through INV-024, cross-service stress tests, update invariants.yaml with full verified_in references, and ensure backward compatibility.
**Focus**: FR-6 (all circulation invariants), NFR-1 through NFR-6, hardening
**Dependencies**: Sprints 1–6 (all services integrated)
**Estimated Tests**: 14–18

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-7.1 | **Integration test: full spawn flow with ecology** | End-to-end test: create operator with builder tier, spawn first task (should create identity at constrained level), verify identity linked, verify constrained resources applied, verify spawn cost computed. All services wired with mocked DB. | `app/tests/integration/ecology-e2e.test.ts` |
| T-7.2 | **Integration test: reputation accumulation over multiple tasks** | Spawn 5 tasks sequentially. First 3 succeed (merged). Fourth fails. Fifth succeeds. Verify: reputation increases with successes, decreases with failure, EMA alpha ramps over time, autonomy level transitions from constrained → standard after threshold crossed. | `app/tests/integration/ecology-e2e.test.ts` |
| T-7.3 | **Integration test: cross-agent insight propagation** | Spawn two tasks in jam geometry. Agent A harvests insight. Agent B's enrichment includes Agent A's insight as CROSS_AGENT section. Verify insight content appears in B's prompt. Verify agent in different group does NOT receive A's insight (INV-024). | `app/tests/integration/ecology-e2e.test.ts` |
| T-7.4 | **Integration test: INV-019 through INV-024 verification** | For each invariant, test both satisfied and violated states. INV-019: manipulate task_count, verify violation detected. INV-020: force downgrade mid-session, verify detected. INV-021: add 1001 insights, verify capped at 1000. INV-022: inject 6 cross-agent sections, verify only 5 in prompt. INV-023: set all cost factors to minimum, verify cost ≥ floor. INV-024: cross-group query returns empty. | `app/tests/integration/ecology-invariants-e2e.test.ts` |
| T-7.5 | **Update invariants.yaml with INV-019 through INV-024** | Complete entries for all 6 new invariants with full verified_in references pointing to unit tests and integration tests. Follow existing format (id, description, severity, category, properties, verified_in with repo/file/symbol/note). | `grimoires/loa/invariants.yaml` |
| T-7.6 | **Stress test: InsightPool under load** | Add 5000 insights rapidly. Verify pool never exceeds 1000 (INV-021). Verify eviction is FIFO. Verify relevance scoring performance < 50ms for 1000 insights. Verify prune correctly removes expired. | `app/tests/integration/ecology-stress.test.ts` |
| T-7.7 | **Stress test: CirculationProtocol with randomized inputs** | Property-based test: 1000 random combinations of utilization (0–1), reputation (0–1), task types, description lengths. For every combination: assert finalCost ≥ floor (INV-023), assert all sub-components non-negative, assert breakdown string non-empty. | `app/tests/integration/ecology-stress.test.ts` |
| T-7.8 | **Backward compatibility verification** | Verify existing fleet API tests still pass unchanged. Verify SpawnRequest without new optional fields works identically to cycle-012 behavior. Verify ConductorEngine with null new services degrades to cycle-012 behavior. Run full existing test suite — 0 regressions. | `app/src/services/__tests__/conductor-engine.test.ts` |
| T-7.9 | **Migration 015 integration test** | Test migration 015 runs cleanly on fresh PG (after 013, 014). Verify all CHECK constraints reject invalid data. Verify FK relationships work (agent_identity_id, group_id on fleet_tasks). Verify indexes exist. Verify RLS policies enforce tenant isolation. Test rollback migration drops tables cleanly. | `app/tests/integration/migration-015.test.ts` |
| T-7.10 | **Register four-witness quorum** | With SovereigntyEngine registered, verify GovernorRegistry now has ≥ 4 governed resources. Update INV-012 (three-witness quorum) comment to note the fourth witness. Verify `verifyAllResources()` includes sovereignty engine health. | `app/tests/integration/governance-four-witness.test.ts` |
| T-7.11 | **ADR: From Fleet to Collective** | Write ADR documenting the architectural decisions in this cycle: why persistent identity, why insightpool over direct messaging, why three meeting geometries, why governed sovereignty over pure sovereignty. Include references to Conway Automaton, Ostrom's principles, and the Bridgebuilder Part III review. | `grimoires/loa/context/adr-fleet-to-collective.md` |
