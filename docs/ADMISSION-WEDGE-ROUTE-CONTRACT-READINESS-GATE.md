# Phase 33F — Admission Wedge Route-Contract Readiness Gate

> **Phase**: 33F
> **Branch context**: `phase-33f-admission-wedge-route-contract-readiness`
> **Related**: Dixie Phase 33A–33E (loa-dixie); freeside-characters Phases 45E–45J
> **Status**: **docs / decision-only readiness gate.** No route, route design,
> route contract, handler, storage, auth, consent, probe/validator mutation,
> package, lockfile, test, CI, runtime, or live integration change.
> **Does not freeze final schema. Does not claim the Phase 33E probes are a
> production schema. Does not claim the Straylight primitive review is complete.**

This document is a **route-contract readiness gate**. It interprets the
already-merged Dixie Phase 33E draft v1 Admission Wedge probes
([`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](ADMISSION-WEDGE-PROBE-HARDENING-GATE.md),
[`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md))
and the freeside-characters Phase 45J acceptance of the v1 mirror-refresh, and
**decides whether route-contract design may begin** and **what preconditions
remain**. It does **not** design a route, propose a route contract, or implement
anything. It is a decision gate, not a contract — modelled on the Recall Wedge
readiness checkpoint ([`docs/integration/phase-32f-recall-wedge-readiness-checkpoint.md`](integration/phase-32f-recall-wedge-readiness-checkpoint.md)),
not on the Recall Wedge route contract (Phase 32E), because the Admission Wedge
has **no** route, handler, served behavior, or route tests to consolidate.

---

## 1. Phase title and status

- **Phase 33F — Admission Wedge route-contract readiness gate.**
- Dixie-side **docs / decision-only**.
- Follows Dixie Phase 33E / PR #122 (probe hardening draft v1 / vocabulary
  refinement) and freeside-characters Phase 45J / PR #177 (Dixie v1
  mirror-refresh acceptance / next-lane decision gate).
- This is a **readiness gate**, not route-contract design and not route
  implementation.
- It changes **no** routes, storage, auth, consent, probes, validator, runtime
  behavior, source code, configuration, or production schema.
- It does **not** freeze a final/canonical/production schema.
- It does **not** mutate the Phase 33E probe JSONs (`hardening_phase: "33E"`) or
  the validator; per the Phase 33D §6 invariant, any probe/validator mutation
  requires its own separately-gated phase. Phase 33F only inspects them
  read-only.

The audience for this document is **future Dixie phases** (primarily a possible
Phase 33G — see §11), the **Straylight (`@loa/straylight`) primitive/vocabulary
owner** (whose review is a precondition — see §7), and **freeside-characters**
as an interested-but-blocked downstream consumer (see §6.W).

---

## 2. Source chain

This gate sits at the head of two parallel, cross-repo phase ladders. It
introduces no new contract material; it reads the artifacts below.

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33A | #118 | Admission Wedge contract response / acceptance gate — accepts the *need* for a contract and draft v0 vocabulary; enumerates the core invariant and the 13 open route-design questions (§9). Does not freeze schema. |
| 33B | #119 | Fixture/probe ownership decision — Dixie owns the first canonical fixture/probe proposal; defines the five-scenario minimum set. Docs/decision-only. |
| 33C | #120 | Canonical fixture/probe draft v0 — five synthetic public-safe probe JSONs + dependency-free validator under `docs/admission-wedge/fixtures/`. |
| 33D | #121 | Probe hardening / contract-vocabulary-refinement gate — accepts the v0 probes; records 11 hardening topics (A–L); decides **not** to mutate probes in 33D; recommends Phase 33E. |
| 33E | #122 | Probe hardening draft v1 / vocabulary refinement — bumps probes to `dixie_admission_wedge_probe_v1`, adds non-final markers and draft placeholders, hardens the validator; preserves all five scenarios; adds no sixth probe; freezes no schema. |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45E | #171 | Dixie probe reconciliation / local alignment decision — maps each Dixie Phase 33C probe to the local proof stack. |
| 45F | #172 | Dixie probe no-op adapter / validator — proves test-only semantic equivalence of the five v0 scenarios mapped to local proof labels; dead-ended from runtime. |
| 45G | #173 | Adapter acceptance / next-lane decision gate — accepts the 45F proof; recommends Dixie probe hardening. |
| 45H | #174 | Dixie v1 mirror-refresh / adapter compatibility gate — decision gate for tracking Dixie draft v1. |
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter now track `dixie_admission_wedge_probe_v1`, test-only; v0 fails closed as `unknown_probe_version`. |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded purpose; recommends Dixie **Phase 33F** (this gate). |

