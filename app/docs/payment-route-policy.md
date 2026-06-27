# Dixie Payment Route Policy Matrix

This document scopes the payment middleware behavior implemented in this PR. It is evidence for the route/payment lane and is not a claim that every referenced issue is closed.

## Middleware behavior matrix

| Scenario | Expected result | Evidence |
| --- | --- | --- |
| x402 disabled | Request passes through | `payment.test.ts` disabled/default cases |
| Free route without payment | Request passes through | `/api/health`, `/api/admin/status`, `/api/reputation/query` test cases |
| Protected route without payment | HTTP 402 | `/api/chat`, `/api/agent/query`, `/api/fleet/spawn` test cases |
| Protected route with accepted payment | Request passes through | `validatePaymentHeader` success cases |
| Protected route with rejected payment | HTTP 402 | `invalid_payment` test case |
| Validator unavailable | HTTP 503 | `payment_validation_unavailable` test case |
| Production missing facilitator URL | Startup throws | production config test |
| Production missing validator hook | Startup throws | production config test |
| Prefix-sibling route | Treated as protected | `/api/healthcheck`, `/api/administer`, `/api/identityish`, `/api/reputation-score` test cases |

## Payment-free route reasons

| Prefix | Reason for exemption | Follow-up evidence still needed |
| --- | --- | --- |
| `/api/health` | Liveness/readiness surface; must remain callable by probes | Confirm health subroutes do not mutate protected state |
| `/api/auth/` | Auth/JWKS/SIWE bootstrap surface; payment cannot precede identity bootstrap | Confirm auth routes have their own abuse/rate controls |
| `/.well-known/` | Discovery metadata surface | Confirm route registration and public metadata only |
| `/api/admin/` | Operator route family; should be governed by admin auth rather than payment | Confirm admin auth coverage for every subroute |
| `/api/reputation/` | Reputation query surface for Finn integration | Confirm intended free subset vs builder/admin-gated subroutes |
| `/api/identity/` | Identity/oracle bootstrap surface | Confirm identity routes have independent auth/abuse controls |

## Production wiring status

The middleware contract now requires `validatePaymentHeader` in production. This PR still needs an app-wiring commit that supplies a real validator-backed function at the `createPaymentGate` call site. Until that exists, this PR should remain `VERDICT: PATCH` and use `Refs`, not `Closes`, for the wider route/payment issue set.
