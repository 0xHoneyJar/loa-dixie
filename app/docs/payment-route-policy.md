# Payment Route Policy — x402 Gate

> Audit lane: `docs/audit-lanes/2026-06-27-route-payment-enforcement`
> Issues: #206, #208, #217, #222, #223, #230, #236, #242

The x402 payment gate (`app/src/middleware/payment.ts`) is Dixie's
highest-risk boundary: it sits between economic policy and protected API
execution. This document is the policy record for that boundary — route
classification, behavior matrix, and evidence pointers.

## Position in the governance pipeline

Per [ADR-001](adr/001-middleware-pipeline-ordering.md), the payment gate is
position 12 of the middleware pipeline:

```
... -> rateLimit (10) -> allowlist (11) -> payment (12) -> convictionTier (13) -> routes
```

Community membership (allowlist) gates economic access (payment), which gates
capability access (routes). The free-route policy below is a **payment-layer
exemption only** — it never bypasses rate limiting, the allowlist gate, or a
route's own auth guards.

## Free-route classification

The single source of truth is `FREE_ROUTE_POLICY` in
`app/src/middleware/payment.ts`. Everything not listed is payment-protected
(default-deny).

| Prefix | Why payment-free | Independent guards that still apply |
|--------|------------------|-------------------------------------|
| `/api/health` | Liveness/readiness probes must work before payment negotiation | rate limit; admin key on `/api/health/governance` |
| `/api/auth/` | SIWE auth + JWKS must be reachable pre-payment to establish identity | rate limit; SIWE signature verification |
| `/.well-known/` | Public discovery metadata | rate limit |
| `/api/admin/` | Operator surface; billing operator actions is meaningless | admin key (constant-time comparison); rate limit |
| `/api/reputation/` | Reputation query bridge consumed by loa-finn | allowlist; builder+ conviction tier; admin key on `/population`; rate limit |
| `/api/identity/` | Identity read needed by clients before payment negotiation | allowlist; JWT wallet extraction; rate limit |

**Payment-free never means guard-free.** Every prefix above has explicit
auth-coverage tests in
`app/tests/unit/middleware/free-route-auth-coverage.test.ts`; adding a new
free prefix without a coverage entry fails CI.

## Route-boundary matching

Free-prefix classification uses `matchesRoutePrefix`
(`app/src/utils/route-prefix.ts`), which:

- percent-decodes and normalizes the path (duplicate slashes, `.`/`..`
  segments, trailing slashes),
- requires an exact match or a `/` route-boundary match
  (`/api/health` matches `/api/health/governance`, never `/api/healthzzz`),
- fails **closed** (protected) for unclassifiable paths (malformed encoding,
  NUL bytes).

The same matcher guards the allowlist skip list — raw `startsWith` matching
previously let `/api/autonomous` inherit the `/api/auth` allowlist skip.

Boundary evidence: `app/tests/unit/utils/route-prefix.test.ts` and the
"route-boundary matching" suite in
`app/tests/unit/middleware/payment.test.ts`.

## Payment behavior matrix

| # | Case | Config | Request | Result | Evidence (test) |
|---|------|--------|---------|--------|-----------------|
| 1 | Gate disabled | `x402Enabled=false` (default) | any | pass-through (noop) | `payment.test.ts` "disabled (default)" |
| 2 | Free route | enabled | `GET /api/health`, no header | pass-through | `payment.test.ts` "allows free routes without payment" |
| 3 | Protected, no header | enabled | `GET /api/chat` | `402 payment_required` | `payment.test.ts` |
| 4 | Protected, rejected header | enabled, validator returns false | `x-payment: bad` | `402 invalid_payment` | `payment.test.ts` |
| 5 | Protected, accepted header | enabled, validator returns true | `x-payment: good` | pass-through | `payment.test.ts` |
| 6 | Validator unavailable | enabled, validator throws | `x-payment: any` | `503 payment_validation_unavailable` (fail closed) | `payment.test.ts` |
| 7 | Production, no facilitator URL | `nodeEnv=production`, no URL | — | startup throw (fail closed) | `payment.test.ts` |
| 8 | Production, no validator | `nodeEnv=production`, no `validatePaymentHeader` | — | startup throw (fail closed) | `payment.test.ts` "fails closed in production" |
| 9 | Real app wiring | `createDixieApp` | `x-payment` on `/api/chat` | header + path forwarded to `SettlementClient.validatePaymentHeader` | `server-payment-wiring.test.ts` |
| 10 | Near-prefix path | enabled, allowlisted key | `GET /api/healthzzz` | `402` (protected; boundary holds) | `free-route-auth-coverage.test.ts` |

## Production wiring

`createDixieApp` (`app/src/server.ts`) always constructs the payment gate with
a settlement-backed validator:

```ts
app.use('/api/*', createPaymentGate({
  x402Enabled: config.x402Enabled,
  x402FacilitatorUrl: config.x402FacilitatorUrl,
  nodeEnv: config.nodeEnv,
  validatePaymentHeader: (paymentHeader, { path }) =>
    settlementClient.validatePaymentHeader({ paymentHeader, path }),
}));
```

`SettlementClient.validatePaymentHeader` posts to the Freeside facilitator
(`/api/settlement/validate-payment`). Evidence:
`app/tests/unit/services/settlement-client-payment-validation.test.ts` and
`app/tests/unit/server-payment-wiring.test.ts`.

## Non-production (dev/shadow) semantics

When `nodeEnv !== 'production'` and no `validatePaymentHeader` is supplied,
an enabled gate checks only for payment-header **presence**. This is
development/shadow behavior for local iteration — it is **not** payment
validation and **not** settlement evidence. Production enablement fails
closed at startup unless both a facilitator URL and a validator are
configured (matrix rows 7–8).

## Change control

Payment-gate changes are high-risk. PRs touching
`app/src/middleware/payment.ts`, `app/src/utils/route-prefix.ts`, or the
`createPaymentGate` call site in `app/src/server.ts` must include the
payment-evidence section of the PR template (behavior-matrix test run output).
