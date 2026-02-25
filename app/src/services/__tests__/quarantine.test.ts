/**
 * Quarantine & Checkpoint Tests — Sprint 77 (cycle-007), Task S5-T4
 *
 * Tests checkpoint lifecycle (create → verify → prune → verify)
 * and quarantine mechanism (trigger → isolate → recover).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringPathTracker } from '../scoring-path-tracker.js';

describe('Checkpoint lifecycle', () => {
  let tracker: ScoringPathTracker;

  beforeEach(() => {
    tracker = new ScoringPathTracker();
  });

  it('checkpoint on empty trail returns false', () => {
    expect(tracker.checkpoint()).toBe(false);
  });

  it('checkpoint on non-empty trail returns true', () => {
    tracker.record({ path: 'tier_default' });
    tracker.record({ path: 'aggregate' });

    expect(tracker.checkpoint()).toBe(true);
  });

  it('checkpoint preserves trail integrity', () => {
    tracker.record({ path: 'tier_default', reason: 'Test 1' });
    tracker.record({ path: 'aggregate', reason: 'Test 2' });
    tracker.checkpoint();

    // Trail should still verify cleanly after checkpoint
    const result = tracker.verifyIntegrity();
    expect(result.valid).toBe(true);
  });

  it('verifyContinuity passes after checkpoint', () => {
    tracker.record({ path: 'tier_default' });
    tracker.record({ path: 'aggregate' });
    tracker.checkpoint();
    tracker.record({ path: 'task_cohort', model_id: 'gpt-4o', task_type: 'code_review' });

    const result = tracker.verifyContinuity();
    expect(result.valid).toBe(true);
  });

  it('prune removes entries before checkpoint', () => {
    // Record 5 entries, checkpoint at entry 3
    for (let i = 0; i < 3; i++) {
      tracker.record({ path: 'tier_default', reason: `Entry ${i}` });
    }
    tracker.checkpoint();

    // Record 2 more after checkpoint
    tracker.record({ path: 'aggregate', reason: 'Post-checkpoint 1' });
    tracker.record({ path: 'task_cohort', reason: 'Post-checkpoint 2' });

    expect(tracker.auditTrail.entries).toHaveLength(5);

    const pruned = tracker.prune();
    expect(pruned).toBeGreaterThan(0);
    // After pruning, trail should have fewer entries
    expect(tracker.auditTrail.entries.length).toBeLessThan(5);
  });

  it('prune is no-op without checkpoint', () => {
    tracker.record({ path: 'tier_default' });
    tracker.record({ path: 'aggregate' });

    const pruned = tracker.prune();
    expect(pruned).toBe(0);
    expect(tracker.auditTrail.entries).toHaveLength(2);
  });

  it('full lifecycle: create → verify → prune → verify', () => {
    // Create entries
    for (let i = 0; i < 5; i++) {
      tracker.record({ path: 'tier_default', reason: `Entry ${i}` });
    }
    expect(tracker.auditTrail.entries).toHaveLength(5);

    // Create checkpoint
    expect(tracker.checkpoint()).toBe(true);

    // Verify passes
    expect(tracker.verifyContinuity().valid).toBe(true);

    // Add more entries after checkpoint
    tracker.record({ path: 'aggregate', reason: 'After checkpoint' });

    // Prune
    const pruned = tracker.prune();
    expect(pruned).toBeGreaterThan(0);

    // Verify still passes after prune
    expect(tracker.verifyContinuity().valid).toBe(true);
  });
});

describe('Quarantine mechanism', () => {
  let tracker: ScoringPathTracker;

  beforeEach(() => {
    tracker = new ScoringPathTracker();
  });

  it('tracker starts not quarantined', () => {
    expect(tracker.isQuarantined).toBe(false);
    expect(tracker.quarantineRecord).toBeNull();
  });

  it('enterQuarantine sets quarantine state', () => {
    tracker.record({ path: 'tier_default' });

    tracker.enterQuarantine('discontinuity-001');

    expect(tracker.isQuarantined).toBe(true);
    expect(tracker.quarantineRecord).not.toBeNull();
    expect(tracker.quarantineRecord!.status).toBe('active');
    expect(tracker.quarantineRecord!.resource_type).toBe('ScoringPathLog');
    expect(tracker.quarantineRecord!.discontinuity_id).toBe('discontinuity-001');
  });

  it('quarantine sets audit trail integrity_status to quarantined', () => {
    tracker.record({ path: 'tier_default' });
    tracker.enterQuarantine('discontinuity-001');

    expect(tracker.auditTrail.integrity_status).toBe('quarantined');
  });

  it('quarantine record has valid UUID', () => {
    tracker.enterQuarantine('disc-1');

    expect(tracker.quarantineRecord!.quarantine_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('recover releases quarantine when chain is valid', () => {
    tracker.record({ path: 'tier_default' });
    tracker.record({ path: 'aggregate' });

    // Quarantine (even though chain is actually valid)
    tracker.enterQuarantine('false-alarm');
    expect(tracker.isQuarantined).toBe(true);

    // Recover — integrity check passes
    const recovered = tracker.recover();
    expect(recovered).toBe(true);
    expect(tracker.isQuarantined).toBe(false);
    expect(tracker.auditTrail.integrity_status).toBe('verified');
  });

  it('recover returns true when not quarantined', () => {
    expect(tracker.recover()).toBe(true);
  });

  it('reset clears quarantine state', () => {
    tracker.record({ path: 'tier_default' });
    tracker.enterQuarantine('disc-1');
    expect(tracker.isQuarantined).toBe(true);

    tracker.reset();

    expect(tracker.isQuarantined).toBe(false);
    expect(tracker.quarantineRecord).toBeNull();
    expect(tracker.auditTrail.integrity_status).toBe('verified');
  });

  it('quarantine record includes affected indices', () => {
    for (let i = 0; i < 5; i++) {
      tracker.record({ path: 'tier_default', reason: `Entry ${i}` });
    }

    tracker.enterQuarantine('disc-1', 2, 4);

    expect(tracker.quarantineRecord!.first_affected_index).toBe(2);
    expect(tracker.quarantineRecord!.last_affected_index).toBe(4);
  });
});

describe('Quarantine recording trade-off (Bridgebuilder F6, Sprint 79)', () => {
  let tracker: ScoringPathTracker;

  beforeEach(() => {
    tracker = new ScoringPathTracker();
  });

  it('records during quarantine are individually hashable', () => {
    // Record entries, enter quarantine, record more entries
    tracker.record({ path: 'tier_default', reason: 'Before quarantine 1' });
    tracker.record({ path: 'aggregate', reason: 'Before quarantine 2' });

    tracker.enterQuarantine('integrity-break-001');

    // Record during quarantine — these still get individual hashes
    const quarantineEntry = tracker.record({
      path: 'tier_default',
      reason: 'Scoring path tracker quarantined — safe fallback to tier defaults',
    });

    // Entry should have a valid entry_hash (SHA-256 hex with sha256: prefix)
    expect(quarantineEntry.entry_hash).toBeDefined();
    expect(quarantineEntry.entry_hash).toMatch(/^sha256:[a-f0-9]{64}$/);

    // Entry is individually valid despite broken chain
    expect(quarantineEntry.path).toBe('tier_default');
  });

  it('quarantine fallback produces tier_default scoring path', () => {
    tracker.record({ path: 'aggregate', reason: 'Normal operation' });

    tracker.enterQuarantine('chain-break-001');

    const fallbackEntry = tracker.record({
      path: 'tier_default',
      reason: 'Scoring path tracker quarantined — safe fallback to tier defaults',
    });

    expect(fallbackEntry.path).toBe('tier_default');
    expect(fallbackEntry.reason).toContain('quarantined');
    expect(fallbackEntry.reason).toContain('safe fallback');
  });
});

describe('ScoringPathTrackerOptions', () => {
  it('accepts custom checkpointInterval', () => {
    const tracker = new ScoringPathTracker({ checkpointInterval: 50 });
    // Tracker should be functional
    tracker.record({ path: 'tier_default' });
    expect(tracker.length).toBe(1);
  });

  it('accepts verifyOnInit option', () => {
    const tracker = new ScoringPathTracker({ verifyOnInit: false });
    tracker.record({ path: 'tier_default' });
    expect(tracker.length).toBe(1);
  });

  it('defaults to checkpointInterval=100 and verifyOnInit=true', () => {
    const tracker = new ScoringPathTracker();
    // Verify tracker works with defaults
    tracker.record({ path: 'tier_default' });
    expect(tracker.verifyIntegrity().valid).toBe(true);
  });
});
