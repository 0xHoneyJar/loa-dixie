# Phase 33G — Admission Wedge Route-Contract Design

> **Phase**: 33G
> **Branch context**: `phase-33g-admission-wedge-route-contract-design`
> **Related**: Dixie Phase 33A–33F (loa-dixie); freeside-characters Phases 45E–45J
> **Status**: **docs / route-contract-design-only.** No route, route handler,
> storage, auth, consent, probe/validator mutation, fixture JSON, package,
> lockfile, test, CI, runtime, or live integration change.
> **This is a draft route-contract *design* on paper. It does not implement a
> route. It does not freeze a final/production schema. It does not claim the
> Phase 33E probes are a production schema. It does not claim the Straylight
> primitive review is complete. It does not finalize vocabulary, idempotency
> semantics, signer/authority semantics, or identity binding.**

> **Phase 33X revision note (added later).** This 33G draft's route purpose/non-goals,
> request envelope, idempotency, response envelope, refusal taxonomy, recall
> projection, and supersession refs have since been **revised on paper** by the
> docs-only Phase 33X route-contract revision draft
> ([`ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-DRAFT.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-DRAFT.md)),
> against the confirmed Straylight vocabulary (loa-straylight PR #65), the Phase 33U
> intake, the Phase 33V storage/auth/consent finalization, and the Phase 33W
> readiness-update checklist (its §6). Phase 33X **did not rewrite the original
> substantive 33G sections** — the revised positions live in the 33X doc, and the only
> Phase 33X change to this file is this minimal status / forward-pointer note — and it
> **froze nothing** (`route_contract_final: false`). The revised draft is **not**
> accepted/final; its
> acceptance and any vector/validator alignment are deferred to the separately-gated
> Phase 33Y route-contract revision-acceptance / vector-readiness decision gate.

This document is a **draft route-contract design** for a future Admission Wedge
intake route. It proposes — on paper only — a route identity, a request
envelope, a response envelope with a public/private split, an idempotency
sketch, a refusal/error taxonomy, storage/auth/consent preconditions, and a set
of route-contract test vectors mapped from the five Phase 33E draft v1 probes.

It is modelled on the Recall Wedge route contract
([`docs/integration/phase-32e-recall-wedge-route-contract.md`](integration/phase-32e-recall-wedge-route-contract.md))
as a structural precedent, and it executes the **docs-only route-contract design
lane that Phase 33F selected** (its §11–§12). It **does not** implement the
route, mount anything, write storage, add auth, freeze a schema, or authorize
any live behavior. Every shape below is a *proposal* for cross-repo review, not
a frozen contract and not a handler spec ready to build.

---

## 1. Phase title and status

- **Phase 33G — Admission Wedge route-contract design.**
- Dixie-side **docs-only** route-contract design.
- Follows Dixie Phase 33F / PR #123 (route-contract readiness gate) and
  freeside-characters Phase 45J / PR #177 (Dixie v1 mirror-refresh acceptance /
  next-lane decision gate).
- This is a **design contract draft**, not route implementation.
- It changes **no** routes, storage, auth, probes, validator, runtime behavior,
  source code, configuration, or production schema.
- It does **not** freeze a final/canonical/production schema.
- It does **not** mutate the Phase 33E probe JSONs (`hardening_phase: "33E"`,
  `dixie_admission_wedge_probe_v1`) or the validator. Per the Phase 33D §6
  invariant, any probe/validator mutation requires its own separately-gated
  phase. Phase 33G inspects them read-only and maps their semantics into
  paper-only test vectors.

The audience for this document is **future Dixie phases** (primarily a possible
Phase 33H acceptance/decision gate — see §20), the **Straylight
(`@loa/straylight`) primitive/vocabulary owner** (whose review remains a
precondition — see §17), and **freeside-characters** as an
interested-but-blocked downstream consumer (see §18).

---

## 2. Source chain

This design sits at the head of the Dixie route-contract ladder. It introduces a
*draft design proposal*; it freezes nothing and authorizes nothing.

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33A | #118 | Admission Wedge contract response / acceptance gate — accepts the *need* for a contract and draft v0 vocabulary; enumerates the core invariant and the open route-design questions. Does not freeze schema. |
| 33B | #119 | Fixture/probe ownership decision — Dixie owns the first canonical fixture/probe proposal; defines the five-scenario minimum set. Docs/decision-only. |
| 33C | #120 | Canonical fixture/probe draft v0 — five synthetic public-safe probe JSONs + dependency-free validator under `docs/admission-wedge/fixtures/`. |
| 33D | #121 | Probe hardening / contract-vocabulary-refinement gate — accepts the v0 probes; records hardening topics; decides **not** to mutate probes in 33D; recommends Phase 33E. |
| 33E | #122 | Probe hardening draft v1 / vocabulary refinement — bumps probes to `dixie_admission_wedge_probe_v1`, adds non-final markers and draft placeholders, hardens the validator; preserves all five scenarios; adds no sixth probe; freezes no schema. |
| 33F | #123 | Route-contract readiness gate — assesses the v1 probes as a mature enough *semantic* foundation to begin a docs-only design phase; names preconditions (Straylight review, idempotency, storage/auth/consent); selects this Phase 33G lane. Designs nothing. |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter track `dixie_admission_wedge_probe_v1`, **test-only**; v0 fails closed as `unknown_probe_version`. |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded, test-only purpose; **recommended Dixie Phase 33F as the next readiness gate**. It did **not** select Phase 33G — Dixie Phase 33F then selected Phase 33G as a docs-only route-contract design lane. Authorizes no live client, no package export, no runtime wiring. |

**Ownership posture carried by the whole chain (unchanged here):** Dixie owns the
HTTP/BFF ingress seam (route, tenant/estate binding, idempotency, refusal
mapping, no-leak projection); **Straylight (`@loa/straylight`) is the canonical
primitive/substrate owner** of the assertion-lifecycle vocabulary; Dixie
consumes and mirrors those names rather than coining its own; freeside-characters
does not own Dixie or Straylight vocabulary and keeps its proof labels local and
test-only.

---

## 3. Contract status and non-authority

To be unambiguous about what this document is and is not:

- This document is a **draft route contract design**.
- It is **not** a final production schema.
- It is **not** a route handler spec ready for implementation.
- It does **not** authorize implementation.
- It does **not** authorize storage writes.
- It does **not** authorize auth implementation.
- It does **not** authorize live calls.
- It does **not** authorize a public `remember-this`.
- It does **not** authorize Freeside Characters runtime changes.
- It does **not** claim a completed Straylight primitive review.
- It does **not** freeze vocabulary. Every Dixie-proposed name below remains
  draft and subject to reconciliation against Straylight-owned vocabulary.

The Phase 33E non-final markers carried by every probe
(`schema_final: false`, `canonical_schema: false`, `route_contract: false`,
`runtime_enabled: false`, `production_admission: false`,
`identity_binding_final: false`, `synthetic_binding: true`,
`straylight_primitive_review_complete: false`) describe the *inputs* to this
design. Nothing in this document relaxes any of them.

---

## 4. Proposed route identity

> **Proposed (draft):** `POST /api/admission/intake`

- **Method:** `POST` (a write-attempt verb; admission proposes/decides a state
  transition rather than reading existing state).
- **Path:** `/api/admission/intake`.

**Why this path.** The repo's existing write/intake seam is the Recall Wedge
route `POST /api/recall/intake` (`app/src/routes/recall-intake.ts`), mounted in
`app/src/server.ts` under `app.route('/api/recall/intake', …)` and gated on
`config.recallIntakeEnabled`. That establishes a clear repo-local convention:
**a BFF intake seam lives under `/api/<wedge>/intake`.** The Admission Wedge is a
distinct wedge, so it takes a distinct top-level namespace `/api/admission/`
rather than overloading `/api/recall/`. This keeps the suggested
`POST /api/admission/intake` while satisfying the existing naming pattern and the
Phase 33F §6.B requirement to "propose method + path … Must not mount anything."

State, explicitly:

- The route is **future/proposed only**. It does **not** exist in this phase.
  There is no admission route, no admission concept in route code, and no
  admission handler in Dixie today (the only intake route is the recall route).
- The route is **write-path oriented** and **must not be confused** with the
  Recall Wedge read/demo route `POST /api/recall/intake`. They are separate
  seams with separate envelopes, separate refusal taxonomies, and separate
  storage/auth posture. Admission writes governed-memory state; recall reads it.
- The route is for **candidate memory admission intake / transition decisions**,
  not arbitrary chat ingestion. It accepts a *candidate proposal* or a
  *transition request over an existing assertion*, never a stream of user
  messages.

---

## 5. Route purpose and non-goals

### Purpose (draft)

- Accept a **candidate admission request envelope** (a candidate proposal, or a
  transition request over an already-admitted assertion).
- Validate **candidate / admission transition intent** (shape, class, identity
  binding, idempotency) at the Dixie ingress seam.
- Apply or reference an explicit **admission / rejection / supersession /
  correction transition** whose *semantics* are owned upstream by Straylight.
- Return a **public-safe admission result** or a **fail-closed refusal**.
- Emit or reference **private audit material behind a private boundary**,
  never on the public response.

### Non-goals (draft)

- Discord history ingestion.
- Public `remember-this` command.
- User chat becoming memory automatically.
- A general memory write API.
- Public audit disclosure.
- Direct Straylight primitive mutation without a contract.
- LLM rewriting of candidate content.
- Character voice.
- Finn production wiring.
- Forget / revoke / correction UI.
- Production route implementation.

The core invariant the whole chain carries (33A §4, 45J): *candidate memory is
not admitted memory; candidate memory is not recallable before explicit
admission; an accepted transition creates or references an admitted assertion; a
rejected candidate never becomes recallable; supersession/correction preserves
auditability while ordinary recall includes only the corrected active assertion;
fail-closed paths do not leak raw candidate / private payload.* The route
contract below is a paper expression of that invariant — not its enforcement.

---

## 6. Draft request envelope

The fields below are **draft / non-final** and use the Phase 33E probe `input`
shape as their semantic anchor. Field names marked *(draft)* are Dixie-proposed
and subject to reconciliation; names marked *(canonical)* mirror **already-
established Straylight-owned** assertion-lifecycle / transition vocabulary (e.g.
`proposed`, `active`, `admit_assertion`) — that is the only sense in which
"canonical" is used here. **Identity binding is explicitly not in that set:** the
tenant / estate / actor binding below is **draft / provisional Admission Wedge
route-contract binding**. Canonical-vs-app-local identity vocabulary remains
unresolved (Phase 33F), and **production tenant / estate / actor identity binding
is not decided by Phase 33G** — it stays non-production and non-final. No real
IDs, URLs, tokens, or secrets appear here; the probe identity labels
(`tenant_demo`, etc.) are synthetic.

| Field / section | Purpose | Public/private classification | May appear in public response? | Open question / owner |
|-----------------|---------|-------------------------------|--------------------------------|-----------------------|
| `request_version` *(draft)* | Envelope/version discriminator so the contract can evolve. | Public-safe metadata. | Yes (echoed for correlation). | Versioning scheme undecided — Dixie (ingress) + Straylight. |
| `idempotency_key` *(draft)* | De-duplicate a write attempt (see §12). Probe placeholder is `idempotency_key_draft`. | Private. | **No.** | Header vs body, key scope — Dixie. **Precondition (§12).** |
| `tenant_id` *(draft / provisional binding)* | Tenant scope for the admission. | Private operational ID. | **No.** | Must be session-derived, not body-trusted. Canonical-vs-app-local identity vocabulary unresolved; production binding not decided by 33G — Dixie + Straylight. |
| `estate_id` *(draft / provisional binding)* | Estate scope for the admission. | Private operational ID. | **No.** | Identity binding non-final (`identity_binding_final: false`); production tenant/estate/actor binding remains non-production — Dixie + Straylight. |
| `caller_actor_id` *(draft)* | The service/actor making the request. | Private operational ID. | **No.** | Caller-vs-subject relationship undefined — Dixie. |
| `subject_actor_id` *(draft, optional)* | The actor the candidate is *about*, if different from the caller. | Private operational ID. | **No.** | Cross-user admission must stay blocked without a consent model (§14). |
| `service_auth_context` *(draft, reference)* | A reference/handle to how the calling service authenticated — **never a raw secret**. | Private. | **No.** | No admission auth exists today (§14) — Dixie. |
| `end_user_authorization_context` *(draft)* | End-user authorization/consent context **or** an explicit dev-only omission marker. | Private. | **No.** | Consent model undefined; dev-only scope must be marked non-production (§14). |
| `candidate` *(draft)* | The candidate payload + class + source linkage (see §7). | Private / admission-bound. | **No.** | Bounding/sanitization undecided — Dixie + Straylight. |
| `transition_request` *(draft)* | The requested transition (accept / reject / supersede) (see §8). | Private. | **No** (only its outcome class is public). | Transition vocabulary canonical — Straylight (§17). |
| `source_context` *(draft)* | Where the candidate came from (`source_kind`, `source_ref`). | Private. | **No.** | Raw-source retention boundary undecided. |
| `requested_public_projection` *(draft)* | What public projection the caller asks for (e.g., receipt only). | Public-safe request hint. | Echoable as a hint only. | Must not let callers widen the public surface — Dixie. |
| `audit_context` *(draft)* | Caller-supplied audit correlation, kept private. | Private. | **No.** | Audit retention policy undecided. |
| `client_context` *(draft)* | Non-authoritative client metadata (build, locale). | Public-safe, minimal. | Minimal echo only. | Must carry no PII/secrets — Dixie. |

> **This is a draft envelope, not a wire schema.** No field is frozen, typed, or
> authorized. Real types, required/optional status, and a version/kind
> discriminator are design outputs for a later phase and Straylight review (§17).

---

## 7. Candidate payload boundary

The `candidate` section is defined **as draft** with these properties:

- The candidate payload is **private / admission-bound**. In the probes it lives
  only in the private `input` and `audit` sections and carries a synthetic
  `unsafe_marker:` token to prove it never escapes.
- The **raw candidate payload must not appear in the public response.** The
  public surface carries only `rendered_candidate_payload: false` plus a safe
  summary — never the payload itself.
- The candidate payload **must be bounded / sanitized before any storage**
  (size, class validity, encoding). Bounding semantics are undecided here.
- The candidate payload **must be linked to its source/audit privately**
  (`source_kind`, `source_ref`, `candidate_id`) — these are private operational
  references, never public.
- A candidate **is not an admitted assertion.** It is canonical `proposed`
  (Straylight `AssertionStatus.proposed`), a proposal — not governed continuity.
- A candidate **is not recallable before explicit admission.** Probe A
  (`candidate_pending_not_recallable`) encodes exactly this: no transition, no
  assertion, `recall_eligible: false`.
- If the candidate is **malformed or unsafe, the path fails closed** (probe E):
  no transition, no assertion, no public receipt, a stable public reason code,
  and no payload/marker/source/stack-trace leak.

---

## 8. Transition request shapes

Four draft transition variants, anchored on the five probes. Each is described
at the contract level only — **no storage write is designed in implementation
detail.**

### 8.1 Accept candidate → admitted assertion (probe B)

- **Input intent:** admit a `proposed` candidate via a canonical
  `admit_assertion` transition.
- **Admitted assertion outcome:** a candidate→transition→assertion chain is
  created/referenced; the admitted assertion is canonical `active`.
- **Recall eligibility:** recall-eligible under draft policy
  (`recall_eligible: true`, `recall_use_instruction: usable`).
- **Public response class:** `admitted` (a lifecycle outcome label, **not** a
  canonical status — the canonical status is `active`).
- **Private audit behavior:** full receipt (policy reason, candidate ref, ids,
  canonical audit event `assertion_admitted`) on the private `audit` object.
- **Idempotency behavior (open question):** an accepted-transition replay must
  **not** create a duplicate assertion; final keying undecided (§12).

### 8.2 Reject candidate (no assertion) (probe C)

- **Input intent:** an explicit `admit_assertion` transition with
  `outcome: denied`.
- **Admitted assertion outcome:** **none minted** (`admitted_assertion_id:
  null`).
- **Recall eligibility:** not recallable (`recall_eligible: false`); rejection is
  terminal for recall eligibility.
- **Public response class:** `denied` (bound to the canonical audit event
  `transition_denied`, **not** a coined `rejected` status).
- **Private audit behavior:** a rejection receipt with canonical audit event
  `transition_denied` on the private `audit` object.
- **Idempotency behavior (open question):** a rejected-transition replay should
  be **stable** (same denied envelope), not re-decided (§12).

### 8.3 Supersede prior assertion with corrected assertion (probe D)

- **Input intent:** a follow-on transition over an already-admitted assertion;
  the prior moves to canonical `superseded`, a corrected assertion is canonical
  `active`. `(superseded, active)` is a **relation/direction, not a coined
  `corrected_active` status.**
- **Admitted assertion outcome:** corrected assertion `active`; prior assertion
  `superseded` (audit/provenance only).
- **Recall eligibility:** ordinary recall includes the **corrected active
  assertion only**; the superseded prior is `recall_eligible: false` with
  `recall_use_instruction: do_not_use_for_action` and is in
  `excluded_from_ordinary_recall`.
- **Public response class:** `superseded_with_correction`.
- **Private audit behavior:** supersession receipt + the superseded prior body on
  the private `audit` object.
- **Idempotency behavior (open question):** a supersession replay must **not**
  create a duplicate corrected assertion (§12).

### 8.4 Malformed / unsafe → fail closed (probe E)

- **Input intent:** a malformed or unsafe candidate input.
- **Admitted assertion outcome:** **none**; the request is refused at ingress
  before any transition.
- **Recall eligibility:** none (`recall_eligible: false`).
- **Public response class:** `refused` with a stable public `reason_code` from
  the existing Dixie refusal family (`ingress.invalid_request`).
- **Private audit behavior:** refusal recorded privately
  (`refusal_class`, `private_reason_family`, `raw_reasons`) — never public.
- **Idempotency behavior (open question):** a malformed-request replay behavior
  remains **draft** (probe note: "so a retried malformed submission coalesces");
  final semantics undecided (§12).

> **No storage writes are designed here.** These are contract-level
> input→outcome→audit→eligibility descriptions. The actual transactional write
> path, ordering, and rollback remain blocked and undesigned (§13, §22).

---

## 9. Draft response envelope

The response envelope has a **public/private split**. The public response is the
only surface a caller sees; the private/audit material lives behind a boundary
and is never serialized to the caller.

### 9.1 Public-safe response (draft)

May include (drawn from the probe `public_response` shapes):

- `request_version` *(draft)* — echoed for correlation.
- `outcome` *(draft)* — one of the public outcome classes
  (`accepted_as_proposed`, `admitted`, `denied`, `superseded_with_correction`,
  `refused`).
- `reason_code` *(draft)* — present on refusal; a stable public code (§11).
- `public_receipt_ref` *(draft)* — a public-safe receipt reference; `null` where
  no public receipt is minted (pending, fail-closed).
- `admitted_assertion_ref` *(draft)* — **only if safe and non-operational**;
  whether any assertion reference is public at all is an open question (§17).
- `recall_eligibility_projection` *(draft)* — the public recall-eligibility
  signal (`recall_eligible` boolean + canonical `recall_use_instruction`).
- `message` / `public_summary` *(draft)* — a safe, generic human-readable
  summary that classifies the outcome without leaking the hidden reason.

> **Field-name reconciliation (open question).** The Phase 33E probes expose the
> public-receipt reference under **two spellings**: `public_receipt_ref` (in
> `receipt_split`) and `receipt_public_ref` (in `public_response`). This contract
> must pick **one** canonical public field name during reconciliation; it is
> flagged here rather than silently resolved, because the probes are draft v1.
> The validator does **not** treat the two spellings as interchangeable: it pins
> each section to its own spelling — `receipt_split.public_receipt_ref` and
> `public_response.receipt_public_ref` — and cross-checks them for equality
> (`validate-fixtures.mjs:324`), so a `public_response` that used
> `public_receipt_ref` would fail. The reconciliation debt is that two distinct
> names coexist across the two sections, not that either field is unvalidated.

> **Phase 33H correction note (added later).** Two factual corrections were
> applied to this design by the Phase 33H acceptance gate
> ([`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)):
> (1) §11 previously called the existing Dixie refusal namespace "three-part" —
> it is **two-part** (`category.specific_reason`, one dot); (2) §9.1 previously
> said "the validator currently tolerates both" receipt spellings — the validator
> is **strict per section** (see the paragraph above). Both were docs-only wording
> fixes; no probe, validator, or source code changed, and the design's bounded
> scope is unchanged.

