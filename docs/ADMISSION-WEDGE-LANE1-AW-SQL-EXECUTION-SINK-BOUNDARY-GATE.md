# Phase 47H — Lane-1 `aw_*` SQL execution sink / real-DB boundary decomposition gate

> **Phase**: 47H
> **Branch context**: `phase-47h-aw-sql-execution-sink-boundary-gate`
> **Related**: Phase 47G (PR #178,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md))
> **accepted** (Verdict A) the merged Phase 47F Lane-1 `aw_*` SQL isolation spike as a bounded, disabled-by-default,
> dev/operator-only, **NON-PRODUCTION**, location-isolated SQL **planning / manifest / safety-proof** spike, recorded
> that real DB execution is **NOT** authorized, and **selected this Phase 47H** execution-sink / real-DB boundary
> decomposition gate as the next lane; Phase 47F (PR #177,
> [`admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md))
> **implemented** the bounded, dev/operator-only, disabled-by-default, non-production, location-isolated experimental
> `aw_*` SQL planning / manifest / safety-proof spike; Phase 47E (PR #176,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md))
> converted the §18 layered direction into the hard §8–§18 file:line checklist; Phase 47D (PR #175,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md))
> **selected**, on paper, the §18 layered Lane-1 `aw_*` SQL isolation design direction; Phase 47C (PR #174,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the Lane-1 `aw_*` SQL / migration-runner blocker and kept Lane-1 SQL BLOCKED; Straylight
> (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); Straylight-repo ADR-022E durable-store gate #8 (+
> sibling gates, **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only execution-sink / real-DB boundary decomposition gate.** This gate adds **only this
> document** (plus, optionally, the two minimal forward-traceability status notes, §24). It modifies **no** runtime
> source — and specifically does **not** modify `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`,
> `app/src/db/migrations/*.sql`, `app/src/server.ts`, `app/src/config.ts`,
> `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts`, the experimental `.sql` files, the
> `manifest.json`, the `aw-sql-isolation-spike-runner.mjs`, `no-leak.ts`, `route-storage-durable-spike.ts`,
> `route-storage-spike.ts`, or `scope-guards.test.ts` — and changes **no** route handler, store / storage code, DB
> write, migration, SQL file, executable schema, migration runner, packager, scope guard, auth, consent, route-vector
> JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, other test, package export,
> config, env, package, lockfile, CI, generated file, or binary. No adjacent repository (`loa-straylight`,
> `freeside-characters`) is touched.
> **This is the Lane-1 `aw_*` SQL execution-sink / real-DB boundary *decomposition* gate** — the rung downstream of the
> Phase 47G acceptance, mirroring the Phase 47C blocker-decomposition precedent. It **decomposes the prerequisites**
> that must be true before any future PR may add a real execution sink, enable `--apply`, inject a DB client, or run
> experimental SQL against any database — and selects the next safe lane. **It is not the execution sink, and it
> implements nothing.** It **builds no sink, writes no DB, opens no connection, enables no `--apply`, injects no DB
> client, adds no migration, creates no SQL or executable schema, executes no migration, changes no migration runner or
> packager, weakens no scope guard, implements no auth or consent, changes no route / API behavior, freezes neither the
> route contract nor the final schema, discharges no operative Straylight-side gate, and claims no production
> readiness.**

Every assessment below is grounded **read-only** against the **merged Phase 47F source** in the Dixie repo at the time
of writing (PR #177, commit `ae24ca35`, **9 files, +2439 lines, zero production-path / vector / fixture files**) and
the **merged Phase 47G acceptance gate** (PR #178): the planner / guard / apply module
`app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts` (800 lines —
`buildIsolationSpikePlan` at `index.ts:543`, `applyIsolationSpikePlan(plan, sink)` at `index.ts:568`, the injected
`IsolationSpikeStatementSink` interface at `index.ts:124-129`, `createSyntheticWriteReducer` at `index.ts:746`), the
exact allowlist `aw-sql-isolation-spike/manifest.json` (13 lines), the experimental forward / cleanup DDL
`aw-sql-isolation-spike/sql/0001_aw_isolation_spike_init.sql` (111 lines, a **3-table** `aw_isolation_spike_*` family)
and `…_down.sql` (16 lines), the explicit dev/operator runner `app/scripts/aw-sql-isolation-spike-runner.mjs` (124
lines — `--apply` refused at `runner :101-107`), and the three focused test files. The **unchanged** production path is
also read read-only: the migration runner `app/src/db/migrate.ts` (**254 lines** — `MIGRATIONS_DIR` at `migrate.ts:23`,
non-recursive discovery `f.endsWith('.sql') && !f.includes('_down')` at `migrate.ts:79`, the advisory lock
`computeAdvisoryLockKey('dixie-bff:migration')` at `migrate.ts:153` / `pg_advisory_lock` at `migrate.ts:160`, the
per-file transaction `BEGIN`/`COMMIT`/`ROLLBACK` at `migrate.ts:220/:226/:230`, the `_migrations` tracking ledger at
`migrate.ts:46-55`); the build-asset packager `app/scripts/copy-migrations.mjs` (`SRC_DIR = src/db/migrations` at
`copy-migrations.mjs:23`, `.sql`-only filter at `:38-40`); the conditional startup migrate `await migrate(dbPool)`
inside `if (dbPool)` at **`server.ts:303-305`** (`server.ts` is 773 lines); the env parsing in `app/src/config.ts`
(485 lines; `DATABASE_URL` at `config.ts:340`); the runtime no-leak guard `no-leak.ts` (114-key `FORBIDDEN_PUBLIC_KEYS`);
and the Phase 33N static scope guards `scope-guards.test.ts` (19-entry `DURABLE_WRITE_DENYLIST` at `:122-142`).
**The canonical Straylight `StorageAdapter` interface and the `Assertion` / `TransitionReceipt` / `AuditEvent` field
shapes live in the adjacent `loa-straylight` repository (cross-repo references, not Dixie file:line) and remain
Straylight-owned (§17).**

---

## 1. Status

Phase 47H is the bounded, docs/decision-only **Lane-1 `aw_*` SQL execution-sink / real-DB boundary decomposition gate**
named by Phase 47G §16. Its purpose is to **decompose** — precisely and file:line-grounded — what must be true before
any future PR may add a real execution sink, enable `--apply`, inject a DB client, or run experimental SQL against any
database; to **explain why an execution sink is not yet authorized**; and to **select the next safe lane** — without
itself implementing, executing, enabling, injecting, or unblocking anything.

**What this phase is, stated narrowly and exactly.** Phase 47H:

- is **docs / decision-only** — it reads the merged Phase 47F source and the merged Phase 47G acceptance, decomposes
  the §11 execution-sink boundary (47G) into enumerated prerequisite classes (Sections 5–18), and records the verdict;
- is an **execution-sink / real-DB boundary decomposition gate**, *not* an implementation, *not* the acceptance gate
  (47G), *not* the authorization-checklist gate (47E), *not* the layered-design **direction** gate (47D), and *not* the
  migration-runner blocker-**decomposition** gate (47C — which decomposed a *different* blocker, the normal-runner
  auto-adoption risk; this gate decomposes the *execution-sink* boundary);
- does **not** modify runtime source or tests — and specifically does not touch `migrate.ts`, `copy-migrations.mjs`,
  any `*.sql`, the experimental SQL / manifest / planner / runner, `no-leak.ts`, `config.ts`, `server.ts`, or
  `scope-guards.test.ts`;
- does **not** enable `--apply`, inject any DB client / sink, open a DB connection, perform any DB write, or execute
  any migration against any database;
- does **not** add or modify a migration file, SQL file, executable schema, migration runner, or packager;
- does **not** change route / API behavior, the public response shape, or `no-leak.ts`;
- does **not** implement or unblock auth, consent, or a signer model;
- does **not** authorize production admission;
- does **not** freeze the route contract or the final schema;
- does **not** claim production readiness;
- does **not** claim or discharge the operative Straylight-owned ADR-022E gate #8;
- does **not** claim Phase 47F proved real DB execution, that `--apply` is authorized, or that `aw_*` SQL is
  production-safe;
- **authorizes no implementation in this PR.** It decomposes the execution-sink boundary and selects a future
  **separate**, docs-only Phase 47I implementation-authorization checklist gate before any code-bearing
  execution-sink PR.

> **Verdict: A — Decompose the execution-sink / real-DB boundary and keep implementation BLOCKED. Select a future
> docs-only Phase 47I — Lane-1 `aw_*` SQL execution sink implementation-authorization checklist gate before any
> code-bearing execution-sink PR.** This read-only inspection confirms the Phase 47F spike has **no** real execution
> sink (the only sinks ever used are fakes / in-memory in tests; the runner injects none), `--apply` is **refused**
> (`runner :101-107`), and the execution boundary has not been decomposed into concrete, enforceable prerequisites.
> This gate performs that decomposition (Sections 5–18) and finds that **adding an execution sink is not yet
> authorized** (§19 / §20): the prerequisites it enumerates are not yet satisfied, and several (the production-target
> refusal proof, the privilege / secret boundary, the real-engine `CHECK` proof, and the ADR-022E / Lane-2 dependency)
> require a precise implementation-authorization checklist of their own before any code-bearing lane. **Real DB
> execution remains NOT authorized.** `--apply`, DB client / sink injection, production durable storage, production DB
> writes, production migration execution, Lane-2 canonical Straylight-store migrations, the route-contract /
> final-schema freeze, and the operative ADR-022E gate #8 discharge all **remain blocked**.

This maps to the recommended **Verdict A / Option A** — *decompose the execution-sink / real-DB boundary, keep
implementation blocked, and select a docs-only Phase 47I implementation-authorization checklist gate* — and to the
chain convention of a load-bearing decomposition paired with the selection of a single, well-bounded next lane (§21).

**Why not the alternatives.** Option **B — authorize immediate execution-sink implementation next** is **rejected as
too early** (§19): the boundary this gate decomposes is precisely what an implementation lane would need a *checklist*
for, and no such checklist exists yet (that is Phase 47I's job). Option **C — reject the execution-sink path and keep a
planning-only spike indefinitely** is **not selected** but retained as the live fallback (the accepted Phase 47A
`.json` Mode 2 path remains available); the decomposition below shows the execution boundary *can* be specified safely,
so foreclosing it now is premature. Options **D — jump to production durable storage**, **E — discharge ADR-022E gate
#8**, **F — hand off to Freeside runtime / client integration**, and **G — route-contract / final-schema freeze** are
all **rejected as too early** (§19): each presupposes an execution sink, a production substrate, or a cross-repo
discharge that neither Phase 47F nor this gate built, proved, or owns.

---

## 2. Scope

Phase 47H is **strictly docs/decision-only**. It is the execution-sink / real-DB boundary **decomposition** rung of the
Lane-1 `aw_*` SQL chain — one rung downstream of the Phase 47G acceptance, playing for the *execution boundary* the role
Phase 47C played for the *migration-runner / auto-adoption* blocker. It is **bounded** to:

- intaking the merged Phase 47F implementation and the merged Phase 47G acceptance accurately (§4);
- defining the execution-sink spectrum (§5) and the current non-execution baseline (§6);
- decomposing each prerequisite boundary class — DB client / sink injection (§7), apply-mode gate (§8), database-target
  isolation (§9), migration-runner / startup / packaging isolation (§10), transaction / lock / idempotency (§11),
  cleanup / down-migration (§12), runtime `CHECK` / real-engine proof (§13), privilege / secret (§14), observability /
  audit (§15);
- recording the auth / consent / signer non-coverage (§16) and the ADR-022E / Lane-2 boundary (§17);
- defining the future evidence checklist that must exist before implementation could be authorized (§18);
- enumerating options considered (§19), the decision (§20), the next lane (§21), and preserved blocked lanes (§22);
- providing a Codex audit checklist for this gate (§23) and the validation run (§24).

It does **not**, in this PR, implement, build, execute, enable, inject, freeze, or discharge anything (§1). It is the
**execution-boundary analogue of Phase 47C** (which decomposed a blocker and kept the lane blocked): a decomposition
gate that records the prerequisite boundary and selects only a *future separate* lane, never the execution itself.

---

## 3. Source chain

Phase 47H sits at the bottom of an explicit, PR-anchored chain. Each link is read-only input here; none is modified
except the optional §24 forward-traceability status notes.

- **Phase 47A / PR #172** — implemented Storage Mode 2 as a **file-backed `.json` snapshot store** (NOT SQL, NOT a
  production DB, NOT `aw_*` schema), off the production migration path. **Not modified.** Remains the live Option C
  fallback (§19).
- **Phase 47B / PR #173** — durable-spike **acceptance** gate, Verdict A. **Not modified.**
- **Phase 47C / PR #174** — Lane-1 `aw_*` SQL / migration-runner **blocker-decomposition** gate, Verdict A. The
  structural precedent for *this* decomposition gate (decompose a blocker, keep the lane blocked). **Not modified.**
- **Phase 47D / PR #175** — Lane-1 `aw_*` SQL isolation **design** gate, Verdict A. **Not modified.**
- **Phase 47E / PR #176** — Lane-1 `aw_*` SQL isolation **authorization-checklist** gate, Verdict A. The structural
  precedent for the *next* lane (47I): it turned a design direction into a hard file:line checklist before a
  code-bearing spike. **Not modified.**
- **Phase 47F / PR #177** — the isolation implementation spike, **merged** (commit `ae24ca35`). The subject this gate
  reads to ground the execution boundary. **Not modified; gains an optional Phase 47H status note (§24).**
- **Phase 47G / PR #178** — the isolation-spike **acceptance** gate, Verdict A. Accepted Phase 47F as a bounded
  non-production planning / isolation / safety-proof spike, recorded that real DB execution is NOT authorized, and
  **selected this Phase 47H** as the next lane (47G §16). **The authorizing predecessor; gains an optional Phase 47H
  status note (§24).**
- **Phases 46S / 46T / PR #164 / #165** — drafted and accepted the durable-store schema / migration design (**13
  `aw_*` tables across 11 subsections**; `schema_final` / `route_contract_final` **false**). The Phase 47F experimental
  DDL realizes a **bounded 3-table subset** of this draft (assertion + supersession-link + tombstone), un-frozen.
  **Not modified, not frozen.**
- **Phase 46N / Candidate D (46M)** — gate #8 bounded **paper** clearing and the split-storage production-adapter
  proposal input. The §17 boundary that keeps Lane-2 canonical migrations and the operative Straylight-side discharge
  blocked. **Not modified.**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner and the
  decision records cited as guardrails (§16 / §17). Cross-repo references, **not edited.**

---

## 4. Phase 47F and 47G intake

**Phase 47F (PR #177, commit `ae24ca35`)** added **9 files, +2439 lines, with zero production-path / vector / fixture
files touched** (confirmed read-only against the commit and the working tree). Recorded accurately:

- **Isolated experimental SQL.** `aw-sql-isolation-spike/sql/0001_aw_isolation_spike_init.sql` (111 lines) and
  `…_down.sql` (16 lines), under the Admission Wedge spike service tree, **outside** the single production migration
  directory (`MIGRATIONS_DIR` at `migrate.ts:23`) and **outside** the single source dir the packager copies
  (`copy-migrations.mjs:23`).
- **Exact manifest.** `manifest.json` (13 lines) — `spike` / `kind` / `production: false` / `schemaFinal: false`
  matched as **exact literals**, unknown keys fail closed, `forward` / `cleanup` disjoint, `_down` role-consistency
  enforced.
- **Planner / guard / apply module.** `index.ts` (800 lines): strict manifest validation, on-disk reconciliation,
  lexical + symlink (`lstat`) + `realpath` containment, a **dry-run** `buildIsolationSpikePlan` (`index.ts:543`), an
  all-or-nothing `applyIsolationSpikePlan(plan, sink)` (`index.ts:568`) through an **injected**
  `IsolationSpikeStatementSink` (`index.ts:124-129`: `begin` / `applyStatement` / `commit` / `rollback`), and a
  **pure in-memory** `createSyntheticWriteReducer` (`index.ts:746`). The module imports only `node:` built-ins, names
  no client, opens no connection, and embeds **no** SQL/DDL text of its own.
- **Explicit dev/operator runner.** `aw-sql-isolation-spike-runner.mjs` (124 lines): the **only** caller; disabled by
  default; strict `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED === 'true'` gate **and** `NODE_ENV !=
  production`; default is a dry-run plan that opens nothing; **`--apply` is refused** (`runner :101-107`: "the Phase 47F
  spike injects no client … real execution requires a separately-authorized lane that injects a sink (never a
  production database)"). It is **never** imported by `server.ts`, never mounted by a route gate, and not wired into any
  `package.json` lifecycle script.
- **Focused tests** (three files) and the **runbook**.
- **No tracked production-path change.** `migrate.ts`, `copy-migrations.mjs`, `src/db/migrations/*.sql`, `server.ts`,
  `config.ts`, `no-leak.ts`, `scope-guards.test.ts`, the route-vector JSON / validator / README, and the Phase 33E
  fixtures / validator are **unchanged**.

**Phase 47G (PR #178)** — the docs-only acceptance gate, **Verdict A**. It accepted Phase 47F **only** as a bounded,
disabled-by-default, dev/operator-only, non-production, location-isolated SQL **planning / manifest / safety-proof**
spike; recorded that it resolves all five Codex PATCH defects; recorded explicitly (47G §8) that Phase 47F proves
**no** real DB execution, **no** Postgres runtime enforcement, and **no** real transaction / lock / recovery; stated
(47G §11) that the execution sink has no real implementation and `--apply` remains refused; and **selected this Phase
47H** (47G §16) to decompose the execution boundary before any future lane may enable `--apply` or inject a real sink.
Phase 47G changed nothing in the repo and unblocked nothing.

---

## 5. Execution sink definition

The phrase "execution sink" must be defined precisely, because the entire boundary turns on it. An **execution sink**
is the object passed as the `sink` argument to `applyIsolationSpikePlan(plan, sink)` (`index.ts:568`) — i.e. a concrete
implementation of the `IsolationSpikeStatementSink` interface (`index.ts:124-129`: `begin()`, `applyStatement(text)`,
`commit()`, `rollback()`) — that causes the experimental statement text to take effect somewhere. The five
distinguishable forms, from safest to most dangerous, are:

| # | Form | What it is | Where it stands today |
|---|------|------------|------------------------|
| 1 | **Planning-only manifest / DDL proof** | No sink at all; `buildIsolationSpikePlan` reads the `.sql` text and produces a dry-run plan; the manifest + path guards + reducer are proven without applying anything. | **What Phase 47F is.** Accepted (47G). The only thing this chain has built. |
| 2 | **Fake / in-memory sink** | A test double implementing the four sink methods in memory (records calls, no DB). Proves the all-or-nothing apply contract and the reducer's replay / conflict semantics. | **Exists only in Phase 47F tests.** Never reaches a database. |
| 3 | **Test-only DB sink** | A sink wired to an **ephemeral, throwaway** database created and destroyed inside a test run (e.g. a containerized / per-test Postgres). Would prove the runtime `CHECK` / `UNIQUE` constraints actually fire (§13). | **Does not exist.** Not authorized; future-gated behind Phase 47I + a later code-bearing lane. |
| 4 | **Dev/operator DB sink** | A sink an operator injects, by an explicit out-of-band command, against a **non-production** dev/operator database, under multiple explicit gates. | **Does not exist.** Not authorized. |
| 5 | **Production DB sink** | A sink against a production database / `DATABASE_URL`. | **Forbidden.** Not authorized by any lane in this chain; structurally refused. |

The boundary this gate decomposes is the transition **from form 1/2 (where the chain is today) to forms 3/4** — and
the **hard prohibition of form 5** in every environment and default. Forms 3 and 4 are the *only* candidates a future
lane could pursue; form 5 is never a candidate. Nothing below authorizes any of forms 3, 4, or 5; this section only
*names* them so the later sections can speak precisely.

---

## 6. Current non-execution baseline

Grounded read-only against the merged source, the current baseline is **non-execution by construction**:

- **No sink is constructed anywhere in shipped code.** `applyIsolationSpikePlan` (`index.ts:568`) requires a `sink`
  argument; the only callers that pass one are the Phase 47F **tests**, which pass **fakes / in-memory** doubles. The
  runner (`aw-sql-isolation-spike-runner.mjs`) constructs **no** sink and calls only `buildIsolationSpikePlan`
  (`runner :110`), the dry-run path.
- **`--apply` is refused** (`runner :101-107`) — when `--apply` is passed, the runner throws before building anything,
  with the explicit message that no client is injected and real execution requires a separately-authorized lane.
- **No connection is ever opened by the spike.** `index.ts` imports only `node:` built-ins (`node:fs`, `node:path`,
  `node:url`); it names no DB client and opens no connection.
- **The default behavior is a dry-run plan** that reads `.sql` text and prints a step summary (`runner :112-118`);
  it "opens NO connection and applies NOTHING".
- **The gate is disabled by default and non-production-refused** — `assertDevOperatorGateOpen` (`index.ts:228-235`)
  requires `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED === 'true'` AND `NODE_ENV != production`; this env
  name is **not** parsed in `config.ts` (it is read only inside the runner), so no production config path engages it.

This baseline is the safe floor. Everything in Sections 7–18 describes prerequisites that would have to be added,
proven, and audited to move *off* this floor — and this gate authorizes **none** of them.

---

## 7. DB client / sink injection boundary

*(Topic B.)* Decomposition of where a real sink would come from and what must be true before one could be injected:

- **Where a DB client would come from.** A real sink would have to be constructed from a connection / pool created
  outside the spike module and passed in via `applyIsolationSpikePlan(plan, sink)`. The spike module must **never**
  construct or import a pool itself.
- **Whether the runner may accept an injected client.** Only under a future, separately-authorized lane (Phase 47J or
  later), and only after Phase 47I defines the exact file scope and gates. Today the runner accepts none and refuses
  `--apply` (`runner :101-107`).
- **Whether the spike module may import the production DB pool.** **No.** `index.ts` must continue to import only
  `node:` built-ins. It must never import `app/src/db/client.ts`'s `DbPool`, the production pool, or any module that
  transitively opens `DATABASE_URL`. A future sink, if ever built, must live behind dependency injection — the spike
  module must remain pool-free.
- **Whether dependency injection must be explicit and test-only by default.** **Yes.** The `IsolationSpikeStatementSink`
  shape (`index.ts:124-129`) is already injection-only; any future real sink must be injected by an explicit
  dev/operator entrypoint, exercised in tests against a **fake** first, and never wired into a default path. The
  interface is deliberately named with no normal-runner / client verb so it can never be confused with `migrate.ts`.
- **Whether a future sink must be isolated from `server.ts`.** **Yes.** `server.ts` must continue to never import the
  spike planner / runner / sink (its only DB call is `await migrate(dbPool)` at `server.ts:303-305`). A future sink must
  be unreachable from app startup.
- **Whether a future sink can be reachable from normal startup.** **No.** It must be reachable **only** through the
  explicit out-of-band dev/operator command, gated, never on boot, never via a route, never via a `package.json`
  lifecycle script.

**Not authorized here:** no DB client / sink injection is authorized by this gate; the decomposition above is the
specification a *future* checklist gate (47I) must turn into a hard, file:line-anchored set of obligations.

---

## 8. Apply-mode (`--apply`) gate boundary

*(Topic C.)* Decomposition of the `--apply` gate:

- **Current state.** `--apply` is **refused** unconditionally in the runner (`runner :101-107`), because no client is
  injected. Execution is dry-run / plan-only.
- **What would need to be true before enabling `--apply`.** At minimum: a Phase 47I implementation-authorization
  checklist accepted; an explicit, injected, test-first sink (§7); a proven non-production database target (§9); a
  proven production-refusal posture (§9 / §10); transaction / rollback tests against a real engine (§11 / §13); a
  privilege / secret boundary (§14); observability bounds (§15); and a code-bearing lane (Phase 47J or later) with its
  own Codex audit. **None of these exists.**
- **Env-gate names (named, not added).** A future lane *might* want a distinct, additional opt-in env gate for
  execution — e.g. a name in the family `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED` and a separate
  explicit non-production DB-target variable. **This gate names these only to scope the discussion; it does NOT add,
  parse, or wire any such env var, and `config.ts` is untouched.** The existing opt-in
  `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED` must remain insufficient on its own to enable execution.
- **Whether `--apply` must remain impossible unless multiple explicit gates are present.** **Yes.** A future
  `--apply` must require a **conjunction** of independent gates: the dev/operator opt-in **and** a distinct
  execution-opt-in **and** a non-production environment **and** an explicit non-production DB target **and** an
  injected sink. Any one absent → refuse.
- **Refusal posture required if gates are absent.** Fail **closed**, loudly: throw a typed error and exit non-zero
  (the current `runner :101-107` posture), never silently no-op, never fall back to a default target, never partially
  apply.

**Not authorized here:** `--apply` is not enabled; no execution opt-in env var is added; `--apply` remains refused.

---

## 9. Database target isolation boundary

*(Topic D.)* Decomposition of acceptable / unacceptable targets and the controls that must bound them:

- **Acceptable future test DB target.** An **ephemeral, throwaway** database (e.g. a per-test containerized Postgres or
  a uniquely-named scratch database) created and dropped within the test lifecycle, never reused across runs, never
  reachable in production.
- **Acceptable future dev/operator DB target.** A **non-production** dev/operator database, explicitly and separately
  configured (never the production `DATABASE_URL`), least-privileged, ephemerally / disposably scoped.
- **Unacceptable production DB target.** The production database / production `DATABASE_URL` (parsed at `config.ts:340`)
  — **forbidden** as an execution target for the experimental `aw_isolation_spike_*` objects in every environment and
  default.
- **How to prevent production `DATABASE_URL` reuse.** A future lane must take an **explicit, distinct** target variable
  for execution (never read `DATABASE_URL`), and must refuse if the supplied DSN equals or resolves to the production
  `DATABASE_URL`. The spike must never default to `DATABASE_URL`.
- **Whether a DSN/name allowlist or denylist is required.** **At least a denylist, preferably an allowlist.** A future
  lane should require the target DSN / database name to match an explicit non-production allowlist (e.g. a required
  name prefix/suffix marking it disposable) and/or be checked against a denylist of production identifiers; absent a
  match, refuse.
- **Whether ephemeral database naming is required.** **Strongly required** for the test target (form 3) — a unique,
  obviously-disposable database name per run — so an accidental persistent footprint is impossible.
- **Whether credentials must be non-production and least-privilege.** **Yes** — see §14. No production credentials, no
  production roles, least privilege scoped to only the experimental objects.

**Not authorized here:** no DB target is configured, allowlisted, denylisted, or connected; `config.ts` is untouched.

---

## 10. Migration runner / startup / packaging isolation

*(Topic E.)* The Phase 47F location-isolation properties must be **preserved unchanged** by any future execution lane.
Decomposition of the invariants that must hold:

- **Normal `migrate(dbPool)` must remain unchanged.** The forward-only production runner (`migrate.ts`, 254 lines)
  must keep its non-recursive `readdir(MIGRATIONS_DIR)` discovery and `f.endsWith('.sql') && !f.includes('_down')`
  filter (`migrate.ts:79`). A future execution sink must **not** edit `migrate.ts`.
- **The experimental runner must not use the production migration runner.** A future execution path must apply the
  experimental plan **only** through `applyIsolationSpikePlan(plan, sink)` with its own injected sink — never through
  `migrate(dbPool)`, the `_migrations` tracking ledger (`migrate.ts:46-55`), or the production advisory lock
  (`migrate.ts:153-160`). The experimental and production runners must stay disjoint.
- **Startup must not import or invoke the execution sink.** `server.ts` must continue to call only `await
  migrate(dbPool)` inside `if (dbPool)` (`server.ts:303-305`) and never import the spike planner / runner / sink. A
  future sink must be unreachable from boot.
- **The production migration directory must remain isolated from experimental SQL.** The experimental `.sql` must stay
  under `aw-sql-isolation-spike/sql/`, **outside** `src/db/migrations/`. No `aw_isolation_spike_*` file may be placed
  in the production migration directory.
- **Packaging / copy behavior must remain isolated.** `copy-migrations.mjs` must keep scanning only `SRC_DIR =
  src/db/migrations` (`copy-migrations.mjs:23`) with its `.sql`-only filter (`:38-40`); the experimental SQL must never
  be bundled into `dist/db/migrations/`. A future execution lane must **not** edit the packager.

**Not authorized here:** no change to `migrate.ts`, `copy-migrations.mjs`, `server.ts`, or the production migration
directory; these invariants are recorded as obligations a future lane must satisfy, not actions taken now.

---

## 11. Transaction / lock / idempotency boundary

*(Topic F.)* Decomposition of the transactional semantics a real execution would require — none of which is proven
today (Phase 47F proves these only against fakes / in-memory, 47G §8):

- **Whether execution needs a transaction.** **Yes.** `applyIsolationSpikePlan` already models `begin → applyStatement*
  → commit`, with any throw → `rollback` + a wrapped fail-closed error (`index.ts:568-593`). A real sink must implement
  these as actual DB transaction control.
- **Whether each manifest plan applies atomically.** **Yes** — the plan is all-or-nothing: either every statement in
  the direction commits, or the whole plan rolls back. No partial admit may survive. (Note: each `.sql` file may itself
  contain multiple `CREATE TABLE` statements; the atomic unit is the whole plan.)
- **Whether advisory-lock / migration-lock behavior is required.** A future lane must **decide and prove** a locking
  posture against the real engine. The production runner uses a single advisory lock
  (`computeAdvisoryLockKey('dixie-bff:migration')` at `migrate.ts:153`); the experimental sink must **not** reuse that
  production lock (to avoid coupling experimental runs to production migration), and must decide whether it needs its
  own advisory lock or is single-operator by construction. This is unproven and undecided; it is decomposed here, not
  resolved.
- **Whether a migration ledger is required or explicitly excluded.** A future lane must **decide** whether experimental
  execution is tracked in a ledger. The production `_migrations` table (`migrate.ts:46-55`) is for production
  migrations; the experimental sink must **not** write to it. If experimental execution wants idempotency tracking, it
  must use its own clearly-experimental mechanism or rely on the idempotent `CREATE TABLE IF NOT EXISTS` /
  `DROP TABLE IF EXISTS` DDL (which the forward / down files already use). This decision is deferred to Phase 47I.
- **How idempotent replay would be observed against a real DB.** The in-memory reducer
  (`createSyntheticWriteReducer`, `index.ts:746`) models `applied` / `identical_replay` / fail-closed `conflict`;
  against a real DB, idempotent replay would manifest as the `IF NOT EXISTS` DDL being a no-op on re-run and the
  `UNIQUE (tenant_ref, estate_ref, actor_ref, assertion_ref)` constraint (forward SQL :63-64) rejecting a conflicting
  insert. A future lane must prove this against the real engine (§13).
- **How conflict failure should rollback.** A conflicting write must throw and record **nothing** (the reducer's
  `IsolationSpikeReplayConflictError` posture, `index.ts:191-201`); against a real DB, a `UNIQUE` violation must roll
  back the enclosing transaction so no partially-admitted recallable assertion survives. `recordBatch` is atomic
  (snapshot / restore, `index.ts:777-793`); the real-DB analogue is a single transaction around the batch.

**Not authorized here:** no transaction, lock, ledger, or idempotency behavior is exercised against any database.

---

## 12. Cleanup / down-migration boundary

*(Topic G.)* Decomposition of the cleanup / drop path:

- **Whether cleanup SQL may run.** Not today. The `_down.sql` (16 lines: `DROP TABLE IF EXISTS` for tombstone,
  supersession_link, assertion, in reverse order) is reachable only via the dry-run `--direction=cleanup` plan
  (`runner :29`); it is never executed (no sink). A future lane could run it **only** against an ephemeral / dev target
  (§9), never production.
- **Safety checks needed for down SQL.** Before any real drop: confirm the target is non-production (§9); confirm the
  objects are the experimental `aw_isolation_spike_*` family only (the down file drops exactly those three tables);
  confirm `IF EXISTS` semantics so a missing object is a no-op; and require the same conjunction of explicit gates as
  forward execution (§8).
- **Whether destructive cleanup is allowed only against ephemeral/dev DB.** **Yes.** A `DROP TABLE` may run **only**
  against an ephemeral test DB or an explicitly non-production dev/operator DB — **never** production.
- **How cleanup must fail closed.** If the target cannot be proven non-production, or the gate conjunction is
  incomplete, the cleanup must **refuse** (throw, exit non-zero), exactly as forward `--apply` refuses today.
- **What evidence is required before cleanup execution.** The same future-evidence checklist as forward execution
  (§18), plus an explicit test proving the drop is reversible-by-recreation (the forward `CREATE TABLE IF NOT EXISTS`
  re-creates the family) and leaves no production state behind.

**Not authorized here:** no cleanup / drop SQL is executed against any database.

---

## 13. Runtime `CHECK` / real-engine proof boundary

*(Topic H.)* Decomposition of the constraint-enforcement gap:

- **Phase 47F proved only DDL text + an in-memory mirror.** The `awref:` `CHECK` constraints (forward SQL :49-62,
  :79-88, :103-110), the `assertion_status IN ('active','superseded')` `CHECK` (:45-46), the `assertion_class` `CHECK`
  (:47-48), and the `UNIQUE` constraints (:63-64, :89-90) exist as **DDL text**; the reducer
  (`createSyntheticWriteReducer`) mirrors the same bounded `awref:` shape in memory (`SYNTHETIC_REF_MAX_LENGTH = 80`,
  `index.ts:604`). **No live Postgres engine has ever rejected a violating row** (47G §8 / §10).
- **Future execution must prove Postgres actually enforces the constraints.** A future lane must run the forward DDL
  against a real (ephemeral / dev) engine and prove the engine — not just the in-memory mirror — rejects violations.
- **Tests a future lane should cover against the real engine** (recorded as required future evidence, not added here):
  - an **invalid raw payload ref** (e.g. a value that is not `awref:payload:<short-id>`, or exceeds `VARCHAR(80)`) is
    rejected by the `candidate_payload_ref` `CHECK`;
  - a **wrong actor ref** (not `awref:actor:…`) is rejected by the `actor_ref` `CHECK` on every scoped table
    (assertion, supersession_link, tombstone);
  - an **overlength ref** (> 80 chars / > the `{0,59}` body bound) is rejected;
  - a **wrong awref kind** (e.g. `awref:tenant:` where `awref:assertion:` is required) is rejected by the
    column-specific `CHECK`;
  - a **conflict case** — a second insert violating `UNIQUE (tenant_ref, estate_ref, actor_ref, assertion_ref)` — is
    rejected and rolls back, with no partial admit.

**Not authorized here:** no real engine is exercised; the `CHECK` / `UNIQUE` constraints remain proven only as DDL text
+ in-memory mirror.

---

## 14. Privilege / secret boundary

*(Topic I.)* Decomposition of the credential / privilege controls a real execution would require:

- **No production credentials.** A future execution lane must use **non-production** credentials only; production DB
  credentials must never reach the spike.
- **No production DB roles.** Execution must use a least-privileged role scoped to the experimental objects, never a
  production migration / admin role.
- **Least privilege.** The execution role must hold only the privileges required to create / drop the
  `aw_isolation_spike_*` family on the non-production target — no broader grant.
- **No secret logging.** No credential, connection string, password, or token may be logged.
- **No DSN echo.** The target DSN must never be printed to stdout/stderr or any log (the current runner prints only the
  spike root, step count, and byte sizes — `runner :112-118` — and must stay that minimal).
- **No env dump.** No environment variable values may be dumped.
- **No migration content leak beyond the known static SQL.** The only statement text is the static `.sql` under
  `aw-sql-isolation-spike/sql/`; no dynamic SQL, no payload-derived SQL, and no private material may be introduced.

**Not authorized here:** no credentials, roles, grants, or secrets are involved or configured; the runtime no-leak
guard (`no-leak.ts`, 114 keys) is untouched.

---

## 15. Observability / audit boundary

*(Topic J.)* Decomposition of what may and may not be observed on a future execution path:

- **What logs are acceptable.** Minimal, non-sensitive operational logs — direction, step count, statement byte sizes,
  applied/rolled-back outcome — as the current dry-run runner already does (`runner :112-118`). A future execution path
  may add an explicit "applied N statements against <non-production target name>" line **only** if the target name is a
  non-secret, non-production, obviously-disposable identifier (§9 / §14).
- **What must not be logged.** Credentials, DSNs, raw payloads, raw reasons, private audit internals, signer / consent
  material, stack traces exposing secrets, or any environment dump (§14).
- **Whether private audit material is in scope or explicitly out of scope.** **Explicitly out of scope.** The canonical
  `TransitionReceipt` / `AuditEvent` audit-chain material is Straylight-owned (cross-repo, §17); this Dixie spike stores
  only bounded opaque `awref:` references and must never persist or log private audit internals.
- **How to prove no public response expansion.** A future lane must preserve the unchanged public response shape and
  the **114 = 114** runtime ↔ validator no-leak parity (`no-leak.ts`); the route-contract test-vectors (5/5) and the
  Phase 33E fixtures (5/5) must remain green; the self-check (44/44) must continue to fail closed on the negative
  mutations. The spike adds no public-response builder and no public surface, and a future execution lane must not
  change that.

**Not authorized here:** no observability / audit wiring is added; the public response shape and no-leak parity are
untouched.

---

## 16. Auth / consent / signer non-coverage

*(Topic K.)* For the avoidance of doubt: **a SQL execution sink, even if later implemented, would not by itself solve
any of the production trust boundaries.** Recorded explicitly — each remains its own separately-gated future blocker:

- **Production service auth.** The dev/operator opt-in env gate (and the route's dev `x-admission-service-token` /
  `x-admission-operator-id` allowlist) is **not** production authentication; an execution sink does not make it one.
- **End-user authorization.** A dev/operator-only execution sink has no end-user authorization model.
- **Consent proof / receipt.** Consent proof / receipt remains future-gated (the Phase 46S `aw_consent_proof_ref` is
  **deferred**); service / operator auth is never treated as consent; an execution sink does not establish consent.
- **Signer / authority semantics.** The canonical signer / receipt-signing authority is Straylight-owned and
  undischarged; an execution sink does not confer signer authority.
- **Tenant / estate / actor production identity binding.** The `awref:tenant:` / `awref:estate:` / `awref:actor:`
  references are **synthetic, route-owned opaque labels** in the spike; an execution sink does not bind them to
  production tenant / estate / actor identity.
- **Production admission readiness.** An execution sink against a non-production target proves nothing about production
  admission readiness, which remains blocked behind the cross-repo gate (§17).

**Not authorized here:** no auth, consent, signer, identity-binding, or production-admission model is implemented or
unblocked.

---

## 17. ADR-022E / Lane-2 boundary

*(Topic L.)* The cross-repo dependency, recorded explicitly:

- **A Lane-1 Dixie execution-sink proof cannot discharge ADR-022E gate #8.** Gate #8 is **Straylight-owned** and
  operatively held; no Dixie-side proof — planning, isolation, or even a future non-production execution sink — can
  discharge it. Phase 46N's gate #8 clearing remains a **bounded Dixie documentation / architecture / handoff
  prerequisite only**; the operative Straylight-side discharge stays blocked.
- **A Lane-1 execution-sink proof cannot authorize Lane-2 canonical Straylight-store migrations by itself.** Lane-2
  canonical migrations against the Straylight `StorageAdapter` substrate are each a **separate sibling-repo ADR under
  Straylight teammate review**, behind the operative gate #8. A Dixie Lane-1 execution sink (a bounded, non-production,
  experimental `aw_isolation_spike_*` proof) is **not** a Lane-2 canonical-store migration and does not authorize one.
- **Candidate D / ADR-022E boundary preserved.** Candidate D (split-storage) remains **proposal input / design
  baseline, not implemented production architecture**. The canonical Straylight `StorageAdapter` interface and the
  `Assertion` / `TransitionReceipt` / `AuditEvent` shapes stay Straylight-owned (cross-repo, not Dixie file:line).
- **An open question a future lane must answer.** Whether an execution sink even *belongs* in Dixie before the operative
  ADR-022E gate #8 is discharged — i.e. whether a Dixie Lane-1 execution proof is a useful, safely-bounded
  dev/operator artifact, or whether execution is properly a Lane-2 / canonical-store concern that must wait on the
  cross-repo gate. This gate **does not resolve** that question; it records it as a precondition for Phase 47I.

**Not authorized here:** ADR-022E gate #8 is not discharged; no Lane-2 canonical Straylight-store migration is
authorized; Candidate D is not implemented.

---

## 18. Future evidence checklist

*(Topic M.)* The evidence that must **exist and be accepted** before implementation of an execution sink could be
authorized. **This gate defines the checklist; it does not satisfy it and does not authorize implementation.** A future
code-bearing lane (Phase 47J or later) would be eligible only when **every** item below is demonstrably true and a
Phase 47I implementation-authorization checklist gate has accepted them:

```text
PHASE 47H — FUTURE EXECUTION-SINK EVIDENCE CHECKLIST
(defined here; NOT satisfied here; NOT an authorization; each item is a precondition for a future lane)

[ ] 1.  Docs gate acceptance — a docs-only Phase 47I implementation-authorization checklist gate is accepted
        (Verdict A), turning this decomposition into a precise, file:line-anchored authorization checklist.
[ ] 2.  Explicit file-scope envelope — the exact set of files a future execution lane may add/modify is
        enumerated and bounded (sink module, explicit runner change, tests), with migrate.ts /
        copy-migrations.mjs / server.ts / config.ts / src/db/migrations explicitly OUT of scope.
[ ] 3.  Explicit env-gate refusal posture — a distinct execution opt-in gate (conjunctive with the existing
        dev/operator opt-in and NODE_ENV != production) is specified, and the refusal-on-absence posture
        (throw, exit non-zero, no silent no-op, no default target) is pinned.
[ ] 4.  Test-only / dev-only DB target policy — only an ephemeral test DB or an explicitly non-production
        dev/operator DB is an acceptable target; the policy is written and testable.
[ ] 5.  No production DB target proof — a test proves the sink refuses the production DATABASE_URL and any
        production-identified DSN, and never defaults to DATABASE_URL.
[ ] 6.  No startup import proof — a test proves server.ts never imports the sink/runner and startup runs no
        experimental SQL (the only startup DB call stays `await migrate(dbPool)` at server.ts:303-305).
[ ] 7.  No production migration runner proof — a test proves migrate.ts is unchanged and the experimental
        execution never goes through migrate(dbPool), the _migrations ledger, or the production advisory lock.
[ ] 8.  No packaging/copy proof — a test proves copy-migrations.mjs is unchanged and the experimental SQL is
        never bundled into dist/db/migrations/.
[ ] 9.  No secret/log leak proof — a test proves no DSN echo, no credential/env dump, no secret in logs, and
        the 114-key no-leak parity is preserved.
[ ] 10. Transaction/rollback tests — against a real (ephemeral) engine: all-or-nothing apply, partial-failure
        rollback, conflict rollback, and idempotent replay are proven (not just against a fake).
[ ] 11. Real-engine CHECK constraint tests — the awref: / status / class CHECK and the UNIQUE constraints are
        proven to fire against a live Postgres engine (invalid payload ref, wrong actor ref, overlength ref,
        wrong awref kind, conflict case).
[ ] 12. Cleanup safety tests — the _down DROP runs only against an ephemeral/dev target, fails closed
        otherwise, and is proven reversible-by-recreation with no production state left behind.
[ ] 13. Codex acceptance — the future code-bearing lane passes its own Codex audit with no unresolved defect.
```

Until **every** item above is true and accepted, no execution-sink implementation is authorized.

---

## 19. Options considered

Each option is enumerated and evaluated, not implemented.

### Option A — Accept the decomposition; keep implementation BLOCKED; select a docs-only Phase 47I implementation-authorization checklist gate. **SELECTED.**

- **Would authorize.** Nothing implementable in this PR. It records the execution-sink / real-DB boundary
  decomposition (Sections 5–18) and selects a future **separate**, docs-only Phase 47I gate to turn the decomposition
  into a precise implementation-authorization checklist + file-scope envelope **before** any code-bearing
  execution-sink PR.
- **Still blocks.** All real DB execution; `--apply`; DB client / sink injection; production durable storage / DB
  writes / migration execution; Lane-2 canonical migrations; the route-contract / final-schema freeze; the operative
  ADR-022E gate #8 discharge (§22).
- **Risks.** Low — paper only. The decomposition is grounded read-only against the merged source; the execution
  boundary stays explicitly future-gated.
- **Verdict.** **SELECTED (§20 / §21).**

### Option B — Authorize immediate execution-sink implementation next. **REJECTED (too early).**

- **Risks.** Disqualifying now. The execution boundary has only just been decomposed (this gate); the future-evidence
  checklist (§18) is defined but unsatisfied, and the precise file-scope envelope + authorization checklist is exactly
  what Phase 47I must produce. Authorizing implementation before that checklist would skip the same discipline
  (decompose → checklist → spike) that governed the isolation lane (47C → 47D → 47E → 47F).

### Option C — Reject the execution-sink path and keep a planning-only spike indefinitely. **NOT SELECTED; remains the live fallback.**

- **Would authorize.** Nothing new; the accepted Phase 47A `.json` Mode 2 spike (47B) remains the durable
  route-storage mechanism, and the Phase 47F planning-only spike stands as the SQL proof.
- **Risks.** Low; it loses no ground but forecloses a path the decomposition shows can be specified safely. Retained as
  the live fallback any future execution lane must fall back to if it cannot satisfy the §18 evidence without weakening
  the production posture.
- **Verdict.** **Not selected as the forward lane.**

### Option D — Jump to production durable storage. **REJECTED.**

- **Risks.** Disqualifying. Production durable storage requires the operative Straylight-side ADR-022E gate #8
  discharge (held — §17), production DB writes, and a final schema; none is authorized.

### Option E — Discharge ADR-022E gate #8. **REJECTED.**

- **Risks.** Disqualifying. Gate #8 is Straylight-owned and operatively held; no Dixie docs-only decomposition gate can
  discharge it (§17).

### Option F — Hand off to Freeside runtime / client integration. **REJECTED (now).**

- **Risks.** Out of scope. Freeside stays a consumer / handoff surface; its integration is a separate future gate and
  remains blocked.

### Option G — Route-contract freeze / final schema freeze. **REJECTED.**

- **Risks.** Disqualifying. `route_contract_final` and `schema_final` stay false; nothing in this chain authorizes a
  freeze, and the `aw_*` schema is an explicit non-final draft subset (§4 / §17).

---

## 20. Decision

Phase 47H **decomposes the Lane-1 `aw_*` SQL execution-sink / real-DB boundary** (Sections 5–18) and **keeps
implementation BLOCKED** (Verdict A, Option A). It finds that:

- the chain is at the **planning-only / fake-sink baseline** (§5 / §6): no real execution sink exists, `--apply` is
  refused (`runner :101-107`), and no connection is opened;
- moving off that baseline requires a precise set of prerequisites — DB client / sink injection (§7), apply-mode gating
  (§8), database-target isolation (§9), runner / startup / packaging isolation (§10), transaction / lock / idempotency
  (§11), cleanup / down-migration (§12), real-engine `CHECK` proof (§13), privilege / secret (§14), observability /
  audit (§15) — **none** of which is satisfied today;
- an execution sink would **not** by itself solve production auth, end-user authorization, consent, signer authority,
  tenant/estate/actor production identity binding, or production-admission readiness (§16);
- a Lane-1 Dixie execution-sink proof **cannot** discharge ADR-022E gate #8 or authorize Lane-2 canonical
  Straylight-store migrations (§17);
- and the future-evidence checklist (§18) — docs-gate acceptance, file-scope envelope, env-gate refusal posture,
  test-only / dev-only target policy, no-production-target proof, no-startup-import proof, no-production-runner proof,
  no-packaging proof, no-secret/log-leak proof, transaction/rollback tests, real-engine `CHECK` tests, cleanup-safety
  tests, and Codex acceptance — must all be satisfied before any code-bearing execution lane.

**Phase 47H authorizes no implementation.** It does **not** enable `--apply`, inject a DB client / sink, open a
connection, write a DB, execute a migration, change the runner / packager / startup / config, claim production
readiness, freeze the route contract or final schema, or discharge any Straylight-side gate. The next step is a
separate, docs-only Phase 47I gate that turns this decomposition into a precise implementation-authorization checklist
and file-scope envelope (§21). Until that gate **and** a subsequent explicitly-authorized lane, **no PR may add an
execution sink, enable `--apply`, inject a DB client, or run experimental SQL against any database.**

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

## 21. Next lane

> **Selected next lane: Phase 47I — Lane-1 `aw_*` SQL execution sink implementation-authorization checklist gate (a
> *separate*, docs / decision-only gate).**

> **Phase 47I status note (forward traceability).** Phase 47I (PR pending,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md))
> **converted** this Phase 47H decomposition into a precise, file:line-grounded implementation-authorization checklist
> and file-scope envelope (Verdict A), **kept implementation BLOCKED**, and **conditionally authorized** a future,
> separate, code-bearing **Phase 47J — Lane-1 `aw_*` SQL execution sink dev/operator spike** — bounded,
> disabled-by-default, dev/operator/test-only, non-production, exact-scope, and acceptance-gated on that checklist.
> `--apply` / DB client / sink injection / real DB execution all **remain blocked** in Phase 47I itself.

Phase 47I must be **docs / decision-only**. It turns this Phase 47H decomposition into a **precise
implementation-authorization checklist and file-scope envelope** — i.e. the exact implementation file scope, the
conjunctive gates, the required tests, and the evidence (§18) that must exist before a later code-bearing **Phase 47J**
execution-sink lane may be allowed. Phase 47I **should not itself implement real DB execution, enable `--apply`, inject
any sink, or open any connection.**

Stated clearly so the next lane carries no ambiguity:

- **Phase 47I is not real DB execution.**
- **Phase 47I is not `--apply` authorization.**
- **Phase 47I is not DB client / sink injection.**
- **Phase 47I is not production storage, a production migration, or a schema / route-contract freeze.**
- **Phase 47I is not an ADR-022E gate #8 discharge.**
- **Phase 47I is docs-only** — it defines the checklist; a *subsequent* code-bearing lane (47J), gated on that
  checklist and its own Codex audit, would be the first that could implement an injected, test-first, non-production
  execution sink.

**Not selected:** authorize immediate execution-sink implementation (Option B); reject the path indefinitely (Option C,
retained as fallback); production durable storage (Option D); gate #8 discharge (Option E); Freeside integration
(Option F); any freeze (Option G); any execution / `--apply` / sink-injection **in this PR**. The accepted Phase 47A
`.json` path remains the live fallback if a future execution lane cannot satisfy the §18 boundary without weakening the
production posture.

---

## 22. Preserved blocked lanes

Regardless of verdict, the following remain **blocked** after Phase 47H — **none** is unblocked by this decomposition
gate:

- **Lane-1 `aw_*` SQL real DB execution** — no execution sink exists; `--apply` is refused; blocked behind Phase 47I
  and a subsequent authorized lane;
- **`--apply` enablement** — blocked;
- **DB client / sink injection** — blocked;
- **production DB target** — blocked; the production `DATABASE_URL` is never an execution target;
- **production migration files / executable production schema** — blocked;
- **production migration execution** — blocked;
- **production DB writes** — blocked;
- **production durable-store implementation** — blocked;
- **migration runner changes** (`migrate.ts`) — blocked; the Candidate E hard-deny layer stays paper-only
  defense-in-depth, not authorized;
- **packaging / copy-runner changes** (`copy-migrations.mjs`) — blocked;
- **startup mutation** (`server.ts`) — blocked; the only startup DB call stays `await migrate(dbPool)` at
  `server.ts:303-305`;
- **scope-guard weakening / editing** (`scope-guards.test.ts`) — blocked;
- **Lane-2 canonical Straylight-store migrations** — blocked (each a separate sibling-repo ADR under Straylight
  teammate review, behind the operative gate #8);
- **production admission** — blocked;
- **public `remember-this`** — blocked;
- **Discord / freeform ingestion** — blocked;
- **user chat becoming memory merely because it was said** — blocked; consent never inferred from chat;
- **Freeside runtime / client integration** — blocked (Freeside stays a consumer / handoff surface);
- **package exports** of the spike — blocked unless separately justified and audited;
- **LLM / voice / Finn runtime wiring** — blocked;
- **MVP 3 forget / revoke / correction UI** — blocked;
- **route-contract freeze** — blocked; `route_contract_final` stays false;
- **final schema freeze** — blocked; `schema_final` stays false; no `aw_*` migration is claimed safe;
- **production readiness of any kind** — not claimed;
- **operative Straylight-side ADR-022E gate #8 discharge** — not claimed (no repo evidence); sibling gates remain held.
  **This remains the dominant cross-repo blocker** for production admission and any Lane-2 canonical-store migration.

**Candidate D / ADR-022E boundary preserved.** Candidate D (split-storage) remains **proposal input / design
baseline, not implemented production architecture**; Phase 46N's gate #8 clearing remains a **bounded Dixie
documentation / architecture / handoff prerequisite only**; the operative Straylight-side discharge remains blocked.
The canonical Straylight `StorageAdapter` interface and the `Assertion` / `TransitionReceipt` / `AuditEvent` shapes
stay Straylight-owned (cross-repo).

> **Why this does not imply production readiness.** Decomposing the execution-sink / real-DB boundary unblocks **no**
> execution / production / public / canonical-store / Freeside / LLM / package / freeze / real-DB work. Phase 47H only
> *names and orders* the prerequisites for a future execution lane and selects a docs-only checklist gate (47I) to make
> them precise. Every lane above remains its own separately-authorized future gate.

---

## 23. Codex audit checklist

This checklist audits **this Phase 47H PR** — the docs-only execution-sink / real-DB boundary decomposition gate. Every
item must be ACCEPT; any REJECT blocks acceptance of this Phase 47H PR.

```text
PHASE 47H — LANE-1 aw_* SQL EXECUTION-SINK / REAL-DB BOUNDARY DECOMPOSITION GATE CODEX AUDIT CHECKLIST
(docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47H PR)

[ ] 1.  Scope is docs-only — Phase 47H adds only this document plus, optionally, the two §24 forward-
        traceability status notes (in the Phase 47G acceptance gate and the Phase 47F runbook); it modifies
        no runtime source, and specifically not migrate.ts, copy-migrations.mjs, any *.sql, the experimental
        SQL / manifest / planner (aw-sql-isolation-spike/*) / runner, no-leak.ts, route-storage-durable-
        spike.ts, route-storage-spike.ts, config.ts, server.ts, or scope-guards.test.ts.
[ ] 2.  No runtime/source/test/config/package/CI/SQL/migration/vector/validator/fixture changes — no route
        handler, store/storage code, DB code, migration runner, packaging/copy runner, planner, runner, auth,
        consent, server-boot, unit/integration test, scope-guard test, isolation test, fixture, route-vector
        JSON, route-vector validator, route-vector README, config.ts, env gate, package.json, lockfile,
        .github/ CI, .sql, aw_* schema, executable schema, migration file, or migration directory is added or
        modified.
[ ] 3.  No real DB execution authorization — the doc states explicitly that Phase 47H authorizes no execution
        against any database (§1 / §20 / §22).
[ ] 4.  No --apply authorization — --apply remains refused (runner :101-107); this gate authorizes no --apply
        and adds no execution opt-in env var (§8 / §20).
[ ] 5.  No DB client/sink injection authorization — no sink is constructed/injected/authorized; the spike
        module stays pool-free and node:-only (§7 / §20).
[ ] 6.  No production DB target authorization — the production DATABASE_URL (config.ts:340) is never an
        execution target; no target is configured/allowlisted/connected (§9).
[ ] 7.  No production migration execution — blocked (§22).
[ ] 8.  No production durable storage — blocked (§22).
[ ] 9.  No startup/packaging/migration-runner mutation — migrate.ts, copy-migrations.mjs, and server.ts are
        unchanged; the only startup DB call is cited as server.ts:303-305 (§10 / §22).
[ ] 10. Phase 47F / 47G represented accurately (§4) — 47F: 9 files / +2439 lines / zero production-path files;
        isolated SQL (3-table family), exact manifest, planner/guard/apply module (applyIsolationSpikePlan at
        index.ts:568 via injected sink at index.ts:124-129), explicit dev/operator runner (--apply refused at
        runner :101-107), three tests, runbook. 47G: docs-only acceptance, Verdict A, real DB execution NOT
        authorized, selected this 47H.
[ ] 11. Execution-sink boundary decomposed completely — the five sink forms (§5), the non-execution baseline
        (§6), and all of DB-client/sink injection (§7), apply-mode gate (§8), DB-target isolation (§9),
        runner/startup/packaging isolation (§10), transaction/lock/idempotency (§11), cleanup/down (§12),
        real-engine CHECK proof (§13), privilege/secret (§14), observability/audit (§15), auth/consent/signer
        non-coverage (§16), ADR-022E/Lane-2 boundary (§17), and the future-evidence checklist (§18) are
        present and grounded.
[ ] 12. Next lane is docs-only — Phase 47I is a docs/decision-only implementation-authorization checklist gate
        that itself implements no real DB execution and enables no --apply; a later Phase 47J (not 47I) would
        be the first code-bearing lane (§21).
[ ] 13. Preserved blocked lanes are explicit (§22) — real DB execution, --apply, DB client/sink injection,
        production DB target, production migrations / DB writes / migration execution, migration-runner /
        packager / startup / scope-guard changes, Lane-2 canonical migrations, route-contract / final-schema
        freeze, and the operative ADR-022E gate #8 discharge all remain BLOCKED.
[ ] 14. No production overclaim — no production-readiness, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, production-DB-write, production-migration-execution, Freeside-runtime,
        Lane-2-canonical, or aw_*-SQL-production-safe claim; every such reference is negated / blocked.
[ ] 15. No bad citation regression — no migrate.ts:303-305 citation (migrate.ts is 254 lines); the conditional
        startup migrate is cited as server.ts:303-305; the canonical scope-guard denylist is the 19-entry
        scope-guards.test.ts:122-142.
[ ] 16. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5
        (no sixth vector); self-check 44/44; git diff --check and git diff --cached --check clean (§24).
[ ] 17. No adjacent-repo changes — no file in loa-straylight or freeside-characters (or any adjacent repo) was
        created or modified by Phase 47H.
[ ] 18. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp /
        temp, __pycache__, .pyc, dist, or .claude artifact appears in the Phase 47H working tree.
[ ] 19. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the
        Claude Code memory store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
```

---

## 24. Validation

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47H is
docs/decision-only — it adds only this document (plus, optionally, the two minimal forward-traceability status notes
below) and mutates no runtime source, test, validator, vector, fixture, migration, or SQL file — so the validators are
run only to confirm the unchanged artifacts remain green.

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
# Docs-only static scans:
git diff --name-only HEAD -- app src package.json package-lock.json '.github/**' '*.sql' 'dist/**' 'build/**'
git status --short --untracked-files=all | grep -E '\.sql$|migration|migrations|aw_'
git status --short --untracked-files=all | grep -iE 'MEMORY|memory|grimoire|__pycache__|\.pyc|generated|tmp|temp|\.claude|dist'
# Adjacent-repo reference scan (interpret: cross-repo mentions in prose are fine; no adjacent file is touched):
grep -RInE 'loa-arcturus|arcturus|loa-sensenet|sensenet' docs app package.json package-lock.json .github 2>/dev/null || true
# Overclaim scan (interpret: negated blocked-lane references are fine; positive claims are not):
grep -RInE 'production ready|production readiness|route-contract freeze|final schema freeze|ADR-022E.*discharged|production migration execution authorized|production DB writes authorized|durable production storage authorized|Freeside runtime|Lane-2 canonical|aw_\* SQL.*production-safe|real DB execution authorized|--apply authorized|DB client.*authorized|sink injection.*authorized|ready to implement|implementation-ready|production-safe' \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-BOUNDARY-GATE.md \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md \
  docs/admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-BOUNDARY-GATE.md
```

**Recorded results for this lane** (run during authoring; full output accompanies the operator run report):

- **docs-only scope** — only the new file `docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-BOUNDARY-GATE.md` is added,
  plus the two minimal forward-traceability status notes (list below); no runtime source (and specifically not
  `migrate.ts`, `copy-migrations.mjs`, any `*.sql`, the experimental SQL / manifest / planner / runner, `no-leak.ts`,
  `route-storage-durable-spike.ts`, `route-storage-spike.ts`, `config.ts`, `server.ts`, or `scope-guards.test.ts`), no
  runtime test, no route-vector JSON, validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`, package
  / lockfile, config / env, CI, migration, SQL, executable schema, or generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**; the
  `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail closed; 2 exact-key
  non-over-match guards stay clean);
- **docs-only static scans** — the `app src package.json … *.sql dist build` diff is empty; the `.sql$|migration|aw_`
  scan matches only this document's prose (no new SQL / migration file); the memory/generated/temp scan matches
  nothing under the working tree from this phase;
- **adjacent-repo reference scan** — any `arcturus` / `sensenet` matches are prose-only and no adjacent-repo file is
  created or modified;
- **overclaim scan** — every match is a **negated / blocked** reference (e.g. "route-contract freeze — blocked",
  "final schema freeze — blocked", "Lane-2 canonical … remain blocked", "Freeside runtime / client integration —
  blocked", "production readiness … not claimed", "no claim that `aw_*` SQL is production-safe", "`--apply` remains
  refused", "DB client / sink injection — blocked"); there is **no** positive authorization or safety claim;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–24 exactly once each.

**Forward-traceability status notes added (§24 scope):**

- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md` — a one-line Phase 47H status note recording
  that Phase 47H (this gate) decomposed the execution-sink / real-DB boundary, kept implementation blocked (Verdict A),
  and selected a docs-only Phase 47I implementation-authorization checklist gate.
- `docs/admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md` — a one-line Phase 47H status note recording that
  the execution-sink / real-DB boundary was decomposed downstream and that `--apply` / real DB execution remain blocked
  behind Phase 47I and a later code-bearing lane.

**Corruption / duplicate guard** (carried from the 46I–47G precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 24.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the three fenced blocks are the §18 future-
  evidence checklist (a `text` block), the §23 Codex audit checklist (a `text` block), and the §24 validation command
  list (a `bash` block). **No fenced block is an executable migration or runnable schema.**
