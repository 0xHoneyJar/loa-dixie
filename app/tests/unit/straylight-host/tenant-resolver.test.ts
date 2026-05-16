import { describe, expect, it, vi } from 'vitest';
import type { Context } from 'hono';
import {
  checkSameTenant,
  createSessionTenantResolver,
  type TenantResolver,
} from '../../../src/services/straylight-host/tenant-resolver.js';

function makeContext(wallet: string | undefined): Context {
  return { get: (_key: string) => wallet } as unknown as Context;
}

describe('checkSameTenant fail-closed semantics', () => {
  it('returns tenant_unresolved when callerTenant is empty', () => {
    const resolver: TenantResolver = () => 'tenant-A';
    expect(checkSameTenant('', 'actor-1', resolver)).toEqual({
      ok: false,
      reason: 'tenant_unresolved',
    });
  });

  it('does not invoke the resolver when callerTenant is empty', () => {
    const resolver = vi.fn<TenantResolver>(() => 'tenant-A');
    checkSameTenant('', 'actor-1', resolver);
    expect(resolver).not.toHaveBeenCalled();
  });

  it('returns tenant_unresolved when resolver returns undefined', () => {
    const resolver: TenantResolver = () => undefined;
    expect(checkSameTenant('tenant-A', 'actor-1', resolver)).toEqual({
      ok: false,
      reason: 'tenant_unresolved',
    });
  });

  it('returns tenant_unresolved when resolver returns an empty string', () => {
    const resolver: TenantResolver = () => '';
    expect(checkSameTenant('tenant-A', 'actor-1', resolver)).toEqual({
      ok: false,
      reason: 'tenant_unresolved',
    });
  });

  it('returns cross_tenant when resolver returns a different slug', () => {
    const resolver: TenantResolver = () => 'tenant-B';
    expect(checkSameTenant('tenant-A', 'actor-1', resolver)).toEqual({
      ok: false,
      reason: 'cross_tenant',
    });
  });

  it('returns ok when resolver returns a matching slug', () => {
    const resolver: TenantResolver = () => 'tenant-A';
    expect(checkSameTenant('tenant-A', 'actor-1', resolver)).toEqual({ ok: true });
  });
});

describe('createSessionTenantResolver', () => {
  it('returns undefined when no wallet is bound on the context', () => {
    const resolver = createSessionTenantResolver(makeContext(undefined));
    expect(resolver('any-id')).toBeUndefined();
  });

  it('returns the wallet slug when a wallet is bound on the context', () => {
    const resolver = createSessionTenantResolver(makeContext('0xabc'));
    expect(resolver('any-id')).toBe('0xabc');
  });
});
