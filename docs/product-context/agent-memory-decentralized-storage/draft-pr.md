# Draft PR Body — Dixie: Agent Memory + Decentralized Storage

> **Do NOT open this PR yet.** This file is a checked-in draft to be reviewed alongside PRD/SDD/sprint drafts. PR creation happens only after @deep-name signs off on the planning artifacts and is explicitly requested.

---

## Suggested PR title

```
[DRAFT][PROPOSAL] Dixie: Agent Memory + Decentralized Storage (Layer 5 product/BFF/oracle scope)
```

## Suggested branch

```
draft/proposal-agent-memory-decentralized-storage
```

## Suggested PR body

```md
# [DRAFT][PROPOSAL] Dixie: Agent Memory + Decentralized Storage

## Status

Draft planning artifacts only. **Do not merge.** Requesting @deep-name review before any implementation.

## Parent issue

- 0xHoneyJar/loa-dixie#89

## Linked cross-repo issues

- 0xHoneyJar/loa-hounfour#57 — shared schemas (memory artifact, reputation event, access policy, storage pointer, commitment, identity, credential, validation record)
- 0xHoneyJar/loa-finn#155 — runtime memory/storage/commitment behavior
- loa-freeside — **deferred** community-facing memory product feature, possibly agentic Discord/TG/admin/token-gated controls. No issue opened in this proposal.

## What this PR contains

Planning artifacts only, all under `docs/product-context/agent-memory-decentralized-storage/`:

- `draft-guardrails.md` — explicit scope rules for this draft
- `issue-map.md` — cross-repo ownership map
- `prd-draft.md` — Layer 5 product/BFF/oracle PRD
- `sdd-draft.md` — Layer 5 architecture, deferring runtime/schemas
- `sprint-plan-draft.md` — Sprint 0–6 (boundary review → shadow-mode)
- `draft-pr.md` — this file

The full research synthesis is mirrored in the workspace at `grimoires/loa/context/agent-memory-decentralized-storage/research-packet.md` (gitignored) and tracked at `docs/product-context/agent-memory-decentralized-storage-ai-legitimacy.md`. This PR does not modify either.

## What this PR does NOT contain

- No `app/src/` implementation changes.
- No `app/src/db/` migrations.
- No `web/` implementation changes.
- No `deploy/` changes.
- No `.claude/` System Zone edits.
- No `package.json` or lockfile changes.
- No middleware ordering change.
- No new local types in `app/src/types/` for memory/reputation/access/commitment/identity/credential.
- No chain-specific code or chain ID.
- No Discord/Telegram/admin/token-gated UI surface.
- No production behavior enabled.
- No edits to the canonical `grimoires/loa/prd.md`, `grimoires/loa/sdd.md`, or `grimoires/loa/sprint.md` (those still hold cycle-022 / Phase 3 artifacts).

## Cross-repo ownership proposal

| Repo | Proposed impact | Review needed |
|---|---|---|
| loa-main | None | Confirm no skill/command/eval/Bridgebuilder change is needed |
| loa-hounfour | Required (#57) | Confirm schema list in `sdd-draft.md` §5 |
| loa-finn | Required (#155) | Confirm endpoint list in `sdd-draft.md` §4 |
| loa-freeside | **Deferred** | Confirm later follow-up timing — NOT in this proposal |
| loa-dixie | Required | This PR |

## Rollout mode

- [x] Documentation/research only (this PR)
- [x] Disabled-by-default feature flag (after approval, Sprint 5)
- [x] Admin-only allowlist before broader exposure (Sprint 5)
- [x] Shadow mode (read-only) before enforcement (Sprint 5)
- [ ] Enforce mode (out of scope; future cycle)

## Open questions for @deep-name

1. **Q1 — Middleware ordering.** Memory-aware BFF responses may want governance evaluation *after* memory context loads. Keep ordering and constrain product behavior, propose an ordering RFC, or push entirely into Finn?
2. **Q2 — Provenance labels.** Return all ten research §22 labels, a curated subset, or treat the vocabulary as Hounfour-owned?
3. **Q3 — Access-policy preview.** Acceptable as a separate `access-preview` endpoint, or only ride along with the actual read?
4. **Q4 — Reputation aggregate scope.** Aggregate read only, or also signed validation records (which would grow Hounfour scope)?
5. **Q5 — Freeside boundary.** Confirm the community-facing memory product feature is a *future Freeside scope* and not a Dixie shadow-admin endpoint.

## Review checklist for @deep-name

- [ ] Repo ownership boundary correct (Dixie = Layer 5 product/BFF/oracle; Hounfour = schemas; Finn = runtime; Freeside = deferred).
- [ ] Hounfour #57 schema list in `sdd-draft.md` §5 is complete and correct.
- [ ] Finn #155 endpoint list in `sdd-draft.md` §4 is complete and correct.
- [ ] Provenance-label vocabulary scope decided (Q2).
- [ ] Access-policy preview endpoint shape decided (Q3).
- [ ] Reputation exposure scope decided (Q4).
- [ ] Freeside deferral confirmed (Q5).
- [ ] Middleware ordering question answered (Q1).
- [ ] Sprint sequencing confirmed: Hounfour → Finn → Dixie shadow.
- [ ] Stop conditions in `issue-map.md` understood.
- [ ] Approve or revise sprint plan before any `/run sprint-plan` invocation.

## Implementation gate

Implementation must not start until:

1. This draft PR is approved by @deep-name **or** @deep-name comments with the desired execution path.
2. Hounfour #57 lands and types are version-pinned.
3. Finn #155 ships shadow-mode endpoints reachable from Dixie staging.
4. Sprint 4 design lock is signed off.

Per project compliance: when implementation starts, use `/run sprint-plan` or `/run sprint-N`, not direct `/implement`.
```

