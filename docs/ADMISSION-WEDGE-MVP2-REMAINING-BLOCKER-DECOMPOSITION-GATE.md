# Phase 47P — Admission Wedge MVP-2 remaining blocker decomposition / next-corridor selection gate

> **Phase**: 47P
> **Branch context**: `phase-47p-admission-mvp2-blocker-decomposition-gate`
> **Related**: Phase 47O (PR #186, commit `0c06720e`,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-CORRIDOR-CLOSURE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-CORRIDOR-CLOSURE-GATE.md))
> **accepted** Lane-1 `aw_*` SQL execution corridor closure **only for the bounded non-production proof corridor**
> (Verdict / Option A) and **explicitly kept MVP-2 OPEN**, inventorying the standing MVP-2 blockers and naming **this
> Phase 47P** MVP-2 remaining-blocker decomposition / next-corridor selection gate as the next docs/decision-only lane;
> Phase 47N (PR #185, commit `7165128d`,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-ACCEPTANCE-GATE.md))
> **accepted** the merged Phase 47M (PR #184, commit `4ec76567`) redacted, **non-production, disposable-local**
> PostgreSQL 16 least-privilege (P.2 / P.3) role / grant evidence as clearing the binding Phase 47I §16 P.2 / P.3 gap
> **for the bounded Lane-1 non-production / disposable-local evidence corridor**, and **recorded full Phase 47J
> acceptance — strictly within the non-production Lane-1 limits** (Verdict A); Phase 47M (PR #184,
> [`admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md))
> **produced** that evidence and **did not self-accept**; Phase 47L (PR #183, commit `d056cbf7`,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md))
> **decomposed** the P.2 / P.3 evidence blocker and **authorized** Phase 47M; Phase 47K (PR #182, commit `66c09514`,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md))
> **partially accepted (PATCH / NOT FULLY ACCEPTED)** Phase 47J on the then-undemonstrated P.2 / P.3 gap; Phase 47J
> (PR #181, commit `a377922d`,
> [`admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md))
> **implemented** the bounded, disabled-by-default, dev/operator/test-only, **NON-PRODUCTION**, exact-scope, fail-closed
> Lane-1 `aw_*` SQL **execution-sink** spike inside the Phase 47I file envelope; Phase 47I (PR #180,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md))
> **conditionally authorized** Phase 47J and made the §16 **P.1–P.7** privilege / secret / logging checklist binding;
> Phase 47H (PR #179) **decomposed** the execution-sink / real-DB boundary and kept execution **BLOCKED**; Phase 47G
> (PR #178) **accepted** the merged Phase 47F isolation spike as a bounded, disabled-by-default, dev/operator-only,
> **NON-PRODUCTION**, location-isolated SQL **planning / manifest / safety-proof** spike; Phase 47F (PR #177, commit
> `ae24ca35`) **implemented** the isolated SQL / manifest / planner / runner / tests / runbook (`--apply` refused);
> Phase 47A (PR #172) implemented Storage Mode 2 as a file-backed `.json` snapshot store, accepted by Phase 47B
> (PR #173) — the **live Option D / fallback** path; Straylight (`@loa/straylight`) PR #65 (A–O primitive review,
> **merged**); Straylight-repo ADR-022E durable-store gate #8 (+ sibling gates, **held operatively**); ADR-022D receipt /
> audit-chain invariants.
> **Status**: **docs / decision-only MVP-2 remaining-blocker decomposition / next-corridor selection gate.** This gate
> adds **only this document** (plus a single minimal forward-traceability status note, §19, in the Phase 47O corridor
> closure gate). It modifies **no** runtime source — and specifically does **not** modify `app/src/db/migrate.ts`,
> `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`, `app/src/server.ts`, `app/src/config.ts`,
> `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts`, the experimental `.sql` files, the
> `manifest.json`, the `aw-sql-isolation-spike-runner.mjs`, `no-leak.ts`, the `aw-sql-execution-sink-spike.test.ts`, the
> three extended Phase 47F test files, or `scope-guards.test.ts` — and changes **no** route handler, store / storage
> code, DB write, migration, SQL file, executable schema, migration runner, packager, scope guard, auth, consent,
> route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, other test,
> package export, config, env, package, lockfile, CI, generated file, or binary. No adjacent repository
> (`loa-straylight`, `freeside-characters`, or any sibling repo) is touched.
> **This is the MVP-2 remaining-blocker *decomposition / next-corridor selection* gate** — the docs/decision-only rung
> Phase 47O §16 named, downstream of the bounded non-production Lane-1 corridor closure, mirroring the chain's
> decompose-before-authorize discipline (47C / 47H / 47L). It **takes the Phase 47O §11–§14 standing-blocker inventory,
> decomposes it into candidate next corridors with an explicit dependency map, and selects which corridor to open
> next** — without itself implementing anything, authorizing any production work, discharging any gate, or closing
> MVP-2. **It produces no evidence, runs no role / grant test, opens no connection, executes nothing, and implements
> nothing.** It **enables no production `--apply`, injects no DB client / sink, opens no DB connection, performs no DB
> write, executes no migration, adds no SQL or executable schema, changes no migration runner / packager / startup /
> config, weakens or edits no scope guard, implements no auth or consent, changes no route / API behavior, freezes
> neither the route contract nor the final schema, discharges no operative Straylight-side gate, closes no MVP-2, and
> claims no production readiness.** Production DB execution, production migration execution, durable production storage,
> ADR-022E gate #8 discharge, MVP-2 closure, and all production work **remain BLOCKED** (§5–§15 / §17 / §18). This gate
> **selects the next corridor**; it **opens** none of them and **implements** none of them.

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
`FORBIDDEN_PUBLIC_KEYS`; **286 lines**), and the **canonical** Phase 33N static scope guards
`app/tests/unit/admission-wedge-spike/scope-guards.test.ts` (the 19-entry `DURABLE_WRITE_DENYLIST` at
`scope-guards.test.ts:122-142`; the forbidden-import test at `:185`; the file is **364 lines**) — all of which Phase
47P leaves **unedited**. Nothing below is executed; this gate **decomposes already-merged decisions** and **selects a
next corridor**, it produces no evidence and unblocks nothing.

---

## 1. Status / verdict

**Verdict: SELECT ADR-022E GATE #8 / PRODUCTION STORAGE-ADAPTER BINDING CORRIDOR NEXT; MVP-2 REMAINS OPEN.**

This is **decision-structure Option A** (§16): of the standing MVP-2 blockers Phase 47O left open, the **ADR-022E gate
#8 / production storage-adapter binding corridor** is selected as the next corridor to address, because the dependency
map (§8) shows gate #8 is the **dominant cross-repo blocker** that sits upstream of production durable storage,
storage-adapter ownership / placement, the Lane-2 canonical Straylight-store migration path, and production migration
execution. Addressing it next sequences the largest number of downstream blockers behind a single corridor.

Crucially — and consistent with the chain's decompose-before-authorize discipline — selecting Option A does **not**
authorize any production work. It selects a corridor and routes it to a **further, separate, strictly docs/decision-only**
next lane:

> **Selected next lane (§17): Phase 47Q — Admission Wedge ADR-022E gate #8 production storage-adapter binding blocker
> decomposition gate** (a *separate*, strictly docs / decision-only gate — NOT a production implementation, NOT a
> durable-store lane, NOT the gate-#8 discharge, and NOT the MVP-2 closure itself).

> **Phase 47Q status note (forward traceability; added by the Phase 47Q ADR-022E gate #8 production storage-adapter
> binding blocker decomposition gate).** The next lane this gate selected (§17) has run:
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-STORAGE-ADAPTER-BINDING-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-STORAGE-ADAPTER-BINDING-BLOCKER-DECOMPOSITION-GATE.md)
> **decomposed** the ADR-022E gate #8 / production storage-adapter binding blocker this gate selected (§16 / §17) into
> its unresolved architectural predicates (storage-adapter ownership / placement; canonical semantics owner; migration-
> file and migration-execution owners; runtime route storage-call owner; Lane-1-to-Lane-2 relationship; production DB
> write / route-API / Freeside authorization; auth / consent / signer / authority attachment; tenant / estate / actor
> identity binding; public-response / raw-payload / no-leak boundary; MVP-2 closure dependency), **produced no evidence**
> (strictly docs/decision-only), and **selected Option A — a separate, strictly docs/decision-only Phase 47R ADR-022E
> gate #8 clearing-readiness gate** as the next lane. Phase 47Q discharged **no** gate, cleared gate #8 **no** further
> than Phase 46N's documentation / architecture / handoff prerequisite, implemented **no** storage, updated **no**
> ownership ADR, authorized **no** production work, and **closed no MVP-2**; **gate #8 and MVP-2 remain OPEN** and all
> production / gate-#8 / MVP-2 closure work stays blocked.

For the avoidance of doubt, this selection is **bounded** and says only what the chain supports:

- **"Select the gate #8 / storage-adapter binding corridor next" means choosing which blocker corridor the next
  docs/decision lane decomposes** — it does **not** discharge ADR-022E gate #8, **not** implement a storage adapter,
  **not** bind any production storage, and **not** open the corridor for implementation.
- **It does not close MVP-2.** MVP-2 closure remains a *further, separate* terminal gate downstream of every blocker
  (§7 / §16 / §17). This gate **does not close MVP-2 by implication**, and **MVP-2 remains OPEN**.
- **It does not discharge ADR-022E gate #8.** Gate #8 is Straylight-owned, operatively held, and remains the dominant
  cross-repo blocker (§9). This gate discharges nothing.
- **It does not authorize production DB execution, production `--apply`, production DB writes, or production migration
  execution** (§11 / §18).
- **It does not authorize durable production storage, a production storage adapter, Lane-2 canonical Straylight-store
  migrations, production auth / consent / signer / authority, tenant / estate / actor identity binding, route / API
  behavior change, public-response expansion, raw-payload persistence, or Freeside runtime / client integration**
  (§9–§15 / §18).
- **It does not freeze the route contract or the final schema** (`route_contract_final` stays false; `schema_final`
  stays false).
- **It makes no claim that `aw_*` SQL is production-safe.**

What Phase 47P **is**, stated narrowly: it is **docs / decision-only**. It reads the merged Phase 47O closure record
read-only, restates what Phase 47O closed (§5) and left open (§6), assembles the remaining MVP-2 blocker inventory
(§7), records a blocker → status → depends-on → blocks → priority dependency map (§8), assesses each blocker domain
(§9–§15), disposes the decision options (§16), selects the next corridor and its next docs/decision-only lane (§17),
records non-goals and blocked work (§18), provides a Codex audit checklist (§19), and runs the docs validators on the
unchanged artifacts (§20). It implements, executes, enables, injects, freezes, discharges, and closes (MVP-2)
**nothing**.

---

## 2. Scope

Phase 47P is the **docs/decision-only** MVP-2 remaining-blocker decomposition / next-corridor selection gate named by
Phase 47O §16 — the **separate, strictly docs/decision-only** rung that, after the bounded non-production Lane-1
corridor was closed as a proof stack, decomposes the standing MVP-2 blockers and decides which corridor to open next.
Its job is to decide: (a) what are the remaining MVP-2 blockers after Phase 47O; (b) how do they depend on one another;
(c) which corridor should the next lane address; and (d) what is that next docs/decision-only lane. It is a
**decomposition / selection gate, not the corridor itself, and not the MVP-2 closure**.

**In scope (this PR):**

- this single new document; and
- a single minimal forward-traceability status note (§19) in the Phase 47O corridor closure gate, which named this
  Phase 47P gate.

**Explicitly out of scope (this PR) — Phase 47P produces nothing and runs nothing:**

- no new evidence of any kind; no disposable database; no role; no grant; no privilege test; no forward or cleanup SQL
  run under any role; no `psql` session; no Docker / Postgres invocation; no operator run;
- no runtime source / test / config / package / SQL / migration / route-vector / validator / fixture change;
- no edit to `index.ts`, the runner, `no-leak.ts`, `scope-guards.test.ts`, `migrate.ts`, `copy-migrations.mjs`,
  `server.ts`, `config.ts`, or any `*.sql`;
- no production `--apply` enablement, no DB client / sink injection, no DB connection, no DB write, no migration
  execution;
- no durable-store implementation, no storage-adapter implementation, no production migration file;
- no auth / consent / signer / authority implementation; no tenant / estate / actor identity implementation;
- no route / API behavior change, no public response change, no raw candidate payload persistence, no Freeside
  integration;
- no Lane-2 canonical Straylight-store migration; no ADR-022E gate #8 discharge; no route-contract / final-schema
  freeze; **no MVP-2 closure**; no production readiness claim; no claim that `aw_*` SQL is production-safe.

This gate **decomposes and selects**; it **produces** nothing, **opens** no corridor, and **closes no MVP-2**.
Production execution, production storage, gate-#8 discharge, and MVP-2 closure are exactly what *future, separate gates*
must adjudicate — not what this gate asserts.

---

## 3. Source chain

Each predecessor is read **read-only**; this gate re-accepts no predecessor decision and unblocks no production lane.

- **Phase 47F / PR #177 (commit `ae24ca35`)** — implemented the bounded Lane-1 `aw_*` SQL isolated dev/operator
  planning spike; `--apply` **refused**. **Not modified.**
- **Phase 47G / PR #178** — accepted Phase 47F only as a bounded, disabled-by-default, dev/operator-only,
  non-production, location-isolated SQL planning / manifest / safety-proof spike. **Not modified.**
- **Phase 47H / PR #179** — decomposed the execution-sink / real-DB boundary and kept execution **BLOCKED**. **Not
  modified.**
- **Phase 47I / PR #180** — conditionally authorized Phase 47J and made the **§16 P.1–P.7** privilege / secret /
  logging checklist **binding**. **Not modified.**
- **Phase 47J / PR #181 (commit `a377922d`)** — implemented the bounded execution-sink spike under the Phase 47I
  envelope. **Not modified.**
- **Phase 47K / PR #182 (commit `66c09514`)** — **partially accepted (PATCH / NOT FULLY ACCEPTED)** Phase 47J, withholding
  full acceptance on the then-undemonstrated §16 P.2 / P.3 least-privilege evidence. **Not modified.**
- **Phase 47L / PR #183 (commit `d056cbf7`)** — decomposed the P.2 / P.3 evidence blocker and **authorized Phase 47M**
  as a future, separate, bounded, dev/operator/test-only, disabled-by-default, non-production, disposable-Postgres-only
  evidence lane. **Not modified.**
- **Phase 47M / PR #184 (commit `4ec76567`)** — **produced** the redacted, disposable-local PostgreSQL 16
  least-privilege (P.2 / P.3) evidence; **did not self-accept**. **Not modified.**
- **Phase 47N / PR #185 (commit `7165128d`)** — **accepted** the merged Phase 47M evidence as clearing P.2 / P.3 **for
  the bounded Lane-1 non-production / disposable-local corridor**, and **recorded full Phase 47J acceptance within the
  non-production Lane-1 limits** (Verdict A). **Not modified.**
- **Phase 47O / PR #186 (commit `0c06720e`)** — **accepted** Lane-1 `aw_*` SQL execution corridor closure **only for
  the bounded non-production proof corridor** (Option A), **explicitly kept MVP-2 OPEN**, inventoried the standing MVP-2
  blockers (§11–§14), and **named this Phase 47P** MVP-2 remaining-blocker decomposition / next-corridor selection gate
  as the next lane. **The immediate predecessor; gains the single Phase 47P forward-traceability status note (§19).**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner and the
  decision records cited as guardrails (§9 / §10 / §18). Cross-repo references, **not edited.**

This decomposition also reads, read-only, the merged Dixie decision records that already decompose individual
downstream blockers — among them the gate-#8 reauthored clearing ADR and sibling handoff packet
(`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`,
`…-REAUTHORED-SIBLING-HANDOFF-PACKET.md`), the production-adapter schema / migration decomposition gate
(`docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`), the durable-store
schema / migration design gates (`…-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md`, `…-DESIGN-ACCEPTANCE-GATE.md`), and
the auth / consent design gates (`docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`,
`…-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`, `…-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`). **None is edited;**
each is referenced only to ground the blocker statuses below as design / decomposition artifacts, **not** implemented
production architecture.

---

## 4. Question being decided

Phase 47O §16 routed the MVP-2 remaining-blocker decomposition / next-corridor selection to this gate. Phase 47P
decides exactly one question, in four precisely-bounded parts:

1. **What are the remaining MVP-2 blockers** after the bounded non-production Lane-1 corridor was closed as a proof
   stack (Phase 47O), and how does each currently stand (§5–§7)?
2. **How do the blockers depend on one another** — which is upstream, which is downstream, and which corridor sequences
   the most downstream blockers (§8)?
3. **Which corridor should the next docs/decision lane address** — given that MVP-2 closure is a further, separate
   terminal gate over the standing blockers (§16)?
4. **What is the next safe lane** — strictly docs/decision-only, decomposing the chosen corridor before any production
   implementation (§17)?

The question is **not** whether to implement any corridor (Phase 47P implements none), **not** whether to close MVP-2
(closure is a further separate terminal gate, §16 / §17), **not** whether to authorize any production work (all
production work stays blocked, §9–§15 / §18), and **not** whether to discharge ADR-022E gate #8 (Straylight-owned,
operatively held, §9). It is strictly: *what blockers remain, how do they depend on one another, which corridor is
next, and what is the next docs/decision-only lane.*

---

## 5. What Phase 47O closed

Restated read-only from the merged Phase 47O corridor-closure gate (PR #186), to bound this decomposition exactly to
what is already closed — never beyond it. Phase 47O closed **only the bounded non-production `aw_*` SQL execution proof
stack** — that is, each of the following corridor elements is accepted as a **non-production, disabled-by-default,
dev/operator/test-only** proof, and **nothing more**:

- SQL isolation / planning (47F / 47G);
- manifest / location guard (the experimental SQL lives outside the production migration path; the guarded
  `SPIKE_FILES`);
- runner-only DB-touching path (`aw-sql-isolation-spike-runner.mjs`, 498 lines, the only DB-touching caller; the
  production runner `migrate.ts`, 254 lines, and packager `copy-migrations.mjs` untouched);
- exact file-envelope compliance (the Phase 47I §8 envelope);
- target-policy hardening (`NODE_ENV=production` refused; the production `DATABASE_URL` refused; disabled-by-default;
  not in CI);
- query-parameter refusal before connect;
- fail-closed connect ordering (the execution-gate seam `index.ts:661` / `:700` gating `applyIsolationSpikePlan`
  `index.ts:568` via the injected sink `index.ts:124`);
- real-engine forward execution (a disposable, non-production PostgreSQL target under a least-privilege role);
- CHECK / UNIQUE / transaction proof (live data-plane probes; grounded in the frozen DDL's named CHECK / PK / UNIQUE
  constraints);
- cleanup / down proof (the separate cleanup role with proven per-object ownership);
- no-leak parity (the runtime ↔ validator **114 = 114** `FORBIDDEN_PUBLIC_KEYS` parity in `no-leak.ts`, 286 lines,
  unchanged);
- P.2 / P.3 least-privilege evidence (accepted for the bounded corridor by Phase 47N);
- Phase 47J full bounded acceptance (recorded within the non-production Lane-1 limits).

**This closure is bounded to the non-production proof corridor only.** Phase 47O explicitly recorded that production DB
execution, production migration execution, durable production storage, ADR-022E gate #8 discharge, and MVP-2 closure
**all remain BLOCKED**, and made **no** claim that `aw_*` SQL is production-safe. Phase 47P operates strictly inside
those Phase 47O limits; it does not extend the closure.

---

## 6. What Phase 47O left open

Phase 47O explicitly left the following **open / blocked** (carried forward verbatim as the standing-blocker set this
gate decomposes):

- ADR-022E gate #8;
- Lane-2 canonical Straylight-store migrations;
- production durable storage;
- storage-adapter ownership / placement;
- production auth / consent / signer / authority;
- tenant / estate / actor identity binding;
- route / API behavior change;
- Freeside runtime / client integration;
- production migration execution / runner / startup wiring;
- public-response expansion / raw-payload persistence;
- a separate MVP-2 closure gate.

**MVP-2 remains OPEN.** None of these is discharged, implemented, or closed by Phase 47P; this gate **decomposes** them
(§7 / §8) and **selects which corridor to open next** (§16 / §17), and nothing more.

---

## 7. Remaining MVP-2 blocker inventory

With the Lane-1 corridor closed as a non-production proof stack, MVP-2 closure remains gated by the following standing
blockers. **None is discharged or closed by this gate**; this is the inventory the dependency map (§8) sequences and
the domain assessments (§9–§15) detail. At minimum:

1. **ADR-022E gate #8 not discharged** for production storage / adapter binding — Straylight-owned, operatively held.
   The dominant cross-repo blocker (§9).
2. **Lane-2 canonical Straylight-store migration / schema path** — unimplemented and unaccepted (§10).
3. **Production durable storage** — not implemented (the live path is the Phase 47A `.json` Mode 2 fallback) (§11).
4. **Production storage adapter ownership / placement** — unresolved beyond the bounded Lane-1 evidence; the canonical
   `StorageAdapter` stays Straylight-owned; Candidate D / split-storage remains proposal input / design baseline, not
   implemented architecture (§11).
5. **Production auth / consent / signer / authority model** — not implemented (§12).
6. **Production tenant / estate / actor identity binding** — unresolved / not implemented (synthetic-only binding
   today) (§13).
7. **Route / API behavior** — not changed for production admission storage; the public response shape and the
   **114 = 114** runtime ↔ validator no-leak parity stay unchanged (§14).
8. **Freeside runtime / client integration** — not authorized; Freeside stays a consumer / handoff surface (§14).
9. **Production migration execution / runner / startup wiring** — not authorized (`migrate.ts` 254 lines,
   `copy-migrations.mjs`, the conditional startup `if (dbPool)` at `server.ts:303` / `await migrate(dbPool)` at
   `server.ts:305`, `config.ts` `DATABASE_URL` at `:340` — all unchanged) (§11).
10. **Public-response expansion / raw candidate payload persistence** — not authorized (§15).
11. **No MVP-2 closure gate** has accepted the whole MVP-2 stack — MVP-2 closure is a *further, separate* terminal gate
    downstream of this decomposition (§16 / §17).

These eleven items are the standing MVP-2 blocker set after Phase 47O closure. They are sequenced in §8 and detailed by
domain in §9–§15.

---

## 8. Blocker dependency map

Each blocker is mapped to its current status, the blockers it **depends on** (upstream), the blockers it **blocks**
(downstream), a candidate next-lane priority, and the grounding source. Priorities are relative within the standing set:
**P0** = the dominant upstream corridor selected next; **P1** = unblocked once the P0 corridor's storage boundary is
decided; **P2** = needs a storage model first; **P3** = downstream surface work; **terminal** = the MVP-2 closure gate,
which depends on all others. **No row asserts that any blocker is discharged, implemented, or production-safe.**

| Blocker | Current status | Depends on | Blocks | Candidate next-lane priority | Notes / evidence source |
|---------|----------------|------------|--------|------------------------------|-------------------------|
| ADR-022E gate #8 (production storage-adapter binding) | **BLOCKED** — operatively held, Straylight-owned; Dixie-side docs/arch/handoff prerequisite only (46N) | Straylight-side discharge of ADR-022E gate #8 (cross-repo) | Production durable storage; storage-adapter ownership/placement; Lane-2 canonical migrations; production migration execution | **P0 — SELECTED next corridor** | 47O §13; `…-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`; `…-REAUTHORED-SIBLING-HANDOFF-PACKET.md` |
| Lane-2 canonical Straylight-store migrations | **BLOCKED** — unimplemented / unaccepted | Gate #8 discharge; canonical `StorageAdapter` shape (Straylight-owned) | Production durable storage on the canonical store | P1 | 47O §13; cross-repo (Straylight ADR-022E) |
| Production durable storage | **BLOCKED / NOT IMPLEMENTED** — live path is Phase 47A `.json` Mode 2 fallback | Gate #8; storage-adapter ownership; Lane-2 or Lane-1 placement decision | Production admission persistence; production migration execution | P1 | 47O §12; Phase 47A/47B (PR #172/#173) |
| Storage-adapter ownership / placement | **UNRESOLVED** beyond bounded Lane-1 evidence | Gate #8 (boundary); Candidate D / split-storage disposition | Production durable storage; Lane-2 placement | P0-adjacent (decided within the gate-#8 corridor) | 47O §12/§13; Candidate D = proposal/design baseline (46N) |
| Production auth / consent / signer / authority | **NOT IMPLEMENTED** — design gates only | Storage model (where consent proof / receipt persists) | Production admission; identity binding | P2 | 47O §12; `…-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`; `…-CONSENT-PROOF-RECEIPT-DECISION-GATE.md` |
| Tenant / estate / actor identity binding | **UNRESOLVED** — synthetic-only binding today | Auth / authority model | Production admission identity correctness | P2 | 47O §12 |
| Route / API behavior change | **BLOCKED** — route handler / public shape / route-vectors unchanged | Storage + auth + identity | Production admission surface; route-contract freeze | P3 | 47O §14; `route_contract_final` stays false |
| Freeside runtime / client integration | **BLOCKED** — Freeside is consumer / handoff surface | Route / API behavior; route-contract freeze | End-to-end production admission via Freeside | P3 (last surface) | 47O §14 |
| Production migration execution / runner / startup wiring | **BLOCKED** — production path unchanged | Durable storage + gate #8 + final-schema | Durable production persistence at boot | P1 | 47O §12; `migrate.ts` (254 lines), `copy-migrations.mjs`, `server.ts:303`/`:305`, `config.ts:340` |
| Public-response expansion / raw candidate payload persistence | **BLOCKED** — public shape + 114=114 no-leak parity unchanged | Route / API behavior; no-leak parity preservation | Any expanded public contract | P3 | 47O §14; `no-leak.ts` (286 lines) |
| Separate MVP-2 closure gate | **NOT RUN** — MVP-2 remains OPEN | **All** of the above closed/discharged | MVP-2 closure | **terminal** (after all) | 47O §11/§16 |

**Map conclusion.** The dependency graph has a single dominant upstream node — **ADR-022E gate #8** — that blocks
production durable storage, storage-adapter ownership / placement, Lane-2 canonical migrations, and production migration
execution. Auth / consent / signer / authority and tenant / estate / actor identity binding depend on the storage model
being decided first; route / API behavior, Freeside integration, and public-response expansion are downstream surface
work; the MVP-2 closure gate is terminal and depends on every other blocker. The corridor that sequences the most
downstream blockers behind one decision is therefore the **ADR-022E gate #8 / production storage-adapter binding
corridor** — which is why Option A is selected (§16). **No blocker is moved out of BLOCKED / UNRESOLVED / NOT-RUN status
by this map.**

---

## 9. ADR-022E gate #8 assessment

**BLOCKED after Phase 47P.** ADR-022E gate #8 is the Straylight-owned, operatively-held durable-store gate. Phase 46N
cleared gate #8 **only as a bounded Dixie documentation / architecture / handoff prerequisite**; the **operative
Straylight-side discharge stays blocked**, and this gate discharges **nothing**. It remains the **dominant cross-repo
blocker** for production admission storage, because production durable storage, storage-adapter ownership / placement,
the Lane-2 canonical-store migration path, and production migration execution all sit downstream of it (§8). The
canonical `StorageAdapter` / `Assertion` / `TransitionReceipt` / `AuditEvent` shapes stay **Straylight-owned** (cross-repo
references only). Candidate D (split-storage) remains **proposal input / design baseline, not implemented production
architecture** (grounded read-only against `…-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md` and the reauthored sibling
handoff packet). **Selecting this corridor next (§16) decomposes it; it does not discharge it.**

---

## 10. Lane-2 canonical Straylight-store migration assessment

**BLOCKED after Phase 47P.** The Lane-2 canonical Straylight-store migration / schema path is unimplemented and
unaccepted. Each Lane-2 canonical-store migration is a separate sibling-repo ADR under Straylight teammate review,
**behind the operative gate #8** (§9). Lane-2 therefore **depends on** the gate-#8 corridor decision and on the
canonical `StorageAdapter` shape (Straylight-owned); it is **not** the next corridor because it cannot proceed until the
gate-#8 / storage-adapter boundary is decided first (§8). This gate authorizes **no** Lane-2 canonical Straylight-store
migration and implements **no** canonical-store schema.

---

## 11. Production durable storage / adapter ownership assessment

**BLOCKED after Phase 47P.** No durable production store exists; the live Mode 2 path remains the accepted Phase 47A
`.json` snapshot store (Option D / fallback). Production durable storage, the production durable-store implementation,
production migration files, and an executable production schema are all **not implemented** and **blocked**. Production
storage-adapter ownership / placement is **unresolved** beyond the bounded Lane-1 evidence; the canonical
`StorageAdapter` stays Straylight-owned, and Candidate D / split-storage remains proposal input / design baseline, not
implemented architecture. The production migration runner (`migrate.ts`, 254 lines), the packager
(`copy-migrations.mjs`), the conditional startup migrate (`if (dbPool)` at `server.ts:303` / `await migrate(dbPool)` at
`server.ts:305`), and the env wiring (`config.ts` `DATABASE_URL` at `:340`) are **all unchanged**. Storage-adapter
ownership / placement is **P0-adjacent** — it is decided *within* the gate-#8 corridor (§8 / §9), which is precisely why
the gate-#8 corridor is selected next. This gate implements **no** durable store, **no** storage adapter, and **no**
production migration, and changes **no** runner / packager / startup / config.

---

## 12. Auth / consent / signer / authority assessment

**BLOCKED after Phase 47P.** The production auth / consent / signer / authority model is **not implemented**; only
design / decision gates exist (`…-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`,
`…-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`, `…-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md` — design artifacts, not
implemented production code). Missing / unauthorized auth fails closed, and missing / invalid consent fails closed in
any future production admission model. This corridor **depends on** the storage model being decided first — consent
proof and `TransitionReceipt` material must have a durable home before an auth / consent model can be implemented —
which is why it is **P2**, downstream of the selected gate-#8 corridor (§8). This gate implements **no** auth, consent,
signer, or authority.

---

## 13. Tenant / estate / actor identity-binding assessment

**BLOCKED after Phase 47P.** Production tenant / estate / actor identity binding is **unresolved**; the binding is
**synthetic-only** today. Real production identity binding **depends on** the auth / authority model (§12), which in
turn depends on the storage model — so identity binding is **P2**, downstream of the selected gate-#8 corridor (§8).
This gate implements **no** tenant / estate / actor identity binding and makes **no** production identity claim.

---

## 14. Route/API and Freeside integration assessment

**BLOCKED after Phase 47P.**

- **Route / API behavior change for production admission storage** — blocked; the route handler, public response shape,
  and route-vector JSON / validator are unchanged. The route-contract freeze (`route_contract_final` stays false)
  remains blocked.
- **Freeside runtime / client integration** — blocked. Freeside stays a **consumer / handoff surface**; no Freeside
  runtime or client wiring is authorized.

Both **depend on** the storage + auth + identity corridors being decided first, so they are **P3** downstream surface
work (§8). This gate changes **no** route / API behavior and authorizes **no** Freeside integration.

---

## 15. Public response / raw-payload persistence assessment

**BLOCKED after Phase 47P.** Public-response expansion and raw candidate payload persistence are **not authorized**; the
public response shape and the **114 = 114** runtime ↔ validator no-leak parity (`no-leak.ts`, 286 lines) stay unchanged.
This corridor **depends on** the route / API behavior corridor and the preservation of no-leak parity, so it is **P3**
downstream surface work (§8). User chat does **not** become memory merely because it was said; public responses leak
**no** raw / private / audit / debug / source / auth / signer / consent / storage material. This gate expands **no**
public response and persists **no** raw candidate payload.

---

## 16. Decision options

Phase 47P weighs five options for selecting the next corridor after the bounded non-production Lane-1 corridor closure:

### Option A — SELECT the ADR-022E gate #8 / production storage-adapter binding corridor next. **SELECTED.**

**Selected** because the dependency map (§8) shows ADR-022E gate #8 is the **dominant upstream cross-repo blocker**:
production durable storage, storage-adapter ownership / placement, the Lane-2 canonical Straylight-store migration path,
and production migration execution all sit downstream of it (§9–§11). Selecting this corridor next sequences the largest
number of downstream blockers behind a single decision. Consistent with the chain's decompose-before-authorize
discipline, Option A routes the corridor to a **further, separate, strictly docs/decision-only** Phase 47Q gate-#8
blocker-decomposition lane (§17); it discharges **no** gate, implements **no** storage, and closes **no** MVP-2.

### Option B — SELECT the Lane-2 canonical Straylight-store migration / schema corridor next. **Not selected.**

**Not selected.** The Lane-2 canonical Straylight-store migration path **depends on** the gate-#8 corridor decision and
the canonical `StorageAdapter` shape (Straylight-owned), and is therefore downstream of Option A (§8 / §10). Selecting
Lane-2 first would attempt to decompose a corridor whose upstream boundary (gate #8 / storage-adapter binding) is not
yet decided. Option B is the natural successor *after* the gate-#8 corridor, not before it.

### Option C — SELECT the production auth / consent / signer / authority and tenant / estate / actor identity-binding corridor next. **Not selected.**

**Not selected.** Auth / consent / signer / authority and tenant / estate / actor identity binding **depend on** the
storage model being decided first — consent proof and `TransitionReceipt` material need a durable home before an
auth / consent model can be implemented (§8 / §12 / §13). This corridor is **P2**, downstream of the selected gate-#8
corridor. Selecting it now would invert the dependency order.

### Option D — SELECT the production route / API behavior and Freeside integration corridor next. **Not selected.**

**Not selected.** Route / API behavior change, Freeside runtime / client integration, and public-response expansion are
**P3 downstream surface work** that depends on the storage + auth + identity corridors being decided first (§8 / §14 /
§15). Selecting it now would be the furthest-downstream choice while the dominant upstream blocker (gate #8) stands.

### Option E — SELECT an MVP-2 closure gate now. **REJECTED.**

**Rejected**, and strongly so — this should almost certainly be rejected, and is. An MVP-2 closure gate is the
**terminal** node in the dependency map (§8): it depends on **every** other blocker being closed / discharged, and none
is. Selecting it now would (a) exceed the explicit Phase 47O limits (which kept MVP-2 OPEN, §5 / §6), (b) assert
production properties no corridor has proved (production execution, durable storage, production least privilege, route /
schema freeze), and (c) discharge a Straylight-owned gate (#8) this repo cannot discharge (§9). Nothing in the evidence
warrants closing MVP-2. Option E is rejected; **MVP-2 remains OPEN**.

**Conclusion.** Decision-structure **Option A**: select the ADR-022E gate #8 / production storage-adapter binding
corridor next; route it to a separate, strictly docs/decision-only Phase 47Q blocker-decomposition gate (§17); keep
Phase 47P docs/decision-only; preserve every standing blocker; reject Option E; hold Options B / C / D as the
non-selected, downstream-ordered alternatives the dependency map does not warrant selecting first.

---

## 17. Selected next corridor

> **Selected next corridor: ADR-022E gate #8 / production storage-adapter binding (Option A).**
>
> **Selected next lane: Phase 47Q — Admission Wedge ADR-022E gate #8 production storage-adapter binding blocker
> decomposition gate** (a *separate*, strictly docs / decision-only gate — NOT a production implementation, NOT a
> durable-store lane, NOT the gate-#8 discharge, and NOT the MVP-2 closure itself).

With the bounded non-production Lane-1 `aw_*` SQL execution corridor closed as a proof stack (§5) and the dependency map
showing ADR-022E gate #8 as the dominant upstream blocker (§8), the disciplined next rung is a **docs/decision-only
gate-#8 / storage-adapter-binding blocker-decomposition gate** (Phase 47Q) that takes the §9 / §11 gate-#8 and
storage-adapter assessments and **decomposes the prerequisites** that must be true before any future PR may bind a
production storage adapter, place the canonical store, or proceed toward a Straylight-side gate-#8 discharge — and
selects the lane after it — **without itself implementing, authorizing production work, discharging the gate, or closing
MVP-2.**

Phase 47Q **must be strictly docs / decision-only**. It must **not** produce evidence, run any role / grant test, enable
production `--apply`, inject any sink, open any connection, change any production-path file, implement a durable store or
storage adapter, write a production migration, freeze any contract / schema, discharge ADR-022E gate #8 or any
Straylight-side gate, or close MVP-2. Whether MVP-2 can ever close is a *further, separate* terminal gate downstream of
the full blocker set (§8 / §16), and it cannot proceed over the standing blockers.

**Why this corridor is next** (restated from §8 / §16): gate #8 sits upstream of production durable storage,
storage-adapter ownership / placement, Lane-2 canonical migrations, and production migration execution. Decomposing it
first unblocks the dependency analysis for the largest downstream subset (P1), ahead of the storage-dependent auth /
consent / identity corridor (P2), the route / Freeside / public-response surface (P3), and the terminal MVP-2 closure
gate.

**Not selected as the next corridor:** Lane-2 canonical Straylight-store migration corridor (Option B — downstream of
gate #8, §10); production auth / consent / signer / identity corridor (Option C — P2, storage-dependent, §12 / §13);
route / Freeside integration corridor (Option D — P3 surface work, §14 / §15); an MVP-2 closure gate (Option E —
rejected; terminal; MVP-2 remains OPEN, §16). Each remains a *future, separate* docs/decision lane in dependency order;
none is opened, implemented, or authorized here.

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

---

## 18. Non-goals and blocked work

Phase 47P explicitly does **none** of the following — each remains exactly as blocked / deferred as before this gate:

- It does not produce evidence, run a role / grant test, open a DB connection, run forward or cleanup SQL, or invoke
  `psql` / Docker / Postgres.
- It does not enable production `--apply`, inject a DB client / sink, perform a DB write, or execute a migration.
- It does not implement durable production storage, a production storage adapter, a production migration file, or an
  executable production schema.
- It does not change any migration runner / packager / startup / config / scope-guard / route handler / route-vector /
  validator / fixture / package / lockfile / CI file.
- It does not implement auth, consent, signer, authority, or tenant / estate / actor identity binding.
- It does not change route / API behavior, expand the public response, or persist any raw candidate payload.
- It does not freeze the route contract or the final schema.
- It does not discharge ADR-022E gate #8 or any Straylight-side gate.
- It does not authorize Freeside integration or Lane-2 canonical Straylight-store migrations.
- It does not authorize production migration execution / runner / startup wiring or any config behavior change.
- **It does not close MVP-2** and makes **no** claim that `aw_*` SQL is production-safe or production-ready.
- It does not touch any adjacent repository.

All production work — production DB execution, production `--apply`, production DB writes, production migration
execution, durable production storage implementation, the production storage adapter, Lane-2 canonical
Straylight-store migrations, production auth / consent / signer / authority, tenant / estate / actor identity binding,
route / API behavior change, public-response expansion, raw-payload persistence, Freeside runtime / client integration,
ADR-022E gate #8 discharge, the route-contract freeze, the final-schema freeze, and MVP-2 closure — **remains BLOCKED**.

---

## 19. Codex audit checklist

This checklist audits **this Phase 47P PR** — the docs-only MVP-2 remaining-blocker decomposition / next-corridor
selection gate. Every item must be ACCEPT; any REJECT blocks acceptance of this Phase 47P PR.

```text
PHASE 47P — MVP-2 REMAINING-BLOCKER DECOMPOSITION / NEXT-CORRIDOR SELECTION GATE
CODEX AUDIT CHECKLIST
(docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47P PR)

[ ] 1.  Scope is docs-only — Phase 47P adds only this document plus a single minimal §19 forward-traceability status
        note (in the Phase 47O corridor closure gate); it modifies no runtime source, and specifically not migrate.ts,
        copy-migrations.mjs, any *.sql, the experimental SQL / manifest / planner (aw-sql-isolation-spike/*) / runner,
        no-leak.ts, aw-sql-execution-sink-spike.test.ts, the three extended Phase 47F test files, config.ts, server.ts,
        or scope-guards.test.ts.
[ ] 2.  No runtime/source/test/config/package/CI/SQL/migration/vector/validator/fixture changes — no route handler,
        store/storage code, DB code, migration runner, packaging/copy runner, planner, runner, auth, consent,
        server-boot, unit/integration test, scope-guard test, isolation test, fixture, route-vector JSON, route-vector
        validator, route-vector README, config.ts, env gate, package.json, lockfile, .github/ CI, .sql, aw_* schema,
        executable schema, migration file, or migration directory is added/modified.
[ ] 3.  Phase 47P produces NO evidence and runs nothing — the gate creates no disposable database, no role, no grant,
        runs no privilege/role/grant test, runs no forward or cleanup SQL under any role, opens no connection, and
        invokes no psql / Docker / Postgres; it decomposes already-merged decisions and selects a next corridor (§1/§2).
[ ] 4.  What Phase 47O closed is restated exactly, not extended (§5) — bounded non-production aw_* SQL execution proof
        stack ONLY; the Phase 47O blocked list (production execution/migration/durable storage/gate #8/MVP-2) is carried
        forward; this gate does not extend the closure or claim any production property.
[ ] 5.  What Phase 47O left open is faithful (§6) — the eleven standing blockers are carried forward verbatim; MVP-2
        remains OPEN; none is discharged/implemented/closed here.
[ ] 6.  Remaining MVP-2 blocker inventory is complete (§7) — at least the eleven enumerated items (gate #8; Lane-2
        canonical store; production durable storage; storage-adapter ownership/placement; auth/consent/signer/authority;
        tenant/estate/actor identity; route/API behavior; Freeside; production migration execution/runner/startup
        wiring; public-response expansion / raw-payload persistence; separate MVP-2 closure gate); none discharged here.
[ ] 7.  Dependency map is well-formed and complete (§8) — a table with columns Blocker / Current status / Depends on /
        Blocks / Candidate next-lane priority / Notes-evidence source; includes at least the eleven blockers; gate #8 is
        P0; the MVP-2 closure gate is terminal; no row asserts any blocker is discharged/implemented/production-safe.
[ ] 8.  Domain assessments are complete and all BLOCKED (§9-§15) — gate #8; Lane-2 canonical store; production durable
        storage / adapter ownership; auth/consent/signer/authority; tenant/estate/actor identity; route/Freeside;
        public response / raw-payload persistence; each grounded read-only; each remains blocked/unresolved/not-run.
[ ] 9.  Decision options complete and correctly disposed (§16) — Option A (gate #8 / storage-adapter binding corridor)
        SELECTED; Option B (Lane-2) not selected (downstream of gate #8); Option C (auth/consent/identity) not selected
        (storage-dependent, P2); Option D (route/Freeside) not selected (P3 surface); Option E (MVP-2 closure now)
        REJECTED (terminal; depends on all; MVP-2 remains OPEN).
[ ] 10. Verdict wording is bounded (§1) — "SELECT ADR-022E GATE #8 / PRODUCTION STORAGE-ADAPTER BINDING CORRIDOR NEXT;
        MVP-2 REMAINS OPEN"; no unbounded "production-safe", "production ready", "MVP-2 closed", "gate #8 discharged",
        "durable storage implemented", or "corridor production-complete" claim anywhere.
[ ] 11. Next lane is correct (§17) — Phase 47Q, a STRICTLY docs/decision-only ADR-022E gate #8 production
        storage-adapter binding blocker decomposition gate; explicitly NOT production implementation, NOT a durable-store
        lane, NOT the gate-#8 discharge, and NOT the MVP-2 closure itself; MVP-2 closure remains a further, separate
        terminal downstream gate over the standing blockers.
[ ] 12. No production overclaim — no production-readiness, production-safe, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, production-DB-write, production-migration-execution, durable-production-storage,
        storage-adapter-implementation, Freeside-runtime, Lane-2-canonical, production-auth/consent/signer/identity, or
        MVP-2-closed claim; every such reference is negated / blocked / a non-goal / a future requirement (§5-§18).
[ ] 13. No bad citation regression — no migrate.ts:303-305 citation (migrate.ts is 254 lines); the conditional startup
        migrate is cited as server.ts:303 (if (dbPool)) / server.ts:305 (await migrate(dbPool)); the canonical scope-
        guard denylist is the 19-entry scope-guards.test.ts:122-142 (forbidden-import test :185, file 364 lines); the
        execution-gate seam is index.ts:661/700 with injected sink interface index.ts:124, applyIsolationSpikePlan
        index.ts:568, SYNTHETIC_REF_MAX_LENGTH=80 index.ts:718 (index.ts 914 lines); config.ts DATABASE_URL at
        config.ts:340 (config.ts 485 lines); runner 498 lines; no-leak.ts 114-key parity, 286 lines.
[ ] 14. Forward-traceability note is minimal and evidence-bound (§19) — the single added note (in the Phase 47O closure
        gate) records only that Phase 47P decomposed the standing MVP-2 blockers, selected the ADR-022E gate #8 /
        storage-adapter binding corridor (Option A), named the Phase 47Q decomposition gate, produced no evidence, and
        kept production / gate-#8 / MVP-2 closure work blocked; the note claims no production safety, gate-#8 discharge,
        or MVP-2 closure.
[ ] 15. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5 (no sixth
        vector); self-check 44/44; git diff --check and git diff --cached --check clean; nothing staged (§20).
[ ] 16. No adjacent-repo changes — no file in loa-straylight, freeside-characters, or any adjacent/sibling repo was
        created or modified by Phase 47P.
[ ] 17. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp / temp,
        __pycache__, .pyc, dist, build, or .claude artifact appears in the Phase 47P working tree.
[ ] 18. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the Claude Code
        memory store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
[ ] 19. Section headings are well-formed and single-occurrence — each numbered section heading (## 1. … ## 20.) appears
        exactly once; no duplicated heading; no pasted terminal-report fragment; every Markdown table row is well-formed;
        the triple-backtick count is even; no fenced block is an executable migration or runnable schema.
[ ] 20. The gate is honest about what it does and does not do — it decomposes the standing MVP-2 blockers and SELECTS a
        next corridor ONLY; it authorizes no production work, discharges no gate, freezes nothing, implements no storage,
        and closes no MVP-2; MVP-2 REMAINS OPEN (§1 / §5 / §6 / §16 / §17 / §18).
```

---

## 20. Validation record

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47P is
docs/decision-only — it adds only this document (plus the single minimal forward-traceability status note in §19) and
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
# Overclaim scan (interpret: negated/blocked/future-requirement references are fine; positive present-tense claims are not):
grep -RInE 'production ready|production readiness|production-safe|route-contract freeze|final schema freeze|ADR-022E.*discharged|gate #8.*discharged|production DB writes authorized|production migration execution authorized|durable production storage authorized|Freeside runtime authorized|Lane-2 canonical.*authorized|aw_\* SQL.*production-safe|ready for production|production implementation authorized|MVP-2.*closed|closure.*complete|production least-privilege.*proven|production cleared' \
  docs/ADMISSION-WEDGE-MVP2-REMAINING-BLOCKER-DECOMPOSITION-GATE.md
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-MVP2-REMAINING-BLOCKER-DECOMPOSITION-GATE.md
```

**Recorded results for this lane** (run during authoring):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-MVP2-REMAINING-BLOCKER-DECOMPOSITION-GATE.md` is added, plus the single minimal
  forward-traceability status note (§19) in the Phase 47O corridor closure gate; no runtime source (and specifically not
  `migrate.ts`, `copy-migrations.mjs`, any `*.sql`, the experimental SQL / manifest / planner / runner, `no-leak.ts`,
  the `aw-sql-execution-sink-spike.test.ts`, the three extended Phase 47F test files, `config.ts`, `server.ts`, or
  `scope-guards.test.ts`), no runtime test, no route-vector JSON, validator, README, fixture, fixture validator, `app/`,
  `src/`, `tests/`, package / lockfile, config / env, CI, migration, SQL, executable schema, or generated file is
  touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**; the
  `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail closed; 2 exact-key
  non-over-match guards stay clean);
- **diff checks clean** — `git diff --check` and `git diff --cached --check` report no whitespace / conflict-marker
  errors; nothing is staged;
- **docs-only scope checks** — the `app package.json … .github` diff is empty; the only additions are this document and
  the Phase 47O closure gate's single forward-traceability note; the memory/generated/temp scan matches nothing under
  the working tree from this phase;
- **adjacent-repo reference scan** — any `arcturus` / `sensenet` matches are prose-only and no adjacent-repo file is
  created or modified;
- **overclaim scan** — every match is a **negated / blocked / non-goal / bounded** reference (e.g. "MVP-2 remains
  OPEN", "does not close MVP-2", "discharges no operative Straylight-side gate", "route-contract freeze … remains
  blocked", "final-schema freeze … blocked", "Lane-2 canonical … blocked", "Freeside runtime / client integration …
  blocked", "makes no claim that `aw_*` SQL is production-safe", "production durable storage … blocked", and every
  "select" is qualified to corridor *selection*, never implementation); there is **no** positive present-tense
  production authorization or safety claim, and **no** claim that MVP-2 is closed, that gate #8 is discharged, or that
  `aw_*` SQL is production-safe;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–20 exactly once each.

**Forward-traceability status note added (§19 scope):** the Phase 47O corridor closure gate (which named this Phase 47P
gate) gains a single bounded additive Phase 47P note (per §19).

**Corruption / duplicate guard** (carried from the 46I–47O precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 20.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §19 Codex audit
  checklist (a `text` block) and the §20 validation command list (a `bash` block). **No fenced block is an executable
  migration or runnable schema.**
