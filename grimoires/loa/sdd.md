# SDD: Agent Fleet Orchestration — From Oracle to Conductor

**Version**: 12.0.0
**Date**: 2026-02-26
**Author**: Claude (Architecture), Merlin (Direction)
**Cycle**: cycle-012
**Status**: Draft
**PRD Reference**: PRD v12.0.0 — Agent Fleet Orchestration

---

## 1. System Overview

Cycle-012 transforms dixie from a passive oracle into an active conductor. The
conductor is **not** a separate service — it is a new subsystem within dixie's
existing Hono server, sharing the same process, middleware pipeline, database
pool, NATS connection, and governance infrastructure.

### 1.1 Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          DIXIE BFF (Hono Server)                           │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  MIDDLEWARE PIPELINE (existing, positions 1-15)                      │  │
│  │  requestId → tracing → secureHeaders → cors → bodyLimit → logger    │  │
│  │  → jwt → walletBridge → rateLimit → allowlist → payment             │  │
│  │  → convictionTier → memoryContext → economicMetadata                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────┐   │
│  │  EXISTING ROUTES      │  │  NEW: FLEET ROUTES (/api/fleet/*)       │   │
│  │  /api/health          │  │  POST /spawn                            │   │
│  │  /api/auth            │  │  GET  /status                           │   │
│  │  /api/chat            │  │  GET  /tasks/:id                        │   │
│  │  /api/reputation      │  │  POST /tasks/:id/stop                   │   │
│  │  /api/enrich          │  │  GET  /tasks/:id/logs                   │   │
│  │  /api/agent           │  │  DELETE /tasks/:id                      │   │
│  │  /api/learning        │  │  GET  /config                           │   │
│  │  ...                  │  │  POST /notifications/test               │   │
│  └──────────────────────┘  └──────────────┬───────────────────────────┘   │
│                                            │                               │
│  ┌─────────────────────────────────────────┼──────────────────────────┐   │
│  │                   CONDUCTOR ENGINE      │                          │   │
│  │                                         ▼                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │   │
│  │  │ AgentSpawner │  │ TaskRegistry │  │ ContextEnrichment    │    │   │
│  │  │  worktree +  │  │  PG CRUD +   │  │  knowledge + reality │    │   │
│  │  │  tmux/docker │  │  beads sync  │  │  + reputation + lore │    │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘    │   │
│  │         │                  │                      │                │   │
│  │  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────────┴───────────┐    │   │
│  │  │ AgentModel   │  │ RetryEngine  │  │ FleetMonitor         │    │   │
│  │  │ Router       │  │ (Ralph V2)   │  │ (polling loop)       │    │   │
│  │  │ cheval+rep   │  │ capture +    │  │ container/tmux +     │    │   │
│  │  │              │  │ enrich +     │  │ PR + CI checks       │    │   │
│  │  │              │  │ respawn      │  │                       │    │   │
│  │  └──────────────┘  └──────────────┘  └───────────────────────┘    │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                            │                               │
│  ┌─────────────────────────────────────────┼──────────────────────────┐   │
│  │                 GOVERNANCE LAYER         │                          │   │
│  │                                         ▼                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │   │
│  │  │ FleetGovernor│  │ CrossGov     │  │ Existing Governors   │    │   │
│  │  │ GovernedRes  │  │ EventBus     │  │ corpusMeta,          │    │   │
│  │  │ <FleetState> │  │ (NATS-backed)│  │ knowledgeGovernor    │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘    │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                            │                               │
│  ┌─────────────────────────────────────────┼──────────────────────────┐   │
│  │               NOTIFICATION LAYER        │                          │   │
│  │                                         ▼                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │   │
│  │  │ Discord      │  │ Telegram     │  │ CLI stdout           │    │   │
│  │  │ Webhook      │  │ Bot API      │  │ (fallback)           │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘    │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────── EXISTING INFRASTRUCTURE (shared) ────────────────────────┐  │
│  │  DbPool | RedisClient | SignalEmitter | ReputationService           │  │
│  │  AuditTrailStore | MutationLogStore | KnowledgeGovernor             │  │
│  │  EnrichmentService | ConvictionResolver | GovernorRegistry          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ Agent 1 │   │ Agent 2 │   │ Agent 3 │   │ Agent N │
    │ Claude  │   │ Codex   │   │ Gemini  │   │ ...     │
    │ worktree│   │ worktree│   │ worktree│   │ worktree│
    │ +hooks  │   │ +hooks  │   │ +hooks  │   │ +hooks  │
    └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

### 1.2 Agent Lifecycle State Machine

```
PROPOSED ──→ SPAWNING ──→ RUNNING ──→ PR_CREATED ──→ REVIEWING ──→ READY ──→ MERGED
                             │              │                         │
                             ▼              ▼                         ▼
                          FAILED       CANCELLED [SKP-005]       REJECTED ──→ RETRYING
                             │          (operator stop)                          │
                             ▼                                                   │
                          RETRYING (max 3) ──→ ABANDONED                        │
                             │                                                   │
                             └──── (retry_count < max_retries) ──→ SPAWNING ←───┘
```

Valid transitions (enforced by TaskRegistry):

| From | To | Trigger |
|------|----|---------|
| `proposed` | `spawning` | ConductorEngine.spawn() |
| `spawning` | `running` | AgentSpawner confirms process alive |
| `spawning` | `failed` | Worktree/container creation error |
| `running` | `pr_created` | FleetMonitor detects PR via `gh` |
| `running` | `failed` | Process exit, OOM, timeout |
| `running` | `cancelled` | Operator-initiated stop [Flatline SKP-005] |
| `pr_created` | `reviewing` | Review pipeline starts |
| `pr_created` | `cancelled` | Operator-initiated stop [Flatline SKP-005] |
| `reviewing` | `ready` | All reviews pass |
| `reviewing` | `rejected` | Review fails |
| `ready` | `merged` | Operator merges (or auto-merge) |
| `failed` | `retrying` | RetryEngine with budget remaining |
| `rejected` | `retrying` | RetryEngine with budget remaining |
| `retrying` | `spawning` | Enriched retry prompt constructed |
| `failed` | `abandoned` | retry_count >= max_retries |
| `retrying` | `abandoned` | Enriched retry also fails pre-spawn |

**`cancelled` state** [Flatline SKP-005]: A terminal state for operator-initiated
stops, distinct from `failed`/`abandoned`. Key properties:
- Reachable from `running` and `pr_created` (the two active states where an
  operator would want to stop work).
- **Terminal**: no outbound transitions. `cancelled` tasks cannot be retried.
- RetryEngine MUST exclude `cancelled` from retry candidate queries.
- `cancelled` tasks do NOT generate negative reputation events (the operator
  chose to stop, the agent did not fail).
- Notifications are delivered for `cancelled` (same as other terminal states).

### 1.3 Component Dependency Graph

```
FleetRoutes ──→ ConductorEngine
                    │
         ┌──────────┼──────────────────────────┐
         ▼          ▼          ▼               ▼
   AgentSpawner  TaskRegistry  FleetMonitor  ContextEnrichmentEngine
         │          │              │               │
         │          ▼              │               ├──→ KnowledgeGovernor
         │     DbPool (PG)        │               ├──→ ReputationService
         │          │              │               ├──→ EnrichmentService
         │          │              │               └──→ CompoundLearningEngine
         │          │              │
         │          │              ├──→ AgentSpawner (health check)
         │          │              └──→ TaskRegistry (status update)
         │          │
         ▼          │    ┌───────────────────────┐
   FleetGovernor ◄──┤    │  CrossGovernorEventBus │
         │          │    │  (extends SignalEmitter)│
         │          │    └────────────┬────────────┘
         │          │                 │
         ▼          ▼                 ▼
   GovernorRegistry      RetryEngine ──→ ContextEnrichmentEngine
         │                    │
         │                    └──→ AgentSpawner
         │
         ▼
   AgentModelRouter ──→ ReputationService
         │
         └──→ cheval adapters (external)
```

---

## 2. Component Design

### 2.1 ConductorEngine

The orchestration core. Coordinates spawner, registry, monitor, enrichment,
retry, and governance. Single entry point for all fleet operations.

**File**: `app/src/services/conductor-engine.ts`

**Dependencies**:
- `AgentSpawner` — process lifecycle
- `TaskRegistry` — PG persistence
- `FleetMonitor` — health polling
- `ContextEnrichmentEngine` — prompt construction
- `RetryEngine` — failure recovery
- `FleetGovernor` — governance enforcement
- `AgentModelRouter` — model selection
- `NotificationService` — operator notifications
- `CrossGovernorEventBus` — event emission
- `AuditTrailStore` — fleet action auditing
- `MutationLogStore` — fleet mutation logging

```typescript
// ---------------------------------------------------------------------------
// ConductorEngine — Orchestration Core
// ---------------------------------------------------------------------------

import type { DbPool } from '../db/client.js';

/** Fleet task status — the complete lifecycle. */
export type FleetTaskStatus =
  | 'proposed'
  | 'spawning'
  | 'running'
  | 'pr_created'
  | 'reviewing'
  | 'ready'
  | 'merged'
  | 'failed'
  | 'retrying'
  | 'abandoned'
  | 'rejected'
  | 'cancelled';  // [Flatline SKP-005] operator-initiated stop (terminal)

/** Agent type discriminator. */
export type AgentType = 'claude_code' | 'codex' | 'gemini';

/** Task type classification for model routing. */
export type TaskType = 'bug_fix' | 'feature' | 'refactor' | 'review' | 'docs';

/** Spawn request from the operator. */
export interface SpawnRequest {
  readonly operatorId: string;           // dNFT ID or wallet address
  readonly description: string;          // Natural language task description
  readonly taskType: TaskType;           // Classification for model routing
  readonly repository: string;           // Git repo path (local) or URL
  readonly baseBranch?: string;          // Default: 'main'
  readonly agentType?: AgentType;        // Override model router selection
  readonly model?: string;               // Override specific model
  readonly maxRetries?: number;          // Default: 3
  readonly timeoutMinutes?: number;      // Default: 120
  readonly contextOverrides?: Record<string, string>; // Extra context for prompt
}

/** Result of a spawn operation. */
export interface SpawnResult {
  readonly taskId: string;               // UUID
  readonly branch: string;               // fleet/<taskId-short>
  readonly worktreePath: string;
  readonly agentType: AgentType;
  readonly model: string;
  readonly status: FleetTaskStatus;
}

/** Fleet status summary. */
export interface FleetStatusSummary {
  readonly activeTasks: number;
  readonly completedTasks: number;
  readonly failedTasks: number;
  readonly tasks: FleetTaskSummary[];
}

export interface FleetTaskSummary {
  readonly id: string;
  readonly status: FleetTaskStatus;
  readonly description: string;
  readonly agentType: AgentType;
  readonly model: string;
  readonly branch: string;
  readonly prNumber: number | null;
  readonly ciStatus: string | null;
  readonly retryCount: number;
  readonly spawnedAt: string | null;
  readonly durationMinutes: number | null;
}

export interface ConductorEngineDeps {
  readonly spawner: AgentSpawner;
  readonly taskRegistry: TaskRegistry;
  readonly monitor: FleetMonitor;
  readonly enrichment: ContextEnrichmentEngine;
  readonly retry: RetryEngine;
  readonly governor: FleetGovernor;
  readonly modelRouter: AgentModelRouter;
  readonly notifications: NotificationService;
  readonly eventBus: CrossGovernorEventBus;
  readonly auditTrailStore: AuditTrailStore | null;
  readonly mutationLogStore: MutationLogStore | null;
  readonly log: (level: string, data: Record<string, unknown>) => void;
}

export class ConductorEngine {
  private readonly deps: ConductorEngineDeps;

  constructor(deps: ConductorEngineDeps) {
    this.deps = deps;
  }

  /**
   * Spawn a new fleet agent.
   *
   * Flow:
   * 1. Validate governance (FleetGovernor.canSpawn)
   * 2. Select model (AgentModelRouter.selectModel)
   * 3. Create task record (TaskRegistry.create — status: proposed)
   * 4. Build enriched prompt (ContextEnrichmentEngine.buildPrompt)
   * 5. Spawn agent process (AgentSpawner.spawn)
   * 6. Update task status (spawning → running)
   * 7. Emit AGENT_SPAWNED event
   * 8. Audit trail entry
   * 9. Return SpawnResult
   *
   * INV-015: Task is created in registry BEFORE spawn attempt.
   * INV-014: Governor check enforces conviction-tier limits.
   */
  async spawn(request: SpawnRequest): Promise<SpawnResult>;

  /**
   * Get fleet status for an operator.
   */
  async getStatus(operatorId?: string): Promise<FleetStatusSummary>;

  /**
   * Get a single task by ID.
   */
  async getTask(taskId: string): Promise<FleetTaskRecord | null>;

  /**
   * Stop a running agent.
   *
   * Flow:
   * 1. Find task in registry
   * 2. Kill agent process (AgentSpawner.kill)
   * 3. Update task status → failed
   * 4. Emit AGENT_FAILED event
   * 5. Notify operator
   */
  async stopTask(taskId: string, operatorId: string): Promise<void>;

  /**
   * Get agent logs (last N lines from tmux capture or container logs).
   */
  async getTaskLogs(taskId: string, lines?: number): Promise<string>;

  /**
   * Delete a completed/failed/abandoned task (cleanup worktree).
   */
  async deleteTask(taskId: string, operatorId: string): Promise<void>;

  /**
   * Start the conductor — initializes monitor loop and event subscriptions.
   */
  async start(): Promise<void>;

  /**
   * Graceful shutdown — stop monitor, drain events, cleanup.
   */
  async shutdown(): Promise<void>;
}
```

**Error Handling Strategy**:
- Governance denial: Return 403 with tier requirement details
- Spawn failure: Record in registry as `failed`, emit event, notify operator
- Registry unavailable (PG down): Reject new spawns, existing agents continue
- All errors logged with structured context for diagnostics

**State Management**:
- All fleet state persisted to PostgreSQL via TaskRegistry
- In-memory state limited to active monitor subscriptions
- Recovery on restart: query PG for `running`/`spawning` tasks, reconcile with actual container/tmux state

### 2.2 AgentSpawner

Creates isolated agent environments — git worktrees and managed processes.

**File**: `app/src/services/agent-spawner.ts`

**Dependencies**:
- `child_process` (exec/spawn)
- Git CLI (`git worktree`)
- Container runtime CLI (`docker`/`podman`)
- `tmux` (local mode)

```typescript
// ---------------------------------------------------------------------------
// AgentSpawner — Process Lifecycle Management
// ---------------------------------------------------------------------------

export type SpawnerMode = 'local' | 'container';

/** Configuration for the spawner. */
export interface AgentSpawnerConfig {
  /** Base directory for worktrees. Default: /tmp/dixie-fleet */
  readonly worktreeBaseDir: string;
  /** Spawner mode. Default: 'local' for dev, 'container' for production. */
  readonly mode: SpawnerMode;
  /** Container image for fleet agents. Required when mode='container'. */
  readonly containerImage?: string;
  /** Container runtime binary. Default: 'docker'. */
  readonly containerRuntime?: 'docker' | 'podman';
  /** Repository root path (for worktree creation). */
  readonly repoRoot: string;
  /** Path to Loa hooks directory (copied into each worktree). */
  readonly loaHooksPath?: string;
  /** Default agent timeout in minutes. */
  readonly defaultTimeoutMinutes?: number;
  /** Maximum concurrent agents (enforced at spawner level as safety net). */
  readonly maxConcurrentAgents?: number;
  /** pnpm shared store path for dependency caching (local mode). */
  readonly pnpmStorePath?: string;
}

/** Handle to a spawned agent process. */
export interface AgentHandle {
  readonly taskId: string;
  readonly branch: string;
  readonly worktreePath: string;
  /** Container ID (container mode) or tmux session name (local mode). */
  readonly processRef: string;
  readonly mode: SpawnerMode;
  readonly spawnedAt: string;
}

/** Agent environment variables — scoped secrets. */
export interface AgentEnvironment {
  /** Short-lived GitHub token (HTTPS clone, scoped to repo). */
  readonly GITHUB_TOKEN: string;
  /** Model API key (scoped per model provider). */
  readonly MODEL_API_KEY: string;
  /** Task ID for self-identification. */
  readonly FLEET_TASK_ID: string;
  /** Callback URL for agent → conductor status updates. */
  readonly FLEET_CALLBACK_URL?: string;
}

export class AgentSpawner {
  constructor(private readonly config: AgentSpawnerConfig) {}

  /**
   * Spawn a new agent process.
   *
   * Local mode:
   * 1. git worktree add <path> -b fleet/<taskId-short> <baseBranch>
   * 2. cd <worktree> && pnpm install --frozen-lockfile
   * 3. Copy Loa hooks (.claude/hooks/) into worktree
   * 4. tmux new-session -d -s fleet-<taskId-short> \
   *      "claude --dangerously-skip-permissions -p '<prompt>'"
   * 5. Return AgentHandle with tmux session name
   *
   * Container mode:
   * 1. git worktree add <path> -b fleet/<taskId-short> <baseBranch>
   * 2. docker run -d --name fleet-<taskId-short> \
   *      --memory=2g --cpus=2 \
   *      --read-only --tmpfs /tmp \
   *      -v <worktree>:/workspace \
   *      -v <pnpm-store>:/pnpm-store:ro \
   *      --env-file <scoped-env> \
   *      --security-opt no-new-privileges \
   *      --network fleet-egress \
   *      <image> \
   *      claude --dangerously-skip-permissions -p '<prompt>'
   * 3. Return AgentHandle with container ID
   *
   * @throws SpawnError if worktree creation or process launch fails
   */
  async spawn(
    taskId: string,
    branch: string,
    baseBranch: string,
    prompt: string,
    agentType: AgentType,
    env: AgentEnvironment,
    opts?: { timeoutMinutes?: number },
  ): Promise<AgentHandle>;

  /**
   * Check if an agent process is alive.
   *
   * Local: tmux has-session -t <session>
   * Container: docker inspect --format '{{.State.Running}}' <id>
   */
  async isAlive(handle: AgentHandle): Promise<boolean>;

  /**
   * Kill an agent process.
   *
   * Local: tmux kill-session -t <session>
   * Container: docker stop <id> (graceful, 30s timeout) then docker rm <id>
   */
  async kill(handle: AgentHandle): Promise<void>;

  /**
   * Get agent logs.
   *
   * Local: tmux capture-pane -t <session> -p -S -<lines>
   * Container: docker logs --tail <lines> <id>
   */
  async getLogs(handle: AgentHandle, lines?: number): Promise<string>;

  /**
   * Clean up worktree and remove branch.
   *
   * 1. Verify all changes are pushed (git log origin/<branch>..<branch>)
   * 2. If unpushed: snapshot worktree to .fleet-snapshots/<taskId>.tar.gz
   * 3. git worktree remove <path>
   * 4. git branch -d <branch> (only if merged)
   *
   * Never deletes unpushed branches without snapshot [PRD §5.6].
   */
  async cleanup(handle: AgentHandle): Promise<void>;

  /**
   * List all active agent handles by enumerating containers/tmux sessions.
   * Used for reconciliation on conductor restart.
   */
  async listActive(): Promise<AgentHandle[]>;
}

/** Typed error for spawn failures. */
export class SpawnError extends Error {
  constructor(
    message: string,
    readonly code: 'WORKTREE_FAILED' | 'INSTALL_FAILED' | 'PROCESS_FAILED' | 'TIMEOUT',
    readonly taskId: string,
  ) {
    super(message);
    this.name = 'SpawnError';
  }
}
```

**Error Handling**:
- Worktree creation failure: throw `SpawnError` with code `WORKTREE_FAILED`
- `pnpm install` failure: cleanup worktree, throw `SpawnError` with code `INSTALL_FAILED`
- Container/tmux launch failure: cleanup worktree, throw with code `PROCESS_FAILED`
- All cleanup operations are idempotent (safe to retry)

**Security: Command Injection Prevention** [Flatline SKP-002]:

All subprocess calls in AgentSpawner MUST follow these rules to prevent
command injection via user-controlled inputs (task descriptions, branch names):

1. **No shell interpolation**: All subprocess calls MUST use `execFile` (or
   `spawn` with `{ shell: false }`) with argument arrays. NEVER pass
   user-controlled strings through `exec()` or template-literal shell commands.
   ```typescript
   // CORRECT — argument array, no shell
   execFile('git', ['worktree', 'add', worktreePath, '-b', branch, baseBranch]);
   // WRONG — shell injection via branch name
   exec(`git worktree add ${worktreePath} -b ${branch} ${baseBranch}`);
   ```

2. **Task descriptions via stdin/tempfile**: Task description text (operator-
   supplied, arbitrary content) MUST be passed to agent processes via stdin
   pipe or a temporary file — NEVER as CLI arguments. CLI arguments are
   visible in `ps` output and subject to shell metacharacter expansion.
   ```typescript
   // CORRECT — pipe prompt via stdin
   const child = spawn('claude', ['--dangerously-skip-permissions'], { shell: false });
   child.stdin.write(prompt);
   child.stdin.end();
   ```

3. **Branch name validation**: Branch names MUST be validated against
   `/^[a-zA-Z0-9._\/-]+$/` with a maximum length of 128 characters before
   use in any git command. Reject names containing shell metacharacters,
   spaces, or null bytes.
   ```typescript
   const BRANCH_PATTERN = /^[a-zA-Z0-9._\/-]+$/;
   const MAX_BRANCH_LENGTH = 128;
   if (!BRANCH_PATTERN.test(branch) || branch.length > MAX_BRANCH_LENGTH) {
     throw new SpawnError(`Invalid branch name: ${branch}`, 'WORKTREE_FAILED', taskId);
   }
   ```

4. **Worktree path validation**: Worktree paths MUST be validated as absolute
   paths under the configured `worktreeBaseDir`. Use `path.resolve()` and
   verify the result starts with the base directory to prevent path traversal.
   ```typescript
   const resolved = path.resolve(worktreeBaseDir, sanitizedTaskId);
   if (!resolved.startsWith(path.resolve(worktreeBaseDir))) {
     throw new SpawnError('Path traversal detected', 'WORKTREE_FAILED', taskId);
   }
   ```

### 2.3 TaskRegistry

PostgreSQL-backed CRUD for fleet task records with state machine enforcement.

**File**: `app/src/services/task-registry.ts`

**Dependencies**:
- `DbPool` (existing PG pool)

```typescript
// ---------------------------------------------------------------------------
// TaskRegistry — PG-backed Fleet Task CRUD
// ---------------------------------------------------------------------------

/** Full fleet task record from the database. */
export interface FleetTaskRecord {
  readonly id: string;                    // UUID
  readonly operatorId: string;
  readonly agentType: AgentType;
  readonly model: string;
  readonly taskType: TaskType;
  readonly description: string;
  readonly branch: string;
  readonly worktreePath: string | null;
  readonly containerId: string | null;    // container mode
  readonly tmuxSession: string | null;    // local mode
  readonly status: FleetTaskStatus;
  readonly version: number;               // [Flatline IMP-001] optimistic concurrency control
  readonly prNumber: number | null;
  readonly ciStatus: string | null;       // 'pending' | 'passing' | 'failing'
  readonly reviewStatus: Record<string, unknown> | null; // per-model verdicts
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly contextHash: string | null;    // hash of enriched prompt
  readonly failureContext: Record<string, unknown> | null; // last failure info
  readonly spawnedAt: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Input for creating a new task record. */
export interface CreateFleetTaskInput {
  readonly operatorId: string;
  readonly agentType: AgentType;
  readonly model: string;
  readonly taskType: TaskType;
  readonly description: string;
  readonly branch: string;
  readonly maxRetries?: number;
  readonly contextHash?: string;
}

/** Filters for querying tasks. */
export interface TaskQueryFilter {
  readonly operatorId?: string;
  readonly status?: FleetTaskStatus | FleetTaskStatus[];
  readonly agentType?: AgentType;
  readonly taskType?: TaskType;
  readonly since?: string;             // ISO 8601 timestamp
  readonly limit?: number;             // Default: 50
}

/** Valid state transitions — enforced by transition(). */
const VALID_TRANSITIONS: Record<FleetTaskStatus, FleetTaskStatus[]> = {
  proposed: ['spawning'],
  spawning: ['running', 'failed'],
  running: ['pr_created', 'failed', 'cancelled'],      // [Flatline SKP-005] operator stop
  pr_created: ['reviewing', 'failed', 'cancelled'],    // [Flatline SKP-005] operator stop
  reviewing: ['ready', 'rejected'],
  ready: ['merged'],
  merged: [],
  failed: ['retrying', 'abandoned'],
  retrying: ['spawning', 'abandoned'],
  abandoned: [],
  rejected: ['retrying', 'abandoned'],
  cancelled: [],                                        // [Flatline SKP-005] terminal, no outbound
};

export class TaskRegistry {
  constructor(private readonly pool: DbPool) {}

  /**
   * Create a new fleet task record. Returns UUID.
   * Status starts at 'proposed'.
   */
  async create(input: CreateFleetTaskInput): Promise<string>;

  /**
   * Transition task status with optimistic concurrency control. [Flatline IMP-001]
   * Validates the transition against VALID_TRANSITIONS, then performs a
   * conditional UPDATE using the expected version:
   *
   *   UPDATE fleet_tasks
   *   SET status = $new, version = version + 1, ...metadata
   *   WHERE id = $id AND version = $expected_version
   *
   * If the row count is 0, another writer modified the record first —
   * throw StaleVersionError so the caller can re-read and retry.
   *
   * @throws InvalidTransitionError if transition is not valid.
   * @throws StaleVersionError if expectedVersion does not match (concurrent update).
   */
  async transition(
    taskId: string,
    newStatus: FleetTaskStatus,
    expectedVersion: number,
    metadata?: Partial<Pick<FleetTaskRecord,
      'worktreePath' | 'containerId' | 'tmuxSession' | 'prNumber' |
      'ciStatus' | 'reviewStatus' | 'failureContext' | 'spawnedAt' | 'completedAt'
    >>,
  ): Promise<FleetTaskRecord>;

  /**
   * Get a task by ID.
   */
  async get(taskId: string): Promise<FleetTaskRecord | null>;

  /**
   * Query tasks with filters.
   */
  async query(filter: TaskQueryFilter): Promise<FleetTaskRecord[]>;

  /**
   * Count active tasks for an operator.
   * Active = status in ('proposed', 'spawning', 'running', 'pr_created', 'reviewing', 'retrying')
   */
  async countActive(operatorId: string): Promise<number>;

  /**
   * Count all active tasks across all operators.
   */
  async countAllActive(): Promise<number>;

  /**
   * Delete a terminal task (merged, abandoned, cancelled, or failed with no retry budget).
   */
  async delete(taskId: string): Promise<boolean>;

  /**
   * Increment retry count and record failure context.
   */
  async recordFailure(
    taskId: string,
    failureContext: Record<string, unknown>,
  ): Promise<FleetTaskRecord>;

  /**
   * List tasks in non-terminal states for reconciliation.
   */
  async listLive(): Promise<FleetTaskRecord[]>;
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly taskId: string,
    readonly currentStatus: FleetTaskStatus,
    readonly targetStatus: FleetTaskStatus,
  ) {
    super(
      `Invalid transition for task ${taskId}: ${currentStatus} → ${targetStatus}`,
    );
    this.name = 'InvalidTransitionError';
  }
}

/** [Flatline IMP-001] Thrown when optimistic concurrency check fails. */
export class StaleVersionError extends Error {
  constructor(
    readonly taskId: string,
    readonly expectedVersion: number,
  ) {
    super(
      `Stale version for task ${taskId}: expected version ${expectedVersion} but row was already modified`,
    );
    this.name = 'StaleVersionError';
  }
}
```

**State Management**: All state in PostgreSQL. No in-memory task cache —
TaskRegistry always reads from PG to ensure consistency across potential
conductor restarts. The read path is fast (indexed queries on status, operator).

### 2.4 FleetMonitor

Polling loop that checks agent health, PR status, and CI status.

**File**: `app/src/services/fleet-monitor.ts`

**Dependencies**:
- `TaskRegistry` — read/update task status
- `AgentSpawner` — check process liveness
- `RetryEngine` — trigger retry on failure
- `NotificationService` — notify on state changes
- `CrossGovernorEventBus` — emit events

```typescript
// ---------------------------------------------------------------------------
// FleetMonitor — Agent Health & Progress Polling Loop
// ---------------------------------------------------------------------------

export interface FleetMonitorConfig {
  /** Polling interval in milliseconds. Default: 60_000 (60s). */
  readonly intervalMs?: number;
  /** Maximum consecutive check failures before alerting. Default: 3. */
  readonly maxConsecutiveFailures?: number;
  /** Stall detection: minutes with no git activity. Default: 30. */
  readonly stallThresholdMinutes?: number;
  /** Agent timeout in minutes. Default: 120. */
  readonly defaultTimeoutMinutes?: number;
}

export interface FleetMonitorDeps {
  readonly taskRegistry: TaskRegistry;
  readonly spawner: AgentSpawner;
  readonly retry: RetryEngine;
  readonly notifications: NotificationService;
  readonly eventBus: CrossGovernorEventBus;
  readonly log: (level: string, data: Record<string, unknown>) => void;
}

export class FleetMonitor {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly config: FleetMonitorConfig,
    private readonly deps: FleetMonitorDeps,
  ) {}

  /**
   * Reconcile registry state with actual infrastructure on conductor startup.
   * [Flatline IMP-003]
   *
   * MUST be called once during conductor initialization, before start().
   *
   * Algorithm:
   * 1. List running containers and tmux sessions via AgentSpawner.listActive()
   * 2. Load all non-terminal task records from TaskRegistry.listLive()
   * 3. For each registry record with no matching live process:
   *    → Mark as 'failed' with failureContext: { reason: 'conductor_restart',
   *        detected_at: ISO timestamp, previous_status: <status> }
   *    → Emit 'fleet.task.orphaned' event
   * 4. For each live process with no matching registry record:
   *    → Log as WARNING with container/session ID — do NOT auto-kill.
   *      These may have unpushed work (commits, branches).
   *    → Emit 'fleet.task.untracked' event for operator inspection.
   * 5. Log reconciliation summary: { orphaned_records, untracked_processes,
   *    healthy_matches }
   */
  async reconcile(): Promise<ReconcileResult>;

  /**
   * Start the monitoring loop. Caller SHOULD call reconcile() first.
   */
  start(): void;

  /**
   * Stop the monitoring loop.
   */
  stop(): void;

  /**
   * Execute a single monitoring cycle. Public for testing.
   *
   * For each live task:
   * 1. Check process alive (AgentSpawner.isAlive)
   * 2. If dead + no PR: mark failed, trigger retry
   * 3. If alive: check for new PR (gh pr list --head <branch>)
   * 4. If PR found: update task status to pr_created, check CI
   * 5. If CI status changed: update task
   * 6. Check for stall (no git commits in stallThresholdMinutes)
   * 7. Check for timeout (spawnedAt + timeoutMinutes exceeded)
   * 8. Emit events for all state transitions
   * 9. Notify operator on terminal state changes
   */
  async runCycle(): Promise<MonitorCycleResult>;
}

