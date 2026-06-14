# Phase 33X — Admission Wedge Route-Contract Revision Draft

> **Phase**: 33X
> **Branch context**: `phase-33x-admission-route-contract-revision-draft`
> **Related**: Dixie Phase 33A–33W (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle, recall-eligibility,
> signer/keyring, receipt/audit, and storage-adapter primitives
> **Status**: **docs / decision-only.** No source, test, route, route handler,
> storage, store code, DB write, migration, auth, consent, validator,
> probe/fixture/vector JSON, config, env, package, lockfile, CI, generated, or
> live-integration change.
> **This is a route-contract *revision draft*, not route-contract
> finalization/freeze and not implementation.** Dixie Phase 33W / PR #141 (merged)
> reassessed the Phase 33G route-contract draft against the confirmed Straylight
> vocabulary (loa-straylight PR #65, merged) and the finalized storage/auth/consent
> design (Phase 33V / PR #140, merged), rendered a route-contract readiness verdict
> (more ready, not final/frozen, not implementation-ready), specified exactly what
> the 33G draft must later be updated to include (its §6), and **selected this
> Phase 33X lane** as the route-contract revision-draft follow-on. Phase 33X
> **performs** that revision on paper — it rewrites the Phase 33G route-contract
> shape so it states the confirmed vocabulary as confirmed, cites the finalized
> storage/auth/consent dependencies precisely, standardizes on `public_receipt_ref`,
> and re-relates supersession via `supersedes_refs` + `link_assertions` — and
> **stops**. It implements **no** route, route handler, storage, auth, consent,
> migration, package export, runtime behaviour, or Freeside integration; it does
> **not** freeze/finalize the Dixie route contract; it does **not** mutate route
> vectors, fixtures, or validators; and it does **not** make production admission
> ready.

This document is the Dixie-side **route-contract revision draft** that Phase 33W /
PR #141 selected as the next lane
([`ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-UPDATE-GATE.md:486-531`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-UPDATE-GATE.md)).
Phase 33F assessed the draft v1 probes as a mature enough *semantic* foundation to
begin a docs-only route-contract design; Phase 33G drafted that contract on paper
(route identity, request/response envelopes, idempotency sketch, `admission.*`
refusal taxonomy, recall-eligibility projection, test vectors); Phase 33H accepted
the 33G draft as a bounded docs-only draft — **not implementation-ready** — applied
two narrow factual corrections, and routed the chain into an implementation-readiness
decomposition (33I). The decomposition selected the Straylight primitive review (33J)
and storage/auth/consent design (33K) as the dominant prerequisites; the cross-repo
review round-trip (33T request → loa-straylight PR #65 response → 33U intake) closed
the vocabulary question; Phase 33V finalized the storage/auth/consent design against
the confirmed vocabulary; and Phase 33W reassessed the 33G draft's readiness and
produced the draft-update checklist this revision executes. **Phase 33X now revises
the 33G route-contract draft against those now-resolved inputs** — without
finalizing, freezing, or implementing it.

> **This phase does not complete production readiness.** Revising the route-contract
> draft against the confirmed vocabulary and finalized storage/auth/consent design
> sharpens *what the route contract says*; per the Straylight response itself, Phase
> 33U, Phase 33V, and Phase 33W, it does **not** clear the independent production
> gates. ADR-022E gate #8 (durable production persistence) remains **held**;
> production auth/consent, the final Dixie route contract, the final endpoint
> idempotency semantics, production signer/authority semantics, and production
> identity binding each remain to be cleared on their own. No runtime marker is
> flipped — `route_contract_final` / `idempotency_final` / `identity_binding_final` /
> `authority_binding_final` / `straylight_primitive_review_complete` all stay
> `false`, `schema_final` / `canonical_schema` / `runtime_enabled` /
> `production_admission` stay `false`, and the Phase 33N spike service modules
> (`app/src/services/admission-wedge-spike/`) and route handler
> (`app/src/routes/admission-intake.ts`) are inspected **read-only** and left
> unchanged. Turning this revised draft into any code, schema, route, migration,
> vector, validator, or marker change — or accepting/freezing it as final — remains
> future, separately-gated work.

Every revision below is grounded against the Dixie Phase 33G draft (read-only), the
Phase 33H acceptance (read-only), the Phase 33V finalization (read-only), and the
Phase 33W readiness update (read-only), which in turn consumed the Phase 33U
reconciliation of the Straylight response
(`loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md`, read in the
adjacent `../loa-straylight` checkout; **not modified**). Where this draft carries a
Straylight `file:line` citation it carries it **as Phase 33U / 33V / 33W recorded
it** — the Straylight response's own §3 confirmed those citations against current
`loa-straylight` HEAD; Phase 33X does **not** re-derive or re-verify Straylight
source independently. Where this draft cites a Dixie spike-runtime line, that line is
grounded read-only against the current working tree and named only to anchor a
revision decision, never to authorize a change to it.

---

## 1. Status and scope

- **Phase 33X — Admission Wedge route-contract revision draft.**
- Dixie-side **docs / decision-only**.
- It is a **route-contract revision draft**: it revises the Phase 33G route-contract
  design (§§4–11) after the Phase 33W readiness update, executing the Phase 33W §6
  draft-update checklist on paper.
- It **revises the Phase 33G draft** after Phase 33W; it does **not** finalize or
  freeze the route contract. The Phase 33G route contract — as revised here — remains
  a **draft design**; `route_contract_final: false` everywhere. This revision
  identifies the route-contract shape clearly enough to support a *later* acceptance
  gate (§14), but it does **not** perform that acceptance and does **not** absorb,
  finalize, or freeze the route-contract gate.
- It does **not** mutate route-contract vectors, fixtures, or validators. The Phase
  33L route-contract test-vector JSONs and their validator, and the Phase 33E
  probe/fixture JSONs and their validator, are inspected **read-only** and left
  unchanged. Per the Phase 33D §6 invariant — any probe / validator / fixture /
  vector mutation requires its own separately-gated phase — Phase 33X inspects all of
  them **read-only** (§12).
- It does **not** implement a route, route handler, storage, store code, auth,
  consent, migrations, package exports, runtime behaviour, package/schema exports, or
  Freeside integration.
- It does **not** make production admission ready, and it does **not** flip
  `straylight_primitive_review_complete` (or any other draft marker) in any runtime
  artifact (the Phase 33N spike service modules and their markers are inspected
  **read-only** and left unchanged).
- It changes **no** source, test, route, route handler, storage, store code,
  validator, probe/fixture/vector JSON, config, env, package, lockfile, CI, or
  generated file. The only mutations are this new revision-draft doc and at most
  minimal cross-reference status notes on predecessor docs (§16.3).
- It does **not invent answers beyond the Straylight response / Phase 33U intake /
  Phase 33V finalization / Phase 33W readiness update.** Where a prior phase recorded
  a disposition as *delegated-to-Dixie*, *Dixie-owned-and-decided*, or
  *still-blocked*, Phase 33X drafts the **route-contract expression** of that
  disposition — it does **not** convert a held production gate into a cleared one, and
  it does **not** restate a Dixie projection as a canonical Straylight claim.

The audience is **future Dixie phases** (primarily the Phase 33Y route-contract
revision-acceptance / vector-readiness decision gate this draft selects — §14), with
the Straylight (`@loa/straylight`) owner and freeside-characters as
interested-but-unaffected parties (this draft hands neither any new authorization).

---

## 2. Source-chain context

Phase 33X sits one rung above the Phase 33W route-contract readiness-update gate on
the Dixie Admission Wedge ladder. It is the **route-contract revision-draft
follow-on** to the readiness update, which in turn followed the storage/auth/consent
finalization and the cross-repo primitive-review round-trip. It revises the Phase
33G draft against the §6 checklist Phase 33W produced; it freezes nothing and
authorizes nothing.

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33F | #123 | Route-contract **readiness gate** — assessed the draft v1 probes as a mature enough *semantic* foundation to begin a docs-only route-contract *design*; named the Straylight-review and idempotency preconditions; selected Phase 33G. Designed nothing. |
| 33G | #124 | Route-contract **design** — proposed (on paper) a route identity (`POST /api/admission/intake`), request/response envelopes with a public/private split, an idempotency sketch, an `admission.*` refusal taxonomy, storage/auth/consent preconditions, recall-eligibility projection, and route-contract test vectors mapped from the five Phase 33E probes. The **draft this revision rewrites.** `route_contract: false` / `route_contract_final: false`. |
| 33H | #126 | Route-contract **acceptance / implementation-readiness gate** — ACCEPTed the 33G draft as a bounded docs-only draft (two narrow docs-only factual corrections: refusal namespace is **two-part** not three-part; the receipt-split validator is **strict per-section**), rendered a **NOT implementation-ready** verdict, inventoried the §8 blockers, and selected the Phase 33I decomposition gate. |
| 33I | #127 | Implementation-readiness **decomposition gate** — carried the 33H §8 blocker table forward 1:1 (A–N), added synthesis rows O (route-implementation acceptance criteria) and P (production-readiness criteria), ordered the blockers into future lanes (33J review → 33K storage/auth/consent → 33L test vectors → 33M spike authorization → 33N possible spike), and selected Phase 33J, permitting 33K in parallel against draft vocabulary. |
| 33J | #128 | Straylight primitive-review **request** — issued the A–O primitive-review request to the Straylight owner (docs/decision-only); completed no review. |
| 33K | #129 | Storage/auth/consent **precondition design** gate — designed (on paper) the storage record-shape inventory, service-auth options, end-user consent options, idempotency precondition, no-leak boundary, and threat model, carrying the unresolved A–O review answers as **exit criteria**. |
| 33L | #130 | Route-contract **test-vector** draft — mapped the five Phase 33E probe scenarios into five docs/non-runtime route-contract test-vector JSONs + a dependency-free validator under `docs/admission-wedge/route-contract-test-vectors/`. Read-only here; **not mutated** (§12). |
| 33M | #131 | Dev/operator-only route-spike **authorization** gate — authorized (with bounds) a disabled-by-default dev/operator route spike; implemented nothing. |
| 33N | #132 | Dev/operator-only route-spike **implementation** — disabled-by-default `POST /api/admission/intake` on **Storage Option A (no durable storage)**, fail-closed, no-leak, layered behind **both** the global `/api/*` auth (JWT wallet / `Bearer dxk_` allowlist) **and** an endpoint-local dev/operator admission gate (`x-admission-service-token` + optional `x-admission-operator-id`); authorized no production lane. Inspected **read-only** here. |
| 33O | #133 | Route-spike **acceptance** gate — accepted 33N only as a bounded, disabled-by-default, dev/operator-only route spike; does **not** complete MVP 2. |
| 33P | #134 | Storage / receipt **hardening** decision gate — selected Option B (dev-only bounded synthetic store), rejected Option D (production-like durable storage). |
| 33Q | #135 | Dev-only bounded synthetic admitted-assertion **ledger** — process-local, Map-backed, synthetic-only, tenant+estate-scoped, capacity-bounded, non-durable, fail-closed, **test-seam-only** (not wired into `server.ts`). |
| 33R | #136 | Bounded-ledger **acceptance / hardening** gate — accepted 33Q only as a bounded, non-production, test-seam-only synthetic proof. |
| 33S | #137 | Route-spike + bounded-ledger acceptance **decomposition** gate — selected **Option D** (Straylight primitive-review follow-up) as the highest-leverage vocabulary prerequisite, and recorded the **D→E follow-on**: the storage/auth/consent finalization lane is "conditional on D, not a substitute for it." |
| 33T | #138 | Straylight primitive-review **follow-up / cross-repo review request** — re-issued the A–O register grounded in the concrete 33N route surface and 33Q ledger, defined the expected Straylight response shape, and selected Phase 33U. Completed no review. |
| **Straylight** | **`loa-straylight` PR #65 (merged)** | **Admission Wedge primitive-review *response*** — answered the 33T A–O request from the side that owns the assertion-lifecycle / recall / signer / receipt-audit / storage-adapter vocabulary; confirmed the carried-forward citations against current HEAD (its §3); coined no new canonical primitive; authorized no implementation lane in either repo. |
| 33U | #139 | Straylight response **intake / lane-decision** gate — intook the PR #65 response, reconciled **every** A–O row using only the response's dispositions (its §4), recorded the Dixie implications (its §5), preserved every blocked lane (its §7), and selected the Phase 33V storage/auth/consent design-finalization follow-on (its §6). |
| 33V | #140 | Storage/auth/consent **design-finalization** gate — consumed the 33U §4 reconciliation as exit criteria, finalized the Phase 33K storage design (its §4) and auth/consent design (its §5), recorded the route-contract dependency boundary (its §6), tabulated final design decisions and open blockers (its §7), preserved every blocked lane (its §9), and selected Phase 33W. |
| 33W | #141 | Route-contract **readiness-update** gate — reassessed the Phase 33G draft against the confirmed vocabulary and finalized storage/auth/consent design (its §3), carried forward the critical constraints (its §4), rendered the route-contract readiness verdict (its §5), checklisted what the 33G draft must later be updated to include (its §6), tabulated final design decisions and still-blocked areas (its §7), preserved every blocked lane (its §9), and **selected this Phase 33X** route-contract revision-draft follow-on (its §8). The **source-of-truth input to this draft.** |
| **33X** | *(this doc; docs/decision-only — not committed/merged yet)* | **Route-contract revision draft** — executes the Phase 33W §6 checklist on paper: revises the Phase 33G route purpose/non-goals (§4), request envelope (§5), idempotency/replay/conflict semantics (§6), response envelope (§7), refusal/denial taxonomy (§8), recall projection (§9), and supersession/correction semantics (§10) against the confirmed vocabulary and finalized storage/auth/consent dependencies (§11); records the route-vectors/validators boundary (§12); tabulates the revised positions and remaining blockers (§13); preserves every blocked lane (§15); and selects **Phase 33Y** (route-contract revision acceptance / vector-readiness decision gate; docs/decision-only — §14). Finalizes/freezes nothing; implements nothing; makes no production-readiness claim. |

### Straylight (`@loa/straylight`)

The canonical primitive/substrate owner. Its response (PR #65) **confirmed** the
33J/33T carried-forward citations against current `loa-straylight` HEAD (response §3),
coined **no** new canonical primitive, and is the first Straylight document to name
the Admission Wedge. The prior "checkout may be stale" caveat is **resolved** for the
A–O primitives by the response's own §3 confirmation (as Phase 33U / 33V / 33W
recorded). Phase 33X carries the Straylight citations exactly as Phase 33U / 33V /
33W recorded them and does **not** re-derive Straylight source.

> **Cross-repo phase-numbering caution (unchanged).** Dixie's 33-series, the
> freeside-characters 45-series, and Straylight's ADR/phase labels are independent
> labels in separate repositories and must not be conflated.

### Freeside Characters (freeside-characters)

Unchanged context. The 45-series mirror/adapter is test-only, not exported, not
runtime-wired, with no live Dixie call (45J / PR #177, **verified merged on GitHub**
2026-06-06). This draft hands Freeside **no** new authorization and **no** client
contract; Freeside review/client-contract work remains deferred until the Dixie
route/client contract is accepted enough to hand off.

---

## 3. Revision principles (constraints carried forward)

Phase 33X carries forward — **verbatim in substance** — the constraints the
Straylight response established, Phase 33U reconciled, Phase 33V finalized, and Phase
33W carried into the §6 draft-update checklist. None is a new answer; each is a
constraint this revision must honour and **must not drift from**. They bound every
revised section below (§§4–11).

**Endpoint idempotency / id-derivation:**

- **Endpoint idempotency remains Dixie / endpoint-route-contract-owned.** There is no
  `idempotency_key` primitive in Straylight; idempotency is host/Dixie-delegated per
  the recall-wedge precedent (ADR-026D §3.b).
- **Straylight content-addressed ID derivation is a distinct, narrower
  primitive-level concept**, *not* endpoint replay/idempotency: `transition_id` /
  `assertion_id` are derived via `contentId(...)` over the full input **including
  `now`**.
- **IDs are deterministic only for identical *complete* inputs** — the same candidate
  *and* the same `now`. A different `now` yields different ids.
- **No substrate de-duplication and no replay guard is claimed** — admission appends
  unconditionally; `admit()` performs no prior-id lookup; transitions/audit are
  append-only with no replay-detection step. Content-addressed id derivation is
  **not** proof of replay compatibility and must **not** be cited as substrate
  de-duplication.
- **The Dixie synthetic ledger's replay behaviour is not a Straylight replay proof.**
  The Phase 33Q ledger's spike-scoped behaviour (identical replay mints nothing;
  conflicting replay fails closed without overwrite) is enforced by the **Dixie
  ledger spike**, not the Straylight substrate; endpoint keying remains undecided
  (`idempotency_final: false`).

**Recall projection:**

- **`RecallDisposition` governs recall semantics** — the canonical four-member union
  `include` / `mark` / `redact` / `exclude` returned by `dispositionFor(assertion,
  request)`, computed **per request** from status, request filters, `privacy_scope`,
  and risk profile.
- **Recall instructions apply only to included / marked items**; **redacted /
  excluded assertions receive no `RecallUseInstruction`.**
- **`active` can still be excluded** by request filters, privacy frame, or
  risk-profile checks — there is **no universal `active ⇒ recallable` rule**.
- **`superseded` can be *marked*** (background) when `include_statuses` explicitly
  opts in, otherwise it is excluded.
- **The Dixie ledger recall booleans are constrained Dixie projections**, not
  canonical Straylight status-to-boolean semantics. The synthetic ledger's
  `recall_eligible` boolean (`active ⇒ true` / `superseded ⇒ false` under default
  request conditions, grounded read-only at
  `admitted-assertion-ledger.ts:101,793,886`) is a specific, lossy Dixie projection
  of `dispositionFor` for one request frame — **not** a coined stored primitive and
  **not** a canonical status mapping.

**Supersession / correction vocabulary:**

- **`assertion_superseded` is not a canonical Straylight `AuditEventType`.** The
  synthetic ledger emits an `assertion_superseded` label (grounded read-only at
  `admitted-assertion-ledger.ts:123,890`); it must **remain Dixie-local or be
  re-related to Straylight relation vocabulary**.
- **The normative re-relation uses existing concepts** — a `link_assertions`
  transition carrying `AssertionLinkType: 'supersedes'`, corresponding to the
  canonical **`assertion_linked`** audit-event member; plus a status transition moving
  the prior assertion to `superseded` recorded via the canonical forward field
  **`supersedes_refs`**, with the corrected assertion remaining `active`.
- **This is vocabulary relation only, not a claim that current runtime emits
  `assertion_linked`.** Straylight implements no link/supersession executor today.
- **The Dixie inverse `superseded_by_assertion_id` is Dixie-local** (grounded
  read-only at `admitted-assertion-ledger.ts:105`) — the canonical relational field
  is `supersedes_refs` (forward direction); there is **no `superseded_by` field** in
  any Straylight primitive.
- A future dedicated Straylight `assertion_superseded` event is a **separate
  Straylight ADR decision** (deferred, not blocking).

**Receipt / audit & public-field naming:**

- **Row H receipt naming is delegated to Dixie.** The synthetic `SyntheticAuditRecord`
  maps to **two** distinct Straylight primitives — `AuditEvent` (audit half,
  append-only/hash-chained) + `TransitionReceipt` (receipt half) — not one; keep them
  unconflated.
- **`public_receipt_ref` is the preferred Dixie standardization target**, not a
  rejected or re-related primitive. Straylight delegates public field-naming to Dixie
  and recommends `public_receipt_ref`; this revision adopts it, retires
  `receipt_public_ref` from the public envelope, and keeps the non-Straylight
  `audit_receipt` label off the public surface. **No route/schema field is frozen by
  33X.**

**Storage / durable-store boundary:**

- **ADR-022E durable-store gates remain held.** Any *durable* admission store is
  governed by **ADR-022E gate #8** (production persistence, held); it is **NOT**
  authorized by this review. Related held gates: #10 (Dixie boundary wiring —
  unblocked only for the single recall-intake endpoint slice, **not** admission), #12
  (new HTTP/network surface, held), #20 (threat-model widening required before any
  such wiring).
- **Dixie's synthetic bounded ledger proof is not durable storage readiness.** The
  Phase 33Q ledger proves *vocabulary alignment and synthetic transition behaviour*,
  **not** durable persistence. Durable Admission Wedge storage stays gated behind
  ADR-022E gate #8 and requires a **separate gate-clearing ADR**.

**Public-response builder / runtime boundary:**

- **The existing Phase 33N bounded, non-production public-response builder
  (`public-response.ts:95`) and guarded send path (`admission-intake.ts:247`) exist**,
  but the **final production serializer** and a **durable private/audit boundary
  remain missing/blocked**. The canonical projection rule is `privacy_scope` +
  environment-frame disposition, with the Dixie denylist as defense-in-depth — not the
  canonical rule.

**Route-contract ownership / non-freeze:**

- **Final route-contract work remains separately gated.** Endpoint idempotency is a
  Dixie route-contract responsibility; resolving the primitive review and finalizing
  the storage/auth/consent design — and revising the route-contract draft here — does
  **not** finalize the route contract. **No route/schema field is frozen by 33X.**

**Fixture / vector schema-state (carried as documented, unchanged):**

- **Phase 33E fixtures carry both `public_receipt_ref` and `receipt_public_ref`** —
  the two-spelling reconciliation debt (fixtures README `:143-144,313`).
- **Phase 33L vectors use `public_receipt_ref_policy` and contain no
  `receipt_public_ref`.**
- **Fixture/vector schema updates remain separately gated** (§12); aligning the
  fixtures, vectors, and this revised public envelope is a later vector-mutation lane,
  not this revision.
- **Phase 33Q stores a constrained, spike-local `recall_eligible` boolean**, but there
  is **no canonical/production persisted eligibility authority** — recall recomputes
  `RecallDisposition` per request.

---

## 4. Revised route purpose and non-goals

This revises Phase 33G §4–§5 (route identity, purpose, non-goals) against the
confirmed vocabulary. The route identity itself is unchanged in shape and remains
**draft / non-final**.

### Revised route identity (draft, non-final)

> **Proposed (draft, non-final): `POST /api/admission/intake`** — method `POST` (a
> write-attempt verb: admission proposes/decides a state transition), path
> `/api/admission/intake` under the per-wedge `/api/<wedge>/intake` convention
> established by the Recall Wedge route `POST /api/recall/intake`.

- The route name/path remains **draft / non-final**; `route_contract_final: false`.
  Phase 33X does **not** freeze the path, method, version discriminator, or any field.
- A disabled-by-default, dev/operator-only Phase 33N **spike** at this path already
  exists (Storage Option A, no durable storage), layered behind **both** the global
  `/api/*` auth (JWT wallet / `Bearer dxk_` allowlist middleware) **and** an
  endpoint-local dev/operator admission gate (`x-admission-service-token` + optional
  `x-admission-operator-id`) — the dedicated admission header is defense-in-depth on
  top of the global gate, **not** a replacement for it (`/api/admission` is not
  allowlist-exempt). The revised contract describes the *intended shape* of a future
  non-spike route; it neither expands the spike nor authorizes a production route.
- The route is for **Admission Wedge candidate / transition intake and public-safe
  response projection** — it accepts a *candidate proposal* or a *transition request
  over an existing assertion*, never a stream of user messages. It writes
  governed-memory state (when a future durable path exists); it is a **separate seam**
  from the Recall Wedge read/demo route, with separate envelopes, refusal taxonomy,
  and storage/auth posture.

### Revised purpose (draft)

- Accept a **candidate admission request envelope** (a candidate proposal, or a
  transition request over an already-admitted assertion).
- Validate **candidate / admission-transition intent** (shape, class, session-derived
  identity binding, endpoint idempotency) at the Dixie ingress seam.
- Apply or reference an explicit **admission / rejection / supersession / correction
  transition** whose *substrate semantics* are owned upstream by Straylight
  (`admit_assertion`, `transition_denied`/`assertion_admitted` audit events,
  `supersedes_refs` + `link_assertions` for supersession).
- Return a **public-safe admission result** (or a **fail-closed refusal**) projected
  through the `privacy_scope` + environment-frame rule, with the Dixie denylist as
  defense-in-depth.
- Emit or reference **private audit material behind a private boundary** — split into
  the `AuditEvent` (audit) and `TransitionReceipt` (receipt) halves — never on the
  public response.

### Revised non-goals (draft)

The route is **not** for, and this revision does **not** design or authorize, any of:

- arbitrary chat ingestion;
- public `remember-this`;
- Discord history ingestion;
- user chat becoming memory;
- production durable storage implementation;
- production auth/consent implementation;
- Freeside Characters runtime/client integration;
- LLM rewriting / character voice of candidate content;
- final schema freeze;
- production deployment / readiness.

The core invariant the whole chain carries (33A §4, 45J) is unchanged: *candidate
memory is not admitted memory; candidate memory is not recallable before explicit
admission; an accepted transition creates or references an admitted assertion
(canonical `active`); a rejected candidate never becomes recallable; supersession /
correction preserves auditability while ordinary recall includes only the corrected
active assertion; fail-closed paths do not leak raw candidate / private payload.* The
revised contract below is a paper expression of that invariant — not its enforcement.

---

## 5. Revised request envelope draft

The fields below are **draft / non-final** and revise Phase 33G §6 against the
confirmed identity-binding and id-derivation vocabulary. This is **prose/table form,
not an executable schema**; no field is frozen, typed, or authorized. Names marked
*(canonical)* mirror already-established Straylight-owned primitives; names marked
*(draft)* are Dixie-proposed and subject to reconciliation; names marked *(Dixie
host-layer)* are owned by the Dixie host layer, not the wedge. No real IDs, URLs,
tokens, or secrets appear here.

| Field / section | Purpose | Ownership / status | Public/private | May appear in public response? |
|-----------------|---------|--------------------|----------------|--------------------------------|
| `request_version` *(draft)* | Envelope/version discriminator so the contract can evolve. | Dixie ingress; **non-final**. | Public-safe metadata. | Yes (echoed for correlation). |
| route name/path | `POST /api/admission/intake` (draft, non-final). | Dixie ingress; **non-final** — not frozen by 33X. | n/a. | n/a. |
| `tenant_id` | Tenant scope for the admission. | **Dixie host-layer** — *not* a Straylight wedge primitive. **Session-derived, never body-trusted.** | Private operational ID. | **No.** |
| `estate_id` *(canonical wedge primitive)* | Estate scope. | Straylight wedge primitive (mirrored). Session-derived. | Private operational ID. | **No.** |
| `actor_id` *(canonical wedge primitive)* | The acting actor (caller). | Straylight wedge primitive (mirrored). Session-derived. | Private operational ID. | **No.** |
| caller / service identity boundary (`service_auth_context` *(draft, reference)*) | A reference/handle to how the calling **service** authenticated — **never a raw secret**; service auth proves a service may *call* Dixie, **not** that an end user/channel/tenant/surface is authorized (service auth ≠ end-user consent, §11). | Dixie ingress; **non-final**. No admission auth exists today. | Private. | **No.** |
| subject material | The actor/entity the candidate is *about*. Maps to `Assertion.subject_refs` (**canonical**) — **no coined `subject_actor_id`** primitive. | Substrate-owned reference; Dixie carries draft refs only. | Private operational ID. | **No.** |
| `end_user_authorization_context` *(draft)* | End-user authorization/consent reference **or** an explicit dev-only omission marker (non-production). Consent reference is **private-audit-only** (§11). | Dixie ingress; **non-final**. No consent mechanism exists today. | Private. | **No.** |
| candidate / proposed material boundary (`candidate` *(draft)*) | The candidate payload + class + private source linkage. A candidate is canonical `proposed` (a `CandidateAssertion` pre-admission object), **not** an admitted assertion and **not** recallable before admission. **Raw candidate payload is never public.** | Private / admission-bound; bounding/sanitization a future-design concern. | Private. | **No** (only `rendered_candidate_payload: false` + a safe summary). |
| `transition_intent` *(draft)* | The requested transition (see §10): one of propose / admit / reject / supersede / correct as applicable. Substrate vocabulary is canonical (`admit_assertion`, `transition_denied`, `supersedes_refs` + `link_assertions`); the request field name is draft. | Dixie ingress; substrate semantics canonical. | Private. | **No** (only its outcome class is public). |
| idempotency key field / header semantics | Endpoint idempotency key — **Dixie-owned** (§6). Whether body field vs header, and key scope, are **undecided** (`idempotency_final: false`). **Distinct from** the content-addressed Straylight `transition_id`/`assertion_id`. | **Dixie / endpoint-route-contract-owned.** | Private. | **No.** |
| `now` / timestamp handling | The admission timestamp that feeds `contentId(...)`. Content-addressed `transition_id`/`assertion_id` are deterministic **only for identical complete inputs including `now`**; a different `now` yields different ids. This is **not** endpoint idempotency. | Substrate-owned id-derivation input. | Private. | **No** (ids are not public; only safe refs). |
| `source_context` *(draft)* | Where the candidate came from (`source_kind`, `source_ref`) — private. | Dixie ingress; **non-final**. | Private. | **No.** |
| `requested_public_projection` *(draft)* | What public projection the caller asks for (e.g. receipt only) — must **not** let callers widen the public surface. | Dixie ingress; **non-final**. | Public-safe request hint. | Echoable as a hint only. |
| `client_context` *(draft)* | Non-authoritative client metadata (build, locale) — must carry no PII/secrets. | Dixie ingress; **non-final**. | Public-safe, minimal. | Minimal echo only. |

**Request-processing public/private boundary.** No raw / private / source / debug
fields appear in the public response. The request envelope's private operational IDs
(`tenant_id`, `estate_id`, `actor_id`, subject refs), the idempotency key, the
candidate payload, source material, and the service/consent contexts are all
**private**; only a public-safe outcome projection (§7) is returned.

> **This is a draft envelope, not a wire schema.** No field is frozen, typed, or
> authorized. Real types, required/optional status, and a final version/kind
> discriminator are outputs for a later, separately-gated acceptance lane (§14) and
> remain subject to Straylight reconciliation where substrate-owned.

---

## 6. Revised idempotency / replay / conflict semantics

This revises Phase 33G §12 against PR #65 row J / Phase 33U / Phase 33V / Phase 33W
§4. It is a **route-contract draft**, not a final keying decision; `idempotency_final:
false`.

- **Dixie owns endpoint idempotency.** There is no `idempotency_key` primitive in
  Straylight; idempotency is host/Dixie-delegated per the recall-wedge precedent
  (ADR-026D §3.b). The route contract may design endpoint idempotency **without
  waiting on Straylight**.
- **An idempotency key is required (or strongly recommended) for this write-attempt
  route**, mirroring the Recall route's mandatory `Idempotency-Key` (which refuses at
  ingress when missing/oversized). Whether it is a header or body field, and its exact
  key **scope** (candidate-id-keyed vs header-keyed vs both, plus
  tenant/estate/subject/intent), remains **undecided** (`idempotency_final: false`) —
  this revision drafts the behaviour, not the keying.
