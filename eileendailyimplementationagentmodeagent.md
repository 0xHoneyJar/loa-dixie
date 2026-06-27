# Eileen Daily Implementation Agent Mode Agent

This repo-local runbook must be read by the daily GPT-5.5 Thinking implementation agent before editing `0xHoneyJar/loa-dixie`. The agent must decide what should be implemented and why before coding, then write a PR report that traces every commit/file change back to repo value, scaling, security, and simplicity.

## Repository responsibility

`loa-dixie` owns governed BFF/API integration: auth, tenant/estate binding, SIWE/JWT, recall/admission route contracts, middleware fail-closed behavior, observability, and service-boundary enforcement.

It must not own Freeside product strategy, character/persona UX, Hounfour schema packages, Finn experiment verdicts, Aleph research-précis doctrine, Arcturus revenue-oracle logic, or Straylight doctrine beyond integration boundaries.

## Eligible input

Implement only from a Daily Deep Research Report or plan-audit item with `PROPOSED_NEXT_LANE_SEED`, candidate ID, repo-fit reasoning, acceptance criteria, rollback path, and `VERDICT: ACCEPT_PLAN`.

Without `VERDICT: ACCEPT_PLAN`, the agent may self-audit only docs, fixtures, tests, or checkers. Runtime/API behavior requires explicit external acceptance.

## Required pre-implementation thesis

Before editing, write and preserve this analysis:

1. candidate issue, candidate ID, and verdict
2. what should be implemented
3. why it should be implemented now
4. why it belongs in Dixie and not a sibling repo
5. what this is good for
6. why the implementation path should work
7. how it advances Dixie's endgame as a governed BFF/API integration layer
8. creative future paths not implemented now
9. mass-user scaling impact for API load, tenant isolation, route latency, rate limits, observability, and operational failure modes
10. security scope for auth, wallet/session binding, tenant/estate boundaries, recall/admission routes, middleware order, and public/private response boundaries
11. simplicity argument: how the design avoids fragile middleware or route complexity
12. non-goals, forbidden surfaces, checks, and rollback

If this thesis is weak, do not implement.

## Additive-only policy

Allowed by default: new docs, fixtures, tests, negative route tests, validators/checkers, default-off helpers, and observability evidence.

Forbidden without explicit Eileen approval: deleting files, changing public API behavior by default, changing auth/tenant binding semantics by default, weakening fail-closed behavior, changing recall/admission contracts without accepted plan, production migrations, broad refactors, unrelated dependency upgrades, secrets/env changes, sibling repo mutation, deployment changes, auto-merge, or closing source issues.

## Dixie-specific stop conditions

Stop with `VERDICT: NEEDS_HUMAN` if the candidate modifies live auth or tenant/estate binding by default, changes route response shape without acceptance, weakens fail-closed behavior, bypasses/reorders security middleware without proof, or duplicates Straylight/Hounfour ownership instead of consuming their contracts.

## Implementation steps

1. Read this file, README/package scripts, and nearby docs.
2. Confirm `VERDICT: ACCEPT_PLAN`.
3. Check for duplicate open issues/PRs.
4. Write the required pre-implementation thesis.
5. Create branch `daily-impl/YYYY-MM-DD-loa-dixie-<candidate>`.
6. Implement exactly one candidate with minimal diff.
7. Prefer explicit route tests and checks over clever abstractions.
8. Run relevant checks.
9. Open a draft PR.
10. Add `CODEX AUDIT REQUEST` and the traceability report.
11. Comment: `@codex review for additive-only scope violations, accidental API/auth behavior changes, fail-closed regressions, scaling risks, security regressions, unnecessary complexity, failing or missing tests, rollback clarity, and repo-boundary violations`.
12. Do not merge or close the source issue.

## Required PR traceability report

Every implementation PR must include source issue and candidate ID, pre-implementation thesis summary, file-by-file change rationale, why each changed file is good for Dixie, why it advances the repo endgame, why it should work, mass-user scaling analysis, security scope, simplicity analysis, tests/checks, skipped checks, rollback path, future creative paths not implemented, and `CODEX AUDIT REQUEST`.
