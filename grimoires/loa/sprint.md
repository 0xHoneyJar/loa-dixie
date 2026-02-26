# Sprint Plan: Agent Fleet Orchestration — From Oracle to Conductor

**Version**: 12.0.0
**Date**: 2026-02-26
**Cycle**: cycle-012
**PRD**: v12.0.0 | **SDD**: v12.0.0
**Global Sprint Counter Start**: 86

---

## Sprint 1: Database Foundation + Task Registry

**Global ID**: 86 | **Local ID**: sprint-1
**Goal**: Stand up the fleet persistence layer — migration 013, TaskRegistry with state machine enforcement, and fleet type definitions.
**Focus**: FR-2 (Task Registry)
**Dependencies**: None (first sprint)
**Estimated Tests**: 22–28

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-1.1 | **Create shared fleet type definitions** | Define `FleetTaskStatus`, `AgentType`, `TaskType`, `SpawnRequest`, `SpawnResult`, `FleetStatusSummary`, `FleetTaskSummary`, `FleetTaskRecord` types per SDD §2.1. Export from barrel. All 12 status values present including `cancelled` (Flatline SKP-005). | `app/src/types/fleet.ts` |
| T-1.2 | **Create migration 013_fleet_orchestration.sql** | Three tables: `fleet_tasks` (with version column for optimistic concurrency, all CHECK constraints per SDD §3.1), `fleet_notifications` (FK to fleet_tasks, delivery tracking), `fleet_config` (operator-level preferences). Indexes: operator, status, branch, created_at DESC, partial index on active statuses. Triggers: `updated_at` auto-update on fleet_tasks and fleet_config. Idempotent (IF NOT EXISTS). Include `013_fleet_orchestration_down.sql` rollback migration: tables dropped in reverse order (fleet_config, fleet_notifications, fleet_tasks). Document expand/contract strategy in migration comment header. (Flatline SKP-001) | `app/src/db/migrations/013_fleet_orchestration.sql`, `app/src/db/migrations/013_fleet_orchestration_down.sql` |
| T-1.3 | **Implement TaskRegistry — CRUD operations** | `create()` inserts record at status `proposed`, returns UUID. `get()` fetches by ID. `query()` supports filters: operatorId, status (single or array), agentType, taskType, since, limit (default 50). `countActive()` counts non-terminal tasks per operator. `countAllActive()` counts all non-terminal. `delete()` only works on terminal tasks. `listLive()` returns non-terminal tasks for reconciliation. All queries use parameterized SQL (no interpolation). | `app/src/services/task-registry.ts` |
| T-1.4 | **Implement TaskRegistry — state machine transitions** | `transition()` validates against `VALID_TRANSITIONS` map (all 11 states + `cancelled`). Uses optimistic concurrency: `UPDATE ... SET version = version + 1 WHERE id = $id AND version = $expected_version`. Returns updated `FleetTaskRecord`. Throws `InvalidTransitionError` for illegal transitions. Throws `StaleVersionError` when version mismatch (row count 0). Accepts optional metadata for worktreePath, containerId, tmuxSession, prNumber, ciStatus, reviewStatus, failureContext, spawnedAt, completedAt. | `app/src/services/task-registry.ts` |
| T-1.5 | **Implement TaskRegistry — failure recording** | `recordFailure()` increments `retry_count` atomically with `WHERE retry_count < max_retries` guard. Records `failure_context` JSONB. Returns updated record. If retry_count already at max, does not increment (DB constraint prevents it). | `app/src/services/task-registry.ts` |
| T-1.6 | **Export VALID_TRANSITIONS as a constant** | `VALID_TRANSITIONS` map exported as a typed `Record<FleetTaskStatus, FleetTaskStatus[]>` constant (not just an exported value) for use by tests and other components. Maps each `FleetTaskStatus` to its valid target statuses per SDD §1.2 lifecycle diagram. `cancelled` has empty array (terminal). `merged`, `abandoned` have empty arrays (terminal). Additionally export a `TERMINAL_STATUSES: Set<FleetTaskStatus>` constant containing all statuses with empty transition arrays. (Flatline IMP-002) | `app/src/services/task-registry.ts` |
| T-1.7 | **Unit tests: TaskRegistry CRUD** | Test `create()` returns UUID, status defaults to `proposed`, version defaults to 0. Test `get()` returns null for unknown ID. Test `query()` filters by status, operatorId, limit. Test `countActive()` counts only non-terminal statuses. Test `delete()` rejects active tasks (throws). Test `delete()` succeeds on terminal tasks. All tests use mocked PG pool. | `app/src/services/__tests__/task-registry.test.ts` |
| T-1.8 | **Unit tests: TaskRegistry state machine** | Test all valid transitions from SDD §1.2 (proposed->spawning, spawning->running, running->pr_created, running->failed, running->cancelled, etc.). Test all INVALID transitions throw `InvalidTransitionError` (e.g., proposed->running, merged->anything, cancelled->anything). Test optimistic concurrency: stale version throws `StaleVersionError`. Test metadata updates during transition (prNumber, ciStatus, spawnedAt, completedAt). Minimum 15 transition test cases covering every edge in the state machine. | `app/src/services/__tests__/task-registry.test.ts` |
| T-1.9 | **Unit tests: failure recording** | Test `recordFailure()` increments retry_count. Test failure_context stored as JSONB. Test retry_count cannot exceed max_retries (DB constraint guard). Test concurrent recordFailure calls (only one succeeds in incrementing). | `app/src/services/__tests__/task-registry.test.ts` |
| T-1.10 | **Configure PG connection pool for fleet workload** | Set pool config: min=2, max=10, idleTimeoutMillis=30000, connectionTimeoutMillis=5000. Configure statement_timeout per query class. Pool lifecycle: call `pool.end()` on graceful shutdown (SIGTERM/SIGINT handler). Export pool config as typed constant. Log pool drain on shutdown. (Flatline IMP-001) | `app/src/db/pool.ts` |
| T-1.11 | **Integration test: migration 013 against real PG** | Test migration 013 runs cleanly on fresh PG instance. Verify all CHECK constraints reject invalid data (invalid status, negative retry_count, etc.). Verify `updated_at` triggers fire correctly on UPDATE. Verify all indexes exist via `pg_indexes` query. Verify column types, constraint names, and index definitions match expected schema — fail fast on mismatch (Flatline SKP-002). Use test-pg or pg-mem. (Flatline IMP-003, SKP-002) | `app/tests/integration/migration-013.test.ts` |
| T-1.12 | **Add RLS policies for tenant isolation on all fleet tables** | Enable RLS on fleet_tasks, fleet_notifications, AND fleet_config tables. Create policies restricting SELECT/UPDATE/DELETE to rows where `current_setting('app.operator_id') = operator_id`. Admin bypass via `current_setting('app.is_admin') = 'true'`. Set `app.operator_id` in transaction context from JWT middleware. fleet_notifications inherits tenant from FK join to fleet_tasks. fleet_config scoped by operator_id column. Test RLS enforcement in integration test: verify operator A cannot read operator B's tasks OR notifications OR config, verify admin can read all. Test cross-table join paths enforce tenant predicates. (Flatline SKP-008, Beads SKP-001) | `app/src/db/migrations/013_fleet_orchestration.sql`, `app/src/middleware/fleet-auth.ts` |

