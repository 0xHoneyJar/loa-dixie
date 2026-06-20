# Phase 47I — Lane-1 `aw_*` SQL execution sink implementation-authorization checklist gate

> **Phase**: 47I
> **Branch context**: `phase-47i-aw-sql-execution-sink-authorization-checklist-gate`
> **Related**: Phase 47H (PR #179,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-BOUNDARY-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-BOUNDARY-GATE.md))
> **decomposed** the Lane-1 `aw_*` SQL execution-sink / real-DB boundary (Verdict A) into its §5–§18 prerequisite
> classes — the five sink forms, the non-execution baseline, DB-client/sink injection, the apply-mode gate,
> database-target isolation, runner/startup/packaging isolation, transaction/lock/idempotency, cleanup/down-migration,
> the real-engine `CHECK` proof, privilege/secret, observability/audit, the auth/consent/signer non-coverage, the
> ADR-022E/Lane-2 boundary, and the §18 future-evidence checklist — **kept implementation BLOCKED**, and **selected this
> Phase 47I** docs-only implementation-authorization checklist gate (47H §21) as the next lane; Phase 47G (PR #178,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md))
> **accepted** (Verdict A) the merged Phase 47F spike as a bounded, disabled-by-default, dev/operator-only,
> **NON-PRODUCTION**, location-isolated SQL **planning / manifest / safety-proof** spike and recorded that real DB
> execution is **NOT** authorized; Phase 47F (PR #177, commit `ae24ca35`,
> [`admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md))
> **implemented** the bounded experimental `aw_*` SQL planning / manifest / safety-proof spike (`--apply` refused);
> Phase 47E (PR #176,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md))
> converted the §18 layered design **direction** into the hard §8–§18 file:line checklist that acceptance-gated Phase
> 47F — **this gate is the execution-sink analogue of Phase 47E, one frontier deeper** (it converts the Phase 47H
> *execution-sink decomposition* into a hard implementation-authorization checklist exactly as 47E converted the 47D
> isolation *design direction*); Phase 47D (PR #175) **selected** the layered isolation design direction on paper; Phase
> 47C (PR #174) **decomposed** the Lane-1 `aw_*` SQL / migration-runner blocker and kept Lane-1 SQL BLOCKED; Straylight
> (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); Straylight-repo ADR-022E durable-store gate #8 (+
> sibling gates, **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only execution-sink implementation-authorization checklist gate.** This gate adds
> **only this document** (plus, optionally, the two minimal forward-traceability status notes, §24). It modifies **no**
> runtime source — and specifically does **not** modify `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`,
> `app/src/db/migrations/*.sql`, `app/src/server.ts`, `app/src/config.ts`,
> `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts`, the experimental `.sql` files, the
> `manifest.json`, the `aw-sql-isolation-spike-runner.mjs`, `no-leak.ts`, or `scope-guards.test.ts` — and changes
> **no** route handler, store / storage code, DB write, migration, SQL file, executable schema, migration runner,
> packager, scope guard, auth, consent, route-vector JSON, route-vector validator, route-vector README, Phase 33E
> fixture, fixture validator, other test, package export, config, env, package, lockfile, CI, generated file, or
> binary. No adjacent repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is the Lane-1 `aw_*` SQL execution-sink *implementation-authorization checklist* gate** — the docs-only rung
> Phase 47H §21 named, downstream of the Phase 47H execution-sink **decomposition**. It **turns the Phase 47H §5–§18
> decomposition into a precise, file:line-grounded implementation-authorization checklist and file-scope envelope** and
> **decides whether a later, separate, code-bearing Phase 47J execution-sink spike may be conditionally authorized**.
> **It is not the execution sink, it implements nothing, and it builds nothing.** It **enables no `--apply`, injects no
> DB client / sink, opens no DB connection, performs no DB write, executes no migration, adds no SQL or executable
> schema, changes no migration runner / packager / startup / config, weakens or edits no scope guard, implements no
> auth or consent, changes no route / API behavior, freezes neither the route contract nor the final schema, discharges
> no operative Straylight-side gate, and claims no production readiness.** Real DB execution itself **remains BLOCKED**;
> only a future **separate** code-bearing lane (Phase 47J), **acceptance-gated on the checklist in §8–§21**, is
> conditionally authorized — and it remains blocked from production / Lane-2 / freeze / gate-#8 work in full (§22).

Every statement below is grounded **read-only** against the actual Dixie repo at authoring time (HEAD `d7f106a5`, the
Phase 47H merge commit, so the source matches exactly what Phase 47H read): the planner / guard / apply module
`app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts` (800 lines — the injected
`IsolationSpikeStatementSink` interface `begin` / `applyStatement` / `commit` / `rollback` at `index.ts:124-129`, the
dry-run `buildIsolationSpikePlan` at `index.ts:543`, the all-or-nothing `applyIsolationSpikePlan(plan, sink)` at
`index.ts:568` (body `index.ts:568-593`), the dev/operator gate `assertDevOperatorGateOpen` at `index.ts:228-235`, the
fail-closed `IsolationSpikeReplayConflictError` at `index.ts:191-201`, the in-memory `createSyntheticWriteReducer` at
`index.ts:746` with `SYNTHETIC_REF_MAX_LENGTH = 80` at `index.ts:604`, atomic `recordBatch` snapshot/restore at
`index.ts:777-793`); the exact allowlist `aw-sql-isolation-spike/manifest.json` (13 lines); the experimental forward /
cleanup DDL `aw-sql-isolation-spike/sql/0001_aw_isolation_spike_init.sql` (111 lines, a **3-table**
`aw_isolation_spike_*` family — assertion + supersession-link + tombstone; `UNIQUE (tenant_ref, estate_ref, actor_ref,
assertion_ref)` at forward SQL `:63-64`) and `…_down.sql` (16 lines — `DROP TABLE IF EXISTS` for tombstone,
supersession_link, assertion in reverse order); the explicit dev/operator runner
`app/scripts/aw-sql-isolation-spike-runner.mjs` (124 lines — `--apply` refused at `runner :101-107`, the dry-run plan
at `runner :110`, the minimal step summary at `runner :112-118`, the `--direction=cleanup` plan at `runner :29`). The
**unchanged** production path is read read-only: the migration runner `app/src/db/migrate.ts` (**254 lines** —
`MIGRATIONS_DIR` at `migrate.ts:23`, non-recursive discovery `f.endsWith('.sql') && !f.includes('_down')` at
`migrate.ts:79` (`discoverMigrations()` `migrate.ts:76-85`), the apply loop `migrate.ts:199-240`, the per-file
`BEGIN`/`COMMIT`/`ROLLBACK` at `migrate.ts:220/:226/:230`, the `_migrations` tracking ledger at `migrate.ts:46-55`, the
advisory lock `computeAdvisoryLockKey('dixie-bff:migration')` at `migrate.ts:153` / `pg_advisory_lock` at
`migrate.ts:160`); the build-asset packager `app/scripts/copy-migrations.mjs` (`SRC_DIR = src/db/migrations` at
`copy-migrations.mjs:23`, `.sql`-only filter at `:38-40`, predicate `:39`); the conditional startup migrate `await
migrate(dbPool)` inside `if (dbPool)` at **`server.ts:303-305`** (`server.ts` is 773 lines; the base route gate at
`server.ts:655`, the Mode-1 storage gate at `server.ts:678`, the durable selector at `server.ts:691-693`); the env
parsing in `app/src/config.ts` (485 lines; `DATABASE_URL` at `config.ts:340`; the strict `=== 'true'` posture at
`config.ts:455` / `:469-470` / `:480-481`); the runtime no-leak guard `no-leak.ts` (114-key `FORBIDDEN_PUBLIC_KEYS`);
and the Phase 33N static scope guards `scope-guards.test.ts` (19-entry `DURABLE_WRITE_DENYLIST` at `:122-142`, the
forbidden-import test at `:185-198`, `SPIKE_FILES` at `:36`, the evasion-resistance bar at `:231-313`). **The canonical
Straylight `StorageAdapter` interface and the `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes live in the
adjacent `loa-straylight` repository (cross-repo references, not Dixie file:line) and remain Straylight-owned (§19).**

---

## 1. Status

> **Phase 47J status note (forward traceability; added by the Phase 47J implementation lane, §8 / §24).** The
> conditionally-authorized **Phase 47J — Lane-1 `aw_*` SQL execution-sink dev/operator spike** has been implemented
> within the exact §8 file-scope envelope:
> [`admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md).
> It added a pure execution-gate conjunction to the planner module (`index.ts`, still pool-free and `node:`-only), the
> real sink / DB-client / non-production target policy to the explicit runner (`aw-sql-isolation-spike-runner.mjs`,
> outside the guarded `SPIKE_FILES`), the new focused
> `app/tests/unit/admission-wedge-spike/aw-sql-execution-sink-spike.test.ts`, and extended the three existing Phase 47F
> test files. `--apply` is now possible **only** under the full §10 gate conjunction against a strictly-non-production
> target accepted by the §11 policy; the production `DATABASE_URL` stays refused; the migration runner, packager, server
> boot, `config.ts`, scope guard, package, and lockfile are **unchanged**. The §11 target policy was **hardened**
> (beyond the original host-only check) to a **scheme allowlist** (`postgres:`/`postgresql:` only) plus **wholesale
> query-parameter rejection**, so a loopback-looking DSN can no longer launder a wrong protocol or redirect the
> effective network target `pg` uses via `?host=` / `?hostaddr=` / `?port=` / `?ssl*=` (stable non-secret refusal codes
> `TARGET_UNSUPPORTED_PROTOCOL` / `TARGET_HOST_OVERRIDE_UNSUPPORTED` / `TARGET_TLS_FILE_PARAMETER_UNSUPPORTED` /
> `TARGET_QUERY_PARAMETER_UNSUPPORTED`). The execution-sink seam, target policy, gate
> conjunction, and transaction / rollback / conflict semantics are proven with an **injected fake/test sink** in the
> automated unit suite (no external DB is contacted by the suite; no dependency / CI DB service added). **In addition**,
> a **one-off, bounded, non-production operator run** against a **disposable, loopback-only, volume-less, auto-removed
> Postgres 16 container** exercised the §15 real-engine `CHECK` enforcement (R.1–R.6), the §13 transaction / idempotency
> / conflict checklist (all-or-nothing apply, idempotent replay, `UNIQUE`-conflict rollback with no partial admit), and
> the §14 cleanup / down checklist against a **live** engine, with the DSN / password / host / port / DB name redacted
> and absent from runner output (recorded in the Phase 47J runbook §8). This live-engine proof is a **bounded
> dev/operator artifact only** — **not** a CI service, changing **no** dependency / lockfile / package script / config,
> and proving **nothing** about production. **Real production DB
> execution, production migration execution, Lane-2 canonical Straylight-store migrations, the route-contract /
> final-schema freeze, and the operative ADR-022E gate #8 discharge all remain BLOCKED**; Phase 47J claims no production
> readiness and does not claim `aw_*` SQL is production-safe.

Phase 47I is the bounded, docs/decision-only **Lane-1 `aw_*` SQL execution-sink implementation-authorization checklist
gate** named by Phase 47H §21. Its purpose is to take the Phase 47H execution-sink / real-DB boundary **decomposition**
(47H §5–§18) and **convert it into a hard, enumerated, file:line-grounded implementation-authorization checklist and
file-scope envelope**, and to **decide whether that checklist is precise enough to conditionally authorize a future,
separate-PR, bounded, dev/operator/test-only, disabled-by-default, non-production Lane-1 `aw_*` SQL execution-sink
spike (Phase 47J)** — without itself implementing, executing, enabling, injecting, or unblocking anything.

**What this phase is, stated narrowly and exactly.** Phase 47I:

- is **docs / decision-only** — it reads the merged Phase 47F source and the merged Phase 47G / 47H decision gates,
  converts the Phase 47H §5–§18 decomposition into a checkable checklist (§8–§21), and records the verdict;
- is an **execution-sink implementation-authorization *checklist* gate**, *not* an implementation, *not* the
  execution-sink **decomposition** gate (47H), *not* the isolation-spike **acceptance** gate (47G), *not* the
  isolation-spike **implementation** (47F), *not* the isolation **authorization-checklist** gate (47E — which checklisted
  a *different* boundary, the isolation/location boundary; this gate checklists the *execution-sink* boundary), and
  *not* the layered-design **direction** gate (47D);
- does **not** modify runtime source or tests — and specifically does not touch `migrate.ts`, `copy-migrations.mjs`,
  any `*.sql`, the experimental SQL / manifest / planner (`aw-sql-isolation-spike/*`) / runner, `no-leak.ts`,
  `config.ts`, `server.ts`, or `scope-guards.test.ts`;
- does **not** enable `--apply`, inject any DB client / sink, open a DB connection, perform any DB write, or execute any
  migration against any database;
- does **not** add or modify a migration file, SQL file, executable schema, migration runner, or packager;
- does **not** change route / API behavior, the public response shape, or `no-leak.ts`;
- does **not** implement or unblock auth, consent, or a signer model;
- does **not** authorize production admission;
- does **not** freeze the route contract or the final schema;
- does **not** claim production readiness;
- does **not** claim or discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §19 / §22);
- does **not** claim Phase 47F proved real DB execution, that `--apply` is authorized, or that `aw_*` SQL is
  production-safe;
- **authorizes no implementation in this PR.** It authorizes only a future **separate** Phase 47J code-bearing lane,
  **acceptance-gated** on the §8–§21 checklist — and that lane, if it later runs, must itself pass the checklist and its
  own Codex audit before being accepted.

> **Verdict: A — Conditionally authorize a later, separate, code-bearing Phase 47J for a bounded
> dev/operator/test-only execution-sink spike, but only within the exact file-scope envelope (§8), the forbidden
> file-scope (§9), the apply-mode gate conjunction (§10), the database-target policy (§11), the execution-sink design
> constraints (§12), the transaction / cleanup / real-engine / privilege / observability checklists (§13–§17), the
> non-coverage boundaries (§18–§19), the test matrix (§20), and the acceptance evidence (§21) defined here. Phase 47I
> itself remains docs-only and implements nothing.** This read-only inspection confirms the Phase 47F spike still has
> **no** real execution sink (the only sinks ever used are fakes / in-memory in tests; the runner injects none),
> `--apply` is **refused** (`runner :101-107`), and the Phase 47H decomposition (§5–§18) can be stated as a binary,
> file:line-grounded checklist. Real DB execution itself **remains BLOCKED**: a future code-bearing Phase 47J lane is
> **conditionally** authorized — bounded, disabled-by-default, dev/operator/test-only, non-production, exact-scope, and
> acceptance-gated — and **`--apply`, DB client / sink injection, production durable storage, production DB writes,
> production migration execution, Lane-2 canonical Straylight-store migrations, the route-contract / final-schema
> freeze, and the operative ADR-022E gate #8 discharge all remain blocked.**

This maps to the recommended **Verdict A / Option A** — *convert the Phase 47H execution-sink decomposition into a hard
implementation-authorization checklist and conditionally authorize a future, separate, bounded, dev/operator/test-only,
non-production execution-sink spike (Phase 47J), acceptance-gated on that checklist* — and to the chain convention of a
load-bearing decision (here: the decomposition is precise enough to support a binary checklist) paired with the
selection of a single, well-bounded next lane (§7).

**Why not the conservative alternative (Option B).** Option B — keep implementation blocked and require another
docs-only gate before any code-bearing work — was genuinely considered (§6). It would be correct *if* the file-scope
envelope and evidence checklist could not be made precise enough from current repo evidence. They can: the §8–§21
envelope and checklist are binary and grounded in actual repo file:line (the injected sink interface at
`index.ts:124-129`; the all-or-nothing apply at `index.ts:568-593`; the `--apply` refusal at `runner :101-107`; the
unchanged production scan `migrate.ts:76-85` / predicate `migrate.ts:79`; the ungated startup migrate at
`server.ts:303-305`; the `.sql`-only packager `copy-migrations.mjs:38-40`; the production `DATABASE_URL` at
`config.ts:340`; the canonical 19-entry denylist `scope-guards.test.ts:122-142`; the 114-key no-leak parity). The one
degree of freedom Phase 47H deliberately left open — *which* dev/operator/test-only target mechanism a future lane
actually uses (ephemeral containerized Postgres vs an explicitly non-production dev DSN) — does **not** prevent a
precise checklist, because the checklist binds the **proof obligations** the chosen target must satisfy (§11, §13, §15)
rather than pre-selecting a mechanism. Option B is therefore not forced; it is the documented fallback the §23.2 future
Phase 47J Codex checklist itself triggers if Phase 47J cannot satisfy the obligations safely (§6 / §7).

---

## 2. Scope

Phase 47I is **strictly docs/decision-only**. It is the execution-sink implementation-authorization checklist rung of
the Lane-1 `aw_*` SQL chain — one rung downstream of the Phase 47H execution-sink decomposition, playing for the
*execution-sink* boundary the role Phase 47E played for the *isolation* boundary (decompose → hard checklist →
conditionally authorize a future separate code-bearing lane). It is **bounded** to:

- intaking the merged Phase 47F implementation and the merged Phase 47G / 47H decision gates accurately (§3, §4);
- stating the authorization question (§5) and enumerating the options (§6);
- recording the verdict (§7);
- defining the future Phase 47J allowed file-scope envelope (§8) and forbidden file-scope (§9);
- defining the future apply-mode gate conjunction (§10), database-target policy (§11), execution-sink design
  constraints (§12), transaction / lock / idempotency checklist (§13), cleanup / down-migration checklist (§14),
  runtime `CHECK` / real-engine test checklist (§15), privilege / secret / logging checklist (§16), and observability /
  public-surface checklist (§17);
- recording the auth / consent / signer non-coverage (§18) and the ADR-022E / Lane-2 non-coverage (§19);
- defining the future Phase 47J test matrix (§20) and acceptance evidence (§21);
- preserving every blocked lane (§22), providing the Codex audit checklists (§23 — the current docs-only §23.1 and the
  future Phase 47J §23.2), and the validation run (§24).

It does **not**, in this PR, implement, build, execute, enable, inject, freeze, or discharge anything (§1). It is the
**execution-sink analogue of Phase 47E** (which played the design-to-checklist role for the isolation spike): a
decomposition-to-checklist conversion gate that conditionally authorizes only a *future separate* code-bearing lane,
never the execution itself.

---

## 3. Source chain

Phase 47I sits at the bottom of an explicit, PR-anchored chain. Each link is read-only input here; none is modified
except the optional §24 forward-traceability status notes.

- **Phase 47A / PR #172** — implemented Storage Mode 2 as a **file-backed `.json` snapshot store** (NOT SQL, NOT a
  production DB, NOT `aw_*` schema), off the production migration path. **Not modified.** Remains the live Option C
  fallback (§6).
- **Phase 47B / PR #173** — durable-spike **acceptance** gate, Verdict A. **Not modified.**
- **Phase 47C / PR #174** — Lane-1 `aw_*` SQL / migration-runner **blocker-decomposition** gate, Verdict A. **Not
  modified.**
- **Phase 47D / PR #175** — Lane-1 `aw_*` SQL isolation **design** gate, Verdict A. **Not modified.**
- **Phase 47E / PR #176** — Lane-1 `aw_*` SQL isolation **authorization-checklist** gate, Verdict A. The structural
  precedent for *this* gate: it converted a design direction into a hard file:line checklist before a code-bearing
  spike, carrying both a current docs-only Codex checklist and a future implementation Codex checklist. **Not
  modified.**
- **Phase 47F / PR #177** — the isolation implementation spike, **merged** (commit `ae24ca35`, 9 files, +2439 lines,
  zero production-path / vector / fixture files). The subject this gate reads read-only to ground the execution
  boundary. **Not modified; gains an optional Phase 47I status note (§24).**
- **Phase 47G / PR #178** — the isolation-spike **acceptance** gate, Verdict A. Accepted Phase 47F as a bounded
  non-production planning / isolation / safety-proof spike and recorded that real DB execution is NOT authorized. **Not
  modified.**
- **Phase 47H / PR #179** — the execution-sink / real-DB boundary **decomposition** gate, Verdict A. Decomposed the
  execution boundary (§5–§18), kept implementation blocked, and **selected this Phase 47I** (47H §21). **The selecting
  predecessor; gains an optional Phase 47I status note (§24).**
- **Phases 46S / 46T / PR #164 / #165** — drafted and accepted the durable-store schema / migration design (**13
  `aw_*` tables across 11 subsections**; `schema_final` / `route_contract_final` **false**). The Phase 47F experimental
  DDL realizes a **bounded 3-table subset** of this draft (assertion + supersession-link + tombstone), un-frozen.
  **Not modified, not frozen.**
- **Phase 46N / Candidate D (46M)** — gate #8 bounded **paper** clearing and the split-storage production-adapter
  proposal input. The §19 boundary that keeps Lane-2 canonical migrations and the operative Straylight-side discharge
  blocked. **Not modified.**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner and the
  decision records cited as guardrails (§18 / §19). Cross-repo references, **not edited.**

---

## 4. Phase 47H intake

Phase 47H (PR #179, Verdict A) **decomposed** the Lane-1 `aw_*` SQL execution-sink / real-DB boundary into enumerated
prerequisite classes and kept implementation BLOCKED. **Phase 47I accepts this intake as accurate** and converts it
into the §8–§21 checklist. The Phase 47H decomposition recorded:

- **Five execution-sink forms (47H §5).** (1) planning-only manifest / DDL proof — *what Phase 47F is*; (2) fake /
  in-memory sink — *exists only in Phase 47F tests*; (3) test-only DB sink against an ephemeral throwaway database;
  (4) dev/operator DB sink against a non-production database under explicit gates; (5) production DB sink —
  **forbidden** in every environment and default. The boundary is the transition **from forms 1/2 (today) to forms
  3/4**, with the **hard prohibition of form 5** always. Forms 3 and 4 are the *only* candidates a future lane could
  pursue; form 5 is never a candidate.
- **The current non-execution baseline (47H §6).** No sink is constructed anywhere in shipped code;
  `applyIsolationSpikePlan` (`index.ts:568`) requires a `sink` argument and the only callers that pass one are the
  Phase 47F tests (fakes / in-memory); the runner constructs **no** sink and calls only the dry-run
  `buildIsolationSpikePlan` (`runner :110`); `--apply` is **refused** (`runner :101-107`); `index.ts` imports only
  `node:` built-ins; the gate is disabled by default and non-production-refused (`assertDevOperatorGateOpen`
  `index.ts:228-235`, `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED === 'true'` AND `NODE_ENV != production`,
  read only inside the runner, not parsed in `config.ts`).
- **The prerequisite boundary classes (47H §7–§17).** DB client / sink injection (§7 — the spike module must remain
  pool-free and `node:`-only; a real sink must be injected, never imported); apply-mode gate (§8 — `--apply` must
  require a conjunction of independent gates; fail closed); database-target isolation (§9 — only ephemeral / explicitly
  non-production targets; production `DATABASE_URL` at `config.ts:340` forbidden); runner / startup / packaging
  isolation (§10 — `migrate.ts`, `server.ts:303-305`, `copy-migrations.mjs` unchanged; the experimental runner never
  uses `migrate(dbPool)`, the `_migrations` ledger, or the production advisory lock); transaction / lock / idempotency
  (§11); cleanup / down-migration (§12); runtime `CHECK` / real-engine proof (§13 — Phase 47F proved only DDL text + an
  in-memory mirror; no live Postgres has rejected a violating row); privilege / secret (§14); observability / audit
  (§15).
- **Non-coverage and cross-repo boundary (47H §16 / §17).** An execution sink would not by itself solve production
  auth, end-user authorization, consent proof / receipt, signer authority, tenant / estate / actor production identity
  binding, or production-admission readiness; and a Lane-1 Dixie execution-sink proof **cannot** discharge ADR-022E
  gate #8 (Straylight-owned, operatively held) or authorize Lane-2 canonical Straylight-store migrations.
- **The future-evidence checklist (47H §18).** A 13-item checklist — docs-gate acceptance, file-scope envelope,
  env-gate refusal posture, test-only / dev-only DB target policy, no-production-target proof, no-startup-import proof,
  no-production-runner proof, no-packaging proof, no-secret/log-leak proof, transaction/rollback tests, real-engine
  `CHECK` tests, cleanup-safety tests, and Codex acceptance — defined but **NOT satisfied** by 47H.

Phase 47H **authorized no implementation**, enabled no `--apply`, injected no sink, opened no connection, and
discharged no Straylight-side gate. **Phase 47I accepts all of this as accurate** and now converts the §5–§18
decomposition and the §18 future-evidence checklist into the precise, file:line-grounded implementation-authorization
checklist (§8–§21) that a future Phase 47J lane must satisfy.

---

## 5. Authorization question

The question Phase 47I must answer is narrow: **Is the Phase 47H §5–§18 execution-sink / real-DB boundary
decomposition precise enough — as a paper shape — to be turned into a hard, binary, file:line-grounded
implementation-authorization checklist and a bounded file-scope envelope, against which a future, separate,
code-bearing, bounded, dev/operator/test-only, non-production Lane-1 `aw_*` SQL execution-sink spike (Phase 47J) can be
authorized and audited?**

This is the same question Phase 47E answered for the *isolation* spike, one frontier deeper (the *execution* spike).
The answer turns on whether the decomposition's proof obligations can be stated **mechanism-agnostically but
concretely** — i.e. whether the checklist can require *what must be proven* (no production target, conjunctive
apply-mode gating, real-engine `CHECK` enforcement, all-or-nothing transaction, conflict rollback, safe cleanup, no
secret / log leak, no startup / packaging / migration-runner adoption, no public surface expansion) without prematurely
freezing *which target* (an ephemeral containerized Postgres vs an explicitly non-production dev DSN) the future lane
picks.

**Phase 47I finds that it can** (§7). The Phase 47H decomposition is precise about the boundaries that matter
(non-execution baseline, sink-injection model, apply-mode conjunction, target isolation, transaction semantics,
real-engine proof, privilege / secret, observability) and honest about the limits of each (notably that Phase 47F
proved only DDL text + an in-memory mirror, never a live engine). The single open degree of freedom — which
non-production target mechanism the spike uses — is exactly the degree the checklist leaves to the implementer while
binding the proof obligations (§10, §11, §13, §15). The accepted decomposition therefore supports a precise checklist.

---

## 6. Options considered

Each option is enumerated and evaluated, not implemented.

### Option A — Convert the Phase 47H decomposition into a hard checklist and conditionally authorize a future bounded Phase 47J execution-sink spike. **SELECTED.**

- **Would authorize.** Nothing implementable in this PR. It turns the Phase 47H §5–§18 decomposition into the
  file:line-grounded implementation-authorization checklist + file-scope envelope of §8–§21 and **conditionally**
  authorizes a future **separate-PR**, bounded, dev/operator/test-only, disabled-by-default, non-production Lane-1
  `aw_*` SQL execution-sink spike (Phase 47J), **acceptance-gated on that checklist**. Authorizes **no** execution,
  `--apply`, sink injection, DB connection, migration, runner / packager / startup / config change, or guard edit in
  this PR.
- **Still blocks.** All real DB execution; `--apply`; DB client / sink injection; production durable storage / DB
  writes / migration execution; Lane-2 canonical migrations; the route-contract / final-schema freeze; the operative
  ADR-022E gate #8 discharge (§22).
- **Risks.** Low — paper only. It converts the selected decomposition into a concrete, reviewable acceptance bar
  without authorizing anything; the JSON-only fallback (Option C) and another docs-only gate (Option B) remain live if
  Phase 47J cannot satisfy the checklist.
- **Verdict.** **SELECTED (§7).** The checklist *can* be made precise from current evidence (§1 / §5), so the
  conservative Option B is not forced.

### Option B — Require another docs-only gate before any code-bearing work. **Documented fallback, not selected.**

- **Would authorize.** Nothing; it would defer the checklist to a further docs-only gate.
- **Still blocks.** All of Lane-1 `aw_*` SQL execution.
- **Risks.** Low, but it adds a gate without new information — the checklist is already precise enough (§1 / §5).
- **Verdict.** **Not selected**; retained as the documented fallback the §23.2 future Phase 47J Codex checklist itself
  triggers if Phase 47J cannot satisfy the §8–§21 obligations safely.

### Option C — Stop the execution-sink path and keep planning-only forever. **Not selected; remains the live fallback.**

- **Would authorize.** Nothing new; the accepted Phase 47A `.json` Mode 2 spike (47B) remains the durable
  route-storage mechanism, and the Phase 47F planning-only spike stands as the SQL proof.
- **Risks.** Low; it loses no ground but forecloses a path the decomposition shows can be specified safely. Retained as
  the live fallback any future execution lane must fall back to if it cannot satisfy the §8–§21 obligations without
  weakening the production posture.
- **Verdict.** **Not selected as the forward lane.**

### Option D — Jump to production durable storage. **REJECTED (too early).**

- **Risks.** Disqualifying. Production durable storage requires the operative Straylight-side ADR-022E gate #8
  discharge (held — §19), production DB writes, and a final schema; none is authorized.

### Option E — Discharge ADR-022E gate #8. **REJECTED (too early).**

- **Risks.** Disqualifying. Gate #8 is Straylight-owned and operatively held; no Dixie docs-only checklist gate can
  discharge it (§19).

### Option F — Jump to Freeside runtime / client integration. **REJECTED (too early).**

- **Risks.** Out of scope. Freeside stays a consumer / handoff surface; its integration is a separate future gate and
  remains blocked.

### Option G — Route-contract freeze / final schema freeze. **REJECTED (too early).**

- **Risks.** Disqualifying. `route_contract_final` and `schema_final` stay false; nothing in this chain authorizes a
  freeze, and the `aw_*` schema is an explicit non-final draft subset (§4 / §19).

---

## 7. Decision

Phase 47I **converts the Phase 47H §5–§18 execution-sink / real-DB boundary decomposition into the hard,
file:line-grounded implementation-authorization checklist and file-scope envelope of §8–§21** and **conditionally
authorizes a future, separate-PR, bounded, dev/operator/test-only, disabled-by-default, non-production Lane-1 `aw_*`
SQL execution-sink spike (Phase 47J), acceptance-gated on that checklist** (Verdict A, Option A). It finds that:

- the chain is at the **planning-only / fake-sink baseline** (47H §5 / §6): no real execution sink exists, `--apply` is
  refused (`runner :101-107`), and no connection is opened;
- the prerequisites for moving off that baseline can be stated as a precise, binary checklist — the allowed file-scope
  envelope (§8), the forbidden file-scope (§9), the apply-mode gate conjunction (§10), the database-target policy
  (§11), the execution-sink design constraints (§12), transaction / lock / idempotency (§13), cleanup / down-migration
  (§14), real-engine `CHECK` proof (§15), privilege / secret / logging (§16), observability / public-surface (§17), the
  test matrix (§20), and the acceptance evidence (§21);
- an execution sink would **not** by itself solve production auth, end-user authorization, consent, signer authority,
  tenant / estate / actor production identity binding, or production-admission readiness (§18);
- a Lane-1 Dixie execution-sink proof **cannot** discharge ADR-022E gate #8 or authorize Lane-2 canonical
  Straylight-store migrations (§19).

The authorization is **conditional, bounded, mode-contingent, and acceptance-gated**, exactly as the Phase 46U → 46V,
46Z → 47A, and 47E → 47F precedents established:

- **Conditional.** Phase 47J is authorized only to *attempt* a bounded execution-sink spike. It is **accepted only if
  it proves every item in §8–§21** and passes the §23.2 Codex audit. Failure to prove the production-target refusal,
  the conjunctive apply-mode gating, the real-engine `CHECK` enforcement, the all-or-nothing transaction / conflict
  rollback, the safe cleanup, the no-secret/log-leak boundary, the startup / packaging / migration-runner isolation, or
  the unchanged public surface is a **checklist failure** → the spike is **rejected** and Lane-1 `aw_*` SQL execution
  stays blocked.
- **Bounded and non-production.** The authorized spike is **dev/operator/test-only**, **disabled-by-default**,
  **non-production**, against an **ephemeral / explicitly non-production target only** (§11), **never** the production
  `DATABASE_URL` (`config.ts:340`), with **no** production durable storage, **no** production migration execution, **no**
  startup wiring, **no** route-contract freeze, **no** final schema freeze, and **no** ADR-022E gate #8 discharge.
- **Acceptance-gated.** The §23.2 future Phase 47J Codex audit checklist is the gate. Phase 47J is a **separate PR**
  with its own Codex audit; this gate pre-approves no specific implementation and authorizes no file change here.

Rejected here: **authorize execution / `--apply` / sink injection now** (forbidden by scope — this gate builds
nothing); **declare Lane-1 `aw_*` SQL execution ready / safe** (it is neither — the spike must prove it); **modify the
production migration runner / packager / startup / config now** (stays blocked); **freeze the route contract or final
schema** (stays draft / non-final); **discharge gate #8** (operatively held — §19). Options **D / E / F / G** are
rejected as too early (§6); Option **B** (another docs-only gate) is the documented fallback (§6), not the chosen
verdict, because the envelope and checklist *can* be made precise from current evidence (§1 / §5); Option **C**
(planning-only forever) remains the live fallback if Phase 47J cannot satisfy the checklist without weakening the
production posture.

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

## 8. Future Phase 47J allowed file-scope envelope

This section answers **authorization question 4 — the exact file surfaces a future execution-sink spike may touch,
without touching them now.** It applies to the **Phase 47J implementation PR only**, not to this Phase 47I gate (which
touches nothing but this doc + the two §24 notes). **Defining this envelope authorizes no file change in this PR.**

**Potentially allowed in the future Phase 47J implementation PR only (each gated on a proof obligation in §10–§21):**

- `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts` — **modified in place only** if a minimal
  dependency-injection refinement is genuinely needed to inject a real sink through the existing
  `applyIsolationSpikePlan(plan, sink)` seam (`index.ts:568`, sink interface `index.ts:124-129`). It **must remain
  pool-free and `node:`-only**, **must not** import the production DB pool or any module that transitively opens
  `DATABASE_URL`, and **must keep passing the canonical 19-entry `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`)
  with zero hits and no allowlist** (the strongest Phase 47F outcome). The real client / sink is **not** constructed
  here.
- `app/scripts/aw-sql-isolation-spike-runner.mjs` — **modified in place only** to add the explicit dev/operator/test
  execution path: under the §10 gate conjunction it may construct a real sink from an explicitly non-production target
  (§11) and inject it via `applyIsolationSpikePlan(plan, sink)`. This runner is **outside** the guarded `SPIKE_FILES`
  service surface (it lives in `app/scripts/`, not in the scanned `app/src/services/admission-wedge-spike/` tree), so
  the DB-touching code lives **here**, never in `index.ts`. It **must remain** the only caller, disabled-by-default,
  never imported by `server.ts`, never on startup, and not wired into any `package.json` lifecycle script. The current
  `--apply` refusal (`runner :101-107`) may be replaced **only** by the full §10 fail-closed conjunction.
- `app/tests/unit/admission-wedge-spike/aw-sql-isolation-spike.test.ts` — extend existing manifest / path / security /
  storage-semantics / reducer tests (no regression).
- `app/tests/unit/admission-wedge-spike/aw-sql-isolation-runner-isolation.test.ts` — extend the existing
  startup / packaging / production-runner isolation tests.
- `app/tests/unit/admission-wedge-spike/aw-sql-isolation-scope-guard.test.ts` — extend the existing scope-guard
  coverage (proving the new code still passes the canonical denylist with zero hits, no allowlist).
- `app/tests/unit/admission-wedge-spike/aw-sql-execution-sink-spike.test.ts` — **a new** focused test file for the
  execution-sink behavior against a fake / ephemeral target (the §20 test matrix).
- `docs/admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md` — **a new** dev/operator-only runbook (created
  by Phase 47J, **not** now).
- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md` — this document,
  which would gain a Phase 47J forward-traceability status note when Phase 47J runs.

**No additional helper/module/script files are authorized by Phase 47I.** Phase 47J may touch **only the explicitly
named files in this section** — that enumerated list is the **exact, finite, closed** allowed file envelope. Any
additional source file, helper module, runner helper, adapter, utility, or script — **even if** it would be placed
strictly inside the isolated `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/` directory **or** under
`app/scripts/` — requires a **separate docs authorization gate before Phase 47J**; it is **not** casually allowed by
this gate, and Phase 47J **must not** add one absent that separate gate. No new file may be placed in `app/src/` outside
the admission-wedge-spike service envelope.

**Critical scope note.** Phase 47I creates **none** of the files above except **this Phase 47I document** (and the two
minimal §24 notes). In particular Phase 47I **does not create the Phase 47J runbook**, **does not create**
`aw-sql-execution-sink-spike.test.ts`, and **does not modify** `index.ts` or the runner. The list above is a *proposed
future envelope only*.

---

## 9. Future Phase 47J forbidden file-scope

This section answers **authorization question 5 — what file surfaces must remain forbidden even in the future
implementation lane unless separately authorized.** Even in the Phase 47J implementation PR, the following remain
**forbidden unless separately authorized by a later, distinct gate**:

- `app/src/db/migrate.ts` — the production migration runner stays unchanged (254 lines; `MIGRATIONS_DIR` at
  `migrate.ts:23`; predicate `migrate.ts:79`; apply loop `migrate.ts:199-240`; advisory lock `migrate.ts:153-160`;
  `_migrations` ledger `migrate.ts:46-55`). Phase 47J **must not** edit it and **must not** route execution through it.
- `app/scripts/copy-migrations.mjs` — the build-asset packager stays unchanged (`SRC_DIR = src/db/migrations`
  `copy-migrations.mjs:23`; `.sql`-only filter `:38-40`). Experimental SQL must never be bundled into
  `dist/db/migrations/`.
- `app/src/server.ts` — startup stays unchanged; the only startup DB call remains `await migrate(dbPool)` inside `if
  (dbPool)` at `server.ts:303-305`; the spike runner / sink must remain unreachable from boot, the base route gate
  (`server.ts:655`), the Mode-1 storage gate (`server.ts:678`), and the durable selector (`server.ts:691-693`).
- `app/src/config.ts` — **no config / env wiring.** Any future execution opt-in env gate and non-production target
  variable must be read **only inside the runner** (mirroring how `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED`
  is read inside the runner today, **not** parsed in `config.ts`); `config.ts` (485 lines; `DATABASE_URL` at
  `config.ts:340`) stays untouched. **If a future lane wants `config.ts` wiring, it requires a separate docs gate — it
  is not casually allowed here.**
- `app/scripts/aw-sql-isolation-scope-guard` canonical guard — `app/tests/unit/admission-wedge-spike/scope-guards.test.ts`
  is **forbidden** to edit: the canonical 19-entry `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`) and the
  forbidden-import test (`scope-guards.test.ts:185-198`) must remain in force unweakened, with no allowlist and no
  denylist entry removed (mirroring Phase 47F's zero-guard-edit outcome).
- `app/package.json`, `package.json` (repo root — note: no root `package.json` exists today), `package-lock.json` — no
  package / lockfile / script-lifecycle change; the runner must not be wired into any `scripts` `pre*`/`post*`/`build`
  hook.
- `.github/**` — no CI change.
- `app/src/**` outside the admission-wedge-spike service envelope — forbidden unless separately justified.
- Any **unlisted new source / helper / module / script file** — including files placed under
  `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/**` or under `app/scripts/**` — forbidden unless
  separately authorized by a later docs gate. Only the files explicitly named in the §8 envelope are allowed; any other
  new source/helper/module/script file requires a separate docs authorization gate before it may be touched.
- `app/db/**`, `migrations/**`, `supabase/**`, any production migration directory — forbidden.
- `*.sql` outside `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/sql/**` — forbidden; the experimental
  DDL stays exactly the 3-table `aw_isolation_spike_*` family already present (the manifest's exact allowlist).
- `docs/admission-wedge/fixtures/**` — no Phase 33E fixture change.
- `docs/admission-wedge/route-contract-test-vectors/**` — no route-vector JSON / validator / README change.
- Generated / `dist/**` / `build/**` artifacts — forbidden.

And, as standing forbidden surfaces regardless of file: **production migration files**, **production DB writes**,
**production durable-store implementation**, **production migration execution**, **route-contract freeze**
(`route_contract_final` stays false), **final schema freeze** (`schema_final` stays false; no `aw_*` migration is
claimed safe), **ADR-022E gate #8 discharge**, **Freeside runtime / client integration**, **Lane-2 canonical
Straylight-store migrations**, **public response expansion**, **raw candidate payload persistence**, and **package
exports** of the spike.

---

## 10. Future apply-mode gate conjunction

This section answers **authorization question 6 — the gate conjunction required before a future `--apply` could be
enabled in a dev/operator/test-only context.** A future Phase 47J `--apply` (or equivalent execution flag) must be
**impossible** unless **every** independent gate below is present; **any one absent → refuse, fail closed, exit
non-zero, never silently no-op, never fall back to a default target, never partially apply** (the current
`runner :101-107` refusal posture, generalized). The conjunction:

```text
PHASE 47J — FUTURE --apply ENABLEMENT GATE CONJUNCTION
(defined here; NOT enabled here; ALL must be true before any execution; any one absent => fail closed)

[ ] G1.  Base Admission Wedge spike still disabled by default unless explicitly enabled
         (the dev/operator opt-in DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED === 'true',
         read only inside the runner; NOT sufficient on its own to enable execution).
[ ] G2.  A DISTINCT Lane-1 aw_* execution-sink opt-in flag is explicitly enabled
         (DRAFT, NON-FINAL, NOT-ADDED label: DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED === 'true').
         Phase 47I adds, parses, and wires NO such env var; config.ts is untouched; the name is a draft label only.
[ ] G3.  Dev/operator-only mode explicitly enabled; NODE_ENV is not production (production refused).
[ ] G4.  A non-production database target is accepted by the strict §11 target policy.
[ ] G5.  The production DATABASE_URL (config.ts:340) is refused as a target, always.
[ ] G6.  The runner is invoked explicitly (out-of-band dev/operator command), NEVER from startup,
         NEVER via server boot (server.ts:303-305 / :655 / :678 / :691-693), NEVER via a route,
         NEVER via a package.json lifecycle script.
[ ] G7.  The manifest is verified EXACTLY (exact keys; spike/kind/production:false/schemaFinal:false literals;
         disjoint forward/cleanup; _down role consistency; unknown key fails closed).
[ ] G8.  SQL path containment is verified (lexical + lstat symlink rejection + realpath, per index.ts).
[ ] G9.  No unlisted SQL files are present in sql/ (reconciliation fails closed on any unlisted/missing file).
[ ] G10. The down / cleanup path is verified and bounded to the experimental aw_isolation_spike_* family only.
[ ] G11. The dry-run / plan output is safe (direction, step count, byte sizes only; no DSN, no secret).
[ ] G12. No secrets are logged (no DSN echo, no credential/env dump).
[ ] G13. All checks fail closed: a typed error + non-zero exit on any missing gate; never a silent no-op,
         never a default target, never a partial apply.
```

**Draft env labels (named, NOT added).** `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED` (the distinct
execution opt-in) and a non-production target variable in the same family (e.g.
`DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_TARGET_DSN`) are **draft, non-final labels for a future Phase 47J
only**, carried forward from the Phase 47H §8 discussion. **This gate names them only to scope the discussion; it does
NOT add, parse, or wire any such env var, and `config.ts` is untouched.** The existing
`DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED` must remain **insufficient on its own** to enable execution.

---

## 11. Future database target policy

This section answers **authorization question 7 — the database target policy required before any future execution.** A
future Phase 47J execution-sink spike must enforce **all** of the following:

- **No production DB.** The experimental `aw_isolation_spike_*` objects must never be applied to a production database
  in any environment or default.
- **No production `DATABASE_URL`.** The spike must never read or default to the production `DATABASE_URL`
  (`config.ts:340`); it must take an **explicit, distinct** non-production target (draft label
  `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_TARGET_DSN`, §10).
- **No default app DB** unless that DB is **explicitly designated as ephemeral / dev** — there is no implicit fallback
  to any configured application database.
- **Allow only local / test / dev DSNs matching a strict policy** — e.g. `localhost` / `127.0.0.1` / an obviously
  disposable host, never a production host.
- **Require a non-production DB name marker or explicit allowlist** — the target database name must carry a disposable
  marker (e.g. a required prefix / suffix) and/or match an explicit non-production allowlist; absent a match, refuse.
- **Require a least-privilege user** — a role scoped only to create / drop the experimental `aw_isolation_spike_*`
  family on the non-production target; never a production migration / admin role.
- **Forbid secret echo** — no credential, password, or token may be printed or logged.
- **Forbid DSN logging** — the target DSN must never appear on stdout / stderr or in any log; the runner's output stays
  the minimal `runner :112-118` shape (direction, step count, byte sizes).
- **Require explicit refusal examples** — the Phase 47J PR must include tests proving the spike refuses the production
  `DATABASE_URL`, a production-identified DSN, a DSN with no disposable marker, and a missing target (§20).

---

## 12. Future execution sink design constraints

This section converts the Phase 47H §7 DB-client / sink-injection boundary into binding design constraints for a future
Phase 47J spike. The sink is the object passed as `sink` to `applyIsolationSpikePlan(plan, sink)` (`index.ts:568`), a
concrete implementation of `IsolationSpikeStatementSink` (`index.ts:124-129`: `begin` / `applyStatement` / `commit` /
`rollback`). A future Phase 47J must prove:

- **Injection-only.** The real sink is **injected** into `applyIsolationSpikePlan(plan, sink)`; the spike module never
  constructs or imports a pool. `index.ts` stays **pool-free and `node:`-only** and never imports `app/src/db/client.ts`'s
  `DbPool`, the production pool, or any module that transitively opens `DATABASE_URL`.
- **Constructed only in the runner.** The real client / sink is constructed only in the explicit dev/operator runner
  (`app/scripts/aw-sql-isolation-spike-runner.mjs`, outside the guarded `SPIKE_FILES` service surface) from an
  explicitly non-production target (§11), under the §10 gate conjunction — never in `index.ts`, never at module scope,
  never on import.
- **Unreachable from startup / routes / packaging.** `server.ts` continues to never import the spike planner / runner /
  sink (its only DB call stays `await migrate(dbPool)` at `server.ts:303-305`); the sink is reachable **only** through
  the explicit out-of-band dev/operator command, never on boot, never via a route, never via a `package.json`
  lifecycle script.
- **Token-clean guarded surface preserved.** The new code must keep the guarded service surface passing the canonical
  19-entry `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`) and forbidden-import test
  (`scope-guards.test.ts:185-198`) with zero hits and **no allowlist / no guard edit** — the DB-touching tokens live
  only in the runner (outside `SPIKE_FILES`) and in the static `.sql` files (which the guard does not scan).

---

## 13. Future transaction / lock / idempotency checklist

This section converts the Phase 47H §11 boundary into a binding checklist. A future Phase 47J spike must prove, against
a real (ephemeral / dev) engine — none of which Phase 47F proved (it proved these only against fakes / in-memory, 47G
§8):

- **T.1 All-or-nothing transaction.** `applyIsolationSpikePlan` already models `begin → applyStatement* → commit`, with
  any throw → `rollback` + a wrapped fail-closed error (`index.ts:568-593`). A real sink must implement these as actual
  DB transaction control: either every statement in the direction commits, or the whole plan rolls back. No partial
  admit may survive.
- **T.2 No production lock reuse.** The experimental sink must **not** reuse the production advisory lock
  (`computeAdvisoryLockKey('dixie-bff:migration')` at `migrate.ts:153` / `pg_advisory_lock` at `migrate.ts:160`); it
  must decide and prove its own locking posture (its own advisory lock, or single-operator-by-construction), justified
  in the PR.
- **T.3 No production ledger write.** The experimental sink must **not** write to the production `_migrations` ledger
  (`migrate.ts:46-55`); idempotency tracking, if any, must use its own clearly-experimental mechanism or rely on the
  idempotent `CREATE TABLE IF NOT EXISTS` / `DROP TABLE IF EXISTS` DDL.
- **T.4 Idempotent replay against a real DB.** Repeated identical application is a no-op (the `IF NOT EXISTS` DDL
  re-runs cleanly; the `UNIQUE (tenant_ref, estate_ref, actor_ref, assertion_ref)` constraint at forward SQL `:63-64`
  rejects a conflicting insert), proven against the real engine — matching the in-memory reducer's `applied` /
  `identical_replay` semantics (`createSyntheticWriteReducer`, `index.ts:746`).
- **T.5 Conflict fails closed and rolls back.** A conflicting write throws and records **nothing** (the reducer's
  `IsolationSpikeReplayConflictError` posture, `index.ts:191-201`); against a real DB a `UNIQUE` violation must roll
  back the enclosing transaction so no partially-admitted recallable assertion survives. The atomic `recordBatch`
  snapshot/restore (`index.ts:777-793`) maps to a single transaction around the batch.

---

## 14. Future cleanup / down-migration checklist

This section converts the Phase 47H §12 boundary into a binding checklist. A future Phase 47J spike must prove:

- **C.1 Cleanup runs only against an ephemeral / dev target.** The `_down.sql` (16 lines: `DROP TABLE IF EXISTS` for
  tombstone, supersession_link, assertion, in reverse order), reachable today only via the dry-run
  `--direction=cleanup` plan (`runner :29`), may be executed **only** against an ephemeral test DB or an explicitly
  non-production dev/operator DB (§11) — **never** production.
- **C.2 Bounded to the experimental family only.** The drop targets exactly the three `aw_isolation_spike_*` tables;
  `IF EXISTS` semantics make a missing object a no-op.
- **C.3 Same gate conjunction as forward execution.** Cleanup execution requires the full §10 conjunction; absent any
  gate it **refuses** (throws, exits non-zero), exactly as forward `--apply` refuses today.
- **C.4 Reversible-by-recreation.** A test proves the forward `CREATE TABLE IF NOT EXISTS` re-creates the family after
  a drop, and that the drop leaves **no production state behind**.
- **C.5 Forward-only runner never auto-runs `_down`.** The production runner ignores `_down` files by construction
  (`migrate.ts:79`); any drop is an explicit dev/operator action through the experimental runner only.

---

## 15. Future runtime `CHECK` / real-engine test checklist

This section converts the Phase 47H §13 boundary into a binding checklist. Phase 47F proved only DDL text + an
in-memory mirror; **no live Postgres engine has ever rejected a violating row** (47G §8). A future Phase 47J spike must
run the forward DDL against a real (ephemeral / dev) engine and prove the **engine** — not just the in-memory mirror —
rejects violations:

- **R.1 Invalid raw payload ref rejected.** A value that is not `awref:payload:<short-id>`, or exceeds `VARCHAR(80)`
  (`SYNTHETIC_REF_MAX_LENGTH = 80`, `index.ts:604`), is rejected by the `candidate_payload_ref` `CHECK`.
- **R.2 Wrong actor ref rejected.** A value that is not `awref:actor:…` is rejected by the `actor_ref` `CHECK` on every
  scoped table (assertion, supersession_link, tombstone).
- **R.3 Overlength ref rejected.** A value exceeding the `{0,59}` body bound / 80-char limit is rejected.
- **R.4 Wrong `awref` kind rejected.** A value of the wrong kind (e.g. `awref:tenant:` where `awref:assertion:` is
  required) is rejected by the column-specific `CHECK`.
- **R.5 Conflict case rejected and rolled back.** A second insert violating `UNIQUE (tenant_ref, estate_ref, actor_ref,
  assertion_ref)` (forward SQL `:63-64`) is rejected and rolls back, with no partial admit.
- **R.6 Status / class `CHECK` fire.** `assertion_status IN ('active','superseded')` and the `assertion_class` `CHECK`
  reject out-of-range values against the live engine.

---

## 16. Future privilege / secret / logging checklist

This section converts the Phase 47H §14 boundary into a binding checklist. A future Phase 47J spike must prove:

- **P.1 No production credentials.** Non-production credentials only; production DB credentials never reach the spike.
- **P.2 No production DB roles.** A least-privileged role scoped to the experimental objects, never a production
  migration / admin role.
- **P.3 Least privilege.** The execution role holds only the privileges required to create / drop the
  `aw_isolation_spike_*` family on the non-production target — no broader grant.
- **P.4 No secret logging.** No credential, connection string, password, or token is logged.
- **P.5 No DSN echo.** The target DSN never appears on stdout / stderr or any log; the runner output stays the minimal
  `runner :112-118` shape.
- **P.6 No env dump.** No environment variable values are dumped.
- **P.7 No migration content leak beyond the known static SQL.** The only statement text is the static `.sql` under
  `aw-sql-isolation-spike/sql/`; no dynamic SQL, no payload-derived SQL, no private material.

---

## 17. Future observability / public-surface checklist

This section converts the Phase 47H §15 boundary into a binding checklist. A future Phase 47J spike must prove:

- **O.1 Minimal operational logs only.** Direction, step count, statement byte sizes, applied / rolled-back outcome
  (the current dry-run `runner :112-118` shape). An "applied N statements against `<non-production target name>`" line is
  acceptable **only** if the target name is a non-secret, non-production, obviously-disposable identifier (§11 / §16).
- **O.2 Nothing sensitive logged.** No credentials, DSNs, raw payloads, raw reasons, private audit internals, signer /
  consent material, stack traces exposing secrets, or env dumps.
- **O.3 Private audit material out of scope.** The canonical `TransitionReceipt` / `AuditEvent` audit-chain material is
  Straylight-owned (cross-repo, §19); this Dixie spike stores only bounded opaque `awref:` references and must never
  persist or log private audit internals.
- **O.4 No public response expansion.** The public response shape stays unchanged and the **114 = 114** runtime ↔
  validator no-leak parity (`no-leak.ts`) is preserved; the route-contract test-vectors (5/5) and the Phase 33E
  fixtures (5/5) stay green; the self-check stays green on its negative mutations. The spike adds **no** public-response
  builder and no public surface.

---

## 18. Future auth / consent / signer non-coverage

For the avoidance of doubt: **a SQL execution sink, even if later implemented, would not by itself solve any of the
production trust boundaries.** A future Phase 47J PR must **explicitly state** each of the following — each remains its
own separately-gated future blocker (§22):

- **Production service auth.** The dev/operator opt-in env gate (and the route's dev `x-admission-service-token` /
  `x-admission-operator-id` allowlist) is **not** production authentication; an execution sink does not make it one.
- **End-user authorization.** A dev/operator-only execution sink has no end-user authorization model.
- **Consent proof / receipt.** Consent proof / receipt remains future-gated (the Phase 46S `aw_consent_proof_ref` is
  **deferred**); service / operator auth is never treated as consent; an execution sink does not establish consent.
- **Signer / authority semantics.** The canonical signer / receipt-signing authority is Straylight-owned and
  undischarged; an execution sink does not confer signer authority.
- **Tenant / estate / actor production identity binding.** The `awref:tenant:` / `awref:estate:` / `awref:actor:`
  references are **synthetic, route-owned opaque labels**; an execution sink does not bind them to production identity.
- **Production admission readiness.** An execution sink against a non-production target proves nothing about production
  admission readiness, which remains blocked behind the cross-repo gate (§19).

---

## 19. Future ADR-022E / Lane-2 non-coverage

The cross-repo dependency, recorded explicitly:

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
  cross-repo gate. This gate **does not resolve** that question; it records it as a precondition the Phase 47J PR must
  address.

---

## 20. Future Phase 47J test matrix

This section answers **authorization question 8 — the test matrix required before any future execution.** A future
Phase 47J spike is **accepted only if** all of the following hold (in addition to the §10–§17 proofs):

```text
PHASE 47J — FUTURE EXECUTION-SINK TEST MATRIX
(defined here; NOT satisfied here; every item is a precondition for the future code-bearing lane)

[ ] M1.  Planner still passes existing manifest / path / security tests (no regression on the Phase 47F suite).
[ ] M2.  Runner still refuses execution without ALL §10 gates present.
[ ] M3.  Production target refused (the production DATABASE_URL, config.ts:340, is rejected as a target).
[ ] M4.  Missing env gates refused (any absent §10 gate => fail closed, exit non-zero).
[ ] M5.  Unsafe DSNs refused (no disposable marker / production host / production identifier => refused).
[ ] M6.  Unlisted SQL refused (a present-but-unlisted .sql in sql/ fails closed).
[ ] M7.  Symlink SQL refused (lstat symlink rejection + realpath containment).
[ ] M8.  Raw payload ref rejected (candidate_payload_ref CHECK fires against the real engine).
[ ] M9.  Wrong awref kind rejected (column-specific CHECK fires).
[ ] M10. Overlength ref rejected (> 80 chars / > the {0,59} body bound).
[ ] M11. Wrong actor ref rejected (actor_ref CHECK on every scoped table).
[ ] M12. Conflict rollback verified AGAINST the execution sink (UNIQUE violation rolls back; no partial admit).
[ ] M13. Identical replay verified (idempotent no-op against the real engine; IF NOT EXISTS re-runs clean).
[ ] M14. Cleanup / down safety verified (drop runs only on ephemeral/dev; reversible-by-recreation; no prod state).
[ ] M15. No startup import (server.ts never imports the sink/runner; startup runs no experimental SQL).
[ ] M16. No production migrator use (migrate.ts unchanged; execution never via migrate(dbPool)/_migrations/lock).
[ ] M17. No packaging / copy inclusion (copy-migrations.mjs unchanged; experimental SQL never in dist/db/migrations).
[ ] M18. No public response expansion (public shape unchanged; 114 = 114 no-leak parity preserved).
[ ] M19. No secret / log leak (no DSN echo, no credential/env dump, no secret in logs).
```

---

## 21. Future Phase 47J acceptance evidence

This section answers **authorization question 9 — the safety / evidence checklist required before any future
execution.** Before a Phase 47J PR can be accepted, **all** of the following evidence must exist and be green (in
addition to the §20 test matrix and the §10–§17 proofs):

```text
PHASE 47J — FUTURE ACCEPTANCE EVIDENCE
(defined here; NOT produced here; each item must be demonstrably true before the Phase 47J PR is accepted)

[ ] E1.  App typecheck clean.
[ ] E2.  App lint clean.
[ ] E3.  Targeted Phase 47J tests green (the §20 matrix, incl. the new aw-sql-execution-sink-spike.test.ts).
[ ] E4.  Existing Phase 47F / 47G / 47H guard tests green (isolation / runner-isolation / scope-guard, unchanged).
[ ] E5.  Fixture validator 5/5 (node docs/admission-wedge/fixtures/validate-fixtures.mjs).
[ ] E6.  Route-vector validator 5/5 (no sixth vector).
[ ] E7.  Route-vector self-check 44/44 (or the then-current expected equivalent).
[ ] E8.  No dist / build artifacts in the diff.
[ ] E9.  No non-doc accidental changes outside the exact §8 envelope; no §9 forbidden surface touched.
[ ] E10. Codex acceptance — the Phase 47J PR passes its own §23.2 Codex audit with no unresolved defect.
```

Until **every** item in §10–§21 is true and accepted, **no** execution-sink implementation is authorized.

---

## 22. Preserved blocked lanes

This section answers **authorization question 10 — what remains outside Phase 47J even if it is later authorized, and
what remains blocked in Phase 47I itself.** Regardless of verdict, the following remain **blocked** after Phase 47I —
**none** is unblocked by this checklist gate, and **none** is in scope for Phase 47J even if Phase 47J is later
authorized:

- **Lane-1 `aw_*` SQL real DB execution** — no execution sink exists; `--apply` is refused; conditionally authorized
  only for a future, separate, bounded, dev/operator/test-only, non-production Phase 47J lane (§7 / §8), acceptance-gated
  and mode-contingent;
- **`--apply` enablement** — blocked in this PR; only a future Phase 47J lane, under the full §10 gate conjunction, may
  enable it;
- **DB client / sink injection** — blocked in this PR; injection-only and runner-constructed in a future Phase 47J lane
  (§12);
- **production DB target** — blocked; the production `DATABASE_URL` (`config.ts:340`) is never an execution target,
  even in Phase 47J;
- **production migration files / executable production schema** — blocked;
- **production migration execution** — blocked;
- **production DB writes** — blocked;
- **production durable-store implementation** — blocked;
- **migration runner changes** (`migrate.ts`) — blocked;
- **packaging / copy-runner changes** (`copy-migrations.mjs`) — blocked;
- **startup mutation** (`server.ts`) — blocked; the only startup DB call stays `await migrate(dbPool)` at
  `server.ts:303-305`;
- **config / env wiring** (`config.ts`) — blocked; any future execution opt-in / target var is read only inside the
  runner, never parsed in `config.ts`, unless a separate docs gate authorizes it;
- **scope-guard weakening / editing** (`scope-guards.test.ts`) — blocked; the canonical 19-entry denylist stays in
  force unedited, even in Phase 47J;
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

**Candidate D / ADR-022E boundary preserved.** Candidate D (split-storage) remains **proposal input / design baseline,
not implemented production architecture**; Phase 46N's gate #8 clearing remains a **bounded Dixie documentation /
architecture / handoff prerequisite only**; the operative Straylight-side discharge remains blocked. The canonical
Straylight `StorageAdapter` interface and the `Assertion` / `TransitionReceipt` / `AuditEvent` shapes stay
Straylight-owned (cross-repo).

> **Why this does not imply production readiness (authorization question 10).** Converting the Phase 47H execution-sink
> decomposition into a checklist and conditionally authorizing a bounded future Phase 47J lane unblocks **no**
> execution / production / public / canonical-store / Freeside / LLM / package / freeze / real-DB work in this PR.
> Phase 47I only *names and orders* the prerequisites and conditionally authorizes a *future, separate, bounded,
> dev/operator/test-only, non-production* code-bearing lane, and **only if** that lane proves every §10–§21 item
> without weakening the production posture. The decomposition is **not** implementation-ready, **not** production-ready,
> and **not** safe-by-assertion — safety is exactly what the future spike must *prove*. Every lane above remains its
> own separately-authorized future gate.

---

## 23. Codex audit checklist

Phase 47I carries **two distinct Codex audit checklists**, kept deliberately separate. **§23.1** is the **current**
checklist that audits *this* docs-only Phase 47I gate — the PR being read now. **§23.2** is the **future** checklist
that the later, separate Phase 47J implementation PR must copy verbatim and run against *that* implementation. §23.1
audits **this document**; §23.2 audits the implementation that **does not exist yet**.

### 23.1 Phase 47I Codex audit checklist — current docs-only gate

This checklist audits **this Phase 47I PR** — the docs-only execution-sink implementation-authorization checklist gate.
Every item must be ACCEPT; any REJECT blocks acceptance of this Phase 47I PR.

```text
PHASE 47I — LANE-1 aw_* SQL EXECUTION-SINK IMPLEMENTATION-AUTHORIZATION CHECKLIST GATE CODEX AUDIT CHECKLIST
(current docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47I PR)

[ ] 1.  Docs-only scope — Phase 47I adds only this document plus, optionally, the two §24 forward-traceability
        status notes (in the Phase 47H boundary gate and the Phase 47F runbook); it modifies no runtime source,
        and specifically not migrate.ts, copy-migrations.mjs, any *.sql, the experimental SQL / manifest /
        planner (aw-sql-isolation-spike/*) / runner, no-leak.ts, config.ts, server.ts, or scope-guards.test.ts.
[ ] 2.  No runtime/source/test/config/package/CI/SQL/migration/vector/validator/fixture changes — no route
        handler, store/storage code, DB code, migration runner, packaging/copy runner, planner, runner, auth,
        consent, server-boot, unit/integration test, scope-guard test, isolation test, fixture, route-vector
        JSON, route-vector validator, route-vector README, config.ts, env gate, package.json, lockfile,
        .github/ CI, .sql, aw_* schema, executable schema, migration file, or migration directory is added/modified.
[ ] 3.  No real DB execution authorization in Phase 47I — the doc states explicitly that Phase 47I authorizes no
        execution against any database in this PR (§1 / §7 / §22); --apply remains refused (runner :101-107).
[ ] 4.  Future Phase 47J authorization is bounded, non-production, dev/operator/test-only, and exact-scope only —
        conditional, acceptance-gated, mode-contingent; not present-tense execution authorization (§7 / §8 / §10).
[ ] 5.  No production DB target authorization — the production DATABASE_URL (config.ts:340) is never an execution
        target, even in Phase 47J; the §11 target policy forbids it (§9 / §11).
[ ] 6.  No production migration execution — blocked (§9 / §22).
[ ] 7.  No production durable storage — blocked (§9 / §22).
[ ] 8.  No startup/packaging/migration-runner mutation — migrate.ts, copy-migrations.mjs, and server.ts are
        unchanged; the only startup DB call is cited as server.ts:303-305 (§9 / §22).
[ ] 9.  Allowed/forbidden file scopes are precise — §8 enumerates the exact, finite, closed Phase 47J allowed
        envelope (the explicitly named files only; no open-ended "helper module" exception), and §9 the exact
        forbidden surfaces, including any unlisted new source/helper/module/script file (even under the isolated
        aw-sql-isolation-spike/ directory or app/scripts/) which requires a separate docs authorization gate;
        config.ts is forbidden (any future env gate read only in the runner).
[ ] 10. Future gate conjunction is explicit and fail-closed — §10 lists all conjunctive gates (G1-G13); any one
        absent => fail closed, exit non-zero, no silent no-op, no default target, no partial apply; the draft env
        labels are named-only / NOT-added / non-final.
[ ] 11. Future test matrix is sufficient — §20 (M1-M19) and §21 acceptance evidence (E1-E10) cover production
        refusal, missing-gate refusal, unsafe-DSN refusal, unlisted/symlink SQL, CHECK enforcement, conflict
        rollback, replay, cleanup safety, isolation, no-leak, and Codex acceptance.
[ ] 12. Phase 47F / 47G / 47H represented accurately — 47F: 9 files / +2439 lines / zero production-path files;
        isolated 3-table SQL family, exact manifest, planner/guard/apply module (applyIsolationSpikePlan at
        index.ts:568 via injected sink at index.ts:124-129), explicit dev/operator runner (--apply refused at
        runner :101-107). 47G: docs-only acceptance, Verdict A, real DB execution NOT authorized. 47H: docs-only
        decomposition, Verdict A, kept implementation blocked, selected this 47I.
[ ] 13. Next lane is correct — Phase 47J (a separate, code-bearing execution-sink spike), conditionally authorized
        and acceptance-gated on §8-§21 (§7 / §23.2); not another docs gate (Option B is the fallback only).
[ ] 14. Preserved blocked lanes are explicit (§22) — real DB execution, --apply, DB client/sink injection,
        production DB target, production migrations / DB writes / migration execution, migration-runner / packager /
        startup / config / scope-guard changes, Lane-2 canonical migrations, route-contract / final-schema freeze,
        and the operative ADR-022E gate #8 discharge all remain BLOCKED.
[ ] 15. No production overclaim — no production-readiness, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, production-DB-write, production-migration-execution, Freeside-runtime,
        Lane-2-canonical, or aw_*-SQL-production-safe claim; every such reference is negated / blocked; no phrasing
        reads as if Phase 47I itself authorizes current execution.
[ ] 16. No bad citation regression — no migrate.ts:303-305 citation (migrate.ts is 254 lines); the conditional
        startup migrate is cited as server.ts:303-305; the canonical scope-guard denylist is the 19-entry
        scope-guards.test.ts:122-142.
[ ] 17. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5
        (no sixth vector); self-check 44/44; git diff --check and git diff --cached --check clean (§24).
[ ] 18. No adjacent-repo changes — no file in loa-straylight or freeside-characters (or any adjacent repo) was
        created or modified by Phase 47I.
[ ] 19. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp / temp,
        __pycache__, .pyc, dist, or .claude artifact appears in the Phase 47I working tree.
[ ] 20. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the Claude
        Code memory store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
```

### 23.2 Future Phase 47J Codex audit checklist — implementation PR

This section is a checklist for a **future** audit on the Phase 47J PR, **not** an audit run here. Copy it verbatim
into the Phase 47J audit.

```text
PHASE 47J — LANE-1 aw_* SQL EXECUTION-SINK SPIKE CODEX AUDIT CHECKLIST
(every item must be ACCEPT; any REJECT blocks the spike and Lane-1 aw_* SQL execution stays blocked)

[ ] 1.  Scope confined to the §8 allowed envelope; no §9 forbidden surface touched (migrate.ts, copy-migrations.mjs,
        server.ts, config.ts, package/lockfile, .github/**, fixtures, route-vectors, production migration dirs,
        dist/build all unchanged).
[ ] 2.  index.ts stays pool-free and node:-only; never imports the production pool; passes the canonical 19-entry
        DURABLE_WRITE_DENYLIST (scope-guards.test.ts:122-142) with zero hits and NO allowlist; scope-guards.test.ts
        is UNEDITED.
[ ] 3.  The real sink is constructed only in the runner (app/scripts/, outside SPIKE_FILES) and injected via
        applyIsolationSpikePlan(plan, sink) (index.ts:568, interface index.ts:124-129).
[ ] 4.  --apply enabled ONLY under the full §10 gate conjunction (G1-G13); any one absent => fail closed, exit
        non-zero, no silent no-op, no default target, no partial apply.
[ ] 5.  Database target policy enforced (§11): production DATABASE_URL refused; no default app DB; only strict
        local/test/dev DSNs with a disposable marker / allowlist; least-privilege user; no DSN echo; no secret log.
[ ] 6.  Runner remains the only caller; never imported by server.ts (server.ts:303-305 unchanged); never on startup;
        not wired into any package.json lifecycle script.
[ ] 7.  Transaction / lock / idempotency (§13): all-or-nothing apply against a real engine; no production advisory
        lock reuse; no _migrations ledger write; idempotent replay; conflict rolls back with no partial admit.
[ ] 8.  Cleanup / down (§14): drop runs only on ephemeral/dev; bounded to aw_isolation_spike_* family; same gate
        conjunction; reversible-by-recreation; no production state behind.
[ ] 9.  Real-engine CHECK (§15): invalid payload ref, wrong actor ref, overlength ref, wrong awref kind, status/class,
        and the UNIQUE conflict all fire against a live Postgres engine.
[ ] 10. Privilege / secret / logging (§16): no production credentials/roles; least privilege; no secret/DSN/env leak.
[ ] 11. Observability / public surface (§17): minimal logs only; no public response expansion; 114 = 114 no-leak
        parity preserved; route-vectors 5/5; fixtures 5/5; self-check green.
[ ] 12. Auth / consent / signer non-coverage (§18) explicitly stated; each remains separately gated.
[ ] 13. ADR-022E / Lane-2 non-coverage (§19): no gate #8 discharge; no Lane-2 canonical migration; no claim aw_* SQL
        is production-safe.
[ ] 14. Test matrix (§20, M1-M19) and acceptance evidence (§21, E1-E10) all satisfied; typecheck + lint clean.
[ ] 15. If the spike cannot satisfy the obligations without weakening the production posture, it falls back (e.g.
        remains the Phase 47A .json path, Option C) or returns for a narrower gate (Option B) — and Lane-1 aw_* SQL
        execution stays blocked.
[ ] 16. No bad citation regression: no migrate.ts:303-305 citation (migrate.ts is 254 lines; the startup migrate is
        server.ts:303-305).
```

---

## 24. Validation

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47I is
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
git status --short --untracked-files=all | grep -iE 'MEMORY|memory|grimoire|__pycache__|\.pyc|generated|tmp|temp|\.claude|dist'
# Adjacent-repo reference scan (interpret: cross-repo mentions in prose are fine; no adjacent file is touched):
grep -RInE 'loa-arcturus|arcturus|loa-sensenet|sensenet' docs app package.json package-lock.json .github 2>/dev/null || true
# Overclaim scan (interpret: negated blocked-lane references are fine; positive claims are not):
grep -RInE 'production ready|production readiness|route-contract freeze|final schema freeze|ADR-022E.*discharged|production migration execution authorized|production DB writes authorized|durable production storage authorized|Freeside runtime|Lane-2 canonical|aw_\* SQL.*production-safe|real DB execution authorized now|--apply authorized now|Phase 47I.*implements|Phase 47I.*execution|ready to implement|implementation-ready|production-safe' \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-BOUNDARY-GATE.md \
  docs/admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md
```

**Recorded results for this lane** (run during authoring; full output accompanies the operator run report):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md` is added, plus the
  two minimal forward-traceability status notes (list below); no runtime source (and specifically not `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql`, the experimental SQL / manifest / planner / runner, `no-leak.ts`, `config.ts`,
  `server.ts`, or `scope-guards.test.ts`), no runtime test, no route-vector JSON, validator, README, fixture, fixture
  validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, SQL, executable schema, or
  generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**; the
  `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail closed; 2 exact-key
  non-over-match guards stay clean);
- **docs-only static scans** — the `app src package.json … *.sql dist build` diff is empty; the
  memory/generated/temp scan matches nothing under the working tree from this phase;
- **adjacent-repo reference scan** — any `arcturus` / `sensenet` matches are prose-only and no adjacent-repo file is
  created or modified;
- **overclaim scan** — every match is a **negated / blocked / future-conditional** reference (e.g. "route-contract
  freeze — blocked", "final schema freeze — blocked", "Lane-2 canonical … remain blocked", "Freeside runtime / client
  integration — blocked", "production readiness … not claimed", "no claim that `aw_*` SQL is production-safe", "Phase
  47I … implements nothing", "Phase 47I is not real DB execution", "the decomposition is **not** implementation-ready");
  there is **no** positive present-tense authorization or safety claim, and no phrasing reads as if Phase 47I itself
  authorizes current execution;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–24 exactly once each.

**Forward-traceability status notes added (§24 scope):**

- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-BOUNDARY-GATE.md` — a one-line Phase 47I status note recording that
  Phase 47I (this gate) converted the Phase 47H execution-sink decomposition into a precise
  implementation-authorization checklist, kept implementation blocked (Verdict A), and conditionally authorized a
  future, separate, code-bearing Phase 47J execution-sink spike acceptance-gated on that checklist.
- `docs/admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md` — a one-line Phase 47I status note recording that
  the execution-sink implementation-authorization checklist was defined downstream and that `--apply` / real DB
  execution remain blocked behind that checklist and a later code-bearing Phase 47J lane.

**Corruption / duplicate guard** (carried from the 46I–47H precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 24.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the six fenced blocks are the §10 future
  apply-mode gate conjunction (a `text` block), the §20 future test matrix (a `text` block), the §21 future acceptance
  evidence (a `text` block), the §23.1 current Phase 47I Codex checklist (a `text` block), the §23.2 future Phase 47J
  Codex checklist (a `text` block), and the §24 validation command list (a `bash` block). **No fenced block is an
  executable migration or runnable schema.**
