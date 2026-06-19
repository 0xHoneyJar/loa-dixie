# Phase 47F — Admission Wedge dev/operator-only Lane-1 `aw_*` SQL ISOLATION implementation spike: runbook

> **What this is.** Phase 47F is the **first code-bearing lane** after the Phase 47E checklist
> ([`../ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md`](../ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md),
> Verdict A). It implements the **bounded, dev/operator-only, disabled-by-default, NON-PRODUCTION,
> route-owned, isolated** experimental `aw_*` SQL spike that the Phase 47D §18 layered direction selected
> on paper and the Phase 47E §8–§18 checklist authorized — **acceptance-gated** on that checklist.
>
> **What it is NOT.** This is **not** production storage, **not** the final Straylight store, **not** a
> route-contract freeze, **not** a final schema freeze, and **not** an ADR-022E gate #8 discharge. It
> performs **no** production DB write, opens **no** database connection at startup or via any route,
> executes **no** production migration, changes **no** production migration runner or packager, weakens
> **no** scope guard, expands **no** public response, persists **no** raw candidate payload, and integrates
> **no** Freeside runtime/client. Lane-2 canonical Straylight-store migrations and the operative
> Straylight-side ADR-022E gate #8 remain **blocked**. **Phase 47F does not claim that `aw_*` SQL is
> production-safe and does not claim this is production storage.**

---

## 1. Mechanism — isolation by LOCATION (lowest blast radius)

The Phase 47D §5 isolation problem is that the production forward-only runner
(`app/src/db/migrate.ts`) scans a single directory and adopts every `*.sql` (not `_down`) in it, and the
production build packager (`app/scripts/copy-migrations.mjs`) copies every `*.sql` from that one source
directory. A misplaced `aw_*.sql` in `src/db/migrations/` would be auto-adopted into the production set.

Phase 47F resolves this **by location, not by changing the production path** — the strongest possible
outcome (the same posture Phase 47A used for the `.json` store):

- **Isolated experimental SQL location.** The experimental DDL lives at
  `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/sql/` — under the Admission Wedge spike
  service tree, **outside** the single production migration directory the runner scans and **outside** the
  single source directory the packager copies. The runner's `readdir(MIGRATIONS_DIR)` is non-recursive and
  cannot descend into a service subfolder; the packager only scans `src/db/migrations`. So the production
  runner can neither **discover** nor **execute** it, and the packager can neither **bundle** it —
  **without any change to `migrate.ts` or `copy-migrations.mjs`**.
- **Exact manifest + strict schema.** `aw-sql-isolation-spike/manifest.json` is an exact allowlist of the
  experimental `.sql` files (`forward` + `cleanup` lists). The schema is **strict**: only the exact
  top-level keys are accepted (any unknown key **fails closed**), `spike` / `kind` / `production` /
  `schemaFinal` are matched as **exact literals with no coercion**, entries must be unique and the two lists
  disjoint, a `_down.sql` may **never** appear in `forward`, and every `cleanup` entry **must** be a
  `_down.sql`. The runner then **reconciles the on-disk `.sql` set against the manifest**: any **unlisted**
  `.sql` present in `sql/` **fails closed** (there is **no** "adopt every `.sql` in the folder" fallback),
  and any **listed** file that is absent **fails closed**. An unlisted, missing, absolute, traversal,
  out-of-folder, symlinked, or production-located entry **fails closed**. The manifest protects **only** the
  experimental runner path — normal-runner protection comes from **location isolation**, never from the
  manifest (the Phase 47E §7 / B.6 Candidate C limitation, carried forward).
- **Symlink + realpath containment.** Before reading any file the planner `lstat`s it and **rejects a
  symlink** (so a `sql/*.sql` symlink can never point at a production migration file or anywhere outside the
  isolated folder), rejects a non-regular file, and verifies the **realpath** of the spike root, the `sql/`
  folder, the manifest, and each `.sql` file stays strictly inside the isolated folder using
  `path.relative` (never a string-prefix-only check). The file is re-verified immediately before it is read,
  so a swap between validation and read still fails closed.
- **Token-clean planner.** `aw-sql-isolation-spike/index.ts` resolves the manifest, validates path
  containment, reads the experimental statement text from the `.sql` files at runtime, and builds a
  **dry-run plan**. It names no client, opens no connection, and embeds **no** SQL/DDL text of its own — so
  it passes the canonical Phase 33N 19-entry scope-guard denylist **unchanged, with no allowlist** (the SQL
  text lives only in `.sql` files, which the guard does not scan). It also exposes a **pure, in-memory
  synthetic-write reducer** (`createSyntheticWriteReducer`) that models planned-write identity + a content
  fingerprint to define the dev-only replay / conflict semantics — it touches no client, persists nothing
  durably, and is wired to no route or startup path.
- **Explicit dev/operator runner.** `app/scripts/aw-sql-isolation-spike-runner.mjs` is the **only** caller.
  It is disabled by default, fails closed unless its dedicated env gate is exactly `true` **and** the
  environment is not production, **never** runs on app startup, **never** runs through the production
  runner, and is **not** wired into any `package.json` lifecycle script. Its default behavior is a
  **dry-run plan** that opens nothing; `--apply` is **refused** (no client is injected in this spike).

