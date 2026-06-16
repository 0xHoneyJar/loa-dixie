# Phase 46M — Admission Wedge Durable-Store Production-Adapter Placement & Schema/Migration Decomposition Gate

> **Phase**: 46M
> **Branch context**: `phase-46m-admission-production-adapter-schema-decomposition`
> **Related**: Phase 46L ADR-022E gate-#8 gate-clearing ADR (HELD) + blocker-only sibling handoff packet
> (PR #157,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md)
> §9 / §13 step 9 +
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-SIBLING-HANDOFF-PACKET.md)
> §5 item 1, which held gate #8 because the gate #8 trigger's first conjunct — a separate ADR that
> *proposes the production adapter* — was unmet, and named **this** docs/decision-only "durable-store
> production-adapter placement + schema / migration decomposition gate" as the next lane); Phase 46K
> durable-store implementation-readiness decomposition (PR #156,
> [`ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md));
> Phase 46J consent/storage vector & validator alignment (PR #155,
> [`ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md));
> Phase 46I durable-store design + ADR-022E gate #8 decision (PR #154,
> [`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md));
> Phase 46H consent proof / receipt decision (PR #153); Phase 46G auth / identity / signer authority
> decision (PR #152); Phase 46F durable storage shape & route-vector alignment (PR #151); Phase 46E
> durable storage model decision (PR #150); Phase 46D storage/auth/consent acceptance (PR #149); Phase
> 46C storage/auth/consent blocker decomposition (PR #148); Phase 46B route-contract
> implementation-readiness decomposition (PR #147); Phase 46A route-vector alignment acceptance (PR #146);
> Phase 33Z route-vector alignment (PR #144) + its PR #145 next-lane label/provenance correction; Phase
> 33Y route-contract revision acceptance (PR #143); Phase 33X route-contract revision draft (PR #142);
> Phase 33V storage/auth/consent design finalization (PR #140); Phase 33U Straylight-response intake
> (PR #139); Phase 33R bounded-ledger acceptance (PR #136); Phase 33Q bounded synthetic admitted-assertion
> ledger (PR #135); Phase 33P storage/receipt hardening (PR #134); Phase 33N dev/operator-only route
> spike; Phase 33M dev/operator route-spike authorization gate; Phase 33K storage/auth/consent
> precondition design; Phase 33L route-contract test-vector fixture draft; Straylight (`@loa/straylight`)
> PR #65 (A–O primitive-review verdicts, **merged**); Straylight-repo ADR-022E durable-store gate #8 (and
> related gates #9 / #10 / #11 / #12 / #15 / #20), **held**; Straylight-repo ADR-022D MVP-persistence /
> audit-owner invariants; ADR-026C / ADR-026D route guardrails; freeside-characters Phase 45J / PR #177
> (Dixie v1 mirror-refresh acceptance, merged 2026-06-06).
> **Status**: **docs / decision-only.** This gate adds **only this document**. It changes **no**
> route-vector JSON, **no** route-vector validator, **no** route-vector README, **no** Phase 33E fixture
> or fixture validator, and **no** runtime source, test, route, route handler, storage, store code, DB
> write, migration, auth, consent, package export, config, env, package, lockfile, CI, generated file, or
> binary. No adjacent repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is a durable-store production-adapter *placement* + *schema / migration* decomposition gate. It
> may propose or reject a production adapter placement at the architecture / decomposition level only.**
> It produces the docs/decision-only input — the gate #8 trigger's missing first conjunct (a *proposed
> production adapter*) — that a **future, re-authored** ADR-022E gate-#8 gate-clearing ADR would consume.
> It does **not** implement the adapter, **not** create migrations, **not** write DB code, **not** change
> route / API behavior, **not** implement auth or consent, **not** modify runtime `no-leak.ts`, **not**
> clear ADR-022E gate #8, **not** authorize durable-store implementation, **not** authorize production
> admission or public remember-this, **not** authorize Discord / freeform ingestion, **not** freeze the
> route contract, and **not** freeze the final schema.

Every assessment below is grounded read-only against the actual Dixie repo (the Phase 46E / 46F / 46G /
46H / 46I / 46J / 46K / 46L gates + the 46L sibling handoff packet, the Phase 33K precondition / 33M
authorization / 33N spike / 33P–33R storage lane, the Phase 33U / 33V chain, the **five** route-vector
JSONs, the route-vector validator and its README, and the Phase 33N spike source under
`app/src/services/admission-wedge-spike/` plus the route handler `app/src/routes/admission-intake.ts`)
and read-only against the **canonical** Straylight (`@loa/straylight`) substrate
(`src/straylight/types.ts`, `src/straylight/storage/types.ts`, `src/straylight/storage/in-memory.ts`,
`src/straylight/storage/jsonl.ts`, `src/straylight/audit.ts`, and
`docs/decisions/ADR-022D…` / `ADR-022E…`, `docs/handoffs/cross-repo-handoff-index.md`). Where a claim
could not be grounded in the read material, it is marked as such. Phase 46M changes no technical
artifact; the validators are run only to confirm the unchanged artifacts remain green (§16).

---

## 1. Status and verdict

Phase 46M is the bounded, docs/decision-only **durable-store production-adapter placement + schema /
migration decomposition gate** that follows, and is named by, Phase 46L
([`ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md)
§13 step 9, PR #157). Phase 46L authored the gate-clearing ADR + sibling handoff packet, applied the gate
#8 trigger to the accepted evidence, and reached a **HELD** verdict — the trigger's first conjunct (a
separate ADR that *proposes the production adapter*) was unmet because the physical adapter placement and
the durable schema / migration plan were future-gated (46L §9). Phase 46L then selected, as the next
lane, "a docs/decision-only durable-store production-adapter placement + schema / migration decomposition
gate — the lane that resolves the physical adapter placement (Dixie / Finn / sibling runtime) and
decomposes the durable schema / migration / backfill / rollback plan, so a future gate-clearing ADR can
genuinely *propose the production adapter* (gate #8 conjunct a)" (46L §13). Phase 46M executes that lane:
it evaluates the candidate adapter placements (§5), proposes the safest placement candidate at the
decomposition level (§6), and decomposes the durable schema (§7) and migration (§8) families — producing
the missing conjunct-(a) input for a future, re-authored gate-clearing ADR, and stopping **short** of any
build, migration, schema freeze, or gate clearance.

This phase is **not** an implementation PR, **not** a migration PR, and **not** the ADR-022E gate-#8
gate-clearing ADR. It does **not** clear ADR-022E gate #8 and does **not** authorize durable-store
implementation. It decomposes the production adapter placement and schema / migration proposal that a
future gate-clearing ADR requires.

> **Verdict (charter option a): a production adapter placement candidate is selected, at the
> architecture / decomposition level only, as the proposal input for future ADR-022E gate-#8 clearing
> work — and ADR-022E gate #8 REMAINS HELD.** The selected candidate (§6) is **Candidate D — split
> storage with a Dixie route-side durable adapter for the Admission Wedge route-owned records, realized
> against the canonical Straylight `StorageAdapter` semantics / interfaces, with the canonical
> assertion / transition / receipt / audit store remaining Straylight-owned and sibling / Finn projection
> / audit integration future-gated.** This is the topology *direction* Phase 46I already selected (46I §7
> Option 4) and the route-side-adapter narrowing Phase 46I already recorded (46I §6: "*if* a future
> gate-clearing ADR assigns Dixie a route-side durable adapter, it must be a swap-in of the canonical
> Straylight `StorageAdapter` interface … behind ADR-022E gate #8 and the relevant sibling gates"). Phase
> 46M selects it as the concrete placement *candidate* a future gate-clearing ADR would *propose*. The
> selection is a **docs/decision-only proposal input**, not implementation authorization; the *canonical
> store's physical hosting* (Straylight process vs Finn runtime) remains a downstream sub-decision
> governed by the held sibling gates #9 / #10 and is **future-gated** — it does not reopen this verdict,
> because the route-owned-records adapter is settled as Dixie route-side and the `StorageAdapter`
> swap-in seam keeps the canonical-store hosting substitutable later (§6.4).

**What the verdict does and does not mean.** Selecting a placement candidate at the decomposition level:

- **does** supply the docs/decision-only input the gate #8 trigger's first conjunct names (a *proposed*
  production adapter), so a future ADR can re-author Phase 46L's HELD ADR with conjunct (a) met (§6 / §13);
- **does not** clear ADR-022E gate #8 — clearing requires a *separate, accepted* gate-clearing ADR that
  cites the (then implementation-form) sibling handoff packet and preserves the ADR-022D invariants;
  gate #8 and the related gates #9 / #10 / #11 / #12 / #15 / #20 remain **held** (§3, §10);
- **does not** implement the adapter, write DB code, author or apply a migration, change route / API
  behavior, implement auth or consent, or modify runtime `no-leak.ts` (§1 status; §9; §14);
- **does not** freeze the route contract or the final schema, and **does not** claim production readiness
  (§11, §12, §14);
- **does not** persist `recall_eligible` as canonical authority — it remains derived and non-authoritative
  (§7; §12 invariant 15).

> **A placement + schema / migration *decomposition* authorizes no runtime work and clears no gate.**
> Phase 46M records, on paper, which production adapter placement is safest, what schema families a future
> durable store would carry, and what migration work a future lane must plan — so a future gate-clearing
> ADR can *propose* a concrete adapter. The output is a decomposition recorded on paper, not a built
> store, not an authored schema, not an applied migration, not a cleared gate, and not implementation
> authorization. A future, separately-gated lane must still (a) re-author the gate-clearing ADR with
> conjunct (a) met and **accept** it, (b) add the deferred runtime `no-leak.ts` exact-key mirror before
> implementation authorization, (c) author and accept the final data model / schema / migration / rollback
> plan, and (d) only then authorize any build.

---

## 2. Source chain (evidence intake)

This gate sits one rung above the Phase 46L gate-clearing ADR (HELD) on the Dixie route-contract ladder,
and it is the **production-adapter placement + schema / migration decomposition** sub-step of 46L's "step
9" (46L §13). It introduces no new contract or vector material; it consumes the storage / auth / consent
decision cluster (46E / 46F / 46G / 46H), the durable-store design / decomposition (46I), the non-runtime
validator hardening (46J), the implementation-readiness decomposition (46K), the gate-clearing ADR / HELD
verdict + blocker handoff packet (46L), the prior precondition / authorization / spike / storage lanes,
and the canonical Straylight substrate to decompose the production adapter placement and schema /
migration proposal.

### 2.1 Dixie (loa-dixie) — the storage / auth / consent and route-contract lanes

| Phase | PR | Artifact / contribution (relevant to the production-adapter placement + schema / migration decomposition) |
|-------|----|------|
| 33K | #129 | **Storage/auth/consent precondition design.** Drafted the durable storage record categories, the service-auth options A/B/C/D, the consent options A/B/C/D, the idempotency precondition, the no-leak preconditions, the threat model, and the exit criteria. Froze nothing. |
| 33L | #130 | **Route-contract test-vector fixture draft.** Authored the five non-runtime route-contract vectors + validator; carried the storage/auth/consent draft assumptions and the unresolved-review markers `[E,G,H,K,N,O]` / `[J]`. |
| 33M | #131 | **Dev/operator route-spike authorization gate.** Authorized the Phase 33N spike: dev/operator gate only, disabled-by-default; Storage Option A (no durable store, no DB writes, no migrations); rollback trivial — no durable state to roll back. |
| 33N | #132 | **Dev/operator-only route spike.** `POST /api/admission/intake`, disabled-by-default; the synthetic transition built from fixed dev constants, never request-controlled material; **Storage Option A**; runtime no-leak guard (`no-leak.ts`) mirrors the Phase 33L denylist; uses `x-admission-service-token`, not `Authorization`. |
| 33P | #134 | **Storage / receipt hardening decision.** Selected Option B (a possible future dev-only bounded synthetic store); **rejected Option D** (production-like durable storage); named `FORBIDDEN_PUBLIC_KEYS` as the boundary a store-backed projection must satisfy. |
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
| 46F | #151 | **Durable storage shape & route-vector alignment.** Aligned the §6 model's durable **shape** onto the five vectors docs-only; fixed `recall_eligible` as derived (never persisted authority); **first recorded the canonical-ref-array hardening gap**. |
| 46G | #152 | **Auth / identity / signer authority decision.** Retained Option C (dev/operator-only) for the spike; recorded production candidates Option A (bearer JWT) and Option B (signed envelope); decided session-derived identity binding with no caller override; mapped the candidate subject to canonical `subject_refs`; **extended the recorded gap** to the signer/receipt/audit key names. |
| 46H | #153 | **Consent proof / receipt decision.** Decided service auth ≠ consent; consent is never inferred from chat; a production consent artifact lives on the **private audit record only**; decomposed the consent-proof object model (draft); recorded the 10-case consent failure taxonomy; **extended the recorded gap** to the full consent key-name family. |
| 46I | #154 | **Durable-store design & ADR-022E gate #8 decision.** Recorded what gate #8 requires (§4); decomposed 14 durable records (§5); recorded the ownership/adapter boundary (§6); selected **Option 4 (split storage)** as the safest topology *direction* (§7); decomposed the migration/lifecycle preconditions (§8); carried the no-leak hardening debt (§9); recorded the §12 eleven-item exit checklist; confirmed `recall_eligible` derived; left the **physical adapter placement unresolved**. |
| 46J | #155 | **Consent/storage vector & validator alignment.** Discharged the **non-runtime validator** half of the no-leak hardening debt: added 37 canonical / consent exact-key entries to `FORBIDDEN_PUBLIC_KEYS` (snake_case + camelCase) and extended `--self-check` to **44/44** (42 fail-closed negative mutations + 2 exact-key no-overmatch guards); changed **no** vector JSON; **deferred the runtime `no-leak.ts` mirror**. |
| 46K | #156 | **Durable-store implementation-readiness decomposition.** Decomposed the ADR-022E gate #8 readiness requirements (§4); proved implementation-readiness ≠ implementation authorization (§4.7); decided the runtime no-leak mirror is an implementation-authorization precondition, not a gate-clearing precondition (§7); defined the 15-item implementation-readiness checklist (§9, criteria 3 & 5 — physical placement and schema/migration — unsatisfied). |
| 46L | #157 | **ADR-022E gate-#8 gate-clearing ADR (HELD) + sibling handoff packet (blocker).** Applied the conjunctive gate #8 trigger to the evidence; reached **HELD** because conjunct (a) — *propose the production adapter* — was unmet (physical placement + schema/migration future-gated); recorded the ADR-022D preservation statement (conjunct c) and the sibling handoff packet citation (conjunct b, structurally); the handoff packet became a **blocker** packet, not an implementation packet; **named this Phase 46M placement + schema/migration decomposition lane (§13 step 9)** as the lane that produces conjunct (a). |
| **46M** | *(this doc)* | **Durable-store production-adapter placement + schema/migration decomposition gate.** Records the source chain (§2) and accepted facts (§3); restates the canonical gate #8 trigger and why 46L held (§4); evaluates the candidate adapter placements (§5); proposes the safest placement candidate at the decomposition level (§6); decomposes the durable schema families without freezing schema (§7); decomposes the future migration requirements without creating migrations (§8); sequences the runtime no-leak mirror (§9); preserves the ADR-022D invariants (§10); lists the implementation-readiness blockers remaining after this phase (§11); restates the invariants (§12); selects the next lane (§13); preserves the blocked lanes (§14). Mutates **no** vector / validator / fixture / source. |

> **PR-number provenance note.** The PR numbers above are taken from the local git merge-commit history
> (`docs: … (#NNN)` subjects) and the Phase 46A–46L source-chain tables. Phase 46L's `#157` is the merge
> commit `9a18f37c "docs: hold Admission Wedge ADR 022E gate 8 (#157)"`; Phase 46K's `#156` is
> `8710d751 "docs: decompose Admission Wedge durable store readiness (#156)"`. Treat the PR numbers as
> git-sourced rather than as authority embedded in the gate bodies (each gate refers to itself only as
> "this doc").

### 2.2 Canonical Straylight substrate (`@loa/straylight`) — read-only

The durable substrate that ADR-022E gate #8 governs is **canonical Straylight semantics**, read-only here
to ground the §4–§10 decomposition. The adjacent `loa-straylight` repo is the canonical evidence (Dixie's
mirror modules are parity evidence only, never canonical proof — ADR-022D). All substrate files cited
below were confirmed present and readable in the adjacent repo.

- **The append-only, hash-chained audit substrate and the current-state assertion surface are
  Straylight-owned interfaces.** The `StorageAdapter` interface declares the record families — actors,
  estates, keyrings, current-state assertions (upsert; status changes write a new version), append-only
  transitions, recall receipts, transition receipts, and append-only **hash-chained-per-estate** audit
  events (`loa-straylight/src/straylight/storage/types.ts:33-68`); the MVP semantics header states
  assertions/receipts upsert (latest write wins), transitions and audit events are append-only and
  immutable once written, and audit events are hash-chained per estate (`storage/types.ts:1-18`).
  `verifyChain` detects a tampered chain by a `previous_audit_hash` mismatch (`audit.ts:77-89`).
- **`StorageAdapter` is explicitly the swap-in seam for a future production substrate.** The interface
  header records that "async adapters (real SQL/Postgres in Dixie or Finn) replace this interface in a
  later phase" (`storage/types.ts:15-16`). `InMemoryStorage` is "the Phase 1 default … loses all state
  when the process exits, by design" (`storage/in-memory.ts:1-3`); `JsonlStorage` is the
  "append-only line-delimited JSON files, one per table … single-process, single-host MVP scope" durable
  option, deferring production to a "real WAL/DB" (`storage/jsonl.ts:1-20`). Per ADR-022E gate #8,
  `InMemoryStorage` and `JsonlStorage` are the **only** MVP adapters; a production adapter is a
  **replacement** behind the gate, not a third MVP adapter.
- **Canonical `Assertion`, `TransitionReceipt`, `AuditEvent` are distinct Straylight-owned primitives.**
  `Assertion` carries `status` (incl. `active` / `superseded`), `supersedes_refs`,
  `linked_assertion_refs`, `subject_refs`, `privacy_scope`, and `recall_scope` among its fields
  (`types.ts:145-167`). `TransitionReceipt` is a first-class discriminated type (`kind` ∈ admission /
  denied / challenge / revocation / forget) carrying `transition_id`, `audit_event_ref`, `signer_refs`,
  `target_refs`, `policy_decision`, `reasons`, `metadata`, and `receipt_hash`
  (`types.ts:364-388`). `AuditEvent` carries `transition_id`, `assertion_refs`, `signer_refs`,
  `policy_decision_ref`, `previous_audit_hash`, and `audit_hash` (the per-estate chain link)
  (`types.ts:514-529`).
- **ADR-022E gate #8 is held with a conjunctive trigger that names the production adapter.** Gate **#8
  (Production database / persistence substrate)**: "`InMemoryStorage` and `JsonlStorage` are the MVP
  adapters. | A separate ADR proposes the production adapter, cites the relevant sibling-repo handoff
  packet, and preserves the ADR-022D receipt and audit-chain invariants"
  (`loa-straylight/docs/decisions/ADR-022E-phase-22-deferred-features.md:57`). The gate-table preamble
  requires that "Phase 22 must not advance the feature unless the trigger is satisfied **and** a separate
  ADR (or sibling-repo PR under teammate review per [the cross-repo handoff index]) explicitly cites the
  trigger" (`ADR-022E…:42-46`). The siblings that gate any Dixie durable wiring are **#9** (Finn runtime
  wiring, `:58`), **#10** (Dixie boundary wiring, `:59`), **#11** (Freeside as a consumer, not a host,
  `:60`), **#12** (new HTTP / NATS / REST / Discord / Telegram surface, `:61`), **#15** (sibling-repo
  edits, `:64`), and **#20** (threat-model widening, `:69`), each held. PR #65 cleared none of these
  gates.
