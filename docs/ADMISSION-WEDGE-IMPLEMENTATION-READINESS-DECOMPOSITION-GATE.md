# Phase 33I — Admission Wedge Implementation-Readiness Decomposition Gate

> **Phase**: 33I
> **Branch context**: `phase-33i-admission-wedge-implementation-readiness-decomposition`
> **Related**: Dixie Phase 33A–33H (loa-dixie); freeside-characters Phases 45E–45J
> **Status**: **docs / decision-only.** No route, route handler, storage, auth,
> consent, probe/validator mutation, fixture JSON, package, lockfile, test, CI,
> runtime, or live integration change.
> **This is a blocker-decomposition / lane-ordering gate, not route
> implementation.** It decomposes the unresolved blockers that Phase 33H
> inventoried into ordered future lanes, decides which lane should run next, and
> defines the evidence that would be required before any route/API handler could
> be implemented. It changes **no** routes, storage, auth, probes, validator,
> runtime behavior, or production schema, and it does **not** freeze a
> final/production schema.

This document follows the Dixie Phase 33H acceptance / implementation-readiness
decision gate
([`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)),
which **accepted** the Phase 33G route-contract design as a bounded docs-only
draft, rendered a **not-implementation-ready** verdict, inventoried fourteen
blockers (§8 A–N), and **selected this Phase 33I decomposition gate** as the next
safe lane (33H §10). Phase 33I executes exactly that charter: it decomposes the
blockers, orders them into lanes, and stops. It designs no envelope, implements
no route, mutates no probe or validator, and authorizes no live behavior or route
spike.

Every assessment below is grounded read-only against the actual Dixie repo (route
seam, refusal vocabulary, auth, storage, probes/validator, ADR references) and the
freeside-characters Phase 45J artifacts; where a claim could not be grounded
inside the read material, it is marked as such.

---

## 1. Phase title and status

- **Phase 33I — Admission Wedge implementation-readiness decomposition gate.**
- Dixie-side **docs / decision-only**.
- Follows Dixie Phase 33H / PR #126 (route-contract acceptance / implementation-
  readiness decision gate).
- This is a **blocker decomposition / lane-ordering gate**, not route-contract
  design and not route implementation.
- It changes **no** routes, storage, auth, consent, probes, validator, runtime
  behavior, source code, configuration, or production schema.
- It does **not** freeze a final/canonical/production schema.
- It does **not** mutate the Phase 33E probe JSONs (`hardening_phase: "33E"`,
  `dixie_admission_wedge_probe_v1`) or the validator. Per the Phase 33D §6
  invariant, any probe/validator mutation requires its own separately-gated phase
  ([`ADMISSION-WEDGE-PROBE-HARDENING-GATE.md:234-242`](ADMISSION-WEDGE-PROBE-HARDENING-GATE.md);
  restated at
  [`ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md:39-41`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md)).
  Phase 33I inspects them read-only.
- It does **not** claim the Phase 33E probes are a production schema, the
  Phase 33G route contract is final, or that Phase 33H made the route
  implementation-ready. None of those is true (§4, §15).

The audience for this document is **future Dixie phases** (the lanes named in §6–§11),
the **Straylight (`@loa/straylight`) primitive/vocabulary owner** (whose review
remains a precondition — §7, §13), and **freeside-characters** as an
interested-but-blocked downstream consumer (§8, §11, §15).

---

## 2. Source chain

This gate sits one rung above the Phase 33H acceptance gate on the Dixie
route-contract ladder. It introduces no new contract material; it decomposes the
blockers Phase 33H inventoried and orders them.

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33A | #118 | Contract response / acceptance gate — accepts the *need* for a contract and draft v0 vocabulary; states the six-clause core invariant and thirteen open route-design questions. Freezes no schema. ([`ADMISSION-WEDGE-CONTRACT-RESPONSE.md:128-147,479-507`](ADMISSION-WEDGE-CONTRACT-RESPONSE.md)) |
| 33B | #119 | Fixture/probe ownership decision — Dixie owns the first canonical fixture/probe proposal; defines the five-scenario minimum set. ([`ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md:63-86,213-259`](ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md)) |
| 33C | #120 | Canonical fixture/probe draft v0 — five synthetic public-safe probe JSONs + dependency-free validator under `docs/admission-wedge/fixtures/`. |
| 33D | #121 | Probe hardening / contract-vocabulary-refinement gate — accepts v0; records hardening topics; decides **not** to mutate probes in 33D (§6 invariant); recommends 33E. |
| 33E | #122 | Probe hardening draft v1 / vocabulary refinement — bumps probes to `dixie_admission_wedge_probe_v1`, adds non-final markers and draft placeholders, hardens the validator; preserves all five scenarios; adds no sixth probe; freezes no schema. |
| 33F | #123 | Route-contract readiness gate — assesses the v1 probes as a mature enough *semantic* foundation to begin a docs-only design phase; names preconditions; selects Phase 33G. |
| 33G | #124 | Route-contract design — proposes (on paper) a route identity, request/response envelopes with a public/private split, an idempotency sketch, an `admission.*` refusal taxonomy, storage/auth/consent preconditions, the Straylight review dependencies, and route-contract test vectors mapped from the five Phase 33E probes. Selects Phase 33H. |
| 33H | #126 | Route-contract acceptance / implementation-readiness decision gate — **accepts** 33G as a bounded docs-only draft (two minor docs-only corrections), renders **NOT implementation-ready**, inventories blockers (§8 A–N), and **selects this Phase 33I decomposition gate**. |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter track `dixie_admission_wedge_probe_v1`, **test-only**; v0 fails closed as `unknown_probe_version`. (`admission-wedge-dixie-probe-adapter.ts:100-108,360-370`) |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded test-only purpose; **recommended Dixie Phase 33F** as the next readiness gate (it did **not** select Phase 33G). Authorizes no live client, no package export, no runtime wiring. |

> **Grounding note on the 45J / PR #177 citation.** Per the Phase 33H grounding
> note, GitHub confirms freeside-characters **PR #177 is MERGED** (merged June 6,
> 2026, merge commit `917b6c04`). The Freeside acceptance-gate / decision-map /
> mirror-README artifacts read here name Phase 45I as PR #176 and reference PRs
> only by number; **no `#177` identifier appears inside those local files**, and
> the local `../freeside-characters` checkout is **stale** (on the PR-head branch,
> not the merge). GitHub's merged state — not the local tree — is authoritative
> for PR status. `Phase 45J / PR #177` is therefore valid source-chain context
> carried from GitHub verification, not from the local docs. (Recorded in
> [`ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md:90-101`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md).)

**Ownership posture carried by the whole chain (unchanged here):** Dixie owns the
HTTP/BFF ingress seam (route, tenant/estate binding, idempotency, refusal mapping,
no-leak projection); **Straylight (`@loa/straylight`) is the canonical
primitive/substrate owner** of the assertion-lifecycle vocabulary; Dixie is a
**non-owning consumer** that mirrors those names rather than coining its own
([`ADMISSION-WEDGE-CONTRACT-RESPONSE.md:410-421`](ADMISSION-WEDGE-CONTRACT-RESPONSE.md));
freeside-characters owns neither and keeps its proof labels local and test-only.

> **Cross-repo phase-numbering caution.** Dixie's 33-series and the
> freeside-characters 45-series are independent labels in separate repositories
> and must not be conflated; Dixie Phase 33A §9 lists cross-repo phase numbering
> as an **open** reconciliation item that no later phase (including 45J) has
> resolved.

---

## 3. Purpose

Phase 33I exists because Phase 33H did three things and deliberately stopped:

- Phase 33H **accepted Phase 33G only as a bounded docs-only route-contract
  design** (with two minor docs-only corrections), explicitly **not** as a final
  contract and **not** as implementation-ready
  ([`ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md:113-167`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)).
- Phase 33H **rendered a NOT-implementation-ready verdict** and inventoried
  fourteen blockers (its §8 A–N) that all block *implementation* but none of
  which blocks a further *docs/decision* phase
  ([`:246-279,320-340`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)).
- Phase 33H **selected a decomposition gate** rather than jumping into any single
  design lane, because the blockers are *many and interdependent* (storage ↔
  idempotency ↔ rollback; auth ↔ consent ↔ identity binding; all ↔ the Straylight
  review) and bundling them risks an over-broad phase
  ([`:377-395`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)).

This gate therefore:

- **decomposes** the Phase 33H blockers into ordered future lanes (§5, §6);
- **decides what should happen before any route/API handler can be implemented**
  (§6, §12);
- **decides the next lane** (§13 — Phase 33J, the Straylight primitive review
  request);
- **does not implement, authorize, or schedule a route spike** — it *defines* the
  acceptance criteria a future spike-authorization gate (33M) would have to meet,
  without authorizing one (§10, §11).

---

## 4. Current implementation-readiness state

> **State: NOT implementation-ready.** Unchanged from the Phase 33H verdict
> ([`ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md:246-279`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)).

As of Phase 33I:

- **No route/API handler is authorized.** No admission route exists in route code.
  Inspecting the route mounts in `app/src/server.ts` shows no `/api/admission`
  mount; the nearest recall-domain analogue remains the existing
  `POST /api/recall/intake` route (mounted `:602-614`, gated on
  `config.recallIntakeEnabled` `:567`). Phase 33I does not add or authorize an
  Admission Wedge route/API handler.
- **No live admission route is authorized.**
- **No storage writes are authorized.** The only recall-side store is the
  in-process, non-durable `BoundedEstateStore` (`server.ts:569-572`) plus an
  in-memory idempotency cache / deny log (`:593-601`); the PostgreSQL governance /
  reputation / fleet stores (`:258-261`) are **not** admission storage and grant
  no write authorization.
- **No auth implementation is authorized.** There is no admission-specific auth;
  the recall seam reuses the existing `/api/*` JWT middleware (`server.ts:396-407`)
  and wallet-equality tenant binding (`recall-intake.ts:342-359`).
- **No live calls are authorized.**
- **No production admission / production storage / production auth-consent is
  authorized.**
- **No final schema is frozen.** Every probe carries `schema_final: false`,
  `canonical_schema: false`, `route_contract: false`, `runtime_enabled: false`,
  `production_admission: false`, `identity_binding_final: false`,
  `synthetic_binding: true`, and `straylight_primitive_review_complete: false`
  (e.g. `docs/admission-wedge/fixtures/accept-candidate-to-admitted-assertion.json:6-16`;
  validator-enforced at `validate-fixtures.mjs:246-272`).

---

## 5. Blocker inventory (decomposed from Phase 33H §8)

Rows **A–N** are carried forward **one-for-one** from the Phase 33H §8 blocker table
([`ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md:320-335`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)),
then **expanded with current evidence and recommended lane assignments**;
Phase 33I **closes none of them** — it orders them. Rows **O–P** are **new
synthesis rows added by this gate**: they are *meta-blockers* (the acceptance bar
and the deployment bar are themselves undefined), distinct from the precondition
blockers A–N, and grounded in the Phase 33G §19 precondition list and Phase 33A
open questions rather than in the 33H A–N table. They are flagged as such so the
provenance is auditable.

"Can proceed with docs-only work?" distinguishes blockers that prevent
*implementation* from blockers that would also prevent a further *docs/decision*
phase. **None blocks a docs-only next step** — which is exactly why the §6/§13 lane
plan is safe.

| Blocker | Current evidence | Why it blocks implementation | Docs-only work OK? | Recommended lane type |
|---------|------------------|------------------------------|--------------------|------------------------|
| **A. Storage write model** | No admission write path/schema exists; only in-process non-durable `BoundedEstateStore` (`server.ts:569-572`); PG stores are governance/reputation/fleet, not admission (`server.ts:258-261`). | A live route would have nowhere safe to write candidate / transition / assertion / receipt / supersession records. | Yes | Storage/auth/consent design (33K) |
| **B. Service authentication** | No admission auth; recall reuses `/api/*` JWT middleware (`server.ts:396-407`). | A live route would be unauthenticated or ad-hoc. | Yes | Storage/auth/consent design (33K) |
| **C. End-user authorization/consent (or explicit dev-only scope)** | No consent primitive in config/middleware; service auth ≠ consent (`ADMISSION-WEDGE-CONTRACT-RESPONSE.md:295-311`; 32F §7 `phase-32f-recall-wedge-readiness-checkpoint.md:192-212`). | Admission is a write path; cross-user admission must stay blocked without a consent model. | Yes | Storage/auth/consent design (33K); hinge to spike-auth (33M) |
| **D. Straylight primitive review** | `straylight_primitive_review: "required_before_route_design"`, `straylight_primitive_review_complete: false` on every probe (`accept-…json:15-16`; enforced `validate-fixtures.mjs:265-272`); no completed-review artifact exists. | Canonical status/transition/signer/recall-eligibility/receipt vocabulary is Straylight-owned and unreviewed for admission. | Yes (a docs gate may **request** it, never perform it) | Straylight primitive review request (33J) |
| **E. Idempotency finalization** | `idempotency_final: false`; placeholders `idempotency_key_draft` / `idempotency_scope_draft` (`accept-…json:64-68`); keying undecided (`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md:472-496`). | A replayed admission must not double-write/double-mint; keying (candidate-id vs header vs both) is undecided. | Yes | Straylight review (33J, semantics) + storage/auth/consent (33K, wire) |
| **F. Signer/authority finalization** | `authority_binding_final: false`; `authority_signer_type_draft: "policy_service"` (`accept-…json:75-77`); field names draft. | Field names + binding are draft, not production auth. | Yes | Straylight review (33J, vocabulary) + storage/auth/consent (33K, wire) |
| **G. Tenant/estate/actor identity binding** | `identity_binding_final: false`, `synthetic_binding: true`; synthetic-only fixture IDs (`validate-fixtures.mjs:276-286`). | Production binding undefined; must be session-derived (no caller override). | Yes | Storage/auth/consent design (33K) + Straylight review (33J) |
| **H. Public/private audit boundary** | Probe-shape no-leak is deep-walked over authored `public_response` only (`validate-fixtures.mjs:199-240,488`); no runtime serializer / audit boundary exists. | A live serializer + audit boundary are undesigned. | Yes | Storage/auth/consent design (33K) |
| **I. Refusal/error taxonomy finalization** | Zero `admission.*` members in source (`refusal-mapping.ts:10-33` is `ingress.*`×6 + `guard.*`×2 + `seam.*`×12); the `admission.*` family is draft-only (`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md:441-468`). | Names, HTTP status mappings, and public/private split are undecided; must be grounded in the **two-part** `category.specific_reason` namespace and **not** silently inherit recall's `seam.*` codes. | Yes | Storage/auth/consent design (33K) + route test vectors (33L) |
| **J. Rollback / partial-failure behavior** | None designed (`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md:319-322,738-743`). | A multi-step admission write needs defined rollback. | Yes | Storage/auth/consent design (33K) |
| **K. Migration / backward compatibility** | Probes are not a frozen schema; no versioning/compat plan exists. v0 already fails closed downstream as `unknown_probe_version`. | Any future storage/contract schema needs a versioning/compat plan. | Yes | Storage/auth/consent design (33K) |
| **L. Operational logging / no-leak policy** | Undefined at runtime; the validator does **not** prove runtime leak safety (it checks authored fixtures only, never `input`/`audit`). | Runtime logging could leak private material the probe checks don't cover. | Yes | Storage/auth/consent design (33K) |
| **M. Freeside Characters client contract** | Freeside adapter is test-only, not exported, not runtime-wired (`admission-wedge-dixie-probe-adapter.test.ts:895-984`); 45J Option C "live admission client" is **Blocked**. | A downstream client cannot rely on an unaccepted, reconciliation-bound contract. | Yes | Freeside client gate (post-acceptance; lowest implementation urgency) |
| **N. Executable route test plan** | The §16 33G vectors are paper-only (`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md:581-584`); no executable/negative/no-leak tests exist. | No executable contract tests exist for any handler. | Yes (a fixture/vector **draft** is docs/test-only) | Route test-vector fixture draft (33L) |
| **O. Route implementation acceptance criteria** *(new synthesis row)* | Undefined. 33G §19 lists implementation preconditions (`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md:724-743`) but no "what counts as an acceptable handler" bar exists. | Without an explicit acceptance bar, a future handler could be merged without proving it meets the contract, no-leak, idempotency, and rollback requirements. | Yes | Dev/operator-only spike authorization gate (33M) defines the bar; never implementation |
| **P. Production readiness / deployment criteria** *(new synthesis row)* | Undefined. 33A §9.12 (rollout mode) and the still-blocked list (32F §5 `phase-32f-recall-wedge-readiness-checkpoint.md:132-157`) confirm production rollout is unscoped. | Production admission needs deployment/rollback/kill-switch/consent/rollout criteria that do not yet exist. | Yes | A future production-readiness gate (after 33J–33N or their replacements); never in 33I |

> Every blocker above blocks **implementation**; **none** blocks a further
> **docs/decision** phase. The §4 verdict follows directly: the blockers are
> numerous and unresolved, but all are addressable in docs/decision lanes before
> any build.

---

## 6. Dependency ordering

The Phase 33H §10 interdependency analysis
([`ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md:377-380`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md))
names three coupled clusters: **storage ↔ idempotency ↔ rollback** (blockers
A↔E↔J), **auth ↔ consent ↔ identity binding** (blockers B↔C↔G), and **all ↔ the
Straylight review** (blocker D upstream of everything). The ordering below is a
**recommendation derived from those clusters**, not an inherited fact: Phase 33H
does **not** state that any lane is a hard prerequisite that blocks another from
*starting* — only that the Straylight review (D) is the single "prerequisite"-
tagged candidate and sits upstream.

| Order | Lane | Phase | Classification |
|-------|------|-------|----------------|
| 1 | Straylight primitive review / vocabulary dependency resolution | **33J** | **Selected next (§13)** |
| 2 | Storage/auth/consent precondition design | **33K** | May run in parallel with 33J as a draft-vocabulary-dependent design (see note) |
| 3 | Route-contract test-vector fixture draft | **33L** | Docs/non-runtime fixture-only |
| 4 | Dev/operator-only route spike **authorization** gate | **33M** | Decision-only; authorizes nothing in 33I |
| 5 | Dev/operator-only route spike **implementation** | **33N** | **Not authorized** by 33I |
| 6 | Freeside Characters live client gate | — | Blocked until a Dixie contract is accepted |
| 7 | Public / user-facing admission UX gate | — | Blocked |
| 8 | Production readiness gate | — | Blocked |

> **Why 33J first, and the caveat.** Storage/auth/consent (33K) record design
> depends on whether identity binding, idempotency, receipt/audit, recall
> eligibility, and transition vocabulary are *canonical (Straylight-owned)* or
> *app-local draft*. Blocker F is explicitly jointly owned "Straylight
> (vocabulary) + Dixie (wire)" (`:327`), and blocker A's recommended action is to
> design records whose names (`(superseded, active)` relation vs status; bare
> `admitted` status; receipt/audit split) are **open Straylight questions** (§7).
> Designing storage records against draft vocabulary risks rework. **Caveat:**
> Phase 33H does **not** establish that 33K *cannot begin* before 33J completes.
> The honest framing is: issue the 33J review request first (it is the
> "prerequisite"-tagged, cheapest docs-only action), and 33K **may** proceed in
> parallel as a draft-vocabulary-dependent design that consumes the review's
> answers as **exit criteria**. This gate does not force a serial chain.

For each ordered lane:

### Lane 1 — Straylight primitive review (33J)
- **Goal:** resolve or explicitly defer the canonical-vocabulary dependencies.
- **Why it must precede implementation:** the status/transition/signer/recall-
  eligibility/receipt vocabulary is Straylight-owned; storage/auth records and the
  refusal taxonomy cannot be finalized against draft names.
- **Allowed scope:** docs/decision review request; vocabulary matrix; open-question
  register; cross-repo handoff to Straylight.
- **Blocked scope:** route implementation, storage/auth implementation, live calls,
  final schema freeze (unless separately authorized).
- **Required evidence to exit:** a Straylight review response (or an explicit,
  governance-recorded deferral) for each §7 question.

### Lane 2 — Storage/auth/consent precondition design (33K)
- **Goal:** design the storage write model, service-auth model, and consent (or
  explicit dev-only) model on paper.
- **Why it must precede implementation:** blockers A/B/C/G/H/J/K/L most directly
  gate a live route; a handler with no storage/auth/consent design is unbuildable.
- **Allowed scope:** docs-only storage/auth/consent requirement inventory and
  record-shape design.
- **Blocked scope:** migrations, storage writes, auth code, a live route.
- **Required evidence to exit:** documented record shapes, an auth model, and a
  consent-or-dev-only decision, all consistent with the 33J review answers.

### Lane 3 — Route-contract test-vector fixture draft (33L)
- **Goal:** convert the 33G §16 paper vectors into non-runtime test vectors.
- **Why it must precede implementation:** executable acceptance tests cannot exist
  without a vector source; blocker N.
- **Allowed scope:** docs fixtures or non-runtime JSON vectors; a docs-bound,
  non-runtime validator extension.
- **Blocked scope:** route/API handler, app route tests (unless separately
  authorized), storage writes, live calls, runtime integration.
- **Required evidence to exit:** a complete set of non-runtime vectors covering the
  five scenarios plus negative / no-leak cases.

### Lane 4 — Dev/operator-only route spike authorization gate (33M)
- **Goal:** decide whether enough evidence exists for a narrow dev/operator spike,
  and define the acceptance criteria (without authorizing one in 33I).
- **Why it must precede implementation:** a spike must not be built before its
  preconditions and acceptance bar (blocker O) are defined.
- **Allowed scope:** authorize or reject a *future* spike; define spike boundaries.
- **Blocked scope:** any implementation.
- **Required evidence to exit:** the §10 evidence set present (review resolved-or-
  deferred, storage/auth/consent design, test vectors, no-leak policy, idempotency
  draft, rollback plan, dev-only scope + kill switch).

### Lane 5 — Dev/operator-only route spike implementation (33N)
- **Goal:** (future, separately gated) build a narrow dev/operator-only spike.
- **Why it must precede implementation:** n/a — **not authorized here** (§11).
- **Allowed scope (future only):** none authorized by 33I.
- **Blocked scope:** everything, until 33J/33K/33L/33M (or replacements) complete.
- **Required evidence to exit:** an explicit, separate authorization gate.

### Lane 6 — Freeside Characters live client gate
- **Goal:** define what a downstream client may rely on once a Dixie contract is
  accepted.
- **Why it must precede implementation:** blocker M — clients cannot bind to an
  unaccepted, reconciliation-bound contract.
- **Allowed scope (future):** docs-only client-contract definition.
- **Blocked scope:** Freeside runtime/package changes; a live client; Discord
  command. (45J Option C is **Blocked**.)
- **Required evidence to exit:** an accepted Dixie route contract + reconciled
  vocabulary.

### Lane 7 — Public / user-facing admission UX gate
- **Goal:** (far future) decide any user-facing admission surface.
- **Why it must precede implementation:** consent, rollout, and abuse controls are
  undefined.
- **Allowed scope (future):** docs-only.
- **Blocked scope:** public `remember-this`, Discord ingestion, chat-to-memory.
- **Required evidence to exit:** a production consent model + rollout policy.

### Lane 8 — Production readiness gate
- **Goal:** (far future) define production deployment/rollback/kill-switch criteria
  (blocker P).
- **Why it must precede implementation:** production admission has no readiness bar.
- **Allowed scope (future):** docs-only.
- **Blocked scope:** production admission/storage/auth/consent; deployment.
- **Required evidence to exit:** a complete production-readiness checklist.

---

## 7. Straylight primitive review lane — Phase 33J

> **Phase 33J — Admission Wedge Straylight primitive review request / vocabulary
> dependency gate. Docs / decision-only.**

**Purpose:** resolve or explicitly defer the primitive-vocabulary dependencies
before any route design is finalized or any storage/auth contract is built.
Phase 33J **requests** the review; it does **not** perform it, and it must **not**
claim the review is complete
([`ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md:325`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md);
[`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md:670-677,701`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)).

**Questions the review must resolve or explicitly defer** (the ten dependencies
the Phase 33G design enumerated at `ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md:678-701`;
the Phase 33F readiness gate enumerates the same set as eleven questions by
splitting the corrected-active relation and the receipt relationship into separate
items — `ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md:228-272`):

1. **Candidate / proposed state vocabulary** — confirm canonical `proposed`
   (distinct from any Freeside-local `candidate_pending`).
2. **Admitted assertion lifecycle vocabulary** — confirm canonical `active`; no
   bare `admitted` status (`admitted` is a public *outcome* label only).
3. **Admission transition vocabulary** — confirm `admit_assertion` + audit events
   `assertion_admitted` / `transition_denied`.
4. **Supersession / correction relation** — confirm `(superseded, active)` is a
   relation/direction, **not** a coined `corrected_active` status.
5. **Recall eligibility representation** — reconcile against the canonical
   `RecallUseInstruction` set and Recall Wedge semantics. (The 33F gate names a
   four-member canonical band — `usable`, `mark_as_contested`,
   `use_as_background_only`, `do_not_use_for_action` — while the fixtures
   instantiate only `usable` and `do_not_use_for_action`; the gap is itself a
   reconciliation item.)
6. **Authority / signer vocabulary** — `authority_*_draft` field names and binding
   are draft and **not** production auth (`policy_service` is a canonical
   `SignerType` member; field names/binding remain draft).
7. **Tenant / estate / actor binding vocabulary** — synthetic-only today
   (`identity_binding_final: false`); production binding undefined.
8. **Receipt / audit relationship** — reconcile the `public_receipt_ref`
   (`receipt_split`) vs `receipt_public_ref` (`public_response`) two-spelling debt
   (the validator is **strict per-section** and cross-checks equality at
   `validate-fixtures.mjs:324`) and the public-receipt-vs-audit-receipt split.
9. **Fail-closed semantics** — confirm what fail-closed means in canonical
   primitive terms vs the Dixie-local refusal family the probes reuse.
10. **Idempotency semantics** — canonical idempotency for admission transitions
    (`idempotency_final: false`; candidate-id vs header vs both undecided).

**Allowed:** docs/decision review request; vocabulary matrix; open-question
register; cross-repo handoff to Straylight. **No runtime changes.**

**Blocked:** route implementation; storage/auth implementation; live calls; final
schema freeze (unless separately authorized).

---

## 8. Storage/auth/consent design lane — Phase 33K

> **Phase 33K — Admission Wedge storage/auth/consent precondition design gate.
> Docs / decision-only.**

**Purpose:** design the preconditions required before any live route or route
spike (blockers A/B/C/G/H/J/K/L).

**Includes:**

- a **candidate record / transition record / admitted-assertion record /
  receipt-audit record model**, plus the supersession relation
  (`supersedes_assertion_id` / `superseded_by_assertion_id`)
  (`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md:501-511`);
- **existing PostgreSQL-backed infrastructure acknowledged but not assumed
  sufficient** — the `dbPool`, migrations, and reputation/governance stores exist
  (`server.ts:258-261`) but are **not** admission storage and grant no admission
  write authorization; a durable estate store is gated by ADR-022E (held);
- a **service authentication model** (how a calling service authenticates to an
  admission route);
- an **end-user authorization/consent model OR an explicit dev/operator-only
  omission** — service auth ≠ consent is load-bearing
  (`ADMISSION-WEDGE-CONTRACT-RESPONSE.md:295-311`; 32F §7
  `phase-32f-recall-wedge-readiness-checkpoint.md:192-212`);
- **tenant/estate/actor binding** and the caller-vs-subject relationship
  (`caller_actor_id` vs `subject_actor_id`); session-derived, no caller override
  (cf. recall's `ingress.cross_tenant_body_mismatch` at `recall-intake.ts:342-359`);
- **secrets / no-leak posture** — `service_auth_context` is a reference/handle,
  never a raw secret; the runtime no-leak/audit boundary (blocker H/L);
- **dev/prod scoping** — whether admission gets its own config gate (analogous to
  `recallIntakeEnabled` at `config.ts:74-75,283-294`).

**Allowed:** docs-only design; storage/auth/consent requirement inventory.
**No implementation.**

**Blocked:** migrations; storage writes; auth code; a live route.

---

## 9. Route test-vector fixture lane — Phase 33L

> **Phase 33L — Admission Wedge route-contract test-vector fixture draft.
> Docs / non-runtime fixture-only.**

**Purpose:** convert the Phase 33G design vectors
(`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md:586-664`, vectors A–E mapped from the
five Phase 33E probes) into non-runtime test vectors before implementation
(blocker N). The five `scenario_id`s are frozen-by-count
(`validate-fixtures.mjs:49-57`); a future lane must not rename, split, or remove
them. The bounded-scope template is Phase 33B §11 ("isolated, non-runtime, no live
route" — `ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md:403-432`).

**Allowed:** docs fixtures or non-runtime JSON vectors; a validator extension **if
non-runtime and docs-bound** (the existing validator deep-walks authored
`public_response` only — `validate-fixtures.mjs:199-240,488` — and imports nothing
from the app); no app route tests yet unless separately authorized.

**Blocked:** route/API handler; storage writes; live calls; runtime integration.

---

## 10. Dev/operator-only route spike authorization gate — Phase 33M

> **Phase 33M — Admission Wedge dev/operator-only route spike authorization gate.
> Docs / decision-only.**

**Purpose:** decide whether enough evidence exists for a narrow dev/operator-only
route spike, and **define its acceptance criteria** — **without implementing** one.
Phase 33M is a *future* docs/decision **authorization** gate that **may authorize
or reject** a later dev/operator-only spike, but **must not implement** it (the
spike itself, if authorized, belongs to Phase 33N). **Phase 33I does not authorize
a route spike, and does not authorize route implementation**; it only defines the
acceptance bar a future 33M would have to meet. (Phase 33H §9 Option B was
"premature; not selected"; Phase 33I does **not** upgrade it to authorized —
[`ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md:349`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md).)

**A future 33M authorization must require evidence from:**

- the **Straylight primitive review** (33J) resolved **or** explicitly deferred;
- the **storage/auth/consent design** (33K);
- the **route test vectors** (33L);
- a **no-leak public/private response policy** (runtime, not just probe-shape);
- an **idempotency draft** (keying strategy decided enough to spike);
- a **rollback / partial-failure plan**;
- an explicit **dev/operator-only scope and kill switch** — modelled on the Recall
  dev-seed precedent (default-off, dev/operator-only, synthetic tenant only,
  non-durable, stores no secrets, ingests no user input — `server.ts:574-592`,
  `dev-seeded-estate.ts:14-27`) and the `recallIntakeEnabled` config-gate pattern.
  *(These are grounded analogues, not an authorization.)*
- **no production admission claim**.

**Allowed:** authorize or reject a *future* spike; define spike boundaries.

**Blocked:** implementation in this phase.

---

## 11. Dev/operator-only route spike implementation lane — Phase 33N

> **Phase 33N — possible dev/operator-only Admission Wedge route spike.**
> *Named for ordering only; not designed or scoped here.*

**State:**

- **Not authorized by Phase 33I.**
- Could only be considered after Phase 33J / 33K / 33L / 33M (or their
  replacements) complete and a separate authorization gate (33M) explicitly
  authorizes it.
- Must be **disabled by default**.
- Must be **dev/operator-only**.
- Must **not** be production admission.
- Must **not** be a public `remember-this`.
- Must **not** be Freeside runtime/client integration.
- Must **not** be public.
- Must **not** make candidate chat into memory automatically.

Phase 33I defines no 33N scope content beyond these prohibitions; the actual
spike design belongs to a future, separately-gated phase.

---

## 12. Evidence required before any route handler implementation

This checklist defines **what evidence would be required before any route/API
handler could be implemented** (the 33H §10/§11 charter). Items trace to the
Phase 33G §19 precondition list
([`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md:724-743`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)),
the Phase 33H §8 blocker table, and the probe `*_final: false` flags. **No
readiness-enabling implementation item is complete today**: no evidence item that
would *enable* route-handler implementation is satisfied. The prohibition rows (N
public-rollout prohibition, O Freeside-client non-authorization) are themselves
**satisfied guardrails** — they are *in force* precisely because they remain
prohibited, and neither enables implementation.

| # | Evidence required | Source / future phase expected | Required before dev-only spike? | Required before production? | Current status |
|---|-------------------|--------------------------------|---------------------------------|------------------------------|----------------|
| A | Accepted route contract | A future acceptance gate above 33G | Yes — a future accepted implementation/spike contract is required. Phase 33H accepted only a bounded draft design, not implementation contract readiness | Yes | **Absent** — 33G is a draft design, not accepted/final |
| B | Primitive review completed **or** explicitly deferred | Phase 33J | Yes | Yes | **Absent** — `straylight_primitive_review_complete: false` |
| C | Storage model | Phase 33K | Yes | Yes | **Absent** — only non-durable `BoundedEstateStore` |
| D | Service auth model | Phase 33K | Yes | Yes | **Absent** — no admission auth |
| E | End-user auth/consent **or** dev-only scope | Phase 33K / 33M | Yes (dev-only scope must be explicit) | Yes (real consent) | **Absent** |
| F | Idempotency semantics | Phase 33J (canonical) + 33K (wire) | Yes (draft sufficient) | Yes (final) | **Draft** — `idempotency_final: false` |
| G | No-leak public/private boundary (runtime) | Phase 33K | Yes | Yes | **Partial** — probe-shape only; no runtime serializer |
| H | Route test vectors | Phase 33L | Yes | Yes | **Paper-only** — 33G §16 vectors are non-executable |
| I | Runtime tests plan | A future implementation phase | Yes (must be defined before build) | Yes | **Absent** |
| J | Rollback / failure plan | Phase 33K | Yes | Yes | **Absent** |
| K | Operational logging policy (no-leak at runtime) | Phase 33K | Yes | Yes | **Absent** |
| L | Migration / backcompat plan | Phase 33K | No (if spike is non-durable) | Yes | **Absent** |
| M | Kill switch / env gates | Phase 33M (spike) | Yes | Yes | **Absent** |
| N | Public rollout prohibition | This gate + 33M/33N boundaries | Yes (must stay prohibited) | N/A (a separate public-UX gate would lift it) | **Satisfied guardrail** — public rollout prohibition is in force; does not enable implementation |
| O | Freeside client contract **not** authorized | Blocker M / 45J Option C (Blocked) | Yes (must stay unauthorized) | A separate Freeside gate | **Satisfied prohibition** — Freeside client contract is not authorized (adapter is test-only, not exported); does not enable implementation |

---

## 13. Decision: next lane

> **Selected: Phase 33J — Admission Wedge Straylight primitive review request /
> vocabulary dependency gate (docs / decision-only).**

**Reason:**

- Storage/auth/consent design (33K) depends on whether identity binding,
  idempotency, receipt/audit, recall eligibility, and transition vocabulary are
  *canonical (Straylight-owned)* or *app-local draft*. Designing storage records
  and the refusal taxonomy against draft names risks rework.
- Phase 33H ranks the Straylight primitive review (its Option D) as both a "strong
  candidate" **and** the only "prerequisite"-tagged blocker, sitting upstream of
  every other cluster ("all ↔ the Straylight review")
  ([`ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md:351,377-380`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)).
- A primitive-review **request** is docs/decision-only and "does not block a
  docs-only next step" (`:325`) — so 33J-first carries no scheduling penalty and
  reduces ambiguity before any storage/auth design is finalized.
- Route implementation is still far too early (§4).

**Caveat (surfaced, not suppressed):** Phase 33H does **not** establish that
storage/auth/consent design (33K) is *blocked from starting* until the review
returns. 33K **may** proceed in parallel as a draft-vocabulary-dependent design
that treats the review's answers as **exit criteria**. Selecting 33J as the next
lane means it is the *first* and *prerequisite-tagged* action, not that 33K is
frozen behind it.

**Alternative (if a reviewer judges storage/auth more urgent):** If
storage/auth/consent is judged more urgent, **Phase 33K may be advanced first or
run in parallel**, with the primitive-review answers treated as exit criteria;
**Phase 33J remains the Straylight primitive-review lane**. Do **not** rename the
storage/auth lane as 33J. This gate does **not** select that alternative, but
records it as the documented alternative per 33H §10.

**Route implementation and a route spike are not selected under any option.**

---

## 14. Future Phase 33J boundaries

Because §13 selects the **Straylight primitive review request**, Phase 33J is
bounded as:

**Allowed**

- docs / decision-only;
- create a review request / dependency matrix;
- identify vocabulary ownership and open questions;
- map the Phase 33G design terms to Straylight / Recall Wedge primitives;
- decide which terms can remain Dixie-local draft vocabulary;
- decide what must be reviewed before implementation.

**Blocked**

- route / API handler implementation;
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

## 15. What remains blocked now

Phase 33I is a decomposition / lane-ordering gate. It authorizes none of the
following; each remains blocked:

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
- a final route contract (33G remains a *draft design*);
- route implementation readiness;
- route spike authorization.

If a later phase reaches for any of the above, it must re-open the Phase 33E probe
artifacts, the Phase 33F readiness gate, the Phase 33G design (as corrected by
33H), the Phase 33H acceptance gate, this decomposition gate, and the relevant
ADRs (ADR-022E durable-store gate; ADR-026C / ADR-026D route guardrails — Straylight-
repo decision records at `loa-straylight/docs/decisions/`) first; it must not
silently expand scope.

---

## 16. Success criteria for Phase 33I

This phase succeeds if:

- it **decomposes the blockers** from Phase 33H into ordered lanes (§5, §6);
- it **selects the next safe lane** (§13 — Phase 33J);
- it **defines the evidence required** before any route handler implementation
  (§12);
- it keeps the **route spike and implementation un-authorized** (§10, §11);
- it does **not** mutate code / fixtures / probes / validator;
- it keeps all live / runtime / implementation lanes blocked (§15);
- Codex confirms the docs / decision-only scope.

---

## 17. Cross-references

> **Phase 33J status note (added later).** Phase 33J
> ([`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md))
> is the **docs/decision-only Straylight primitive-review request / vocabulary
> dependency gate** this gate selected as the next lane (§6 Lane 1, §7, §13). It
> reads the probes and validator **read-only** — it mutates **no** probe JSON and
> does **not** change the validator. It builds a fifteen-item review register, a
> primitive dependency matrix, and a term-ownership classification grounded
> read-only against Straylight (`@loa/straylight`) primitive sources, drafts a
> reusable cross-repo handoff to the Straylight primitive owner, and selects
> **Phase 33K (storage/auth/consent precondition design)** as the next lane — with
> the unresolved Straylight review answers treated as explicit exit criteria. It
> **confirms no completed Straylight Admission-Wedge primitive-review artifact
> exists**, keeps the review **required and not complete**, and authorizes no
> route, route spike, storage, auth, consent, live behavior, or schema freeze.

> **Phase 33P status note (added later).** Phase 33P
> ([`docs/ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md))
> is the **docs/decision-only storage / receipt hardening decision gate** that runs
> after the lanes this gate ordered have executed (33J → 33K → 33L → 33M → 33N) and
> the Phase 33O acceptance gate. It reads this decomposition gate's §5 blocker
> matrix **read-only** — in particular storage blocker A (no admission write path
> exists; only the in-process non-durable `BoundedEstateStore`; the PostgreSQL
> stores are governance/reputation/fleet, not admission) grounds its §5 "why
> storage/receipt hardening is the next bottleneck". It **selects Option B** —
> authorizing a *possible future* Phase 33Q dev-only, disabled-by-default,
> non-production, **bounded synthetic** admitted-assertion store — and **rejects
> production-like durable storage**. It mutates **no** probe JSON and **no**
> validator, **implements no storage, migration, auth, or consent**, keeps the
> Straylight primitive review (A–O) **unresolved** and the held ADR-022E
> durable-store gate **in force**, freezes **no** schema, and keeps every live /
> runtime / implementation lane **blocked**.

> **Phase 33S status note (added later).** Phase 33S
> ([`docs/ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md))
> is the **second decomposition gate** on the Admission Wedge ladder and the
> structural successor to this one: where Phase 33I decomposed the Phase 33H
> blockers into the 33J→33N lanes (now executed), Phase 33S decomposes the *decision*
> the Phase 33R bounded-ledger acceptance gate deferred to it (its §9 Options A–F),
> after the route surface (33N/33O) and the synthetic stateful effect (33Q/33R) were
> both accepted. It reads this gate's blocker/lane structure **read-only**, mutates
> **no** probe / validator / fixture / vector / source, and **selects Option D** — a
> Straylight primitive-review follow-up / consolidated cross-repo review handoff
> (provisional Phase 33T) that re-issues/advances the §7 / 33J A–O review register
> (rows E, G, H, K, N, O and review-dependent J), the **highest-leverage vocabulary
> prerequisite** — the upstream gate whose resolution most clarifies the downstream
> design, **not** the only production gate (the ADR-022E durable store / production
> storage architecture, production auth/consent, and final route-contract acceptance
> remain independent, unresolved production gates; resolving the Straylight review
> alone does **not** make production admission ready). It **rejects** the other
> options (recording E as the documented D→E follow-on), selects **no** production
> rollout, freezes **no** schema, completes **no** Straylight review, and keeps every
> implementation lane **blocked**.

> **Phase 33T status note (added later).** Phase 33T
> ([`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md))
> is the **docs/decision-only Straylight primitive-review follow-up** the Phase 33S
> decomposition gate (the structural successor to this gate) selected as Option D. It
> advances the **same** Straylight primitive review (this gate's §5 prerequisite
> blocker — "all ↔ the Straylight review") that Phase 33J first requested abstractly,
> now grounded in the **concrete** Phase 33N route surface and Phase 33Q ledger: it
> re-issues the genuinely-unresolved rows (E, G, H, K, N, O) and the review-dependent
> row (J), separates Straylight-owned primitive vocabulary from the Dixie-owned
> endpoint route contract (endpoint idempotency is **Dixie-owned**) and Freeside-owned
> client integration, defines the expected Straylight response shape, and selects
> **Phase 33U** (review-response intake / lane-decision gate). It mutates **no** probe
> / validator / fixture / vector / source, **completes no** Straylight review, claims
> **neither** that the review alone makes production admission ready **nor** that
> Straylight owns endpoint idempotency, freezes **no** schema, and keeps every
> implementation lane **blocked**.

> **Phase 33U status note (added later).** Phase 33U
> ([`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md))
> **closes the cross-repo round-trip** on this gate's §5 prerequisite blocker ("all ↔
> the Straylight review"): Straylight answered the Phase 33T review request in
> **`loa-straylight` PR #65 (merged)**, and Phase 33U intakes that response and
> reconciles the A–O dispositions using **only** Straylight's verdicts (A, B, D, I, L,
> M, N accepted; C accepted except `assertion_superseded` **rejected / re-related**
> Dixie-locally; E/G/H/J/K delegated-to-Dixie projections with **endpoint idempotency
> Dixie-owned**; F/G production semantics, J final endpoint keying, and O durable
> store under **ADR-022E gate #8** still held). The vocabulary prerequisite is now
> *answered by Straylight*, but the **independent** production gates this decomposition
> identified (durable store, production auth/consent, final route contract, identity
> binding) remain **held** — resolving the review alone does **not** make production
> admission ready. Phase 33U selects **Phase 33V** (the documented D→E
> storage/auth/consent design-finalization follow-on; docs/decision-only), flips **no**
> runtime marker, mutates **no** probe / validator / fixture / vector / source, and
> keeps every implementation lane **blocked**.

- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)
  — Phase 33H acceptance gate whose §8 blocker table (A–N) this gate decomposes
  and whose §10 selected this decomposition lane. Gains a minimal 33I status note.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)
  — Phase 33G draft route-contract design; its §19 preconditions seed §12, and its
  §17 Straylight dependencies seed §7.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md)
  — Phase 33F readiness gate; its eleven-question Straylight-review enumeration
  corroborates §7.
- [`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](ADMISSION-WEDGE-PROBE-HARDENING-GATE.md)
  — Phase 33D hardening-decision gate + Phase 33E status note; the §6
  separately-gated-mutation invariant this gate honours.
- [`docs/ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md`](ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md)
  — Phase 33B Dixie-first ownership decision, five-scenario minimum set, and the
  "isolated, non-runtime" fixture-lane template that bounds §9.
- [`docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md`](ADMISSION-WEDGE-CONTRACT-RESPONSE.md)
  — Phase 33A contract response, six-clause core invariant, thirteen open
  route-design questions (the source for synthesis-row blockers O/P), and the
  service-auth-≠-consent boundary.
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md)
  — the draft v1 probe set, vocabulary table, and no-leak rules. Gains a minimal
  33I status note.
- [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the dependency-free, non-runtime validator (read-only; not modified). Its
  strict per-section receipt-spelling enforcement (`:321-335`, `:324`) grounds §7
  question 8.
- [`docs/integration/phase-32e-recall-wedge-route-contract.md`](integration/phase-32e-recall-wedge-route-contract.md)
  and
  [`docs/integration/phase-32f-recall-wedge-readiness-checkpoint.md`](integration/phase-32f-recall-wedge-readiness-checkpoint.md)
  — the Recall Wedge route contract and readiness checkpoint these gates are
  modelled on; `POST /api/recall/intake` is the seam the Admission route must stay
  distinct from, and 32F §7 is the service-auth-vs-end-user-authorization boundary.
- `app/src/routes/recall-intake.ts`,
  `app/src/services/straylight-recall-intake/refusal-mapping.ts`,
  `app/src/config.ts`, `app/src/server.ts` — inspected **read-only** to ground the
  route seam (`POST /api/recall/intake`, mounted `server.ts:602-614`, gated on
  `config.recallIntakeEnabled` `:567`), the **two-part** refusal namespace
  (`refusal-mapping.ts:10-33`, with **zero** `admission.*` members), `dev_signature`
  as an inert enum member (`recall-intake.ts:95-100`, not a backdoor), and the
  storage reality (PostgreSQL governance stores are **not** admission storage;
  `BoundedEstateStore` is in-process/non-durable). None is modified.
- `@loa/straylight` — canonical primitive/substrate owner of the assertion
  lifecycle and vocabulary. **No Straylight primitive review has been performed**
  (33G §17). ADR-022E (gate #8 held), ADR-026C, ADR-026D are Straylight-repo
  decision records cited by the Dixie chain as guardrails; the IDs are real, not
  fabricated.
- freeside-characters `docs/ADMISSION-WEDGE-DIXIE-V1-MIRROR-REFRESH-ACCEPTANCE-GATE.md`
  (Phase 45J / PR #177, **verified merged on GitHub** June 6, 2026 — the local
  checkout is stale and not authoritative for PR status) — the cross-repo
  acceptance that **recommended Dixie Phase 33F** (not 33G); its mirror/adapter
  proof remains **test-only**, not exported, wired to no runtime path
  (`admission-wedge-dixie-probe-adapter.test.ts:895-984`).
