import { describe, it, expect } from 'vitest';
import { ReputationService, InMemoryReputationStore } from '../../src/services/reputation-service.js';
import type {
  ReputationScore,
  ReputationAggregate,
} from '../../src/services/reputation-service.js';
import type { ReputationEvent } from '../../src/types/reputation-evolution.js';

describe('ReputationService', () => {
  const service = new ReputationService();

  it('instantiates without error', () => {
    expect(service).toBeInstanceOf(ReputationService);
  });

  describe('checkReliability', () => {
    it('returns reliable for score with sufficient sample size', () => {
      const score: ReputationScore = {
        agent_id: 'agent-1',
        score: 0.85,
        components: {
          outcome_quality: 0.9,
          performance_consistency: 0.8,
          dispute_ratio: 0.05,
          community_standing: 0.85,
        },
        sample_size: 50,
        last_updated: new Date().toISOString(),
        decay_applied: false,
        contract_version: '7.9.2',
      };

      const result = service.checkReliability(score);
      expect(result.reliable).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('returns unreliable for score with insufficient sample size', () => {
      const score: ReputationScore = {
        agent_id: 'agent-1',
        score: 0.85,
        components: {
          outcome_quality: 0.9,
          performance_consistency: 0.8,
          dispute_ratio: 0.05,
          community_standing: 0.85,
        },
        sample_size: 2,
        last_updated: new Date().toISOString(),
        decay_applied: false,
        contract_version: '7.9.2',
      };

      const result = service.checkReliability(score);
      expect(result.reliable).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('isValidTransition', () => {
    it('allows cold -> warming', () => {
      expect(service.isValidTransition('cold', 'warming')).toBe(true);
    });

    it('allows warming -> established', () => {
      expect(service.isValidTransition('warming', 'established')).toBe(true);
    });

    it('allows established -> authoritative', () => {
      expect(service.isValidTransition('established', 'authoritative')).toBe(true);
    });

    it('allows reset to cold from any state', () => {
      expect(service.isValidTransition('warming', 'cold')).toBe(true);
      expect(service.isValidTransition('established', 'cold')).toBe(true);
      expect(service.isValidTransition('authoritative', 'cold')).toBe(true);
    });

    it('disallows skipping states', () => {
      expect(service.isValidTransition('cold', 'established')).toBe(false);
      expect(service.isValidTransition('cold', 'authoritative')).toBe(false);
      expect(service.isValidTransition('warming', 'authoritative')).toBe(false);
    });

    it('allows cold -> cold (reset is valid from any state including cold)', () => {
      // Hounfour treats * -> cold as valid (reset transition)
      expect(service.isValidTransition('cold', 'cold')).toBe(true);
    });
  });

  describe('computeBlended', () => {
    it('returns collection score when personal is null (cold start)', () => {
      const blended = service.computeBlended({
        personalScore: null,
        collectionScore: 0.7,
        sampleCount: 0,
        pseudoCount: 10,
      });
      expect(blended).toBe(0.7);
    });

    it('blends personal and collection scores with Bayesian formula', () => {
      const blended = service.computeBlended({
        personalScore: 0.9,
        collectionScore: 0.5,
        sampleCount: 10,
        pseudoCount: 10,
      });
      // (10 * 0.5 + 10 * 0.9) / (10 + 10) = 14 / 20 = 0.7
      expect(blended).toBeCloseTo(0.7, 5);
    });

    it('weights personal more as sample count grows', () => {
      const lowSample = service.computeBlended({
        personalScore: 0.9,
        collectionScore: 0.5,
        sampleCount: 5,
        pseudoCount: 10,
      });
      const highSample = service.computeBlended({
        personalScore: 0.9,
        collectionScore: 0.5,
        sampleCount: 100,
        pseudoCount: 10,
      });
      expect(highSample).toBeGreaterThan(lowSample);
      expect(highSample).toBeCloseTo(0.9, 1); // Should approach personal score
    });
  });

  describe('computeWeight', () => {
    it('returns 0 for zero samples', () => {
      expect(service.computeWeight(0, 10)).toBe(0);
    });

    it('approaches 1 as sample count grows', () => {
      const weight = service.computeWeight(1000, 10);
      expect(weight).toBeGreaterThan(0.99);
    });

    it('returns 0.5 when samples equal pseudo count', () => {
      const weight = service.computeWeight(10, 10);
      expect(weight).toBe(0.5);
    });
  });

  describe('computeDecayed', () => {
    it('returns full count at day 0', () => {
      expect(service.computeDecayed(100, 0)).toBe(100);
    });

    it('returns ~half count at half-life days', () => {
      const decayed = service.computeDecayed(100, 30); // default half-life = 30
      expect(decayed).toBeCloseTo(50, 0);
    });

    it('returns small count after many half-lives', () => {
      const decayed = service.computeDecayed(100, 150); // 5 half-lives
      expect(decayed).toBeLessThan(5);
    });
  });

  describe('computeCrossModel', () => {
    it('returns null when all cohorts are cold', () => {
      const result = service.computeCrossModel([
        { personal_score: null, sample_count: 0 },
        { personal_score: null, sample_count: 0 },
      ]);
      expect(result).toBeNull();
    });

    it('returns weighted average of cohort scores', () => {
      const result = service.computeCrossModel([
        { personal_score: 0.8, sample_count: 10 },
        { personal_score: 0.6, sample_count: 10 },
      ]);
      // (0.8*10 + 0.6*10) / (10+10) = 14/20 = 0.7
      expect(result).toBeCloseTo(0.7, 5);
    });

    it('ignores cold cohorts in the average', () => {
      const result = service.computeCrossModel([
        { personal_score: 0.8, sample_count: 10 },
        { personal_score: null, sample_count: 0 },
      ]);
      expect(result).toBeCloseTo(0.8, 5);
    });
  });

  describe('getModelCohort', () => {
    const aggregate: ReputationAggregate = {
      personality_id: 'p1',
      collection_id: 'c1',
      pool_id: 'pool1',
      state: 'established',
      personal_score: 0.8,
      collection_score: 0.7,
      blended_score: 0.75,
      sample_count: 20,
      pseudo_count: 10,
      contributor_count: 5,
      min_sample_count: 10,
      created_at: '2026-01-01T00:00:00Z',
      last_updated: '2026-02-01T00:00:00Z',
      transition_history: [],
      model_cohorts: [
        { model_id: 'gpt-4o', personal_score: 0.85, sample_count: 15, last_updated: '2026-02-01T00:00:00Z' },
        { model_id: 'native', personal_score: 0.75, sample_count: 5, last_updated: '2026-02-01T00:00:00Z' },
      ],
      contract_version: '7.9.2',
    };

    it('finds existing model cohort', () => {
      const cohort = service.getModelCohort(aggregate, 'gpt-4o');
      expect(cohort).toBeDefined();
      expect(cohort!.personal_score).toBe(0.85);
    });

    it('returns undefined for missing model', () => {
      const cohort = service.getModelCohort(aggregate, 'nonexistent');
      expect(cohort).toBeUndefined();
    });
  });
});

describe('InMemoryReputationStore', () => {
  function makeAggregate(state: string = 'cold'): ReputationAggregate {
    return {
      personality_id: 'p1',
      collection_id: 'c1',
      pool_id: 'pool1',
      state: state as ReputationAggregate['state'],
      personal_score: null,
      collection_score: 0.5,
      blended_score: 0.5,
      sample_count: 0,
      pseudo_count: 10,
      contributor_count: 0,
      min_sample_count: 10,
      created_at: '2026-01-01T00:00:00Z',
      last_updated: '2026-01-01T00:00:00Z',
      transition_history: [],
      contract_version: '7.11.0',
    };
  }

  function makeEvent(type: string, ts: string): ReputationEvent {
    return {
      type,
      event_id: `evt-${ts}`,
      agent_id: 'agent-1',
      collection_id: 'col-1',
      timestamp: ts,
      task_type: 'code_review',
      score: 0.9,
      model_id: 'gpt-4o',
    } as unknown as ReputationEvent;
  }

  describe('getEventHistory with limit', () => {
    it('returns all events when no limit specified', async () => {
      const store = new InMemoryReputationStore();
      for (let i = 0; i < 10; i++) {
        await store.appendEvent('nft-1', makeEvent('quality_signal', `2026-01-0${i + 1}T00:00:00Z`));
      }
      const events = await store.getEventHistory('nft-1');
      expect(events).toHaveLength(10);
    });

    it('respects limit parameter', async () => {
      const store = new InMemoryReputationStore();
      for (let i = 0; i < 10; i++) {
        await store.appendEvent('nft-1', makeEvent('quality_signal', `2026-01-0${i + 1}T00:00:00Z`));
      }
      const events = await store.getEventHistory('nft-1', 5);
      expect(events).toHaveLength(5);
    });
  });

  describe('getRecentEvents', () => {
    it('returns the N most recent events in chronological order', async () => {
      const store = new InMemoryReputationStore();
      for (let i = 1; i <= 10; i++) {
        await store.appendEvent('nft-1', makeEvent('quality_signal', `2026-01-${String(i).padStart(2, '0')}T00:00:00Z`));
      }
      const recent = await store.getRecentEvents('nft-1', 3);
      expect(recent).toHaveLength(3);
      // Should be the last 3 events (8th, 9th, 10th)
      expect(recent[0].timestamp).toBe('2026-01-08T00:00:00Z');
      expect(recent[2].timestamp).toBe('2026-01-10T00:00:00Z');
    });

    it('returns all events when fewer than limit exist', async () => {
      const store = new InMemoryReputationStore();
      await store.appendEvent('nft-1', makeEvent('quality_signal', '2026-01-01T00:00:00Z'));
      const recent = await store.getRecentEvents('nft-1', 10);
      expect(recent).toHaveLength(1);
    });

    it('returns empty array for unknown nftId', async () => {
      const store = new InMemoryReputationStore();
      const recent = await store.getRecentEvents('unknown', 5);
      expect(recent).toEqual([]);
    });
  });

  describe('countByState', () => {
    it('counts aggregates grouped by state', async () => {
      const store = new InMemoryReputationStore();
      await store.put('nft-1', makeAggregate('cold'));
      await store.put('nft-2', makeAggregate('cold'));
      await store.put('nft-3', makeAggregate('warming'));
      await store.put('nft-4', makeAggregate('established'));

      const counts = await store.countByState();
      expect(counts.get('cold')).toBe(2);
      expect(counts.get('warming')).toBe(1);
      expect(counts.get('established')).toBe(1);
    });

    it('returns empty map when no aggregates', async () => {
      const store = new InMemoryReputationStore();
      const counts = await store.countByState();
      expect(counts.size).toBe(0);
    });
  });
});
