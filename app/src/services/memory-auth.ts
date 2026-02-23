import type { AccessPolicy } from '@0xhoneyjar/loa-hounfour/core';
import { validators } from '@0xhoneyjar/loa-hounfour';
import { checksumAddress } from '@0xhoneyjar/loa-hounfour/economy';

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

  // 1. Owner has full access (EIP-55 checksummed comparison via hounfour)
  if (checksumAddress(wallet) === checksumAddress(ownerWallet)) {
    return { allowed: true, reason: 'owner' };
  }

  // 2. Delegated wallets can read and view history
  const normalizedWallet = checksumAddress(wallet);
  if (delegatedWallets.some(d => checksumAddress(d) === normalizedWallet)) {
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
 * Validate a ConversationSealingPolicy using hounfour's compiled schema.
 * See: ADR-soul-memory-api.md, SDD §6.1.1 Validation
 */
export function validateSealingPolicy(policy: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const compiled = validators.conversationSealingPolicy();
  const schemaResult = compiled.Check(policy);
  if (!schemaResult) {
    const errors = [...compiled.Errors(policy)].map(e => `${e.path}: ${e.message}`);
    return { valid: false, errors };
  }
  return { valid: true, errors: [] };
}
