/**
 * Insight Types — Cross-agent discovery propagation.
 *
 * Insights are harvested from running agents and injected into the
 * enrichment pipeline for other agents working on related tasks.
 * Meeting geometries determine which agents share insights.
 *
 * @since cycle-013 — Sprint 94, Task T-1.2
 */

// ---------------------------------------------------------------------------
// Agent Insight
// ---------------------------------------------------------------------------

/** A discoverable insight from a running agent. */
export interface AgentInsight {
  readonly id: string;
  readonly sourceTaskId: string;
  readonly sourceAgentId: string;
  readonly groupId: string | null;
  readonly content: string;
  readonly keywords: readonly string[];
  readonly relevanceContext: string;
  readonly capturedAt: string;
  readonly expiresAt: string;
}

// ---------------------------------------------------------------------------
// Meeting Geometry
// ---------------------------------------------------------------------------

/** Collaboration pattern for agent groups. */
export type MeetingGeometry = 'factory' | 'jam' | 'study_group';

/** All supported geometries as a typed array. */
export const MEETING_GEOMETRIES: readonly MeetingGeometry[] = [
  'factory',
  'jam',
  'study_group',
] as const;

// ---------------------------------------------------------------------------
// Geometry Group
// ---------------------------------------------------------------------------

/** Group of agents sharing a collaboration pattern. */
export interface GeometryGroup {
  readonly groupId: string;
  readonly geometry: MeetingGeometry;
  readonly taskIds: readonly string[];
  readonly operatorId: string;
  readonly createdAt: string;
  readonly dissolvedAt: string | null;
}
