/**
 * Governance Errors Unit Tests — Sprint 74 (cycle-007), Task S2-T6
 *
 * Tests GovernanceError → BffError mapping, HTTP status preservation,
 * and factory function output validation.
 */
import { describe, it, expect } from 'vitest';
import type { GovernanceError } from '@0xhoneyjar/loa-hounfour/commons';
import {
  toBffError,
  createAccessBoundaryError,
  createConformanceError,
  createTransitionError,
  ERROR_STATUS_MAP,
} from '../governance-errors.js';
import { BffError } from '../../errors.js';

// ---------------------------------------------------------------------------
// All 6 GovernanceError → BffError mappings
// ---------------------------------------------------------------------------

describe('toBffError', () => {
  it('INVARIANT_VIOLATION → 400', () => {
    const govError: GovernanceError = {
      type: 'INVARIANT_VIOLATION',
      error_code: 'BUDGET_BALANCE',
      message: 'Budget balance conservation violated',
      invariant_id: 'I-1',
      expression: 'committed + reserved + available == limit',
      affected_fields: ['committed', 'available'],
      retryable: false,
      timestamp: '2026-02-25T10:00:00Z',
    };

    const bffError = toBffError(govError);

    expect(bffError).toBeInstanceOf(BffError);
    expect(bffError.status).toBe(400);
    expect(bffError.body.error).toBe('BUDGET_BALANCE');
    expect(bffError.body.message).toBe('Budget balance conservation violated');
    expect(bffError.body.governance_error_type).toBe('INVARIANT_VIOLATION');
    expect(bffError.body.affected_fields).toEqual(['committed', 'available']);
    expect(bffError.body.retryable).toBe(false);
  });

  it('INVALID_TRANSITION → 409', () => {
    const govError: GovernanceError = {
      type: 'INVALID_TRANSITION',
      error_code: 'REPUTATION_TRANSITION',
      message: 'Cannot transition from cold to authoritative',
      from_state: 'cold',
      to_state: 'authoritative',
      affected_fields: ['state'],
      retryable: false,
      timestamp: '2026-02-25T10:00:00Z',
    };

    const bffError = toBffError(govError);

    expect(bffError.status).toBe(409);
    expect(bffError.body.error).toBe('REPUTATION_TRANSITION');
  });

  it('GUARD_FAILURE → 403', () => {
    const govError: GovernanceError = {
      type: 'GUARD_FAILURE',
      error_code: 'ACCESS_DENIED',
      message: 'Trust score below threshold',
      guard_expression: 'trust_score >= 0.3',
      affected_fields: ['trust_score'],
      retryable: false,
      timestamp: '2026-02-25T10:00:00Z',
    };

    const bffError = toBffError(govError);

    expect(bffError.status).toBe(403);
    expect(bffError.body.error).toBe('ACCESS_DENIED');
  });

  it('EVALUATION_ERROR → 500', () => {
    const govError: GovernanceError = {
      type: 'EVALUATION_ERROR',
      error_code: 'GUARD_EVAL_FAILURE',
      message: 'Guard expression evaluation failed',
      expression: 'trust_score >= min_threshold',
      eval_error: 'min_threshold is undefined',
      affected_fields: ['trust_score'],
      retryable: false,
      timestamp: '2026-02-25T10:00:00Z',
    };

    const bffError = toBffError(govError);

    expect(bffError.status).toBe(500);
  });

  it('HASH_DISCONTINUITY → 500', () => {
    const govError: GovernanceError = {
      type: 'HASH_DISCONTINUITY',
      error_code: 'AUDIT_TRAIL_INTEGRITY',
      message: 'Hash chain discontinuity detected',
      entry_index: 42,
      expected_hash: 'sha256:abc123',
      actual_hash: 'sha256:def456',
      affected_fields: ['entry_hash'],
      retryable: false,
      timestamp: '2026-02-25T10:00:00Z',
    };

    const bffError = toBffError(govError);

    expect(bffError.status).toBe(500);
  });

  it('PARTIAL_APPLICATION → 409 (retryable)', () => {
    const govError: GovernanceError = {
      type: 'PARTIAL_APPLICATION',
      error_code: 'VERSION_CONFLICT',
      message: 'Optimistic concurrency conflict',
      expected_version: 5,
      actual_version: 6,
      affected_fields: ['version'],
      retryable: true,
      timestamp: '2026-02-25T10:00:00Z',
    };

    const bffError = toBffError(govError);

    expect(bffError.status).toBe(409);
    expect(bffError.body.retryable).toBe(true);
  });

  it('preserves audit_entry_id when present', () => {
    const govError: GovernanceError = {
      type: 'GUARD_FAILURE',
      error_code: 'ACCESS_DENIED',
      message: 'Denied',
      guard_expression: 'tier >= builder',
      affected_fields: ['tier'],
      retryable: false,
      timestamp: '2026-02-25T10:00:00Z',
      audit_entry_id: 'audit-entry-123',
    };

    const bffError = toBffError(govError);

    expect(bffError.body.audit_entry_id).toBe('audit-entry-123');
  });
});

