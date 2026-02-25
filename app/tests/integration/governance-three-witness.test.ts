/**
 * Three-Witness Integration Test — cycle-009 Sprint 6 (Task 6.2)
 *
 * End-to-end governance lifecycle across all three ResourceGovernor implementations:
 * 1. CorpusMeta (knowledge corpus governor) — mock
 * 2. KnowledgeGovernor (freshness state machine)
 * 3. Reputation (mock governor representing reputation witness)
 *
 * Tests registration, transitions, verification, and cross-resource queries.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GovernorRegistry } from '../../src/services/governor-registry.js';
import { KnowledgeGovernor } from '../../src/services/knowledge-governor.js';
import type { ResourceGovernor, GovernanceEvent } from '../../src/services/resource-governor.js';
import { createKnowledgeItem } from '../../src/types/knowledge-governance.js';

/**
 * Mock governor simulating CorpusMeta for test isolation.
 */
function createCorpusMetaMock(): ResourceGovernor<unknown> {
  const events: GovernanceEvent[] = [
    { seq: 1, type: 'corpus_init', timestamp: new Date().toISOString(), detail: 'Corpus initialized', author: 'system' },
  ];
  return {
    resourceType: 'knowledge_corpus',
    getHealth: () => ({
      status: 'healthy',
      totalItems: 42,
      staleItems: 0,
      version: 1,
    }),
    getGovernorSelfKnowledge: () => ({
      version: 1,
      confidence: 'high' as const,
      lastMutation: { type: 'corpus_init', timestamp: new Date().toISOString(), detail: 'Corpus initialized' },
      healthSummary: { status: 'healthy' as const, totalItems: 42, staleItems: 0, version: 1 },
    }),
    getEventLog: () => events,
    getLatestEvent: () => events[events.length - 1] ?? null,
    invalidateCache: () => {},
    warmCache: () => {},
  };
}

/**
 * Mock governor for reputation witness.
 */
function createReputationGovernorMock(): ResourceGovernor<unknown> {
  const events: GovernanceEvent[] = [];
  let version = 0;

  return {
    resourceType: 'reputation',
    getHealth: () => ({
      status: 'healthy' as const,
      totalItems: 5,
      staleItems: 0,
      version,
    }),
    getGovernorSelfKnowledge: () => ({
      version,
      confidence: version > 0 ? 'high' as const : 'low' as const,
      lastMutation: events.length > 0
        ? { type: events[events.length - 1].type, timestamp: events[events.length - 1].timestamp, detail: events[events.length - 1].detail }
        : null,
      healthSummary: { status: 'healthy' as const, totalItems: 5, staleItems: 0, version },
    }),
    getEventLog: () => events,
    getLatestEvent: () => events[events.length - 1] ?? null,
    invalidateCache: () => {},
    warmCache: () => {
      version++;
      events.push({
        seq: events.length + 1,
        type: 'reputation_warm',
        timestamp: new Date().toISOString(),
        detail: 'Cache warmed',
        author: 'system',
      });
    },
  };
}

