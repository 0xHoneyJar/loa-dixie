# Phase 33M — Admission Wedge Dev/Operator-Only Route-Spike Authorization Gate

> **Phase**: 33M
> **Branch context**: `phase-33m-admission-wedge-route-spike-authorization`
> **Related**: Dixie Phase 33A–33L (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle, signer/keyring,
> receipt/audit, and storage-adapter primitives
> **Status**: **docs / decision-only.** No route, route handler, storage, auth,
> consent, migrations, runtime tests, probe/validator mutation, fixture JSON,
> package, lockfile, CI, generated, or live integration change.
> **This is an authorization decision gate for a possible future Phase 33N
> dev/operator-only route spike — not an implementation.** It evaluates the
> evidence from Phases 33J / 33K / 33L and decides whether a future Phase 33N
> dev/operator-only route spike is authorized, rejected, or deferred. It changes
> **no** routes, storage, auth, consent, probes, validators, runtime behavior, or
> production schema. It does **not** freeze a final/production schema. It does
> **not** implement or execute a route spike.

This document follows the Dixie Phase 33L route-contract test-vector fixture draft
([`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md),
PR #130) and executes the **dev/operator-only route-spike authorization gate** that
the Phase 33I decomposition gate sequenced as lane 4
([`ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md:298-308`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md))
and that the Phase 33K precondition design gate listed exit criteria for
([`ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md:721-731`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)).
It assesses the accumulated evidence, makes an explicit authorize/reject/defer
decision, and — where it authorizes — bounds a future Phase 33N to an exact scope
and acceptance bar. It designs no envelope, implements no route, mutates no probe,
validator, or fixture, and authorizes no production behavior.

Every assessment below is grounded read-only against the actual Dixie repo (the
route seam, refusal vocabulary, config env-gates, the dev-seed precedent, the
database pool/migrations), the Phase 33E draft v1 probes and the Phase 33L
route-contract test vectors and their validators, the freeside-characters Phase 45J
artifacts and v1 probe adapter, and the Straylight (`@loa/straylight`) primitive
sources read-only in `../loa-straylight`. Where a citation is carried from a
local sibling checkout that may be stale, that is flagged.

> **This phase does not complete the Straylight primitive review.** Phase 33J
> requested it and **confirmed no completed Straylight Admission-Wedge
> primitive-review artifact exists**; the §5 review register (A–O) remains
> unresolved. This gate handles that as an **explicit, narrow deferral scoped to a
> synthetic dev/operator-only spike only** (§5, §6, §11–§13) — **not** as a
> resolution, and **never** for production.

---

## 1. Phase title and status

- **Phase 33M — Admission Wedge dev/operator-only route-spike authorization gate.**
- Dixie-side **docs / decision-only**.
- Follows Dixie Phase 33L / PR #130 (route-contract test-vector fixture draft).
- This is an **authorization decision gate for a possible future Phase 33N spike**,
  not an implementation.
- It changes **no** routes, storage, auth, consent, probes, validators, runtime
  behavior, source code, configuration, or production schema.
- It does **not** freeze a final/canonical/production schema.
- It does **not** mutate the Phase 33E probe JSONs (`hardening_phase: "33E"`,
  `dixie_admission_wedge_probe_v1`) or their validator, nor the Phase 33L
  route-contract test-vector JSONs (`phase: "33L"`) or their validator. Per the
  Phase 33D §6 invariant — any probe/validator mutation requires its own
  separately-gated phase — Phase 33M inspects them read-only.
- It does **not** implement or execute a route spike.
- It does **not** claim that the Phase 33E probes are a production schema, that the
  Phase 33G route contract is final, that Phase 33H made the route
  implementation-ready, that Phase 33I authorized a route spike, that Phase 33J
  completed the Straylight primitive review, that Phase 33K implemented
  storage/auth/consent, or that Phase 33L implemented runtime route tests or a
  route. None of those is true (§4, §18).

The audience for this document is the **future Phase 33N** (which, if it runs, is
bounded by §7–§15 here), the **Straylight (`@loa/straylight`) primitive owner**
(whose §5/A–O answers remain the gating production exit criteria), **future Dixie
production-readiness phases**, and **freeside-characters** as an
interested-but-blocked downstream consumer (§8, §18).

---

## 2. Source chain

This gate sits one rung above the Phase 33L test-vector fixture draft on the Dixie
route-contract ladder. It introduces no new contract material and freezes nothing;
it decides the future 33N lane and bounds it.

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33E | #122 | Probe hardening draft v1 / vocabulary refinement — bumps probes to `dixie_admission_wedge_probe_v1`, adds non-final markers and draft placeholders (idempotency / signer / receipt-split), hardens the validator; preserves all five scenarios; freezes no schema. ([`ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](ADMISSION-WEDGE-PROBE-HARDENING-GATE.md)) |
| 33G | #124 | Route-contract design — proposes (on paper) a draft route identity (`POST /api/admission/intake`), request/response envelopes with a public/private split, an idempotency sketch, an `admission.*` refusal taxonomy, storage/auth/consent preconditions, the Straylight review dependencies, and route-contract test vectors mapped from the five Phase 33E probes. ([`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)) |
| 33H | #126 | Route-contract acceptance / implementation-readiness decision gate — **accepts** 33G as a bounded docs-only draft (two minor docs-only corrections: refusal namespace is **two-part**; the receipt-split validator is **strict per-section**), renders **NOT implementation-ready**, inventories the blockers (§8 A–N), and selects 33I. ([`ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)) |
| 33I | #127 | Implementation-readiness decomposition gate — decomposes the 33H blockers into ordered lanes (33J Straylight review → 33K storage/auth/consent → 33L test-vector fixtures → **33M dev/operator-only spike authorization** → 33N possible spike), defines the evidence required before any route handler, and selects 33J. ([`ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)) |
| 33J | #128 | Straylight primitive-review request / vocabulary dependency gate — issues the §5 fifteen-item review register (A–O), builds the primitive dependency matrix and term-ownership classification, drafts a reusable cross-repo handoff, and selects 33K. **Did not complete the Straylight primitive review.** ([`ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)) |
| 33K | #129 | Storage/auth/consent precondition design gate — designs (on paper) draft storage record categories, service-auth and end-user-consent model *options*, a dev/operator-only scope option, an idempotency precondition, a no-leak posture, and a threat model; carries the 33J A–O register as exit criteria; selects 33L. **Implemented no storage/auth/consent.** ([`ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)) |
| 33L | #130 | Route-contract test-vector fixture draft — converts the Phase 33G §16 design vectors (A–E) into five non-runtime route-contract test-vector fixtures plus a docs-bound, Node-built-ins-only validator; carries the unresolved-review markers (E, G, H, K, N, O) and the review-dependent/non-final row (J) forward. **Implemented no runtime route tests and no route.** ([`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)) |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter track `dixie_admission_wedge_probe_v1`, **test-only**; v0 fails closed as `unknown_probe_version`. The adapter is a **pure, fixture-bound semantic mapping layer with no live Dixie call**. |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded test-only purpose; **recommended Dixie Phase 33F** as the next readiness gate (it did **not** select 33G). Authorizes no live client, no package export, no runtime wiring; confirms **live Dixie calls: absent**. **Verified MERGED on GitHub (merged 2026-06-06).** |

> **Grounding note on the 45J / PR #177 citation.** GitHub confirms
> freeside-characters **PR #177 is MERGED** (merged 2026-06-06). The local
> `../freeside-characters` checkout is **stale** for PR status (it sits on the
> PR-head branch, not the merge); GitHub's merged state — not the local tree —
> remains authoritative for PR status (carried from the Phase 33H/33I/33J/33K
> grounding notes).

### Straylight (`@loa/straylight`)

The canonical primitive/substrate owner of the assertion-lifecycle, signer/keyring,
receipt/audit, and storage-adapter vocabulary. Read-only in `../loa-straylight`.
**No Straylight artifact naming an "admission wedge", "assertion intake", or
admission route/endpoint was found** (repo-wide search returned zero hits, carried
from 33J §2 / 33K §2); the local checkout may be stale. This gate treats the
§5/A–O review register as **unresolved**, exactly as Phases 33J–33L did.

> **Cross-repo phase-numbering caution.** Dixie's 33-series and the
> freeside-characters 45-series are independent labels in separate repositories and
> must not be conflated.

---

## 3. Purpose

- **Phase 33M evaluates whether the evidence from 33J / 33K / 33L is sufficient to
  authorize a future dev/operator-only Phase 33N route spike** (§4, §5).
- **Phase 33M does not implement the route spike.** It mounts nothing, writes no
  storage, adds no auth/consent, and runs no route test.
- **Phase 33M does not authorize production admission.** Production admission,
  production storage/auth/consent, and a production/live route remain blocked (§18).
- **Phase 33M must decide one of:**
  - **authorize** a future Phase 33N dev/operator-only route spike under strict
    constraints;
  - **reject** route-spike authorization; or
  - **defer** route-spike authorization pending more docs/non-runtime evidence.

The decision is made explicitly in §6, constrained by the strict evidence
assessment in §4–§5.

---

## 4. Current evidence inventory

Each row is grounded read-only. Nothing below is treated as production-ready;
nothing is treated as a completed Straylight review.

| Evidence item | Source phase / file | Status | What it proves | What it does not prove | Impact on 33M decision |
|---------------|---------------------|--------|----------------|------------------------|------------------------|
| **A. Five Phase 33E draft v1 probes** | 33E / PR #122; `docs/admission-wedge/fixtures/*.json` + `validate-fixtures.mjs` | Draft v1 — **not** a production schema (`schema_final:false`, `canonical_schema:false`, `route_contract:false`, `runtime_enabled:false`, `production_admission:false`, `straylight_primitive_review_complete:false`) | The five admission semantic scenarios (pending, accept, reject, supersede, fail-closed) hold as a public-safe, no-leak-validated *shape* | A route, storage, auth, a final schema, or a completed review | Provides the substrate semantics a dev-only spike could exercise as fixtures. Not production. |
| **B. Phase 33G route-contract design** | 33G / PR #124; `ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md` | Draft design; accepted-as-draft by 33H; **not final** | A coherent paper contract: draft route identity (`POST /api/admission/intake`), public/private split, draft `admission.*` taxonomy, idempotency sketch | A final route contract, a wire schema, or implementation readiness | Supplies the draft contract a spike would implement against. Must stay labelled draft. |
| **C. Phase 33H acceptance / NOT-implementation-ready verdict** | 33H / PR #126; `ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md:246-279` | Accepted as bounded docs-only draft; **NOT implementation-ready**; 14 blockers (A–N) | The design is sound enough to proceed in docs/decision lanes | That any blocker is closed, or that a spike is authorized | Confirms production implementation is far off; bounds any spike to dev/operator-only. |
| **D. Phase 33I decomposition / readiness checklist** | 33I / PR #127; `:182-216,520-549` | Docs/decision-only; orders lanes 33J–33N; adds meta-blockers O (acceptance bar) + P (production bar) | The ordered lane plan, and the evidence set a future 33M must require | That 33I authorized a spike (it explicitly did not — §10/§11) | Defines this very gate's charter (lane 4) and the evidence bar it must check. |
| **E. Phase 33J primitive-review request / unresolved dependencies** | 33J / PR #128; `ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md:176-203` | **Review NOT complete**; A–O register issued; genuinely unresolved rows **E, G, H, K, N, O**; review-dependent/non-final **J** | The exact vocabulary dependencies and which are unresolved | A completed/blessed Admission-Wedge primitive review | The gating production exit criterion. For a spike, requires an **explicit narrow deferral** (§5, §11) or it blocks. |
| **F. Phase 33K storage/auth/consent precondition design** | 33K / PR #129; `:259-609` | Design-only **options**; nothing implemented | Storage record *shapes*; service-auth Options A/B/C/D; consent Options A/B/C/D; a dev/operator-only scope option; idempotency precondition; threat model | Any implemented storage/auth/consent, or a selected production model | Supplies the draft constraints a spike must adopt; mandates Option C-style dev-only synthetic paths only. |
| **G. Phase 33L route-contract test-vector fixtures + validator** | 33L / PR #130; `docs/admission-wedge/route-contract-test-vectors/*` | Docs / non-runtime fixture-only; five vectors; all non-final flags false; carries unresolved markers | A fixture-level contract for the five scenarios, with an explicit public-surface no-leak denylist and synthetic-id discipline (`validate-route-contract-test-vectors.mjs`) | Runtime route tests, a route, storage writes, or auth/consent | Provides the fixture/test-vector evidence a spike must satisfy with real tests. Not runtime proof. |
| **H. Existing Recall Wedge route-seam precedent** | `app/src/routes/recall-intake.ts`; `app/src/server.ts:567-615` | Live, **default-off**, fail-closed recall route (read-only analogy) | A repo-proven disabled-by-default `/api/<wedge>/intake` seam with JWT/wallet auth, idempotency cache, refusal mapping | Anything about admission — there is **no** `/api/admission` route | Read-only analogy only: a spike may mirror its default-off gating shape, not its authority. |
| **I. Existing PostgreSQL infrastructure** | `app/src/db/{pool,migrate}.ts`, `app/src/db/migrations/`; governance/reputation stores | Exists for governance/reputation/fleet — **not** admission storage | Dixie has a pg pool + forward-only migrations | That admission storage exists or is authorized; durable estate store is gated by ADR-022E (held) | Grants **no** admission write authorization; a spike must avoid production storage entirely (§13). |
| **J. Existing service auth patterns** | `app/src/config.ts`, `app/src/routes/auth.ts`, `app/src/services/memory-auth.ts`, recall `capability-holder.ts` | Live JWT/wallet + dev-seed HMAC patterns (read-only analogy) | Proven bearer/JWT + signed-envelope + dev-seed-HMAC-with-no-stored-secret patterns | Any admission auth — none exists; `dev_signature` is an inert enum member, not a backdoor | Read-only analogy only: a spike may mirror the dev/operator gate shape, not claim production auth. |
| **K. Freeside 45I/45J compatibility proof** | 45J / PR #177 (merged 2026-06-06); `../freeside-characters/...probe-adapter.ts` | Test-only probe-adapter compatibility; **no live Dixie call**, not exported, not runtime-wired | The Freeside adapter mirrors Dixie v1 probes in tests | Any runtime authorization, live client, or coupling to a live Dixie route | A spike must add **no** Freeside runtime/client integration (§8, §18). |

> **Disabled-by-default precedent (grounding for §7/§9, analogy only).** The Recall
> Wedge route is **not registered at all** unless `config.recallIntakeEnabled` is
> true (`server.ts:567`), and that flag fails closed at startup unless
> `STRAYLIGHT_RUNTIME_DIXIE_KEY` is non-empty (ADR-026D §4.a;
> `config.ts:283-294`). The Phase 32K dev/operator seed is a separate
> default-off gate (`DIXIE_RECALL_INTAKE_DEV_SEED_ENABLED`) that requires the route
> gate too, seeds exactly one **synthetic** tenant, stores no secrets, ingests no
> user input, and logs `NOT production memory admission` (`server.ts:574-592`,
> `config.ts:323-345`). This is the exact shape a Phase 33N spike must mirror — it
> is a **grounded analogue, not an authorization**.

---

## 5. Evidence sufficiency assessment

**Be strict.** *Sufficient for production?* is **NO** for every row — nothing in the
33J/33K/33L evidence makes production admission ready, and §18 keeps it blocked.
*Sufficient for dev/operator-only spike?* is **Yes** only where the item is
explicitly constrained and **disabled-by-default**, with synthetic-only data and no
production claim.

| Dimension | Current status | Sufficient for dev/operator-only spike? | Sufficient for production? | Required 33N constraint or blocker | Notes |
|-----------|----------------|:--:|:--:|------------------------------------|-------|
| **Route contract shape** | 33G draft, accepted-as-draft by 33H; not final | **Yes (as draft)** | **No** | Implement against 33G as a **draft** contract; do not claim final | 33G §4. Path stays `POST /api/admission/intake` unless evidence renames it. |
| **Scenario coverage** | Five 33L vectors mirror five 33E probes | **Yes** | **No** | All five scenarios covered by spike tests (§10) | Frozen-by-count; no sixth scenario. |
| **Public no-leak evidence** | 33L validator denylist + 33E probe deep-walk | **Yes, with required runtime tests** | **No** | Inherit 33L denylist; add **runtime** no-leak tests + static/grep guard | Runtime serializer is unbuilt (33J row K); spike must build + test it. |
| **Storage model** | 33K design-only; Options A/B/C | **Yes, Option A or B only** | **No** | Option A (no durable writes) **preferred**, else Option B (dev-only synthetic, env-gated). **Reject Option C (production-like).** | §13. No migrations. |
| **Service authentication** | 33K Option C dev/operator synthetic; Options A/B deferred to signer review | **Yes, Option C only, default-off** | **No** | Dev/operator/service gate, disabled by default, synthetic, no stored secret | §12. Production Options A/B await signer review (row F). |
| **End-user consent / dev-only omission** | 33K Option C omission marker, synthetic subjects | **Yes, Option C only** | **No** | Explicit non-production omission marker; synthetic subjects only; cross-user admission blocked | §12. Production Options A/B (consent artifact / platform grant) blocked. |
| **Idempotency** | 33K §8 draft; 33J row J keying unresolved | **Yes, draft/dev-only or explicitly deferred** | **No** | Draft/dev-only behavior only; no final-idempotency claim; conflicts fail closed or deferred | §11. |
| **Straylight primitive review** | **UNRESOLVED** (33J §4; A–O open) | **Yes, only via explicit narrow deferral for the synthetic spike** | **No** | Carry A–O as unresolved markers; spike asserts no resolution; **deferral is spike-scoped, never production** | §6, §11–§13. This is the gating item. |
| **Tenant/estate/actor binding** | 33K §11 synthetic-only; row G partly unresolved | **Yes, synthetic scoped IDs only** | **No** | Synthetic IDs only; session-derived posture; no production identity binding | §12. |
| **Rollback / partial failure** | Draft spike-scoped rollback / partial-failure policy defined by Phase 33M (§13.1); production rollback semantics unresolved | **Yes, only if 33N implements / tests fail-closed behavior under this draft policy** | **No** | 33N must test partial-failure refusal / no-leak / no-recallable-partial-state behavior for the chosen storage posture (Option A preferred, else Option B); production rollback semantics remain unresolved | §9, §13.1, §17. |
| **Runtime test plan** | No runtime tests exist yet (33H blocker N; 33L is non-runtime); Phase 33M defines the required runtime test plan for 33N in §10. No app tests are added in 33M; no route is implemented in 33M | **Yes, only if the spike adds the §10 tests** | **No** | Tests first or with implementation; cover all five scenarios + negatives + no-leak; 33N must add these tests if it is implemented | §10. |
| **Kill switch / env gate** | Recall route + dev-seed precedent (default-off, fail-closed) | **Yes — REQUIRED** | **No** | Explicit env gate; route not registered unless enabled; kill switch | §7, §9. Mirrors `recallIntakeEnabled`. |
| **Operator allowlist** | Recall allowlist precedent (read-only analogy) | **Yes — REQUIRED** | **No** | Explicit operator/service allowlist; non-operator denied | §9. |
| **Logging / redaction** | span-sanitizer + `storage_unavailable` scrub precedent | **Yes, with required redaction** | **No** | Hash identity ids; never log raw payload/source/secret; public refusals classification-only | §14. Production operational-logging policy unfinalized. |
| **Production readiness** | Undefined (33I blocker P) | **No** | **No** | N/A — production remains fully blocked | §18. Nothing makes production ready. |

> **OVERALL ASSESSMENT.** The evidence is **sufficient to authorize a future Phase
> 33N dev/operator-only route spike under strict constraints**, and is
> **insufficient for any production admission, storage, auth, consent, public
> rollout, or Freeside runtime integration**. The single gating item — the
> unresolved Straylight primitive review — is handled for the spike by an
> **explicit, narrow deferral scoped only to the synthetic dev/operator-only path**
> (§6, §11), carrying the A–O markers forward as unresolved; it is **not** resolved,
> and the deferral does **not** extend to production.

---

## 6. Decision

> **Decision: AUTHORIZE a future Phase 33N dev/operator-only Admission Wedge route
> spike under the strict constraints in §7–§15 — with the Straylight primitive
> review (A–O) explicitly deferred for the synthetic dev/operator-only spike only,
> never for production.**

This decision rests on the strict §5 assessment: every dimension is either
sufficient for a constrained, disabled-by-default, synthetic dev/operator path, or
is carried as an explicit dev-only/draft constraint or deferral. The one gating item
(the unresolved Straylight review) is dispositioned by a **narrow, spike-scoped
deferral** — consistent with 33J §12 ("if a spike is ever authorized, it must be
disabled by default and use draft/dev-only markers for unresolved vocabulary"), 33K
§9/§10 Option C and §15 exit criteria, and 33I §10's evidence bar.

Concretely, this gate states:

- **Phase 33M authorizes only future Phase 33N implementation of a
  disabled-by-default, dev/operator-only route spike** bounded by §7–§15.
- **Phase 33M does not implement it.** No route, storage, auth, consent, migration,
  or runtime test is created here.
- **Phase 33M does not authorize production** — not production admission, not
  production storage/auth/consent, not a production/live route, not public rollout.
- **Phase 33M does not authorize Freeside runtime/client integration.** The Freeside
  adapter stays test-only, not exported, not runtime-wired, with no live Dixie call
  (45J).
- **Phase 33M does not authorize a public `remember-this`.**
- **Phase 33M does not authorize Discord ingestion or user chat becoming memory.**
- **Phase 33M does not freeze a final/production schema.**
- **Phase 33M does not resolve the Straylight primitive review.** A–O remain
  unresolved; the deferral is spike-scoped and non-production.
- **Phase 33M does not authorize Phase 33N to exceed the constraints in this
  document.** Anything beyond §7–§15 requires a separate gate.

---

## 7. Authorized 33N scope (if implemented)

Phase 33N, if it runs, is allowed **only** to do the following, and **only** within
the constraints of §8–§15:

- implement a **single dev/operator-only Admission Wedge route spike**, likely
  `POST /api/admission/intake` (the Phase 33G draft path), **unless evidence at
  implementation time requires a rename** — distinct from the existing
  `POST /api/recall/intake` seam;
- **disabled by default** — the route must not be registered unless an explicit env
  gate is enabled (mirroring `config.recallIntakeEnabled` / the Phase 32K dev-seed
  gate);
- behind an **explicit env gate**;
- behind an **explicit operator/dev gate or service gate** (allowlist);
- with **no production enablement**;
- with **no public rollout**;
- with **no Freeside runtime/client integration**;
- with **no Discord ingestion**;
- with **no public `remember-this`**;
- with **no automatic chat-to-memory**;
- with **no final-schema claim**;
- with **no production storage claim**;
- with **no production auth/consent claim**;
- using the **Phase 33L vectors as fixture contract evidence**;
- using the **Phase 33K storage/auth/consent assumptions as draft constraints**;
- **preserving the Phase 33J unresolved-review markers** (E, G, H, K, N, O) and the
  review-dependent/non-final row (J) as draft/deferred — never as resolved;
- ensuring **public responses pass the no-leak boundary** (§14);
- ensuring **private/audit details never appear in public responses**;
- ensuring **all unknown or unsupported shapes fail closed**;
- ensuring **all error/refusal paths use stable, public-safe codes** (the existing
  `ingress.invalid_request` for shape failure; draft/non-final `admission.*` markers
  otherwise — never leaking the hidden reason);
- ensuring **no raw candidate / source / reasons / debug / stack / tokens / URLs /
  operational IDs** appear in any public response;
- adding **tests and static guards** required by §10 before acceptance.

### Storage posture for 33N (choose and justify)

- **Option A — no durable Admission Wedge storage.** The route spike returns
  **safe future-intent receipts only**, backed by fixtures / stubs / in-memory
  ephemeral state. No database, no migration, no persisted candidate/assertion.
- **Option B — dev-only synthetic bounded store.** A non-production, explicitly
  env-gated, in-process/bounded synthetic store (mirroring the Recall
  `BoundedEstateStore` shape), with **no production storage claim** and no
  migration.
- **Option C — production-like storage write path.** A real, durable admission
  write path.

> **Recommendation: choose Option A (preferred) or Option B; reject Option C for
> 33N.** Option A keeps rollback trivial (nothing durable to roll back) and avoids
> the unbuilt durable-store gate (ADR-022E, held). Option B is acceptable only if a
> spike genuinely needs to exercise replay/idempotency against a bounded synthetic
> store, and only behind the same default-off env gate. **Option C is not authorized
> by this gate** and would require a separate, later production-storage gate.

---

## 8. Explicitly unauthorized for 33N

Even if authorized, Phase 33N must **not** do any of the following:

- no production admission;
- no production storage / auth / consent;
- no public `remember-this`;
- no Discord command / history ingestion;
- no user chat becoming memory;
- no Freeside Characters runtime / client integration;
- no package exports;
- no LLM / voice / Finn production wiring;
- no forget / revoke / correction UI;
- no final schema freeze;
- no cross-user admission;
- no production tenant / estate / actor identity binding;
- no claim that the Straylight primitive review is complete;
- no claim that idempotency semantics are final;
- no global route enablement;
- no live public rollout;
- no raw / private / audit / operational data in any public response.

---

## 9. Required 33N acceptance criteria

Before Phase 33N can be accepted, it must satisfy **all** of the following. (These
are the bar a future review/audit checks; this gate defines them, it does not run
them.)

- [ ] **disabled-by-default config** — the spike is off unless explicitly enabled;
- [ ] **explicit env gate** — a named env flag controls the spike (a new
  `DIXIE_ADMISSION_*_ENABLED`-style flag checked `=== 'true'`, mirroring
  `DIXIE_RECALL_INTAKE_ENABLED` at `config.ts:283-294`; fail-closed at startup on
  invalid/misconfigured values);
- [ ] **operator/service allowlist** — only allowlisted operators/services may call
  (constant-time compare; an empty/unset allowlist rejects all);
- [ ] **dev-only scope indicator** in config and docs (cf. the Phase 32K dev-seed
  `NOT production memory admission` marker);
- [ ] **no production defaults** — all spike gates default to off/false;
- [ ] **route registration / server wiring gated and off by default** — the route is
  **not registered at all** when the gate is off (cf. `server.ts:567`);
- [ ] **no `/api/admission/intake` route active unless the gate is enabled**;
- [ ] **safe refusal when disabled** — calls to a disabled spike fail closed
  (e.g. 404/not-mounted), leaking nothing;
- [ ] **safe refusal when unauthorized** — non-operator/non-allowlisted callers are
  denied with a stable public code;
- [ ] **safe refusal on malformed/unsafe payload** — fail closed
  (`ingress.invalid_request`), no leak;
- [ ] **all five Phase 33L vector scenarios covered by tests** (pending, accept,
  reject, supersede, fail-closed);
- [ ] **no-leak public-response tests** over every scenario's public surface;
- [ ] **static / grep guard** proving public responses cannot include forbidden
  fields;
- [ ] **no raw candidate / source / reasons / private audit / operational IDs** in
  any public response;
- [ ] **idempotency draft behavior tested or explicitly deferred** in the code path;
- [ ] **no production storage writes** (Option A preferred; Option B only as
  dev-only synthetic, env-gated);
- [ ] **no migrations** unless separately authorized — preferably none;
- [ ] **no Freeside runtime / client call path**;
- [ ] **no Discord ingestion**;
- [ ] **no package export** unless separately authorized;
- [ ] **docs / runbook note** for enabling/disabling the spike if any env gate
  exists;
- [ ] **rollback / removal path** — the spike can be fully removed/disabled with no
  durable residue;
- [ ] **fail-closed partial-failure behavior tested** — tests/guards prove the draft
  rollback / partial-failure policy (§13.1): any partial failure fails closed, leaks
  nothing, leaves **no recallable partial state**, creates **no duplicate** admitted /
  corrected assertions, marks **no** pending/rejected/malformed candidate recallable,
  and (Option B) leaves the synthetic store with **no partially-admitted residue**;
- [ ] **stable public-safe codes on partial failure** — all rollback / partial-failure
  public responses use stable public-safe refusal codes, never leaking the hidden
  reason.

---

## 10. Required 33N tests / guards

If implemented, Phase 33N must add at least the following tests/guards (test-first
or with implementation):

- **disabled gate denies** — with the gate off, the route is not mounted / denies
  safely;
- **missing/invalid auth denies** — no/invalid operator/service credential → denied;
- **non-operator denies** — a non-allowlisted caller → denied;
- **malformed payload fails closed** — `ingress.invalid_request`, no leak;
- **pending scenario** — candidate proposed, not recallable, no public receipt;
- **accept/admit scenario** — admitted outcome, recall-eligible projection, no leak;
- **reject scenario** — denied outcome, no assertion minted, no leak;
- **supersede/correction scenario** — corrected-active included, superseded prior
  excluded from ordinary recall, no leak;
- **malformed/unsafe scenario** — fail-closed refusal, no `unsafe_marker:`/raw
  payload/stack trace;
- **no-leak test over all public responses** — deep-walk every public surface
  against the §14 denylist;
- **route never active by default** — a test asserts the route is absent unless the
  env gate is set;
- **config production defaults safe** — defaults are off/false;
- **no Freeside import** — a static guard asserts no `freeside`/adapter import in the
  spike path;
- **no package export** — a static guard asserts the spike is not exported;
- **no app/runtime import into docs validators** — the Phase 33E/33L validators stay
  Node-built-ins-only and import nothing from `app/`;
- **if a storage stub/in-memory store is used, prove no production storage writes** —
  a test asserts no pg pool / migration / durable write is reachable from the spike;
- **partial-failure fails closed (§13.1)** — a test injects a partial failure and
  asserts the response fails closed with a stable public-safe code, leaks nothing,
  and (Option A) creates no durable state / (Option B) leaves the synthetic store with
  no recallable admitted assertion and no partially-admitted residue;
- **no recallable partial state / no duplicate / no premature recallability** — tests
  assert a partial failure creates no recallable assertion without a complete accepted
  transition, no duplicate admitted/corrected assertion, and marks no
  pending/rejected/malformed candidate recallable.

---

## 11. Idempotency stance for 33N

- **Final idempotency semantics remain unresolved** (33J row J; 33K §8;
  `idempotency_final: false`).
- Phase 33N may implement **draft / dev-only** idempotency behavior **only** if
  needed for the spike.
- Phase 33N must **not** claim final idempotency.
- Phase 33N may use **synthetic deterministic idempotency keys in tests**, but must
  **not** leak them publicly (idempotency keys are a §14 forbidden public field).
- **Conflicting retries** (same key, different intent) should **fail closed** or be
  **explicitly deferred** in the code path.
- **Duplicate assertion / correction minting** must be **blocked** — or made
  **explicitly impossible** by the chosen dev-only storage model (Option A's
  future-intent receipts mint nothing durable; Option B must block duplicate mint).

---

## 12. Auth / consent stance for 33N

- **Production auth/consent is not authorized.**
- Phase 33N may use a **dev/operator-only gate or service gate only**, and **only if
  disabled by default**.
- **No end-user production consent model is implemented in 33N** (production consent
  Options A/B — explicit consent artifact / platform-mediated grant — remain
  blocked).
- If a **consent omission marker** is used, it must be **explicit and
  non-production** (cf. 33K §10 Option C).
- **Cross-user admission remains blocked** — synthetic subjects only.
- **No public `remember-this`.**
- Service authentication only proves a service may *call* Dixie; it does **not**
  prove end-user/channel/tenant/surface authorization. **Service auth ≠ end-user
  consent** (the load-bearing 32F §7 / 33A boundary, restated).

---

## 13. Storage stance for 33N

- **Production storage is not authorized.** Existing PostgreSQL infrastructure
  (`app/src/db/`) is **not** Admission Wedge storage and grants no admission write
  authorization (ADR-022E held).
- **Allowed 33N storage posture (choose one, §7):**
  - **preferably no durable writes** — fixture-backed / future-intent receipts only
    (Option A); **or**
  - an **explicitly env-gated dev-only synthetic bounded store** if necessary
    (Option B).
- **No migrations** unless separately authorized — preferably none.
- **Public receipt references must be synthetic / non-sensitive** (short synthetic
  placeholders, never operational IDs/UUIDs — §14).
- **Audit / private details may be represented only as safe placeholders** if no
  real storage exists (e.g. `audit_event_class`, `effect_class`, mirroring the 33L
  vectors).
- **No raw payload persistence** unless separately authorized and protected — and
  preferably **no raw persistence** in 33N.

### 13.1 Draft rollback / partial-failure policy for 33N

Phase 33H/33I left rollback / partial-failure behavior undesigned, and Phase 33K
required it to be drafted before this gate. This subsection **drafts** that policy so
the Phase 33K precondition is satisfied. It is a **draft policy sufficient only for a
disabled-by-default, dev/operator-only Phase 33N spike — not production.** Production
rollback semantics remain unresolved and are **not** authorized by this gate. This
policy is a **Phase 33M draft acceptance prerequisite for 33N only, not production
readiness.**

A future Phase 33N, if implemented, must satisfy **all** of the following under the
chosen storage posture (§7, §13):

- **Fail closed on any partial failure.** Any partial failure during admission
  handling must produce a safe refusal (or, for Option A, a safe future-intent
  result) — never a partially-applied success.
- **Option A (no durable Admission Wedge storage / future-intent receipts only):**
  there is **no durable state to roll back**; on any partial failure the response
  must be a **safe refusal or a safe future-intent result only**, and nothing
  recallable may be created.
- **Option B (dev-only synthetic bounded store):** any **partial write, inconsistent
  state transition, or audit mismatch must fail closed and leave no recallable
  admitted assertion**; the synthetic store must end in a consistent state with no
  partially-admitted residue.
- **No leak on partial failure.** No partial-failure path may expose
  private / audit / source / raw / debug / operational details publicly (§14).
- **No recallable partial state.** No partial failure may create a recallable
  assertion **without a complete accepted transition**.
- **No duplicates.** No partial failure may create duplicate admitted / corrected
  assertions.
- **No premature recallability.** No partial failure may mark
  pending / rejected / malformed candidates recallable.
- **Stable public-safe codes.** All rollback / partial-failure public responses must
  use **stable public-safe refusal codes** (`ingress.invalid_request` for shape
  failure; draft / non-final `admission.*` markers otherwise — never leaking the
  hidden reason).
- **Production rollback semantics remain unresolved and are not authorized.** A
  production rollback / partial-failure model requires a separate, later gate.

---

## 14. Public / private no-leak stance for 33N

- Phase 33N must **inherit the Phase 33L validator denylist** — the
  `FORBIDDEN_PUBLIC_KEYS` set, `FORBIDDEN_SUBSTRINGS`, `FORBIDDEN_PATTERNS`, and the
  UUID/opaque-run rules
  (`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`),
  as the runtime no-leak baseline.
- The **public response must exclude all forbidden categories**: raw candidate
  payload, source material, raw reasons, private/audit fields, operational
  tenant/estate/actor IDs, idempotency keys, authority/signature material, tokens,
  secrets, URLs, stack traces / debug internals, storage internals.
- The **public response must not include UUIDs or long opaque IDs**.
- The **public response must use short synthetic placeholders only**.
- **Private / audit info must stay private or be placeholder-only.**
- **Unknown / unsupported shapes fail closed** with a stable public-safe code
  (`ingress.invalid_request`), never revealing the hidden reason (cf. the recall
  `storage_unavailable` scrub precedent that drops raw reasons from the public body
  and keeps them only in the internal audit object).

---

## 15. 33N implementation prompt skeleton (if implemented)

This is a **bounded, safe** high-level skeleton for the future Phase 33N. It
contains **no code and no implementation detail beyond constraints**.

> **Phase 33N — dev/operator-only Admission Wedge route spike (implementation).**
>
> - Implement **only** the authorized dev/operator-only route spike (§7); a single
>   route, likely `POST /api/admission/intake`, distinct from the recall seam.
> - Use **this Phase 33M doc as the contract** (scope §7, blocks §8, acceptance §9,
>   tests §10, idempotency §11, auth/consent §12, storage §13, no-leak §14).
> - **Do not exceed scope** — anything beyond §7–§15 needs a separate gate.
> - **Add tests first or with implementation** (§10) — all five scenarios,
>   negatives, and no-leak.
> - **No production defaults** — disabled-by-default env gate + operator allowlist;
>   route not registered unless enabled.
> - **No migrations** unless explicitly authorized — prefer Option A (no durable
>   writes).
> - **No Freeside integration**, no Discord ingestion, no public `remember-this`, no
>   chat-to-memory.
> - **No final-schema claim**; preserve the 33J unresolved markers (E, G, H, K, N,
>   O) and review-dependent row (J).
> - **Stop before commit / PR for Codex audit** — leave the working tree for review;
>   do not stage, commit, push, or open a PR autonomously.
>
> Files a 33N implementation is likely to inspect (read-only grounding, not a
> directive to mutate beyond the spike): `app/src/server.ts` (conditional mount
> precedent), `app/src/routes/recall-intake.ts` (route-seam precedent),
> `app/src/config.ts` (env-gate precedent),
> `app/src/services/straylight-recall-intake/refusal-mapping.ts` (refusal
> vocabulary), and the Phase 33L vectors as the fixture contract.

---

## 16. Decision: next lane

> **Selected: Phase 33N — dev/operator-only Admission Wedge route spike
> implementation, under the Phase 33M constraints (§7–§15).**

**Reason:**

- The §5 strict assessment shows the evidence is sufficient for a constrained,
  disabled-by-default, synthetic dev/operator spike, and the three hard
  preconditions are dispositioned by this gate: (1) the unresolved Straylight review
  is dispositioned by an explicit, narrow, spike-scoped deferral that names each
  unresolved row (E, G, H, K, N, O) and the review-dependent row (J) as
  carried-forward / non-final (§5, §6, §11); (2) a draft rollback / partial-failure
  policy is defined (§13.1) and required as an acceptance precondition (§9, §10, §17);
  and (3) a runtime test plan is required as an acceptance precondition (§9, §10).
- 33I sequenced 33N as the lane after this authorization gate
  (`:243,309-314`), and 33K's §15 "before any Phase 33N implementation" exit
  criteria are satisfiable by §7–§15 here (explicit authorization, disabled-by-
  default, no production claims, separate audit of source changes, no Freeside
  runtime integration).
- **Production admission, production storage/auth/consent, public rollout, and
  Freeside runtime integration remain blocked** and are **not** the next lane.

**Note on scope of the authorization.** Only the **narrow Phase 33N dev/operator-only
route spike** described here is authorized. **Any broader route spike, any
production/live route, and any production admission remain blocked** (§18).

---

## 17. Future Phase 33N boundaries

Repeating the allowed/blocked boundaries for the authorized lane:

**Allowed (Phase 33N only, under §7–§15)**

- a single dev/operator-only route spike (likely `POST /api/admission/intake`),
  disabled by default, behind an explicit env gate + operator/service allowlist;
- Option A (no durable writes / future-intent receipts) **preferred**, or Option B
  (dev-only synthetic bounded store, env-gated) if necessary;
- draft/dev-only idempotency behavior or explicit deferral;
- dev/operator-only auth gate + non-production consent omission marker;
- synthetic identifiers only; cross-user admission blocked;
- the five Phase 33L scenarios + negatives + no-leak, tested;
- inherited Phase 33L no-leak denylist; fail-closed on unknown shapes;
- a kill switch, docs/runbook note, and a rollback/removal path.

**Blocked (Phase 33N, even if implemented)**

- production admission; production storage / auth / consent;
- a production / live / globally-enabled route; public rollout;
- migrations (unless separately authorized; prefer none);
- Freeside runtime / client integration; package exports;
- public `remember-this`; Discord ingestion; user chat becoming memory;
- LLM / voice / Finn production wiring; forget / revoke / correction UI;
- final schema freeze; final idempotency / signer / authority claims;
- production tenant / estate / actor identity binding;
- a completed-Straylight-primitive-review claim;
- any raw / private / audit / operational data in a public response.

---

## 18. What remains blocked now

Phase 33M is a docs/decision-only authorization gate. It authorizes **only** the
narrow Phase 33N dev/operator-only route spike of §7. Each of the following remains
blocked:

- production admission;
- production storage / auth / consent;
- public `remember-this`;
- Discord command / history ingestion;
- user chat becoming memory;
- Freeside Characters runtime changes;
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
- a final route contract (33G remains a *draft design*);
- production implementation readiness.

> **On "route spike authorization" specifically.** This gate **authorizes only the
> narrow Phase 33N dev/operator-only route spike** under the §7–§15 constraints. It
> does **not** authorize any broader route spike, any production/live route, or any
> production admission — those remain blocked above. The authorization is bounded;
> it is not a general route-spike or production-route authorization.

If a later phase reaches for anything in the blocked list, it must re-open the Phase
33E probe artifacts, the Phase 33F readiness gate, the Phase 33G design (as corrected
by 33H), the Phase 33H acceptance gate, the Phase 33I decomposition gate, the Phase
33J review gate, the Phase 33K precondition design gate, the Phase 33L test-vector
draft, this authorization gate, and the relevant Straylight decision records
(ADR-022E durable-store gate; ADR-026C / ADR-026D route guardrails — Straylight-repo
decision records) first; it must not silently expand scope.

---

## 19. Success criteria for Phase 33M

This phase succeeds if:

- it **evaluates the Phase 33J / 33K / 33L evidence** (§4, §5);
- it makes an **explicit authorize / reject / defer decision** (§6 — authorize, with
  a spike-scoped Straylight deferral);
- if authorized, it **defines strict Phase 33N scope and acceptance criteria**
  (§7–§15);
- it **preserves the production and public / runtime blocks** (§8, §18);
- it does **not** mutate code / fixtures / probes / validators;
- it keeps **all implementation out of Phase 33M**;
- Codex confirms the docs / decision-only scope.

---

## 20. Cross-references

- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  — Phase 33L route-contract test-vector fixture draft; the five vectors and the
  no-leak denylist this gate's §9/§10/§14 rely on. Gains a minimal 33M status note.
- [`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs)
  — the Phase 33L validator (read-only; **not modified**); its `FORBIDDEN_PUBLIC_KEYS`,
  substring/regex leak scans, UUID and opaque-run rules are the no-leak baseline a
  33N spike must inherit (§14).
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K precondition design; its §6 storage record shapes, §9 service-auth
  Options A/B/C/D, §10 consent Options A/B/C/D, §12 dev/operator scope option, §8
  idempotency precondition, §13 no-leak posture, §14 threat model, and §15 exit
  criteria seed this gate's §5/§7/§11/§12/§13.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)
  — Phase 33J review register (A–O), the genuinely-unresolved rows (E, G, H, K, N, O)
  and review-dependent row (J) this gate carries forward as unresolved markers, and
  §12's "if a spike is ever authorized" disabled-by-default / draft-markers
  guidance.
- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I decomposition; its §10 defines this gate's charter and the evidence bar,
  and its §11 keeps 33N un-authorized until a gate like this one authorizes it.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)
  — Phase 33H acceptance gate; its not-implementation-ready verdict and §8 blocker
  inventory (A–N) bound any spike to dev/operator-only.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)
  — Phase 33G draft route-contract design; its §4 route identity (`POST
  /api/admission/intake`), §9–§11 public/private split + refusal taxonomy, and §12
  idempotency sketch are the draft contract a spike implements against.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md)
  — Phase 33F readiness gate; named the preconditions (Straylight review,
  idempotency, storage/auth/consent) this chain has been resolving in docs lanes.
- [`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](ADMISSION-WEDGE-PROBE-HARDENING-GATE.md)
  — Phase 33D hardening-decision gate + Phase 33E status note; the §6
  separately-gated-mutation invariant this gate honours (it mutates no probe/validator).
- [`docs/ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md`](ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md)
  — Phase 33B Dixie-first ownership decision and the five-scenario minimum set.
- [`docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md`](ADMISSION-WEDGE-CONTRACT-RESPONSE.md)
  — Phase 33A contract response, the six-clause core invariant, and the
  service-auth-≠-consent boundary this gate restates (§12).
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md)
  — the Phase 33E draft v1 probe set, canonical-vs-draft vocabulary table, and
  no-leak rules the spike's scenarios are anchored on. Gains a minimal 33M status note.
- [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the Phase 33E dependency-free, non-runtime validator (read-only; **not modified**).
- [`docs/integration/phase-32e-recall-wedge-route-contract.md`](integration/phase-32e-recall-wedge-route-contract.md)
  — the Recall Wedge route contract these gates are modelled on; `POST
  /api/recall/intake` is the live seam the Admission route must stay distinct from,
  and the no-leak / `storage_unavailable`-scrubbing precedent §14 references.
- `app/src/server.ts` (conditional mount, default-off — `:567-615`),
  `app/src/routes/recall-intake.ts` (route-seam / auth / signature / storage
  boundary), `app/src/config.ts` (env-gate + dev-seed gate fail-closed —
  `:283-345`), `app/src/services/straylight-recall-intake/refusal-mapping.ts`
  (two-part refusal namespace; the `storage_unavailable` public-scrub precedent),
  and the existing PostgreSQL pool/migrations (`app/src/db/`, **not** admission
  storage) — inspected **read-only** to ground the disabled-by-default env gate, the
  refusal vocabulary, and the storage reality. **None is modified.**
- `@loa/straylight` — canonical primitive/substrate owner of the assertion lifecycle,
  signer/keyring, receipt/audit, and storage-adapter vocabulary, read-only in
  `../loa-straylight`. **No completed Straylight Admission-Wedge primitive review was
  found** (33J §4); this gate treats A–O as unresolved and defers them spike-scoped
  only. The local checkout may be stale. **Not edited by this phase.**
- freeside-characters `docs/ADMISSION-WEDGE-DIXIE-V1-MIRROR-REFRESH-ACCEPTANCE-GATE.md`
  and `packages/persona-engine/src/recall-wedge/admission-wedge-dixie-probe-adapter.ts`
  (Phase 45J / PR #177, **verified merged on GitHub** 2026-06-06) — the cross-repo
  acceptance; its mirror/adapter proof is a pure, fixture-bound semantic mapping layer
  with **no live Dixie call**, test-only, not exported, not runtime-wired (§8, §18).
  **Not edited by this phase.**

---

## 21. Phase 33N implementation status note (added later)

> **Phase 33N — dev/operator-only Admission Wedge route spike implementation.**
> Implemented locally under the strict §7–§15 constraints of this gate. This note
> records what was built; it does **not** relax any block in §8 / §17 / §18.

- **What it is.** A single **dev/operator-only**, **disabled-by-default**,
  **NON-PRODUCTION** route spike at `POST /api/admission/intake` (the Phase 33G
  draft path — unchanged), distinct from the live `POST /api/recall/intake` seam.
- **Disabled by default / explicit env gate.** The route is **not registered at
  all** unless `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (conditional mount in
  `app/src/server.ts`, mirroring the recall route's default-off mount). All spike
  config defaults to off/empty (`app/src/config.ts`).
- **Dev/operator gate (NOT production auth).** A service token
  (`DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN`, checked constant-time against the
  dedicated `x-admission-service-token` header — deliberately **not**
  `Authorization`, to avoid colliding with the global `/api/*` allowlist gate
  that already consumes `Authorization` and is not exempt for `/api/admission`)
  and/or an operator-id allowlist (`DIXIE_ADMISSION_INTAKE_OPERATOR_IDS`, checked
  against the `x-admission-operator-id` header). **With both empty, the enabled
  spike rejects all calls** (fail-closed; no production default). The route also
  sits behind the global allowlist gate, so the dev/operator gate is layered on
  top of it (defense-in-depth). No token/operator-id is logged or echoed
  publicly; refusals never reveal which gate failed or whether a credential
  almost matched.
- **Storage Option A (no durable storage).** No durable Admission Wedge storage,
  **no database writes, no migrations**. The handler is a pure classifier +
  public-response builder that returns **safe future-intent receipts / public-safe
  outcomes only**. Rollback is trivial: there is no durable state to roll back.
- **Five frozen Phase 33L scenarios.** The classifier recognizes only the five
  `transition_intent` forms carried by the Phase 33L route-contract vectors
  (pending / accept / reject / supersede / malformed) behind a synthetic
  non-production marker, and **fails closed** for any unsupported shape. No sixth
  scenario.
- **No-leak boundary.** The public response is built purely from the classified
  scenario plus fixed synthetic placeholders (so it can carry no request-controlled
  material), and a runtime no-leak guard mirroring this gate's §14 / the Phase 33L
  validator denylist deep-walks every public body as defense-in-depth.
- **Partial-failure posture (§13.1).** Any internal partial failure fails closed to
  the stable `ingress.invalid_request` refusal — no recallable assertion, no
  duplicate, no partially-admitted residue (there is no durable state under Option
  A), and no leak.
- **Files (local edits only; not staged/committed/pushed; no PR).**
  `app/src/config.ts` (env gate + parsing), `app/src/server.ts` (conditional
  mount), `app/src/routes/admission-intake.ts` (route handler), and
  `app/src/services/admission-wedge-spike/` (`classifier.ts`, `public-response.ts`,
  `no-leak.ts`, `auth-gate.ts`, `index.ts`), plus tests under
  `app/tests/unit/admission-wedge-spike/` and
  `app/tests/integration/admission-intake/`. A runbook note is at
  `docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`.
- **What Phase 33N still does NOT do (unchanged from §8 / §17 / §18).** It does
  **not** authorize or implement production admission, production
  storage/auth/consent, Freeside runtime/client integration, Discord ingestion,
  user chat becoming memory, a public `remember-this`, package exports, or LLM /
  voice / Finn wiring; it does **not** freeze a final schema; it does **not**
  complete the Straylight primitive review (A–O remain unresolved; E, G, H, K, N, O
  and review-dependent J are carried forward as draft markers); it makes **no**
  final idempotency / signer / authority / production identity-binding claim; and
  it is **not** production-ready. The Phase 33E probe JSONs, the Phase 33L route
  vector JSONs, and both docs validators were **not** mutated.

---

## 22. Phase 33O acceptance status note (added later)

> **Phase 33O — Admission Wedge dev/operator-only route-spike acceptance gate.**
> Phase 33O
> ([`ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md))
> is a **docs/decision-only** acceptance gate. It assesses the Phase 33N
> implementation **read-only** against this gate's §7–§15 authorization and
> **ACCEPTS Phase 33N only as a bounded, disabled-by-default, dev/operator-only
> route spike for MVP 2 — the Admissible Layer / Admission Wedge.** It mutates
> **no** route handler, source, test, validator, probe, or fixture/vector JSON.

- **Accepted (bounded).** The Phase 33N spike stays within this gate's
  authorization on every axis checked: default-off mount, defense-in-depth
  disabled check, dev/operator gate behind the global allowlist, dedicated
  `x-admission-service-token` header, strict synthetic five-scenario shape,
  fail-closed otherwise, Storage Option A (no durable writes / no migrations),
  one guarded no-leak send path over every response, draft markers asserted
  false, carried-forward unresolved A–O markers, and the required tests/static
  guards.
- **Not accepted as more than a spike.** Phase 33O does **not** accept Phase 33N
  as production route readiness, a final schema, durable-storage readiness, or
  Freeside/client integration readiness. **Phase 33N does not complete MVP 2**
  (its missing proof is the full governed transition: candidate → an admitted
  assertion actually exists → assertion has status/provenance/receipt → recall
  can include it → pending/rejected/malformed cannot be recalled).
- **Blocks preserved.** Production admission, durable Admission Wedge storage,
  migrations, production auth/consent, public `remember-this`, Discord
  ingestion, user chat becoming memory, Freeside runtime/client integration,
  package exports, final schema freeze, a completed Straylight primitive review,
  final idempotency/signer/authority semantics, and production tenant/estate/
  actor identity binding all remain blocked.
- **Next lane.** Phase 33O selects **Phase 33P — Admission Wedge storage /
  receipt hardening decision gate (docs/decision-only)**, which must decide
  whether the next implementation lane remains Option A, introduces a dev-only
  bounded synthetic admitted-assertion store, or decomposes
  storage/receipt/idempotency/signer/authority into smaller gates — and **must
  not implement storage**.
