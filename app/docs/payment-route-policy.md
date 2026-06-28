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

The middleware contract now requires `validatePaymentHeader` in production. The PR also adds `SettlementClient.validatePaymentHeader()`, which is the intended validator-backed adapter surface for the app wiring.

This PR still needs a call-site commit proving the actual `createPaymentGate(...)` construction path passes a real function equivalent to:

```ts
validatePaymentHeader: (paymentHeader, { path }) => settlementClient.validatePaymentHeader({ paymentHeader, path })
```

Until the real bootstrap/middleware assembly path supplies that function, this PR should remain `VERDICT: PATCH` and use `Refs`, not `Closes`, for the wider route/payment issue set.

## Non-production semantics

When `x402Enabled=true` outside production and no `validatePaymentHeader` hook is provided, the middleware still rejects protected routes that omit a payment header, but it does not prove payment validity for protected routes that include one.

That mode is development/shadow behavior only. It is useful for exercising route boundaries, header plumbing, and downstream handlers without a live facilitator. It is not production payment validation, not settlement evidence, and not sufficient acceptance evidence for paid-route enforcement.

## Acceptance split

This PR can be accepted only after both slices are proven:

1. **Middleware contract slice** — protected-route default deny, exact free-route boundary matching, validator success/rejection/error handling, and production fail-closed config tests.
2. **App wiring slice** — the real app bootstrap path supplies the validator-backed adapter to `createPaymentGate(...)`, with a test or fixture proving production config cannot accidentally instantiate the gate without that adapter.

The broader route inventory still remains separate evidence unless every free/protected route is enumerated against its auth and payment reason.