// ---------------------------------------------------------------------------
// ERROR_STATUS_MAP completeness
// ---------------------------------------------------------------------------

describe('ERROR_STATUS_MAP', () => {
  it('covers all 6 GovernanceError variants', () => {
    const expectedTypes: GovernanceError['type'][] = [
      'INVARIANT_VIOLATION',
      'INVALID_TRANSITION',
      'GUARD_FAILURE',
      'EVALUATION_ERROR',
      'HASH_DISCONTINUITY',
      'PARTIAL_APPLICATION',
    ];

    for (const type of expectedTypes) {
      expect(ERROR_STATUS_MAP[type]).toBeDefined();
      expect(typeof ERROR_STATUS_MAP[type]).toBe('number');
    }
  });
});

// ---------------------------------------------------------------------------
// Factory Functions
// ---------------------------------------------------------------------------

describe('createAccessBoundaryError', () => {
  it('produces a GUARD_FAILURE GovernanceError', () => {
    const error = createAccessBoundaryError(
      'Trust score below threshold',
      'trust_score >= 0.3',
      ['trust_score', 'reputation_state'],
    );

    expect(error.type).toBe('GUARD_FAILURE');
    expect(error.error_code).toBe('ACCESS_BOUNDARY_DENIED');
    expect(error.message).toBe('Trust score below threshold');
    expect(error.affected_fields).toEqual(['trust_score', 'reputation_state']);
    expect(error.retryable).toBe(false);
    expect(error.timestamp).toBeDefined();
  });

  it('supports retryable access boundary errors', () => {
    const error = createAccessBoundaryError(
      'Rate limited',
      'request_count < max_requests',
      ['request_count'],
      true,
    );

    expect(error.retryable).toBe(true);
  });
});

describe('createConformanceError', () => {
  it('produces an INVARIANT_VIOLATION GovernanceError', () => {
    const error = createConformanceError(
      'ReputationEvent schema validation failed',
      'schema:reputationEvent',
      'event.type must be one of: quality_signal, task_completed, credential_update, model_performance',
      ['type'],
    );

    expect(error.type).toBe('INVARIANT_VIOLATION');
    expect(error.error_code).toBe('CONFORMANCE_VIOLATION');
    expect(error.retryable).toBe(false);
  });
});

describe('createTransitionError', () => {
  it('produces an INVALID_TRANSITION GovernanceError', () => {
    const error = createTransitionError(
      'Cannot transition from cold to authoritative',
      'cold',
      'authoritative',
      ['state'],
    );

    expect(error.type).toBe('INVALID_TRANSITION');
    expect(error.error_code).toBe('STATE_TRANSITION_REJECTED');
    expect(error.retryable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: Factory → toBffError → HTTP response
// ---------------------------------------------------------------------------

describe('Factory → toBffError chain', () => {
  it('createAccessBoundaryError → toBffError produces 403', () => {
    const govError = createAccessBoundaryError(
      'Insufficient conviction',
      'tier >= builder',
      ['tier'],
    );
    const bffError = toBffError(govError);

    expect(bffError.status).toBe(403);
    expect(bffError.body.error).toBe('ACCESS_BOUNDARY_DENIED');
  });

  it('createConformanceError → toBffError produces 400', () => {
    const govError = createConformanceError(
      'Invalid payload',
      'schema:taskType',
      'must be string',
      ['task_type'],
    );
    const bffError = toBffError(govError);

    expect(bffError.status).toBe(400);
    expect(bffError.body.error).toBe('CONFORMANCE_VIOLATION');
  });
});
