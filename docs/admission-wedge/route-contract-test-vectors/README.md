# Admission Wedge — Route-Contract Test-Vector Fixture Draft (Phase 33L)

> **Phase**: 33L — Admission Wedge route-contract test-vector fixture draft.
> **Status**: **docs / non-runtime fixture-only.** No live route, no route
> handler, no storage, no auth, no consent, no migrations, no runtime tests, no
> route spike. Follows Dixie Phase 33K / PR #129.
> **What this is**: it converts the five Phase 33G route-contract *design* vectors
> ([`ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](../../ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)
> §16) into **non-runtime route-contract test-vector fixture drafts**. It carries
> forward the Phase 33J unresolved primitive-review markers and the Phase 33K
> storage/auth/consent assumptions.
> **What this is not**: it does **not** change routes, storage, auth, probes,
> validator, runtime behavior, or production schema; it does **not** freeze a
> final schema; and it does **not** authorize a route spike.

These fixtures are **route-contract test-vector drafts**, one layer closer to a
possible future route contract than the Phase 33E probes — but still
**docs-bound, non-runtime, and synthetic**. They are deterministic, fully
synthetic, public-safe JSON files plus an isolated, dependency-free validator.

---

## 1. Phase title and status

- **Phase 33L — Admission Wedge route-contract test-vector fixture draft.**
- Dixie-side **docs / non-runtime fixture-only.**
- Follows **Dixie Phase 33K / PR #129** (storage/auth/consent precondition design
  gate), which selected this lane (its §18).
- Converts the **Phase 33G route-contract design vectors** (its §16, scenarios
  A–E) into non-runtime route-contract test-vector fixture drafts.
- Carries the **Phase 33J unresolved primitive-review markers** (genuinely
  unresolved rows **E, G, H, K, N, O**; review-dependent/non-final row **J**).
- Carries the **Phase 33K storage/auth/consent assumptions** (draft, non-implemented).
- Does **not** change routes, storage, auth, probes, the Phase 33E validator,
  runtime behavior, or production schema.
- Does **not** freeze a final/canonical/production schema.
- Does **not** authorize a route spike.

This work does **not** mutate the Phase 33E probe JSONs
(`hardening_phase: "33E"`, `dixie_admission_wedge_probe_v1`) or their validator,
and does **not** edit `../freeside-characters` or `../loa-straylight`.

---

## 2. Source chain

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33E | #122 | Probe hardening draft v1 / vocabulary refinement — five `dixie_admission_wedge_probe_v1` probe JSONs + dependency-free validator under [`../fixtures/`](../fixtures/README.md); preserves all five scenarios; freezes no schema. |
| 33G | #124 | Route-contract design — proposes (on paper) a route identity (`POST /api/admission/intake`), request/response envelopes with a public/private split, an idempotency sketch, an `admission.*` refusal taxonomy, storage/auth/consent preconditions, and the §16 route-contract test vectors these fixtures are drawn from. |
| 33H | #126 | Route-contract acceptance / implementation-readiness decision gate — accepts 33G as a bounded docs-only draft (two minor docs-only corrections); renders **NOT implementation-ready**; inventories blockers. |
| 33I | #127 | Implementation-readiness decomposition gate — decomposes the 33H blockers into ordered lanes (33J → 33K → 33L → 33M → 33N). |
| 33J | #128 | Straylight primitive review request / vocabulary dependency gate — issues the §5 fifteen-item review register (A–O); **did not complete the review**; flags genuinely unresolved rows **E, G, H, K, N, O** and review-dependent/non-final row **J**. |
| 33K | #129 | Storage/auth/consent precondition design gate — designs draft storage record categories, service-auth and consent model *options*, a dev/operator-only scope option, an idempotency precondition, a no-leak posture, and a threat model; selects **this Phase 33L**. |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter track `dixie_admission_wedge_probe_v1`, **test-only**; v0 fails closed as `unknown_probe_version`. |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded test-only purpose; **verified MERGED on GitHub (2026-06-06)**. Authorizes no live client, no package export, no runtime wiring. |

> **Cross-repo phase-numbering caution.** Dixie's 33-series and the
> freeside-characters 45-series are independent labels in separate repositories
> and must not be conflated.

---

## 3. Fixture purpose

State plainly:

- These are **route-contract test-vector drafts**, not executable route tests.
- They **do not prove a route exists.**
- They **do not authorize route implementation.**
- They **do not authorize storage writes.**
- They **do not authorize auth/consent implementation.**
- They **do not define production schema.**
- They are intended to become **input evidence for a later Phase 33M route-spike
  authorization gate** *if* other blockers are resolved or explicitly deferred.
  Phase 33M remains a future authorization gate; **Phase 33N remains not
  authorized.**

---

## 4. Fixture set

Exactly **five** route-contract test-vector fixtures, matching the five semantic
scenarios already used by the Phase 33E probes. **No sixth scenario** (the
validator enforces this).

| File | `scenario_id` | 33G vector |
|------|---------------|:--:|
| [`candidate-pending-not-recallable.json`](candidate-pending-not-recallable.json) | `candidate_pending_not_recallable` | A |
| [`accept-candidate-to-admitted-assertion.json`](accept-candidate-to-admitted-assertion.json) | `accept_candidate_to_admitted_assertion` | B |
| [`reject-candidate-no-assertion.json`](reject-candidate-no-assertion.json) | `reject_candidate_no_assertion` | C |
| [`supersede-with-corrected-assertion.json`](supersede-with-corrected-assertion.json) | `supersede_with_corrected_assertion` | D |
| [`malformed-or-unsafe-payload-fail-closed.json`](malformed-or-unsafe-payload-fail-closed.json) | `malformed_or_unsafe_payload_fail_closed` | E |

---

## 5. Relationship to Phase 33E probes

- The **Phase 33E probes remain the draft v1 semantic probes** (they are not
  superseded by this phase).
- The **Phase 33L route vectors do not replace or mutate the Phase 33E probes** —
  the probe JSONs and their validator under [`../fixtures/`](../fixtures/README.md)
  are untouched.
- The **Phase 33L vectors sit one layer closer to a possible future route
  contract** than the probes: the probes model the substrate semantics; the
  vectors model the route request/public-response/private-effect contract shape.
- The **vector count and scenario identity stay aligned with the five Phase 33E
  probe scenarios.** Each vector references its source probe via
  `source_probe_version: dixie_admission_wedge_probe_v1` /
  `source_probe_phase: 33E`.
- **Any future change to probe count or semantics must be separately gated** (the
  Phase 33D §6 separately-gated-mutation invariant). This phase neither changes
  nor depends on changing probe count or semantics.

---

## 6. Relationship to Phase 33G route-contract design

- Each vector **maps to a Phase 33G route-contract design vector** (its §16, A–E)
  via `maps_to_route_contract_design_vector` and
  `source_route_contract_phase: 33G`.
- Each vector includes: a **request condition** (`request_vector`), an **expected
  public response class** (`expected_public_response.outcome_class`), an
  **expected private/audit effect** (`expected_private_or_audit_effect`), a
  **recall eligibility result** (`expected_recall_projection`), an **idempotency
  expectation** (`idempotency_expectation`), **no-leak assertions**
  (`no_leak_assertions` + `expected_public_response.must_not_include`), and
  **unresolved dependency markers** (`unresolved_review_markers`).
- The Phase 33G design is a **draft design, not final** (33H accepted it as a
  bounded docs-only draft and rendered it not implementation-ready). These
  vectors do **not** make it final.

---

## 7. Relationship to Phase 33J primitive review

- The **Straylight primitive review is not complete.** No completed Straylight
  Admission-Wedge primitive-review artifact exists (Phase 33J §4). Every Phase
  33E probe still carries `straylight_primitive_review_complete: false`, and
  every Phase 33L vector mirrors that with the same flag set to `false`.
- **Genuinely unresolved matrix rows: E, G, H, K, N, O.** (Recall-eligibility
  representation; tenant/estate/actor binding; receipt/audit relationship;
  public/private projection boundary; corrected-active status-vs-relation;
  storage/audit primitive boundary.)
- **Review-dependent / non-final item: J** (idempotency semantics).
- Every vector carries these in `unresolved_review_markers.genuinely_unresolved_rows`
  (`["E","G","H","K","N","O"]`) and
  `unresolved_review_markers.review_dependent_non_final_rows` (`["J"]`), and must
  **not** treat them as resolved.
- **No vector claims** final vocabulary, final idempotency, final signer/authority
  semantics, or final production identity binding.

---

## 8. Relationship to Phase 33K storage/auth/consent design

- Vectors carry **draft storage/auth/consent assumptions** in
  `storage_auth_consent_assumptions` and `request_vector.*_assumption`.
- **No vector writes storage** (`storage_writes_performed: false`,
  `request_vector.storage_assumption: draft_no_write_performed`).
- **No vector implements auth** (`auth_implemented: false`,
  `request_vector.auth_assumption: draft_non_implemented`).
- **No vector implements consent** (`consent_implemented: false`,
  `request_vector.consent_assumption: draft_non_implemented_or_dev_only_marker`).
- **No vector assumes production storage/auth/consent readiness.**
- A **dev/operator-only omission or synthetic auth** may appear only as a *draft
  vector assumption*, never as authorization
  (`storage_auth_consent_assumptions.dev_operator_scope: not_authorized_by_phase_33l`).

---

## 9. No-leak policy

Each vector's **public response** surface
(`request_vector` + `expected_public_response` + `expected_recall_projection`)
must not include:

- raw candidate payload;
- source material;
- raw reasons;
- private/audit fields;
- operational tenant/estate/actor IDs;
- idempotency keys;
- authority/signature material;
- tokens, secrets, or URLs;
- stack traces / debug internals;
- storage internals;
- long operational IDs.

Each vector additionally declares the denylist explicitly in
`expected_public_response.must_not_include` and asserts the negatives in
`no_leak_assertions`. **Private/audit expected effects** may reference
*private/audit placeholders* (e.g. `audit_event_class`, `effect_class`), but
those remain **synthetic and safe** — never concrete operational IDs, payloads,
or secrets. These vectors deliberately carry **no** private `input`/`audit`
section at all (unlike the Phase 33E probes); every field is public-safe by
construction.

---

## 10. Validator

[`validate-route-contract-test-vectors.mjs`](validate-route-contract-test-vectors.mjs)
is an isolated, **Node-built-ins-only** validator (`node:fs`, `node:path`,
`node:url`). It imports **nothing** from `app/`, from `@loa/straylight`, or from
the sibling Phase 33E probe validator; it touches no database, network, storage,
or environment.

```bash
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
```

It validates that:

- **exactly five** vectors exist and parse, the five `scenario_id`s match their
  slots, and **no sixth vector** JSON file is present in the directory;
- shared **metadata / non-final flags** are correct (`vector_kind`,
  `vector_version`, `phase=33L`, `source_probe_version`, `source_probe_phase=33E`,
  and `schema_final` / `route_contract_final` / `runtime_enabled` /
  `route_implemented` / `route_spike_authorized` / `storage_writes_performed` /
  `auth_implemented` / `consent_implemented` / `production_admission` /
  `straylight_primitive_review_complete` all **false**; `public_safe` **true**);
- the **unresolved-review markers** are carried forward exactly
  (`genuinely_unresolved_rows == [E,G,H,K,N,O]`,
  `review_dependent_non_final_rows == [J]`);
- the **public-response no-leak denylist** is present and non-empty, and
  `rendered_candidate_payload` is false;
- **route implementation is false** (`route_implemented`,
  `request_vector.route_exists`, `request_vector.route_authorized`);
- **storage writes are expected effects only, not performed**
  (`storage_writes_performed: false`,
  `request_vector.storage_assumption: draft_no_write_performed`);
- **auth/consent assumptions are draft / non-implemented**;
- **production flags are false**;
- the public surface deep-walk finds **no leak-shaped material** (forbidden
  substrings / regex patterns / private keys), excluding the denylist arrays that
  legitimately name forbidden categories;
- **all IDs are short synthetic placeholders** (no long opaque/operational-id
  runs anywhere in the document).

It prints a deterministic PASS/FAIL summary and exits non-zero on any failure.
The Phase 33E probe validator
([`../fixtures/validate-fixtures.mjs`](../fixtures/validate-fixtures.mjs)) is a
**separate** validator and is not modified or imported by this one.

---

## 11. What Phase 33L still does NOT authorize

Phase 33L drafts route-contract test-vector fixtures; it changes nothing about
what remains blocked. It does **not** authorize or imply: a route / API handler,
a live admission route, a **route spike**, storage writes, migrations, auth
implementation, consent implementation, live calls, production admission,
production storage/auth/consent, a public `remember-this`, a Discord command /
history ingestion, user chat becoming memory, Freeside Characters runtime
changes, package exports, LLM/voice, Finn production wiring, a
forget/revoke/correction UI, a final schema freeze, a final route contract,
final idempotency semantics, production signer/authority semantics, production
tenant/estate/actor identity binding, route implementation readiness, **Phase
33M authorization**, or **Phase 33N**. The Phase 33E probes are **not** a
production schema; the Phase 33G route contract is **not** final; Phase 33H did
**not** make the route implementation-ready; Phase 33I did **not** authorize a
route spike; Phase 33J did **not** complete the Straylight primitive review; and
Phase 33K did **not** implement storage/auth/consent.

> **Phase 33M status note (added later).** Phase 33M
> ([`../../ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](../../ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md))
> is a **docs/decision-only** route-spike authorization gate. It reads these route
> vectors and their validator **read-only** — it mutates **no** vector JSON and does
> **not** change the validator. It evaluates the Phase 33J/33K/33L evidence and
> **authorizes only a future Phase 33N dev/operator-only, disabled-by-default route
> spike under strict constraints** (with the unresolved Straylight review (A–O)
> explicitly deferred for the synthetic spike only, never for production), requiring
> the spike to inherit this validator's no-leak denylist as its runtime baseline. It
> **does not** implement a route, storage, auth, consent, or runtime tests, **does
> not** authorize production / public rollout / Freeside runtime integration, and
> **does not** freeze a schema. **Phase 33N remains not implemented.**