---

## Sprint 2: Agent Spawner + Container Isolation

**Global ID**: 87 | **Local ID**: sprint-2
**Goal**: Implement the agent process lifecycle — git worktree creation, tmux/container spawning, cleanup, and all security hardening from the Flatline review.
**Focus**: FR-1 (Agent Spawner)
**Dependencies**: Sprint 1 (fleet types)
**Estimated Tests**: 17–20

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-2.1 | **Implement AgentSpawner — config and types** | `AgentSpawnerConfig` interface with worktreeBaseDir, mode (local/container), containerImage, containerRuntime (docker/podman), repoRoot, loaHooksPath, defaultTimeoutMinutes, maxConcurrentAgents, pnpmStorePath. `AgentHandle` interface with taskId, branch, worktreePath, processRef, mode, spawnedAt. `AgentEnvironment` interface for scoped secrets. `SpawnError` typed error with codes: WORKTREE_FAILED, INSTALL_FAILED, PROCESS_FAILED, TIMEOUT. | `app/src/services/agent-spawner.ts` |
| T-2.2 | **Implement AgentSpawner.spawn() — local mode** | (1) Validate branch name against `/^[a-zA-Z0-9._\/-]+$/` with max 128 chars (Flatline SKP-002). (2) Validate worktree path is under worktreeBaseDir using `path.resolve()` — reject path traversal. (3) Create worktree via `execFile('git', ['worktree', 'add', ...])` — NO shell interpolation. (4) Run `pnpm install --frozen-lockfile` via `execFile`. (5) Copy Loa hooks if configured. (6) Launch tmux session via `execFile('tmux', ['new-session', ...])`. (7) Pass prompt via stdin pipe, NEVER as CLI arg (Flatline SKP-002). (8) Return AgentHandle. On failure at any step: cleanup partial state, throw typed SpawnError. | `app/src/services/agent-spawner.ts` |
| T-2.3 | **Implement AgentSpawner.spawn() — container mode** | Same validation as local. Create worktree. Run `docker run -d` (or podman) with: `--read-only`, `--tmpfs /tmp`, `-v <worktree>:/workspace`, `--memory=2g`, `--cpus=2`, `--security-opt no-new-privileges`, `--cap-drop ALL`, `--cap-add NET_BIND_SERVICE`, `--security-opt seccomp=fleet-seccomp.json` (default profile, restrict dangerous syscalls), `--network fleet-egress`, `--env-file <scoped-env>` (temp file 0600, deleted after start). Rootless mode preferred when runtime supports it (`--userns=keep-id` for podman). Labels: `dixie-fleet=true`, `fleet-task-id=<id>`. All args via `execFile` (no shell). Return AgentHandle with container ID. (Beads IMP-005) | `app/src/services/agent-spawner.ts` |
| T-2.4 | **Implement AgentSpawner — liveness and lifecycle** | `isAlive()`: local mode checks `tmux has-session -t <session>`, container mode checks `docker inspect --format '{{.State.Running}}'`. `kill()`: local kills tmux session, container does `docker stop` (30s grace) then `docker rm`. `getLogs()`: local uses `tmux capture-pane`, container uses `docker logs --tail`. `cleanup()`: verifies all changes pushed (snapshot to .fleet-snapshots/ if unpushed), then `git worktree remove`, then `git branch -d` (only if merged). Never deletes unpushed branches without snapshot. | `app/src/services/agent-spawner.ts` |
| T-2.5 | **Implement AgentSpawner.listActive()** | Lists all active agent handles by enumerating: local mode scans tmux sessions matching `fleet-*` prefix, container mode runs `docker ps --filter label=dixie-fleet`. Returns AgentHandle[] for reconciliation. | `app/src/services/agent-spawner.ts` |
| T-2.6 | **Docker socket proxy configuration** | Document and implement DOCKER_HOST configuration for socket proxy per SDD §5.1.1 (Flatline IMP-002). AgentSpawner reads `DOCKER_HOST` env var (default: `unix:///var/run/docker.sock` for dev, `tcp://docker-proxy:2375` for production). Add config field for proxy endpoint. | `app/src/services/agent-spawner.ts` |
| T-2.7 | **Unit tests: branch and path validation** | Test valid branch names accepted. Test invalid branch names rejected (shell metacharacters, spaces, null bytes, > 128 chars). Test path traversal detection (../../etc/passwd). Test worktree path must be under worktreeBaseDir. | `app/src/services/__tests__/agent-spawner.test.ts` |
| T-2.8 | **Unit tests: spawn local mode** | Test successful spawn: worktree created, pnpm install run, tmux session started. Test spawn failure at worktree step: SpawnError(WORKTREE_FAILED). Test spawn failure at install step: cleanup worktree, SpawnError(INSTALL_FAILED). Test spawn failure at tmux step: cleanup, SpawnError(PROCESS_FAILED). All subprocess calls mocked via vi.mock('child_process'). Verify execFile called with argument arrays (no shell). | `app/src/services/__tests__/agent-spawner.test.ts` |
| T-2.9 | **Unit tests: spawn container mode** | Test successful container spawn: docker run with correct flags (--read-only, --memory, --cpus, --no-new-privileges, --network, labels). Test env file creation (0600 perms) and deletion after start. Test container failure cleanup. Mock docker commands. | `app/src/services/__tests__/agent-spawner.test.ts` |
| T-2.10 | **Unit tests: liveness, kill, cleanup, listActive** | Test isAlive returns true/false correctly for both modes. Test kill sequence (stop then rm for containers). Test cleanup snapshots unpushed work. Test cleanup removes worktree and branch. Test listActive filters by fleet prefix/label. | `app/src/services/__tests__/agent-spawner.test.ts` |
| T-2.11 | **Implement agent secret management** | Define `AgentSecretProvider` interface with `getSecrets(taskId, scope): Promise<Record<string, string>>`. Scoped secrets: only the minimum env vars needed per agent type. Secret rotation: GitHub tokens via per-spawn issuance (SDD IMP-005), API keys via encrypted fleet_config. Secret cleanup: env file deleted within 5s of agent start, memory zeroed. Audit trail entry for each secret issuance. Unit tests: scoped secret retrieval, cleanup timing, audit logging. (Flatline IMP-004) | `app/src/services/agent-secret-provider.ts`, `app/src/services/__tests__/agent-secret-provider.test.ts` |

