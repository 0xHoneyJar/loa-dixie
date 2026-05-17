// Host-side cross-tenant primitive — Dixie-local runtime helpers.
//
// The wedge does not model `tenant_id` as a first-class field on Actor /
// Estate. The host must derive tenant identity from caller-supplied context
// — and MUST fail closed when it cannot. This module makes the tenant
// resolution dependency EXPLICIT: every host surface that makes a
// cross-tenant decision requires a `TenantResolver` injected by the caller.
// There is no production default resolver; passing one is the caller's
// responsibility.
//
// Type definitions (`TenantResolver`, `TenantCheckResult`) are sourced from
// the tag-pinned `@loa/straylight/host` package (type-only). The runtime
// helpers below remain Dixie-local because Straylight runtime imports are
// out of scope for this slice.

import type { Context } from 'hono';
import type { TenantResolver, TenantCheckResult } from '@loa/straylight/host';

export type { TenantResolver, TenantCheckResult };

/**
 * Verify that `targetId` resolves into `callerTenant`. Returns `{ ok: true }`
 * only when the resolver returns a non-empty slug equal to `callerTenant`.
 *
 * Fail-closed rules:
 *   * Empty `callerTenant` → `tenant_unresolved` (checked BEFORE resolver
 *     invocation so a buggy caller cannot smuggle a blank tenant past a
 *     resolver that happens to return `""`).
 *   * Resolver returns `undefined` → `tenant_unresolved`.
 *   * Resolver returns `""` → `tenant_unresolved` (empty string is not a
 *     valid tenant slug and must not match an empty caller).
 *   * Resolver returns a different slug → `cross_tenant`.
 */
export function checkSameTenant(
  callerTenant: string,
  targetId: string,
  resolver: TenantResolver,
): TenantCheckResult {
  if (callerTenant === '') return { ok: false, reason: 'tenant_unresolved' };
  const resolved = resolver(targetId);
  if (resolved === undefined) return { ok: false, reason: 'tenant_unresolved' };
  if (resolved === '') return { ok: false, reason: 'tenant_unresolved' };
  if (resolved !== callerTenant) return { ok: false, reason: 'cross_tenant' };
  return { ok: true };
}

/**
 * Derive a `TenantResolver` from the authenticated wallet on the request
 * context. The resolver returns the session wallet for any id (the session
 * binds the tenant identity, not the target id). If no wallet is bound on
 * the context, the resolver returns `undefined` so downstream surfaces
 * fail closed with `tenant_unresolved`.
 *
 * There is no default tenant. There is no empty-string sentinel. There is
 * no production tenant inference beyond the explicit session wallet.
 */
export function createSessionTenantResolver(c: Context): TenantResolver {
  return () => {
    const wallet = c.get('wallet');
    if (!wallet) return undefined;
    return wallet;
  };
}