**Source / wiring:**

- `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/sql/0001_aw_isolation_spike_init.sql` —
  experimental forward DDL (synthetic `aw_isolation_spike_*` family; references only, no raw payload).
- `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/sql/0001_aw_isolation_spike_init_down.sql` —
  the reversible cleanup / drop path.
- `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/manifest.json` — exact allowlist.
- `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts` — planner / guard / apply.
- `app/scripts/aw-sql-isolation-spike-runner.mjs` — the explicit dev/operator runner.

> **No production-path change.** `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`,
> `app/src/server.ts`, `app/src/config.ts`, and `app/tests/unit/admission-wedge-spike/scope-guards.test.ts`
> are **unchanged** by Phase 47F. Isolation is proven by construction + tests, not by editing the
> production runner / packager / startup / guard.

---

## 2. Gate (disabled by default; dev/operator-only; non-production)

| Gate | Env var | Default | Rule |
|------|---------|---------|------|
| dev/operator opt-in | `DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED` | off | strict `=== 'true'`; any other value fails closed |
| non-production | `NODE_ENV` | — | `NODE_ENV=production` is **refused** even when the opt-in is `true` |

The gate is enforced at the top of the runner (`assertDevOperatorGateOpen`) before any plan is built. There
is **no production default** under which the experimental path engages — neither config, env, nor startup.

---

## 3. Use (explicit dev/operator invocation only — NOT a package script)

```bash
cd app

# Dry-run FORWARD plan (default). Opens no connection, applies nothing.
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true NODE_ENV=development \
  npx tsx scripts/aw-sql-isolation-spike-runner.mjs

# Dry-run CLEANUP plan (the reversible drop path).
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true NODE_ENV=development \
  npx tsx scripts/aw-sql-isolation-spike-runner.mjs --direction=cleanup

# Execution is REFUSED in this spike (no client is injected — fail closed):
DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true NODE_ENV=development \
  npx tsx scripts/aw-sql-isolation-spike-runner.mjs --apply   # -> error, exit 1
```

**Disabled by default:** with the env var unset (or any value other than `true`), the runner exits 1 with a
disabled message. With `NODE_ENV=production`, the runner exits 1 with a production-refused message.

---

## 4. Storage semantics (synthetic-only; no raw payload; no final schema freeze)

The experimental `aw_isolation_spike_*` family is the Phase 46S **draft** shape (`schemaFinal` stays
**false** — the manifest refuses a `schemaFinal: true`), realized as an obviously-experimental dev/operator
family:

- **Bounded opaque references only (enforced in the schema, not in comments).** Every reference column is a
  `VARCHAR(80)` carrying a `CHECK` constraint that pins a narrow `awref:<kind>:<short-id>` prefix +
  character set + length bound. So `candidate_payload_ref`, `public_receipt_ref`, `tenant_ref`,
  `estate_ref`, `actor_ref`, and the assertion references are **short bounded opaque strings by schema
  design** — a raw JSON blob, long source text, or free-form reason **cannot** be stored. `candidate_payload_ref`
  is a short reference, never the payload; `public_receipt_ref` is a public-safe short reference or NULL.
  There is no raw payload, source material, raw reasons, private audit internals, or public-response-expanding
  column.
- **Canonical status.** `assertion_status` is constrained to `active` / `superseded` (the canonical
  Straylight-owned lifecycle; Dixie stores only route-owned references, never a parallel lifecycle).
- **Tenant / estate / actor isolation on every scoped table.** Every scoped artifact row — the assertion
  table, the supersession-link table, **and** the tombstone table — carries `tenant_ref` / `estate_ref` /
  `actor_ref`, each bounded by its own `awref:` `CHECK`. The assertion table is unique per
  `(tenant, estate, actor, assertion)` and the supersession link per
  `(tenant, estate, actor, superseded_assertion)`.
- **Supersession / correction.** A Dixie-local **inverse link** (`aw_isolation_spike_supersession_link`),
  never a rewrite of the canonical append-only chain.
- **Cleanup / tombstone / drop.** The paired `_down.sql` drops the entire experimental family; an
  `aw_isolation_spike_tombstone` table records dev cleanup intent. The forward-only production runner never
  auto-runs a `_down` file — any drop is an explicit dev/operator action.

**Dev-only replay / conflict semantics.** The pure in-memory `createSyntheticWriteReducer` models a synthetic
admitted-assertion write whose **identity** is the `(tenant, estate, actor, assertion)` tuple (the same
columns the unique constraint pins) and whose **fingerprint** covers identity + all bounded-ref material:

- a **first** write `plan`s as `planned` and `record`s as `applied` (into the fake in-memory sink only);
- an **identical** replay returns an explicit `identical_replay` no-op — **not** a generic duplicate failure;
- a **conflicting** replay (same identity, different material) **fails closed**: `record` throws and records
  **nothing**, so no partially-admitted recallable assertion survives;
