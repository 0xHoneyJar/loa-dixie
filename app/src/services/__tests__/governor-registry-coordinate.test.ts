import { describe, it, expect, beforeEach } from 'vitest';
import {
  GovernorRegistry,
  type GovernorCoordinationEvent,
} from '../governor-registry.js';

/**
 * Tests for GovernorRegistry.coordinate() — BB-DEEP-08 foundation.
 *
 * Verifies event dispatch, unknown target handling, and broadcast behavior.
 * @since cycle-014 Sprint 105, Task T10
 */

// Minimal stubs for governor types
const stubGovernor = (resourceType: string) => ({
  resourceType,
  getHealth: () => ({ status: 'healthy' as const }),
  getGovernorSelfKnowledge: () => ({
    resourceType,
    governorVersion: '1.0.0',
    capabilities: [],
  }),
});

const stubResource = (resourceType: string) => ({
  resourceType,
  version: 1,
  auditTrail: { entries: [] },
  mutationLog: [],
  transition: () => ({ success: true }),
  verify: () => ({ holds: true, name: 'test' }),
  verifyAll: () => [{ holds: true, name: 'test' }],
  getGovernedState: () => ({
    version: 1,
    contract_version: '1.0.0',
    governance_class: 'test',
    mutation_count: 0,
  }),
});

function makeEvent(overrides: Partial<GovernorCoordinationEvent> = {}): GovernorCoordinationEvent {
  return {
    source: 'reputation',
    target: 'fleet-governor',
    eventType: 'resource_frozen',
    payload: { reason: 'maintenance' },
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('GovernorRegistry.coordinate()', () => {
  let registry: GovernorRegistry;
  let logEntries: Array<{ level: string; data: Record<string, unknown> }>;
  let log: (level: 'info' | 'warn', data: Record<string, unknown>) => void;

  beforeEach(() => {
    registry = new GovernorRegistry();
    logEntries = [];
    log = (level, data) => logEntries.push({ level, data });
  });

  it('dispatches to a registered governor', () => {
    registry.register(stubGovernor('fleet-governor') as never);
    const result = registry.coordinate(makeEvent(), log);

    expect(result.dispatched).toBe(true);
    expect(result.target).toBe('fleet-governor');
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0].level).toBe('info');
    expect(logEntries[0].data.event).toBe('governor_coordination_dispatched');
  });

  it('dispatches to a registered governed resource', () => {
    registry.registerResource(stubResource('reputation') as never);
    const event = makeEvent({ target: 'reputation' });
    const result = registry.coordinate(event, log);

    expect(result.dispatched).toBe(true);
    expect(result.target).toBe('reputation');
  });

  it('returns dispatched=false for unknown target', () => {
    const result = registry.coordinate(makeEvent({ target: 'nonexistent' }), log);

    expect(result.dispatched).toBe(false);
    expect(result.target).toBe('nonexistent');
    expect(result.reason).toContain('Unknown governor target');
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0].level).toBe('warn');
    expect(logEntries[0].data.event).toBe('governor_coordination_unknown_target');
  });

  it('broadcasts to all registered governors with target "*"', () => {
    registry.register(stubGovernor('fleet-governor') as never);
    registry.registerResource(stubResource('reputation') as never);

    const event = makeEvent({ target: '*' });
    const result = registry.coordinate(event, log);

    expect(result.dispatched).toBe(true);
    expect(result.target).toBe('*');
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0].data.event).toBe('governor_coordination_broadcast');
    expect(logEntries[0].data.targets).toEqual(['fleet-governor', 'reputation']);
  });

  it('broadcast on empty registry still dispatches', () => {
    const event = makeEvent({ target: '*' });
    const result = registry.coordinate(event, log);

    expect(result.dispatched).toBe(true);
    expect(result.target).toBe('*');
    expect((logEntries[0].data.targets as string[]).length).toBe(0);
  });

  it('works without a logger', () => {
    registry.register(stubGovernor('fleet-governor') as never);
    const result = registry.coordinate(makeEvent());

    expect(result.dispatched).toBe(true);
  });

  it('preserves event metadata through dispatch', () => {
    registry.register(stubGovernor('fleet-governor') as never);
    const event = makeEvent({
      payload: { freeze_duration_ms: 5000, severity: 'critical' },
    });
    const result = registry.coordinate(event, log);

    expect(result.dispatched).toBe(true);
    expect(logEntries[0].data.source).toBe('reputation');
    expect(logEntries[0].data.eventType).toBe('resource_frozen');
  });

  it('deduplicates broadcast targets registered in both maps (S6-T1)', () => {
    // Register same resource type in BOTH the governor map and governed resource map
    const sharedType = 'shared-governor';
    registry.register(stubGovernor(sharedType) as never);
    registry.registerResource(stubResource(sharedType) as never);

    // Also register a unique type in each map
    registry.register(stubGovernor('governor-only') as never);
    registry.registerResource(stubResource('resource-only') as never);

    const event = makeEvent({ target: '*' });
    const result = registry.coordinate(event, log);

    expect(result.dispatched).toBe(true);
    const targets = logEntries[0].data.targets as string[];
    // Should have exactly 3, not 4 (sharedType appears only once)
    expect(targets).toHaveLength(3);
    expect(targets).toContain('shared-governor');
    expect(targets).toContain('governor-only');
    expect(targets).toContain('resource-only');
    // Verify no duplicates
    expect(new Set(targets).size).toBe(targets.length);
  });
});
