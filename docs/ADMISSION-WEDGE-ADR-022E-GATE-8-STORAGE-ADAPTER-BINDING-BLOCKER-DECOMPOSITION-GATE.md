# Phase 47Q — Admission Wedge ADR-022E gate #8 production storage-adapter binding blocker decomposition gate

> **Phase**: 47Q
> **Branch context**: `phase-47q-adr022e-gate8-storage-adapter-binding-gate`
> **Related**: Phase 47P (PR #187, commit `e1cc3391`,
> [`ADMISSION-WEDGE-MVP2-REMAINING-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-MVP2-REMAINING-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the standing MVP-2 blockers Phase 47O left open into candidate next corridors with an explicit
> dependency map, **selected Option A — the ADR-022E gate #8 / production storage-adapter binding corridor** as the next
> corridor (its §16 / §17), and **named this Phase 47Q** ADR-022E gate #8 production storage-adapter binding blocker
> decomposition gate as the next strictly docs/decision-only lane, keeping **MVP-2 OPEN**; Phase 47O (PR #186, commit
> `0c06720e`, [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-CORRIDOR-CLOSURE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-CORRIDOR-CLOSURE-GATE.md))
> **accepted** Lane-1 `aw_*` SQL execution corridor closure **only for the bounded non-production proof corridor**
> (Option A) and **explicitly kept MVP-2 OPEN**; Phase 47N (PR #185, commit `7165128d`,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-ACCEPTANCE-GATE.md))
> **accepted** the merged Phase 47M (PR #184, commit `4ec76567`) redacted, **non-production, disposable-local**
> PostgreSQL 16 least-privilege (P.2 / P.3) role / grant evidence **for the bounded Lane-1 non-production / disposable-local
> corridor** and **recorded full Phase 47J acceptance — strictly within the non-production Lane-1 limits** (Verdict A);
> Phase 47M (PR #184,
> [`admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md))
> **produced** that evidence and **did not self-accept**; Phase 47L (PR #183, commit `d056cbf7`) **decomposed** the
> P.2 / P.3 evidence blocker and **authorized** Phase 47M; Phase 47K (PR #182, commit `66c09514`) **partially accepted
> (PATCH / NOT FULLY ACCEPTED)** Phase 47J on the then-undemonstrated P.2 / P.3 gap; Phase 47J (PR #181, commit
> `a377922d`) **implemented** the bounded, disabled-by-default, dev/operator/test-only, **NON-PRODUCTION**, exact-scope,
> fail-closed Lane-1 `aw_*` SQL **execution-sink** spike inside the Phase 47I file envelope; Phase 47I (PR #180)
> **conditionally authorized** Phase 47J and made the §16 **P.1–P.7** privilege / secret / logging checklist binding;
> Phase 47H (PR #179) **decomposed** the execution-sink / real-DB boundary and kept execution **BLOCKED**; Phase 47G
> (PR #178) **accepted** the merged Phase 47F isolation spike as a bounded, disabled-by-default, dev/operator-only,
> **NON-PRODUCTION**, location-isolated SQL **planning / manifest / safety-proof** spike; Phase 47F (PR #177, commit
> `ae24ca35`) **implemented** the isolated SQL / manifest / planner / runner / tests / runbook (`--apply` refused);
> Phase 46N (PR #159,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md))
> **cleared ADR-022E gate #8 *as a documentation / architecture / handoff prerequisite only*** (Candidate D proposed,
> sibling handoff packet cited, ADR-022D invariants preserved) while the **operative Straylight-side discharge stayed
> held** and sibling gates #9 / #10 / #11 / #12 / #15 / #20 stayed held; Phase 46M (PR #158,
> [`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md))
> selected **Candidate D** (split storage) as the production-adapter placement candidate and decomposed the durable
> schema / migration families; Phase 46P (PR #161) **restored** the runtime `no-leak.ts` `FORBIDDEN_PUBLIC_KEYS` mirror
> to **114-key** parity and Phase 46Q (PR #162) **accepted** it; `@loa/straylight` PR #65 (A–O primitive review,
> **merged**); Straylight-repo ADR-022E durable-store gate #8 (+ sibling gates, **held operatively**); ADR-022D receipt /
> audit-chain invariants.
> **Status**: **docs / decision-only ADR-022E gate #8 production storage-adapter binding blocker decomposition gate.**
> This gate adds **only this document** (plus a single minimal forward-traceability status note, §20, in the Phase 47P
> MVP-2 remaining-blocker decomposition gate that named this Phase 47Q gate). It modifies **no** runtime source — and
> specifically does **not** modify `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`,
> `app/src/db/migrations/*.sql`, `app/src/server.ts`, `app/src/config.ts`,
> `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts`, the experimental `.sql` files, the
> `manifest.json`, the `aw-sql-isolation-spike-runner.mjs`, `no-leak.ts`, the `aw-sql-execution-sink-spike.test.ts`, the
> three extended Phase 47F test files, or `scope-guards.test.ts` — and changes **no** route handler, store / storage
> code, DB write, migration, SQL file, executable schema, migration runner, packager, scope guard, auth, consent,
> route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, other test,
> package export, config, env, package, lockfile, CI, generated file, or binary. No adjacent repository
> (`loa-straylight`, `freeside-characters`, or any sibling repo) is touched.
> **This is the ADR-022E gate #8 / production storage-adapter binding blocker *decomposition* gate** — the
> docs/decision-only rung Phase 47P §17 named, downstream of the bounded non-production Lane-1 corridor closure and the
> next-corridor selection. It **takes the Phase 47P-selected gate-#8 / storage-adapter binding corridor, states what
> remains unresolved about ADR-022E gate #8, why it blocks MVP-2, what concrete decision questions must be answered
> before it can be discharged, and which next lane should address those questions** — without itself discharging gate
> #8, implementing production storage, migrations, database writes, route / API behavior, Freeside integration, or
> MVP-2 closure. **It produces no evidence, runs no role / grant test, opens no connection, executes nothing, and
> implements nothing.** It **enables no production `--apply`, injects no DB client / sink, opens no DB connection,
> performs no DB write, executes no migration, adds no SQL or executable schema, changes no migration runner / packager /
> startup / config, weakens or edits no scope guard, implements no auth or consent, changes no route / API behavior,
> freezes neither the route contract nor the final schema, discharges no operative Straylight-side gate, closes no
> MVP-2, and claims no production readiness.** Production DB execution, production migration execution, durable
> production storage, ADR-022E gate #8 discharge, MVP-2 closure, and all production work **remain BLOCKED** (§6–§18).
> This gate **decomposes the gate-#8 blocker and selects the next docs/decision-only lane**; it **clears** gate #8 no
> further, **opens** no corridor for implementation, and **closes** no MVP-2.

Every assessment below is grounded **read-only** against the merged predecessor decision record in the Dixie repo at
authoring time and against the **unchanged** Dixie source surface. The frozen Phase 47J / 47F execution-sink source is
read read-only for citation grounding only: the injected `IsolationSpikeStatementSink` interface (`index.ts:124`), the
all-or-nothing `applyIsolationSpikePlan(plan, sink)` (`index.ts:568`), the pure execution-gate seam
(`evaluateIsolationSpikeExecutionGate` at `index.ts:661`, `assertIsolationSpikeExecutionGateOpen` at `index.ts:700`,
`SYNTHETIC_REF_MAX_LENGTH = 80` at `index.ts:718`; `index.ts` is **914 lines**), and the explicit runner
`app/scripts/aw-sql-isolation-spike-runner.mjs` (**498 lines**, the only DB-touching caller, outside the guarded
`SPIKE_FILES`). The **unchanged** production path is read read-only: the migration runner `app/src/db/migrate.ts`
(**254 lines** — it has **no** line 303–305), the build-asset packager `app/scripts/copy-migrations.mjs`, the
conditional startup migrate `if (dbPool)` at **`server.ts:303`** with `await migrate(dbPool)` at **`server.ts:305`**
(`server.ts` is **773 lines**), the env parsing in `app/src/config.ts` (`DATABASE_URL` at `config.ts:340`; `config.ts`
is **485 lines**), the runtime no-leak guard `app/src/services/admission-wedge-spike/no-leak.ts` (114-key
`FORBIDDEN_PUBLIC_KEYS` after the Phase 46P / 46Q parity restoration; **286 lines**), and the **canonical** Phase 33N
static scope guards `app/tests/unit/admission-wedge-spike/scope-guards.test.ts` (the 19-entry `DURABLE_WRITE_DENYLIST`
at `scope-guards.test.ts:122-142`; the forbidden-import test at `:185`; the file is **364 lines**) — all of which Phase
47Q leaves **unedited**. The canonical `StorageAdapter` / `Assertion` / `TransitionReceipt` / `AuditEvent` shapes and
ADR-022E / ADR-022D live in the adjacent `loa-straylight` repo; they are cited as **cross-repo references only** and no
adjacent-repo file is read-modified or touched. Nothing below is executed; this gate **decomposes an already-merged,
already-selected blocker** and **selects a next docs/decision-only lane**, it produces no evidence and discharges
nothing.

---

## 1. Status / verdict

**Verdict: DECOMPOSE ADR-022E GATE #8 / SELECT GATE #8 CLEARING-READINESS GATE NEXT; GATE #8 REMAINS OPEN.**

This is **decision-structure Option A** (§16): the ADR-022E gate #8 / production storage-adapter binding corridor that
Phase 47P selected (47P §17) is **decomposed** here into its unresolved architectural predicates, and the next lane is a
**further, separate, strictly docs/decision-only** ADR-022E gate #8 **clearing-readiness gate** — a gate that will
determine whether enough architecture evidence exists to clear gate #8 (operatively) later, *before* any direct
production storage-adapter ownership/placement ADR update or any implementation. Option A is selected because the
predicate inventory (§7) shows gate #8 still has **multiple unresolved architectural predicates** — the canonical-store
physical host, the migration-file and migration-execution owners, the runtime route storage-call owner, the
Lane-1-to-Lane-2 relationship, the auth / consent / signer / authority attachment, and the tenant / estate / actor
identity binding — that must be resolved (or formally judged sufficient) before gate #8 can be discharged, so the
disciplined next rung is a readiness assessment, not an ownership ADR update (Option B) or any build.

Crucially — and consistent with the chain's decompose-before-authorize discipline — selecting Option A does **not**
discharge gate #8 and does **not** authorize any production work. It selects the *next decomposition / readiness lane*:

> **Selected next lane (§17): Phase 47R — Admission Wedge ADR-022E gate #8 clearing-readiness gate** (a *separate*,
> strictly docs / decision-only gate that assesses whether the architecture evidence is sufficient to *later* clear gate
> #8 — NOT a production implementation, NOT a durable-store lane, NOT a storage-adapter ownership/placement ADR update,
> NOT the gate-#8 discharge, and NOT the MVP-2 closure itself).

> **Phase 47R status note (forward traceability; added by the Phase 47R ADR-022E gate #8 clearing-readiness gate).** The
> next lane this gate selected (§17) has run:
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-GATE.md)
> **assessed** gate-#8 clearing readiness across the thirteen Phase 47Q §7 predicates, concluded the rolled-up verdict is
> **NOT YET READY for operative discharge** (multiple predicates NOT READY plus the externally-held Straylight-side
> operative discharge), **defined the minimum discharge checklist** (items D.1–D.14, all currently unsatisfied) a future
> operative-discharge lane and Straylight teammate review must satisfy, **produced no evidence** (strictly
> docs/decision-only), and **selected Option A — a separate, strictly docs/decision-only Phase 47S ADR-022E gate #8
> clearing-readiness *acceptance* gate** as the next lane. Phase 47R discharged **no** gate, concluded **no**
> readiness-for-discharge, cleared gate #8 **no** further than Phase 46N's documentation / architecture / handoff
> prerequisite, implemented **no** storage, updated **no** ownership ADR, authorized **no** production work, and **closed
> no MVP-2**; **gate #8 and MVP-2 remain OPEN** and all production / gate-#8 discharge / MVP-2 closure work stays blocked.

For the avoidance of doubt, this decomposition is **bounded** and says only what the chain supports:

- **"Decompose the gate #8 / storage-adapter binding blocker" means enumerating its unresolved predicates and routing
  them to a readiness gate** — it does **not** discharge ADR-022E gate #8, **not** implement a storage adapter,
  **not** bind any production storage, **not** update any ownership/placement ADR, and **not** open the corridor for
  implementation.
- **It does not discharge ADR-022E gate #8.** Gate #8 was cleared by Phase 46N **only** as a documentation /
  architecture / handoff prerequisite; the **operative Straylight-side discharge remains held** and is the dominant
  cross-repo blocker (§6 / §9). This gate discharges nothing further and clears nothing further.
- **It does not close MVP-2.** MVP-2 closure remains a *further, separate* terminal gate downstream of every blocker
  (§7 / §16 / §17). **MVP-2 remains OPEN.**
- **It does not authorize production DB execution, production `--apply`, production DB writes, or production migration
  execution** (§10 / §18).
- **It does not authorize durable production storage, a production storage adapter, Lane-2 canonical Straylight-store
  migrations, production auth / consent / signer / authority, tenant / estate / actor identity binding, route / API
  behavior change, public-response expansion, raw-payload persistence, or Freeside runtime / client integration**
  (§8–§15 / §18).
- **It does not freeze the route contract or the final schema** (`route_contract_final` stays false; `schema_final`
  stays false).
- **It makes no claim that `aw_*` SQL is production-safe.**

What Phase 47Q **is**, stated narrowly: it is **docs / decision-only**. It reads the merged Phase 47P selection record
and the gate-#8 ADR chain (46N / 46M / 46I) read-only, restates the gate-#8 blocker statement (§6), assembles the
unresolved-predicate inventory as a table (§7), decomposes each predicate domain (§8–§15), disposes the decision options
(§16), selects the next docs/decision-only lane (§17), records non-goals and blocked work (§18), provides a Codex audit
checklist (§19), and runs the docs validators on the unchanged artifacts (§20). It implements, executes, enables,
injects, freezes, clears (further), discharges, and closes (MVP-2) **nothing**.

---

## 2. Scope

Phase 47Q is the **docs/decision-only** ADR-022E gate #8 / production storage-adapter binding blocker decomposition gate
named by Phase 47P §17 — the **separate, strictly docs/decision-only** rung that, after the gate-#8 corridor was
selected as the next corridor, decomposes the gate-#8 blocker into its unresolved decision questions and decides which
lane addresses them next. Its job is to decide: (a) what remains unresolved about ADR-022E gate #8 after Phase 46N's
documentation / architecture / handoff clearing; (b) why those unresolved predicates block MVP-2; (c) what concrete
decision questions must be answered before gate #8 can be discharged; and (d) what the next docs/decision-only lane is.
It is a **decomposition / selection gate, not the gate-#8 discharge, not a storage-adapter ownership ADR update, not the
corridor implementation, and not the MVP-2 closure**.

**In scope (this PR):**

- this single new document; and
- a single minimal forward-traceability status note (§20) in the Phase 47P MVP-2 remaining-blocker decomposition gate,
  which named this Phase 47Q gate.

**Explicitly out of scope (this PR) — Phase 47Q produces nothing and runs nothing:**

- no new evidence of any kind; no disposable database; no role; no grant; no privilege test; no forward or cleanup SQL
  run under any role; no `psql` session; no Docker / Postgres invocation; no operator run;
- no runtime source / test / config / package / SQL / migration / route-vector / validator / fixture change;
- no edit to `index.ts`, the runner, `no-leak.ts`, `scope-guards.test.ts`, `migrate.ts`, `copy-migrations.mjs`,
  `server.ts`, `config.ts`, or any `*.sql`;
- no production `--apply` enablement, no DB client / sink injection, no DB connection, no DB write, no migration
  execution;
- no durable-store implementation, no storage-adapter implementation, no production migration file;
- no storage-adapter ownership / placement ADR update or freeze;
- no auth / consent / signer / authority implementation; no tenant / estate / actor identity implementation;
- no route / API behavior change, no public response change, no raw candidate payload persistence, no Freeside
  integration;
- no Lane-2 canonical Straylight-store migration; no ADR-022E gate #8 discharge (operative or otherwise); no
  route-contract / final-schema freeze; **no MVP-2 closure**; no production readiness claim; no claim that `aw_*` SQL is
  production-safe.

This gate **decomposes and selects**; it **produces** nothing, **discharges** nothing, **opens** no corridor, and
**closes no MVP-2**. Production execution, production storage, the operative gate-#8 discharge, and MVP-2 closure are
exactly what *future, separate gates* must adjudicate — not what this gate asserts.

---

## 3. Source chain

Each predecessor is read **read-only**; this gate re-accepts no predecessor decision and unblocks no production lane.

- **Phase 46I / PR #154 (`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`)** — recorded what gate #8 requires, selected
  split-storage Option 4 as the topology *direction*, and left the physical adapter placement unresolved. **Not
  modified.**
- **Phase 46M / PR #158 (`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`)** — evaluated
  candidate placements A–F, selected **Candidate D** (split storage; Dixie route-side adapter as a `StorageAdapter`
  swap-in; Straylight canonical ownership preserved; canonical-store host + concrete substrate future-gated) as the
  production-adapter placement candidate, and decomposed the durable schema / migration families without freezing schema
  or authoring a migration. **Not modified.**
- **Phase 46N / PR #159 (`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`)** — **cleared ADR-022E gate #8 as
  a documentation / architecture / handoff prerequisite only** (conjunct (a) Candidate D proposed; conjunct (b) sibling
  handoff packet cited; conjunct (c) ADR-022D invariants preserved), with the **operative Straylight-side discharge
  remaining held** and sibling gates #9 / #10 / #11 / #12 / #15 / #20 remaining held. **The central gate-#8 record this
  gate decomposes; not modified.**
- **Phase 46P / PR #161 + Phase 46Q / PR #162** — restored and accepted the runtime `no-leak.ts`
  `FORBIDDEN_PUBLIC_KEYS` mirror to **114-key** parity with the validator. **Not modified.**
- **Phase 47F–47O (PR #177–#186)** — the bounded non-production Lane-1 `aw_*` SQL isolation → execution-sink →
  least-privilege evidence → corridor-closure chain; Phase 47O closed the corridor **only for the bounded non-production
  proof corridor** and kept MVP-2 OPEN. **Not modified.**
- **Phase 47P / PR #187 (commit `e1cc3391`,
  `ADMISSION-WEDGE-MVP2-REMAINING-BLOCKER-DECOMPOSITION-GATE.md`)** — **decomposed** the standing MVP-2 blockers,
  **selected Option A** (the ADR-022E gate #8 / production storage-adapter binding corridor), and **named this Phase
  47Q** decomposition gate as the next lane. **The immediate predecessor; gains the single Phase 47Q forward-traceability
  status note (§20).**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner and the
  decision records cited as guardrails (§9 / §18). Cross-repo references, **not edited.**

This decomposition also reads, read-only, the merged Dixie decision records that already decompose individual downstream
predicates — among them the durable-store schema / migration design gates
(`…-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md`, `…-DESIGN-ACCEPTANCE-GATE.md`), the durable-store
implementation-readiness gates (`…-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`,
`…-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md`), and the auth / consent design gates
(`…-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`, `…-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`,
`…-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`). **None is edited;** each is referenced only to ground the
predicate statuses below as design / decomposition artifacts, **not** implemented production architecture.

---

## 4. Question being decided

Phase 47P §17 routed the ADR-022E gate #8 / production storage-adapter binding blocker decomposition to this gate. Phase
47Q decides exactly one question, in four precisely-bounded parts:

1. **What remains unresolved about ADR-022E gate #8** after Phase 46N cleared it as a documentation / architecture /
   handoff prerequisite — i.e., which architectural predicates still stand between the paper-level clearing and an
   operative discharge (§6 / §7)?
2. **Why do those unresolved predicates block MVP-2** — which downstream production work each predicate gates (§7–§15)?
3. **What concrete decision questions must be answered before gate #8 can be discharged** — enumerated as the unresolved
   predicate inventory and decomposed by domain (§7–§15)?
4. **Which next docs/decision-only lane should address those questions** — given that gate-#8 discharge and MVP-2 closure
   are further, separate terminal gates (§16 / §17)?

The question is **not** whether to discharge ADR-022E gate #8 (Phase 47Q discharges nothing; the operative discharge is
Straylight-owned and held, §9), **not** whether to update any storage-adapter ownership / placement ADR (Option B is not
selected, §16), **not** whether to implement any corridor (Phase 47Q implements none), **not** whether to authorize any
production work (all production work stays blocked, §8–§15 / §18), and **not** whether to close MVP-2 (closure is a
further separate terminal gate, §16 / §17). It is strictly: *what remains unresolved about gate #8, why it blocks MVP-2,
what must be decided to discharge it, and what the next docs/decision-only lane is.*

---

## 5. Phase 47P selected-corridor intake

Phase 47P (PR #187) is the lane that selected this gate's corridor. Stated accurately and read-only:

- **Phase 47P decomposed the standing MVP-2 blockers** into a dependency map (47P §8) and found a single dominant
  upstream node — **ADR-022E gate #8 / production storage-adapter binding** — that sits upstream of production durable
  storage, storage-adapter ownership / placement, the Lane-2 canonical Straylight-store migration path, and production
  migration execution (47P §8 map conclusion).
- **Phase 47P selected Option A** — the ADR-022E gate #8 / production storage-adapter binding corridor — as the next
  corridor, because it sequences the largest number of downstream blockers behind a single decision (47P §16 / §17).
- **Phase 47P named this Phase 47Q gate** as the next strictly docs/decision-only lane: "Phase 47Q — Admission Wedge
  ADR-022E gate #8 production storage-adapter binding blocker decomposition gate (a *separate*, strictly docs /
  decision-only gate — NOT a production implementation, NOT a durable-store lane, NOT the gate-#8 discharge, and NOT the
  MVP-2 closure itself)" (47P §17).
- **Phase 47P discharged nothing and kept MVP-2 OPEN.** It implemented no storage, authorized no production work,
  discharged no gate, and made no claim that `aw_*` SQL is production-safe (47P §1 / §18).

> **Phase 47P selected the corridor; Phase 47Q decomposes the blocker inside it.** The distinction matters: 47P's job
> was to choose *which* blocker corridor to open next; 47Q's job is to state *what remains unresolved* inside that
> corridor, *why* it blocks MVP-2, *what* must be decided to discharge gate #8, and *which* docs/decision-only lane
> addresses those questions next. Neither gate discharges gate #8, implements storage, or closes MVP-2.

---

## 6. ADR-022E gate #8 blocker statement

**BLOCKED after Phase 47Q.** ADR-022E gate #8 ("Production database / persistence substrate") is the Straylight-owned,
operatively-held durable-store gate. Its current state, grounded read-only against the Phase 46N re-authored clearing
ADR and the canonical ADR-022E / ADR-022D references, is:

- **Cleared only as a documentation / architecture / handoff prerequisite.** Phase 46N cleared gate #8 at the paper
  level — it is the separate ADR that *proposes* the production adapter (Candidate D), *cites* the re-authored sibling
  handoff packet, and *preserves* the ADR-022D receipt / audit-chain invariants. That clearing is tightly bounded: it
  authorizes no durable store, no DB writes, no migrations, no route / API behavior change, no auth / consent
  implementation, no production admission, and freezes neither the route contract nor the final schema (46N §1 / §9 /
  §10).
- **Operatively held.** The gate-table preamble's operative production-feature unblocking pathway — "the trigger is
  satisfied **and** a separate ADR (or sibling-repo PR under teammate review per the cross-repo handoff index) explicitly
  cites the trigger" — still requires **Straylight teammate review and acceptance**. A Dixie docs-only phase cannot, by
  itself, discharge that operative Straylight-side gate (46N §4.7). The operative discharge is therefore **still held**.
- **Sibling gates held.** The related sibling gates that govern any Dixie/Finn durable *wiring* — **#9** (Finn runtime
  wiring), **#10** (Dixie boundary wiring), **#11** (Freeside-as-consumer), **#12** (network surface), **#15**
  (sibling-repo edits), **#20** (threat-model widening) — each remain **held** with its own trigger (46N §4.6).

**Why gate #8 blocks MVP-2.** MVP-2 requires durable production admission storage. The canonical durable substrate gate
#8 governs is **Straylight-owned semantics**, and production durable storage, storage-adapter ownership / placement, the
Lane-2 canonical Straylight-store migration path, and production migration execution all sit downstream of gate #8's
operative discharge (47P §8). Until the operative gate is discharged through the Straylight-teammate-reviewed pathway —
and until the unresolved predicates below (§7) are resolved or formally judged sufficient — none of that downstream
production work can be authorized, so MVP-2 cannot close. **This gate decomposes those unresolved predicates; it
discharges gate #8 no further and clears it no further.**

---

## 7. Gate #8 unresolved predicate inventory

The predicates below are what remains unresolved between Phase 46N's documentation / architecture / handoff clearing and
an operative gate-#8 discharge. Each row records the predicate, the current (read-only) evidence, the unresolved
decision question, what it blocks, the required future gate / evidence, and this gate's Phase 47Q decision. **No row
asserts that any predicate is discharged, implemented, resolved, or production-safe**; every row's Phase 47Q decision is
to *decompose and route to the readiness gate*, nothing more. The thirteen rows correspond to the thirteen decision
questions §4 part 3 enumerates, decomposed by domain in §8–§15.

| Predicate | Current evidence (read-only) | Unresolved question | Blocks | Required future gate / evidence | Phase 47Q decision |
|-----------|------------------------------|---------------------|--------|----------------------------------|--------------------|
| **Storage-adapter ownership / placement** | Candidate D (split storage) *proposed*: Dixie route-side adapter for route-owned records, canonical store Straylight-owned; canonical-store physical host future-gated by #9 / #10 (46M §6; 46N §11 row 1) | Is Candidate D accepted as production architecture, and which component hosts the canonical store (Straylight / Finn / Dixie-hosted adapter)? | Production durable storage; Lane-2 placement; migration execution | Gate-#8 clearing-readiness gate (Phase 47R), then an ownership/placement acceptance gate; held sibling gates #9 / #10 | **DECOMPOSE; route to readiness gate.** Not resolved here. |
| **Canonical semantics owner** | Canonical `Assertion` / `TransitionReceipt` / `AuditEvent` and `StorageAdapter` / `AuditLog` are **Straylight-owned**; Dixie holds ingress references only (46N §5; ADR-022D §1) | Confirmed unchanged — no Dixie redefinition; what evidence proves any production substrate preserves the ADR-022D invariants? | Any production substrate proposal | Gate-#8 clearing-readiness gate verifies invariant preservation; Straylight teammate review | **DECOMPOSE; preserve as invariant.** Owner stays Straylight; not changed here. |
| **Migration-file owner** | Each canonical-store migration is "a separate ADR + sibling-repo PR under teammate review" (ADR-022D §7); Dixie route-owned-records migration trajectory decomposed only (46M §8); no migration authored | Who authors the executable migration files for (a) canonical store and (b) Dixie route-owned records, and when? | Production durable storage; production migration execution | Schema / migration design gate (canonical side a separate Straylight ADR + sibling-repo PR) | **DECOMPOSE; route to readiness then design gate.** No migration authored. |
| **Migration-execution owner** | Production path unchanged: `migrate.ts` (254 lines), `copy-migrations.mjs`, startup `if (dbPool)` `server.ts:303` / `await migrate(dbPool)` `server.ts:305`, `config.ts` `DATABASE_URL` `:340`; Lane-1 spike runner (`aw-sql-isolation-spike-runner.mjs`, 498 lines) is the only DB-touching caller, outside the production path | Which component executes production migrations (runner + startup wiring), and under what least-privilege role / target policy? | Durable production persistence at boot | Schema / migration design gate; production migration-execution authorization gate; least-privilege evidence (cf. Phase 47I P.1–P.7) | **DECOMPOSE; route to readiness gate.** No execution authorized. |
| **Runtime route storage-call owner** | Route handler unchanged; only the Phase 33N dev/operator-only, disabled-by-default spike surface (Storage Option A — no durable store) is authorized; index.ts execution-gate seam (`:661` / `:700`) gates the runner-only sink (`:124` / `:568`) | Which component issues runtime storage calls from the Admission Wedge route, and how is the call fail-closed and no-leak-bounded? | Production admission persistence; route / API behavior change | Gate-#8 clearing-readiness gate; route-storage spike authorization (cf. Phase 33M); route-contract pre-freeze | **DECOMPOSE; route to readiness gate.** No route storage call added. |
| **Lane-1-to-Lane-2 relationship** | Lane-1 `aw_*` SQL corridor closed **only** as a bounded non-production proof stack (47O); Lane-2 = canonical Straylight-store migrations, separate sibling-repo ADRs under teammate review, behind operative gate #8 (47O §13) | How do the bounded non-production Lane-1 `aw_*` proof artifacts relate to (and explicitly *not* pre-authorize) the Lane-2 canonical migrations? | Misreading Lane-1 proof as production-safe; Lane-2 sequencing | Gate-#8 clearing-readiness gate states the Lane-1 ≠ Lane-2 boundary explicitly | **DECOMPOSE; assert boundary.** Lane-1 is not a production-safe claim (§12). |
| **Production DB write authorization** | No production DB write exists or is authorized; live path is the Phase 47A `.json` Mode 2 fallback; production `--apply` refused | What must be proven (least privilege, no-leak serializer, schema acceptance, operative gate discharge) before a production DB write is authorized? | Production admission persistence | Gate-#8 operative discharge; schema/migration acceptance; runtime no-leak production serializer; least-privilege evidence | **DECOMPOSE; keep BLOCKED.** No write authorized (§10 / §18). |
| **Route / API behavior-change authorization** | Route handler, public response shape, and route-vector JSON / validator unchanged; `route_contract_final` false (47P §14) | What storage + auth + identity decisions must land before the route / API behavior may change for production admission? | Production admission surface; route-contract freeze | Storage + auth + identity gates; route-contract pre-freeze gate | **DECOMPOSE; keep BLOCKED.** No route/API change (§11 / §18). |
| **Freeside integration sequencing** | Freeside stays a consumer / handoff surface; no Freeside runtime / client wiring authorized (47P §14); gate #11 (Freeside-as-consumer) held | After which gates may Freeside runtime / client integration be sequenced, and under which sibling gates (#11)? | End-to-end production admission via Freeside | Route-contract freeze; sibling gate #11; a Freeside client-contract handoff gate | **DECOMPOSE; keep BLOCKED, last surface.** No Freeside integration (§11 / §18). |
| **Auth / consent / signer / authority attachment** | Design gates only (`…-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`, `…-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`); not implemented; missing/unauthorized auth and missing/invalid consent fail closed; rows F / G / J held | Where do auth decisions, consent proof, and signer / authority refs durably attach (private audit record / `TransitionReceipt`), and what proves they stay private? | Production admission; identity binding | Storage model acceptance (durable home for consent proof / receipt); auth / consent persistence gates | **DECOMPOSE; keep BLOCKED, storage-dependent (P2).** Nothing implemented (§13 / §18). |
| **Tenant / estate / actor identity binding** | Synthetic-only binding today; session-derived binding decided on paper (`tenant_id` host-layer, `estate_id` / `actor_id` canonical, no caller override) (46G); not implemented; row G held | How does production tenant / estate / actor identity safely bind to stored records once auth / authority is implemented? | Production admission identity correctness | Auth / authority model acceptance; identity-binding persistence gate | **DECOMPOSE; keep BLOCKED, auth-dependent (P2).** Nothing implemented (§14 / §18). |
| **Public-response / raw-payload / no-leak boundary** | Public response shape unchanged; runtime `no-leak.ts` ↔ validator **114 = 114** `FORBIDDEN_PUBLIC_KEYS` parity (46P / 46Q); production serializer owed before durable runtime code emits canonical / consent refs (46N §8 / §11 row 9) | What production no-leak serializer + matching runtime fixtures must land before durable runtime code emits canonical / consent / auth / signer / storage refs? | Any expanded public contract; raw-payload persistence | Production no-leak serializer gate; route-vector + runtime-fixture extension gate | **DECOMPOSE; preserve parity, keep BLOCKED.** No public-response change; no raw-payload persistence (§15 / §18). |
| **MVP-2 closure dependency** | MVP-2 OPEN; closure is a further, separate terminal gate downstream of all of the above (47P §16 / §17) | Which minimum acceptance checklist must a later gate satisfy to discharge gate #8 and then close MVP-2? | MVP-2 closure | Gate-#8 clearing-readiness gate → operative discharge → terminal MVP-2 closure gate | **DECOMPOSE; keep OPEN.** No MVP-2 closure (§1 / §16 / §18). |

**Inventory conclusion.** Gate #8 retains **multiple unresolved architectural predicates** beyond the paper-level
clearing: the canonical-store physical host, the migration-file and migration-execution owners, the runtime route
storage-call owner, the Lane-1-to-Lane-2 relationship, the auth / consent / signer / authority attachment, and the
tenant / estate / actor identity binding. Because these are not yet resolved (or formally judged sufficient), the
disciplined next rung is a **clearing-readiness gate** that determines whether the architecture evidence suffices to
*later* discharge gate #8 — which is why **Option A** is selected (§16), not a direct ownership/placement ADR update
(Option B) and certainly not implementation (Option D) or discharge (Option E). **No predicate is moved out of
BLOCKED / UNRESOLVED status by this inventory.**

---

## 8. Storage-adapter ownership / placement decomposition

**Question 1 (ownership / placement) and the storage-adapter ownership row (§7).** The production Admission Wedge
storage-adapter binding decomposes into two distinct ownership halves, only the first of which is even *proposed*:

- **Dixie route-side adapter (route-owned records).** Candidate D *proposes* a Dixie route-side durable adapter for the
  endpoint-local contract / idempotency / replay records, ingress references, and the public / private projection — shaped
  as a **swap-in of the canonical Straylight `StorageAdapter` interface**, never a parallel canonical lifecycle (46M §6.1
  / §6.2; 46N §7). This placement is *proposed*, not *accepted as production architecture* (46N §11 row 2).
- **Canonical store (assertion / transition / receipt / audit).** The canonical `active` `Assertion`, the first-class
  `TransitionReceipt`, and the append-only hash-chained `AuditEvent` stay **Straylight-owned** through the
  `StorageAdapter` / `AuditLog` path; Dixie holds ingress references only (46N §5; ADR-022D §1). **The canonical-store
  physical host (Straylight process / Finn / a Dixie-hosted adapter) is unresolved and stays governed by held sibling
  gates #9 / #10** (46M §6.4; 46N §11 row 1).

**Unresolved decision question.** *Which component owns production Admission Wedge storage-adapter binding — Dixie
route-side adapter, Straylight canonical adapter, Finn mediator, or another placement?* Answer state: the route-owned
half is *proposed* as Dixie route-side (Candidate D); the canonical half is *Straylight-owned* with the **physical host
unresolved** (Finn vs Straylight-process vs Dixie-hosted), gated by #9 / #10. Whether Candidate D is *accepted as
production architecture* — and which host is selected — is **not decided here**; it is routed to the gate-#8
clearing-readiness gate (Phase 47R) and, downstream, an ownership/placement acceptance gate. This gate proposes,
accepts, freezes, and implements **no** placement.

---

## 9. Canonical semantics and invariants decomposition

**Question 2 (canonical semantics owner), plus the ADR-022D invariants gate #8 must preserve.** The canonical durable
substrate gate #8 governs is **Straylight-owned semantics**, read-only here to ground the decomposition:

- **Owner.** The `StorageAdapter` / `AuditLog` interface and the `Assertion`, `TransitionReceipt`, and `AuditEvent`
  primitives are **Straylight-owned** (`loa-straylight/src/straylight/storage/types.ts`,
  `…/types.ts`, `…/audit.ts` — cross-repo references only); no sibling repo redefines them (ADR-022D §1). Dixie holds
  ingress references only and re-mints no receipt (46N §5.1).
- **Invariants any production substrate must preserve.** The audit log stays append-only, hash-chained, and
  tamper-detectable via `verifyChain`; the six receipt categories (included / excluded / redacted / challenged / revoked
  / blocked-by-policy) are preserved; the MVP host serves receipts the wedge already produced and re-mints none;
  `AuditEvent` stays Straylight-owned and unmigrated; each migration is "a separate ADR + sibling-repo PR under teammate
  review" (ADR-022D §1 / §3 / §4 / §5 / §7; 46N §5).

**Unresolved decision question.** *Which component owns canonical storage semantics and invariants?* Answer state:
**Straylight**, unchanged — and the unresolved part is the *evidence* that any future production substrate preserves the
ADR-022D invariants, which the clearing-readiness gate must verify before discharge and which Straylight teammate review
must accept. This gate changes **no** canonical semantics, proposes **no** substrate, and discharges **no** invariant
obligation; it records that the owner stays Straylight and the preservation evidence is owed.

---

## 10. Migration ownership / execution decomposition

**Questions 3 and 4 (migration-file owner; migration-execution owner), plus question 8 (production DB write
authorization).**

- **Migration-file owner.** Each **canonical-store** migration is, by ADR-022D §7's own design, "a **separate** ADR +
  sibling-repo PR under teammate review" — Straylight-owned, not Dixie-authored (46N §5.5; ADR-022D §7, `:149-166`). The
  **Dixie route-owned-records** migration trajectory was *decomposed* (46M §8) but **no migration is authored**, no
  schema is frozen, and the initial creation has no production data to migrate (46M §8). *Who authors which migration
  files, and when,* is unresolved and routed to a schema / migration design gate (the canonical side via a separate
  Straylight ADR + sibling-repo PR).
- **Migration-execution owner.** The production migration path is **unchanged**: the runner `migrate.ts` (254 lines —
  **no** line 303–305), the packager `copy-migrations.mjs`, the conditional startup migrate `if (dbPool)` at
  `server.ts:303` / `await migrate(dbPool)` at `server.ts:305`, and the env wiring `config.ts` `DATABASE_URL` at `:340`
  are all untouched. The only DB-touching caller in the chain is the **bounded non-production** Lane-1 spike runner
  `aw-sql-isolation-spike-runner.mjs` (498 lines), which sits **outside** the production path behind the guarded
  `SPIKE_FILES` and the execution-gate seam (`index.ts:661` / `:700` gating the injected sink `index.ts:124` /
  `applyIsolationSpikePlan` `index.ts:568`). *Which component executes production migrations (runner + startup wiring),
  under what least-privilege role / target policy,* is unresolved and routed to a production migration-execution
  authorization gate (with least-privilege evidence in the manner of Phase 47I §16 P.1–P.7).
- **Production DB write authorization.** No production DB write exists or is authorized; the live path remains the Phase
  47A `.json` Mode 2 fallback; production `--apply` is refused. *What must be proven before a production DB write is
  authorized* — operative gate-#8 discharge, schema / migration acceptance, the runtime no-leak production serializer,
  and least-privilege execution-role evidence — is decomposed here and routed forward; **no production DB write is
  authorized by this gate** (§18).

This gate authors **no** migration, executes **no** migration, changes **no** runner / packager / startup / config, and
authorizes **no** production DB write.

---

## 11. Route / runtime storage-call decomposition

**Question 5 (runtime route storage-call owner), plus question 9 (route / API behavior-change authorization) and
question 10 (Freeside integration sequencing).**

- **Runtime route storage-call owner.** The Admission Wedge route handler is **unchanged**; the only authorized route
  surface is the Phase 33N dev/operator-only, disabled-by-default spike, which uses **Storage Option A** (no durable
  store, no DB writes, no migrations). No production runtime storage call is issued from the route. *Which component
  issues runtime storage calls from the route, and how the call is fail-closed and no-leak-bounded,* is unresolved and
  routed to the gate-#8 clearing-readiness gate and, downstream, a route-storage spike authorization gate (cf. Phase
  33M) and a route-contract pre-freeze gate.
- **Route / API behavior-change authorization.** The route handler, the public response shape, and the route-vector
  JSON / validator are unchanged; `route_contract_final` stays false. *What storage + auth + identity decisions must
  land before the route / API behavior may change for production admission* is decomposed here; the route / API behavior
  change is **P3 downstream surface work** dependent on the storage + auth + identity corridors, and **no route / API
  change is authorized** (§18).
- **Freeside integration sequencing.** Freeside stays a **consumer / handoff surface**; no Freeside runtime / client
  wiring is authorized, and sibling gate **#11** (Freeside-as-consumer) is held. *After which gates Freeside runtime /
  client integration may be sequenced* is decomposed here: it is the **last surface**, downstream of the route-contract
  freeze and gated by #11, and routed to a future Freeside client-contract handoff gate. **No Freeside integration is
  authorized** (§18).

This gate changes **no** route / API behavior, issues **no** runtime storage call, and authorizes **no** Freeside
integration.

---

## 12. Lane-1 vs Lane-2 relationship

**Question 6 (Lane-1 `aw_*` SQL proof artifacts ↔ Lane-2 canonical Straylight-store migrations).** This predicate is the
one most at risk of being mis-read, so it is stated precisely:

- **Lane-1 (`aw_*` SQL execution corridor).** Phase 47O closed the Lane-1 `aw_*` SQL execution corridor **only as a
  bounded non-production proof stack** — disabled-by-default, dev/operator/test-only, location-isolated, with `--apply`
  refused on the planning spike and the execution-sink spike proven only against a disposable, non-production PostgreSQL
  target under a least-privilege role (47O §5 / §9). Phase 47O made **no** claim that `aw_*` SQL is production-safe.
- **Lane-2 (canonical Straylight-store migrations).** The Lane-2 canonical Straylight-store migration / schema path is
  unimplemented and unaccepted; each canonical-store migration is "a separate sibling-repo ADR under Straylight teammate
  review," behind the **operative** gate #8 (47O §13; ADR-022D §7).
- **The relationship.** The remaining MVP-2 obstacles are **production / cross-repo** blockers (gate #8, Lane-2 canonical
  migrations, production storage / auth), **not** an adjacent non-production proof corridor (47O Option C reasoning). The
  Lane-1 proof artifacts are **evidence about a bounded non-production proof corridor only**; they do **not** pre-author,
  pre-accept, or pre-authorize the Lane-2 canonical migrations, and they carry **no** production-safe claim. The explicit
  Lane-1 ≠ Lane-2 boundary — what (if anything) the bounded proof artifacts inform for the canonical path versus what
  must be re-derived under Straylight teammate review — is a question the gate-#8 clearing-readiness gate must state
  explicitly.

**Unresolved decision question.** *How are Lane-1 `aw_*` SQL proof artifacts related to Lane-2 canonical Straylight-store
migrations, and what stays Dixie-specific vs Straylight-canonical?* Answer state: Lane-1 is a bounded non-production
proof; Lane-2 is canonical, Straylight-owned, behind the operative gate; the route-owned-records adapter / migration
trajectory is the **Dixie-specific** half, and the canonical assertion / transition / receipt / audit store + its
migrations are the **Straylight-canonical** half. This gate **asserts the boundary** and routes the explicit
relationship statement to the clearing-readiness gate; it makes **no** production-safe claim about `aw_*` SQL and
authorizes **no** Lane-2 migration.

---

## 13. Auth / consent / signer / authority dependency

**Question 11 (auth / consent / signer / authority attachment to storage).** The production auth / consent / signer /
authority model is **not implemented**; only design / decision gates exist
(`…-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`, `…-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`,
`…-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md` — design artifacts, not implemented production code). Rows F
(production signer / authority), G (production tenant / estate / actor identity binding), and J (final endpoint
idempotency keying) remain held (33U §4). Missing / unauthorized auth fails closed; missing / invalid consent fails
closed in any future production admission model, and service-token / operator auth is never treated as consent.

**Why this is storage-dependent.** A production auth / consent model needs a **durable home** for what it records:
consent proof and `TransitionReceipt` material must have a durable place before an auth / consent model can be
implemented, and the auth-decision / consent reference must live on the **private audit record only**, never the public
response (46H §6; 46N §11 rows 4 / 5 / 6). So this corridor is **P2**, downstream of the storage model being decided
first.

**Unresolved decision question.** *What evidence is needed for production auth / consent / signer / authority to safely
attach to storage?* Answer state: the durable storage model (where consent proof / receipt / signer refs persist
privately) must be accepted first; then auth / consent / signer persistence plans must be authored and accepted. This
gate implements **no** auth, consent, signer, or authority, and routes the dependency to the clearing-readiness gate and
the downstream auth / consent persistence gates.

---

## 14. Tenant / estate / actor identity dependency

**Question 11 (continued) — tenant / estate / actor identity binding.** Production tenant / estate / actor identity
binding is **unresolved**; the binding is **synthetic-only** today. The session-derived binding decided on paper —
`tenant_id` at the host layer, `estate_id` / `actor_id` canonical, with **no caller override** (46G) — is a design
decision, not implemented code; row G is held.

**Why this is auth-dependent.** Real production identity binding **depends on** the auth / authority model (§13), which
in turn depends on the storage model — so identity binding is **P2**, downstream of the selected gate-#8 corridor and
the storage model.

**Unresolved decision question.** *How does production tenant / estate / actor identity safely bind to stored records
once auth / authority is implemented?* Answer state: it depends on the auth / authority model being implemented, which
depends on the storage model being accepted. This gate implements **no** tenant / estate / actor identity binding and
makes **no** production identity claim; it routes the dependency to the clearing-readiness gate and the downstream
identity-binding persistence gate.

---

## 15. Public response / raw payload / no-leak dependency

**Question 12 (no-leak / public-response / raw-payload-persistence rules to preserve).** The public response shape is
**unchanged**, and the runtime `no-leak.ts` ↔ route-vector validator **114 = 114** `FORBIDDEN_PUBLIC_KEYS` parity is
intact after the Phase 46P / 46Q runtime-mirror restoration (52 → 114). Public responses leak **no** raw / private /
audit / debug / source / auth / signer / consent / storage material; private `TransitionReceipt` / `AuditEvent` /
consent proof / storage material remains private; user chat does **not** become memory merely because it was said;
`active` remains the canonical assertion status (not a public `outcome_class`); `recall_eligible` remains derived /
projection-only.

**Why this is route-dependent and what is still owed.** Although the runtime mirror is now at parity, a **production
no-leak serializer** — the serializer that will run when durable runtime code begins emitting canonical / consent / auth
/ signer / storage refs internally — is still owed **before** any such durable runtime code is authorized (46N §8 / §11
row 9), together with matching runtime fixtures and the route-vector + `--self-check` extension for the durable model.
This corridor is **P3**, downstream of the route / API behavior corridor and conditioned on preserving the parity.

**Unresolved decision question.** *What no-leak / public-response / raw-payload-persistence rules must be preserved, and
what production serializer must land before durable runtime code emits canonical / consent refs?* Answer state: the
parity and the private-stays-private rules must be preserved unchanged; the production serializer + matching runtime
fixtures + vector extension are owed before durable runtime code is authorized. This gate **preserves the parity**,
expands **no** public response, persists **no** raw candidate payload, and routes the production-serializer requirement
forward.

---

## 16. Decision options

Phase 47Q weighs five options for the disposition of the ADR-022E gate #8 / production storage-adapter binding blocker:

### Option A — DECOMPOSE gate #8 and SELECT a gate #8 clearing-readiness gate next. **SELECTED.**

**Selected** because the predicate inventory (§7) shows gate #8 retains **multiple unresolved architectural predicates**
— the canonical-store physical host, the migration-file and migration-execution owners, the runtime route storage-call
owner, the Lane-1-to-Lane-2 relationship, the auth / consent / signer / authority attachment, and the tenant / estate /
actor identity binding — beyond Phase 46N's documentation / architecture / handoff clearing. The disciplined next rung is
a **strictly docs/decision-only clearing-readiness gate** (Phase 47R) that determines whether the architecture evidence
is sufficient to *later* clear gate #8 operatively — *before* any direct storage-adapter ownership / placement ADR update
(Option B), any implementation (Option D), or any discharge (Option E). Consistent with the chain's
decompose-before-authorize discipline, Option A discharges **no** gate, updates **no** ADR, implements **no** storage,
and closes **no** MVP-2; it routes the decomposed predicates to the readiness gate.

### Option B — SELECT a production storage-adapter ownership / placement ADR update next. **Not selected.**

**Not selected.** A direct ownership / placement ADR update would attempt to *settle* Dixie vs Straylight vs Finn
ownership / placement at the architecture level before the full predicate set (§7) has been assessed for sufficiency.
Candidate D already *proposes* the route-owned-records placement (46M / 46N), and the canonical-store physical host is
governed by held sibling gates #9 / #10 — so the open question is not "author another placement ADR" but "is the
existing architecture evidence sufficient to clear gate #8," which is precisely a **readiness** question (Option A).
Option B is the natural successor *after* a clearing-readiness gate concludes the evidence is sufficient and identifies
a specific ownership/placement gap to update, not before it. It is therefore held as the non-selected, downstream
alternative.

### Option C — SELECT a Lane-2 canonical Straylight-store migration / schema alignment gate next. **Not selected.**

**Not selected.** The Lane-2 canonical Straylight-store migration / schema path **depends on** the gate-#8 corridor
decision and the canonical `StorageAdapter` shape (Straylight-owned), and each canonical-store migration is "a separate
sibling-repo ADR under Straylight teammate review" behind the operative gate (§12; ADR-022D §7). Aligning Lane-2 before
the gate-#8 storage-adapter boundary is assessed for readiness would invert the dependency order. Option C is the
natural successor *after* the adapter binding is sufficiently decomposed and the readiness gate concludes — not now.

### Option D — SELECT production durable-store implementation authorization next. **REJECTED.**

**Rejected.** Implementation authorization is not supported: gate #8's **operative** discharge is held, the §7 predicates
are unresolved, the production no-leak serializer is owed, no schema / migration is accepted, and no least-privilege
production-execution evidence exists. Authorizing implementation now would skip every readiness rung the chain's
discipline requires. Option D is rejected; durable-store implementation **remains BLOCKED**.

### Option E — DISCHARGE ADR-022E gate #8 now. **REJECTED.**

**Rejected**, and strongly so. Gate #8's operative discharge is **Straylight-owned** and requires the preamble's
separate-ADR / sibling-repo-PR-under-Straylight-teammate-review pathway (46N §4.7); a Dixie docs-only phase cannot
discharge it. The §7 predicates are unresolved, the sibling gates #9 / #10 / #11 / #12 / #15 / #20 are held, and nothing
in the evidence warrants discharge. Phase 47Q discharges **nothing**; **gate #8 REMAINS OPEN**.

**Conclusion.** Decision-structure **Option A**: decompose the ADR-022E gate #8 / production storage-adapter binding
blocker (§7–§15); select a separate, strictly docs/decision-only Phase 47R clearing-readiness gate (§17); keep Phase 47Q
docs/decision-only; preserve every unresolved predicate and every invariant; reject Options D and E; hold Options B / C
as the non-selected, downstream-ordered alternatives the predicate inventory does not warrant selecting first.

---

## 17. Selected next lane

> **Selected next lane: Phase 47R — Admission Wedge ADR-022E gate #8 clearing-readiness gate** (a *separate*, strictly
> docs / decision-only gate that assesses whether the architecture evidence is sufficient to *later* clear gate #8
> operatively — NOT a production implementation, NOT a durable-store lane, NOT a storage-adapter ownership/placement ADR
> update, NOT the gate-#8 discharge, and NOT the MVP-2 closure itself).

With the gate-#8 / storage-adapter binding blocker decomposed into its unresolved predicates (§7–§15), the disciplined
next rung is a **docs/decision-only clearing-readiness gate** (Phase 47R) that takes the §7 predicate inventory and, for
each predicate, judges whether the existing architecture evidence is sufficient to *later* discharge gate #8 — defining
the **minimum acceptance checklist** a future operative-discharge lane (and Straylight teammate review) must satisfy —
**without itself discharging the gate, updating any ownership ADR, implementing any storage, or closing MVP-2.**

Phase 47R **must be strictly docs / decision-only**. It must **not** produce evidence, run any role / grant test, enable
production `--apply`, inject any sink, open any connection, change any production-path file, implement a durable store or
storage adapter, write a production migration, freeze any contract / schema, discharge ADR-022E gate #8 or any
Straylight-side gate, or close MVP-2. Whether gate #8 can ever be discharged is a *further, separate* event that requires
Straylight teammate review per the preamble (46N §4.7); whether MVP-2 can ever close is a *further, separate* terminal
gate downstream of the full blocker set (47P §16).

**Why a clearing-readiness gate is next** (restated from §7 / §16): gate #8 retains multiple unresolved architectural
predicates after the paper-level clearing, so before any ownership/placement ADR update (Option B), Lane-2 alignment
(Option C), implementation authorization (Option D), or discharge (Option E), the chain needs a single assessment of
*whether the architecture evidence is sufficient* and *what minimum checklist a discharge must meet*. That readiness
assessment sequences every other downstream rung.

**Not selected as the next lane:** a storage-adapter ownership / placement ADR update (Option B — premature before a
readiness assessment, §16); a Lane-2 canonical Straylight-store migration / schema alignment gate (Option C — downstream
of the gate-#8 boundary, §12 / §16); production durable-store implementation authorization (Option D — rejected, §16); a
gate-#8 discharge (Option E — rejected; Straylight-owned and held, §16). Each remains a *future, separate* docs/decision
lane in dependency order; none is opened, implemented, updated, or authorized here.

**Non-authorizations and invariants preserved** (carried forward unchanged):

- A pending candidate is not recallable.
- A rejected candidate creates no admitted assertion.
- An accepted candidate creates / references an admitted assertion.
- A superseded assertion is excluded from ordinary recall unless explicitly requested / marked.
- A malformed / unsafe payload fails closed.
- Missing / unauthorized auth fails closed; missing / invalid consent fails closed in any future production admission
  model.
- Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage material;
  private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private.
- User chat does not become memory merely because it was said.
- `active` remains the canonical assertion status, not a public `outcome_class`; `recall_eligible` remains derived /
  projection-only.
- The canonical audit log is append-only, hash-chained, and tamper-detectable via `verifyChain`.

---

## 18. Non-goals and blocked work

Phase 47Q explicitly does **none** of the following — each remains exactly as blocked / deferred as before this gate:

- It does not produce evidence, run a role / grant test, open a DB connection, run forward or cleanup SQL, or invoke
  `psql` / Docker / Postgres.
- It does not enable production `--apply`, inject a DB client / sink, perform a DB write, or execute a migration.
- It does not implement durable production storage, a production storage adapter, a production migration file, or an
  executable production schema.
- It does not update or freeze any storage-adapter ownership / placement ADR.
- It does not change any migration runner / packager / startup / config / scope-guard / route handler / route-vector /
  validator / fixture / package / lockfile / CI file.
- It does not implement auth, consent, signer, authority, or tenant / estate / actor identity binding.
- It does not change route / API behavior, expand the public response, or persist any raw candidate payload.
- It does not freeze the route contract or the final schema.
- It does not discharge ADR-022E gate #8 (operatively or otherwise) or any Straylight-side gate, and it clears gate #8
  no further than Phase 46N's documentation / architecture / handoff prerequisite.
- It does not authorize Freeside integration or Lane-2 canonical Straylight-store migrations.
- It does not authorize production migration execution / runner / startup wiring or any config behavior change.
- **It does not close MVP-2** and makes **no** claim that `aw_*` SQL is production-safe or production-ready.
- It does not touch any adjacent repository.

All production work — production DB execution, production `--apply`, production DB writes, production migration
execution, durable production storage implementation, the production storage adapter, the storage-adapter ownership /
placement ADR update, Lane-2 canonical Straylight-store migrations, production auth / consent / signer / authority,
tenant / estate / actor identity binding, route / API behavior change, public-response expansion, raw-payload
persistence, Freeside runtime / client integration, ADR-022E gate #8 discharge, the route-contract freeze, the
final-schema freeze, and MVP-2 closure — **remains BLOCKED**.

---

## 19. Codex audit checklist

This checklist audits **this Phase 47Q PR** — the docs-only ADR-022E gate #8 / production storage-adapter binding
blocker decomposition gate. Every item must be ACCEPT; any REJECT blocks acceptance of this Phase 47Q PR.

```text
PHASE 47Q — ADR-022E GATE #8 / PRODUCTION STORAGE-ADAPTER BINDING BLOCKER DECOMPOSITION GATE
CODEX AUDIT CHECKLIST
(docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47Q PR)

[ ] 1.  Scope is docs-only — Phase 47Q adds only this document plus a single minimal §20 forward-traceability status
        note (in the Phase 47P MVP-2 remaining-blocker decomposition gate); it modifies no runtime source, and
        specifically not migrate.ts, copy-migrations.mjs, any *.sql, the experimental SQL / manifest / planner
        (aw-sql-isolation-spike/*) / runner, no-leak.ts, aw-sql-execution-sink-spike.test.ts, the three extended Phase
        47F test files, config.ts, server.ts, or scope-guards.test.ts.
[ ] 2.  No runtime/source/test/config/package/CI/SQL/migration/vector/validator/fixture changes — no route handler,
        store/storage code, DB code, migration runner, packaging/copy runner, planner, runner, auth, consent,
        server-boot, unit/integration test, scope-guard test, isolation test, fixture, route-vector JSON, route-vector
        validator, route-vector README, config.ts, env gate, package.json, lockfile, .github/ CI, .sql, aw_* schema,
        executable schema, migration file, or migration directory is added/modified.
[ ] 3.  Phase 47Q produces NO evidence and runs nothing — the gate creates no disposable database, no role, no grant,
        runs no privilege/role/grant test, runs no forward or cleanup SQL under any role, opens no connection, and
        invokes no psql / Docker / Postgres; it decomposes an already-merged, already-selected blocker and selects a
        next docs/decision-only lane (§1/§2).
[ ] 4.  Phase 47P selected-corridor intake is faithful (§5) — Phase 47P decomposed the MVP-2 blockers, selected Option A
        (the ADR-022E gate #8 / production storage-adapter binding corridor), named this Phase 47Q gate, discharged no
        gate, and kept MVP-2 OPEN; restated read-only, not extended.
[ ] 5.  Gate #8 blocker statement is accurate (§6) — gate #8 was cleared by Phase 46N ONLY as a documentation /
        architecture / handoff prerequisite; the operative Straylight-side discharge REMAINS HELD; sibling gates #9 /
        #10 / #11 / #12 / #15 / #20 remain held; why it blocks MVP-2 is stated; nothing is discharged or cleared further.
[ ] 6.  Unresolved predicate inventory is complete and well-formed (§7) — a table with columns Predicate / Current
        evidence / Unresolved question / Blocks / Required future gate-evidence / Phase 47Q decision; includes at least
        the thirteen required predicates (storage-adapter ownership/placement; canonical semantics owner; migration-file
        owner; migration-execution owner; runtime route storage-call owner; Lane-1-to-Lane-2 relationship; production DB
        write authorization; route/API behavior-change authorization; Freeside integration sequencing;
        auth/consent/signer/authority attachment; tenant/estate/actor identity binding; public-response / raw-payload /
        no-leak boundary; MVP-2 closure dependency); no row asserts any predicate is discharged/resolved/production-safe.
[ ] 7.  All thirteen decision questions are decomposed (§7-§15) — ownership/placement; canonical semantics owner;
        migration-file owner; migration-execution owner; runtime route storage-call owner; Lane-1↔Lane-2 relationship;
        production DB write authorization; route/API behavior-change authorization; Freeside sequencing; auth/consent/
        signer/authority attachment; tenant/estate/actor identity; no-leak/public-response/raw-payload; MVP-2 closure
        minimum-checklist dependency; each grounded read-only; each remains blocked/unresolved.
[ ] 8.  Domain decompositions are complete and all BLOCKED/UNRESOLVED (§8-§15) — storage-adapter ownership/placement;
        canonical semantics + invariants; migration ownership/execution; route/runtime storage-call; Lane-1 vs Lane-2;
        auth/consent/signer/authority; tenant/estate/actor identity; public response / raw-payload / no-leak; each
        grounded read-only; each remains blocked/unresolved/not-run.
[ ] 9.  Decision options complete and correctly disposed (§16) — Option A (decompose + clearing-readiness gate next)
        SELECTED; Option B (ownership/placement ADR update) not selected (premature before readiness); Option C (Lane-2
        alignment) not selected (downstream of gate #8 boundary); Option D (implementation authorization) REJECTED (not
        supported); Option E (discharge gate #8 now) REJECTED (Straylight-owned, held; gate #8 REMAINS OPEN).
[ ] 10. Verdict wording is bounded (§1) — "DECOMPOSE ADR-022E GATE #8 / SELECT GATE #8 CLEARING-READINESS GATE NEXT;
        GATE #8 REMAINS OPEN"; no unbounded "production-safe", "production ready", "MVP-2 closed", "gate #8 discharged",
        "gate #8 cleared", "durable storage implemented", "ownership ADR updated", or "production-complete" claim
        anywhere; no wording implies gate #8 is discharged.
[ ] 11. Next lane is correct (§17) — Phase 47R, a STRICTLY docs/decision-only ADR-022E gate #8 clearing-readiness gate;
        explicitly NOT production implementation, NOT a durable-store lane, NOT a storage-adapter ownership/placement ADR
        update, NOT the gate-#8 discharge, and NOT the MVP-2 closure itself; MVP-2 closure remains a further, separate
        terminal downstream gate over the standing blockers.
[ ] 12. No production overclaim — no production-readiness, production-safe, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, ADR-022E-gate-#8-cleared(beyond-46N), production-DB-write, production-migration-
        execution, durable-production-storage, storage-adapter-implementation, ownership-ADR-update, Freeside-runtime,
        Lane-2-canonical, production-auth/consent/signer/identity, or MVP-2-closed claim; every such reference is
        negated / blocked / a non-goal / a future requirement (§6-§18).
[ ] 13. No bad citation regression — no migrate.ts:303-305 citation (migrate.ts is 254 lines); the conditional startup
        migrate is cited as server.ts:303 (if (dbPool)) / server.ts:305 (await migrate(dbPool)); the canonical scope-
        guard denylist is the 19-entry scope-guards.test.ts:122-142 (forbidden-import test :185, file 364 lines); the
        execution-gate seam is index.ts:661/700 with injected sink interface index.ts:124, applyIsolationSpikePlan
        index.ts:568, SYNTHETIC_REF_MAX_LENGTH=80 index.ts:718 (index.ts 914 lines); config.ts DATABASE_URL at
        config.ts:340 (config.ts 485 lines); runner 498 lines; no-leak.ts 114-key parity, 286 lines.
[ ] 14. Forward-traceability note is minimal and evidence-bound (§20) — the single added note (in the Phase 47P MVP-2
        remaining-blocker decomposition gate) records only that Phase 47Q decomposed the ADR-022E gate #8 / storage-
        adapter binding blocker, selected the clearing-readiness gate (Option A; Phase 47R), produced no evidence, and
        kept gate-#8 discharge / production / MVP-2 closure work blocked; the note claims no production safety, gate-#8
        discharge, or MVP-2 closure.
[ ] 15. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5 (no sixth
        vector); self-check 44/44; git diff --check and git diff --cached --check clean; nothing staged (§20).
[ ] 16. No adjacent-repo changes — no file in loa-straylight, freeside-characters, or any adjacent/sibling repo was
        created or modified by Phase 47Q.
[ ] 17. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp / temp,
        __pycache__, .pyc, dist, build, or .claude artifact appears in the Phase 47Q working tree.
[ ] 18. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the Claude Code
        memory store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
[ ] 19. Section headings are well-formed and single-occurrence — each numbered section heading (## 1. … ## 20.) appears
        exactly once; no duplicated heading; no pasted terminal-report fragment; every Markdown table row is well-formed;
        the triple-backtick count is even; no fenced block is an executable migration or runnable schema.
[ ] 20. The gate is honest about what it does and does not do — it decomposes the ADR-022E gate #8 / storage-adapter
        binding blocker and SELECTS a next docs/decision-only clearing-readiness lane ONLY; it authorizes no production
        work, discharges no gate, clears gate #8 no further, updates no ownership ADR, freezes nothing, implements no
        storage, and closes no MVP-2; gate #8 and MVP-2 REMAIN OPEN (§1 / §6 / §16 / §17 / §18).
```

---

## 20. Validation record

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47Q is
docs/decision-only — it adds only this document (plus the single minimal forward-traceability status note below) and
mutates **no** runtime source, test, validator, vector, fixture, migration, or SQL file — so the validators are run only
to confirm the unchanged artifacts remain green.

```bash
git status --short --branch --untracked-files=all
git diff --name-status
git diff --stat
git diff --check
git diff --cached --name-status
git diff --cached --check
# Unchanged-artifact green-checks (no mutation in this phase):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# Docs-only scope checks:
git diff --name-only HEAD -- app package.json package-lock.json app/package.json app/package-lock.json .github
git ls-files --others --exclude-standard
git status --short --untracked-files=all | grep -iE 'MEMORY|memory|grimoire|__pycache__|\.pyc|generated|tmp|temp|\.claude|dist|build'
# Adjacent-repo reference scan (interpret: cross-repo mentions in prose are fine; no adjacent file is touched):
grep -RInE 'loa-arcturus|arcturus|loa-sensenet|sensenet' docs app package.json package-lock.json .github 2>/dev/null || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-ADR-022E-GATE-8-STORAGE-ADAPTER-BINDING-BLOCKER-DECOMPOSITION-GATE.md
```

**Recorded results for this lane** (run during authoring):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-ADR-022E-GATE-8-STORAGE-ADAPTER-BINDING-BLOCKER-DECOMPOSITION-GATE.md` is added, plus the single
  minimal forward-traceability status note (§20) in the Phase 47P MVP-2 remaining-blocker decomposition gate; no runtime
  source (and specifically not `migrate.ts`, `copy-migrations.mjs`, any `*.sql`, the experimental SQL / manifest /
  planner / runner, `no-leak.ts`, the `aw-sql-execution-sink-spike.test.ts`, the three extended Phase 47F test files,
  `config.ts`, `server.ts`, or `scope-guards.test.ts`), no runtime test, no route-vector JSON, validator, README,
  fixture, fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, SQL, executable
  schema, or generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**; the
  `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail closed; 2 exact-key
  non-over-match guards stay clean);
- **diff checks clean** — `git diff --check` and `git diff --cached --check` report no whitespace / conflict-marker
  errors; nothing is staged;
- **docs-only scope checks** — the `app package.json … .github` diff is empty; the only additions are this document and
  the Phase 47P decomposition gate's single forward-traceability note; the memory/generated/temp scan matches nothing
  under the working tree from this phase;
- **adjacent-repo reference scan** — any `arcturus` / `sensenet` matches are prose-only and no adjacent-repo file is
  created or modified;
- **overclaim scan** — every match is a **negated / blocked / non-goal / bounded** reference (e.g. "GATE #8 REMAINS
  OPEN", "does not discharge ADR-022E gate #8", "clears gate #8 no further than Phase 46N's documentation / architecture
  / handoff prerequisite", "operative Straylight-side discharge remains held", "route-contract freeze … blocked",
  "final-schema freeze … blocked", "Lane-2 canonical … blocked", "Freeside runtime / client integration … blocked",
  "makes no claim that `aw_*` SQL is production-safe", "durable production storage … blocked", "does not close MVP-2",
  and every "select" is qualified to lane *selection*, never implementation, ADR update, or discharge); there is **no**
  positive present-tense production authorization or safety claim, and **no** claim that MVP-2 is closed, that gate #8 is
  discharged or cleared beyond the 46N prerequisite, or that `aw_*` SQL is production-safe;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–20 exactly once each.

**Forward-traceability status note added (§20 scope):** the Phase 47P MVP-2 remaining-blocker decomposition gate (which
named this Phase 47Q gate) gains a single bounded additive Phase 47Q note (per §20).

**Corruption / duplicate guard** (carried from the 46I–47P precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 20.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §19 Codex audit
  checklist (a `text` block) and the §20 validation command list (a `bash` block). **No fenced block is an executable
  migration or runnable schema.**
