# Admission Wedge — Fixture / Probe Alignment Decision

> **Phase**: 33B
> **Date**: 2026-06-04
> **Title**: Admission Wedge Fixture / Probe Alignment Decision
> **Branch context**: `phase-33b-admission-wedge-fixture-probe-decision`
> **Related (loa-dixie)**: Phase 33A (Admission Wedge contract response /
> acceptance gate, PR #118), Phase 32E (Recall Wedge route contract), Phase 32F
> (readiness checkpoint — service-auth vs end-user authorization §7, public-bound
> minimization §8), Phase 32J/32K (seeded live estate design gate + default-off
> dev/operator seed), ADR-026C, ADR-026D, ADR-022E
> **Related (freeside-characters)**: Phase 45A (Dixie contract request / handoff,
> PR #160), Phase 45C (Dixie response reconciliation, PR #162), Phase 45D
> (contract reconciliation matrix / fixture-probe alignment gate, PR #163)
> **Status**: **docs / decision only** (33B) — code-inspection-grounded.
> **No implementation. No fixture JSON. No source code. No route. No storage
> writes. No admission writes. No auth implementation. No runtime behavior
> change. No live admission.** Decides *who* should own the first canonical
> Admission Wedge contract fixture/probe shape and *what minimum future probe
> set* that owner must produce. **Does not freeze a production schema.**

This document is the Dixie-side **decision** about fixture/probe ownership for a
future Admission Wedge contract. It answers one question — *should Dixie produce
the first canonical Admission Wedge contract fixture/probe shape, and if so, what
is the minimum future probe set?* — and stops there. It authorizes only a future
Phase 33C artifact; it implements no fixture, no probe, no validator, no route,
no storage, no auth, and no runtime behavior in this PR.

This phase **does not** implement admission, mount or design-to-mount a live
admission route, write to storage, change any source/test/fixture/config, add a
package export, register a Discord command, ingest Discord history, turn user
chat into memory, expose a public `remember-this`, wire Finn into production, or
freeze a production schema. It is a single new documentation artifact.

---

## 1. Phase title and status

- **Phase 33B — Admission Wedge fixture/probe alignment decision.**
- Dixie-side, **docs / decision only**.
- Follows Dixie **Phase 33A / PR #118** (Admission Wedge contract response /
  acceptance gate) and freeside-characters **Phase 45D / PR #163** (contract
  reconciliation matrix / fixture-probe alignment gate).
- **Does not implement fixture JSON.** No candidate/admission fixture file is
  written by this doc.
- **Does not implement source code, a route, storage, auth, runtime behavior,
  or live admission.** The only artifact produced is this Markdown file (plus,
  at most, a single minimal cross-reference back-note on the 33A response — §15).
- **Does not freeze a final production schema.** Every field, surface, and
  vocabulary item named below is directional and explicitly deferred to a later,
  separately-gated phase.
- Status: **docs / decision only**.

> **Phase-series note.** This Admission Wedge fixture/probe alignment decision
> continues the Dixie `33` series opened by Phase 33A. The freeside-characters
> repository maintains its own phase numbering (its `43B–45D` Admission Wedge
> sequence and its own `33A`); Dixie `33B` and any freeside-characters phase are
> independent labels in separate repositories and must not be conflated.
> Cross-repo phase numbering remains an open reconciliation item (33A §9).

---

## 2. Decision summary

**Decision: Dixie should own the first canonical Admission Wedge contract
fixture/probe shape.**

- **Dixie is the intended future intake / control-plane seam** for an Admission
  Wedge route or interface, and it already owns the Recall Wedge route/seam
  pattern at `POST /api/recall/intake`
  (`app/src/routes/recall-intake.ts`). It is therefore the natural owner of the
  *first canonical* contract probe.
- **freeside-characters should not invent the live contract vocabulary alone.**
  Its Phase 43C fixtures, Phase 44A reducer, and Phase 44C runner are valid
  **local proof labels**, not canonical live contract vocabulary; the
  freeside-characters Phase 45D matrix itself recommends a **Dixie-first**
  posture (its Option B / §11) and asks freeside-characters to wait for a
  Dixie-authored fixture/probe rather than guess.
- **This decision authorizes a future Phase 33C fixture/probe artifact only.**
  It does not authorize a route, storage, auth, runtime, or live admission.
- **Phase 33B itself implements no fixture/probe.** No fixture JSON, validator,
  or probe is written here. A small docs-only illustrative example would be
  added only if absolutely necessary — and it is **not** necessary: no existing
  Dixie docs-fixture convention exists to host one (see §13, "where should
  canonical fixtures live"), so **Phase 33B adds none**. Prefer no
  implementation.

The natural ownership split is the same BFF posture the Recall Wedge already
occupies and that 33A §3 assumed: **Dixie owns HTTP ingress, tenant/estate
binding, idempotency, refusal mapping, and no-leak projection; Straylight
(`@loa/straylight`) owns the admission *semantics*** (policy resolution, signer
competence, assertion lifecycle). The Recall Wedge ownership split is documented
at `docs/integration/phase-32e-recall-wedge-route-contract.md:15-33`; the route's
import discipline that enforces it (value-importing only the seam handler, all
contract types type-only) is at `app/src/routes/recall-intake.ts:30-42`. This
decision assumes — but does not commit to — that same split.

---

## 3. Source context

This decision is grounded in, and scoped entirely within, the accepted Admission
Wedge ladder. These artifacts are **evidence only**; Phase 33B modifies none of
them except for the single minimal cross-reference back-note named in §15.

Dixie:

- **Phase 33A / PR #118** — `docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md`. The
  Dixie contract response / acceptance gate: records what Dixie will **own**,
  **defer**, and **block**; accepts the *need* for a contract and a provisional
  **draft v0** vocabulary; explicitly does **not** freeze a production schema.
  Its §10 already pre-lists a future Phase 33B as "contract fixture / probe
  alignment."

freeside-characters:

- **Phase 45A / PR #160** — `docs/ADMISSION-WEDGE-DIXIE-CONTRACT-REQUEST.md`.
  The Dixie-side contract request / handoff: summarizes the local proof stack,
  carries the core invariant, and enumerates the A–J contract decisions for the
  Dixie / Straylight owners to define or accept later.
- **Phase 45C / PR #162** —
  `docs/ADMISSION-WEDGE-DIXIE-RESPONSE-RECONCILIATION.md`. The narrative
  reconciliation of the Dixie Phase 33A response against the Phase 45A request
  and the local proof stack.
- **Phase 45D / PR #163** —
  `docs/ADMISSION-WEDGE-CONTRACT-RECONCILIATION-MATRIX.md`. The field-level
  reconciliation matrix: converts the Phase 45C narrative into explicit
  vocabulary (§5), field/shape (§6), and A–J contract-area (§7) tables, and
  selects a **Dixie-first** next lane (its Option B / §11), recommending
  freeside-characters wait for a Dixie-authored fixture/probe.

> The freeside-characters matrix is read here as external evidence only. It is
> **not modified by this task**, and Phase 33B does not edit any
> freeside-characters file.

---

## 4. Why Dixie-first

The reconciliation evidence points to Dixie owning the first canonical
fixture/probe, for five reasons:

1. **Dixie is closer to the future live intake / control-plane boundary.** A
   future live Admission Wedge seam, if ever authorized, would sit where the
   Recall Wedge route already sits — at the Dixie HTTP/BFF ingress, not inside a
   Discord app. Dixie is the candidate live intake/control-plane owner; the
   fixture/probe that pins the contract should originate where the contract would
   live.
2. **Dixie already owns the Recall Wedge route/seam pattern.** `POST
   /api/recall/intake` (`app/src/routes/recall-intake.ts`) is the established
   precedent for ingress refusal classes, idempotency/replay, tenant/estate
   binding (`app/src/routes/recall-intake.ts:342-359`), and no-leak projection
   (`app/src/services/straylight-recall-intake/refusal-mapping.ts:177-209`). An
   admission fixture/probe should be modeled as the candidate-direction analogue
   of that established seam, authored by the same owner.
3. **freeside-characters local labels are valid proof labels, not canonical live
   contract vocabulary.** The Phase 43C fixtures / 44A reducer / 44C runner prove
   the invariant *in code* (per the 45D matrix §4), but the 45D matrix §5 shows
   that 8 of the 12 draft-v0 terms re-coin concepts that the upstream vocabulary
   already names. A canonical probe must speak the canonical names, which
   freeside-characters does not own.
4. **Straylight remains the canonical primitive / substrate owner where
   applicable.** Dixie is a *non-owning consumer* of the assertion-lifecycle
   vocabulary: it mirrors the canonical enums through local route-validation
   arrays (`AssertionStatus`, `SignerType`, `AssertionClass`, … at
   `app/src/routes/recall-intake.ts:84-146`) and takes Straylight contract types
   type-only (`app/src/routes/recall-intake.ts:30-42`). "Dixie-first" means Dixie
   *authors and hosts* the first canonical fixture/probe; it does **not** mean
   Dixie *coins* lifecycle status names. Where Straylight already has a canonical
   name, the canonical name wins.
5. **Dixie should not freeze the final schema alone, but should produce the first
   canonical fixture/probe proposal for cross-repo review.** The fixture/probe is
   a *proposal* that reconciles against canonical Straylight vocabulary and is
   reviewed cross-repo (freeside-characters reconciles its local labels against
   it afterward — §12). Authoring the first proposal is not the same as freezing
   a production contract; 33A §3 and §8 keep the schema explicitly unfrozen.

---

## 5. Preserved invariant

The load-bearing invariant is carried unchanged from 33A §4 / Phase 45A §4 /
Phase 45D §4. **A future fixture/probe alignment changes names and field shapes;
it never relaxes this invariant.**

1. **Candidate memory is not admitted memory.** A candidate is a proposal, not
   governed continuity.
2. **Candidate memory is not recallable before explicit admission.** A candidate
   must never appear in an ordinary recall result before an admission transition
   accepts it.
3. **An accepted transition creates or references an admitted assertion.**
   Acceptance is the *only* path from candidate to admitted; it is explicit,
   authority-bound, and auditable.
4. **A rejected candidate never becomes recallable.** Rejection is terminal for
   recall eligibility (subject only to a future, separately-gated
   appeal/correction path, never a silent reversal).
5. **Supersession / correction preserves auditability while ordinary recall
   includes only the corrected active assertion.** The prior (superseded) state
   remains available for audit/provenance but is excluded from ordinary recall.
6. **Fail-closed paths do not leak raw candidate / private payload.** On any
   error, rejection, or malformed input, the public response carries a stable
   reason code and a safe summary only — never the raw candidate body, private
   sentinels, internal store text, or operational identifiers.

This invariant is consistent with the Recall Wedge posture already in force on
the Dixie side: tenant/estate binding at ingress
(`app/src/routes/recall-intake.ts:342-359`), a fail-closed startup key gate
(`app/src/config.ts:286-289`), and the Phase 32K no-leak sanitization
(`app/src/services/straylight-recall-intake/refusal-mapping.ts:177-209`).

---

## 6. Minimum future Phase 33C fixture / probe set

If and when Phase 33C is opened, it must produce **at least** the following five
probe cases. This is the *smallest* set that exercises the full invariant
(candidate → accept → reject → supersede → fail-closed). Phase 33B defines the
set; **Phase 33B does not implement it.** Each case below is a *future*
fixture/probe requirement, not a fixture authored here.

### A. `candidate_pending_not_recallable`

- A candidate exists.
- No admission transition has occurred yet.
- No admitted assertion exists.
- Recall eligibility is **false** for the candidate.
- The public response is safe (no raw candidate payload).

### B. `accept_candidate_to_admitted_assertion`

- A candidate is accepted.
- The transition links the candidate to an admitted assertion.
- The admitted assertion becomes recall-eligible **under policy**.
- The public response does **not** echo the raw candidate payload.

### C. `reject_candidate_no_assertion`

- A candidate is rejected.
- **No** admitted assertion is minted.
- The candidate remains non-recallable.
- The public response is safe.

### D. `supersede_with_corrected_assertion`

- An old assertion is superseded.
- The corrected assertion is active.
- Ordinary recall includes the **corrected active assertion only**.
- The superseded assertion remains **audit / provenance only**.

### E. `malformed_or_unsafe_payload_fail_closed`

- A malformed / unsafe candidate input is presented.
- A **stable reason code** is returned.
- **No** raw payload, private sentinel, source material, or stack trace appears
  in the public response.

> These five cases map one-to-one onto the invariant in §5 and onto the five
> scenarios the freeside-characters proof stack already exercises locally (45D
> matrix §7). Phase 33C may add more cases, but must not produce fewer.

---

## 7. Minimum future Phase 33C schema surfaces

Phase 33C should *define* (not freeze, and not implement here) the following
fixture/probe surfaces. Each is a directional surface for a future alignment, not
a production schema:

- **Candidate envelope** — the proposed candidate intake shape.
- **Admission transition** — the explicit candidate → decision transition.
- **Admitted assertion** — the post-acceptance assertion shape.
- **Rejection transition** — the deny-path transition (mints no assertion).
- **Supersession / correction transition** — the follow-on transition over an
  already-admitted assertion.
- **Admission receipt / audit record** — the per-transition receipt with an
  explicit public-vs-audit boundary.
- **Recall eligibility projection** — the inclusion/exclusion projection over
  candidates and assertions.
- **Public-safe denial / fail-closed response** — the stable-reason-code, no-leak
  refusal shape.

Phase 33C **must not** freeze any of these as production contracts; it produces a
fixture/probe *proposal* for cross-repo review.

---

## 8. Required vocabulary decisions for Phase 33C

Phase 33C must **decide or explicitly defer** each of the following vocabulary
issues. (The reconciliation directions below restate 33A §6.1 and the
freeside-characters 45D matrix §5; they are *directions*, not frozen names.)

- **`candidate_pending` vs `proposed`.** The canonical `AssertionStatus` is
  `proposed` (`app/src/routes/recall-intake.ts:84-146`); decide whether the
  probe adopts `proposed` rather than minting `candidate_pending`.
- **`admitted` vs `assertion_admitted` / active assertion.** There is no bare
  `admitted` status upstream; the *act* is the audit event `assertion_admitted` /
  transition `admit_assertion`, and the resulting *status* is `active`. Decide
  how the probe splits act from status.
- **`rejected` / `candidate_rejected` / `candidate_not_admitted` vs the
  `transition_denied`-family.** Decide whether to anchor rejection on the audit
  event `transition_denied` rather than coin a parallel `rejected` status.
- **`candidate_not_admitted` pending-vs-denied distinction.** Decide whether
  "pending, not yet decided" deserves a distinct code from "denied" — collapsing
  it to `transition_denied` would erase the pending-vs-denied nuance the 45D
  matrix §5 flagged.
- **`superseded` as assertion status / audit prior state.** `superseded` is an
  exact canonical `AssertionStatus` match; decide it is adopted as-is and cited
  to Straylight, not coined Dixie-side.
- **`corrected_active` as pair / direction, not necessarily a status.** There is
  no `corrected` status upstream; decide whether to express correction as the
  (`superseded` → `active`) transition pair plus a supersede link.
- **`unsupported_admission_shape` vs the existing `invalid_request` /
  `class_validation_failed` family.** The existing Dixie refusal analogues are
  `ingress.invalid_request` / `seam.class_validation_failed`
  (`app/src/services/straylight-recall-intake/refusal-mapping.ts:10-33`); decide
  whether the admission shape-failure code is named after that family.
- **`unsafe_candidate_payload_projection` vs the no-leak / unsafe-projection
  family.** Decide whether the no-leak code grounds in the existing Phase 32K
  no-leak posture rather than a third naming style.

---

## 9. Required field decisions for Phase 33C

Phase 33C must **decide or explicitly defer** each of the following field issues.
None is decided here; this is the list a future alignment must resolve:

- **Tenant / estate / actor binding.** Confirm session-derived, not
  caller-supplied (mirroring `app/src/routes/recall-intake.ts:342-359`).
- **Candidate id and idempotency key semantics.** Decide candidate-id-keyed vs
  header-keyed (`Idempotency-Key`) vs both. The 45D matrix §6.1 flags the absence
  of an idempotency key as a real gap in the local fixtures.
- **`source_kind` / `source_ref` public-vs-audit boundary.** Decide which source
  references are public-safe and which belong on the audit boundary.
- **Proposed assertion class and canonical `AssertionClass` validation.** Decide
  that the proposed class validates against the canonical 16-member union
  (`app/src/routes/recall-intake.ts:84-146`) rather than a parallel list.
- **Admission authority and `SignerType` alignment.** Decide which `SignerType`
  (`actor_controller, operator, runtime, reviewer, policy_service, admin, wallet,
  service_key` — `app/src/routes/recall-intake.ts:84-146`) the admission authority
  binds to; the 45D matrix §6.2 flags `operator_dev_synthetic` as not a
  `SignerType` member.
- **Admitted assertion id derivation or reference rules.** Decide how the
  assertion id is derived from or references the candidate/transition.
- **Assertion status / admission state relationship.** Decide whether the probe
  retires the redundant `admission_state = admitted` compound in favor of
  canonical `active`.
- **Recall eligibility representation.** Decide whether eligibility is binary or
  "eligible **under policy**" plus a `RecallUseInstruction`-style signal
  (`usable | mark_as_contested | use_as_background_only | do_not_use_for_action`).
- **Receipt id / audit id / public-private split.** Decide the receipt field
  inventory and which fields are public-safe vs audit-only.
- **Safe public reason codes.** Decide the stable reason-code vocabulary, grounded
  in the existing `ingress.*` / `guard.*` / `seam.*` refusal family
  (`app/src/services/straylight-recall-intake/refusal-mapping.ts:10-33`).
- **No-leak response shape.** Decide the explicit admission public/audit split
  rather than inherit the recall `raw_reasons` split by default — the recall
  posture is nuanced (only `seam.storage_unavailable` omits `raw_reasons` from the
  public body; every other denial keeps them —
  `app/src/services/straylight-recall-intake/refusal-mapping.ts:177-209`).

---

## 10. What Phase 33B does not authorize

This decision explicitly **blocks** all of the following. None is authorized,
implied, or unblocked by this document:

- **Phase 33C implementation in this PR.**
- **Source code.**
- **A route / API handler.**
- **Storage / migration.**
- **Auth implementation.**
- **Live admission.**
- **Production admission.**
- **Production storage.**
- **Production auth / consent.**
- **A public `remember-this`.**
- **Discord history ingestion.**
- **User chat becoming memory.**
- **A Discord command.**
- **freeside-characters runtime changes.**
- **Package exports.**
- **LLM / voice behavior.**
- **Finn production wiring.**
- **Forget / revoke / correction UI.**
- **Any final production schema freeze.**

To be unambiguous about current reality (code-grounded): Dixie today exposes a
**recall** route (`POST /api/recall/intake`) that is read-only, default-off, and
fail-closed; it has **no admission route, no admission concept in route code, and
no production storage** — admission semantics live upstream in `@loa/straylight`
(`app/src/routes/recall-intake.ts`). The only recall-side store is the in-process,
non-durable `BoundedEstateStore`
(`app/src/services/straylight-recall-intake/bounded-estate-store.ts`); no admission
store exists at all. The dev-seeded estate is dev/operator-only, default-off,
synthetic, and stores no secret, private key, live id, token, URL, or signature
(`app/src/services/straylight-recall-intake/dev-seeded-estate.ts:12-50`).

---

## 11. Recommended future Phase 33C

**Selected: Phase 33C — Admission Wedge canonical fixture/probe draft.**

This is the future phase that would *act on* this decision by producing the first
canonical fixture/probe set (§6) over the schema surfaces (§7), resolving the
vocabulary (§8) and field (§9) decisions against canonical Straylight vocabulary.
It is **listed and recommended, not authorized to start here**; it requires its
own separately-gated design / review / audit.

**Allowed future Phase 33C scope (bounded narrowly):**

- **docs-only, or docs + non-runtime fixture/probe files.**
- **No route / API handler.**
- **No storage writes.**
- **No auth implementation.**
- **No live calls.**
- **No package exports.**
- **May include a validator / test only if isolated and non-runtime** (e.g. a
  dependency-free shape/no-leak validator with no live route and no storage,
  mirroring the freeside-characters Phase 43C validator pattern).
- **Must keep the public / private no-leak split explicit.**
- **Must be audited by Codex before any PR.**

**Explicitly NOT authorized for Phase 33C** (carried from §10): a live route,
storage writes, auth/consent implementation, live admission, production
admission/storage/auth, a public `remember-this`, Discord history ingestion,
user chat becoming memory, a Discord command, freeside-characters runtime
changes, package exports, LLM/voice, Finn production wiring, forget/revoke/
correction UI, or a final schema freeze.

---

## 12. Cross-repo implication for freeside-characters

- **freeside-characters should wait for Dixie Phase 33C before mutating its local
  fixtures / reducer / runner labels.** The 45D matrix §9 already records this:
  do not rename local fixture labels, mutate fixture JSON, or change reducer
  reason codes yet. A Dixie-authored canonical fixture/probe gives
  freeside-characters a canonical shape to reconcile against rather than a guess.
- **freeside-characters may then do a later reconciliation / adaptation phase**
  (its own Option A / Phase 45E-style alignment), reconciling its local proof
  labels to the canonical fixture/probe once Phase 33C exists.
- **freeside-characters must not build `/remember-this` or live command behavior
  from the current local proof labels alone.** The local labels are proof labels,
  not a live contract; the live contract is owned upstream and remains unfrozen.

This document does not edit freeside-characters and decides nothing on its behalf;
it only records the Dixie-side ownership decision that the freeside-characters
45D matrix anticipated.

---

## 13. Open questions

These remain open and are inputs to Phase 33C (not resolved here):

- **Should Phase 33C be docs-only fixtures or an executable validator/test?**
  (§11 allows an isolated, non-runtime validator/test at most.)
- **Where should canonical fixtures live in Dixie?** No `docs/admission-wedge` or
  `docs/recall-wedge` fixture directory exists in Dixie today; Phase 33C must
  choose a location (and a docs-fixture convention) rather than assume one.
- **Should Straylight own the canonical primitive vocabulary before Dixie fixes
  names?** Dixie is a non-owning consumer of lifecycle vocabulary; the
  fixture/probe must defer to Straylight-owned names where they exist.
- **What is the minimum receipt shape?** (Receipt id, decision time, authority
  actor, policy reason, candidate ref, outcome ref, eligibility result,
  public-safe summary, audit boundary — field inventory open, §9.)
- **What public response fields are allowed?** (The explicit admission
  public/audit split is open — §9, 33A §9.10.)
- **What private audit fields are required?**
- **How should idempotency work?** (Candidate-id-keyed vs header-keyed vs both —
  §9.)
- **Which actor signs admission?** (Which `SignerType` may admit which
  `AssertionClass` — §9.)
- **How should end-user authorization be represented separately from service
  auth?** (Service auth is not end-user consent —
  `docs/integration/phase-32f-recall-wedge-readiness-checkpoint.md:§7`.)
- **How to handle correction / supersession vs a future forget / revoke path?**
  (Forget/revoke/correction UI remains out of scope — §10.)

---

## 14. Success criteria

This Phase 33B succeeds if **all** of the following hold:

- it **clearly selects Dixie-first fixture/probe ownership** (§2, §4);
- it **defines the minimum future Phase 33C probe set** (§6) and schema surfaces
  (§7);
- it **does not implement Phase 33C** — no fixture JSON, no validator, no probe,
  no code is produced here;
- it **keeps all live / runtime lanes blocked** (§10);
- **Codex confirms docs / decision-only scope.**

---

## 15. Cross-references

> **Phase 33C status note (added later).** Phase 33C acted on this decision and
> authored the first **draft v0** Admission Wedge contract probes at
> `docs/admission-wedge/fixtures/` (five probe JSONs + an isolated, dependency-free
> validator + a README). It remains **non-runtime**: it implements **no** live
> route, storage, auth, or admission behavior, and it does **not** freeze a
> schema. Future Freeside Characters reconciliation against these probes remains a
> separate, separately-gated effort.

- `docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md` — Dixie Phase 33A contract response
  / acceptance gate (PR #118). Its §10 pre-listed this Phase 33B as "contract
  fixture / probe alignment"; this doc is that decision. Gains a single minimal
  Phase 33B cross-reference back-note.
- `docs/integration/phase-32e-recall-wedge-route-contract.md` — governing Dixie
  Recall Wedge route contract; the BFF / Straylight ownership split this decision
  assumes for a future admission seam.
- `docs/integration/phase-32f-recall-wedge-readiness-checkpoint.md` — §7
  service-auth vs end-user authorization and §8 public-bound minimization remain
  in force for any future admission work.
- `docs/RECALL-WEDGE-SEEDED-LIVE-ESTATE-STORAGE-DESIGN.md` — seeded-live-estate
  design gate (32J) + default-off dev/operator seed (32K); the source for "no
  production storage / no production admission" reality (§10).
- `app/src/routes/recall-intake.ts` — recall route entrypoint; import discipline
  (lines 30-42), canonical enum const arrays (lines 84-146), tenant guard
  (lines 342-359). **Inspected read-only; not modified.**
- `app/src/services/straylight-recall-intake/refusal-mapping.ts` — Dixie-local
  refusal classes (lines 10-33) and the Phase 32K no-leak sanitization
  (lines 177-209). **Inspected read-only; not modified.**
- `app/src/services/straylight-recall-intake/bounded-estate-store.ts` /
  `app/src/services/straylight-recall-intake/dev-seeded-estate.ts` /
  `app/src/config.ts` — in-process non-durable store, default-off synthetic
  dev/operator seed, and the fail-closed startup key gate; the basis for "no
  production storage / synthetic seed / not production admission" (§10).
  **Inspected read-only; not modified.**
- `../freeside-characters/docs/ADMISSION-WEDGE-CONTRACT-RECONCILIATION-MATRIX.md`
  — freeside-characters Phase 45D matrix (PR #163); the external evidence whose
  Dixie-first recommendation (its Option B / §11) this decision adopts. **Read
  only; not modified, and not editable from this task.**
- `@loa/straylight` (type-pinned dependency) — semantic owner of the assertion
  lifecycle and recall/admission policy; the canonical vocabulary referenced in
  §8 is Straylight-owned. Dixie consumes and mirrors it and does not coin
  parallel names.
- ADR-022E (durable-store gate, still held), ADR-026C / ADR-026D
  (capability/route guardrails) — any future admission storage/route must clear
  these.
