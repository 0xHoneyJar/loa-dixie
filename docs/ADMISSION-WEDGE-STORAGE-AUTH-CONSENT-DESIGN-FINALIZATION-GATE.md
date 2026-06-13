# Phase 33V — Admission Wedge Storage/Auth/Consent Design-Finalization Gate

> **Phase**: 33V
> **Branch context**: `phase-33v-admission-storage-auth-consent-design-finalization`
> **Related**: Dixie Phase 33A–33U (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle, recall-eligibility,
> signer/keyring, receipt/audit, and storage-adapter primitives
> **Status**: **docs / decision-only.** No source, test, route, route handler,
> storage, store code, DB write, migration, auth, consent, validator,
> probe/fixture/vector JSON, config, env, package, lockfile, CI, generated, or
> live-integration change.
> **This is a storage/auth/consent *design-finalization* gate, not implementation.**
> Dixie Phase 33U / PR #139 (merged) intook the Straylight-side primitive-review
> response (`loa-straylight` PR #65, merged —
> `loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md`), reconciled the
> A–O dispositions into the Dixie review register, and **selected this Phase 33V lane**
> as the documented D→E follow-on. Phase 33V **finalizes/refines** the Phase 33K
> storage/auth/consent precondition *design* against the now-confirmed Straylight
> vocabulary — turning the §4 reconciliation answers into a concrete
> design-finalization checklist and a decisions/open-blockers table — and stops. It
> implements **no** storage, auth, consent, routes, migrations, package exports,
> runtime behaviour, or Freeside integration; it does **not** finalize the Dixie route
> contract; and it does **not** make production admission ready.

This document is the Dixie-side **storage/auth/consent design-finalization gate** that
Phase 33U / PR #139 selected as the next lane
([`ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md:389-462`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)).
Phase 33K designed the storage/auth/consent preconditions on paper *against draft
vocabulary*, carrying the unresolved Phase 33J A–O review answers as explicit exit
criteria. The Straylight response has now answered that review, and Phase 33U
reconciled each disposition. Phase 33V executes exactly the charter Phase 33U defined
for it (33U §6): it **consumes the §4 reconciliation answers as exit criteria** and
finalizes/refines the Phase 33K design in vocabulary-compatible terms — it does **not**
merely re-list the same preconditions, and it does **not** re-decompose them. Pure
paper re-decomposition was explicitly judged to "add a gate without adding evidence"
(Phase 33P §6 `:353-354`; Phase 33S §7 `:499-504`); Phase 33V adds the
vocabulary-grounded design evidence the chain has been waiting on instead.

> **This phase does not complete production readiness.** Finalizing the
> storage/auth/consent *design* against the confirmed vocabulary clarifies what must be
> built; per the Straylight response itself, it does **not** clear the independent
> production gates. ADR-022E gate #8 (durable production persistence) remains **held**;
> production auth/consent, the final Dixie route contract, the final endpoint
> idempotency semantics, production signer/authority semantics, and production identity
> binding each remain to be cleared on their own. No runtime marker is flipped —
> `straylight_primitive_review_complete` stays `false`, and the spike service modules
> (`app/src/services/admission-wedge-spike/`) and the Phase 33N route handler are
> inspected **read-only** and left unchanged. Turning this finalized design into any
> code, schema, route, migration, or marker change remains future, separately-gated
> work.

Every design decision below is grounded against the Dixie Phase 33K design (read-only)
and the Phase 33U reconciliation (read-only), which in turn intook the Straylight
response (`loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md`, read in
the adjacent `../loa-straylight` checkout; **not modified**). Where this gate carries a
Straylight `file:line` citation, it carries it **as Phase 33U recorded it** — the
Straylight response's own §3 confirmed those citations against current
`loa-straylight` HEAD; Phase 33V does **not** re-derive or re-verify Straylight source
independently. Where this gate cites a Dixie spike-runtime line, that line is grounded
read-only against the current working tree and named only to anchor a design decision,
never to authorize a change to it.

---

## 1. Status and scope

- **Phase 33V — Admission Wedge storage/auth/consent design-finalization gate.**
- Dixie-side **docs / decision-only**.
- It **finalizes/refines the Phase 33K storage/auth/consent precondition *design***
  after the Straylight primitive-review response, consuming the Phase 33U §4 A–O
  reconciliation as exit criteria (§3, §4, §5, §7).
- It does **not** implement storage, auth, consent, routes, migrations, package
  exports, runtime behaviour, or Freeside integration.
- It does **not** finalize the Dixie route contract (Phase 33G remains a draft design;
  `route_contract_final: false` everywhere). It may **identify** route-contract
  dependencies the storage/auth/consent design creates, but it does not finalize or
  absorb the route-contract gate (§6).
- It does **not** make production admission ready, and it does **not** flip
  `straylight_primitive_review_complete` in any runtime marker (the spike service
  modules and their markers are inspected **read-only** and left unchanged).
- It changes **no** source, test, route, route handler, storage, store code,
  validator, probe/fixture/vector JSON, config, env, package, lockfile, CI, or
  generated file. The only mutations are this new decision doc and at most minimal
  cross-reference status notes on predecessor docs (§10).
- It does **not** mutate the Phase 33N route handler (`app/src/routes/admission-intake.ts`),
  the Phase 33Q ledger module (`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`),
  the other spike service modules, their tests, the Phase 33E probe JSONs, the Phase
  33L route-vector JSONs, or either docs validator. Per the Phase 33D §6 invariant —
  any probe / validator / fixture / vector mutation requires its own separately-gated
  phase — Phase 33V inspects all of them **read-only**.
- It does **not invent answers beyond the Straylight response / Phase 33U intake.**
  Where Phase 33U recorded a disposition as *delegated-to-Dixie* or *unresolved*,
  Phase 33V finalizes the Dixie-owned *design decision* (or records its continued
  deferral) — it does **not** convert a held production gate into a cleared one, and it
  does **not** restate a Dixie projection as a canonical Straylight claim.

The audience is **future Dixie phases** (primarily the Phase 33W route-contract
readiness-update lane this gate selects — §8), with the Straylight (`@loa/straylight`)
owner and freeside-characters as interested-but-unaffected parties (this gate hands
neither any new authorization).

---

## 2. Source-chain context

Phase 33V sits one rung above the Phase 33U response-intake gate on the Dixie
Admission Wedge ladder. It is the **design-finalization follow-on** to the cross-repo
round-trip that Phase 33T opened and Phase 33U closed. It introduces no new contract
material, freezes nothing, and authorizes nothing; it consumes the reconciled
Straylight answers and finalizes the storage/auth/consent design, then selects the
next lane.

### Dixie (loa-dixie) — the chain into 33V

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33K | #129 | Storage/auth/consent **precondition design** gate — designed (on paper) the storage record-shape inventory (§6), service-auth options (§9), end-user consent options (§10), idempotency precondition (§8), no-leak boundary (§7, §13), and threat model (§14), carrying the unresolved Phase 33J A–O answers as **exit criteria**, not solved facts. The design Phase 33V now finalizes. |
| 33N | #132 | Dev/operator-only route-spike **implementation** (commit `f44dd702`) — disabled-by-default `POST /api/admission/intake` on **Storage Option A (no durable storage)**, fail-closed, no-leak; authorized no production lane. |
| 33O | #133 | Route-spike **acceptance** gate (commit `db14ab40`) — accepted 33N only as a bounded, disabled-by-default, dev/operator-only route spike (§7); does **not** complete MVP 2 (§6). |
| 33P | #134 | Storage / receipt hardening **decision** gate (commit `0e97758a`) — selected Option B (dev-only bounded synthetic store), rejected Option D (production-like durable storage); judged a third paper re-decomposition would "add a gate without adding evidence" (§6 `:353-354`). |
| 33Q | #135 | Dev-only bounded synthetic admitted-assertion **ledger** (commit `6d6f07f6`) — process-local, Map-backed, synthetic-only, tenant+estate-scoped, capacity-bounded, non-durable, fail-closed, **test-seam-only** (not wired into `server.ts`). |
| 33R | #136 | Bounded-ledger **acceptance / hardening** gate (commit `ae93ad3d`) — accepted 33Q only as a bounded, non-production, test-seam-only synthetic proof (§7); named §9 Options A–F. |
| 33S | #137 | Route-spike + bounded-ledger acceptance **decomposition** gate (commit `682abc7e`) — selected **Option D** (Straylight primitive-review follow-up) as the highest-leverage vocabulary prerequisite, and recorded the **D→E follow-on** (§7 `:523-533`): the Option-E storage/auth/consent finalization lane is "conditional on D, not a substitute for it," consuming the review answers as exit criteria. |
| 33T | #138 | Straylight primitive-review **follow-up / cross-repo review request** (commit `097c1c05`) — re-issued the §5 / 33J A–O register grounded in the concrete 33N route surface and 33Q ledger, defined the expected Straylight response shape (§9), and selected **Phase 33U** (§10). Completed no review. |
| **Straylight** | **`loa-straylight` PR #65 (merged)** | **Admission Wedge primitive-review *response*** — `loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md`. Answered the 33T A–O request from the side that owns the assertion-lifecycle / recall / signer / receipt-audit / storage-adapter vocabulary; confirmed the carried-forward citations against current HEAD (its §3); coined no new canonical primitive; authorized no implementation lane in either repo. |
| 33U | #139 | Straylight response **intake / lane-decision** gate (commit `49cfdb89`) — intook the PR #65 response, reconciled **every** A–O row using only the response's dispositions (its §4), recorded the Dixie implications (its §5), preserved every blocked lane (its §7), and **selected this Phase 33V** storage/auth/consent design-finalization follow-on (its §6). The **source-of-truth input to this gate.** |
| **33V** | *(this doc; docs/decision-only — not committed/merged yet)* | **Storage/auth/consent design-finalization gate** — consumes the 33U §4 reconciliation as exit criteria (§3), finalizes the Phase 33K storage design (§4) and auth/consent design (§5) in vocabulary-compatible terms, records the route-contract boundary (§6), tabulates final design decisions and open blockers (§7), preserves every blocked lane (§9), and selects **Phase 33W** (route-contract readiness update; docs/decision-only — §8). Completes no implementation; makes no production-readiness claim. |

### Straylight (`@loa/straylight`)

The canonical primitive/substrate owner. Its response (PR #65) **confirmed** the
33J/33T carried-forward citations against current `loa-straylight` HEAD (response §3),
coined **no** new canonical primitive, and is the first Straylight document to name the
Admission Wedge. The prior "checkout may be stale" caveat is **resolved** for the A–O
primitives by the response's own §3 confirmation (as Phase 33U recorded). Phase 33V
carries the Straylight citations exactly as Phase 33U recorded them and does **not**
re-derive Straylight source.

> **Cross-repo phase-numbering caution (unchanged).** Dixie's 33-series, the
> freeside-characters 45-series, and Straylight's ADR/phase labels are independent
> labels in separate repositories and must not be conflated.

### Freeside Characters (freeside-characters)

Unchanged context. The 45-series mirror/adapter is test-only, not exported, not
runtime-wired, with no live Dixie call (45J / PR #177, **verified merged on GitHub**
2026-06-06). This gate hands Freeside **no** new authorization and **no** client
contract; Freeside review/client-contract work remains deferred until the Dixie
route/client contract is accepted enough to hand off.

---

## 3. Vocabulary-grounded corrections from Straylight PR #65 / Phase 33U

This section carries forward, **verbatim in substance**, the corrections the Straylight
response established and Phase 33U reconciled (33U §3, §4, §5). These are the
**exit-criteria inputs** the storage (§4) and auth/consent (§5) finalization checklists
consume. None is a new answer; each is a constraint Phase 33V's design must honour.

**Idempotency / id-derivation (row J):**

- **Endpoint idempotency remains Dixie / endpoint-route-contract-owned.** There is no
  `idempotency_key` primitive anywhere in Straylight; idempotency is delegated to the
  host/Dixie per the recall-wedge precedent (ADR-026D §3.b).
- **Straylight content-addressed ID derivation is a distinct, narrower primitive-level
  concept**, *not* endpoint replay/idempotency: `transition_id` / `assertion_id` are
  derived via `contentId(...)` over the full input **including `now`**.
- **IDs are deterministic only for identical *complete* inputs — the same candidate
  *and* the same `now`.** The same candidate admitted at a different `now` yields
  different ids.
- **No substrate de-duplication and no replay guard is claimed** — admission appends
  unconditionally; `admit()` performs no prior-id lookup before minting;
  transitions/audit are append-only with no replay-detection step. Content-addressed
  id derivation is **not** proof of replay compatibility and must **not** be cited as
  substrate de-duplication.
- **The Dixie synthetic ledger's replay behaviour is not a Straylight replay proof.**
  The ledger's spike-scoped behaviour (identical replay mints nothing; conflicting
  replay fails closed without overwrite) is enforced by the **Dixie ledger spike**, not
  the Straylight substrate; the endpoint keying remains undecided
  (`idempotency_final: false`).

**Recall eligibility (row E):**

- **`RecallDisposition` governs recall semantics** — the canonical four-member union
  `include` / `mark` / `redact` / `exclude` returned by `dispositionFor(assertion,
  request)`, computed **per request** from status, request filters, `privacy_scope`,
  and risk profile.
- **Recall instructions apply only to included / marked items** — a
  `RecallUseInstruction` is attached only to included (`usable`) and marked items.
- **Redacted / excluded assertions receive no `RecallUseInstruction`.**
- **`active` can still be excluded** by request filters, privacy frame, or
  risk-profile checks — there is **no universal `active ⇒ recallable` rule**.
- **`superseded` can be *marked*** (background) when `include_statuses` explicitly
  opts in, otherwise it is excluded.
- **The Dixie ledger recall booleans are constrained Dixie projections**, not canonical
  Straylight status-to-boolean semantics. The synthetic ledger's `recall_eligible`
  boolean — `active ⇒ true` / `superseded ⇒ false` under default request conditions
  (grounded read-only at `admitted-assertion-ledger.ts:101,793,886`) — is a specific,
  lossy Dixie projection of `dispositionFor` for one request frame, **not** a coined
  stored primitive and **not** a canonical status mapping.

**Supersession vocabulary (rows C, D, N):**

- **`assertion_superseded` is not a canonical Straylight `AuditEventType`** — it is
  absent from the enumerated members. The synthetic ledger emits an
  `assertion_superseded` label (grounded read-only at `admitted-assertion-ledger.ts:123,890`);
  it must **remain Dixie-local or be re-related to Straylight relation vocabulary**.
- **The normative re-relation uses existing concepts** — a `link_assertions` transition
  carrying `AssertionLinkType: 'supersedes'`, corresponding to the canonical
  **`assertion_linked`** audit-event member; plus a status transition moving the prior
  assertion to `superseded` recorded via the canonical forward field
  **`supersedes_refs`**, with the corrected assertion remaining `active`.
- **This is vocabulary relation only, not a claim that current runtime emits
  `assertion_linked`.** Straylight implements no link/supersession executor today;
  `link_assertions` / `assertion_linked` / `supersedes` are defined vocabulary members
  with no runtime emitter.
- **The Dixie inverse `superseded_by_assertion_id` is Dixie-local** (grounded read-only
  at `admitted-assertion-ledger.ts:105`) — the canonical relational field is
  `supersedes_refs` (forward direction); there is **no `superseded_by` field** in any
  Straylight primitive.
- A future dedicated Straylight `assertion_superseded` event is a **separate Straylight
  ADR decision** (deferred, not blocking); the response does not coin it and does not
  pre-authorize it.

**Receipt / audit & public-field naming (row H):**

- **Row H receipt naming is delegated to Dixie.** The synthetic `SyntheticAuditRecord`
  maps to **two** distinct Straylight primitives — `AuditEvent` (audit half) +
  `TransitionReceipt` (receipt half) — not one; keep them unconflated.
- **`public_receipt_ref` is a recommendation / preferred standardization target, not a
  rejected or re-related primitive.** Straylight delegates the public field-naming
  decision to Dixie and merely recommends `public_receipt_ref` (consistent with its
  `*_ref` convention and the deferred `public_anchor_ref`). Dixie adopts
  `public_receipt_ref`, retires `receipt_public_ref`, and keeps the non-Straylight
  `audit_receipt` label out of the public surface.

**Storage / durable-store boundary (row O):**

- **ADR-022E durable-store gates remain held.** Any *durable* admission store is
  governed by **ADR-022E gate #8** (production persistence, held); it is **NOT**
  authorized by this review. Related held gates: gate #10 (Dixie boundary wiring —
  unblocked only for the single recall-intake endpoint slice, **not** admission), gate
  #12 (new HTTP/network surface, held), gate #20 (threat-model widening required before
  any such wiring).