export interface MonitorCycleResult {
  readonly tasksChecked: number;
  readonly stateChanges: number;
  readonly retriesTriggered: number;
  readonly notificationsSent: number;
  readonly errors: string[];
}

/** [Flatline IMP-003] Result of startup reconciliation. */
export interface ReconcileResult {
  /** Registry records with no live process — marked 'failed'. */
  readonly orphanedRecords: number;
  /** Live processes with no registry record — flagged for inspection. */
  readonly untrackedProcesses: number;
  /** Registry records that match a live process — no action needed. */
  readonly healthyMatches: number;
}

/**
 * GitHub CLI helper — wraps `gh` commands for PR and CI status.
 *
 * All gh commands are non-blocking (exec with timeout).
 * Rate limit detection: check stderr for 'rate limit' and back off.
 */
export class GitHubCli {
  /**
   * Check if a PR exists for a branch.
   * gh pr list --head <branch> --json number,state --limit 1
   */
  async getPrForBranch(branch: string): Promise<{ number: number; state: string } | null>;

  /**
   * Get CI status for a PR.
   * gh pr checks <number> --json name,state,conclusion
   */
  async getCiStatus(prNumber: number): Promise<'pending' | 'passing' | 'failing'>;

  /**
   * Check for recent git activity in a worktree.
   * git -C <worktree> log --oneline -1 --format=%ct
   */
  async getLastCommitTimestamp(worktreePath: string): Promise<number | null>;
}
```

**Error Handling**:
- GitHub API rate limit (403): pause monitor cycle, queue checks, resume
  after `X-RateLimit-Reset` timestamp. Alert operator.
- `gh` CLI not found: log error, skip PR/CI checks, continue process liveness checks
- Process check failure: log and continue (don't crash the monitor loop)
- Monitor loop exceptions: catch at top level, log, continue next cycle

#### 2.4.1 Review Pipeline [Flatline IMP-010]

Multi-model review pipeline triggered when FleetMonitor detects a PR. This
subsystem orchestrates 2-3 review agents (via cheval adapters) to provide
diverse, cross-model code review before a task can reach `ready`.

**Pipeline flow**:

1. **Trigger**: When a task transitions to `pr_created`, the agent (or
   FleetMonitor) posts a `fleet.review.requested` event on the
   CrossGovernorEventBus.

2. **Detection**: FleetMonitor detects the PR during its polling cycle and
   transitions the task from `pr_created` → `reviewing`.

3. **Reviewer spawning**: The review pipeline spawns 2-3 review agents via
   cheval adapters, each with a distinct review focus:
   - **Claude** — security review (injection, auth bypass, secrets, OWASP)
   - **Codex / GPT** — logic review (correctness, edge cases, test coverage)
   - **Gemini** — architecture review (coupling, patterns, scalability)

   Each reviewer receives the PR diff (via `gh pr diff <number>`) plus
   relevant context from the ContextEnrichmentEngine (codebase conventions,
   related ADRs, invariant contracts).

4. **Verdict posting**: Each reviewer posts comments directly on the PR via
   the GitHub API and returns a structured verdict:

   ```typescript
   type ReviewVerdict = 'approve' | 'request_changes' | 'comment';

   interface ReviewResult {
     readonly reviewer: AgentType;
     readonly verdict: ReviewVerdict;
     readonly comments: number;        // number of inline comments posted
     readonly summary: string;         // one-line summary
     readonly completedAt: string;     // ISO 8601
   }
   ```

5. **Aggregation**: The pipeline collects all reviewer verdicts and applies
   the following rules:
   - **ALL reviewers approve** → task transitions to `ready`
   - **ANY reviewer returns `request_changes`** → task transitions to `rejected`
     (RetryEngine may re-spawn with enriched context from reviewer comments)
   - **Timeout (30 minutes)** → task transitions to `ready` with a warning
     flag (`reviewStatus.timedOut = true`). The operator is notified that
     review was incomplete. This prevents a stuck reviewer from blocking the
     entire pipeline indefinitely.

   ```typescript
   interface AggregatedReviewStatus {
     readonly results: ReviewResult[];
     readonly outcome: 'approved' | 'rejected' | 'timed_out';
     readonly timedOut: boolean;
     readonly completedAt: string;
   }
   ```

**Storage**: Review results are persisted in the `fleet_tasks.review_status`
JSONB column. Each review cycle overwrites the previous value (retries
produce fresh reviews).

**Error handling**: If a reviewer agent fails to start or crashes, the
pipeline continues with remaining reviewers. A single reviewer failure does
not block the pipeline — the aggregation step treats missing verdicts as
implicit `comment` (neither approve nor reject).

### 2.5 AgentModelRouter

Selects the optimal model for a task based on task type and reputation data.

**File**: `app/src/services/agent-model-router.ts`

**Dependencies**:
- `ReputationService` — agent performance data
- Cheval adapters (external) — model capability metadata

```typescript
// ---------------------------------------------------------------------------
// AgentModelRouter — Model Selection per Task Type
// ---------------------------------------------------------------------------

