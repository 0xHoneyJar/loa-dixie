import type { ResourceGovernor, ResourceHealth, ResourceSelfKnowledge } from './resource-governor.js';
import type { GovernedResource, InvariantResult } from './governed-resource.js';

/**
 * Governor Registry — unified observability for all governed resources.
 *
 * Task 20.3 (Sprint 20, Global 39): Singleton registry that tracks all
 * ResourceGovernor instances. Enables "what resources does this system govern,
 * and what's their health?" — the system-level self-knowledge endpoint.
 *
 * v8.2.0 (cycle-007): Extended with optional `governedResource` field for
 * services that expose `getGovernedState()`. This bridges the legacy
 * ResourceGovernor pattern with the new GovernedResource pattern from commons.
 *
 * Pattern: Kubernetes operator registry — generic governance with specialized governors.
 * See: Deep Bridgebuilder Meditation §VII.2
 */

/**
 * Governed resource state exposed by services adopting the commons pattern.
 * @since cycle-007 — Sprint 75, Task S3-T5
 */
export interface GovernedResourceState {
  readonly version: number;
  readonly contract_version: string;
  readonly governance_class: string;
  readonly mutation_count: number;
}

/** Snapshot of a governor's health for external consumption */
export interface GovernorSnapshot {
  readonly resourceType: string;
  readonly health: ResourceHealth | null;
  /**
   * Governed resource metadata from the commons GovernedResource pattern.
   * Present when the governor also implements `getGovernedState()`.
   * @since cycle-007 — Sprint 75, Task S3-T5
   */
  readonly governedResource?: GovernedResourceState;
}

/** Extended snapshot with self-knowledge for verifyAllGovernors() */
export interface GovernorVerification {
  readonly resourceType: string;
  readonly health: ResourceHealth | null;
  readonly selfKnowledge: ResourceSelfKnowledge | null;
}

export class GovernorRegistry {
  private readonly governors = new Map<string, ResourceGovernor<unknown>>();
  /** @since cycle-008 — FR-13 */
  private readonly governedResources = new Map<string, GovernedResource<unknown, unknown, string>>();

  /**
   * Register a resource governor. Each resource type may only be registered once.
   * @throws Error if a governor is already registered for the resource type
   */
  register(governor: ResourceGovernor<unknown>): void {
    if (this.governors.has(governor.resourceType)) {
      throw new Error(`Governor already registered for resource type: ${governor.resourceType}`);
    }
    this.governors.set(governor.resourceType, governor);
  }

  /**
   * Register a GovernedResource instance.
   * @throws Error if already registered
   * @since cycle-008 — FR-13
   */
  registerResource(resource: GovernedResource<unknown, unknown, string>): void {
    if (this.governedResources.has(resource.resourceType)) {
      throw new Error(`Resource already registered: ${resource.resourceType}`);
    }
    this.governedResources.set(resource.resourceType, resource);
  }

  /** Get a governor by resource type */
  get(resourceType: string): ResourceGovernor<unknown> | undefined {
    return this.governors.get(resourceType);
  }

  /**
   * Get a governed resource by type.
   * @since cycle-008 — FR-13
   */
  getResource(resourceType: string): GovernedResource<unknown, unknown, string> | undefined {
    return this.governedResources.get(resourceType);
  }

  /** Get health snapshots for all registered governors */
  getAll(): ReadonlyArray<GovernorSnapshot> {
    return [...this.governors.entries()].map(([type, gov]) => ({
      resourceType: type,
      health: gov.getHealth(),
    }));
  }

  /**
   * Verify all registered governors — health + self-knowledge.
   * @since cycle-009 Sprint 6 — Task 6.1 (FR-11)
   */
  verifyAllGovernors(): ReadonlyArray<GovernorVerification> {
    return [...this.governors.entries()].map(([type, gov]) => ({
      resourceType: type,
      health: gov.getHealth(),
      selfKnowledge: gov.getGovernorSelfKnowledge(),
    }));
  }

  /**
   * Verify all invariants across all registered governed resources.
   * @since cycle-008 — FR-13
   */
  verifyAllResources(): Map<string, InvariantResult[]> {
    const results = new Map<string, InvariantResult[]>();
    for (const [type, resource] of this.governedResources) {
      results.set(type, resource.verifyAll());
    }
    return results;
  }

  /**
   * Audit summary across all governed resources.
   * @since cycle-008 — FR-13
   */
  getAuditSummary(): Array<{
    resourceType: string;
    version: number;
    auditEntryCount: number;
    mutationCount: number;
  }> {
    return [...this.governedResources.entries()].map(([type, resource]) => ({
      resourceType: type,
      version: resource.version,
      auditEntryCount: resource.auditTrail.entries.length,
      mutationCount: resource.mutationLog.length,
    }));
  }

  /** Number of registered governors */
  get size(): number {
    return this.governors.size + this.governedResources.size;
  }

  /** Clear all registered governors and resources (testing utility) */
  clear(): void {
    this.governors.clear();
    this.governedResources.clear();
  }
}

/** Singleton instance for shared use across the application */
export const governorRegistry = new GovernorRegistry();
