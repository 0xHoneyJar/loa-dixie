# Phase 46J — Admission Wedge Consent / Storage Vector & Validator Alignment Gate

> **Phase**: 46J
> **Branch context**: `phase-46j-admission-consent-storage-vector-alignment`
> **Related**: Phase 46I durable-store design + ADR-022E gate #8 decision (PR #154,
> [`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
> §13 step 6 / §9 / §12 criterion 8, which selected and scoped this gate); Phase 46H consent
> proof / receipt (PR #153,
> [`ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
> §9); Phase 46G auth / identity / signer authority (PR #152,
> [`ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
> §8); Phase 46F durable storage shape & route-vector alignment (PR #151,
> [`ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md)
> §8 / §11 / §13 criterion 8); Phase 46E durable storage model decision (PR #150); Phase 46D
> storage/auth/consent acceptance (PR #149); Phase 46C blocker decomposition (PR #148); Phase
> 46B route-contract implementation-readiness decomposition (PR #147); Phase 46A route-vector
> alignment acceptance (PR #146); Phase 33Z route-vector alignment (PR #144) + its PR #145
> next-lane label/provenance correction; Phase 33Y route-contract revision acceptance (PR
> #143); Phase 33X route-contract revision draft (PR #142); Phase 33V storage/auth/consent
> design finalization (PR #140); Phase 33U Straylight-response intake (PR #139); Phase 33R
> bounded-ledger acceptance (PR #136); Phase 33Q bounded synthetic admitted-assertion ledger
> (PR #135); Phase 33P storage/receipt hardening (PR #134); Phase 33N dev/operator-only route
> spike; Phase 33L route-contract test-vector fixture draft; Straylight (`@loa/straylight`)
> PR #65 (A–O primitive-review verdicts, **merged**); Straylight-repo ADR-022E durable-store
> gate #8 (and related gates #10 / #12 / #20), **held**; Straylight-repo ADR-022D
> MVP-persistence / audit-owner invariants; ADR-026C / ADR-026D route guardrails;
> freeside-characters Phase 45J / PR #177 (Dixie v1 mirror-refresh acceptance, merged
> 2026-06-06).
> **Status**: **non-runtime vector/validator alignment.** This gate adds **this document** and
> makes a **narrow, additive, non-runtime change to the route-vector validator** (and its
> README) **only**. It changes **no** route-vector JSON, **no** Phase 33E fixture or fixture
> validator, and **no** runtime source, test, route, route handler, storage, store code, DB
> write, migration, auth, consent, package export, config, env, package, lockfile, CI,
> generated file, or binary. No adjacent repository (`loa-straylight`, `freeside-characters`)
> is touched.
> **This is a consent/storage route-vector / validator *alignment* gate, not implementation.**
> It discharges the documented, accumulated **no-leak hardening debt** that Phases 46F / 46G /
> 46H / 46I each *recorded but did not close*: the **canonical** Straylight ref-array / signer
> / receipt / audit key names and the **consent / auth** key-name family were **absent** from
> the validator's public-surface forbidden-key set, so a future durable-store serializer could
> surface one of them under a short, safe-looking value that the value-pattern walls would not
> catch. Phase 46J adds those **exact key names** to `FORBIDDEN_PUBLIC_KEYS` (snake_case **and**
> camelCase) and extends the `--self-check` harness to prove the new coverage **fails closed**.
> It does **not** implement storage, **not** author or apply a migration, **not** authorize DB
> writes, **not** clear the Straylight-repo ADR-022E durable-store gate #8, **not** change the
> route handler, **not** change auth, **not** implement consent, **not** authorize production
> admission, **not** freeze the route contract, and **not** freeze the final schema.

Every assessment below is grounded read-only against the actual Dixie repo (the Phase 46E /
46F / 46G / 46H / 46I gates, the Phase 33P / 33Q / 33R storage lane, the Phase 33U / 33V chain,
the **five** route-vector JSONs, the route-vector validator and its README, the Phase 33N
spike source under `app/src/services/admission-wedge-spike/`) and read-only against the
**canonical** Straylight (`@loa/straylight`) substrate (`types.ts`, `storage/types.ts`, and
`docs/decisions/ADR-022D…` / `ADR-022E…`). Where a claim could not be grounded in the read
material, it is marked as such. The **one** technical artifact this gate changes — the
route-vector validator — was inspected before change, changed narrowly and additively, and
re-validated green after change (§13).

---

## 1. Status and scope

Phase 46J is the bounded **non-runtime consent/storage vector/validator alignment gate** that
follows, and is named by, Phase 46I
([`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
§13 step 6 / §10.3, PR #154). Phase 46I selected "a docs/decision-only, **non-runtime
consent/storage vector/validator alignment gate** (discharging the §9 no-leak hardening debt —
adding the canonical ref-array / signer / receipt / audit / consent key-name forbidden-key
hardening to `FORBIDDEN_PUBLIC_KEYS` and the `no-leak.ts` runtime mirror, still
no-leak-bounded, no runtime)" as the next lane, "to precede the durable-store
implementation-readiness decomposition gate + ADR-022E gate-#8-clearing ADR" (46I §13 step 6).
Phase 46J executes exactly that charter, with one deliberate scoping refinement recorded in §6
and §9: the **runtime** `no-leak.ts` mirror hardening is **deferred** to a future runtime lane,
because this lane is **non-runtime** and the charter forbids modifying runtime source. Only the
**non-runtime** route-vector validator is hardened here.

**Verdict.** Phase 46J:

- is a **non-runtime vector/validator alignment** lane — its outputs are this document, a
  narrow additive validator change (`FORBIDDEN_PUBLIC_KEYS` + `--self-check`), and the matching
  README update; it **changes no route-vector JSON** (§9);
- is **not docs-only** — unlike Phase 46F (which *recorded* the canonical-ref-array gap and
  changed nothing), Phase 46J **closes** the recorded gap in the non-runtime validator, because
  the gate that selected it (46I §13 step 6) scoped exactly that work and docs-only would not
  discharge the debt (§4, §9);
- is **not storage implementation** — no durable store, schema, table, store code, or storage
  write is created;
- is **not migration authorization** — no migration is authored, applied, or authorized;
- is **not auth or consent implementation** — no auth, identity binding, signer authority, or
  consent is built; the consent/auth key NAMES are added to a denylist, which is the opposite
  of implementing them;
- is **not production admission** — the Phase 33N dev/operator-only, disabled-by-default spike
  remains the only authorized route surface;
- is **not a route-contract freeze** and **not a final schema freeze**.

Phase 46J additionally:

- **does not clear** the Straylight-repo ADR-022E durable-store gate #8 (or the related held
  gates #10 / #12 / #20) — hardening a denylist is not clearing a gate;
- **does not author a durable data model, schema, or migration**;
- **does not freeze the physical durable adapter placement** (Dixie / Finn / sibling runtime),
  which Phase 46E / 46I left unresolved under ADR-022E gate #8;
- **does not modify** runtime source, the route handler, the route-vector JSONs, the Phase 33E
  fixtures, the Phase 33E fixture validator, package exports, config / env, CI, migrations,
  generated files, binaries, or any adjacent repository;
- **does not declare** production readiness of any kind.

> **A validator hardening authorizes no runtime work.** Phase 46J makes the non-runtime
> route-vector validator forbid *more* on the public surface — the canonical and consent key
> NAMES a future durable store/serializer must never emit publicly. It builds no store, freezes
> no schema, applies no migration, clears no gate, and implements no auth or consent. A later,
> separately-gated phase must still (a) author the durable data model / schema / migration plan,
> (b) clear ADR-022E gate #8 with a gate-clearing ADR that preserves the ADR-022D receipt /
> audit-chain invariants, (c) add the matching **runtime** `no-leak.ts` mirror hardening, and
> (d) only then authorize any build.

---

## 2. Source chain (evidence intake)

This gate sits one rung above the Phase 46I durable-store design / ADR-022E gate #8 decision on
the Dixie route-contract ladder. It introduces no new contract or vector material; it consumes
the accumulated public/private no-leak boundary decisions from Phases 46F / 46G / 46H / 46I, the
five existing route vectors and their validator, the Phase 33N/33Q spike source, and the
canonical Straylight substrate to discharge the recorded forbidden-key hardening debt.

### 2.1 Dixie (loa-dixie) — the storage / auth / consent and route-contract lanes

| Phase | PR | Artifact / contribution (relevant to the consent/storage key-name hardening) |
|-------|----|------|
| 33L | #130 | **Route-contract test-vector fixture draft.** Authored the five non-runtime route-contract vectors + validator under `docs/admission-wedge/route-contract-test-vectors/`; preserves the five Phase 33E scenarios (no sixth); carries the unresolved-review markers and storage/auth/consent draft assumptions. |
| 33N | #132 | **Dev/operator-only route spike.** `POST /api/admission/intake`, disabled-by-default, **Storage Option A** (no durable store). Public response built **purely from the classification** (`public-response.ts:95-116`); runtime no-leak guard mirrors the validator denylist (`no-leak.ts:22-76`). |
| 33P–33R | #134–#136 | **Storage / receipt hardening → bounded synthetic ledger → acceptance.** Selected Option B (synthetic store), rejected production-like durable storage; named the validator's `FORBIDDEN_PUBLIC_KEYS` / denylist as the boundary a store-backed projection must satisfy; accepted the Phase 33Q ledger as a bounded, non-production, test-seam-only synthetic proof. |
| 33U | #139 | **Straylight-response intake.** Reconciled PR #65 A–O verdicts. Rows **F / G / J / O** held. Row B: `admitted` is a public `outcome_class`, never a status; the canonical `active` `Assertion` is Straylight's; Dixie holds **ingress refs only**. ADR-022E gates #8 / #10 / #12 / #20 held. |
| 33V | #140 | **Storage/auth/consent design finalization.** Split `SyntheticAuditRecord` → `AuditEvent` + `TransitionReceipt`; adopted `public_receipt_ref`, retired `receipt_public_ref`; drew the private/public projection boundary on `privacy_scope` + frame disposition; a consent artifact lives on the **private audit record only**. |
| 33W–33Z | #141–#144 | **Route-contract readiness / revision / vector alignment.** Standardized `public_receipt_ref` (`null` where none minted); pinned the source-real refusal taxonomy; aligned the five vectors + validator and added the `--self-check` negative-mutation harness; `route_contract_final: false`. |
| 33Z (corr.) | #145 | **Next-lane label/provenance correction** (34A → 46A). |
| 46A–46D | #146–#149 | **Vector-alignment acceptance → impl-readiness decomposition → blocker decomposition → acceptance.** Judged the storage/auth/consent cluster the upstream dependency; decomposed it into ordered, separately-clearable sub-gates; selected Phase 46E (durable storage model) as the deepest-blocker per-area gate. |
| 46E | #150 | **Durable storage model decision.** Selected the §6 model direction (current-state projection + append-only hash-chained audit log on the canonical Straylight semantics/interfaces); left the storage **shape** undecided; selected Phase 46F. |
| 46F | #151 | **Durable storage shape & route-vector alignment.** Recorded the storage-shape ↔ vector mapping **docs-only**; first **recorded the canonical-ref-array hardening gap** — `supersedes_refs` / `linked_assertion_refs` **absent** from `FORBIDDEN_PUBLIC_KEYS` — as future work (46F §8 / §9 point 4 / §11 / §13 criterion 8), changing no vector/validator. Selected the auth gate. |
| 46G | #152 | **Auth / identity / signer authority decision.** Retained the dev/operator-only Option C spike posture; recorded production candidates (Option A bearer JWT, Option B signed envelope); decided session-derived identity binding with no caller override. **Extended the recorded gap** to the canonical signer/receipt/audit key NAMES `signer_refs` / `audit_event_ref` / `receipt_hash` / `audit_hash` / `policy_decision_ref` / `assertion_refs` / `target_refs` / `previous_audit_hash`, and the consent/auth NAMES `consent` / `consent_ref` / `auth_decision`, all **absent** from both denylists (46G §8). Selected the consent gate. |
| 46H | #153 | **Consent proof / receipt decision.** Decided service auth ≠ consent; consent is never inferred from chat; a production consent artifact lives on the **private audit record only**; decomposed the consent-proof object model (draft); recorded the 10-case consent failure taxonomy. **Extended the recorded gap** to the full canonical **consent** key-name family `consent` / `consent_ref` / `consent_proof` / `consent_receipt` / `consent_subject` / `consent_grantor` / `consent_scope` / `auth_decision`, all **absent** from both denylists (46H §9). Selected the durable-store / ADR-022E gate, with an **optional preceding non-runtime consent vector/validator alignment lane** once the §5 object model is accepted. |
| 46I | #154 | **Durable-store design & ADR-022E gate #8 decision.** Selected Option 4 (split storage) as the safest topology *direction*; decomposed 14 durable records; recorded the 11-item §12 exit checklist (incl. criterion 8 — public/private projection hardening adding the canonical key-name forbidden-key set); confirmed `recall_eligible` is **derived, never persisted authority**. **Selected this Phase 46J non-runtime consent/storage vector/validator alignment gate** as the next lane to **discharge the §9 no-leak hardening debt** (46I §13 step 6 / §10.3), noting "adding those keys strengthens, never weakens, the no-leak boundary" (46I §9). |
| **46J** | *(this doc)* | **Consent/storage vector & validator alignment gate.** Records the source chain (§2) and accepted facts (§3); inventories the accumulated forbidden-key debt and answers the five-vector sufficiency / sixth-vector / vector-JSON / validator-hardening / public-private questions (§4–§8); **decides to close the recorded gap in the non-runtime validator (additive `FORBIDDEN_PUBLIC_KEYS` + `--self-check`), change no vector JSON, and defer the runtime `no-leak.ts` mirror** (§9); fixes `recall_eligible` derived and `expected_private_or_audit_effect` as documentation evidence (§10); restates the required invariants (§11) and exit criteria (§12); records the exact change + validation (§13); selects the next lane (§14); preserves the blocked lanes (§15). Changes **no** vector JSON, **no** fixture, **no** runtime source. |

> **PR-number provenance note.** The PR numbers above are taken from the local git merge-commit
> history (`docs: … (#NNN)` subjects) and the Phase 46A–46I source-chain tables. Phase 46I's
> `#154` is the merge commit `8a29d8f4 "docs: add Admission Wedge durable store ADR gate
> (#154)"`. Treat the PR numbers as git-sourced rather than as authority embedded in the gate
> bodies (each gate refers to itself only as "this doc").

### 2.2 Canonical Straylight substrate (`@loa/straylight`) — read-only

The canonical key names this gate denylists are **Straylight-owned** vocabulary, read-only here
to ground which names a future Dixie serializer must never surface publicly. The adjacent
`loa-straylight` repo is the canonical evidence (Dixie's mirror is parity evidence only, never
canonical proof — 46E §2.2 / 46F §2.2).

- **Canonical `Assertion`** carries `status` (incl. `active` / `superseded`), `supersedes_refs`,
  `linked_assertion_refs`, `privacy_scope`, and `recall_scope`
  (`loa-straylight/src/straylight/types.ts:145-167`). The supersession relation is carried as
  **`supersedes_refs` on the corrected (active) assertion**, not a pair of bidirectional id
  fields (46F §8).
- **Canonical `TransitionReceipt`** is a first-class discriminated type (`kind` ∈ `admission` /
  `denied` / `challenge` / `revocation` / `forget`), carrying `transition_id`,
  `audit_event_ref`, `signer_refs`, `reasons`, `metadata`, and `receipt_hash`
  (`types.ts:364-388`). **Canonical `AuditEvent`** carries `previous_audit_hash` + `audit_hash`
  (the per-estate hash chain) plus `transition_id` / `assertion_refs` / `signer_refs` /
  `policy_decision_ref` (`types.ts:514-529`). These are the **private** records — a production
  consent artifact lives on the private audit record only (33V §5; 46H §6.3 / §6.4).
- **The candidate subject maps to canonical `subject_refs`** (46G §5.1: the candidate's subject
  maps to canonical `subject_refs`, never a coined `subject_actor_id`).
- **Straylight-repo ADR-022E durable-store gate #8 is held.** "Production database / persistence
  substrate" is gate #8: `InMemoryStorage` and `JsonlStorage` are the MVP adapters, and **a
  separate ADR** must propose the production adapter and **preserve the ADR-022D receipt and
  audit-chain invariants** (`loa-straylight/docs/decisions/ADR-022E-phase-22-deferred-features.md:57`).
  PR #65 cleared none of these gates.

### 2.3 Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts, reconciled by 33U.** PR #65
  clarified the *vocabulary / design* only; it cleared **no** independent production gate and
  authorized **no** Dixie runtime, production storage / auth / consent, or Freeside integration.
  The still-held rows are **F, G, J, and O** (33U §4.1); the unresolved review rows carried on
  every vector are **E, G, H, K, N, O** and the review-dependent row **J**.
- **Residual legacy marker prose.** The `[E,G,H,K,N,O]` / `[J]` marker arrays in the vector
  JSONs and the spike classifier comments (`classifier.ts:73-74`) are **preserved legacy
  vector/runtime markers, not the current review-state authority**; the authoritative
  classification lives in the route-vector README current-state correction (its §7). Phase 46J
  preserves that distinction and mutates **no** vector JSON and **no** marker.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the freeside-characters
> 34-/45-series, and Straylight's ADR / PR labels are independent labels in separate
> repositories and must not be conflated. `46J` signals **no** new product epoch and **no**
> scope expansion — it is the same Admission Wedge arc, still non-runtime.

---

## 3. Starting accepted facts

These are facts **already accepted** by the chain (46F §3 / 46G §3 / 46H §3 / 46I §3), re-verified
read-only here as the baseline the §4–§9 decision is measured against. None is changed by this
gate except where §9 explicitly hardens the validator.

1. **The model direction and shape are decided; the durable store is not built.** Phase 46E
   selected the model direction; Phase 46F aligned the shape onto the vectors docs-only; Phase
   46I selected Option 4 (split storage) as the topology *direction*. No durable store, schema,
   table, or migration exists; the Phase 33Q ledger is synthetic, process-local, and non-durable
   (`admitted-assertion-ledger.ts:28-32`).
2. **There are exactly five route-contract vectors and one validator; both are green and
   non-runtime.** The validator requires exactly the five scenarios and rejects a sixth
   (`validate-route-contract-test-vectors.mjs:134-140`, `:776-779`); it imports nothing from
   `app/`, Straylight, or the fixture validator and touches no DB / network / storage / env
   (README §10). Before this gate's change, all five vectors validated, the no-sixth check
   passed, and the `--self-check` harness reported 5/5 fail-closed (re-confirmed at §13 before
   and after the change).
3. **The public surface already carries exactly the model's public projection.** Each vector's
   `expected_public_response` carries an `outcome_class`, a status **class** label where
   applicable (`admitted_assertion_status_class` / `active_assertion_status_class` = `active`;
   `candidate_state_class` = `proposed`), `public_receipt_ref` (a public-safe DRAFT string where
   minted, `null` where none), `recall_eligible`, a `recall_use_instruction_public_signal` (where
   applicable), `safe_reason_code`, and `rendered_candidate_payload: false`. The single field
   that legitimately crosses from the private side to the public side is **`public_receipt_ref`**
   (or its `null`) — never a private receipt id, signer ref, audit ref, or consent material (46G
   §8; 46H §6.1).
4. **The accumulated forbidden-key hardening debt is documented across four gates.** Each of 46F
   / 46G / 46H / 46I recorded — as a "known hardening gap, not a current leak" — that the
   validator's `FORBIDDEN_PUBLIC_KEYS` does **not** denylist a growing set of **canonical** and
   **consent** key NAMES:
   - 46F §8 / §11: the canonical `Assertion` ref arrays `supersedes_refs` / `linked_assertion_refs`;
   - 46G §8: the canonical `TransitionReceipt` / `AuditEvent` refs and hash-chain links
     `signer_refs` / `audit_event_ref` / `receipt_hash` / `audit_hash` / `previous_audit_hash` /
     `policy_decision_ref` / `assertion_refs` / `target_refs`, plus the consent/auth names
     `consent` / `consent_ref` / `auth_decision`;
   - 46H §9: the full consent family `consent` / `consent_ref` / `consent_proof` /
     `consent_receipt` / `consent_subject` / `consent_grantor` / `consent_scope` / `auth_decision`;
   - 46I §3 fact 7 / §9 / §12 criterion 8: all of the above, restated as the debt the **next lane
     (this gate)** would discharge.
   This gate verified that inventory **empirically** against the actual validator source before
   acting (§4).
5. **The gap is latent, not a live leak.** The fixed public-response builder
   (`buildAdmissionSpikePublicResponse`, `public-response.ts`) emits **none** of these fields, so
   there is no present serializer path that could surface them; and the validator's value-pattern
   walls (UUID / long-hex / opaque-run / JWT / Bearer; `:231-259`, `:510-523`) catch operational
   *values* of any novel shape. Only a **short, safe-looking value under one of those exact key
   NAMES** would slip the key check — which is exactly the residual risk the four gates flagged
   and this gate closes for the non-runtime validator.
6. **`expected_private_or_audit_effect` is documentation evidence, not validator-enforced.** The
   validator does not validate the contents of that block (it is unreferenced in
   `collectVectorFailures`), and the public-surface walk **excludes** it
   (`:467-475`); the canonical refs (`signer_refs`, `audit_event_ref`, `receipt_hash`,
   `audit_hash`, `policy_decision_ref`) legitimately live there as private draft *intent*. Phase
   46J **preserves** this (46F §10): it adds **no** enforcement of that block's contents, and the
   forbidden-key additions apply **only** to the public surface, never to that excluded private
   block (§10).
7. **`recall_eligible` is derived, never persisted authority.** A lossy, per-request projection
   over the durable inputs (assertion status, transition history, relationships); supersession
   flips the prior to `superseded` / `recall_eligible: false`
   (`admitted-assertion-ledger.ts:880-887`). The canonical substrate models recall via
   `Assertion.recall_scope` + status, not a persisted eligibility bit (46E §6; 46F §7; 46I §8
   item 10 / §11 invariant 15). Phase 46J adds none and persists none.

> **What "accepted facts" do and do not mean.** These are **spike-posture, synthetic-ledger,
> design-vocabulary, and vector-surface** facts. They do not constitute a durable store, a frozen
> schema, a runtime production serializer, or any cleared production gate. The §4–§9 decision
> exists precisely because the accepted readiness is bounded to the dev/spike/synthetic surface
> and the vectors are non-runtime drafts.

---

## 4. Is the existing five-vector / validator surface sufficient for consent/storage alignment?

The charter's first questions: are the existing **five** route vectors sufficient for
consent/storage alignment, is consent/storage cross-cutting across them or does it need a sixth
vector, and does the route-vector JSON need to change? This section answers the **vector**
questions; §9 answers the **validator** question.

### 4.1 The five scenarios remain correct and complete for the Admission Wedge

The five scenarios cover the five Admission Wedge outcomes, and each already exercises the full
public/private boundary for its consent/storage elements:

| # | Scenario | Consent/storage-relevant boundary already exercised |
|---|----------|------------------------------------------------------|
| 1 | **pending candidate not recallable** | `public_receipt_ref: null`, empty recall, `recall_eligible: false`; candidate is not an assertion (private intent only). |
| 2 | **accepted candidate → admitted assertion** | `admitted_assertion_status_class: "active"`; admit chain in the private block; `public_receipt_ref` minted (public-safe draft). |
| 3 | **rejected candidate → no assertion** | `outcome_class: "denied"`, source-real `safe_reason_code`; `no_admitted_assertion: true` (private); rejection terminal for recall. |
| 4 | **supersession / correction** | corrected active included, superseded prior excluded in recall; provenance retained (private); Dixie-local id pair forbidden public. |
| 5 | **malformed / unsafe payload fails closed** | `outcome_class: "refused"`, `safe_reason_code: "ingress.invalid_request"`, `must_fail_closed: true`; zero residue. |

These five outcomes are unchanged by adding consent/storage as a concern: consent and storage are
**not a sixth outcome** — they are **cross-cutting properties of all five** (the same five
transitions, now each additionally subject to "was there a valid consent proof?" and "what
durable/private records result?"). The validator's no-sixth-vector check
(`validate-route-contract-test-vectors.mjs:776-779`) and the strong precedent of exactly five
vectors therefore stand unchanged.

### 4.2 Consent/storage is cross-cutting, not a distinct outcome ⇒ no sixth vector

> **Decision: no sixth vector.** Consent/storage produces **no genuinely distinct route
> outcome** beyond the five (pending / accept / reject / supersede / malformed). A
> missing/invalid/mismatched/expired/revoked consent in a future production model **fails closed**
> — which collapses onto the existing **refused / denied** outcomes (the malformed/unsafe
> fail-closed vector and the denial vector), not onto a new sixth outcome class. The Phase 46H
> §7 consent failure taxonomy (10 cases) is a **private** decision taxonomy that maps to
> fail-closed public outcomes already represented; it does not mint a new public outcome. A
> distinct durable/private *effect* (a consent receipt on the private audit record) is **private**
> and belongs in the excluded `expected_private_or_audit_effect` block, not in a new public
> vector. Adding a sixth vector would therefore (a) violate the no-sixth-vector invariant for no
> outcome gain, and (b) risk pulling private consent material onto a public test surface — the
> opposite of the no-leak goal. **The strong preference against a sixth vector holds.**

### 4.3 Route-vector JSON does not need to change

> **Decision: change no route-vector JSON.** The five vectors already represent the public
> projection correctly and carry the consent/storage draft assumptions
> (`storage_auth_consent_assumptions`, `request_vector.{auth,consent,storage}_assumption`, the
> `consent_implemented` / `auth_implemented` / `storage_writes_performed` `false` flags). There
> is **no missing public field** to add and **no misplaced field** to move. Crucially, the
> consent/storage alignment work that *is* justified (§9) is a **denylist** hardening — it
> concerns key names that must **never** appear on the public surface, so the correct
> representation of every one of them is their **continued absence** from the vector JSON. Adding
> any of them to a vector — even as a synthetic placeholder — would be a no-leak regression.
> Docs-only at the **vector** layer is therefore not merely sufficient but **required**: the
> vectors must stay clean of these names. (This is why §9's validator hardening is verified to
> keep all five vectors green — they contain none of the added names; §13.)

---

## 5. The accumulated forbidden-key debt (empirically re-grounded)

Before deciding the validator question (§9), this gate re-grounded the four gates' recorded debt
**against the actual validator source**, rather than relying on the prose. The findings:

- **`FORBIDDEN_PUBLIC_KEYS` (pre-46J) already denylists** the operational-id families
  (`tenant_id` / `estate_id` / `*_actor_id` / `candidate_id` / `…assertion_id` /
  `admission_transition_id` / the Dixie-local supersession id pair
  `supersedes_assertion_id` / `superseded_by_assertion_id`), the private
  `TransitionReceipt` / `AuditEvent` / receipt families (`transition_receipt(_ref)` /
  `transition_id` / `audit_event(_class)` / `audit_ref` / `audit_id` / `receipt_ref` /
  `private_receipt_ref` / `receipt_id`), the signer/authority material (`signer` / `signature` /
  `signature_material` / `authority_signature(_material)` / `authority_signer_type_draft` /
  `authority_scope_draft` / `policy_details` / `policy_reason`), the raw material
  (`candidate_payload` / `raw_candidate_payload(s)` / `source_material(s)` / `metadata`), and
  the backing/secrets (`idempotency_key(_draft)` / `tokens` / `secrets` / `urls` /
  `stack_trace(s)` / `storage_internal(s)` / the retired receipt spellings)
  (`validate-route-contract-test-vectors.mjs:272-420`).
- **It did NOT denylist** (all **absent** from `:272-420` before this gate):
  - **canonical Assertion ref arrays** — `supersedes_refs`, `linked_assertion_refs`;
  - **canonical TransitionReceipt / AuditEvent refs + hash-chain links** — `signer_refs`,
    `audit_event_ref`, `receipt_hash`, `audit_hash`, `previous_audit_hash`,
    `policy_decision_ref`, `assertion_refs`, `target_refs`;
  - **canonical candidate-subject mapping** — `subject_refs`;
  - **consent / auth-decision family** — `consent`, `consent_ref`, `consent_proof`,
    `consent_receipt`, `consent_subject`, `consent_grantor`, `consent_scope`, `auth_decision`.
- **Empirical no-collision verification.** Before adding these keys, this gate verified that
  **none** of them appears as an object key — anywhere, public surface or otherwise — in any of
  the five current vector JSONs. The only public-surface keys that *share a prefix* with the
  added consent/auth names are `request_vector.auth_assumption` and
  `request_vector.consent_assumption`; because the validator matches keys by **exact**
  `Set.has()` (`:481`), the bare `consent` / `auth_decision` additions do **not** match those
  legitimate draft markers. Adding the keys is therefore **purely additive** — the five vectors
  still validate clean (confirmed §13).

This is the residual risk the four gates flagged: the value-pattern walls catch operational
*values* of any novel shape, but a **short, safe-looking value under one of these exact key
NAMES** (e.g. `"consent": "granted_draft"`, `"signer_refs": ["s_a"]`) would slip the key check.
Closing that residual key-name gap in the non-runtime validator is precisely the work Phase 46I
§13 step 6 selected this gate to do.

---

## 6. Public / private boundary (preserved and strengthened)

The charter requires that public vectors/responses must **not** leak raw consent proof, raw
storage record, private proof / TransitionReceipt / AuditEvent material, signer secrets, auth
headers, service tokens, private identity-binding details, raw candidate/source material, or
debug traces; public-safe receipt references may remain narrow and synthetic only. Phase 46J
**preserves** this boundary and **strengthens** it:

- **The single legitimate public crossing remains `public_receipt_ref`** (a public-safe DRAFT
  string where minted, or `null`) — and, per 46H §6.1, *at most* a single opaque public-safe
  consent receipt reference could ever cross in a future model, disjoint from `public_receipt_ref`
  and carrying no grantor/subject/signer/proof material. No raw consent proof, storage record,
  private receipt/audit material, signer secret, auth header, service token, identity-binding
  detail, raw candidate/source material, or debug trace may cross. This is unchanged.
- **Phase 46J strengthens the boundary by forbidding more, never less.** The added keys are
  forbidden **only** on the public surface (`publicSurface()` excludes
  `expected_private_or_audit_effect` and `must_not_include`; `:467-475`). The private block —
  where the canonical `signer_refs` / `audit_event_ref` / `receipt_hash` / `audit_hash` /
  `policy_decision_ref` legitimately live as draft intent — is **untouched** by the new
  forbidden-key check. So the hardening makes a leak **harder** and a legitimate private draft
  marker **no less expressible**.
- **Runtime mirror deferred (explicitly, safely).** Phase 46G / 46H / 46I noted the runtime
  `no-leak.ts` denylist (`:22-76`) mirrors the validator's `FORBIDDEN_PUBLIC_KEYS`. The selecting
  charter (46I §13 step 6) named both the validator **and** the `no-leak.ts` runtime mirror.
  Phase 46J hardens **only** the non-runtime validator, because:
  1. this lane is **non-runtime** and the task constraints forbid modifying runtime source / the
     route handler;
  2. the runtime gap is **latent, not live** — `buildAdmissionSpikePublicResponse` emits none of
     these fields, and the runtime value-pattern walls (`no-leak.ts:82-110`) catch operational
     *values* of any novel shape, so no present runtime path can surface them;
  3. adding the runtime mirror is correctly sequenced with the future runtime durable-store lane
     that begins emitting canonical/consent refs internally — that is where the mirror's matching
     fixtures and behavior belong (46F §11; 46I §12 criterion 8).
  This gate **records** the deferral explicitly (§9, §12, §14) so it is not mistaken for a
  completeness claim about runtime enforcement.

---

## 7. `recall_eligible` remains derived / non-authoritative

Carried unchanged from 46E §6 / 46F §7 / 46I §8 item 10 / §11 invariant 15:

- `recall_eligible` is a **lossy, per-request projection** over durable inputs (assertion status,
  transition history, relationships, request filters, privacy frame, risk), not a stored fact;
  the same durable state can yield different recall outcomes for different request contexts.
- The durable inputs are persisted; the eligibility is **derived at read time**. Persisting it as
  canonical authority would drift from the assertion `status` it derives from, bake one request
  context's answer into durable state, and risk leaking a recall decision that should be
  recomputed under the caller's frame.
- The vectors already encode this correctly: `recall_eligible` appears as a public **derived
  signal** alongside `recall_use_instruction_public_signal` / `_policy` marked `…review_dependent`
  (recall-eligibility *representation* is the unresolved review row **E**). **Phase 46J persists
  none, adds none, and changes no vector field** — the validator hardening concerns only
  forbidden public *keys*, not `recall_eligible`.

---

## 8. `expected_private_or_audit_effect` remains documentation evidence (not over-claimed)

Carried unchanged from 46F §5 / §10 / 46I §11 invariant 2:

- The validator does **not** validate the contents of `expected_private_or_audit_effect` (it is
  unreferenced in `collectVectorFailures`), and the public-surface leak walk **excludes** it
  (`:467-475`). It is **vector-side documentation evidence** of intended private/audit behavior
  (e.g. the reject vector's `no_admitted_assertion: true`), **not** validator-enforced
  public-response behavior.
- **Phase 46J does NOT change this.** It adds forbidden public *keys*; it adds **no** enforcement
  of the private block's contents and makes **no** claim that the private block is now validated.
  The canonical refs (`signer_refs`, `audit_event_ref`, `receipt_hash`, `audit_hash`,
  `policy_decision_ref`) remain legitimately expressible inside that excluded private block as
  draft intent — the new forbidden-key check fires **only** on the public surface. This gate is
  careful not to **overclaim** validator enforcement that does not exist (the Phase 46F §10
  finding is preserved verbatim in intent).

---

## 9. The decision: harden the non-runtime validator (additively), change no vector JSON, defer the runtime mirror

Phase 46J's core charter question: does the route-vector validator need hardening, and if so,
how — keep the keys as documented latent debt, add exact-key denylist coverage, add only
documentation, or defer to ADR-022E gate-clearing work?

> **Decision.** **Add exact-key denylist coverage to the non-runtime route-vector validator** for
> the canonical ref-array / signer / receipt / audit key names and the consent/auth key-name
> family, and **extend the `--self-check` harness to prove the new coverage fails closed**.
> **Change no route-vector JSON** (§4.3). **Defer the runtime `no-leak.ts` mirror** to the future
> runtime durable-store lane (§6).

**Why hardening now (and not "documented latent debt" / "docs-only" / "defer to gate-clearing"):**

1. **The selecting gate scoped exactly this.** Phase 46I §13 step 6 / §10.3 selected "a
   non-runtime consent/storage vector/validator alignment gate **that WOULD extend the
   vectors/validator with the §9 canonical ref-array/signer/receipt/audit/consent key-name
   forbidden-key hardening**, still no-leak-bounded, no runtime." Leaving it as documented debt
   (the 46F posture) would **not discharge** what 46I selected this lane to do. Phase 46F's
   docs-only choice was correct **for 46F** (a shape-mapping gate); it is not correct for a gate
   explicitly chartered to close the debt.
2. **It only strengthens the boundary.** 46I §9: "adding those keys strengthens, never weakens,
   the no-leak boundary." The change forbids **more** on the public surface and **less** never;
   it cannot introduce a leak or loosen any guarantee.
3. **It is purely additive and verified safe.** Every added key is verified **absent** from the
   public surface of all five current vectors (§5), so all five **still validate clean** (§13).
   Exact-key matching (`Set.has`) means the bare `consent` / `auth_decision` additions do **not**
   over-match the legitimate `consent_assumption` / `auth_assumption` public draft markers — and
   the `--self-check` harness now **proves** this with two `no-overmatch` cases (§13).
4. **It is executable and proven fail-closed.** The charter requires that if validator hardening
   is added, the self-check is updated so the new hardening is **executable and proven
   fail-closed**. Phase 46J adds **37** new negative-mutation cases — **one per added forbidden
   key**, covering every added family's snake_case **and** camelCase spelling exhaustively (not
   merely a representative per family) — that each assert the validator fails closed, **plus** the
   two `no-overmatch` cases. The full harness reports **44/44** (42 fail-closed + 2 non-over-match)
   (§13).
5. **It stays strictly non-runtime.** The change touches only
   `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
   (Node-built-ins-only, not imported by any route or runtime) and its README. **No** runtime
   source, route handler, storage, migration, config, package, lockfile, CI, or generated file is
   touched; **no** vector JSON and **no** Phase 33E fixture is touched. The runtime `no-leak.ts`
   mirror is **deferred** (§6) — recorded explicitly, not silently.

**Exact change (full detail in §13).** Into `FORBIDDEN_PUBLIC_KEYS`
(`validate-route-contract-test-vectors.mjs`), added the snake_case **and** camelCase spellings of:
`supersedes_refs`, `linked_assertion_refs`, `signer_refs`, `audit_event_ref`, `receipt_hash`,
`audit_hash`, `previous_audit_hash`, `policy_decision_ref`, `assertion_refs`, `target_refs`,
`subject_refs`, `consent`, `consent_ref`, `consent_proof`, `consent_receipt`, `consent_subject`,
`consent_grantor`, `consent_scope`, `auth_decision`. Extended `SELF_CHECK_CASES` with 37
fail-closed cases (one per added forbidden key — every snake_case and camelCase spelling) + 2
`no-overmatch` cases; the self-check loop now handles a `mode: 'no-overmatch'` that asserts a
clean result. Updated the validator's header doc-block and the
route-vector README §10 / §11 to describe the new behavior.

> **What this gate does NOT do.** It does **not** add a sixth vector; **not** change any vector
> JSON; **not** add enforcement of `expected_private_or_audit_effect` contents; **not** persist or
> add `recall_eligible`; **not** harden the runtime `no-leak.ts` mirror (deferred); **not** freeze
> the route contract or final schema; and **not** clear ADR-022E gate #8.

> **Preservation guarantee.** Because Phase 46J changes **no** vector JSON, **all** existing
> vector guarantees are preserved byte-for-byte: the five scenarios, the no-sixth-vector check,
> the pre-existing `FORBIDDEN_PUBLIC_KEYS` entries, the substring / regex / UUID / opaque-run
> walks, the retired-token lock, the per-scenario `safe_reason_code` taxonomy, the
> `public_receipt_ref` string-or-null draft rule, the unresolved-review markers, and the
> draft/non-final flags all stand unchanged. The only change to enforcement is **strictly
> additive** (more public-surface keys forbidden), re-verified green in §13.

---

## 10. What is, and is not, now a validator-enforced constraint

For the future durable-store lane, after Phase 46J:

**Now validator-enforced (non-runtime, on the public surface):**

- The pre-existing public/private boundary (`publicSurface()` excludes the private block;
  `:467-475`), the private `TransitionReceipt` / `AuditEvent` / receipt / signer / metadata /
  idempotency / id families, the `public_receipt_ref` string-or-null draft rule + retired-token
  lock, the source-real refusal taxonomy, the UUID / opaque-run value walls, the non-final
  flags, the unresolved-review markers, and the no-sixth-vector lock — **all unchanged**.
- **NEW (Phase 46J):** the **canonical** Assertion ref arrays (`supersedes_refs` /
  `linked_assertion_refs`), the **canonical** TransitionReceipt / AuditEvent refs + hash-chain
  links (`signer_refs` / `audit_event_ref` / `receipt_hash` / `audit_hash` /
  `previous_audit_hash` / `policy_decision_ref` / `assertion_refs` / `target_refs`), the
  canonical subject mapping (`subject_refs`), and the **consent / auth** family (`consent` /
  `consent_ref` / `consent_proof` / `consent_receipt` / `consent_subject` / `consent_grantor` /
  `consent_scope` / `auth_decision`) are forbidden as public-surface object keys at any depth,
  snake_case and camelCase — proven fail-closed by `--self-check`.

**Still NOT validator-enforced (recorded honestly, not overclaimed):**

- The **runtime** `no-leak.ts` mirror does **not** yet forbid these canonical/consent key names
  (deferred to the future runtime durable-store lane; §6). The non-runtime validator hardening
  does **not** imply runtime enforcement.
- The `expected_private_or_audit_effect` block contents remain **unvalidated** documentation
  evidence (§8) — Phase 46J adds no enforcement there.
- The value-pattern walls remain the catch-all for operational *values*; the new key-name
  coverage closes the *short-safe-value-under-a-canonical-key-name* residual, not a value-shape
  gap (there was none).

---

## 11. Required invariants preserved

Phase 46J preserves **all** of the following (each already enforced in synthetic / spike / vector
form where cited; the durable model must carry it forward unchanged):

1. **A pending candidate is not recallable.** pending vector: empty recall, `recall_eligible:
   false`, `public_receipt_ref: null`.
2. **A rejected candidate creates no admitted assertion.** reject vector:
   `expected_private_or_audit_effect.no_admitted_assertion = true`.
3. **An accepted candidate creates / references an admitted assertion.** accept vector:
   `admitted_assertion_status_class = "active"`,
   `candidate_to_transition_to_assertion_chain_intent = true`.
4. **A superseded assertion is excluded from ordinary recall unless explicitly
   requested/marked.** supersede vector includes the corrected active, excludes the superseded
   prior; supersession flips the prior to `superseded` / `recall_eligible: false`
   (`admitted-assertion-ledger.ts:880-887`).
5. **A malformed / unsafe payload fails closed.** malformed vector: `outcome_class = "refused"`,
   `safe_reason_code = "ingress.invalid_request"`, `must_fail_closed = true`.
6. **Missing / unauthorized auth fails closed** (future production model); not implemented here
   (46G).
7. **Missing / invalid consent fails closed** in any future production admission model; consent
   is never inferred from chat (46H §4.5); not implemented here.
8. **Public responses leak no raw / private / audit / debug / source / auth / signer / consent /
   storage material.** Enforced by the public-surface walk + `FORBIDDEN_PUBLIC_KEYS` (now
   **strengthened** with the canonical/consent key names) + substring/regex/UUID/opaque-run walks
   (`:477-523`).
9. **Private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains
   private.** Forbidden on the public surface at any depth; legitimately expressible only in the
   excluded private block.
10. **User chat does not become memory merely because it was said.** No Discord / freeform
    ingestion, no user-chat-as-memory path (46H §4.5 / §4.6).
11. **Public `remember-this` remains blocked.** No public / unauthenticated `remember-this`
    surface is designed or authorized.
12. **Discord / freeform history ingestion remains blocked.** Unchanged.
13. **Production admission / storage / auth / consent remain blocked.** ADR-022E gate #8 held;
    `storage_writes_performed` / `auth_implemented` / `consent_implemented` /
    `production_admission` all `false` on every vector.
14. **Route-contract freeze and final schema freeze remain blocked.** `route_contract_final` /
    `schema_final` `false` on every vector; Phase 46J freezes neither.
15. **ADR-022E gate #8 remains uncleared.** Phase 46J is not the gate-clearing ADR and clears
    nothing.
16. **`recall_eligible` remains derived / non-authoritative; never persisted as canonical
    authority** (§7).
17. **Auditability without rewriting history.** The audit log is append-only, hash-chained, and
    tamper-detectable (`loa-straylight/.../storage/types.ts:6-13`, `:64-67`; ADR-022D `:120`).

---

## 12. Exit criteria for any future implementation lane

A future lane may begin durable storage **implementation** only after **all** of the following
are produced and accepted. Phase 46J satisfies **none** of these (it is a non-runtime validator
hardening); they are the bar a downstream lane must clear (carried from 46F §13 / 46I §12,
updated for what 46J discharges):

| # | Exit criterion | Owning future gate |
|---|----------------|--------------------|
| 1 | **Accepted durable data model** (records persisted vs derived vs projected, keys, indexes), consistent with the 46E §6 shape / 46I §7 split topology. | Durable-store design gate + ADR-022E gate-#8-clearing ADR. |
| 2 | **Accepted migration plan, or an accepted dev-only no-migration scope.** | Durable-store design gate. |
| 3 | **Accepted idempotency / replay semantics** (final key, replay envelope, conflict response). | Route-contract idempotency decision (Row J). |
| 4 | **Accepted tenant / estate / actor identity binding** (production, session-derived; no caller override). | Auth / identity / signer gate (Row G; 46G). |
| 5 | **Accepted auth / consent references** (service-auth model; consent proof/receipt on the private audit record only). | Auth gate + consent gate (Row F; 46G / 46H). |
| 6 | **Accepted public / private response projection** (the production no-leak serializer enforcing `privacy_scope` + frame disposition), **including the matching runtime `no-leak.ts` key-name hardening** that Phase 46J added to the non-runtime validator (the deferred runtime mirror; §6). | No-leak serializer design gate. |
| 7 | **Accepted rollback / partial-failure behavior** (atomicity, recovery). | Durable-store design gate. |
| 8 | **Executable tests / fixture vectors planned** for the durable model (extending the existing vectors / `--self-check`, still no-leak-bounded). The **canonical / consent key-name forbidden-key hardening is now done in the non-runtime validator (Phase 46J)**; the remaining work is the runtime mirror (criterion 6) and executable durable-model fixtures. | Implementation-spike readiness checklist. |
| 9 | **Codex audit acceptance before PR** of the durable-store design / implementation. | The implementing lane's review/audit gate. |

> Exiting Phase 46J authorizes **no** runtime implementation. It hardens the non-runtime
> validator, records the decision (§9), the invariants (§11), and the criteria above; the build
> remains blocked until a future, separately-gated lane satisfies them.

---

## 13. Validation

All commands were run from the repository root
(`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46J makes a narrow, additive, non-runtime
change to the route-vector validator + its README and adds this document; it changes **no** vector
JSON and **no** Phase 33E fixture. The validators are run to confirm (a) the five vectors **still
validate clean** under the additive change and (b) the new key-name hardening + non-over-match
guards behave correctly.

```bash
git branch --show-current
git status --short --branch --untracked-files=all
git diff --check
git diff --name-status
git diff --stat
# Nothing-staged check (this lane stages nothing):
git diff --cached --name-status
git diff --cached --check
# Vector / validator green-check (vectors unchanged; validator hardened):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# Syntax parse-only check of the changed validator:
node --check docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
# Confirm no vector JSON was changed (only the validator .mjs + README + this doc):
git diff --name-only -- docs/admission-wedge/route-contract-test-vectors/
# Self-reference / next-lane label check (grep -E so `|` is real alternation):
grep -E "Phase 46I|Phase 46J" docs/ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md
# Duplicate/corruption grep (advisory):
grep -nE "Claude said|Patch Report|terminal report|RESULT:|Report$" docs/ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md || true
# Fence-balance check (dependency-free; even count = balanced):
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

**Recorded results for this lane** (captured terminal output accompanies this work):

- **scope check** — the only files changed are the new document
  `docs/ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`, the non-runtime validator
  `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`,
  and the route-vector README
  `docs/admission-wedge/route-contract-test-vectors/README.md`; **no** route-vector JSON, Phase
  33E fixture, fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI,
  migration, runtime, or generated file is touched;
- **no vector JSON changed** — `git diff --name-only -- docs/admission-wedge/route-contract-test-vectors/`
  lists only the validator `.mjs` and the README, never a `*.json` vector;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no `git add` / commit /
  push); `git diff --check` and `git diff --cached --check` report no whitespace errors;
- **fixtures validator green (unchanged)** — the Phase 33E fixture validator reports 5/5 probes
  valid, 0 failures;
- **route-vector validator green (vectors unchanged under the additive hardening)** — the main
  validator reports **5/5 vectors valid, 0 failures, no sixth vector**, confirming the added
  forbidden keys do not appear on any current vector's public surface;
- **self-check green (new hardening proven fail-closed)** — the `--self-check` harness reports
  **44/44** cases behave as required: **42 negative mutations fail closed** (the 5 pre-existing
  cases + **one Phase 46J case per added forbidden key** — every one of the 37 added keys,
  covering each added family's snake_case **and** camelCase spelling exhaustively: the canonical
  Assertion ref arrays `supersedes_refs` / `linked_assertion_refs`; the TransitionReceipt /
  AuditEvent refs + hash-chain links `signer_refs` / `audit_event_ref` / `receipt_hash` /
  `audit_hash` / `previous_audit_hash` / `policy_decision_ref` / `assertion_refs` / `target_refs`;
  the subject mapping `subject_refs`; the consent/auth family `consent` / `consent_ref` /
  `consent_proof` / `consent_receipt` / `consent_subject` / `consent_grantor` / `consent_scope` /
  `auth_decision`; plus the camelCase variant of every one of those keys), and **2 exact-key
  non-over-match guards stay clean** (proving the bare `consent` / `auth_decision` additions do
  not over-match `consent_assumption` /
  `auth_assumption` or other prefix-sharing draft markers);
- **syntax check** — `node --check` on the changed validator reports `syntax OK`;
- **self-reference label check** — `grep -E "Phase 46I|Phase 46J"` confirms both labels present;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the sixteen
  headings 1–16 exactly once each;
- **duplicate/corruption grep** — the advisory grep finds no pasted terminal-report fragment in
  the document body;
- **fence-balance check** — the dependency-free counter reports an even (balanced) triple-backtick
  count; the single fenced block is the validation command list above.

---

## 14. Selected next lane and dependency ordering

> **Selected next lane: the durable-store implementation-readiness decomposition gate +
> ADR-022E gate-#8-clearing ADR / sibling handoff packet (docs/decision-only; not runtime).**

**Reason.** With the model direction (46E), shape (46F), auth/identity/signer (46G), consent
proof/receipt (46H), durable-store topology direction (46I), **and now** the non-runtime
public/private key-name hardening discharged (this gate), the recorded no-leak hardening debt at
the **non-runtime validator** layer is closed. The next blocker in the established ordering (46H
§13 / 46I §13 step 7) is the **durable-store implementation-readiness decomposition gate +
ADR-022E gate-#8-clearing ADR**, which must (a) author the durable data model / schema / migration
scope / rollback plan and physical adapter placement, (b) cite the sibling-repo handoff packet,
(c) preserve the ADR-022D receipt / audit-chain invariants, and (d) sequence the **runtime
`no-leak.ts` mirror hardening** that Phase 46J deferred (§6, §12 criterion 6) — **docs/decision-only;
no runtime, no DB write, no migration, no gate clearance until that ADR lands and is accepted.**

**Dependency ordering after Phase 46J** (carried from 46I §13; the vector/validator alignment step
now complete):

1. Phase 46E — durable storage **model direction** decided. *(Done; PR #150.)*
2. Phase 46F — durable storage **shape** & route-vector alignment (docs-only). *(Done; PR #151.)*
3. Phase 46G — **auth / identity / signer** authority decision. *(Done; PR #152.)*
4. Phase 46H — **consent proof / receipt** decision. *(Done; PR #153.)*
5. Phase 46I — **durable-store design + ADR-022E gate #8** decision (split-topology direction).
   *(Done; PR #154.)*
6. **Phase 46J — non-runtime consent/storage vector/validator alignment.** *(This gate — additive
   validator hardening; no vector JSON change; runtime mirror deferred.)*
7. **Durable-store implementation-readiness decomposition gate + ADR-022E gate-#8-clearing ADR /
   sibling handoff packet** — authors the durable data model, schema, migration scope, rollback
   plan, physical adapter placement, and the runtime `no-leak.ts` mirror sequencing; clears
   ADR-022E gate #8 preserving the ADR-022D invariants. *(Selected next lane — the build
   precondition; held.)*
8. **Final route-contract pre-freeze gate.**
9. **Implementation-spike readiness checklist** (incl. runtime no-leak mirror hardening + durable
   executable fixtures).
10. **Bounded default-off implementation spike** — only if the checklist is satisfied.
11. **Smoke / acceptance gate.**
12. **Freeside Characters client-contract handoff.**

> **Implementation remains downstream.** Steps 7–12 are each held. The only step Phase 46J
> advances is **step 6** — hardening the non-runtime validator — which is itself non-runtime.
> **Runtime implementation is not the next step.**

---

## 15. Blocked lanes

Phase 46J is a bounded, non-runtime vector/validator alignment gate. It authorizes **none** of the
following; each remains **blocked** and is **not** unblocked by hardening the non-runtime
validator or selecting the durable-store / ADR gate:

- durable Admission Wedge storage implementation (ADR-022E gate #8 held);
- DB writes; migrations; a durable data model, schema, or table definition;
- route / API handler implementation **beyond the existing Phase 33N spike**;
- production admission; auth implementation; production auth / consent implementation;
- the **runtime `no-leak.ts` mirror hardening** (deferred to the future runtime lane; §6 / §12
  criterion 6) — Phase 46J hardens **only** the non-runtime validator;
- public `remember-this`; Discord command / history ingestion; user chat becoming memory;
- Freeside Characters runtime / client integration; package exports;
- the final Dixie route contract; route-contract freeze; production route deployment;
- production readiness of any kind; final / production schema freeze;
- LLM / voice; Finn production wiring;
- forget / revoke / correction UI (MVP-3-adjacent; surfaced in 46H §6.6, not implemented);
- final idempotency semantics (Dixie / endpoint-owned; undecided; Row J);
- production signer / authority semantics; production identity binding (tenant / estate / actor);
- persisting `recall_eligible` as canonical authority (§7); freezing the physical durable adapter
  placement (46E §6 / 46I §6);
- **any mutation of the five route-vector JSONs, the Phase 33E fixtures, or the Phase 33E fixture
  validator** (§9) — Phase 46J changes the route-vector **validator** and README only, never a
  vector JSON.

> **A validator hardening does not authorize runtime implementation.** Adding the canonical /
> consent key names to the non-runtime validator's public-surface denylist and selecting the
> durable-store / ADR gate makes the next decision legible; it does **not** build a store, **not**
> author a schema or migration, **not** clear any production gate, **not** harden the runtime
> mirror, **not** freeze the route contract or schema, and **not** authorize any route / storage /
> auth / consent / Freeside / package-export work. The Phase 33N dev/operator-only,
> disabled-by-default spike remains the only authorized route surface, and the do-nothing /
> synthetic-only posture (46E Option 6 / 46I Option 1) remains in force.

If a later phase reaches for any of the above, it must re-open the Phase 33K precondition design,
the Phase 33P / 33Q / 33R storage lane, the Phase 33U / 33V chain, the Phase 46A–46I gates and this
gate, and the relevant ADRs (Straylight-repo ADR-022E durable-store gate #8 and related gates #10
/ #12 / #20; ADR-022D receipt/audit-chain invariants; ADR-026C / ADR-026D route guardrails) first;
it must not silently expand scope.

---

## 16. Cross-references

- [`docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
  — Phase 46I (PR #154); its §13 step 6 / §10.3 selected this Phase 46J non-runtime
  consent/storage vector/validator alignment gate to discharge the §9 no-leak hardening debt, and
  its §12 criterion 8 named the public/private key-name forbidden-key hardening.
- [`docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
  — Phase 46H (PR #153); §9 recorded the full canonical **consent** key-name family absent from
  both denylists; §6.1 / §6.3 / §6.4 the consent-receipt public/private posture; §7 the 10-case
  consent failure taxonomy.
- [`docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
  — Phase 46G (PR #152); §8 recorded the canonical signer/receipt/audit key names absent from both
  denylists; §5.1 the session-derived identity binding and the canonical `subject_refs` mapping.
- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 46F (PR #151); §8 / §9 point 4 / §11 / §13 criterion 8 first recorded the
  canonical-ref-array (`supersedes_refs` / `linked_assertion_refs`) hardening gap as future work
  (docs-only there); this gate closes it.
- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md)
  — Phase 46E (PR #150); §6 model direction; §7 `recall_eligible` derived; the ownership split.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  with the five vector JSONs — the **validator** and **README** are updated by this gate (the
  additive `FORBIDDEN_PUBLIC_KEYS` hardening + `--self-check` cases + the README §10 / §11 status
  note); the **five vector JSONs are inspected read-only and not modified.**
- `docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`,
  `docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`,
  `app/src/routes/admission-intake.ts`, and
  `app/src/services/admission-wedge-spike/{classifier,public-response,no-leak,admitted-assertion-ledger}.ts`
  — inspected **read-only** to ground the §3 spike / synthetic-ledger facts, the §5 debt
  inventory, the §6 runtime-mirror deferral, and the §11 invariants. **None is modified.**
- `loa-straylight/src/straylight/types.ts`, `loa-straylight/src/straylight/storage/types.ts`,
  and `loa-straylight/docs/decisions/{ADR-022D,ADR-022E}-…md` — inspected **read-only** as the
  **canonical** Straylight substrate cited in §2.2 (the `Assertion` / `TransitionReceipt` /
  `AuditEvent` primitives and their `supersedes_refs` / `linked_assertion_refs` / `signer_refs` /
  `audit_event_ref` / `receipt_hash` / `audit_hash` / `previous_audit_hash` / `policy_decision_ref`
  / `assertion_refs` / `subject_refs` key names; ADR-022D `InMemoryStorage` / `JsonlStorage` MVP
  options; ADR-022E gate #8). **Not edited by this phase.**
- `@loa/straylight` — canonical primitive / substrate owner; PR #65 (merged) answered the A–O
  primitive review. Straylight-repo ADR-022E (durable-store gate #8 + related gates #10 / #12 /
  #20, **held**), ADR-022D (receipt/audit-chain invariants), ADR-026C, ADR-026D are decision
  records cited as guardrails. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — the cross-repo acceptance whose
  mirror/adapter is test-only, not exported, not runtime-wired; the consent-boundary handoff stays
  deferred. **Not edited by this phase.**
