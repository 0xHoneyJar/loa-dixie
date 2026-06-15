# Phase 46F — Admission Wedge Durable Storage Shape & Route-Vector Alignment Gate

> **Phase**: 46F
> **Branch context**: `phase-46f-admission-storage-shape-vector-alignment`
> **Related**: Phase 46E durable storage model decision (PR #150,
> [`ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md)
> §6 / §9 / §10, which selected and scoped this gate); Phase 46D storage/auth/consent
> acceptance (PR #149); Phase 46C storage/auth/consent blocker decomposition (PR #148);
> Phase 46B route-contract implementation-readiness decomposition (PR #147); Phase 46A
> route-vector alignment acceptance (PR #146); Phase 33Z route-vector alignment (PR #144)
> + its PR #145 next-lane label/provenance correction; Phase 33Y route-contract revision
> acceptance (PR #143); Phase 33X route-contract revision draft (PR #142); Phase 33V
> storage/auth/consent design finalization (PR #140); Phase 33U Straylight-response intake
> (PR #139); Phase 33R bounded-ledger acceptance (PR #136); Phase 33Q bounded synthetic
> admitted-assertion ledger (PR #135); Phase 33P storage/receipt hardening (PR #134); Phase
> 33N dev/operator-only route spike; Phase 33L route-contract test-vector fixture draft;
> Straylight (`@loa/straylight`) PR #65 (A–O primitive-review verdicts, **merged**);
> Straylight-repo ADR-022E durable-store gate #8 (and related gates #10 / #12 / #20),
> **held**; Straylight-repo ADR-022D MVP-persistence / audit-owner invariants; ADR-026C /
> ADR-026D route guardrails; freeside-characters Phase 45J / PR #177 (Dixie v1
> mirror-refresh acceptance, merged 2026-06-06).
> **Status**: **docs / decision-only.** This gate adds **only this document**. It changes
> **no** route-vector JSON, **no** route-vector validator, **no** route-vector README, **no**
> Phase 33E fixture or fixture validator, and **no** runtime source, test, route, route
> handler, storage, store code, DB write, migration, auth, consent, package export, config,
> env, package, lockfile, CI, generated file, or binary. No adjacent repository
> (`loa-straylight`, `freeside-characters`) is touched.
> **This is a durable storage *shape* and route-vector *alignment* gate, not implementation.**
> It records, on paper, how the durable storage **shape** implied by the Phase 46E §6
> model-direction decision maps onto the existing five Admission Wedge route-contract
> vectors and their validator — which shape fields are conceptual / future-facing, which
> map to the current public route-response surface, and which durable/private fields must
> **never** appear on a public route response. It decides that this alignment is recorded
> **docs-only** — it **does not** modify vector JSON or the validator (§9). It does **not**
> implement storage, **not** author or apply a migration, **not** authorize DB writes,
> **not** clear the Straylight-repo ADR-022E durable-store gate #8, **not** change the route
> handler, **not** change auth, **not** implement consent, **not** authorize production
> admission, **not** freeze the route contract, and **not** freeze the final schema.

Every assessment below is grounded read-only against the actual Dixie repo (the Phase 46E
durable-storage-model decision, the Phase 46A / 46B / 46C / 46D gates, the Phase 33P / 33Q /
33R storage lane, the Phase 33U / 33V chain, the **five** route-vector JSONs, the
route-vector validator and its README, the Phase 33N spike source under
`app/src/services/admission-wedge-spike/`) and read-only against the **canonical** Straylight
(`@loa/straylight`) substrate (`storage/types.ts`, `types.ts`, and
`docs/decisions/ADR-022D…` / `ADR-022E…`). Where a claim could not be grounded in the read
material, it is marked as such.

---

## 1. Status and scope

Phase 46F is the bounded **durable storage shape and route-vector alignment gate** that
follows, and is named by, Phase 46E
([`ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md)
§9, PR #150). Phase 46E decided the durable storage **model direction** — current-state
projection + append-only, hash-chained audit log (Option 2), realized against the canonical
Straylight semantics / interfaces (Option 5) — and **explicitly left the storage *shape*
undecided**, selecting Phase 46F to "define and align the durable storage *shape* for the §6
model … and how that shape maps onto the existing route vectors, without implementing
storage, migrations, route writes, or production behavior" (46E §9). Phase 46F executes
exactly that charter and stops.

**Verdict.** Phase 46F:

- is **docs / decision-only** — its only output is this alignment/decision document;
- is **not a vector/validator mutation lane** — after grounding the mapping (§5–§10), it
  **records the alignment docs-only and changes no vector JSON and no validator** (§9). The
  durable storage shape already maps onto the existing vectors and validator with no change
  required, so changing them is neither necessary nor safe at this gate (§9);
- is **not storage implementation** — no durable store, schema, table, store code, or
  storage write is created;
- is **not migration authorization** — no migration is authored, applied, or authorized;
- is **not production admission** — the Phase 33N dev/operator-only, disabled-by-default
  spike remains the only authorized route surface;
- is **not a route-contract freeze** and **not a final schema freeze**.

Phase 46F additionally:

- **does not clear** the Straylight-repo ADR-022E durable-store gate #8 (or the related held
  gates #10 / #12 / #20) — aligning a shape onto vectors is not clearing a gate;
- **does not author a durable data model, schema, or migration** — it aligns the *shape* of
  the §6 model onto the existing vectors, leaving the data model, schema, and migration to a
  future, separately-gated lane;
- **does not freeze the physical durable adapter placement** (Dixie / Finn / sibling
  runtime), which Phase 46E left unresolved under ADR-022E gate #8;
- **does not implement auth or consent**, **does not change the route handler**, and **does
  not modify** runtime source, the route-vector JSONs, the route-vector validator, the
  route-vector README, the Phase 33E fixtures, the Phase 33E fixture validator, validators of
  any kind, vectors, package exports, config / env, CI, migrations, generated files,
  binaries, or any adjacent repository;
- **does not declare** production readiness of any kind.

> **A storage-shape *alignment* authorizes no runtime work.** Phase 46F records how the
> Phase 46E §6 model's durable shape maps onto the existing route-contract vectors and
> confirms the mapping needs no vector/validator change. The alignment is a recommendation
> recorded on paper, not a built store, a frozen schema, an applied migration, or a cleared
> gate. A later, separately-gated phase must still (a) author the durable data model /
> schema / migration plan, (b) clear ADR-022E gate #8 with a gate-clearing ADR that preserves
> the ADR-022D receipt/audit-chain invariants, and (c) only then authorize any build.

---

## 2. Source chain (evidence intake)

This gate sits one rung above the Phase 46E durable-storage-model decision on the Dixie
route-contract ladder. It introduces no new contract or vector material; it consumes the
Phase 46E §6 model-direction decision, the five existing route vectors and their validator,
the Phase 33N/33Q spike source, and the canonical Straylight substrate to record the
storage-shape ↔ vector mapping.

### 2.1 Dixie (loa-dixie) — the storage and route-contract lanes

| Phase | PR | Artifact / contribution (relevant to the storage-shape ↔ vector alignment) |
|-------|----|------|
| 33L | #130 | **Route-contract test-vector fixture draft.** Authored the five non-runtime route-contract vectors + validator under `docs/admission-wedge/route-contract-test-vectors/`; preserves the five Phase 33E scenarios (no sixth); carries the unresolved-review markers and storage/auth/consent draft assumptions. |
| 33N | #132 | **Dev/operator-only route spike.** `POST /api/admission/intake`, disabled-by-default, **Storage Option A** (no durable store, no DB writes, no migrations). Public response built **purely from the classification** (`public-response.ts:95-116`), never request-controlled material; runtime no-leak guard mirrors the validator denylist (`no-leak.ts:22-76`, `:151-182`). |
| 33P | #134 | **Storage / receipt hardening decision.** Selected Option B (synthetic store), rejected Option D (production-like durable storage); named the validator's `FORBIDDEN_PUBLIC_KEYS` / denylist as the boundary a store-backed projection must satisfy. |
| 33Q | #135 | **Bounded synthetic admitted-assertion ledger.** Models the §6 conceptual shape in synthetic form: `RecallProjection.includes` = active + recall-eligible ids, `excludes` = superseded (audit/provenance-only) ids (`admitted-assertion-ledger.ts:172-182`, `:957-973`); supersession flips the prior to `assertion_status: 'superseded'` / `recall_eligible: false` (`:880-887`); `SyntheticAuditRecord` is `audit_private: true` / `public_audit_detail: false` (`:119-130`). Opens no DB / file / socket / timer (`:28-32`). |
| 33R | #136 | **Bounded-ledger acceptance.** Accepted Phase 33Q only as a bounded, non-production, test-seam-only synthetic proof. |
| 33U | #139 | **Straylight-response intake.** Reconciled PR #65 A–O verdicts. Rows **F / G / J / O** held. Row B: `admitted` is a public `outcome_class`, never a status; canonical `active` `Assertion` is Straylight's; Dixie holds **ingress refs only**. ADR-022E gates #8 / #10 / #12 / #20 held. |
| 33V | #140 | **Storage/auth/consent design finalization.** Split `SyntheticAuditRecord` → `AuditEvent` + `TransitionReceipt`; adopted `public_receipt_ref`, retired `receipt_public_ref`; drew the private/public projection boundary on `privacy_scope` + frame disposition; kept migration/backfill/rollback **undesigned**. |
| 33W–33Z | #141–#144 | **Route-contract readiness/revision/vector alignment.** Standardized `public_receipt_ref` (`null` where none minted); pinned the source-real refusal taxonomy; aligned the five vectors + validator (`--self-check` negative-mutation harness); `route_contract_final: false`. |
| 33Z (corr.) | #145 | **Next-lane label/provenance correction** (34A → 46A). |
| 46A | #146 | **Route-vector alignment acceptance.** Accepted the 33Z alignment as bounded, non-runtime vector/validator alignment. |
| 46B | #147 | **Route-contract implementation-readiness decomposition.** Judged the storage/auth/consent cluster the upstream dependency. |
| 46C | #148 | **Storage/auth/consent blocker decomposition.** Decomposed the held storage / auth / consent / shared public-private blockers into ordered, separately-clearable sub-gates. |
| 46D | #149 | **Storage/auth/consent acceptance.** Ranked the candidate next lanes; selected Phase 46E (durable storage model decision) as the deepest-blocker per-area gate. |
| 46E | #150 | **Durable storage model decision.** Selected the §6 model direction (current-state projection + append-only hash-chained audit log on the canonical Straylight semantics/interfaces); left the storage **shape** undecided; **selected this Phase 46F storage-shape / vector-alignment gate** (§9), with the auth / identity / signer gate sequenced downstream (§10 step 3). |
| **46F** | *(this doc)* | **Durable storage shape & route-vector alignment gate.** Records the source chain (§2) and accepted facts (§3); states the §6 durable storage shape (§4); maps each shape field onto the existing route vectors (§5); classifies conceptual-only vs current-public vs never-public fields (§6); fixes that `recall_eligible` stays derived, never persisted authority (§7); relates the Dixie-local supersession fields to canonical Straylight vocabulary (§8); **decides the alignment is recorded docs-only with no vector/validator change** (§9); records what is already a non-runtime vector/validator constraint (§10) and what remains future implementation work (§11); restates the required invariants (§12) and the exit criteria (§13); selects the next lane and updates the ordering (§14); preserves the blocked lanes (§15). Mutates **no** vector / validator / fixture / source. |

> **PR-number provenance note.** The PR numbers above are taken from the local git
> merge-commit history (`docs: … (#NNN)` subjects) and the Phase 46A–46E source-chain tables.
> Phase 46E's `#150` is the merge commit `9cd7c8d4 "docs: add Admission Wedge durable storage
> model gate (#150)"`. Treat the PR numbers as git-sourced rather than as authority embedded
> in the gate bodies (each gate refers to itself only as "this doc").

### 2.2 Canonical Straylight substrate (`@loa/straylight`) — read-only

The §6 model's durable shape is **canonical Straylight semantics**, read-only here to ground
the shape ↔ vector mapping. The adjacent `loa-straylight` repo is the canonical evidence
(Dixie's `bounded-estate-store.ts` mirror is parity evidence only, never canonical proof —
46E §2.2).

- **Assertions are current-state (mutable upsert); transitions and audit events are
  append-only and hash-chained.** The `StorageAdapter` interface declares
  `upsertAssertion` / `getAssertion` / `listAssertions` for assertions ("mutable: status
  changes write a new version", `loa-straylight/src/straylight/storage/types.ts:46-49`),
  `appendTransition` / `listTransitions` for append-only transitions (`:51-53`),
  `upsertTransitionReceipt` / `getTransitionReceipt` / `listTransitionReceipts` for
  append-only transition receipts (`:59-62`), and `appendAuditEvent` / `listAuditEvents` /
  `getAuditTail` for append-only, **hash-chained-per-estate** audit events (`:64-67`). The MVP
  semantics block states assertions/receipts use upsert (latest write wins), transitions and
  audit events are append-only and immutable once written, and audit events are hash-chained
  per estate (`storage/types.ts:6-13`). **This is exactly the §6 shape:** a current-state
  projection (assertions) plus an append-only, tamper-evident audit log (transitions + audit
  events).
- **Canonical `Assertion`, `TransitionReceipt`, `AuditEvent` are distinct Straylight-owned
  primitives.** `Assertion` carries `status` (incl. `active` / `superseded`), `supersedes_refs`,
  `linked_assertion_refs`, `privacy_scope`, and `recall_scope`
  (`loa-straylight/src/straylight/types.ts:145-167`). `TransitionReceipt` is a first-class
  discriminated type (`kind` ∈ `admission` / `denied` / `challenge` / `revocation` / `forget`),
  carrying `transition_id`, `audit_event_ref`, `signer_refs`, `reasons`, `metadata`, and
  `receipt_hash` (`types.ts:364-388`). `AuditEvent` carries `previous_audit_hash` +
  `audit_hash` (the per-estate hash chain) plus `transition_id` / `assertion_refs` /
  `signer_refs` (`types.ts:514-529`).
- **Straylight-repo ADR-022E durable-store gate #8 is held.** "Production database /
  persistence substrate" is gate #8: `InMemoryStorage` and `JsonlStorage` are the MVP
  adapters, and **a separate ADR** must propose the production adapter and **preserve the
  ADR-022D receipt and audit-chain invariants**
  (`loa-straylight/docs/decisions/ADR-022E-phase-22-deferred-features.md:57`). ADR-022D names
  `InMemoryStorage` (default) and append-only `JsonlStorage` as the MVP persistence options,
  defers a future Postgres / sibling-runtime substrate to a separate ADR, and makes tampered
  audit chains detectable via `verifyChain`
  (`loa-straylight/docs/decisions/ADR-022D-mvp-persistence-and-audit-owner.md:75-80`, `:120`).
  PR #65 cleared none of these gates.

### 2.3 Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts, reconciled by 33U.** PR #65
  clarified the *vocabulary / design* only; it cleared **no** independent production gate and
  authorized **no** Dixie runtime, production storage / auth / consent, or Freeside
  integration. The still-held rows that gate this storage-shape alignment are **F, G, J, and
  O** (33U §4.1); the shape-relevant unresolved review rows carried on every vector are
  **E, G, H, K, N, O** (recall-eligibility representation; tenant/estate/actor binding;
  receipt/audit relationship; public/private projection boundary; corrected-active
  status-vs-relation; storage/audit primitive boundary) and the review-dependent row **J**
  (idempotency).
- **Residual legacy marker prose.** The `[E,G,H,K,N,O]` / `[J]` marker arrays in the vector
  JSONs and the spike classifier comments (`classifier.ts:73-74`) are **preserved legacy
  vector/runtime markers, not the current review-state authority**; the authoritative
  classification lives in the route-vector README current-state correction
  ([`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  §7). Phase 46F preserves that distinction and mutates no technical artifact.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the freeside-characters
> 34-/45-series, and Straylight's ADR / PR labels are independent labels in separate
> repositories and must not be conflated. `46F` signals **no** new product epoch and **no**
> scope expansion — it is the same Admission Wedge arc, still docs/decision-only.

---

## 3. Starting accepted facts

These are facts **already accepted** by the chain (46E §3 / §6), re-verified read-only here as
the baseline the §4–§9 alignment is measured against. None is changed by this gate.

1. **The Phase 46E §6 model direction is decided; the storage shape is not.** Phase 46E
   selected current-state projection + append-only hash-chained audit log realized on the
   canonical Straylight semantics/interfaces, with the Dixie/Straylight ownership split, as a
   *direction* that remains a future implementation gate (46E §6); it explicitly left the
   storage *shape* to Phase 46F (46E §9).
2. **There are exactly five route-contract vectors and one validator; both are green and
   non-runtime.** The validator requires exactly the five scenarios and rejects a sixth
   (`validate-route-contract-test-vectors.mjs:98-104`, `:683-687`); it imports nothing from
   `app/`, Straylight, or the fixture validator and touches no DB / network / storage / env
   (README §10). All five vectors validate, the no-sixth check passes, and the `--self-check`
   negative-mutation harness reports 5/5 fail-closed (§17).
3. **The public surface already carries exactly the §6 model's public projection.** Each
   vector's `expected_public_response` carries an `outcome_class`, a status **class** label
   where applicable (`admitted_assertion_status_class` / `active_assertion_status_class` =
   `active`; `candidate_state_class` = `proposed`), `public_receipt_ref` (a public-safe DRAFT
   string where a receipt is minted, `null` where none), `recall_eligible`, a
   `recall_use_instruction_public_signal` (where applicable), `safe_reason_code`, and
   `rendered_candidate_payload: false`. The Phase 33N spike builds a **related fixed public
   response projection — not byte-identical to the vector envelope** — purely from the
   classification (`public-response.ts:32-57`, `:95-116`, `public_receipt_ref` at `:44` /
   `:104`). The runtime public-response projection and the route-vector envelope shape are
   **distinct**: the vectors carry status-**class** labels
   (`admitted_assertion_status_class` / `active_assertion_status_class`) and a
   `recall_use_instruction_public_signal`, whereas the runtime builder
   (`AdmissionSpikePublicResponse`) adds `spike`, `scenario_id`, a nested `recall_projection`,
   and a nested `draft_markers` block (`public-response.ts:32-57`). Both surfaces remain
   **fixed and narrow**, built purely from the classification, and **neither emits the
   canonical `supersedes_refs` / `linked_assertion_refs` ref arrays** (§8, §9 point 4).
4. **The current `FORBIDDEN_PUBLIC_KEYS` set is enforced on the public surface; it is not a
   complete denylist of every future canonical durable/private key.** The validator's
   `FORBIDDEN_PUBLIC_KEYS` rejects — as object keys on the public surface at any depth — the
   private `TransitionReceipt` / `AuditEvent` / receipt / signer / metadata / idempotency /
   assertion-and-transition-id / **Dixie-local** supersession-id-pair
   (`supersedes_assertion_id` / `superseded_by_assertion_id`) / candidate-payload /
   tenant-estate-actor families (`validate-route-contract-test-vectors.mjs:236-328`, esp.
   `:267-294`); the runtime spike mirrors this set (`no-leak.ts:22-76`, `:151-182`). This
   enforces the public/private boundary for **the five current Admission Wedge scenarios**
   using the **existing** forbidden-key set; it does **not** yet denylist every possible future
   canonical durable/private key. In particular the **canonical** Straylight ref arrays
   `supersedes_refs` / `linked_assertion_refs` are **absent** from `FORBIDDEN_PUBLIC_KEYS`
   (`:236-328`), so the current validator would not reject them on a public response — but the
   present fixed public-response builder does not emit them, so there is no current leak path
   (§6, §8, §9 point 4). The public-surface walk **excludes** the private
   `expected_private_or_audit_effect` block and the `must_not_include` denylist
   (`validate-route-contract-test-vectors.mjs:375-383`), so a key like `audit_event_class` is
   legitimate in the private block and forbidden on the public surface.
5. **The private/durable side of the shape already lives in the vectors as draft *intent*.**
   Each vector's `expected_private_or_audit_effect` carries `effect_class`,
   `storage_write_intent: "draft_expected_future_effect_not_performed"`,
   `audit_record_intent: "draft_…_not_performed"`,
   `private_fields_allowed_only_in_audit: true`, and scenario-specific
   `audit_event_class` / `candidate_to_transition_to_assertion_chain_intent` /
   `superseded_prior_retained_audit_provenance_only` / `no_admitted_assertion` /
   `must_fail_closed` markers — every one an **expected future effect, not performed**. These
   markers are **vector-side intent / evidence** only: the validator does **not** validate the
   contents of `expected_private_or_audit_effect` (it is referenced nowhere in
   `collectVectorFailures`), so deleting that block does not currently fail validation. Phase
   46F relies on it as **documentation evidence**, not as an executable, validator-enforced
   public-response constraint (§10).
6. **Straylight owns the canonical durable substrate; Dixie holds ingress references only.**
   The canonical `active` `Assertion`, the first-class `TransitionReceipt`, and the
   append-only hash-chained `AuditEvent` are Straylight primitives (§2.2); Dixie owns the
   endpoint-local contract / idempotency / replay records, ingress references, and the
   public/private response projection (46E §6).
7. **ADR-022E gate #8 is held and the synthetic ledger does not satisfy it.** No durable
   Dixie admission store, schema, table, or migration exists; the Phase 33Q ledger is
   synthetic, process-local, and non-durable (`admitted-assertion-ledger.ts:28-32`); the
   final identity binding, idempotency, signer/authority, schema, and receipt semantics
   remain explicitly unresolved (rows F / G / J / O; 33U §4.1).

> **What "accepted facts" do and do not mean.** These are **spike-posture, synthetic-ledger,
> design-vocabulary, and vector-surface** facts. They do not constitute a durable store, a
> frozen schema, a runtime production serializer, or any cleared production gate. The §4–§9
> alignment exists precisely because the accepted readiness is bounded to the
> dev/spike/synthetic surface and the vectors are non-runtime drafts.

---

## 4. The durable storage shape (from the Phase 46E §6 model)

The Phase 46E §6 decision selected a **model direction** but not its **shape**. The shape —
the set of records the §6 model implies, classified by *persisted vs derived vs projected* and
by *public vs private* — is stated here so §5 can map it onto the vectors. **Stating the shape
is not authoring a schema:** there are no field types, keys, indexes, or table definitions
here; those remain the future durable-store design gate's output (§13).

The §6 model implies three storage-shape layers:

**(a) Durable, canonical, Straylight-owned (persisted; mostly append-only).**

- **Admitted assertion (current state).** The canonical `active` `Assertion` and its `status`
  transitions, persisted via the mutable-upsert assertion surface (current-state projection;
  `storage/types.ts:46-49`, `types.ts:145-167`). Dixie holds an **ingress reference** onto it,
  not a parallel canonical copy (33U Row B).
- **Transition history (append-only).** `EstateTransition` records, append-only
  (`storage/types.ts:51-53`).
- **Transition receipts (append-only, private).** The first-class `TransitionReceipt`
  (`kind` ∈ admission / denied / challenge / revocation / forget), private, carrying
  `transition_id` / `audit_event_ref` / `signer_refs` / `receipt_hash`
  (`types.ts:364-388`; `storage/types.ts:59-62`).
- **Audit events (append-only, hash-chained, private).** `AuditEvent` with
  `previous_audit_hash` + `audit_hash` per-estate chain (`types.ts:514-529`;
  `storage/types.ts:64-67`), tamper-detectable via `verifyChain` (ADR-022D `:120`).
- **Supersession / correction relations.** Canonical `Assertion.supersedes_refs` /
  `linked_assertion_refs` (`types.ts:157`, `:156`), with the prior assertion's `status`
  flipped to `superseded`.

**(b) Dixie-owned (persisted or endpoint-local; route-contract-bound).**

- **Candidate / ingress record.** A private/admission-bound candidate ingress object — the
  candidate is **not** an admitted assertion (Row B). Whether Dixie persists it durably is a
  future durable-store decision (46E §4 item 1 / item 2).
- **Idempotency / replay record.** Endpoint/Dixie-owned (absent from Straylight); the final
  key, replay envelope, conflict response, and durable backing are unresolved
  (`idempotency_final: false`; 33U Row J; 46E §4 item 8).
- **Public-safe receipt reference.** `public_receipt_ref` — the **single** public-safe
  reference, minted as a fixed synthetic placeholder in the spike, `null` where none
  (`public-response.ts:24`, `:44`, `:104`). Its durable mint/resolution without operational-id
  leakage is a future decision (46E §4 item 12).
- **Public/private response projection + no-leak serializer.** Dixie-owned (46E §6).

**(c) Derived at read time (projected; never persisted as authority).**

- **Recall-included current-state set.** active + recall-eligible ⇒ includes; superseded ⇒
  excludes — a derived, invalidatable, request/context-dependent **cache**, never canonical
  authority (46E §6; §7 below). The Phase 33Q ledger sketches this in synthetic form
  (`admitted-assertion-ledger.ts:957-973`).
- **`recall_eligible`.** A lossy, per-request projection over the durable inputs (assertion
  status, transition history, relationships) — **derived, never persisted as canonical
  authority** (§7).

> **The shape is a description, not a schema.** Layers (a)–(c) name *which records exist and
> whether they are persisted, owned by Dixie, or derived* — they do **not** define field
> types, keys, indexes, table layouts, or a migration. Authoring those is the future
> durable-store design gate's job (§13), gated behind ADR-022E gate #8.

---

## 5. Storage-shape ↔ route-vector field mapping

This is the core deliverable: how each storage-shape element (§4) maps onto the existing five
route vectors and their validator. The mapping is recorded read-only — **no vector or
validator is changed** (§9).

The vector surface has three relevant regions, with sharply different no-leak treatment:

- **Public surface** — `request_vector` + `expected_public_response` (minus its
  `must_not_include` denylist) + `expected_recall_projection`. Deep-walked by the validator;
  must carry no leak-shaped material (`validate-route-contract-test-vectors.mjs:375-408`).
- **Private/audit intent** — `expected_private_or_audit_effect`. **Excluded** from the
  public-surface walk (`:380-383`); legitimately carries private draft *intent* markers (e.g.
  `audit_event_class`).
- **Denylist + assertions** — `expected_public_response.must_not_include` and
  `no_leak_assertions`. Name the forbidden categories and assert the negatives; the denylist
  subtree is skipped by the leak walk (`:377`).

### 5.1 Per-element mapping

| Storage-shape element (§4) | Layer | Where it maps on the vectors | Vector evidence |
|---|---|---|---|
| **Candidate / ingress record** | (b) Dixie | Private intent only. Never on the public surface. Public response carries the **outcome class**, not the candidate. | pending: `expected_private_or_audit_effect.effect_class = "candidate_intake_record_intent_no_transition_no_assertion_draft"`; `request_vector.candidate_envelope_class` is a class label, not payload; `candidate_payload` / `raw_candidate_payload` forbidden public keys (`:247`, `:304`). |
| **Admitted assertion (current state)** | (a) canonical | Public: the **status class** `active` (a label), via `admitted_assertion_status_class` (accept) / `active_assertion_status_class` (supersede). Private intent: the admit chain. The canonical `Assertion` itself is Straylight's; Dixie references it. | accept `expected_public_response.admitted_assertion_status_class = "active"`; `expected_private_or_audit_effect.candidate_to_transition_to_assertion_chain_intent = true`. `admitted_assertion_id` is a forbidden public key (`:300`). |
| **Transition history** | (a) canonical | Private intent only. The `transition_intent` on the public `request_vector` is a **draft class label**, not a stored transition id. | `request_vector.transition_intent` (e.g. `"admit_assertion_accept_draft"`); `transition_id` / `admission_transition_id` forbidden public keys (`:271`, `:299`). |
| **Transition receipt references** | (a) canonical, private | Private only. Only the public-safe `public_receipt_ref` may surface; the private `TransitionReceipt` never. | `transition_receipt` / `transition_receipt_ref` / `receipt_ref` / `private_receipt_ref` / `receipt_id` forbidden public keys (`:267-283`); self-check proves `transition_receipt` and `receipt_ref` on the public surface fail closed (`:797-819`). |
| **Audit event references** | (a) canonical, private | Private intent: `audit_event_class` lives **only** in `expected_private_or_audit_effect`. Never public. | accept/reject `expected_private_or_audit_effect.audit_event_class` (e.g. `"assertion_admitted_draft"` / `"transition_denied_draft"`); `audit_event` / `audit_event_class` / `audit_ref` / `audit_id` forbidden public keys (`:273-279`); self-check proves `audit_event_class` on the public surface fails closed (`:804-811`). |
| **Replay / idempotency backing** | (b) Dixie | Public: encoded **only** as the prose `idempotency_expectation` string (no public code, no key). The idempotency key never surfaces. | every vector's `idempotency_expectation` (prose); `idempotency_key` / `idempotency_key_draft` forbidden public keys (`:295-296`); `request_vector.idempotency_key_policy` is a draft policy label, not a key. |
| **Public receipt refs** | (b) Dixie, public-safe | Public: `expected_public_response.public_receipt_ref` — a public-safe DRAFT string where minted (accept / reject / supersede) or `null` where not (pending / malformed). Validator enforces string-or-null + draft shape + no retired token. | accept/reject/supersede `public_receipt_ref = "public_safe_receipt_reference_draft"`; pending/malformed `= null`; enforced at `:540-566`; retired `public_receipt_ref_policy` / `receipt_public_ref` rejected at any depth (`:441-449`, `:544-548`). |
| **Tenant / estate / actor scope** | (a)/(b) | Never public. A **spike isolation** mechanism in the ledger; the production binding is unresolved (Row G). | `tenant_id` / `estate_id` / `*_actor_id` / `operational_tenant_estate_actor_ids` forbidden public keys (`:237-246`, `:313`); `no_leak_assertions.public_response_contains_operational_ids = false`. |
| **Supersession / correction relations** | (a) canonical | Public: only the **outcome class** `superseded_with_correction` and the recall projection (corrected active included; superseded prior excluded). Private intent: provenance retention. Dixie-local id fields never public (§8). | supersede `outcome_class`; `expected_recall_projection.ordinary_recall_includes`/`_excludes` (placeholders); `expected_private_or_audit_effect.superseded_prior_retained_audit_provenance_only = true`; `supersedes_assertion_id` / `superseded_by_assertion_id` forbidden public keys (`:301-302`). |
| **Rejection / denial records** | (a)/(b), private | Public: outcome class `denied` + the source-real `safe_reason_code` `admission_transition_denied_draft_non_final`; **no admitted assertion**. Private intent: the denial receipt/audit. | reject `outcome_class = "denied"`, `safe_reason_code` enforced exactly (`:150-156`, `:583-590`); `expected_private_or_audit_effect.no_admitted_assertion = true`, `audit_event_class = "transition_denied_draft"`. |
| **Recall-included current-state set** | (c) derived | Public: the recall projection arrays carry **synthetic placeholders only**; the durable derivation is not represented. | `expected_recall_projection.ordinary_recall_includes`/`_excludes` (e.g. `"admitted_active_assertion_draft_placeholder"`); supersede arity enforced (`:640-647`); empty for pending/reject/malformed (`:630-639`). |
| **`recall_eligible`** | (c) derived | Public: a boolean **derived signal** + a `recall_use_instruction_public_signal` / `_policy` marked `review_dependent` — never a persisted canonical authority field (§7). | accept/supersede `recall_eligible = true`; pending/reject/malformed `= false`; `recall_use_instruction_*` carries `…review_dependent`; Row E (recall-eligibility representation) is in the unresolved set. |

### 5.2 What the mapping shows

- **Every storage-shape field the §6 model marks *public* is already present on the vector
  public surface**, in the public-safe class/label/projection form (outcome class, status
  **class**, `public_receipt_ref` or `null`, `safe_reason_code`, recall projection
  placeholders, derived `recall_eligible`).
- **Every storage-shape field the five current scenarios exercise on the *durable/private*
  side is already either** (a) present in the **excluded** `expected_private_or_audit_effect`
  block as a draft *intent* (`storage_write_intent` / `audit_record_intent` /
  `audit_event_class` / `candidate_to_transition_to_assertion_chain_intent` /
  `superseded_prior_retained_audit_provenance_only` / `no_admitted_assertion`), or (b)
  **forbidden on the public surface** by `FORBIDDEN_PUBLIC_KEYS` at any depth — with the
  bounded exception that the **canonical** Straylight ref arrays `supersedes_refs` /
  `linked_assertion_refs` are **not** in the current `FORBIDDEN_PUBLIC_KEYS` set (only the
  Dixie-local id pair `supersedes_assertion_id` / `superseded_by_assertion_id` is). This is a
  **known validator-hardening gap**, not a current leak: the present fixed public-response
  builder emits neither canonical ref array (§8, §9 point 4). The current set therefore
  enforces the public/private boundary for the five scenarios; it is **not** a complete
  denylist of every future canonical durable/private key.
- **The append-only / hash-chained audit half of the §6 model** has no public projection at
  all — exactly as the vectors encode it (audit material is private-intent-only and forbidden
  public), consistent with the canonical hash-chained `AuditEvent` substrate (§2.2).

The mapping therefore aligns **without modifying any vector or the validator** (§9): the five
current vectors represent the public/private boundary for the five Admission Wedge scenarios,
and the current validator enforces the existing forbidden-key set. It does **not** yet denylist
every possible future canonical durable/private key (the `supersedes_refs` /
`linked_assertion_refs` gap above), which is recorded as future hardening (§9 point 4, §11).

---

## 6. Conceptual / future-facing vs current-public vs never-public classification

The charter requires Phase 46F to clarify which durable storage shape fields are (a) only
conceptual / future-facing, (b) map to current public route response vectors, and (c) must
never appear in public route responses. Drawn from §4–§5:

**(a) Conceptual / future-facing only — represented today only as draft *intent* or unresolved
markers, never as a built/persisted field.**

- Candidate durable persistence vs ingress-reference-only (46E §4 item 1 / item 2).
- The durable home of the private `TransitionReceipt` and the append-only `AuditEvent`
  persistence + retention model (46E §4 items 3 / 4).
- The idempotency/replay key, envelope, conflict response, and durable backing (Row J).
- The production tenant / estate / actor partitioning + cross-tenant guarantee (Row G).
- The signer / authority references persisted and verified at admission (Row F).
- The auth-decision and consent references persisted privately (46E §4 item 11).
- The durable mint / resolution of `public_receipt_ref` (46E §4 item 12).
- Rollback / partial-failure / migration / backfill model (46E §4 items 14 / 15).
- Retention / forget / revoke / correction against the append-only chain (46E §4 item 16;
  MVP-3-adjacent, **not implemented here**).

These appear in the vectors **only** as `*_intent: "draft_…_not_performed"` markers, the
`draft_non_implemented` storage/auth/consent assumptions, and the unresolved-review rows
`[E,G,H,K,N,O]` / `[J]` — never as a concrete, frozen, or persisted value.

**(b) Maps to a current public route-response vector field — present today, public-safe.**

- `outcome_class` (the five outcome classes).
- Status **class** labels: `admitted_assertion_status_class` / `active_assertion_status_class`
  = `active`; `candidate_state_class` = `proposed`.
- `public_receipt_ref` (public-safe DRAFT string, or `null`).
- `safe_reason_code` (source-real `ingress.invalid_request` / `admission_transition_denied_draft_non_final` / `null`).
- `recall_eligible` (derived boolean) and `recall_use_instruction_public_signal` / the recall
  projection placeholders.
- `rendered_candidate_payload: false` (the negative assertion).

**(c) Durable/private fields that must NEVER appear in a public route response** — forbidden by
`FORBIDDEN_PUBLIC_KEYS` at any depth (`validate-route-contract-test-vectors.mjs:236-328`),
mirrored in runtime (`no-leak.ts:22-76`):

- Private `TransitionReceipt` / `AuditEvent` shapes: `transition_receipt(_ref)`,
  `transition_id`, `audit_event(_class)`, `audit_ref`, `audit_id`, `receipt_ref`,
  `private_receipt_ref`, `receipt_id`, `audit_receipt_ref` (snake **and** camelCase).
- Signer / authority / policy material: `signer`, `signature`, `signature_material`,
  `authority_signature(_material)`, `authority_signer_type_draft`, `authority_scope_draft`,
  `policy_details`, `policy_reason`, `private_reason_family`.
- Operational identity: `tenant_id`, `estate_id`, `*_actor_id`,
  `operational_tenant_estate_actor_ids`, `candidate_id`, `source_candidate_id`,
  `prior_assertion_id`, `admitted_assertion_id`, `admission_transition_id`,
  `supersedes_assertion_id`, `superseded_by_assertion_id`.
- Raw material: `candidate_payload`, `corrected_candidate_payload`, `raw_candidate_payload(s)`,
  `source_material(s)`, `source_ref`, `source_kind`, `raw_reason(s)`, `metadata`.
- Backing / secrets: `idempotency_key(_draft)`, `tokens`/`token`, `secrets`/`secret`,
  `urls`/`url`, `stack_trace(s)`, `storage_internal(s)`, the retired
  `receipt_public_ref` / `public_receipt_ref_policy`.

> The single field that legitimately **crosses** from the durable/private side to the public
> side is `public_receipt_ref` (or its `null`) — and only because it is a public-safe,
> non-operational, draft reference, not a private receipt id. Every other durable/private
> field is classification-(c): never public.

---

## 7. `recall_eligible` remains derived / request-context-dependent — never persisted authority

The charter requires Phase 46F to fix *why* `recall_eligible` must remain
derived/request-context-dependent and must not become persisted canonical authority. This is a
required alignment invariant carried from 46E §6 and 33U.

- **It is a lossy, per-request projection, not a stored fact.** Dixie's boolean
  `recall_eligible` collapses a multi-input disposition (assertion status, transition history,
  relationships, request filters, privacy frame, risk) into one bit. Real recall disposition
  depends on the **request context** (filters, `EnvironmentFrame`, risk), so the same durable
  state can yield different recall outcomes for different requests (46E §4 item 5 / §6; 33U).
- **The durable inputs are persisted; the eligibility is derived from them at read time.** The
  §6 model persists assertion `status`, transition history, and relationships; the
  recall-included set (active + recall-eligible ⇒ includes; superseded ⇒ excludes) is a
  **derived, invalidatable, request/context-dependent cache**, never the authority (46E §6).
  The Phase 33Q ledger demonstrates the derivation, not a stored flag: `projectRecallInternal`
  recomputes includes/excludes from `assertion_status === 'active' && recall_eligible` on every
  call and returns freshly-built frozen arrays (`admitted-assertion-ledger.ts:957-973`).
- **Persisting it as canonical authority would be a correctness hazard.** A stored
  `recall_eligible` bit would (a) drift from the assertion `status` it is derived from,
  becoming a second, conflicting source of truth; (b) bake one request context's answer into
  durable state, defeating per-request privacy/risk filtering; and (c) risk leaking a recall
  decision that should be recomputed under the caller's frame. The canonical substrate models
  recall via `Assertion.recall_scope` + status, not a persisted eligibility bit
  (`types.ts:150`, `:163`).
- **The vectors already encode this correctly.** `recall_eligible` appears as a public
  **derived signal** alongside `recall_use_instruction_public_signal` /
  `recall_use_instruction_policy` marked `…review_dependent`; recall-eligibility
  *representation* is the unresolved review row **E**. No vector treats `recall_eligible` as a
  frozen or persisted authority field, and **Phase 46F adds none.**

---

## 8. Dixie-local supersession fields vs canonical Straylight vocabulary

The charter requires Phase 46F to relate the Dixie-local supersession fields to canonical
Straylight vocabulary **without renaming the local fields**.

- **The local fields are spike-internal, not the public or canonical surface.** The Phase 33Q
  ledger links a correction with the **Dixie-local** `supersedes_assertion_id` (on the
  corrected assertion) and `superseded_by_assertion_id` (on the prior), flipping the prior to
  `assertion_status: 'superseded'` / `recall_eligible: false`
  (`admitted-assertion-ledger.ts:100-105`, `:876-887`). These are internal synthetic-ledger
  fields; both are **forbidden public keys** on the vector public surface
  (`validate-route-contract-test-vectors.mjs:301-302`) and never serialized publicly.
- **The canonical vocabulary is a single ref array on the assertion.** Straylight models
  supersession with `Assertion.supersedes_refs` (and `linked_assertion_refs`) plus the prior's
  `status` flip to `superseded` (`types.ts:157`, `:156`, `:150`). The canonical model carries
  the relation as **refs on the corrected (active) assertion**, not as a pair of bidirectional
  id fields.
- **The current validator denylists the Dixie-local id pair, not the canonical ref arrays.**
  `FORBIDDEN_PUBLIC_KEYS` forbids the Dixie-local `supersedes_assertion_id` /
  `superseded_by_assertion_id` on the public surface
  (`validate-route-contract-test-vectors.mjs:301-302`) but does **not** denylist the canonical
  `supersedes_refs` / `linked_assertion_refs` (absent from `:236-328`). That asymmetry is a
  **known hardening gap, not a current leak**: the fixed public-response builder
  (`public-response.ts`, `buildAdmissionSpikePublicResponse`) emits neither canonical ref array,
  so no present serializer path can surface them. A future durable-store / validator-hardening
  lane that begins emitting canonical refs internally would add the matching forbidden-key
  hardening (§9 point 4, §11, §13 criterion 8); Phase 46F records the gap and adds nothing.
- **The relationship, recorded for the future durable-store lane (no rename here).** A future
  durable-store mapping carries the Dixie-local pair onto the canonical `supersedes_refs`
  vocabulary: `corrected.supersedes_assertion_id` → an entry in
  `corrected.supersedes_refs`; the prior's `superseded_by_assertion_id` →
  derivable canonically from the corrected assertion's `supersedes_refs` plus the prior's
  `status: 'superseded'`. **Phase 46F renames nothing** — the local fields keep their names,
  the canonical field keeps its name, and the mapping is recorded as future work. The
  corrected-active *status-vs-relation* question (a coined `corrected_active` status is
  **rejected**; correction is the `(superseded, active)` relation) is the unresolved review row
  **N**, preserved as a marker on the supersede vector and **not** resolved here.

---

## 9. The docs-only vs vector/validator-change decision

Phase 46F's charter asks it to decide whether to modify route-contract vector JSON or the
validator, and to prefer docs-only if the alignment can be recorded without changing vector
JSON yet.

> **Decision: record the storage-shape ↔ vector alignment DOCS-ONLY. Phase 46F changes no
> vector JSON and no validator.**

**Why docs-only is sufficient (and the safe choice):**

1. **The mapping covers the five current scenarios (§5).** Every §6 storage-shape field that
   is public for the five Admission Wedge scenarios is already on the vector public surface;
   every durable/private field those scenarios exercise is already either a draft *intent* in
   the (validator-unenforced) `expected_private_or_audit_effect` block or a
   `FORBIDDEN_PUBLIC_KEYS` entry — with the bounded, documented exception of the canonical
   `supersedes_refs` / `linked_assertion_refs` ref arrays, which the current validator does
   **not** denylist (point 4). For the five current scenarios there is **no missing public
   field** to add and **no misplaced field** to move on the public surface, and the present
   fixed public-response builder emits no durable/private field; recording the alignment
   therefore requires only this document. This is **not** a claim that the validator is a
   complete denylist for every future canonical durable/private key — it is not (point 4, §11).
2. **Adding a durable-shape field to the public surface would risk a no-leak regression.** The
   whole point of the durable/private shape is that those fields stay **off** the public
   surface. Putting any durable-shape field onto the public surface — even a synthetic
   placeholder — would weaken the no-leak guarantee the vectors exist to prove. The current
   design posture for a durable/private field is therefore its **absence** from the public
   surface; for the **currently denylisted** keys, that absence is additionally backed by their
   presence in `FORBIDDEN_PUBLIC_KEYS`. That combination — public absence plus
   `FORBIDDEN_PUBLIC_KEYS` enforcement — is the current state **only for the existing
   forbidden-key set**; it is **not** yet the state for the canonical ref arrays
   `supersedes_refs` / `linked_assertion_refs`, which are public-absent (the fixed builder does
   not emit them) but **not** yet denylisted (point 4). Future validator hardening that added
   those keys would **strengthen** — never weaken — the no-leak protection; Phase 46F is not
   adding it because this slice is docs-only and the fixed serializer does not currently emit
   those fields (point 4, §8, §11).
3. **No sixth vector is justified.** The five vectors already cover the five admission
   scenarios (pending / accept / reject / supersede / malformed), and each already exercises
   the full public/private boundary for its storage-shape elements (§5). The storage **shape**
   introduces **no sixth scenario** — it is a *cross-cutting* property of the existing five,
   not a new outcome. The validator's no-sixth-vector check
   (`validate-route-contract-test-vectors.mjs:683-687`) and the strong precedent of exactly
   five vectors therefore stand unchanged; nothing here justifies expansion.
4. **The validator enforces the existing forbidden-key set for the five scenarios — but it is
   not complete for every future canonical durable/private key.** `FORBIDDEN_PUBLIC_KEYS`
   covers the private `TransitionReceipt` / `AuditEvent` / receipt / signer / metadata /
   idempotency / id / **Dixie-local** supersession-id-pair / candidate / tenant-estate-actor
   families (`:236-328`); the opaque-run / UUID / substring / regex walks catch real
   operational material of any novel shape (`:195-223`, `:418-431`); the `--self-check` harness
   proves the validator's **known negative mutations** fail closed (`:777-820`). The five
   self-check cases cover exactly that tested mutation set — three currently denylisted private
   receipt/audit keys on the public surface (`transition_receipt`, `audit_event_class`,
   `receipt_ref`; `:797-819`) plus two unrelated cases (the retired
   `public_receipt_ref_policy` key and an omitted-`safe_reason_code` null check; `:777-795`).
   It does **not** cover the canonical `supersedes_refs` / `linked_assertion_refs` ref arrays —
   which remain a documented future hardening gap (point 4 below, §8, §11) — so it must not be
   read as proving every private-shape leak, only the currently tested mutations, fail closed.

   **Known canonical-ref-array hardening gap (recorded, not closed here).** The current
   route-vector validator does **not** explicitly denylist the **canonical** Straylight ref
   arrays `supersedes_refs` or `linked_assertion_refs` in public responses — both are **absent**
   from `FORBIDDEN_PUBLIC_KEYS` (`:236-328`), and a public response carrying them would not be
   rejected by the current key/substring/pattern/UUID walks. Phase 46F records this as a **known
   hardening gap** for a future durable-store implementation or validator-hardening lane (§11,
   §13 criterion 8). It does **not** add validator hardening in this docs-only phase because
   the current fixed public-response builder
   (`app/src/services/admission-wedge-spike/public-response.ts` —
   `buildAdmissionSpikePublicResponse` returns a closed object literal that emits neither field)
   and the route guard (`app/src/routes/admission-intake.ts`) do **not** emit those fields, so
   there is **no present leak path** through the existing serializer. Adding forbidden keys for
   the canonical ref-array names is therefore **deferred** future-hardening, not a current
   requirement — recorded here to avoid the overclaim that the validator already covers the
   full supersession family.
5. **It honors the charter's stated preference.** The charter says: "If route-vector
   alignment can be recorded as decision-only without changing vector JSON yet, prefer
   docs-only." It can be, so it is.

> **Docs-only sufficiency, stated plainly.** Docs-only is sufficient for Phase 46F because, in
> combination: (a) the **five scenario families remain correct** — pending, accept, reject,
> supersede, and malformed/unsafe still cover the Admission Wedge outcomes (§5, §12); (b) the
> durable storage shape is a **cross-cutting** property of those five, not a sixth outcome, so
> it **does not justify a sixth vector** (point 3); (c) **public route-response behavior is
> fixed and narrow today** — `buildAdmissionSpikePublicResponse` returns a closed object
> literal with a fixed public field set and incorporates no request-controlled or durable
> material (`public-response.ts`), so no durable/private field can reach the public surface
> through the present serializer; (d) **validator hardening can therefore be deferred without
> creating a present leak path** — the canonical-ref-array gap (point 4) is latent, not live,
> because nothing emits those fields today; **but** (e) the validator is **not complete for
> every future durable/private canonical field** (`supersedes_refs` / `linked_assertion_refs`
> are absent from `FORBIDDEN_PUBLIC_KEYS`), so the deferral is recorded as a **known hardening
> gap** for the future durable-store / validator-hardening lane (point 4, §11, §13 criterion
> 8), not as a completeness claim.

**What a vector/validator change would require (and why this gate is not it).** A future
*runtime* implementation lane (not Phase 46F) that builds the durable store would extend the
vectors into executable fixtures and may then add forbidden-key hardening for canonical
ref-array names — but only "still no-leak-bounded" and behind the durable-store design gate
(46E §8 criterion 8; §13 below). That is downstream of ADR-022E gate #8; Phase 46F neither
performs nor authorizes it.

> **Preservation guarantee.** Because Phase 46F changes no vector and no validator, **all**
> existing no-leak and fail-closed vector guarantees are preserved byte-for-byte: the five
> scenarios, the no-sixth-vector check, the `FORBIDDEN_PUBLIC_KEYS` / substring / regex / UUID
> / opaque-run walks, the retired-token lock, the per-scenario `safe_reason_code` taxonomy,
> the `public_receipt_ref` string-or-null draft rule, the unresolved-review markers, the
> draft/non-final flags, and the `--self-check` negative-mutation harness all stand unchanged
> (re-verified green in §17).

---

## 10. What is already represented as a non-runtime vector/validator constraint

For the future durable-store lane, the following storage-shape properties are **already**
non-runtime constraints encoded in the existing vectors/validator (no Phase 46F change needed):

- **The public/private boundary** — `publicSurface()` excludes `expected_private_or_audit_effect`
  and `must_not_include` from the leak walk (`:375-383`), so private storage-shape intent is
  representable while public leakage fails closed.
- **The private `TransitionReceipt` / `AuditEvent` no-leak boundary** — `FORBIDDEN_PUBLIC_KEYS`
  (`:236-328`) + the `--self-check` cases (`:777-820`).
- **The single public-safe receipt reference** — `public_receipt_ref` string-or-null + draft
  shape, retired-token lock at any depth (`:441-449`, `:540-566`).
- **The source-real refusal taxonomy** — exact per-scenario `safe_reason_code`
  (`:150-156`, `:580-599`); the dotted draft-only codes forbidden on the public surface.
- **No operational ids on any surface** — UUID + opaque-run global walks (`:418-431`).
- **The non-final posture** — `schema_final` / `route_contract_final` / `storage_writes_performed`
  / `straylight_primitive_review_complete` etc. all `false` (`:118-129`, `:484-487`); the
  unresolved-review markers `[E,G,H,K,N,O]` / `[J]` carried exactly (`:490-502`).
- **The no-sixth-vector / five-scenario lock** (`:98-104`, `:683-687`).

> **What is *not* yet a validator-enforced constraint (recorded honestly).** Two boundaries are
> **not** executable validator enforcement today and must not be read as such: (1) the canonical
> ref arrays `supersedes_refs` / `linked_assertion_refs` are **absent** from
> `FORBIDDEN_PUBLIC_KEYS` (§8, §9 point 4) — a known hardening gap, latent because nothing emits
> them; and (2) the `expected_private_or_audit_effect` block is a **vector-side intent/evidence
> marker, not a validator-enforced public-response constraint** — the validator does not
> validate its contents (it is unreferenced in `collectVectorFailures`), so deleting it does not
> currently fail validation. Phase 46F treats that block as documentation evidence only.

These are exactly the constraints a future durable-store projection/serializer must satisfy.
Phase 46F records them as the binding non-runtime baseline and **leaves them unchanged**, while
recording the two non-enforced boundaries above as future hardening (§11).

---

## 11. What remains future durable-store implementation work

Phase 46F aligns the shape; it implements nothing. The following remain future, separately-
gated work (carried from 46E §4 / §8, unchanged):

- The **durable data model / schema / keys / indexes** (records persisted vs derived vs
  projected), behind ADR-022E gate #8.
- The **migration / backfill / rollback** plan (or an accepted dev-only no-migration scope).
- The **final idempotency / replay** semantics (Dixie-owned; Row J).
- The **production tenant / estate / actor identity binding** (Row G).
- The **signer / authority** model (Row F) and **auth / consent** reference persistence.
- The **production no-leak serializer** enforcing `privacy_scope` + frame disposition.
- The **rollback / partial-failure / atomicity** model.
- **Canonical-ref-array forbidden-key hardening.** Adding `supersedes_refs` /
  `linked_assertion_refs` to `FORBIDDEN_PUBLIC_KEYS` (and the runtime mirror) once a future
  lane emits canonical refs internally — the known hardening gap recorded in §8 / §9 point 4.
  Deferred here because the present fixed public-response builder emits neither field (no
  current leak path); not added in this docs-only phase.
- **Executable fixtures** extending the existing vectors / `--self-check` for the durable
  model, still no-leak-bounded (including the canonical ref-array forbidden-key hardening
  above — §9 point 4).
- The **physical durable adapter placement** (Dixie / Finn / sibling runtime; ADR-022D leaves
  this to a separate ADR).
- **Codex audit acceptance** of the durable-store design / implementation before PR.

---

## 12. Required invariants preserved

Phase 46F preserves **all** of the following (each already enforced in synthetic / spike /
vector form where cited; the durable model must carry it forward unchanged):

1. **A pending candidate is not recallable.** Only active, recall-eligible assertions enter
   `RecallProjection.includes` (`admitted-assertion-ledger.ts:957-973`); the pending vector
   has empty recall and `public_receipt_ref: null`.
2. **A rejected candidate creates no admitted assertion.** reject vector:
   `expected_private_or_audit_effect.no_admitted_assertion = true`; `synthTransitionFor`
   returns no transition for reject (`admission-intake.ts:162-167`).
3. **An accepted candidate creates / references an admitted assertion.** accept vector:
   `admitted_assertion_status_class = "active"`,
   `candidate_to_transition_to_assertion_chain_intent = true`.
4. **A superseded assertion is excluded from ordinary recall.** Supersession flips the prior
   to `superseded` / `recall_eligible: false` and excludes it
   (`admitted-assertion-ledger.ts:880-887`); supersede vector includes the corrected active,
   excludes the superseded prior.
5. **A malformed / unsafe payload fails closed.** malformed vector: `outcome_class = "refused"`,
   `safe_reason_code = "ingress.invalid_request"`, `must_fail_closed = true`; the classifier
   accepts only the five forms and fails closed otherwise (`classifier.ts:185-194`).
6. **The public response leaks no raw / private / audit / debug / source material.** The
   public-surface walk + `FORBIDDEN_PUBLIC_KEYS` + substring/regex/UUID/opaque-run walks
   (`validate-route-contract-test-vectors.mjs:385-431`); runtime mirror
   (`no-leak.ts:151-182`).
7. **Private `TransitionReceipt` / `AuditEvent` material remains private.** Forbidden on the
   public surface at any depth (`:267-294`); synthetic audit records are `audit_private: true`
   / `public_audit_detail: false` (`admitted-assertion-ledger.ts:119-130`).
8. **User chat does not become memory merely because it was said.** No Discord / freeform
   ingestion and no user-chat-as-memory path; the spike accepts only a synthetic dev-spike
   marker + draft transition discriminator (`classifier.ts:83-90`).
9. **Public `remember-this` remains blocked.** No public / unauthenticated `remember-this`
   surface is designed or authorized.
10. **Discord / freeform history ingestion remains blocked.** Unchanged.
11. **Production admission / storage / auth / consent remain blocked.** ADR-022E gate #8 held;
    `storage_writes_performed` / `auth_implemented` / `consent_implemented` /
    `production_admission` all `false` on every vector.
12. **Route-contract freeze and final schema freeze remain blocked.** `route_contract_final` /
    `schema_final` `false` on every vector; Phase 46F freezes neither.
13. **ADR-022E gate #8 remains uncleared.** Phase 46F is not the gate-clearing ADR and clears
    nothing.
14. **Auditability without rewriting history.** The audit log is append-only, hash-chained,
    and tamper-detectable (`loa-straylight/src/straylight/storage/types.ts:6-13`,
    `:64-67`; ADR-022D `:120`).

---

## 13. Exit criteria for any future implementation lane

A future lane may begin durable storage **implementation** only after **all** of the following
are produced and accepted. Phase 46F satisfies **none** of these (it is a shape alignment);
they are the bar a downstream lane must clear (carried from 46E §8, refined for shape):

| # | Exit criterion | Owning future gate |
|---|---|---|
| 1 | **Accepted durable data model** (records persisted vs derived vs projected, keys, indexes), consistent with the §4 shape and §6 ownership split. | Durable-store design gate + ADR-022E gate-#8-clearing ADR. |
| 2 | **Accepted migration plan, or an accepted dev-only no-migration scope.** | Durable-store design gate. |
| 3 | **Accepted idempotency / replay semantics** (final key, replay envelope, conflict response, ledger backing). | Route-contract idempotency decision (Row J). |
| 4 | **Accepted tenant / estate / actor identity binding** (production, session-derived; no caller override). | Auth / identity / signer gate (Row G). |
| 5 | **Accepted auth / consent references** (service-auth model; consent proof/receipt on the private audit record only). | Auth gate + consent gate (Row F / consent). |
| 6 | **Accepted public / private response projection** (the production no-leak serializer enforcing `privacy_scope` + frame disposition). | No-leak serializer design gate. |
| 7 | **Accepted rollback / partial-failure behavior** (atomicity, recovery). | Durable-store design gate. |
| 8 | **Executable tests or fixture vectors planned** for the durable model (extending the existing vectors / `--self-check`, still no-leak-bounded), **including the canonical-ref-array forbidden-key hardening** (`supersedes_refs` / `linked_assertion_refs`, today absent from `FORBIDDEN_PUBLIC_KEYS`) once a lane emits canonical refs internally — the known hardening gap recorded in §8 / §9 point 4 / §11. | Implementation-spike readiness checklist. |
| 9 | **Codex audit acceptance before PR** of the durable-store design / implementation. | The implementing lane's review/audit gate. |

> Exiting Phase 46F authorizes **no** runtime implementation. It records the shape (§4), its
> vector mapping (§5), the docs-only decision (§9), the invariants (§12), and the criteria
> above; the build remains blocked until a future, separately-gated lane satisfies them.

---

## 14. Selected next lane and dependency ordering

> **Selected next lane: the auth / identity / signer authority decision gate (docs/decision-only;
> not runtime).**

**Reason.** With the storage *direction* decided (46E §6) and the storage *shape* now aligned
onto the vectors (this gate), the downstream auth gate's rationale — "decide auth against the
now-decided storage shape" — is finally true. Phase 46E §9 / §10 sequenced exactly this: the
auth / identity / signer gate is step 3, after the storage-shape / vector-alignment lane (step
2, this gate). It decides, on paper, the production service-auth model (33K options A vs B),
the session-derived caller-identity binding with no caller override, the signer / authority
model (Row F / G), the cross-user / cross-tenant denial posture, and the endpoint-local-header
↔ global `/api/*` gate relationship — **docs/decision-only, no runtime, no auth implementation.**

**Dependency ordering after Phase 46F** (carried from 46E §10; step 2 now complete):

1. Phase 46E — durable storage **model direction** decided. *(Done; PR #150.)*
2. **Phase 46F — durable storage shape & route-vector alignment.** *(This gate — docs-only;
   no vector/validator change.)*
3. **Auth / identity / signer authority decision gate** — decides the production auth model,
   identity binding (Row G), signer/authority (Row F), against the now-decided storage shape.
   *(Selected next lane.)*
4. **Consent proof / receipt decision gate** — the production consent-proof model and
   consent-receipt private-audit binding.
5. **Durable-store design gate + ADR-022E gate-#8-clearing ADR** — authors the durable data
   model, schema, migration scope, rollback plan, and physical adapter placement; clears
   ADR-022E gate #8 preserving the ADR-022D invariants. *(The build precondition; held.)*
6. **Final route-contract pre-freeze gate.**
7. **Implementation-spike readiness checklist.**
8. **Bounded default-off implementation spike** — only if the checklist is satisfied.
9. **Smoke / acceptance gate.**
10. **Freeside Characters client-contract handoff.**

> **Implementation remains downstream.** Steps 3–10 are each held. The only step Phase 46F
> advances is **step 2** — aligning the shape onto the vectors — which is itself
> docs/decision-only. **Runtime implementation is not the next step.**

---

## 15. Blocked lanes

Phase 46F is a bounded, docs/decision-only shape-alignment gate. It authorizes **none** of the
following; each remains **blocked** and is **not** unblocked by aligning the storage shape onto
the vectors or selecting the auth gate:

- durable Admission Wedge storage implementation (ADR-022E gate #8 held);
- DB writes; migrations; a durable data model, schema, or table definition;
- route / API handler implementation **beyond the existing Phase 33N spike**;
- production admission; auth implementation; production auth / consent implementation;
- public `remember-this`; Discord command / history ingestion; user chat becoming memory;
- Freeside Characters runtime / client integration; package exports;
- the final Dixie route contract; route-contract freeze; production route deployment;
- production readiness of any kind; final / production schema freeze;
- LLM / voice; Finn production wiring;
- forget / revoke / correction UI (MVP-3-adjacent; surfaced in §11 / 46E §4 item 16, not
  implemented);
- final idempotency semantics (Dixie / endpoint-owned; undecided);
- production signer / authority semantics; production identity binding (tenant / estate /
  actor);
- persisting `recall_eligible` as canonical authority (§7); freezing the physical durable
  adapter placement (§4 / 46E §6);
- **any mutation of the five route-vector JSONs, the route-vector validator, the route-vector
  README, the Phase 33E fixtures, or the Phase 33E fixture validator** (§9).

> **A shape alignment does not authorize runtime implementation.** Aligning the durable storage
> shape onto the existing vectors and selecting the auth gate makes the next decision legible;
> it does **not** build a store, **not** author a schema or migration, **not** clear any
> production gate, **not** freeze the route contract or schema, and **not** authorize any
> route / storage / auth / consent / Freeside / package-export work. The Phase 33N
> dev/operator-only, disabled-by-default spike remains the only authorized route surface, and
> the do-nothing / synthetic-only posture (46E Option 6) remains in force.

If a later phase reaches for any of the above, it must re-open the Phase 33K precondition
design, the Phase 33P / 33Q / 33R storage lane, the Phase 33U / 33V chain, the Phase 46A–46E
gates and this gate, and the relevant ADRs (Straylight-repo ADR-022E durable-store gate #8 and
related gates #10 / #12 / #20; ADR-022D receipt/audit-chain invariants; ADR-026C / ADR-026D
route guardrails) first; it must not silently expand scope.

---

## 16. Corruption / duplicate guard

Phase 46F applies an explicit corruption / duplicate guard to **this** document (carried from
the Phase 46D / 46E precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 19.`)
  appears exactly once.
- **Numbered sections appear once each.** Sections 1–19 each appear exactly once; the guard
  counts `^## N\.` occurrences and asserts one per number.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", "RESULT:",
  trailing "Report" headings, prose-claim dumps, or pasted terminal transcript appears in the
  document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row;
  no duplicated / truncated / wrapped table fragments appear.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block
  is the §17 validation command list.

The guard commands and their recorded results are in §17.

---

## 17. Validation

All commands were run from the repository root
(`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46F is docs/decision-only — it adds only
this document and mutates no vector, validator, or fixture — so the validators are run only to
confirm the unchanged artifacts remain green. The fence-balance and negative-claim checks avoid
embedding affirmative-claim substrings in prose, so they cannot self-match.

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
grep -E "Phase 46E|Phase 46F" docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md
# Duplicate/corruption grep (advisory):
grep -nE "Claude said|Patch Report|terminal report|RESULT:|Report$" docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md || true
# Enforcing negative check — fail if any affirmative readiness / freeze / implementation /
# authorization claim appears in PROSE. The patterns are affirmative-only and word-boundaried,
# so the document's negated prose ("does not freeze …", "not production-ready", "no … work is
# authorized") and the fenced validation commands below are deliberately NOT matched. It is
# NOT masked with `|| true`:
python3 - <<'PY'
import re
from pathlib import Path
p = Path("docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md")
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
    r"\bvectors? (?:was|were) (?:modified|mutated|changed)\b",
    r"\bvalidator (?:was|were) (?:modified|mutated|changed)\b",
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
print("The enforcing scan found no affirmative readiness/freeze/build/authorization/vector-mutation claims outside fenced validation commands.")
PY
# Fence-balance check (dependency-free; even count = balanced; char-code form avoids embedding
# a literal triple-backtick that would unbalance this doc):
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

Recorded results for this lane (see the message body accompanying this work for the captured
terminal output):

- **docs-only scope check** — only the single new file
  `docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md` is added; no
  route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture
  validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration,
  runtime, or generated file is touched;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no `git add` / commit
  / push);
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator reports
  5/5 probes valid, 0 failures; the route-contract test-vector validator reports 5/5 vectors
  valid, 0 failures, no sixth vector; the `--self-check` negative-mutation harness reports 5/5
  mutations fail closed;
- **self-reference label check** — `grep -E "Phase 46E|Phase 46F"` confirms both the
  `Phase 46E` (predecessor) and `Phase 46F` (self) labels are present;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the nineteen
  headings 1–19 exactly once each;
- **duplicate/corruption grep** — the advisory grep finds no pasted terminal-report fragment
  in the document body;
- **negative readiness-claim check (enforcing)** — the `python3` scan excludes fenced lines
  and reports the affirmative-only, word-boundaried patterns (including vector/validator
  *mutation* claims) found no match outside the fenced validation commands; the document's
  **negated** prose is correctly not matched. The scan is not masked with `|| true`;
- **fence-balance check** — the dependency-free `node -e` counter reports an even (balanced)
  triple-backtick count; the single fenced block is the validation command list above.

---

## 18. Success criteria for Phase 46F

Phase 46F succeeds if and only if:

1. **Docs / decision-only** — it creates only this Phase 46F document; it changes **no**
   route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture
   validator, runtime source, test, route, store, migration, auth, consent, config, env,
   package, lockfile, CI, or generated file, and edits **no** adjacent repository (§1, §9).
2. **Source chain / evidence intake recorded** — the Dixie chain (33L / 33N / 33P / 33Q / 33R /
   33U / 33V / 33W–33Z → 46A → 46B → 46C → 46D → 46E → 46F), the canonical Straylight
   substrate, and the held ADR-022E gates are summarized (§2).
3. **Starting accepted facts recorded** — the decided model direction, the five green vectors,
   the public projection, the forbidden private fields, and the held gates (§3).
4. **The durable storage shape stated** — the §6 model's three layers (durable/canonical;
   Dixie-owned; derived) recorded as a shape, not a schema (§4).
5. **Storage-shape ↔ vector mapping recorded** — candidate persistence, admitted-assertion
   persistence, transition receipt refs, audit event refs, replay/idempotency backing, public
   receipt refs, tenant/estate/actor scope, supersession/correction relations, and
   rejection/denial records each mapped onto the current vectors (§5).
6. **Conceptual / public / never-public classification recorded** — which shape fields are
   future-facing only, which map to current public vectors, and which must never appear on a
   public route response (§6).
7. **`recall_eligible` fixed as derived, never persisted authority** (§7).
8. **Dixie-local supersession fields related to canonical Straylight vocabulary without
   renaming local fields** (§8).
9. **Docs-only decision recorded** — the alignment is recorded without changing vector JSON or
   the validator, with justification, no sixth vector, all existing no-leak / fail-closed
   guarantees preserved, and the **known canonical-ref-array validator-hardening gap**
   (`supersedes_refs` / `linked_assertion_refs` absent from `FORBIDDEN_PUBLIC_KEYS`; latent, no
   present leak path) recorded rather than overclaimed as complete (§8 / §9 / §11).
10. **Non-runtime constraints and future work delineated** — what is already a vector/validator
    constraint (§10) and what remains future durable-store work (§11).
11. **Required invariants restated** — pending not recallable; rejected mints nothing; accepted
    creates/references; superseded excluded; malformed fails closed; public no-leak; private
    receipt/audit private; not user-chat memory; public remember-this blocked; Discord
    ingestion blocked; production admission/storage/auth/consent blocked; route-contract +
    schema freeze blocked; ADR-022E gate #8 uncleared; auditability without history rewrite
    (§12).
12. **Exit criteria recorded** — the nine exit criteria for any future implementation lane,
    none satisfied by Phase 46F (§13).
13. **Next lane selected + ordering updated** — the auth / identity / signer authority decision
    gate selected; the post-46F ordering recorded with implementation downstream (§14).
14. **Blocked lanes preserved** — no durable / DB-write / migration / schema / route / auth /
    consent / Freeside / package / production-readiness lane is authorized, and no vector /
    validator / fixture is mutated (§15).
15. **Corruption / duplicate guard applied** — the document passes the §16 guard, with results
    recorded in §17.
16. **No freeze, no production-readiness claim, no gate clearance** — Phase 46F freezes neither
    the route contract nor the schema, declares no production readiness, and does **not** clear
    ADR-022E gate #8 (§1, §9, §15).

---

## 19. Cross-references

- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md)
  — Phase 46E (PR #150); its §6 selected the storage model direction and its §9 / §10 selected
  and scoped this Phase 46F storage-shape / vector-alignment gate and sequenced the auth gate
  downstream.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md)
  — Phase 46D (PR #149); ranked the candidate lanes and selected Phase 46E.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md)
  — Phase 46C (PR #148); the storage / auth / consent blocker decomposition.
- [`docs/ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)
  — Phase 33P (PR #134); selected Option B (synthetic store), rejected Option D, named the
  validator denylist as the store-projection boundary.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U (PR #139); the A–O reconciliation (rows F / G / J / O held; Row B / Row C)
  grounding §2 / §5 / §7 / §8.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V (PR #140); the `AuditEvent` / `TransitionReceipt` split, `public_receipt_ref`
  adoption, the `privacy_scope` + frame-disposition projection boundary.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  with the five vector JSONs — inspected **read-only** to ground the shape ↔ vector mapping,
  the no-leak boundary, and the docs-only decision. **None is modified.**
- `docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`,
  `docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`,
  `app/src/routes/admission-intake.ts`, and
  `app/src/services/admission-wedge-spike/{classifier,public-response,no-leak,admitted-assertion-ledger}.ts`
  — inspected **read-only** to ground the §3 spike / synthetic-ledger facts, the §5 mapping,
  and the §12 invariants. **None is modified.**
- `loa-straylight/src/straylight/storage/types.ts`, `loa-straylight/src/straylight/types.ts`,
  and `loa-straylight/docs/decisions/{ADR-022D,ADR-022E}-…md` — inspected **read-only** as the
  **canonical** Straylight substrate cited in §2.2 / §4 / §6 / §8 (the upsert-assertion /
  append-only-transition / append-only-hash-chained-audit `StorageAdapter` surface; the
  `Assertion` / `TransitionReceipt` / `AuditEvent` primitives; ADR-022D `InMemoryStorage` /
  `JsonlStorage` MVP options; ADR-022E gate #8). **Not edited by this phase.**
- `@loa/straylight` — canonical primitive / substrate owner; PR #65 (merged) answered the A–O
  primitive review. Straylight-repo ADR-022E (durable-store gate #8 + related gates #10 / #12 /
  #20, **held**), ADR-022D (receipt/audit-chain invariants), ADR-026C, ADR-026D are decision
  records cited as guardrails. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — the cross-repo acceptance whose
  mirror/adapter is test-only, not exported, not runtime-wired; the consent-boundary handoff
  stays deferred. **Not edited by this phase.**
