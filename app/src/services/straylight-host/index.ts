// Barrel for the Straylight recall-host Dixie-local adapter boundary.
//
// This barrel is intentionally NOT imported from `server.ts`, routes,
// middleware, the proxy, or any other runtime entrypoint in this PR.
// The adapter boundary is pre-consumption scaffolding only — wiring it
// into the request path is reserved for the follow-up dependency-wiring
// PR, which can then replace the local `./types.js` mirror with a direct
// import from `@loa/straylight/host`.

export * from './types.js';
export * from './tenant-resolver.js';
export * from './intake-deny-log.js';
export * from './refusal-passthrough.js';