- **ADR-022D pins the receipt/audit-chain invariants the gate-clearing ADR must preserve, and defers the
  production substrate.** ADR-022D §1 pins ownership of `RecallPack` / `RecallReceipt` /
  `TransitionReceipt` / `AuditEvent` to Straylight and preserves the six receipt categories
  (`ADR-022D-mvp-persistence-and-audit-owner.md:47-68`); §2 records that "**No production database is
  wired by Phase 22A. No new storage adapter is authored.** The `StorageAdapter` interface remains the
  swap-in seam for a future Postgres / sibling-runtime substrate" (`:69-82`); §3 records the host is a
  persistence/exposure surface, not the semantic owner (`:84-108`); §4 elevates five audit-chain
  integrity invariants to the MVP host contract (`:109-127`); §5 keeps `AuditEvent` Straylight-owned and
  unmigrated (`:129-136`); §6 keeps commitment-root publication deferred (`:138-148`); §7 records that
  each migration (persisting `AuditEvent` / `TransitionReceipt` in a runtime substrate, exposing receipts
  through a Dixie BFF surface, adopting a Hounfour `AuditEvent` schema) is "a **separate** ADR +
  sibling-repo PR under teammate review" (`:149-166`).

### 2.3 Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts, reconciled by 33U.** PR #65 clarified the
  *vocabulary / design* only; it cleared **no** independent production gate and authorized **no** Dixie
  runtime, production storage / auth / consent, or Freeside integration. The still-held rows that gate
  this placement decomposition are **F, G, J, and O** (33U §4).
