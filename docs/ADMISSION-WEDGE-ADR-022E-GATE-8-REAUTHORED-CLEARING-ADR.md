# Phase 46N — Admission Wedge ADR-022E Gate #8 Re-authored Gate-Clearing ADR

> **Phase**: 46N
> **Branch context**: `phase-46n-admission-adr-022e-gate-8-reauthor`
> **Sibling document**: [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md)
> (the re-authored sibling handoff packet authored in the same phase; the gate #8 trigger requires the
> gate-clearing ADR to cite a sibling-repo handoff packet, and §4 / §9 explain why, under this ADR's
> verdict, that packet becomes an **active-for-downstream-gated-work** packet — not an implementation
> packet).
> **Related**: Phase 46M durable-store production-adapter placement + schema/migration decomposition (PR
> #158,
> [`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md)
> §6 / §7 / §8 / §13, which selected **Candidate D** as the production-adapter placement candidate and
> decomposed the durable schema / migration families, and named **this** re-authored gate-clearing ADR +
> sibling handoff packet as its next lane); Phase 46L ADR-022E gate-#8 gate-clearing ADR (**HELD**) +
> blocker-only sibling handoff packet (PR #157,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md)
> §9 / §13 step 9 +
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-SIBLING-HANDOFF-PACKET.md));
> Phase 46K durable-store implementation-readiness decomposition (PR #156,
> [`ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md));
> Phase 46J consent/storage vector & validator alignment (PR #155,
> [`ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md));
> Phase 46I durable-store design + ADR-022E gate #8 decision (PR #154,
> [`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md));
> Phase 46H consent proof / receipt (PR #153); Phase 46G auth / identity / signer authority (PR #152);
> Phase 46F durable storage shape & route-vector alignment (PR #151); Phase 46E durable storage model
> (PR #150); Phase 46D storage/auth/consent acceptance (PR #149); Phase 46C storage/auth/consent blocker
> decomposition (PR #148); Phase 46B route-contract implementation-readiness decomposition (PR #147);
> Phase 46A route-vector alignment acceptance (PR #146); Phase 33Z route-vector alignment (PR #144) + its
> PR #145 next-lane label/provenance correction; Phase 33Y route-contract revision acceptance (PR #143);
> Phase 33X route-contract revision draft (PR #142); Phase 33V storage/auth/consent design finalization
> (PR #140); Phase 33U Straylight-response intake (PR #139); Phase 33R bounded-ledger acceptance (PR #136);
> Phase 33Q bounded synthetic admitted-assertion ledger (PR #135); Phase 33P storage/receipt hardening
> (PR #134); Phase 33N dev/operator-only route spike; Phase 33M dev/operator route-spike authorization
> gate; Phase 33K storage/auth/consent precondition design; Phase 33L route-contract test-vector fixture
> draft; Straylight (`@loa/straylight`) PR #65 (A–O primitive-review verdicts, **merged**); Straylight-repo
> ADR-022E durable-store gate #8 (and related gates #9 / #10 / #11 / #12 / #15 / #20), **held**;
> Straylight-repo ADR-022D MVP-persistence / audit-owner invariants; ADR-026C / ADR-026D route guardrails;
> freeside-characters Phase 45J / PR #177 (Dixie v1 mirror-refresh acceptance, merged 2026-06-06).
> **Status**: **docs / decision-only.** This ADR adds **only this document** and its sibling handoff
> packet. It changes **no** route-vector JSON, **no** route-vector validator, **no** route-vector README,
> **no** Phase 33E fixture or fixture validator, and **no** runtime source, test, route, route handler,
> storage, store code, DB write, migration, auth, consent, package export, config, env, package, lockfile,
> CI, generated file, or binary. No adjacent repository (`loa-straylight`, `freeside-characters`) is
> touched.
> **This is the re-authored ADR-022E gate-#8 gate-clearing ADR. Its verdict is that ADR-022E gate #8 is
> CLEARED *as a documentation / architecture / handoff prerequisite only*** — because, with Phase 46M's
> Candidate D placement now selected and the schema / migration families decomposed, this ADR now
> *proposes the production adapter* (conjunct a), cites the re-authored sibling handoff packet (conjunct
> b), and preserves the ADR-022D receipt / audit-chain invariants (conjunct c). The clearing is tightly
> bounded (§1 / §9): it does **not** authorize durable-store implementation, DB writes, migrations,
> route / API behavior changes, auth or consent implementation, production admission, public
> remember-this, Discord / freeform ingestion; it does **not** freeze the route contract or the final
> schema; it does **not** claim production readiness; and it does **not** claim the runtime `no-leak.ts`
> mirror is complete. The related sibling gates #9 / #10 / #11 / #12 / #15 / #20 remain **held**, and the
> Straylight-side operative production-feature unblocking still requires the separate-ADR / sibling-repo-PR
> **under Straylight teammate review** pathway the ADR-022E preamble names (§4.7).

Every assessment below is grounded read-only against the actual Dixie repo (the Phase 46E / 46F / 46G /
46H / 46I / 46J / 46K / 46L / 46M gates + the 46L sibling handoff packet, the Phase 33K precondition / 33M
authorization / 33N spike / 33P–33R storage lane, the Phase 33U / 33V chain, the **five** route-vector
JSONs, the route-vector validator and its README, and the Phase 33N spike source under
`app/src/services/admission-wedge-spike/` plus the route handler `app/src/routes/admission-intake.ts`) and
read-only against the **canonical** Straylight (`@loa/straylight`) substrate (`src/straylight/types.ts`,
`src/straylight/storage/types.ts`, `src/straylight/audit.ts`, and
`docs/decisions/ADR-022D…` / `ADR-022E…`, `docs/handoffs/cross-repo-handoff-index.md`). Where a claim could
not be grounded in the read material, it is marked as such. Phase 46N changes no technical artifact; the
validators are run only to confirm the unchanged artifacts remain green (§16).

---

## 1. Status and verdict

Phase 46N is the bounded, docs/decision-only **re-authored ADR-022E gate-#8 gate-clearing ADR** that
follows, and is named by, Phase 46M
([`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md)
§13 step 10, PR #158). Phase 46L authored the first gate-clearing ADR + sibling handoff packet and reached
a **HELD** verdict, because the gate #8 trigger's first conjunct — a separate ADR that *proposes the
production adapter* — was unmet: the physical adapter placement and the durable schema / migration plan
were future-gated (46L §9). Phase 46M then executed the lane 46L named: it evaluated the candidate adapter
placements (46M §5), selected **Candidate D** (split storage — a Dixie route-side durable adapter for the
Admission Wedge route-owned records, realized against the canonical Straylight `StorageAdapter` semantics,
with the canonical assertion / transition / receipt / audit store remaining Straylight-owned and the
canonical-store physical hosting + concrete substrate future-gated) at the architecture / decomposition
level (46M §6), and decomposed the durable schema families (46M §7) and the future migration requirements
(46M §8) — producing the gate #8 trigger's missing first-conjunct input. Phase 46N executes 46M's named
next lane: it re-authors the gate-clearing ADR with Candidate D as the *proposed production adapter*,
applies the conjunctive gate #8 trigger to the now-complete evidence, and reaches the verdict the evidence
now supports.

> **Verdict: ADR-022E gate #8 is CLEARED — as a documentation / architecture / handoff prerequisite
> only.** With Phase 46M's Candidate D placement selected and the schema / migration families decomposed,
> the gate #8 trigger's three conjuncts are now all satisfiable by this ADR (§9.1): **(a)** this ADR
> *proposes the production adapter* — Candidate D, shaped as a swap-in of the canonical Straylight
> `StorageAdapter` interface (§3 / §9.1); **(b)** it cites the re-authored sibling handoff packet
> (conjunct b — §4 / §9.1); and **(c)** it preserves the ADR-022D receipt and audit-chain invariants
> (conjunct c — §5). The preamble's explicit-trigger-citation requirement is met by §4.1 quoting the
> trigger verbatim. Gate #8 is therefore cleared at the level this ADR is competent to clear it: the
> **documentation / architecture / handoff prerequisite**.

**What this clearing is — stated narrowly and exactly.** Because the gate #8 trigger is now satisfied at
the documentation / architecture / handoff level, this ADR clears gate #8 **only** as that prerequisite.
It clears **nothing else.** Specifically, this clearing:

- clears **only** ADR-022E gate #8 as a documentation / architecture / handoff prerequisite — the
  paper-level "a separate ADR proposes the production adapter, cites the handoff packet, and preserves the
  ADR-022D invariants" requirement;
- does **not** authorize durable-store implementation, a durable store, schema, table, or store code;
- does **not** authorize DB writes;
- does **not** authorize migrations;
- does **not** authorize route / API behavior changes (the Phase 33N dev/operator-only, disabled-by-default
  spike remains the only authorized route surface);
- does **not** authorize auth or consent implementation;
- does **not** authorize production admission;
- does **not** authorize public `remember-this`;
- does **not** authorize Discord / freeform ingestion, and does **not** let user chat become memory merely
  because it was said;
- does **not** freeze the route contract;
- does **not** freeze the final schema;
- does **not** claim production readiness of any kind;
- does **not** claim the runtime `no-leak.ts` exact-key mirror hardening is complete — it remains the
  deferred implementation-authorization precondition Phase 46J / 46K / 46L / 46M recorded (§8, §11).

**What the CLEARED verdict means for this ADR and its sibling packet.** Because gate #8 is cleared at the
documentation / architecture / handoff level:

- this ADR is the **passing** re-authored gate-clearing ADR — it records that the gate #8 trigger's three
  conjuncts are now met for the paper-level prerequisite, and pins exactly what each downstream gate must
  still satisfy before any build (§9, §10, §11);
- the re-authored sibling handoff packet authored alongside it becomes an **active-for-downstream-gated-
  work** packet — it records ownership boundaries and the obligations a future implementation packet must
  preserve, and may be cited by the next *gated paper / implementation-readiness* lanes; it still
  authorizes **no** implementation, **no** cross-repo wiring, and **no** build (handoff packet §1, §4);
- the related sibling gates **#9 (Finn wiring), #10 (Dixie boundary wiring), #11 (Freeside-as-consumer),
  #12 (network surface), #15 (sibling-repo edits), #20 (threat-model widening)** remain **held**, each with
  its own trigger (§4.6);
- the **operative Straylight-side production unblocking** — the gate-table preamble's "trigger satisfied
  **and** a separate ADR (or sibling-repo PR under teammate review per the cross-repo handoff index)
  explicitly cites the trigger" pathway (ADR-022E:42-46) — still requires Straylight teammate review and
  acceptance; this Dixie docs-only ADR clears the *documentation / architecture / handoff prerequisite*
  Dixie is competent to author, not the Straylight-owned operative gate (§4.7).

**Why CLEARED is the evidence-honest verdict now, where HELD was the evidence-honest verdict in 46L.** The
single thing 46L lacked was conjunct (a) — a *proposed production adapter*. 46L could not supply it because
the placement was unresolved and the schema / migration plan was future-gated (46L §9.2). Phase 46M was
chartered precisely to resolve that: it *selected* Candidate D as the placement candidate (46M §6) and
*decomposed* the schema (46M §7) and migration (46M §8) families, explicitly "producing the missing
conjunct-(a) input for a future, re-authored gate-clearing ADR" (46M §1). The canonical gate #8 trigger
asks for a separate ADR that *proposes the production adapter* (`ADR-022E-phase-22-deferred-features.md:57`)
— it does **not** ask for a frozen substrate, a frozen schema, a resolved canonical-store physical host, or
an implemented serializer as *clearing* preconditions. Those are downstream of clearing by the canonical
substrate's own design: ADR-022D §2 (`:79-82`) makes the production adapter a `StorageAdapter` *swap-in
seam*, and ADR-022D §7 (`:149-166`) places the concrete substrate + each migration in a *separate
downstream ADR + sibling-repo PR under teammate review*. Reading those downstream artifacts back into the
gate #8 *clearing* condition would invent a requirement ADR-022E does not contain — which the charter
(and 46L §4.5 / 46M §4.5) forbids as strictly as it forbids ignoring a present requirement. A re-authored
ADR that *proposes* Candidate D as a concrete `StorageAdapter`-swap placement, cites the handoff packet,
and preserves the ADR-022D invariants therefore *does* meet the trigger at the paper level — so the
evidence-honest verdict is CLEARED, tightly scoped.

> **A gate-clearing ADR that clears the documentation / architecture / handoff prerequisite authorizes no
> runtime work and builds no store.** Phase 46N records, on paper, that the gate #8 trigger's three
> conjuncts are now met for the paper-level prerequisite, what the proposed adapter is, and what every
> downstream gate must still satisfy before any build. The output is a decision recorded on paper, not a
> built store, not a frozen schema, not an applied migration, not an implemented serializer, and not an
> authorization to implement. A future, separately-gated lane must still (a) harden the deferred runtime
> `no-leak.ts` exact-key mirror before implementation authorization, (b) author and accept the final data
> model / schema / migration / rollback plan, (c) route the operative production unblocking through
> Straylight teammate review per the preamble + cross-repo handoff index, and (d) only then authorize any
> build.

---

## 2. Source chain (evidence intake)

This ADR sits one rung above the Phase 46M production-adapter placement + schema/migration decomposition on
the Dixie route-contract ladder, and it is the **re-authored gate-clearing ADR / sibling handoff packet**
sub-step 46M named (46M §13 step 10). It introduces no new contract or vector material; it consumes the
storage / auth / consent decision cluster (46E / 46F / 46G / 46H), the durable-store design / decomposition
(46I), the non-runtime validator hardening (46J), the implementation-readiness decomposition (46K), the
first (HELD) gate-clearing ADR + blocker handoff packet (46L), the production-adapter placement + schema /
migration decomposition (46M), the prior precondition / authorization / spike / storage lanes, and the
canonical Straylight substrate to apply the gate #8 trigger to the now-complete evidence.

### 2.1 Dixie (loa-dixie) — the storage / auth / consent and route-contract lanes

| Phase | PR | Artifact / contribution (relevant to the re-authored gate #8 clearing determination) |
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
| 46L | #157 | **ADR-022E gate-#8 gate-clearing ADR (HELD) + sibling handoff packet (blocker).** Applied the conjunctive gate #8 trigger to the evidence; reached **HELD** because conjunct (a) — *propose the production adapter* — was unmet (physical placement + schema/migration future-gated); recorded the ADR-022D preservation statement (conjunct c) and the sibling handoff packet citation (conjunct b, structurally); the handoff packet became a **blocker** packet; named the Phase 46M placement + schema/migration decomposition lane (§13 step 9). |
| 46M | #158 | **Durable-store production-adapter placement + schema/migration decomposition.** Evaluated candidates A–F (§5); selected **Candidate D** (split storage; Dixie route-side adapter as a `StorageAdapter` swap-in; Straylight canonical ownership preserved; canonical-store hosting + concrete substrate future-gated) as the production-adapter placement candidate (§6); decomposed the durable schema families (§7) and migration requirements (§8) without freezing schema or authoring a migration; preserved the ADR-022D invariants (§10); **named this re-authored gate-clearing ADR + sibling handoff packet as the next lane (§13 step 10)** as the lane that consumes Candidate D to meet conjunct (a). |
| **46N** | *(this doc)* | **Re-authored ADR-022E gate-#8 gate-clearing ADR.** Records the source chain (§2) and accepted facts (§3); quotes the gate #8 requirement (§4); records the ADR-022D invariants to preserve (§5); grounds the determination in the accepted evidence chain (§6); summarizes the Phase 46M Candidate D intake (§7); explains the Phase 46J runtime no-leak distinction (§8); reaches the **CLEARED (docs / architecture / handoff prerequisite only)** verdict by applying the trigger to the now-complete evidence (§9); records what clearing allows downstream (§9.6); preserves the blocked durable-store lanes (§10); restates the future implementation prerequisites (§11); restates the invariants (§12); selects the next lane (§13); preserves the blocked lanes (§14). Mutates **no** vector / validator / fixture / source. |

> **PR-number provenance note.** The PR numbers above are taken from the local git merge-commit history
> (`docs: … (#NNN)` subjects) and the Phase 46A–46M source-chain tables. Phase 46M's `#158` is the merge
> commit `49df2588 "docs: decompose Admission Wedge production adapter (#158)"`; Phase 46L's `#157` is
> `9a18f37c "docs: hold Admission Wedge ADR 022E gate 8 (#157)"`. Treat the PR numbers as git-sourced
> rather than as authority embedded in the gate bodies (each gate refers to itself only as "this doc").

### 2.2 Canonical Straylight substrate (`@loa/straylight`) — read-only

The durable substrate that ADR-022E gate #8 governs is **canonical Straylight semantics**, read-only here
to ground the §4 / §5 / §9 determination. The adjacent `loa-straylight` repo is the canonical evidence
(Dixie's mirror modules are parity evidence only, never canonical proof — ADR-022D).

- **The append-only, hash-chained audit substrate and the current-state assertion surface are
  Straylight-owned interfaces.** The `StorageAdapter` interface declares the record families — current-
  state assertions (upsert; status changes write a new version), append-only transitions, transition
  receipts, and append-only **hash-chained-per-estate** audit events
  (`loa-straylight/src/straylight/storage/types.ts`); `verifyChain` detects a tampered chain by a
  `previous_audit_hash` mismatch (`audit.ts:77-89`). The interface header records that "async adapters
  (real SQL/Postgres in Dixie or Finn) replace this interface in a later phase" — i.e., the production
  adapter is a **swap-in replacement** of this interface, not a third MVP adapter
  (`storage/types.ts:15-16`; ADR-022D §2, `:79-82`).
- **Canonical `Assertion`, `TransitionReceipt`, `AuditEvent` are distinct Straylight-owned primitives.**
  `Assertion` carries `status` (incl. `active` / `superseded`), `supersedes_refs`,
  `linked_assertion_refs`, `subject_refs` (optional), `privacy_scope`, and `recall_scope`
  (`types.ts:145-167`). `TransitionReceipt` carries `transition_id`, `audit_event_ref`, `signer_refs`,
  `reasons`, `metadata`, and `receipt_hash` (`types.ts:364-388`). `AuditEvent` carries `transition_id`,
  `assertion_refs`, `signer_refs`, `policy_decision_ref`, `previous_audit_hash`, and `audit_hash`
  (`types.ts:514-529`).
- **ADR-022E gate #8 is held with a conjunctive trigger that names the production adapter.** Gate **#8
  (Production database / persistence substrate)**: "`InMemoryStorage` and `JsonlStorage` are the MVP
  adapters. | A separate ADR proposes the production adapter, cites the relevant sibling-repo handoff
  packet, and preserves the ADR-022D receipt and audit-chain invariants"
  (`loa-straylight/docs/decisions/ADR-022E-phase-22-deferred-features.md:57`). The gate-table preamble
  requires that "Phase 22 must not advance the feature unless the trigger is satisfied **and** a separate
  ADR (or sibling-repo PR under teammate review per [the cross-repo handoff index]) explicitly cites the
  trigger" (`ADR-022E…:42-46`). The siblings that gate any Dixie durable *wiring* are **#9** (Finn runtime
  wiring, `:58`), **#10** (Dixie boundary wiring, `:59`), **#11** (Freeside as a consumer, not a host,
  `:60`), **#12** (network surface, `:61`), **#15** (sibling-repo edits, `:64`), and **#20** (threat-model
  widening, `:69`), each held. PR #65 cleared none of these gates.
- **ADR-022D pins the receipt/audit-chain invariants the gate-clearing ADR must preserve, and defers the
  production substrate to a downstream separate ADR.** ADR-022D §1 pins ownership of `RecallPack` /
  `RecallReceipt` / `TransitionReceipt` / `AuditEvent` to Straylight and preserves the six receipt
  categories (`ADR-022D-mvp-persistence-and-audit-owner.md:47-67`); §2 records that "**No production
  database is wired by Phase 22A. No new storage adapter is authored.** The `StorageAdapter` interface
  remains the swap-in seam for a future Postgres / sibling-runtime substrate" (`:69-82`); §3 records the
  host is a persistence/exposure surface, not the semantic owner (`:84-108`); §4 elevates five audit-chain
  integrity invariants to the MVP host contract (`:109-127`); §5 keeps `AuditEvent` Straylight-owned and
  unmigrated (`:129-136`); §6 keeps commitment-root publication deferred (`:138-148`); §7 records that
  each migration (persisting `AuditEvent` / `TransitionReceipt` in a runtime substrate, exposing receipts
  through a Dixie BFF surface, adopting a Hounfour `AuditEvent` schema) is "a **separate** ADR +
  sibling-repo PR under teammate review" (`:149-166`).

### 2.3 Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts, reconciled by 33U.** PR #65 clarified the
  *vocabulary / design* only; it cleared **no** independent production gate and authorized **no** Dixie
  runtime, production storage / auth / consent, or Freeside integration. The still-held rows are **F, G, J,
  and O** (33U §4); the gate #8 clearing here is the *documentation / architecture / handoff prerequisite*,
  not an operative clearing of those rows (§4.7).
- **Residual legacy marker prose.** The `[E,G,H,K,N,O]` / `[J]` marker arrays in the vector JSONs and the
  spike classifier comments are **preserved legacy vector/runtime markers, not the current review-state
  authority**; the authoritative classification lives in the route-vector README current-state correction
  (its §7). Phase 46N preserves that distinction and mutates no technical artifact.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the freeside-characters 34-/45-series, and
> Straylight's ADR / PR labels are independent labels in separate repositories and must not be conflated.
> `46N` signals **no** new product epoch and **no** scope expansion — it is the same Admission Wedge arc,
> still docs/decision-only. The Straylight ADR-022E "Phase 22" gate numbering is the *Straylight* repo's
> phase namespace, distinct from Dixie's 46-series; "Phase 22A does not author the production adapter" is a
> Straylight-side statement about Straylight's own work, which this Dixie placement *proposal* respects by
> proposing a `StorageAdapter`-swap candidate and leaving the operative wiring + substrate to the held
> sibling gates (§4.6 / §9.6).

---

## 3. Starting accepted facts

These are facts **already accepted** by the chain (33K / 33M / 33U / 33V / 46C / 46D / 46E / 46F / 46G /
46H / 46I / 46J / 46K / 46L / 46M), re-verified read-only here as the baseline the §4–§13 determination is
measured against. None is changed by this ADR.

1. **The only authorized route surface is the Phase 33N dev/operator-only spike, and it stores nothing
   durable.** It mounts only when `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (default off), uses **Storage
   Option A** (no durable store, no DB writes, no migrations), and rollback is trivial because there is no
   durable state to roll back. It does **not** authorize production admission / storage / auth / consent.
2. **The durable storage model *direction* and *shape* are decided, the topology is selected, and — now —
   a placement candidate is proposed; the build is not.** Phase 46E selected current-state projection +
   append-only hash-chained audit log on the canonical Straylight semantics/interfaces; Phase 46F aligned
   that shape onto the five vectors docs-only; Phase 46I selected **Option 4 (split storage)** as the
   topology *direction*; Phase 46M selected **Candidate D** as the production-adapter placement candidate
   and decomposed the schema / migration families. None built a store, authored a schema, or applied a
   migration.
3. **The auth / identity / signer and consent boundaries are decided on paper, not built.** Phase 46G
   recorded the service-auth boundary, the session-derived identity binding (no caller override), the
   policy/keyring-decided signer competence, and the replay/idempotency interaction; Phase 46H recorded the
   consent boundary, the consent-proof object model (un-frozen), the consent-receipt public/private
   boundary, and the 10-case consent failure taxonomy. Auth is not implemented; consent is not implemented;
   both reference *what is persisted* and therefore depend on the durable-store design.
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
   projection, never the authority (46E §6; 46F §7; 46I §8 item 10; 46K §5; 46M §7).
7. **The non-runtime validator forbidden-key set is hardened; the runtime mirror is not.** Phase 46J added
   the 37 canonical / consent exact-key names (the canonical ref arrays, the signer/receipt/audit refs +
   hash-chain links, the subject mapping, and the consent/auth family — each snake_case and camelCase) to
   `FORBIDDEN_PUBLIC_KEYS` and proved them fail-closed (44/44). The runtime `no-leak.ts` denylist mirror was
   **explicitly deferred**; verified read-only this phase, `no-leak.ts` lists the Phase 33L denylist
   families but **not** the 37 Phase 46J canonical / consent names. The fixed public-response builder
   (`buildAdmissionSpikePublicResponse`) emits none of these fields, so the runtime gap is latent, not a
   live leak.
8. **ADR-022E gate #8 was held through Phase 46L; Phase 46M produced the missing conjunct-(a) input.** No
   durable Dixie admission store, schema, table, or migration exists; the Phase 33Q ledger is synthetic,
   process-local, and non-durable; the final identity binding, idempotency, signer/authority, schema, and
   receipt semantics remain explicitly unresolved (rows F / G / J / O; 33U §4). Phase 46L reached **HELD**
   because no production adapter had been proposed (46L §9); Phase 46M then selected **Candidate D** as the
   production-adapter placement candidate (46M §6), supplying the input this ADR consumes.

> **What "accepted facts" do and do not mean.** These are **spike-posture, synthetic-ledger,
> design-vocabulary, vector-surface, non-runtime-validator, and placement-candidate** facts. They do not
> constitute a durable store, a built adapter, a frozen schema, a runtime production serializer, or any
> *operative* cleared production gate. The §4–§9 determination clears only the **documentation /
> architecture / handoff prerequisite** form of gate #8 precisely because the accepted readiness is bounded
> to the dev/spike/synthetic/non-runtime/decision surface, while the build, the substrate, the canonical-
> store host, the runtime mirror, and the Straylight operative review pathway remain future-gated.

---

## 4. ADR-022E gate #8 requirement

This section quotes the gate #8 requirement, confirms which preconditions it does and does not impose, and
is the basis for the §9 determination. It invents no requirement not present in ADR-022E and ignores none
that is present.

**(4.1) The gate #8 trigger (quoted).** ADR-022E gate #8, "Production database / persistence substrate," is
held with the trigger (`loa-straylight/docs/decisions/ADR-022E-phase-22-deferred-features.md:57`):

> "A separate ADR proposes the production adapter, cites the relevant sibling-repo handoff packet, and
> preserves the ADR-022D receipt and audit-chain invariants."

and the gate-table preamble (`ADR-022E…:42-46`):

> "Each row is a **gate**: Phase 22 must not advance the feature unless the trigger is satisfied **and** a
> separate ADR (or sibling-repo PR under teammate review per [the cross-repo handoff index]) explicitly
> cites the trigger."

**(4.2) The trigger decomposes into three conjuncts plus a citation requirement.** Reading the trigger and
preamble together, clearing gate #8 requires **all** of:

1. **A separate ADR that *proposes the production adapter*.** This is the substantive conjunct: a concrete
   production persistence adapter must be *proposed*. What "propose" requires is set by the canonical
   substrate, which frames the production adapter as a **swap-in replacement** of the `StorageAdapter`
   interface (`storage/types.ts:15-16`; ADR-022D §2, `:79-82`) — so a real proposal names the placement
   (which side owns the adapter), names the interface it swaps in against, and identifies enough of the
   durable record families for the proposal to be concrete. It does **not** require a frozen physical
   substrate, a frozen schema, or a resolved canonical-store physical host — ADR-022D §7 (`:149-166`)
   explicitly places those in *downstream* separate ADRs + sibling-repo PRs (§4.5).
2. **Citation of the relevant sibling-repo handoff packet.** The separate ADR must cite a handoff packet
   establishing the cross-repo wiring contract (this ADR cites its re-authored sibling handoff packet — §7
   / §13).
3. **Preservation of the ADR-022D receipt and audit-chain invariants.** The proposed substrate must keep
   the audit log append-only, hash-chained, and tamper-detectable, and the receipt-ownership / six-category
   invariants intact (§5).

Plus, per the preamble: the separate ADR (this repo's ADR or a sibling-repo PR under teammate review) must
**explicitly cite** the trigger — which this ADR does (quoting it in 4.1).

**(4.3) Gate #8 does require a separate ADR and a sibling handoff packet.** Confirmed: the trigger names "a
separate ADR" and a "sibling-repo handoff packet" explicitly. This ADR is the separate ADR (re-authored
from 46L's structure with conjunct (a) now met) and its sibling document is the handoff packet; the §9
determination turns on conjunct (a) being met by the Phase 46M Candidate D proposal.

**(4.4) Gate #8 does require ADR-022D invariant preservation.** Confirmed (conjunct 3); §5 records the
exact invariants and states they are preserved by the proposed Candidate D placement and by any future
production substrate.

**(4.5) What gate #8 does *not* require (no invented requirements).** ADR-022E gate #8 does **not** by its
own text require, as a *clearing* precondition: a frozen route contract; a frozen final schema beyond what
"proposes the production adapter" implies (which the canonical substrate makes a *swap-in proposal*, not a
frozen schema — §4.2 conjunct 1); a resolved canonical-store physical host; a selected concrete external DB
substrate; an implemented runtime serializer; or a completed runtime `no-leak.ts` mirror. Those are
downstream of clearing — ADR-022D §7 (`:149-166`) makes the concrete substrate + migration a *separate
downstream ADR + sibling-repo PR*, and 46K §7 / 46L §8 made the runtime mirror an
implementation-authorization precondition. This ADR does not impose them as gate #8 clearing conditions; it
records them as later prerequisites (§11). Equally, this ADR does **not** ignore the present requirement
that the separate ADR *propose the production adapter* — it satisfies it with Candidate D (§9.1).

**(4.6) The related sibling gates remain held independently.** Gate #8 governs the *persistence substrate
proposal*; the *wiring* of that substrate into a Dixie / Finn host with a network surface is separately
gated by #9 (Finn wiring, `:58`), #10 (Dixie boundary wiring, `:59`), #11 (Freeside-as-consumer, `:60`),
#12 (network surface, `:61`), #15 (sibling-repo edits, `:64`), and #20 (threat-model widening, `:69`), each
with its own trigger and each held. This ADR clears **none** of them and proposes no wiring; the
canonical-store physical hosting (Straylight process / Finn / Dixie-hosted adapter) stays governed by #9 /
#10 (§9.6).

**(4.7) What this Dixie ADR clears, and what it cannot.** The preamble's operative production-feature
unblocking pathway is "the trigger is satisfied **and** a separate ADR (or sibling-repo PR under teammate
review per the cross-repo handoff index) explicitly cites the trigger" (`ADR-022E…:42-46`). Gate #8 is a
**Straylight-owned** gate (it governs the canonical Straylight persistence substrate). The *operative*
unblocking of the Straylight production feature therefore requires the separate-ADR / sibling-repo-PR to be
**under Straylight teammate review and accepted** per the cross-repo handoff index, reinforced by ADR-022D
§7's "separate ADR + sibling-repo PR under teammate review" for each migration. A Dixie docs-only,
un-PR'd, un-reviewed phase cannot, by itself, discharge that operative Straylight-side gate. **This is why
the verdict (§1, §9) clears gate #8 *as a documentation / architecture / handoff prerequisite only*** — the
paper-level "a separate ADR proposes the production adapter, cites the handoff packet, and preserves the
ADR-022D invariants" requirement that Dixie *is* competent to author — and explicitly does **not** claim to
discharge the Straylight-side operative gate or to authorize any production feature. The operative clearing
remains a future Straylight-reviewed event (§11, §13).

---

## 5. ADR-022D invariant preservation

The gate #8 trigger's third conjunct requires the separate ADR to **preserve the ADR-022D receipt and
audit-chain invariants**. This section records the exact invariants — using the actual ADR-022D language —
that this ADR preserves and that the proposed Candidate D placement, and any future production substrate
proposed under gate #8, must carry forward unchanged. Phase 46N preserves all of them; it implements none
and weakens none. These are carried in substance from 46M §10, re-grounded here against the actual ADR-022D
text.

**(5.1) Receipt / audit-event ownership (ADR-022D §1, `:47-67`).** The **shape, fields, invariants, and
emission rules** of `RecallPack`, `RecallReceipt`, `TransitionReceipt`, and `AuditEvent` are owned by
Loa-Straylight; no sibling repo redefines them. The six receipt categories — **included / excluded /
redacted / challenged / revoked / blocked-by-policy** — are preserved unchanged. *Preserved:* Candidate D
keeps the canonical assertion / transition / receipt / audit store Straylight-owned; Dixie holds ingress
references only and re-mints no receipt (§3 fact 4; 33U Row B; 46M §6.2 / §6.3).

**(5.2) The MVP endpoint host does not own receipts (ADR-022D §3, `:84-107`).** Whichever host serves
recall "must serve `RecallPack` + `RecallReceipt` outputs the wedge already produced," must **not** re-mint
receipts, must **not** redefine the shape, and must enforce "no recall without receipt; no leakage of
private estate material; no surfacing of challenged / revoked / forgotten material as ordinary active
context; no model-summary-as-canonical-truth." *Preserved:* the Candidate D Dixie route-side adapter
persists only the endpoint-local contract / idempotency / replay records, ingress references, and the
public/private projection; it surfaces only `public_receipt_ref` (and, at most, a disjoint opaque
public-safe consent-receipt reference if a future gate authorizes it — 46H §6.1); it re-mints nothing
(46M §6.1 / §6.2).

**(5.3) Audit-chain integrity invariants — the host's contract (ADR-022D §4, `:109-127`).** ADR-022D
elevates these Phase-5-hardening invariants to the MVP host contract:

1. **Missing policy denies (fail-closed).**
2. **Unknown class fails class validation.**
3. **Unknown signer fails competence.**
4. **Revoked / forgotten / private / contested do not surface as `usable`.**
5. **Tampered audit chains are detectable via `verifyChain`** (`audit.ts:77-89`).

*Preserved:* each is reflected in the §12 invariants and in the §10 failure/rollback posture carried from
46K §10 / 46M §8. A consent / auth-decision reference recorded onto the audit record inherits this
tamper-evidence without becoming public (§12 invariant 17).

**(5.4) `AuditEvent` stays Straylight-owned; commitment-root stays deferred (ADR-022D §5 / §6,
`:129-148`).** The `AuditEvent` shape stays Straylight-owned and unmigrated at MVP; public anchoring /
commitment-root publication remains deferred (ADR-020E's seven future-requirement gates unsatisfied).
*Preserved:* Candidate D adopts no Hounfour `AuditEvent` candidate, proposes no anchor surface, and promotes
no commitment root.

**(5.5) Migration trajectory is a separate ADR + sibling-repo PR (ADR-022D §7, `:149-166`).** ADR-022D
states each migration (persisting `AuditEvent` chains / `TransitionReceipt`s in a runtime substrate,
exposing receipts through a Dixie BFF surface, adopting a Hounfour `AuditEvent` schema) is "a **separate**
ADR + sibling-repo PR under teammate review." *Preserved:* this ADR advances none of them; it records that
the concrete substrate selection and each migration are exactly such future separate ADRs (§9.6, §11). This
is the canonical hook that makes the Candidate D *placement proposal* legitimately clearable while the
substrate / schema / migration remain downstream — they are *meant* to be downstream by ADR-022D's own
design (§4.5).

> **ADR-022D is preserved, not amended.** Recording that this ADR preserves the ADR-022D invariants
> satisfies the gate #8 trigger's *third* conjunct. Combined with the now-met conjunct (a) (the Candidate D
> proposal) and conjunct (b) (the handoff-packet citation), the trigger is satisfied at the documentation /
> architecture / handoff level (§9).

---

## 6. Evidence chain grounding the determination

The gate #8 clearing determination (§9) is grounded in the accepted evidence chain below. Each rung is a
docs/decision artifact; the chain now culminates in a *proposed production adapter* (Candidate D, 46M). The
chain is summarized here so the determination cites concrete predecessors rather than asserting from
memory.

| Evidence rung | What it established | What it did **not** establish |
|---|---|---|
| **Phase 33N route spike** (PR #132) | The dev/operator-only, disabled-by-default route surface; Storage Option A (no durable store); the runtime no-leak guard mirroring the Phase 33L denylist. | No production admission; no durable store; no production adapter. |
| **Phase 33Q bounded synthetic ledger** (PR #135) | A bounded, process-local, non-durable, synthetic-only test seam; supersession flips prior to `superseded`. | No durable persistence; no schema; no production store. |
| **Phase 33U Straylight response intake** (PR #139) | Rows F / G / J / O held; Row B ingress-refs-only; ADR-022E gates #8 / #10 / #12 / #20 held. | Cleared no operative gate; proposed no adapter. |
| **Phase 33V design finalization** (PR #140) | `AuditEvent` / `TransitionReceipt` split; `public_receipt_ref`; the `privacy_scope` + frame projection boundary. | Left migration / backfill / rollback **undesigned**. |
| **Phase 33X / 33Y / 33Z** (PR #142–#144) | Route-contract revision + the five-vector / validator alignment + the `--self-check` harness. | `route_contract_final: false`; `schema_final: false`. |
| **Phase 46A / 46B** (PR #146 / #147) | Accepted the vector alignment; judged the storage/auth/consent cluster the upstream dependency. | Accepted no implementation readiness. |
| **Phase 46C / 46D** (PR #148 / #149) | Decomposed and sequenced the held storage/auth/consent blockers; selected 46E as the deepest per-area gate. | Cleared no blocker. |
| **Phase 46E** (PR #150) | The storage **model direction** (current-state projection + append-only hash-chained audit log on canonical Straylight semantics). | Left the storage **shape** undecided and the **physical adapter placement** unresolved. |
| **Phase 46F** (PR #151) | The storage **shape ↔ vector** alignment; `recall_eligible` derived; first recorded the canonical-ref-array hardening gap. | Changed no vector / validator; proposed no adapter. |
| **Phase 46G** (PR #152) | The auth / identity / signer boundary; session-derived identity binding; `subject_refs` mapping. | Implemented no auth; finalized no identity binding (Row G held). |
| **Phase 46H** (PR #153) | The consent boundary; the consent-proof object model (draft); the 10-case failure taxonomy; the consent-receipt public/private posture. | Implemented no consent; froze no consent model. |
| **Phase 46I** (PR #154) | The gate #8 boundary; 14 un-frozen durable records; **Option 4 (split storage)** as the topology *direction*; the eleven-item exit checklist. | Left the **physical adapter placement unresolved**; proposed no adapter; cleared no gate. |
| **Phase 46J** (PR #155) | The **non-runtime validator** key-name hardening (37 keys; 44/44); deferred the runtime mirror. | Hardened no runtime code; changed no vector JSON; cleared no gate. |
| **Phase 46K** (PR #156) | The implementation-readiness decomposition; readiness ≠ authorization; runtime-mirror sequencing; the 15-item checklist (criteria 3 & 5 unsatisfied at the time). | Accepted no readiness; proposed no adapter; cleared no gate. |
| **Phase 46L** (PR #157) | The **structural** gate-clearing ADR + blocker handoff packet; the conjunct-by-conjunct framing; ADR-022D preservation recorded; **HELD** because conjunct (a) was unmet. | Did not propose a production adapter; cleared no gate. |
| **Phase 46M** (PR #158 — latest checkpoint) | Evaluated candidates A–F; **selected Candidate D** as the production-adapter placement candidate (a `StorageAdapter`-swap, split-storage placement); decomposed the schema (§7) and migration (§8) families; preserved the ADR-022D invariants; **produced the conjunct-(a) input**. | Did not itself re-author the gate-clearing ADR; froze no schema; authored no migration; cleared no gate. |

> **What the chain has produced, in one line.** A decided storage *model* and *shape*, a selected topology,
> recorded auth / consent / signer boundaries, an un-frozen record decomposition, a non-runtime validator
> hardening, a decomposed readiness checklist, a structural (HELD) gate-clearing ADR — and, with Phase 46M,
> **a proposed production adapter (Candidate D) plus a decomposed schema / migration plan.** §9 reads the
> gate #8 trigger against exactly this, and finds conjunct (a) now met for the documentation / architecture
> / handoff prerequisite.

---

## 7. Phase 46M intake

Phase 46M (PR #158) is the lane that produced this ADR's missing conjunct-(a) input. Stated accurately:

- **Candidate D selected as the production-adapter placement candidate.** 46M evaluated six candidate
  placements (A — Dixie-owned all-records; B — Straylight-owned canonical; C — Finn-owned; D — split
  storage; E — external DB behind the Dixie route; F — no adapter / remain held) and selected **Candidate
  D** (46M §5.4 / §6) as the safest placement candidate.
- **Split storage.** Dixie owns and persists the **endpoint-local contract / idempotency / replay records,
  ingress references, and the public/private projection** through a Dixie route-side durable adapter;
  Straylight owns the **canonical assertion / transition / receipt / audit store** through the
  `StorageAdapter` / `AuditLog` path (46M §6.1 / §6.3).
- **Dixie route-side durable adapter for route-owned Admission Wedge records only.** The adapter owns the
  route-owned records named above; it does **not** own a parallel canonical lifecycle and does **not**
  re-mint or redefine `RecallPack` / `RecallReceipt` / `TransitionReceipt` / `AuditEvent` (46M §6.2).
- **Adapter shaped as a swap-in of the canonical `StorageAdapter` interface.** The Dixie route-side adapter
  is a swap-in of the canonical Straylight `StorageAdapter` interface (`storage/types.ts:15-16`), never a
  parallel canonical lifecycle (46M §6.1).
- **Straylight canonical ownership and `StorageAdapter` semantics preserved.** The canonical `active`
  `Assertion`, the first-class `TransitionReceipt`, the append-only hash-chained `AuditEvent`, their
  invariants, the six receipt categories, and the `StorageAdapter` / `AuditLog` interface stay canonical
  Straylight semantics (46M §6.3).
- **Schema / migration families decomposed without implementation or freeze.** 46M §7 decomposed the
  durable schema families (candidate / transition / assertion / denial / supersession / idempotency /
  TransitionReceipt / AuditEvent / consent-proof / consent-receipt / signer / auth-identity /
  public-safe-receipt / private-audit / privacy-risk-frame / retention-revocation-forget /
  tenant-estate-actor / derived-recall) with **no** field types, keys, indexes, or table definitions; 46M
  §8 decomposed the future migration requirements with **no** migration authored.
- **Runtime `no-leak.ts` mirror remains downstream.** 46M §9 preserved and sequenced the runtime-mirror
  decision; it modified no runtime code (§8).
- **ADR-022E gate #8 remained held in Phase 46M, and direct implementation remained blocked.** 46M
  selected a placement *candidate* as a docs/decision-only proposal *input*; it did not itself clear gate
  #8 and did not authorize implementation (46M §1 / §11). This ADR is the lane 46M named to *consume* that
  input (46M §13 step 10).

> **Phase 46M produced the proposal input; Phase 46N proposes it as the production adapter.** The
> distinction matters: 46M's verdict was charter-option (a) — "a placement candidate is selected … as the
> proposal input … and gate #8 REMAINS HELD" (46M §1). 46N is the *separate ADR that proposes the
> production adapter* the gate #8 trigger names; consuming 46M's Candidate D, it satisfies conjunct (a) at
> the documentation / architecture / handoff level (§9).

---

## 8. Phase 46J runtime no-leak distinction

Phase 46J (PR #155) is the non-runtime no-leak evidence this ADR relies on. This ADR does **not** claim
Phase 46J solved runtime no-leak. Stated accurately:

- **Route-vector validator exact-key hardening only.** Phase 46J hardened the route-vector validator's
  `FORBIDDEN_PUBLIC_KEYS` — a Node-built-ins-only checker of static JSON vectors. It did **not** harden the
  runtime serializer.
- **37 newly forbidden public keys.** Phase 46J added 37 canonical / consent exact-key names — the
  canonical ref arrays (`supersedes_refs` / `linked_assertion_refs`), the canonical TransitionReceipt /
  AuditEvent refs + hash-chain links (`signer_refs` / `audit_event_ref` / `receipt_hash` / `audit_hash` /
  `previous_audit_hash` / `policy_decision_ref` / `assertion_refs` / `target_refs`), the subject mapping
  (`subject_refs`), and the consent / auth family (`consent` / `consent_ref` / `consent_proof` /
  `consent_receipt` / `consent_subject` / `consent_grantor` / `consent_scope` / `auth_decision`) — each in
  snake_case **and** camelCase.
- **44/44 self-check.** The `--self-check` harness reports 44/44 cases behaving as required.
- **42 fail-closed negative mutations.** The 5 pre-existing cases + the 37 added-key cases each assert the
  validator fails closed when the forbidden key appears on the public surface.
- **2 exact-key no-overmatch guards.** Two `mode: 'no-overmatch'` cases prove the bare `consent` /
  `auth_decision` additions do **not** over-match the legitimate `consent_assumption` / `auth_assumption`
  public draft markers (exact `Set.has` matching).
- **No route-vector JSON changes.** The five vectors contain none of the added names on their public
  surface; all five still validate clean.
- **No sixth vector.** The no-sixth-vector lock holds; consent/storage is cross-cutting across the five
  outcomes, not a new outcome.
- **Runtime `no-leak.ts` mirror not modified and remains owed.** Phase 46J hardened only the non-runtime
  validator; the runtime `no-leak.ts` exact-key mirror was explicitly deferred (46J §6; 46K §7; 46L §8;
  46M §9). (Verified read-only in this phase: the runtime `no-leak.ts` denylist lists the Phase 33L
  families but **not** the 37 Phase 46J names; the fixed public-response builder emits none of them, so the
  gap is latent, not a live leak.)

**What this means for this paper gate (stated clearly).**

- **Phase 46J validator hardening is not runtime hardening.** The validator does not make the runtime
  serializer forbid those names.
- **It is the relevant non-runtime route-vector evidence for a paper gate.** A gate-clearing ADR emits no
  fields, opens no socket, and renders no public response, so the *contract*-layer (vector) evidence that
  the canonical / consent names are forbidden on the public surface is the relevant non-runtime no-leak
  evidence for the documentation / architecture / handoff prerequisite this ADR clears. Phase 46J therefore
  *supports* the paper clearing without itself being runtime hardening.
- **Runtime mirror hardening remains required before implementation authorization / pre-implementation
  work.** The moment durable-store runtime code begins emitting canonical / consent refs internally, the
  serializer must forbid them on the public surface — so the runtime mirror must land **before** that code
  is authorized (46K §7). It is recorded as a future implementation prerequisite (§11), not as discharged.
  **This ADR does not claim the runtime `no-leak.ts` mirror is complete.**

---

## 9. The CLEARED determination — applying the trigger to the evidence

This is the determination section. It applies the gate #8 trigger (§4) to the now-complete evidence (§6 /
§7) and records the verdict.

**(9.1) Conjunct-by-conjunct.**

| Gate #8 trigger conjunct (§4.2) | Met by this ADR / the chain? | Why |
|---|---|---|
| **(a) A separate ADR *proposes the production adapter*** | **Met (at the documentation / architecture / handoff level).** | Consuming Phase 46M, this ADR *proposes* **Candidate D** — a split-storage production adapter: a Dixie route-side durable adapter for the Admission Wedge route-owned records, shaped as a swap-in of the canonical Straylight `StorageAdapter` interface (`storage/types.ts:15-16`; 46M §6.1), with Straylight canonical ownership preserved. Per §4.2 conjunct 1, "propose" requires naming the placement, the swap-in interface, and enough record families for the proposal to be concrete — all of which Candidate D supplies (46M §6 / §7). The concrete substrate, the canonical-store physical host, and the frozen schema are downstream by ADR-022D §2 / §7's own design (§4.5), so their deferral does not defeat conjunct (a). |
| **(b) Cites the relevant sibling-repo handoff packet** | **Met.** | This ADR cites its re-authored sibling handoff packet ([`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md)). Under the CLEARED verdict that packet is an **active-for-downstream-gated-work** packet (not an implementation packet — §4 of that document). |
| **(c) Preserves the ADR-022D receipt and audit-chain invariants** | **Met.** | §5 records each ADR-022D invariant (ownership + six categories; host-does-not-own-receipts; the five audit-chain integrity invariants; AuditEvent-stays-Straylight; migration-is-a-separate-ADR) and states Candidate D preserves all of them; any future production substrate must carry them forward unchanged. |
| **Preamble: a separate ADR explicitly cites the trigger** | **Met.** | §4.1 quotes the trigger and the preamble verbatim. |

**(9.2) The verdict.** Because all three conjuncts — including the substantive conjunct (a) — are now met at
the documentation / architecture / handoff level, the gate #8 trigger is **satisfied at that level**.
Therefore:

> **ADR-022E gate #8 is CLEARED — as a documentation / architecture / handoff prerequisite only.** This ADR
> is the separate ADR that proposes the production adapter (Candidate D), cites the re-authored sibling
> handoff packet, and preserves the ADR-022D receipt and audit-chain invariants. It clears the paper-level
> gate #8 prerequisite and **nothing else** (§1). The related sibling gates #9 / #10 / #11 / #12 / #15 / #20
> remain held, and the operative Straylight-side production unblocking still requires the preamble's
> separate-ADR / sibling-repo-PR-under-teammate-review pathway (§4.7).

**(9.3) Why this is not a regression from 46L's discipline, and not an over-claim.** Phase 46L held gate #8
for one reason only: conjunct (a) was unmet, because no production adapter had been proposed (46L §9.2).
That was the honest reading **then**. Phase 46M then *supplied* the missing input — it selected Candidate D
and decomposed the schema / migration families precisely "so a future, re-authored gate-clearing ADR can
genuinely *propose the production adapter*" (46M §1 / §6.6 / §13 step 10). The only thing that changed
between 46L's HELD and 46N's CLEARED is the one thing 46L said had to change: conjunct (a) is now satisfied.
Reaching CLEARED on that basis is the disciplined, evidence-following move — not a relaxation of the gate.
Conversely, the clearing is bounded exactly to what the text supports: the *documentation / architecture /
handoff prerequisite*, not the Straylight-owned operative gate (§4.7), not implementation, not a build (§1,
§10). Clearing more than that would be the over-claim; clearing less would ignore that 46M was chartered to
deliver, and did deliver, conjunct (a).

**(9.4) Why the clearing is tightly limited (per the charter).** The charter requires that, if clearing, the
clearing be limited. This ADR limits it exactly: it clears **only** ADR-022E gate #8 as a documentation /
architecture / handoff prerequisite; it does **not** authorize durable-store implementation, DB writes,
migrations, route / API behavior changes, auth or consent implementation, production admission, public
remember-this, or Discord / freeform ingestion; it does **not** freeze the route contract or the final
schema; it does **not** claim production readiness; and it does **not** claim the runtime `no-leak.ts`
mirror is complete (§1, §10). §10 states the blocked posture explicitly.

**(9.5) What clearing does NOT mean (anti-over-claim guard).** Clearing the documentation / architecture /
handoff prerequisite does **not** mean: the durable store exists or is authorized; a schema exists or is
frozen; a migration exists or is authorized; the canonical-store physical host is selected (it stays
governed by held gates #9 / #10); a concrete external DB substrate is selected (Candidate E stays a future
sub-decision; gate #12 / #20 held); the runtime serializer forbids the canonical / consent names (the
runtime mirror is owed); auth or consent has been built; production admission has opened; or the Straylight
operative gate has been discharged (that needs Straylight teammate review per §4.7). Each remains its own
separately-authorized future gate (§10, §11).

**(9.6) What clearing allows downstream.** Because gate #8 is cleared as a documentation / architecture /
handoff prerequisite, downstream work may now **proceed to the next gated paper / implementation-readiness
lane** — it does not itself authorize those works, but it unblocks *asking for* them in order:

- a **runtime `no-leak.ts` exact-key mirror hardening gate** (or accepted equivalent) — the deferred runtime
  mirror + matching runtime fixtures, before implementation authorization (§8; 46K §7);
- a **durable-store implementation-readiness acceptance gate** — ratifying the §11 / 46K §9 checklist
  against the now-proposed Candidate D adapter;
- a **schema / migration design gate** — the final data model, schema versioning, and migration / backfill /
  rollback plan (46M §7 / §8), each canonical-store migration being "a separate ADR + sibling-repo PR under
  teammate review" (ADR-022D §7);
- a **dev/operator-only route-storage spike authorization gate** (cf. Phase 33M), if a bounded default-off
  spike beyond the existing Phase 33N surface is wanted;
- the **operative Straylight-side production unblocking** — the preamble's separate-ADR / sibling-repo-PR
  under Straylight teammate review (§4.7), plus the held sibling gates #9 / #10 / #12 / #20 — before any
  production wiring.

This ADR **authorizes none** of those; it makes the paper-level gate #8 prerequisite satisfied so the next
*gated paper / readiness* lane may begin (§13).

---

## 10. Durable-store implementation remains blocked

Even though this ADR clears the documentation / architecture / handoff prerequisite of gate #8, the
following remain **blocked** and are **not** authorized by it:

- **No durable storage implementation.** This ADR authorizes no durable store, schema, table, or store
  code; none is created; storage is not implemented.
- **No DB / migration work is permitted.** No migration is authored or applied; no DB write is permitted;
  no DB code is written.
- **No production admission.** Production admission remains blocked; the Phase 33N dev/operator-only,
  disabled-by-default spike remains the only authorized route surface.
- **No route behavior change.** The route handler is unchanged; no route/API behavior changes.
- **No public `remember-this`.** No public / unauthenticated remember-this surface is designed or
  permitted; direct public/client storage writes are rejected (46I §7 Option 6).
- **No Discord / freeform ingestion.** Discord command / history ingestion remains blocked.
- **User chat does not become memory** merely because it was said; consent is never inferred from chat text
  (46H §4.5); the spike accepts only a synthetic dev marker.
- **No auth / consent implementation.** Auth is not implemented; consent is not implemented;
  Rows F / G held.
- **Runtime no-leak mirror hardening remains future-gated.** The deferred runtime `no-leak.ts` exact-key
  mirror is owed before implementation authorization (§8; 46K §7); this ADR does not perform it and does
  not claim it complete.
- **Implementation-readiness acceptance remains future-gated.** This ADR neither accepts implementation
  readiness nor authorizes a build; the §11 prerequisites are un-accepted.
- **The canonical-store physical host and concrete substrate remain future-gated.** The host (Straylight /
  Finn / Dixie-hosted adapter) stays governed by held gates #9 / #10; the concrete external DB substrate
  (Candidate E) stays a future sub-decision under gate #12 / #20.
- **The Straylight-owned operative gate is not discharged.** Clearing the documentation / architecture /
  handoff prerequisite does not discharge the preamble's Straylight-teammate-reviewed operative pathway
  (§4.7).

> Clearing the documentation / architecture / handoff prerequisite of gate #8 authorizes **no** runtime
> work and builds **no** store. The do-nothing / synthetic-only posture (46E Option 6; 46I §7 Option 1)
> remains in force for runtime; only the *paper* gate prerequisite is cleared.

---

## 11. Future implementation prerequisites

This section restates the future prerequisites (from Phase 46K §9 / 46M §11) — the items a future lane must
author, **accept**, and (for the gate) satisfy before durable-store implementation can begin. Phase 46N
clears the documentation / architecture / handoff prerequisite of gate #8 but satisfies **none** of these
downstream prerequisites.

| # | Prerequisite | Status after Phase 46N |
|---|---|---|
| 1 | **Accepted durable-store ownership / adapter boundary** — finalized, with the canonical-store physical host (Straylight / Finn / Dixie-hosted adapter) selected. | **Placement candidate proposed (Candidate D); host unresolved.** The route-owned-records placement is settled as Dixie route-side; the canonical-store host stays governed by held gates #9 / #10 (46M §6.4). |
| 2 | **Accepted storage topology as architecture** — split-storage *direction* (46I §7) confirmed as a *production architecture*, with direct public/client storage writes rejected. | **Proposed, not accepted as production architecture.** This ADR proposes Candidate D; an implementation-readiness acceptance gate must accept it (§9.6). |
| 3 | **Accepted schema / migration plan** — the durable data model, schema versioning, backfill scope, and forward-only migration (or dev-only no-migration) plan. | **Decomposed (46M §7 / §8), not accepted or frozen.** Each canonical-store migration is "a separate ADR + sibling-repo PR" (ADR-022D §7). |
| 4 | **Accepted auth / identity-binding persistence plan** — session-derived, no caller override, persisted privately. | **Unsatisfied.** Row G held; auth not implemented. |
| 5 | **Accepted consent proof / receipt persistence plan** — recorded privately onto the canonical audit record (primary) and optionally the `TransitionReceipt`; the disjoint public-safe consent-receipt reference (46H §5 / §6). | **Unsatisfied.** Consent not implemented; consent model un-frozen. |
| 6 | **Accepted signer / receipt / audit persistence plan** — canonical refs / hash-chain links persisted on the private primitives; competence resolved; production signature substrate selected. | **Unsatisfied.** Row F held; gate #20 (threat-model widening) held. |
| 7 | **Accepted idempotency / replay persistence plan** — final endpoint keying scoped by the bound identity; collisions fail closed. | **Unsatisfied.** Row J held; `idempotency_final: false`. |
| 8 | **Accepted public / private projection hardening plan** — the production no-leak serializer; the non-runtime validator key-name hardening is **done** (Phase 46J), the runtime mirror and the production serializer remain owed. | **Partially advanced (non-runtime), runtime owed** (§8). |
| 9 | **Accepted runtime no-leak stance** — the deferred runtime `no-leak.ts` exact-key mirror added and proven fail-closed with matching runtime fixtures, before implementation authorization. | **Unsatisfied.** Deferred (46J §6; 46K §7; 46M §9). |
| 10 | **Accepted rollback / partial-failure plan** — atomicity, partial-failure, rollback / recovery against the append-only chain. | **Decomposed only** (46K §10; 46M §8). |
| 11 | **Accepted test / vector / validator plan** — extending the existing vectors and `--self-check` for the durable model, still no-leak-bounded, with matching runtime fixtures. | **Unsatisfied.** Future lane. |
| 12 | **Accepted dev/operator vs production boundary** — the dev/operator-only spike posture kept distinct from any production admission path. | **Preserved as boundary, not accepted as a production plan** (46K §9 criterion 14). |
| 13 | **Operative Straylight-side gate #8 clearance** — the preamble's separate-ADR / sibling-repo-PR under Straylight teammate review (§4.7). | **Unsatisfied.** This Dixie ADR clears only the documentation / architecture / handoff prerequisite. |
| 14 | **Codex audit acceptance** before PR of the durable-store design / implementation. | **Unsatisfied.** Future lane's review/audit gate. |

> The two prerequisites this phase touches — the **re-authored gate-clearing ADR** and the **re-authored
> sibling handoff packet** — are *authored here and the paper-level gate #8 prerequisite is now passing*;
> every other prerequisite is unsatisfied. Implementation remains blocked.

---

## 12. Required invariants preserved

Phase 46N preserves **all** of the following (each already enforced in synthetic / spike / vector /
non-runtime-validator form where cited; any future gate-clearing ADR, design, or implementation lane must
carry each forward unchanged). These are the invariants the sibling handoff packet (§6 of that document)
must also preserve, so the two documents stay consistent.

1. **A pending candidate is not recallable.** Only active, recall-eligible assertions enter the recall
   projection; the pending vector has empty recall and `public_receipt_ref: null`.
2. **A rejected candidate creates no admitted assertion.** reject vector
   `expected_private_or_audit_effect.no_admitted_assertion = true`; `synthTransitionFor` returns no
   transition for reject.
3. **An accepted candidate creates / references an admitted assertion.** accept vector
   `admitted_assertion_status_class = "active"`; the candidate→transition→assertion chain intent.
4. **A superseded assertion is excluded from ordinary recall** unless explicitly requested/marked.
   Supersession flips the prior to `superseded` / `recall_eligible: false`.
5. **A malformed / unsafe payload fails closed.** malformed vector `must_fail_closed = true`; the
   classifier accepts only the five forms and fails closed otherwise.
6. **Missing / unauthorized auth fails closed.** Disabled → 404, unauthorized → 403, malformed → 400; one
   stable refusal that never reveals which gate failed; both-empty rejects all.
7. **Missing / invalid consent fails closed in any future production admission model.** Missing, malformed,
   subject-mismatched, scope-mismatched, expired, revoked, replayed, or signer-invalid consent fails closed
   and mints no admitted assertion (46H §7); service-token / operator auth is never treated as consent.
8. **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
   material.** Enforced by the public-surface walk + `FORBIDDEN_PUBLIC_KEYS` (strengthened with the
   canonical / consent key names — Phase 46J) + substring / regex / UUID / opaque-run walks; the runtime
   mirror is owed before implementation (§8).
9. **Private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private.**
   Forbidden on the public surface at any depth; the auth-decision / consent reference lives on the private
   audit record only (33V §5; 46H §6); the canonical signer/receipt/audit refs live on the private
   primitives.
10. **User chat does not become memory merely because it was said.** No Discord / freeform ingestion and no
    user-chat-as-memory path; consent is never inferred from chat text (46H §4.5).
11. **Public `remember-this` remains blocked.** No public / unauthenticated remember-this surface is
    designed or authorized; direct public/client storage writes are rejected (46I §7 Option 6).
12. **Discord / freeform history ingestion remains blocked.** Unchanged.
13. **Production admission / storage / auth / consent remain blocked.** ADR-022E gate #8 operative clearing
    not discharged; `storage_writes_performed` / `auth_implemented` / `consent_implemented` /
    `production_admission` all false on every vector.
14. **Route-contract freeze and final schema freeze remain blocked unless separately authorized.**
    `route_contract_final` / `schema_final` false on every vector; Phase 46N freezes neither.
15. **`recall_eligible` remains derived / non-authoritative; never persisted as canonical authority** (§3
    fact 6; 46F §7; 46M §7).
16. **The related sibling gates #9 / #10 / #11 / #12 / #15 / #20 remain held**; gate #8 is cleared only as a
    documentation / architecture / handoff prerequisite, not operatively (§4.6 / §4.7).
17. **Auditability without rewriting history.** The canonical audit log is append-only, hash-chained, and
    tamper-detectable via `verifyChain` (`audit.ts:77-89`; ADR-022D §4, `:109-127`); a consent /
    auth-decision reference recorded onto it inherits that tamper-evidence without becoming public.

---

## 13. Next lane and dependency ordering

The charter asks Phase 46N to select a safe next lane. Because gate #8 is now **CLEARED as a documentation /
architecture / handoff prerequisite** (§9), the next lane is the first downstream *gated paper /
implementation-readiness* lane that §9.6 unblocked. Direct durable-store implementation is **not** a
candidate: this ADR provides no implementation-authorization gate, the §11 prerequisites are unsatisfied,
the runtime mirror is owed, and the operative Straylight-side gate is not discharged.

> **Selected next lane: a docs/decision-only runtime `no-leak.ts` exact-key mirror hardening gate — the
> lane that adds the deferred runtime serializer mirror of the Phase 46J `FORBIDDEN_PUBLIC_KEYS`
> additions, with matching runtime fixtures, proven fail-closed, as the first implementation-authorization
> precondition. Not implementation of the durable store; not a build; clears no further gate by selecting
> it.**

**Reason.** §9.6 unblocked the next gated-paper lanes; among them, the runtime `no-leak.ts` exact-key
mirror is the lowest-blast-radius, longest-owed item and the one explicitly named as required *before*
implementation authorization (46K §7; 46L §8; 46M §9). It is the precondition that every downstream
durable-store lane depends on, so sequencing it first keeps the per-area chain disciplined: the paper gate
prerequisite is cleared (this ADR), the runtime no-leak posture is hardened next, then the
implementation-readiness acceptance, then the schema / migration design, then (only with the operative
Straylight-side gate and the sibling gates addressed) any build. Selecting the runtime-mirror lane does not
itself authorize the durable store or any build; it is a docs/decision (or hardening-decision) lane that
discharges a named implementation precondition.

> **Note on scope of the runtime-mirror lane.** Whether the runtime-mirror lane is *docs/decision-only* or
> a *bounded runtime hardening* of the existing Phase 33N spike's `no-leak.ts` (which would touch runtime
> source) is a decision that lane must make at its own gate — it is **not** decided here, and Phase 46N
> authorizes no runtime change. If that lane would touch runtime source, it must re-open the Phase 33M-style
> authorization posture first. This ADR only *names* it as the next safe lane.

**Why not the alternatives:**

- **A durable-store implementation-readiness acceptance gate is the right *eventual* step, but not first**
  — it best ratifies the §11 / 46K §9 checklist, and that checklist's criterion 9 (runtime no-leak stance)
  is unsatisfied until the runtime mirror lands. Recorded as a documented companion (step 12 below).
- **A schema / migration design gate is downstream** — it produces the final data model and migration plan
  (46M §7 / §8), each canonical-store migration being "a separate ADR + sibling-repo PR" (ADR-022D §7); it
  follows the readiness acceptance. Recorded (step 14 below).
- **A dev/operator-only route-storage spike authorization gate is premature** — a bounded default-off spike
  beyond Phase 33N is only warranted once the runtime mirror and readiness acceptance land. Recorded as a
  documented alternative (step 15 below).
- **Direct durable-store implementation is not a candidate** — no artifact authorizes it; the §11
  prerequisites are unsatisfied, the runtime mirror is owed, gate #8's operative clearing is not discharged,
  and the sibling gates #9 / #10 / #12 / #20 are held.

**Dependency ordering after Phase 46N** (carried from 46M §13; 46M's step 10 — this re-authored
gate-clearing ADR — is now done and CLEARED at the documentation / architecture / handoff level, so the
runtime-mirror lane becomes the selected next lane):

1. Phase 46E — durable storage **model direction** decided. *(Done; PR #150.)*
2. Phase 46F — durable storage **shape & route-vector alignment** decided. *(Done; PR #151.)*
3. Phase 46G — **auth / identity / signer** authority decided. *(Done; PR #152.)*
4. Phase 46H — **consent proof / receipt** decided. *(Done; PR #153.)*
5. Phase 46I — **durable-store design / decomposition + ADR-022E gate #8 boundary**. *(Done; PR #154.)*
6. Phase 46J — **non-runtime consent/storage vector/validator alignment**. *(Done; PR #155.)*
7. Phase 46K — **durable-store implementation-readiness decomposition**. *(Done; PR #156.)*
8. Phase 46L — **ADR-022E gate-#8 gate-clearing ADR (HELD) + sibling handoff packet (blocker)**. *(Done;
   PR #157.)*
9. Phase 46M — **durable-store production-adapter placement (Candidate D) + schema / migration
   decomposition**. *(Done; PR #158.)*
10. **Phase 46N — re-authored ADR-022E gate-#8 gate-clearing ADR (CLEARED, documentation / architecture /
    handoff prerequisite only) + re-authored sibling handoff packet (active-for-downstream-gated-work).**
    *(This ADR — docs/decision-only; no vector/validator/runtime change; gate #8 cleared at the paper level
    only.)*
11. **Runtime `no-leak.ts` exact-key mirror hardening gate** — adds the deferred runtime mirror + matching
    runtime fixtures, proven fail-closed, before implementation authorization (§8; 46K §7). *(Selected next
    lane.)*
12. **Durable-store implementation-readiness acceptance gate** — ratifies the §11 / 46K §9 checklist against
    the now-proposed Candidate D adapter. *(Documented companion; downstream of step 11.)*
13. **Final route-contract pre-freeze gate.**
14. **Schema / migration design gate** — the final data model, schema versioning, and migration plan (46M
    §7 / §8); each canonical-store migration "a separate ADR + sibling-repo PR" (ADR-022D §7). *(Held;
    downstream.)*
15. **Dev/operator-only route-storage spike authorization gate** — only if a bounded default-off spike
    beyond Phase 33N is wanted (cf. Phase 33M). *(Documented alternative.)*
16. **Operative Straylight-side gate #8 clearance + sibling-gate addressing** — the preamble's
    separate-ADR / sibling-repo-PR under Straylight teammate review (§4.7), plus gates #9 / #10 / #12 / #20,
    before any production wiring. *(Held; cross-repo.)*
17. **Bounded default-off implementation spike** — only if the §11 / 46K §9 checklist is satisfied and the
    operative gate is cleared.
18. **Smoke / acceptance gate; then Freeside Characters client-contract handoff** (incl. the consent UX;
    46H §12 criterion 8).

> **Implementation remains downstream.** Steps 11–18 are each held / future. The only step Phase 46N
> advances is **step 10** — re-authoring the gate-clearing ADR + sibling handoff packet and reaching the
> CLEARED (documentation / architecture / handoff prerequisite only) verdict — which is itself
> docs/decision-only. **Runtime implementation is not the next step, and a runtime change is not this
> document.**

---

## 14. Blocked lanes

Phase 46N is a bounded, docs/decision-only re-authored gate-clearing ADR that clears the documentation /
architecture / handoff prerequisite of gate #8 only. It authorizes **none** of the following; each remains
**blocked** and is **not** unblocked by authoring this ADR / its sibling handoff packet or by selecting the
runtime-mirror lane:

- durable Admission Wedge storage implementation; DB writes; migrations; a durable data model, schema, or
  table definition; storage is not implemented;
- the **operative** clearing of ADR-022E gate #8 (this ADR clears only the documentation / architecture /
  handoff prerequisite — §4.7) or the related gates #9 / #10 / #11 / #12 / #15 / #20;
- the **runtime `no-leak.ts` mirror hardening** (deferred; owed before implementation authorization — §8 /
  §11) — Phase 46N changes no runtime code;
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
- Freeside Characters runtime / client integration; the consent UX; package exports; Freeside runtime/
  client behavior; LLM / voice / Finn runtime behavior;
- the final Dixie route contract; route-contract freeze; production route deployment;
- production readiness of any kind; final / production schema freeze; an implementation-readiness claim;
- MVP 3 forget / revoke / correction UI; persisting `recall_eligible` as canonical authority; freezing the
  physical durable adapter placement; selecting the canonical-store physical hosting (future-gated by
  #9 / #10); naming or provisioning a concrete external DB substrate (Candidate E; gate #12 / #20);
- **any mutation of the five route-vector JSONs, the route-vector validator, the route-vector README, the
  Phase 33E fixtures, or the Phase 33E fixture validator** (§1).

> **Clearing the documentation / architecture / handoff prerequisite of gate #8 authorizes no runtime
> implementation and discharges no operative gate.** It records that the paper-level gate #8 trigger is met
> and names the next docs lane; it does **not** build a store, **not** author a schema or migration,
> **not** discharge the Straylight operative gate, **not** clear the related sibling gates, **not** harden
> the runtime mirror, **not** implement auth or consent, **not** bind production identity, **not** implement
> signer semantics, **not** freeze the route contract or schema, and **not** authorize any route / storage /
> auth / consent / Freeside / package-export work. The Phase 33N dev/operator-only, disabled-by-default
> spike remains the only authorized route surface, and the do-nothing / synthetic-only runtime posture
> remains in force.

If a later phase reaches for any of the above, it must re-open the Phase 33K precondition design, the Phase
33M authorization gate, the Phase 33P / 33Q / 33R storage lane, the Phase 33U / 33V chain, the Phase
46A–46M gates and this ADR, and the relevant ADRs (Straylight-repo ADR-022E durable-store gate #8 and
related gates #9 / #10 / #11 / #12 / #15 / #20; ADR-022D receipt/audit-chain invariants; ADR-026C / ADR-026D
route guardrails) first; it must not silently expand scope.

---

## 15. Corruption / duplicate guard

Phase 46N applies an explicit corruption / duplicate guard to **this** document (carried from the Phase
46E / 46F / 46G / 46H / 46I / 46J / 46K / 46L / 46M precedent):

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

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46N is
docs/decision-only — it adds only this document and its sibling handoff packet and mutates no vector,
validator, or fixture — so the validators are run only to confirm the unchanged artifacts remain green. The
fence-balance and negative-claim checks avoid embedding affirmative-claim substrings in prose, so they
cannot self-match.

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
# Confirm no vector JSON / validator / fixture was changed (only the two new docs are added):
git diff --name-only -- docs/admission-wedge/
# New-untracked-doc whitespace checks (no-index; `|| true` because a missing/clean file is fine):
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md || true
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md || true
# Self-reference / next-lane label check (grep -E so `|` is real alternation):
grep -E "Phase 46M|Phase 46N" docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md
# Duplicate/corruption grep (advisory):
grep -nE "Claude said|Patch Report|terminal report|RESULT:|Report$" docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md || true
# Enforcing negative check — fail if any OVER-CLAIM beyond the tightly-scoped documentation/architecture/
# handoff-prerequisite clearing appears in PROSE. The patterns are affirmative-only and word-boundaried, so
# the document's bounded clearing language ("cleared … as a documentation / architecture / handoff
# prerequisite only"), its negated prose ("does not authorize", "remains blocked", "not frozen"), and the
# fenced validation commands below are deliberately NOT matched. This phase DOES clear the paper-level
# prerequisite (verdict CLEARED), so the patterns target only the over-claims this docs-only phase must not
# make. It is NOT masked with `|| true`:
python3 - <<'PY'
import re
from pathlib import Path
p = Path("docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md")
patterns = [
    r"\bimplementation is authorized\b",
    r"\bimplementation-readiness is accepted\b",
    r"\breadiness is accepted\b",
    r"\bthe production adapter is implemented\b",
    r"\bthe production adapter is built\b",
    r"\bthe durable store is built\b",
    r"\broute contract is frozen\b",
    r"\bschema is frozen\b",
    r"\bfinal schema is frozen\b",
    r"\bthe schema is final\b",
    r"\bstorage is implemented\b",
    r"\bmigration is applied\b",
    r"\bis production[- ]ready\b",
    r"\bproduction[- ]readiness is (?:declared|achieved|confirmed|established|met)\b",
    r"\bdb writes? (?:is|are) (?:hereby |now )?authorized\b",
    r"\bproduction admission (?:is|are) (?:hereby |now )(?:authorized|open|opened)\b",
    r"\bvectors? (?:was|were) (?:modified|mutated|changed)\b",
    r"\bvalidator (?:was|were) (?:modified|mutated|changed)\b",
    r"\bruntime (?:code|source|mirror) (?:was|were) (?:modified|mutated|changed|hardened|completed)\b",
    r"\bauth is implemented\b",
    r"\bconsent is implemented\b",
    r"\bidentity binding is (?:final|frozen|finalized|implemented)\b",
    r"\bthe physical adapter placement is (?:frozen|finalized|implemented|selected)\b",
    r"\bgate #8 is operatively cleared\b",
    r"\bsibling gates? #?9[^.]{0,40}(?:are|is) (?:hereby |now )(?:cleared|unblocked)\b",
    r"\bruntime no-leak (?:mirror )?is complete\b",
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
print("The enforcing scan found no over-claim (implementation/build/freeze/operative-clearing/readiness/runtime-complete) claims outside fenced validation commands.")
PY
# Fence-balance check (dependency-free; even count = balanced; char-code form avoids embedding
# a literal triple-backtick that would unbalance this doc):
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

Recorded results for this lane (the captured terminal output accompanies this work):

- **docs-only scope check** — only the two new files
  `docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md` and
  `docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md` are added; no route-vector
  JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, `app/`, `src/`,
  `tests/`, package / lockfile, config / env, CI, migration, runtime, or generated file is touched;
- **no admission-wedge artifact changed** — `git diff --name-only -- docs/admission-wedge/` lists nothing
  (the new docs live at `docs/`, not under `docs/admission-wedge/`), confirming no vector JSON, validator,
  README, or fixture was modified;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no `git add` / commit / push);
  `git diff --check` and `git diff --cached --check` report no whitespace errors; the no-index whitespace
  checks on the two new docs report no errors;
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes
  valid, 0 failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no
  sixth vector**; the `--self-check` harness reports **44/44** cases behaving as required (42 fail-closed
  negative mutations + 2 exact-key no-overmatch guards);
- **self-reference label check** — `grep -E "Phase 46M|Phase 46N"` confirms both the `Phase 46M`
  (predecessor) and `Phase 46N` (self) labels are present;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the eighteen headings 1–18
  exactly once each;
- **duplicate/corruption grep** — the advisory grep finds no pasted terminal-report fragment in the
  document body;
- **negative over-claim check (enforcing)** — the `python3` scan excludes fenced lines and reports the
  affirmative-only, word-boundaried over-claim patterns (implementation/build/freeze/operative-clearing/
  readiness-acceptance/runtime-complete) found no match outside the fenced validation commands; the
  document's **bounded** clearing prose ("cleared … as a documentation / architecture / handoff prerequisite
  only") and its negated prose are correctly not matched. The scan is not masked with `|| true`;
- **fence-balance check** — the dependency-free `node -e` counter reports an even (balanced) triple-backtick
  count; the single fenced block is the validation command list above.

---

## 17. Success criteria for Phase 46N

Phase 46N succeeds if and only if:

1. **Docs / decision-only** — it creates only this Phase 46N ADR and its sibling handoff packet; it changes
   **no** route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture
   validator, runtime source, test, route, store, migration, auth, consent, config, env, package, lockfile,
   CI, or generated file, and edits **no** adjacent repository (§1).
2. **Status and verdict stated** — the ADR states the **CLEARED (documentation / architecture / handoff
   prerequisite only)** verdict, limits it tightly (nothing else cleared, nothing authorized), and explains
   why CLEARED is the evidence-honest reading now that Phase 46M supplied conjunct (a) (§1, §9).
3. **Gate #8 requirement quoted** — the gate #8 trigger and gate-table preamble are quoted, decomposed into
   three conjuncts + a citation requirement, and confirmed to require a separate ADR, a sibling handoff
   packet, and ADR-022D invariant preservation, with no invented requirements, and with the Dixie-vs-
   Straylight operative distinction recorded (§4).
4. **ADR-022D invariants preserved** — the exact ADR-022D ownership, host-contract, audit-chain-integrity,
   and migration-trajectory invariants are recorded and stated preserved by Candidate D (§5).
5. **Evidence chain grounded** — the determination cites the 33N / 33Q / 33U / 33V / 33X–33Z / 46A–46M
   rungs and PR #158 as the latest checkpoint, with what each did and did not establish (§6).
6. **Phase 46M Candidate D intake summarized** — Candidate D, split storage, Dixie route-side adapter for
   route-owned records, `StorageAdapter` swap-in, Straylight canonical ownership preserved, schema/migration
   decomposed without freeze, runtime mirror downstream, gate #8 held in 46M, implementation blocked (§7).
7. **Phase 46J runtime no-leak distinction stated** — validator-only hardening; 37 keys; 44/44; 42
   fail-closed; 2 no-overmatch; no JSON change; no sixth vector; runtime mirror not modified and owed; not
   claimed solved (§8).
8. **CLEARED determination reached** — conjuncts (a)/(b)/(c) + preamble citation met at the documentation /
   architecture / handoff level; gate #8 cleared as that prerequisite; the bounded scope and anti-over-claim
   guard stated; the operative Straylight gate not discharged (§9).
9. **Durable-store implementation remains blocked** — no storage / DB / migration / production admission /
   route behavior / public remember-this / Discord ingestion / chat-as-memory / auth / consent; runtime
   mirror, readiness acceptance, host, substrate, and operative gate future-gated (§10).
10. **Future implementation prerequisites restated** — the 14 prerequisites, with this phase satisfying none
    of the downstream ones (the two it touches are the now-passing paper-level gate prerequisite) (§11).
11. **Invariants restated** — pending not recallable; rejected mints nothing; accepted creates/references;
    superseded excluded; malformed fails closed; auth/consent fail closed; public no-leak; private
    receipt/audit/consent/storage private; not user-chat memory; public remember-this blocked; Discord
    ingestion blocked; production admission/storage/auth/consent blocked; route-contract + schema freeze
    blocked; sibling gates held; `recall_eligible` derived; auditability without history rewrite (§12).
12. **Next lane selected + ordering updated** — the docs/decision-only runtime `no-leak.ts` exact-key mirror
    hardening gate selected; the readiness-acceptance, schema/migration, spike-authorization, and operative
    Straylight gates recorded as companions/downstream; direct implementation rejected; the post-46N
    ordering recorded with implementation downstream (§13).
13. **Blocked lanes preserved** — no durable / DB-write / migration / schema / operative-gate / runtime-
    mirror / auth / consent / identity / signer / route / Freeside / package / production-readiness lane is
    authorized, and no vector / validator / fixture is mutated (§14).
14. **Sibling handoff packet consistency** — the re-authored handoff packet is an
    active-for-downstream-gated-work packet (not implementation), is not broader than this ADR, and
    preserves the same invariants (handoff packet §1 / §6; §9 / §12 here).
15. **Corruption / duplicate guard applied** — the document passes the §15 guard, with results recorded in
    §16.
16. **No freeze, no production-readiness claim, no operative gate clearance, no implementation
    authorization** — Phase 46N freezes neither the route contract nor the schema, declares no production
    readiness, clears ADR-022E gate #8 only as a documentation / architecture / handoff prerequisite, does
    **not** discharge the Straylight operative gate, and does **not** authorize implementation (§1, §4.7,
    §9, §10, §14).

---

## 18. Cross-references

- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md)
  — the re-authored sibling handoff packet authored in this same phase; the gate #8 trigger requires the
  gate-clearing ADR to cite it (§4.3 / §9). Under the CLEARED verdict it is an
  **active-for-downstream-gated-work** packet, not an implementation packet.
- [`docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md)
  — Phase 46M (PR #158); its §5 evaluated candidates A–F, §6 selected **Candidate D**, §7 / §8 decomposed
  the schema / migration families, §10 preserved the ADR-022D invariants, and §13 step 10 named this
  re-authored gate-clearing ADR + sibling handoff packet — the conjunct-(a) input this ADR consumes.
- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md)
  — Phase 46L (PR #157); the first gate-clearing ADR, which reached **HELD** because conjunct (a) was unmet
  (its §9), and whose structure this ADR re-authors with conjunct (a) now met. **The Phase 46L held result
  is preserved as historical record and is not rewritten** (§9.3).
- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-SIBLING-HANDOFF-PACKET.md)
  — Phase 46L blocker handoff packet (blocker-only because 46L held gate #8); the Phase 46N re-authored
  packet complements it for the re-authored decision and does not erase its historical blocker-only result.
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md)
  — Phase 46K (PR #156); its §4 decomposed the gate #8 readiness requirements, §7 sequenced the runtime
  mirror (implementation-authorization precondition, not gate-clearing precondition), and §9 defined the
  checklist this ADR's §11 maps onto.
- [`docs/ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 46J (PR #155); discharged the non-runtime validator no-leak hardening debt (37 exact-key
  additions; 44/44 self-check) and deferred the runtime `no-leak.ts` mirror (its §6); grounds §8.
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
  — Phase 46I (PR #154); recorded the gate #8 boundary (its §4), decomposed the durable records (§5), the
  ownership/adapter boundary (§6), and selected the split-storage direction (§7) Candidate D realizes.
- [`docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
  — Phase 46H (PR #153); the consent boundary, the consent-proof object model, the 10-case failure taxonomy,
  and the consent-receipt public/private posture (incl. §6.1 disjoint public-safe reference).
- [`docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
  — Phase 46G (PR #152); the auth/identity/signer boundary, the session-derived identity binding, and the
  `subject_refs` mapping.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V (PR #140); the `AuditEvent` / `TransitionReceipt` split, `public_receipt_ref`, the
  `privacy_scope` + frame projection boundary, and the undesigned migration/backfill/rollback grounding §5 /
  §11.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U (PR #139); the A–O reconciliation (rows F / G / J / O held; ADR-022E gates #8 / #10 / #12 / #20
  held; Row B ingress-refs-only) grounding §2 / §6.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs` with the
  five vector JSONs — inspected **read-only** to ground the no-leak boundary, the `FORBIDDEN_PUBLIC_KEYS`
  set (hardened by 46J), the false flags, the no-sixth-vector lock, and the 44/44 self-check. **None is
  modified.**
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/{auth-gate,classifier,public-response,no-leak,admitted-assertion-ledger}.ts`
  — inspected **read-only** to ground the §3 spike facts, the §8 runtime-mirror-deferral verification
  (`no-leak.ts` lists the Phase 33L families but not the 37 Phase 46J names), and the §12 invariants.
  **None is modified.**
- `loa-straylight/src/straylight/types.ts`, `loa-straylight/src/straylight/storage/types.ts`,
  `loa-straylight/src/straylight/audit.ts`,
  `loa-straylight/docs/decisions/{ADR-022D,ADR-022E}-…md`,
  `loa-straylight/docs/handoffs/cross-repo-handoff-index.md` — inspected **read-only** as the **canonical**
  Straylight substrate cited in §2.2 / §4 / §5 (the gate #8 trigger at
  `ADR-022E-phase-22-deferred-features.md:57` and the preamble at `:42-46`; the sibling gates #9 `:58` / #10
  `:59` / #11 `:60` / #12 `:61` / #15 `:64` / #20 `:69`; the ADR-022D invariants at `:47-67` / `:69-82` /
  `:84-108` / `:109-127` / `:129-136` / `:138-148` and the migration trajectory at `:149-166`; `verifyChain`
  at `audit.ts:77-89`; the `StorageAdapter` swap-in seam at `storage/types.ts:15-16`; the `Assertion` /
  `TransitionReceipt` / `AuditEvent` primitives at `types.ts:145-167` / `:364-388` / `:514-529`). **Not
  edited by this phase.**
- `@loa/straylight` — canonical primitive / substrate owner; PR #65 (merged) answered the A–O primitive
  review. Straylight-repo ADR-022E (durable-store gate #8 + related gates #9 / #10 / #11 / #12 / #15 / #20,
  **held** operatively), ADR-022D (receipt/audit-chain invariants), ADR-026C, ADR-026D are decision records
  cited as guardrails. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — the cross-repo acceptance whose
  mirror/adapter is test-only, not exported, not runtime-wired; Freeside remains a client/handoff surface,
  never the canonical durable store and never a persistence owner (§5 / §10); the consent-UX / client-contract
  handoff stays deferred (§13 step 18). **Not edited by this phase.**