**Ownership posture carried by the whole chain (unchanged here):** Dixie owns the
HTTP/BFF ingress seam (route, tenant/estate binding, idempotency, refusal
mapping, no-leak projection); **Straylight (`@loa/straylight`) is the canonical
primitive/substrate owner** of the assertion-lifecycle vocabulary; Dixie
consumes and mirrors those names rather than coining its own; freeside-characters
does not own Dixie or Straylight vocabulary and keeps its proof labels local.

---

## 3. Purpose

- Phase 33E hardened the draft probes to **draft v1**
  (`dixie_admission_wedge_probe_v1`): explicit non-final markers, draft
  idempotency / signer-authority / receipt-split placeholders, synthetic
  identity binding, and a Straylight-primitive-review marker — while preserving
  all five Phase 33C semantic scenarios and adding no sixth probe.
- Phase 45I proved that freeside-characters can **mirror and semantically adapt**
  the v1 probes in a **test-only, docs-fixture-bound** way (a dead-ended adapter,
  not exported, not wired to any runtime path), with v0 failing closed.
- Phase 45J **accepted that proof for its bounded purpose** and explicitly
  recommended that Dixie run **Phase 33F** to decide *whether* route-contract
  design can begin and what preconditions remain.
- **Phase 33F now asks whether the v1 probes are a strong enough semantic
  foundation to begin route-contract design.** It answers that question (§4),
  inventories the decisions a route contract would require (§6), names the
  preconditions that gate even a docs-only design phase (§7–§10), and selects the
  next safe lane (§11).
- **Phase 33F does not perform route-contract design.** It designs no envelope,
  no route, no handler, and freezes nothing.

---

## 4. Current readiness assessment

> **Decision.** The Dixie v1 Admission Wedge probes are a sufficiently mature
> **semantic foundation** to support a future, **docs-only route-contract
> *design* phase** — but they are **not** strong enough to authorize or imply a
> route *implementation*, and two named preconditions (a Straylight primitive
> review and idempotency semantics) gate even the design step.

What this means in practice:

- **The semantic groundwork is mature enough to begin design.** All five
  scenarios are preserved and validator-enforced across the v0→v1 bump,
  including the load-bearing pending-vs-denied distinction; the
  candidate→transition→admitted-assertion chain, the `(superseded, active)`
  correction pair, the explicit `transition_denied` rejection, and the
  fail-closed no-leak behavior are all encoded and checked; and
  freeside-characters independently proved test-only semantic equivalence across
  the bump (§5). Phase 33D §7 records that most hardening topics are "already
  aligned to canonical names at the semantic level and need only
  field-name/taxonomy refinement."
- **The probes are not strong enough to implement a route.** They are **draft
  v1** (`schema_final: false`, `canonical_schema: false`, `route_contract: false`,
  `runtime_enabled: false`, `production_admission: false`). They are static JSON
  contract probes, not request/response shapes served by any handler, and there
  is no admission route, no production Admission Wedge admission/estate/keyring/
  assertion storage, no live admission write path, and no admission auth anywhere
  in Dixie today. (This is narrow on purpose: Dixie's existing PostgreSQL-backed
  infrastructure — pool, migrations, and reputation/governance stores in
  `app/src/server.ts` — is not denied; what does not exist is any *Admission
  Wedge* admission-storage or write-path contract.)
- **Two preconditions gate even a docs-only design phase from finalizing:**
  (1) the **Straylight primitive/vocabulary review** is marked
  `required_before_route_design` and is **not complete**
  (`straylight_primitive_review_complete: false` on every probe); and (2)
  **idempotency semantics** are a placeholder only (`idempotency_final: false`),
  with the keying strategy undecided. A design phase may *propose* and *draft*
  these, but must not *finalize* them ahead of the review.

Accordingly, Phase 33F selects a **docs-only route-contract design phase**
(Phase 33G) as the next lane (§11), bounded so it remains contract-design-only
and resolves (or explicitly defers) the open requirements below. **No
route/API handler, storage, auth implementation, consent mechanism, live call,
or production behavior is authorized by this gate or by the lane it
recommends.**

