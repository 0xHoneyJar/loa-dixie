# Recall Wedge — Seeded Live Estate / Storage Design Gate

> **Phase**: 32J
> **Date**: 2026-05-30
> **Title**: Seeded Live Estate / Storage Design Gate
> **Branch context**: `phase-32j-seeded-live-estate-storage-design`
> **Related (loa-dixie)**: Phase 30C/30E (served-path proof), Phase 32A–32D
> (no-leak / redaction / denied tests), Phase 32E (route contract), Phase 32F
> (readiness checkpoint), ADR-026C, ADR-026D
> **Related (freeside-characters)**: Phase 41D (controlled live
> `/recall-wedge-live-demo` smoke), Phase 42A (next-MVP decision)
> **Status**: **docs-only design gate** — code-inspection-grounded. **No
> implementation. No seeding. No source change.**

This document is a **design gate**, not an implementation. It identifies the
narrowest safe future path to seed a dev/operator estate so that a later live
`POST /api/recall/intake` smoke can return a safe *served recall* /
*governed recall* result, instead of the currently-observed
`seam.storage_unavailable`. It inspects the actual Dixie + Straylight code
path and stops there.

This phase **does not** seed anything, change any source, add any migration,
script, CLI command, env, or Railway/deploy config, ingest any Discord
message, admit any production memory, or open any public rollout.

---

## 1. Current accepted state

The following are accepted as true going into this gate (Dixie side):

- **Dixie is deployed** and the Recall Wedge route is mountable at
  `POST /api/recall/intake` (Phase 32E route contract; mount at
  `app/src/server.ts:566–594`, gated by `config.recallIntakeEnabled`).
- **Unauthenticated recall-intake fails closed.** With no resolved wallet the
  route returns `ingress.unauthenticated` / `401` before any seam work
  (`app/src/routes/recall-intake.ts:249–254`).
- **Authenticated recall-intake reaches the Straylight seam.** A
  wallet-authenticated, wedge-shaped, idempotency-keyed, same-tenant request
  passes ingress and invokes `handleRecallIntake` through the capability
  holder under the per-estate mutex
  (`app/src/routes/recall-intake.ts:388–448`).
- **The current live blocker is unseeded estate/storage.** The reached seam
  returns `outcome:'denied', reason:'storage_unavailable'`, which Dixie maps
  to the documented `seam.storage_unavailable` / `503` refusal class. This is
  the upstream condition the freeside-characters Phase 41D smoke classified as
  `upstream_unavailable` / `seam.storage_unavailable` and rendered safely.
- **Served recall is not yet proven *live*.** The canonical self-consistent
  real-Straylight served-path proof is the in-repo integration test against a
  *seeded* bounded store (`app/tests/integration/recall-intake/served-path.test.ts`),
  which drives the real Straylight runtime end-to-end. Phase 32B/32C provide
  additional Dixie served pass-through / replay proofs against mocked seam
  responses (`vi.mock`ed `handleRecallIntake`), covering the served HTTP body
  and the idempotent replay surface. No production/live code path seeds the
  store, so no live served recall has been demonstrated.

---

## 2. Code-path map

Per-request flow for an authenticated recall, with the exact files/anchors
inspected for this gate:

| Stage | Location | Behavior |
|-------|----------|----------|
| **Route entrypoint** | `app/src/routes/recall-intake.ts:246` (`app.post('/')`) | Hono handler for `POST /api/recall/intake`. |
| **Auth / wallet resolution** | `app/src/routes/recall-intake.ts:247–254` via `getRequestContext` | Resolves the session wallet from existing JWT middleware; absent wallet → `ingress.unauthenticated` / `401`. |
| **Request validation** | `app/src/routes/recall-intake.ts:256–340` | Content-length pre-check, per-tenant rate limit, required `Idempotency-Key`, byte-capped body read, JSON parse, strict zod `RecallIntakeBodySchema` (wedge-aligned). |
| **Tenant identity guard** | `app/src/routes/recall-intake.ts:342–359` | `caller.tenant_id`, `caller.actor_id`, `request.actor_id`, and `request.estate_id` **must all equal the session wallet**; mismatch → `ingress.cross_tenant_body_mismatch` / `403`. |
| **Idempotency / replay** | `app/src/routes/recall-intake.ts:361–380` | Cache lookup returns prior response verbatim; otherwise `runOnce` coalesces. |
| **Capability / internal seam call** | `app/src/routes/recall-intake.ts:388–448` | Per-estate mutex → tenant-scoped store view (`boundedStore.forTenant(wallet)`) → `capabilityHolder.withCapability` → `handleRecallIntake(store, seamReq, intakeDeps, cap)`. |
| **Capability gate (upstream)** | `@loa/straylight/.../runtime/recall-intake/handle-recall-intake.js:39–49` | Verifies the Dixie capability; on gate refusal returns its own `denied` / `storage_unavailable`. On success, passes the host response through **unchanged** (`:49`). |
| **Host intake + delegate** | `@loa/straylight/.../host/intake.js:11–55` | Cross-tenant guard, then `executeRecall(...)` wrapped in try/catch. |
| **Store / estate / audit path** | `app/src/services/straylight-recall-intake/bounded-estate-store.ts` | In-process bounded estate store; `forTenant` view + `getKeyring()` / `listAssertions()` / `storage` / `auditLog`. |
| **Governed recall** | `@loa/straylight/.../recall.js:13–166` | `executeRecall` calls `store.getKeyring()` **early** (`:28`), runs policy/class/disposition, assembles pack + receipt. |
| **Refusal mapping** | `app/src/services/straylight-recall-intake/refusal-mapping.ts:104–194` | Maps seam `denied`/`needs_review` to refusal class + HTTP status; served path returns the body verbatim with `200`. |