---

## Sprint 3: Fleet Monitor + Reconciliation

**Global ID**: 88 | **Local ID**: sprint-3
**Goal**: Implement the monitoring loop that detects agent completion, failure, stall, and timeout — plus startup reconciliation for crash recovery.
**Focus**: FR-3 (Fleet Monitor), IMP-003 (Reconciliation)
**Dependencies**: Sprint 1 (TaskRegistry), Sprint 2 (AgentSpawner)
**Estimated Tests**: 15–19

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-3.1 | **Implement GitHubCli helper** | `getPrForBranch(branch)`: runs `gh pr list --head <branch> --json number,state --limit 1` via execFile, parses JSON, returns `{number, state}` or null. `getCiStatus(prNumber)`: runs `gh pr checks <number>`, aggregates to 'pending'/'passing'/'failing'. `getLastCommitTimestamp(worktreePath)`: runs `git -C <path> log --oneline -1 --format=%ct`. All commands use execFile with timeouts. Rate limit detection: check stderr for 'rate limit', return null with logged warning. | `app/src/services/fleet-monitor.ts` |
| T-3.2 | **Implement FleetMonitor.reconcile()** | Called once during conductor startup (Flatline IMP-003). (1) Get running processes via `spawner.listActive()`. (2) Get live task records via `taskRegistry.listLive()`. (3) Orphaned records (in registry, no process): mark as `failed` with failureContext `{reason: 'conductor_restart'}`. (4) Untracked processes (alive, not in registry): log WARNING, do NOT auto-kill. (5) Return `ReconcileResult` with counts. Emit events for orphaned and untracked. | `app/src/services/fleet-monitor.ts` |
| T-3.3 | **Implement FleetMonitor.runCycle()** | For each live task: (1) Check process alive via spawner.isAlive(). (2) If dead + no PR: transition to `failed`, trigger retry via RetryEngine. (3) If alive + status `running`: check for PR via GitHubCli.getPrForBranch(). (4) If PR found: transition to `pr_created`, record prNumber. (5) If PR exists: check CI status, update ciStatus. (6) Check for stall (no git commits > stallThresholdMinutes). (7) Check for timeout (spawnedAt + timeout exceeded). (8) Emit events for all transitions. (9) Notify operator on terminal states. Return MonitorCycleResult with counts. | `app/src/services/fleet-monitor.ts` |
| T-3.4 | **Implement FleetMonitor.start() and stop()** | `start()` sets up setInterval with configured intervalMs, guards against double-start. `stop()` clears interval, sets running=false. Monitor loop catches all exceptions at top level (never crashes). Cycle deadline: configurable timeout per cycle (default 60s) — abort cycle if exceeded. Overlap prevention: skip cycle if previous cycle still running. Degraded-dependency handling: if GH API or DB unavailable, log warning and skip affected checks rather than crashing. Health status reporting: `getHealth(): {running: boolean, lastCycleMs: number, cycleCount: number, errors: number}`. (Flatline IMP-005) | `app/src/services/fleet-monitor.ts` |
| T-3.5 | **Unit tests: GitHubCli** | Test getPrForBranch with PR found, PR not found, rate limit error. Test getCiStatus with passing, failing, pending checks. Test getLastCommitTimestamp with valid/null output. All gh/git commands mocked. | `app/src/services/__tests__/fleet-monitor.test.ts` |
| T-3.6 | **Unit tests: reconciliation** | Test orphaned records marked failed with correct failureContext. Test untracked processes logged but not killed. Test healthy matches counted correctly. Test empty fleet (no processes, no records) returns zeros. Test mixed scenario: 2 healthy, 1 orphan, 1 untracked. | `app/src/services/__tests__/fleet-monitor.test.ts` |
| T-3.7 | **Unit tests: monitor cycle** | Test dead agent with no PR triggers retry. Test alive agent with new PR transitions to pr_created. Test CI status update on existing PR. Test stall detection after threshold. Test timeout detection. Test error in one task does not crash cycle for other tasks. Test terminal state notifications sent. | `app/src/services/__tests__/fleet-monitor.test.ts` |

---

## Sprint 4: Model Router + Context Enrichment