> **Phase 33N status note (added later).** Phase 33N implemented the
> dev/operator-only, **disabled-by-default**, **NON-PRODUCTION** route spike that
> Phase 33M authorized (see
> [`../../ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](../../ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)
> §21 and [`../PHASE-33N-DEV-SPIKE-RUNBOOK.md`](../PHASE-33N-DEV-SPIKE-RUNBOOK.md)).
> It uses **these five route vectors as the fixture contract evidence**: the
> spike's classifier reads each vector's `request_vector.transition_intent` and is
> tested against each vector's `expected_public_response` /
> `expected_recall_projection`. It reads these vectors **read-only as test
> fixtures** — it **mutates no vector JSON** and does **not** change this
> validator (which stays Node-built-ins-only, not imported into runtime). It uses
> **Storage Option A** (no durable storage / no DB writes / no migrations), adds
> **no** package export, performs **no** Freeside or `@loa/straylight` import, and
> claims **no** final schema, completed Straylight primitive review, final
> idempotency, or production admission/auth/consent. The unresolved rows
> (E, G, H, K, N, O) and review-dependent row (J) are carried forward as draft
> markers.
>
> **Phase 33N current-state corrections (vs. the Phase 33L-era statements
> above).** Some statements earlier in this document describe the Phase 33L
> world and are no longer literally current; they are preserved as accurate
> *Phase 33L-time* history. For the avoidance of doubt, as of Phase 33N:
> (1) Dixie now has a disabled-by-default, dev/operator-only admission route
> spike (`POST /api/admission/intake`) — it did **not** exist at Phase 33L, is
> **not** enabled by default, and is **not** production-ready; (2) `app/src/config.ts`
> and `app/src/server.ts` are now **modified by Phase 33N** for the gated
> dev-spike wiring (they were unmodified at Phase 33L); (3) Phase 33N still does
> **not** authorize production admission / storage / auth / consent; (4) Phase
> 33N still does **not** mutate the Phase 33L vector JSONs or the Phase 33L
> validator; and (5) these route-contract vectors remain **non-final / draft
> evidence** — Phase 33N consumes them read-only as test fixtures and freezes no
> schema. Phase 33L itself implemented **no** route; the route spike is solely
> Phase 33N's, authorized narrowly by Phase 33M.

> **Phase 33O status note (added later).** Phase 33O
> ([`../../ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](../../ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md))
> is a **docs/decision-only** acceptance gate. It reads these vectors and their
> validator **read-only** — it mutates **no** vector JSON and does **not** change
> the validator. It **accepts the Phase 33N spike only as a bounded,
> disabled-by-default, dev/operator-only route spike for MVP 2** (the Admissible
> Layer / Admission Wedge), confirming the spike's classifier and runtime no-leak
> guard are built against these five vectors and this validator's denylist. It
> does **not** accept Phase 33N as production route readiness, a final schema,
> durable-storage readiness, or Freeside/client integration readiness; **Phase
> 33N does not complete MVP 2**; and it preserves every production / public /
> Freeside / Discord / chat-to-memory block. Phase 33O selects **Phase 33P —
> Admission Wedge storage / receipt hardening decision gate (docs/decision-only)**
> as the next lane. These route-contract vectors remain **non-final / draft
> evidence**; Phase 33O freezes no schema and mutates nothing here.

