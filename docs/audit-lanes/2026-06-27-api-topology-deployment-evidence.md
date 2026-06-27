# Audit lane: API topology, protocol version, and deployment evidence

## Purpose

This draft PR distills Dixie endpoint topology, middleware count, fleet status, protocol version, dependency provenance, root/app validation, health, docs parity, and deployment-evidence issues into one implementation lane. It is a routing artifact and does not claim the fixes are complete yet.

## Issue coverage

Refs #209, #210, #212, #213, #214, #215, #218, #219, #220, #224, #225, #227, #228, #229, #232, #233, #234, #235, #237, #238, #239, #240, #243, #244, #245.

## Preserved state

Preserve current Dixie gateway/API behavior while making route topology, protocol compatibility, dependency provenance, docs parity, and deployment evidence verifiable.

## Target

Establish generated or checked evidence for endpoint counts, middleware inventory, route status, protocol version alignment, dependency refs, root/app validation boundaries, health output, and deployment smoke checks.

## Expected artifacts

Likely scope includes README/API docs, route inventory scripts, app package metadata, health/readiness tests, dependency provenance policy, validation scripts, and deployment smoke docs.

## Allowed scope

Allowed: focused docs, scripts, tests, metadata, and health/readiness evidence. Not allowed: route/payment enforcement changes owned by the companion route/payment lane.

## Decision

Use one API evidence PR because these issues share one root contract: Dixie’s advertised API and deployment posture should be generated, version-aligned, and testable.

## Rollback

Rollback is the closing PR revert; implementation commits should keep docs/checks and metadata changes contained.

## Non-claims

This lane does not certify the payment gate and does not close issue references until implementation evidence is present.