### 9.2 Private / audit response (internal only, draft)

May include (drawn from the probe private `audit` object):

- raw candidate reference (`candidate_id`, `candidate_payload`),
- source material reference (`source_ref`, `source_kind`),
- transition record reference (`admission_transition_id` /
  `supersession_transition_id`),
- audit receipt reference (`audit_receipt_ref`, `receipt_id`),
- raw reasons (`raw_reasons`),
- storage transition details,
- authority/signature details (`authority_signer_type_draft`,
  `authority_scope_draft`),
- operational tenant/estate/actor IDs.

> **The public response must not include any private/audit field.** The two
> objects are disjoint by construction: `audit_private: true`,
> `public_audit_detail: false`.

---

## 10. Public/private no-leak boundary

The following must **never** appear in a public response. Most of this list is
the **validator-enforced baseline**: the categories the Phase 33E validator
already deep-walks and rejects across each probe's `public_response` — its
configured `FORBIDDEN_PUBLIC_KEYS` (private/audit fields, identity/linkage IDs,
idempotency and authority/signer draft placeholders), plus its substring and
regex leak scans (credentials, URLs, JWT/`sk-`/bearer tokens, stack traces,
`file.ts:line` refs, long opaque IDs, internal sentinels, PEM/`Traceback`
markers). One item below — **storage internals** — is a **route-contract-level
prohibition**, not a literally-named validator category: the existing fixture
validator enforces the baseline no-leak categories, and Phase 33G **extends** the
route-contract design prohibition to include storage internals and any future
implementation/debug internals. Every bullet below except the one explicitly
tagged *(route-contract extension — not a named validator category)* is part of
the validator-enforced baseline:

