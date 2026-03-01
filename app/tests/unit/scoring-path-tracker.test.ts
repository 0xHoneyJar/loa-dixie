/**
 * ScoringPathTracker tests — hash chain audit trail.
 * @since cycle-005 — Sprint 61 (Task 2.1)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringPathTracker } from '../../src/services/scoring-path-tracker.js';
import {
  SCORING_PATH_GENESIS_HASH,
  computeScoringPathHash,
} from '@0xhoneyjar/loa-hounfour/governance';

describe('ScoringPathTracker', () => {
  let tracker: ScoringPathTracker;

  beforeEach(() => {
    tracker = new ScoringPathTracker();
  });

  it('first entry links to genesis hash', () => {
    const entry = tracker.record({ path: 'tier_default', reason: 'Cold start' });

    expect(entry.previous_hash).toBe(SCORING_PATH_GENESIS_HASH);
    expect(entry.entry_hash).toBeDefined();
    expect(entry.entry_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(entry.scored_at).toBeDefined();
    expect(entry.path).toBe('tier_default');
    expect(entry.reason).toBe('Cold start');
  });

  it('chains correctly across 3 consecutive entries', () => {
    const e1 = tracker.record({ path: 'tier_default', reason: 'No aggregate' });
    const e2 = tracker.record({ path: 'aggregate', reason: 'Aggregate found' });
    const e3 = tracker.record({
      path: 'task_cohort',
      model_id: 'gpt-4o',
      task_type: 'code_review',
      reason: 'Task cohort matched',
    });

    // Chain linking
    expect(e1.previous_hash).toBe(SCORING_PATH_GENESIS_HASH);
    expect(e2.previous_hash).toBe(e1.entry_hash);
    expect(e3.previous_hash).toBe(e2.entry_hash);

    // All hashes are distinct
    const hashes = [e1.entry_hash, e2.entry_hash, e3.entry_hash];
    expect(new Set(hashes).size).toBe(3);

    // tipHash matches last entry
    expect(tracker.tipHash).toBe(e3.entry_hash);
  });

  it('produces deterministic hashes for same content fields', () => {
    // Two separate trackers with identical inputs at same timestamp
    // Note: scored_at includes milliseconds, so we mock Date to ensure same timestamp
    const originalNow = Date.now;
    const fixedTime = new Date('2026-02-24T12:00:00.000Z');
    Date.now = () => fixedTime.getTime();
    // Also mock Date constructor for toISOString
    const OriginalDate = globalThis.Date;
    globalThis.Date = class extends OriginalDate {
      constructor(...args: ConstructorParameters<typeof OriginalDate>) {
        if (args.length === 0) {
          super(fixedTime.getTime());
        } else {
          // @ts-expect-error -- spread into overloaded constructor
          super(...args);
        }
      }
    } as DateConstructor;

    try {
      const t1 = new ScoringPathTracker();
      const t2 = new ScoringPathTracker();

      const e1 = t1.record({ path: 'tier_default', reason: 'Test' });
      const e2 = t2.record({ path: 'tier_default', reason: 'Test' });

      expect(e1.entry_hash).toBe(e2.entry_hash);
      expect(e1.scored_at).toBe(e2.scored_at);
    } finally {
      Date.now = originalNow;
      globalThis.Date = OriginalDate;
    }
  });

  it('reset returns to genesis', () => {
    tracker.record({ path: 'tier_default' });
    tracker.record({ path: 'aggregate' });

    expect(tracker.tipHash).not.toBe(SCORING_PATH_GENESIS_HASH);

    tracker.reset();
    expect(tracker.tipHash).toBe(SCORING_PATH_GENESIS_HASH);

    // Next entry after reset links to genesis
    const entry = tracker.record({ path: 'tier_default' });
    expect(entry.previous_hash).toBe(SCORING_PATH_GENESIS_HASH);
  });

  it('entry_hash can be independently recomputed from content fields', () => {
    const entry = tracker.record({
      path: 'task_cohort',
      model_id: 'native',
      task_type: 'analysis',
      reason: 'Task-specific cohort found',
    });

    // Recompute hash from content fields only
    const recomputed = computeScoringPathHash({
      path: entry.path,
      model_id: entry.model_id,
      task_type: entry.task_type,
      reason: entry.reason,
      scored_at: entry.scored_at,
    });

    expect(recomputed).toBe(entry.entry_hash);
  });

  it('optional fields are only included when defined', () => {
    const minimal = tracker.record({ path: 'tier_default' });

    expect(minimal.model_id).toBeUndefined();
    expect(minimal.task_type).toBeUndefined();
    expect(minimal.reason).toBeUndefined();
    expect(minimal.path).toBe('tier_default');
    expect(minimal.entry_hash).toBeDefined();
    expect(minimal.previous_hash).toBeDefined();
    expect(minimal.scored_at).toBeDefined();
  });

  it('length tracks entry count and resets correctly', () => {
    expect(tracker.length).toBe(0);

    tracker.record({ path: 'tier_default' });
    expect(tracker.length).toBe(1);

    tracker.record({ path: 'aggregate' });
    tracker.record({ path: 'task_cohort', model_id: 'gpt-4o', task_type: 'code_review' });
    expect(tracker.length).toBe(3);

    tracker.reset();
    expect(tracker.length).toBe(0);

    tracker.record({ path: 'tier_default' });
    expect(tracker.length).toBe(1);
  });

  it('stores reputation_freshness metadata without affecting hash', () => {
    const freshness = { sample_count: 500, newest_event_at: '2026-02-24T10:00:00Z' };
    const entryWithMeta = tracker.record(
      { path: 'aggregate', reason: 'With freshness' },
      { reputation_freshness: freshness },
    );

    // Metadata is accessible via lastRecordOptions
    expect(tracker.lastRecordOptions).toEqual({ reputation_freshness: freshness });
    expect(tracker.lastRecordOptions?.reputation_freshness?.sample_count).toBe(500);

    // Hash is NOT affected by metadata — compare with a tracker without metadata
    tracker.reset();
    const originalNow = Date.now;
    const OriginalDate = globalThis.Date;
    const fixedTime = new Date('2026-02-24T12:00:00.000Z');
    globalThis.Date = class extends OriginalDate {
      constructor(...args: ConstructorParameters<typeof OriginalDate>) {
        if (args.length === 0) { super(fixedTime.getTime()); } else {
          // @ts-expect-error -- spread into overloaded constructor
          super(...args);
        }
      }
    } as DateConstructor;
    Date.now = () => fixedTime.getTime();
    try {
      const t1 = new ScoringPathTracker();
      const t2 = new ScoringPathTracker();
      const withMeta = t1.record({ path: 'tier_default' }, { reputation_freshness: freshness });
      const withoutMeta = t2.record({ path: 'tier_default' });
      expect(withMeta.entry_hash).toBe(withoutMeta.entry_hash);
    } finally {
      Date.now = originalNow;
      globalThis.Date = OriginalDate;
    }

    // Reset clears metadata
    tracker.reset();
    expect(tracker.lastRecordOptions).toBeUndefined();
  });

  it('stores routed_model_id in options without affecting hash', () => {
    const entry = tracker.record(
      { path: 'task_cohort', model_id: 'gpt-4o', task_type: 'code_review', reason: 'cohort' },
      { routed_model_id: 'qwen3-coder-next' },
    );

    // routed_model_id is accessible via lastRecordOptions
    expect(tracker.lastRecordOptions?.routed_model_id).toBe('qwen3-coder-next');

    // Entry itself is a clean ScoringPathLog (no routed_model_id in return)
    expect(entry.model_id).toBe('gpt-4o');
    expect(entry.path).toBe('task_cohort');
    expect(entry.entry_hash).toBeDefined();
  });

  it('record without options leaves lastRecordOptions undefined', () => {
    tracker.record({ path: 'tier_default' });
    expect(tracker.lastRecordOptions).toBeUndefined();
  });

  it('hash pair constraint: both entry_hash and previous_hash always present', () => {
    const e1 = tracker.record({ path: 'tier_default' });
    const e2 = tracker.record({ path: 'aggregate', model_id: 'gpt-4o' });

    for (const entry of [e1, e2]) {
      expect(entry.entry_hash).toBeDefined();
      expect(entry.previous_hash).toBeDefined();
      expect(typeof entry.entry_hash).toBe('string');
      expect(typeof entry.previous_hash).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// AuditTrail Composition Tests — cycle-007 Sprint 75 Task S3-T7
// ---------------------------------------------------------------------------

describe('ScoringPathTracker — AuditTrail composition', () => {
  let tracker: ScoringPathTracker;

  beforeEach(() => {
    tracker = new ScoringPathTracker();
  });

  it('auditTrail is initialized with empty entries and genesis hash', () => {
    const trail = tracker.auditTrail;

    expect(trail.entries).toHaveLength(0);
    expect(trail.hash_algorithm).toBe('sha256');
    expect(trail.genesis_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(trail.integrity_status).toBe('verified');
  });

  it('record() mirrors entries to audit trail', () => {
    tracker.record({ path: 'tier_default', reason: 'Cold start' });
    tracker.record({ path: 'aggregate', reason: 'Score found' });
    tracker.record({
      path: 'task_cohort',
      model_id: 'gpt-4o',
      task_type: 'code_review',
      reason: 'Match',
    });

    const trail = tracker.auditTrail;
    expect(trail.entries).toHaveLength(3);

    // Event types match scoring path
    expect(trail.entries[0].event_type).toBe('scoring_path:tier_default');
    expect(trail.entries[1].event_type).toBe('scoring_path:aggregate');
    expect(trail.entries[2].event_type).toBe('scoring_path:task_cohort');
  });

  it('audit trail entries have correct structure', () => {
    tracker.record({ path: 'aggregate', model_id: 'native', reason: 'Test' });

    const entry = tracker.auditTrail.entries[0];

    expect(entry.entry_id).toBe('scoring-path-1');
    expect(entry.timestamp).toBeDefined();
    expect(entry.event_type).toBe('scoring_path:aggregate');
    expect(entry.payload).toBeDefined();
    expect(entry.entry_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(entry.previous_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(entry.hash_domain_tag).toContain('scoringpathlog');
    expect(entry.hash_domain_tag).toContain('8-2-0');
  });

  it('audit trail entries chain correctly', () => {
    tracker.record({ path: 'tier_default' });
    tracker.record({ path: 'aggregate' });

    const entries = tracker.auditTrail.entries;
    // First entry links to genesis
    expect(entries[0].previous_hash).toBe(tracker.auditTrail.genesis_hash);
    // Second entry links to first
    expect(entries[1].previous_hash).toBe(entries[0].entry_hash);
  });

  it('verifyIntegrity() returns valid for clean chain', () => {
    tracker.record({ path: 'tier_default', reason: 'Test 1' });
    tracker.record({ path: 'aggregate', reason: 'Test 2' });
    tracker.record({ path: 'task_cohort', model_id: 'gpt-4o', task_type: 'code_review' });

    const result = tracker.verifyIntegrity();
    expect(result.valid).toBe(true);
  });

  it('verifyIntegrity() returns valid for empty trail', () => {
    const result = tracker.verifyIntegrity();
    expect(result.valid).toBe(true);
  });

  it('reset clears audit trail', () => {
    tracker.record({ path: 'tier_default' });
    tracker.record({ path: 'aggregate' });
    expect(tracker.auditTrail.entries).toHaveLength(2);

    tracker.reset();

    expect(tracker.auditTrail.entries).toHaveLength(0);
    expect(tracker.auditTrail.integrity_status).toBe('verified');
  });

  it('audit trail entries match scoring path entry count', () => {
    for (let i = 0; i < 5; i++) {
      tracker.record({ path: 'tier_default', reason: `Entry ${i}` });
    }

    expect(tracker.length).toBe(5);
    expect(tracker.auditTrail.entries).toHaveLength(5);
  });

  it('domain tag format matches sanitized scoringpathlog:8-2-0 (v8.3.1)', () => {
    tracker.record({ path: 'tier_default' });

    const entry = tracker.auditTrail.entries[0];
    // Domain tag built by buildDomainTag('ScoringPathLog', '8.2.0')
    // v8.3.1 sanitizes: lowercase + dots→hyphens
    expect(entry.hash_domain_tag).toContain('scoringpathlog');
    expect(entry.hash_domain_tag).toContain('8-2-0');
  });
});