- `recordBatch` is **atomic** — a conflict mid-batch rolls back every write the batch recorded and rethrows;
- every reference is validated against the **same bounded `awref:` shape** the DDL `CHECK` enforces, so raw
  material can never enter the model.

The planner's apply path (`applyIsolationSpikePlan`) is **all-or-nothing through an injected sink**:
`begin → applyStatement* → commit`, with any failure triggering `rollback` and a wrapped fail-closed error.
Both the reducer and the apply path are exercised only against **fake / in-memory** sinks in tests — never a
production database.

---

## 5. Rollback / recovery / cleanup

- **Partial-failure fail-closed.** A fault mid-apply rolls back and throws; no half-applied, partially
  admitted recallable footprint survives (proven deterministically with a fake sink).
- **Replay is idempotent; conflict fails closed.** An identical synthetic replay is an explicit no-op
  (`identical_replay`); a conflicting replay (same identity, different material) throws and records nothing;
  a batch with a mid-batch conflict rolls back fully (proven with the in-memory reducer — no real DB).
- **Reversible cleanup.** Run the runner with `--direction=cleanup` to obtain the drop plan; the `_down`
  file drops the whole experimental family, leaving no production state behind.
- **Recovery is deterministic.** The spike persists nothing at runtime by itself (dry-run plan only); a
  re-run re-derives the same plan from the same manifest + `.sql` files.

---

## 6. Auth / consent / signer — explicit NON-coverage (Section J / §17)

Phase 47F SQL isolation is **orthogonal to** and **does not solve** the production trust boundaries:

- **Production auth.** The dev/operator opt-in env gate (and the route's dev `x-admission-service-token` /
  `x-admission-operator-id` allowlist) is **not** production authentication.
- **End-user authorization.** There is no end-user authorization model in a dev/operator-only spike.
- **Signer authority.** The canonical signer / receipt-signing authority is Straylight-owned and
  undischarged.
- **Consent proof / receipt.** Consent proof / receipt remains future-gated (the Phase 46S
  `aw_consent_proof_ref` is **deferred**); service/operator auth is never treated as consent.

Each remains its **own separately-gated future blocker**; this spike neither implements nor unblocks any of
them.

---

## 7. Public / private no-leak (Section I / §16)

The public response shape is **unchanged** — the isolation spike adds **no** public-response builder and no
public surface. The runtime no-leak guard (`no-leak.ts`) is **untouched**, so the 114-key parity is
preserved. The manifest and experimental SQL are **private** dev/operator artifacts carrying only synthetic
labels / references; no SQL, path, debug, stack, or internal storage detail leaks to any public response.

---

## 8. Tests

- `app/tests/unit/admission-wedge-spike/aw-sql-isolation-spike.test.ts` — dev/operator gate (default off,
  strict `=== 'true'`, production refused); strict manifest schema (exact keys, no coercion on
  `spike`/`kind`/`production`/`schemaFinal`, no duplicates, disjoint lists, `_down` role consistency);
  **fail-closed reconciliation** (an unlisted `.sql` in `sql/` is refused, a missing listed file is
  refused); path traversal / absolute / outside-folder / nested-subfolder fail closed; **symlink +
  realpath containment** (an escaping symlink, a symlink at a production migration file, a symlinked `sql/`
  dir, and a symlinked manifest all fail closed); storage semantics (**bounded `awref:` opaque refs with
  DDL `CHECK`, no raw payload, `actor_ref` on every scoped table**, canonical status, supersession inverse
  link, cleanup/drop); **dev-only replay/conflict reducer** (first→`applied`, identical→`identical_replay`,
  conflict→fail-closed with no footprint, atomic batch rollback); all-or-nothing apply + deterministic
  partial-failure rollback; public no-leak parity.
- `app/tests/unit/admission-wedge-spike/aw-sql-isolation-runner-isolation.test.ts` — experimental SQL is
  outside `src/db/migrations`; the production runner is unchanged and existing migrations stay valid; the
  packager cannot bundle the experimental SQL; `server.ts` startup / route gates run no experimental SQL
  and never import the runner; only the explicit runner can; no package-lifecycle invocation.
- `app/tests/unit/admission-wedge-spike/aw-sql-isolation-scope-guard.test.ts` — the new module passes the
  canonical 19-entry denylist with zero hits (no allowlist added); adjacent forbidden paths still fail
  closed against the same evasion-resistance bar.
- `app/tests/unit/admission-wedge-spike/scope-guards.test.ts` (existing, unchanged) — still passes with the
  new module present in the scanned spike tree.

---

## 9. Preserved blocked lanes

Production migration files; production DB writes; production durable-store implementation; production
migration execution; route-contract freeze; final schema freeze; ADR-022E gate #8 discharge; Freeside
runtime/client integration; Lane-2 canonical Straylight-store migrations; public response expansion; raw
candidate payload persistence; production admission / signer / auth / consent — **all remain blocked**.
Phase 47F is a bounded dev/operator-only isolated spike and changes none of them. If the spike could not be
isolated safely without weakening the production posture, the fallback is to remain the Phase 47A `.json`
path — but isolation was achievable here by location with no production-path change, so the spike stands as
authorized.
