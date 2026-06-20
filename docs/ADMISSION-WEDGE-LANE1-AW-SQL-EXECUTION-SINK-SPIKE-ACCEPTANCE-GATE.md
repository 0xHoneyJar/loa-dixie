# Phase 47K — Lane-1 `aw_*` SQL execution-sink spike acceptance / hardening decision gate

> **Phase**: 47K
> **Branch context**: `phase-47k-aw-sql-execution-sink-spike-acceptance-gate`
> **Related**: Phase 47J (PR #181, commit `a377922d`,
> [`admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md))
> **implemented** the bounded, disabled-by-default, dev/operator/test-only, **NON-PRODUCTION**, exact-scope Lane-1
> `aw_*` SQL **execution-sink** spike inside the Phase 47I file envelope (`--apply` now possible **only** under the full
> §10 gate conjunction against a strictly non-production target); Phase 47I (PR #180,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md))
> **conditionally authorized** Phase 47J — bounded, dev/operator/test-only, disabled-by-default, non-production,
> exact-scope, fail-closed — and **closed the file envelope** (no extra helper/module/script/source file authorized);
> Phase 47H (PR #179,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-BOUNDARY-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-BOUNDARY-GATE.md))
> **decomposed** the execution-sink / real-DB boundary and kept execution **BLOCKED**; Phase 47G (PR #178,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-SPIKE-ACCEPTANCE-GATE.md))
> **accepted** the merged Phase 47F isolation spike as a bounded, disabled-by-default, dev/operator-only,
> **NON-PRODUCTION**, location-isolated SQL **planning / manifest / safety-proof** spike; Phase 47F (PR #177, commit
> `ae24ca35`,
> [`admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47F-AW-SQL-ISOLATION-SPIKE-RUNBOOK.md))
> **implemented** the isolated SQL / manifest / planner / runner / tests / runbook (`--apply` refused); Phase 47A
> (PR #172) implemented Storage Mode 2 as a file-backed `.json` snapshot store, accepted by Phase 47B (PR #173) — the
> live Option D fallback; Straylight (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); Straylight-repo
> ADR-022E durable-store gate #8 (+ sibling gates, **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only acceptance / hardening decision gate.** This gate adds **only this document**
> (plus two minimal forward-traceability status notes, §15). It modifies **no** runtime source — and specifically does
> **not** modify `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`,
> `app/src/server.ts`, `app/src/config.ts`,
> `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts`, the experimental `.sql` files, the
> `manifest.json`, the `aw-sql-isolation-spike-runner.mjs`, `no-leak.ts`, the new
> `aw-sql-execution-sink-spike.test.ts`, the three extended Phase 47F test files, or `scope-guards.test.ts` — and
> changes **no** route handler, store / storage code, DB write, migration, SQL file, executable schema, migration
> runner, packager, scope guard, auth, consent, route-vector JSON, route-vector validator, route-vector README, Phase
> 33E fixture, fixture validator, other test, package export, config, env, package, lockfile, CI, generated file, or
> binary. No adjacent repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is the Lane-1 `aw_*` SQL execution-sink spike *acceptance / hardening decision* gate** — the rung downstream
> of the Phase 47J implementation, mirroring the Phase 47F → 47G (and the Phase 47A → 47B, 46V → 46W) implement →
> accept precedent. It **decides to what extent the merged Phase 47J execution-sink spike is accepted** — accepting
> its bounded, demonstrated proof components while **withholding full acceptance** against the binding Phase 47I
> §8–§21 checklist because the §16 P.2 / P.3 least-privilege execution-role / grant obligation was named-binding but
> **not demonstrated** by the disposable-DB operator run — records what it does and does **not** prove, classifies the
> P.2 / P.3 least-privilege evidence gap as a **blocking acceptance gap** (not an accepted-by-design characteristic),
> and selects the next safe lane (a docs/decision-only P.2 / P.3 evidence blocker / authorization gate). **It is not
> the spike, and it implements nothing.** It **enables no `--apply`, injects no DB client / sink, opens no DB connection, performs no DB
> write, executes no migration, adds no SQL or executable schema, changes no migration runner / packager / startup /
> config, weakens or edits no scope guard, implements no auth or consent, changes no route / API behavior, freezes
> neither the route contract nor the final schema, discharges no operative Straylight-side gate, and claims no
> production readiness.**

Every assessment below is grounded **read-only** against the **merged Phase 47J source** in the Dixie repo at the time
of writing (PR #181, commit `a377922d`, **8 files, +1902 / −52 lines, zero production-path / vector / fixture files
touched**). The execution-gate seam read read-only: the injected `IsolationSpikeStatementSink` interface
(`index.ts:124-129`: `begin` / `applyStatement` / `commit` / `rollback`), the all-or-nothing
`applyIsolationSpikePlan(plan, sink)` (`index.ts:568`, body `index.ts:568-593`), the **new** pure execution-gate
conjunction added by Phase 47J (`IsolationSpikeExecutionGateInput` `index.ts:610`, `IsolationSpikeExecutionGateResult`
`index.ts:634`, `evaluateIsolationSpikeExecutionGate` `index.ts:661`, `assertIsolationSpikeExecutionGateOpen`
`index.ts:700`, emitting the `ISOLATION_SPIKE_EXECUTION_REFUSAL` family `APPLY_NOT_REQUESTED` /
`EXECUTION_OPT_IN_MISSING` / `DEV_OPERATOR_MODE_MISSING` / `NON_PRODUCTION_TARGET_NOT_ACCEPTED` /
`NOT_EXPLICIT_RUNNER_INVOCATION` / `MANIFEST_NOT_VERIFIED` / `PATH_CONTAINMENT_NOT_VERIFIED` / `UNLISTED_SQL_PRESENT` /
`CLEANUP_OPT_IN_MISSING`), `SYNTHETIC_REF_MAX_LENGTH = 80` (`index.ts:718`); the explicit dev/operator runner
`app/scripts/aw-sql-isolation-spike-runner.mjs` (498 lines — the real sink / DB-client construction and the §8 target
policy live here, **outside** the guarded `SPIKE_FILES` service surface; target-refusal codes `TARGET_MISSING` /
`TARGET_EMPTY` / `TARGET_EQUALS_PRODUCTION_DSN` / `TARGET_MALFORMED` / `TARGET_UNSUPPORTED_PROTOCOL` /
`TARGET_HOST_OVERRIDE_UNSUPPORTED` / `TARGET_TLS_FILE_PARAMETER_UNSUPPORTED` / `TARGET_QUERY_PARAMETER_UNSUPPORTED` /
`TARGET_NOT_LOCAL_OR_DEV` / `TARGET_NO_DISPOSABLE_MARKER` / `TARGET_PRODUCTION_TOKEN`; draft env labels
`DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED` / `…_APPLY_CLEANUP_ENABLED` / `…_APPLY_TARGET_DSN` read
**only inside the runner**); the **new** focused test `app/tests/unit/admission-wedge-spike/aw-sql-execution-sink-spike.test.ts`
(951 lines); and the three extended Phase 47F test files. The **unchanged** production path is read read-only: the
migration runner `app/src/db/migrate.ts` (**254 lines** — it has **no** line 303–305), the build-asset packager
`app/scripts/copy-migrations.mjs`, the shared migration directory `app/src/db/migrations/`, the conditional startup
migrate `await migrate(dbPool)` inside `if (dbPool)` at **`server.ts:303-305`**, the env parsing in `app/src/config.ts`
(`DATABASE_URL`), the runtime no-leak guard `no-leak.ts` (114-key `FORBIDDEN_PUBLIC_KEYS`), and the **canonical** Phase
33N static scope guards `scope-guards.test.ts` (19-entry `DURABLE_WRITE_DENYLIST` at `:122`, `SPIKE_FILES` at `:36`) —
which Phase 47J left **unedited** (the +13 lines went to the *spike-specific* `aw-sql-isolation-scope-guard.test.ts`,
not to the canonical guard). **The canonical Straylight `StorageAdapter` interface and the `Assertion` /
`TransitionReceipt` / `AuditEvent` field shapes live in the adjacent `loa-straylight` repository (cross-repo
references, not Dixie file:line) and remain Straylight-owned (§16).**

---

## 1. Status / verdict

Phase 47K is the bounded, docs/decision-only **Lane-1 `aw_*` SQL execution-sink spike acceptance / hardening decision
gate** — the rung Phase 47I §7 / §23.2 implied (the Phase 47J implementation, once merged, must be assessed against the
binding §8–§21 checklist as Phase 47F was assessed by Phase 47G). Its purpose is to **decide to what extent the merged
Phase 47J execution-sink spike is accepted** against the binding Phase 47I §8–§21 checklist — **accepting its bounded,
demonstrated execution-sink proof components while withholding full acceptance** because the binding §16 P.2 / P.3
least-privilege role / grant obligation was **not demonstrated**; **record what it proves and — critically — what it
does not prove**; **assess the two Codex PATCH defect resolutions** (§5); **classify the P.2 / P.3 least-privilege
evidence gap as a blocking acceptance gap and the missing CI live-engine guard as a non-defect future-hardening
limitation** (§17); and **select the next safe lane** (§18 — a docs/decision-only P.2 / P.3 evidence blocker /
authorization gate), without itself implementing, executing, enabling, injecting, freezing, or unblocking anything.

**What this phase is, stated narrowly and exactly.** Phase 47K:

- is **docs / decision-only** — it reads the merged Phase 47J source, evaluates it against the Phase 47I §8–§21
  checklist (the §10 gate conjunction, the §11 target policy, §13 transaction/lock/idempotency, §14 cleanup/down, §15
  real-engine `CHECK`, §16 privilege/secret, §17 observability/no-leak, §20 test matrix, §21 acceptance evidence) and
  records the verdict;
- is an **acceptance / hardening decision gate**, *not* an implementation, *not* the execution-sink
  implementation-authorization-checklist gate (47I), *not* the execution-sink **decomposition** gate (47H), *not* the
  isolation-spike **acceptance** gate (47G), and *not* the isolation-spike **implementation** (47F);
- does **not** modify runtime source or tests — and specifically does not touch `migrate.ts`, `copy-migrations.mjs`,
  any `*.sql`, the experimental SQL / manifest / planner (`aw-sql-isolation-spike/*`) / runner, the new
  `aw-sql-execution-sink-spike.test.ts`, the three extended Phase 47F test files, `no-leak.ts`, `config.ts`,
  `server.ts`, or `scope-guards.test.ts`;
- does **not** enable `--apply`, inject any DB client / sink, open a DB connection, perform any DB write, or execute
  any migration against any database;
- does **not** add or modify a migration file, SQL file, executable schema, migration runner, or packager;
- does **not** change route / API behavior, the public response shape, or `no-leak.ts`;
- does **not** implement or unblock auth, consent, or a signer model;
- does **not** authorize production admission;
- does **not** freeze the route contract or the final schema;
- does **not** claim production readiness;
- does **not** claim or discharge the operative Straylight-owned ADR-022E gate #8;
- does **not** claim Phase 47J proved production execution, that production `--apply` is authorized, or that `aw_*` SQL
  is production-safe;
- does **not** claim the Phase 47J local disposable Postgres evidence is CI, production, production-readiness, or a
  production-role / least-privilege proof;
- does **not** declare Phase 47J fully accepted against the Phase 47I §8–§21 checklist — full acceptance is
  **withheld** because the binding §16 P.2 / P.3 least-privilege role / grant obligation was **not demonstrated**;
- **authorizes no execution and no further implementation in this PR.** It accepts Phase 47J only for its bounded,
  demonstrated non-production execution-sink proof components, **withholds full acceptance** pending the P.2 / P.3
  least-privilege evidence, and selects a future **separate**, docs/decision-only **Phase 47L — Lane-1 `aw_*` SQL
  least-privilege (P.2 / P.3) evidence blocker decomposition / authorization gate** before any MVP-2 closure gate.

> **Verdict: PATCH / NOT FULLY ACCEPTED — Phase 47J is ACCEPTED for its bounded, demonstrated proof components
> (target-policy hardening, scheme allowlist, query-parameter refusal, fail-closed connect ordering, runner-only
> DB-touching, the redacted disposable real-engine `CHECK` / `UNIQUE` / transaction evidence, gated reversible
> cleanup, public no-leak parity, exact file-envelope compliance, and no production overclaim), but is NOT accepted as
> complete against the binding Phase 47I §8–§21 checklist because the §16 P.2 / P.3 least-privilege execution-role /
> grant obligation remains named-but-not-demonstrated. The next lane is therefore a docs/decision-only P.2 / P.3
> evidence blocker / authorization gate (Phase 47L), not an MVP-2 closure gate (decision-structure Option C —
> patch / partial acceptance).** What the Phase 47J spike **does** demonstrate is sound: the §10 gate conjunction is
> implemented and fail-closed, the §11 target policy is hardened (scheme allowlist + wholesale query-parameter
> rejection), the execution sink is injected-only and runner-constructed, the transaction / rollback / conflict
> semantics hold, the real-engine `CHECK` / `UNIQUE` enforcement was exercised against a live disposable Postgres
> 16.14, the cleanup / down path is gated and reversible-by-recreation, the public no-leak posture (114 = 114) is
> preserved, and the production posture is intact (no production-path file changed; the canonical scope guard is
> unedited). The two Codex PATCH defects (target-policy bypasses; missing real-engine evidence) are resolved (§5).
> What it **does not** discharge is the binding §16 P.2 / P.3 least-privilege obligation: the recorded Phase 47J
> evidence identifies only a redacted connection user / password and disposable database target — it does **not**
> document a role, grants, privileges, or a least-privilege boundary, so P.2 / P.3 remain undemonstrated — a
> **blocking acceptance gap** for full Phase 47J acceptance (§7 / §16 / §17), not an accepted-by-design
> characteristic. **Production DB execution is NOT authorized.** Production `--apply`, production DB
> writes, production migration execution, production durable storage, Lane-2 canonical Straylight-store migrations,
> the route-contract / final-schema freeze, and the operative ADR-022E gate #8 discharge all **remain blocked**.

This maps to the prompt's **Option C — patch / partial acceptance**: *accept Phase 47J's bounded, demonstrated proof
components but withhold full acceptance against the binding Phase 47I §8–§21 checklist because a binding obligation
(the §16 P.2 / P.3 least-privilege role / grant evidence) was not demonstrated, and require one more docs/decision-only
lane to decide how to satisfy it before any MVP-2 closure.* It follows the chain convention of a load-bearing decision
(the spike is sound and sufficient for the components it was demonstrated to prove) paired with the selection of a
single, well-bounded next lane (§18). The next lane (**Phase 47L**) is the **P.2 / P.3 least-privilege evidence
blocker decomposition / authorization** variant, **not** the MVP-2 closure gate and **not** a corridor
"completeness = closure" gate — see §17 for the corridor / blocker assessment that decides this and §18 for the
rationale.

**Why patch / partial acceptance rather than full acceptance.** Full acceptance (declaring Phase 47J complete against
every applicable Phase 47I §8–§21 obligation) was genuinely considered and is **rejected**, because Phase 47I made the
§16 P.2 / P.3 least-privilege execution-role / grant obligation **binding** — it is a required item the future spike
must prove, not an optional one. The recorded Phase 47J evidence identifies only a **redacted connection user /
password and disposable database target**; it does **not** document a role, grants, privileges, or a least-privilege
boundary, so P.2 / P.3 are **named-but-not-demonstrated** (§7, §16). That is a **blocking acceptance gap** for *full*
Phase 47J acceptance: the
gate cannot honestly call the spike complete against the §8–§21 checklist while a binding §16 item is undemonstrated.
The disciplined posture is therefore **partial acceptance** — accept and record the components Phase 47J *did*
demonstrate (target policy, gate conjunction, execution-sink / transaction / `CHECK` / `UNIQUE`, cleanup, no-leak,
file-envelope), withhold acceptance on the binding P.2 / P.3 item, and route that gap to a dedicated docs/decision-only
blocker / authorization gate (Phase 47L) before any closure. Conservative posture + "do not rush" ⇒ patch / partial
acceptance (§18).

**On the corridor-consolidation rationale.** The corridor's three independently-accepted proof tracks — Mode 2
`.json` (47A/47B), SQL planning / isolation (47F/47G), and SQL execution-sink (47H/47I/47J) — have also **never been
consolidated or assessed together as a single corridor**, and the absence of a **standing / CI live-engine regression
guard** (the standing automated unit suite uses an injected fake sink, so no standing test re-proves the live-engine
`CHECK` / `UNIQUE` / transaction behavior) is a real **future-hardening limitation**. That CI-guard limitation is **not
a Phase 47J defect and not a blocking acceptance gap** (the runbook is explicit that the live-engine proof is a bounded
one-off operator artifact, not a CI service) — it is recorded as a future-hardening note (§17). The **immediate,
binding blocker** for full acceptance is narrower and sharper: the §16 P.2 / P.3 least-privilege role / grant evidence.

**Why not the other decision-structure options.** **Full acceptance (Option A-style "accept as complete")** is
rejected for the binding-gap reason above. **Escalate back to implementation / reject Phase 47J wholesale** is also
rejected: the spike's demonstrated components are sound and contain no defect or overclaim (the two original Codex
PATCH defects are resolved, §5; the runbook claims "nothing about production"), so wholesale rejection would discard
sound, accepted work — the correct instrument is a *partial* acceptance that isolates the one binding gap. The
accepted Phase 47A `.json` Mode 2 path remains the live fallback (§14 / §16), not the chosen forward lane.