- **Residual legacy marker prose.** The `[E,G,H,K,N,O]` / `[J]` marker arrays in the vector JSONs and the
  spike classifier comments are **preserved legacy vector/runtime markers, not the current review-state
  authority**; the authoritative classification lives in the route-vector README current-state correction
  (its §7). Phase 46M preserves that distinction and mutates no technical artifact.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the freeside-characters 34-/45-series,
> and Straylight's ADR / PR labels are independent labels in separate repositories and must not be
> conflated. `46M` signals **no** new product epoch and **no** scope expansion — it is the same Admission
> Wedge arc, still docs/decision-only. The Straylight ADR-022E "Phase 22" gate numbering is the
> *Straylight* repo's phase namespace, distinct from Dixie's 46-series; "Phase 22A does not author the
> production adapter" is a Straylight-side statement that this Dixie decomposition respects (§4 / §8).

---

## 3. Starting accepted facts

These are facts **already accepted** by the chain (33K / 33M / 33U / 33V / 46C / 46D / 46E / 46F / 46G /
46H / 46I / 46J / 46K / 46L), re-verified read-only here as the baseline the §4–§13 decomposition is
measured against. None is changed by this gate.

1. **The only authorized route surface is the Phase 33N dev/operator-only spike, and it stores nothing
   durable.** It mounts only when `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (default off,
   `admission-intake.ts:16`), uses **Storage Option A** (no durable store, no DB writes, no migrations),
   fails closed on disabled (404), unauthorized (403), and malformed (400), and rollback is trivial
   because there is no durable state to roll back. It does **not** authorize production admission /
   storage / auth / consent.
2. **The durable storage model *direction* and *shape* are decided, the topology *direction* is selected,
   and the build is not — and the physical adapter placement is unresolved.** Phase 46E selected
   current-state projection + append-only hash-chained audit log on the canonical Straylight
   semantics/interfaces; Phase 46F aligned that shape onto the five vectors docs-only; Phase 46I selected
   **Option 4 (split storage)** as the safest topology *direction*, with the physical adapter placement
   (Dixie / Finn / sibling runtime) left **unresolved** under ADR-022E gate #8 (46I §6 / §7). None built a
   store, authored a schema, proposed a production adapter, or cleared a gate.
3. **The auth / identity / signer and consent boundaries are decided on paper, not built.** Phase 46G
   recorded the service-auth boundary, the session-derived identity binding (no caller override), the
   policy/keyring-decided signer competence, and the replay/idempotency interaction; Phase 46H recorded
   the consent boundary, the consent-proof object model (un-frozen), the consent-receipt public/private
   boundary, and the 10-case consent failure taxonomy. Auth is not implemented; consent is not
   implemented; both reference *what is persisted* and therefore depend on the durable-store design.
4. **Straylight owns the canonical durable substrate; Dixie holds ingress references only.** The canonical
   `active` `Assertion`, the first-class `TransitionReceipt`, and the append-only hash-chained `AuditEvent`
   are Straylight primitives persisted through the `StorageAdapter` / `AuditLog` path with ADR-022D
   invariants (§2.2). Dixie owns the endpoint-local contract / idempotency / replay records, ingress
   references, and the public/private response projection; a production auth-decision / consent reference
   is a Dixie/host ingress reference recorded **privately** onto the canonical audit record, never the
   canonical copy.
5. **There are exactly five route-contract vectors and one validator; both are green and non-runtime,
   carrying the storage/auth/consent draft assumptions.** All five vectors validate, the no-sixth check
   passes, and the `--self-check` harness reports **44/44** after Phase 46J (42 fail-closed negative
   mutations + 2 exact-key no-overmatch guards) (§16). Every vector carries `storage_writes_performed:
   false`, `auth_implemented: false`, `consent_implemented: false`, `production_admission: false`,
   `route_contract_final: false`, `schema_final: false`.
6. **`recall_eligible` is derived, never persisted authority.** Dixie's boolean `recall_eligible` collapses
   a multi-input disposition (assertion status, transition history, relationships, request filters, privacy
   frame, risk) into one bit; the recall-included set is a derived, invalidatable, request/context-dependent
   projection, never the authority (46E §6; 46F §7; 46I §8 item 10; 46K §5).
7. **The non-runtime validator forbidden-key set is hardened; the runtime mirror is not.** Phase 46J added
   the 37 canonical / consent exact-key names (the canonical ref arrays, the signer/receipt/audit refs +
   hash-chain links, the subject mapping, and the consent/auth family — each snake_case and camelCase) to
   `FORBIDDEN_PUBLIC_KEYS` and proved them fail-closed (44/44). The runtime `no-leak.ts` denylist mirror
   was **explicitly deferred**; verified read-only this phase, `no-leak.ts:22-76` lists the Phase 33L
   denylist families but **not** the 37 Phase 46J canonical / consent names. The fixed public-response
   builder (`buildAdmissionSpikePublicResponse`, `public-response.ts:95-116`) emits none of those fields,
   so the runtime gap is latent, not a live leak.
8. **ADR-022E gate #8 is held and the synthetic ledger does not satisfy it; Phase 46L's gate-clearing ADR
   reached HELD.** No durable Dixie admission store, schema, table, or migration exists; the Phase 33Q
   ledger is synthetic, process-local, and non-durable (`admitted-assertion-ledger.ts:28-30`, `:670-673`);
   the final identity binding, idempotency, signer/authority, schema, and receipt semantics remain
   explicitly unresolved (rows F / G / J / O; 33U §4). Phase 46L authored the gate-clearing ADR and reached
   **HELD** because no production adapter was proposed (46L §9). No production adapter has been proposed
   prior to this decomposition.

> **What "accepted facts" do and do not mean.** These are **spike-posture, synthetic-ledger,
> design-vocabulary, vector-surface, non-runtime-validator, and HELD-gate-clearing-ADR** facts. They do
> not constitute a durable store, a proposed production adapter, a frozen schema, a runtime production
> serializer, or any cleared production gate. The §4–§13 decomposition exists precisely because the
> accepted readiness is bounded to the dev/spike/synthetic/non-runtime/decision surface and the production
> durable store — and the production adapter the gate #8 trigger names — is still unresolved under ADR-022E
> gate #8.

---

## 4. Canonical trigger from Phase 46L

This section restates why Phase 46L held gate #8 and frames what Phase 46M adds. It invents no requirement
not present in ADR-022E and ignores none that is present.

**(4.1) The gate #8 trigger is conjunctive (46L §4).** ADR-022E gate #8 ("Production database /
persistence substrate") is held with the trigger (`ADR-022E-phase-22-deferred-features.md:57`): "A
separate ADR proposes the production adapter, cites the relevant sibling-repo handoff packet, and
preserves the ADR-022D receipt and audit-chain invariants," read together with the gate-table preamble
(`:42-46`): "Phase 22 must not advance the feature unless the trigger is satisfied **and** a separate ADR
(or sibling-repo PR under teammate review …) explicitly cites the trigger." Clearing gate #8 therefore
requires **all** of: **(a)** a separate ADR that *proposes the production adapter* (a concrete production
substrate, its physical placement, and enough of the durable data model / schema for the proposal to be
real); **(b)** citation of the relevant sibling-repo handoff packet; **(c)** preservation of the ADR-022D
receipt and audit-chain invariants; plus the explicit trigger-citation.

**(4.2) Phase 46L satisfied the ADR/handoff structure and the invariant preservation at the documentation
level.** Phase 46L was the structural "separate ADR" the trigger names; it cited its sibling handoff
packet (conjunct b, structurally) and recorded the ADR-022D preservation statement (conjunct c — 46L §5).

**(4.3) Phase 46L did not propose the production adapter, so gate #8 remained HELD.** The substantive
conjunct (a) was unmet: Phase 46I had selected only a topology *direction* (Option 4 split storage), an
un-frozen record decomposition, and a recorded ownership boundary, and had left the **physical adapter
placement unresolved** (46I §6) and the **schema / migration plan unaccepted** (46K §9 criteria 3 & 5).
Phase 46L was, by charter, forbidden to resolve the placement, freeze the schema, or claim implementation
readiness — so it could not supply conjunct (a), and it reached **HELD** (46L §9). The sibling handoff
packet correspondingly became a **blocker** packet, not an implementation packet (46L handoff packet §1).

**(4.4) Phase 46M addresses the missing input.** The single missing conjunct is the *proposed production
adapter*: a resolved physical adapter placement plus a decomposed durable schema / migration / backfill /
rollback plan. Phase 46M produces exactly that input, at the architecture / decomposition level — it
selects the safest placement candidate (§5 / §6) and decomposes the schema (§7) and migration (§8)
families — so a **future, re-authored** gate-clearing ADR can genuinely *propose the production adapter*
with conjunct (a) met, then cite the (then implementation-form) sibling handoff packet (conjunct b) and
preserve the ADR-022D invariants (conjunct c), and only then clear gate #8. **Phase 46M does not itself
re-author the gate-clearing ADR and does not clear gate #8** — it produces the decomposition input the
re-authoring will consume (§13).

---

## 5. Adapter placement candidates

This section evaluates the candidate durable-store adapter placements. Each maps onto a Phase 46I §7
topology option where one exists, so a future lane references the prior analysis rather than coining a
parallel one. For each candidate the assessment covers ownership clarity; alignment with the canonical
Straylight semantics/interfaces; preservation of the ADR-022D receipt/audit invariants; Dixie
route-contract responsibilities; sibling-handoff implications; auth/identity binding; consent
proof/receipt persistence; signer/authority persistence; `TransitionReceipt` / `AuditEvent` persistence;
idempotency/replay persistence; public/private projection safety; migration complexity; rollback/failure
risk; blast radius; and the production-readiness gap. **No candidate is claimed to be implemented**; the
disposition selects a *candidate placement direction*, not a build.

### 5.1 Candidate A — Dixie-owned durable-store adapter (46I §7 Option 2)

A durable adapter physically hosted and operated by Dixie for **all** durable records, including a
Dixie-side persistence of canonical assertion / transition / receipt / audit material. **Ownership
clarity:** muddy — it risks Dixie hosting a *parallel canonical* lifecycle, which 46E Options 3/4 reject.
**Alignment:** only acceptable if it is a swap-in of the canonical `StorageAdapter` interface, never a
parallel canonical store (46I §6). **ADR-022D invariants:** the host must preserve append-only,
hash-chained, tamper-detectable audit semantics regardless of placement (§10). **Dixie route-contract
responsibilities:** Dixie already owns the endpoint-local contract / idempotency / replay records and the
projection; this candidate would *add* canonical-store hosting. **Sibling handoff:** would still need gate
#10 (Dixie boundary wiring) and gate #12 (network surface). **Auth/identity, consent, signer,
receipt/audit, idempotency persistence:** all would be Dixie-hosted, concentrating canonical material in
the route boundary. **Public/private projection safety:** no worse than D if the serializer is hardened,
but the blast radius is larger. **Migration complexity / rollback risk / blast radius:** highest — Dixie
would own canonical persistence and its migrations, conflating route and canonical concerns.
**Production-readiness gap:** large. **Disposition: not selected** — over-broad; it absorbs canonical
ownership that belongs to Straylight.

### 5.2 Candidate B — Straylight-owned durable-store adapter (46I §7 Option 3)

Straylight owns and operates the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` persistence;
Dixie integrates at the route boundary via the canonical interface, owning no durable store of its own.
**Ownership clarity:** clean for the canonical half — single canonical owner, no Dixie duplication.
**Alignment:** maximal (it *is* the canonical semantics). **ADR-022D invariants:** preserved at the
canonical owner. **Dixie route-contract responsibilities:** Dixie still needs *somewhere* to persist its
endpoint-local contract / idempotency / replay records and ingress references — which this candidate, by
itself, does not provide; it under-specifies the Dixie-owned half. **Sibling handoff:** the canonical
physical adapter is behind gate #8; Dixie integration behind gate #10. **Auth/identity, consent, signer,
receipt/audit persistence:** the private references live on the canonical record, which is correct, but
the Dixie ingress / idempotency persistence is unaddressed. **Migration complexity:** concentrated in
Straylight. **Rollback risk / blast radius:** low for the canonical half; the Dixie-side gap is the risk.
**Production-readiness gap:** moderate — it is the canonical-semantics dependency direction (46I §7 Option
3 "accepted as the canonical-semantics dependency direction"), but it is **not a complete placement** on
its own. **Disposition: retained as the canonical-semantics dependency that Candidate D is realized
against**, not selected as the standalone placement.

