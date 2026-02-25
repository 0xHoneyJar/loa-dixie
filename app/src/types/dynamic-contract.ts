/**
 * DynamicContract Type Re-exports — Hounfour commons barrel.
 *
 * Clean re-export barrel for DynamicContract types from Hounfour.
 * All DynamicContract-related types should be imported from here,
 * not directly from Hounfour paths.
 *
 * @since cycle-009 Sprint 4 — Task 4.4 (FR-7)
 */
export type {
  DynamicContract,
  ProtocolSurface,
  ProtocolCapability,
  RateLimitTier,
} from '@0xhoneyjar/loa-hounfour/commons';

export type {
  MonotonicExpansionResult,
  MonotonicViolation,
} from '@0xhoneyjar/loa-hounfour/commons';

export { verifyMonotonicExpansion } from '@0xhoneyjar/loa-hounfour/commons';
