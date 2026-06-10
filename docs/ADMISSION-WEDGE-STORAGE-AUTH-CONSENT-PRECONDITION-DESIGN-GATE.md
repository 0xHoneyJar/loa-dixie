# Phase 33K — Admission Wedge Storage/Auth/Consent Precondition Design Gate

> **Phase**: 33K
> **Branch context**: `phase-33k-admission-wedge-storage-auth-consent-design`
> **Related**: Dixie Phase 33A–33J (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle, signer/keyring, receipt/audit,
> and storage-adapter primitives
> **Status**: **docs / decision-only.** No route, route handler, storage, auth,
> consent, probe/validator mutation, fixture JSON, package, lockfile, test, CI,
> generated, or live integration change.
> **This is a storage/auth/consent *precondition design* gate, not implementation.**
> It designs — on paper only — the storage, service-authentication, and end-user
> consent preconditions that must be satisfied *before* any Admission Wedge route
> implementation or route spike can be considered. It changes **no** routes,
> storage, auth, probes, validator, runtime behavior, or production schema; it does
> **not** freeze a final/production schema; and it does **not** authorize a route
> spike.

This document follows the Dixie Phase 33J Straylight primitive-review request /
vocabulary-dependency gate
([`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)),
which issued the §5 fifteen-item review register (A–O) to the Straylight primitive
owner and **selected this Phase 33K storage/auth/consent precondition design gate
as the next lane, with the unresolved Straylight primitive-review answers treated
as explicit exit criteria** (33J §10, §14, §15). Phase 33K executes exactly that
charter: it designs the storage/auth/consent preconditions at the
contract/precondition level, carries every unresolved 33J answer forward as an
exit criterion or a clearly-marked design assumption, and stops. It implements no
storage, writes no migration, adds no auth or consent code, mounts no route, and
authorizes no live behavior or route spike.

Every assessment below is grounded read-only against the actual Dixie repo (route
seam, refusal vocabulary, auth middleware, database pool/migrations, audit/mutation
stores, span sanitizer), the Phase 33C→33E draft v1 probes and their dependency-free
validator, the freeside-characters Phase 45J artifacts and v1 probe adapter, and the
Straylight (`@loa/straylight`) primitive sources read read-only in `../loa-straylight`.
Where a Straylight citation is carried from a local checkout that may be stale, that
is flagged (§2). Where a claim could not be grounded, it is marked as such.

> **This phase does not complete the Straylight primitive review.** Phase 33J
> requested it and **confirmed no completed Straylight Admission-Wedge primitive-review
> artifact exists**; the §5 review questions (A–O) remain unresolved. Phase 33K treats
> them as exit criteria and design assumptions, **not as solved facts** (§5, §15).

---

## 1. Phase title and status

- **Phase 33K — Admission Wedge storage/auth/consent precondition design gate.**
- Dixie-side **docs / decision-only**.
- Follows Dixie Phase 33J / PR #128 (Straylight primitive-review request /
  vocabulary dependency gate).
- This is a **storage/auth/consent precondition design gate**, **not**
  implementation.
- It changes **no** routes, storage, auth, consent, probes, validator, runtime
  behavior, source code, configuration, or production schema.
- It does **not** freeze a final/canonical/production schema.
- It does **not** mutate the Phase 33E probe JSONs (`hardening_phase: "33E"`,
  `dixie_admission_wedge_probe_v1`) or the validator. Per the Phase 33D §6
  invariant — any probe/validator mutation requires its own separately-gated phase —
  Phase 33K inspects them read-only.
- It does **not** authorize a route spike, and it does **not** claim that the
  Phase 33E probes are a production schema, that the Phase 33G route contract is
  final, that Phase 33H made the route implementation-ready, that Phase 33I
  authorized a route spike, or that Phase 33J completed the Straylight primitive
  review. None of those is true (§4, §20).
- It does **not** claim storage/auth/consent is implementation-ready. It designs
  the **preconditions** that must be satisfied before readiness can even be
  assessed.

The audience for this document is **future Dixie phases** (primarily Phase 33L
route-contract test-vector fixture draft, which consumes these assumptions and the
unresolved-review markers — §16; and a future Phase 33M route-spike authorization
gate, which must verify this design's exit criteria — §17), the **Straylight
(`@loa/straylight`) primitive owner** (whose §5/A–O answers remain the gating
exit criteria), and **freeside-characters** as an interested-but-blocked downstream
consumer (§17).

---

## 2. Source chain

This gate sits one rung above the Phase 33J primitive-review request on the Dixie
route-contract ladder. It introduces no new contract material and freezes nothing;
it designs the storage/auth/consent preconditions that 33J's §10/§15 sequenced
next.

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33E | #122 | Probe hardening draft v1 / vocabulary refinement — bumps probes to `dixie_admission_wedge_probe_v1`, adds non-final markers and draft placeholders (idempotency / signer / receipt-split), hardens the validator; preserves all five scenarios; freezes no schema. ([`ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](ADMISSION-WEDGE-PROBE-HARDENING-GATE.md)) |
| 33F | #123 | Route-contract readiness gate — assesses the v1 probes as a mature enough *semantic* foundation to begin a docs-only design phase; names preconditions (Straylight review, idempotency, storage/auth/consent); selects 33G. ([`ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md)) |
| 33G | #124 | Route-contract design — proposes (on paper) a route identity (`POST /api/admission/intake`), request/response envelopes with a public/private split, an idempotency sketch, an `admission.*` refusal taxonomy, storage/auth/consent preconditions (its §13/§14/§19), the Straylight review dependencies (its §17), and route-contract test vectors mapped from the five Phase 33E probes (its §16). ([`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)) |
| 33H | #126 | Route-contract acceptance / implementation-readiness decision gate — **accepts** 33G as a bounded docs-only draft (two minor docs-only corrections: refusal namespace is **two-part**; the receipt-split validator is **strict per-section**), renders **NOT implementation-ready**, inventories the blockers (§8 A–N), and selects 33I. ([`ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)) |
| 33I | #127 | Implementation-readiness decomposition gate — decomposes the 33H blockers into ordered lanes (33J Straylight review → 33K storage/auth/consent → 33L test-vector fixtures → 33M dev/operator-only spike authorization → 33N possible spike), defines the evidence required before any route handler, and selects 33J. ([`ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)) |
| 33J | #128 | Straylight primitive-review request / vocabulary dependency gate — issues the §5 fifteen-item review register (A–O), builds the primitive dependency matrix and term-ownership classification, drafts a reusable cross-repo handoff, and **selects this Phase 33K storage/auth/consent precondition design gate** as the next lane with the unresolved review answers as exit criteria. **Did not complete the Straylight primitive review.** ([`ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)) |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter track `dixie_admission_wedge_probe_v1`, **test-only**; v0 fails closed as `unknown_probe_version`. The adapter is a **pure, fixture-bound semantic mapping layer with no live Dixie call** (`admission-wedge-dixie-probe-adapter.ts`). |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded test-only purpose; **recommended Dixie Phase 33F** as the next readiness gate (it did **not** select 33G). Authorizes no live client, no package export, no runtime wiring; confirms **live Dixie calls: absent**, runtime wiring: absent, package export: absent. **Verified MERGED on GitHub (merged 2026-06-06).** |

> **Grounding note on the 45J / PR #177 citation.** GitHub confirms
> freeside-characters **PR #177 is MERGED** (merged 2026-06-06). The read of the
> local `../freeside-characters` checkout for the 45J files is consistent with the
> merged state for those files; GitHub's merged state — not the local tree —
> remains authoritative for PR status (carried from the Phase 33H/33I/33J grounding
> notes).

### Straylight (`@loa/straylight`)

The canonical primitive/substrate owner of the assertion-lifecycle, signer/keyring,
receipt/audit, and storage-adapter vocabulary. Read read-only in `../loa-straylight`.
The relevant primitive sources found (carried from the Phase 33J §2 table, with the
storage-adapter and host-tenancy boundary confirmed for this storage-design phase):

| Primitive | Straylight source |
|-----------|-------------------|
| `Actor` / `ActorEstate` (1:1 per estate; `actor_id`, `estate_id`, `keyring_id`, `policy_id`, `assertion_index_ref`, `audit_log_ref`, `state_root`) | `src/straylight/types.ts:29-62` |
| `Assertion` + `AssertionClass` + `AssertionStatus` (`proposed`/`active`/`contested`/`demoted`/`revoked`/`forgotten_from_recall`/`superseded`/`sealed`); `supersedes_refs`, `subject_refs`, `privacy_scope`, `recall_scope`, `signatures` | `src/straylight/types.ts:68-167` |
| `EstateTransition` + `transition_type` (incl. `admit_assertion`); `EstateStore.admit()` executor → status `active` | `src/straylight/types.ts:272-300`; `src/straylight/estate.ts:140-265` |
| `CandidateAssertion` (pre-admission input object) | `src/straylight/types.ts:551-565` |
| Supersession (`superseded` status, `supersedes_refs`, `AssertionLinkType: supersedes`) — a **relation/direction**, not a coined `corrected_active` status | `src/straylight/types.ts:93,157`; arch spec `:910-921` |
| `RecallUseInstruction` (`usable`/`mark_as_contested`/`use_as_background_only`/`do_not_use_for_action`); recall eligibility is **emergent** (`dispositionFor`), **not a stored flag** | `src/straylight/types.ts:427-442`; `src/straylight/policy.ts:187-241` |
| `SignerEntry` / `SignerType` (incl. `policy_service`) / `SignerCompetenceRule` / `Keyring`; `SignatureEnvelope` / `SignatureType` (`ed25519`/`secp256k1`/`hmac`/`dev_signature`) | `src/straylight/types.ts:122-143,173-209` |
| `RecallReceipt` / `TransitionReceipt` (kinds incl. `admission`/`denied`) / `AuditEvent` (`assertion_admitted`/`transition_denied`/…; **append-only, hash-chained** via `previous_audit_hash`) | `src/straylight/types.ts:358-489,495-529` |
| `StorageAdapter` boundary — 7 substrate tables: `actors`/`estates`/`keyrings` (upsert), `assertions` (upsert), `transitions` (append-only), `recall_receipts`/`transition_receipts` (immutable), `audit_events` (append-only hash-chained) | `src/straylight/storage/types.ts:33-68` |
| `PrivacyScope` (`public`/`tenant`/`actor_private`/`sealed`) + `EnvironmentFrame` (incl. `public_discord`); frame discipline narrows `actor_private` out of public frames | `src/straylight/types.ts:96,394-401`; `src/straylight/host/types.ts` |
| `actor_id`/`estate_id` are wedge primitives; **`tenant_id` is host-layer (NOT a wedge primitive)** — injected via `TenantResolver`, fail-closed when unresolved | `src/straylight/types.ts:145-167`; `src/straylight/host/tenancy.ts:1-58` |
| **Idempotency is ABSENT as a Straylight primitive** — explicitly an endpoint (Dixie) responsibility | Phase 26D handoff (`docs/handoffs/phase-26d-dixie-recall-intake-endpoint-authorization.md`, T15); no `idempotency_key` in `types.ts` |

> **Straylight grounding caveat (carried from 33J §2).** These primitive
> definitions are real and citable, but they describe Straylight's **general**
> assertion lifecycle and storage adapter (built for the Recall Wedge). The local
> Straylight checkout may be stale; **no** Straylight artifact naming an "admission
> wedge", "assertion intake", or admission route/endpoint was found (repo-wide
> search returned zero hits). Treat the citations as **evidence the Phase 33J
> review (A–O) should confirm for the Admission Wedge**, not as a completed
> Admission-Wedge review. Two storage-relevant items the §5 review must still
> resolve or defer: **idempotency** (absent in Straylight; endpoint-owned) and
> **cross-estate / delegated signer authority** (Straylight defines per-estate
> `SignerCompetenceRule`/`Keyring`, but no overarching cross-estate authority
> primitive — unresolved).