### 5.3 Candidate C — Finn-owned durable-store / projection adapter (46I §7 Option 5)

Defer the durable persistence / projection / audit to a Finn-mediated runtime path. **Ownership clarity:**
canonical semantics still Straylight's; Finn would host the runtime substrate. **Alignment:** acceptable
only as a `StorageAdapter` swap-in in Finn. **ADR-022D invariants:** preserved at the canonical owner;
Finn must carry them. **Dixie route-contract responsibilities:** Dixie remains the route boundary; the
route-owned records still need a home (unaddressed by C alone). **Sibling handoff:** gated by **#9 (Finn
runtime wiring, `:58`)** and **#12 (network surface)**, both held; gate #9's trigger is a triple condition
(placement ADR selects Finn + the `loa-finn` PR opens under teammate review). **Auth/identity, consent,
signer, receipt/audit, idempotency persistence:** Finn-hosted; cross-repo. **Migration complexity /
rollback risk / blast radius:** high and cross-repo; depends on a held sibling gate and an external PR.
**Production-readiness gap:** large — Finn is a *candidate* runtime, not selected; gate #9 is held.
**Disposition: deferred to a future, separately-gated lane** (46I §7 Option 5); it is a legitimate future
hosting of the canonical half, but it cannot be selected now without clearing gate #9.

### 5.4 Candidate D — Split storage: Dixie route-side adapter + Straylight canonical store (46I §7 Option 4) — selected direction

Dixie owns and persists the **endpoint-local contract / idempotency / replay records, ingress references,
and the public/private projection** through a Dixie route-side durable adapter; Straylight owns the
**canonical assertion / transition / receipt / audit store** through the `StorageAdapter` / `AuditLog`
path (Candidate B realized as the canonical half). **Ownership clarity:** cleanest — it is the ownership
split 46E §6 / 46I §6 already decided, with one source of truth for the canonical lifecycle and Dixie
owning only what is genuinely route-contract-bound. **Alignment:** the Dixie route-side adapter is a
swap-in of the canonical `StorageAdapter` interface (`storage/types.ts:15-16`), never a parallel canonical
lifecycle. **ADR-022D invariants:** preserved — the canonical store stays append-only, hash-chained,
tamper-detectable; the consent / auth-decision reference is recorded **privately** onto the canonical
audit record (§10). **Dixie route-contract responsibilities:** exactly the records Dixie already owns
(contract / idempotency / replay / ingress refs / projection). **Sibling handoff:** the canonical-store
physical hosting is behind gate #8 + #9/#10; the Dixie route-side adapter behind gate #10 + #12; this is
the topology the future handoff packet (46K §6.2; 46L handoff packet §2) is shaped for. **Auth/identity,
consent, signer, receipt/audit persistence:** private references on the canonical record (correct);
**idempotency/replay persistence:** Dixie route-side (Row J; the durable replay envelope unresolved).
**Public/private projection safety:** the single public-safe field is `public_receipt_ref` (plus, at most,
a disjoint opaque public-safe consent-receipt reference if a future gate authorizes it — 46H §6.1); all
canonical / consent key names stay private. **Migration complexity:** bounded — Dixie route-side records
are new tables with no production data to backfill; the canonical store's migration trajectory is ADR-022D
§7's "separate ADR + sibling-repo PR." **Rollback/failure risk:** governed by the all-or-none atomicity
invariant (no recallable partial assertion — §8, §10). **Blast radius:** smallest of the building
candidates — it adds no parallel canonical store and minimizes the threat surface (46I §7 Option 4
"minimizes the threat surface"). **Production-readiness gap:** present but the narrowest — placement
direction settled, with the canonical-store physical hosting and the runtime mirror / schema / migration
still future-gated. **Disposition: selected as the proposal-input placement candidate** (§6).

### 5.5 Candidate E — External DB / infrastructure substrate behind the Dixie route only

A production database / infrastructure substrate (e.g. Postgres / WAL) sitting **behind the Dixie route
boundary**, exposed only through the Dixie route-side adapter. **Ownership clarity:** this is a
*realization detail* of Candidate D's Dixie route-side half (and of the canonical half if hosted in
Dixie), not an independent ownership model — `storage/jsonl.ts:1-20` already names "real WAL/DB" as the
production successor to the MVP adapters. **Alignment:** acceptable only as the concrete substrate behind
the `StorageAdapter` swap-in seam. **ADR-022D invariants / projection safety:** identical requirements to
D. **Sibling handoff:** introduces a network/IO surface → gate #12 (network surface) and gate #20
(threat-model widening), both held. **Migration complexity:** highest concrete complexity (schema
versioning, WAL, connection lifecycle) — but all of it is *behind* the adapter and therefore future work.
**Blast radius / production-readiness gap:** the substrate selection (which DB, where hosted, how
operated) is a production-infrastructure decision well downstream of placement. **Disposition: folded into
Candidate D as a future substrate-selection sub-decision**, not selected as a standalone placement now —
naming a concrete DB product would over-reach this decomposition and trip gate #12 / #20.

### 5.6 Candidate F — No adapter yet / remain held (46I §7 Option 1)

Retain the Phase 33Q bounded synthetic ledger + Storage Option A spike and select **no** production
adapter placement. **Ownership clarity:** N/A — nothing durable. **Alignment / invariants / projection:**
the current safe posture, storing nothing durable, leaking nothing (`admitted-assertion-ledger.ts:28-30`,
`:670-673`). **Production-readiness gap:** total — it cannot persist real estate material or satisfy
production recall. **Disposition: retained as the correct interim posture** until a future gate clears the
durable store; **but it is the verdict to choose only if the evidence cannot support selecting a
placement candidate.** Because the evidence *does* support Candidate D (46I §6 / §7 already narrowed it),
F is not the verdict — it remains the current operating posture beneath the selected *direction* (§6.5).

