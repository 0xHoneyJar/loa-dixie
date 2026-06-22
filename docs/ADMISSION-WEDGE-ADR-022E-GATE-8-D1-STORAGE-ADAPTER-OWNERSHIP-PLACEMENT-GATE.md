# Phase 47T — Admission Wedge ADR-022E gate #8 D.1 storage-adapter ownership / placement decision gate

> **Phase**: 47T
> **Branch context**: `phase-47t-adr022e-gate8-d1-storage-adapter-ownership-placement`
> **Related**: Phase 47S (PR #190, commit `261d89d2`,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-ACCEPTANCE-GATE.md))
> **accepted** the Phase 47R **NOT YET READY for operative discharge** readiness verdict and the **D.1–D.14** minimum
> discharge checklist as the binding criteria a future operative-discharge lane and Straylight teammate review must
> satisfy (Verdict / Option A — ACCEPT, all ten acceptance criteria MET), **satisfied no checklist item**, **discharged
> no gate**, **cleared gate #8 no further** than Phase 46N's documentation / architecture / handoff prerequisite,
> **authorized no production work**, and **selected Option A — a separate, strictly docs/decision-only Phase 47T
> ADR-022E gate #8 D.1 storage-adapter ownership / placement decision gate** as the first dependency-ordered
> Dixie-assessable checklist corridor (its §8 / §14 / §15), keeping **gate #8 OPEN** and **MVP-2 OPEN**; Phase 47R (PR
> #189, commit `128757d7`,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-GATE.md))
> **assessed** gate-#8 clearing readiness across the thirteen Phase 47Q §7 predicates, concluded **NOT YET READY for
> operative discharge**, **defined the D.1–D.14 minimum discharge checklist** (all unsatisfied), produced **no**
> evidence, and **selected Option A** (this Phase 47S acceptance gate), keeping **MVP-2 OPEN**; Phase 47Q (PR #188,
> commit `279feb2f`,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-STORAGE-ADAPTER-BINDING-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-STORAGE-ADAPTER-BINDING-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the gate-#8 / storage-adapter binding blocker into the thirteen-row unresolved-predicate inventory,
> **selected Option A** (clearing-readiness gate next), and named Phase 47R, keeping **MVP-2 OPEN**; Phase 47P (PR #187,
> commit `e1cc3391`,
> [`ADMISSION-WEDGE-MVP2-REMAINING-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-MVP2-REMAINING-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the standing MVP-2 blockers, **selected Option A** (the ADR-022E gate #8 / production storage-adapter
> binding corridor), and named Phase 47Q, keeping **MVP-2 OPEN**; Phase 47O (PR #186, commit `0c06720e`)
> **accepted** Lane-1 `aw_*` SQL execution corridor closure **only for the bounded non-production proof corridor** and
> **explicitly kept MVP-2 OPEN**; Phase 47F–47N (PR #177–#185) the bounded non-production Lane-1 `aw_*` SQL isolation →
> execution-sink → least-privilege evidence chain (`--apply` refused; all **NON-PRODUCTION**); Phase 46N (PR #159,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md))
> **cleared ADR-022E gate #8 *as a documentation / architecture / handoff prerequisite only*** (Candidate D proposed,
> sibling handoff packet cited, ADR-022D invariants preserved) while the **operative Straylight-side discharge stayed
> held** and sibling gates #9 / #10 / #11 / #12 / #15 / #20 stayed held; Phase 46M (PR #158,
> [`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md))
> selected **Candidate D** (split storage; Dixie route-side adapter as a `StorageAdapter` swap-in; Straylight canonical
> ownership preserved; canonical-store host + concrete substrate future-gated) as the production-adapter placement
> candidate and decomposed the durable schema / migration families; Phase 46I (PR #154,
> [`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)) recorded what gate
> #8 requires and selected split-storage Option 4 as the topology *direction*; Phase 46P (PR #161) **restored** the
> runtime `no-leak.ts` `FORBIDDEN_PUBLIC_KEYS` mirror to **114-key** parity and Phase 46Q (PR #162) **accepted** it;
> `@loa/straylight` PR #65 (A–O primitive review, **merged**); Straylight-repo ADR-022E durable-store gate #8 (+ sibling
> gates, **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only ADR-022E gate #8 D.1 storage-adapter ownership / placement *decision* gate.** This
> gate adds **only this document** (plus a single minimal forward-traceability status note, §21, in the Phase 47S
> ADR-022E gate #8 clearing-readiness acceptance gate that named this Phase 47T gate). It modifies **no** runtime source
> — and specifically does **not** modify `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`,
> `app/src/db/migrations/*.sql`, `app/src/server.ts`, `app/src/config.ts`,
> `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts`, the experimental `.sql` files, the
> `manifest.json`, the `aw-sql-isolation-spike-runner.mjs`, `no-leak.ts`, the `aw-sql-execution-sink-spike.test.ts`, the
> three extended Phase 47F test files, or `scope-guards.test.ts` — and changes **no** route handler, store / storage
> code, DB write, migration, SQL file, executable schema, migration runner, packager, scope guard, auth, consent,
> route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, other test,
> package export, config, env, package, lockfile, CI, generated file, or binary. No adjacent repository
> (`loa-straylight`, `freeside-characters`, or any sibling repo) is touched.
> **This is the ADR-022E gate #8 D.1 storage-adapter ownership / placement *decision* gate** — the docs/decision-only
> rung Phase 47S §15 named as the first dependency-ordered Dixie-assessable checklist corridor. **D.1 is a *conjunctive*
> checklist item** (47R §16): conjunct **(i)** accept Candidate D (or a successor) as the production storage-adapter
> ownership / placement *architecture* for route-owned records (a docs/decision-only acceptance gate); conjunct **(ii)**
> select the canonical-store physical host (Straylight-process / Finn / Dixie-hosted adapter) with held sibling gates
> **#9 / #10** resolved for the chosen host. This gate **DECIDES conjunct (i)** — it accepts Candidate D's split-storage
> placement as the docs/architecture-level production storage-adapter ownership / placement architecture for route-owned
> records — and **DECOMPOSES conjunct (ii)** — routing the canonical-store physical-host selection to its held sibling
> gates **#9 / #10**, which it does **not** resolve. **Deciding conjunct (i) is strictly distinct from implementing it,
> from satisfying the full D.1 checklist item, from freezing any ownership / placement ADR, and from discharging gate
> #8:** this gate makes a *paper architecture decision* about ownership / placement; it writes **no** adapter, alters
> **no** route, authors **no** migration, freezes **no** ADR, and discharges **no** gate. **Because conjunct (ii) remains
> externally gated and unsatisfied, the full D.1 checklist item remains NOT YET SATISFIED — its box is NOT checked off —
> and D.2–D.14 all remain UNSATISFIED.** **Gate #8 REMAINS OPEN now; MVP-2 REMAINS OPEN now.** This gate **produces no
> evidence, runs no role / grant test, opens no connection, executes nothing, and implements nothing.** It **enables no
> production `--apply`, injects no DB client / sink, opens no DB connection, performs no DB write, executes no migration,
> adds no SQL or executable schema, changes no migration runner / packager / startup / config, weakens or edits no scope
> guard, implements no auth or consent, changes no route / API behavior, freezes neither the route contract nor the final
> schema, discharges no operative Straylight-side gate, closes no MVP-2, and claims no production readiness.** Production
> DB execution, production migration execution, durable production storage, ADR-022E gate #8 discharge, MVP-2 closure,
> and all production work **remain BLOCKED** (§13–§19). This gate **decides the D.1 conjunct (i) ownership / placement
> architecture, decomposes conjunct (ii), and selects the next docs/decision-only lane**; it **clears** gate #8 no
> further, **opens** no corridor for implementation, **satisfies** no full checklist item, **discharges** nothing, and
> **closes** no MVP-2.

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
touched. Nothing below is executed; this gate **decides a paper ownership / placement architecture for one conjunct of
an already-merged checklist item and decomposes the other**, it produces no evidence and discharges nothing.

---

## 1. Status / verdict

**Verdict: DECIDE D.1 — ACCEPT CANDIDATE D (SPLIT STORAGE) AS THE DOCS/ARCHITECTURE-LEVEL PRODUCTION STORAGE-ADAPTER
OWNERSHIP / PLACEMENT ARCHITECTURE FOR ROUTE-OWNED RECORDS (D.1 CONJUNCT (i)); DECOMPOSE AND ROUTE THE CANONICAL-STORE
PHYSICAL-HOST CONJUNCT (ii) TO HELD SIBLING GATES #9 / #10 (NOT SELECTED HERE); THE FULL D.1 CHECKLIST ITEM REMAINS NOT
YET SATISFIED; GATE #8 REMAINS OPEN; MVP-2 REMAINS OPEN.**

This is **decision-structure Option A** (§16): the first dependency-ordered Dixie-assessable checklist corridor — **D.1,
storage-adapter ownership / placement** — is taken up, its two conjuncts are separated, and only the Dixie-assessable
conjunct is decided, at the docs/architecture level, without implementing, freezing, or discharging anything.

**D.1 is a conjunctive checklist item** (47R §16; 47S §8 / §15). Its full satisfaction requires **both**:

- **Conjunct (i) — route-owned-records architecture acceptance.** "Candidate D (or a successor) accepted as the
  production storage-adapter ownership / placement architecture for route-owned records (a docs/decision-only acceptance
  gate)." This conjunct has **no upstream Dixie predicate** — it is the genuine root of the Dixie-assessable dependency
  chain (47S §15) — and is exactly what a docs/decision-only gate may decide.
- **Conjunct (ii) — canonical-store physical-host selection.** "the canonical-store physical host (Straylight-process /
  Finn / Dixie-hosted adapter) selected with held sibling gates #9 / #10 resolved for the chosen host." This conjunct is
  **externally gated** — sibling gates **#9** (Finn runtime wiring) and **#10** (Dixie boundary wiring) are **held**,
  each with its own trigger (46N §4.6) — and **no Dixie docs-only phase can resolve it**.

**What this gate decides (conjunct (i)).** It **ACCEPTS Candidate D's split-storage placement** as the
docs/architecture-level production storage-adapter ownership / placement architecture for **route-owned records**: the
endpoint-local contract / idempotency / replay records, ingress references, and the public / private projection are
owned by a **Dixie route-side durable adapter**, shaped as a **swap-in of the canonical Straylight `StorageAdapter`
interface** and **never a parallel canonical lifecycle** (46M §6.1 / §6.2; 46N §7). This is a **paper architecture
decision only** — it accepts *which component owns route-owned-records storage at the architecture level*, nothing more.

**What this gate decomposes, not decides (conjunct (ii)).** It records that the canonical store (the `active`
`Assertion`, the first-class `TransitionReceipt`, and the append-only hash-chained `AuditEvent`) stays **Straylight-owned**
through the `StorageAdapter` / `AuditLog` path, and that its **physical host is NOT selected here** — host selection
remains externally gated by held sibling gates **#9 / #10** and is routed to those gates (§10). This gate **selects no
host**.

**Why the full D.1 item is NOT YET SATISFIED.** D.1's two conjuncts are jointly required. Conjunct (i) is **decided at
the docs/architecture level** by this gate; conjunct (ii) **remains externally gated and unsatisfied**. A conjunctive
item with one conjunct open is **not** satisfied. Therefore **the full D.1 checklist box is NOT checked off** — it
remains **UNSATISFIED** — and this gate's own conjunct-(i) decision still awaits its own acceptance rung (§18). **Deciding
conjunct (i) is categorically distinct from satisfying D.1.**

For the avoidance of doubt, this decision is **bounded** and says only what the chain supports:

- **Deciding conjunct (i) is a paper architecture decision, not an implementation.** It accepts *which component owns
  route-owned-records storage* at the architecture level. It implements **no** adapter, writes **no** storage code,
  changes **no** route handler, and authors **no** migration (§9 / §13).
- **Deciding conjunct (i) does not satisfy the full D.1 checklist item.** Because conjunct (ii) (canonical-store host
  under #9 / #10) is externally gated and open, **D.1 remains NOT YET SATISFIED** and its box is **NOT checked off**
  (§11).
- **Deciding conjunct (i) does not freeze any ownership / placement ADR.** This is a *decision / decomposition* gate, not
  an ADR update or freeze; `route_contract_final` stays false and `schema_final` stays false (§12 / §16).
- **It does not discharge ADR-022E gate #8.** Gate #8 was cleared by Phase 46N **only** as a documentation /
  architecture / handoff prerequisite; the **operative Straylight-side discharge remains held** (D.13; §14). This gate
  clears gate #8 **no further**.
- **It does not close MVP-2.** MVP-2 closure (D.14) remains a *further, separate* terminal gate downstream of every
  checklist item and the operative discharge (§14 / §15). **MVP-2 remains OPEN.**
- **It does not authorize production DB execution, production `--apply`, production DB writes, production migration
  execution, durable production storage, a production storage adapter, Lane-2 canonical Straylight-store migrations,
  production auth / consent / signer / authority, tenant / estate / actor identity binding, route / API behavior change,
  public-response expansion, raw-payload persistence, or Freeside runtime / client integration** (§13 / §19).
- **It advances no D.2–D.14 item to satisfied.** D.2–D.14 all remain **UNSATISFIED** (§15).
- **It makes no claim that `aw_*` SQL is production-safe or production-ready.**

What Phase 47T **is**, stated narrowly: it is **docs / decision-only**. It reads the merged Phase 47S acceptance gate and
the gate-#8 ADR chain (46N / 46M / 46I) read-only, intakes the Phase 47S selection (§5), restates the D.1 conjunctive
predicate (§6), recaps Candidate D read-only (§7), fixes the decision framework that keeps a decision distinct from
implementation / checklist-satisfaction / ADR-freeze / discharge (§8), decides conjunct (i) (§9), decomposes conjunct
(ii) (§10), assesses D.1's overall satisfaction (§11), records the invariants the decision preserves (§12), the
production-authorization boundary (§13), the gate-#8 / MVP-2 boundary (§14), the D.2–D.14 status (§15), disposes the
decision options (§16), selects the next docs/decision-only lane (§17 / §18), records non-goals and blocked work (§19),
provides a Codex audit checklist (§20), runs the docs validators on the unchanged artifacts (§21), records the single
forward-traceability note (§22), and states the final decision (§23). It implements, executes, enables, injects, freezes,
clears (further), discharges, and closes (MVP-2) **nothing**.

---

## 2. Scope

Phase 47T is the **docs/decision-only** ADR-022E gate #8 **D.1 storage-adapter ownership / placement decision** gate
named by Phase 47S §15 — the **separate, strictly docs/decision-only** rung that, as the first dependency-ordered
Dixie-assessable checklist corridor, decides the D.1 ownership / placement predicate. Its job is to decide: (a) what
"decide D.1" means and how a decision stays distinct from implementation, full-checklist-satisfaction, ADR freeze, and
discharge; (b) whether to **accept Candidate D (or a successor)** as the production storage-adapter ownership / placement
architecture for **route-owned records** (D.1 conjunct (i)); (c) how the **canonical-store physical-host** selection
(D.1 conjunct (ii)) sequences under held sibling gates #9 / #10 — **without selecting a host**; (d) whether the full D.1
checklist item is thereby satisfied (it is **not**); and (e) what the next docs/decision-only lane is. It is a
**decision / decomposition / selection gate — not the corridor implementation, not the full D.1 satisfaction, not an
ownership / placement ADR update or freeze, not the gate-#8 discharge, and not the MVP-2 closure**.

**In scope (this PR):**

- this single new document; and
- a single minimal forward-traceability status note (§22) in the Phase 47S ADR-022E gate #8 clearing-readiness
  acceptance gate, which named this Phase 47T gate.

**Explicitly out of scope (this PR) — Phase 47T produces nothing and runs nothing:**

- no new evidence of any kind; no disposable database; no role; no grant; no privilege test; no forward or cleanup SQL
  run under any role; no `psql` session; no Docker / Postgres invocation; no operator run;
- no runtime source / test / config / package / SQL / migration / route-vector / validator / fixture change;
- no edit to `index.ts`, the runner, `no-leak.ts`, `scope-guards.test.ts`, `migrate.ts`, `copy-migrations.mjs`,
  `server.ts`, `config.ts`, or any `*.sql`;
- no production `--apply` enablement, no DB client / sink injection, no DB connection, no DB write, no migration
  execution;
- no durable-store implementation, no storage-adapter implementation, no production migration file;
- no storage-adapter ownership / placement ADR update or freeze; no canonical-store physical-host selection;
- no auth / consent / signer / authority implementation; no tenant / estate / actor identity implementation;
- no route / API behavior change, no public response change, no raw candidate payload persistence, no Freeside
  integration;
- no Lane-2 canonical Straylight-store migration; no ADR-022E gate #8 discharge (operative or otherwise); no
  route-contract / final-schema freeze; **no MVP-2 closure**; no production readiness claim; no claim that `aw_*` SQL is
  production-safe; no full D.1 checklist-item satisfaction; no satisfaction of any D.2–D.14 item.

This gate **decides one conjunct, decomposes the other, and selects**; it **produces** nothing, **discharges** nothing,
**opens** no corridor, **satisfies** no full checklist item, and **closes** no MVP-2. Production execution, production
storage, the canonical-store host selection, the operative gate-#8 discharge, and MVP-2 closure are exactly what *future,
separate gates* must adjudicate — not what this gate asserts.

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
  or authoring a migration. **The placement candidate this gate decides at the architecture level for conjunct (i); not
  modified.**
- **Phase 46N / PR #159 (`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`)** — **cleared ADR-022E gate #8 as
  a documentation / architecture / handoff prerequisite only** (conjunct (a) Candidate D proposed; conjunct (b) sibling
  handoff packet cited; conjunct (c) ADR-022D invariants preserved), with the **operative Straylight-side discharge
  remaining held** and sibling gates #9 / #10 / #11 / #12 / #15 / #20 remaining held. **The central gate-#8 record; not
  modified.**
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
  **The checklist this gate's D.1 corridor derives from; not modified.**
- **Phase 47S / PR #190 (commit `261d89d2`,
  `ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-ACCEPTANCE-GATE.md`)** — **accepted** the Phase 47R readiness
  verdict and the D.1–D.14 checklist as binding criteria (Option A; all ten acceptance criteria MET), **satisfied no
  checklist item**, **selected this Phase 47T D.1 storage-adapter ownership / placement decision gate** as the first
  dependency-ordered Dixie-assessable corridor, and kept gate #8 and MVP-2 OPEN. **The immediate predecessor; gains the
  single Phase 47T forward-traceability status note (§22).**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner and the
  decision records cited as guardrails (§7 / §12 / §19). Cross-repo references, **not edited.**

This decision also reads, read-only, the merged Dixie decision records that already decompose downstream predicates —
the durable-store schema / migration design gates, the durable-store implementation-readiness gates, and the auth /
consent design gates. **None is edited;** each is referenced only to ground the D.2–D.14 statuses (§15) as design /
decomposition artifacts, **not** implemented production architecture.

---

## 4. Question being decided

Phase 47S §15 routed the **D.1 storage-adapter ownership / placement decision** to this gate. Phase 47T decides exactly
one question, in five precisely-bounded parts:

1. **What does "decide D.1" mean, and how is a decision distinct from implementation, full-checklist-satisfaction, ADR
   freeze, and gate-#8 discharge** (§8)?
2. **Is Candidate D (or a successor) accepted as the production storage-adapter ownership / placement *architecture* for
   route-owned records** — D.1 conjunct (i), the Dixie-assessable root (§9)?
3. **How does the canonical-store physical-host selection (D.1 conjunct (ii)) sequence under held sibling gates #9 /
   #10** — without selecting a host (§10)?
4. **Is the full D.1 checklist item thereby satisfied** — given that conjunct (ii) remains externally gated (§11)?
5. **Which next docs/decision-only lane should proceed** — given the chain's design → acceptance discipline and the
   dependency order of D.2–D.14 (§17 / §18)?

The question is **not** whether to implement a storage adapter (Phase 47T implements none, §9 / §13), **not** whether to
freeze an ownership / placement ADR (no ADR is updated or frozen, §12 / §16), **not** whether to select the
canonical-store host (it stays externally gated by #9 / #10, §10), **not** whether to satisfy the full D.1 item
(conjunct (ii) is open, so D.1 is **not** satisfied, §11), **not** whether to satisfy any D.2–D.14 item (none is
satisfied, §15), **not** whether to discharge ADR-022E gate #8 (Phase 47T discharges nothing; the operative discharge is
Straylight-owned and held, §14), and **not** whether to close MVP-2 (closure is a further separate terminal gate, §14 /
§15). It is strictly: *what "decide D.1" means, whether conjunct (i) is accepted as a paper architecture decision, how
conjunct (ii) sequences without being decided, whether the full D.1 item is satisfied (it is not), and the next
docs/decision-only lane.*

---

## 5. Phase 47S intake

Phase 47S (PR #190) is the immediate predecessor and the direct input to this gate. Restated read-only, **not extended**:

- **Phase 47S accepted the Phase 47R readiness verdict and the D.1–D.14 checklist** as the binding criteria a future
  operative-discharge lane and Straylight teammate review must satisfy (47S §1 / §7 / §8), finding **all ten acceptance
  criteria MET** and selecting **Option A — ACCEPT** (47S §6 / §14).
- **Phase 47S satisfied no checklist item, checked off no box, discharged no gate, cleared gate #8 no further** than
  Phase 46N's paper-level prerequisite, **updated no ownership / placement ADR**, and **authorized no production work**
  (47S §1 / §8 / §9 / §10).
- **Phase 47S selected this Phase 47T** ADR-022E gate #8 D.1 storage-adapter ownership / placement decision gate as the
  next lane — **the first dependency-ordered Dixie-assessable checklist corridor** — justifying D.1 as **the genuine
  root of the Dixie-assessable dependency chain** because (a) its route-owned-records acceptance half has **no upstream
  Dixie predicate**, (b) only its canonical-store-host half is externally gated (by held sibling gates #9 / #10), and (c)
  D.2 and D.6 carry a "stateable-now / READY-axis" character and add no sequencing ahead of the placement acceptance
  (47S §8 matrix / §15).
- **Phase 47S kept gate #8 OPEN and MVP-2 OPEN** and all production / gate-#8 discharge / MVP-2 closure work blocked
  (47S §1 / §20).

This gate **takes the accepted D.1 checklist item as its corridor** and decides its Dixie-assessable conjunct (i) while
decomposing its externally-gated conjunct (ii) (§9 / §10); it does **not** re-accept the Phase 47R verdict, re-audit the
checklist, re-decompose the blocker, or extend the inventory. The mapping is exact: D.1's conjunct (i) is decided in §9,
D.1's conjunct (ii) is decomposed in §10, and D.1's overall satisfaction is assessed in §11.

---

## 6. D.1 predicate restatement — the two conjuncts

The Phase 47R §16 checklist states D.1 verbatim as:

> **D.1 Storage-adapter ownership / placement ACCEPTED** — Candidate D (or a successor) accepted as the production
> storage-adapter ownership/placement architecture for route-owned records (a docs/decision-only acceptance gate), and
> the canonical-store physical host (Straylight-process / Finn / Dixie-hosted adapter) selected with held sibling gates
> #9 / #10 resolved for the chosen host. [47R §8]

This is a **conjunction of two independently-owned obligations**, and the chain's discipline requires they be assessed
separately:

- **Conjunct (i) — route-owned-records architecture acceptance (Dixie-assessable).** "Candidate D (or a successor)
  accepted as the production storage-adapter ownership / placement architecture for route-owned records (a
  docs/decision-only acceptance gate)." The clause's own parenthetical — *"a docs/decision-only acceptance gate"* —
  scopes this conjunct as exactly the kind of **paper acceptance** a Dixie docs-only phase may perform. It has **no
  upstream Dixie predicate** (47S §15) and is the root of the Dixie-assessable chain. **This gate decides conjunct (i)**
  (§9).
- **Conjunct (ii) — canonical-store physical-host selection (externally gated).** "the canonical-store physical host
  (Straylight-process / Finn / Dixie-hosted adapter) selected with held sibling gates #9 / #10 resolved for the chosen
  host." Sibling gate **#9** (Finn runtime wiring) and sibling gate **#10** (Dixie boundary wiring) are **held**, each
  with its own trigger (46N §4.6); host selection **cannot** be performed by a Dixie docs-only phase. **This gate
  decomposes conjunct (ii)** and routes it to #9 / #10 (§10) — it **selects no host**.

**Consequence for satisfaction.** A conjunctive checklist item is satisfied only when **all** conjuncts hold. Conjunct
(i) is decided here at the docs/architecture level; conjunct (ii) remains externally gated and open. Therefore the full
**D.1 item is NOT YET SATISFIED** and its box is **NOT checked off** (§11). This is the load-bearing distinction of this
gate: it makes a real decision on conjunct (i) **without** claiming the full item is satisfied.

---

## 7. Candidate D recap (read-only)

Candidate D is read read-only from Phase 46M (PR #158) and Phase 46N (PR #159); nothing here re-decides 46M's selection
or re-clears 46N's prerequisite.

- **Candidate D = split storage** (46M §6). Two halves with distinct owners:
  - **Dixie route-side adapter (route-owned records).** A Dixie route-side durable adapter for the endpoint-local
    contract / idempotency / replay records, ingress references, and the public / private projection — shaped as a
    **swap-in of the canonical Straylight `StorageAdapter` interface**, **never a parallel canonical lifecycle** (46M
    §6.1 / §6.2; 46N §7).
  - **Canonical store (assertion / transition / receipt / audit).** The canonical `active` `Assertion`, the first-class
    `TransitionReceipt`, and the append-only hash-chained `AuditEvent` stay **Straylight-owned** through the
    `StorageAdapter` / `AuditLog` path; Dixie holds **ingress references only** and re-mints **no** receipt (46N §5 /
    §7; ADR-022D §1).
- **Canonical-store host + concrete substrate future-gated** (46M §6.4; 46N §11 row 1). The physical host
  (Straylight-process / Finn / a Dixie-hosted adapter) and the concrete substrate were left **unresolved** and governed
  by held sibling gates **#9 / #10**.
- **Status before this gate.** Phase 46M *selected* Candidate D as the placement *candidate*; Phase 46N *proposed* it as
  conjunct (a) of the paper-level gate-#8 clearing; Phase 47R / 47S recorded that the route-owned half is **proposed,
  not accepted as production architecture** (47R §8; 47S §8 D.1 row). **No phase before this one accepted Candidate D's
  route-owned-records placement as the production ownership / placement architecture.**

This gate's conjunct-(i) decision (§9) is therefore the *first* docs/architecture-level acceptance of Candidate D's
route-owned-records placement — and it is **only** that: a paper architecture acceptance, not an implementation, not a
freeze, not a host selection, and not a full-D.1 satisfaction.

---

## 8. Decision framework — a decision is not implementation, satisfaction, freeze, or discharge

Before deciding conjunct (i), this gate fixes what "decide D.1 ownership / placement" means and, critically, what it
does **not** mean. This is the discipline that keeps the decision honest.

**What a conjunct-(i) decision is.** It is a **Dixie-side paper architecture decision** that fixes *which component owns
route-owned-records storage at the architecture level* — here, a Dixie route-side adapter shaped as a `StorageAdapter`
swap-in. It is the docs/decision-only acceptance the D.1 conjunct-(i) clause itself contemplates ("a docs/decision-only
acceptance gate"). It changes **no** code, **no** route, **no** schema, and **no** gate state.

**What a conjunct-(i) decision is strictly NOT:**

- **It is not implementation.** Deciding *which component owns* route-owned-records storage does not write the adapter,
  add a store, change the route handler, author a migration, or open any connection. The production path stays
  byte-for-byte unchanged: `migrate.ts` (254 lines, no line 303–305), `copy-migrations.mjs` (62 lines), the startup
  `if (dbPool)` at `server.ts:303` with `await migrate(dbPool)` at `server.ts:305`, and `config.ts` `DATABASE_URL` at
  `config.ts:340` are all untouched (§13).
- **It is not full D.1 satisfaction.** D.1 also requires conjunct (ii) — the canonical-store host selected with #9 / #10
  resolved — which is externally gated and **open**. Deciding conjunct (i) leaves **D.1 NOT YET SATISFIED** (§11).
- **It is not an ADR update or freeze.** This is a *decision / decomposition* gate, not an ownership / placement ADR
  authoring, update, or freeze. A future ADR update is a *downstream* lane that becomes ripe only after this decision is
  accepted (§16 Option B; §18). `route_contract_final` stays false; `schema_final` stays false.
- **It is not a gate-#8 discharge.** Gate #8's operative discharge is Straylight-owned and held (D.13); deciding a Dixie
  architecture conjunct clears gate #8 **no further** than Phase 46N's paper-level prerequisite (§14).
- **It is not its own acceptance.** Consistent with the chain's pervasive design → acceptance discipline (e.g.,
  schema-design → schema-design *acceptance*; readiness assessment → readiness *acceptance*), a fresh decision is
  adjudicated by a **separate acceptance gate** before downstream corridors proceed. This gate's decision is routed to a
  Phase 47U D.1 ownership / placement decision *acceptance* gate (§18); it does **not** self-accept.

Because of this framing, the most this gate can do is **make a paper architecture decision on conjunct (i) and route it
for acceptance**; it can never implement, satisfy the full item, freeze, or discharge. It does exactly that — no more.

---

## 9. Conjunct (i) — route-owned-records ownership / placement decision

**Decision: ACCEPT Candidate D's split-storage placement as the docs/architecture-level production storage-adapter
ownership / placement architecture for route-owned records.**

Stated precisely, the accepted *paper architecture* is:

- **Owner of route-owned records.** A **Dixie route-side durable adapter** owns the endpoint-local **contract /
  idempotency / replay** records, the **ingress references**, and the **public / private projection** for the Admission
  Wedge route. These are the records Dixie legitimately owns at its ingress boundary; placing their durable adapter on
  the Dixie route side keeps ownership where the data originates.
- **Shape: a `StorageAdapter` swap-in, never a parallel canonical lifecycle.** The route-side adapter is shaped as a
  **swap-in of the canonical Straylight `StorageAdapter` interface** (46M §6.1 / §6.2; 46N §7). It does **not** define a
  second assertion / transition / receipt lifecycle, does **not** re-mint any canonical `TransitionReceipt`, and does
  **not** redefine any canonical primitive. Dixie holds **ingress references only** to canonical material (46N §5.1;
  ADR-022D §1).
- **Boundary with the canonical store.** The canonical `active` `Assertion`, the first-class `TransitionReceipt`, and the
  append-only hash-chained `AuditEvent` remain **Straylight-owned** through the `StorageAdapter` / `AuditLog` path
  (conjunct (ii); §10). The route-side adapter is the **route-owned-records half** of the split; it is not a canonical
  store and carries no canonical authority.

**Why ACCEPT (rather than defer or patch conjunct (i)).** The conjunct-(i) question — *which component owns
route-owned-records storage at the architecture level* — has a settled, well-grounded answer in the merged record:
Candidate D's split-storage route-side adapter (46M §6; 46N §7), repeatedly carried forward as the proposed placement
(47Q §8; 47R §8; 47S §8). It has **no upstream Dixie predicate** (47S §15), so nothing blocks deciding it. Deferring it
would stall the entire Dixie-assessable chain (D.2–D.12 all presuppose an accepted route-owned placement, 47S §15); a
patch is unwarranted because Candidate D's route-owned-records shape is internally consistent and invariant-preserving
(§12). The disciplined action is therefore to **accept conjunct (i) at the docs/architecture level** and route the
decision for acceptance.

**What this decision does NOT do.** It implements **no** adapter, writes **no** storage code, changes **no** route
handler or public response, authors **no** migration, selects **no** canonical-store host, freezes **no** ADR, satisfies
**no** full checklist item, and discharges **no** gate. It is a **paper architecture decision on conjunct (i) only**.

---

## 10. Conjunct (ii) — canonical-store physical-host decomposition (externally gated)

**Decomposition, not decision: the canonical-store physical host is NOT selected here.**

- **What stays Straylight-owned.** The canonical store — the `active` `Assertion`, the first-class `TransitionReceipt`,
  and the append-only hash-chained `AuditEvent` — remains **Straylight-owned** through the `StorageAdapter` / `AuditLog`
  path (46N §5; ADR-022D §1). This gate changes **no** canonical ownership.
- **What is externally gated.** The canonical-store **physical host** — Straylight-process, Finn, or a Dixie-hosted
  adapter — is governed by held sibling gates **#9** (Finn runtime wiring) and **#10** (Dixie boundary wiring), each held
  with its own trigger (46M §6.4; 46N §4.6 / §11 row 1). **No Dixie docs-only phase can resolve #9 / #10 or select the
  host.**
- **How conjunct (ii) sequences.** The host-selection question is routed to its owning gates: it becomes ripe only when
  sibling gates #9 / #10 are resolved per their own triggers and the chosen host's invariant-preservation evidence
  (D.2) is accepted under Straylight teammate review. Until then, conjunct (ii) is **EXTERNALLY GATED and UNSATISFIED**.

**What this decomposition does NOT do.** It selects **no** host, resolves **no** sibling gate (#9 / #10 stay held),
changes **no** canonical ownership, and authorizes **no** canonical-store work. It records that conjunct (ii) is
externally owned and routes it forward — nothing more.

---

## 11. D.1 satisfaction assessment

**The full D.1 checklist item is NOT YET SATISFIED; its box is NOT checked off.**

| D.1 conjunct | Owner | This gate's action | Status after Phase 47T |
|--------------|-------|--------------------|------------------------|
| **(i) Route-owned-records architecture acceptance** | Dixie-assessable (docs/decision) | **DECIDED** — Candidate D's split-storage route-side adapter accepted as the docs/architecture-level placement (§9) | **Decided at docs/architecture level; pending its own acceptance gate (Phase 47U)** |
| **(ii) Canonical-store physical-host selection (#9 / #10 resolved)** | Externally gated (sibling gates #9 / #10) | **DECOMPOSED, NOT decided** — routed to #9 / #10; no host selected (§10) | **EXTERNALLY GATED, UNSATISFIED** |
| **D.1 (full item = (i) ∧ (ii))** | Conjunctive | — | **NOT YET SATISFIED — box NOT checked off** |

**Assessment.** D.1's two conjuncts are jointly required. This gate **decides conjunct (i)** at the docs/architecture
level and **decomposes conjunct (ii)**, which stays externally gated by held sibling gates #9 / #10. A conjunctive item
with one conjunct open is **not** satisfied; moreover, the conjunct-(i) decision itself still awaits a separate
acceptance gate (Phase 47U; §18) before it is even an accepted Dixie-side decision. Therefore **the full D.1 checklist
item remains UNSATISFIED**, its box is **NOT checked off**, and D.1 still appears as an open precondition for the
downstream chain. **Deciding conjunct (i) advances D.1's Dixie-assessable root; it does not satisfy D.1.**

---

## 12. Invariants the decision preserves

The conjunct-(i) decision is constrained to preserve every invariant the chain carries; it introduces **no** new
canonical surface and weakens **no** guard.

- **Canonical ownership unchanged.** The `StorageAdapter` / `AuditLog` interface and the `Assertion`,
  `TransitionReceipt`, and `AuditEvent` primitives remain **Straylight-owned** (cross-repo references only); no Dixie
  redefinition, no parallel canonical lifecycle, no re-mint (46N §5.1; ADR-022D §1).
- **Swap-in, not fork.** The accepted route-side adapter is a **swap-in of the canonical `StorageAdapter` interface**, so
  any future implementation conforms to the canonical contract rather than diverging from it (46M §6.1).
- **ADR-022D invariants intact.** The canonical audit log stays append-only, hash-chained, and tamper-detectable via
  `verifyChain`; the six receipt categories (included / excluded / redacted / challenged / revoked / blocked-by-policy)
  are preserved; the MVP host re-mints no receipt (ADR-022D §1 / §3 / §4 / §5 / §7). Whether a future substrate preserves
  these is the **D.2** preservation-evidence obligation, still owed under Straylight review — **not** discharged here.
- **No-leak parity preserved.** The public response shape is unchanged and the runtime `no-leak.ts` ↔ route-vector
  validator **114 = 114** `FORBIDDEN_PUBLIC_KEYS` parity (46P / 46Q; `no-leak.ts` 286 lines) is untouched. Deciding an
  ownership architecture emits no canonical / consent / auth / signer / storage refs and requires no public-response
  change; the production no-leak serializer (D.12) remains owed before any durable runtime code emits such refs.
- **Scope guards intact.** The canonical 19-entry `DURABLE_WRITE_DENYLIST` at `scope-guards.test.ts:122-142` and the
  forbidden-import test at `:185` are unedited; the Phase 33N dev/operator-only, disabled-by-default spike surface
  (Storage Option A — no durable store) and its execution-gate seam (`index.ts:661` / `:700` gating the runner-only sink
  `index.ts:124` / `:568`) are unchanged.
- **Admission invariants carried forward.** A pending candidate is not recallable; a rejected candidate creates no
  admitted assertion; an accepted candidate creates / references an admitted assertion; a superseded assertion is
  excluded from ordinary recall unless explicitly requested / marked; a malformed / unsafe payload fails closed; missing
  / unauthorized auth fails closed and missing / invalid consent fails closed in any future production admission model;
  public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage material; user chat
  does not become memory merely because it was said; `active` remains the canonical assertion status (not a public
  `outcome_class`); `recall_eligible` remains derived / projection-only.

---

## 13. Production-authorization boundary

**No production authorization is implied or granted.** Deciding the conjunct-(i) ownership / placement architecture
authorizes **none** of the following — each remains exactly as blocked as before this gate:

- production DB execution; production `--apply`; production DB writes; production migration execution;
- durable production storage implementation; a production storage adapter; production migration files; executable
  production schema;
- startup wiring (`server.ts`; the only startup DB call stays `await migrate(dbPool)` inside `if (dbPool)` at
  `server.ts:303` / `:305`); config behavior changes (`config.ts`; `DATABASE_URL` at `config.ts:340`); package /
  lockfile changes;
- migration-runner (`migrate.ts`, 254 lines) / packager (`copy-migrations.mjs`, 62 lines) / scope-guard
  (`scope-guards.test.ts`, canonical 19-entry denylist `:122-142`) changes;
- route / API behavior changes; public response changes; raw candidate payload persistence;
- production auth / consent implementation; production signer / authority implementation; tenant / estate / actor
  production identity implementation;
- Freeside runtime / client integration; Lane-2 canonical Straylight-store migrations implementation; canonical-store
  physical-host selection.

**Assessment.** Deciding *which component owns route-owned-records storage at the architecture level* is the **opposite**
of authorizing the work that ownership gates. The decision records a paper architecture; it grants **no** production
right, makes **no** claim that `aw_*` SQL is production-safe or production-ready, and changes **no** production-path
file. **All production work remains BLOCKED** (§19). The accepted Phase 47A `.json` Mode 2 path remains the **live
fallback**, unchanged.

---

## 14. Gate #8 / MVP-2 closure boundary

**Gate #8 REMAINS OPEN; MVP-2 REMAINS OPEN.** Deciding the conjunct-(i) ownership / placement architecture touches
neither boundary:

- **Gate #8.** Phase 46N cleared gate #8 **only** as a documentation / architecture / handoff prerequisite (conjunct (a)
  Candidate D proposed; conjunct (b) sibling handoff packet cited; conjunct (c) ADR-022D invariants preserved). This gate
  clears it **no further**. The operative Straylight-side discharge — the gate-table preamble pathway (trigger satisfied
  **and** a separate ADR or sibling-repo PR under Straylight teammate review explicitly citing the trigger), with sibling
  gates #9 / #10 / #11 / #12 / #15 / #20 each resolved per their own trigger (46N §4.6 / §4.7) — is checklist item
  **D.13** and remains **UNSATISFIED**, externally owned, and **held**. **Gate #8 REMAINS OPEN.**
- **MVP-2.** MVP-2 closure is checklist item **D.14**, the *further, separate* terminal gate downstream of D.1–D.13 and
  the operative discharge (47R §7 row 13 / §16; 47S §13). This gate does **not** close MVP-2, does **not** select an
  MVP-2 closure lane, and asserts **no** condition that would make closure selectable. **MVP-2 REMAINS OPEN.**

Deciding a single conjunct of the first Dixie-assessable checklist item, by construction, cannot move gate #8 toward
discharge or MVP-2 toward closure; it records a paper architecture decision and leaves both boundaries exactly where
Phase 47S left them.

---

## 15. D.2–D.14 status summary

Deciding D.1 conjunct (i) **advances the Dixie-assessable root** but **satisfies no other checklist item**. Every item
below remains **UNSATISFIED**. The "Effect of the D.1 conjunct-(i) decision" column records only how the decision changes
each item's *upstream readiness*, never its satisfaction.

| Item | Status after Phase 47T | Effect of the D.1 conjunct-(i) decision |
|------|------------------------|-----------------------------------------|
| **D.1** | **NOT YET SATISFIED** | Conjunct (i) decided at docs/architecture level (§9); conjunct (ii) externally gated by #9 / #10 (§10); full item open (§11) |
| **D.2 Canonical invariant-preservation evidence** | **UNSATISFIED** | Owner stays Straylight; preservation *evidence* still owed under Straylight review; not advanced beyond readiness |
| **D.3 Migration-file ownership** | **UNSATISFIED** | Presupposes accepted placement; canonical side stays a separate Straylight ADR + sibling-repo PR; no migration authored |
| **D.4 Migration-execution ownership + least-privilege** | **UNSATISFIED** | Production migration path unchanged; no execution owner decided; only bounded non-production Lane-1 evidence exists |
| **D.5 Runtime route storage-call owner** | **UNSATISFIED** | Route handler unchanged; only the Phase 33N disabled-by-default spike (Storage Option A) authorized |
| **D.6 Lane-1 ≠ Lane-2 boundary** | **UNSATISFIED** (preservation discipline) | Boundary preserved; Lane-1 proof is never read as production-safe or as pre-authorizing Lane-2 |
| **D.7 Production DB write preconditions** | **UNSATISFIED** | Blocked behind least-privilege evidence + accepted schema/migration + production no-leak serializer + operative discharge |
| **D.8 Route / API behavior-change authorization** | **UNSATISFIED** | No route / API change authorized; storage + auth + identity + route-contract pre-freeze still owed |
| **D.9 Freeside integration sequencing** | **UNSATISFIED** | Last surface; gate #11 held; no Freeside wiring authorized |
| **D.10 Auth / consent / signer / authority durable attachment** | **UNSATISFIED** | Storage-dependent (P2); durable attachment home depends on the storage model being accepted first |
| **D.11 Tenant / estate / actor identity binding** | **UNSATISFIED** | Auth-dependent (P2); downstream of D.10 |
| **D.12 Production no-leak serializer + runtime fixtures** | **UNSATISFIED** | 114 = 114 parity preserved; production serializer still owed before durable runtime code emits canonical / consent refs |
| **D.13 Operative Straylight-side discharge** | **UNSATISFIED (externally owned, held)** | Not satisfiable by any Dixie phase; gate-table preamble pathway under Straylight teammate review |
| **D.14 MVP-2 closure terminal gate** | **UNSATISFIED (terminal, downstream)** | Presupposes D.1–D.13 satisfied + operative discharge completed; not selectable now |

**Summary.** D.2–D.14 are **all UNSATISFIED**. The D.1 conjunct-(i) decision establishes the architecture root the
downstream Dixie-assessable items presuppose, but it satisfies **none** of them — each still owes its own decision,
acceptance, or evidence, D.13 stays externally owned, and D.14 stays terminal. **No box other than D.1's conjunct-(i)
*decision* is even moved, and even D.1's full box stays unchecked.**

---

## 16. Decision options

Phase 47T weighs five options for the disposition of the D.1 storage-adapter ownership / placement predicate:

### Option A — DECIDE conjunct (i) (ACCEPT Candidate D for route-owned records), DECOMPOSE conjunct (ii), and SELECT a D.1 decision *acceptance* gate next. **SELECTED.**

**Selected** because conjunct (i) — *which component owns route-owned-records storage at the architecture level* — has a
settled, well-grounded answer in the merged record (Candidate D's split-storage route-side adapter as a `StorageAdapter`
swap-in; 46M §6, 46N §7, carried through 47Q–47S), has **no upstream Dixie predicate** (47S §15), and preserves every
invariant (§12), so the disciplined action is to **decide it at the docs/architecture level**. Conjunct (ii) is
externally gated by held sibling gates #9 / #10 and is **decomposed**, not decided (§10). Consistent with the chain's
design → acceptance discipline, the fresh decision is routed to a **separate, strictly docs/decision-only Phase 47U D.1
ownership / placement decision *acceptance* gate** (§18). Option A satisfies **no** full checklist item, freezes **no**
ADR, implements **no** storage, discharges **no** gate, and closes **no** MVP-2; it makes a paper architecture decision
on conjunct (i) and routes it for acceptance.

### Option B — UPDATE / FREEZE a storage-adapter ownership / placement ADR now. **Not selected.**

**Not selected.** An ADR update / freeze is **premature**: D.1 is a *decision / decomposition* gate, not an ADR freeze;
the placement decision must be **decided and then accepted** (Phase 47U) before any ADR update is ripe, and conjunct (ii)
(the canonical-store host) is still externally gated. Phase 47Q §16 / 47R §17 already scoped the ownership / placement
ADR update as the *downstream* successor that becomes ripe only after the decision is accepted. Option B is held as the
non-selected, downstream-ordered alternative.

### Option C — DEFER the D.1 decision pending a reconciliation / prerequisite gate. **Not selected.**

**Not selected.** Deferral would be correct only if conjunct (i) had an unresolved upstream Dixie predicate or an
internal inconsistency requiring reconciliation first. Neither holds: conjunct (i) is the **genuine root** of the
Dixie-assessable chain with no upstream Dixie predicate (47S §15), and Candidate D's route-owned-records shape is
internally consistent and invariant-preserving (§7 / §12). Deferring would stall every downstream Dixie-assessable item
(D.2–D.12 presuppose accepted placement, 47S §15) for no decision-theoretic gain. Option C is held as the non-selected
alternative.

### Option D — AUTHORIZE production durable-store / adapter implementation now. **REJECTED.**

**Rejected.** Implementation authorization is unsupported: gate #8's operative discharge is held (D.13), conjunct (ii)
(canonical-store host) is externally gated, the production no-leak serializer is owed (D.12), no schema / migration is
accepted (D.3), and no production-grade least-privilege execution evidence exists (D.4). Authorizing implementation now
would skip every readiness rung the chain requires and would contradict the still-NOT-YET-READY gate-#8 verdict (47R / 47S).
Option D is rejected; durable-store / adapter implementation and all production work **remain BLOCKED**.

### Option E — DISCHARGE ADR-022E gate #8 now. **REJECTED.**

**Rejected**, and strongly so. Gate #8's operative discharge is **Straylight-owned** and requires the preamble's
separate-ADR / sibling-repo-PR-under-Straylight-teammate-review pathway (46N §4.7; D.13); a Dixie docs-only phase cannot
discharge it. The full D.1 item is **not** satisfied, D.2–D.14 are **all** unsatisfied, and sibling gates #9 / #10 / #11
/ #12 / #15 / #20 are held. This gate discharges **nothing**; **gate #8 REMAINS OPEN**.

**Conclusion.** Decision-structure **Option A**: decide D.1 conjunct (i) (accept Candidate D's split-storage placement
for route-owned records at the docs/architecture level; §9); decompose conjunct (ii) and route it to held sibling gates
#9 / #10 (§10); record the full D.1 item as **NOT YET SATISFIED** (§11); keep Phase 47T docs/decision-only; preserve
every invariant (§12); reject Options D and E; hold Options B / C as the non-selected, downstream-ordered alternatives.

---

## 17. Why a D.1 decision *acceptance* gate is next

With D.1 conjunct (i) **decided** at the docs/architecture level (§9), the disciplined next rung — following the chain's
pervasive design → acceptance pattern (schema-design gate → schema-design *acceptance* gate; readiness assessment →
readiness *acceptance* gate; isolation spike → isolation-spike *acceptance* gate) — is a **separate, strictly
docs/decision-only D.1 ownership / placement decision *acceptance* gate** that ACCEPTS or PATCHES this conjunct-(i)
decision before any downstream corridor (D.2 onward) proceeds. A fresh decision is **not** self-accepted; it is
adjudicated by an independent acceptance gate that checks the decision is correctly bounded (paper architecture only),
faithfully grounded (Candidate D / ADR-022D), invariant-preserving, and free of overclaim — exactly as Phase 47S
adjudicated Phase 47R.

Selecting the acceptance gate (rather than jumping to D.2, an ADR freeze, or implementation) keeps the chain's
decompose → decide → accept rhythm intact and ensures the conjunct-(i) decision is ratified before D.2's
invariant-preservation-evidence corridor — which presupposes an *accepted* placement architecture — is opened.

---

## 18. Selected next lane

> **Selected next lane: Phase 47U — Admission Wedge ADR-022E gate #8 D.1 storage-adapter ownership / placement decision
> *acceptance* gate** (a *separate*, strictly docs / decision-only gate that ACCEPTS — or PATCHES — this Phase 47T D.1
> conjunct-(i) decision (accept Candidate D's split-storage placement for route-owned records at the docs/architecture
> level) as a correctly-bounded, faithfully-grounded, invariant-preserving paper architecture decision, while confirming
> conjunct (ii) stays externally gated by held sibling gates #9 / #10 and the full D.1 item stays NOT YET SATISFIED —
> **NOT** a production implementation, **NOT** a durable-store lane, **NOT** a storage-adapter ownership / placement ADR
> update or freeze, **NOT** a canonical-store host selection, **NOT** a migration, **NOT** a route / API behavior change,
> **NOT** a Freeside integration, **NOT** the gate-#8 discharge, and **NOT** the MVP-2 closure itself).

Phase 47U **must be strictly docs / decision-only**. It must **not** produce evidence, run any role / grant test, enable
production `--apply`, inject any sink, open any connection, change any production-path file, implement a durable store or
storage adapter, write a production migration, select the canonical-store host, resolve any held sibling gate, change
route / API behavior, integrate Freeside, update or freeze any ownership / placement ADR, freeze any contract / schema,
discharge ADR-022E gate #8 or any Straylight-side gate, satisfy any D.1–D.14 item, or close MVP-2. It **accepts or
patches** the Phase 47T conjunct-(i) decision so that, once accepted, the downstream items (D.2 onward) can proceed in
dependency order. Whether gate #8 can ever be discharged is a *further, separate* event that requires Straylight teammate
review per the preamble (46N §4.7; D.13); whether MVP-2 can ever close is a *further, separate* terminal gate downstream
of the full checklist and the operative discharge (D.14).

**Not selected as the next lane:** a storage-adapter ownership / placement ADR *update / freeze* (premature — the
decision must be accepted first, §16 Option B); a D.2 canonical invariant-preservation-evidence gate (downstream — it
presupposes an *accepted* placement, so it follows the Phase 47U acceptance); a Lane-2 canonical Straylight-store
migration / schema alignment gate (downstream of the gate-#8 boundary, 47R §12 / §17); production durable-store /
adapter implementation authorization (rejected, §16 Option D); a gate-#8 discharge (rejected; Straylight-owned and held,
§16 Option E); a canonical-store host selection (externally gated by #9 / #10, §10). Each remains a *future, separate*
docs/decision lane in dependency order; none is opened, implemented, updated, authorized, or discharged here.

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

## 19. Non-goals and blocked work

Phase 47T explicitly does **none** of the following — each remains exactly as blocked / deferred as before this gate:

- It does not produce evidence, run a role / grant test, open a DB connection, run forward or cleanup SQL, or invoke
  `psql` / Docker / Postgres.
- It does not enable production `--apply`, inject a DB client / sink, perform a DB write, or execute a migration.
- It does not implement durable production storage, a production storage adapter, a production migration file, or an
  executable production schema.
- It does not update or freeze any storage-adapter ownership / placement ADR.
- It does not select the canonical-store physical host or resolve any held sibling gate (#9 / #10 / #11 / #12 / #15 /
  #20 stay held).
- It does not change any migration runner / packager / startup / config / scope-guard / route handler / route-vector /
  validator / fixture / package / lockfile / CI file.
- It does not implement auth, consent, signer, authority, or tenant / estate / actor identity binding.
- It does not change route / API behavior, expand the public response, or persist any raw candidate payload.
- It does not freeze the route contract or the final schema.
- It does not satisfy, check off, or discharge any D.1–D.14 checklist item; it **decides D.1 conjunct (i)** as a paper
  architecture decision (pending its own acceptance gate) and **decomposes D.1 conjunct (ii)** — it satisfies **no** full
  item.
- It does not conclude that gate #8 is ready for discharge, it does not discharge ADR-022E gate #8 (operatively or
  otherwise) or any Straylight-side gate, and it clears gate #8 no further than Phase 46N's documentation / architecture
  / handoff prerequisite.
- It does not authorize Freeside integration or Lane-2 canonical Straylight-store migrations.
- It does not authorize production migration execution / runner / startup wiring or any config behavior change.
- **It does not close MVP-2** and makes **no** claim that `aw_*` SQL is production-safe or production-ready.
- It does not touch any adjacent repository.

All production work — production DB execution, production `--apply`, production DB writes, production migration execution,
durable production storage implementation, the production storage adapter, the storage-adapter ownership / placement ADR
update / freeze, the canonical-store physical-host selection, Lane-2 canonical Straylight-store migrations, production
auth / consent / signer / authority, tenant / estate / actor identity binding, route / API behavior change,
public-response expansion, raw-payload persistence, Freeside runtime / client integration, ADR-022E gate #8 discharge,
the route-contract freeze, the final-schema freeze, and MVP-2 closure — **remains BLOCKED**.

---

## 20. Codex audit checklist

This checklist audits **this Phase 47T PR** — the docs-only ADR-022E gate #8 D.1 storage-adapter ownership / placement
decision gate. Every item must be ACCEPT; any REJECT blocks acceptance of this Phase 47T PR.

```text
PHASE 47T — ADR-022E GATE #8 D.1 STORAGE-ADAPTER OWNERSHIP / PLACEMENT DECISION GATE
CODEX AUDIT CHECKLIST
(docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47T PR)

[ ] 1.  Scope is docs-only — Phase 47T adds only this document plus a single minimal §22 forward-traceability status note
        (in the Phase 47S ADR-022E gate #8 clearing-readiness acceptance gate); it modifies no runtime source, and
        specifically not migrate.ts, copy-migrations.mjs, any *.sql, the experimental SQL / manifest / planner
        (aw-sql-isolation-spike/*) / runner, no-leak.ts, aw-sql-execution-sink-spike.test.ts, the three extended Phase
        47F test files, config.ts, server.ts, or scope-guards.test.ts.
[ ] 2.  No runtime/source/test/config/package/CI/SQL/migration/vector/validator/fixture changes — no route handler,
        store/storage code, DB code, migration runner, packaging/copy runner, planner, runner, auth, consent, server-boot,
        unit/integration test, scope-guard test, isolation test, fixture, route-vector JSON, route-vector validator,
        route-vector README, config.ts, env gate, package.json, lockfile, .github/ CI, .sql, aw_* schema, executable
        schema, migration file, or migration directory is added/modified.
[ ] 3.  Phase 47T produces NO evidence and runs nothing — the gate creates no disposable database, no role, no grant,
        runs no privilege/role/grant test, runs no forward or cleanup SQL under any role, opens no connection, and invokes
        no psql / Docker / Postgres; it decides one conjunct of an already-merged checklist item and selects a next
        docs/decision-only lane (§1/§2).
[ ] 4.  Phase 47S intake is faithful (§5) — Phase 47S accepted the Phase 47R NOT-YET-READY verdict and the D.1-D.14
        checklist (Option A; all ten AC MET), satisfied no item, selected this Phase 47T D.1 decision gate as the first
        dependency-ordered Dixie-assessable corridor, and kept gate #8 and MVP-2 OPEN; restated read-only, not extended.
[ ] 5.  D.1 is correctly restated as a two-conjunct item (§6) — conjunct (i) route-owned-records architecture acceptance
        (Dixie-assessable, "a docs/decision-only acceptance gate", no upstream Dixie predicate) AND conjunct (ii)
        canonical-store physical-host selection with held sibling gates #9/#10 resolved (externally gated); full item =
        (i) AND (ii).
[ ] 6.  Conjunct (i) decision is bounded (§9) — ACCEPT Candidate D's split-storage route-side adapter as the
        docs/architecture-level production storage-adapter ownership/placement architecture for route-owned records,
        shaped as a StorageAdapter swap-in, never a parallel canonical lifecycle; a PAPER architecture decision only — no
        adapter implemented, no route changed, no migration authored, no host selected, no ADR frozen.
[ ] 7.  Conjunct (ii) is decomposed, NOT decided (§10) — canonical store stays Straylight-owned; the physical host
        (Straylight-process / Finn / Dixie-hosted adapter) is NOT selected; it stays externally gated by held sibling
        gates #9/#10 and is routed to them; no sibling gate is resolved.
[ ] 8.  Full D.1 item is NOT YET SATISFIED (§11) — conjunctive item with conjunct (ii) open is not satisfied; the D.1 box
        is NOT checked off; the conjunct-(i) decision itself still awaits a separate acceptance gate (Phase 47U).
[ ] 9.  Decision-vs-implementation/satisfaction/freeze/discharge distinction preserved everywhere (§8) — deciding conjunct
        (i) is a paper architecture decision; it is NOT implementation, NOT full D.1 satisfaction, NOT an ADR update/freeze,
        NOT a gate-#8 discharge, and NOT self-accepting.
[ ] 10. Invariants preserved (§12) — canonical ownership unchanged (Straylight); swap-in not fork; ADR-022D append-only /
        hash-chained / verifyChain + six receipt categories + no re-mint intact; no-leak 114=114 parity untouched; 19-entry
        denylist :122-142 and forbidden-import :185 unedited; admission invariants carried forward.
[ ] 11. Production authorization boundary preserved (§13) — no production DB execution / --apply / writes / migration
        execution; no durable storage / adapter / migration files; no startup/config/package change; no route/API/public
        change; no auth/consent/signer/identity implementation; no Freeside / Lane-2; no canonical-store host selection;
        no aw_* SQL production-safe claim.
[ ] 12. Gate #8 / MVP-2 boundary preserved (§14) — Phase 46N paper-level clearing only; operative Straylight-side discharge
        held (D.13); sibling gates #9/#10/#11/#12/#15/#20 held; gate #8 cleared no further; MVP-2 closure is the terminal
        D.14 gate; gate #8 and MVP-2 REMAIN OPEN.
[ ] 13. D.2-D.14 status summary is complete and all UNSATISFIED (§15) — every item D.2-D.14 listed and marked UNSATISFIED;
        the D.1 conjunct-(i) decision advances only the architecture root and satisfies no other item; D.13 externally
        owned/held; D.14 terminal/downstream.
[ ] 14. Decision options complete and correctly disposed (§16) — Option A (decide conjunct (i) + decompose conjunct (ii) +
        select D.1 decision acceptance gate) SELECTED; Option B (ADR update/freeze) not selected (premature); Option C
        (defer) not selected (D.1 is the root, no upstream predicate); Option D (authorize implementation) REJECTED;
        Option E (discharge gate #8 now) REJECTED (Straylight-owned, held; gate #8 REMAINS OPEN).
[ ] 15. Next lane is correct (§17/§18) — Phase 47U, a STRICTLY docs/decision-only D.1 ownership/placement decision
        ACCEPTANCE gate; explicitly NOT production implementation, NOT a durable-store lane, NOT an ADR update/freeze, NOT
        a host selection, NOT a migration, NOT a route/API change, NOT Freeside, NOT the gate-#8 discharge, and NOT the
        MVP-2 closure; justified by the design->acceptance discipline.
[ ] 16. Verdict wording is bounded (§1) — "DECIDE D.1 — ACCEPT CANDIDATE D ... FOR ROUTE-OWNED RECORDS (conjunct (i));
        DECOMPOSE ... CONJUNCT (ii) ... #9/#10; FULL D.1 ITEM NOT YET SATISFIED; GATE #8 REMAINS OPEN; MVP-2 REMAINS OPEN";
        no unbounded "production-safe", "production ready", "MVP-2 closed", "gate #8 discharged", "gate #8 cleared",
        "gate #8 ready", "durable storage implemented", "ownership ADR updated/frozen", "D.1 satisfied/complete", or
        "checklist satisfied" claim anywhere; deciding conjunct (i) is distinguished from satisfying D.1.
[ ] 17. No production overclaim — no production-readiness, production-safe, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, ADR-022E-gate-#8-cleared(beyond-46N), gate-#8-ready, production-DB-write, production-
        migration-execution, durable-production-storage, storage-adapter-implementation, ownership-ADR-update/freeze,
        canonical-store-host-selected, Freeside-runtime, Lane-2-canonical, production-auth/consent/signer/identity,
        D.1-satisfied, checklist-satisfied, or MVP-2-closed claim; every such reference is negated / blocked / a non-goal /
        a future requirement (§8-§19).
[ ] 18. No bad citation regression — no migrate.ts:303-305 citation (migrate.ts is 254 lines); the conditional startup
        migrate is cited as server.ts:303 (if (dbPool)) / server.ts:305 (await migrate(dbPool)); the canonical scope-guard
        denylist is the 19-entry scope-guards.test.ts:122-142 (forbidden-import test :185, file 364 lines); the
        execution-gate seam is index.ts:661/700 with injected sink interface index.ts:124, applyIsolationSpikePlan
        index.ts:568, SYNTHETIC_REF_MAX_LENGTH=80 index.ts:718 (index.ts 914 lines); config.ts DATABASE_URL at
        config.ts:340 (config.ts 485 lines); runner 498 lines; copy-migrations.mjs 62 lines; no-leak.ts 114-key parity,
        286 lines; server.ts 773 lines.
[ ] 19. Forward-traceability note is minimal and evidence-bound (§22) — the single added note (in the Phase 47S
        clearing-readiness acceptance gate) records only that Phase 47T decided D.1 conjunct (i) (accept Candidate D for
        route-owned records at the docs/architecture level), decomposed conjunct (ii) to held sibling gates #9/#10, left
        the full D.1 item NOT YET SATISFIED, selected the Phase 47U D.1 decision acceptance gate (Option A), produced no
        evidence, satisfied no full checklist item, and kept gate-#8 discharge / production / MVP-2 closure work blocked;
        the note claims no production safety, gate-#8 readiness, gate-#8 discharge, D.1 satisfaction, or MVP-2 closure.
[ ] 20. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5 (no sixth
        vector); self-check 44/44; git diff --check and git diff --cached --check clean; nothing staged (§21).
[ ] 21. No adjacent-repo changes — no file in loa-straylight, freeside-characters, or any adjacent/sibling repo was
        created or modified by Phase 47T.
[ ] 22. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp / temp,
        __pycache__, .pyc, dist, build, or .claude artifact appears in the Phase 47T working tree.
[ ] 23. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the Claude Code memory
        store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
[ ] 24. Section headings are well-formed and single-occurrence — each numbered section heading (## 1. … ## 23.) appears
        exactly once; no duplicated heading; no pasted terminal-report fragment; every Markdown table row is well-formed;
        the triple-backtick count is even; no fenced block is an executable migration or runnable schema.
[ ] 25. The gate is honest about what it does and does not do — it DECIDES D.1 conjunct (i) (accept Candidate D's
        split-storage placement for route-owned records at the docs/architecture level), DECOMPOSES D.1 conjunct (ii) to
        held sibling gates #9/#10, leaves the full D.1 item NOT YET SATISFIED, and SELECTS a next docs/decision-only D.1
        decision acceptance lane ONLY; it authorizes no production work, discharges no gate, satisfies no full checklist
        item, selects no canonical-store host, concludes no readiness-for-discharge, clears gate #8 no further, updates or
        freezes no ownership ADR, freezes nothing, implements no storage, and closes no MVP-2; gate #8 and MVP-2 REMAIN
        OPEN (§1 / §9 / §10 / §11 / §14 / §16 / §18 / §19).
```

---

## 21. Validation record

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47T is
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
git diff --name-only HEAD -- app package.json package-lock.json app/package.json app/package-lock.json .github
git ls-files --others --exclude-standard
git status --short --untracked-files=all | grep -iE 'MEMORY|memory|grimoire|__pycache__|\.pyc|generated|tmp|temp|\.claude|dist|build'
# Adjacent-repo reference scan (interpret: cross-repo mentions in prose are fine; no adjacent file is touched):
grep -RInE 'loa-straylight|freeside-characters' docs app package.json package-lock.json .github 2>/dev/null || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-GATE.md
```

**Recorded results for this lane** (run during authoring):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-GATE.md` is added, plus the single minimal
  forward-traceability status note (§22) in the Phase 47S ADR-022E gate #8 clearing-readiness acceptance gate; no runtime
  source (and specifically not `migrate.ts`, `copy-migrations.mjs`, any `*.sql`, the experimental SQL / manifest /
  planner / runner, `no-leak.ts`, the `aw-sql-execution-sink-spike.test.ts`, the three extended Phase 47F test files,
  `config.ts`, `server.ts`, or `scope-guards.test.ts`), no runtime test, no route-vector JSON, validator, README,
  fixture, fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, SQL, executable
  schema, or generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0 failures**;
  the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**; the
  `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail closed; 2 exact-key
  non-over-match guards stay clean);
- **diff checks clean** — `git diff --check` and `git diff --cached --check` report no whitespace / conflict-marker
  errors; nothing is staged;
- **docs-only scope checks** — the `app package.json … .github` diff is empty; the only additions are this document and
  the Phase 47S acceptance gate's single forward-traceability note; the memory/generated/temp scan matches nothing under
  the working tree from this phase;
- **adjacent-repo reference scan** — any `loa-straylight` / `freeside-characters` matches are prose-only and no
  adjacent-repo file is created or modified;
- **overclaim scan** — every match is a **negated / blocked / non-goal / bounded** reference (e.g. "GATE #8 REMAINS
  OPEN", "the full D.1 checklist item remains NOT YET SATISFIED", "deciding conjunct (i) is categorically distinct from
  satisfying D.1", "does not discharge ADR-022E gate #8", "clears gate #8 no further than Phase 46N's documentation /
  architecture / handoff prerequisite", "operative Straylight-side discharge remains held", "selects no host",
  "route-contract freeze … blocked", "final-schema freeze … blocked", "Lane-2 canonical … blocked", "Freeside runtime /
  client integration … blocked", "makes no claim that `aw_*` SQL is production-safe", "durable production storage …
  blocked", "does not close MVP-2", and every "accept" / "decide" is qualified to the *docs/architecture-level* decision
  on conjunct (i), never implementation, full-checklist-satisfaction, ADR freeze, host selection, or discharge); there is
  **no** positive present-tense production authorization or safety claim, **no** claim that gate #8 is ready or
  discharged or cleared beyond the 46N prerequisite, **no** claim that the full D.1 item or any D.2–D.14 item is
  satisfied, and **no** claim that MVP-2 is closed or that `aw_*` SQL is production-safe;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–23 exactly once each.

**Forward-traceability status note added (§22 scope):** the Phase 47S ADR-022E gate #8 clearing-readiness acceptance
gate (which named this Phase 47T gate) gains a single bounded additive Phase 47T note (per §22).

**Corruption / duplicate guard** (carried from the 46I–47S precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 23.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §20 Codex audit
  checklist (a `text` block) and the §21 validation command list (a `bash` block). **No fenced block is an executable
  migration or runnable schema.**

---

## 22. Forward-traceability notes

Phase 47T adds exactly **one** minimal forward-traceability status note, in the Phase 47S ADR-022E gate #8
clearing-readiness acceptance gate that named this Phase 47T gate. The note is bounded and additive; it claims **no**
production safety, **no** gate-#8 readiness, **no** gate-#8 discharge, **no** full-D.1 or D.2–D.14 satisfaction, and
**no** MVP-2 closure.

- `docs/ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-ACCEPTANCE-GATE.md` — a bounded additive Phase 47T
  forward-traceability status note recording that the D.1 storage-adapter ownership / placement decision gate Phase 47S
  selected (its §15) has run: it **decided D.1 conjunct (i)** (accepting Candidate D's split-storage route-side adapter
  as the docs/architecture-level production storage-adapter ownership / placement architecture for route-owned records,
  a paper architecture decision only), **decomposed D.1 conjunct (ii)** (routing the canonical-store physical-host
  selection to held sibling gates #9 / #10, selecting no host), left the **full D.1 checklist item NOT YET SATISFIED**
  (box not checked off), **selected the next lane as a strictly docs/decision-only Phase 47U ADR-022E gate #8 D.1
  storage-adapter ownership / placement decision *acceptance* gate** (Option A), **produced no evidence**, **satisfied no
  full checklist item**, **discharged no gate**, **cleared gate #8 no further** than Phase 46N's documentation /
  architecture / handoff prerequisite, and **authorized no production work** — keeping **gate #8 OPEN** and **MVP-2
  OPEN** and all production / gate-#8 discharge / MVP-2 closure work blocked.

> **Phase 47U status note (forward traceability; added by the Phase 47U ADR-022E gate #8 D.1 storage-adapter ownership /
> placement decision *acceptance* gate).** The next lane this gate selected (§18) has run:
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-ACCEPTANCE-GATE.md)
> (strictly docs/decision-only; **produced no evidence**; Verdict / **Option A — ACCEPT** the Phase 47T D.1 conjunct-(i)
> decision). It **accepted** this Phase 47T **D.1 conjunct-(i) decision** — accept Candidate D's split-storage route-side
> adapter as the docs/architecture-level production storage-adapter ownership / placement architecture for route-owned
> records (a paper architecture decision only, shaped as a `StorageAdapter` swap-in, never a parallel canonical
> lifecycle) — as correctly-bounded, faithfully-grounded, and invariant-preserving (all ten acceptance criteria MET), and
> **confirmed D.1 conjunct (ii)** (the canonical-store physical host) stays **externally gated by held sibling gates #9 /
> #10** with **no host selected**. Because conjunct (ii) stays externally gated, Phase 47U left the **full D.1 checklist
> item NOT YET SATISFIED** (box not checked off) and **D.2–D.14 all UNSATISFIED**; it **satisfied no full checklist
> item**, **discharged no gate**, **cleared gate #8 no further** than Phase 46N's documentation / architecture / handoff
> prerequisite, **updated or froze no ownership / placement ADR**, **selected no canonical-store host**, **authorized no
> production work**, and **selected the next lane as a strictly docs/decision-only Phase 47V — Admission Wedge ADR-022E
> gate #8 D.1 canonical-store physical-host dependency gate**. **Gate #8 and MVP-2 remain OPEN** and all production /
> gate-#8 discharge / MVP-2 closure work stays blocked.

No other file is modified.

---

## 23. Final decision statement

**DECIDE D.1 CONJUNCT (i) — ACCEPT (Option A).** Phase 47T **decides** the first dependency-ordered Dixie-assessable
checklist corridor by **accepting Candidate D's split-storage placement** as the docs/architecture-level production
storage-adapter ownership / placement architecture for **route-owned records** (D.1 conjunct (i)): a Dixie route-side
durable adapter for the endpoint-local contract / idempotency / replay records, ingress references, and public / private
projection, shaped as a **swap-in of the canonical Straylight `StorageAdapter` interface** and **never a parallel
canonical lifecycle** (§9). It **decomposes** D.1 conjunct (ii) — the canonical-store physical-host selection — routing
it to held sibling gates **#9 / #10**, which it does **not** resolve and for which it selects **no** host (§10).

**Because conjunct (ii) remains externally gated and the conjunct-(i) decision itself awaits its own acceptance gate, the
full D.1 checklist item remains NOT YET SATISFIED — its box is NOT checked off — and D.2–D.14 all remain UNSATISFIED**
(§11 / §15). **Deciding conjunct (i) is a paper architecture decision only:** it implements no adapter, writes no storage
code, changes no route, authors no migration, selects no host, freezes no ADR, satisfies no full checklist item, and
discharges no gate. Options D (authorize implementation now) and E (discharge gate #8 now) are **REJECTED**; Options B
(ADR update / freeze) and C (defer) are **not selected** as premature / unwarranted, held as downstream-ordered
alternatives. The selected next lane is the strictly docs/decision-only **Phase 47U — Admission Wedge ADR-022E gate #8
D.1 storage-adapter ownership / placement decision *acceptance* gate** (§18).

**Gate #8 REMAINS OPEN. MVP-2 REMAINS OPEN. All production work remains BLOCKED.**