- **Dixie's synthetic bounded ledger proof is not durable storage readiness.** The
  Phase 33Q ledger is process-local, Map-backed, non-durable, capacity-bounded,
  fail-closed, and test-seam-only; it proves *vocabulary alignment and synthetic
  transition behaviour*, **not** durable persistence. Durable Admission Wedge storage
  stays gated behind ADR-022E gate #8 and requires a **separate gate-clearing ADR**.

**Route-contract ownership (rows J, and the chain-level gates):**

- **Final route-contract work remains separately gated.** Endpoint idempotency remains
  a Dixie route-contract responsibility; resolving the primitive review does not
  finalize the route contract (§6).

---

## 4. Storage design-finalization checklist

This finalizes the Phase 33K §6 storage record-shape inventory **against the confirmed
vocabulary**. Each item is a concrete design criterion the future storage design must
satisfy; **none is implemented here.** Each cites the Phase 33K record category and the
governing reconciliation row. **No final database schema, migration, or DB write is
defined or performed.**

- [ ] **Durable store architecture requirement.** A production durable admission store
  is **not designed here and not authorized**: it is gated behind **ADR-022E gate #8**
  (held) and requires a separate gate-clearing ADR satisfying the gate #8 trigger
  while preserving the ADR-022D receipt/audit-chain invariants (row O; 33K §6.3, §6.7).
  The Phase 33Q synthetic ledger is **process-local, non-durable, test-seam-only** and
  explicitly **does not** satisfy this requirement.
