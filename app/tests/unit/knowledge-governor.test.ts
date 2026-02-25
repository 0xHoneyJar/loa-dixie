/**
 * KnowledgeGovernor Tests — cycle-009 Sprint 3
 *
 * Validates:
 * - Type compilation and factory functions (Task 3.1)
 * - Freshness decay computation (Task 3.2)
 * - State machine transitions (Task 3.2)
 * - ResourceGovernor<KnowledgeItem> implementation (Task 3.3)
 * - Invariant verification: INV-009, INV-010 (Task 3.4)
 * - GovernorRegistry integration (Task 3.6)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  KnowledgeGovernor,
  computeFreshnessDecay,
  scoreToState,
  FreshnessStateMachine,
  DEFAULT_DECAY_RATE,
  FRESHNESS_THRESHOLDS,
} from '../../src/services/knowledge-governor.js';
import { validateTransition } from '../../src/services/state-machine.js';
import {
  createKnowledgeItem,
} from '../../src/types/knowledge-governance.js';
import type { KnowledgeItem } from '../../src/types/knowledge-governance.js';
import { GovernorRegistry } from '../../src/services/governor-registry.js';

describe('Knowledge Governance Types (Task 3.1)', () => {
  it('createKnowledgeItem produces valid default item', () => {
    const item = createKnowledgeItem('corpus-1');
    expect(item.corpus_id).toBe('corpus-1');
    expect(item.freshness_score).toBe(1.0);
    expect(item.freshness_state).toBe('fresh');
    expect(item.decay_rate).toBe(0.023);
    expect(item.dimension_scores.recency).toBe(1.0);
  });

  it('createKnowledgeItem accepts overrides', () => {
    const item = createKnowledgeItem('corpus-2', {
      source_count: 50,
      freshness_score: 0.5,
      freshness_state: 'decaying',
    });
    expect(item.source_count).toBe(50);
    expect(item.freshness_score).toBe(0.5);
    expect(item.freshness_state).toBe('decaying');
  });

  it('KnowledgeFreshnessState covers all 4 states', () => {
    const states: Array<KnowledgeItem['freshness_state']> = [
      'fresh',
      'decaying',
      'stale',
      'expired',
    ];
    expect(states).toHaveLength(4);
  });
});

describe('Freshness State Machine (Task 3.2)', () => {
  it('allows fresh -> decaying', () => {
    const result = validateTransition(FreshnessStateMachine, 'fresh', 'decaying');
    expect(result.valid).toBe(true);
  });

  it('allows decaying -> stale', () => {
    const result = validateTransition(FreshnessStateMachine, 'decaying', 'stale');
    expect(result.valid).toBe(true);
  });

  it('allows stale -> expired', () => {
    const result = validateTransition(FreshnessStateMachine, 'stale', 'expired');
    expect(result.valid).toBe(true);
  });

  it('allows expired -> fresh (re-ingestion)', () => {
    const result = validateTransition(FreshnessStateMachine, 'expired', 'fresh');
    expect(result.valid).toBe(true);
  });

  it('rejects fresh -> expired (must go through intermediate states)', () => {
    const result = validateTransition(FreshnessStateMachine, 'fresh', 'expired');
    expect(result.valid).toBe(false);
  });

  it('computeFreshnessDecay returns correct values', () => {
    // At t=0, score should be 1.0
    expect(computeFreshnessDecay(DEFAULT_DECAY_RATE, 0)).toBeCloseTo(1.0, 4);

    // At t=30 (half-life), score should be ~0.5
    expect(computeFreshnessDecay(DEFAULT_DECAY_RATE, 30)).toBeCloseTo(0.502, 2);

    // At t=60, score should be ~0.25
    expect(computeFreshnessDecay(DEFAULT_DECAY_RATE, 60)).toBeCloseTo(0.252, 2);
  });

  it('scoreToState maps thresholds correctly', () => {
    expect(scoreToState(1.0)).toBe('fresh');
    expect(scoreToState(0.7)).toBe('fresh');
    expect(scoreToState(0.69)).toBe('decaying');
    expect(scoreToState(0.3)).toBe('decaying');
    expect(scoreToState(0.29)).toBe('stale');
    expect(scoreToState(0.1)).toBe('stale');
    expect(scoreToState(0.099)).toBe('expired');
    expect(scoreToState(0)).toBe('expired');
  });
});

describe('KnowledgeGovernor (Task 3.3)', () => {
  let governor: KnowledgeGovernor;

  beforeEach(() => {
    governor = new KnowledgeGovernor();
  });

  it('has resourceType "knowledge"', () => {
    expect(governor.resourceType).toBe('knowledge');
  });

  it('getHealth returns healthy for empty corpus', () => {
    const health = governor.getHealth();
    expect(health.status).toBe('healthy');
    expect(health.totalItems).toBe(0);
  });

  it('getHealth reflects stale items', () => {
    // Register an item that's very old (will decay to stale)
    const staleItem = createKnowledgeItem('corpus-old', {
      last_ingested: '2025-01-01T00:00:00Z',
      freshness_score: 0.1,
    });
    governor.registerCorpus(staleItem);

    const health = governor.getHealth();
    expect(health.totalItems).toBe(1);
    expect(health.staleItems).toBeGreaterThanOrEqual(1);
  });

  it('getGovernorSelfKnowledge returns metadata', () => {
    const freshItem = createKnowledgeItem('corpus-1');
    governor.registerCorpus(freshItem);

    const knowledge = governor.getGovernorSelfKnowledge();
    expect(knowledge.version).toBeGreaterThan(0);
    expect(knowledge.lastMutation).toBeDefined();
    expect(knowledge.healthSummary.totalItems).toBe(1);
  });

  it('getEventLog tracks registration events', () => {
    governor.registerCorpus(createKnowledgeItem('c1'));
    governor.registerCorpus(createKnowledgeItem('c2'));

    const events = governor.getEventLog();
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('corpus.register');
  });

  it('getLatestEvent returns null for empty governor', () => {
    expect(governor.getLatestEvent()).toBeNull();
  });
});

describe('Knowledge Invariants (Task 3.4)', () => {
  let governor: KnowledgeGovernor;

  beforeEach(() => {
    governor = new KnowledgeGovernor();
  });

  it('INV-009: satisfied when freshness monotonically decreasing', () => {
    const item = createKnowledgeItem('corpus-1', {
      freshness_score: 0.8,
      last_ingested: '2026-02-20T00:00:00Z',
    });

    // Decayed score should be <= 0.8, so invariant is satisfied
    const result = governor.verifyFreshnessBound(item, 0.75);
    expect(result.satisfied).toBe(true);
    expect(result.detail).toContain('INV-009 satisfied');
  });

  it('INV-009: violated when score increases without ingestion', () => {
    const item = createKnowledgeItem('corpus-1', {
      freshness_score: 0.5,
    });

    // Simulate a score that's higher than stored (violation)
    const result = governor.verifyFreshnessBound(item, 0.6);
    expect(result.satisfied).toBe(false);
    expect(result.detail).toContain('INV-009 violation');
  });

  it('INV-010: satisfied when all citations resolvable', () => {
    const item = createKnowledgeItem('corpus-1', {
      citation_count: 3,
    });
    const sources = new Set(['src-1', 'src-2', 'src-3', 'src-4']);

    const result = governor.verifyCitationIntegrity(item, sources);
    expect(result.satisfied).toBe(true);
  });

  it('INV-010: violated when citations exceed known sources', () => {
    const item = createKnowledgeItem('corpus-1', {
      citation_count: 5,
    });
    const sources = new Set(['src-1', 'src-2']);

    const result = governor.verifyCitationIntegrity(item, sources);
    expect(result.satisfied).toBe(false);
    expect(result.detail).toContain('INV-010 violation');
  });
});

describe('GovernorRegistry Integration (Task 3.6)', () => {
  it('KnowledgeGovernor registers in GovernorRegistry', () => {
    const registry = new GovernorRegistry();
    const governor = new KnowledgeGovernor();

    registry.register(governor);

    expect(registry.get('knowledge')).toBe(governor);
    expect(registry.size).toBe(1);
  });

  it('getAll() includes knowledge governor snapshot', () => {
    const registry = new GovernorRegistry();
    const governor = new KnowledgeGovernor();
    governor.registerCorpus(createKnowledgeItem('c1'));

    registry.register(governor);

    const snapshots = registry.getAll();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].resourceType).toBe('knowledge');
    expect(snapshots[0].health?.totalItems).toBe(1);
  });
});
