# Phase 47V — Admission Wedge ADR-022E gate #8 D.1 canonical-store physical-host dependency gate

> **Phase**: 47V
> **Branch context**: `phase-47v-adr022e-gate8-d1-canonical-store-physical-host-dependency`
> **Related**: Phase 47U (PR #193, commit `6b658399`,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-ACCEPTANCE-GATE.md))
> **accepted** the Phase 47T **D.1 conjunct-(i) decision** — accept Candidate D's split-storage route-side adapter as the
> docs/architecture-level production storage-adapter ownership / placement architecture for **route-owned records** (a
> Dixie route-side durable adapter for the endpoint-local contract / idempotency / replay records, ingress references,
> and the public / private projection, shaped as a **swap-in of the canonical Straylight `StorageAdapter` interface** and
> **never a parallel canonical lifecycle**) — as a correctly-bounded, faithfully-grounded, invariant-preserving paper
> architecture decision (Verdict / Option A — ACCEPT, all ten acceptance criteria MET), **confirmed D.1 conjunct (ii)**
> (the canonical-store physical host) stays **externally gated by held sibling gates #9 / #10** with **no host selected**,
> left the **full D.1 checklist item NOT YET SATISFIED** (box not checked off), kept **D.2–D.14 all UNSATISFIED**,
> produced **no** evidence, satisfied **no** full checklist item, discharged **no** gate, **cleared gate #8 no further**
> than Phase 46N's documentation / architecture / handoff prerequisite, updated or froze **no** ownership / placement
> ADR, authorized **no** production work, kept **gate #8 OPEN** and **MVP-2 OPEN**, and **selected Option A — a separate,
> strictly docs/decision-only Phase 47V ADR-022E gate #8 D.1 canonical-store physical-host dependency gate** (its §15);
> Phase 47T (PR #191, commit `488ce1c9`,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-GATE.md))
> **decided D.1 conjunct (i)** (accept Candidate D's split-storage route-side adapter at the docs/architecture level for
> route-owned records), **decomposed D.1 conjunct (ii)** (routing the canonical-store physical-host selection to held
> sibling gates #9 / #10, selecting no host), left the **full D.1 item NOT YET SATISFIED**, kept **D.2–D.14 all
> UNSATISFIED**, and **selected the Phase 47U D.1 decision acceptance gate** (Option A); Phase 47S (PR #190, commit
> `261d89d2`,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-ACCEPTANCE-GATE.md))
> **accepted** the Phase 47R **NOT YET READY for operative discharge** readiness verdict and the **D.1–D.14** minimum
> discharge checklist as binding criteria (Option A; all ten acceptance criteria MET), **satisfied no checklist item**,
> **discharged no gate**, and **selected the Phase 47T D.1 decision gate** as the first dependency-ordered
> Dixie-assessable checklist corridor, keeping **gate #8 OPEN** and **MVP-2 OPEN**; Phase 47R (PR #189, commit
> `128757d7`,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-GATE.md))
> **assessed** gate-#8 clearing readiness as **NOT YET READY for operative discharge**, **defined the D.1–D.14 minimum
> discharge checklist** (all unsatisfied), and selected the Phase 47S acceptance gate; Phase 47Q (PR #188, commit
> `279feb2f`) **decomposed** the gate-#8 / storage-adapter binding blocker into the thirteen-row unresolved-predicate
> inventory; Phase 47P (PR #187, commit `e1cc3391`) **decomposed** the standing MVP-2 blockers and selected the gate-#8 /
> production storage-adapter binding corridor; Phase 47O (PR #186, commit `0c06720e`) **accepted** Lane-1 `aw_*` SQL
> execution corridor closure **only for the bounded non-production proof corridor** and **explicitly kept MVP-2 OPEN**;
> Phase 47F–47N (PR #177–#185) the bounded non-production Lane-1 `aw_*` SQL isolation → execution-sink → least-privilege
> evidence chain (`--apply` refused; all **NON-PRODUCTION**); Phase 46N (PR #159,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md))
> **cleared ADR-022E gate #8 *as a documentation / architecture / handoff prerequisite only*** (Candidate D proposed,
> sibling handoff packet cited, ADR-022D invariants preserved) while the **operative Straylight-side discharge stayed
> held** and sibling gates #9 / #10 / #11 / #12 / #15 / #20 stayed held; Phase 46M (PR #158,
> [`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md))
> selected **Candidate D** (split storage; Dixie route-side adapter as a `StorageAdapter` swap-in; Straylight canonical
> ownership preserved; canonical-store host + concrete substrate future-gated) as the production-adapter placement
> candidate; Phase 46I (PR #154,
> [`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)) recorded what gate
> #8 requires and selected split-storage Option 4 as the topology *direction*; Phase 46P (PR #161) **restored** the
> runtime `no-leak.ts` `FORBIDDEN_PUBLIC_KEYS` mirror to **114-key** parity and Phase 46Q (PR #162) **accepted** it;
> `@loa/straylight` PR #65 (A–O primitive review, **merged**); Straylight-repo ADR-022E durable-store gate #8 (+ sibling
> gates, **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only ADR-022E gate #8 D.1 canonical-store physical-host *dependency* gate.** This gate
> adds **only this document** (plus a single minimal forward-traceability status note, §19, in the Phase 47U ADR-022E
> gate #8 D.1 storage-adapter ownership / placement decision *acceptance* gate that named this Phase 47V gate). It
> modifies **no** runtime source — and specifically does **not** modify `app/src/db/migrate.ts`,
> `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`, `app/src/server.ts`, `app/src/config.ts`,
> `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts`, the experimental `.sql` files, the
> `manifest.json`, the `aw-sql-isolation-spike-runner.mjs`, `no-leak.ts`, the `aw-sql-execution-sink-spike.test.ts`, the
> three extended Phase 47F test files, or `scope-guards.test.ts` — and changes **no** route handler, store / storage
> code, DB write, migration, SQL file, executable schema, migration runner, packager, scope guard, auth, consent,
> route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, other test,
> package export, config, env, package, lockfile, CI, generated file, or binary. No adjacent repository
> (`loa-straylight`, `freeside-characters`, or any sibling repo) is touched.
> **This is the ADR-022E gate #8 D.1 canonical-store physical-host *dependency* gate** — the docs/decision-only rung
> Phase 47U §15 named, downstream of the now-accepted D.1 conjunct-(i) decision, addressing the **still-open D.1 conjunct
> (ii)**: the canonical-store physical-host dependency (Straylight-process / Finn / Dixie-hosted adapter) held by sibling
> gates **#9 / #10**. This gate **decides the current status and ownership path of the canonical-store physical-host
> dependency**: it determines whether that dependency can be resolved now, must remain held, or must be routed to a
> separate owner / gate. **Deciding the dependency status is strictly distinct from selecting the host, from satisfying
> the full D.1 checklist item, from implementing storage, from freezing any ownership / placement ADR, and from
> discharging gate #8:** this gate adjudicates *where the host decision lives and whether it is resolvable now*; it
> selects **no** host, writes **no** adapter, alters **no** route, authors **no** migration, freezes **no** ADR, and
> discharges **no** gate. **Because the canonical-store physical host remains held by sibling gates #9 / #10 and is not
> resolvable by any Dixie docs-only phase, the full D.1 checklist item remains NOT YET SATISFIED — its box is NOT checked
> off — and D.2–D.14 all remain UNSATISFIED.** **Gate #8 REMAINS OPEN now; MVP-2 REMAINS OPEN now.** This gate **produces
> no evidence, runs no role / grant test, opens no connection, executes nothing, and implements nothing.** It **enables
> no production `--apply`, injects no DB client / sink, opens no DB connection, performs no DB write, executes no
> migration, adds no SQL or executable schema, changes no migration runner / packager / startup / config, weakens or
> edits no scope guard, implements no auth or consent, changes no route / API behavior, freezes neither the route contract
> nor the final schema, selects no canonical-store host, discharges no operative Straylight-side gate, closes no MVP-2,
> and claims no production readiness.** Production DB execution, production migration execution, durable production
> storage, canonical-store physical-host selection, ADR-022E gate #8 discharge, MVP-2 closure, and all production work
> **remain BLOCKED** (§10 / §13 / §16). This gate **decides the canonical-store physical-host dependency status (it
> remains held) and selects the next docs/decision-only lane**; it **clears** gate #8 no further, **opens** no corridor
> for implementation, **satisfies** no full checklist item, **selects** no host, **discharges** nothing, and **closes**
> no MVP-2.

Every assessment below is grounded **read-only** against the merged predecessor decision records in the Dixie repo at
authoring time and against the **unchanged** Dixie source surface. The frozen Phase 47J / 47F execution-sink source is
read read-only for citation grounding only: the injected `IsolationSpikeStatementSink` interface (`index.ts:124`), the
all-or-nothing `applyIsolationSpikePlan(plan, sink)` (`index.ts:568`), the pure execution-gate seam
(`evaluateIsolationSpikeExecutionGate` at `index.ts:661`, `assertIsolationSpikeExecutionGateOpen` at `index.ts:700`,
`SYNTHETIC_REF_MAX_LENGTH = 80` at `index.ts:718`; `index.ts` is **914 lines**), and the explicit runner
`app/scripts/aw-sql-isolation-spike-runner.mjs` (**498 lines**, the only DB-touching caller, outside the guarded
`SPIKE_FILES`). The **unchanged** production path is read read-only: the migration runner `app/src/db/migrate.ts`
(**254 lines** — it has **no** line 303–305), the build-asset packager `app/scripts/copy-migrations.mjs` (**62 lines**),
the conditional startup migrate `if (dbPool)` at **`server.ts:303`** with `await migrate(dbPool)` at **`server.ts:305`**
(`server.ts` is **773 lines**), the env parsing in `app/src/config.ts` (`DATABASE_URL` at `config.ts:340`; `config.ts`
is **485 lines**), the runtime no-leak guard `app/src/services/admission-wedge-spike/no-leak.ts` (**286 lines**,
114-key `FORBIDDEN_PUBLIC_KEYS` mirror), and the scope-guard test
`app/tests/unit/admission-wedge-spike/scope-guards.test.ts` (**364 lines**; the 19-entry `DURABLE_WRITE_DENYLIST` at
`:122–142`; the forbidden-import test at `:185`). Nothing in this surface is modified. The canonical `StorageAdapter` /
`AuditLog` / `Assertion` / `TransitionReceipt` / `AuditEvent` shapes and ADR-022E / ADR-022D live in the adjacent
`loa-straylight` repo; they are cited as **cross-repo references only** and no adjacent-repo file is read-modified or
touched. Nothing below is executed; this gate **decides the status / ownership path of one externally-gated dependency
of an already-merged checklist item and selects a next docs/decision-only lane**, it produces no evidence and discharges
nothing.

---

## 1. Status / verdict

**Verdict: D.1 CANONICAL-STORE PHYSICAL-HOST DEPENDENCY REMAINS HELD UNDER SIBLING GATES #9 / #10 / FULL D.1 REMAINS NOT
YET SATISFIED / D.2–D.14 REMAIN UNSATISFIED / GATE #8 REMAINS OPEN / MVP-2 REMAINS OPEN.**

This is **decision-structure Option A** (§11): the still-open D.1 **conjunct (ii)** — the canonical-store physical host
(Straylight-process / Finn / Dixie-hosted adapter) — **cannot be resolved by any Dixie docs-only phase**; it remains
**externally gated and held** by sibling gates **#9** (Finn runtime wiring) and **#10** (Dixie boundary wiring), each
held with its own trigger. Phase 47V therefore **routes the dependency to those held gates**, defines the future evidence
a later host-selection gate would require, and **preserves the full D.1 checklist item as NOT YET SATISFIED**. No host is
selected now.

**D.1 is a conjunctive checklist item** (47R §16; 47T §6; 47U §8). Its full satisfaction requires **both**:

- **Conjunct (i) — route-owned-records architecture acceptance** — *decided* by Phase 47T (accept Candidate D's
  split-storage route-side adapter at the docs/architecture level) and *accepted* by Phase 47U. **This conjunct is not
  reopened here.**
- **Conjunct (ii) — canonical-store physical-host selection** — *decomposed* by Phase 47T and routed to held sibling
  gates #9 / #10. **This conjunct is the subject of this gate, and it remains held.**

**What this gate decides.** It decides the **current status and ownership path of the canonical-store physical-host
dependency** (D.1 conjunct (ii)): the dependency **cannot be resolved now**, **must remain held**, and is **routed to its
owning sibling gates #9 / #10**. This is a **dependency-status decision only** — it determines *where the host decision
lives and whether it is resolvable now*; it selects **no** host. (D.2, the canonical invariant-preservation evidence, is a
**separate downstream** checklist item, **not** a constituent of this conjunct (ii) dependency and **not** a prerequisite
for satisfying D.1; see §13 / §14.)

**Why the dependency remains held.** The repo evidence is unambiguous that the physical host is not a Dixie docs-only
decision: 46M §6.4 future-gates the canonical-store hosting (Straylight process / Finn / Dixie-hosted adapter) under held
gates #9 / #10; 46N records gates #9 (Finn runtime wiring, `:58`) / #10 (Dixie boundary wiring, `:59`) as **held**; 47T
§10 and 47U §11 both confirm no host is selected and the dependency is externally gated. **No repo evidence discharges #9
/ #10 or supports selecting a host now.** Therefore Option A — the dependency remains held / routed to #9 / #10 — is the
supported verdict.

For the avoidance of doubt, this decision is **bounded** and says only what the chain supports:

- **Deciding the dependency status is not selecting the host.** The canonical-store physical host stays externally gated
  by held sibling gates #9 / #10; this gate **selects no host** (§8 / §10).
- **Deciding the dependency status does not satisfy the full D.1 item.** D.1 is *conjunctive* (47R §16); conjunct (ii)
  remains externally gated and open, so the **full D.1 checklist item remains NOT YET SATISFIED**, its box **NOT** checked
  off (§12 / §13).
- **Deciding the dependency status is not implementation.** It implements **no** adapter, writes **no** storage code,
  changes **no** route handler, and authors **no** migration (§16).
- **Deciding the dependency status is not an ADR update or freeze.** `route_contract_final` stays false; `schema_final`
  stays false (§11 / §16).
- **It does not discharge ADR-022E gate #8.** Gate #8 was cleared by Phase 46N **only** as a documentation /
  architecture / handoff prerequisite; the **operative Straylight-side discharge remains held** (D.13; §8). This gate
  clears gate #8 **no further**. **Gate #8 REMAINS OPEN.**
- **It does not close MVP-2.** MVP-2 closure (D.14) remains a *further, separate* terminal gate downstream of every
  checklist item and the operative discharge. **MVP-2 REMAINS OPEN.**
- **It advances no D.2–D.14 item to satisfied.** D.2–D.14 all remain **UNSATISFIED** (§14).
- **It makes no claim that `aw_*` SQL is production-safe or production-ready.**

What Phase 47V **is**, stated narrowly: it is **docs / decision-only**. It reads the merged Phase 47U acceptance gate and
the gate-#8 ADR chain (46N / 46M / 46I) read-only, intakes the Phase 47U outcome (§5), inventories the D.1 conjuncts
(§6), defines the canonical-store physical-host dependency precisely (§7), records the held status of sibling gates #9 /
#10 (§8), assesses ownership / authority (§9), enumerates the candidate dependency options (§10), states the decision
criteria (§11), records the selected dependency decision and its effect on full D.1 (§12 / §13) and on D.2–D.14 (§14),
selects the next docs/decision-only lane (§15), records non-goals and blocked work (§16), provides a Codex audit
checklist (§17), runs the docs validators on the unchanged artifacts (§18), records the single forward-traceability note
(§19), and states the final decision (§20). It implements, executes, enables, injects, freezes, selects (a host), clears
(further), discharges, and closes (MVP-2) **nothing**.

---

## 2. Scope

Phase 47V is the **docs/decision-only** ADR-022E gate #8 **D.1 canonical-store physical-host dependency** gate named by
Phase 47U §15 — the **separate, strictly docs/decision-only** rung that, after the D.1 conjunct-(i) decision was accepted
(Phase 47U), addresses the still-open D.1 conjunct (ii): the canonical-store physical-host dependency held by sibling
gates #9 / #10. Its job is to decide: (a) what exactly the canonical-store physical-host dependency *is*; (b) which
component / repo owns the host decision; (c) whether sibling gates #9 / #10 are still held; (d) whether Dixie can decide
the canonical-store physical host locally (it cannot); (e) whether the full D.1 item can be satisfied now (it cannot);
(f) what evidence a future host-selection gate would require; (g) the correct next docs/decision-only lane; (h) which
D.2–D.14 items remain blocked by full D.1 not being satisfied; and (i) what work remains forbidden after this gate. It is
a **dependency-status / routing / selection gate — not the host selection, not the corridor implementation, not the full
D.1 satisfaction, not an ownership / placement ADR update or freeze, not the gate-#8 discharge, and not the MVP-2
closure**.

**In scope (this PR):**

- this single new document; and
- a single minimal forward-traceability status note (§19) in the Phase 47U ADR-022E gate #8 D.1 storage-adapter
  ownership / placement decision *acceptance* gate, which named this Phase 47V gate.

**Explicitly out of scope (this PR) — Phase 47V produces nothing and runs nothing:**

- no new evidence of any kind; no disposable database; no role; no grant; no privilege test; no forward or cleanup SQL
  run under any role; no `psql` session; no Docker / Postgres invocation; no operator run;
- no runtime source / test / config / package / SQL / migration / route-vector / validator / fixture change;
- no edit to `index.ts`, the runner, `no-leak.ts`, `scope-guards.test.ts`, `migrate.ts`, `copy-migrations.mjs`,
  `server.ts`, `config.ts`, or any `*.sql`;
- no production `--apply` enablement, no DB client / sink injection, no DB connection, no DB write, no migration
  execution;
- no durable-store implementation, no storage-adapter implementation, no production migration file;
- no storage-adapter ownership / placement ADR update or freeze; **no canonical-store physical-host selection**;
- no auth / consent / signer / authority implementation; no tenant / estate / actor identity implementation;
- no route / API behavior change, no public response change, no raw candidate payload persistence, no Freeside
  integration;
- no Lane-2 canonical Straylight-store migration; no ADR-022E gate #8 discharge (operative or otherwise); no
  route-contract / final-schema freeze; **no MVP-2 closure**; no production readiness claim; no claim that `aw_*` SQL is
  production-safe; no full D.1 checklist-item satisfaction; no satisfaction of any D.2–D.14 item.

This gate **decides one dependency's status and routes it**; it **produces** nothing, **discharges** nothing, **opens**
no corridor, **satisfies** no full checklist item, **selects** no host, and **closes** no MVP-2. Production execution,
production storage, the canonical-store host selection, the operative gate-#8 discharge, and MVP-2 closure are exactly
what *future, separate gates* must adjudicate — not what this gate asserts.

---

## 3. Source chain

Each predecessor is read **read-only**; this gate re-accepts no predecessor decision and unblocks no production lane.

- **Phase 46I / PR #154 (`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`)** — recorded what gate #8 requires, selected
  split-storage Option 4 as the topology *direction*, and left the physical adapter placement unresolved. **Not
  modified.**
- **Phase 46M / PR #158 (`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`)** — evaluated
  candidate placements A–F, selected **Candidate D** (split storage; Dixie route-side adapter as a `StorageAdapter`
  swap-in; Straylight canonical ownership preserved; **canonical-store host + concrete substrate future-gated** under
  held gates #9 / #10, §6.4) as the production-adapter placement candidate, and decomposed the durable schema / migration
  families without freezing schema or authoring a migration. **The record that future-gates the host dependency; not
  modified.**
- **Phase 46N / PR #159 (`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`)** — **cleared ADR-022E gate #8 as
  a documentation / architecture / handoff prerequisite only** (conjunct (a) Candidate D proposed; conjunct (b) sibling
  handoff packet cited; conjunct (c) ADR-022D invariants preserved), with the **operative Straylight-side discharge
  remaining held** and sibling gates **#9 (Finn runtime wiring, `:58`) / #10 (Dixie boundary wiring, `:59`)** / #11 / #12
  / #15 / #20 remaining held; it records the canonical-store physical host (Straylight / Finn / Dixie-hosted adapter)
  stays governed by held gates #9 / #10. **The central gate-#8 record and the host-dependency anchor; not modified.**
- **Phase 46P / PR #161 + Phase 46Q / PR #162** — restored and accepted the runtime `no-leak.ts`
  `FORBIDDEN_PUBLIC_KEYS` mirror to **114-key** parity with the validator. **Not modified.**
- **Phase 47F–47O (PR #177–#186)** — the bounded non-production Lane-1 `aw_*` SQL isolation → execution-sink →
  least-privilege evidence → corridor-closure chain; Phase 47O closed the corridor **only for the bounded non-production
  proof corridor** and kept MVP-2 OPEN. **Not modified.**
- **Phase 47P / PR #187 (commit `e1cc3391`)** — **decomposed** the standing MVP-2 blockers, **selected Option A** (the
  gate-#8 / storage-adapter binding corridor), named Phase 47Q. **Not modified.**
- **Phase 47Q / PR #188 (commit `279feb2f`)** — **decomposed** the gate-#8 / storage-adapter binding blocker into the
  thirteen-row unresolved-predicate inventory, **selected Option A**, named Phase 47R. **Not modified.**
- **Phase 47R / PR #189 (commit `128757d7`)** — **assessed** gate-#8 clearing readiness as **NOT YET READY**, **defined
  the D.1–D.14 minimum discharge checklist** (all unsatisfied), **selected Option A** (the Phase 47S acceptance gate).
  **The checklist whose D.1 conjunct (ii) this gate addresses; not modified.**
- **Phase 47S / PR #190 (commit `261d89d2`,
  `ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-ACCEPTANCE-GATE.md`)** — **accepted** the Phase 47R readiness
  verdict and the D.1–D.14 checklist as binding criteria (Option A; all ten AC MET), **satisfied no checklist item**,
  and **selected the Phase 47T D.1 storage-adapter ownership / placement decision gate**, keeping gate #8 and MVP-2 OPEN.
  **Not modified.**
- **Phase 47T / PR #191 (commit `488ce1c9`,
  `ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-GATE.md`)** — **decided D.1 conjunct (i)**
  (accept Candidate D's split-storage route-side adapter at the docs/architecture level for route-owned records),
  **decomposed D.1 conjunct (ii)** (routing the canonical-store physical-host selection to held sibling gates #9 / #10,
  selecting no host), left the **full D.1 item NOT YET SATISFIED**, kept **D.2–D.14 all UNSATISFIED**, and **selected the
  Phase 47U D.1 decision acceptance gate**. **The conjunct-(ii) decomposition this gate continues; not modified.**
- **Phase 47U / PR #193 (commit `6b658399`,
  `ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-ACCEPTANCE-GATE.md`)** — **accepted** the Phase
  47T D.1 conjunct-(i) decision (Option A; all ten AC MET), **confirmed conjunct (ii) stays externally gated by held
  sibling gates #9 / #10 with no host selected**, left the **full D.1 item NOT YET SATISFIED**, kept **D.2–D.14 all
  UNSATISFIED**, kept **gate #8 OPEN** and **MVP-2 OPEN**, and **selected this Phase 47V D.1 canonical-store
  physical-host dependency gate** (Option A). **The immediate predecessor and the direct input to this gate; gains the
  single Phase 47V forward-traceability status note (§19).**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner and the
  decision records cited as guardrails (§7 / §9 / §16). Cross-repo references, **not edited.**

This gate also reads, read-only, the merged Dixie decision records that already decompose downstream predicates — the
durable-store schema / migration design gates, the durable-store implementation-readiness gates, and the auth / consent
design gates. **None is edited;** each is referenced only to ground the D.2–D.14 statuses (§14) as design / decomposition
artifacts, **not** implemented production architecture.

---

## 4. Question being decided

Phase 47U §15 routed the **D.1 canonical-store physical-host dependency** to this gate. Phase 47V decides exactly one
question — *the current status and ownership path for the canonical-store physical-host dependency (D.1 conjunct (ii))* —
in nine precisely-bounded parts:

1. **What exactly is the canonical-store physical-host dependency** (§7)?
2. **Which component / repo owns the canonical store's physical-host decision** (§8 / §9)?
3. **Are sibling gates #9 / #10 still held** (§8)?
4. **Can Dixie decide the canonical-store physical host locally** — i.e., is this a Dixie docs-only decision (§9)?
5. **Can Phase 47V satisfy full D.1 now** — given that conjunct (ii) is externally gated (§12 / §13)?
6. **What evidence would be required before full D.1 could be satisfied** (§11 / §15)?
7. **What is the correct next lane if the host dependency remains held** (§15)?
8. **Which D.2–D.14 items remain blocked by full D.1 not being satisfied** (§14)?
9. **What work remains forbidden after this gate** (§16)?

The question is **not** whether to select the canonical-store physical host (Phase 47V selects none, §8 / §10), **not**
whether to implement a storage adapter (it implements none, §16), **not** whether to freeze an ownership / placement ADR
(no ADR is updated or frozen, §11 / §16), **not** whether to satisfy the full D.1 item (conjunct (ii) is open, so D.1 is
**not** satisfied, §12 / §13), **not** whether to satisfy any D.2–D.14 item (none is satisfied, §14), **not** whether to
discharge ADR-022E gate #8 (Phase 47V discharges nothing; the operative discharge is Straylight-owned and held, §8), and
**not** whether to close MVP-2 (closure is a further separate terminal gate, §8 / §14). It is strictly: *what the
canonical-store physical-host dependency is, who owns it, whether it remains held, whether it is resolvable now (it is
not), what would be required to resolve it later, and the next docs/decision-only lane.*

---

## 5. Phase 47U intake

Phase 47U (PR #193) is the immediate predecessor and the direct input to this gate. Restated read-only, **not extended**:

- **Phase 47U is docs/decision-only.** It added only its own document plus a single minimal forward-traceability status
  note in the Phase 47T decision gate; it modified no runtime source / test / config / package / SQL / migration /
  route-vector / validator / fixture, and produced no evidence (47U §1 / §2 / §18).
- **Phase 47U accepted the Phase 47T D.1 conjunct-(i) decision** — accept Candidate D's split-storage route-side adapter
  as the docs/architecture-level production storage-adapter ownership / placement architecture for route-owned records, a
  paper architecture decision only, shaped as a `StorageAdapter` swap-in, never a parallel canonical lifecycle (47U §1 /
  §7–§9).
- **Phase 47U confirmed D.1 conjunct (ii) stays externally gated.** The canonical-store physical host
  (Straylight-process / Finn / Dixie-hosted adapter) remains held by sibling gates **#9 / #10**, with **no host selected**
  (47U §11).
- **Phase 47U kept the full D.1 item NOT YET SATISFIED** (box not checked off) because conjunct (ii) remains externally
  gated and open (47U §8 / §13).
- **Phase 47U kept D.2–D.14 all UNSATISFIED**, gate #8 OPEN, and MVP-2 OPEN, and authorized no production work (47U §13 /
  §16).
- **Phase 47U selected this Phase 47V** — a strictly docs/decision-only ADR-022E gate #8 D.1 canonical-store
  physical-host dependency gate addressing the still-open conjunct (ii) (47U §15).

This gate **takes the still-open conjunct (ii) as its corridor** and decides the dependency's *status and ownership path*
(§7–§12); it does **not** re-decide conjunct (i), re-accept the Phase 47T decision, re-define the checklist, extend the
inventory, or select a host. The mapping is exact: Phase 47U's confirmation that conjunct (ii) stays externally gated
(47U §11) is taken up in §7–§10, and Phase 47U's full-D.1 / D.2–D.14 status (47U §8 / §13) is preserved in §12–§14.

**Phase 47U outcome preserved by this gate (carried forward unchanged):**

- D.1 conjunct (i): **accepted by Phase 47U** (not reopened here).
- Full D.1: **NOT YET SATISFIED**.
- D.2–D.14: **UNSATISFIED**.
- Canonical-store physical host: **unresolved and held under sibling gates #9 / #10**.
- D.13 (operative Straylight-side discharge): **externally owned and held**.
- D.14 (MVP-2 closure terminal gate): **terminal and downstream**.
- Gate #8: **OPEN**.
- MVP-2: **OPEN**.

---

## 6. D.1 conjunct inventory

D.1 is restated verbatim from the Phase 47R §16 checklist (read-only):

> **D.1 Storage-adapter ownership / placement ACCEPTED** — Candidate D (or a successor) accepted as the production
> storage-adapter ownership/placement architecture for route-owned records (a docs/decision-only acceptance gate), and
> the canonical-store physical host (Straylight-process / Finn / Dixie-hosted adapter) selected with held sibling gates
> #9 / #10 resolved for the chosen host. [47R §8]

It is a **conjunction of two independently-owned obligations**:

- **Conjunct (i) — route-owned-records architecture acceptance (Dixie-assessable).** *Decided* by Phase 47T (accept
  Candidate D's split-storage route-side adapter at the docs/architecture level for route-owned records) and *accepted*
  by Phase 47U (47T §9; 47U §1 / §7–§9). **Status: accepted by Phase 47U. Not reopened by this gate.**
- **Conjunct (ii) — canonical-store physical-host selection (externally gated).** "the canonical-store physical host
  (Straylight-process / Finn / Dixie-hosted adapter) selected with held sibling gates #9 / #10 resolved for the chosen
  host." Sibling gate **#9** (Finn runtime wiring) and sibling gate **#10** (Dixie boundary wiring) are **held**, each
  with its own trigger (46M §6.4; 46N §4.6 / `:58` / `:59`). **Status: externally gated and held. This is the subject of
  this gate.**

**Consequence for satisfaction.** A conjunctive checklist item is satisfied only when **both** conjuncts hold. Conjunct
(i) is accepted; conjunct (ii) remains externally gated and open. Therefore the full **D.1 item is NOT YET SATISFIED** and
its box is **NOT checked off** (§12 / §13). This is the load-bearing distinction of this gate: it makes a real decision on
the *status* of conjunct (ii) — that the dependency remains held — **without** claiming conjunct (ii) is satisfied or the
full item is satisfied.

---

## 7. Canonical-store physical-host dependency definition

The canonical-store physical-host dependency (D.1 conjunct (ii)) is defined precisely, read-only, from the merged record:

- **What the canonical store is.** The **canonical store** holds the `active` `Assertion`, the first-class
  `TransitionReceipt`, and the append-only hash-chained `AuditEvent`. It is **Straylight-owned** through the canonical
  `StorageAdapter` / `AuditLog` path (46N §5; ADR-022D §1; 47T §10). Candidate D / split storage keeps the canonical
  store on the Straylight side; the Dixie route-side adapter (conjunct (i)) owns only route-owned records (endpoint-local
  contract / idempotency / replay records, ingress references, public / private projection) and holds **ingress
  references only** to canonical material — it is **never a parallel canonical lifecycle** (47T §9; 47U §9 / §10).
- **What "physical host" means.** The canonical-store **physical host** is *which runtime process / boundary physically
  hosts and operates the canonical store*: the candidate hosts are **Straylight-process**, **Finn**, or a
  **Dixie-hosted adapter** (46M §6.4; 46N §11 row 1; 47T §10). `StorageAdapter` is explicitly the **swap-in seam** for a
  future production substrate ("async adapters (real SQL/Postgres in Dixie or Finn) replace this interface", 46M §2.2),
  so the host choice is substitutable later — but *selecting it* is the open obligation.
- **Why the host is a dependency, not a free Dixie choice.** Selecting the physical host requires wiring the chosen
  runtime: **gate #9 (Finn runtime wiring, `:58`)** governs hosting in Finn; **gate #10 (Dixie boundary wiring, `:59`)**
  governs a Dixie-hosted adapter boundary; both are **held** (46M §6.4; 46N §4.6). The dependency is therefore the
  conjunction of (a) a host selection among Straylight-process / Finn / Dixie-hosted adapter and (b) the held sibling
  gate(s) #9 / #10 resolved for the chosen host. Neither (a) nor (b) is a Dixie docs-only act. (D.2, the chosen host's
  canonical invariant-preservation evidence, is a **separate downstream** checklist item sequenced after full D.1, **not**
  a constituent of this conjunct (ii) dependency and **not** a prerequisite for satisfying D.1.)
- **What the dependency is NOT.** It is **not** the route-owned-records placement (that is conjunct (i), already
  accepted), **not** a concrete external DB substrate selection (that is Candidate E / gates #12 / #20, separately
  future-gated, 46M / 46N), and **not** the operative gate-#8 discharge (that is D.13, Straylight-owned). This gate scopes
  the dependency to *the canonical-store physical host under #9 / #10* and nothing more.

---

## 8. Sibling gates #9 / #10 status

**Sibling gates #9 / #10 remain HELD.** The merged record is consistent and unambiguous:

- **Gate #9 — Finn runtime wiring** — recorded **held** in 46N (`ADR-022E-phase-22-deferred-features.md:58`; 46N §11 row
  1 / §4.6; 46M §2.2 / §6.4). No Dixie phase resolves it.
- **Gate #10 — Dixie boundary wiring** — recorded **held** in 46N (`…:59`; 46N §11 row 1 / §4.6; 46M §2.2 / §6.4). No
  Dixie phase resolves it.
- **The canonical-store physical host stays governed by held gates #9 / #10.** 46M §6.4 future-gates the canonical-store
  hosting (Straylight process / Finn / Dixie-hosted adapter) under #9 / #10; 46N confirms the host "stays governed by held
  gates #9 / #10"; 47T §10 and 47U §11 reaffirm no host is selected and the dependency is externally gated.
- **No repo evidence discharges #9 / #10.** No predecessor doc, source anchor, or evidence in this repo records #9 or #10
  as resolved, discharged, or cleared. They remain held with their own triggers, alongside #11 (Freeside-as-consumer,
  `:60`) / #12 / #15 / #20.
- **Gate #8 itself remains OPEN.** Phase 46N cleared gate #8 **only** as a documentation / architecture / handoff
  prerequisite. The operative Straylight-side discharge — the gate-table preamble pathway (trigger satisfied **and** a
  separate ADR or sibling-repo PR under Straylight teammate review explicitly citing the trigger), with sibling gates #9
  / #10 / #11 / #12 / #15 / #20 each resolved per their own trigger (46N §4.6 / §4.7) — is checklist item **D.13** and
  remains **UNSATISFIED**, externally owned, and **held**. **Gate #8 REMAINS OPEN.**

Because #9 / #10 are held and externally owned, the canonical-store physical-host dependency cannot be resolved by any
Dixie docs-only phase, including this one.

---

## 9. Ownership / authority assessment

**Assessed: the canonical-store physical-host decision is NOT a Dixie docs-only decision.** The audit confirms where the
authority lives and that Dixie cannot decide the host locally:

- **Canonical-store ownership is Straylight's.** The canonical `active` `Assertion`, the first-class `TransitionReceipt`,
  and the append-only hash-chained `AuditEvent` are **Straylight-owned** through the `StorageAdapter` / `AuditLog` path
  (46N §5; ADR-022D §1; 47T §10; 47U §10). Dixie holds **ingress references only** and re-mints **no** receipt. Phase 47V
  changes none of this.
- **Host-wiring authority is gated externally.** Hosting the canonical store in Finn is governed by **held gate #9**
  (Finn runtime wiring); hosting it behind a Dixie-operated boundary is governed by **held gate #10** (Dixie boundary
  wiring); keeping it in the Straylight process is the Straylight-owned canonical default. None of these is a Dixie
  docs-only act, and #9 / #10 are held.
- **Dixie cannot decide the host locally.** A Dixie docs-only phase can decide *which component owns route-owned-records
  storage at the architecture level* (conjunct (i), already accepted) — but it **cannot** select or wire the
  canonical-store physical host, because that selection requires resolving held sibling gates #9 / #10 (externally owned),
  which is not a Dixie docs-only act. **Phase 47V therefore selects no host and resolves no sibling gate.** (D.2, the
  canonical invariant-preservation evidence, is a **separate downstream** checklist item, **not** a prerequisite for
  satisfying D.1.)
- **The dependency is correctly routed, not decided.** The disciplined action is to **route** the host dependency to its
  owning gates #9 / #10 and to record that it remains held — exactly what this gate does (§10 / §12). (D.2, the canonical
  invariant-preservation evidence, is a **separate downstream** checklist item sequenced after full D.1, **not** part of
  the host dependency and **not** a prerequisite for satisfying D.1.)