- [ ] **Tenant/estate/actor binding model.** `estate_id` / `actor_id` are Straylight
  wedge primitives mirrored directly; **`tenant_id` is Dixie host-layer**, not a wedge
  primitive. The synthetic ledger's `(tenant_id, estate_id)` scope is a **spike
  isolation mechanism, not final semantics**; "subject" maps to `Assertion.subject_refs`,
  not a dedicated `subject_actor_id`. Production identity binding stays Dixie-host and
  **undefined** (`identity_binding_final: false`) (row G; 33K §6.1, §11).
- [ ] **Admitted assertion persistence boundary.** The admitted assertion is the
  canonical `active` `Assertion` (Straylight substrate semantics); `admitted` is a
  public `outcome_class` only, never a coined status. The persistence boundary for the
  admitted assertion belongs to Straylight substrate semantics; Dixie holds only the
  ingress references onto the canonical chain (rows A, B, L; 33K §6.3).
- [ ] **Candidate/proposed material persistence boundary.** `CandidateAssertion` is the
  pre-admission **object**; `proposed` is the canonical pre-admission **status**;
  `candidate` may be a Dixie ingress *object* label, never a status value. The raw
  candidate payload is **private / admission-bound** and must never surface publicly
  (rows A, L; 33K §6.1).
- [ ] **Transition receipt persistence boundary.** The receipt half maps to
  `TransitionReceipt` (kinds incl. `admission` / `denied`) — first-class and **distinct
  from** the chained audit log; keep it unconflated with the audit half. Adopt
  **`public_receipt_ref`** as the single public-safe reference field name (retire
  `receipt_public_ref`); it carries no operational id and no audit detail, and is
  `null` where no public receipt is minted (pending / fail-closed) (row H; 33K §6.6).
