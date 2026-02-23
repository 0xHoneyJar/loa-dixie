import type { AccessPolicy } from '@0xhoneyjar/loa-hounfour/core';
import { ConversationSealingPolicySchema } from '@0xhoneyjar/loa-hounfour/core';
import { evaluateAccessPolicy, validate } from '@0xhoneyjar/loa-hounfour';
import { checksumAddress } from '@0xhoneyjar/loa-hounfour/economy';

export type MemoryOperation = 'read' | 'seal' | 'delete' | 'history';

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
}

/** Map MemoryOperation to hounfour's action type. */
function toAction(op: MemoryOperation): 'read' | 'write' | 'delete' {
  switch (op) {
    case 'read':
    case 'history':
      return 'read';
    case 'seal':
      return 'write';
    case 'delete':
      return 'delete';
  }
}

/**
 * Metric counter for translateReason fallback hits.
 *
 * Tracks how often the substring-matching translation falls through to the
 * catch-all 'unknown_access_policy_type'. Useful for alerting when a
 * hounfour upgrade changes reason string wording.
 *
 * @since Sprint 5 — MEDIUM-1 partial (observability)
 */
let translateReasonFallbackCount = 0;

/** Get the current fallback counter value (for testing/metrics). */
export function getTranslateReasonFallbackCount(): number {
  return translateReasonFallbackCount;
}

/** Reset the fallback counter (for testing). */
export function resetTranslateReasonFallbackCount(): void {
  translateReasonFallbackCount = 0;
}

/**
 * Translate hounfour's AccessPolicyResult reason into Dixie's legacy reason codes.
 *
 * This preserves backward-compatible reason strings that tests and consumers
 * depend on, while delegating the access decision to hounfour.
 *
 * When the substring-matching logic falls through (no recognized pattern),
 * a structured warning is emitted to stdout for observability, and the
 * fallback counter increments. This aids detection of hounfour upgrades
 * that change reason string wording.
 *
 * @since Sprint 5 — MEDIUM-1 partial: added fallback logging and metrics
 */
function translateReason(
  hounfourReason: string,
  allowed: boolean,
  policyType: string,
  operation: MemoryOperation,
): string {
  if (!allowed) {
    if (policyType === 'none') return 'access_policy_none';
    if (hounfourReason.includes('not permitted under read_only')) return 'read_only_no_modify';
    if (hounfourReason.includes('not permitted under time_limited')) return 'time_limited_no_modify';
    if (hounfourReason.includes('expired')) return 'access_policy_expired';
    if (hounfourReason.includes('No role provided')) return 'role_based_no_roles_provided';
    if (hounfourReason.includes('not in permitted roles')) return 'role_based_insufficient_role';

    // Fallback path — no substring matched. Log for observability.
    translateReasonFallbackCount++;
    const logEntry = {
      level: 'warn',
      timestamp: new Date().toISOString(),
      service: 'dixie-bff',
      event: 'translate_reason_fallback',
      hounfour_reason: hounfourReason,
      policy_type: policyType,
      operation,
      fallback_count: translateReasonFallbackCount,
    };
    process.stdout.write(JSON.stringify(logEntry) + '\n');
    return 'unknown_access_policy_type';
  }

  // Allowed cases
  if (policyType === 'read_only') return 'access_policy_read_only';
  if (policyType === 'time_limited') return 'access_policy_time_limited';
  if (policyType === 'role_based') return 'access_policy_role_based';
  return hounfourReason;
}

