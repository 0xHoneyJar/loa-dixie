# Phase 46Y — Admission Wedge Mode 2 migration-isolation / scope-guard boundary design gate

> **Phase**: 46Y
> **Branch context**: `phase-46y-admission-mode2-migration-guard-design`
> **Related**: Phase 46X (PR #169,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the Mode 2 enablement blocker (Verdict A — Mode 2 remains BLOCKED) and **selected this Phase
> 46Y migration-isolation / scope-guard boundary *design* lane** (§8 / §16); Phase 46W (PR #168,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md))
> **accepted** the merged Phase 46V Mode 1 route-storage spike as a bounded, disabled-by-default,
> dev/operator-only, **non-production** proof; Phase 46V (PR #167,
> [`admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md))
> **implemented** Storage Mode 1 (no-migration, bounded-synthetic, in-process, route-owned) and **declined**
> Mode 2 for the architectural reason decomposed in 46X; Phase 46U (PR #166,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md))
> §6 / §7 **preferred Mode 1** and **conditionally** authorized Mode 2 (dev-only durable + Lane-1 `aw_*`
> migrations) "subject to a separate Codex audit"; Phases 46T / 46S (PR #165 / #164) **accepted** and
> **drafted** the durable-store schema / migration design (13 `aw_*` tables across 11 subsections;
> `schema_final` / `route_contract_final` false); Phase 46N **cleared** ADR-022E gate #8 as a **Dixie
> documentation / architecture / handoff prerequisite only** while the operative Straylight-side discharge
> **remains held**; Straylight (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); ADR-022E
> durable-store gate #8 (+ sibling gates **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only boundary-design gate.** This gate adds **only this document** (plus a
> minimal cross-reference status note in the immediate predecessor Phase 46X decomposition gate and the Phase
> 46V runbook, §17). It modifies **no** runtime source — and specifically does **not** modify
> `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`,
> `app/src/services/admission-wedge-spike/route-storage-spike.ts`, `index.ts`, `no-leak.ts`,
> `app/src/config.ts`, `app/src/routes/admission-intake.ts`, `app/src/server.ts`, or
> `app/tests/unit/admission-wedge-spike/scope-guards.test.ts` — and changes **no** route handler, storage /
> store code, DB write, migration, SQL file, executable schema, auth, consent, route-vector JSON, route-vector
> validator, route-vector README, Phase 33E fixture, fixture validator, other test, package export, config,
> env, package, lockfile, CI, generated file, or binary. No adjacent repository (`loa-straylight`,
> `freeside-characters`) is touched.
> **This is the Mode 2 boundary *design* gate** — the docs-only rung 46X §8 / §16 named, downstream of the
> 46X blocker-**decomposition**. It **designs on paper** (a) a **migration classification / isolation model**
> that would keep a future dev/operator-only `aw_*` migration out of the **production** migration set, and (b)
> a **replacement / refined scope-guard model** that would permit only a narrow, route-owned, dev-only durable
> surface while continuing to block raw SQL, production storage, and unsafe imports everywhere else. **It is
> not the spike, it authorizes no durable mode, it builds nothing, and it implements nothing.** It **builds no
> store, writes no DB, adds no migration, creates no SQL or executable schema, executes no migration,
> implements no auth or consent, changes no route / API behavior, weakens or edits no scope guard, freezes
> neither the route contract nor the final schema, discharges no operative Straylight-side gate, and claims no
> production readiness.** Mode 2 implementation **remains blocked pending a later authorization gate**.

Every design statement below is grounded **read-only** against the actual Dixie repo at authoring time: the
migration runner `app/src/db/migrate.ts`, the build-asset packager `app/scripts/copy-migrations.mjs`, the
shared migration directory `app/src/db/migrations/`, the Phase 33N static scope guards
`app/tests/unit/admission-wedge-spike/scope-guards.test.ts`, the merged Phase 46V route-storage spike
`app/src/services/admission-wedge-spike/route-storage-spike.ts`, the runtime no-leak guard `no-leak.ts`, the
env parsing in `app/src/config.ts`, the conditional mount + migrate call in `app/src/server.ts`, the Phase 46V
runbook, and the predecessor decision gates (46X / 46W / 46V / 46U / 46T / 46S / 46N). Where a claim could not
be grounded inside the read material, it is marked as such. **The canonical Straylight `StorageAdapter`
interface and the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes live in the adjacent
`loa-straylight` repository (cross-repo references, not Dixie file:line) and remain Straylight-owned (§13).**

---

## 1. Status

Phase 46Y is the bounded, docs/decision-only **Mode 2 migration-isolation / scope-guard boundary design gate**
named by Phase 46X §8 / §16. Its purpose is to take the **decomposed** Mode 2 blocker that Phase 46X mapped —
(i) the global migration runner adopting **any** new `.sql` into the **production** migration set, and (ii) the
Phase 33N scope guards forbidding **any** durable-write / SQL / migration token and **any** production-store
import on the spike surface — and **design, on paper**, the two models the 46X §9 evidence set requires before
any future durable Mode 2 lane could be authorized: a **migration classification / isolation model** and a
**refined / replacement scope-guard model**. It then accepts that boundary design as a docs-only precondition
and selects the next docs-only lane.

**What this phase is, stated narrowly and exactly.** Phase 46Y:

- is **docs / decision-only** — it designs the migration-isolation and scope-guard-boundary models on paper and
  records what a later authorization gate must prove;
- is a **boundary-design gate**, *not* an implementation, *not* the blocker-**decomposition** gate (46X), *not*
  the spike *authorization* gate (46U), *not* the spike *acceptance* gate (46W), *not* the schema / migration
  **design** gate (46S), and *not* the schema / migration **design acceptance** gate (46T);
- does **not** modify runtime source or tests — and specifically does not touch `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql` migration, `route-storage-spike.ts`, `no-leak.ts`, `config.ts`,
  `admission-intake.ts`, `server.ts`, or `scope-guards.test.ts`;
- does **not** implement Mode 2, route storage, or durable storage;
- does **not** create migrations and does **not** execute any migration;
- does **not** create SQL files or executable schema;
- does **not** write DB code or perform any DB write;
- does **not** weaken, relax, edit, add, or remove any scope guard (the refined-guard model is **paper design
  only** — no guard file changes here);
- does **not** change route / API behavior;
- does **not** implement or unblock auth or consent;
- does **not** authorize production admission;
- does **not** freeze the route contract;
- does **not** freeze the final schema;
- does **not** claim production readiness;
- does **not** claim or discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §13);
- does **not** authorize a future Mode 2 *implementation* lane; it selects only a further **docs/decision-only**
  Phase 46Z implementation-authorization **checklist** gate (§16), which itself authorizes no implementation.

> **Verdict: A — the migration-isolation / scope-guard boundary design is accepted as a docs-only
> precondition, and Mode 2 implementation remains BLOCKED pending a later authorization gate.** Phase 46Y
> produces, on paper, the two models the 46X §9 evidence set requires — a migration classification / isolation
> model (§7 / §8) and a refined / replacement scope-guard model (§10) — and an explicit future-implementation
> evidence set (§11) and Codex audit checklist (§12). It **accepts that design as a docs-only precondition
> only**: it neither implements nor authorizes any durable mode, migration, DB write, or production work, and
> it preserves every §13 block. The blocker decomposed by 46X is now **designed against** on paper, but it is
> **not resolved by implementation** and Mode 2 stays blocked until a separate authorization gate accepts the
> §11 / §12 evidence. **No durable mode, no migration, no production durable-store implementation, no
> production DB write, and no production migration execution is authorized by this gate.**

This maps to the prompt's recommended verdict — *Phase 46Y accepts the migration-isolation / scope-guard
boundary design as a docs-only precondition, but Mode 2 implementation remains blocked pending a later
authorization gate* — and to the 46X-chain convention of a load-bearing **Verdict A** (the durable mode stays
blocked) paired with the selection of a further docs-only lane.

---

## 2. Source chain

Phase 46Y sits at the bottom of an explicit, PR-anchored chain. Each link is read-only input here; none is
modified except the two §17 status notes.

- **Phase 46U / PR #166** — route-storage spike **authorization** gate, Verdict A. Preferred **Mode 1 (§6)**
  and **conditionally** authorized Mode 2 (dev-only durable + Lane-1 `aw_*` migrations) "subject to a separate
  Codex audit"
  ([`ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md)).
  **Not modified.**
- **Phase 46V / PR #167** — implemented **Mode 1 exclusively**: no migrations, no SQL, no DB writes, in-process
  `Map` state, one Phase 33Q ledger per synthetic actor; the source header
  (`route-storage-spike.ts:9-15`) names the Mode 2 blocker this gate designs against
  ([`admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md)).
  **Gains a minimal Phase 46Y status note (§17).**
- **Phase 46W / PR #168** — route-storage spike **acceptance** gate, Verdict A. Accepted Phase 46V as a bounded
  dev/operator Mode 1 proof; selected the Phase 46X lane
  ([`ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md)).
  **Not modified.**
- **Phase 46X / PR #169** — Mode 2 enablement **blocker-decomposition** gate, Verdict A. Decomposed the blocker
  into the §9 required-future-evidence set and §7 candidate options, selected **Option B** (this Phase 46Y
  docs-only design lane, with the guard-refinement Option C folded in)
  ([`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md)).
  **The selecting predecessor; gains a minimal Phase 46Y status note (§17).**
- **Phases 46S / 46T / PR #164 / #165** — drafted and accepted the durable-store schema / migration design (13
  `aw_*` tables across 11 subsections; `schema_final` / `route_contract_final` **false**)
  ([`ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md),
  [`ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md)).
  The `aw_*` table set the §7 Class-E classification refers to; **not modified, not frozen**.
- **Phase 46N / Candidate D (46M)** — gate #8 bounded **paper** clearing and the split-storage production-adapter
  proposal input
  ([`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md),
  [`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md)).
  The §13 boundary that keeps Lane-2 canonical migrations and the operative Straylight-side discharge blocked;
  **not modified**.
- **Phases 46O / 46P / 46Q** — the 114 / 114 runtime ↔ validator no-leak parity a future Mode 2 must hold over
  stored / replayed public surfaces
  ([`ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md)).
  **Not modified.**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner
  and the decision records cited as guardrails (§13). Cross-repo references, **not edited**.

---

## 3. Phase 46X blocker carried forward

Phase 46X established the Mode 2 blocker as a **conjunction of two independently-true facts** about the current
repo. Phase 46Y carries that statement forward **verbatim in substance** (it does not re-derive it) and designs
the models that would resolve it:

1. **The global migration runner adopts any new migration into the production migration set.**
   `discoverMigrations()` (`migrate.ts:76-85`) does `readdir(MIGRATIONS_DIR)` over the single shared directory
   `app/src/db/migrations/` (resolved at `migrate.ts:22-23`) and returns **every** file matching
   `f.endsWith('.sql') && !f.includes('_down')` (`migrate.ts:79`), sorted by leading numeric prefix
   (`migrate.ts:80-84`). `migrate()` applies **every** discovered file in order (`migrate.ts:199-240`),
   tracking each in `_migrations` (`migrate.ts:46-54`). There is **no** environment branch, allowlist,
   blocklist, category, or naming convention (other than `_down`) that excludes a file.
2. **The runner runs in production gated only on a DB pool being configured.** `server.ts:299-301` calls
   `await migrate(dbPool)` inside the startup `ready` promise **whenever `dbPool` is non-null**, with **no**
   `NODE_ENV`, dev/operator, or feature-flag gate around the call. A new `aw_*.sql` placed in the shared dir
   would be copied to `dist/` by `copy-migrations.mjs:38-40,48-52` and executed at the next production start.
3. **The Phase 33N scope guards forbid any durable-write / SQL / migration token and any production-store
   import on the spike surface.** `SPIKE_FILES` (`scope-guards.test.ts:36`) = every `.ts` under
   `app/src/services/admission-wedge-spike/` (recursive `walkTs`, `scope-guards.test.ts:25-34`) **plus**
   `app/src/routes/admission-intake.ts` (`scope-guards.test.ts:23`). The `DURABLE_WRITE_DENYLIST`
   (`scope-guards.test.ts:122-142`, **19** entries) forbids `INSERT`, `INSERT INTO`, `UPDATE`, `DELETE`,
   `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `pool.query`, `.query(`, `query(`, `.execute(`, `execute(`, the
   `sql\`` tagged template, `db.`, `database`, `pg`, `postgres`, `migration`, and `migrate` (after
   parser-backed comment stripping, `scope-guards.test.ts:78-118`). The forbidden-import test
   (`scope-guards.test.ts:185-198`) additionally rejects a bare `pg` import,
   `/db/(client|pool|migrate|transaction)`, `/db/migrations/`, any `/-store(\.js)?$/` specifier, and
   `BoundedEstateStore` / `bounded-estate-store`.
4. **These guards are a security boundary for the disabled-by-default spike surface** (`route-storage-spike.ts:
   29-35` — the spike opens "NO database connection, NO file handle … performs NO durable write and NO
   migration"). Weakening them broadly to admit a Mode 2 durable token would reduce the posture that currently
   proves the spike non-durable (§10).

**What is blocked after Phase 46X (answering design question 1).** Mode 2 — durable, route-owned storage with
at least one `aw_*` migration — remains **BLOCKED**; production durable-store implementation, production DB
writes, production migration execution, Lane-2 canonical Straylight-store migrations, production admission, the
route-contract freeze, the final schema freeze, and the operative Straylight-side ADR-022E gate #8 discharge
all remain blocked. Phase 46Y changes none of that; it only designs the boundary models on paper.

---

## 4. Current repo evidence

Read-only, confirmed at authoring time. No line number is invented; two figures were re-counted directly to
avoid drift.

### 4.1 Migration runner and packaging

- **Where migrations live.** A single shared directory `app/src/db/migrations/`, resolved relative to the
  compiled runner via `import.meta.url` (`migrate.ts:22-23`); at runtime `dist/db/migrate.js` scans
  `dist/db/migrations/` (the `DEST_DIR` resolved at `copy-migrations.mjs:24`), populated by the `mkdir` +
  `copyFile` loop at `copy-migrations.mjs:48-52`. Current contents: `003`–`015` plus `_down`
  rollback files (`013/014/015_*_down.sql`). **No `aw_*` migration exists today** (verified by directory
  listing).
- **Discovery is scan-the-whole-directory.** `discoverMigrations()` (`migrate.ts:76-85`) filters only on
  `.sql` and `!_down` (`migrate.ts:79`); there is **no** manifest, allowlist, category, environment field, or
  per-file opt-in.
- **Execution is ungated beyond a DB pool.** `migrate()` (`migrate.ts:140-254`) has no `NODE_ENV` branch; its
  sole caller `server.ts:299-301` invokes it whenever `dbPool` is non-null. Once a database URL is configured,
  migrations run identically in every environment.
- **Applied-tracking has no environment column.** `_migrations` (`migrate.ts:46-54`): `(id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())` — the
  table cannot record "this migration is dev-only." Concurrency is guarded by a Postgres advisory lock
  (`migrate.ts:153-167`); a changed already-applied file warns on checksum mismatch (`migrate.ts:203-210`).
- **Forward-only.** The runner does not auto-apply `_down` files (`migrate.ts:1-13`, `migrate.ts:79`); any
  reversible Mode 2 proposal must design its own drop/down path **and** the operational procedure to run it.
- **Build copy filters only on `.sql`.** `copy-migrations.mjs:38-40,48-52` filters to the `.sql` files
  (`38-40`) and copies every one from `src/db/migrations/` to `dist/db/migrations/` (the `mkdir` + `copyFile`
  loop, `48-52`); it makes no dev/production distinction.

### 4.2 Scope guards (Phase 33N)

- **Scanned surface.** `SPIKE_FILES` (`scope-guards.test.ts:36`) = recursive `.ts` under
  `app/src/services/admission-wedge-spike/` **plus** `app/src/routes/admission-intake.ts`; ≥5 files asserted
  present (`scope-guards.test.ts:163`). The current service dir holds 7 `.ts` files (`admitted-assertion-
  ledger`, `auth-gate`, `classifier`, `index`, `no-leak`, `public-response`, `route-storage-spike`).
- **Token denylist.** `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`) — **19** entries
  (re-counted) — applied to every spike file after parser-backed comment stripping
  (`scope-guards.test.ts:200-228`).
- **Import denylist.** `scope-guards.test.ts:185-198` (DB/migration/store imports) plus
  `scope-guards.test.ts:169-175` (no Freeside) and `scope-guards.test.ts:177-183` (no `@loa/straylight`).
- **Syntax-aware, evasion-resistant.** `stripComments()` (`scope-guards.test.ts:78-118`) uses the TypeScript
  parser; a regression suite (`scope-guards.test.ts:231-313`) proves a durable-write token cannot hide in a
  string, nested template `${\`//\`}`, or regex char class `/[//]/`, and that real comments / JSDoc are
  stripped.
- **Binary, no exception mechanism.** Any denylist or import match fails the test; there is **no** per-file
  opt-out, suppression comment, or allowlist (`scope-guards.test.ts:200-228`).
- **No package export.** `scope-guards.test.ts:315-337` asserts the spike is not a package export and not
  re-exported from `src/index.ts`. The docs validator stays Node-built-ins-only and unwired from `app/`
  (`scope-guards.test.ts:339-364`).

### 4.3 Spike storage (Phase 46V, Mode 1)

- **Mode 1 invariants.** `route-storage-spike.ts:29-35` — opens NO database connection, NO file handle, NO
  socket, NO timer; performs NO durable write and NO migration; entire state is JS `Map`s in a factory closure
  (`route-storage-spike.ts:309-411`); a process restart leaves no recallable residue.
- **Filename discipline.** `route-storage-spike.ts:40-43` — named `*-spike.ts`, deliberately not `*-store.ts`,
  to stay inside the `/-store(\.js)?$/` import guard (`scope-guards.test.ts:191-194`).
- **Mode 2 declined, blocker stated.** `route-storage-spike.ts:9-15` records the exact Mode 2 blocker this gate
  designs against.

### 4.4 No-leak parity, vectors, fixtures, env gates

- **No-leak.** `no-leak.ts` `FORBIDDEN_PUBLIC_KEYS` holds **114** keys at 114 = 114 parity with the
  route-contract validator (Phases 46O / 46P / 46Q).
- **Vectors / fixtures (unchanged).** Five route-vector JSONs + validator + `--self-check` (44/44); five Phase
  33E fixtures + validator (5/5). All green at authoring time (§17).
- **Env gates.** Two independent flags, both required: `DIXIE_ADMISSION_INTAKE_ENABLED`
  (`config.ts:428`) and the **draft / non-final** `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED`
  (`config.ts:442-443`), ANDed at the mount site as nested gates — the outer base route gate
  (`server.ts:651`) and the inner storage gate (`server.ts:674`), so the storage spike engages only on the
  conjunction of both. No production defaults.

> **Grounding note.** Two figures were re-confirmed by direct count during authoring: the Phase 33N
> `DURABLE_WRITE_DENYLIST` contains **19** entries (`scope-guards.test.ts:122-142`), and Phase 46S defines
> **13** `aw_*` tables across **11** subsections.

---

## 5. Problem statement

A durable Mode 2 route-storage lane would need, at minimum, **both** of:

- **(a)** at least one `aw_*` migration to create the durable `aw_*` tables Phase 46S designed (13 tables across
  11 subsections); and
- **(b)** durable writes executed from a route-owned surface.

Under the current repo, **(a)** collides with the migration runner and **(b)** collides with the scope guards:

- **(a) collides** because any `aw_*.sql` placed in `app/src/db/migrations/` is adopted into the **production**
  migration set (`migrate.ts:76-85`, `199-240`), copied by `copy-migrations.mjs:38-40,48-52`, and executed
  ungated at every production start (`server.ts:299-301`). There is no isolation seam today.
- **(b) collides** because the Phase 33N guards scan the **whole** spike directory and the route file and forbid
  every durable-write / SQL / migration token and every DB / migration / `-store` import
  (`scope-guards.test.ts:36`, `122-142`, `185-198`). A durable write or DB import placed on that surface trips
  the binary guard, and the guard has no narrow exception mechanism (`scope-guards.test.ts:200-228`).

Therefore a Mode 2 implementation **on the current surfaces** would necessarily either (i) place an `aw_*`
migration where the production runner adopts it, or (ii) weaken the blanket guard. **Neither is acceptable.**
The design problem this gate solves *on paper* is: **define a migration classification / isolation model and a
refined / replacement scope-guard model under which a future dev/operator-only, disabled-by-default,
non-production durable Mode 2 lane *could* be authorized — without weakening the current safety posture and
without entering production.** Designing those models does **not** authorize, sequence, or implement Mode 2;
Phase 46Y produces the design and stops (§6).

**Why Mode 2 cannot simply add a SQL migration under the current shared runner (answering design question 2).**
Because the shared runner has no isolation seam: discovery is whole-directory (`migrate.ts:76-85`), execution
is ungated beyond a DB pool (`server.ts:299-301`), and the build copy is `.sql`-only (`copy-migrations.mjs:
38-40,48-52`). A migration is "production" the instant its file lands in the directory. There is no current way
to add a dev/operator-only `aw_*` migration that the production runner will not adopt.

**Why weakening the existing spike scope guards would reduce the current safety posture (answering design
question 3).** The Phase 33N guards are the **only** source-tree proof that the disabled-by-default spike
surface performs no durable write and imports no production storage (`route-storage-spike.ts:29-35` ↔
`scope-guards.test.ts:200-228`). Because the guard is a single binary gate over the **whole** spike directory
(`scope-guards.test.ts:36`) with no exception mechanism, any blanket relaxation — removing a denylist entry,
loosening the import guard — re-opens the durable-write / DB-import capability for **every** spike file, not
just a narrow durable module. The posture would silently regress from "provably non-durable" to "durable writes
possible somewhere on the surface."

---

## 6. Design verdict

> **Verdict A — the migration-isolation / scope-guard boundary design (§7–§10) is accepted as a docs-only
> precondition; Mode 2 implementation remains BLOCKED pending a later authorization gate.**

Phase 46Y produces, on paper, the two models the 46X §9 evidence set requires:

- a **migration classification / isolation model** (§7) and the **isolation requirements** a future Mode 2
  authorization gate should demand (§8);
- a **storage boundary model** for future route-owned durable storage (§9); and
- a **refined / replacement scope-guard model** (§10),

together with a **future-implementation evidence set** (§11) and a **Codex audit checklist** (§12). It
**accepts that design as a docs-only precondition only**. It is explicitly **future-only**: it is **not
implemented by this phase**, it is **blocked pending later authorization**, it is **dev/operator-only**,
**disabled-by-default**, **non-production**, **synthetic-only**, **route-owned storage only**, with **no
production migration execution**, **no final schema freeze**, and **no route-contract freeze**.

Rejected verdicts: **authorize Mode 2 implementation now** — rejected (forbidden by scope; the §5 blocker is
unresolved by implementation). **Authorize a bounded Mode 2 implementation spike now** — rejected as premature:
the §7–§10 design must first pass its own acceptance pass and be turned into a concrete, checkable
authorization checklist, which is the §16 Phase 46Z lane. **Do nothing / keep blocked with no design** —
rejected: 46X already invested the decomposition; producing the boundary design is the cheapest next step that
converts the blocker into a reviewable artifact without authorizing anything (§14).

---

## 7. Migration classification model

**Design only. Phase 46Y does not create this model in code; it defines what a later implementation
authorization must prove (answering design question 4, part 1).** A future Mode 2 lane should classify
migrations into four mutually-exclusive classes:

| Class | What it is | Runner relationship | Status under Phase 46Y |
|-------|-----------|---------------------|------------------------|
| **P — normal production migrations** | The existing `003`–`015` shared set and any future production schema | Current shared directory `app/src/db/migrations/`, normal `discoverMigrations()` → `migrate()` path, `copy-migrations.mjs` packaging | **Unchanged.** Not touched, not reclassified. |
| **E — dev/operator Admission Wedge experimental migrations** (`aw_*`) | The future dev/operator-only `aw_*` tables Phase 46S drafted (synthetic-only, non-production) | **Isolated classification — must NOT be auto-adopted by the normal production runner** | **Future-only; not created here.** The class this gate exists to make designable. |
| **T — test-only fixtures / harness schema** | Schema created only by a test harness / fixture | **Never production migration material**; never placed in the production discovery path | Defined as a distinct class so test schema is never confused with E or P. |
| **C — future canonical Straylight-store migrations** | Canonical `Assertion` / `TransitionReceipt` / `AuditEvent` lifecycle storage | **Separately gated Lane-2 / production architecture work** — each a sibling-repo ADR under Straylight teammate review (ADR-022D §7; 46N) | **Blocked; out of scope for Mode 2 spike work entirely** (§13). |

**Load-bearing distinctions.**

- **Class E is *not* Class C.** A dev/operator-only `aw_*` experimental migration is route-owned, synthetic,
  non-production, and reversible; it is **not** a canonical Straylight-store migration and must **never**
  silently become one. Mode 2 is a Class-E question only; Class C stays blocked behind gate #8.
- **Class E is *not* Class P.** The whole point of the classification is that an `aw_*` experimental migration
  must be excludable from the production discovery/execution path (`migrate.ts:76-85`, `server.ts:299-301`) —
  i.e. it must **not** be a Class-P file merely by living next to one.
- **Class T is *not* a migration at all** for production purposes — it never enters the production runner.

Phase 46Y asserts only that these classes are the right **paper** decomposition; it builds none of them and
modifies no runner, directory, or guard.

---

## 8. Migration isolation requirements

**Design only — the conditions a future Mode 2 *authorization* gate should likely require (answering design
question 4, part 2).** None is created here. A future authorization gate should demand:

1. **Separate migration directory or explicit migration manifest / category** for Class-E `aw_*` dev/operator
   experimental migrations — so a Class-E file is never discovered by the production `discoverMigrations()` scan
   of `app/src/db/migrations/` (`migrate.ts:76-85`) and never copied by the production `copy-migrations.mjs`
   path (`copy-migrations.mjs:38-40,48-52`).
2. **An explicit env-gated dev/operator migration runner, disabled by default** — a separate runner (or a
   separate, env-gated branch) that applies Class-E migrations only when an explicit dev/operator gate is set,
   mirroring the Phase 46V AND-gated, disabled-by-default posture; never invoked by `server.ts:299-301`'s
   ungated production `migrate(dbPool)` call.
3. **Proof that normal server startup / normal `migrate(dbPool)` cannot silently adopt experimental `aw_*`
   migrations** — demonstrated against the actual discovery + execution + packaging path (`migrate.ts:76-85`,
   `199-240`; `server.ts:299-301`; `copy-migrations.mjs:38-40,48-52`), including the build-copy step.
4. **Proof that production migration execution cannot run the experimental path by accident** — no environment,
   config, or default under which the dev/operator runner engages in production; no production fallback.
5. **A rollback / drop / tombstone / cleanup procedure for synthetic dev/operator objects** — including
   drop-empty-table semantics and the operational procedure to run it (the forward-only runner will not
   auto-run a down file, `migrate.ts:79`).
6. **No durable raw candidate payload persistence** — the durable substrate persists no raw candidate / source
   material; only synthetic, bounded, route-owned records (mirroring the Phase 46V / 33Q no-raw-payload
   invariant).
7. **No public response body expansion** — the public envelope stays the fixed allowlist; any change requires a
   separate no-leak proof (§9, §11).
8. **No route-contract freeze** — the route contract stays draft / non-final.
9. **No production DB write authorization** — Class-E writes are dev/operator-only, disabled-by-default,
   non-production; no production write path is opened.

These are **requirements on a future gate**, not commitments to a specific mechanism. Phase 46Y deliberately
does **not** pick "separate directory" vs "manifest" vs "naming-convention exclusion + dev-only runner" vs
"env-gated category recorded in `_migrations`" as *the* mechanism — that selection, with its own security
review, belongs to the later authorization work, and each candidate is a **production-runner change** that this
gate neither makes nor authorizes.

---

## 9. Storage boundary model

**Design only — the acceptable boundary for future route-owned durable storage (answering design question 5).**

- **Route-owned storage only.** Dixie owns endpoint-local contract / idempotency / replay records, ingress
  references, and the public/private projection — **never** a parallel canonical lifecycle. The canonical
  `active` `Assertion`, `TransitionReceipt`, and append-only hash-chained `AuditEvent` remain **Straylight-
  owned** (46S §4.1–§4.3; 46M §6.3; ADR-022D). A future durable substrate is a Dixie route-side adapter, **not**
  canonical Straylight storage.
- **Dev/operator-only, disabled-by-default, non-production, synthetic-only.** Any durable Mode 2 substrate must
  preserve the Phase 46V posture: two independent gates both required, AND-gated, no production fallback,
  synthetic material only.
- **Bounded, fail-closed, rejection-not-eviction.** Per-store / per-estate / per-actor capacity bounds with
  bounded **rejection** beyond the cap (never eviction), atomic fail-closed on any store fault (mirroring
  `route-storage-spike.ts` Mode 1 semantics), and tenant / estate / actor isolation.
- **No raw payload persistence.** No raw candidate / source / reason material is persisted; only synthetic,
  bounded, route-owned records.
- **Persisted + replayed responses pass the 114-key no-leak guard.** A durable Mode 2 must deep-walk persisted
  and replayed public responses exactly like a fresh one (`no-leak.ts`, 114 = 114); store record ids, private
  audit fields, receipt refs, signer / consent internals, and synthetic actor ids never appear on the wire.
- **No public body expansion without a separate no-leak proof.** The public envelope stays the fixed allowlist.
- **Module placement is a §10 question.** The durable module is either placed **outside** the blanket-guarded
  spike directory (with its own dedicated narrow guard) or **inside** it under a new narrow guard category —
  decided by the refined scope-guard model, not by widening the existing blanket guard.

The storage boundary model is **future-only** and **not implemented by this phase**: no store, substrate,
adapter, or schema is built, and the §13 production / Lane-2 boundary is preserved.

---

## 10. Refined scope-guard model

**Design only — what must change in guard *posture* (on paper) before any future Mode 2 implementation
(answering design question 6). No guard file is edited, added, removed, or weakened by this phase.**

- **The current guards are correct.** They are correct to reject durable-write / SQL / migration / DB /
  production-store surfaces on the existing spike path (`scope-guards.test.ts:122-142`, `185-198`,
  `200-228`). Phase 46Y affirms them and changes none.
- **Mode 2 cannot be implemented by weakening those guards broadly.** A blanket relaxation re-opens the
  durable-write / DB-import capability for the whole spike surface (§5), regressing the posture from "provably
  non-durable" to "durable writes possible somewhere."
- **Instead, a future authorization gate must define narrow allowlisted paths and negative guards.** The
  replacement model **replaces, not weakens** the Phase 33N blanket guard: it permits only a **specifically
  named** dev/operator Mode 2 module and an **isolated** migration mechanism, while keeping the rest of the
  surface under the existing blanket denylist.
- **The refined guards must continue to fail on** (everywhere outside the one narrow allowlisted module):
  - raw SQL imports;
  - production migration files / the production `/db/migrations/` path;
  - normal DB-runner coupling (`/db/(client|pool|migrate|transaction)`, bare `pg`);
  - public response body expansion;
  - unsafe storage imports (any `/-store(\.js)?$/`, `BoundedEstateStore`, etc.);
  - runtime route mounting outside the explicit AND-gated, disabled-by-default gates;
  - unbounded / production storage claims.
- **The refined guards may later permit only** a specifically-named dev/operator Mode 2 module **and** an
  isolated migration mechanism — **if and only if** a later authorization gate accepts the §11 / §12 evidence,
  and only with the new narrow guard proven against the **same** evasion-resistance bar as the current one
  (`scope-guards.test.ts:231-313`).
- **No guard exception is designed in isolation.** Per 46X (Option C folded into this lane), the
  guard-refinement design is decided **together** with the §7 / §8 migration-isolation model, not as a
  standalone first move that prejudges the migration side.

The refined scope-guard model is **future-only** and **not implemented by this phase**: the actual guard files
(`scope-guards.test.ts`) are unchanged, and no narrow allowlist or new guard category is added to the repo
here.

---

## 11. Future implementation authorization evidence

Mode 2 implementation may **not** be authorized until **all** of the following are proven and separately
accepted (carried forward and refined from 46X §9; this is the acceptance bar for the §16 Phase 46Z checklist
gate and any later authorization gate):

1. **Working-tree scope proves the implementation lane is explicitly authorized** — a prior accepted
   authorization gate names the exact module(s) / mechanism(s) permitted.
2. **A safe migration classification / isolation model** (§7) is implemented and **migration-runner isolation
   is demonstrated** — Class-E `aw_*` migrations are excluded from the production discovery / execution /
   packaging path (`migrate.ts:76-85`, `199-240`; `server.ts:299-301`; `copy-migrations.mjs:38-40,48-52`).
3. **Proof that production startup cannot run dev/operator `aw_*` migrations** — no environment / config /
   default under which `server.ts:299-301`'s ungated `migrate(dbPool)` adopts a Class-E migration.
4. **Base route gate and storage gate remain AND-gated and disabled by default** — no activation from the
   storage gate alone; no activation from the base route gate alone; no production fallback (as Phase 46V).
5. **A refined / replacement guard model** (§10) that permits only a narrow route-owned durable module while
   continuing to block raw SQL, production storage, and unsafe imports, proven against the same
   evasion-resistance bar (`scope-guards.test.ts:231-313`).
6. **No public response change** — persisted / replayed public responses pass the 114-key no-leak guard
   exactly like a fresh response; the public body does not expand without a separate no-leak proof.
7. **No raw candidate payload persistence**; only synthetic, bounded, route-owned records.
8. **Tenant / estate / actor isolation**, **idempotent replay / conflict fail-closed behavior**, and **no
   cross-tenant leakage** — proven by tests against the durable substrate.
9. **No unsafe scope-accessor / TOCTOU regression** — the Phase 46V `snapshotActorId` discipline (read the
   actor id once, validate, key all access off the local) is preserved or strengthened.
10. **Bounded capacity / retention with rejection-not-eviction, plus a rollback / drop / cleanup plan** and
    runbook / rollback docs (the forward-only runner will not auto-run a down file, `migrate.ts:79`).
11. **Proof that Lane-2 canonical Straylight-store migrations remain blocked** — no Dixie migration authority
    over canonical records; each canonical migration stays a separate sibling-repo ADR under Straylight
    teammate review (ADR-022D §7; 46N).
12. **No package / export / config / CI drift outside authorized files**, and **a Codex audit before
    implementation** (mirroring the Phase 46V Codex patch-and-re-audit discipline; 46U §6 / §7 conditioned Mode
    2 on "a separate Codex audit").

Until every item is proven and separately accepted, Mode 2 stays blocked.

---

## 12. Codex audit checklist for any later Mode 2 implementation

The exact evidence Codex should demand **later**, before approving any Mode 2 implementation PR (this is a
checklist for a future audit, not an audit run here):

- **Authorization** — working-tree scope proves the implementation lane is explicitly authorized by a prior
  accepted gate; only the named module(s) / mechanism(s) are touched.
- **Migration-runner isolation is demonstrated** — Class-E `aw_*` migrations are excluded from the production
  discovery / execution / packaging path; a test proves a Class-E file is not adopted by the production runner.
- **Production startup cannot run dev/operator `aw_*` migrations** — proven against `server.ts:299-301` and the
  runner; no environment runs the experimental path by accident.
- **Base route gate and storage gate remain AND-gated and disabled by default** — and proven so: **no
  activation from the storage gate alone; no activation from the base route gate alone.**
- **No public response change** — persisted / replayed public responses pass the 114-key no-leak guard; the
  public body does not expand.
- **No raw candidate payload persistence.**
- **Tenant / estate / actor isolation** is proven; **idempotent replay / conflict fail-closed** is proven; **no
  cross-tenant leakage.**
- **No unsafe scope-accessor / TOCTOU regression** (the `snapshotActorId` discipline holds).
- **Bounded capacity / cleanup** — rejection-not-eviction, a working drop / down / tombstone path, runbook.
- **No package / export / config / CI drift outside authorized files.**
- **Tests for negative guard behavior** exist — the refined guard still fails on raw SQL, production migration
  files, normal DB-runner coupling, public response expansion, unsafe storage imports, runtime mounting outside
  explicit gates, and unbounded / production storage claims (the same evasion-resistance bar,
  `scope-guards.test.ts:231-313`).
- **Validators still pass** — the five route-contract vectors (+ `--self-check`) and five Phase 33E fixtures
  remain green.

---

## 13. Blocked lanes preserved

Regardless of verdict, the following remain **blocked** after Phase 46Y (answering design question 9):

- **Mode 2 implementation** — not authorized; only a docs-only checklist lane (Phase 46Z) is selected (§16);
- production durable-store implementation;
- production DB writes;
- production migration execution;
- **Lane-2 canonical Straylight-store migrations** — each a separate sibling-repo ADR under Straylight teammate
  review (ADR-022D §7); the operative Straylight-side ADR-022E gate #8 discharge **remains held** (46N: a Dixie
  docs-only phase cannot, by itself, discharge it);
- production admission;
- public `remember-this`;
- Discord / freeform ingestion;
- user chat becoming memory merely because it was said;
- Freeside runtime / client integration;
- package exports (unless separately justified and audited);
- LLM / voice / Finn wiring;
- MVP 3 forget / revoke / correction UI;
- **route-contract freeze**;
- **final schema freeze**;
- production readiness;
- production signer / auth / consent (the dev/operator service-token / operator model is **not** production
  auth and is **not** consent; missing / invalid consent fails closed in any future production model).

**Candidate D / ADR-022E boundary preserved.** Candidate D (split-storage) remains **proposal input / design
baseline, not implemented production architecture**; Phase 46N's gate #8 clearing remains a **bounded Dixie
documentation / architecture / handoff prerequisite only**; the operative Straylight-side discharge remains
blocked unless separately evidenced (no such accepted evidence exists at authoring time).

---

## 14. Options considered

Each option is enumerated and evaluated, not implemented.

### Option A — Keep Mode 2 blocked; produce no boundary design.

- **Would authorize.** Nothing new; the 46X decomposition stands without a design.
- **Still blocks.** All of Mode 2.
- **Risks.** Low, but it leaves the 46X blocker mapped-yet-undesigned, so any later authorization gate would
  have to start the design from scratch.
- **Verdict.** **Not selected** — it advances nothing; the boundary design is the cheapest next artifact.

### Option B — Accept the migration-isolation / scope-guard boundary design as a docs-only precondition, then select a docs-only Phase 46Z implementation-authorization **checklist** gate. **SELECTED.**

- **Would authorize.** The §7–§12 boundary design as a **docs-only precondition**; a further **docs/decision-
  only** Phase 46Z checklist lane (§16). Authorizes **no** implementation.
- **Still blocks.** Mode 2 implementation, migrations, DB writes, production durable storage, Lane-2 canonical
  migrations, guard edits.
- **Risks.** Low — paper only. The §10 guard-refinement design is the single highest-leverage future security
  change, so it is deliberately deferred to a checklist gate (46Z) and then a separate authorization gate, not
  decided here as implementable.
- **Verdict.** **SELECTED (§15 / §16).** It is the smallest step that converts the 46X blocker into a concrete,
  reviewable boundary design and names the next non-implementation lane.

### Option C — Jump straight to a bounded Mode 2 implementation-**authorization** gate (one that authorizes a spike).

- **Would authorize.** A future bounded dev/operator-only Mode 2 implementation spike.
- **Risks.** Medium-high / premature. The §7–§10 design has not yet been accepted as a checkable checklist;
  authorizing implementation before the checklist exists risks an under-specified authorization. The safe order
  is **design (this gate) → checklist (46Z) → authorization → implementation.**
- **Verdict.** **Not selected** — deferred behind the Phase 46Z checklist lane.

### Option D — Authorize Mode 2 implementation now.

- **Risks.** Disqualifying. The §5 blocker is unresolved by implementation; implementing today would require
  weakening a guard (§10) and/or adopting a migration into the production set (§5). Forbidden by this gate's
  scope and by 46W / 46X.
- **Verdict.** **REJECTED.**

### Option E — Defer Mode 2 entirely behind gate #8 / Straylight-side production architecture.

- **Would authorize.** Nothing now; Mode 2 deferred behind the operative gate #8 discharge.
- **Risks.** Low, but over-defers: the dev/operator Lane-1 **design** question (Option B) is safe to run now (it
  is paper) and produces value without waiting on Straylight.
- **Verdict.** **Partially adopted** — the **production** and **Lane-2** parts genuinely stay deferred behind
  gate #8 (§13) — but not selected as the whole posture; the Class-E design proceeds on paper.

---

## 15. Decision

Phase 46Y **accepts the migration-isolation / scope-guard boundary design (§7–§10), the future-implementation
evidence set (§11), and the Codex audit checklist (§12) as a docs-only precondition** for any later Mode 2
work, and **keeps Mode 2 implementation BLOCKED pending a separate authorization gate** (Verdict A, Option B).

This is **future-only** and **not implemented by this phase**. The boundary design is **dev/operator-only**,
**disabled-by-default**, **non-production**, **synthetic-only**, **route-owned storage only**, with **no
production migration execution**, **no final schema freeze**, and **no route-contract freeze**. Phase 46Y
authorizes nothing beyond accepting the boundary design as a precondition and selecting a docs-only checklist
lane. It does **not** make Mode 2 implementation-ready, does **not** design durable production storage, does
**not** discharge any Straylight-side production gate, and does **not** imply that `aw_*` migrations are safe
until a future implementation proves the §11 / §12 isolation and guard evidence. It implies **no** change to
the normal migration runner.

**Non-authorizations and invariants preserved** (carried forward unchanged):

- **A pending candidate is not recallable.**
- **A rejected candidate creates no admitted assertion.**
- **An accepted candidate creates / references an admitted assertion.**
- **A superseded assertion is excluded from ordinary recall** unless explicitly requested / marked.
- **A malformed / unsafe payload fails closed.**
- **Missing / unauthorized auth fails closed; missing / invalid consent fails closed** in any future production
  admission model.
- **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
  material**; private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private.
- **User chat does not become memory merely because it was said.**
- **Public `remember-this`, Discord / freeform ingestion, and production admission / storage / auth / consent
  remain blocked.**
- **`active` remains the canonical assertion status, not a public `outcome_class`; `recall_eligible` remains
  derived / projection-only.**

---

## 16. Next lane

> **Selected next lane: Phase 46Z — Admission Wedge Mode 2 implementation-authorization **checklist** gate
> (docs / decision-only).**

Phase 46Z is a **docs / decision-only** lane that decides whether the Phase 46Y boundary design (§7–§12) is
sufficient to authorize a **bounded dev/operator-only, disabled-by-default, non-production** Mode 2
implementation spike — by turning the §11 evidence set and §12 audit checklist into a concrete, checkable
authorization checklist. **It still does not implement Mode 2** unless a later phase explicitly authorizes that;
it implements no store, writes no DB, adds no migration, creates no SQL or executable schema, edits no guard,
changes no route / API behavior, and freezes nothing.

> **Phase 46Z status note (added later).** Phase 46Z
> ([`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md),
> docs/decision-only) executed this lane and reached **Verdict A — the Phase 46Y boundary design is sufficient
> to authorize a future, separate-PR, bounded, dev/operator-only, disabled-by-default, non-production Mode 2
> implementation spike, *acceptance-gated on a hard checklist*; Mode 2 itself remains unimplemented and is
> BLOCKED from production / Lane-2 / freeze / gate-#8 work in full.** It converted the §7–§12 boundary design
> into a binary, file:line-grounded checklist (migration-isolation, scope-guard, gate-conjunction,
> storage-behaviour, no-leak), a future file-scope envelope, a validation matrix, and a copyable Codex audit
> checklist for the later implementation PR, and selected only a **separate Phase 47A implementation lane**
> (acceptance-gated and mode-contingent) next. It edits no guard or migration runner and authorizes **no** Mode 2
> implementation, durable storage, migration, production DB write, or migration execution **in its own PR**.

**Not selected:** direct production implementation; production durable-store implementation; production DB
writes or migration execution; Mode 2 implementation now (the §5 blocker is unresolved by this gate's design —
§6 / §14). A later **bounded implementation authorization gate** and an implementation lane remain possible
only **after** Phase 46Z is itself accepted and the §11 / §12 evidence is proven.

---

## 17. Validation plan

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46Y is
docs/decision-only — it adds only this document (plus the two minimal cross-reference status notes below) and
mutates no runtime source, test, validator, vector, fixture, migration, or SQL file — so the validators are run
only to confirm the unchanged artifacts remain green.

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
# New-untracked-doc whitespace check (no-index; `|| true` because a clean file is fine):
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md
# Scope proof — no source/test/migration/sql/config/package/CI/generated/binary file changed:
git diff --name-only HEAD -- app/ src/ '*.sql' '*.json' '*.lock' '*.yml' '*.yaml' package.json
# Stale-claim scan — no "46Y authorizes implementation" style overclaim:
grep -niE "46Y (authorizes|enables|implements|unblocks) (mode 2|implementation|durable)" docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md || true
```

**Recorded results for this lane** (run during authoring):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md` is added, plus the two minimal
  cross-reference status notes (§17 list below); no runtime source (and specifically not `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql`, `route-storage-spike.ts`, `no-leak.ts`, `config.ts`, `admission-intake.ts`,
  `server.ts`, or `scope-guards.test.ts`), no runtime test, no route-vector JSON, validator, README, fixture,
  fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, SQL, executable
  schema, or generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth
  vector**; the `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail
  closed; 2 exact-key non-over-match guards stay clean);
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–18 exactly once
  each;
- **stale-claim scan** — no "46Y authorizes implementation / enables Mode 2 / implements durable" style line is
  present.

**Corruption / duplicate guard** (carried from the 46I–46X precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 18.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token,
  a trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is the §17
  validation command list. **No fenced block is an executable migration or runnable schema.**

**Two minimal cross-reference status notes added by this gate** (no other document is modified):

- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md)
  — Phase 46X (PR #169), the **selecting predecessor**: its §16 named this lane. **Gains a minimal Phase 46Y
  status note.**
- [`docs/admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md)
  — Phase 46V (PR #167), the implementation whose source header names the blocker (`route-storage-spike.ts:
  9-15`). **Gains a minimal Phase 46Y status note.**

---

## 18. Non-authorizations

Phase 46Y authorizes nothing beyond accepting the migration-isolation / scope-guard boundary design as a
docs-only precondition and selecting a docs-only Phase 46Z checklist lane. It explicitly does **not** authorize,
and is **not** to be read as authorizing:

- Mode 2 implementation (it is **future-only**, **not implemented by this phase**, **blocked pending later
  authorization**);
- a future Mode 2 implementation lane (only a docs/decision-only Phase 46Z checklist gate is selected);
- production durable-store implementation;
- production DB writes;
- production migration execution;
- any change to the normal migration runner (`migrate.ts`) or its packaging (`copy-migrations.mjs`);
- any weakening, editing, addition, or removal of a scope guard (`scope-guards.test.ts`) — the refined-guard
  model is **paper design only**;
- Lane-2 canonical Straylight-store migrations or the discharge of the operative Straylight-side ADR-022E gate
  #8;
- production admission, production signer / auth / consent;
- a route-contract freeze or a final schema freeze;
- Freeside runtime / client integration;
- any production readiness claim.

Explicitly, this gate does **not** say Mode 2 is now implementation-ready, does **not** say durable production
storage is designed, does **not** say the Straylight-side production gates are discharged, does **not** say
`aw_*` migrations are safe until an implementation proves isolation, and does **not** imply normal migration
runner changes were made. No test is claimed to exist that does not exist in the repo; the §11 / §12 isolation
tests, dev-only runner, narrow guard, and durable substrate are **future-only** and are **not present in the
repo** at authoring time.