---

## 2. Scope

Phase 47K is **strictly docs/decision-only**. It is the acceptance / hardening-decision rung of the Lane-1 `aw_*` SQL
execution-sink chain — one rung downstream of the Phase 47J implementation, mirroring the role Phase 47G played for the
Phase 47F isolation spike and Phase 47B played for the Phase 47A `.json` spike. It is **bounded** to:

- intaking the merged Phase 47J implementation accurately (§3, §4);
- recording the two original Codex PATCH defects and their resolution (§5);
- recording what Phase 47J proves (§6) and what it does **not** prove — including the binding §16 P.2 / P.3
  least-privilege gap it does not discharge (§7);
- accepting the **demonstrated components** — the target policy (§8), the gate / connect-order conjunction (§9), the
  execution-sink / transaction / rollback semantics (§10), the runtime `CHECK` / real-engine evidence (§11), and the
  cleanup / down behavior (§12) — while **withholding full acceptance** for the binding §16 P.2 / P.3 gap;
- recording the public / private no-leak posture (§13) and the exact file-envelope acceptance (§14);
- recording the validation run (§15) and the remaining blockers (§16);
- assessing the corridor and classifying the P.2 / P.3 least-privilege gap as a **blocking acceptance gap** (and the
  missing CI live-engine guard as a non-defect future-hardening limitation) (§17);