/** Model routing configuration per task type. */
export interface ModelRoutingConfig {
  /** Default model per task type. */
  readonly defaults: Record<TaskType, { agentType: AgentType; model: string }>;
  /** Fallback model when primary is unavailable. */
  readonly fallback: { agentType: AgentType; model: string };
  /** Models available in the fleet. */
  readonly availableModels: ModelSpec[];
}

export interface ModelSpec {
  readonly agentType: AgentType;
  readonly model: string;
  /** Task types this model excels at. */
  readonly strengths: TaskType[];
  /** Whether this model is currently available (health check). */
  available: boolean;
}

/** Routing decision with reasoning. */
export interface RoutingDecision {
  readonly agentType: AgentType;
  readonly model: string;
  readonly reason: string;
  /** Reputation score for selected model on this task type, if available. */
  readonly reputationScore: number | null;
}

export class AgentModelRouter {
  constructor(
    private readonly config: ModelRoutingConfig,
    private readonly reputationService: ReputationService,
  ) {}

  /**
   * Select the optimal model for a task.
   *
   * Priority:
   * 1. Explicit override (operator specifies model)
   * 2. Reputation-weighted selection (if sufficient data)
   * 3. Task-type default from config
   * 4. Fallback model
   *
   * Reputation integration: if ReputationService has cohort data for
   * models on the requested task type, weight selection toward the
   * highest-scoring available model.
   */
  async selectModel(
    taskType: TaskType,
    overrides?: { agentType?: AgentType; model?: string },
  ): Promise<RoutingDecision>;

  /**
   * Update model availability (called periodically or on failure).
   */
  setModelAvailability(agentType: AgentType, model: string, available: boolean): void;
}
```

**Default Routing Table**:

| Task Type | Default Agent | Default Model | Rationale |
|-----------|--------------|---------------|-----------|
| `bug_fix` | `claude_code` | `claude-opus-4-6` | Strong at code reasoning |
| `feature` | `claude_code` | `claude-opus-4-6` | Agentic coding strength |
| `refactor` | `codex` | `codex-mini-latest` | Fast iteration on structural changes |
| `review` | `gemini` | `gemini-2.5-pro` | Good at broad code understanding |
| `docs` | `claude_code` | `claude-sonnet-4-5` | Fast, good at prose |

### 2.6 ContextEnrichmentEngine

Composes enriched prompts for fleet agents using governance data, codebase
reality, reputation context, failure history, and lore.

**File**: `app/src/services/context-enrichment-engine.ts`

**Dependencies**:
- `EnrichmentService` (existing) — governance context assembly
- `KnowledgeGovernor` (existing) — corpus freshness data
- `ReputationService` (existing) — agent performance data
- `CompoundLearningEngine` (existing) — learning insights

```typescript
// ---------------------------------------------------------------------------
// ContextEnrichmentEngine — Fleet Prompt Construction
// ---------------------------------------------------------------------------

/** Enrichment context tiers (priority-ordered for context window management). */
export type ContextTier = 'critical' | 'relevant' | 'background';

/** A section of enriched context with priority metadata. */
export interface ContextSection {
  readonly tier: ContextTier;
  readonly label: string;
  readonly content: string;
  readonly tokenEstimate: number;
}

/** Configuration for context enrichment. */
export interface ContextEnrichmentConfig {
  /** Maximum tokens for the enriched prompt. Default: 8000. */
  readonly maxPromptTokens?: number;
  /** Whether to include failure analysis for retries. Default: true. */
  readonly includeFailureAnalysis?: boolean;
  /** Whether to include lore entries. Default: true. */
  readonly includeLore?: boolean;
}

/** Full enriched prompt ready for agent execution. */
export interface EnrichedPrompt {
  readonly prompt: string;
  readonly contextHash: string;          // SHA-256 of prompt for dedup
  readonly sections: ContextSection[];   // Included sections for audit
  readonly totalTokenEstimate: number;
  readonly truncated: boolean;           // Whether context was pruned
}

/** Failure context captured from a failed agent run. */
export interface FailureAnalysis {
  readonly errorMessage: string;
  readonly lastFilesModified: string[];
  readonly gitDiff: string;              // Truncated to 2000 chars
  readonly exitCode: number | null;
  readonly failedAt: string;
}

export class ContextEnrichmentEngine {
  constructor(
    private readonly config: ContextEnrichmentConfig,
    private readonly deps: {
      enrichmentService: EnrichmentService;
      knowledgeGovernor: KnowledgeGovernor;
      reputationService: ReputationService;
      learningEngine: CompoundLearningEngine;
    },
  ) {}

  /**
   * Build an enriched prompt for a fleet agent.
   *
   * Assembly order (critical → relevant → background):
   *
   * CRITICAL (always included):
   * 1. Task description and acceptance criteria
   * 2. Repository context (file tree, key interfaces)
   * 3. Safety instructions (Loa hooks, governance constraints)
   *
   * RELEVANT (included if fits in context window):
   * 4. Knowledge corpus data (freshness-weighted via KnowledgeGovernor)
   * 5. Prior failure analysis (if retry — what went wrong, what to avoid)
   * 6. Reputation context (agent's past performance on similar tasks)
   *
   * BACKGROUND (omitted if context window full):
   * 7. Lore entries (relevant patterns from bridgebuilder reviews)
   * 8. Compound learning insights (topic clusters, knowledge gaps)
   * 9. Related PR history
   *
   * Context window management: sections are included in tier order.
   * Within a tier, sections are ordered by relevance. If total tokens
   * exceed maxPromptTokens, lower-priority sections are truncated or omitted.
   */
  async buildPrompt(
    request: SpawnRequest,
    failureAnalysis?: FailureAnalysis,
  ): Promise<EnrichedPrompt>;

  /**
   * Capture failure context from a failed agent run.
   *
   * Reads the last git diff, error output, and modified files
   * from the worktree to construct a FailureAnalysis.
   */
  async captureFailureContext(
    worktreePath: string,
    errorOutput?: string,
    exitCode?: number | null,
  ): Promise<FailureAnalysis>;
}
```

### 2.7 RetryEngine

Ralph Loop V2 — intelligent failure-aware retry with context enrichment.

**File**: `app/src/services/retry-engine.ts`

**Dependencies**:
- `TaskRegistry` — status updates
- `AgentSpawner` — respawn
- `ContextEnrichmentEngine` — enriched retry prompts
- `CrossGovernorEventBus` — event emission
- `NotificationService` — operator notifications

```typescript
// ---------------------------------------------------------------------------
// RetryEngine — Ralph Loop V2
// ---------------------------------------------------------------------------

export interface RetryEngineConfig {
  /** Maximum retries per task. Default: 3. */
  readonly maxRetries?: number;
  /** Delay between retries in ms. Default: 30_000 (30s). */
  readonly retryDelayMs?: number;
  /** Whether to reduce context on OOM failures. Default: true. */
  readonly reduceContextOnOom?: boolean;
}

export interface RetryEngineDeps {
  readonly taskRegistry: TaskRegistry;
  readonly spawner: AgentSpawner;
  readonly enrichment: ContextEnrichmentEngine;
  readonly eventBus: CrossGovernorEventBus;
  readonly notifications: NotificationService;
  readonly log: (level: string, data: Record<string, unknown>) => void;
}

export class RetryEngine {
  constructor(
    private readonly config: RetryEngineConfig,
    private readonly deps: RetryEngineDeps,
  ) {}

  /**
   * Attempt to retry a failed task.
   *
   * Flow:
   * 1. Check retry budget (INV-017: retryCount < maxRetries)
   * 2. Capture failure context from worktree
   * 3. Query knowledge governance for similar past failures
   * 4. Build enriched retry prompt with failure analysis
   * 5. Transition task: failed → retrying → spawning
   * 6. Spawn new agent process (same worktree, new prompt)
   * 7. Emit AGENT_RETRYING event
   * 8. Log to compound learning
   *
   * If retry budget exhausted: transition to abandoned, notify operator.
   *
   * @returns true if retry was initiated, false if budget exhausted
   */
  async attemptRetry(
    taskId: string,
    failureContext: Record<string, unknown>,
  ): Promise<boolean>;

