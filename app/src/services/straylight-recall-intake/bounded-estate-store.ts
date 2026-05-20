// Phase 26E — Dixie-local bounded estate-store adapter.
//
// ADR-026D §3.a (iii): per-tenant memory cap / bounded estate-storage
// posture is the ONLY storage-posture change Phase 26E authorizes. This is
// an endpoint guardrail, NOT a production persistence adapter; ADR-022E
// gate #8 remains held.
//
// Constraints (operator resolution #2):
//   * No value-import of `EstateStore`, `InMemoryStorage`, `JsonlStorage`,
//     `AuditLog`, or any host runtime internal from `@loa/straylight`.
//   * Use a Dixie-local structural type that exposes only the surface
//     `handleRecallIntake` → `executeRecall` calls at runtime.
//   * If a cast to the Straylight `EstateStore` type is unavoidable at the
//     seam call site, isolate it to one line at that one site.
//
// Posture: this adapter satisfies the structural surface so the seam runs
// end-to-end and produces correctly-shaped `RecallIntakeResponse` envelopes
// for refusal / served paths under a SEEDED, BOUNDED, IN-PROCESS dataset.
// It does NOT integrate Dixie production memory. Real persistent assertion
// storage remains out of scope and gated by future authorization.
//
// SKP-001 — Concurrency posture: tenant identity is captured per-request
// via `forTenant(tenant_id)`, which returns a `MinimalRecallStore` view
// closed over the tenant. There is NO shared mutable "active tenant" in
// the registry; concurrent requests for different tenants operate on
// independent views and cannot race on a global slot.

// Type-only imports from the package's declared `"types"`-only roots are
// safe under ADR-026A §"Decision" §5: the package's `exports` map permits
// type imports from `.` and `./host` even though their `import` keys are
// absent. These are NOT value imports.
import type {
  Actor,
  ActorEstate,
  Assertion,
  AuditEvent,
  AuditEventType,
  EstateTransition,
  Hash,
  Keyring,
  RecallReceipt,
  TransitionReceipt,
} from '@loa/straylight';

/**
 * Refusal raised by the bounded store when a tenant-scoped view is asked
 * to write under a foreign estate_id (or its bound actor/keyring/slot was
 * never seeded). SKP-001: a view created via `forTenant(tenantA)` MUST
 * NOT be able to mutate another tenant's estate by passing tenantB's ids.
 *
 * Reads of foreign estate_ids fail closed by returning empty / undefined
 * and DO NOT throw — this matches the existing read-side fail-closed
 * style and keeps speculative seam lookups cheap. Writes throw because
 * silently dropping a write would be invisible corruption.
 */
export class BoundedStoreScopeViolationError extends Error {
  readonly tenant_id: string;
  readonly bound_estate_id: string | undefined;
  readonly attempted_estate_id: string | undefined;
  readonly surface: string;
  constructor(opts: {
    tenant_id: string;
    bound_estate_id: string | undefined;
    attempted_estate_id: string | undefined;
    surface: string;
  }) {
    super(
      `bounded estate store scope violation: tenant=${opts.tenant_id} bound_estate=${opts.bound_estate_id ?? '<unseeded>'} attempted_estate=${opts.attempted_estate_id ?? '<missing>'} surface=${opts.surface}`,
    );
    this.name = 'BoundedStoreScopeViolationError';
    this.tenant_id = opts.tenant_id;
    this.bound_estate_id = opts.bound_estate_id;
    this.attempted_estate_id = opts.attempted_estate_id;
    this.surface = opts.surface;
  }
}

/**
 * Refusal raised by the bounded store when a per-tenant cap is exceeded.
 * The route handler catches this and maps it to a documented HTTP status
 * + audit emission per ADR-026D §3.a (iv).
 */
export class BoundedStoreCapExceededError extends Error {
  readonly tenant_id: string;
  readonly dimension: 'assertion_count' | 'byte_budget';
  readonly cap: number;
  readonly observed: number;
  constructor(opts: {
    tenant_id: string;
    dimension: 'assertion_count' | 'byte_budget';
    cap: number;
    observed: number;
  }) {
    super(
      `bounded estate store cap exceeded: tenant=${opts.tenant_id} dim=${opts.dimension} cap=${opts.cap} observed=${opts.observed}`,
    );
    this.name = 'BoundedStoreCapExceededError';
    this.tenant_id = opts.tenant_id;
    this.dimension = opts.dimension;
    this.cap = opts.cap;
    this.observed = opts.observed;
  }
}

export interface BoundedEstateStoreConfig {
  /** Max assertions per tenant. Inserts beyond throw. */
  maxAssertionsPerTenant: number;
  /** Max canonical-JSON byte budget per tenant. Inserts beyond throw. */
  maxAssertionBytesPerTenant: number;
}

