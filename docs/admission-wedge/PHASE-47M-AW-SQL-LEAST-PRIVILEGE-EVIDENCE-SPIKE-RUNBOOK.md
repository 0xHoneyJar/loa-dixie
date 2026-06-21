# Phase 47M — Admission Wedge dev/operator/test-only Lane-1 `aw_*` SQL LEAST-PRIVILEGE (P.2 / P.3) evidence spike: runbook

> **What this is.** Phase 47M is the **evidence-bearing least-privilege lane** authorized by the Phase 47L
> blocker / authorization gate
> ([`../ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md`](../ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md),
> Verdict A — Option A). On a **disposable, loopback-only, volume-less, auto-removed local PostgreSQL 16** engine it
> produces the **non-production, disposable least-privilege role / grant evidence** the Phase 47L gate decomposed
> (§7–§13 of that gate): a **dedicated, least-privileged execution role** (no superuser, no `CREATEDB`, no
> `CREATEROLE`, no `CREATE` on `public`) drives the **frozen** Phase 47J forward `--apply` through the existing
> dev/operator runner, the unqualified `aw_isolation_spike_*` DDL resolves into a **dedicated non-`public` schema**
> via a proven `search_path`, the minimal grant set is shown to be **both necessary and sufficient**, the role's
> **no-overreach boundary** is demonstrated where representable, a set of **live data-plane CHECK / UNIQUE / rollback
> probes** is exercised under that same least-privilege role, and the cleanup / down path runs under a **separate,
> separately-authorized cleanup role** with **proven per-object ownership**. This records the §13 redacted evidence
> artifact the Phase 47L gate required a future lane to produce.
>
> **What it is NOT.** This is **not** production storage, **not** the final Straylight store, **not** a
> route-contract freeze, **not** a final schema freeze, and **not** an ADR-022E gate #8 discharge. It performs
> **no** production DB write, **no** production migration execution, and **no** startup wiring; it opens **no**
> connection from app startup or any route; it changes **no** production migration runner, packager, server boot,
> or config behavior; it adds **no** dependency, package script, or lockfile change; it expands **no** public
> response; it persists **no** raw candidate payload; and it integrates **no** Freeside runtime / client. **Phase
> 47M makes no claim of production readiness, claims no production-representative least privilege, and does not
> claim that `aw_*` SQL is production-safe.** The evidence here is a **bounded, one-off, non-production
> dev/operator proof** against a disposable local engine — it is **not** CI, **not** production, and proves
> **nothing** about production privilege boundaries.
>
> **Acceptance boundary (binding).** Phase 47M **produces** and **records** the non-production disposable
> least-privilege evidence; it does **not** self-accept. Whether this evidence clears the binding Phase 47I §16
> P.2 / P.3 gap — and thereby unblocks full Phase 47J acceptance — is decided by a **later, separate acceptance
> gate**, not by Phase 47M itself, mirroring the Phase 47F → 47G and Phase 47J → 47K implement → accept precedent.
> Phase 47M does **not** clear P.2 / P.3, does **not** grant full Phase 47J acceptance, and does **not** accept any
> evidence requirement as satisfied — it **records evidence for later acceptance-gate review**. Until that gate runs,
> the binding §16 P.2 / P.3 obligation **remains undischarged**, full Phase 47J acceptance **remains withheld**, and
> MVP-2 storage / audit closure **remains blocked**. **Production-representative** least privilege is **deferred and
> blocked** behind the operative ADR-022E gate #8; only **non-production, disposable** least-privilege evidence is
> in this lane's scope.

