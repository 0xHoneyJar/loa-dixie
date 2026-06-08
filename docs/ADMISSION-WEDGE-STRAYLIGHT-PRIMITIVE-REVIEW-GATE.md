# Phase 33J — Admission Wedge Straylight Primitive Review Request / Vocabulary Dependency Gate

> **Phase**: 33J
> **Branch context**: `phase-33j-admission-wedge-straylight-primitive-review`
> **Related**: Dixie Phase 33A–33I (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle primitives
> **Status**: **docs / decision-only.** No route, route handler, storage, auth,
> consent, probe/validator mutation, fixture JSON, package, lockfile, test, CI,
> generated, or live integration change.
> **This is a primitive-review *request* / vocabulary-dependency matrix, not a
> completed review.** It enumerates the canonical-vocabulary dependencies that
> block Admission Wedge implementation readiness, classifies which terms are
> Straylight-owned vs. Dixie-local draft vs. Freeside-local proof vocabulary,
> drafts a reusable cross-repo handoff to the Straylight primitive owner, and
> selects a docs/decision-only next lane. It changes **no** routes, storage, auth,
> probes, validator, runtime behavior, or production schema; it does **not** freeze
> a final/production schema; and it does **not** authorize a route spike.

This document follows the Dixie Phase 33I implementation-readiness decomposition
gate
([`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)),
which decomposed the Phase 33H blockers into ordered future lanes (33J–33N) and
**selected this Phase 33J Straylight primitive-review request as the next safe
lane** (33I §6 Lane 1, §7, §13). Phase 33J executes exactly that charter: it
issues the review request, builds the dependency/ownership matrices, and stops. It
designs no envelope, implements no route, mutates no probe or validator, and
authorizes no live behavior or route spike.

Every assessment below is grounded read-only against the actual Dixie repo (route
seam, refusal vocabulary, auth, storage, probes/validator), the
freeside-characters Phase 45J artifacts and v1 probe adapter, and the
**Straylight (`@loa/straylight`) primitive sources** read read-only in
`../loa-straylight`. Where a Straylight citation is carried from a local checkout
that may be stale, that is flagged (§2, §4). Where a claim could not be grounded,
it is marked as such.

---

## 1. Phase title and status

- **Phase 33J — Admission Wedge Straylight primitive review request / vocabulary
  dependency gate.**
- Dixie-side **docs / decision-only**.
- Follows Dixie Phase 33I / PR #127 (implementation-readiness decomposition gate).
- This is a **primitive-review request / dependency matrix**, **not a completed
  review**.
- It changes **no** routes, storage, auth, consent, probes, validator, runtime
  behavior, source code, configuration, or production schema.
- It does **not** freeze a final/canonical/production schema.
- It does **not** mutate the Phase 33E probe JSONs (`hardening_phase: "33E"`,
  `dixie_admission_wedge_probe_v1`) or the validator. Per the Phase 33D §6
  invariant — any probe/validator mutation requires its own separately-gated phase
  — Phase 33J inspects them read-only.
- It does **not** authorize a route spike, and it does **not** claim that the
  Phase 33E probes are a production schema, that the Phase 33G route contract is
  final, that Phase 33H made the route implementation-ready, or that Phase 33I
  authorized a route spike. None of those is true (§4, §16).
- It does **not** claim the Straylight primitive review is complete. **No
  completed Straylight Admission-Wedge primitive-review artifact was found** (§4),
  and this phase **requests** one.

The audience for this document is the **Straylight (`@loa/straylight`)
primitive/vocabulary owner** (who must answer or explicitly defer the §5 review
questions), **future Dixie phases** (primarily Phase 33K storage/auth/consent
design, which consumes these answers as exit criteria — §10), and
**freeside-characters** as an interested-but-blocked downstream consumer (§12).

---

## 2. Source chain

This gate sits one rung above the Phase 33I decomposition gate on the Dixie
route-contract ladder. It introduces no new contract material and freezes nothing;
it issues the Straylight review request that 33I sequenced first.

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33A | #118 | Contract response / acceptance gate — accepts the *need* for a contract and draft v0 vocabulary; states the six-clause core invariant and open route-design questions; freezes no schema. ([`ADMISSION-WEDGE-CONTRACT-RESPONSE.md`](ADMISSION-WEDGE-CONTRACT-RESPONSE.md)) |
| 33B | #119 | Fixture/probe ownership decision — Dixie owns the first canonical fixture/probe proposal; defines the five-scenario minimum set. ([`ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md`](ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md)) |
| 33C | #120 | Canonical fixture/probe draft v0 — five synthetic public-safe probe JSONs + dependency-free validator under `docs/admission-wedge/fixtures/`. |
| 33D | #121 | Probe hardening / contract-vocabulary-refinement gate — accepts v0; records hardening topics; decides **not** to mutate probes in 33D (§6 invariant); recommends 33E. |
| 33E | #122 | Probe hardening draft v1 / vocabulary refinement — bumps probes to `dixie_admission_wedge_probe_v1`, adds non-final markers and draft placeholders, hardens the validator; preserves all five scenarios; adds no sixth probe; freezes no schema. |
| 33F | #123 | Route-contract readiness gate — assesses the v1 probes as a mature enough *semantic* foundation to begin a docs-only design phase; names preconditions (Straylight review, idempotency, storage/auth/consent); selects 33G. |
| 33G | #124 | Route-contract design — proposes (on paper) a route identity, request/response envelopes with a public/private split, an idempotency sketch, an `admission.*` refusal taxonomy, storage/auth/consent preconditions, the Straylight review dependencies, and route-contract test vectors mapped from the five Phase 33E probes. Selects 33H. |
| 33H | #126 | Route-contract acceptance / implementation-readiness decision gate — **accepts** 33G as a bounded docs-only draft (two minor docs-only corrections), renders **NOT implementation-ready**, inventories the blockers (§8 A–N), and selects 33I. |
| 33I | #127 | Implementation-readiness decomposition gate — decomposes the 33H blockers into ordered lanes (33J–33N), defines the evidence required before any route handler, and **selects this Phase 33J Straylight primitive-review request** as the next lane. |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter track `dixie_admission_wedge_probe_v1`, **test-only**; v0 fails closed as `unknown_probe_version`. (`admission-wedge-dixie-probe-adapter.ts:100-108`) |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded test-only purpose; **recommended Dixie Phase 33F** as the next readiness gate (it did **not** select 33G); its Option E framed a *Straylight primitive vocabulary review* as a prerequisite/subtask of the Dixie route-contract readiness work. Authorizes no live client, no package export, no runtime wiring. |

> **Grounding note on the 45J / PR #177 citation.** GitHub confirms
> freeside-characters **PR #177 is MERGED** (merged 2026-06-06). The read of the
> local `../freeside-characters` checkout for the five 45J files found the local
> HEAD (`ec45690`, "docs: accept Admission Wedge v1 mirror refresh") consistent
> with the 45J commit for those files; GitHub's merged state — not the local tree —
> remains authoritative for PR status. This corroborates, but does not supersede,
> the Phase 33H/33I grounding notes
> ([`ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md:90-99`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)).

### Straylight (`@loa/straylight`)

The canonical primitive/substrate owner of the assertion-lifecycle vocabulary.
Read read-only in `../loa-straylight`. The relevant primitive sources found:

| Primitive | Straylight source |
|-----------|-------------------|
| `AssertionStatus` (`proposed`/`active`/`contested`/`demoted`/`revoked`/`forgotten_from_recall`/`superseded`/`sealed`) | `src/straylight/types.ts:86-94` |
| `admit_assertion` transition + `EstateStore.admit()` executor | `src/straylight/types.ts:276-290`; `src/straylight/estate.ts:140-265` |
| `CandidateAssertion` (pre-admission shape) | `src/straylight/types.ts:551-565` |
| Admission definition ("the transition that turns a candidate into an estate assertion … does not imply truth") | `docs/architecture/loa-straylight-product-system-architecture-spec.md:886-897` |
| Lifecycle state machine (`candidate → proposed → admitted/active → …`; class-validation failure → `rejected_candidate`; policy denial → `denied_transition`) | `docs/architecture/loa-straylight-product-system-architecture-spec.md:856-884` |
| Supersession (`superseded` status, `supersedes_refs`, `AssertionLinkType: supersedes`) | `src/straylight/types.ts:93,157`; arch spec `:910-921` |
| `RecallUseInstruction` (`usable`/`mark_as_contested`/`use_as_background_only`/`do_not_use_for_action`) | `src/straylight/types.ts:427-442` |
| Recall eligibility = emergent disposition (`dispositionFor`), **not** a stored flag | `src/straylight/policy.ts:187-241`; `docs/specs/recall-wedge-schema-contract.md:175` |
| `SignerType` (incl. `policy_service`) + `SignerCompetenceRule`/`Keyring` | `src/straylight/types.ts:122-130,185-209` |
| `actor_id`/`estate_id` binding; `tenant_id` is **host-layer, NOT a wedge primitive** | `src/straylight/types.ts:145-167`; `src/straylight/host/tenancy.ts:1-57` |
| Receipts/audit (`TransitionReceipt` kinds `admission`/`denied`/…, `RecallReceipt`, `AuditEvent` incl. `assertion_admitted`/`transition_denied`) | `TransitionReceipt`/`RecallReceipt` `src/straylight/types.ts:364-388,469-489`; `AuditEvent` (`AuditEventType` + interface) `src/straylight/types.ts:495-529` |

> **Straylight grounding caveat.** These primitive definitions are real and
> citable, but they describe Straylight's **general** assertion lifecycle (built
> for the Recall Wedge). The local Straylight checkout's latest ADR is **ADR-030**
> and its HEAD is around **Phase 31F**; if Admission-Wedge-relevant Straylight work
> is newer, this checkout may be stale (consistent with the recorded caution that
> local sibling checkouts are not authoritative for the freshest state). Treat the
> citations below as **evidence the review should confirm for the Admission
> Wedge**, not as a completed Admission-Wedge review. **No** Straylight artifact
> naming an "admission wedge", "assertion intake", or admission route/endpoint was
> found anywhere in the Straylight repo (repo-wide search returned zero hits).

**Ownership posture carried by the whole chain (unchanged here):** Dixie owns the
HTTP/BFF ingress seam (route, tenant/estate binding, idempotency, refusal mapping,
no-leak projection); **Straylight (`@loa/straylight`) is the canonical
primitive/substrate owner** of the assertion-lifecycle vocabulary; Dixie is a
**non-owning consumer** that mirrors those names rather than coining its own;
freeside-characters owns neither and keeps its proof labels local and test-only.

> **Cross-repo phase-numbering caution.** Dixie's 33-series and the
> freeside-characters 45-series are independent labels in separate repositories
> and must not be conflated.

---

## 3. Purpose

Phase 33I selected Phase 33J because the canonical-vocabulary dependencies sit
upstream of every other lane: vocabulary, identity binding, idempotency,
receipt/audit semantics, and recall-eligibility semantics shape later
storage/auth/consent contract work, the refusal taxonomy, and any future route
spike
([`ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md:559-571`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md);
33H ranks the Straylight review as both a "strong candidate" and the only
"prerequisite"-tagged blocker, "all ↔ the Straylight review"). This gate
therefore:

- **identifies** which Admission Wedge terms should be **Straylight-owned**, which
  can remain **Dixie-local draft** route-contract vocabulary, which are
  **Freeside-local** proof vocabulary, and which require **explicit review** (§5,
  §6, §7);
- **does not resolve the review by itself.** Where a local Straylight artifact
  already directly answers a question (the §2 primitive sources), the matrix marks
  the Dixie term as an *aligned draft pending Admission-scoped confirmation* — it
  does **not** mark the review *complete*;
- **does not authorize implementation**, a route spike, storage writes, auth, or a
  schema freeze;
- **selects a docs/decision-only next lane** (§14) and defines how the unresolved
  answers feed it as exit criteria (§10, §11, §12).

---

## 4. Current review state

State clearly, and unchanged from the Phase 33H/33I verdicts:

- **The Straylight primitive review is NOT complete.** No completed Straylight
  Admission-Wedge primitive-review artifact exists. The Straylight repo defines
  the assertion-lifecycle primitives generally (§2) but contains **no** doc, ADR,
  spec, handoff, or contract that reviews or blesses a *Dixie Admission Wedge*
  contract; every Dixie probe still carries
  `straylight_primitive_review: "required_before_route_design"` and
  `straylight_primitive_review_complete: false`
  (`docs/admission-wedge/fixtures/accept-candidate-to-admitted-assertion.json:15-16`;
  validator-enforced at `docs/admission-wedge/fixtures/validate-fixtures.mjs:265-272`).
- **Admission Wedge route implementation remains blocked.** No admission route
  exists in Dixie route code; `app/src/server.ts` mounts no `/api/admission*`
  route — the only Straylight-wedge intake route is `POST /api/recall/intake`
  (mounted `server.ts:602-614`, gated on `config.recallIntakeEnabled` `:567`). The
  only in-repo `admission` tokens are FleetGovernor agent-spawn economics and
  explicit "NOT production memory admission" dev-seed comments — neither is an
  Admission Wedge precedent.
- **A route spike remains blocked.** Phase 33I did not authorize one (33I §10/§11).
- **The Phase 33G route contract remains a draft design**, not final.
- **The Dixie v1 probes remain draft/non-final** (`schema_final: false`,
  `canonical_schema: false`, `route_contract: false`, `runtime_enabled: false`,
  `production_admission: false`, `identity_binding_final: false`,
  `synthetic_binding: true`).
- **No final production schema is frozen.**

---

## 5. Review request summary

The following questions should be **answered by, or explicitly deferred by, the
Straylight (`@loa/straylight`) primitive owner** (or whoever owns Straylight
primitives). They expand the ten 33G §17 / eleven 33F dependencies into a
fifteen-item review register. Each is a **request**; none is answered as
authoritative here. Where §2 surfaced direct Straylight evidence, it is noted as
the *current best evidence the review should confirm*, not as a completed answer.

- **A. Candidate / proposed state vocabulary.** Confirm the canonical
  pre-admission term. Evidence: Straylight has `CandidateAssertion`
  (`types.ts:551-565`) as the pre-admission *object* and `AssertionStatus.proposed`
  (`types.ts:86-94`) as the pre-admission *status*; there is no bare `candidate`
  status value and the Freeside-local `candidate_pending` label is not canonical.
- **B. Admitted assertion lifecycle vocabulary.** Confirm that an admitted
  assertion's canonical status is `active` and that there is **no bare `admitted`
  status** (`admitted` is a public outcome label only). Evidence: `admit()` sets
  status `active` directly (`estate.ts:140-265`); the lifecycle diagram treats
  `admitted/active` as a single node (arch spec `:856-884`).
- **C. Admission transition vocabulary.** Confirm `admit_assertion` as the
  transition and `assertion_admitted` / `transition_denied` as the audit events.
  Evidence: `types.ts:276-290`, `estate.ts:140-265`.
- **D. Supersession / correction relation.** Confirm `(superseded, active)` is a
  **relation/direction** (`superseded` status + `supersedes_refs` + link type
  `supersedes`), **not** a coined `corrected_active` status. Evidence:
  `types.ts:93,157`; arch spec `:910-921`. No `correction`/`corrected` primitive
  exists.
- **E. Recall eligibility representation.** Reconcile the Dixie `recall_eligible`
  boolean against the canonical `RecallUseInstruction` set and the fact that
  Straylight recall eligibility is **emergent (computed by `dispositionFor`), not a
  stored flag**. Evidence: `policy.ts:187-241`; `types.ts:427-442`. The fixtures
  instantiate only `usable` and `do_not_use_for_action` of the four-member band —
  the gap is itself a reconciliation item.
- **F. Authority / signer vocabulary.** Confirm `policy_service` as a canonical
  `SignerType` member and clarify which signer roles may authorize an
  `admit_assertion`. Evidence: `SignerType` (`types.ts:122-130`),
  `SignerCompetenceRule`/`Keyring` (`types.ts:185-209`). The Dixie
  `authority_signer_type_draft` / `authority_scope_draft` *field names and binding*
  remain draft and **not** production auth.
- **G. Tenant / estate / actor binding vocabulary.** Confirm that `estate_id` /
  `actor_id` are wedge primitives, that **`tenant_id` is host-layer (NOT a wedge
  primitive)**, and that there is **no `subject_actor_id` primitive** (only
  `Assertion.subject_refs`). Evidence: `types.ts:145-167`;
  `host/tenancy.ts:1-57`; `host/types.ts:55-61`. Production identity binding is
  undefined (`identity_binding_final: false`).
- **H. Receipt / audit relationship.** Reconcile the Dixie
  `public_receipt_ref` / `receipt_public_ref` two-spelling debt and the
  public-receipt-vs-`audit_receipt` split against Straylight's receipt vocabulary:
  `TransitionReceipt` (`types.ts:364-388`), `RecallReceipt` (`types.ts:469-489`),
  and `AuditEvent` (`types.ts:495-529`).
  Neither `public_receipt_ref` nor `audit_receipt` is a Straylight term; the
  nearest public anchor is the **deferred** `public_anchor_ref`.
- **I. Fail-closed semantics.** Confirm what fail-closed means in canonical
  primitive terms (class-validation failure → `rejected_candidate`; policy denial
  → `denied_transition` receipt) vs. the Dixie-local refusal family the probes
  reuse (`ingress.invalid_request`).
- **J. Idempotency semantics.** Confirm whether canonical idempotency for
  admission transitions is a Straylight concern or **Dixie-owned**. Evidence:
  `idempotency_key` does **not** exist in Straylight; it is explicitly delegated to
  the host/Dixie (Recall Wedge precedent ADR-026D §3.b). Keying
  (candidate-id vs header vs both) is undecided (`idempotency_final: false`).
- **K. Public / private projection boundary.** Confirm the canonical
  public-vs-private projection rule for admission outcomes (what may ever leave the
  private boundary) so the Dixie runtime no-leak serializer can be designed against
  it rather than against draft probe shapes.
- **L. Candidate-to-assertion relationship.** Confirm the canonical linkage
  (candidate → transition → assertion) and the reference field semantics the Dixie
  draft mirrors (`source_candidate_id`, `admission_transition_id`,
  `admitted_assertion_id`). Evidence: `admit()` chain (`estate.ts:140-265`).
- **M. Rejection / denial taxonomy.** Confirm the canonical denial path: an
  **explicit** denied transition (audit event `transition_denied`, kind `denied`
  `TransitionReceipt`) vs. a mere pending absence, and confirm there is no coined
  `rejected` status. Evidence: `estate.ts:140-265`; arch spec `:856-884`.
- **N. Corrected-active status vs. relationship.** Confirm explicitly that
  "corrected active" is the **`active` member of a `(superseded, active)`
  relation**, not a standalone status — this is the most error-prone Dixie draft
  framing and is called out separately from D for emphasis.
- **O. Storage / audit primitive boundary.** Confirm which records are
  Straylight-substrate concerns (assertion, transition, receipt, audit event,
  supersession relation — Straylight owns the *semantics*) vs. Dixie ingress/storage
  concerns (candidate intake record, idempotency cache, refusal log), so Phase 33K
  can design storage without baking draft vocabulary as final.

> **None of A–O is resolved here.** This section is a request register. The
> answers (or explicit deferrals) are the exit criteria for treating any term as
> non-draft (§10).

---

## 6. Primitive dependency matrix

Statuses used: **aligned draft** (Dixie term mirrors a confirmed Straylight
primitive, pending Admission-scoped confirmation); **Dixie-local draft** (a
route/transport-or-host term Dixie may keep as draft); **Straylight-owned
candidate** (a term whose ownership the review should confirm as Straylight's);
**unresolved**; **requires review before implementation**; **may proceed as
route-design draft only**. Nothing is marked *final* — no row had direct evidence
of a completed Admission-Wedge review.

| Dependency | Phase 33G / Dixie draft term | Current evidence | Proposed owner | Status | Required review outcome | Implementation impact if unresolved |
|------------|------------------------------|------------------|----------------|--------|--------------------------|-------------------------------------|
| A. Candidate/proposed state | `candidate` / `proposed` | Straylight `CandidateAssertion` `types.ts:551-565`; `AssertionStatus.proposed` `types.ts:86-94`; no `candidate` status | Straylight | aligned draft; requires review before implementation | Confirm `proposed` canonical; `candidate` is the input object, not a status | Storage candidate-record naming and the pending-vs-denied probe distinction rest on it |
| B. Admitted assertion lifecycle | `admitted` (outcome) / `active` (status) | `admit()` → status `active` `estate.ts:140-265`; single `admitted/active` node arch spec `:856-884` | Straylight | aligned draft; requires review before implementation | Confirm `active` canonical; `admitted` stays a public label only | Assertion-record status field and the public outcome class depend on it |
| C. Admission transition vocab | `admit_assertion`; `assertion_admitted` / `transition_denied` | `types.ts:276-290`; `estate.ts:140-265` | Straylight | aligned draft; requires review before implementation | Confirm transition + audit-event names | Transition-record and audit-event wiring depend on it |
| D. Supersession/correction relation | `(superseded, active)`; `supersedes_assertion_id` / `superseded_by_assertion_id` | `superseded` + `supersedes_refs` `types.ts:93,157`; arch spec `:910-921` | Straylight | aligned draft; requires review before implementation | Confirm relation/direction, not a coined status | Supersession relation columns and ordinary-recall exclusion depend on it |
| E. Recall eligibility representation | `recall_eligible` (bool) + `recall_use_instruction` | `RecallUseInstruction` `types.ts:427-442`; emergent disposition `policy.ts:187-241`; no `recall_eligible` flag in Straylight | Straylight (instruction) + Dixie (projection) | unresolved; requires review before implementation | Reconcile boolean projection vs. emergent `dispositionFor`; close the 2-of-4 instruction gap | Recall-eligibility projection could misrepresent canonical disposition |
| F. Authority/signer vocab | `authority_signer_type_draft` / `authority_scope_draft` (value `policy_service`) | `SignerType` incl. `policy_service` `types.ts:122-130`; competence `types.ts:185-209` | Straylight (vocabulary) + Dixie (wire) | aligned draft (value) / Dixie-local draft (field names); requires review before implementation | Confirm signer roles competent for `admit_assertion`; field names remain draft | Auth/signature record and competence checks depend on it; not production auth |
| G. Tenant/estate/actor binding | `tenant_id` / `estate_id` / `caller_actor_id` / `subject_actor_id` | `estate_id`/`actor_id` `types.ts:145-167`; `tenant_id` host-only `host/tenancy.ts:1-57`; no `subject_actor_id` (only `subject_refs`) | Straylight (`estate_id`/`actor_id`) + Dixie host (`tenant_id`/`caller_actor_id`) | mixed: `estate_id`/`actor_id` aligned draft; `tenant_id`/`caller_actor_id` Dixie-local draft; `subject_actor_id` unresolved | Confirm which IDs are wedge primitives; define caller-vs-subject; production binding undefined | Identity binding and cross-user-admission consent design depend on it |
| H. Receipt/audit relationship | `public_receipt_ref` / `receipt_public_ref` / `audit_receipt` | Straylight `TransitionReceipt`/`RecallReceipt` `types.ts:364-388,469-489` and `AuditEvent` `types.ts:495-529`; deferred `public_anchor_ref`; validator strict-per-section + equality cross-check `validate-fixtures.mjs:324` | Straylight (receipt primitives) + Dixie (public projection) | unresolved (two-spelling debt); requires review before implementation | Pick one canonical public field name; map to Straylight receipt vocab; clarify public-receipt-vs-audit split | Receipt/audit record shape and the public surface depend on it |
| I. Fail-closed semantics | `ingress.invalid_request` (reused) | Straylight `rejected_candidate` / `denied_transition` arch spec `:856-884`; Dixie refusal family `refusal-mapping.ts:10-33` | Straylight (primitive) + Dixie (ingress code) | aligned draft; may proceed as route-design draft only | Confirm canonical fail-closed meaning vs. Dixie-local refusal reuse | Fail-closed probe (E) wiring and refusal taxonomy depend on it |
| J. Idempotency semantics | `idempotency_key_draft` / `idempotency_scope_draft` | No Straylight `idempotency_key`; delegated to host/Dixie (ADR-026D §3.b); Recall keys `(tenant_id, caller_actor_id, request_key)` | Dixie | Dixie-local draft; requires review (confirmation of delegation) before implementation | Confirm Straylight delegates idempotency to Dixie; decide keying | Replay/double-mint protection undesigned until keying decided |
| K. Public/private projection boundary | probe `public_response` vs `audit` split | validator deep-walks `public_response` only `validate-fixtures.mjs:199-240`; 32F §8 minimize-at-source | Straylight (canonical rule) + Dixie (runtime serializer) | unresolved (runtime); requires review before implementation | Confirm canonical projection rule for admission outcomes | Runtime no-leak serializer cannot be finalized against draft shapes |
| L. Candidate-to-assertion relationship | `source_candidate_id` / `admission_transition_id` / `admitted_assertion_id` | `admit()` candidate→transition→assertion chain `estate.ts:140-265` | Straylight (semantics) + Dixie (ref names) | aligned draft; requires review before implementation | Confirm linkage semantics; field names remain draft | Linkage columns in storage records depend on it |
| M. Rejection/denial taxonomy | `admission.transition_denied` (draft) / audit `transition_denied` | explicit denied transition + kind `denied` receipt `estate.ts:140-265`; no `rejected` status | Straylight (semantics) + Dixie (refusal code) | aligned draft; requires review before implementation | Confirm explicit-denied vs pending-absence; no coined `rejected` | Reject probe (C) wiring and denial refusal code depend on it |
| N. Corrected-active status vs relationship | `corrected_active` (must NOT be coined) | `(superseded, active)` relation `types.ts:93,157`; arch spec `:910-921` | Straylight | unresolved framing; requires review before implementation | Confirm "corrected active" = `active` member of relation, not a status | Mis-coining a status would corrupt the supersession model |
| O. Storage/audit primitive boundary | candidate / transition / assertion / receipt / audit records | Straylight owns assertion/transition/receipt/audit *semantics* `types.ts`; Dixie owns ingress/idempotency/refusal log | Straylight (substrate) + Dixie (ingress storage) | unresolved; requires review before implementation | Confirm which records are substrate vs. ingress concerns | Phase 33K storage model could bake draft vocab as final |

---

## 7. Term ownership classification

Each term is classified as exactly one of: **likely Straylight-owned primitive**;
**Dixie-local route-contract draft**; **Freeside-local test/proof vocabulary**;
**shared route/client contract term**; **unresolved**. Classification is a
*proposal for the review to confirm*, not a final assignment.

| Term | Classification | Basis |
|------|----------------|-------|
| `candidate` | likely Straylight-owned primitive (as `CandidateAssertion` object) | `types.ts:551-565`; not a status value |
| `proposed` | likely Straylight-owned primitive | `AssertionStatus.proposed` `types.ts:86-94` |
| `admitted assertion` | shared route/client contract term (public label over canonical `active`) | `admit()`→`active` `estate.ts:140-265`; no bare `admitted` status |
| `active` | likely Straylight-owned primitive | `AssertionStatus.active` `types.ts:86-94` |
| `superseded` | likely Straylight-owned primitive | `AssertionStatus.superseded` + `supersedes_refs` `types.ts:93,157` |
| `corrected active` | unresolved (must not be coined as a status) | `(superseded, active)` relation only; arch spec `:910-921` |
| `admission transition` | likely Straylight-owned primitive | `admit_assertion` transition `types.ts:276-290` |
| `admit_assertion` | likely Straylight-owned primitive | `types.ts:278`; `estate.ts:140` |
| `transition_denied` | likely Straylight-owned primitive (audit event) | `AuditEvent` event types `types.ts:495-529`; `estate.ts:140-265` |
| `RecallUseInstruction` | likely Straylight-owned primitive | `types.ts:427-442` |
| `recall_eligible` | shared route/client contract term (draft spelling proposed by Dixie; public-safety projection over emergent disposition — §8 rule 4) | no Straylight flag; `dispositionFor` `policy.ts:187-241`; exact spelling non-final, no final public response schema frozen |
| `public_receipt_ref` / `receipt_public_ref` | shared route/client contract draft with Dixie-proposed spelling (public-safety surface — §8 rule 4; two-spelling debt unresolved) | not a Straylight term; nearest deferred `public_anchor_ref`; public receipt spelling debt remains unresolved, exact spelling non-final |
| `audit_receipt` | Dixie-local route-contract draft | Straylight owns `TransitionReceipt` `types.ts:364-388` and `AuditEvent` `types.ts:495-529` |
| `authority_signer_type_draft` | Dixie-local route-contract draft (field name); value `policy_service` is canonical | field name draft; value is `SignerType` `types.ts:122-130` |
| `policy_service` | likely Straylight-owned primitive | `SignerType` member `types.ts:122-130` |
| `tenant_id` | shared route/client contract term (Dixie host-layer; **not** a Straylight wedge primitive) | `host/tenancy.ts:1-57` |
| `estate_id` | likely Straylight-owned primitive | `types.ts:145-167,551-565` |
| `caller_actor_id` | shared route/client contract term (Dixie/host caller-envelope) | `host/types.ts:55-61` |
| `subject_actor_id` | unresolved (no Straylight primitive; only `Assertion.subject_refs`) | `types.ts:155` |
| `idempotency_key` | Dixie-local route-contract draft | delegated to host/Dixie (ADR-026D §3.b); no Straylight term |
| `ingress.invalid_request` | Dixie-local route-contract draft (existing Dixie refusal code) | `refusal-mapping.ts:10-33,61` |
| `admission.primitive_review_required` | Dixie-local route-contract draft (proposed `admission.*`) | 33G §11 draft; zero `admission.*` in source |
| `unsafe_projection_refused` | shared route/client contract term, draft spelling proposed by Dixie (proposed `admission.unsafe_projection_refused`; public-safety projection refusal — §8 rule 4) | 33G §11 draft; exact spelling non-final; distinct from Freeside adapter-local `unsafe_probe_projection`; no final public response schema frozen, no Freeside runtime/client work authorized |
| `candidate_not_admitted` | Dixie-local route-contract draft (proposed `admission.candidate_not_admitted`) | 33G §11 draft |

> **Freeside-local proof vocabulary (for contrast — must NOT become Dixie schema
> authority).** The Freeside v1 adapter's proof scenario labels
> (`before_admission_excluded`, `accepted_admitted_included`, `rejected_excluded`,
> `supersession_corrected_only`, `malformed_fail_closed`) and its adapter-local
> fail-closed codes (`unsupported_probe_shape`, `unknown_probe_version`,
> `unknown_probe_scenario`, `probe_public_surface_mismatch`,
> `unsafe_probe_projection`) are **Freeside-local test/proof vocabulary**
> (`admission-wedge-dixie-probe-adapter.ts:84-93,124-132`). They are test-only,
> not exported, and confer no Dixie or Straylight authority.

---

## 8. Canonical-vs-local decision rules

Conservative rules for deciding when a term needs Straylight review before it may
be treated as anything other than draft:

1. **Lifecycle / eligibility / continuity / audit terms require Straylight review
   before implementation.** If a term affects assertion lifecycle, recall
   eligibility, actor/estate continuity, or audit semantics (matrix rows A–E, L–O),
   treat it as requiring Straylight review before any implementation.
2. **Route transport-only terms may stay Dixie-local draft.** If a term is purely
   route transport / host-ingress (e.g. `idempotency_key`, `tenant_id`,
   `caller_actor_id`, ingress refusal codes), Dixie may keep it as a
   route-contract draft — but must still confirm Straylight delegation where the
   boundary is ambiguous (row J).
3. **Freeside adapter/test terms must not become Dixie schema authority.** If a
   term exists only as Freeside adapter/test vocabulary (§7 callout), it must never
   be promoted to Dixie schema authority.
4. **Public-safety terms are shared and require no-leak review.** If a term affects
   public response safety (`public_receipt_ref`/`receipt_public_ref`,
   `recall_eligible` projection, public outcome classes), treat it as a shared
   route/client contract term and require a no-leak review (rows H, K).
5. **Unresolved terms stay draft.** If a term is unresolved (`subject_actor_id`,
   `corrected_active`, the receipt two-spelling), it may appear in docs/probes only
   as **draft** and must not be treated as final.

---

## 9. Mapping from Phase 33G route contract to review dependencies

Each Phase 33G design section maps to the §5 review questions (and §6 matrix rows)
it depends on. None of these sections is unblocked by this gate; the mapping shows
*which review answers each section is waiting on*.

| Phase 33G section | Depends on review questions / rows |
|-------------------|-------------------------------------|
| §6 Request envelope | G (tenant/estate/actor binding), J (idempotency), F (authority/signer) |
| §7 Candidate payload boundary | A (candidate/proposed), L (candidate→assertion), K (projection boundary) |
| §8 Transition request shapes | B (admitted lifecycle), C (transition vocab), D/N (supersession/corrected-active), M (denial) |
| §9 Response envelope (public/private) | H (receipt/audit), E (recall eligibility), K (projection boundary) |
| §10 Public/private no-leak boundary | K (projection boundary), H (receipt), G (identity IDs) |
| §11 Refusal / error taxonomy | I (fail-closed), M (denial), J (idempotency conflict/replay codes) |
| §12 Idempotency semantics | J (idempotency), O (storage boundary) |
| §13 Storage write boundary | O (storage/audit boundary), A–D/L (record vocab), H (receipt records) |
| §14 Auth / consent boundary | F (authority/signer), G (identity binding) |
| §15 Recall eligibility projection | E (recall eligibility), D (supersession exclusion) |
| §16 Route-contract test vectors | A–E, L, M (every scenario's vocabulary) |
| §18 Freeside client implications | all (a client cannot bind to an unreviewed contract) |
| §19 Implementation preconditions | all (the review is itself precondition #7) |

---

## 10. Impact on Phase 33K storage/auth/consent design

- **Phase 33K may proceed only if it treats unresolved Straylight review answers as
  exit criteria or design assumptions.** It may begin in parallel as a
  draft-vocabulary-dependent design (33I §6 caveat), but it must not present draft
  vocabulary as resolved.
- The **storage model must not bake draft vocabulary as final** — candidate /
  transition / assertion / receipt / audit record shapes must reference the §6
  matrix rows and stay revisable against the review outcome (rows A–D, H, L, O).
- The **auth/consent design must not assume final tenant/estate/actor identity
  binding** — `tenant_id`/`caller_actor_id` are host-layer drafts, `subject_actor_id`
  is unresolved, and production binding is undefined (row G).
- **Receipt/audit storage must remain adaptable to the review outcome** — the
  public-receipt field name and the public/audit split are unresolved (row H).
- **Idempotency design must remain draft until the review outcome or explicit
  deferral** confirms Straylight delegates idempotency to Dixie (row J).
- **33K can run in parallel only if clearly marked draft/dependent**, with the §5
  answers as exit criteria; it must not be renamed as the Straylight review lane.

---

## 11. Impact on Phase 33L test-vector fixture draft

- **Phase 33L may convert the Phase 33G §16 vectors into non-runtime fixtures only
  if it marks unresolved vocabulary as draft.** The five `scenario_id`s are
  frozen-by-count (`validate-fixtures.mjs:49-57`) and must not be renamed, split,
  or removed.
- **Fixtures must not claim a final schema.**
- **Validator extensions must stay non-runtime / docs-bound** — the existing
  validator imports nothing from the app and deep-walks authored `public_response`
  only (`validate-fixtures.mjs:199-240`).
- **Test vectors should include explicit unresolved-review markers** for the rows
  the §6 matrix flags as unresolved (E, G, H, K, N, O).
- **No route tests or runtime tests** unless separately authorized.

---

## 12. Impact on Phase 33M / 33N route spike path

- **Phase 33M cannot authorize a spike until the review outcomes are resolved or
  explicitly deferred** (a future 33M acceptance bar requires the 33J review
  resolved-or-deferred — 33I §10).
- **A dev/operator-only spike cannot become production admission.**
- **Phase 33N remains not authorized.**
- **If a spike is ever authorized**, it must be **disabled by default** and use
  **draft/dev-only markers for unresolved vocabulary**.
- **No Freeside runtime/client integration** follows from this phase; the Freeside
  adapter stays test-only, not exported, not runtime-wired
  (`admission-wedge-dixie-probe-adapter.ts:100-108`).

---

## 13. Review request payload / handoff

A concise, directly reusable cross-repo handoff to the Straylight primitive owner.
**This phase does not edit Straylight**; this table is the draft request only.

| Question | Why it matters | Current Dixie / Freeside draft state | Proposed acceptable answer(s) | What remains blocked if unanswered |
|----------|----------------|--------------------------------------|-------------------------------|-------------------------------------|
| A. Is `proposed` the canonical pre-admission status, and `candidate` only the input object? | Storage candidate-record naming; pending-vs-denied distinction | Draft uses `candidate` (input) + `proposed` (status) | Confirm `proposed`; `candidate`=`CandidateAssertion` object | Candidate record + probe A semantics |
| B. Is the admitted status canonically `active` with no bare `admitted` status? | Public outcome label vs. canonical status | Draft uses `admitted` (label) over `active` | Confirm `active`; `admitted`=public label | Assertion record status; probe B |
| C. Are `admit_assertion` / `assertion_admitted` / `transition_denied` the canonical names? | Transition + audit-event wiring | Draft mirrors these names | Confirm names | Transition record + audit events |
| D/N. Is `(superseded, active)` a relation (not a `corrected_active` status)? | Supersession model integrity | Draft uses the relation; avoids coining a status | Confirm relation/direction | Supersession columns; probe D |
| E. How does `recall_eligible` (bool) reconcile with emergent `RecallUseInstruction` disposition? | Recall-eligibility projection correctness | Draft pairs a bool + instruction; only 2 of 4 instructions used | Confirm projection rule; close instruction gap | Recall-eligibility projection |
| F. Which signer roles may authorize `admit_assertion`? | Auth/competence design | Draft `authority_*_draft`; value `policy_service` | Confirm competent roles; field names stay draft | Auth/signature record |
| G. Which IDs are wedge primitives (`estate_id`/`actor_id`) vs. host-layer (`tenant_id`/`caller_actor_id`)? Is there a `subject_actor_id`? | Identity binding + cross-user consent | `estate_id`/`actor_id` aligned; `tenant_id`/`caller_actor_id` host; `subject_actor_id` unresolved | Confirm primitive set; define caller-vs-subject | Identity binding + consent design |
| H. What is the canonical receipt vocabulary and public-vs-audit split? | Receipt/audit record + public surface | Two-spelling `public_receipt_ref`/`receipt_public_ref`; `audit_receipt` | Map to `TransitionReceipt`/`AuditEvent`; pick one public field | Receipt records + public surface |
| I. What does fail-closed mean canonically (`rejected_candidate` / `denied_transition`)? | Refusal taxonomy grounding | Draft reuses `ingress.invalid_request` | Confirm canonical fail-closed semantics | Probe E + refusal taxonomy |
| J. Does Straylight delegate idempotency to Dixie? | Replay/double-mint protection | No Straylight term; ADR-026D delegates to host | Confirm delegation; Dixie decides keying | Idempotency design |
| K. What is the canonical public/private projection rule for admission outcomes? | Runtime no-leak serializer | Draft probe-shape only | Confirm projection rule | Runtime no-leak serializer |
| L. What are the canonical candidate→transition→assertion linkage semantics? | Linkage columns | Draft `source_candidate_id`/`admission_transition_id`/`admitted_assertion_id` | Confirm linkage; field names stay draft | Linkage columns |
| M. Is denial an explicit `transition_denied` (not a `rejected` status)? | Reject semantics | Draft binds to explicit denied transition | Confirm explicit-denied | Probe C + denial code |
| O. Which records are Straylight substrate vs. Dixie ingress storage? | Storage model boundary | Draft splits substrate vs. ingress | Confirm boundary | Phase 33K storage model |

---

## 14. Decision: next lane

> **Selected: Phase 33K — Admission Wedge storage/auth/consent precondition design
> gate (docs / decision-only), with unresolved Straylight primitive review answers
> treated as explicit exit criteria.**

**Reason:**

- Phase 33J should not block all further work indefinitely. The §6 matrix shows
  that the *lifecycle* vocabulary (rows A–D, L, M) is **strongly grounded** in
  existing Straylight primitives (`proposed`/`active`/`superseded`/`admit_assertion`/
  `transition_denied`), so the genuinely *unresolved* items (E, G, H, K, N, O) are
  bounded and can be carried as design assumptions rather than hard stops.
- Storage/auth/consent design can therefore start as a **draft design** that
  explicitly depends on the unresolved primitive-review outcomes as exit criteria
  (§10), per the 33I §6/§13 parallel-allowed caveat. This is the highest-leverage
  precondition lane and carries no scheduling penalty.
- **Route implementation remains blocked** under every option.

**Alternative (if a reviewer judges the §5 questions too foundational to assume):**

> **Alternative not selected: a separately named future Straylight primitive
> *response* reconciliation gate** — a narrower docs/decision-only gate that waits
> for Straylight's answers to §5/§13 and reconciles them into the matrix before any
> storage/auth design. This is a distinct future lane, **not** Phase 33K; Phase 33K
> remains the selected Admission Wedge storage/auth/consent precondition design
> gate (docs/decision-only) per §14, with unresolved Straylight primitive review
> answers treated as explicit exit criteria.

This alternative is **not selected**, for two reasons grounded in the matrix:
(1) most lifecycle vocabulary is already aligned-draft against confirmed Straylight
primitives, so a pure wait-and-reconcile lane would idle; (2) the unresolved items
are storage/identity/projection-shaped, which the storage/auth/consent design lane
must reason about anyway. It is recorded as the documented fallback per 33I §13.

**A route spike and route implementation are not selected under any option.** Do
**not** rename the storage/auth lane as 33J; Phase 33J remains the Straylight
primitive-review request lane.

---

## 15. Future Phase 33K boundaries

Because §14 selects the **storage/auth/consent precondition design gate**, Phase
33K is bounded as:

**Allowed**

- docs / decision-only;
- a storage/auth/consent design inventory;
- identify candidate / transition / assertion / receipt / audit records as
  **draft** record shapes (referencing the §6 matrix);
- define service-auth model options;
- define end-user consent model options;
- define a dev/operator-only scope option (explicitly marked non-production);
- define tenant/estate/actor binding **assumptions** (not final binding);
- define exit criteria that depend on the §5 primitive review;
- no implementation.

**Blocked**

- route / API handler implementation;
- route spike authorization;
- a live admission route;
- storage writes;
- migrations;
- auth implementation;
- live calls;
- production admission;
- production storage / auth / consent;
- public `remember-this`;
- Discord ingestion;
- user chat becoming memory;
- Freeside Characters runtime changes;
- package exports;
- LLM / voice;
- Finn production wiring;
- forget / revoke / correction UI;
- final schema freeze (unless separately authorized).

---

## 16. What remains blocked now

Phase 33J is a primitive-review request / dependency gate. It authorizes none of
the following; each remains blocked:

- route / API handler implementation;
- a live admission route;
- route spike authorization;
- storage writes;
- migrations;
- auth implementation;
- live calls;
- production admission;
- production storage / auth / consent;
- public `remember-this`;
- Discord command / history ingestion;
- user chat becoming memory;
- Freeside Characters runtime changes;
- package exports;
- LLM / voice;
- Finn production wiring;
- forget / revoke / correction UI;
- final schema freeze;
- production route deployment;
- a **completed Straylight primitive review** claim;
- final idempotency semantics;
- production signer / authority semantics;
- production tenant / estate / actor identity binding;
- a final route contract (33G remains a *draft design*);
- route implementation readiness;
- Phase 33N implementation.

If a later phase reaches for any of the above, it must re-open the Phase 33E probe
artifacts, the Phase 33F readiness gate, the Phase 33G design (as corrected by
33H), the Phase 33H acceptance gate, the Phase 33I decomposition gate, this review
gate, and the relevant Straylight decision records (ADR-022E durable-store gate;
ADR-026C / ADR-026D route guardrails — Straylight-repo decision records) first; it
must not silently expand scope.

---

## 17. Success criteria for Phase 33J

This phase succeeds if:

- it **identifies the primitive/vocabulary dependencies** (§5, §6, §9);
- it **separates Straylight-owned, Dixie-local, Freeside-local, shared, and
  unresolved terms** (§7);
- it **creates a reusable review request / handoff** (§5, §13);
- it **selects a docs/decision-only next lane** (§14 — Phase 33K storage/auth/
  consent design with the review answers as exit criteria);
- it does **not** mutate code / fixtures / probes / validator;
- it keeps all live / runtime / implementation lanes blocked (§16);
- Codex confirms the docs / decision-only scope.

---

## 18. Cross-references

- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I decomposition gate that selected this lane (its §6 Lane 1, §7, §13).
  Gains a minimal 33J status note.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)
  — Phase 33H acceptance gate; its §8 blocker D (Straylight primitive review) and
  §10 sequencing seed this request.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)
  — Phase 33G draft route-contract design; its §17 dependencies and §6–§16 sections
  seed §5/§9, and its §11 draft `admission.*` taxonomy seeds §7.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md)
  — Phase 33F readiness gate; its eleven-question Straylight-review enumeration
  corroborates §5.
- [`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](ADMISSION-WEDGE-PROBE-HARDENING-GATE.md)
  — Phase 33D hardening-decision gate + Phase 33E status note; the §6
  separately-gated-mutation invariant this gate honours.
- [`docs/ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md`](ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md)
  — Phase 33B Dixie-first ownership decision and the five-scenario minimum set.
- [`docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md`](ADMISSION-WEDGE-CONTRACT-RESPONSE.md)
  — Phase 33A contract response, the six-clause core invariant, and the
  service-auth-≠-consent boundary.
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md)
  — the draft v1 probe set, canonical-vs-draft vocabulary table, and no-leak rules.
  Gains a minimal 33J status note.
- [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the dependency-free, non-runtime validator (read-only; not modified). Its
  strict per-section receipt-spelling enforcement (`:324`) grounds §5 question H.
- [`docs/integration/phase-32e-recall-wedge-route-contract.md`](integration/phase-32e-recall-wedge-route-contract.md)
  — the Recall Wedge route contract and source-hierarchy split these gates are
  modelled on; `POST /api/recall/intake` is the seam the Admission route must stay
  distinct from, and the Straylight-owns-semantics / Dixie-serves split is restated
  load-bearingly here.
- `app/src/routes/recall-intake.ts`,
  `app/src/services/straylight-recall-intake/refusal-mapping.ts`,
  `app/src/config.ts`, `app/src/server.ts` — inspected **read-only** to ground the
  route seam (`POST /api/recall/intake`, mounted `server.ts:602-614`, gated on
  `config.recallIntakeEnabled`), the **two-part** refusal namespace
  (`refusal-mapping.ts:10-33`, `ingress.*`×6 + `guard.*`×2 + `seam.*`×12, with
  **zero** `admission.*` members), and the storage/auth reality (no admission
  route; PostgreSQL governance stores are **not** admission storage). None is
  modified.
- `@loa/straylight` — canonical primitive/substrate owner of the assertion
  lifecycle, read read-only in `../loa-straylight` (the §2 primitive sources).
  **No completed Straylight Admission-Wedge primitive review was found**, and this
  phase requests one; the local checkout may be stale (§2 caveat).
- freeside-characters `docs/ADMISSION-WEDGE-DIXIE-V1-MIRROR-REFRESH-ACCEPTANCE-GATE.md`
  and `packages/persona-engine/src/recall-wedge/admission-wedge-dixie-probe-adapter.ts`
  (Phase 45J / PR #177, **verified merged on GitHub** 2026-06-06) — the cross-repo
  acceptance that **recommended Dixie Phase 33F**; its mirror/adapter proof remains
  **test-only**, not exported, wired to no runtime path, and its proof labels are
  Freeside-local vocabulary (§7 callout). **Not edited by this phase.**

> **Phase 33K status note (added later).** Phase 33K
> ([`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md))
> is the **docs/decision-only** storage/auth/consent precondition design gate this
> gate's §14 selected. It reads this review register **read-only** and carries the
> §5 fifteen-item register (A–O) forward as **explicit exit criteria / design
> assumptions, not as solved facts** — flagging the genuinely unresolved matrix
> rows (E, G, H, K, N, O), plus the review-dependent/non-final idempotency row (J),
> for the future Phase 33L test-vector draft. It designs draft
> storage record categories, service-auth and end-user-consent model *options*, a
> dev/operator-only scope option, an idempotency precondition, a no-leak posture, and
> a threat model — and selects **Phase 33L (route-contract test-vector fixture draft,
> docs/non-runtime)** as the next lane. It **does not complete the Straylight
> primitive review**, implements no storage/auth/consent, mutates no probe or
> validator, and authorizes no route, route spike, live behavior, or schema freeze.