  /**
   * Check if a task has retry budget remaining.
   */
  async canRetry(taskId: string): Promise<boolean>;
}
```

**INV-017 Enforcement**: `attemptRetry()` reads `retryCount` and `maxRetries`
from the task record. If `retryCount >= maxRetries`, the task transitions to
`abandoned` and the method returns false. The retry count is incremented
atomically in `TaskRegistry.recordFailure()`.

### 2.8 FleetGovernor

GovernedResource implementation that enforces conviction-tier fleet limits.

**File**: `app/src/services/fleet-governor.ts`

**Dependencies**:
- `GovernedResourceBase` (existing) — base class
- `TaskRegistry` — active task counts
- `GovernorRegistry` (existing) — registration
- `AuditTrailStore` (existing) — audit entries

```typescript
// ---------------------------------------------------------------------------
// FleetGovernor — GovernedResource<FleetState>
// ---------------------------------------------------------------------------

import { GovernedResourceBase, type TransitionResult, type InvariantResult } from './governed-resource.js';
import type { AuditTrail, GovernanceMutation } from '@0xhoneyjar/loa-hounfour/commons';

/** Fleet state tracked by the governor. */
export interface FleetState {
  /** Active agent count per operator. */
  readonly activeByOperator: Record<string, number>;
  /** Total active agents across all operators. */
  readonly totalActive: number;
  /** Cumulative spend per operator per day (micro-USD). */
  readonly dailySpend: Record<string, number>;
  /** Fleet config: tier limits. */
  readonly tierLimits: Record<ConvictionTier, number>;
}

/** Events that transition fleet state. */
export type FleetEvent =
  | { readonly type: 'agent_spawned'; readonly operatorId: string; readonly taskId: string; readonly model: string }
  | { readonly type: 'agent_completed'; readonly operatorId: string; readonly taskId: string; readonly success: boolean }
  | { readonly type: 'agent_failed'; readonly operatorId: string; readonly taskId: string; readonly reason: string }
  | { readonly type: 'config_updated'; readonly tierLimits: Record<ConvictionTier, number> };

/** Fleet invariant identifiers. */
export type FleetInvariant =
  | 'INV-014'  // agent count <= tier limit
  | 'INV-015'  // every agent tracked in registry
  | 'INV-016'; // every completed agent has audit entry

/** Default conviction-tier fleet limits per PRD §3. */
export const DEFAULT_TIER_LIMITS: Record<ConvictionTier, number> = {
  observer: 0,       // Read-only access
  participant: 0,    // No fleet access
  builder: 1,        // 1 concurrent agent
  architect: 3,      // 3 concurrent agents (PRD: "expert" → mapped to "architect")
  sovereign: 10,     // Unlimited (capped at 10 for resource safety)
};

export class FleetGovernor
  extends GovernedResourceBase<FleetState, FleetEvent, FleetInvariant>
{
  readonly resourceId = 'fleet-governor';
  readonly resourceType = 'fleet';
  protected readonly invariantIds: FleetInvariant[] = ['INV-014', 'INV-015', 'INV-016'];

  private state: FleetState;
  private _version = 0;
  private readonly _auditTrail: AuditTrail;
  private readonly _mutationLog: GovernanceMutation[] = [];
  private readonly taskRegistry: TaskRegistry;

  constructor(taskRegistry: TaskRegistry) {
    super();
    this.taskRegistry = taskRegistry;
    this.state = {
      activeByOperator: {},
      totalActive: 0,
      dailySpend: {},
      tierLimits: { ...DEFAULT_TIER_LIMITS },
    };
    this._auditTrail = { entries: [] };
  }

  get current(): FleetState { return this.state; }
  get version(): number { return this._version; }
  get auditTrail(): Readonly<AuditTrail> { return this._auditTrail; }
  get mutationLog(): ReadonlyArray<GovernanceMutation> { return this._mutationLog; }

  /**
   * Check if an operator can spawn a new agent.
   * [Flatline SKP-003]
   *
   * Enforces INV-014: active count < tier limit.
   *
   * IMPORTANT: This in-memory check is a READ-PATH CACHE ONLY. It provides
   * a fast pre-check to avoid unnecessary DB round-trips for clearly
   * over-limit operators. The authoritative admission decision is made by
   * `admitAndInsert()` below using a DB transaction with row-level locking.
   *
   * Governor state is DERIVED from DB, not authoritative. The in-memory
   * counter (`activeByOperator`) may be stale under concurrent requests.
   * Never use this method alone as a gate — always follow with
   * `admitAndInsert()` for the actual spawn.
   */
  canSpawn(operatorId: string, tier: ConvictionTier): { allowed: boolean; reason: string } {
    const limit = this.state.tierLimits[tier];
    const current = this.state.activeByOperator[operatorId] ?? 0;

    if (limit === 0) {
      return { allowed: false, reason: `Tier '${tier}' does not have fleet access` };
    }
    if (current >= limit) {
      return {
        allowed: false,
        reason: `Agent limit reached (${current}/${limit} for tier '${tier}')`,
      };
    }
    return { allowed: true, reason: 'ok' };
  }

  /**
   * Atomic DB-transactional admission control. [Flatline SKP-003]
   *
   * This is the AUTHORITATIVE admission gate. It performs the admission
   * check and task insertion as a single atomic DB transaction with
   * row-level locking to prevent TOCTOU races between concurrent spawn
   * requests for the same operator.
   *
   * Algorithm:
   *   BEGIN;
   *   SELECT COUNT(*) FROM fleet_tasks
   *     WHERE operator_id = $1
   *       AND status IN ('spawning','running','pr_created','reviewing')
   *     FOR UPDATE;
   *   -- Compare count against tier limit
   *   -- If under limit: INSERT new task, COMMIT, return task ID
   *   -- If at limit: ROLLBACK, throw SpawnDeniedError
   *   COMMIT;
   *
   * The in-memory `canSpawn()` is a cache for the read-path only.
   * This method is the write-path gate that ConductorEngine.spawn() MUST
   * call. After successful commit, the in-memory state is updated to
   * reflect the new count.
   *
   * @throws SpawnDeniedError if tier limit would be exceeded
   * @throws DatabaseError if transaction fails
   */
  async admitAndInsert(
    operatorId: string,
    tier: ConvictionTier,
    taskInput: CreateFleetTaskInput,
  ): Promise<string>;

  /**
   * Transition fleet state in response to events.
   */
  async transition(event: FleetEvent, actorId: string): Promise<TransitionResult<FleetState>>;

  /**
   * Verify a specific fleet invariant.
   *
   * INV-014: For each operator, activeByOperator[op] <= tierLimits[op.tier]
   * INV-015: totalActive == count of live tasks in TaskRegistry
   * INV-016: Check audit trail has entries for all completed tasks
   */
  verify(invariantId: FleetInvariant): InvariantResult;
}
```

**Registration**: FleetGovernor is registered with `GovernorRegistry` during
`createDixieApp()`, alongside existing `corpusMeta` and `knowledgeGovernor`:

```typescript
// In server.ts createDixieApp():
const fleetGovernor = new FleetGovernor(taskRegistry);
if (!governorRegistry.get(fleetGovernor.resourceType)) {
  governorRegistry.register(fleetGovernor);
}
governorRegistry.registerResource(fleetGovernor);
```

### 2.9 CrossGovernorEventBus

Typed event pub/sub extending the existing SignalEmitter for cross-governor
coordination.

**File**: `app/src/services/cross-governor-event-bus.ts`

**Dependencies**:
- `SignalEmitter` (existing) — NATS pub/sub
- `GovernorRegistry` (existing) — governor lookup

```typescript
// ---------------------------------------------------------------------------
// CrossGovernorEventBus — Typed Fleet Events
// ---------------------------------------------------------------------------

/** All fleet event types for the event bus. */
export type FleetEventType =
  | 'AGENT_SPAWNED'
  | 'AGENT_COMPLETED'
  | 'AGENT_FAILED'
  | 'AGENT_RETRYING'
  | 'REPUTATION_UPDATED'
  | 'KNOWLEDGE_DRIFT'
  | 'FLEET_OVERLOAD'
  | 'GOVERNANCE_ALERT';

/** Typed event payload. */
export interface FleetBusEvent<T extends FleetEventType = FleetEventType> {
  readonly type: T;
  readonly taskId: string;
  readonly operatorId: string;
  readonly timestamp: string;
  readonly payload: Record<string, unknown>;
}

/** Event handler function type. */
export type FleetEventHandler = (event: FleetBusEvent) => void | Promise<void>;

/**
 * NATS subjects for fleet events.
 * Extends SignalEmitter.SUBJECTS with fleet-specific subjects.
 */
export const FLEET_SUBJECTS = {
  AGENT_SPAWNED: 'dixie.signal.fleet.spawned',
  AGENT_COMPLETED: 'dixie.signal.fleet.completed',
  AGENT_FAILED: 'dixie.signal.fleet.failed',
  AGENT_RETRYING: 'dixie.signal.fleet.retrying',
  REPUTATION_UPDATED: 'dixie.signal.fleet.reputation',
  KNOWLEDGE_DRIFT: 'dixie.signal.fleet.knowledge_drift',
  FLEET_OVERLOAD: 'dixie.signal.fleet.overload',
  GOVERNANCE_ALERT: 'dixie.signal.fleet.governance',
} as const;

export class CrossGovernorEventBus {
  private readonly handlers = new Map<FleetEventType, FleetEventHandler[]>();
  private readonly signalEmitter: SignalEmitter | null;
  private readonly log: (level: string, data: Record<string, unknown>) => void;

  constructor(deps: {
    signalEmitter: SignalEmitter | null;
    log: (level: string, data: Record<string, unknown>) => void;
  }) {
    this.signalEmitter = deps.signalEmitter;
    this.log = deps.log;
  }

  /**
   * Subscribe a handler to a fleet event type.
   */
  on(eventType: FleetEventType, handler: FleetEventHandler): void;

  /**
   * Emit a fleet event.
   *
   * 1. Invoke all registered in-process handlers (synchronous-first)
   * 2. Publish to NATS via SignalEmitter (fire-and-forget)
   * 3. If NATS unavailable: log warning, in-process handlers still fire
   *
   * Graceful degradation: NATS failure does not block event processing.
   */
  async emit(event: FleetBusEvent): Promise<void>;

  /**
   * Remove all handlers for a specific event type.
   */
  off(eventType: FleetEventType): void;
}
```

### 2.10 NotificationService

Webhook delivery to Discord, Telegram, and CLI stdout with exponential backoff.

**File**: `app/src/services/notification-service.ts`

**Dependencies**: None (pure HTTP client + CLI output)

```typescript
// ---------------------------------------------------------------------------
// NotificationService — Operator Notification Delivery
// ---------------------------------------------------------------------------

/** Notification channel configuration. */
export interface NotificationConfig {
  /** Discord webhook URL. Null disables Discord. */
  readonly discordWebhookUrl: string | null;
  /** Telegram bot token. Null disables Telegram. */
  readonly telegramBotToken: string | null;
  /** Telegram chat ID for notifications. */
  readonly telegramChatId: string | null;
  /** Whether to log notifications to CLI stdout. Default: true. */
  readonly cliOutput?: boolean;
  /** Max delivery retries per notification. Default: 3. */
  readonly maxRetries?: number;
  /** Base delay for exponential backoff in ms. Default: 1000. */
  readonly baseDelayMs?: number;
}

/** Notification payload. */
export interface NotificationPayload {
  readonly type: 'agent_spawned' | 'agent_completed' | 'agent_failed'
    | 'agent_abandoned' | 'pr_ready' | 'ci_failed' | 'fleet_summary';
  readonly taskId: string;
  readonly operatorId: string;
  readonly summary: string;
  /** Optional structured data (PR link, branch, model, etc). */
  readonly details?: Record<string, unknown>;
}

/** Delivery result per channel. */
export interface DeliveryResult {
  readonly channel: 'discord' | 'telegram' | 'cli';
  readonly success: boolean;
  readonly error?: string;
  readonly attempts: number;
}

export class NotificationService {
  constructor(private readonly config: NotificationConfig) {}

  /**
   * Send a notification to all configured channels.
   *
   * INV-018: Notifications delivered for every terminal state.
   * Channels are attempted in parallel. Individual channel failures
   * don't block other channels.
   *
   * Exponential backoff: delay = baseDelay * 2^attempt (capped at 30s).
   * After maxRetries failures, falls back to CLI stdout.
   */
  async send(payload: NotificationPayload): Promise<DeliveryResult[]>;

  /**
   * Send a Discord webhook notification.
   *
   * Message format:
   * ```
   * **Fleet Agent Update**
   * Type: <type>
   * Task: <taskId>
   * Summary: <summary>
   * [PR: #<number>](link) | Branch: <branch>
   * ```
   */
  private async sendDiscord(payload: NotificationPayload): Promise<DeliveryResult>;

  /**
   * Send a Telegram bot message.
   *
   * Uses Telegram Bot API: POST /bot<token>/sendMessage
   */
  private async sendTelegram(payload: NotificationPayload): Promise<DeliveryResult>;

  /**
   * Log notification to CLI stdout (always succeeds).
   */
  private sendCli(payload: NotificationPayload): DeliveryResult;
}
```

### 2.11 CrossSurfaceAuthMiddleware

Unified SIWE + JWT authentication for fleet operations across all surfaces.

**File**: `app/src/middleware/fleet-auth.ts`

**Dependencies**:
- Existing JWT middleware (position 8 in pipeline)
- Existing conviction tier middleware (position 13)
- Existing wallet bridge middleware (position 9)

```typescript
// ---------------------------------------------------------------------------
// CrossSurfaceAuthMiddleware — SIWE + JWT Unified Fleet Auth
// ---------------------------------------------------------------------------

import { createMiddleware } from 'hono/factory';
import type { ConvictionTier } from '../types/conviction.js';
import { tierMeetsRequirement } from '../types/conviction.js';

/** Minimum conviction tier required for fleet operations. */
const FLEET_MINIMUM_TIER: ConvictionTier = 'builder';

/** Per-operation tier requirements. */
const OPERATION_TIER_MAP: Record<string, ConvictionTier> = {
  'fleet:spawn': 'builder',         // FR-14: builder can spawn 1 agent
  'fleet:status': 'observer',       // Read-only access
  'fleet:stop': 'builder',          // Must own the task
  'fleet:logs': 'observer',         // Read-only
  'fleet:delete': 'builder',        // Must own the task
  'fleet:config': 'sovereign',      // Admin-level fleet configuration
};

