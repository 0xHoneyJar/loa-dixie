# Admission Wedge — Draft Contract Probes (Phase 33C → 33E hardening)

> **Phase**: 33C (canonical fixture/probe draft) → **33E** (probe hardening
> draft v1 / vocabulary refinement)
> **Status**: **docs + non-runtime fixture/probe only.** No live route, no
> storage, no auth, no admission writes, no runtime behavior.
> **Schema status**: **draft v1 — NOT frozen, NOT canonical, NOT a route
> contract.** These probes are a *proposal* for cross-repo review, not a
> production schema.

This directory holds the Dixie-owned Admission Wedge contract probes. Phase 33C
authored them as **draft v0**; **Phase 33E** hardens them to **draft v1**
(`dixie_admission_wedge_probe_v1`) — refining vocabulary and field names and
adding draft hardening placeholders — **while preserving all five Phase 33C
semantic scenarios unchanged in meaning**. They are deterministic, fully
synthetic, public-safe JSON files plus an isolated, dependency-free validator.
They exist to pin a *shape* for cross-repo review — they do **not** implement
admission.

## What this is (and is not)

- **Is**: a set of static JSON contract probes and an offline validator that
  checks their shape, draft hardening markers, and no-leak properties.
- **Is not**: a live route, an API handler, storage, auth/consent, an admission
  implementation, a package export, a canonical schema, a route contract, or a
  frozen schema.

Per the [Phase 33B alignment decision](../../ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md),
**Dixie owns this first canonical probe proposal** for cross-repo review.
**Straylight (`@loa/straylight`) remains the canonical primitive / substrate
owner** of the assertion-lifecycle vocabulary; Dixie consumes and mirrors those
names rather than coining its own. A **Straylight primitive/vocabulary review is
required before any route design and has NOT been performed** (every probe
carries `straylight_primitive_review: "required_before_route_design"` and
`straylight_primitive_review_complete: false`). This work does **not** edit
Freeside Characters and does not mutate its local labels.

## Not authorized by Phase 33C / 33E

No live Dixie admission route, no route design, no production admission, no
production storage, no production auth/consent, no public `remember-this`, no
Discord command, no Discord history ingestion, no user chat becoming memory, no
Freeside Characters runtime change, no package export, no LLM/voice behavior, no
Finn production wiring, no forget/revoke/correction UI, and **no final schema
freeze**. Phase 33E adds **no** sixth probe.

To be unambiguous about current reality: Dixie today exposes a read-only,
default-off, fail-closed **recall** route (`POST /api/recall/intake`). It has
**no admission route, no admission concept in route code, and no production
storage**; admission semantics live upstream in `@loa/straylight`. Phase 33C/33E
implement no runtime behavior and change no Dixie application/source/route/
config code.

## The five probes (preserved)

Phase 33E **preserves all five** Phase 33C semantic scenarios — it does not
remove, rename, or split them, and adds no sixth probe. Each probe is a single
JSON object with a shared envelope: synthetic `input` (may carry a private
`unsafe_marker:` token), a draft `idempotency` placeholder, a modeled transition
/ assertion / recall projection, a `receipt_split` declaring the public/private
boundary, a private `audit` object, and a clean `public_response`. The
`public_response` is the only surface a caller would see, and the validator
proves it never leaks private material.

| File | Scenario | What it proves |
|------|----------|----------------|
| `candidate-pending-not-recallable.json` | A | A candidate exists as canonical `proposed`; no admission transition; no admitted assertion; `recall_eligible` is false; the public outcome uses no denied/rejected vocabulary (pending ≠ denied); the payload is not echoed. |
| `accept-candidate-to-admitted-assertion.json` | B | A candidate is accepted via an `admit_assertion` transition linking candidate → transition → admitted assertion (canonical status `active`); it becomes recall-eligible under draft policy; a public/private receipt split exists; the raw payload is not echoed. |
| `reject-candidate-no-assertion.json` | C | A candidate is denied by an **explicit** rejection transition (canonical `transition_denied` audit event); **no** admitted assertion is minted; the candidate stays non-recallable; a rejection receipt exists on the audit boundary; the public response is safe. |
| `supersede-with-corrected-assertion.json` | D | A prior assertion moves to canonical `superseded`; a corrected assertion is `active`; ordinary recall includes the corrected active assertion **only**; the superseded prior remains audit/provenance only; the public response is safe. |
| `malformed-or-unsafe-payload-fail-closed.json` | E | A malformed/unsafe input fails closed with a stable reason code from the existing Dixie refusal family; **no** admitted assertion is minted; no raw payload, unsafe marker, source material, or stack trace appears in the public response. |

## Phase 33E hardening (draft v1)

