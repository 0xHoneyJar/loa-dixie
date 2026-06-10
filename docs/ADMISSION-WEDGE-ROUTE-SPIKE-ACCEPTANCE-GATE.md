# Phase 33O — Admission Wedge Dev/Operator-Only Route-Spike Acceptance Gate

> **Phase**: 33O
> **Branch context**: `phase-33o-admission-route-spike-acceptance`
> **Related**: Dixie Phase 33A–33N (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle, signer/keyring, receipt/audit,
> and storage-adapter primitives
> **Status**: **docs / decision-only acceptance gate.** No route, route handler,
> storage, auth, consent, migration, test, validator, fixture/vector JSON,
> config, package, lockfile, CI, generated, or live-integration change.
> **This is an acceptance gate, not implementation.** It accepts the Phase 33N
> route spike (PR #132) **only** as a bounded, disabled-by-default,
> dev/operator-only route spike for **MVP 2 — the Admissible Layer / Admission
> Wedge**. It changes **no** routes, storage, auth, consent, route handlers,
> validators, probes, or fixture/vector JSON; it does **not** freeze a
> final/production schema; and it does **not** complete the Straylight primitive
> review.

This document is the Dixie-side **acceptance gate** for the Phase 33N
dev/operator-only Admission Wedge route spike
(**PR #132**, commit `f44dd702`;
`app/src/routes/admission-intake.ts`,
`app/src/services/admission-wedge-spike/`, with config/server wiring and tests),
which Phase 33M authorized **narrowly** under its §7–§15 constraints
([`ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)).
It answers four questions and stops there: **(1)** does the Phase 33N
implementation hold up as the bounded dev/operator-only route spike that Phase
33M authorized (accept / reject)? **(2)** what does it prove, and — equally
important — what does it **not** prove? **(3)** what does its acceptance mean for
MVP 2? **(4)** what is the safest next lane? It implements no route, mutates no
source/test/validator/fixture/vector, writes no storage, and authorizes no live
or production behavior.

Every assessment below is grounded **read-only** against the actual Phase 33N
source merged in PR #132 (the route handler, the spike service modules, the
config/server wiring, the env docs, and the spike tests), and against the prior
docs chain (33J/33K/33L/33M). Where a claim is carried from a sibling checkout or
an external merge state that may be stale, that is flagged.

> **This phase does not complete the Straylight primitive review.** Phase 33J
> issued the §5 review register (A–O) and **confirmed no completed Straylight
> Admission-Wedge primitive-review artifact exists**; the genuinely-unresolved
> rows (E, G, H, K, N, O) and the review-dependent/non-final row (J) remain open.
> Phase 33N carried them forward as **draft markers** (in code:
> `ADMISSION_SPIKE_UNRESOLVED_ROWS = ['E','G','H','K','N','O']`,
> `ADMISSION_SPIKE_REVIEW_DEPENDENT_ROWS = ['J']`,
> `app/src/services/admission-wedge-spike/classifier.ts:73-74`). This gate keeps
> them **unresolved**; their disposition for the spike remains the **explicit,
> narrow, spike-scoped deferral** Phase 33M defined — **never** a resolution, and
> **never** for production.

---

## 1. Phase title and status

- **Phase 33O — Admission Wedge dev/operator-only route-spike acceptance gate.**
- Dixie-side **docs / decision-only**.
- Follows Dixie Phase 33N / PR #132 (dev/operator-only route-spike
  implementation) and Phase 33M / PR #131 (route-spike authorization gate).
- This is an **acceptance gate**, not route implementation and not route-spike
  authorization (33M already did that).
- It **accepts Phase 33N only as a bounded, disabled-by-default,
  dev/operator-only route spike** for MVP 2 (§7).
- It changes **no** routes, route handlers, storage, auth, consent, validators,
  probes, fixture/vector JSON, source code, configuration, CI, or production
  schema.
- It does **not** freeze a final/canonical/production schema.
- It does **not** mutate the Phase 33N route handler, the spike service modules,
  their tests, the Phase 33E probe JSONs, the Phase 33L route-vector JSONs, or
  either docs validator. Per the Phase 33D §6 invariant — any
  probe/validator/fixture mutation requires its own separately-gated phase —
  Phase 33O inspects all of them **read-only**.
- It does **not** authorize anything beyond what it explicitly accepts: it does
  **not** authorize production admission, durable Admission Wedge storage,
  production auth/consent, a public `remember-this`, Discord command/history
  ingestion, user chat becoming memory, Freeside Characters runtime/client
  integration, or package exports (§5, §10).

The audience for this document is **future Dixie phases** (primarily a possible
Phase 33P — see §9), the **Straylight (`@loa/straylight`) primitive owner**
(whose A–O answers remain the gating production exit criteria), and
**freeside-characters** as an interested-but-blocked downstream consumer (§5,
§10).

---

## 2. Source chain

This gate sits one rung above the Phase 33N route-spike implementation on the
Dixie Admission Wedge ladder. It introduces no new contract material and freezes
nothing; it accepts 33N as a bounded spike and selects the next lane.

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33H | #126 | Route-contract acceptance / implementation-readiness decision gate — accepts the Phase 33G design as a bounded docs-only draft (two minor docs-only corrections); renders **NOT implementation-ready**; inventories blockers (A–N); selects 33I. ([`ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)) |
| 33I | #127 | Implementation-readiness decomposition gate — orders the blockers into lanes (33J → 33K → 33L → 33M → 33N); defines the evidence required before any route handler; selects 33J. ([`ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)) |
| 33J | #128 | Straylight primitive-review **request** / vocabulary-dependency gate — issues the §5 fifteen-item review register (A–O); flags genuinely-unresolved rows **E, G, H, K, N, O** and review-dependent/non-final row **J**. **Did not complete the review.** ([`ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)) |
| 33K | #129 | Storage/auth/consent precondition **design** gate — designs (on paper) draft storage record categories, service-auth and consent model *options*, a dev/operator-only scope option, an idempotency precondition, a no-leak posture, and a threat model; carries A–O as exit criteria; selects 33L. **Implemented no storage/auth/consent.** ([`ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)) |
| 33L | #130 | Route-contract **test-vector fixture draft** — converts the Phase 33G §16 design vectors (A–E) into five non-runtime route-contract test-vector fixtures plus a Node-built-ins-only validator; carries the unresolved markers forward. **Implemented no runtime route tests and no route.** ([`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)) |
| 33M | #131 | Dev/operator-only route-spike **authorization** gate — **authorizes** (does not implement) a future Phase 33N disabled-by-default, dev/operator-only route spike under strict §7–§15 constraints, with the unresolved Straylight review (A–O) explicitly deferred for the synthetic spike only, never for production; defines the §9 acceptance criteria, §10 tests, §11 idempotency, §12 auth/consent, §13 storage, §13.1 rollback/partial-failure, and §14 no-leak constraints. **Implemented no route.** ([`ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)) |
| 33N | #132 | Dev/operator-only route-spike **implementation** — implements the disabled-by-default `POST /api/admission/intake` route spike (Storage Option A; no durable storage), the spike service modules, the gated config/server wiring, the env docs, the dev-spike runbook, and the spike tests, all under the Phase 33M §7–§15 constraints. **Authorized no production admission, durable storage, production auth/consent, Freeside integration, or package export.** (`app/src/routes/admission-intake.ts`; `app/src/services/admission-wedge-spike/`; [`docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md)) |
| **33O** | *(this doc; docs/decision-only — not committed/merged yet)* | **Route-spike acceptance gate — accepts 33N as a bounded dev/operator-only route spike for MVP 2 only; does not complete MVP 2; selects Phase 33P.** |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter track `dixie_admission_wedge_probe_v1`, **test-only**; v0 fails closed as `unknown_probe_version`. The adapter is a **pure, fixture-bound semantic mapping layer with no live Dixie call**. |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded test-only purpose; authorizes no live client, no package export, no runtime wiring; confirms **live Dixie calls: absent**. **Verified MERGED on GitHub (merged 2026-06-06).** |

> **Grounding note on the 45J / PR #177 citation.** GitHub confirms
> freeside-characters **PR #177 is MERGED** (merged 2026-06-06). The local
> `../freeside-characters` checkout is **stale** for PR status (it sits on the
> PR-head branch, not the merge); GitHub's merged state — not the local tree —
> remains authoritative for PR status (carried from the Phase 33H–33M grounding
> notes).

### Straylight (`@loa/straylight`)

The canonical primitive/substrate owner of the assertion-lifecycle,
signer/keyring, receipt/audit, and storage-adapter vocabulary. Read-only in
`../loa-straylight`. **No Straylight artifact naming an "admission wedge",
"assertion intake", or admission route/endpoint was found** (carried from 33J §2
/ 33K §2 / 33M §2); the local checkout may be stale. This gate treats the §5/A–O
review register as **unresolved**, exactly as Phases 33J–33N did.

> **Cross-repo phase-numbering caution.** Dixie's 33-series and the
> freeside-characters 45-series are independent labels in separate repositories
> and must not be conflated.

---

## 3. Purpose

- **Phase 33O decides whether the Phase 33N implementation is accepted as the
  bounded dev/operator-only route spike that Phase 33M authorized** (§4–§7).
- **Phase 33O does not implement, extend, or re-authorize anything.** It mounts
  nothing, writes no storage, adds no auth/consent, changes no route handler, and
  runs no production behavior.
- **Phase 33O does not complete MVP 2** (§6). The acceptance is of a *runtime
  slice*, not of the Admissible Layer.
- **Phase 33O must decide one of:**
  - **accept** Phase 33N as a bounded dev/operator-only route spike; or
  - **reject** it (e.g. if it exceeded the §7–§15 authorization or breached a
    block).

The decision is made explicitly in §7, constrained by the grounded assessment in
§4–§5.

---

## 4. What Phase 33N proves

Each item below is grounded **read-only** against the merged Phase 33N source. It
proves these properties **for a disabled-by-default, dev/operator-only,
NON-PRODUCTION route spike** — nothing more.

- **Default-off route registration.** The route is **not registered at all**
  unless `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`
  (`app/src/config.ts:399` parses the flag into `admissionIntakeSpikeEnabled`;
  `app/src/server.ts:630-642` mounts `/api/admission/intake` only inside
  `if (config.admissionIntakeSpikeEnabled)`). With the flag unset/not exactly
  `"true"`, a request to `POST /api/admission/intake` falls through — there is no
  endpoint (mirrors the Recall route's default-off mount).
- **Defense-in-depth disabled handler check.** Even if mounted, the handler
  re-checks `deps.enabled` first and returns a safe 404 disabled refusal that
  leaks nothing (`app/src/routes/admission-intake.ts:191-196`,
  `disabledRefusalBody()` :86-93).
- **Dev/operator gate layered behind the global allowlist.** The route sits under
  `/api/*` behind the global allowlist/JWT gate, and the dev/operator gate is
  layered on top of it (defense-in-depth). With **both** the service token and
  the operator-id allowlist empty, the enabled spike **rejects all calls**
  (fail-closed; no production default —
  `app/src/services/admission-wedge-spike/auth-gate.ts:70-95`). One stable refusal
  covers missing/invalid/non-operator; comparisons are constant-time and never
  reveal which gate failed or whether a credential almost matched
  (`auth-gate.ts:49-58, 78-95`).
- **Dedicated `x-admission-service-token` header.** The dev/operator service
  token is read from a **dedicated** `x-admission-service-token` header, **not**
  `Authorization: Bearer`, deliberately — the global `/api/*` allowlist already
  consumes `Authorization` and is not exempt for `/api/admission`, so reusing it
  would collide (`auth-gate.ts:9-21`;
  `admission-intake.ts:39-42`). The operator id is read from
  `x-admission-operator-id` (`admission-intake.ts:36-37`).
- **Strict synthetic dev-spike request shape.** The classifier accepts **only**
  two minimal fields behind a required synthetic non-production marker
  (`spike: 'admission_intake_dev_spike_v0'`) plus the draft `transition_intent`
  discriminator, via a **strict** Zod schema that rejects extra keys
  (`app/src/services/admission-wedge-spike/classifier.ts:33, 83-90`). No free-form
  memory/candidate payload is accepted.
- **Only the five Phase 33L scenarios.** The classifier maps the five draft
  `transition_intent` values 1:1 to the five frozen scenarios (pending / accept /
  reject / supersede / malformed) and adds **no sixth scenario**
  (`classifier.ts:38-59, 115-156`).
- **Unsupported / freeform / production-ish shapes fail closed.** Anything that
  is not one of the five recognized shapes throws
  `AdmissionSpikeUnsupportedShapeError` and the handler returns the **identical**
  public-safe fail-closed refusal as the explicit malformed scenario
  (`400 ingress.invalid_request`), never revealing the hidden reason
  (`classifier.ts:168-195`; `admission-intake.ts:238-248`,
  `failClosedRefusalBody()` :109-122). Oversized bodies and parse failures fail
  closed the same way (`admission-intake.ts:218-234`).
- **Storage Option A — no durable storage.** The handler is a pure classifier +
  public-response builder that mints **nothing durable**: no database writes, no
  migrations, no persisted candidate/assertion, **safe future-intent receipts /
  public-safe outcomes only** (`classifier.ts:8-20, 185-195`;
  `public-response.ts:1-10, 95-116`). Rollback is trivial — there is no durable
  state to roll back.
- **No-leak guarded public send path over all public responses.** Every public
  response — without exception (disabled, unauthorized, oversized, malformed/parse
  failure, classifier/default, partial-failure, and all five classified outcomes)
  — is finalized through **one** send path that deep-walks the body through the
  runtime no-leak guard **before** serialization
  (`admission-intake.ts:162-185`). The guard mirrors the Phase 33L validator
  denylist (`FORBIDDEN_PUBLIC_KEYS` / `FORBIDDEN_SUBSTRINGS` / `FORBIDDEN_PATTERNS`
  + UUID / long-opaque-run rules) as a dependency-free runtime module that
  imports nothing from `app/` validators or Straylight
  (`app/src/services/admission-wedge-spike/no-leak.ts:1-182`). Public bodies are
  built **purely** from the classified scenario plus fixed synthetic placeholders,
  so they can carry no request-controlled material (`public-response.ts:90-116`).
- **Guard-failure fail-closed fallback.** If the guard reports any finding (or
  throws), the response collapses to a **hardcoded known-safe** fail-closed
  fallback (`admission.fail_closed`) at HTTP 500 that is **not** re-guarded (no
  recursion) and carries **none** of the guard's findings, so the failure detail
  never reaches the client (`admission-intake.ts:124-137, 169-182`).
- **Draft markers asserted false on every response.** The public response always
  carries `schema_final:false`, `route_contract_final:false`,
  `production_admission:false`, `straylight_primitive_review_complete:false`,
  `idempotency_final:false`, plus the carried-forward unresolved rows
  (E, G, H, K, N, O) and review-dependent row (J)
  (`public-response.ts:106-114`).
- **Tests / static guards proving the boundaries.** The Phase 33N suite proves,
  among others: guard invocation and forced leak/throwing-guard fail-closed across
  every public response path, with exact known-safe fallback-body equality and
  sentinel absence
  (`app/tests/integration/admission-intake/route-gate.test.ts:393-512`); the five
  scenarios, malformed/unsupported fail-closed, the auth gate, the default-off
  posture, and the partial-failure posture (`route-gate.test.ts:130-305`); a
  **parser-backed** durable-write/SQL scope guard, no Freeside import, no
  `@loa/straylight` import, no DB/pg/store/migration import reachable from the
  spike, no SQL/durable-write execution tokens, no package export, no
  `src/index.ts` re-export, and Phase 33L validator isolation
  (`app/tests/unit/admission-wedge-spike/scope-guards.test.ts:161-348`). The
  service barrel is deliberately **not** re-exported from any package entrypoint
  (`app/src/services/admission-wedge-spike/index.ts:8-11`).

> **Merge-validation context (carried, not independently re-run by this gate).**
> At merge, the Phase 33N change reported: `git diff --check` clean; untracked
> no-index whitespace checks clean; Phase 33E validator 5/5; Phase 33L validator
> 5/5 with no sixth vector; TypeScript pass; focused patch tests 39/39; targeted
> Phase 33N tests 137/137; scoped ESLint pass; full app suite 2,799 passed / 22
> skipped; health test passing in isolation and in the final full suite. Codex
> returned an initial set of PATCH verdicts (no-leak guard coverage; incomplete
> SQL/durable-write guard; wrong config header docstring; stale Phase 33L README
> wording; parser/scanner bypasses; incomplete forced-leak wire assertions), all
> patched, and a **final ACCEPT** verdict. This gate records that as context; its
> own acceptance rests on the read-only source grounding in this section.

---

## 5. What Phase 33N does not prove

Phase 33N is a disabled-by-default, dev/operator-only, NON-PRODUCTION route spike.
It does **not** prove (and does not claim to prove) any of the following:

- **production admission** — the spike is dev/operator-only and disabled by
  default; it never admits production memory;
- **durable Admission Wedge storage** — Option A persists nothing (no DB writes,
  no migrations, no raw candidate persistence);
- **real admitted-assertion persistence** — the "admitted" outcome mints only a
  fixed synthetic public placeholder, not a stored assertion
  (`public-response.ts:21-30, 104`);
- **real recall eligibility from stored admitted assertions** — `recall_eligible`
  is a deterministic, draft, review-dependent flag over synthetic placeholders,
  not a query against any store (`classifier.ts:103-105`;
  `public-response.ts:67-88`);
- **production auth/consent** — the gate is a dev/operator service/allowlist gate
  only; service auth ≠ end-user consent; no end-user consent model is implemented
  (`auth-gate.ts:1-7`);
- **end-user authorization** — synthetic only; cross-user admission remains
  blocked;
- **public `remember-this`** — none exists;
- **Discord command / history ingestion** — none exists;
- **user chat becoming memory** — none exists;
- **Freeside Characters runtime / client integration** — the spike performs no
  Freeside import or call (`scope-guards.test.ts:168-176`); the 45J adapter stays
  test-only, not exported, not runtime-wired, with no live Dixie call;
- **package API / exports** — the spike adds no package export and no
  `src/index.ts` re-export (`scope-guards.test.ts:315-339`;
  `index.ts:8-11`);
- **a final / canonical / production schema** — every draft marker is false
  (`public-response.ts:106-114`);
- **a completed Straylight primitive review** — A–O remain unresolved; E, G, H,
  K, N, O and review-dependent J are carried forward as draft markers
  (`classifier.ts:70-74`);
- **final idempotency / signer / authority semantics** —
  `idempotency_final:false`; no production signer/authority is implemented;
- **production tenant / estate / actor identity binding** — synthetic only; the
  no-leak guard forbids operational tenant/estate/actor IDs from any public
  surface (`no-leak.ts:22-76`);
- **a final route contract** — `route_contract_final:false`; Phase 33G remains a
  draft design;
- **production readiness** — undefined and fully blocked (§10).

---

## 6. MVP 2 interpretation

- **We are in MVP 2 — the Admissible Layer / Admission Wedge.** This is the layer
  in which *candidate* material becomes *admissible estate* material **only
  through explicit, governed transitions** (accept → admitted; reject → no
  assertion; supersede → corrected-active + superseded-prior; malformed → refused;
  pending → proposed-but-not-recallable).
- **MVP 1 — the Recall Layer — is prior context.** The Recall Wedge
  dev/operator/seeded-estate proof chain (the Phase 32 series and the seeded live
  estate work) established the read/recall slice; MVP 2 builds the *write/admit*
  side of the same estate, gated even more conservatively.
- **Phase 33N is the first runtime slice of MVP 2 — but it does not complete MVP
  2.** It proves the *route shape, gating, fail-closed, and no-leak* behavior of a
  dev/operator-only intake; it does not prove the actual admission semantics
  end-to-end against a real store.
- **The missing proof that would (begin to) complete MVP 2 is the full governed
  transition:**
  candidate → an admitted assertion **actually exists** → that assertion **has
  status / provenance / receipt** → **recall can include it** →
  pending / rejected / malformed candidates **cannot** be recalled.
  Phase 33N stands in for each of these with deterministic synthetic placeholders
  (no durable assertion, no real receipt, no real recall query). Closing this gap
  requires durable storage, real assertion lifecycle, real recall-eligibility
  derivation, and the Straylight primitive review — **all of which remain blocked
  and out of scope here** (§10).

---

## 7. Acceptance verdict

> **Decision: ACCEPT Phase 33N as a bounded, disabled-by-default,
> dev/operator-only Admission Wedge route SPIKE for MVP 2 — and NOT as production
> route readiness, NOT as a final schema, NOT as durable-storage readiness, and
> NOT as Freeside / client integration readiness.**

This decision rests on the §4 grounded assessment: the Phase 33N implementation
stays **within** the Phase 33M §7–§15 authorization on every axis checked —
default-off mount, defense-in-depth disabled check, dev/operator gate behind the
global allowlist, dedicated `x-admission-service-token` header, strict synthetic
five-scenario shape, fail-closed on everything else, Storage Option A (no durable
writes / no migrations), single guarded no-leak send path over every response,
draft markers asserted false, carried-forward unresolved A–O markers, and the
required tests/static guards. Concretely, this gate states:

- **Accept Phase 33N as the route-spike implementation** Phase 33M authorized.
- **Do not accept it as production route readiness** — the route is
  dev/operator-only and disabled by default.
- **Do not accept it as a final schema** — every draft marker is false; the route
  contract is not final.
- **Do not accept it as durable-storage readiness** — Option A persists nothing;
  durable admission storage is a separate, later, blocked lane.
- **Do not accept it as Freeside / client integration readiness** — no Freeside
  import/call exists; the 45J adapter stays test-only.
- **Phase 33N does not complete MVP 2** (§6).
- **Phase 33N does not authorize** production admission, durable Admission Wedge
  storage, production auth/consent, a public `remember-this`, Discord
  command/history ingestion, user chat becoming memory, Freeside runtime/client
  integration, or package exports (§10).
- **Phase 33N does not freeze a final schema** and **does not complete the
  Straylight primitive review** (A–O remain unresolved; the deferral is
  spike-scoped and non-production).
- **Phase 33N does not finalize** idempotency, signer/authority, tenant/estate/
  actor identity binding, the route contract, or production readiness.

---

## 8. Known nuance / accepted risk

- **Transient health-test flake (resolved).** The Phase 33N change reported an
  earlier transient WSL2 uptime flake in a health test; the **final Codex
  acceptance confirmed the health test passed in isolation and in the full
  suite** (carried from the merge validation, not independently re-run here). No
  open health-test risk is accepted; this is recorded only for provenance.
- **Dedicated service-token header.** Using `x-admission-service-token` rather
  than `Authorization: Bearer` is **accepted** as correct: the global `/api/*`
  allowlist owns `Authorization` and is not exempt for `/api/admission`, so the
  dedicated header layers the dev/operator gate cleanly behind the global gate
  without collision (`auth-gate.ts:9-21`).
- **Guard-failure HTTP 500 fallback.** Returning a fixed `admission.fail_closed`
  body at HTTP 500 when the runtime no-leak guard rejects/throws is **accepted**
  as internal-anomaly fail-closed behavior: it is a never-expected path (public
  bodies are structurally safe), the fallback is hardcoded and not re-guarded, and
  it exposes none of the guard's findings (`admission-intake.ts:124-137,
  169-182`).
- **Storage Option A.** The no-durable-store posture is **accepted for the
  route-spike only** — it deliberately defers (does not solve) durable admission,
  receipt, idempotency, and signer/authority. It is **not** an acceptance of any
  future durable-admission design.
- **Five-scenario synthetic shape.** Accepting a strict synthetic five-scenario
  classifier (rather than a production request envelope) is **accepted** as the
  correct spike boundary; it deliberately accepts no production-like body and
  fails closed otherwise.

---

## 9. Next-lane recommendation

> **Selected: Phase 33P — Admission Wedge storage / receipt hardening decision
> gate (docs / decision-only).**

**Scope of Phase 33P (docs/decision-only — must implement nothing):**

- **Decide the next implementation lane's storage posture**, choosing among:
  - **remain on Option A** (no durable store; continue with synthetic
    future-intent outcomes);
  - **introduce a dev-only, bounded, env-gated synthetic admitted-assertion
    store** (Option B-style, mirroring the Recall `BoundedEstateStore` shape) so a
    later spike can exercise real candidate → admitted-assertion → recall-includes
    transitions against synthetic data; or
  - **decompose storage / receipt / idempotency / signer / authority into smaller,
    separately-gated lanes** (the most conservative path).
- **Phase 33P must not implement storage** (no DB writes, no migrations, no store
  code) — it is a decision gate only.
- **Phase 33P must preserve every production / public / Freeside / Discord /
  chat-to-memory block** (§10).

**Why 33P next.** The §6 MVP 2 gap is dominated by the missing durable
candidate → admitted-assertion → recall path, which in turn is gated by the
unresolved Straylight primitive review (A–O) and the ADR-022E durable-store gate.
A docs/decision-only storage/receipt hardening gate sequences that decision
safely before any further implementation, exactly as the 33H→33I→…→33M ladder
sequenced the spike authorization. Implementing storage directly would bypass the
review and durable-store gates.

---

## 10. Blocked lanes / what remains blocked now

Phase 33O is a docs/decision-only acceptance gate. It accepts **only** the bounded
Phase 33N dev/operator-only route spike of §7. Each of the following remains
blocked and is **not** accepted, authorized, or the next implementation lane:

- production admission;
- durable production Admission Wedge storage;
- migrations;
- production auth / consent;
- public `remember-this`;
- Discord command / history ingestion;
- user chat becoming memory;
- Freeside Characters runtime / client integration;
- package exports;
- LLM / voice;
- Finn production wiring;
- forget / revoke / correction UI;
- final schema freeze;
- production route deployment;
- a completed Straylight primitive-review claim;
- final idempotency semantics;
- production signer / authority semantics;
- production tenant / estate / actor identity binding;
- a final route contract (Phase 33G remains a *draft design*);
- production implementation readiness.

> **On "acceptance" specifically.** This gate **accepts only the bounded Phase
> 33N dev/operator-only route spike** under the Phase 33M §7–§15 constraints. It
> does **not** accept, authorize, or imply any broader route, any production/live
> route, any durable admission storage, or any production admission — those remain
> blocked above. The acceptance is bounded; it is not a production-route or
> MVP-2-completion acceptance.

If a later phase reaches for anything in the blocked list, it must re-open the
Phase 33E probe artifacts, the Phase 33F readiness gate, the Phase 33G design (as
corrected by 33H), the Phase 33H acceptance gate, the Phase 33I decomposition
gate, the Phase 33J review gate, the Phase 33K precondition design gate, the Phase
33L test-vector draft, the Phase 33M authorization gate, this acceptance gate, and
the relevant Straylight decision records (ADR-022E durable-store gate; ADR-026C /
ADR-026D route guardrails — Straylight-repo decision records) first; it must not
silently expand scope.

---

## 11. Success criteria for Phase 33O

This phase succeeds if:

- it **assesses the Phase 33N implementation read-only** against the Phase 33M
  §7–§15 authorization (§4–§5);
- it makes an **explicit accept / reject decision** (§7 — ACCEPT as a bounded
  dev/operator-only route spike);
- it states clearly that **Phase 33N does not complete MVP 2** and does not
  authorize production admission, durable storage, production auth/consent, public
  remember-this, Discord ingestion, chat-to-memory, Freeside integration, or
  package exports (§5, §6, §7, §10);
- it **selects a safe next lane** (§9 — Phase 33P storage / receipt hardening
  decision gate, docs/decision-only);
- it **preserves the production and public / runtime blocks** (§10);
- it does **not** mutate source / tests / validators / probes / fixtures /
  vectors / config / package files / lockfiles / CI / generated files;
- it keeps **all implementation out of Phase 33O**;
- Codex confirms the docs / decision-only scope.

---

## 12. Cross-references

- [`docs/ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)
  — Phase 33M authorization gate; its §7 scope, §8 unauthorized list, §9
  acceptance criteria, §10 tests, §11 idempotency, §12 auth/consent, §13/§13.1
  storage + rollback, and §14 no-leak constraints are the bar this gate checks the
  Phase 33N implementation against, and its §21 records the implementation.
  **Gains a minimal Phase 33O acceptance status note.**
- [`docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md)
  — the Phase 33N enable/disable runbook; the operational source-of-truth for the
  env gate, the dev/operator credential gates, the dedicated header, and the
  five-scenario mapping. Read-only here; **not modified**.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  — Phase 33L route-contract test-vector fixture draft; the five vectors and the
  no-leak denylist the Phase 33N classifier and runtime no-leak guard are built
  against. **Gains a minimal Phase 33O acceptance status note** (it already
  carries the 33M and 33N notes).
- [`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs)
  — the Phase 33L validator (read-only; **not modified**); its
  `FORBIDDEN_PUBLIC_KEYS`, substring/regex leak scans, UUID and opaque-run rules
  are the denylist the Phase 33N runtime no-leak guard mirrors.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K precondition design; its storage record shapes, service-auth/consent
  options, dev/operator scope option, idempotency precondition, no-leak posture,
  and threat model seed the §9 Phase 33P storage/receipt decision.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)
  — Phase 33J review register (A–O); the genuinely-unresolved rows (E, G, H, K, N,
  O) and review-dependent row (J) Phase 33N carries forward as draft markers and
  this gate keeps unresolved.
- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I decomposition; ordered the 33J→33N lanes this chain has executed.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)
  — Phase 33H acceptance gate; the structural model for this acceptance gate
  (accept-as-bounded-draft + not-production-ready verdict + blocker inventory +
  next lane).