> **Selection summary.** **Candidate D (split storage: Dixie route-side durable adapter + Straylight
> canonical store, realized against Candidate B's canonical semantics, with Candidate E's concrete
> substrate folded in as a future sub-decision and Candidate C's Finn hosting future-gated) is the safest
> placement candidate.** Candidates A and C/E carry larger blast radius or depend on held sibling gates;
> F stores nothing durable. The selection (§6) is a docs/decision-only proposal input; it authorizes no
> build and clears no gate.

---

## 6. Proposed adapter placement

The evidence supports selection (§5), so Phase 46M proposes **Candidate D** as the production adapter
placement candidate for future ADR-022E gate-#8 clearing work. This is the architecture/decomposition-level
proposal input; it is not implementation authorization.

**(6.1) What the adapter would own.** A **Dixie route-side durable adapter** for the Admission Wedge
**route-owned records only**: the endpoint-local route-contract records, the idempotency / replay records
(Row J; the durable replay envelope unresolved), the ingress references onto the canonical chain, and the
public/private response projection state. It is a **swap-in of the canonical Straylight `StorageAdapter`
interface** (`storage/types.ts:15-16`), behind the Dixie route boundary.

**(6.2) What the adapter would not own.** It would **not** own a parallel canonical assertion / transition
/ receipt / audit lifecycle; it would **not** re-mint or redefine `RecallPack` / `RecallReceipt` /
`TransitionReceipt` / `AuditEvent` (ADR-022D §1); it would **not** host the canonical store's authority;
it would **not** persist `recall_eligible` as canonical authority (it stays derived — §7; §12 invariant
15); and it would **not** expose any canonical / consent key name on the public surface.

**(6.3) What Straylight still owns.** The canonical `active` `Assertion`, the first-class
`TransitionReceipt`, the append-only hash-chained `AuditEvent`, their invariants, the six receipt
categories, and the `StorageAdapter` / `AuditLog` interface — all canonical Straylight semantics
(`types.ts:145-167` / `:364-388` / `:514-529`; `audit.ts:77-89`; ADR-022D §1). The canonical store
persists through that path; Dixie holds **ingress references only** (33U Row B).

**(6.4) What Dixie owns; what Finn / sibling runtimes may own only later; what Freeside may not own.**
Dixie owns the route-side records named in 6.1. The **canonical store's physical hosting** (a Straylight
process, a Finn runtime, or a Dixie-hosted adapter implementing `StorageAdapter`) remains a downstream
sub-decision governed by the held sibling gates **#9 (Finn wiring)** and **#10 (Dixie wiring)** and is
**future-gated** — the `StorageAdapter` swap-in seam is exactly what keeps that hosting substitutable
later, so it does not reopen the placement verdict. **Finn or another sibling runtime may later own the
canonical store's hosting and/or projection/audit surfaces only if separately authorized** (gate #9 / #12;
ADR-022D §2). **Freeside Characters may not own any persistence role**: per gate #11 it is a downstream
consumer of governed recall, never a host or a direct-write client; the freeside-characters mirror is
test-only, not exported, not runtime-wired (45J / PR #177).

**(6.5) How the selection preserves ADR-022D invariants.** Candidate D keeps the canonical audit log
append-only, hash-chained, and tamper-detectable via `verifyChain` (`audit.ts:77-89`; ADR-022D §4); keeps
receipt ownership and the six categories with Straylight (ADR-022D §1); re-mints no receipt (Dixie holds
ingress references only — ADR-022D §3); records the auth-decision / consent reference **privately** onto
the canonical audit record so it inherits tamper-evidence without becoming public; and treats each
migration as a "separate ADR + sibling-repo PR" (ADR-022D §7). §10 records each invariant in full.

**(6.6) Why the selection is only a proposal input for a future ADR, not implementation authorization.**
Selecting a placement candidate at the decomposition level supplies the gate #8 trigger's missing first
conjunct (a *proposed* production adapter) so a future ADR can re-author Phase 46L's HELD ADR with conjunct
(a) met. It does **not** itself clear gate #8: clearing requires a *separate, accepted* gate-clearing ADR
(citing the then-implementation-form handoff packet and preserving the ADR-022D invariants), the deferred
runtime no-leak mirror before implementation, and the accepted schema / migration / rollback plan. The
canonical-store physical hosting and the substrate selection (Candidate E) remain future-gated. This phase
proposes a candidate; it does not build it, does not author its schema or migrations, and does not
authorize its implementation.

---

## 7. Schema decomposition

This section decomposes the candidate durable-store schema families a future durable store would carry,
**without creating or freezing schema**. There are **no** field types, keys, indexes, or table definitions
here; those remain a future durable-store design gate + gate-clearing ADR's output (§11). Each family is
marked by canonical owner, public/private classification, MVP-required vs future/post-MVP, authoritative
vs derived, and its migration/backfill and rollback/failure concerns. This refines the 46I §5 / 46K §5
decomposition into schema-family terms; it freezes nothing new.

| Schema family (un-frozen) | Canonical owner | Public/private | MVP-required? | Authoritative / derived | Migration / backfill & rollback / failure concern |
|---|---|---|---|---|---|
| **Candidate memory records** | Dixie | Private (`candidate_id` / `candidate_payload` forbidden public) | MVP-required if candidates are durably staged; may be transient | Authoritative (ingress), **not** an admitted assertion (Row B) | Initial table creation; no production data to backfill; failed admit leaves no recallable residue |
| **Admission transition records** | canonical (Straylight) | Private | MVP-required | Authoritative (append-only `EstateTransition`); Dixie holds ingress ref | Append-only; never rewritten; partial-write fails closed |
| **Admitted assertion records** | canonical | Public exposes only the status-class label `active` | MVP-required | Authoritative `active` `Assertion` (`types.ts:145-167`) | Upsert (latest write wins); no orphaned/partial assertion on failure |
| **Rejection / denial transition records** | canonical / Dixie | Private; public exposes only outcome class `denied` + `safe_reason_code` | MVP-required | Authoritative `TransitionReceipt` kind `denied`; mints **no** assertion | Append-only; reject creates no assertion to roll back |
| **Supersession / correction relation records** | canonical | Private; public exposes only outcome class + recall projection | MVP-required | Authoritative `supersedes_refs` / `linked_assertion_refs`; prior flipped `superseded` | Atomic two-record commit; prior must not remain ordinarily recallable |
| **Idempotency / replay records** | Dixie | Private (idempotency keys forbidden public) | MVP-required | Authoritative (Dixie/endpoint-owned; `idempotency_final: false`, Row J) | Key uniqueness + conflict handling; same-key/different-identity fails closed |
| **TransitionReceipt references** | canonical, private | Private; only `public_receipt_ref` may surface | MVP-required | Authoritative `TransitionReceipt` (`types.ts:364-388`); Dixie stores ingress ref | Upsert; private at any depth |
| **AuditEvent references** | canonical, private | Private; never public at any depth | MVP-required | Authoritative append-only hash-chained `AuditEvent` (`types.ts:514-529`) | Append-only, hash-chained per estate; audit-write failure fails the transition closed |
| **Consent proof references** | Dixie (ingress) | Private | Future / post-MVP (consent unimplemented; un-frozen model) | Authoritative reference on the private audit record; proof material private | Recorded privately; missing/invalid consent fails closed (46H §7) |
| **Consent receipt references** | Dixie (ingress) | Private; at most a disjoint opaque public-safe reference if a future gate authorizes (46H §6.1) | Future / post-MVP | Authoritative private; the public-safe reference is non-operational | Durable mint/resolution without operational-id leakage is future work |
| **Signer / authority references** | canonical, private | Private; never public | MVP-required for production admit (Row F held) | Authoritative `signer_refs` per `SignerCompetenceRule` / `Keyring` / policy | Production signature substrate (ed25519/secp256k1/real-key HMAC) is future (gate #20) |
| **Auth / identity binding references** | Dixie / canonical | Private; all id families forbidden public | MVP-required (Row G held) | Authoritative session-derived binding (`tenant_id` Dixie; `estate_id` / `actor_id` canonical); no caller override | Production tenant/estate/actor binding undefined; spike scoping is non-precedent |
| **Public-safe receipt references** | Dixie, public-safe | **Public-safe** (the single field that crosses); `null` where none | MVP-required | **Derived/public-safe**, never a private receipt id | Durable mint/resolution without operational-id leakage is future work |
| **Private audit / proof material records** | canonical / Dixie | Private; never public, never logged raw | MVP-required | Authoritative private (signatures, signer ids, policy detail, raw candidate/source) | Never surfaced; failure paths leak no internals |
| **Privacy / risk frame records** | canonical / Dixie | Frame inputs private; projection per-request | MVP-required | Authoritative inputs; projection derived per-request | Persist frame inputs, not one frame's baked answer (threat-model T5) |
| **Retention / expiry / revocation / forget markers** | cross-cutting | Boundary only; no public residue | Future / post-MVP (MVP-3-adjacent) | Authoritative markers; representable + fail-closed against append-only chain | Forget/correction against an append-only chain; MVP-3 UI **not** designed here |
| **Tenant / estate / actor partitioning records** | Dixie / canonical | Private; cross-tenant guarantee enforced | MVP-required | Authoritative `(tenant_id, estate_id)` partition; foreign-tenant write fails closed (T6) | Production partitioning is the future binding; spike isolation is non-precedent |
| **Derived recall projection records** | derived | Public **derived signal** only | N/A (derived) | **Derived, non-authoritative**; `recall_eligible` derived at read time, never persisted as authority | Never backfilled as authority; invalidatable per-request (46F §7) |

> **Nothing in §7 is a schema.** The family names exist for decomposition legibility only; Phase 46M
> freezes no durable schema, coins no runtime field, and changes no vector or validator. A future
> durable-store design gate + gate-clearing ADR must produce and accept the final data model, name the
> canonical mappings, and pass an extended (still no-leak-bounded) vector/validator plan before any field
> is authorized. `recall_eligible` is listed as derived and non-authoritative — a binding invariant
> (§12), not a future option.

---

## 8. Migration decomposition

This section decomposes the future migration requirements a durable-store lane would face, **without
creating migrations**. It implements none of them; each remains a future, separately-gated decision, and
each canonical-store migration is — per ADR-022D §7 (`:149-166`) — "a **separate** ADR + sibling-repo PR
under teammate review." Phase 46M authors no migration.

1. **Initial table / storage creation.** A future Dixie route-side durable adapter would create new
   storage for the route-owned records (§7); the canonical store's tables are Straylight's, behind gate #8
   + #9/#10.
2. **No existing production durable Admission Wedge data.** Confirmed: no durable Dixie admission store,
   schema, table, or migration exists (§3 fact 8). Initial creation has **no production data to migrate**.
3. **Migration from synthetic bounded ledger to a real durable store: likely none.** The Phase 33Q ledger
   is a non-production / test seam — process-local, Map-backed, non-durable, cleared on process restart
   (`admitted-assertion-ledger.ts:670-673`). It holds **no** production state, so there is nothing to
   migrate from it; a future lane should treat it as a test seam, not a backfill source. (A future lane
   must confirm this, not assume it.)
4. **Idempotency / replay key uniqueness and conflict migration.** The Dixie-owned idempotency / replay
   records (Row J; `idempotency_final: false`) need a uniqueness constraint and a conflict rule: identical
   retry → same result (no duplicate); conflicting retry under the same key / different identity → **fail
   closed** (46G §7). The durable replay envelope shape is unresolved and is a future decision.
5. **Tenant / estate / actor partitioning.** Production `(tenant_id, estate_id)` partitioning with a
   foreign-tenant / foreign-estate write failing closed (`a.estate_id === request.estate_id`; threat-model
   T6); identity session-derived, never body-trusted (Row G; 46G §5). The spike's tenant scoping is a
   **non-precedent** isolation mechanism, not the production binding.
6. **Retention / expiry / revocation / forget future gates.** How retention, expiry, revocation, and
   forget/correction are **representable** and **fail-closed** against an append-only audit chain
   (46H §6.6; 46I §8 items 6–7) — the *representability + fail-closed* boundary only; the MVP-3
   forget/revoke/correction UI is **not** designed or built here.
7. **Audit / receipt chain preservation across migration.** Any migration must keep the canonical audit
   log append-only, hash-chained, and tamper-detectable via `verifyChain`; the chain is **never rewritten**
   by a migration (ADR-022D §4 / §5; §10 here).
8. **Rollback plan.** A future migration needs a forward-only plan (or an accepted dev-only no-migration
   scope) and a rollback/recovery model that preserves the append-only invariant and leaves no recallable
   partial assertion (item 9).
9. **No partial recallable assertion on failed migration.** A failed or rolled-back migration — like a
   failed admit — must leave **no** recallable partial assertion: indistinguishable, for recall, from one
   that never happened (46K §10).
10. **Staging / dev / operator environment rollout.** Any rollout begins in staging / dev / operator
    environments, kept distinct from production (the dev/operator-vs-production boundary, 46K §9 criterion
    14).
11. **Production rollout is separately gated.** Production rollout of any migration is a distinct, later
    gate; reaching implementation-readiness or authorizing a bounded dev spike does **not** authorize
    production migration or production admission (46K §11).

> **Nothing in §8 is a migration.** Phase 46M authors no migration, creates no table, and writes no DB
> code. It decomposes what a future, separately-gated lane would have to plan; the canonical-store
> migrations remain "separate ADR + sibling-repo PR" (ADR-022D §7), and the production rollout remains
> separately gated.

---

## 9. Runtime no-leak mirror sequencing

Phase 46J hardened the **route-vector validator** (`FORBIDDEN_PUBLIC_KEYS` + 44/44 self-check), not the
runtime serializer. The runtime `no-leak.ts` denylist still lacks the Phase 46J exact-key additions
(verified read-only this phase: `no-leak.ts:22-76` lists the Phase 33L families but **not** the 37 Phase
46J canonical / consent names). Phase 46K decided, and Phase 46L preserved, that the runtime mirror is an
**implementation-authorization** precondition, not a gate-clearing precondition (46K §7; 46L §8). Phase
46M preserves and sequences that decision; it modifies **no** runtime code.

- **Runtime no-leak mirror hardening remains required before implementation authorization / any
  pre-implementation work** that begins emitting canonical / consent refs internally — because the moment
  durable-store runtime code emits those fields, the serializer must forbid them on the public surface or
  risk a live leak (46K §7 reasons 1–3).
- **Phase 46M does not modify runtime `no-leak.ts`.** It changes no runtime code; the latent runtime gap
  (the fixed serializer emits none of the 37 names — §3 fact 7) is unchanged.
- **Phase 46M does not claim runtime leakage is solved.** The non-runtime validator hardening (46J) is
  the *contract*-layer evidence only; the runtime serializer must separately enforce the *behavior*, and
  the runtime half is still owed.
- **The future adapter proposal must include a runtime public/private projection hardening plan.** The
  selected Candidate D placement (§6) carries, as a hard implementation precondition, the production
  no-leak serializer plus the deferred runtime `no-leak.ts` exact-key mirror with matching runtime
  fixtures, proven fail-closed, **before** any durable-store route/storage code is authorized (§11
  blocker; 46K §9 criterion 11).

---

## 10. ADR-022D invariant preservation

The gate #8 trigger's third conjunct requires the (future) gate-clearing ADR to **preserve the ADR-022D
receipt and audit-chain invariants**. The selected Candidate D placement (§6) and the §7 / §8 schema /
migration decomposition preserve each of the following; any future proposal, design, or implementation
lane must carry each forward unchanged. Phase 46M preserves all of them; it implements none and weakens
none.

- **Governed persistence / audit ownership.** The shape, fields, invariants, and emission rules of
  `RecallPack` / `RecallReceipt` / `TransitionReceipt` / `AuditEvent` stay Straylight-owned, with the six
  receipt categories (included / excluded / redacted / challenged / revoked / blocked-by-policy) preserved
  unchanged; Dixie holds ingress references only and re-mints nothing (ADR-022D §1 / §3, `:47-68` /
  `:84-108`; 33U Row B).
- **No orphaned or partial recallable assertion.** A transition + assertion + receipt + audit write either
  all commit or none do; a failed or rolled-back admit leaves no recallable partial assertion (§8 item 9;
  46K §10).
- **Replay / idempotency safety.** Identical retry → same result (no duplicate); conflicting retry under
  the same key / different identity → fail closed (Row J; 46G §7).
- **Public / private projection safety.** Only `public_receipt_ref` (string or `null`) — and at most a
  disjoint opaque public-safe consent-receipt reference if a future gate authorizes it (46H §6.1) — crosses
  to the public surface; every canonical / consent key name stays private (the non-runtime validator is
  hardened; the runtime mirror is owed — §9).
- **Audit / receipt integrity.** The canonical audit log is append-only, hash-chained per estate, and
  tamper-detectable via `verifyChain` (`audit.ts:77-89`; ADR-022D §4, `:109-127`); a consent /
  auth-decision reference recorded onto it inherits that tamper-evidence without becoming public.
- **Fail-closed behavior.** Missing policy denies; unknown class fails class validation; unknown signer
  fails competence; revoked / forgotten / private / contested material does not surface as usable; a
  malformed / unsafe payload fails closed (ADR-022D §4; classifier + ledger fail-closed behavior, §3 fact
  1).
- **No raw / private / audit / debug / source / auth / signer / consent / storage leakage.** Enforced at
  the contract layer by the public-surface walk + `FORBIDDEN_PUBLIC_KEYS` (hardened by 46J) + substring /
  regex / UUID / opaque-run walks; the runtime serializer mirror is owed before implementation (§9).

> **ADR-022D is preserved, not cleared.** Recording that the selected placement and the schema / migration
> decomposition preserve the ADR-022D invariants satisfies the gate #8 trigger's *third* conjunct only.
> Phase 46M supplies the *first* conjunct's input (a proposed placement + schema/migration decomposition),
> but a future, separately-accepted gate-clearing ADR must combine the three conjuncts to clear gate #8
> (§4, §13).

---

## 11. Implementation-readiness blockers after Phase 46M

Even with a placement candidate selected (§6), the following remain **blocked** after this phase; each is
a future, separately-gated requirement that Phase 46M does **not** satisfy. Phase 46M advances only the
paper trail (the placement candidate + schema/migration decomposition that becomes gate #8 conjunct a's
input).

| # | Remaining blocker | Status after Phase 46M |
|---|---|---|
| 1 | **ADR-022E gate #8 cleared.** | **Held.** Gate #8 remains HELD until a future re-authored gate-clearing ADR meets conjunct (a) and is **accepted** (§4, §13); gates #9 / #10 / #11 / #12 / #15 / #20 remain held. |
| 2 | **Runtime `no-leak.ts` mirror hardening.** | **Unsatisfied.** Deferred; owed before implementation authorization (§9; 46K §7). |
| 3 | **Implementation-readiness acceptance.** | **Unsatisfied.** This phase decomposes; it does not accept readiness (46K §4.7). |
| 4 | **Actual schema / migration design (final data model).** | **Unsatisfied.** §7 / §8 decompose families and requirements; they freeze no schema and author no migration. |
| 5 | **Durable-store implementation.** | **Unsatisfied / blocked.** No store, schema, table, or store code is created. |
| 6 | **DB writes.** | **Blocked.** No DB write is permitted by this phase; `storage_writes_performed: false` on every vector. |
| 7 | **Route / API behavior changes.** | **Blocked.** The route handler is unchanged; the Phase 33N dev/operator-only, disabled-by-default spike remains the only authorized route surface. |
| 8 | **Auth / consent implementation.** | **Blocked.** Auth is not implemented; consent is not implemented; Rows F / G held. |
| 9 | **Production admission.** | **Blocked.** Production admission remains a later, distinct gate (46K §11). |
| 10 | **Public `remember-this`.** | **Blocked.** No public / unauthenticated remember-this surface; direct public/client storage writes rejected (46I §7 Option 6). |
| 11 | **Discord / freeform ingestion; user chat becoming memory.** | **Blocked.** Consent is never inferred from chat text (46H §4.5). |
| 12 | **Route-contract freeze.** | **Blocked.** `route_contract_final: false`; a final route-contract pre-freeze gate is a distinct later step. |
| 13 | **Final schema freeze.** | **Blocked.** `schema_final: false`; this phase freezes no schema. |

> Listing the blockers is not satisfying them. The two artifacts this phase produces — the placement
> candidate and the schema / migration decomposition — are *authored as a decomposition input*, **not**
> accepted, frozen, implemented, or used to clear gate #8. Every blocker above remains its own
> separately-authorized future gate.

---

## 12. Required invariants preserved

Phase 46M preserves **all** of the following (each already enforced in synthetic / spike / vector /
non-runtime-validator form where cited; any future placement proposal, gate-clearing ADR, design, or
implementation lane must carry each forward unchanged):

1. **A pending candidate is not recallable.** Only active, recall-eligible assertions enter the recall
   projection; the pending vector has empty recall and `public_receipt_ref: null`.
2. **A rejected candidate creates no admitted assertion.** reject vector
   `expected_private_or_audit_effect.no_admitted_assertion = true`; `synthTransitionFor` returns no
   transition for reject (`admission-intake.ts:162-167`).
3. **An accepted candidate creates / references an admitted assertion.** accept vector
   `admitted_assertion_status_class = "active"`; the candidate→transition→assertion chain intent.
4. **A superseded assertion is excluded from ordinary recall** unless explicitly requested/marked.
   Supersession flips the prior to `superseded` / `recall_eligible: false`
   (`admitted-assertion-ledger.ts:883-888`).
5. **A malformed / unsafe payload fails closed.** malformed vector `must_fail_closed = true`; the
   classifier accepts only the five forms and fails closed otherwise (`classifier.ts:185-195`).
6. **Missing / unauthorized auth fails closed.** Disabled → 404, unauthorized → 403, malformed → 400; one
   stable refusal that never reveals which gate failed; both-empty rejects all
   (`admission-intake.ts:276-332`; `auth-gate.ts:66-96`).
7. **Missing / invalid consent fails closed in any future production admission model.** Missing,
   malformed, subject-mismatched, scope-mismatched, expired, revoked, replayed, or signer-invalid consent
   fails closed and mints no admitted assertion (46H §7); service-token / operator auth is never treated
   as consent.
8. **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
   material.** Enforced by the public-surface walk + `FORBIDDEN_PUBLIC_KEYS` (strengthened with the
   canonical / consent key names — Phase 46J) + substring / regex / UUID / opaque-run walks; the runtime
   mirror is owed before implementation (§9).
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
14. **Route-contract freeze and final schema freeze remain blocked unless separately authorized.**
    `route_contract_final` / `schema_final` false on every vector; Phase 46M freezes neither.
15. **`recall_eligible` remains derived / non-authoritative; never persisted as canonical authority**
    (§7; 46F §7).
16. **ADR-022E gate #8 remains held unless a future ADR clears it.** Phase 46M selects a placement
    candidate and clears nothing; the related gates #9 / #10 / #11 / #12 / #15 / #20 remain held.
17. **Auditability without rewriting history.** The canonical audit log is append-only, hash-chained, and
    tamper-detectable via `verifyChain` (`audit.ts:77-89`; ADR-022D §4, `:109-127`); a consent /
    auth-decision reference recorded onto it inherits that tamper-evidence without becoming public.

---

## 13. Next lane and dependency ordering

The charter asks Phase 46M to select one safe next lane. Because a placement candidate is now selected
(§6) and the schema / migration families are decomposed (§7 / §8), the gate #8 trigger's missing first
conjunct now has a docs/decision-only *input*. The lowest-blast-radius next step is to consume that input
in a re-authored gate-clearing ADR. Direct durable-store implementation is **not** a candidate: this phase
provides no implementation-authorization gate, and the §11 blockers are unsatisfied.

> **Selected next lane: re-author the ADR-022E gate-#8 gate-clearing ADR + sibling handoff packet using
> the Phase 46M selected production-adapter placement (Candidate D) + schema / migration decomposition, so
> the gate #8 trigger's first conjunct (a *proposed production adapter*) is met. Docs/decision-only; not
> runtime; not implementation; clears gate #8 only when itself authored and accepted, citing the
> (then-implementation-form) sibling handoff packet and preserving the ADR-022D invariants.**

**Reason.** Phase 46L reached HELD solely because conjunct (a) was unmet (§4). Phase 46M produces the
named input (placement + schema/migration decomposition). The disciplined next step is to re-author the
gate-clearing ADR — a paper artifact that emits nothing and therefore needs neither the runtime mirror nor
the build first — with conjunct (a) now met, then re-evaluate gate #8. Phase 46L's HELD ADR + blocker
handoff packet are the structure that re-authoring consumes.

**Why not the alternatives:**

- **A runtime `no-leak.ts` mirror hardening gate is not the immediate step** — it is an
  *implementation-authorization* precondition (§9; 46K §7), downstream of clearing; running it before the
  re-authored gate-clearing ADR would invert the established sequencing. Recorded as a documented
  companion (step 11 below).
- **A durable-store implementation-readiness acceptance gate is premature now** — it best ratifies the
  §11 / 46K §9 checklist against the concrete re-authored gate-clearing ADR, so it follows step 10, not
  precedes it. Recorded as a documented alternative (step 12 below).
- **A further discriminator gate is not warranted** — the placement candidate is selected (§6); the only
  residual openness (canonical-store physical hosting) is governed by the held sibling gates #9 / #10 and
  is future-gated by design, not a reason to re-decompose already-legible work.
- **Direct durable-store implementation is not a candidate** — no artifact authorizes it; the §11 blockers
  are unsatisfied and gate #8 is held.

**Dependency ordering after Phase 46M** (carried from 46L §13; 46L's step 9 — this placement +
schema/migration decomposition — is now done, and step 10's re-authored gate-clearing ADR becomes the
selected next lane):

1. Phase 46E — durable storage **model direction** decided. *(Done; PR #150.)*
2. Phase 46F — durable storage **shape & route-vector alignment** decided. *(Done; PR #151.)*
3. Phase 46G — **auth / identity / signer** authority decided. *(Done; PR #152.)*
4. Phase 46H — **consent proof / receipt** decided. *(Done; PR #153.)*
5. Phase 46I — **durable-store design / decomposition + ADR-022E gate #8 boundary**. *(Done; PR #154.)*
6. Phase 46J — **non-runtime consent/storage vector/validator alignment**. *(Done; PR #155.)*
7. Phase 46K — **durable-store implementation-readiness decomposition**. *(Done; PR #156.)*
8. Phase 46L — **ADR-022E gate-#8 gate-clearing ADR (HELD) + sibling handoff packet (blocker)**. *(Done;
   PR #157.)*
9. **Phase 46M — durable-store production-adapter placement + schema / migration decomposition.** *(This
   gate — docs/decision-only; no vector/validator/runtime change; gate #8 not cleared; Candidate D
   selected as the conjunct-(a) input.)*
10. **Re-authored ADR-022E gate-#8 gate-clearing ADR + sibling handoff packet** — re-authors Phase 46L's
    HELD ADR with conjunct (a) met (citing the Phase 46M placement + schema/migration decomposition),
    citing the then-implementation-form handoff packet, preserving the ADR-022D invariants; it clears the
    gate only once itself authored and accepted. *(Selected next lane — docs/decision-only.)*
11. **Runtime `no-leak.ts` exact-key mirror hardening lane** — adds the deferred runtime mirror + matching
    runtime fixtures, before implementation authorization (§9; 46K §7). *(Documented companion;
    implementation precondition.)*
12. **Durable-store implementation-readiness acceptance gate** — ratifies the §11 / 46K §9 checklist
    against the concrete re-authored gate-clearing ADR. *(Documented alternative / companion.)*
13. **Final route-contract pre-freeze gate.**
14. **Schema / migration design gate** — the final data model, schema versioning, and migration plan
    (§7 / §8), behind the re-authored gate-clearing ADR. *(Held; downstream.)*
15. **Bounded default-off implementation spike** — only if the §11 / 46K §9 checklist is satisfied and a
    future ADR has cleared gate #8.
16. **Smoke / acceptance gate.**
17. **Freeside Characters client-contract handoff** (incl. the consent UX; 46H §12 criterion 8).

> **Implementation remains downstream.** Steps 10–17 are each held. The only step Phase 46M advances is
> **step 9** — selecting the placement candidate and decomposing the schema / migration families — which
> is itself docs/decision-only. **Runtime implementation is not the next step, and a passing gate-clearing
> ADR is not this document.**

---

## 14. Blocked lanes

Phase 46M is a bounded, docs/decision-only production-adapter placement + schema / migration decomposition
gate. It authorizes **none** of the following; each remains **blocked** and is **not** unblocked by
selecting a placement candidate or decomposing the schema / migration families:

- durable Admission Wedge storage implementation (ADR-022E gate #8 held); DB writes; migrations; a durable
  data model, schema, or table definition; storage is not implemented;
- clearing ADR-022E gate #8 (this gate selects a placement candidate only) or the related gates #9 / #10 /
  #11 / #12 / #15 / #20;
- the **runtime `no-leak.ts` mirror hardening** (deferred; owed before implementation authorization —
  §9 / §11) — Phase 46M changes no runtime code and does not modify runtime `no-leak.ts`;
- production auth implementation; the production caller/auth model; auth is not implemented; cross-user
  admission;
- production consent implementation; consent-proof / consent-receipt model selection or build; consent is
  not implemented;
- production identity binding (tenant / estate / actor); identity binding is not finalized;
- production signer / authority semantics; the production signature substrate (ed25519 / secp256k1 /
  real-key HMAC);
- final idempotency / replay semantics (Dixie / endpoint-owned; undecided; Row J);
- route / API handler implementation **beyond the existing Phase 33N spike**; production admission;
- public `remember-this`; Discord command / history ingestion; user chat becoming memory; consent inferred
  from chat text; direct public/client storage writes (46I §7 Option 6);
- Freeside Characters runtime / client integration; the consent UX; package exports; Freeside
  runtime/client behavior; LLM / voice / Finn runtime behavior;
- the final Dixie route contract; route-contract freeze; production route deployment;
- production readiness of any kind; final / production schema freeze; an implementation-readiness claim;
- MVP 3 forget / revoke / correction UI; persisting `recall_eligible` as canonical authority; freezing the
  physical durable adapter placement; selecting the canonical-store physical hosting (future-gated by
  #9 / #10); naming or provisioning a concrete external DB substrate (Candidate E; gate #12 / #20);
- **any mutation of the five route-vector JSONs, the route-vector validator, the route-vector README, the
  Phase 33E fixtures, or the Phase 33E fixture validator** (§1).

> **A placement + schema / migration decomposition authorizes no runtime implementation and clears no
> gate.** Selecting a candidate placement and decomposing the schema / migration families makes the
> conjunct-(a) input legible and names the next docs lane; it does **not** build a store, **not** author a
> schema or migration, **not** clear any production gate, **not** re-author the gate-clearing ADR, **not**
> harden the runtime mirror, **not** implement auth or consent, **not** bind production identity, **not**
> implement signer semantics, **not** freeze the route contract or schema, and **not** authorize any route
> / storage / auth / consent / Freeside / package-export work. The Phase 33N dev/operator-only,
> disabled-by-default spike remains the only authorized route surface, and the do-nothing / synthetic-only
> posture (46E Option 6; 46I §7 Option 1) remains in force.

If a later phase reaches for any of the above, it must re-open the Phase 33K precondition design, the
Phase 33M authorization gate, the Phase 33P / 33Q / 33R storage lane, the Phase 33U / 33V chain, the Phase
46A–46L gates and this gate, and the relevant ADRs (Straylight-repo ADR-022E durable-store gate #8 and
related gates #9 / #10 / #11 / #12 / #15 / #20; ADR-022D receipt/audit-chain invariants; ADR-026C /
ADR-026D route guardrails) first; it must not silently expand scope.

---

## 15. Corruption / duplicate guard

Phase 46M applies an explicit corruption / duplicate guard to **this** document (carried from the Phase
46E / 46F / 46G / 46H / 46I / 46J / 46K / 46L precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 18.`) appears exactly
  once.
- **Numbered sections appear once each.** Sections 1–18 each appear exactly once; the guard counts
  `^## N\.` occurrences and asserts one per number.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" token, a
  trailing one-word report heading, prose-claim dumps, or pasted terminal transcript appears in the
  document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row; no duplicated
  / truncated / wrapped table fragments appear.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is the §16
  validation command list.

The guard commands and their recorded results are in §16.

---

## 16. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46M is
docs/decision-only — it adds only this document and mutates no vector, validator, or fixture — so the
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
# New-untracked-doc whitespace check (no-index; `|| true` because a missing/clean file is fine):
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md || true
# Self-reference / next-lane label check (grep -E so `|` is real alternation):
grep -E "Phase 46L|Phase 46M" docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md
# Duplicate/corruption grep (advisory):
grep -nE "Claude said|Patch Report|terminal report|RESULT:|Report$" docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md || true
# Enforcing negative check — fail if any affirmative gate-clearing / build / freeze / implementation /
# authorization claim appears in PROSE. The patterns are affirmative-only and word-boundaried, so the
# document's negated prose ("remains HELD", "does not clear", "is not authorized", "is not frozen",
# "storage is not implemented") and the fenced validation commands below are deliberately NOT matched.
# It selects a placement CANDIDATE (verdict a), so the patterns avoid "candidate is selected" language and
# target only over-claims this docs-only phase must not make. It is NOT masked with `|| true`:
python3 - <<'PY'
import re
from pathlib import Path
p = Path("docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md")
patterns = [
    r"\bgate #8 is cleared\b",
    r"\bADR-022E gate #8 is cleared\b",
    r"\bgate #8 is hereby cleared\b",
    r"\bgate #8 is now cleared\b",
    r"\bclears gate #8\b(?!\s+only when)",
    r"\bthe production adapter is adopted\b",
    r"\bthe production adapter is implemented\b",
    r"\bthe production adapter is built\b",
    r"\bthe placement candidate is implemented\b",
    r"\bruntime implementation is selected\b",
    r"\bimplementation is authorized\b",
    r"\bimplementation-readiness is accepted\b",
    r"\breadiness is accepted\b",
    r"\broute contract is frozen\b",
    r"\bschema is frozen\b",
    r"\bfinal schema is frozen\b",
    r"\bthe schema is final\b",
    r"\bstorage is implemented\b",
    r"\bthe durable store is built\b",
    r"\bmigration is applied\b",
    r"\bis production[- ]ready\b",
    r"\bproduction[- ]readiness is (?:declared|achieved|confirmed|established|met)\b",
    r"\bdb writes? (?:is|are) authorized\b",
    r"\bvectors? (?:was|were) (?:modified|mutated|changed)\b",
    r"\bvalidator (?:was|were) (?:modified|mutated|changed)\b",
    r"\bruntime (?:code|source|mirror) (?:was|were) (?:modified|mutated|changed|hardened|completed)\b",
    r"\bauth is implemented\b",
    r"\bconsent is implemented\b",
    r"\bidentity binding is (?:final|frozen|finalized|implemented)\b",
    r"\bthe physical adapter placement is (?:frozen|finalized|implemented)\b",
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
print("The enforcing scan found no affirmative gate-clearing/build/freeze/implementation/authorization claims outside fenced validation commands.")
PY
# Fence-balance check (dependency-free; even count = balanced; char-code form avoids embedding
# a literal triple-backtick that would unbalance this doc):
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

Recorded results for this lane (the captured terminal output accompanies this work):

- **docs-only scope check** — only the single new file
  `docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md` is added; no
  route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator,
  `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, runtime, or generated file is
  touched;
- **no admission-wedge artifact changed** — `git diff --name-only -- docs/admission-wedge/` lists nothing
  (the new doc lives at `docs/`, not under `docs/admission-wedge/`), confirming no vector JSON, validator,
  README, or fixture was modified;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no `git add` / commit / push);
  `git diff --check` and `git diff --cached --check` report no whitespace errors; the no-index whitespace
  check on the new doc reports no errors;
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes
  valid, 0 failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures,
  no sixth vector**; the `--self-check` harness reports **44/44** cases behaving as required (42
  fail-closed negative mutations + 2 exact-key no-overmatch guards);
- **self-reference label check** — `grep -E "Phase 46L|Phase 46M"` confirms both the `Phase 46L`
  (predecessor) and `Phase 46M` (self) labels are present;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the eighteen headings 1–18
  exactly once each;
- **duplicate/corruption grep** — the advisory grep finds no pasted terminal-report fragment in the
  document body;
- **negative gate-clearing-claim check (enforcing)** — the `python3` scan excludes fenced lines and reports
  the affirmative-only, word-boundaried patterns (gate-clearing / build / freeze / implementation /
  authorization claims) found no match outside the fenced validation commands; the document's **negated**
  prose (the HELD posture, the placement-candidate selection) is correctly not matched. The scan is not
  masked with `|| true`;
- **fence-balance check** — the dependency-free `node -e` counter reports an even (balanced)
  triple-backtick count; the single fenced block is the validation command list above.

---

## 17. Success criteria for Phase 46M

Phase 46M succeeds if and only if:

1. **Docs / decision-only** — it creates only this Phase 46M document; it changes **no** route-vector
   JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, runtime
   source, test, route, store, migration, auth, consent, config, env, package, lockfile, CI, or generated
   file, and edits **no** adjacent repository (§1).
2. **Status and verdict stated** — Phase 46M is docs/decision-only, not an implementation PR, not a
   migration PR, not the gate-clearing ADR; it does not clear gate #8; it decomposes the production
   adapter placement + schema/migration proposal; and it gives the charter-option-(a) verdict (a placement
   candidate selected; gate #8 HELD) (§1).
3. **Evidence intake recorded** — the Dixie chain (33K → … → 46L), the canonical Straylight substrate, and
   PR #157 as the latest checkpoint, with what each established (§2).
4. **Canonical trigger from Phase 46L restated** — the conjunctive gate #8 trigger; why 46L satisfied the
   ADR/handoff structure + invariant preservation but not conjunct (a); why gate #8 remained held; and
   that Phase 46M supplies the missing placement + schema/migration input (§4).
5. **Adapter placement candidates evaluated** — Dixie-owned (A), Straylight-owned (B), Finn-owned (C),
   split storage (D), external DB behind Dixie route (E), and no-adapter/remain-held (F), each assessed
   across ownership, alignment, invariants, route responsibilities, sibling handoff, auth/identity,
   consent, signer, receipt/audit, idempotency, projection, migration, rollback, blast radius, and
   readiness gap, with no candidate claimed implemented (§5).
6. **Proposed adapter placement stated** — Candidate D selected as the proposal input, with what it owns /
   not owns / what Straylight / Dixie / Finn-sibling-later / Freeside-never own, ADR-022D preservation,
   and why it is only a proposal input not implementation authorization (§6).
7. **Schema decomposed** — the candidate / transition / assertion / denial / supersession / idempotency /
   TransitionReceipt / AuditEvent / consent-proof / consent-receipt / signer / auth-identity /
   public-safe-receipt / private-audit / privacy-risk-frame / retention-revocation-forget /
   tenant-estate-actor / derived-recall families, each marked by owner, public/private, MVP-required,
   authoritative/derived, and migration/rollback concern; no schema frozen (§7).
8. **Migration decomposed** — initial creation, no-existing-production-data, synthetic-ledger-not-a-source,
   idempotency uniqueness/conflict, partitioning, retention/expiry/revocation/forget gates, audit/receipt
   chain preservation, rollback plan, no-partial-recallable-assertion, staging/dev rollout, and
   separately-gated production rollout; no migration created (§8).
9. **Runtime no-leak mirror sequenced** — required before implementation authorization, not modified here,
   not claimed solved, and required in the future adapter proposal (§9).
10. **ADR-022D invariants preserved** — governed persistence/audit ownership; no orphaned/partial
    recallable assertion; replay/idempotency safety; public/private projection safety; audit/receipt
    integrity; fail-closed behavior; no leakage (§10).
11. **Implementation-readiness blockers listed** — gate #8 held; runtime mirror; readiness acceptance;
    schema/migration design; durable-store implementation; DB writes; route/API behavior; auth/consent;
    production admission; public remember-this; Discord/freeform ingestion; route-contract freeze; final
    schema freeze — none satisfied by this phase (§11).
12. **Invariants restated** — the seventeen-item invariant list, including `recall_eligible` derived and
    gate #8 held unless a future ADR clears it (§12).
13. **Next lane selected + ordering updated** — the re-authored ADR-022E gate-#8 gate-clearing ADR +
    sibling handoff packet selected (consuming the Candidate D placement + schema/migration decomposition);
    the runtime mirror and readiness-acceptance gates recorded as companions; a further discriminator gate
    and direct implementation rejected; the post-46M ordering recorded with implementation downstream
    (§13).
14. **Blocked lanes preserved** — no durable / DB-write / migration / schema / gate-clearing / runtime-
    mirror / auth / consent / identity / signer / route / Freeside / package / production-readiness lane is
    authorized, and no vector / validator / fixture is mutated (§14).
15. **Corruption / duplicate guard applied** — the document passes the §15 guard, with results recorded in
    §16.
16. **No freeze, no production-readiness claim, no gate clearance, no implementation authorization** —
    Phase 46M freezes neither the route contract nor the schema, declares no production readiness, does
    **not** clear ADR-022E gate #8, and does **not** authorize implementation (§1, §6, §11, §14).

---

## 18. Cross-references

- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md)
  — Phase 46L (PR #157); its §9 reached the **HELD** verdict (conjunct (a) unmet) and its §13 step 9 named
  this Phase 46M placement + schema/migration decomposition lane; this gate produces the missing conjunct
  (a) input it will re-author against.
- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-SIBLING-HANDOFF-PACKET.md)
  — Phase 46L blocker handoff packet; its §2 ownership boundaries and §5 item 1 ("durable-store
  production-adapter placement + schema / migration decomposition gate … required before the gate-clearing
  ADR can be re-authored to pass") ground §5 / §6 / §13 here.
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md)
  — Phase 46K (PR #156); its §5 record families, §6.2 handoff-packet contents, §7 runtime-mirror
  sequencing, §9 checklist (criteria 3 & 5 unsatisfied), and §10 failure/rollback rows ground §7 / §8 /
  §9 / §11 here.
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
  — Phase 46I (PR #154); its §5 fourteen durable records, §6 ownership/adapter boundary (incl. the
  route-side-adapter swap-in narrowing), §7 topology options (Option 4 split storage selected as the
  direction; Option 6 reject direct public/client writes), and §8 migration/lifecycle preconditions ground
  §5 / §6 / §7 / §8 here.
- [`docs/ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 46J (PR #155); the non-runtime validator no-leak hardening (37 exact-key additions; 44/44
  self-check) and the deferred runtime `no-leak.ts` mirror ground §3 fact 7 / §9.
- [`docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
  — Phase 46H (PR #153); the consent boundary, the consent-proof object model, the 10-case failure
  taxonomy, and the §6.1 disjoint public-safe consent-receipt reference ground §5 / §7.
- [`docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
  — Phase 46G (PR #152); the session-derived identity binding, the `subject_refs` mapping, the signer
  competence model, and the replay/idempotency interaction ground §5 / §7 / §8.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V (PR #140); the `AuditEvent` / `TransitionReceipt` split, `public_receipt_ref`, the
  `privacy_scope` + frame projection boundary, and the undesigned migration/backfill/rollback grounding
  §7 / §8.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U (PR #139); the A–O reconciliation (rows F / G / J / O held; ADR-022E gates #8 / #10 / #12 /
  #20 held; Row B ingress-refs-only) grounding §2 / §3 / §5.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs` with the
  five vector JSONs — inspected **read-only** to ground the no-leak boundary, the `FORBIDDEN_PUBLIC_KEYS`
  set (hardened by 46J), the false flags, the no-sixth-vector lock, and the 44/44 self-check. **None is
  modified.**
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/{auth-gate,classifier,public-response,no-leak,admitted-assertion-ledger}.ts`
  — inspected **read-only** to ground the §3 spike facts (the env flag at `admission-intake.ts:16`, the
  404/403/400 fail-closed refusals at `:276-332`, the dev/operator headers, the supersession flip at
  `admitted-assertion-ledger.ts:883-888`, the no-DB/file/socket/timer property at `:28-30` / `:670-673`),
  the §9 runtime-mirror-deferral verification (`no-leak.ts:22-76` lists the Phase 33L families but not the
  37 Phase 46J names; `public-response.ts:95-116` emits none of them), and the §12 invariants. **None is
  modified.**
- `loa-straylight/src/straylight/types.ts`, `loa-straylight/src/straylight/storage/types.ts`,
  `loa-straylight/src/straylight/storage/in-memory.ts`, `loa-straylight/src/straylight/storage/jsonl.ts`,
  `loa-straylight/src/straylight/audit.ts`,
  `loa-straylight/docs/decisions/{ADR-022D,ADR-022E}-…md`,
  `loa-straylight/docs/handoffs/cross-repo-handoff-index.md` — inspected **read-only** as the **canonical**
  Straylight substrate cited in §2.2 / §4 / §5 / §6 / §8 / §10 (the gate #8 trigger at
  `ADR-022E-phase-22-deferred-features.md:57`, the preamble at `:42-46`, the sibling gates #9 `:58` / #10
  `:59` / #11 `:60` / #12 `:61` / #15 `:64` / #20 `:69`; the ADR-022D invariants at `:47-68` / `:84-108` /
  `:109-127` / `:129-136` / `:138-148` and the migration trajectory at `:149-166`; `verifyChain` at
  `audit.ts:77-89`; the `StorageAdapter` surface at `storage/types.ts:33-68` and the swap-in seam at
  `:15-16`; `InMemoryStorage` at `in-memory.ts:1-3` and `JsonlStorage` at `jsonl.ts:1-20`; the
  `Assertion` / `TransitionReceipt` / `AuditEvent` primitives at `types.ts:145-167` / `:364-388` /
  `:514-529`). **Not edited by this phase.**
- `@loa/straylight` — canonical primitive / substrate owner; PR #65 (merged) answered the A–O primitive
  review. Straylight-repo ADR-022E (durable-store gate #8 + related gates #9 / #10 / #11 / #12 / #15 / #20,
  **held**), ADR-022D (receipt/audit-chain invariants), ADR-026C, ADR-026D are decision records cited as
  guardrails. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — the cross-repo acceptance whose
  mirror/adapter is test-only, not exported, not runtime-wired; Freeside remains a client/handoff surface,
  never the canonical durable store and never a persistence owner (§5.4 / §6.4); the consent-UX /
  client-contract handoff stays deferred (§13 step 17). **Not edited by this phase.**
