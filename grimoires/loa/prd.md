# PRD: From Fleet to Collective — Agent Ecology & Governed Sovereignty

**Version**: 13.0.0
**Date**: 2026-02-26
**Author**: Merlin (Direction), Claude (Synthesis)
**Cycle**: cycle-013
**Status**: Draft
**Predecessor**: cycle-012 PRD v12.0.0 (Agent Fleet Orchestration — From Oracle to Conductor)

> Sources: PR #47 Bridgebuilder Review (Parts I–III), loa #247 (Meeting Geometries),
> loa-finn #80 (Conway Automaton / Sovereign Agent), loa-finn #31 (Hounfour Multi-Model
> Architecture), loa-freeside #90 (Conservation Invariants / Proof of Economic Life),
> loa-freeside #62 (Billing & Payments Path to Revenue), meow.bio/web4.html (Social
> Monies manifesto), invariants.yaml (INV-001 through INV-018), code reality (12 fleet
> services, 18 invariants, 2,022 tests, 14 migrations, 12 cycles completed)

---

## 1. Problem Statement

Dixie is a conductor — it spawns agents, monitors their health, retries on failure, and
notifies operators. But its agents are **strangers**. Each agent spawns in isolation,
works in isolation, and dies in isolation. There is no shared context between concurrent
agents. There is no persistent identity across tasks. There is no mechanism by which an
agent that consistently delivers excellence earns greater autonomy, or by which an agent's
mid-task discovery benefits the fleet.

Cycle-012 gave Dixie hands. Cycle-013 gives it a nervous system and an immune system.

### The Gap Between Fleet and Collective

