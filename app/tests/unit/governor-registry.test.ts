import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GovernorRegistry, governorRegistry } from '../../src/services/governor-registry.js';
import type { ResourceGovernor, ResourceHealth, ResourceSelfKnowledge, GovernanceEvent } from '../../src/services/resource-governor.js';

/** Minimal mock governor for testing */
function createMockGovernor(
  resourceType: string,
  health: ResourceHealth | null = { status: 'healthy', totalItems: 10, staleItems: 0, version: 1 },
): ResourceGovernor<unknown> {
  return {
    resourceType,
    getHealth: vi.fn().mockReturnValue(health),
    getGovernorSelfKnowledge: vi.fn().mockReturnValue(null),
    getEventLog: vi.fn().mockReturnValue([]),
    getLatestEvent: vi.fn().mockReturnValue(null),
    invalidateCache: vi.fn(),
    warmCache: vi.fn(),
  };
}

describe('GovernorRegistry (Task 20.3)', () => {
  let registry: GovernorRegistry;

  beforeEach(() => {
    registry = new GovernorRegistry();
  });

  it('register and get a governor', () => {
    const gov = createMockGovernor('test_resource');
    registry.register(gov);

    const retrieved = registry.get('test_resource');
    expect(retrieved).toBe(gov);
    expect(registry.size).toBe(1);
  });

  it('get returns undefined for unregistered resource type', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('duplicate registration throws', () => {
    const gov1 = createMockGovernor('test_resource');
    const gov2 = createMockGovernor('test_resource');

    registry.register(gov1);
    expect(() => registry.register(gov2)).toThrow(
      'Governor already registered for resource type: test_resource',
    );
  });

  it('getAll returns health snapshots for all governors', () => {
    const healthy = createMockGovernor('resource_a', {
      status: 'healthy', totalItems: 10, staleItems: 0, version: 1,
    });
    const degraded = createMockGovernor('resource_b', {
      status: 'degraded', totalItems: 5, staleItems: 2, version: 3,
    });

    registry.register(healthy);
    registry.register(degraded);

    const all = registry.getAll();
    expect(all).toHaveLength(2);

    const aSnap = all.find((s) => s.resourceType === 'resource_a');
    const bSnap = all.find((s) => s.resourceType === 'resource_b');

    expect(aSnap).toBeDefined();
    expect(aSnap!.health!.status).toBe('healthy');

    expect(bSnap).toBeDefined();
    expect(bSnap!.health!.status).toBe('degraded');
  });

  it('clear removes all governors', () => {
    registry.register(createMockGovernor('resource_a'));
    registry.register(createMockGovernor('resource_b'));
    expect(registry.size).toBe(2);

    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.get('resource_a')).toBeUndefined();
  });

  it('getAll handles governor with null health', () => {
    const nullHealth = createMockGovernor('null_resource', null);
    registry.register(nullHealth);

    const all = registry.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]!.health).toBeNull();
  });
});

describe('GovernorRegistry singleton', () => {
  it('governorRegistry is a GovernorRegistry instance', () => {
    expect(governorRegistry).toBeInstanceOf(GovernorRegistry);
  });
});
