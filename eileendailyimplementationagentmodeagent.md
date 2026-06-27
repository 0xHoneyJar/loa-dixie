# Eileen Daily Implementation Agent Mode Agent

This file is the repo-local runbook for the daily GPT-5.5 Thinking implementation agent. The daily agent prompt must explicitly read this file before editing this repo. This file is intentionally separate from `AGENTS.md`; it is a workflow contract for converting Daily Deep Research Report issues into additive implementation PRs.

## Repository responsibility

`0xHoneyJar/loa-dixie` owns governed BFF/API integration: auth, tenant/estate binding, SIWE/JWT, recall/admission route contracts, middleware fail-closed behavior, observability, and service-boundary enforcement.

This repo is not the place for Freeside product strategy, character/persona UX, Hounfour schema packages, Finn experiment verdicts, Aleph research-précis doctrine, Arcturus revenue-oracle logic, or Straylight doctrine beyond integration boundaries.

## Eligible input

Only implement from a Daily Deep Research Report issue or follow-up plan-audit issue/comment that contains:

- `PROPOSED_NEXT_LANE_SEED`
- candidate ID
- repo-fit reasoning
- acceptance criteria
- rollback path
- `VERDICT: ACCEPT_PLAN`

If the candidate lacks `VERDICT: ACCEPT_PLAN`, the agent may perform in-run plan audit only for docs, fixtures, tests, or checkers. Runtime/API behavior requires explicit external acceptance.

## Selection rule

Pick at most one candidate per run. Prefer work that strengthens route tests, fail-closed behavior, tenant/estate binding evidence, or observability without changing public route behavior.

Priority order:

1. docs-only service-boundary notes
2. fixture-only route examples
3. test-only negative coverage
4. checker/validator-only additions
5. default-off route or middleware helpers

## Additive-only policy

Nothing currently working may stop functioning.

Allowed by default:

- new docs
- new fixtures
- new tests
- new negative route tests
- new validators/checkers
- default-off helpers
- observability docs or test-only evidence

Forbidden without explicit Eileen approval:

- deleting files
- changing public API behavior by default
- changing auth/tenant binding semantics by default
- weakening middleware fail-closed behavior
- changing recall/admission route contracts without accepted plan
- production migrations
- broad refactors
- unrelated dependency upgrades
- secrets or real env changes
- sibling repo mutation
- deployment changes
- auto-merge
- closing source issues

## Dixie-specific stop conditions

Stop and return `VERDICT: NEEDS_HUMAN` if the candidate would:

- modify live auth or tenant/estate binding behavior by default
- change route response shape without explicit acceptance
- weaken fail-closed behavior
- bypass or reorder security middleware without proof
- duplicate Straylight or Hounfour ownership instead of consuming their contracts

## Implementation steps

1. Read this file, README/package scripts, and relevant docs near the target surface.
2. Inspect the source issue and confirm `VERDICT: ACCEPT_PLAN`.
3. Check for obvious duplicate open issues/PRs.
4. Write a short plan: selected candidate, implementation class, allowed files, forbidden surfaces, checks, rollback.
5. Create a branch named `daily-impl/YYYY-MM-DD-loa-dixie-<candidate>`.
6. Implement exactly one candidate with a minimal diff.
7. Run relevant checks from the repo.
8. Open a draft PR.
9. Add `CODEX AUDIT REQUEST` to the PR body.
10. Comment: `@codex review for additive-only scope violations, accidental API/auth behavior changes, fail-closed regressions, failing or missing tests, rollback clarity, repo-boundary violations, and security regressions`.
11. Do not merge and do not close the source issue.

## PR body requirements

The PR must include:

- source issue
- candidate ID
- implementation class
- what changed
- what did not change
- checks run
- skipped or failing checks
- rollback path
- Codex audit request

## Final run report

Report the selected repo, source issue, branch, PR URL, files changed, checks run, Codex review status, blockers, and whether any boundary was approached.
