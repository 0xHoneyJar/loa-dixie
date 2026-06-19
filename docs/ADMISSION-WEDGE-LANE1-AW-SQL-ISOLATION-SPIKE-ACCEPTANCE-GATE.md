# Phase 47G — Lane-1 `aw_*` SQL isolation spike acceptance / hardening decision gate

> **Phase**: 47G
> **Branch context**: `phase-47g-aw-sql-isolation-spike-acceptance-gate`
> **Related**: Phase 47F (PR #177,
> [`admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md))
> **implemented** the first code-bearing Lane-1 `aw_*` SQL lane — a **bounded, dev/operator-only, disabled-by-default,
> NON-PRODUCTION, location-isolated** experimental SQL planning / manifest / safety-proof spike — authorized narrowly
> and **acceptance-gated** by Phase 47E (PR #176,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md)
> §8–§18 checklist); Phase 47D (PR #175,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md))
> **selected**, on paper, the §18 layered Lane-1 `aw_*` SQL isolation design direction; Phase 47C (PR #174,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the Lane-1 `aw_*` SQL / migration-runner blocker and kept Lane-1 SQL BLOCKED; Phase 47B (PR #173,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md))
> **accepted** the merged Phase 47A durable spike as a bounded, disabled-by-default, dev/operator-only, **non-production**
> Mode 2 **`.json`-snapshot** proof (NOT SQL, NOT a production DB, NOT `aw_*` schema); Phase 47A (PR #172,
> [`admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md))
> **implemented** Storage Mode 2 as a file-backed `.json` snapshot store off the production migration path; Straylight
> (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); Straylight-repo ADR-022E durable-store gate #8 (+
> sibling gates, **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only acceptance / hardening decision gate.** This gate adds **only this document**
> (plus two minimal forward-traceability status notes, §19). It modifies **no** runtime source — and specifically does
> **not** modify `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`,
> `app/src/server.ts`, `app/src/config.ts`,
> `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts`, the experimental `.sql` files, the
> `manifest.json`, the `aw-sql-isolation-spike-runner.mjs`, `no-leak.ts`, `route-storage-durable-spike.ts`,
> `route-storage-spike.ts`, or `scope-guards.test.ts` — and changes **no** route handler, store / storage code, DB
> write, migration, SQL file, executable schema, migration runner, packager, scope guard, auth, consent, route-vector
> JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, other test, package export,
> config, env, package, lockfile, CI, generated file, or binary. No adjacent repository (`loa-straylight`,
> `freeside-characters`) is touched.
> **This is the Lane-1 `aw_*` SQL isolation spike *acceptance / hardening decision* gate** — the rung downstream of the
> Phase 47F implementation, mirroring the Phase 47A → 47B (and the Phase 46V → 46W, Phase 33N → 33O) implement → accept
> precedent. It **decides whether the merged Phase 47F Lane-1 `aw_*` SQL isolation spike is accepted as the bounded
> dev/operator proof the Phase 47E §8–§18 checklist authorized**, records what it does and does not prove, and selects
> the next safe lane. **It is not the spike, and it implements nothing.** It **builds no store, writes no DB, adds no
> migration, creates no SQL or executable schema, executes no migration, enables no `--apply`, injects no DB sink,
> changes no migration runner or packager, weakens no scope guard, implements no auth or consent, changes no route /
> API behavior, freezes neither the route contract nor the final schema, discharges no operative Straylight-side gate,
> and claims no production readiness.**