**Global ID**: 89 | **Local ID**: sprint-4
**Goal**: Implement intelligent model selection based on task type and reputation, plus the context enrichment engine that assembles governance-aware prompts for fleet agents.
**Focus**: FR-4 (Agent Model Router), FR-5 (Context Enrichment Engine)
**Dependencies**: Sprint 1 (fleet types), existing ReputationService, EnrichmentService, KnowledgeGovernor
**Estimated Tests**: 14–16

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-4.1 | **Implement AgentModelRouter** | `ModelRoutingConfig` with defaults per task type (bug_fix→claude-opus-4-6, feature→claude-opus-4-6, refactor→codex-mini-latest, review→gemini-2.5-pro, docs→claude-sonnet-4-5), fallback model, availableModels list. `selectModel()` priority: (1) explicit override, (2) reputation-weighted (query ReputationService for cohort scores per model on task type), (3) task-type default, (4) fallback. Returns `RoutingDecision` with agentType, model, reason, reputationScore. `setModelAvailability()` toggles model health. | `app/src/services/agent-model-router.ts` |
| T-4.2 | **Implement DEFAULT_MODEL_ROUTING_CONFIG** | Export default config constant matching SDD §2.5 routing table. Available models list with strengths per task type. Fallback: claude_code / claude-opus-4-6. | `app/src/services/agent-model-router.ts` |
| T-4.3 | **Implement ContextEnrichmentEngine — prompt assembly** | `buildPrompt()` assembles three-tier context: CRITICAL (always: task description, repo context, safety instructions), RELEVANT (if fits: knowledge corpus via KnowledgeGovernor with freshness filtering, failure analysis for retries, reputation context), BACKGROUND (if space: lore entries, compound learning insights, PR history). Each section tagged with tier, label, tokenEstimate. Sections included in tier order. If total exceeds maxPromptTokens (default 8000), lower-priority sections truncated/omitted. Returns `EnrichedPrompt` with prompt string, contextHash (SHA-256), sections list, totalTokenEstimate, truncated flag. | `app/src/services/context-enrichment-engine.ts` |
| T-4.4 | **Implement ContextEnrichmentEngine — failure capture** | `captureFailureContext()` reads from worktree: last git diff (truncated to 2000 chars), list of modified files, error output, exit code. Returns `FailureAnalysis` object. Sanitizes failure context to remove env vars, paths outside worktree, and strings matching secret patterns (`/[A-Za-z0-9+/=]{40,}/`). | `app/src/services/context-enrichment-engine.ts` |
| T-4.5 | **Unit tests: AgentModelRouter** | Test default routing for each task type. Test explicit override bypasses routing. Test reputation-weighted selection (mock ReputationService with cohort scores). Test unavailable model falls back. Test fallback model used when all others unavailable. Test setModelAvailability toggles correctly. | `app/src/services/__tests__/agent-model-router.test.ts` |
| T-4.6 | **Unit tests: ContextEnrichmentEngine — prompt assembly** | Test critical sections always included regardless of token budget. Test relevant sections included when budget allows. Test background sections omitted when budget tight. Test truncated flag set when sections pruned. Test contextHash is deterministic (same input = same hash). Test freshness filtering (stale corpus items excluded). Test failure analysis included for retry prompts. | `app/src/services/__tests__/context-enrichment-engine.test.ts` |
| T-4.7 | **Unit tests: ContextEnrichmentEngine — failure capture** | Test failure context captured from mocked worktree. Test git diff truncation at 2000 chars. Test sanitization removes env-var-like strings. Test sanitization removes secret-pattern strings. Test null exit code handled. | `app/src/services/__tests__/context-enrichment-engine.test.ts` |

---

## Sprint 5: Retry Engine + Fleet Governor + Conviction Gating