/**
 * Fleet auth middleware — conviction-tier gating for fleet operations.
 * [Flatline SKP-001]
 *
 * **SECURITY: Never trust client-supplied identity headers.**
 * All identity (operator_id, conviction_tier) is derived ONLY from verified
 * JWT claims. Inbound `x-conviction-tier` and `x-wallet-address` headers
 * are STRIPPED at edge before any processing — a client could trivially
 * spoof these to escalate tier or impersonate another operator.
 *
 * All fleet routes already pass through the global middleware pipeline
 * (JWT at position 8, conviction tier at position 13). This middleware
 * adds fleet-specific tier validation on top.
 *
 * Cross-surface auth model (PRD §5.7):
 * - Web: SIWE → JWT (standard flow, existing)
 * - Discord: /verify → SIWE deep link → JWT stored per user ID
 * - Telegram: /verify → SIWE deep link → JWT stored per chat ID
 * - CLI: wallet-bridge middleware → JWT
 *
 * All surfaces produce a JWT. Fleet routes consume the JWT via existing
 * middleware. This layer enforces fleet-specific tier requirements.
 *
 * Replay protection:
 * - JWT includes jti (unique ID) + iat + exp
 * - SIWE nonces stored in PG (existing auth flow)
 * - Discord/Telegram commands include request hash
 */
export function createFleetAuthMiddleware() {
  return createMiddleware(async (c, next) => {
    // [Flatline SKP-001] STRIP spoofable identity headers at edge.
    // These MUST be deleted before any downstream code reads them.
    // Identity is derived exclusively from verified JWT claims below.
    c.req.raw.headers.delete('x-conviction-tier');
    c.req.raw.headers.delete('x-wallet-address');
    c.req.raw.headers.delete('x-fleet-operator-id');
    c.req.raw.headers.delete('x-fleet-conviction-tier');

    // [Flatline SKP-001] Derive identity from verified JWT claims ONLY.
    // The JWT middleware (position 8) has already validated the token and
    // populated c.get('jwtPayload'). We extract operator_id and
    // conviction_tier from the verified payload — never from headers.
    const jwtPayload = c.get('jwtPayload');
    const wallet: string | undefined = jwtPayload?.sub;       // operator wallet from JWT subject
    const tier: ConvictionTier | undefined = jwtPayload?.tier; // conviction tier from JWT claim

    if (!wallet) {
      return c.json(
        { error: 'unauthorized', message: 'Fleet operations require authentication' },
        401,
      );
    }

    if (!tier || !tierMeetsRequirement(tier, FLEET_MINIMUM_TIER)) {
      return c.json(
        {
          error: 'forbidden',
          message: `Fleet operations require ${FLEET_MINIMUM_TIER}+ conviction tier`,
          current_tier: tier ?? 'unknown',
          required_tier: FLEET_MINIMUM_TIER,
        },
        403,
      );
    }

    // Inject fleet-specific context for downstream route handlers.
    // These are set from verified JWT claims, NOT from inbound headers.
    c.req.raw.headers.set('x-fleet-operator-id', wallet);
    c.req.raw.headers.set('x-fleet-conviction-tier', tier);

    await next();
  });
}

/**
 * Operation-specific tier check (used within route handlers).
 * Returns null if authorized, or an error response.
 */
export function checkFleetOperation(
  tier: ConvictionTier,
  operation: string,
): { error: string; required: ConvictionTier } | null {
  const required = OPERATION_TIER_MAP[operation] ?? FLEET_MINIMUM_TIER;
  if (!tierMeetsRequirement(tier, required)) {
    return { error: `Operation '${operation}' requires ${required}+ tier`, required };
  }
  return null;
}
```

---

## 3. Data Model

### 3.1 Migration 013: Fleet Task Registry

**File**: `app/src/db/migrations/013_fleet_orchestration.sql`

```sql
-- Migration: 013_fleet_orchestration.sql
-- Fleet task registry, notification log, and fleet configuration tables.
-- Supports the Conductor Engine (cycle-012: Agent Fleet Orchestration).
-- See: SDD §3.1, PRD §5.8

-- ---------------------------------------------------------------------------
-- fleet_tasks — Primary task tracking table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fleet_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     TEXT NOT NULL,           -- dNFT ID or wallet address
  agent_type      TEXT NOT NULL,           -- 'claude_code' | 'codex' | 'gemini'
  model           TEXT NOT NULL,           -- 'claude-opus-4-6' | 'codex-mini-latest' | ...
  task_type       TEXT NOT NULL,           -- 'bug_fix' | 'feature' | 'refactor' | 'review' | 'docs'
  description     TEXT NOT NULL,
  branch          TEXT NOT NULL,
  worktree_path   TEXT,
  container_id    TEXT,                    -- container mode: docker/podman container ID
  tmux_session    TEXT,                    -- local mode: tmux session name
  status          TEXT NOT NULL DEFAULT 'proposed',
  version         INTEGER NOT NULL DEFAULT 0,  -- [Flatline IMP-001] optimistic concurrency control
  pr_number       INTEGER,
  ci_status       TEXT,                    -- 'pending' | 'passing' | 'failing'
  review_status   JSONB,                   -- per-model review verdicts
  retry_count     INTEGER NOT NULL DEFAULT 0,
  max_retries     INTEGER NOT NULL DEFAULT 3,
  context_hash    TEXT,                    -- SHA-256 hash of enriched prompt
  failure_context JSONB,                   -- last failure info for retry enrichment
  spawned_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN (
    'proposed', 'spawning', 'running', 'pr_created', 'reviewing',
    'ready', 'merged', 'failed', 'retrying', 'abandoned', 'rejected',
    'cancelled'  -- [Flatline SKP-005] operator-initiated stop
  )),
  CONSTRAINT valid_agent_type CHECK (agent_type IN (
    'claude_code', 'codex', 'gemini'
  )),
  CONSTRAINT valid_task_type CHECK (task_type IN (
    'bug_fix', 'feature', 'refactor', 'review', 'docs'
  )),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_fleet_tasks_operator ON fleet_tasks(operator_id);
CREATE INDEX IF NOT EXISTS idx_fleet_tasks_status ON fleet_tasks(status);
CREATE INDEX IF NOT EXISTS idx_fleet_tasks_branch ON fleet_tasks(branch);
CREATE INDEX IF NOT EXISTS idx_fleet_tasks_created ON fleet_tasks(created_at DESC);

-- Partial index for active tasks (frequently queried in monitor loop)
CREATE INDEX IF NOT EXISTS idx_fleet_tasks_active ON fleet_tasks(status)
  WHERE status IN ('proposed', 'spawning', 'running', 'pr_created', 'reviewing', 'retrying');

-- ---------------------------------------------------------------------------
-- fleet_notifications — Notification delivery log (audit + retry)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fleet_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES fleet_tasks(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL,           -- 'discord' | 'telegram' | 'cli'
  payload         JSONB NOT NULL,
  delivered       BOOLEAN NOT NULL DEFAULT FALSE,
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_channel CHECK (channel IN ('discord', 'telegram', 'cli'))
);

CREATE INDEX IF NOT EXISTS idx_fleet_notifications_task ON fleet_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_fleet_notifications_pending
  ON fleet_notifications(delivered, created_at)
  WHERE delivered = FALSE;

-- ---------------------------------------------------------------------------
-- fleet_config — Operator-level fleet configuration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fleet_config (
  operator_id     TEXT PRIMARY KEY,
  -- Notification preferences
  discord_webhook_url TEXT,
  telegram_bot_token  TEXT,                -- ENCRYPTED: stored via pgcrypto or app-level encryption
  telegram_chat_id    TEXT,
  notify_on_spawn     BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_complete  BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_failure   BOOLEAN NOT NULL DEFAULT TRUE,
  -- Fleet preferences
  default_max_retries INTEGER NOT NULL DEFAULT 3,
  default_timeout_minutes INTEGER NOT NULL DEFAULT 120,
  preferred_model     TEXT,
  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger for fleet_tasks
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_fleet_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fleet_tasks_updated_at ON fleet_tasks;
CREATE TRIGGER trg_fleet_tasks_updated_at
  BEFORE UPDATE ON fleet_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_fleet_tasks_updated_at();

-- ---------------------------------------------------------------------------
-- updated_at trigger for fleet_config
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_fleet_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fleet_config_updated_at ON fleet_config;
CREATE TRIGGER trg_fleet_config_updated_at
  BEFORE UPDATE ON fleet_config
  FOR EACH ROW
  EXECUTE FUNCTION update_fleet_config_updated_at();
```

### 3.2 Entity Relationship

```
fleet_config (operator_id PK)
    │
    │ 1:N (operator_id)
    ▼
fleet_tasks (id PK)
    │
    │ 1:N (task_id FK)
    ▼
fleet_notifications (id PK)

-- Existing tables referenced but not FK'd (cross-concern):
-- reputation_aggregates (nft_id) — queried for agent scoring
-- governance_mutations (mutation_id) — fleet mutation logging
-- audit_entries (entry_id) — fleet audit trail
```

### 3.3 Security Note on Sensitive Fields

Per PRD §5.6: **Financial data is sacrosanct — never logged in plaintext.**

- `fleet_config.telegram_bot_token`: Encrypted at rest via application-level
  AES-256-GCM encryption before PG storage. Decrypted only at delivery time
  in `NotificationService`. Encryption key sourced from
  `DIXIE_FLEET_ENCRYPTION_KEY` environment variable.
- `fleet_config.discord_webhook_url`: Contains a secret token. Same encryption
  treatment as telegram_bot_token.
- `fleet_tasks.failure_context`: May contain stack traces. Sanitized before
  storage to remove environment variables, file paths outside worktree, and
  any strings matching secret patterns (`/[A-Za-z0-9+/=]{40,}/`).

---

## 4. API Design

### 4.1 Route Registration

**File**: `app/src/routes/fleet.ts`

Follows the existing route factory pattern (`createXxxRoutes(deps)`):

```typescript
// ---------------------------------------------------------------------------
// Fleet Routes — /api/fleet/*
// ---------------------------------------------------------------------------

import { Hono } from 'hono';
import type { ConductorEngine } from '../services/conductor-engine.js';
import type { ConvictionTier } from '../types/conviction.js';
import { isValidPathParam } from '../validation.js';
import { checkFleetOperation } from '../middleware/fleet-auth.js';

export interface FleetRouteDeps {
  readonly conductor: ConductorEngine;
}

/**
 * Ownership enforcement middleware for task-specific routes. [Flatline IMP-007]
 *
 * Applied to all /tasks/:id/* routes. Ensures the authenticated operator
 * owns the task they are attempting to access or modify.
 *
 * Algorithm:
 *   1. Extract task ID from route params
 *   2. Load task record from TaskRegistry
 *   3. Compare task.operatorId with the authenticated operator (from JWT)
 *   4. If mismatch AND operator is not admin/oracle tier → 403 Forbidden
 *
 * Admin/oracle tier operators bypass ownership checks for fleet-wide
 * visibility and emergency intervention.
 */
async function enforceOwnership(c: Context, next: Next): Promise<void> {
  const taskId = c.req.param('id');
  if (!taskId || !isValidPathParam(taskId)) return c.json({ error: 'Invalid task ID' }, 400);

  const task = await c.get('conductor').taskRegistry.get(taskId);
  if (!task) return c.json({ error: 'Task not found' }, 404);

  const operatorId = c.get('operatorId');   // Set by JWT middleware
  const tier: ConvictionTier = c.get('convictionTier');

  // Admin and oracle tiers bypass ownership (fleet-wide visibility)
  const ADMIN_TIERS: ConvictionTier[] = ['admin', 'oracle'];
  if (task.operatorId !== operatorId && !ADMIN_TIERS.includes(tier)) {
    return c.json({ error: 'Forbidden: you do not own this task' }, 403);
  }

  c.set('task', task);  // Stash for downstream handlers (avoid re-fetch)
  await next();
}

export function createFleetRoutes(deps: FleetRouteDeps): Hono {
  const { conductor } = deps;
  const app = new Hono();

  // Fleet-specific auth middleware (conviction-tier gating)
  // Applied to all fleet routes
  app.use('*', createFleetAuthMiddleware());

  // [Flatline IMP-007] Ownership enforcement on all task-specific routes.
  // Prevents operators from accessing/modifying tasks they don't own
  // (unless admin/oracle tier).
  app.use('/tasks/:id/*', enforceOwnership);
  app.use('/tasks/:id', enforceOwnership);

  // Routes defined below...

  return app;
}
```

Registered in `server.ts`:

```typescript
// In createDixieApp():
app.route('/api/fleet', createFleetRoutes({ conductor: conductorEngine }));
```

### 4.2 POST /api/fleet/spawn

Spawn a new fleet agent.

**Request**:

```typescript
// TypeBox schema
const SpawnRequestSchema = Type.Object({
  description: Type.String({ minLength: 1, maxLength: 5000 }),
  taskType: Type.Union([
    Type.Literal('bug_fix'),
    Type.Literal('feature'),
    Type.Literal('refactor'),
    Type.Literal('review'),
    Type.Literal('docs'),
  ]),
  repository: Type.Optional(Type.String({ maxLength: 500 })),
  baseBranch: Type.Optional(Type.String({ maxLength: 200, default: 'main' })),
  agentType: Type.Optional(Type.Union([
    Type.Literal('claude_code'),
    Type.Literal('codex'),
    Type.Literal('gemini'),
  ])),
  model: Type.Optional(Type.String({ maxLength: 100 })),
  maxRetries: Type.Optional(Type.Integer({ minimum: 0, maximum: 10, default: 3 })),
  timeoutMinutes: Type.Optional(Type.Integer({ minimum: 5, maximum: 480, default: 120 })),
  contextOverrides: Type.Optional(Type.Record(Type.String(), Type.String())),
});
```

**Response** (201):

```typescript
const SpawnResponseSchema = Type.Object({
  taskId: Type.String({ format: 'uuid' }),
  branch: Type.String(),
  worktreePath: Type.String(),
  agentType: Type.String(),
  model: Type.String(),
  status: Type.Literal('spawning'),
});
```

**Error Responses**:

| Status | Condition |
|--------|-----------|
| 400 | Invalid request body (TypeBox validation failure) |
| 401 | No authentication (missing JWT) |
| 403 | Conviction tier below `builder` or tier limit exceeded |
| 503 | Database unavailable (no PG pool) |

### 4.3 GET /api/fleet/status

Get fleet status summary.

**Tenant Isolation** [Flatline SKP-004]:
- Default scope is **caller-only**: the query implicitly filters by
  `WHERE operator_id = $authenticated_operator` (derived from JWT, per SKP-001).
  Non-admin callers CANNOT see other operators' tasks.
- Optional `?all=true` parameter enables fleet-wide view but requires
  `admin` or `oracle` conviction tier. Returns 403 if a lower-tier caller
  attempts `?all=true`.
- Task-specific endpoints (`GET /tasks/:id`) already enforce ownership via
  the `enforceOwnership` middleware [Flatline IMP-007].

**Request**: Query parameters:

```typescript
const StatusQuerySchema = Type.Object({
  status: Type.Optional(Type.String()),  // Comma-separated status filter
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 50 })),
  all: Type.Optional(Type.Boolean({ default: false })),  // [Flatline SKP-004] fleet-wide view (admin/oracle only)
});
// NOTE: operatorId is no longer a query parameter — it is always derived
// from the authenticated JWT subject. The `all` flag is the only way to
// see other operators' tasks, and it requires admin/oracle tier.
```

**Response** (200):

```typescript
const FleetStatusResponseSchema = Type.Object({
  activeTasks: Type.Integer(),
  completedTasks: Type.Integer(),
  failedTasks: Type.Integer(),
  tasks: Type.Array(Type.Object({
    id: Type.String({ format: 'uuid' }),
    status: Type.String(),
    description: Type.String(),
    agentType: Type.String(),
    model: Type.String(),
    branch: Type.String(),
    prNumber: Type.Union([Type.Integer(), Type.Null()]),
    ciStatus: Type.Union([Type.String(), Type.Null()]),
    retryCount: Type.Integer(),
    spawnedAt: Type.Union([Type.String(), Type.Null()]),
    durationMinutes: Type.Union([Type.Number(), Type.Null()]),
  })),
});
```

**Conviction tier gating**: `observer`+ can view status (read-only fleet access per PRD §3).
Callers see only their own tasks unless `?all=true` with admin/oracle tier [Flatline SKP-004].

### 4.4 GET /api/fleet/tasks/:id

Get detailed info for a single fleet task.

**Response** (200):

```typescript
const TaskDetailResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  operatorId: Type.String(),
  agentType: Type.String(),
  model: Type.String(),
  taskType: Type.String(),
  description: Type.String(),
  branch: Type.String(),
  status: Type.String(),
  prNumber: Type.Union([Type.Integer(), Type.Null()]),
  ciStatus: Type.Union([Type.String(), Type.Null()]),
  reviewStatus: Type.Union([Type.Object({}), Type.Null()]),
  retryCount: Type.Integer(),
  maxRetries: Type.Integer(),
  spawnedAt: Type.Union([Type.String(), Type.Null()]),
  completedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
});
```

**Error**: 404 if task not found, 403 if not task owner (enforced by
`enforceOwnership` middleware [Flatline IMP-007]).

### 4.5 POST /api/fleet/tasks/:id/stop

Stop a running agent. Requires `builder`+ tier. Ownership enforced by
`enforceOwnership` middleware [Flatline IMP-007].

**Response** (200):

```typescript
const StopResponseSchema = Type.Object({
  taskId: Type.String(),
  status: Type.Literal('failed'),
  message: Type.String(),
});
```

**Errors**: 404 (task not found), 403 (not task owner — `enforceOwnership` [Flatline IMP-007]), 409 (task not in stoppable state).

### 4.6 GET /api/fleet/tasks/:id/logs

Get agent logs (last N lines).

**Request**: Query parameter `lines` (default: 100, max: 1000).

**Response** (200):

```typescript
const LogsResponseSchema = Type.Object({
  taskId: Type.String(),
  lines: Type.Integer(),
  output: Type.String(),
});
```

### 4.7 DELETE /api/fleet/tasks/:id

Delete a completed/failed/abandoned task and clean up worktree.

**Response** (200):

```typescript
const DeleteResponseSchema = Type.Object({
  taskId: Type.String(),
  deleted: Type.Boolean(),
  message: Type.String(),
});
```

**Errors**: 404 (not found), 403 (not owner — `enforceOwnership` [Flatline IMP-007]), 409 (task still active — must stop first).

---

## 5. Security Design

### 5.1 Container Isolation Model (Production)

Per PRD §5.6, production fleet agents run in containers with defense-in-depth:

| Layer | Control | Implementation |
|-------|---------|----------------|
| **Filesystem** | Read-only root, writable worktree only | `docker run --read-only -v <worktree>:/workspace` |
| **Process** | No privilege escalation | `--security-opt no-new-privileges` |
| **Network** | Egress allowlist only | Docker network `fleet-egress` with iptables rules allowing only GitHub, npm, model API endpoints |
| **Memory** | Hard limits per agent | `--memory=2g` |
| **CPU** | Capped per agent | `--cpus=2` |
| **Secrets** | Per-agent scoped tokens, never in worktree | `--env-file <scoped-env>` with short-lived tokens |
| **Credentials** | No SSH keys, HTTPS-only git | GitHub App installation token per agent, repo-scoped, expires with task [Flatline IMP-005] |
| **PID Namespace** | Isolated | Container default PID namespace isolation |
| **Metadata** | No cloud metadata access | `--add-host metadata.google.internal:127.0.0.1` (or equivalent) |

#### 5.1.1 Docker Socket Least-Privilege [Flatline IMP-002]

The conductor process MUST NOT have direct access to the Docker socket
(`/var/run/docker.sock`). Direct socket access grants full daemon control —
equivalent to root on the host. Instead, use one of:

1. **Docker Socket Proxy (preferred)** — e.g. [Tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy).
   Configure an allowlist of permitted API calls:

   | Allowed Endpoint | Purpose |
   |------------------|---------|
   | `POST /containers/create` | Spawn agent containers |
   | `POST /containers/:id/start` | Start created containers |
   | `POST /containers/:id/stop` | Stop running agents |
   | `GET /containers/:id/json` | Inspect container state |
   | `GET /containers/:id/logs` | Retrieve agent output |
   | `GET /containers/json` | List containers for reconciliation |
   | `DELETE /containers/:id` | Remove terminated containers |

   All other Docker API endpoints (exec, build, images, volumes, networks, system)
   MUST be denied by the proxy.

2. **Docker-out-of-Docker (DooD)** — The conductor runs inside its own
   container and communicates with the Docker daemon via a read-only bind mount
   of a restricted socket proxy. This adds an additional isolation boundary.

The `AgentSpawner` should communicate with the proxy endpoint (e.g.
`DOCKER_HOST=tcp://docker-proxy:2375`) rather than the raw socket.

