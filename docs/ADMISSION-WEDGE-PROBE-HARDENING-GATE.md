# Admission Wedge — Probe Hardening / Contract Vocabulary Refinement Gate

> **Phase**: 33D
> **Date**: 2026-06-05
> **Title**: Admission Wedge Probe Hardening / Contract Vocabulary Refinement
> Gate
> **Branch context**: `phase-33d-admission-wedge-probe-hardening-gate`
> **Related (loa-dixie)**: Phase 33A (Admission Wedge contract response /
> acceptance gate, PR #118), Phase 33B (fixture/probe ownership decision,
> PR #119), Phase 33C (canonical fixture/probe draft, PR #120), Phase 32E
> (Recall Wedge route contract), Phase 32F (readiness checkpoint — service-auth
> vs end-user authorization §7, public-bound minimization §8), Phase 32J/32K
> (seeded live estate design gate + default-off dev/operator seed), ADR-026C,
> ADR-026D, ADR-022E
> **Related (freeside-characters)**: Phase 45E (Dixie probe reconciliation /
> local alignment decision, PR #171), Phase 45F (Dixie probe no-op adapter /
> validator, PR #172), Phase 45G (adapter acceptance / next-lane decision gate,
> PR #173)
> **Status**: **docs / decision only** (33D) — code-inspection-grounded.
> **No probe/validator mutation. No source code. No route / API handler. No
> storage writes. No auth implementation. No runtime behavior change. No live
> admission.** Decides *what hardening* the Phase 33C draft v0 probes need
> before any future route design, and *whether* to mutate probes/validator in a
> later, separately-gated phase. **Does not implement the hardening. Does not
> freeze a production schema. Does not mutate any Phase 33C probe JSON or the
> validator.**

This document is the Dixie-side **decision** about what must be hardened or
refined in the Phase 33C draft v0 Admission Wedge contract probes before any
live route design is contemplated. It answers two questions — *are the
Phase 33C probes good enough as draft v0 semantic probes, and what do they need
before route design?* — and stops there. It authorizes only a future,
separately-gated hardening phase; it implements no probe change, no validator
change, no route, no storage, no auth, and no runtime behavior in this PR.

This phase **does not** mutate probes or the validator, implement admission,
mount or design-to-mount a live admission route, write to storage, change any
source/test/fixture/config, add a package export, register a Discord command,
ingest Discord history, turn user chat into memory, expose a public
`remember-this`, wire Finn into production, or freeze a production schema. It is
a single new documentation artifact plus, at most, one minimal cross-reference
note on the Phase 33B decision (§11) and an optional one-line status note on the
Phase 33C fixtures README.

---

## 1. Phase title and status

- **Phase 33D — Admission Wedge probe hardening / contract vocabulary
  refinement gate.**
- Dixie-side, **docs / decision only**.
- Follows Dixie **Phase 33C / PR #120** (canonical fixture/probe draft) and
  freeside-characters **Phase 45G / PR #173** (Dixie probe adapter acceptance /
  next-lane decision gate, which selects this Phase 33D as its recommended next
  lane — its §9 / Option D).
- **Does not mutate probes or the validator.** No Phase 33C probe JSON is
  edited, and `docs/admission-wedge/fixtures/validate-fixtures.mjs` is not
  changed by this doc.
- **Does not implement a route, storage, auth, runtime behavior, or live
  admission.** The only artifact produced is this Markdown file (plus the
  minimal cross-reference notes in §11).
- **Does not freeze a final production schema.** Every hardening direction named
  below is directional and explicitly deferred to a later, separately-gated
  phase.
- Status: **docs / decision only**.

> **Phase-series note.** This Admission Wedge probe-hardening gate continues the
> Dixie `33` series opened by Phase 33A and carried through 33B (ownership
> decision) and 33C (draft v0 probes). The freeside-characters repository
> maintains its own phase numbering (its `43B–45G` Admission Wedge sequence and
> its own `33A`); Dixie `33D` and any freeside-characters phase are independent
> labels in separate repositories and must not be conflated. Cross-repo phase
> numbering remains an open reconciliation item (33A §9).

---

## 2. Source chain

This decision is grounded in, and scoped entirely within, the accepted
Admission Wedge ladder. These artifacts are **evidence only**; Phase 33D
modifies none of them except for the minimal cross-reference notes named in §11,
and it does not edit `../freeside-characters` at all.

Dixie:

- **Phase 33A / PR #118** — `docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md`. The
  Admission Wedge contract response / acceptance gate: records what Dixie will
  **own**, **defer**, and **block**; accepts the *need* for a contract and a
  provisional **draft v0** vocabulary; explicitly does **not** freeze a
  production schema.
- **Phase 33B / PR #119** —
  `docs/ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md`. The fixture/probe
  ownership decision: selects **Dixie-first** ownership, defines the minimum
  future probe set (§6), the schema surfaces (§7), and the vocabulary (§8) /
  field (§9) decisions a future probe phase must decide or defer.
- **Phase 33C / PR #120** — `docs/admission-wedge/fixtures/`. The canonical
  **draft v0** Admission Wedge contract probes: five synthetic, public-safe
  probe JSONs, a dependency-free validator, and a README. It is **non-runtime**:
  no live route, storage, auth, or admission behavior, and **no schema freeze**.

freeside-characters:

- **Phase 45E / PR #171** —
  `../freeside-characters/docs/ADMISSION-WEDGE-DIXIE-PROBE-RECONCILIATION-GATE.md`.
  The Dixie probe reconciliation / local alignment decision: maps each Dixie
  Phase 33C probe to the local proof stack (semantically clean; naming/shape
  deltas only), preserves the local labels as proof labels, and authorizes a
  narrow, test-only / docs-fixture-bound no-op adapter / validator lane
  (Phase 45F).
- **Phase 45F / PR #172** —
  `../freeside-characters/packages/persona-engine/src/recall-wedge/admission-wedge-dixie-probe-adapter.ts`
  (+ `.test.ts`) and the local mirrored probes under
  `../freeside-characters/docs/admission-wedge/dixie-probes/`. The Dixie probe
  no-op adapter / validator: a pure, local, test-only semantic mapping layer
  that maps the five Dixie probe scenarios onto the local proof scenarios and
  proves semantic equivalence against the existing local reducer over the local
  fixtures.
- **Phase 45G / PR #173** —
  `../freeside-characters/docs/ADMISSION-WEDGE-DIXIE-PROBE-ADAPTER-ACCEPTANCE-GATE.md`.
  The adapter acceptance / next-lane decision gate: accepts the bounded
  Phase 45F proof, states what it does *not* prove, keeps the adapter
  dead-ended from runtime, and selects **Dixie Phase 33D probe hardening**
  (its §9 / Option D) as the recommended next lane — a cross-repo handoff
  recommendation, not a freeside-characters implementation authorization.

> The freeside-characters artifacts are read here as external evidence only.
> They are **not modified by this task**, and Phase 33D does not edit any
> freeside-characters file.

---

## 3. Purpose

- **Phase 33C produced draft v0 probes.** Five synthetic, public-safe probe
  JSONs plus an isolated, dependency-free validator
  (`docs/admission-wedge/fixtures/`). They pin a *shape* for cross-repo review;
  they implement no admission.
- **Phase 45F proved freeside-characters can map the draft v0 probes
  semantically to local proof labels.** Its pure, test-only no-op adapter maps
  all five Dixie probe scenarios onto the local proof scenarios and cross-checks
  semantic equivalence against the existing local reducer — without any runtime
  wiring or live Dixie call.
- **Phase 45G accepted that proof and recommended Dixie Phase 33D.** It accepted
  the Phase 45F semantic bridge for exactly its bounded purpose, stated what it
  does not prove, and selected Dixie probe hardening / contract vocabulary
  refinement as the next useful lane (its §9 / Option D), because the canonical
  vocabulary, field names, signer/authority semantics, receipt/audit shape,
  idempotency semantics, and any Straylight primitive review are owned upstream.
- **Phase 33D now decides what hardening / refinement is needed before any route
  design.** It records the topics that must be decided or deferred (§5), and
  decides *not* to mutate the Phase 33C probes in this phase (§6).
- **Phase 33D does not implement the hardening.** Any probe/validator mutation
  is deferred to a later, explicitly-named, separately-gated phase (§7, §8). The
  cross-repo semantic bridge is now proven; the next work is deciding what to
  harden, not hardening it here.

---

## 4. Accepted current state

Phase 33D accepts the following about the Phase 33C probes, as a starting point
for the hardening decision:

- **The Phase 33C probes remain valid draft v0 contract probes.** They exist,
  parse, and pass their own validator
  (`docs/admission-wedge/fixtures/validate-fixtures.mjs`).
- **They are useful for cross-repo semantic alignment.** Phase 45F proved the
  freeside-characters side can map all five scenarios onto its local proof
  semantics; the probes are a working shared shape for review.
- **They are not production schema.** Every probe carries `schema_final: false`,
  `runtime_enabled: false`, `production_admission: false`, `public_safe: true`.
- **They are not a live route input/output contract.** Dixie exposes no
  admission route; the probes are static JSON, not request/response shapes
  served by any handler.
- **They are not final vocabulary.** Field names under each probe's
  `draft_vocab_used` are explicitly draft and subject to reconciliation against
  canonical Straylight-owned vocabulary.
- **They are not a storage model.** No durable store backs them; admission
  storage remains gated by ADR-022E.
- **They are not a production auth/consent design.** Service auth is not
  end-user consent (32F §7); no production consent mechanism for admitting
  candidate memory exists.

To be unambiguous about current reality (code-grounded): Dixie today exposes a
read-only, default-off, fail-closed **recall** route (`POST /api/recall/intake`,
`app/src/routes/recall-intake.ts`). It has **no admission route, no admission
concept in route code, and no production storage**; admission semantics live
upstream in `@loa/straylight`. The only recall-side store is the in-process,
non-durable `BoundedEstateStore`
(`app/src/services/straylight-recall-intake/bounded-estate-store.ts`); no
admission store exists at all.

---

## 5. Hardening topics to decide

Each row records the topic, its actual Phase 33C state (code/probe-grounded),
the hardening need, the Phase 33D decision, and the future action. **No row
authorizes or implements a change in this phase**; the "Decision in Phase 33D"
column is a decision *about what to do later*, not a change applied here.

| Topic | Current Phase 33C state | Hardening need | Decision in Phase 33D | Future action |
|-------|-------------------------|----------------|-----------------------|---------------|
| **A. Candidate state vocabulary** | Public surface uses canonical `proposed` (`candidate-pending-not-recallable.json` `public_response.candidate_state`); the `candidate_pending` direction survives **only** as the descriptive `scenario_id` label, never as a status value (probe `notes`). | Distinguish a pending candidate (no transition yet) from a denied/rejected transition. | **Preserve the distinction; do not collapse pending into `transition_denied`.** A no-transition candidate is `proposed`, not denied. | A future Phase 33E (or later) may rename/clarify field names if probe mutation is chosen. |
| **B. Rejection vocabulary** | Rejection anchored on the canonical audit event `transition_denied` (`reject-candidate-no-assertion.json` `audit.admission_receipt.audit_event`; public `outcome: "denied"`); no coined `rejected` status. | Ensure a rejected candidate is not confused with a not-yet-admitted pending candidate. | **`transition_denied` applies to an explicit rejection transition only**, not to a pending candidate. | Add a probe assertion or docs clarification later if needed. |
| **C. Admitted assertion status vocabulary** | The *act* of admission is the canonical transition `admit_assertion` + audit event `assertion_admitted`; the resulting *status* is canonical `active` (`accept-candidate-to-admitted-assertion.json`). There is no bare `admitted` status; "admitted" survives only as a public `outcome`/scenario label. | Decide whether "admitted" is a state, an event, a status, or a receipt concept. | **Keep draft; defer final status vocabulary** until a Straylight/Dixie primitive review (Topic L). | Future hardening may align explicitly with the canonical assertion lifecycle. |
| **D. Corrected active / supersession vocabulary** | Correction expressed as the canonical `(superseded, active)` pair plus a supersede link (`supersede-with-corrected-assertion.json` `supersedes_assertion_id` / `superseded_by_assertion_id`); no coined `corrected_active` status. | Avoid treating `corrected_active` as a canonical standalone status unless explicitly chosen. | **Treat corrected active as a relationship/direction in draft v0**, not a new status value. | Future hardening may encode the pair relation more explicitly. |
| **E. Shape failure / refusal vocabulary** | The malformed probe's public path uses `ingress.invalid_request` (`malformed-or-unsafe-payload-fail-closed.json`); the validator's `STABLE_PUBLIC_REASON_CODES` is `{ingress.invalid_request, seam.class_validation_failed}`, both real Dixie-local codes (`app/src/services/straylight-recall-intake/refusal-mapping.ts:12,29`). The freeside-local `unsupported_fixture_shape` reconciles **into** this family (45G §7). Malformed-envelope and invalid-class detail currently collapse onto one public code, with class detail held only on the audit object. | Decide whether class validation, malformed JSON, unsafe projection, and unsupported shape are **separate** public reason families. | **Keep the public reason stable and broad for now; defer the finer reason taxonomy.** | Future validator/probe hardening may split public vs audit codes. |
| **F. No-leak / unsafe projection vocabulary** | Each probe carries a clean `public_response`; the validator deep-walks it for forbidden substrings, patterns, and audit-only keys (`validate-fixtures.mjs:139-160`, `FORBIDDEN_PUBLIC_KEYS:91-113`). The public/audit split is enforced per-scenario, not as a single declared field inventory. | Define public vs audit-only fields more explicitly. | **Public response remains narrow; raw candidate/source/audit details remain private.** | Refine the `public_response` schema and the audit receipt shape later. |
| **G. Signer / authority vocabulary** | Transitions carry `authority_signer_type_draft` (e.g. set to `policy_service`, a canonical `SignerType` member — `app/src/routes/recall-intake.ts:84-93`); the **field name** is explicitly draft. 45G §7 flags `authority_signer_type_draft` (Dixie) + `operator_dev_synthetic` (local) as still needing reconciliation. | Align signer/authority with a future auth model and the service-vs-user boundary (32F §7). | **Remain draft; no production auth claim.** | A future Phase 33E (or later) should decide signer vocabulary **only after an auth-boundary review**. |
| **H. Tenant / estate / actor binding** | Synthetic `tenant_demo` / `estate_demo` / `actor_demo` ids live only on the private `input` / `audit` sections, never on `public_response` (and are forbidden there by the validator `FORBIDDEN_PUBLIC_KEYS`). | Decide binding semantics without real ids. | **Keep synthetic-only; no production identity-binding claim.** | A future route/storage design must decide tenant/estate/actor binding (session-derived, mirroring `app/src/routes/recall-intake.ts:342-359`). |
| **I. Idempotency semantics** | **Absent.** The probes carry a `candidate_id` but model **no** idempotency key (no `Idempotency-Key` analogue, no `idempotency_key` field). 33A §9.6 / 33B §9 (citing the 45D matrix §6.1) flag the missing idempotency key as a real gap. | Idempotency is critical before any live admission writes. | **Mark as required hardening before route design.** | Future hardening should define idempotency key semantics (candidate-id-keyed vs header-keyed vs both). |
| **J. Receipt / audit public-private split** | A `receipt_public_ref` appears on `public_response`; the full receipt (`receipt_id`, `policy_reason`, `decision_time_label`, `audit_event`, ids) lives on the private `audit` object (`accept-candidate-to-admitted-assertion.json`). The split exists per-scenario. | Decide public receipt fields vs private audit fields. | **Keep the draft split; no public audit expansion.** | Future hardening should make the receipt/audit shape stricter. |
| **K. Recall eligibility representation** | A boolean `recall_eligible` is paired with the canonical `recall_use_instruction` (`RecallUseInstruction`: `usable` … `do_not_use_for_action`); ordinary recall includes only the admitted active assertion (`accept-…` / `supersede-…` probes `recall_projection`). | Align with Recall Wedge and Straylight semantics. | **Keep draft; preserve "active admitted assertion only" in ordinary recall.** | Future hardening should map eligibility to the canonical `RecallUseInstruction` signal. |
| **L. Straylight primitive review** | The probes are a Dixie-owned **draft proposal**; canonical vocabulary is owned upstream (`@loa/straylight`) and mirrored at the Dixie ingress (`app/src/routes/recall-intake.ts:84-146`). Dixie is a non-owning consumer of lifecycle vocabulary. | Decide whether the Straylight primitive owner must review before route design. | **Yes — route design should not proceed until a primitive/vocabulary review is either done or explicitly deferred** by Straylight/Dixie governance. | Add a handoff/review requirement to the future hardening phase. |

---

## 6. Decision: do not mutate Phase 33C probes yet

- **The Phase 33C probes are good enough as draft v0 semantic probes.** They
  pin a working shared shape, pass their own validator, and were proven mappable
  by the freeside-characters Phase 45F adapter. No defect in them blocks the
  cross-repo semantic alignment they exist to support.
- **The next improvement should be an explicit hardening artifact, not a silent
  mutation.** Hardening the vocabulary, field names, idempotency, receipt/audit
  split, or signer/authority direction is a deliberate, separately-gated change
  — not something to slip into a decision doc.
- **Do not mutate probe JSON or the validator in Phase 33D.** Probe JSON files
  under `docs/admission-wedge/fixtures/*.json` are not modified, and
  `docs/admission-wedge/fixtures/validate-fixtures.mjs` is not modified.
  `docs/admission-wedge/fixtures/README.md` receives only a minimal Phase 33D
  status/provenance note (no probe or validator change).
- **Any future probe/validator mutation should happen in Phase 33E (or another
  explicitly-named phase).** It must carry its own design / review / audit.
- **That future phase must preserve the Phase 33C semantic scenarios.** The five
  scenarios (`candidate_pending_not_recallable`,
  `accept_candidate_to_admitted_assertion`, `reject_candidate_no_assertion`,
  `supersede_with_corrected_assertion`,
  `malformed_or_unsafe_payload_fail_closed`) and the invariant they encode must
  survive any hardening unchanged in meaning, so the freeside-characters
  Phase 45F adapter mapping does not silently break.

---

## 7. Recommended next lane

**Selected: Phase 33E — Admission Wedge probe hardening draft v1 / vocabulary
refinement (Dixie-side docs + non-runtime probe/validator hardening only).**

This is the future phase that would *act on* this decision by hardening the
draft v0 probes against the topics in §5 — refining vocabulary and field names,
clarifying the idempotency placeholder, the signer/authority draft field, and
the receipt/audit split — while preserving all five semantic scenarios (§6). It
is **listed and recommended, not authorized to start here**; it requires its own
separately-gated design / review / audit.

This recommendation follows the §5 hardening table and matches the
freeside-characters Phase 45G §9 / Option D handoff recommendation (Dixie probe
hardening / contract vocabulary refinement before any live route design).

> **Required Straylight review note (Topic L).** If Phase 33E proceeds as
> probe/validator hardening, it **must** either (a) obtain a Straylight
> primitive/vocabulary review of the canonical assertion-lifecycle and
> signer/authority names it touches, or (b) explicitly record that such a review
> is deferred and why. Dixie is a non-owning consumer of the lifecycle
> vocabulary; route design must not proceed past hardening until this review is
> done or explicitly deferred. This note does **not** assert that any Straylight
> review has occurred — none has, as of this phase.

**Alternative (if even Phase 33E should be a planning handoff first):**

- **Phase 33E — Admission Wedge Straylight primitive vocabulary review
  request.** A docs-only handoff that asks the Straylight primitive owner to
  review the canonical vocabulary directions (Topics C, G, K, L) *before* any
  probe mutation, deferring the draft-v1 probe hardening to a later Phase 33F.

**Recommendation rationale.** The §5 table shows most topics (A–F, J, K) are
already aligned to canonical names at the semantic level and need only field-name
/ taxonomy refinement, which a non-runtime probe/validator hardening slice can
carry safely. The two topics that genuinely gate route design — idempotency (I)
and signer/authority (G), plus the Straylight primitive review (L) — can be
addressed as explicit hardening with a required review note rather than blocking
on a separate review-request phase first. Hence the preferred lane is a
**non-runtime probe/validator hardening slice with a required Straylight review
note**, with the review-request-first variant available if a reviewer prefers to
sequence the primitive review ahead of any probe change.

---

## 8. Future Phase 33E boundaries

These boundaries apply **if** Phase 33E is opened as the recommended
probe/validator hardening slice. They are a recommendation for that future
phase, not an authorization granted here.

**Allowed (recommended) future Phase 33E scope:**

- docs + **non-runtime** fixture/probe changes only;
- update the Phase 33C probe README / JSON / validator **if Phase 33E
  explicitly chooses to harden them**;
- add stricter validator checks;
- clarify vocabulary fields;
- clarify the receipt/audit split;
- clarify the idempotency placeholder;
- clarify the signer/authority draft field;
- **preserve all five semantic scenarios** (§6);
- maybe add a sixth probe **only if clearly justified** — but prefer not.

**Blocked for Phase 33E (recommended):**

- a route / API handler;
- storage writes;
- auth implementation;
- live calls;
- production admission;
- production storage / auth / consent;
- a public `remember-this`;
- Discord ingestion;
- user chat becoming memory;
- freeside-characters runtime changes;
- package exports;
- LLM / voice;
- Finn production wiring;
- a forget / revoke / correction UI;
- a final schema freeze.

---

## 9. What remains blocked now

Repeated clearly so a future reader does not over-read this decision. None of
the following is implemented, authorized, or claimed by Phase 33D (and none was
unblocked by Phase 33C, by freeside-characters Phase 45F/45G, or by any prior
phase):

- a live admission route;
- storage writes;
- auth implementation;
- production admission;
- production storage / auth / consent;
- a public `remember-this`;
- Discord ingestion;
- user chat becoming memory;
- freeside-characters runtime changes;
- package exports;
- LLM / voice;
- Finn production wiring;
- a forget / revoke / correction UI;
- a final schema freeze;
- **route design** (route design is *not* authorized; this gate only records
  what must be hardened *before* any future route design could even be
  proposed).

A decision is not implementation. This doc reads the Phase 33C probes and the
freeside-characters Phase 45F/45G evidence and selects a hardening lane; it
mutates no probe, no validator, and no code, and it decides nothing on
freeside-characters' or Straylight's behalf. If a later phase needs any item
above, it must open the separately-gated phase that owns it.

---

## 10. Success criteria

This Phase 33D succeeds if **all** of the following hold:

- it **accepts the Phase 33C probes as draft v0 semantic probes** (§4, §6);
- it **records what needs hardening before route design** (§5);
- it **chooses a next hardening lane** (§7);
- it **does not mutate probes / validator / code** (§1, §6);
- it **keeps all live / runtime lanes blocked** (§9);
- **Codex confirms docs / decision-only scope.**

---

## 11. Cross-references

> **Phase 33D status note (added later).** Phase 33D acted on the Phase 33B
> ownership decision and the Phase 33C draft v0 probes: it **accepts** the
> Phase 33C probes as valid draft v0 semantic probes, **records** the hardening
> topics that must be decided before any route design
> (`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md` §5), and **decides not to
> mutate** any probe JSON or the validator in this phase, deferring any
> probe/validator hardening to a future, separately-gated Phase 33E. It freezes
> no schema and authorizes no route, storage, auth, or live admission.

- `docs/admission-wedge/fixtures/` — Phase 33C draft v0 probes + validator +
  README (PR #120). Probe JSON files (`docs/admission-wedge/fixtures/*.json`)
  are **inspected read-only; not modified**, and
  `docs/admission-wedge/fixtures/validate-fixtures.mjs` is **not modified**.
  `docs/admission-wedge/fixtures/README.md` receives only a minimal Phase 33D
  status/provenance note. Phase 33D decides not to mutate any probe JSON or the
  validator in this phase (§6).
- `docs/ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md` — Phase 33B
  fixture/probe ownership decision (PR #119); the Dixie-first decision and
  minimum probe set this hardening gate builds on. Gains a single minimal
  Phase 33D cross-reference note.
- `docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md` — Phase 33A contract response /
  acceptance gate (PR #118); the core invariant, draft v0 vocabulary, and
  reconciliation directions (its §9 open items inform Topics G, I, L).
  **Read-only; not modified.**
- `docs/integration/phase-32e-recall-wedge-route-contract.md` — governing Dixie
  Recall Wedge route contract; the BFF / Straylight ownership split a future
  admission seam would assume. **Read-only; not modified.**
- `docs/integration/phase-32f-recall-wedge-readiness-checkpoint.md` — §7
  service-auth vs end-user authorization and §8 public-bound minimization remain
  in force for Topics G and F.
- `app/src/routes/recall-intake.ts` — recall route entrypoint; canonical enum
  const arrays (lines 84-146, including `SignerType` at 84-93), tenant guard
  (lines 342-359). **Inspected read-only; not modified.**
- `app/src/services/straylight-recall-intake/refusal-mapping.ts` — Dixie-local
  refusal classes (lines 10-33) and the Phase 32K no-leak sanitization
  (lines 177-209); the grounding for Topics E and F. **Inspected read-only; not
  modified.**
- `app/src/services/straylight-recall-intake/bounded-estate-store.ts` /
  `app/src/config.ts` — in-process non-durable store and the fail-closed startup
  key gate; the basis for "no production storage / not production admission"
  (§4). **Inspected read-only; not modified.**
- `../freeside-characters/docs/ADMISSION-WEDGE-DIXIE-PROBE-ADAPTER-ACCEPTANCE-GATE.md`
  — freeside-characters Phase 45G adapter acceptance / next-lane gate (PR #173);
  the external evidence whose §9 / Option D recommendation this Phase 33D acts
  on. **Read-only; not modified, and not editable from this task.**
- `../freeside-characters/packages/persona-engine/src/recall-wedge/admission-wedge-dixie-probe-adapter.ts`
  (+ `.test.ts`) — freeside-characters Phase 45F probe no-op adapter / validator
  (PR #172); the bounded semantic bridge Phase 45G accepted. **Read-only; not
  modified.**
- `@loa/straylight` (type-pinned dependency) — semantic owner of the assertion
  lifecycle and recall/admission policy; the canonical vocabulary referenced in
  §5 (Topics A–E, G, K, L) is Straylight-owned. Dixie consumes and mirrors it
  and does not coin parallel names. **No Straylight primitive review has been
  performed by this phase** (Topic L).
- ADR-022E (durable-store gate, still held), ADR-026C / ADR-026D
  (capability/route guardrails) — any future admission storage/route must clear
  these.

---

## 12. Phase 33E status note (implemented)

> **Phase 33E — Admission Wedge probe hardening draft v1 / vocabulary
> refinement (added later).** Phase 33E acted on the §7 recommended lane and
> implemented the **draft v1 / vocabulary hardening only**. It is a Dixie-side
> **docs + non-runtime fixture/probe/validator** slice.

- **What it changed.** It updated `docs/admission-wedge/fixtures/README.md`, the
  five Phase 33C probe JSONs, and `docs/admission-wedge/fixtures/validate-fixtures.mjs`.
  The probes are bumped to `probe_version: dixie_admission_wedge_probe_v1`
  (`status: draft_contract_probe`, `hardening_phase: "33E"`) and gain explicit
  non-final markers (`schema_final: false`, `canonical_schema: false`,
  `route_contract: false`), a draft `idempotency` placeholder
  (`idempotency_final: false`), draft signer/authority fields
  (`authority_signer_type_draft` / `authority_scope_draft` /
  `authority_binding_final: false`), a `receipt_split` public/private boundary,
  synthetic-only identity markers (`synthetic_binding: true` /
  `identity_binding_final: false`), and a Straylight primitive-review marker
  (`straylight_primitive_review: "required_before_route_design"` /
  `straylight_primitive_review_complete: false`). The validator was hardened to
  enforce all of the above plus a stronger no-leak / pending-vs-denied sweep.
- **What it preserved.** All five Phase 33C semantic scenarios
  (`candidate_pending_not_recallable`, `accept_candidate_to_admitted_assertion`,
  `reject_candidate_no_assertion`, `supersede_with_corrected_assertion`,
  `malformed_or_unsafe_payload_fail_closed`) are preserved unchanged in meaning;
  none was removed, renamed, or split, and **no sixth probe was added**. The
  public-surface values the freeside-characters Phase 45F adapter reads are
  preserved, so the gated mirror refresh maps cleanly.
- **What it did NOT do.** It added **no** live admission route, **no** route
  design, **no** storage writes, **no** auth implementation, **no** live calls,
  and **no** production admission/storage/auth/consent. It touched no app
  source, route, config, package, or lockfile, and did not edit
  `../freeside-characters`. It **did not freeze a final/canonical/production
  schema**, and does **not** claim Phase 33E produces a final schema, a live
  Dixie admission route, completed Straylight primitive review, final
  idempotency semantics, or production signer/identity binding. The draft fields
  are placeholders only.
- **Validation.** `git diff --check` clean; `node
  docs/admission-wedge/fixtures/validate-fixtures.mjs` → PASS (5/5).