- [ ] **Audit event persistence boundary.** The audit half maps to `AuditEvent`
  (append-only, hash-chained); the canonical members for admission are
  `assertion_admitted` and `transition_denied`. `audit_receipt` is **not** a Straylight
  term and stays out of the public surface; full audit detail is private /
  controlled-access (rows C, H, O; 33K §6.7).
- [ ] **Public/private field projection boundary.** The canonical projection rule is
  **`privacy_scope` + environment-frame disposition**, not a mirrored denylist alone;
  the Dixie denylist is **defense-in-depth**, not the canonical rule. The no-leak
  serializer must be designed against `privacy_scope` + frame disposition (rows K, H;
  33K §6, §7, §13).
- [ ] **No raw/private/source/debug leakage in public responses.** Raw candidate
  payload, provenance/source material, signature/authority material, operational ids
  (`transition_id`, `audit_event_id`, private `receipt_id`),
  `tenant_id`/`estate_id`/`actor_id`, idempotency keys, storage internals, and debug
  traces are **never-public** categories (row K; 33K §7, §13, §14).
- [ ] **No accidental recallability for pending/rejected/malformed candidates.** Pending
  candidates, rejected candidates, and malformed/unsafe candidates must mint nothing
  recallable and must fail closed — preserving the substrate distinction
  `rejected_candidate` (class-validation failure) ≠ `denied_transition` (policy denial)
  into any future non-ingress mapping (rows I, M; 33K §6.4, §7).
- [ ] **Supersession/correction audit chain.** Model supersession as the canonical
  `(superseded, active)` relation via the **forward field `supersedes_refs`** + a
  `link_assertions` transition (link type `supersedes`) → canonical `assertion_linked`
  audit member. **Drop `assertion_superseded` as a canonical audit-event type**;
  re-relate the synthetic ledger's `assertion_superseded` label (and the inverse
  `superseded_by_assertion_id` field) as **Dixie-local** projections. Ordinary recall
  includes the corrected `active` assertion only (rows C, D, N; 33K §6.5).
