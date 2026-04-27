# Sprint Plan Draft — Dixie: Agent Memory + Decentralized Storage

**Status**: DRAFT. Planning only. Pending @deep-name review before any sprint starts.
**Feature slug**: `agent-memory-decentralized-storage`
**Date**: 2026-04-27
**Companion**: `prd-draft.md`, `sdd-draft.md`, `issue-map.md`

> No sprint below should start until @deep-name approves this draft and the open questions Q1–Q5 are resolved. Each sprint has an explicit gate to the next.

---

## Sprint 0 — Boundary review (this draft)

**Goal**: get @deep-name to lock cross-repo ownership and answer Q1–Q5.

**Tasks (planning artifacts only — no code)**

| # | Task | Owner | Output | Acceptance |
|---|---|---|---|---|
| 0.1 | Issue map drafted | Dixie planner | `issue-map.md` | Reviewed in PR comment |
| 0.2 | PRD drafted (Layer 5 scope) | Dixie planner | `prd-draft.md` | Reviewed in PR comment |
| 0.3 | SDD drafted (Layer 5 scope) | Dixie planner | `sdd-draft.md` | Reviewed in PR comment |
| 0.4 | Sprint plan drafted | Dixie planner | this file | Reviewed in PR comment |
| 0.5 | Draft PR opened, marked DRAFT, no merge | Dixie planner | PR body | @deep-name review requested |
| 0.6 | Q1–Q5 answered in PR | @deep-name | PR comment | Recorded in `prd-draft.md` revision |

**Gate to Sprint 1**: @deep-name approves PRD/SDD/sprint and confirms Hounfour #57 must land before Dixie work.

**Stop conditions**: any of the six stop conditions in `issue-map.md` is triggered.

---

## Sprint 1 — Hounfour protocol decision (blocked by Hounfour #57)

**Goal**: Hounfour publishes the shared types Dixie/Finn will consume.

**Owner**: Hounfour. Dixie is a *consumer*, not an author.

**Dixie-side work in this sprint**: zero implementation. Only a tracking comment on `loa-dixie#89` confirming the published types match the SDD §5 list, and capturing version pinning.

**Gate to Sprint 2**: Hounfour types published, version pinned, conformance vectors available.

---

## Sprint 2 — Finn runtime decision (blocked by Finn #155)

**Goal**: Finn publishes shadow-mode runtime endpoints behind a feature flag.

**Owner**: Finn. Dixie is a *consumer*.

**Dixie-side work in this sprint**: zero implementation. Only a verification that Finn exposes the four endpoints assumed in SDD §4 (memory artifact metadata read, access-policy evaluation, reputation aggregate read, authoring-mode signal). If any are missing, the corresponding Dixie surface is dropped from Sprint 4 — escalate to @deep-name rather than synthesize locally.

**Gate to Sprint 3**: Finn shadow endpoints reachable from the Dixie staging environment via existing FinnClient.

---

## Sprint 3 — Freeside distribution decision (deferred)

**Goal**: Decide whether and when a Freeside community-facing memory product feature, possibly agentic Discord/TG/admin/token-gated controls, opens an issue.

**Default outcome of this sprint**: deferred to a later cycle. The Freeside issue is **not** opened during Sprint 3 unless @deep-name explicitly directs it.

**Dixie-side work in this sprint**: capture the deferral as a vision/registry candidate per `MAY allocate time for Vision Registry exploration`. No code, no Freeside issue creation by default.

**Gate to Sprint 4**: explicit @deep-name go-ahead on the Dixie shadow surface.

---

## Sprint 4 — Dixie product surface design finalization

**Goal**: lock the exact route/middleware/response shapes for the read-only oracle/BFF surface, after Hounfour and Finn have landed.

**Tasks (still planning, no code)**

| # | Task | Acceptance |
|---|---|---|
| 4.1 | Confirm route additions per SDD §3 (`memory` read view, `memory/access-preview`, `reputation` aggregate decoration, `agent` capability extension) — drop any whose Finn dependency is unmet. | Route list signed off by @deep-name |
| 4.2 | Lock the provenance-label vocabulary (Q2 outcome). | Vocabulary file or Hounfour reference |
| 4.3 | Confirm middleware ordering is unchanged (Q1 outcome). | Explicit "no ordering change" sign-off |
| 4.4 | Define feature-flag name and admin-allowlist mechanism (reusing existing patterns). | Flag and allowlist documented |
| 4.5 | Update `docs/product-context/` boundary doc to reflect any Q1–Q5 answers. | Docs PR-ready (still draft) |

**Gate to Sprint 5**: @deep-name approves the locked design.

---

## Sprint 5 — Shadow-mode implementation (only after approval)

**Goal**: implement the smallest read-only, admin-allowlist-only, feature-flagged slice.

**Pre-conditions (all must be true)**:

- Hounfour types published and pinned.
- Finn shadow endpoints reachable from Dixie staging.
- Sprint 4 design locked and signed off.
- `/run sprint-plan` or `/run sprint-N` is invoked (per project compliance rule), not direct `/implement`.

**Implementation scope (subject to design lock in Sprint 4)**:

- Add the locked routes behind a disabled-by-default feature flag.
- Add the provenance-label assembly function and tests.
- Wire to FinnClient through the existing proxy.
- Add the architectural conformance test that no Hounfour-owned type is locally redefined.
- **No** middleware ordering change. **No** new auth mechanism. **No** DB migration. **No** schema change in `app/src/types/`. **No** chain-specific code.

**Out of scope**:

- Any `web/` change.
- Any `deploy/` change.
- Any production traffic.

**Gate to Sprint 6**: implementation complete, tests pass, feature flag confirmed default-off.

---

## Sprint 6 — Review, audit, eval (only after implementation)

**Goal**: pass Loa quality gates per `.claude/loa/CLAUDE.loa.md`.

**Tasks**

| # | Skill | Output |
|---|---|---|
| 6.1 | `/review-sprint sprint-5` | `grimoires/loa/a2a/<sprint-id>/engineer-feedback.md` |
| 6.2 | `/audit-sprint sprint-5` | `grimoires/loa/a2a/<sprint-id>/auditor-sprint-feedback.md` and `COMPLETED` |
| 6.3 | `/eval --suite framework` (and `--suite regression` if relevant) | Eval report |
| 6.4 | Bridgebuilder review of the implementation PR | PR comment |
| 6.5 | Optional `/run-bridge --depth N` only after the above pass | Iteration history |

**Gate to merge**: COMPLETED marker present, audit findings addressed or explicitly deferred with @deep-name approval.

---

## Sprint 7+ — Beta and beyond (out of scope here)

Allowlist beta, default-on, Freeside community-facing follow-up, additional Hounfour schema work — all out of scope for this proposal. New cycle, new PRD.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Hounfour types diverge from SDD §5 list | Update SDD; do not redefine types in Dixie. |
| Finn endpoints incomplete at Sprint 2 gate | Drop the corresponding Dixie surface; escalate to @deep-name. |
| Middleware ordering pressure | Treat as a separate RFC; do not change ordering inside this proposal. |
| Scope creep into community surfaces | Reject; route to Freeside follow-up. |
| Chain-specific code creeps in | Stop condition: any chain ID or chain-name in Dixie code triggers review. |
| LLM-on-chain misframing in copy | Linted by docs-review checklist; research packet §19 is the canonical framing. |

---

## Status

DRAFT pending @deep-name review. No sprint starts until Sprint 0 gate is closed.