- **Replay behaviour is defined by the Dixie route contract** (drafted, not frozen):
  - **identical replay** → return the prior public-safe result/receipt reference
    without re-deciding (no re-invoke of the seam);
  - **conflicting replay** (same key, different intent/content) → **fail closed**
    (`admission.idempotency_conflict`, §8) — no overwrite, no fork;
  - **rejected-transition replay** → stable denied envelope (same
    `admission.transition_denied`), not re-decided;
  - **accepted-transition replay** → **no duplicate assertion minted**;
  - **supersession replay** → **no duplicate corrected assertion minted**;
  - **malformed-request replay** → behaviour remains **draft** (coalesce rather than
    mint duplicate refusal state).
- **Conflict behaviour must be public-safe.** A conflict returns a stable, generic
  public code; the conflicting key, the prior result, and any operational detail stay
  private (§8, §7).
- **Content-addressed Straylight IDs are not endpoint replay proof.** The
  `contentId(...)`-derived `transition_id`/`assertion_id` (deterministic only for
  identical complete inputs *including `now`*) are a distinct, narrower concept; **no
  substrate de-duplication / replay guard is claimed**; `admit()` performs no prior-id
  lookup and transitions/audit are append-only.
- **The Phase 33Q ledger replay behaviour is spike-local, not production proof.** The
  ledger's behaviour (identical replay mints nothing; conflicting replay fails closed
  without overwrite) is enforced by the **Dixie ledger spike**, not the Straylight
  substrate, and proves vocabulary alignment, not endpoint idempotency.