- [ ] **Process-local synthetic ledger is not production durable storage.** The Phase
  33Q ledger proves synthetic transition behaviour only; it must not be cited as, or
  promoted to, durable persistence (row O; 33K §6, §20).
- [ ] **Migration/backfill/rollback considerations.** Forward-only migrations,
  backfill, and rollback are **undesigned and out of scope here**; they are required
  inputs to a future durable-store ADR and the production storage gate, not this
  finalization (33K §15, §20).
- [ ] **Failure atomicity and no partial-admission residue.** A multi-step admission
  must be atomic — no partial-admission residue, fail-closed on partial commit. This is
  a design requirement, not implemented here (33K §14, §15).
- [ ] **Capacity / replay / conflict behaviour must be explicit before implementation.**
  Endpoint replay/idempotency keying (candidate-id vs header vs both), capacity bounds,
  and conflict resolution are **Dixie endpoint-route-contract concerns** and remain
  **undecided** (`idempotency_final: false`); content-addressed id derivation is
  complementary, **not** a substitute (row J; 33K §8). Final keying is deferred to the
  route-contract gate (§6).
- [ ] **Deletion/forget/revoke/correction remains separately gated.** Forget / revoke /
  correction storage and UI are **not designed here** and stay blocked unless an
  explicit later phase designs them (§9; 33K §20).

---

## 5. Auth/consent design-finalization checklist

This finalizes the Phase 33K §9 service-auth and §10 end-user consent option designs
**against the confirmed vocabulary**. Each item is a concrete design criterion;
**none is implemented here.** Production auth/consent semantics remain an **independent
unresolved gate** that the primitive review does **not** clear (rows F, G).

- [ ] **Service authentication versus end-user authorization separation.** Service auth
  proves a service may *call* Dixie; it does **not** prove the end user, channel,
  tenant, or surface is authorized. **Service auth ≠ end-user consent** (the
  load-bearing 32F §7 / 33A boundary, restated) (33K §9).
- [ ] **Tenant/estate/actor authorization model.** Authorization binds to `estate_id` /
  `actor_id` (Straylight wedge primitives) with `tenant_id` as Dixie host-layer;
  identity is **session-derived, never body-trusted** (the Recall route precedent);
  production identity binding stays **undefined** (row G; 33K §11).
- [ ] **Who can propose candidate memory.** The proposing actor is a Dixie
  caller-envelope concern mapped onto `CandidateAssertion`; the production proposer
  authority model is **undesigned** (rows A, G; 33K §6.1).
- [ ] **Who can admit candidate memory.** Which signer roles may authorize
  `admit_assertion` is **not a fixed list** — it is decided by `SignerCompetenceRule` /
  `Keyring` / policy. `policy_service` is a canonical `SignerType` safe to mirror; the
  `authority_*_draft` field names stay Dixie draft (row F; 33K §9).
- [ ] **Who can reject candidate memory.** Rejection binds to an explicit
  `transition_denied` audit event + `denied` `TransitionReceipt`; the rejection
  authority follows the same `SignerCompetenceRule` / policy boundary as admission
  (rows F, M; 33K §6.4).
- [ ] **Who can supersede/correct admitted assertions.** Supersession authority follows
  the same signer/policy boundary; the relation is modelled via `supersedes_refs` +
  `link_assertions` (§4), not a coined status or audit event. Production supersession
  authority is **undesigned** (rows C, D, F, N).
- [ ] **Who can recall admitted assertions.** Recall eligibility is the emergent,
  per-request `RecallDisposition`, recomputed at recall time — never a persisted
  authority and never a status→boolean rule. Recall authorization is a Recall-Wedge /
  recall-route concern, distinct from admission authority (row E; 33K §6.3).
- [ ] **Operator/dev synthetic authority is not production authority.** The Phase 33N
  spike's dev/operator synthetic auth (the `x-admission-service-token` dev gate,
  disabled by default) and the Phase 33Q synthetic subjects are **non-production only**;
  they are never a production authority model (33K §9 Option C, §12).
- [ ] **Consent proof / receipt boundary.** A production end-user consent artifact or
  platform-mediated grant reference lives on the **private audit record only** — never
  a raw secret, never public. The dev/operator omission marker is **non-production
  only** (33K §6.9, §10).
- [ ] **Cross-user/cross-tenant sharing blocked by default.** Cross-user admission
  requires an explicit consent model (33K §10 Option A/B); Option D (no authorization)
  is **rejected**. Cross-tenant ambiguity fails closed (Straylight `TenantResolver`
  posture) (rows G, K; 33K §10, §11).
- [ ] **Public remember-this blocked.** No public/unauthenticated "remember-this"
  surface is designed or authorized (§9; 33K §12, §20).
- [ ] **Discord history ingestion blocked.** No Discord command/history ingestion path
  is designed or authorized (§9; 33K §12, §20).
- [ ] **User chat becoming memory blocked.** No automatic chat-to-memory path is
  designed or authorized (§9; 33K §12, §20).
- [ ] **Freeside client/user authorization handoff remains later and separate.** The
  Freeside client contract is deferred until the Dixie route/client contract is mature
  enough to hand off; the adapter stays test-only, not exported, not runtime-wired, no
  live Dixie call (§9; 33K §17).

---

## 6. Route-contract boundary

- **Phase 33V does not finalize the route contract.** The Phase 33G route-contract
  design remains a draft; `route_contract_final: false` everywhere.