/**
 * Local structural type. Mirrors only the surface `executeRecall` and
 * `handleRecallIntake` invoke on the store at runtime. Intentionally NOT
 * the full Straylight `EstateStore` API — this is a guardrail seam, not a
 * persistence adapter.
 */
export interface MinimalRecallStore {
  getKeyring(): Keyring;
  listAssertions(): readonly Assertion[];
  readonly storage: MinimalStorageSurface;
  readonly auditLog: MinimalAuditLogSurface;
}

interface MinimalStorageSurface {
  upsertRecallReceipt(receipt: RecallReceipt): void;
  getRecallReceipt(receipt_id: string): RecallReceipt | undefined;
  upsertTransitionReceipt(receipt: TransitionReceipt): void;
  getTransitionReceipt(receipt_id: string): TransitionReceipt | undefined;
  listTransitionReceipts(estate_id: string): TransitionReceipt[];
  appendTransition(transition: EstateTransition): void;
  listTransitions(estate_id: string): EstateTransition[];
  upsertAssertion(assertion: Assertion): void;
  getAssertion(assertion_id: string): Assertion | undefined;
  listAssertions(estate_id: string): Assertion[];
  upsertActor(actor: Actor): void;
  getActor(actor_id: string): Actor | undefined;
  upsertEstate(estate: ActorEstate): void;
  getEstate(estate_id: string): ActorEstate | undefined;
  upsertKeyring(keyring: Keyring): void;
  getKeyring(keyring_id: string): Keyring | undefined;
  appendAuditEvent(event: AuditEvent): void;
  listAuditEvents(estate_id?: string): AuditEvent[];
  getAuditTail(estate_id: string): Hash | undefined;
}

interface MinimalAuditLogSurface {
  append(input: AuditWriteInput): AuditEvent;
  list(): readonly AuditEvent[];
  listFor(estate_id: string): AuditEvent[];
}

