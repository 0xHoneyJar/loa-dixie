# Phase 47N — Lane-1 `aw_*` SQL least-privilege (P.2 / P.3) evidence acceptance gate

> **Phase**: 47N
> **Branch context**: `phase-47n-aw-sql-least-privilege-evidence-acceptance-gate`
> **Related**: Phase 47M (PR #184, commit `4ec76567`,
> [`admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md))
> **produced** the redacted, **non-production, disposable** local PostgreSQL 16 least-privilege (P.2 / P.3) role / grant
> evidence the Phase 47L blocker gate authorized — a dedicated, least-privileged execution role (no superuser /
> `CREATEDB` / `CREATEROLE` / `CREATE` on `public`) drove the **frozen** Phase 47J forward `--apply`, the unqualified
> `aw_isolation_spike_*` DDL resolved into a dedicated non-`public` schema via a proven `search_path`, the minimal grant
> set was shown **necessary and sufficient** (F.1–F.7), the no-overreach boundary was demonstrated where representable
> (N.1–N.5), live data-plane CHECK / UNIQUE / rollback probes were exercised under that same role, and cleanup ran under
> a **separate** role with **proven per-object ownership** (§10 Model A) — but Phase 47M explicitly **did not
> self-accept**, **did not clear P.2 / P.3**, and **did not grant full Phase 47J acceptance**; Phase 47L (PR #183,
> commit `d056cbf7`,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md))
> **decomposed** the binding §16 P.2 / P.3 gap and **authorized (Option A)** the future, separate Phase 47M evidence
> lane — defining its §7–§13 evidence requirements and §14 envelope **without producing any of it** — and named **a
> later, separate acceptance gate** (this Phase 47N) to decide whether the future evidence clears the gap; Phase 47K
> (PR #182, commit `66c09514`,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md))
> **partially accepted (PATCH / NOT FULLY ACCEPTED)** the merged Phase 47J execution-sink spike — accepting its bounded,
> demonstrated proof components but **withholding full acceptance** because the §16 P.2 / P.3 obligation was
> named-binding but undemonstrated; Phase 47J (PR #181, commit `a377922d`,
> [`admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md))
> **implemented** the bounded, disabled-by-default, dev/operator/test-only, **NON-PRODUCTION**, exact-scope Lane-1
> `aw_*` SQL **execution-sink** spike inside the Phase 47I file envelope (`--apply` possible **only** under the full §10
> gate conjunction against a strictly non-production target); Phase 47I (PR #180,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md))
> **conditionally authorized** Phase 47J and made the §16 **P.1–P.7** privilege / secret / logging checklist binding;
> Phase 47H (PR #179) **decomposed** the execution-sink / real-DB boundary (its §14 privilege / secret boundary is the
> origin of the least-privilege requirement) and kept execution **BLOCKED**; Phase 47G (PR #178) **accepted** the merged
> Phase 47F isolation spike as a bounded, disabled-by-default, dev/operator-only, **NON-PRODUCTION**,
> location-isolated SQL **planning / manifest / safety-proof** spike; Phase 47F (PR #177, commit `ae24ca35`)
> **implemented** the isolated SQL / manifest / planner / runner / tests / runbook (`--apply` refused); Phase 47A
> (PR #172) implemented Storage Mode 2 as a file-backed `.json` snapshot store, accepted by Phase 47B (PR #173) — the
> **live Option D / fallback** path; Straylight (`@loa/straylight`) PR #65 (A–O primitive review, **merged**);
> Straylight-repo ADR-022E durable-store gate #8 (+ sibling gates, **held operatively**); ADR-022D receipt /
> audit-chain invariants.
> **Status**: **docs / decision-only least-privilege (P.2 / P.3) evidence *acceptance* gate.** This gate adds **only
> this document** (plus minimal forward-traceability status notes, §20). It modifies **no** runtime source — and
> specifically does **not** modify `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`,
> `app/src/db/migrations/*.sql`, `app/src/server.ts`, `app/src/config.ts`,
> `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts`, the experimental `.sql` files, the
> `manifest.json`, the `aw-sql-isolation-spike-runner.mjs`, `no-leak.ts`, the `aw-sql-execution-sink-spike.test.ts`, the
> three extended Phase 47F test files, or `scope-guards.test.ts` — and changes **no** route handler, store / storage
> code, DB write, migration, SQL file, executable schema, migration runner, packager, scope guard, auth, consent,
> route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, other test,
> package export, config, env, package, lockfile, CI, generated file, or binary. No adjacent repository
> (`loa-straylight`, `freeside-characters`) is touched.
> **This is the Lane-1 `aw_*` SQL least-privilege (P.2 / P.3) evidence *acceptance* gate** — the docs/decision-only rung
> Phase 47L §17 named, downstream of the Phase 47M evidence lane, mirroring the Phase 47F → 47G and Phase 47J → 47K
> implement → accept precedent. It **adjudicates the already-merged Phase 47M evidence** and decides whether that
> evidence clears the binding Phase 47I §16 P.2 / P.3 least-privilege execution-role / grant gap **for the bounded
> Lane-1 non-production / disposable-local evidence corridor**, and whether **full Phase 47J acceptance** can be
> recorded **within the bounded non-production Lane-1 limits** Phase 47J was authorized to occupy. **It is not the
> evidence lane, it produces no new P.2 / P.3 evidence, runs no role / grant test, opens no connection, and implements
> nothing.** It **enables no production `--apply`, injects no DB client / sink, opens no DB connection, performs no DB
> write, executes no migration, adds no SQL or executable schema, changes no migration runner / packager / startup /
> config, weakens or edits no scope guard, implements no auth or consent, changes no route / API behavior, freezes
> neither the route contract nor the final schema, discharges no operative Straylight-side gate, closes no MVP-2, and
> claims no production readiness.** Production DB execution, production migration execution, durable production storage,
> MVP-2 closure, and all production work **remain BLOCKED**; this gate clears P.2 / P.3 **only in the bounded Lane-1
> non-production / disposable-local evidence sense**, and **production-representative** least privilege **remains
> deferred and blocked** behind the operative ADR-022E gate #8.

> **Phase 47O status note (forward traceability; added by the Phase 47O corridor-closure review gate).** The
> docs/decision-only Lane-1 `aw_*` SQL execution corridor-closure / remaining-MVP-2-blocker review gate this gate named
> (§18) has run:
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-CORRIDOR-CLOSURE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-CORRIDOR-CLOSURE-GATE.md)
> (strictly docs/decision-only; **produced no evidence**; Verdict **Option A — ACCEPT corridor closure**). It reviewed
> the bounded non-production Lane-1 `aw_*` SQL execution proof corridor after this gate's P.2 / P.3 acceptance and
> **accepted closure of the bounded non-production `aw_*` SQL execution proof stack** (isolation / planning → execution
> sink → least-privilege evidence acceptance), finding every corridor element backed by an accepted non-production proof
> and no remaining non-production proof gap. This is a **proof-corridor closure only**: **MVP-2 REMAINS OPEN**, and
> production DB execution, production migration execution, durable production storage, production-representative least
> privilege, route-contract / final-schema freeze, Freeside integration, Lane-2 canonical Straylight-store migrations,
> and the operative ADR-022E gate #8 discharge **all remain BLOCKED**. The review inventoried the remaining MVP-2
> blockers and selected the next lane as a strictly docs/decision-only Phase 47P MVP-2 remaining-blocker decomposition /
> next-corridor selection gate.

Every assessment below is grounded **read-only** against the **merged Phase 47M evidence record** in the Dixie repo at
authoring time (PR #184, commit `4ec76567`, the redacted §5 / §5.1 disposable-local evidence block), the binding Phase
47L §7–§13 requirements it was authorized to satisfy, the Phase 47K partial-acceptance gate (PR #182), and the binding
Phase 47I §16 checklist. The frozen Phase 47J source surface is read read-only for citation grounding only: the
injected `IsolationSpikeStatementSink` interface (`index.ts:124`), the all-or-nothing `applyIsolationSpikePlan(plan,
sink)` (`index.ts:568`), the pure execution-gate conjunction (`index.ts:610` / `:634` / `:661` / `:700`,
`SYNTHETIC_REF_MAX_LENGTH = 80` `index.ts:718`; `index.ts` is **914 lines**), the frozen forward DDL's unqualified
`CREATE TABLE IF NOT EXISTS aw_isolation_spike_*` at
`app/src/services/admission-wedge-spike/aw-sql-isolation-spike/sql/0001_aw_isolation_spike_init.sql:34` / `:71` / `:96`
(17 named CHECK constraints), the unqualified `DROP TABLE IF EXISTS aw_isolation_spike_*` at
`…/sql/0001_aw_isolation_spike_init_down.sql:14` / `:15` / `:16`, and the explicit runner
`app/scripts/aw-sql-isolation-spike-runner.mjs` (**498 lines**, the only DB-touching caller, outside the guarded
`SPIKE_FILES`). The **unchanged** production path is read read-only: the migration runner `app/src/db/migrate.ts`
(**254 lines** — it has **no** line 303–305), the build-asset packager `app/scripts/copy-migrations.mjs`, the
conditional startup migrate `await migrate(dbPool)` inside `if (dbPool)` at **`server.ts:303-305`**, the env parsing in
`app/src/config.ts` (`DATABASE_URL` at `config.ts:340`; `config.ts` is **485 lines**), the runtime no-leak guard
`no-leak.ts` (114-key `FORBIDDEN_PUBLIC_KEYS`), and the **canonical** Phase 33N static scope guards `scope-guards.test.ts`
(the 19-entry `DURABLE_WRITE_DENYLIST` at `scope-guards.test.ts:122-142`; the forbidden-import test at `:185-198`) —
which Phase 47M left **unedited**. Nothing below is executed; this gate **adjudicates already-merged evidence**, it does
not produce any.

---

## 1. Status / verdict

**Verdict: ACCEPT PHASE 47M EVIDENCE FOR BOUNDED LANE-1 P.2 / P.3 ACCEPTANCE / ACCEPT FULL PHASE 47J WITHIN
NON-PRODUCTION LANE-1 LIMITS.**

This is **decision-structure Option A** (§17): the Phase 47M evidence is **sufficient to clear the binding Phase 47I
§16 P.2 / P.3 least-privilege execution-role / grant gap for the bounded Lane-1 non-production / disposable-local
evidence corridor**, and **full Phase 47J acceptance is recorded — strictly within the non-production Lane-1 limits
Phase 47J was authorized to occupy.** Option A is selected because every binding Phase 47L §7–§13 requirement is met by
recorded, redacted, source-grounded disposable-local evidence (§6 matrix), the evidence carries no production overclaim,
and the acceptance is precisely bounded to the non-production corridor the chain reserved for it.

For the avoidance of doubt, this acceptance is **bounded** and says only what the evidence supports:

- **Phase 47M clears P.2 / P.3 only in the bounded Lane-1 non-production / disposable-local evidence sense.** It is
  **not** a claim that production least-privilege policy is proven; **production-representative** least privilege
  **remains deferred and blocked** behind the operative ADR-022E gate #8 (§7 / §16). The disposable-local evidence
  proves **nothing** about production privilege boundaries.
- **Phase 47J is fully accepted only as the bounded, disabled-by-default, dev/operator/test-only, non-production
  execution-sink spike it was authorized to be.** Full acceptance is *against the Phase 47I §8–§21 checklist for the
  bounded non-production spike*, **not** a production execution authorization.
- **This gate authorizes no production DB execution, no production `--apply`, no production migration execution, no
  durable production storage, and no MVP-2 closure.** MVP-2 closure remains a *further, separate* gate (§16 / §18).
- **This gate does not prove production least-privilege policy, does not discharge ADR-022E gate #8, does not freeze the
  route contract or the final schema, and does not authorize Freeside integration or Lane-2 canonical Straylight-store
  migrations** (§16).

What Phase 47N **is**, stated narrowly: it is **docs / decision-only**. It reads the merged Phase 47M evidence record
read-only, evaluates it against the binding Phase 47L §7–§13 requirements and the Phase 47I §16 P.2 / P.3 obligation,
records a requirement → evidence → verdict matrix (§6), accepts the evidence for the bounded non-production corridor and
records full Phase 47J acceptance within the non-production Lane-1 limits, preserves everything that stays blocked
(§16), and selects the next safe lane (§18 — a docs/decision-only corridor-closure / remaining-MVP-2-blocker review
gate). It implements, executes, enables, injects, freezes, discharges, and closes **nothing**.

---

## 2. Scope

Phase 47N is the **docs/decision-only** Lane-1 `aw_*` SQL least-privilege (P.2 / P.3) evidence **acceptance** gate named
by Phase 47L §17 — the **later, separate acceptance gate** that Phase 47L and Phase 47M both explicitly deferred the
clear / accept decision to. Its job is to convert the merged Phase 47M evidence into an adjudicated decision: (a) does
the recorded evidence satisfy each binding Phase 47L §7–§13 requirement; (b) does it therefore clear the binding §16
P.2 / P.3 gap **for the bounded Lane-1 non-production corridor**; (c) can **full Phase 47J acceptance** now be recorded
**within the non-production Lane-1 limits**; and (d) what is the next safe lane.

**In scope (this PR):**

- this single new document; and
- minimal forward-traceability status notes (§20) in the Phase 47M runbook, the Phase 47L blocker gate, the Phase 47K
  acceptance gate, the Phase 47I checklist gate, and the Phase 47J runbook.

**Explicitly out of scope (this PR) — Phase 47N produces nothing and runs nothing:**

- no new P.2 / P.3 evidence of any kind; no disposable database; no role; no grant; no privilege test; no forward or
  cleanup SQL run under any role; no `psql` session; no Docker / Postgres invocation; no operator run;
- no runtime source / test / config / package / SQL / migration / route-vector / validator / fixture change;
- no edit to `index.ts`, the runner, `no-leak.ts`, `scope-guards.test.ts`, `migrate.ts`, `copy-migrations.mjs`,
  `server.ts`, `config.ts`, or any `*.sql`;
- no production `--apply` enablement, no DB client / sink injection, no DB connection, no DB write, no migration
  execution;
- no route / API behavior change, no public response change, no Freeside integration;
- no Lane-2 canonical Straylight-store migration; no ADR-022E gate #8 discharge; no route-contract / final-schema
  freeze; no MVP-2 closure; no production readiness claim; no claim that `aw_*` SQL is production-safe.

This gate **adjudicates** evidence; it **produces** none. Production least privilege and production safety are exactly
what a *future production-storage / auth gate* must prove — not what this gate asserts.

---

## 3. Source chain

Each predecessor is read **read-only**; this gate re-accepts no predecessor decision and unblocks no production lane.

- **Phase 47F / PR #177 (commit `ae24ca35`)** — implemented the bounded Lane-1 `aw_*` SQL isolated dev/operator
  planning spike; `--apply` **refused**. **Not modified.**
- **Phase 47G / PR #178** — accepted Phase 47F only as a bounded, disabled-by-default, dev/operator-only,
  non-production, location-isolated SQL planning / manifest / safety-proof spike. **Not modified.**
- **Phase 47H / PR #179** — decomposed the execution-sink / real-DB boundary; its §14 privilege / secret boundary is
  the **origin** of the least-privilege requirement; kept execution **BLOCKED**. **Not modified.**
- **Phase 47I / PR #180** — conditionally authorized Phase 47J only as a bounded, disabled-by-default,
  dev/operator/test-only, non-production, exact-scope, fail-closed execution-sink spike, and made the **§16 P.1–P.7**
  privilege / secret / logging checklist **binding** — making P.2 / P.3 least-privilege execution-role / grant evidence
  a precondition for full acceptance. **Not modified; gains a Phase 47N status note (§20).**
- **Phase 47J / PR #181 (commit `a377922d`)** — implemented the bounded execution-sink spike under the Phase 47I
  envelope (8 files, +1902 / −52, zero production-path / vector / fixture files). **Not modified; gains a Phase 47N
  status note (§20).**
- **Phase 47K / PR #182 (commit `66c09514`)** — **partially accepted (PATCH / NOT FULLY ACCEPTED)** Phase 47J for its
  bounded demonstrated proof components, but **withheld full Phase 47J acceptance** because P.2 / P.3 remained
  **undemonstrated** — classifying that gap as a **blocking acceptance gap**. **Not modified; gains a Phase 47N status
  note (§20).**
- **Phase 47L / PR #183 (commit `d056cbf7`)** — decomposed the P.2 / P.3 evidence blocker (§7–§13 requirements; §14
  envelope), selected **Option A**, and **authorized Phase 47M** as a future, separate, bounded, dev/operator/test-only,
  disabled-by-default, non-production, disposable-Postgres-only evidence-producing lane — naming **a later, separate
  acceptance gate** (this Phase 47N) to decide discharge. **Not modified; gains a Phase 47N status note (§20).**
- **Phase 47M / PR #184 (commit `4ec76567`)** — **produced** the redacted, disposable-local PostgreSQL 16
  least-privilege (P.2 / P.3) evidence the Phase 47L gate decomposed; **did not self-accept**, **did not clear
  P.2 / P.3**, and **did not grant full Phase 47J acceptance** — recording the evidence for **later acceptance-gate
  review**. **The subject of this acceptance gate; gains a Phase 47N status note (§20).**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner and the
  decision records cited as guardrails (§16). Cross-repo references, **not edited.**

---

## 4. Question being decided

The Phase 47L §17 decision routed the **clear / accept** question to this gate, and Phase 47M explicitly deferred it
here. Phase 47N decides exactly one question, in two precisely-bounded parts:

1. **Does the merged Phase 47M evidence clear the binding Phase 47I §16 P.2 / P.3 least-privilege execution-role / grant
   gap — for the bounded Lane-1 non-production / disposable-local SQL execution corridor?** (Not: is production least
   privilege proven. That is a separate, deferred, blocked question, §7 / §16.)
2. **If so, can full Phase 47J acceptance now be recorded — strictly within the non-production Lane-1 limits Phase 47J
   was authorized to occupy?** (Not: is production execution authorized. It is not, §16.)

The question is **not** whether to produce more evidence (Phase 47N produces none), **not** whether to close MVP-2
(closure is a further separate gate, §18), **not** whether to authorize production work (all production work stays
blocked, §16), and **not** whether to discharge ADR-022E gate #8 (Straylight-owned, operatively held, §16). It is
strictly: *is the already-merged disposable-local evidence sufficient to clear P.2 / P.3 for the bounded non-production
corridor, and does that unblock full Phase 47J acceptance within the non-production limits.*

---

## 5. Phase 47M evidence intake

Grounded read-only against the merged Phase 47M runbook §5 / §5.1 evidence record (PR #184, commit `4ec76567`). The
evidence is a **one-off, redacted, disposable-local** operator proof against a disposable, loopback-only, volume-less,
auto-removed local **PostgreSQL 16 (16.14)** engine, torn down after the run. Intaken accurately:

**Posture and target.** Disabled-by-default; dev/operator/test-only; `NODE_ENV=production` refused; the production
`DATABASE_URL` always refused; a fresh disposable loopback DB created and destroyed; the explicit runner is the only
DB-touching caller; credentials never logged; not added to CI; contacts no external DB from the unit suite.

**Roles (redacted, non-sensitive names; credentials redacted and uncommitted).** Two distinct, separately-authorized
disposable roles — neither a superuser, the default maintenance role, nor a production migration / admin role:

- a **least-privilege forward execution role** — `rolsuper=f`, `rolcreatedb=f`, `rolcreaterole=f`, `rolcanlogin=t`,
  `NOINHERIT`; `CONNECT` on the disposable DB only; `USAGE, CREATE` on a **dedicated non-`public` schema** only; **no**
  `CREATE` on `public` (explicitly revoked, including `PUBLIC`'s default); **no** cross-DB `CONNECT`; per-DB role
  setting `search_path = <dedicated schema>`;
- a **separate cleanup / down role** (§10 Model A) — same conservative attributes; `CONNECT` + schema `USAGE` +
  `search_path`; **per-object ownership** of every `aw_isolation_spike_*` object, **transferred** from the LP role by an
  elevated setup-authority step **before** cleanup is tested.

**Recorded outcomes (redacted).**

- **Forward `--apply` AS the LP role** — `APPLIED (forward)`, committed in a single transaction against a non-production
  target, exit 0; `current_user` = the LP role; `search_path` = the dedicated schema.
- **Placement** — 3 tables (`aw_isolation_spike_assertion`, `_supersession_link`, `_tombstone`) in the dedicated schema,
  owned by the LP role; **0** `aw_isolation_spike_*` tables in `public` (unqualified DDL resolved to the dedicated
  schema, never `public`); the dedicated schema carries the **17 named CHECK constraints** the frozen Phase 47J DDL
  defines, plus 3 PRIMARY KEY and 2 UNIQUE; idempotent re-run clean.
- **Minimal-grant necessity AND sufficiency (F.6)** — with schema `CREATE` revoked, forward `--apply` fails (exit 1,
  rolled back, "permission denied for schema", 0 tables); with `CREATE` re-granted it succeeds (exit 0, 3 tables) ⇒ the
  minimal grant is **necessary** and **sufficient**, with no superuser and no broader grant.
- **No-overreach probes AS the LP role (N.1–N.5, representable subset)** — SELECT/INSERT on an unrelated `public` object
  DENIED (N.1); unrelated-table access covered by N.1 (N.2, partially representable); cross-DB `CONNECT` DENIED (N.3);
  `CREATE TABLE` in `public` DENIED (N.4); `ALTER … SUPERUSER` / `CREATE ROLE` / `SET ROLE` all DENIED (N.5); standing up
  production-like schemas to widen N.2 is **explicitly not done** (Phase 47L §11) and **deferred** to a later
  production-storage / auth gate.
- **Cleanup / down (§10 Model A)** — pre-transfer, the cleanup role's DROP attempt fails ("must be owner of table …") ⇒
  schema USAGE/ownership alone is **not** drop authority, proven not assumed; an elevated setup-authority
  `ALTER TABLE … OWNER TO <cleanup role>` (×3) transfers per-object ownership; cleanup `--apply` AS the cleanup role
  (with the distinct cleanup opt-in) APPLIED, exit 0; `aw_isolation_spike_*` tables after cleanup = 0; the synthetic
  unrelated `public` object untouched; cleanup without the opt-in refused `CLEANUP_OPT_IN_MISSING` (exit 1, fail-closed
  before any connection).
- **Live data-plane probes (§5.1, under the LP role, in the dedicated schema)** — invalid raw payload ref, wrong `awref`
  kind, overlength ref, out-of-range status, and out-of-range class each **rejected by a named CHECK constraint
  (SQLSTATE 23514)** with no row persisted; a duplicate/conflict **rejected by the UNIQUE constraint (SQLSTATE 23505)**
  with the pre-existing count unchanged; an explicit transaction **rollback** left **no partial row**. After all seven
  probes only the single valid baseline row remained.
- **Credential / no-leak hygiene (S.1–S.5 / P.4–P.7)** — runner stdout/stderr on the forward success path scanned for
  the LP role credential / DSN scheme / loopback host / port ⇒ **0 / 0 / 0 / 0** matches; refusals/failures emit only
  stable, non-sensitive codes; no raw DSN, credential, role credential, or grant credential committed; role names + grant
  set recorded in redacted, non-sensitive form only; only static statement text was used.

**Phase 47M's own stated limits (intaken and honored by this gate).** Phase 47M does **not** self-accept the evidence,
does **not** clear P.2 / P.3 by itself, does **not** grant full Phase 47J acceptance, does **not** close MVP-2, and does
**not** authorize production DB execution, production `--apply`, production DB writes, production migration execution,
durable production storage, startup/config/package changes, route/API/public response changes, Freeside integration,
Lane-2 canonical Straylight-store migrations, ADR-022E gate #8 discharge, route-contract freeze, final-schema freeze, or
production readiness; and Phase 47M makes **no** claim that `aw_*` SQL is production-safe. This gate's acceptance
operates strictly inside those limits.

---

## 6. Phase 47L requirements matrix

The binding requirements are the Phase 47L §7–§13 obligations (which restate / extend the Phase 47I §16 P.2 / P.3
gap). Each is mapped to the merged Phase 47M evidence and adjudicated. **Every row is ACCEPT for the bounded Lane-1
non-production / disposable-local corridor**; none asserts a production property.

| Phase 47L requirement | Phase 47M evidence (§5 / §5.1) | Verdict (bounded Lane-1, non-production) |
|-----------------------|--------------------------------|------------------------------------------|
| **F.1** disposable non-production Postgres target | disposable loopback PostgreSQL 16.14, no volume, auto-removed, created + destroyed | **ACCEPT** |
| **F.2 / P.2** dedicated disposable non-superuser execution role | LP role `rolsuper=f` / `rolcreatedb=f` / `rolcreaterole=f` / `rolcanlogin=t`, distinct from superuser / default / prod-admin role | **ACCEPT** |
| **F.3 / P.3** minimal grant set, recorded | `CONNECT` on disposable DB + `USAGE, CREATE` on the dedicated schema only; recorded in redacted form | **ACCEPT** |
| **F.4** forward SQL run under the LP role | forward `--apply` AS the LP role; `current_user` = LP role; exit 0 | **ACCEPT** |
| **F.5** expected objects exist under the LP role | 3-table family + 17 named CHECK / 3 PK / 2 UNIQUE created under the LP role | **ACCEPT** |
| **F.6** overbroad privileges not required (necessity + sufficiency) | fails without schema `CREATE` (exit 1, 0 tables); succeeds with the minimal set (exit 0, 3 tables); no superuser | **ACCEPT** |
| **F.7 / §8** dedicated-schema `search_path`; unqualified forward SQL resolves into the dedicated schema, not `public` | objects in the dedicated schema; **0** `aw_*` tables in `public`; per-DB role `search_path` proof | **ACCEPT** |
| **§8 / N.4** no `CREATE` on `public` for the LP role | `has_schema_privilege(LP,'public','CREATE') = false` (default `USAGE` only) | **ACCEPT** |
| **§10** cleanup ownership / drop-authority model (Model A) | separate cleanup role; per-object ownership **transferred** + proven; not folded into the LP role; schema ownership alone proven **not** drop authority | **ACCEPT** |
| **N.1** no unrelated-schema access | SELECT/INSERT on unrelated `public` object DENIED | **ACCEPT (representable)** |
| **N.2** no unrelated-table access | covered by N.1 (only one unrelated object present); wider probing **not representable**, deferred | **ACCEPT (partially representable; remainder deferred, not a gap)** |
| **N.3** no cross-database access | cross-DB `CONNECT` DENIED | **ACCEPT (representable)** |
| **N.4** no out-of-scope creation | `CREATE TABLE` in `public` DENIED; no `CREATEDB` / `CREATEROLE` / superuser | **ACCEPT (representable)** |
| **N.5** no privilege escalation | `ALTER … SUPERUSER` / `CREATE ROLE` / `SET ROLE` all DENIED | **ACCEPT (representable)** |
| **live CHECK probes** (§5.1) | invalid payload ref / wrong kind / overlength / status / class each rejected by a named CHECK (SQLSTATE 23514); no row persisted | **ACCEPT** |
| **live UNIQUE probe** (§5.1) | duplicate key rejected by UNIQUE (SQLSTATE 23505); pre-existing count unchanged | **ACCEPT** |
| **live rollback probe** (§5.1) | row visible in-transaction; `ROLLBACK` returns count to prior value; no partial row | **ACCEPT** |
| **S.1–S.5 / A.1–A.7** redaction / no-leak; bounded-non-production label; no overclaim | DSN / credential / host / port / DB name / role credential redacted; 0/0/0/0 leak scan; labeled bounded / non-production / operator-only; no production overclaim | **ACCEPT** |
| **teardown / no residue** | engine auto-removed, volume-less; no residue attributable to the phase | **ACCEPT** |

**Matrix conclusion.** Every binding Phase 47L §7–§13 requirement is satisfied by recorded, redacted, source-grounded
disposable-local evidence, with the only "not demonstrated" item (the wider N.2 unrelated-table probing) being one Phase
47L §11 **explicitly declared not representable** in the disposable setup and **deferred** to a later
production-storage / auth gate — i.e. a *bounded, authorized non-representability*, **not** an unmet binding obligation.
P.2 / P.3 are therefore **DEMONSTRATED for the bounded Lane-1 non-production corridor.**

---

## 7. P.2 assessment

**P.2 — No production DB roles; a least-privileged role scoped to the experimental objects, never a production
migration / admin role. Verdict: CLEARED for the bounded Lane-1 non-production / disposable-local corridor.**

The Phase 47K gap was precise: the recorded Phase 47J evidence identified only *a connection user / password*, not a
*named, dedicated, least-privileged role*. Phase 47M closes exactly that gap **for the non-production corridor**: it
records a **dedicated disposable execution role** with role attributes `rolsuper=f`, `rolcreatedb=f`, `rolcreaterole=f`,
`rolcanlogin=t`, `NOINHERIT` — provably **not** a superuser, **not** the default maintenance role, and **not** a
production migration / admin role — scoped to a single dedicated non-`public` schema. The connecting principal is now a
*least-privileged role demonstrated to hold a minimal scope*, which is what P.2 requires, rather than *a connection user
that happens to work*, which is what Phase 47J recorded.

**Bound (binding).** This clears P.2 **only** in the bounded Lane-1 non-production / disposable-local evidence sense. It
is **not** a production role / grant policy, proves **nothing** about production privilege provisioning, and creates
**no** obligation requiring a production DB or production credentials. **Production-representative** P.2 remains
**deferred and blocked** behind the operative ADR-022E gate #8 (§16).

---

## 8. P.3 assessment

**P.3 — Least privilege: the execution role holds only the privileges required to create / drop the
`aw_isolation_spike_*` family on the non-production target, no broader grant. Verdict: CLEARED for the bounded Lane-1
non-production / disposable-local corridor.**

Phase 47M records the **exact minimal grant set** — `CONNECT` on the disposable database plus `USAGE, CREATE` on the
single dedicated non-`public` schema, and nothing broader (no superuser, no `CREATEDB`, no `CREATEROLE`, no `CREATE` on
`public`, no cross-DB `CONNECT`) — and proves it is both **necessary** and **sufficient** for the bounded forward path
(F.6): with schema `CREATE` revoked the forward `--apply` fails closed (exit 1, rolled back, 0 tables); with it
re-granted the forward path succeeds (exit 0, 3 tables). The no-overreach probes (N.1–N.5, §6) bound the claim
negatively where representable — the role cannot reach unrelated `public` objects, cannot cross databases, cannot create
in `public`, and cannot escalate. Cleanup privilege is held **separate** (§10), so the forward LP role's minimal grant
is never widened to absorb the drop path. P.3 is thus a demonstrated *boundary*, not merely a sufficiency claim — for
the non-production corridor.

**Bound (binding).** As with P.2, this clears P.3 **only** in the bounded Lane-1 non-production / disposable-local
sense. No production grant set is reviewed or proven; **production-representative** P.3 remains **deferred and blocked**
(§16).

---

## 9. Dedicated schema / `search_path` assessment

**Verdict: ACCEPT for the bounded Lane-1 non-production / disposable-local corridor.** The frozen Phase 47J forward DDL
creates the family with **unqualified** names (`CREATE TABLE IF NOT EXISTS aw_isolation_spike_*` at `init.sql:34` /
`:71` / `:96`) and Phase 47M **did not rewrite the SQL** (Phase 47L §14) — so *where* the objects land is decided
entirely by the role / session `search_path`. Phase 47M records a per-DB role setting `search_path = <dedicated schema>`
and proves the unqualified forward DDL resolved into that dedicated non-`public` schema: **3** tables in the dedicated
schema, **0** `aw_isolation_spike_*` tables in `public`, with `current_user` = the LP role and `search_path` = the
dedicated schema under the run. The cleanup path (`DROP TABLE IF EXISTS aw_isolation_spike_*` at `init_down.sql:14` /
`:15` / `:16`) is likewise unqualified and resolves through the same dedicated-schema `search_path`, dropping the family
inside the dedicated schema and leaving the synthetic unrelated `public` object untouched. The LP role holds **no
`CREATE` on `public`** (reinforcing N.4). This satisfies Phase 47L §8 / F.7 / A.7 for the non-production corridor.

---

## 10. Least-privilege role/grant assessment

**Verdict: ACCEPT for the bounded Lane-1 non-production / disposable-local corridor.** Two distinct,
separately-authorized disposable roles are recorded (§5). The **forward LP role** carries only the §8 / P.3 minimal
grant, proven necessary and sufficient (F.6), with conservative attributes (`NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`,
`NOINHERIT`). The **cleanup role** is a *separate* role (§12 below), explicitly **not folded** into the forward LP
role's claimed minimal grant. The grant set is recorded in redacted, non-sensitive form (role *names* + *grant set*,
never credentials), satisfying S.1 / S.2 / A.1 / A.2. This is the precise distinction Phase 47K demanded: a
least-privileged role demonstrated to hold only the minimum, not a connection user of unknown privilege — established
here for the non-production corridor only.

---

## 11. Forward SQL / live data-plane assessment

**Verdict: ACCEPT for the bounded Lane-1 non-production / disposable-local corridor.** The forward `--apply` ran **as the
LP role** (F.4), created exactly the 3-table family with its **17 named CHECK constraints** (the figure the frozen
Phase 47J DDL defines — verified read-only) plus 3 PK and 2 UNIQUE (F.5), and committed in a single transaction. The
§5.1 **live data-plane probes** then exercised real engine enforcement under that same LP role inside the dedicated
schema: five CHECK rejections (invalid raw payload ref, wrong `awref` kind, overlength ref, out-of-range status,
out-of-range class) each by a named CHECK constraint (SQLSTATE 23514) with no row persisted; one UNIQUE rejection
(SQLSTATE 23505) with the pre-existing count unchanged; and one explicit transaction rollback leaving **no partial
row**. After all seven probes only the single valid baseline row remained. This is **live**-engine evidence (not
inferred from static SQL), demonstrated under the least-privilege role — strengthening the Phase 47J §8 components that
Phase 47K accepted, now with the role/grant boundary that Phase 47K found missing. It remains a bounded, non-production,
non-CI proof.

---

## 12. Cleanup ownership/drop-authority assessment

**Verdict: ACCEPT for the bounded Lane-1 non-production / disposable-local corridor (Phase 47L §10 Model A).** Phase 47M
chose **Model A** — a separate, separately-authorized cleanup role with **proven per-object drop authority** via a
**documented ownership-transfer boundary** — and proves the Postgres ownership nuance, rather than assuming it:
*pre*-transfer, the cleanup role's DROP attempt fails ("must be owner of table …"), demonstrating that schema
USAGE/ownership alone is **not** drop authority; an elevated setup-authority `ALTER TABLE … OWNER TO <cleanup role>`
(×3) then transfers per-object ownership of every `aw_isolation_spike_*` object **before** cleanup is tested; cleanup
`--apply` AS the cleanup role (under the distinct `…_APPLY_CLEANUP_ENABLED` opt-in) succeeds (exit 0), leaving **0**
`aw_isolation_spike_*` tables and the unrelated `public` object untouched; and cleanup without the opt-in is refused
`CLEANUP_OPT_IN_MISSING` (exit 1, fail-closed before any connection). The forward LP role is **never** the cleanup role,
and cleanup privileges are **never** folded into its minimal grant. This satisfies Phase 47L §10 / A.3 (schema ownership
alone never accepted as proof) for the non-production corridor. The gated, opt-in, reversible cleanup behavior Phase 47J
already demonstrated is preserved unchanged.

---

## 13. Negative no-overreach assessment

**Verdict: ACCEPT for the bounded Lane-1 non-production / disposable-local corridor, with the Phase 47L §11
representability caveat honored.** Under the LP role, Phase 47M demonstrates what the role **cannot** do: N.1 (no
unrelated-`public`-object SELECT/INSERT — DENIED), N.3 (no cross-DB `CONNECT` — DENIED), N.4 (no `CREATE` in `public`;
no `CREATEDB` / `CREATEROLE` / superuser — DENIED), and N.5 (no `ALTER … SUPERUSER`, no `CREATE ROLE`, no `SET ROLE` —
DENIED). N.2 (wider unrelated-table access) is **partially representable** — covered by N.1 for the single unrelated
object present — and the remainder is **explicitly not representable** in a single freshly-created disposable DB. Per
Phase 47L §11, the lane **must not** stand up production-like schemas to widen N.2, and Phase 47M correctly **did not**;
the wider check is **deferred** to a later production-storage / auth gate. This is an **authorized non-representability**,
not an unmet binding obligation — so it does **not** withhold acceptance. The negative boundary makes P.2 / P.3 a
*boundary* and not merely a *sufficiency* claim, for the non-production corridor.

---

## 14. Redaction/no-leak/teardown assessment

**Verdict: ACCEPT.** Phase 47M satisfies the full Phase 47L §12 / §13 secret-hygiene posture. Every DSN, credential,
host, port, DB name, role credential, schema name, and temp path is **redacted** in the recorded artifact (S.1 / S.2 /
A.1); the runner stdout/stderr forward-success scan for the LP role credential / DSN scheme / loopback host / port
returns **0 / 0 / 0 / 0** matches (P.4 / P.5); refusals / failures emit only stable, non-sensitive codes (e.g.
`CLEANUP_OPT_IN_MISSING`; the engine permission-denied text carries no DSN / credential / host / port / DB name) (S.3);
no production DB or production role is touched and the production `DATABASE_URL` is never a target (S.4); only static
statement text — the frozen `.sql` plus the operator role / grant / ownership DDL against the disposable target — is
used, with no dynamic, payload-derived, or private SQL (S.5 / P.7). Teardown leaves **no residue**: the engine is
auto-removed and volume-less, with no engine, volume, or open port attributable to the phase. This gate's own §20
redaction / secret-leak scan independently confirms the Phase 47M runbook (and this document) carry only redacted
placeholders.

---

## 15. Full Phase 47J acceptance boundary

With P.2 / P.3 cleared for the bounded non-production corridor (§7 / §8), the one **blocking acceptance gap** Phase 47K
recorded against full Phase 47J acceptance is resolved **for that corridor**. This gate therefore records **full Phase
47J acceptance — bounded precisely as follows**:

- **What is now fully accepted.** Phase 47J is accepted as **complete against the Phase 47I §8–§21 checklist for the
  bounded, disabled-by-default, dev/operator/test-only, NON-PRODUCTION, exact-scope, fail-closed execution-sink spike it
  was authorized to be** — the §8–§14 demonstrated components Phase 47K already accepted (target policy, gate / connect
  conjunction, execution-sink / transaction / rollback, runtime CHECK / live-engine, cleanup, public no-leak parity,
  exact file-envelope, no production overclaim) **plus** the §16 P.2 / P.3 least-privilege execution-role / grant
  obligation, now demonstrated by the Phase 47M evidence (§6 matrix).
- **What full acceptance does NOT mean.** It is **not** a production execution authorization. It does **not** authorize
  production DB execution, production `--apply`, production DB writes, production migration execution, or durable
  production storage. It does **not** prove production least-privilege policy. It does **not** discharge ADR-022E gate
  #8. It does **not** freeze the route contract (`route_contract_final` stays false) or the final schema
  (`schema_final` stays false). It does **not** authorize Freeside integration or Lane-2 canonical Straylight-store
  migrations. It does **not** close MVP-2. It does **not** claim `aw_*` SQL is production-safe.
- **The standing future-hardening limitation persists (non-defect).** Phase 47K's recorded **non-defect
  future-hardening limitation** — the absence of a standing / CI live-engine regression guard (the standing automated
  suite uses an injected fake sink; the live-engine evidence is a one-off operator artifact) — is **not** resolved by
  Phase 47M (which is likewise a one-off, non-CI operator run) and is **not** a blocking gap. It remains a known
  characteristic a later lane may address (§18).

Full Phase 47J acceptance here is the **execution-sink analogue of Phase 47G's acceptance of Phase 47F** — an
acceptance of a bounded non-production spike against its authorizing checklist, never a production unblock.

---

## 16. What remains blocked

This acceptance gate unblocks **none** of the following; all remain **BLOCKED** after Phase 47N:

- **production DB execution; production `--apply`; production DB writes; production migration execution** — blocked;
- **durable production storage; production durable-store implementation; production migration files; executable
  production schema** — blocked;
- **startup wiring (`server.ts`; the only startup DB call stays `await migrate(dbPool)` at `server.ts:303-305`); config
  / env wiring (`config.ts`; `DATABASE_URL` at `config.ts:340`); package / lockfile changes** — blocked;
- **migration-runner (`migrate.ts`, 254 lines) / packager (`copy-migrations.mjs`) / scope-guard
  (`scope-guards.test.ts`, canonical 19-entry denylist `:122-142`) changes** — blocked;
- **production-representative least-privilege policy** — **deferred and blocked**; only *non-production, disposable*
  least-privilege evidence is cleared here (§7 / §8); the disposable-local evidence proves nothing about production
  privilege boundaries, and no production role / grant policy is reviewed;
- **route / API behavior change; public response expansion; raw candidate payload persistence** — blocked; the public
  shape and the **114 = 114** runtime ↔ validator no-leak parity (`no-leak.ts`) stay unchanged;
- **route-contract freeze (`route_contract_final` stays false); final-schema freeze (`schema_final` stays false; no
  `aw_*` migration is claimed safe)** — blocked;
- **MVP-2 storage / audit closure** — blocked; not selected here and selectable only by a *further, separate* closure
  gate (§18);
- **Lane-2 canonical Straylight-store migrations** — blocked (each a separate sibling-repo ADR under Straylight
  teammate review, behind the operative gate #8);
- **operative Straylight-side ADR-022E gate #8 discharge** — not claimed; **the dominant cross-repo blocker** for
  production admission and any Lane-2 canonical-store migration; Straylight-owned, operatively held;
- **Freeside runtime / client integration** — blocked (Freeside stays a consumer / handoff surface);
- **production admission; signer / consent / auth resolution; public `remember-this`; user chat becoming memory merely
  because it was said** — blocked.

**Candidate D / ADR-022E boundary preserved.** Candidate D (split-storage) remains **proposal input / design baseline,
not implemented production architecture**; Phase 46N's gate #8 clearing remains a **bounded Dixie documentation /
architecture / handoff prerequisite only**; the operative Straylight-side discharge stays blocked. The accepted Phase
47A `.json` Mode 2 path remains the **live Option D / fallback**.

---

## 17. Decision options

Phase 47N weighs four options for adjudicating the merged Phase 47M evidence:

### Option A — ACCEPT: Phase 47M evidence clears the P.2 / P.3 gap for bounded Lane-1 disposable / non-production acceptance, and full Phase 47J acceptance is recorded within the bounded Lane-1 corridor. **SELECTED.**

**Selected** because every binding Phase 47L §7–§13 requirement is satisfied by recorded, redacted, source-grounded
disposable-local evidence (§6 matrix): the dedicated least-privilege role (P.2), the minimal grant proven necessary and
sufficient (P.3 / F.6), the dedicated-schema `search_path` resolving the unqualified DDL away from `public` (F.7 / §8),
the live CHECK / UNIQUE / rollback probes under the LP role (§5.1), the separate cleanup role with proven per-object
drop authority (§10 Model A), the no-overreach boundary where representable (N.1–N.5), and the redaction / no-leak /
teardown hygiene (S.1–S.5 / A.1–A.7). The acceptance is **bounded** to the non-production corridor and carries no
production overclaim (§1 / §15 / §16).

### Option B — PATCH / NOT ACCEPTED: the evidence remains insufficient; identify the exact missing evidence. **Not selected.**

**Not selected.** No binding Phase 47L §7–§13 requirement is unmet: every row in §6 is ACCEPT, and the only
"not demonstrated" item (wider N.2 unrelated-table probing) is a Phase 47L §11 **authorized non-representability** —
explicitly *not* to be made representable by standing up production-like schemas — not a missing-evidence gap. There is
therefore no exact missing evidence to name within the bounded non-production corridor.

### Option C — PARTIAL: Phase 47M clears disposable-local least-privilege evidence but another non-production blocker still prevents full Phase 47J acceptance. **Not selected.**

**Not selected.** The §16 P.2 / P.3 least-privilege role / grant evidence was the **single** blocking acceptance gap
Phase 47K recorded against full Phase 47J acceptance; with it cleared for the bounded corridor (§7 / §8), no *other*
non-production blocker stands between the recorded evidence and full Phase 47J acceptance within the non-production
limits. (The non-CI live-engine guard is a **non-defect future-hardening limitation**, not a blocking gap, §15 — it does
not make acceptance partial.) Option C would be the correct verdict only if a second binding non-production obligation
remained unmet; none does.

### Option D — DEFER: the evidence cannot be adjudicated without production-like proof. **REJECTED.**

**Rejected**, and strongly so: Phase 47L **intentionally separated** bounded non-production evidence from later
production policy (§7), authorizing Phase 47M precisely because the *non-production* least-privilege evidence is
achievable now without production credentials, a production DB, or any production-path change. Demanding production-like
proof to adjudicate a deliberately non-production evidence lane would re-litigate the Phase 47L decision and conflate
the two least-privilege concepts the chain kept distinct. **Production-representative** least privilege is deferred and
blocked (§16) — but the *adjudication of the non-production evidence* requires no production proof.

**Conclusion.** Decision-structure **Option A**: accept the Phase 47M evidence as clearing P.2 / P.3 for the bounded
Lane-1 non-production / disposable-local corridor, and record full Phase 47J acceptance within the non-production Lane-1
limits; keep Phase 47N docs/decision-only; preserve the production-least-privilege boundary; reject Option D; hold
Options B / C as the non-selected alternatives the evidence does not warrant.

---

## 18. Selected next lane

> **Selected next lane: Phase 47O — Lane-1 `aw_*` SQL execution corridor closure / remaining MVP-2 blocker review gate
> (a *separate*, strictly docs / decision-only gate — NOT a production implementation or durable-store lane, and NOT
> the MVP-2 closure itself).**

With the Lane-1 `aw_*` SQL execution-sink track now **fully accepted within its non-production limits** (47H / 47I /
47J / 47K / 47L / 47M / 47N), the corridor holds **three independently-accepted non-production proof tracks** — Mode 2
`.json` (47A / 47B), SQL planning / isolation (47F / 47G), and SQL execution-sink incl. least-privilege evidence
(47H–47N). The disciplined next rung is a **docs/decision-only corridor-closure / remaining-MVP-2-blocker review gate**
(Phase 47O) that assesses **what remains before MVP-2 closure** now that P.2 / P.3 is accepted — e.g. consolidating the
three tracks as a single corridor, restating the dominant cross-repo blocker (the operative ADR-022E gate #8), and
recording any standing future-hardening limitation (the non-CI live-engine regression guard) — **without** itself
closing MVP-2, authorizing production work, or implementing a durable store.

Phase 47O **must be strictly docs / decision-only**. It must **not** produce evidence, run any role / grant test, enable
production `--apply`, inject any sink, open any connection, change any production-path file, implement a durable store,
freeze any contract / schema, discharge any Straylight-side gate, or close MVP-2. Whether MVP-2 can ever close is a
*further, separate* gate downstream of Phase 47O, and it cannot proceed over the standing blockers (§16).

**Not selected:** declare MVP-2 closed / the corridor complete (rejected — closure is a further separate gate, and the
dominant cross-repo blocker stands, §16); jump directly to a production durable-store implementation (rejected — all
production work is blocked, §16); re-open the P.2 / P.3 evidence question (rejected — adjudicated ACCEPT here, §6 / §7 /
§8); authorize production execution, production `--apply`, production durable storage, production migration execution,
Lane-2 canonical migrations, any freeze, or a gate-#8 discharge (all blocked, §16).

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

## 19. Codex audit checklist

This checklist audits **this Phase 47N PR** — the docs-only least-privilege (P.2 / P.3) evidence acceptance gate. Every
item must be ACCEPT; any REJECT blocks acceptance of this Phase 47N PR.

```text
PHASE 47N — LANE-1 aw_* SQL LEAST-PRIVILEGE (P.2 / P.3) EVIDENCE ACCEPTANCE GATE
CODEX AUDIT CHECKLIST
(docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47N PR)

[ ] 1.  Scope is docs-only — Phase 47N adds only this document plus minimal §20 forward-traceability status notes
        (in the Phase 47M runbook, the Phase 47L blocker gate, the Phase 47K acceptance gate, the Phase 47I checklist
        gate, and the Phase 47J runbook); it modifies no runtime source, and specifically not migrate.ts,
        copy-migrations.mjs, any *.sql, the experimental SQL / manifest / planner (aw-sql-isolation-spike/*) / runner,
        no-leak.ts, aw-sql-execution-sink-spike.test.ts, the three extended Phase 47F test files, config.ts, server.ts,
        or scope-guards.test.ts.
[ ] 2.  No runtime/source/test/config/package/CI/SQL/migration/vector/validator/fixture changes — no route handler,
        store/storage code, DB code, migration runner, packaging/copy runner, planner, runner, auth, consent,
        server-boot, unit/integration test, scope-guard test, isolation test, fixture, route-vector JSON, route-vector
        validator, route-vector README, config.ts, env gate, package.json, lockfile, .github/ CI, .sql, aw_* schema,
        executable schema, migration file, or migration directory is added/modified.
[ ] 3.  Phase 47N produces NO new evidence — the gate creates no disposable database, no role, no grant, runs no
        privilege/role/grant test, runs no forward or cleanup SQL under any role, opens no connection, and invokes no
        psql / Docker / Postgres; it adjudicates the already-merged Phase 47M evidence and produces none (§1 / §2).
[ ] 4.  Phase 47M evidence is intaken faithfully (§5) — disposable loopback PostgreSQL 16.14; dedicated LP role
        (rolsuper=f/createdb=f/createrole=f); minimal grant (CONNECT + dedicated-schema USAGE/CREATE only, no CREATE on
        public); dedicated-schema search_path; 3-table family + 17 named CHECK / 3 PK / 2 UNIQUE; F.6 necessity AND
        sufficiency; N.1-N.5 (representable subset); separate cleanup role with proven per-object ownership-transfer;
        live CHECK (23514) / UNIQUE (23505) / rollback probes; 0/0/0/0 leak scan; teardown no residue; and Phase 47M's
        own non-self-accept / non-clear / non-full-47J-acceptance limits are honored.
[ ] 5.  The requirements matrix maps every binding Phase 47L §7-§13 item to evidence with a bounded verdict (§6) —
        F.1-F.7, §8 no-CREATE-on-public, §10 cleanup ownership/drop-authority (Model A), N.1-N.5 (with the §11
        representability caveat on N.2), live CHECK/UNIQUE/rollback, S.1-S.5/A.1-A.7, teardown — every row ACCEPT for
        the bounded Lane-1 non-production corridor; the only non-demonstrated item (wider N.2) is an AUTHORIZED
        non-representability per Phase 47L §11, not an unmet binding obligation.
[ ] 6.  P.2 / P.3 are CLEARED only in the bounded sense (§7 / §8) — cleared for the bounded Lane-1 non-production /
        disposable-local evidence corridor ONLY; explicitly NOT production least-privilege policy; production-
        representative least privilege remains deferred and blocked behind gate #8; the disposable evidence proves
        nothing about production privilege boundaries.
[ ] 7.  Full Phase 47J acceptance is recorded ONLY within the non-production Lane-1 limits (§15) — accepted as the
        bounded, disabled-by-default, dev/operator/test-only, NON-PRODUCTION, exact-scope, fail-closed execution-sink
        spike it was authorized to be (Phase 47I §8-§21 for the non-production spike + the now-demonstrated §16 P.2/P.3);
        NOT a production execution authorization; the non-CI live-engine guard remains a non-defect future-hardening
        limitation, not resolved and not a blocking gap.
[ ] 8.  Decision options complete and correctly disposed (§17) — Option A (ACCEPT) SELECTED; Option B (PATCH/NOT
        ACCEPTED) not selected (no binding requirement unmet); Option C (PARTIAL) not selected (P.2/P.3 was the single
        blocking gap; no other non-production blocker remains); Option D (DEFER) REJECTED (Phase 47L intentionally
        separated non-production evidence from production policy).
[ ] 9.  Verdict wording is bounded (§1) — "ACCEPT PHASE 47M EVIDENCE FOR BOUNDED LANE-1 P.2/P.3 ACCEPTANCE / ACCEPT
        FULL PHASE 47J WITHIN NON-PRODUCTION LANE-1 LIMITS"; no unbounded "production least privilege proven",
        "production-safe", "production ready", "MVP-2 closed", or "gate #8 discharged" claim anywhere.
[ ] 10. Next lane is correct (§18) — Phase 47O, a STRICTLY docs/decision-only Lane-1 aw_* SQL execution corridor
        closure / remaining-MVP-2-blocker review gate; explicitly NOT production implementation, NOT a durable-store
        lane, and NOT the MVP-2 closure itself; MVP-2 closure remains a further separate downstream gate over the
        standing blockers.
[ ] 11. Preserved blockers are explicit (§16) — production DB execution / --apply / writes / migration execution,
        durable production storage, startup / config / package changes, migration-runner / packager / scope-guard
        changes, production-representative least privilege, MVP-2 closure, Lane-2 canonical migrations, route-contract /
        final-schema freeze, Freeside, and the operative ADR-022E gate #8 discharge all remain BLOCKED.
[ ] 12. No production overclaim — no production-readiness, production-safe, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, production-DB-write, production-migration-execution, durable-production-storage,
        Freeside-runtime, Lane-2-canonical, production-least-privilege-proven, MVP-2-closed, or aw_*-SQL-production-safe
        claim; every such reference is negated / blocked / a non-goal / a future requirement (§7 / §15 / §16).
[ ] 13. No bad citation regression — no migrate.ts:303-305 citation (migrate.ts is 254 lines); the conditional startup
        migrate is cited as server.ts:303-305; the canonical scope-guard denylist is the 19-entry
        scope-guards.test.ts:122-142 (forbidden-import test :185-198); the execution-gate seam is
        index.ts:610/634/661/700, injected sink interface index.ts:124, applyIsolationSpikePlan index.ts:568,
        SYNTHETIC_REF_MAX_LENGTH=80 index.ts:718 (index.ts 914 lines); config.ts DATABASE_URL at config.ts:340
        (config.ts 485 lines); frozen forward DDL CREATE TABLE at init.sql:34/71/96 with 17 named CHECK constraints;
        cleanup DROP TABLE at init_down.sql:14/15/16; runner 498 lines.
[ ] 14. Forward-traceability notes are minimal and evidence-bound (§20) — each added note records only that Phase 47N
        accepted the Phase 47M evidence for the bounded Lane-1 non-production P.2/P.3 corridor, recorded full Phase 47J
        acceptance within the non-production limits, produced no evidence, selected the Phase 47O corridor-closure
        review gate, and kept production / closure / gate-#8 work blocked; no note claims production least privilege,
        production safety, or MVP-2 closure.
[ ] 15. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5 (no sixth
        vector); self-check 44/44; git diff --check and git diff --cached --check clean; nothing staged (§20).
[ ] 16. No adjacent-repo changes — no file in loa-straylight or freeside-characters (or any adjacent repo) was created
        or modified by Phase 47N.
[ ] 17. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp / temp,
        __pycache__, .pyc, dist, build, or .claude artifact appears in the Phase 47N working tree.
[ ] 18. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the Claude Code
        memory store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
[ ] 19. Section headings are well-formed and single-occurrence — each numbered section heading (## 1. … ## 20.)
        appears exactly once; no duplicated heading; no pasted terminal-report fragment; every Markdown table row is
        well-formed; the triple-backtick count is even; no fenced block is an executable migration or runnable schema.
[ ] 20. The acceptance is honest about what it does and does not do — it clears P.2/P.3 and records full Phase 47J
        acceptance ONLY for/within the bounded non-production Lane-1 corridor/limits; it authorizes no production work,
        proves no production least privilege, discharges no gate, freezes nothing, and closes no MVP-2 (§1 / §15 / §16 /
        §17 / §18).
```

---

## 20. Validation record

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47N is
docs/decision-only — it adds only this document (plus the minimal forward-traceability status notes below) and mutates
**no** runtime source, test, validator, vector, fixture, migration, or SQL file — so the validators are run only to
confirm the unchanged artifacts remain green.

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
grep -RInE 'production ready|production readiness|production-safe|route-contract freeze|final schema freeze|ADR-022E.*discharged|production DB writes authorized|production migration execution authorized|durable production storage authorized|Freeside runtime|Lane-2 canonical|aw_\* SQL.*production-safe|ready for production|production implementation authorized|MVP-2.*closed|closure.*complete|least-privilege.*production.*proven|production least-privilege.*proven|full production|production cleared' \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-ACCEPTANCE-GATE.md
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-ACCEPTANCE-GATE.md
```

**Recorded results for this lane** (run during authoring):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-ACCEPTANCE-GATE.md` is added, plus the minimal
  forward-traceability status notes (list below); no runtime source (and specifically not `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql`, the experimental SQL / manifest / planner / runner, `no-leak.ts`, the
  `aw-sql-execution-sink-spike.test.ts`, the three extended Phase 47F test files, `config.ts`, `server.ts`, or
  `scope-guards.test.ts`), no runtime test, no route-vector JSON, validator, README, fixture, fixture validator,
  `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, SQL, executable schema, or generated file
  is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**; the
  `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail closed; 2 exact-key
  non-over-match guards stay clean);
- **diff checks clean** — `git diff --check` and `git diff --cached --check` report no whitespace / conflict-marker
  errors; nothing is staged;
- **docs-only scope checks** — the `app package.json … .github` diff is empty; the only untracked addition is this
  document (plus the edited predecessor docs that received the forward-traceability notes); the memory/generated/temp
  scan matches nothing under the working tree from this phase;
- **adjacent-repo reference scan** — any `arcturus` / `sensenet` matches are prose-only and no adjacent-repo file is
  created or modified;
- **overclaim scan** — every match is a **negated / blocked / non-goal / bounded** reference (e.g. "route-contract
  freeze … blocked", "final-schema freeze … blocked", "Lane-2 canonical … blocked", "Freeside runtime / client
  integration … blocked", "claims no production readiness", "does not claim `aw_*` SQL is production-safe",
  "production-representative least privilege … deferred and blocked", "MVP-2 … closure remains a *further, separate*
  gate", and every P.2 / P.3 "cleared" is qualified "for the bounded Lane-1 non-production / disposable-local
  corridor"); there is **no** positive present-tense production authorization or safety claim, and **no** claim that
  production least privilege is proven or that MVP-2 is closed;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–20 exactly once each.

**Forward-traceability status notes added (§20 scope):**

- `docs/admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md` — a bounded additive Phase 47N
  forward-traceability status note recording that the later, separate acceptance gate Phase 47M deferred to has run: it
  **accepted** the Phase 47M evidence as clearing the binding §16 P.2 / P.3 gap **for the bounded Lane-1 non-production /
  disposable-local corridor** and recorded **full Phase 47J acceptance within the non-production Lane-1 limits**, while
  keeping production work, MVP-2 closure, production-representative least privilege, and the operative ADR-022E gate #8
  discharge **blocked**.
- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md` — a bounded additive Phase 47N
  forward-traceability status note recording that the §7–§13 requirements it decomposed have been **adjudicated ACCEPT**
  against the merged Phase 47M evidence for the bounded non-production corridor, that P.2 / P.3 is **cleared in that
  bounded sense** (production-representative least privilege still deferred / blocked), and that full Phase 47J
  acceptance is recorded within the non-production limits.
- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md` — a bounded additive Phase 47N
  forward-traceability status note recording that the **blocking acceptance gap** it identified (the binding §16
  P.2 / P.3 least-privilege evidence) has been **cleared for the bounded Lane-1 non-production corridor** by the merged
  Phase 47M evidence, so **full Phase 47J acceptance is now recorded within the non-production Lane-1 limits**, with the
  non-CI live-engine guard remaining a non-defect future-hardening limitation and all production work still blocked.
- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md` — a bounded additive
  Phase 47N forward-traceability status note recording that the binding §16 P.2 / P.3 obligation it made binding has
  been **demonstrated (for the bounded non-production corridor)** by the merged Phase 47M evidence and **accepted** by
  this gate, with production-representative least privilege still deferred / blocked and production work still blocked.
- `docs/admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md` — a bounded additive Phase 47N
  forward-traceability status note recording that the §16 P.2 / P.3 gap that withheld full acceptance has been
  **cleared for the bounded Lane-1 non-production corridor** by the merged Phase 47M evidence and that **full Phase 47J
  acceptance is now recorded within the non-production Lane-1 limits** (the bounded, disabled-by-default,
  dev/operator/test-only, non-production execution-sink spike), with production execution still blocked.

**Corruption / duplicate guard** (carried from the 46I–47M precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 20.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §19 Codex audit
  checklist (a `text` block) and the §20 validation command list (a `bash` block). **No fenced block is an executable
  migration or runnable schema.**