- selecting the next lane (§18 — a docs/decision-only P.2 / P.3 evidence blocker / authorization gate), preserving
  non-goals (§19), and providing a Codex audit checklist for this gate (§20).

It does **not**, in this PR, implement, build, execute, enable, inject, freeze, or discharge anything (§1). It is the
**execution-sink analogue of Phase 47G** (which played this role for the isolation spike): an implement → accept
decision gate that records the proof boundary and selects only a *future separate* lane, never the execution itself.

---

## 3. Source chain and evidence intake

Phase 47K sits at the bottom of an explicit, PR-anchored chain. Each link is read-only input here; none is modified
except the two §15 forward-traceability status notes.

- **Phase 47A / PR #172** — implemented Storage Mode 2 as a **file-backed `.json` snapshot store** (NOT SQL, NOT a
  production DB, NOT `aw_*` schema), off the production migration path. **Not modified.** Remains the live Option D
  fallback (§16).
- **Phase 47B / PR #173** — durable-spike **acceptance** gate, Verdict A. The structural precedent for *this* document
  (implement → accept). **Not modified.**
- **Phase 47C / PR #174** — Lane-1 `aw_*` SQL / migration-runner **blocker-decomposition** gate, Verdict A. **Not
  modified.**
- **Phase 47D / PR #175** — Lane-1 `aw_*` SQL isolation **design** gate, Verdict A. **Not modified.**
- **Phase 47E / PR #176** — Lane-1 `aw_*` SQL isolation **authorization-checklist** gate, Verdict A. **Not modified.**
- **Phase 47F / PR #177** — the isolation implementation spike, **merged** (commit `ae24ca35`, 9 files, +2439 lines,
  zero production-path / vector / fixture files; `--apply` refused). **Not modified.**
- **Phase 47G / PR #178** — the isolation-spike **acceptance** gate, Verdict A. Accepted Phase 47F as a bounded
  non-production planning / isolation / safety-proof spike; recorded real DB execution NOT authorized. **Not modified.**
- **Phase 47H / PR #179** — the execution-sink / real-DB boundary **decomposition** gate, Verdict A. Decomposed the
  execution boundary (§5–§18), kept implementation blocked, selected Phase 47I. **Not modified.**
- **Phase 47I / PR #180** — the execution-sink **implementation-authorization-checklist** gate, Verdict A. Converted
  the Phase 47H decomposition into the hard §8–§21 file:line checklist + closed file envelope and **conditionally
  authorized** the future Phase 47J code-bearing lane. **Not modified.**
- **Phase 47J / PR #181** — the implementation spike, **merged** (commit `a377922d`). Added the real execution-sink
  seam, the hardened target policy, the gate conjunction, the new execution-sink test, and the runbook, within the
  exact Phase 47I §8 envelope. Codex PATCHed two implementation defects; Claude resolved both; final Codex verdict
  **ACCEPT**. **The subject of this acceptance gate; its runbook gains a minimal Phase 47K status note (§15).**
- **Phases 46S / 46T / PR #164 / #165** — drafted and accepted the durable-store schema / migration design (**13
  `aw_*` tables across 11 subsections**; `schema_final` / `route_contract_final` **false**). The Phase 47F/47J
  experimental DDL realizes a **bounded 3-table subset** (assertion + supersession-link + tombstone), un-frozen.
  **Not modified, not frozen.**
- **Phase 46N / Candidate D (46M)** — gate #8 bounded **paper** clearing and the split-storage production-adapter
  proposal input. The §16 boundary that keeps Lane-2 canonical migrations and the operative Straylight-side discharge
  blocked. **Not modified.**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner and the
  decision records cited as guardrails (§11 / §16). Cross-repo references, **not edited.**

**Evidence intaken for this gate** (read-only): the merged Phase 47J diff (8 files, +1902 / −52); the Phase 47J runbook
(283 lines, including the §8 redacted live-engine evidence block); the accepted validation record handed to this gate
(§15); and a fresh re-run of the docs validators (§15), which this gate confirms green on the unchanged artifacts.

---

## 4. Phase 47J implementation summary