**Ownership posture carried by the whole chain (unchanged here):** Dixie owns the
HTTP/BFF ingress seam (route, tenant/estate binding, idempotency, refusal mapping,
no-leak projection, ingress storage); **Straylight (`@loa/straylight`) is the
canonical primitive/substrate owner** of the assertion-lifecycle, signer/keyring,
receipt/audit, and storage-adapter semantics; Dixie is a **non-owning consumer**
that mirrors those names rather than coining its own; freeside-characters owns
neither and keeps its proof labels local and test-only.

> **Cross-repo phase-numbering caution.** Dixie's 33-series and the
> freeside-characters 45-series are independent labels in separate repositories
> and must not be conflated.

---

## 3. Purpose

- **Phase 33J selected Phase 33K** because storage/auth/consent design can begin as
  a **draft** if the unresolved Straylight primitive-review answers (33J §5 / A–O)
  are treated as **explicit exit criteria** rather than solved facts (33J §10, §14).
  Most lifecycle vocabulary (rows A–D, L, M) is strongly grounded in existing
  Straylight primitives, so the genuinely unresolved matrix items (E, G, H, K, N,
  O) — plus the review-dependent, non-final idempotency item (J) — are bounded and
  can be carried as design assumptions.
- **Phase 33K defines the preconditions** required before any route implementation
  or route spike can be considered: a storage model (at contract/precondition
  level), a service-authentication model, an end-user authorization/consent model,
  an idempotency precondition design, a no-leak public/private boundary, a threat
  model, and the exit criteria that gate the next lanes (§6–§15).
- **Phase 33K does not implement** storage, auth, consent, migrations, routes, live
  calls, or production behavior. It writes no schema, mounts nothing, and performs
  no storage write.
- **Phase 33K does not authorize Phase 33N or any spike.** Route-spike
  authorization remains a future Phase 33M decision (§17), gated on this design's
  exit criteria plus the resolved-or-deferred Straylight review.

---

## 4. Current state

State clearly, and unchanged from the Phase 33H/33I/33J verdicts:

- **Admission Wedge route implementation is NOT ready.** Phase 33H rendered the
  33G design **not implementation-ready**; nothing since has changed that.
- **The storage model is not implemented.** No Admission Wedge storage model,
  schema, table, or record exists. This document designs storage only at the
  contract/precondition level (§6).
- **Admission Wedge production storage is not created.** No migration is added; no
  storage write is performed.
- **The auth model is not implemented.** No admission authentication exists. The
  only Straylight-wedge intake route is `POST /api/recall/intake` (mounted in
  `app/src/server.ts`, gated on `config.recallIntakeEnabled`), which authenticates
  via JWT/wallet + allowlist; `dev_signature` is a member of the signature-type
  enum with **no authentication logic behind it** (not a backdoor). §9 designs
  service-auth *options* only.
