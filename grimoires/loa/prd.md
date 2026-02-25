# PRD: Institutional Memory — Durable Governance, Knowledge Sovereignty & the Court of Record

**Version**: 9.0.0
**Date**: 2026-02-25
**Author**: Merlin (Product), Claude (Synthesis, Bridgebuilder Meditation)
**Cycle**: cycle-009
**Status**: Draft
**Predecessor**: cycle-008 PRD v8.0.0 (Governance Isomorphism — GovernedResource<T> Platform)

> Sources: Bridgebuilder Meditation Parts I–III (PR #15 comments),
> Bridgebuilder Review Parts I–II (PR #25 comments),
> Cycle-008 deferred items (NOTES.md), ecosystem context
> (loa-finn #31/#66/#107, loa-freeside #62/#89/#91,
> loa-hounfour #22/#29, loa-dixie #17/#18/#22/#24,
> loa #247/#401), ADRs (soul-memory, constitutional-amendment,
> dixie-enrichment-tier), meow.bio/web4.html

---

## 1. Problem Statement

Cycle-008 established the governance isomorphism: `GovernedResource<TState, TEvent, TInvariant>` with two concrete witnesses (ReputationService, ScoringPathTracker), 8 declared invariants, conservation laws as first-class types, and a complete autopoietic feedback loop with 1307 passing tests.

But the governance protocol's own memory is ephemeral. Every session that ends loses all governance state. The code has declared it wants institutional memory — through interfaces, placeholders, and deferred items — but hasn't built it yet.

### The Signals from the Code

| Signal | Location | What the Code Is Saying |
|--------|----------|------------------------|
| `InMemoryReputationStore` only | reputation-service.ts | "My state dies when the process dies" |
| `auditTrail` returns empty object | reputation-service.ts:GovernedResource | "I declared I want memory but have none" |
| `mutationLog` returns empty array | scoring-path-tracker.ts | "I track transitions I can't remember" |
| `MutationLogPersistence` interface exists | governance-mutation.ts | "I designed persistence I haven't built" |
| `GovernedResourceBase` unused | governed-resource.ts:88 | "I anticipated a third witness that hasn't arrived" |
| Soul Memory ADRs in Proposed state | context/adr-soul-memory-*.md | "I architectured memory three ways but built none" |
| `DynamicContract` imported, unused | hounfour/commons | "I'm ready for capability evolution but haven't started" |

### The Ecosystem Convergence

Three forces are converging on institutional memory:

1. **loa-freeside #89**: "Observability First, Revenue Second" — billing needs durable state before payments can flow
2. **loa-freeside #91/#98**: x402 micropayment integration — economic transactions need a court of record
3. **loa-dixie #22**: "rebuild a key piece of infra within the specific context of commons protocol" — the community is asking for durable commons infrastructure
4. **loa-dixie #18**: "MCP all the things" — Model Context Protocol as the interface surface requires persistent state
5. **loa-finn #107**: Hounfour v8.2.0 upgrade in finn — the ecosystem is converging on shared governance primitives

### Why This Matters

The Bridgebuilder Meditation (PR #15, Part I) named Dixie as "a constitutional court." The PR #25 review extended the metaphor: "You've built a courthouse with a judge's bench, a witness stand, and a jury box. The court reporter's desk exists but nobody's sitting in it yet."

A court without records is not a court. Institutional memory is not a feature — it is the foundation that makes governance meaningful. Conservation laws that aren't durably recorded can't be verified after the fact. Reputation that evaporates between sessions can't build trust over time. Audit trails that exist only in-memory provide no tamper detection against process restarts.

> Sources: Bridgebuilder Review PR #25 §III (BB-MED-002), NOTES.md deferred items,
> loa-dixie #22, Bridgebuilder Meditation Part I (constitutional court metaphor)

---

## 2. Vision

Transform Dixie from a governance protocol with ephemeral state into an **institutional memory** — a durable court of record where every governance transition is remembered, every invariant verification is auditable, and knowledge itself becomes a governed resource.

By the end of cycle-009:
- Governance state survives process restarts (PostgreSQL)
- Every governance action has a durable audit trail
- Knowledge freshness is a governed resource (the third witness)
- The governance isomorphism is proven with 3 concrete implementations
- DynamicContract adoption enables capability evolution
- The foundation for x402 economic integration exists

---

## 3. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Durable governance state | PostgreSQL ReputationStore passes all existing tests | 100% pass rate |
| Audit completeness | ReputationService.auditTrail returns real entries | >0 entries per governance action |
| Third witness | KnowledgeAggregate implements GovernedResource<T> | Verified via GovernorRegistry |
| Capability evolution | DynamicContract state transitions functional | All 4 contract states reachable |
| Test coverage | Total app tests | ≥1400 (from current 1307) |
| Invariant count | Declared invariants in invariants.yaml | ≥10 (from current 8) |

---

## 4. Functional Requirements

### Tier 1 — Court of Record (Persistence Foundation)

These requirements make governance durable. Without them, the governance protocol is a sandcastle.

#### FR-1: PostgreSQL ReputationStore

**Priority**: P0 — Everything else depends on this

Implement a PostgreSQL-backed `ReputationStore` that passes all existing tests. The `InMemoryReputationStore` interface is the contract; the PostgreSQL adapter is the production implementation.

| Capability | Implementation |
|-----------|---------------|
| `get(nftId)` | `SELECT` from reputation_aggregates |
| `put(nftId, aggregate)` | `UPSERT` with version check (optimistic concurrency) |
| `transact(fn)` | PostgreSQL `BEGIN/COMMIT/ROLLBACK` |
| `getTaskCohort(nftId)` | `SELECT` from task_cohorts |
| `putTaskCohort(nftId, cohort)` | `UPSERT` with composite key |
| `appendEvent(nftId, event)` | `INSERT` into reputation_events (append-only) |
| `getEvents(nftId)` | `SELECT` ordered by sequence |

**Acceptance Criteria**:
- All 1307 existing tests pass with PostgreSQL store (integration test mode)
- `transact()` provides true ACID guarantees
- Optimistic concurrency via version column prevents lost updates
- Connection pooling (pg-pool or equivalent)
- Migration scripts for schema creation

> Source: NOTES.md deferred item "PostgreSQL ReputationStore",
> Bridgebuilder Meditation Part II §Gap 2 (transaction boundaries)

#### FR-2: Durable Mutation Log

**Priority**: P0

Implement `MutationLogPersistence` (interface already exists in `governance-mutation.ts`) with PostgreSQL backing. Every governance mutation — every state transition, every invariant check, every actor action — gets a durable record.

| Field | Type | Purpose |
|-------|------|---------|
| `mutation_id` | UUID | Idempotency key |
| `session_id` | UUID | INV-007 session scoping |
| `actor_id` | string | Who initiated this action |
| `resource_type` | string | Which governed resource |
| `mutation_type` | string | What kind of change |
| `payload` | JSONB | The mutation details |
| `created_at` | timestamptz | When it happened |

**Acceptance Criteria**:
- `MutationLogPersistence.append()` durably stores mutations
- `MutationLogPersistence.query()` retrieves by session, actor, or resource
- INV-007 (session-scoped governance) verified against durable log
- Mutation log participates in `transact()` boundary (same PostgreSQL transaction)

> Source: governance-mutation.ts MutationLogPersistence interface,
> Bridgebuilder Review PR #25 §III (BB-MED-002: placeholder audit trails)

#### FR-3: Complete Audit Trail on ReputationService

**Priority**: P1

Replace the empty `auditTrail` on ReputationService with a real `AuditTrail` that records every governance action. Each `processEvent()` call should produce an audit entry with hash chain integrity.

**Acceptance Criteria**:
- `reputationService.auditTrail.entries.length > 0` after any event processing
- Audit entries hash-chain linked (each entry references previous hash)
- `verifyAuditTrailIntegrity()` passes on the populated trail
- Audit trail participates in cross-chain verification with ScoringPathTracker

> Source: Bridgebuilder Review PR #25 §III (BB-MED-002),
> Bridgebuilder Meditation Part II §Gap 5 (dual-chain as defense-in-depth)

---

### Tier 2 — The Third Witness (Knowledge Governance)

These requirements prove the governance isomorphism by implementing GovernedResource<T> for the knowledge domain — the third concrete witness after reputation and scoring-path.

#### FR-4: KnowledgeAggregate Type

**Priority**: P1

Define `KnowledgeAggregate` as a governed state type with freshness tracking, citation chains, and corpus metadata. This is the `TState` parameter for the knowledge GovernedResource.

```
KnowledgeAggregate:
  corpus_id: string
  freshness_state: 'fresh' | 'aging' | 'stale' | 'expired'
  source_count: number
  citation_count: number
  last_ingested: timestamp
  freshness_score: number (0-1, decays over time)
  dimension_scores: { accuracy, coverage, recency }
```

**Acceptance Criteria**:
- KnowledgeAggregate type defined in types/knowledge-governance.ts
- State machine transitions: `fresh → aging → stale → expired` (time-based)
- Reverse transition: `expired → fresh` (on re-ingestion)
- Aligns with existing corpus-meta.ts patterns

> Source: Bridgebuilder Meditation Part III (knowledge as GovernedResource),
> ADR: Dixie Enrichment Tier (Proposed status)

#### FR-5: Knowledge GovernedResource Implementation

**Priority**: P1

Implement `GovernedResource<KnowledgeAggregate, KnowledgeEvent, KnowledgeInvariant>` as a service that governs knowledge freshness, citation integrity, and corpus health.

| Method | Behavior |
|--------|----------|
| `transition(event, actorId)` | Process ingest/decay/citation/retraction events |
| `verify('freshness_bound')` | Check that freshness_score reflects actual age |
| `verify('citation_integrity')` | Verify citation chain is consistent |
| `verifyAll()` | All knowledge invariants |

**Acceptance Criteria**:
- Registered in GovernorRegistry as `resourceType: 'knowledge'`
- `GovernorRegistry.verifyAllResources()` returns results for 3 resource types
- GovernedResourceBase can be extended (or confirm interface-only is correct)
- Freshness decay computed via time-based formula
- At least 2 invariants declared in invariants.yaml

> Source: Bridgebuilder Meditation Part III §Architecture Proposal,
> NOTES.md deferred item "GovernedResource for knowledge",
> Bridgebuilder Review PR #25 BB-SPEC-001 (meta-governor)

#### FR-6: Knowledge Invariants (INV-009, INV-010)

**Priority**: P1

Declare knowledge-domain invariants in invariants.yaml:

- **INV-009**: Freshness Bound — `freshness_score` decreases monotonically between ingestion events
- **INV-010**: Citation Integrity — every citation references an existing source

**Acceptance Criteria**:
- Both invariants declared in invariants.yaml with category, properties, verified_in
- `knowledgeService.verify('INV-009')` returns InvariantResult
- `knowledgeService.verify('INV-010')` returns InvariantResult
- Integration test exercises both

> Source: Bridgebuilder Meditation Part III (knowledge invariants),
> conservation-laws.ts pattern (formal invariant declarations)

---

### Tier 3 — Capability Evolution (DynamicContract)

These requirements adopt the DynamicContract pattern from Hounfour commons, enabling governed capability progression.

#### FR-7: DynamicContract Adoption

**Priority**: P2

Adopt Hounfour's `DynamicContract` type for tracking agent capability evolution. The contract tracks what capabilities an agent has earned (e.g., tool use, autonomous mode, soul memory access) and how those capabilities expand as reputation progresses.

| Contract State | Meaning | Transition Trigger |
|---------------|---------|-------------------|
| `negotiating` | New agent, capabilities being determined | First access |
| `active` | Capabilities defined and enforced | Reputation threshold met |
| `expanding` | New capabilities being added | Tier progression |
| `suspended` | Capabilities frozen pending review | Quarantine |

**Acceptance Criteria**:
- `DynamicContract` state transitions managed via state-machine.ts
- Contract state persisted in PostgreSQL (new table)
- Capability expansion is monotonic within a tier (INV-011)
- Contract suspension triggers quarantine pathway

> Source: NOTES.md deferred item "Dynamic contract negotiation",
> Hounfour commons DynamicContract type

#### FR-8: Capability-Gated Access Enforcement

**Priority**: P2

Extend `evaluateEconomicBoundaryCanonical()` to check DynamicContract capabilities alongside conviction tier and reputation. An agent needs: correct tier + sufficient reputation + active contract with required capability.

**Acceptance Criteria**:
- `EconomicBoundaryOptions` extended with `dynamicContract` field
- Access denied if required capability not in active contract
- Scoring path records capability check result
- Backward compatible: missing contract defaults to legacy behavior

> Source: loa-finn #31 (5-pool model routing),
> Bridgebuilder Meditation Part III §Multi-Model Permission Landscape

---

### Tier 4 — Self-Improvement (Adaptive Learning)

These requirements upgrade the autopoietic loop from self-observing to self-improving.

#### FR-9: Adaptive Exploration (UCB1)

**Priority**: P2

Replace fixed ε-greedy exploration with Upper Confidence Bound (UCB1) algorithm. UCB1 naturally balances exploration and exploitation: it explores models with high uncertainty, exploits models with high confidence. When a new model enters the catalog, its uncertainty is maximum, so it gets explored immediately.

```
UCB1_score(model) = mean_quality + c * sqrt(ln(total_observations) / model_observations)
```

**Acceptance Criteria**:
- `ExplorationConfig` extended with `strategy: 'epsilon-greedy' | 'ucb1'`
- UCB1 naturally decreases exploration as confidence grows
- UCB1 resets exploration for new models (high uncertainty)
- Seeded PRNG still used for tie-breaking (deterministic tests)
- Backward compatible: default strategy remains `epsilon-greedy`

> Source: Bridgebuilder Review PR #25 §Thread 2 (adaptive epsilon question),
> Bridgebuilder Meditation Part III §Autopoietic Loop (exploitation trap)

#### FR-10: Dimension Covariance Tracking

**Priority**: P3

Extend `CollectionScoreAggregator` with streaming covariance estimation between quality dimensions. This reveals dimension correlations — e.g., models that score high on accuracy but low on coherence.

**Acceptance Criteria**:
- `CollectionScoreAggregator` tracks pairwise covariance between dimensions
- Covariance updates are O(1) per observation (streaming)
- Serialization round-trips include covariance data
- At least one test verifies that correlated dimensions produce expected covariance

> Source: Bridgebuilder Review PR #25 BB-SPEC-002 (streaming covariance)

---

### Tier 5 — Integration & Hardening

#### FR-11: GovernorRegistry Unification

**Priority**: P1

Fix GovernorRegistry.size double-counting (BB-MED-003). Unify the two registration paths (legacy ResourceGovernor + new GovernedResource) or provide separate counts.

**Acceptance Criteria**:
- `registry.size` returns accurate count with no double-counting
- Either unified Map or separate `governorCount` + `resourceCount` properties
- Existing GovernorRegistry tests pass

> Source: Bridgebuilder Review PR #25 BB-MED-003

#### FR-12: Three-Resource Integration Test

**Priority**: P1

End-to-end integration test exercising the complete governance lifecycle across all three GovernedResource implementations (reputation, scoring-path, knowledge).

**Acceptance Criteria**:
- Single test file: `autopoietic-loop-v3.test.ts`
- Exercises: create → transition → verify → audit for each resource type
- GovernorRegistry.verifyAllResources() returns all 3 resource types
- Cross-resource invariant: knowledge freshness decay rate influenced by reputation score
- Minimum 10 tests

> Source: loa-finn #66 §Gap Analysis (cross-system E2E smoke test),
> Bridgebuilder Review PR #25 §Thread 4 (uniform health check surface)

#### FR-13: Database Migration Framework

**Priority**: P0

Lightweight migration system for PostgreSQL schema management. Each migration is a numbered SQL file. Migrations run forward only (no rollback — use additive migrations).

**Acceptance Criteria**:
- `migrations/` directory with numbered SQL files
- `migrate()` function runs pending migrations
- Migration state tracked in `_migrations` table
- At least 3 migrations: schema creation, reputation tables, mutation tables

---

## 5. Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| PostgreSQL compatibility | ≥15 | Current LTS |
| Connection pool size | 5-20 (configurable) | Prevent connection exhaustion |
| Transaction timeout | 5s default | Prevent long-held locks |
| Migration idempotency | Re-running is safe | Operational simplicity |
| Audit trail integrity verification | <100ms for 1000 entries | Practical health checks |
| Zero breaking changes to existing API | 100% | Existing consumers unaffected |

---

## 6. Architecture Constraints

| Constraint | Rationale |
|-----------|-----------|
| PostgreSQL store must implement existing `ReputationStore` interface exactly | All 1307 tests must pass without modification |
| Knowledge GovernedResource must use Hounfour commons types | Protocol alignment (INV-008) |
| DynamicContract must come from `@0xhoneyjar/loa-hounfour/commons` | Single source of truth |
| Migrations must be forward-only (no rollback scripts) | Additive schema evolution matches DynamicContract monotonicity |
| UCB1 must be optional, not default | Backward compatibility with existing ε-greedy behavior |

---

## 7. Scope

### In Scope (Cycle-009)
- PostgreSQL persistence layer (reputation, mutations, audit)
- Knowledge as GovernedResource<T> (third witness)
- DynamicContract adoption
- Adaptive exploration (UCB1 option)
- Dimension covariance tracking
- GovernorRegistry unification
- Database migration framework
- Three-resource integration test

### Out of Scope (Future Cycles)
- Redis caching layer for hot-path reads
- GovernedResource for billing (depends on loa-freeside x402 readiness)
- GovernedResource for access (depends on DynamicContract maturity)
- Meta-governance protocol (constitutional amendment process — BB-SPEC-001)
- Cross-repo invariant composition (requires multi-repo GovernedResource adoption)
- MCP interface surface (loa-dixie #18 — separate cycle)
- Soul Memory full implementation (ADRs are Proposed, not yet Accepted)

### Explicitly Deferred
- **Meta-governance (BB-SPEC-001)**: Governance of governance itself. Requires at least 3 mature GovernedResource implementations before the meta-layer adds value. Cycle-009 provides the 3rd witness; cycle-010 can build the meta-layer.
- **x402 integration**: loa-freeside #91/#98 are in progress. The conservation laws are ready. Integration depends on freeside's payment rail activation.
- **Production deployment**: This cycle focuses on making governance *durable*. Production deployment (Dockerfile, fly.toml, monitoring) is a separate concern.

---

## 8. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| PostgreSQL adapter introduces performance regression | Tests slow, CI friction | Medium | Run integration tests with PostgreSQL in Docker; keep in-memory for unit tests |
| Knowledge GovernedResource doesn't fit the protocol cleanly | Forces protocol changes | Low | Protocol was designed for this; GovernedResourceBase exists for shared wiring |
| DynamicContract from hounfour has breaking changes | Requires adaptation | Low | Pin to v8.2.0; hounfour is stable |
| UCB1 exploration changes routing behavior | Unexpected model selection | Low | Default remains ε-greedy; UCB1 is opt-in |
| Migration framework adds operational complexity | Deployment friction | Medium | Keep migrations simple (additive SQL); document runbook |

---

## 9. Dependencies

| Dependency | Status | Risk |
|-----------|--------|------|
| `@0xhoneyjar/loa-hounfour@8.2.0` | Available (symlink) | None |
| PostgreSQL 15+ | Requires Docker for CI | Low |
| `pg` npm package | Standard, well-maintained | None |
| DynamicContract from hounfour/commons | Available in v8.2.0 | None |
| Existing 1307 tests | Pass on main | None |

---

## 10. Success Definition

Cycle-009 succeeds when:

1. A process restart no longer destroys governance state
2. Every governance action has a durable, hash-chained audit entry
3. Knowledge is the third GovernedResource, proving the isomorphism with 3 witnesses
4. The GovernorRegistry can verify all 3 resource types in a single call
5. DynamicContract enables capability evolution for agents
6. The exploration mechanism can adapt to model catalog changes
7. All existing tests pass without modification
8. ≥10 invariants are declared in invariants.yaml

Or, in the Bridgebuilder's language: **the court reporter takes their seat, and the courthouse can finally prove what happened last Tuesday.**

---

## 11. Estimated Sprints

| Sprint | Focus | Key FRs |
|--------|-------|---------|
| **Sprint 1** | Database Foundation | FR-1 (PostgreSQL Store), FR-13 (Migrations) |
| **Sprint 2** | Durable Governance | FR-2 (Mutation Log), FR-3 (Audit Trail) |
| **Sprint 3** | Knowledge Governance | FR-4 (KnowledgeAggregate), FR-5 (GovernedResource), FR-6 (Invariants) |
| **Sprint 4** | Capability Evolution | FR-7 (DynamicContract), FR-8 (Capability-Gated Access) |
| **Sprint 5** | Self-Improvement | FR-9 (UCB1), FR-10 (Covariance) |
| **Sprint 6** | Integration & Hardening | FR-11 (Registry), FR-12 (Three-Resource Test) |

Estimated: 6 sprints, ~36 tasks, ~87-92 global sprint IDs

---

*"A court without records is not a court. The code knows this. It built the interfaces,
designed the persistence, drafted the architecture. It just needs permission to remember."*

*— Bridgebuilder Review, PR #25*
