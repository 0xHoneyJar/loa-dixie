# Phase 46I — Admission Wedge Durable-Store Design & ADR-022E Gate #8 Decision Gate

> **Phase**: 46I
> **Branch context**: `phase-46i-admission-durable-store-adr-022e-gate`
> **Related**: Phase 46H consent proof / receipt decision (PR #153,
> [`ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
> §10 / §13, which selected and scoped this gate as the next lane — the durable-store design gate +
> ADR-022E gate-#8 ADR, with an optional preceding non-runtime consent vector/validator alignment if
> justified); Phase 46G auth / identity / signer authority decision (PR #152,
> [`ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md));
> Phase 46F durable storage shape & route-vector alignment (PR #151,
> [`ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md));
> Phase 46E durable storage model decision (PR #150,
> [`ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md));
> Phase 46D storage/auth/consent acceptance (PR #149); Phase 46C storage/auth/consent blocker
> decomposition (PR #148); Phase 46B route-contract implementation-readiness decomposition
> (PR #147); Phase 46A route-vector alignment acceptance (PR #146); Phase 33Z route-vector alignment
> (PR #144) + its PR #145 next-lane label/provenance correction; Phase 33Y route-contract revision
> acceptance (PR #143); Phase 33X route-contract revision draft (PR #142); Phase 33V
> storage/auth/consent design finalization (PR #140); Phase 33U Straylight-response intake
> (PR #139); Phase 33R bounded-ledger acceptance (PR #136); Phase 33Q bounded synthetic
> admitted-assertion ledger (PR #135); Phase 33P storage/receipt hardening (PR #134); Phase 33N
> dev/operator-only route spike; Phase 33M dev/operator route-spike authorization gate; Phase 33K
> storage/auth/consent precondition design; Phase 33L route-contract test-vector fixture draft;
> Straylight (`@loa/straylight`) PR #65 (A–O primitive-review verdicts, **merged**); Straylight-repo
> ADR-022E durable-store gate #8 (and related gates #9 / #10 / #11 / #12 / #20), **held**;
> Straylight-repo ADR-022D MVP-persistence / audit-owner invariants; ADR-026C / ADR-026D route
> guardrails; freeside-characters Phase 45J / PR #177 (Dixie v1 mirror-refresh acceptance, merged
> 2026-06-06).
> **Status**: **docs / decision-only.** This gate adds **only this document**. It changes **no**
> route-vector JSON, **no** route-vector validator, **no** route-vector README, **no** Phase 33E
> fixture or fixture validator, and **no** runtime source, test, route, route handler, storage, store
> code, DB write, migration, auth, consent, package export, config, env, package, lockfile, CI,
> generated file, or binary. No adjacent repository (`loa-straylight`, `freeside-characters`) is
> touched.
> **This is a durable-store *design / decomposition* gate, not implementation, and not a
> gate-clearing ADR.** It records, on paper, what ADR-022E gate #8 requires; it designs and
> decomposes the durable-store data model, ownership/adapter boundary, storage topology options,
> migration / schema / lifecycle preconditions, and the public/private no-leak hardening boundary;
> and it defines the checklist a future gate must satisfy before ADR-022E gate #8 can be cleared. It
> selects the safest next lane (§7 / §13). It does **not** implement durable storage, **not** author
> or apply a migration, **not** authorize DB writes, **not** implement auth or consent, **not** change
> the route handler, **not** authorize production admission, **not** freeze the route contract, **not**
> freeze the final schema, and **not** clear the Straylight-repo ADR-022E durable-store gate #8.

Every assessment below is grounded read-only against the actual Dixie repo (the Phase 46E
durable-storage-model decision, the Phase 46F storage-shape alignment, the Phase 46G
auth/identity/signer decision, the Phase 46H consent proof/receipt decision, the Phase 46A / 46B /
46C / 46D gates, the Phase 33K precondition / 33M authorization / 33N spike / 33P–33R storage lane,
the Phase 33U / 33V chain, the **five** route-vector JSONs, the route-vector validator and its
README, and the Phase 33N spike source under `app/src/services/admission-wedge-spike/` plus the route
handler `app/src/routes/admission-intake.ts`) and read-only against the **canonical** Straylight
(`@loa/straylight`) substrate (`types.ts`, `estate.ts`, `audit.ts`, `keyring.ts`, `signatures.ts`,
`storage/types.ts`, and `docs/decisions/ADR-022D…` / `ADR-022E…` / `docs/mvp/threat-model.md`). Where
a claim could not be grounded in the read material, it is marked as such.

---

## 1. Status and scope

Phase 46I is the bounded **durable-store design / decomposition gate** that follows, and is named
by, Phase 46H
([`ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
§10 / §13, PR #153). Phase 46H recorded the consent proof / receipt boundary and selected, as the
next blocker in the established ordering (46G §12 step 5), "the **durable-store design gate +
ADR-022E gate-#8-clearing ADR** (which must persist the accepted auth/identity/signer/consent
references), with an optional preceding non-runtime consent vector/validator alignment lane once the
§5 object model is accepted" (46H §13). Phase 46I executes the **design / decomposition** half of
that charter: it designs and decomposes the durable-store / ADR boundary, defines what remains
required before gate #8 can be cleared, and stops **short** of the gate-clearing ADR and any build.

**Verdict.** Phase 46I:

- is **docs / decision-only** — its only output is this design/decomposition document;
- is **not durable storage implementation** — no durable store, schema, table, store code, or
  storage write is created; storage is not implemented;
- is **not migration authorization** — no migration is authored, applied, or authorized; no DB write
  is authorized;
- is **not auth / consent implementation** — no authentication, authorization, consent-proof,
  consent-receipt, or credential-handling code is created or changed; auth is not implemented;
  consent is not implemented;
- is **not route / API implementation** — the Phase 33N dev/operator-only, disabled-by-default spike
  remains the only authorized route surface; nothing is added to it;
- is **not production admission** — production admission remains blocked;
- is **not a route-contract freeze** — the route contract is not frozen;
- is **not a final schema freeze** — the final / canonical / production schema is not frozen.

Phase 46I additionally:

- **is not the ADR-022E gate-#8-clearing ADR, and does not clear** the Straylight-repo ADR-022E
  durable-store gate #8 (or the related held gates #9 / #10 / #11 / #12 / #20) — designing and
  decomposing the durable-store boundary on paper is not clearing a gate; gate #8 remains uncleared;
- **does not author a frozen durable data model, schema, or migration** — it decomposes the durable
  records and their preconditions and records the exit checklist, leaving the final data model,
  schema, and migration to a future, separately-gated lane;
- **does not freeze the physical durable adapter placement** (Dixie / Finn / sibling runtime), which
  Phase 46E left unresolved under ADR-022E gate #8;
- **does not modify** runtime source, the route-vector JSONs, the route-vector validator, the
  route-vector README, the Phase 33E fixtures, the Phase 33E fixture validator, validators of any
  kind, vectors, package exports, config / env, CI, migrations, generated files, binaries, or any
  adjacent repository — it changes no vector JSON and no validator;
- **declares no production readiness** of any kind.

> **A durable-store *design / decomposition* authorizes no runtime work and clears no gate.** Phase
> 46I records what ADR-022E gate #8 requires, decomposes the durable records, the ownership/adapter
> boundary, the topology options, the migration/lifecycle preconditions, and the no-leak hardening
> boundary, and defines the exit checklist a future gate must satisfy. The output is a design
> recorded on paper, not a built store, a frozen schema, an applied migration, a cleared gate, or the
> gate-clearing ADR itself. A later, separately-gated phase must still (a) author and accept the
> durable data model / schema / migration plan, (b) clear ADR-022E gate #8 with a gate-clearing ADR
> that preserves the ADR-022D receipt/audit-chain invariants, and (c) only then authorize any build.

---

## 2. Source chain (evidence intake)

This gate sits one rung above the Phase 46H consent proof / receipt decision on the Dixie
route-contract ladder, and it is the **design / decomposition** sub-step of the prior "step 5" — the
durable-store design gate + ADR-022E gate-#8-clearing ADR (46H §13 step 5). It introduces no new
contract or vector material; it consumes the storage / auth / consent decision cluster (46E / 46F /
46G / 46H), the prior precondition / authorization / spike / storage lanes, and the canonical
Straylight substrate to design and decompose the durable-store / ADR boundary.

### 2.1 Dixie (loa-dixie) — the storage / auth / consent and route-contract lanes

| Phase | PR | Artifact / contribution (relevant to the durable-store design / ADR-022E gate #8 boundary) |
|-------|----|------|
| 33K | #129 | **Storage/auth/consent precondition design.** Drafted the durable storage record categories, the service-auth options A/B/C/D, the consent options A/B/C/D, the idempotency precondition, the no-leak public/private preconditions, the threat model, and the exit criteria. Froze nothing. |
| 33L | #130 | **Route-contract test-vector fixture draft.** Authored the five non-runtime route-contract vectors + validator; carried the storage/auth/consent draft assumptions and the unresolved-review markers `[E,G,H,K,N,O]` / `[J]`. |
| 33M | #131 | **Dev/operator route-spike authorization gate.** Authorized the Phase 33N spike: dev/operator gate only, disabled-by-default; Storage Option A (no durable store, no DB writes, no migrations); rollback trivial — no durable state to roll back; no production storage / auth / consent. |
| 33N | #132 | **Dev/operator-only route spike.** `POST /api/admission/intake`, disabled-by-default; the synthetic transition built from fixed dev constants, never request-controlled material; **Storage Option A** (no durable store, no DB writes, no migrations). |
| 33P | #134 | **Storage / receipt hardening decision.** Selected Option B (a possible future dev-only, bounded synthetic admitted-assertion store); **rejected Option D** (production-like durable storage); named the validator denylist / `FORBIDDEN_PUBLIC_KEYS` as the boundary a store-backed projection must satisfy. |
| 33Q | #135 | **Bounded synthetic admitted-assertion ledger.** A bounded, process-local, Map-backed, non-durable, fail-closed, synthetic-only ledger exposed only as a route DI / test seam; models current-state projection (includes/excludes) + synthetic audit/provenance over synthetic state; opens no DB / file / socket / timer. |
| 33R | #136 | **Bounded-ledger acceptance.** Accepted Phase 33Q **only** as a bounded, non-production, test-seam-only synthetic proof for MVP 2 — not production admission, not durable storage, not a final schema, not production route readiness. |
| 33U | #139 | **Straylight-response intake.** Reconciled PR #65 A–O verdicts. Rows **F (production signer/authority), G (production tenant/estate/actor identity binding), J (final endpoint idempotency keying), O (durable store under ADR-022E gate #8)** remain **held**. Row B: `admitted` is a public `outcome_class`, never a status; canonical `active` `Assertion` is Straylight's; Dixie holds **ingress refs only**. ADR-022E gates #8 / #10 / #12 / #20 held. |
| 33V | #140 | **Storage/auth/consent design finalization.** Split `SyntheticAuditRecord` → `AuditEvent` + `TransitionReceipt`; adopted `public_receipt_ref`; drew the private/public projection boundary on `privacy_scope` + frame disposition; kept **migration / backfill / rollback undesigned**; consent reference private-audit-only. |
| 33W–33Z | #141–#144 | **Route-contract readiness/revision/vector alignment.** Endpoint idempotency Dixie-owned; standardized `public_receipt_ref` (`null` where none); aligned the five vectors + validator (`--self-check` negative-mutation harness); `route_contract_final: false`, `schema_final: false`. |
| 33Z (corr.) | #145 | **Next-lane label/provenance correction** (34A → 46A). |
| 46A | #146 | **Route-vector alignment acceptance.** Accepted the 33Z alignment as bounded, non-runtime vector/validator alignment. |
| 46B | #147 | **Route-contract implementation-readiness decomposition.** Judged the storage/auth/consent cluster the upstream dependency. |
| 46C | #148 | **Storage/auth/consent blocker decomposition.** Decomposed the held storage (11 rows), auth (10), consent (10), and shared public/private (7) blockers into ordered, separately-clearable sub-gates. |
| 46D | #149 | **Storage/auth/consent acceptance.** Ranked the candidate next lanes; selected Phase 46E (durable storage model decision) as the deepest-blocker per-area gate; sequenced auth (B) and consent (C) downstream. |
| 46E | #150 | **Durable storage model decision.** Selected the §6 model direction (current-state projection + append-only hash-chained audit log on the canonical Straylight semantics/interfaces); left the storage **shape** undecided; left the **physical adapter placement** (Dixie / Finn / sibling runtime) unresolved under ADR-022E gate #8; recorded the §8 nine exit criteria. |
| 46F | #151 | **Durable storage shape & route-vector alignment.** Aligned the §6 model's durable **shape** onto the five vectors docs-only; classified conceptual-only vs current-public vs never-public fields; fixed `recall_eligible` as derived (never persisted authority); recorded the **canonical-ref-array hardening gap** (`supersedes_refs` / `linked_assertion_refs` absent from `FORBIDDEN_PUBLIC_KEYS`). |
| 46G | #152 | **Auth / identity / signer authority decision.** Recorded the auth boundary, identity-binding model, signer/authority model, replay/idempotency interaction, and public/private auth projection; held the **end-user authorization / consent** boundary separate from service authentication (§4.1); recorded the canonical **signer/receipt/audit/consent key-name** no-leak hardening gap (§8). |
| 46H | #153 | **Consent proof / receipt decision.** Recorded the consent boundary, the consent-proof object model (un-frozen), the consent-receipt public/private boundary, the consent failure taxonomy, the interaction with auth/identity/signer, and the public/private no-leak projection; extended the recorded hardening gap to the **canonical consent key-name family**; **selected this Phase 46I durable-store design gate + ADR-022E gate-#8 ADR** as the next lane (§10 / §13), with an optional preceding non-runtime consent vector/validator alignment. |
| **46I** | *(this doc)* | **Durable-store design / decomposition gate.** Records the source chain (§2) and accepted facts (§3); records what ADR-022E gate #8 requires and distinguishes documenting design preconditions from clearing the gate (§4); decomposes the durable-store records without freezing a final schema (§5); records the ownership / adapter boundary (§6); assesses the storage topology options and selects the safest topology direction (§7); decomposes the migration / schema / data-lifecycle preconditions (§8); carries forward the no-leak / hardening boundary debts (§9); decides the consent vector alignment question and selects the next lane (§10 / §13); restates the required invariants (§11) and the exit checklist for clearing gate #8 later (§12); preserves the blocked lanes (§14). Mutates **no** vector / validator / fixture / source. |

> **PR-number provenance note.** The PR numbers above are taken from the local git merge-commit
> history (`docs: … (#NNN)` subjects) and the Phase 46A–46H source-chain tables. Phase 46H's `#153`
> is the merge commit `b1418f4e "docs: add Admission Wedge consent proof receipt gate (#153)"`. Treat
> the PR numbers as git-sourced rather than as authority embedded in the gate bodies (each gate refers
> to itself only as "this doc").

### 2.2 Canonical Straylight substrate (`@loa/straylight`) — read-only

The durable substrate that ADR-022E gate #8 governs is **canonical Straylight semantics**, read-only
here to ground the §4–§9 decomposition. The adjacent `loa-straylight` repo is the canonical evidence
(Dixie's mirror modules are parity evidence only, never canonical proof — ADR-022D §3).

- **The append-only, hash-chained audit substrate and the current-state assertion surface are
  Straylight-owned interfaces.** The `StorageAdapter` interface declares `upsertAssertion` /
  `getAssertion` / `listAssertions` for current-state assertions ("mutable: status changes write a
  new version", `loa-straylight/src/straylight/storage/types.ts:46-49`), `appendTransition` /
  `listTransitions` for append-only transitions (`:51-53`), `upsertTransitionReceipt` /
  `getTransitionReceipt` / `listTransitionReceipts` for transition receipts (`:59-62`), and
  `appendAuditEvent` / `listAuditEvents` / `getAuditTail` for append-only, **hash-chained-per-estate**
  audit events (`:64-67`); the MVP semantics block states assertions/receipts upsert (latest write
  wins), transitions and audit events are append-only and immutable once written, and audit events
  are hash-chained per estate (`storage/types.ts:6-13`). `verifyChain` detects a tampered chain by a
  `previous_audit_hash` mismatch (`audit.ts:77-89`).
- **Canonical `Assertion`, `TransitionReceipt`, `AuditEvent` are distinct Straylight-owned
  primitives.** `Assertion` carries `status` (incl. `active` / `superseded`), `supersedes_refs`,
  `linked_assertion_refs`, `privacy_scope` (`public` / `tenant` / `actor_private` / `sealed`), and
  `recall_scope` (`types.ts:145-167`). `TransitionReceipt` is a first-class discriminated type
  (`kind` ∈ admission / denied / challenge / revocation / forget), carrying `transition_id`,
  `audit_event_ref`, `signer_refs`, `reasons`, `metadata`, and `receipt_hash` (`types.ts:364-388`).
  `AuditEvent` carries `signer_refs`, `policy_decision_ref`, `previous_audit_hash`, and `audit_hash`
  (the per-estate chain link) plus `transition_id` / `assertion_refs` (`types.ts:514-529`).
- **Signer competence is policy-decided, not a fixed list.** `SignerCompetenceRule` declares
  `required_signer_roles` / `forbid_signer_roles` over `SignerType` (`actor_controller`, `operator`,
  `runtime`, `reviewer`, `policy_service`, `admin`, `wallet`, `service_key`) (`types.ts:122-142`,
  `:185-197`); `evaluateCompetence` enforces them (`keyring.ts:77-200`).
- **Production signature material is out of scope at MVP.** The dev signature is an explicit
  HMAC-SHA256 placeholder a production implementation MUST replace with
  ed25519 / secp256k1 / HMAC-with-real-key-material (`signatures.ts:1-7`); `verifyDevSignature`
  checks envelope self-consistency, not caller identity or consent (`signatures.ts:54-74`).
- **Straylight-repo ADR-022E gate #8 (and its siblings) are held with explicit triggers.** Each row
  of ADR-022E is a **gate**: the feature must not advance "unless the trigger is satisfied **and** a
  separate ADR (or sibling-repo PR under teammate review per the cross-repo handoff index) explicitly
  cites the trigger"
  (`loa-straylight/docs/decisions/ADR-022E-phase-22-deferred-features.md`, gate table preamble).
  Gate **#8 (Production database / persistence substrate)**: "`InMemoryStorage` and `JsonlStorage`
  are the MVP adapters. | A separate ADR proposes the production adapter, cites the relevant
  sibling-repo handoff packet, and preserves the ADR-022D receipt and audit-chain invariants" (`:57`).
  The siblings that gate any Dixie durable wiring are **#9** (Finn runtime wiring), **#10** (Dixie
  boundary wiring), **#11** (Freeside as a consumer, not a host), **#12** (new HTTP / NATS / REST /
  Discord / Telegram surface), and **#20** (threat-model widening for the network adversary and
  cryptographic forgery), each held (`:…` gate rows #9–#12, #20). PR #65 cleared none of these gates.

### 2.3 Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts, reconciled by 33U.** PR #65 clarified
  the *vocabulary / design* only; it cleared **no** independent production gate and authorized **no**
  Dixie runtime, production storage / auth / consent, or Freeside integration. The still-held rows
  that gate this durable-store design are **F, G, J, and O** (33U §4).
- **Residual legacy marker prose.** The `[E,G,H,K,N,O]` / `[J]` marker arrays in the vector JSONs and
  the spike classifier comments are **preserved legacy vector/runtime markers, not the current
  review-state authority**; the authoritative classification lives in the route-vector README
  current-state correction
  ([`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  §7). Phase 46I preserves that distinction and mutates no technical artifact.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the freeside-characters 34-/45-series,
> and Straylight's ADR / PR labels are independent labels in separate repositories and must not be
> conflated. `46I` signals **no** new product epoch and **no** scope expansion — it is the same
> Admission Wedge arc, still docs/decision-only. The Straylight ADR-022E "Phase 22" gate numbering is
> the *Straylight* repo's phase namespace, distinct from Dixie's 46-series.

---

## 3. Starting accepted facts

These are facts **already accepted** by the chain (33K / 33M / 33U / 33V / 46C / 46D / 46E / 46F /
46G / 46H), re-verified read-only here as the baseline the §4–§13 decomposition is measured against.
None is changed by this gate.

1. **The only authorized route surface is the Phase 33N dev/operator-only spike, and it stores
   nothing durable.** It mounts only when `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (default off),
   uses **Storage Option A** (no durable store, no DB writes, no migrations), and rollback is trivial
   because there is no durable state to roll back. It does **not** authorize production admission /
   storage / auth / consent.
2. **The durable storage model *direction* is decided; the shape is aligned; the build is not.**
   Phase 46E selected current-state projection + append-only hash-chained audit log realized on the
   canonical Straylight semantics/interfaces, with the Dixie/Straylight ownership split, as a
   *direction* that remains a future implementation gate (46E §6). Phase 46F aligned that shape onto
   the five vectors docs-only (46F §9). Neither built a store, authored a schema, or cleared a gate.
3. **The auth / identity / signer and consent boundaries are decided on paper, not built.** Phase 46G
   recorded the service-auth boundary, the session-derived identity binding (no caller override), the
   policy/keyring-decided signer competence, and the replay/idempotency interaction; Phase 46H
   recorded the consent boundary, the consent-proof object model (un-frozen), the consent-receipt
   public/private boundary, and the consent failure taxonomy. Auth is not implemented; consent is not
   implemented; both reference *what is persisted* and therefore depend on this durable-store design.
4. **Straylight owns the canonical durable substrate; Dixie holds ingress references only.** The
   canonical `active` `Assertion`, the first-class `TransitionReceipt`, and the append-only
   hash-chained `AuditEvent` are Straylight primitives, persisted through the `StorageAdapter` /
   `AuditLog` path with ADR-022D invariants (§2.2). Dixie owns the endpoint-local contract /
   idempotency / replay records, ingress references, and the public/private response projection (46E
   §6; 46G §3 item 6; ADR-022D §3); a production auth-decision / consent reference is a Dixie/host
   ingress reference recorded **privately** onto the canonical audit record, never the canonical copy.
5. **There are exactly five route-contract vectors and one validator; both are green and non-runtime,
   carrying the storage/auth/consent draft assumptions.** All five vectors validate, the no-sixth
   check passes, and the `--self-check` negative-mutation harness reports 5/5 fail-closed (§16). Every
   vector carries `storage_writes_performed: false`, `auth_implemented: false`,
   `consent_implemented: false`, `production_admission: false`, `route_contract_final: false`,
   `schema_final: false`.
6. **`recall_eligible` is derived, never persisted authority.** Dixie's boolean `recall_eligible`
   collapses a multi-input disposition (assertion status, transition history, relationships, request
   filters, privacy frame, risk) into one bit; the recall-included set is a derived, invalidatable,
   request/context-dependent cache, never the authority (46E §6; 46F §7).
7. **The forbidden-key set denylists the families it covers — but not every future canonical
   durable/private key.** `FORBIDDEN_PUBLIC_KEYS` forbids, as object keys on the public surface at any
   depth, the tenant/estate/candidate/actor families, the private `TransitionReceipt` / `AuditEvent` /
   receipt families, signer/signature/authority material, the idempotency keys, the Dixie-local
   supersession id pair, and tokens/secrets/urls/stack-traces (`validate-route-contract-test-vectors.mjs:236-330`);
   the runtime spike mirrors this set (`no-leak.ts:22-76`); the opaque-run / UUID / hex / JWT / Bearer
   **value** walks catch operational material of any novel shape (`no-leak.ts:82-110`; validator
   `:213-222`). It does **not** denylist the canonical ref arrays (`supersedes_refs` /
   `linked_assertion_refs`; 46F §8), the canonical signer/receipt/audit key names (`signer_refs` /
   `audit_event_ref` / `receipt_hash` / `audit_hash` / `policy_decision_ref`; 46G §8), or the
   canonical consent key-name family (`consent` / `consent_ref` / `consent_proof` / `consent_receipt` /
   `consent_subject` / `consent_grantor` / `consent_scope` / `auth_decision`; 46H §9) — all **absent**
   from both denylists (§9 carries this forward).
8. **ADR-022E gate #8 is held and the synthetic ledger does not satisfy it.** No durable Dixie
   admission store, schema, table, or migration exists; the Phase 33Q ledger is synthetic,
   process-local, and non-durable; the final identity binding, idempotency, signer/authority, schema,
   and receipt semantics remain explicitly unresolved (rows F / G / J / O; 33U §4).

> **What "accepted facts" do and do not mean.** These are **spike-posture, synthetic-ledger,
> design-vocabulary, and vector-surface** facts. They do not constitute a durable store, a frozen
> schema, a runtime production serializer, a gate-clearing ADR, or any cleared production gate. The
> §4–§13 decomposition exists precisely because the accepted readiness is bounded to the
> dev/spike/synthetic surface and the production durable store is still unresolved under ADR-022E gate
> #8.

---

## 4. ADR-022E gate #8 boundary

This section records what the Straylight-repo ADR-022E durable-store gate #8 requires, distinguishes
**documenting design preconditions** from **clearing the gate**, and states which questions must be
answered before durable-store implementation can begin versus which may remain deferred to
production-readiness or MVP-3 gates. It decides nothing runtime and clears nothing.

**(4.1) What gate #8 requires.** ADR-022E gate #8 ("Production database / persistence substrate") is
held with the trigger: "A separate ADR proposes the production adapter, cites the relevant
sibling-repo handoff packet, and preserves the ADR-022D receipt and audit-chain invariants"
(`ADR-022E…:57`), and the gate-table preamble requires that "the trigger is satisfied **and** a
separate ADR (or sibling-repo PR under teammate review) explicitly cites the trigger." Concretely,
clearing gate #8 requires **(a)** a separate ADR (not this Dixie design doc) that proposes the
production persistence adapter; **(b)** a cited sibling-repo handoff packet establishing the wiring;
and **(c)** explicit preservation of the ADR-022D receipt and audit-chain invariants (append-only,
hash-chained, tamper-detectable via `verifyChain`). The sibling gates **#9** (Finn wiring), **#10**
(Dixie boundary wiring), **#11** (Freeside-as-consumer), **#12** (new network surface), and **#20**
(threat-model widening) gate any *wiring* of that adapter into a Dixie/Finn host with a network
surface, each with its own trigger.

**(4.2) Documenting design preconditions ≠ clearing the gate.** Phase 46I **documents the design
preconditions** — what records exist (§5), who owns the adapter boundary (§6), which topology is
safest (§7), what migration / schema / lifecycle work is required (§8), and what no-leak hardening is
owed (§9). Recording these on paper is **not** the separate gate-clearing ADR, does **not** cite a
sibling-repo handoff packet as authority to wire, and does **not** propose the production adapter for
adoption. It is the Dixie-side *design input* a future gate-clearing ADR would consume; it carries no
authority to advance the feature past its trigger.

**(4.3) Which questions must be answered before durable-store implementation can begin.** Before any
durable-store implementation lane may start, the following must be **answered and accepted** (the §12
exit checklist enumerates them): the durable data model (records persisted vs derived vs projected,
keys, indexes) consistent with the §5 decomposition and §6 ownership split; the accepted storage
topology (§7); the migration / schema-versioning / backfill / rollback plan (§8); the production
identity-binding persistence (Row G); the consent proof/receipt persistence (46H); the
signer/receipt/audit persistence (Row F); the idempotency/replay persistence (Row J); the
public/private projection hardening (§9); the failure / partial-failure / rollback behavior; the
test/vector/validator plan; and a Codex audit acceptance. **None** of these is answered by Phase 46I;
this gate decomposes and lists them.

**(4.4) Which questions may remain deferred to production-readiness or MVP-3 gates.** The following
may legitimately remain deferred **past** the gate-#8-clearing point, to a production-readiness or
MVP-3 gate, without blocking the *design*: the **forget / revoke / correction UI** and its
end-user-facing flows (MVP-3-adjacent; only the requirement that revocation/expiry be *representable*
and *fail-closed* against the append-only chain is recorded here — 46H §6.6); the **Freeside / client
product-surface handoff** (the consent UX and client contract; deferred until a mature Dixie contract
exists — 46H §12 criterion 8); the **production signature substrate** selection (ed25519 / secp256k1 /
real-key HMAC) *as a cryptographic-authority decision* (gate #20 threat-model widening); and the
**public anchor / on-chain integration** (ADR-022E gate #7, out of scope). These are surfaced as
deferred so the gate-#8 design is not over-scoped to swallow MVP-3 and cross-repo work.

**(4.5) Phase 46I does not clear gate #8.** Deciding the durable-store design preconditions on paper
is not clearing a gate. ADR-022E gate #8 remains uncleared; the related gates #9 / #10 / #11 / #12 /
#20 remain held; and Phase 46I is not the gate-clearing ADR.

---

## 5. Durable-store design decomposition

This section decomposes the durable-store records the §6 model (current-state projection + append-only
hash-chained audit log on the canonical Straylight semantics/interfaces) implies, **without
implementing them and without freezing a final schema**. Every record below is classified by
*layer* (canonical Straylight-owned / Dixie-owned / derived), by *persisted vs referenced vs derived*,
and by *public vs private*. There are **no** field types, keys, indexes, or table definitions here;
those remain the future durable-store design gate's output (§12). Where a record maps onto a canonical
Straylight primitive, the mapping is recorded so a future lane references the canonical name rather
than coining a parallel one.

| Durable record (un-frozen) | Layer | Persisted / referenced / derived | Public/private | Grounding / mapping |
|---|---|---|---|---|
| **Candidate record** | Dixie | A private/admission-bound candidate ingress object; whether persisted durably vs held transiently is a future durable-store decision. The candidate is **not** an admitted assertion (Row B). | Private; `candidate_id` / `candidate_payload` forbidden public. | 46E §4 item 1/2; 33U Row B; validator `:238`, `:248`. |
| **Admission transition record** | canonical | Append-only `EstateTransition` for an admit; Dixie holds an **ingress reference**, not a parallel canonical copy. | Private. | `storage/types.ts:51-53`; 33U Row B. |
| **Admitted assertion record** | canonical | The canonical `active` `Assertion` (current state, mutable-upsert); Dixie references it. The accepted candidate creates/references it. | Public exposes only the **status class** `active` (a label); the assertion itself private/canonical. | `storage/types.ts:46-49`; `types.ts:145-167`; accept vector `admitted_assertion_status_class = "active"`. |
| **Rejection / denial transition record** | canonical / Dixie | A reject mints **no** admitted assertion; a denial maps to a private `TransitionReceipt` kind `denied`. | Private; public exposes only the outcome class `denied` + the source-real `safe_reason_code`. | `admission-intake.ts:162-167`; 33X §11; reject vector. |
| **Supersession / correction relation** | canonical | The corrected (active) assertion's `supersedes_refs` (+ `linked_assertion_refs`), with the prior flipped to `superseded`; the Dixie-local id pair maps onto the canonical ref array (no rename here). | Private; public exposes only the outcome class + recall projection. | `types.ts:156-157`; 46F §8; supersede vector. |
| **TransitionReceipt reference** | canonical, private | The first-class `TransitionReceipt` (`transition_id` / `audit_event_ref` / `signer_refs` / `receipt_hash`), private; Dixie stores an ingress reference. | Private; only `public_receipt_ref` may surface (§9). | `types.ts:364-388`; `storage/types.ts:59-62`; 33V §4. |
| **AuditEvent reference** | canonical, private | The append-only, hash-chained `AuditEvent` (`signer_refs` / `policy_decision_ref` / `previous_audit_hash` / `audit_hash`), tamper-detectable via `verifyChain`. | Private; never public at any depth. | `types.ts:514-529`; `audit.ts:77-89`; ADR-022D `:120`. |
| **Consent proof / consent receipt reference** | Dixie (ingress) | The production consent-proof / consent-receipt reference (46H §5 / §6), recorded **privately onto the canonical audit record** (primary linkage), optionally onto the `TransitionReceipt`; the proof material itself private. | Private; at most a disjoint **opaque public-safe consent receipt reference** may surface if a prior gate authorizes it (46H §6.1). | 46H §5 / §6; 33V §5; ADR-022D §3. |
| **Signer / authority reference** | canonical, private | The competent signer (`signer_refs`) per `SignerCompetenceRule` / `Keyring` / policy that recorded the transition; distinct from the consent grantor (46H §8). | Private; canonical Straylight ref; never public. | `types.ts:364-388`, `:514-529`; `keyring.ts:77-200`; 46G §6. |
| **Auth / identity binding reference** | Dixie / canonical | The session-derived caller principal bound to `tenant_id` (Dixie host-layer), `estate_id` / `actor_id` (canonical), **never** body-trusted, no caller override; propagated to transition / assertion / receipt / audit levels. | Private; all id families forbidden public. | 46G §5; 33K §11; validator id families forbidden public. |
| **Idempotency / replay record** | Dixie | Endpoint/Dixie-owned (absent from Straylight); the final key, replay envelope, conflict response, and durable backing unresolved (`idempotency_final: false`; Row J); scoped by the bound identity (46G §7). | Private; idempotency keys forbidden public. | 46E §4 item 8; 46G §7; validator `:295-296`. |
| **Public-safe receipt reference** | Dixie, public-safe | `public_receipt_ref` — the single public-safe transition-receipt reference (a public-safe DRAFT string where minted, `null` where none); its durable mint/resolution without operational-id leakage is a future decision. | **Public-safe** (the one field that crosses); never a private receipt id. | `public-response.ts:24`, `:44`, `:104`; 46E §4 item 12; validator `:540-566`. |
| **Private audit / proof material** | canonical / Dixie | The consent artifact / grant material, signatures, signer ids, policy decision detail, raw candidate / source material — the proof-bearing private content referenced by the audit linkage. | Private; **never** public, **never** logged raw. | 46H §6.2 / §9; 46G §8; validator tokens/secrets/signature forbidden public. |
| **Retention / revocation / expiry / forget implications** | cross-cutting | How the durable store supports retention, revocation, expiry, and forget/correction **against an append-only audit chain** — representable and fail-closed, *without implementing MVP-3 here*. | Boundary only; no public residue. | 46E §4 item 16; 46H §6.6; 33K §20; 33V §9. |

> **Nothing in §5 is a schema.** The record names exist for design legibility only; Phase 46I freezes
> **no** durable schema, coins **no** runtime field, and changes **no** vector or validator. A future
> durable-store design gate + gate-clearing ADR must produce and accept the final data model, name the
> canonical mappings, and pass an extended (still no-leak-bounded) vector/validator plan (§12) before
> any field is authorized.

---

## 6. Ownership / adapter boundary

This section records the durable-store ownership / adapter boundary. It builds nothing; the physical
adapter ownership remains unresolved unless this gate explicitly narrows it as a future option.

- **Straylight owns the canonical semantics and interfaces.** The `active` `Assertion`, the
  first-class `TransitionReceipt`, the append-only hash-chained `AuditEvent`, their invariants, and
  the `StorageAdapter` / `AuditLog` *interface* (ADR-022D `InMemoryStorage` default / `JsonlStorage`
  durable option) are canonical Straylight semantics (§2.2; 46E §6). Dixie does **not** build a
  *parallel canonical* assertion/transition/audit lifecycle (46E Options 3 / 4 rejected).
- **Dixie may own a local durable adapter or route-side implementation — but this is not finalized.**
  Dixie's accepted ownership is contract-scoped: (a) endpoint-local contract / idempotency / replay
  records (Dixie-owned, route-contract-bound; `idempotency_final` held — Row J), (b) ingress
  references onto the canonical chain (33U Row B), and (c) the public/private response projection +
  no-leak serializer (46E §6). Dixie **may later host or operate a durable adapter / persistence
  binding** if a future ADR / gate assigns that responsibility — but Phase 46I does **not** finalize
  it; the physical adapter implementation, operational ownership, and persistence binding remain
  unresolved under ADR-022E gate #8.
- **Finn or another sibling runtime may later own parts of persistence or projection.** ADR-022D
  leaves a future Postgres / sibling-runtime persistence adapter — which may live in **Dixie, Finn, or
  another sibling runtime** — to a separate ADR, and `StorageAdapter` is explicitly the swap-in seam
  for that future substrate. ADR-022E gate #9 (Finn wiring) and gate #10 (Dixie boundary wiring) are
  symmetric, held gates; neither is selected here.
- **Freeside Characters remains a client / handoff surface, not the canonical durable store.** Per
  ADR-022E gate #11, Freeside is **not** a candidate MVP endpoint host; it consumes governed recall
  after Dixie / Finn settle. The freeside-characters mirror is test-only, not exported, not
  runtime-wired (45J / PR #177). It is never the canonical durable store, and Phase 46I authorizes no
  Freeside persistence role.
- **Physical adapter ownership remains unresolved — not overclaimed.** Phase 46I does **not** claim
  that Dixie is already the production durable-store owner. The most this gate narrows the future
  option to is: *if* a future gate-clearing ADR assigns Dixie a route-side durable adapter, it must be
  a swap-in of the canonical Straylight `StorageAdapter` interface (not a parallel canonical
  lifecycle), behind ADR-022E gate #8 and the relevant sibling gates (#10 / #12 / #20). The placement
  decision (Dixie / Finn / sibling runtime) is left to that future ADR.

---

## 7. Storage topology options

The charter asks Phase 46I to present the candidate storage topologies, assess tradeoffs, and select
the safest topology direction. Each is assessed for what it would prove and its blockers. **No option
authorizes a build**; the disposition selects a *direction* and the current safe posture.

### Option 1 — Continue synthetic bounded ledger only (current posture)

The Phase 33Q bounded, process-local, synthetic-only ledger + Storage Option A spike. **Proves:** it
is the correct current posture — the only authorized state, storing nothing durable, leaking nothing.
**Does not prove:** it cannot persist real estate material, complete MVP 2, or satisfy production
recall over durable state. **Disposition: retained as the correct interim posture** until a future
gate clears the durable store; not the permanent topology, and not overridden here.

### Option 2 — Dixie-local durable Admission Wedge adapter

A durable adapter physically hosted/operated by Dixie. **Proves:** route-local durability and a single
host for the endpoint-local records. **Blockers:** must be a swap-in of the canonical Straylight
`StorageAdapter` interface (never a parallel canonical lifecycle — 46E Options 3/4 rejected); gated by
ADR-022E gate #8 (persistence substrate), gate #10 (Dixie boundary wiring), gate #12 (network
surface), and gate #20 (threat-model). **Disposition: recorded as a *possible future* placement, not
finalized** — the physical adapter placement is left to a future ADR (§6).

### Option 3 — Straylight-owned canonical adapter with Dixie route integration

Straylight owns and operates the canonical `Assertion` / `TransitionReceipt` / `AuditEvent`
persistence; Dixie integrates at the route boundary via the canonical interface. **Proves:** the
single canonical owner of assertion/transition/audit semantics with no Dixie-side duplication.
**Blockers:** the physical Straylight adapter is itself behind ADR-022E gate #8; the Dixie integration
is behind gate #10. **Disposition: accepted as the canonical-semantics dependency direction** (46E §6
Option 5), with physical placement unresolved.

### Option 4 — Split storage: Dixie route records + Straylight canonical assertion store

Dixie owns the endpoint-local **contract / idempotency / replay records, ingress references, and the
public/private projection**; Straylight owns the **canonical assertion / transition / receipt / audit
store**. **Proves:** the clean ownership split that 46E §6 already decided — one source of truth for
the canonical lifecycle, Dixie owning only what is genuinely route-contract-bound. **Blockers:** the
physical placement of each half is still behind the respective gates; the auth-decision / consent /
signer references must be persisted **privately** onto the canonical audit record. **Disposition:
selected as the safest topology *direction*** — it is the topology implied by the 46E §6 ownership
split and the 46G / 46H private-audit-only reference decisions, and it minimizes the threat surface
(no parallel canonical store).

### Option 5 — Finn-mediated projection or audit involvement later

Defer part of persistence / projection / audit to a Finn-mediated path (the canonical wiring-host
candidate). **Proves:** nothing now. **Blockers:** ADR-022E gate #9 (Finn wiring) and gate #12
(network surface) are held; downstream of the durable-store gate. **Disposition: deferred to a future,
separately-gated lane.**

### Option 6 — Reject direct public / client storage writes

Explicitly reject any topology in which a public / unauthenticated caller, a client, or Freeside
writes to the durable store directly. **Proves:** the load-bearing posture that admission writes are
gated, authenticated, consented, signer-competent, and host-mediated — never a direct public/client
write. **Disposition: accepted as a binding constraint** carried into the invariants (§11) and the
exit checklist (§12); direct public/client storage writes are rejected, consistent with the blocked
public `remember-this` and chat-as-memory invariants.

> **Selected topology direction and current posture (docs/decision-only):**
> **retain Option 1** (synthetic bounded ledger only) as the only authorized current posture; **select
> Option 4** (split storage: Dixie route records + Straylight canonical assertion store) as the safest
> topology *direction*, realized against the **Option 3** Straylight canonical semantics/interfaces;
> **accept Option 6** (reject direct public/client storage writes) as a binding constraint; **defer
> Options 2 and 5** (the physical Dixie-local adapter placement and the Finn-mediated path) to a future,
> separately-gated lane. The physical adapter placement is **not** frozen by Phase 46I. This selection
> authorizes no runtime work and clears no gate.

---

## 8. Migration / schema / data-lifecycle preconditions

This section decomposes the migration, schema, and data-lifecycle preconditions a future durable-store
lane must satisfy. It implements none of them; each remains a future, separately-gated decision.

| # | Precondition | Current evidence | Decision a future durable-store lane must make |
|---|---|---|---|
| 1 | **Migration requirements** | Migration / backfill / rollback **undesigned and out of scope** to date (33V §4); the spike has no migration. | The forward-only migration plan (or an accepted dev-only no-migration scope). |
| 2 | **Schema versioning** | No durable schema exists; `schema_final: false` on every vector. | The schema version field / compatibility policy for the canonical and Dixie-owned records, behind the gate-clearing ADR. |
| 3 | **Backfill strategy (if any)** | No durable state exists to backfill; the synthetic ledger is process-local and non-durable. | Whether any backfill is required at all (likely none at MVP 2), or an explicit no-backfill scope. |
| 4 | **Rollback / partial-failure behavior** | The spike fails closed atomically — no partially-admitted/recallable residue (`admission-intake.ts`); production rollback **undesigned** (33V §4). | The durable atomicity / partial-failure / rollback / recovery model, preserving the append-only audit invariant. |
| 5 | **Retention** | No durable retention model; synthetic records are ephemeral. | The retention model for canonical (append-only, immutable) vs Dixie-owned records, with the audit chain never rewritten. |
| 6 | **Revocation / expiry** | The spike models no token/consent expiry or revocation (46G §4.6; 46H §6.6). | How revocation/expiry of consent/auth/admission is **representable** and **fail-closed** against the append-only chain, *without implementing MVP-3*. |
| 7 | **Forget / correction hooks (without implementing MVP 3)** | Forget / revoke / correction storage + UI **not designed**; a blocked, separately-gated MVP-3-adjacent lane (33K §20; 33V §9; 46H §6.6). | How the durable store supports deletion/forget/correction against an append-only audit chain — only the *representability + fail-closed* boundary is recorded; the MVP-3 UI is **not** designed or built. |
| 8 | **Tenant / estate partitioning** | `(tenant_id, estate_id)` is a **spike isolation** mechanism; foreign-tenant write fails closed; `identity_binding_final: false` (Row G). | The production tenant / estate / actor partitioning + cross-tenant guarantee (`a.estate_id === request.estate_id`, threat-model T6). |
| 9 | **Privacy frame / risk frame persistence** | Recall disposition depends on the request `EnvironmentFrame` / risk; `privacyDispositionForFrame` excludes `actor_private` / `sealed` and redacts `tenant` in public frames (threat-model T5). | Which privacy/risk frame inputs are persisted vs supplied per-request, so projection stays per-request and never bakes one frame's answer into durable state. |
| 10 | **Derived `recall_eligible` projection remains non-authoritative** | `recall_eligible` is a lossy, per-request, derived bit; the canonical substrate models recall via `Assertion.recall_scope` + status, not a persisted eligibility flag (46F §7). | Confirm `recall_eligible` is **derived at read time** from durable inputs and **never persisted as canonical authority** — a binding invariant, not a future option (§11). |

> Every precondition above gates **implementation**; **none** gates a further **docs/decision** phase.
> Item 6 (revocation/expiry) and item 7 (forget/correction) are explicitly surfaced **without
> implementing MVP-3 forget/revoke/correction**; item 10 is restated as a binding invariant, not a
> deferred option.

---

## 9. No-leak / hardening boundary

This section carries forward the accumulated public/private no-leak hardening debts from 46F / 46G /
46H. It changes no vector and no validator.

- **The canonical ref arrays are not yet denylisted (46F debt).** `supersedes_refs` and
  `linked_assertion_refs` are **absent** from `FORBIDDEN_PUBLIC_KEYS`
  (`validate-route-contract-test-vectors.mjs:236-330`) and from the runtime `no-leak.ts:22-76` — a
  future durable-store / validator-hardening lane would add them once a lane emits canonical refs
  internally (46F §8 / §9 point 4 / §11).
- **The canonical auth / signer / receipt / audit / consent key names are not yet denylisted (46G /
  46H debt).** `signer_refs`, `audit_event_ref`, `receipt_hash`, `audit_hash`, `policy_decision_ref`
  (46G §8), and the consent family `consent`, `consent_ref`, `consent_proof`, `consent_receipt`,
  `consent_subject`, `consent_grantor`, `consent_scope`, `auth_decision` (46H §9) are all **absent**
  from both denylists.
- **These are latent exact-key denylist / projection-hardening debts, not current leaks.** Two
  defenses already hold: (a) the fixed public-response builder
  (`buildAdmissionSpikePublicResponse`, `public-response.ts`) emits **none** of these fields, so there
  is **no present leak path** through the serializer; and (b) opaque **values** carried under those
  names (refs, hashes, signer ids, audit ids, proof blobs, grant secrets) of UUID / long-hex /
  long-opaque / JWT / Bearer shape would still be caught by the value-pattern walls
  (`no-leak.ts:82-110`; validator `:213-222`) — only short, safe-looking values under those exact key
  names would slip the key check.
- **No runtime / validator mutation in this phase unless explicitly justified.** Per the charter this
  slice is docs-only, and the fixed serializer does not currently emit these fields, so Phase 46I
  makes **no** runtime / validator mutation. The hardening is recorded as a future exit criterion (§12),
  not performed here.
- **The durable implementation must resolve public/private projection before authorization.** A future
  durable-store lane that begins emitting any canonical ref / signer / receipt / audit / consent field
  internally **must** add the matching forbidden-key hardening (and the runtime mirror) **before** it
  is authorized — adding those keys strengthens, never weakens, the no-leak boundary. This is recorded
  as an exit criterion (§12 criterion 8) and a blocked-lane constraint (§14).

> **Known canonical durable/private key hardening gap (recorded, not closed here).** Phase 46I
> **records** the combined 46F / 46G / 46H gap — the canonical ref arrays, the signer/receipt/audit key
> names, and the consent key-name family are absent from `FORBIDDEN_PUBLIC_KEYS` and from
> `no-leak.ts` — as future validator/runtime hardening owed by the durable-store implementation lane.
> It must **not** be read as a claim that the denylist already covers every future canonical
> durable/private key; it does not. Per the charter, no Phase 46I runtime/validator mutation is made
> (this slice is docs-only and the fixed serializer emits none of those fields).

---

## 10. Consent vector alignment question and the next-lane decision

Phase 46H allowed an optional preceding non-runtime consent vector/validator alignment lane "once the
§5 [consent] object model is accepted" (46H §13), and the charter asks Phase 46I to decide whether to
(a) select consent vector/validator alignment as the next lane before durable-store ADR work, or (b)
proceed toward a durable-store ADR while recording consent vector alignment as future hardening debt.
Phase 46I is itself the durable-store **design / decomposition** gate; this section decides what the
**next** lane should be. **Phase 46I modifies no vectors.**

**(10.1) The consent object model is accepted as a draft direction.** Phase 46H accepted its §5
consent-proof object model "as the recorded design *direction*" (46H §10 Option 2 disposition). The
precondition 46H set for a preceding non-runtime consent vector/validator alignment lane is therefore
satisfied — such a lane is now *eligible*.

**(10.2) The no-leak hardening debt is now broad and multi-phase.** The combined 46F / 46G / 46H gap
(§9) spans the canonical ref arrays, the signer/receipt/audit key names, and the full consent
key-name family. A non-runtime vector/validator alignment lane is the lowest-blast-radius place to
discharge that debt: it is non-runtime, reversible, and strengthens (never weakens) the no-leak
boundary, and it removes the overclaim risk before any field is emitted internally.

**(10.3) Decision: select the non-runtime consent/storage vector/validator alignment lane as the next
lane.** Because (a) the consent object model is accepted as a draft direction (10.1), (b) the no-leak
hardening debt is now broad and is best discharged in a dedicated non-runtime alignment lane (10.2),
and (c) a vector/validator alignment is explicitly one of the charter's permitted next-lane options and
the lowest-blast-radius non-runtime step, Phase 46I records the **non-runtime consent/storage
vector/validator alignment gate** as the justified next lane (§13) — to precede the actual
gate-clearing ADR. This answers the charter's option (a). **Phase 46I does not modify the vectors;** it
selects the alignment as the *next* lane and records the durable-store implementation-readiness
decomposition / gate-clearing ADR as the held build precondition downstream of it (§13).

---

## 11. Required invariants preserved

Phase 46I preserves **all** of the following (each already enforced in synthetic / spike / vector form
where cited; any future durable-store design or implementation lane must carry each forward unchanged):

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
   consent fails closed and mints no admitted assertion (46H §7); service-token / operator auth is
   never treated as consent (46H §4.1 / §4.2).
8. **The public response leaks no raw / private / audit / debug / source / auth / signer / consent /
   storage material.** The public-surface walk + `FORBIDDEN_PUBLIC_KEYS` + substring / pattern / UUID /
   opaque-run walks (`validate-route-contract-test-vectors.mjs:236-330`, `:213-222`); runtime mirror
   (`no-leak.ts:22-110`). The canonical ref/signer/receipt/audit/consent key-name hardening gap is
   recorded, not a present leak (§9).
9. **Private `TransitionReceipt` / `AuditEvent` / consent-proof / storage material remains private.**
   Forbidden on the public surface at any depth; the auth-decision / consent reference lives on the
   private audit record only (33V §5; 46H §6); the canonical signer/receipt/audit refs live on the
   private primitives (§5, §9).
10. **User chat does not become memory merely because it was said.** No Discord / freeform ingestion
    and no user-chat-as-memory path; consent is never inferred from chat text (46H §4.5); the spike
    accepts only a synthetic dev marker.
11. **Public `remember-this` remains blocked.** No public / unauthenticated remember-this surface is
    designed or authorized; direct public/client storage writes are rejected (§7 Option 6).
12. **Discord / freeform history ingestion remains blocked.** Unchanged.
13. **Production admission / storage / auth / consent remain blocked.** ADR-022E gate #8 held;
    `storage_writes_performed` / `auth_implemented` / `consent_implemented` / `production_admission`
    all false on every vector.
14. **Route-contract freeze and final schema freeze remain blocked.** `route_contract_final` /
    `schema_final` false on every vector; Phase 46I freezes neither.
15. **`recall_eligible` remains derived, never persisted as canonical authority** (§8 item 10; 46F
    §7).
16. **ADR-022E gate #8 remains uncleared.** Phase 46I is not the gate-clearing ADR and clears nothing;
    the related gates #9 / #10 / #11 / #12 / #20 remain held.
17. **Auditability without rewriting history.** The canonical audit log is append-only, hash-chained,
    and tamper-detectable via `verifyChain`
    (`loa-straylight/src/straylight/audit.ts:77-89`; `storage/types.ts:6-13`; ADR-022D audit-chain
    invariant); a consent / auth-decision reference recorded onto it inherits that tamper-evidence
    without becoming public.

---

## 12. Exit criteria for clearing ADR-022E gate #8 later

A future gate may **clear** ADR-022E gate #8 and begin durable-store **implementation** only after
**all** of the following are produced and accepted. Phase 46I satisfies **none** of these (it is a
design / decomposition gate); they are the checklist a downstream gate must clear:

| # | Exit criterion | Owning future gate |
|---|---|---|
| 1 | **Accepted durable-store ownership / adapter boundary** — the §6 ownership split finalized, with the physical adapter placement (Dixie / Finn / sibling runtime) selected by the gate-clearing ADR. | Durable-store design gate + ADR-022E gate-#8-clearing ADR. |
| 2 | **Accepted storage topology** — the §7 split-storage direction (or a justified alternative) confirmed, with direct public/client storage writes rejected. | Durable-store design gate. |
| 3 | **Accepted schema / migration plan** — the durable data model (records persisted vs derived vs projected, keys, indexes), schema versioning, backfill (or no-backfill) scope, and forward-only migration (or dev-only no-migration) plan (§5, §8). | Durable-store design gate + gate-clearing ADR. |
| 4 | **Accepted auth / identity-binding persistence plan** — session-derived, no caller override, bound at request / transition / assertion / receipt / audit levels (Row G; 46G §5), persisted privately. | Production identity-binding gate. |
| 5 | **Accepted consent proof / receipt persistence plan** — the consent reference recorded privately onto the canonical audit record (primary) and optionally the `TransitionReceipt`; the disjoint public-safe consent-receipt reference (46H §5 / §6). | Consent implementation lane + Dixie public-surface gate. |
| 6 | **Accepted signer / receipt / audit persistence plan** — canonical `signer_refs` / `audit_event_ref` / `receipt_hash` / `audit_hash` / `policy_decision_ref` persisted on the private primitives, `SignerCompetenceRule` / `Keyring` competence resolved, production signature substrate selected (Row F; 46G §6). | Production signer/authority gate. |
| 7 | **Accepted idempotency / replay persistence plan** — the final endpoint keying scoped by the bound identity, with same-key / different-identity collisions failing closed (Row J; 46G §7). | Route-contract idempotency decision. |
| 8 | **Accepted public / private projection hardening plan** — the production no-leak serializer enforcing `privacy_scope` + frame disposition, **including the canonical ref-array / signer / receipt / audit / consent key-name forbidden-key hardening** (`supersedes_refs` / `linked_assertion_refs` / `signer_refs` / `audit_event_ref` / `receipt_hash` / `audit_hash` / `policy_decision_ref` / `consent` / `consent_ref` / `consent_proof` / `consent_receipt` / `consent_subject` / `consent_grantor` / `consent_scope` / `auth_decision`, today absent from the denylist — §9) once a lane emits those fields internally. | No-leak serializer design gate + validator-hardening lane. |
| 9 | **Accepted failure / rollback plan** — atomicity, partial-failure, rollback / recovery against the append-only chain (§8 item 4). | Durable-store design gate. |
| 10 | **Accepted test / vector / validator plan** — extending the existing vectors and `--self-check` for the durable model, still no-leak-bounded, including the §9 / criterion-8 key-name hardening. | Implementation-spike readiness checklist. |
| 11 | **Codex audit acceptance before PR** of the durable-store design / implementation. | The implementing lane's review/audit gate. |

> Exiting Phase 46I authorizes **no** runtime implementation and clears **no** gate. It records what
> gate #8 requires (§4), the durable-store decomposition (§5), the ownership/adapter boundary (§6), the
> topology direction (§7), the migration/lifecycle preconditions (§8), the no-leak hardening boundary
> (§9), the consent vector alignment decision (§10), the invariants (§11), and the checklist above; the
> build and the gate-clearing ADR remain blocked until a future, separately-gated lane satisfies them.

---

## 13. Selected next lane and dependency ordering

> **Selected next lane: a docs/decision-only, non-runtime consent/storage vector/validator alignment
> gate (discharging the §9 no-leak hardening debt), which precedes the durable-store
> implementation-readiness decomposition gate + ADR-022E gate-#8-clearing ADR. Not runtime; not
> implementation; no gate cleared.**

**Reason.** With the durable storage direction (46E) and shape (46F) decided, the auth / identity /
signer boundary recorded (46G), the consent boundary recorded (46H), and the durable-store design now
decomposed (this gate), the storage/auth/consent decision cluster is decomposed on paper and the
durable-store / ADR boundary is designed. Per §10, the safest next step is a **non-runtime
consent/storage vector/validator alignment** lane: the consent object model is accepted as a draft
direction, the no-leak hardening debt is broad and multi-phase, and a vector/validator alignment is the
lowest-blast-radius non-runtime step that discharges it (strengthening, never weakening, the no-leak
boundary). The actual **durable-store implementation-readiness decomposition gate + ADR-022E
gate-#8-clearing ADR** remains the held build precondition downstream. Per the charter, Phase 46I does
**not** jump to implementation and modifies no vectors.

**Dependency ordering after Phase 46I** (carried from 46H §13; the prior "step 5" is refined into a
design sub-step (this gate) followed by the alignment lane and then the gate-clearing ADR):

1. Phase 46E — durable storage **model direction** decided. *(Done; PR #150.)*
2. Phase 46F — durable storage **shape & route-vector alignment** decided. *(Done; PR #151.)*
3. Phase 46G — auth / identity / signer authority decided. *(Done; PR #152.)*
4. Phase 46H — consent proof / receipt decided. *(Done; PR #153.)*
5. **Phase 46I — durable-store design / decomposition + ADR-022E gate #8 boundary.** *(This gate —
   docs-only; no vector/validator change; gate #8 not cleared.)*
6. **Non-runtime consent/storage vector/validator alignment gate** — extends the vectors / validator
   with the §9 canonical ref-array / signer / receipt / audit / consent key-name forbidden-key
   hardening, still no-leak-bounded, no runtime. *(Selected next lane.)*
7. **Durable-store implementation-readiness decomposition gate + ADR-022E gate-#8-clearing ADR** —
   authors the durable data model, schema, migration scope, rollback plan, physical adapter placement,
   and persists the accepted auth/identity/signer/consent references; clears ADR-022E gate #8
   preserving the ADR-022D invariants. *(The build precondition; held.)*
8. **Final route-contract pre-freeze gate.**
9. **Implementation-spike readiness checklist.**
10. **Bounded default-off implementation spike** — only if the checklist is satisfied.
11. **Smoke / acceptance gate.**
12. **Freeside Characters client-contract handoff** (incl. the consent UX; 46H §12 criterion 8).

> **Implementation remains downstream.** Steps 6–12 are each held. The only step Phase 46I advances is
> **step 5** — designing and decomposing the durable-store / ADR boundary — which is itself
> docs/decision-only. **Runtime implementation is not the next step, and the gate-clearing ADR is not
> this document.**

**Documented alternatives.** Two other charter-permitted next lanes are recorded but **not** selected
as the immediate successor: (a) a **docs/decision-only ADR-022E gate #8 acceptance/defer gate** — an
acceptance of this decomposition that formally records the gate #8 defer disposition (sequenced as a
possible companion to step 6); and (b) the **durable-store implementation-readiness decomposition
gate** (step 7) — not selected immediately because the §9 no-leak hardening debt is best discharged by
the non-runtime alignment lane first, keeping the per-area chain disciplined. **Runtime implementation
is not selected under any option.**

---

## 14. Blocked lanes

Phase 46I is a bounded, docs/decision-only durable-store design / decomposition gate. It authorizes
**none** of the following; each remains **blocked** and is **not** unblocked by designing or
decomposing the durable-store / ADR boundary or selecting the next docs lane:

- durable Admission Wedge storage implementation (ADR-022E gate #8 held); DB writes; migrations; a
  durable data model, schema, or table definition; storage is not implemented;
- the ADR-022E gate-#8-clearing ADR itself; clearing gate #8 or the related gates #9 / #10 / #11 /
  #12 / #20;
- production auth implementation; the production caller/auth model; auth is not implemented;
  cross-user admission;
- production consent implementation; consent-proof / consent-receipt model selection or build;
  consent is not implemented;
- production identity binding (tenant / estate / actor); identity binding is not finalized;
- production signer / authority semantics; the production signature substrate (ed25519 / secp256k1 /
  real-key HMAC);
- final idempotency / replay semantics (Dixie / endpoint-owned; undecided; Row J);
- route / API handler implementation **beyond the existing Phase 33N spike**; production admission;
- public `remember-this`; Discord command / history ingestion; user chat becoming memory; consent
  inferred from chat text; direct public/client storage writes (§7 Option 6);
- Freeside Characters runtime / client integration; the consent UX; package exports;
- the final Dixie route contract; route-contract freeze; production route deployment;
- production readiness of any kind; final / production schema freeze;
- LLM / voice; Finn production wiring; forget / revoke / correction UI (MVP-3-adjacent; surfaced in §8
  items 6 / 7, not implemented);
- persisting `recall_eligible` as canonical authority (§8 item 10); freezing the physical durable
  adapter placement (§6);
- **any mutation of the five route-vector JSONs, the route-vector validator, the route-vector README,
  the Phase 33E fixtures, or the Phase 33E fixture validator** (§1, §9).

> **A durable-store design / decomposition does not authorize runtime implementation and clears no
> gate.** Designing the durable-store boundary and selecting the next docs lane makes the next decision
> legible; it does **not** build a store, **not** author a schema or migration, **not** clear any
> production gate, **not** author the gate-clearing ADR, **not** implement auth or consent, **not**
> bind production identity, **not** implement signer semantics, **not** freeze the route contract or
> schema, and **not** authorize any route / storage / auth / consent / Freeside / package-export work.
> The Phase 33N dev/operator-only, disabled-by-default spike remains the only authorized route surface,
> and the do-nothing / synthetic-only posture (46E Option 6 / §7 Option 1) remains in force.

If a later phase reaches for any of the above, it must re-open the Phase 33K precondition design, the
Phase 33M authorization gate, the Phase 33P / 33Q / 33R storage lane, the Phase 33U / 33V chain, the
Phase 46A–46H gates and this gate, and the relevant ADRs (Straylight-repo ADR-022E durable-store gate
#8 and related gates #9 / #10 / #11 / #12 / #20; ADR-022D receipt/audit-chain invariants; ADR-026C /
ADR-026D route guardrails) first; it must not silently expand scope.

---

## 15. Corruption / duplicate guard

Phase 46I applies an explicit corruption / duplicate guard to **this** document (carried from the
Phase 46E / 46F / 46G / 46H precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 18.`) appears
  exactly once.
- **Numbered sections appear once each.** Sections 1–18 each appear exactly once; the guard counts
  `^## N\.` occurrences and asserts one per number.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:"
  token, a trailing one-word report heading, prose-claim dumps, or pasted terminal transcript appears
  in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row; no
  duplicated / truncated / wrapped table fragments appear.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is the
  §16 validation command list.

The guard commands and their recorded results are in §16.

---

## 16. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase
46I is docs/decision-only — it adds only this document and mutates no vector, validator, or fixture —
so the validators are run only to confirm the unchanged artifacts remain green. The fence-balance and
negative-claim checks avoid embedding affirmative-claim substrings in prose, so they cannot
self-match.

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
# Self-reference / next-lane label check (grep -E so `|` is real alternation):
grep -E "Phase 46H|Phase 46I" docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md
# Duplicate/corruption grep (advisory):
grep -nE "Claude said|Patch Report|terminal report|RESULT:|Report$" docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md || true
# Enforcing negative check — fail if any affirmative readiness / freeze / implementation /
# gate-clearing / authorization claim appears in PROSE. The patterns are affirmative-only and
# word-boundaried, so the document's negated prose ("does not clear …", "remains uncleared", "is not
# production-ready", "storage is not implemented") and the fenced validation commands below are
# deliberately NOT matched. It is NOT masked with `|| true`:
python3 - <<'PY'
import re
from pathlib import Path
p = Path("docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md")
patterns = [
    r"\bruntime implementation is selected\b",
    r"\bimplementation is authorized\b",
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
    r"\bstorage is built\b",
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
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

Recorded results for this lane (see the message body accompanying this work for the captured terminal
output):

- **docs-only scope check** — only the single new file
  `docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md` is added; no route-vector JSON, route-vector
  validator, route-vector README, Phase 33E fixture, fixture validator, `app/`, `src/`, `tests/`,
  package / lockfile, config / env, CI, migration, runtime, or generated file is touched;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no `git add` / commit /
  push);
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator reports 5/5 probes
  valid, 0 failures; the route-contract test-vector validator reports 5/5 vectors valid, 0 failures,
  no sixth vector; the `--self-check` negative-mutation harness reports 5/5 mutations fail closed;
- **self-reference label check** — `grep -E "Phase 46H|Phase 46I"` confirms both the `Phase 46H`
  (predecessor) and `Phase 46I` (self) labels are present;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the eighteen headings
  1–18 exactly once each;
- **duplicate/corruption grep** — the advisory grep finds no pasted terminal-report fragment in the
  document body;
- **negative readiness-claim check (enforcing)** — the `python3` scan excludes fenced lines and
  reports the affirmative-only, word-boundaried patterns (including durable-store / gate-clearing /
  vector-mutation claims) found no match outside the fenced validation commands; the document's
  **negated** prose is correctly not matched. The scan is not masked with `|| true`;
- **fence-balance check** — the dependency-free `node -e` counter reports an even (balanced)
  triple-backtick count; the single fenced block is the validation command list above.

---

## 17. Success criteria for Phase 46I

Phase 46I succeeds if and only if:

1. **Docs / decision-only** — it creates only this Phase 46I document; it changes **no** route-vector
   JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, runtime
   source, test, route, store, migration, auth, consent, config, env, package, lockfile, CI, or
   generated file, and edits **no** adjacent repository (§1, §9).
2. **Source chain / evidence intake recorded** — the Dixie chain (33K / 33L / 33M / 33N / 33P / 33Q /
   33R / 33U / 33V / 33W–33Z → 46A → 46B → 46C → 46D → 46E → 46F → 46G → 46H → 46I), the canonical
   Straylight substrate, and the held ADR-022E gates #8 / #9 / #10 / #11 / #12 / #20 are summarized
   (§2).
3. **Starting accepted facts recorded** — the dev/operator spike posture, the decided storage
   direction/shape, the recorded auth/consent boundaries, the five green vectors, the derived
   `recall_eligible`, the no-leak hardening gaps, and the held gates (§3).
4. **ADR-022E gate #8 boundary recorded** — what gate #8 requires; documenting design preconditions vs
   clearing the gate; which questions must be answered before durable-store implementation can begin;
   which may remain deferred to production-readiness or MVP-3; and the explicit statement that Phase
   46I does not clear gate #8 (§4).
5. **Durable-store design decomposed** — candidate record; admission transition record; admitted
   assertion record; rejection/denial transition record; supersession/correction relation;
   TransitionReceipt reference; AuditEvent reference; consent proof/receipt reference; signer/authority
   reference; auth/identity binding reference; idempotency/replay record; public-safe receipt
   reference; private audit/proof material; retention/revocation/expiry/forget implications — all
   un-frozen, no schema (§5).
6. **Ownership / adapter boundary recorded** — Straylight owns canonical semantics/interfaces; Dixie
   may own a local adapter or route-side implementation but unfinalized; Finn or a sibling runtime may
   later own parts; Freeside remains a client/handoff surface; physical adapter ownership unresolved;
   no overclaim that Dixie is the production durable-store owner (§6).
7. **Storage topology options assessed and safest direction selected** — synthetic-only retained as
   interim; split storage (Dixie route records + Straylight canonical store) selected as the direction;
   direct public/client writes rejected; Dixie-local-adapter and Finn-mediated placements deferred (§7).
8. **Migration / schema / data-lifecycle preconditions decomposed** — migration, schema versioning,
   backfill, rollback/partial-failure, retention, revocation/expiry, forget/correction hooks (no
   MVP-3), tenant/estate partitioning, privacy/risk frame persistence, and the derived non-authoritative
   `recall_eligible` (§8).
9. **No-leak / hardening boundary carried forward** — the canonical ref arrays, signer/receipt/audit
   key names, and consent key-name family recorded as latent denylist/projection debts (not current
   leaks), no runtime/validator mutation, fixed serializer emits none, durable implementation must
   resolve projection before authorization (§9).
10. **Consent vector alignment question decided** — Phase 46I selects the non-runtime consent/storage
    vector/validator alignment as the next lane (charter option a), records the durable-store ADR work
    downstream, and modifies no vectors (§10, §13).
11. **Required invariants restated** — pending not recallable; rejected mints nothing; accepted
    creates/references; superseded excluded; malformed fails closed; missing/unauthorized auth fails
    closed; missing/invalid consent fails closed; public no-leak; private receipt/audit/consent/storage
    private; not user-chat memory; public remember-this blocked; Discord ingestion blocked; production
    admission/storage/auth/consent blocked; route-contract + schema freeze blocked; `recall_eligible`
    derived; ADR-022E gate #8 uncleared; auditability without history rewrite (§11).
12. **Exit criteria for clearing gate #8 later recorded** — the eleven exit criteria (ownership/adapter,
    topology, schema/migration, auth/identity, consent proof/receipt, signer/receipt/audit,
    idempotency/replay, public/private projection hardening, failure/rollback, test/vector/validator,
    Codex audit acceptance), none satisfied by Phase 46I (§12).
13. **Next lane selected + ordering updated** — a docs/decision-only non-runtime consent/storage
    vector/validator alignment lane selected; the post-46I ordering recorded with the gate-clearing ADR
    and implementation downstream (§13).
14. **Blocked lanes preserved** — no durable / DB-write / migration / schema / gate-clearing-ADR /
    auth / consent / identity / signer / route / Freeside / package / production-readiness lane is
    authorized, and no vector / validator / fixture is mutated (§14).
15. **Corruption / duplicate guard applied** — the document passes the §15 guard, with results recorded
    in §16.
16. **No freeze, no production-readiness claim, no gate clearance** — Phase 46I freezes neither the
    route contract nor the schema, declares no production readiness, and does **not** clear ADR-022E
    gate #8 (§1, §4.5, §14).

---

## 18. Cross-references

- [`docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
  — Phase 46H (PR #153); its §10 / §13 selected this Phase 46I durable-store design gate + ADR-022E
  gate-#8 ADR as the next lane, with an optional preceding non-runtime consent vector/validator
  alignment, and recorded the consent key-name no-leak hardening gap (§9) this gate carries forward.
- [`docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
  — Phase 46G (PR #152); recorded the auth/identity/signer boundary and the canonical
  signer/receipt/audit key-name hardening gap.
- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 46F (PR #151); aligned the durable storage shape onto the vectors docs-only; fixed
  `recall_eligible` as derived; recorded the canonical-ref-array hardening gap.
- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md)
  — Phase 46E (PR #150); selected the storage model direction (current-state projection + append-only
  hash-chained audit log on the canonical Straylight semantics/interfaces); left the physical adapter
  placement unresolved under ADR-022E gate #8; recorded the §8 exit criteria this gate refines.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md)
  — Phase 46D (PR #149); ranked the candidate lanes and sequenced the per-area gates.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V (PR #140); the `AuditEvent` / `TransitionReceipt` split, the `public_receipt_ref`
  adoption, the `privacy_scope` + frame-disposition projection boundary, and the undesigned
  migration/backfill/rollback grounding §5 / §8.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U (PR #139); the A–O reconciliation (rows F / G / J / O held; ADR-022E gates #8 / #10 /
  #12 / #20 held; Row B ingress-refs-only) grounding §2 / §4 / §5 / §6.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs` with
  the five vector JSONs — inspected **read-only** to ground the no-leak boundary, the
  `FORBIDDEN_PUBLIC_KEYS` set, the false flags, and the hardening gaps. **None is modified.**
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/{auth-gate,classifier,public-response,no-leak,admitted-assertion-ledger}.ts`
  — inspected **read-only** to ground the §3 spike facts, the §5 record decomposition, the §8
  lifecycle preconditions, and the §9 no-leak projection. **None is modified.**
- `loa-straylight/src/straylight/{types,estate,audit,keyring,signatures}.ts`,
  `loa-straylight/src/straylight/storage/types.ts`,
  `loa-straylight/docs/decisions/{ADR-022D,ADR-022E}-…md`, and
  `loa-straylight/docs/mvp/threat-model.md` — inspected **read-only** as the **canonical** Straylight
  substrate cited in §2.2 / §4 / §5 / §6 / §8 (the `StorageAdapter` upsert-assertion /
  append-only-transition / append-only-hash-chained-audit surface; the `Assertion` /
  `TransitionReceipt` / `AuditEvent` / `signer_refs` primitives; `SignerCompetenceRule` / `Keyring`;
  the dev-signature placeholder; the T5 / T6 privacy/cross-tenant invariants; ADR-022D audit-owner;
  ADR-022E gate #8 and the related held gates #9 / #10 / #11 / #12 / #20). **Not edited by this
  phase.**
- `@loa/straylight` — canonical primitive / substrate owner; PR #65 (merged) answered the A–O
  primitive review. Straylight-repo ADR-022E (durable-store gate #8 + related gates #9 / #10 / #11 /
  #12 / #20, **held**), ADR-022D (receipt/audit-chain invariants), ADR-026C, ADR-026D are decision
  records cited as guardrails. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — the cross-repo acceptance whose
  mirror/adapter is test-only, not exported, not runtime-wired; Freeside remains a client/handoff
  surface (§6), never the canonical durable store; the consent-UX / client-contract handoff stays
  deferred (§12 criterion 5 / §13 step 12). **Not edited by this phase.**