**Global ID**: 90 | **Local ID**: sprint-5
**Goal**: Implement the intelligent retry engine (Ralph Loop V2) and the FleetGovernor with DB-transactional admission control and conviction-tier enforcement.
**Focus**: FR-6 (Retry Engine), FR-11 (Fleet Governor), FR-14 (Conviction Gating)
**Dependencies**: Sprint 1 (TaskRegistry), Sprint 2 (AgentSpawner), Sprint 4 (ContextEnrichmentEngine)
**Estimated Tests**: 20–24

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-5.1 | **Implement RetryEngine** | `attemptRetry()`: (1) Load task from registry, (2) Check retry budget (INV-017: retryCount < maxRetries), (3) If exhausted: transition to `abandoned`, notify operator, return false, (4) Capture failure context via ContextEnrichmentEngine, (5) Build enriched retry prompt with failure analysis, (6) Transition: failed->retrying->spawning, (7) Spawn new agent (same worktree or fresh), (8) Emit AGENT_RETRYING event, (9) Return true. `canRetry()`: reads task and checks budget. Config: maxRetries (default 3), retryDelayMs (default 30000), reduceContextOnOom (default true). Global backpressure: if totalActive > 80% of fleet capacity, delay retry by 2x. Exponential backoff with jitter: delay = min(retryDelayMs * 2^attempt + random(0, 1000), 120000). (Beads SKP-005) | `app/src/services/retry-engine.ts` |
| T-5.2 | **Implement RetryEngine — OOM handling** | When failure context indicates OOM (exit code 137, or error message matches OOM patterns), and `reduceContextOnOom` is true: reduce maxPromptTokens by 25% for retry prompt. Log reduced context strategy. | `app/src/services/retry-engine.ts` |
| T-5.3 | **Implement FleetGovernor — GovernedResource** | Extends `GovernedResourceBase<FleetState, FleetEvent, FleetInvariant>`. FleetState: activeByOperator, totalActive, dailySpend, tierLimits. Default tier limits per SDD §2.8: observer=0, participant=0, builder=1, architect=3, sovereign=10. `canSpawn()`: fast in-memory pre-check (READ-PATH CACHE ONLY per Flatline SKP-003). Returns `{allowed, reason}`. `transition()`: handles agent_spawned (increment), agent_completed (decrement), agent_failed (decrement), config_updated events. Records mutations in audit trail. | `app/src/services/fleet-governor.ts` |
| T-5.4 | **Implement FleetGovernor.admitAndInsert()** | DB-transactional admission control (Flatline SKP-003). BEGIN transaction with row-level locking: `SELECT COUNT(*) FROM fleet_tasks WHERE operator_id = $1 AND status IN (...active...) FOR UPDATE`. Compare count against tier limit. If under limit: INSERT new task, COMMIT, update in-memory state, return task ID. If at limit: ROLLBACK, throw SpawnDeniedError. This is the AUTHORITATIVE gate — canSpawn() is cache only. | `app/src/services/fleet-governor.ts` |
| T-5.5 | **Implement FleetGovernor — invariant verification** | `verify('INV-014')`: for each operator, check activeByOperator[op] <= tierLimits[tier]. `verify('INV-015')`: compare totalActive against PG countAllActive(). `verify('INV-016')`: query terminal tasks, verify each has audit trail entry. All return `InvariantResult` with satisfied flag and detail. | `app/src/services/fleet-governor.ts` |
| T-5.6 | **Implement CrossGovernorEventBus** | Wraps existing SignalEmitter. `on(eventType, handler)`: register handler. `emit(event)`: invoke in-process handlers first, then publish to NATS via SignalEmitter (fire-and-forget). NATS failure does not block. `off(eventType)`: remove handlers. Fleet event types: AGENT_SPAWNED, AGENT_COMPLETED, AGENT_FAILED, AGENT_RETRYING, REPUTATION_UPDATED, KNOWLEDGE_DRIFT, FLEET_OVERLOAD, GOVERNANCE_ALERT. NATS subjects: `dixie.signal.fleet.*`. | `app/src/services/cross-governor-event-bus.ts` |
| T-5.7 | **Unit tests: RetryEngine** | Test successful retry with budget remaining. Test budget exhaustion transitions to abandoned. Test enriched retry prompt includes failure analysis. Test OOM detection reduces context. Test retry delay respected. Test `canRetry()` returns true/false correctly. Test cancelled tasks excluded from retry (Flatline SKP-005). Test notification sent on abandonment. | `app/src/services/__tests__/retry-engine.test.ts` |
| T-5.8 | **Unit tests: FleetGovernor** | Test canSpawn per conviction tier (observer denied, builder 1, architect 3, sovereign 10). Test canSpawn at limit returns false. Test transition updates activeByOperator correctly on spawn/complete/fail. Test admitAndInsert succeeds under limit. Test admitAndInsert denied at limit. Test invariant verification (INV-014, INV-015, INV-016) for pass and fail cases. Test DEFAULT_TIER_LIMITS match SDD. | `app/src/services/__tests__/fleet-governor.test.ts` |
| T-5.9 | **Unit tests: CrossGovernorEventBus** | Test handler registration and invocation. Test multiple handlers for same event. Test emit publishes to NATS when available. Test emit gracefully degrades when NATS unavailable. Test off() removes handlers. Test event payload structure. | `app/src/services/__tests__/cross-governor-event-bus.test.ts` |
| T-5.10 | **INV-014 through INV-018 verification tests** | Dedicated test suite verifying all 5 fleet invariants per SDD §8. INV-014: tier limit enforcement. INV-015: registry tracking (spawn before agent). INV-016: audit trail for terminal states. INV-017: retry count bounded by max. INV-018: notification for every terminal state. These tests use integrated mocks (TaskRegistry + FleetGovernor + ConductorEngine) to verify invariants hold across component interactions. | `app/src/services/__tests__/fleet-invariants.test.ts` |
| T-5.11 | **Implement saga coordinator for multi-step fleet operations** | `FleetSaga` class wrapping spawn flow: each step is a compensatable action. Steps: (1) admitAndInsert (compensate: delete task), (2) createWorktree (compensate: remove worktree), (3) spawnProcess (compensate: kill process), (4) transitionToRunning (compensate: transition to failed). Idempotency token on spawn requests: SHA-256 of `description + timestamp + operatorId`. Duplicate token returns existing task, not new spawn. Store saga state in `fleet_tasks.metadata` JSONB. Unit tests: kill at each step and verify compensation runs in reverse order. Test idempotency token deduplication. (Flatline SKP-007) | `app/src/services/fleet-saga.ts`, `app/src/services/__tests__/fleet-saga.test.ts` |

---

## Sprint 6: Conductor Engine + CLI + Auth