- `app/src/routes/admission-intake.ts`, `app/src/services/admission-wedge-spike/`
  (`classifier.ts`, `public-response.ts`, `no-leak.ts`, `auth-gate.ts`,
  `index.ts`), `app/src/config.ts` (`:399-403`), `app/src/server.ts`
  (`:630-642`), `.env.example` (`:99-111`), and the spike tests under
  `app/tests/unit/admission-wedge-spike/` and
  `app/tests/integration/admission-intake/` — the Phase 33N implementation,
  inspected **read-only** to ground §4–§5. **None is modified by this phase.**
- `@loa/straylight` — canonical primitive/substrate owner of the assertion
  lifecycle, signer/keyring, receipt/audit, and storage-adapter vocabulary,
  read-only in `../loa-straylight`. **No completed Straylight Admission-Wedge
  primitive review was found** (33J §4); A–O remain unresolved, deferred
  spike-scoped only. The local checkout may be stale. **Not edited by this
  phase.**
- freeside-characters Phase 45J / PR #177 (**verified merged on GitHub**
  2026-06-06) — the cross-repo acceptance; its mirror/adapter proof is a pure,
  fixture-bound semantic mapping layer with **no live Dixie call**, test-only, not
  exported, not runtime-wired (§5, §10). **Not edited by this phase.**