- **Final key format / storage backing remains later-gated.** The idempotency key must
  not be public (§7), and final semantics (and any durable backing for replay caching)
  remain a separate, later-gated route-contract + storage decision.

---

## 7. Revised response envelope draft

This revises Phase 33G §9 against PR #65 rows H/K / Phase 33V §4 / Phase 33W §6. The
envelope keeps a **public/private split**; the public response is the only surface a
caller sees, and the private/audit material lives behind a boundary and is never
serialized to the caller. **No schema is frozen.**

### 7.1 Public-safe response (revised draft)

Public response may include:

- **stable public outcome/status** — `outcome` (one of the public outcome classes:
  `accepted_as_proposed`, `admitted`, `denied`, `superseded_with_correction`,
  `refused`). `admitted` is a **public outcome class only, never a canonical status**
  (the canonical admitted status is `active`).
- **refusal/denial taxonomy code** — `reason_code`, present on refusal/denial; a
  stable public code from the §8 taxonomy.
- **`public_receipt_ref`** *(preferred Dixie standardization target)* — a public-safe
  receipt reference; `null` where no public receipt is minted (pending, fail-closed).
  This **standardizes on `public_receipt_ref`** and **retires `receipt_public_ref`
  from the public envelope**.
- **public-safe recall eligibility projection (if present, explicitly constrained)** —
  see §9; a derived per-request Dixie projection of `RecallDisposition`, never a
  persisted authority and never a canonical status→boolean rule.
