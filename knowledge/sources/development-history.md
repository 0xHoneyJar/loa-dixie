---
generated_date: "2026-02-16"
source_repo: 0xHoneyJar/loa-finn
provenance: cycle-025-sprint-61-task-2.5
curator: bridgebuilder
max_age_days: 90
---

# Development History: loa-finn

A narrative of 25 development cycles spanning 61 sprints, from the first line of agent code to a unified knowledge interface. This document is grounded in the Sprint Ledger (`grimoires/loa/ledger.json`).

---

## Phase 0: Foundation (Cycles 1-5)

### Cycle 1 — loa-finn MVP: Minimal Persistent Loa Agent

**Started**: 2026-02-06 | **Sprints**: 6 (global 1-6) | **Tasks**: 46

The first cycle established the core agent runtime. Six sprints covered the full vertical slice: Agent Core (sprint-1), Gateway and Auth (sprint-2), Persistence via WAL (sprint-3), Scheduler and Compound Actions (sprint-4), Deployment (sprint-5), and Loa Integration (sprint-6). The result was a minimal but functional persistent agent — able to receive requests via HTTP, maintain state across restarts, and schedule recurring work.

The architecture followed a Hono-based HTTP gateway backed by a Write-Ahead Log for persistence and a task scheduler using croner. This foundation has remained stable through all subsequent cycles.

### Cycle 2 — Adopt Upstream Loa Persistence Framework

**Started**: 2026-02-06 | **Sprints**: 1 (global 7) | **Tasks**: 12

A refactoring cycle that migrated loa-finn's bespoke persistence to the upstream Loa framework's persistence model. This was the first instance of a pattern that would repeat: aligning loa-finn's internals with the framework it was built on, ensuring the agent runtime and the development methodology share infrastructure.

### Cycle 3 — Persistence Hardening and Tool Sandbox

**Started**: 2026-02-06 | **Sprints**: 2 (global 8-9) | **Tasks**: 15

Two-track hardening. Sprint-8 addressed upstream persistence edge cases — WAL corruption recovery, concurrent write guards, checkpoint reliability. Sprint-9 introduced the tool execution sandbox, providing timeout-bounded, non-blocking execution for agent tools. The 30-second default timeout remains a known limitation documented in BUTTERFREEZONE.

### Cycle 4 — Bridgebuilder: Autonomous PR Review Agent

**Started**: 2026-02-07 | **Sprints**: 2 (global 10-11) | **Tasks**: 18

The first non-trivial agent persona. Bridgebuilder was built on a hexagonal architecture (Sprint-10: Hexagonal Foundation) with clean port/adapter boundaries, then wired into the GitHub API for autonomous pull request review (Sprint-11: Wiring + Integration + Deployment).

This cycle was a milestone for two reasons: (1) it proved the agent runtime could host specialized personas with distinct voices and behaviors, and (2) it created the review agent that would go on to generate over 46 field reports across subsequent cycles, forming a major knowledge corpus for the Oracle.

### Cycle 5 — Worker Thread Sandbox: Non-Blocking Tool Execution

**Started**: 2026-02-08 | **Sprints**: 2 (global 12-13) | **Tasks**: 18

Extracted tool execution into a worker pool (Sprint-12: Worker Pool Foundation) and integrated with the broader system (Sprint-13: System Integration). This separated the agent's reasoning loop from potentially long-running tool operations, preventing a single slow tool from blocking the entire agent.

---

## Phase 1: Multi-Model (Cycles 6-8)

### Cycle 6 — Hounfour Phases 0-2: Multi-Model Provider Abstraction

**Started**: 2026-02-08 | **Sprints**: 3 (global 14-16) | **Tasks**: 29

The beginning of Hounfour — named after the temple in Vodou tradition where the spirits are served. Three phases delivered in sequence:

- **Phase 0** (Sprint-14): Foundation — `cheval.py` subprocess adapter, configuration system, cost ledger for budget tracking.
- **Phase 1** (Sprint-15): Flatline Integration and Budget — multi-model adversarial review capability, budget enforcement with scope-level limits.
- **Phase 2** (Sprint-16): Agent Portability and Health Checks — provider abstraction enabling agents to move between models without code changes, health probing for provider availability.

