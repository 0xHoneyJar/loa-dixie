# Phase 47J — Admission Wedge dev/operator/test-only Lane-1 `aw_*` SQL EXECUTION-SINK spike: runbook

> **What this is.** Phase 47J is the **code-bearing execution-sink lane** conditionally authorized by the
> Phase 47I checklist gate
> ([`../ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](../ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md),
> Verdict A). It adds a **bounded, dev/operator/test-only, disabled-by-default, NON-PRODUCTION** execution
> sink to the existing Phase 47F isolation spike: experimental `aw_isolation_spike_*` SQL can be **executed**
> against a **strictly non-production target**, but **only** through the explicit dev/operator runner /
> injection seam, and **only** when the full Phase 47I §10 gate conjunction holds.
>
> **What it is NOT.** This is **not** production storage, **not** the final Straylight store, **not** a
> route-contract freeze, **not** a final schema freeze, and **not** an ADR-022E gate #8 discharge. It
> performs **no** production DB write, **no** production migration execution, and **no** startup wiring; it
> opens **no** connection from app startup or any route; it changes **no** production migration runner,
> packager, server boot, or config behavior; it adds **no** dependency, package script, or lockfile change;
> it expands **no** public response; it persists **no** raw candidate payload; and it integrates **no**
> Freeside runtime/client. Lane-2 canonical Straylight-store migrations and the operative Straylight-side
> ADR-022E gate #8 remain **blocked**. **Phase 47J does not claim that `aw_*` SQL is production-safe and does
> not claim this is production storage.**
>
> **Real-DB evidence (scope of this implementation).** The execution-sink seam, the strict target policy, the
> gate conjunction, the transaction / rollback / conflict semantics, and the startup / migrator / packaging /
> config isolation are all proven with an **injected fake / test sink** in the automated unit suite (no
> external database is contacted by the unit tests, so the suite stays dependency-free and needs no CI DB
> service). **In addition**, a **real-engine operator run was performed once against a disposable, loopback-only,
> volume-less, auto-removed Postgres 16 container** (`127.0.0.1`, dedicated throwaway DB name and password,
> destroyed after the run — see §8 for the exact redacted evidence): the forward `--apply` created the
> 3-table `aw_isolation_spike_*` family and its `CHECK` constraints, every runtime `CHECK` (invalid payload
> ref, wrong actor ref, wrong `awref` kind, over-`{0,59}`-length ref, out-of-range status / class) rejected the
> violating row, the `UNIQUE (tenant_ref, estate_ref, actor_ref, assertion_ref)` constraint rejected a duplicate
> and a mid-transaction conflict rolled the **whole** transaction back (no partial admit), idempotent forward
> replay re-ran clean, and the gated cleanup `--apply --direction=cleanup` dropped the family
> reversibly-by-recreation with no state left behind. The real DSN / password / host / port / DB name appeared
> in **no** runner output. This is a **bounded, one-off, non-production dev/operator proof only** — it is **not**
> a CI service, **not** added to the test suite, **not** a dependency or lockfile change, and proves **nothing**
> about production admission, production storage, or production-readiness. It does **not** discharge ADR-022E
> gate #8, authorize Lane-2 canonical Straylight-store migrations, freeze the route contract or the final
> schema, or claim `aw_*` SQL is production-safe; all of those remain **blocked**.
>
> **Phase 47K status note (forward traceability; added by the Phase 47K acceptance gate).** This Phase 47J spike was
> **partially accepted (PATCH / NOT FULLY ACCEPTED)** by
> [`../ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md`](../ADMISSION-WEDGE-LANE1-AW-SQL-EXECUTION-SINK-SPIKE-ACCEPTANCE-GATE.md):
> its bounded, **demonstrated** components — target-policy hardening, scheme allowlist, query-parameter refusal,
> fail-closed connect ordering, runner-only DB-touching, the redacted disposable real-engine `CHECK` / `UNIQUE` /
> transaction evidence, gated reversible cleanup, public no-leak parity, and exact file-envelope compliance with no
> production overclaim — are **accepted** as a disabled-by-default, dev/operator/test-only, NON-PRODUCTION, exact-scope,
> fail-closed execution-sink spike, but **full acceptance is WITHHELD** because the **binding Phase 47I §16 P.2 / P.3
> least-privilege execution-role / grant obligation was named but not demonstrated** (the §8 operator-run evidence
> identifies only a redacted connection user / password and disposable database target; it does **not** document a
> role, grants, privileges, or a least-privilege boundary) — a **blocking acceptance gap**, not an accepted-by-design
> characteristic. The §8
> live-engine operator run is accepted **only** as a bounded, redacted, local **disposable** operator proof — **not**
> CI, **not** production, **not** production-readiness, **not** a least-privilege / production-role proof, and **not**
> permission to connect production DBs; the absence of a standing / CI live-engine regression guard is a **non-defect
> future-hardening limitation**. Phase 47K selected **Phase 47L** — a **strictly docs/decision-only** Lane-1 `aw_*` SQL
> least-privilege (P.2 / P.3) evidence blocker decomposition / authorization gate, explicitly **not** the MVP-2 closure
> gate and **not** a docs/test-only or evidence-producing lane — as the next lane. Production DB execution, production
> migration execution, and the operative ADR-022E gate #8 discharge **remain blocked**.

---

## 1. Scope

Phase 47J is bounded to the exact Phase 47I §8 file envelope:

- **modified in place** — the planner module (`index.ts`, a pure execution-gate seam only), the explicit
  runner (`aw-sql-isolation-spike-runner.mjs`, where the real sink / DB client / target policy live), and the
  three existing spike test files (extended, no regression);
- **new** — one focused execution-sink test file and this runbook.

No production migration runner, packager, server boot, config, package, lockfile, CI, route, store, fixture,
route-vector, scope-guard, or `.sql` file is touched. The experimental DDL stays exactly the 3-table
`aw_isolation_spike_*` family already shipped by Phase 47F.

## 2. Posture (disabled by default; dev/operator/test-only; NON-PRODUCTION)

| Property | Value |
|----------|-------|
| Default | **off** — no execution unless every gate is explicitly set |
| Mode | dev/operator/test-only; `NODE_ENV=production` is **refused** |
| Target | **strictly non-production only**; the production `DATABASE_URL` is **always refused** |
| Reachability | the **explicit runner** is the only caller — never startup, route, migrator, or a package script |
| Default action | a **dry-run plan** (opens no connection, applies nothing) — `--apply` is required to execute |
| Secrets | the target DSN / credentials are **never logged**; refusals carry stable, non-secret reason codes |

## 3. Gates (Phase 47I §10 — all required; any one absent fails closed)

Execution (`--apply`) is **impossible** unless **every** gate below holds. Any missing gate ⇒ refuse, fail
closed, exit non-zero, open **no** connection, apply **nothing** — never a silent no-op, never a default
target, never a partial apply.

| Gate | Requirement |
|------|-------------|
| `--apply` | execution explicitly requested |
| base opt-in | `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true` |
| non-production | `NODE_ENV` is not `production` |
| execution opt-in | `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED=true` (DISTINCT from the base opt-in) |
| target accepted | a non-production DSN accepted by the §11 target policy (below) |
| production DSN refused | the target must not equal, or look like, the production `DATABASE_URL` |
| explicit invocation | run out-of-band via the runner only — never startup / route / package script |
| exact manifest | the strict manifest schema + literals verified (a plan was built) |
| path containment | lexical + symlink + realpath containment verified |
| no unlisted SQL | on-disk reconciliation passed (no unlisted / no missing `.sql`) |
| cleanup opt-in | `--direction=cleanup` also requires `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_CLEANUP_ENABLED=true` |

> **Draft env labels.** The three `…_APPLY_*` / `…_TARGET_DSN` env names are **draft, non-final labels read
> ONLY inside the runner**. They are **not** added to or parsed by `app/src/config.ts`, **not** wired into any
> package lifecycle script, and **not** a config behavior change.

## 4. Database target policy (Phase 47I §11 — pure; no connection opened)

The target is assessed **structurally** (scheme + host + database name + query-parameter **key names** only —
the credential portion of the DSN and every query **value** are **never** inspected, so a secret, a redirected
hostname, or a file path can neither leak nor trip a rule). The policy validates the **same effective target
`pg` will use**. A target is **accepted only when**: a DSN is present and non-empty; it is not equal to the
production `DATABASE_URL`; it parses; **its scheme is exactly `postgres:` or `postgresql:`** (any other scheme —
`http:` / `ftp:` / `file:` / … — is refused before the host is trusted); **it carries no query parameters at
all**; it carries **no** production-like token (e.g. `prod` / `production` / `live` / managed-cloud markers);
its host is loopback **or** carries a disposable marker; and its database name carries a disposable marker (e.g.
`dev` / `test` / `spike` / `ephemeral` / `throwaway` / `sandbox` / `scratch`).

> **Why all query parameters are refused (bypass hardening).** `new URL()` reports the literal `url.hostname`,
> but `pg` / `pg-connection-string` resolve query keys such as `?host=` / `?hostaddr=` / `?port=` to a
> **different effective network target** — so an apparent loopback DSN like
> `postgres://…@localhost/spike_dev?host=remote.example` would otherwise pass a host-only check while `pg`
> connects to `remote.example`. A `?ssl*=` key (`sslcert` / `sslkey` / `sslrootcert` / `sslcrl` / `sslmode` / …)
> can alter file-loading / TLS behavior. Because an unknown libpq/pg query key could redirect the target in
> ways a pure policy cannot anticipate, the policy refuses **every** query parameter wholesale; with no query
> string present, `url.hostname` **is** the host `pg` connects to, so the host / DB-name disposable checks are
> sound. Only query **key names** are classified — never their (possibly secret) values.

Refusal reason codes (non-secret; the DSN / host / redirected hostname / file path / secret never appears —
only these fixed code constants):

`TARGET_MISSING`, `TARGET_EMPTY`, `TARGET_EQUALS_PRODUCTION_DSN`, `TARGET_MALFORMED`,
`TARGET_UNSUPPORTED_PROTOCOL`, `TARGET_HOST_OVERRIDE_UNSUPPORTED` (a `host` / `hostaddr` / `port` query
override), `TARGET_TLS_FILE_PARAMETER_UNSUPPORTED` (an `ssl*` file/TLS query param),
`TARGET_QUERY_PARAMETER_UNSUPPORTED` (any other query param), `TARGET_NOT_LOCAL_OR_DEV`,
`TARGET_NO_DISPOSABLE_MARKER`, `TARGET_PRODUCTION_TOKEN`.

## 5. Use (explicit dev/operator invocation only — NOT a package script)

> Placeholders only. Replace `<...>` with a **disposable, non-production** value; never paste a real
> production DSN, credential, token, tenant id, actor id, or internal hostname.

```bash
cd app

# Dry-run FORWARD plan (default). Opens no connection, applies nothing.
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true NODE_ENV=development \
  npx tsx scripts/aw-sql-isolation-spike-runner.mjs

# Dry-run CLEANUP plan (the reversible drop path).
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true NODE_ENV=development \
  npx tsx scripts/aw-sql-isolation-spike-runner.mjs --direction=cleanup

# EXECUTION-SINK proof (forward) against a DISPOSABLE non-production target.
# All gates must be present; the target DSN is a placeholder for a throwaway dev DB.
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true \
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED=true \
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_TARGET_DSN='postgres://<dev-user>:<dev-pass>@localhost:5432/<disposable_spike_dev_db>' \
NODE_ENV=development \
  npx tsx scripts/aw-sql-isolation-spike-runner.mjs --apply

# EXECUTION-SINK CLEANUP (drop) against the same disposable target — needs the cleanup opt-in too.
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true \
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED=true \
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_CLEANUP_ENABLED=true \
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_TARGET_DSN='postgres://<dev-user>:<dev-pass>@localhost:5432/<disposable_spike_dev_db>' \
NODE_ENV=development \
  npx tsx scripts/aw-sql-isolation-spike-runner.mjs --apply --direction=cleanup
```

## 6. Refusal cases

| Situation | Result |
|-----------|--------|
| env var unset / not exactly `true` | disabled-by-default refusal, exit 1, no connection |
| `NODE_ENV=production` | production-refused, exit 1, no connection |
| `--apply` without the execution opt-in | `EXECUTION_OPT_IN_MISSING`, exit 1, no connection |
| `--apply` with no target DSN | `NON_PRODUCTION_TARGET_NOT_ACCEPTED`, exit 1, no connection |
| target DSN equals the production `DATABASE_URL` | refused (`TARGET_EQUALS_PRODUCTION_DSN`), exit 1 |
| production-like / unsafe remote DSN | refused (`TARGET_PRODUCTION_TOKEN` / `TARGET_NOT_LOCAL_OR_DEV` / `TARGET_NO_DISPOSABLE_MARKER`) |
| non-Postgres scheme (`http:` / `ftp:` / `file:` …), even on loopback | refused (`TARGET_UNSUPPORTED_PROTOCOL`), exit 1, no connection |
| loopback-looking DSN with a `?host=` / `?hostaddr=` / `?port=` override | refused (`TARGET_HOST_OVERRIDE_UNSUPPORTED`), exit 1, no connection |
| DSN with an `?ssl*=` file/TLS query param | refused (`TARGET_TLS_FILE_PARAMETER_UNSUPPORTED`), exit 1, no connection |
| DSN with any other query parameter | refused (`TARGET_QUERY_PARAMETER_UNSUPPORTED`), exit 1, no connection |
| unlisted `.sql` present in `sql/` | reconciliation fails closed, exit 1, no connection |
| symlinked / out-of-folder `.sql` | path-containment refusal, exit 1, no connection |
| `--apply --direction=cleanup` without the cleanup opt-in | `CLEANUP_OPT_IN_MISSING`, exit 1, no connection |

Every refusal is evaluated **before** a connection is opened.

## 7. Secret / DSN logging

The runner **never** logs the target DSN, any credential, password, token, or an environment dump. The target
policy and gate conjunction emit **stable, non-secret reason codes only**. The "applied N statements" success
line carries the count and direction only — never the target name, host, or DSN.

## 8. Evidence capture

- **Unit suite (fake/test sink — no external DB):** `app/tests/unit/admission-wedge-spike/aw-sql-execution-sink-spike.test.ts`
  plus the extended Phase 47F suites. Run:

  ```bash
  cd app
  npm test -- --run \
    tests/unit/admission-wedge-spike/aw-sql-isolation-spike.test.ts \
    tests/unit/admission-wedge-spike/aw-sql-isolation-runner-isolation.test.ts \
    tests/unit/admission-wedge-spike/aw-sql-isolation-scope-guard.test.ts \
    tests/unit/admission-wedge-spike/aw-sql-execution-sink-spike.test.ts
  npm run typecheck
  npm run lint
  ```

- **Operator-run live-engine step (performed once; out of scope for CI):** a **disposable, loopback-only,
  volume-less, auto-removed** Postgres 16 container was stood up (`docker run -d --rm` bound to `127.0.0.1`
  with a dedicated throwaway DB name and password, no named volume, removed with `docker rm -f` after the run),
  `…_APPLY_TARGET_DSN` was pointed at it (a loopback DSN with no query string, accepted by the §4 policy), and
  the runner was driven end-to-end. The exact commands stand the disposable container up, run the gated
  forward / cleanup `--apply`, drive `psql` to exercise the `CHECK` / `UNIQUE` / transaction paths, then tear
  the container down. **This is a bounded one-off dev/operator proof, not a CI service**, and **no dependency,
  lockfile, package script, or config is changed** by it.

  **Redacted real-engine evidence (DSN / password / host / port / DB name redacted; reproduced from the
  operator run):**

  ```text
  engine:        PostgreSQL 16.14 (disposable docker container, 127.0.0.1, --rm, no volume, torn down after)
  target DSN:    postgres://<redacted-user>:<redacted-pass>@<redacted-loopback>:<redacted-port>/<redacted-disposable-db>
                 (loopback host, disposable DB-name marker, NO query string -> accepted by the §4 policy)

  forward --apply  -> "aw_* SQL execution-sink proof — APPLIED (forward) / statements applied: 1 /
                       committed in a single transaction against a NON-PRODUCTION target." (exit 0)
                   -> 3 tables present: aw_isolation_spike_assertion, _supersession_link, _tombstone
                   -> 17 CHECK constraints present (assertion/supersession/tombstone ref + status + class)

  runtime CHECK enforcement (the live ENGINE rejects, not just the in-memory mirror):
    R.1 invalid raw payload ref      -> ERROR: new row ... violates check constraint "..._candidate_payload_ref_chk"
    R.2 wrong actor ref kind         -> ERROR: new row ... violates check constraint "..._actor_ref_chk"
    R.3 over-{0,59}-length ref (61-char body, total 77 <= VARCHAR(80)) -> rejected by the CHECK regex, NOT by length
    R.4 wrong awref kind (assertion) -> ERROR: new row ... violates check constraint "..._assertion_ref_chk"
    R.6 out-of-range status / class  -> ERROR: new row ... violates check constraint "..._status_chk" / "..._class_chk"

  conflict + transaction (no partial admit):
    R.5 duplicate (tenant,estate,actor,assertion) -> ERROR: duplicate key violates unique constraint
                                                      "aw_isolation_spike_assertion_uniq"
    mid-transaction conflict in an explicit BEGIN ... COMMIT -> ROLLBACK; row count UNCHANGED; the would-be
                                                                partial-admit row did NOT survive
    explicit BEGIN/COMMIT persists; explicit BEGIN/ROLLBACK discards

  idempotency + cleanup:
    R.13 re-run forward --apply              -> APPLIED, clean (CREATE TABLE IF NOT EXISTS), 3 tables still present
    C.3 cleanup --apply WITHOUT cleanup opt-in -> refused "CLEANUP_OPT_IN_MISSING" (exit 1); 3 tables UNTOUCHED
    C.1/C.2 cleanup --apply WITH the cleanup opt-in -> APPLIED (cleanup); 0 tables (DROP ... IF EXISTS, reverse order)
    C.4 forward --apply again                -> re-creates the 3-table family (reversible-by-recreation)
    final cleanup                            -> 0 tables; container removed; no volume, no state left behind

  secret hygiene: the runner's stdout/stderr on the success path contained NO DSN, password, host, port,
                  or DB name (grep for the throwaway password / "postgres://" / host / port / DB name -> CLEAN).
  ```

  This evidence satisfies the §15 real-engine `CHECK` checklist (R.1–R.6), the §13 transaction / idempotency /
  conflict checklist (T.1, T.4, T.5), and the §14 cleanup / down checklist (C.1–C.5) against a **live**
  Postgres engine — going beyond the fake-sink unit suite. It remains a **bounded, non-production** proof and
  is **not** added to CI; reproducing it requires an operator to stand up their own disposable Postgres.

## 9. Rollback / cleanup / down behavior

- **Partial-failure fail-closed.** A fault mid-apply triggers `ROLLBACK` and a wrapped fail-closed error; no
  `COMMIT` is issued, so no half-applied footprint survives (proven deterministically with a fake sink).
- **Cleanup / down is gated.** The `_down.sql` drop path runs only via `--apply --direction=cleanup` under the
  **distinct** cleanup opt-in plus the full gate conjunction; absent any gate it refuses and exits non-zero.
- **Bounded to the experimental family.** The drop targets exactly the three `aw_isolation_spike_*` tables
  with `DROP TABLE IF EXISTS`, leaving no production state behind; the forward `CREATE TABLE IF NOT EXISTS`
  re-creates the family, so the path is reversible-by-recreation.
- **Reversible runner.** The spike persists nothing of its own at dry-run; a re-run re-derives the same plan
  from the same manifest + `.sql` files.

## 10. Non-goals

Production storage; the final Straylight store; production DB writes; production migration execution; route /
API behavior change; public response expansion; raw candidate payload persistence; route-contract freeze;
final schema freeze; ADR-022E gate #8 discharge; signer / consent / auth resolution; package export of the
spike; dependency / lockfile / config / CI change.

## 11. Preserved blocked lanes

Production migration files; production DB writes; production durable-store implementation; production
migration execution; migration-runner (`migrate.ts`) / packager (`copy-migrations.mjs`) / startup
(`server.ts`) / config (`config.ts`) / scope-guard (`scope-guards.test.ts`) changes; Lane-2 canonical
Straylight-store migrations; route-contract freeze; final schema freeze; the operative Straylight-side
ADR-022E gate #8 discharge; Freeside runtime/client integration; production admission / signer / auth /
consent — **all remain blocked**. If the execution sink could not be bounded safely without weakening the
production posture, the fallback is the Phase 47A `.json` Mode 2 store (Option C); the bounded, location- and
gate-isolated execution sink was achievable here with no production-path change, so the spike stands as
conditionally authorized.

## 12. No adjacent repo involvement

Phase 47J touches **no** adjacent repository — no `loa-straylight`, `freeside-characters`, or any sibling
repo file is created or modified. The canonical Straylight `StorageAdapter` / `Assertion` /
`TransitionReceipt` / `AuditEvent` shapes stay Straylight-owned (cross-repo references only).