- **safe human-readable summary** (`message` / `public_summary`) — classifies the
  outcome without leaking the hidden reason.

The public response must contain **no raw/private/source/debug leakage**: per §3 and
Phase 33G §10, the never-public categories are raw candidate payload, source material,
raw reasons, audit/private detail, operational IDs (`tenant_id`/`estate_id`/`actor_id`,
candidate/transition/assertion linkage ids), the idempotency key, signer/authority
material, storage internals, stack traces / `file.ts:line` refs, tokens, URLs, and
debug markers. The canonical projection rule is **`privacy_scope` + environment-frame
disposition**, with the Dixie denylist as **defense-in-depth** (not the sole rule).

- **No `receipt_public_ref` in the revised draft** unless explicitly justified as
  legacy/debt — it is retired from the public envelope (the Phase 33E fixtures still
  carry it; aligning them is a separate vector-mutation lane, §12).
- **No final schema freeze** — every field above is draft; types/required-status are
  later-gated.

### 7.2 Private / audit response (internal only, revised draft)

Conceptually (never public):

- **private receipt / audit references** — the private receipt reference, raw
  candidate/source references, transition record references, raw reasons,
  authority/signature detail, and operational tenant/estate/actor IDs.
- **relationship to `TransitionReceipt` / `AuditEvent`** — the synthetic
  `SyntheticAuditRecord` splits into **two** distinct Straylight primitives, kept
  unconflated: the **`AuditEvent`** half (append-only / hash-chained; canonical
  admission members `assertion_admitted` and `transition_denied`) and the
  **`TransitionReceipt`** half (kinds incl. `admission` / `denied`). The non-Straylight
  `audit_receipt` label stays **off the public surface** and is not promoted to a
  canonical term.
