// Host-side cross-tenant primitive — Dixie-local adapter mirror.
//
// The wedge does not model `tenant_id` as a first-class field on Actor /
// Estate. The host must derive tenant identity from caller-supplied context
// — and MUST fail closed when it cannot. This module makes the tenant
// resolution dependency EXPLICIT: every host surface that makes a
// cross-tenant decision requires a `TenantResolver` injected by the caller.
// There is no production default resolver; passing one is the caller's
// responsibility.
//
// Source of truth: `loa-straylight/src/straylight/host/tenancy.ts`. This
// file is a pre-consumption mirror and will be replaced by a direct import
// from `@loa/straylight/host` in the future dependency-wiring PR.

import type { Context } from 'hono';

/**
 * Maps an actor_id / estate_id / receipt_id-derived id to a tenant slug.
 * Returns `undefined` when the id cannot be resolved — callers MUST treat
 * `undefined` as ambiguous and refuse (`tenant_unresolved`). The function
 * MUST be pure for a given id over the lifetime of one host invocation.
 */
export type TenantResolver = (id: string) => string | undefined;

export interface TenantCheckResult {
  ok: boolean;
  /** Set when `ok === false`. */
  reason?: 'cross_tenant' | 'tenant_unresolved';
}

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
