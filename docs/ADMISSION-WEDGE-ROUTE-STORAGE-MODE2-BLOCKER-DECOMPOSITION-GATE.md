# Phase 46X — Admission Wedge Dev/Operator Durable (Mode 2) Route-Storage Enablement Blocker Decomposition Gate

> **Phase**: 46X
> **Branch context**: `phase-46x-admission-mode2-storage-blocker-decomposition`
> **Related**: Phase 46W (PR #168,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md))
> **accepted** the merged Phase 46V Mode 1 route-storage spike as a bounded, disabled-by-default,
> dev/operator-only, non-production proof and §16 **selected this Phase 46X blocker-decomposition lane**; Phase
> 46V (PR #167,
> [`admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md))
> **implemented** Storage Mode 1 (no-migration, bounded-synthetic, in-process, route-owned) and **declined**
> Mode 2 for the architectural reason this gate decomposes; Phase 46U (PR #166,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md)
> §3–§16) **authorized** that spike with **Mode 1 preferred** and Mode 2 (durable + Lane-1 `aw_*` migrations)
> conditionally authorized "subject to a separate Codex audit"; Phases 46T / 46S (PR #165 / #164) **accepted**
> and **drafted** the durable-store schema / migration design (13 `aw_*` tables across 11 subsections;
> `schema_final` / `route_contract_final` false); Phase 46N (PR series, gate #8 re-authored clearing ADR)
> **cleared** ADR-022E gate #8 as a **Dixie documentation / architecture / handoff prerequisite only** while
> the operative Straylight-side discharge **remains held**; Phase 46M selected **Candidate D** (split-storage
> production-adapter placement) as **proposal input only**; Phase 46K decomposed durable-store
> implementation-readiness; Phases 46O / 46P / 46Q (PR #160 / #161 / #162) restored and accepted the runtime
> no-leak mirror at **114 = 114** parity; Phases 33M–33R authorized / implemented / accepted the
> dev/operator-only route spike and the bounded synthetic admitted-assertion ledger Phase 46V wraps; Straylight
> (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); ADR-022E durable-store gate #8 (+ sibling
> gates #9 / #10 / #11 / #12 / #15 / #20, **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only blocker-decomposition gate.** This gate adds **only this document** (plus
> a minimal cross-reference status note in the immediate predecessor Phase 46W acceptance gate and the Phase
> 46V runbook, §17). It modifies **no** runtime source — and specifically does **not** modify
> `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`,
> `app/src/services/admission-wedge-spike/route-storage-spike.ts`, `index.ts`, `no-leak.ts`,
> `app/src/config.ts`, `app/src/routes/admission-intake.ts`, `app/src/server.ts`, or
> `app/tests/unit/admission-wedge-spike/scope-guards.test.ts` — and changes **no** route handler, storage /
> store code, DB write, migration, SQL file, executable schema, auth, consent, route-vector JSON, route-vector
> validator, route-vector README, Phase 33E fixture, fixture validator, other test, package export, config,
> env, package, lockfile, CI, generated file, or binary. No adjacent repository (`loa-straylight`,
> `freeside-characters`) is touched.
> **This is the Mode 2 enablement *blocker-decomposition* gate** — the rung downstream of the Phase 46W
> acceptance, mirroring the Phase 46B → 46C readiness-decomposition precedent one lane up. It **decomposes**
> the concrete architectural blocker that forced Mode 1 over Mode 2 — (a) the global migration runner adopting
> any new migration into the **production** migration set, and (b) the Phase 33N scope guards forbidding any
> durable-write / SQL / migration token and any production-store import in the spike path — into ordered,
> separately-gateable sub-lanes, and decides the next safe lane. **It is not the spike, it authorizes no
> durable mode, and it implements nothing.** It **builds no store, writes no DB, adds no migration, creates no
> SQL or executable schema, executes no migration, implements no auth or consent, changes no route / API
> behavior, weakens no scope guard, freezes neither the route contract nor the final schema, discharges no
> operative Straylight-side gate, and claims no production readiness.**

Every assessment below is grounded **read-only** against the actual Dixie repo at the time of writing: the
migration runner `app/src/db/migrate.ts`, the build-asset packager `app/scripts/copy-migrations.mjs`, the
shared migration directory `app/src/db/migrations/`, the Phase 33N static scope guards
`app/tests/unit/admission-wedge-spike/scope-guards.test.ts`, the merged Phase 46V route-storage spike
`app/src/services/admission-wedge-spike/route-storage-spike.ts`, the runtime no-leak guard `no-leak.ts`, the
env parsing in `app/src/config.ts`, the conditional mount in `app/src/server.ts`, the Phase 46V runbook, and
the predecessor decision gates (46W / 46V / 46U / 46T / 46S / 46N / 46M / 46K / 46O–46Q). Where a claim could
not be grounded inside the read material, it is marked as such. **The canonical Straylight `StorageAdapter`
interface and the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes live in the adjacent
`loa-straylight` repository (cross-repo references, not Dixie file:line) and remain Straylight-owned (§11).**

---

## 1. Status and verdict

Phase 46X is the bounded, docs/decision-only **Mode 2 route-storage enablement blocker-decomposition gate**
named by Phase 46W §16. Its purpose is to take the **concrete architectural blocker** the merged Phase 46V
spike surfaced — the reason a durable Mode 2 route-storage spike could **not** be added without weakening an
existing security guard — and decompose it, precisely and read-only, into the ordered set of conditions and
separately-gateable sub-lanes that would have to be satisfied **before** any durable Mode 2 implementation
could be safely authorized. It then selects the next safe lane and stops.

**What this phase is, stated narrowly and exactly.** Phase 46X:

- is **docs / decision-only** — it decomposes the Mode 2 blocker after Phase 46W and orders the conditions
  into separately-clearable sub-gates;
- is a **blocker-decomposition gate**, *not* an implementation, *not* the spike *authorization* gate (46U),
  *not* the spike *acceptance* gate (46W), *not* the schema / migration **design** gate (46S), and *not* the
  schema / migration **design acceptance** gate (46T);
- does **not** modify runtime source or tests — and specifically does not touch `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql` migration, `route-storage-spike.ts`, `no-leak.ts`, `config.ts`,
  `admission-intake.ts`, `server.ts`, or `scope-guards.test.ts`;
- does **not** implement Mode 2, route storage, or durable storage;
- does **not** create migrations and does **not** execute any migration;
- does **not** create SQL files or executable schema;
- does **not** write DB code or perform any DB write;
- does **not** weaken, relax, or edit any scope guard;
- does **not** change route / API behavior;
- does **not** implement or unblock auth or consent;
- does **not** authorize production admission;
- does **not** freeze the route contract;
- does **not** freeze the final schema;
- does **not** claim production readiness;
- does **not** claim or discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §11);
- does **not** select direct production durable-store implementation, and does **not** select Mode 2
  implementation, as the next lane (§8 / §16).

> **Verdict: A — Mode 2 remains BLOCKED. The blocker is decomposed into the required future gates that must
> clear before any Mode 2 implementation can be authorized.** Specifically: the Mode 2 enablement blocker is a
> genuine, evidence-grounded conjunction — (i) the global migration runner adopts **any** new `.sql` file in
> the shared migration directory into the **production** migration set (§3 / §5), and (ii) the Phase 33N scope
> guards forbid **any** durable-write / SQL / migration token and **any** production-store import on the spike
> surface (§3 / §6) — and the two cannot both hold while a durable migration is added unless a **migration
> classification / isolation model** and a **replacement guard model** are designed first. Phase 46X
> decomposes that into the §9 required-future-evidence set and §7 candidate options, and **selects a
> docs/decision-only Phase 46Y design lane (§8 / §16)**. **No durable mode, no migration, no production
> durable-store implementation, no production DB write, and no production migration execution is authorized by
> this gate.**

This maps to the prompt's verdict **(A)** — *"Mode 2 remains blocked; the blocker is decomposed into required
future gates before any implementation can be authorized."* Verdict **(B)** (authorize a future docs-only
design / refinement lane) is **also implied as the immediate next step** and is what §8 / §16 select — but the
load-bearing decision of *this* gate is **(A)**: the blocker is mapped and Mode 2 stays blocked. Verdicts
**(C)** (a future *bounded implementation authorization* gate) and **(D)** (authorize Mode 2 implementation
next) are **rejected** here: the repo evidence (§3–§6) shows the migration/storage boundary is **not yet
decomposed enough** to safely sequence even an authorization gate, let alone implementation. The safe order is
**decompose first** (this gate), then **design** (Phase 46Y, docs-only), and only later — gated on §9 — an
authorization gate, and only after *that* an implementation lane.

---

## 2. Evidence intake

Phase 46X is grounded in the following read-only repo evidence. Every line reference below was confirmed
against the file at authoring time; no line number is invented.

### 2.1 Authorization → implementation → acceptance chain (46U / 46V / 46W)

- **Phase 46U / PR #166** — route-storage spike **authorization** gate, **Verdict A**. Authorized a future
  disabled-by-default, dev/operator-only, bounded, reversible, **non-production** route-storage spike
  implementation lane (Phase 46V) under §3–§16, with **Mode 1 preferred (§6)** and Mode 2 (dev-only durable +
  Lane-1 `aw_*` migrations) **conditionally** authorized "subject to a separate Codex audit"; preserved every
  production blocker; defined the §3.3 acceptance bar
  (`ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md`).
- **Phase 46V / PR #167** — implemented **Mode 1 exclusively**: no migrations, no SQL, no DB writes, in-process
  `Map` state, one independent Phase 33Q ledger per synthetic actor; the Codex PATCH fixed a shifting-accessor
  TOCTOU bug on `scope.actor_id` via the `snapshotActorId` closure, re-audited ACCEPT
  (`app/src/services/admission-wedge-spike/route-storage-spike.ts`; runbook
  `docs/admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`).
- **Phase 46W / PR #168** — route-storage spike **acceptance** gate, **Verdict A**. Accepted Phase 46V as a
  bounded, disabled-by-default, dev/operator-only, **non-production** Mode 1 proof; did **not** accept or
  authorize production durable storage, DB writes, migration execution, Lane-2 canonical Straylight-store
  migrations, production admission, public `remember-this`, Discord/freeform ingestion, chat-as-memory,
  Freeside integration, package exports, LLM/voice/Finn wiring, MVP 3 UI, route-contract freeze, final schema
  freeze, or operative gate #8 discharge; §16 **selected this Phase 46X lane** and explicitly stated direct
  production durable-store implementation is **not** the next lane
  (`ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md:662-758`).

### 2.2 The Mode 2 blocker, already named in the merged source and runbook

The blocker this gate decomposes is **not** newly invented here — it is stated verbatim in the merged Phase
46V source header and the runbook:

- `app/src/services/admission-wedge-spike/route-storage-spike.ts:9-15` — *"Mode 2 (durable + Lane-1 `aw_*`
  migrations) was NOT selected: the Phase 33N scope guards (tests/unit/admission-wedge-spike/
  scope-guards.test.ts) forbid any durable-write / SQL / migration token and any production-store import in the
  spike path, and the repo's global migration runner would adopt any new migration into the PRODUCTION set — so
  Mode 2 cannot be added narrowly without weakening an existing security guard."*
- `route-storage-spike.ts:40-43` — the filename note: `*-spike.ts`, deliberately **not** `*-store.ts`, because
  the Phase 33N guards reject any spike-path import specifier matching `/-store(\.js)?$/` as a forbidden
  production-storage import.
- `docs/admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md` "Why Mode 1 was correct" (§ near line 364) —
  Mode 2 cannot be added narrowly without weakening an existing security guard.

### 2.3 Migration runner, scope guards, durable-store design chain, no-leak parity

- Migration runner: `app/src/db/migrate.ts` (254 lines); build packager `app/scripts/copy-migrations.mjs`;
  shared dir `app/src/db/migrations/` (003–015 + `_down` files). See §5.
- Scope guards: `app/tests/unit/admission-wedge-spike/scope-guards.test.ts` (364 lines). See §6.
- Durable-store design chain: Phase 46S design (`ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md`,
  13 `aw_*` tables across 11 subsections, draft / non-final), Phase 46T acceptance
  (`ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md`, bounded), Phase 46K readiness
  decomposition, Phase 46M Candidate D (proposal input), Phase 46N gate #8 bounded paper clearing. See §11.
- No-leak / public-private boundary: `no-leak.ts` `FORBIDDEN_PUBLIC_KEYS` (114 keys) at 114 = 114 parity with
  the route-contract validator; five route-vector JSONs; 44/44 self-check. See §12.

> **Grounding note.** This gate relies on actual repo evidence above, not only on the launching prompt. Two
> figures were re-confirmed by direct count during authoring to avoid drift: the Phase 33N
> `DURABLE_WRITE_DENYLIST` contains **19** entries (`scope-guards.test.ts:122-142`), and Phase 46S defines
> **13** `aw_*` tables across **11** subsections (`§6.1`–`§6.11`), consistent with the 46W §0 / 46U memory
> notes.

---

## 3. The Mode 2 blocker (precise statement)

The Mode 2 enablement blocker is a **conjunction of two independently-true facts** about the current repo. A
durable Mode 2 spike would need to add at least one `aw_*` migration (to create the durable `aw_*` tables Phase
46S designed) **and** execute durable writes from the spike surface — and **both** of those collide with an
existing security boundary:

1. **The global migration runner adopts any new migration into the production migration set.**
   `discoverMigrations()` in `app/src/db/migrate.ts:76-85` calls `readdir(MIGRATIONS_DIR)` over the single
   shared directory `app/src/db/migrations/` (resolved at `migrate.ts:23`) and filters to **every** file that
   `endsWith('.sql') && !f.includes('_down')` (`migrate.ts:79`), sorted by leading numeric prefix
   (`migrate.ts:80-84`). `migrate()` then applies **every** discovered file in order (`migrate.ts:199-240`),
   tracking each in the `_migrations` table (`migrate.ts:47-54`). There is **no** environment branch,
   allowlist, blocklist, category, or naming convention (other than `_down`) that would exclude a file from
   this set.

2. **The migration runner runs in production, gated only on a DB pool being configured.** `server.ts:299-301`
   calls `await migrate(dbPool)` inside the startup `ready` promise **whenever `dbPool` is non-null**, with
   **no** `NODE_ENV`, dev/operator, or feature-flag gate around the call. Therefore **any** new `aw_*.sql` file
   placed in the shared directory would be executed at the next production start.

3. **The Phase 33N scope guards forbid any durable-write / SQL / migration token and any production-store
   import on the spike surface.** `scope-guards.test.ts:36` defines `SPIKE_FILES` = every `.ts` under
   `app/src/services/admission-wedge-spike/` (recursive `walkTs`, `scope-guards.test.ts:25-34`) **plus**
   `app/src/routes/admission-intake.ts`. The `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`, **19**
   entries) forbids `INSERT`, `INSERT INTO`, `UPDATE`, `DELETE`, `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`,
   `pool.query`, `.query(`, `query(`, `.execute(`, `execute(`, the `sql\`` tagged template, `db.`, `database`,
   `pg`, `postgres`, `migration`, and `migrate` (after parser-backed comment stripping, `scope-guards.test.ts:
   78-118`). The forbidden-import test (`scope-guards.test.ts:185-198`) additionally rejects a bare `pg`
   import, `/db/(client|pool|migrate|transaction)`, `/db/migrations/`, any `/-store(\.js)?$/` specifier, and
   `BoundedEstateStore` / `bounded-estate-store`.

4. **These guards are a security boundary for the disabled-by-default spike surface.** They are the
   source-tree invariant that proves the dev/operator-only spike "opens **NO** database connection, **NO** file
   handle … performs **NO** durable write and **NO** migration" (`route-storage-spike.ts:29-35`). Weakening
   them to admit a durable Mode 2 token would reduce the posture that currently makes the spike provably
   non-durable.

5. **Adding a durable migration without weakening the guard may be impossible under the current guard design.**
   The guard scans the **whole** `admission-wedge-spike` service directory recursively (`scope-guards.test.ts:
   36`); any durable-write code placed *inside* that directory trips the denylist, and any `import` of the DB
   client / migration runner / a `-store` module trips the import guard. So a durable Mode 2 implemented *on
   the current spike surface* necessarily weakens the guard.

6. **Therefore Mode 2 cannot be added safely until the migration/storage boundary is decomposed** into (a) a
   migration **classification / isolation** model that keeps a dev/operator-only migration out of the
   production migration set, and (b) a **replacement guard model** that permits only a narrow, route-owned,
   dev-only durable surface while continuing to block raw SQL, production storage, and unsafe imports
   everywhere else. Designing those is the §8 next lane; doing them is **not** authorized here.

---

## 4. Mode 1 vs Mode 2 distinction

| Axis | **Mode 1 (already accepted, Phase 46V / 46W)** | **Mode 2 (NOT implemented; blocked)** |
|------|-----------------------------------------------|---------------------------------------|
| Migration | **none** | likely **one or more `aw_*` migrations** to create durable tables (46S §6) |
| Storage substrate | in-process JS `Map` state in a factory closure | durable, route-owned DB-backed storage |
| Persistence | persists **nothing**; process restart = full reset (`route-storage-spike.ts:29-35`) | persists rows across restarts |
| DB writes | **none** | DB writes under dev/operator gates |
| SQL / executable schema | **none** | SQL DDL/DML and executable schema |
| Surface | route-owned spike module + route handler | route-owned durable storage (placement TBD — §6 / §7) |
| Scope-guard relationship | **passes** the Phase 33N guards unchanged (`scope-guards.test.ts:200-228`) | **trips** the current guards unless the boundary is redesigned |
| Migration-runner relationship | invisible to `migrate()` (adds no file) | a new `aw_*.sql` would be **adopted into the production set** today (§3 / §5) |
| Authorization scope | dev/operator-only, disabled-by-default, **non-production** | must stay dev/operator-only, disabled-by-default, **non-production**; must **not** become Lane-2 canonical Straylight-store migration; must **not** become production durable-store implementation; must **not** weaken a guard without a replacement model |
| Status | **ACCEPTED** as bounded proof (46W Verdict A) | **BLOCKED** — decomposed here, not authorized |

Mode 1's defining property — that it persists nothing and adds no migration — is exactly what let it pass the
two boundaries that block Mode 2. Mode 2's defining property — durability — is exactly what collides with them.
This gate decomposes that collision; it does not resolve it by implementation.

---

## 5. Migration runner analysis

**Read-only. No migration code is modified, and no migration file is added.**

- **Where migrations live.** A single shared directory `app/src/db/migrations/`, resolved relative to the
  compiled runner via `import.meta.url` (`migrate.ts:22-23`). At runtime the compiled `dist/db/migrate.js`
  scans `dist/db/migrations/`, populated by the build packager (`copy-migrations.mjs:22-24`). Current contents:
  `003`–`015` plus `_down` rollback files (e.g. `013_..._down.sql`, `014_..._down.sql`, `015_..._down.sql`).
  **No `aw_*` migration exists today.**
- **How migrations are discovered.** `discoverMigrations()` (`migrate.ts:76-85`) does `readdir(MIGRATIONS_DIR)`
  and returns **every** file matching `f.endsWith('.sql') && !f.includes('_down')` (`migrate.ts:79`), sorted by
  the leading integer prefix (`migrate.ts:80-84`). It is a **scan-the-whole-directory** discovery: there is no
  manifest, allowlist, or per-file opt-in.
- **Can it distinguish dev/operator-only from production migrations today?** **No.** The only file-level
  distinction the runner makes is the `_down` suffix (rollback files are excluded from forward application,
  `migrate.ts:79`). There is **no** category, prefix-based exclusion, environment field, or separate
  dev/operator directory.
- **Is there an opt-in / disabled-by-default migration category?** **No.** Every non-`_down` `.sql` file in the
  directory is a forward migration that `migrate()` will apply (`migrate.ts:199-240`).
- **Is migration execution environment-gated?** **No environment gate exists in the runner.** `migrate()`
  itself has no `NODE_ENV` branch (`migrate.ts:140-254`), and its sole caller `server.ts:299-301` invokes it
  whenever `dbPool` is non-null, with no environment / feature-flag condition. The DB pool is created when a
  database URL is configured; once it is, migrations run in **every** environment identically.
- **Would adding an `aw_*` migration today be included in normal execution?** **Yes.** A new
  `app/src/db/migrations/0NN_aw_*.sql` would be copied to `dist/` by `copy-migrations.mjs:38-40` (which filters
  only on `.sql`), discovered by `discoverMigrations()`, sorted into order, applied by `migrate()`, and
  recorded in `_migrations`. It would enter the **production** migration set with no further action. This is
  the first conjunct of the §3 blocker.
- **`_down` / down-migration handling.** The runner is **forward-only** (`migrate.ts:1-13`); `_down` files are
  excluded from discovery (`migrate.ts:79`) and exist only as rollback resources, not auto-applied. Any Mode 2
  proposal that wishes to be reversible must design its own down/drop-empty-table path **and** the operational
  procedure to run it (the runner will not run it automatically).
- **Applied-tracking mechanism.** `_migrations` table (`migrate.ts:47-54`): `(id SERIAL PRIMARY KEY, filename
  TEXT NOT NULL UNIQUE, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`. There is **no
  environment column** — the table cannot today record "this migration is dev-only." Concurrency is guarded by
  a Postgres advisory lock (`migrate.ts:153-167`); checksum mismatch warns on a changed already-applied file
  (`migrate.ts:203-210`).
- **What would minimally need to change before a dev/operator-only migration could be safe?** *(Design
  observation only — not authorized or implemented here.)* At least one of: (i) a **separate dev/operator-only
  migration directory** the production runner never scans; (ii) a **naming-convention exclusion** in
  `discoverMigrations()` (e.g. skip an `aw_*` / `dev_*` prefix) *plus* a separate dev-only runner that opts
  those back in under an explicit dev/operator env gate; (iii) a **manifest / allowlist** distinguishing
  production from dev migrations; or (iv) an **environment-gated category** recorded in `_migrations`. **Each
  of these is a production-runner change with its own security review and is out of scope for Phase 46X** —
  it is precisely what the §8 design lane must specify before any authorization.

---

## 6. Scope guard analysis

**Read-only. No guard or test is modified, and no guard is weakened.**

- **Which files are scanned.** `SPIKE_FILES` (`scope-guards.test.ts:36`) = every `.ts` file found by recursive
  `walkTs(SPIKE_SERVICE_DIR)` over `app/src/services/admission-wedge-spike/` (`scope-guards.test.ts:22`,
  `25-34`) **plus** `app/src/routes/admission-intake.ts` (`scope-guards.test.ts:23`). The guard asserts at
  least five files are present (`scope-guards.test.ts:163`).
- **Which tokens are forbidden.** The `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`) — **19**
  entries — forbids, in executable source (after comment stripping): `INSERT`, `INSERT INTO`, `UPDATE`,
  `DELETE`, `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `pool.query`, `.query(`, `query(`, `.execute(`,
  `execute(`, the `sql\`` tagged template, `db.`, `database`, `pg`, `postgres`, `migration`, and `migrate`
  (`scope-guards.test.ts:200-228` applies the denylist to every spike file).
- **Whether durable-write / SQL / migration / DB tokens are forbidden.** **Yes** — explicitly: the SQL DML/DDL
  family, the query/execute execution methods, the `sql\`` template, and the `migration` / `migrate` /
  `pg` / `postgres` / `database` / `db.` storage family are all on the denylist.
- **Whether imports like `pg`, `/db/migrations/`, or store specifiers are forbidden.** **Yes** —
  `scope-guards.test.ts:185-198` rejects a bare `pg` import, `/db/(client|pool|migrate|transaction)`,
  `/db/migrations/`, any `/-store(\.js)?$/` specifier (the reason the spike file is named `*-spike.ts`, not
  `*-store.ts` — `route-storage-spike.ts:40-43`), and `BoundedEstateStore` / `bounded-estate-store`. The guard
  also forbids any Freeside import (`scope-guards.test.ts:169-175`) and any `@loa/straylight` import
  (`scope-guards.test.ts:177-183`).
- **Whether the guard is syntax-aware or text-based.** **Syntax-aware.** `stripComments()`
  (`scope-guards.test.ts:78-118`) uses the TypeScript parser (`ts.createSourceFile`) to keep only executable
  leaf-token source ranges, blanking comment trivia and JSDoc — so a durable-write token cannot be hidden in a
  string, a nested template substitution `${\`//\`}`, or a regex literal `/[//]/`, and the guard does **not**
  false-positive on the spike's own prose (which legitimately says "no database writes, no migrations"). A
  regression suite (`scope-guards.test.ts:231-313`) proves both directions.
- **Why weakening it would be risky.** The guard is the *only* source-tree proof that the disabled-by-default
  spike surface performs no durable write and imports no production storage. Removing or loosening a denylist
  entry (or the import guard) would silently re-open the exact capability — durable writes, DB-client imports,
  migration references — that the spike is required to lack. Because the guard is a single binary gate over the
  whole spike directory, a blanket relaxation would relax it for **every** spike file, not just a narrow
  durable module.
- **Whether an exception mechanism exists.** **No.** The guard is binary: any denylist or import match fails
  the test. There is no per-file opt-out, suppression comment, or allowlist. A Mode 2 path therefore cannot
  "annotate around" the guard; it must either move durable code **off** the scanned surface or introduce a
  **new, narrower** guard model.
- **What any future Mode 2 path would require.** *(Design observation only — not authorized here.)* At least
  one of: (i) a **new isolated scope-guard category** that distinguishes a narrow durable module from the rest
  of the spike surface; (ii) a **separate storage module outside the guarded spike directory**, with its own
  dedicated guard rather than the spike's blanket denylist; (iii) a **docs-only exception gate** that records
  precisely which token(s) on which file(s) are permitted and why, with a compensating proof; and/or (iv) a
  **new static guard that permits only narrow route-owned durable storage** while continuing to block
  production storage, raw SQL, and unsafe imports elsewhere. **Designing the replacement guard model is the §8
  next lane; weakening or editing any guard is forbidden in this phase.**

---

## 7. Candidate decomposition options

Each option is **enumerated and evaluated**, not implemented. For each: what it would authorize, what it would
still block, risks, evidence needed, and selected/rejected.

### Option A — Keep Mode 2 blocked; continue Mode 1 only.

- **Would authorize.** Nothing new. The accepted Mode 1 spike (46W) remains the only authorized route-storage
  surface; optional later Mode 1 smoke/runbook verification stays available.
- **Still blocks.** All of Mode 2, durable storage, migrations, DB writes, Lane-2 canonical migrations,
  production admission.
- **Risks.** Low. Does not advance the durable design question — but the durable design is already partly
  carried by 46S/46T/46K, so "keep blocked" loses no ground.
- **Evidence needed.** None beyond what exists.
- **Verdict.** **Partially adopted as the standing posture** (Mode 2 stays blocked) but **not selected as the
  forward lane** — it advances nothing, and §8 prefers a docs-only design lane that maps the path without
  authorizing it.

### Option B — Future docs-only Mode 2 **design** gate (separate dev/operator migration category + guard model).

- **Would authorize.** A **docs/decision-only** lane to specify a safe Mode 2 path: a migration
  classification / isolation model (so a dev/operator-only migration cannot enter the production set) **and** a
  replacement scope-guard model (permitting only a narrow route-owned durable surface). Authorizes **no**
  implementation.
- **Still blocks.** Mode 2 implementation, migrations, DB writes, production durable storage, Lane-2 canonical
  migrations, guard edits.
- **Risks.** Low — it is paper only. Risk is purely that the design might conclude "no safe path exists without
  a production-runner change," which is itself a valid, useful output.
- **Evidence needed.** The §5 / §6 analysis (already in hand) plus the §9 future-evidence list as the design's
  acceptance bar.
- **Verdict.** **SELECTED as the next lane (§8 / §16).** It is the smallest step that converts the §3 blocker
  into a concrete, reviewable design without authorizing or implementing anything.

### Option C — Future **guard-refinement** gate (narrow exception mechanism for Lane-1 route-owned `aw_*` storage).

- **Would authorize.** A docs/decision-only lane that designs a **narrow exception** permitting only Lane-1
  route-owned `aw_*` storage on a dedicated module, while still blocking production DB writes and Lane-2
  canonical Straylight-store migrations.
- **Still blocks.** Everything Option B blocks; additionally it does **not** itself implement or edit any
  guard.
- **Risks.** Medium. A guard exception is the single highest-leverage security change in the whole
  decomposition; getting the exception too wide silently re-opens the durable-write surface. It should be
  designed **inside** Option B (as a sub-section), not as a standalone first lane that prejudges the migration
  side.
- **Evidence needed.** A precise, minimal token/file allowlist with a compensating proof; the §9 guard-model
  item.
- **Verdict.** **Folded into Option B** (the §8 lane scopes the guard-refinement design as a sub-decomposition,
  not as a separate earlier gate). Not selected standalone.

### Option D — Future **no-migration durable substitute** (bounded local file / JSONL).

- **Would authorize.** Investigating a durable-but-no-migration substrate (e.g. a bounded local file / JSONL)
  to sidestep the migration-runner conjunct.
- **Still blocks.** Production storage; canonical migrations.
- **Risks.** **High / likely-disqualifying.** (i) The Phase 33N guard forbids file-handle / storage tokens and
  the spike's own invariant is "**NO** file handle" (`route-storage-spike.ts:29-35`), so a file substrate trips
  the same boundary from the other side. (ii) A local file is **not** durable across replicas and is **not**
  the canonical substrate; it would be a second, divergent store. (iii) It risks creating an un-audited
  persistence surface. **Treated cautiously and not preferred.**
- **Evidence needed.** Proof it violates no no-file / no-production constraint and is explicitly non-production
  — a high bar this gate does not clear.
- **Verdict.** **REJECTED as a forward lane.** May be *mentioned* by the Option B design as a considered
  alternative, but it is not selected.

### Option E — Defer Mode 2 until production durable-store architecture + ADR-022E / Straylight-side gates resolve.

- **Would authorize.** Nothing now; Mode 2 deferred behind the operative Straylight-side gate #8 discharge and
  the production durable-store architecture (Candidate D, 46M; gate #8, 46N).
- **Still blocks.** Mode 2 and all production durable work.
- **Risks.** Low, but it over-defers: the §8 design lane is safe to run **now** (it is paper) and produces
  value (a mapped path) without waiting on Straylight.
- **Verdict.** **Partially adopted** — the **production** and **Lane-2** parts of Mode 2 genuinely stay
  deferred behind gate #8 (§11) — but **not selected as the whole posture**: the dev/operator Lane-1 design
  question (Option B) can and should be decomposed on paper before that deferral resolves.

### Option F — Authorize immediate Mode 2 implementation.

- **Would authorize.** Mode 2 durable implementation now.
- **Risks.** **Disqualifying.** The §3 blocker is unresolved; implementing Mode 2 today would require weakening
  a security guard (§6) and/or risk adopting a migration into the production set (§5). 46W §16 and §17.2
  explicitly state direct production durable-store implementation is **not** the next lane.
- **Verdict.** **REJECTED.** No repo evidence supports it; it is forbidden by this gate's scope and by 46W.

---

## 8. Recommended path

> **Selected next lane: Phase 46Y — Admission Wedge Mode 2 migration-isolation / scope-guard boundary **design**
> gate (docs / decision-only).**

Phase 46Y (Option B, with Option C folded in as a sub-decomposition) is the smallest safe forward step. It is
**docs / decision-only**: it specifies, on paper, (a) a **migration classification / isolation model** that
would keep a dev/operator-only `aw_*` migration out of the production migration set
(`migrate.ts:76-85` / `server.ts:299-301`), and (b) a **replacement scope-guard model** that would permit only
a narrow, route-owned, dev-only durable surface while continuing to block raw SQL, production storage, and
unsafe imports everywhere else (`scope-guards.test.ts:122-198`). Its acceptance bar is the §9 required-future-
evidence set. It authorizes, implements, and edits **nothing**; it preserves every §14 block. Only **after**
Phase 46Y is itself accepted could a *separate* authorization gate (Verdict-C-style) be considered, and only
after **that** an implementation lane.

**Not selected as primary, and why:**

- **Direct production durable-store implementation** — forbidden (§14); explicitly not the next lane (46W §16).
- **Mode 2 implementation now (Option F)** — rejected (§7); the blocker is unresolved.
- **Mode 1 operational smoke/runbook verification** — available as a *later optional* run-only lane (the merged
  spike is already green, 46W §18), but it adds operational confirmation, not decomposition value, so it is not
  the primary next lane.
- **A standalone guard-refinement gate (Option C)** — folded into Phase 46Y rather than run first, so the
  migration-isolation and guard-model designs are decided together and the guard exception is not designed in
  isolation.

---

## 9. Required future evidence before Mode 2 authorization

Mode 2 implementation may **not** be authorized until **all** of the following are proven (this is the
acceptance bar for the §8 design lane and any later authorization gate):

1. **Safe migration classification / isolation model** — a concrete mechanism (separate dev-only directory,
   naming-convention exclusion + dev-only runner, manifest/allowlist, or env-gated category) that keeps a
   dev/operator-only migration out of the production set.
2. **Proof that dev/operator-only migrations cannot enter production migration execution accidentally** —
   demonstrated against the actual discovery + execution path (`migrate.ts:76-85`, `199-240`;
   `server.ts:299-301`; `copy-migrations.mjs:38-40`), including the build-copy step.
3. **Proof that production DB writes remain blocked** — the dev/operator gate is never satisfied in production
   and there is no production fallback (mirrors the Phase 46V AND-gated, disabled-by-default posture).
4. **Proof that Lane-2 canonical Straylight-store migrations remain blocked** — no Dixie migration authority
   over canonical `Assertion` / `TransitionReceipt` / `AuditEvent` records; each canonical migration stays a
   separate sibling-repo ADR under Straylight teammate review (ADR-022D §7; 46N).
5. **A guard model that permits only narrow route-owned durable storage** while continuing to block raw SQL,
   production storage, and unsafe imports — replacing, not weakening, the current Phase 33N blanket guard, with
   the new guard proven against the same evasion-resistance bar (`scope-guards.test.ts:231-313`).
6. **Default-off and AND-gated route-storage behavior preserved** — Mode 2 must engage from neither the base
   route gate nor the storage gate alone, disabled by default, no production fallback (as Phase 46V).
7. **A rollback / down-migration / removal plan** — including drop-empty-table semantics and the operational
   procedure (the forward-only runner will not auto-run a down file, `migrate.ts:79`).
8. **A no-leak proof for persisted / replayed responses** — persisted and replayed public responses pass the
   114-key runtime guard exactly like a fresh response; the public body does not expand without a separate
   no-leak proof (§12).
9. **Idempotency / replay / conflict tests**, **tenant / estate / actor isolation tests**, and **failure /
   partial-write tests** for the durable substrate.
10. **Capacity / retention bounds** for the durable store, and **runbook / rollback docs**.
11. **A Codex audit before implementation** (mirroring the Phase 46V Codex patch-and-re-audit discipline; 46U
    §6 / §7 conditioned Mode 2 on "a separate Codex audit").

Until every item is proven and separately accepted, Mode 2 stays blocked.

---

## 10. Production boundary

Phase 46X preserves and restates the production boundary unchanged:

- Phase 46X does **not** authorize production durable-store implementation.
- Phase 46X does **not** authorize production DB writes.
- Phase 46X does **not** authorize production migration execution.
- Phase 46X does **not** authorize production admission.
- Phase 46X does **not** authorize production auth / consent.
- Phase 46X does **not** authorize Lane-2 canonical Straylight-store migrations.
- Phase 46X does **not** authorize a route-contract freeze.
- Phase 46X does **not** authorize a final schema freeze.
- Phase 46X does **not** claim production readiness.
- Phase 46X does **not** claim or discharge the operative Straylight-side ADR-022E gate #8.

---

## 11. Candidate D / ADR-022E boundary

- **Candidate D remains proposal input / design baseline, not implemented production architecture.** Phase 46M
  selected Candidate D (split-storage: Dixie route-side adapter + Straylight canonical ownership) as
  proposal-input for a future gate #8 clearing; it "authorizes no runtime work and clears no gate."
- **Dixie route-side route-owned storage is not canonical Straylight storage.** Dixie owns endpoint-local
  contract / idempotency / replay records, ingress references, and public/private projection only — never a
  parallel canonical lifecycle (46S §4.1–§4.3; 46M §6.3).
- **Canonical Straylight semantics / interfaces / invariants remain preserved.** The canonical `active`
  `Assertion`, `TransitionReceipt`, and append-only hash-chained `AuditEvent` remain Straylight-owned; the
  `StorageAdapter` interface and canonical field shapes are cross-repo references, not Dixie artifacts.
- **Phase 46N gate #8 clearing remains a bounded Dixie documentation / architecture / handoff prerequisite
  only.** 46N §4.7: *"A Dixie docs-only, un-PR'd, un-reviewed phase cannot, by itself, discharge that operative
  Straylight-side gate."*
- **Operative Straylight-side production gate discharge remains blocked** unless separately evidenced in the
  repo (no such accepted evidence exists at authoring time).
- **Lane-2 canonical Straylight-store migrations remain blocked** — each is a separate sibling-repo ADR under
  Straylight teammate review (ADR-022D §7).

---

## 12. No-leak and public/private boundary

Phase 46X preserves the no-leak / public-private boundary unchanged:

- The **public response body must not expand without a separate no-leak proof.** The Phase 46V public-response
  builder emits a fixed 8-field allowlist; the runtime `no-leak.ts` guard mirrors the validator at **114 = 114**
  key parity (Phases 46O / 46P / 46Q).
- **Persisted / replayed responses must pass the no-leak guard** — a future durable Mode 2 must deep-walk
  persisted and replayed public responses exactly like a fresh one (§9 item 8).
- **Private storage / audit / source / debug / auth / signer / consent internals remain private** — store
  results are discarded and never serialized in Mode 1; any Mode 2 must hold the same line.
- **Public `remember-this` remains blocked.** **Discord / freeform ingestion remains blocked.** **Chat-as-
  memory remains blocked.**
- **Source-real public `outcome_class` values remain:** `accepted_as_proposed`, `admitted`, `denied`,
  `superseded_with_correction`, `refused` (the five route-vector JSONs; `classifier.ts:94-99`).
- **`active` remains the canonical assertion status, not a public `outcome_class`** — the public label
  `admitted` and the canonical status `active` are never conflated.
- **`recall_eligible` remains derived / projection-only** — computed at read time, never persisted as canonical
  authority — unless separately accepted.

---

## 13. Auth / consent boundary

Phase 46X preserves the auth / consent boundary unchanged:

- The current dev/operator **service-token / operator** model is **not** production auth / consent.
- **Service auth and end-user authorization remain separate.**
- The **production consent model remains future-gated.**
- **Missing / invalid consent fails closed** in any future production model; service-token / operator auth is
  never treated as consent.
- **Public `remember-this` remains blocked.** **Discord / freeform ingestion remains blocked.** **Chat-as-
  memory remains blocked.**

---

## 14. Remaining blockers

Regardless of verdict, the following remain **blocked** after Phase 46X:

- **Mode 2 implementation** — not selected for any implementation lane by this phase; only a docs-only design
  lane (Phase 46Y) is selected (§8);
- production durable-store implementation;
- production DB writes;
- production migration execution;
- Lane-2 canonical Straylight-store migrations;
- production admission;
- public `remember-this`;
- Discord / freeform ingestion;
- user chat becoming memory merely because it was said;
- Freeside runtime / client integration;
- package exports (unless separately justified and audited);
- LLM / voice / Finn wiring;
- MVP 3 forget / revoke / correction UI;
- route-contract freeze;
- final schema freeze;
- production readiness;
- operative Straylight-side ADR-022E gate #8 discharge (unless separately evidenced).

---

## 15. Non-authorizations and invariants

Phase 46X preserves all of the following:

- **A pending candidate is not recallable.**
- **A rejected candidate creates no admitted assertion.**
- **An accepted candidate creates / references an admitted assertion.**
- **A superseded assertion is excluded from ordinary recall** unless explicitly requested / marked.
- **A malformed / unsafe payload fails closed.**
- **Missing / unauthorized auth fails closed.**
- **Missing / invalid consent fails closed** in any future production admission model.
- **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
  material.**
- **Private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private.**
- **User chat does not become memory merely because it was said.**
- **Public `remember-this` remains blocked.**
- **Discord / freeform history ingestion remains blocked.**
- **Production admission / storage / auth / consent remain blocked.**
- **Route-contract freeze and final schema freeze remain blocked** unless separately authorized.

Phase 46X authorizes nothing beyond decomposing the Mode 2 blocker and selecting a docs-only design lane. It
explicitly does **not** authorize, and is **not** to be read as authorizing, Mode 2 implementation, production
durable-store implementation, production DB writes, production migration execution, Lane-2 canonical
Straylight-store migrations, or the discharge of the operative Straylight-side ADR-022E gate #8.

---

## 16. Next lane

> **Selected next lane: Phase 46Y — Admission Wedge Mode 2 migration-isolation / scope-guard boundary **design**
> gate (docs / decision-only).**

> **Phase 46Y status note (added later).** Phase 46Y
> ([`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md),
> docs/decision-only) executed this lane and reached **Verdict A — the migration-isolation / scope-guard
> boundary design is accepted as a docs-only precondition; Mode 2 implementation remains BLOCKED pending a
> later authorization gate.** It designed, on paper, the four-class migration classification model (P / E / T /
> C), the migration-isolation requirements, the route-owned storage boundary model, and the refined /
> replacement scope-guard model the §9 evidence set requires, and selected only a **docs/decision-only Phase
> 46Z Mode 2 implementation-authorization checklist lane** next. It authorizes **no** Mode 2 implementation,
> durable storage, migration, production DB write, or migration execution, and it edits no guard or runner.

This is a **docs / decision-only** design lane (§8): it specifies, on paper, the migration classification /
isolation model and the replacement scope-guard model that the §9 evidence set requires, with §9 as its
acceptance bar. It implements no store, writes no DB, adds no migration, creates no SQL or executable schema,
edits no guard, changes no route / API behavior, and freezes nothing.

**Not selected:** direct production implementation; production durable-store implementation; production DB
writes or migration execution; Mode 2 implementation (the blocker is **not** resolved by this gate's evidence —
§3 / §7). A later **bounded implementation authorization gate** (Verdict-C-style) and an implementation lane
remain possible only **after** Phase 46Y is accepted and the §9 evidence is proven.

---

## 17. Optional status notes (immediate predecessors)

To preserve traceability without drift, this gate adds a single minimal cross-reference status note to each of
its two immediate predecessors:

- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md)
  — Phase 46W (PR #168), the **selecting predecessor**: §16 selected this lane. **Gains a minimal Phase 46X
  status note.**
- [`docs/admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md)
  — Phase 46V (PR #167), the **implementation** whose source header names the blocker (`route-storage-spike.ts:
  9-15`). **Gains a minimal Phase 46X status note.**

No other document is modified.

---

## 18. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`) unless noted.
Phase 46X is docs/decision-only — it adds only this document (plus the two minimal cross-reference status notes
in §17) and mutates no runtime source, test, validator, vector, fixture, migration, or SQL file — so the
validators are run only to confirm the unchanged docs artifacts remain green.

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
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md
```

**Recorded results for this lane** (run during authoring):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md` is added, plus the two minimal
  cross-reference status notes (§17); no runtime source (and specifically not `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql`, `route-storage-spike.ts`, `no-leak.ts`, `config.ts`, `admission-intake.ts`,
  `server.ts`, or `scope-guards.test.ts`), no runtime test, no route-vector JSON, validator, README, fixture,
  fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, SQL, executable
  schema, or generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth
  vector**; the `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail
  closed; 2 exact-key non-over-match guards stay clean);
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–20 exactly once
  each.

*(The full recorded command output accompanies this lane's operator run report.)*

---

## 19. Corruption / duplicate guard

Phase 46X applies an explicit corruption / duplicate guard to **this** document (carried from the Phase
46I–46W precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 20.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is the §18
  validation command list. **No fenced block is an executable migration or runnable schema.**

---

## 20. Cross-references

- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md)
  — Phase 46W (PR #168); the **selecting predecessor** — its §16 named this lane and its §17 invariants are
  carried forward. **Gains a minimal Phase 46X status note (§17).**
- [`docs/admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md)
  — Phase 46V (PR #167); the implementation whose source header (`route-storage-spike.ts:9-15`) and "Why Mode 1
  was correct" section name the blocker this gate decomposes. **Gains a minimal Phase 46X status note (§17).**
- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md)
  — Phase 46U (PR #166); the **authorizing** predecessor — its §6 / §7 preferred Mode 1 and conditionally
  authorized Mode 2 "subject to a separate Codex audit," the condition §9 carries forward. **Not modified.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md)
  and [`docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md)
  — Phases 46T / 46S (PR #165 / #164); the accepted **draft** durable-store schema / migration design (13
  `aw_*` tables across 11 subsections; `schema_final` / `route_contract_final` false) the §8 design lane would
  reference. **Not modified.**
- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md)
  and [`docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md)
  — Phase 46N gate #8 bounded paper clearing and Phase 46M Candidate D proposal input; the §11 boundary that
  keeps Lane-2 canonical migrations and the operative Straylight-side discharge blocked. **Not modified.**
- [`docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md)
  — Phases 46Q / 46P / 46O; the 114 / 114 runtime ↔ validator no-leak parity a future Mode 2 must hold over
  stored / replayed public surfaces (§12). **Not modified.**
- `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/` — the migration runner,
  build packager, and shared migration directory, inspected **read-only** to ground §3 / §5. **None is
  modified by this phase.**
- `app/tests/unit/admission-wedge-spike/scope-guards.test.ts` — the Phase 33N static scope guards, inspected
  **read-only** to ground §3 / §6. **Not modified.**
- `app/src/services/admission-wedge-spike/{route-storage-spike,index,no-leak}.ts`,
  `app/src/routes/admission-intake.ts`, `app/src/server.ts`, and `app/src/config.ts` — the merged Phase 46V
  implementation, inspected **read-only** to ground §3 / §4 / §12. **None is modified by this phase.**
- `docs/admission-wedge/route-contract-test-vectors/` (validator + five vector JSONs + README) and
  `docs/admission-wedge/fixtures/` (validator + fixtures) — inspected **read-only** as the unchanged 114-key /
  five-vectors / no-sixth / 44-self-check / 5-probes source of truth. **None is modified.**
- `@loa/straylight` — canonical primitive / substrate owner; the `StorageAdapter` interface and the canonical
  `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes (cross-repo references, not Dixie artifacts);
  ADR-022E durable-store gate #8 (+ sibling gates, **held operatively**) and ADR-022D receipt / audit-chain
  invariants are the decision records cited as guardrails (§11). **Not edited by this phase.**
