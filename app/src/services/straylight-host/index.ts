// Barrel for the Straylight recall-host Dixie-local adapter boundary.
//
// Dixie now consumes Straylight host TYPE definitions from the tag-pinned
// `@loa/straylight` package (tag `v0.0.1`, type-only via the `./host`
// subpath). Runtime helpers — tenant resolution, intake-deny logging,
// surface relay identity — remain Dixie-local: this PR does NOT introduce
// any runtime import from `@loa/straylight`. The package's runtime exports
// (e.g. `checkSameTenant`, `createInMemoryIntakeDenyLog`) are deliberately
// NOT re-exported here; only Dixie-local runtime helpers are surfaced.
//
// The barrel is intentionally NOT imported from `server.ts`, routes,
// middleware, the proxy, or any other runtime entrypoint; wiring the
// adapter into the request path is out of scope for this slice.

export type * from '@loa/straylight/host';

// Runtime helpers — Dixie-local. Explicit named exports avoid `export *`
// ambiguity with the package's same-named runtime helpers re-exported via
// the type-only barrel above.
export { checkSameTenant, createSessionTenantResolver } from './tenant-resolver.js';
export { createInMemoryIntakeDenyLog } from './intake-deny-log.js';
export {
  relayAuditChainLookup,
  relayEstateSummary,
  relayExclusionDisplay,
  relayProvenanceWalk,
  relayReceiptRetrieval,
  relayRecallIntake,
} from './refusal-passthrough.js';
