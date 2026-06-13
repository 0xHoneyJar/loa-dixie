# Phase 33Q — Admission Wedge dev-only bounded admitted-assertion ledger: runbook

> **Status:** dev/operator-only, **test-seam-only** bounded **synthetic**
> admitted-assertion ledger. **NON-PRODUCTION.** **Not server-wired** — there is
> no runtime env flag and no dev-reachable route path to the ledger; it exists to
> prove the candidate → admitted-assertion → recall transition's *stateful effect*
> against **synthetic material only**, exercised through the route's
> dependency-injection seam in tests.
>
> Authorized **narrowly** by the Phase 33P storage/receipt hardening decision
> gate ([`../ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](../ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)
> §7–§12), which selected **Option B** (a dev-only, disabled-by-default,
> bounded **synthetic** store) and **rejected Option D** (production-like durable
> storage). This phase authorizes **no** production admission, durable storage,
> migration, production auth/consent, Freeside runtime/client integration,
> Discord ingestion, user chat becoming memory, public `remember-this`, package
> export, final schema freeze, or completed Straylight primitive review.

## 1. What it is

A bounded, **process-local**, **non-durable**, fail-closed **synthetic**
admitted-assertion ledger:

- `app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`

Its entire state is JS `Map`s captured in a factory closure. It opens **no**
database connection, **no** file handle, **no** socket, **no** timer, and runs
**no** background task. It performs **no** durable write and **no** migration.

It records **only** synthetic identity / status / provenance / receipt-like-audit
references. Within the spike envelope this is **enforced at ingress, not merely
undeclared**: every externally supplied string-like field (`tenant_id`,
`estate_id`, `source_candidate_id`, `admission_transition_id`,
`admitted_assertion_id`, `assertion_class`, `replay_key`,
`supersedes_assertion_id`) is validated to a **bounded synthetic label**
(lowercase snake/kebab + digits, length-capped; `replay_key` also allows `:`)
**before any mutation**. A transition must be a **plain record** (prototype
`Object.prototype` or `null` only — arrays, class instances, `Date`, `Map`, etc.
are rejected); its **exact** own-key set is enforced with `Reflect.ownKeys`
(**not** `Object.keys`), so a payload-shaped **extra field** that is
non-enumerable, symbol-keyed, or reachable only through an inherited prototype is
rejected, not silently accepted. Its `kind` is validated, and every field is
scanned for a named **unsafe-marker / payload-shaped substring** denylist
(`unsafe_marker`, `candidate_payload`, `source_material`, `raw_reason`, …). Each
field is read **exactly once** into a **frozen, closure-owned snapshot** that all
downstream work (fingerprint, capacity, commit) reads from — so a caller-owned
accessor getter cannot return a safe value at validation and a different one at
commit (TOCTOU). So raw material in its natural shape (free-form text —
whitespace, uppercase, sentence punctuation), an over-long value (e.g. a 1 MB
replay key), a payload-shaped extra field (enumerable or not), or a denylisted
marker is **rejected fail-closed with zero ledger/audit/recall residue** — not
stored.

> This validation is a **defense-in-depth floor, not an exhaustive raw-material
> classifier**: a deliberately snake-cased short token that is off the denylist
> would pass the shape check. That is acceptable because the **only** caller (the
> route) builds the transition from fixed synthetic constants and never from
> request material (Phase 33P §8) — request-controlled data never reaches a
> ledger field. The validation hardens the seam against accidental/raw input; it
> does **not** claim to recognize every conceivable raw string and is **not** an
> exhaustive raw-material classifier.

> **Scope of the safety claim.** The hardening described here is **spike-scoped
> and bounded to this synthetic ledger proof** — bounded capacity validated at
> creation, tenant+estate scoping with immutable bound scopes, synthetic-only
> ingress validation, and detached/frozen reads. It is **not** a claim of
> production safety. Final production tenant/estate/actor identity binding,
> idempotency semantics, signer/authority, schema, receipt semantics, durable
> storage, and production readiness all remain **unresolved** (Phase 33P §8, §12)
> and are **out of scope** for this phase.

It is exposed **only** on the internal spike service barrel
(`admission-wedge-spike/index.ts`). It is **not** re-exported from any package
entrypoint and adds **no** package export (Phase 33P §8).

### Operational-property precedent, not reuse

The ledger mirrors **only the operational properties** of the Recall-path
bounded estate store (process-local, capacity-bounded, tenant/estate-scoped,
non-durable, fail-closed, testable without production storage — Phase 33P §6).
It reuses **no** Recall code, type, adapter, or schema, imports **nothing** from
`straylight-recall-intake/`, and inherits **no** Recall semantics. Its identity /
status / provenance / receipt semantics remain governed by the still-unresolved
Straylight primitive review (A–O). This phase freezes **no** schema and decides
**no** final idempotency / signer / authority / tenant-estate-actor binding
semantics (Phase 33P §8, §12).

## 2. Implementation boundary

| Decision | Choice |
|----------|--------|
| Reachability | **Test-seam-only.** The ledger is injected only via the route's optional DI fields in tests. |
| `server.ts` wiring | **None.** `server.ts` is not changed; it injects no ledger. Production stays exactly the Phase 33N no-store Option A path. |
| Env flag | **None.** No `DIXIE_ADMISSION_STORE_SEAM_ENABLED` (or any) flag is added. The ledger cannot be enabled at runtime. |
| Durable storage | **None.** No DB, file, socket, timer, or migration. |
| Tenant/estate binding | **Tenant + estate bound (spike isolation).** Every read/write is bound to BOTH a synthetic `tenant_id` AND `estate_id`; an estate is owned by exactly one tenant for the process life. A foreign-tenant read returns empty; a foreign-tenant write and a conflicting reseed fail closed. A scoped view (`forEstate`) **snapshots an immutable, frozen, closure-owned scope** at construction, so mutating the caller's original scope object afterward cannot re-home the view to a different tenant/estate. **Not** the final production binding semantics (still unresolved, Phase 33P §12). |
| Capacity config | **Validated once at creation; caps then closure-owned.** Both caps must be finite, positive integers within a dev/test ceiling; `Infinity`, `NaN`, zero, negative, fractional, non-number, and over-ceiling values are rejected. The validated numeric limits are copied into a **frozen, closure-owned** constant and the caller-owned config object is **never read again**, so mutating it to `Infinity` after construction cannot widen a configured cap. The byte budget accounts for **all** retained synthetic metadata, **including retained replay keys + fingerprints**. |
| Raw candidate payload | **Rejected at ingress (spike-scoped), not merely undeclared.** No record type has a payload field, AND every accepted field is validated to a bounded synthetic shape before mutation: plain-record check, **exact own-key set via `Reflect.ownKeys`** (rejecting non-enumerable / symbol-keyed / inherited extra fields), unsafe-marker rejection, and length cap. Fields are snapshotted once (TOCTOU-safe). Raw/unsafe input fails closed with zero residue. This is a **defense-in-depth floor**, not an exhaustive raw-material classifier. |
| Returned reads | **Detached and frozen.** `auditTrail()` returns frozen, detached copies of the audit records (not live internal references); `inspectEstate()` and `projectRecall()` return freshly-built, frozen objects/arrays. Mutating any returned value cannot alter internal ledger state. Internal records are also frozen at creation as defense-in-depth. |
| Public response | **Unchanged.** Still produced by `buildAdmissionSpikePublicResponse`; ledger ids/audit never enter the public body. |
| Idempotency semantics | **Spike-scoped only.** `idempotency_final` stays `false`; final production semantics remain UNRESOLVED (Phase 33P §12). |

When **no** ledger is injected (the production/server default), the route is
**byte-equivalent** to Phase 33N Option A.

## 3. Files

**Created**
- `app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts` — the ledger.
- `app/tests/unit/admission-wedge-spike/admitted-assertion-ledger.test.ts` — unit proofs.
- `app/tests/integration/admission-intake/store-coupled.test.ts` — route-DI-seam proofs.
- `docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md` — this runbook.

**Modified (additive only)**
- `app/src/services/admission-wedge-spike/index.ts` — internal-barrel exports for the ledger (no package export).
- `app/src/routes/admission-intake.ts` — optional DI fields (`admittedAssertionLedger`, `admittedAssertionTenantId`, `admittedAssertionEstateId`), a route-local `synthTransitionFor()` helper deriving a synthetic transition from the classification + fixed synthetic constants, and a guarded `record({ tenant_id, estate_id }, transition)` call inside the **existing** `beforeFinalize` partial-failure try/catch. The write is attempted only when a ledger AND the full synthetic (tenant, estate) scope are injected; a partial injection records nothing. Default (no ledger) behavior is unchanged.

**Not changed:** `server.ts`, `config.ts`, `package.json`, lockfiles, CI, migrations, fixture JSON, route-vector JSON, validators, generated files, scope guards.

## 4. Ledger API (synthetic only)

All reads and writes take a `{ tenant_id, estate_id }` **scope** — there is no
estate-only access path. The capacity config is validated at creation.

```
createAdmittedAssertionLedger({ maxAssertionsPerEstate, maxAssertionBytesPerEstate })
  // ↑ both caps validated: finite, positive, integer, dev-bounded
  seedEstate({ tenant_id, estate_id })                     // idempotent per (tenant,estate); reseed under a different tenant fails closed
  record({ tenant_id, estate_id }, SyntheticAdmissionTransition) // admit | supersede; validates input then fail-closed throws
  forEstate({ tenant_id, estate_id }) -> ScopedAdmittedView      // bound to BOTH tenant and estate
  projectRecall({ tenant_id, estate_id }) -> { includes, excludes }  // empty for unseeded/foreign-tenant
  inspectEstate({ tenant_id, estate_id }) -> { assertions, bytes }   // zeros for unseeded/foreign-tenant
  auditTrail({ tenant_id, estate_id }) -> readonly SyntheticAuditRecord[]  // empty for unseeded/foreign-tenant
```

Errors (all fail-closed, public-safe messages with no long/opaque ids and no
echo of the rejected value):
`AdmittedAssertionCapExceededError`, `AdmittedAssertionScopeViolationError`
(reasons `unseeded_estate` / `prior_not_in_estate` / `foreign_tenant`),
`AdmittedAssertionReplayConflictError`, `AdmittedAssertionTenantConflictError`
(reseed under a different tenant), `AdmittedAssertionInvalidConfigError`
(bad capacity config at creation), and `AdmittedAssertionInvalidInputError`
(non-synthetic / payload-shaped / over-long / unsafe-marker field, or invalid
transition kind / extra field).

`SyntheticAdmittedAssertion` status is canonical-aligned `active` / `superseded`
— **never** a coined `admitted` status. `SyntheticAuditRecord` carries **both**
`audit_private: true` **and** `public_audit_detail: false` (Phase 33P §10).

## 5. Phase 33P §9 proof-case → test mapping

| §9 proof case | Where proven | Test(s) |
|---------------|--------------|---------|
| 1. Accept → admitted assertion exists | unit + integration | unit "accept mints one active…"; integration "accept records internally…" |
| 2. Carries status / provenance / receipt-like audit | unit | unit "attaches a synthetic … audit record with BOTH privacy markers" |
| 3. Pending stays not-admitted / not-recallable | integration | integration "pending records nothing and is not recallable" |
| 4. Reject creates nothing, not recallable | integration | integration "reject records no admitted assertion" |
| 5. Malformed fails closed, creates nothing | integration | integration "malformed fails closed before the ledger is reached" |
| 6. Supersession repoints recall, preserves prior | unit + integration | unit "marks prior superseded … corrected active"; integration "supersede … repoints recall" |
| 7. No-leak over the public response | unit + integration | every integration test asserts `findAdmissionPublicLeaks(body) === []` + wire-id sweep; existing `route-gate.test.ts` proves the guarded send path is unchanged |
| 8. Bounded-store safety (10 bullets) | mostly unit | see §6 |
| 9. Receipt/audit explains, not a production receipt | unit | unit "BOTH privacy markers"; public body keeps `production_admission:false` etc. (built by the unchanged public-response path) |

> Note: the public response schema and its draft markers
> (`production_admission`, `schema_final`, `idempotency_final`,
> `straylight_primitive_review_complete`, …) are produced by the **unchanged**
> Phase 33N `buildAdmissionSpikePublicResponse` path and remain `false` on every
> route response — the integration tests assert the body is byte-identical to the
> no-ledger Option A path, so those non-claims are preserved by construction.

## 6. Phase 33P §9 case-8 bounded-store safety proof mapping (10 bullets)

| Bullet | Layer | Test |
|--------|-------|------|
| tenant/estate isolation | unit | "keeps one estate's admitted assertions unreachable from another"; "one-estate flood … cannot starve another"; **tenant binding:** "re-seeding the SAME estate_id under a DIFFERENT tenant fails closed"; "a foreign tenant cannot READ another tenant's estate"; "a foreign tenant cannot WRITE into another tenant's estate"; "the scoped view is tenant- AND estate-bound"; **immutable bound scope (Codex blocker 1):** "READ: mutating the original scope object after forEstate() does not change what the view reads"; "WRITE: … does not redirect writes to B/B"; "WRITE fails closed per A/A state (not B/B)" |
| capacity-limit failure behavior | unit | "assertion-count overflow throws with dimension/cap/observed"; "byte-budget overflow throws"; **strict config:** "rejects an Infinity assertion/byte cap"; "rejects a NaN cap"; "rejects zero, negative, fractional, and over-ceiling caps"; "rejects a non-number cap"; **closure-owned caps (Codex blocker 2):** "mutating both caps to Infinity AFTER construction does not relax the configured cap of one"; "mutating the byte cap to Infinity AFTER construction does not relax the original byte budget"; **replay accounting:** "retained replay metadata contributes to the byte budget"; "a write whose retained replay key would breach the byte budget fails closed" |
| atomic partial-failure handling | unit | "a pre-mutation failure leaves NO partially-admitted residue"; "a failed supersession leaves the prior active" |
| no partially admitted residue | unit | same atomic partial-failure tests + synthetic-only "rejects … with zero residue" tests (assertion count + audit length unchanged) |
| no residual recallable state after failed writes | unit | atomic partial-failure tests assert `projectRecall` unchanged |
| synthetic-only input / no raw material persisted | unit | "rejects an unsafe marker in any accepted field, with zero residue"; "rejects payload-shaped values …"; "rejects a payload-shaped EXTRA field"; "rejects an over-long field (e.g. a 1 MB string)"; "rejects an out-of-shape … identity label"; "rejects an invalid transition kind"; "rejects a malformed scope"; "no raw payload / unsafe marker survives a rejected transition in audit or inspection output"; **plain-record / exact-key (Codex blocker 4):** "rejects a … NON-ENUMERABLE candidate_payload"; "rejects a … INHERITED candidate_payload"; "rejects a … SYMBOL own key"; "rejects a transition carried on an UNEXPECTED prototype (class instance)"; "rejects an array, Date, and Map"; "accepts a legitimate null-prototype plain record"; "an accessor getter cannot return a safe value at validation and a different one at commit (TOCTOU)" |
| returned reads detached from internals (Codex blocker 3) | unit | "mutating a returned audit record with unsafe_marker:raw-candidate does not persist internally"; "mutating a returned audit record with a 1 MB value does not change internal footprint/bytes"; "mutating returned audit_private/public_audit_detail does not flip the internal privacy markers"; "pushing onto the returned audit array does not grow the internal trail"; "inspectEstate() / projectRecall() return detached objects" |
| replay without duplicate minting | unit + integration | unit "replaying the SAME synthetic transition mints no duplicate"; integration "replaying the same accept does not mint a duplicate" |
| conflicting replay fails closed | unit only | "a CONFLICTING replay … fails closed, original intact"; "a fresh replay key minting over an existing synthetic id is a conflict" — **not reachable via the route** (route emits an identical fixed transition per scenario; conflict is unit-only) |
| process-local ephemerality | unit | "a freshly-created ledger is empty …" |
| process restart leaves no durable residue | unit | "a freshly-created ledger is empty (no durable … residue survives a restart)" |
| identity/status/provenance observable WITHOUT raw payload persistence | unit | "exposes id, active status, and provenance link while storing NO raw payload" |

## 7. No-leak discipline

- The **public response** is unchanged and still finalized through the single
  guarded `sendPublicResponse` → `findAdmissionPublicLeaks` path; the ledger's
  ids and private audit records are **never** placed in the public body.
- `findAdmissionPublicLeaks` is applied **only** to the public projection
  (`projectRecall` placeholder/synthetic-id output) and to error-message
  strings — **never** to a raw `SyntheticAdmittedAssertion` / `auditTrail()` /
  `inspectEstate()` value, because those **private** records legitimately carry
  forbidden public KEYS (`admitted_assertion_id`, `source_candidate_id`, …). The
  private records are guarded instead by a substring/payload-field assertion
  (no `unsafe_marker:`, no `candidate_payload`, no `source_ref`).
- All returned reads are **detached and frozen**: `auditTrail()` returns frozen,
  detached copies of each record (never live internal references), and
  `inspectEstate()` / `projectRecall()` return freshly-built, frozen
  objects/arrays. Mutating a returned value — injecting an `unsafe_marker`, a
  1 MB string, or flipping `audit_private` / `public_audit_detail` — cannot reach
  or alter internal ledger state. The internal records are frozen at creation as
  defense-in-depth, and a supersession **replaces** the prior with a fresh frozen
  object rather than mutating it in place.
- Ledger error messages use short synthetic labels only — no UUID and no
  unbroken alphanumeric run of **24 or more** characters (`no-leak.ts`
  `MAX_OPAQUE_RUN = 24`), so even an accidental surfacing stays public-safe.
  Rejection errors carry a fixed safe field token and a short reason; they
  **never echo the rejected value**, so even an unsafe/raw input leaves no trace
  in the error.
- Because every accepted field is validated to a bounded synthetic shape (no
  unsafe markers, no payload-shaped extra fields, length-capped) **before**
  mutation, the **private** records cannot carry raw candidate payload, source
  material, or an unsafe marker in the first place — the no-raw-material property
  of the private surface is enforced at ingress, not merely asserted afterward.

## 8. Idempotency boundary (spike-scoped only)

The replay/de-duplication and conflicting-replay proofs are **spike-scoped**
(Phase 33P §12). Replaying the **same** synthetic transition returns the prior
result and mints **no** duplicate; a **conflicting** replay **fails closed**.
This proves the bounded transition property only; it **does not** settle final
production idempotency semantics (candidate-id-keyed vs header-keyed, key scope),
which remain **explicitly unresolved**. `idempotency_final` stays `false`.

## 9. Validation commands

```bash
cd app && npm run typecheck
cd app && npm run lint
cd app && npx vitest run tests/unit/admission-wedge-spike/
cd app && npx vitest run tests/unit/admission-wedge-spike/scope-guards.test.ts
cd app && npx vitest run tests/integration/admission-intake/
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
git diff --check
```

The existing `scope-guards.test.ts` runs **unchanged** and must pass — it scans
the new ledger source for forbidden imports (no Freeside, no `@loa/straylight`,
no `straylight-recall-intake` `-store` import) and durable-write tokens, and
proves the spike adds no package export.

## 10. Blocked lanes preserved

Phase 33Q does **not** authorize, implement, or bring nearer any of: production
admission; durable production Admission Wedge storage; production database
migrations; production auth/consent; public `remember-this`; Discord command/
history ingestion; user chat becoming memory; Freeside Characters runtime/client
integration; package exports; LLM/voice; Finn production wiring; forget/revoke/
correction UI; final schema freeze; production route deployment; a completed
Straylight primitive-review claim; final idempotency semantics; production
signer/authority semantics; production tenant/estate/actor identity binding; a
final route contract; or production implementation readiness. The carried-forward
unresolved review rows (E, G, H, K, N, O) and review-dependent row (J) stay
unresolved — this phase **reads** them, it does not resolve them.

## 11. Next decision lane

The next lane after Phase 33Q should be an **acceptance / hardening gate** for
this synthetic ledger slice (mirroring the 33N → 33O acceptance pattern) —
**not** a production rollout. Production durable Admission Wedge storage remains
blocked behind the Straylight primitive review (A–O), the held ADR-022E
durable-store gate, a final route contract, and production auth/consent, and
requires its own separately-named gate.

> **Phase 33R status note (added later).** Phase 33R
> ([`../ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](../ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md))
> is the **docs/decision-only acceptance / hardening gate** this section
> anticipated. It reads this runbook and the Phase 33Q source **read-only** and
> **accepts Phase 33Q only as a bounded, non-production, test-seam-only synthetic
> admitted-assertion ledger proof** for MVP 2 — **not** as production admission,
> durable storage, a final schema, or production route readiness. **Phase 33Q
> does not complete MVP 2.** Phase 33R preserves every blocked lane (§10), keeps
> the Straylight primitive review (A–O) **unresolved**, and selects **Phase 33S —
> a docs/decision-only route-spike + bounded-ledger acceptance decomposition
> gate** as the next lane (explicitly **not** production rollout). It mutates no
> source, test, config, fixture, or vector.