- **durable private/audit boundary remains blocked** — there is no durable admission
  store (ADR-022E gate #8 held); the private/audit boundary is undesigned at
  production scale.
- **Phase 33N public-response builder exists, final production serializer remains
  missing** — a bounded, non-production public-response builder
  (`public-response.ts:95`) and guarded send path (`admission-intake.ts:247`) exist for
  the spike; the **final production serializer** that must enforce `privacy_scope` +
  frame disposition is **not** designed or built.

> **The public response must not include any private/audit field.** The two objects
> are disjoint by construction; full audit detail is private (`audit_private: true`,
> `public_audit_detail: false`).

---

## 8. Refusal / denial taxonomy

This revises Phase 33G §11. The `admission.*` family is **draft and in no source
code**, grounded in the **two-part** `category.specific_reason` namespace (a single
`ingress`/`guard`/`seam`/`admission` category prefix joined by **one dot** to a single
underscore-reason — per the Phase 33H two-part correction). It does **not** silently
inherit recall's `seam.*` codes (33A §5.J). Every code is public-safe and no-leak: a
stable, generic public meaning with all finer detail private.

| Class | Public-safe meaning | Public code (draft) | Private/audit boundary |
|-------|---------------------|---------------------|------------------------|
| **malformed / unsafe projection refused** | The request (or a requested public projection) was malformed/unsafe and was refused at ingress before any transition. | `ingress.invalid_request` *(existing Dixie code)*; `admission.unsafe_projection_refused` *(draft)* for an unsafe public-projection request. | `refusal_class`, `private_reason_family`, `raw_reasons` private. |
| **unsupported transition refused** | The requested transition kind is not supported / not recognized. | `admission.unsupported_transition` *(draft)*. | Which intent and why, private. |
| **unauthorized / unauthenticated** | Service or end-user authorization is required and absent, or present but denied. | `admission.authorization_required` / `admission.authorization_denied` *(draft)*. | Which authz failed / denial reason, private. |
| **tenant / estate / actor mismatch** | A body-supplied identity conflicts with the session-derived identity, or cross-tenant scope is ambiguous. | `admission.identity_mismatch` *(draft)*; cf. recall's `ingress.cross_tenant_body_mismatch`. Fails closed per Straylight `TenantResolver` posture. | The conflicting IDs, private. |
| **pending candidate not recallable** | A candidate exists as a proposal and is not (yet) admitted; nothing recallable was minted. | `admission.candidate_not_admitted` *(draft)*. | Pending vs never-decided detail, private. |
| **class-validation rejection (candidate refused at ingress)** | The candidate failed ingress / class validation; it was refused **before any estate transition**. **No** assertion was minted, **no** denied `TransitionReceipt` was issued, and **no** `transition_denied` audit event was emitted — there is no transition to deny. This `rejected_candidate` (class-validation) case is preserved as **distinct** from a policy `denied_transition`. | `ingress.invalid_request` *(existing Dixie ingress refusal)* — not `admission.unsupported_transition` and not `admission.transition_denied`. | Which validation failed, private. |
| **policy denial (transition denied)** | The candidate was valid enough to attempt a transition, but the transition was **denied by policy**. A **denied `TransitionReceipt`** is issued and a canonical **`transition_denied`** audit event is emitted; no admitted (`active`) assertion is minted and it stays non-recallable. | `admission.transition_denied` *(draft, bound to canonical `transition_denied`)*. | Policy reason, private. |
| **superseded candidate / assertion behavior** | A supersession/correction outcome (the prior assertion moved to `superseded`; ordinary recall includes the corrected `active` only). | `superseded_with_correction` outcome class (not a refusal); a malformed supersession request fails closed via the ingress/unsupported codes. | Superseded prior body, private. |
| **conflict / replay mismatch** | A *conflicting* request reused an idempotency key (same key, different intent/content); the request fails closed (no overwrite). A *benign identical* replay is **not** a refusal — it returns the **prior public envelope** unchanged (§6 identical-replay behaviour), so it has **no** new public code; any "duplicate replay" classification is **private telemetry only**. | `admission.idempotency_conflict` *(draft)* for the conflicting case. **No** public `admission.duplicate_replay` code — identical replay returns the prior public envelope. | Conflicting key / cached result, and any benign-replay telemetry, private. |
| **partial failure / atomicity failure** | A multi-step admission could not complete atomically; it fails closed with **no partial-admission residue**. | `admission.partial_commit_failed` *(draft)*. | Which step / rollback detail, private. |
| **durable storage unavailable / not authorized** | The (future) admission store is unavailable or not authorized; no write occurred. | `admission.storage_unavailable` *(draft, mirrors recall's `seam.storage_unavailable` no-leak rule)*. | Underlying exception text **never** public. |

> **These are not final production codes.** Names, HTTP status mappings, and the
> public/private split are **draft** and must be reconciled at a later acceptance lane
> (Dixie owns the ingress taxonomy; Straylight owns the underlying
> transition/denial substrate semantics). Responses stay **public-safe and no-leak**:
> informative enough to classify, generic enough not to leak the hidden reason.

---

## 9. Recall projection semantics

This revises Phase 33G §15 against PR #65 row E / Phase 33U / Phase 33V / Phase 33W
§4. It is a **route-contract draft**; no canonical/production persisted eligibility
authority is established by 33X.

- **`RecallDisposition` framing.** Recall behaviour is governed by the canonical
  four-member union `include` / `mark` / `redact` / `exclude`, returned by
  `dispositionFor(assertion, request)` and computed **per request** from status,
  request filters, `privacy_scope`, and risk profile.
- **A public boolean may be used only as a constrained Dixie projection.** Any public
  `recall_eligible` boolean is a **derived per-request Dixie projection** of
  `RecallDisposition`, recomputed at recall time — **never** a persisted authority and
  **never** a canonical status→boolean rule. It is a lossy collapse of the
  four-member disposition for one request frame.
- **`active` does not automatically mean recallable.** `active` can still be
  `exclude`d by request filters, privacy frame, or risk-profile checks — there is **no
  universal `active ⇒ recallable` rule**.
- **`superseded` can be *marked*** (background) when `include_statuses` explicitly
  opts in; otherwise it is excluded. Ordinary recall includes the corrected `active`
  assertion only.
- **Redacted / excluded assertions receive no `RecallUseInstruction`** — instructions
  attach only to `include`d (`usable`) and `mark`ed items.
- **Pending / rejected / malformed are not recallable.** Pending candidates, rejected
  candidates, and malformed/unsafe candidates mint nothing recallable and fail closed;
  no `RecallUseInstruction` attaches.
- **No canonical/production persisted eligibility authority is established by 33X.**
  The Phase 33Q synthetic ledger stores a constrained, spike-local `recall_eligible`
  boolean (`active ⇒ true` / `superseded ⇒ false` under default request conditions,
  `admitted-assertion-ledger.ts:101,793,886`) — a non-durable, non-production
  projection, not durable storage and not production recall authority. Recall
  recomputes `dispositionFor` per request.

---

## 10. Supersession / correction semantics

This revises Phase 33G §8.3 and §13's `supersedes_assertion_id`/
`superseded_by_assertion_id` sketch against PR #65 rows C/D/N / Phase 33U / Phase 33V
/ Phase 33W §4. It is a **route-contract draft**; final vocabulary acceptance remains
later-gated if needed.

- **`assertion_superseded` is not a canonical Straylight `AuditEventType`.** Drop it
  as canonical. The synthetic ledger's `assertion_superseded` label
  (`admitted-assertion-ledger.ts:123,890`) **remains Dixie-local** or must be
  **re-related** to Straylight relation vocabulary before any non-spike mapping.
- **Use Dixie-local or re-related vocabulary.** The normative re-relation:
  - a **`link_assertions`** transition carrying **`AssertionLinkType: 'supersedes'`**,
    corresponding to the canonical audit-event member **`assertion_linked`**; plus
  - a status transition moving the prior assertion to **`superseded`**, recorded via
    the canonical **forward field `supersedes_refs`**, with the corrected assertion
    remaining canonical **`active`**.
- **Reference Straylight relation concepts as vocabulary only, not a runtime executor
  claim.** `supersedes_refs`, `link_assertions`, and `assertion_linked` are named as
  *vocabulary relation*; **Straylight implements no link/supersession executor today**
  and **no claim is made that current Straylight runtime emits `assertion_linked`.**
- **The Dixie inverse `superseded_by_assertion_id` remains Dixie-local** if used
  (`admitted-assertion-ledger.ts:105`) — the canonical relational field is
  `supersedes_refs` (forward direction); there is **no `superseded_by` field** in any
  Straylight primitive.
- **`(superseded, active)` is a relation/direction, not a coined `corrected_active`
  status** — do **not** coin `corrected_active`.
- **A future dedicated Straylight `assertion_superseded` event is a separate Straylight
  ADR** (deferred, not blocking). **Final vocabulary acceptance for the Dixie-local
  re-relation remains later-gated if needed** (§14).

---

## 11. Storage / auth / consent dependency section

This carries forward the Phase 33V finalized dependencies (its §4/§5, recorded in
Phase 33W §4/§7). Each is a **route-contract dependency** the revision states
precisely; **none is designed, implemented, or cleared here.**

- **Durable store architecture required** — no durable admission store exists or is
  designed; gated behind **ADR-022E gate #8** (production persistence, held); related
  held gates #10 (Dixie boundary wiring, recall-intake slice only), #12 (new
  HTTP/network surface), #20 (threat-model widening). The Phase 33Q synthetic ledger is
  process-local, Map-backed, non-durable, capacity-bounded, fail-closed, test-seam-only
  and **does not satisfy** this.
- **Tenant / estate / actor binding required** — `estate_id`/`actor_id` are Straylight
  wedge primitives; `tenant_id` is Dixie host-layer; identity is **session-derived,
  never body-trusted**; production identity binding undefined (`identity_binding_final:
  false`). Subject maps to `Assertion.subject_refs` (no coined `subject_actor_id`).
- **Admitted assertion persistence boundary required** — the admitted assertion is a
  canonical `active` `Assertion` (Straylight substrate semantics); Dixie holds ingress
  references only; `admitted` is a public outcome class, never a status. Production
  persistence undesigned.
- **Candidate / proposed material persistence boundary required** — a `CandidateAssertion`
  pre-admission object (canonical `proposed`); the raw candidate payload is
  private/admission-bound and never public; bounding/sanitization undesigned.
- **Transition receipt persistence boundary required** — maps to `TransitionReceipt`
  (kinds incl. `admission`/`denied`), distinct from the audit half. The canonical
  `TransitionReceipt` is a **private / non-public** record and carries full
  operational/audit detail (`receipt_id`, `transition_id`, `estate_id`, `actor_id`,
  signer/audit references, policy details, reasons, and metadata); it is **never**
  serialized to the caller. Only a separate **`public_receipt_ref`** projection may be
  public — a public-safe reference, `null` where no public receipt is minted; it is not
  the `TransitionReceipt` itself. Production persistence undesigned.
- **Audit event persistence boundary required** — maps to `AuditEvent` (append-only,
  hash-chained); canonical admission members `assertion_admitted` and
  `transition_denied`; full audit detail private/controlled-access; `audit_receipt`
  stays off the public surface. Production persistence undesigned.
- **Public / private projection boundary required** — the canonical rule is
  `privacy_scope` + environment-frame disposition, with the Dixie denylist as
  defense-in-depth; the **final production serializer** is undesigned (a bounded
  non-production Phase 33N builder exists at `public-response.ts:95`).
- **Service auth vs end-user authorization separation required** — service auth proves
  a service may *call* Dixie; it does **not** prove the end user/channel/tenant/surface
  is authorized. **Service auth ≠ end-user consent** (load-bearing, 32F §7 / 33A). The
  Phase 33N dev `x-admission-service-token` gate is **non-production only**.
- **Consent proof / receipt boundary required** — production end-user admission
  requires an explicit consent artifact (33K §10 Option A) or platform-mediated grant
  (Option B); **Option D (no authorization) is rejected**; the consent reference is
  **private-audit-only** (never public, never a raw secret); the dev/operator omission
  marker is non-production only.
- **Production authority / signing model required** — which signer roles may authorize
  `admit_assertion` (and reject/supersede) is decided by **`SignerCompetenceRule` /
  `Keyring` / policy**, not a fixed list; `policy_service` is a canonical `SignerType`
  safe to mirror; `authority_*_draft` field names stay Dixie draft
  (`authority_binding_final: false`). Production authority model unselected.
- **Cross-user / cross-tenant sharing blocked by default** — cross-user admission
  requires an explicit consent model; cross-tenant ambiguity fails closed per the
  Straylight `TenantResolver` posture.
- **Atomicity / rollback required (design requirement, not implemented)** — a
  multi-step admission must be **atomic — no partial-admission residue, fail-closed on
  partial commit**; rollback/backfill/migration are undesigned and required inputs to a
  future durable-store ADR (forward-only migrations noted, not designed).
- **Freeside handoff remains later and separate** — no client contract is handed off;
  the adapter stays test-only, not exported, not runtime-wired, no live Dixie call.

---

## 12. Route vectors / validators boundary

- **Phase 33X does not mutate route-contract test vectors.** The five Phase 33L
  route-contract test-vector JSONs under
  `docs/admission-wedge/route-contract-test-vectors/` are inspected **read-only** and
  left unchanged.
- **Phase 33X does not mutate validators.** Neither the Phase 33L route-contract
  test-vector validator (`validate-route-contract-test-vectors.mjs`) nor the Phase 33E
  fixture validator (`validate-fixtures.mjs`) is changed; both must stay green
  unchanged (§16).
- **A later docs/test-vector lane may update vectors and validators** — only **after**
  route-contract revision acceptance (Phase 33Y, §14) decides that vector/validator
  update is ready. Any such change is a separately-gated lane subject to the Phase 33D
  §6 separately-gated-mutation invariant.
- **Phase 33E fixture spelling debt remains documented but unchanged.** The Phase 33E
  fixtures carry **both** `public_receipt_ref` and `receipt_public_ref` (fixtures
  README `:143-144,313`); this revision standardizes the *public envelope* on
  `public_receipt_ref` (§7) but does **not** touch the fixtures.
- **Phase 33L vector `public_receipt_ref_policy` behaviour remains documented but
  unchanged.** The Phase 33L vectors use `public_receipt_ref_policy` and contain **no**
  `receipt_public_ref`; this revision does **not** touch the vectors. Aligning the
  fixtures, vectors, and this revised public envelope on `public_receipt_ref` is a
  separate, later vector-mutation lane — **not** this revision.

---

## 13. Readiness table

Each route-contract section carries the **revised draft position** this gate now
records, whether it is **still blocked**, the **later owner/gate**, and **why it is
not final**. *Revised draft position* means "what the route-contract revision now
states on paper," never "what is implemented" — nothing is implemented, and no field
is frozen.

| Route-contract section | Revised draft position | Still blocked? | Later owner / gate | Why not final |
|------------------------|------------------------|:--------------:|--------------------|---------------|
| **Route path** | `POST /api/admission/intake` (draft, non-final); per-wedge `/api/<wedge>/intake` convention; spike exists, production route does not. | **Yes** (production route) | Dixie route contract (33Y+); production route gate | Path/method not frozen by 33X; `route_contract_final: false`. |
| **Request envelope** | Wedge-primitive (`estate_id`/`actor_id`) vs host-layer (`tenant_id`) ownership fixed; subject → `Assertion.subject_refs`; identity session-derived; idempotency key Dixie-owned; `now` feeds `contentId` (not idempotency). | **Yes** (production binding) | Dixie route contract + production identity-binding gate | No wire schema frozen; types/required-status are later outputs. |
| **Idempotency** | Dixie/endpoint-owned; replay/conflict behaviour drafted; content-addressed IDs are not endpoint idempotency; keying undecided (`idempotency_final: false`). | **Yes** | Dixie route-contract gate (33Y+) | Keying/replay/conflict still undecided; no key format/backing chosen. |
| **Public response** | Standardize on `public_receipt_ref`; retire `receipt_public_ref` from the public envelope; keep `audit_receipt` off the public surface; `privacy_scope` + frame projection rule, denylist as defense-in-depth; no schema frozen; vectors unchanged. | **Yes** (final serializer + final schema) | Dixie public-surface design; route contract (33Y+); separate vector-mutation lane | Final production serializer undesigned; fixtures keep both spellings, vectors keep `public_receipt_ref_policy` until a separate lane. |
| **Private/audit response** | Split `AuditEvent` (audit half) + `TransitionReceipt` (receipt half), unconflated; full audit detail private. | **Yes** (durable private/audit boundary) | Dixie public-surface design; durable-store gate (ADR-022E #8 held) | Phase 33N non-production builder exists; durable private/audit boundary missing/blocked. |
| **Refusal taxonomy** | `admission.*` draft, two-part `category.specific_reason`; preserves `rejected_candidate` ≠ `denied_transition`; `ingress.invalid_request` for ingress; public-safe/no-leak. | **Yes** | Dixie route-contract gate (33Y+) | Names/HTTP mappings/public-private split draft; in no source code. |
| **Recall projection** | `recall_eligible` is a derived per-request Dixie projection of `RecallDisposition`, recomputed at recall time — never persisted authority, never status→boolean; no universal `active ⇒ recallable`. | No (semantics resolved; Dixie-owned) | Dixie public-surface design | No canonical/production persisted eligibility authority; recall recomputes `dispositionFor` per request. |
| **Supersession / correction** | Use `supersedes_refs` + `link_assertions`/`assertion_linked`; `assertion_superseded` dropped as canonical, re-related Dixie-locally; inverse `superseded_by_assertion_id` Dixie-local; no coined `corrected_active`. | No (re-relation decided) | Dixie-local; a dedicated Straylight event is a separate Straylight ADR (deferred) | Synthetic label must be re-related before any non-spike mapping; final vocabulary acceptance later-gated. |
| **Storage dependency** | No durable store designed/authorized; behind ADR-022E gate #8 (held); synthetic ledger explicitly non-durable. | **Yes** | ADR-022E gate #8 (held); future production-storage gate | A durable store may not be built until a separate ADR clears gate #8. |
| **Auth/consent dependency** | Service auth via `policy_service`/`SignerCompetenceRule`/`Keyring`/policy; production consent required (artifact or platform-mediated grant; Option D rejected; private-audit-only); dev token non-production. | **Yes** (production semantics) | Production signer/authority gate; production auth/consent gate | No production auth/consent model selected; cross-user/public admission stays blocked. |
| **Identity binding** | `estate_id`/`actor_id` wedge-primitive; `tenant_id` host-layer; session-derived; production binding undefined (`identity_binding_final: false`). | **Yes** (production binding) | Production identity-binding gate | Production identity binding undefined; no `subject_actor_id` coined. |
| **Route vectors / validators** | Unchanged; read-only; any change is a separate gated lane (Phase 33D §6). | **Yes** (mutation gated) | Separate vector/validator-mutation lane (after 33Y) | No vector/validator change here; vectors/fixtures stay frozen until a separate lane. |
| **Freeside handoff** | No client contract handed off; adapter test-only, not exported, not runtime-wired, no live Dixie call. | **Yes** | Freeside gate, after a mature/accepted Dixie contract | No Freeside runtime/client wiring authorized. |
| **Production readiness** | Not ready; the revision sharpens the route contract's stated shape but clears no independent production gate. | **Yes** | All of the above gates | Production admission stays blocked under every option. |

> **None of §13 is a production-readiness claim.** Each "revised draft position"
> records the *posture* the route-contract revision now states on paper against the
> confirmed vocabulary and finalized storage/auth/consent design; every production
> lane remains independently gated (§15), exactly as the Straylight response, Phase
> 33U, Phase 33V, and Phase 33W state.

---

## 14. Decision: next Dixie lane

> **Selected: Phase 33Y — Admission Wedge route-contract revision acceptance /
> vector-readiness decision gate, docs / decision-only.**

**Reason:**

- **Phase 33X drafts the route-contract revision.** It has executed the Phase 33W §6
  checklist on paper (§§4–11), tabulated the revised positions and remaining blockers
  (§13), and preserved every blocked lane (§15) — but it has **not** accepted or frozen
  that revision.
- **The next safe step is to audit / accept / patch that revision and decide whether
  vector/validator update is ready.** A revision draft, like the original 33G design,
  should be **accepted/audited before** anything downstream is touched. Phase 33Y
  decides whether the revised draft is stable enough to (a) accept as the working
  route-contract draft and (b) authorize a *later* vector/validator-mutation lane to
  align the Phase 33E fixtures and Phase 33L vectors on `public_receipt_ref` and the
  revised shape.
- **Do not jump directly to vector mutation.** Vector/validator mutation must wait
  until the acceptance gate proves the revised draft is stable enough; mutating
  vectors against an unaccepted revision would freeze the test surface ahead of its
  evidence — exactly the move every gate in this chain has refused.
- **Do not select runtime implementation.** No artifact here proves implementation is
  safe; the Phase 33N spike (Storage Option A, disabled-by-default, dev/operator-only)
  remains the only authorized route surface; ADR-022E gate #8 stays held; production
  auth/consent, the final route contract, and final endpoint idempotency semantics each
  remain to be cleared; no final schema is frozen. Selecting implementation would
  bypass those gates.

**Why not finalize/freeze the route contract instead (a "33Y — route-contract
finalization" lane).** Finalization would require deciding the still-undecided
route-owned questions (idempotency keying, the `admission.*` taxonomy, production
identity binding, atomicity/rollback) *and* clearing the held production gates (durable
storage, auth/consent); §13 shows no artifact proves that is safe today. An acceptance
gate makes forward progress (accept/patch the revision, decide vector-readiness) while
keeping finalization separately gated.

**Why not select the vector-mutation lane directly.** Aligning the Phase 33E fixtures
and Phase 33L vectors on `public_receipt_ref` and the revised envelope is real work,
but doing it before the revision is **accepted** risks churning the test surface
against a draft that may still be patched. Phase 33Y gates that decision; the
vector-mutation lane (if authorized) follows acceptance.

**Provisional phase label.** The follow-on lane is provisionally labelled **Phase
33Y**. The label is for ordering only; the acceptance/vector-readiness content belongs
to that future, separately-gated docs/decision phase and is **not** performed here. No
route, store, migration, auth, consent, public surface, Freeside wiring, package
export, route-contract freeze, vector mutation, validator mutation, or schema freeze is
selected, scheduled, or authorized under any option.

---

## 15. What remains blocked regardless of this revision (blocked lanes preserved)

Phase 33X is a docs/decision-only revision draft. It authorizes none of the following;
each remains **blocked** and is **not** unblocked by revising the route-contract
draft:

- route / API handler implementation **beyond the existing Phase 33N spike**;
- production admission;
- durable Admission Wedge storage (ADR-022E gate #8 held);
- DB writes;
- production database migrations;
- auth implementation;
- production auth / consent;
- public `remember-this`;
- Discord command / history ingestion;
- user chat becoming memory;
- Freeside Characters runtime / client integration;
- package exports;
- the final Dixie route contract;
- route-contract freeze;
- route-vector mutation;
- validator mutation;
- production route deployment;
- production readiness of any kind;
- final / production schema freeze;
- LLM / voice;
- Finn production wiring;
- forget / revoke / correction UI;
- final idempotency semantics (Dixie / endpoint-owned; undecided);
- production signer / authority semantics;
- production tenant / estate / actor identity binding.

This gate also explicitly does **not**:

- mutate the Phase 33E probe JSONs, the Phase 33L route-vector JSONs, or either docs
  validator;
- mutate the Phase 33N route handler (`app/src/routes/admission-intake.ts`), the Phase
  33Q ledger module
  (`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`), or any
  spike service module / test;
- flip `route_contract_final`, `idempotency_final`, `identity_binding_final`,
  `authority_binding_final`, `straylight_primitive_review_complete`, or any other
  draft marker in any runtime artifact — the spike markers are inspected **read-only**
  and left `false`;
- change any config, env, package, lockfile, CI, or generated file;
- wire the Phase 33Q ledger into `server.ts` or add any env flag;
- claim that revising the route-contract draft makes production admission ready;
- claim Straylight owns the endpoint idempotency semantics;
- finalize, freeze, or accept the Dixie route contract (acceptance is the separately
  gated Phase 33Y).

> **On scope-expansion.** If a later phase reaches for anything in the blocked list,
> it must re-open the relevant prior gates (Phase 33F readiness, 33G design, 33H
> acceptance, 33I decomposition, 33K precondition design, 33L test-vector draft, 33M
> authorization, 33N spike, 33O acceptance, 33P storage/receipt hardening, 33Q ledger,
> 33R acceptance, 33S decomposition, 33T review request, 33U response intake, 33V
> storage/auth/consent finalization, 33W readiness update, this revision draft) and the
> relevant Straylight decision records (ADR-022E durable-store gate; ADR-026C /
> ADR-026D route guardrails — the recall-intake seam, a different seam from admission)
> first; it must not silently expand scope.

---

## 16. Acceptance criteria and validation

### 16.1 Acceptance criteria for Phase 33X

Phase 33X succeeds if and only if:

1. **Docs/decision-only** — it creates this Phase 33X revision-draft doc and at most
   minimal cross-reference status notes, and changes **no** source, test, route,
   store, migration, auth, consent, validator, probe/fixture/vector JSON, config, env,
   package, lockfile, CI, or generated file.
2. **Source-chain recorded** — it records the 33F→33W chain into this draft and treats
   the Phase 33W readiness update (which carried the 33U reconciliation of Straylight
   PR #65 and the 33V finalization) as the source-of-truth input (§2).
3. **Revision principles carried forward** — it carries the idempotency/id-derivation,
   `RecallDisposition`, `assertion_superseded` re-relation, `public_receipt_ref`,
   ADR-022E-gate-#8-held, and fixture/vector schema-state constraints without inventing
   answers beyond the Straylight response / Phase 33U / Phase 33V / Phase 33W (§3).
4. **Route purpose/non-goals revised** — it restates the route purpose and non-goals
   against the confirmed vocabulary (§4).
5. **Request envelope revised** — it drafts the revised request envelope in prose/table
   form (not executable schema), fixing wedge-primitive vs host-layer ownership,
   session-derived identity, the Dixie-owned idempotency key, and the
   content-addressed-IDs-are-not-idempotency distinction (§5).
6. **Idempotency/replay/conflict revised** — it drafts Dixie-owned endpoint
   idempotency, replay/conflict behaviour, and the not-a-substrate-replay-proof
   distinction, keeping `idempotency_final: false` (§6).
7. **Response envelope revised** — it drafts the public/private split, standardizes on
   `public_receipt_ref`, retires `receipt_public_ref` from the public envelope, splits
   `AuditEvent` + `TransitionReceipt`, and freezes no schema (§7).
8. **Refusal/denial taxonomy revised** — it drafts a public-safe, no-leak taxonomy in
   the two-part namespace, preserving `rejected_candidate` ≠ `denied_transition` (§8).
9. **Recall projection revised** — it states `recall_eligible` is a constrained
   per-request Dixie projection of `RecallDisposition`, never a persisted authority or
   status→boolean rule (§9).
10. **Supersession/correction revised** — it re-relates via `supersedes_refs` +
    `link_assertions`/`assertion_linked`, marks `assertion_superseded` /
    `superseded_by_assertion_id` Dixie-local, and coins no `corrected_active` (§10).
11. **Storage/auth/consent dependencies carried** — it states the Phase 33V
    dependencies precisely without designing/clearing them (§11).
12. **Route-vectors/validators boundary stated** — it states no vector/validator
    mutation, defers any such change to a later lane, and leaves the 33E spelling debt
    and 33L `public_receipt_ref_policy` documented but unchanged (§12).
13. **Readiness table produced** — it tabulates the revised positions, still-blocked
    status, later owner/gate, and why-not-final per route-contract section (§13).
14. **No production-readiness claim** — it does **not** flip any draft marker, does
    **not** claim the revision clears production admission, and does **not** claim
    Straylight owns endpoint idempotency (§1, §15).
15. **Blocked lanes preserved** — it authorizes no production / durable / public /
    Freeside / package / schema-freeze / auth / consent / route-contract-freeze /
    vector-mutation / validator-mutation lane (§15).
16. **Next lane selected** — it selects a docs/decision-only Phase 33Y route-contract
    revision-acceptance / vector-readiness decision gate and explains why finalization,
    vector mutation, and implementation lanes are not selected (§14).
17. **Validators stay green** — the Phase 33E fixture validator and the Phase 33L
    route-vector validator both pass unchanged (§16.2).

### 16.2 Validation requirements

Phase 33X is docs/decision-only; its validation is that it changed **nothing
executable** and that the two docs validators stay green:

- `git status --short --branch --untracked-files=all` shows **only** the new Phase 33X
  revision-draft doc and at most the minimal cross-reference status notes (§16.3) — no
  source, test, validator, probe, fixture, vector, config, env, package, lockfile, CI,
  or generated file;
- `git diff --name-status` and `git diff --stat` confirm any tracked-file edits are
  confined to `docs/` Markdown;
- `git diff --check` is clean (no whitespace errors / conflict markers);
- because the new doc is untracked, a no-index whitespace check confirms it is clean:
  `git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-DRAFT.md || test "$?" = "1"`
  (the `|| test "$?" = "1"` absorbs the expected exit code 1, which signals the file
  *has content* / differs from the empty `/dev/null`, **not** a whitespace defect);
- the Phase 33E fixture validator stays green —
  `node docs/admission-wedge/fixtures/validate-fixtures.mjs` reports **5/5 probes
  valid, 0 failures**;
- the Phase 33L route-contract test-vector validator stays green —
  `node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  reports **5/5 vectors valid, 0 failures, no sixth vector**;
- a **docs-only scope check** confirms no application-code (`src/`, `app/`, `lib/`),
  config, env, or generated path is touched;
- a **markdown fence sanity check** confirms the new doc has no unbalanced code fences;
- nothing is staged or committed by this phase (the branch's commit/merge is a
  separate, explicitly-authorized step).

> The repository package manifests define no Markdown/docs lint script; existing lint
> scripts do not target Markdown, so only diff/whitespace/scope validation and the two
> existing docs validators are applicable to this docs-only decision artifact.

### 16.3 Cross-references

- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-UPDATE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-UPDATE-GATE.md)
  — Phase 33W / PR #141, the route-contract readiness-update gate that rendered the
  readiness verdict (its §5), produced the draft-update checklist this revision
  executes (its §6), tabulated the readiness decisions (its §7), and **selected this
  Phase 33X lane** (its §8). The source-of-truth input to this draft. Read-only here;
  **not modified**.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)
  — Phase 33G draft route-contract design; the draft this revision rewrites (its §4–§5
  purpose/identity, §6 request envelope, §9.1 two-spelling debt, §11 refusal taxonomy,
  §12 idempotency, §15 recall projection, §8.3/§13 supersession refs, §17 Straylight
  dependencies). The **original substantive 33G sections are not rewritten** — the
  revised positions live in this new doc, not in the 33G text — and the only Phase 33X
  change to that file is a minimal status / forward-pointer note (≈13 lines) pointing
  here.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md)
  — Phase 33F route-contract readiness gate; the readiness posture the 33G design
  followed. Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)
  — Phase 33H acceptance gate; its §6 NOT-implementation-ready verdict, §8 blocker
  inventory, and two §3 corrections (two-part namespace; strict per-section validator)
  this revision honours. Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I decomposition gate; its §8/blocker table (A–P) and lane ordering
  (33J→33K→33L→33M→33N) this chain executed. Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V / PR #140 storage/auth/consent design-finalization gate; the §11
  dependency list is carried from its §4/§5 and the §6 route-contract boundary.
  Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U / PR #139 response-intake gate; its §4 A–O reconciliation (rows C, D, E,
  F, G, H, J, N, O) is the upstream of the §3 revision principles. Read-only;
  **not modified**.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md)
  — Phase 33T primitive-review follow-up / cross-repo request; the A–O register the
  Straylight response answered. Read-only; **not modified**.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  / [`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs)
  — the Phase 33L route-contract test vectors and validator; the vectors use
  `public_receipt_ref_policy` (no `receipt_public_ref`); both must stay green and
  unchanged (§12, §16.2). Read-only; **not modified**.
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md)
  / [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the Phase 33E fixture set and validator; both carry the
  `receipt_split.public_receipt_ref` vs `public_response.receipt_public_ref`
  two-spelling reconciliation debt (README `:143-144,313`) and must stay green and
  unchanged (§12, §16.2). Read-only; **not modified**.
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/` (`admitted-assertion-ledger.ts`,
  `classifier.ts`, `public-response.ts`, `no-leak.ts`, `auth-gate.ts`, `index.ts`), and
  `app/src/server.ts` — the Phase 33N spike and Phase 33Q ledger, inspected
  **read-only** to ground the §3/§9/§10 constraints against the concrete synthetic
  shapes (the `recall_eligible` boolean at `admitted-assertion-ledger.ts:101,793,886`,
  the inverse `superseded_by_assertion_id` at `:105`, the `assertion_superseded` label
  at `:123,890`, the public-response builder at `public-response.ts:95`, the guarded
  send path at `admission-intake.ts:247`). **None is modified by this phase**; no draft
  marker is flipped.
- `loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md` — the Straylight
  primitive-review response (PR #65, merged); read **read-only** in the adjacent
  `../loa-straylight` checkout; **not modified.** Its dispositions are the inputs Phase
  33U reconciled, Phase 33V finalized, Phase 33W carried, and this revision's §3 draws
  on.
- `@loa/straylight` — canonical primitive/substrate owner of the assertion lifecycle,
  recall-eligibility, signer/keyring, receipt/audit, and storage-adapter vocabulary.
  The durable estate store is gated by **ADR-022E** (gate #8 held); route guardrails
  by **ADR-026C / ADR-026D** (recall-intake seam only — a different seam from
  admission). **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (**verified merged on GitHub** 2026-06-06) —
  the cross-repo acceptance; its mirror/adapter proof is test-only, not exported, not
  runtime-wired, with no live Dixie call. Handed **no** new authorization by this
  draft. **Not edited by this phase.**