---

## Suggested commit message (for the planning commit)

```
docs(dixie): draft agent-memory + decentralized-storage planning artifacts

Draft-only planning packet for the agent-memory-decentralized-storage
feature, scoped to Dixie's Layer 5 product/BFF/oracle responsibilities.

Adds under docs/product-context/agent-memory-decentralized-storage/:
- draft-guardrails.md — explicit scope rules
- issue-map.md — cross-repo ownership map
- prd-draft.md — Layer 5 scope only
- sdd-draft.md — defers runtime to Finn, schemas to Hounfour
- sprint-plan-draft.md — Sprint 0–6
- draft-pr.md — this PR body

All artifacts marked DRAFT pending @deep-name review.

No app/src implementation.
No app/src/db migrations.
No web implementation.
No deploy changes.
No .claude System Zone changes.
No package.json or lockfile changes.
No middleware ordering changes.
No Hounfour schema changes.
No new local types for memory/reputation/access/commitment/identity.
No edits to canonical grimoires/loa/{prd,sdd,sprint}.md (still cycle-022).

Parent issue: 0xHoneyJar/loa-dixie#89
Related issues:
- 0xHoneyJar/loa-hounfour#57
- 0xHoneyJar/loa-finn#155
Freeside follow-up deferred (not opened).

Pending @deep-name review before implementation.
```

---

## Pre-PR checklist (before opening the actual PR)

- [ ] Confirm with the user that @deep-name handle should be substituted in the live PR (this draft uses `@deep-name` per the user's instruction).
- [ ] Re-verify only `docs/product-context/agent-memory-decentralized-storage/` is staged: run `git status --short` and `git diff --stat`. Workspace-local copies under `grimoires/loa/context/agent-memory-decentralized-storage/` are gitignored and must not be staged.
- [ ] Confirm `app/package-lock.json` is unmodified vs HEAD (restored during the cleanup step).
- [ ] Confirm the canonical `grimoires/loa/prd.md`, `grimoires/loa/sdd.md`, `grimoires/loa/sprint.md` are unchanged.
- [ ] Confirm no Windows `*:Zone.Identifier` metadata files are staged.
- [ ] Branch off `main` to `draft/proposal-agent-memory-decentralized-storage`.
- [ ] Open as **DRAFT** (`gh pr create --draft`), not ready-for-review.
- [ ] Title prefix `[DRAFT][PROPOSAL]`.
- [ ] Request review from @deep-name only after the draft is open.
- [ ] Do not run `/run`, `/run-bridge`, `/ship`, or any deployment skill.

## Status

DRAFT pending @deep-name review. PR is **not** to be opened by this session.