Every assessment below is grounded **read-only** against the **merged Phase 47F source** in the Dixie repo at the time
of writing (PR #177, commit `ae24ca35`, **9 files, +2439 lines, zero production-path / vector / fixture files**): the
planner / guard / apply module `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts` (800 lines,
`buildIsolationSpikePlan` / `applyIsolationSpikePlan` / `createSyntheticWriteReducer`), the exact allowlist
`aw-sql-isolation-spike/manifest.json` (13 lines), the experimental forward / cleanup DDL
`aw-sql-isolation-spike/sql/0001_aw_isolation_spike_init.sql` (111 lines) and `…_down.sql` (16 lines), the explicit
dev/operator runner `app/scripts/aw-sql-isolation-spike-runner.mjs` (124 lines), the three focused test files
(`aw-sql-isolation-spike.test.ts` — 789 lines / 64 cases; `aw-sql-isolation-runner-isolation.test.ts` — 177 lines;
`aw-sql-isolation-scope-guard.test.ts` — 169 lines), and the Phase 47F runbook (240 lines). The **unchanged**
production path is also read read-only: the migration runner `app/src/db/migrate.ts` (**254 lines** — it has **no**
line 303–305), the build-asset packager `app/scripts/copy-migrations.mjs`, the shared migration directory
`app/src/db/migrations/`, the conditional startup migrate `await migrate(dbPool)` inside `if (dbPool)` at
**`server.ts:303-305`**, the env parsing in `app/src/config.ts`, the runtime no-leak guard `no-leak.ts` (114-key
`FORBIDDEN_PUBLIC_KEYS`), and the Phase 33N static scope guards `scope-guards.test.ts` (19-entry
`DURABLE_WRITE_DENYLIST` at `:122-142`, forbidden-import test at `:185-198`). **The canonical Straylight
`StorageAdapter` interface and the `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes live in the adjacent
`loa-straylight` repository (cross-repo references, not Dixie file:line) and remain Straylight-owned (§17).**

---

## 1. Status

Phase 47G is the bounded, docs/decision-only **Lane-1 `aw_*` SQL isolation spike acceptance / hardening decision
gate** named by Phase 47E §25 (which selected Phase 47F implementation as the next lane and §22.2 as its audit gate).
Its purpose is to **decide whether the merged Phase 47F Lane-1 `aw_*` SQL isolation spike is accepted** as the
bounded, dev/operator-only, disabled-by-default, non-production proof the Phase 47E §8–§18 checklist authorized;
**record what it proves and — critically — what it does not prove**; **assess the five Codex PATCH defect
resolutions**; and **select the next safe lane**, without itself implementing, executing, enabling, or unblocking
anything.

**What this phase is, stated narrowly and exactly.** Phase 47G:

- is **docs / decision-only** — it reads the merged Phase 47F source, evaluates it against the Phase 47E §8–§18
  checklist (Sections A–K) and the §22.2 future Codex checklist, and records the verdict;
- is an **acceptance / hardening decision gate**, *not* an implementation, *not* the authorization-checklist gate
  (47E), *not* the layered-design **direction** gate (47D), *not* the migration-runner blocker-**decomposition** gate
  (47C), and *not* the durable-spike *implementation* (47A);
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
- **authorizes no execution in this PR.** It accepts Phase 47F only as a planning / manifest / safety-proof spike and
  selects a future **separate**, docs-only Phase 47H execution-sink / real-DB boundary decomposition gate before any
  lane may enable `--apply` or inject a real DB sink.

> **Verdict: A — Accept Phase 47F only as a bounded, disabled-by-default, dev/operator-only, non-production,
> location-isolated SQL planning / manifest / safety-proof spike.** The Phase 47F spike satisfies every applicable
> Phase 47E §8–§18 checklist obligation for a *planning-only* spike, resolves all five Codex PATCH defects, and keeps
> the production posture intact (no production-path file changed; the normal runner / packager / startup / canonical
> scope guards are untouched). **Real DB execution is NOT authorized.** `--apply` remains refused, no execution sink
> exists, and no future PR may enable `--apply` or inject a real DB sink until a separate docs-only
> **Phase 47H — Lane-1 `aw_*` SQL execution sink / real-DB boundary decomposition gate** decomposes the execution
> boundary. Lane-1 `aw_*` SQL **execution**, production durable storage, production DB writes, production migration
> execution, Lane-2 canonical Straylight-store migrations, the route-contract / final-schema freeze, and the operative
> ADR-022E gate #8 discharge all **remain blocked**.

This maps to the prompt's recommended **Verdict A / Option A** — *accept Phase 47F as a bounded non-production
planning / isolation spike, do not authorize real DB execution, and select a docs-only Phase 47H execution-sink /
real-DB boundary decomposition gate* — and to the chain convention of a load-bearing decision (the planning /
isolation / safety proof is sufficient and sound) paired with the selection of a single, well-bounded next lane (§16).

**Why not the alternatives.** Verdict **C — Patch Phase 47F** (acceptance evidence insufficient) was genuinely
considered and is the documented fallback the §18 Codex audit triggers if inspection finds a real defect; this read-
only inspection found none (the five Codex PATCH defects are all resolved with grounded tests, §6). **B — accept and
authorize immediate real DB execution next**, **E — jump to production durable storage**, **F — discharge ADR-022E
gate #8**, **G — hand off to Freeside runtime / client integration**, and **H — route-contract / final-schema freeze**
are all **rejected as too early** (§14): each presupposes an execution sink, a production substrate, or a
cross-repo discharge that Phase 47F neither built nor proved. **D — retire Lane-1 SQL and stay JSON-only** remains the
live fallback (the accepted Phase 47A `.json` path), not the chosen forward lane, since Phase 47F demonstrated the
isolation / safety properties the §8–§18 checklist required.

---

## 2. Scope

Phase 47G is **strictly docs/decision-only**. It is the acceptance / hardening-decision rung of the Lane-1 `aw_*` SQL
isolation chain — one rung downstream of the Phase 47F implementation, mirroring the role Phase 47B played for the
Phase 47A `.json` spike. It is **bounded** to:

- intaking the merged Phase 47F implementation accurately (§4);
- assessing Phase 47F against the Phase 47E §8–§18 checklist categories A–K (§5);
- recording the five Codex PATCH defects and their resolution (§6);
- recording what Phase 47F proves (§7) and what it does **not** prove (§8);
- making the explicit execution-sink-boundary non-authorization (§11), the real-DB non-authorization (§12), and the
  production non-authorization (§13);
- recording the acceptance decision (§9) and remaining hardening debt (§10);
- enumerating options considered (§14), the decision (§15), the next lane (§16), and preserved blocked lanes (§17);
- providing a Codex audit checklist for this gate (§18) and the validation run (§19).

It does **not**, in this PR, implement, build, execute, enable, inject, freeze, or discharge anything (§1). It is the
**Lane-1 SQL analogue of Phase 47B** (which played this role for the Mode 2 `.json` spike): an implement → accept
decision gate that records the proof boundary and selects only a *future separate* lane, never the execution itself.

---

## 3. Source chain

Phase 47G sits at the bottom of an explicit, PR-anchored chain. Each link is read-only input here; none is modified
except the two §19 forward-traceability status notes.

- **Phase 47A / PR #172** — implemented Storage Mode 2 as a **file-backed `.json` snapshot store** (NOT SQL, NOT a
  production DB, NOT `aw_*` schema), off the production migration path. **Not modified.**
- **Phase 47B / PR #173** — durable-spike **acceptance** gate, Verdict A. Accepted Phase 47A as a bounded,
  disabled-by-default, dev/operator-only, **non-production** Mode 2 JSON-snapshot proof. The structural precedent for
  *this* document (implement → accept). **Not modified.**
- **Phase 47C / PR #174** — Lane-1 `aw_*` SQL / migration-runner **blocker-decomposition** gate, Verdict A. **Not
  modified.**
- **Phase 47D / PR #175** — Lane-1 `aw_*` SQL isolation **design** gate, Verdict A. Selected the §18 layered direction
  on paper. **Not modified.**
- **Phase 47E / PR #176** — Lane-1 `aw_*` SQL isolation **authorization-checklist** gate, Verdict A. Converted the 47D
  direction into the hard §8–§18 file:line-grounded checklist and authorized a future, separate-PR, bounded,
  dev/operator-only, disabled-by-default, non-production Lane-1 `aw_*` SQL isolation implementation spike (Phase 47F),
  acceptance-gated on that checklist; carried the §22.2 future Phase 47F Codex audit checklist. **The authorizing
  predecessor; gains a minimal Phase 47G status note (§19).**
- **Phase 47F / PR #177** — the implementation spike, **merged** (commit `ae24ca35`). Added the isolated experimental
  SQL, exact manifest, planner / guard / apply module, explicit dev/operator runner, three focused tests, and the
  runbook. Codex PATCHed five implementation defects; Claude resolved all five; final Codex verdict **ACCEPT**. **The
  subject of this acceptance gate; its runbook gains a minimal Phase 47G status note (§19).**
- **Phases 46S / 46T / PR #164 / #165** — drafted and accepted the durable-store schema / migration design (**13
  `aw_*` tables across 11 subsections**; `schema_final` / `route_contract_final` **false**). The Phase 47F experimental
  DDL realizes a **bounded 3-table subset** of this draft (assertion + supersession-link + tombstone), un-frozen.
  **Not modified, not frozen.**
- **Phase 46N / Candidate D (46M)** — gate #8 bounded **paper** clearing and the split-storage production-adapter
  proposal input. The §17 boundary that keeps Lane-2 canonical migrations and the operative Straylight-side discharge
  blocked. **Not modified.**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner and the
  decision records cited as guardrails (§12 / §17). Cross-repo references, **not edited.**

---

## 4. Phase 47F intake

Phase 47F (PR #177, commit `ae24ca35`) added **9 files, +2439 lines, with zero production-path / vector / fixture
files touched** (confirmed read-only against the commit and the working tree). The implementation is recorded here
accurately:

- **Isolated experimental SQL location.** `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/sql/` —
  under the Admission Wedge spike service tree, **outside** the single production migration directory
  (`src/db/migrations/`, `MIGRATIONS_DIR` at `migrate.ts:23`) the normal forward-only runner scans, and **outside**
  the single source directory the packager (`copy-migrations.mjs`) copies. Two files:
  `0001_aw_isolation_spike_init.sql` (experimental forward DDL) and `0001_aw_isolation_spike_init_down.sql` (the
  reversible cleanup / drop path).
- **Exact manifest.** `aw-sql-isolation-spike/manifest.json` — `spike: "phase-47f-aw-sql-isolation-spike"`,
  `kind: "experimental-dev-operator-only"`, `production: false`, `schemaFinal: false`, plus `forward` and `cleanup`
  allowlist arrays. The strict schema accepts **only** the exact top-level keys (any unknown key fails closed),
  matches `spike` / `kind` / `production` / `schemaFinal` as **exact literals with no coercion**, requires unique and
  disjoint lists, forbids a `_down.sql` in `forward`, and requires every `cleanup` entry to be a `_down.sql`.
- **Planner / guard / apply module.** `aw-sql-isolation-spike/index.ts` (800 lines) — resolves and strictly validates
  the manifest, reconciles the on-disk `.sql` set against the exact allowlist (an unlisted or missing file fails
  closed), enforces lexical path containment **plus** disk-level symlink rejection (`lstat`) and `realpath`
  containment (via `path.relative`, not a string-prefix check), builds a **dry-run plan**, and exposes an
  all-or-nothing `applyIsolationSpikePlan(plan, sink)` through an **injected** sink (a fake in tests; the runner
  injects none). It also exposes a **pure, in-memory** `createSyntheticWriteReducer` modelling identity +
  content-fingerprint replay / conflict semantics. The module imports only `node:` built-ins, names no client, opens
  no connection, and embeds **no** SQL/DDL text of its own.
- **Explicit dev/operator runner.** `app/scripts/aw-sql-isolation-spike-runner.mjs` (124 lines) — the **only** caller.
  Disabled by default; fails closed unless `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED` is exactly `true`
  **and** `NODE_ENV` is not `production`. Default behavior is a **dry-run plan** that opens nothing; `--apply` is
  **refused** ("no client is injected"). It is **never** imported by `server.ts`, **never** mounted by a route gate,
  and **not** wired into any `package.json` lifecycle script.
- **Focused tests.** `aw-sql-isolation-spike.test.ts` (64 cases — gate, strict manifest schema, path containment,
  symlink/realpath containment, storage semantics / bounded `awref:` refs, dev-only replay/conflict reducer, bounded-
  ref enforcement, rollback/recovery, public no-leak, real-spike-root integrity);
  `aw-sql-isolation-runner-isolation.test.ts` (normal runner / packager / startup isolation, proven against the
  **actual** `migrate.ts` / `copy-migrations.mjs` / `server.ts` sources read from disk);
  `aw-sql-isolation-scope-guard.test.ts` (the new module passes the canonical 19-entry denylist with **zero hits** and
  **no allowlist added**; adjacent forbidden paths still fail closed).
- **Runbook.** `docs/admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md` (240 lines).
- **No tracked production-path change.** `migrate.ts`, `copy-migrations.mjs`, `src/db/migrations/*.sql`, `server.ts`,
  `config.ts`, `no-leak.ts`, `scope-guards.test.ts`, the route-vector JSON / validator / README, and the Phase 33E
  fixtures / validator are **unchanged** by Phase 47F (confirmed: none appears in commit `ae24ca35`).

---

## 5. Phase 47E checklist acceptance matrix

For each Phase 47E checklist category A–K, this gate states whether Phase 47F satisfied it and **how** — grounded
read-only against the merged source. Every "Satisfied" below is for a **planning / isolation / safety-proof** spike;
none asserts real DB execution (§8 / §11 / §12).

| § | Category | Verdict | How Phase 47F satisfies it (read-only evidence) |
|---|----------|---------|--------------------------------------------------|
| A (§8) | Migration-location isolation | **Satisfied** | Experimental SQL lives under `aw-sql-isolation-spike/sql/`, outside `src/db/migrations/`; `runner-isolation.test.ts` proves (against the on-disk `migrate.ts`) the production dir holds **no** `aw_*` SQL, the runner uses a non-recursive `readdir(MIGRATIONS_DIR)` that cannot descend into a service subfolder, and no startup path or production default engages the experimental path (A.1–A.5). |
| B (§9) | Manifest-gated runner | **Satisfied** | `manifest.json` is an **exact** allowlist; `index.ts` refuses present-but-unlisted, missing, absolute, traversal, out-of-folder, symlinked, and production-located entries, and the strict schema rejects unknown keys / wrong literals (B.1–B.5). **B.6 limitation preserved**: the module + runbook state explicitly that the manifest protects **only** the experimental runner path and does **not** block the normal `migrate.ts` runner; **B.7**: normal-runner protection comes from **location isolation** (Candidate B), not the manifest. |
| C (§10) | Dev/operator runner command | **Satisfied** | The runner is an **explicit** command, disabled by default, strict `=== 'true'` env gate, production-refused, never on startup, never via server boot (`server.ts` imports it nowhere), and not wired into any `package.json` lifecycle script (C.1–C.7); `runner-isolation.test.ts` pins each of these against the real sources. |
| D (§11) | Normal-runner isolation / hard-deny | **Satisfied (by location, no runner change)** | `migrate.ts` is **unchanged** — no hard-deny was needed because isolation is by **location**; the discovery predicate `f.endsWith('.sql') && !f.includes('_down')` (`migrate.ts:79`) is intact and pinned by test; existing production migrations (`003_schedules.sql` … `015_agent_ecology.sql`) remain discoverable; a misplaced `aw_*.sql` is proven absent from the production dir (D.1–D.5). |
| E (§12) | Packaging / copy isolation | **Satisfied (by location, no copy-script change)** | `copy-migrations.mjs` is **unchanged**; its `.sql`-only copy filter scans only `src/db/migrations`, so the experimental SQL (outside that dir) is never bundled into `dist/db/migrations/`; `runner-isolation.test.ts` reads the actual copy script to prove the filter / location property (E.1–E.4). |
| F (§13) | Startup non-execution | **Satisfied** | `server.ts` startup still calls `await migrate(dbPool)` **once**, inside `if (dbPool)` (`server.ts:303-305`); it never imports the runner or planner (`buildIsolationSpikePlan` / `applyIsolationSpikePlan` / `IsolationSpike*`); the base route gate, the Mode-1 gate, and the durable selector run no experimental SQL; only the explicit dev/operator command can (F.1–F.5). |
| G (§14) | Scope-guard preservation | **Satisfied (strongest outcome — no guard edit)** | The new `.ts` module passes the **canonical 19-entry** `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`) with **zero hits** and imports only `node:` built-ins, so **no denylist entry was removed, no import rule relaxed, and NO per-module allowlist was added**; the SQL text lives only in `.sql` files (which the guard does not scan). `scope-guard.test.ts` re-applies the canonical denylist + the evasion-resistance bar to the new module and to adversarial samples (G.1–G.5). The refinement file remains a 16-entry SUBSET, not the canonical denylist. |
| H (§15) | Storage semantics | **Satisfied (draft, synthetic-only, NOT frozen)** | The experimental DDL is the Phase 46S **draft** shape (`schemaFinal` stays false; manifest refuses `schemaFinal: true`), realized as a bounded **3-table** `aw_isolation_spike_*` family. Every reference column is `VARCHAR(80)` with a `CHECK` pinning a narrow `awref:<kind>:<short-id>` prefix — **no raw payload** (H.1); `assertion_status ∈ {active, superseded}` canonical (H.2); `tenant_ref` / `estate_ref` / `actor_ref` on **every** scoped table (H.3); the in-memory reducer proves idempotent `identical_replay` (H.4) and `conflict` fail-closed (H.5); a Dixie-local inverse supersession link, never a chain rewrite (H.6); a `_down.sql` drop + `aw_isolation_spike_tombstone` cleanup path (H.7); **no final schema freeze** (H.8). |
| I (§16) | Public / private no-leak | **Satisfied** | The spike adds **no** public-response builder and no public surface; `no-leak.ts` is untouched, so the **114 = 114** runtime ↔ validator parity is preserved; the manifest and SQL are private dev/operator artifacts carrying only synthetic labels / opaque refs; no SQL / path / debug / stack leaks (I.1–I.5). |
| J (§17) | Auth / consent / signer non-coverage | **Satisfied (explicit non-coverage)** | The module header + runbook §6 state explicitly that SQL isolation does **not** solve production auth, end-user authorization, signer authority, or consent proof / receipt; each remains its own separately-gated future blocker (J.1–J.5). |
| K (§18) | Rollback / recovery / cleanup | **Satisfied (in-memory / dry-run only)** | `applyIsolationSpikePlan` is all-or-nothing through an injected sink (`begin → applyStatement* → commit`, any throw → `rollback` + wrapped fail-closed error); the reducer's `recordBatch` is atomic (a mid-batch conflict restores the prior snapshot); the `_down` cleanup path exists; recovery is deterministic because the spike persists nothing at runtime (dry-run plan only). **All proven against fakes / in-memory — never a real DB** (K.1–K.5). |

**Net:** every applicable Phase 47E §8–§18 obligation is satisfied **for a planning / isolation / safety-proof spike**.
The rollback / recovery / replay / conflict obligations (K.1–K.4, H.4–H.5) are satisfied against **fake / in-memory**
sinks, **not** a real database — which is exactly the boundary §8, §11, and §12 below make explicit.

---

## 6. Phase 47F Codex PATCH resolution

Codex initially PATCHed Phase 47F for **five** implementation defects; Claude resolved all five; the final Codex
verdict was **ACCEPT**. Each is recorded with its resolution, grounded in the merged `index.ts` and the test suite:

1. **Manifest did not fail closed on present-but-unlisted SQL.** **Resolved.** `reconcileSqlDirAgainstManifest`
   (`index.ts`) reads the on-disk `.sql` set and **fails closed** on any present file the manifest does not list
   (there is **no** "adopt every `.sql` in the folder" fallback) and on any listed file absent on disk. Proven by
   `aw-sql-isolation-spike.test.ts` (Section B fail-closed reconciliation cases).
2. **Path containment was lexical and followed symlinks.** **Resolved.** `resolveRealContainedSqlFile` adds, on top of
   lexical containment, an `lstat`-based **symlink rejection** (so a `sql/*.sql` symlink cannot point at a production
   file), a non-regular-file rejection, and a `realpathSync` + `path.relative` containment check for the spike root,
   the `sql/` dir, the manifest, and each file; the file is re-verified immediately before read. Proven by the
   symlink + realpath containment test block.
3. **Manifest validation was permissive and role confusion was possible.** **Resolved.** `validateManifestSchema` is
   **exact / literal / role-aware**: only the allowed top-level keys; `spike` / `kind` / `production` / `schemaFinal`
   matched as exact literals with **no coercion**; duplicate detection within and across lists; `forward` / `cleanup`
   **disjoint**; a `_down.sql` may never appear in `forward`, and every `cleanup` entry must be a `_down.sql`. Proven
   by the strict-manifest-schema test block (Codex defect #3).
4. **DDL refs were unbounded and actor scope was missing from supersession / tombstone.** **Resolved.** Every
   reference column is `VARCHAR(80)` with a `CHECK` pinning a narrow `awref:<kind>:<short-id>` shape; `actor_ref`
   (with its own `awref:actor:` `CHECK`) is now present on the assertion table, the supersession-link table, **and**
   the tombstone table. The in-memory reducer mirrors the same bounded `awref:` shape (`SYNTHETIC_REF_MAX_LENGTH = 80`)
   so raw material cannot enter the model. Proven by the storage-semantics and bounded-ref-enforcement test blocks.
5. **Replay / conflict behavior was absent.** **Resolved.** `createSyntheticWriteReducer` is a **pure in-memory**
   reducer with typed outcomes: a first write → `applied`; an exact retry → `identical_replay` (an explicit no-op, not
   a generic duplicate failure); a conflicting replay (same identity, different material) **throws and records
   nothing** (`IsolationSpikeReplayConflictError`); `recordBatch` is **atomic** (a mid-batch conflict rolls the whole
   batch back). Proven by the dev-only replay/conflict reducer test block (Codex defect #5).

**Assessment.** All five defect resolutions are present in the merged source and exercised by grounded tests. This
inspection found **no** unresolved defect and **no** regression introduced by the patches — consistent with the final
Codex ACCEPT.

---

## 7. What Phase 47F proves

Phase 47F proves **only** the following — each a planning / isolation / safety property, none an execution property:

- **Isolated experimental SQL can exist outside production migration discovery** — the experimental `.sql` lives
  outside `src/db/migrations/`, and the normal `migrate(dbPool)` runner (non-recursive `readdir`) can neither discover
  nor execute it, with **no change** to `migrate.ts`.
- **The manifest and path guards can fail closed** — an unlisted, missing, absolute, traversal, out-of-folder,
  symlinked, non-regular, or production-located entry is refused; the strict schema rejects unknown keys / wrong
  literals; reconciliation rejects an unlisted-on-disk `.sql`.
- **Bounded opaque-reference DDL can be designed for a dev/operator spike proof** — `VARCHAR(80)` + `awref:` `CHECK`
  constraints + `active`/`superseded` status + tenant/estate/actor scope on every scoped table, as a **draft**
  (`schemaFinal` false), realized as an obviously-experimental `aw_isolation_spike_*` family.
- **Pure in-memory replay / conflict semantics can be modelled** — `planned` / `applied` / `identical_replay` /
  fail-closed `conflict`, with atomic batch rollback, against a fake / in-memory reducer.
- **The normal runner, packager, and startup can remain untouched** — `migrate.ts`, `copy-migrations.mjs`, and
  `server.ts` are unchanged; the canonical 19-entry scope guard passes with zero hits and **no** allowlist; the
  114-key no-leak parity is preserved.
- **`--apply` can remain refused while planning is proven** — the runner injects no client, so execution is fail-closed
  while the dry-run plan / manifest / path-guard / reducer behavior is fully exercised.

---

## 8. What Phase 47F does not prove

Phase 47F does **not** prove, and this gate does **not** claim, any of the following:

- **real DB execution** — no statement was ever run against any database;
- **Postgres runtime enforcement** — the `awref:` `CHECK` constraints, the `UNIQUE` constraints, and the status
  `CHECK` are proven only as **DDL text** + an in-memory mirror, never enforced by a live Postgres engine;
- **migration execution against any database** — the spike opens no connection and executes nothing;
- **production migration readiness** — no production migration file, runner change, or packaging change exists;
- **production durable storage** — none is built;
- **production auth** — the dev/operator env gate + dev service-token / operator-id allowlist is **not** production
  authentication;
- **end-user authorization** — there is no end-user authorization model in a dev/operator-only spike;
- **signer authority** — the canonical signer / receipt-signing authority is Straylight-owned and undischarged;
- **consent proof / receipt** — future-gated; the Phase 46S `aw_consent_proof_ref` is deferred; service/operator auth
  is never consent;
- **rollback / recovery on an actual DB** — all rollback / recovery / replay / conflict proofs are against fakes /
  in-memory, never a real database;
- **migration lock / transaction semantics on a real DB** — advisory-lock / transaction behavior on a live engine is
  unproven;
- **the database privilege model** — no role / grant / privilege boundary is exercised;
- **operational secret handling** — no credentials, connection strings, or secret material are involved or proven;
- **production observability** — no audit / metrics / logging on a real execution path is proven;
- **ADR-022E gate #8 discharge** — operatively held (Straylight-owned);
- **route-contract freeze** — `route_contract_final` stays false;
- **final schema freeze** — `schema_final` stays false; the `aw_*` set stays the Phase 46S draft (13 tables across 11
  subsections; the spike realizes a 3-table subset);
- **Freeside integration** — Freeside stays a consumer / handoff surface;
- **Lane-2 canonical Straylight-store readiness** — each a separate sibling-repo ADR under Straylight teammate review.

---

## 9. Acceptance decision

> **Phase 47F is ACCEPTED — as a bounded, disabled-by-default, dev/operator-only, non-production, location-isolated
> SQL planning / manifest / safety-proof spike — and is NOT patched, NOT rejected, and NOT found insufficient.**

The acceptance is **bounded and conditional on its non-execution posture**:

- **Accepted as.** A planning / isolation / safety-proof spike: isolated experimental SQL, an exact fail-closed
  manifest, a symlink/realpath-hardened planner, bounded opaque-reference draft DDL, a pure in-memory replay/conflict
  reducer, an explicit disabled-by-default dev/operator runner with `--apply` refused, and the full §5 A–K checklist
  satisfied **for a planning spike**, with the production posture intact.
- **Not accepted as.** Real DB execution, production storage, a production migration, a route-contract / schema
  freeze, an ADR-022E gate #8 discharge, or any claim that `aw_*` SQL is production-safe — none of which Phase 47F
  built or proved (§8).

The acceptance changes nothing in the repo (this gate is docs-only) and unblocks **no** execution, production, or
freeze work. It records that the Phase 47E §8–§18 checklist obligations are met **for the planning-only spike that was
authorized**, and that the next step is to decompose the **execution boundary** (§11) in a separate docs-only gate
(§16) before any lane may run experimental SQL against any database.

---

## 10. Remaining hardening debt

Accepting the planning spike leaves the following **hardening debt** for any future execution lane to discharge — none
is a Phase 47F defect, each is an inherent limit of a non-execution spike:

- **No live-engine constraint proof.** The `awref:` / status / `UNIQUE` `CHECK` constraints are DDL text + an
  in-memory mirror; a live Postgres engine has never rejected a violating row. A future execution lane must prove the
  constraints fire at runtime.
- **No real transaction / lock semantics.** `applyIsolationSpikePlan`'s `begin/commit/rollback` is a fake-sink
  contract; real transaction isolation, advisory-lock / migration-lock behavior, and partial-failure rollback on a
  live engine are unproven.
- **No real recovery / restart behavior.** Determinism is proven only because the spike persists nothing; durable
  recovery (hydrate-by-replay against a real store) is unproven for SQL.
- **B.6 manifest limitation, carried forward.** The manifest protects only the experimental runner path; normal-runner
  protection is by **location only**. A future hard-deny layer (Candidate E) for `migrate.ts` / `copy-migrations.mjs`
  remains paper-only defense-in-depth, **not** authorized.
- **Schema is a draft subset.** The realized 3-table family is a subset of the 13-table Phase 46S draft; the full
  schema, its finality, and its route-contract are unfrozen and unproven.
- **No execution sink at all.** There is no DB client / sink injection model, env gating for a real target, production
  refusal, privilege model, secret handling, or observability for execution (§11).

---

## 11. Execution sink boundary

This is stated very explicitly, because it is the load-bearing boundary of this acceptance:

- **Phase 47F has no real execution sink.** The planner applies a plan only through an **injected** sink, and the
  runner injects **none** — so the only sinks ever used are fakes / in-memory in tests.
- **`--apply` remains refused.** The runner fails closed on `--apply` ("no client is injected"); execution is
  dry-run / plan-only. **This gate does not authorize `--apply`.**
- **Any future execution lane would need a separate gate** (the selected Phase 47H, §16) to decompose, at minimum:
  - the **DB client / sink injection model** (how a real sink is constructed and injected);
  - the **dev/operator database target** (what database, how scoped, how isolated from production);
  - **env gating** for a real target (a distinct, strict, disabled-by-default gate);
  - **production refusal** (how production execution is made structurally impossible);
  - the **transaction boundary** (per-statement vs per-plan; isolation level);
  - **advisory-lock / migration-lock behavior** on a live engine;
  - the **rollback strategy** on a real DB (partial-failure, fail-closed, no partial admit);
  - the **cleanup / drop strategy** (the `_down` path against a real store; idempotency);
  - the **migration-ledger or non-ledger decision** (whether experimental execution is tracked, and where);
  - the **privilege model** (roles / grants; least privilege for the experimental objects);
  - **no production credential leakage** (secret handling; connection-string boundary);
  - **observability and audit** of a real execution path;
  - the **safety of the down / cleanup DDL** against a real store (irreversible-drop guards);
  - **how to prevent production DB execution** in all environments and defaults;
  - **how to prove the Postgres `CHECK` constraints at runtime** (a live-engine fixture);
  - and **whether execution belongs in Dixie at all before ADR-022E gate #8** is operatively discharged
    (Straylight-owned) — i.e. whether the execution sink is even a Dixie concern, or a Lane-2 / canonical-store
    concern that must wait on the cross-repo gate.

Until Phase 47H decomposes this boundary and a *subsequent* lane is explicitly authorized against it, **no PR may
enable `--apply`, inject a DB client / sink, or run experimental SQL against any database.**

---

## 12. Real DB non-authorization

For the avoidance of doubt: **Phase 47G authorizes no real DB execution.** Specifically, this gate does **not**:

- authorize `--apply`, or any flag / mode that would execute a plan;
- authorize injecting a real DB client, connection, pool, or sink into the runner or planner;
- authorize opening any database connection from the spike;
- authorize running the experimental forward or cleanup DDL against any database (dev, operator, staging, or
  production);
- authorize a production migration, a production migration runner change, or a packaging / copy change;
- claim that Phase 47F proved real DB execution, Postgres runtime enforcement, or live transaction / lock semantics;
- discharge or claim the operative Straylight-owned ADR-022E gate #8.

Real DB execution remains **blocked** behind a future, separate, explicitly-authorized lane that must first pass the
Phase 47H execution-sink / real-DB boundary decomposition gate (§16) and its own Codex audit.

---

## 13. Production non-authorization

Phase 47G makes **no** production claim and authorizes **no** production work. It does **not**:

- declare Lane-1 `aw_*` SQL production-ready, production-safe, or implementation-ready for production;
- authorize production durable-store implementation, production DB writes, or production migration execution;
- freeze the route contract (`route_contract_final` stays false) or the final schema (`schema_final` stays false);
- authorize Freeside runtime / client integration;
- authorize Lane-2 canonical Straylight-store migrations;
- authorize public response expansion or raw candidate payload persistence;
- discharge the operative Straylight-side ADR-022E gate #8 (the dominant cross-repo blocker for production admission
  and any Lane-2 canonical-store migration).

The accepted Phase 47F spike is **not** production storage, is **not** a production DB write path, and does **not**
imply any production readiness. Safety of real execution is exactly what a future lane must *prove*, not what this
acceptance asserts.

---

## 14. Options considered

Each option is enumerated and evaluated, not implemented.

### Option A — Accept Phase 47F as a bounded non-production planning / isolation spike; select a docs-only Phase 47H execution-sink / real-DB boundary decomposition gate. **SELECTED.**

- **Would authorize.** Nothing implementable in this PR. It accepts Phase 47F as the planning / isolation / safety
  proof the Phase 47E §8–§18 checklist authorized, records the proof boundary, and selects a future **separate**,
  docs-only Phase 47H gate to decompose the execution-sink / real-DB boundary **before** any lane may enable `--apply`
  or inject a real sink.
- **Still blocks.** All real DB execution; `--apply`; production durable storage / DB writes / migration execution;
  Lane-2 canonical migrations; the route-contract / final-schema freeze; the operative ADR-022E gate #8 discharge
  (§17).
- **Risks.** Low — paper only. The Phase 47F evidence is sound (§5 / §6 / §7), so acceptance loses no ground; the
  execution boundary stays explicitly future-gated (§11).
- **Verdict.** **SELECTED (§15 / §16).**

### Option B — Accept Phase 47F and authorize immediate real DB execution implementation next. **REJECTED (too early).**

- **Risks.** Disqualifying now. There is no decomposed execution-sink boundary (§11): no DB client / sink model, no
  dev/operator target, no production-refusal proof, no privilege / secret / observability model, and no resolution of
  whether execution belongs in Dixie at all before the operative ADR-022E gate #8. Authorizing execution without that
  decomposition would skip the same kind of boundary gate (47C → 47D → 47E) that disciplined the isolation lane.

### Option C — Patch Phase 47F because acceptance evidence is insufficient. **NOT SELECTED (documented fallback).**

- **Would authorize.** Nothing; it would return Phase 47F for a fix.
- **Risks.** This read-only inspection found the five Codex PATCH defects all resolved (§6), the §5 A–K matrix
  satisfied for a planning spike, and no regression. Patching is the fallback the §18 Codex audit triggers **only if**
  an inspection finds a real defect; none was found.
- **Verdict.** **Not selected**, retained as the documented fallback.

### Option D — Retire Lane-1 SQL and stay JSON-only dev/operator storage. **NOT SELECTED; remains the live fallback.**

- **Would authorize.** Nothing new; the accepted Phase 47A `.json` Mode 2 spike (47B) remains the durable
  route-storage mechanism.
- **Risks.** Low; it does not advance the SQL question but loses no ground. It remains the live fallback any future
  execution lane must take if it cannot satisfy the Phase 47H execution boundary without weakening the production
  posture.
- **Verdict.** **Not selected as the forward lane.**

### Option E — Jump to production durable storage. **REJECTED.**

- **Risks.** Disqualifying. Production durable storage requires the operative Straylight-side ADR-022E gate #8
  discharge (held — §17), production DB writes, and a final schema; none is authorized.

### Option F — Discharge ADR-022E gate #8. **REJECTED.**

- **Risks.** Disqualifying. Gate #8 is Straylight-owned and operatively held; no Dixie docs-only acceptance gate can
  discharge it.

### Option G — Hand off to Freeside runtime / client integration. **REJECTED (now).**

- **Risks.** Out of scope. Freeside stays a consumer / handoff surface; its integration is a separate future gate.

### Option H — Route-contract freeze / final schema freeze. **REJECTED.**

- **Risks.** Disqualifying. `route_contract_final` and `schema_final` stay false; nothing in this chain authorizes a
  freeze, and Phase 47F is an explicit non-final draft.

---

## 15. Decision

Phase 47G **accepts the merged Phase 47F Lane-1 `aw_*` SQL isolation spike** as a bounded, disabled-by-default,
dev/operator-only, non-production, location-isolated **SQL planning / manifest / safety-proof** spike (Verdict A,
Option A). It finds that Phase 47F:

- satisfies every applicable Phase 47E §8–§18 checklist obligation **for a planning-only spike** (§5);
- resolves all five Codex PATCH defects with grounded tests (§6);
- proves the isolation / manifest / path-guard / draft-DDL / in-memory-replay / `--apply`-refused properties (§7);
- and keeps the production posture intact — no production-path file changed; the normal runner / packager / startup /
  canonical scope guards / no-leak parity are untouched (§4).

This acceptance is **bounded and future-gated**. It does **not** authorize real DB execution (§12), does **not**
enable `--apply` or inject a sink (§11), does **not** claim any production readiness (§13), does **not** freeze the
route contract or the final schema, and does **not** discharge any Straylight-side gate. The next step is a separate,
docs-only gate that decomposes the execution-sink / real-DB boundary (§16). Until that gate and a subsequent
explicitly-authorized lane, **no PR may run experimental SQL against any database.**

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

## 16. Next lane

> **Selected next lane: Phase 47H — Lane-1 `aw_*` SQL execution sink / real-DB boundary decomposition gate (a
> *separate*, docs / decision-only gate).**

Phase 47H must be **docs / decision-only**. It **decomposes** what must be true before any future PR may add a real
execution sink, enable `--apply`, inject a DB client, or run experimental SQL against any database — i.e. it turns the
§11 execution-sink-boundary list into an enumerated, file:line-grounded blocker decomposition (and, if and only if the
decomposition is precise enough, a future authorization checklist for a *later, separate* execution lane). Phase 47H
**should not itself implement real DB execution, enable `--apply`, inject any sink, or open any connection.**

Stated clearly so the next lane carries no ambiguity:

- **Phase 47H is not real DB execution.**
- **Phase 47H is not `--apply` authorization.**
- **Phase 47H is not production storage, a production migration, or a schema / route-contract freeze.**
- **Phase 47H is not an ADR-022E gate #8 discharge.**
- **Phase 47H is docs-only** unless a *subsequent* gate's evidence justifies otherwise.

**Not selected:** authorize immediate real DB execution (Option B); production durable-store implementation (Option E);
gate #8 discharge (Option F); Freeside integration (Option G); any freeze (Option H); any execution / `--apply` /
sink-injection **in this PR**. The accepted Phase 47A `.json` path (Option D) remains the live fallback if a future
execution lane cannot satisfy the Phase 47H boundary without weakening the production posture.

---

## 17. Preserved blocked lanes

Regardless of verdict, the following remain **blocked** after Phase 47G — **none** is unblocked by this acceptance
gate:

- **Lane-1 `aw_*` SQL real DB execution** — no execution sink exists; `--apply` is refused; blocked behind Phase 47H
  and a subsequent authorized lane;
- **`--apply` / DB client / sink injection** — blocked;
- **production migration files / executable production schema** — blocked;
- **production migration execution** — blocked;
- **production DB writes** — blocked;
- **production durable-store implementation** — blocked;
- **migration runner changes** (`migrate.ts`) — blocked; the Candidate E hard-deny layer stays paper-only
  defense-in-depth, not authorized;
- **packaging / copy-runner changes** (`copy-migrations.mjs`) — blocked;
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

> **Why this does not imply production readiness.** Accepting a bounded planning / isolation / safety-proof spike
> unblocks **no** execution / production / public / canonical-store / Freeside / LLM / package / freeze / real-DB work.
> Phase 47G accepts only what Phase 47F *proved* — that isolated experimental SQL can exist outside production
> discovery, that the manifest / path guards fail closed, that bounded draft DDL and in-memory replay/conflict
> semantics can be modelled, and that `--apply` stays refused — and explicitly future-gates the execution boundary
> (§11) behind Phase 47H. Every lane above remains its own separately-authorized future gate.

---

## 18. Codex audit checklist

This checklist audits **this Phase 47G PR** — the docs-only acceptance / hardening decision gate. Every item must be
ACCEPT; any REJECT blocks acceptance of this Phase 47G PR.

```text
PHASE 47G — LANE-1 aw_* SQL ISOLATION SPIKE ACCEPTANCE / HARDENING DECISION GATE CODEX AUDIT CHECKLIST
(docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47G PR)

[ ] 1.  Scope is docs-only — Phase 47G adds only this document plus the two §19 forward-traceability status
        notes (in the Phase 47E checklist gate and the Phase 47F runbook); it modifies no runtime source,
        and specifically not migrate.ts, copy-migrations.mjs, any *.sql, the experimental SQL / manifest /
        planner (aw-sql-isolation-spike/*) / runner, no-leak.ts, route-storage-durable-spike.ts,
        route-storage-spike.ts, config.ts, server.ts, or scope-guards.test.ts.
[ ] 2.  No runtime/source changes — no route handler, store/storage code, DB code, migration runner,
        packaging/copy runner, planner, runner, auth, consent, or server-boot change.
[ ] 3.  No test changes — no unit/integration test, scope-guard test, isolation test, or fixture is added
        or modified.
[ ] 4.  No config/env changes — config.ts is untouched and no env gate is added or modified.
[ ] 5.  No package/lockfile changes — package.json and the lockfile are untouched.
[ ] 6.  No CI changes — nothing under .github/ is added or modified.
[ ] 7.  No SQL/migration changes — no .sql file, aw_* schema, executable schema, migration file, or
        migration directory is added or modified.
[ ] 8.  No runner/packaging/copy changes — the runner and copy-migrations.mjs are untouched.
[ ] 9.  No vector/validator/fixture changes — no route-vector JSON, route-vector validator, route-vector
        README, Phase 33E fixture, or fixture validator is added or modified.
[ ] 10. Phase 47F represented accurately (§4) — 9 files / +2439 lines / zero production-path files; isolated
        SQL location, exact manifest, planner/guard/apply module, explicit dev/operator runner, three tests,
        runbook; no tracked production runner/startup/config/package/CI change.
[ ] 11. All five Phase 47F Codex PATCH fixes recorded accurately (§6) — (1) unlisted/missing SQL fail
        closed; (2) symlink/non-regular rejected via lstat + realpath containment; (3) exact/literal/
        role-aware manifest schema with duplicate + disjoint checks; (4) bounded VARCHAR(80) awref: CHECK
        DDL + actor scope on all scoped tables; (5) in-memory replay/conflict reducer with identical_replay,
        typed conflict fail-closed, no partial state, atomic batch rollback.
[ ] 12. Phase 47E checklist matrix (§5) is faithful — each category A–K verdict matches the merged source,
        and every "Satisfied" is for a planning/isolation spike, not real execution.
[ ] 13. No claim of real DB execution — the doc states explicitly that Phase 47F ran nothing against any
        database and proves no Postgres runtime enforcement, transaction/lock, or recovery on a real DB
        (§8 / §10 / §12).
[ ] 14. No claim that --apply is authorized — --apply remains refused; no execution sink exists; this gate
        authorizes no --apply and no sink injection (§11 / §12).
[ ] 15. No production overclaim — no production-readiness, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, production-DB-write, production-migration-execution, Freeside-runtime,
        Lane-2-canonical, or aw_*-SQL-production-safe claim; every such reference is negated / blocked
        (§8 / §12 / §13 / §17).
[ ] 16. Next lane is docs-only — Phase 47H is a docs/decision-only execution-sink / real-DB boundary
        decomposition gate that itself implements no real DB execution and enables no --apply (§16), unless
        a subsequent gate's evidence justifies otherwise.
[ ] 17. Preserved blocked lanes are explicit (§17) — real DB execution, --apply / sink injection, production
        migrations / DB writes / migration execution, migration-runner / packager / scope-guard changes,
        Lane-2 canonical migrations, route-contract / final-schema freeze, and the operative ADR-022E gate
        #8 discharge all remain BLOCKED.
[ ] 18. No bad citation regression — no migrate.ts:303-305 citation (migrate.ts is 254 lines); the ungated
        startup migrate is cited as server.ts:303-305.
[ ] 19. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5
        (no sixth vector); self-check 44/44; git diff --check and git diff --cached --check clean (§19).
[ ] 20. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp /
        temp, __pycache__, .pyc, dist, or .claude artifact appears in the Phase 47G working tree.
[ ] 21. No adjacent-repo dirt — no file in loa-straylight or freeside-characters was created or modified by
        Phase 47G.
[ ] 22. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the
        Claude Code memory store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
```

---

## 19. Validation

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47G is
docs/decision-only — it adds only this document (plus the two minimal forward-traceability status notes below) and
mutates no runtime source, test, validator, vector, fixture, migration, or SQL file — so the validators are run only
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
# Docs-only static scans:
git diff --name-only HEAD -- app src package.json package-lock.json '.github/**' '*.sql' 'dist/**' 'build/**'
git status --short --untracked-files=all | grep -E '\.sql$|migration|migrations|aw_'
git status --short --untracked-files=all | grep -iE 'MEMORY|memory|grimoire|__pycache__|\.pyc|generated|tmp|temp|\.claude|dist'
# Overclaim scan (interpret: negated blocked-lane references are fine; positive claims are not):
grep -RInE 'production ready|production readiness|route-contract freeze|final schema freeze|ADR-022E.*discharged|production migration execution authorized|production DB writes authorized|durable production storage authorized|Freeside runtime|Lane-2 canonical|aw_\* SQL.*production-safe|real DB execution authorized|--apply authorized|ready to implement|implementation-ready' \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md \
  docs/admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md
```

**Recorded results for this lane** (run during authoring; full output accompanies the operator run report):

- **docs-only scope** — only the new file `docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md` is
  added, plus the two minimal forward-traceability status notes (list below); no runtime source (and specifically not
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
- **overclaim scan** — every match is a **negated / blocked** reference (e.g. "route-contract freeze — blocked",
  "final schema freeze — blocked", "Lane-2 canonical … remain blocked", "Freeside runtime / client integration —
  blocked", "production readiness … not claimed", "no claim that `aw_*` SQL is production-safe", "`--apply` remains
  refused"); there is **no** positive authorization or safety claim;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–19 exactly once each.

**Forward-traceability status notes added (§19 scope):**

- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md` — a one-line Phase 47G status note
  recording that the Phase 47F implementation (PR #177) was accepted (Verdict A) as a bounded non-production planning /
  isolation spike, with real DB execution still blocked.
- `docs/admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md` — a one-line Phase 47G status note recording the
  downstream acceptance and that `--apply` / real DB execution remain blocked behind Phase 47H.

**Corruption / duplicate guard** (carried from the 46I–47F precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 19.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §18 Codex audit
  checklist (a `text` block) and the §19 validation command list (a `bash` block). **No fenced block is an executable
  migration or runnable schema.**
