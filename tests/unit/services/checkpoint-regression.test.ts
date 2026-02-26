/**
 * Regression test for GitHub issue #43 — auto-checkpoint.
 *
 * Verifies that ScoringPathTracker.record() triggers checkpoint()
 * when entryCount % checkpointInterval === 0. Fixed in cycle-007.
 *
 * @see https://github.com/0xHoneyJar/loa-dixie/issues/43
 * @since cycle-011 — Sprint 82, Task T1.2
 */
import { describe, it, expect } from 'vitest';
import { ScoringPathTracker } from '../../../app/src/services/scoring-path-tracker.js';

function makeScoringEntry() {
  return {
    path: 'reputation' as const,
    model_id: 'gpt-4o',
    task_type: 'code_review',
    reason: 'highest_score',
  };
}

describe('Regression: #43 — auto-checkpoint', () => {
  it('triggers checkpoint when entryCount reaches checkpointInterval', () => {
    const tracker = new ScoringPathTracker({
      checkpointInterval: 5,
      verifyOnInit: false,
      crossVerifyInterval: 0, // disable cross-verify to isolate checkpoint test
    });

    // Record exactly 5 entries (interval = 5)
    for (let i = 0; i < 5; i++) {
      tracker.record(makeScoringEntry());
    }

    // After 5 entries, a checkpoint should have been created
    // checkpoint_hash is set on the auditTrail when checkpoint() fires
    expect(tracker.current.hasCheckpoint).toBe(true);
  });

  it('does NOT trigger checkpoint before reaching interval', () => {
    const tracker = new ScoringPathTracker({
      checkpointInterval: 5,
      verifyOnInit: false,
      crossVerifyInterval: 0,
    });

    // Record 4 entries (one less than interval)
    for (let i = 0; i < 4; i++) {
      tracker.record(makeScoringEntry());
    }

    expect(tracker.current.hasCheckpoint).toBe(false);
  });

  it('checkpoint is set after second interval boundary too', () => {
    const tracker = new ScoringPathTracker({
      checkpointInterval: 3,
      verifyOnInit: false,
      crossVerifyInterval: 0,
    });

    // Record 3 entries — first checkpoint at entry 3
    for (let i = 0; i < 3; i++) {
      tracker.record(makeScoringEntry());
    }
    expect(tracker.current.hasCheckpoint).toBe(true);

    // Record 3 more — second checkpoint at entry 6
    for (let i = 0; i < 3; i++) {
      tracker.record(makeScoringEntry());
    }
    expect(tracker.current.hasCheckpoint).toBe(true);
    expect(tracker.current.entryCount).toBe(6);
  });

  it('does NOT trigger checkpoint when interval is 0 (disabled)', () => {
    const tracker = new ScoringPathTracker({
      checkpointInterval: 0,
      verifyOnInit: false,
      crossVerifyInterval: 0,
    });

    for (let i = 0; i < 10; i++) {
      tracker.record(makeScoringEntry());
    }

    expect(tracker.current.hasCheckpoint).toBe(false);
  });
});