- **The end-user consent model is not implemented.** No consent mechanism exists.
  §10 designs consent *options* only.
- **A route spike is not authorized.** Phase 33I did not authorize one; Phase 33J
  did not authorize one; this phase does not authorize one (§17).
- **No `/api/admission` route exists or is authorized.** `app/src/server.ts` mounts
  no `/api/admission*` route; there is no admission concept in route code and no
  admission handler.
- **Existing PostgreSQL-backed infrastructure may exist, but this phase does not
  assume it is sufficient for Admission Wedge storage.** Dixie has a `pg` pool
  (`app/src/db/pool.ts`, min 2 / max 10), a forward-only migration framework
  (`app/src/db/migrate.ts`), and general governance/reputation stores
  (`PostgreSQLReputationStore`, `MutationLogStore`, `AuditTrailStore`,
  `DynamicContractStore`). **None of that is Admission Wedge admission storage**,
  and its presence grants no admission write authorization. The Recall Wedge estate
  path uses only an in-process, non-durable `BoundedEstateStore`, with a durable
  estate store gated by **ADR-022E (held)**.
- **Phase 33J review answers (A–O) remain unresolved / exit criteria.** Every probe
  still carries `straylight_primitive_review_complete: false`
  (validator-enforced at `docs/admission-wedge/fixtures/validate-fixtures.mjs:269-270`).

---

## 5. Design assumptions and unresolved exit criteria

The table maps each Phase 33J §5 review item (A–O) to the **draft assumption**
Phase 33K reasons from, the **unresolved dependency** the Straylight review must
resolve or explicitly defer, and whether the item gates a future route spike and/or
production. **None of A–O is resolved here**; the draft assumption is a *working
basis for design only*, not a solved fact.

| Area | Draft assumption for 33K design | Phase 33J unresolved dependency | Resolve before route spike? | Resolve before production? | Notes |
|------|--------------------------------|---------------------------------|:--:|:--:|-------|
| **A. Candidate/proposed state vocabulary** | Candidate record uses canonical `proposed` status; `candidate` is the input object only (`CandidateAssertion`). | Confirm `proposed` canonical; `candidate` not a status; Freeside `candidate_pending` non-canonical. | Yes (or defer) | Yes | Candidate-record naming + pending-vs-denied distinction rest on it. |
| **B. Admitted assertion lifecycle** | Admitted assertion status is canonical `active`; `admitted` is a public outcome label only. | Confirm `active`; no bare `admitted` status. | Yes (or defer) | Yes | Assertion-record status field + public outcome class. |
| **C. Admission transition vocabulary** | Transition is `admit_assertion`; audit events `assertion_admitted` / `transition_denied`. | Confirm transition + audit-event names. | Yes (or defer) | Yes | Transition-record + audit-event wiring. |
| **D. Supersession/correction relation** | `(superseded, active)` is a relation/direction, not a coined `corrected_active` status. | Confirm relation, not status. | Yes (or defer) | Yes | Supersession relation columns + ordinary-recall exclusion. |
| **E. Recall eligibility representation** | Project a `recall_eligible` boolean paired with canonical `RecallUseInstruction`; eligibility is emergent (`dispositionFor`), not a stored flag. | Reconcile boolean projection vs. emergent disposition; close the 2-of-4 instruction gap. | Yes (or defer) | Yes | Recall-eligibility projection could misrepresent canonical disposition. **Unresolved.** |
| **F. Authority/signer vocabulary** | `policy_service` is a canonical `SignerType`; `authority_*_draft` field names + binding remain draft, not production auth. | Confirm which signer roles may authorize `admit_assertion`; field names stay draft; **cross-estate/delegated authority is unresolved in Straylight**. | Yes (or defer) | Yes | Auth/signature record + competence checks. |
| **G. Tenant/estate/actor binding** | `estate_id`/`actor_id` are wedge primitives; `tenant_id` is host-layer (`TenantResolver`); `caller_actor_id` host-layer; `subject_actor_id` unresolved. | Confirm primitive set; define caller-vs-subject; production binding undefined. | Yes (or defer) | Yes | Identity binding + cross-user-admission consent design depend on it. **Partly unresolved.** |
| **H. Receipt/audit relationship** | Public receipt is a single non-sensitive reference; private audit holds the full `TransitionReceipt`/`AuditEvent` detail; pick one public field name. | Reconcile `public_receipt_ref`/`receipt_public_ref` two-spelling debt; map to Straylight receipt vocab; clarify public-receipt-vs-audit split. | Yes (or defer) | Yes | Receipt/audit record shape + public surface. **Unresolved (two-spelling debt).** |
| **I. Fail-closed semantics** | Ingress shape/class failures reuse the Dixie refusal family (`ingress.invalid_request`); canonical fail-closed = class-validation → `rejected_candidate`, policy denial → `denied_transition`. | Confirm canonical fail-closed meaning vs. Dixie-local refusal reuse. | Yes (or defer) | Yes | Fail-closed probe (E) + refusal taxonomy. |
| **J. Idempotency semantics** | Idempotency is **Dixie/endpoint-owned** (absent in Straylight; delegated per Recall precedent); key scope includes tenant/estate/subject/transition intent. | Confirm Straylight delegates idempotency to Dixie; decide keying. | Yes (or defer) | Yes | Replay/double-mint protection undesigned until keying decided (§8). **Unresolved keying.** |
| **K. Public/private projection boundary** | Public response carries an allowlist of non-sensitive fields; everything else is private/audit-bound. | Confirm canonical projection rule for admission outcomes. | Yes (or defer) | Yes | Runtime no-leak serializer cannot be finalized against draft shapes. **Unresolved (runtime).** |
| **L. Candidate-to-assertion relationship** | Linkage is candidate → transition → assertion (`source_candidate_id`/`admission_transition_id`/`admitted_assertion_id`). | Confirm linkage semantics; field names stay draft. | Yes (or defer) | Yes | Linkage columns in storage records. |
| **M. Rejection/denial taxonomy** | Denial is an explicit `transition_denied` audit event, not a coined `rejected` status; distinct from pending absence. | Confirm explicit-denied vs pending-absence; no coined `rejected`. | Yes (or defer) | Yes | Reject probe (C) wiring + denial refusal code. |
| **N. Corrected-active status vs relationship** | "Corrected active" = the `active` member of a `(superseded, active)` relation, not a standalone status. | Confirm it is not a coined status. | Yes (or defer) | Yes | Mis-coining a status would corrupt the supersession model. **Unresolved framing.** |
| **O. Storage/audit primitive boundary** | Straylight owns assertion/transition/receipt/audit-event **semantics** (via `StorageAdapter`); Dixie owns ingress storage (candidate intake record, idempotency cache, refusal log). | Confirm which records are substrate vs. ingress concerns. | Yes (or defer) | Yes | The storage model (§6) must not bake draft vocabulary as final. **Unresolved.** |

> **None of A–O is resolved here.** Each row's "draft assumption" is a working
> design basis only. Treating any row as final requires the Straylight review to
> answer it or explicitly defer it (33J §5, §13). The genuinely unresolved matrix
> rows — **E, G, H, K, N, O** — plus the review-dependent, non-final idempotency
> row (**J**, idempotency semantics) are the ones a future Phase 33L test-vector
> draft must carry forward as explicit unresolved-or-review-dependent markers (§16).

