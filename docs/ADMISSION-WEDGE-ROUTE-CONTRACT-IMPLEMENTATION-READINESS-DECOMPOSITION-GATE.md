# Phase 46B — Admission Wedge Route-Contract Implementation-Readiness Decomposition Gate

> **Phase**: 46B
> **Branch context**: `phase-46b-admission-route-contract-readiness-decomposition`
> **Related**: Phase 46A route-vector alignment acceptance (PR #146); Phase 33Z
> route-vector alignment (PR #144) + its PR #145 label/provenance correction;
> Phase 33X route-contract revision draft (PR #142); Phase 33Y route-contract
> revision acceptance (PR #143); Phase 33L route-contract test-vector draft
> (PR #130); the Dixie storage/auth/consent chain Phase 33K → 33U → 33V → 33W;
> Straylight (`@loa/straylight`) PR #65 (A–O primitive-review verdicts, merged);
> ADR-022E (durable-store gate #8, **held**), ADR-026C / ADR-026D route guardrails.
> **Status**: **docs / decision-only.** No source, test, route, route handler,
> storage, store code, DB write, migration, auth, consent, **route-vector JSON**,
> **route-vector validator**, **Phase 33E fixture / fixture validator**, config,
> env, package, lockfile, CI, generated, or live-integration change. No adjacent
> repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is a blocker-decomposition / lane-ordering gate, not route
> implementation.** It decomposes what still remains before any Admission Wedge
> route / API implementation could be authorized, records the readiness now
> accepted after Phase 46A, ranks the candidate next lanes, and selects the next
> safe readiness direction. It does **not** implement a route / API handler, **not**
> authorize production admission, **not** freeze the final route contract, **not**
> freeze the final schema, and **not** declare production readiness.

Every assessment below is grounded read-only against the actual Dixie repo (the
five route-vector JSONs, the route-vector validator, the route-vector README, the
Phase 46A acceptance gate, the Phase 33X/33Y/33Z gates, and the Phase 33K/33U/33V/33W
storage/auth/consent chain) and the Straylight (`@loa/straylight`) PR #65 verdicts
as already reconciled by Dixie Phase 33U. Where a claim could not be grounded
inside the read material, it is marked as such.

---

## 1. Status and scope

Phase 46B is the bounded **implementation-readiness decomposition gate** that
follows, and is named by, Phase 46A
([`ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-ACCEPTANCE-GATE.md)
§5, PR #146). Phase 46A accepted the Phase 33Z route-vector / validator alignment
(PR #144) and the PR #145 label/provenance correction, explicitly **did not**
accept implementation readiness, and **selected Phase 46B — Admission Wedge
route-contract implementation-readiness decomposition gate (docs / decision-only;
not runtime)** as the next lane. Phase 46B executes exactly that charter: it
decomposes the still-held blockers and route-owned questions into ordered,
separately-clearable lanes, decides the next safe direction, and stops.

Phase 46B:

- is **docs / decision-only** — it decomposes implementation-readiness blockers
  after Phase 46A and orders the future lanes;
- **does not implement** a route / API handler (the Phase 33N dev/operator-only,
  disabled-by-default spike remains the only authorized route surface);
- **does not modify** runtime source, the route-vector JSONs, the route-vector
  validator, the Phase 33E fixtures, the Phase 33E fixture validator, validators of
  any kind, vectors, storage, auth, consent, package exports, config / env, CI,
  migrations, generated files, or any adjacent repository (`loa-straylight`,
  `freeside-characters`);
- **does not freeze** the final route contract;
- **does not freeze** the final / canonical / production schema;
- **does not declare** production readiness of any kind.

> **A decomposition gate authorizes no runtime work.** Phase 46B makes the
> remaining work legible and orderable; it clears **no** production / durable-storage
> / auth / consent / Freeside / package-export / route-contract-freeze /
> schema-freeze gate. Every such gate stays held (§8). Its only output is this
> decision/status document; no cross-reference status note in another file was
> required (see §9).

---

## 2. Source chain

This gate sits one rung above the Phase 46A acceptance gate on the Dixie
route-contract ladder. It introduces no new contract or vector material; it
decomposes the blockers the chain has carried and orders them.

### Dixie (loa-dixie) — the route-contract / vector lanes

| Phase | PR | Artifact / contribution (relevant to implementation-readiness decomposition) |
|-------|----|------|
| 33L | #130 | **Route-contract test-vector draft.** Mapped the five Phase 33E probe scenarios into five docs/non-runtime route-contract test-vector JSONs + a dependency-free validator under `docs/admission-wedge/route-contract-test-vectors/`. The vectors carried the field `public_receipt_ref_policy` (the abstraction 33Z later collapsed). The vectors are JSON **test artifacts**, not a route-contract specification; PR #130 is the change that created them. |
| 33X | #142 | **Route-contract revision draft.** Standardized the public envelope on `public_receipt_ref` (`null` where none minted), fixed wedge-primitive vs host-layer request ID ownership, marked endpoint idempotency **Dixie-owned**, framed recall as a constrained Dixie projection of `RecallDisposition`, reframed supersession via `supersedes_refs` + `assertion_linked`, and adopted a two-part refusal taxonomy. Froze **no** schema; `route_contract_final: false`. |
| 33Y | #143 | **Route-contract revision-acceptance / vector-readiness gate.** Accepted 33X as a **draft baseline** (not final / frozen, not production-ready), decided vector-readiness = ready, and **selected Phase 33Z**. Mutated no vector / validator itself. |
| 33Z | #144 | **Route-vector alignment.** Replaced `public_receipt_ref_policy` with `public_receipt_ref` across the five vectors, strengthened the validator (retired-key lock, exact `safe_reason_code`, private-shape no-leak), added the `--self-check` negative-mutation harness, kept the five scenarios, left the Phase 33E fixtures untouched, and stayed non-runtime. |
| 33Z (corr.) | #145 | **Phase 33Z next-lane label/provenance correction.** Corrected the 33Z next-lane label from **Phase 34A** to **Phase 46A** because `34A` collides with the already-completed stack-wide Freeside Characters Phase 34A / PR #100. Label/provenance only — changed no vector / validator alignment, authorized no runtime, reopened no accepted 33Z scope. |
| 46A | #146 | **Route-vector alignment acceptance / implementation-readiness decomposition selector.** Accepted the 33Z alignment + PR #145 correction as a bounded, non-runtime route-vector / validator alignment; recorded what 33Z proved and did not prove; **did not** accept implementation readiness; and **selected this Phase 46B decomposition gate** as the next safe lane (46A §5). |
| **46B** | *(this doc)* | **Route-contract implementation-readiness decomposition gate.** Decomposes what remains before any route / API implementation can be authorized, ranks the candidate next lanes (§5), and selects the next safe readiness direction (§6). Mutates no vector / validator / fixture / source. |

> **PR-number provenance note.** Phase 46A's `#146` is taken from the merge commit
> `ea99a56a "docs: accept admission route vector alignment (#146)"` (git history),
> not from a PR number embedded in the 46A document body — the 46A doc refers to
> itself only as "this doc". The other PR numbers in this table (#130, #142, #143,
> #144, #145) are carried from the 46A §2 source-chain table and the gate documents
> themselves. Treat `#146` as git-sourced.

### Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts.** Straylight
  answered the Dixie primitive-review request across rows A–O. **Dixie Phase 33U
  reconciled that response**
  ([`ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  §4), dispositioning each row accepted / rejected / delegated: A, B, D, I, L, M, N
  accepted; C accepted except `assertion_superseded` **rejected / re-related** to
  `assertion_linked` + a `superseded` status via `supersedes_refs`; E/G/H/J/K
  delegated to Dixie projections with **endpoint idempotency Dixie-owned**; and
  rows F (production authority), G (production binding), J (final endpoint keying),
  and O (durable store under **ADR-022E gate #8**) **still held**. PR #65 clarified
  the *vocabulary / design* only; it cleared **no** independent production gate, and
  authorized **no** Dixie runtime implementation, production storage / auth /
  consent, or Freeside integration.
- **Dixie Phase 33U / 33V / 33W** — the chain that **reconciled the Straylight
  response** (33U) and **carried storage/auth/consent and route-readiness
  constraints forward**: 33V (PR #140) finalized the storage/auth/consent design,
  adopted `public_receipt_ref`, retired `receipt_public_ref`, and drew the
  private/public projection boundary; 33W (PR #141) rendered the route contract
  "more ready than 33H but NOT final/frozen" and defined the draft-update checklist
  33X executed. These constraints remain **held, not cleared**, and Phase 46B does
  not clear them.
- **Residual legacy marker prose** — Phase 46A recorded that the pre-correction
  `[E,G,H,K,N,O]` / `[J]` marker arrays still present inside some vector JSONs, the
  route-vector validator comments, and the Phase 33N classifier comments are
  **legacy textual debt only, not the current review-state authority**
  ([`ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-ACCEPTANCE-GATE.md:144-158`](ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-ACCEPTANCE-GATE.md)).
  The authoritative current-state classification lives in the route-vector README
  current-state correction
  ([`docs/admission-wedge/route-contract-test-vectors/README.md:147`](admission-wedge/route-contract-test-vectors/README.md)).
  Phase 46B preserves that distinction and does not mutate the technical artifacts.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the
> freeside-characters 34-/45-series, and Straylight's ADR / PR labels are
> independent labels in separate repositories and must not be conflated. The Dixie
> continuation past the exhausted `33` single-letter suffix space is labelled `46A`
> / `46B` purely to avoid reusing the completed stack-wide Freeside Characters
> Phase 34A / PR #100; `46B` signals **no** new product epoch and **no** scope
> expansion — it is the same Admission Wedge arc, still docs/decision-only.

---

## 3. Current accepted readiness

These facts are the readiness **already accepted** by Phase 46A (after the Phase
33Z alignment and the PR #145 correction), re-verified here by direct read-only
inspection of the five route-vector JSONs, the route-vector validator, and the
route-vector README before this decomposition. They are the baseline the §4
decomposition is measured against; none is changed by this gate.

1. **The 33Z route-vector / validator alignment is accepted as bounded and
   non-runtime** — Phase 46A accepted it as a correct, smallest-safe alignment to
   the accepted 33X / 33Y draft baseline and the source-real Phase 33N spike shape;
   it is a **test-artifact** alignment, not a runtime change.
2. **`public_receipt_ref_policy` was replaced by `public_receipt_ref`** — the
   vector-only policy abstraction (present in no source artifact) was collapsed into
   the source-real public-envelope field across all five vectors.
3. **Pending and malformed vectors use `public_receipt_ref: null`** —
   `candidate-pending-not-recallable.json` and
   `malformed-or-unsafe-payload-fail-closed.json` carry the literal `null`.
4. **Accept, reject, and supersede vectors use
   `"public_safe_receipt_reference_draft"`** —
   `accept-candidate-to-admitted-assertion.json`,
   `reject-candidate-no-assertion.json`, and
   `supersede-with-corrected-assertion.json` carry the draft public-safe placeholder
   string, never an operational `receipt_id`.
5. **Exactly five route-contract vectors remain** — the no-sixth-vector guard
   stands; the validator's `REQUIRED` set has exactly five entries.
6. **The route-vector validator enforces the aligned receipt field** —
   `public_receipt_ref` must be present in every public response; `null` scenarios
   must carry literal `null`, non-`null` scenarios a non-empty public-safe draft
   string.
7. **The route-vector validator rejects retired receipt keys** — both
   `public_receipt_ref_policy` and `receipt_public_ref` are rejected as object keys
   **at any depth** of a vector
   (`RETIRED_RECEIPT_KEYS = new Set(['public_receipt_ref_policy', 'receipt_public_ref'])`).
8. **The route-vector validator requires an exact `safe_reason_code`, including the
   literal `null`** — a missing property is **not** equivalent to `null`; each
   scenario's value must match exactly (malformed → `ingress.invalid_request`;
   reject → `admission_transition_denied_draft_non_final`; pending / accept /
   supersede → literal `null`, present not omitted). The dotted draft codes
   `admission.transition_denied`, `admission.unsupported_transition`, and
   `admission.duplicate_replay` are rejected on the public surface.
9. **The route-vector validator forbids private `TransitionReceipt` / `AuditEvent`
   / private receipt shapes on public response projections** — snake_case and
   camelCase (e.g. `transition_receipt`, `transition_id`, `audit_event`,
   `audit_event_class`, `audit_ref`, `receipt_ref`, `private_receipt_ref`, `signer`,
   `signature`, `policy_details`, `metadata`); only the public-safe
   `public_receipt_ref` (or its `null`) may cross to the public surface.
10. **The route-vector validator remains Node-built-ins-only, with no `app/` or
    `@loa/straylight` imports** — `node:fs`, `node:path`, `node:url` only; no DB /
    network / storage / env access.
11. **The validator `--self-check` exists and passes fail-closed** — five targeted
    negative mutations (nested `public_receipt_ref_policy`, omitted
    `safe_reason_code` on a `null`-code scenario, public `transition_receipt`,
    public `audit_event_class`, private `receipt_ref` on the public surface) are
    each rejected (5/5 fail closed).
12. **Phase 33E fixtures remain untouched** — the fixtures JSONs and their validator
    were not modified by 33Z (the fixtures validator was run and stays green).
13. **Phase 33E fixture spelling debt remains separately gated** — the
    `receipt_public_ref` vs `public_receipt_ref` two-spelling reconciliation on the
    Phase 33E fixture side is documented, deferred, and out of scope here
    (46A §3 / §4).
14. **PR #145 corrected the next-lane label from `34A` to `46A`** — a label /
    provenance-only correction (because `34A` collides with the completed stack-wide
    Freeside Characters Phase 34A / PR #100); it reopened no technical scope and
    authorized no runtime.
15. **Phase 46A accepted the 33Z vector / validator alignment but did not accept
    implementation readiness** — 46A explicitly did not accept 33Z as a final route
    contract, a final schema freeze, production readiness, or runtime-implementation
    readiness, and selected this decomposition gate rather than implementation.

> **What "accepted readiness" does and does not mean.** The accepted items above are
> **test-artifact and lane-sequence** alignments against a **draft** baseline. They
> do not constitute an accepted route contract, a frozen schema, a runtime
> serializer, or any cleared production gate. The decomposition in §4 exists
> precisely because the accepted readiness is bounded to the test surface.

---

## 4. Readiness decomposition

The Phase 46A §5 next-readiness decomposition named six candidate directions and
the still-held production blockers without ordering them into sub-gates. Phase 46B
expands that into the table below. Each row records a blocker / readiness area, the
current evidence, what remains unresolved, the decision needed before any
implementation, and the possible next lane that would own it. **Phase 46B closes
none of these rows — it orders them.** Where the read material yielded no in-repo
evidence for an area, the row says so explicitly rather than inventing a status.

| Blocker / readiness area | Current evidence | What remains unresolved | Needed decision before implementation | Possible next lane |
|---|---|---|---|---|
| **Final route-contract acceptance / freeze** | 33X / 33Y carry `route_contract_final: false`; 33W rendered it "more ready than 33H but NOT final/frozen"; 46A explicitly did not accept a final contract; 33V §7 marks the route contract held. | The contract as a whole is un-frozen; the route-owned questions (idempotency keying, dotted `admission.*` taxonomy, atomicity / rollback, production identity binding) are undecided. | Whether the route contract can be accepted / frozen, and on what evidence — a decision that must follow, not precede, the storage/auth/consent decomposition. | Final route-contract acceptance / freeze gate (Option A) — premature now. |
| **Final public response schema** | `public_receipt_ref` aligned across five vectors; `safe_reason_code` exact-match enforced; validator forbids private shapes on the public surface. | The vectors are not an executable schema; no field is frozen; the dotted public `admission.*` taxonomy is undecided. | Whether to freeze the public response schema, and which serializer enforces it. | Final route-contract / schema lane (with the serializer lane); premature now. |
| **Private `TransitionReceipt` / `AuditEvent` persistence boundary** | Straylight PR #65 row H accepted the split `SyntheticAuditRecord` → `AuditEvent` + `TransitionReceipt`; both are forbidden on public projections (validator `FORBIDDEN_PUBLIC_KEYS`). | Straylight has `AuditLog` / storage-adapter precedent, but Dixie's production Admission Wedge persistence binding for private `TransitionReceipt` / `AuditEvent` material remains undesigned, unauthorized, and not production-ready. | What durable substrate persists `TransitionReceipt` / `AuditEvent`, and how the public/private boundary is enforced at write time. | Storage/auth/consent blocker decomposition (Option B). |
| **Durable storage / ADR-022E gate** | 33K / 33U / 33V all mark the durable admission store **held behind ADR-022E gate #8**; only the in-process non-durable `BoundedEstateStore` and the Phase 33Q bounded synthetic ledger exist. | ADR-022E gate #8 is **still held**; no production durable admission store is designed or authorized; a separate gate-clearing ADR is required. | Whether ADR-022E gate #8 can be cleared, and what durable-store architecture clears it. | Storage/auth/consent blocker decomposition (Option B). |
| **Admitted-assertion persistence model** | 33V §4: canonical active `Assertion`; "admitted" is an outcome class, not a bare status; Dixie mirrors Straylight primitives. | The persistence / store for admitted assertions is undesigned (gated by ADR-022E). | Where and how admitted assertions are durably stored, keyed, and superseded. | Storage/auth/consent blocker decomposition (Option B). |
| **Candidate / proposed material persistence model** | 33K §6.1: the candidate record is a Dixie object; the raw candidate payload is a never-public / private-only category. | The storage substrate beyond the synthetic ledger is undesigned; raw-payload privacy is a design rule, not an implemented control. | Whether and how candidate / proposed material is persisted, with what retention and privacy controls. | Storage/auth/consent blocker decomposition (Option B). |
| **Endpoint idempotency / replay / conflict semantics** | Delegated to Dixie / the endpoint (PR #65 row J); 33K §8 sketches a key scope (tenant / estate / subject / transition-intent), identical-retry → same result, conflicting-retry → fail closed. | Final keying (candidate-id vs header vs both) and the precise replay / conflict semantics are **Dixie-owned and undecided** (still held in 33V). | The final idempotency key, replay envelope, and conflict response — Dixie-owned, route-contract-bound. | Final route-contract gate (semantics) + storage/auth/consent (wire) — sequenced after Option B. |
| **Signer / authority model** | 33K §9 auth options; admit / reject / supersede authority decided by `SignerCompetenceRule` / keyring / policy (not a fixed list); `policy_service` is a canonical `SignerType` member; `authority_binding_final: false`. | Production authority rules are **unresolved** (PR #65 row F still held); proposer authority is undesigned. | The production signer / authority binding model and how it is verified at admission time. | Storage/auth/consent blocker decomposition (Option B), with signer/authority as a named sub-area. |
| **Tenant / estate / actor identity binding** | `tenant_id` confirmed host-layer (not a Straylight primitive); `estate_id` / `actor_id` may be Straylight-owned / shared; dev-spike synthetic IDs only; `identity_binding_final: false`. | Production identity binding is **not finalized** (PR #65 row G still held); the `caller_actor_id` ↔ `subject_actor_id` relationship is unresolved; cross-user admission requires a consent model. | The production identity-binding rule (session-derived, no caller override) and the caller-vs-subject relationship. | Storage/auth/consent blocker decomposition (Option B). |
| **Service auth vs end-user authorization** | 33V §5: explicit boundary "service auth ≠ end-user consent"; 33K §9 auth options A/B production-capable, C dev-only, D rejected. | Production auth semantics are held; the final A-vs-B choice is deferred to the signer/authority review. | How a calling service authenticates **and** whether / how an end user is authorized — two distinct decisions. | Storage/auth/consent blocker decomposition (Option B). |
| **Consent proof / consent receipt** | 33K §10 consent options A (explicit artifact) / B (platform-mediated) production-capable, C (dev/operator omission marker) dev-only, D rejected; consent proof / receipt is a private-audit-only category. | The production consent model is **held**; cross-user / cross-tenant admission is blocked by default; public `remember-this` is blocked. | The consent model (or an explicit dev/operator-only omission) and the consent-receipt shape. | Storage/auth/consent blocker decomposition (Option B). |
| **Public / private projection serializer** | Projection semantics resolved (privacy-scope + frame-disposition rule); the validator enforces no-leak on the **vectors** only. | Phase 33N already has a bounded non-production public-response builder ([`app/src/services/admission-wedge-spike/public-response.ts:95`](../app/src/services/admission-wedge-spike/public-response.ts)) and guarded send path ([`app/src/routes/admission-intake.ts:247`](../app/src/routes/admission-intake.ts)); what remains unbuilt is the final production serializer and durable private/audit boundary (33K item K: "resolved semantically, serializer unimplemented"). Final-serializer enforcement is delegated to Dixie. | What runtime serializer enforces the public/private boundary, and how it is tested for no-leak. | Storage/auth/consent decomposition (boundary) → implementation-spike checklist (serializer). |
| **No-leak / public failure taxonomy** | Validator enforces `FORBIDDEN_PUBLIC_KEYS` + `FORBIDDEN_DRAFT_REASON_CODES`; `ingress.invalid_request` for malformed; `rejected_candidate` ≠ `denied_transition`. | The dotted public `admission.*` taxonomy and its HTTP-status mapping are undecided; final production serializer enforcement remains unbuilt only for the production route-contract path and durable private/audit boundary; Phase 33N's bounded non-production builder and guarded send path remain accepted spike evidence, not production readiness. | The final public failure taxonomy and its runtime enforcement point. | Final route-contract gate (taxonomy) + storage/auth/consent (serializer). |
| **Phase 33E fixture spelling debt** | 33Z explicitly left the Phase 33E fixtures and their validator untouched; 46A §3 records the `receipt_public_ref` vs `public_receipt_ref` two-spelling debt as separately gated and uncleared. | The fixture-side reconciliation is deferred; the readers found no fixture-side migration performed. *Verify against the live Phase 33E fixtures before asserting any specific spelling-state.* | Whether and when to migrate the Phase 33E fixture spelling in lockstep with its validator. | Further vector/fixture hardening (Option E) — optional. |
| **Residual legacy marker prose cleanup** | 46A §3 / §4: residual `[E,G,H,K,N,O]` / `[J]` marker prose in some vector JSONs, validator comments, and classifier comments is "legacy textual debt only, not current review-state authority"; the authoritative state lives in the route-vector README correction. | The cleanup has not been performed; it is textual debt, not a current contradiction. | Whether to schedule a docs-debt cleanup lane, or leave the marker prose as preserved-legacy with the README as the authority. | Further vector/fixture hardening / docs-debt lane (Option E) — optional. |
| **Route-vector and fixture alignment completeness** | The five route vectors are aligned (`public_receipt_ref`, validator + self-check green); 33Z scoped the alignment to the **vectors only**. | The Phase 33E fixture side was not aligned to the revised vocabulary (33Z left fixtures untouched). | Whether the fixtures must be re-aligned to the revised vocabulary, and in what lane. | Further vector/fixture hardening (Option E) — optional. |
| **Freeside Characters client-contract handoff** | 33V §5 / §7: the Freeside handoff / integration is held / deferred "until the Dixie contract matures"; the Dixie probe ↔ freeside adapter coupling is test-only, not exported, not runtime-wired. | The handoff is deferred; no design lane is open; it is blocked until the route contract matures and Dixie ownership / auth / storage boundaries settle. | Whether (and how) to hand the accepted draft contract to freeside-characters as a client contract — only after Dixie ownership settles. | Freeside client-contract handoff (Option D) — premature now. |
| **Observability / telemetry / audit boundary** | 33K §6 defines an Audit/private category and an Operational-logging (Dixie) category; audit overexposure is a named threat (33K §14). | No dedicated observability / telemetry design lane exists in the read material beyond the audit-boundary privacy rule — **describe as open.** | What runtime telemetry / audit boundary is permitted, and how it avoids leaking private material. | Storage/auth/consent decomposition (audit boundary) — partial coverage. |
| **Rollback / kill-switch / default-off gate** | 33K §15 exit criteria require a rollback / failure policy and a kill-switch posture **drafted before** any spike-authorization gate; dev auth / consent options are disabled-by-default. | Phase 33M/33N provide spike-scoped default-off and fail-closed posture; production rollback, durable-store recovery, migration/backfill, and production deployment controls remain open. | The rollback / partial-failure plan, the kill-switch posture, and the default-off gate for any future spike or route. | Implementation-spike readiness checklist (Option C) — after Option B. |
| **Production deployment readiness** | 33K §20 + 33V §7 mark production readiness held across the board. | Entirely held; no production lane is authorized by any phase. | The full production-readiness checklist — far downstream of this gate. | Production-readiness gate — blocked until storage/auth/consent + spike lanes clear. |
| **Migration readiness** | 33V §4: "migration / backfill / rollback undesigned." | Undesigned; depends on the durable store / ADR-022E decision. | The migration / backfill / rollback plan for any durable admission schema. | Storage/auth/consent decomposition (depends on durable store) — open. |
| **Package export / API stability** | 33K §20 blocks package exports. | No package-export work is authorized; no dedicated API-stability design exists in the read material — **describe as open.** | Whether any Admission Wedge surface becomes a stable exported API, and under what versioning policy. | A future API-stability gate — blocked. |
| **Security review / cross-repo review** | Straylight PR #65 (merged) answered the A–O **primitive-vocabulary** review; 33K §14 threat model (14 threats); 33V §10 cross-repo ownership boundaries. | A production security / cross-repo **runtime** review has not been performed; PR #65 was a vocabulary review, not a runtime security audit. | Whether a production security / cross-repo review is required before implementation, and who owns it. | Stop / cross-repo review (Option F) — available at any point. |

> Every blocker above blocks **implementation**; **none** blocks a further
> **docs/decision** phase. The decomposition is therefore safe: the blockers are
> numerous and unresolved, but all are addressable in docs/decision lanes before
> any build. The clustering is the same the chain has carried — **storage ↔
> idempotency ↔ rollback**, **auth ↔ consent ↔ identity binding**, and **all ↔ the
> Straylight review** (now answered by PR #65, with the independent production gates
> still held) — which is why §5 ranks the storage/auth/consent decomposition above
> a premature contract freeze or a premature spike.

---

## 5. Decision options

Phase 46B considers and ranks the six candidate next lanes Phase 46A named (46A §5).
For each: what it would prove, what it would **not** prove, and why it is or is not
the right immediate next step. **Runtime implementation is not a candidate option —
no artifact accepted so far proves implementation is safe (§3, §8).**

### Option A — Final route-contract acceptance / freeze gate

- **What it would prove:** that the route contract (request / response envelopes,
  refusal taxonomy, idempotency keying, identity binding, atomicity / rollback) is
  complete and stable enough to accept and freeze.
- **What it would not prove:** that the held production blockers (durable storage /
  ADR-022E, production auth / consent, production identity binding, production
  signer / authority) are cleared — a frozen contract over unresolved storage / auth
  / consent semantics would freeze the wrong shape and force rework.
- **Why not now:** **premature.** 33W / 33X / 33Y deliberately kept the contract a
  *draft baseline*; the route-owned questions (idempotency keying, dotted taxonomy,
  identity binding) cannot be finalized while the storage / auth / consent semantics
  they depend on are still held. Freezing first inverts the dependency order.

### Option B — Storage/auth/consent blocker decomposition

- **What it would prove:** an ordered, independently-clearable decomposition of the
  held ADR-022E durable-store gate, the production service-auth model, the end-user
  authorization / consent model, the consent proof / receipt boundary, the
  tenant / estate / actor identity binding, the signer / authority model, and the
  public/private audit boundary — i.e. exactly the cluster every other lane depends
  on.
- **What it would not prove:** it would not by itself freeze the route contract,
  implement a serializer, or authorize a spike — it decomposes and sequences the
  blockers; it does not clear them.
- **Why it is the right next step:** the storage / auth / consent cluster is the
  upstream dependency for the contract freeze (A), the spike checklist (C), and the
  Freeside handoff (D). Decomposing it first is the lowest-blast-radius docs/decision
  action that makes every downstream lane legible without committing to any runtime
  or freeze. **Selected (§6).**

### Option C — Implementation-spike readiness checklist

- **What it would prove:** the exact evidence that would be required before
  extending past the existing Phase 33N dev/operator-only, disabled-by-default spike.
- **What it would not prove:** that the storage / auth / consent blockers the
  checklist would reference are themselves decomposed — the checklist would be
  built on undecomposed dependencies and would have to be rewritten once they are.
- **Why not now:** **premature.** A spike-readiness checklist is most useful *after*
  the storage / auth / consent blockers are decomposed (Option B), so the checklist's
  exit criteria reference concrete sub-gates rather than an undifferentiated cluster.

### Option D — Freeside Characters client-contract handoff

- **What it would prove:** what a downstream client (freeside-characters) may rely on
  once a Dixie contract is accepted.
- **What it would not prove:** that Dixie has settled route ownership, the auth /
  storage boundary, and the contract shape a client would bind to.
- **Why not now:** **premature.** A client cannot bind to an unaccepted,
  storage/auth-unsettled, reconciliation-bound contract; the handoff is blocked until
  Dixie route ownership and the auth / storage boundary settle (Option B → then A).

### Option E — Further vector / fixture hardening

- **What it would prove:** additional vector strictness, the Phase 33E fixture
  two-spelling migration (`receipt_public_ref` → `public_receipt_ref` with the
  fixtures validator updated in lockstep), or residual legacy-marker-prose cleanup.
- **What it would not prove:** it would not resolve any production blocker — the
  vectors are already aligned and green; this is optional polish.
- **Why not now:** **optional, not blocking.** Phase 46B finds no concrete technical
  debt in the vectors that blocks decomposition; the fixture spelling debt and the
  marker prose are documented-and-deferred textual debt, not decomposition blockers.
  Available later if a concrete need arises.

### Option F — Stop / cross-repo review

- **What it would prove:** a Straylight or freeside-characters review checkpoint
  before any further Dixie lane.
- **What it would not prove:** it would not advance the Dixie decomposition; the
  primitive-vocabulary review (A–O) is already answered (PR #65) and reconciled (33U).
- **Why not now:** **not required as the immediate step.** The cross-repo vocabulary
  question is already answered; a further stop is available at any point but is not
  the highest-leverage next action. (A production security / cross-repo runtime review
  remains a valid downstream gate — see §4.)

**Ranking:** **B ≻ A ≈ C ≻ D ≻ E ≻ F** for *immediacy*. Option B is the upstream
dependency for A, C, and D; A and C are premature until B decomposes their
dependencies; D is premature until A; E is optional polish; F is available but not
the highest-leverage immediate step.

---

## 6. Selected next lane

> **Selected: Phase 46C — Admission Wedge storage/auth/consent blocker decomposition
> gate (docs / decision-only; not runtime).**

**Reason:**

- Phase 46B must **not** jump to runtime implementation — no artifact accepted so
  far proves implementation is safe (§3, §8).
- A **final route-contract freeze (Option A) is premature** while the storage / auth
  / consent blockers remain unresolved: the route-owned questions (idempotency
  keying, dotted taxonomy, production identity binding) depend on storage / auth /
  consent semantics that are still held (ADR-022E gate #8 held; production auth /
  consent held; production identity binding held).
- An **implementation-spike readiness checklist (Option C) is premature** if the
  production blockers it would reference are not first decomposed — its exit criteria
  would otherwise reference an undifferentiated cluster.
- A **Freeside client handoff (Option D) is premature** while Dixie route ownership
  and the auth / storage boundary remain unsettled.
- **Further vector hardening (Option E) is optional** unless Phase 46B finds a
  concrete technical debt that blocks decomposition — it found none.
- **Storage/auth/consent blocker decomposition (Option B)** is therefore the safest
  next docs/decision-only step before implementation readiness: it is the upstream
  dependency for every other lane and the lowest-blast-radius way to make the held
  blockers legible and orderable without committing to any runtime, freeze, or spike.

**Caveat (surfaced, not suppressed).** Phase 46C decomposes and orders the storage /
auth / consent blockers; it does **not** clear ADR-022E gate #8, implement storage /
auth / consent, or authorize a route. Decomposing the cluster is a docs/decision
action whose output is a sub-gate plan, not a cleared gate. A later, separately-gated
phase must clear each sub-gate on its own evidence.

**Documented alternative.** If a reviewer judges the route contract mature enough that
a **final route-contract acceptance / freeze gate (Option A)** should run first, that
is recorded here as the documented alternative — but Phase 46B does **not** select it,
because freezing the contract over unresolved storage / auth / consent semantics
inverts the dependency order. **Runtime implementation is not selected under any
option.**

---

## 7. Phase 46C scope if selected

Because §6 selects the storage/auth/consent blocker decomposition, Phase 46C is
bounded as:

> **Phase 46C — Admission Wedge storage/auth/consent blocker decomposition gate.
> Docs / decision-only.**

**Allowed scope**

- docs / decision-only;
- **decompose** the held blockers into ordered, independently-clearable sub-gates:
  durable storage (the ADR-022E gate #8 dependency), service authentication, end-user
  authorization, consent proof / consent receipt, tenant / estate / actor identity
  binding, signer / authority, and the public/private audit boundary;
- **decide what must be true** before any route / API implementation or any
  implementation-spike readiness checklist can be authorized;
- record the dependency ordering among the sub-gates and the exit criteria for each.

**Blocked scope (Phase 46C must not do any of these)**

- no runtime implementation;
- no migrations;
- no DB writes;
- no package exports;
- no Freeside runtime / client integration;
- no clearing of ADR-022E gate #8 (decomposition ≠ gate-clearing);
- no auth / consent implementation;
- no route / API handler;
- no route-contract or schema freeze;
- no production readiness claim.

**Required evidence to exit Phase 46C:** an ordered sub-gate plan for durable
storage, service auth, end-user authorization, consent proof / receipt, identity
binding, signer / authority, and the audit boundary — each with its own exit
criteria — consistent with the Straylight PR #65 verdicts as reconciled by Phase
33U, and a decision on what must be true before any implementation or spike checklist
can be authorized.

---

## 8. Blocked lanes

Phase 46B is a bounded, docs/decision-only decomposition / lane-ordering gate. It
authorizes **none** of the following; each remains **blocked** and is **not**
unblocked by decomposing the readiness blockers or selecting Phase 46C:

- route / API handler implementation **beyond the existing Phase 33N spike**;
- production admission;
- durable Admission Wedge storage implementation (ADR-022E gate #8 held);
- DB writes;
- migrations;
- auth implementation;
- production auth / consent implementation;
- public `remember-this`;
- Discord command / history ingestion;
- user chat becoming memory;
- Freeside Characters runtime / client integration;
- package exports;
- the final Dixie route contract;
- route-contract freeze;
- production route deployment;
- production readiness of any kind;
- final / production schema freeze;
- LLM / voice;
- Finn production wiring;
- forget / revoke / correction UI;
- final idempotency semantics (Dixie / endpoint-owned; undecided);
- production signer / authority semantics;
- production tenant / estate / actor identity binding.

> **Decomposition does not authorize runtime implementation.** Ordering the held
> blockers and selecting Phase 46C makes the remaining work legible; it does **not**
> finalize or freeze the route contract, **not** clear any production gate, and
> **not** authorize any route / storage / auth / consent / Freeside / package-export
> work. The Phase 33N dev/operator-only, disabled-by-default spike remains the only
> authorized route surface.

Phase 46B also does **not**: mutate any route-vector JSON, the route-vector
validator, the Phase 33E fixtures, or the Phase 33E fixture validator; mutate any
runtime source; change any config, env, package, lockfile, CI, or generated file;
flip any draft marker (`route_contract_final`, `idempotency_final`,
`identity_binding_final`, `straylight_primitive_review_complete`, etc. stay
`false`); or edit the adjacent `loa-straylight` / `freeside-characters`
repositories.

If a later phase reaches for any of the above, it must re-open the Phase 33X / 33Y
revision gates, the Phase 33Z alignment, the Phase 46A acceptance gate, this
decomposition gate, the Phase 33K / 33U / 33V / 33W storage/auth/consent chain, and
the relevant ADRs (ADR-022E durable-store gate; ADR-026C / ADR-026D route
guardrails) first; it must not silently expand scope.

---

## 9. Validation

All commands were run from the repository root
(`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46B is docs/decision-only — it
adds only this document and mutates no vector, validator, or fixture — so the
validators are run only to confirm the unchanged artifacts remain green. The
validation set:

```bash
git status --short --branch --untracked-files=all
git diff --name-status
git diff --stat
git diff --check
# Nothing-staged check (this lane stages nothing):
git diff --cached --name-status
# Untracked new doc fence/whitespace sanity:
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md || test "$?" = "1"
# Unchanged-artifact green-check (no mutation here):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# Self-reference / next-lane label checks (grep -E so `|` is real alternation):
grep -E "Phase 46B|Phase 46C" docs/ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md || true
# Negative check — fail if any affirmative readiness/freeze/implementation claim
# appears in PROSE. Fenced validation-command lines (which contain the needle
# strings as command text) are excluded, so the check cannot self-match and is
# enforcing (raises SystemExit(1) on a real prose hit — no `|| true`).
python3 - <<'PY'
from pathlib import Path
p = Path("docs/ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md")
needles = [
    "runtime implementation is selected",
    "implementation is authorized",
    "route contract is frozen",
    "schema is frozen",
    "production ready",
]
fence = chr(96) * 3
inside_fence = False
hits = []
for idx, line in enumerate(p.read_text().splitlines(), 1):
    stripped = line.strip()
    if stripped.startswith(fence):
        inside_fence = not inside_fence
        continue
    if inside_fence:
        continue
    low = line.lower()
    if any(needle in low for needle in needles):
        hits.append((idx, line))
if hits:
    for idx, line in hits:
        print(f"{idx}: {line}")
    raise SystemExit(1)
print("No affirmative runtime/production/freeze prose claims found outside fenced validation commands.")
PY
# Fence-balance check (dependency-free; even count = balanced):
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

Recorded results for this lane:

- **docs-only scope check** — only the single new file
  `docs/ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`
  is added; no route-vector JSON, route-vector validator, Phase 33E fixture, fixture
  validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI,
  migration, runtime, or generated file is touched;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no
  `git add` / commit / push);
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator
  reports **5/5 probes valid, 0 failures**; the route-contract test-vector validator
  reports **5/5 vectors valid, 0 failures, no sixth vector**; the `--self-check`
  negative-mutation harness reports **5/5 mutations fail closed**;
- **self-reference label check** — the `grep -E "Phase 46B|Phase 46C"` check uses
  real alternation and confirms both the `Phase 46B` (self) and `Phase 46C`
  (next-lane) labels are present;
- **negative readiness-claim check** — the `python3` check scans every line,
  **excludes lines inside fenced code blocks** (so the validation-command text that
  contains the needle phrases cannot self-match), and raises `SystemExit(1)` if any
  affirmative readiness / freeze / implementation phrase appears in prose. It reports
  **"No affirmative runtime/production/freeze prose claims found outside fenced
  validation commands."** — i.e. **no prose affirmative runtime / production / freeze
  claim** is present. The phrases that do appear in prose are **negated** occurrences
  (e.g. "runtime implementation is … NOT selected", "the route contract is … not
  frozen"), which the needle list does not match;
- **fence-balance check** — the dependency-free `node -e` fence counter reports an
  **even (balanced)** triple-backtick count; the single fenced block is the
  validation command list above, with no unterminated code fence.

---

## 10. Success criteria for Phase 46B

Phase 46B succeeds if and only if:

1. **Docs / decision-only** — it creates only this Phase 46B document; it changes
   **no** route-vector JSON, route-vector validator, Phase 33E fixture, fixture
   validator, runtime source, test, route, store, migration, auth, consent, config,
   env, package, lockfile, CI, or generated file, and edits **no** adjacent
   repository.
2. **Source chain recorded** — the 33L #130 → 33X #142 → 33Y #143 → 33Z #144 →
   label-fix #145 → 46A #146 → 46B chain, plus the Straylight PR #65 / 33U / 33V /
   33W upstream context and the residual-legacy-marker-prose status, is summarized
   (§2).
3. **Current accepted readiness recorded** — the fifteen §3 facts (the `public_receipt_ref`
   rename, the five vectors, the strengthened validator, the `--self-check` harness,
   the untouched fixtures, the PR #145 label correction, and the 46A
   not-implementation-ready stance) are recorded as the baseline.
4. **Readiness decomposed** — the blockers / readiness areas are decomposed into a
   table with current evidence, what remains unresolved, the needed decision, and
   the possible next lane (§4), closing none of them.
5. **Options ranked** — the six candidate next lanes (A–F) are analyzed for what each
   would and would not prove, and ranked (§5), with runtime implementation excluded.
6. **Next lane selected** — Phase 46C (storage/auth/consent blocker decomposition,
   docs/decision-only) is selected with reasoning, the documented alternative (Option
   A) recorded, and runtime implementation explicitly not selected (§6, §7).
7. **Blocked lanes preserved** — no production / durable / public / Freeside /
   package / schema-freeze / auth / consent / route-contract-freeze / runtime lane is
   authorized (§8).
8. **No freeze, no production-readiness claim** — Phase 46B freezes neither the route
   contract nor the schema, and declares no production readiness (§1, §8).

---

## 11. Cross-references

- [`docs/ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-ACCEPTANCE-GATE.md)
  — Phase 46A acceptance gate (PR #146); its §3 acceptance assessment and §4 key
  facts seed §3, and its §5 next-readiness decomposition selected and named this
  Phase 46B gate.
- [`docs/ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 33Z alignment gate (PR #144) + its PR #145 label/provenance correction;
  the `public_receipt_ref` rename, the strengthened validator, and the `--self-check`
  harness recorded in §3.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-DRAFT.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-DRAFT.md)
  — Phase 33X route-contract revision draft (PR #142); the draft baseline whose
  route-owned questions (idempotency keying, taxonomy, identity binding) §4 carries
  forward as unresolved.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-ACCEPTANCE-GATE.md)
  — Phase 33Y revision-acceptance / vector-readiness gate (PR #143); accepted 33X as
  a draft baseline and selected 33Z.
- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I, the structural archetype for this decomposition gate (blocker
  inventory → dependency ordering → named lanes → next-lane decision → blocked
  lanes).
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K storage/auth/consent precondition design; its record categories, auth
  options (A/B/C/D), consent options, and exit criteria seed the §4 storage / auth /
  consent rows and the Phase 46C scope (§7).
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U Straylight-response intake; the A–O reconciliation (PR #65 answered;
  rows F / G / J / O still held) that grounds §2 and the §4 held-blocker rows.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V storage/auth/consent design finalization; the `public_receipt_ref`
  adoption, the `receipt_public_ref` retirement, the private/public projection
  boundary, and the held production blockers recorded in §4.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  — the route-vector README, whose current-state correction is the authoritative
  classification of the residual legacy marker arrays (§2, §4).
- `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  and the five vector JSONs — inspected **read-only** to ground §3 (the aligned
  receipt field, the retired-key lock, the exact-`safe_reason_code` rule, the
  `FORBIDDEN_PUBLIC_KEYS` no-leak set, the Node-built-ins-only posture, and the
  `--self-check` harness). None is modified.
- `@loa/straylight` — canonical primitive / substrate owner of the assertion
  lifecycle and vocabulary; PR #65 (merged) answered the A–O primitive review.
  ADR-022E (durable-store gate #8, **held**), ADR-026C, ADR-026D are Straylight-repo
  decision records cited as guardrails.