**Global ID**: 91 | **Local ID**: sprint-6
**Goal**: Wire all components into the ConductorEngine orchestrator, create fleet API routes with auth middleware, and integrate into server.ts.
**Focus**: FR-7 (CLI Fleet Commands), FR-10 partial (fleet routes), SDD §10 (server integration)
**Dependencies**: Sprints 1–5 (all conductor components)
**Estimated Tests**: 20–25

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-6.1 | **Implement ConductorEngine** | Orchestrates all components per SDD §2.1. `spawn()`: uses FleetSaga from T-5.11 for compensation on partial failure — (1) canSpawn governor check, (2) selectModel via router, (3) admitAndInsert via governor (authoritative gate), (4) buildPrompt via enrichment, (5) spawn via AgentSpawner, (6) transition proposed->spawning->running, (7) emit AGENT_SPAWNED, (8) audit trail entry, (9) return SpawnResult. Each step in spawn flow wrapped in try/catch with explicit compensation calls. On any step failure, all previous steps compensated in reverse order. Audit trail includes compensation events. (Flatline IMP-007) `getStatus()`: queries TaskRegistry. `getTask()`: single task lookup. `stopTask()`: kills agent, transitions to `cancelled` (Flatline SKP-005), emits event, notifies. `getTaskLogs()`: delegates to spawner. `deleteTask()`: validates terminal state, cleans up worktree, deletes record. `start()`: calls reconcile then starts monitor. `shutdown()`: stops monitor, drains events. | `app/src/services/conductor-engine.ts` |
| T-6.2 | **Implement CrossSurfaceAuthMiddleware** | Per SDD §2.11. STRIPS spoofable headers (x-conviction-tier, x-wallet-address, x-fleet-operator-id, x-fleet-conviction-tier) BEFORE processing (Flatline SKP-001). Derives identity from verified JWT claims ONLY. Enforces FLEET_MINIMUM_TIER (builder). Sets x-fleet-operator-id and x-fleet-conviction-tier from JWT for downstream handlers. `checkFleetOperation()` helper for per-operation tier checks. | `app/src/middleware/fleet-auth.ts` |
| T-6.3 | **Implement fleet routes — spawn and status** | `POST /api/fleet/spawn`: validates body via TypeBox (description, taskType, optional overrides), calls conductor.spawn(), returns 201 with SpawnResult. `GET /api/fleet/status`: returns FleetStatusSummary. Tenant isolation (Flatline SKP-004): default scope is caller-only (filter by JWT operator). `?all=true` requires admin/oracle tier. | `app/src/routes/fleet.ts` |
| T-6.4 | **Implement fleet routes — task operations** | `GET /api/fleet/tasks/:id`: task detail with ownership enforcement (Flatline IMP-007). `POST /api/fleet/tasks/:id/stop`: kills agent, requires builder+. `GET /api/fleet/tasks/:id/logs`: last N lines. `DELETE /api/fleet/tasks/:id`: cleanup, requires terminal state. All task-specific routes use enforceOwnership middleware per SDD §4.1. Admin/oracle bypass ownership. | `app/src/routes/fleet.ts` |
| T-6.5 | **Implement fleet routes — config** | `GET /api/fleet/config`: returns fleet configuration (sovereign only per SDD §2.11). `POST /api/fleet/notifications/test`: sends test notification to all configured channels (builder+). | `app/src/routes/fleet.ts` |
| T-6.6 | **Wire fleet subsystem into server.ts** | Follow SDD §10.1 exactly. Instantiate TaskRegistry, FleetGovernor (register with GovernorRegistry), CrossGovernorEventBus, NotificationService, AgentSpawner, AgentModelRouter, ContextEnrichmentEngine, RetryEngine, FleetMonitor, ConductorEngine. Conditional on DATABASE_URL. Register fleet routes at `/api/fleet`. Extend DixieApp interface with conductorEngine and fleetGovernor. Graceful degradation: fleet disabled when DB unavailable. | `app/src/server.ts` |
| T-6.7 | **Add fleet config fields to DixieConfig** | Add all DIXIE_FLEET_* env vars from SDD §9.3: ENABLED, MODE, WORKTREE_DIR, CONTAINER_IMAGE, CONTAINER_RUNTIME, REPO_ROOT, MONITOR_INTERVAL_MS, MAX_CONCURRENT, DEFAULT_TIMEOUT_MIN, DISCORD_WEBHOOK_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ENCRYPTION_KEY. Parse from env with defaults. | `app/src/config.ts` |
| T-6.8 | **Unit tests: ConductorEngine** | Test spawn flow: governor allows -> model selected -> task created -> prompt built -> agent spawned -> events emitted -> audit logged. Test spawn denied by governor (403). Test stopTask transitions to cancelled and notifies. Test getStatus returns correct counts. Test deleteTask rejects active tasks. Test start() calls reconcile then starts monitor. Test shutdown() stops monitor. | `app/src/services/__tests__/conductor-engine.test.ts` |
| T-6.9 | **Unit tests: fleet auth middleware** | Test header stripping (spoofable headers removed). Test valid JWT with builder tier passes. Test missing JWT returns 401. Test observer tier returns 403 for spawn. Test observer tier passes for status (read-only). Test checkFleetOperation for each operation/tier combo. | `app/src/middleware/__tests__/fleet-auth.test.ts` |
| T-6.10 | **Unit tests: fleet routes** | Test POST /spawn with valid body returns 201. Test POST /spawn with invalid body returns 400. Test GET /status returns summary. Test GET /tasks/:id returns detail. Test POST /tasks/:id/stop returns 200. Test DELETE /tasks/:id on active returns 409. Test ownership enforcement (wrong operator gets 403). Test tenant isolation (non-admin cannot ?all=true). | `app/src/routes/__tests__/fleet.test.ts` |
| T-6.11 | **Integration test: spawn-to-complete cycle** | End-to-end test with real (mocked-spawner) PG: POST /spawn -> verify task in registry -> mock monitor detects PR -> status updated -> mock review passes -> task reaches `ready`. Verifies full lifecycle through real database. | `app/tests/integration/conductor-pg.test.ts` |

---

## Sprint 7: Notifications + Review Pipeline

