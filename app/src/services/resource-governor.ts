/**
 * Resource Governance — Generic Interface for Scarce Resource Management
 *
 * Task 20.1 (Sprint 20, Global 39): Extract the governance pattern that emerged
 * in CorpusMeta into a generic interface applicable to any scarce resource.
 *
 * The pattern: event sourcing + self-knowledge + drift detection + contract testing.
 * CorpusMeta implements it for knowledge. The same pattern applies to model routing
 * pools, soul memory quotas, autonomous operation budgets, and schedule capacity.
 *
 * See: Deep Bridgebuilder Meditation §VII.2, Billing-Knowledge Isomorphism,
 *      Kubernetes CRD/Operator pattern, Ostrom's commons governance
 */

/** A single mutation event in the resource's history */
export interface GovernanceEvent<T = unknown> {
  readonly seq: number;
  readonly type: string;
  readonly timestamp: string;
  readonly detail: string;
  readonly author: string;
  /** Optional typed context for domain-specific event data */
  readonly context?: T;
}

/** Resource health metadata — the "vital signs" of a governed resource */
export interface ResourceHealth {
  readonly status: 'healthy' | 'degraded';
  readonly totalItems: number;
  readonly staleItems: number;
  readonly version: number;
}

/** Self-knowledge about a governed resource — metacognition */
export interface ResourceSelfKnowledge {
  readonly version: number;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly lastMutation: { type: string; timestamp: string; detail: string } | null;
  readonly healthSummary: ResourceHealth;
}

/**
 * The generic resource governance interface.
 *
 * Any scarce resource that needs event sourcing, self-knowledge, drift detection,
 * and cache management can implement this interface. The GovernorRegistry then
 * provides unified observability across all governed resources.
 *
 * @typeParam TResource - The type of individual resource items being governed
 */
export interface ResourceGovernor<TResource> {
  /** Get current health metadata */
  getHealth(nowOverride?: Date): ResourceHealth | null;
  /** Get self-knowledge about the governed resource */
  getGovernorSelfKnowledge(nowOverride?: Date): ResourceSelfKnowledge | null;
  /** Get the event log */
  getEventLog(): ReadonlyArray<GovernanceEvent>;
  /** Get the most recent event */
  getLatestEvent(): GovernanceEvent | null;
  /** Invalidate all caches */
  invalidateCache(): void;
  /** Pre-warm caches */
  warmCache(): void;
  /** Resource type identifier — unique across the system */
  readonly resourceType: string;
}
