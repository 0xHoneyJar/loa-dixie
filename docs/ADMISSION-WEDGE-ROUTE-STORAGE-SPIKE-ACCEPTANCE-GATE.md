# Phase 46W — Admission Wedge Dev/Operator Route-Storage Spike Acceptance / Hardening Decision Gate

> **Phase**: 46W
> **Branch context**: `phase-46w-admission-route-storage-spike-acceptance`
> **Related**: Phase 46V (PR #167,
> [`admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md))
> **implemented** the first code-bearing dev/operator route-storage spike lane in **Storage Mode 1**
> (no-migration, bounded-synthetic, in-process, route-owned), authorized narrowly by Phase 46U (PR #166,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md)
> §3–§16); Phase 46T (PR #165) **accepted** the Phase 46S durable-store schema / migration design as the
> draft / non-final baseline; Phase 46S (PR #164) **drafted** that schema (13 `aw_*` tables across 11
> subsections) and §15 the future route-storage spike preconditions; Phases 46O / 46P / 46Q (PR #160 / #161 /
> #162) measured, implemented, and accepted the runtime no-leak mirror at **114 = 114** parity; Phases 33M–33R
> authorized (33M, PR #131), implemented (33N, PR #132), accepted (33O, PR #133) the dev/operator-only route
> spike and implemented (33Q, PR #135) / accepted (33R, PR #136) the bounded synthetic admitted-assertion
> ledger Phase 46V wraps; Straylight (`@loa/straylight`) PR #65 (A–O primitive review, **merged**);
> Straylight-repo ADR-022E durable-store gate #8 (+ sibling gates #9 / #10 / #11 / #12 / #15 / #20, **held
> operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only acceptance gate.** This gate adds **only this document** (plus a minimal
> cross-reference status note in the immediate predecessor Phase 46U gate and the Phase 46V runbook, §14 /
> §16). It modifies **no** runtime source — and specifically does **not** modify
> `app/src/services/admission-wedge-spike/route-storage-spike.ts`, `index.ts`, `no-leak.ts`,
> `app/src/config.ts`, `app/src/routes/admission-intake.ts`, or `app/src/server.ts` — and changes **no** route
> handler, storage / store code, DB write, migration, SQL file, executable schema, auth, consent, route-vector
> JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, other test, package
> export, config, env, package, lockfile, CI, generated file, or binary. No adjacent repository
> (`loa-straylight`, `freeside-characters`) is touched.
> **This is the route-storage spike *acceptance / hardening decision* gate** — the rung downstream of the
> Phase 46V implementation, mirroring the Phase 33N → 33O implement → accept precedent. It **decides whether
> the merged Phase 46V Mode 1 route-storage spike is accepted as the bounded dev/operator proof Phase 46U
> authorized**, records what it does and does not prove, and selects the next safe lane. **It is not the
> spike, and it implements nothing.** It **builds no store, writes no DB, adds no migration, creates no SQL or
> executable schema, executes no migration, implements no auth or consent, changes no route / API behavior,
> freezes neither the route contract nor the final schema, discharges no operative Straylight-side gate, and
> claims no production readiness.**

Every assessment below is grounded **read-only** against the **merged Phase 46V source** in the Dixie repo at
the time of writing: the route-storage spike store
`app/src/services/admission-wedge-spike/route-storage-spike.ts` (411 lines), its barrel
`app/src/services/admission-wedge-spike/index.ts`, the disabled-by-default route handler
`app/src/routes/admission-intake.ts`, the conditional mount + storage-gate wiring in `app/src/server.ts`
(`if (config.admissionIntakeSpikeEnabled)` line 651; nested `if (config.admissionIntakeStorageSpikeEnabled)`
line 674; mount line 700-711), the env parsing in `app/src/config.ts` (`admissionIntakeSpikeEnabled` ←
`DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` line 428; `admissionIntakeStorageSpikeEnabled` ←
`DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED === 'true'` line 442-443), the runtime no-leak guard
`app/src/services/admission-wedge-spike/no-leak.ts` (`FORBIDDEN_PUBLIC_KEYS` `new Set` line 37, **114** keys;
exact-key `Set.has` line 254), the deterministic public-response builder
`app/src/services/admission-wedge-spike/public-response.ts` (closed 8-field allowlist; synthetic
`SYNTHETIC_PUBLIC_RECEIPT_REF` line 24), the classifier
`app/src/services/admission-wedge-spike/classifier.ts` (the five-value `outcome_class` union line 94-99), the
wrapped Phase 33Q ledger `app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`, the Phase 46V
tests (`app/tests/unit/admission-wedge-spike/route-storage-spike.test.ts` — 41 cases;
`config-gate.test.ts`; `no-leak.test.ts` — 163 cases;
`app/tests/integration/admission-intake/route-storage-spike.test.ts` — 16 cases; `registration.test.ts`;
`full-stack.test.ts`), the Phase 46V runbook
`docs/admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`, the route-contract test-vector validator
(5/5 + 44/44 self-check), the five route-vector JSONs, and the Phase 33E fixtures + fixture validator (5/5).
**Phase 46W changes no technical artifact**; the validators and the focused test suites are run only to
confirm the already-merged Phase 46V artifacts remain green, and the predecessor gate documents are reviewed
read-only. **The canonical Straylight `StorageAdapter` interface and the canonical `Assertion` /
`TransitionReceipt` / `AuditEvent` field shapes live in the adjacent `loa-straylight` repository (cross-repo
references, not Dixie file:line) and remain Straylight-owned (§4 / §15).**

---

## 1. Status and verdict

Phase 46W is the bounded, docs/decision-only **route-storage spike acceptance / hardening decision gate** that
follows the merged Phase 46V implementation, exactly as Phase 33O followed Phase 33N. Its purpose is to take
the **merged** Phase 46V Mode 1 route-storage spike and **decide** whether the accumulated, read-only-grounded
evidence is sufficient to **accept** it as the bounded, disabled-by-default, dev/operator-only,
non-production route-storage spike *proof* that Phase 46U authorized — and to record, precisely, what it does
and does not prove — **without performing, executing, authorizing-into-production, freezing, or implementing
anything.**

**What this phase is, stated narrowly and exactly.** Phase 46W:

- is **docs / decision-only**;
- is a **route-storage spike acceptance / hardening decision gate**, *not* a spike implementation, *not* the
  spike *authorization* gate (that is Phase 46U), *not* the schema / migration **design** gate (46S), and
  *not* the schema / migration **design acceptance** gate (46T);
- does **not** modify runtime code or tests — and specifically does not touch `route-storage-spike.ts`,
  `index.ts`, `no-leak.ts`, `config.ts`, `admission-intake.ts`, `server.ts`, or any test;
- does **not** create migrations and does **not** execute any migration;
- does **not** create SQL files or executable schema;
- does **not** write DB code or perform any DB write;
- does **not** change route / API behavior;
- does **not** authorize production admission;
- does **not** freeze the route contract;
- does **not** freeze the final schema;
- does **not** claim production readiness;
- does **not** claim or discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §4 / §15);
- does **not** select direct production durable-store implementation as the next lane (§16).

> **Verdict: A — Phase 46V is ACCEPTED as a bounded, disabled-by-default, dev/operator-only, NON-PRODUCTION,
> Storage Mode 1 (no-migration, bounded-synthetic, in-process, route-owned) Admission Wedge route-storage
> spike proof** — and **NOT** as production storage readiness, **NOT** as a final / canonical schema, **NOT**
> as durable DB-backed admission storage readiness, **NOT** as Freeside / client integration readiness, and
> **NOT** as a completion of MVP 2 or a discharge of the operative Straylight-side ADR-022E gate #8.

This maps to the prompt's verdict **(A)** — *"Phase 46V is accepted as a bounded dev/operator Mode 1
route-storage spike proof."* It rests on the §2–§13 grounded assessment: the Phase 46V implementation stays
**within** the Phase 46U §3–§16 authorization on every axis checked — disabled-by-default and **AND-gated**
(it engages from neither gate alone), Mode 1 (no DB / SQL / migration / file / socket / timer / network),
process-local `Map` state, one independent Phase 33Q ledger per synthetic actor, structural tenant / estate /
**actor** isolation, idempotent replay with conflict fail-closed and **no duplicate / forked admitted
assertion**, reversible tombstone / cleanup with **no silent revival**, actor-label validation, bounded
max-actor **rejection** (never eviction), the `snapshotActorId` TOCTOU closure of the Codex-found
shifting-accessor bug, fixed-synthetic-transition-only writes with the **store result discarded**, an
**unchanged public response body and public input shape** on the store-success path, and the no-leak guard
preserved over every public surface. The full validation suite is green (§5–§13, §17). The single nuance
worth recording — that a *throwing* store correctly collapses to the stable fail-closed public refusal rather
than the success body — is the **intended, authorized, no-leak-tested fail-closed posture** (Phase 46U §11),
recorded as an **accepted known nuance** (§9), **not** a defect requiring a hardening lane.

**The alternative verdicts were considered and rejected:**

- **Verdict (B) — "accepted only with caveats; a bounded hardening lane is required next"** — *rejected.* A
  hardening lane would be warranted only if the read-only assessment surfaced a material defect in the merged
  spike that must be fixed before the spike can be relied on as a proof. The adversarial verification found
  none: 6 of 7 high-stakes invariants confirmed outright, and the 7th ("public body unchanged on/off") is
  confirmed on the store-success path and is, on the store-**failure** path, the *intended* fail-closed
  refusal that Phase 46U §11 required and the Phase 46V tests prove
  (`route-storage-spike.test.ts:257-288`) — a correctly-implemented authorized behavior, not a caveat. The
  Codex-found TOCTOU bug was already fixed in-PR via `snapshotActorId` and is regression-tested
  (`route-storage-spike.test.ts:397-559`), so it is resolved evidence (§8), not an open caveat. No hardening
  lane is owed.
- **Verdict (C) — "held / not accepted, with exact blockers"** — *rejected.* A hold would be warranted if the
  merged spike exceeded the Phase 46U authorization (e.g. wrote a DB row, added a migration, changed the
  public contract, or imported a production store / Freeside / Straylight surface) or breached a preserved
  block. It does none of these: the parser-backed scope guards still pass
  (`scope-guards.test.ts:122-228` durable-write / SQL / migration-token denylist;
  `:185-198` DB / store-import denylist), the public allowlist is unchanged, and the storage path is purely
  in-process. There is no blocker that bars acceptance of the bounded proof.
- **Verdict (D) — "split or redirect before any further lane"** — *rejected.* The spike is already a single,
  bounded, coherent Mode 1 slice; there is nothing to split. No redirect is warranted because the spike did
  exactly what 46U authorized and selected the lowest-blast-radius mode (§5).

**The acceptance is bounded — exactly what it covers, and exactly what it does not.** Accepting this verdict
records only that **the merged Phase 46V Mode 1 route-storage spike is a sound, bounded, dev/operator-only,
non-production proof** of route-owned storage semantics over synthetic material, under the Phase 46U §3–§16
boundaries. It does **not** accept, authorize, or imply: production admission, production durable-store
implementation, production DB writes, production migration execution, any Lane-2 canonical-store migration,
production auth / consent, public `remember-this`, Discord / freeform ingestion, chat-as-memory, Freeside
runtime / client integration, package exports, LLM / voice / Finn wiring, MVP 3 forget / revoke / correction
UI, a route-contract freeze, a final schema freeze, or the discharge of the operative Straylight-side ADR-022E
gate #8 (§15).

---

## 2. Evidence intake

The acceptance is grounded in the following predecessor artifacts and **merged Phase 46V** source files. Each
is cited read-only; none is modified by this gate (except the two minimal cross-reference notes in §14 / §16).
PR numbers are git-sourced from merge-commit subjects (a Dixie convention). Dixie 46-series / 33-series phase
labels and the Straylight ADR-022E "Phase 22" labels are **independent cross-repo labels**.

### 2.1 The acceptance chain (relevant to this acceptance decision)

| Phase | PR | Artifact / contribution (relevant to the route-storage spike acceptance) |
|-------|----|------|
| 33M | #131 | **Dev/operator-only route-spike *authorization* gate.** The structural ancestor; authorized 33N under strict §7–§15 constraints. |
| 33N | #132 | **Dev/operator route spike (implementation).** `POST /api/admission/intake`, disabled-by-default behind `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`, dedicated `x-admission-service-token` + `x-admission-operator-id`, **Storage Option A** (no durable store), runtime `no-leak.ts`. The route surface Phase 46V extends with an optional storage seam. |
| 33O | #133 | **Route-spike acceptance gate.** The **direct structural precedent** for this gate — accepted 33N as a bounded dev/operator spike for MVP 2; not production / final-schema / durable-storage / Freeside readiness. |
| 33Q / 33R | #135 / #136 | **Bounded synthetic admitted-assertion ledger (implementation + acceptance).** Process-local, capacity-bounded (`MAX_ASSERTIONS_CEILING` / `MAX_BYTES_CEILING`; per-estate budgets), `(tenant_id, estate_id)`-scoped, fail-closed, synthetic-only ledger (`assertion_status` ∈ `active` / `superseded`; replay-key + fingerprint de-dup; scope / tenant-conflict errors). **The §5 Mode-1 storage shape Phase 46V wraps** — not durable storage. |
| 46O / 46P / 46Q | #160 / #161 / #162 | **Runtime no-leak mirror — measured, implemented, accepted.** 46O measured the 62-key gap (= 25 from 33Z + 37 from 46J); 46P brought runtime `FORBIDDEN_PUBLIC_KEYS` 52 → 114; 46Q accepted at parity 114 = 114. **The no-leak boundary Phase 46V inherits over the stored / replayed / failure public surfaces.** |
| 46S | #164 | **Durable-store schema / migration DESIGN gate.** Drafted the §6 field-level schema (13 `aw_*` tables across 11 subsections), §7 migration plan (Lane 1 Dixie route-side / Lane 2 canonical), §8–§14 hardening, and **§15 the future route-storage spike preconditions** — explicitly draft / non-final. |
| 46T | #165 | **Durable-store schema / migration design ACCEPTANCE gate.** Accepted the 46S draft (Verdict A); confirmed it could support a future docs-only route-storage spike authorization gate; selected Phase 46U. |
| 46U | #166 | **Dev/operator route-storage spike AUTHORIZATION gate.** **Verdict A** — authorized a future disabled-by-default, dev/operator-only, bounded, reversible, non-production route-storage spike implementation lane (Phase 46V) under §3–§16, with **Mode 1 preferred** and Mode 2 (durable + Lane-1 `aw_*` migrations) conditionally authorized; defined the §3.3 acceptance bar; preserved every blocker; selected Phase 46V as the next lane. |
| 46V | #167 | **Dev/operator route-storage spike (implementation).** Implemented the **Mode 1** route-storage spike — `route-storage-spike.ts` (process-local, one Phase 33Q ledger per synthetic actor, tombstone / cleanup, actor-cap, `snapshotActorId` TOCTOU closure), wired behind the new draft `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED` gate AND-ed with the base route gate, recording only fixed synthetic transitions and discarding the result; added unit + integration tests and the runbook. Codex PATCHed a validate-then-reread actor-scope TOCTOU bug; Claude fixed via `snapshotActorId`; Codex re-audited and ACCEPTed. |
| **46W** | *(this doc; docs/decision-only — not committed / merged yet)* | **Route-storage spike acceptance / hardening decision gate — accepts Phase 46V as a bounded dev/operator Mode 1 route-storage spike proof; does not complete MVP 2 or unblock production; selects Phase 46X.** |

### 2.2 Merged Phase 46V source / test / artifact files inspected (read-only)

- **`app/src/services/admission-wedge-spike/route-storage-spike.ts`** (411 lines) — the Mode 1 store. Sole
  runtime import is `./admitted-assertion-ledger.js` (lines 45-54); state is `new Map<string, ActorSlot>()`
  in the factory closure (line 314); `snapshotActorId` (lines 288-292); `liveLedgerFor` (316-331); per-actor
  ledger creation (357-362); `tombstoneActor` (385-397); actor-cap rejection (353-356); `assertSyntheticActor`
  (194-216); error classes that never echo the rejected value (128-164). **Read-only.**
- **`app/src/services/admission-wedge-spike/index.ts`** — the internal service barrel; **not** re-exported
  from any package entrypoint (no `src/index.ts` re-export, no package `exports`; lines 45-47, 81-83).
  **Read-only.**
- **`app/src/routes/admission-intake.ts`** — the route handler; the optional storage DI seam (lines 132-142);
  the fixed synthetic constants (152-157); `synthTransitionFor` (171-200); the single guarded send path
  `sendPublicResponse` with the no-leak guard at line 288 and the fail-closed fallback at 294-299; the storage
  write inside the same guarded try (406-423) with the result **intentionally discarded** (398-405) and a
  throw collapsing to `failClosedRefusalBody()` at 400 (424-426); the deterministic public body built in step
  5 independently of the store (428-448). **Read-only.**
- **`app/src/server.ts`** — the conditional mount: outer base gate `if (config.admissionIntakeSpikeEnabled)`
  (line 651), nested storage gate `if (config.admissionIntakeStorageSpikeEnabled)` (line 674) creating /
  seeding / injecting the store (675-693), the mount at `/api/admission/intake` (700-711). When the storage
  gate is off, `routeStorageSpikeDeps` stays `{}` (668-673) and no store dep is injected. **Read-only.**
- **`app/src/config.ts`** — `admissionIntakeSpikeEnabled` ← `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`
  (line 428, "No production defaults"); `admissionIntakeStorageSpikeEnabled` ←
  `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED === 'true'` (lines 442-443, "Inert unless
  admissionIntakeSpikeEnabled is also true (ANDed at mount)" 129); env docs (198, 216). **Read-only.**
- **`app/src/services/admission-wedge-spike/no-leak.ts`** — `FORBIDDEN_PUBLIC_KEYS` `new Set` (line 37), **114**
  keys, exact-key `Set.has` (254); `FORBIDDEN_SUBSTRINGS` (181); `FORBIDDEN_PATTERNS` (198); `UUID_RE` (212);
  `MAX_OPAQUE_RUN = 24` (217). **Read-only, unchanged.**
- **`app/src/services/admission-wedge-spike/public-response.ts`** — the closed 8-field allowlist (`spike`,
  `outcome_class`, `scenario_id`, `recall_eligible`, `recall_projection`, `public_receipt_ref`,
  `safe_reason_code`, `draft_markers`); synthetic `SYNTHETIC_PUBLIC_RECEIPT_REF` (line 24). **Read-only.**
- **`app/src/services/admission-wedge-spike/classifier.ts`** — the five-value `outcome_class` union
  (`accepted_as_proposed` / `admitted` / `denied` / `superseded_with_correction` / `refused`; lines 94-99).
  **`admitted` is the public outcome *label*; `active` is the canonical assertion *status* (ledger), never a
  public `outcome_class`.** **Read-only.**
- **`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`** (Phase 33Q) — the wrapped ledger;
  zero imports; `Buffer.byteLength` (605) is the only Node API (pure byte counting, not I/O); replay
  idempotent / conflict (743-760); `assertion_status` ∈ `active` / `superseded`; per-estate capacity bounds.
  **Read-only.**
- **`app/tests/unit/admission-wedge-spike/`** (`route-storage-spike.test.ts` 41 cases, `config-gate.test.ts`,
  `no-leak.test.ts` 163 cases, `scope-guards.test.ts` 17 cases, plus `admitted-assertion-ledger.test.ts`,
  `auth-gate.test.ts`, `classifier-scenarios.test.ts`) and
  **`app/tests/integration/admission-intake/`** (`route-storage-spike.test.ts` 16 cases,
  `registration.test.ts`, `full-stack.test.ts`, plus `route-gate.test.ts`, `store-coupled.test.ts`) — the
  Phase 46V test surfaces. **Read-only.**
- **`docs/admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`** — the enable / disable / kill-switch /
  rollback runbook for the spike. **Read-only here; gains only a minimal §16 acceptance status note.**
- **`docs/admission-wedge/route-contract-test-vectors/`** (validator + five vector JSONs + README) and
  **`docs/admission-wedge/fixtures/`** (validator + fixtures) — the unchanged 114-key / five-vectors / 5/5
  source of truth. **Read-only.**
- **The Phase 46U authorization gate** and the predecessor gate documents (the §2.1 chain) — read-only to
  ground §3–§15.
- **Adjacent `loa-straylight` (cross-repo, read-only context).** The canonical `StorageAdapter` / `AuditLog`
  interface and `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes are Straylight-owned (cited
  cross-repo); their concrete shapes are deliberately **not** redefined here (§4 / §15).

---

## 3. What Phase 46V proves

Each item below is grounded **read-only** against the merged Phase 46V source and confirmed by the passing
test suites (§17). It proves these properties **for a disabled-by-default, dev/operator-only, NON-PRODUCTION,
Mode 1 route-storage spike** — nothing more.

- **Mode 1 route-owned storage is possible with no migrations / SQL / DB writes.** The store's sole runtime
  import is the Phase 33Q ledger (`route-storage-spike.ts:45-54`); the ledger imports nothing; all state is JS
  `Map`s in factory closures (`route-storage-spike.ts:314`; `admitted-assertion-ledger.ts` per-estate maps);
  the only Node API used anywhere is `Buffer.byteLength(...)` (pure byte counting). The parser-backed scope
  guard still forbids any durable-write / SQL / migration token and any DB / store-import in the spike path
  (`scope-guards.test.ts:122-228`, `:185-198`).
- **Default-off storage gate.** `admissionIntakeStorageSpikeEnabled` parses via strict `=== 'true'`, so unset
  / blank / malformed is `false` (`config.ts:442-443`); the test baseline sets it false
  (`registration.test.ts`).
- **AND-gating with the base admission-intake gate.** The store is created / seeded / injected **only** inside
  `if (config.admissionIntakeStorageSpikeEnabled)` (`server.ts:674`), which is **nested inside**
  `if (config.admissionIntakeSpikeEnabled)` (`server.ts:651`); the route handler additionally guards the
  store write on a 4-way AND of all injected store deps (`admission-intake.ts:406-411`).
- **No activation from the storage gate alone.** With the base gate off, line 674 is never reached (the outer
  `if` is false) and the route is **not registered at all** — a request falls through to the SPA
  (`registration.test.ts:131-138`).
- **No activation from the base route gate alone.** With the base gate on but the storage gate off,
  `routeStorageSpikeDeps` stays `{}` (`server.ts:668-673`); no store dep is injected, so the 4-way AND at
  `admission-intake.ts:406-411` is false and the route runs the Phase 33N no-store path verbatim.
- **No production storage fallback.** `config.ts` declares "No production defaults"; the store never falls back
  to a durable / production path; the absence of config means disabled, not production.
- **Route public response body unchanged (store-success path).** The public body is built by
  `buildAdmissionSpikePublicResponse(classification)` in step 5 (`admission-intake.ts:433`), independently of
  the store; on the store-success path the body is **byte-identical** to the no-store path
  (`route-storage-spike.test.ts:105-135`, `expect(t2).toBe(t1)`). *(For the store-failure path, see §9 — the
  intended fail-closed refusal.)*
- **Accepted public input unchanged.** Classification runs on the parsed `raw` request alone
  (`admission-intake.ts:357`); the spike adds no input field; the recorded transition is built only from fixed
  synthetic constants (`admission-intake.ts:152-157`, `171-200`), never from request material.
- **No public `remember-this`; no Discord / freeform ingestion; no chat-as-memory.** The route accepts only
  the five strict synthetic scenario forms; no public / unauthenticated remember-this surface, no Discord /
  history ingestion path, no chat-derived memory exists in the spike.
- **Fixed synthetic transition material only.** `synthTransitionFor` emits constants for `accept` /
  `supersede` and `null` for `pending` / `reject` / `malformed` (`admission-intake.ts:171-200`); the ledger
  also validates every field to a bounded synthetic shape, so no-raw-payload is enforced, not assumed.
- **Store result discarded.** The return value of `routeStorageSpikeStore.record(...)` is never assigned or
  surfaced (`admission-intake.ts:414`; "result is intentionally discarded — NEVER surfaced" 398-405); tests
  assert no store ids appear on the wire (`route-storage-spike.test.ts:181-186`).
- **No-leak guard preserved.** Every public response is deep-walked by the runtime no-leak guard before send
  (`admission-intake.ts:288`); a finding / throw collapses to a fixed safe fallback at 500, not re-guarded,
  carrying none of the findings (`admission-intake.ts:294-299`).
- **Tenant / estate / actor isolation.** Tenant + estate scoping is preserved by the wrapped ledger
  (`ledgerScope`, `route-storage-spike.ts:273-275`; foreign-tenant fail-closed in the ledger); **actor**
  isolation is **structural** — one independent ledger per actor in its own closure
  (`route-storage-spike.ts:357-362`), so cross-actor state is unreachable, not merely guarded
  (`route-storage-spike.test.ts:166-186` cross-actor non-collision).
- **Idempotent replay.** Identical replay under the same key returns the prior outcome and mints nothing
  (delegated to the ledger, `admitted-assertion-ledger.ts:743-760`).
- **Conflict fail-closed.** Same-key / different-content replay throws (conflict) before any admit / supersede
  dispatch (`admitted-assertion-ledger.ts:756-759`); at the route a store throw collapses to the stable 400
  refusal (`admission-intake.ts:424-426`); tested at `route-storage-spike.test.ts:242-252`, `:257-288`.
- **No duplicate admitted / corrected assertions on replay.** The replay-map check precedes any mutation, so
  neither `applyAdmit` nor `applySupersede` is reached on a conflicting / duplicate replay — no overwrite or
  fork is structurally possible.
- **Tombstone / cleanup behavior.** `tombstoneActor` marks the slot `{tombstoned: true, ledger: null}`,
  releasing synthetic state without evicting the slot (so the actor stays counted and cannot be silently
  revived); after it, reads return empty and writes fail closed (`route-storage-spike.ts:385-397`, `326-329`,
  `344-346`).
- **Actor-label validation.** `assertSyntheticActor` checks type → emptiness → length (≤128) →
  unsafe-substring denylist (incl. `secret` / `token` / `sentinel`) → shape regex, throwing without echoing
  the value (`route-storage-spike.ts:194-216`, `128-139`).
- **Max-actor capacity.** Seeding a NEW actor beyond `maxActors` throws (bounded **rejection**, never eviction;
  tombstoned actors stay counted) (`route-storage-spike.ts:353-356`, `106-108`).
- **Actor-scope TOCTOU closure through `snapshotActorId`.** `scope.actor_id` is read exactly once into a local,
  validated, and returned; every map operation keys off the local, never re-reading the property
  (`route-storage-spike.ts:288-292`); proven by shifting-getter tests asserting `reads() === 1` and no
  revival / cross-actor effect (`route-storage-spike.test.ts:397-559`).
- **Non-durability / process-local behavior.** A second store instance shares no state — the "restart
  analogue" (`route-storage-spike.test.ts:342-353`).
- **Full validation suite passing.** §17 records the green run.

---

## 4. What Phase 46V does not prove

Phase 46V is a disabled-by-default, dev/operator-only, NON-PRODUCTION, Mode 1 route-storage spike. It does
**not** prove (and does not claim to prove) any of the following:

- **production durable-store implementation** — Mode 1 persists nothing durable; there is no durable store to
  validate;
- **durable DB-backed admission storage** — no DB is opened, no row is written;
- **SQL schema correctness** — no SQL or executable schema exists in the spike;
- **migration correctness** — no migration file is created or run;
- **production migration execution** — none performed;
- **production DB writes** — none performed;
- **Lane-2 canonical Straylight-store migrations** — none; canonical semantics stay Straylight-owned (§15);
- **production admission** — the spike is dev/operator-only and disabled by default; it admits nothing to
  production;
- **production auth / consent** — the dev/operator service-token / operator-id gate is **not** end-user
  authorization and **not** consent; no consent model is implemented (§12);
- **public `remember-this`** — none exists;
- **Discord / freeform history ingestion** — none exists;
- **user chat becoming memory** — none exists; no chat-derived path;
- **Freeside runtime / client integration** — no `freeside` import or call; the spike performs no Freeside
  behavior;
- **package API readiness** — the spike adds no package export and no `src/index.ts` re-export
  (`index.ts:45-47`, `81-83`);
- **LLM / voice / Finn wiring** — none;
- **MVP 3 forget / revoke / correction UI** — none;
- **route-contract freeze** — `route_contract_final` stays false on every vector;
- **final schema freeze** — `schema_final` stays false; the accepted Phase 46S §6 design is draft / non-final;
- **production readiness** — undefined and fully blocked (§15);
- **operative Straylight-side ADR-022E gate #8 discharge** — there is **no repo evidence** of an operative
  Straylight-side discharge; gate #8 (and siblings #9 / #10 / #11 / #12 / #15 / #20) remain **held** (§15).

---

## 5. Mode 1 acceptance assessment

Assessed specifically against the Phase 46U §6 Mode-1 definition. Mode 1 is **accepted as appropriate**:

- **no migrations** — none created or run (`scope-guards.test.ts:122-228` migration-token denylist still
  passes);
- **no SQL** — none; the SQL-token denylist still passes;
- **no executable schema** — none;
- **no DB writes** — the only persistence is JS `Map` state;
- **process-local `Map` state** — `route-storage-spike.ts:314`; per-actor ledgers at `357-362`;
- **no DB / file / socket / timer / network dependency** — sole import is the ledger
  (`route-storage-spike.ts:45-54`); the only Node API is `Buffer.byteLength` (pure);
- **non-durable by design** — a second instance shares no state (`route-storage-spike.test.ts:342-353`); a
  process restart is a complete reset (no recallable residue);
- **safe for dev/operator proof only** — disabled-by-default, AND-gated, dev/operator-credentialed,
  synthetic-only;
- **not a production storage model** — it persists nothing durable and is not production-authorized; it is
  disabled by default and dev/operator-only;
- **not a substitute for future durable-store design, migration, or production auth / consent gates** — those
  remain separate, blocked lanes (§15).

**Why Mode 1 was correct.** Mode 1 was the appropriate choice because **Mode 2 (durable + Lane-1 `aw_*`
migrations) would have required migration / schema / DB surface area and production migration-set risk.** As
the merged spike header and runbook record (`route-storage-spike.ts:9-15`; runbook §"What it is"), the Phase
33N scope guards forbid any durable-write / SQL / migration token and any production-store import in the spike
path, and the repo's **global migration runner would adopt any new migration into the *production* set** — so
a durable Mode 2 cannot be added narrowly without weakening an existing security guard. Mode 1 proves the
route-owned storage semantics (idempotency, replay, conflict, isolation, tombstone, capacity, no-leak) with
the **lowest blast radius** (Phase 46U §6 / §7), which is exactly what an authorization-gated spike should do.
The choice surfaced a real architectural blocker for any future durable mode — the migration-runner-adoption /
scope-guard tension — which §16 selects as the next docs/decision-only lane to decompose.

---

## 6. Gate and config assessment

- **`DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED` is draft / non-final.** The merged config comment and the
  runbook both label it a draft / non-final name (`config.ts:122-130`; runbook §"Enable", §"Default (off)").
- **Strict true-only parsing.** `admissionIntakeStorageSpikeEnabled: process.env.DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED === 'true'`
  (`config.ts:442-443`).
- **Missing / blank / malformed values stay disabled.** Anything other than exactly `'true'` parses to `false`
  (fail-closed default).
- **Storage disabled by default.** No production default-on behavior; the base gate parses identically
  (`config.ts:428`, "No production defaults").
- **Base route gate and storage gate are AND-gated.** Structural nesting: `server.ts:674` inside
  `server.ts:651`; documented at `config.ts:129` ("Inert unless admissionIntakeSpikeEnabled is also true
  (ANDed at mount)").
- **Route intake gate alone does not activate storage.** With the storage gate off, `routeStorageSpikeDeps`
  stays `{}` (`server.ts:668-673`) → no store dep → the 4-way AND at `admission-intake.ts:406-411` is false.
- **Storage gate alone does not mount or activate the route.** With the base gate off, the nested block is
  unreachable and the route is not registered at all (`registration.test.ts:131-138`).
- **Service-token / operator allowlist behavior preserved.** The dev/operator gate (`x-admission-service-token`
  + `x-admission-operator-id`) is unchanged; with both empty the enabled route rejects all calls (fail-closed;
  `admission-intake.ts:315-327`).
- **No production fallback.** Absent config means disabled, not production.

---

## 7. Route integration assessment

- **Optional DI does not change existing behavior by default.** The store is an optional dependency
  (`admission-intake.ts:132-142`); with no store injected, the route runs the Phase 33N path verbatim.
- **Store write happens only under intended gates.** The write is guarded by a 4-way AND on the store + the
  full synthetic (tenant, estate, actor) scope deps (`admission-intake.ts:406-411`), which are injected only
  inside both env gates (`server.ts:674`, `688-693`).
- **Store write uses fixed synthetic transition constants, not raw request material.** `synthTransitionFor`
  builds from constants (`admission-intake.ts:152-157`, `171-200`); the spike body carries only `spike` +
  `transition_intent`.
- **Store result is discarded.** Never assigned or surfaced (`admission-intake.ts:414`, comment 398-405).
- **Public response body unchanged (success path).** Built in step 5 independently of the store
  (`admission-intake.ts:433`); byte-identical to no-store on success (`route-storage-spike.test.ts:105-135`).
- **Public input shape unchanged.** No input field added; classification on `raw` alone
  (`admission-intake.ts:357`).
- **Store failure collapses to a stable public refusal.** The store write is inside the same guarded try; a
  throw is caught by a bindingless `catch` returning `failClosedRefusalBody()` at HTTP 400
  (`admission-intake.ts:424-426`, `226-239`) — atomic, no recallable residue (§9, §13).
- **No raw storage errors exposed.** The `catch` discards the error object entirely; the no-leak guard
  deep-walks every send; a throwing store leaks neither the error text nor any id
  (`route-storage-spike.test.ts:257-288`).

---

## 8. Store implementation assessment

- **Process-local `Map` state.** `route-storage-spike.ts:314`.
- **One independent Phase 33Q ledger per synthetic actor.** Each `ActorSlot` owns its own ledger
  (`route-storage-spike.ts:264-269`, created at `357-362`).
- **Tenant + estate scoping preserved by the wrapped ledger.** `ledgerScope` projects (tenant, estate, actor)
  onto the ledger's (tenant, estate) (`route-storage-spike.ts:273-275`); the ledger enforces foreign-tenant /
  unseeded-estate fail-closed.
- **Actor isolation structural.** Separate closures per actor — cross-actor state is unreachable, not a
  bypassable runtime check (`route-storage-spike.ts:17-27`, `357-362`).
- **Actor-label validation.** `assertSyntheticActor` (`route-storage-spike.ts:194-216`).
- **Max-actor capacity.** Bounded rejection beyond `maxActors`; tombstoned actors stay counted
  (`route-storage-spike.ts:353-356`, `106-108`).
- **Idempotency / replay / conflict semantics preserved.** Delegated to the ledger
  (`admitted-assertion-ledger.ts:743-760`).
- **Tombstone / cleanup behavior.** Reversible kill path; releases ledger; idempotent; no-op for unseeded
  (`route-storage-spike.ts:385-397`).
- **No silent revival after Codex PATCH.** A tombstoned actor cannot be re-seeded into a live ledger
  (`route-storage-spike.ts:344-346`); tested (`route-storage-spike.test.ts:397-430`).
- **`snapshotActorId` closes the shifting-accessor TOCTOU.** Single read + validate + local-only use
  (`route-storage-spike.ts:288-292`; consumers 316-331 / 341-362 / 389-396 / 402-404).
- **No secrets / tokens / private signer material / unbounded debug blobs / raw chat / LLM prompts stored.**
  Only bounded synthetic labels pass validation; `secret` / `token` / `sentinel` substrings are denylisted in
  both the store actor-label check (`route-storage-spike.ts:177-188`) and the ledger field validation; errors
  never echo rejected values (`route-storage-spike.ts:128-164`).

---

## 9. Patch-resolution assessment

The Codex Phase 46V PATCH and its resolution are recorded here as **resolved evidence** (not an open caveat):

- **Issue.** A validate-then-reread of `scope.actor_id`: the store validated the actor label on one property
  access, then re-read `scope.actor_id` for the subsequent map operation. A caller-owned **shifting accessor**
  (a getter returning a benign / unseeded decoy on the validating read, then a different value on the map-op
  read) could divert the operation across actor isolation.
- **Impact.** A shifting getter could **revive a tombstoned actor** (validate as an unseeded decoy, skip the
  tombstone branch, then `set` a live ledger onto the tombstoned key) and make it recallable, or otherwise
  read / write across actor isolation — a TOCTOU bypass.
- **Fix.** `snapshotActorId(scope)` (`route-storage-spike.ts:288-292`) reads `scope.actor_id` **once** into a
  local, validates the **local** value via `assertSyntheticActor`, and returns the **primitive local**; every
  subsequent `actors.get` / `actors.set` / tombstone check keys off the local, never re-reading the property.
- **Fixed APIs.** `liveLedgerFor` (`316-331`), `seedScope` (`341-362`), `tombstoneActor` (`389-396`),
  `isActorTombstoned` (`402-404`); and **through `liveLedgerFor`**: `record` (`365-368`), `projectRecall`
  (`370-373`), `inspectScope` (`375-378`), `auditTrail` (`380-383`).
- **Tests added** (`route-storage-spike.test.ts:376-559`), each asserting `reads() === 1` via an
  `Object.defineProperty` shifting getter: `seedScope` cannot revive a tombstoned actor (398-430); `record`
  cannot write as a tombstoned actor into a live actor (432-472); reads cannot leak another live actor through
  a tombstoned scope (474-503); no actor echo / public leak (505-544); the unsafe second getter value is not
  read / no unsafe-label smuggling (546-559).
- **Codex re-audit verdict: ACCEPT.**

This gate confirms the fix is present in the merged source and regression-tested, and treats the
shifting-accessor TOCTOU as **closed**.

---

## 10. No-leak / public-private assessment

- **Public response unchanged.** Built by the closed 8-field allowlist
  (`public-response.ts`); on the store-success path byte-identical to no-store
  (`route-storage-spike.test.ts:105-135`).
- **Existing no-leak guard still applies.** Every send is deep-walked
  (`admission-intake.ts:288`); 114-key `FORBIDDEN_PUBLIC_KEYS` exact-key `Set.has` (`no-leak.ts:37`, `254`) +
  substring / regex / UUID / opaque-run walls (`181` / `198` / `212` / `217`).
- **Stored public responses no-leak tested.** Accept-with-store returns no store ids on the wire
  (`route-storage-spike.test.ts:181-186`).
- **Replayed public responses no-leak tested.** Replayed responses are deep-walked exactly like fresh ones
  (integration `route-storage-spike.test.ts:189-199`).
- **Conflict / failure responses no-leak tested.** A throwing store returns 400 / refused with no error text,
  no `secret`, and `findAdmissionPublicLeaks(body) === []` (`route-storage-spike.test.ts:257-288`).
- **Private storage / audit / source / debug / auth / signer / consent internals not on the wire.** The route
  never serializes store output; the store result is discarded (`admission-intake.ts:414`); read accessors
  (`auditTrail` / `projectRecall` / `inspectScope` / `actorCount`) are never called by the route, and there is
  no GET surface.
- **Store ids, actor ids, audit fields, receipt refs, storage keys, and ledger internals not public.**
  Enforced structurally (allowlist builder) and defensively (114-key guard, which forbids `admitted_assertion_id`,
  `actor_id`, `tenant_id`, `estate_id`, `*_ref`, `audit_event`, `storage_internals`, etc.).
- **`active` is not a public `outcome_class`.** The union excludes `active` (`classifier.ts:94-99`); `active`
  is the canonical assertion *status* only.
- **Source-real public `outcome_class` values remain:** `accepted_as_proposed`, `admitted`, `denied`,
  `superseded_with_correction`, `refused` (`classifier.ts:94-99`).
- **`recall_eligible` remains derived / projection-only.** A deterministic draft flag over synthetic
  placeholders, never persisted as canonical authority (Phase 46U §16.15).

> **Residual surface (noted, not a defect).** The runtime guard is exact-key (`Set.has`) with no substring /
> prefix matching: a hypothetical *future* durable-store serializer that emitted a brand-new private key name
> absent from the 114-key set would be caught only if its *value* matched a UUID / opaque-run / forbidden
> pattern. This is the explicitly-acknowledged guard design (`no-leak.ts:13-26`) and is mitigated for Mode 1
> by the structural 8-field allowlist builder (the route never serializes store output). It is recorded here
> as the one residual surface for any **future** Lane-2 / durable serializer work — out of scope for the Mode
> 1 acceptance.

---

## 11. Idempotency / replay / conflict assessment

- **Identical replay returns the prior safe result or equivalent.** Delegated to the ledger replay map
  (`admitted-assertion-ledger.ts:743-754`).
- **Same-key different-content conflict fails closed.** Throws before any admit / supersede dispatch
  (`admitted-assertion-ledger.ts:756-759`); at the route → stable 400 (`admission-intake.ts:424-426`).
- **No duplicate admitted / corrected assertion on replay.** The replay-map check precedes mutation; an
  assertion-id collision is independently caught (`admitted-assertion-ledger.ts:773-779`, `858-863`).
- **No forked assertion on conflicting replay.** Neither `applyAdmit` nor `applySupersede` is reached on a
  conflict — structurally impossible to fork.
- **Replay scope includes tenant / estate / actor.** Per-actor independent ledger × per-estate replay map,
  scoped by `(tenant_id, estate_id)` inside each actor (`route-storage-spike.ts:357-362`;
  `admitted-assertion-ledger.ts`).
- **Same key across actors does not collide.** Independent ledgers per actor — both return `recorded`
  (`route-storage-spike.test.ts:166-186`).
- **Same key across tenant / estate does not collide.** Per-estate replay map keyed by estate; foreign-tenant
  fail-closed before the replay map is consulted.
- **No cross-tenant / cross-estate / cross-actor replay.** Enforced by the scoped key + structural actor
  isolation (§12).
- **Replay key / payload bounds exist.** Per-estate capacity bounds (inherited from 33Q); the content
  fingerprint covers every identity-defining field and is injection-free (the synthetic-label regex excludes
  the `|` join delimiter).
- **Conflict response leaks no private details.** No idempotency key, fingerprint, or conflict detail crosses
  to the public surface; the conflict collapses to the stable public-safe 400.

> The **final keying strategy**, durable replay-envelope shape, and TTL policy remain **undecided** (Row J
> held; `idempotency_final` false). Phase 46V implements **draft / dev-only** idempotency behavior; it does
> **not** claim final idempotency.

---

## 12. Tenant / estate / actor isolation assessment

- **All stored records scoped by tenant / estate / actor where applicable.** `(tenant, estate)` via the
  wrapped ledger; `actor` via one independent ledger per actor.
- **Cross-tenant reads return empty or fail closed.** Foreign-tenant fail-closed in the ledger.
- **Cross-estate reads return empty or fail closed.** Per-estate slot resolution; unseeded → empty / fail
  closed.
- **Cross-actor reads return empty or fail closed.** Structurally unreachable across closures; reads on an
  unseeded / tombstoned actor return the frozen empty constants without throwing
  (`route-storage-spike.ts:294-299`, `370-383`); writes fail closed.
- **Cross-scope writes fail closed or create independent scoped records only where safe.** A new actor creates
  its own ledger (bounded by `maxActors`); a tombstoned actor cannot be revived
  (`route-storage-spike.ts:344-346`).
- **Synthetic operator authority remains dev-only.** The `x-admission-operator-id` allowlist is a dev/operator
  isolation mechanism, never the production binding; the synthetic actor binding is a spike isolation
  mechanism, not the final production binding (`route-storage-spike.ts:36-38`).
- **Service auth / operator allowlist remains separate from end-user consent.** A valid service credential
  proves a service may call Dixie; it is not end-user authorization and not consent (§ below).
- **No cross-user admission without an explicit future consent model.** Synthetic subjects only; identity is
  session-derived, never body-trusted; no end-user consent model is implemented.

---

## 13. Failure / rollback / capacity assessment

- **Throwing store produces a stable public refusal.** `failClosedRefusalBody()` at HTTP 400
  (`admission-intake.ts:424-426`, `226-239`).
- **No storage error / stack / key / actor-id / ledger internals leak.** Bindingless `catch` discards the
  error; the no-leak guard deep-walks the refusal (`route-storage-spike.test.ts:257-288`).
- **Store not invoked for pending / reject / malformed cases.** `synthTransitionFor` returns `null` for those
  scenarios, so the route only touches the store for `accept` / `supersede`
  (`admission-intake.ts:194-200`, `412-413`).
- **No recallable assertion unless the full transition succeeds.** The store write is inside the guarded
  finalization try; a throw leaves the store exactly as it was (atomic).
- **No partial admitted-assertion residue after simulated failure.** Conflict / capacity / scope / tombstone
  throws mint nothing; the bounded ledger is left unchanged.
- **Retry behavior safe.** Idempotent replay returns the prior outcome; conflicting retry fails closed (§11).
- **Tombstone / cleanup removes residue.** Tombstoning releases synthetic state; the actor becomes
  non-recallable (empty projection / zero footprint / empty audit) (`route-storage-spike.ts:385-405`).
- **Tombstoned actor cannot be silently revived.** Re-seed fails closed (`route-storage-spike.ts:344-346`);
  tested (`route-storage-spike.test.ts:397-430`).
- **Capacity overflow fails closed.** Bounded rejection beyond `maxActors`
  (`route-storage-spike.ts:353-356`); per-estate budgets inherited from 33Q.
- **Oversized payloads rejected / fail closed safely.** The classifier accepts only the five forms; oversized
  bodies and parse failures fail closed at 400 (`admission-intake.ts:329-351`).
- **Non-durability / restart behavior tested via a fresh instance.** Second-instance no-shared-state
  (`route-storage-spike.test.ts:342-353`).
- **Degraded / disabled behavior safe.** A disabled spike leaks nothing (route not mounted / no store
  injected); an unauthorized caller gets a stable refusal that never reveals which gate failed.

---

## 14. Runbook assessment

`docs/admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md` was reviewed read-only; it **accurately**
states every required disclaimer:

- **draft / non-final** — status banner ("Draft / non-final.") and the draft gate-name notes;
- **disabled by default** — "Disabled by default." + the two-gate "Default (off)" section;
- **dev/operator-only** — "dev/operator-only route-storage spike"; the credential gate note;
- **no production DB writes** — "Storage Mode 1 … no database, no durable write, no migration";
- **no production migrations** — same banner + "What it is" rationale;
- **no public `remember-this`** — non-authorization banner;
- **no Discord / freeform ingestion** — non-authorization banner;
- **no chat-as-memory** — non-authorization banner;
- **no route-contract freeze** — non-authorization banner;
- **no final schema freeze** — non-authorization banner ("a final schema freeze");
- **no production readiness** — "claims no production readiness";
- **no operative Straylight-side gate discharge** — "discharges no operative Straylight-side gate".

The runbook also transparently documents the spike's **runtime reachability** behind the two env gates (unlike
the 33Q test-seam-only ledger), the kill switch / rollback (Mode 1 persists nothing durable; the in-process
tombstone path; a restart is a complete reset), and the fail-closed / capacity posture. **No disclaimer is
missing or weaker than claimed.** This gate adds only a minimal one-line acceptance status note to the runbook
(§16). *(Structural observation, not a defect: the runbook concentrates its non-claims in a single status
banner rather than a standalone "§Blocked lanes" section as the 33Q runbook does; every non-claim is still
present.)*

---

## 15. Remaining blockers

After Phase 46W, the following remain **blocked**, regardless of the verdict — **none** is unblocked by this
acceptance gate:

- **production durable-store implementation** — blocked;
- **production DB writes** — blocked;
- **production migration execution** — blocked;
- **Lane-2 canonical Straylight-store migrations** — blocked (separate ADR + sibling-repo PR under Straylight
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
- **final schema freeze** — blocked; `schema_final` stays false;
- **production readiness of any kind** — not claimed;
- **operative Straylight-side ADR-022E gate #8 discharge** — not claimed (no repo evidence); sibling gates #9
  / #10 / #11 / #12 / #15 / #20 remain held. **This remains the dominant cross-repo blocker** for production
  admission and any Lane-2 canonical-store migration.

> Accepting this bounded Mode 1 spike proof unblocks **no** production / public / canonical-store / Freeside /
> LLM / package / freeze work. Every lane above remains its own separately-authorized future gate.

---

## 16. Next lane

The evidence is sufficient to accept the Phase 46V Mode 1 spike (§3, §17); the merged spike stays within the
Phase 46U §3–§16 authorization on every axis; and the spike **surfaced a concrete architectural blocker** for
any future durable mode — the global migration runner adopting any new migration into the production set, and
the scope guards forbidding durable-write / SQL / migration tokens, which together forced Mode 1 over Mode 2
(§5). Direct production durable-store implementation, production DB writes, production migration execution,
production admission, and the operative Straylight-side gate #8 all remain blocked (§15).

> **Selected next lane: Phase 46X — Dev/operator durable (Mode 2) route-storage enablement *blocker
> decomposition* gate (docs / decision-only).**

> **Phase 46X status note (added later).** Phase 46X
> ([`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md),
> docs/decision-only) executed this lane and reached **Verdict A — Mode 2 remains BLOCKED; the blocker is
> decomposed into required future gates.** It grounded the blocker in the migration runner
> (`app/src/db/migrate.ts:76-85` scans the whole shared dir; `app/src/server.ts:299-301` runs it ungated in
> production) and the Phase 33N scope guards (`app/tests/unit/admission-wedge-spike/scope-guards.test.ts:122-198`
> forbid durable-write / SQL / migration tokens and production-store imports), and selected only a
> **docs/decision-only Phase 46Y migration-isolation / scope-guard boundary design lane** next. It authorizes
> **no** Mode 2 implementation, durable storage, migration, production DB write, or migration execution.

- **What it is.** A **docs / decision-only** gate that decomposes, precisely and read-only, the blocker the
  Phase 46V spike surfaced: *how (if ever) a dev/operator-only, disabled-by-default durable Mode 2 route-storage
  spike could be safely sequenced given that (a) the repo's global migration runner adopts any new migration
  into the **production** migration set, and (b) the Phase 33N scope guards forbid any durable-write / SQL /
  migration token and any production-store import in the spike path.* It decomposes the migration-isolation,
  scope-guard-relaxation-vs-preservation, down-migration / drop-empty-table, and dev-only-runner options into
  separately-gateable sub-lanes, and names which remain blocked behind the operative gate #8.
- **The precise blocker it decomposes.** Phase 46U §6 / §7 conditionally authorized Mode 2 (dev-only durable +
  Lane-1 `aw_*` migrations) "subject to a separate Codex audit," but Phase 46V **declined** Mode 2 because the
  two constraints above cannot both hold while a durable migration is added without weakening an existing
  security guard. That tension is a genuine, evidence-grounded architectural question that must be decomposed
  on paper **before** any durable implementation could be safely authorized. Decomposing it does **not**
  authorize, implement, or sequence durable storage; it only maps the blocker.
- **What it must remain.** Docs / decision-only; it implements no store, writes no DB, adds no migration,
  creates no SQL or executable schema, changes no route / API behavior, freezes nothing, and discharges no
  Straylight-side gate. It preserves every §15 block.
- **Why not the alternatives.**
  - **Direct production durable-store implementation** as 46X is **explicitly NOT selected** (forbidden; §15).
  - A **Mode 1 route-storage spike operational smoke test** lane was considered and **not** selected as
    primary: the merged spike is already proven green by the unit + integration suites (§17), the runbook is
    accurate (§14), and a run/smoke lane adds operational confirmation but not new decision value; it would
    also need to be bounded disabled-by-default, dev/operator-only, non-production, with no production DB
    writes / migrations, no public `remember-this`, no Discord / freeform ingestion, no chat-as-memory, no
    route-contract / final-schema freeze, and separately audited — a heavier envelope than the docs-only
    decomposition for less marginal value. It remains available as a **later optional** lane if a deployment
    state ever justifies it.
  - A **Freeside Characters client-contract handoff gate** was considered and **not** selected now: the route
    contract remains draft / non-final (`route_contract_final` false), so a handoff would communicate a moving
    target; it is better sequenced after the durable blocker is decomposed and the contract approaches
    stability.
  - A **further no-leak / persisted-projection hardening lane** is not owed for Mode 1 (which serializes no
    store output); the §10 residual surface is a *future* Lane-2 / durable concern, which the selected
    decomposition lane will naturally scope.

---

## 17. Non-authorizations and invariants

### 17.1 Invariants preserved

Phase 46W preserves **all** of the following; acceptance carries each forward unchanged:

1. **A pending candidate is not recallable** — `synthTransitionFor` returns `null` for `pending`; nothing is
   stored (`admission-intake.ts:194-200`).
2. **A rejected candidate creates no admitted assertion** — `null` for `reject`; nothing stored.
3. **An accepted candidate creates / references an admitted assertion** — `accept` mints a synthetic `admit`
   transition into the bounded ledger (`admission-intake.ts:175-183`).
4. **A superseded assertion is excluded from ordinary recall** unless explicitly requested / marked — the
   `supersede` transition repoints recall to the corrected active assertion while preserving the prior's
   audit / provenance (`admission-intake.ts:184-193`; ledger supersession).
5. **A malformed / unsafe payload fails closed** — `400 ingress.invalid_request`; nothing stored
   (`admission-intake.ts:329-365`).
6. **Missing / unauthorized auth fails closed** — one stable refusal that never reveals which gate failed
   (`admission-intake.ts:315-327`).
7. **Missing / invalid consent fails closed in any future production admission model** — service-token /
   operator auth is never treated as consent; no consent model is implemented or unblocked here.
8. **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
   material** — runtime deep-walk + 114-key guard + substring / regex / UUID / opaque-run walls
   (`no-leak.ts`; `admission-intake.ts:288`).
9. **Private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private** — the
   store result is discarded and never serialized; read accessors are never called by the route.
10. **User chat does not become memory merely because it was said** — no Discord / freeform ingestion; no
    chat-derived path; consent never inferred from chat.
11. **Public `remember-this` remains blocked.**
12. **Discord / freeform history ingestion remains blocked.**
13. **Production admission / storage / auth / consent remain blocked.**
14. **Route-contract freeze and final schema freeze remain blocked** — `route_contract_final` /
    `schema_final` false on every vector; Phase 46W freezes neither.
15. **`recall_eligible` remains derived / projection-only** — computed at read time, never persisted as
    canonical authority.

Also preserved (vocabulary): the **public outcome label `admitted`** and the **canonical assertion status
`active`** remain distinct, never conflated; **`active` is not a public `outcome_class`** (§10;
`classifier.ts:94-99`).

### 17.2 Non-authorizations (restated)

Phase 46W authorizes nothing beyond accepting the bounded Mode 1 spike proof. It explicitly does **not**
authorize, and is **not** to be read as authorizing: production admission, production durable-store
implementation, production DB writes, production migration execution, Lane-2 canonical Straylight-store
migrations, public `remember-this`, Discord / freeform ingestion, chat-as-memory, Freeside runtime / client
integration, package exports, LLM / voice / Finn wiring, MVP 3 forget / revoke / correction UI, a
route-contract freeze, a final schema freeze, production readiness, or the discharge of the operative
Straylight-side ADR-022E gate #8 (§15). **Direct production durable-store implementation is explicitly not the
next lane (§16).**

---

## 18. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`) unless noted.
Phase 46W is docs/decision-only — it adds only this document (plus the two minimal cross-reference status
notes in §14 / §16) and mutates no runtime source, test, validator, vector, fixture, migration, or SQL file —
so the validators and focused test suites are run only to confirm the already-merged Phase 46V artifacts
remain green.

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
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md || true
# Focused runtime re-validation of the merged Phase 46V slice (from app/), as live acceptance evidence:
npx --no-install vitest run tests/unit/admission-wedge-spike/route-storage-spike.test.ts
npx --no-install vitest run tests/unit/admission-wedge-spike/no-leak.test.ts
npx --no-install vitest run tests/unit/admission-wedge-spike/
npx --no-install vitest run tests/integration/admission-intake/route-storage-spike.test.ts
npx --no-install vitest run tests/unit/admission-wedge-spike/ tests/integration/admission-intake/
npm run typecheck
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md
```

**Recorded results for this lane** (run during authoring):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md` is added, plus the two minimal cross-reference
  status notes (§14 / §16); no runtime source (and specifically not `route-storage-spike.ts`, `no-leak.ts`,
  `config.ts`, `admission-intake.ts`, or `server.ts`), no runtime test, no route-vector JSON, validator,
  README, fixture, fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI,
  migration, SQL, executable schema, or generated file is touched;
- **validators green (merged / unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes
  valid, 0 failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no
  sixth vector**; the `--self-check` harness reports **44/44** cases behaving as required;
- **focused Phase 46V runtime re-validation (live acceptance evidence)** — route-storage-spike unit **41
  passed**; no-leak unit **163 passed**; combined admission-wedge-spike unit + admission-intake integration
  **411 passed (12 files)**; route-storage integration alone **16 passed**; `npm run typecheck` **clean**;
  touched-file ESLint over the Phase 46V files **clean**; full Vitest suite re-run for independent
  confirmation (see the operator run report);
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–20 exactly once
  each.

*(The full recorded command output accompanies this lane's operator run report.)*

---

## 19. Corruption / duplicate guard

Phase 46W applies an explicit corruption / duplicate guard to **this** document (carried from the Phase
46I–46V precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 20.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is the §18
  validation command list. **No fenced block is an executable migration or runnable schema.**

---

## 20. Cross-references

- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md)
  — Phase 46U (PR #166); the **authorizing predecessor** — its **Verdict A** authorized the Phase 46V spike
  and its §3.3 acceptance bar is the bar this gate checks the merged implementation against; its §4–§16
  boundaries are the envelope Phase 46V stayed within. **Gains a minimal Phase 46W acceptance status note.**
- [`docs/admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md)
  — the Phase 46V enable / disable / kill-switch / rollback runbook; the operational source-of-truth for the
  two env gates, the Mode 1 non-durability posture, and the fail-closed / capacity behavior. Read-only here;
  **gains a minimal Phase 46W acceptance status note.**
- [`docs/ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md)
  — Phase 33O (PR #133); the **direct structural precedent** — a dev/operator-only route-spike *acceptance*
  gate (accept-as-bounded-spike + what-it-proves / what-it-does-not + next-lane), whose shape this gate reuses
  one rung up for route-storage. **Not modified.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md)
  and [`docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md)
  — Phases 46T / 46S (PR #165 / #164); the accepted draft durable-store schema / migration design (13 `aw_*`
  tables; §15 spike preconditions) that the future durable mode and the §16 next lane reference. **Not
  modified.**
- [`docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md)
  — Phases 46Q / 46P / 46O; the 114 / 114 runtime ↔ validator no-leak parity Phase 46V inherits over the
  stored / replayed / failure public surfaces (§10). **Not modified.**
- [`docs/ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)
  and [`docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`](admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md)
  — Phases 33R / 33Q; the bounded synthetic admitted-assertion ledger Phase 46V wraps (one per synthetic
  actor) and its acceptance. **Not modified.**
- `app/src/services/admission-wedge-spike/{route-storage-spike,index,no-leak,public-response,classifier,admitted-assertion-ledger}.ts`,
  `app/src/routes/admission-intake.ts`, `app/src/server.ts`, `app/src/config.ts`, and the Phase 46V test
  suites under `app/tests/unit/admission-wedge-spike/` + `app/tests/integration/admission-intake/` — the
  merged Phase 46V implementation, inspected **read-only** to ground §3–§13. **None is modified by this
  phase.**
- `docs/admission-wedge/route-contract-test-vectors/` (validator + five vector JSONs + README) and
  `docs/admission-wedge/fixtures/` (validator + fixtures) — inspected **read-only** as the unchanged 114-key /
  five-vectors / no-sixth / 44-self-check / 5-probes source of truth. **None is modified.**
- `@loa/straylight` — canonical primitive / substrate owner; the `StorageAdapter` / `AuditLog` interface and
  the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes (cross-repo references, not Dixie
  artifacts); ADR-022E durable-store gate #8 (+ sibling gates #9 / #10 / #11 / #12 / #15 / #20, **held
  operatively**) and ADR-022D receipt / audit-chain invariants are the decision records cited as guardrails
  (§4 / §15). **Not edited by this phase.**