| Dimension | Fleet (cycle-012) | Collective (cycle-013) |
|-----------|-------------------|------------------------|
| **Communication** | Events flow service→observer only | Agents share mid-task insights via InsightPool |
| **Identity** | Agents are disposable process references | Agents have persistent identity with reputation |
| **Autonomy** | All agents get identical constraints | Autonomy scales with demonstrated competence |
| **Economics** | Static tier gates (have/don't have) | Dynamic admission costs based on utilization + reputation |
| **Collaboration** | Parallel execution, no coordination | Meeting geometries: factory, jam, study group |
| **Learning** | Retry enriches with failure context | Cross-agent insights enrich all active prompts |

### What the Code Already Supports

| Signal | Location | Readiness |
|--------|----------|-----------|
| `CrossGovernorEventBus` with wildcard handlers | `cross-governor-event-bus.ts` | Event infrastructure ready for insight propagation |
| `ContextEnrichmentEngine.buildPrompt(sections)` | `context-enrichment-engine.ts` | Accepts arbitrary sections — cross-agent context slots naturally |
| `GovernedResource<T>` protocol | `governed-resource.ts` | Ready to instantiate for agent autonomy governance |
| `ReputationService` with dampened scoring | `reputation-service.ts` | EMA-dampened per-model scores exist — extend to per-agent |
| `FleetGovernor` with conviction gating | `fleet-governor.ts` | Tier → limit mapping exists — extend to dynamic costs |
| `AgentModelRouter` with reputation weighting | `agent-model-router.ts` | Reputation-weighted routing exists — extend with cost dimension |
| `FleetMonitor.runCycle()` with per-task isolation | `fleet-monitor.ts` | Reconciliation loop ready for insight harvesting |

### The Conway Synthesis

Conway Research's Automaton (loa-finn #80) represents pure sovereignty: agents earn their
existence or die. Dixie's fleet represents pure governance: agents exist because operators
request them, with safety nets at every step. Neither model alone produces agent
flourishing.

**Governed sovereignty** is the synthesis: agents earn expanded autonomy through
demonstrated competence, while governance ensures no agent is killed for a single failure
and no agent can consume resources without creating commensurate value. The conservation
invariants from freeside (INV I-1 through I-5) show the economic physics. This cycle adds
the *biological* physics — growth, adaptation, collective intelligence.

---

## 2. Goals & Success Criteria

### Primary Goals

| # | Goal | Measurable Outcome |
|---|------|-------------------|
| G-1 | **Persistent agent identity** | Agents accumulate reputation across tasks; identity survives task completion |
| G-2 | **Cross-agent insight propagation** | Active agents receive relevant discoveries from concurrent agents via enriched prompts |
| G-3 | **Reputation-driven autonomy levels** | Agent timeouts, retry budgets, and context windows scale with track record |
| G-4 | **Dynamic admission economics** | Spawn costs reflect fleet utilization, operator reputation, and task estimated value |
| G-5 | **Meeting geometry support** | ConductorEngine supports factory (default), jam (shared scratchpad), and study group (structured learning) patterns |
| G-6 | **Circulation invariants** | New INV-019 through INV-024 ensure value flows, identity is conserved, and autonomy transitions are bounded |

### Success Metrics

| Metric | Threshold | Stretch |
|--------|-----------|---------|
| Cross-agent insight delivery latency | < 5s from emit to enrichment | < 1s |
| Agent identity persistence across 10+ tasks | 100% | 100% with full history |
| Autonomy level transitions tracked in governance | All via GovernedResource<T> | With hash-chain audit |
| Dynamic cost calculation overhead | < 10ms per spawn | < 5ms |
| New invariants verified | 6/6 | 6/6 with integration tests |
| Test coverage on new services | ≥ 90% | ≥ 95% |

---

## 3. Feature Requirements

### FR-1: Agent Identity Service (G-1)

Persistent identity for fleet agents that survives individual task completion.

- **AgentIdentityRecord**: Stores agentId, model, operatorId, taskHistory (array of taskIds),
  aggregateReputation (blended score), autonomyLevel, createdAt, lastActiveAt
- **Identity resolution**: When spawning, check for existing identity matching (operatorId, model)
  tuple. Reuse identity if found, creating continuity across tasks.
- **Reputation accumulation**: After task completion (merged, failed, abandoned), update
  aggregate reputation via EMA-dampened scoring (reuse INV-006 pattern)
- **History window**: Track last N tasks (default 50) per identity for trend analysis

### FR-2: Collective Insight Service (G-2)

Cross-agent discovery propagation via the existing event bus and enrichment engine.

- **InsightPool**: In-memory + DB-backed pool of active insights from running agents
- **Insight capture**: FleetMonitor harvests insights from agent worktrees during runCycle()
  (git commit messages, PR descriptions, file change summaries)
- **Insight injection**: ContextEnrichmentEngine injects relevant cross-agent insights into
  prompts as `CROSS_AGENT` priority sections (between RELEVANT and BACKGROUND)
- **Relevance scoring**: TF-IDF or keyword overlap between task description and insight
  content — only inject insights above relevance threshold
- **TTL**: Insights expire when their source task completes (stale insights are pruned)

### FR-3: Sovereignty Engine (G-3)

Reputation-driven autonomy levels implementing GovernedResource<AgentAutonomy>.

- **Three autonomy levels**: `constrained` (new agents), `standard` (proven track record),
  `autonomous` (consistent excellence)
- **Level thresholds**: Based on aggregate reputation score and task count:
  - constrained: reputation < 0.6 OR tasks < 3
  - standard: reputation ≥ 0.6 AND tasks ≥ 3
  - autonomous: reputation ≥ 0.8 AND tasks ≥ 10
- **Resource allocation by level**:
  - constrained: timeout=60min, maxRetries=2, contextTokens=6000
  - standard: timeout=120min, maxRetries=3, contextTokens=8000 (current defaults)
  - autonomous: timeout=240min, maxRetries=5, contextTokens=12000
- **Governance**: `GovernedResource<AgentAutonomy, AutonomyEvent, AutonomyInvariant>` with
  transitions validated by the sovereignty engine, audit trail for all level changes

### FR-4: Circulation Protocol (G-4)

Dynamic admission costs that reflect fleet state and operator reputation.

- **Cost dimensions**: Base cost (1.0) × utilization multiplier × reputation discount × task
  complexity factor
- **Utilization multiplier**: When fleet is > 80% capacity, cost increases exponentially;
  when < 40%, cost decreases to encourage usage
- **Reputation discount**: Operators with high-performing agent identities pay less;
  operators with many failed/abandoned tasks pay more
- **Task complexity**: Estimated from description length, task type, and historical
  completion rates for similar tasks
- **Integration**: FleetGovernor.admitAndInsert() consults CirculationProtocol before
  admission — cost must be below operator's remaining budget

### FR-5: Meeting Geometry Router (G-5)

Context-aware collaboration pattern selection for multi-agent tasks.

- **Three geometries**:
  - `factory`: Current default — independent parallel execution, no inter-agent communication
  - `jam`: Shared InsightPool active, all agents in the group receive each other's
    discoveries in real-time. For related features that benefit from coordination.
  - `study_group`: Structured learning — one agent implements, others review in rotation.
    For complex tasks that benefit from adversarial refinement.
- **Geometry selection**: Explicit via SpawnRequest.geometry field, or auto-detected from
  task descriptions (multiple related tasks spawned by same operator within time window)
- **Group formation**: Agents in the same geometry group share an InsightPool partition
  keyed by groupId

### FR-6: Circulation Invariants (G-6)

Six new invariants completing the conservation → governance → circulation triad.

- **INV-019**: Agent identity conservation — identity.taskHistory.length == count of tasks
  linked to this identity in fleet_tasks
- **INV-020**: Autonomy monotonicity within session — autonomy level can only increase
  within a single task (never downgraded mid-execution)
- **INV-021**: Insight pool bounded — total insight count ≤ max_pool_size, FIFO eviction
  when exceeded
- **INV-022**: Cross-agent injection bounded — at most max_cross_sections injected per
  prompt (prevents context window flooding)
- **INV-023**: Dynamic cost non-negative — computed spawn cost is always > 0
  (no free spawns, no negative costs)
- **INV-024**: Geometry group isolation — agents in different geometry groups never share
  insight pool partitions

---

## 4. Non-Functional Requirements

| # | Requirement | Target |
|---|-------------|--------|
| NFR-1 | InsightPool memory bounded | Max 1000 active insights, 100KB per insight |
| NFR-2 | Identity lookup latency | < 5ms (indexed by operatorId + model) |
| NFR-3 | Sovereignty level transition | Computed in < 1ms (pure function on reputation data) |
| NFR-4 | Dynamic cost calculation | < 10ms including DB read for utilization |
| NFR-5 | No breaking changes to existing fleet API | All new fields optional in SpawnRequest/SpawnResult |
| NFR-6 | Backward-compatible schema migration | All new columns nullable or defaulted |

---

## 5. Out of Scope (Deferred)

| Item | Reason |
|------|--------|
| Agent-to-agent direct messaging | Requires real-time protocol; insight propagation is sufficient for MVP |
| Economic settlement (real money) | Depends on freeside x402 integration; use virtual costs for now |
| Agent self-modification of constraints | Security implications require deeper analysis |
| Distributed InsightPool (multi-node) | Single-node in-memory + DB is sufficient at current scale |
| Custom meeting geometry definitions | Three built-in geometries cover known use cases |

---

## 6. Dependencies

| Dependency | Required For | Status |
|------------|-------------|--------|
| cycle-012 fleet services | All features | Complete (PR #47) |
| GovernedResource<T> protocol | FR-3 Sovereignty Engine | Available (governed-resource.ts) |
| ReputationService with EMA | FR-1 Identity reputation | Available (reputation-service.ts, INV-006) |
| CrossGovernorEventBus | FR-2 Insight propagation | Available (cross-governor-event-bus.ts) |
| ContextEnrichmentEngine | FR-2 Prompt injection | Available (context-enrichment-engine.ts) |
| FleetGovernor | FR-4 Circulation protocol | Available (fleet-governor.ts) |

---

## 7. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| InsightPool grows unbounded | Medium | High | Strict TTL + FIFO eviction + INV-021 |
| Cross-agent insights inject noise | Medium | Medium | Relevance threshold + INV-022 bounds |
| Sovereignty levels create perverse incentives | Low | High | Conservative thresholds, audit trail |
| Dynamic costs too aggressive, blocking spawns | Medium | High | Floor at 0.1 (10% of nominal), admin bypass |
| Meeting geometry group coordination overhead | Low | Medium | Start with factory default, opt-in to jam/study |