---

## 6. Draft storage model inventory

Storage is designed here at the **contract/precondition level only**. The record
categories below are **draft record *shapes***, not a database schema, not
migrations, and not an assertion that any table exists. Per row O, Straylight owns
the *semantics* of assertion/transition/receipt/audit-event records (via its
`StorageAdapter`); Dixie owns the ingress-side records (candidate intake,
idempotency cache, refusal log). **No final database schema is defined; no
migration is added; no existing DB table is implied to be Admission Wedge storage.**

For each category: **purpose · draft fields/refs · public/private classification ·
lifecycle owner · required no-leak boundary · unresolved primitive-review
dependency · before-dev-spike requirement · before-production requirement.**

### 6.1 Candidate record (Dixie ingress)

- **Purpose:** capture a bounded, sanitized candidate proposal at ingress prior to
  any transition decision.
- **Draft fields/refs:** `candidate_id`, candidate payload (bounded/sanitized),
  `proposed_assertion_class`, `source_kind`/`source_ref`, identity refs
  (`tenant_id`/`estate_id`/`proposing_actor_id`).
- **Classification:** **private / admission-bound.** Raw payload never public.
- **Lifecycle owner:** Dixie ingress (the candidate input object maps to Straylight
  `CandidateAssertion`).
- **No-leak boundary:** raw `candidate_payload`, `source_ref`, `unsafe_marker:`
  tokens must never appear in a public response.
- **Primitive-review dependency:** A (candidate/proposed), L (linkage), O (boundary).
- **Before dev-spike:** A/L/O resolved-or-deferred; bounding/sanitization rule drafted.
- **Before production:** final candidate retention + sanitization policy.

### 6.2 Admission transition record (Straylight semantics; Dixie ingress reference)

- **Purpose:** record the requested/decided transition (`admit_assertion`,
  rejection, supersession).
- **Draft fields/refs:** `admission_transition_id`, `transition_kind`, `outcome`,
  `source_candidate_id`, `admitted_assertion_id` (or `null`), `authority_signer_type_draft`,
  `authority_scope_draft`.
- **Classification:** **private.** Only the outcome *class* is public.
- **Lifecycle owner:** Straylight transition semantics (`EstateTransition` /
  `admit_assertion`); Dixie references it.
- **No-leak boundary:** transition ids, signer/authority material, policy reason
  stay private.
- **Primitive-review dependency:** C (transition vocab), F (signer), M (denial).
- **Before dev-spike:** C/F/M resolved-or-deferred (or synthetic-only for spike).
- **Before production:** production signer/authority semantics resolved.

### 6.3 Admitted assertion record (Straylight substrate)

- **Purpose:** the admitted, `active` assertion created/referenced by an accepted
  transition.
- **Draft fields/refs:** `admitted_assertion_id`, `assertion_status: active`,
  `assertion_class`, `source_candidate_id`, `admission_transition_id`,
  `recall_eligible` (projection), `recall_use_instruction`.
- **Classification:** **mixed.** Status/eligibility projection may be public-safe;
  body and operational ids private.
- **Lifecycle owner:** Straylight (`Assertion` + `AssertionStatus.active`).
- **No-leak boundary:** assertion body, candidate payload, operational ids private.
- **Primitive-review dependency:** B (lifecycle), E (eligibility), L (linkage).
- **Before dev-spike:** B/E/L resolved-or-deferred.
- **Before production:** eligibility projection reconciled to emergent disposition.

### 6.4 Rejection/denial transition record (Straylight semantics; Dixie reference)

- **Purpose:** record an explicit denied transition; mint **no** assertion.
- **Draft fields/refs:** `admission_transition_id`, `outcome: denied`,
  `admitted_assertion_id: null`, audit event `transition_denied`, private policy
  reason.
- **Classification:** **private** (public sees only the `denied` outcome class).
- **Lifecycle owner:** Straylight (`transition_denied`); Dixie refusal mapping.
- **No-leak boundary:** policy reason / private reason family stay private.
- **Primitive-review dependency:** M (denial taxonomy), I (fail-closed).
- **Before dev-spike:** M/I resolved-or-deferred.
- **Before production:** confirmed explicit-denied semantics, no coined `rejected`.

### 6.5 Supersession/correction relation record (Straylight substrate)

- **Purpose:** record `(superseded, active)` — prior assertion → `superseded`,
  corrected assertion → `active`.
- **Draft fields/refs:** `supersedes_assertion_id` / `superseded_by_assertion_id`
  (mapping to Straylight `supersedes_refs`).
- **Classification:** **mixed.** Relation links private; corrected-active eligibility
  projection public-safe.
- **Lifecycle owner:** Straylight (`superseded` status + `supersedes_refs`).
- **No-leak boundary:** superseded prior body stays audit/provenance only.
- **Primitive-review dependency:** D / N (relation, not status), E (eligibility).
- **Before dev-spike:** D/N/E resolved-or-deferred.
- **Before production:** ordinary-recall-excludes-superseded rule confirmed.

### 6.6 Receipt / public-receipt-reference record

- **Purpose:** a public-safe receipt reference distinct from the private receipt.
- **Draft fields/refs:** single public-safe reference (the
  `public_receipt_ref`/`receipt_public_ref` two-spelling must be reconciled to one
  name); `null` where no public receipt is minted (pending, fail-closed).
- **Classification:** **public-safe reference only** (non-operational, non-sensitive).
- **Lifecycle owner:** Straylight receipt vocabulary (`TransitionReceipt`/`RecallReceipt`);
  Dixie public projection.
- **No-leak boundary:** must carry no operational id, no audit detail.
- **Primitive-review dependency:** H (receipt/audit relationship), K (projection).
- **Before dev-spike:** H resolved-or-deferred; one public field name picked.
- **Before production:** mapped to canonical Straylight receipt vocabulary.

### 6.7 Audit / private audit record (Straylight substrate)

- **Purpose:** the full private receipt + hash-chained audit event detail.
- **Draft fields/refs:** `audit_receipt_ref`, `receipt_id`, policy reason, candidate
  ref, ids, `audit_event` (`assertion_admitted`/`transition_denied`), `audit_private: true`.
- **Classification:** **private / controlled-access.**
- **Lifecycle owner:** Straylight (`AuditEvent`, append-only hash-chained, via
  `StorageAdapter.audit_events`). Mirrors Dixie's existing hash-chained
  `AuditTrailStore` pattern (precedent, not admission storage).
- **No-leak boundary:** never serialized to a public response; access-controlled.
- **Primitive-review dependency:** H (receipt/audit), O (boundary).
- **Before dev-spike:** H/O resolved-or-deferred; audit access-control assumption drafted.
- **Before production:** controlled-access policy + retention finalized.

### 6.8 Idempotency record (Dixie ingress)

- **Purpose:** de-duplicate write attempts; return the prior public-safe result on
  identical replay; fail closed on conflict.
- **Draft fields/refs:** idempotency key (private), key scope, cached public-safe
  result reference.
