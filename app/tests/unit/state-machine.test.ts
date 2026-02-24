import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  assertTransition,
  CircuitStateMachine,
  MemoryEncryptionMachine,
  AutonomousModeMachine,
  ScheduleLifecycleMachine,
} from '../../src/services/state-machine.js';
import { validateAccessPolicy } from '../../src/services/access-policy-validator.js';
import { BridgeInsightsGenerator } from '../../src/services/bridge-insights.js';
import type { AccessPolicy } from '../../src/types.js';

describe('state machine validation', () => {
  describe('CircuitState', () => {
    it('allows closed → open', () => {
      const result = validateTransition(CircuitStateMachine, 'closed', 'open');
      expect(result.valid).toBe(true);
    });

    it('allows open → half_open', () => {
      const result = validateTransition(CircuitStateMachine, 'open', 'half_open');
      expect(result.valid).toBe(true);
    });

    it('allows half_open → closed', () => {
      const result = validateTransition(CircuitStateMachine, 'half_open', 'closed');
      expect(result.valid).toBe(true);
    });

    it('allows half_open → open', () => {
      const result = validateTransition(CircuitStateMachine, 'half_open', 'open');
      expect(result.valid).toBe(true);
    });

    it('rejects closed → half_open', () => {
      const result = validateTransition(CircuitStateMachine, 'closed', 'half_open');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('rejects open → closed', () => {
      const result = validateTransition(CircuitStateMachine, 'open', 'closed');
      expect(result.valid).toBe(false);
    });

    it('uses Hounfour naming (half_open not half-open)', () => {
      expect(CircuitStateMachine.transitions).toHaveProperty('half_open');
    });
  });

  describe('MemoryEncryptionState', () => {
    it('allows unsealed → sealing', () => {
      expect(validateTransition(MemoryEncryptionMachine, 'unsealed', 'sealing').valid).toBe(true);
    });

    it('allows sealing → sealed', () => {
      expect(validateTransition(MemoryEncryptionMachine, 'sealing', 'sealed').valid).toBe(true);
    });

    it('allows sealed → unsealing', () => {
      expect(validateTransition(MemoryEncryptionMachine, 'sealed', 'unsealing').valid).toBe(true);
    });

    it('rejects unsealed → sealed (must go through sealing)', () => {
      expect(validateTransition(MemoryEncryptionMachine, 'unsealed', 'sealed').valid).toBe(false);
    });
  });

  describe('AutonomousMode', () => {
    it('allows disabled → enabled', () => {
      expect(validateTransition(AutonomousModeMachine, 'disabled', 'enabled').valid).toBe(true);
    });

    it('allows enabled → suspended', () => {
      expect(validateTransition(AutonomousModeMachine, 'enabled', 'suspended').valid).toBe(true);
    });

    it('allows enabled → confirming', () => {
      expect(validateTransition(AutonomousModeMachine, 'enabled', 'confirming').valid).toBe(true);
    });

    it('rejects disabled → suspended', () => {
      expect(validateTransition(AutonomousModeMachine, 'disabled', 'suspended').valid).toBe(false);
    });
  });

  describe('ScheduleLifecycle', () => {
    it('allows pending → active', () => {
      expect(validateTransition(ScheduleLifecycleMachine, 'pending', 'active').valid).toBe(true);
    });

    it('allows active → completed', () => {
      expect(validateTransition(ScheduleLifecycleMachine, 'active', 'completed').valid).toBe(true);
    });

    it('rejects completed → active (terminal state)', () => {
      expect(validateTransition(ScheduleLifecycleMachine, 'completed', 'active').valid).toBe(false);
    });

    it('allows failed → pending (retry)', () => {
      expect(validateTransition(ScheduleLifecycleMachine, 'failed', 'pending').valid).toBe(true);
    });
  });

  describe('assertTransition', () => {
    it('does not throw for valid transition', () => {
      expect(() => assertTransition(CircuitStateMachine, 'closed', 'open')).not.toThrow();
    });

    it('throws 409 for invalid transition', () => {
      try {
        assertTransition(CircuitStateMachine, 'closed', 'half_open');
        expect.unreachable('Should have thrown');
      } catch (err) {
        const e = err as { status: number; body: { error: string } };
        expect(e.status).toBe(409);
        expect(e.body.error).toBe('invalid_transition');
      }
    });
  });
});

describe('AccessPolicy runtime validation', () => {
  it('validates role_based policy with roles', () => {
    const policy: AccessPolicy = { type: 'role_based', roles: ['team'], audit_required: true, revocable: false };
    const result = validateAccessPolicy(policy);
    expect(result.valid).toBe(true);
  });

  it('rejects role_based policy without roles', () => {
    const policy = { type: 'role_based', roles: [], audit_required: true, revocable: false } as unknown as AccessPolicy;
    const result = validateAccessPolicy(policy);
    expect(result.valid).toBe(false);
    // Hounfour schema-level validation catches minItems: 1 on roles,
    // or cross-field validator catches empty roles — either way it's invalid
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validates time_limited policy with duration', () => {
    const policy = { type: 'time_limited', duration_hours: 24, audit_required: true, revocable: true } as AccessPolicy;
    const result = validateAccessPolicy(policy);
    expect(result.valid).toBe(true);
  });

  it('rejects time_limited policy without duration', () => {
    const policy = { type: 'time_limited', audit_required: true, revocable: true } as AccessPolicy;
    const result = validateAccessPolicy(policy);
    expect(result.valid).toBe(false);
    // Cross-field validator: 'duration_hours is required when type is "time_limited"'
    expect(result.errors.some(e => e.toLowerCase().includes('duration_hours'))).toBe(true);
  });

  it('rejects missing audit_required', () => {
    const policy = { type: 'role_based', roles: ['team'], revocable: false } as unknown as AccessPolicy;
    const result = validateAccessPolicy(policy);
    expect(result.valid).toBe(false);
    // Hounfour TypeBox schema requires audit_required as a boolean field
    expect(result.errors.some(e => e.includes('audit_required'))).toBe(true);
  });
});

describe('BridgeInsightsGenerator', () => {
  it('generates insights artifact', () => {
    const gen = new BridgeInsightsGenerator();
    gen.addInsight({
      id: 'BI-001',
      source: { bridgeIteration: 1, prNumber: 42, reviewDate: '2026-02-21' },
      category: 'architectural',
      insight: 'Conway thesis positions the product as an organism',
      implications: ['Design for agent autonomy', 'Economic metadata enables trust'],
      actionable: true,
      tags: ['conway', 'architecture', 'governance'],
    });
    gen.addInsight({
      id: 'BI-002',
      source: { bridgeIteration: 2, reviewDate: '2026-02-21' },
      category: 'governance',
      insight: 'Ostrom principles map to conviction tiers',
      implications: ['Graduated access replaces binary gates'],
      actionable: true,
      tags: ['ostrom', 'governance', 'conviction'],
    });

    const artifact = gen.generate('cycle-002');
    expect(artifact.insights).toHaveLength(2);
    expect(artifact.themes).toContain('governance');
    expect(artifact.summary).toContain('2 insights');
  });

  it('loadForPlanning returns actionable insights', () => {
    const gen = new BridgeInsightsGenerator();
    gen.addInsight({
      id: 'BI-001',
      source: { bridgeIteration: 1, reviewDate: '2026-02-21' },
      category: 'architectural',
      insight: 'Test insight',
      implications: ['implication'],
      actionable: true,
      tags: ['test'],
    });
    gen.addInsight({
      id: 'BI-002',
      source: { bridgeIteration: 1, reviewDate: '2026-02-21' },
      category: 'economic',
      insight: 'Non-actionable observation',
      implications: [],
      actionable: false,
      tags: ['observation'],
    });

    const result = gen.loadForPlanning();
    expect(result.actionableInsights).toHaveLength(1);
    expect(result.actionableInsights[0].id).toBe('BI-001');
  });

  it('generates YAML output', () => {
    const gen = new BridgeInsightsGenerator();
    gen.addInsight({
      id: 'BI-001',
      source: { bridgeIteration: 1, reviewDate: '2026-02-21' },
      category: 'architectural',
      insight: 'Test',
      implications: ['imp1'],
      actionable: true,
      tags: ['test'],
    });

    const yaml = gen.toYaml('cycle-002');
    expect(yaml).toContain('cycle_id: cycle-002');
    expect(yaml).toContain('BI-001');
    expect(yaml).toContain('category: "architectural"');
  });
});
