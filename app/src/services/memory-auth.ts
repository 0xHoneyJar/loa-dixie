import type { AccessPolicy } from '@0xhoneyjar/loa-hounfour';

export type MemoryOperation = 'read' | 'seal' | 'delete' | 'history';

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
}

/**
 * Memory authorization layer.
 *
 * Enforces the access control matrix from SDD §7.3:
 * 1. Owner → full access
 * 2. Delegated wallet → read + history (per owner's delegation list)
 * 3. Previous owner → governed by AccessPolicy (none, read_only, time_limited, role_based)
 * 4. Other → denied
 */
export function authorizeMemoryAccess(params: {
  wallet: string;
  ownerWallet: string;
  delegatedWallets: string[];
  accessPolicy: AccessPolicy;
  operation: MemoryOperation;
  roles?: string[];
}): AuthorizationResult {
  const { wallet, ownerWallet, delegatedWallets, accessPolicy, operation } = params;

  // 1. Owner has full access
  if (wallet.toLowerCase() === ownerWallet.toLowerCase()) {
    return { allowed: true, reason: 'owner' };
  }

  // 2. Delegated wallets can read and view history
  if (delegatedWallets.some(d => d.toLowerCase() === wallet.toLowerCase())) {
    if (operation === 'read' || operation === 'history') {
      return { allowed: true, reason: 'delegated' };
    }
    return { allowed: false, reason: 'delegated_wallets_cannot_modify' };
  }

  // 3. AccessPolicy-governed access (previous owners, etc.)
  return checkAccessPolicy(accessPolicy, operation, params.roles);
}

function checkAccessPolicy(
  policy: AccessPolicy,
  operation: MemoryOperation,
  roles?: string[],
): AuthorizationResult {
  const policyType = (policy as Record<string, unknown>).type as string;

  switch (policyType) {
    case 'none':
      return { allowed: false, reason: 'access_policy_none' };

    case 'read_only':
      if (operation === 'read' || operation === 'history') {
        return { allowed: true, reason: 'access_policy_read_only' };
      }
      return { allowed: false, reason: 'read_only_no_modify' };

    case 'time_limited': {
      const expiresAt = (policy as Record<string, unknown>).expires_at as string | undefined;
      if (expiresAt && new Date(expiresAt) < new Date()) {
        return { allowed: false, reason: 'access_policy_expired' };
      }
      if (operation === 'read' || operation === 'history') {
        return { allowed: true, reason: 'access_policy_time_limited' };
      }
      return { allowed: false, reason: 'time_limited_no_modify' };
    }

    case 'role_based': {
      const requiredRoles = (policy as Record<string, unknown>).roles as string[] | undefined;
      if (!requiredRoles?.length) {
        return { allowed: false, reason: 'role_based_no_roles_defined' };
      }
      if (!roles?.length) {
        return { allowed: false, reason: 'role_based_no_roles_provided' };
      }
      const hasRole = roles.some(r => requiredRoles.includes(r));
      if (!hasRole) {
        return { allowed: false, reason: 'role_based_insufficient_role' };
      }
      if (operation === 'read' || operation === 'history') {
        return { allowed: true, reason: 'access_policy_role_based' };
      }
      return { allowed: false, reason: 'role_based_no_modify' };
    }

    default:
      return { allowed: false, reason: 'unknown_access_policy_type' };
  }
}

/**
 * Validate a ConversationSealingPolicy for cross-field invariants.
 * See: ADR-soul-memory-api.md, SDD §6.1.1 Validation
 */
export function validateSealingPolicy(policy: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!policy.encryption_scheme) {
    errors.push('encryption_scheme is required');
  } else if (policy.encryption_scheme !== 'aes-256-gcm') {
    errors.push('encryption_scheme must be aes-256-gcm');
  }

  if (!policy.key_derivation) {
    errors.push('key_derivation is required');
  } else if (policy.key_derivation !== 'hkdf-sha256') {
    errors.push('key_derivation must be hkdf-sha256');
  }

  const accessPolicy = policy.access_policy as Record<string, unknown> | undefined;
  if (!accessPolicy) {
    errors.push('access_policy is required');
  } else {
    const apType = accessPolicy.type as string;
    if (apType === 'time_limited') {
      const durationHours = accessPolicy.duration_hours as number | undefined;
      if (!durationHours || durationHours <= 0) {
        errors.push('time_limited access_policy requires duration_hours > 0');
      }
    }
    if (apType === 'role_based') {
      const policyRoles = accessPolicy.roles as string[] | undefined;
      if (!policyRoles?.length) {
        errors.push('role_based access_policy requires non-empty roles array');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