### 5.2 Secret Injection Model

```
Environment Variable Flow:

Operator → Dixie API → ConductorEngine → AgentSpawner
                                              │
                              ┌────────────────┤
                              ▼                ▼
                        Local (tmux)    Container (docker)
                        env vars via    --env-file with
                        tmux set-env    temp file (0600,
                                        deleted after start)
```

Secrets never touch:
- Git worktree files
- Agent logs (sanitized before capture)
- Notification payloads
- Audit trail entries (financial data sacrosanct — INV-016 payload redaction)

### 5.3 Per-Spawn Token Issuance [Flatline IMP-005]

**Principle**: No shared tokens between agents. Every spawned agent receives
its own set of scoped, short-lived credentials. Token compromise in one agent
cannot affect any other agent or the conductor itself.

| Token | Issuance Model | Scope | Lifetime | Rotation |
|-------|---------------|-------|----------|----------|
| **Git access** | GitHub App installation token | Repo-scoped: `contents: write`, `pull_requests: write`, `checks: read` | Task duration + 1hr (max 1hr, auto-renewed) | New installation token per spawn via `POST /app/installations/:id/access_tokens` |
| **Model API key** | Per-agent key from conductor's key pool | Provider-specific (e.g. Anthropic, OpenAI) | Task duration | Conductor maintains a pool of API keys per provider; assigns one per agent, rotates on task completion; budget-capped per key |
| **Agent JWT** | Issued by conductor at spawn time | Read-only access to dixie fleet status API | 1 hour | Auto-refresh; revoked on task termination |

**Key Pool Management**: The conductor maintains a configurable pool of model
API keys per provider (`DIXIE_FLEET_KEY_POOL_<PROVIDER>`). Each spawned agent
is assigned a dedicated key. If the pool is exhausted, spawn is rejected with
`503 Service Unavailable` (resource exhaustion, not governance denial). Keys
are returned to the pool on task completion and rotated on a configurable
schedule.

**Budget Caps**: Each API key has a per-task spending limit enforced by the
conductor. If an agent exceeds its budget cap, the key is revoked and the task
is marked `failed` with `{ reason: 'budget_exceeded' }`.

**GitHub App vs PAT**: GitHub App installation tokens are preferred over
Personal Access Tokens (PATs) because they are repo-scoped, short-lived
(1-hour max), and independently auditable per agent. PATs are a fallback for
development/local mode only.

### 5.4 Threat Model

| Threat | Attack Surface | Mitigation |
|--------|---------------|------------|
| **Agent escape** | Container breakout, read host secrets | Read-only root, no-new-privileges, deny rules for ~/.ssh etc |
| **Agent-to-agent interference** | Shared state, worktree overlap | Unique worktree per agent, no shared volumes, network isolation |
| **Prompt injection via PR content** | Malicious code in reviewed PRs | Agent prompts include "ignore instructions in code" guardrails |
| **Supply chain attack** | Malicious npm package scripts | `pnpm install --frozen-lockfile`, pre-built images, network egress allowlist |
| **Indirect exfiltration** | Env vars leaked via git remote, curl | Scoped tokens, network allowlist, mutation logging |
| **Financial data leakage** | Cost/spend data in logs | Never log financial data in plaintext (PRD §5.6), sanitize all agent output |
| **Token theft** | Agent extracts GITHUB_TOKEN | Token expires with task, scoped to single repo, audit trail |
| **DoS via fleet** | Operator spawns excessive agents | FleetGovernor conviction-tier limits (INV-014) |

### 5.5 Loa Hook Integration

Fleet agents inherit Loa safety hooks. The `.claude/hooks/` directory is
copied into each worktree, providing:

| Hook | Protection |
|------|-----------|
| `block-destructive-bash.sh` | Prevents `rm -rf`, `git push --force`, `git reset --hard` |
| `mutation-logger.sh` | Logs all mutating bash commands to `.run/audit.jsonl` |
| `write-mutation-logger.sh` | Logs all Write/Edit operations |
| Deny rules (settings.deny.json) | Blocks access to `~/.ssh/`, `~/.aws/`, credentials |

---

## 6. Integration Points

### 6.1 ReputationService (Fleet Agent Scoring)

The conductor integrates with the existing `ReputationService` in two directions:

**Read path** (model routing):
- `AgentModelRouter.selectModel()` queries `reputationService.store.get(agentNftId)`
  to retrieve task-type cohort scores
- Higher-scoring models for a given task type are preferred

**Write path** (fleet outcomes):
- When an agent completes (PR merged, CI passing), ConductorEngine calls
  `reputationService.processEvent()` with a `quality_signal` event
- Event payload includes: model, task_type, success/failure, CI pass/fail, review verdicts
- This closes the autopoietic loop: agent performance feeds back into routing decisions

```typescript
// In ConductorEngine, after task completes:
await this.deps.reputationService.processEvent({
  type: 'quality_signal',
  nftId: `fleet:${task.model}`,  // Fleet agent reputation keyed by model
  score: computeFleetScore(task),
  model: task.model,
  taskType: task.taskType,
  metadata: {
    prNumber: task.prNumber,
    ciStatus: task.ciStatus,
    retryCount: task.retryCount,
  },
});
```

### 6.2 KnowledgeGovernor (Context Enrichment)

`ContextEnrichmentEngine` queries `KnowledgeGovernor` for corpus freshness:

```typescript
// In ContextEnrichmentEngine.buildPrompt():
const corpusItems = knowledgeGovernor.listCorpus();
const freshItems = corpusItems.filter(item => {
  const score = computeFreshnessDecay(DEFAULT_DECAY_RATE, daysSince(item.refreshed_at));
  return score >= FRESHNESS_THRESHOLDS.DECAYING_TO_STALE; // Only include non-stale
});
// Include fresh corpus data in the agent's prompt
```

### 6.3 AuditTrailStore (Fleet Action Auditing)

All fleet lifecycle events are recorded in the existing audit trail:

```typescript
// In ConductorEngine, for each state transition:
if (auditTrailStore) {
  await auditTrailStore.append({
    entry_id: randomUUID(),
    resource_type: 'fleet',
    timestamp: new Date().toISOString(),
    event_type: `fleet.${eventType}`,  // fleet.spawned, fleet.completed, etc.
    actor_id: operatorId,
    payload: {
      taskId,
      agentType: task.agentType,
      model: task.model,
      status: task.status,
      // NEVER include: financial data, secrets, full error traces
    },
  });
}
```

### 6.4 MutationLogStore (Fleet Mutations)

Fleet mutations (spawn, stop, delete, config change) logged to the existing
mutation log:

```typescript
// In ConductorEngine, for each mutation:
if (mutationLogStore) {
  await mutationLogStore.append({
    mutation_id: randomUUID(),
    session_id: sessionId,
    actor_id: operatorId,
    resource_type: 'fleet',
    mutation_type: 'fleet.spawn',
    payload: { taskId, agentType, model, taskType },
    created_at: new Date().toISOString(),
  });
}
```

### 6.5 SignalEmitter (NATS Events)

The `CrossGovernorEventBus` publishes fleet events to NATS via the existing
`SignalEmitter`. Fleet events use the `dixie.signal.fleet.*` subject namespace,
which is automatically captured by the `DIXIE_SIGNALS` stream (wildcard
subject `dixie.signal.>`).

No changes to `SignalEmitter` are required — it already supports arbitrary
subjects within the `dixie.signal.*` namespace.

### 6.6 EnrichmentService (Governance Context for Fleet)

The existing `EnrichmentService` is reused by `ContextEnrichmentEngine` to
assemble governance context (conviction distribution, conformance metrics,
reputation trajectories) for inclusion in fleet agent prompts. This ensures
fleet agents are aware of the governance state when making decisions.

---

## 7. Test Strategy

### 7.1 Unit Tests (Mocked Dependencies)

Each component gets a dedicated test file with mocked dependencies:

| Component | Test File | Key Test Cases |
|-----------|-----------|---------------|
| `ConductorEngine` | `conductor-engine.test.ts` | Spawn flow, governance denial, stop task, status query, shutdown |
| `AgentSpawner` | `agent-spawner.test.ts` | Worktree creation (mocked git), tmux launch (mocked exec), container launch, cleanup, isAlive |
| `TaskRegistry` | `task-registry.test.ts` | CRUD operations (mocked PG), state transitions, invalid transition rejection, query filters |
| `FleetMonitor` | `fleet-monitor.test.ts` | Monitor cycle (mocked spawner/registry), PR detection, CI status, stall detection, timeout |
| `AgentModelRouter` | `agent-model-router.test.ts` | Default routing, reputation-weighted selection, override handling, fallback |
| `ContextEnrichmentEngine` | `context-enrichment-engine.test.ts` | Prompt assembly, tier-based context pruning, failure analysis, context hash |
| `RetryEngine` | `retry-engine.test.ts` | Retry with budget, budget exhaustion, enriched retry prompt, OOM handling |
| `FleetGovernor` | `fleet-governor.test.ts` | canSpawn per tier, state transitions, invariant verification, audit trail |
| `CrossGovernorEventBus` | `cross-governor-event-bus.test.ts` | Handler registration, event emission, NATS fallback |
| `NotificationService` | `notification-service.test.ts` | Discord/Telegram delivery (mocked fetch), exponential backoff, CLI fallback |

**Mocking strategy**: All external dependencies (PG, git, docker, tmux, gh, fetch)
are mocked at the boundary. `child_process.exec` is mocked via `vi.mock()`.
PG pool is mocked with a typed fake returning canned query results.

### 7.2 Integration Tests (Real PostgreSQL)

Tests that exercise the full PG flow with a real database:

| Test Suite | What It Tests |
|------------|--------------|
| `fleet-migration.test.ts` | Migration 013 applies cleanly, idempotent re-run, table constraints |
| `task-registry-pg.test.ts` | Full CRUD cycle against real PG, concurrent status transitions, index usage |
| `fleet-governor-pg.test.ts` | Governor with real PG-backed task counts, invariant verification |
| `conductor-pg.test.ts` | End-to-end spawn → status → stop flow with real PG (mocked spawner) |

**Setup**: Uses the existing `vitest` + `pg` test infrastructure. Each test
suite creates/drops a test schema to avoid pollution.

### 7.3 E2E Tests (Container Lifecycle)

Full end-to-end tests for the complete agent lifecycle:

| Test Suite | What It Tests |
|------------|--------------|
| `fleet-e2e-local.test.ts` | Spawn → worktree created → tmux session alive → mock PR → status updates → cleanup |
| `fleet-e2e-container.test.ts` | Spawn → container running → health check → stop → container removed → worktree cleaned |
| `fleet-api-e2e.test.ts` | HTTP API flow: POST /spawn → GET /status → GET /tasks/:id → POST /stop → DELETE |

**E2E test prerequisites**:
- `tmux` installed (local mode tests)
- `docker` or `podman` installed (container mode tests)
- Real git repository with worktree support
- `gh` CLI authenticated (PR status tests)

**CI integration**: E2E tests tagged with `@fleet-e2e` and run in a separate CI
job with Docker-in-Docker support. Local mode tests run in the standard CI job.

### 7.4 Test Count Estimate

| Category | Estimated Tests |
|----------|----------------|
| Unit tests | ~80-100 |
| Integration tests (PG) | ~20-30 |
| E2E tests | ~15-20 |
| **Total** | **~115-150** |

This aligns with the PRD success metric of +100-150 new tests.

---

## 8. Invariant Verification

### 8.1 INV-014: Fleet Agent Count Never Exceeds Conviction-Tier Limit

**Statement**: For each operator, the number of active fleet agents never
exceeds the limit defined for their conviction tier.

**Enforcement**:
- `FleetGovernor.canSpawn()` checks `activeByOperator[operatorId] < tierLimits[tier]`
  BEFORE any spawn operation proceeds
- `ConductorEngine.spawn()` calls `canSpawn()` as its first step, rejecting
  with 403 if the limit would be exceeded
- The check is atomic: `TaskRegistry.countActive()` queries PG with a
  `SELECT COUNT(*) ... FOR UPDATE` lock to prevent TOCTOU races between
  concurrent spawn requests

**Verification**:
```typescript
// FleetGovernor.verify('INV-014'):
verify(invariantId: 'INV-014'): InvariantResult {
  // For each operator with active tasks, verify count <= tier limit
  for (const [operatorId, count] of Object.entries(this.state.activeByOperator)) {
    // Look up operator's tier (from conviction resolver)
    const tier = /* resolved */ 'builder';
    const limit = this.state.tierLimits[tier];
    if (count > limit) {
      return {
        invariant_id: 'INV-014',
        satisfied: false,
        detail: `Operator ${operatorId} has ${count} agents, limit is ${limit} for tier ${tier}`,
        checked_at: new Date().toISOString(),
      };
    }
  }
  return {
    invariant_id: 'INV-014',
    satisfied: true,
    detail: 'All operators within tier limits',
    checked_at: new Date().toISOString(),
  };
}
```

**Test**: Unit test spawns agents up to tier limit, verifies next spawn is rejected.
Integration test verifies PG-backed count is consistent.

### 8.2 INV-015: Every Spawned Agent Is Tracked in the Registry

**Statement**: Every agent spawned by the conductor has a corresponding record
in the `fleet_tasks` table. No orphan agents exist.

**Enforcement**:
- `ConductorEngine.spawn()` creates the TaskRegistry record BEFORE calling
  `AgentSpawner.spawn()`. If the registry insert fails, the spawn never proceeds.
- On conductor restart, `FleetMonitor.reconcile()` runs before the polling
  loop starts [Flatline IMP-003]:
  1. List all live container/tmux sessions via `AgentSpawner.listActive()`
  2. Compare against `TaskRegistry.listLive()`
  3. Ghost records (in registry but not spawner) are marked `failed` with
     `{ reason: 'conductor_restart' }`
  4. Untracked processes (in spawner but not registry) are flagged for
     operator inspection — NOT auto-killed, as they may have unpushed work

**Verification**:
```typescript
// FleetGovernor.verify('INV-015'):
// Compare totalActive in governor state against actual PG count
const pgCount = await this.taskRegistry.countAllActive();
const governorCount = this.state.totalActive;
return {
  invariant_id: 'INV-015',
  satisfied: pgCount === governorCount,
  detail: pgCount === governorCount
    ? `Registry and governor agree: ${pgCount} active agents`
    : `Mismatch: registry=${pgCount}, governor=${governorCount}`,
  checked_at: new Date().toISOString(),
};
```

### 8.3 INV-016: Every Completed Agent Has a Governance Event in Audit Trail

**Statement**: Every fleet task that reaches a terminal state (`merged`,
`abandoned`, `cancelled` [Flatline SKP-005], `failed` with no retry budget)
has at least one corresponding entry in the audit trail.

**Enforcement**:
- `ConductorEngine` writes an audit trail entry in the same database
  transaction as the status transition to a terminal state.
- The audit entry includes `resource_type: 'fleet'` and
  `event_type: 'fleet.completed'` (or `fleet.abandoned`, `fleet.failed`).

**Verification**:
```typescript
// FleetGovernor.verify('INV-016'):
// Query all terminal tasks, verify each has at least one audit entry
// Terminal states: merged, abandoned, cancelled [Flatline SKP-005]
const terminalTasks = await this.taskRegistry.query({
  status: ['merged', 'abandoned', 'cancelled'],
  limit: 100,
});
for (const task of terminalTasks) {
  // Check audit trail for matching entry
  const hasAudit = auditTrailStore
    ? await auditTrailStore.hasEntry('fleet', task.id)
    : true; // Skip check if no audit store
  if (!hasAudit) {
    return {
      invariant_id: 'INV-016',
      satisfied: false,
      detail: `Terminal task ${task.id} missing audit trail entry`,
      checked_at: new Date().toISOString(),
    };
  }
}
```

### 8.4 INV-017: Retry Count Never Exceeds Configured Maximum

**Statement**: For any fleet task, `retry_count` never exceeds `max_retries`.

**Enforcement**:
- Database constraint: `CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)`
- Application-level: `RetryEngine.attemptRetry()` checks
  `task.retryCount < task.maxRetries` before proceeding
- `TaskRegistry.recordFailure()` increments retry_count atomically:
  `UPDATE fleet_tasks SET retry_count = retry_count + 1 WHERE id = $1 AND retry_count < max_retries`
  — the WHERE clause prevents exceeding the limit even under concurrent access

**Verification**:
```typescript
// Direct PG query in test:
// SELECT COUNT(*) FROM fleet_tasks WHERE retry_count > max_retries
// Expected: 0 (always)
```

### 8.5 INV-018: Operator Notifications Delivered for Every Terminal State

**Statement**: Every fleet task that reaches a terminal state results in at
least one notification delivery attempt to the operator.

**Enforcement**:
- `ConductorEngine` calls `NotificationService.send()` for every terminal
  state transition (merged, abandoned, failed-without-retry)
- `NotificationService.send()` inserts a record into `fleet_notifications`
  BEFORE attempting delivery, ensuring the notification is tracked even if
  delivery fails
- `FleetMonitor` includes a notification sweep: queries `fleet_notifications`
  for `delivered = FALSE AND attempts < max_retries` and retries delivery

**Verification**:
```typescript
// Query:
// SELECT ft.id, fn.id as notification_id
// FROM fleet_tasks ft
// LEFT JOIN fleet_notifications fn ON fn.task_id = ft.id
// WHERE ft.status IN ('merged', 'abandoned')
//   AND fn.id IS NULL
// Expected: 0 rows (every terminal task has at least one notification)
```

---

## 9. Deployment Architecture

### 9.1 Local Development (tmux + pnpm)

```
┌─────────────────────────────────────────────┐
│  Developer Machine                           │
│                                              │
│  ┌──────────────────┐  ┌─────────────────┐  │
│  │ dixie-bff        │  │ PostgreSQL      │  │
│  │ (pnpm dev)       │  │ (docker/local)  │  │
│  │                   │  └─────────────────┘  │
│  │  Conductor Engine │                       │
│  │  + Fleet Routes   │  ┌─────────────────┐  │
│  │  + Fleet Monitor  │  │ NATS            │  │
│  │                   │  │ (docker/local)  │  │
│  └────────┬──────────┘  └─────────────────┘  │
│           │                                   │
│    ┌──────┼──────────────────┐               │
│    │      ▼                  ▼               │
│    │  ┌──────────┐  ┌──────────┐            │
│    │  │ tmux:    │  │ tmux:    │            │
│    │  │ fleet-a1 │  │ fleet-a2 │            │
│    │  │ worktree │  │ worktree │            │
│    │  │ /tmp/... │  │ /tmp/... │            │
│    │  └──────────┘  └──────────┘            │
│    └─────────────────────────────────────────│
│                                              │
│  pnpm shared store: ~/.local/share/pnpm/    │
│  (content-addressable, shared across agents) │
└─────────────────────────────────────────────┘
```

**Local startup**:
1. `pnpm dev` starts dixie-bff with conductor subsystem
2. Conductor detects `NODE_ENV !== 'production'` → uses `mode: 'local'`
3. Agents spawned as tmux sessions in isolated worktrees
4. Loa hooks copied from `.claude/hooks/` into each worktree
5. `--dangerously-skip-permissions` enabled (Loa hooks are the safety net)

**Dependency caching**: pnpm's content-addressable store means `pnpm install`
in a worktree reuses packages already downloaded. Cold start ~45s, warm ~10s.

### 9.2 Production (Containers on Freeside)

```
┌──────────────────────────────────────────────────────────┐
│  Freeside Infrastructure                                  │
│                                                           │
│  ┌─────────────────────────┐  ┌────────────────────────┐ │
│  │ dixie-bff container     │  │ PostgreSQL (managed)   │ │
│  │                          │  └────────────────────────┘ │
│  │  Conductor Engine        │                             │
│  │  + Fleet Routes          │  ┌────────────────────────┐ │
│  │  + Fleet Monitor         │  │ NATS (managed)         │ │
│  │                          │  └────────────────────────┘ │
│  └────────────┬─────────────┘                             │
│               │                                           │
│    Docker socket / Podman API                             │
│               │                                           │
│    ┌──────────┼────────────────────┐                     │
│    │          ▼                    ▼                     │
│    │  ┌──────────────┐  ┌──────────────┐               │
│    │  │ fleet-a1     │  │ fleet-a2     │               │
│    │  │ (container)  │  │ (container)  │               │
│    │  │ --read-only  │  │ --read-only  │               │
│    │  │ --memory=2g  │  │ --memory=2g  │               │
│    │  │ --cpus=2     │  │ --cpus=2     │               │
│    │  │ --no-new-priv│  │ --no-new-priv│               │
│    │  │              │  │              │               │
│    │  │ /workspace   │  │ /workspace   │               │
│    │  │ (worktree    │  │ (worktree    │               │
│    │  │  mount)      │  │  mount)      │               │
│    │  └──────────────┘  └──────────────┘               │
│    │                                                    │
│    │  Network: fleet-egress                             │
│    │  Allows: github.com, registry.npmjs.org,           │
│    │          api.anthropic.com, api.openai.com,        │
│    │          api.google.com                            │
│    └────────────────────────────────────────────────────│
│                                                           │
│  Pre-built agent images:                                 │
│  - fleet-claude:latest (Claude Code + Loa hooks)        │
│  - fleet-codex:latest (Codex CLI + Loa hooks)           │
│  - fleet-gemini:latest (Gemini CLI + Loa hooks)         │
│                                                           │
│  Image rebuild trigger: pnpm-lock.yaml change in CI     │
│  Images tagged with lock file hash for determinism       │
└──────────────────────────────────────────────────────────┘
```

**Production startup**:
1. dixie-bff starts with `NODE_ENV=production`
2. Conductor detects production → uses `mode: 'container'`
3. Agents spawned as containers via `docker run` / `podman run`
4. Pre-built images include all dependencies (no install step)
5. Worktree mounted as volume at `/workspace`
6. Container ID is the source of truth for agent liveness [PRD §5.6 SKP-002]
7. Reconciliation on restart: `docker ps --filter label=dixie-fleet` vs PG registry

### 9.3 Configuration Environment Variables