**Global ID**: 92 | **Local ID**: sprint-7
**Goal**: Implement multi-channel notification delivery with exponential backoff, and the multi-model PR review pipeline with aggregated verdicts.
**Focus**: FR-8 (Notifications), FR-15 (Multi-Model PR Review), FR-16 (Definition of Done)
**Dependencies**: Sprint 3 (FleetMonitor), Sprint 5 (CrossGovernorEventBus), Sprint 6 (ConductorEngine)
**Estimated Tests**: 18–22

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-7.1 | **Implement NotificationService — core delivery** | `send()` delivers to all configured channels in parallel. Individual channel failures do not block others. For each channel: insert record into fleet_notifications BEFORE delivery attempt (INV-018). Exponential backoff: delay = baseDelay * 2^attempt (capped at 30s). After maxRetries failures, falls back to CLI stdout. Returns DeliveryResult[] per channel. | `app/src/services/notification-service.ts` |
| T-7.2 | **Implement NotificationService — Discord webhook** | POST to Discord webhook URL with embed format: title (Fleet Agent Update), type, taskId, summary, PR link, branch. Color-coded: green for success, red for failure, yellow for warnings. Rate limit handling: respect Discord 429 responses. | `app/src/services/notification-service.ts` |
| T-7.3 | **Implement NotificationService — Telegram bot** | POST to `https://api.telegram.org/bot<token>/sendMessage` with MarkdownV2 format. Includes: type, taskId, summary, PR link, branch. Handles 429 (Too Many Requests) with retry-after. | `app/src/services/notification-service.ts` |
| T-7.4 | **Implement NotificationService — CLI output** | Log notification to structured stdout (always succeeds). Format: `[FLEET] <type> | <taskId> | <summary>`. CLI is the fallback when all other channels fail. | `app/src/services/notification-service.ts` |
| T-7.5 | **Implement Review Pipeline** | Triggered when FleetMonitor detects PR and task transitions to `reviewing`. Spawns 2-3 review agents via cheval adapters with distinct focus: Claude (security), Codex/GPT (logic), Gemini (architecture). Each reviewer receives PR diff via `gh pr diff`. Verdict types: approve, request_changes, comment. Aggregation: ALL approve -> `ready`, ANY request_changes -> `rejected`, timeout (30min) -> `ready` with warning. Results stored in fleet_tasks.review_status JSONB. Missing reviewer treated as implicit `comment`. | `app/src/services/fleet-monitor.ts` (review pipeline section) |
| T-7.6 | **Implement Definition of Done checks** | Configurable per task type. Default DoD: PR created, branch synced to base, CI passing, N model reviews passing. Agent not marked complete until all criteria met. DoD status included in task detail response. | `app/src/services/fleet-monitor.ts` |
| T-7.7 | **Unit tests: NotificationService** | Test Discord delivery (mock fetch, verify embed format). Test Telegram delivery (mock fetch, verify MarkdownV2). Test CLI output (verify stdout). Test exponential backoff (verify delays). Test fallback to CLI on webhook failure. Test INV-018: notification record created before delivery. Test all notification types: spawned, completed, failed, abandoned, pr_ready, ci_failed. | `app/src/services/__tests__/notification-service.test.ts` |
| T-7.8 | **Unit tests: Review Pipeline** | Test 3 reviewers all approve -> task ready. Test 1 reviewer requests_changes -> task rejected. Test reviewer timeout -> task ready with warning. Test missing reviewer -> implicit comment. Test review results stored in review_status. Test retry after rejection includes review comments in context. | `app/src/services/__tests__/fleet-monitor.test.ts` (review section) |
| T-7.9 | **Implement transactional outbox for durable event delivery** | `OutboxTable` in PG: columns id, event_type, payload (JSONB), created_at, processed_at, retry_count, dedup_key (UNIQUE). Insert outbox entry in same transaction as state change (atomic). `OutboxWorker` polls unprocessed entries, delivers to NATS/webhooks, marks processed_at on success. At-least-once delivery with dedup_key for sender-side deduplication. Receiver-side idempotency via event ID. Replace fire-and-forget NATS publish in CrossGovernorEventBus with outbox insert. Add migration for outbox table. Unit tests: crash after state change but before delivery — verify outbox replays on next poll. Test dedup_key prevents duplicate entries. Test OutboxWorker retry with backoff. (Flatline SKP-009) | `app/src/services/outbox-worker.ts`, `app/src/db/migrations/014_outbox.sql`, `app/src/services/__tests__/outbox-worker.test.ts` |

---

## Sprint 8: Hardening + JWKS + Enriched Query + E2E

**Global ID**: 93 | **Local ID**: sprint-8
**Goal**: Complete infrastructure hardening with JWKS key rotation, enriched reputation query for Thompson Sampling, full E2E integration test, and bridge convergence.
**Focus**: FR-21 (JWKS), FR-22 (Enriched Reputation Query), E2E validation, bridge prep
**Dependencies**: Sprints 1–7 (full system)
**Estimated Tests**: 15–20

### Tasks

| ID | Task | Acceptance Criteria | File(s) |
|----|------|-------------------|---------|
| T-8.1 | **Implement JWKS key rotation endpoint** | `GET /.well-known/jwks.json` serves current ES256 public key(s) in JWKS format. Key rotation without service restart: read keys from PG or filesystem on each request (cached with 5min TTL). Supports key rollover: old key remains valid for verification during rotation window (configurable, default 24hr). Finn validates against this endpoint. Deferred MEDIUM-2 from cycle-011 bridge. | `app/src/routes/well-known.ts`, `app/src/services/jwks-manager.ts` |
| T-8.2 | **Implement enriched reputation query** | Extend `GET /api/reputation/query` to return `{score, confidence, n}` instead of just `{score}`. `confidence` derived from sample_count and Bayesian uncertainty (higher n = higher confidence). `n` is the raw sample_count. Backward-compatible: existing consumers that read `score` continue to work. Enables Thompson Sampling in finn for variance-aware exploration. Deferred from cycle-011. | `app/src/routes/reputation.ts` |
| T-8.3 | **E2E integration test: full fleet lifecycle** | End-to-end test covering the complete happy path: (1) POST /spawn with valid auth, (2) verify task created in registry, (3) mock agent creates worktree + completes work, (4) monitor detects PR, (5) CI passes, (6) review pipeline runs (mocked reviewers), (7) task reaches `ready`, (8) notification sent, (9) reputation event emitted, (10) cleanup. Uses real PG, mocked spawner/gh/reviewers. | `app/tests/e2e/fleet-api-e2e.test.ts` |
| T-8.4 | **E2E test: fleet lifecycle — local mode** | Test with real tmux (if available): spawn -> worktree created -> tmux session alive -> mock agent output -> stop -> session killed -> worktree cleaned. Skipped in CI if tmux not available. | `app/tests/e2e/fleet-e2e-local.test.ts` |
| T-8.5 | **E2E test: failure and retry cycle** | End-to-end: spawn -> agent fails (mock process exit) -> monitor detects failure -> retry engine fires -> enriched retry prompt includes failure context -> second attempt succeeds -> task reaches ready. Verifies INV-017 (retry count bounded). | `app/tests/e2e/fleet-api-e2e.test.ts` |
| T-8.6 | **E2E test: governance denial** | Test: builder tier spawns 1 agent (succeeds), attempts 2nd agent (denied by FleetGovernor). Verify 403 response with tier limit explanation. Verify INV-014 holds. | `app/tests/e2e/fleet-api-e2e.test.ts` |
| T-8.7 | **Security audit — command injection review** | Audit all execFile/spawn calls in AgentSpawner and FleetMonitor. Verify no shell interpolation. Verify all user-controlled inputs (branch names, descriptions, paths) are validated before use. Verify prompt passed via stdin, never CLI args. Document findings. | Audit review (no new file) |
| T-8.8 | **Add INV-014 through INV-018 to invariants.yaml** | Add all 5 fleet invariants per SDD §13 appendix. Each with id, description, severity, category, properties, verified_in references to the actual source files and test files. | `grimoires/loa/invariants.yaml` |
| T-8.9 | **Unit tests: JWKS endpoint** | Test JWKS endpoint returns valid JWK Set. Test key rotation (new key added, old key retained). Test cache TTL behavior. Test finn-compatible verification flow. | `app/src/routes/__tests__/well-known.test.ts` |
| T-8.10 | **Unit tests: enriched reputation query** | Test query returns {score, confidence, n}. Test backward compatibility (score still present). Test confidence calculation from sample count. Test cold agent returns null confidence. | `app/src/routes/__tests__/reputation-enriched.test.ts` |
| T-8.11 | **Fleet observability: structured logging + metrics** | Add structured JSON logging to ConductorEngine, FleetMonitor, RetryEngine, and FleetGovernor. Log format: `{timestamp, level, component, taskId?, operatorId?, event, duration_ms?, metadata}`. Key metrics exposed via `GET /api/fleet/metrics`: active_agents, total_spawns, total_failures, retry_rate, avg_spawn_duration_ms, governor_denial_count. Metrics tracked via in-memory counters (Prometheus-style), reset on restart. Trace ID propagated from request through spawn/monitor/retry chain. (Beads IMP-006) | `app/src/services/fleet-metrics.ts`, `app/src/routes/fleet.ts` |