---

## 10. Candidate dependency options

This gate enumerates the candidate dependency dispositions and records the Phase 47V decision for each. The matrix
columns are: **Candidate** (the disposition considered), **Physical-host claim** (what it would assert about the host),
**Evidence** (repo grounding), **Authority / owner** (who owns the decision), **Remaining blocked work** (what stays
blocked under it), and **Phase 47V decision**.

| Candidate | Physical-host claim | Evidence | Authority / owner | Remaining blocked work | Phase 47V decision |
|-----------|---------------------|----------|-------------------|------------------------|--------------------|
| **Held sibling gates #9 / #10 dependency** (host remains held / routed to #9 / #10) | Host NOT selected; remains externally gated under held #9 / #10 | 46M §6.4; 46N §4.6 / `:58` / `:59` / §11 row 1; 47T §10; 47U §11 — all record the host governed by held #9 / #10, no host selected | Sibling gates #9 (Finn runtime wiring) / #10 (Dixie boundary wiring), externally owned | Host selection; #9 / #10 resolution; full D.1; then the separate downstream items D.2–D.14; gate-#8 discharge; MVP-2 closure | **SELECTED (Option A).** The host dependency remains held / routed to #9 / #10; no host selected |
| **Dixie-local host selection** (Dixie picks the canonical-store host now) | Dixie selects Dixie-hosted adapter (or another host) as the canonical-store physical host | No repo evidence authorizes Dixie to select / wire the canonical-store host; #10 (Dixie boundary wiring) is **held**; 46M §6.4 future-gates the host; a Dixie-hosted *canonical* store risks a parallel canonical lifecycle (46M Candidate F rejected) | Not Dixie's; host wiring is gated by held #9 / #10 and canonical ownership is Straylight's | — (would wrongly pre-empt #9 / #10 and canonical ownership) | **REJECTED.** Dixie cannot decide the canonical-store host locally; #10 is held and canonical ownership is Straylight's (§9) |
| **Straylight-owned canonical-store host selection** (Straylight picks the host now) | Straylight selects the canonical-store physical host (e.g. Straylight-process / Finn) | Canonical ownership is Straylight's (ADR-022D §1; 46N §5); but host *wiring* still requires held gates #9 / #10 resolved per their triggers; no evidence #9 / #10 are resolved | Straylight (canonical owner) + held sibling gates #9 / #10 | — (a host selection is not a Dixie docs-only act and is not selectable now; #9 / #10 held) | **NOT SELECTED.** Not a Dixie docs-only decision; remains a *future* Straylight-side + #9 / #10 event, not performed here |
| **Defer / no decision** (record nothing, no routing) | Makes no statement about the host dependency | — | — | — | **NOT SELECTED.** The chain's discipline requires the dependency status be *recorded and routed* (held under #9 / #10), not silently deferred; Option A supplies that routing |