- raw candidate payload (`candidate_payload`, `corrected_candidate_payload`);
- source material (`source_ref`, `source_kind`);
- raw reasons (`raw_reasons`);
- audit/private details (`policy_reason`, `private_reason_family`, the private
  receipt object);
- tenant/estate/actor operational IDs (`tenant_id`, `estate_id`,
  `candidate_id`, `proposing_actor_id`, `correcting_actor_id`,
  `caller_actor_id`, `source_candidate_id`);
- idempotency key values (`idempotency_key_draft`, `idempotency_scope_draft`);
- signer/private authority material (`authority_signer_type_draft`,
  `authority_scope_draft`);
- stack traces and `file.ts:line` source references;
- tokens (bearer, JWT `eyJ…`, `sk-…`);
- URLs (`http(s)://`, `ws(s)://`);
- private sentinels (the synthetic `unsafe_marker:` token, `*_PRIVATE_SENTINEL`,
  `runtime_seam:internal:`, `BODY_OVER_CAP`);
- long raw IDs (`0x`-hex, 40+ char hex runs, 32+ char opaque runs);
- debug traces (`Traceback`, `Error:` prefixes, `node_modules/`, `-----BEGIN`);
- **storage internals** *(route-contract extension — not a named validator
  category)*: a broader Phase 33G design-level prohibition, not literally encoded
  as a validator blocklist entry; the baseline validator above does not scan for
  a dedicated "storage internals" category.