describe('Three-Witness Governance Integration (Task 6.2)', () => {
  let registry: GovernorRegistry;
  let corpusMeta: ResourceGovernor<unknown>;
  let knowledgeGov: KnowledgeGovernor;
  let reputationGov: ResourceGovernor<unknown>;

  beforeEach(() => {
    registry = new GovernorRegistry();
    corpusMeta = createCorpusMetaMock();
    knowledgeGov = new KnowledgeGovernor();
    reputationGov = createReputationGovernorMock();
  });

  it('registers all three governors', () => {
    registry.register(corpusMeta);
    registry.register(knowledgeGov);
    registry.register(reputationGov);

    expect(registry.size).toBe(3);
  });

  it('getAll returns 3 resource types with health', () => {
    registry.register(corpusMeta);
    registry.register(knowledgeGov);
    registry.register(reputationGov);

    const snapshots = registry.getAll();
    expect(snapshots).toHaveLength(3);

    const types = snapshots.map((s) => s.resourceType).sort();
    expect(types).toEqual(['knowledge', 'knowledge_corpus', 'reputation']);
  });

  it('verifyAllResources returns health + self-knowledge for each witness', () => {
    registry.register(corpusMeta);
    registry.register(knowledgeGov);
    registry.register(reputationGov);

    const verifications = registry.verifyAllResources();
    expect(verifications).toHaveLength(3);

    for (const v of verifications) {
      expect(v.resourceType).toBeDefined();
      expect('health' in v).toBe(true);
      expect('selfKnowledge' in v).toBe(true);
    }
  });

  it('corpus meta witness reports healthy', () => {
    registry.register(corpusMeta);

    const [snapshot] = registry.getAll();
    expect(snapshot.health?.status).toBe('healthy');
    expect(snapshot.health?.totalItems).toBe(42);
  });

  it('knowledge governor witness tracks freshness items', () => {
    const item = createKnowledgeItem('test-source');
    knowledgeGov.registerCorpus(item);

    const health = knowledgeGov.getHealth();
    expect(health?.totalItems).toBe(1);
    expect(health?.status).toBe('healthy');
  });

  it('knowledge governor INV-009 freshness bound is verifiable', () => {
    const item = createKnowledgeItem('fresh-item');
    knowledgeGov.registerCorpus(item);

    // Freshness bound should pass for fresh items (score 1.0)
    const result = knowledgeGov.verifyFreshnessBound(item);
    expect(result.satisfied).toBe(true);
  });

  it('knowledge governor INV-010 citation integrity is verifiable', () => {
    const item = createKnowledgeItem('cited-item', { citation_count: 2 });
    knowledgeGov.registerCorpus(item);

    const knownSources = new Set(['source-a', 'source-b', 'source-c']);
    const result = knowledgeGov.verifyCitationIntegrity(item, knownSources);
    expect(result.satisfied).toBe(true);
  });

  it('reputation governor witness responds to warmCache', () => {
    registry.register(reputationGov);

    const before = reputationGov.getGovernorSelfKnowledge();
    expect(before?.confidence).toBe('low');

    reputationGov.warmCache();

    const after = reputationGov.getGovernorSelfKnowledge();
    expect(after?.confidence).toBe('high');
    expect(after?.version).toBe(1);
  });

  it('cross-resource query: knowledge + reputation in same registry', () => {
    registry.register(knowledgeGov);
    registry.register(reputationGov);

    const knowledge = registry.get('knowledge');
    const reputation = registry.get('reputation');

    expect(knowledge).toBeDefined();
    expect(reputation).toBeDefined();
    expect(knowledge?.resourceType).toBe('knowledge');
    expect(reputation?.resourceType).toBe('reputation');
  });

  it('all three witnesses have event logs', () => {
    registry.register(corpusMeta);
    registry.register(knowledgeGov);
    registry.register(reputationGov);

    // CorpusMeta mock has 1 init event
    expect(corpusMeta.getEventLog().length).toBeGreaterThanOrEqual(1);

    // KnowledgeGovernor gains events on registerCorpus
    const item = createKnowledgeItem('event-test');
    knowledgeGov.registerCorpus(item);
    expect(knowledgeGov.getEventLog().length).toBeGreaterThanOrEqual(1);

    // Reputation governor gains events on warmCache
    reputationGov.warmCache();
    expect(reputationGov.getEventLog().length).toBeGreaterThanOrEqual(1);
  });

  it('verifyAllResources shows degraded when a witness is degraded', () => {
    const degradedGov: ResourceGovernor<unknown> = {
      resourceType: 'degraded_resource',
      getHealth: () => ({ status: 'degraded', totalItems: 10, staleItems: 5, version: 2 }),
      getGovernorSelfKnowledge: () => null,
      getEventLog: () => [],
      getLatestEvent: () => null,
      invalidateCache: () => {},
      warmCache: () => {},
    };

    registry.register(corpusMeta);
    registry.register(degradedGov);

    const verifications = registry.verifyAllResources();
    const degraded = verifications.find((v) => v.resourceType === 'degraded_resource');
    expect(degraded?.health?.status).toBe('degraded');
  });
});