---

## Deferred to Future Cycles

The following P1/P2 items from the PRD are explicitly deferred:

### P1 Stretch (Cycle-012 if capacity, else Cycle-013)

| FR | Description | Reason for Deferral |
|----|-------------|---------------------|
| FR-9 | Web Dashboard Fleet View | CLI + API surface sufficient for MVP; web dashboard enhances UX but not blocking |
| FR-10 | Natural Language Fleet Commands (full) | Fleet routes provide structured API; NL parsing is enhancement |
| FR-12 | Cross-Governor Event Bus (full pub/sub with NATS) | Basic in-process event bus implemented in Sprint 5; full NATS pub/sub is stretch |
| FR-13 | Meta-Governor (self-monitoring governance) | FleetGovernor + invariant verification provides governance; meta-governor is enhancement |
| FR-17 | Operator Review Surface (one-click merge UI) | PR comments + CLI provide review; dedicated UI is stretch |

### P2 Future (Cycle-013+)

| FR | Description | Reason for Deferral |
|----|-------------|---------------------|
| FR-18 | Work Discovery Scanner (Sentry, issues, git) | Requires stable conductor first |
| FR-19 | GTM Autonomous Execution | Requires stable conductor + work discovery |
| FR-20 | Proactive Fleet Scaling | Requires usage data from running fleet |
| FR-23 | Docker Compose E2E (finn + dixie + postgres) | Cross-repo coordination needed |

---

## Flatline Sprint Hardening

The following 11 findings from the Flatline Protocol review (6 HIGH_CONSENSUS + 5 BLOCKERS) have been integrated into the sprint plan as new tasks or acceptance criteria modifications.

| Finding ID | Type | Sprint | Integration | Description |
|------------|------|--------|-------------|-------------|
| IMP-001 | HIGH_CONSENSUS | 1 | T-1.10 (new) | PG connection pool configuration for fleet workload (min/max pool, idle timeout, statement timeout, shutdown lifecycle) |
| IMP-002 | HIGH_CONSENSUS | 1 | T-1.6 (modified) | State transition map as typed `Record<FleetTaskStatus, FleetTaskStatus[]>` constant + `TERMINAL_STATUSES` Set |
| IMP-003 | HIGH_CONSENSUS | 1 | T-1.11 (new) | Integration test for migration 013 against real PG — CHECK constraints, triggers, indexes |
| IMP-004 | HIGH_CONSENSUS | 2 | T-2.11 (new) | Agent secret management — scoped secrets, rotation, cleanup, audit trail |
| IMP-005 | HIGH_CONSENSUS | 3 | T-3.4 (modified) | Monitor resilience — cycle deadline, overlap prevention, degraded-dependency handling, health reporting |
| IMP-007 | HIGH_CONSENSUS | 6 | T-6.1 (modified) | Spawn compensation via FleetSaga — reverse-order compensation on partial failure with audit trail |
| SKP-001 | BLOCKER | 1 | T-1.2 (modified) | Down migration (`013_fleet_orchestration_down.sql`) with expand/contract strategy |
| SKP-002 | BLOCKER | 1 | T-1.11 (modified) | Schema assertion in integration test — verify column types, constraint names, index definitions |
| SKP-007 | BLOCKER | 5 | T-5.11 (new) | Saga coordinator for multi-step fleet operations with compensatable actions and idempotency tokens |
| SKP-008 | BLOCKER | 1 | T-1.12 (new) | RLS policies for tenant isolation on fleet_tasks with admin bypass |
| SKP-009 | BLOCKER | 7 | T-7.9 (new) | Transactional outbox for durable event delivery — replaces fire-and-forget NATS publish |

---

## Summary

| Sprint | Global ID | Label | Tasks | Est. Tests |
|--------|-----------|-------|-------|------------|
| 1 | 86 | Database Foundation + Task Registry | 12 | 22–28 |
| 2 | 87 | Agent Spawner + Container Isolation | 11 | 17–20 |
| 3 | 88 | Fleet Monitor + Reconciliation | 7 | 15–19 |
| 4 | 89 | Model Router + Context Enrichment | 7 | 14–16 |
| 5 | 90 | Retry Engine + Fleet Governor + Conviction Gating | 11 | 20–24 |
| 6 | 91 | Conductor Engine + CLI + Auth | 11 | 20–25 |
| 7 | 92 | Notifications + Review Pipeline | 9 | 18–22 |
| 8 | 93 | Hardening + JWKS + Enriched Query + E2E | 11 | 17–22 |
| **Total** | — | — | **79** | **143–176** |

Test count aligns with PRD success metric of +100-150 new tests (estimated 143-176, inclusive of Flatline sprint + beads hardening).
