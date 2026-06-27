# Audit lane: x402 and route protection enforcement

## Purpose

This draft PR distills Dixie payment-gate, free-route, route-boundary, auth-coverage, and route-policy issues into one implementation lane. It is a routing artifact and does not claim the fixes are complete yet.

## Issue coverage

Refs #206, #207, #208, #211, #216, #217, #221, #222, #223, #226, #230, #231, #236, #241, #242.

## Preserved state

Preserve current Dixie gateway/API behavior outside the named payment and route-protection surfaces.

## Target

Replace ambiguous payment/header and free-prefix behavior with declared route policy, validation-backed enforcement, auth coverage evidence, and a payment behavior matrix.

## Expected artifacts

Likely scope includes `app/src/middleware/payment.ts`, route policy inventory, route/middleware tests, payment-mode docs, and auth coverage tests.

## Allowed scope

Allowed: focused gateway middleware code, policy fixtures, tests, and docs. Not allowed: unrelated endpoint topology, protocol-version, dependency-provenance, or deployment-readiness work.

## Decision

Use one route/payment PR because these issues share one root contract: protected Dixie routes must have explicit auth/payment semantics and verifiable enforcement modes.

## Rollback

Rollback is the closing PR revert; implementation commits should keep route/payment behavior changes contained.

## Non-claims

This lane does not certify the whole API surface and does not close issue references until implementation evidence is present.