- **Classification:** **private** (raw key never public).
- **Lifecycle owner:** **Dixie / endpoint** (idempotency is absent from Straylight).
- **No-leak boundary:** raw key + scope never public (§7, §13).
- **Primitive-review dependency:** J (confirm Dixie delegation), O (boundary).
- **Before dev-spike:** J confirmed-or-deferred; keying drafted (§8).
- **Before production:** final idempotency semantics (§8).

### 6.9 Authorization/consent evidence reference (Dixie ingress)

- **Purpose:** reference how the calling service authenticated and how the end user
  authorized — **never a raw secret**.
- **Draft fields/refs:** `service_auth_context` (reference/handle),
  `end_user_authorization_context` (or an explicit dev-only omission marker).
- **Classification:** **private.**
- **Lifecycle owner:** Dixie ingress (§9, §10).
- **No-leak boundary:** no secret/token/signature material in public or audit
  projections.
- **Primitive-review dependency:** F (signer), G (identity binding).
- **Before dev-spike:** dev-only omission marker design (§12); F/G drafted.
- **Before production:** production service-auth + consent models selected (§9, §10).

### 6.10 Source provenance reference (Dixie ingress)

- **Purpose:** privately link the candidate to its source.
- **Draft fields/refs:** `source_kind`, `source_ref`, `candidate_id`.
- **Classification:** **private / audit-bound.**
- **Lifecycle owner:** Dixie ingress.
- **No-leak boundary:** source material never public.
- **Primitive-review dependency:** A (candidate), L (linkage), K (projection).
- **Before dev-spike:** source retention boundary drafted.
- **Before production:** final source-retention policy.

### 6.11 Operational / logging record (Dixie ingress)

- **Purpose:** operational logs and metrics for the admission seam.
- **Draft fields/refs:** request id, outcome class, redacted operational metadata.
- **Classification:** **operational / redaction-required.**
- **Lifecycle owner:** Dixie (mirrors the existing span-sanitizer allowlist +
  identity-hashing + `0x[REDACTED]` pattern — precedent, not admission logging).
- **No-leak boundary:** identity ids hashed; raw payload/source/secret never logged.
- **Primitive-review dependency:** K (projection). Related readiness blocker:
  operational logging/no-leak policy is a Phase 33H/33I blocker — **not** Phase 33J
  item L, which remains candidate-to-assertion linkage.
- **Before dev-spike:** logging-redaction posture drafted (§13).
- **Before production:** operational logging/no-leak policy finalized.

> **No final database schema is defined here.** These are draft record *shapes* for
> design reasoning only. No migration is added; no existing DB table is implied to
> be Admission Wedge storage; **no storage write is performed in Phase 33K.**

---

## 7. Storage boundary rules

- Raw candidate payload **must never appear in a public response**.
- Source material / raw reasons **must be private / audit-bound**.
- Public receipt references **must be non-sensitive and non-operational**.
- Operational tenant/estate/actor IDs **must not leak in public responses**.
- Idempotency keys **must not leak in public responses**.
- Authority/signature material **must not leak in public responses**.
- Storage internals and debug traces **must not leak in public responses**.
- Audit records **may hold private references but must have controlled access**.
- Superseded/corrected assertions **must preserve the ordinary recall-eligibility
  boundary** (ordinary recall includes the corrected active assertion only).
- Pending candidates **must not be recallable**.
- Rejected candidates **must not be recallable**.
- Malformed/unsafe candidates **must fail closed**.
- **No storage writes are performed in Phase 33K.**

These rules mirror the validator-enforced no-leak baseline already proven over the
draft v1 probes (`FORBIDDEN_PUBLIC_KEYS` deep-walk + substring/regex leak scans,
`validate-fixtures.mjs:130,223`) and extend it at the route-contract design level to
storage internals and runtime/debug internals — exactly as Phase 33G §10 did. They
are design constraints, not an enforced runtime serializer (which remains unbuilt
and depends on Straylight review item K).

---

## 8. Draft idempotency precondition design

**Draft, not final.** This designs an idempotency *precondition*, not final
semantics. Idempotency is **Dixie/endpoint-owned** (absent from Straylight; the
Recall precedent and Phase 26D delegate it to the host/endpoint). Subject to review
item J.

- An **idempotency key is required** for the future write-attempt route (mirroring
  the Recall route's mandatory `Idempotency-Key`, which refuses at ingress when
  missing/oversized).
- The **key scope** should include `tenant_id` / `estate_id` / subject /
  transition intent.
- An **identical retry** should return the **same public-safe result or receipt
  reference** without re-deciding.
- A **conflicting retry** (same key, different intent) should **fail closed**.
- An **accepted-transition retry must not create a duplicate assertion**.
- A **rejected-transition retry must remain stable** (same denied envelope).
- A **supersession retry must not create a duplicate corrected assertion**.
- **Malformed-request retry behavior remains draft.**
- The **idempotency record must not expose the raw key publicly**.
- **Final idempotency semantics depend on the Phase 33J review (item J) or an
  explicit deferral** (candidate-id-keyed vs header-keyed vs both — undecided).
- **No implementation in Phase 33K.**

---

## 9. Service authentication model options

**Design options only. No auth is implemented.** Each option is grounded in an auth
pattern Dixie already uses, so the design references reality (bearer/JWT and
signed-envelope are both proven Dixie patterns; `dev_signature` is an enum member
with no logic behind it — not a backdoor).

### Option A — service-to-service bearer / JWT

- **Description:** the calling service presents a bearer JWT (HS256 symmetric or
  ES256 asymmetric, both already used in Dixie for user and service-to-service auth)
  verified at the admission seam.
- **Allowed environment:** production-capable.
- **Production suitability:** **High.**
- **No-leak considerations:** the token is never stored or echoed; only a reference
  handle (`service_auth_context`) is retained.
- **Dependency on authority/signer vocabulary:** maps to Straylight `SignerType`
  (`policy_service`/`service_key`) — review item F.
- **Implementation risk:** Low–medium (established pattern).
- **Recommendation:** **Prefer for production design**, pending the signer/authority
  review (F).

### Option B — signed request envelope

- **Description:** the caller signs a canonicalized request payload (the Recall
  Wedge pattern: caller computes the signature, the seam verifies envelope
  consistency); maps to Straylight `SignatureEnvelope` / `SignatureType`.
- **Allowed environment:** production-capable.
- **Production suitability:** **High** (stronger payload binding than a bare bearer).
- **No-leak considerations:** signature material never public or audit-projected.
- **Dependency on authority/signer vocabulary:** strong dependency on F (which
  signer roles may authorize `admit_assertion`).
- **Implementation risk:** Medium (key management, canonicalization).
- **Recommendation:** **Prefer for production design** where payload-binding matters;
  defer final A-vs-B choice to the signer/authority review.

### Option C — dev/operator-only synthetic auth (spike only)

- **Description:** a synthetic, caller-computable signature for a disabled-by-default
  dev/operator spike only (the Recall dev-seed pattern: HMAC-SHA256 over a
  canonicalized payload using exported synthetic constants, **no stored secret**).
- **Allowed environment:** **non-production only**, disabled by default, behind an
  explicit env gate + operator allowlist.
- **Production suitability:** **None.** Never production.
- **No-leak considerations:** synthetic-only; no real secret; raw signature never
  stored/echoed.
- **Dependency on authority/signer vocabulary:** synthetic scoped roles only.
- **Implementation risk:** Low (but must be hard-gated; see §12, §14).
- **Recommendation:** **Permit only for a future, separately-authorized
  dev/operator spike** (§12, §17) — not authorized here.

