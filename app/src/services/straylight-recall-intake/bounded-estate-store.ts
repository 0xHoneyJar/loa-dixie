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

export interface BoundedEstateStore extends MinimalRecallStore {
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

  /** Active tenant for the next seam call. The route sets this to the
   * authoritative tenant before invoking `handleRecallIntake`. */
  setActiveTenant(tenant_id: string | undefined): void;

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
  let activeTenant: string | undefined;

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

  const storage: MinimalStorageSurface = {
    upsertRecallReceipt(receipt) {
      recallReceipts.set(receipt.receipt_id, receipt);
    },
    getRecallReceipt(receipt_id) {
      return recallReceipts.get(receipt_id);
    },
    upsertTransitionReceipt(receipt) {
      transitionReceipts.set(receipt.receipt_id, receipt);
    },
    getTransitionReceipt(receipt_id) {
      return transitionReceipts.get(receipt_id);
    },
    listTransitionReceipts(estate_id) {
      return [...transitionReceipts.values()].filter((r) => r.estate_id === estate_id);
    },
    appendTransition(transition) {
      const list = transitions.get(transition.estate_id) ?? [];
      list.push(transition);
      transitions.set(transition.estate_id, list);
    },
    listTransitions(estate_id) {
      return [...(transitions.get(estate_id) ?? [])];
    },
    upsertAssertion(assertion) {
      // Routed through `addAssertion` for cap enforcement; this storage
      // method exists for type conformance but never bypasses caps.
      if (!activeTenant) {
        throw new BoundedStoreCapExceededError({
          tenant_id: '<unbound>',
          dimension: 'assertion_count',
          cap: 0,
          observed: 0,
        });
      }
      addAssertionInternal(activeTenant, assertion);
    },
    getAssertion(assertion_id) {
      for (const slot of tenants.values()) {
        const a = slot.assertions.get(assertion_id);
        if (a) return a;
      }
      return undefined;
    },
    listAssertions(estate_id) {
      const out: Assertion[] = [];
      for (const slot of tenants.values()) {
        if (slot.estate.estate_id !== estate_id) continue;
        out.push(...slot.assertions.values());
      }
      return out;
    },
    upsertActor(actor) {
      if (!activeTenant) return;
      const slot = tenants.get(activeTenant);
      if (slot) slot.actor = actor;
    },
    getActor(actor_id) {
      for (const slot of tenants.values()) {
        if (slot.actor.actor_id === actor_id) return slot.actor;
      }
      return undefined;
    },
    upsertEstate(estate) {
      if (!activeTenant) return;
      const slot = tenants.get(activeTenant);
      if (slot) slot.estate = estate;
    },
    getEstate(estate_id) {
      for (const slot of tenants.values()) {
        if (slot.estate.estate_id === estate_id) return slot.estate;
      }
      return undefined;
    },
    upsertKeyring(keyring) {
      if (!activeTenant) return;
      const slot = tenants.get(activeTenant);
      if (slot) slot.keyring = keyring;
    },
    getKeyring(keyring_id) {
      for (const slot of tenants.values()) {
        if (slot.keyring.keyring_id === keyring_id) return slot.keyring;
      }
      return undefined;
    },
    appendAuditEvent(event) {
      appendAudit(event);
    },
    listAuditEvents(estate_id) {
      if (estate_id === undefined) return [...auditEvents];
      return [...(auditByEstate.get(estate_id) ?? [])];
    },
    getAuditTail(estate_id) {
      return auditTail.get(estate_id);
    },
  };

  const auditLog: MinimalAuditLogSurface = {
    append(input) {
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
      return auditEvents;
    },
    listFor(estate_id) {
      return [...(auditByEstate.get(estate_id) ?? [])];
    },
  };

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

  return {
    storage,
    auditLog,
    getKeyring() {
      if (!activeTenant) {
        throw new Error('bounded-estate-store: no active tenant set');
      }
      const slot = tenants.get(activeTenant);
      if (!slot) {
        throw new Error(`bounded-estate-store: no slot for active tenant ${activeTenant}`);
      }
      return slot.keyring;
    },
    listAssertions() {
      if (!activeTenant) return [];
      const slot = tenants.get(activeTenant);
      if (!slot) return [];
      return [...slot.assertions.values()];
    },
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
    setActiveTenant(tenant_id) {
      activeTenant = tenant_id;
    },
    inspectTenant(tenant_id) {
      const slot = tenants.get(tenant_id);
      if (!slot) return { assertions: 0, bytes: 0 };
      return { assertions: slot.assertions.size, bytes: slot.bytes };
    },
  };
}