Phase 33E updates the draft probes to **v1 / hardening revision** without
implying a final schema. The hardening clarifies:

- **Draft v1 metadata.** `probe_version: dixie_admission_wedge_probe_v1`,
  `status: draft_contract_probe`, `hardening_phase: "33E"`, plus the explicit
  non-final markers `schema_final: false`, `canonical_schema: false`,
  `route_contract: false`, `runtime_enabled: false`,
  `production_admission: false`, `public_safe: true`.
- **Pending vs denied.** The pending probe is explicitly `proposed`/pending with
  no transition; its public outcome must **not** use
  `denied`/`rejected`/`transition_denied` vocabulary. The rejection probe binds
  that vocabulary to an **explicit** denied transition, not to a mere pending
  absence.
- **Admitted assertion lifecycle.** The accepted probe links candidate →
  transition → admitted assertion; the admitted assertion is canonical `active`
  and recall-eligible under draft policy. `admitted` is a lifecycle outcome
  label, not a final canonical status name.
- **Corrected active / supersession.** The corrected active assertion is the
  `active` member of a `(superseded, active)` pair (a relationship/direction,
  not a standalone status); ordinary recall includes the corrected active
  assertion only; the superseded prior is audit/provenance only.
- **Signer / authority (draft).** Transition-bearing probes carry
  `authority_signer_type_draft`, `authority_scope_draft`, and
  `authority_binding_final: false`. The field names and binding are draft; this
  is **not** a production auth claim, and service auth is not end-user consent.
- **Synthetic tenant/estate/actor binding.** Identity ids are short synthetic
  labels confined to the private `input`/`audit` sections, never the
  `public_response`. Every probe carries `synthetic_binding: true` and
  `identity_binding_final: false`.
- **Idempotency placeholder (draft).** Every write/transition/fail-closed probe
  carries an `idempotency` block (`idempotency_key_draft`,
  `idempotency_scope_draft`, `idempotency_final: false`). This is a placeholder
  closing the known Phase 33D gap; final idempotency semantics
  (candidate-id-keyed vs header-keyed vs both) are **not** decided here.
- **Receipt / audit split.** A `receipt_split` block declares the boundary:
  `public_receipt_ref` (public-safe, mirrored on `public_response` where a
  receipt is minted; `null` for the pending and fail-closed probes that mint no
  public receipt), `audit_receipt_ref` (audit-private), `audit_private: true`,
  and `public_audit_detail: false`. The full receipt detail stays on the private
  `audit` object.
- **Recall eligibility.** Pending/rejected/malformed remain recall-ineligible;
  the accepted active assertion is recall-eligible; the superseded prior is not
  ordinary-recall eligible; the corrected active assertion is ordinary-recall
  eligible. Eligibility is paired with the canonical `recall_use_instruction`
  (`RecallUseInstruction`) signal.
- **Straylight primitive review marker.** Every probe records
  `straylight_primitive_review: "required_before_route_design"` and
  `straylight_primitive_review_complete: false` — the review is **required
  before any route design and has not occurred**.

## Vocabulary: canonical (aligned) vs draft (proposed)

The probes **align** to canonical Straylight-owned vocabulary where it exists,
and clearly mark Dixie-proposed names as **draft**. Final naming reconciles at a
later, separately-gated phase; nothing here is frozen.

| Concept | Term used | Ownership / status |
|---------|-----------|--------------------|
| Pre-admission candidate state | `proposed` | Canonical `AssertionStatus` (Straylight-owned) — aligned. Not the Freeside-local `candidate_pending`. |
| Admitted assertion status | `active` | Canonical `AssertionStatus` (Straylight-owned) — aligned. There is no bare `admitted` status. |
| Act of admission | transition `admit_assertion` + audit event `assertion_admitted` | Canonical (Straylight-owned) — aligned. |
| Denied admission | audit event `transition_denied` (explicit denied transition) | Canonical (Straylight-owned) — aligned. Not a coined `rejected` status. |
| Correction | `(superseded, active)` pair + supersede link | Canonical statuses (Straylight-owned) — aligned. No coined `corrected_active` status. |
| Recallability signal | `RecallUseInstruction` (`usable` … `do_not_use_for_action`) | Canonical (Straylight-owned) — aligned. |
| Shape-failure reason code | `ingress.invalid_request` | Dixie-local refusal family (Dixie-owned) — aligned to existing code. |
| Class-failure reason code | `seam.class_validation_failed` | Dixie-local refusal family (Dixie-owned) — aligned to existing code. |
| Signer / authority field | `authority_signer_type_draft`, `authority_scope_draft`, `authority_binding_final` | **DRAFT** — Dixie-proposed; value `policy_service` is a canonical `SignerType` member, but the field name + binding are draft and not production auth. |
| Idempotency placeholder | `idempotency_key_draft`, `idempotency_scope_draft`, `idempotency_final` | **DRAFT** — placeholder only; semantics not final. |
| Receipt / audit split | `receipt_split` (`public_receipt_ref`, `audit_receipt_ref`, `audit_private`, `public_audit_detail`) | **DRAFT** — Dixie-proposed split, subject to reconciliation. |
| Link / receipt field names | `source_candidate_id`, `admission_transition_id`, `admitted_assertion_id`, `supersedes_assertion_id`, `superseded_by_assertion_id`, `recall_use_instruction`, `rendered_candidate_payload`, `receipt_public_ref` | **DRAFT** — Dixie-proposed, subject to reconciliation. |

