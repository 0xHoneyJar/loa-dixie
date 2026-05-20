// ADR-026D §3.a (iii) (iv): per-tenant assertion-count cap AND byte-budget
// cap, refusal carries audit emission + operator signal, single-tenant
// flood cannot starve another.

import { describe, expect, it } from 'vitest';
import {
  createBoundedEstateStore,
  BoundedStoreCapExceededError,
  BoundedStoreScopeViolationError,
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

describe('bounded-estate-store — request-scoped tenant views (SKP-001)', () => {
  it('forTenant returns a view scoped to its tenant', () => {
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 100,
      maxAssertionBytesPerTenant: 1_000_000,
    });
    store.seedTenant({ tenant_id: 't1', ...tenant('t1'), assertions: [assertion(1), assertion(2)] });
    store.seedTenant({ tenant_id: 't2', ...tenant('t2'), assertions: [assertion(99)] });
    expect(store.forTenant('t2').listAssertions().length).toBe(1);
    expect(store.forTenant('t1').listAssertions().length).toBe(2);
  });

  it('forTenant view returns empty list when tenant is unseeded', () => {
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 100,
      maxAssertionBytesPerTenant: 1_000_000,
    });
    expect(store.forTenant('unknown').listAssertions()).toEqual([]);
  });

  it('concurrent forTenant views do not race on a shared active slot', () => {
    // Two interleaved views must each see only their own tenant's
    // assertions, even when calls are interleaved. There is no global
    // active-tenant flag the order of operations can corrupt.
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 100,
      maxAssertionBytesPerTenant: 1_000_000,
    });
    store.seedTenant({ tenant_id: 't1', ...tenant('t1'), assertions: [assertion(1), assertion(2)] });
    store.seedTenant({ tenant_id: 't2', ...tenant('t2'), assertions: [assertion(99)] });
    const v1 = store.forTenant('t1');
    const v2 = store.forTenant('t2');
    // Interleave reads. Each view must remain bound to its own tenant.
    expect(v2.listAssertions().length).toBe(1);
    expect(v1.listAssertions().length).toBe(2);
    expect(v2.listAssertions().length).toBe(1);
    expect(v1.listAssertions().length).toBe(2);
  });

  it('interleaved keyring + audit reads stay tenant-scoped (SKP-001)', () => {
    // SKP-001 strict form: tenants A and B cannot affect each other's
    // keyring / audit reads even when calls are interleaved AND writes
    // happen on either side. The view-level getKeyring(), audit appends,
    // and audit reads must remain bound to the tenant captured at
    // forTenant() construction time.
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 100,
      maxAssertionBytesPerTenant: 1_000_000,
    });
    store.seedTenant({ tenant_id: 't1', ...tenant('t1') });
    store.seedTenant({ tenant_id: 't2', ...tenant('t2') });
    const vA = store.forTenant('t1');
    const vB = store.forTenant('t2');

    // Keyring read isolation — each view returns its own tenant's keyring.
    expect(vA.getKeyring().keyring_id).toBe('kr_t1');
    expect(vB.getKeyring().keyring_id).toBe('kr_t2');
    // Re-read after the interleave — values must not have drifted to the
    // other tenant's slot.
    expect(vA.getKeyring().keyring_id).toBe('kr_t1');
    expect(vB.getKeyring().keyring_id).toBe('kr_t2');

    // Assertion-write isolation — adding an assertion through one view
    // must not appear in the other view's listAssertions(). We exercise
    // both view ordering paths (B-then-A, A-then-B) to detect any latent
    // mutable active-tenant slot.
    store.addAssertion('t1', assertion(101));
    expect(vA.listAssertions().length).toBe(1);
    expect(vB.listAssertions().length).toBe(0);
    store.addAssertion('t2', assertion(202));
    expect(vB.listAssertions().length).toBe(1);
    expect(vA.listAssertions().length).toBe(1);

    // Audit-read isolation through the hardened view contract: each
    // view appends only under its OWN estate, and reads through the
    // view return only that estate's events. Cross-estate reads through
    // either view fail closed (empty list). This is the load-bearing
    // SKP-001 invariant — see the dedicated regression block below for
    // the full matrix of cross-view read/write attempts.
    const baseInput = {
      event_type: 'recall_request' as const,
      actor_id: 't1',
      estate_id: 'estate_t1',
      signer_refs: ['signer_t1'],
      created_at: '2026-05-18T00:00:00Z',
    };
    vA.auditLog.append(baseInput);
    vB.auditLog.append({
      ...baseInput,
      actor_id: 't2',
      estate_id: 'estate_t2',
      signer_refs: ['signer_t2'],
    });
    // Each view sees only its own estate.
    expect(vA.auditLog.listFor('estate_t1').map((e) => e.estate_id)).toEqual([
      'estate_t1',
    ]);
    expect(vB.auditLog.listFor('estate_t2').map((e) => e.estate_id)).toEqual([
      'estate_t2',
    ]);
    expect(vA.storage.listAuditEvents('estate_t1').map((e) => e.estate_id)).toEqual([
      'estate_t1',
    ]);
    expect(vB.storage.listAuditEvents('estate_t2').map((e) => e.estate_id)).toEqual([
      'estate_t2',
    ]);
    // Final keyring re-read still returns each view's own tenant.
    expect(vA.getKeyring().keyring_id).toBe('kr_t1');
    expect(vB.getKeyring().keyring_id).toBe('kr_t2');
  });
});

