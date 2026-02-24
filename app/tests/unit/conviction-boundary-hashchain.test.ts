/**
 * Conviction Boundary — Hash Chain Integration Tests
 * @since cycle-005 — Sprint 61 (Tasks 2.2, 2.5)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluateEconomicBoundaryForWallet } from '../../src/services/conviction-boundary.js';
import { ScoringPathTracker } from '../../src/services/scoring-path-tracker.js';
import {
  SCORING_PATH_GENESIS_HASH,
  computeScoringPathHash,
} from '@0xhoneyjar/loa-hounfour/governance';
import type { DixieReputationAggregate } from '../../src/types/reputation-evolution.js';

describe('Conviction Boundary — Hash Chain Integration', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    debugSpy.mockRestore();
  });

  it('tier_default with tracker produces entry_hash + previous_hash (genesis)', () => {
    const tracker = new ScoringPathTracker();
    const result = evaluateEconomicBoundaryForWallet(
      '0xtest',
      'builder',
      '100000000',
      { scoringPathTracker: tracker },
    );

    // Verify the scoring path was logged with hash fields
    expect(debugSpy).toHaveBeenCalledWith(
      '[conviction-boundary] scoring_path:',
      expect.stringContaining('entry_hash'),
    );

    // Parse logged scoring path
    const logCall = debugSpy.mock.calls[0];
    const logged = JSON.parse(logCall[1] as string);
    expect(logged.path).toBe('tier_default');
    expect(logged.entry_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(logged.previous_hash).toBe(SCORING_PATH_GENESIS_HASH);
    expect(logged.scored_at).toBeDefined();
    expect(logged.reason).toBeDefined();

    // Result is still a valid economic boundary evaluation
    expect(result.access_decision.granted).toBe(true);
  });

  it('task_cohort with tracker produces chained entry_hash', () => {
    const tracker = new ScoringPathTracker();
    // First call — produces tier_default (primes the chain)
    evaluateEconomicBoundaryForWallet(
      '0xprimer',
      'builder',
      '100000000',
      { scoringPathTracker: tracker },
    );

    const firstHash = tracker.tipHash;

    // Second call — with task cohort data
    const aggregate: DixieReputationAggregate = {
      personality_id: 'test',
      collection_id: 'test',
      pool_id: 'test',
      state: 'established',
      personal_score: 0.8,
      collection_score: 0.5,
      blended_score: 0.7,
      sample_count: 50,
      pseudo_count: 10,
      contributor_count: 5,
      min_sample_count: 10,
      created_at: '2026-01-01T00:00:00Z',
      last_updated: '2026-02-24T00:00:00Z',
      transition_history: [],
      contract_version: '7.11.0',
      task_cohorts: [{
        model_id: 'gpt-4o',
        personal_score: 0.9,
        sample_count: 30,
        last_updated: '2026-02-24T00:00:00Z',
        task_type: 'code_review',
      }],
    };

    debugSpy.mockClear();
    evaluateEconomicBoundaryForWallet(
      '0xtasked',
      'architect',
      '100000000',
      {
        reputationAggregate: aggregate,
        taskType: 'code_review',
        scoringPathTracker: tracker,
      },
    );

    const logCall = debugSpy.mock.calls[0];
    const logged = JSON.parse(logCall[1] as string);
    expect(logged.path).toBe('task_cohort');
    expect(logged.previous_hash).toBe(firstHash);
    expect(logged.entry_hash).not.toBe(firstHash);
  });

  it('aggregate with tracker produces chain integrity', () => {
    const tracker = new ScoringPathTracker();
    const aggregate: DixieReputationAggregate = {
      personality_id: 'test',
      collection_id: 'test',
      pool_id: 'test',
      state: 'warming',
      personal_score: 0.6,
      collection_score: 0.5,
      blended_score: 0.55,
      sample_count: 20,
      pseudo_count: 10,
      contributor_count: 3,
      min_sample_count: 10,
      created_at: '2026-01-01T00:00:00Z',
      last_updated: '2026-02-24T00:00:00Z',
      transition_history: [],
      contract_version: '7.11.0',
    };

    evaluateEconomicBoundaryForWallet(
      '0xagg',
      'builder',
      '100000000',
      {
        reputationAggregate: aggregate,
        scoringPathTracker: tracker,
      },
    );

    const logCall = debugSpy.mock.calls[0];
    const logged = JSON.parse(logCall[1] as string);
    expect(logged.path).toBe('aggregate');
    expect(logged.entry_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(logged.previous_hash).toBe(SCORING_PATH_GENESIS_HASH);
  });

  it('no tracker produces plain object without hash fields (backward compat)', () => {
    evaluateEconomicBoundaryForWallet(
      '0xplain',
      'builder',
      '100000000',
    );

    const logCall = debugSpy.mock.calls[0];
    const logged = JSON.parse(logCall[1] as string);
    expect(logged.path).toBe('tier_default');
    expect(logged.entry_hash).toBeUndefined();
    expect(logged.previous_hash).toBeUndefined();
    expect(logged.scored_at).toBeUndefined();
  });

  describe('E2E hash chain validation (Task 2.5)', () => {
    it('3 consecutive evaluations produce a valid 3-entry hash chain', () => {
      const tracker = new ScoringPathTracker();

      // Evaluation 1: tier_default (cold start, no aggregate)
      debugSpy.mockClear();
      evaluateEconomicBoundaryForWallet('0xe2e', 'builder', '100000000', {
        scoringPathTracker: tracker,
      });
      const e1 = JSON.parse(debugSpy.mock.calls[0][1] as string);

      // Evaluation 2: aggregate (has personal score, no task cohorts)
      debugSpy.mockClear();
      evaluateEconomicBoundaryForWallet('0xe2e', 'architect', '100000000', {
        reputationAggregate: {
          personality_id: 'e2e',
          collection_id: 'e2e',
          pool_id: 'e2e',
          state: 'established',
          personal_score: 0.75,
          collection_score: 0.5,
          blended_score: 0.6,
          sample_count: 40,
          pseudo_count: 10,
          contributor_count: 5,
          min_sample_count: 10,
          created_at: '2026-01-01T00:00:00Z',
          last_updated: '2026-02-24T00:00:00Z',
          transition_history: [],
          contract_version: '7.11.0',
        },
        scoringPathTracker: tracker,
      });
      const e2 = JSON.parse(debugSpy.mock.calls[0][1] as string);

      // Evaluation 3: task_cohort (has matching task cohort)
      debugSpy.mockClear();
      evaluateEconomicBoundaryForWallet('0xe2e', 'sovereign', '100000000', {
        reputationAggregate: {
          personality_id: 'e2e',
          collection_id: 'e2e',
          pool_id: 'e2e',
          state: 'authoritative',
          personal_score: 0.9,
          collection_score: 0.5,
          blended_score: 0.85,
          sample_count: 100,
          pseudo_count: 10,
          contributor_count: 10,
          min_sample_count: 10,
          created_at: '2026-01-01T00:00:00Z',
          last_updated: '2026-02-24T00:00:00Z',
          transition_history: [],
          contract_version: '7.11.0',
          task_cohorts: [{
            model_id: 'native',
            personal_score: 0.95,
            sample_count: 50,
            last_updated: '2026-02-24T00:00:00Z',
            task_type: 'analysis',
          }],
        } as DixieReputationAggregate,
        taskType: 'analysis',
        scoringPathTracker: tracker,
      });
      const e3 = JSON.parse(debugSpy.mock.calls[0][1] as string);

      // Verify chain structure
      expect(e1.path).toBe('tier_default');
      expect(e2.path).toBe('aggregate');
      expect(e3.path).toBe('task_cohort');

      // Chain linking
      expect(e1.previous_hash).toBe(SCORING_PATH_GENESIS_HASH);
      expect(e2.previous_hash).toBe(e1.entry_hash);
      expect(e3.previous_hash).toBe(e2.entry_hash);

      // Tracker tip matches last entry
      expect(tracker.tipHash).toBe(e3.entry_hash);

      // Each entry_hash can be independently recomputed
      for (const entry of [e1, e2, e3]) {
        const recomputed = computeScoringPathHash({
          path: entry.path,
          ...(entry.model_id && { model_id: entry.model_id }),
          ...(entry.task_type && { task_type: entry.task_type }),
          ...(entry.reason && { reason: entry.reason }),
          scored_at: entry.scored_at,
        });
        expect(recomputed).toBe(entry.entry_hash);
      }
    });
  });
});
