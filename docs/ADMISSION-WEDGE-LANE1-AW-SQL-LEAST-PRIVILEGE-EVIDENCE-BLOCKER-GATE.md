# Phase 47L — Lane-1 `aw_*` SQL least-privilege (P.2 / P.3) evidence blocker decomposition / authorization gate

> **Phase**: 47L
> **Branch context**: `phase-47l-aw-sql-least-privilege-evidence-blocker-gate`
> **Related**: Phase 47K (PR #182, commit `66c09514`,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md))
> **partially accepted (PATCH / NOT FULLY ACCEPTED)** the merged Phase 47J execution-sink spike — accepting its
> bounded, demonstrated proof components but **withholding full acceptance** against the binding Phase 47I §8–§21
> checklist because the **§16 P.2 / P.3 least-privilege execution-role / grant obligation was named-binding but not
> demonstrated** — and **selected this Phase 47L**, a strictly docs/decision-only least-privilege (P.2 / P.3) evidence
> blocker decomposition / authorization gate (Phase 47K §18); Phase 47J (PR #181, commit `a377922d`,
> [`admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md))
> **implemented** the bounded, disabled-by-default, dev/operator/test-only, **NON-PRODUCTION**, exact-scope Lane-1
> `aw_*` SQL **execution-sink** spike inside the Phase 47I file envelope (`--apply` possible **only** under the full
> §10 gate conjunction against a strictly non-production target); Phase 47I (PR #180,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md))
> **conditionally authorized** Phase 47J and made the §16 **P.1–P.7** privilege / secret / logging checklist binding;
> Phase 47H (PR #179,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-BOUNDARY-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-BOUNDARY-GATE.md))
> **decomposed** the execution-sink / real-DB boundary (its §14 privilege / secret boundary is the origin of the
> least-privilege requirement) and kept execution **BLOCKED**; Phase 47G (PR #178,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md))
> **accepted** the merged Phase 47F isolation spike as a bounded, disabled-by-default, dev/operator-only,
> **NON-PRODUCTION**, location-isolated SQL **planning / manifest / safety-proof** spike; Phase 47F (PR #177, commit
> `ae24ca35`,
> [`admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md))
> **implemented** the isolated SQL / manifest / planner / runner / tests / runbook (`--apply` refused); Phase 47A
> (PR #172) implemented Storage Mode 2 as a file-backed `.json` snapshot store, accepted by Phase 47B (PR #173) — the
> **live Option D / fallback** path; Straylight (`@loa/straylight`) PR #65 (A–O primitive review, **merged**);
> Straylight-repo ADR-022E durable-store gate #8 (+ sibling gates, **held operatively**); ADR-022D receipt /
> audit-chain invariants.
> **Status**: **docs / decision-only least-privilege (P.2 / P.3) evidence blocker decomposition / authorization gate.**
> This gate adds **only this document** (plus up to three minimal forward-traceability status notes, §20). It modifies
> **no** runtime source — and specifically does **not** modify `app/src/db/migrate.ts`,
> `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`, `app/src/server.ts`, `app/src/config.ts`,
> `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts`, the experimental `.sql` files, the
> `manifest.json`, the `aw-sql-isolation-spike-runner.mjs`, `no-leak.ts`, the
> `aw-sql-execution-sink-spike.test.ts`, the three extended Phase 47F test files, or `scope-guards.test.ts` — and
> changes **no** route handler, store / storage code, DB write, migration, SQL file, executable schema, migration
> runner, packager, scope guard, auth, consent, route-vector JSON, route-vector validator, route-vector README, Phase
> 33E fixture, fixture validator, other test, package export, config, env, package, lockfile, CI, generated file, or
> binary. No adjacent repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is the Lane-1 `aw_*` SQL least-privilege (P.2 / P.3) evidence *blocker decomposition / authorization* gate** —
> the docs-only rung Phase 47K §18 named, downstream of the Phase 47K partial acceptance. It **decomposes the binding
> §16 P.2 / P.3 least-privilege execution-role / grant evidence gap**, **decides how that gap is to be satisfied**, and
> **authorizes (Option A) a future, separate, bounded, dev/operator/test-only, disabled-by-default, non-production,
> disposable-Postgres-only evidence-producing lane (Phase 47M)** — *defining* that lane's envelope and the evidence it
> must produce **without producing any of it here**. **It is not the evidence lane, it produces no P.2 / P.3 evidence,
> runs no role / grant test, and implements nothing.** It **enables no `--apply`, injects no DB client / sink, opens no
> DB connection, performs no DB write, executes no migration, adds no SQL or executable schema, changes no migration
> runner / packager / startup / config, weakens or edits no scope guard, implements no auth or consent, changes no
> route / API behavior, freezes neither the route contract nor the final schema, discharges no operative
> Straylight-side gate, and claims no production readiness.** Full Phase 47J acceptance, MVP-2 closure, and all
> production work **remain BLOCKED**; the binding §16 P.2 / P.3 gap **remains undischarged** — Phase 47L only decides
> *how* a future lane would discharge it.

> **Phase 47M status note (forward traceability; added by the Phase 47M least-privilege evidence spike).** The future
> separate evidence lane this gate authorized (§17, Option A) has run:
> [`admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md)
> **produced** the **non-production, disposable** least-privilege (P.2 / P.3) evidence decomposed in §7–§13 — a
> dedicated least-privilege execution role (no superuser / `CREATEDB` / `CREATEROLE` / `CREATE` on `public`) drove the
> **frozen** Phase 47J forward `--apply`, the unqualified `aw_isolation_spike_*` DDL resolved into a dedicated
> non-`public` schema via a proven `search_path`, the minimal grant set was shown **necessary and sufficient** (F.1–F.7),
> the no-overreach boundary was demonstrated where representable (N.1–N.5), a set of live data-plane CHECK / UNIQUE /
> rollback probes was exercised under that same least-privilege role (invalid payload ref, wrong `awref` kind,
> overlength ref, out-of-range status / class, duplicate conflict, explicit rollback with no partial row), and cleanup
> ran under a **separate** role with **proven per-object ownership** via a documented ownership-transfer boundary
> (§10 Model A) — all inside the §14 envelope, with **no source / test / SQL change needed** (the existing runner
> sufficed; role / grant / schema / ownership setup is operator SQL outside the runner). Phase 47M **does not
> self-accept** and **does not clear P.2 / P.3**: it **records evidence for later acceptance-gate review**, and a
> **later, separate acceptance gate** — not Phase 47M — decides whether this evidence clears the binding §16 P.2 / P.3
> gap and unblocks full Phase 47J acceptance. The binding §16 obligation **remains undischarged** and full Phase 47J acceptance **remains
> withheld** pending that gate; MVP-2 closure, production DB execution / migration execution, **production-representative**
> least privilege, Lane-2 canonical migrations, route-contract / final-schema freeze, Freeside, and the operative
> ADR-022E gate #8 discharge **all remain blocked**.

> **Phase 47N status note (forward traceability; added by the Phase 47N least-privilege evidence acceptance gate).** The
> **later, separate acceptance gate** this gate named (§17) has run:
> [`ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-ACCEPTANCE-GATE.md)
> (strictly docs/decision-only; **produced no new evidence**) **adjudicated the merged Phase 47M evidence** against the
> §7–§13 requirements this gate decomposed (Verdict **A — ACCEPT**): every binding requirement is satisfied by recorded,
> redacted, disposable-local evidence, so the binding §16 P.2 / P.3 gap is **cleared for the bounded Lane-1
> non-production / disposable-local evidence corridor** and **full Phase 47J acceptance is recorded within the
> non-production Lane-1 limits**. This clears P.2 / P.3 **only** in that bounded sense — the **production-representative**
> least-privilege boundary this gate preserved (Option C, §7 / §16) stays **deferred and blocked** behind the operative
> ADR-022E gate #8. Production DB execution, MVP-2 closure, Lane-2 canonical migrations, the route-contract /
> final-schema freeze, and the operative ADR-022E gate #8 discharge **remain BLOCKED**; the selected next lane is a
> strictly docs/decision-only Phase 47O corridor-closure / remaining-MVP-2-blocker review gate.

> **Phase 47O status note (forward traceability; added by the Phase 47O corridor-closure review gate).** The Phase 47O
> Lane-1 `aw_*` SQL execution corridor-closure review gate
> ([`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-CORRIDOR-CLOSURE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-CORRIDOR-CLOSURE-GATE.md);
> strictly docs/decision-only; **produced no evidence**; Verdict **Option A — ACCEPT corridor closure**) reviewed the
> bounded non-production Lane-1 corridor after Phase 47N's P.2 / P.3 acceptance and **accepted closure of the bounded
> non-production `aw_*` SQL execution proof stack**. The P.2 / P.3 evidence track this gate decomposed is now part of
> that **closed bounded non-production proof corridor**. This is a **proof-corridor closure only**: the
> **production-representative** least-privilege boundary this gate preserved (Option C, §7 / §16) stays **deferred and
> blocked** behind the operative ADR-022E gate #8, and **MVP-2 REMAINS OPEN** with production DB execution, durable
> production storage, Lane-2 canonical migrations, the route-contract / final-schema freeze, Freeside, and the gate #8
> discharge **all still BLOCKED**; the selected next lane is a strictly docs/decision-only Phase 47P MVP-2
> remaining-blocker decomposition / next-corridor selection gate.

Every assessment below is grounded **read-only** against the **merged Phase 47J source and evidence record** in the
Dixie repo at authoring time (PR #181, commit `a377922d`, **8 files, +1902 / −52 lines, zero production-path / vector /
fixture files touched**), the Phase 47K partial-acceptance gate (PR #182, commit `66c09514`), and the binding Phase
47I §16 checklist. Nothing below is executed; this gate **decides and authorizes a future lane**, it does not run one.

---

## 1. Status / verdict

**Verdict: A — Decompose the binding §16 P.2 / P.3 least-privilege execution-role / grant evidence blocker and
AUTHORIZE a future, separate, bounded, dev/operator/test-only, disabled-by-default, non-production,
disposable-Postgres-only Phase 47M evidence-producing lane to satisfy it — while keeping Phase 47L itself strictly
docs / decision-only, and keeping full Phase 47J acceptance, MVP-2 closure, and all production work BLOCKED.**

This is **decision-structure Option A** (§16): authorize a future *separate* bounded evidence-producing lane for
P.2 / P.3 only. Option A is selected because the gap is **narrow, sharply bounded, and satisfiable in the same
disposable-Postgres, non-production posture Phase 47J already demonstrated** — it does not require production
credentials, a production DB, or any production-path change. It is **not** Option B (require another docs-only design
gate first — the blocker is now precisely decomposed and the envelope is definable, so no further docs gate is forced;
B remains the documented fallback, §16). It is **not** Option C (defer P.2 / P.3 to a later production-storage / auth
lane — the *non-production* least-privilege evidence is achievable now; only **production-representative** least
privilege is deferred, and that boundary is preserved, §7 / §16). It is **not** Option D (close MVP-2 anyway — rejected;
the binding obligation is undemonstrated and closure cannot proceed over a blocking acceptance gap, §16).

For the avoidance of doubt, **Phase 47L produces no P.2 / P.3 evidence**:

- **Phase 47L is strictly docs / decision-only.** It authorizes **no** docs/test-only implementation, **no** evidence
  run, and **no** non-runtime artifact production inside Phase 47L itself; it only *decides how* P.2 / P.3 is to be
  satisfied and *authorizes* (under a bounded envelope) a later separate lane (Phase 47M).
- **Phase 47L is not the Phase 47M evidence lane**, **does not** create a disposable database, **does not** create or
  identify any role, **does not** issue any grant, **does not** run forward or cleanup SQL under any role, and
  **does not** record any least-privilege evidence.
- **Phase 47L is not full Phase 47J acceptance and is not the MVP-2 closure gate.** Whether a future Phase 47M's
  evidence then clears the binding §16 P.2 / P.3 gap (and thereby unblocks full Phase 47J acceptance) is decided by a
  *later, separate* acceptance gate — not here, and not automatically by Phase 47M.
- **Phase 47L is not production execution, not `--apply` authorization, not production storage, not a production
  migration, and not a schema / route-contract freeze.**
- **Phase 47L is not an ADR-022E gate #8 discharge.** Gate #8 is Straylight-owned and operatively held; no Dixie-side
  proof can discharge it.

---

## 2. Scope

Phase 47L is the **docs/decision-only** Lane-1 `aw_*` SQL least-privilege (P.2 / P.3) evidence blocker decomposition /
authorization gate named by Phase 47K §18. Its job is to convert the Phase 47K **blocking acceptance gap** — the
binding §16 P.2 / P.3 least-privilege execution-role / grant obligation that Phase 47J **named but did not
demonstrate** — into (a) a precise decomposition of *what evidence would satisfy it*, (b) a bounded *file / scope
envelope* a future lane may occupy, (c) an explicit statement of *what remains blocked*, and (d) a decision on
*whether a future bounded evidence-producing lane may be authorized*.

**In scope (this PR):**

- this single new document; and
- up to three minimal forward-traceability status notes (§20) in the Phase 47K acceptance gate, the Phase 47I checklist
  gate, and the Phase 47J runbook.

**Explicitly out of scope (this PR) — Phase 47L produces nothing and runs nothing:**

- no P.2 / P.3 evidence of any kind; no disposable database; no role; no grant; no privilege test; no forward or
  cleanup SQL run under any role; no `psql` session; no Docker / Postgres invocation; no operator run;
- no runtime source / test / config / package / SQL / migration / route-vector / validator / fixture change;
- no edit to `index.ts`, the runner, `no-leak.ts`, `scope-guards.test.ts`, `migrate.ts`, `copy-migrations.mjs`,
  `server.ts`, `config.ts`, or any `*.sql`;
- no `--apply` enablement, no DB client / sink injection, no DB connection, no DB write, no migration execution;
- no route / API behavior change, no public response change, no Freeside integration;
- no Lane-2 canonical Straylight-store migration; no ADR-022E gate #8 discharge; no route-contract / final-schema
  freeze; no production readiness claim; no claim that `aw_*` SQL is production-safe;
- no adjacent-repo change; no memory / generated / temp / build artifact; no external memory write.

This gate **builds nothing and proves nothing**. Safety and least privilege are exactly what the *future* Phase 47M
lane must *prove* — not what this gate asserts.

---

## 3. Source chain and evidence intake

Each predecessor is read **read-only**; this gate re-accepts nothing and unblocks nothing.

- **Phase 47H (PR #179)** — decomposed the execution-sink / real-DB boundary into nine prerequisite classes. Its **§14
  privilege / secret boundary** is the *origin* of the least-privilege requirement: "No production DB roles. Execution
  must use a least-privileged role scoped to the experimental objects, never a production migration / admin role." and
  "Least privilege. The execution role must hold only the privileges required to create / drop the
  `aw_isolation_spike_*` family on the non-production target — no broader grant." Phase 47H *named* this; it authorized
  no role, no grant, no credential.
- **Phase 47I (PR #180)** — converted Phase 47H §14 into the **binding §16 P.1–P.7** privilege / secret / logging
  checklist (restated near-verbatim in §5 below — only P.5's stale runner line-anchor is corrected), and made
  satisfying it a **precondition for accepting** any future
  execution-sink lane (§20 test matrix M-items; §21 acceptance evidence E-items). P.2 / P.3 became *binding*, not
  optional.
- **Phase 47J (PR #181)** — implemented the bounded execution-sink spike inside the exact Phase 47I §8 envelope:
  a pure execution-gate conjunction added to the planner module (`index.ts`, still pool-free and `node:`-only; injected
  `IsolationSpikeStatementSink` interface `index.ts:124-129`; all-or-nothing `applyIsolationSpikePlan(plan, sink)`
  `index.ts:568`; the new execution-gate conjunction `index.ts:610` / `:634` / `:661` / `:700`), and the real sink /
  DB-client / non-production target policy added to the explicit runner (`aw-sql-isolation-spike-runner.mjs`, outside
  the guarded `SPIKE_FILES`). Its **§8 evidence record** documents a **one-off, redacted, disposable-Postgres-16.14
  operator run** (loopback-only, volume-less, `--rm`, torn down) proving the 3-table `aw_isolation_spike_*` family and
  its `CHECK` / `UNIQUE` constraints, mid-transaction conflict rollback with no partial admit, idempotent replay, gated
  reversible cleanup, and clean secret hygiene.
- **Phase 47K (PR #182)** — partially accepted Phase 47J (PATCH / NOT FULLY ACCEPTED): it accepted the bounded,
  demonstrated components (target-policy hardening, scheme allowlist, query-parameter refusal, fail-closed connect
  ordering, runner-only DB-touching, redacted disposable real-engine `CHECK` / `UNIQUE` / transaction evidence, gated
  reversible cleanup, public no-leak parity, exact file-envelope compliance, no production overclaim) but **withheld
  full acceptance** against the §8–§21 checklist because **§16 P.2 / P.3 was named but not demonstrated**, classified
  that gap as a **blocking acceptance gap** (not accepted-by-design, not merely out-of-scope), and **selected Phase
  47L** as a strictly docs/decision-only blocker / authorization gate before any MVP-2 closure.

**Evidence intake (read-only):** the binding requirement is Phase 47I §16 P.2 / P.3; the demonstrated-absence is in the
Phase 47J runbook §8 (the recorded operator run identifies **only** a redacted connection user / password and a
disposable database target — see §6); the blocking-gap classification is Phase 47K §16 / §17. Phase 47L changes none of
these source documents except to append the minimal forward-traceability notes in §20.

---

## 4. Phase 47K blocker being decomposed

Phase 47K recorded the gap precisely (§16 / §17): a **BLOCKING ACCEPTANCE GAP — no least-privilege role / grant proof
(P.2 / P.3).** The binding Phase 47I §16 least-privilege execution-role / grant obligation was **named but not
demonstrated**: the recorded Phase 47J evidence identifies **only a redacted connection user / password and a
disposable database target**; it does **not** document a role, grants, privileges, or a least-privilege boundary.

This is the singular reason full Phase 47J acceptance was withheld, and it is the precise object Phase 47L decomposes.
Its classification, **carried forward unchanged**, is load-bearing:

- It is a **blocking acceptance gap**, **not** an accepted-by-design characteristic. A connection user without a
  documented scoped role/grant set is not "least privilege by intention"; it is "least privilege **not yet shown**."
- It is **not merely out-of-scope**. Phase 47I §16 made P.2 / P.3 *binding* for acceptance; the obligation is in scope
  and unmet.
- It is **distinct** from the *non-defect future-hardening limitation* Phase 47K also recorded (the absence of a
  standing / CI live-engine regression guard). The CI-guard absence is a known characteristic, not a blocker; the
  P.2 / P.3 gap **is** the blocker. Phase 47L must not conflate the two or downgrade the P.2 / P.3 gap to a "limitation."

What Phase 47L does with the gap: it **decomposes** it into the specific evidence that would satisfy it (§5–§13),
**bounds** the lane that may produce that evidence (§14), preserves everything that stays blocked (§15), and
**decides** how to proceed (§16) — selecting a future, separate, bounded evidence-producing lane (§17). Phase 47L does
**not** close the gap; it scopes the lane that could.

---

## 5. P.2 / P.3 requirement restatement

The binding obligation is the Phase 47I §16 privilege / secret / logging checklist, restated here **near-verbatim** —
the binding obligation wording is carried from Phase 47I §16; only P.5's stale `runner :112-118` line-anchor (which
named the target-policy refusal-code comments, **not** runner output) is corrected to the current runner output sites —
so the future lane carries no ambiguity:

- **P.1 No production credentials.** Non-production credentials only; production DB credentials never reach the spike.
- **P.2 No production DB roles.** A least-privileged role scoped to the experimental objects, never a production
  migration / admin role.
- **P.3 Least privilege.** The execution role holds only the privileges required to create / drop the
  `aw_isolation_spike_*` family on the non-production target — no broader grant.
- **P.4 No secret logging.** No credential, connection string, password, or token is logged.
- **P.5 No DSN echo.** The target DSN never appears on stdout / stderr or any log; the runner output stays minimal and
  non-secret — the dry-run plan summary (`aw-sql-isolation-spike-runner.mjs:420-426`), the codes-only target refusal
  (`aw-sql-isolation-spike-runner.mjs:436`), and the applied summary (`aw-sql-isolation-spike-runner.mjs:465-467`) emit
  no DSN, credential, host, port, or DB name, under the runner's secret-hygiene contract
  (`aw-sql-isolation-spike-runner.mjs:35-38`).
- **P.6 No env dump.** No environment variable values are dumped.
- **P.7 No migration content leak beyond the known static SQL.** The only statement text is the static `.sql` under
  `aw-sql-isolation-spike/sql/`; no dynamic SQL, no payload-derived SQL, no private material.

**Status of each item, intaken read-only (Phase 47L asserts no new satisfaction):**

- **P.1, P.4, P.5, P.6, P.7** were *demonstrated* by the Phase 47J §8 operator run's secret-hygiene evidence and
  non-production target policy (non-production credentials only; no DSN / credential / env in runner output; only the
  static `.sql` text). These are **not** the subject of this gate.
- **P.2 and P.3** are the **undemonstrated, binding gap.** The Phase 47J evidence used *a* connection user against a
  disposable database, but it did **not** establish that the connecting principal is a **least-privileged role scoped
  to the experimental objects** (P.2) or that it holds **only the privileges required to create / drop the
  `aw_isolation_spike_*` family — no broader grant** (P.3). A connection *user* that may be a superuser, the default
  `postgres` role, or an unscoped owner is exactly what P.2 / P.3 forbid as *unproven*.

The decomposition that follows (§7–§13) defines, for the future lane only, what evidence would convert P.2 / P.3 from
**named** to **demonstrated** — bounded to a **non-production, disposable** setting.

---

## 6. What current evidence does and does not show

Grounded read-only against the Phase 47J runbook §8 evidence record.

**What the recorded Phase 47J operator run *does* show (accepted by Phase 47K):**

- a **redacted connection identity** — a connection *user* and *password*, both redacted
  (`postgres://<redacted-user>:<redacted-pass>@<redacted-loopback>:<redacted-port>/<redacted-disposable-db>`);
- a **disposable database target** — a loopback host, a disposable DB-name marker, no query string, accepted by the
  §11 target policy;
- that the forward `--apply` **created the 3-table `aw_isolation_spike_*` family and its `CHECK` / `UNIQUE`
  constraints** against a live Postgres 16.14 engine;
- that runtime `CHECK` enforcement, `UNIQUE`-conflict rollback (no partial admit), idempotent replay, and gated
  reversible cleanup behaved as designed;
- **clean secret hygiene** — no DSN / password / host / port / DB name in runner output (P.4 / P.5 / P.6 / P.7).

**What the recorded Phase 47J operator run *does not* show (the P.2 / P.3 gap):**

- **no role** — the connection identity is recorded as a *user / password*, not as a **named, dedicated,
  least-privileged role** scoped to the experimental objects;
- **no grants** — no `GRANT` / privilege set is documented; there is no record of *which* privileges the connecting
  principal held;
- **no least-privilege boundary** — there is no evidence that the principal held **only** the privileges required to
  create / drop the `aw_isolation_spike_*` family and **no broader grant**; the run is equally consistent with a
  superuser, the default `postgres` role, or an unscoped owner;
- **no no-overreach proof** — there is no evidence that the principal **could not** reach unrelated schemas, tables, or
  databases.

**The precise distinction the future lane must close:** a *connection user that happens to work* is not the same as a
*least-privileged role demonstrated to hold only the minimum privileges*. P.2 / P.3 require the latter; Phase 47J
recorded only the former. Phase 47L scopes a lane to record the latter — **in a disposable, non-production setting
only**.

---

## 7. Least-privilege evidence model

This section defines the **model** a future lane must satisfy. It defines **no** specific grant set as proven; it
states what *would have to be proven*, and it draws a hard boundary between two different things that must never be
conflated.

**Two distinct least-privilege concepts — only the first is in the future lane's scope:**

1. **Non-production least-privilege evidence (in scope for Phase 47M).** Evidence that, **on a disposable
   non-production Postgres**, a **dedicated least-privileged role with an explicit, minimal grant set** can run the
   bounded Phase 47J forward execution path — creating exactly the 3-table `aw_isolation_spike_*` family and its
   `CHECK` / `UNIQUE` constraints — and that **no broader grant is required** for that forward path. This is the
   bounded evidence that, once produced **and** later accepted, would be **sufficient to discharge the binding §16
   P.2 / P.3 obligation for the purpose of full Phase 47J acceptance**.
2. **Production-representative least-privilege policy (OUT of scope; deferred and BLOCKED).** A production role / grant
   policy against a production-like or production database — production-representative privilege scoping, production
   role provisioning, production grant review — **remains blocked** and is the concern of a **later
   production-storage / auth gate**, behind the operative ADR-022E gate #8 (§15). Phase 47L authorizes **none** of it
   and creates **no** future obligation that requires a production DB, production credentials, or production-like
   access.

**The bounded claim Phase 47M must establish (and only this):** *On a disposable, non-production target, the bounded
Phase 47J forward execution path can run under a dedicated least-privileged role holding only the privileges required
to create the experimental family — not a superuser, not a production migration / admin role, and no broader grant.*
This is an **operator-grade, disposable, non-production** demonstration — explicitly **not** CI, **not** production,
**not** production-readiness, and **not** a production-representative least-privilege proof.

**Guardrails on the model (binding on the future lane):**

- Do **not** claim production-representative least privilege; the disposable evidence proves nothing about production
  privilege boundaries.
- Do **not** require production credentials or production-like DB access.
- Do **not** create a future obligation that requires a production DB.
- Keep all evidence **local, disposable, non-production, operator-only** unless a later production gate authorizes
  more.

---

## 8. Disposable non-production role / grant boundary

The future lane must set up — **on a disposable, loopback-only, non-production Postgres only**, mirroring the Phase 47J
operator-run posture — a role / grant boundary it can demonstrate. The following is **design guidance for the future
lane**, not a proven grant set and not an instruction to run anything now:

- **A disposable non-production database** — created for the run and destroyed after it (loopback-only, volume-less,
  `--rm`, torn down), exactly as the Phase 47J §8 operator run already did for its disposable target.
- **A dedicated disposable execution role** — created or identified specifically for the run, **distinct from**
  superuser, the default `postgres` role, and any production migration / admin role (P.2). It must be a role the lane
  can name, scope, and tear down.
- **A minimal grant set** — the **least** privileges required for the bounded forward path. For creating the
  `aw_isolation_spike_*` family in a dedicated schema, that is typically only the schema-scoped object-creation
  privilege (e.g. `USAGE` + `CREATE` on a single dedicated disposable schema, or ownership of that schema), and
  `CONNECT` to the disposable database — **and nothing broader** (no superuser, no `CREATEDB`, no `CREATEROLE`, no
  database-wide or cross-schema grant). The future lane must **decide and record** the exact minimal set; Phase 47L
  does **not** fix it, because fixing it would be inventing evidence.
- **A dedicated disposable schema with an explicit, proven `search_path` (REQUIRED, not merely recommended).** The
  Phase 47J forward SQL creates the family with **unqualified** table names (`CREATE TABLE IF NOT EXISTS
  aw_isolation_spike_*` at
  `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/sql/0001_aw_isolation_spike_init.sql:34` / `:71` /
  `:96`), and Phase 47M **must not rewrite the `.sql`** (the experimental SQL stays frozen, §14). Because the names are
  unqualified, *where* the objects are created is decided entirely by the session / role `search_path`. Phase 47M must
  therefore **establish an explicit dedicated experimental schema** and **set and prove a session / role `search_path`**
  that resolves the unqualified `aw_*` object creation **into that dedicated schema — never `public`**, must prove
  `public` is **not** the object-creation target, and must prove the least-privilege execution role holds **no `CREATE`
  on `public`** (reinforcing §11 N.4). Confining the family to a single non-`public` schema is also what makes the
  no-overreach boundary (§11) representable and keeps the grant set minimal. Phase 47L establishes **no** schema and
  **no** `search_path`; this is a requirement on the future lane only.

This boundary is **disposable and non-production by construction**: nothing here references a production DB, a
production role, a production `DATABASE_URL`, or production credentials, and nothing here is wired into startup,
config, packaging, or the production migration runner.

---

## 9. Forward execution evidence requirements

For the **forward** path only, the future Phase 47M lane must demonstrate (on the disposable non-production target):

- **F.1 Create the disposable database** — a non-production, disposable database, destroyed after the run.
- **F.2 Create or identify the disposable least-privilege execution role** — dedicated, scoped, non-superuser,
  non-production (P.2).
- **F.3 Grant only the minimal privileges** required for the Phase 47J forward SQL — no broader grant (P.3); the exact
  grant set is recorded.
- **F.4 Run the forward SQL under that least-privilege role** — drive the Phase 47J forward `--apply` (or an equivalent
  bounded forward run) **as the least-privilege role**, not as a superuser / owner-by-default.
- **F.5 Prove the expected objects exist** — the 3-table `aw_isolation_spike_*` family and its `CHECK` / `UNIQUE`
  constraints are created by the forward run under the least-privilege role (the same objects Phase 47J §8 already
  showed, but now demonstrably under the scoped role).
- **F.6 Prove overbroad privileges are not required** — the forward run **succeeds without** superuser, without a
  production migration / admin role, and without any grant beyond the minimal set; i.e. the minimal grant set is
  *sufficient*, and removing any superfluous privilege does not break the forward path.
- **F.7 Establish and prove the dedicated-schema `search_path`** — because the forward SQL uses **unqualified** table
  names (§8), set an explicit session / role `search_path` and **prove** the unqualified `aw_*` `CREATE TABLE`
  statements resolve into the dedicated experimental schema, **not** `public`; prove `public` is **not** the
  object-creation target and that the least-privilege role holds **no `CREATE` on `public`** (P.3 / §8 / §11 N.4).
  Phase 47M must not rewrite the SQL (§14) — the `search_path` is the only permitted mechanism.

These requirements convert P.3 from "named" to "demonstrable" **for the forward path**. They are **requirements for a
future lane**, not results; Phase 47L runs none of them.

---

## 10. Cleanup / down privilege model

Cleanup / down (the `DROP TABLE IF EXISTS` reverse path) has a **different** privilege profile from forward creation,
and the future lane must handle it explicitly. In PostgreSQL there is no separate "DROP" privilege: an object can be
dropped only by its **owner** (or a superuser). So a role scoped to *create* the family may or may not be the right
role to *drop* it, depending on ownership. The future lane must **decide and prove one** of the following two models —
and must **not** silently widen the forward least-privilege role to absorb cleanup:

- **Model A — Separately authorized cleanup role with proven per-object drop authority.** Cleanup / down runs under a
  **separate, separately documented** disposable role authorized for the drop path only — and that role's drop
  authority must be **proven**, not assumed. Because a table can be dropped only by its **owner** (or a superuser),
  **owning the schema is not sufficient** to drop tables the role does not own. Phase 47M must therefore either
  (a) **prove the cleanup role owns every experimental object it drops** (each `aw_isolation_spike_*` table), or
  (b) **document an elevated setup / ownership-transfer boundary** that transfers ownership of **every created
  experimental object** to the cleanup role **before** cleanup is tested. Either way the forward least-privilege
  execution role stays minimal and is **not** the cleanup role, and the evidence (§13) must record per-object
  ownership / drop authority for each dropped object — **schema ownership alone is never accepted as proof of drop
  authority**.
- **Model B — Documented elevated cleanup privileges, excluded from the least-privilege execution role.** Cleanup /
  down is **explicitly documented as requiring elevated privileges** (e.g. ownership / drop authority) and is
  therefore **not** part of the least-privilege *execution* role. The least-privilege execution role's claim is scoped
  to the **forward** path; cleanup is an acknowledged, separately-privileged step.

Either model is acceptable **for the disposable non-production evidence**, provided the lane is explicit about which it
chose and why, and provided the cleanup privileges are **never** folded into the forward least-privilege role's claimed
minimal grant. The gated, opt-in, reversible-by-recreation cleanup behavior Phase 47J already demonstrated
(`--apply --direction=cleanup` under the **distinct** cleanup opt-in; `CLEANUP_OPT_IN_MISSING` fail-closed) is
**preserved unchanged**; this section adds only the **privilege model** the future lane must record, not any new
cleanup behavior.

**Cleanup must resolve through the same dedicated-schema `search_path` (binding on Phase 47M).** The cleanup / down SQL
is also **unqualified** (`DROP TABLE IF EXISTS aw_isolation_spike_*` at
`app/src/services/admission-wedge-spike/aw-sql-isolation-spike/sql/0001_aw_isolation_spike_init_down.sql:14` / `:15` /
`:16`), and Phase 47M must not rewrite it (§14). Phase 47M must therefore **prove the cleanup / down path resolves the
unqualified object names through the same dedicated experimental schema `search_path`** (§8) — so it drops the
experimental family inside the dedicated schema and **never** touches `public` — or explicitly document the cleanup
role / session `search_path` and the ownership-transfer boundary it relies on.

---

## 11. Negative privilege / no-overreach checks

To make P.2 / P.3 a *boundary* and not just a *sufficiency* claim, the future lane must — **where representable in the
disposable setup** — demonstrate what the least-privilege role **cannot** do:

- **N.1 No unrelated-schema access** — the role cannot read or write tables in schemas other than its dedicated
  experimental schema (e.g. it cannot `SELECT` / `INSERT` into `public` or system-adjacent application tables, if any
  exist in the disposable DB).
- **N.2 No unrelated-table access** — the role cannot reach tables outside the `aw_isolation_spike_*` family beyond
  what the minimal grant allows.
- **N.3 No cross-database access** — the role cannot connect to or operate on databases other than the disposable
  target (no `CONNECT` to other databases).
- **N.4 No out-of-scope creation** — the role cannot create objects outside its dedicated schema (e.g. cannot create
  in `public` if not granted), and holds no `CREATEDB` / `CREATEROLE` / superuser attributes.
- **N.5 No privilege escalation** — the role cannot grant itself further privileges, alter its own role attributes, or
  assume another role.

**Caveat (binding):** these checks are required **only to the extent they are representable in a disposable
non-production setup**. A single freshly-created disposable database with one dedicated schema may not contain
unrelated application schemas to probe; the lane must record **which** no-overreach checks were representable and
demonstrated, and which were **not representable** in the disposable setup (and are therefore deferred to a later
production-storage / auth gate, §7 / §15). The lane must **not** stand up production-like data, production schemas, or
a production database in order to make these checks representable.

---

## 12. Secret / no-leak requirements

The future lane inherits the full Phase 47J / §16 secret-hygiene posture **unchanged and binding**, with additional
requirements specific to roles / grants:

- **S.1 No raw DSN / secret / role credential recorded in the repo** — no connection string, password, token, role
  password, or grant statement containing a credential is committed to the repository. The role's *name* and its
  *grant set* may be described in redacted, non-secret form; its **credentials** must never appear.
- **S.2 Redacted evidence only** — any recorded evidence artifact (§13) redacts the DSN, password, host, port, DB
  name, and any role credential, exactly as the Phase 47J §8 evidence block already does
  (`<redacted-user>` / `<redacted-pass>` / `<redacted-loopback>` / `<redacted-port>` / `<redacted-disposable-db>`).
- **S.3 Failure cases leak no secrets** — refusal / failure paths emit only stable, **non-secret** reason codes (the
  Phase 47J `ISOLATION_SPIKE_EXECUTION_REFUSAL` / target-policy `TARGET_*` families); no DSN, host, redirected
  hostname, file path, role credential, or grant secret appears on stdout / stderr or in any log (P.4 / P.5 / P.6).
- **S.4 No production DB or production role touched** — the lane connects to **no** production database and uses /
  creates **no** production role; the production `DATABASE_URL` (`config.ts:340`) is never a target and is never read
  by the lane.
- **S.5 Static SQL only** — the only statement text remains the static `.sql` under `aw-sql-isolation-spike/sql/` plus
  the role / grant DDL the lane runs against the disposable target; no dynamic, payload-derived, or private SQL
  (P.7).

---

## 13. Future evidence artifact requirements

The future Phase 47M lane must record a **bounded, redacted, non-production operator evidence artifact** — analogous to
the Phase 47J runbook §8 block — that demonstrates the §9 forward requirements, the §10 cleanup privilege model, and
the §11 no-overreach checks. Binding requirements on the artifact:

- **A.1 Redaction-first** — the artifact redacts every credential and target identifier (§12 S.1 / S.2); it records the
  role *name* and *grant set* in non-secret form only.
- **A.2 Records the minimal grant set** — the artifact states the **exact** privileges granted to the least-privilege
  execution role and confirms the forward path succeeds under them with **no broader grant** (P.3 / §9 F.3 / F.6).
- **A.3 Records the cleanup privilege model and per-object drop authority** — the artifact states whether Model A
  (separate cleanup role **proven to own every dropped object**, or a documented ownership-transfer boundary) or
  Model B (documented elevated cleanup, excluded from the LP role) was chosen and why, and records the per-object
  ownership / drop authority for each dropped `aw_isolation_spike_*` object — schema ownership alone is never accepted
  as proof (§10).
- **A.4 Records the no-overreach results** — the artifact states which §11 checks were representable and demonstrated
  and which were not representable in the disposable setup (and thus deferred).
- **A.5 Bounded posture, explicitly labeled** — the artifact is labeled a **one-off, bounded, non-production,
  dev/operator proof only**; it is **not** CI, **not** production, **not** production-readiness, and **not** a
  production-representative least-privilege proof. Reproducing it requires an operator to stand up their own disposable
  Postgres, exactly as Phase 47J §8 already states.
- **A.6 No production overclaim** — the artifact makes **no** claim of production safety, production least privilege,
  route-contract / final-schema freeze, ADR-022E gate #8 discharge, Lane-2 canonical migration, or Freeside runtime.
- **A.7 Records the dedicated-schema `search_path` proof** — the artifact states the dedicated experimental schema and
  the session / role `search_path`, and shows the unqualified forward `CREATE TABLE` and cleanup `DROP TABLE`
  statements resolve into that schema (**not** `public`), that `public` is **not** the object-creation target, and that
  the least-privilege role holds **no `CREATE` on `public`** (§8 / §9 F.7 / §10 / §11 N.4).

The artifact is something the **future lane** records; Phase 47L records **no** such artifact and invents **no**
least-privilege evidence.

---

## 14. Future file / scope envelope

The future Phase 47M lane is bounded to the **exact Phase 47I §8 file-scope envelope** (which Phase 47J already
occupied), plus a new Phase 47M runbook. **Defining this envelope authorizes no file change in this PR.** The candidate
scope, carried as binding bounds on the future lane:

- **Posture** — dev/operator/test-only; **disabled-by-default**; **non-production**; **disposable local Postgres
  only**; **no** production DB; **no** production `DATABASE_URL`; **no** startup wiring; **no** config behavior change;
  **no** package / lockfile change; **no** production migration files; **no** route / API change; **no** public
  response change; **no** Freeside integration; **no** Lane-2 canonical Straylight-store migration; **no** production
  readiness; **no** claim that `aw_*` SQL is production-safe.
- **Potentially allowed files in the future Phase 47M lane only** (each gated on a §9–§13 obligation):
  - `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts` — **modified in place only** if a minimal
    dependency-injection refinement is genuinely needed; it **must remain pool-free and `node:`-only**, must **not**
    import the production DB pool or any module that transitively opens `DATABASE_URL`, and must keep passing the
    canonical **19-entry `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`)** with zero hits and no allowlist.
  - `app/scripts/aw-sql-isolation-spike-runner.mjs` — **modified in place only** to drive the disposable
    least-privilege role / grant evidence run, under the full §10 gate conjunction against a strictly non-production
    target (§11 target policy). It must remain the **only** DB-touching caller, disabled-by-default, never imported by
    `server.ts`, never on startup, and not wired into any `package.json` lifecycle script. Any role / grant DDL and
    target env labels are read **only inside the runner**, never parsed in `config.ts`.
  - the three existing Phase 47F test files and the new `aw-sql-execution-sink-spike.test.ts` — **extended only** to
    cover the least-privilege role / grant evidence behavior against a fake / ephemeral target (no regression on the
    Phase 47F / 47J suites; no external DB contacted by the unit suite).
  - `docs/admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md` — **a new** dev/operator-only
    runbook (created by Phase 47M, **not** now), recording the §13 evidence artifact.
  - this document — which would gain a Phase 47M forward-traceability status note when Phase 47M runs.
- **Forbidden surfaces (unchanged from Phase 47I §9, even in Phase 47M)** — `migrate.ts` (the 254-line production
  migration runner; `MIGRATIONS_DIR` `migrate.ts:23`; predicate `migrate.ts:79`; advisory lock `migrate.ts:153-160`;
  `_migrations` ledger `migrate.ts:46-55`); `copy-migrations.mjs` (the build-asset packager); `server.ts` (startup
  stays unchanged; the only startup DB call remains `await migrate(dbPool)` at **`server.ts:303-305`**); `config.ts`
  (485 lines; `DATABASE_URL` at `config.ts:340`); `scope-guards.test.ts` (the canonical 19-entry denylist
  `scope-guards.test.ts:122-142` and the forbidden-import test `scope-guards.test.ts:185-198` stay in force,
  unweakened). No production migration files, executable production schema, or production `.sql` may be added.
- **Closed envelope** — the list above is the **exact, finite, closed** allowed envelope for Phase 47M. **Any**
  additional source / helper / module / script / adapter file — **even** under
  `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/` or under `app/scripts/` — requires a **separate docs
  authorization gate before Phase 47M**, and Phase 47M must not add one absent that gate.

Phase 47L creates **none** of these files (it creates only this document and the §20 notes); the list is a *proposed
future envelope only*.

---

## 15. Remaining blockers

Regardless of this gate's authorization of a future evidence lane, the following remain **blocked** after Phase 47L —
**none** is unblocked by this gate:

- **the binding §16 P.2 / P.3 least-privilege obligation** — **remains undischarged**; Phase 47L decides only *how* a
  future lane would discharge it and does **not** discharge it;
- **full Phase 47J acceptance** — **remains withheld**; it cannot proceed until the Phase 47M evidence is **produced
  and then accepted by a later, separate acceptance gate**;
- **MVP-2 storage / audit closure** — blocked; not selected here and not selectable until the binding gap is resolved
  and accepted;
- **production DB execution; production `--apply`; production DB writes; production migration execution** — blocked;
- **production durable-store implementation; production migration files; executable production schema** — blocked;
- **startup mutation (`server.ts`); config / env wiring (`config.ts`); package / lockfile changes** — blocked;
- **migration-runner (`migrate.ts`) / packager (`copy-migrations.mjs`) / scope-guard (`scope-guards.test.ts`) changes**
  — blocked;
- **production-representative least-privilege policy** — **deferred and blocked**; only *non-production, disposable*
  least-privilege evidence is in the Phase 47M scope (§7);
- **route / API behavior change; public response expansion; raw candidate payload persistence** — blocked; the public
  shape and the **114 = 114** runtime ↔ validator no-leak parity (`no-leak.ts`) stay unchanged;
- **route-contract freeze (`route_contract_final` stays false); final schema freeze (`schema_final` stays false; no
  `aw_*` migration is claimed safe)** — blocked;
- **Lane-2 canonical Straylight-store migrations** — blocked (each a separate sibling-repo ADR under Straylight
  teammate review, behind the operative gate #8);
- **operative Straylight-side ADR-022E gate #8 discharge** — not claimed; **the dominant cross-repo blocker** for
  production admission and any Lane-2 canonical-store migration;
- **Freeside runtime / client integration** — blocked (Freeside stays a consumer / handoff surface);
- **production admission; signer / consent / auth resolution; public `remember-this`; user chat becoming memory merely
  because it was said** — blocked.

**Candidate D / ADR-022E boundary preserved.** Candidate D (split-storage) remains **proposal input / design baseline,
not implemented production architecture**; Phase 46N's gate #8 clearing remains a **bounded Dixie documentation /
architecture / handoff prerequisite only**; the operative Straylight-side discharge stays blocked. The accepted Phase
47A `.json` Mode 2 path remains the **live Option D / fallback** if a future lane cannot satisfy a closure bar without
weakening the production posture.

---

## 16. Decision options

The Phase 47K §18 decision routed to this gate. Phase 47L weighs four options for handling the missing P.2 / P.3
evidence before any future full Phase 47J acceptance or MVP-2 closure:

### Option A — Authorize a future, separate, bounded evidence-producing lane for P.2 / P.3 only. **SELECTED.**

A future, separate, bounded, dev/operator/test-only, disabled-by-default, non-production, disposable-Postgres-only lane
(Phase 47M) is authorized to produce the **non-production least-privilege role / grant evidence** decomposed in
§7–§13, inside the §14 envelope. **Selected** because the gap is narrow, sharply bounded, and **satisfiable in the same
disposable, non-production posture Phase 47J already demonstrated** — it needs no production credentials, no production
DB, and no production-path change. Phase 47L itself stays strictly docs/decision-only and produces no evidence; whether
Phase 47M's evidence then clears the gap is a *later* acceptance decision.

### Option B — Require another docs-only design gate before authorizing evidence production. **Documented fallback, not selected.**

**Not selected** because Phase 47L has already decomposed the blocker precisely (§5–§13) and the lane's envelope is
definable (§14); no further docs-only design gate is *forced* before the evidence lane. Option B **remains the
documented fallback**: if, in authoring or audit, the Phase 47M scope proves not precise enough (e.g. the no-overreach
representability question, §11, or the cleanup privilege model, §10, needs further design), a further docs-only design
gate is taken **before** Phase 47M rather than widening Phase 47M's scope.

### Option C — Decide P.2 / P.3 cannot be satisfied inside the Lane-1 `aw_*` spike posture; defer to a later production-storage / auth lane. **Not selected as the whole answer; its boundary is preserved.**

**Not selected** as the disposition of the *binding gap*, because **non-production, disposable** least-privilege
evidence **is** achievable inside the Lane-1 `aw_*` spike posture (§7 / §8) — that is precisely what makes Option A
viable. **However, Option C's boundary is preserved in full:** **production-representative** least-privilege policy
**cannot** be satisfied inside this posture and **is deferred** to a later production-storage / auth gate behind the
operative ADR-022E gate #8 (§7 / §15). Phase 47L honors C for production least privilege while selecting A for the
bounded non-production evidence the binding §16 obligation actually requires.

### Option D — Close MVP-2 anyway despite P.2 / P.3 missing. **REJECTED.**

**Rejected.** Closing MVP-2 over a **blocking acceptance gap** (Phase 47K §16 / §17) would assert satisfaction of a
binding obligation that is undemonstrated. No strong justification exists; the conservative, "do not rush" posture
requires the evidence to be **produced and accepted** first. MVP-2 closure remains blocked and not selected (§15).

**Conclusion.** Decision-structure **Option A**: authorize a future, separate, bounded evidence-producing lane (Phase
47M) for P.2 / P.3 only; keep Phase 47L docs/decision-only; preserve Option C's production-least-privilege boundary;
reject Option D; hold Option B as the fallback.

---

## 17. Selected next lane

> **Selected next lane: Phase 47M — Lane-1 `aw_*` SQL least-privilege (P.2 / P.3) evidence spike (a *separate*,
> bounded, dev/operator/test-only, disabled-by-default, non-production, disposable-Postgres-only, code/evidence-bearing
> lane — NOT this PR, and NOT a production / closure lane).**

Phase 47M is the **future, separate** lane authorized by Option A. It would, on a **disposable non-production
Postgres**, set up the §8 role / grant boundary, run the §9 forward execution evidence under a least-privilege role,
record the §10 cleanup privilege model, demonstrate the §11 no-overreach checks (to the extent representable), satisfy
the §12 secret / no-leak requirements, and record the §13 redacted evidence artifact in a new Phase 47M runbook — all
inside the §14 envelope. It is **bounded** exactly as §14 states (disabled-by-default; non-production; disposable local
Postgres only; no production DB / `DATABASE_URL` / startup wiring / config / package / lockfile / production migration
/ route / public-response change; no Freeside; no Lane-2 canonical migration; no production readiness; no
production-safe claim).

**Phase 47M is not this PR.** Phase 47L defines its envelope but **implements none of it**.

**A later acceptance gate, not Phase 47M itself, decides discharge.** Whether the Phase 47M evidence, once produced,
actually **clears the binding §16 P.2 / P.3 gap** — and thereby **unblocks full Phase 47J acceptance** — is decided by
a **subsequent, separate acceptance gate** (the rung after Phase 47M), mirroring the 47F→47G, 47J→47K
implement→accept precedent. Phase 47L does **not** pre-accept Phase 47M's evidence, and Phase 47M does **not**
self-accept.

**Not selected:** authorize a docs/test-only or evidence-producing Phase 47L (rejected — Phase 47L is strictly
docs/decision-only); declare Phase 47J fully accepted / head straight into MVP-2 closure (rejected — Option D, §16);
defer the whole obligation to a production lane (rejected as the whole answer — Option C boundary preserved only for
production least privilege, §16); require another docs-only design gate now (Option B fallback, not forced, §16);
authorize production execution, production `--apply`, production durable storage, production migration execution,
Lane-2 canonical migrations, any freeze, or a gate-#8 discharge (all blocked, §15).

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

## 18. Non-goals

Phase 47L is **not**, and does **not** authorize, any of the following (each remains its own separately-gated future
work or a standing blocker — §15):

- producing P.2 / P.3 evidence; creating a disposable database; creating or identifying any role; issuing any grant;
  running any privilege / role / grant test; running forward or cleanup SQL under any role; any `psql` / Docker /
  Postgres invocation; any operator run;
- production DB execution; production DB writes; production migration execution; production durable storage;
- startup wiring; config behavior changes; package / lockfile changes; production migration files;
- public route / API behavior changes; public response expansion; raw candidate payload persistence;
- route-contract freeze; final schema freeze; ADR-022E gate #8 discharge;
- Freeside runtime / client integration; Lane-2 canonical Straylight-store migrations;
- production readiness; any claim that `aw_*` SQL is production-safe;
- any claim that production-representative least privilege is demonstrated, or that any disposable evidence proves
  production privilege boundaries;
- any claim that Phase 47J is **fully accepted** against the Phase 47I §8–§21 checklist, or that the binding §16
  P.2 / P.3 least-privilege role / grant obligation is satisfied;
- MVP-2 storage / audit closure; declaring the corridor complete.

Phase 47L **decomposes** the binding P.2 / P.3 gap and **authorizes a bounded future lane** to produce the
non-production least-privilege evidence — both the least-privilege role / grant evidence and the discharge of the
binding obligation are exactly what *future* lanes must *produce and accept*, not what this gate asserts.

---

## 19. Codex audit checklist

This checklist audits **this Phase 47L PR** — the docs-only least-privilege (P.2 / P.3) evidence blocker decomposition
/ authorization gate. Every item must be ACCEPT; any REJECT blocks acceptance of this Phase 47L PR.

```text
PHASE 47L — LANE-1 aw_* SQL LEAST-PRIVILEGE (P.2 / P.3) EVIDENCE BLOCKER DECOMPOSITION / AUTHORIZATION GATE
CODEX AUDIT CHECKLIST
(docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47L PR)

[ ] 1.  Scope is docs-only — Phase 47L adds only this document plus up to three §20 forward-traceability status
        notes (in the Phase 47K acceptance gate, the Phase 47I checklist gate, and the Phase 47J runbook); it
        modifies no runtime source, and specifically not migrate.ts, copy-migrations.mjs, any *.sql, the
        experimental SQL / manifest / planner (aw-sql-isolation-spike/*) / runner, no-leak.ts,
        aw-sql-execution-sink-spike.test.ts, the three extended Phase 47F test files, config.ts, server.ts, or
        scope-guards.test.ts.
[ ] 2.  No runtime/source/test/config/package/CI/SQL/migration/vector/validator/fixture changes — no route
        handler, store/storage code, DB code, migration runner, packaging/copy runner, planner, runner, auth,
        consent, server-boot, unit/integration test, scope-guard test, isolation test, fixture, route-vector
        JSON, route-vector validator, route-vector README, config.ts, env gate, package.json, lockfile, .github/
        CI, .sql, aw_* schema, executable schema, migration file, or migration directory is added/modified.
[ ] 3.  Phase 47L produces NO evidence — the gate creates no disposable database, no role, no grant, runs no
        privilege/role/grant test, runs no forward or cleanup SQL under any role, opens no connection, and invokes
        no psql / Docker / Postgres; it records NO least-privilege evidence and invents none (§1 / §2 / §18).
[ ] 4.  The blocker is restated faithfully (§4) — the binding §16 P.2 / P.3 least-privilege execution-role / grant
        obligation was NAMED but NOT DEMONSTRATED; classified as a BLOCKING ACCEPTANCE GAP (not accepted-by-design,
        not merely out-of-scope), distinct from the non-defect CI-guard limitation; not downgraded.
[ ] 5.  P.1–P.7 are restated faithfully (§5) — the binding obligation wording is carried from Phase 47I §16, with
        P.5's stale `runner :112-118` line-anchor corrected to the current runner output sites — and the gap is
        localized to P.2 / P.3 — P.1/P.4/P.5/P.6/P.7 recorded as demonstrated by the Phase 47J §8 secret-hygiene /
        non-production posture; P.2 (no production DB roles; least-privileged scoped role) and P.3 (least privilege;
        only privileges to create/drop the family, no broader grant) recorded as the undemonstrated binding gap.
[ ] 6.  What the evidence does/does not show is faithful (§6) — the Phase 47J §8 run shows a redacted connection
        user/password and disposable DB target (and the created family/CHECK/UNIQUE/transaction/cleanup/secret
        hygiene), but documents NO role, NO grants, NO privileges, NO least-privilege boundary, and NO no-overreach
        proof; the user-vs-least-privilege-role distinction is drawn.
[ ] 7.  Two least-privilege concepts kept distinct (§7) — (1) non-production disposable least-privilege evidence
        (in scope for Phase 47M; sufficient, once accepted, for full 47J acceptance) vs (2) production-representative
        least-privilege policy (OUT of scope, deferred, BLOCKED behind gate #8); no production-representative least
        privilege is claimed; no obligation requiring a production DB/credentials is created.
[ ] 8.  Forward / cleanup / no-overreach / secret requirements are future-framed (§9–§12) — every F./C.-model/N./S.
        item is a REQUIREMENT for the future Phase 47M lane (must create / must grant / must run / must prove), not an
        accomplished fact; the Postgres cleanup-ownership nuance and the two cleanup-privilege models are stated (schema
        ownership alone is NOT accepted as drop authority; a cleanup role must be proven to own every dropped object or
        rely on a documented ownership-transfer boundary); the dedicated-schema `search_path` requirement is stated for
        BOTH the unqualified forward (init.sql) and cleanup (init_down.sql) SQL — resolve into a non-`public` dedicated
        schema, no `CREATE` on `public` — because Phase 47M must not rewrite the SQL; the N.* checks carry the "only if
        representable in the disposable setup" caveat.
[ ] 9.  Future evidence artifact requirements are future-framed (§13) — redacted-only, minimal-grant-set recorded,
        cleanup model recorded, no-overreach results recorded, labeled bounded/non-production/operator-only and NOT
        CI / NOT production / NOT production-representative; no production overclaim; Phase 47L records no artifact.
[ ] 10. Future file/scope envelope is correct and authorizes nothing now (§14) — bounded to the exact Phase 47I §8
        envelope plus a new Phase 47M runbook; §9 forbidden surfaces stay forbidden; disabled-by-default; non-
        production; disposable local Postgres only; no production DB/DATABASE_URL/startup/config/package/lockfile/
        production-migration/route/public-response/Freeside/Lane-2 change; closed envelope; any unlisted file needs a
        separate gate; Phase 47L creates none of these files.
[ ] 11. Decision options are complete and correctly disposed (§16) — Option A SELECTED; Option B documented fallback;
        Option C boundary preserved (production least privilege deferred) but not selected as the whole answer;
        Option D REJECTED (no MVP-2 closure over a blocking gap).
[ ] 12. Next lane is correct (§1 / §17) — Phase 47M, a separate bounded dev/operator/test-only, disabled-by-default,
        non-production, disposable-Postgres-only evidence spike; explicitly NOT this PR, NOT a production / closure
        lane; a LATER separate acceptance gate (not Phase 47M itself, not Phase 47L) decides whether the evidence
        clears the gap and unblocks full Phase 47J acceptance.
[ ] 13. Preserved blockers are explicit (§15) — the binding §16 P.2 / P.3 obligation remains undischarged; full
        Phase 47J acceptance remains withheld; MVP-2 closure, production DB execution / --apply / writes / migration
        execution, production durable storage, startup / config / package changes, migration-runner / packager /
        scope-guard changes, production-representative least privilege, Lane-2 canonical migrations, route-contract /
        final-schema freeze, Freeside, and the operative ADR-022E gate #8 discharge all remain BLOCKED.
[ ] 14. No production overclaim — no production-readiness, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, production-DB-write, production-migration-execution, Freeside-runtime,
        Lane-2-canonical, production-least-privilege-proven, or aw_*-SQL-production-safe claim; every such reference
        is negated / blocked / a non-goal / a future requirement (§7 / §15 / §18).
[ ] 15. No bad citation regression — no migrate.ts:303-305 citation (migrate.ts is 254 lines); the conditional
        startup migrate is cited as server.ts:303-305; the canonical scope-guard denylist is the 19-entry
        scope-guards.test.ts:122-142; the execution-gate seam is index.ts:610/634/661/700 and the injected sink
        interface index.ts:124-129 / applyIsolationSpikePlan index.ts:568; config.ts DATABASE_URL at config.ts:340.
[ ] 16. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5 (no
        sixth vector); self-check (the then-current expected count); git diff --check and git diff --cached --check
        clean; nothing staged (§20).
[ ] 17. Forward-traceability notes are minimal and evidence-bound (§20) — each added note records only that Phase 47L
        decomposed the P.2 / P.3 blocker, produced no evidence, selected a future separate Phase 47M evidence lane (if
        Option A), and that production / closure / gate-#8 work stays blocked; no note claims evidence exists or that
        the gap is discharged.
[ ] 18. No adjacent-repo changes — no file in loa-straylight or freeside-characters (or any adjacent repo) was
        created or modified by Phase 47L.
[ ] 19. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp / temp,
        __pycache__, .pyc, dist, build, or .claude artifact appears in the Phase 47L working tree.
[ ] 20. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the Claude
        Code memory store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
```

---

## 20. Validation record

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47L is
docs/decision-only — it adds only this document (plus up to three minimal forward-traceability status notes below) and
mutates no runtime source, test, validator, vector, fixture, migration, or SQL file — so the validators are run only to
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
grep -RInE 'production ready|production readiness|production-safe|route-contract freeze|final schema freeze|ADR-022E.*discharged|production DB writes authorized|production migration execution authorized|durable production storage authorized|Freeside runtime|Lane-2 canonical|aw_\* SQL.*production-safe|ready for production|production implementation authorized|MVP-2.*closed|MVP 2.*closed|closure.*complete|least-privilege.*proven|P\.2.*proven|P\.3.*proven|role.*created|grant.*created|evidence.*produced' \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md \
  docs/admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md
```

**Recorded results for this lane** (run during authoring):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md` is added, plus up to three minimal
  forward-traceability status notes (list below); no runtime source (and specifically not `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql`, the experimental SQL / manifest / planner / runner, `no-leak.ts`, the
  `aw-sql-execution-sink-spike.test.ts`, the three extended Phase 47F test files, `config.ts`, `server.ts`, or
  `scope-guards.test.ts`), no runtime test, no route-vector JSON, validator, README, fixture, fixture validator,
  `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, SQL, executable schema, or generated file
  is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**; the
  `--self-check` harness reports the then-current expected count of cases behaving as required;
- **diff checks clean** — `git diff --check` and `git diff --cached --check` report no whitespace / conflict-marker
  errors; nothing is staged;
- **docs-only scope checks** — the `app package.json … .github` diff is empty; the only untracked addition is this
  document; the memory/generated/temp scan matches nothing under the working tree from this phase;
- **adjacent-repo reference scan** — any `arcturus` / `sensenet` matches are prose-only and no adjacent-repo file is
  created or modified;
- **overclaim scan** — every match is a **negated / blocked / non-goal / future-requirement** reference (e.g.
  "route-contract freeze — blocked", "final schema freeze — blocked", "Lane-2 canonical … blocked", "Freeside
  runtime / client integration — blocked", "claims no production readiness", "does not claim `aw_*` SQL is
  production-safe", "production-representative least privilege … deferred and blocked", and every "must create / must
  grant / must prove / must produce" phrasing is a *future requirement* on Phase 47M, not a present-tense
  authorization or accomplished fact); there is **no** positive present-tense authorization or safety claim, and **no**
  claim that any P.2 / P.3 evidence exists;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–20 exactly once each.

**Forward-traceability status notes added (§20 scope):**

- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md` — a one-line Phase 47L status note in its
  front-matter recording that the Phase 47K-selected Phase 47L gate has run: it decomposed the binding §16 P.2 / P.3
  least-privilege evidence gap, **produced no evidence**, **authorized a future separate Phase 47M evidence lane**
  (Option A), and kept full Phase 47J acceptance / MVP-2 closure / production work / gate #8 **blocked**.
- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md` — a one-line Phase
  47L status note recording that the binding §16 P.2 / P.3 obligation it defined has been **decomposed** (not
  discharged) and that a future Phase 47M evidence lane was authorized to satisfy it, with production / closure work
  still blocked.
- `docs/admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md` — a one-line Phase 47L status note recording
  that the §16 P.2 / P.3 gap that withheld full acceptance has been decomposed and routed to a future Phase 47M
  evidence lane, with production execution still blocked.

**Corruption / duplicate guard** (carried from the 46I–47K precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 20.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §19 Codex audit
  checklist (a `text` block) and the §20 validation command list (a `bash` block). **No fenced block is an executable
  migration or runnable schema.**