Per 32F §8, **public minimization is at the source**: "a downstream adapter will
drop it" is not a sufficient reason to emit private material, and a public
refusal must be informative enough to classify but generic enough not to leak the
hidden reason.

---

## 11. Draft refusal / error taxonomy

A **draft** taxonomy. Ingress-shape failures reuse the **real, existing Dixie
refusal codes** (`ingress.invalid_request`, `seam.class_validation_failed`) that
the probes already adopt and that live in
`app/src/services/straylight-recall-intake/refusal-mapping.ts`. Admission-specific
outcomes are proposed under a new `admission.*` family, styled to match the
existing two-part dotted namespace (`category.specific_reason` — a single
`ingress`/`guard`/`seam` category prefix joined by one dot to a single
underscore-reason). Per 33A §5.J,
the admission taxonomy is decided **explicitly** and does **not** silently
inherit recall's `seam.*` codes by default.

| Code | Public-safe meaning | Can it be public? | Private/audit detail boundary | Related v1 probe |
|------|---------------------|-------------------|-------------------------------|------------------|
| `ingress.invalid_request` *(existing Dixie code)* | The request was malformed and was refused. | Yes (stable, generic). | Finer `private_reason_family` + `raw_reasons` stay private. | E (`malformed_or_unsafe_payload_fail_closed`). |
| `admission.candidate_not_admitted` *(draft)* | The candidate exists as a proposal and is not (yet) admitted. | Yes (generic). | Pending vs. never-decided detail private. | A (`candidate_pending_not_recallable`). |
| `admission.transition_denied` *(draft)* | The admission transition was denied; no assertion created. | Yes (bound to canonical `transition_denied`). | Policy reason private. | C (`reject_candidate_no_assertion`). |
| `admission.duplicate_replay` *(draft)* | A prior identical request was replayed; the prior result stands. | Yes (no new state). | Cached result reference private. | (idempotency, §12). |
| `admission.idempotency_conflict` *(draft)* | A conflicting request reused an idempotency key; fail closed. | Yes (generic). | Conflict detail private. | (idempotency, §12). |
| `admission.storage_unavailable` *(draft)* | The admission store is unavailable; no write occurred. | Yes (generic — mirrors recall's `seam.storage_unavailable` no-leak rule). | Underlying exception text **never** public. | (storage, §13). |
| `admission.authorization_required` *(draft)* | Service or end-user authorization is required and absent. | Yes (generic). | Which authz failed stays private. | (auth, §14). |
| `admission.authorization_denied` *(draft)* | Authorization was present but denied. | Yes (generic). | Denial reason private. | (auth, §14). |
| `admission.rate_limited` *(draft)* | The caller exceeded an admission rate limit. | Yes (generic). | Limit/window private. | (write-path protection, §12). |
| `admission.unsafe_projection_refused` *(draft)* | A requested public projection was unsafe and was refused. | Yes (generic). | Offending projection private. | E / no-leak (§10). |
| `admission.primitive_review_required` *(draft)* | The operation depends on a Straylight primitive review that is not complete. | Yes (generic). | Which vocabulary is unresolved private. | (review dependency, §17). |

> **These are not final production codes.** Names, HTTP status mappings, and the
> public/private split are draft and must be reconciled (Dixie owns the ingress
> taxonomy; Straylight owns the underlying transition/denial semantics).

---

## 12. Draft idempotency semantics

**Draft, not final.** The Phase 33E `idempotency_*_draft` fields are placeholders
(`idempotency_final: false`); the keying strategy is undecided.

- An **idempotency key is required** for this write-attempt route (mirroring the
  Recall route's mandatory `Idempotency-Key`, which refuses at ingress when
  missing/oversized).
- The **key scope** should include `tenant_id` / `estate_id` / subject /
  transition intent. The probes hint at scope labels
  (`per_tenant_candidate_write_draft`, `per_tenant_admission_transition_draft`,
  `per_tenant_supersession_transition_draft`) — all draft.
- An **identical replay** should return the **same public-safe result or receipt
  reference** without re-deciding (the Recall route returns the prior response
  verbatim and does not re-invoke the seam).
- A **conflicting replay** (same key, different intent) should **fail closed**
  (`admission.idempotency_conflict`).
- A **rejected-transition replay** should be **stable** (same denied envelope).
- An **accepted-transition replay** must **not** create a duplicate assertion.
- A **supersession replay** must **not** create a duplicate corrected assertion.
- **Malformed-request replay behavior remains draft.**
- The **idempotency key must not be public** (§10).
- **Final idempotency semantics require review before implementation**
  (candidate-id-keyed vs header-keyed vs both — undecided). This is a Phase 33F
  precondition (its §10) and is **not** resolved here.

---

## 13. Storage write boundary

Defined at the **contract level only**:

- The route design **assumes a future storage write path** but designs no
  storage.
- **Implementation requires a storage model before a live route.** No model is
  proposed here.
- A future write path must distinguish: a **candidate record**, a **transition
  record**, an **admitted assertion record**, a **receipt/audit record**, and a
  **supersession relation** (`supersedes_assertion_id` /
  `superseded_by_assertion_id`).
- **Existing PostgreSQL-backed infrastructure is not denied.** Dixie has a
  `dbPool`, migrations, and reputation/governance stores
  (`PostgreSQLReputationStore`, `MutationLogStore`, `AuditTrailStore`,
  `DynamicContractStore`) in `app/src/server.ts`. **None of that is Admission
  Wedge admission storage**, and its presence grants no admission write
  authorization. The Recall Wedge estate path uses only an in-process,
  non-durable `BoundedEstateStore`, with a durable estate store gated by
  **ADR-022E (held)**.
- **This phase does not create Admission Wedge production admission / estate /
  keyring / assertion storage.**
- **This phase does not write storage.**
- **This phase does not add migrations.**

---

## 14. Auth / consent boundary

Defined as **draft**:

- **Service authentication is required.** A calling service must authenticate to
  an admission route. **No admission auth exists today**; the Recall route
  authenticates via JWT/wallet + allowlist, and `dev_signature` is merely a
  member of the signature-type enum with **no** authentication logic behind it
  (not a backdoor).
- **End-user authorization/consent is required** for production user-facing
  admission. No consent mechanism exists today.
- A **dev/operator-only route may explicitly scope end-user auth out**, but such
  a route **must be marked non-production**. (Compare the Recall Wedge dev seed:
  default-off, dev/operator-only, synthetic tenant only, never production
  admission.)
- The **caller actor and subject actor relationship must be defined**
  (`caller_actor_id` vs `subject_actor_id`).
- **Cross-user admission must remain blocked** without an explicit consent
  model. The Recall route already rejects body identity overrides
  (`ingress.cross_tenant_body_mismatch`) and derives identity from the session
  wallet; an admission route should follow the same session-derived posture.
- **Auth secrets must not appear** in public responses, docs examples, or audit
  projections. `service_auth_context` is a reference/handle, never a raw secret.

> Service authentication only proves a service may *call* Dixie; it does **not**
> prove the end user, channel, tenant, or surface is authorized (the 32F §7
> boundary, restated load-bearingly). **Service auth ≠ end-user consent.**

---

## 15. Recall eligibility projection

Defined as **draft**, reconciling against existing Recall Wedge semantics:

- **Pending candidate** (probe A): **not recallable** (`recall_eligible: false`).
- **Rejected candidate** (probe C): **not recallable**; rejection is terminal.
- **Accepted admitted assertion** (probe B): **recall eligible if active and
  policy permits** (`active` + `recall_use_instruction: usable`).
- **Superseded prior assertion** (probe D): **not ordinary-recall eligible**
  (`do_not_use_for_action`, in `excluded_from_ordinary_recall`).
- **Corrected active assertion** (probe D): **ordinary-recall eligible if active
  and policy permits** (`active` + `usable`).
- **Malformed/unsafe** (probe E): **not recallable.**
- The projection pairs a boolean `recall_eligible` with the canonical
  `RecallUseInstruction` signal so future reconciliation is cheap.

> This projection **remains draft until Straylight / Recall Wedge alignment is
> completed** (§17, question 6). The mapping from admission eligibility to the
> canonical `RecallUseInstruction` set is a Straylight-owned review item.

---

## 16. Route-contract test vectors

The five Phase 33E v1 probes mapped to **future** route-contract test vectors.
These are **test-vector *designs*, not executable tests.** No test file is
created, and no probe/fixture is mutated. Field references are read-only from the
probes.

### A. `candidate_pending_not_recallable`

- **Route request condition:** a candidate proposal with **no** transition
  request (a candidate-write intent only).
- **Expected public response class:** `accepted_as_proposed` with
  `candidate_state: proposed`, `recall_eligible: false`,
  `rendered_candidate_payload: false`, no public receipt
  (`public_receipt_ref: null`).
- **Expected private/audit effect:** a private audit receipt
  (`decision: none_yet`); candidate payload + source private only.
- **Expected recall eligibility:** **not recallable** (empty
  `ordinary_recall_members`).
- **Expected idempotency behavior:** candidate-write replay returns the same
  proposed result; no assertion minted (draft).
- **No-leak assertion:** no `candidate_payload`, `unsafe_marker:`, tenant/estate/
  actor id, or audit detail in the public response.

### B. `accept_candidate_to_admitted_assertion`

- **Route request condition:** an `admit_assertion` transition over a `proposed`
  candidate.
- **Expected public response class:** `admitted` with `assertion_status: active`,
  `recall_eligible: true`, `recall_use_instruction: usable`,
  `rendered_candidate_payload: false`, a public receipt reference.
- **Expected private/audit effect:** candidate→transition→assertion chain;
  private receipt with canonical audit event `assertion_admitted`.
- **Expected recall eligibility:** recall-eligible under draft policy (assertion
  in `ordinary_recall_members`).
- **Expected idempotency behavior:** accepted-transition replay **must not**
  create a duplicate assertion (draft).
- **No-leak assertion:** no candidate payload, source, ids, or authority/signer
  draft fields in the public response.

### C. `reject_candidate_no_assertion`

- **Route request condition:** an explicit `admit_assertion` transition with
  `outcome: denied`.
- **Expected public response class:** `denied` with `recall_eligible: false`,
  `rendered_candidate_payload: false`, a public receipt reference; **no**
  assertion.
- **Expected private/audit effect:** rejection receipt with canonical audit event
  `transition_denied`, `recall_eligibility_result: not_eligible` (private).
- **Expected recall eligibility:** **not recallable** (terminal).
- **Expected idempotency behavior:** rejected-transition replay is **stable**
  (same denied envelope) (draft).
- **No-leak assertion:** no `policy_reason`, candidate payload, or operational
  ids in the public response.

### D. `supersede_with_corrected_assertion`

- **Route request condition:** a supersession transition over an existing
  `active` assertion (`prior_assertion_id` → corrected assertion).
- **Expected public response class:** `superseded_with_correction` with
  `active_assertion_status: active`, `recall_eligible: true`,
  `recall_use_instruction: usable`, a public receipt reference.
- **Expected private/audit effect:** supersession receipt; superseded prior body
  retained audit/provenance only.
- **Expected recall eligibility:** ordinary recall includes the **corrected
  active assertion only**; the superseded prior is excluded
  (`do_not_use_for_action`).
- **Expected idempotency behavior:** supersession replay **must not** create a
  duplicate corrected assertion (draft).
- **No-leak assertion:** no superseded prior payload, corrected candidate
  payload, source, or ids in the public response.

### E. `malformed_or_unsafe_payload_fail_closed`

- **Route request condition:** a malformed/unsafe candidate input.
- **Expected public response class:** `refused` with
  `reason_code: ingress.invalid_request`, `recall_eligible: false`,
  `rendered_candidate_payload: false`, **no** public receipt.
- **Expected private/audit effect:** refusal recorded privately
  (`refusal_class`, `private_reason_family`, `raw_reasons`); no transition, no
  assertion.
- **Expected recall eligibility:** **not recallable.**
- **Expected idempotency behavior:** malformed-request replay behavior remains
  **draft** (coalesce rather than mint duplicate refusal state).
- **No-leak assertion:** no `unsafe_marker:`, raw payload, source material, stack
  trace, `raw_reasons`, or operational id in the public response.

---

## 17. Straylight primitive review dependencies

- The **Straylight (`@loa/straylight`) primitive/vocabulary review remains
  required** (`straylight_primitive_review: "required_before_route_design"`,
  `straylight_primitive_review_complete: false` on every probe) **or must be
  explicitly deferred** by Straylight/Dixie governance. **It is not complete**,
  and **no completed-review artifact exists.** This document does not perform,
  complete, or claim that review.
- The current route contract uses **draft vocabulary**; every Dixie-proposed name
  here is provisional.
- Dependencies the review must resolve (or explicitly defer):
  - **candidate / proposed state** — confirm canonical `proposed` (distinct from
    the Freeside-local `candidate_pending`);
  - **admitted assertion lifecycle** — confirm canonical `active`; no bare
    `admitted` status;
  - **admission transition vocabulary** — confirm `admit_assertion` + audit
    events `assertion_admitted` / `transition_denied`;
  - **supersession / correction relation** — confirm `(superseded, active)` is a
    relation, not a coined `corrected_active` status;
  - **recall eligibility representation** — reconcile against the canonical
    `RecallUseInstruction` set and Recall Wedge semantics;
  - **authority / signer vocabulary** — `authority_*_draft` field names and
    binding are draft and **not** production auth (`policy_service` is a
    canonical `SignerType` member, but the field names/binding are draft);
  - **tenant / estate / actor binding** — synthetic-only today
    (`identity_binding_final: false`); production binding undefined;
  - **receipt / audit relationship** — reconcile the
    `public_receipt_ref` / `receipt_public_ref` naming (§9.1) and the
    public-receipt-vs-audit-receipt split;
  - **fail-closed semantics** — confirm what fail-closed means in canonical
    primitive terms vs the Dixie-local refusal family the probes reuse;
  - **idempotency semantics** — canonical idempotency for admission transitions
    (§12).
- **Do not claim the review is complete.**

---

## 18. Freeside Characters client implications

- **Freeside Characters must not implement a live client yet.**
- Freeside **may later use the route contract to design a client** — but **only
  after the Dixie contract is accepted** (a future Dixie phase), and even then
  the names remain reconciliation-bound.
- Freeside's current v1 mirror/adapter proof is **test-only**: a pure, local,
  no-op semantic mapping layer consumed only by its own test, not exported, not
  wired to any runtime path, with v0 failing closed as `unknown_probe_version`.
- **No Discord command or `/remember-this` is authorized.**
- **No user chat becomes memory.**
- **No Freeside package/runtime change is authorized by this Dixie design doc.**
- Freeside §7 live-memory-admission gates and §8 prohibitions (RECALL-WEDGE
  decision map) stay in force: app logs are not governed memory by default; no
  ambient recall; no passive listening; storage availability does not imply
  admission permission.

---

## 19. Implementation preconditions

Before any route implementation, **all** of the following are required (none is
satisfied or authorized here):

- an **accepted route contract** (a future acceptance gate — §20);
- a **storage model** (§13);
- an **auth model** (§14);
- an **end-user authorization/consent model** — or an explicit, marked
  **dev/operator-only scope** (§14);
- an **idempotency design** (final semantics — §12);
- a **no-leak public/private response design** (§9–§10);
- the **Straylight primitive review resolved or explicitly deferred** (§17);
- a **migration / backward-compatibility plan** if a storage schema is needed
  (§13);
- a **test plan** (the §16 vectors made executable, plus negative/no-leak tests);
- a **rollback / failure plan** (partial-failure behavior for a multi-step
  write);
- an **operational logging policy** that preserves the no-leak boundary at
  runtime.

---

## 20. Decision: next lane

> **Selected (preferred): Phase 33H — Admission Wedge route-contract acceptance /
> implementation-readiness decision gate (docs / decision-only).**

**Why:**

- 33G should **not** jump directly to route implementation.
- The newly drafted route contract should be **accepted / audited first**.
- 33H should decide whether to proceed to:
  - more **contract hardening**,
  - the **Straylight primitive review**,
  - **storage/auth design**,
  - or a **dev/operator-only route spike** (justified, not implemented in 33H).

**Alternative (if a direct implementation-readiness gate is premature):**
**Phase 33H — Admission Wedge route-contract design acceptance gate**, a narrower
docs/decision-only gate that only accepts/rejects/patches this design and
identifies blockers before any readiness assessment.

Either way, **Phase 33H is docs / decision-only** and authorizes no route,
storage, auth, consent, live behavior, or schema freeze.

---

## 21. Future Phase 33H boundaries

**Allowed**

- docs / decision-only;
- accept / reject / patch the route-contract design;
- identify blockers;
- decide the next lane;
- possibly **request** the Straylight primitive review;
- possibly **request** a storage/auth/consent design gate;
- possibly **authorize** a future dev/operator-only route spike **only if
  explicitly justified** — but **not implement it in 33H**.

**Blocked**

- route / API handler implementation;
- a live admission route;
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
- final schema freeze (unless separately authorized).

---

## 22. What remains blocked now

Phase 33G is a docs-only design. It authorizes none of the following; each
remains blocked:

- route / API handler implementation;
- a live admission route;
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
- a completed Straylight primitive review claim;
- final idempotency semantics;
- production signer / authority semantics;
- production tenant / estate / actor identity binding;
- a final route contract (this is a *draft design*, not a final contract).

If a later phase reaches for any of the above, it must re-open the Phase 33E
probe artifacts, the Phase 33F readiness gate, this design, and the relevant
Dixie ADRs (ADR-022E durable-store gate; ADR-026C/026D route guardrails) first;
it must not silently expand scope from this design.

---

## 23. Success criteria for Phase 33G

This phase succeeds if:

- it proposes a **bounded draft route contract on paper** (§4–§15);
- it maps **all five v1 probe scenarios** to route-contract test vectors (§16);
- it defines the **public/private boundary and no-leak requirements** (§9–§10);
- it drafts **idempotency semantics** (§12);
- it drafts a **refusal/error taxonomy** (§11);
- it carries **storage / auth / consent / primitive-review preconditions**
  (§13–§14, §17, §19);
- it selects a **docs/decision-only next lane** (§20–§21);
- it does **not** implement or authorize live route behavior;
- it does **not** mutate probes, the validator, source, tests, fixtures, config,
  or any code;
- only docs files change (this new file plus at most two small cross-reference
  notes — §24);
- Codex confirms the docs-only scope.

---

## 24. Cross-references

- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md)
  — Phase 33F readiness gate; it assessed the v1 probes as a mature semantic
  foundation and selected this design lane (its §11–§12).