### Option D — no service auth

- **Description:** unauthenticated admission ingress.
- **Allowed environment:** none.
- **Production suitability:** **None.**
- **No-leak considerations:** unacceptable — any caller could mint admissions.
- **Dependency on authority/signer vocabulary:** N/A.
- **Implementation risk:** Unacceptable.
- **Recommendation:** **Reject.**

**Recommended posture:** **Reject Option D.** Permit **Option C only** for a future
disabled-by-default dev/operator spike if separately authorized (Phase 33M). Prefer
**Option A or B** for production design, but **defer the final choice until the
signer/authority review** (item F). **No auth is implemented in Phase 33K.**

> Service authentication only proves a service may *call* Dixie; it does **not**
> prove the end user, channel, tenant, or surface is authorized. **Service auth ≠
> end-user consent** (the load-bearing 32F §7 / 33A boundary, restated).

---

## 10. End-user authorization / consent model options

**Design options only. No consent is implemented.**

### Option A — explicit end-user admission consent artifact

- **Description:** the end user produces an explicit, verifiable consent artifact
  authorizing admission of memory about them.
- **Allowed environment:** production-capable.
- **Production suitability:** **High.**
- **Cross-user safety:** **Strong** — consent is bound to the subject.
- **Audit evidence required:** the consent artifact reference on the private audit
  record.
- **Implementation risk:** Medium–high (UX + artifact verification).
- **Recommendation:** **Require A or B before production user-facing admission.**

### Option B — platform-mediated authorization grant

- **Description:** a trusted platform layer mediates and vouches for end-user
  authorization (e.g., a grant issued by the platform identity layer).
- **Allowed environment:** production-capable.
- **Production suitability:** **High** (if the platform grant is trustworthy).
- **Cross-user safety:** **Strong**, contingent on platform integrity.
- **Audit evidence required:** the grant reference on the private audit record.
- **Implementation risk:** Medium (depends on platform trust model).
- **Recommendation:** **Acceptable production alternative to A.**

### Option C — dev/operator-only omission marker

- **Description:** an explicit marker that end-user consent is **omitted** for a
  non-production dev/operator spike using synthetic subjects only.
- **Allowed environment:** **non-production only**, disabled by default.
- **Production suitability:** **None.**
- **Cross-user safety:** N/A — synthetic subjects only; no real user.
- **Audit evidence required:** the omission marker recorded privately.
- **Implementation risk:** Low (but must be hard-gated; §12, §14).
- **Recommendation:** **Permit only for a future, separately-authorized
  dev/operator spike.**

### Option D — no end-user authorization

- **Description:** admit memory about users with no authorization.
- **Allowed environment:** none.
- **Production suitability:** **None.**
- **Cross-user safety:** **Unacceptable** — enables unauthorized cross-user admission.
- **Audit evidence required:** N/A.
- **Implementation risk:** Unacceptable.
- **Recommendation:** **Reject.**

**Recommended posture:** **Reject Option D.** Permit **Option C only** for a
non-production dev/operator spike if separately authorized. **Require A or B before
production user-facing admission.** **Cross-user admission remains blocked without an
explicit consent model.** **No consent is implemented in Phase 33K.**

---

## 11. Tenant/estate/actor binding assumptions

**Design assumptions only. Identity binding is not finalized.**

- `tenant_id` remains a **host/platform binding, not necessarily a Straylight
  primitive** (Straylight does not model `tenant_id` as first-class; it injects a
  `TenantResolver` and fails closed when unresolved).
- `estate_id` / `actor_id` **may be Straylight-owned or shared** depending on the
  review (current evidence: wedge primitives) — review item G.
- The `caller_actor_id` and `subject_actor_id` relationship **remains unresolved**
  (Straylight has no `subject_actor_id` primitive — only `Assertion.subject_refs`).
- **Cross-user admission requires explicit authorization/consent** (§10). The Recall
  route already rejects body identity overrides and derives identity from the
  session; an admission route should follow the same session-derived posture.
- **Production identity binding is not finalized** (`identity_binding_final: false`).
- A future dev/operator spike, if ever authorized, **must use synthetic scoped
  identifiers** only.
- The **public response must not expose operational IDs** (§7, §13).

---

## 12. Dev/operator-only scope option

Defines a **future** dev/operator-only route-spike scope option. **This phase does
not authorize it.** Route-spike authorization is a future Phase 33M decision (§17).

- **Disabled by default.**
- **Explicit env gate** required (the Recall dev-seed precedent: required env flags,
  fail-closed startup if misconfigured).
- **Explicit operator allowlist.**
- **Synthetic candidate/input only** unless separately authorized.
- **No public `remember-this`.**
- **No Discord / Freeside runtime / client integration.**
- **No production storage claim.**
- **No production admission claim.**
- **No cross-user admission.**
- **No automatic chat-to-memory.**
- **No final schema claim.**
- **No public raw / private / audit output.**
- **Kill switch required.**
- **Route-spike authorization must happen in a later Phase 33M (or equivalent), not
  Phase 33K.**

---

## 13. Public/private response and audit access preconditions

**Design only.**

- **Public response field allowlist:** the public response carries only a small set
  of non-sensitive fields (outcome class, `request_version` echo, stable
  `reason_code` on refusal, a public receipt reference or `null`, a recall-eligibility
  projection, a generic public summary). Final field names depend on the primitive
  review (K, H).
- **Private/audit field boundary:** all candidate payload, source material, raw
  reasons, policy reasons, transition/assertion ids, signer/authority material, and
  idempotency keys live behind the private boundary.
- **Receipt/audit split:** a public-safe receipt reference is disjoint from the
  private `audit_receipt_ref` + full receipt detail (`audit_private: true`,
  `public_audit_detail: false`).
- **Audit access-control assumptions:** audit records are controlled-access; the
  public surface never reads from them.
- **Logging redaction requirements:** operational logs follow the existing
  span-sanitizer posture (allowlisted attributes, identity hashing,
  `0x[REDACTED]`); raw payload/source/secret never logged.
- **Refusal / no-leak behavior:** ingress shape/class failures reuse the Dixie
  refusal family; uncontrolled internal/seam exceptions are scrubbed (the Recall
  `storage_unavailable` precedent omits raw reasons publicly and retains them in
  the internal audit object only).
- **Public denial/refusal shape must be stable and generic.**
- **An unsafe projection refused must not reveal private details.**
- **Any public-safe reference must not be operationally sensitive.**
- **Final field names depend on the primitive review** (H, K).

---

## 14. Storage/auth/consent threat model

A concise threat table. **Mitigations are design requirements, not implementations.**