**Reading of the matrix.** Only **Option A — the host dependency remains held / routed to sibling gates #9 / #10** — is
supported by the repo evidence. Dixie-local host selection is rejected (Dixie has no authority and #10 is held); a
Straylight-owned host selection is not a Dixie docs-only act and is not selectable now (#9 / #10 held); a silent defer is
inferior to explicit routing. No candidate selects a host.

---

## 11. Decision criteria

The disposition of the canonical-store physical-host dependency is decided against these criteria, applied read-only to
the merged record:

1. **Authority.** Can a Dixie docs-only phase decide the canonical-store physical host? **No** — host wiring is governed
   by held sibling gates #9 / #10 (externally owned) and canonical ownership is Straylight's (§8 / §9).
2. **Evidence.** Does the repo evidence discharge #9 / #10 or support selecting a host now? **No** — every record
   (46M §6.4; 46N §4.6; 47T §10; 47U §11) keeps the host future-gated under held #9 / #10; none records #9 / #10 resolved
   (§8).
3. **Conjunctivity.** Can the full D.1 item be satisfied while conjunct (ii) is open? **No** — D.1 is conjunctive; a
   conjunctive item with one conjunct open is not satisfied (§6 / §12).
4. **Invariant preservation.** Does routing the dependency preserve every invariant? **Yes** — routing changes no
   canonical ownership, no public-response shape, no scope guard, and authorizes no production work (§16).
5. **Downstream evidence requirement.** What would a *future* host-selection gate require before full D.1 could be
   satisfied? **Both** of: (a) a host selected among Straylight-process / Finn / Dixie-hosted adapter; and (b) the held
   sibling gate(s) #9 / #10 resolved per their own triggers for the chosen host. Neither exists now (§15). D.2 (the chosen
   host's canonical invariant-preservation evidence) is a **separate downstream** checklist item sequenced after full D.1,
   **not** a prerequisite for satisfying D.1.
6. **No overclaim.** Does the decision avoid any production / discharge / freeze / host-selection / full-D.1-satisfaction
   claim? **Yes** — the decision is strictly a dependency-status routing (§1 / §16).

Applying these criteria, the only supported disposition is **Option A** (§10 / §12): the dependency remains held / routed
to #9 / #10, no host is selected, and the full D.1 item remains NOT YET SATISFIED.

---

## 12. Selected dependency decision

**Selected: Option A — the canonical-store physical-host dependency (D.1 conjunct (ii)) REMAINS HELD and is ROUTED to
held sibling gates #9 / #10; no host is selected; full D.1 remains NOT YET SATISFIED.**

Stated precisely:

- **The dependency remains held.** The canonical-store physical host (Straylight-process / Finn / Dixie-hosted adapter)
  is **not** selected and **cannot** be selected by a Dixie docs-only phase; it stays externally gated by **held** sibling
  gates #9 (Finn runtime wiring) / #10 (Dixie boundary wiring), each with its own trigger (§8).
- **The dependency is routed, not decided.** Its resolution path is: a host selected **and** held sibling gates #9 / #10
  resolved per their own triggers for the chosen host. Until then it is **EXTERNALLY GATED and UNSATISFIED** (§9 / §11).
  (D.2, the chosen host's canonical invariant-preservation evidence, is a **separate downstream** checklist item sequenced
  after full D.1, **not** a prerequisite for satisfying D.1.)
- **Canonical ownership is preserved.** The `active` `Assertion`, `TransitionReceipt`, and `AuditEvent` stay
  Straylight-owned through `StorageAdapter` / `AuditLog`; Dixie holds ingress references only (§7 / §9). Conjunct (i)
  (route-owned-records placement, accepted by Phase 47U) is unchanged and **not reopened**.

**D.1 conjunct matrix.** The matrix records each D.1 component's status before and after this gate. Columns: **D.1
component**, **Status before Phase 47V**, **Status after Phase 47V**, **Why**, **Next implication**.

| D.1 component | Status before Phase 47V | Status after Phase 47V | Why | Next implication |
|---------------|-------------------------|------------------------|-----|------------------|
| **D.1 conjunct (i): route-side adapter ownership / placement** | **Accepted by Phase 47U** (47U §1 / §7–§9) | **Accepted by Phase 47U, unchanged** | Not reopened here; this gate addresses conjunct (ii) only | A future swap-in implementation must conform to the canonical `StorageAdapter` contract (D.3 / D.5 / D.7), still owed, downstream of full D.1 |
| **D.1 conjunct (ii): canonical-store physical host** | **Decomposed / externally gated; no host selected** (47T §10; 47U §11) | **Unresolved / held under sibling gates #9 / #10; no host selected** | Host wiring is governed by held #9 / #10 (externally owned); canonical ownership is Straylight's; no repo evidence discharges #9 / #10 (§8 / §9) | Resolved only when a host is selected **and** #9 / #10 resolve per their own triggers for the chosen host (§15); D.2 is a separate downstream item, not part of conjunct (ii) |
| **Full D.1 checklist item ((i) ∧ (ii))** | **NOT YET SATISFIED** (box not checked off) (47U §8 / §13) | **NOT YET SATISFIED — box NOT checked off** | Conjunctive item with conjunct (ii) externally gated and open is not satisfied (§6 / §11) | D.1 stays an open precondition for the downstream Dixie-assessable chain (D.2 onward) |

**Assessment.** Conjunct (i) stays accepted (unchanged); conjunct (ii) stays unresolved / held under #9 / #10 with no host
selected; the full conjunctive item stays **NOT YET SATISFIED** with its box **NOT** checked off. **Deciding the
dependency status selects no host, checks off no box, and satisfies no full checklist item.**

---

## 13. Effect on full D.1

**The full D.1 checklist item remains NOT YET SATISFIED; its box is NOT checked off.** D.1's two conjuncts are jointly
required. Conjunct (i) is **accepted by Phase 47U**; conjunct (ii) (the canonical-store physical host) is **unresolved and
held under sibling gates #9 / #10**. A conjunctive item with one conjunct externally gated and open is **not** satisfied.
Phase 47V's decision — that the host dependency remains held / routed to #9 / #10 — is precisely the record that conjunct
(ii) is **not** resolved, and therefore the **full D.1 item remains NOT YET SATISFIED**.

**What would be required before full D.1 could be satisfied** (recorded as a future requirement, **not** authorized or
performed here): (a) a canonical-store physical host selected among Straylight-process / Finn / Dixie-hosted adapter; and
(b) the held sibling gate(s) #9 / #10 resolved per their own triggers for the chosen host. Neither (a) nor (b) exists now,
and neither is a Dixie docs-only act. **D.2 (the chosen host's canonical invariant-preservation evidence) is a separate
downstream checklist item sequenced after full D.1, not a prerequisite for satisfying D.1; it is never folded into the
D.1 satisfaction condition.** **Phase 47V satisfies no full checklist item and does not mark D.1 as satisfied.**

---

## 14. Effect on D.2–D.14

The host-dependency decision **satisfies no checklist item** — not even conjunct (ii), which remains held, and certainly
not the full D.1 item or any D.2–D.14 item. The D.1–D.14 impact matrix below records, item-by-item, the status before and
after this gate. Columns: **Checklist item**, **Status before Phase 47V**, **Status after Phase 47V**, **Why**, **Next
implication**.

| Checklist item | Status before Phase 47V | Status after Phase 47V | Why | Next implication |
|----------------|-------------------------|------------------------|-----|------------------|
| **D.1 Storage-adapter ownership / placement ACCEPTED** | **NOT YET SATISFIED** (conjunct (i) accepted by 47U; conjunct (ii) externally gated) | **NOT YET SATISFIED** (conjunct (ii) confirmed held under #9 / #10; full item still open) | Conjunctive item: canonical-store host (conjunct (ii)) remains externally gated by held #9 / #10 (§8 / §12 / §13) | Full D.1 satisfied only when conjunct (ii) resolves (a host selected + #9 / #10 resolved for the chosen host); box stays unchecked. D.2 is a separate downstream item, not a prerequisite for D.1 |
| **D.2 Canonical invariant-preservation evidence** | **UNSATISFIED** | **UNSATISFIED** | Owner stays Straylight; preservation *evidence* is reviewed against the *chosen host's* substrate, so it cannot proceed before the host dependency resolves; still owed under Straylight review | After full D.1 (host selected + #9 / #10 resolved); canonical-substrate invariant-preservation evidence gate (Straylight-reviewed) |
| **D.3 Migration-file ownership** | **UNSATISFIED** | **UNSATISFIED** | Presupposes accepted placement + selected host; canonical side stays a separate Straylight ADR + sibling-repo PR; no migration authored | Schema / migration design + acceptance gate, downstream of full D.1 |
| **D.4 Migration-execution ownership + least-privilege** | **UNSATISFIED** | **UNSATISFIED** | Production migration path unchanged; no execution owner decided; only bounded non-production Lane-1 evidence exists | Production migration-execution authorization gate + production-grade least-privilege evidence |
| **D.5 Runtime route storage-call owner** | **UNSATISFIED** | **UNSATISFIED** | Route handler unchanged; only the Phase 33N disabled-by-default spike (Storage Option A) authorized | Route-storage authorization gate + route-contract pre-freeze, after storage acceptance |
| **D.6 Lane-1 ≠ Lane-2 boundary** | **UNSATISFIED** (preservation discipline) | **UNSATISFIED** (preservation discipline) | Boundary preserved; Lane-1 proof never read as production-safe or as pre-authorizing Lane-2 | Carried through every downstream lane; never a production-safe / Lane-2-pre-authorization claim |
| **D.7 Production DB write preconditions** | **UNSATISFIED** | **UNSATISFIED** | Blocked behind least-privilege evidence + accepted schema / migration + production no-leak serializer + operative discharge | After D.2 / D.3 / D.4 / D.12 + operative discharge (D.13) |
| **D.8 Route / API behavior-change authorization** | **UNSATISFIED** | **UNSATISFIED** | No route / API change authorized; storage + auth + identity + route-contract pre-freeze still owed | Route-contract pre-freeze gate, after storage + auth + identity decisions land |
| **D.9 Freeside integration sequencing** | **UNSATISFIED** | **UNSATISFIED** | Last surface; gate #11 held; no Freeside wiring authorized | Sequenced last: route-contract freeze + gate #11 resolution + Freeside client-contract handoff gate |
| **D.10 Auth / consent / signer / authority durable attachment** | **UNSATISFIED** | **UNSATISFIED** | Storage-dependent (P2); durable attachment home depends on the storage model being accepted first | Auth / consent persistence gates, downstream of full D.1 |
| **D.11 Tenant / estate / actor identity binding** | **UNSATISFIED** | **UNSATISFIED** | Auth-dependent (P2); downstream of D.10 | Production identity-binding persistence gate, after auth / authority acceptance (D.10) |
| **D.12 Production no-leak serializer + runtime fixtures** | **UNSATISFIED** | **UNSATISFIED** | 114 = 114 parity preserved; production serializer still owed before durable runtime code emits canonical / consent refs | Route-vector + runtime-fixture extension gate, before durable runtime code emits canonical / consent / auth / signer / storage refs |
| **D.13 Operative Straylight-side discharge** | **UNSATISFIED (externally owned, held)** | **UNSATISFIED (externally owned, held)** | Not satisfiable by any Dixie phase; gate-table preamble pathway under Straylight teammate review | A *further, separate* operative-discharge lane + Straylight teammate review; no Dixie phase satisfies it |
| **D.14 MVP-2 closure terminal gate** | **UNSATISFIED (terminal, downstream)** | **UNSATISFIED (terminal, downstream)** | Presupposes D.1–D.13 satisfied + operative discharge completed; not selectable now | A *further, separate* terminal MVP-2 closure gate; not selectable now |

**Matrix conclusion.** Deciding the host-dependency status **satisfies no checklist item**: the **full D.1 item remains
NOT YET SATISFIED** (its box NOT checked off), and **D.2–D.14 all remain UNSATISFIED**. D.2 in particular is **blocked by
full D.1 not being satisfied** — its canonical invariant-preservation evidence is reviewed against the *chosen host's*
substrate, which cannot be named while conjunct (ii) is held. D.13 stays externally owned / held; D.14 stays terminal /
downstream. **No D.1–D.14 box is checked off.**

---

## 15. Next-lane selection

> **Selected next lane: Phase 47W — Admission Wedge ADR-022E gate #8 D.1 physical-host dependency acceptance gate**
> (a *separate*, strictly docs / decision-only gate that may **ACCEPT — or PATCH — this Phase 47V dependency verdict
> only** (the canonical-store physical-host dependency remains held / routed to held sibling gates #9 / #10, no host
> selected, full D.1 NOT YET SATISFIED) as a correctly-bounded, faithfully-grounded, invariant-preserving
> dependency-status decision; it **must not** select the canonical-store physical host, satisfy full D.1, satisfy any
> D.2–D.14 item, discharge gate #8, close MVP-2, or authorize production implementation; it is **NOT** a host selection,
> **NOT** a production implementation, **NOT** a durable-store lane, **NOT** a migration, **NOT** a route / API behavior
> change, **NOT** a Freeside integration, **NOT** a production DB write, **NOT** the gate-#8 discharge, and **NOT** the
> MVP-2 closure).

With the canonical-store physical-host dependency **decided to remain held / routed to #9 / #10** (§12), the disciplined
next rung — following the chain's pervasive decide → accept discipline (schema-design gate → schema-design *acceptance*
gate; clearing-readiness assessment → clearing-readiness *acceptance* gate; D.1 placement decision → D.1 placement
*acceptance* gate) — is a **separate, strictly docs/decision-only Phase 47W dependency *acceptance* gate** that ACCEPTS or
PATCHES this Phase 47V dependency verdict before any downstream corridor proceeds. A fresh dependency verdict is **not**
self-accepted; it is adjudicated by an independent acceptance gate that checks it is correctly bounded (a dependency-status
routing only), faithfully grounded (46M §6.4 / 46N #9 / #10 / 47T §10 / 47U §11), invariant-preserving, and free of
overclaim — exactly as Phase 47U adjudicated Phase 47T.

**Why Phase 47W (and not D.2) is next.** The load-bearing rule is that **D.2 must not proceed while full D.1 remains
unsatisfied**: D.2's canonical invariant-preservation evidence is reviewed against the *chosen host's* substrate, and no
host is selected (conjunct (ii) is held). Jumping to D.2 now would presuppose a satisfied D.1 that does not exist.
Selecting the dependency *acceptance* gate keeps the chain's decompose → decide → accept rhythm intact and ensures the
dependency verdict is ratified before any host-selection or D.2 corridor — which presupposes a *fully-satisfied* D.1 — is
opened. (A host-selection gate is **not** selectable as the next lane either, because host selection requires #9 / #10
resolved, which is externally owned and held.)

**Not selected as the next lane:** a canonical-store physical-host *selection* (externally gated by held sibling gates
#9 / #10 — Phase 47W accepts / patches the dependency verdict, it does not select the host); a D.2 canonical
invariant-preservation-evidence gate (premature — it presupposes a *fully-satisfied* D.1, so it follows the conjunct-(ii)
dependency resolution, not precedes it); a storage-adapter ownership / placement ADR *update / freeze* (premature — the
ADR update is ripe only after the full D.1 item, including conjunct (ii), is resolved, 47T §16 Option B); a Lane-2
canonical Straylight-store migration / schema alignment gate (downstream of the gate-#8 boundary, 47R §12 / §17);
production durable-store / adapter implementation authorization (rejected, §10); a gate-#8 discharge (rejected;
Straylight-owned and held, §8). Each remains a *future, separate* docs/decision lane in dependency order; none is opened,
implemented, updated, authorized, selected, or discharged here.

Phase 47W **may accept or patch Phase 47V's dependency verdict only.** It is **categorically unable** to select the
canonical-store physical host, satisfy full D.1, satisfy any D.2–D.14 item, discharge gate #8, close MVP-2, or authorize
production implementation. Phase 47W **must be strictly docs / decision-only**: it must **not** select the canonical-store
physical host, implement production storage, authorize production migrations, change route / API behavior, integrate
Freeside, write to a database, discharge gate #8, satisfy full D.1, satisfy any D.2–D.14 item, or close MVP-2. Selecting
the canonical-store physical host — and therefore satisfying full D.1 — belongs to a **later, separately authorized
host-selection lane** (gated by held sibling gates #9 / #10), **not** to Phase 47W.

**Non-authorizations and invariants preserved** (carried forward unchanged):

- A pending candidate is not recallable.
- A rejected candidate creates no admitted assertion.
- An accepted candidate creates / references an admitted assertion.
- A superseded assertion is excluded from ordinary recall unless explicitly requested / marked.
- A malformed / unsafe payload fails closed.
- Missing / unauthorized auth fails closed; missing / invalid consent fails closed in any future production admission
  model.
- Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage material; private
  `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private.
- User chat does not become memory merely because it was said.
- `active` remains the canonical assertion status, not a public `outcome_class`; `recall_eligible` remains derived /
  projection-only.
- The canonical audit log is append-only, hash-chained, and tamper-detectable via `verifyChain`.

---

## 16. Non-goals and blocked work

Phase 47V explicitly does **none** of the following — each remains exactly as blocked / deferred as before this gate. The
following work **remains BLOCKED**:

- production DB execution;
- production `--apply`;
- production DB writes;
- production migration execution;
- durable production storage implementation;
- startup wiring (`server.ts`; the only startup DB call stays `await migrate(dbPool)` inside `if (dbPool)` at
  `server.ts:303` / `:305`);
- config behavior changes (`config.ts`; `DATABASE_URL` at `config.ts:340`);
- package / lockfile changes;
- production migration files;
- route / API behavior changes;
- public response changes;
- raw candidate payload persistence;
- production auth / consent implementation;
- production signer / authority implementation;
- tenant / estate / actor production identity implementation;
- Freeside runtime / client integration;
- Lane-2 canonical Straylight-store migrations implementation;
- **canonical-store physical-host selection**;
- ADR-022E gate #8 discharge;
- route-contract freeze;
- final-schema freeze;
- MVP-2 closure;
- production readiness;
- any `aw_*` SQL production-safe claim.

In addition, Phase 47V:

- does not produce evidence, run a role / grant test, open a DB connection, run forward or cleanup SQL, or invoke `psql`
  / Docker / Postgres;
- does not inject a DB client / sink, perform a DB write, or execute a migration;
- does not change any migration runner (`migrate.ts`, 254 lines) / packager (`copy-migrations.mjs`, 62 lines) /
  scope-guard (`scope-guards.test.ts`, canonical 19-entry denylist `:122-142`) / startup / route handler / route-vector
  / validator / fixture / package / lockfile / CI file;
- does not select the canonical-store physical host or resolve any held sibling gate (#9 / #10 / #11 / #12 / #15 / #20
  stay held);
- does not update or freeze any storage-adapter ownership / placement ADR;
- does not satisfy, check off, or discharge any D.1–D.14 checklist item; it **decides the D.1 conjunct-(ii)
  canonical-store physical-host dependency status** (it remains held / routed to #9 / #10) and satisfies **no** full item;
- does not conclude that gate #8 is ready for discharge, does not discharge ADR-022E gate #8 (operatively or otherwise)
  or any Straylight-side gate, and clears gate #8 no further than Phase 46N's documentation / architecture / handoff
  prerequisite;
- does not touch any adjacent repository.

All production work — production DB execution, production `--apply`, production DB writes, production migration execution,
durable production storage implementation, the production storage adapter, the storage-adapter ownership / placement ADR
update / freeze, the canonical-store physical-host selection, Lane-2 canonical Straylight-store migrations, production
auth / consent / signer / authority, tenant / estate / actor identity binding, route / API behavior change,
public-response expansion, raw-payload persistence, Freeside runtime / client integration, ADR-022E gate #8 discharge,
the route-contract freeze, the final-schema freeze, and MVP-2 closure — **remains BLOCKED**.

---

## 17. Codex audit checklist

This checklist audits **this Phase 47V PR** — the docs-only ADR-022E gate #8 D.1 canonical-store physical-host dependency
gate. Every item must be ACCEPT; any REJECT blocks acceptance of this Phase 47V PR.

```text
PHASE 47V — ADR-022E GATE #8 D.1 CANONICAL-STORE PHYSICAL-HOST DEPENDENCY GATE
CODEX AUDIT CHECKLIST
(docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47V PR)

[ ] 1.  Scope is docs-only — Phase 47V adds only this document plus a single minimal §19 forward-traceability status note
        (in the Phase 47U ADR-022E gate #8 D.1 storage-adapter ownership / placement decision acceptance gate); it
        modifies no runtime source, and specifically not migrate.ts, copy-migrations.mjs, any *.sql, the experimental SQL
        / manifest / planner (aw-sql-isolation-spike/*) / runner, no-leak.ts, aw-sql-execution-sink-spike.test.ts, the
        three extended Phase 47F test files, config.ts, server.ts, or scope-guards.test.ts.
[ ] 2.  No runtime/source/test/config/package/CI/SQL/migration/vector/validator/fixture changes — no route handler,
        store/storage code, DB code, migration runner, packaging/copy runner, planner, runner, auth, consent, server-boot,
        unit/integration test, scope-guard test, isolation test, fixture, route-vector JSON, route-vector validator,
        route-vector README, config.ts, env gate, package.json, lockfile, .github/ CI, .sql, aw_* schema, executable
        schema, migration file, or migration directory is added/modified.
[ ] 3.  Phase 47V produces NO evidence and runs nothing — the gate creates no disposable database, no role, no grant,
        runs no privilege/role/grant test, runs no forward or cleanup SQL under any role, opens no connection, and invokes
        no psql / Docker / Postgres; it decides the status of one externally-gated dependency and selects a next
        docs/decision-only lane (§1/§2).
[ ] 4.  Phase 47U intake is faithful (§5) — Phase 47U accepted the Phase 47T D.1 conjunct-(i) decision, confirmed conjunct
        (ii) (canonical-store host) stays externally gated by #9/#10 with no host selected, left full D.1 NOT YET
        SATISFIED, kept D.2-D.14 UNSATISFIED + gate #8 / MVP-2 OPEN, and selected this Phase 47V host-dependency gate;
        restated read-only, not extended; Phase 47U outcome preserved (conjunct (i) accepted; full D.1 unsatisfied;
        D.2-D.14 unsatisfied; host held under #9/#10; D.13 externally owned/held; D.14 terminal; gate #8 + MVP-2 open).
[ ] 5.  D.1 conjunct inventory is correct (§6) — D.1 is conjunctive; conjunct (i) route-side adapter ownership/placement
        ACCEPTED BY PHASE 47U (not reopened); conjunct (ii) canonical-store physical host EXTERNALLY GATED / HELD under
        #9/#10; full item = (i) AND (ii) => NOT YET SATISFIED, box NOT checked off.
[ ] 6.  Canonical-store physical-host dependency is defined precisely (§7) — canonical store (active Assertion /
        TransitionReceipt / AuditEvent) is Straylight-owned; "physical host" = which runtime hosts/operates it
        (Straylight-process / Finn / Dixie-hosted adapter); the dependency = host selection + held #9/#10 resolved; D.2
        (the chosen host's canonical invariant-preservation evidence) is a SEPARATE DOWNSTREAM item, NOT part of conjunct
        (ii) and NOT a prerequisite for satisfying D.1; the dependency is NOT the route-owned-records placement (conjunct
        (i)), NOT a concrete external DB substrate (Candidate E / #12 / #20), and NOT the operative discharge (D.13).
[ ] 7.  Sibling gates #9 / #10 status assessed (§8) — #9 (Finn runtime wiring, :58) and #10 (Dixie boundary wiring, :59)
        recorded HELD; canonical-store host stays governed by held #9/#10 (46M §6.4; 46N §4.6); no repo evidence discharges
        #9/#10; gate #8 itself REMAINS OPEN (operative discharge D.13 held).
[ ] 8.  Ownership / authority assessed (§9) — the canonical-store host decision is NOT a Dixie docs-only decision;
        canonical ownership is Straylight's; host wiring is gated by held #9/#10; Dixie cannot decide the host locally;
        the dependency is routed, not decided; no sibling gate resolved.
[ ] 9.  Candidate dependency options matrix complete (§10) — columns Candidate / Physical-host claim / Evidence / Authority
        / owner / Remaining blocked work / Phase 47V decision; includes Held sibling gates #9/#10 dependency (SELECTED,
        Option A), Dixie-local host selection (REJECTED), Straylight-owned canonical-store host selection (NOT SELECTED),
        Defer / no decision (NOT SELECTED); NO candidate selects a host.
[ ] 10. Decision criteria stated (§11) — authority (not Dixie's); evidence (#9/#10 not discharged); conjunctivity (one
        conjunct open => not satisfied); invariant preservation; downstream requirement for full D.1 (host selected + #9/#10
        resolved), with D.2 a separate downstream item that is NOT a prerequisite for satisfying D.1; no overclaim; only
        Option A supported.
[ ] 11. Selected dependency decision is bounded (§12) — Option A: host dependency REMAINS HELD and is ROUTED to held #9/#10;
        NO host selected; the D.1 conjunct matrix (D.1 component / Status before Phase 47V / Status after Phase 47V / Why /
        Next implication) includes conjunct (i) [accepted by 47U, unchanged], conjunct (ii) [unresolved/held under #9/#10],
        full D.1 [NOT YET SATISFIED, box NOT checked off].
[ ] 12. Effect on full D.1 correct (§13) — conjunctive item with conjunct (ii) held is NOT YET SATISFIED; box NOT checked
        off; what would be required before full D.1 (host selected + #9/#10 resolved for the chosen host) recorded as a
        FUTURE requirement, not authorized/performed; D.2 (the chosen host's canonical invariant-preservation evidence) is
        a SEPARATE DOWNSTREAM item, NOT a prerequisite for satisfying D.1; D.1 NOT marked satisfied.
[ ] 13. Effect on D.2-D.14 complete and all UNSATISFIED (§14) — a table with columns Checklist item / Status before Phase
        47V / Status after Phase 47V / Why / Next implication; D.1-D.14 each appear exactly once; full D.1 NOT YET
        SATISFIED; D.2-D.14 UNSATISFIED; D.2 blocked by full D.1 not satisfied (chosen-host substrate unknown); no box
        checked off; D.13 externally owned/held; D.14 terminal/downstream.
[ ] 14. Verdict wording is bounded (§1) — "D.1 CANONICAL-STORE PHYSICAL-HOST DEPENDENCY REMAINS HELD UNDER SIBLING GATES
        #9/#10 / FULL D.1 REMAINS NOT YET SATISFIED / D.2-D.14 REMAIN UNSATISFIED / GATE #8 REMAINS OPEN / MVP-2 REMAINS
        OPEN"; no unbounded "production-safe", "production ready", "MVP-2 closed", "gate #8 discharged", "gate #8
        cleared(beyond-46N)", "gate #8 ready", "durable storage implemented", "canonical-store host selected", "ownership
        ADR updated/frozen", "full D.1 satisfied", or "checklist satisfied" claim anywhere; deciding the dependency status
        is distinguished from selecting the host, satisfying full D.1, implementing, freezing, and discharging.
[ ] 15. Next lane is correct (§15) — Phase 47W, a STRICTLY docs/decision-only D.1 physical-host dependency ACCEPTANCE gate
        that may accept/patch THIS Phase 47V dependency verdict ONLY; it is categorically unable to select the
        canonical-store physical host, satisfy full D.1, satisfy any D.2-D.14 item, discharge gate #8, close MVP-2, or
        authorize production implementation; explicitly NOT a host selection, NOT production implementation, NOT a
        durable-store lane, NOT a migration, NOT a route/API change, NOT Freeside, NOT a production DB write, NOT the
        gate-#8 discharge, and NOT the MVP-2 closure; host selection (and thus full D.1 satisfaction) belongs to a later,
        separately authorized host-selection lane, NOT Phase 47W (no "unless later evidence supports it" exception in the
        Phase 47W scope); the rule that D.2 must not proceed while full D.1 is unsatisfied is justified, and D.2 is a
        separate downstream item that is NOT a prerequisite for satisfying D.1; a host-selection gate is NOT selectable
        next (#9/#10 held).
[ ] 16. No production overclaim — no production-readiness, production-safe, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, ADR-022E-gate-#8-cleared(beyond-46N), gate-#8-ready, production-DB-write, production-
        migration-execution, durable-production-storage, storage-adapter-implementation, ownership-ADR-update/freeze,
        canonical-store-host-selected, Freeside-runtime, Lane-2-canonical, production-auth/consent/signer/identity, full-
        D.1-satisfied, checklist-satisfied, or MVP-2-closed claim; every such reference is negated / blocked / a non-goal
        / a future requirement (§7-§16).
[ ] 17. Dependency-status vs selection/satisfaction/discharge distinction preserved everywhere — every "decide"/"decision"
        reference distinguishes deciding the dependency STATUS (it remains held / routed) from SELECTING the canonical-store
        host, satisfying the full D.1 item, any D.2-D.14 item, implementing, freezing an ADR, or discharging gate #8; gate
        #8 and MVP-2 REMAIN OPEN.
[ ] 18. No bad citation regression — no migrate.ts:303-305 citation (migrate.ts is 254 lines); the conditional startup
        migrate is cited as server.ts:303 (if (dbPool)) / server.ts:305 (await migrate(dbPool)); the canonical scope-guard
        denylist is the 19-entry scope-guards.test.ts:122-142 (forbidden-import test :185, file 364 lines); the
        execution-gate seam is index.ts:661/700 with injected sink interface index.ts:124, applyIsolationSpikePlan
        index.ts:568, SYNTHETIC_REF_MAX_LENGTH=80 index.ts:718 (index.ts 914 lines); config.ts DATABASE_URL at
        config.ts:340 (config.ts 485 lines); runner 498 lines; copy-migrations.mjs 62 lines; no-leak.ts 114-key parity,
        286 lines; server.ts 773 lines; gate #9 = Finn runtime wiring (:58), gate #10 = Dixie boundary wiring (:59).
[ ] 19. Forward-traceability note is minimal and evidence-bound (§19) — the single added note (in the Phase 47U D.1
        decision acceptance gate) records only that Phase 47V decided the canonical-store physical-host dependency status
        (it remains held / routed to held sibling gates #9/#10, no host selected), left the full D.1 item NOT YET
        SATISFIED, kept D.2-D.14 UNSATISFIED, selected the Phase 47W physical-host dependency acceptance gate (Option A),
        produced no evidence, satisfied no full checklist item, and kept gate-#8 discharge / production / MVP-2 closure work
        blocked; the note claims no production safety, gate-#8 readiness, gate-#8 discharge, host selection, full-D.1
        satisfaction, or MVP-2 closure.
[ ] 20. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5 (no sixth
        vector); self-check 44/44; git diff --check and git diff --cached --check clean; nothing staged (§18).
[ ] 21. No adjacent-repo changes — no file in loa-straylight, freeside-characters, or any adjacent/sibling repo was
        created or modified by Phase 47V.
[ ] 22. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp / temp,
        __pycache__, .pyc, dist, build, or .claude artifact appears in the Phase 47V working tree.
[ ] 23. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the Claude Code memory
        store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
[ ] 24. Section headings are well-formed and single-occurrence — each numbered section heading (## 1. … ## 20.) appears
        exactly once; no duplicated heading; no pasted terminal-report fragment; every Markdown table row is well-formed;
        the triple-backtick count is even; no fenced block is an executable migration or runnable schema.
[ ] 25. The gate is honest about what it does and does not do — it DECIDES the D.1 conjunct-(ii) canonical-store
        physical-host dependency STATUS (it remains held / routed to held sibling gates #9/#10, no host selected), leaves
        the full D.1 item NOT YET SATISFIED, keeps D.2-D.14 UNSATISFIED, and SELECTS a next docs/decision-only D.1
        physical-host dependency acceptance lane ONLY; it authorizes no production work, discharges no gate, satisfies no
        full checklist item, selects no canonical-store host, concludes no readiness-for-discharge, clears gate #8 no
        further, updates or freezes no ownership ADR, freezes nothing, implements no storage, and closes no MVP-2; gate #8
        and MVP-2 REMAIN OPEN (§1 / §8 / §9 / §10 / §12 / §13 / §14 / §15 / §16).
```

---

## 18. Validation record

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47V is
docs/decision-only — it adds only this document (plus the single minimal forward-traceability status note below) and
mutates **no** runtime source, test, validator, vector, fixture, migration, or SQL file — so the validators are run only
to confirm the unchanged artifacts remain green.

```bash
git branch --show-current
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
git diff --name-only HEAD -- app package.json package-lock.json app/package.json app/package-lock.json .github .run evals/harness
git ls-files --others --exclude-standard
git status --short --untracked-files=all | grep -iE 'MEMORY|memory|grimoire|__pycache__|\.pyc|generated|tmp|temp|\.claude|dist|build'
# Adjacent-repo reference scan (interpret: cross-repo mentions in prose are fine; no adjacent file is touched):
grep -RInE 'loa-arcturus|arcturus|loa-sensenet|sensenet' docs app package.json package-lock.json .github .run 2>/dev/null || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-ADR-022E-GATE-8-D1-CANONICAL-STORE-PHYSICAL-HOST-DEPENDENCY-GATE.md
```

**Recorded results for this lane** (run during authoring):

- **branch** — `phase-47v-adr022e-gate8-d1-canonical-store-physical-host-dependency`, as expected for this phase;
- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-ADR-022E-GATE-8-D1-CANONICAL-STORE-PHYSICAL-HOST-DEPENDENCY-GATE.md` is added, plus the single
  minimal forward-traceability status note (§19) in the Phase 47U ADR-022E gate #8 D.1 storage-adapter ownership /
  placement decision *acceptance* gate; no runtime source (and specifically not `migrate.ts`, `copy-migrations.mjs`, any
  `*.sql`, the experimental SQL / manifest / planner / runner, `no-leak.ts`, the `aw-sql-execution-sink-spike.test.ts`,
  the three extended Phase 47F test files, `config.ts`, `server.ts`, or `scope-guards.test.ts`), no runtime test, no
  route-vector JSON, validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config
  / env, CI, `.run`, `evals/harness`, migration, SQL, executable schema, or generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0 failures**;
  the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**; the
  `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail closed; 2 exact-key
  non-over-match guards stay clean);
- **diff checks clean** — `git diff --check` and `git diff --cached --check` report no whitespace / conflict-marker
  errors; nothing is staged;
- **docs-only scope checks** — the `app package.json … .github .run evals/harness` diff is empty; the only additions are
  this document and the Phase 47U acceptance gate's single forward-traceability note; the memory/generated/temp scan
  matches nothing under the working tree from this phase;
- **adjacent-repo reference scan** — any `loa-straylight` / `freeside-characters` matches are prose-only and no
  adjacent-repo file is created or modified;
- **overclaim scan** — every match is a **negated / blocked / non-goal / bounded** reference (e.g. "GATE #8 REMAINS
  OPEN", "MVP-2 REMAINS OPEN", "the full D.1 checklist item remains NOT YET SATISFIED", "deciding the dependency status
  selects no host", "does not discharge ADR-022E gate #8", "clears gate #8 no further than Phase 46N's documentation /
  architecture / handoff prerequisite", "operative Straylight-side discharge remains held", "selects no host",
  "route-contract freeze … blocked", "final-schema freeze … blocked", "Lane-2 canonical … blocked", "Freeside runtime /
  client integration … blocked", "makes no claim that `aw_*` SQL is production-safe", "durable production storage …
  blocked", "does not close MVP-2", and every "decide" / "decision" is qualified to deciding the *dependency status* (it
  remains held / routed to #9 / #10), never selecting the host, satisfying the full D.1 item, satisfying any D.2–D.14
  item, implementing, freezing an ADR, or discharging); there is **no** positive present-tense production authorization
  or safety claim, **no** claim that gate #8 is ready or discharged or cleared beyond the 46N prerequisite, **no** claim
  that a canonical-store host is selected, **no** claim that the full D.1 item or any D.2–D.14 item is satisfied, and
  **no** claim that MVP-2 is closed or that `aw_*` SQL is production-safe;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–20 exactly once each.

**Forward-traceability status note added (§19 scope):** the Phase 47U ADR-022E gate #8 D.1 storage-adapter ownership /
placement decision *acceptance* gate (which named this Phase 47V gate) gains a single bounded additive Phase 47V note
(per §19).

**Corruption / duplicate guard** (carried from the 46I–47U precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 20.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §17 Codex audit
  checklist (a `text` block) and the §18 validation command list (a `bash` block). **No fenced block is an executable
  migration or runnable schema.**

---

## 19. Forward-traceability notes

Phase 47V adds exactly **one** minimal forward-traceability status note, in the Phase 47U ADR-022E gate #8 D.1
storage-adapter ownership / placement decision *acceptance* gate that named this Phase 47V gate. The note is bounded and
additive; it claims **no** production safety, **no** gate-#8 readiness, **no** gate-#8 discharge, **no** host selection,
**no** full-D.1 or D.2–D.14 satisfaction, and **no** MVP-2 closure.

- `docs/ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-ACCEPTANCE-GATE.md` — a bounded additive
  Phase 47V forward-traceability status note recording that the D.1 canonical-store physical-host dependency gate Phase
  47U selected (its §15) has run: it **decided the canonical-store physical-host dependency status** — the dependency
  **remains HELD and is ROUTED to held sibling gates #9 / #10** (no host selected; Dixie cannot decide the host locally;
  the resolution path is a host selected plus #9 / #10 resolved for the chosen host; D.2 is a separate downstream item,
  not a prerequisite for satisfying D.1), left the **full D.1 checklist item NOT YET SATISFIED** (box not checked
  off), kept **D.2–D.14 all UNSATISFIED**, **selected the next lane as a strictly docs/decision-only Phase 47W ADR-022E
  gate #8 D.1 physical-host dependency *acceptance* gate** (Option A), **produced no evidence**, **satisfied no full
  checklist item**, **selected no canonical-store host**, **discharged no gate**, **cleared gate #8 no further** than
  Phase 46N's documentation / architecture / handoff prerequisite, and **authorized no production work** — keeping **gate
  #8 OPEN** and **MVP-2 OPEN** and all production / gate-#8 discharge / MVP-2 closure work blocked.

> **Phase 47W status note (forward traceability; added by the Phase 47W ADR-022E gate #8 D.1 canonical-store
> physical-host dependency *acceptance* gate).** The next lane this gate selected (§15) has run:
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-D1-CANONICAL-STORE-PHYSICAL-HOST-DEPENDENCY-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-D1-CANONICAL-STORE-PHYSICAL-HOST-DEPENDENCY-ACCEPTANCE-GATE.md)
> (strictly docs/decision-only; **produced no evidence**; Verdict / **Option A** — **ACCEPT** this Phase 47V D.1
> canonical-store physical-host dependency verdict, within its actual scope). It **accepted** that the D.1 conjunct-(ii)
> canonical-store physical-host dependency **REMAINS HELD and is ROUTED to held sibling gates #9 / #10** with **no host
> selected** (sibling gates #9 / #10 remain the proper authority path for the host dependency; the resolution path is a
> host selected plus #9 / #10 resolved for the chosen host; D.2 is a separate downstream item, not a prerequisite for
> satisfying D.1), **preserved** D.1 conjunct (i) (route-owned-records placement) as **accepted by Phase 47T / 47U** (not
> reopened) and distinguished from canonical-store physical hosting, **preserved** that canonical `Assertion` /
> `TransitionReceipt` / `AuditEvent` semantics remain Straylight-owned and that **Dixie does not become a parallel
> canonical lifecycle owner** (it holds ingress references only and re-mints no receipt), left the **full D.1 checklist
> item NOT YET SATISFIED** (box not checked off) and **D.2–D.14 all UNSATISFIED** (D.13 externally owned / held; D.14
> terminal / downstream), **satisfied no full checklist item**, **selected no canonical-store host**, **discharged no
> gate**, **cleared gate #8 no further** than Phase 46N's documentation / architecture / handoff prerequisite, **updated
> or froze no ownership / placement ADR**, **authorized no production work**, and **selected the next lane as a strictly
> docs/decision-only Phase 47X — Admission Wedge ADR-022E gate #8 D.1 remaining-conjunct / sibling-gate handoff packet**.
> **Gate #8 and MVP-2 remain OPEN** and all production / gate-#8 discharge / MVP-2 closure work stays blocked.

No other file is modified.

---

## 20. Final decision statement

**HOST DEPENDENCY REMAINS HELD (Option A).** Phase 47V **decides** the status and ownership path of the still-open D.1
**conjunct (ii)** — the canonical-store physical-host dependency — and concludes it **REMAINS HELD and is ROUTED to held
sibling gates #9 / #10**. The canonical-store physical host (Straylight-process / Finn / Dixie-hosted adapter) is **not**
selected and **cannot** be selected by a Dixie docs-only phase: host wiring is governed by **held** gate #9 (Finn runtime
wiring, `:58`) and **held** gate #10 (Dixie boundary wiring, `:59`), canonical-store ownership is Straylight's, and **no
repo evidence discharges #9 / #10 or supports selecting a host now** (§7–§11). The dependency's resolution path — a host
selected **and** held sibling gates #9 / #10 resolved for the chosen host — is recorded as a **future** requirement, not
authorized or performed here (§13 / §15). D.2 (the chosen host's canonical invariant-preservation evidence) is a separate
downstream checklist item sequenced after full D.1, **not** a prerequisite for satisfying D.1.

**Because D.1 conjunct (ii) (the canonical-store physical host) remains externally gated by held sibling gates #9 / #10,
the full D.1 checklist item remains NOT YET SATISFIED — its box is NOT checked off — and D.2–D.14 all remain
UNSATISFIED** (§12 / §13 / §14). **Deciding the dependency status selects no canonical-store host, checks off no box,
satisfies no full checklist item, implements no storage, freezes no ADR, discharges no gate, authorizes no production
work, and closes no MVP-2.** D.1 conjunct (i) (route-owned-records placement) remains **accepted by Phase 47U** and is
**not reopened**. The Dixie-local host selection candidate is **REJECTED** (no authority; #10 held); a Straylight-owned
host selection is **NOT SELECTED** (not a Dixie docs-only act; #9 / #10 held); a silent defer is **NOT SELECTED** (explicit
routing is required). The selected next lane is the strictly docs/decision-only **Phase 47W — Admission Wedge ADR-022E
gate #8 D.1 physical-host dependency acceptance gate** (§15), which accepts or patches this dependency verdict.

**Gate #8 REMAINS OPEN. MVP-2 REMAINS OPEN. All production work remains BLOCKED.**
</content>
