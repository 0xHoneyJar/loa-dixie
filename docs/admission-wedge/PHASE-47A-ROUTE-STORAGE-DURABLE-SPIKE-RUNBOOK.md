# Phase 47A — Admission Wedge dev/operator-only DURABLE (Mode 2) route-storage spike: enable/disable runbook

> **What this is.** Phase 47A is the **Mode 2 implementation spike** authorized (acceptance-gated) by Phase 46Z
> ([`../ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](../ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md)).
> It adds a **dev/operator-only, disabled-by-default, NON-PRODUCTION, synthetic-only, route-owned DURABLE store**
> that persists Admission Wedge route-owned state across a process restart — **without** allowing any
> experimental storage/migration material to be adopted by the normal production migration runner.
>
> **What it is NOT.** This is **not** production storage, **not** the final Straylight storage, **not** a
> route-contract freeze, **not** a final schema freeze, and **not** an ADR-022E gate #8 discharge. It performs
> **no** production DB write, opens **no** database connection, adds **no** SQL / `aw_*` migration, executes
> **no** migration, changes **no** migration runner or packager, weakens **no** scope guard, expands **no**
> public response, persists **no** raw candidate payload, and integrates **no** Freeside runtime/client. Lane-2
> canonical Straylight-store migrations and the operative Straylight-side ADR-022E gate #8 remain **blocked**.

---

## 1. Mechanism (lowest-blast-radius Mode 2)

Mode 1 (Phase 46V) declined durability because the only durable substrate it considered was Lane-1 `aw_*` SQL in
the **shared** `app/src/db/migrations/` directory — which the whole-directory migration runner
(`app/src/db/migrate.ts` `discoverMigrations`) and the `.sql`-only build packager
(`app/scripts/copy-migrations.mjs`) would auto-adopt into the **production** migration set, and which the Phase
33N scope guards forbid by token.

Phase 47A delivers Mode 2's **defining property — durability across a restart — as a JSON-snapshot FILE store,
not SQL**:

- **No SQL, no `aw_*` schema.** There is nothing for the production migration runner to discover or execute
  (checklist A.1 / A.2 hold by construction — no material exists to adopt).
- **`.json` only.** The store persists a single `.json` snapshot. The production runner adopts only
  `f.endsWith('.sql') && !f.includes('_down')` and the packager copies only `.sql`; a `.json` artifact can
  **never** join the production migration set even if it were co-located (A.4). The `.json` extension is
  enforced in code — a non-`.json` snapshot file name **fails closed** at construction.
- **Explicit operator directory.** The snapshot lives in an explicit operator-provided directory; there is **no
  default location**, so durable state is never written without a deliberate operator choice (A.3 / A.5 / A.6).
- **No guard / runner / packager change.** The store uses only `node:fs` and needs **none** of the forbidden
  DB/SQL/migration tokens — so the Phase 33N scope guards pass it **unchanged** (B.1: nothing weakened, no
  allowlist added).

The durable store **wraps** the proven Phase 46V Mode-1 engine (`createRouteStorageSpikeStore`), inheriting
tenant/estate/actor isolation, idempotent replay, conflict fail-closed, supersession, capacity bounds,
synthetic-only label validation (no raw payload), and the actor-id snapshot / TOCTOU discipline — and layers a
thin durable persist/hydrate log on top. It implements the **same** `RouteStorageSpikeStore` interface, so the
route handler is **unchanged**.

**Source / wiring:**

- `app/src/services/admission-wedge-spike/route-storage-durable-spike.ts` — the durable store
  (`createRouteStorageDurableSpikeStore`).
- `app/src/services/admission-wedge-spike/index.ts` — internal service-barrel re-export (no package export).
- `app/src/config.ts` — two new disabled-by-default config fields (below).
- `app/src/server.ts` — selects the durable store only behind the three-gate AND + dir (below).

---

## 2. Gates (three-gate AND + an explicit dir)

The durable store engages **only** when **all** of the following hold:

| # | Gate | Env var | Config field | Default |
|---|------|---------|--------------|---------|
| 1 | base route gate | `DIXIE_ADMISSION_INTAKE_ENABLED=true` | `admissionIntakeSpikeEnabled` | off |
| 2 | Mode-1 storage gate | `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED=true` | `admissionIntakeStorageSpikeEnabled` | off |
| 3 | durable (Mode 2) gate | `DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_ENABLED=true` | `admissionIntakeDurableStorageSpikeEnabled` | off |
| 4 | durable dir | `DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_DIR=<dir>` (non-empty) | `admissionIntakeDurableStorageSpikeDir` | '' |

Gate 3 is **nested under** gates 1 and 2 in `server.ts`: the durable branch is reached only inside
`if (config.admissionIntakeSpikeEnabled)` → `if (config.admissionIntakeStorageSpikeEnabled)`, and selects the
durable store only when gate 3 is true **and** the dir is non-empty. Any missing leg leaves the spike on the
Phase 46V **Mode-1 (non-durable, in-process)** path — or, if gate 2 is off, the **no-store** path. With gate 3
on but the dir empty, the spike **fails closed to Mode 1** (durable state is never written without an operator
dir). Every env read is strict `=== 'true'`, so any other value is off.

> **Auth note (unchanged from Phase 33N / 46V).** The route still sits behind the dev/operator gate
> (`x-admission-service-token` + `x-admission-operator-id` allowlist), which fails closed when both are empty.
> This is **not** production auth and **not** consent.

---

## 3. Enable (dev/operator only)

```bash
# All four are required. The dir must be a writable dev/operator path — NOT the
# production migrations directory and NOT the build output.
export DIXIE_ADMISSION_INTAKE_ENABLED=true
export DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN=<dev-operator-token>
export DIXIE_ADMISSION_INTAKE_OPERATOR_IDS=<op-id>[,<op-id>...]
export DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED=true
export DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_ENABLED=true
export DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_DIR=/path/to/dev/aw-durable   # explicit, writable
```

On startup the server logs `admission_intake_route_storage_spike_active` with a note naming **Mode 2, DURABLE
json-snapshot**. The store seeds the fixed synthetic `(tenant-synthetic-dev, estate-synthetic-dev,
actor-synthetic-dev)` slot (idempotent against an already-hydrated snapshot) and writes the snapshot
`admission-wedge-route-storage-durable-spike.json` in the configured dir.

**Disable:** unset (or set to anything other than `true`) any of gates 1–3, or leave the dir empty. The store
reverts to Mode 1 / no-store immediately on the next start. The on-disk snapshot is inert when not loaded.

---

## 4. Durability semantics

- **Survives restart.** A fresh store over the same dir **hydrates** by replaying the snapshot's ordered entries
  through a fresh Mode-1 engine — reconstructing the exact prior synthetic state (the inverse of Mode 1's "a
  second instance shares no state").
- **Idempotent / conflict / capacity.** An idempotent replay mints nothing and is **not** persisted again; a
  conflicting write fails closed and is **not** persisted; the durable log is **bounded** (bounded REJECTION at
  the cap, never eviction).
- **Fail-closed.** A durable write fault (disk error) throws, collapsing the route to the stable public-safe
  refusal (no internal error / partial state on the wire). A corrupt / unreadable / inconsistent snapshot fails
  closed **at construction** (the dev process refuses to start on a damaged store).
- **Hydrate is strict (data-minimization).** The on-disk snapshot is treated as **untrusted** input on
  construction. Hydrate fails closed unless the envelope is **exactly** `{ version, entries }` at the **supported
  version** (an unsupported version, an unknown envelope field, or non-array `entries` is rejected), and it
  validates each entry against its **exact** allowed key set (entry, scope, and transition) — an **unknown own
  field of any name** (a tampered private/raw extra) fails the snapshot closed. Every hydrated entry is then
  **normalized into a freshly-constructed object carrying only the declared fields** before it is replayed or
  appended to the durable log; the raw parsed object is **never** pushed into the log and **never** rewritten back
  to disk. So a tampered extra can neither be accepted at construction nor laundered forward by a later rewrite.
  (The inner Phase 46V engine independently validates every **value** to a bounded synthetic-label shape — no raw
  payload; these checks add the structural exactness around it.)
- **Private artifact.** The snapshot is a PRIVATE dev/operator artifact carrying only synthetic bounded labels in
  the declared shape above — it is never a public surface and never serialized onto the wire. The public envelope
  and the runtime no-leak 114-key parity are unchanged.

---

## 5. Cleanup / rollback (A.7)

```bash
# Option A — programmatic (the store exposes a reversible purge):
#   store.purgeDurableState()   // removes the on-disk snapshot; a fresh store hydrates EMPTY
#
# Option B — operational (no live process):
rm -f "$DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_DIR/admission-wedge-route-storage-durable-spike.json"
```

After cleanup, a subsequent start hydrates an **empty** store. Because the store is synthetic and dev-only,
removing the snapshot leaves no production state behind.

---

## 6. Tests

- `app/tests/unit/admission-wedge-spike/route-storage-durable-spike.test.ts` — config validation, durability /
  hydration, isolation, replay / conflict, capacity, cleanup, corrupt-state fail-closed, **hydrate exactness /
  data-minimization** (unsupported version, unknown envelope/entry/scope/transition fields, tampered private/raw
  extras fail closed and never survive a rewrite; normalized-only re-serialization), private-surface no-leak,
  TOCTOU.
- `app/tests/unit/admission-wedge-spike/durable-migration-isolation.test.ts` — proves the production runner /
  packager cannot adopt the `.json` artifact and that no `aw_*` SQL exists (checklist §8).
- `app/tests/unit/admission-wedge-spike/durable-scope-guard-refinement.test.ts` — proves the Phase 33N guard is
  unchanged and adjacent forbidden paths still fail closed (checklist §9).
- `app/tests/integration/admission-intake/route-storage-durable-spike.test.ts` — durable store through the route
  handler: public-body parity, persisted/replayed no-leak, durability across a route restart, fail-closed.
- `app/tests/integration/admission-intake/registration.test.ts` — server-level three-gate AND.
- `app/tests/unit/admission-wedge-spike/config-gate.test.ts` — the two new gates default off/empty.

---

## 7. Preserved blocked lanes

Production durable-store implementation; production DB writes; production migration execution; Lane-2 canonical
Straylight-store migrations; production admission / signer / auth / consent; Freeside runtime/client integration;
package exports; route-contract freeze; final schema freeze; production readiness; the operative Straylight-side
ADR-022E gate #8 discharge — **all remain blocked**. Phase 47A is a bounded dev/operator-only spike and changes
none of them.

> **Phase 47C status note (added later).** Phase 47A delivered durability as a `.json` snapshot **off the
> migration path**, deliberately **sidestepping** the Lane-1 `aw_*` SQL / migration-runner frontier rather than
> resolving it. Phase 47C
> ([`../ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md`](../ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md),
> docs/decision-only) decomposed that sidestepped frontier (Verdict A — Lane-1 `aw_*` SQL stays **fully
> blocked**): the migration-discovery, packaging/copy, runner-isolation, and Phase 33N scope-guard blockers are
> mapped read-only, candidate future isolation patterns enumerated without selection, and only a
> docs/decision-only Phase 47D Lane-1 `aw_*` SQL isolation *design* gate selected next. No `aw_*` SQL, migration
> runner / packaging change, DB write, or migration execution is authorized.