> **Phase 33P status note (added later).** Phase 33P
> ([`../../ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](../../ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md))
> is a **docs/decision-only** storage / receipt hardening decision gate. It reads
> these vectors and their validator **read-only** — it mutates **no** vector JSON
> and does **not** change the validator. It decides the storage/receipt posture
> after the Phase 33N no-store route spike: it **selects Option B** — authorizing a
> *possible future* Phase 33Q dev-only, disabled-by-default, non-production,
> **bounded synthetic** admitted-assertion store — and **explicitly rejects
> production-like durable storage**. It names these five vectors' no-leak denylist
> (and this validator's `FORBIDDEN_PUBLIC_KEYS` / substring / regex / UUID /
> opaque-run rules) as the boundary a future Phase 33Q's store-backed
> status/provenance/receipt projections must still satisfy. Phase 33P itself
> **implements no store, performs no storage write, adds no migration, and changes
> no route handler**; it freezes **no** schema, keeps the Straylight primitive
> review (A–O) **unresolved**, and preserves every production / public / Freeside /
> Discord / chat-to-memory block. These route-contract vectors remain **non-final /
> draft evidence**; Phase 33P mutates nothing here. **Phase 33Q remains not
> implemented**, authorized only if the 33P doc lands cleanly within its boundary.

> **Phase 33Q + Phase 33R status note (added later).** Phase 33Q (PR #135)
> implemented the Phase 33P Option B lane: a **bounded, process-local,
> non-durable, fail-closed, synthetic-only** admitted-assertion ledger, exposed
> **only** as a route dependency-injection / **test-seam** (no server wiring, no
> env flag, no package export), proving the candidate → admitted-assertion →
> recall transition's *stateful effect* over synthetic state behind the existing
> default-off gate (see
> [`../PHASE-33Q-DEV-STORE-RUNBOOK.md`](../PHASE-33Q-DEV-STORE-RUNBOOK.md)). It
> reads **these five vectors read-only as the fixture contract** and keeps the
> public response byte-identical to the Phase 33N no-store path; the ledger's
> public projection and error messages still satisfy this validator's no-leak
> denylist (`FORBIDDEN_PUBLIC_KEYS` / substring / regex / UUID / opaque-run
> rules) via the runtime `findAdmissionPublicLeaks` guard. It **mutates no vector
> JSON** and does **not** change this validator. Phase 33R
> ([`../../ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](../../ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md))
> is the **docs/decision-only** acceptance / hardening gate that **accepts Phase
> 33Q only as a bounded, non-production, test-seam-only synthetic ledger proof**
> for MVP 2 — **not** as production admission, durable storage, a final schema, or
> production route readiness — preserves every blocked lane, keeps the Straylight
> primitive review (A–O) **unresolved**, and selects **Phase 33S** (a
> docs/decision-only decomposition gate, **not** production rollout) as the next
> lane. These route-contract vectors remain **non-final / draft evidence**;
> Phases 33Q and 33R freeze no schema and mutate nothing here.

