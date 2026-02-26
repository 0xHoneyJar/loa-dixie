/**
 * Fleet Orchestration Type Definitions
 *
 * All types for the Agent Fleet system: task status lifecycle,
 * agent types, spawn/result interfaces, and fleet summaries.
 *
 * See: SDD §1.2 (lifecycle), §2.1 (type contracts), §2.3 (DB record)
 * @since cycle-012 — Sprint 86, Task T-1.1
 */

// ---------------------------------------------------------------------------
// Enums & Unions
// ---------------------------------------------------------------------------

/** All possible states in the fleet task lifecycle. */
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
  | 'cancelled';

/** Supported agent runtimes. */
export type AgentType = 'claude_code' | 'codex' | 'gemini';

/** Task classification for routing and metrics. */
export type TaskType = 'bug_fix' | 'feature' | 'refactor' | 'review' | 'docs';

// ---------------------------------------------------------------------------
// Database Record
// ---------------------------------------------------------------------------

/** Row shape from fleet_tasks table. */
export interface FleetTaskRecord {
  readonly id: string;
  readonly operatorId: string;
  readonly agentType: AgentType;
  readonly model: string;
  readonly taskType: TaskType;
  readonly description: string;
  readonly branch: string;
  readonly worktreePath: string | null;
  readonly containerId: string | null;
  readonly tmuxSession: string | null;
  readonly status: FleetTaskStatus;
  readonly version: number;
  readonly prNumber: number | null;
  readonly ciStatus: string | null;
  readonly reviewStatus: Record<string, unknown> | null;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly contextHash: string | null;
  readonly failureContext: Record<string, unknown> | null;
  readonly spawnedAt: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ---------------------------------------------------------------------------
// Input / Output DTOs
// ---------------------------------------------------------------------------

/** Input for TaskRegistry.create(). */
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

/** API-facing spawn request body. */
export interface SpawnRequest {
  readonly operatorId: string;
  readonly description: string;
  readonly taskType: TaskType;
  readonly repository: string;
  readonly baseBranch?: string;
  readonly agentType?: AgentType;
  readonly model?: string;
  readonly maxRetries?: number;
  readonly timeoutMinutes?: number;
  readonly contextOverrides?: Record<string, string>;
}

/** Result returned from ConductorEngine.spawn(). */
export interface SpawnResult {
  readonly taskId: string;
  readonly branch: string;
  readonly worktreePath: string;
  readonly agentType: AgentType;
  readonly model: string;
  readonly status: FleetTaskStatus;
}

// ---------------------------------------------------------------------------
// Fleet Summaries
// ---------------------------------------------------------------------------

/** Fleet-wide aggregate status. */
export interface FleetStatusSummary {
  readonly activeTasks: number;
  readonly completedTasks: number;
  readonly failedTasks: number;
  readonly tasks: FleetTaskSummary[];
}

/** Per-task summary for fleet status endpoint. */
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

// ---------------------------------------------------------------------------
// Transition Metadata
// ---------------------------------------------------------------------------

/** Optional metadata that can be updated during a state transition. */
export interface TransitionMetadata {
  readonly worktreePath?: string;
  readonly containerId?: string;
  readonly tmuxSession?: string;
  readonly prNumber?: number;
  readonly ciStatus?: string;
  readonly reviewStatus?: Record<string, unknown>;
  readonly failureContext?: Record<string, unknown>;
  readonly spawnedAt?: string;
  readonly completedAt?: string;
}

// ---------------------------------------------------------------------------
// Query Filters
// ---------------------------------------------------------------------------

/** Filters for TaskRegistry.query(). */
export interface TaskQueryFilters {
  readonly operatorId?: string;
  readonly status?: FleetTaskStatus | FleetTaskStatus[];
  readonly agentType?: AgentType;
  readonly taskType?: TaskType;
  readonly since?: string;
  readonly limit?: number;
}
