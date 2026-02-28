/**
 * GovernedResource<T> — Unified Governance Protocol Abstraction
 *
 * Type-mapping barrel providing Dixie's governance type shapes with canonical
 * hounfour backing awareness. Dixie's field names (state, satisfied, invariant_id,
 * checked_at) remain stable for all existing consumers. Canonical types are
 * re-exported with `Canonical` prefix for gradual adoption.
 *
 * Canonical → Dixie field mapping:
 *   TransitionResult.newState       → TransitionResult.state
 *   InvariantResult.holds           → InvariantResult.satisfied
 *   InvariantResult.invariantId     → InvariantResult.invariant_id
 *   InvariantResult.detail?         → InvariantResult.detail (required)
 *   (no checked_at)                 → InvariantResult.checked_at (Dixie-only)
 *   transition(event, MutationContext) → transition(event, actorId: string)
 *
 * GovernedResourceBase abstract class REMOVED (cycle-019, Sprint 120) — no
 * consumer extended it. All 4 implementors (ReputationService, FleetGovernor,
 * SovereigntyEngine, ScoringPathTracker) use `implements GovernedResource<...>`.
 *
 * See: Bridgebuilder Meditation Part I (governance isomorphism),
 *      PRD §8.1 (isomorphism formalized), invariants.yaml INV-008
 *
 * @since cycle-008 — FR-10
 * @since cycle-019 — Sprint 120 (canonical migration P2, GovernedResourceBase removed)
 */
import type { AuditTrail, GovernanceMutation } from '@0xhoneyjar/loa-hounfour/commons';
import type { MutationContext } from '@0xhoneyjar/loa-hounfour/commons';

// ---------------------------------------------------------------------------
// Canonical type re-exports for gradual adoption (Sprint 120)
// ---------------------------------------------------------------------------

/**
 * Canonical type re-exports for gradual adoption.
 *
 * **Naming convention**: Prefer Dixie types (e.g. `TransitionResult`,
 * `InvariantResult`) for existing consumers. Use `Canonical*`-prefixed types
 * (e.g. `CanonicalTransitionResult`) for new code targeting hounfour-native
 * signatures. See the field mapping table in the file header (lines 9-16) for
 * the exact correspondence between Dixie and canonical field names.
 */
export type {
  TransitionResult as CanonicalTransitionResult,
  InvariantResult as CanonicalInvariantResult,
  GovernedResource as CanonicalGovernedResource,
  MutationContext,
} from '@0xhoneyjar/loa-hounfour/commons';

// ---------------------------------------------------------------------------
// Dixie governance types — stable API for existing consumers
// ---------------------------------------------------------------------------

/**
 * Result of a state transition attempt.
 *
 * Dixie uses a discriminated union (success: true → state, success: false →
 * reason/code). Canonical hounfour uses a flat shape (success: boolean,
 * newState, version, violations?). This Dixie shape is retained for all
 * existing consumers until a coordinated migration to canonical field names.
 *
 * @see CanonicalTransitionResult for hounfour's shape
 */
export type TransitionResult<TState> =
  | { readonly success: true; readonly state: TState; readonly version: number }
  | { readonly success: false; readonly reason: string; readonly code: string };

/**
 * Result of an invariant verification.
 *
 * Dixie shape: invariant_id (snake_case), satisfied, detail (required), checked_at.
 * Canonical shape: invariantId (camelCase), holds, detail (optional), no checked_at.
 *
 * @see CanonicalInvariantResult for hounfour's shape
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
 * Dixie shape: transition(event, actorId: string).
 * Canonical shape: transition(event, context: MutationContext).
 *
 * @typeParam TState - The resource's state type
 * @typeParam TEvent - The event types that can transition state
 * @typeParam TInvariant - The invariant types that can be verified
 * @see CanonicalGovernedResource for hounfour's interface
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

// ---------------------------------------------------------------------------
// Migration helper (Sprint 120)
// ---------------------------------------------------------------------------

/**
 * Convert a Dixie actorId string to a canonical MutationContext.
 * Useful for consumers incrementally adopting canonical signatures.
 *
 * @param actorId - The actor ID string
 * @param actorType - Actor type (defaults to 'system' for existing Dixie callers)
 * @returns MutationContext compatible with canonical GovernedResource.transition()
 * @since cycle-019 — Sprint 120 (migration helper)
 */
export function toMutationContext(
  actorId: string,
  actorType: 'human' | 'system' | 'autonomous' = 'system',
): MutationContext {
  return { actorId, actorType };
}
