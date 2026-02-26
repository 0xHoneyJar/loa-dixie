# PRD: Agent Fleet Orchestration — From Oracle to Conductor

**Version**: 12.0.0
**Date**: 2026-02-26
**Author**: Merlin (Product), Claude (Synthesis)
**Cycle**: cycle-012
**Status**: Draft
**Predecessor**: cycle-011 PRD v11.0.0 (Autopoietic Loop Closure)

> Sources: loa-finn #66 Rounds 10-12 (Command Deck), loa-dixie #24 (Zoe/OpenClaw
> analysis), #12/#20 (autonomous GTM), #6 (launch wiring), #13 (community oracles),
> #33/#34 (governor coordination), #35 (adaptive retrieval), #41 (pre-swarm planning),
> #42 (symbiotic layer), #44 (operator skill curve), loa-finn #84 (Docker E2E),
> loa-freeside #99 (governance substrate), code reality (15 routes, 30+ services,
> 1493 tests, 12 migrations, 11 cycles completed)

---

## 1. Problem Statement

Dixie is an oracle — it answers questions, governs knowledge, tracks reputation, and
enforces access control. But it cannot **act**. It cannot spawn agents, manage work,
monitor progress, or proactively discover tasks that need doing. It is a brain without
hands.

Elvis/@elvissun's "Zoe" (documented in issue #24) demonstrates the conductor pattern:
a meta-orchestrator that spawns coding agents, writes their prompts with business
context, monitors progress, retries intelligently on failure, and notifies the operator
when PRs are ready to merge. The result: 94 commits in one day, 7 PRs in 30 minutes,
one person doing the work of a team.

**Dixie already has more governance, security, and economic infrastructure than Zoe.**
What Dixie lacks is the conductor layer — the ability to spawn, monitor, and orchestrate
a fleet of agents. This cycle transforms Dixie from oracle (passive knowledge) to
conductor (active orchestration).

### The Key Differentiators

| Dimension | Zoe (OpenClaw) | Dixie (THJ) |
|-----------|---------------|-------------|
| **Identity** | Software persona | dNFT on-chain identity with conviction tiers |
| **Governance** | None — --dangerously-bypass-approvals | Hounfour governance + Loa safety hooks |
| **Reputation** | Implicit (CI pass = good) | Formal EMA-dampened Bayesian reputation per agent |
| **Economics** | $100/mo Claude + $90/mo Codex | x402 micropayments, budget governance |
| **Infra** | Local Mac Mini / VPS | Freeside IaC (production-grade, self-hosted) |
| **Context** | Obsidian vault | Governed knowledge corpus with freshness tracking |
| **Security** | SSH keys on disk | ES256 JWT, SIWE wallet auth, conviction gating |
| **Audit** | Git history | Cryptographic hash chains, mutation logs |
| **Dev framework** | Ad-hoc scripts | Loa (skills, hooks, protocols, beads task tracking) |

### What the Code Says

| Signal | Location | What It Means |
|--------|----------|---------------|
| `autonomous-engine.ts` exists | app/src/services/ | Autonomous mode scaffolded but limited to self-directed tasks |
| `agent-routing-engine.ts` exists | app/src/services/ | Multi-model routing logic available for fleet agent selection |
| Cheval adapters (openai_adapter.py) | .claude/adapters/ | Model adapter layer already supports multi-model execution |
| Loa Agent Teams support | CLAUDE.md constraints | Framework has lead/teammate architecture |
| `ReputationCache` with negative caching | reputation-cache.ts | Can track fleet agent reputation in real-time |
| `GovernorRegistry` with lifecycle | governor-registry.ts | Central governance hub ready for fleet governor |
| `signal-emitter.ts` (NATS-backed) | app/src/services/ | Async event system exists for fleet coordination |
| `compound-learning.ts` | app/src/services/ | Learning signal infrastructure for fleet pattern capture |

---

## 2. Goals & Success Criteria

### Primary Goals

