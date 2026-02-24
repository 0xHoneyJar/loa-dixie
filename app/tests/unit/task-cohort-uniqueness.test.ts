/**
 * validateTaskCohortUniqueness integration tests
 * @since cycle-005 — Sprint 61 (Task 2.6)
 */
import { describe, it, expect } from 'vitest';
import { validateTaskCohortUniqueness } from '../../src/types/reputation-evolution.js';

describe('validateTaskCohortUniqueness (via re-export barrel)', () => {
  it('returns empty array for empty cohorts', () => {
    const duplicates = validateTaskCohortUniqueness([]);
    expect(duplicates).toEqual([]);
  });

  it('returns empty array for unique cohorts (different model_id or task_type)', () => {
    const duplicates = validateTaskCohortUniqueness([
      { model_id: 'gpt-4o', task_type: 'code_review' },
      { model_id: 'gpt-4o', task_type: 'analysis' },
      { model_id: 'native', task_type: 'code_review' },
      { model_id: 'native', task_type: 'general' },
    ]);
    expect(duplicates).toEqual([]);
  });

  it('returns duplicate keys for duplicate (model_id, task_type) pairs', () => {
    const duplicates = validateTaskCohortUniqueness([
      { model_id: 'gpt-4o', task_type: 'code_review' },
      { model_id: 'native', task_type: 'analysis' },
      { model_id: 'gpt-4o', task_type: 'code_review' }, // duplicate
    ]);
    expect(duplicates).toEqual(['gpt-4o:code_review']);
  });

  it('function is accessible via re-export from reputation-evolution.ts', () => {
    expect(typeof validateTaskCohortUniqueness).toBe('function');
  });
});
