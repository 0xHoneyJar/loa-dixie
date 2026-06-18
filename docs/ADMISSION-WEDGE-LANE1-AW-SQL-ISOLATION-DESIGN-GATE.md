# Phase 47D — Lane-1 `aw_*` SQL isolation design gate

> **Phase**: 47D
> **Branch context**: `phase-47d-aw-sql-isolation-design-gate`
> **Related**: Phase 47C (PR #174,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the Lane-1 `aw_*` SQL durable-store / migration-runner blocker (Verdict A — implementation stays
> BLOCKED), recorded that Phase 47A delivered durability by **sidestepping** (not solving) the SQL / migration-runner
> frontier, mapped candidate isolation patterns P1–P8 without selecting any, and **selected this Phase 47D Lane-1
> `aw_*` SQL isolation *design* gate**; Phase 47B (PR #173,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md))
> **accepted** the merged Phase 47A Mode 2 durable route-storage spike as a bounded, disabled-by-default,
> dev/operator-only, **non-production**, `.json`-snapshot proof (Verdict A); Phase 47A (PR #172,
> [`admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md))
> **implemented** Storage Mode 2 durability as a **file-backed `.json` snapshot store off the production migration
> path** — **no** SQL, **no** `aw_*` migration material, **no** migration-runner change, **no** packaging / copy-runner
> change, **no** production DB write, **no** production migration execution; Phase 46Z (PR #171,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md))
> **authorized** that spike on a hard checklist (acceptance-gated, mode-contingent); Phase 46Y (PR #170,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md))
> **designed** the migration-isolation / scope-guard boundary on paper (the four-class P / E / T / C model); Phase
> 46X (PR #169,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the Mode 2 enablement blocker; Phases 46V / 46W (PR #167 / #168) implemented and accepted the **Mode
> 1** in-process route-storage spike the Mode 2 store wraps; Phases 33Q / 33R (PR #135 / #136) implemented and
> accepted the bounded synthetic admitted-assertion ledger; Phases 33M / 33N / 33O (PR #131 / #132 / #133) authorized,
> implemented, and accepted the dev/operator-only route spike and the Phase 33N static scope guards; Phases 46S / 46T
> (PR #164 / #165) drafted and accepted the durable-store schema / migration **design** (13 `aw_*` tables across 11
> subsections; `schema_final` / `route_contract_final` **false**); Phase 46N **cleared** ADR-022E gate #8 as a **Dixie
> documentation / architecture / handoff prerequisite only** while the operative Straylight-side discharge **remains
> held**; Straylight (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); ADR-022E durable-store gate #8 (+
> sibling gates #9 / #10 / #11 / #12 / #15 / #20, **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only isolation-design gate.** This gate adds **only this document** (plus at most two
> minimal forward-traceability status notes in the immediate predecessor Phase 47C decomposition gate and the Phase
> 47B acceptance gate, §23). It modifies **no** runtime source — and specifically does **not** modify
> `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`,
> `app/src/services/admission-wedge-spike/route-storage-durable-spike.ts`, `route-storage-spike.ts`, `index.ts`,
> `no-leak.ts`, `app/src/config.ts`, `app/src/routes/admission-intake.ts`, `app/src/server.ts`, or
> `app/tests/unit/admission-wedge-spike/scope-guards.test.ts` — and changes **no** route handler, storage / store
> code, DB write, migration, SQL file, executable schema, migration runner, packaging / copy runner, scope guard,
> auth, consent, route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture
> validator, other test, package export, config, env, package, lockfile, CI, generated file, or binary. No adjacent
> repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is the Lane-1 `aw_*` SQL isolation *design* gate** — the docs-only rung Phase 47C §19 named, one frontier
> above the Phase 47C decomposition. It **compares candidate isolation designs on paper** and **selects a preferred
> design direction for a later, separate authorization gate**, against the frontier Phase 47A **sidestepped** by
> delivering durability as a `.json` file rather than as Lane-1 `aw_*` SQL. **It is not a spike, it authorizes no
> implementation, and it builds nothing.** It **adds no `aw_*` SQL, writes no DB, adds no migration, creates no
> executable schema, executes no migration, changes no migration runner or packaging / copy runner, weakens no scope
> guard, implements no auth or consent, changes no route / API behavior, freezes neither the route contract nor the
> final schema, discharges no operative Straylight-side gate, and claims no production readiness.** It does **not**
> claim that `aw_*` SQL is currently safe or authorized, and the design direction it selects is **not**
> implementation-ready without a later authorization gate.

Every assessment below is grounded **read-only** against the actual Dixie repo at authoring time: the migration
runner `app/src/db/migrate.ts`, the build-asset packager `app/scripts/copy-migrations.mjs`, the shared migration
directory `app/src/db/migrations/`, the Phase 33N static scope guards
`app/tests/unit/admission-wedge-spike/scope-guards.test.ts`, the merged Phase 47A durable store
`app/src/services/admission-wedge-spike/route-storage-durable-spike.ts` and its Phase 47A isolation /
guard-refinement test evidence (`durable-migration-isolation.test.ts`, `durable-scope-guard-refinement.test.ts`),
the conditional mount + migrate call in `app/src/server.ts`, the env parsing in `app/src/config.ts`, the Phase 47A
runbook, and the predecessor decision gates (47C / 47B / 46Z / 46Y / 46X / 46V / 46W / 46U / 46T / 46S / 46N). Where
a claim could not be grounded inside the read material, it is marked as such. **The canonical Straylight
`StorageAdapter` interface and the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes live in
the adjacent `loa-straylight` repository (cross-repo references, not Dixie file:line) and remain Straylight-owned
(§20).**

---

## 1. Status

Phase 47D is the bounded, docs/decision-only **Lane-1 `aw_*` SQL isolation design gate** named by Phase 47C §19. Its
purpose is to take the candidate-isolation option space that Phase 47C **mapped without selecting** (the §15 P1–P8
patterns and the §10 narrow replacement / allowlist scope-guard model) and **compare those candidates on paper**,
against the Phase 47C §16 evidence bar, in order to **select a preferred isolation *design direction*** for a later,
separate authorization gate — while keeping **every** implementation lane blocked. It compares designs; it implements
none of them.

**What this phase is, stated narrowly and exactly.** Phase 47D:

- is **docs / decision-only** — it states an isolation problem, restates the current migration-runner / packaging /
  scope-guard boundary read-only, enumerates candidate isolation designs A–H, compares them, and selects a preferred
  design *direction* for a later authorization gate;
- is an **isolation-design gate**, *not* an implementation, *not* the spike *authorization* checklist gate, *not* the
  blocker *decomposition* gate (47C — which decomposed the SQL / runner / packaging / guard frontier), and *not* the
  durable-spike *acceptance* gate (47B);
- does **not** modify runtime source or tests — and specifically does not touch `migrate.ts`, `copy-migrations.mjs`,
  any `*.sql` migration, `route-storage-durable-spike.ts`, `route-storage-spike.ts`, `index.ts`, `no-leak.ts`,
  `config.ts`, `admission-intake.ts`, `server.ts`, or `scope-guards.test.ts`;
- does **not** add `aw_*` SQL, create migrations, or create executable schema;
- does **not** execute any migration and does **not** perform any DB write;
- does **not** change the migration runner (`migrate.ts`) or the packaging / copy runner (`copy-migrations.mjs`);
- does **not** weaken, relax, edit, add, or remove any scope guard;
- does **not** change route / API behavior, and does **not** expand the public response;
- does **not** implement or unblock auth or consent;
- does **not** authorize production admission;
- does **not** freeze the route contract or the final schema;
- does **not** claim production readiness;
- does **not** claim or discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §20);
- does **not** select `aw_*` SQL implementation, migration-runner changes, packaging changes, DB writes, or migration
  execution as the next lane; it selects only a further **docs/decision-only** Phase 47E Lane-1 SQL isolation design
  *acceptance / implementation-authorization checklist* gate (§23), which itself implements nothing;
- does **not** state, in any positive sense, that `aw_*` SQL is currently safe or authorized — it is **not**; and the
  selected design direction is **not** implementation-ready without a later authorization gate.

The load-bearing decision of this gate is **Verdict A (§22)**: a layered isolation design direction is **selected on
paper** for a later authorization gate, and **all implementation stays BLOCKED**. Selecting a design direction is not
authorizing it; the preferred direction in §18 becomes input to the Phase 47E acceptance / authorization-checklist
gate, not a license to write SQL.

---

## 2. Scope

**In scope (docs/decision-only).** Stating the isolation problem (§5) Phase 47A sidestepped; restating, read-only,
the current production migration-runner / packaging boundary (§6) and the current Phase 33N scope-guard boundary
(§7); enumerating the design requirements any future isolated `aw_*` SQL path must satisfy (§8); comparing candidate
isolation designs A–H on paper (§9–§16); a comparative assessment (§17); selecting a preferred isolation **design
direction** for a later authorization gate (§18); recording the evidence still missing (§19) and the future
implementation-authorization requirements (§20); naming what remains blocked (§24); and selecting the next docs-only
lane (§23). The candidate comparison and the preferred-direction selection are **paper-only**; nothing is built,
sequenced for build, or authorized for build.

**Out of scope (forbidden by this gate).** Any runtime source change; any test, config/env, package/lockfile, or CI
change; any migration, SQL file, or executable schema; any migration-runner or packaging/copy-runner change; any
vector/validator/fixture change; any generated/binary file; any adjacent-repo change; any public response expansion;
a route-contract freeze; a final schema freeze; an ADR-022E gate #8 discharge; any production durable-store
implementation; any production DB write; any production migration execution; any production readiness claim; any
Freeside runtime / client integration; any Lane-2 canonical Straylight-store migration claim; any claim that `aw_*`
SQL is currently safe or authorized; and any claim that the selected design direction is implementation-ready without
a later authorization gate. **Implementing or authorizing** the preferred design — even the one this gate selects on
paper — is itself **not** in scope here; that requires the §23 next lane (Phase 47E) and then a separate
implementation lane, and even Phase 47E would implement nothing.

---

## 3. Source chain

Phase 47D sits one rung above Phase 47C in an explicit, PR-anchored chain. Each link is read-only input here; none is
modified except the two §23 forward-traceability status notes. PR numbers are git-sourced from merge-commit subjects
(a Dixie convention). Dixie 47-series / 46-series / 33-series phase labels and the Straylight ADR-022E "Phase 22"
labels are **independent cross-repo labels**.

| Phase | PR | Artifact / contribution (relevant to this design gate) |
|-------|----|------|
| 33M / 33N / 33O | #131 / #132 / #133 | **Dev/operator route spike + Phase 33N static scope guards.** `POST /api/admission/intake`, disabled-by-default behind `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`, dedicated `x-admission-service-token` + `x-admission-operator-id`, runtime `no-leak.ts`; the `scope-guards.test.ts` denylist + import guards (§7). |
| 33Q / 33R | #135 / #136 | **Bounded synthetic admitted-assertion ledger.** Process-local, capacity-bounded, `(tenant_id, estate_id)`-scoped, fail-closed, synthetic-only ledger the spike wraps per synthetic actor. |
| 46V / 46W | #167 / #168 | **Mode 1 route-storage spike (implementation + acceptance).** In-process `Map` state, no migration, no SQL, no DB write; **declined Mode 2** because the only durable substrate considered was Lane-1 `aw_*` SQL, which the runner / packager / guards block. The Mode-1 engine the Mode 2 store wraps. |
| 46X | #169 | **Mode 2 enablement *blocker-decomposition* gate (docs-only).** Mode 2 remains BLOCKED; the blocker decomposed into required future gates. |
| 46Y | #170 | **Mode 2 migration-guard / scope-guard boundary *design* gate (docs-only).** Designed, on paper, the four-class migration model (P / E / T / C) and the refined / replacement scope-guard model. The structural template for this gate. |
| 46Z | #171 | **Mode 2 implementation-authorization *checklist* gate (docs-only).** Converted the 46Y design into a hard, file:line-grounded checklist and authorized a separate-PR, bounded, dev/operator-only, disabled-by-default, non-production Mode 2 spike, acceptance-gated and mode-contingent. |
| 47A | #172 | **Dev/operator durable (Mode 2) route-storage spike (implementation).** Implemented Mode 2 durability as a `.json`-snapshot **file** store (`route-storage-durable-spike.ts`) **off the production migration path**. **No SQL, no `aw_*` migration, no runner / packager change, no DB write.** |
| 47B | #173 | **Durable-spike acceptance gate (docs-only).** Verdict A — accepted Phase 47A; recorded that the spike **delivered durability by sidestepping** the Lane-1 `aw_*` SQL / migration-runner frontier (§5 of 47B), not by resolving it; selected the Phase 47C lane. |
| 47C | #174 | **Lane-1 `aw_*` SQL durable-store / migration-runner *blocker-decomposition* gate (docs-only).** Verdict A — decomposed the SQL / runner / packaging / guard frontier 47A sidestepped into the §16 required-evidence set and §15 candidate-pattern map (P1–P8); kept Lane-1 SQL fully blocked; **selected this Phase 47D Lane-1 `aw_*` SQL isolation design gate.** |
| **47D** | *(this doc; docs/decision-only — not committed / merged yet)* | **Lane-1 `aw_*` SQL isolation design gate — compares candidate isolation designs A–H on paper, selects a preferred *design direction* for a later authorization gate, keeps all implementation BLOCKED; selects Phase 47E.** |
| 46S / 46T | #164 / #165 | **Durable-store schema / migration *design* (draft) + acceptance.** 13 `aw_*` tables across 11 subsections; `schema_final` / `route_contract_final` **false**. The `aw_*` table set §8 / §19 refer to as a paper draft, not a frozen schema. |
| 46N / 46M | (gate #8 re-authored clearing ADR / Candidate D) | **Gate #8 bounded paper clearing** (Dixie docs/arch/handoff prerequisite only; operative Straylight-side discharge held) and **Candidate D** (split-storage) proposal input (§20). |
| 46O / 46P / 46Q | #160 / #161 / #162 | **Runtime no-leak mirror** at **114 = 114** parity — the boundary any future SQL-backed store must hold over persisted / replayed public surfaces (§8 F). |

---

## 4. Phase 47C intake

Phase 47C (PR #174) is the immediate predecessor and the direct input to this design gate. Read-only, Phase 47D
intakes the following from it:

- **Verdict.** Phase 47C reached **Verdict A — the Lane-1 `aw_*` SQL / migration-runner blocker is decomposed and
  implementation stays BLOCKED** (47C §18). Phase 47D does not re-open or re-litigate that verdict; it builds the
  design comparison on top of it.
- **The four sidestepped surfaces.** 47C §7–§10 decomposed the frontier into (1) migration discovery / adoption
  (`migrate.ts`), (2) packaging / copy (`copy-migrations.mjs`), (3) runner isolation (no dev/operator-only runner
  exists), and (4) the Phase 33N scope guards (`scope-guards.test.ts`). These are the four surfaces any isolation
  design must address; §6 and §7 restate the runner/packaging and scope-guard boundaries read-only.
- **What Phase 47A avoided, not solved.** 47C §5 recorded that Phase 47A's `.json` snapshot avoided each blocker *by
  construction* (no SQL, no `.sql`, no forbidden tokens, no dev-only runner), so the SQL frontier is **open,
  untouched, and unresolved**. Phase 47D designs around exactly that open frontier.
- **The candidate-pattern map (P1–P8).** 47C §15 enumerated eight candidate patterns **without selecting any**: P1
  separate experimental migration directory; P2 manifest / allowlist-gated experimental runner; P3 explicit
  dev/operator-only runner command; P4 env-category gating in `_migrations`; P5 explicit deny from the normal runner;
  P6 test-only harness schema (Class T); P7 no-SQL continuation; P8 decide Lane-1 SQL unnecessary, keep blocked. The
  candidate set this gate compares (A–H, §9–§16) recombines and extends that map; the cross-reference is recorded per
  candidate.
- **The narrow replacement / allowlist scope-guard model.** 47C §10 observed (design-only) that a future SQL path
  would require a **path-specific, token-specific, negative-tested** allowlist of one named module — **not** guard
  deletion. Phase 47D folds that model into the preferred direction (§18 element 5) and the requirements (§8 D).
- **The evidence bar.** 47C §16 listed twelve evidence items (1–12) required before any authorization, and recorded
  that items 1–4 (isolation model, no-production-startup proof, no-packaging proof, refined guard) have **no repo
  realization**. Phase 47D carries that bar forward as §19 / §20.

Phase 47D adds **no** new grounding claim that contradicts 47C; where it cites `file:line`, the citation is re-read
against current source at authoring time (§6, §7) and matches 47C's grounding with benign line drift noted where it
occurred.

---

## 5. Isolation problem statement

The problem Phase 47D designs around — stated precisely, the way Phase 47A's `.json` mechanism deliberately left it
open:

**A Lane-1 `aw_*` SQL durable store cannot be implemented on the current surface without colliding with three
independent production safeguards at once.** Concretely:

1. **The production migration runner adopts any new `.sql` file in the shared directory into the production set.**
   `discoverMigrations()` (`migrate.ts:76-85`) does a flat `readdir(MIGRATIONS_DIR)` (`migrate.ts:77`) of the single
   directory `app/src/db/migrations/` (resolved at `migrate.ts:23`) and adopts **every** file matching
   `f.endsWith('.sql') && !f.includes('_down')` (`migrate.ts:79`). An `aw_*.sql` placed there is discovered and, at
   startup with a DB pool, **executed** against the production database (§6). There is **no** `aw_*` / experimental
   exclusion anywhere in the runner.
2. **The production packager copies any `.sql` file in the source migrations directory into the production bundle.**
   `copy-migrations.mjs` scans `SRC_DIR = src/db/migrations` (`copy-migrations.mjs:23`) and copies every file matching
   `e.isFile() && e.name.endsWith('.sql')` (`copy-migrations.mjs:39`) into `dist/db/migrations` (`copy-migrations.mjs:24`).
   It applies **no** `aw_*` / experimental / `_down` filter, so a misplaced experimental `aw_*.sql` becomes production
   bundle material (§6).
3. **The Phase 33N scope guards forbid every durable-write / SQL / migration token and every production-store import
   on the spike surface.** The `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`, 19 entries) and the import
   denylist (`scope-guards.test.ts:185-198`) fail the test on any `INSERT` / `CREATE TABLE` / `pool.query` / `migration`
   token or any `pg` / `/db/migrate` / `-store` import in the spike directory. A Lane-1 SQL store written on that
   surface trips the guard immediately (§7).

Phase 47A avoided all three by writing a `.json` snapshot via `node:fs` — no SQL, no `.sql`, no forbidden token, no
dev-only runner. That was the correct lowest-blast-radius Mode 2, but it **resolved nothing** about SQL. **The
isolation problem is therefore: design a mechanism by which a dev/operator-only, disabled-by-default, non-production
`aw_*` SQL path could exist such that (a) the production runner can never discover or execute it, (b) the production
packager can never bundle it, (c) the scope guards still fail closed everywhere except one narrowly-named module, and
(d) the storage / public-private / auth-consent / non-production boundaries (§8) all hold — and to do so on paper,
without building, authorizing, or sequencing any of it.**

This gate states the problem and compares designs against it. It does **not** solve it in code, and a selected design
direction is **not** a solved problem — it is a reviewable input to a later authorization gate.

---

## 6. Current migration-runner and packaging boundary

**Read-only. No runner or packager file is modified.** Re-read against current source at authoring time; prior-phase
citations confirmed (benign line drift from older gates noted where it occurred).

- **Discovery is a flat scan of one fixed directory.** `MIGRATIONS_DIR = join(__dirname, 'migrations')`
  (`migrate.ts:23`) resolves at runtime to `dist/db/migrations/`. `discoverMigrations()` (`migrate.ts:76-85`) calls
  `readdir(MIGRATIONS_DIR)` (`migrate.ts:77`) — a **non-recursive** `readdir`, **not** a glob — then filters with the
  single predicate `f.endsWith('.sql') && !f.includes('_down')` (`migrate.ts:79`) and sorts by the leading numeric
  prefix `parseInt(a.split('_')[0], 10)` (`migrate.ts:80-84`).
- **Execution is forward-only, per-file transactional, ledger-tracked.** The apply loop (`migrate.ts:199-240`) runs
  each pending file in its own `BEGIN` … `COMMIT` (`migrate.ts:220-226`) with `ROLLBACK` + throw on error
  (`migrate.ts:230-234`); applied files are recorded in the `_migrations` ledger table (`migrate.ts:46-55`); a
  checksum mismatch on an already-applied file only **warns** (`migrate.ts:203-214`); a Postgres advisory lock guards
  concurrent runners (`migrate.ts:153-174`).
- **The runner executes at startup, gated only on a DB pool.** `server.ts` imports `migrate` (`server.ts:72`) and,
  inside the async `ready` IIFE (`server.ts:295`), calls `await migrate(dbPool)` (`server.ts:305`) gated only on
  `if (dbPool)` (`server.ts:303`) — **no** env flag, **no** `aw_*` / spike gate. `dbPool` is non-null only when
  `DATABASE_URL` is configured (`server.ts:175-181`; `config.ts` `databaseUrl`). A failing migration logs
  `migration_error` and re-throws (`server.ts:307-312`), rejecting `ready`. This production runner has **zero**
  coupling to the admission spike.
- **The packager copies `.sql` only, no `aw_*` / experimental / `_down` filter.** `copy-migrations.mjs` scans
  `SRC_DIR = src/db/migrations` (`copy-migrations.mjs:23`), fails closed if the source dir is missing
  (`copy-migrations.mjs:28-34`), filters `e.isFile() && e.name.endsWith('.sql')` (`copy-migrations.mjs:36-40`), fails
  closed if zero `.sql` files are found (`copy-migrations.mjs:42-46`), then copies each into `DEST_DIR = dist/db/migrations`
  (`copy-migrations.mjs:24`, `:50-52`). It copies `_down.sql` files too (the runner ignores them at discovery; the
  packager does not).
- **No isolation exists today.** Neither file has any `aw_*` / experimental allow- or deny-list; the only filters are
  the `.sql` extension (both) and the runner's `_down` substring exclusion (`migrate.ts:79`). The current production
  set in `src/db/migrations/` is `003`–`015` plus `_down` variants; **no** `aw_*` file is present.
- **Two independent pickup points keyed only on extension.** (a) Build-time: any `*.sql` dropped into
  `src/db/migrations/` is copied to `dist/db/migrations/` (`copy-migrations.mjs:23/:39`). (b) Runtime: any `*.sql`
  (not `_down`) in `dist/db/migrations/` is discovered and executed (`migrate.ts:23/:77/:79`). They are linked by the
  copy step but are **independent** surfaces — a file placed directly in `dist/db/migrations/` is also executed even
  without a source counterpart. Both are the surfaces an isolation design must close.

The Phase 47A isolation evidence already pins these predicates: the durable-isolation test mirrors the runner
predicate `.sql && !_down` (`durable-migration-isolation.test.ts:49-54`) and the packager predicate `.sql`
(`durable-migration-isolation.test.ts:56-60`), asserts the literals still exist in the real source
(`durable-migration-isolation.test.ts:84-90`), proves no `aw_*` SQL is in the shared dir
(`durable-migration-isolation.test.ts:92-101`), and proves a `.json` artifact is rejected by both predicates
(`durable-migration-isolation.test.ts:103-133`). Phase 47D changes none of this; it records the boundary a design
must respect.

---

## 7. Current scope-guard boundary

**Read-only. No guard or test is modified, and no guard is weakened.**

- **Which files are scanned.** `SPIKE_FILES` (`scope-guards.test.ts:36`) = every `.ts` found by recursive
  `walkTs(SPIKE_SERVICE_DIR)` over `app/src/services/admission-wedge-spike/` plus `app/src/routes/admission-intake.ts`;
  at least 5 files asserted present (`scope-guards.test.ts:163`).
- **Which tokens are forbidden.** `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`, **19** entries) forbids, in
  executable source (after parser-backed comment stripping, `scope-guards.test.ts:78-118`): `INSERT`, `INSERT INTO`,
  `UPDATE`, `DELETE`, `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `pool.query`, `.query(`, `query(`, `.execute(`,
  `execute(`, the `` sql` `` tagged template, `db.`, `database`, `pg`, `postgres`, `migration`, and `migrate`
  (denylist applied to every spike file at `scope-guards.test.ts:200-228`).
- **Which imports are forbidden.** `scope-guards.test.ts:185-198` rejects a bare `pg` import,
  `/db/(client|pool|migrate|transaction)`, `/db/migrations/`, any `/-store(\.js)?$/` specifier, and `BoundedEstateStore`
  / `bounded-estate-store`; plus no Freeside import (`scope-guards.test.ts:169-175`) and no `@loa/straylight` import
  (`scope-guards.test.ts:177-183`).
- **Syntax-aware, evasion-resistant, binary.** `stripComments()` (`scope-guards.test.ts:78-118`) uses the TypeScript
  parser so a token cannot hide in a string, nested template, or regex char class; a regression suite
  (`scope-guards.test.ts:231-313`) proves both directions. The guard is **binary** — any match fails the test; there
  is **no** per-file opt-out, suppression comment, or allowlist.
- **The Phase 47A refinement evidence is negative.** `durable-scope-guard-refinement.test.ts` provides
  **subset / spot-check refinement evidence for the durable spike surface** — its local list (`:41-58`) is a
  **16-entry** copy and the lock-step assertion only spot-checks high-value tokens against the live guard file
  (`durable-scope-guard-refinement.test.ts:100-107`); `scope-guards.test.ts:122-142` remains the **canonical 19-entry
  denylist**, and Phase 47D does **not** treat the refinement test as a full duplicate of the canonical guard. The
  refinement test proves the guard was **not** weakened by Phase 47A: no opt-out / skip / exempt / `ALLOWED` allowlist
  was added (`durable-scope-guard-refinement.test.ts:100-119`), and the negative tests confirm raw SQL,
  `CREATE/ALTER/DROP TABLE`, `migration`/`migrate`, forbidden imports, and a `-store` sibling all still fail closed
  (`durable-scope-guard-refinement.test.ts:123-192`). The `.json` store passed the **unchanged** blanket guard
  because it needs none of the forbidden tokens.
- **Why this blocks Lane-1 SQL, and what a future path would require.** A Lane-1 `aw_*` SQL store on the current spike
  surface would necessarily emit durable-write / SQL tokens and/or import a DB client / runner / `-store` module —
  each trips the guard. A future SQL path would require a **narrow replacement / allowlist model, not guard deletion**:
  permit only a **specifically-named** dev/operator module and an **isolated** migration mechanism while keeping the
  rest of the surface under the existing blanket denylist; the allowlist must be **path-specific** (one named module),
  **token-specific** (only the precise tokens that module needs), and **paired with negative tests** proving the guard
  still fails closed everywhere else against the same evasion-resistance bar (`scope-guards.test.ts:231-313`).
  **Designing that model is in scope here as a paper direction (§8 D, §18); weakening or editing any guard is
  forbidden.**

---

## 8. Design requirements

Any future isolated `aw_*` SQL path — **if one is ever authorized by a later gate** — must satisfy every requirement
below. None is created, satisfied, or proven here; these are the conditions a candidate design is measured against in
§9–§17 and the bar the §18 preferred direction must meet on paper. They carry forward and refine the 46Y §8 isolation
requirements and the 47C §16 evidence bar.

**A. Normal production runner isolation.**

- Normal `migrate(dbPool)` (`server.ts:303-305`) must **not** discover or execute experimental `aw_*` material —
  proven against the real discovery + execution path (`migrate.ts:76-85`, `:199-240`).
- App startup (`server.ts:295`, `:303-305`) must **not** execute experimental SQL under any environment, config, or
  default; no production fallback.
- Misplaced experimental SQL must **fail closed or remain undiscovered** — never silently adopted.
- A future implementation must **prove** this with tests (negative tests against the actual runner).

**B. Packaging / copy isolation.**

- Normal packaging / copy (`copy-migrations.mjs:36-40`, `:50-52`) must **not** silently include experimental `aw_*`
  SQL in the production bundle.
- Misplaced experimental SQL must **not** become production bundle material.
- A future implementation must **prove** packaging exclusion (negative test against the actual packager predicate,
  `durable-migration-isolation.test.ts:152-162`-style).

**C. Dev/operator explicitness.**

- Experimental SQL, if ever implemented, must require **explicit dev/operator action** — disabled by default, strict
  `=== 'true'` gating (the Phase 46V / 47A posture, `config.ts:455`, `:469-470`, `:480-481`, `:482-483`).
- **No production defaults.** No implicit startup execution; never invoked by the ungated production `migrate(dbPool)`
  call (`server.ts:305`).

**D. Scope-guard preservation.**

- The current DB / SQL / migration / durable-write / production-store guards (`scope-guards.test.ts:122-142`,
  `:185-198`) must **not** be deleted.
- A future allowlist must be **path-specific** (one named module) and **token-specific** (only the precise tokens that
  module needs).
- **Negative tests must prove forbidden adjacent paths still fail closed** against the same evasion-resistance bar
  (`scope-guards.test.ts:231-313`).

**E. Storage semantic boundaries.**

- A future SQL design must **not persist raw candidate payload** — only synthetic, bounded, route-owned records (the
  Phase 33Q / 46V / 47A no-raw-payload invariant).
- Must preserve **tenant / estate / actor isolation** — every row scoped by `(tenant_id, estate_id)` and actor;
  cross-scope reads return empty; cross-scope writes fail closed.
- Must preserve **idempotency / replay / conflict** behavior — identical replay returns the prior outcome and mints
  nothing; same-key / different-content conflicts fail closed.
- Must preserve **supersession / correction** semantics — repoint recall from a superseded assertion to its correction
  while preserving the prior's audit / provenance.
- Must include a **cleanup / tombstone / drop** story for synthetic dev objects (the forward-only runner never
  auto-runs a `_down` file, `migrate.ts:79`).
- Must **not** choose the final schema in Phase 47D; the Phase 46S draft (13 `aw_*` tables across 11 subsections) stays
  draft (`schema_final` false).

**F. Public / private boundary.**

- **No public response expansion.** The runtime `no-leak.ts` `FORBIDDEN_PUBLIC_KEYS` mirrors the route-contract
  validator at **114 = 114** parity (Phases 46O / 46P / 46Q); any change requires a separate no-leak proof.
- **No SQL / path / debug / stack leakage** — a SQL-backed store fault must collapse to the stable public refusal
  (HTTP 400) leaking neither the error text, the SQL, the DB path, nor any id.
- **Public receipt refs remain safe** — opaque, non-leaking references only.
- **Private transition / audit material remains private** — `TransitionReceipt` / `AuditEvent` / consent proof /
  storage internals never serialized onto the wire; persisted + replayed responses deep-walk the 114-key guard
  exactly like a fresh response.

**G. Auth / consent / signer boundary.**

- SQL isolation does **not** solve production **service auth** (the dev/operator `x-admission-service-token` +
  `x-admission-operator-id` allowlist is a dev isolation mechanism, fail-closed when both empty — not production auth).
- Does **not** solve **end-user authorization** (who may admit on whose behalf).
- Does **not** solve **signer / authority** (canonical signer / authority stays Straylight-owned, §20).
- Does **not** solve **consent proof / receipt** (service-token / operator auth is never treated as consent; missing /
  invalid consent fails closed in any future production model). These remain **separately gated**.

**H. Non-production boundary.**

- Phase 47D must **not** move toward production durable storage.
- Any future Lane-1 SQL remains **dev/operator-only** unless separately authorized.
- The **Lane-2 canonical Straylight store** remains **separate and blocked** (each a sibling-repo ADR under Straylight
  teammate review, behind the operative gate #8, §20).

---

## 9. Candidate A — JSON-only continuation

*Maps to Phase 47C §15 pattern P7. Paper-only; not built here.*

- **Sketch.** Introduce **no** `aw_*` SQL at all. Continue using the merged Phase 47A `.json`-snapshot Mode 2 spike for
  dev/operator durability; the SQL frontier is simply never opened.
- **What it protects against.** **Everything Lane-1 SQL would add.** It needs no runner change, no packager change, no
  guard refinement, no migration, and no DB write — it is the lowest-blast-radius posture by definition, already proven
  green (47B). It satisfies §8 A / B / D trivially (nothing to isolate) and §8 C / E / F / G / H by inheriting the 47A
  posture.
- **What it fails to protect against / does not answer.** It **does not answer the SQL frontier** — it sidesteps it
  permanently rather than resolving it. If a future requirement genuinely needs SQL semantics (e.g. relational
  integrity / indexed query the `.json` store cannot provide), JSON-only does not deliver them.
- **Posture in Phase 47D.** **Live, low-risk fallback.** It is the correct answer **if** SQL isolation cannot be made
  safe even on paper. Retained as the standing fallback if the layered direction (§18) is later rejected at the Phase
  47E acceptance gate.

---

## 10. Candidate B — Separate experimental SQL location

*Maps to Phase 47C §15 pattern P1. Paper-only; no directory or file is created here.*

- **Sketch.** Experimental `aw_*` SQL would live **outside** the normal production migrations directory
  (`src/db/migrations/`), in a separate dev-only location. The normal `migrate(dbPool)` scan (`migrate.ts:77`, the
  single `MIGRATIONS_DIR` at `migrate.ts:23`) must never read it, and the normal `copy-migrations.mjs` `SRC_DIR` scan
  (`copy-migrations.mjs:23/:36-40`) must never copy it.
- **What it protects against.** The **migration-adoption** blocker (§6) and the **packaging** blocker (§6): because the
  production runner scans exactly one directory and the packager scans exactly one source directory, material outside
  both is structurally undiscoverable and uncopiable — satisfying §8 A / B by **location**, not by a runner change.
- **What it fails to protect against.** It does **not, by itself**, provide a mechanism to *apply* the experimental
  SQL (it still needs an explicit, isolated runner — Candidate C / D), does not refine the scope guard (§8 D), and does
  not address storage semantics (§8 E). Location isolation alone is necessary but not sufficient.
- **Posture in Phase 47D.** **Enumerated; a necessary layer of the preferred direction (§18 element 1), not a complete
  design.** Creating the directory is forbidden here.

---

## 11. Candidate C — Manifest-gated experimental runner

*Maps to Phase 47C §15 pattern P2. Paper-only; no manifest or runner is created here.*

- **Sketch.** Experimental SQL can run **only if** an explicit manifest names the exact files to apply. The normal
  runner (`migrate.ts`) ignores the manifest and all experimental material entirely; a future dev/operator runner
  would refuse to apply anything not listed in the manifest.
- **What it protects against — the future experimental runner path only.** **Accidental adoption** and **arbitrary
  execution on that future path**: a future dev/operator runner would refuse to apply any experimental file not named
  in the manifest, making its apply-set an explicit allowlist rather than a directory scan. This protection is
  **scoped to that future experimental runner** — the manifest governs nothing else, and on its own it is **not** a
  complete design.
- **What it fails to protect against.** The manifest **does not by itself block the normal `migrate.ts` runner from
  discovering or executing a misplaced `.sql`.** The production runner scans its migration directory
  (`migrate.ts:76-85`) and never consults the manifest, so a stray experimental file that lands in that path would
  still be picked up regardless of whether it is manifested. To protect the **normal runner path**, the manifest
  **must be paired with Candidate B (location isolation) and/or Candidate E (hard-deny)** — neither of which the
  manifest itself supplies. It is also only as safe as its enforcement: it **needs tests proving the manifest cannot
  be bypassed** (e.g. a file present but not manifested is refused; a manifested file outside the isolated location is
  refused), and without those proofs it adds attack surface. It likewise does not by itself prevent the normal
  **packager** from copying a misplaced `.sql` (§8 B still needs Candidate B / E). **Paper-only — Candidate C
  authorizes no implementation.**
- **Posture in Phase 47D.** **Enumerated; a layer of the preferred direction (§18 element 2).** The manifest and its
  bypass-proof tests are future work behind a later authorization gate.

---

## 12. Candidate D — Explicit dev/operator-only runner command

*Maps to Phase 47C §15 pattern P3. Paper-only; no command or runner is created here.*

- **Sketch.** A **separate command** for experimental `aw_*` SQL, **disabled by default**, requiring explicit env /
  category / operator acknowledgement, that **never runs on app startup** and is **never** called by the production
  server startup path (`server.ts:295`, `:303-305`).
- **What it protects against.** **Production execution** and **production fallback**: the experimental apply-path is a
  deliberate operator action, not a startup side effect; it inherits the Phase 46V / 47A disabled-by-default,
  AND-gated, strict-`=== 'true'` posture (§8 C). It directly satisfies §8 A's "app startup must not execute
  experimental SQL" by giving the experimental path its own out-of-band entrypoint.
- **What it fails to protect against.** It does not by itself prevent the **normal** runner from adopting a misplaced
  file (needs Candidate B location isolation and/or Candidate E hard-deny), does not refine the guard (§8 D), and does
  not address packaging (§8 B). A separate runner is also itself new code that must be scope-guard-allowlisted narrowly
  (§7).
- **Posture in Phase 47D.** **Enumerated; a layer of the preferred direction (§18 element 3).** Building the command is
  forbidden here.

---

## 13. Candidate E — Normal-runner and packaging hard-deny

*Maps to Phase 47C §15 pattern P5 (extended to packaging). Paper-only; no runner or packager change is made here.*

- **Sketch.** The normal runner (`migrate.ts`) and packager (`copy-migrations.mjs`) **explicitly refuse** `aw_*` /
  experimental migration paths even if files are misplaced — a naming-convention exclusion (skip `aw_*`) in
  `discoverMigrations()` (`migrate.ts:79`) and a matching exclusion in the packager filter
  (`copy-migrations.mjs:39`), paired with the dev-only opt-in runner (Candidate C / D).
- **What it protects against.** **Defense-in-depth** for §8 A / B: even a misplaced `aw_*.sql` in `src/db/migrations/`
  or `dist/db/migrations/` would be refused by the production runner and excluded by the packager — closing both
  independent pickup points (§6) at the source.
- **What it fails to protect against.** **Risk: touching the normal runner / packager increases blast radius.** Any
  change to `migrate.ts` / `copy-migrations.mjs` is a **production-runner change** with its own security review (47C
  Option D — REJECTED for *now*). A regression in the exclusion predicate could mis-skip a real production migration.
  Hard-deny is therefore valuable as **belt-and-suspenders** but must be weighed against the cost of modifying the
  production path, and any such change is explicitly **not authorized** here.
- **Posture in Phase 47D.** **Enumerated; the *defense-in-depth* layer of the preferred direction (§18 element 4)** —
  selected on paper as a hardening complement, **not** as a license to modify the runner now. The runner / packager
  change stays blocked (§24).

---

## 14. Candidate F — Test-only harness schema

*Maps to Phase 47C §15 pattern P6 (Class T). Paper-only; no harness schema is created here.*

- **Sketch.** SQL shape can be explored **only** in tests / a harness, **never at runtime** — Class T in the 46Y P / E
  / T / C model (`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md` §7): schema created only by a
  test harness, never placed in the production discovery path, never production migration material.
- **What it protects against.** It lets the `aw_*` SQL **semantics** (relational shape, constraints, idempotency keys,
  supersession links) be proven without ever touching the runtime runner, packager, or production DB — satisfying §8 A
  / B / C / H by construction (test-only schema never enters any production surface).
- **What it fails to protect against / does not answer.** It **does not prove a runtime dev/operator storage path** —
  a harness schema demonstrates semantics, not the isolated *runtime* apply mechanism the dev/operator durable store
  would need. It is a semantics-proof tool, not a storage delivery design.
- **Posture in Phase 47D.** **Enumerated; an optional *semantics-proof* sub-element** that could precede or accompany
  the layered direction (§18) without authorizing runtime SQL. Not selected as the primary direction (it answers a
  different question than runtime isolation).

---

## 15. Candidate G — Isolated dev/operator DB namespace/schema

*Extends Phase 47C §15 (a namespace variant of P1 / P4). Paper-only; no namespace or object is created here.*

- **Sketch.** Experimental `aw_*` objects live under an **isolated namespace / schema** (e.g. a dedicated Postgres
  schema) and are **dropped / tombstoned / cleaned** on teardown — keeping experimental objects out of the default
  namespace the production app reads.
- **What it protects against.** **Namespace collision** and **cleanup**: experimental objects are addressable
  separately and removable wholesale (a drop-schema cleanup story, complementing §8 E's tombstone / drop requirement).
- **What it fails to protect against.** It **still requires** runner isolation (Candidate C / D), packaging isolation
  (Candidate B / E), and a scope-guard allowlist (§8 D) — a namespace alone does not stop the production runner from
  *creating* objects in it if a migration is adopted. It is **not production** and grants no production durable
  storage. Namespace isolation is a storage-layout refinement, not a substitute for the runner / packaging / guard
  layers.
- **Posture in Phase 47D.** **Enumerated; an optional storage-layout refinement** that the §18 preferred direction may
  adopt for cleanup ergonomics, layered on top of (not instead of) the runner / packaging / guard isolation.

---

## 16. Candidate H — Defer Lane-1 SQL

*Maps to Phase 47C §15 pattern P8. Paper-only.*

- **Sketch.** Keep Lane-1 `aw_*` SQL **blocked** and return to the storage / auth / consent / signer / receipt
  decomposition — conclude that SQL adds too much scope relative to the open auth / consent / signer / receipt
  questions, and that those should be strengthened first (or that no safe SQL path is worth the production-runner risk
  at all).
- **What it protects against.** **The safest posture if SQL adds too much scope** — it opens no new production surface
  and keeps the §8 G auth / consent / signer questions as the priority frontier. A valid **terminal** outcome (close
  the SQL frontier indefinitely) as well as a valid **sequencing** outcome (defer until auth / consent mature).
- **What it fails to protect against / does not answer.** It **does not progress SQL isolation** — the frontier stays
  open and unanswered. If SQL is genuinely needed later, deferring only postpones the same design question.
- **Posture in Phase 47D.** **Enumerated; the conservative alternative to the preferred direction.** Adopted *in part*
  as the standing posture (Lane-1 SQL stays blocked, §24) but **not** selected as the forward design lane — selecting a
  *paper* design direction (§18) is cheaper than deferring and loses no ground, because the direction authorizes
  nothing and the JSON-only fallback (Candidate A) remains live.

---

## 17. Comparative assessment

The candidates are not mutually exclusive; several are **layers** rather than competitors. Assessed against the §8
requirements (paper-only; no scoring authorizes anything):

| Candidate | §8 A runner | §8 B packaging | §8 C dev-only | §8 D guard | §8 E storage | Role |
|-----------|-------------|----------------|---------------|-----------|--------------|------|
| **A — JSON-only (P7)** | n/a (no SQL) | n/a (no SQL) | inherited 47A | unchanged | `.json` only | **Fallback** — answers nothing about SQL |
| **B — Separate location (P1)** | by location | by location | — | — | — | **Layer 1** of preferred direction |
| **C — Manifest runner (P2)** | by allowlist | — | partial | — | — | **Layer 2** of preferred direction |
| **D — Dev-only command (P3)** | by entrypoint | — | **yes** | — | — | **Layer 3** of preferred direction |
| **E — Hard-deny (P5)** | defense-in-depth | defense-in-depth | — | — | — | **Layer 4** (belt-and-suspenders; runner change risk) |
| **F — Test harness (P6 / Class T)** | n/a (test-only) | n/a | n/a | — | semantics-proof | **Optional** semantics sub-element |
| **G — Namespace/schema** | — | — | — | — | cleanup aid | **Optional** storage-layout refinement |
| **H — Defer (P8)** | blocks all | blocks all | blocks all | blocks all | blocks all | **Conservative alternative** / standing posture |

**Key observations.**

- **No single candidate satisfies all of §8.** B closes location, C closes the apply-allowlist, D closes the
  entrypoint, E adds defense-in-depth, and a narrow scope-guard allowlist (§7, §8 D) closes the guard surface. The
  isolation problem (§5) is inherently **layered**, so a single-mechanism design is insufficient.
- **The runner-touching layer (E) is the highest-risk and the most optional.** B + C + D achieve isolation **without**
  modifying the production runner; E only adds defense-in-depth at the cost of a production-runner change (47C Option
  D, REJECTED for now). A safe design can stand on B + C + D + a guard allowlist, treating E as a hardening option to
  be weighed at the authorization gate.
- **F and G answer adjacent questions** (semantics-proof and storage-layout / cleanup), not the core runtime-isolation
  question; they are optional sub-elements, not the spine of a design.
- **A and H are the two safe non-SQL outcomes** — A keeps the proven `.json` mechanism, H keeps SQL blocked. Either is
  the correct answer if the layered direction cannot be made safe even on paper at the Phase 47E acceptance gate.

---

## 18. Preferred design direction

**Selected on paper, for a later authorization gate only.** Phase 47D selects a **layered isolation design direction**
as the preferred candidate — **not** an authorization to implement it. It combines:

1. **A separate experimental SQL location outside normal production migration discovery** (Candidate B / P1) — `aw_*`
   experimental SQL would live outside `src/db/migrations/`, so the production `discoverMigrations()` scan
   (`migrate.ts:23/:77`) and the `copy-migrations.mjs` `SRC_DIR` scan (`copy-migrations.mjs:23`) never see it.
2. **A manifest-gated experimental runner** (Candidate C / P2) — experimental SQL applies only via an explicit
   manifest; the production runner never consults it; tests must prove the manifest cannot be bypassed.
3. **An explicit dev/operator-only runner command** (Candidate D / P3) — disabled by default, strict `=== 'true'`,
   explicit operator acknowledgement, **never** on app startup, **never** called by `server.ts:303-305`.
4. **Normal-runner hard-deny / packaging hard-deny as defense-in-depth** (Candidate E / P5) — a paper hardening layer
   that would refuse / exclude `aw_*` even if misplaced; **explicitly weighed against the production-runner-change risk
   and not authorized here** (it stays blocked, §24, pending the authorization gate's own security review).
5. **A narrow scope-guard replacement / allowlist for the later isolated path only** (§7, §8 D; 47C §10) —
   path-specific (one named module), token-specific (only the precise tokens that module needs), with the rest of the
   spike surface kept under the existing blanket denylist.
6. **Negative tests proving the normal runner, packaging, route startup, and adjacent paths remain blocked** — modeled
   on the existing Phase 47A isolation evidence (`durable-migration-isolation.test.ts`,
   `durable-scope-guard-refinement.test.ts`) and the evasion-resistance bar (`scope-guards.test.ts:231-313`).

Candidate F (test-only harness schema) and Candidate G (isolated namespace / schema) are retained as **optional
sub-elements** (semantics-proof and cleanup-layout respectively), adopted only if a later gate finds them useful.

**This direction is selected as paper input only.** It is **not** implemented in Phase 47D, and **a later
implementation would still require a separate authorization gate** (Phase 47E and then a separate implementation
lane). The selection authorizes **no** SQL, **no** migration, **no** runner / packager change, **no** DB write, and
**no** guard edit. It does **not** assert that `aw_*` SQL is safe; it asserts only that, *if* Lane-1 SQL is ever
pursued, **this layered shape is the preferred starting point for the authorization review** — and that the JSON-only
fallback (Candidate A) and the defer outcome (Candidate H) remain valid alternatives the Phase 47E gate may select
instead.

---

## 19. Evidence still missing

The preferred direction (§18) is a **paper shape**, not a demonstrated design. Before any authorization, **all** of the
following must be proven and separately accepted — carried forward and refined from 47C §16 (items 1–4 of which have
**no repo realization** today):

1. **A working location-isolation demonstration** — an experimental location the production `discoverMigrations()`
   scan (`migrate.ts:76-85`) and `copy-migrations.mjs` `SRC_DIR` scan (`copy-migrations.mjs:23/:36-40`) provably never
   read or copy, demonstrated against the real runner and packager including the build-copy step.
2. **A manifest mechanism with bypass-proof tests** — proof a non-manifested file is refused, a manifested file
   outside the isolated location is refused, and the production runner never consults the manifest.
3. **A dev/operator-only runner entrypoint** — proof it is disabled by default, never invoked by `server.ts:303-305`,
   and engages only on explicit operator acknowledgement with no production fallback.
4. **A narrow replacement / allowlist scope-guard model** (§7, §8 D) — proof it permits only one named module while the
   blanket denylist (`scope-guards.test.ts:122-142`, `:185-198`) still fails closed everywhere else against the same
   evasion-resistance bar (`scope-guards.test.ts:231-313`).
5. **A storage-semantics proof** — tenant / estate / actor isolation, idempotent replay / conflict fail-closed,
   supersession / correction, no raw payload, and a cleanup / tombstone / drop story (the forward-only runner never
   auto-runs a `_down` file, `migrate.ts:79`); the final schema stays the Phase 46S draft (un-frozen).
6. **A no-leak proof over persisted / replayed surfaces** — the 114-key guard (§8 F) holds exactly for a SQL-backed
   store's persisted and replayed responses, and faults collapse to the stable public refusal with no SQL / path /
   stack / id leakage.
7. **A partial-migration / partial-write fail-closed story** — no half-applied `aw_*` migration or partial write ever
   leaves a partially-admitted, recallable synthetic assertion (the runner's per-file `BEGIN`/`COMMIT`/`ROLLBACK`,
   `migrate.ts:220-240`, covers one file; the multi-statement / multi-migration recovery story is undesigned).
8. **A Codex audit before implementation** — mirroring the Phase 46V / 47A Codex patch-and-re-audit discipline.

**Evidence that exists today.** The migration-runner / packager / scope-guard behavior is read and confirmed (§6, §7);
the Phase 47A `.json` isolation tests already pin the runner / packager predicates and prove a `.json` artifact is
rejected (§6); the 46S draft schema enumerates the persistence dimensions (§8 E); the 46Y four-class model and
refined-guard observation exist on paper. **Evidence that is still missing.** Items 1–4 above have **no** repo
realization — there is no experimental location, no manifest, no dev-only runner, and no refined / replacement guard in
the repo; no Lane-1 SQL isolation has been demonstrated against the real runner; and the item-7 partial-migration /
rollback fail-closed story for SQL is undesigned. **Until every item is proven and separately accepted, Lane-1 `aw_*`
SQL stays blocked.**

---

## 20. Future implementation-authorization requirements

A later gate (Phase 47E, then a separate implementation lane) — **not** Phase 47D — would have to discharge **all** of
the following before any bounded `aw_*` SQL implementation spike could even be authorized:

- **All §19 evidence items proven and separately accepted**, with the §8 requirements (A–H) each satisfied on the real
  surfaces.
- **A hard, file:line-grounded authorization checklist** (mirroring the Phase 46Z structure: migration-isolation /
  scope-guard / gate-conjunction / storage-behaviour / no-leak sections), against which a future implementation PR is
  audited — every item ACCEPT, any REJECT blocks the spike and Lane-1 SQL stays blocked.
- **A separate, bounded, disabled-by-default, dev/operator-only, non-production implementation spike PR**, never the
  same PR as the authorization gate, mode-contingent and acceptance-gated (the Phase 46U → 46V / 46Z → 47A precedent).
- **A file-scope envelope** naming exactly which files a future implementation PR may touch (the isolated location, the
  dev-only runner module, the narrow guard allowlist) versus which stay forbidden **regardless** (production runner /
  packager unless its own security review authorizes the hard-deny layer; `no-leak.ts`; the route contract).
- **No discharge of the operative Straylight-side ADR-022E gate #8** — a Dixie gate cannot discharge it (§24); the
  canonical `StorageAdapter` interface and `Assertion` / `TransitionReceipt` / `AuditEvent` shapes stay Straylight-owned
  (cross-repo). **Candidate D / ADR-022E boundary preserved**: Phase 46N's gate #8 clearing remains a bounded Dixie
  documentation / architecture / handoff prerequisite only; the operative Straylight-side discharge remains held.

Phase 47D records these as **requirements on a future gate**, not commitments to a mechanism and not an authorization.
**The selected design direction (§18) is explicitly not implementation-ready without these.**

---

## 21. Options considered

Each option is enumerated and evaluated, not implemented.

### Option A — Select the layered isolation design direction and proceed to a later implementation-authorization checklist gate. **SELECTED.**

- **Would authorize.** Nothing implementable. It selects the §18 layered direction (separate location + manifest runner
  + dev-only command + hard-deny defense-in-depth + narrow guard allowlist + negative tests) as **paper input** to a
  later Phase 47E acceptance / authorization-checklist gate (§23). Authorizes **no** implementation, SQL, migration,
  runner change, DB write, migration execution, or guard edit.
- **Still blocks.** All of Lane-1 SQL; the migration runner / packager stay untouched; the guards stay intact;
  production / Lane-2 / freeze / gate-#8 work stays blocked (§24).
- **Risks.** Low — paper only. It converts the open frontier into a concrete, reviewable design direction without
  authorizing anything; the JSON-only fallback (Candidate A) and the defer outcome (Candidate H) remain live if Phase
  47E rejects the direction.
- **Verdict.** **SELECTED (§22 / §23).** It is the smallest safe step that turns the decomposed frontier into a
  concrete preferred design for later authorization review.

### Option B — Select JSON-only continuation and keep Lane-1 SQL blocked. **Partially adopted as standing posture; not selected as the forward lane.**

- **Would authorize.** Nothing new; the accepted `.json` Mode 2 spike (47B) remains the only durable route-storage
  mechanism (Candidate A / P7).
- **Still blocks.** All of Lane-1 SQL.
- **Risks.** Low. It does not advance the SQL design question, but loses no ground.
- **Verdict.** **Partially adopted** (Lane-1 SQL stays blocked, the `.json` mechanism stays the durable path) but **not
  selected** as the forward lane — selecting a paper design direction (Option A) is the cheaper way to *decide* between
  JSON-only, the layered SQL path, and defer, on paper, at the Phase 47E gate.

### Option C — Select test-only harness schema design first. **Not selected (folded as an optional sub-element).**

- **Would authorize.** Nothing runtime; a Class-T harness explores SQL semantics in tests only (Candidate F / P6).
- **Still blocks.** All runtime SQL.
- **Risks.** Low, but it answers a different question (semantics, not runtime isolation).
- **Verdict.** **Not selected as primary**; retained as an **optional sub-element** of the §18 direction (§14, §18).

### Option D — Authorize immediate `aw_*` SQL implementation. **REJECTED.**

- **Risks.** Disqualifying. The §5–§7 blockers are unresolved; implementing today would require adopting a migration
  into the production set (§6) and/or weakening a security guard (§7). Forbidden by this gate's scope and by 46X / 46Y /
  46Z / 47B / 47C.

### Option E — Modify the production migration runner now. **REJECTED.**

- **Risks.** Disqualifying. Changing `migrate.ts` / `copy-migrations.mjs` is a production-runner change with its own
  security review; the hard-deny layer (Candidate E, §13) is selected on paper as defense-in-depth **only** and is
  **not** authorized for implementation here.

### Option F — Jump to production durable storage. **REJECTED.**

- **Risks.** Disqualifying. Production durable storage, DB writes, and migration execution are blocked (§24) and behind
  the operative Straylight-side gate #8 (§20).

### Option G — Hand off to Freeside runtime / client integration. **REJECTED (now).**

- **Risks.** Premature. The route contract is draft / non-final (`route_contract_final` false), so a handoff would
  communicate a moving target; Freeside runtime / client integration is blocked (§24).

### Option H — Route-contract freeze / final schema freeze. **REJECTED.**

- **Risks.** Disqualifying. Both freezes are blocked (§24); `schema_final` / `route_contract_final` stay false; the 46S
  schema is a draft (§8 E).

---

## 22. Decision

> **Verdict A — Phase 47D selects a layered Lane-1 `aw_*` SQL isolation design direction on paper for a later
> authorization gate, and keeps all implementation BLOCKED.**

This means:

- **no `aw_*` SQL authorized;**
- **no migration runner changes authorized** (the hard-deny defense-in-depth layer is paper-only);
- **no packaging / copy-runner changes authorized;**
- **no DB writes authorized;**
- **no migration execution authorized;**
- **no production storage authorized;**
- **no scope-guard weakening authorized** (the narrow allowlist is paper-only and future-gated);
- **no route-contract freeze; no final schema freeze;**
- **no ADR-022E gate #8 discharge;**
- **no Freeside runtime / client integration;**
- **no Lane-2 canonical Straylight-store migration;**
- **no production readiness;**
- **proceed to a later docs/decision-only design *acceptance / implementation-authorization checklist* gate (Phase
  47E, §23).**

Phase 47D compares the §9–§16 candidate isolation designs against the §8 requirements, selects the §18 layered design
**direction** as paper input, records the evidence still missing (§19) and the future authorization requirements
(§20), and selects a docs-only Phase 47E gate next. It is explicitly **future-only**: the §18 layers, the §19 evidence
items 1–4, the isolated location, the manifest, the dev-only runner, the refined guard, and the SQL substrate are
**not present in the repo** at authoring time and are **not authorized** by this gate. It does **not** say Lane-1 SQL
is implementation-ready, does **not** say any `aw_*` migration is safe, does **not** imply any change was made to the
migration runner or packager, and the selected design direction is **not** implementation-ready without the Phase 47E
authorization gate. The alternatives were considered and rejected (§21): immediate implementation (D), a runner change
now (E), production storage (F), a Freeside handoff (G), and either freeze (H) are all forbidden; JSON-only (B) is
partially adopted as the standing posture and test-only harness (C) is folded as an optional sub-element, but the
layered design gate (A) is the safer forward step.

---

## 23. Next lane

> **Selected next lane: Phase 47E — Lane-1 `aw_*` SQL isolation design acceptance / implementation-authorization
> checklist gate (docs / decision-only).**

- **What it is.** A **docs / decision-only** gate that **accepts or patches** the Phase 47D §18 preferred design
  direction and decides whether a later **bounded** implementation spike can be authorized — converting the §18 / §19 /
  §20 material into a hard, file:line-grounded checklist (mirroring the Phase 46Z structure). It would either accept
  the layered direction (and define the file-scope envelope and acceptance bar for a separate future implementation
  PR), patch it, or select the JSON-only (Candidate A) / defer (Candidate H) alternative instead.
- **What it must remain.** Docs / decision-only: it implements no store, writes no DB, adds no migration, creates no
  SQL or executable schema, changes no migration runner or packaging / copy runner, weakens or edits no scope guard,
  changes no route / API behavior, freezes nothing, and discharges no Straylight-side gate. It preserves every §24
  block. **Phase 47E itself implements no SQL, migrations, runner changes, packaging / copy changes, DB writes, or
  production behavior.**
- **Why a design-acceptance / authorization-checklist gate, not implementation.** Selecting a design direction (§18) is
  paper input; before any code, that direction must be **accepted or patched** and turned into a hard checklist against
  which a future implementation PR is audited — exactly the Phase 46Y → 46Z precedent (design → checklist) one frontier
  below. **Implementation is not selected as the next lane**, and even Phase 47E would authorize an implementation only
  on a hard, separately-accepted checklist, in a separate PR.
- **Why not the alternatives.** Direct `aw_*` SQL implementation, migration-runner changes, packaging changes, DB
  writes, migration execution, production durable storage, a Freeside handoff, and any freeze are **explicitly NOT
  selected** (forbidden; §21, §24).

---

## 24. Preserved blocked lanes

Regardless of verdict, the following remain **blocked** after Phase 47D — **none** is unblocked by this design gate:

- **Lane-1 `aw_*` SQL implementation** — blocked; only a docs-only design-acceptance / authorization-checklist lane
  (Phase 47E) is selected (§23);
- **migration runner changes** (`migrate.ts`) — blocked; the Candidate E hard-deny layer is paper-only defense-in-depth,
  not authorized;
- **packaging / copy-runner changes** (`copy-migrations.mjs`) — blocked;
- **scope-guard weakening / editing** (`scope-guards.test.ts`) — blocked; the narrow replacement / allowlist model is
  paper-only and future-gated;
- **`aw_*` SQL files / executable schema** — blocked; none exists and none is authorized;
- **migration execution** — blocked;
- **production DB writes** — blocked;
- **production durable-store implementation** — blocked;
- **Lane-2 canonical Straylight-store migrations** — blocked (each a separate sibling-repo ADR under Straylight
  teammate review, behind the operative gate #8);
- **production admission** — blocked;
- **public `remember-this`** — blocked;
- **Discord / freeform ingestion** — blocked;
- **user chat becoming memory merely because it was said** — blocked; consent never inferred from chat;
- **Freeside runtime / client integration** — blocked (Freeside stays a consumer / handoff surface; gate #11 held);
- **package exports** — blocked unless separately justified and audited;
- **LLM / voice / Finn runtime wiring** — blocked;
- **MVP 3 forget / revoke / correction UI** — blocked;
- **route-contract freeze** — blocked; `route_contract_final` stays false;
- **final schema freeze** — blocked; `schema_final` stays false; no `aw_*` migration is claimed safe;
- **production readiness of any kind** — not claimed;
- **operative Straylight-side ADR-022E gate #8 discharge** — not claimed (no repo evidence); sibling gates #9 / #10 /
  #11 / #12 / #15 / #20 remain held. **This remains the dominant cross-repo blocker** for production admission and any
  Lane-2 canonical-store migration.

**Invariants preserved (unchanged).** A pending candidate is not recallable; a rejected candidate creates no admitted
assertion; an accepted candidate creates / references an admitted assertion; a superseded assertion is excluded from
ordinary recall unless explicitly requested / marked; a malformed / unsafe payload fails closed; missing / unauthorized
auth fails closed; missing / invalid consent fails closed in any future production admission model; public responses
leak no raw / private / audit / debug / source / auth / signer / consent / storage material; private `TransitionReceipt`
/ `AuditEvent` / consent proof / storage material remains private; user chat does not become memory merely because it
was said; `active` remains the canonical assertion status, not a public `outcome_class`; `recall_eligible` remains
derived / projection-only.

> Selecting a design direction unblocks **no** production / public / canonical-store / Freeside / LLM / package /
> freeze / SQL / migration work. Every lane above remains its own separately-authorized future gate, and the selected
> design direction is **not** implementation-ready without the Phase 47E authorization gate.

---

## 25. Codex audit checklist

This section is the checklist for a Codex audit of **this docs/decision-only Phase 47D gate**. Every item must be
ACCEPT.

```text
PHASE 47D — LANE-1 aw_* SQL ISOLATION DESIGN GATE — CODEX AUDIT CHECKLIST
(docs/decision-only; every item must be ACCEPT)

[ ] 1.  Docs-only scope: this gate adds ONLY docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md
        (plus at most two minimal forward-traceability status notes in the Phase 47C decomposition gate and
        the Phase 47B acceptance gate).
[ ] 2.  No SQL / migration files: no .sql file, no aw_* migration material, no executable schema is added.
[ ] 3.  No runtime / test / config / package / CI changes: no change to migrate.ts, copy-migrations.mjs,
        any *.sql, route-storage-durable-spike.ts, route-storage-spike.ts, index.ts, no-leak.ts, config.ts,
        admission-intake.ts, server.ts, scope-guards.test.ts, any test, validator, vector, fixture, package /
        lockfile, env, CI, generated file, or binary; no adjacent repo touched.
[ ] 4.  No migration runner changes: migrate.ts discovery/execution semantics are described read-only, not
        modified.
[ ] 5.  No packaging / copy changes: copy-migrations.mjs .sql-only copy filter is described read-only, not
        modified.
[ ] 6.  No DB writes: no DB connection is opened and no write is performed by this gate.
[ ] 7.  No implementation authorization: this gate authorizes no aw_* SQL, migration, runner / packager
        change, DB write, migration execution, or guard edit; it selects a PAPER design direction only.
[ ] 8.  Candidate designs are paper-only: candidates A-H (and the §18 layered direction) are compared and
        selected on paper; none is built, sequenced for build, or authorized.
[ ] 9.  Preferred design direction does NOT imply implementation readiness: §18 explicitly states a later
        implementation would require a separate authorization gate (Phase 47E), and the direction is not
        implementation-ready without it.
[ ] 10. Next lane is docs/decision-only authorization-checklist (Phase 47E — design acceptance /
        implementation-authorization checklist gate), NOT an implementation lane.
[ ] 11. No production overclaim: no positive production-readiness / route-contract-freeze / final-schema-freeze /
        ADR-022E-gate-#8-discharge / production-DB-write / production-migration-execution / durable-production-
        storage / Freeside-runtime / Lane-2-canonical / "aw_* SQL is safe or authorized" / "migration runner
        changes authorized" / "implementation-ready" claim; every such phrase appears only negated / blocked.
[ ] 12. Preserved blocked lanes explicit (§24) and the invariants intact.
[ ] 13. File:line citations match the real source (migrate.ts:23/:76-85/:79/:199-240/:46-55;
        server.ts:72/:295/:303-305; copy-migrations.mjs:23/:24/:36-40/:39/:50-52;
        scope-guards.test.ts:36/:122-142/:185-198/:231-313; config.ts:455/:469-470/:480-483).
[ ] 14. Validators run and recorded green (§26); corruption / duplicate guard holds.
```

---

## 26. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`) unless noted. Phase 47D
is docs/decision-only — it adds only this document (plus the two minimal forward-traceability status notes, §23) and
mutates no runtime source, test, validator, vector, fixture, migration, or SQL file — so the validators are run only
to confirm the unchanged artifacts remain green.

```text
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
git status --short --untracked-files=all | grep -iE 'MEMORY|memory|grimoire|__pycache__|\.pyc|generated|tmp|temp|\.claude'
# Overclaim scan (interpret: negated blocked-lane references are fine; positive claims are not):
grep -RInE 'production ready|production readiness|route-contract freeze|final schema freeze|ADR-022E.*discharged|production migration execution authorized|production DB writes authorized|durable production storage authorized|Freeside runtime|Lane-2 canonical|current aw_\* migrations are safe|aw_\* SQL.*authorized|SQL durable-store.*authorized|migration runner changes authorized|implementation authorized|ready to implement|implementation-ready' docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md docs/ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md
```

**Recorded results for this lane** (run during authoring; full output accompanies the operator run report):

- **docs-only scope** — only the new file `docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md` is added, plus
  the two minimal forward-traceability status notes (§23); no runtime source (and specifically not `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql`, `route-storage-durable-spike.ts`, `route-storage-spike.ts`, `no-leak.ts`,
  `config.ts`, `admission-intake.ts`, `server.ts`, or `scope-guards.test.ts`), no runtime test, no route-vector JSON,
  validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI,
  migration, SQL, executable schema, or generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**; the
  `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail closed; 2 exact-key
  non-over-match guards stay clean);
- **docs-only static scans** — the `app src package.json … *.sql dist build` diff is empty; the
  `.sql$|migration|aw_` scan matches only this document's prose (no new SQL / migration file); the
  memory/generated/temp scan matches nothing under the working tree from this phase;
- **overclaim scan** — every match is a **negated / blocked** reference (e.g. "route-contract freeze — blocked",
  "final schema freeze — blocked", "Lane-2 canonical … remain blocked", "Freeside runtime / client integration —
  blocked", "production readiness … not claimed", "the selected design direction is **not** implementation-ready");
  there is **no** positive authorization or safety claim;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–26 exactly once each.

**Corruption / duplicate guard** (carried from the 46I–47C precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 26.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §25 Codex checklist
  (a `text` block) and the §26 validation command list (a `text` block). **No fenced block is an executable migration
  or runnable schema.**

---