The pending-vs-denied distinction is preserved deliberately: a candidate with no
transition is simply `proposed` (probe A), which is **not** the same as an
explicit `transition_denied` (probe C). The probes keep these on separate
scenarios so the distinction is provable rather than collapsed; the validator
additionally asserts the pending probe's public outcome uses no rejection
vocabulary.

## No-leak / public-private boundary rules (enforced by the validator)

The `public_response` is narrow; raw candidate/source/audit details remain
private. The validator deep-walks each `public_response` and fails if it finds
any of:

- the generic synthetic `unsafe_marker:` token, or any raw candidate payload /
  source material;
- known internal/foreign sentinel forms (e.g. `BODY_OVER_CAP`,
  `runtime_seam:internal:`, `*_PRIVATE_SENTINEL`);
- stack traces, `Error:`-style prefixes, or `file.ts:line` source references;
- URLs (`http(s)://`, `ws(s)://`), bearer tokens, JWTs, `sk-` keys, or
  `-----BEGIN` PEM material;
- long opaque IDs (`0x`-hex addresses, 40+ char hex runs, 32+ char opaque runs);
- audit-only / private keys (`tenant_id`, `estate_id`, `candidate_id`,
  `candidate_payload`, `raw_reasons`, `policy_reason`, `receipt_id`,
  `audit_receipt_ref`, `audit_private`, `private_reason_family`, the
  `idempotency_*_draft` placeholders, the `authority_*_draft` placeholders, and
  the transition/assertion linkage ids).

> **On sentinels.** No Dixie-side public leak-canary string exists in code (the
> only over-cap sentinel is an internal `Symbol`, never serialized). These probes
> therefore use a **generic synthetic `unsafe_marker:` token**, held only in the
> `input` and `audit` sections, and the validator proves it can never appear in a
> `public_response`. The Freeside-local sentinel string is **not** used here.

## Running the validator

```bash
node docs/admission-wedge/fixtures/validate-fixtures.mjs
```

The validator uses **Node built-ins only** (no package install, no network, no
storage, no env, no app/route imports). It checks that all five scenario files
exist and parse, that the five scenarios are preserved, that the shared draft v1
metadata and hardening markers are correct (`probe_kind`, `probe_version`,
`schema_final=false`, `canonical_schema=false`, `route_contract=false`,
`runtime_enabled=false`, `production_admission=false`, `public_safe=true`,
`hardening_phase=33E`, `identity_binding_final=false`, `synthetic_binding=true`,
`straylight_primitive_review_complete=false`), that the draft idempotency,
authority/signer, and receipt-split placeholders exist and are marked non-final,
that identity ids are synthetic-only, that each scenario satisfies its invariant
(including pending-vs-denied and the candidate→transition→admitted chain), and
that no `public_response` leaks. It prints a deterministic PASS/FAIL summary and
exits non-zero on any failure.

## What Phase 33E still does NOT authorize

Phase 33E hardens the draft probes; it changes nothing about what remains
blocked. It does **not** authorize or imply: a live admission route, route
design, storage writes, auth implementation, live calls, production admission,
production storage/auth/consent, a public `remember-this`, Discord ingestion,
user chat becoming memory, Freeside Characters runtime changes, package exports,
LLM/voice, Finn production wiring, a forget/revoke/correction UI, a final schema
freeze, a canonical/production schema, or a completed Straylight primitive
review. The draft idempotency, signer/authority, and identity-binding fields are
placeholders — not final idempotency semantics, not production auth, and not
production identity binding.

## Provenance

