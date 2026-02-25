/**
 * GovernedResource<T> — Unified Governance Protocol Abstraction
 *
 * The Kubernetes CRD moment: every governed resource in the THJ ecosystem
 * shares this structure. Billing, reputation, knowledge, access, and scoring
 * paths are all instances of the same governance primitive.
 *
 * See: Bridgebuilder Meditation Part I (governance isomorphism),
 *      PRD §8.1 (isomorphism formalized), invariants.yaml INV-008
 *
 * @since cycle-008 — FR-10
 */
import type { AuditTrail } from '@0xhoneyjar/loa-hounfour/commons';
import type { GovernanceMutation } from '@0xhoneyjar/loa-hounfour/commons';

/**
 * Result of a state transition attempt.
 */
export type TransitionResult<TState> =
  | { readonly success: true; readonly state: TState; readonly version: number }
  | { readonly success: false; readonly reason: string; readonly code: string };

/**
 * Result of an invariant verification.
 */
export interface InvariantResult {
  readonly invariant_id: string;
  readonly satisfied: boolean;
  readonly detail: string;
  readonly checked_at: string;
}

/**
 * The unified governance interface.
 *
 * Every governed resource implements this interface, providing:
 * - Identity: resourceId, resourceType
 * - State: current state, version number
 * - Transitions: event-driven state changes with actor attribution
 * - Invariants: verifiable properties that must hold
 * - Audit: tamper-evident trail of all transitions
 *
 * @typeParam TState - The resource's state type
 * @typeParam TEvent - The event types that can transition state
 * @typeParam TInvariant - The invariant types that can be verified
 * @since cycle-008 — FR-10
 */
export interface GovernedResource<TState, TEvent, TInvariant extends string = string> {
  /** Unique identifier for this resource instance. */
  readonly resourceId: string;
  /** Type discriminator (e.g., 'reputation', 'scoring-path', 'knowledge'). */
  readonly resourceType: string;

  /** Current resource state (read-only snapshot). */
  readonly current: TState;
  /** Current version number (monotonically increasing). */
  readonly version: number;

  /**
   * Attempt a state transition driven by an event.
   * Returns success with new state, or failure with reason.
   */
  transition(event: TEvent, actorId: string): Promise<TransitionResult<TState>>;

  /**
   * Verify a specific invariant.
   */
  verify(invariantId: TInvariant): InvariantResult;

  /**
   * Verify all invariants for this resource.
   */
  verifyAll(): InvariantResult[];

  /** The resource's audit trail. */
  readonly auditTrail: Readonly<AuditTrail>;

  /** Governance mutation history. */
  readonly mutationLog: ReadonlyArray<GovernanceMutation>;
}

/**
 * Abstract base class with shared wiring for GovernedResource implementations.
 * Provides verifyAll() default implementation.
 *
 * @since cycle-008 — FR-10
 */
export abstract class GovernedResourceBase<TState, TEvent, TInvariant extends string = string>
  implements GovernedResource<TState, TEvent, TInvariant>
{
  abstract readonly resourceId: string;
  abstract readonly resourceType: string;
  abstract readonly current: TState;
  abstract readonly version: number;
  abstract readonly auditTrail: Readonly<AuditTrail>;
  abstract readonly mutationLog: ReadonlyArray<GovernanceMutation>;

  abstract transition(event: TEvent, actorId: string): Promise<TransitionResult<TState>>;
  abstract verify(invariantId: TInvariant): InvariantResult;

  verifyAll(): InvariantResult[] {
    return this.invariantIds.map(id => this.verify(id));
  }

  /** Subclasses declare their invariant IDs. */
  protected abstract readonly invariantIds: TInvariant[];
}
