import type { AccessPolicy } from '../types.js';

/**
 * AccessPolicy runtime validator — Hounfour Level 2 cross-field invariants.
 *
 * Enforces invariants at API boundaries (not just test-time):
 * - time_limited requires duration_hours > 0
 * - role_based requires non-empty roles array
 * - All policies must have audit_required as boolean
 *
 * See: SDD §12.2, §13 (Hounfour Level 2)
 */

export interface PolicyValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

/**
 * Validate an AccessPolicy at runtime.
 * Returns all violations (not just the first).
 */
export function validateAccessPolicy(policy: AccessPolicy): PolicyValidationResult {
  const errors: string[] = [];

  if (!policy.type) {
    errors.push('AccessPolicy requires a type field');
  }

  if (typeof policy.audit_required !== 'boolean') {
    errors.push('AccessPolicy.audit_required must be a boolean');
  }

  // Cross-field invariants per policy type
  switch (policy.type) {
    case 'time_limited': {
      const p = policy as AccessPolicy & { duration_hours?: number };
      if (!p.duration_hours || p.duration_hours <= 0) {
        errors.push('time_limited policy requires duration_hours > 0');
      }
      break;
    }

    case 'role_based': {
      if (!policy.roles || !Array.isArray(policy.roles) || policy.roles.length === 0) {
        errors.push('role_based policy requires non-empty roles array');
      }
      break;
    }

    case 'owner_only':
    case 'public':
      // No additional invariants
      break;

    default:
      errors.push(`Unknown AccessPolicy type: ${policy.type}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
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