---

## 12. Provenance / cross-references

- [`../../ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](../../ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K gate that selected this lane (its §16/§18/§19) and supplies the
  storage/auth/consent assumptions these vectors carry.
- [`../../ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](../../ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)
  — Phase 33J review register (A–O) and the genuinely-unresolved rows
  (E, G, H, K, N, O) + review-dependent row (J) these vectors carry as markers
  (its §5/§6/§11).
- [`../../ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](../../ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)
  — Phase 33G design; its §16 route-contract test vectors (A–E) are the source of
  these fixtures.
- [`../../ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](../../ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)
  — Phase 33H acceptance gate (not implementation-ready verdict).
- [`../../ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](../../ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I lane decomposition (33J → 33K → 33L → 33M → 33N).
- [`../fixtures/README.md`](../fixtures/README.md) /
  [`../fixtures/validate-fixtures.mjs`](../fixtures/validate-fixtures.mjs)
  — the Phase 33E draft v1 probes and their validator (read-only here; not
  mutated). These vectors stay aligned to those five scenarios.
- [`../../integration/phase-32e-recall-wedge-route-contract.md`](../../integration/phase-32e-recall-wedge-route-contract.md)
  — the Recall Wedge route contract these gates are modelled on structurally;
  `POST /api/recall/intake` is the live seam from which the admission route
  (which, **at Phase 33L time**, did not yet exist) must stay distinct. (Phase
  33N has since added a disabled-by-default dev/operator-only admission route
  spike — see the §11 Phase 33N status note below.)
- `app/src/routes/recall-intake.ts`,
  `app/src/services/straylight-recall-intake/refusal-mapping.ts`,
  `app/src/config.ts`, `app/src/server.ts` — inspected **read-only** at Phase 33L
  time to ground the route seam (**at Phase 33L there was no `/api/admission`
  route in Dixie**, and `config.ts` / `server.ts` were unmodified by Phase 33L)
  and the stable refusal code `ingress.invalid_request` the fail-closed vector
  reuses. **Phase 33L modified none of these.** (Phase 33N has since modified
  `config.ts` and `server.ts` to wire the gated dev-spike — see the §11 Phase
  33N status note below; the recall-intake and refusal-mapping files remain
  unmodified.)
- `@loa/straylight` — canonical primitive/substrate owner of the assertion
  lifecycle. **No completed Straylight Admission-Wedge primitive review exists**
  (Phase 33J §4). Not edited.
- freeside-characters Phase 45J / PR #177 (**verified merged on GitHub
  2026-06-06**) — the cross-repo acceptance; its mirror/adapter proof stays
  test-only, not exported, not runtime-wired. Not edited.
