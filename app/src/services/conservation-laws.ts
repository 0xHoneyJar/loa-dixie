/**
 * Conservation Laws — Protocol-backed invariant definitions for Dixie's economic commons.
 *
 * Replaces inline invariant comments (I-1, I-2, I-3, INV-002, INV-004) with
 * canonical ConservationLaw instances using hounfour v8.0.0 commons factories.
 *
 * Each law maps to an existing invariant enforced by the economic boundary system:
 * - I-1: Budget balance conservation (committed + reserved + available = limit)
 * - I-2: Pricing conservation (SUM(lot_entries) per lot = original_micro)
 * - I-3: Cache coherence (Redis ~ Postgres bounded drift)
 * - INV-002: Non-negative spend
 * - INV-004: Budget monotonicity (available can only decrease within period)
 *
 * See: SDD §3.1 (ConservationLaw factories), PRD FR-5
 * @since cycle-007 — Sprint 74, Task S2-T1
 */
import type { ConservationLaw } from '@0xhoneyjar/loa-hounfour/commons';
import {
  createBalanceConservation,
  createNonNegativeConservation,
  createBoundedConservation,
  createMonotonicConservation,
} from '@0xhoneyjar/loa-hounfour/commons';

// ---------------------------------------------------------------------------
// I-1: Budget Balance Conservation
// ---------------------------------------------------------------------------

/**
 * BUDGET_CONSERVATION — committed + reserved + available = limit
 *
 * "Community resources are finite and accounted for." The wallet's budget
 * is a zero-sum partition: every micro-USD is either committed (spent),
 * reserved (in-flight), or available (free). This law ensures no value
 * is created or destroyed during budget operations.
 *
 * @since cycle-007 — Sprint 74, Task S2-T1
 */
export const BUDGET_CONSERVATION: ConservationLaw = createBalanceConservation(
  ['committed', 'reserved', 'available'],
  'limit',
  'strict',
);

// ---------------------------------------------------------------------------
// I-2: Pricing Conservation
// ---------------------------------------------------------------------------

/**
 * PRICING_CONSERVATION — SUM(lot_entries) per lot = original_micro
 *
 * "Every credit lot is fully consumed." When access is granted and a
 * response incurs cost, that cost flows through the billing pipeline
 * where this conservation is verified. No value is created or destroyed
 * in the pricing partition.
 *
 * @since cycle-007 — Sprint 74, Task S2-T1
 */
export const PRICING_CONSERVATION: ConservationLaw = createBalanceConservation(
  ['consumed', 'remaining'],
  'original_micro',
  'strict',
);

// ---------------------------------------------------------------------------
// I-3: Cache Coherence (Bounded Drift)
// ---------------------------------------------------------------------------

/**
 * CACHE_COHERENCE — Redis.committed ~ Postgres.usage_events (bounded drift)
 *
 * "Fast storage matches durable storage." The budget_remaining value may
 * come from Redis (fast path) or Postgres (durable path). The invariant
 * ensures these eventually converge within a bounded drift threshold.
 *
 * The drift bound is expressed as a percentage (0–100). A 5% drift means
 * Redis can lag Postgres by at most 5% of the total budget. This allows
 * for eventual consistency while preventing material discrepancies.
 *
 * @since cycle-007 — Sprint 74, Task S2-T1
 */
export const CACHE_COHERENCE: ConservationLaw = createBoundedConservation(
  'cache_drift_pct',
  0,
  5, // 5% maximum drift threshold
  'advisory', // Advisory — eventual consistency is by design
);

// ---------------------------------------------------------------------------
// INV-002: Non-Negative Spend
// ---------------------------------------------------------------------------

/**
 * NON_NEGATIVE_SPEND — spend >= 0 for all budget operations
 *
 * No wallet can spend a negative amount. This prevents negative billing
 * artifacts from creating phantom credits.
 *
 * @since cycle-007 — Sprint 74, Task S2-T1
 */
export const NON_NEGATIVE_SPEND: ConservationLaw = createNonNegativeConservation(
  ['spend_micro', 'committed', 'reserved'],
  'strict',
);

// ---------------------------------------------------------------------------
// INV-004: Budget Monotonicity
// ---------------------------------------------------------------------------

/**
 * BUDGET_MONOTONICITY — available budget can only decrease within a billing period
 *
 * Within a single billing period, the available budget is monotonically
 * decreasing. Credits are consumed but never spontaneously created.
 * Budget refills happen only at period boundaries (monthly rollover)
 * or through explicit administrative top-up.
 *
 * @since cycle-007 — Sprint 74, Task S2-T1
 */
export const BUDGET_MONOTONICITY: ConservationLaw = createMonotonicConservation(
  'available',
  'decreasing',
  'strict',
);

// ---------------------------------------------------------------------------
// Conservation Registry
// ---------------------------------------------------------------------------

/**
 * CONSERVATION_REGISTRY — centralized access to all conservation laws.
 *
 * Maps invariant IDs to their protocol-backed ConservationLaw instances.
 * Used by conviction-boundary.ts and other enforcement points to reference
 * laws by ID rather than importing individual constants.
 *
 * @since cycle-007 — Sprint 74, Task S2-T1
 */
export const CONSERVATION_REGISTRY: ReadonlyMap<string, ConservationLaw> = new Map([
  ['I-1', BUDGET_CONSERVATION],
  ['I-2', PRICING_CONSERVATION],
  ['I-3', CACHE_COHERENCE],
  ['INV-002', NON_NEGATIVE_SPEND],
  ['INV-004', BUDGET_MONOTONICITY],
]);