- **It can identify route-contract dependencies created by the storage/auth/consent
  design.** Concretely, the storage/auth/consent finalization surfaces these
  dependencies the route contract must later resolve: (a) **endpoint idempotency keying**
  (candidate-id vs header vs both) and replay/conflict semantics — Dixie /
  endpoint-owned, undecided (row J); (b) the **public response field set and naming**
  (`public_receipt_ref`, outcome class, recall-eligibility projection, stable
  `reason_code`) the no-leak serializer projects (rows H, K); (c) the **refusal/denial
  taxonomy** mapping (`ingress.invalid_request` ingress family; `rejected_candidate` ≠
  `denied_transition`) (rows I, M); and (d) the **session-derived identity binding**
  the route must enforce (row G).
- **Final route-contract acceptance remains a separate later gate.** Endpoint
  idempotency remains a Dixie route-contract responsibility; it is named as a
  dependency here, not decided.
- **This doc does not mutate route vectors or validators.** The Phase 33L
  route-contract test-vector JSONs and their validator, and the Phase 33E probe JSONs
  and their validator, are inspected **read-only** and left unchanged (§10).

---

## 7. Final design decisions / open blockers table

Each area below carries the **Phase 33V design decision** (consuming the §3
corrections), whether it is **still blocked**, the **owner / later gate**, and the
**implementation implication**. *Design decision* here means "what the design now
commits to on paper," never "what is implemented" — nothing is implemented.

| Area | Phase 33V design decision | Still blocked? | Owner / later gate | Implementation implication |
|------|---------------------------|:--------------:|--------------------|----------------------------|
| **Durable storage** | No durable store designed; production persistence stays behind a future gate-clearing ADR that satisfies the ADR-022E gate #8 trigger. Synthetic ledger is explicitly non-durable. | **Yes** | ADR-022E gate #8 (held); future production-storage gate | A durable store may not be built until a separate ADR clears gate #8. |
| **Auth** | `policy_service` mirrored as canonical `SignerType`; admit/reject/supersede authority decided by `SignerCompetenceRule` / `Keyring` / policy (not a fixed list); `authority_*_draft` names stay Dixie draft; dev/operator synthetic auth is non-production. | **Yes** (production semantics) | Production signer/authority gate | No production auth model is selected; only the vocabulary boundary is fixed. |
| **Consent** | Production requires an explicit consent artifact (33K §10 A) or platform-mediated grant (B); Option D rejected; consent reference is private-audit-only; dev/operator omission marker is non-production. | **Yes** | Production auth/consent gate | Cross-user/public admission stays blocked until a consent model is built. |
| **Endpoint idempotency** | Dixie / endpoint-route-contract-owned; keying (candidate-id vs header vs both) undecided (`idempotency_final: false`); content-addressed id derivation is complementary, not a substitute or proof. | **Yes** | Dixie route-contract gate (33W+) | Idempotency keying is a named route-contract dependency, not decided here. |
| **Tenant/estate/actor binding** | `estate_id`/`actor_id` mirror Straylight primitives; `tenant_id` is Dixie host-layer; `(tenant_id, estate_id)` ledger scope is spike isolation only; "subject" → `subject_refs`; identity session-derived. | **Yes** (production binding) | Production identity-binding gate | Production identity binding stays undefined; no `subject_actor_id` coined. |
| **Public/private receipts** | Split `SyntheticAuditRecord` → `AuditEvent` (audit half) + `TransitionReceipt` (receipt half), unconflated; adopt `public_receipt_ref` (retire `receipt_public_ref`); `audit_receipt` out of the public surface. | **Yes** (naming target selected; route projection and serializer remain blocked) | Dixie public-surface design; route contract (33W+) | `public_receipt_ref` is the preferred Dixie standardization target; no route/schema field is frozen here; the serializer is still to be designed/built. |
| **Recall eligibility projection** | `recall_eligible` is a derived **per-request** Dixie projection of `RecallDisposition`, recomputed at recall time — never persisted as authority, never a status→boolean rule; the boolean collapses the mark/redact band (a public-surface concern). | No (semantics resolved; projection Dixie-owned) | Dixie public-surface design | No persisted eligibility flag; recall recomputes disposition per request. |
| **Supersession vocabulary** | `assertion_superseded` dropped as a canonical audit event; re-related Dixie-locally to `assertion_linked` (`link_assertions` + link type `supersedes`) + `superseded` status via `supersedes_refs`; inverse `superseded_by_assertion_id` stays Dixie-local. | No (re-relation decided) | Dixie-local; a dedicated Straylight event is a separate Straylight ADR (deferred) | Synthetic label must be re-related before any non-spike mapping. |
| **Route contract** | Not finalized; storage/auth/consent dependencies identified (§6) but not decided; `route_contract_final: false`. | **Yes** | Dixie route-contract gate (Phase 33W+) | No route contract may be frozen here. |
| **Freeside integration** | No client contract handed off; adapter stays test-only, not exported, not runtime-wired, no live Dixie call. | **Yes** | Freeside gate, after a mature Dixie contract | No Freeside runtime/client wiring authorized. |
| **Production readiness** | Not ready; the design finalization clarifies what must be built but clears no independent production gate. | **Yes** | All of the above gates | Production admission stays blocked under every option. |

> **None of §7 is a production-readiness claim.** Each "design decision" fixes the
> *design* against the confirmed vocabulary; every production lane remains
> independently gated (§9), exactly as the Straylight response and Phase 33U state.

---

## 8. Decision: next Dixie lane

