# Phase 47U — Admission Wedge ADR-022E gate #8 D.1 storage-adapter ownership / placement decision acceptance gate

> **Phase**: 47U
> **Branch context**: `phase-47u-adr022e-gate8-d1-placement-acceptance`
> **Related**: Phase 47T (PR #191, commit `488ce1c9`,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-GATE.md))
> **decided D.1 conjunct (i)** — it **accepted Candidate D / split storage** as the docs/architecture-level production
> storage-adapter ownership / placement architecture for **route-owned records** (a Dixie route-side durable adapter for
> the endpoint-local contract / idempotency / replay records, ingress references, and the public / private projection,
> shaped as a **swap-in of the canonical Straylight `StorageAdapter` interface** and **never a parallel canonical
> lifecycle**), **decomposed D.1 conjunct (ii)** (routing the canonical-store physical-host selection to held sibling
> gates **#9 / #10**, selecting **no** host), left the **full D.1 checklist item NOT YET SATISFIED** (box not checked
> off), kept **D.2–D.14 all UNSATISFIED**, produced **no** evidence, satisfied **no** full checklist item, discharged
> **no** gate, cleared gate #8 **no further** than Phase 46N's documentation / architecture / handoff prerequisite,
> updated or froze **no** ownership / placement ADR, authorized **no** production work, kept **gate #8 OPEN** and **MVP-2
> OPEN**, and **selected Option A — a separate, strictly docs/decision-only Phase 47U D.1 storage-adapter ownership /
> placement decision *acceptance* gate** (its §1 / §16 / §18); Phase 47S (PR #190, commit `261d89d2`,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-ACCEPTANCE-GATE.md))
> **accepted** the Phase 47R **NOT YET READY for operative discharge** readiness verdict and the **D.1–D.14** minimum
> discharge checklist as the binding criteria a future operative-discharge lane and Straylight teammate review must
> satisfy (Option A; all ten acceptance criteria MET), **satisfied no checklist item**, **discharged no gate**, and
> **selected this Phase 47T D.1 decision gate** as the first dependency-ordered Dixie-assessable checklist corridor,
> keeping **gate #8 OPEN** and **MVP-2 OPEN**; Phase 47R (PR #189, commit `128757d7`,
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
> **Status**: **docs / decision-only ADR-022E gate #8 D.1 storage-adapter ownership / placement *decision acceptance*
> gate.** This gate adds **only this document** (plus a single minimal forward-traceability status note, §19, in the
> Phase 47T ADR-022E gate #8 D.1 storage-adapter ownership / placement decision gate that named this Phase 47U gate). It
> modifies **no** runtime source — and specifically does **not** modify `app/src/db/migrate.ts`,
> `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`, `app/src/server.ts`, `app/src/config.ts`,
> `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts`, the experimental `.sql` files, the
> `manifest.json`, the `aw-sql-isolation-spike-runner.mjs`, `no-leak.ts`, the `aw-sql-execution-sink-spike.test.ts`, the
> three extended Phase 47F test files, or `scope-guards.test.ts` — and changes **no** route handler, store / storage
> code, DB write, migration, SQL file, executable schema, migration runner, packager, scope guard, auth, consent,
> route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, other test,
> package export, config, env, package, lockfile, CI, generated file, or binary. No adjacent repository
> (`loa-straylight`, `freeside-characters`, or any sibling repo) is touched.
> **This is the ADR-022E gate #8 D.1 storage-adapter ownership / placement *decision acceptance* gate** — the
> docs/decision-only rung Phase 47T §18 named, downstream of the D.1 conjunct-(i) decision, mirroring the chain's
> pervasive design → acceptance discipline (e.g., schema-design gate → schema-design *acceptance* gate;
> implementation-readiness decomposition → implementation-readiness *acceptance* gate; isolation spike → isolation-spike
> *acceptance* gate; clearing-readiness assessment → clearing-readiness *acceptance* gate). It **audits the already-merged
> Phase 47T D.1 conjunct-(i) decision** — accept Candidate D's split-storage route-side adapter as the docs/architecture-
> level production storage-adapter ownership / placement architecture for route-owned records — and decides whether to
> **ACCEPT**, **PATCH**, **PARTIALLY ACCEPT**, or **REJECT** it, **without itself implementing production storage,
> authorizing production migrations, changing route / API behavior, integrating Freeside, selecting the canonical-store
> physical host, discharging gate #8, satisfying the full D.1 item, satisfying any D.2–D.14 item, or closing MVP-2.**
> **Accepting the Phase 47T conjunct-(i) decision is strictly distinct from satisfying the full D.1 checklist item, from
> implementing it, from freezing any ownership / placement ADR, from selecting the canonical-store host, and from
> discharging gate #8:** this gate ratifies a *Dixie-side paper architecture decision* (route-owned records are owned by
> a Dixie route-side `StorageAdapter`-swap-in adapter, never a parallel canonical lifecycle) and confirms that — because
> D.1 conjunct (ii) (the canonical-store physical host) remains externally gated by held sibling gates #9 / #10 — the
> **full D.1 checklist item remains NOT YET SATISFIED**, its box **NOT** checked off, and **D.2–D.14 remain
> UNSATISFIED**. **Gate #8 REMAINS OPEN now; MVP-2 REMAINS OPEN now.** This gate **produces no evidence, runs no role /
> grant test, opens no connection, executes nothing, and implements nothing.** It **enables no production `--apply`,
> injects no DB client / sink, opens no DB connection, performs no DB write, executes no migration, adds no SQL or
> executable schema, changes no migration runner / packager / startup / config, weakens or edits no scope guard,
> implements no auth or consent, changes no route / API behavior, freezes neither the route contract nor the final
> schema, selects no canonical-store host, discharges no operative Straylight-side gate, closes no MVP-2, and claims no
> production readiness.** Production DB execution, production migration execution, durable production storage,
> canonical-store physical-host selection, ADR-022E gate #8 discharge, MVP-2 closure, and all production work **remain
> BLOCKED** (§11 / §13 / §16). This gate **accepts the Phase 47T D.1 conjunct-(i) decision and selects the next
> docs/decision-only lane**; it **clears** gate #8 no further, **opens** no corridor for implementation, **satisfies** no
> full checklist item, **selects** no host, **discharges** nothing, and **closes** no MVP-2.

Every assessment below is grounded **read-only** against the merged Phase 47T decision record (PR #191, commit
`488ce1c9`) in the Dixie repo at authoring time and against the **unchanged** Dixie source surface. The frozen Phase 47J
/ 47F execution-sink source is read read-only for citation grounding only: the injected `IsolationSpikeStatementSink`
interface (`index.ts:124`), the all-or-nothing `applyIsolationSpikePlan(plan, sink)` (`index.ts:568`), the pure
execution-gate seam (`evaluateIsolationSpikeExecutionGate` at `index.ts:661`, `assertIsolationSpikeExecutionGateOpen` at
`index.ts:700`, `SYNTHETIC_REF_MAX_LENGTH = 80` at `index.ts:718`; `index.ts` is **914 lines**), and the explicit runner
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
touched. Nothing below is executed; this gate **adjudicates an already-merged conjunct-(i) decision and selects a next
docs/decision-only lane**, it produces no evidence and discharges nothing.

---

## 1. Status / verdict

**Verdict: ACCEPT PHASE 47T D.1 CONJUNCT (i) DECISION / FULL D.1 REMAINS NOT YET SATISFIED / D.2–D.14 REMAIN
UNSATISFIED / GATE #8 REMAINS OPEN / MVP-2 REMAINS OPEN.**

This is **decision-structure Option A** (§14): the Phase 47T D.1 **conjunct-(i)** decision — *accept Candidate D's
split-storage route-side adapter as the docs/architecture-level production storage-adapter ownership / placement
architecture for route-owned records* — is **accepted** as a correctly-bounded, faithfully-grounded,
invariant-preserving **paper architecture decision**, with the explicit preservation that the **full D.1 checklist item
remains NOT YET SATISFIED** because D.1 conjunct (ii) (the canonical-store physical host) remains **externally gated and
unsatisfied**, held by sibling gates **#9 / #10**. Option A is selected because the conjunct-(i) decision is correctly
scoped to a paper architecture decision (no implementation, no freeze, no host selection, no discharge), is faithfully
grounded against the merged Candidate D / ADR-022D record, preserves every invariant, contains no overclaim or
contradiction, and every load-bearing citation is accurate (§6–§13).

**Acceptance scope, stated narrowly.** This gate **accepts a single conjunct decision**, not a state transition and not
the full checklist item:

- It accepts that **D.1 conjunct (i)** — route-owned-records ownership / placement — is correctly **DECIDED** at the
  docs/architecture level: route-owned records (the endpoint-local contract / idempotency / replay records, ingress
  references, and the public / private projection) are owned by a **Dixie route-side durable adapter**, shaped as a
  **swap-in of the canonical Straylight `StorageAdapter` interface** and **never a parallel canonical lifecycle** (§7 /
  §8 / §9).
- It accepts that **D.1 conjunct (ii)** — the canonical-store physical host (Straylight-process / Finn / Dixie-hosted
  adapter) — is correctly **DECOMPOSED, not decided**: it remains **externally gated** by held sibling gates **#9 /
  #10** and **no host is selected** (§10 / §11).
- It does **not** satisfy, check off, or discharge the full D.1 item. Accepting the conjunct-(i) *decision* is
  categorically distinct from *satisfying* the full conjunctive item; the full **D.1 item remains NOT YET SATISFIED**,
  its box **NOT** checked off (§8 / §13).

For the avoidance of doubt, this acceptance is **bounded** and says only what the Phase 47T record supports:

- **Accepting the conjunct-(i) decision satisfies no full checklist item.** D.1 is a *conjunctive* item (47R §16; 47T
  §6): full satisfaction requires **both** conjunct (i) **and** conjunct (ii). Conjunct (ii) is externally gated and
  open. Therefore **the full D.1 checklist item remains NOT YET SATISFIED**, and D.2–D.14 all remain **UNSATISFIED** (§8
  / §13).
- **Accepting the conjunct-(i) decision is not implementation.** It ratifies a paper architecture decision about *which
  component owns route-owned-records storage*; it implements **no** adapter, writes **no** storage code, changes **no**
  route handler, and authors **no** migration (§9 / §16).
- **Accepting the conjunct-(i) decision is not a host selection.** The canonical-store physical host stays externally
  gated by held sibling gates #9 / #10; this gate **selects no host** (§11).
- **Accepting the conjunct-(i) decision is not an ADR update or freeze.** `route_contract_final` stays false;
  `schema_final` stays false. A future ownership / placement ADR update is a *downstream* lane that becomes ripe only
  after the dependency for conjunct (ii) is resolved (§14 / §15).
- **It does not discharge ADR-022E gate #8.** Gate #8 was cleared by Phase 46N **only** as a documentation /
  architecture / handoff prerequisite; the **operative Straylight-side discharge remains held** (D.13; §11). This gate
  clears gate #8 **no further**. **Gate #8 REMAINS OPEN.**
- **It does not close MVP-2.** MVP-2 closure (D.14) remains a *further, separate* terminal gate downstream of every
  checklist item and the operative discharge. **MVP-2 REMAINS OPEN.**
- **It authorizes no production work** (§16) and **makes no claim that `aw_*` SQL is production-safe or
  production-ready.**

What Phase 47U **is**, stated narrowly: it is **docs / decision-only**. It reads the merged Phase 47T D.1 conjunct-(i)
decision gate and the gate-#8 ADR chain (46N / 46M / 46I) read-only, intakes the Phase 47T decision (§5), states the
acceptance criteria AC.1–AC.10 (§6), assesses Candidate D's evidence support (§7), assesses the D.1 conjunct consistency
and provides the D.1 acceptance matrix (§8), records the Dixie route-side responsibility boundary (§9) and the Straylight
canonical responsibility boundary (§10), assesses the canonical-store physical-host dependency and the gate-#8 / MVP-2
boundary (§11), assesses the Lane-1 vs Lane-2 boundary (§12), audits the D.1–D.14 checklist impact in a matrix (§13),
disposes the decision options (§14), selects the next docs/decision-only lane (§15), records non-goals and blocked work
(§16), provides a Codex audit checklist (§17), runs the docs validators on the unchanged artifacts (§18), records the
single forward-traceability note (§19), and states the final decision (§20). It implements, executes, enables, injects,
freezes, selects (a host), clears (further), discharges, and closes (MVP-2) **nothing**.

---

## 2. Scope

Phase 47U is the **docs/decision-only** ADR-022E gate #8 D.1 storage-adapter ownership / placement **decision
acceptance** gate named by Phase 47T §18 — the **separate, strictly docs/decision-only** rung that, after the D.1
conjunct-(i) decision was made, decides whether that decision is accepted as a correctly-bounded, faithfully-grounded,
invariant-preserving paper architecture decision, or requires a patch / partial acceptance. Its job is to decide: (a)
whether Phase 47T is in fact docs/decision-only and decides only conjunct (i); (b) whether Candidate D / split storage
is supported by the predecessor record; (c) whether the Dixie route-side adapter boundary is precise and is **not** a
parallel canonical lifecycle; (d) whether Straylight canonical-semantics ownership is preserved; (e) whether the
canonical-store physical host correctly remains unresolved / held by sibling gates #9 / #10; (f) whether the full D.1
item correctly remains unsatisfied and D.2–D.14 remain unsatisfied; (g) whether gate #8 and MVP-2 remain open; (h)
whether any production / migration / route / Freeside / discharge / freeze / production-readiness claim is (wrongly)
authorized; and (i) what the next docs/decision-only lane is. It is an **acceptance / audit / selection gate — not the
corridor implementation, not the full D.1 satisfaction, not an ownership / placement ADR update or freeze, not the
canonical-store host selection, not the gate-#8 discharge, and not the MVP-2 closure**.

**In scope (this PR):**

- this single new document; and
- a single minimal forward-traceability status note (§19) in the Phase 47T ADR-022E gate #8 D.1 storage-adapter
  ownership / placement decision gate, which named this Phase 47U gate.

**Explicitly out of scope (this PR) — Phase 47U produces nothing and runs nothing:**

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

This gate **accepts one conjunct decision and selects**; it **produces** nothing, **discharges** nothing, **opens** no
corridor, **satisfies** no full checklist item, **selects** no host, and **closes** no MVP-2. Production execution,
production storage, the canonical-store host selection, the operative gate-#8 discharge, and MVP-2 closure are exactly
what *future, separate gates* must adjudicate — not what this gate asserts.

---

## 3. Source chain

Each predecessor is read **read-only**; this gate re-accepts no predecessor decision other than the Phase 47T D.1
conjunct-(i) decision it is chartered to adjudicate, and it unblocks no production lane.

- **Phase 46I / PR #154 (`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`)** — recorded what gate #8 requires, selected
  split-storage Option 4 as the topology *direction*, and left the physical adapter placement unresolved. **Not
  modified.**
- **Phase 46M / PR #158 (`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`)** — evaluated
  candidate placements A–F, selected **Candidate D** (split storage; Dixie route-side adapter as a `StorageAdapter`
  swap-in; Straylight canonical ownership preserved; canonical-store host + concrete substrate future-gated) as the
  production-adapter placement candidate, and decomposed the durable schema / migration families without freezing schema
  or authoring a migration. **The placement candidate Phase 47T decided at the architecture level for conjunct (i); not
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
  **The checklist Phase 47T's D.1 corridor derives from; not modified.**
- **Phase 47S / PR #190 (commit `261d89d2`,
  `ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-READINESS-ACCEPTANCE-GATE.md`)** — **accepted** the Phase 47R readiness
  verdict and the D.1–D.14 checklist as binding criteria (Option A; all ten AC MET), **satisfied no checklist item**,
  and **selected the Phase 47T D.1 storage-adapter ownership / placement decision gate** as the first dependency-ordered
  Dixie-assessable corridor, keeping gate #8 and MVP-2 OPEN. **Not modified.**
- **Phase 47T / PR #191 (commit `488ce1c9`,
  `ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-GATE.md`)** — **decided D.1 conjunct (i)**
  (accept Candidate D's split-storage route-side adapter as the docs/architecture-level production storage-adapter
  ownership / placement architecture for route-owned records), **decomposed D.1 conjunct (ii)** (routing the
  canonical-store physical-host selection to held sibling gates #9 / #10; selecting no host), left the **full D.1 item
  NOT YET SATISFIED**, kept **D.2–D.14 all UNSATISFIED**, and **selected this Phase 47U D.1 decision acceptance gate**
  (Option A). **The immediate predecessor and the subject of this acceptance gate; gains the single Phase 47U
  forward-traceability status note (§19).**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner and the
  decision records cited as guardrails (§7 / §10 / §16). Cross-repo references, **not edited.**

This acceptance gate also reads, read-only, the merged Dixie decision records that already decompose downstream
predicates — the durable-store schema / migration design gates, the durable-store implementation-readiness gates, and
the auth / consent design gates. **None is edited;** each is referenced only to ground the D.2–D.14 statuses (§13) as
design / decomposition artifacts, **not** implemented production architecture.

---

## 4. Question being decided

Phase 47T §18 routed the D.1 ownership / placement **decision acceptance** to this gate. Phase 47U decides exactly one
question, in five precisely-bounded parts:

1. **Is the Phase 47T conjunct-(i) decision correctly bounded** — a docs/decision-only paper architecture decision that
   decides only conjunct (i), not the full D.1 item, and is not implementation, an ADR freeze, a host selection, or a
   discharge (§6 AC.1 / AC.2; §8)?
2. **Is Candidate D / split storage faithfully grounded** — supported by the merged 46M / 46N / 47Q–47T record, with the
   Dixie route-side adapter precisely a `StorageAdapter` swap-in and never a parallel canonical lifecycle (§6 AC.3 /
   AC.4 / AC.5; §7 / §9 / §10)?
3. **Does the conjunct-(ii) decomposition correctly leave the canonical-store physical host unresolved** — held by
   sibling gates #9 / #10, with no host selected (§6 AC.6; §11)?
4. **Does the decision correctly leave the full D.1 item NOT YET SATISFIED and D.2–D.14 UNSATISFIED, with gate #8 and
   MVP-2 OPEN** (§6 AC.7 / AC.8 / AC.9; §8 / §13)?
5. **Does the decision wrongly authorize any production / migration / route / Freeside / discharge / freeze /
   production-readiness work** (§6 AC.10; §16) — **and which next docs/decision-only lane should proceed** (§15)?

The question is **not** whether to implement a storage adapter (Phase 47U implements none, §9 / §16), **not** whether to
freeze an ownership / placement ADR (no ADR is updated or frozen, §14 / §16), **not** whether to select the
canonical-store host (it stays externally gated by #9 / #10, §11), **not** whether to satisfy the full D.1 item
(conjunct (ii) is open, so D.1 is **not** satisfied, §8 / §13), **not** whether to satisfy any D.2–D.14 item (none is
satisfied, §13), **not** whether to discharge ADR-022E gate #8 (Phase 47U discharges nothing; the operative discharge is
Straylight-owned and held, §11), and **not** whether to close MVP-2 (closure is a further separate terminal gate, §11 /
§13). It is strictly: *whether the Phase 47T conjunct-(i) decision is accepted (or requires a patch / partial
acceptance), and what the next docs/decision-only lane is.*

---

## 5. Phase 47T intake

Phase 47T (PR #191) is the immediate predecessor and the direct input to this gate. Restated read-only, **not extended**:

- **Phase 47T is docs/decision-only.** It adds only its own document plus a single minimal forward-traceability status
  note in the Phase 47S acceptance gate; it modifies no runtime source / test / config / package / SQL / migration /
  route-vector / validator / fixture, and produces no evidence (47T §1 / §2 / §21).
- **Phase 47T decides only D.1 conjunct (i).** It **ACCEPTS Candidate D's split-storage placement** as the
  docs/architecture-level production storage-adapter ownership / placement architecture for **route-owned records** — a
  **paper architecture decision only** (47T §1 / §9).
- **Route-owned records are placed in a Dixie route-side durable adapter boundary** — the endpoint-local contract /
  idempotency / replay records, ingress references, and the public / private projection — **shaped as a swap-in of the
  canonical Straylight `StorageAdapter` interface** and **never a parallel canonical lifecycle** (47T §9 / §12).
- **Dixie does not become a parallel canonical lifecycle owner.** The canonical `active` `Assertion`, the first-class
  `TransitionReceipt`, and the append-only hash-chained `AuditEvent` remain **Straylight-owned** through the
  `StorageAdapter` / `AuditLog` path; Dixie holds **ingress references only** and re-mints **no** receipt (47T §9 / §10
  / §12).
- **Phase 47T does not select the canonical-store physical host.** Conjunct (ii) is **DECOMPOSED, not decided**: the
  physical host (Straylight-process / Finn / Dixie-hosted adapter) stays externally gated by held sibling gates **#9 /
  #10**, and **no host is selected** (47T §10).
- **Phase 47T leaves the full D.1 item NOT YET SATISFIED** (box not checked off) because conjunct (ii) is externally
  gated and open, and the conjunct-(i) decision itself still awaited its own acceptance gate (47T §8 framework / §11).
- **Phase 47T keeps D.2–D.14 all UNSATISFIED**, gate #8 OPEN, and MVP-2 OPEN, and authorizes no production work (47T §13
  / §14 / §15).
- **Phase 47T selected this Phase 47U** D.1 storage-adapter ownership / placement decision *acceptance* gate as the next
  lane (47T §17 / §18).

This gate **takes the Phase 47T conjunct-(i) decision as its input** and adjudicates whether to ACCEPT, PATCH, PARTIALLY
ACCEPT, or REJECT it (§6 / §8 / §14); it does **not** re-decide conjunct (i), re-decompose conjunct (ii), re-define the
checklist, or extend the inventory. The mapping is exact: Phase 47T's conjunct-(i) decision (47T §9) is audited in §7–§9,
its conjunct-(ii) decomposition (47T §10) is audited in §11, and its full-D.1 satisfaction assessment (47T §11) is
audited in §8 / §13.

---

## 6. Acceptance criteria

The Phase 47T D.1 conjunct-(i) decision is **accepted** only if **all** of the following hold; any failure routes to a
PATCH (Option B) or a PARTIAL acceptance (Option C). Each criterion is adjudicated in §7–§13 and the §17 Codex audit
checklist; the per-criterion result is recorded here.

| # | Acceptance criterion | Result |
|---|----------------------|--------|
| **AC.1** | Phase 47T is **docs/decision-only** — it adds only its own document plus one minimal forward-traceability note; it modifies no runtime source / test / config / package / SQL / migration / route-vector / validator / fixture / CI, and produces no evidence | **MET** (§5 / §18) |
| **AC.2** | Phase 47T decides **only D.1 conjunct (i)**, **not the full D.1 item** — conjunct (ii) is decomposed, not decided | **MET** (§8) |
| **AC.3** | **Candidate D / split storage** is supported by the predecessor docs (46M §6 selection; 46N §7 prerequisite; carried through 47Q–47S) | **MET** (§7) |
| **AC.4** | The **Dixie route-side adapter boundary is precise** (route-owned contract / idempotency / replay records, ingress references, public / private projection) and is a `StorageAdapter` swap-in, **never a parallel canonical lifecycle** | **MET** (§9) |
| **AC.5** | **Straylight canonical-semantics ownership is preserved** — `Assertion` / `TransitionReceipt` / `AuditEvent` remain Straylight-owned through `StorageAdapter` / `AuditLog`; Dixie holds ingress references only and re-mints no receipt | **MET** (§10) |
| **AC.6** | The **canonical-store physical host remains unresolved / held by sibling gates #9 / #10** — no host is selected | **MET** (§11) |
| **AC.7** | The **full D.1 item remains NOT YET SATISFIED** — its box is **NOT** checked off (conjunctive item with conjunct (ii) open) | **MET** (§8 / §13) |
| **AC.8** | **D.2–D.14 remain UNSATISFIED** — the conjunct-(i) decision advances only the architecture root and satisfies no other item | **MET** (§13) |
| **AC.9** | **Gate #8 remains OPEN and MVP-2 remains OPEN** — Phase 46N paper-level clearing only; operative discharge held (D.13); terminal closure (D.14) downstream | **MET** (§11 / §13) |
| **AC.10** | **No production implementation, migration, route / API, Freeside, discharge, freeze, or production-readiness claim is authorized**; load-bearing citations are accurate (no `migrate.ts:303-305`; `server.ts:303`/`:305`; `config.ts:340`; 19-entry denylist `:122-142`; 114-key no-leak parity; index.ts seams; line counts) | **MET** (§16 / §17 / §18) |

**Criteria conclusion.** All ten acceptance criteria are **MET**. Phase 47T is docs/decision-only and decides only D.1
conjunct (i); Candidate D / split storage is faithfully grounded; the Dixie route-side adapter boundary is precise and
is a `StorageAdapter` swap-in, never a parallel canonical lifecycle; Straylight canonical-semantics ownership is
preserved; the canonical-store physical host correctly remains unresolved / held by #9 / #10; the full D.1 item remains
NOT YET SATISFIED; D.2–D.14 remain UNSATISFIED; gate #8 and MVP-2 remain OPEN; no production / migration / route /
Freeside / discharge / freeze / production-readiness work is authorized; and every load-bearing citation is accurate.
There is **no** unmet criterion, so **no** PATCH (Option B) is warranted and **no** partial acceptance (Option C)
applies. **Option A — ACCEPT** is the supported verdict.

---

## 7. Candidate D evidence assessment

**Assessed: ACCEPT — Candidate D / split storage is faithfully grounded in the merged record.** Phase 47T's conjunct-(i)
decision accepts Candidate D's split-storage route-side adapter as the docs/architecture-level placement for route-owned
records. The audit confirms this is well-grounded and is **not** a fresh, unsupported invention:

- **Candidate D was selected at Phase 46M (PR #158).** Phase 46M evaluated candidate placements A–F and selected
  **Candidate D** (split storage; Dixie route-side adapter as a `StorageAdapter` swap-in; Straylight canonical ownership
  preserved; canonical-store host + concrete substrate future-gated) as the production-adapter placement candidate (47T
  §3 / §7; 46M §6). This is the candidate Phase 47T decides at the architecture level — not a new option.
- **Candidate D was proposed as conjunct (a) of Phase 46N's paper-level gate-#8 clearing (PR #159).** Phase 46N cleared
  gate #8 **only** as a documentation / architecture / handoff prerequisite with Candidate D proposed; the operative
  Straylight-side discharge stayed held (47T §3 / §7; 46N §7). Phase 47T's conjunct-(i) decision is the **first**
  docs/architecture-level *acceptance* of Candidate D's route-owned-records placement — distinct from 46M's *selection*
  and 46N's *proposal*.
- **Candidate D was carried forward unchanged through 47Q–47S.** The route-owned half was repeatedly recorded as
  *proposed, not accepted as production architecture* (47Q §8; 47R §8; 47S §8 D.1 row). No phase before Phase 47T
  accepted Candidate D's route-owned-records placement as the production ownership / placement architecture; Phase 47T's
  decision is the correctly-sequenced first acceptance.
- **The "successor" latitude is honored.** The D.1 predicate text reads "Candidate D **(or a successor)**" (47R §16; 47T
  §6). Phase 47T accepts Candidate D itself, which is the most-grounded option in the merged record; it neither invents
  a new successor nor forecloses one, and the acceptance is bounded to the docs/architecture level.

**Assessment.** Candidate D / split storage is the settled, well-grounded answer to the conjunct-(i) question (*which
component owns route-owned-records storage at the architecture level*), with a clean provenance chain (46M select → 46N
propose → 47Q–47S carry → 47T accept). Accepting Phase 47T's conjunct-(i) decision therefore rests on faithful grounding,
not overclaim. **AC.3 is MET.**

---

## 8. D.1 conjunct consistency assessment

**Assessed: ACCEPT — the conjunct decomposition is correct and the full D.1 item correctly remains NOT YET SATISFIED.**
D.1 is a **conjunctive** checklist item (47R §16; 47T §6): full satisfaction requires **both** conjunct (i) **and**
conjunct (ii). Phase 47T decides conjunct (i) and decomposes conjunct (ii); a conjunctive item with one conjunct open is
**not** satisfied. Phase 47T's own §11 records exactly this. The audit confirms the consistency and that **no box is
checked off**.

**D.1 acceptance matrix.** The matrix below audits each component of Phase 47T's D.1 decision. The **Phase 47U
assessment** column records this gate's audit; the **Status after Phase 47U** column confirms acceptance changes no
gate / satisfaction state; the **Later implication** column records the downstream consequence.

| Decision component | Phase 47T claim | Phase 47U assessment | Status after Phase 47U | Later implication |
|--------------------|-----------------|----------------------|------------------------|-------------------|
| **D.1 conjunct (i): route-side adapter ownership / placement** | DECIDED — accept Candidate D's split-storage route-side adapter for route-owned records at the docs/architecture level (47T §9) | Faithful, bounded, invariant-preserving; a paper architecture decision only | **Conjunct (i) decision ACCEPTED by Phase 47U** | Conjunct (i) is now a ratified Dixie-side paper architecture decision; downstream items may presuppose accepted placement once conjunct (ii) resolves |
| **D.1 conjunct (ii): canonical-store physical host** | DECOMPOSED, NOT decided — routed to held sibling gates #9 / #10; no host selected (47T §10) | Correctly decomposed; the host is not a Dixie docs-only decision | **EXTERNALLY GATED, UNSATISFIED (no host selected)** | D.1 conjunct (ii) resolves only when the canonical-store physical host is selected through the proper authority path and sibling gates #9 / #10 are resolved for that host; D.2 invariant-preservation evidence remains a separate downstream checklist item and is **not** a prerequisite for satisfying D.1 |
| **Full D.1 checklist item ((i) ∧ (ii))** | NOT YET SATISFIED — box not checked off (47T §11) | Correct; conjunctive item with conjunct (ii) open is not satisfied | **NOT YET SATISFIED — box NOT checked off** | D.1 stays an open precondition for the downstream Dixie-assessable chain |
| **Dixie route-side adapter responsibility** | Owns endpoint-local contract / idempotency / replay records, ingress references, public / private projection; `StorageAdapter` swap-in (47T §9) | Precise; never a parallel canonical lifecycle | **Accepted as the route-owned-records half only (paper architecture)** | A future swap-in implementation must conform to the canonical `StorageAdapter` contract (D.3 / D.5 / D.7), still owed |
| **Straylight canonical-semantics responsibility** | `Assertion` / `TransitionReceipt` / `AuditEvent` remain Straylight-owned through `StorageAdapter` / `AuditLog`; Dixie re-mints no receipt (47T §10 / §12) | Preserved; canonical ownership unchanged | **Remains Straylight-owned (unchanged)** | Canonical invariant-preservation evidence (D.2) is Straylight-reviewed and still owed |
| **Lane-1 proof-only boundary** | Bounded non-production Lane-1 `aw_*` proof; never production-safe (47T §12 / §13) | Preserved; the conjunct-(i) decision is not a Lane-1 production-safe claim | **Preserved (Lane-1 stays non-production proof)** | Lane-1 proof is never read as production-safe or as pre-authorizing Lane-2 (D.6) |
| **Lane-2 canonical production-store boundary** | Canonical Straylight-store migrations stay behind the operative gate; not authorized (47T §13 / §15 / §19) | Preserved; no Lane-2 work authorized | **Preserved (Lane-2 remains BLOCKED behind the operative gate)** | Lane-2 canonical-store migrations are a separate Straylight ADR + sibling-repo PR downstream of the gate-#8 boundary |
| **Gate #8 discharge boundary** | Cleared no further than Phase 46N's paper-level prerequisite; operative discharge held (D.13) (47T §14) | Preserved; deciding / accepting one conjunct cannot move gate #8 toward discharge | **REMAINS OPEN** | Operative discharge requires the gate-table preamble pathway under Straylight teammate review (D.13), externally owned |
| **MVP-2 closure boundary** | Not closed; terminal D.14 gate downstream of all items + operative discharge (47T §14) | Preserved; closure is not selectable now | **REMAINS OPEN** | MVP-2 closure is a further, separate terminal gate (D.14), reachable only after D.1–D.13 + operative discharge |

**Assessment.** The decomposition is internally consistent: conjunct (i) is decided and now accepted at the
docs/architecture level; conjunct (ii) is correctly decomposed and externally gated; the full conjunctive item correctly
remains **NOT YET SATISFIED** with its box **NOT** checked off. **Accepting the conjunct-(i) decision satisfies no full
checklist item and checks off no box. AC.2, AC.7, and AC.9 are MET.**

---

## 9. Dixie route-side responsibility boundary

**Assessed: ACCEPT — the Dixie route-side adapter boundary is precise and is never a parallel canonical lifecycle.**
Phase 47T places **route-owned records** in a Dixie route-side durable adapter boundary. The audit confirms the boundary
is drawn precisely and does not encroach on canonical authority:

- **What the route-side adapter owns.** The endpoint-local **contract / idempotency / replay** records, the **ingress
  references**, and the **public / private projection** for the Admission Wedge route — the records Dixie legitimately
  owns at its ingress boundary, placed where the data originates (47T §9). The boundary is enumerated, not vague.
- **Shape: a `StorageAdapter` swap-in, never a parallel canonical lifecycle.** The route-side adapter is shaped as a
  **swap-in of the canonical Straylight `StorageAdapter` interface** (46M §6.1 / §6.2; 46N §7; 47T §9). It defines
  **no** second assertion / transition / receipt lifecycle, re-mints **no** canonical `TransitionReceipt`, and redefines
  **no** canonical primitive. Dixie holds **ingress references only** to canonical material (46N §5.1; ADR-022D §1).
  This is the load-bearing distinction that keeps the route-side adapter from becoming a parallel canonical lifecycle.
- **No implementation is implied.** Accepting the boundary at the architecture level implements **no** adapter, writes
  **no** storage code, changes **no** route handler or public response, and authors **no** migration. The production
  path stays byte-for-byte unchanged: `migrate.ts` (254 lines, no line 303–305), `copy-migrations.mjs` (62 lines), the
  startup `if (dbPool)` at `server.ts:303` with `await migrate(dbPool)` at `server.ts:305`, and `config.ts`
  `DATABASE_URL` at `config.ts:340` are all untouched (§16).

**Assessment.** The Dixie route-side responsibility boundary is precise (an enumerated set of route-owned records),
correctly shaped as a `StorageAdapter` swap-in, and **never a parallel canonical lifecycle**. **AC.4 is MET.**

---

## 10. Straylight canonical responsibility boundary

**Assessed: ACCEPT — Straylight canonical-semantics ownership is preserved.** Phase 47T's conjunct-(i) decision leaves
canonical ownership exactly where the chain places it. The audit confirms no canonical surface migrates to Dixie:

- **Canonical store stays Straylight-owned.** The canonical `active` `Assertion`, the first-class `TransitionReceipt`,
  and the append-only hash-chained `AuditEvent` remain **Straylight-owned** through the `StorageAdapter` / `AuditLog`
  path (46N §5; ADR-022D §1; 47T §10 / §12). Phase 47T changes **no** canonical ownership.
- **Dixie holds ingress references only.** Dixie re-mints **no** receipt and defines **no** canonical primitive; it
  references canonical material at its ingress boundary (46N §5.1; ADR-022D §1; 47T §9 / §12). Canonical semantics —
  `active` as the canonical assertion status (not a public `outcome_class`), the six receipt categories, the
  append-only hash-chained audit log verifiable via `verifyChain` — are preserved unchanged.
- **Canonical invariant-preservation evidence stays owed.** Whether a future substrate preserves the ADR-022D
  invariants is the **D.2** preservation-evidence obligation, still owed under Straylight teammate review — **not**
  discharged or advanced to satisfied here (47T §12; §13 below).

**Assessment.** Straylight canonical-semantics ownership is fully preserved; the conjunct-(i) decision accepts only the
route-owned-records half of the split and carries **no** canonical authority. **AC.5 is MET.**

---

## 11. Canonical-store physical-host dependency assessment

**Assessed: ACCEPT — the canonical-store physical host correctly remains unresolved / held by sibling gates #9 / #10, and
gate #8 / MVP-2 remain OPEN.** Phase 47T decomposes conjunct (ii) without deciding it. The audit confirms the host stays
externally gated and the gate-#8 / MVP-2 boundaries are untouched:

- **The physical host is not selected.** The canonical-store physical host — Straylight-process, Finn, or a Dixie-hosted
  adapter — is governed by held sibling gates **#9** (Finn runtime wiring) and **#10** (Dixie boundary wiring), each
  held with its own trigger (46M §6.4; 46N §4.6 / §11 row 1; 47T §10). **No Dixie docs-only phase can resolve #9 / #10
  or select the host**, and Phase 47T selects none. Accepting Phase 47T's decision **selects no host** either. **AC.6 is
  MET.**
- **Gate #8 remains OPEN.** Phase 46N cleared gate #8 **only** as a documentation / architecture / handoff prerequisite
  (conjunct (a) Candidate D proposed; conjunct (b) sibling handoff packet cited; conjunct (c) ADR-022D invariants
  preserved). This gate clears it **no further**. The operative Straylight-side discharge — the gate-table preamble
  pathway (trigger satisfied **and** a separate ADR or sibling-repo PR under Straylight teammate review explicitly
  citing the trigger), with sibling gates #9 / #10 / #11 / #12 / #15 / #20 each resolved per their own trigger (46N
  §4.6 / §4.7) — is checklist item **D.13** and remains **UNSATISFIED**, externally owned, and **held**. **Gate #8
  REMAINS OPEN.**
- **MVP-2 remains OPEN.** MVP-2 closure is checklist item **D.14**, the *further, separate* terminal gate downstream of
  D.1–D.13 and the operative discharge (47R §7 row 13 / §16; 47T §14). This gate does **not** close MVP-2, **selects no
  MVP-2 closure lane**, and asserts **no** condition that would make closure selectable. **MVP-2 REMAINS OPEN.**

**Assessment.** The canonical-store physical-host dependency is correctly held by sibling gates #9 / #10; no host is
selected; gate #8 and MVP-2 remain OPEN. The unresolved conjunct (ii) is precisely why the full D.1 item remains NOT YET
SATISFIED (§8). **AC.6 and AC.9 are MET.**

---

## 12. Lane-1 versus Lane-2 boundary assessment

**Assessed: ACCEPT — the Lane-1 ≠ Lane-2 boundary is preserved by the conjunct-(i) decision.** Accepting a paper
architecture ownership decision must not blur the proof / production boundary the chain carries. The audit confirms it
does not:

- **Lane-1 stays a bounded non-production proof.** The Lane-1 `aw_*` SQL isolation → execution-sink → least-privilege
  evidence chain (Phase 47F–47O) is **bounded, disabled-by-default, dev/operator-only, NON-PRODUCTION** (`--apply`
  refused), closed by Phase 47O **only for the bounded non-production proof corridor** (47T §13 row D.6). Deciding /
  accepting the conjunct-(i) ownership architecture changes nothing about Lane-1's non-production status.
- **Lane-2 stays canonical and behind the operative gate.** Lane-2 — canonical Straylight-store migrations — remains a
  separate Straylight ADR + sibling-repo PR behind the operative gate-#8 discharge (47T §13 row D.3 / §15 / §19). The
  conjunct-(i) acceptance authorizes **no** Lane-2 work.
- **The boundary is a preservation discipline, not a decision.** D.6 (Lane-1 ≠ Lane-2 boundary) is a preservation
  obligation carried through every downstream lane (47S §8 D.6 row; 47T §13). The conjunct-(i) decision is never read as
  a production-safe claim or as pre-authorizing Lane-2; the accepted Phase 47A `.json` Mode 2 path remains the live
  fallback, unchanged.

**Assessment.** The Lane-1 ≠ Lane-2 boundary is preserved; accepting the conjunct-(i) decision makes **no** claim that
`aw_*` SQL is production-safe and pre-authorizes **no** Lane-2 work. This supports **AC.10**.

---

## 13. D.1–D.14 checklist impact assessment

Accepting the Phase 47T D.1 conjunct-(i) decision **ratifies the Dixie-assessable architecture root** but **satisfies no
checklist item** — not even the full D.1 item. The matrix below records, item-by-item, the status before and after this
gate. **Accepting the conjunct-(i) decision checks off no box and discharges nothing.**

| Checklist item | Status before Phase 47U | Status after Phase 47U | Why | Next implication |
|----------------|-------------------------|------------------------|-----|------------------|
| **D.1 Storage-adapter ownership / placement ACCEPTED** | **NOT YET SATISFIED** (47T decided conjunct (i) at docs/architecture level, pending its acceptance gate; conjunct (ii) externally gated) | **NOT YET SATISFIED** (conjunct (i) decision now **accepted by Phase 47U**; full item still open) | Conjunctive item: conjunct (ii) (canonical-store host) remains externally gated by #9 / #10 (§8 / §11) | Full D.1 can only be satisfied after D.1 conjunct (i) remains accepted and D.1 conjunct (ii) is resolved through canonical-store physical-host selection plus sibling #9 / #10 resolution; D.2 remains a separate downstream checklist item and stays UNSATISFIED after full D.1; box stays unchecked |
| **D.2 Canonical invariant-preservation evidence** | **UNSATISFIED** | **UNSATISFIED** | Owner stays Straylight; preservation *evidence* still owed under Straylight review; not advanced beyond readiness | After D.1 full; canonical-substrate invariant-preservation evidence gate (Straylight-reviewed) |
| **D.3 Migration-file ownership** | **UNSATISFIED** | **UNSATISFIED** | Presupposes accepted placement + selected host; canonical side stays a separate Straylight ADR + sibling-repo PR; no migration authored | Schema / migration design + acceptance gate, downstream of D.1 full |
| **D.4 Migration-execution ownership + least-privilege** | **UNSATISFIED** | **UNSATISFIED** | Production migration path unchanged; no execution owner decided; only bounded non-production Lane-1 evidence exists | Production migration-execution authorization gate + production-grade least-privilege evidence |
| **D.5 Runtime route storage-call owner** | **UNSATISFIED** | **UNSATISFIED** | Route handler unchanged; only the Phase 33N disabled-by-default spike (Storage Option A) authorized | Route-storage authorization gate + route-contract pre-freeze, after storage acceptance |
| **D.6 Lane-1 ≠ Lane-2 boundary** | **UNSATISFIED** (preservation discipline) | **UNSATISFIED** (preservation discipline) | Boundary preserved; Lane-1 proof never read as production-safe or as pre-authorizing Lane-2 (§12) | Carried through every downstream lane; never a production-safe / Lane-2-pre-authorization claim |
| **D.7 Production DB write preconditions** | **UNSATISFIED** | **UNSATISFIED** | Blocked behind least-privilege evidence + accepted schema / migration + production no-leak serializer + operative discharge | After D.2 / D.3 / D.4 / D.12 + operative discharge (D.13) |
| **D.8 Route / API behavior-change authorization** | **UNSATISFIED** | **UNSATISFIED** | No route / API change authorized; storage + auth + identity + route-contract pre-freeze still owed | Route-contract pre-freeze gate, after storage + auth + identity decisions land |
| **D.9 Freeside integration sequencing** | **UNSATISFIED** | **UNSATISFIED** | Last surface; gate #11 held; no Freeside wiring authorized | Sequenced last: route-contract freeze + gate #11 resolution + Freeside client-contract handoff gate |
| **D.10 Auth / consent / signer / authority durable attachment** | **UNSATISFIED** | **UNSATISFIED** | Storage-dependent (P2); durable attachment home depends on the storage model being accepted first | Auth / consent persistence gates, downstream of D.1 full |
| **D.11 Tenant / estate / actor identity binding** | **UNSATISFIED** | **UNSATISFIED** | Auth-dependent (P2); downstream of D.10 | Production identity-binding persistence gate, after auth / authority acceptance (D.10) |
| **D.12 Production no-leak serializer + runtime fixtures** | **UNSATISFIED** | **UNSATISFIED** | 114 = 114 parity preserved; production serializer still owed before durable runtime code emits canonical / consent refs | Route-vector + runtime-fixture extension gate, before durable runtime code emits canonical / consent / auth / signer / storage refs |
| **D.13 Operative Straylight-side discharge** | **UNSATISFIED (externally owned, held)** | **UNSATISFIED (externally owned, held)** | Not satisfiable by any Dixie phase; gate-table preamble pathway under Straylight teammate review | A *further, separate* operative-discharge lane + Straylight teammate review; no Dixie phase satisfies it |
| **D.14 MVP-2 closure terminal gate** | **UNSATISFIED (terminal, downstream)** | **UNSATISFIED (terminal, downstream)** | Presupposes D.1–D.13 satisfied + operative discharge completed; not selectable now | A *further, separate* terminal MVP-2 closure gate; not selectable now |

**Matrix conclusion.** Accepting the conjunct-(i) decision ratifies the Dixie-assessable architecture root but
**satisfies no checklist item**: the **full D.1 item remains NOT YET SATISFIED** (its box NOT checked off), and **D.2–D.14
all remain UNSATISFIED**. D.1 conjunct (i) is **accepted by Phase 47U**; the full D.1 box stays unchecked; D.13 stays
externally owned / held; D.14 stays terminal / downstream. **No D.1–D.14 box is checked off. AC.7 and AC.8 are MET.**

---

## 14. Decision options

Phase 47U weighs six options for adjudicating the Phase 47T D.1 conjunct-(i) decision:

### Option A — ACCEPT the Phase 47T D.1 conjunct-(i) decision. **SELECTED.**

**Selected** because all ten acceptance criteria are MET (§6): Phase 47T is docs/decision-only (§5); it decides only D.1
conjunct (i), not the full item (§8); Candidate D / split storage is faithfully grounded (§7); the Dixie route-side
adapter boundary is precise and is a `StorageAdapter` swap-in, never a parallel canonical lifecycle (§9); Straylight
canonical-semantics ownership is preserved (§10); the canonical-store physical host correctly remains unresolved / held
by #9 / #10 (§11); the Lane-1 ≠ Lane-2 boundary is preserved (§12); the full D.1 item remains NOT YET SATISFIED and
D.2–D.14 remain UNSATISFIED (§8 / §13); gate #8 and MVP-2 remain OPEN (§11 / §13); no production / migration / route /
Freeside / discharge / freeze / production-readiness work is authorized (§16); and every load-bearing citation is
accurate (§17 / §18). Accepting Candidate D / split storage as the docs/architecture-level route-side ownership /
placement decision for route-owned records — **while preserving that full D.1 remains unsatisfied because the
canonical-store physical host remains unresolved / held by sibling gates #9 / #10** — establishes the ratified
architecture root the downstream Dixie-assessable items presuppose. Option A satisfies **no** full checklist item,
freezes **no** ADR, implements **no** storage, selects **no** host, discharges **no** gate, and closes **no** MVP-2.

### Option B — PATCH the Phase 47T D.1 conjunct decision. **Not selected.**

**Not selected.** A PATCH would be warranted only on an exact defect: a mis-stated decision, missing evidence, an
overclaim, a citation error, or a contradiction. There is none. The conjunct-(i) decision is correctly bounded to a
paper architecture decision (§8 / §9); Candidate D is faithfully grounded (§7); Straylight ownership is preserved (§10);
conjunct (ii) is correctly decomposed and host-unselected (§11); the full D.1 item is correctly NOT YET SATISFIED (§8 /
§13); no production overclaim exists (§16); and every load-bearing citation re-grounded against live source matches
exactly (no `migrate.ts:303-305`; `server.ts:303`/`:305`; `config.ts:340`; 19-entry denylist `:122-142`; 114-key
no-leak parity; index.ts seams; line counts — §17 / §18). There is therefore no exact defect for Option B to fix.

### Option C — PARTIAL ACCEPTANCE (accept Candidate D direction, require a narrowing / reconciliation gate before the host dependency). **Not selected.**

**Not selected.** Partial acceptance would be correct only if the Candidate D direction were sound *but* the
conjunct-(i) decision left an internal inconsistency or an under-narrowed boundary requiring reconciliation before the
canonical-store-host dependency could be sequenced. None of that holds: the route-side adapter boundary is already
precise and enumerated (§9), the swap-in-not-fork shape is explicit (§9), Straylight ownership is preserved (§10), and
the conjunct (ii) host dependency is already cleanly routed to held sibling gates #9 / #10 (§11). There is no narrowing
or reconciliation gap to fill, so the host dependency can be sequenced directly as the next lane (§15). Option C is held
as the non-selected alternative the audit does not warrant.

### Option D — ACCEPT FULL D.1 AS SATISFIED NOW. **REJECTED.**

**Rejected.** Full D.1 satisfaction is unsupported: D.1 is conjunctive and conjunct (ii) (the canonical-store physical
host, with #9 / #10 resolved for the chosen host) is **externally gated and unsatisfied** — no host is selected and #9 /
#10 are held (§11). A conjunctive item with one conjunct open cannot be satisfied. Marking full D.1 satisfied would
contradict the merged record (47R §16; 47T §11) and the strong default to reject. **Full D.1 remains NOT YET SATISFIED;
its box is NOT checked off.**

### Option E — AUTHORIZE PRODUCTION IMPLEMENTATION NOW. **REJECTED.**

**Rejected.** Production-implementation authorization is unsupported: gate #8's operative discharge is held (D.13), the
canonical-store host is externally gated (conjunct (ii)), the production no-leak serializer is owed (D.12), no schema /
migration is accepted (D.3), and no production-grade least-privilege execution evidence exists (D.4). Authorizing
implementation now would skip every readiness rung the chain requires and contradict the still-NOT-YET-READY gate-#8
verdict (47R / 47S). Option E is rejected; durable-store / adapter implementation and all production work **remain
BLOCKED**.

### Option F — DISCHARGE ADR-022E GATE #8 NOW. **REJECTED.**

**Rejected**, and strongly so. Gate #8's operative discharge is **Straylight-owned** and requires the preamble's
separate-ADR / sibling-repo-PR-under-Straylight-teammate-review pathway (46N §4.7; D.13); a Dixie docs-only phase cannot
discharge it. The full D.1 item is **not** satisfied, D.2–D.14 are **all** unsatisfied, and sibling gates #9 / #10 / #11
/ #12 / #15 / #20 are held. This gate discharges **nothing**; **gate #8 REMAINS OPEN**.

**Conclusion.** Decision-structure **Option A**: accept the Phase 47T D.1 conjunct-(i) decision (accept Candidate D's
split-storage placement for route-owned records at the docs/architecture level; §7–§9) while preserving that the full
D.1 item remains NOT YET SATISFIED because conjunct (ii) (the canonical-store physical host) is externally gated by held
sibling gates #9 / #10 (§8 / §11); keep D.2–D.14 UNSATISFIED (§13); keep gate #8 OPEN and MVP-2 OPEN (§11 / §13);
preserve every invariant (§9 / §10 / §12); reject Options D, E, and F; hold Options B / C as the non-selected
alternatives the audit does not warrant.

---

## 15. Selected next lane

> **Selected next lane: Phase 47V — Admission Wedge ADR-022E gate #8 D.1 canonical-store physical-host dependency gate**
> (a *separate*, strictly docs / decision-only gate that **decomposes or routes** the still-open D.1 **conjunct (ii)**
> dependency — the canonical-store physical host (Straylight-process / Finn / Dixie-hosted adapter) held by sibling gates
> **#9 / #10** — establishing how the host selection sequences under those held gates and the chosen host's D.2
> invariant-preservation evidence; **NOT** a host selection itself, **NOT** a production implementation, **NOT** a
> durable-store lane, **NOT** a migration, **NOT** a route / API behavior change, **NOT** a Freeside integration, **NOT**
> a production DB write, **NOT** the gate-#8 discharge, and **NOT** the MVP-2 closure).

With the Phase 47T D.1 conjunct-(i) decision **accepted** (§7–§9), the disciplined next rung addresses the **still-open
D.1 conjunct (ii) dependency** — the canonical-store physical host held by sibling gates #9 / #10 — because the full D.1
item cannot be satisfied until conjunct (ii) resolves, and the rest of the Dixie-assessable chain (D.2 onward)
presupposes a fully-satisfied D.1. Selecting the conjunct-(ii) dependency gate (rather than jumping to D.2) honors the
chain's dependency order and the load-bearing rule that **D.2 must not proceed while full D.1 remains unsatisfied**:
D.2's canonical invariant-preservation evidence is reviewed against the *chosen host's* substrate, so it cannot
meaningfully proceed before the host dependency is at least decomposed / routed. Phase 47V is therefore the
correctly-sequenced successor.

Phase 47V **must be strictly docs / decision-only**. It must **not** select the canonical-store physical host (host
selection requires #9 / #10 resolved, externally owned), produce evidence, run any role / grant test, enable production
`--apply`, inject any sink, open any connection, change any production-path file, implement a durable store or storage
adapter, write a production migration, change route / API behavior, integrate Freeside, perform any production DB write,
update or freeze any ownership / placement ADR, freeze any contract / schema, discharge ADR-022E gate #8 or any
Straylight-side gate, satisfy any D.1–D.14 item, or close MVP-2. It **decomposes or routes** the conjunct (ii)
canonical-store physical-host dependency so that, once #9 / #10 resolve under their own triggers, the full D.1 item can
be assessed in dependency order. **It must not claim to satisfy full D.1 unless the evidence explicitly supports that
later** (it does not now — #9 / #10 are held). Whether gate #8 can ever be discharged is a *further, separate* event that
requires Straylight teammate review per the preamble (46N §4.7; D.13); whether MVP-2 can ever close is a *further,
separate* terminal gate downstream of the full checklist and the operative discharge (D.14).

**Not selected as the next lane:** a canonical-store physical-host *selection* (externally gated by held sibling gates #9
/ #10 — Phase 47V decomposes / routes the dependency, it does not select the host); a D.2 canonical
invariant-preservation-evidence gate (premature — it presupposes a *fully-satisfied* D.1, so it follows the conjunct-(ii)
dependency resolution, not precedes it); a storage-adapter ownership / placement ADR *update / freeze* (premature — the
ADR update is ripe only after the full D.1 item, including conjunct (ii), is resolved, 47T §16 Option B); a Lane-2
canonical Straylight-store migration / schema alignment gate (downstream of the gate-#8 boundary, 47R §12 / §17);
production durable-store / adapter implementation authorization (rejected, §14 Option E); a gate-#8 discharge (rejected;
Straylight-owned and held, §14 Option F). Each remains a *future, separate* docs/decision lane in dependency order; none
is opened, implemented, updated, authorized, selected, or discharged here.

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

## 16. Non-goals and blocked work

Phase 47U explicitly does **none** of the following — each remains exactly as blocked / deferred as before this gate. The
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
- canonical-store physical-host selection;
- ADR-022E gate #8 discharge;
- route-contract freeze;
- final-schema freeze;
- MVP-2 closure;
- production readiness;
- any `aw_*` SQL production-safe claim.

In addition, Phase 47U:

- does not produce evidence, run a role / grant test, open a DB connection, run forward or cleanup SQL, or invoke `psql`
  / Docker / Postgres;
- does not inject a DB client / sink, perform a DB write, or execute a migration;
- does not change any migration runner (`migrate.ts`, 254 lines) / packager (`copy-migrations.mjs`, 62 lines) /
  scope-guard (`scope-guards.test.ts`, canonical 19-entry denylist `:122-142`) / startup / route handler / route-vector
  / validator / fixture / package / lockfile / CI file;
- does not update or freeze any storage-adapter ownership / placement ADR;
- does not resolve any held sibling gate (#9 / #10 / #11 / #12 / #15 / #20 stay held);
- does not satisfy, check off, or discharge any D.1–D.14 checklist item; it **accepts the Phase 47T D.1 conjunct-(i)
  decision** (which leaves the full D.1 item NOT YET SATISFIED) and satisfies **no** full item;
- does not conclude that gate #8 is ready for discharge, does not discharge ADR-022E gate #8 (operatively or otherwise)
  or any Straylight-side gate, and clears gate #8 no further than Phase 46N's documentation / architecture / handoff
  prerequisite;
- does not touch any adjacent repository.

All production work — production DB execution, production `--apply`, production DB writes, production migration
execution, durable production storage implementation, the production storage adapter, the storage-adapter ownership /
placement ADR update / freeze, the canonical-store physical-host selection, Lane-2 canonical Straylight-store
migrations, production auth / consent / signer / authority, tenant / estate / actor identity binding, route / API
behavior change, public-response expansion, raw-payload persistence, Freeside runtime / client integration, ADR-022E
gate #8 discharge, the route-contract freeze, the final-schema freeze, and MVP-2 closure — **remains BLOCKED**.

---

## 17. Codex audit checklist

This checklist audits **this Phase 47U PR** — the docs-only ADR-022E gate #8 D.1 storage-adapter ownership / placement
decision acceptance gate. Every item must be ACCEPT; any REJECT blocks acceptance of this Phase 47U PR.

```text
PHASE 47U — ADR-022E GATE #8 D.1 STORAGE-ADAPTER OWNERSHIP / PLACEMENT DECISION ACCEPTANCE GATE
CODEX AUDIT CHECKLIST
(docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47U PR)

[ ] 1.  Scope is docs-only — Phase 47U adds only this document plus a single minimal §19 forward-traceability status note
        (in the Phase 47T ADR-022E gate #8 D.1 storage-adapter ownership / placement decision gate); it modifies no
        runtime source, and specifically not migrate.ts, copy-migrations.mjs, any *.sql, the experimental SQL / manifest
        / planner (aw-sql-isolation-spike/*) / runner, no-leak.ts, aw-sql-execution-sink-spike.test.ts, the three
        extended Phase 47F test files, config.ts, server.ts, or scope-guards.test.ts.
[ ] 2.  No runtime/source/test/config/package/CI/SQL/migration/vector/validator/fixture changes — no route handler,
        store/storage code, DB code, migration runner, packaging/copy runner, planner, runner, auth, consent, server-boot,
        unit/integration test, scope-guard test, isolation test, fixture, route-vector JSON, route-vector validator,
        route-vector README, config.ts, env gate, package.json, lockfile, .github/ CI, .sql, aw_* schema, executable
        schema, migration file, or migration directory is added/modified.
[ ] 3.  Phase 47U produces NO evidence and runs nothing — the gate creates no disposable database, no role, no grant,
        runs no privilege/role/grant test, runs no forward or cleanup SQL under any role, opens no connection, and invokes
        no psql / Docker / Postgres; it adjudicates an already-merged conjunct-(i) decision and selects a next
        docs/decision-only lane (§1/§2).
[ ] 4.  Phase 47T intake is faithful (§5) — Phase 47T is docs/decision-only, decided only D.1 conjunct (i) (accept
        Candidate D split-storage route-side adapter for route-owned records at the docs/architecture level), decomposed
        conjunct (ii) (canonical-store host routed to #9/#10, no host selected), left full D.1 NOT YET SATISFIED, kept
        D.2-D.14 UNSATISFIED + gate #8 / MVP-2 OPEN, and selected this Phase 47U acceptance gate; restated read-only, not
        extended.
[ ] 5.  Acceptance criteria are stated and all MET (§6) — AC.1-AC.10 enumerated; AC.1 docs-only; AC.2 decides only
        conjunct (i); AC.3 Candidate D supported by predecessors; AC.4 route-side adapter precise, not a parallel
        canonical lifecycle; AC.5 Straylight canonical semantics preserved; AC.6 canonical-store host unresolved / held
        by #9/#10; AC.7 full D.1 unsatisfied; AC.8 D.2-D.14 unsatisfied; AC.9 gate #8 + MVP-2 open; AC.10 no production /
        migration / route / Freeside / discharge / freeze / production-readiness authorization; each adjudicated MET.
[ ] 6.  Candidate D evidence is faithfully grounded (§7) — 46M selected Candidate D, 46N proposed it, 47Q-47S carried it
        forward as proposed-not-accepted, 47T is the first docs/architecture-level acceptance; the "(or a successor)"
        latitude honored; no fresh unsupported invention.
[ ] 7.  D.1 conjunct consistency assessed (§8) — D.1 is conjunctive; conjunct (i) decided + now accepted; conjunct (ii)
        externally gated, no host selected; full item = (i) AND (ii) => NOT YET SATISFIED, box NOT checked off; the D.1
        acceptance matrix (Decision component / Phase 47T claim / Phase 47U assessment / Status after Phase 47U / Later
        implication) includes conjunct (i), conjunct (ii), full D.1, Dixie route-side responsibility, Straylight canonical
        responsibility, Lane-1 proof-only, Lane-2 production-store, gate #8 discharge, MVP-2 closure.
[ ] 8.  Dixie route-side responsibility boundary is precise (§9) — route-owned contract / idempotency / replay records +
        ingress references + public / private projection; shaped as a StorageAdapter swap-in; NEVER a parallel canonical
        lifecycle; no implementation implied; production path byte-for-byte unchanged.
[ ] 9.  Straylight canonical responsibility boundary preserved (§10) — Assertion / TransitionReceipt / AuditEvent remain
        Straylight-owned through StorageAdapter / AuditLog; Dixie holds ingress references only and re-mints no receipt;
        canonical invariant-preservation evidence (D.2) still owed under Straylight review.
[ ] 10. Canonical-store physical-host dependency assessed (§11) — host NOT selected; externally gated by held sibling
        gates #9/#10; gate #8 cleared no further than Phase 46N paper-level prerequisite; operative discharge held (D.13);
        gate #8 and MVP-2 REMAIN OPEN.
[ ] 11. Lane-1 != Lane-2 boundary preserved (§12) — Lane-1 stays bounded non-production proof; Lane-2 canonical migrations
        stay behind the operative gate; conjunct-(i) decision is never a production-safe claim or a Lane-2
        pre-authorization.
[ ] 12. D.1-D.14 impact matrix complete (§13) — a table with columns Checklist item / Status before Phase 47U / Status
        after Phase 47U / Why / Next implication; D.1-D.14 each appear exactly once; D.1 conjunct (i) accepted by Phase
        47U but full D.1 NOT YET SATISFIED; D.2-D.14 UNSATISFIED; no box checked off; D.13 externally owned/held; D.14
        terminal/downstream.
[ ] 13. Decision options complete and correctly disposed (§14) — Option A (ACCEPT conjunct (i) decision) SELECTED; Option
        B (PATCH) not selected (no defect); Option C (partial acceptance) not selected (no narrowing/reconciliation gap);
        Option D (accept full D.1 now) REJECTED (conjunct (ii) externally gated); Option E (authorize production now)
        REJECTED; Option F (discharge gate #8 now) REJECTED (Straylight-owned, held; gate #8 REMAINS OPEN).
[ ] 14. Verdict wording is bounded (§1) — "ACCEPT PHASE 47T D.1 CONJUNCT (i) DECISION / FULL D.1 REMAINS NOT YET SATISFIED
        / D.2-D.14 REMAIN UNSATISFIED / GATE #8 REMAINS OPEN / MVP-2 REMAINS OPEN"; no unbounded "production-safe",
        "production ready", "MVP-2 closed", "gate #8 discharged", "gate #8 cleared(beyond-46N)", "gate #8 ready",
        "durable storage implemented", "canonical-store host selected", "ownership ADR updated/frozen", "full D.1
        satisfied", or "checklist satisfied" claim anywhere; accepting conjunct (i) is distinguished from satisfying full
        D.1, implementing, freezing, host-selecting, and discharging.
[ ] 15. Next lane is correct (§15) — Phase 47V, a STRICTLY docs/decision-only ADR-022E gate #8 D.1 canonical-store
        physical-host dependency gate addressing the still-open conjunct (ii); explicitly NOT a host selection, NOT
        production implementation, NOT a durable-store lane, NOT a migration, NOT a route/API change, NOT Freeside, NOT a
        production DB write, NOT the gate-#8 discharge, and NOT the MVP-2 closure; must not claim to satisfy full D.1; the
        rule that D.2 must not proceed while full D.1 is unsatisfied is justified.
[ ] 16. No production overclaim — no production-readiness, production-safe, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, ADR-022E-gate-#8-cleared(beyond-46N), gate-#8-ready, production-DB-write, production-
        migration-execution, durable-production-storage, storage-adapter-implementation, ownership-ADR-update/freeze,
        canonical-store-host-selected, Freeside-runtime, Lane-2-canonical, production-auth/consent/signer/identity, full-
        D.1-satisfied, checklist-satisfied, or MVP-2-closed claim; every such reference is negated / blocked / a non-goal
        / a future requirement (§8-§16).
[ ] 17. Acceptance vs satisfaction/discharge distinction is preserved everywhere — every "accept"/"accepted"/"acceptance"
        reference distinguishes accepting the Phase 47T conjunct-(i) decision from satisfying the full D.1 item, any
        D.2-D.14 item, implementing, freezing an ADR, selecting the canonical-store host, or discharging gate #8; gate #8
        and MVP-2 REMAIN OPEN.
[ ] 18. No bad citation regression — no migrate.ts:303-305 citation (migrate.ts is 254 lines); the conditional startup
        migrate is cited as server.ts:303 (if (dbPool)) / server.ts:305 (await migrate(dbPool)); the canonical scope-guard
        denylist is the 19-entry scope-guards.test.ts:122-142 (forbidden-import test :185, file 364 lines); the
        execution-gate seam is index.ts:661/700 with injected sink interface index.ts:124, applyIsolationSpikePlan
        index.ts:568, SYNTHETIC_REF_MAX_LENGTH=80 index.ts:718 (index.ts 914 lines); config.ts DATABASE_URL at
        config.ts:340 (config.ts 485 lines); runner 498 lines; copy-migrations.mjs 62 lines; no-leak.ts 114-key parity,
        286 lines; server.ts 773 lines.
[ ] 19. Forward-traceability note is minimal and evidence-bound (§19) — the single added note (in the Phase 47T D.1
        decision gate) records only that Phase 47U accepted the Phase 47T D.1 conjunct-(i) decision (accept Candidate D
        for route-owned records at the docs/architecture level), confirmed conjunct (ii) stays externally gated by #9/#10
        with no host selected, left the full D.1 item NOT YET SATISFIED, kept D.2-D.14 UNSATISFIED, selected the Phase 47V
        canonical-store physical-host dependency gate (Option A), produced no evidence, satisfied no full checklist item,
        and kept gate-#8 discharge / production / MVP-2 closure work blocked; the note claims no production safety, gate-#8
        readiness, gate-#8 discharge, full-D.1 satisfaction, or MVP-2 closure.
[ ] 20. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5 (no sixth
        vector); self-check 44/44; git diff --check and git diff --cached --check clean; nothing staged (§18).
[ ] 21. No adjacent-repo changes — no file in loa-straylight, freeside-characters, or any adjacent/sibling repo was
        created or modified by Phase 47U.
[ ] 22. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp / temp,
        __pycache__, .pyc, dist, build, or .claude artifact appears in the Phase 47U working tree.
[ ] 23. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the Claude Code memory
        store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
[ ] 24. Section headings are well-formed and single-occurrence — each numbered section heading (## 1. … ## 20.) appears
        exactly once; no duplicated heading; no pasted terminal-report fragment; every Markdown table row is well-formed;
        the triple-backtick count is even; no fenced block is an executable migration or runnable schema.
[ ] 25. The gate is honest about what it does and does not do — it ACCEPTS the Phase 47T D.1 conjunct-(i) decision
        (accept Candidate D's split-storage placement for route-owned records at the docs/architecture level), confirms
        conjunct (ii) stays externally gated by held sibling gates #9/#10 with no host selected, leaves the full D.1 item
        NOT YET SATISFIED, keeps D.2-D.14 UNSATISFIED, and SELECTS a next docs/decision-only D.1 canonical-store
        physical-host dependency lane ONLY; it authorizes no production work, discharges no gate, satisfies no full
        checklist item, selects no canonical-store host, concludes no readiness-for-discharge, clears gate #8 no further,
        updates or freezes no ownership ADR, freezes nothing, implements no storage, and closes no MVP-2; gate #8 and
        MVP-2 REMAIN OPEN (§1 / §8 / §9 / §10 / §11 / §13 / §14 / §15 / §16).
```

---

## 18. Validation record

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47U is
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
grep -RInE 'loa-arcturus|arcturus|loa-sensenet|sensenet' docs app package.json package-lock.json .github 2>/dev/null || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-ACCEPTANCE-GATE.md
```

**Recorded results for this lane** (run during authoring):

- **branch** — `phase-47u-adr022e-gate8-d1-placement-acceptance`, as expected for this phase;
- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-ACCEPTANCE-GATE.md` is added, plus the
  single minimal forward-traceability status note (§19) in the Phase 47T ADR-022E gate #8 D.1 storage-adapter ownership
  / placement decision gate; no runtime source (and specifically not `migrate.ts`, `copy-migrations.mjs`, any `*.sql`,
  the experimental SQL / manifest / planner / runner, `no-leak.ts`, the `aw-sql-execution-sink-spike.test.ts`, the three
  extended Phase 47F test files, `config.ts`, `server.ts`, or `scope-guards.test.ts`), no runtime test, no route-vector
  JSON, validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI,
  migration, SQL, executable schema, or generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0 failures**;
  the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**; the
  `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail closed; 2 exact-key
  non-over-match guards stay clean);
- **diff checks clean** — `git diff --check` and `git diff --cached --check` report no whitespace / conflict-marker
  errors; nothing is staged;
- **docs-only scope checks** — the `app package.json … .github` diff is empty; the only additions are this document and
  the Phase 47T decision gate's single forward-traceability note; the memory/generated/temp scan matches nothing under
  the working tree from this phase;
- **adjacent-repo reference scan** — any `loa-straylight` / `freeside-characters` matches are prose-only and no
  adjacent-repo file is created or modified;
- **overclaim scan** — every match is a **negated / blocked / non-goal / bounded** reference (e.g. "GATE #8 REMAINS
  OPEN", "MVP-2 REMAINS OPEN", "the full D.1 checklist item remains NOT YET SATISFIED", "accepting the conjunct-(i)
  decision satisfies no full checklist item", "does not discharge ADR-022E gate #8", "clears gate #8 no further than
  Phase 46N's documentation / architecture / handoff prerequisite", "operative Straylight-side discharge remains held",
  "selects no host", "route-contract freeze … blocked", "final-schema freeze … blocked", "Lane-2 canonical … blocked",
  "Freeside runtime / client integration … blocked", "makes no claim that `aw_*` SQL is production-safe", "durable
  production storage … blocked", "does not close MVP-2", and every "accept" / "accepted" is qualified to accepting the
  Phase 47T *conjunct-(i) decision*, never satisfying the full D.1 item, satisfying any D.2–D.14 item, implementing,
  freezing an ADR, selecting the canonical-store host, or discharging); there is **no** positive present-tense
  production authorization or safety claim, **no** claim that gate #8 is ready or discharged or cleared beyond the 46N
  prerequisite, **no** claim that the full D.1 item or any D.2–D.14 item is satisfied, and **no** claim that MVP-2 is
  closed or that `aw_*` SQL is production-safe;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–20 exactly once each.

**Forward-traceability status note added (§19 scope):** the Phase 47T ADR-022E gate #8 D.1 storage-adapter ownership /
placement decision gate (which named this Phase 47U gate) gains a single bounded additive Phase 47U note (per §19).

**Corruption / duplicate guard** (carried from the 46I–47T precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 20.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §17 Codex audit
  checklist (a `text` block) and the §18 validation command list (a `bash` block). **No fenced block is an executable
  migration or runnable schema.**

---

## 19. Forward-traceability notes

Phase 47U adds exactly **one** minimal forward-traceability status note, in the Phase 47T ADR-022E gate #8 D.1
storage-adapter ownership / placement decision gate that named this Phase 47U gate. The note is bounded and additive; it
claims **no** production safety, **no** gate-#8 readiness, **no** gate-#8 discharge, **no** full-D.1 or D.2–D.14
satisfaction, and **no** MVP-2 closure.

- `docs/ADMISSION-WEDGE-ADR-022E-GATE-8-D1-STORAGE-ADAPTER-OWNERSHIP-PLACEMENT-GATE.md` — a bounded additive Phase 47U
  forward-traceability status note recording that the D.1 storage-adapter ownership / placement decision *acceptance*
  gate Phase 47T selected (its §18) has run: it **accepted** the Phase 47T **D.1 conjunct-(i) decision** (accept
  Candidate D's split-storage route-side adapter as the docs/architecture-level production storage-adapter ownership /
  placement architecture for route-owned records, a paper architecture decision only, shaped as a `StorageAdapter`
  swap-in, never a parallel canonical lifecycle), **confirmed D.1 conjunct (ii)** (the canonical-store physical host)
  stays **externally gated by held sibling gates #9 / #10** with **no host selected**, left the **full D.1 checklist
  item NOT YET SATISFIED** (box not checked off), kept **D.2–D.14 all UNSATISFIED**, **selected the next lane as a
  strictly docs/decision-only Phase 47V ADR-022E gate #8 D.1 canonical-store physical-host dependency gate** (Option A),
  **produced no evidence**, **satisfied no full checklist item**, **discharged no gate**, **cleared gate #8 no further**
  than Phase 46N's documentation / architecture / handoff prerequisite, and **authorized no production work** — keeping
  **gate #8 OPEN** and **MVP-2 OPEN** and all production / gate-#8 discharge / MVP-2 closure work blocked.

> **Phase 47V status note (forward traceability; added by the Phase 47V ADR-022E gate #8 D.1 canonical-store
> physical-host dependency gate).** The next lane this gate selected (§15) has run:
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-D1-CANONICAL-STORE-PHYSICAL-HOST-DEPENDENCY-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-D1-CANONICAL-STORE-PHYSICAL-HOST-DEPENDENCY-GATE.md)
> (strictly docs/decision-only; **produced no evidence**; Verdict / **Option A** — the D.1 conjunct-(ii) canonical-store
> physical-host dependency **REMAINS HELD under sibling gates #9 / #10**). It **decided the canonical-store
> physical-host dependency status**: the host (Straylight-process / Finn / Dixie-hosted adapter) is **not** selected and
> **cannot** be selected by a Dixie docs-only phase — host wiring is governed by **held** gate #9 (Finn runtime wiring) /
> gate #10 (Dixie boundary wiring), canonical ownership is Straylight's, and no repo evidence discharges #9 / #10 — so the
> dependency is **routed** to held sibling gates #9 / #10 (its resolution path is a host selected plus #9 / #10 resolved
> for the chosen host; D.2 is a separate downstream checklist item, not a prerequisite for satisfying D.1). Because
> conjunct (ii) stays held, Phase 47V left the **full D.1 checklist item NOT YET SATISFIED** (box not checked off) and
> **D.2–D.14 all UNSATISFIED**; it **satisfied no full checklist item**, **selected no canonical-store host**,
> **discharged no gate**, **cleared gate #8 no further** than Phase 46N's documentation / architecture / handoff
> prerequisite, **updated or froze no ownership / placement ADR**, **authorized no production work**, and **selected the
> next lane as a strictly docs/decision-only Phase 47W — Admission Wedge ADR-022E gate #8 D.1 physical-host dependency
> acceptance gate** (which may accept or patch the Phase 47V dependency verdict only and is categorically unable to select
> the canonical-store physical host, satisfy full D.1, satisfy any D.2–D.14 item, discharge gate #8, close MVP-2, or
> authorize production implementation). **Gate #8 and MVP-2 remain OPEN** and all production / gate-#8 discharge / MVP-2
> closure work stays blocked.

No other file is modified.

---

## 20. Final decision statement

**ACCEPT (Option A).** Phase 47U **accepts** the Phase 47T D.1 **conjunct-(i)** decision — *accept Candidate D's
split-storage placement as the docs/architecture-level production storage-adapter ownership / placement architecture for
route-owned records* (a Dixie route-side durable adapter for the endpoint-local contract / idempotency / replay records,
ingress references, and public / private projection, shaped as a **swap-in of the canonical Straylight `StorageAdapter`
interface** and **never a parallel canonical lifecycle**) — as a correctly-bounded, faithfully-grounded,
invariant-preserving **paper architecture decision**. All ten acceptance criteria are MET (§6): Phase 47T is
docs/decision-only and decides only conjunct (i) (§5 / §8); Candidate D / split storage is faithfully grounded (§7); the
Dixie route-side adapter boundary is precise and is a `StorageAdapter` swap-in, never a parallel canonical lifecycle
(§9); Straylight canonical-semantics ownership is preserved (§10); the canonical-store physical host correctly remains
unresolved / held by sibling gates #9 / #10 (§11); the Lane-1 ≠ Lane-2 boundary is preserved (§12); and no production /
migration / route / Freeside / discharge / freeze / production-readiness work is authorized (§16).

**Because D.1 conjunct (ii) (the canonical-store physical host) remains externally gated by held sibling gates #9 / #10,
the full D.1 checklist item remains NOT YET SATISFIED — its box is NOT checked off — and D.2–D.14 all remain
UNSATISFIED** (§8 / §13). **Accepting the conjunct-(i) decision satisfies no full checklist item, checks off no box,
selects no canonical-store host, implements no storage, freezes no ADR, discharges no gate, authorizes no production
work, and closes no MVP-2.** Options D (accept full D.1 now), E (authorize production implementation now), and F
(discharge gate #8 now) are **REJECTED**; Options B (PATCH) and C (partial acceptance) are **not selected** because no
defect, missing evidence, overclaim, citation error, or narrowing / reconciliation gap exists. The selected next lane is
the strictly docs/decision-only **Phase 47V — Admission Wedge ADR-022E gate #8 D.1 canonical-store physical-host
dependency gate** (§15), which addresses the still-open D.1 conjunct (ii) dependency held by sibling gates #9 / #10.

**Gate #8 REMAINS OPEN. MVP-2 REMAINS OPEN. All production work remains BLOCKED.**
