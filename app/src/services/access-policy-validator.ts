import { validators } from '@0xhoneyjar/loa-hounfour';
import {
  validateAccessPolicy as hounfourValidateAccessPolicy,
} from '@0xhoneyjar/loa-hounfour/core';
import type { AccessPolicy } from '@0xhoneyjar/loa-hounfour/core';
import { BffError } from '../errors.js';

/**
 * AccessPolicy runtime validator — Hounfour v7.9.2 schema-backed.
 *
 * Runs both TypeBox schema validation (structural) and hounfour's
 * cross-field validator (semantic invariants) in sequence.
 *
 * Note: `Type.Recursive` schemas lose their `$id` at the wrapper level,
 * so `validate()` cannot discover the cross-field validator via registry.
 * We call the cross-field validator explicitly instead.
 *
 * Cross-field invariants enforced:
 * - `time_limited` requires `duration_hours`
 * - `role_based` requires non-empty `roles` array
 * - `reputation_gated` requires `min_reputation_score` or `min_reputation_state`
 * - `compound` requires `operator` and non-empty `policies` array
 *
 * See: SDD §12.2, §13 (Hounfour Level 2)
 */

export interface PolicyValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

/**
 * Validate an AccessPolicy at runtime using hounfour's schema + cross-field validators.
 * Returns all violations (not just the first).
 */
export function validateAccessPolicy(policy: AccessPolicy): PolicyValidationResult {
  // 1. Schema-level validation (TypeBox)
  const compiled = validators.accessPolicy();
  if (!compiled.Check(policy)) {
    const errors = [...compiled.Errors(policy)].map(e => `${e.path}: ${e.message}`);
    return { valid: false, errors };
  }

  // 2. Cross-field invariant validation (hounfour's validateAccessPolicy)
  const crossField = hounfourValidateAccessPolicy(policy);
  if (!crossField.valid) {
    return { valid: false, errors: crossField.errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Assert a valid AccessPolicy — throws BffError(400) if invalid.
 * For use at API boundaries.
 *
 * @throws {BffError} with status 400 and violation details
 * @since Sprint 5 — LOW-3: migrated from plain object to BffError
 */
export function assertValidAccessPolicy(policy: AccessPolicy): void {
  const result = validateAccessPolicy(policy);
  if (!result.valid) {
    throw new BffError(400, {
      error: 'invalid_policy',
      message: result.errors.join('; '),
      violations: result.errors,
    });
  }
}
