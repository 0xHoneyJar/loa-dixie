// ADR-026D §3.a (iii) (iv): per-tenant assertion-count cap AND byte-budget
// cap, refusal carries audit emission + operator signal, single-tenant
// flood cannot starve another.

import { describe, expect, it } from 'vitest';
import {
  createBoundedEstateStore,
  BoundedStoreCapExceededError,
} from '../../../src/services/straylight-recall-intake/index.js';
import type {
  Actor,
  ActorEstate,
  Assertion,
  Keyring,
} from '@loa/straylight';

function tenant(id: string) {
  const actor: Actor = {
    actor_id: id,
    actor_class: 'agent',
    display_name: id,
    created_at: '2026-05-18T00:00:00Z',
  } as unknown as Actor;
  const estate: ActorEstate = {
    estate_id: `estate_${id}`,
    actor_id: id,
    created_at: '2026-05-18T00:00:00Z',
  } as unknown as ActorEstate;
  const keyring: Keyring = {
    keyring_id: `kr_${id}`,
    actor_id: id,
    signers: [],
    created_at: '2026-05-18T00:00:00Z',
  } as unknown as Keyring;
  return { actor, estate, keyring };
}

function assertion(i: number, payload?: Record<string, unknown>): Assertion {
  return {
    assertion_id: `a_${i}`,
    estate_id: `estate_t1`,
    actor_id: 't1',
    assertion_class: 'fact',
    body: { text: 'x' },
    status: 'admitted',
    created_at: '2026-05-18T00:00:00Z',
    confidence: 0.9,
    provenance: [],
    ...payload,
  } as unknown as Assertion;
}

describe('bounded-estate-store — caps', () => {
  it('enforces assertion-count cap; throws BoundedStoreCapExceededError', () => {
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 3,
      maxAssertionBytesPerTenant: 1_000_000,
    });
    store.seedTenant({ tenant_id: 't1', ...tenant('t1') });
    store.addAssertion('t1', assertion(1));
    store.addAssertion('t1', assertion(2));
    store.addAssertion('t1', assertion(3));
    expect(() => store.addAssertion('t1', assertion(4))).toThrowError(
      BoundedStoreCapExceededError,
    );
    const snap = store.inspectTenant('t1');
    expect(snap.assertions).toBe(3);
  });

  it('enforces byte-budget cap', () => {
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 1_000,
      maxAssertionBytesPerTenant: 200,
    });
    store.seedTenant({ tenant_id: 't1', ...tenant('t1') });
    expect(() =>
      store.addAssertion('t1', assertion(1, { body: { text: 'x'.repeat(500) } })),
    ).toThrowError(BoundedStoreCapExceededError);
  });

  it('cap-exceeded error carries dimension + cap + observed for audit emission', () => {
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 1,
      maxAssertionBytesPerTenant: 1_000_000,
    });
    store.seedTenant({ tenant_id: 't1', ...tenant('t1') });
    store.addAssertion('t1', assertion(1));
    try {
      store.addAssertion('t1', assertion(2));
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BoundedStoreCapExceededError);
      const e = err as BoundedStoreCapExceededError;
      expect(e.tenant_id).toBe('t1');
      expect(e.dimension).toBe('assertion_count');
      expect(e.cap).toBe(1);
      expect(e.observed).toBe(2);
    }
  });

  it('one-tenant flood cannot starve another tenant (independent slots)', () => {
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 2,
      maxAssertionBytesPerTenant: 1_000_000,
    });
    store.seedTenant({ tenant_id: 't1', ...tenant('t1') });
    store.seedTenant({ tenant_id: 't2', ...tenant('t2') });
    store.addAssertion('t1', assertion(1));
    store.addAssertion('t1', assertion(2));
    expect(() => store.addAssertion('t1', assertion(3))).toThrow();
    // t2 is unaffected
    store.addAssertion('t2', assertion(10));
    store.addAssertion('t2', assertion(11));
    expect(store.inspectTenant('t2').assertions).toBe(2);
  });
});

describe('bounded-estate-store — active-tenant scoping', () => {
  it('listAssertions only returns active tenant slot', () => {
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 100,
      maxAssertionBytesPerTenant: 1_000_000,
    });
    store.seedTenant({ tenant_id: 't1', ...tenant('t1'), assertions: [assertion(1), assertion(2)] });
    store.seedTenant({ tenant_id: 't2', ...tenant('t2'), assertions: [assertion(99)] });
    store.setActiveTenant('t2');
    expect(store.listAssertions().length).toBe(1);
    store.setActiveTenant('t1');
    expect(store.listAssertions().length).toBe(2);
  });

  it('returns empty list when no active tenant set', () => {
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 100,
      maxAssertionBytesPerTenant: 1_000_000,
    });
    expect(store.listAssertions()).toEqual([]);
  });
});