| Threat | Example | Required mitigation | Blocks dev spike? | Blocks production? | Notes |
|--------|---------|---------------------|:--:|:--:|-------|
| **Raw candidate public leak** | `candidate_payload` echoed in the public response | Public allowlist + no-leak deep-walk; `rendered_candidate_payload: false` | Yes | Yes | Validator-enforced over probes (`:130,223`). |
| **Source material public leak** | `source_ref`/`source_kind` in public response | Source kept private/audit-bound | Yes | Yes | §7. |
| **Idempotency key leak** | Raw idempotency key surfaced publicly | Key private; cache stores public-safe result only | Yes | Yes | §8. |
| **Authority/signature leak** | `authority_*_draft` / signature material public | Signer/auth material private; reference handle only | Yes | Yes | §9; item F. |
| **Tenant/estate/actor ID leak** | Operational ids in public response | Identity ids private; session-derived, not body-trusted | Yes | Yes | §11; item G. |
| **Replay / double admission** | Retried accept mints a duplicate assertion | Idempotency precondition; accepted retry must not duplicate | Yes | Yes | §8; item J. |
| **Cross-user unauthorized admission** | Caller admits memory about another user with no consent | Explicit consent model (A/B); reject Option D; block cross-user without consent | Yes | Yes | §10, §11. |
| **Supersession/correction misuse** | Superseded prior re-enters ordinary recall, or duplicate corrected assertion | `(superseded, active)` relation; ordinary recall = corrected active only; supersession retry no-duplicate | Yes | Yes | §6.5; items D/N. |
| **Public refusal too specific** | Refusal reveals the hidden policy reason | Stable, generic public reason code; private reason family kept internal | Yes | Yes | §13; item I. |
| **Audit/log overexposure** | Audit detail or raw payload written to operational logs | Span-sanitizer allowlist + hashing; controlled-access audit | Yes | Yes | §6.7, §13. |
| **Storage partial failure** | Multi-step write partially commits, leaving inconsistent state | Rollback/partial-failure policy (a 33H/33I blocker); fail-closed | Recommended | Yes | §15; not designed here. |
| **Stale primitive vocabulary baked as final** | Draft `corrected_active` treated as a real status | Carry A–O as exit criteria; mark unresolved rows draft | Yes | Yes | §5; items N, O. |
| **Dev-only route accidentally public** | Dev spike route reachable in production | Disabled-by-default, env gate, operator allowlist, kill switch | Yes | Yes | §12. |
| **Freeside client calls unauthorized route** | Freeside wires a live client to a non-existent/unauthorized route | No Freeside runtime integration; adapter stays test-only, not exported, not wired | Yes | Yes | §17; 45J confirms no live Dixie call. |

---

## 15. Exit criteria from Phase 33K

### Before Phase 33L test-vector fixtures

- [ ] Draft storage/auth/consent assumptions recorded (§5–§13).
- [ ] Primitive-review markers carried into the fixture-vector plan — genuinely
  unresolved rows E, G, H, K, N, O, plus review-dependent/non-final item J.
- [ ] No final schema claims.

### Before a Phase 33M route-spike authorization gate

- [ ] Primitive review (A–O) **resolved or explicitly deferred**.
- [ ] Storage model **selected at contract level** (§6).
- [ ] Auth model **selected at contract level** (§9).
- [ ] Consent / dev-only omission **selected at contract level** (§10).
- [ ] Idempotency semantics **selected or explicitly draft** (§8).
- [ ] No-leak public/private boundary **accepted** (§13).
- [ ] Rollback / failure policy **drafted** (partial-failure behavior).
- [ ] Kill-switch / env-gate posture **drafted** (§12).
- [ ] Route test vectors **available** (Phase 33L output).

### Before any Phase 33N implementation

- [ ] Phase 33M **explicitly authorizes** a spike.
- [ ] **Disabled-by-default** scope.
- [ ] **No production claims.**
- [ ] Source changes **separately audited**.
- [ ] **No Freeside runtime integration** unless separately authorized.

---

## 16. Impact on Phase 33L test-vector fixture draft

- Phase 33L **may convert the Phase 33G §16 route vectors plus these Phase 33K
  storage/auth/consent assumptions into non-runtime fixtures.**
- 33L **must mark primitive-review dependencies** — genuinely unresolved rows E, G,
  H, K, N, O, plus review-dependent/non-final item J — explicitly in the vectors.
- 33L **must not add runtime route tests** unless separately authorized.
- 33L **must not mutate existing v1 probe semantics** unless separately authorized
  (the five `scenario_id`s are frozen-by-count at `validate-fixtures.mjs:49-57`).
- 33L **may add docs-only / non-runtime route-contract fixture shapes** if bounded.
- 33L **may add non-runtime validator checks only if docs-bound and with no
  app/runtime imports** (the existing validator is pure Node built-ins, imports
  nothing from `app/`).

> **Phase 33L status note (added later).** Phase 33L added **non-runtime
> route-contract test-vector fixtures** under
> [`docs/admission-wedge/route-contract-test-vectors/`](admission-wedge/route-contract-test-vectors/README.md)
> (five vectors mapped from the Phase 33G §16 vectors A–E, plus a docs-bound,
> Node-built-ins-only validator). It **did not mutate the Phase 33E probes** or
> their validator, and it **did not implement a route, storage, auth, or
> consent**. It carries the genuinely unresolved rows (E, G, H, K, N, O) and the
> review-dependent/non-final row (J) forward as markers. **Phase 33M remains a
> future authorization gate; Phase 33N remains not authorized.**

---

## 17. Impact on Phase 33M / 33N route spike path

- **Phase 33M remains a future authorization gate.**
- **Phase 33K does not authorize Phase 33M or 33N.**
- **33M must verify 33J / 33K / 33L evidence** (the §15 exit criteria, including the
  resolved-or-deferred Straylight review) before any route spike.
- **33N remains not authorized.**
- **33N could only be considered after explicit 33M authorization.**
- Any 33N spike **must be dev/operator-only, disabled by default, not production,
  and have no Freeside runtime integration** (§12). The Freeside adapter stays
  test-only, not exported, not runtime-wired, with **no live Dixie call** (45J).

---

## 18. Decision: next lane

> **Selected: Phase 33L — Admission Wedge route-contract test-vector fixture draft
> (docs / non-runtime fixture-only), carrying the Phase 33J unresolved-review
> markers and these Phase 33K storage/auth/consent assumptions.**

**Reason:**

- Phase 33J created the primitive-review dependencies (A–O).
- Phase 33K defines storage/auth/consent assumptions and exit criteria (§5–§15).
- The next useful **non-runtime** artifact is to convert the five Phase 33G §16
  route-contract design vectors into fixture/test-vector drafts that carry the
  genuinely unresolved markers (E, G, H, K, N, O), the review-dependent/non-final
  item J, and the §6 record-shape assumptions.
- **Route implementation remains too early.**
- **Route-spike authorization remains too early** (a future Phase 33M decision —
  §17).

**Alternative (if this storage/auth/consent design surfaces a major unresolved
contradiction):**

> **Phase 33L — Admission Wedge storage/auth/consent acceptance / patch gate** — a
> narrower docs/decision-only gate that reconciles the contradiction before any
> test-vector fixture work.

This phase did **not** surface such a contradiction: the genuinely unresolved rows
(E, G, H, K, N, O) plus the review-dependent/non-final item J are bounded and
carry-forwardable as markers, and idempotency's
Dixie-ownership and tenant's host-layer status are consistent with the existing
Recall precedent. The route-contract test-vector fixture draft is therefore the
safe next lane. **A route implementation and a route spike are not selected under
any option.**

---

## 19. Future Phase 33L boundaries

Because §18 selects the **route-contract test-vector fixture draft**, Phase 33L is
bounded as:

**Allowed**

- docs / non-runtime fixture-only;
- add new route-contract test-vector fixtures under `docs/`, if appropriate;
- map the five Phase 33G §16 design vectors to fixture drafts;
- include the storage/auth/consent assumptions from this Phase 33K (§5–§13);
- include the primitive-review markers from Phase 33J — genuinely unresolved rows
  E, G, H, K, N, O, plus review-dependent/non-final item J;