This gate finds **no blocker that requires another probe-hardening phase before
design**. The §7–§10 preconditions are design inputs and design-phase exit
criteria, not reasons to re-harden the probes; the alternative (a
primitive-review-request-first phase) is recorded in §11 in case a reviewer
prefers to sequence the Straylight review ahead of any design work.

---

## 5. Readiness evidence

The table interprets the Phase 33E probes (read-only) and the Phase 45I proof.
"Enough for design" means a docs-only contract-design phase has a stable
semantic anchor to work from; "Not enough for implementation" means the same
evidence does **not** authorize a live route, storage, auth, or a frozen schema.

| # | Evidence area | What Phase 33E / Phase 45I prove | Why it is enough for route-contract design | Why it is not enough for implementation |
|---|---------------|----------------------------------|--------------------------------------------|------------------------------------------|
| A | **Five semantic scenarios preserved** | The five scenarios (`candidate_pending_not_recallable`, `accept_candidate_to_admitted_assertion`, `reject_candidate_no_assertion`, `supersede_with_corrected_assertion`, `malformed_or_unsafe_payload_fail_closed`) are preserved unchanged in meaning across v0→v1; the validator asserts each by `scenario_id`; 45I maps all five to local proof scenarios test-only. | A design phase can map each scenario to a route-contract test vector with a stable, agreed meaning. | Scenarios are static probes, not served route behavior; nothing exercises a handler. |
| B | **Draft v1 non-final flags** | Every probe carries `schema_final: false`, `canonical_schema: false`, `route_contract: false`, `runtime_enabled: false`, `production_admission: false`, `public_safe: true`, `hardening_phase: "33E"`; the validator enforces them. | The flags make explicit that design may proceed against a *proposal*, not a frozen contract. | The same flags state, by construction, that this is **not** a route contract, canonical schema, or production admission. |
| C | **Pending-vs-denied clarity** | Scenario A is canonical `proposed` with `admission_transition: null` and public outcome `accepted_as_proposed`; the validator forbids `/denied\|rejected\|transition_denied/` vocabulary on the pending public surface. Scenario C binds denial to an explicit transition. | A design phase can model "pending" and "denied" as distinct outcomes without collapsing them. | A boolean/enum distinction in a probe is not an enforced state machine in a live store. |
| D | **Rejection transition semantics** | Scenario C: explicit `transition_kind: admit_assertion`, `outcome: denied`, `admitted_assertion_id: null`, canonical audit event `transition_denied`; no assertion minted; non-recallable. | The contract can specify a rejection response/receipt shape with a known canonical audit event. | No handler mints or persists a rejection; appealability is explicitly out of scope. |
| E | **Accepted candidate → transition → admitted assertion linkage** | Scenario B chains `source_candidate_id` → `admission_transition_id` → `admitted_assertion_id`; admitted status is canonical `active`; recall-eligible under draft policy; validator checks the link equalities both directions. | The contract can specify the accept response and the candidate→assertion reference shape. | The linkage is asserted in JSON, not produced by a transactional write path. |
| F | **Supersession / corrected-active relationship** | Scenario D models a `(superseded, active)` **pair** (a relationship/direction, **not** a coined `corrected_active` status); corrected is canonical `active`, prior is canonical `superseded`; ordinary recall includes the corrected active assertion only. | The contract can specify the correction response and which assertion ordinary recall returns. | Supersession is a probe relationship, not a live correction/forget path; the prior is audit/provenance only by assertion, not by enforcement. |
| G | **Malformed/unsafe fail-closed behavior** | Scenario E fails closed before any transition with a public `reason_code` drawn from the existing Dixie refusal family (`ingress.invalid_request`, `seam.class_validation_failed`); no assertion, no public receipt; no raw payload/marker/stack-trace leaks. | The contract can adopt a fail-closed error taxonomy grounded in real Dixie codes. | Reusing recall's codes in a probe is a vocabulary choice, not a live admission handler behavior; the admission public/audit split is still an open decision (§6.Q–R, §9). |
| H | **Public/private no-leak boundary** | The validator deep-walks each `public_response` and rejects the configured `FORBIDDEN_PUBLIC_KEYS` set of audit-only keys, a substring blocklist, and regex patterns (URLs, JWTs, PEM, bearer tokens, long opaque IDs, stack frames); identity IDs are confined to private `input`/`audit`. | The contract can adopt a "narrow public surface, private audit" boundary with a tested probe baseline. | The leak checks cover probe JSON shape, not a live serializer; the final public/audit field inventory is still draft (`receipt_split` is "subject to reconciliation"). |
| I | **Draft signer/authority fields** | Transition-bearing probes carry `authority_signer_type_draft` (value `policy_service`, a canonical `SignerType` member), `authority_scope_draft`, `authority_binding_final: false`; pending/malformed carry none. | The contract can reference where signer/authority would attach to a transition. | **Field names and binding are draft; this is not production auth, and service auth is not end-user consent.** No auth is implemented. |
| J | **Synthetic tenant/estate/actor binding** | Identity IDs are short synthetic labels (`tenant_demo`, `estate_demo`, `actor_demo`, `cand_demo_*`) confined to private sections; every probe carries `synthetic_binding: true`, `identity_binding_final: false`. | The contract can reference where identity binding would attach without inventing production identity. | **Synthetic-only; this is not production identity binding.** Real tenant/estate/actor identity is undefined. |
| K | **Idempotency placeholders** | Every probe carries `idempotency_key_draft`, `idempotency_scope_draft`, `idempotency_final: false`; the validator checks the placeholder exists and is non-final. | The contract can mark *where* idempotency attaches and that it is mandatory. | **Semantics are not decided** (candidate-id-keyed vs header-keyed vs both); these are placeholders, not final idempotency semantics. |
| L | **Receipt/audit public-private split** | `receipt_split` declares `public_receipt_ref` (mirrored to public on receipt-minting scenarios; `null` for pending/malformed), `audit_receipt_ref` (private), `audit_private: true`, `public_audit_detail: false`; full detail lives on the private `audit` object. | The contract can adopt a public-receipt-vs-audit-receipt split as a starting shape. | The split is "DRAFT — Dixie-proposed, subject to reconciliation"; the canonical public-safe field inventory is undecided. |
| M | **Recall eligibility representation** | Boolean `recall_eligible` paired with canonical `RecallUseInstruction` (`usable` … `do_not_use_for_action`); pending/rejected/malformed ineligible; accepted active eligible; superseded prior ineligible; corrected active eligible. | The contract can specify a recall-eligibility projection that reconciles against existing Recall Wedge semantics. | The mapping from eligibility to the canonical `RecallUseInstruction` set is draft and is a Straylight-owned review item (§7). |
| N | **Straylight primitive review marker** | Every probe carries `straylight_primitive_review: "required_before_route_design"` and `straylight_primitive_review_complete: false`; the validator enforces the incomplete marker; Phase 33D §12 states plainly "none has [occurred], as of this phase." | The marker tells the design phase exactly which review is its precondition. | **The review is required before route design and has not been performed.** No completed-review artifact exists; design must treat all Straylight-owned vocabulary as provisional. |
| O | **Freeside v1 mirror/adapter compatibility proof** | Phase 45I mirrors track `dixie_admission_wedge_probe_v1`; all five scenario mappings hold; v0 fails closed as `unknown_probe_version`; the adapter is a pure function, imported only by its test, not exported, reachable from no runtime path. | Confirms a downstream consumer can semantically adapt the v1 probes, so a contract has at least one proven (test-only) reconciliation. | **Explicitly test-only and dead-ended.** It proves semantic alignment only — not production readiness, not route-contract readiness, and no freeside runtime change. |

