/**
 * Agent Identity Types — Persistent identity and governed autonomy.
 *
 * Agents accumulate reputation across tasks. Autonomy levels gate resource
 * allocation (timeouts, retries, context window) based on demonstrated
 * competence. The SovereigntyEngine implements GovernedResource<AgentAutonomy>
 * using these types.
 *
 * @since cycle-013 — Sprint 94, Task T-1.1
 */

// ---------------------------------------------------------------------------
// Autonomy Levels
// ---------------------------------------------------------------------------

/** Autonomy level — earned through demonstrated competence. */
export type AutonomyLevel = 'constrained' | 'standard' | 'autonomous';

/** Ordered levels for comparison. */
export const AUTONOMY_ORDER: readonly AutonomyLevel[] = [
  'constrained',
  'standard',
  'autonomous',
] as const;

// ---------------------------------------------------------------------------
// Agent Identity Record
// ---------------------------------------------------------------------------

/** Persistent agent identity across tasks. */
export interface AgentIdentityRecord {
  readonly id: string;
  readonly operatorId: string;
  readonly model: string;
  readonly autonomyLevel: AutonomyLevel;
  readonly aggregateReputation: number;
  readonly taskCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly lastTaskId: string | null;
  readonly createdAt: string;
  readonly lastActiveAt: string;
  readonly version: number;
}

// ---------------------------------------------------------------------------
// Autonomy Resources
// ---------------------------------------------------------------------------

/** Resource allocation based on autonomy level. */
export interface AutonomyResources {
  readonly timeoutMinutes: number;
  readonly maxRetries: number;
  readonly contextTokens: number;
  readonly canSelfModifyPrompt: boolean;
}

// ---------------------------------------------------------------------------
// Sovereignty Events and Invariants
// ---------------------------------------------------------------------------

/** Events that can transition sovereignty state. */
export type AutonomyEvent =
  | { type: 'TASK_COMPLETED'; taskId: string; outcome: 'merged' | 'ready' }
  | { type: 'TASK_FAILED'; taskId: string; outcome: 'failed' | 'abandoned' }
  | { type: 'REPUTATION_UPDATED'; newScore: number }
  | { type: 'MANUAL_OVERRIDE'; newLevel: AutonomyLevel; reason: string };

/** Invariant identifiers for sovereignty governance. */
export type AutonomyInvariant = 'INV-019' | 'INV-020';

// ---------------------------------------------------------------------------
// Task Outcome
// ---------------------------------------------------------------------------

/** Outcome of a completed task for reputation accumulation. */
export type TaskOutcome = 'merged' | 'ready' | 'failed' | 'abandoned';

/** Score mapping for task outcomes. */
export const OUTCOME_SCORES: Readonly<Record<TaskOutcome, number>> = {
  merged: 1.0,
  ready: 1.0,
  failed: 0.3,
  abandoned: 0.0,
} as const;