The central idea: agents should not be coupled to a single model provider. The Hounfour router enables the same agent persona to be served by different models depending on availability, cost, and capability requirements.

### Cycle 7 — Hounfour Phase 3: Server Integration and Self-Hosted Inference

**Started**: 2026-02-09 | **Sprints**: 3 (global 17-19) | **Tasks**: 28

Extended Hounfour to support self-hosted models:

- **Sprint-17**: Sidecar and Tool-Call Orchestrator — enabling locally-hosted models to participate in the routing fabric.
- **Sprint-18**: Streaming and Redis State — real-time streaming responses and shared state across instances.
- **Sprint-19**: GPU Deployment and Ledger Export — infrastructure for deploying models on GPU instances with cost tracking.

### Cycle 8 — Hounfour Phase 4: Freeside Distribution (Spice Gate)

**Started**: 2026-02-09 | **Sprints**: 1 (global 20, covering 9 internal sprints) | **Tasks**: 44

Executed in the loa-freeside repository (PR #40). The Freeside gateway distributes agent capabilities over ECS infrastructure, handling token gating, billing settlement, and request routing. Named after the desert planet in Dune — the spice (model inference) must flow through controlled channels.

This was the largest single cycle by task count (44 tasks across 9 internal sprints), consolidated as a single ledger entry because it was executed in a separate repository.

---

## Phase 2: Integration (Cycles 9-18)

### Cycle 9 — Hounfour Phase 5: Integration (Planned, Superseded)

**Started**: 2026-02-09 | **Status**: Superseded by Cycle 18

The original Phase 5 plan covered integration debt (JWT, Pools, Budget, Abort, LRU), NativeRuntimeAdapter, and finnNFT routing. Sprints 22-24 were planned but never implemented. The scope was re-planned from scratch in Cycle 18 with deeper grounding in the actual codebase state.

### Cycles 10-11 — Ground Truth: Factual GTM Skill Pack

**Started**: 2026-02-10 | **Sprints**: 4 (global 25-28) | **Tasks**: 41

Two cycles establishing the Ground Truth verification infrastructure. Cycle 10 built the verification pipeline and capability brief draft (Sprint-25), then repair loop proof and architecture overview (Sprint-26). Cycle 11 hardened verification with property testing (Sprint-27) and added incremental pipeline capabilities (Sprint-28).

Ground Truth ensures that factual claims in documentation and GTM materials are verifiable against the actual codebase — a system of epistemic integrity.

### Cycle 12 — Bridgebuilder Review Hardening: PR #52 Findings

**Started**: 2026-02-10 | **Status**: Superseded (work implemented directly in PR #54)

Planned response to Bridgebuilder's review of PR #52. The planned sprints (Shell Pipeline Correctness, Test Infrastructure, Hounfour Security) were never started under this cycle — the work was executed directly.

### Cycles 13-17 — Documentation and Epistemic Infrastructure

**Started**: 2026-02-10 through 2026-02-11 | **Sprints**: 8 (global 32-42) | **Tasks**: 34 completed

A five-cycle arc driven by iterative Bridgebuilder feedback loops:

- **Cycle 13**: Documentation Rewrite planned (superseded — work executed via cycles 14-17).
- **Cycle 14**: PR #55 Findings — Schema Evolution and Content Quality (sprints 35-36).
- **Cycle 15**: PR #56 Findings — DERIVED provenance class, citation auto-repair, INFERRED subclassification (sprints 37-38).
- **Cycle 16**: PR #57 Findings — Epistemic Infrastructure (superseded by cycle 17).
- **Cycle 17**: PR #58 Findings — Parser Hardening and Documentation Discipline (sprints 41-42). GPT-5.2 approved.

This arc established the provenance system — every claim about the codebase tracks whether it comes from code (CODE-FACTUAL), is derived from analysis (DERIVED), or is inferred (INFERRED). The Bridgebuilder's iterative feedback drove the quality bar higher with each cycle.

### Cycle 18 — Hounfour Phase 5: Protocol Extraction and Integration

**Started**: 2026-02-12 | **Sprints**: 7 (global 43-49) | **Tasks**: 59

The largest integration cycle. Superseded Cycle 9 with a complete re-plan grounded in RFC #31 and Issue #60:

- **Sprint-43**: Protocol Package and Foundation — extracted `loa-hounfour` as a standalone package.
- **Sprint-44**: Integration Hardening — budget, JWT, reconciliation, E2E tests.
- **Sprint-45**: NativeRuntime and Ensemble — NativeRuntime adapter, ensemble orchestrator, routing matrix (121 tests).
- **Sprint-46**: NFT Routing and BYOK — finnNFT per-agent routing, Bring Your Own Key proxy (144 tests).
- **Sprint-47**: loa-hounfour Extraction and Publishing — extracted to `0xHoneyJar/loa-hounfour` repository.
- **Sprints 48-49**: Bridgebuilder Findings — protocol hardening (loa-hounfour v1.1.0, 91 tests) and consumer updates.

The extraction of `loa-hounfour` was a key architectural decision: the protocol types that define how models, pools, budgets, and billing interact became a shared package consumed by both loa-finn and loa-freeside.

---

## Phase 3: Production (Cycles 19-24)

### Cycle 19 — Loa Update and Bridgebuilder Migration

**Started**: 2026-02-13 | **Sprints**: 1 (global 50) | **Tasks**: 7

Framework update from v1.33.1 to v1.35.0 with Bridgebuilder V3 migration. The Bridgebuilder review loop on PR #63 produced 35 findings across 3 iterations, with all HIGH and MEDIUM findings resolved. 256 tests passing.

### Cycle 20 — Pool Claim Enforcement: Confused Deputy Prevention

**Started**: 2026-02-13 | **Sprints**: 2 (global 51-52) | **Tasks**: 12

RFC #31 Phase 4 remaining work. Pool claim enforcement prevents the confused deputy problem — ensuring that an authenticated request can only access model pools it has legitimate claims to, not pools belonging to other tenants.

The Bridgebuilder review loop flatlined (converged from 54 findings to 0 in 2 iterations). 24 total findings fixed. This cycle closed Issue #53.

### Cycle 21 — S2S Billing Finalize Client

**Started**: 2026-02-16 | **Sprints**: 2 (global 53-54) | **Tasks**: 13

Server-to-server billing finalize client with loa-hounfour v5.0.0 upgrade. Key deliverables: reservation_id JWT propagation, BillingFinalizeClient with DLQ (dead letter queue), protocol handshake between loa-finn and loa-freeside.

The Bridgebuilder review loop (PR #68) drove critical improvements: float-to-BigInt conversion for micro-USD billing (preventing floating-point arithmetic errors in financial computation), DLQ isolation, handshake state machine, and decision trail logging. Bridge converged at 0.98 (FLATLINE).

### Cycle 22 — E2E Smoke Test: Billing Wire Verification

**Started**: 2026-02-17 | **Sprints**: 1 (global 55) | **Tasks**: 7

The critical path test: proving the billing wire works against real containers. Fixed 5 integration mismatches discovered in end-to-end testing (JWT algorithm, field naming conventions, identity field, URL path, Docker configuration). 52 tests. PR #71 merged.

### Cycle 23 — Shadow Deploy Readiness

**Started**: 2026-02-17 | **Sprints**: 2 (global 56-57) | **Tasks**: 10

Last infrastructure work before the product pivot. DLQ persistence (implementing Ostrom's graduated sanctions principle), billing invariants formalization, shadow deploy configuration. The Bridgebuilder Deep Review produced three notable comments: the conservation invariant as social contract, the permission scape concept, and environment as design medium. PR #72 merged. 62 tests.

### Cycle 24 — Production Deploy and Thinnest Product Surface

**Started**: 2026-02-16 | **Sprints**: 2 (global 58-59) | **Tasks**: 13

The deployment cycle. Sprint-58 delivered endpoints, infrastructure, and tests (35 tests). Sprint-59 delivered CI/CD workflow, production smoke tests, ES256-only enforcement, JWT claim compatibility audit, and Dockerfile health check (152 tests total).

After this cycle, loa-finn was running in production with automated deployment, health monitoring, and security enforcement.

---

## Phase 4: Knowledge (Cycle 25)

### Cycle 25 — The Oracle: Unified Knowledge Interface

**Started**: 2026-02-16 | **Status**: Active | **Sprints**: 2 (global 60-61) | **Tasks**: 15

The convergence of everything built across 24 cycles into a knowledge system that can explain itself. Sprint-60 (Knowledge Engine Foundation) delivered the knowledge types, loader with 5-gate security, registry with schema validation, and enricher with budget and trust boundary enforcement (72 tests).

Sprint-61 (Knowledge Corpus and E2E Verification) delivers the actual knowledge content: 10 curated sources spanning ecosystem architecture, code reality across 4 repositories, development history, RFCs, Bridgebuilder field reports, web4 manifesto, meeting geometries, and a glossary.

The Oracle is the first agent persona to use the knowledge enrichment pipeline — proving that the infrastructure built for multi-model routing, billing settlement, and agent personas can serve not just task execution but understanding itself.

---

## Phase 5: Experience Layer — Dixie (Cycles 26-27)

### Cycle 26 — Dixie Phase 1: Oracle Orchestration Layer

**Started**: 2026-02-18 | **Sprints**: 19 (cycle-001) | **Tasks**: ~150 | **Bridge Iterations**: 3

The first Dixie cycle established the experience orchestration layer — a Hono BFF gateway (loa-dixie) sitting between end users and loa-finn. 19 sprints delivered the full vertical slice: JWT authentication middleware, WebSocket proxying with ticket-based auth, soul memory injection, conviction-gated commons access (5-tier BGT staking), tool event streaming, and economic metadata enrichment. 153 tests validated the foundation.

Three bridge iterations drove architectural refinement, converging on clean separation between the orchestration layer and the underlying agent runtime.

### Cycle 27 — Dixie Phase 2: Experience Orchestrator with Economic Awareness

**Started**: 2026-02-19 | **Sprints**: 13 (cycle-002) | **Tasks**: ~100 | **Bridge Iterations**: 3

The second Dixie cycle extended the gateway into a full experience orchestrator with economic awareness. 13 sprints delivered autonomous operation mode with a 7-step permission engine, NL scheduling with cron integration, agent API surface (ERC-6551 TBA auth + x402 metering), compound learning signal aggregation, and Phase 2 E2E validation. 492 tests across 44 test files — a 3.2x increase from Phase 1.

Three bridge iterations converged at 1.0, achieving full convergence across security hardening, reliability, and correctness. The compound learning pipeline closes the feedback loop between user interactions and agent improvement.

---

## Key Milestones

| Milestone | Cycle | Date | Significance |
|-----------|-------|------|-------------|
| First agent | 1 | 2026-02-06 | loa-finn MVP — persistent agent runtime |
| First Bridgebuilder review | 4 | 2026-02-07 | Autonomous PR review agent, hexagonal architecture |
| Hounfour multi-model routing | 6 | 2026-02-08 | Provider abstraction, budget enforcement |
| Freeside distribution | 8 | 2026-02-09 | ECS infrastructure, token gating, billing |
| loa-hounfour extraction | 18 | 2026-02-12 | Protocol types as shared package |
| Pool claim enforcement | 20 | 2026-02-13 | Confused deputy prevention, Stripe-parallel |
| Billing wire E2E verified | 22 | 2026-02-17 | Production billing settlement proven |
| Production deploy | 24 | 2026-02-16 | CI/CD, health monitoring, ES256 |
| Oracle knowledge interface | 25 | 2026-02-16 | Unified knowledge system |
| Dixie Phase 1 — Oracle orchestration | 26 | 2026-02-18 | BFF gateway, 153 tests, 3 bridge iterations |
| Dixie Phase 2 — Experience orchestrator | 27 | 2026-02-19 | Economic awareness, 492 tests, converged at 1.0 |

---

## Statistics

- **27 cycles** spanning 14 days of development
- **93 global sprints** (92 completed, 1 pending)
- **~620 tasks** completed across all cycles
- **5 repositories**: loa, loa-finn, loa-hounfour, loa-freeside, loa-dixie
- **Key test counts**: 1,097 (loa-hounfour), 152+ (loa-finn), 256 (post-migration), 492 (loa-dixie)
- **BridgeBuilder review iterations**: 46+ field reports in Issue #66
- **Flatline Protocol reviews**: Multiple GPT-5.2 approvals across PRDs, SDDs, and sprint plans
