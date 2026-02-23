import { validators } from '@0xhoneyjar/loa-hounfour';
import type { AccessPolicy } from '@0xhoneyjar/loa-hounfour/core';

/**
 * AccessPolicy runtime validator — Hounfour v7.9.2 schema-backed.
 *
 * Replaces hand-rolled validation with hounfour's compiled TypeBox validators.
 * Schema validation catches structural issues; cross-field invariants are
 * enforced by hounfour's registered cross-field validators.
 *
 * See: SDD §12.2, §13 (Hounfour Level 2)
 */

export interface PolicyValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

/**
 * Validate an AccessPolicy at runtime using hounfour's compiled schema.
 * Returns all violations (not just the first).
 */
export function validateAccessPolicy(policy: AccessPolicy): PolicyValidationResult {
  const compiled = validators.accessPolicy();
  const schemaResult = compiled.Check(policy);
  if (!schemaResult) {
    const errors = [...compiled.Errors(policy)].map(e => `${e.path}: ${e.message}`);
    return { valid: false, errors };
  }
  return { valid: true, errors: [] };
}

/**
 * Assert a valid AccessPolicy — throws 400 if invalid.
 * For use at API boundaries.
 */
export function assertValidAccessPolicy(policy: AccessPolicy): void {
  const result = validateAccessPolicy(policy);
  if (!result.valid) {
    throw {
      status: 400,
      body: {
        error: 'invalid_policy',
        message: result.errors.join('; '),
        violations: result.errors,
      },
    };
  }
}