---

## 6. Route-contract requirement inventory

This is an **inventory of decisions a future route contract would have to make** —
not a route contract, and not a set of designed shapes. "Current status" reads
the Phase 33E probes and the Dixie/Straylight grounding read-only. No shape
below is proposed, frozen, or authorized here.

| # | Requirement | Current status | Required decision before route implementation | Recommended owner | Notes |
|---|-------------|----------------|-----------------------------------------------|-------------------|-------|
| A | **Route purpose and non-goals** | Implicit in the core invariant (candidate ≠ admitted; candidate non-recallable until explicitly admitted). No route doc. | State the route's purpose and an explicit non-goals list. | Dixie (design phase) | Must restate the §13 blocked list. |
| B | **HTTP method/path proposal** | No admission route exists; only `POST /api/recall/intake`. | Propose method + path (or a recall-seam extension) — design-only. | Dixie | 33A §9.1 open. Must not mount anything. |
| C | **Request envelope shape** | Probe `input` is synthetic; no wire envelope. | Define envelope fields, types, and a version/kind discriminator. | Dixie (ingress) / Straylight (vocabulary) | 33A §9.2 open. |
| D | **Candidate payload boundary** | `candidate_payload` is private-only, carries the synthetic `unsafe_marker:` token; never echoed (`rendered_candidate_payload: false`). | Define what the candidate payload may contain and that it is never echoed publicly. | Dixie + Straylight | No user chat → memory (§13). |
| E | **Admission transition shape** | Probe models `admit_assertion` transition with `outcome` and draft authority fields. | Define the transition kind/version, decision vocabulary, and authority attach point. | Straylight (canonical) / Dixie (wire) | Topic G review (§7). |
| F | **Rejection transition shape** | Scenario C: explicit denied transition, no assertion, `transition_denied` audit event. | Define the rejection response/receipt; confirm no assertion minted. | Straylight / Dixie | Appeal/correction UI out of scope (§13). |
| G | **Supersession/correction shape** | Scenario D: `(superseded, active)` pair + bidirectional supersede links. | Define correction request/response; confirm ordinary-recall-returns-corrected-only. | Straylight / Dixie | `corrected_active` is a relation, not a status (§7). |
| H | **Admitted assertion reference shape** | Probe links candidate→transition→assertion via draft id fields. | Define the canonical assertion reference and link field names. | Straylight (assertion types) | Draft link names subject to reconciliation (§7). |
| I | **Receipt/public response shape** | `public_receipt_ref` mirrored on receipt-minting scenarios; narrow public surface. | Define the public-safe receipt/status projection. | Dixie | Must stay narrow (§9). |
| J | **Audit/private response shape** | Private `audit` object holds receipt detail, policy reason, raw reasons; `audit_private: true`. | Define the audit-only field inventory and its separation from public. | Dixie | Receipt split is draft (§7.L). |
| K | **Recall eligibility projection** | Boolean + canonical `RecallUseInstruction`; ordinary recall = active admitted only. | Define how admission eligibility reconciles with existing Recall Wedge recall semantics. | Straylight + Dixie | 33A §9.11 open. |
| L | **Idempotency key semantics** | Placeholder only (`idempotency_*_draft`, `idempotency_final: false`). | Decide key scope (candidate-id-keyed vs header-keyed vs both), replay, duplicate, and rejection-replay behavior. | Dixie (ingress) | **Precondition, flagged critical** (§10). 33A §9.6. |
| M | **Tenant/estate/actor binding** | Synthetic-only; `identity_binding_final: false`. Recall route derives identity from session wallet, rejects body overrides. | Confirm identity is session-derived (no caller override) and define production binding. | Dixie (ingress) | **Not** production identity binding today. 33A §9.5. |
| N | **Service authentication** | Recall route requires JWT/wallet + allowlist; **no admission auth exists**; `dev_signature` is an enum member with **no** auth logic (not a backdoor). | Define how a calling service authenticates to an admission route. | Dixie (ingress) | Precondition (§8). Service auth ≠ consent. |
| O | **End-user authorization/consent** | No consent mechanism exists; service-auth-vs-end-user-authorization boundary load-bearing per 32F §7. | Define (or explicitly scope out for a dev-only route) the end-user authorization/consent boundary. | Dixie + Straylight + governance | **Precondition** (§8). Admission is a write path. |
| P | **Rate limiting / replay / duplicate protection** | Recall route has per-tenant rate limit + idempotency cache; admission has none. | Define rate-limit, replay, and duplicate-acceptance protection for a write path. | Dixie (ingress) | Tied to L. |
| Q | **Public-safe refusal taxonomy** | Probe reuses `ingress.invalid_request` / `seam.class_validation_failed` (real Dixie codes). | Decide the admission public refusal taxonomy explicitly (don't inherit recall's by default). | Dixie | 33A §5.J warns against default inheritance. |
| R | **Error/fail-closed taxonomy** | Scenario E fails closed; finer `private_reason_family` is draft and private. | Define the fail-closed error taxonomy and public/private reason split. | Dixie | Tied to Q, J. |
| S | **Storage write boundary** | No production Admission Wedge admission/estate/keyring/assertion storage and no live admission write path; the Recall Wedge estate path uses only an in-process, non-durable `BoundedEstateStore`, with a durable estate store gated by ADR-022E (held). (Dixie's separate PostgreSQL-backed infrastructure exists but holds no Admission Wedge admission storage.) | Define storage write semantics for a candidate/assertion write path. | Dixie + Straylight + ADR-022E | **Precondition** (§8). Admission is a write path. |
| T | **Rollback / partial failure behavior** | Not modelled in probes. | Define partial-failure rollback for a multi-step admission write. | Dixie + Straylight | Tied to L, S (§10). |
| U | **Observability/logging/no-leak boundary** | Recall emits structured audit via `emitAudit`; probe no-leak rules cover public JSON. | Define logging/audit that preserves the no-leak boundary at runtime. | Dixie | Audit must stay private. |
| V | **Straylight primitive vocabulary review** | `required_before_route_design`, **not complete**. | Complete (or explicitly defer, by governance) the Straylight review of canonical names (§7). | Straylight | **Hard precondition** (§7). |
| W | **Freeside Characters client contract implications** | 45I proved test-only semantic adaptation; adapter dead-ended; no runtime change. | Define what a downstream client may rely on once a contract exists (still reconciliation-bound). | Dixie (contract) / freeside (consumer) | No freeside runtime change authorized (§13). |
| X | **Migration/backward compatibility** | v0 fails closed downstream as `unknown_probe_version`; v1 is current draft. | Define versioning/compat for any future contract revision. | Dixie + Straylight | Probes are not a frozen schema. |

> **This is an inventory, not a contract.** No shape above is designed, proposed
> in detail, or authorized. A future design phase (§11) would produce drafts;
> implementation of any of them remains blocked (§13).

---

## 7. Required Straylight primitive review questions

The Phase 33E probes deliberately mark canonical, Straylight-owned vocabulary as
**aligned** and Dixie-proposed names as **draft / subject to reconciliation**.
A **Straylight (`@loa/straylight`) primitive/vocabulary review is required
before route design is finalized and has not been performed**
(`straylight_primitive_review_complete: false`). The following questions must be
**answered or explicitly deferred by Straylight/Dixie governance** before a route
design is finalized. Listing them here does **not** perform or complete the
review.

1. **Proposed candidate state.** What is the canonical name/status for a proposed
   candidate memory? (Probes use canonical `proposed`; confirm, and confirm it
   is distinct from the Freeside-local `candidate_pending`.)
2. **Admitted assertion lifecycle.** What is the canonical admitted-assertion
   lifecycle vocabulary? (Probes use canonical `active`; confirm there is no bare
   `admitted` status.)
3. **Corrected-active.** Is `corrected_active` a relation/direction or a
   canonical status? (Probes treat it as a `(superseded, active)` pair; confirm
   no standalone status is coined.)
4. **Admission transition vocabulary.** What is the canonical admission
   transition vocabulary? (Probes use `admit_assertion` + audit events
   `assertion_admitted` / `transition_denied`; confirm.)
5. **Receipt relationships.** What is the relationship between an admission
   receipt, an audit receipt, and a recall receipt? (Probe `receipt_split` is
   draft, "subject to reconciliation.")
6. **Recall eligibility.** How should recall eligibility be represented relative
   to existing Recall Wedge semantics and the canonical `RecallUseInstruction`
   set (`usable`, `mark_as_contested`, `use_as_background_only`,
   `do_not_use_for_action`)?
7. **Idempotency.** What are the canonical idempotency semantics for admission
   transitions? (Probe `idempotency_*_draft` is a placeholder; `idempotency_final:
   false`.)
8. **Authority/signer.** What authority/signer vocabulary is canonical vs
   service-local? (Probe field names `authority_*_draft` are draft; the value
   `policy_service` is a canonical `SignerType` member, but the field names and
   binding are draft and are not production auth.)
9. **Identity binding.** What tenant/estate/actor binding vocabulary is canonical
   vs app-local? (Probe binding is synthetic; `identity_binding_final: false`.)
10. **Public vs private fields.** Which fields are public projection vs private
    audit? (Probe `receipt_split` distinguishes `public_receipt_ref` from
    `audit_receipt_ref`, but the canonical inventory is undecided.)
11. **Fail-closed in primitive terms.** What does fail-closed mean in canonical
    primitive terms (vs the Dixie-local refusal family the probe reuses)?

---

## 8. Storage / auth / consent preconditions

- A route contract **cannot become live** until **storage write semantics** are
  defined. Dixie has **no production Admission Wedge admission/estate/keyring/
  assertion storage and no live admission write-path storage** of its own; the
  Recall Wedge estate path uses only an in-process, non-durable
  `BoundedEstateStore`, and a durable estate store remains gated by **ADR-022E
  (held)**. (This does not deny Dixie's existing PostgreSQL-backed infrastructure
  — pool, migrations, and reputation/governance stores in `app/src/server.ts`;
  that infrastructure simply holds no Admission Wedge admission storage and grants
  no admission write authorization.)
- A route contract **cannot become live** until **service authentication** for
  an admission route is defined. The Recall route authenticates via JWT/wallet +
  allowlist; **there is no admission auth**, and `dev_signature` is merely a
  member of the signature-type enum with **no** authentication logic behind it.
- A route contract **cannot become live** until the **end-user
  authorization/consent boundary** is defined — **or explicitly scoped out for a
  dev-only route**. Service authentication only proves a service may call Dixie;
  it does **not** prove the end user, channel, tenant, or surface is authorized
  (the 32F §7 boundary, restated load-bearingly).
- **Candidate admission is a write path**, unlike the Recall Wedge read/demo
  path. Writing new governed memory raises storage, identity-binding, and
  consent concerns that a read path does not.
- **Storage/auth/consent decisions are preconditions for route
  *implementation*, not necessarily for a docs-only route-contract *design*
  phase.** A design phase may *draft* the preconditions and define the boundary;
  it must not *implement* storage, auth, or consent, and must not treat the
  presence of any datastore as permission to write governed memory.

---

## 9. Public/private response boundary

- The **public response must be narrow.**
- The following must **never** appear in a public response: the raw candidate
  payload, source material, raw reasons (`raw_reasons`), audit/private details,
  tenant/estate/actor operational IDs, idempotency key values, signer/private
  authority material, stack traces, tokens, URLs, and private sentinels — exactly
  the set the Phase 33E validator already deep-walks and rejects (the configured
  `FORBIDDEN_PUBLIC_KEYS` audit-only key set plus substring and regex blocklists).
- The public response should expose **only a safe receipt/refusal/status
  projection** (e.g., a public receipt reference, a canonical status, a boolean
  recall-eligibility, a public reason code), and `rendered_candidate_payload`
  must remain `false`.
- **Private audit details require a separate boundary** (`audit_private: true`,
  `public_audit_detail: false`), with the full receipt detail kept on the private
  `audit` object.
- Per 32F §8, public minimization is **at the source**: "the adapter will drop
  it" is not a sufficient reason to emit private material; and a public refusal
  must be informative enough to classify but generic enough not to leak the
  hidden reason.

---

## 10. Idempotency / replay / partial failure

- **Idempotency semantics are mandatory before implementation.** The Phase 33E
  `idempotency_*_draft` fields are **placeholders, not final semantics**
  (`idempotency_final: false`).
- A route design must define: the **idempotency key scope** (candidate-id-keyed
  vs header-keyed vs both — undecided), **replay behavior**, **duplicate
  acceptance behavior**, **rejection replay behavior**, and **partial-failure
  rollback behavior** for a multi-step write path.
- Because admission is a **write path**, replay/duplicate handling is
  load-bearing in a way the Recall read path's idempotency cache is not a direct
  template for: a replayed admission must not double-write or double-mint.
- The Phase 33E placeholders close the *known Phase 33D gap* (idempotency was
  absent in v0) but are explicitly **not** final semantics.

---

## 11. Decision: next lane

**Selected (preferred): Phase 33G — Admission Wedge route-contract design,
docs-only.**

Bounded as:

- **docs / contract-design-only.**
- **May** propose a request/response envelope and a route contract on paper.
- **May** define route-contract test vectors or non-runtime examples (mapping the
  five probe scenarios to contract vectors).
- **Must not** implement a route handler, storage, auth, consent, live calls,
  package exports, or production behavior, and **must not** freeze a final schema,
  unless separately authorized.

This lane is chosen because the readiness assessment (§4–§5) finds the v1 probes
are a mature semantic foundation with **no blocker that requires another
probe-hardening pass before design**; the Straylight review (§7) and idempotency
semantics (§10) are design *inputs and exit criteria*, which a docs-only design
phase can carry with a required-review note rather than blocking on a separate
phase first.

**Alternative (if a reviewer prefers to sequence the primitive review first):
Phase 33G — Admission Wedge primitive review request / route-contract
precondition resolution.** A docs-only phase that formally requests the
Straylight primitive review (§7) and resolves or defers the §8/§10 preconditions
before any contract design. Choose this if governance wants the Straylight review
gated ahead of any envelope drafting. This gate's **preference is the docs-only
route-contract design lane**, kept strictly non-runtime.

Either lane is **docs/decision-only** and authorizes **no** route, storage, auth,
consent, live behavior, or schema freeze.

---

## 12. Future Phase 33G boundaries

If the **route-contract design** lane is selected, Phase 33G is bounded as:

**Allowed**

- docs-only route-contract **design**;
- propose method/path, request envelope, response envelope (on paper);
- map the five probe scenarios to route-contract **test vectors** (non-runtime
  examples);
- define the **public/private response boundary**;
- define a **refusal/error taxonomy draft**;
- define **idempotency draft semantics**;
- define **storage/auth/consent preconditions** (as drafts/dependencies, not
  implementations);
- define **Straylight primitive review dependencies** (§7);
- define explicit **non-goals** and the **blocked implementation lanes** below.

**Blocked**

- route/API handler implementation;
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

## 13. What remains blocked now

Phase 33F is a readiness gate. It authorizes none of the following; each remains
blocked:

- route / API handler implementation;
- a live admission route;
- storage writes;
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
- route implementation;
- production route deployment.

If a later phase reaches for any of the above, it must re-open the Phase 33E
probe artifacts, this readiness gate, and the relevant Dixie ADRs (ADR-022E
durable-store gate; ADR-026C/026D route guardrails) first; it must not silently
expand scope from this gate.

---

## 14. Success criteria for Phase 33F

This document is acceptable if:

- it accurately assesses route-contract readiness (§4–§5);
- it inventories the required route-contract decisions (§6);
- it identifies the storage/auth/consent/primitive-review preconditions (§7–§10);
- it selects a next lane (§11–§12);
- it does **not** design or implement route behavior;
- it does **not** mutate probes, the validator, source, tests, fixtures, config,
  or any code;
- it keeps all live/runtime lanes blocked (§13);
- only docs files change (this new file plus at most two small cross-reference
  notes — §15);
- Codex confirms the docs/decision-only scope.

---

## 15. Cross-references

- [`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](ADMISSION-WEDGE-PROBE-HARDENING-GATE.md)
  — Phase 33D hardening-decision gate and the Phase 33E status note; the source
  of the draft v1 probes this gate assesses.
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md)
  — the draft v1 probe set, vocabulary table, and no-leak rules.
- [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the dependency-free validator that enforces the shape, non-final markers, and
  no-leak boundary the readiness evidence (§5) relies on.
- [`docs/ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md`](ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md)
  — Phase 33B Dixie-first ownership decision and the five-scenario minimum set.
- [`docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md`](ADMISSION-WEDGE-CONTRACT-RESPONSE.md)
  — Phase 33A contract response, the core invariant, and the 13 open route-design
  questions (§9) this inventory (§6) tracks.
- [`docs/integration/phase-32e-recall-wedge-route-contract.md`](integration/phase-32e-recall-wedge-route-contract.md)
  — the Recall Wedge route contract whose BFF/Straylight ownership split the
  Admission Wedge assumes (but does not mutate).
- [`docs/integration/phase-32f-recall-wedge-readiness-checkpoint.md`](integration/phase-32f-recall-wedge-readiness-checkpoint.md)
  — the Recall Wedge readiness checkpoint this gate is modelled on (docs-only
  checkpoint, service-auth vs end-user-authorization boundary, public-bound
  minimization).
- `@loa/straylight` — canonical primitive/substrate owner of the assertion
  lifecycle and vocabulary the probes align to. **No Straylight primitive review
  has been performed** (§7).
- freeside-characters `docs/ADMISSION-WEDGE-DIXIE-V1-MIRROR-REFRESH-ACCEPTANCE-GATE.md`
  (Phase 45J / PR #177) — the cross-repo acceptance that recommended this gate.
