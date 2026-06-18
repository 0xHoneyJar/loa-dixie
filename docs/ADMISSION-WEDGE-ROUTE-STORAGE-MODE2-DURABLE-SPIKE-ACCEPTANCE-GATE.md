# Phase 47B — Admission Wedge Dev/Operator Durable (Mode 2) Route-Storage Spike Acceptance / Hardening Decision Gate

> **Phase**: 47B
> **Branch context**: `phase-47b-admission-mode2-durable-storage-acceptance-gate`
> **Related**: Phase 47A (PR #172,
> [`admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md))
> **implemented** the first code-bearing dev/operator route-storage spike lane in **Storage Mode 2** (durable,
> bounded-synthetic, route-owned, off the production migration path — a `.json`-snapshot file store, **not**
> SQL), authorized narrowly and **acceptance-gated** by Phase 46Z (PR #171,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md)
> §8–§15); Phase 46Y (PR #170,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md))
> **designed** the migration-isolation / scope-guard boundary (paper only); Phase 46X (PR #169,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the Mode 2 blocker; Phases 46V / 46W (PR #167 / #168) implemented and accepted the **Mode 1**
> (no-migration, bounded-synthetic, in-process, route-owned) route-storage spike the Mode 2 store **wraps**;
> Phases 46O / 46P / 46Q (PR #160 / #161 / #162) measured, implemented, and accepted the runtime no-leak mirror
> at **114 = 114** parity; Phases 33Q / 33R (PR #135 / #136) implemented and accepted the bounded synthetic
> admitted-assertion ledger Phase 47A wraps (one per synthetic actor); Phases 33M / 33N / 33O (PR #131 / #132 /
> #133) authorized, implemented, and accepted the dev/operator-only route spike; Straylight (`@loa/straylight`)
> PR #65 (A–O primitive review, **merged**); Straylight-repo ADR-022E durable-store gate #8 (+ sibling gates #9 /
> #10 / #11 / #12 / #15 / #20, **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only acceptance gate.** This gate adds **only this document**. It modifies **no**
> runtime source — and specifically does **not** modify
> `app/src/services/admission-wedge-spike/route-storage-durable-spike.ts`, `route-storage-spike.ts`, `index.ts`,
> `no-leak.ts`, `app/src/config.ts`, `app/src/routes/admission-intake.ts`, or `app/src/server.ts` — and changes
> **no** route handler, store / storage code, DB write, migration, SQL file, executable schema, migration runner,
> packager, scope guard, auth, consent, route-vector JSON, route-vector validator, route-vector README, Phase 33E
> fixture, fixture validator, other test, package export, config, env, package, lockfile, CI, generated file, or
> binary. No adjacent repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is the durable (Mode 2) route-storage spike *acceptance / hardening decision* gate** — the rung
> downstream of the Phase 47A implementation, mirroring the Phase 46V → 46W (and the Phase 33N → 33O) implement →
> accept precedent. It **decides whether the merged Phase 47A Mode 2 durable route-storage spike is accepted as
> the bounded dev/operator proof the Phase 46Z §8–§15 checklist authorized**, records what it does and does not
> prove, and selects the next safe lane. **It is not the spike, and it implements nothing.** It **builds no
> store, writes no DB, adds no migration, creates no SQL or executable schema, executes no migration, changes no
> migration runner or packager, weakens no scope guard, implements no auth or consent, changes no route / API
> behavior, freezes neither the route contract nor the final schema, discharges no operative Straylight-side
> gate, and claims no production readiness.**

Every assessment below is grounded **read-only** against the **merged Phase 47A source** in the Dixie repo at
the time of writing: the durable store
`app/src/services/admission-wedge-spike/route-storage-durable-spike.ts` (804 lines,
`createRouteStorageDurableSpikeStore`), its internal barrel re-export
`app/src/services/admission-wedge-spike/index.ts` (lines 106-113; no package export), the three-gate AND + dir
wiring in `app/src/server.ts` (base gate `if (config.admissionIntakeSpikeEnabled)` line 655; nested Mode-1 gate
`if (config.admissionIntakeStorageSpikeEnabled)` line 678; durable selector
`const durable = config.admissionIntakeDurableStorageSpikeEnabled && config.admissionIntakeDurableStorageSpikeDir.length > 0`
lines 691-693; store selection 694-706; seed 712-716; durable cap
`ADMISSION_ROUTE_STORAGE_SPIKE_MAX_DURABLE_ENTRIES = 4_096` lines 142-144), the env parsing in
`app/src/config.ts` (`admissionIntakeSpikeEnabled` ← `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` line 455;
`admissionIntakeStorageSpikeEnabled` ← `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED === 'true'` lines 469-470;
`admissionIntakeDurableStorageSpikeEnabled` ← `DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_ENABLED === 'true'`
lines 480-481; `admissionIntakeDurableStorageSpikeDir` ← `… ?? ''` lines 482-483; field docs 147-157), the
**unchanged** route handler `app/src/routes/admission-intake.ts` (the optional storage DI seam and the guarded
store write at 406-423, the bindingless `catch` → `failClosedRefusalBody()` at 424-426, the deterministic public
body built in step 5 at 433-439), the **unchanged** runtime no-leak guard
`app/src/services/admission-wedge-spike/no-leak.ts` (**114**-key `FORBIDDEN_PUBLIC_KEYS`), the Phase 47A tests
(`app/tests/unit/admission-wedge-spike/route-storage-durable-spike.test.ts` — 62 cases;
`durable-migration-isolation.test.ts` — 10 cases; `durable-scope-guard-refinement.test.ts` — 10 cases;
`config-gate.test.ts` — 15 cases; `app/tests/integration/admission-intake/route-storage-durable-spike.test.ts`
— 12 cases; `registration.test.ts` — 11 cases), the Phase 47A runbook
`docs/admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md`, the route-contract test-vector validator
(5/5 + 44/44 self-check), the five route-vector JSONs, and the Phase 33E fixtures + fixture validator (5/5).
**Phase 47B changes no technical artifact**; the validators and the focused test suites are run only to confirm
the already-merged Phase 47A artifacts remain green, and the predecessor gate documents are reviewed read-only.
**The canonical Straylight `StorageAdapter` interface and the canonical `Assertion` / `TransitionReceipt` /
`AuditEvent` field shapes live in the adjacent `loa-straylight` repository (cross-repo references, not Dixie
file:line) and remain Straylight-owned (§4 / §16).**

---

## 1. Status and verdict

Phase 47B is the bounded, docs/decision-only **durable (Mode 2) route-storage spike acceptance / hardening
decision gate** that follows the merged Phase 47A implementation, exactly as Phase 46W followed Phase 46V and
Phase 33O followed Phase 33N. Its purpose is to take the **merged** Phase 47A Mode 2 durable route-storage spike
and **decide** whether the accumulated, read-only-grounded evidence is sufficient to **accept** it as the
bounded, disabled-by-default, dev/operator-only, non-production durable route-storage spike *proof* that the
Phase 46Z §8–§15 checklist authorized — and to record, precisely, what it does and does not prove — **without
performing, executing, authorizing-into-production, freezing, or implementing anything.**

**What this phase is, stated narrowly and exactly.** Phase 47B:

- is **docs / decision-only**;
- is a **durable (Mode 2) route-storage spike acceptance / hardening decision gate**, *not* a spike
  implementation, *not* the spike *authorization* checklist gate (that is Phase 46Z), *not* the migration-guard
  *design* gate (46Y), and *not* the Mode-2 *blocker decomposition* gate (46X);
- does **not** modify runtime code or tests — and specifically does not touch `route-storage-durable-spike.ts`,
  `route-storage-spike.ts`, `index.ts`, `no-leak.ts`, `config.ts`, `admission-intake.ts`, `server.ts`,
  `migrate.ts`, `copy-migrations.mjs`, `scope-guards.test.ts`, or any test;
- does **not** create migrations and does **not** execute any migration;
- does **not** create SQL files or executable schema;
- does **not** write DB code or perform any DB write;
- does **not** change the migration runner or the build packager;
- does **not** weaken, edit, add, or remove a scope guard;
- does **not** change route / API behavior;
- does **not** authorize production admission;
- does **not** freeze the route contract;
- does **not** freeze the final schema;
- does **not** claim production readiness;
- does **not** claim or discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §4 / §16);
- does **not** select production durable-store implementation, production DB writes, production migration
  execution, or Lane-2 canonical Straylight-store migrations as the next lane (§17).

> **Verdict: A — Phase 47A is ACCEPTED as a bounded, disabled-by-default, dev/operator-only, NON-PRODUCTION,
> Storage Mode 2 (durable, bounded-synthetic, route-owned, `.json`-snapshot-file, off the production migration
> path) Admission Wedge route-storage spike proof** — and **NOT** as production storage readiness, **NOT** as a
> final / canonical schema, **NOT** as durable production / DB-backed admission storage readiness, **NOT** as
> production migration execution, **NOT** as Freeside / client integration readiness, and **NOT** as a discharge
> of the operative Straylight-side ADR-022E gate #8.

This maps to the prompt's verdict **(A)** — *"Phase 47A is accepted as a bounded dev/operator Mode 2 durable
route-storage spike proof."* It rests on the §2–§15 grounded assessment: the Phase 47A implementation stays
**within** the Phase 46Z §8–§15 authorization on every checklist axis — migration isolation (A.1–A.7),
scope-guard preservation (B.1–B.9), gate conjunction (C.1–C.6), storage behaviour (D.1–D.12), and no-leak /
public-private boundary (N.1–N.5) — proven by the §14 validation matrix (full focused suite green, validators
green, 114 = 114 no-leak parity preserved) and the §15 Codex audit cycle. The single nuance worth recording —
that a *throwing* / *persist-faulted* durable store correctly latches **degraded** and collapses to the stable
fail-closed public refusal rather than ever exposing an inner op that out-ran the on-disk snapshot — is the
**intended, authorized, no-leak-tested fail-closed posture** (Phase 46Z D.8), recorded as an **accepted known
nuance** (§13), **not** a defect requiring a further hardening lane. The Codex-found hydrate / data-minimization
bug class was **already fixed in-PR** and is regression-tested (§9), so it is **resolved evidence**, not an open
caveat.

**The alternative verdicts were considered and rejected:**

- **Verdict (B) — "accepted only with caveats; a bounded hardening lane is required next"** — *rejected.* A
  hardening lane would be warranted only if the read-only assessment surfaced a material, unresolved defect in
  the merged spike. The adversarial verification found none: every high-stakes Mode-2 invariant is confirmed
  outright (durability across a restart analogue, migration isolation, scope-guard preservation, the three-gate
  AND + dir, idempotent / conflict / capacity fail-closed, tenant / estate / actor isolation, the actor-id and
  transition-field TOCTOU discipline, the private snapshot / no-leak boundary, and the degraded-latch
  fail-closed posture). The Codex-found hydrate / data-minimization bug (an initial hydrate that accepted
  unsupported snapshot versions and unknown / extra own keys, so a tampered `candidate_payload` could survive
  hydrate and be laundered back to disk by the next rewrite) was **fixed in-PR** with a positive exact-key
  allowlist + declared-fields-only normalization and is regression-tested (§9), so it is resolved evidence
  (**0 open adversarial-verify defects**), not an open caveat. No further hardening lane is owed.
- **Verdict (C) — "held / not accepted, with exact blockers"** — *rejected.* A hold would be warranted if the
  merged spike exceeded the Phase 46Z authorization (e.g. added an `aw_*` SQL migration, opened a DB connection,
  changed the migration runner / packager, weakened a scope guard, expanded the public response, or persisted a
  raw candidate payload). It does none of these: the durable store is a `.json`-snapshot file using only
  `node:fs`, off the production migration path (the production runner adopts only `.sql && !_down`; the packager
  copies only `.sql`); the Phase 33N scope guards are **unchanged** (the store needs none of the forbidden
  tokens); the public allowlist is unchanged; and the snapshot carries only synthetic bounded labels. There is
  no blocker that bars acceptance of the bounded proof.
- **Verdict (D) — "split or redirect before any further lane"** — *rejected.* The spike is already a single,
  bounded, coherent Mode 2 slice; there is nothing to split. No redirect is warranted because the spike did
  exactly what 46Z authorized and selected the lowest-blast-radius durable mechanism (§5).

**The acceptance is bounded — exactly what it covers, and exactly what it does not.** Accepting this verdict
records only that **the merged Phase 47A Mode 2 durable route-storage spike is a sound, bounded,
dev/operator-only, non-production proof** of route-owned **durable** storage semantics over synthetic material,
under the Phase 46Z §8–§15 boundaries. It does **not** accept, authorize, or imply: production admission,
production durable-store implementation, production DB writes, production migration execution, any Lane-2
canonical Straylight-store migration, production auth / consent, public `remember-this`, Discord / freeform
ingestion, chat-as-memory, Freeside runtime / client integration, package exports, LLM / voice / Finn wiring,
MVP 3 forget / revoke / correction UI, a route-contract freeze, a final schema freeze, or the discharge of the
operative Straylight-side ADR-022E gate #8 (§16).

---

## 2. Evidence intake

The acceptance is grounded in the following predecessor artifacts and **merged Phase 47A** source files. Each is
cited read-only; **none is modified by this gate**. PR numbers are git-sourced from merge-commit subjects (a
Dixie convention). Dixie 47-series / 46-series / 33-series phase labels and the Straylight ADR-022E "Phase 22"
labels are **independent cross-repo labels**.

### 2.1 The acceptance chain (relevant to this acceptance decision)

| Phase | PR | Artifact / contribution (relevant to the durable route-storage spike acceptance) |
|-------|----|------|
| 33N / 33O | #132 / #133 | **Dev/operator route spike (implementation + acceptance).** `POST /api/admission/intake`, disabled-by-default behind `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`, dedicated `x-admission-service-token` + `x-admission-operator-id`, runtime `no-leak.ts`. The route surface Phase 46V extended with an optional storage seam. |
| 33Q / 33R | #135 / #136 | **Bounded synthetic admitted-assertion ledger (implementation + acceptance).** Process-local, capacity-bounded, `(tenant_id, estate_id)`-scoped, fail-closed, synthetic-only ledger Phase 46V wraps per synthetic actor — the engine Phase 47A in turn wraps. |
| 46O / 46P / 46Q | #160 / #161 / #162 | **Runtime no-leak mirror — measured, implemented, accepted** at parity **114 = 114**. The no-leak boundary Phase 47A inherits **unchanged** over the stored / replayed / failure public surfaces. |
| 46V / 46W | #167 / #168 | **Dev/operator route-storage spike — implementation + acceptance (Mode 1).** `route-storage-spike.ts` (process-local, one Phase 33Q ledger per synthetic actor, tombstone / cleanup, actor-cap, `snapshotActorId` TOCTOU closure), AND-gated with the base route gate. **The Mode-1 engine Phase 47A wraps.** 46W accepted it as a bounded dev/operator Mode 1 proof and selected the Mode-2 decomposition lane (46X). |
| 46X | #169 | **Mode 2 enablement *blocker decomposition* gate (docs/decision-only).** Verdict A — Mode 2 remains BLOCKED; the blocker (the global migration runner adopting any new migration into the **production** set + the Phase 33N scope guards forbidding durable-write / SQL / migration tokens) is decomposed into required future gates. |
| 46Y | #170 | **Mode 2 migration-guard / scope-guard boundary *design* gate (docs/decision-only).** Designed, on paper, the migration-isolation / refined-guard boundary the Mode 2 spike must satisfy. |
| 46Z | #171 | **Mode 2 implementation-authorization *checklist* gate (docs/decision-only).** **Verdict A** — converted the 46Y design into a hard, file:line-grounded checklist (§8 migration isolation A.1–A.7; §9 scope guards B.1–B.9; §10 gate conjunction C.1–C.6; §11 storage behaviour D.1–D.12; §12 no-leak N.1–N.5; §14 validation matrix; §15 22-item Codex audit) and authorized a **separate-PR**, bounded, dev/operator-only, disabled-by-default, non-production Mode 2 implementation spike (Phase 47A), **acceptance-gated** on that checklist and **mode-contingent**. |
| 47A | #172 | **Dev/operator durable (Mode 2) route-storage spike (implementation).** Implemented the **Mode 2** durable store — `route-storage-durable-spike.ts` (a `.json`-snapshot file store **wrapping** the Phase 46V Mode-1 engine; atomic temp+rename rewrite; ordered seed / record / tombstone log; hydrate-on-construction replay; bounded durable cap with REJECTION; reversible `purgeDurableState`; degraded-latch fail-closed; strict hydrate exactness / data-minimization), wired behind a **third** draft `DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_ENABLED` gate **plus an explicit operator dir**, ANDed under the base + Mode-1 gates; added unit + integration tests and the runbook. Codex PATCHed an initial hydrate exactness / data-minimization gap; Claude fixed via a positive exact-key allowlist + declared-fields-only normalization; Codex re-audited and ACCEPTed (§9). |
| **47B** | *(this doc; docs/decision-only — not committed / merged yet)* | **Durable (Mode 2) route-storage spike acceptance / hardening decision gate — accepts Phase 47A as a bounded dev/operator Mode 2 durable route-storage spike proof; does not unblock production / canonical-store work; selects Phase 47C.** |

### 2.2 Merged Phase 47A source / test / artifact files inspected (read-only)

- **`app/src/services/admission-wedge-spike/route-storage-durable-spike.ts`** (804 lines) — the Mode 2 durable
  store. Imports only `node:fs` / `node:path` (lines 87-95) and two sibling spike modules (`./route-storage-spike.js`,
  `./admitted-assertion-ledger.js`, lines 96-104); wraps the Phase 46V engine (`createRouteStorageSpikeStore`,
  line 542); ordered durable `log` + `seededKeys` + a one-way `degraded` latch in the factory closure (549-557);
  atomic `rewriteSnapshotFile` (write-temp + rename, 573-579); `appendAndPersist` with the degraded latch on a
  persist fault (603-625); `hydrateFromDisk` (637-682); strict hydrate helpers (`assertExactKeys` via
  `Reflect.ownKeys` 359-365; `normalizeSnapshotEnvelope` 372-384; `normalizeSnapshotScope` 392-402;
  `normalizeSnapshotTransition` 411-434; `normalizeLogEntry` 440-462); `SNAPSHOT_FORMAT_VERSION = 1` (line 229);
  the exact allowed key sets (329-345); `.json`-only + path-separator + non-empty-dir config validation
  (468-524); `purgeDurableState` (786-797). **Read-only.**
- **`app/src/services/admission-wedge-spike/index.ts`** — the internal service barrel; the durable store and its
  error classes are re-exported here (lines 106-113) but **not** from any package entrypoint (no `src/index.ts`
  re-export, no package `exports`). **Read-only.**
- **`app/src/server.ts`** — the conditional mount: the base gate `if (config.admissionIntakeSpikeEnabled)`
  (line 655), the nested Mode-1 gate `if (config.admissionIntakeStorageSpikeEnabled)` (line 678), the durable
  selector `const durable = config.admissionIntakeDurableStorageSpikeEnabled && config.admissionIntakeDurableStorageSpikeDir.length > 0`
  (691-693), the store selection (694-706), the idempotent seed of the fixed synthetic scope (712-716), and the
  durable cap constant (142-144). When the durable leg is absent the spike stays the Phase 46V Mode-1 path; when
  the Mode-1 gate is off, `routeStorageSpikeDeps` stays `{}` (672-677) and no store dep is injected. **Read-only.**
- **`app/src/config.ts`** — `admissionIntakeSpikeEnabled` ← `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`
  (line 455); `admissionIntakeStorageSpikeEnabled` ← `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED === 'true'`
  (469-470); `admissionIntakeDurableStorageSpikeEnabled` ← `DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_ENABLED === 'true'`
  (480-481); `admissionIntakeDurableStorageSpikeDir` ← `… ?? ''` (482-483); the field docs (147-157, "no default
  location … fails closed to the Mode-1 (non-durable) store"). **Read-only.**
- **`app/src/routes/admission-intake.ts`** — **unchanged by Phase 47A** (the durable store implements the same
  `RouteStorageSpikeStore` interface). The optional storage DI seam and the guarded store write (406-423), the
  bindingless `catch` → `failClosedRefusalBody()` at HTTP 400 (424-426), the deterministic public body built in
  step 5 independently of the store (433-439). **Read-only, unchanged.**
- **`app/src/services/admission-wedge-spike/no-leak.ts`** — the **114**-key `FORBIDDEN_PUBLIC_KEYS` runtime guard.
  **Read-only, unchanged by Phase 47A.**
- **`app/tests/unit/admission-wedge-spike/`** — `route-storage-durable-spike.test.ts` (62 cases),
  `durable-migration-isolation.test.ts` (10 cases), `durable-scope-guard-refinement.test.ts` (10 cases),
  `config-gate.test.ts` (15 cases) — and **`app/tests/integration/admission-intake/`** —
  `route-storage-durable-spike.test.ts` (12 cases), `registration.test.ts` (11 cases). The Phase 47A test
  surfaces (**120 cases total**). **Read-only.**
- **`docs/admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md`** — the enable / disable /
  durability-semantics / cleanup / rollback runbook for the durable spike. **Read-only.**
- **`docs/admission-wedge/route-contract-test-vectors/`** (validator + five vector JSONs + README) and
  **`docs/admission-wedge/fixtures/`** (validator + fixtures) — the unchanged route-vector / fixture source of
  truth. **Read-only.**
- **The Phase 46Z authorization checklist gate** and the predecessor gate documents (the §2.1 chain) — read-only
  to ground §3–§16.
- **Adjacent `loa-straylight` (cross-repo, read-only context).** The canonical `StorageAdapter` / `AuditLog`
  interface and `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes are Straylight-owned (cited
  cross-repo); their concrete shapes are deliberately **not** redefined here (§4 / §16).

---

## 3. What Phase 47A proves

Each item below is grounded **read-only** against the merged Phase 47A source and confirmed by the passing test
suites (§20). It proves these properties **for a disabled-by-default, dev/operator-only, NON-PRODUCTION, Mode 2
durable route-storage spike** — nothing more.

- **Durability across a process-restart analogue (the defining Mode-2 property).** A second store constructed over
  the same dir **hydrates** the prior synthetic state by replaying the snapshot's ordered entries through a fresh
  Mode-1 engine (`route-storage-durable-spike.ts:637-682`) — the inverse of Mode 1's "a second instance shares no
  state". Proven for records, supersession (recall repointed, prior excluded), tombstones (a tombstoned actor
  stays not-recallable after restart), and multi-actor isolation
  (`route-storage-durable-spike.test.ts:195-257`).
- **Durability is a `.json` file off the migration path — no SQL, no `aw_*` schema, no DB.** The store adds no
  SQL and no `aw_*` schema, opens no DB connection, and persists only a `.json` snapshot via `node:fs`
  (`route-storage-durable-spike.ts:87-95`, `573-579`); a non-`.json` file name fails closed at construction
  (`:494-501`); the artifact directory contains only `.json` and nothing migration-shaped
  (`route-storage-durable-spike.test.ts:261-294`; `durable-migration-isolation.test.ts:103-134`).
- **The production migration runner / packager cannot adopt the artifact.** The production discovery predicate
  (`f.endsWith('.sql') && !f.includes('_down')`, `migrate.ts`) and the packager copy filter (`.endsWith('.sql')`,
  `copy-migrations.mjs`) both reject a `.json` artifact; there is no `aw_*` SQL in the shared migrations dir; the
  ungated startup `migrate(dbPool)` call is unchanged and the durable spike adds no second runner
  (`durable-migration-isolation.test.ts:83-162`).
- **Default-off durable gate + explicit dir.** `admissionIntakeDurableStorageSpikeEnabled` parses via strict
  `=== 'true'` (so unset / blank / malformed / `' true '` is `false`) and the dir defaults empty
  (`config.ts:480-483`); both default off/empty (`config-gate.test.ts:132-167`).
- **Three-gate AND + a non-empty dir.** The durable store engages **only** when the base route gate, the Mode-1
  storage gate, **and** the durable gate are all true **and** the dir is non-empty (`server.ts:691-693`, nested
  inside `:678` inside `:655`); with the durable gate off, or the dir empty, the spike stays the Phase 46V Mode-1
  (non-durable) store **verbatim** (`server.ts:694-706`); proven at the server level
  (`registration.test.ts:183-252`).
- **No raw candidate payload persistence.** The snapshot carries only synthetic bounded labels in the declared
  shape; `JSON.stringify`-level assertions confirm no `candidate_payload` / `raw_reason` / `source_material`
  appears in the artifact (`route-storage-durable-spike.test.ts:280-293`); the inner engine independently
  validates every value to a bounded synthetic-label shape.
- **Strict hydrate exactness / data-minimization (the Codex-hardened path).** Hydrate treats the snapshot as
  untrusted input: the envelope must be exactly `{ version, entries }` at the supported version
  (`SNAPSHOT_FORMAT_VERSION = 1`), and each entry / scope / transition is validated against its **exact** allowed
  key set via a positive allowlist over `Reflect.ownKeys` (which rejects an unknown own key of any name,
  including a symbol-keyed one) and **normalized into a freshly-constructed declared-fields-only object** before
  replay or append; the raw parsed object is never pushed into the log and never rewritten to disk
  (`route-storage-durable-spike.ts:359-462`, `637-682`). A tampered private/raw extra fails the snapshot closed
  and cannot be laundered forward (§9).
- **Public response body unchanged.** The route handler is unchanged (the durable store implements the same
  interface); the public body is built independently of the store in step 5 (`admission-intake.ts:433`) and is
  **byte-identical** to the no-store / Mode-1 path for every transition intent
  (integration `route-storage-durable-spike.test.ts:116-135`, `expect(t2).toBe(t1)`).
- **No-leak guard preserved over persisted / replayed / failure surfaces.** Persisted and replayed responses
  deep-walk the same 114-key guard as a fresh response and carry no store ids / actor ids / audit fields
  (integration `:139-220`); a throwing durable store collapses to the stable 400 refusal leaking neither the
  error text, the path, nor any id (integration `:252-284`); the private projection / footprint surfaces are
  leak-clean (`route-storage-durable-spike.test.ts:655-680`).
- **Idempotent replay is not re-persisted; conflict / capacity fail closed and mint nothing.** An idempotent
  replay returns the prior outcome and advances no durable entry; a same-key / different-content conflict throws
  and is not persisted; a durable append beyond `maxDurableEntries` is rejected (never eviction); a snapshot
  larger than the cap fails closed at construction (`route-storage-durable-spike.test.ts:298-332`, `369-418`).
- **Tenant / estate / actor isolation — structural, preserved across hydrate.** One independent Phase 33Q ledger
  per synthetic actor; same idempotency key in two actors does not collide; cross-actor / cross-tenant /
  cross-estate reads return empty; a cross-actor write fails closed (`route-storage-durable-spike.test.ts:336-365`;
  hydrated isolation `:245-256`).
- **Actor-id and transition-field TOCTOU discipline preserved through the wrapper.** The durable layer reads the
  actor id once into a local (`normalizeScope`) and snapshots each declared transition field once (`snapshotTransition`,
  read-each-once + freeze) before the inner apply AND before persist, so a caller-owned shifting getter cannot
  diverge applied-vs-persisted state nor smuggle a value past the inner no-raw-payload validation into the
  artifact (`route-storage-durable-spike.test.ts:684-739`, `796-832`).
- **Degraded-latch fail-closed on a persist fault.** A durable write fault after a successful inner mutation
  latches the store one-way **degraded**: every subsequent read AND write fails closed, so the inner engine's
  un-persisted op is never observable; a restart hydrates only the persisted state (no residue)
  (`route-storage-durable-spike.ts:603-625`, `560-562`; `route-storage-durable-spike.test.ts:741-794`).
- **Reversible cleanup.** `purgeDurableState` removes the on-disk snapshot so a fresh store hydrates EMPTY;
  idempotent (a no-op when absent) (`route-storage-durable-spike.ts:786-797`;
  `route-storage-durable-spike.test.ts:422-443`).
- **Corrupt / unreadable / inconsistent snapshot fails closed at construction.** A non-JSON snapshot
  (`not_json`), a wrong-shape snapshot (`bad_shape`), or a well-shaped but internally-inconsistent snapshot
  (`replay_failed`) all throw at construction so a dev process refuses to start on a damaged store
  (`route-storage-durable-spike.test.ts:447-503`).
- **Scope guards unchanged — the strongest B.1 outcome.** Because the `.json` store needs none of the forbidden
  DB / SQL / migration tokens or imports, the Phase 33N guards required **no** change at all: no denylist entry or
  import rule was removed, no per-file opt-out / allowlist was added, and the adjacent forbidden paths still fail
  closed against the same evasion-resistance bar (`durable-scope-guard-refinement.test.ts:100-193`).
- **Full validation suite passing.** §20 records the green run (120 focused cases; validators 5/5 + 44/44 + 5/5;
  114 = 114 no-leak parity).

---

## 4. What Phase 47A does not prove

Phase 47A is a disabled-by-default, dev/operator-only, NON-PRODUCTION, Mode 2 durable route-storage spike. It
does **not** prove (and does not claim to prove) any of the following:

- **production durable-store implementation** — the durable store is a single-process, dev/operator-only,
  synthetic-only `.json` file; it is not a production durable substrate;
- **durable production / DB-backed admission storage** — no DB is opened, no row is written;
- **SQL schema correctness** — no SQL or executable schema exists in the spike;
- **migration correctness** — no migration file is created or run;
- **production migration execution** — none performed; no production migration execution is authorized;
- **production DB writes** — none performed; no production DB writes are authorized;
- **Lane-2 canonical Straylight-store migrations** — none; canonical semantics stay Straylight-owned (§16);
- **production admission** — the spike is dev/operator-only and disabled by default; it admits nothing to
  production;
- **production auth / consent** — the dev/operator service-token / operator-id gate is **not** end-user
  authorization and **not** consent; no consent model is implemented (§12);
- **public `remember-this`**, **Discord / freeform history ingestion**, **user chat becoming memory** — none
  exists; no chat-derived path;
- **Freeside runtime / client integration** — no `freeside` import or call; the spike performs no Freeside
  behavior;
- **package API readiness** — the spike adds no package export and no `src/index.ts` re-export (the durable store
  is re-exported only from the internal service barrel, `index.ts:106-113`);
- **LLM / voice / Finn wiring** — none;
- **MVP 3 forget / revoke / correction UI** — none;
- **route-contract freeze** — `route_contract_final` stays false on every vector;
- **final schema freeze** — `schema_final` stays false; no `aw_*` migration is claimed safe;
- **multi-process / concurrent durable storage** — the file store is single-process file-backed (§15);
- **production readiness** — undefined and fully blocked (§16);
- **operative Straylight-side ADR-022E gate #8 discharge** — there is **no repo evidence** of an operative
  Straylight-side discharge; gate #8 (and siblings #9 / #10 / #11 / #12 / #15 / #20) remain **held** (§16).

---

## 5. Mode 2 acceptance assessment (migration isolation + scope guards)

Assessed specifically against the Phase 46Z §8 (migration isolation, A.1–A.7) and §9 (scope guards, B.1–B.9)
checklist sections. Mode 2 — as implemented — is **accepted as the lowest-blast-radius durable mechanism**:

- **Why a `.json`-snapshot file, not Lane-1 `aw_*` SQL.** Mode 1 (Phase 46V) declined durability because the only
  durable substrate it considered was Lane-1 `aw_*` SQL in the **shared** `app/src/db/migrations/` directory —
  which the whole-directory migration runner (`migrate.ts` `discoverMigrations`, `.sql && !_down`) and the
  `.sql`-only packager (`copy-migrations.mjs`) would auto-adopt into the **production** migration set, and which
  the Phase 33N scope guards forbid by token. Phase 47A delivers Mode 2's defining property — **durability across
  a restart** — as a JSON-snapshot file, sidestepping that blocker entirely: there is no SQL material for the
  production runner to discover or execute (`durable-migration-isolation.test.ts`).
- **A.1 — production runner cannot discover / execute experimental material.** The discovery predicate
  (`.sql && !_down`) is unchanged and rejects the `.json` artifact; no `aw_*` SQL exists in the shared dir; even a
  migration-named `.json` is never adopted (`durable-migration-isolation.test.ts:83-134`). **Satisfied.**
- **A.2 — startup `migrate(dbPool)` unchanged.** `server.ts` still calls `migrate(dbPool)` only inside
  `if (dbPool)`; the durable spike adds **no** second migration call / runner (exactly one `migrate(` call in
  `server.ts`) (`durable-migration-isolation.test.ts:138-148`). **Satisfied.**
- **A.4 — packager cannot copy experimental material.** `copy-migrations.mjs` still filters to `.sql` only; the
  `.json` artifact name is rejected (`durable-migration-isolation.test.ts:152-162`). **Satisfied.**
- **A.3 / A.5 / A.6 — isolation mechanism is explicit, named, documented, tested; no production migration
  execution.** The mechanism is the `.json` extension (enforced in code) + an explicit operator dir (no default
  location), documented in the runbook §1–§2 and the source header; the store imports no migration runner / DB
  client / pg / migrations dir / production `-store`, and opens no DB connection (`durable-migration-isolation.test.ts:166-195`).
  No experimental runner is introduced; nothing is invoked by the ungated production call. **Satisfied.**
- **A.7 — reversible cleanup / rollback path.** `purgeDurableState` removes the snapshot (a fresh store hydrates
  empty), documented in the runbook §5 with the operational `rm -f` alternative
  (`durable-migration-isolation.test.ts:199-209`; `route-storage-durable-spike.test.ts:422-443`). **Satisfied.**
- **B.1 — guards refined narrowly / not weakened broadly (here: nothing weakened).** The strongest possible B.1
  outcome: the `.json` store needs none of the forbidden tokens, so **no** Phase 33N denylist entry or import rule
  was removed and **no** per-file opt-out / allowlist was added (`durable-scope-guard-refinement.test.ts:100-119`).
  **Satisfied.**
- **B.2 / B.3 / B.6 — adjacent forbidden paths still fail closed.** Raw SQL durable-write statements, CREATE /
  ALTER / DROP TABLE, migration / migrate tokens, and forbidden imports (`pg`, `/db/(client|pool|migrate|transaction)`,
  `/db/migrations/`, any `/-store(\.js)?$/`) are still caught by the denylist applied to adversarial samples
  (`durable-scope-guard-refinement.test.ts:123-155`). **Satisfied.**
- **B.8 — no widening of the import guard.** The module is named `*-durable-spike.ts` (never `*-store.ts`), so it
  passes the `/-store(\.js)?$/` import guard **without** any allowlist; a hypothetical `-store` sibling would
  still be rejected (`durable-scope-guard-refinement.test.ts:159-170`). **Satisfied.**
- **B.9 — same evasion-resistance bar.** A token hidden in a nested template / regex char class is still surfaced
  after parser-backed comment stripping; a real SQL-prose comment is still stripped (no false positive)
  (`durable-scope-guard-refinement.test.ts:174-193`). **Satisfied.**

**Why this Mode 2 was correct.** The `.json`-snapshot mechanism is exactly the lowest-blast-radius way to deliver
the one property Mode 1 lacked (durability across a restart) **without** touching the migration runner, the
packager, or any scope guard — which is what an acceptance-gated, mode-contingent authorization (46Z, mirroring
the 46U → 46V precedent) should produce. It does **not** resolve the Lane-1 `aw_*` SQL / migration-runner
frontier; it **sidesteps** it. That frontier remains a genuine future blocker, which §17 selects as the next
docs/decision-only lane to decompose.

---

## 6. Gate and config assessment (the three-gate AND + an explicit dir)

Assessed against the Phase 46Z §10 gate-conjunction checklist (C.1–C.6). The durable store engages **only** on
the conjunction of **four** conditions:

1. **the base Admission Wedge route gate** — `admissionIntakeSpikeEnabled` ← `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`
   (`config.ts:455`), gating the outer mount (`server.ts:655`);
2. **the Mode-1 route-storage spike gate** — `admissionIntakeStorageSpikeEnabled` ←
   `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED === 'true'` (`config.ts:469-470`), gating the inner block
   (`server.ts:678`);
3. **the durable (Mode 2) storage spike gate** — `admissionIntakeDurableStorageSpikeEnabled` ←
   `DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_ENABLED === 'true'` (`config.ts:480-481`);
4. **a non-empty explicit operator directory** — `admissionIntakeDurableStorageSpikeDir` ← `… ?? ''`
   (`config.ts:482-483`); there is **no default location**.

The durable store is selected only when
`const durable = config.admissionIntakeDurableStorageSpikeEnabled && config.admissionIntakeDurableStorageSpikeDir.length > 0`
is true (`server.ts:691-693`), inside the Mode-1 gate (`:678`), inside the base gate (`:655`). The detailed
findings:

- **C.1 / C.2 / C.6 — all three gates disabled by default; no production default.** Each env read is strict
  `=== 'true'`, so unset / blank / malformed / `'1'` / `'TRUE'` / `' true '` all parse `false`; the dir defaults
  empty (`config-gate.test.ts:132-167`). **Satisfied.**
- **The storage gate alone must not activate durable behavior.** With the base + durable gates off but the Mode-1
  storage gate on, no durable store is created (the durable selector is only reached inside the base + Mode-1
  gates); and at registration, the storage gate alone never even mounts the route
  (`registration.test.ts:142-148`). **Satisfied.**
- **The durable gate alone must not activate route / storage behavior.** With the base + Mode-1 gates off but the
  durable gate on (and a dir set), the route is **not registered at all** and **no durable artifact** is written —
  the durable selector is unreachable (`registration.test.ts:196-206`). **Satisfied (C.3 analogue for Mode 2).**
- **The base route gate alone must not activate durable behavior.** With the base gate on but the Mode-1 storage
  gate off, `routeStorageSpikeDeps` stays `{}` (`server.ts:672-677`), no store is created, and the route runs the
  Phase 33N no-store path (`registration.test.ts`; C.4). **Satisfied.**
- **Base + Mode-1 storage with the durable gate off stays Mode 1 only.** The route registers, but the **Mode-1**
  (non-durable, in-process) store is selected (`server.ts:702-706`) and **no durable artifact** is written to the
  dir (`registration.test.ts:208-220`). **Satisfied.**
- **Durable gate on but dir empty → fail closed to Mode 1.** With all three gates on but the dir empty, the
  durable selector is false (`dir.length > 0` fails), so the spike falls back to the Mode-1 store and writes **no**
  durable artifact — durable state is never written without a deliberate operator dir
  (`server.ts:691-693`; `registration.test.ts:222-233`; `config.ts:147-157`). **Satisfied.**
- **All four conditions → durable store built + seeded; exactly one `.json` artifact on disk.** Only the full
  conjunction selects the durable store, seeds the fixed synthetic scope (idempotent against an already-hydrated
  snapshot), and writes the `.json` snapshot — never a `.sql` (`server.ts:694-716`;
  `registration.test.ts:235-252`). **Satisfied (C.5 for Mode 2).**
- **Config parses the four flags independently; the AND is applied at the mount site, not in config.** Setting the
  durable gate alone at config load leaves the base + Mode-1 gates off (`config-gate.test.ts:158-167`). The
  service-token / operator-allowlist auth gate is unchanged and still fails closed when both are empty (Phase
  33N / 46V; not production auth, not consent). **Satisfied.**

---

## 7. Route integration assessment

- **The route handler is unchanged.** The durable store implements the **same** `RouteStorageSpikeStore`
  interface as the Phase 46V Mode-1 store, so `admission-intake.ts` is byte-unchanged by Phase 47A; the durable
  store is a drop-in backend.
- **Optional DI does not change existing behavior by default.** With no store injected, the route runs the Phase
  33N no-store path verbatim (`admission-intake.ts:406-411`).
- **Store write happens only under intended gates.** The write is guarded by a 4-way AND on the store + the full
  synthetic (tenant, estate, actor) scope deps (`admission-intake.ts:406-411`), which are injected only inside the
  three env gates (`server.ts:691-722`).
- **Store write uses fixed synthetic transition constants, not raw request material.** `synthTransitionFor` builds
  from constants; the spike body carries only `spike` + `transition_intent`.
- **Store result is discarded.** Never assigned or surfaced (`admission-intake.ts:404-405`, `414`).
- **Public response body unchanged.** Built in step 5 independently of the store (`admission-intake.ts:433`);
  byte-identical to the no-store / Mode-1 path on every intent (integration `route-storage-durable-spike.test.ts:116-135`).
- **Store failure collapses to a stable public refusal.** The durable store write is inside the same guarded try;
  a throw (durable write fault, degraded latch, capacity, conflict, scope, tombstone) is caught by the bindingless
  `catch` returning `failClosedRefusalBody()` at HTTP 400 (`admission-intake.ts:424-426`) — atomic, no recallable
  residue; proven through the route (integration `:252-284`).
- **No raw storage errors exposed.** The `catch` discards the error object; the no-leak guard deep-walks every
  send; a throwing store leaks neither the synthetic error text, nor the dir path, nor any id (integration `:277-281`).

---

## 8. Store implementation assessment

- **Durable wrapper over the proven Mode-1 engine.** The store wraps `createRouteStorageSpikeStore`
  (`route-storage-durable-spike.ts:542`), inheriting verbatim its tenant / estate / actor isolation, idempotent
  replay, conflict fail-closed, supersession, per-estate + per-store capacity bounds, synthetic-only label
  validation (no raw payload), and the `snapshotActorId` TOCTOU discipline; it layers a thin durable persist /
  hydrate log on top.
- **Append-and-persist with atomicity.** Each accepted seed / record / tombstone is appended to an ordered
  in-memory log and the whole log is rewritten atomically (write-temp + rename) so the on-disk file is always a
  complete, consistent snapshot (`:573-579`, `603-625`).
- **Only genuinely-new state advances the durable log.** An idempotent replay mints nothing and is not persisted;
  a conflicting / capacity-rejected write throws before any append (durable-capacity pre-check) so the inner engine
  and the snapshot never diverge on a rejected write (`:593-597`, `709-736`).
- **Bounded durable cap — REJECTION, never eviction.** `maxDurableEntries` (server cap 4,096) bounds the on-disk
  artifact; a snapshot already over the cap fails closed at construction (`:649-651`; server.ts:142-144).
- **One-way degraded latch.** A persist fault after a successful inner mutation latches the store degraded; every
  subsequent method fails closed via `assertNotDegraded` (`:560-562`, `603-625`) so the inner engine's
  un-persisted op is never observable; recovery is restart-based (the durable snapshot never saw the un-persisted
  op).
- **Reversible purge.** `purgeDurableState` (deliberately not degraded-gated — it is the recovery path) removes
  the snapshot, clears the in-memory log + dedup keys; a fresh store hydrates empty (`:786-797`).
- **No secrets / tokens / raw payloads / private signer material in the snapshot.** Only bounded synthetic labels
  in the declared shape pass validation; config / state errors never echo a path or payload
  (`route-storage-durable-spike.test.ts:669-680`).

---

## 9. Hydrate exactness / data-minimization — Codex patch-resolution assessment

The Codex Phase 47A PATCH and its resolution are recorded here as **resolved evidence** (not an open caveat):

- **Issue (Codex probe).** The initial hydrate path was insufficiently strict: it could accept a snapshot at an
  **unsupported version** and a snapshot carrying **unknown / extra own keys**. In particular, a tampered
  `candidate_payload` (a private/raw extra field off the declared shape) on a snapshot scope could **survive
  hydrate** and then be **laundered forward** — re-serialized back to disk by the next rewrite — defeating the
  no-raw-payload / data-minimization intent of the durable artifact.
- **Impact.** A tampered or foreign / future-version snapshot could (a) be partially replayed, or (b) carry a
  private/raw extra into the durable log and onto the next on-disk rewrite, poisoning every future hydrate with
  material that the declared shape never permits.
- **Fix.** Hydrate now treats the on-disk snapshot as **untrusted input** and enforces exact structural shape with
  a **positive allowlist**, normalizing every structure into a freshly-constructed declared-fields-only object
  **before** replay or append:
  - **exact envelope + supported version.** `normalizeSnapshotEnvelope` requires exactly `{ version, entries }`,
    rejects an unsupported version (`SNAPSHOT_FORMAT_VERSION = 1`, `route-storage-durable-spike.ts:229`), an
    unknown envelope field, a non-object, or non-array `entries` — all fail closed `bad_shape` (`:372-384`);
  - **exact entry / scope / transition keys.** `assertExactKeys` iterates `Reflect.ownKeys` and throws `bad_shape`
    if any own key is a **symbol** or is **not** in the relevant allowed set — so an unknown / extra own key **of
    any name** (a tampered private/raw extra) fails closed; the offending key is never echoed onto the error
    (`:359-365`, allowed sets `:329-345`);
  - **declared-fields-only normalization.** `normalizeSnapshotScope` / `normalizeSnapshotTransition` /
    `normalizeLogEntry` return **freshly-constructed objects carrying only the declared fields** (the transition is
    re-frozen through the same `snapshotTransition` helper the live path uses), and `hydrateFromDisk` pushes
    **only** the normalized entry into the durable log — the **raw parsed object is never pushed and never
    rewritten to disk** (`:392-462`, `:659-681`).
- **Regression tests added** (`route-storage-durable-spike.test.ts:508-651`): a 12-case tampered-snapshot table
  (`:515-573`) covering an unsupported version (999 / 0 / `'1'`), an extra top-level envelope field, an extra own
  field on an entry / scope (`candidate_payload`, `source_material`) / transition (`raw_reason`,
  `candidate_payload`), an unknown / missing op, and a non-object scope — each expecting
  `RouteStorageDurableSpikeCorruptStateError` reason `bad_shape`; the explicit Codex no-launder test (`:575-593`)
  proving the tampered `candidate_payload` fails closed at construction and, because construction never rewrote a
  "blessed" clean copy, the tamper is **not laundered** (the raw file is untouched and still cannot produce a
  store on a retry); a normalized-only re-serialization test (`:595-633`) hydrating then triggering a rewrite and
  asserting only the exact allowed entry / scope / transition keys survive; and a "good snapshot still hydrates
  after the hardening" recovery test (`:635-650`). A snapshot carrying an unsafe actor **label** additionally
  fails closed on the inner engine's value validation at hydrate (`:493-502`).
- **Codex re-audit verdict: ACCEPT.**

This gate confirms the fix is present in the merged source and regression-tested, and treats the hydrate
exactness / data-minimization gap as **closed**. **No further Phase 47A implementation patch is required** — the
committed `route-storage-durable-spike.ts` already carries the patched, strict hydrate, and the focused suite is
green (§20).

---

## 10. No-leak / public-private assessment

Assessed against the Phase 46Z §12 no-leak checklist (N.1–N.5) at **114 = 114** runtime ↔ validator parity:

- **N.1 — persisted + replayed responses deep-walk the same as a fresh response.** Every send is deep-walked by
  the unchanged runtime no-leak guard; persisted and replayed responses carry no store ids, audit fields, receipt
  refs, signer / consent internals, or synthetic actor ids (integration `route-storage-durable-spike.test.ts:139-220`).
  **Satisfied.**
- **N.2 — public body does not expand.** The fixed allowlist holds; the public body is byte-identical to the
  no-store / Mode-1 path on every intent (integration `:116-135`). **Satisfied.**
- **N.3 — private material remains private.** The on-disk snapshot is a PRIVATE dev/operator artifact, never
  serialized onto the wire; the store result is discarded; read accessors are never called by the route
  (`route-storage-durable-spike.ts:61-65`; `admission-intake.ts:404-414`). **Satisfied.**
- **N.4 — 114 = 114 parity preserved.** Phase 47A touched neither `no-leak.ts` nor the route-vector validator;
  the parity is unchanged (§20). **Satisfied.**
- **N.5 — Lane-2 canonical Straylight-store migrations remain blocked.** No Dixie migration authority over
  canonical `Assertion` / `TransitionReceipt` / `AuditEvent` records; each canonical migration stays a separate
  sibling-repo ADR under Straylight teammate review (ADR-022D §7; 46N); the operative Straylight-side ADR-022E
  gate #8 discharge **remains held**. **Preserved.**

> **Residual surface (noted, not a defect).** The runtime guard is exact-key (`Set.has`) with value-pattern walls
> (UUID / opaque-run / forbidden substring) but no general prefix matching. A hypothetical *future* durable
> serializer that emitted a brand-new private key name absent from the 114-key set under a short safe-looking
> value would be caught only by a value-pattern wall. For Mode 2 this is mitigated structurally: the route never
> serializes store output, and the snapshot is a private artifact carrying only declared synthetic-label fields
> (the hydrate hardening of §9 guarantees no off-shape field ever enters the artifact). It is recorded here as the
> one residual surface for any **future** Lane-2 / canonical serializer work — out of scope for the Mode 2
> acceptance.

---

## 11. Idempotency / replay / conflict assessment

- **Identical replay returns the prior result and is NOT re-persisted.** An idempotent replay advances no durable
  entry; a fresh hydrate confirms exactly one record survived (no duplicate)
  (`route-storage-durable-spike.test.ts:298-314`).
- **Same-key / different-content conflict fails closed and is NOT persisted.** The conflict throws before any
  append; the on-disk artifact shows no residue after a fresh hydrate (`:316-332`).
- **No duplicate / forked admitted assertion on replay.** Delegated to the inner ledger's replay-map check that
  precedes any mutation; the durable layer never appends for a replayed outcome (`route-storage-durable-spike.ts:732-734`).
- **Same key across actors does not collide.** Independent ledger per actor; both record durably
  (`route-storage-durable-spike.test.ts:336-345`).
- **Idempotency survives a restart.** A replay after hydrate against the reconstructed state mints nothing
  (integration `:171-207`).

> The **final keying strategy**, durable replay-envelope shape, and TTL policy remain **undecided**; Phase 47A
> implements **draft / dev-only** durable idempotency behavior; it does **not** claim final idempotency.

---

## 12. Tenant / estate / actor isolation assessment

- **All stored records scoped by tenant / estate / actor.** `(tenant, estate)` via the wrapped ledger; `actor` via
  one independent ledger per actor — structural, preserved across hydrate
  (`route-storage-durable-spike.test.ts:245-256`, `336-365`).
- **Cross-tenant / cross-estate / cross-actor reads return empty.** (`:347-354`.)
- **Cross-actor writes fail closed.** An unseeded actor cannot be written or persisted (`:356-364`).
- **Actor-id TOCTOU discipline preserved through the durable wrapper.** A shifting `actor_id` getter cannot divert
  a durable write across actor isolation: the wrapper reads the id once into a local before touching the inner
  engine OR persisting (`:796-832`).
- **Synthetic operator authority remains dev-only; service auth is separate from end-user consent.** The
  `x-admission-operator-id` allowlist is a dev/operator isolation mechanism, never the production binding; no
  end-user consent model is implemented or unblocked here.

---

## 13. Durability / failure / rollback / capacity assessment

- **Survives a restart (hydration).** A fresh store over the same dir reconstructs the prior synthetic state for
  records, supersession, tombstones, and multi-actor isolation (`route-storage-durable-spike.test.ts:195-257`;
  integration `:171-220`).
- **Persist fault latches degraded; reads + writes then fail closed; restart recovers cleanly.** The diverged
  inner op is never observable; a fresh store hydrates only the persisted state (no residue)
  (`route-storage-durable-spike.test.ts:741-794`). **This degraded-latch fail-closed posture is the intended,
  authorized behavior (Phase 46Z D.8) — an accepted known nuance, not a defect.**
- **Throwing store produces a stable public refusal.** Via the route's bindingless `catch` → `failClosedRefusalBody()`
  at HTTP 400, leaking no error / path / id (integration `:252-284`).
- **Bounded capacity fails closed.** Durable append beyond `maxDurableEntries` is rejected (never eviction); a
  snapshot over the cap fails closed at construction (`route-storage-durable-spike.test.ts:369-418`).
- **Corrupt / unreadable / inconsistent snapshot fails closed at construction.** `not_json` / `bad_shape` /
  `replay_failed` (`:447-503`).
- **Reversible cleanup removes residue.** `purgeDurableState` → a fresh store hydrates empty (`:422-443`).
- **Store not invoked for pending / reject / malformed.** No durable record entry is appended for a pending; a
  reject creates no admitted assertion; malformed fails closed before the store is reached
  (integration `:224-248`).

---

## 14. Runbook assessment

`docs/admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md` was reviewed read-only; it **accurately**
states every required disclaimer and documents the durable mechanism / gates / durability semantics / cleanup:

- **what it is** — "Storage Mode 2 … dev/operator-only, disabled-by-default, NON-PRODUCTION, synthetic-only,
  route-owned DURABLE store" persisting across a restart as a `.json` snapshot off the migration path;
- **what it is NOT** — "not production storage, not the final Straylight storage, not a route-contract freeze, not
  a final schema freeze, and not an ADR-022E gate #8 discharge"; "no production DB write, no database connection,
  no SQL / `aw_*` migration, no migration execution, no migration runner / packager change, no scope-guard
  weakening, no public response expansion, no raw candidate payload, no Freeside integration";
- **three-gate AND + dir** — the §2 gate table (all four required; durable gate on + dir empty fails closed to
  Mode 1; strict `=== 'true'`);
- **durability semantics** — survives restart by hydrate-replay; idempotent / conflict / capacity behavior; the
  **strict hydrate** (data-minimization) §4 description matches the patched source; the degraded-latch fail-closed
  posture; the private-artifact / 114-key no-leak note;
- **cleanup / rollback (A.7)** — `purgeDurableState` + the operational `rm -f`;
- **preserved blocked lanes** — §7 lists production durable-store implementation; production DB writes; production
  migration execution; Lane-2 canonical Straylight-store migrations; production admission / signer / auth /
  consent; Freeside runtime / client integration; package exports; route-contract freeze; final schema freeze;
  production readiness; the operative Straylight-side ADR-022E gate #8 discharge — **all remain blocked**.

**No disclaimer is missing or weaker than claimed**, and no runbook claim overstates the spike. This gate adds
**no** note to the runbook (it remains read-only here).

---

## 15. Known limitations

The accepted Phase 47A durable spike is bounded. Its known limitations — recorded so the acceptance is read
exactly, and so a future durable lane scopes them — are:

- **still dev/operator-only** — disabled-by-default, AND-gated (three gates + an explicit dir), behind the
  dev/operator service-token / operator-id auth gate; not production, not end-user;
- **single-process file-backed JSON snapshot** — durability is one `.json` file written by one process via
  `node:fs`;
- **not multi-process / concurrent-safe production storage** — the atomic temp+rename rewrite protects a reader
  from a partial file, but the store is a single-writer dev artifact, **not** a concurrent / multi-process
  production durable substrate;
- **restart-based recovery after a degraded latch** — a persist fault fails the store closed one-way; recovery is
  a process restart that hydrates from the durable snapshot (which never saw the un-persisted op);
- **no production DB storage** — no database connection, no row write;
- **no production migration story** — no SQL, no `aw_*` schema, no migration file, no migration execution; the
  spike **sidesteps** the Lane-1 `aw_*` SQL / migration-runner frontier rather than resolving it;
- **no consent / auth production story** — the service-token / operator-id gate is not end-user authorization and
  not consent;
- **no Freeside integration** — no `freeside` import or call;
- **no final route / schema freeze** — `route_contract_final` / `schema_final` stay false; no `aw_*` migration is
  claimed safe;
- **no ADR-022E gate #8 discharge** — the operative Straylight-side gate #8 remains held;
- **no public response expansion** — the fixed allowlist holds; the durable backend never changes the public
  envelope;
- **no raw candidate payload persistence** — only synthetic bounded labels in the declared shape; the hydrate
  hardening (§9) guarantees no off-shape field ever enters the artifact.

These are **bounds of the accepted proof**, not defects. Each is a property the spike was authorized to have
(Phase 46Z §18), and each names a separately-gated future lane (§16).

---

## 16. Remaining blockers

After Phase 47B, the following remain **blocked**, regardless of the verdict — **none** is unblocked by this
acceptance gate:

- **production durable-store implementation** — blocked;
- **production DB writes** — blocked;
- **production migration execution** — blocked;
- **Lane-2 canonical Straylight-store migrations** — blocked (each a separate sibling-repo ADR under Straylight
  teammate review, behind the operative gate #8);
- **production admission** — blocked;
- **public `remember-this`** — blocked;
- **Discord / freeform ingestion** — blocked;
- **user chat becoming memory merely because it was said** — blocked; consent never inferred from chat;
- **Freeside runtime / client integration** — blocked (Freeside stays a consumer / handoff surface; gate #11
  held);
- **package exports** — blocked unless separately justified and audited;
- **LLM / voice / Finn runtime wiring** — blocked;
- **MVP 3 forget / revoke / correction UI** — blocked;
- **route-contract freeze** — blocked; `route_contract_final` stays false;
- **final schema freeze** — blocked; `schema_final` stays false; no `aw_*` migration is claimed safe;
- **production readiness of any kind** — not claimed;
- **operative Straylight-side ADR-022E gate #8 discharge** — not claimed (no repo evidence); sibling gates #9 /
  #10 / #11 / #12 / #15 / #20 remain held. **This remains the dominant cross-repo blocker** for production
  admission and any Lane-2 canonical-store migration.

> Accepting this bounded Mode 2 durable spike proof unblocks **no** production / public / canonical-store /
> Freeside / LLM / package / freeze work. Every lane above remains its own separately-authorized future gate.

---

## 17. Next lane

The evidence is sufficient to accept the Phase 47A Mode 2 durable spike (§3, §20); the merged spike stays within
the Phase 46Z §8–§15 authorization on every checklist axis; and the spike **delivered durability by sidestepping**
the Lane-1 `aw_*` SQL / migration-runner / scope-guard frontier (a `.json` file off the migration path), rather
than resolving it (§5). Direct production durable-store implementation, production DB writes, production migration
execution, Lane-2 canonical Straylight-store migrations, and the operative Straylight-side gate #8 all remain
blocked (§16).

> **Selected next lane: Phase 47C — Lane-1 `aw_*` SQL durable-store / migration-runner blocker *decomposition*
> gate (docs / decision-only).**

> **Phase 47C status note (added later).** Phase 47C
> ([`ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md),
> docs/decision-only) executed this lane and reached **Verdict A — the Lane-1 `aw_*` SQL / migration-runner
> blocker is decomposed and implementation stays BLOCKED.** It grounded, read-only, that Phase 47A delivered
> durability by **sidestepping** (not solving) the migration-discovery (`migrate.ts:76-85`), packaging
> (`copy-migrations.mjs:39`), runner-isolation, and Phase 33N scope-guard (`scope-guards.test.ts:122-142`)
> blockers, mapped candidate future isolation patterns without selecting any, recorded the evidence still
> missing, and selected only a **docs/decision-only Phase 47D Lane-1 `aw_*` SQL isolation *design* gate** next.
> It authorizes **no** `aw_*` SQL, migration runner / packaging change, DB write, migration execution, or
> production storage, and edits no runner / guard / migration.

> **Phase 47D status note (added later).** The chain continued one rung: Phase 47D
> ([`ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md),
> docs/decision-only) reached **Verdict A — a layered Lane-1 `aw_*` SQL isolation *design direction* is selected on
> paper for a later authorization gate, and all implementation stays BLOCKED.** It compared candidate isolation
> designs A–H on paper and selected a layered direction (separate experimental SQL location + manifest-gated
> experimental runner + explicit dev/operator-only runner command + normal-runner / packaging hard-deny
> defense-in-depth + a narrow scope-guard allowlist + negative tests) as paper input only — authorizing **no** SQL,
> migration, runner / packaging change, DB write, or guard edit — and selected a **docs/decision-only Phase 47E
> design-acceptance / implementation-authorization checklist gate** next.

- **What it is.** A **docs / decision-only** gate that decomposes, precisely and read-only, the frontier the Phase
  47A `.json`-snapshot spike **sidestepped**: *how (if ever) a dev/operator-only durable store could ever use
  Lane-1 `aw_*` SQL given that (a) the global migration runner (`migrate.ts` `discoverMigrations`, `.sql && !_down`)
  adopts any new migration into the **production** set, and (b) the Phase 33N scope guards forbid any durable-write /
  SQL / migration token and any production-store import in the spike path.* It maps the migration-isolation,
  refined-guard, down-migration / drop-empty-table, and dev-only-runner options into separately-gateable sub-lanes,
  and names which remain blocked behind the operative gate #8 — building on the 46X decomposition and 46Y design,
  now grounded in the merged 47A `.json` mechanism.
- **The precise frontier it decomposes.** Phase 47A proved durability is achievable **without** SQL (a `.json`
  file), which is exactly why it was the lowest-blast-radius Mode 2. But any *eventual* canonical / DB-backed
  durable store would still face the migration-runner-adoption / scope-guard tension that Mode 1 and the `.json`
  spike both avoided. That tension is a genuine, evidence-grounded architectural question that must be decomposed
  on paper **before** any SQL-backed durable implementation could be safely authorized. Decomposing it does
  **not** authorize, implement, or sequence SQL-backed durable storage; it only maps the frontier.
- **What it must remain.** Docs / decision-only; it implements no store, writes no DB, adds no migration, creates
  no SQL or executable schema, changes no route / API behavior, changes no migration runner / packager, weakens no
  scope guard, freezes nothing, and discharges no Straylight-side gate. It preserves every §16 block.
- **Why not the alternatives.**
  - **Direct production durable-store implementation / production DB writes / production migration execution /
    Lane-2 canonical migrations** as 47C are **explicitly NOT selected** (forbidden; §16).
  - A **Mode 2 durable-spike operational smoke test** lane was considered and **not** selected as primary: the
    merged spike is already proven green by the unit + integration suites (§20), the runbook is accurate (§14),
    and a run/smoke lane adds operational confirmation but not new decision value; it would also need a bounded,
    disabled-by-default, dev/operator-only, non-production envelope and separate audit — a heavier envelope than
    the docs-only decomposition for less marginal value. It remains available as a **later optional** lane.
  - A **Freeside Characters client-contract handoff gate** was considered and **not** selected now: the route
    contract remains draft / non-final (`route_contract_final` false), so a handoff would communicate a moving
    target; it is better sequenced after the SQL-backed durable frontier is decomposed and the contract approaches
    stability.

---

## 18. Non-authorizations and invariants

### 18.1 Invariants preserved

Phase 47B preserves **all** of the following; acceptance carries each forward unchanged:

1. **A pending candidate is not recallable** — `synthTransitionFor` returns `null` for `pending`; nothing is
   stored (integration `route-storage-durable-spike.test.ts:224-234`).
2. **A rejected candidate creates no admitted assertion** — `null` for `reject`; nothing stored (integration `:236-240`).
3. **An accepted candidate creates / references an admitted assertion** — `accept` mints a synthetic `admit`
   transition durably (integration `:139-167`).
4. **A superseded assertion is excluded from ordinary recall** — the `supersede` transition repoints recall to the
   corrected active assertion while preserving the prior's audit / provenance, and the repointing survives a
   hydrate (`route-storage-durable-spike.test.ts:212-228`; integration `:209-219`).
5. **A malformed / unsafe payload fails closed** — `400`; nothing stored (integration `:242-247`).
6. **Missing / unauthorized auth fails closed** — one stable refusal that never reveals which gate failed (Phase
   33N / 46V auth gate, unchanged).
7. **Missing / invalid consent fails closed in any future production admission model** — service-token / operator
   auth is never treated as consent; no consent model is implemented or unblocked here.
8. **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
   material** — runtime deep-walk + 114-key guard + value-pattern walls (`no-leak.ts`, unchanged;
   `admission-intake.ts:433-439`).
9. **Private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private** — the
   snapshot is never serialized onto the wire; the store result is discarded; read accessors are never called by
   the route.
10. **User chat does not become memory merely because it was said** — no Discord / freeform ingestion; no
    chat-derived path; consent never inferred from chat.
11. **Public `remember-this` remains blocked.**
12. **Discord / freeform history ingestion remains blocked.**
13. **Production admission / storage / auth / consent remain blocked.**
14. **Route-contract freeze and final schema freeze remain blocked** — `route_contract_final` / `schema_final`
    false on every vector; Phase 47B freezes neither.
15. **`recall_eligible` remains derived / projection-only** — computed at read time, never persisted as canonical
    authority; preserved across hydrate.

Also preserved (vocabulary): the **public outcome label `admitted`** and the **canonical assertion status
`active`** remain distinct, never conflated; **`active` is not a public `outcome_class`**.

### 18.2 Non-authorizations (restated)

Phase 47B authorizes nothing beyond accepting the bounded Mode 2 durable spike proof. It explicitly does **not**
authorize, and is **not** to be read as authorizing: production admission, production durable-store
implementation, production DB writes, production migration execution, Lane-2 canonical Straylight-store
migrations, public `remember-this`, Discord / freeform ingestion, chat-as-memory, Freeside runtime / client
integration, package exports, LLM / voice / Finn wiring, MVP 3 forget / revoke / correction UI, a route-contract
freeze, a final schema freeze, production readiness, or the discharge of the operative Straylight-side ADR-022E
gate #8 (§16). **Direct production durable-store / SQL-backed implementation is explicitly not the next lane
(§17).**

---

## 19. Codex audit checklist for this acceptance gate

This section is the checklist for a Codex audit of **this docs/decision-only Phase 47B gate** (distinct from the
Phase 46Z §15 checklist, which is the audit of the Phase 47A *implementation* PR — that audit already ran and
returned ACCEPT, §9). Every item must be ACCEPT.

```text
PHASE 47B — DURABLE (MODE 2) ROUTE-STORAGE SPIKE ACCEPTANCE GATE — CODEX AUDIT CHECKLIST
(docs/decision-only; every item must be ACCEPT)

[ ] 1.  Docs-only scope: this gate adds ONLY docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md.
[ ] 2.  No runtime / test / config / source changes: no change to route-storage-durable-spike.ts,
        route-storage-spike.ts, index.ts, no-leak.ts, config.ts, admission-intake.ts, server.ts, migrate.ts,
        copy-migrations.mjs, scope-guards.test.ts, any test, validator, vector, fixture, migration, SQL,
        package / lockfile, env, CI, generated file, or binary; no adjacent repo touched.
[ ] 3.  Exact Phase 47A evidence represented accurately: the three-gate AND + dir wiring (server.ts:655 /
        :678 / :691-693), the config gates (config.ts:455 / :469-470 / :480-483), the durable store
        (route-storage-durable-spike.ts) semantics, the test counts (62 + 10 + 10 + 15 + 12 + 11 = 120), and
        the validator results (5/5 vectors + no sixth; 44/44 self-check; 5/5 probes; 114 = 114 no-leak parity)
        match the merged source / suite.
[ ] 4.  No production overclaim: no positive production-readiness / route-contract-freeze / final-schema-freeze /
        ADR-022E-gate-#8-discharge / production-DB-write / production-migration-execution / durable-production-
        storage / Freeside-runtime / Lane-2-canonical claim; every such phrase appears only negated / blocked.
[ ] 5.  Codex PATCH / hydrate bug represented accurately: the §9 patch-resolution describes the initial hydrate
        exactness / data-minimization gap (unsupported version + unknown / extra keys; tampered candidate_payload
        surviving hydrate / rewrite), the positive exact-key allowlist + declared-fields-only normalization fix,
        the regression tests, and the Codex re-audit ACCEPT; it states NO further 47A implementation patch is
        required.
[ ] 6.  Next lane remains docs / decision-only DECOMPOSITION (Phase 47C — Lane-1 aw_* SQL durable-store /
        migration-runner blocker decomposition), NOT a production implementation lane.
[ ] 7.  Preserved blocked lanes remain explicit (§16) and the §18 invariants / non-authorizations are intact.
[ ] 8.  Validations run and recorded green (§20); corruption / duplicate guard (§21) holds.
```

---

## 20. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`) unless noted. Phase
47B is docs/decision-only — it adds only this document and mutates no runtime source, test, validator, vector,
fixture, migration, or SQL file — so the validators and focused test suites are run only to confirm the
already-merged Phase 47A artifacts remain green.

```bash
git status --short --branch --untracked-files=all
git diff --name-status
git diff --stat
git diff --check
git diff --cached --name-status
git diff --cached --check
# Unchanged / merged-artifact green-checks (no mutation in this phase):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# New-untracked-doc whitespace check (no-index; `|| true` because a missing/clean file is fine):
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md || true
# Focused runtime re-validation of the merged Phase 47A slice (from app/), as live acceptance evidence:
npx --no-install vitest run \
  tests/unit/admission-wedge-spike/route-storage-durable-spike.test.ts \
  tests/unit/admission-wedge-spike/durable-migration-isolation.test.ts \
  tests/unit/admission-wedge-spike/durable-scope-guard-refinement.test.ts \
  tests/unit/admission-wedge-spike/config-gate.test.ts \
  tests/integration/admission-intake/route-storage-durable-spike.test.ts \
  tests/integration/admission-intake/registration.test.ts
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md
```

**Recorded results for this lane** (run during authoring):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md` is added; no runtime source (and
  specifically not `route-storage-durable-spike.ts`, `route-storage-spike.ts`, `no-leak.ts`, `config.ts`,
  `admission-intake.ts`, `server.ts`, `migrate.ts`, `copy-migrations.mjs`, or `scope-guards.test.ts`), no runtime
  test, no route-vector JSON, validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`, package /
  lockfile, config / env, CI, migration, SQL, executable schema, or generated file is touched;
- **validators green (merged / unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes
  valid, 0 failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth
  vector**; the `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail
  closed; 2 exact-key non-over-match guards stay clean);
- **focused Phase 47A runtime re-validation (live acceptance evidence)** — the six Phase 47A suites report
  **120 passed (6 files)**: `route-storage-durable-spike` unit **62**, `durable-migration-isolation` **10**,
  `durable-scope-guard-refinement` **10**, `config-gate` **15**, durable route integration **12**, and
  `registration` **11**; the runtime ↔ validator no-leak parity is unchanged at **114 = 114** (Phase 47A touched
  neither `no-leak.ts` nor the route-vector validator);
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–22 exactly once
  each.

*(The full recorded command output accompanies this lane's operator run report.)*

---

## 21. Corruption / duplicate guard

Phase 47B applies an explicit corruption / duplicate guard to **this** document (carried from the Phase 46I–47A
precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 22.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §19 Codex
  checklist (a `text` block) and the §20 validation command list. **No fenced block is an executable migration or
  runnable schema.**

---

## 22. Cross-references

- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md)
  — Phase 46Z (PR #171); the **authorizing predecessor** — its **Verdict A** authorized the Phase 47A spike and
  its §8–§15 checklist is the bar this gate checks the merged implementation against; its §13 file-scope envelope
  is the boundary Phase 47A stayed within. **Not modified.**
- [`docs/admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md)
  — the Phase 47A enable / disable / durability-semantics / cleanup / rollback runbook; the operational
  source-of-truth for the three env gates + dir, the durable hydrate / data-minimization posture, and the
  fail-closed / degraded / capacity behavior. **Read-only here; not modified.**
- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md)
  — Phase 46W (PR #168); the **direct structural precedent** — the Mode-1 route-storage spike *acceptance* gate
  (accept-as-bounded-spike + what-it-proves / what-it-does-not + next-lane), whose shape this gate reuses one rung
  up for the Mode-2 durable spike. **Not modified.**
- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md)
  and [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md)
  — Phases 46Y / 46X (PR #170 / #169); the migration-guard boundary **design** and the Mode-2 blocker
  **decomposition** the §17 next lane (47C) builds on. **Not modified.**
- [`docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md)
  — Phases 46Q / 46P / 46O; the 114 = 114 runtime ↔ validator no-leak parity Phase 47A inherits **unchanged** over
  the stored / replayed / failure public surfaces (§10). **Not modified.**
- [`docs/ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)
  and [`docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`](admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md)
  — Phases 33R / 33Q; the bounded synthetic admitted-assertion ledger Phase 47A wraps (transitively, via the Phase
  46V Mode-1 engine) and its acceptance. **Not modified.**
- `app/src/services/admission-wedge-spike/{route-storage-durable-spike,route-storage-spike,index,no-leak,public-response,classifier,admitted-assertion-ledger}.ts`,
  `app/src/routes/admission-intake.ts`, `app/src/server.ts`, `app/src/config.ts`, and the Phase 47A test suites
  under `app/tests/unit/admission-wedge-spike/` + `app/tests/integration/admission-intake/` — the merged Phase
  47A implementation, inspected **read-only** to ground §3–§13. **None is modified by this phase.**
- `docs/admission-wedge/route-contract-test-vectors/` (validator + five vector JSONs + README) and
  `docs/admission-wedge/fixtures/` (validator + fixtures) — inspected **read-only** as the unchanged 5-vectors /
  no-sixth / 44-self-check / 5-probes source of truth. **None is modified.**
- `@loa/straylight` — canonical primitive / substrate owner; the `StorageAdapter` / `AuditLog` interface and the
  canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes (cross-repo references, not Dixie
  artifacts); ADR-022E durable-store gate #8 (+ sibling gates #9 / #10 / #11 / #12 / #15 / #20, **held
  operatively**) and ADR-022D receipt / audit-chain invariants are the decision records cited as guardrails (§4 /
  §16). **Not edited by this phase.**