describe('bounded-estate-store — SKP-001 cross-tenant audit/receipt scoping', () => {
  // SKP-001 hardened contract: a view created by forTenant(tenantA) must
  // not be able to read or write another tenant/estate's audit-log,
  // receipts, transitions, or estate/actor/keyring state by passing
  // tenantB / estateB ids. Reads fail closed by returning empty /
  // undefined; writes throw BoundedStoreScopeViolationError.

  function buildTwoTenantStore() {
    const store = createBoundedEstateStore({
      maxAssertionsPerTenant: 100,
      maxAssertionBytesPerTenant: 1_000_000,
    });
    store.seedTenant({ tenant_id: 't1', ...tenant('t1') });
    store.seedTenant({ tenant_id: 't2', ...tenant('t2') });
    return store;
  }

  function recallReceipt(estate_id: string, receipt_id: string) {
    return {
      receipt_id,
      estate_id,
      actor_id: estate_id.replace(/^estate_/, ''),
      created_at: '2026-05-18T00:00:00Z',
    } as never;
  }

  function transition(estate_id: string, transition_id: string) {
    return {
      transition_id,
      estate_id,
      actor_id: estate_id.replace(/^estate_/, ''),
      created_at: '2026-05-18T00:00:00Z',
    } as never;
  }

  function audit(estate_id: string, actor_id: string) {
    return {
      event_type: 'recall_request' as const,
      actor_id,
      estate_id,
      signer_refs: [`signer_${actor_id}`],
      created_at: '2026-05-18T00:00:00Z',
    };
  }

  it("vA cannot read vB's audit events by passing estate_t2 ids", () => {
    const store = buildTwoTenantStore();
    const vA = store.forTenant('t1');
    const vB = store.forTenant('t2');
    // Seed legitimate events through each view's own surface.
    vA.auditLog.append(audit('estate_t1', 't1'));
    vB.auditLog.append(audit('estate_t2', 't2'));
    // Cross-tenant reads through vA fail closed (empty list).
    expect(vA.auditLog.listFor('estate_t2')).toEqual([]);
    expect(vA.storage.listAuditEvents('estate_t2')).toEqual([]);
    // Even the unscoped form (`undefined`) collapses to vA's bound
    // estate — never the global ledger.
    expect(vA.storage.listAuditEvents().map((e) => e.estate_id)).toEqual([
      'estate_t1',
    ]);
    expect(vA.auditLog.list().map((e) => e.estate_id)).toEqual(['estate_t1']);
    // Audit-tail of the foreign estate is not visible.
    expect(vA.storage.getAuditTail('estate_t2')).toBeUndefined();
    // Receipts and transitions also fail closed under estate_t2.
    expect(vA.storage.listTransitions('estate_t2')).toEqual([]);
    expect(vA.storage.listTransitionReceipts('estate_t2')).toEqual([]);
    expect(vA.storage.listAssertions('estate_t2')).toEqual([]);
    expect(vA.storage.getEstate('estate_t2')).toBeUndefined();
  });

  it("vA cannot append/write audit events for estate_t2", () => {
    const store = buildTwoTenantStore();
    const vA = store.forTenant('t1');
    // Foreign-estate audit-log write through both surfaces must throw.
    expect(() => vA.auditLog.append(audit('estate_t2', 't2'))).toThrowError(
      BoundedStoreScopeViolationError,
    );
    expect(() =>
      vA.storage.appendAuditEvent({
        ...(audit('estate_t2', 't2') as object),
        audit_event_id: 'ae_forced',
        assertion_refs: [],
        signer_refs: ['signer_t2'],
      } as never),
    ).toThrowError(BoundedStoreScopeViolationError);
    // Foreign receipt / transition / assertion / actor / estate / keyring
    // writes must also throw.
    expect(() =>
      vA.storage.upsertRecallReceipt(recallReceipt('estate_t2', 'r1')),
    ).toThrowError(BoundedStoreScopeViolationError);
    expect(() =>
      vA.storage.upsertTransitionReceipt(recallReceipt('estate_t2', 'tr1')),
    ).toThrowError(BoundedStoreScopeViolationError);
    expect(() => vA.storage.appendTransition(transition('estate_t2', 'tx1'))).toThrowError(
      BoundedStoreScopeViolationError,
    );
    expect(() =>
      vA.storage.upsertAssertion(assertion(500, { estate_id: 'estate_t2' })),
    ).toThrowError(BoundedStoreScopeViolationError);
    expect(() =>
      vA.storage.upsertEstate({
        estate_id: 'estate_t2',
        actor_id: 't2',
        created_at: '2026-05-18T00:00:00Z',
      } as never),
    ).toThrowError(BoundedStoreScopeViolationError);
    expect(() =>
      vA.storage.upsertActor({
        actor_id: 't2',
        actor_class: 'agent',
        display_name: 't2',
        created_at: '2026-05-18T00:00:00Z',
      } as never),
    ).toThrowError(BoundedStoreScopeViolationError);
    expect(() =>
      vA.storage.upsertKeyring({
        keyring_id: 'kr_t2',
        actor_id: 't2',
        signers: [],
        created_at: '2026-05-18T00:00:00Z',
      } as never),
    ).toThrowError(BoundedStoreScopeViolationError);
    // No foreign event leaked into the index — vB still sees nothing.
    const vB = store.forTenant('t2');
    expect(vB.auditLog.listFor('estate_t2')).toEqual([]);
    expect(vB.storage.listAuditEvents('estate_t2')).toEqual([]);
  });

  it('legitimate vA access to estate_t1 still works', () => {
    const store = buildTwoTenantStore();
    const vA = store.forTenant('t1');
    // Same-estate audit append + read.
    vA.auditLog.append(audit('estate_t1', 't1'));
    expect(vA.auditLog.listFor('estate_t1').map((e) => e.estate_id)).toEqual([
      'estate_t1',
    ]);
    expect(vA.storage.listAuditEvents('estate_t1').map((e) => e.estate_id)).toEqual([
      'estate_t1',
    ]);
    expect(vA.storage.getAuditTail('estate_t1')).toBeDefined();
    // Same-estate receipt + transition writes succeed.
    expect(() => vA.storage.upsertRecallReceipt(recallReceipt('estate_t1', 'r1'))).not.toThrow();
    expect(() => vA.storage.upsertTransitionReceipt(recallReceipt('estate_t1', 'tr1'))).not.toThrow();
    expect(() => vA.storage.appendTransition(transition('estate_t1', 'tx1'))).not.toThrow();
    expect(vA.storage.listTransitions('estate_t1')).toHaveLength(1);
    expect(vA.storage.listTransitionReceipts('estate_t1')).toHaveLength(1);
    // Bound estate / actor / keyring reads succeed.
    expect(vA.storage.getEstate('estate_t1')?.estate_id).toBe('estate_t1');
    expect(vA.storage.getActor('t1')?.actor_id).toBe('t1');
    expect(vA.storage.getKeyring('kr_t1')?.keyring_id).toBe('kr_t1');
  });

  it('legitimate vB access to estate_t2 still works', () => {
    const store = buildTwoTenantStore();
    const vB = store.forTenant('t2');
    vB.auditLog.append(audit('estate_t2', 't2'));
    expect(vB.auditLog.listFor('estate_t2').map((e) => e.estate_id)).toEqual([
      'estate_t2',
    ]);
    expect(vB.storage.listAuditEvents('estate_t2').map((e) => e.estate_id)).toEqual([
      'estate_t2',
    ]);
    expect(vB.storage.getAuditTail('estate_t2')).toBeDefined();
    expect(() => vB.storage.upsertRecallReceipt(recallReceipt('estate_t2', 'r9'))).not.toThrow();
    expect(vB.storage.getEstate('estate_t2')?.estate_id).toBe('estate_t2');
    expect(vB.storage.getActor('t2')?.actor_id).toBe('t2');
    expect(vB.storage.getKeyring('kr_t2')?.keyring_id).toBe('kr_t2');
    // And vB still cannot reach estate_t1 by id.
    expect(vB.auditLog.listFor('estate_t1')).toEqual([]);
    expect(vB.storage.listAuditEvents('estate_t1')).toEqual([]);
    expect(vB.storage.getEstate('estate_t1')).toBeUndefined();
    expect(vB.storage.getActor('t1')).toBeUndefined();
    expect(vB.storage.getKeyring('kr_t1')).toBeUndefined();
  });
});
