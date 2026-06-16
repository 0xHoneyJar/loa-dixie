# Phase 46K — Admission Wedge Durable-Store Implementation-Readiness Decomposition Gate

> **Phase**: 46K
> **Branch context**: `phase-46k-admission-durable-store-implementation-readiness`
> **Related**: Phase 46J consent/storage vector & validator alignment (PR #155,
> [`ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md)
> §9 / §14, which discharged the non-runtime validator no-leak hardening debt and named this lane);
> Phase 46I durable-store design + ADR-022E gate #8 decision (PR #154,
> [`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
> §4 / §5 / §6 / §7 / §8 / §12 / §13 step 7, which designed/decomposed the durable-store boundary and
> named "the durable-store implementation-readiness decomposition gate + ADR-022E gate-#8-clearing ADR"
> as the build precondition); Phase 46H consent proof / receipt decision (PR #153,
> [`ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md));
> Phase 46G auth / identity / signer authority decision (PR #152,
> [`ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md));
> Phase 46F durable storage shape & route-vector alignment (PR #151); Phase 46E durable storage model
> decision (PR #150); Phase 46D storage/auth/consent acceptance (PR #149); Phase 46C storage/auth/consent
> blocker decomposition (PR #148); Phase 46B route-contract implementation-readiness decomposition
> (PR #147); Phase 46A route-vector alignment acceptance (PR #146); Phase 33Z route-vector alignment
> (PR #144) + its PR #145 next-lane label/provenance correction; Phase 33Y route-contract revision
> acceptance (PR #143); Phase 33X route-contract revision draft (PR #142); Phase 33V storage/auth/consent
> design finalization (PR #140); Phase 33U Straylight-response intake (PR #139); Phase 33R bounded-ledger
> acceptance (PR #136); Phase 33Q bounded synthetic admitted-assertion ledger (PR #135); Phase 33P
> storage/receipt hardening (PR #134); Phase 33N dev/operator-only route spike; Phase 33M dev/operator
> route-spike authorization gate; Phase 33K storage/auth/consent precondition design; Phase 33L
> route-contract test-vector fixture draft; Straylight (`@loa/straylight`) PR #65 (A–O primitive-review
> verdicts, **merged**); Straylight-repo ADR-022E durable-store gate #8 (and related gates #9 / #10 /
> #11 / #12 / #20), **held**; Straylight-repo ADR-022D MVP-persistence / audit-owner invariants;
> ADR-026C / ADR-026D route guardrails; freeside-characters Phase 45J / PR #177 (Dixie v1 mirror-refresh
> acceptance, merged 2026-06-06).
> **Status**: **docs / decision-only.** This gate adds **only this document**. It changes **no**
> route-vector JSON, **no** route-vector validator, **no** route-vector README, **no** Phase 33E fixture
> or fixture validator, and **no** runtime source, test, route, route handler, storage, store code, DB
> write, migration, auth, consent, package export, config, env, package, lockfile, CI, generated file,
> or binary. No adjacent repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is a durable-store *implementation-readiness decomposition* gate, not implementation, not
> implementation-readiness acceptance, and not the ADR-022E gate-#8-clearing ADR.** It decomposes what
> must be true before the gate-clearing ADR / sibling handoff packet can be **authored**, decides
> whether the next lane can be that ADR/packet or whether another non-runtime gate is still required,
> and stops. It does **not** clear the Straylight-repo ADR-022E durable-store gate #8, **not** author or
> apply a migration, **not** authorize DB writes, **not** implement auth or consent, **not** change the
> route handler, **not** authorize durable-store implementation, **not** authorize production admission,
> **not** freeze the route contract, and **not** freeze the final schema.

Every assessment below is grounded read-only against the actual Dixie repo (the Phase 46E / 46F / 46G
/ 46H / 46I / 46J gates, the Phase 33K precondition / 33M authorization / 33N spike / 33P–33R storage
lane, the Phase 33U / 33V chain, the **five** route-vector JSONs, the route-vector validator and its
README, and the Phase 33N spike source under `app/src/services/admission-wedge-spike/` plus the route
handler `app/src/routes/admission-intake.ts`) and read-only against the **canonical** Straylight
(`@loa/straylight`) substrate (`src/straylight/types.ts`, `src/straylight/storage/types.ts`,
`src/straylight/audit.ts`, and `docs/decisions/ADR-022D…` / `ADR-022E…`). Where a claim could not be
grounded in the read material, it is marked as such. Phase 46K changes no technical artifact; the
validators are run only to confirm the unchanged artifacts remain green (§16).

---

## 1. Scope and verdict

Phase 46K is the bounded **durable-store implementation-readiness decomposition gate** that follows,
and is named by, Phase 46J
([`ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md)
§14, PR #155) and Phase 46I
([`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
§13 step 7, PR #154). Phase 46I designed and decomposed the durable-store / ADR boundary and named, as
the build precondition (step 7), "the **durable-store implementation-readiness decomposition gate +
ADR-022E gate-#8-clearing ADR / sibling handoff packet**." Phase 46J then discharged the **non-runtime
validator** half of the §9 / §12-criterion-8 no-leak hardening debt (adding the 37 canonical / consent
exact-key forbidden-key entries; self-check 44/44) and re-affirmed the same next lane (46J §14 step 7).
Phase 46K executes the **decomposition** half of that named step: it decomposes the readiness
requirements that must be satisfied before the gate-clearing ADR / sibling handoff packet can be
**authored**, decides whether that ADR/packet is the right immediate next lane or whether another
non-runtime gate is still required, and stops **short** of the gate-clearing ADR, of any acceptance of
readiness, and of any build.

**Verdict.** Phase 46K:

- is **docs / decision-only** — its only output is this decomposition document;
- is **not implementation-readiness acceptance** — it decomposes the readiness requirements; it does
  **not** accept that readiness has been reached, and a separate acceptance is a recorded candidate
  next lane (§13), not a thing this gate performs;
- is **not the ADR-022E gate-#8-clearing ADR** — it is the Dixie-side decomposition that a future
  gate-clearing ADR would consume; it is not that ADR and authors no part of it;
- **does not clear ADR-022E gate #8** — decomposing readiness on paper is not clearing a gate; gate #8
  (and the related held gates #9 / #10 / #11 / #12 / #20) remain held;
- **does not authorize durable-store implementation** — no durable store, schema, table, store code,
  migration, or DB write is created or authorized; storage is not implemented;
- decomposes **what must be true before the gate-clearing ADR / sibling handoff packet can be
  authored** — the records, the ownership/adapter boundary, the runtime no-leak stance, the
  failure/rollback answers, the implementation-readiness checklist, and the production boundary that the
  future ADR/packet and the future build must each satisfy.

Phase 46K additionally:

- is **not auth / consent implementation** — no authentication, authorization, consent-proof,
  consent-receipt, or credential-handling code is created or changed; auth is not implemented; consent
  is not implemented;
- is **not route / API implementation** — the Phase 33N dev/operator-only, disabled-by-default spike
  remains the only authorized route surface; nothing is added to it;
- is **not production admission**, **not** a route-contract freeze, and **not** a final schema freeze;
- **does not freeze the physical durable adapter placement** (Dixie / Finn / sibling runtime), which
  Phase 46E / 46I left unresolved under ADR-022E gate #8;
- **does not modify** runtime source, the route-vector JSONs, the route-vector validator, the
  route-vector README, the Phase 33E fixtures, the Phase 33E fixture validator, validators of any kind,
  vectors, package exports, config / env, CI, migrations, generated files, binaries, or any adjacent
  repository; and **declares no production readiness** of any kind.

> **A readiness decomposition authorizes no runtime work and clears no gate.** Phase 46K makes the
> remaining pre-ADR work legible and orderable — it lists what the gate-clearing ADR / sibling handoff
> packet and the eventual build must each establish. The output is a decomposition recorded on paper,
> not an accepted readiness state, not a built store, not a frozen schema, not an applied migration, not
> a cleared gate, and not the gate-clearing ADR itself. A later, separately-gated phase must still (a)
> author and accept the gate-clearing ADR + sibling handoff packet (preserving the ADR-022D
> receipt/audit-chain invariants), (b) add the deferred **runtime** `no-leak.ts` exact-key mirror, (c)
> author and accept the durable data model / schema / migration / rollback plan, and (d) only then
> authorize any build. **Implementation-readiness is not implementation authorization** (§4.6).

---

## 2. Source chain (evidence intake)

This gate sits one rung above the Phase 46J consent/storage vector & validator alignment on the Dixie
route-contract ladder, and it is the **decomposition** sub-step of the prior "step 7" — the
durable-store implementation-readiness decomposition gate + ADR-022E gate-#8-clearing ADR / sibling
handoff packet (46I §13 step 7; 46J §14 step 7). It introduces no new contract or vector material; it
consumes the storage / auth / consent decision cluster (46E / 46F / 46G / 46H), the durable-store design
/ decomposition (46I), the non-runtime validator hardening (46J), the prior precondition / authorization
/ spike / storage lanes, and the canonical Straylight substrate to decompose the durable-store
implementation-readiness requirements.

### 2.1 Dixie (loa-dixie) — the storage / auth / consent and route-contract lanes

| Phase | PR | Artifact / contribution (relevant to durable-store implementation readiness) |
|-------|----|------|
| 33K | #129 | **Storage/auth/consent precondition design.** Drafted the durable storage record categories, the service-auth options A/B/C/D, the consent options A/B/C/D, the idempotency precondition, the no-leak public/private preconditions, the threat model, and the exit criteria. Froze nothing. |
| 33L | #130 | **Route-contract test-vector fixture draft.** Authored the five non-runtime route-contract vectors + validator; carried the storage/auth/consent draft assumptions and the unresolved-review markers `[E,G,H,K,N,O]` / `[J]`. |
| 33M | #131 | **Dev/operator route-spike authorization gate.** Authorized the Phase 33N spike: dev/operator gate only, disabled-by-default; Storage Option A (no durable store, no DB writes, no migrations); rollback trivial — no durable state to roll back. |
| 33N | #132 | **Dev/operator-only route spike.** `POST /api/admission/intake`, disabled-by-default; the synthetic transition built from fixed dev constants, never request-controlled material; **Storage Option A**; runtime no-leak guard (`no-leak.ts`) mirrors the validator denylist; uses `x-admission-service-token`, not `Authorization` (to avoid the global `/api/*` allowlist collision). |
| 33P | #134 | **Storage / receipt hardening decision.** Selected Option B (a possible future dev-only, bounded synthetic admitted-assertion store); **rejected Option D** (production-like durable storage); named the validator denylist / `FORBIDDEN_PUBLIC_KEYS` as the boundary a store-backed projection must satisfy. |
| 33Q | #135 | **Bounded synthetic admitted-assertion ledger.** A bounded, process-local, Map-backed, non-durable, fail-closed, synthetic-only ledger exposed only as a route DI / test seam; opens no DB / file / socket / timer; supersession flips the prior to `superseded` / `recall_eligible: false`. |
| 33R | #136 | **Bounded-ledger acceptance.** Accepted Phase 33Q **only** as a bounded, non-production, test-seam-only synthetic proof — not production admission, not durable storage, not a final schema, not production route readiness. |
| 33U | #139 | **Straylight-response intake.** Reconciled PR #65 A–O verdicts. Rows **F (production signer/authority), G (production tenant/estate/actor identity binding), J (final endpoint idempotency keying), O (durable store under ADR-022E gate #8)** remain **held**. Row B: `admitted` is a public `outcome_class`, never a status; the canonical `active` `Assertion` is Straylight's; Dixie holds **ingress refs only**. ADR-022E gates #8 / #10 / #12 / #20 held. |
| 33V | #140 | **Storage/auth/consent design finalization.** Split `SyntheticAuditRecord` → `AuditEvent` + `TransitionReceipt`; adopted `public_receipt_ref`; drew the private/public projection boundary on `privacy_scope` + frame disposition; kept **migration / backfill / rollback undesigned**; a consent reference is private-audit-only. |
| 33W–33Z | #141–#144 | **Route-contract readiness/revision/vector alignment.** Endpoint idempotency Dixie-owned; standardized `public_receipt_ref` (`null` where none); aligned the five vectors + validator and added the `--self-check` negative-mutation harness; `route_contract_final: false`, `schema_final: false`. |
| 33Z (corr.) | #145 | **Next-lane label/provenance correction** (34A → 46A). |
| 46A | #146 | **Route-vector alignment acceptance.** Accepted the 33Z alignment as bounded, non-runtime vector/validator alignment; did not accept implementation readiness. |
| 46B | #147 | **Route-contract implementation-readiness decomposition.** Judged the storage/auth/consent cluster the upstream dependency; ranked the candidate lanes. |
| 46C | #148 | **Storage/auth/consent blocker decomposition.** Decomposed the held storage (11 rows), auth (10), consent (10), and shared public/private (7) blockers into ordered, separately-clearable sub-gates. |
| 46D | #149 | **Storage/auth/consent acceptance.** Accepted the 46C decomposition; selected Phase 46E (durable storage model) as the deepest-blocker per-area gate; sequenced auth (B) and consent (C) downstream. |
| 46E | #150 | **Durable storage model decision.** Selected the §6 model direction (current-state projection + append-only hash-chained audit log on the canonical Straylight semantics/interfaces); left the storage **shape** undecided; left the **physical adapter placement** unresolved under ADR-022E gate #8. |
| 46F | #151 | **Durable storage shape & route-vector alignment.** Aligned the §6 model's durable **shape** onto the five vectors docs-only; fixed `recall_eligible` as derived (never persisted authority); **first recorded the canonical-ref-array hardening gap** (`supersedes_refs` / `linked_assertion_refs` absent from `FORBIDDEN_PUBLIC_KEYS`). |
| 46G | #152 | **Auth / identity / signer authority decision.** Retained Option C (dev/operator-only) for the spike; recorded production candidates Option A (bearer JWT) and Option B (signed envelope); decided session-derived identity binding with no caller override; mapped the candidate subject to canonical `subject_refs`; **extended the recorded gap** to the signer/receipt/audit key names (§8). |
| 46H | #153 | **Consent proof / receipt decision.** Decided service auth ≠ consent; consent is never inferred from chat; a production consent artifact lives on the **private audit record only**; decomposed the consent-proof object model (draft); recorded the 10-case consent failure taxonomy; **extended the recorded gap** to the full consent key-name family (§9). |
| 46I | #154 | **Durable-store design & ADR-022E gate #8 decision.** Recorded what gate #8 requires (§4); decomposed 14 durable records (§5); recorded the ownership/adapter boundary (§6); selected **Option 4 (split storage)** as the safest topology *direction* (§7); decomposed the migration/lifecycle preconditions (§8); carried the no-leak hardening debt (§9); recorded the §12 eleven-item exit checklist (incl. criterion 8 public/private key-name hardening); confirmed `recall_eligible` derived. **Selected the non-runtime consent/storage vector/validator alignment lane (step 6) then the durable-store implementation-readiness decomposition + gate-#8-clearing ADR (step 7)** as the build precondition. |
| 46J | #155 | **Consent/storage vector & validator alignment.** Discharged the **non-runtime validator** half of the §9 / criterion-8 hardening debt: added 37 canonical / consent exact-key entries to `FORBIDDEN_PUBLIC_KEYS` (snake_case + camelCase) and extended `--self-check` to **44/44** (42 fail-closed negative mutations + 2 exact-key no-overmatch guards); changed **no** vector JSON; **deferred the runtime `no-leak.ts` mirror** (46J §6). Re-affirmed step 7 (the durable-store implementation-readiness decomposition gate + ADR-022E gate-#8-clearing ADR) as the next lane. |
| **46K** | *(this doc)* | **Durable-store implementation-readiness decomposition gate.** Records the source chain (§2) and accepted facts (§3); decomposes the ADR-022E gate #8 readiness requirements and proves implementation-readiness ≠ implementation authorization (§4); decomposes the durable-store implementation boundary without implementing it (§5); records adapter/ownership readiness and what the handoff packet must say (§6); decides the runtime no-leak mirror question (§7); intakes what Phase 46J proved and what it means for readiness (§8); defines the future implementation-readiness checklist (§9); decomposes the failure/rollback readiness answers a future lane owes (§10); preserves the production boundary (§11) and the invariants (§12); selects the next lane (§13); preserves the blocked lanes (§14). Mutates **no** vector / validator / fixture / source. |

> **PR-number provenance note.** The PR numbers above are taken from the local git merge-commit history
> (`docs: … (#NNN)` subjects) and the Phase 46A–46J source-chain tables. Phase 46J's `#155` is the merge
> commit `aaecdd55 "docs: align Admission Wedge consent storage vectors (#155)"`; Phase 46I's `#154` is
> `8a29d8f4 "docs: add Admission Wedge durable store ADR gate (#154)"`. Treat the PR numbers as
> git-sourced rather than as authority embedded in the gate bodies (each gate refers to itself only as
> "this doc").

### 2.2 Canonical Straylight substrate (`@loa/straylight`) — read-only

The durable substrate that ADR-022E gate #8 governs is **canonical Straylight semantics**, read-only
here to ground the §4–§10 decomposition. The adjacent `loa-straylight` repo is the canonical evidence
(Dixie's mirror modules are parity evidence only, never canonical proof — ADR-022D). All four substrate
files cited below were confirmed present and readable in the adjacent repo.

- **The append-only, hash-chained audit substrate and the current-state assertion surface are
  Straylight-owned interfaces.** The `StorageAdapter` interface declares the seven record families —
  actors, estates, keyrings, current-state assertions (upsert; status changes write a new version),
  append-only transitions, recall receipts, transition receipts, and append-only **hash-chained-per-
  estate** audit events
  (`loa-straylight/src/straylight/storage/types.ts:33-68`); the MVP semantics state assertions/receipts
  upsert (latest write wins), transitions and audit events are append-only and immutable once written,
  and audit events are hash-chained per estate. `verifyChain` detects a tampered chain by a
  `previous_audit_hash` mismatch (`audit.ts:77-89`). `StorageAdapter` is explicitly the swap-in seam for
  a future Postgres / sibling-runtime substrate.
- **Canonical `Assertion`, `TransitionReceipt`, `AuditEvent` are distinct Straylight-owned primitives.**
  `Assertion` carries `status` (incl. `active` / `superseded`), `supersedes_refs`,
  `linked_assertion_refs`, `subject_refs` (optional), `privacy_scope`, and `recall_scope`
  (`types.ts:145-167`). `TransitionReceipt` is a first-class discriminated type (`kind` ∈ admission /
  denied / challenge / revocation / forget), carrying `transition_id`, `audit_event_ref`, `signer_refs`,
  `reasons`, `metadata`, and `receipt_hash` (`types.ts:364-388`). `AuditEvent` carries `transition_id`,
  `assertion_refs`, `signer_refs`, `policy_decision_ref`, `previous_audit_hash`, and `audit_hash` (the
  per-estate chain link) (`types.ts:514-529`).
- **Straylight-repo ADR-022E gate #8 (and its siblings) are held with explicit triggers.** Gate **#8
  (Production database / persistence substrate)**: "`InMemoryStorage` and `JsonlStorage` are the MVP
  adapters. | A separate ADR proposes the production adapter, cites the relevant sibling-repo handoff
  packet, and preserves the ADR-022D receipt and audit-chain invariants"
  (`loa-straylight/docs/decisions/ADR-022E-phase-22-deferred-features.md:57`). The siblings that gate any
  Dixie durable wiring are **#9** (Finn runtime wiring), **#10** (Dixie boundary wiring), **#11**
  (Freeside as a consumer, not a host), **#12** (new HTTP / NATS / REST / Discord / Telegram surface),
  and **#20** (threat-model widening for the network adversary and cryptographic forgery), each held. PR
  #65 cleared none of these gates.
- **ADR-022D pins the receipt/audit-chain invariants the gate-clearing ADR must preserve.** ADR-022D §1
  pins ownership of `RecallPack` / `RecallReceipt` / `TransitionReceipt` / `AuditEvent` to Straylight
  (`ADR-022D-mvp-persistence-and-audit-owner.md:47-67`); §4
  (`ADR-022D-mvp-persistence-and-audit-owner.md:109-127`) pins five audit-chain integrity invariants
  (missing policy denies; unknown class fails class validation; unknown signer fails competence; revoked
  / forgotten / private / contested do not surface as usable; tampered audit chains are detectable via
  `verifyChain`), each verified by `tests/phase-5-hardening.test.ts`.

### 2.3 Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts, reconciled by 33U.** PR #65 clarified
  the *vocabulary / design* only; it cleared **no** independent production gate and authorized **no**
  Dixie runtime, production storage / auth / consent, or Freeside integration. The still-held rows that
  gate this readiness decomposition are **F, G, J, and O** (33U §4).
- **Residual legacy marker prose.** The `[E,G,H,K,N,O]` / `[J]` marker arrays in the vector JSONs and
  the spike classifier comments are **preserved legacy vector/runtime markers, not the current
  review-state authority**; the authoritative classification lives in the route-vector README
  current-state correction (its §7). Phase 46K preserves that distinction and mutates no technical
  artifact.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the freeside-characters 34-/45-series,
> and Straylight's ADR / PR labels are independent labels in separate repositories and must not be
> conflated. `46K` signals **no** new product epoch and **no** scope expansion — it is the same
> Admission Wedge arc, still docs/decision-only. The Straylight ADR-022E "Phase 22" gate numbering is the
> *Straylight* repo's phase namespace, distinct from Dixie's 46-series.

---

## 3. Starting accepted facts

These are facts **already accepted** by the chain (33K / 33M / 33U / 33V / 46C / 46D / 46E / 46F / 46G /
46H / 46I / 46J), re-verified read-only here as the baseline the §4–§13 decomposition is measured
against. None is changed by this gate.

1. **The only authorized route surface is the Phase 33N dev/operator-only spike, and it stores nothing
   durable.** It mounts only when `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (default off), uses
   **Storage Option A** (no durable store, no DB writes, no migrations), and rollback is trivial because
   there is no durable state to roll back. It does **not** authorize production admission / storage /
   auth / consent.
2. **The durable storage model *direction* and *shape* are decided, the topology *direction* is
   selected, and the build is not.** Phase 46E selected current-state projection + append-only
   hash-chained audit log realized on the canonical Straylight semantics/interfaces; Phase 46F aligned
   that shape onto the five vectors docs-only; Phase 46I selected **Option 4 (split storage)** as the
   safest topology *direction*, with the physical adapter placement left unresolved under ADR-022E gate
   #8. None built a store, authored a schema, or cleared a gate.
3. **The auth / identity / signer and consent boundaries are decided on paper, not built.** Phase 46G
   recorded the service-auth boundary, the session-derived identity binding (no caller override), the
   policy/keyring-decided signer competence, and the replay/idempotency interaction; Phase 46H recorded
   the consent boundary, the consent-proof object model (un-frozen), the consent-receipt public/private
   boundary, and the 10-case consent failure taxonomy. Auth is not implemented; consent is not
   implemented; both reference *what is persisted* and therefore depend on the durable-store design.
4. **Straylight owns the canonical durable substrate; Dixie holds ingress references only.** The
   canonical `active` `Assertion`, the first-class `TransitionReceipt`, and the append-only hash-chained
   `AuditEvent` are Straylight primitives persisted through the `StorageAdapter` / `AuditLog` path with
   ADR-022D invariants (§2.2). Dixie owns the endpoint-local contract / idempotency / replay records,
   ingress references, and the public/private response projection; a production auth-decision / consent
   reference is a Dixie/host ingress reference recorded **privately** onto the canonical audit record,
   never the canonical copy.
5. **There are exactly five route-contract vectors and one validator; both are green and non-runtime,
   carrying the storage/auth/consent draft assumptions.** All five vectors validate, the no-sixth check
   passes, and the `--self-check` harness reports **44/44** after Phase 46J (42 fail-closed negative
   mutations + 2 exact-key no-overmatch guards) (§16). Every vector carries `storage_writes_performed:
   false`, `auth_implemented: false`, `consent_implemented: false`, `production_admission: false`,
   `route_contract_final: false`, `schema_final: false`.
6. **`recall_eligible` is derived, never persisted authority.** Dixie's boolean `recall_eligible`
   collapses a multi-input disposition (assertion status, transition history, relationships, request
   filters, privacy frame, risk) into one bit; the recall-included set is a derived, invalidatable,
   request/context-dependent projection, never the authority (46E §6; 46F §7; 46I §8 item 10).
7. **The non-runtime validator forbidden-key set is now hardened; the runtime mirror is not.** Phase 46J
   added the 37 canonical / consent exact-key names (the canonical ref arrays, the signer/receipt/audit
   refs + hash-chain links, the subject mapping, and the consent/auth family — each snake_case and
   camelCase) to `FORBIDDEN_PUBLIC_KEYS` and proved them fail-closed (44/44). The runtime `no-leak.ts`
   denylist mirror was **explicitly deferred** to the future runtime durable-store lane (46J §6 / §12
   criterion 6). The fixed public-response builder (`buildAdmissionSpikePublicResponse`) emits none of
   these fields, so the runtime gap is latent, not a live leak.
8. **ADR-022E gate #8 is held and the synthetic ledger does not satisfy it.** No durable Dixie admission
   store, schema, table, or migration exists; the Phase 33Q ledger is synthetic, process-local, and
   non-durable; the final identity binding, idempotency, signer/authority, schema, and receipt semantics
   remain explicitly unresolved (rows F / G / J / O; 33U §4).

> **What "accepted facts" do and do not mean.** These are **spike-posture, synthetic-ledger,
> design-vocabulary, vector-surface, and non-runtime-validator** facts. They do not constitute a durable
> store, a frozen schema, a runtime production serializer, a gate-clearing ADR, or any cleared production
> gate. The §4–§13 decomposition exists precisely because the accepted readiness is bounded to the
> dev/spike/synthetic/non-runtime surface and the production durable store is still unresolved under
> ADR-022E gate #8.

---

## 4. ADR-022E gate #8 readiness decomposition

This section identifies what remains required before ADR-022E gate #8 can be cleared. It clears nothing;
it decomposes the requirements a future gate-clearing ADR / sibling handoff packet must satisfy and
proves the central distinction this gate exists to make: **implementation-readiness is not
implementation authorization**.

### 4.1 Separate-ADR requirement

ADR-022E gate #8 is held with the trigger: "A separate ADR proposes the production adapter, cites the
relevant sibling-repo handoff packet, and preserves the ADR-022D receipt and audit-chain invariants"
(`ADR-022E-phase-22-deferred-features.md:57`), and the gate-table preamble requires that the trigger be
satisfied **and** a separate ADR (or sibling-repo PR under teammate review) explicitly cite it.
Therefore clearing gate #8 requires **a separate ADR** — *not* this Dixie decomposition doc and *not*
any prior Dixie gate. Phase 46K is the Dixie-side decomposition input that ADR would consume; it carries
no authority to advance the feature past its trigger, and it is **not** that ADR.

### 4.2 Sibling-handoff-packet requirement

The trigger explicitly requires the separate ADR to **cite the relevant sibling-repo handoff packet**.
A future gate-clearing lane must therefore produce (or cite) a handoff packet that establishes the
cross-repo wiring contract between Dixie (the route boundary / ingress refs / public-private projection)
and the canonical Straylight substrate (the assertion / transition / receipt / audit store), consistent
with the held sibling gates **#9** (Finn wiring), **#10** (Dixie boundary wiring), **#11** (Freeside as
consumer, not host), and **#12** (network surface). §6 defines what that packet must say to avoid
ownership ambiguity. Phase 46K authors no handoff packet; it decomposes its required contents.

### 4.3 ADR-022D invariant-preservation requirement

The trigger requires the separate ADR to **preserve the ADR-022D receipt and audit-chain invariants**.
Those invariants (`ADR-022D-mvp-persistence-and-audit-owner.md:109-127`) are: missing policy denies
(fail-closed); unknown class fails class validation; unknown signer fails competence; revoked /
forgotten / private / contested material does not surface as usable; and tampered audit chains are
detectable via `verifyChain` (`audit.ts:77-89`). A gate-clearing ADR that proposes a production
persistence adapter **must** carry each invariant forward unchanged — the production substrate must
remain append-only, hash-chained, and tamper-detectable, and a consent / auth-decision reference
recorded onto the audit record inherits that tamper-evidence without becoming public (§2.2; §12). Phase
46K records this as a binding requirement, not a discharged one.

### 4.4 Public/private projection requirement

A gate-clearing lane must establish the production public/private projection: the production no-leak
serializer enforcing `privacy_scope` + frame disposition, with **only** `public_receipt_ref` (string or
`null`) — and, per 46H §6.1, at most one disjoint opaque public-safe consent receipt reference if a
prior gate authorizes it — crossing to the public surface, and every canonical ref / signer / receipt /
audit / consent key name kept private. Phase 46J hardened the **non-runtime validator** for exactly
those key names; the **runtime** serializer hardening (the `no-leak.ts` mirror) is still owed (§7). The
projection requirement is therefore *partially* discharged (non-runtime) and *partially* outstanding
(runtime); §4.5 states this precisely.

### 4.5 Validator hardening is sufficient non-runtime evidence, not runtime no-leak hardening

> **Proof of sufficiency-and-limit.** Phase 46J's `FORBIDDEN_PUBLIC_KEYS` additions + 44/44 self-check
> are **sufficient as non-runtime evidence** that the canonical / consent key names are forbidden on the
> public surface of the *test vectors* — the validator now fails closed on each of the 37 names
> (snake_case and camelCase) at any depth, and the two no-overmatch guards prove the additions do not
> over-match legitimate `consent_assumption` / `auth_assumption` draft markers. That evidence is
> **non-runtime**: the validator is a Node-built-ins-only checker of static JSON vectors. It is **not**
> runtime no-leak hardening — it does **not** make the runtime serializer (`no-leak.ts`) forbid those
> key names, because Phase 46J explicitly deferred the runtime mirror (46J §6 / §12 criterion 6). The
> non-runtime validator hardening therefore **does not imply runtime enforcement**, and Phase 46K does
> not read it as such.

Concretely: the route-vector validator proves the *contract* forbids the names; the runtime serializer
must separately enforce the *behavior*. The two are complementary, and the runtime half is still owed.

### 4.6 Runtime no-leak mirror — necessary for implementation authorization, not for gate clearing

> **Proof.** The deferred runtime `no-leak.ts` exact-key mirror is **necessary before any durable-store
> route/storage implementation can be authorized** — because the moment runtime code begins emitting
> canonical / consent refs internally, the serializer must forbid them on the public surface or risk a
> live leak (§7). It is **not** a precondition for *clearing* ADR-022E gate #8: clearing the gate is a
> docs/decision act (a separate ADR proposing the adapter, citing the handoff packet, preserving the
> ADR-022D invariants). That ADR emits no fields, opens no socket, and writes no record — it cannot
> leak, so the runtime mirror is not a logical precondition of authoring or accepting it. The runtime
> mirror is correctly sequenced **with the lane that begins emitting the fields** (46J §6), i.e. before
> implementation, not before the gate-clearing ADR. §7 records the decision; this sub-section records
> why it does not block gate clearing.

### 4.7 Implementation-readiness is not implementation authorization

> **Proof.** *Implementation-readiness* is the state in which every decision artifact a build depends on
> has been authored **and accepted**: the gate-clearing ADR + handoff packet, the durable data model /
> schema / migration / rollback plan, the auth / identity / consent / signer / receipt / audit / replay
> persistence plans, the runtime no-leak stance, the test/vector/validator plan, the dev/operator-vs-
> production boundary, and a Codex audit acceptance (§9). *Implementation authorization* is the separate,
> later act of saying "build now" once readiness is **accepted** and the gate is **cleared**. Phase 46K
> performs **neither**: it decomposes the readiness requirements (it does not even *accept* readiness —
> that is a candidate next lane, §13), and it certainly does not *authorize* a build. A readiness
> decomposition that listed the requirements would still leave them un-authored and un-accepted; an
> acceptance that accepted them would still leave the build un-authorized. The three are distinct rungs,
> and Phase 46K is the first (decomposition) of the three.

---

## 5. Durable-store implementation boundary

This section decomposes what a durable-store **implementation** would need, **without implementing it**
and **without freezing a final schema**. Every record / concern below is classified by *layer*
(canonical Straylight-owned / Dixie-owned / derived), by *persisted vs referenced vs derived*, and by
*public vs private*. There are **no** field types, keys, indexes, or table definitions here; those
remain the future durable-store design gate + gate-clearing ADR's output (§9). Where a record maps onto
a canonical Straylight primitive, the mapping is recorded so a future lane references the canonical name
rather than coining a parallel one. This refines the 46I §5 decomposition for readiness purposes; it
freezes nothing new.

| Durable concern (un-frozen) | Layer | Persisted / referenced / derived | Public/private | Grounding / mapping |
|---|---|---|---|---|
| **Durable candidate records** | Dixie | A private/admission-bound candidate ingress object; persisted-durably vs held-transiently is a future durable-store decision. The candidate is **not** an admitted assertion (Row B). | Private; `candidate_id` / `candidate_payload` forbidden public. | 46E §4; 46I §5; 33U Row B; validator `FORBIDDEN_PUBLIC_KEYS`. |
| **Admission transition records** | canonical | Append-only `EstateTransition` for an admit; Dixie holds an **ingress reference**, not a parallel canonical copy. | Private. | `storage/types.ts:33-68`; 33U Row B. |
| **Admitted assertion records** | canonical | The canonical `active` `Assertion` (current-state, mutable-upsert); Dixie references it. An accepted candidate creates/references it. | Public exposes only the **status class** `active` (a label); the assertion itself private/canonical. | `types.ts:145-167`; accept vector `admitted_assertion_status_class = "active"`. |
| **Rejection / denial transition records** | canonical / Dixie | A reject mints **no** admitted assertion; a denial maps to a private `TransitionReceipt` kind `denied`. | Private; public exposes only the outcome class `denied` + the source-real `safe_reason_code`. | `admission-intake.ts:162-167`; reject vector. |
| **Supersession / correction relations** | canonical | The corrected (active) assertion's `supersedes_refs` (+ `linked_assertion_refs`), with the prior flipped to `superseded`; the Dixie-local id pair maps onto the canonical ref array (no rename here). | Private; public exposes only the outcome class + recall projection. | `types.ts:145-167`; 46F §8; supersede vector. |
| **TransitionReceipt references** | canonical, private | The first-class `TransitionReceipt` (`transition_id` / `audit_event_ref` / `signer_refs` / `receipt_hash`), private; Dixie stores an ingress reference. | Private; only `public_receipt_ref` may surface. | `types.ts:364-388`; 33V §4; 46I §5. |
| **AuditEvent references** | canonical, private | The append-only, hash-chained `AuditEvent` (`signer_refs` / `policy_decision_ref` / `previous_audit_hash` / `audit_hash`), tamper-detectable via `verifyChain`. | Private; never public at any depth. | `types.ts:514-529`; `audit.ts:77-89`; ADR-022D `:109-127`. |
| **Consent proof / consent receipt references** | Dixie (ingress) | The production consent-proof / consent-receipt reference (46H §5 / §6), recorded **privately onto the canonical audit record** (primary linkage), optionally onto the `TransitionReceipt`; proof material itself private. | Private; at most a disjoint **opaque public-safe consent receipt reference** may surface if a prior gate authorizes it (46H §6.1). | 46H §5 / §6; 33V §5; ADR-022D §1. |
| **Signer / authority references** | canonical, private | The competent signer (`signer_refs`) per `SignerCompetenceRule` / `Keyring` / policy that recorded the transition; distinct from the consent grantor (46H §8). | Private; canonical Straylight ref; never public. | `types.ts:364-388`, `:514-529`; 46G §6. |
| **Auth / identity binding references** | Dixie / canonical | The session-derived caller principal bound to `tenant_id` (Dixie host-layer), `estate_id` / `actor_id` (canonical), **never** body-trusted, no caller override; propagated to transition / assertion / receipt / audit levels; the candidate subject maps to canonical `subject_refs`. | Private; all id families forbidden public. | 46G §5; 33K §11; validator id families forbidden public. |
| **Idempotency / replay records** | Dixie | Endpoint/Dixie-owned (absent from Straylight); the final key, replay envelope, conflict response, and durable backing unresolved (`idempotency_final: false`; Row J); scoped by the bound identity (46G §7). | Private; idempotency keys forbidden public. | 46E §4; 46G §7; 46I §5. |
| **Public-safe receipt references** | Dixie, public-safe | `public_receipt_ref` — the single public-safe transition-receipt reference (a public-safe DRAFT string where minted, `null` where none); its durable mint/resolution without operational-id leakage is a future decision. | **Public-safe** (the one field that crosses); never a private receipt id. | `public-response.ts`; 46E §4; validator `public_receipt_ref` rule. |
| **Private audit / proof material** | canonical / Dixie | The consent artifact / grant material, signatures, signer ids, policy decision detail, raw candidate / source material — the proof-bearing private content referenced by the audit linkage. | Private; **never** public, **never** logged raw. | 46H §6 / §9; 46G §8; validator tokens/secrets/signature forbidden public. |
| **Retention / revocation / expiry / forget implications** | cross-cutting | How the durable store supports retention, revocation, expiry, and forget/correction **against an append-only audit chain** — representable and fail-closed, *without implementing MVP-3 here*. | Boundary only; no public residue. | 46E §4; 46H §6.6; 33K §20; 33V §9; 46I §8 items 6–7. |
| **Tenant / estate / actor partitioning** | Dixie / canonical | `(tenant_id, estate_id)` partitioning; foreign-tenant write fails closed (`a.estate_id === request.estate_id`); `identity_binding_final: false` (Row G). | Private; cross-tenant guarantee enforced. | 46I §8 item 8; 33K §11; threat-model T6. |
| **Privacy and risk frame persistence** | canonical / Dixie | Which privacy/risk frame inputs are persisted vs supplied per-request, so projection stays per-request and never bakes one frame's answer into durable state. | Frame inputs private; projection per-request. | 46I §8 item 9; threat-model T5. |
| **Derived `recall_eligible` projection** | derived | Confirmed **derived at read time** from durable inputs and **never persisted as canonical authority** — a binding invariant, not a future option (§12). | Public **derived signal** only. | 46E §6; 46F §7; 46I §8 item 10 / §11 invariant 15. |

> **Nothing in §5 is a schema.** The concern names exist for readiness legibility only; Phase 46K freezes
> **no** durable schema, coins **no** runtime field, and changes **no** vector or validator. A future
> durable-store design gate + gate-clearing ADR must produce and accept the final data model, name the
> canonical mappings, and pass an extended (still no-leak-bounded) vector/validator plan (§9) before any
> field is authorized. `recall_eligible` is listed as a binding invariant (derived, non-authoritative),
> not a deferred option.

---

## 6. Adapter / ownership readiness

This section preserves the durable-store ownership / adapter boundary (carried from 46I §6) and defines
what a future sibling handoff packet must say to avoid ownership ambiguity. It builds nothing; the
physical adapter placement remains future-gated.

**(6.1) Ownership boundary preserved.**

- **Straylight owns the canonical semantics and interfaces.** The `active` `Assertion`, the first-class
  `TransitionReceipt`, the append-only hash-chained `AuditEvent`, their invariants, and the
  `StorageAdapter` / `AuditLog` *interface* (ADR-022D `InMemoryStorage` default / `JsonlStorage` durable
  option) are canonical Straylight semantics (§2.2; 46E §6; 46I §6). Dixie does **not** build a *parallel
  canonical* assertion/transition/audit lifecycle.
- **Dixie may own route-side records or adapter integration only if later authorized.** Dixie's accepted
  ownership is contract-scoped: (a) endpoint-local contract / idempotency / replay records
  (route-contract-bound; `idempotency_final` held — Row J), (b) ingress references onto the canonical
  chain (33U Row B), and (c) the public/private response projection + no-leak serializer. Dixie **may
  later host or operate a durable adapter / persistence binding** *only if* a future ADR / gate assigns
  that responsibility — Phase 46K does **not** finalize it.
- **Physical durable adapter placement remains future-gated.** The placement decision (Dixie / Finn /
  sibling runtime) is left to the future gate-clearing ADR; if it assigns Dixie a route-side durable
  adapter, that adapter must be a **swap-in of the canonical Straylight `StorageAdapter` interface** (not
  a parallel canonical lifecycle), behind ADR-022E gate #8 and the relevant sibling gates (#10 / #12 /
  #20).
- **Finn or another sibling runtime may later own projection / audit / persistence pieces.** ADR-022D
  leaves a future Postgres / sibling-runtime persistence adapter — which may live in **Dixie, Finn, or
  another sibling runtime** — to a separate ADR; `StorageAdapter` is the swap-in seam. ADR-022E gate #9
  (Finn wiring) and gate #10 (Dixie boundary wiring) are symmetric, held gates; neither is selected here.
- **Freeside Characters remains a client / handoff surface, not the canonical durable store.** Per
  ADR-022E gate #11, Freeside is **not** a candidate MVP endpoint host; it consumes governed recall after
  Dixie / Finn settle. The freeside-characters mirror is test-only, not exported, not runtime-wired (45J /
  PR #177). It is never the canonical durable store, and Phase 46K authorizes no Freeside persistence
  role.
- **Split storage remains a future-gated safest *direction*, not the selected production architecture.**
  46I §7 selected Option 4 (split storage: Dixie route records + Straylight canonical store) as the
  safest topology **direction**, realized against the Option 3 Straylight canonical semantics/interfaces,
  with direct public/client storage writes rejected (Option 6) — but the physical placement of each half
  is **not** frozen, and "selected direction" is **not** "selected production architecture."

**(6.2) What a future handoff packet must say to avoid ownership ambiguity.** A future sibling handoff
packet (the artifact the gate-clearing ADR must cite — §4.2) must state, at minimum:

1. **The canonical-vs-Dixie ownership split**, restated unambiguously: Straylight owns the canonical
   assertion / transition / receipt / audit store and its invariants; Dixie owns the endpoint-local
   contract / idempotency / replay records, ingress references, and the public/private projection.
2. **The physical placement decision** for each half (Dixie / Finn / sibling runtime), and which
   sibling gates (#9 / #10 / #11 / #12 / #20) each placement clears or remains held behind.
3. **The interface contract** — that any Dixie/Finn durable adapter is a swap-in of the canonical
   `StorageAdapter` interface, never a parallel canonical lifecycle.
4. **The ingress-reference contract** — exactly which references Dixie persists (and privately) versus
   which canonical records Straylight persists, so no record is double-owned or orphaned.
5. **The ADR-022D invariant-preservation statement** (§4.3) — that the chosen substrate preserves
   append-only, hash-chained, tamper-detectable audit semantics.
6. **The Freeside boundary** — Freeside as a downstream consumer of governed recall, never a durable
   host or a direct-write client (Option 6; gate #11).

> Phase 46K authors no handoff packet and assigns no placement; it records what the packet must contain
> so the future gate-clearing lane cannot leave ownership ambiguous.

---

## 7. Runtime no-leak mirror question

Phase 46J hardened the **route-vector validator** (`FORBIDDEN_PUBLIC_KEYS` + 44/44 self-check), not the
runtime serializer (`no-leak.ts`). The runtime `no-leak.ts` denylist (which mirrors the validator's
forbidden-key set) does **not** yet forbid the 37 canonical / consent key names; the mirror was
explicitly deferred (46J §6 / §12 criterion 6). The charter asks Phase 46K to decide whether the
gate-clearing ADR / implementation-readiness package must require runtime exact-key mirror hardening
**(a)** before implementation authorization, **(b)** before ADR-022E gate #8 can be cleared, or **(c)**
only before route/storage implementation. Phase 46K modifies **no** runtime code.

> **Decision.** Runtime exact-key `no-leak.ts` mirror hardening is required **before implementation
> authorization — and specifically before any durable-store route/storage implementation begins emitting
> canonical / consent refs internally** (options (a) and (c), which coincide). It is **NOT** a
> precondition for *clearing* ADR-022E gate #8 (option (b) is rejected).

**Why (a) ∧ (c), not (b):**

1. **The leak risk is a runtime-emission risk, not a paper risk.** The runtime gap is latent today only
   because `buildAdmissionSpikePublicResponse` emits none of these fields (§3 fact 7). The moment a
   durable-store implementation begins emitting canonical / consent refs internally, the serializer must
   forbid them on the public surface — so the mirror must land **before** that code is authorized and
   **before** any route/storage implementation emits the fields. Options (a) and (c) therefore name the
   same point: the implementation/authorization boundary.
2. **Clearing gate #8 emits nothing.** Gate #8 would be cleared only by a *separate ADR* proposing the
   production adapter, citing the handoff packet, and preserving the ADR-022D invariants (§4.1–§4.3).
   Authoring and accepting that ADR writes no record, opens no socket, and renders no public response — it
   cannot leak.
   The runtime mirror is therefore not a logical precondition of clearing the gate (option (b) rejected).
3. **Correct sequencing keeps the per-area chain disciplined.** 46J §6 already sequenced the runtime
   mirror "with the future runtime durable-store lane that begins emitting canonical/consent refs
   internally — that is where the mirror's matching fixtures and behavior belong." Phase 46K preserves
   that sequencing: the runtime mirror is an item on the §9 implementation-readiness checklist
   (criterion 11) and a §14 blocked lane, owed **before implementation**, not before the gate-clearing
   ADR.

> **Consequence for the gate-clearing ADR / readiness package.** The future gate-clearing ADR / sibling
> handoff packet **may be authored and accepted without the runtime mirror first** (it is a paper
> decision). But the implementation-readiness **package** (§9) must **require** the runtime exact-key
> mirror — with its own matching runtime fixtures, proven fail-closed — as a hard precondition that must
> be satisfied **before implementation can be authorized**. Phase 46K records this requirement; it does
> not perform it, and changes no runtime code.

---

## 8. Consent/storage vector alignment intake

This section summarizes what Phase 46J (PR #155) proved and explains how that affects readiness for
ADR-022E gate #8. Phase 46K changes no vector and no validator; it intakes the prior gate's result.

**(8.1) What Phase 46J proved.**

- **Exact-key public-surface validator denylist hardening.** Phase 46J added, to the route-vector
  validator's `FORBIDDEN_PUBLIC_KEYS`, the canonical ref arrays (`supersedes_refs` /
  `linked_assertion_refs`), the canonical TransitionReceipt / AuditEvent refs + hash-chain links
  (`signer_refs` / `audit_event_ref` / `receipt_hash` / `audit_hash` / `previous_audit_hash` /
  `policy_decision_ref` / `assertion_refs` / `target_refs`), the subject mapping (`subject_refs`), and
  the consent / auth family (`consent` / `consent_ref` / `consent_proof` / `consent_receipt` /
  `consent_subject` / `consent_grantor` / `consent_scope` / `auth_decision`) — each in snake_case **and**
  camelCase.
- **37 added forbidden public keys.** One self-check case per added key.
- **44/44 self-check.** The harness reports 44/44 cases behaving as required.
- **42 fail-closed negative mutations.** The 5 pre-existing cases + the 37 added-key cases each assert
  the validator fails closed when the forbidden key appears on the public surface.
- **2 no-overmatch guards.** Two `mode: 'no-overmatch'` cases prove the bare `consent` / `auth_decision`
  additions do **not** over-match the legitimate `consent_assumption` / `auth_assumption` public draft
  markers (exact `Set.has` matching).
- **No route-vector JSON changes.** The five vectors were verified to contain none of the added names on
  their public surface, so all five still validate clean.
- **No sixth vector.** The no-sixth-vector lock holds; consent/storage is cross-cutting across the five
  outcomes, not a new outcome.
- **`expected_private_or_audit_effect` remains documentation evidence only.** The validator does not
  validate that block's contents and the public-surface walk excludes it; Phase 46J added no enforcement
  there.
- **`recall_eligible` remains derived / non-authoritative.** Phase 46J persisted none, added none, and
  changed no vector field.
- **Runtime no-leak mirror deferred.** Phase 46J hardened only the non-runtime validator; the runtime
  `no-leak.ts` mirror was explicitly deferred (§7).

**(8.2) How that affects readiness for ADR-022E gate #8.** Phase 46J's result moves the §4.4 public/
private projection requirement from "wholly outstanding" to "**non-runtime half discharged, runtime half
owed**":

- It **discharges** the non-runtime, contract-layer evidence that the canonical / consent key names are
  forbidden on the public surface — the validator now fails closed on each (§4.5). This removes the
  overclaim risk at the **vector** layer before any field is emitted internally and satisfies §9
  checklist criterion 10's non-runtime portion.
- It **does not discharge** the runtime serializer hardening (§7) — the deferred `no-leak.ts` mirror
  remains owed before implementation authorization (§9 criterion 11).
- It **does not advance** gate #8 itself — hardening a denylist is not clearing a gate (§4.1–§4.3), and
  Phase 46J explicitly cleared no gate. Gate #8 and the related held gates remain held.

> **Net effect on readiness.** After Phase 46J, the only **non-runtime** no-leak hardening debt the chain
> carried is **closed**, and the readiness picture is cleaner: the requirements that remain before the
> gate-clearing ADR / handoff packet can be authored are the **decision artifacts** (this decomposition,
> the ADR, the handoff packet) and — before *implementation* — the runtime mirror, the data model /
> schema / migration / rollback plan, and the persistence plans (§9). No remaining *decomposition*
> blocker is introduced by the consent/storage alignment intake; it simplifies, rather than complicates,
> the path to the gate-clearing ADR (§13).

---

## 9. Implementation-readiness checklist

This section defines the future checklist that must be satisfied **before implementation can begin**.
Phase 46K satisfies **none** of these (it is a readiness *decomposition*, not an acceptance and not a
build); they are the bar a downstream lane must clear, carried and refined from 46I §12 and updated for
what 46J discharged (criterion 10's non-runtime portion). Each criterion names its owning future gate.

| # | Implementation-readiness criterion | Owning future gate |
|---|---|---|
| 1 | **Accepted ADR-022E gate-#8 gate-clearing ADR** — a separate ADR proposing the production adapter, preserving the ADR-022D invariants (§4.1, §4.3). | Gate-clearing ADR lane (Straylight-repo ADR or sibling-repo PR). |
| 2 | **Accepted sibling handoff packet** — establishing the cross-repo wiring contract and ownership split, cited by the gate-clearing ADR (§4.2, §6.2). | Gate-clearing ADR lane + sibling handoff. |
| 3 | **Accepted durable-store ownership / adapter boundary** — the §6 split finalized, with the physical adapter placement (Dixie / Finn / sibling runtime) selected. | Durable-store design gate + gate-clearing ADR. |
| 4 | **Accepted storage topology** — the §7 split-storage direction (or a justified alternative) confirmed, with direct public/client storage writes rejected (Option 6). | Durable-store design gate. |
| 5 | **Accepted schema / migration plan** — the durable data model (records persisted vs derived vs projected, keys, indexes), schema versioning, backfill (or no-backfill) scope, and forward-only migration (or dev-only no-migration) plan (§5; 46I §8). | Durable-store design gate + gate-clearing ADR. |
| 6 | **Accepted auth / identity binding persistence plan** — session-derived, no caller override, bound at request / transition / assertion / receipt / audit levels (Row G; 46G §5), persisted privately. | Production identity-binding gate. |
| 7 | **Accepted consent proof / receipt persistence plan** — the consent reference recorded privately onto the canonical audit record (primary) and optionally the `TransitionReceipt`; the disjoint public-safe consent-receipt reference (46H §5 / §6). | Consent implementation lane + Dixie public-surface gate. |
| 8 | **Accepted signer / receipt / audit persistence plan** — canonical `signer_refs` / `audit_event_ref` / `receipt_hash` / `audit_hash` / `policy_decision_ref` persisted on the private primitives, competence resolved, production signature substrate selected (Row F; 46G §6; gate #20). | Production signer/authority gate. |
| 9 | **Accepted idempotency / replay persistence plan** — the final endpoint keying scoped by the bound identity, with same-key / different-identity collisions failing closed (Row J; 46G §7). | Route-contract idempotency decision. |
| 10 | **Accepted public / private projection hardening plan** — the production no-leak serializer enforcing `privacy_scope` + frame disposition. **The non-runtime validator key-name hardening is DONE (Phase 46J; §8).** The remaining work is the runtime mirror (criterion 11) and the production serializer itself. | No-leak serializer design gate. |
| 11 | **Accepted runtime no-leak stance** — the deferred **runtime `no-leak.ts` exact-key mirror** added and proven fail-closed with matching runtime fixtures, **before implementation can be authorized** (§7). | Runtime no-leak mirror lane. |
| 12 | **Accepted rollback / partial-failure plan** — atomicity, partial-failure, rollback / recovery against the append-only chain (§10). | Durable-store design gate. |
| 13 | **Accepted test / vector / validator plan** — extending the existing vectors and `--self-check` for the durable model, still no-leak-bounded, including the criterion-10/-11 hardening and matching runtime fixtures. | Implementation-spike readiness checklist. |
| 14 | **Accepted dev/operator vs production boundary** — the dev/operator-only spike posture (Phase 33M/33N) kept distinct from any production admission path; production admission remains separately gated (§11). | Dev/operator-vs-production boundary gate. |
| 15 | **Codex audit acceptance before PR** of the durable-store design / implementation. | The implementing lane's review/audit gate. |

> Exiting Phase 46K authorizes **no** runtime implementation and clears **no** gate. It records the
> checklist above; the build remains blocked until a future, separately-gated lane authors, **accepts**,
> and clears each item. Listing the criteria is not satisfying them.

---

## 10. Failure / rollback readiness

This section decomposes the future required answers for failure and rollback. It answers none of them;
it records the questions a future durable-store design / gate-clearing lane must answer (refining 46I §8
item 4 for readiness purposes). Today the spike fails closed atomically — there is no durable state to
roll back (§3 fact 1) — so every row below is a **future production** question, not a current gap.

| # | Failure / rollback concern | Future required answer (un-answered here) |
|---|---|---|
| 1 | **Partial write failure** | The durable atomicity model: a transition + assertion + receipt + audit write either all commit or none do, leaving no partially-admitted residue, preserving the append-only audit invariant. |
| 2 | **Transition written but assertion write fails** | Whether the transition is rolled back or compensated, and how the audit chain records the failure without minting a recallable assertion. |
| 3 | **Audit event failure** | If the append-only hash-chained `AuditEvent` cannot be written, the transition must **fail closed** (no admitted assertion), because auditability-without-history-rewrite is an ADR-022D invariant (§4.3). |
| 4 | **Consent receipt missing or invalid** | Missing / malformed / subject-mismatched / scope-mismatched / expired / revoked / replayed / signer-invalid consent fails closed and mints no admitted assertion (46H §7); service-token / operator auth is never treated as consent. |
| 5 | **Idempotency replay mismatch** | Identical retry → same result (no duplicate); conflicting retry under the same key / different identity → **fail closed** (Row J; 46G §7); the durable replay envelope is unresolved. |
| 6 | **Signer / authority mismatch** | An incompetent or unknown signer fails competence (`SignerCompetenceRule` / `Keyring`) and the transition fails closed — an ADR-022D invariant (unknown signer fails competence; §4.3). |
| 7 | **Cross-tenant / cross-estate write attempt** | A foreign-tenant / foreign-estate write fails closed (`a.estate_id === request.estate_id`; threat-model T6); identity is session-derived, never body-trusted (Row G; 46G §5). |
| 8 | **Storage capacity or persistence failure** | The substrate's capacity / persistence-failure behavior must fail closed (no partial admit), with no recallable residue and no public leak of the failure internals. |
| 9 | **Rollback that leaves no recallable partial assertion** | Any rollback / recovery path must leave **no** recallable partial assertion — a failed or rolled-back admit must be indistinguishable, for recall, from one that never happened. |
| 10 | **Public response no-leak during failure** | Every failure path returns a stable, public-safe refusal that reveals **no** raw / private / audit / debug / source / auth / signer / consent / storage material and never discloses which internal gate failed (§12 invariant 8; the runtime no-leak serializer, §7). |

> Every row above gates **implementation**; **none** gates a further **docs/decision** phase. Phase 46K
> answers none of them and implements no failure/rollback behavior; it records them as the failure/
> rollback readiness a future durable-store design / gate-clearing lane must establish and accept (§9
> criterion 12).

---

## 11. Production boundary

Phase 46K preserves that **even after a future implementation-readiness gate** (whether decomposition,
acceptance, the gate-clearing ADR, or the build itself), the following remain **separately gated** and
are **not** unblocked by this decomposition or by any future readiness acceptance:

- **Production admission remains separately gated.** Reaching implementation-readiness — or even
  authorizing the bounded default-off implementation spike — does not authorize production admission;
  production admission is a later, distinct gate (33K §20; 46I §14).
- **Public `remember-this` remains blocked.** No public / unauthenticated remember-this surface is
  designed or authorized; direct public/client storage writes are rejected (46I §7 Option 6).
- **Discord / freeform history ingestion remains blocked.** Unchanged.
- **User chat does not become memory merely because it was said.** No Discord / freeform ingestion and
  no user-chat-as-memory path; consent is never inferred from chat text (46H §4.5); the spike accepts
  only a synthetic dev marker.
- **Final schema freeze remains blocked unless separately authorized.** `schema_final: false` on every
  vector; neither this gate nor the gate-clearing ADR by itself freezes the final schema.
- **Route-contract freeze remains blocked unless separately authorized.** `route_contract_final: false`
  on every vector; a final route-contract pre-freeze gate is a distinct, later step (46I §13 step 8).

> **A readiness gate does not relax the production boundary.** Decomposing, accepting, or even clearing
> the durable-store gate makes the *durable-store* path legible; it does **not** authorize production
> admission, public remember-this, freeform ingestion, chat-as-memory, schema freeze, or route-contract
> freeze. Each remains its own separately-authorized gate.

---

## 12. Invariants

Phase 46K preserves **all** of the following (each already enforced in synthetic / spike / vector /
non-runtime-validator form where cited; any future durable-store readiness, design, or implementation
lane must carry each forward unchanged):

1. **A pending candidate is not recallable.** Only active, recall-eligible assertions enter the recall
   projection; the pending vector has empty recall and `public_receipt_ref: null`.
2. **A rejected candidate creates no admitted assertion.** reject vector
   `expected_private_or_audit_effect.no_admitted_assertion = true`; `synthTransitionFor` returns no
   transition for reject (`admission-intake.ts:162-167`).
3. **An accepted candidate creates / references an admitted assertion.** accept vector
   `admitted_assertion_status_class = "active"`; the candidate→transition→assertion chain intent.
4. **A superseded assertion is excluded from ordinary recall** unless explicitly requested/marked.
   Supersession flips the prior to `superseded` / `recall_eligible: false`
   (`admitted-assertion-ledger.ts:880-887`).
5. **A malformed / unsafe payload fails closed.** malformed vector `must_fail_closed = true`; the
   classifier accepts only the five forms and fails closed otherwise.
6. **Missing / unauthorized auth fails closed.** Disabled → 404, unauthorized → 403, malformed → 400;
   one stable refusal that never reveals which gate failed; both-empty rejects all
   (`admission-intake.ts:271-333`; `auth-gate.ts:70-95`).
7. **Missing / invalid consent fails closed in any future production admission model.** Missing,
   malformed, subject-mismatched, scope-mismatched, expired, revoked, replayed, or signer-invalid
   consent fails closed and mints no admitted assertion (46H §7); service-token / operator auth is never
   treated as consent.
8. **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
   material.** Enforced by the public-surface walk + `FORBIDDEN_PUBLIC_KEYS` (now **strengthened** with
   the canonical / consent key names — Phase 46J) + substring / regex / UUID / opaque-run walks; the
   runtime mirror is owed before implementation (§7).
9. **Private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private.**
   Forbidden on the public surface at any depth; the auth-decision / consent reference lives on the
   private audit record only (33V §5; 46H §6); the canonical signer/receipt/audit refs live on the
   private primitives.
10. **User chat does not become memory merely because it was said.** No Discord / freeform ingestion and
    no user-chat-as-memory path; consent is never inferred from chat text (46H §4.5).
11. **Public `remember-this` remains blocked.** No public / unauthenticated remember-this surface is
    designed or authorized; direct public/client storage writes are rejected (46I §7 Option 6).
12. **Discord / freeform history ingestion remains blocked.** Unchanged.
13. **Production admission / storage / auth / consent remain blocked.** ADR-022E gate #8 held;
    `storage_writes_performed` / `auth_implemented` / `consent_implemented` / `production_admission` all
    false on every vector.
14. **Route-contract freeze and final schema freeze remain blocked.** `route_contract_final` /
    `schema_final` false on every vector; Phase 46K freezes neither.
15. **ADR-022E gate #8 remains uncleared in this phase.** Phase 46K is not the gate-clearing ADR and
    clears nothing; the related gates #9 / #10 / #11 / #12 / #20 remain held.
16. **`recall_eligible` remains derived / non-authoritative; never persisted as canonical authority**
    (§5; 46F §7).
17. **Auditability without rewriting history.** The canonical audit log is append-only, hash-chained,
    and tamper-detectable via `verifyChain` (`audit.ts:77-89`; `storage/types.ts:33-68`; ADR-022D
    `:109-127`); a consent / auth-decision reference recorded onto it inherits that tamper-evidence
    without becoming public.

---

## 13. Next lane

The charter asks Phase 46K to select one safe next lane among: **(1)** the ADR-022E gate-#8 gate-clearing
ADR + sibling handoff packet (docs-only); **(2)** a runtime no-leak mirror hardening gate; **(3)** a
durable-store implementation-readiness acceptance gate; or **(4)** another decomposition gate if a
blocker remains. **Runtime implementation is not a candidate** — no artifact accepted so far proves
implementation is safe (§3, §9, §14).

> **Selected next lane: the docs/decision-only ADR-022E gate-#8 gate-clearing ADR + sibling handoff
> packet (Option 1). Not runtime; not implementation; the ADR/packet must preserve the ADR-022D
> invariants and clears gate #8 only when itself authored and accepted.**

**Reason.** This decomposition (this gate) reveals **no remaining *decomposition* blocker**: the
readiness requirements are now legible and ordered (§4–§10), the non-runtime no-leak hardening debt is
**closed** (Phase 46J; §8), and the runtime mirror is correctly sequenced as an *implementation*
precondition rather than a *gate-clearing* precondition (§7, §4.6). The chain's own ordering (46I §13
step 7; 46J §14 step 7) named "the durable-store implementation-readiness decomposition gate + ADR-022E
gate-#8-clearing ADR / sibling handoff packet" as one step; Phase 46K is the **decomposition** half, and
the **gate-clearing ADR + sibling handoff packet** is the natural, lowest-blast-radius next docs/decision
step. It is a paper artifact (a separate ADR proposing the production adapter, citing the handoff packet,
preserving the ADR-022D invariants — §4.1–§4.3) that emits nothing and therefore needs neither the
runtime mirror nor the build first.

**Why not the alternatives:**

- **Option 2 (runtime no-leak mirror hardening gate) is not the immediate step** — the runtime mirror is
  an *implementation-authorization* precondition (§7), correctly sequenced with the lane that begins
  emitting canonical / consent refs internally; running it before the gate-clearing ADR would invert the
  established sequencing (the ADR is a paper decision that cannot leak). It is recorded as a **documented
  companion**: a reviewer who prefers to discharge the runtime half of criterion 10/11 before the build
  may run it after the ADR and before implementation.
- **Option 3 (durable-store implementation-readiness acceptance gate) is premature now** — an acceptance
  gate accepts *this* decomposition; it adds a useful cycle but is best run **after** the gate-clearing
  ADR + handoff packet exist, so the acceptance can ratify a concrete ADR/packet rather than an
  abstract decomposition. Recorded as the **documented alternative**.
- **Option 4 (another decomposition gate) is not warranted** — Phase 46K finds **no** remaining
  decomposition blocker; the requirements are decomposed and ordered. A further decomposition gate would
  re-decompose already-legible work.

**Dependency ordering after Phase 46K** (carried from 46I §13 / 46J §14; step 7 now split into a
decomposition sub-step (this gate) followed by the gate-clearing ADR / handoff packet):

1. Phase 46E — durable storage **model direction** decided. *(Done; PR #150.)*
2. Phase 46F — durable storage **shape & route-vector alignment** decided. *(Done; PR #151.)*
3. Phase 46G — **auth / identity / signer** authority decided. *(Done; PR #152.)*
4. Phase 46H — **consent proof / receipt** decided. *(Done; PR #153.)*
5. Phase 46I — **durable-store design / decomposition + ADR-022E gate #8 boundary**. *(Done; PR #154.)*
6. Phase 46J — **non-runtime consent/storage vector/validator alignment**. *(Done; PR #155.)*
7. **Phase 46K — durable-store implementation-readiness decomposition.** *(This gate — docs/decision-only;
   no vector/validator/runtime change; gate #8 not cleared; readiness not accepted.)*
8. **ADR-022E gate-#8 gate-clearing ADR + sibling handoff packet** — a separate ADR proposing the
   production adapter, citing the handoff packet, preserving the ADR-022D invariants; clears ADR-022E
   gate #8 when authored and accepted. *(Selected next lane — docs/decision-only.)*
9. **Durable-store implementation-readiness acceptance gate** — ratifies the §9 checklist against the
   concrete ADR/packet. *(Documented alternative / companion.)*
10. **Runtime `no-leak.ts` exact-key mirror hardening lane** — adds the deferred runtime mirror + matching
    runtime fixtures, before implementation authorization (§7). *(Documented companion; implementation
    precondition.)*
11. **Final route-contract pre-freeze gate.**
12. **Bounded default-off implementation spike** — only if the §9 checklist is satisfied and gate #8 is
    cleared.
13. **Smoke / acceptance gate.**
14. **Freeside Characters client-contract handoff** (incl. the consent UX; 46H §12 criterion 8).

> **Implementation remains downstream.** Steps 8–14 are each held. The only step Phase 46K advances is
> **step 7** — decomposing the durable-store implementation-readiness requirements — which is itself
> docs/decision-only. **Runtime implementation is not the next step, and the gate-clearing ADR is not
> this document.**

---

## 14. Blocked lanes

Phase 46K is a bounded, docs/decision-only durable-store implementation-readiness decomposition gate. It
authorizes **none** of the following; each remains **blocked** and is **not** unblocked by decomposing
the readiness requirements or selecting the gate-clearing ADR / handoff packet as the next lane:

- durable Admission Wedge storage implementation (ADR-022E gate #8 held); DB writes; migrations; a
  durable data model, schema, or table definition; storage is not implemented;
- the ADR-022E gate-#8-clearing ADR itself; clearing gate #8 or the related gates #9 / #10 / #11 / #12 /
  #20;
- the **runtime `no-leak.ts` mirror hardening** (deferred; owed before implementation authorization — §7
  / §9 criterion 11) — Phase 46K changes no runtime code;
- production auth implementation; the production caller/auth model; auth is not implemented; cross-user
  admission;
- production consent implementation; consent-proof / consent-receipt model selection or build; consent
  is not implemented;
- production identity binding (tenant / estate / actor); identity binding is not finalized;
- production signer / authority semantics; the production signature substrate (ed25519 / secp256k1 /
  real-key HMAC);
- final idempotency / replay semantics (Dixie / endpoint-owned; undecided; Row J);
- route / API handler implementation **beyond the existing Phase 33N spike**; production admission;
- public `remember-this`; Discord command / history ingestion; user chat becoming memory; consent
  inferred from chat text; direct public/client storage writes (46I §7 Option 6);
- Freeside Characters runtime / client integration; the consent UX; package exports;
- the final Dixie route contract; route-contract freeze; production route deployment;
- production readiness of any kind; final / production schema freeze;
- LLM / voice; Finn production wiring; forget / revoke / correction UI (MVP-3-adjacent; surfaced in §5 /
  §10, not implemented);
- persisting `recall_eligible` as canonical authority (§5; 46F §7); freezing the physical durable adapter
  placement (§6);
- **any mutation of the five route-vector JSONs, the route-vector validator, the route-vector README,
  the Phase 33E fixtures, or the Phase 33E fixture validator** (§1).

> **A readiness decomposition does not authorize runtime implementation and clears no gate.** Decomposing
> the durable-store implementation-readiness requirements and selecting the gate-clearing ADR / handoff
> packet as the next docs lane makes the next decision legible; it does **not** build a store, **not**
> author a schema or migration, **not** clear any production gate, **not** author the gate-clearing ADR,
> **not** harden the runtime mirror, **not** implement auth or consent, **not** bind production identity,
> **not** implement signer semantics, **not** freeze the route contract or schema, and **not** authorize
> any route / storage / auth / consent / Freeside / package-export work. The Phase 33N dev/operator-only,
> disabled-by-default spike remains the only authorized route surface, and the do-nothing / synthetic-only
> posture (46E Option 6 / 46I §7 Option 1) remains in force.

If a later phase reaches for any of the above, it must re-open the Phase 33K precondition design, the
Phase 33M authorization gate, the Phase 33P / 33Q / 33R storage lane, the Phase 33U / 33V chain, the
Phase 46A–46J gates and this gate, and the relevant ADRs (Straylight-repo ADR-022E durable-store gate #8
and related gates #9 / #10 / #11 / #12 / #20; ADR-022D receipt/audit-chain invariants; ADR-026C /
ADR-026D route guardrails) first; it must not silently expand scope.

---

## 15. Corruption / duplicate guard

Phase 46K applies an explicit corruption / duplicate guard to **this** document (carried from the Phase
46E / 46F / 46G / 46H / 46I / 46J precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 18.`) appears exactly
  once.
- **Numbered sections appear once each.** Sections 1–18 each appear exactly once; the guard counts
  `^## N\.` occurrences and asserts one per number.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" token, a
  trailing one-word report heading, prose-claim dumps, or pasted terminal transcript appears in the
  document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row; no
  duplicated / truncated / wrapped table fragments appear.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is the §16
  validation command list.

The guard commands and their recorded results are in §16.

---

## 16. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46K
is docs/decision-only — it adds only this document and mutates no vector, validator, or fixture — so the
validators are run only to confirm the unchanged artifacts remain green. The fence-balance and
negative-claim checks avoid embedding affirmative-claim substrings in prose, so they cannot self-match.

```bash
git branch --show-current
git status --short --branch --untracked-files=all
git diff --check
git diff --name-status
git diff --stat
# Nothing-staged check (this lane stages nothing):
git diff --cached --name-status
git diff --cached --check
# Unchanged-artifact green-check (no mutation here):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# Confirm no vector JSON / validator / fixture was changed (only this doc is added):
git diff --name-only -- docs/admission-wedge/
# Self-reference / next-lane label check (grep -E so `|` is real alternation):
grep -E "Phase 46J|Phase 46K" docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md
# Duplicate/corruption grep (advisory):
grep -nE "Claude said|Patch Report|terminal report|RESULT:|Report$" docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md || true
# Enforcing negative check — fail if any affirmative readiness / freeze / implementation /
# gate-clearing / authorization claim appears in PROSE. The patterns are affirmative-only and
# word-boundaried, so the document's negated prose ("does not clear …", "remains uncleared", "is not
# authorized", "implementation is not authorized") and the fenced validation commands below are
# deliberately NOT matched. It is NOT masked with `|| true`:
python3 - <<'PY'
import re
from pathlib import Path
p = Path("docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md")
patterns = [
    r"\bruntime implementation is selected\b",
    r"\bimplementation is authorized\b",
    r"\bimplementation-readiness is accepted\b",
    r"\breadiness is accepted\b",
    r"\broute contract is frozen\b",
    r"\bschema is frozen\b",
    r"\bfinal schema is frozen\b",
    r"\bstorage is implemented\b",
    r"\bthe durable store is built\b",
    r"\bmigration is applied\b",
    r"\bgate #8 is cleared\b",
    r"\bADR-022E gate #8 is cleared\b",
    r"\bthe gate-clearing ADR is (?:authored|accepted|complete|this document)\b",
    r"\bis production[- ]ready\b",
    r"\bproduction[- ]readiness is (?:declared|achieved|confirmed|established|met)\b",
    r"\bdb writes? (?:is|are) authorized\b",
    r"\bvectors? (?:was|were) (?:modified|mutated|changed)\b",
    r"\bvalidator (?:was|were) (?:modified|mutated|changed)\b",
    r"\bruntime (?:code|source|mirror) (?:was|were) (?:modified|mutated|changed|hardened)\b",
    r"\bauth is implemented\b",
    r"\bconsent is implemented\b",
    r"\bidentity binding is (?:final|frozen|finalized|implemented)\b",
    r"\bthe physical adapter placement is (?:frozen|final|selected here)\b",
]
regexes = [re.compile(pat, re.IGNORECASE) for pat in patterns]
fence = chr(96) * 3
inside_fence = False
hits = []
for idx, line in enumerate(p.read_text().splitlines(), 1):
    if line.strip().startswith(fence):
        inside_fence = not inside_fence
        continue
    if inside_fence:
        continue
    if any(rx.search(line) for rx in regexes):
        hits.append((idx, line))
if hits:
    for idx, line in hits:
        print(f"{idx}: {line}")
    raise SystemExit(1)
print("The enforcing scan found no affirmative readiness/freeze/build/gate-clearing/authorization claims outside fenced validation commands.")
PY
# Fence-balance check (dependency-free; even count = balanced; char-code form avoids embedding
# a literal triple-backtick that would unbalance this doc):
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

Recorded results for this lane (the captured terminal output accompanies this work):

- **docs-only scope check** — only the single new file
  `docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md` is added; no
  route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator,
  `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, runtime, or generated file
  is touched;
- **no admission-wedge artifact changed** — `git diff --name-only -- docs/admission-wedge/` lists
  nothing (the new doc lives at `docs/`, not under `docs/admission-wedge/`), confirming no vector JSON,
  validator, README, or fixture was modified;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no `git add` / commit / push);
  `git diff --check` and `git diff --cached --check` report no whitespace errors;
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes
  valid, 0 failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures,
  no sixth vector**; the `--self-check` harness reports **44/44** cases behaving as required (42
  fail-closed negative mutations + 2 exact-key no-overmatch guards);
- **self-reference label check** — `grep -E "Phase 46J|Phase 46K"` confirms both the `Phase 46J`
  (predecessor) and `Phase 46K` (self) labels are present;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the eighteen headings
  1–18 exactly once each;
- **duplicate/corruption grep** — the advisory grep finds no pasted terminal-report fragment in the
  document body;
- **negative readiness-claim check (enforcing)** — the `python3` scan excludes fenced lines and reports
  the affirmative-only, word-boundaried patterns (including durable-store / gate-clearing /
  vector-mutation / runtime-mutation / readiness-acceptance claims) found no match outside the fenced
  validation commands; the document's **negated** prose is correctly not matched. The scan is not masked
  with `|| true`;
- **fence-balance check** — the dependency-free `node -e` counter reports an even (balanced)
  triple-backtick count; the single fenced block is the validation command list above.

---

## 17. Success criteria for Phase 46K

Phase 46K succeeds if and only if:

1. **Docs / decision-only** — it creates only this Phase 46K document; it changes **no** route-vector
   JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, runtime
   source, test, route, store, migration, auth, consent, config, env, package, lockfile, CI, or
   generated file, and edits **no** adjacent repository (§1).
2. **Scope and verdict recorded** — Phase 46K is docs/decision-only, not implementation-readiness
   acceptance, not the gate-clearing ADR, does not clear gate #8, does not authorize durable-store
   implementation, and decomposes what must be true before the gate-clearing ADR / sibling handoff
   packet can be authored (§1).
3. **Evidence intake recorded** — the Dixie chain (33K → 33L → 33M → 33N → 33P → 33Q → 33R → 33U → 33V →
   33W–33Z → 46A → … → 46J → 46K), the canonical Straylight substrate, and PR #155 as the latest
   checkpoint are summarized (§2).
4. **ADR-022E gate #8 readiness decomposed** — separate-ADR requirement, sibling-handoff-packet
   requirement, ADR-022D invariant-preservation requirement, public/private projection requirement, the
   proof that validator hardening is sufficient non-runtime evidence but not runtime no-leak hardening,
   the proof that the runtime mirror is unnecessary for gate-clearing scope but required before
   implementation authorization, and the proof that implementation-readiness ≠ implementation
   authorization (§4).
5. **Durable-store implementation boundary decomposed** — candidate / transition / assertion /
   denial / supersession / TransitionReceipt / AuditEvent / consent / signer / auth-identity /
   idempotency / public-safe-receipt / private-audit / retention-revocation-forget / tenant-estate-actor
   / privacy-risk-frame records and the derived non-authoritative `recall_eligible`, all un-frozen, no
   schema (§5).
6. **Adapter / ownership readiness preserved** — Straylight canonical; Dixie route-side only if
   authorized; physical placement future-gated; Finn/sibling may own pieces; Freeside client/handoff
   only; split storage a future-gated direction; and what the handoff packet must say to avoid ownership
   ambiguity (§6).
7. **Runtime no-leak mirror question decided** — required before implementation authorization / route-
   storage implementation, not before gate clearing; runtime code unchanged (§7).
8. **Consent/storage vector alignment intake summarized** — the Phase 46J facts (exact-key denylist
   hardening, 37 keys, 44/44, 42 fail-closed, 2 no-overmatch, no JSON change, no sixth vector,
   `expected_private_or_audit_effect` documentation-only, `recall_eligible` derived, runtime mirror
   deferred) and their effect on readiness (§8).
9. **Implementation-readiness checklist defined** — the 15-item future checklist (gate-clearing ADR,
   handoff packet, ownership/adapter, topology, schema/migration, auth/identity, consent, signer/receipt/
   audit, idempotency/replay, projection hardening, runtime no-leak stance, rollback/partial-failure,
   test/vector/validator, dev/operator-vs-production boundary, Codex audit acceptance), none satisfied by
   Phase 46K (§9).
10. **Failure / rollback readiness decomposed** — the 10 future required answers (partial write,
    transition-without-assertion, audit failure, consent missing/invalid, idempotency mismatch, signer
    mismatch, cross-tenant write, storage capacity/persistence failure, no recallable partial assertion,
    public no-leak during failure), none answered here (§10).
11. **Production boundary preserved** — production admission, public remember-this, Discord/freeform
    ingestion, chat-as-memory, final schema freeze, and route-contract freeze each remain separately
    gated even after a future readiness gate (§11).
12. **Invariants restated** — pending not recallable; rejected mints nothing; accepted creates/references;
    superseded excluded; malformed fails closed; missing/unauthorized auth fails closed; missing/invalid
    consent fails closed; public no-leak; private receipt/audit/consent/storage private; not user-chat
    memory; public remember-this blocked; Discord ingestion blocked; production admission/storage/auth/
    consent blocked; route-contract + schema freeze blocked; gate #8 uncleared; `recall_eligible`
    derived; auditability without history rewrite (§12).
13. **Next lane selected + ordering updated** — the docs/decision-only ADR-022E gate-#8 gate-clearing ADR
    + sibling handoff packet selected (Option 1), the runtime no-leak mirror gate and the
    implementation-readiness acceptance gate recorded as documented companions/alternatives, another
    decomposition gate rejected (no remaining blocker), and the post-46K ordering recorded with
    implementation downstream (§13).
14. **Blocked lanes preserved** — no durable / DB-write / migration / schema / gate-clearing-ADR /
    runtime-mirror / auth / consent / identity / signer / route / Freeside / package / production-
    readiness lane is authorized, and no vector / validator / fixture is mutated (§14).
15. **Corruption / duplicate guard applied** — the document passes the §15 guard, with results recorded
    in §16.
16. **No freeze, no production-readiness claim, no gate clearance, no readiness acceptance** — Phase 46K
    freezes neither the route contract nor the schema, declares no production readiness, does **not**
    clear ADR-022E gate #8, and does **not** accept implementation readiness (§1, §4.7, §14).

---

## 18. Cross-references

- [`docs/ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 46J (PR #155); its §9 / §14 discharged the non-runtime validator no-leak hardening debt (37
  exact-key additions; 44/44 self-check), deferred the runtime `no-leak.ts` mirror (§6), and named this
  Phase 46K durable-store implementation-readiness decomposition gate + ADR-022E gate-#8-clearing ADR as
  the next lane (§14 step 7).
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
  — Phase 46I (PR #154); its §4 recorded the gate #8 boundary, §5 decomposed the durable records, §6 the
  ownership/adapter boundary, §7 selected the split-storage direction, §8 the migration/lifecycle
  preconditions, §12 the eleven-item exit checklist (incl. criterion 8 key-name hardening), and §13 step
  7 named this gate.
- [`docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
  — Phase 46H (PR #153); the consent boundary, the consent-proof object model, the 10-case consent
  failure taxonomy, the consent-receipt public/private posture, and the consent key-name no-leak debt.
- [`docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
  — Phase 46G (PR #152); the auth/identity/signer boundary, the session-derived identity binding, the
  canonical `subject_refs` mapping, and the signer/receipt/audit key-name no-leak debt.
- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 46F (PR #151); the storage-shape ↔ vector mapping, `recall_eligible` derived, and the first
  recording of the canonical-ref-array hardening gap.
- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md)
  — Phase 46E (PR #150); the storage model direction and the unresolved physical adapter placement.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V (PR #140); the `AuditEvent` / `TransitionReceipt` split, the `public_receipt_ref` adoption,
  the `privacy_scope` + frame-disposition projection boundary, and the undesigned migration/backfill/
  rollback grounding §5 / §10.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U (PR #139); the A–O reconciliation (rows F / G / J / O held; ADR-022E gates #8 / #10 / #12 /
  #20 held; Row B ingress-refs-only) grounding §2 / §4 / §5.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 46B (PR #147), the structural archetype for this decomposition gate (blocker inventory →
  dependency ordering → named lanes → next-lane decision → blocked lanes).
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs` with
  the five vector JSONs — inspected **read-only** to ground the no-leak boundary, the
  `FORBIDDEN_PUBLIC_KEYS` set (now hardened by 46J), the false flags, the no-sixth-vector lock, and the
  44/44 self-check. **None is modified.**
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/{auth-gate,classifier,public-response,no-leak,admitted-assertion-ledger}.ts`
  — inspected **read-only** to ground the §3 spike facts, the §5 record decomposition, the §10
  failure/rollback decomposition, the §7 runtime-mirror deferral, and the §12 invariants. **None is
  modified.**
- `loa-straylight/src/straylight/types.ts`, `loa-straylight/src/straylight/storage/types.ts`,
  `loa-straylight/src/straylight/audit.ts`, and
  `loa-straylight/docs/decisions/{ADR-022D,ADR-022E}-…md` — inspected **read-only** as the **canonical**
  Straylight substrate cited in §2.2 / §4 / §5 / §6 (the `StorageAdapter` upsert-assertion /
  append-only-transition / append-only-hash-chained-audit surface at `storage/types.ts:33-68`; the
  `Assertion` / `TransitionReceipt` / `AuditEvent` primitives at `types.ts:145-167` / `:364-388` /
  `:514-529`; `verifyChain` at `audit.ts:77-89`; ADR-022D invariants at `:109-127`; ADR-022E gate #8 at
  `ADR-022E-phase-22-deferred-features.md:57` and the related held gates #9 / #10 / #11 / #12 / #20).
  **Not edited by this phase.**
- `@loa/straylight` — canonical primitive / substrate owner; PR #65 (merged) answered the A–O primitive
  review. Straylight-repo ADR-022E (durable-store gate #8 + related gates #9 / #10 / #11 / #12 / #20,
  **held**), ADR-022D (receipt/audit-chain invariants), ADR-026C, ADR-026D are decision records cited as
  guardrails. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — the cross-repo acceptance whose
  mirror/adapter is test-only, not exported, not runtime-wired; Freeside remains a client/handoff surface
  (§6), never the canonical durable store; the consent-UX / client-contract handoff stays deferred (§13
  step 14). **Not edited by this phase.**
