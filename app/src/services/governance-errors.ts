/**
 * Governance Errors — Protocol-canonical error handling for governance operations.
 *
 * Maps hounfour v8.0.0 GovernanceError discriminated union to Dixie's BffError
 * HTTP error class. Provides factory functions for the two most common governance
 * error scenarios in Dixie: access boundary failures and conformance violations.
 *
 * GovernanceError variants and their HTTP mappings:
 * - INVARIANT_VIOLATION → 400 (bad request — conservation law failed)
 * - INVALID_TRANSITION → 409 (conflict — state machine rejected transition)
 * - GUARD_FAILURE → 403 (forbidden — access policy guard failed)
 * - EVALUATION_ERROR → 500 (internal — guard expression evaluation failed)
 * - HASH_DISCONTINUITY → 500 (internal — audit trail integrity compromised)
 * - PARTIAL_APPLICATION → 409 (conflict — optimistic concurrency version mismatch)
 *
 * See: SDD §3.2 (GovernanceError union), PRD FR-6
 * @since cycle-007 — Sprint 74, Task S2-T4
 */
import type { GovernanceError } from '@0xhoneyjar/loa-hounfour/commons';
import { BffError } from '../errors.js';
import type { BffErrorBody } from '../errors.js';

// ---------------------------------------------------------------------------
// HTTP Status Mapping
// ---------------------------------------------------------------------------

/**
 * Maps GovernanceError variant types to HTTP status codes.
 *
 * Design rationale:
 * - INVARIANT_VIOLATION → 400: Client submitted data violating a conservation law
 * - INVALID_TRANSITION → 409: Client attempted a state transition that conflicts
 * - GUARD_FAILURE → 403: Access policy guard explicitly denied the operation
 * - EVALUATION_ERROR → 500: Internal error evaluating a guard expression
 * - HASH_DISCONTINUITY → 500: Internal integrity failure in audit trail
 * - PARTIAL_APPLICATION → 409: Optimistic concurrency conflict (retryable)
 *
 * @since cycle-007 — Sprint 74, Task S2-T4
 */
export const ERROR_STATUS_MAP: Readonly<Record<GovernanceError['type'], number>> = {
  INVARIANT_VIOLATION: 400,
  INVALID_TRANSITION: 409,
  GUARD_FAILURE: 403,
  EVALUATION_ERROR: 500,
  HASH_DISCONTINUITY: 500,
  PARTIAL_APPLICATION: 409,
} as const;

// ---------------------------------------------------------------------------
// GovernanceError → BffError Conversion
// ---------------------------------------------------------------------------

/**
 * Convert a GovernanceError to a BffError with appropriate HTTP status.
 *
 * Preserves all governance error fields in the BffError body for diagnostic
 * purposes. The HTTP status is determined by ERROR_STATUS_MAP based on the
 * error variant type.
 *
 * @param govError - The GovernanceError from a governance operation
 * @returns A BffError ready to be thrown in Hono route handlers
 * @since cycle-007 — Sprint 74, Task S2-T4
 */
export function toBffError(govError: GovernanceError): BffError {
  const status = ERROR_STATUS_MAP[govError.type];

  const body: BffErrorBody = {
    error: govError.error_code,
    message: govError.message,
    // Spread all governance-specific fields for diagnostics
    governance_error_type: govError.type,
    affected_fields: govError.affected_fields,
    timestamp: govError.timestamp,
    retryable: govError.retryable,
  };

  // Add variant-specific fields
  if (govError.audit_entry_id) {
    body.audit_entry_id = govError.audit_entry_id;
  }

  return new BffError(status, body);
}

// ---------------------------------------------------------------------------
// Factory Functions
// ---------------------------------------------------------------------------

/**
 * Create a GUARD_FAILURE GovernanceError for access boundary denials.
 *
 * Used when the economic boundary or access policy denies an operation.
 * The guard_expression field captures the specific condition that failed.
 *
 * @param message - Human-readable denial message
 * @param guardExpression - The guard condition that failed (e.g., "trust_score >= 0.3")
 * @param affectedFields - Fields involved in the denial (e.g., ["trust_score", "reputation_state"])
 * @param retryable - Whether the operation may succeed if retried (default: false)
 * @returns A GUARD_FAILURE GovernanceError
 * @since cycle-007 — Sprint 74, Task S2-T4
 */
export function createAccessBoundaryError(
  message: string,
  guardExpression: string,
  affectedFields: string[],
  retryable = false,
): GovernanceError {
  return {
    type: 'GUARD_FAILURE',
    error_code: 'ACCESS_BOUNDARY_DENIED',
    message,
    guard_expression: guardExpression,
    affected_fields: affectedFields,
    retryable,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an INVARIANT_VIOLATION GovernanceError for conformance failures.
 *
 * Used when a Dixie payload fails hounfour schema validation, indicating
 * a protocol conformance violation.
 *
 * @param message - Human-readable violation message
 * @param invariantId - The invariant that was violated (e.g., "schema:reputationEvent")
 * @param expression - The validation expression that failed
 * @param affectedFields - Fields that failed validation
 * @returns An INVARIANT_VIOLATION GovernanceError
 * @since cycle-007 — Sprint 74, Task S2-T4
 */
export function createConformanceError(
  message: string,
  invariantId: string,
  expression: string,
  affectedFields: string[],
): GovernanceError {
  return {
    type: 'INVARIANT_VIOLATION',
    error_code: 'CONFORMANCE_VIOLATION',
    message,
    invariant_id: invariantId,
    expression,
    affected_fields: affectedFields,
    retryable: false,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an INVALID_TRANSITION GovernanceError for state machine violations.
 *
 * Used when a reputation or resource state transition is rejected by the
 * state machine (e.g., cold → authoritative without intermediate states).
 *
 * @param message - Human-readable transition error message
 * @param fromState - The current state
 * @param toState - The attempted target state
 * @param affectedFields - Fields involved in the transition
 * @returns An INVALID_TRANSITION GovernanceError
 * @since cycle-007 — Sprint 74, Task S2-T4
 */
export function createTransitionError(
  message: string,
  fromState: string,
  toState: string,
  affectedFields: string[],
): GovernanceError {
  return {
    type: 'INVALID_TRANSITION',
    error_code: 'STATE_TRANSITION_REJECTED',
    message,
    from_state: fromState,
    to_state: toState,
    affected_fields: affectedFields,
    retryable: false,
    timestamp: new Date().toISOString(),
  };
}