Phase 47J (PR #181, commit `a377922d`) added **8 files, +1902 / −52 lines, with zero production-path / vector /
fixture files touched** (confirmed read-only against the commit and the working tree). The implementation is recorded
here accurately:

- **Modified in place (within the Phase 47I §8 envelope):**
  - `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts` (+114; now 914 lines) — a **pure,
    pool-free, `node:`-only** execution-gate conjunction was added: `IsolationSpikeExecutionGateInput`
    (`index.ts:610`), `IsolationSpikeExecutionGateResult` (`index.ts:634`), `evaluateIsolationSpikeExecutionGate`
    (`index.ts:661`), and `assertIsolationSpikeExecutionGateOpen` (`index.ts:700`). The gate is a **pure decision
    function** — it reads no env, opens no connection, names no client — emitting the `ISOLATION_SPIKE_EXECUTION_REFUSAL`
    family (`APPLY_NOT_REQUESTED`, `EXECUTION_OPT_IN_MISSING`, `DEV_OPERATOR_MODE_MISSING`,
    `NON_PRODUCTION_TARGET_NOT_ACCEPTED`, `NOT_EXPLICIT_RUNNER_INVOCATION`, `MANIFEST_NOT_VERIFIED`,
    `PATH_CONTAINMENT_NOT_VERIFIED`, `UNLISTED_SQL_PRESENT`, `CLEANUP_OPT_IN_MISSING`). The pre-existing injected
    `IsolationSpikeStatementSink` (`index.ts:124-129`) and the all-or-nothing `applyIsolationSpikePlan(plan, sink)`
    (`index.ts:568`, body `:568-593`) are **reused unchanged as the seam**; the real client / sink is **not**
    constructed here.
  - `app/scripts/aw-sql-isolation-spike-runner.mjs` (+426 / −52; now 498 lines) — the explicit dev/operator runner,
    **outside** the guarded `SPIKE_FILES` service surface, where the **real sink / DB client** is constructed from a
    strictly non-production target and injected via `applyIsolationSpikePlan(plan, sink)`. It implements the §8 target
    policy (scheme allowlist + wholesale query-parameter rejection), reads the draft `…_APPLY_ENABLED` /
    `…_APPLY_CLEANUP_ENABLED` / `…_APPLY_TARGET_DSN` env labels **only here** (never in `config.ts`), and replaces the
    old blanket `--apply` refusal with the full §10 fail-closed gate conjunction. It remains the **only** caller,
    disabled-by-default, never imported by `server.ts`, never on startup, and not wired into any `package.json`
    lifecycle script.
  - `app/tests/unit/admission-wedge-spike/aw-sql-isolation-spike.test.ts` (+56; now 845 lines) — extended manifest /
    path / security / storage-semantics / reducer tests (no regression).
  - `app/tests/unit/admission-wedge-spike/aw-sql-isolation-runner-isolation.test.ts` (+30; now 207 lines) — extended
    startup / packaging / production-runner isolation tests.
  - `app/tests/unit/admission-wedge-spike/aw-sql-isolation-scope-guard.test.ts` (+13; now 182 lines) — extended the
    **spike-specific** scope-guard coverage proving the new code still passes the canonical 19-entry denylist with
    zero hits and **no allowlist**. **This is the spike's own scope-guard test, not the canonical
    `scope-guards.test.ts`, which is unedited.**
  - `docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md` (+29) — gained
    the Phase 47J forward-traceability status note Phase 47I §8 / §24 had reserved.
- **Added (the two new files Phase 47I §8 reserved):**
  - `app/tests/unit/admission-wedge-spike/aw-sql-execution-sink-spike.test.ts` (951 lines) — the new focused
    execution-sink test file (the §20 test matrix against an injected fake / test sink).
  - `docs/admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md` (283 lines) — the new dev/operator-only
    runbook, including the §8 redacted live-engine evidence block.
- **Invariants Phase 47J preserved.** `index.ts` remains **pure, pool-free, and `node:`-only**; DB-touching code lives
  **only** in the explicit runner (outside `SPIKE_FILES`); gate conjunction is **required before connection**; the
  target policy now accepts **only** `postgres:` / `postgresql:`; **all** query parameters are refused before connect;
  wrong schemes and `host` / `hostaddr` / `port` / TLS / unknown-query-param bypasses are tested; refusal paths use
  **stable non-secret codes** and do **not** echo DSN / secret / query / file-path values.
- **No tracked production-path change.** `migrate.ts` (254 lines), `copy-migrations.mjs`, `src/db/migrations/*.sql`,
  `server.ts` (startup migrate `server.ts:303-305`), `config.ts`, `no-leak.ts`, the **canonical** `scope-guards.test.ts`,
  the route-vector JSON / validator / README, and the Phase 33E fixtures / validator are **unchanged** by Phase 47J
  (confirmed: none appears in commit `a377922d` except as listed above). **No startup / route / config / migrator /
  copy / package / lockfile change was made. No production DB execution or production migration execution was
  authorized.**

---

## 5. Codex PATCH and patch-resolution record

Codex initially PATCHed Phase 47J for **two** blockers; Claude resolved both; the final Codex verdict was **ACCEPT**.
Each is recorded with its resolution, grounded in the merged runner / `index.ts` and the test suite:

1. **Target policy accepted wrong schemes and a query host override.** The original §11 check was host-only, so a
   loopback-looking DSN could launder a wrong protocol (`http:` / `ftp:` / `file:` / …) or redirect the **effective
   network target** `pg` uses via `?host=` / `?hostaddr=` / `?port=` (and a `?ssl*=` file/TLS param could alter
   file-loading). **Resolved.** The policy was hardened to a **scheme allowlist** (`postgres:` / `postgresql:` only —
   `ALLOWED_TARGET_PROTOCOLS`) **plus wholesale query-parameter rejection**, classifying only query **key names** (never
   their possibly-secret values) and emitting the stable non-secret codes `TARGET_UNSUPPORTED_PROTOCOL`,
   `TARGET_HOST_OVERRIDE_UNSUPPORTED`, `TARGET_TLS_FILE_PARAMETER_UNSUPPORTED`, and `TARGET_QUERY_PARAMETER_UNSUPPORTED`.
   With no query string present, `url.hostname` **is** the host `pg` connects to, so the host / DB-name disposable checks
   are sound. Proven by the new execution-sink test's wrong-scheme / host-override / TLS-param / unknown-query-param
   refusal cases.
2. **Real-engine evidence was required but initially absent.** The Phase 47I §15 real-engine `CHECK` checklist
   (R.1–R.6) and the §13 transaction / §14 cleanup checklists require proof against a **live** Postgres engine, not just
   the fake-sink unit suite; the first cut had only the fake-sink proof. **Resolved.** A **one-off, bounded,
   non-production operator run** against a **disposable, loopback-only, volume-less, auto-removed Postgres 16.14
   container** was performed and recorded in **redacted** form in the runbook §8: forward execution, BEGIN/COMMIT/ROLLBACK,
   runtime `CHECK` constraints, invalid / wrong / overlength `awref` rejections, conflict rollback with no partial row,
   idempotent replay, gated cleanup / down, recreation after cleanup, and teardown — with the DSN / password / host /
   port / DB name absent from runner output.

**Assessment.** Both PATCH resolutions are present in the merged source and exercised (the target-policy hardening by
the automated unit suite; the real-engine behavior by the redacted operator run). This inspection found **no**
unresolved instance of *these two PATCHed defects* and **no** regression introduced by the patches. **A separate,
binding acceptance gap is identified below and is the reason this gate withholds *full* Phase 47J acceptance:** the
§16 P.2 / P.3 least-privilege execution-role / grant obligation that Phase 47I made **binding** was named but **not
demonstrated** (§7 / §16 / §17). **Nuance preserved (carried into §7 / §11 / §16 / §17):** the real-engine proof is a
*bounded, redacted, local disposable operator artifact*. It is useful and accepted for the components it demonstrates,
but it is **not** CI-backed, **not** production, **not** production-readiness, **not** a production-role /
least-privilege proof (P.2 / P.3), and **not** permission to connect production DBs — and because P.2 / P.3 is a
binding §16 item, its absence is a **blocking acceptance gap**, not an accepted-by-design characteristic.

---

## 6. What Phase 47J proves

Phase 47J proves **only** the following — each a bounded, non-production execution-sink property, none a production
property:

- **An execution sink can be injected through the existing seam without polluting the planner** — the real sink is
  constructed only in the runner (outside `SPIKE_FILES`) and injected via `applyIsolationSpikePlan(plan, sink)`
  (`index.ts:568`); `index.ts` stays pure, pool-free, and `node:`-only and passes the canonical 19-entry denylist with
  zero hits and no allowlist.
- **`--apply` can be made impossible except under a full fail-closed gate conjunction** — the pure
  `evaluateIsolationSpikeExecutionGate` (`index.ts:661`) refuses on any missing gate; the runner refuses before opening
  any connection; any one absent gate ⇒ typed refusal + non-zero exit, never a silent no-op, never a default target,
  never a partial apply.
- **A strictly non-production target policy can be enforced structurally** — scheme allowlist (`postgres:` /
  `postgresql:` only), wholesale query-parameter rejection (closing the `?host=` / `?hostaddr=` / `?port=` / `?ssl*=`
  redirect bypass), production-`DATABASE_URL` refusal, loopback / disposable-marker host and DB-name requirements, and
  production-token refusal — all on the **same effective target `pg` uses**, with non-secret refusal codes only.
- **All query parameters are refused before connect** — closing the effective-target-redirect class of bypass.
- **The all-or-nothing transaction / conflict semantics hold** — `applyIsolationSpikePlan` runs `begin →
  applyStatement* → commit`, with any throw → `rollback` + wrapped fail-closed error; a conflict records nothing; the
  atomic batch maps to a single transaction.
- **The live Postgres engine — not just the in-memory mirror — enforces the constraints** — the redacted operator run
  (§11) shows the `awref:` `CHECK`, the status / class `CHECK`, and the `UNIQUE (tenant_ref, estate_ref, actor_ref,
  assertion_ref)` constraint rejecting violating / duplicate rows, and a mid-transaction conflict rolling back the
  whole transaction with no partial admit.
- **The cleanup / down path is gated and reversible-by-recreation** — `--apply --direction=cleanup` requires the
  distinct cleanup opt-in plus the full conjunction; the drop is bounded to the three `aw_isolation_spike_*` tables
  (`DROP TABLE IF EXISTS`), leaves no production state behind, and the forward `CREATE TABLE IF NOT EXISTS` re-creates
  the family.
- **The production posture stays intact** — `migrate.ts`, `copy-migrations.mjs`, `server.ts` startup
  (`server.ts:303-305`), `config.ts`, `no-leak.ts`, and the canonical `scope-guards.test.ts` are unchanged; the 114-key
  no-leak parity is preserved; the spike adds no public surface.
- **Refusals leak no secrets** — stable non-secret reason codes only; no DSN / password / host / port / DB-name / query
  / file-path echo on any path.

---

## 7. What Phase 47J does not prove

Phase 47J does **not** prove, and this gate does **not** claim, any of the following:

- **production DB execution** — no statement was ever run against any production database;
- **production DB writes** — none;
- **production migration execution** — none; `migrate.ts` is unchanged and is never the execution path;
- **production durable storage** — none is built;
- **CI-backed / standing-automation live-engine enforcement** — the live-engine `CHECK` / `UNIQUE` / transaction
  behavior was exercised by a **one-off, manual, redacted operator run** against a disposable container; the **standing
  automated unit suite uses an injected fake / test sink** and contacts no external DB, so nothing in CI re-proves the
  live-engine behavior on each run (a **non-defect future-hardening limitation** — not a blocking acceptance gap;
  recorded as a corridor characteristic in §17);
- **a production-role / least-privilege proof** — the Phase 47I §16 least-privilege execution role (P.2 / P.3) was
  **named-binding but not demonstrated**: the recorded Phase 47J evidence identifies only a redacted connection user /
  password and disposable database target; it does **not** document a role, grants, privileges, or a least-privilege
  boundary. Because Phase 47I made P.2 / P.3 a **binding** obligation, this absence is the **blocking acceptance gap**
  that prevents *full* Phase 47J acceptance (it is **not** accepted-by-design and **not** merely out-of-scope) and is
  routed to the Phase 47L docs/decision-only blocker / authorization gate (§16 / §17 / §18);
- **permission to connect production DBs** — the disposable local Postgres proof confers none;
- **production auth** — the dev/operator env gate is not production authentication;
- **end-user authorization** — none in a dev/operator/test-only spike;
- **signer authority** — Straylight-owned and undischarged;
- **consent proof / receipt** — future-gated; the Phase 46S `aw_consent_proof_ref` is deferred; service / operator auth
  is never consent;
- **operational secret handling at production scale** — no production credentials, connection strings, or secret
  material are involved or proven; only a disposable throwaway credential was used and kept out of output;
- **production observability** — no audit / metrics / logging on a production execution path;
- **ADR-022E gate #8 discharge** — operatively held (Straylight-owned);
- **route-contract freeze** — `route_contract_final` stays false;
- **final schema freeze** — `schema_final` stays false; the `aw_*` set stays the Phase 46S draft (13 tables across 11
  subsections; the spike realizes a 3-table subset);
- **Freeside runtime / client integration** — Freeside stays a consumer / handoff surface;
- **Lane-2 canonical Straylight-store readiness** — each a separate sibling-repo ADR under Straylight teammate review;
- **that `aw_*` SQL is production-safe** — explicitly not claimed.

---

## 8. Target-policy acceptance

The Phase 47I §11 database-target policy is **accepted as implemented** in the runner (outside `SPIKE_FILES`). The
policy assesses the target **structurally** — scheme + host + database name + query-parameter **key names** only; the
credential portion and every query **value** are never inspected — and validates the **same effective target `pg` will
use**. A target is accepted **only when**: a DSN is present and non-empty; it is not equal to the production
`DATABASE_URL`; it parses; its scheme is exactly `postgres:` or `postgresql:`; it carries **no** query parameters at
all; it carries no production-like token; its host is loopback or carries a disposable marker; and its database name
carries a disposable marker. Each refusal is **before** any connection is opened and carries a **stable non-secret
code**:

| Refusal code | Refuses |
|--------------|---------|
| `TARGET_MISSING` / `TARGET_EMPTY` | no DSN / empty DSN |
| `TARGET_EQUALS_PRODUCTION_DSN` | the target equals the production `DATABASE_URL` |
| `TARGET_MALFORMED` | the DSN does not parse |
| `TARGET_UNSUPPORTED_PROTOCOL` | scheme is not `postgres:` / `postgresql:` (e.g. `http:` / `ftp:` / `file:`) |
| `TARGET_HOST_OVERRIDE_UNSUPPORTED` | a `host` / `hostaddr` / `port` query override (effective-target redirect) |
| `TARGET_TLS_FILE_PARAMETER_UNSUPPORTED` | an `ssl*` file / TLS query parameter |
| `TARGET_QUERY_PARAMETER_UNSUPPORTED` | any other query parameter |
| `TARGET_NOT_LOCAL_OR_DEV` | host is neither loopback nor disposable-marked |
| `TARGET_NO_DISPOSABLE_MARKER` | DB name carries no disposable marker |
| `TARGET_PRODUCTION_TOKEN` | a production-like token (`prod` / `production` / `live` / managed-cloud marker) |

**Acceptance:** the target policy is sound for a non-production spike. The Codex-PATCHed bypasses (wrong scheme; query
host/port redirect; TLS file param) are closed because the policy refuses every query parameter wholesale and pins the
scheme — so `url.hostname` is provably the host `pg` connects to, and only non-secret key names are ever classified.
**This acceptance is not** a claim that the policy is sufficient for a production target — production targets are
**forbidden** outright (`TARGET_EQUALS_PRODUCTION_DSN` / `TARGET_PRODUCTION_TOKEN`), never policy-validated for use.

---

## 9. Gate / connect-order acceptance

The Phase 47I §10 apply-mode gate conjunction is **accepted as implemented**. `--apply` (and `--apply
--direction=cleanup`) is **impossible** unless **every** gate holds; any one absent ⇒ refuse, fail closed, exit
non-zero, open **no** connection, apply **nothing** — never a silent no-op, never a default target, never a partial
apply. The pure `evaluateIsolationSpikeExecutionGate` (`index.ts:661`) / `assertIsolationSpikeExecutionGateOpen`
(`index.ts:700`) decide the conjunction without reading env or opening a connection; the runner supplies the inputs and
constructs / injects the real sink **only after** the gate returns open. The conjunction:

- `--apply` explicitly requested (else `APPLY_NOT_REQUESTED`);
- base opt-in `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true` (insufficient on its own);
- distinct execution opt-in `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED=true` (else
  `EXECUTION_OPT_IN_MISSING`);
- `NODE_ENV` not `production` (else `DEV_OPERATOR_MODE_MISSING`);
- a non-production target accepted by the §8 policy (else `NON_PRODUCTION_TARGET_NOT_ACCEPTED`);
- the production `DATABASE_URL` refused as a target, always;
- explicit out-of-band runner invocation only (else `NOT_EXPLICIT_RUNNER_INVOCATION`) — never startup
  (`server.ts:303-305`), route, migrator, or package script;
- exact manifest verified (else `MANIFEST_NOT_VERIFIED`);
- SQL path containment verified — lexical + `lstat` symlink rejection + realpath (else `PATH_CONTAINMENT_NOT_VERIFIED`);
- no unlisted / missing `.sql` on disk (else `UNLISTED_SQL_PRESENT`);
- `--direction=cleanup` additionally requires `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_CLEANUP_ENABLED=true`
  (else `CLEANUP_OPT_IN_MISSING`).

**Connect-order acceptance:** every refusal is evaluated **before** a connection is opened — the gate is a pure
decision, the target policy is structural (no connection), and only a fully-open gate + an accepted target leads to
sink construction. The draft `…_APPLY_*` / `…_APPLY_TARGET_DSN` env labels are read **only inside the runner**, never
parsed in `config.ts`, never wired into a package lifecycle script — **no config behavior change.**

---

## 10. Execution-sink / transaction / rollback acceptance

The Phase 47I §12 sink-design and §13 transaction / lock / idempotency obligations are **accepted as implemented**
(proven against an injected fake / test sink in the standing unit suite, and against the live engine in the §11
operator run):

- **Injection-only sink.** The sink is the object passed to `applyIsolationSpikePlan(plan, sink)` (`index.ts:568`,
  interface `index.ts:124-129`); the planner never constructs or imports a pool; the real client / sink is constructed
  **only** in the runner (outside `SPIKE_FILES`), from a §8-accepted non-production target, under the §9 conjunction.
- **All-or-nothing transaction.** `begin → applyStatement* → commit`; any throw → `rollback` + wrapped fail-closed
  error (`index.ts:568-593`). Either every statement in the direction commits or the whole plan rolls back; no partial
  admit survives.
- **No production lock reuse.** The experimental sink does **not** reuse the production advisory lock
  (`computeAdvisoryLockKey('dixie-bff:migration')` in `migrate.ts`); single-operator-by-construction.
- **No production ledger write.** The experimental sink does **not** write the production `_migrations` ledger;
  idempotency rides the `CREATE TABLE IF NOT EXISTS` / `DROP TABLE IF EXISTS` DDL and the `UNIQUE` constraint.
- **Idempotent replay / conflict fail-closed.** Repeated identical application is a clean no-op; a conflicting write
  (the `UNIQUE (tenant_ref, estate_ref, actor_ref, assertion_ref)` constraint) throws and records nothing; the atomic
  batch maps to a single transaction.

**Acceptance scope:** these are accepted as proven for a **bounded, non-production** execution sink against a fake /
test sink (standing suite) and a disposable live engine (one-off operator run, §11). They are **not** accepted as
proof of production transaction / lock / recovery semantics at scale, which remain unproven and blocked.

---

## 11. Runtime `CHECK` / real-engine evidence acceptance

The Phase 47I §15 real-engine `CHECK` checklist (R.1–R.6) is **accepted as exercised** against a **live** Postgres
engine — going beyond the fake-sink unit suite — per the redacted operator-run evidence recorded in the Phase 47J
runbook §8:

- **Engine:** PostgreSQL **16.14**, a **disposable docker container** bound to `127.0.0.1`, `--rm`, no named volume,
  torn down after the run; the loopback DSN carried a disposable DB-name marker and **no query string** (accepted by
  the §8 policy).
- **Forward `--apply`** created the 3-table `aw_isolation_spike_*` family and its `CHECK` constraints; committed in a
  single transaction.
- **Runtime `CHECK` enforcement (the engine rejects, not just the in-memory mirror):** invalid raw payload ref (R.1),
  wrong actor-ref kind (R.2), over-`{0,59}`-length ref rejected by the `CHECK` regex (R.3), wrong `awref` kind (R.4),
  out-of-range status / class (R.6) — each rejected by the corresponding `CHECK` constraint.
- **Conflict + transaction (no partial admit):** a duplicate `(tenant, estate, actor, assertion)` rejected by the
  `UNIQUE` constraint (R.5); a mid-transaction conflict in an explicit `BEGIN … COMMIT` rolled back with the row count
  unchanged and the would-be partial-admit row absent; explicit `BEGIN/COMMIT` persists, explicit `BEGIN/ROLLBACK`
  discards.
- **Idempotency + cleanup:** re-run forward `--apply` clean (`CREATE TABLE IF NOT EXISTS`); cleanup without the cleanup
  opt-in refused (`CLEANUP_OPT_IN_MISSING`, exit 1, tables untouched); cleanup with the opt-in dropped the family in
  reverse order; forward again re-created it (reversible-by-recreation); final cleanup left 0 tables and the container
  was removed with no volume / state behind.
- **Secret hygiene:** the runner's stdout / stderr on the success path contained **no** DSN, password, host, port, or
  DB name (grep clean).

> **Critical nuance (load-bearing for §17 / §18).** This real-engine evidence is a **bounded, redacted, local
> disposable operator proof**. It is useful and accepted for the components it demonstrates, but it is **not** CI-backed,
> **not** production, **not** production-readiness, **not** a production-role / least-privilege proof (the recorded
> evidence identifies only a redacted connection user / password and disposable database target; it does **not**
> document a role, grants, privileges, or a least-privilege boundary — §7), and **not** permission to connect
> production DBs. Because the Phase 47I §16 P.2 / P.3 least-privilege role / grant obligation is **binding**, the fact
> that the recorded evidence does **not** identify a role or demonstrate grants / privileges is the **blocking
> acceptance gap** that prevents *full* Phase 47J acceptance (§16 / §17 / §18) — it is **not** accepted-by-design. Separately, that nothing in CI re-runs the live-engine behavior is a **non-defect
> future-hardening limitation** (reproducing it requires an operator to stand up their own disposable Postgres), **not**
> a blocking gap.

---

## 12. Cleanup / down acceptance

The Phase 47I §14 cleanup / down-migration checklist (C.1–C.5) is **accepted as implemented and exercised**:

- **C.1 Ephemeral / dev only.** The `_down.sql` drop path executes only against a §8-accepted non-production target,
  never production.
- **C.2 Bounded to the experimental family.** The drop targets exactly the three `aw_isolation_spike_*` tables with
  `DROP TABLE IF EXISTS` (a missing object is a no-op).
- **C.3 Same gate conjunction + distinct cleanup opt-in.** Cleanup execution requires the full §9 conjunction **plus**
  `…_APPLY_CLEANUP_ENABLED=true`; absent it, the runner refuses (`CLEANUP_OPT_IN_MISSING`, exit 1) — verified in the
  operator run (3 tables left untouched).
- **C.4 Reversible-by-recreation.** The forward `CREATE TABLE IF NOT EXISTS` re-creates the family after a drop, with
  no production state behind — verified in the operator run.
- **C.5 Forward-only production runner never auto-runs `_down`.** `migrate.ts` ignores `_down` files by construction;
  any drop is an explicit dev/operator action through the experimental runner only.

---

## 13. Public / private no-leak posture

The Phase 47I §17 observability / public-surface obligations are **accepted as preserved**:

- **No public response expansion.** Phase 47J adds **no** public-response builder and no public surface; `no-leak.ts`
  is untouched, so the **114 = 114** runtime ↔ validator `FORBIDDEN_PUBLIC_KEYS` parity is preserved.
- **Route-vectors / fixtures / self-check green.** The route-contract test-vectors stay **5/5** (no sixth vector), the
  Phase 33E fixtures **5/5**, and the negative self-check **44/44** (§15).
- **Minimal operational logs only.** The runner emits direction / step count / outcome only; the "applied N statements"
  success line carries the count and direction, **never** the target name, host, or DSN.
- **Nothing sensitive logged.** No credentials, DSNs, raw payloads, raw reasons, private audit internals, signer /
  consent material, stack traces exposing secrets, or env dumps; refusals carry stable non-secret codes only.
- **Private audit material out of scope.** The canonical `TransitionReceipt` / `AuditEvent` audit-chain material stays
  Straylight-owned (cross-repo, §16); the Dixie spike stores only bounded opaque `awref:` references.

---

## 14. Exact file-envelope acceptance

Phase 47J is **accepted as confined to the exact Phase 47I §8 allowed envelope**, with the §9 forbidden surfaces
untouched:

- **Modified in place (allowed):** `index.ts`, `aw-sql-isolation-spike-runner.mjs`, the three Phase 47F test files,
  and the Phase 47I checklist gate (forward note).
- **Added (the two files §8 reserved):** `aw-sql-execution-sink-spike.test.ts`, the Phase 47J runbook.
- **No extra helper / module / script / source file** was added — the Phase 47I file envelope (which explicitly closed
  the door on any additional source/helper/module/script file, even inside the isolated spike directory or under
  `app/scripts/`) is honored.
- **Forbidden surfaces untouched:** `migrate.ts`, `copy-migrations.mjs`, `server.ts`, `config.ts`, the canonical
  `scope-guards.test.ts`, `app/src/db/migrations/*.sql`, `package.json` / lockfile, `.github/**`, the route-vectors /
  validator / README, the Phase 33E fixtures / validator, and `dist/**` / `build/**` are all unchanged.
- **The experimental DDL stays exactly the 3-table `aw_isolation_spike_*` family** already shipped by Phase 47F; no new
  `.sql` and no schema change.

The accepted Phase 47A `.json` Mode 2 path remains the live fallback (Option D) had the execution sink been
unbounded-able; it was bounded with no production-path change, so the spike stands as conditionally authorized and now
accepted.

---

## 15. Validation record

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47K is
docs/decision-only — it adds only this document (plus the two minimal forward-traceability status notes below) and
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
# Docs-only static scans:
git diff --name-only HEAD -- app src package.json package-lock.json app/package.json app/package-lock.json '.github/**' '*.sql' 'dist/**' 'build/**'
git status --short --untracked-files=all | grep -iE 'MEMORY|memory|grimoire|__pycache__|\.pyc|generated|tmp|temp|\.claude|dist|build'
# Adjacent-repo reference scan (interpret: cross-repo mentions in prose are fine; no adjacent file is touched):
grep -RInE 'loa-arcturus|arcturus|loa-sensenet|sensenet' docs app package.json package-lock.json .github 2>/dev/null || true
# Overclaim scan (interpret: negated blocked-lane / non-goal references are fine; positive claims are not):
grep -RInE 'production ready|production readiness|production-safe|route-contract freeze|final schema freeze|ADR-022E.*discharged|production DB writes authorized|production migration execution authorized|durable production storage authorized|Freeside runtime|Lane-2 canonical|aw_\* SQL.*production-safe|ready for production|production implementation authorized' \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md \
  docs/admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md
```

**Recorded results for this lane** (run during authoring; full output accompanies the operator run report):

- **docs-only scope** — only the new file `docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md`
  is added, plus the two minimal forward-traceability status notes (list below); no runtime source (and specifically
  not `migrate.ts`, `copy-migrations.mjs`, any `*.sql`, the experimental SQL / manifest / planner / runner,
  `no-leak.ts`, the new `aw-sql-execution-sink-spike.test.ts`, the three extended Phase 47F test files, `config.ts`,
  `server.ts`, or `scope-guards.test.ts`), no runtime test, no route-vector JSON, validator, README, fixture, fixture
  validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, SQL, executable schema, or
  generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**; the
  `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail closed; 2 exact-key
  non-over-match guards stay clean);