### Where `storage_unavailable` is emitted

`storage_unavailable` is an **overloaded reason code** with three distinct
producers. The doc keeps them separate because they look textually identical
on the wire but originate in different places:

| # | Producer | Origin | How to tell it apart |
|---|----------|--------|----------------------|
| **(A)** | **Unseeded tenant** *(the observed live blocker)* | `executeRecall` calls `store.getKeyring()` at `recall.js:28`; the bounded store's no-arg `getKeyring()` **throws** for a missing tenant slot (`bounded-estate-store.ts:461–467`); the host try/catch coerces **any** throw from `executeRecall` into `outcome:'denied', reason:'storage_unavailable'` (`host/intake.js:38–55`). | A **response object** flowing through unchanged. The cause is a *missing-data* condition (no seed), not a real storage outage. |
| **(B)** | **Capability-gate refusal** | `handle-recall-intake.js:39–48` — when the capability is invalid, the runtime wrapper returns `denied` / `storage_unavailable` with a `runtime_seam:capability_*` `raw_reason`, **before** any host/store work. | Decided in the runtime wrapper *upstream* of `executeRecall`; carries a `runtime_seam:capability_*` raw reason; never touches `getKeyring`. |
| **(C)** | **Dixie route internal-error fallback** | `app/src/routes/recall-intake.ts:429–445` — fires only for an exception that *escapes* `handleRecallIntake`, returning a synthesized `denied` / `storage_unavailable` with a `runtime_seam:internal:*` raw reason. | A route-level catch of a **thrown exception**. The observed case (A) returns a *response object*, so it bypasses this fallback entirely. |

> **Authoritative statement for the observed blocker:** An unseeded tenant
> produces `reason:'storage_unavailable'` because `executeRecall`
> (`recall.js:28`) calls `getKeyring()` before any policy work,
> `getKeyring()` throws on a missing tenant slot
> (`bounded-estate-store.ts:461–467`), and the Straylight host try/catch
> (`host/intake.js:38–55`) coerces that throw into a `storage_unavailable`
> denial. The runtime wrapper passes it through unchanged
> (`handle-recall-intake.js:49`) and Dixie maps it to the
> `seam.storage_unavailable` / `503` refusal class
> (`refusal-mapping.ts:171–175`).

---

## 3. Existing storage / schema inventory

### Relevant

- **`app/src/services/straylight-recall-intake/bounded-estate-store.ts`** —
  the only storage abstraction the recall path uses. It is a **purely
  in-process, closure-held set of JavaScript `Map`s** (`tenants`,
  `recallReceipts`, `transitionReceipts`, `transitions`, `auditByEstate`,
  `auditTail`, created at `:215–221`). Imports from `@loa/straylight` are
  **type-only** (`:32–43`); there is **no** `pg`/`redis`/file/db import.
  - `seedTenant(...)` — the population entrypoint (`:173`, `:477`). Seeds an
    `Actor` + `ActorEstate` + `Keyring` (+ optional assertions) for a tenant
    and enforces the per-tenant caps.
  - `forTenant(tenant_id)` — request-scoped view; for an unseeded tenant the
    bound estate/actor/keyring ids are all `undefined` and estate-keyed
    surfaces fail closed (reads → empty/undefined, writes → scope-violation)
    (`:269–279`).
  - `getKeyring()` (no-arg, on the view) — **throws** when the slot is absent
    (`:461–467`). This is the throw that becomes the observed
    `storage_unavailable`.