/**
 * Memory authorization layer.
 *
 * Enforces the access control matrix from SDD §7.3:
 * 1. Owner → full access
 * 2. Delegated wallet → read + history (per owner's delegation list)
 * 3. Previous owner → governed by AccessPolicy (none, read_only, time_limited, role_based,
 *    reputation_gated, compound — delegated to hounfour's evaluateAccessPolicy)
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

  // Early guard: reject missing/empty wallet before any checksumAddress calls (Bridge iter2-high-2)
  if (!wallet) {
    return { allowed: false, reason: 'missing_wallet' };
  }

  // 1. Owner has full access (EIP-55 checksummed comparison via hounfour)
  // Guard: skip owner check if ownerWallet is empty/falsy (unknown owner scenario)
  // Guard: zero-address owner is treated as no owner — deny access (Bridge iter2-medium-5)
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  if (ownerWallet && checksumAddress(ownerWallet) !== checksumAddress(ZERO_ADDRESS)) {
    if (checksumAddress(wallet) === checksumAddress(ownerWallet)) {
      return { allowed: true, reason: 'owner' };
    }
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
  const policyType = (accessPolicy as Record<string, unknown>).type as string;
  const action = toAction(operation);

  // Pre-check: role_based with empty/missing roles array → deny before calling hounfour
  if (policyType === 'role_based') {
    const requiredRoles = (accessPolicy as Record<string, unknown>).roles as string[] | undefined;
    if (!requiredRoles?.length) {
      return { allowed: false, reason: 'role_based_no_roles_defined' };
    }
    if (!params.roles?.length) {
      return { allowed: false, reason: 'role_based_no_roles_provided' };
    }

    // Memory context: role_based only grants read access for previous owners.
    // Check role match first, then restrict by operation.
    const hasRole = params.roles.some(r => requiredRoles.includes(r));
    if (!hasRole) {
      return { allowed: false, reason: 'role_based_insufficient_role' };
    }
    if (operation !== 'read' && operation !== 'history') {
      return { allowed: false, reason: 'role_based_no_modify' };
    }

    // Delegate to hounfour for the matching role (uses first matching role)
    const matchedRole = params.roles.find(r => requiredRoles.includes(r))!;
    const result = evaluateAccessPolicy(accessPolicy, {
      action,
      timestamp: new Date().toISOString(),
      role: matchedRole,
    });
    return { allowed: result.allowed, reason: translateReason(result.reason, result.allowed, policyType, operation) };
  }

  // For unknown policy types, deny access
  const knownTypes = ['none', 'read_only', 'time_limited', 'reputation_gated', 'compound'];
  if (!knownTypes.includes(policyType)) {
    return { allowed: false, reason: 'unknown_access_policy_type' };
  }

  // Build the context for hounfour's evaluateAccessPolicy
  const now = new Date();
  const timestamp = now.toISOString();
  const ctx: Parameters<typeof evaluateAccessPolicy>[1] = { action, timestamp };

  // Handle legacy `expires_at` field on time_limited policies by converting to
  // hounfour's `policy_created_at` + `duration_hours` convention.
  // Shallow-copy the policy to avoid mutating the caller's reference (Bridge iter2-high-1).
  let effectivePolicy: AccessPolicy = accessPolicy;
  if (policyType === 'time_limited') {
    const policyRecord = { ...accessPolicy } as Record<string, unknown>;
    const expiresAt = policyRecord.expires_at as string | undefined;
    if (expiresAt) {
      // Convert expires_at into a synthetic policy_created_at + duration_hours pair
      // so hounfour can enforce expiry natively.
      const expiresMs = new Date(expiresAt).getTime();
      // Use epoch as synthetic creation time; duration = entire span to expires_at
      ctx.policy_created_at = new Date(0).toISOString();
      // Assign duration_hours onto the copy if not already present
      if (policyRecord.duration_hours === undefined) {
        policyRecord.duration_hours = expiresMs / 3600_000;
      }
    }
    effectivePolicy = policyRecord as AccessPolicy;
  }

  // Delegate to hounfour's evaluateAccessPolicy
  const result = evaluateAccessPolicy(effectivePolicy, ctx);

  return {
    allowed: result.allowed,
    reason: translateReason(result.reason, result.allowed, policyType, operation),
  };
}

/**
 * Validate a ConversationSealingPolicy using hounfour's compiled schema
 * with cross-field invariant checks (e.g., time_limited requires duration_hours).
 * See: ADR-soul-memory-api.md, SDD §6.1.1 Validation
 */
export function validateSealingPolicy(policy: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const result = validate(ConversationSealingPolicySchema, policy, { crossField: true });
  if (!result.valid) {
    return { valid: false, errors: result.errors };
  }
  return { valid: true, errors: [] };
}