- optional docs-bound validator extension using Node built-ins only, if narrow and
  non-runtime;
- no app/runtime imports.

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

## 20. What remains blocked now

Phase 33K is a storage/auth/consent precondition design gate. It authorizes none of
the following; each remains blocked:

- a **completed Straylight primitive review** claim;
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
- final idempotency semantics;
- production signer / authority semantics;
- production tenant / estate / actor identity binding;
- a final route contract (33G remains a *draft design*);
- route implementation readiness;
- Phase 33N implementation.

If a later phase reaches for any of the above, it must re-open the Phase 33E probe
artifacts, the Phase 33F readiness gate, the Phase 33G design (as corrected by
33H), the Phase 33H acceptance gate, the Phase 33I decomposition gate, the Phase
33J review gate, this design gate, and the relevant Straylight decision records
(ADR-022E durable-store gate; ADR-026C / ADR-026D route guardrails — Straylight-repo
decision records) first; it must not silently expand scope.

---

## 21. Success criteria for Phase 33K

This phase succeeds if:

- it **defines storage/auth/consent preconditions at the design level** (§6–§13);
- it **treats the unresolved Phase 33J answers (A–O) as exit criteria or
  assumptions** (§5, §15), not as solved facts;
- it **identifies record categories without a final schema** (§6);
- it **defines auth/consent options without implementation** (§9, §10);
- it **defines a threat model and a no-leak posture** (§7, §13, §14);
- it **selects a safe next docs/non-runtime lane** (§18);
- it does **not** mutate code / fixtures / probes / validator;
- it keeps all live / runtime / implementation lanes blocked (§20);
- Codex confirms the docs / decision-only scope.

---

## 22. Cross-references

> **Phase 33P status note (added later).** Phase 33P
> ([`ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md))
> is a **docs/decision-only storage / receipt hardening decision gate** that
> follows the Phase 33N no-store route spike and the Phase 33O acceptance gate. It
> reads this gate's §6 draft storage record categories (6.1–6.11), §6.6/§6.7
> receipt/audit split, §6.8 idempotency record, §7 storage boundary rules, §8
> idempotency precondition, §11 binding assumptions, and §13 no-leak preconditions
> **read-only** as the design basis for its decision — it mutates **no** probe,
> fixture, or vector JSON and changes **no** validator. It **selects Option B** —
> authorizing a *possible future* Phase 33Q dev-only, disabled-by-default,
> non-production, **bounded synthetic** admitted-assertion store — and **rejects
> production-like durable storage**. Phase 33P **implements no storage, adds no
> migration, auth, or consent**, keeps the unresolved Phase 33J answers (A–O) and
> the held ADR-022E durable-store gate **in force**, freezes **no** schema, and
> keeps every storage/auth/consent implementation lane **blocked**. **Phase 33Q
> remains not implemented** and is authorized only if the 33P doc lands cleanly
> within its §8 boundary.

- [`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)
  — Phase 33J primitive-review request that selected this lane (its §5 register
  A–O, §10 impact, §14/§15 next-lane selection). Gains a minimal 33K status note.
- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I decomposition gate; its §8 blocker matrix (A–N) and the 33J→33K→33L→
  33M→33N lane ordering this gate executes.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)
  — Phase 33H acceptance gate; its not-implementation-ready verdict and blocker
  inventory (storage A, service-auth B, consent C, etc.) seed §6/§9/§10.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)
  — Phase 33G draft route-contract design; its §13 storage boundary, §14 auth/consent
  boundary, §12 idempotency sketch, §16 test vectors, and §17/§19 preconditions seed
  this gate's §6/§8/§9/§10/§16.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md)
  — Phase 33F readiness gate; it named the storage/auth/consent and Straylight-review
  preconditions this gate designs.
- [`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](ADMISSION-WEDGE-PROBE-HARDENING-GATE.md)
  — Phase 33D hardening-decision gate + Phase 33E status note; the §6
  separately-gated-mutation invariant this gate honours.
- [`docs/ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md`](ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md)
  — Phase 33B Dixie-first ownership decision and the five-scenario minimum set.
- [`docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md`](ADMISSION-WEDGE-CONTRACT-RESPONSE.md)
  — Phase 33A contract response, the six-clause core invariant, and the
  service-auth-≠-consent boundary this gate restates (§9).
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md)
  — the draft v1 probe set, canonical-vs-draft vocabulary table, and no-leak rules
  the §6/§7/§13 design references. Gains a minimal 33K status note.
- [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the dependency-free, non-runtime validator (read-only; not modified). It enforces
  the five-scenario freeze (`:49-57`), the `FORBIDDEN_PUBLIC_KEYS` no-leak deep-walk
  (`:130,223`), the `straylight_primitive_review_complete: false` marker (`:269-270`),
  and the strict per-section receipt-spelling cross-check (`:324`) this gate's §5/§6/§7
  rely on.
- [`docs/integration/phase-32e-recall-wedge-route-contract.md`](integration/phase-32e-recall-wedge-route-contract.md)
  — the Recall Wedge route contract and source-hierarchy split these gates are
  modelled on; `POST /api/recall/intake` is the seam the Admission route must stay
  distinct from, and the no-leak / `storage_unavailable`-scrubbing precedent §13
  references.
- `app/src/server.ts`, `app/src/routes/recall-intake.ts`, `app/src/config.ts`,
  `app/src/services/straylight-recall-intake/refusal-mapping.ts`, `app/src/db/pool.ts`,
  `app/src/db/migrate.ts`, `app/src/services/audit-trail-store.ts`,
  `app/src/services/mutation-log-store.ts`, `app/src/utils/span-sanitizer.ts`,
  the JWT/service-auth middleware (`app/src/middleware/{jwt,service-jwt,fleet-auth,tba-auth}.ts`,
  `app/src/utils/s2s-jwt.ts`) — inspected **read-only** to ground the route seam (no
  admission route; only `POST /api/recall/intake`), the existing auth patterns
  (bearer/JWT, signed envelope, dev-seed HMAC with no stored secret), the existing
  general-purpose PostgreSQL pool + forward-only migrations (**not** admission
  storage), the hash-chained audit / append-only mutation stores, and the logging
  redaction posture. **None is modified.**
- `@loa/straylight` — canonical primitive/substrate owner of the assertion lifecycle,
  signer/keyring, receipt/audit, and storage-adapter vocabulary, read read-only in
  `../loa-straylight` (the §2 primitive sources). **No completed Straylight
  Admission-Wedge primitive review was found** (33J §4); this phase treats the A–O
  answers as exit criteria. The local checkout may be stale (§2 caveat).
- freeside-characters `docs/ADMISSION-WEDGE-DIXIE-V1-MIRROR-REFRESH-ACCEPTANCE-GATE.md`
  and `packages/persona-engine/src/recall-wedge/admission-wedge-dixie-probe-adapter.ts`
  (Phase 45J / PR #177, **verified merged on GitHub** 2026-06-06) — the cross-repo
  acceptance; its mirror/adapter proof is a **pure, fixture-bound semantic mapping
  layer with no live Dixie call**, test-only, not exported, not runtime-wired (§17).
  **Not edited by this phase.**