- **`app/src/services/straylight-recall-intake/capability-holder.ts`** —
  mints/re-mints the Dixie capability; producer (B) above lives upstream of it.
- **`app/src/services/straylight-host/intake-deny-log.ts`** — Dixie-local,
  **in-memory** intake-deny log (`createInMemoryIntakeDenyLog`); no
  persistence, no DB.
- **`app/src/server.ts:566–594`** — wiring: `createBoundedEstateStore({...})`
  is constructed with config caps only and passed straight to
  `createRecallIntakeRoutes`. **No `seedTenant` call exists here or anywhere
  in `app/src/`.**
- **`app/src/config.ts:75–82, 247–278`** — recall-intake config surface
  (`recallIntakeEnabled`, caps, idempotency TTL, rate). `recallIntakeEnabled`
  requires `DIXIE_RECALL_INTAKE_ENABLED=true` **and** a non-empty
  `STRAYLIGHT_RUNTIME_DIXIE_KEY` (fail-closed startup, ADR-026D §4.a).
- **`app/tests/integration/recall-intake/served-path.test.ts`** — the
  **canonical self-consistent real-Straylight served-path seed reference**
  (`buildSeedMaterial` + `seedTenant`), constructing a seed against the real
  Straylight runtime. (Phase 32B/32C also exercise the served path, but against
  mocked seam responses rather than a real-runtime seed.) It is the canonical
  seed-shape reference for any future implementation.

### Not relevant

- **`app/src/db/migrations/003–015*.sql`** — every migration is for a
  *different* Dixie subsystem: schedules, autonomous permissions, reputation
  aggregates/cohorts/events, mutation log, audit trail, knowledge freshness,
  dynamic contracts, fleet orchestration, outbox, agent ecology. **None
  create estate / actor / keyring / assertion / recall-receipt tables.** The
  recall path never reads from PostgreSQL.
- **`DATABASE_URL` / `REDIS_URL`** (runbook §SSM) — the recall bounded store
  does not consult either; they back other subsystems only.

> **Consequence:** because the store reads exclusively from in-process `Map`s,
> a database row or an out-of-process operator script **cannot** seed it — it
> would write to a store the recall path never queries. Any seed must target
> the **same in-process store instance**, and any seed is **non-durable**
> across process restart under the current Maps-only design.

---

## 4. Candidate seed strategies

Each option is described as a *future* path. None is implemented here.

1. **In-process startup seed via `seedTenant`** *(code-grounded, recommended
   shape)* — after `createBoundedEstateStore(...)` at `server.ts:568`, and
   before the store services requests, invoke `boundedStore.seedTenant({...})`
   for a dev/operator tenant behind an explicit dev/operator flag. Uses the
   existing, tested API; no new persistence surface.
   - *Pro:* minimal surface; exactly the API the served-path test exercises;
     deterministic; reviewable; idempotent (re-`seedTenant` replaces the slot).
   - *Con:* non-durable (lost on restart — acceptable for a dev/operator smoke);
     requires a small wiring change in `server.ts` (out of scope for this
     phase).

2. **Fixture-backed runtime seed** — load a checked-in, redacted dev fixture
   (Actor/Estate/Keyring shape) from a repo file at startup and feed it to
   `seedTenant`. Same target as (1), with the seed values externalized to a
   fixture rather than inlined.
   - *Pro:* keeps seed material reviewable as data, not code; reuses the
     `served-path.test.ts` shape.
   - *Con:* a fixture file must contain **no** live IDs/keys/tokens; the
     `dev_signature` is **not** in the fixture (caller-computed), so the
     fixture is signer/keyring metadata only.

3. **Operator one-shot script** — a script that seeds the store.
   - **Not viable as an out-of-process script.** The store is in-process Maps
     (§3); an external script cannot reach the running server's store. A
     "script" would only work if it runs *inside* the server process at
     startup, which collapses into (1)/(2). Recorded here explicitly so a
     future phase does not waste effort on an external seeder.

4. **Migration-like dev-only seed** — a SQL/migration seed.
   - **Not viable.** There is no estate/keyring/assertion table (§3, *Not
     relevant*). A migration would seed storage the recall path never reads.
     Recorded as rejected.

