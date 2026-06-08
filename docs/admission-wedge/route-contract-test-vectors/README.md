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
  `POST /api/recall/intake` is the live seam the proposed (non-existent) admission
  route must stay distinct from.
- `app/src/routes/recall-intake.ts`,
  `app/src/services/straylight-recall-intake/refusal-mapping.ts`,
  `app/src/config.ts`, `app/src/server.ts` — inspected **read-only** to ground the
  route seam (there is **no** `/api/admission` route in Dixie today) and the
  stable refusal code `ingress.invalid_request` the fail-closed vector reuses.
  None is modified.
- `@loa/straylight` — canonical primitive/substrate owner of the assertion
  lifecycle. **No completed Straylight Admission-Wedge primitive review exists**
  (Phase 33J §4). Not edited.
- freeside-characters Phase 45J / PR #177 (**verified merged on GitHub
  2026-06-06**) — the cross-repo acceptance; its mirror/adapter proof stays
  test-only, not exported, not runtime-wired. Not edited.