interface AuditWriteInput {
  event_type: AuditEventType;
  actor_id: string;
  estate_id: string;
  transition_id?: string;
  assertion_refs?: string[];
  request_hash?: string;
  result_hash?: string;
  signer_refs: string[];
  policy_decision_ref?: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface BoundedEstateStore {
  /**
   * Seed an actor + estate + keyring + initial assertions for a tenant.
   * Enforces both per-tenant caps. Throws `BoundedStoreCapExceededError`
   * on overflow.
   */
  seedTenant(input: {
    tenant_id: string;
    actor: Actor;
    estate: ActorEstate;
    keyring: Keyring;
    assertions?: Assertion[];
  }): void;

  /** Add a single assertion under a tenant; enforces caps. */
  addAssertion(tenant_id: string, assertion: Assertion): void;

  /**
   * Return a request-scoped `MinimalRecallStore` view bound to the given
   * tenant. The view's `listAssertions`, `getKeyring`, and storage writes
   * close over `tenant_id` captured at view construction; no shared
   * mutable active-tenant slot exists. Concurrent requests for different
   * tenants get independent views (SKP-001).
   */
  forTenant(tenant_id: string): MinimalRecallStore;

  /** Test/observability: per-tenant footprint snapshot. */
  inspectTenant(tenant_id: string): {
    assertions: number;
    bytes: number;
  };
}

interface TenantSlot {
  actor: Actor;
  estate: ActorEstate;
  keyring: Keyring;
  assertions: Map<string, Assertion>;
  bytes: number;
}

function canonicalBytes(v: unknown): number {
  return Buffer.byteLength(JSON.stringify(v) ?? '', 'utf8');
}

export function createBoundedEstateStore(
  cfg: BoundedEstateStoreConfig,
): BoundedEstateStore {
  const tenants = new Map<string, TenantSlot>();
  const recallReceipts = new Map<string, RecallReceipt>();
  const transitionReceipts = new Map<string, TransitionReceipt>();
  const transitions = new Map<string, EstateTransition[]>();
  const auditEvents: AuditEvent[] = [];
  const auditByEstate = new Map<string, AuditEvent[]>();
  const auditTail = new Map<string, Hash>();

  function requireSlot(tenant_id: string): TenantSlot {
    const slot = tenants.get(tenant_id);
    if (!slot) {
      throw new BoundedStoreCapExceededError({
        tenant_id,
        dimension: 'assertion_count',
        cap: 0,
        observed: 0,
      });
    }
    return slot;
  }

  function appendAudit(event: AuditEvent): void {
    auditEvents.push(event);
    const list = auditByEstate.get(event.estate_id) ?? [];
    list.push(event);
    auditByEstate.set(event.estate_id, list);
    if ('event_hash' in event && typeof (event as { event_hash?: unknown }).event_hash === 'string') {
      auditTail.set(event.estate_id, (event as unknown as { event_hash: Hash }).event_hash);
    }
  }

  function addAssertionInternal(tenant_id: string, assertion: Assertion): void {
    const slot = requireSlot(tenant_id);
    if (slot.assertions.size >= cfg.maxAssertionsPerTenant) {
      throw new BoundedStoreCapExceededError({
        tenant_id,
        dimension: 'assertion_count',
        cap: cfg.maxAssertionsPerTenant,
        observed: slot.assertions.size + 1,
      });
    }
    const sizeDelta = canonicalBytes(assertion);
    if (slot.bytes + sizeDelta > cfg.maxAssertionBytesPerTenant) {
      throw new BoundedStoreCapExceededError({
        tenant_id,
        dimension: 'byte_budget',
        cap: cfg.maxAssertionBytesPerTenant,
        observed: slot.bytes + sizeDelta,
      });
    }
    slot.assertions.set(assertion.assertion_id, assertion);
    slot.bytes += sizeDelta;
  }

  function buildView(tenant_id: string): MinimalRecallStore {
    // SKP-001: snapshot the (estate_id, actor_id, keyring_id) the view
    // is bound to at construction time. All cross-estate reads/writes
    // through this view are checked against this snapshot. If the slot
    // hasn't been seeded yet, all four slots are `undefined` and every
    // estate-keyed surface fails closed (reads → empty / undefined,
    // writes → BoundedStoreScopeViolationError).
    const boundSlot = tenants.get(tenant_id);
    const boundEstateId = boundSlot?.estate.estate_id;
    const boundActorId = boundSlot?.actor.actor_id;
    const boundKeyringId = boundSlot?.keyring.keyring_id;

    function isOwnEstate(estate_id: string | undefined): boolean {
      return boundEstateId !== undefined && estate_id === boundEstateId;
    }

    function refuseForeignWrite(
      surface: string,
      attempted_estate_id: string | undefined,
    ): never {
      throw new BoundedStoreScopeViolationError({
        tenant_id,
        bound_estate_id: boundEstateId,
        attempted_estate_id,
        surface,
      });
    }

    const storage: MinimalStorageSurface = {
      upsertRecallReceipt(receipt) {
        if (!isOwnEstate(receipt.estate_id)) {
          refuseForeignWrite('storage.upsertRecallReceipt', receipt.estate_id);
        }
        recallReceipts.set(receipt.receipt_id, receipt);
      },
      getRecallReceipt(receipt_id) {
        const r = recallReceipts.get(receipt_id);
        if (!r) return undefined;
        // Read fail-closed: do not surface another tenant's receipt
        // through this view even when the caller has the receipt_id.
        if (!isOwnEstate(r.estate_id)) return undefined;
        return r;
      },
      upsertTransitionReceipt(receipt) {
        if (!isOwnEstate(receipt.estate_id)) {
          refuseForeignWrite('storage.upsertTransitionReceipt', receipt.estate_id);
        }
        transitionReceipts.set(receipt.receipt_id, receipt);
      },
      getTransitionReceipt(receipt_id) {
        const r = transitionReceipts.get(receipt_id);
        if (!r) return undefined;
        if (!isOwnEstate(r.estate_id)) return undefined;
        return r;
      },
      listTransitionReceipts(estate_id) {
        if (!isOwnEstate(estate_id)) return [];
        return [...transitionReceipts.values()].filter((r) => r.estate_id === estate_id);
      },
      appendTransition(transition) {
        if (!isOwnEstate(transition.estate_id)) {
          refuseForeignWrite('storage.appendTransition', transition.estate_id);
        }
        const list = transitions.get(transition.estate_id) ?? [];
        list.push(transition);
        transitions.set(transition.estate_id, list);
      },
      listTransitions(estate_id) {
        if (!isOwnEstate(estate_id)) return [];
        return [...(transitions.get(estate_id) ?? [])];
      },
      upsertAssertion(assertion) {
        if (!isOwnEstate(assertion.estate_id)) {
          refuseForeignWrite('storage.upsertAssertion', assertion.estate_id);
        }
        // Routed through `addAssertion` for cap enforcement; this storage
        // method exists for type conformance and is bound to the
        // request-scoped tenant captured at view construction.
        addAssertionInternal(tenant_id, assertion);
      },
      getAssertion(assertion_id) {
        const slot = tenants.get(tenant_id);
        if (!slot) return undefined;
        return slot.assertions.get(assertion_id);
      },
      listAssertions(estate_id) {
        if (!isOwnEstate(estate_id)) return [];
        const slot = tenants.get(tenant_id);
        if (!slot) return [];
        return [...slot.assertions.values()];
      },
      upsertActor(actor) {
        if (boundActorId !== undefined && actor.actor_id !== boundActorId) {
          refuseForeignWrite('storage.upsertActor', actor.actor_id);
        }
        const slot = tenants.get(tenant_id);
        if (slot) slot.actor = actor;
      },
      getActor(actor_id) {
        if (boundActorId === undefined || actor_id !== boundActorId) return undefined;
        const slot = tenants.get(tenant_id);
        return slot?.actor;
      },
      upsertEstate(estate) {
        if (!isOwnEstate(estate.estate_id)) {
          refuseForeignWrite('storage.upsertEstate', estate.estate_id);
        }
        const slot = tenants.get(tenant_id);
        if (slot) slot.estate = estate;
      },
      getEstate(estate_id) {
        if (!isOwnEstate(estate_id)) return undefined;
        const slot = tenants.get(tenant_id);
        return slot?.estate;
      },
      upsertKeyring(keyring) {
        if (boundKeyringId !== undefined && keyring.keyring_id !== boundKeyringId) {
          refuseForeignWrite('storage.upsertKeyring', keyring.keyring_id);
        }
        const slot = tenants.get(tenant_id);
        if (slot) slot.keyring = keyring;
      },
      getKeyring(keyring_id) {
        if (boundKeyringId === undefined || keyring_id !== boundKeyringId) return undefined;
        const slot = tenants.get(tenant_id);
        return slot?.keyring;
      },
      appendAuditEvent(event) {
        if (!isOwnEstate(event.estate_id)) {
          refuseForeignWrite('storage.appendAuditEvent', event.estate_id);
        }
        appendAudit(event);
      },
      listAuditEvents(estate_id) {
        // SKP-001: a tenant-scoped view can ONLY read its own estate's
        // audit events. The unscoped form (`estate_id === undefined`)
        // collapses to the bound estate as well, instead of leaking the
        // global audit log across tenants.
        const target = estate_id ?? boundEstateId;
        if (!isOwnEstate(target) || boundEstateId === undefined) return [];
        return [...(auditByEstate.get(boundEstateId) ?? [])];
      },
      getAuditTail(estate_id) {
        if (!isOwnEstate(estate_id) || boundEstateId === undefined) return undefined;
        return auditTail.get(boundEstateId);
      },
    };

    const auditLog: MinimalAuditLogSurface = {
      append(input) {
        if (!isOwnEstate(input.estate_id)) {
          refuseForeignWrite('auditLog.append', input.estate_id);
        }
        const event_id = `ae_${auditEvents.length + 1}_${input.estate_id}`;
        const event: AuditEvent = {
          audit_event_id: event_id,
          event_type: input.event_type,
          actor_id: input.actor_id,
          estate_id: input.estate_id,
          transition_id: input.transition_id,
          assertion_refs: input.assertion_refs ?? [],
          request_hash: input.request_hash,
          result_hash: input.result_hash,
          signer_refs: input.signer_refs,
          policy_decision_ref: input.policy_decision_ref,
          payload: input.payload ?? {},
          created_at: input.created_at,
          prev_event_hash: auditTail.get(input.estate_id),
        } as unknown as AuditEvent;
        // event_hash is computed by Straylight in the real adapter; here we
        // synthesize a deterministic chain link for the bounded seam.
        const chainLink = `h_${auditEvents.length + 1}_${input.estate_id}`;
        (event as unknown as { event_hash: string }).event_hash = chainLink;
        appendAudit(event);
        return event;
      },
      list() {
        // SKP-001: the unscoped list collapses to the bound estate's
        // events through this view. Operators wanting the cross-tenant
        // audit ledger must hold a privileged handle (not exposed here).
        if (boundEstateId === undefined) return [];
        return [...(auditByEstate.get(boundEstateId) ?? [])];
      },
      listFor(estate_id) {
        if (!isOwnEstate(estate_id)) return [];
        return [...(auditByEstate.get(estate_id) ?? [])];
      },
    };

    return {
      storage,
      auditLog,
      getKeyring() {
        const slot = tenants.get(tenant_id);
        if (!slot) {
          throw new Error(`bounded-estate-store: no slot for tenant ${tenant_id}`);
        }
        return slot.keyring;
      },
      listAssertions() {
        const slot = tenants.get(tenant_id);
        if (!slot) return [];
        return [...slot.assertions.values()];
      },
    };
  }

  return {
    seedTenant(input) {
      tenants.set(input.tenant_id, {
        actor: input.actor,
        estate: input.estate,
        keyring: input.keyring,
        assertions: new Map(),
        bytes: 0,
      });
      for (const a of input.assertions ?? []) {
        addAssertionInternal(input.tenant_id, a);
      }
    },
    addAssertion(tenant_id, assertion) {
      addAssertionInternal(tenant_id, assertion);
    },
    forTenant(tenant_id) {
      return buildView(tenant_id);
    },
    inspectTenant(tenant_id) {
      const slot = tenants.get(tenant_id);
      if (!slot) return { assertions: 0, bytes: 0 };
      return { assertions: slot.assertions.size, bytes: slot.bytes };
    },
  };
}