5. **Direct Straylight-store fixture** — instantiate a real Straylight
   `EstateStore` (e.g. an in-memory/JSONL host storage) instead of the
   Dixie-local `BoundedEstateStore`, and seed *that*.
   - *Pro:* exercises the upstream store surface directly.
   - *Con:* the route deliberately uses a **Dixie-local** bounded store and
     casts it to `EstateStore` at exactly one isolated seam site
     (`recall-intake.ts:418–424`); ADR-026D §3.a (iii) authorizes only the
     bounded guardrail, and ADR-022E gate #8 holds against a production
     persistence adapter. Swapping in a real Straylight store widens scope
     beyond the MVP authorization. Recorded as **deferred / higher-risk**.

6. **Persistence-backed store (future, out of MVP)** — wire a durable backend
   behind the store surface. Explicitly **out of scope** and gated by
   ADR-022E gate #8 / future authorization. Recorded only to mark the
   boundary.

---

## 5. Recommendation

**Recommended future Phase 32K / 42B implementation target: Option 1 (or its
data-externalized variant Option 2) — a deterministic, dev/operator-only,
idempotent in-process `seedTenant` seed wired at `server.ts:~568` behind an
explicit dev/operator gate.**

Rationale:

- **Minimal surface area.** It uses the already-tested `seedTenant` API
  (`bounded-estate-store.ts:173`, `:477`) and adds one guarded wiring block;
  no new persistence layer, no schema, no external process.
- **Deterministic & reviewed.** The seed material shape is fully specified by
  `served-path.test.ts:200–258` and the Straylight policy/keyring code, so the
  seed can be reviewed against known-good fixtures.
- **Idempotent / safe to rerun.** `seedTenant` replaces the tenant slot, so
  re-seeding the same tenant is a no-op-equivalent overwrite.
- **No secrets in repo.** The seed carries only signer/keyring **metadata**
  (`signer_id`, `signer_type`, `key_ref`, role rules). The `dev_signature` is
  **caller-computed** at request time (`served-path.test.ts:106–109,
  142–177`), so no private key or signature value is ever stored in the repo.
- **No live IDs/tokens/URLs/keys.** Seed values must be synthetic dev/operator
  identifiers, not live wallet/community/tenant identifiers.
- **No production admission invented.** Seeding a dev/operator estate enables a
  *served recall* response over a controlled, synthetic estate; it does **not**
  admit user memory, ingest Discord history, or open a public write path.

Option 2 (fixture-backed) is an acceptable equivalent if reviewers prefer seed
material as reviewable data. Options 3–6 are rejected/deferred per §4.

---

## 6. Future implementation constraints

Any Phase 32K/42B implementation that acts on this gate **must**:

- be **dev/operator only** — never a user-facing or public write path;
- sit behind an **explicit env/flag gate** (e.g. a dedicated dev/operator seed
  flag distinct from `DIXIE_RECALL_INTAKE_ENABLED`), default **off**;
- be **idempotent** and **safe to rerun** (re-seeding replaces the slot);
- ship with **tests** (extend the existing
  `app/tests/integration/recall-intake/` + `app/tests/unit/recall-intake/`
  coverage; reuse the served-path seed shape);
- **not** store secrets, private keys, live IDs, tokens, URLs, or signatures in
  the repo (seed = signer/keyring metadata only; signatures are caller-side);
- **not** introduce a Discord/Telegram history ingestion path;
- **not** add a "remember this" / candidate-memory admission path;
- **not** add a production memory-admission UI or write surface;
- **not** trigger any public rollout or public-channel recall;
- preserve every Phase 32E ingress/refusal/no-leak guarantee unchanged.

---

## 7. Future acceptance criteria

A future seeded-live phase is acceptable only if **all** of the following hold:

- **No-auth still fails closed** — unauthenticated recall-intake still returns
  `401` / `ingress.unauthenticated`.
- **Invalid/expired service token still fails closed** — a missing/invalid
  capability still yields the capability-class refusal (`503`) and never a
  served body.
- **Unseeded estate still returns a safe failure** — for any tenant *not*
  seeded, the response is still the safe `seam.storage_unavailable` (or a
  successor reason code, see §10) `503` refusal, never a leak.
- **Seeded estate returns a safe served / governed recall result** — for the
  seeded dev/operator tenant, the route returns `200` with
  `outcome:'served'`, a wedge `pack` + `receipt`, and
  `policy_decision.decision === 'allow'`.
- **Direct Dixie smoke reaches served/good classification** — a direct
  `POST /api/recall/intake` smoke against the seeded tenant classifies as
  served/good.
- **Freeside-characters / loa live demo renders safe served output** — the
  downstream `/recall-wedge-live-demo` renders the served result safely
  (minimized, public-bound discipline preserved per Phase 32F §8).