> **Selected: Phase 33W — Admission Wedge route-contract readiness update after the
> Straylight response and storage/auth/consent design-finalization (docs /
> decision-only).**

**Reason:**

- **Phase 33V resolves the design-finalization step.** The storage/auth/consent design
  is now finalized/refined against the confirmed vocabulary (§4, §5), with the final
  decisions and open blockers tabulated (§7).
- **The next material gain is updating route-contract readiness.** The storage/auth/consent
  finalization surfaced concrete route-contract dependencies (§6): endpoint idempotency
  keying, the public response field set / `public_receipt_ref` naming, the refusal/denial
  taxonomy mapping, and session-derived identity binding. The next docs/decision step is
  to **reassess the Phase 33G route-contract draft's readiness** against these now-finalized
  inputs — without finalizing or freezing it.
- **Implementation remains blocked** until final route-contract readiness is explicitly
  assessed and the independent production gates (ADR-022E gate #8, production
  auth/consent, identity binding, signer/authority) are cleared on their own. So an
  implementation lane is **not** selected.
- **Phase 33W keeps the final route contract separate from 33V** while making forward
  progress: it is a readiness *update / assessment*, not a route-contract *freeze*, and
  it must not mutate route vectors, validators, probes, or any runtime artifact.

**Why not an implementation lane.** No artifact here proves implementation is now safe.
The Straylight response is explicit that resolving the primitive review "alone does not
make production admission ready" (response §1, §7); ADR-022E gate #8 (durable store)
remains held; production auth/consent, the final route contract, and the final endpoint
idempotency semantics each remain to be cleared; no final schema is frozen. Selecting an
implementation lane would bypass those gates; this gate does not, and cannot, prove it
is safe to do so.

**Provisional phase label.** The follow-on lane is provisionally labelled **Phase
33W**. The label is for ordering only; the route-contract readiness-update content
belongs to that future, separately-gated docs/decision phase and is **not** designed
here. No route, store, migration, auth, consent, public surface, Freeside wiring,
package export, route-contract freeze, or schema freeze is selected, scheduled, or
authorized under any option.

---

## 9. What remains blocked regardless of this finalization (blocked lanes preserved)

Phase 33V is a docs/decision-only design-finalization gate. It authorizes none of the
following; each remains **blocked** and is **not** unblocked by finalizing the
storage/auth/consent design:

- route / API handler implementation beyond the existing Phase 33N spike;
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
- mutate the Phase 33N route handler, the Phase 33Q ledger module, or any spike service
  module / test;
- flip `straylight_primitive_review_complete` (or any other draft marker) in any
  runtime artifact — the spike markers are inspected **read-only** and left `false`;
- change any config, env, package, lockfile, CI, or generated file;
- wire the Phase 33Q ledger into `server.ts` or add any env flag;
- claim that finalizing the storage/auth/consent design makes production admission
  ready;
- claim Straylight owns the endpoint idempotency semantics;
- finalize or freeze the Dixie route contract.

> **On scope-expansion.** If a later phase reaches for anything in the blocked list, it
> must re-open the relevant prior gates (Phase 33I decomposition, 33J review request,
> 33K precondition design, 33L test-vector draft, 33M authorization, 33N spike, 33O
> acceptance, 33P storage/receipt hardening, 33Q ledger, 33R acceptance, 33S
> decomposition, 33T review request, 33U response intake, this finalization gate) and
> the relevant Straylight decision records (ADR-022E durable-store gate; ADR-026C /
> ADR-026D route guardrails — the recall-intake seam, a different seam from admission)
> first; it must not silently expand scope.

---

## 10. Acceptance criteria and validation

### 10.1 Acceptance criteria for Phase 33V

Phase 33V succeeds if and only if:

1. **Docs/decision-only** — it creates the Phase 33V design-finalization doc and at most
   minimal cross-reference status notes, and changes **no** source, test, route, store,
   migration, auth, consent, validator, probe/fixture/vector JSON, config, env, package,
   lockfile, CI, or generated file.
2. **Source-chain recorded** — it records that Phase 33U intook Straylight PR #65 and
   selected this lane, and treats the 33U §4 reconciliation as the source-of-truth input
   (§2, §3).
