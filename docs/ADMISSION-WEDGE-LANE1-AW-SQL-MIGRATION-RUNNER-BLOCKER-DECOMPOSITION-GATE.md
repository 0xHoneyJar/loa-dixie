# Phase 47C — Lane-1 `aw_*` SQL durable-store / migration-runner blocker decomposition gate

> **Phase**: 47C
> **Branch context**: `phase-47c-aw-sql-migration-runner-blocker-decomposition`
> **Related**: Phase 47B (PR #173,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md))
> **accepted** the merged Phase 47A Mode 2 durable route-storage spike as a bounded, disabled-by-default,
> dev/operator-only, **non-production**, `.json`-snapshot route-storage proof (Verdict A) and §17 **selected
> this Phase 47C lane**; Phase 47A (PR #172,
> [`admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md))
> **implemented** Storage Mode 2 durability as a **file-backed `.json` snapshot store off the production
> migration path** — **no** SQL, **no** `aw_*` migration material, **no** migration-runner change, **no**
> packaging / copy-runner change, **no** production DB write, **no** production migration execution; Phase 46Z
> (PR #171,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md))
> **authorized** that spike on a hard §8–§15 checklist (acceptance-gated, mode-contingent); Phase 46Y (PR #170,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md))
> **designed** the migration-isolation / scope-guard boundary on paper (four-class P / E / T / C model); Phase
> 46X (PR #169,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the Mode 2 enablement blocker (Verdict A — Mode 2 remains BLOCKED); Phases 46V / 46W (PR #167 /
> #168) implemented and accepted the **Mode 1** in-process route-storage spike the Mode 2 store wraps; Phases
> 33Q / 33R (PR #135 / #136) implemented and accepted the bounded synthetic admitted-assertion ledger; Phases
> 33M / 33N / 33O (PR #131 / #132 / #133) authorized, implemented, and accepted the dev/operator-only route spike
> and the Phase 33N static scope guards; Phases 46S / 46T (PR #164 / #165) drafted and accepted the durable-store
> schema / migration **design** (13 `aw_*` tables across 11 subsections; `schema_final` / `route_contract_final`
> **false**); Phase 46N **cleared** ADR-022E gate #8 as a **Dixie documentation / architecture / handoff
> prerequisite only** while the operative Straylight-side discharge **remains held**; Straylight
> (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); ADR-022E durable-store gate #8 (+ sibling gates
> #9 / #10 / #11 / #12 / #15 / #20, **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only blocker-decomposition gate.** This gate adds **only this document** (plus
> two minimal forward-traceability status notes in the immediate predecessor Phase 47B acceptance gate and the
> Phase 47A runbook, §19). It modifies **no** runtime source — and specifically does **not** modify
> `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`,
> `app/src/services/admission-wedge-spike/route-storage-durable-spike.ts`, `route-storage-spike.ts`, `index.ts`,
> `no-leak.ts`, `app/src/config.ts`, `app/src/routes/admission-intake.ts`, `app/src/server.ts`, or
> `app/tests/unit/admission-wedge-spike/scope-guards.test.ts` — and changes **no** route handler, storage / store
> code, DB write, migration, SQL file, executable schema, migration runner, packaging / copy runner, scope guard,
> auth, consent, route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture
> validator, other test, package export, config, env, package, lockfile, CI, generated file, or binary. No
> adjacent repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is the Lane-1 `aw_*` SQL durable-store / migration-runner *blocker-decomposition* gate** — the docs-only
> rung Phase 47B §17 named, downstream of the Phase 47A `.json`-snapshot implementation. It **decomposes**,
> precisely and read-only, the SQL / migration-runner / packaging / scope-guard frontier that Phase 47A
> **sidestepped** by delivering durability as a `.json` file rather than as Lane-1 `aw_*` SQL. **It is not a
> spike, it authorizes no implementation, and it builds nothing.** It **adds no `aw_*` SQL, writes no DB, adds no
> migration, creates no executable schema, executes no migration, changes no migration runner or packaging /
> copy runner, weakens no scope guard, implements no auth or consent, changes no route / API behavior, freezes
> neither the route contract nor the final schema, discharges no operative Straylight-side gate, and claims no
> production readiness.** It does **not** claim that `aw_*` SQL is currently safe or authorized.

Every assessment below is grounded **read-only** against the actual Dixie repo at authoring time: the migration
runner `app/src/db/migrate.ts`, the build-asset packager `app/scripts/copy-migrations.mjs`, the shared migration
directory `app/src/db/migrations/`, the Phase 33N static scope guards
`app/tests/unit/admission-wedge-spike/scope-guards.test.ts`, the merged Phase 47A durable store
`app/src/services/admission-wedge-spike/route-storage-durable-spike.ts` and its Phase 47A isolation /
guard-refinement test evidence (`durable-migration-isolation.test.ts`, `durable-scope-guard-refinement.test.ts`),
the conditional mount + migrate call in `app/src/server.ts`, the env parsing in `app/src/config.ts`, the Phase
47A runbook, and the predecessor decision gates (47B / 46Z / 46Y / 46X / 46V / 46W / 46U / 46T / 46S / 46N).
Where a claim could not be grounded inside the read material, it is marked as such. **The canonical Straylight
`StorageAdapter` interface and the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes live
in the adjacent `loa-straylight` repository (cross-repo references, not Dixie file:line) and remain
Straylight-owned (§13).**

---

## 1. Status

Phase 47C is the bounded, docs/decision-only **Lane-1 `aw_*` SQL durable-store / migration-runner
blocker-decomposition gate** named by Phase 47B §17. Its purpose is to take the frontier the merged Phase 47A
`.json`-snapshot spike deliberately **sidestepped** — whether (and if ever, how) a dev/operator-only durable
store could use Lane-1 `aw_*` SQL given that (a) the global migration runner adopts **any** new `.sql` file in
the shared directory into the **production** migration set, (b) the production packager copies **any** `.sql`
file into the production bundle, and (c) the Phase 33N scope guards forbid every durable-write / SQL / migration
token and every production-store import on the spike surface — and **decompose it, precisely and read-only**,
into the ordered set of blockers that must be cleared before any `aw_*` SQL or migration-runner implementation
could be authorized. It then selects the next safe docs/decision-only lane and stops.

**What this phase is, stated narrowly and exactly.** Phase 47C:

- is **docs / decision-only** — it decomposes the Lane-1 `aw_*` SQL / migration-runner / packaging / scope-guard
  frontier and orders the blockers into separately-clearable future gates;
- is a **blocker-decomposition gate**, *not* an implementation, *not* the spike *authorization* checklist gate
  (46Z), *not* the migration-guard *design* gate (46Y), *not* the Mode 2 *blocker-decomposition* gate (46X —
  which decomposed the Mode 2 enablement blocker in the abstract), and *not* the durable-spike *acceptance* gate
  (47B);
- does **not** modify runtime source or tests — and specifically does not touch `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql` migration, `route-storage-durable-spike.ts`, `route-storage-spike.ts`,
  `index.ts`, `no-leak.ts`, `config.ts`, `admission-intake.ts`, `server.ts`, or `scope-guards.test.ts`;
- does **not** add `aw_*` SQL, create migrations, or create executable schema;
- does **not** execute any migration and does **not** perform any DB write;
- does **not** change the migration runner (`migrate.ts`) or the packaging / copy runner (`copy-migrations.mjs`);
- does **not** weaken, relax, edit, add, or remove any scope guard;
- does **not** change route / API behavior, and does **not** expand the public response;
- does **not** implement or unblock auth or consent;
- does **not** authorize production admission;
- does **not** freeze the route contract or the final schema;
- does **not** claim production readiness;
- does **not** claim or discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §13);
- does **not** select `aw_*` SQL implementation, migration-runner changes, packaging changes, DB writes, or
  migration execution as the next lane; it selects only a further **docs/decision-only** Phase 47D Lane-1 SQL
  isolation *design* gate (§19), which itself implements nothing;
- does **not** state, in any positive sense, that `aw_*` SQL is currently safe or authorized — it is **not**.

The load-bearing decision of this gate is **Verdict A (§18)**: the Lane-1 `aw_*` SQL / migration-runner frontier
is decomposed into the §16 required-future-evidence set and §17 candidate-pattern map, and Lane-1 SQL stays
**fully blocked**; the next lane (§19) is a docs-only design gate, not implementation.

---

## 2. Scope

**In scope (docs/decision-only).** Decomposing, read-only, the four concrete surfaces that the Phase 47A
`.json`-snapshot spike avoided rather than resolved — (1) migration discovery / adoption (`migrate.ts`), (2)
packaging / copy (`copy-migrations.mjs`), (3) runner isolation (no dev/operator-only runner exists), and (4)
the Phase 33N scope guards (`scope-guards.test.ts`) — plus the storage-semantics, public/private,
auth/consent/signer, and rollback/recovery blockers that any *eventual* `aw_*` SQL durable store would face. The
gate enumerates candidate future safe patterns (§15) **without selecting any for implementation**, records the
evidence that exists today (§5) and the evidence still missing (§16), names what must remain blocked (§20), and
selects the next docs-only lane (§19).

**Out of scope (forbidden by this gate).** Any runtime source change; any test, config/env, package/lockfile, or
CI change; any migration, SQL file, or executable schema; any migration-runner or packaging/copy-runner change;
any vector/validator/fixture change; any generated/binary file; any adjacent-repo change; any public response
expansion; a route-contract freeze; a final schema freeze; an ADR-022E gate #8 discharge; any production
durable-store implementation; any production DB write; any production migration execution; any production
readiness claim; any Freeside runtime / client integration; any Lane-2 canonical Straylight-store migration
claim; and any claim that `aw_*` SQL is currently safe or authorized. Designing or selecting an `aw_*` SQL
isolation mechanism is itself **not** in scope here — that is the §19 next lane (Phase 47D), and even it would
implement nothing.

---

## 3. Source chain

Phase 47C sits at the bottom of an explicit, PR-anchored chain. Each link is read-only input here; none is
modified except the two §19 forward-traceability status notes. PR numbers are git-sourced from merge-commit
subjects (a Dixie convention). Dixie 47-series / 46-series / 33-series phase labels and the Straylight ADR-022E
"Phase 22" labels are **independent cross-repo labels**.

| Phase | PR | Artifact / contribution (relevant to this decomposition) |
|-------|----|------|
| 33M / 33N / 33O | #131 / #132 / #133 | **Dev/operator route spike + Phase 33N static scope guards.** `POST /api/admission/intake`, disabled-by-default behind `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`, dedicated `x-admission-service-token` + `x-admission-operator-id`, runtime `no-leak.ts`; the `scope-guards.test.ts` denylist + import guards (§10). |
| 33Q / 33R | #135 / #136 | **Bounded synthetic admitted-assertion ledger.** Process-local, capacity-bounded, `(tenant_id, estate_id)`-scoped, fail-closed, synthetic-only ledger the spike wraps per synthetic actor. |
| 46V / 46W | #167 / #168 | **Mode 1 route-storage spike (implementation + acceptance).** In-process `Map` state, no migration, no SQL, no DB write; **declined Mode 2** because the only durable substrate considered was Lane-1 `aw_*` SQL, which the runner / packager / guards block. The Mode-1 engine the Mode 2 store wraps. |
| 46X | #169 | **Mode 2 enablement *blocker-decomposition* gate (docs-only).** Verdict A — Mode 2 remains BLOCKED; the blocker (the runner adopting any new migration into the production set + the Phase 33N guards forbidding durable-write / SQL / migration tokens) decomposed into required future gates. |
| 46Y | #170 | **Mode 2 migration-guard / scope-guard boundary *design* gate (docs-only).** Designed, on paper, the four-class migration model (P / E / T / C) and the refined / replacement scope-guard model. |
| 46Z | #171 | **Mode 2 implementation-authorization *checklist* gate (docs-only).** Verdict A — converted the 46Y design into a hard, file:line-grounded checklist (§8 migration isolation A.1–A.7; §9 scope guards B.1–B.9; §10 gate conjunction; §11 storage; §12 no-leak) and authorized a **separate-PR**, bounded, dev/operator-only, disabled-by-default, non-production Mode 2 spike, **acceptance-gated** and **mode-contingent**. |
| 47A | #172 | **Dev/operator durable (Mode 2) route-storage spike (implementation).** Implemented Mode 2 durability as a `.json`-snapshot **file** store (`route-storage-durable-spike.ts`) **off the production migration path** — wrapping the Mode-1 engine, atomic temp+rename rewrite, hydrate-on-construction replay, bounded cap, reversible purge, strict hydrate exactness — wired behind a third draft gate + an explicit operator dir. **No SQL, no `aw_*` migration, no runner / packager change, no DB write.** |
| 47B | #173 | **Durable-spike acceptance gate (docs-only).** Verdict A — accepted Phase 47A as a bounded dev/operator Mode 2 durable `.json` proof; recorded that the spike **delivered durability by sidestepping** the Lane-1 `aw_*` SQL / migration-runner frontier (§5 of 47B), not by resolving it; selected **this Phase 47C lane**. |
| **47C** | *(this doc; docs/decision-only — not committed / merged yet)* | **Lane-1 `aw_*` SQL durable-store / migration-runner blocker-decomposition gate — decomposes the SQL / runner / packaging / guard frontier 47A sidestepped; keeps Lane-1 SQL fully blocked; selects Phase 47D.** |
| 46S / 46T | #164 / #165 | **Durable-store schema / migration *design* (draft) + acceptance.** 13 `aw_*` tables across 11 subsections; `schema_final` / `route_contract_final` **false**. The `aw_*` table set §11 refers to as a paper draft, not a frozen schema. |
| 46N / 46M | (gate #8 re-authored clearing ADR / Candidate D) | **Gate #8 bounded paper clearing** (Dixie docs/arch/handoff prerequisite only; operative Straylight-side discharge held) and **Candidate D** (split-storage) proposal input (§14). |
| 46O / 46P / 46Q | #160 / #161 / #162 | **Runtime no-leak mirror** at **114 = 114** parity — the boundary any future SQL-backed store must hold over persisted / replayed public surfaces (§12). |

---

## 4. What Phase 47A proved

Grounded read-only against the merged Phase 47A source and confirmed by its passing test suites (per 47B §3,
§20). Phase 47A proved these properties **for a disabled-by-default, dev/operator-only, NON-PRODUCTION, Mode 2
durable `.json`-snapshot route-storage spike** — nothing more:

- **Durability across a process-restart analogue** — a second store over the same dir hydrates the prior
  synthetic state by replaying the snapshot's ordered entries through a fresh Mode-1 engine
  (`route-storage-durable-spike.ts` hydrate path). This is the defining Mode-2 property Mode 1 lacked.
- **Durability without SQL, without `aw_*` schema, without a DB** — the store imports only `node:fs` / `node:path`
  (+ two sibling spike modules), opens no DB connection, and persists only a `.json` snapshot
  (`durable-migration-isolation.test.ts:166-195`). A non-`.json` file name fails closed at construction.
- **The production migration runner / packager cannot adopt the artifact** — the production discovery predicate
  (`f.endsWith('.sql') && !f.includes('_down')`, `migrate.ts:79`) and the packager copy filter
  (`e.name.endsWith('.sql')`, `copy-migrations.mjs:39`) both reject a `.json` artifact; there is no `aw_*` SQL in
  the shared dir; the ungated startup `migrate(dbPool)` call is unchanged and the spike adds no second runner
  (`durable-migration-isolation.test.ts:83-162`).
- **Scope guards unchanged** — because the `.json` store needs none of the forbidden DB / SQL / migration tokens
  or imports, the Phase 33N guards required **no** change: no denylist entry or import rule was removed, and no
  per-file opt-out / allowlist was added (`durable-scope-guard-refinement.test.ts:100-119`).
- **Public body unchanged, no-leak preserved at 114 = 114** over persisted / replayed / failure surfaces;
  fail-closed / degraded-latch / capacity-rejection / tenant-estate-actor isolation all proven (47B §3, §10–§13).

Phase 47A is **accepted (47B Verdict A)** as exactly this bounded proof — and no more.

---

## 5. What Phase 47A sidestepped

Phase 47A's durability mechanism is a `.json` snapshot file written via `node:fs`, deliberately chosen as the
**lowest-blast-radius** way to deliver durability across a restart **without** touching the migration runner,
the packager, or any scope guard (47A runbook §1; 47B §5). It therefore **sidestepped — did not resolve — the
Lane-1 `aw_*` SQL / migration-runner frontier**:

- **It added no SQL and no `aw_*` schema**, so there was literally nothing for the production migration runner to
  discover or execute. The migration-adoption blocker (§7) was *avoided by construction*, not *cleared*.
- **It wrote `.json`, not `.sql`**, so the packager's `.sql`-only copy filter could never sweep the artifact into
  a production bundle. The packaging blocker (§8) was *avoided*, not *cleared*.
- **It used only `node:fs` and the spike's own sibling modules**, needing none of the forbidden durable-write /
  SQL / migration tokens or DB / `-store` imports. The scope-guard blocker (§10) was *avoided*, not *cleared* —
  no guard was refined, replaced, or weakened, because none had to be.
- **It introduced no dev/operator-only migration runner**, so the runner-isolation question (§9) was never
  reached. There is still no second, env-gated, dev-only runner; the only runner is the ungated production one.

The crucial consequence: **the frontier that forced Mode 1 over a Lane-1 `aw_*` SQL durable store in Phase 46V
is still open, untouched, and unresolved.** Phase 47A proved durability is *achievable without SQL*, which is
why it was the correct lowest-blast-radius Mode 2 — but any *eventual* canonical / DB-backed durable store would
still face the exact runner-adoption / packaging / scope-guard tension that both Mode 1 and the `.json` spike
avoided. That open frontier is what Phase 47C decomposes on paper.

---

## 6. Why Lane-1 `aw_*` SQL remains blocked

Lane-1 `aw_*` SQL — a dev/operator-only, route-owned, synthetic durable store backed by `aw_*` tables created by
one or more `aw_*` SQL migration files — remains **fully blocked**, for the same conjunction Phase 46X / 46Y / 46Z
established, now re-confirmed read-only against the current repo and **un-sidestepped** by Phase 47A's `.json`
mechanism:

1. **Any `aw_*.sql` placed in the shared `app/src/db/migrations/` directory is adopted into the *production*
   migration set** — discovered by `discoverMigrations()` (`migrate.ts:76-85`, predicate at :79), sorted by
   leading numeric prefix (:80-84), applied by `migrate()` in order (:199-240), and tracked in `_migrations`
   (:47-54). There is **no** environment branch, allowlist, blocklist, category, or naming convention (other than
   `_down`) that excludes a file (§7).
2. **The runner runs in production gated only on a DB pool being configured** — `server.ts` calls
   `await migrate(dbPool)` (:305) inside `if (dbPool)` (:303), with **no** `NODE_ENV`, dev/operator, or
   feature-flag gate (§7).
3. **The production packager copies any `.sql` file** into the runtime bundle — `copy-migrations.mjs` filters to
   `e.name.endsWith('.sql')` (:39) and copies every match (:50-52), with no dev/production distinction (§8).
4. **The Phase 33N scope guards forbid any durable-write / SQL / migration token and any production-store import
   on the spike surface** — `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`, 19 entries) and the import
   guards (:185-198), applied to every spike file (:200-228) (§10).
5. **There is no dev/operator-only migration runner and no migration-isolation seam** — a migration is
   "production" the instant its `.sql` file lands in the shared directory (§9).

A Lane-1 `aw_*` SQL durable store would need to add at least one `aw_*` migration **and** execute durable writes
from a route-owned surface; today, the first collides with (1)–(3) and the second collides with (4) — and
neither can be done without weakening a security boundary or adopting experimental material into production.
**None of these conditions was changed by Phase 47A**, whose `.json` mechanism avoided all four. Therefore Lane-1
`aw_*` SQL stays blocked, and this gate decomposes — but does not clear — the blockers below.

---

## 7. Migration discovery/adoption blocker

**Read-only. No migration code is modified and no migration file is added.**

- **Where migrations live.** A single shared directory `app/src/db/migrations/`, resolved relative to the
  compiled runner via `import.meta.url` (`migrate.ts:22-23`). At runtime `dist/db/migrate.js` scans
  `dist/db/migrations/`, populated by the packager (§8). Current contents (verified by directory listing):
  `003`–`015` plus `_down` rollback files for `013` / `014` / `015`. **No `aw_*` migration exists today.**
- **Discovery is scan-the-whole-directory.** `discoverMigrations()` (`migrate.ts:76-85`) does
  `readdir(MIGRATIONS_DIR)` and returns **every** file matching `f.endsWith('.sql') && !f.includes('_down')`
  (:79), sorted by leading integer prefix (:80-84). There is **no** manifest, allowlist, category, environment
  field, or per-file opt-in.
- **Execution is ungated beyond a DB pool.** `migrate()` (`migrate.ts:140-254`) has no `NODE_ENV` branch; its
  sole caller `server.ts` invokes it via `await migrate(dbPool)` (:305) whenever `dbPool` is non-null (:303), with
  no environment / feature-flag condition. Once a database URL is configured, migrations run identically in every
  environment. *(Predecessor gates cited this call as `server.ts:299-301`; the current verified location is the
  `if (dbPool)` guard at :303 wrapping `await migrate(dbPool)` at :305 — benign line drift; the substance —
  ungated beyond a DB pool — is unchanged.)*
- **Applied-tracking has no environment column.** `_migrations` (`migrate.ts:47-54`): `(id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())` — the
  table cannot record "this migration is dev-only." Concurrency is guarded by a Postgres advisory lock
  (`migrate.ts:153-167`); a changed already-applied file warns on checksum mismatch (:206-210).
- **Forward-only.** The runner does not auto-apply `_down` files (`migrate.ts:1-13`, :79); any reversible Lane-1
  proposal must design its own drop/down path **and** the operational procedure to run it.
- **Why this is dangerous for experimental material.** Because discovery is whole-directory and execution is
  ungated, placing an experimental `aw_*.sql` file in the shared directory would silently enrol it into the
  **production** migration set — applied at the next production start with no further action. The migration
  would gain production force merely by *being a file in the directory*.
- **How Phase 47A avoided this (not solved it).** Phase 47A added no SQL at all, so there was nothing for
  `discoverMigrations()` to match (`durable-migration-isolation.test.ts:83-134`). **Phase 47C must not claim this
  blocker is solved for SQL** — it is only avoided for the `.json` mechanism. For SQL it remains fully open.

---

## 8. Packaging/copy blocker

**Read-only. No packaging / copy runner is modified.**

- **What the packager does.** `copy-migrations.mjs` mirrors `src/db/migrations/*.sql` into `dist/db/migrations/`
  after `tsc` (the runtime runner resolves its dir relative to the compiled file, so the `.sql` assets must be
  copied or the app crashes on start). It resolves `SRC_DIR` (:23) and `DEST_DIR` (:24), **fails closed** if the
  source dir is missing (:28-34), filters entries to `e.isFile() && e.name.endsWith('.sql')` (:38-40, predicate
  at :39), fails closed if zero `.sql` files are found (:42-46), and copies every matched file (:50-52).
- **Why this is dangerous for experimental material.** The copy filter is `.sql`-only with **no** dev/production
  distinction. Any experimental `aw_*.sql` in the shared source directory would be silently included in the
  production build bundle and shipped to `dist/`, where the production runner (§7) would discover and execute it.
  Experimental SQL must never be silently swept into a production bundle this way.
- **How Phase 47A avoided this (not solved it).** Phase 47A persisted a `.json` snapshot, which the `.sql`-only
  copy filter rejects (`durable-migration-isolation.test.ts:152-162`); the snapshot also lives in an explicit
  operator dir, never the migrations source directory. **Phase 47C does not authorize any packaging change** and
  must not claim the packaging blocker is solved for SQL — for SQL it remains fully open.

---

## 9. Runner-isolation blocker

**Read-only. No runner is created, modified, or authorized.**

The migration-discovery (§7) and packaging (§8) blockers share a root cause: there is **exactly one** migration
runner, it is the production runner, and there is **no** dev/operator-only isolation seam. A Lane-1 `aw_*` SQL
store would need experimental migration material that the production runner provably never discovers, copies, or
executes — which does not exist today and which Phase 47A never built (its `.json` store invokes no runner at
all; `durable-migration-isolation.test.ts:138-148` confirms `server.ts` makes exactly one `migrate(` call and the
spike adds no second).

**Candidate safe patterns are enumerated below, but none is selected as implementation in Phase 47C** (they are
future design options for the §19 next lane to compare, per the 46Y §7 four-class model and 46X §5 design
observations):

- a **separate experimental migration directory** the production `discoverMigrations()` scan never reads;
- a **manifest-gated experimental runner** (an explicit allowlist / manifest distinguishing dev from production
  migrations);
- an **explicit dev/operator-only runner command** (a separate runner, or a separate env-gated branch, disabled
  by default and never invoked by the ungated production `migrate(dbPool)` call);
- **env-category gating** recorded in (or alongside) `_migrations` so a migration's environment is explicit;
- an **explicit deny from the normal runner** (a naming-convention exclusion, e.g. skip `aw_*` / `dev_*`, in
  `discoverMigrations()` *paired with* a separate dev-only runner that opts those back in under an explicit gate);
- a **test-only harness schema** (Class T of the 46Y model — schema created only by a test harness, never
  production migration material);
- a **no-SQL continuation** (keep the `.json` Mode 2 mechanism; never introduce Lane-1 SQL);
- or **deciding Lane-1 SQL is unnecessary and should remain blocked indefinitely**.

Each of these is a **production-runner-adjacent change with its own security review** and is **out of scope for
Phase 47C**. Selecting among them — still on paper, implementing nothing — is precisely the §19 next lane's job.

---

## 10. Scope-guard blocker

**Read-only. No guard or test is modified, and no guard is weakened.**

- **Which files are scanned.** `SPIKE_FILES` (`scope-guards.test.ts:36`) = every `.ts` found by recursive
  `walkTs(SPIKE_SERVICE_DIR)` over `app/src/services/admission-wedge-spike/` (:22, :25-34) **plus**
  `app/src/routes/admission-intake.ts` (:23); ≥5 files asserted present (:163).
- **Which tokens are forbidden.** `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`, **19** entries)
  forbids, in executable source (after parser-backed comment stripping, :78-118): `INSERT`, `INSERT INTO`,
  `UPDATE`, `DELETE`, `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `pool.query`, `.query(`, `query(`, `.execute(`,
  `execute(`, the `` sql` `` tagged template, `db.`, `database`, `pg`, `postgres`, `migration`, and `migrate`
  (denylist applied to every spike file at :200-228).
- **Which imports are forbidden.** `scope-guards.test.ts:185-198` rejects a bare `pg` import,
  `/db/(client|pool|migrate|transaction)`, `/db/migrations/`, any `/-store(\.js)?$/` specifier, and
  `BoundedEstateStore` / `bounded-estate-store`; plus no Freeside import (:169-175) and no `@loa/straylight`
  import (:177-183).
- **Syntax-aware, evasion-resistant, binary.** `stripComments()` (:78-118) uses the TypeScript parser so a token
  cannot hide in a string, nested template `` ${`//`} ``, or regex char class `/[//]/`; a regression suite
  (:231-313) proves both directions. The guard is **binary** — any denylist or import match fails the test;
  there is **no** per-file opt-out, suppression comment, or allowlist.
- **Why this blocks Lane-1 SQL.** A Lane-1 `aw_*` SQL store on the current spike surface would necessarily emit
  durable-write / SQL tokens (`INSERT`, `CREATE TABLE`, `pool.query`, …) and/or import a DB client / migration
  runner / `-store` module — each of which trips the guard. Because the guard scans the **whole** spike directory
  with no exception mechanism, a durable write or DB import placed there fails the guard immediately.
- **Why the guard must not be broadly weakened.** The Phase 33N guard is the **only** source-tree proof that the
  disabled-by-default spike surface performs no durable write and imports no production storage. A blanket
  relaxation — removing a denylist entry, loosening the import guard — would re-open the durable-write / DB-import
  capability for **every** spike file, regressing the posture from "provably non-durable" to "durable writes
  possible somewhere on the surface."
- **What a future SQL path would require (design observation only — not authorized here).** A **narrow
  replacement / allowlist model, not guard deletion**: it would permit only a **specifically-named** dev/operator
  module and an **isolated** migration mechanism, while keeping the rest of the surface under the existing blanket
  denylist. Any allowlist must be **path-specific** (one named module), **token-specific** (only the precise
  tokens that module needs), and **paired with negative tests** proving the guard still fails closed everywhere
  else against the same evasion-resistance bar (`scope-guards.test.ts:231-313`). **Production-store claims must
  remain blocked.** Designing that model is the §19 next lane; weakening or editing any guard is forbidden here.
- **How Phase 47A avoided this (not solved it).** Phase 47A's `.json` store needed none of the forbidden tokens,
  so the guards passed it **unchanged** — the strongest B.1 outcome (`durable-scope-guard-refinement.test.ts:100-119`).
  **Phase 47C must not claim the guard blocker is solved for SQL** — no refined / replacement guard model exists
  in the repo; for SQL the blocker remains fully open.

---

## 11. Storage semantics blocker

**Decomposes what an *eventual* `aw_*` SQL store would need to persist — without implementing, designing, or
freezing any schema. Phase 47C does not choose the final schema.** The Phase 46S draft enumerated 13 `aw_*` tables
across 11 subsections (`schema_final` / `route_contract_final` **false**); that draft is referenced here only as a
non-frozen paper artifact. The persistence concerns a future Lane-1 store would have to address — each a *design
question*, not a committed design — include:

- **admitted assertion / route-owned synthetic assertion rows** — the route-owned record of an admitted synthetic
  assertion (never a parallel canonical lifecycle; canonical `active` `Assertion` stays Straylight-owned, §14);
- **transition receipt or private transition effect** — the private record of an admission transition's effect;
- **public receipt reference** — a safe, opaque public reference (never raw private material);
- **idempotency / replay ledger** — the keying that lets an identical replay return the prior outcome and mint
  nothing (the final keying strategy / replay-envelope shape / TTL policy is **undecided**, per 47B §11);
- **conflict records** — same-key / different-content conflicts that must fail closed;
- **supersession / correction relation** — the relation repointing recall from a superseded assertion to its
  correction while preserving the prior's audit / provenance;
- **tenant / estate / actor scope** — every row scoped by `(tenant_id, estate_id)` and actor, with cross-scope
  reads returning empty and cross-scope writes failing closed;
- **bounded cleanup / tombstone / drop semantics** — capacity bounds with rejection-not-eviction, tombstones,
  and a drop path for synthetic dev objects;
- **deletion / forgetting / revocation implications** — how a future MVP-3 forget / revoke / correction model
  would interact with persisted rows (all of which remain blocked, §20).

**Phase 47C does not choose the final schema, does not freeze any schema, and does not authorize any `aw_*`
table.** It only records that these are the persistence dimensions a future design gate must reason about — none
is committed, and the Phase 46S draft stays draft.

---

## 12. Public/private boundary blocker

Any future SQL-backed durable store must hold the same public/private boundary the `.json` spike holds, proven
read-only against the no-leak parity:

- **SQL-backed storage must not expand the public response.** The public envelope is the fixed allowlist; the
  runtime `no-leak.ts` `FORBIDDEN_PUBLIC_KEYS` mirrors the route-contract validator at **114 = 114** parity
  (Phases 46O / 46P / 46Q). Any change requires a separate no-leak proof.
- **Raw candidate payload must not persist.** Only synthetic, bounded, route-owned labels — never raw candidate /
  source / reason material (mirroring the Phase 33Q / 46V / 47A no-raw-payload invariant; 47A's hydrate hardening
  guarantees no off-shape field enters even the `.json` artifact).
- **Private transition / audit material must remain private.** `TransitionReceipt` / `AuditEvent` / consent proof
  / storage internals are never serialized onto the wire; persisted + replayed responses must deep-walk the
  114-key guard exactly like a fresh response.
- **Public receipt refs must stay safe** — opaque, non-leaking references only.
- **No stack / path / SQL / debug leakage** — a SQL-backed store fault must collapse to the stable public refusal
  (HTTP 400) leaking neither the error text, the SQL, the DB path, nor any id, exactly as the `.json` store's
  faults do (47B §7, §10).

Phase 47C changes none of this and freezes nothing; it records the boundary a future SQL store must not breach.

---

## 13. Auth/consent/signer blocker

Lane-1 `aw_*` SQL does **not** solve, and must not be read as solving, any of the production-adjacent identity
prerequisites — each of which remains a separate future gate:

- **service auth** — the dev/operator `x-admission-service-token` + `x-admission-operator-id` allowlist is a
  dev/operator isolation mechanism, fail-closed when both are empty; it is **not** production service auth;
- **end-user authorization** — Lane-1 SQL does not establish who may admit on whose behalf;
- **signer / authority** — Lane-1 SQL does not establish a canonical signer or authority over a record (canonical
  signer / authority semantics stay Straylight-owned, §14);
- **consent proof / receipt** — Lane-1 SQL does not implement a consent model; service-token / operator auth is
  **never** treated as consent; missing / invalid consent must fail closed in any future production model.

These remain **prerequisites before any production-adjacent storage**, and none is unblocked here. **The
canonical signer / consent key-name no-leak hardening** that the consent-storage vector-alignment lanes recorded
remains a separate concern carried by those gates; Phase 47C touches no validator and no `no-leak.ts` and makes
no claim about it beyond preserving the boundary.

---

## 14. Rollback/recovery blocker

A Lane-1 `aw_*` SQL store would introduce DB objects whose lifecycle must be reversible and fail-closed —
concerns the `.json` spike addressed for a file (`purgeDurableState` + `rm -f`; degraded-latch fail-closed) but
which are **unresolved for SQL**:

- **dev/operator SQL objects would need cleanup / drop / tombstone rules** — the forward-only runner never
  auto-runs a `_down` file (`migrate.ts:79`), so any drop-empty-table / tombstone path **and** its operational
  procedure must be designed explicitly;
- **partial migration or partial write must fail closed** — a half-applied `aw_*` migration or a partial durable
  write must never leave a partially-admitted, recallable synthetic assertion; the runner applies each migration
  in a `BEGIN`/`COMMIT` transaction with `ROLLBACK` on error (`migrate.ts:220-240`), but a multi-statement or
  multi-migration partial-failure recovery story for experimental material is undesigned;
- **no partially admitted recallable assertion** — the atomicity invariant the `.json` store enforced via the
  degraded latch must be re-established for SQL;
- **rollback for production remains unresolved** — there is no production rollback story for `aw_*` objects, and
  none is authorized here.

**Candidate D / ADR-022E boundary preserved.** Candidate D (split-storage) remains **proposal input / design
baseline, not implemented production architecture**; Phase 46N's gate #8 clearing remains a **bounded Dixie
documentation / architecture / handoff prerequisite only**; the operative Straylight-side discharge remains held
unless separately evidenced (no such accepted evidence exists at authoring time). Canonical `Assertion` /
`TransitionReceipt` / `AuditEvent` semantics and the `StorageAdapter` interface stay Straylight-owned (cross-repo).

---

## 15. Candidate future design patterns

Enumerated for completeness — **none is selected, designed, sequenced, or authorized by Phase 47C.** Each is a
possible input to the §19 next lane (Phase 47D), and several recombine the §9 runner-isolation and §10
guard-refinement options:

| Pattern | Sketch | What it would still block | Posture in Phase 47C |
|---------|--------|---------------------------|----------------------|
| **P1 — Separate experimental migration directory** | A `aw_*` / dev-only migrations dir the production `discoverMigrations()` scan never reads, applied only by a separate env-gated dev runner | production adoption; packaging; Lane-2 canonical | **Enumerated, not selected.** |
| **P2 — Manifest / allowlist-gated experimental runner** | An explicit manifest distinguishing P (production) from E (experimental) migrations; the production runner applies only P | accidental adoption; packaging | **Enumerated, not selected.** |
| **P3 — Explicit dev/operator-only runner command** | A separate runner (or env-gated branch), disabled by default, never invoked by the ungated production `migrate(dbPool)` call | production execution; production fallback | **Enumerated, not selected.** |
| **P4 — Env-category gating in `_migrations`** | An environment column / category so a migration's environment is explicit and dev-only ones are excluded from production application | accidental production application | **Enumerated, not selected.** |
| **P5 — Explicit deny from the normal runner** | A naming-convention exclusion (skip `aw_*`) in `discoverMigrations()` paired with a dev-only opt-in runner | production adoption | **Enumerated, not selected.** |
| **P6 — Test-only harness schema (Class T)** | Schema created only by a test harness / fixture; never production migration material; never in the production discovery path | being confused with E or P migrations | **Enumerated, not selected.** |
| **P7 — No-SQL continuation** | Keep the Phase 47A `.json` Mode 2 mechanism; never introduce Lane-1 SQL | everything Lane-1 SQL would add | **Enumerated; a live, low-risk option.** |
| **P8 — Decide Lane-1 SQL is unnecessary, keep blocked indefinitely** | Conclude no safe path is worth the production-runner risk; close the frontier | all of Lane-1 SQL | **Enumerated; a valid terminal outcome.** |

A future Lane-1 SQL path, **if ever** pursued, would also need (§10) a **narrow replacement / allowlist
scope-guard model** — path-specific, token-specific, negative-tested — not guard deletion. **Phase 47C selects
none of P1–P8 and designs none of them; it only maps the option space.**

---

## 16. Evidence required before authorization

Lane-1 `aw_*` SQL implementation may **not** be authorized until **all** of the following are proven and
separately accepted (carried forward and refined from 46X §9 / 46Y §11; this is the acceptance bar for the §19
design lane and any later authorization gate):

1. **A safe migration classification / isolation model** (a P1–P5 mechanism, or equivalent) that keeps a
   dev/operator-only `aw_*` migration out of the production set, **demonstrated** against the actual discovery +
   execution + packaging path (`migrate.ts:76-85`, :199-240; `server.ts:303-305`; `copy-migrations.mjs:38-40`,
   :50-52), including the build-copy step.
2. **Proof that production startup cannot run dev/operator `aw_*` migrations** — no environment / config / default
   under which `server.ts`'s ungated `migrate(dbPool)` adopts a Class-E migration; no production fallback.
3. **Proof that the packager cannot copy experimental material into production bundles** — Class-E `.sql` is
   excluded from the `copy-migrations.mjs` copy set, or lives outside the copied source directory entirely.
4. **A narrow replacement / allowlist scope-guard model** (§10) permitting only one named route-owned durable
   module while continuing to block raw SQL, production storage, and unsafe imports — proven against the same
   evasion-resistance bar (`scope-guards.test.ts:231-313`), with negative tests.
5. **Default-off, AND-gated route-storage behavior preserved** — Lane-1 SQL engages from neither the base route
   gate nor the storage gate alone, disabled by default, no production fallback (as Phase 46V / 47A).
6. **No public response change** — persisted / replayed public responses pass the 114-key no-leak guard exactly
   like a fresh response; the public body does not expand without a separate no-leak proof.
7. **No raw candidate payload persistence** — only synthetic, bounded, route-owned records.
8. **Tenant / estate / actor isolation**, **idempotent replay / conflict fail-closed**, and **failure /
   partial-write** tests for the SQL substrate (including the §14 partial-migration / partial-write fail-closed
   story).
9. **Bounded capacity / retention with rejection-not-eviction**, plus a **rollback / drop / tombstone plan** and
   runbook / rollback docs (the forward-only runner will not auto-run a down file, `migrate.ts:79`).
10. **No unsafe scope-accessor / TOCTOU regression** — the Phase 46V / 47A `snapshotActorId` discipline preserved
    or strengthened.
11. **Proof that Lane-2 canonical Straylight-store migrations remain blocked** — no Dixie migration authority over
    canonical `Assertion` / `TransitionReceipt` / `AuditEvent` records; each canonical migration stays a separate
    sibling-repo ADR under Straylight teammate review (ADR-022D §7; 46N).
12. **No package / export / config / CI drift outside authorized files**, and **a Codex audit before
    implementation** (mirroring the Phase 46V / 47A Codex patch-and-re-audit discipline; 46U §6 / §7 conditioned
    Mode 2 on "a separate Codex audit").

Until every item is proven and separately accepted, Lane-1 `aw_*` SQL stays blocked.

**Evidence that exists today.** The migration-runner / packager / scope-guard behavior is read and confirmed
(§7–§10); the Phase 47A `.json` mechanism proved durability is achievable without SQL and that the runner /
packager / guards reject the `.json` artifact (§4); the 46S draft schema enumerates the persistence dimensions
(§11); the 46Y four-class model and refined-guard design exist on paper (§9, §10). **Evidence that is still
missing.** Items 1–4 above have **no** repo realization: there is no experimental migration directory, no
manifest, no dev-only runner, no env-category column, and no refined / replacement scope-guard model in the repo;
no Lane-1 SQL isolation has been demonstrated against the real runner; and the §14 partial-migration / rollback
fail-closed story for SQL is undesigned.

---

## 17. Options considered

Each option is enumerated and evaluated, not implemented.

### Option A — Accept the blocker decomposition and select a Lane-1 SQL isolation **design** gate. **SELECTED.**

- **Would authorize.** Nothing implementable. It accepts the §7–§16 decomposition and names a further
  **docs/decision-only** Phase 47D Lane-1 SQL isolation *design* gate (§19), which would compare the §15 candidate
  patterns on paper. Authorizes **no** implementation, SQL, migration, runner change, DB write, or migration
  execution.
- **Still blocks.** All of Lane-1 SQL; the migration runner / packager stay untouched; the guards stay intact;
  production / Lane-2 / freeze / gate-#8 work stays blocked.
- **Risks.** Low — paper only. It converts the open frontier into a reviewable, ordered design artifact without
  authorizing anything.
- **Verdict.** **SELECTED (§18 / §19).** It is the smallest safe step that turns the sidestepped frontier into a
  concrete next design question.

### Option B — Keep Lane-1 SQL blocked indefinitely; continue JSON-only dev/operator route-storage hardening.

- **Would authorize.** Nothing new; the accepted `.json` Mode 2 spike (47B) remains the only durable route-storage
  mechanism; optional later `.json` hardening / smoke lanes stay available (pattern P7 / P8).
- **Still blocks.** All of Lane-1 SQL, permanently unless re-opened.
- **Risks.** Low. It does not advance the SQL design question, but the `.json` mechanism already delivers
  durability, so "keep blocked" loses no ground and may be the correct terminal answer.
- **Verdict.** **Partially adopted as the standing posture** (Lane-1 SQL stays blocked) but **not selected as the
  forward lane** — Option A's design gate is the cheaper way to *decide* between P7 / P8 and an isolated SQL path,
  on paper, before committing to "indefinitely."

### Option C — Authorize immediate `aw_*` SQL implementation. **REJECTED.**

- **Risks.** Disqualifying. The §6–§10 blockers are unresolved; implementing today would require adopting a
  migration into the production set (§7 / §8) and/or weakening a security guard (§10). Forbidden by this gate's
  scope and by 46X / 46Y / 46Z / 47B.

### Option D — Modify the production migration runner now. **REJECTED.**

- **Risks.** Disqualifying. Changing `migrate.ts` / `copy-migrations.mjs` is a production-runner change with its
  own security review; it is explicitly forbidden here and is exactly what a future design + authorization gate
  must specify first.

### Option E — Jump to production durable storage. **REJECTED.**

- **Risks.** Disqualifying. Production durable storage, DB writes, and migration execution are blocked (§20) and
  behind the operative Straylight-side gate #8 (§14).

### Option F — Hand off to Freeside runtime / client integration. **REJECTED (now).**

- **Risks.** Premature. The route contract is draft / non-final (`route_contract_final` false), so a handoff would
  communicate a moving target; Freeside integration is blocked (§20).

### Option G — Route-contract freeze / final schema freeze. **REJECTED.**

- **Risks.** Disqualifying. Both freezes are blocked (§20); `schema_final` / `route_contract_final` stay false;
  the 46S schema is a draft (§11).

---

## 18. Decision

> **Verdict A — Phase 47C decomposes the Lane-1 `aw_*` SQL / migration-runner blocker and keeps implementation
> blocked.**

This means:

- **no `aw_*` SQL authorized;**
- **no migration runner changes authorized;**
- **no packaging / copy-runner changes authorized;**
- **no DB writes authorized;**
- **no migration execution authorized;**
- **no production storage authorized;**
- **no scope-guard weakening authorized;**
- **no route-contract freeze; no final schema freeze;**
- **no ADR-022E gate #8 discharge;**
- **no Freeside runtime / client integration;**
- **no Lane-2 canonical Straylight-store migration;**
- **no production readiness;**
- **proceed to a later docs/decision-only design gate (Phase 47D, §19).**

Phase 47C accepts the §7–§16 decomposition as a docs-only artifact, records exactly what evidence exists and
what is still missing (§16), and selects a docs-only Lane-1 SQL isolation *design* gate next. It is explicitly
**future-only**: the §15 candidate patterns, the §16 evidence items 1–4, the isolated runner, the refined guard,
and the SQL substrate are **not present in the repo** at authoring time and are **not authorized** by this gate.
It does **not** say Lane-1 SQL is implementation-ready, does **not** say any `aw_*` migration is safe, and does
**not** imply any change was made to the migration runner or packager. The alternatives were considered and
rejected (§17): immediate implementation (C), a runner change now (D), production storage (E), a Freeside handoff
(F), and either freeze (G) are all forbidden; keeping Lane-1 SQL blocked indefinitely (B) is partially adopted as
the standing posture but a design gate (A) is the safer forward step.

---

## 19. Next lane

> **Selected next lane: Phase 47D — Lane-1 `aw_*` SQL isolation *design* gate (docs / decision-only).**

- **What it is.** A **docs / decision-only** gate that compares the §15 candidate designs (P1–P8) for isolating
  experimental `aw_*` SQL from normal production migration discovery / execution / packaging, and the §10 narrow
  replacement / allowlist scope-guard model, against the §16 evidence bar — **on paper**. It would select a
  preferred isolation design (or conclude P7 / P8 — no-SQL / keep-blocked — is correct) **without** implementing
  SQL, migrations, runner changes, packaging changes, DB writes, or production behavior.
- **What it must remain.** Docs / decision-only: it implements no store, writes no DB, adds no migration, creates
  no SQL or executable schema, changes no migration runner or packaging / copy runner, weakens or edits no scope
  guard, changes no route / API behavior, freezes nothing, and discharges no Straylight-side gate. It preserves
  every §20 block.
- **Why a design gate, not an acceptance gate for 47C.** An acceptance gate for 47C was considered: 47C is itself
  docs-only and self-contained (Verdict A; decomposition complete), so a separate gate that merely *accepts the
  decomposition* would add little decision value — the decomposition is accepted in §18. The higher-value next
  step is to **compare candidate isolation designs** (the §15 option space), which is design work, not acceptance.
  A later authorization gate (Verdict-C-style) and an implementation lane remain possible **only after** Phase 47D
  is itself accepted and the §16 evidence is proven. **Implementation is not selected as the next lane.**
- **Why not the alternatives.** Direct `aw_*` SQL implementation, migration-runner changes, packaging changes, DB
  writes, migration execution, production durable storage, a Freeside handoff, and any freeze are **explicitly NOT
  selected** (forbidden; §17, §20).

---

## 20. Preserved blocked lanes

Regardless of verdict, the following remain **blocked** after Phase 47C — **none** is unblocked by this
decomposition gate:

- **Lane-1 `aw_*` SQL implementation** — blocked; only a docs-only design lane (Phase 47D) is selected (§19);
- **migration runner changes** (`migrate.ts`) — blocked;
- **packaging / copy-runner changes** (`copy-migrations.mjs`) — blocked;
- **scope-guard weakening / editing** (`scope-guards.test.ts`) — blocked; the narrow replacement / allowlist model
  is paper-only and future-gated;
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
- **operative Straylight-side ADR-022E gate #8 discharge** — not claimed (no repo evidence); sibling gates #9 /
  #10 / #11 / #12 / #15 / #20 remain held. **This remains the dominant cross-repo blocker** for production
  admission and any Lane-2 canonical-store migration.

**Invariants preserved (unchanged).** A pending candidate is not recallable; a rejected candidate creates no
admitted assertion; an accepted candidate creates / references an admitted assertion; a superseded assertion is
excluded from ordinary recall unless explicitly requested / marked; a malformed / unsafe payload fails closed;
missing / unauthorized auth fails closed; missing / invalid consent fails closed in any future production
admission model; public responses leak no raw / private / audit / debug / source / auth / signer / consent /
storage material; private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private;
user chat does not become memory merely because it was said; `active` remains the canonical assertion status, not
a public `outcome_class`; `recall_eligible` remains derived / projection-only.

> Decomposing this blocker unblocks **no** production / public / canonical-store / Freeside / LLM / package /
> freeze / SQL / migration work. Every lane above remains its own separately-authorized future gate.

---

## 21. Codex audit checklist

This section is the checklist for a Codex audit of **this docs/decision-only Phase 47C gate**. Every item must be
ACCEPT.

```text
PHASE 47C — LANE-1 aw_* SQL / MIGRATION-RUNNER BLOCKER DECOMPOSITION GATE — CODEX AUDIT CHECKLIST
(docs/decision-only; every item must be ACCEPT)

[ ] 1.  Docs-only scope: this gate adds ONLY docs/ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-
        DECOMPOSITION-GATE.md (plus at most two minimal forward-traceability status notes in the Phase 47B
        acceptance gate and the Phase 47A runbook).
[ ] 2.  No SQL / migration files: no .sql file, no aw_* migration material, no executable schema is added.
[ ] 3.  No runtime / test / config / package / CI changes: no change to migrate.ts, copy-migrations.mjs,
        any *.sql, route-storage-durable-spike.ts, route-storage-spike.ts, index.ts, no-leak.ts, config.ts,
        admission-intake.ts, server.ts, scope-guards.test.ts, any test, validator, vector, fixture, package /
        lockfile, env, CI, generated file, or binary; no adjacent repo touched.
[ ] 4.  No migration runner changes: migrate.ts discovery/execution semantics are described read-only, not
        modified.
[ ] 5.  No packaging / copy changes: copy-migrations.mjs .sql-only copy filter is described read-only, not
        modified.
[ ] 6.  Phase 47A represented as a JSON snapshot store ONLY: durability is a .json file off the migration path;
        no SQL, no aw_* schema, no DB, no runner / packager change.
[ ] 7.  SQL frontier described as SIDESTEPPED, not solved: §5 / §7 / §8 / §10 each state Phase 47A AVOIDED the
        blocker for .json and that it remains OPEN for SQL; no section claims the SQL blocker is solved.
[ ] 8.  Next lane remains docs/decision-only DESIGN (Phase 47D — Lane-1 aw_* SQL isolation design gate), NOT an
        implementation lane.
[ ] 9.  No production overclaim: no positive production-readiness / route-contract-freeze / final-schema-freeze /
        ADR-022E-gate-#8-discharge / production-DB-write / production-migration-execution / durable-production-
        storage / Freeside-runtime / Lane-2-canonical / "aw_* SQL is safe or authorized" / "migration runner
        changes authorized" claim; every such phrase appears only negated / blocked.
[ ] 10. Preserved blocked lanes explicit (§20) and the invariants intact.
[ ] 11. File:line citations match the real source (migrate.ts:76-85/:79/:199-240/:47-54; server.ts:303/:305;
        copy-migrations.mjs:38-40/:39/:50-52; scope-guards.test.ts:36/:122-142/:185-198/:200-228/:231-313).
[ ] 12. Validators run and recorded green (§22); corruption / duplicate guard holds.
```

---

## 22. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`) unless noted. Phase
47C is docs/decision-only — it adds only this document (plus the two minimal forward-traceability status notes,
§19) and mutates no runtime source, test, validator, vector, fixture, migration, or SQL file — so the validators
are run only to confirm the unchanged artifacts remain green.

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
grep -RInE 'production ready|production readiness|route-contract freeze|final schema freeze|ADR-022E.*discharged|production migration execution authorized|production DB writes authorized|durable production storage authorized|Freeside runtime|Lane-2 canonical|current aw_\* migrations are safe|aw_\* SQL.*authorized|SQL durable-store.*authorized|migration runner changes authorized' docs/ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md
```

**Recorded results for this lane** (run during authoring; full output accompanies the operator run report):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md` is added, plus the two
  minimal forward-traceability status notes (§19); no runtime source (and specifically not `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql`, `route-storage-durable-spike.ts`, `route-storage-spike.ts`, `no-leak.ts`,
  `config.ts`, `admission-intake.ts`, `server.ts`, or `scope-guards.test.ts`), no runtime test, no route-vector
  JSON, validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config /
  env, CI, migration, SQL, executable schema, or generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth
  vector**; the `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail
  closed; 2 exact-key non-over-match guards stay clean);
- **docs-only static scans** — the `app src package.json … *.sql dist build` diff is empty; the
  `.sql$|migration|aw_` scan matches only this document's prose (no new SQL / migration file); the
  memory/generated/temp scan matches nothing under the working tree from this phase;
- **overclaim scan** — every match is a **negated / blocked** reference (e.g. "route-contract freeze — blocked",
  "final schema freeze — blocked", "Lane-2 canonical … remain blocked", "Freeside runtime / client integration
  — blocked", "production readiness … not claimed"); there is **no** positive authorization or safety claim;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–23 exactly once
  each.

**Corruption / duplicate guard** (carried from the 46I–47B precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 23.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §21 Codex
  checklist (a `text` block) and the §22 validation command list (a `text` block). **No fenced block is an
  executable migration or runnable schema.**

---

## 23. Cross-references

- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md)
  — Phase 47B (PR #173); the **selecting predecessor** — its §17 named this lane and recorded that Phase 47A
  delivered durability by **sidestepping** this frontier. **Gains a minimal Phase 47C forward-traceability status
  note (§19).**
- [`docs/admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md)
  — Phase 47A (PR #172); the implementation whose `.json`-snapshot mechanism (§1) sidestepped the SQL frontier and
  whose §7 preserved-blocked-lanes this gate carries forward. **Gains a minimal Phase 47C forward-traceability
  status note (§19).**
- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md)
  — Phase 46Z (PR #171); the authorization checklist (§8 migration isolation, §9 scope guards) the §16 evidence
  bar extends to Lane-1 SQL. **Not modified.**
- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md)
  and [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md)
  — Phases 46Y / 46X (PR #170 / #169); the four-class P / E / T / C migration model (§9, §15) and the original
  Mode 2 blocker decomposition this gate grounds in the merged 47A `.json` mechanism. **Not modified.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md)
  and [`docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md)
  — Phases 46S / 46T (PR #164 / #165); the **draft** 13-table `aw_*` schema (§11) — `schema_final` /
  `route_contract_final` false; not frozen. **Not modified.**
- [`docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md)
  — Phases 46Q / 46P / 46O; the 114 = 114 runtime ↔ validator no-leak parity a future SQL store must hold over
  persisted / replayed public surfaces (§12). **Not modified.**
- `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/` — the migration runner,
  build packager, and shared migration directory, inspected **read-only** to ground §6–§9. **None is modified by
  this phase.**
- `app/tests/unit/admission-wedge-spike/scope-guards.test.ts` — the Phase 33N static scope guards, inspected
  **read-only** to ground §10. **Not modified.**
- `app/src/services/admission-wedge-spike/{route-storage-durable-spike,route-storage-spike,index,no-leak}.ts`,
  `app/src/routes/admission-intake.ts`, `app/src/server.ts`, `app/src/config.ts`, and the Phase 47A test suites
  (`durable-migration-isolation.test.ts`, `durable-scope-guard-refinement.test.ts`) — the merged Phase 47A
  implementation, inspected **read-only** to ground §4 / §5 / §12. **None is modified by this phase.**
- `@loa/straylight` — canonical primitive / substrate owner; the `StorageAdapter` interface and the canonical
  `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes (cross-repo references, not Dixie artifacts);
  ADR-022E durable-store gate #8 (+ sibling gates, **held operatively**) and ADR-022D receipt / audit-chain
  invariants are the decision records cited as guardrails (§14). **Not edited by this phase.**
