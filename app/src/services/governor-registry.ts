import type { ResourceGovernor, ResourceHealth } from './resource-governor.js';

/**
 * Governor Registry — unified observability for all governed resources.
 *
 * Task 20.3 (Sprint 20, Global 39): Singleton registry that tracks all
 * ResourceGovernor instances. Enables "what resources does this system govern,
 * and what's their health?" — the system-level self-knowledge endpoint.
 *
 * Pattern: Kubernetes operator registry — generic governance with specialized governors.
 * See: Deep Bridgebuilder Meditation §VII.2
 */

/** Snapshot of a governor's health for external consumption */
export interface GovernorSnapshot {
  readonly resourceType: string;
  readonly health: ResourceHealth | null;
}

export class GovernorRegistry {
  private readonly governors = new Map<string, ResourceGovernor<unknown>>();

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

  /** Get a governor by resource type */
  get(resourceType: string): ResourceGovernor<unknown> | undefined {
    return this.governors.get(resourceType);
  }

  /** Get health snapshots for all registered governors */
  getAll(): ReadonlyArray<GovernorSnapshot> {
    return [...this.governors.entries()].map(([type, gov]) => ({
      resourceType: type,
      health: gov.getHealth(),
    }));
  }

  /** Number of registered governors */
  get size(): number {
    return this.governors.size;
  }

  /** Clear all registered governors (testing utility) */
  clear(): void {
    this.governors.clear();
  }
}

/** Singleton instance for shared use across the application */
export const governorRegistry = new GovernorRegistry();