- **No leakage on any path** — no raw reasons, raw payloads, bounded-store
  internals, tenant/debug material, JWT/token material, stack traces, private
  IDs, or raw assertion IDs are exposed on served or refused responses.

---

## 8. Explicit non-claims

This phase explicitly does **not**:

- implement seeding or any code change (this is a design gate only);
- accept or prove served-memory in this phase;
- authorize any production rollout;
- authorize any production memory admission;
- implement or authorize cross-user auth/consent;
- ingest any live Discord/Telegram message or chat history;
- add any "remember this" / candidate-memory write;
- claim Dixie owns Straylight recall semantics (ownership remains upstream per
  Phase 32E §1 and §4).

---

## 9. Open questions / blockers

1. **Exact seed table/store.** Confirmed: the seed target is the in-process
   `BoundedEstateStore` via `seedTenant` (§3). There is **no** table/migration
   to seed. Open question for 32K: should the seed values be inlined (Option 1)
   or externalized to a reviewable dev fixture (Option 2)?
2. **Dixie-side script vs Straylight-side primitive vs both.** Confirmed: a
   **Dixie-side, in-process** seed is the viable lever; an out-of-process
   script and a Straylight-side migration are **not** viable against the
   current Maps-only store (§4). Open question: whether a future durable path
   should instead adopt a real Straylight `EstateStore` (Option 5) — deferred,
   higher-risk, gated by ADR-022E gate #8.
3. **Avoiding committed live identifiers.** The seed must use synthetic
   dev/operator identifiers and signer/keyring **metadata** only; the
   `dev_signature` is caller-computed and never stored. Open question: where
   the dev/operator wallet/tenant identifier for the smoke lives so it is
   **not** committed (env/flag input vs fixture) — must be resolved before any
   seed lands.
4. **Overloaded `storage_unavailable`.** The unseeded case (producer A) and the
   route internal-error fallback (producer C) share the `storage_unavailable`
   reason string but differ in origin (§2). Open **design** question for a
   future phase: whether the unseeded/missing-estate case warrants a distinct
   reason code so a genuine storage outage is not masked. This is a design
   decision, not a verified defect.
5. **Non-durability.** Any in-process seed is lost on restart
   (`bounded-estate-store.ts:212–501`). Acceptable for a dev/operator smoke;
   flagged so a future phase does not mistake it for durable storage.

---

## 10. Cross-references

- `docs/integration/phase-32e-recall-wedge-route-contract.md` — governing
  Dixie Recall Wedge route contract (served/denied/refusal mapping,
  idempotency, non-ownership). This gate builds on it; it does not replace it.
- `docs/integration/phase-32f-recall-wedge-readiness-checkpoint.md` — cross-repo
  readiness checkpoint; public-bound minimization (§8) and service-auth vs
  end-user recall authorization (§7) remain in force for any seeded-live work.
- `app/tests/integration/recall-intake/served-path.test.ts` — the canonical
  self-consistent real-Straylight served-path seed reference
  (`buildSeedMaterial` + `seedTenant`), driving the real Straylight runtime.
  Phase 32B/32C (`phase-32b-served-path-redaction-receipt.test.ts`,
  `phase-32c-recall-intake-no-leak-replay.test.ts`) add further Dixie served
  pass-through / replay proofs against mocked seam responses. This remains the
  best reference for a future real bounded-store seed.
- `app/src/routes/recall-intake.ts` — route entrypoint, auth/validation,
  tenant guard, capability/seam call, internal-error fallback.
- `app/src/services/straylight-recall-intake/bounded-estate-store.ts` —
  in-process store, `seedTenant`, `forTenant`, throwing `getKeyring`.
- `app/src/services/straylight-recall-intake/refusal-mapping.ts` — seam→HTTP
  refusal mapping (`seam.storage_unavailable` / `503`).
- `app/src/server.ts` (recall-intake mount block) — the create-but-never-seed
  wiring and the future seed insertion point.
- `app/src/config.ts` — recall-intake config gating.
- `@loa/straylight` (type-pinned dependency) — semantic owner of governed
  recall (`recall.js`), host intake (`host/intake.js`), capability gate
  (`runtime/recall-intake/handle-recall-intake.js`); inspected read-only for
  this gate.
- `docs/operations/runbook.md` — deployment/ops runbook. No recall-intake
  seeding step exists today; intentionally **not** modified by this docs-only
  gate (no good anchor — the runbook covers infra deploy/rollback, not the
  in-process recall store).