- [`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](ADMISSION-WEDGE-PROBE-HARDENING-GATE.md)
  — Phase 33D hardening-decision gate and the Phase 33E status note; the source
  of the draft v1 probe vocabulary this design maps.
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md)
  — the draft v1 probe set, vocabulary table, and no-leak rules whose
  `public_response` shapes the §16 test vectors are read from.
- [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the dependency-free validator that enforces the shape, non-final markers, and
  no-leak boundary the §10/§16 requirements rely on (read-only; not modified).
- [`docs/ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md`](ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md)
  — Phase 33B Dixie-first ownership decision and the five-scenario minimum set.
- [`docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md`](ADMISSION-WEDGE-CONTRACT-RESPONSE.md)
  — Phase 33A contract response, the core invariant, and the open route-design
  questions this design begins to answer (on paper).
- [`docs/integration/phase-32e-recall-wedge-route-contract.md`](integration/phase-32e-recall-wedge-route-contract.md)
  — the Recall Wedge route contract this design is modelled on structurally;
  `POST /api/recall/intake` is the seam the Admission route must stay distinct
  from.
- `app/src/routes/recall-intake.ts`,
  `app/src/services/straylight-recall-intake/refusal-mapping.ts`,
  `app/src/config.ts`, `app/src/server.ts` — inspected **read-only** to ground
  the route-seam, refusal vocabulary, and storage/auth reality and avoid false
  claims. None is modified.
- `@loa/straylight` — canonical primitive/substrate owner of the assertion
  lifecycle and vocabulary the draft aligns to. **No Straylight primitive review
  has been performed** (§17).
- freeside-characters `docs/ADMISSION-WEDGE-DIXIE-V1-MIRROR-REFRESH-ACCEPTANCE-GATE.md`
  (Phase 45J / PR #177) — the cross-repo acceptance that **recommended Dixie Phase
  33F as the next readiness gate**. Dixie Phase 33F then selected this Phase 33G
  docs-only route-contract design lane; Phase 45J did not select or authorize
  Phase 33G. The Freeside mirror/adapter proof remains test-only (§18).