- **diff checks clean** — `git diff --check` and `git diff --cached --check` report no whitespace / conflict-marker
  errors; nothing is staged;
- **docs-only static scans** — the `app src package.json … *.sql dist build` diff is empty; the memory/generated/temp
  scan matches nothing under the working tree from this phase;
- **adjacent-repo reference scan** — any `arcturus` / `sensenet` matches are prose-only and no adjacent-repo file is
  created or modified;
- **overclaim scan** — every match is a **negated / blocked / non-goal / future-conditional** reference (e.g.
  "route-contract freeze — blocked", "final schema freeze — blocked", "Lane-2 canonical … remain blocked", "Freeside
  runtime / client integration — blocked", "claims no production readiness", "does not claim `aw_*` SQL is
  production-safe", "production DB execution is NOT authorized"); there is **no** positive present-tense authorization
  or safety claim;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–20 exactly once each.

**Accepted Phase 47J validation intaken (recorded, not re-run by this docs gate):** the targeted Phase 47J suite (4
files / **147 tests** passed); **app typecheck passed**; **app lint passed**; the **full app test run (175 files /
3,323 tests passed, 1 file / 22 skipped)**; **docs fixture validator 5/5**; **route-vector validator 5/5 (no sixth
vector)**; **route-vector self-check 44/44**; **diff checks clean**.

**Forward-traceability status notes added (§15 scope):**

- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md` — a Phase 47K
  status note recording that the Phase 47J implementation (PR #181) was **partially accepted** (PATCH / not fully
  accepted): its bounded, demonstrated proof components are accepted, but **full acceptance is withheld** because the
  binding §16 P.2 / P.3 least-privilege role / grant obligation was named but not demonstrated, and that the next lane
  is **Phase 47L** — a strictly docs/decision-only P.2 / P.3 evidence blocker / authorization gate (not the MVP-2
  closure gate), with production execution still blocked.
- `docs/admission-wedge/PHASE-47J-AW-SQL-EXECUTION-SINK-SPIKE-RUNBOOK.md` — a Phase 47K status note recording the
  downstream **partial / patch acceptance** (bounded demonstrated components accepted; full acceptance withheld
  pending the binding §16 P.2 / P.3 least-privilege evidence), that the live-engine evidence is accepted only as a
  bounded non-production operator proof (not CI / not production / not least-privilege), and that the next lane is the
  Phase 47L docs/decision-only P.2 / P.3 evidence blocker / authorization gate, with production execution still
  blocked.

**Corruption / duplicate guard** (carried from the 46I–47J precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 20.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §15 validation
  command list (a `bash` block) and the §20 Codex audit checklist (a `text` block). **No fenced block is an executable
  migration or runnable schema.**

---

## 16. Remaining blockers

Regardless of verdict, the following remain **blocked** after Phase 47K — **none** is unblocked by this acceptance
gate:

- **production DB execution** — blocked; the spike's execution sink is non-production-only;
- **production `--apply`** — blocked; the gate conjunction forbids a production target;
- **production DB writes** — blocked;
- **production migration execution** — blocked; `migrate.ts` is unchanged and is never the execution path;
- **production durable storage** — blocked;
- **startup wiring** — blocked; the only startup DB call stays `await migrate(dbPool)` at `server.ts:303-305`;
- **config / env wiring** (`config.ts`) — blocked; the `…_APPLY_*` env labels are read only inside the runner;
- **package / lockfile changes** — blocked;
- **production migration files / executable production schema** — blocked;
- **migration-runner changes** (`migrate.ts`) — blocked;
- **packaging / copy-runner changes** (`copy-migrations.mjs`) — blocked;
- **scope-guard weakening / editing** (canonical `scope-guards.test.ts`) — blocked; the 19-entry denylist stays in
  force unedited;
- **public route / API behavior change** — blocked;
- **public response expansion** — blocked;
- **raw candidate payload persistence** — blocked; only bounded opaque `awref:` references;
- **route-contract freeze** — blocked; `route_contract_final` stays false;
- **final schema freeze** — blocked; `schema_final` stays false; no `aw_*` migration is claimed safe;
- **ADR-022E gate #8 discharge** — not claimed (no repo evidence); **the dominant cross-repo blocker** for production
  admission and any Lane-2 canonical-store migration; Straylight-owned, operatively held;
- **Freeside runtime / client integration** — blocked (Freeside stays a consumer / handoff surface);
- **Lane-2 canonical Straylight-store migrations** — blocked (each a separate sibling-repo ADR under Straylight
  teammate review, behind the operative gate #8);
- **production admission** — blocked;
- **public `remember-this`** — blocked;
- **Discord / freeform ingestion** — blocked;
- **user chat becoming memory merely because it was said** — blocked; consent never inferred from chat;
- **package exports** of the spike — blocked unless separately justified and audited;
- **LLM / voice / Finn runtime wiring** — blocked;
- **MVP 3 forget / revoke / correction UI** — blocked;
- **production readiness of any kind** — not claimed.

**One blocking acceptance gap and one future-hardening limitation recorded for the corridor (see §17):**

- **BLOCKING ACCEPTANCE GAP — no least-privilege production-representative role / grant proof (P.2 / P.3).** The Phase
  47I §16 least-privilege execution-role / grant obligation (P.2 / P.3) is **binding** and was **named but not
  demonstrated**: the recorded Phase 47J evidence identifies only a redacted connection user / password and disposable
  database target; it does **not** document a role, grants, privileges, or a least-privilege boundary. This is **not**
  accepted-by-design and **not** merely out-of-scope — it is the **blocking acceptance gap** that prevents *full* Phase
  47J acceptance and is the subject of the Phase 47L docs/decision-only blocker / authorization gate (§18).
- **FUTURE-HARDENING LIMITATION (non-defect) — no standing / CI live-engine regression guard.** The live-engine
  `CHECK` / `UNIQUE` / transaction enforcement is proven by a **one-off, manual, redacted operator artifact**; the
  standing automated suite uses a fake sink. This is **not** a Phase 47J defect and **not** a blocking acceptance gap
  (the runbook is explicit the live-engine proof is a bounded one-off operator artifact, not a CI service); it is
  recorded as a future-hardening limitation a later lane may address.

**Candidate D / ADR-022E boundary preserved.** Candidate D (split-storage) remains **proposal input / design baseline,
not implemented production architecture**; Phase 46N's gate #8 clearing remains a **bounded Dixie documentation /
architecture / handoff prerequisite only**; the operative Straylight-side discharge remains blocked. The canonical
Straylight `StorageAdapter` interface and the `Assertion` / `TransitionReceipt` / `AuditEvent` shapes stay
Straylight-owned (cross-repo).

---

## 17. MVP-2 storage/audit corridor assessment

This gate must decide **to what extent Phase 47J is accepted against the binding Phase 47I §8–§21 checklist**, and
whether the MVP-2 storage/audit proof corridor can head toward a closure gate or whether a binding gap must be
resolved first. The corridor now holds **three proof tracks** (the SQL execution-sink track is accepted only
*partially* — see the assessment below):

| Track | Lanes | Accepted as | Proof basis |
|-------|-------|-------------|-------------|
| Mode 2 `.json` snapshot store | 47A / 47B | bounded, non-production, dev/operator-only durable route-storage | standing automated tests; off the production migration path |
| Lane-1 `aw_*` SQL **planning / isolation** | 47F / 47G | bounded, non-production, location-isolated SQL planning / manifest / safety proof (`--apply` refused) | standing automated tests; fake / in-memory sink |
| Lane-1 `aw_*` SQL **execution sink** | 47H / 47I / 47J | **partially accepted** — bounded, non-production execution-sink *components* (target policy, gate conjunction, transaction / `CHECK` / `UNIQUE`, cleanup, no-leak) demonstrated; **full acceptance withheld** pending the binding §16 P.2 / P.3 least-privilege role / grant evidence | standing automated tests (fake sink) **+ a one-off redacted live-engine operator run**; **P.2 / P.3 least-privilege role / grant: not demonstrated** |

**Assessment.** The execution-sink track's **demonstrated components are sound** — the target policy, gate
conjunction, transaction / `CHECK` / `UNIQUE` semantics, gated cleanup, and no-leak parity are individually proven,
the production posture is intact, and the track adds the first live-engine evidence the earlier tracks lacked. **But
Phase 47J cannot be accepted as complete against the Phase 47I §8–§21 checklist**, because one **binding** §16
obligation is undemonstrated, and a separate future-hardening limitation also exists:

1. **BLOCKING ACCEPTANCE GAP — the binding §16 P.2 / P.3 least-privilege role / grant obligation is named but not
   demonstrated** (§5 / §7 / §16). Phase 47I made P.2 / P.3 a **binding** item the spike must prove; the recorded Phase
   47J evidence identifies only a redacted connection user / password and disposable database target; it does **not**
   document a role, grants, privileges, or a least-privilege boundary. This is **not** accepted-by-design and **not**
   merely out-of-scope — it is a **blocking acceptance gap** for *full* Phase 47J acceptance, and is the **immediate,
   binding reason** this gate issues a partial / patch acceptance rather than a full one.
2. **FUTURE-HARDENING LIMITATION (non-defect) — the live-engine evidence is a one-off, manual, redacted, non-CI
   operator artifact** (§11). The standing automated suite uses a fake / test sink, so nothing in CI re-proves the
   live-engine `CHECK` / `UNIQUE` / transaction behavior on each run. This is a **non-defect future-hardening
   limitation** (the runbook is explicit the live-engine proof is a bounded one-off operator artifact, not a CI
   service) — recorded as a known characteristic, **not** a blocking acceptance gap.

The corridor-consolidation gap (the three tracks have never been assessed together as a single corridor) is likewise
**not** itself a Phase 47J defect. But item (1) **is binding**: heading straight into an MVP-2 closure gate would
close over an undemonstrated binding obligation. The disciplined rung is therefore a bounded, docs/decision-only
**P.2 / P.3 least-privilege evidence blocker decomposition / authorization gate** that decides **how** P.2 / P.3 is to
be satisfied (what production-representative least-privilege role / grant evidence is required, and what later
code/evidence lane would produce it) **before** any further evidence run or closure gate. This matches the chain's
pattern of never conflating "demonstrated components" with "complete," and never conflating "assess" with "close."
Hence **patch / partial acceptance** and **Phase 47L as the P.2 / P.3 blocker / authorization gate** (§1, §18).

---

## 18. Decision: next lane

> **Selected next lane: Phase 47L — Lane-1 `aw_*` SQL least-privilege (P.2 / P.3) evidence blocker decomposition /
> authorization gate (a *separate*, strictly docs / decision-only gate — NOT the MVP-2 closure gate itself, and NOT
> an evidence / implementation lane).**

Phase 47L must be **strictly docs / decision-only**. Its purpose is to take the **blocking acceptance gap** identified
here — the binding Phase 47I §16 P.2 / P.3 least-privilege execution-role / grant obligation that Phase 47J **named but
did not demonstrate** — and **decide how it is to be satisfied** before any further evidence run, any acceptance
closure, or any MVP-2 closure gate. Concretely, Phase 47L (on paper only) decomposes the P.2 / P.3 blocker, states
what a production-representative least-privilege role / grant evidence obligation actually requires, and authorizes (or
declines to authorize) a *future, separate* lane that would later produce that evidence — exactly as the earlier
decomposition → authorization → implement → accept rungs were structured. It **must not** itself produce P.2 / P.3
evidence, run any role / grant test, implement anything, enable `--apply`, inject any sink, open any connection, change
any production-path file, or discharge any Straylight-side gate.

Stated clearly so the next lane carries no ambiguity:

- **Phase 47L is strictly docs / decision-only.** It is **not** a docs/test-only lane and authorizes **no**
  docs/test-only implementation, no evidence run, and no non-runtime artifact production inside Phase 47L itself; it
  only *decides how* P.2 / P.3 is to be satisfied and *authorizes* (or declines) a later separate lane.
- **Phase 47L is not the MVP-2 closure gate.** Closure is not selected here and is not selected by Phase 47L; any
  closure gate, if ever warranted, is a *further separate* lane that cannot run until the binding P.2 / P.3 gap is
  resolved.
- **Phase 47L is not production execution, not `--apply` authorization, not production storage, not a production
  migration, and not a schema / route-contract freeze.**
- **Phase 47L is not an ADR-022E gate #8 discharge.**

**Not selected:** declare Phase 47J fully accepted / the corridor complete and head straight into an MVP-2 closure
gate (rejected — the binding §16 P.2 / P.3 obligation is undemonstrated, §17); reject Phase 47J wholesale (rejected —
the demonstrated components are sound and defect-free, §5); authorize a docs/test-only or evidence-producing Phase 47L
(rejected — Phase 47L is strictly docs/decision-only); authorize production execution, production `--apply`,
production durable storage, production migration execution, Lane-2 canonical migrations, any freeze, or a gate-#8
discharge (all blocked, §16). The accepted Phase 47A `.json` path remains the live fallback if a future lane cannot
satisfy a closure bar without weakening the production posture.

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

## 19. Non-goals

Phase 47K is **not**, and does **not** authorize, any of the following (each remains its own separately-gated future
work or a standing blocker — §16):

- production DB execution; production DB writes; production migration execution; production durable storage;
- startup wiring; config behavior changes; package / lockfile changes; production migration files;
- public route / API behavior changes; public response expansion; raw candidate payload persistence;
- route-contract freeze; final schema freeze; ADR-022E gate #8 discharge;
- Freeside runtime / client integration; Lane-2 canonical Straylight-store migrations;
- production readiness; any claim that `aw_*` SQL is production-safe;
- any claim that the local disposable Postgres evidence is CI, production, or least-privilege-role proof;
- any claim that Phase 47J is **fully accepted** against the Phase 47I §8–§21 checklist, or that the binding §16
  P.2 / P.3 least-privilege role / grant obligation is satisfied;
- MVP-2 storage/audit closure; declaring the corridor complete.

Phase 47K accepts only the bounded components Phase 47J *demonstrated* — a disabled-by-default, dev/operator/test-only,
non-production execution-sink spike with a hardened target policy, a fail-closed gate conjunction, and a one-off
redacted live-engine proof — and **withholds full acceptance** pending the binding §16 P.2 / P.3 least-privilege
evidence, selecting a single, well-bounded next lane (§18 — a docs/decision-only P.2 / P.3 evidence blocker /
authorization gate). Both the least-privilege role / grant evidence and the safety of production execution are exactly
what future lanes must *prove*, not what this acceptance asserts.

---

## 20. Audit checklist for Codex

This checklist audits **this Phase 47K PR** — the docs-only acceptance / hardening decision gate. Every item must be
ACCEPT; any REJECT blocks acceptance of this Phase 47K PR.

```text
PHASE 47K — LANE-1 aw_* SQL EXECUTION-SINK SPIKE ACCEPTANCE / HARDENING DECISION GATE CODEX AUDIT CHECKLIST
(docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47K PR)

[ ] 1.  Scope is docs-only — Phase 47K adds only this document plus the two §15 forward-traceability status
        notes (in the Phase 47I checklist gate and the Phase 47J runbook); it modifies no runtime source,
        and specifically not migrate.ts, copy-migrations.mjs, any *.sql, the experimental SQL / manifest /
        planner (aw-sql-isolation-spike/*) / runner, no-leak.ts, aw-sql-execution-sink-spike.test.ts, the
        three extended Phase 47F test files, config.ts, server.ts, or scope-guards.test.ts.
[ ] 2.  No runtime/source/test/config/package/CI/SQL/migration/vector/validator/fixture changes — no route
        handler, store/storage code, DB code, migration runner, packaging/copy runner, planner, runner, auth,
        consent, server-boot, unit/integration test, scope-guard test, isolation test, fixture, route-vector
        JSON, route-vector validator, route-vector README, config.ts, env gate, package.json, lockfile,
        .github/ CI, .sql, aw_* schema, executable schema, migration file, or migration directory is added/modified.
[ ] 3.  Phase 47J represented accurately (§4) — 8 files / +1902 / -52 / zero production-path files; index.ts
        (+114, pure/pool-free/node:-only execution-gate conjunction), runner (+426/-52, real sink + target
        policy, outside SPIKE_FILES), three extended Phase 47F tests, new aw-sql-execution-sink-spike.test.ts,
        Phase 47J runbook; the canonical scope-guards.test.ts is UNEDITED (the +13 went to the spike-specific
        aw-sql-isolation-scope-guard.test.ts).
[ ] 4.  Both Codex PATCH fixes recorded accurately (§5) — (1) target policy hardened to a scheme allowlist
        (postgres:/postgresql:) + wholesale query-parameter rejection (TARGET_UNSUPPORTED_PROTOCOL /
        TARGET_HOST_OVERRIDE_UNSUPPORTED / TARGET_TLS_FILE_PARAMETER_UNSUPPORTED / TARGET_QUERY_PARAMETER_UNSUPPORTED);
        (2) real-engine evidence produced as a bounded redacted disposable-Postgres-16.14 operator run.
[ ] 5.  Acceptance is partial / patch, not full — Phase 47J's bounded, demonstrated components (disabled-by-default,
        dev/operator/test-only, NON-PRODUCTION, exact-scope, fail-closed execution-sink) are accepted, but FULL
        acceptance is WITHHELD because the binding §16 P.2 / P.3 least-privilege role / grant obligation was not
        demonstrated; the doc does NOT call Phase 47J fully accepted or claim it satisfies every applicable §8-§21
        obligation; not production execution authorization (§1 / §5 / §6 / §17).
[ ] 6.  Target-policy / gate / connect-order acceptance is faithful (§8 / §9) — scheme allowlist + wholesale
        query-param rejection on the same effective target pg uses; full fail-closed gate conjunction; every
        refusal before any connection; the …_APPLY_* env labels read only inside the runner, config.ts untouched.
[ ] 7.  Real-engine evidence framed correctly (§11) — accepted as a bounded, redacted, local disposable operator
        proof only; explicitly NOT CI, NOT production, NOT production-readiness, NOT a least-privilege/production-role
        proof, and NOT permission to connect production DBs.
[ ] 8.  No claim of production DB execution — the doc states explicitly that Phase 47J ran nothing against any
        production database and proves no production execution, writes, migration execution, or readiness (§7 / §16).
[ ] 9.  No production overclaim — no production-readiness, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, production-DB-write, production-migration-execution, Freeside-runtime,
        Lane-2-canonical, or aw_*-SQL-production-safe claim; every such reference is negated / blocked / a non-goal
        (§7 / §16 / §19).
[ ] 10. What-it-proves vs what-it-does-not (§6 / §7) is faithful — every "proves" is for a bounded non-production
        execution-sink component; the binding §16 P.2 / P.3 least-privilege role / grant gap is recorded as NOT proven
        and as a BLOCKING acceptance gap; the non-CI live-engine evidence is recorded as NOT proven and as a non-defect
        future-hardening limitation.
[ ] 11. Exact file-envelope acceptance is faithful (§14) — Phase 47J confined to the Phase 47I §8 envelope; no extra
        helper/module/script/source file; §9 forbidden surfaces untouched.
[ ] 12. Corridor / blocker assessment is honest (§17) — three tracks (47A/47B JSON, 47F/47G SQL planning, 47H/47I/47J
        execution sink, the last PARTIALLY accepted); the binding §16 P.2 / P.3 least-privilege gap is classified as a
        BLOCKING acceptance gap (not accepted-by-design, not merely out-of-scope) and the missing CI live-engine guard
        as a non-defect future-hardening limitation; neither is a defect in Phase 47J's demonstrated components.
[ ] 13. Decision / next lane is correct (§1 / §18) — Verdict PATCH / NOT FULLY ACCEPTED (partial acceptance, Option C);
        full acceptance withheld for the binding P.2 / P.3 gap; next lane is Phase 47L, a STRICTLY docs/decision-only
        Lane-1 aw_* SQL least-privilege (P.2 / P.3) evidence blocker decomposition / authorization gate, explicitly NOT
        the MVP-2 closure gate, NOT a docs/test-only or evidence-producing lane, and NOT production implementation.
[ ] 14. Preserved blockers are explicit (§16) — production DB execution, production --apply / writes / migration
        execution, production durable storage, startup / config / package changes, migration-runner / packager /
        scope-guard changes, Lane-2 canonical migrations, route-contract / final-schema freeze, and the operative
        ADR-022E gate #8 discharge all remain BLOCKED.
[ ] 15. No bad citation regression — no migrate.ts:303-305 citation (migrate.ts is 254 lines); the conditional
        startup migrate is cited as server.ts:303-305; the canonical scope-guard denylist is the 19-entry
        scope-guards.test.ts:122; the execution-gate seam is index.ts:610/634/661/700 and the injected sink interface
        index.ts:124-129 / applyIsolationSpikePlan index.ts:568.
[ ] 16. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5
        (no sixth vector); self-check 44/44; git diff --check and git diff --cached --check clean; nothing staged (§15).
[ ] 17. Accepted Phase 47J validation intaken (not re-run) is recorded faithfully (§15) — targeted suite 4 files /
        147 tests; app typecheck + lint clean; full app tests 175 files / 3,323 passed, 1 file / 22 skipped; fixtures
        5/5; route-vectors 5/5; self-check 44/44; diff checks clean.
[ ] 18. No adjacent-repo changes — no file in loa-straylight or freeside-characters (or any adjacent repo) was
        created or modified by Phase 47K.
[ ] 19. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp / temp,
        __pycache__, .pyc, dist, build, or .claude artifact appears in the Phase 47K working tree.
[ ] 20. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the Claude
        Code memory store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
```
