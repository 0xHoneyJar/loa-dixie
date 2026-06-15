# Phase 46E — Admission Wedge Durable Storage Model Decision Gate

> **Phase**: 46E
> **Branch context**: `phase-46e-admission-durable-storage-model`
> **Related**: Phase 46D storage/auth/consent acceptance (PR #149, which selected
> this gate — its §7 / §8); Phase 46C storage/auth/consent blocker decomposition
> (PR #148); Phase 46B route-contract implementation-readiness decomposition
> (PR #147); Phase 46A route-vector alignment acceptance (PR #146); Phase 33Z
> route-vector alignment (PR #144) + its PR #145 next-lane label/provenance
> correction; Phase 33Y route-contract revision acceptance (PR #143); Phase 33X
> route-contract revision draft (PR #142); Phase 33W route-contract readiness
> update (PR #141); Phase 33V storage/auth/consent design finalization (PR #140);
> Phase 33U Straylight-response intake (PR #139); Phase 33S route-spike + bounded-
> ledger acceptance decomposition; Phase 33R bounded-ledger acceptance (PR #136);
> Phase 33Q bounded synthetic admitted-assertion ledger (PR #135); Phase 33P
> storage/receipt hardening (PR #134); Phase 33N dev/operator-only route spike;
> Phase 33K storage/auth/consent precondition design; Straylight (`@loa/straylight`)
> PR #65 (A–O primitive-review verdicts, **merged**); Straylight-repo ADR-022E
> durable-store gate #8 (and related gates #10 / #12 / #20), **held**;
> Straylight-repo ADR-022D MVP-persistence / audit-owner invariants; ADR-026C /
> ADR-026D route guardrails; freeside-characters Phase 45J / PR #177 (Dixie v1
> mirror-refresh acceptance, merged 2026-06-06).
> **Status**: **docs / decision-only.** No source, test, route, route handler,
> storage, store code, DB write, migration, auth, consent, **route-vector JSON**,
> **route-vector validator**, **route-vector README**, **Phase 33E fixture /
> fixture validator**, package export, config, env, package, lockfile, CI,
> generated, binary, or live-integration change. No adjacent repository
> (`loa-straylight`, `freeside-characters`) is touched.
> **This is a durable storage model decision gate, not implementation.** It decides,
> on paper, which durable storage model the Admission Wedge should pursue *if and
> when* a future, separately-gated ADR clears the held durable-store gate, and it
> decomposes what must be true before any move from the bounded synthetic/dev proof
> toward durable storage design or implementation. It does **not** implement storage,
> **not** author or apply a migration, **not** authorize DB writes, **not** clear the
> Straylight-repo ADR-022E durable-store gate #8, **not** change the route handler,
> **not** change auth, **not** implement consent, **not** authorize production
> admission, **not** freeze the route contract, and **not** freeze the final schema.

Every assessment below is grounded read-only against the actual Dixie repo (the
Phase 46D / 46C / 46B / 46A gates, the Phase 33K precondition design, the Phase 33P /
33Q / 33R / 33S storage lane, the Phase 33U / 33V / 33W / 33X / 33Y / 33Z chain, the
five route-vector JSONs, the route-vector validator and its README, the Phase 33N/33Q
spike source under `app/src/services/admission-wedge-spike/`, the route at
`app/src/routes/admission-intake.ts`, the spike mount in `app/src/server.ts` and flag
in `app/src/config.ts`, and the dev runbooks under `docs/admission-wedge/`) and
read-only against the **canonical** Straylight (`@loa/straylight`) substrate
(`storage/types.ts`, `audit.ts`, `types.ts`, and `docs/decisions/ADR-022D…` /
`ADR-022E…`) and the PR #65 verdicts as already reconciled by Dixie Phase 33U. Where
a claim could not be grounded inside the read material, it is marked as such.

---

## 1. Status and scope

Phase 46E is the bounded **durable storage model decision gate** that follows, and is
named by, Phase 46D
([`ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md)
§7 / §8, PR #149). Phase 46D accepted the Phase 46C storage/auth/consent blocker
decomposition, judged **storage the deepest blocker** (the Straylight-repo ADR-022E
durable-store gate #8 is held, and the auth / consent / public-private decisions all
reference *what is persisted*), and **selected Phase 46E — Admission Wedge durable
storage model decision gate (docs / decision-only; not runtime)** as the next safe
lane. Phase 46E executes exactly that charter: it decides, on paper, which durable
storage model the Admission Wedge should pursue, decomposes what must be true before
any durable storage design or implementation, selects the safest model direction as a
recorded decision that **remains a future implementation gate**, and stops.

**Verdict.** Phase 46E:

- is **docs / decision-only** — its only output is this decision/status document;
- is **not storage implementation** — no durable store, schema, table, store code, or
  storage write is created;
- is **not migration authorization** — no migration is authored, applied, or
  authorized;
- is **not production admission** — the Phase 33N dev/operator-only, disabled-by-
  default spike remains the only authorized route surface, and no production admission
  is authorized;
- is **not a route-contract freeze** — the route contract is not frozen;
- is **not a final schema freeze** — the final / canonical / production schema is not
  frozen.

Phase 46E additionally:

- **does not clear** the Straylight-repo ADR-022E durable-store gate #8 (or the related
  held gates #10 / #12 / #20) — deciding a model direction is not clearing a gate;
- **does not author a durable data model, schema, or migration** — it selects a model
  *direction* to pursue, leaving the data model, schema, and migration to a future,
  separately-gated lane;
- **does not implement auth or consent**, **does not change the route handler**, and
  **does not modify** runtime source, the route-vector JSONs, the route-vector
  validator, the route-vector README, the Phase 33E fixtures, the Phase 33E fixture
  validator, validators of any kind, vectors, package exports, config / env, CI,
  migrations, generated files, binaries, or any adjacent repository
  (`loa-straylight`, `freeside-characters`);
- **does not declare** production readiness of any kind.

> **A storage-model *decision* authorizes no runtime work.** Phase 46E decides which
> durable storage model is the safest to pursue *if and when* a future gate clears the
> ADR-022E durable-store gate #8; the decision is a recommendation recorded on paper,
> not a built store, a frozen schema, an applied migration, or a cleared gate. A
> later, separately-gated phase must (a) author the durable data model / schema /
> migration plan, (b) clear ADR-022E gate #8 with a gate-clearing ADR that preserves
> the ADR-022D receipt/audit-chain invariants, and (c) only then authorize any build.
> Matching the Phase 46A / 46B / 46C / 46D precedent of a single self-contained gate
> document, no cross-reference status note in another file was required (see §15); the
> route-vector README status-note chain is reserved for lanes that read or mutate the
> vectors/validator, and Phase 46E touches neither.

---

## 2. Source chain (evidence intake)

This gate sits one rung above the Phase 46D storage/auth/consent acceptance gate on
the Dixie route-contract ladder. It introduces no new contract or vector material; it
consumes the accepted decomposition, the storage lane (33P → 33Q → 33R → 33S), and the
canonical Straylight substrate to decide a durable storage model direction.

### 2.1 Dixie (loa-dixie) — the storage and route-contract lanes

| Phase | PR | Artifact / contribution (relevant to the durable storage model decision) |
|-------|----|------|
| 33K | #129 | **Storage/auth/consent precondition design.** Drafted the eleven storage record categories, the service-auth options A/B/C/D, the consent options A/B/C/D, the idempotency precondition, the no-leak public/private preconditions, the threat model, and the exit criteria. Froze nothing. |
| 33N | #132 | **Dev/operator-only route spike.** `POST /api/admission/intake`, disabled-by-default, **Storage Option A** (no durable store, no DB writes, no migrations; rollback trivial — no durable state to roll back). |
| 33P | #134 | **Storage / receipt hardening decision.** **Selected Option B** — a *possible future* dev-only, disabled-by-default, non-production, bounded **synthetic** admitted-assertion store — and **rejected Option D** (production-like durable storage). Named the no-leak denylist / `FORBIDDEN_PUBLIC_KEYS` as the boundary a store-backed projection must satisfy. Framed (§5–§7) the future durable-storage-model question as a choice among *append-only log vs current-state projection vs assertion+transition+audit tables, JSONB, external Straylight package, do-nothing*. |
| 33Q | #135 | **Bounded synthetic admitted-assertion ledger.** Implemented the 33P Option B lane: a bounded, process-local, Map-backed, non-durable, fail-closed, synthetic-only ledger exposed only as a route DI / test seam (no server wiring, no env flag, no package export). Models current-state projection (recall includes/excludes) + synthetic audit/provenance records over synthetic state. |
| 33R | #136 | **Bounded-ledger acceptance.** Accepted Phase 33Q **only** as a bounded, non-production, test-seam-only synthetic ledger proof for MVP 2 — **not** production admission, **not** durable storage, **not** a final schema, **not** production route readiness — and selected Phase 33S. |
| 33S | #137 | **Route-spike + bounded-ledger acceptance decomposition.** With the route surface (33O) and the synthetic stateful effect (33R) accepted, decomposed the materially different next lanes; identified three independent still-held upstream gates (the Straylight A–O review, the ADR-022E durable store, the final route contract); selected the Straylight primitive-review follow-up. |
| 33U | #139 | **Straylight-response intake.** Reconciled `@loa/straylight` PR #65's A–O verdicts. Rows **F (production signer/authority), G (production identity binding), J (final endpoint idempotency keying), O (durable store under ADR-022E gate #8)** remain **held**. Row C re-related (`assertion_superseded` dropped → `assertion_linked` + `superseded` via `supersedes_refs`); Row B: `admitted` is a public `outcome_class`, never a status, canonical `active` `Assertion` is the Straylight substrate, Dixie holds ingress refs only. ADR-022E gates #8 / #10 / #12 / #20 held. |
| 33V | #140 | **Storage/auth/consent design finalization.** Split `SyntheticAuditRecord` → `AuditEvent` + `TransitionReceipt`; adopted `public_receipt_ref`, retired `receipt_public_ref`; drew the private/public projection boundary on `privacy_scope` + environment-frame disposition (denylist = defense-in-depth); restated "service auth ≠ end-user consent"; kept **migration/backfill/rollback undesigned** and ADR-022E gate #8 **held**. |
| 33W–33Z | #141–#144 | **Route-contract readiness/revision/vector alignment.** Endpoint idempotency Dixie-owned; two-part `category.specific_reason` taxonomy; standardized `public_receipt_ref` (`null` where none minted); aligned the five vectors + validator (`--self-check` negative-mutation harness); `route_contract_final: false`. |
| 33Z (corr.) | #145 | **Next-lane label/provenance correction** (34A → 46A; avoids the completed Freeside Characters Phase 34A / PR #100 collision). |
| 46A | #146 | **Route-vector alignment acceptance.** Accepted the 33Z alignment as bounded, non-runtime vector/validator alignment; selected Phase 46B. |
| 46B | #147 | **Route-contract implementation-readiness decomposition.** Judged the storage/auth/consent cluster the upstream dependency; selected Phase 46C. |
| 46C | #148 | **Storage/auth/consent blocker decomposition.** Decomposed the held storage (11 rows), auth (10), consent (10), and shared public/private (7) blockers into ordered, separately-clearable sub-gates; selected Phase 46D. |
| 46D | #149 | **Storage/auth/consent acceptance.** Accepted the 46C decomposition as baseline; ranked the candidate next lanes **A ≻ B ≈ C ≻ D ≻ E ≻ F ≻ G ≻ H**; **selected this Phase 46E durable storage model decision gate (Option A)** as the deepest-blocker per-area gate; deferred the auth/identity/signer (B) and consent (C) gates downstream of it. |
| **46E** | *(this doc)* | **Durable storage model decision gate.** Records the source chain (§2) and the starting accepted facts (§3); decomposes the durable storage model questions (§4); presents and prunes the storage-model options (§5); selects the safest model **direction** as a recorded decision that **remains a future implementation gate** (§6); restates the required invariants (§7) and the exit criteria for any future implementation lane (§8); selects the next docs/decision-only lane (§9); updates the dependency ordering (§10); preserves the blocked lanes (§11). Mutates no vector / validator / fixture / source. |

> **PR-number provenance note.** The PR numbers above are taken from the local git
> merge-commit history (`docs: … (#NNN)` / `feat: … (#NNN)` subjects) and the Phase
> 46A / 46B / 46C / 46D source-chain tables. Phase 46D's `#149` is the merge commit
> `3ad02b7e "docs: accept admission storage auth consent decomposition (#149)"`. Treat
> the PR numbers as git-sourced rather than as authority embedded in the gate bodies
> (each gate refers to itself only as "this doc").

### 2.2 Canonical Straylight substrate (`@loa/straylight`) — read-only

- **Append-only, hash-chained audit substrate exists and is Straylight-owned.** The
  `StorageAdapter` interface declares `appendAuditEvent` / `listAuditEvents` /
  `getAuditTail` (`loa-straylight/src/straylight/storage/types.ts:64-67`); the block is
  documented as append-only and immutable once written
  (`storage/types.ts:7-8`) and hash-chained per estate, with `getAuditTail` returning
  the latest `audit_hash` (`storage/types.ts:9-10`). `class AuditLog` delegates through
  that storage-adapter path — `getAuditTail` for the previous tail
  (`audit.ts:31`), a deterministic `sha256` over the event plus the previous tail
  (`audit.ts:32-45`), `appendAuditEvent` on write and `listAuditEvents` on read
  (`audit.ts:62`, `:70-71`) — and `verifyChain` detects tampering by a
  `previous_audit_hash` mismatch (`audit.ts:83-84`). `AuditEvent` carries
  `previous_audit_hash` + `audit_hash` (`types.ts:525-526`).
- **Canonical `Assertion`, `TransitionReceipt`, `AuditEvent` are distinct
  Straylight-owned primitives.** `Assertion` has a `status` field (incl. `active`) and
  `supersedes_refs` (`types.ts:86-94`, `:157`); `TransitionReceipt` is a first-class
  discriminated type (`admission` / `denied` / `challenge` / `revocation` / `forget`,
  `types.ts:364-388`), distinct from the append-only `AuditEvent` chain entry
  (`types.ts:514-529`).
- **Straylight-repo ADR-022D names the MVP persistence options.** `ADR-022D` (MVP
  persistence + audit owner) specifies `InMemoryStorage` by default and `JsonlStorage`
  (append-only `.jsonl` per "table") as the durable option
  (`loa-straylight/docs/decisions/ADR-022D-mvp-persistence-and-audit-owner.md:69-82`),
  declares the `AuditEvent` shape / fields / invariants / emission rules Straylight-owned
  (`ADR-022D:47-67`), and establishes audit-chain integrity (tamper detection via
  `verifyChain`) as the contract the host inherits (`ADR-022D:109-127`).
- **Straylight-repo ADR-022E durable-store gate #8 is held.** Any *durable* admission
  store is governed by ADR-022E gate #8 (production persistence, held); the related
  gates #10 (Dixie boundary wiring), #12 (new HTTP/network surface), and #20
  (threat-model widening) are likewise held (33U §3.5 / §4.1). PR #65 cleared none of
  them.

> **Canonical-vs-mirror citation discipline (carried from Phase 46D §4).** The
> canonical evidence for `appendAuditEvent` / `listAuditEvents` / `getAuditTail` and
> `AuditLog` delegation is the **adjacent** `loa-straylight` repo, **not** Dixie's
> mirror. Dixie's
> `app/src/services/straylight-recall-intake/bounded-estate-store.ts` only *mirrors* the
> method names on a `MinimalStorageSurface` and manipulates local in-memory state
> directly — parity evidence only, never canonical `AuditLog`-delegation proof.

### 2.3 Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts, reconciled by 33U.**
  PR #65 clarified the *vocabulary / design* only; it **cleared no independent
  production gate** and authorized **no** Dixie runtime, production storage / auth /
  consent, or Freeside integration. The still-held rows that gate this storage-model
  decision are **F, G, J, and O** (33U §4.1).
- **Residual legacy marker prose.** The `[E,G,H,K,N,O]` / `[J]` marker arrays in some
  vector JSONs, the route-vector validator comments
  (`validate-route-contract-test-vectors.mjs:113-114`), and the Phase 33N classifier
  comments (`classifier.ts:73-74`) are **legacy textual debt only, not the current
  review-state authority**; the authoritative classification lives in the route-vector
  README current-state correction
  ([`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)).
  Phase 46E preserves that distinction and mutates no technical artifact.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the
> freeside-characters 34-/45-series, and Straylight's ADR / PR labels are independent
> labels in separate repositories and must not be conflated. The Dixie `46A` … `46E`
> continuation past the exhausted `33` single-letter suffix space avoids reusing the
> completed Freeside Characters Phase 34A / PR #100; `46E` signals **no** new product
> epoch and **no** scope expansion — it is the same Admission Wedge arc, still
> docs/decision-only.

---

## 3. Starting accepted facts

These are facts **already accepted** by the chain, re-verified read-only here as the
baseline the §4–§6 decision is measured against. None is changed by this gate.

1. **The only authorized route surface is the Phase 33N dev/operator-only spike, and
   it stores nothing durable.** It mounts only when
   `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (`config.ts:399`; `server.ts:630`),
   uses **Storage Option A** (no durable store, no DB writes, no migrations), and
   rollback is trivial because there is no durable state to roll back
   (`admission-intake.ts:6-9`). It explicitly does **not** authorize production
   admission / storage / auth / consent (`admission-intake.ts:11-15`).
2. **Every public response passes one no-leak send path.** `sendPublicResponse` deep-
   walks every body through the runtime no-leak guard before serialization and fails
   closed to a hardcoded known-safe fallback on any finding
   (`admission-intake.ts:233-270`); `findAdmissionPublicLeaks` forbids tokens, UUIDs,
   opaque runs ≥ 24 chars, stack traces, and private-key markers
   (`no-leak.ts:99-187`).
3. **The Phase 33Q ledger is synthetic, process-local, and non-durable.** It opens no
   database, file, socket, or timer — its entire state is JS Maps in a factory closure
   and a second construction yields a fresh empty ledger
   (`admitted-assertion-ledger.ts:28-32`, `:669-673`); it performs no durable write and
   no migration (`:31-32`). It was authorized by Phase 33P Option B and **explicitly
   rejected the production-like durable store (Option D)** (`admitted-assertion-ledger.ts:4-8`).
4. **The synthetic ledger already models current-state projection + provenance.** Its
   `RecallProjection.includes` are active, recall-eligible assertion ids; `excludes`
   are superseded (audit/provenance-only) ids (`admitted-assertion-ledger.ts:172-182`,
   `:957-973`). Supersession flips the prior to `assertion_status: 'superseded'`,
   `recall_eligible: false`, dropping it from ordinary recall and pointing
   `supersedes_assertion_id` / `superseded_by_assertion_id`
   (`:880-888`, `:102-105`). Its `SyntheticAuditRecord` carries `audit_private: true`
   and `public_audit_detail: false` and is never serialized publicly (`:119-130`).
5. **No durable Dixie admission store, schema, table, or migration exists; ADR-022E
   gate #8 is held.** The synthetic ledger does not satisfy it (33U §3.5; 33V §4); the
   final tenant/estate/actor binding, idempotency, signer/authority, schema, and
   receipt semantics all remain explicitly **unresolved** in source
   (`admitted-assertion-ledger.ts:36-45`, `:147-151`).
6. **Straylight owns the canonical durable substrate.** The canonical `active`
   `Assertion`, the first-class `TransitionReceipt`, and the append-only hash-chained
   `AuditEvent` are Straylight primitives, persisted through the `StorageAdapter` /
   `AuditLog` path with ADR-022D invariants (§2.2). Dixie holds **ingress references
   only** onto that canonical chain (33U Row B).
7. **The public envelope is built purely from the classification.** It carries an
   outcome class, `public_receipt_ref` (a fixed synthetic placeholder
   `admission-spike-receipt-draft`, or `null`), a `safe_reason_code`, a recall-
   eligibility projection, and all-`false` `draft_markers`
   (`public-response.ts:21-24`, `:32-57`, `:104`); it never incorporates request-
   controlled material. Refusal codes are the source-real `ingress.invalid_request`
   (malformed) and `admission_transition_denied_draft_non_final` (reject); dotted
   `admission.*` codes never reach the public surface (`classifier.ts:64`, `:68`).

> **What "accepted facts" do and do not mean.** These are **spike-posture,
> synthetic-ledger, and design-vocabulary** facts. They do not constitute a durable
> store, a frozen schema, a runtime production serializer, or any cleared production
> gate. The §4 question set and the §5 / §6 decision exist precisely because the
> accepted readiness is bounded to the dev/spike/synthetic surface.

---

## 4. Durable storage model questions

Before the Admission Wedge can move from the bounded synthetic/dev proof toward any
durable storage **design or implementation**, the following must be decided. Phase 46E
**decides the model direction** (§6) and **closes none of the per-item production
sub-decisions** — each remains a future, separately-gated decision. The table records,
for each question, the current in-repo evidence and the decision a future durable-store
lane must make.

| # | Question | Current evidence | Decision a future durable-store lane must make |
|---|---|---|---|
| 1 | **What is stored durably** (persisted vs derived vs projected)? | Nothing durable today; the synthetic ledger materializes current-state + holds provenance (`admitted-assertion-ledger.ts:172-182`). | Which records are persisted, which are derived by replay, which are projected for read. |
| 2 | **Candidate vs admitted-assertion boundary** | Candidate is a private/admission-bound ingress object; "admitted" is a public `outcome_class`, never a status; canonical `active` `Assertion` is Straylight's (33U Row B). | Where the candidate stops and the admitted (`active` `Assertion`) reference begins, and what Dixie persists vs references. |
| 3 | **Transition receipt storage** | `TransitionReceipt` is a first-class Straylight type (`types.ts:364-388`); private; only a separate `public_receipt_ref` may be public (33V §4). | The durable home of the private `TransitionReceipt` and the write-time public/private projection. |
| 4 | **Audit event storage** | Append-only, hash-chained `AuditEvent` via `StorageAdapter`/`AuditLog`; ADR-022D-owned, tamper-detectable (§2.2). | The durable, append-only, controlled-access `AuditEvent` persistence + retention model. |
| 5 | **Recall eligibility projection** | Synthetic `RecallProjection`: active + `recall_eligible` ⇒ includes; superseded ⇒ excludes (`:957-973`). Dixie's boolean `recall_eligible` is a **lossy, per-request** projection, not durable authority — actual recall disposition depends on request filters, privacy frame, and risk (33U). | How recall eligibility is **derived** at read time from durable projection *inputs* (assertion status, transition history, relationships) — **never persisted as canonical authority**; any materialized current-state set is a derived, invalidatable, request/context-dependent cache. |
| 6 | **Supersession / correction relationship** | Synthetic supersede flips the prior to `assertion_status: 'superseded'` / `recall_eligible: false` and links via the **Dixie-local** `supersedes_assertion_id` / `superseded_by_assertion_id` fields (`:878-887`, `:102-105`) — **not** the separate canonical Straylight `supersedes_refs` field (`types.ts:157`); Phase 33Q does not use canonical `supersedes_refs`. | The durable supersession model and how corrected/superseded are linked and excluded, mapping the Dixie-local fields onto the canonical `supersedes_refs` vocabulary. |
| 7 | **Rejection / denial storage** | Reject mints no assertion (`synthTransitionFor` returns `null`, `admission-intake.ts:162-167`); denial maps to a private `TransitionReceipt` kind `denied` (33X §11). | Whether/how denials are persisted (as private receipts/audit), with no public residue. |
| 8 | **Idempotency / replay records** | Endpoint/Dixie-owned (absent from Straylight); synthetic `replay_key` fails closed on conflict (`:265-282`); `idempotency_final: false` (33U Row J). | The final idempotency key, the replay envelope, the conflict response, and the durable backing of the replay ledger. |
| 9 | **Tenant / estate / actor partitioning** | `(tenant_id, estate_id)` scope is a **spike isolation** mechanism; foreign-tenant write fails closed (`:196-201`, `:251-263`); `identity_binding_final: false` (33U Row G). | The production tenant / estate / actor partitioning + cross-tenant guarantee. |
| 10 | **Signer / authority references** | `policy_service` is a canonical `SignerType`; authority decided by competence rule / keyring, not a fixed list; `authority_binding_final: false` (33U Row F). | Which signer/authority references are persisted and how they are verified at admission. |
| 11 | **Auth / consent references** | Service auth ≠ end-user consent; the consent grant/reference lives on the **private audit record only** (33V §5; 33K §6.9). | How auth-decision and consent references are persisted privately, never public, never raw. |
| 12 | **Public-safe receipt reference boundary** | `public_receipt_ref` is the single public-safe reference (`null` where none minted); spike mints a fixed synthetic placeholder (`public-response.ts:21-24`). | The durable mint / resolution of `public_receipt_ref` without operational-id leakage (or a decision not to mint). |
| 13 | **Private audit boundary** | Private `TransitionReceipt` / `AuditEvent` forbidden on the public surface at any depth (`validate-route-contract-test-vectors.mjs:267-280`); `audit_private: true` on synthetic records. | The controlled-access boundary that keeps private receipt/audit material off every public/log surface. |
| 14 | **Rollback / partial-failure behavior** | Spike fails closed atomically — no partially-admitted/recallable residue (`admission-intake.ts:335-368`); production rollback **undesigned** (33V §4). | The durable atomicity / partial-failure / rollback / recovery model. |
| 15 | **Migration / backward compatibility** | Migration/backfill/rollback **undesigned and out of scope** to date (33V §4); spike has no migration. | The forward-only migration + backfill + backward-compatibility plan (or a dev-only no-migration scope). |
| 16 | **Retention / forget / revoke / correction implications** | Forget/revoke/correction storage + UI **not designed**, a blocked separately-gated MVP-3-adjacent lane (33K §20; 33V §9). | How a durable store supports deletion/forget/revoke/correction **against an append-only audit chain**, *without implementing MVP 3 here*. |

> Every question above gates **implementation**; **none** gates a further
> **docs/decision** phase. Phase 46E answers only the *which-model* question (§6); the
> per-item production sub-decisions remain future, separately-gated decisions, and item
> 16 is explicitly surfaced **without implementing MVP-3 forget/revoke/correction**.

---

## 5. Durable storage model options

Phase 46E considers six candidate durable storage models. For each: what it would
prove, what it would not prove / its risk, and its disposition. **No option authorizes
a build** — the disposition selects a *direction* to pursue in a future, separately-
gated lane.

### Option 1 — Append-only transition/event log first (event-sourcing only)

- **Proves:** maximal auditability and tamper-evidence; history is never rewritten;
  matches the canonical append-only, hash-chained `AuditEvent` substrate (§2.2).
- **Does not prove / risk:** recall eligibility would require replay/projection on
  every read with no materialized current-state; a *Dixie-owned* parallel event log
  would duplicate Straylight's canonical `AuditEvent` substrate and widen the threat
  model (ADR-022E gate #20).
- **Disposition:** **partially adopted** — the append-only, hash-chained audit log is
  the right *audit half*, but it is **Straylight-owned canonical substrate**, not a
  Dixie-owned standalone model. Not selected as a stand-alone Dixie model.

### Option 2 — Current-state projection plus audit log

- **Proves:** cheap recall reads from a **derived** current-state cache (active /
  recall-eligible set) computed from durable projection *inputs* (assertion status,
  transition history, relationships), **plus** the append-only audit log for full
  provenance; supersession handled by a status flip + exclusion. The Phase 33Q synthetic
  ledger sketches this conceptual shape in synthetic form (`RecallProjection`
  includes/excludes + `SyntheticAuditRecord`) (`admitted-assertion-ledger.ts:957-973`,
  `:119-130`) — it does **not** prove the exact production shape, and its records are
  synthetic, not a hash-chained `AuditEvent` log.
- **Does not prove:** *who owns* the durable substrate (resolved by Option 5); the
  synthetic realization is process-local and non-durable; and critically, the
  materialized current-state set must be treated as a **derived, invalidatable,
  request/context-dependent cache**, **not** persisted as canonical recall authority —
  Dixie's boolean `recall_eligible` is lossy and per-request, and real recall
  disposition depends on request filters, privacy frame, and risk (33U).
- **Disposition:** **selected as the conceptual model** (§6), realized on the canonical
  Straylight substrate (Option 5) — not as a Dixie-owned parallel store.

### Option 3 — Assertion table plus transition/audit tables (Dixie-owned relational)

- **Proves:** a fully Dixie-owned relational store with explicit
  assertion/transition/audit tables.
- **Does not prove / risk:** it **duplicates** Straylight's canonical
  `Assertion` / `TransitionReceipt` / `AuditEvent` primitives (§2.2) — directly against
  33U Row B (canonical `Assertion` is Straylight's; Dixie holds ingress refs only) —
  and widens the threat model (ADR-022E gate #20). Two sources of truth for the same
  assertion lifecycle is a correctness and audit-integrity hazard.
- **Disposition:** **rejected as premature and duplicative.** Dixie does not own a
  parallel canonical assertion/audit substrate.

### Option 4 — JSONB / prototype blob store

- **Proves:** fast to prototype.
- **Does not prove / risk:** no schema discipline, no append-only guarantee, no
  hash-chain / tamper-evidence, and a blob is the easiest way to accidentally persist
  raw candidate payload or leak private/audit material — violating the no-leak boundary
  (§7) and the ADR-022D audit-chain invariants.
- **Disposition:** **rejected as unsafe and premature.**

### Option 5 — Straylight canonical semantics / interfaces as the dependency (physical adapter placement deferred)

- **Proves:** a **single canonical owner of the semantics and interfaces** for the
  durable `Assertion` / `TransitionReceipt` / `AuditEvent` substrate (the
  `StorageAdapter` / `AuditLog` *interface*, ADR-022D `InMemoryStorage` default /
  `JsonlStorage` durable option, §2.2), inheriting the ADR-022D append-only hash-chained
  audit invariants and placing the durable decision behind the correct gate (ADR-022E
  gate #8). The dependency is the **Straylight canonical semantics/interfaces**; Dixie
  consumes the canonical interface for the assertion/transition/audit lifecycle (it does
  not build a *parallel canonical* lifecycle) and owns what is genuinely Dixie's:
  endpoint-local idempotency/replay records, ingress references, and the public/private
  projection + no-leak serializer.
- **Does not prove / leaves open:** the **physical placement** of the durable adapter is
  **unresolved** — ADR-022D leaves a future Postgres / sibling-runtime persistence
  adapter (potentially in Dixie, Finn, or another sibling runtime) to a **separate**
  ADR, and `StorageAdapter` is explicitly the swap-in seam for that future
  Postgres / sibling-runtime substrate (`loa-straylight/.../storage/types.ts:15-16`;
  `ADR-022D`). It also does not prove the gate-clearing evidence for ADR-022E gate #8,
  the final auth / identity / consent binding, or the idempotency keying — all still
  held.
- **Disposition:** **selected as the semantics/interface dependency** (§6), paired with
  Option 2 as the conceptual model. **Remains a future gate** — ADR-022E gate #8 is
  held; nothing is built or authorized here, and the **physical adapter placement is
  not frozen by Phase 46E**.

### Option 6 — Do-nothing / continue synthetic-only

- **Proves:** it is the **correct current posture** — the synthetic ledger + Storage
  Option A spike is the only authorized state, and Phase 46E does not change it.
- **Does not prove:** it is not a *permanent* model — it cannot persist real estate
  material, complete MVP 2, or satisfy production recall over durable state.
- **Disposition:** **retained as the correct interim posture** until a future gate
  clears the durable store; **not selected as the permanent model**, and explicitly
  **not overridden** by Phase 46E (no build is authorized).

> **Premature options are rejected, not deferred-as-equal.** Options 3 (Dixie-owned
> *parallel canonical* relational tables) and 4 (JSONB blob) are **rejected** as
> duplicative / unsafe. Option 1 is folded into the audit half of the selected model.
> Option 6 is the correct interim posture. The selected direction is Option 2 (model)
> realized against the Option 5 Straylight canonical semantics/interfaces — a *decision*,
> not a build, and one that does **not** freeze the physical durable adapter placement
> (which may still be Dixie, Finn, or a sibling runtime under a future ADR).

---

## 6. Selected durable storage model decision

> **Selected model direction:** **current-state projection + append-only,
> hash-chained audit log (Option 2), realized against the Straylight canonical
> semantics / interfaces (Option 5)** — to pursue **only when** a future,
> separately-gated ADR clears the Straylight-repo ADR-022E durable-store gate #8 while
> preserving the ADR-022D receipt/audit-chain invariants. **The dependency is the
> Straylight canonical semantics/interfaces; the physical durable adapter placement is
> unresolved and is not frozen by Phase 46E.** **This is a model *decision*, not a
> build: ADR-022E gate #8 stays held; no durable store, schema, migration, or DB write
> is authorized.**

**The decided ownership split (for the future durable-store lane):**

- **Straylight owns the canonical semantics and interfaces** for the durable
  substrate — the `active` `Assertion`, the first-class `TransitionReceipt`, and the
  append-only hash-chained `AuditEvent`, with their invariants and the
  `StorageAdapter` / `AuditLog` *interface* (ADR-022D `InMemoryStorage` default /
  `JsonlStorage` durable option). The **physical durable adapter placement remains
  unresolved**: ADR-022D leaves a future Postgres / sibling-runtime persistence adapter
  — which may live in **Dixie, Finn, or another sibling runtime** — to a **separate**
  ADR, and Phase 46E does **not** freeze that placement. What Phase 46E fixes is the
  *dependency on the canonical semantics/interfaces*, not the physical home. Dixie does
  **not** build a **parallel canonical** assertion/transition/audit lifecycle (Options
  3 / 4 rejected).
- **Dixie's Phase 46E ownership is contract-scoped, not canonical.** For Phase 46E,
  Dixie does **not** become the canonical owner of the Straylight assertion-lifecycle
  semantics. Dixie may own (a) **endpoint-local contract / idempotency / replay
  records** (Dixie-owned, route-contract-bound; `idempotency_final` still held — §4
  item 8), (b) **ingress references** onto the canonical chain (33U Row B), and (c) the
  **response projection / serialization** — the public/private projection + no-leak
  serializer that derives the public envelope (`public_receipt_ref` or `null`,
  `safe_reason_code`, recall projection) and keeps private `TransitionReceipt` /
  `AuditEvent` material off every public/log surface — and Dixie **may later host or
  operate a durable adapter / persistence binding** if a future ADR / gate assigns that
  responsibility. Phase 46E leaves the **physical adapter implementation, operational
  ownership, and persistence binding unresolved under ADR-022E gate #8** — the
  unresolved placement question above (Dixie / Finn / sibling runtime), not decided
  here.
- **Durable storage may persist** assertion status, transition history, relationships,
  receipts, audit references, and recall-projection *inputs* — but **must not persist
  `recall_eligible` as canonical authority**. **Recall eligibility** is **derived** at
  read time from those inputs; any materialized current-state set (active +
  recall-eligible ⇒ includes; superseded ⇒ excludes), backed by the **append-only audit
  log** for provenance, is a **derived, invalidatable, request/context-dependent
  cache**, never the authority. Dixie's boolean `recall_eligible` is lossy and
  per-request, and real recall disposition depends on request filters, privacy frame,
  and risk (33U). The Phase 33Q synthetic ledger sketches this conceptual shape in
  synthetic form; it does **not** prove the exact production shape.

**Why this is the safest direction:**

- It does not duplicate the canonical substrate (honours 33U Row B), so there is one
  source of truth for the assertion lifecycle and audit chain.
- It inherits the ADR-022D append-only, hash-chained, tamper-detectable audit
  invariants rather than reinventing them (§2.2) — satisfying the "preserve
  auditability without rewriting history" invariant (§7).
- It places the durable decision behind the correct gate (ADR-022E gate #8) and keeps
  the threat-model surface narrow (no new Dixie-owned canonical store; ADR-022E gates
  #10 / #12 / #20 stay relevant but un-widened by this decision).
- It keeps the synthetic ledger's proven projection model and reuses it as the design
  reference, minimizing future rework.

**What this decision explicitly does NOT do (surfaced, not suppressed):**

- It does **not** clear ADR-022E gate #8, and is **not** the gate-clearing ADR — a
  separate ADR must clear the gate on its own evidence, preserving the ADR-022D
  invariants.
- It does **not** author the durable data model, schema, table definitions, or
  migration — those are the future durable-store lane's output (§8).
- It does **not** authorize DB writes, a migration, a route handler change, an auth
  change, or a consent implementation.
- It does **not** decide the final idempotency keying (Dixie-owned; held — §4 item 8),
  the production identity binding (held — Row G), or the signer/authority model (held —
  Row F); those are downstream per-area gates (§10).
- It does **not** override the current do-nothing / synthetic-only posture (Option 6
  remains in force) and authorizes nothing to be built.

> **The selected model remains a future implementation gate.** Per the §1 verdict and
> the user-charter, the storage-model build is **not** authorized by Phase 46E; it is a
> recorded *direction* that a future, separately-gated lane must satisfy the §8 exit
> criteria for before any implementation begins.

---

## 7. Required invariants

Any future durable storage design or implementation lane must preserve **all** of the
following. Each is already enforced (in synthetic / spike form) where cited, and the
durable model must carry it forward unchanged.

1. **A pending candidate is not recallable.** Only active, recall-eligible assertions
   enter `RecallProjection.includes`; pending material mints no recallable assertion
   (`admitted-assertion-ledger.ts:957-973`; `admission-intake.ts:162-167`).
2. **A rejected candidate creates no admitted assertion.** `reject` returns no
   transition and touches no ledger (`admission-intake.ts:162-167`,
   `synthTransitionFor`).
3. **An accepted candidate creates / references an admitted assertion.** `accept` mints
   an `admit` transition recorded as an active assertion (`admission-intake.ts:143-151`;
   `admitted-assertion-ledger.ts:762-828`).
4. **A superseded assertion is excluded from ordinary recall** unless explicitly
   requested / marked. Supersession flips the prior to `superseded` /
   `recall_eligible: false` and drops it from ordinary recall, retaining it for
   audit/provenance (`admitted-assertion-ledger.ts:880-888`, `:963-967`).
5. **A malformed / unsafe payload fails closed.** The classifier accepts only the five
   scenario forms; everything else fails closed to the stable shape-refusal with zero
   residue (`admission-intake.ts:316-333`; `classifier.ts:64`).
6. **The public response leaks no raw / private / audit / debug / source material.**
   Every body passes the single no-leak send path; findings fail closed
   (`admission-intake.ts:233-270`; `no-leak.ts:99-187`).
7. **Private `TransitionReceipt` / `AuditEvent` material remains private.** Synthetic
   audit records carry `audit_private: true` / `public_audit_detail: false` and are
   never serialized publicly; private receipt/audit shapes are forbidden on the public
   surface at any depth (`admitted-assertion-ledger.ts:119-130`;
   `validate-route-contract-test-vectors.mjs:267-280`).
8. **Storage must not make user chat into memory.** No Discord / freeform ingestion and
   no user-chat-as-memory path is created; the route accepts only a candidate /
   transition envelope (`admission-intake.ts:11-15`; 33V §5).
9. **Storage must not create a public `remember-this`.** No public / unauthenticated
   `remember-this` surface is designed or authorized (33K §12 / §20; 33V §5).
10. **Storage must not assume a final Straylight schema beyond accepted review
    outcomes.** Rows F / G / J / O remain held;
    `straylight_primitive_review_complete` stays `false` because the independent
    production gates are held, not because the answer is missing (33U §4.1; 46A §3).
11. **Storage must preserve auditability without rewriting history.** The audit log is
    append-only, hash-chained, and tamper-detectable (`verifyChain`); records, once
    written, are immutable and returned in append order
    (`loa-straylight/src/straylight/storage/types.ts:7-10`; `audit.ts:83-84`).

---

## 8. Exit criteria for any future implementation lane

A future lane may begin durable storage **implementation** only after **all** of the
following are produced and accepted. Phase 46E satisfies **none** of these (it is a
model decision); they are the bar a downstream lane must clear.

| # | Exit criterion | Owning future gate |
|---|---|---|
| 1 | **Accepted durable data model** (records persisted vs derived vs projected, keys, indexes), consistent with the §6 ownership split. | Durable-store design gate + ADR-022E gate-#8-clearing ADR. |
| 2 | **Accepted migration plan, or an accepted dev-only no-migration scope.** | Durable-store design gate. |
| 3 | **Accepted idempotency / replay semantics** (final key, replay envelope, conflict response, ledger backing) — Dixie/endpoint-owned. | Route-contract idempotency decision (couples to §4 item 8). |
| 4 | **Accepted tenant / estate / actor identity binding** (production, session-derived; no caller override). | Auth / identity / signer gate (Row G held). |
| 5 | **Accepted auth / consent references** (service-auth model; consent proof/receipt on the private audit record only). | Auth gate + consent gate (Rows F / consent held). |
| 6 | **Accepted public / private response projection** (the production no-leak serializer enforcing `privacy_scope` + frame disposition). | No-leak serializer design gate. |
| 7 | **Accepted rollback / partial-failure behavior** (atomicity, recovery). | Durable-store design gate. |
| 8 | **Executable tests or fixture vectors planned** for the durable model (extending the existing vectors / `--self-check`, still no-leak-bounded). | Implementation-spike readiness checklist. |
| 9 | **Codex audit acceptance before PR** of the durable-store design / implementation. | The implementing lane's review/audit gate. |

> Exiting Phase 46E authorizes **no** runtime implementation. It records the model
> direction (§6), the invariants the future lane must preserve (§7), and the criteria
> above; the build remains blocked until a future, separately-gated lane satisfies them.

---

## 9. Selected next lane

> **Selected: Phase 46F — Admission Wedge durable storage shape and route-vector
> alignment gate (docs + non-runtime fixture/vector/validator alignment only, if
> justified; not runtime).**

**Reason:**

- Phase 46E must **not** jump to runtime implementation — no artifact accepted so far
  proves implementation is safe (§3, §11), and §10 shows every implementation-adjacent
  step is held.
- Phase 46E decided only the storage model **direction** (§6); it satisfies **none** of
  the §8 implementation exit criteria. The Phase 46D charter required Phase 46E to leave
  candidate persistence, receipt-reference persistence, replay-ledger backing,
  rollback / migration posture, tenant isolation, and deletion implications as future
  work — and they remain so. An auth / identity / signer gate is justified by deciding
  "**auth against the now-decided storage**," but with the storage *shape* (not just its
  direction) still undecided, jumping straight to auth would contradict that rationale.
- The safest next lane is therefore a **non-runtime storage-shape / route-vector /
  validator alignment gate**: it defines and aligns the durable storage *shape* for the
  §6 model — the persisted records (assertion status, transition history, relationships,
  receipts, audit references, recall-projection inputs), the **derived, non-authoritative**
  recall projection, and the public/private boundary — and how that shape maps onto the
  existing route vectors, **without implementing storage, migrations, route writes, or
  production behavior**. It may include docs-only or **non-runtime** fixture / vector /
  validator alignment if justified, but **no runtime implementation**. This is the
  lowest-blast-radius step that makes the downstream auth gate's "auth against a decided
  storage shape" rationale true.

**Phase 46F scope (defined here; executed only in Phase 46F):**

- **Allowed:** docs/decision-only, **or** non-runtime fixture / vector / validator
  alignment if justified; define and align the durable storage *shape* for the §6 model
  (persisted records vs derived/projected reads; the receipt / audit reference shape;
  the **derived, invalidatable, request/context-dependent** recall projection; the
  public/private boundary) and how it maps onto the existing route vectors; record exit
  criteria and the boundary to the downstream auth / identity / signer gate.
- **Blocked:** no storage implementation; no migration; no DB write; no route handler /
  route write change; no production behavior; persisting `recall_eligible` as
  authority; freezing the physical durable adapter placement; no auth / consent
  implementation; no clearing of ADR-022E gate #8 or PR #65 rows F / G / J / O; no
  route-contract or schema freeze; no production-readiness claim.

**Documented alternative.** The **auth / identity / signer authority decision gate**
(decide the production service-auth model — 33K options A vs B — the session-derived
caller-identity binding with no caller override, the signer / authority model, the
cross-user / cross-tenant denial posture, and the endpoint-local-header ↔ global
`/api/*` gate relationship) is the **downstream** lane that follows storage-shape
alignment (§10 step 3). It is **not** selected as the immediate next lane: with the §8
storage exit criteria unsatisfied, "auth against the now-decided storage" is not yet
true, so the non-runtime storage-shape / vector / validator alignment gate must precede
it to keep the per-area chain (storage **shape** → **auth** → consent) disciplined.
**Runtime implementation is not selected under any option.**

---

## 10. Dependency ordering after Phase 46E

With Phase 46E deciding the storage model direction, the ordering of dependencies
**before** any implementation is:

1. **Phase 46E decides the durable storage model direction.** *(This gate — §6.)*
2. **Phase 46F — durable storage shape and route-vector alignment gate** *(selected next
   lane, §9)* — defines/aligns the durable storage *shape* for the §6 model (persisted
   records vs derived/projected reads, the derived non-authoritative recall projection,
   the public/private boundary) and its mapping onto the route vectors; docs/decision or
   non-runtime fixture/vector/validator alignment only, no runtime.
3. **Auth / identity / signer authority decision gate** — decides the production auth
   model, identity binding (Row G), and signer/authority (Row F), against the now-decided
   storage **shape**.
4. **Consent proof / receipt decision gate** — the production consent-proof model and
   consent-receipt private-audit binding, on top of the auth and storage decisions.
5. **Durable-store design gate + ADR-022E gate-#8-clearing ADR** — authors the durable
   data model, schema, migration / no-migration scope, rollback plan, and the physical
   adapter placement (Dixie / Finn / sibling-runtime) for the §6 model, and clears
   ADR-022E gate #8 preserving the ADR-022D invariants. *(The build precondition; held.)*
6. **Final route-contract pre-freeze gate** — idempotency keying, the dotted
   `admission.*` taxonomy + HTTP mapping, identity binding, atomicity/rollback resolved
   into a pre-freeze contract.
7. **Implementation-spike readiness checklist** — the exact evidence required before
   extending past the Phase 33N spike, referencing the now-concrete sub-gates.
8. **Bounded default-off implementation spike** — only if the checklist is satisfied;
   disabled-by-default, fail-closed, separately authorized.
9. **Smoke / acceptance gate** — validates the bounded spike against the vectors /
   acceptance criteria.
10. **Freeside Characters client-contract handoff** — only after Dixie route ownership,
    the auth / storage boundary, and the contract shape settle.

> **Implementation remains downstream, and Phase 46E does not claim the prior gates are
> satisfied — they are not.** Steps 2–10 are each held: the storage-shape alignment (2)
> is the next docs/non-runtime step; the auth / consent gates (3–4) are unresolved; the
> durable-store ADR (5) is held behind ADR-022E gate #8; the route-contract pre-freeze
> (6) depends on (2–5); the spike checklist (7) on (6); the bounded spike (8) on (7);
> the acceptance gate (9) on (8); the Freeside handoff (10) on (6). The only step Phase
> 46E advances is **step 1** — deciding the model direction — which is itself
> docs/decision-only. **Runtime implementation is not the next step.**

---

## 11. Blocked lanes

Phase 46E is a bounded, docs/decision-only model-decision gate. It authorizes **none**
of the following; each remains **blocked** and is **not** unblocked by deciding the
storage model direction or selecting Phase 46F:

- durable Admission Wedge storage implementation (ADR-022E gate #8 held);
- DB writes;
- migrations;
- a durable data model, schema, or table definition (the §6 model is a direction, not a
  schema);
- route / API handler implementation **beyond the existing Phase 33N spike**;
- production admission;
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
- forget / revoke / correction UI (MVP-3-adjacent; surfaced in §4 item 16, not
  implemented);
- final idempotency semantics (Dixie / endpoint-owned; undecided);
- production signer / authority semantics;
- production identity binding (tenant / estate / actor).

> **A model decision does not authorize runtime implementation.** Deciding the durable
> storage model direction and selecting Phase 46F makes the next decision legible; it
> does **not** build a store, **not** author a schema or migration, **not** clear any
> production gate, **not** freeze the route contract or schema, and **not** authorize
> any route / storage / auth / consent / Freeside / package-export work. The Phase 33N
> dev/operator-only, disabled-by-default spike remains the only authorized route
> surface, and the do-nothing / synthetic-only posture (Option 6) remains in force.

Phase 46E also does **not**: mutate any route-vector JSON, the route-vector validator,
the route-vector README, the Phase 33E fixtures, or the Phase 33E fixture validator;
mutate any runtime source; change any config, env, package, lockfile, CI, or generated
file; flip any draft marker (`route_contract_final`, `idempotency_final`,
`identity_binding_final`, `authority_binding_final`, `schema_final`,
`straylight_primitive_review_complete`, etc. stay `false`); or edit the adjacent
`loa-straylight` / `freeside-characters` repositories.

If a later phase reaches for any of the above, it must re-open the Phase 33K
precondition design, the Phase 33P / 33Q / 33R / 33S storage lane, the Phase 33U / 33V
chain, the Phase 46A / 46B / 46C / 46D / 46E gates, and the relevant ADRs (Straylight-
repo ADR-022E durable-store gate #8 and related gates #10 / #12 / #20; ADR-022D
receipt/audit-chain invariants; ADR-026C / ADR-026D route guardrails) first; it must
not silently expand scope.

---

## 12. Corruption / duplicate guard

Phase 46E applies an explicit corruption / duplicate guard to **this** document
(carried from the Phase 46C / 46D precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 15.`)
  appears exactly once.
- **Numbered sections appear once each.** Sections 1–15 each appear exactly once; the
  guard counts `^## N\.` occurrences and asserts one per number.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", "RESULT:",
  trailing "Report" headings, prose-claim dumps, or pasted terminal transcript appears
  in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited
  row; no duplicated / truncated / wrapped table fragments appear.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced
  block is the §13 validation command list.

The guard commands and their recorded results are in §13.

---

## 13. Validation

All commands were run from the repository root
(`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46E is docs/decision-only — it
adds only this document and mutates no vector, validator, or fixture — so the
validators are run only to confirm the unchanged artifacts remain green. The
fence-balance and negative-claim checks avoid embedding affirmative-claim substrings in
prose, so they cannot self-match.

```bash
git branch --show-current
git status --short --branch --untracked-files=all
git diff --name-status
git diff --stat
git diff --check
# Nothing-staged check (this lane stages nothing):
git diff --cached --name-status
# Untracked new-doc fence/whitespace sanity:
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md || test "$?" = "1"
# Unchanged-artifact green-check (no mutation here):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# Self-reference / next-lane label check (grep -E so `|` is real alternation):
grep -E "Phase 46E|Phase 46F" docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md
# Duplicate/corruption grep (advisory):
grep -nE "Claude said|Patch Report|terminal report|RESULT:|Report$" docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md || true
# Enforcing negative check — fail if any affirmative readiness / freeze /
# implementation / authorization claim appears in PROSE. The patterns are
# affirmative-only and word-boundaried, so the document's negated prose ("does not
# freeze …", "not production-ready", "no … work is authorized") and the fenced
# validation commands below are deliberately NOT matched. It is NOT masked with
# `|| true`:
python3 - <<'PY'
import re
from pathlib import Path
p = Path("docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md")
patterns = [
    r"\bruntime implementation is selected\b",
    r"\bimplementation is authorized\b",
    r"\broute contract is frozen\b",
    r"\bschema is frozen\b",
    r"\bstorage is implemented\b",
    r"\bthe durable store is built\b",
    r"\bmigration is applied\b",
    r"\bgate #8 is cleared\b",
    r"\bis production[- ]ready\b",
    r"\bproduction[- ]readiness is (?:declared|achieved|confirmed|established|met)\b",
    r"\bdb writes? (?:is|are) authorized\b",
    r"\bmigrations? (?:is|are) authorized\b",
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
print("The enforcing scan found no affirmative readiness/freeze/build/authorization claims outside fenced validation commands.")
PY
# Fence-balance check (dependency-free; even count = balanced; char-code form avoids
# embedding a literal triple-backtick that would unbalance this doc):
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

Recorded results for this lane (see the message body accompanying this commit for the
captured terminal output):

- **docs-only scope check** — only the single new file
  `docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md` is added; no
  route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture,
  fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI,
  migration, runtime, or generated file is touched;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no `git add` /
  commit / push);
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator
  reports 5/5 probes valid, 0 failures; the route-contract test-vector validator
  reports 5/5 vectors valid, 0 failures, no sixth vector; the `--self-check`
  negative-mutation harness reports 5/5 mutations fail closed;
- **self-reference label check** — `grep -E "Phase 46E|Phase 46F"` confirms both the
  `Phase 46E` (self) and `Phase 46F` (next-lane) labels are present;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the
  fifteen headings 1–15 exactly once each;
- **duplicate/corruption grep** — the advisory `grep -nE "Claude said|Patch Report|…"`
  finds no pasted terminal-report fragment in the document body;
- **negative readiness-claim check (enforcing)** — the `python3` scan excludes fenced
  lines and reports the affirmative-only, word-boundaried patterns found no match
  outside the fenced validation commands; the document's **negated** prose (the clauses
  stating the gate does **not** build a store, does **not** clear gate #8, and
  authorizes **no** write / migration work) is correctly not matched. The scan is not
  masked with `|| true`;
- **fence-balance check** — the dependency-free `node -e` counter reports an even
  (balanced) triple-backtick count; the single fenced block is the validation command
  list above, with no unterminated code fence.

---

## 14. Success criteria for Phase 46E

Phase 46E succeeds if and only if:

1. **Docs / decision-only** — it creates only this Phase 46E document; it changes
   **no** route-vector JSON, route-vector validator, route-vector README, Phase 33E
   fixture, fixture validator, runtime source, test, route, store, migration, auth,
   consent, config, env, package, lockfile, CI, or generated file, and edits **no**
   adjacent repository (§1).
2. **Source chain / evidence intake recorded** — the Dixie chain (33K / 33N / 33P /
   33Q / 33R / 33S / 33U / 33V / 33W–33Z → 46A → 46B → 46C → 46D → 46E), the canonical
   Straylight substrate, and the held ADR-022E gates are summarized (§2).
3. **Starting accepted facts recorded** — the spike posture, the synthetic ledger
   model, the canonical Straylight ownership, and the held gates are recorded as the
   baseline (§3).
4. **Durable storage model questions decomposed** — the sixteen questions (what is
   stored durably, candidate-vs-admitted boundary, transition receipt, audit event,
   recall projection, supersession, rejection, idempotency/replay, tenant/estate/actor
   partitioning, signer/authority, auth/consent refs, public-safe receipt boundary,
   private audit boundary, rollback/partial-failure, migration/back-compat, and
   retention/forget/revoke/correction without implementing MVP 3) are recorded with
   current evidence and the future decision required (§4).
5. **Storage model options presented and pruned** — the six options (append-only log;
   current-state projection + audit log; assertion+transition+audit tables; JSONB
   prototype; external Straylight-owned substrate; do-nothing/synthetic-only) are
   analyzed, with premature ones rejected (§5).
6. **Safest model direction selected as a decision that remains a future gate** —
   current-state projection + append-only audit log realized on the canonical
   Straylight substrate, with the Dixie/Straylight ownership split, selected as a model
   *decision* that does not build, author a schema/migration, clear ADR-022E gate #8,
   or authorize implementation (§6).
7. **Required invariants restated** — the eleven invariants (pending not recallable;
   rejected mints nothing; accepted creates/references; superseded excluded; malformed
   fails closed; public response no-leak; private receipt/audit private; not user-chat
   memory; not public remember-this; no final-schema assumption beyond accepted review;
   auditability without history rewrite) are recorded and grounded (§7).
8. **Exit criteria recorded** — the nine exit criteria for any future implementation
   lane (data model, migration/no-migration, idempotency/replay, identity binding,
   auth/consent refs, public/private projection, rollback/partial-failure, planned
   tests/fixtures, Codex audit acceptance before PR) are recorded with owning gates,
   and Phase 46E satisfies none of them (§8).
9. **Next lane selected** — Phase 46F (durable storage shape and route-vector alignment
   gate; docs/decision or non-runtime fixture/vector/validator alignment only) is
   selected with reasoning and scope, the downstream auth / identity / signer gate
   recorded as the documented alternative, and runtime implementation explicitly not
   selected (§9).
10. **Dependency ordering updated** — the post-46E ordering (46E model → 46F storage
    shape / vector alignment → auth → consent → durable-store ADR → route-contract
    pre-freeze → spike checklist → bounded spike → smoke → Freeside handoff) is
    recorded, with implementation downstream (§10).
11. **Blocked lanes preserved** — no durable / DB-write / migration / schema / route /
    auth / consent / Freeside / package / production-readiness lane is authorized (§11).
12. **Corruption / duplicate guard applied** — the document passes the §12 guard, with
    results recorded in §13.
13. **No freeze, no production-readiness claim, no gate clearance** — Phase 46E freezes
    neither the route contract nor the schema, declares no production readiness, and
    does **not** clear ADR-022E gate #8 (§1, §6, §11).

---

## 15. Cross-references

- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md)
  — Phase 46D acceptance gate (PR #149); its §7 selected this Phase 46E durable storage
  model decision gate and its §8 sequenced the auth gate downstream of storage (carried
  forward at this gate's §10 step 3, after the §9 storage-shape / vector alignment lane).
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md)
  — Phase 46C decomposition gate (PR #148); its §4.1 storage decomposition is the
  blocker source this gate's §4 question set elaborates.
- [`docs/ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)
  — Phase 33P (PR #134); selected Option B (synthetic store) and rejected Option D
  (production-like durable storage), and framed the storage-model options this gate's
  §5 evaluates.
- [`docs/ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)
  — Phase 33R (PR #136); accepted the Phase 33Q ledger only as a bounded,
  non-production, test-seam-only synthetic proof — the §3 / §5 baseline.
- [`docs/ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)
  — Phase 33S; identified the three independent still-held upstream gates (Straylight
  review, ADR-022E durable store, final route contract).
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U (PR #139); the A–O reconciliation (rows F / G / J / O held; ADR-022E
  gates #8 / #10 / #12 / #20 held; Row B / Row C) grounding §2 / §5 / §6.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V (PR #140); the `AuditEvent` / `TransitionReceipt` split, the
  `public_receipt_ref` adoption, the `privacy_scope` + frame-disposition projection
  boundary, and the undesigned migration/backfill/rollback grounding §2 / §4 / §7.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  with the five vector JSONs — inspected **read-only** to ground the no-leak boundary
  and the legacy-marker status. None is modified.
- `docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`,
  `docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`,
  `app/src/routes/admission-intake.ts`, `app/src/server.ts`, `app/src/config.ts`, and
  `app/src/services/admission-wedge-spike/{auth-gate,public-response,no-leak,classifier,admitted-assertion-ledger,index}.ts`
  — inspected **read-only** to ground the §3 spike / synthetic-ledger facts and the §7
  invariants. None is modified.
- `loa-straylight/src/straylight/storage/types.ts`, `loa-straylight/src/straylight/audit.ts`,
  `loa-straylight/src/straylight/types.ts`, and
  `loa-straylight/docs/decisions/ADR-022D-mvp-persistence-and-audit-owner.md` —
  inspected **read-only** as the **canonical** Straylight substrate cited in §2.2 / §5 /
  §6 (the `StorageAdapter` append-only hash-chained audit methods; `AuditLog`
  delegation + `verifyChain`; the `Assertion` / `TransitionReceipt` / `AuditEvent`
  primitives; the ADR-022D `InMemoryStorage` / `JsonlStorage` MVP-persistence options).
  Neither adjacent-repo file is modified by this phase.
- `@loa/straylight` — canonical primitive / substrate owner; PR #65 (merged) answered
  the A–O primitive review. Straylight-repo ADR-022E (durable-store gate #8 + related
  gates #10 / #12 / #20, **held**), ADR-022D (receipt/audit-chain invariants), ADR-026C,
  ADR-026D are decision records cited as guardrails. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — the cross-repo
  acceptance whose mirror/adapter is test-only, not exported, not runtime-wired, with no
  live Dixie call; the consent-boundary handoff stays deferred. **Not edited by this
  phase.**
