// Phase 26E — Dixie recall-intake adapter barrel.
//
// Authorized by ADR-026D (loa-straylight). Implements ADR-026C consumer
// obligations §3.1–§3.8. Endpoint surface lives at
// `app/src/routes/recall-intake.ts`; this barrel exposes the service-layer
// primitives the route composes.
//
// All Straylight runtime imports are confined to:
//   * `capability-holder.ts` — value imports of `createDixieCapability`,
//     `DixieCapabilityError` from `@loa/straylight/runtime/recall-intake`.
//   * `bounded-estate-store.ts` — type-only imports from `@loa/straylight`
//     (declared `"types"`-only by ADR-026A §"Decision" §5; no runtime
//     value resolves through `.`).
// No file under this directory imports from `@loa/straylight/host` at
// runtime.

export {
  createCapabilityHolder,
  DixieCapabilityError,
  type CapabilityHolder,
  type DixieCapability,
} from './capability-holder.js';

export {
  createBoundedEstateStore,
  BoundedStoreCapExceededError,
  type BoundedEstateStore,
  type BoundedEstateStoreConfig,
  type MinimalRecallStore,
} from './bounded-estate-store.js';

export {
  createIdempotencyCache,
  type IdempotencyCache,
  type IdempotencyCacheConfig,
  type IdempotencyKey,
} from './idempotency-cache.js';

export {
  createPerEstateMutex,
  type PerEstateMutex,
} from './per-estate-mutex.js';

export {
  createPerTenantRateLimit,
  type PerTenantRateLimit,
  type PerTenantRateLimitConfig,
} from './per-tenant-rate-limit.js';

export {
  ingressRefusal,
  guardRefusal,
  mapSeamResponseToRefusal,
  type RefusalClass,
  type RefusalEnvelope,
} from './refusal-mapping.js';