> **Phase 33I status note (added later).** Phase 33I
> ([`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](../../ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md))
> is a **docs/decision-only** implementation-readiness decomposition gate. It reads
> these draft v1 probes and the validator **read-only** — it mutates **no** probe
> JSON and does **not** change the validator. It decomposes the Phase 33H blockers
> into ordered future lanes (33J Straylight primitive review → 33K
> storage/auth/consent design → 33L route test-vector fixtures → 33M
> dev/operator-only spike authorization → 33N possible spike), defines the evidence
> required before any route handler, and selects **Phase 33J (Straylight primitive
> review request)** as the next lane. It authorizes no route, route spike, storage,
> auth, consent, live behavior, or schema freeze, and keeps the Straylight
> primitive review **required and not complete**.

> **Phase 33H status note (added later).** Phase 33H
> ([`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](../../ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md))
> is a **docs/decision-only** acceptance / implementation-readiness gate. It reads
> these draft v1 probes and the validator **read-only** — it mutates **no** probe
> JSON and does **not** change the validator. It **accepts** the Phase 33G route
> contract as a bounded docs-only draft (with two minor docs-only wording
> corrections to the 33G text only — refusal namespace is **two-part**; the
> receipt-split validator is **strict per-section**, see `validate-fixtures.mjs`
> `:321-335`), renders a **not-implementation-ready** verdict, inventories the
> blockers, and selects a docs-only **Phase 33I implementation-readiness
> decomposition gate**. It authorizes no route, storage, auth, consent, live
> behavior, or schema freeze, and keeps the Straylight primitive review **required
> and not complete**.

> **Phase 33G status note (added later).** Phase 33G
> ([`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](../../ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md))
> is a **docs-only route-contract design**. It reads these draft v1 probes
> **read-only** — it mutates no probe JSON and does not change the validator —
> and maps their five `public_response` shapes into paper-only route-contract
> test vectors, alongside a draft route identity, request/response envelope,
> idempotency sketch, and refusal taxonomy. It freezes **no** schema, implements
> **no** route, writes **no** storage, adds **no** auth, and keeps the Straylight
> primitive review **required and not complete**. (One reconciliation item it
> flags: the public-receipt reference appears here under two spellings —
> `public_receipt_ref` in `receipt_split` and `receipt_public_ref` in
> `public_response`; the design defers picking one canonical name to a later
> reconciliation.)

> **Phase 33F status note (added later).** Phase 33F
> ([`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md`](../../ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md))
> is a **docs/decision-only route-contract readiness gate**. It reads these draft
> v1 probes **read-only** — it mutates no probe JSON and does not change the
> validator. It assesses that the probes are a mature enough *semantic*
> foundation to begin a future **docs-only route-contract design** phase, while
> confirming they remain **draft v1, not a production schema, not a route
> contract**, and that the **Straylight primitive review is still required and
> not complete** (`straylight_primitive_review_complete: false`). It authorizes no
> route, storage, auth, consent, live behavior, or schema freeze.

> **Phase 33E status note (added later).** Phase 33E
> ([`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](../../ADMISSION-WEDGE-PROBE-HARDENING-GATE.md))
> implemented the draft v1 / vocabulary hardening the Phase 33D gate selected
> (its §7): it updated this README, the five probe JSONs, and the validator,
> preserved all five Phase 33C semantic scenarios, added **no** sixth probe, and
> did **not** add a live route, route design, storage, or auth — and it froze no
> schema. On the Freeside Characters side (separate repository, separately
> gated): Phase 45F was the earlier **v0** no-op adapter / validator proof; Phase
> 45I later refreshed the Freeside local mirrors to Dixie **v1**
> (`dixie_admission_wedge_probe_v1`) and updated adapter compatibility
> (test-only); and Phase 45J accepted that proof and recommended Dixie Phase 33F.
> None of that authorizes any new Freeside runtime/live/package/export behavior,
> and Phase 33E does not edit Freeside Characters.

> **Phase 33D status note.** Phase 33D
> ([`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](../../ADMISSION-WEDGE-PROBE-HARDENING-GATE.md))
> accepted these probes as valid **draft v0** semantic probes and decided **not**
> to mutate any probe JSON or this validator — deferring any hardening to this
> separately-gated Phase 33E, which preserves all five scenarios.

- [`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](../../ADMISSION-WEDGE-PROBE-HARDENING-GATE.md) — Phase 33D hardening-decision gate (§5 topics, §7 selected lane) and the Phase 33E status note recording this implementation.
- [`docs/ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md`](../../ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md) — Phase 33B Dixie-first ownership decision and minimum probe set (§6) / schema surfaces (§7) / vocabulary directions (§8).
- [`docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md`](../../ADMISSION-WEDGE-CONTRACT-RESPONSE.md) — Phase 33A contract response: the core invariant, draft v0 vocabulary, and reconciliation directions.
- [`docs/integration/phase-32e-recall-wedge-route-contract.md`](../../integration/phase-32e-recall-wedge-route-contract.md) — the Recall Wedge route contract and BFF/Straylight ownership split this probe set assumes (but does not mutate).
- `@loa/straylight` — semantic owner of the assertion lifecycle and the canonical vocabulary the probes align to. **No Straylight primitive review has been performed.**