3. **Vocabulary corrections carried forward** — it carries the §3 corrections
   (idempotency/id-derivation, `RecallDisposition`, `assertion_superseded` re-relation,
   `public_receipt_ref`, ADR-022E gate #8 held) without inventing answers beyond the
   Straylight response / Phase 33U intake (§3).
4. **Design finalized, not re-decomposed** — it finalizes/refines the Phase 33K storage
   (§4) and auth/consent (§5) design as concrete checklists consuming the §4 answers as
   exit criteria, rather than re-listing the same preconditions (§4, §5, §7).
5. **Route-contract boundary respected** — it identifies route-contract dependencies but
   does not finalize the route contract or mutate route vectors/validators (§6).
6. **Decisions/blockers tabulated** — it records the final design decisions and open
   blockers per area, marking each still-blocked or Dixie-owned-and-decided (§7).
7. **No production-readiness claim** — it does **not** flip
   `straylight_primitive_review_complete`, does **not** claim the design finalization
   clears production admission, and does **not** claim Straylight owns endpoint
   idempotency (§1, §9).
8. **Blocked lanes preserved** — it authorizes no production / durable / public /
   Freeside / package / schema-freeze / auth / consent / route-contract-freeze lane (§9).
9. **Next lane selected** — it selects a docs/decision-only Phase 33W route-contract
   readiness-update follow-on and explains why an implementation lane is not selected (§8).
10. **Validators stay green** — the Phase 33E fixture validator and the Phase 33L
    route-vector validator both pass unchanged (§10.2).

### 10.2 Validation requirements

Phase 33V is docs/decision-only; its validation is that it changed **nothing
executable** and that the two docs validators stay green:

- `git status --short --branch --untracked-files=all` shows **only** the new Phase 33V
  decision doc and at most the minimal cross-reference status notes (§10.3) — no source,
  test, validator, probe, fixture, vector, config, env, package, lockfile, CI, or
  generated file;
- `git diff --name-status` and `git diff --stat` confirm any tracked-file edits are
  confined to `docs/` Markdown;
- `git diff --check` is clean (no whitespace errors / conflict markers);
- because the new doc is untracked, a no-index whitespace check confirms it is clean:
  `git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md || test "$?" = "1"`
  (the `|| test "$?" = "1"` absorbs the expected exit code 1, which signals the file
  *has content* / differs from the empty `/dev/null`, **not** a whitespace defect);
- the Phase 33E fixture validator stays green —
  `node docs/admission-wedge/fixtures/validate-fixtures.mjs` reports **5/5 probes valid,
  0 failures**;
- the Phase 33L route-contract test-vector validator stays green —
  `node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  reports **5/5 vectors valid, 0 failures, no sixth vector**;
- a **docs-only scope check** confirms no application-code (`src/`, `app/`, `lib/`),
  config, env, or generated path is touched;
- a **markdown fence sanity check** confirms the new doc has no unbalanced code fences;
- nothing is staged or committed by this phase (the branch's commit/merge is a separate,
  explicitly-authorized step).

> The repository package manifests define no Markdown/docs lint script; existing lint
> scripts do not target Markdown, so only diff/whitespace/scope validation and the two
> existing docs validators are applicable to this docs-only decision artifact.

### 10.3 Cross-references

- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U / PR #139, the Straylight response intake gate that reconciled the A–O
  dispositions (its §4) and **selected this Phase 33V lane** (its §6). The
  source-of-truth input to this gate. **Fills its reserved Phase 33V status note (§10).**
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K storage/auth/consent precondition design gate; the design this gate
  finalizes against the confirmed vocabulary (its §5 exit criteria, §6 record shapes,
  §7 boundary rules, §8 idempotency, §9 auth options, §10 consent options, §11 binding,
  §13 no-leak, §14 threat model). **Gains a minimal Phase 33V status note.**
- [`docs/ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)
  — Phase 33S decomposition gate; recorded the **D→E follow-on** (its §7 `:523-533`)
  this gate executes, and its `:499-504` "add a gate without adding evidence" framing.
  Read-only here; **not modified** (its existing Phase 33U status note already routes to
  Phase 33V).
- [`docs/ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)
  — Phase 33P storage/receipt hardening gate; its §6 `:353-354` "would add a gate
  without adding evidence" judgement grounds this gate's "finalize, not re-decompose"
  framing. Read-only; **not modified**.
- [`docs/ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)
  — Phase 33R bounded-ledger acceptance gate; its §4 proven list and the Phase 33Q
  ledger properties (process-local, non-durable, test-seam-only) this gate cites as
  *not* durable storage readiness. Read-only; **not modified**.
- [`docs/ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md)
  — Phase 33O route-spike acceptance gate (Storage Option A, dev/operator-only,
  disabled-by-default). Read-only; **not modified**.
- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I decomposition gate; its §5 prerequisite blocker ("all ↔ the Straylight
  review") was closed by the Phase 33U intake; its §6 lane ordering this chain executes.
  Read-only here; **not modified** (its existing Phase 33U status note already routes to
  Phase 33V).
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)
  — Phase 33J Straylight primitive-review request gate; its §5 fifteen-item register
  (A–O) is the register the Straylight response answered and Phase 33U reconciled.
  Read-only; **not modified**.
- [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  / [`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs)
  — the Phase 33E fixture validator and Phase 33L route-vector validator; both must stay
  green and unchanged (§10.2). Read-only; **not modified**.
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/` (`admitted-assertion-ledger.ts`,
  `classifier.ts`, `public-response.ts`, `no-leak.ts`, `auth-gate.ts`, `index.ts`), and
  `app/src/server.ts` — the Phase 33N spike and Phase 33Q ledger, inspected **read-only**
  to ground the §3 / §4 design decisions against the concrete synthetic shapes (the
  `assertion_superseded` label at `admitted-assertion-ledger.ts:890`, the inverse
  `superseded_by_assertion_id` at `:105`, the `recall_eligible` boolean at `:101,793,886`).
  **None is modified by this phase**; no draft marker is flipped.
- `loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md` — the Straylight
  primitive-review response (PR #65, merged); read **read-only** in the adjacent
  `../loa-straylight` checkout; **not modified.** Its §5 / §8 dispositions, §5.1
  (`assertion_superseded` re-relation), §5.2 (idempotency), §5.3 (ADR-022E) are the
  inputs Phase 33U reconciled and this gate's §3 carries forward.
- `@loa/straylight` — canonical primitive/substrate owner of the assertion lifecycle,
  recall-eligibility, signer/keyring, receipt/audit, and storage-adapter vocabulary. The
  durable estate store is gated by **ADR-022E** (gate #8 held); route guardrails by
  **ADR-026C / ADR-026D** (recall-intake seam only — a different seam from admission).
  **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (**verified merged on GitHub** 2026-06-06) —
  the cross-repo acceptance; its mirror/adapter proof is test-only, not exported, not
  runtime-wired, with no live Dixie call. Handed **no** new authorization by this gate.
  **Not edited by this phase.**