New environment variables for cycle-012 (added to `DixieConfig`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DIXIE_FLEET_ENABLED` | No | `true` | Enable/disable fleet subsystem |
| `DIXIE_FLEET_MODE` | No | `local` | `local` (tmux) or `container` (docker) |
| `DIXIE_FLEET_WORKTREE_DIR` | No | `/tmp/dixie-fleet` | Base directory for agent worktrees |
| `DIXIE_FLEET_CONTAINER_IMAGE` | Prod | — | Pre-built agent container image |
| `DIXIE_FLEET_CONTAINER_RUNTIME` | No | `docker` | `docker` or `podman` |
| `DIXIE_FLEET_REPO_ROOT` | No | `process.cwd()` | Git repository root for worktree creation |
| `DIXIE_FLEET_MONITOR_INTERVAL_MS` | No | `60000` | Monitor polling interval |
| `DIXIE_FLEET_MAX_CONCURRENT` | No | `10` | Hard cap on concurrent agents |
| `DIXIE_FLEET_DEFAULT_TIMEOUT_MIN` | No | `120` | Default agent timeout |
| `DIXIE_FLEET_DISCORD_WEBHOOK_URL` | No | — | Discord webhook for fleet notifications |
| `DIXIE_FLEET_TELEGRAM_BOT_TOKEN` | No | — | Telegram bot token for fleet notifications |
| `DIXIE_FLEET_TELEGRAM_CHAT_ID` | No | — | Telegram chat ID for fleet notifications |
| `DIXIE_FLEET_ENCRYPTION_KEY` | Prod | — | AES-256-GCM key for encrypting notification secrets in PG |
| `GITHUB_TOKEN` | Yes | — | Token for agent git operations (will be scoped per-agent) |

---

## 10. Server Integration

### 10.1 Changes to createDixieApp()

The conductor subsystem is wired into the existing `createDixieApp()` function
following the same pattern as all other services:

```typescript
// In server.ts createDixieApp():

// --- cycle-012: Fleet Conductor subsystem ---
import { ConductorEngine } from './services/conductor-engine.js';
import { AgentSpawner } from './services/agent-spawner.js';
import { TaskRegistry } from './services/task-registry.js';
import { FleetMonitor } from './services/fleet-monitor.js';
import { AgentModelRouter } from './services/agent-model-router.js';
import { ContextEnrichmentEngine } from './services/context-enrichment-engine.js';
import { RetryEngine } from './services/retry-engine.js';
import { FleetGovernor } from './services/fleet-governor.js';
import { CrossGovernorEventBus } from './services/cross-governor-event-bus.js';
import { NotificationService } from './services/notification-service.js';
import { createFleetRoutes } from './routes/fleet.js';

// TaskRegistry requires PG
const taskRegistry = dbPool ? new TaskRegistry(dbPool) : null;

// FleetGovernor — registered with GovernorRegistry
const fleetGovernor = taskRegistry ? new FleetGovernor(taskRegistry) : null;
if (fleetGovernor && !governorRegistry.get(fleetGovernor.resourceType)) {
  governorRegistry.register(fleetGovernor);
  governorRegistry.registerResource(fleetGovernor);
}

// CrossGovernorEventBus — wraps existing SignalEmitter
const fleetEventBus = new CrossGovernorEventBus({
  signalEmitter,
  log,
});

// NotificationService
const fleetNotifications = new NotificationService({
  discordWebhookUrl: config.fleetDiscordWebhookUrl ?? null,
  telegramBotToken: config.fleetTelegramBotToken ?? null,
  telegramChatId: config.fleetTelegramChatId ?? null,
  cliOutput: true,
});

// AgentSpawner
const agentSpawner = new AgentSpawner({
  worktreeBaseDir: config.fleetWorktreeDir ?? '/tmp/dixie-fleet',
  mode: config.fleetMode ?? 'local',
  containerImage: config.fleetContainerImage,
  repoRoot: config.fleetRepoRoot ?? process.cwd(),
});

// AgentModelRouter — uses existing ReputationService
const agentModelRouter = new AgentModelRouter(
  DEFAULT_MODEL_ROUTING_CONFIG,
  reputationService,
);

// ContextEnrichmentEngine — composes prompts from existing services
const contextEnrichment = new ContextEnrichmentEngine(
  { maxPromptTokens: 8000 },
  {
    enrichmentService,
    knowledgeGovernor,
    reputationService,
    learningEngine,
  },
);

// RetryEngine — Ralph Loop V2
const retryEngine = taskRegistry ? new RetryEngine(
  { maxRetries: 3 },
  {
    taskRegistry,
    spawner: agentSpawner,
    enrichment: contextEnrichment,
    eventBus: fleetEventBus,
    notifications: fleetNotifications,
    log,
  },
) : null;

// FleetMonitor
const fleetMonitor = taskRegistry ? new FleetMonitor(
  { intervalMs: config.fleetMonitorIntervalMs ?? 60_000 },
  {
    taskRegistry,
    spawner: agentSpawner,
    retry: retryEngine!,
    notifications: fleetNotifications,
    eventBus: fleetEventBus,
    log,
  },
) : null;

// ConductorEngine — top-level orchestrator
const conductorEngine = (taskRegistry && fleetGovernor && retryEngine && fleetMonitor)
  ? new ConductorEngine({
      spawner: agentSpawner,
      taskRegistry,
      monitor: fleetMonitor,
      enrichment: contextEnrichment,
      retry: retryEngine,
      governor: fleetGovernor,
      modelRouter: agentModelRouter,
      notifications: fleetNotifications,
      eventBus: fleetEventBus,
      auditTrailStore,
      mutationLogStore,
      log,
    })
  : null;

// --- Fleet Routes (only when conductor is available) ---
if (conductorEngine) {
  app.route('/api/fleet', createFleetRoutes({ conductor: conductorEngine }));
}
```

### 10.2 DixieApp Interface Extension

```typescript
export interface DixieApp {
  // ... existing fields ...
  /** cycle-012: Conductor engine (null when DATABASE_URL not configured) */
  conductorEngine: ConductorEngine | null;
  /** cycle-012: Fleet governor (null when DATABASE_URL not configured) */
  fleetGovernor: FleetGovernor | null;
}
```

### 10.3 Graceful Degradation

The fleet subsystem follows dixie's existing pattern of graceful degradation
when infrastructure is unavailable:

| Missing | Behavior |
|---------|----------|
| `DATABASE_URL` not set | Fleet subsystem disabled entirely. No fleet routes registered. Health endpoint shows `fleet: disabled`. |
| `NATS_URL` not set | CrossGovernorEventBus falls back to in-process event dispatch. No NATS publication. |
| `REDIS_URL` not set | No caching for fleet state. All reads go to PG. |
| `GITHUB_TOKEN` not set | Agents cannot push to remote. FleetMonitor cannot check PR/CI status. Local-only mode. |
| `DIXIE_FLEET_DISCORD_WEBHOOK_URL` not set | Discord notifications disabled. CLI fallback active. |

---

## 11. Sprint Plan Recommendations

### Sprint 1: Foundation (TaskRegistry + FleetGovernor + Migration)

- Migration 013
- TaskRegistry CRUD + state machine
- FleetGovernor with INV-014 enforcement
- Unit tests for registry and governor

### Sprint 2: Spawner + Monitor (Agent Lifecycle)

- AgentSpawner (local/tmux mode)
- FleetMonitor polling loop
- GitHubCli helper
- Integration tests with real git worktrees

### Sprint 3: Conductor Engine + Routes (API Surface)

- ConductorEngine orchestration
- Fleet routes (spawn, status, stop, logs, delete)
- Fleet auth middleware
- API integration tests

### Sprint 4: Enrichment + Retry (Intelligence Layer)

- ContextEnrichmentEngine
- RetryEngine (Ralph Loop V2)
- AgentModelRouter with reputation integration
- CrossGovernorEventBus

### Sprint 5: Notifications + Container Mode (Production Readiness)

- NotificationService (Discord, Telegram, CLI)
- Container mode in AgentSpawner
- Production deployment config
- E2E tests
- INV-014 through INV-018 verification suite

---

## 12. File Manifest

New files created by this cycle:

| File | Type | Description |
|------|------|-------------|
| `app/src/services/conductor-engine.ts` | Service | Orchestration core |
| `app/src/services/agent-spawner.ts` | Service | Git worktree + process management |
| `app/src/services/task-registry.ts` | Service | PG-backed fleet task CRUD |
| `app/src/services/fleet-monitor.ts` | Service | Agent health polling loop |
| `app/src/services/agent-model-router.ts` | Service | Model selection per task type |
| `app/src/services/context-enrichment-engine.ts` | Service | Fleet prompt construction |
| `app/src/services/retry-engine.ts` | Service | Ralph Loop V2 |
| `app/src/services/fleet-governor.ts` | Service | GovernedResource<FleetState> |
| `app/src/services/cross-governor-event-bus.ts` | Service | Typed fleet event pub/sub |
| `app/src/services/notification-service.ts` | Service | Webhook delivery |
| `app/src/middleware/fleet-auth.ts` | Middleware | Fleet conviction-tier gating |
| `app/src/routes/fleet.ts` | Routes | Fleet API endpoints |
| `app/src/db/migrations/013_fleet_orchestration.sql` | Migration | Fleet tables |
| `app/src/types/fleet.ts` | Types | Shared fleet type definitions |
| `app/src/services/__tests__/conductor-engine.test.ts` | Test | Unit tests |
| `app/src/services/__tests__/agent-spawner.test.ts` | Test | Unit tests |
| `app/src/services/__tests__/task-registry.test.ts` | Test | Unit tests |
| `app/src/services/__tests__/fleet-monitor.test.ts` | Test | Unit tests |
| `app/src/services/__tests__/agent-model-router.test.ts` | Test | Unit tests |
| `app/src/services/__tests__/context-enrichment-engine.test.ts` | Test | Unit tests |
| `app/src/services/__tests__/retry-engine.test.ts` | Test | Unit tests |
| `app/src/services/__tests__/fleet-governor.test.ts` | Test | Unit tests |
| `app/src/services/__tests__/cross-governor-event-bus.test.ts` | Test | Unit tests |
| `app/src/services/__tests__/notification-service.test.ts` | Test | Unit tests |
| `app/tests/integration/fleet-migration.test.ts` | Test | PG migration tests |
| `app/tests/integration/task-registry-pg.test.ts` | Test | PG integration tests |
| `app/tests/integration/conductor-pg.test.ts` | Test | PG integration tests |
| `app/tests/e2e/fleet-e2e-local.test.ts` | Test | E2E local mode |
| `app/tests/e2e/fleet-e2e-container.test.ts` | Test | E2E container mode |
| `app/tests/e2e/fleet-api-e2e.test.ts` | Test | E2E API tests |

Modified files:

| File | Change |
|------|--------|
| `app/src/server.ts` | Wire conductor subsystem, register fleet routes and governor |
| `app/src/config.ts` | Add fleet configuration fields |
| `grimoires/loa/invariants.yaml` | Add INV-014 through INV-018 |

---

## 13. Appendix: Invariants YAML (INV-014 through INV-018)

```yaml
  - id: INV-014
    description: "Fleet agent count never exceeds conviction-tier limit. The FleetGovernor enforces that no operator has more active agents than their conviction tier permits."
    severity: critical
    category: bounded
    properties:
      - "For all operators o: activeByOperator[o] <= tierLimits[tier(o)]"
      - "canSpawn() returns false when at limit"
      - "ConductorEngine.spawn() rejects with 403 when canSpawn() returns false"
    verified_in:
      - repo: loa-dixie
        file: "app/src/services/fleet-governor.ts"
        symbol: "FleetGovernor.canSpawn"
        note: "Pre-spawn check against tier limit"
      - repo: loa-dixie
        file: "app/src/services/fleet-governor.ts"
        symbol: "FleetGovernor.verify('INV-014')"
        note: "Runtime invariant verification across all operators"
      - repo: loa-dixie
        file: "app/src/services/__tests__/fleet-governor.test.ts"
        symbol: "INV-014"
        note: "Tests tier limit enforcement and rejection at limit"

  - id: INV-015
    description: "Every spawned agent is tracked in the registry. No orphan agents exist — the TaskRegistry record is created BEFORE the agent process is spawned."
    severity: critical
    category: traceability
    properties:
      - "For all spawned agents a: fleet_tasks.exists(a.taskId)"
      - "Registry insert precedes spawn in ConductorEngine.spawn()"
      - "Reconciliation on restart: orphans killed, ghosts marked failed"
    verified_in:
      - repo: loa-dixie
        file: "app/src/services/conductor-engine.ts"
        symbol: "ConductorEngine.spawn"
        note: "Registry create before spawner.spawn"
      - repo: loa-dixie
        file: "app/src/services/fleet-governor.ts"
        symbol: "FleetGovernor.verify('INV-015')"
        note: "Compares governor count against PG count"
      - repo: loa-dixie
        file: "app/src/services/__tests__/conductor-engine.test.ts"
        symbol: "INV-015"
        note: "Verifies registry record exists before spawn"

  - id: INV-016
    description: "Every completed agent has a governance event in the audit trail. Terminal state transitions (merged, abandoned) always produce an audit entry."
    severity: important
    category: traceability
    properties:
      - "For all terminal tasks t: audit_entries.exists(resource_type='fleet', payload.taskId=t.id)"
      - "Audit write is in the same transaction as status transition"
    verified_in:
      - repo: loa-dixie
        file: "app/src/services/conductor-engine.ts"
        symbol: "ConductorEngine (terminal transition handler)"
        note: "Audit trail append in same transaction as status update"
      - repo: loa-dixie
        file: "app/src/services/fleet-governor.ts"
        symbol: "FleetGovernor.verify('INV-016')"
        note: "Cross-references terminal tasks against audit entries"

  - id: INV-017
    description: "Retry count never exceeds configured maximum. The RetryEngine checks budget before attempting, and the database constraint prevents overflow."
    severity: important
    category: bounded
    properties:
      - "For all tasks t: t.retry_count <= t.max_retries"
      - "DB constraint: CHECK (retry_count >= 0 AND retry_count <= max_retries)"
      - "RetryEngine.attemptRetry() checks budget before proceeding"
    verified_in:
      - repo: loa-dixie
        file: "app/src/services/retry-engine.ts"
        symbol: "RetryEngine.attemptRetry"
        note: "Budget check: retryCount < maxRetries"
      - repo: loa-dixie
        file: "app/src/db/migrations/013_fleet_orchestration.sql"
        symbol: "valid_retry_count"
        note: "Database CHECK constraint"
      - repo: loa-dixie
        file: "app/src/services/__tests__/retry-engine.test.ts"
        symbol: "INV-017"
        note: "Tests budget exhaustion and rejection"

  - id: INV-018
    description: "Operator notifications delivered for every terminal state. Every task reaching merged/abandoned/failed-final state results in at least one notification delivery attempt."
    severity: important
    category: completeness
    properties:
      - "For all terminal tasks t: fleet_notifications.exists(task_id=t.id)"
      - "Notification record created before delivery attempt"
      - "FleetMonitor sweeps undelivered notifications for retry"
    verified_in:
      - repo: loa-dixie
        file: "app/src/services/notification-service.ts"
        symbol: "NotificationService.send"
        note: "Records notification before delivery attempt"
      - repo: loa-dixie
        file: "app/src/services/fleet-monitor.ts"
        symbol: "FleetMonitor.runCycle"
        note: "Sweeps undelivered notifications"
      - repo: loa-dixie
        file: "app/src/services/__tests__/notification-service.test.ts"
        symbol: "INV-018"
        note: "Tests notification for all terminal states"
```