| # | Goal | Measurable Outcome |
|---|------|-------------------|
| G-1 | **Spawn and manage a fleet of coding agents** | Dixie can create git worktrees, spawn Claude Code/Codex agents, track their status, and clean up after completion |
| G-2 | **Monitor fleet health and notify operators** | Monitoring loop detects agent completion/failure, checks CI/PR status, sends notifications to Discord/Telegram/CLI |
| G-3 | **Context-enriched prompt construction** | Fleet agents receive prompts enriched with knowledge governance data, reputation context, and task-specific business context |
| G-4 | **Failure-aware intelligent retry** | Failed agents are respawned with enriched context about why they failed — not blind retry but learning-driven retry (Ralph Loop V2) |
| G-5 | **Multi-surface operator interface** | CLI commands, Discord/Telegram notifications, web dashboard — all conviction-gated by dNFT identity |
| G-6 | **Governed autonomy at full speed** | Agents run --dangerously-skip-permissions but within Loa's hook system (destructive bash blocking, mutation logging, role guards). Hounfour governance IS the safety net |

### Stretch Goals

| # | Goal | Measurable Outcome |
|---|------|-------------------|
| G-7 | **Proactive work discovery** | Dixie scans external signals (Sentry, issue boards, git activity) and proposes/spawns agents without operator prompting |
| G-8 | **Multi-model code review pipeline** | Each PR reviewed by 3 models (like Zoe's Codex + Claude + Gemini review) before operator notification |
| G-9 | **Live API wiring** (#6) | All mocked endpoints wired to live finn infrastructure, x402 payment gate activated |
| G-10 | **JWKS key rotation + enriched reputation query** | ES256 key rotation via .well-known/jwks.json, query returns {score, confidence, n} for Thompson Sampling |

### Success Metrics

| Metric | Target | Method |
|--------|--------|--------|
| Concurrent agents manageable | 5+ simultaneous | Integration test with parallel worktrees |
| Agent spawn-to-PR time | < 30 min for medium tasks | End-to-end timing from spawn to PR ready |
| Fleet monitoring latency | < 60s detection of completion/failure | Monitoring loop cycle time |
| Operator notification delivery | < 30s after event | Discord/Telegram delivery timing |
| Context enrichment coverage | 100% of spawned agents receive governed context | Audit trail verification |
| Failure retry success rate | > 60% of retries succeed | Agent retry tracking |
| Test count increase | +100-150 new tests | vitest count before/after |

---

## 3. User & Stakeholder Context

### Primary Operator: Team (Merlin + Allowlisted Wallets)

The team uses Dixie as their conductor. Natural language commands via any surface:
"Spin up 3 agents to fix the Sentry errors." "Build the feature from issue #42."
"Review the last 5 PRs and summarize." Conviction tier: oracle.

**Extension path**: Anyone with a sufficiently high reputation score gains conductor
access. The reputation system (built in cycles 006-011) becomes the access gate.

### Secondary Operator: dNFT Holders

Each dNFT holder can command agents proportional to their conviction tier:

| Tier | Fleet Capabilities |
|------|-------------------|
| observer | View fleet status, read agent outputs |
| builder | Spawn 1 agent, basic task types (bug fix, docs) |
| expert | Spawn 3 agents, complex tasks (features, refactors), custom prompts |
| oracle | Unlimited agents, proactive discovery, fleet configuration, admin |

### Downstream Consumer: loa-finn

Finn continues to consume dixie's reputation data via the query surface built in
cycle-011. The fleet orchestrator generates new reputation data as agents complete
work — closing the autopoietic loop at the fleet level.

### Infrastructure: loa-freeside

Freeside provides the IaC substrate. The conductor deploys as a service alongside
finn and dixie on freeside-managed infrastructure. Docker Compose for local dev,
production deployment via freeside's stack.

---

## 4. Functional Requirements

### Tier 1: Conductor Core (Agent Fleet Management)

| ID | Requirement | Acceptance Criteria |
|----|-------------|-------------------|
| FR-1 | **Agent Spawner** — Create isolated agent environments | `spawnAgent(task)` creates git worktree, installs dependencies, launches agent process (Claude Code or Codex) in managed session. Returns agent handle with PID, branch, worktree path. Supports `--dangerously-skip-permissions` with Loa hooks active. Cleanup on completion/failure. |
| FR-2 | **Task Registry** — Track all active and completed fleet work | JSON/PG registry of active tasks: `{id, agent_type, model, branch, worktree, status, spawned_at, pr_number, ci_status, review_status}`. Queryable by status, agent, branch. Persisted across conductor restarts. Integrates with beads_rust for task lifecycle. |
| FR-3 | **Fleet Monitor** — Continuous health checking loop | Configurable interval (default 60s). Checks: process alive, git activity (stalled?), PR created, CI status via `gh`, code review status. Emits events to GovernorRegistry. Detects: completion, failure, stall, timeout. |
| FR-4 | **Agent Model Router** — Select optimal model per task type | Leverages finn's multi-model routing patterns + cheval adapters. Backend/reasoning → Codex. Frontend/git → Claude Code. Design → Gemini. Custom routing rules configurable. Falls back to reputation-weighted selection. |
| FR-5 | **Context Enrichment Engine** — Build task-aware prompts | Composes prompts from: (a) task description, (b) relevant knowledge corpus (via enrichment-service), (c) codebase reality (via /ride artifacts), (d) prior agent failures on same task, (e) reputation data for similar tasks. Uses governed retrieval with freshness weighting. |
| FR-6 | **Failure-Aware Retry (Ralph Loop V2)** — Intelligent respawn on failure | On agent failure: (a) capture failure context (error, last files modified, git diff), (b) query knowledge governance for similar past failures, (c) construct enriched retry prompt with failure analysis, (d) respawn with new prompt. Max 3 retries. Each retry logged to compound learning. |

### Tier 2: Operator Interface (Multi-Surface)

| ID | Requirement | Acceptance Criteria |
|----|-------------|-------------------|
| FR-7 | **CLI Fleet Commands** | `/fleet status` — show active agents. `/fleet spawn <task>` — create new agent. `/fleet stop <id>` — halt agent. `/fleet logs <id>` — tail agent output. Extends Loa's existing command system. |
| FR-8 | **Discord/Telegram Notifications** | Configurable webhook notifications for: agent spawned, PR ready for review, CI failed, agent failed (with retry info), fleet summary (daily digest). Message includes PR link, branch, summary. |
| FR-9 | **Web Dashboard Fleet View** | Extension of existing dixie web UI. Fleet status panel: active agents (model, task, duration, status), completed agents (PR link, review status), failed agents (failure reason, retry count). Real-time updates via WebSocket. |
| FR-10 | **Natural Language Fleet Commands** | Via existing chat interface: "Fix the bug in issue #42" → spawns agent with issue context. "Review PR #15" → spawns review agent. "What's the fleet doing?" → status summary. Uses compound learning for intent recognition. |

### Tier 3: Governance Integration

| ID | Requirement | Acceptance Criteria |
|----|-------------|-------------------|
| FR-11 | **Fleet Governor** — GovernedResource<FleetState> | Implements hounfour GovernedResource interface. Tracks: active agent count per operator, resource usage, model allocation. Enforces conviction-tier limits. Emits governance events on spawn/complete/fail. Verifiable via `FleetGovernor.verify()`. |
| FR-12 | **Cross-Governor Event Bus** (#33) | GovernorRegistry emits typed events: `AGENT_SPAWNED`, `AGENT_COMPLETED`, `AGENT_FAILED`, `REPUTATION_UPDATED`, `KNOWLEDGE_DRIFT`. Governors subscribe to relevant events. Enables: knowledge drift → trigger re-evaluation, agent failure → update reputation, fleet overload → throttle spawning. |
| FR-13 | **Meta-Governor** (#34) | Monitors all governors: Are they healthy? Are invariants being checked? Is the fleet within resource limits? Alerts operator if governance degrades. Implements self-monitoring pattern. |
| FR-14 | **Conviction-Gated Fleet Access** | dNFT conviction tier determines: max concurrent agents, allowed models, task complexity, autonomy level. Observer: read-only. Builder: 1 agent, simple tasks. Expert: 3 agents, complex tasks. Oracle: unlimited, full autonomy. |

### Tier 4: Automated Review Pipeline

| ID | Requirement | Acceptance Criteria |
|----|-------------|-------------------|
| FR-15 | **Multi-Model PR Review** | Each agent PR reviewed by 2-3 models before operator notification. Uses cheval adapters for model-specific review (Claude for security, Codex for logic, Gemini for architecture). Reviews posted as PR comments. Aggregated verdict: approve/request-changes. |
| FR-16 | **Definition of Done** | Configurable per-task-type. Default: PR created, branch synced to base, CI passing, N model reviews passing, screenshots (if UI). Agent not marked complete until all criteria met. |
| FR-17 | **Operator Review Surface** | PR summary with: AI review verdicts, test results, screenshots, diff summary, one-click merge. Accessible from all surfaces (CLI, web, Discord). |

### Tier 5: Proactive Autonomy

| ID | Requirement | Acceptance Criteria |
|----|-------------|-------------------|
| FR-18 | **Work Discovery Scanner** | Periodic scan of: GitHub issues (new, high-priority), CI failures (Sentry, test regression), dependency updates, security advisories. Proposes tasks to operator or auto-spawns based on confidence + conviction tier. |
| FR-19 | **GTM Autonomous Execution** (#12/#20) | Agent discovers and executes GTM activities: competitor analysis, content creation, documentation updates, community engagement. Operator approves strategy, agent executes. Learning loop captures what works. |
| FR-20 | **Proactive Fleet Scaling** | Monitor workload and suggest fleet size changes. Detect patterns: "Monday mornings have 3x issue volume" → pre-spawn agents. Detect quiet periods → scale down. |

### Tier 6: Infrastructure Hardening

| ID | Requirement | Acceptance Criteria |
|----|-------------|-------------------|
| FR-21 | **JWKS Key Rotation** | ES256 key served via `/.well-known/jwks.json`. Key rotation without service restart. Finn validates against JWKS endpoint. Deferred MEDIUM-2 from cycle-011 bridge. |
| FR-22 | **Enriched Reputation Query** | `GET /api/reputation/query` returns `{score, confidence, n}` instead of just `{score}`. Enables Thompson Sampling in finn for variance-aware exploration. Backward-compatible (score-only still works). |
| FR-23 | **Docker Compose E2E** (#84) | Docker Compose file: finn + dixie + postgres. Real ES256 JWT exchange. End-to-end: spawn agent → produce quality signal → update reputation → query reputation → route based on score. |

---

## 5. Technical Architecture

### 5.1 Conductor Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DIXIE CONDUCTOR SERVICE                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Fleet API     │  │ Fleet Monitor│  │ Work Discovery     │    │
│  │ (Hono routes) │  │ (cron loop)  │  │ (GitHub/Sentry/Git)│    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘    │
│         │                  │                    │                 │
│         ▼                  ▼                    ▼                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               CONDUCTOR ENGINE                            │   │
│  │  ┌───────────┐  ┌──────────┐  ┌──────────────────────┐  │   │
│  │  │ Spawner   │  │ Registry │  │ Context Enrichment    │  │   │
│  │  │ (worktree │  │ (PG +    │  │ (knowledge + reality  │  │   │
│  │  │  + tmux)  │  │  beads)  │  │  + reputation + lore) │  │   │
│  │  └───────────┘  └──────────┘  └──────────────────────┘  │   │
│  │  ┌───────────┐  ┌──────────┐  ┌──────────────────────┐  │   │
│  │  │ Model     │  │ Retry    │  │ Review Pipeline       │  │   │
│  │  │ Router    │  │ (Ralph   │  │ (multi-model review   │  │   │
│  │  │ (cheval)  │  │  Loop V2)│  │  + aggregation)       │  │   │
│  │  └───────────┘  └──────────┘  └──────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              GOVERNANCE LAYER (Hounfour)                  │   │
│  │  FleetGovernor │ MetaGovernor │ Event Bus │ Conviction    │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              NOTIFICATION LAYER                           │   │
│  │  Discord Webhook │ Telegram Bot │ WebSocket │ CLI stdout  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │              │                │
         ▼              ▼                ▼
    ┌─────────┐   ┌──────────┐    ┌──────────┐
    │ Agent 1 │   │ Agent 2  │    │ Agent N  │
    │ (Claude │   │ (Codex   │    │ (Gemini  │
    │  Code)  │   │  5.3)    │    │  review) │
    │ worktree│   │ worktree │    │ worktree │
    │ + hooks │   │ + hooks  │    │ + hooks  │
    └─────────┘   └──────────┘    └──────────┘
```

### 5.2 Agent Lifecycle

```
PROPOSED → SPAWNING → RUNNING → [PR_CREATED] → REVIEWING → READY → MERGED
                        │                                      │
                        ▼                                      ▼
                     FAILED → RETRYING (max 3) → ABANDONED    REJECTED → RETRYING
```

### 5.3 Agent Isolation Model

Each spawned agent runs in:
1. **Isolated git worktree** — own branch, own working copy
2. **Managed process** — tmux session (local) or container (freeside)
3. **Loa safety hooks active** — block-destructive-bash, mutation-logger, role-guard
4. **--dangerously-skip-permissions** — full autonomy within hook boundaries
5. **Scoped file access** — deny rules prevent access to ~/.ssh, ~/.aws, credentials
6. **Time-boxed execution** — configurable timeout per task type
7. **Resource limits** — memory/CPU caps per agent (freeside enforced)

### 5.4 Context Enrichment Pipeline

```
Task Description
    │
    ├─→ Knowledge Governance (freshness-weighted corpus retrieval)
    ├─→ Codebase Reality (/ride artifacts: types, interfaces, patterns)
    ├─→ Reputation Context (agent's past performance on similar tasks)
    ├─→ Prior Failure Analysis (if retry: what went wrong, what to avoid)
    ├─→ Lore Entries (relevant patterns from bridgebuilder reviews)
    │
    ▼
Enriched Prompt → Agent
```

### 5.5 Governed Autonomy Model

Agents run autonomously but within governance boundaries:

| Layer | What It Does | How |
|-------|-------------|-----|
| **Loa Hooks** | Block destructive commands, log mutations | PreToolUse/PostToolUse hooks |
| **Hounfour Governance** | Enforce resource limits, conviction tier caps | FleetGovernor.verify() |
| **Reputation Tracking** | Score agent performance, feed back to routing | ReputationService.processEvent() |
| **Audit Trail** | Cryptographic record of all fleet actions | MutationLogStore + AuditTrailStore |
| **Meta-Governor** | Monitor governance health itself | Self-referential health checks |

No permission prompts. The governance layer IS the safety net.

### 5.6 Agent Security Architecture [Flatline IMP-002 + SKP-001]

**Container-mandatory for production.** Local dev may use tmux with Loa hooks, but
production fleet on freeside MUST use container isolation. Prior art:
[trailofbits/claude-code-devcontainer](https://github.com/trailofbits/claude-code-devcontainer).

| Boundary | Local (dev, tmux) | Production (freeside, container) |
|----------|------------------|--------------------------------|
| **Filesystem** | Worktree-scoped, Loa deny hooks for ~/{.ssh,.aws,.gnupg,.kube} | Read-only root, writable worktree mount only. No host filesystem access. |
| **Network** | Egress allowlist (GitHub, npm, model APIs) via iptables/nftables | Network policy: allowlist egress only. No inter-agent communication. No metadata endpoint. |
| **Secrets** | Environment-injected per-task, never in worktree. Scoped tokens. | K8s/Docker secrets mounted read-only, auto-rotated. No env inheritance from host. |
| **Credentials** | No SSH keys. Git via short-lived token-scoped HTTPS. | Service account per-agent with minimal permissions. Token expires with task. |
| **Process** | tmux session isolation, no shared shell state | Container PID namespace, seccomp profile, no-new-privileges flag |
| **Memory** | Loa hooks log all mutations | Container memory limits enforced. OOM-killed agents marked as failed. **Financial data sacrosanct — never logged in plaintext.** |
| **Resources** | Advisory limits only | Hard CPU/memory limits. Disk quotas per worktree. |

**Threat model**: Agent escape (read secrets), agent-to-agent interference (shared
state), prompt injection via PR content, supply chain (malicious package scripts),
indirect exfiltration (env vars, git remotes, curl), financial data leakage.
Each addressed by container boundary + Loa mutation logging for forensics.

**Container runtime is the single source of truth for agent liveness** [SKP-002].
No PID tracking — container IDs are reliable, health checks built-in, resource limits
enforced. Reconciliation: enumerate running containers, compare to PG registry, mark
orphans. GC job cleans up. Never delete unpushed branches without snapshot.

### 5.7 Cross-Surface Auth Model [Flatline SKP-006]

**Unified SIWE + JWT model.** All surfaces authenticate via wallet signature → JWT:

```
Operator (any surface)
    │
    ├─→ Web: SIWE sign → JWT (standard flow)
    ├─→ Discord: /verify command → SIWE deep link → JWT stored per user ID
    ├─→ Telegram: /verify command → SIWE deep link → JWT stored per chat ID
    ├─→ CLI: wallet-bridge middleware (existing) → JWT
    │
    ▼
Single authZ middleware: JWT → conviction tier → fleet permissions
```

**Replay protection**: JWT includes `jti` (unique ID) + `iat` (issued at) + `exp`
(expiry). Nonce stored in PG for SIWE signatures. Discord/Telegram commands include
request hash. Webhook payloads verified via platform-specific HMAC.

**Conviction tier enforcement**: Same middleware for all surfaces. Fleet spawn
requests carry JWT. Middleware extracts conviction tier and enforces limits per
FR-14 before any fleet operation proceeds.

### 5.8 Task Registry Data Model [Flatline IMP-003]

```sql
-- Migration: 013_fleet_task_registry.sql
CREATE TABLE fleet_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   TEXT NOT NULL,          -- dNFT ID or wallet address
  agent_type    TEXT NOT NULL,          -- 'claude_code' | 'codex' | 'gemini'
  model         TEXT NOT NULL,          -- 'claude-opus-4.5' | 'gpt-5.3-codex' | ...
  task_type     TEXT NOT NULL,          -- 'bug_fix' | 'feature' | 'refactor' | 'review'
  description   TEXT NOT NULL,
  branch        TEXT NOT NULL,
  worktree_path TEXT,
  pid           INTEGER,
  tmux_session  TEXT,
  status        TEXT NOT NULL DEFAULT 'proposed',
    -- proposed → spawning → running → pr_created → reviewing → ready → merged
    -- running → failed → retrying → abandoned
    -- reviewing → rejected → retrying
  pr_number     INTEGER,
  ci_status     TEXT,                   -- 'pending' | 'passing' | 'failing'
  review_status JSONB,                  -- per-model review verdicts
  retry_count   INTEGER DEFAULT 0,
  max_retries   INTEGER DEFAULT 3,
  context_hash  TEXT,                   -- hash of enriched prompt for dedup
  spawned_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN (
    'proposed','spawning','running','pr_created','reviewing',
    'ready','merged','failed','retrying','abandoned','rejected'
  ))
);

CREATE INDEX idx_fleet_tasks_operator ON fleet_tasks(operator_id);
CREATE INDEX idx_fleet_tasks_status ON fleet_tasks(status);
CREATE INDEX idx_fleet_tasks_branch ON fleet_tasks(branch);
```

### 5.9 Failure & Degradation Modes [Flatline IMP-004]

| Failure Mode | Detection | Degradation Behavior |
|-------------|-----------|---------------------|
| **GitHub API rate limit** | 403 + X-RateLimit-Remaining: 0 | Pause fleet monitor, queue checks, resume on reset. Alert operator. |
| **Model API unavailable** | 5xx or timeout > 30s | Circuit breaker (3 failures → open). Route to alternate model. Buffer spawn requests. |
| **NATS down** | Connection error | Fall back to in-process event dispatch. Queue messages for replay on reconnect. |
| **PG connection lost** | Connection pool exhaustion | Read from LRU cache. Buffer writes. Alert operator. No new spawns until PG recovers. |
| **Agent OOM / crash** | PID disappeared + no PR | Mark as failed. Log last git state. Retry with reduced context if retry budget remains. |
| **Worktree disk full** | ENOSPC during install | Halt spawn. Run gc (clean old worktrees). Alert operator with disk usage. |
| **Webhook delivery failure** | HTTP 4xx/5xx from Discord/Telegram | Exponential backoff (3 retries). Fall back to CLI stdout. Log for retry. |

### 5.9 Dependency Caching Strategy [Flatline SKP-003]

**Hybrid approach**: pnpm shared store for local, pre-built images for production.

| Environment | Strategy | Cold Start | Warm Start |
|-------------|----------|-----------|------------|
| **Local (dev)** | pnpm with shared content-addressable store. Pre-warm from main. | ~45s | ~10s |
| **Production (freeside)** | Pre-built base images with deps. Agent spawns = pull image + mount worktree. | ~15s (image cached) | ~5s |

**Image rebuild trigger**: Lock file change (pnpm-lock.yaml) triggers image rebuild
in CI. Images tagged with lock file hash for deterministic resolution.

**Benchmark acceptance criteria**: Cold start < 60s, warm start < 15s (local).
Production: < 20s cold, < 10s warm. Measured in integration tests.

### 5.10 Resource Cost Model [Flatline IMP-001]

| Resource | Per-Agent Cost | 5 Agents | 10 Agents |
|----------|---------------|----------|-----------|
| **RAM** | ~1.5 GB (Node.js + deps) | 7.5 GB | 15 GB |
| **Disk** | ~500 MB (worktree + node_modules) | 2.5 GB | 5 GB |
| **API tokens** | ~$0.50-5.00/task (model-dependent) | $2.50-25 | $5-50 |
| **CI minutes** | ~5 min/PR (lint + test + build) | 25 min | 50 min |

**Cost controls**: FleetGovernor tracks cumulative spend per operator per day.
Conviction tier sets daily budget cap. Operator notified at 80% of budget.
Agents paused at 100%.

---

## 6. Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| Concurrent agents | 10+ (freeside), 5+ (local) | Must handle real workloads |
| Agent spawn latency | < 30s (worktree + install + launch) | Fast iteration cycles |
| Monitor cycle time | < 60s | Timely detection of events |
| Notification delivery | < 30s after event | Operator responsiveness |
| Agent timeout (default) | 2 hours per task | Prevent infinite loops |
| Retry budget | 3 attempts max per task | Bound resource usage |
| Fleet state recovery | Resume after conductor restart | PG-backed registry |
| API latency (fleet endpoints) | < 100ms (p99) | Dashboard responsiveness |

---

## 7. Scope & Prioritization

### MVP (Cycle-012 Deliverable)

| Tier | FRs | Priority | Why First |
|------|-----|----------|-----------|
| Tier 1: Conductor Core | FR-1 through FR-6 | **P0** | Foundation for everything else |
| Tier 2: CLI + Notifications | FR-7, FR-8 | **P0** | Minimum viable operator interface |
| Tier 3: Fleet Governor | FR-11, FR-14 | **P0** | Governance is the differentiator |
| Tier 6: Hardening | FR-21, FR-22 | **P1** | Command Deck P2 items |

### Phase 2 (Cycle-012 Stretch)

| Tier | FRs | Priority | Why Stretch |
|------|-----|----------|-------------|
| Tier 2: Web Dashboard | FR-9, FR-10 | **P1** | Enhances UX but CLI works first |
| Tier 3: Event Bus + Meta-Governor | FR-12, FR-13 | **P1** | Governance coordination |
| Tier 4: Review Pipeline | FR-15, FR-16, FR-17 | **P1** | Quality gate for fleet output |

### Future (Cycle-013+)

| Tier | FRs | Priority | Why Later |
|------|-----|----------|-----------|
| Tier 5: Proactive Autonomy | FR-18, FR-19, FR-20 | **P2** | Requires stable conductor first |
| Tier 6: Docker E2E | FR-23 | **P2** | Cross-repo coordination needed |
| Launch Wiring (#6) | Full API wiring + x402 | **P1** | Depends on finn P0 completion |

### Explicitly Out of Scope

- dNFT minting (#16) — separate concern, not conductor
- Multi-language hounfour ports (#17) — infrastructure, not product
- OpenCode integration (#23) — distribution, not core
- MCP tool publication (#18) — distribution, not core

---

## 8. Risks & Dependencies

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Worktree + node_modules RAM pressure | Agent count limited by memory | Freeside resource limits; shared node_modules where possible; agent pooling |
| Agent process management complexity | Orphan processes, zombie worktrees | PID tracking in registry; cleanup on conductor restart; periodic gc job |
| Context window pressure in enriched prompts | Prompts too large for model context | Tiered context: critical (always include) → relevant (include if fits) → background (omit) |
| Multi-model review pipeline latency | Slow feedback loop | Parallel reviews; cache model availability; timeout + fallback |
| Governance overhead slows throughput | Slower than Zoe's ungoverned approach | Governance checks are lightweight (in-memory, < 1ms); hooks are fast |

### Dependencies

| Dependency | Owner | Status | Impact if Delayed |
|-----------|-------|--------|-------------------|
| Freeside IaC deployment | loa-freeside | Built (#99) | Local-only mode works fine |
| Finn ReputationQueryFn wiring | loa-finn | P0 on finn side | Fleet works without reputation routing |
| Cheval model adapters | loa (upstream) | Available | Can use direct API calls as fallback |
| Claude Code Agent Teams | Anthropic | Experimental | tmux sessions work as alternative |
| Codex API access | OpenAI | Available | Claude-only fleet viable |

### Invariants

| ID | Statement | Component |
|----|-----------|-----------|
| INV-014 | Fleet agent count never exceeds conviction-tier limit | FleetGovernor |
| INV-015 | Every spawned agent is tracked in the registry | ConductorEngine |
| INV-016 | Every completed agent has a governance event in audit trail | AuditTrailStore |
| INV-017 | Retry count never exceeds configured maximum | RetryEngine |
| INV-018 | Operator notifications delivered for every terminal state (complete/fail/abandon) | NotificationService |

---

## 9. Related Issues (Cross-Repo)

| Issue | Repo | Relationship |
|-------|------|-------------|
| #24 | loa-dixie | Primary inspiration (Zoe parity) |
| #12 | loa-dixie | Autonomous GTM execution |
| #20 | loa-dixie | GTM agent capabilities |
| #6 | loa-dixie | Launch wiring prerequisite |
| #13 | loa-dixie | Oracle per community (fleet extension) |
| #33 | loa-dixie | Cross-governor event bus |
| #34 | loa-dixie | Meta-governor |
| #35 | loa-dixie | Adaptive retrieval |
| #41 | loa-dixie | Pre-swarm research planning |
| #42 | loa-dixie | Symbiotic layer (convergence detection) |
| #44 | loa-dixie | Operator skill curve |
| #66 | loa-finn | Command Deck (P2 items for dixie) |
| #84 | loa-finn | Docker Compose E2E |
| #99 | loa-freeside | Governance substrate (merged) |

---

## 10. Zoe Capability Mapping

For reference — how each Zoe capability maps to Dixie's implementation:

| Zoe Capability | Dixie Implementation | Enhancement |
|---------------|---------------------|-------------|
| Spawns agents in worktrees + tmux | FR-1: Agent Spawner | + Loa hooks, + governed autonomy |
| Tracks tasks in `.clawdbot/active-tasks.json` | FR-2: Task Registry (PG-backed) | + beads integration, + persistence across restarts |
| Cron monitoring loop | FR-3: Fleet Monitor | + governor events, + cross-governor coordination |
| Picks model per task type | FR-4: Agent Model Router | + cheval adapters, + reputation-weighted routing |
| Writes prompts from Obsidian vault | FR-5: Context Enrichment Engine | + governed knowledge, + freshness weighting, + failure analysis |
| Ralph Loop V2 (context-enriched retry) | FR-6: Failure-Aware Retry | + compound learning, + reputation tracking |
| Telegram notifications | FR-8: Multi-channel notifications | + Discord, + CLI, + web dashboard |
| Scans Sentry/meeting notes/git | FR-18: Work Discovery Scanner | + governor-coordinated, + conviction-gated |
| 3-model code review pipeline | FR-15: Multi-Model PR Review | + cheval adapters, + aggregated verdict |
| Definition of done checks | FR-16: Configurable DoD | + per-task-type, + conviction-tier-aware |
| **No equivalent** | FR-11: Fleet Governor | Hounfour governance of fleet state |
| **No equivalent** | FR-14: Conviction-Gated Access | dNFT identity as fleet access key |
| **No equivalent** | FR-12/13: Event Bus + Meta-Governor | Self-monitoring governance |
| **No equivalent** | FR-22: Reputation → routing loop | Autopoietic fleet performance optimization |