> **Phase 47N status note (forward traceability; added by the Phase 47N least-privilege evidence acceptance gate).** The
> **later, separate acceptance gate** this lane deferred the clear / accept decision to has run:
> [`../ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-ACCEPTANCE-GATE.md`](../ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-ACCEPTANCE-GATE.md)
> (strictly docs/decision-only; **produced no new evidence**) **adjudicated this merged Phase 47M evidence** against the
> binding Phase 47L §7–§13 requirements (Verdict **A — ACCEPT**). It found every binding requirement satisfied by the
> recorded, redacted, disposable-local evidence (the dedicated least-privilege role, the minimal grant proven necessary
> and sufficient, the dedicated-schema `search_path`, the live CHECK / UNIQUE / rollback probes under the LP role, the
> separate cleanup role with proven per-object ownership-transfer, and the no-overreach boundary where representable),
> and therefore **cleared the binding §16 P.2 / P.3 gap for the bounded Lane-1 non-production / disposable-local
> evidence corridor** and **recorded full Phase 47J acceptance within the non-production Lane-1 limits** (the bounded,
> disabled-by-default, dev/operator/test-only, non-production execution-sink spike). This clears P.2 / P.3 **only** in
> that bounded sense — **production-representative** least privilege stays **deferred and blocked** behind the operative
> ADR-022E gate #8. Production DB execution, production migration execution, durable production storage, MVP-2 closure,
> route-contract / final-schema freeze, Freeside, Lane-2 canonical migrations, and the operative ADR-022E gate #8
> discharge **all remain BLOCKED**; the selected next lane is a strictly docs/decision-only Phase 47O corridor-closure /
> remaining-MVP-2-blocker review gate.

---

## 1. Scope

Phase 47M is bounded to the exact Phase 47L §14 envelope — which is the exact Phase 47I §8 file scope plus this
new runbook. In this lane:

- **new** — only this runbook (`docs/admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md`),
  recording the §13 evidence artifact.
- **modified** — **exactly one document**: the Phase 47L blocker / authorization gate
  `docs/ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md`, which gains a bounded additive
  forward-traceability status note (the lane Phase 47L §17 authorized has run). **No source, test, config, package,
  lockfile, SQL, executable schema, migration, CI, route-vector, validator, fixture, generated, or binary file is
  changed.** Specifically there is **no edit to `index.ts`, the runner, `no-leak.ts`, `scope-guards.test.ts`,
  `migrate.ts`, `copy-migrations.mjs`, `server.ts`, `config.ts`, the experimental `.sql`, or any test** — the only
  two files in this lane's diff are this new runbook and the bounded additive forward-traceability note appended to
  the Phase 47L gate document.

The Phase 47L §14 envelope permits an in-place dependency-injection refinement to `index.ts` and an in-place
extension of the runner / test files **only if genuinely needed**. It was **not** needed: the existing Phase 47J
runner already drives the forward / cleanup `--apply` against an arbitrary accepted non-production target DSN, and
the **role / grant / dedicated-schema / `search_path` / ownership-transfer** setup is **operator SQL executed
outside the runner** (against the disposable engine). The experimental DDL stays exactly the frozen 3-table
`aw_isolation_spike_*` family shipped by Phase 47F; **Phase 47M rewrote no `.sql`** (Phase 47L §8 / §14) — the
dedicated-schema `search_path` is the only mechanism used to place the unqualified objects.

## 2. Posture (disabled by default; dev/operator/test-only; NON-PRODUCTION)

| Property | Value |
|----------|-------|
| Default | **off** — no execution unless every Phase 47I §10 gate is explicitly set |
| Mode | dev/operator/test-only; `NODE_ENV=production` is **refused** |
| Target | **strictly non-production only**; the production `DATABASE_URL` is **always refused**; a fresh disposable loopback DB is created and destroyed |
| Engine | a **disposable** local PostgreSQL 16 engine — loopback-only, **no named volume**, auto-removed, torn down after the run |
| Reachability | the **explicit runner** is the only DB-touching caller — never startup, route, migrator, or a package script |
| Credentials | the target DSN / role credentials are **never logged**; refusals carry stable, non-sensitive reason codes |
| Reproducibility | a one-off **operator** proof; reproducing it requires an operator to stand up their own disposable PostgreSQL — it is **not** added to CI and contacts **no** external DB from the unit suite |

## 3. Least-privilege role / grant / schema model (P.2 / P.3)

Two **distinct, separately-authorized** disposable roles are used (Phase 47L §8 / §10), neither a superuser, the
default maintenance role, nor a production migration / admin role:

- **`<redacted-execution-role>` — the least-privilege *forward execution* role (P.2 / P.3).** Its claimed minimal
  grant set is the **least** privileges required for the bounded Phase 47J forward path, and nothing broader:
  - role attributes: `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`;
  - `CONNECT` on the disposable database only;
  - `USAGE, CREATE` on the **dedicated `<redacted-dedicated-schema>` schema** only;
  - **no** `CREATE` on `public` (explicitly revoked, and `PUBLIC`'s default `CREATE` on `public` revoked too);
  - **no** `CONNECT` to any other database;
  - per-database role setting `search_path = <redacted-dedicated-schema>` (so the **unqualified** forward DDL
    resolves into the dedicated schema — never `public`).
- **`<redacted-cleanup-role>` — the separate cleanup / down role (Phase 47L §10, Model A).** It is **not** the
  forward LP role and is **not** folded into the LP role's claimed minimal grant:
  - same conservative attributes (`LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`);
  - `CONNECT` on the disposable database; `USAGE` on `<redacted-dedicated-schema>`;
    `search_path = <redacted-dedicated-schema>`;
  - **per-object ownership** of every `aw_isolation_spike_*` object, **transferred** from the LP role by an
    **elevated (setup-authority) step before cleanup is tested** — because in PostgreSQL a table can be dropped
    only by its **owner** (or a superuser), and **schema ownership alone is never accepted as drop authority**.

This is **disposable and non-production by construction**: no production DB, no production role, no production
`DATABASE_URL`, and no production credential is referenced; nothing is wired into startup, config, packaging, or
the production migration runner.

## 4. Reproduce (explicit dev/operator invocation only — NOT a package script)

> **Redacted procedure.** All concrete local identifiers — engine instance, host, port, database, schema, role
> names, and role credentials — are **redacted** and **never committed**. An operator reproduces this on their own
> local tooling; the concrete bring-up / teardown commands are intentionally not committed. Replace every
> `<redacted-*>` placeholder with **disposable, non-production** local values; never paste a real production DSN,
> credential, tenant id, actor id, role credential, internal hostname, or port. Generate throwaway role credentials
> locally and **never** commit them.

1. **Stand up the engine.** Using local operator tooling, stand up a **disposable, loopback-only, volume-less,
   auto-removed local PostgreSQL 16** engine, bound to a loopback host (`<redacted-local-host>`) and a disposable
   loopback port (`<redacted-local-port>`), with **no named volume**, removed after the run.

2. **Elevated (setup-authority) operator SQL** — create a disposable database, a dedicated non-`public` schema, the
   least-privilege forward role, and a **separate** cleanup role, with **minimal grants only**:

   ```sql
   CREATE DATABASE <redacted-disposable-db>;
   CREATE ROLE <redacted-execution-role> LOGIN PASSWORD '<redacted-credential>'
     NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
   CREATE ROLE <redacted-cleanup-role>   LOGIN PASSWORD '<redacted-credential>'
     NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
   REVOKE CONNECT ON DATABASE <redacted-bootstrap-db> FROM PUBLIC;       -- cross-db no-overreach
   GRANT  CONNECT ON DATABASE <redacted-disposable-db>
     TO <redacted-execution-role>, <redacted-cleanup-role>;
   ALTER  ROLE <redacted-execution-role> IN DATABASE <redacted-disposable-db>
     SET search_path = <redacted-dedicated-schema>;
   ALTER  ROLE <redacted-cleanup-role>   IN DATABASE <redacted-disposable-db>
     SET search_path = <redacted-dedicated-schema>;
   -- (connected to <redacted-disposable-db>):
   CREATE SCHEMA <redacted-dedicated-schema>;
   REVOKE CREATE ON SCHEMA public FROM PUBLIC;                          -- belt-and-suspenders (PG16 already does this)
   REVOKE ALL    ON SCHEMA public FROM <redacted-execution-role>, <redacted-cleanup-role>;
   GRANT  USAGE, CREATE ON SCHEMA <redacted-dedicated-schema> TO <redacted-execution-role>;  -- minimal forward-path grant
   GRANT  USAGE         ON SCHEMA <redacted-dedicated-schema> TO <redacted-cleanup-role>;     -- drop path needs USAGE + per-object ownership
   ```

3. **Forward `--apply` AS THE LEAST-PRIVILEGE ROLE** (the existing runner; from `app/`). The target DSN is a
   **disposable loopback** DB-name placeholder accepted by the Phase 47J §4 target policy; it is supplied as a
   redacted value and never logged:

   ```bash
   cd app
   DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true \
   DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED=true \
   DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_TARGET_DSN='<redacted-local-dsn>' \
   NODE_ENV=development \
     npx tsx scripts/aw-sql-isolation-spike-runner.mjs --apply
   ```

4. **Cleanup `--apply` AS THE SEPARATE CLEANUP ROLE** — only after an elevated step transfers ownership of every
   `aw_isolation_spike_*` object to `<redacted-cleanup-role>`. Needs the DISTINCT cleanup opt-in too.
   (Elevated setup-authority step:
   `ALTER TABLE <redacted-dedicated-schema>.aw_isolation_spike_* OWNER TO <redacted-cleanup-role>;` ×3.)

   ```bash
   DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true \
   DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED=true \
   DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_CLEANUP_ENABLED=true \
   DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_TARGET_DSN='<redacted-local-dsn>' \
   NODE_ENV=development \
     npx tsx scripts/aw-sql-isolation-spike-runner.mjs --apply --direction=cleanup
   ```

5. **Tear down** — the engine is auto-removed and volume-less; remove it and no state is left behind.

## 5. Evidence capture (redacted §13 artifact)

The DSN / credentials / host / port / DB name / engine instance name are **redacted** (Phase 47L §12 S.1 / S.2);
the role *names* and *grant set* are recorded in non-sensitive, redacted form. Reproduced from a one-off operator
run against a disposable, loopback-only, volume-less, auto-removed local PostgreSQL 16 engine, torn down after the
run.

```text
engine:        PostgreSQL 16 (16.14) — disposable local engine, loopback-only, no named volume, auto-removed, torn down after
target DSN:    <redacted-local-dsn>
               (loopback host marker, disposable DB-name marker, NO query string -> accepted by the Phase 47J §4 policy)

roles (non-sensitive redacted names; credentials redacted and NOT committed):
  <redacted-execution-role>  — LP forward execution role:  rolsuper=f rolcreatedb=f rolcreaterole=f rolcanlogin=t
  <redacted-cleanup-role>    — separate cleanup/down role: rolsuper=f rolcreatedb=f rolcreaterole=f rolcanlogin=t

minimal grant set proven for <redacted-execution-role> (A.2 / P.3):
  has_database_privilege(<redacted-execution-role>,'<redacted-disposable-db>','CONNECT') = true
  has_database_privilege(<redacted-execution-role>,'<redacted-bootstrap-db>','CONNECT')  = false  (no cross-db reach)
  has_schema_privilege(<redacted-execution-role>,'<redacted-dedicated-schema>','USAGE')  = true
  has_schema_privilege(<redacted-execution-role>,'<redacted-dedicated-schema>','CREATE') = true
  has_schema_privilege(<redacted-execution-role>,'public','CREATE')                      = false  (no CREATE on public)
  has_schema_privilege(<redacted-execution-role>,'public','USAGE')                       = true   (default USAGE only; cannot create/read objects)
  role attributes: NOSUPERUSER, NOCREATEDB, NOCREATEROLE                                          (D.4)

dedicated-schema search_path proof (A.7 / F.7 / §8):
  per-db role setting: <redacted-execution-role> -> search_path=<redacted-dedicated-schema> ;
                       <redacted-cleanup-role>    -> search_path=<redacted-dedicated-schema>
  forward --apply AS <redacted-execution-role>: "APPLIED (forward) / statements applied: 1 / committed in a single
                                   transaction against a NON-PRODUCTION target." (exit 0)
  current_user under the run = <redacted-execution-role> ; search_path = <redacted-dedicated-schema>
  placement: 3 tables in schema '<redacted-dedicated-schema>', owned by '<redacted-execution-role>':
             aw_isolation_spike_assertion, _supersession_link, _tombstone
  aw_isolation_spike_* tables in 'public': 0            (unqualified DDL resolved to the dedicated schema, NEVER public)
  constraints in the dedicated schema: 17 explicit named CHECK constraints (= the Phase 47J §8 figure)
             3 PRIMARY KEY, 2 UNIQUE
             [the frozen SQL defines 17 named CHECK constraints; Phase 47M records the source-grounded 17 named
              CHECK constraints and the live rejection probes in §5.1 as the load-bearing constraint evidence; any
              non-load-bearing catalog-count artifact is excluded from the acceptance evidence]
  idempotent re-run forward --apply AS <redacted-execution-role>: APPLIED clean (CREATE TABLE IF NOT EXISTS), 3 tables still present

minimal-grant necessity AND sufficiency (F.6):
  REVOKE CREATE ON SCHEMA <redacted-dedicated-schema> FROM <redacted-execution-role>; forward --apply ->
    runner exit 1; rolled back; engine: "permission denied for schema <redacted-dedicated-schema>"; tables after failure: 0
  GRANT  CREATE ON SCHEMA <redacted-dedicated-schema> TO   <redacted-execution-role>; forward --apply ->
    runner exit 0; tables after re-grant: 3
  => the minimal grant is NECESSARY (forward fails without schema CREATE) and SUFFICIENT (forward succeeds with
     only CONNECT + schema USAGE/CREATE, no superuser, no production migration/admin role, no broader grant)

no-overreach probes AS <redacted-execution-role> (N.1–N.5; "representable in this disposable setup" per Phase 47L §11):
  N.1 SELECT a synthetic unrelated object in public  -> ERROR: permission denied for table <redacted-unrelated-public-object>  [representable; DENIED]
  N.1 INSERT into that unrelated object in public     -> ERROR: permission denied for table <redacted-unrelated-public-object>  [representable; DENIED]
  N.2 unrelated-table access                          -> covered by N.1 (the only unrelated table present is denied) [partially representable; DENIED]
  N.3 cross-db CONNECT to '<redacted-bootstrap-db>'   -> FATAL: permission denied for database "<redacted-bootstrap-db>"        [representable; DENIED]
  N.4 CREATE TABLE in public                          -> ERROR: permission denied for schema public; object absent afterward (count 0) [representable; DENIED]
  N.5 ALTER <redacted-execution-role> SUPERUSER       -> ERROR: permission denied to alter role                  [representable; DENIED]
  N.5 CREATE ROLE (escalation)                        -> ERROR: permission denied to create role                 [representable; DENIED]
  N.5 SET ROLE <redacted-setup-authority>             -> ERROR: permission denied to set role "<redacted-setup-authority>" [representable; DENIED]
  not-representable: probing additional unrelated APPLICATION schemas/tables — the disposable DB has only the
                     dedicated schema plus one synthetic unrelated object in public; standing up production-like
                     schemas to widen N.2 is explicitly NOT done (Phase 47L §11) and is DEFERRED to a later
                     production-storage / auth gate.

cleanup / down privilege model (Phase 47L §10 — Model A with documented ownership-transfer boundary):
  pre-transfer: <redacted-cleanup-role> attempting DROP (via a direct probe) ->
                ERROR: "must be owner of table aw_isolation_spike_assertion"
                => schema USAGE/ownership alone is NOT drop authority; proven, not assumed
  elevated setup boundary (documented): setup-authority ALTER TABLE <redacted-dedicated-schema>.aw_isolation_spike_*
                OWNER TO <redacted-cleanup-role> (x3)
  per-object ownership after transfer: aw_isolation_spike_assertion / _supersession_link / _tombstone -> owner <redacted-cleanup-role> (all 3)
  cleanup --apply AS <redacted-cleanup-role> (with the DISTINCT cleanup opt-in): "APPLIED (cleanup) / statements applied: 1 /
                committed in a single transaction against a NON-PRODUCTION target." (exit 0)
  aw_isolation_spike_* tables after cleanup: 0          (DROP ... IF EXISTS, reverse order, resolved through the dedicated-schema search_path)
  synthetic unrelated object in public after cleanup: untouched (value intact)  (cleanup NEVER touched public)
  cleanup gate guard: cleanup --apply WITHOUT the cleanup opt-in -> refused "CLEANUP_OPT_IN_MISSING" (exit 1);
                      the 3-table family stays present (3) — fail-closed before any connection

credential / no-leak hygiene (S.1–S.5 / P.4–P.7):
  runner stdout/stderr on the forward success path -> scan for the LP role credential / DSN scheme / loopback host /
                      port -> 0 / 0 / 0 / 0 matches (CLEAN)
  refusals/failures emit only stable non-sensitive codes (CLEANUP_OPT_IN_MISSING; the engine permission-denied text
                      carries no DSN / credential / host / port / DB name)
  no raw DSN, credential, role credential, or grant credential is committed to the repository; role names + grant set
                      are recorded in redacted, non-sensitive form only
  only static statement text was used: the frozen aw_isolation_spike/sql/*.sql plus the operator role/grant/
                      ownership DDL run against the disposable target — no dynamic, payload-derived, or private SQL
```

### 5.1 Live data-plane constraint / conflict / rollback probes

Under `<redacted-execution-role>` after a successful forward apply, a **live** disposable PostgreSQL 16 probe
attempted the following data-plane writes. Each probe ran **as the least-privilege execution role**, inside the
dedicated experimental schema resolved through the explicit role/session `search_path`. These are **real** engine
outcomes captured from a one-off disposable operator run — not inferred from static SQL. The recorded outcomes were
redacted before committing (no DSN, credential, host, port, DB name, role name, schema name, or temp path); the
named constraints below are repo SQL object-family names defined in the frozen `aw_isolation_spike_*` DDL, and the
SQLSTATE codes are the standard, non-sensitive PostgreSQL error codes.

| Probe | Expected boundary | Redacted recorded outcome |
| --- | --- | --- |
| Invalid raw payload ref (a `candidate_payload_ref` value that is not an `awref:payload:<id>`) | CHECK rejection | rejected by CHECK constraint `aw_isolation_spike_assertion_candidate_payload_ref_chk` (SQLSTATE 23514); no row persisted |
| Wrong `awref` kind (an `assertion_ref` given an `awref:payload:` value) | CHECK rejection | rejected by CHECK constraint `aw_isolation_spike_assertion_assertion_ref_chk` (SQLSTATE 23514); no row persisted |
| Overlength ref (a ref id beyond the `{0,59}` CHECK bound, still inside `VARCHAR(80)`) | CHECK rejection | rejected by CHECK constraint `aw_isolation_spike_assertion_tenant_ref_chk` (SQLSTATE 23514); no row persisted |
| Out-of-range status (`assertion_status` not in `active`/`superseded`) | CHECK rejection | rejected by CHECK constraint `aw_isolation_spike_assertion_status_chk` (SQLSTATE 23514); no row persisted |
| Out-of-range class (`assertion_class` failing the `^[a-z][a-z0-9_]{0,63}$` CHECK) | CHECK rejection | rejected by CHECK constraint `aw_isolation_spike_assertion_class_chk` (SQLSTATE 23514); no row persisted |
| Duplicate / conflict (a repeat of the `(tenant_ref, estate_ref, actor_ref, assertion_ref)` key) | UNIQUE rejection | rejected by UNIQUE constraint `aw_isolation_spike_assertion_uniq` (SQLSTATE 23505); pre-existing row count unchanged |
| Explicit transaction rollback | transaction rollback | a valid row inserted inside an explicit transaction was visible (in-transaction row count rose by one); `ROLLBACK` was executed; the post-rollback row count returned to the prior value and the rolled-back row was absent — **no partial row persisted** |

After all seven probes only the single valid baseline row remained (every rejected write left **no** row, the
duplicate left the count unchanged, and the rollback left no partial row). The status and class checks are recorded
as two distinct CHECK constraints to reflect that both halves of the "out-of-range status/class" boundary were
exercised against live constraints, not one.

This evidence **records** the Phase 47L **§9 forward requirements (F.1–F.7)**, the **§10 cleanup privilege model**
(Model A with a documented ownership-transfer boundary and proven per-object drop authority), the **§11
no-overreach checks (N.1–N.5, to the extent representable)**, the **§12 credential / no-leak requirements
(S.1–S.5)**, the **§13 artifact requirements (A.1–A.7)**, and the live data-plane CHECK / UNIQUE / rollback probes
above — against a **live** disposable PostgreSQL 16 engine — **for later acceptance-gate review**. It remains a
**bounded, non-production** proof, is **not** added to CI, and reproducing it requires an operator to stand up
their own disposable PostgreSQL. **Phase 47M does not self-accept and does not clear P.2 / P.3**: a **later,
separate acceptance gate** — not Phase 47M — decides whether this evidence clears the binding §16 P.2 / P.3 gap and
unblocks full Phase 47J acceptance.

## 6. Phase 47L requirement → evidence map

| Phase 47L requirement | Where recorded (§5 / §5.1) | Recorded observation |
|-----------------------|-------------------------|--------|
| **F.1** create disposable DB | engine / target DSN | disposable loopback DB created + destroyed |
| **F.2** dedicated disposable LP role, non-superuser | roles block; D.4 | LP role created, all elevated attrs `f` |
| **F.3** grant only minimal privileges, recorded | minimal grant set | `CONNECT` + schema `USAGE/CREATE` only; recorded |
| **F.4** run forward SQL under the LP role | forward `--apply` AS LP role | APPLIED, exit 0 |
| **F.5** expected objects exist under the LP role | placement | 3-table family + 17 CHECK / 3 PK / 2 UNIQUE |
| **F.6** overbroad privileges not required | necessity/sufficiency | fails without schema `CREATE`; succeeds with minimal set, no superuser |
| **F.7** dedicated-schema `search_path` proven | search_path proof | objects in dedicated schema, 0 in `public`; LP has no `CREATE` on `public` |
| **§10** cleanup model (Model A) | cleanup block | separate role; per-object ownership transferred + proven; not folded into LP role |
| **N.1** no unrelated-schema access | no-overreach | unrelated `public` object SELECT/INSERT DENIED |
| **N.2** no unrelated-table access | no-overreach | covered by N.1 (partially representable) |
| **N.3** no cross-database access | no-overreach | cross-db CONNECT DENIED |
| **N.4** no out-of-scope creation | no-overreach | CREATE in `public` DENIED; no `CREATEDB`/`CREATEROLE`/super |
| **N.5** no privilege escalation | no-overreach | ALTER self / CREATE ROLE / SET ROLE all DENIED |
| **data-plane CHECK probes** | §5.1 | invalid payload ref / wrong kind / overlength / status / class all rejected (CHECK, SQLSTATE 23514); no row persisted |
| **data-plane UNIQUE probe** | §5.1 | duplicate key rejected (UNIQUE, SQLSTATE 23505); pre-existing count unchanged |
| **data-plane rollback probe** | §5.1 | row visible in-transaction; ROLLBACK returns count to prior value; no partial row |
| **A.1–A.7** redacted artifact requirements | entire §5 / §5.1 block | redacted; grant set / cleanup model / no-overreach / search_path / data-plane probes recorded; labeled bounded/non-production; no overclaim; recorded for later acceptance review |

## 7. Non-goals

Production storage; the final Straylight store; production DB writes; production migration execution; route / API
behavior change; public response expansion; raw candidate payload persistence; route-contract freeze; final schema
freeze; ADR-022E gate #8 discharge; signer / consent / auth resolution; package export of the spike; dependency /
lockfile / config / CI change; **production-representative** least privilege (no production role / grant policy is
demonstrated, and no disposable evidence proves any production privilege boundary); full Phase 47J acceptance (a
later separate acceptance gate decides that, not this lane); clearing P.2 / P.3 (this lane records evidence only);
MVP-2 storage / audit closure.

## 8. Preserved blocked lanes

Production migration files; production DB writes; production durable-store implementation; production migration
execution; migration-runner (`migrate.ts`) / packager (`copy-migrations.mjs`) / startup (`server.ts`) / config
(`config.ts`) / scope-guard (`scope-guards.test.ts`) changes; **Lane-2 canonical** Straylight-store migrations;
route-contract freeze; final schema freeze; the operative Straylight-side ADR-022E gate #8 discharge; **Freeside
runtime** / client integration; production admission / signer / auth / consent; **production-representative least
privilege** — **all remain blocked**. The accepted Phase 47A `.json` Mode 2 path remains the live Option D /
fallback. The binding §16 P.2 / P.3 obligation **remains undischarged** and full Phase 47J acceptance **remains
withheld** until this evidence is **accepted by a later, separate acceptance gate**.

## 9. No adjacent repo involvement

No file in `loa-straylight` or `freeside-characters` (or any adjacent repo) is created or modified by Phase 47M.
No external memory, grimoire, or generated artifact is written. The disposable PostgreSQL engine is removed after
the run (auto-removed, no named volume); no Docker / PostgreSQL residue attributable to this phase remains.

## 10. Validation record

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47M adds this
runbook and a bounded additive Phase 47L forward-traceability note, and mutates **no** runtime source, test, validator,
vector, fixture, migration, or SQL file — so the validators are run only to confirm the unchanged artifacts remain
green.

```bash
git status --short --branch --untracked-files=all
git diff --name-status
git diff --check
git diff --cached --check
# Unchanged-artifact green-checks (no mutation in this phase):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# Docs-scope checks (no app/source/package/CI mutation):
git diff --name-only HEAD -- app package.json package-lock.json app/package.json app/package-lock.json .github
git ls-files --others --exclude-standard
# No-leak / redaction scan of THIS runbook (expect no real DSN/credential/host/port/engine/role-credential):
grep -nE 'postgres://[^<]|[0-9]{1,3}(\.[0-9]{1,3}){3}|:5[0-9]{4}/' docs/admission-wedge/PHASE-47M-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-SPIKE-RUNBOOK.md || true
```

**Recorded results for this lane** (run during authoring):

- **docs-only scope** — only this new runbook is added, plus a bounded additive Phase 47L forward-traceability note in the
  Phase 47L blocker gate; no runtime source, test, route-vector JSON, validator, README, fixture, fixture
  validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, SQL, executable schema, or
  generated file is touched.
- **live data-plane evidence produced disposably** — the §5 / §5.1 evidence was captured from a one-off operator
  run against a disposable, loopback-only, volume-less, auto-removed local PostgreSQL 16 engine, torn down after
  the run; the targeted runner / spike unit tests, `typecheck`, and `lint` were run to confirm the unchanged
  artifacts stay green.
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**;
  the `--self-check` harness reports the then-current expected count of cases behaving as required.
- **diff checks clean** — `git diff --check` and `git diff --cached --check` report no whitespace / conflict-marker
  errors; nothing is staged.
- **redaction scan** — every DSN / host / port / engine / role credential in this runbook is a redacted
  placeholder (`<redacted-*>`); no real credential, DSN, IP, or port appears.
- **engine residue** — the disposable engine is removed (auto-removed, no volume); no engine, volume, or open port
  attributable to this phase remains after the run.

**Forward-traceability status note added (§1 scope):**

- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-LEAST-PRIVILEGE-EVIDENCE-BLOCKER-GATE.md` — a bounded additive Phase 47M
  forward-traceability status note recording that the Phase 47L-authorized Phase 47M evidence lane has run: it produced the **non-production,
  disposable** least-privilege (P.2 / P.3) role / grant / `search_path` / no-overreach / cleanup-ownership evidence
  plus the live data-plane CHECK / UNIQUE / rollback probes inside the §14 envelope (no source / test / SQL change
  needed), and that **a later, separate acceptance gate** — not Phase 47M — decides whether the evidence clears the
  binding §16 gap and unblocks full Phase 47J acceptance, with MVP-2 closure, production work,
  **production-representative** least privilege, and the operative ADR-022E gate #8 discharge all still blocked.
