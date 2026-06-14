# Phase 33Z — Admission Wedge Route-Vector Alignment Gate

> **Phase**: 33Z
> **Branch context**: `phase-33z-admission-route-vector-alignment-gate`
> **Related**: Dixie Phase 33A–33Y (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle, recall-eligibility,
> `RecallDisposition`, `TransitionReceipt` / `AuditEvent`, `TenantResolver`, and
> ADR-022E / ADR-026C / ADR-026D decision records.
> **Status**: **docs + route-contract test-vector / validator alignment lane —
> bounded, non-runtime.** This is **not** route/API handler implementation, **not**
> storage/auth/consent implementation, **not** production readiness, **not** a final
> route-contract freeze, **not** a final schema freeze, **not** package-export work,
> and **not** Freeside runtime/client integration.

---

## 1. Status and scope

Phase 33Z is the bounded **route-vector alignment lane** that Phase 33Y
([`ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-ACCEPTANCE-GATE.md)
§10, PR #143) selected and authorized after deciding **vector-readiness = ready**
(its §8) against the accepted Phase 33X draft route-contract baseline.

Phase 33Z:

- is **Dixie-side docs + route-contract test-vector / validator alignment**;
- is **non-runtime** — it mutates only docs-bound test-vector/validator/README
  artifacts under `docs/admission-wedge/route-contract-test-vectors/` plus this
  decision/status doc;
- **aligns the five Phase 33L route-contract test vectors and their validator to the
  accepted Phase 33X / 33Y draft route-contract baseline** (and the source-real Phase
  33N spike public-response shape);
- does **not** finalize or freeze the route contract;
- does **not** make production admission ready;
- does **not** implement a route, storage, auth, consent, migrations, package exports,
  package/schema exports, or Freeside integration;
- does **not** mutate runtime code;
- does **not** freeze a final/canonical/production schema.

> **`public_receipt_ref` is a draft, non-final field.** Reflecting it on the test
> surface aligns the vectors to the accepted draft baseline; it does **not** freeze the
> public schema, finalize the route contract, or authorize any runtime serializer.

> **Vector/validator alignment does not authorize runtime implementation.** Phase 33Z
> is a test-artifact lane only (Phase 33I §5 blocker N; Phase 33Y §10). The Phase 33N
> dev/operator-only, disabled-by-default spike remains the **only** authorized route
> surface; every production / durable-storage / auth / consent / Freeside gate stays
> held (§10).

Unlike the earlier read-only follow-on gates (33M, 33O, 33P, 33R, 33S–33Y), **Phase
33Z does mutate the five route-vector JSONs and their validator** — that is the lane's
authorized purpose. It does **not** touch the Phase 33E fixtures or their validator
(§8), and it does **not** touch any runtime source (§10).

---

## 2. Source-chain context

### Dixie (loa-dixie) — the lanes that produced this alignment

| Phase | PR | Artifact / contribution (relevant to vector alignment) |
|-------|----|----|
| 33G | #124 | Route-contract **design**; its §16 vectors A–E are the source of the Phase 33L vectors; original `admission.*` taxonomy (incl. a public `admission.duplicate_replay` code) and the dual receipt-spelling debt. |
| 33H | #126 | Route-contract acceptance; **not implementation-ready**; two-part `category.specific_reason` namespace correction. |
| 33I | #127 | Implementation-readiness decomposition (33J → 33K → 33L → 33M → 33N). |
| 33L | #130 | **Route-contract test-vector fixture draft** — the five vectors this lane aligns: `candidate-pending-not-recallable`, `accept-candidate-to-admitted-assertion`, `reject-candidate-no-assertion`, `supersede-with-corrected-assertion`, `malformed-or-unsafe-payload-fail-closed`, plus the dependency-free validator. Vectors carried `public_receipt_ref_policy`. |
| 33N | — | Dev/operator-only, **disabled-by-default**, **NON-PRODUCTION** route spike (`POST /api/admission/intake`). Source-real public-response field `public_receipt_ref: string \| null` (`public-response.ts:44,:104`) and source-real refusal codes (`classifier.ts:64,:68`). The vectors are aligned **to** this shape. |
| 33U | #139 | Straylight PR #65 (A–O) response **intake / reconciliation** — PR #65 (merged) **answered** A–O and 33U **reconciled** each row (accepted / rejected / delegated, with the independent production gates held); adopts `public_receipt_ref` (Dixie naming) and the `AuditEvent` + `TransitionReceipt` unconflation. The vectors' `E,G,H,K,N,O` / `J` arrays are **preserved legacy vector/runtime markers** (carried from `classifier.ts:73-74`), **not** the current review-resolution summary; `straylight_primitive_review_complete` stays `false` because the independent production gates remain held — not because the review response is outstanding. |
| 33V | #140 | Storage/auth/consent design finalization; **adopts `public_receipt_ref`, retires `receipt_public_ref`**; private/public projection boundary (`privacy_scope` + frame disposition, denylist as defense-in-depth). |
| 33W | #141 | Route-contract readiness-update gate; "more ready than 33H but NOT final/frozen"; defined the §6 draft-update checklist 33X executed. |
| 33X | #142 | **Route-contract revision draft.** §7.1 standardizes the public envelope on `public_receipt_ref` (`null` where none minted); §8 taxonomy: class-validation rejection uses `ingress.invalid_request`, unsupported transition uses `admission.unsupported_transition` (draft), policy denial uses `admission.transition_denied` (draft), and **no public `admission.duplicate_replay`** (identical replay returns the prior public envelope; private telemetry only); §12 defers the vector/validator alignment to "a separate, later vector-mutation lane." |
| 33Y | #143 | **Route-contract revision-acceptance / vector-readiness gate.** Accepts 33X as a **draft baseline**, decides vector-readiness = ready, defines the §9 later-lane checklist, and **selects Phase 33Z** (§10). Mutated no vector/validator itself. |
| **33Z** | *(this doc)* | **Route-vector alignment** — executes the 33Y §9 checklist against the five vectors + validator + README; selects the next lane (§9). |

### Upstream context preserved

- **Straylight PR #65** (A–O primitive-review verdicts) — **merged**, and **answered
  and reconciled** by Dixie 33U (each A–O row dispositioned accepted / rejected /
  delegated; see 33U §4). The vectors carry the rows `E,G,H,K,N,O` and `J` as
  **preserved legacy vector/runtime markers** (carried from `classifier.ts:73-74`),
  unchanged by 33Z — they are **not** the current primitive-review resolution summary,
  and they are **not** evidence the review response is still outstanding. PR #65
  clarified the *vocabulary/design*; the independent production gates it does **not**
  clear stay held (durable storage / ADR-022E gate #8, production auth/consent, final
  idempotency, production signer/authority, production tenant/estate/actor identity
  binding, final route contract, production deployment/readiness, final schema freeze).
  `straylight_primitive_review_complete` therefore stays `false`. PR #65 authorized
  **no** Dixie runtime implementation, production storage/auth/consent, or Freeside
  integration.
- **Dixie 33U / 33V / 33W** — the chain that resolved the public field-naming
  (`public_receipt_ref`), the refusal-taxonomy split, the receipt/audit unconflation,
  and the recall/supersession framings the 33X draft baseline records.

### Freeside Characters (freeside-characters)

| Phase | PR | Contribution |
|-------|----|----|
| 45J | #177 | v1 mirror-refresh acceptance (**verified MERGED on GitHub 2026-06-06**); test-only mirror/adapter, no live client, no export, no runtime wiring. Untouched and unaffected by 33Z. |

> **Cross-repo phase-numbering caution.** Dixie's 33-series and the freeside-characters
> 45-series are independent labels in separate repositories and must not be conflated.

---

## 3. Grounded starting facts (pre-33Z, after inspection)

These are the grounded facts established by read-only inspection of the five vectors,
the validator, the 33X/33Y gates, and the Phase 33N/33Q runtime source **before**
Phase 33Z made any change:

1. **Phase 33L vectors used `public_receipt_ref_policy`** — once per vector inside
   `expected_public_response`, with values `public_safe_receipt_reference_draft`
   (accept / reject / supersede) and `none_minted_draft` (pending / malformed). This
   token is a **vector-level policy abstraction** that exists in **no** source artifact.
2. **Phase 33L vectors contained no `receipt_public_ref`** (grep-confirmed absent
   across the vector JSONs, README, and validator).
3. **Phase 33L vectors contained no `duplicate_replay` token** and no public
   `admission.duplicate_replay` expected code (grep-confirmed absent).
4. **`ingress.invalid_request` is existing Dixie-local source** — not draft. It is the
   refusal-family code reused by the draft taxonomy
   (`app/src/services/straylight-recall-intake/refusal-mapping.ts:12`, re-exported as
   the admission spike shape-refusal code at
   `app/src/services/admission-wedge-spike/classifier.ts:64`).
5. **`admission.unsupported_transition` is draft / absent from source** — it appears
   only in the 33X/33Y design prose; the runtime spike folds unsupported/malformed
   shapes into the single fail-closed `refused` outcome, never emitting this code.
6. **Dotted `admission.transition_denied` is draft / absent from source** — it appears
   only in 33G/33X/33V/33Y prose (bound to the canonical `transition_denied` audit
   event); the runtime spike does not emit any dotted variant.
7. **Underscored `admission_transition_denied_draft_non_final` is a distinct
   source string** — it is the **source-real** draft denial marker
   (`classifier.ts:68`, emitted at `public-response.ts:105`); it is **not** the dotted
   public taxonomy code and must not be conflated with it.
8. **The source-real public field is `public_receipt_ref: string \| null`**
   (`public-response.ts:44`), set to the synthetic `SYNTHETIC_PUBLIC_RECEIPT_REF`
   placeholder when the classifier's `mints_public_receipt_ref` is `true` (accept /
   reject / supersede) and `null` otherwise (pending / malformed)
   (`public-response.ts:104`; `classifier.ts:118-156`). There is **no**
   `public_receipt_ref_policy` and **no** `receipt_public_ref` in the runtime.
9. **The carried-forward markers still match the runtime and are still correct to
   preserve** — `classifier.ts:73-74` carries `['E','G','H','K','N','O']` and `['J']`,
   matching the vectors. These are **preserved legacy vector/runtime markers**, **not**
   a claim that the Straylight primitive-review response is outstanding: Straylight PR
   #65 (merged) **answered** A–O and 33U **reconciled** it (33U §4). 33U/33X/33Y
   deliberately did **not** flip `straylight_primitive_review_complete` — it stays
   `false` because the **independent production gates** remain held (durable storage /
   ADR-022E gate #8, production auth/consent, final idempotency, production
   signer/authority, production tenant/estate/actor binding, final route contract,
   production deployment, final schema freeze), not because the review answer is
   missing (33U §1, §7).
10. **Phase 33E fixtures carry both `public_receipt_ref` and `receipt_public_ref`** —
    the two-spelling reconciliation debt (fixtures README `:143-144,313`), with the
    fixtures validator strict-per-section cross-check requiring
    `receipt_split.public_receipt_ref == public_response.receipt_public_ref`. This is
    **separate, documented debt** and is **out of scope** for Phase 33Z (§8).

---

## 4. Alignment decisions

Each row records the area, the pre-33Z (33L) state, the accepted Phase 33X / 33Y draft
baseline, the Phase 33Z alignment decision, the file(s) changed, and the caveat.

| Vector area | Current 33L state | 33X / 33Y accepted baseline | Phase 33Z alignment decision | Files changed | Caveat |
|-------------|-------------------|------------------------------|------------------------------|---------------|--------|
| **Public receipt field / policy** | `public_receipt_ref_policy` (`public_safe_receipt_reference_draft` / `none_minted_draft`) | Standardize public envelope on `public_receipt_ref`, `null` where none minted (33X §7.1; 33Y §5/§9). Source-real at `public-response.ts:44`. | **REPLACE** `public_receipt_ref_policy` with `public_receipt_ref`: draft placeholder string for accept/reject/supersede, `null` for pending/malformed. Smallest safe mapping, no supplementation. | 5 vector JSONs; validator; README; this doc | `public_receipt_ref` is **draft / non-final**; no schema freeze. |
| **Duplicate replay** | No token; no public code | **No** public `admission.duplicate_replay`; identical replay returns the prior public envelope; duplicate-replay is private telemetry only (33X §8; 33Y §5/§9). | **NO CHANGE** to vectors (already correct). **Validator strengthened** to assert the `duplicate_replay` token appears nowhere. | validator; README; this doc | Replay semantics stay in each vector's prose `idempotency_expectation`; no public code. |
| **Class-validation rejection** | malformed vector: `safe_reason_code: "ingress.invalid_request"` | Class-validation rejection uses `ingress.invalid_request` — **not** `admission.unsupported_transition`, **not** `admission.transition_denied`; no transition, no denied `TransitionReceipt`, no `transition_denied` event (33Y §5/§9). | **NO CHANGE** (already correct). **Validator strengthened** to require exactly `ingress.invalid_request` for the malformed scenario. | validator; README; this doc | `ingress.invalid_request` is **source-real** (`classifier.ts:64`). |
| **Unsupported transition** | Not represented as a scenario or code | Unsupported transition uses `admission.unsupported_transition` (draft) *if represented* (33Y §9). | **NOT represented** — no fifth-and-a-half code, no sixth scenario. Source folds unsupported shapes into `refused`/fail-closed. Validator **rejects** the dotted draft code on the public surface. | validator; README; this doc | Draft, source-absent; not added. A sixth scenario would need separate justification. |
| **Policy denial** | reject vector: `safe_reason_code: "admission_transition_denied_draft_non_final"` (underscored); `audit_event_class: "transition_denied_draft"` | Policy denial uses `admission.transition_denied` (dotted draft) with a denied `TransitionReceipt` / `transition_denied` audit event *if represented* (33Y §5/§9). | **KEEP the underscored `admission_transition_denied_draft_non_final`** (source-real, `classifier.ts:68`). **No blind dotted-code rename** — the dotted code is draft-only / source-absent. Private `transition_denied_draft` audit class stays on the private/audit effect, off the public surface. | validator; README; this doc | The dotted public code is reconciled at a later route-contract finalization lane, not here. |
| **Private `TransitionReceipt` / `AuditEvent` boundary** | `must_not_include` denylist + `no_leak_assertions` + `expected_private_or_audit_effect` (audit/receipt intent off the public surface) | Private `TransitionReceipt` / `AuditEvent` data stays off the public response; unconflated primitives; only `public_receipt_ref` may be public (33X §7.2; 33V §4/§7; 33Y §5/§9). | **NO CHANGE** to the boundary encoding (already correct). Validator continues to exclude `expected_private_or_audit_effect` from the public-surface walk and forbids `receipt_public_ref` and operational/receipt keys on the public surface. | validator (added `receipt_public_ref` to forbidden keys); README; this doc | `public_receipt_ref` carries only a short synthetic placeholder, never an operational `receipt_id`. |
| **Recall projection** | per-scenario `expected_recall_projection` (pending/reject/malformed empty; accept includes active; supersede includes corrected, excludes superseded prior) | `RecallDisposition` per-request; public `recall_eligible` is a derived Dixie projection; no universal `active ⇒ recallable` (33X §9; 33Y §6). | **NO CHANGE** (the vectors' projections remain consistent with the accepted framing; the markers keep `E` unresolved). | — | Recall authority is recomputed per request; vectors model the draft projection only. |
| **Supersession / correction** | supersede vector: `outcome_class: "superseded_with_correction"`, no coined `corrected_active` status; corrected-active included, superseded-prior excluded | `supersedes_refs` + `link_assertions`/`assertion_linked`; `assertion_superseded` dropped as canonical; no coined `corrected_active` (33X §10; 33Y §6). | **NO CHANGE** (already consistent; rows `D/N` stay unresolved markers). | — | Final supersession vocabulary is later-gated. |
| **Draft / non-final status flags** | full all-`false` flag block; `public_safe: true`; `straylight_primitive_review_complete: false` | Nothing final/frozen; draft markers stay `false` (33Y §11). | **NO CHANGE** — all draft/non-final flags preserved. | — | No marker flipped; 33Z freezes nothing. |
| **Scenario count** | exactly five scenarios; no-sixth-vector check | Preserve five unless a sixth is separately justified (33Y §9). | **PRESERVE five** — no sixth justified or added; no-sixth-vector check retained. | validator (optional scenario-id guard); README; this doc | A duplicate_replay or unsupported_transition sixth scenario is explicitly **not** justified. |
| **Validator enforcement** | shape / no-leak / marker / synthetic-id checks; receipt represented only as the free-form policy token; `safe_reason_code` checked loosely | The §9 checklist (public_receipt_ref, no public duplicate_replay, per-scenario taxonomy, private boundary, no runtime/storage/auth fields, Node-built-ins-only). | **STRENGTHEN** the validator to enforce the aligned contract (see §6). | validator | Stays dependency-light, Node-built-ins-only, no `app/` or `@loa/straylight` import. |

---

## 5. Route-vector update requirements (applied)

Only bounded route-vector changes needed to align with the accepted 33X / 33Y baseline
were applied. **The single field-level change per vector is the public-receipt
representation**; everything else was already aligned and is preserved.

**Applied changes (one per vector):**

| Vector (scenario) | Change applied |
|-------------------|----------------|
| `candidate-pending-not-recallable` (A) | `public_receipt_ref_policy: "none_minted_draft"` → `public_receipt_ref: null` |
| `accept-candidate-to-admitted-assertion` (B) | `public_receipt_ref_policy: "public_safe_receipt_reference_draft"` → `public_receipt_ref: "public_safe_receipt_reference_draft"` |
| `reject-candidate-no-assertion` (C) | `public_receipt_ref_policy: "public_safe_receipt_reference_draft"` → `public_receipt_ref: "public_safe_receipt_reference_draft"`; `safe_reason_code` **unchanged** (`admission_transition_denied_draft_non_final`) |
| `supersede-with-corrected-assertion` (D) | `public_receipt_ref_policy: "public_safe_receipt_reference_draft"` → `public_receipt_ref: "public_safe_receipt_reference_draft"` |
| `malformed-or-unsafe-payload-fail-closed` (E) | `public_receipt_ref_policy: "none_minted_draft"` → `public_receipt_ref: null`; `safe_reason_code` **unchanged** (`ingress.invalid_request`) |

**Preserved (no change), per the 33Y §9 checklist:**

- **The five existing Phase 33L scenarios** — no sixth added; the no-sixth-vector check
  stands.
- **No public `admission.duplicate_replay`** — and no `duplicate_replay` token anywhere
  (now validator-enforced).
- **Identical replay returns the prior public envelope** — represented by each vector's
  prose `idempotency_expectation` string, with **no** new public code.
- **Class-validation rejection uses `ingress.invalid_request`** — not
  `admission.unsupported_transition` and not `admission.transition_denied`.
- **Unsupported transition** — `admission.unsupported_transition` is **not** introduced
  (source-absent; not represented as a scenario or public code).
- **Policy denial** — keeps the source-real underscored
  `admission_transition_denied_draft_non_final` on the public surface, with the
  `transition_denied_draft` audit class on the **private** effect only; the dotted
  public code is **not** substituted (no blind rename).
- **Private `TransitionReceipt` / `AuditEvent` data stays off public responses** — the
  `must_not_include` denylist, `no_leak_assertions`, and the private
  `expected_private_or_audit_effect` boundary are unchanged.
- **No `receipt_public_ref` in the vectors** — the retired spelling stays absent (no
  fixture/vector debt migration is performed here).
- **`public_receipt_ref` reflected as the preferred public target** — without claiming
  a final schema freeze.

The public-receipt change was made by **inspecting the vector shape**, not by a blind
rename: `public_receipt_ref_policy` was a vector-only policy abstraction present in no
source; the accepted baseline and the runtime spike both name the field
`public_receipt_ref` carrying `null` or a public-safe reference. The smallest safe
alignment collapses the descriptor into that source-real field, preserving the draft
placeholder value and all draft markers.

---

## 6. Validator update requirements (applied)

`validate-route-contract-test-vectors.mjs` was strengthened to enforce the aligned
contract while staying **dependency-light, Node-built-ins-only** (`node:fs`,
`node:path`, `node:url`) with **no** import of `app/`, `@loa/straylight`, or the sibling
Phase 33E fixture validator, and **no** database/network/storage/environment access.

Checks added / modified:

- **Public receipt representation.** `checkPublicResponse` now **requires**
  `expected_public_response.public_receipt_ref` on every vector and **rejects** the
  retired `public_receipt_ref_policy` and `receipt_public_ref` keys on the public
  response. The value must be `null` for the no-receipt scenarios
  (`candidate_pending_not_recallable`, `malformed_or_unsafe_payload_fail_closed`) and a
  non-empty public-safe **draft** string (matching `/draft|reference/`) for the
  receipt-minting scenarios (accept / reject / supersede) — so a frozen/final or
  operational-id value fails.
- **Per-scenario refusal taxonomy — required and exact.** `safe_reason_code` must now
  **exist** on every vector's public response (a missing property is **not** treated as
  equivalent to `null`), and its value must **exactly** match the per-scenario table:
  malformed → exactly `ingress.invalid_request`; reject → exactly
  `admission_transition_denied_draft_non_final` (underscored, source-real); pending /
  accept / supersede → the literal `null` (present, not omitted). The draft-only,
  source-absent dotted `admission.transition_denied`, `admission.unsupported_transition`,
  and `admission.duplicate_replay` codes are explicitly **rejected** on the public
  surface.
- **No public `admission.duplicate_replay` / no `duplicate_replay` token.** A global
  `replayTokenFailures` walk asserts the `duplicate_replay` substring appears
  **nowhere** in any vector (keys or values).
- **Retired-receipt-spelling lock — recursive.** Both retired tokens
  (`public_receipt_ref_policy`, the pre-33Z abstraction, and `receipt_public_ref`, the
  retired public spelling) are now rejected as object **keys at any depth** of a vector
  by a new global `retiredReceiptKeyFailures` walk — closing the prior shallow check's
  escape where a **nested** reintroduction (e.g. inside a sub-object on the public
  surface) could slip through. `receipt_public_ref` also remains in
  `FORBIDDEN_PUBLIC_KEYS` (public-surface walk) for defense-in-depth.
- **Private `TransitionReceipt` / `AuditEvent` / private-receipt no-leak boundary —
  expanded.** `FORBIDDEN_PUBLIC_KEYS` now also rejects the private receipt/audit shapes
  on the public surface (snake_case **and** camelCase): `transition_receipt(_ref)` /
  `transition_id`, `audit_event(_class)` / `audit_ref` / `audit_id`, the private
  `receipt_ref` / `private_receipt_ref` / `receipt_id`, and `signer` / `signature` /
  `policy_details` / `metadata`. Only the public-safe `public_receipt_ref` (or its
  `null`) may cross to the public surface; the private receipt/audit data belongs to
  `expected_private_or_audit_effect`, which `publicSurface()` continues to exclude from
  the walk (so e.g. the legitimate private `audit_event_class` there is untouched —
  it is forbidden **only** on the public surface). The forbidden-substring / regex /
  UUID / opaque-run checks continue to catch operational IDs, raw reasons, and authority
  material as before.
- **Negative self-check (`--self-check`).** A new, dependency-free
  `--self-check` mode loads each known-good vector, applies one targeted mutation, runs
  the **same** `collectVectorFailures` battery the live validator uses, and asserts the
  validator **fails closed** for: a nested `public_receipt_ref_policy`; an omitted
  `safe_reason_code` on a null-code scenario; a `transition_receipt`, `audit_event_class`,
  and private `receipt_ref` on the public response. All five fail closed.
- **No runtime/route/storage/auth/package-export fields introduced.** The existing
  `route_exists: false` / `route_authorized: false` / `storage_assumption` /
  `auth_assumption` / `consent_assumption` / all-`false` flag checks are retained
  unchanged; the metadata, unresolved-marker (`[E,G,H,K,N,O]` / `[J]`),
  storage/auth/consent, no-leak-assertion, recall-projection, synthetic-id, and
  no-sixth-vector checks are unchanged.

The validator prints a deterministic PASS/FAIL summary and exits non-zero on any
failure. The Phase 33E probe validator (`../fixtures/validate-fixtures.mjs`) is a
**separate** validator and is **not** modified or imported.

---

## 7. README update requirements (applied)

`docs/admission-wedge/route-contract-test-vectors/README.md` was updated to explain:

- the **Phase 33Z alignment status** (a §11 status note, following the existing
  convention) — this is the vector-mutation lane authorized by 33Y §10;
- **draft / non-final / non-production status** — `public_receipt_ref` is a draft field;
  Phase 33Z freezes no schema and finalizes no contract;
- **no runtime implementation, no route-contract freeze, no final schema freeze**;
- the **five scenarios preserved** (no sixth without explicit justification);
- the **public receipt representation decision** — `public_receipt_ref` replaces
  `public_receipt_ref_policy`; `null` where no receipt is minted;
- the **refusal-code taxonomy decision** — source-real `ingress.invalid_request` /
  `admission_transition_denied_draft_non_final`; dotted draft codes not introduced;
- **no public duplicate-replay code** — identical replay returns the prior envelope;
- **private receipt/audit data stays private** — the no-leak boundary is unchanged;
- **vector/validator alignment does not authorize runtime implementation**;
- new **§10 validator-description** bullets and **§12 cross-references** for the
  33X / 33Y / 33Z chain.

---

## 8. Fixture boundary

**Phase 33Z does not mutate any Phase 33E fixture JSON.** The fixture two-spelling
debt — the Phase 33E fixtures carry **both** `public_receipt_ref` (private
`receipt_split` key) and `receipt_public_ref` (public `public_response` key), with the
fixtures validator strict-per-section cross-check requiring
`receipt_split.public_receipt_ref == public_response.receipt_public_ref` — **remains
documented debt and is separately gated** (33Y §9 last bullet, 33X §12).

The reasons for keeping fixtures out of scope:

- Aligning the fixtures' `receipt_public_ref` → `public_receipt_ref` would require
  updating the fixtures validator's strict-per-section receipt check **in lockstep**
  (33Y §9), expanding the blast radius beyond the route-contract vectors.
- 33Y §10 explicitly permits Phase 33Z to "bound itself to the route-contract vectors
  alone and defer fixtures to a further lane."
- The task posture is to **avoid touching Phase 33E fixtures unless absolutely
  necessary** — and it is not necessary for the route-vector alignment.

`docs/admission-wedge/fixtures/validate-fixtures.mjs` was **run** (it stays green,
unchanged) but **not modified**. No `docs/admission-wedge/fixtures/README.md` change was
made. Fixture spelling-debt reconciliation is left as **later, separately-gated** work.

---

## 9. Next lane selection

> **Selected: Phase 34A — Admission Wedge route-vector alignment acceptance /
> implementation-readiness decomposition gate (docs/decision-only; not runtime).**

**Phase-numbering rationale.** The Admission Wedge arc has used a single-letter suffix
on `33` (`33A` … `33Z`); that single-letter space is now **exhausted at `33Z`**. The
safest sequential continuation that stays unambiguous and keeps a clean two-character
label is to **roll the tens and start the next suffix block at `34A`** (rather than a
double-letter `33AA`, which is easy to mis-sort and mis-type). `34A` does **not** signal
a new product epoch or any scope expansion — it is the **same Admission Wedge arc, still
docs/decision-only**, continuing past the exhausted `33` suffix space. The label is for
ordering only.

**What Phase 34A should be (recommended posture — docs/decision-only):**

Phase 34A should **accept or patch** the Phase 33Z vector/validator alignment and decide
which readiness decomposition comes next. It should **not** jump to runtime
implementation. It should explicitly decide among:

- **further vector/fixture hardening** — e.g. the separately-gated Phase 33E fixture
  two-spelling debt migration (`receipt_public_ref` → `public_receipt_ref` with the
  fixtures validator updated in lockstep), or additional vector strictness;
- **route-contract final acceptance gate** — finalizing the still-undecided route-owned
  questions (idempotency keying, the `admission.*` dotted taxonomy, production identity
  binding, atomicity/rollback);
- **storage/auth/consent blocker decomposition** — decomposing the held ADR-022E gate #8
  (durable store) and the production auth/consent dependencies;
- **implementation-readiness decomposition** — re-running an implementation-readiness
  decomposition against the now-aligned test surface;
- **stop / cross-repo review** — pausing for a Straylight or freeside-characters review
  before any further Dixie lane.

**Why a decision-only acceptance/decomposition lane (not implementation).** No artifact
in 33Z proves implementation is safe. The Straylight primitive review (A–O) was
**answered** by Straylight PR #65 (merged) and **reconciled** by 33U (33U §4) — but
that answer clarified the *vocabulary/design* only and **explicitly did not clear the
independent production gates**: ADR-022E gate #8 (durable store) stays held; production
auth/consent, the final route contract, final endpoint idempotency, production
signer/authority, production tenant/estate/actor identity binding, production
deployment/readiness, and the final schema freeze each remain to be cleared on their
own gates. (`straylight_primitive_review_complete` stays `false` for that reason — the
held production gates — not because the review answer is missing.) Selecting
implementation would bypass those gates. **Runtime implementation is explicitly not
selected as the immediate next lane.**

---

## 10. Preserve blocked lanes

Phase 33Z is a bounded, non-runtime vector/validator/README alignment lane. It
authorizes **none** of the following; each remains **blocked** and is **not** unblocked
by aligning the test vectors:

- route / API handler implementation **beyond the existing Phase 33N spike**;
- production admission;
- durable Admission Wedge storage implementation (ADR-022E gate #8 held);
- DB writes;
- production database migrations;
- auth implementation;
- production auth / consent implementation;
- public `remember-this`;
- Discord command / history ingestion;
- user chat becoming memory;
- Freeside Characters runtime / client integration;
- package exports;
- the final Dixie route contract;
- route-contract freeze;
- production route deployment;
- production readiness of any kind;
- final / production schema freeze;
- LLM / voice;
- Finn production wiring;
- forget / revoke / correction UI;
- final idempotency semantics (Dixie / endpoint-owned; undecided);
- production signer / authority semantics;
- production tenant / estate / actor identity binding.

> **Vector/validator alignment does not authorize runtime implementation.** Reflecting
> `public_receipt_ref` and the refusal taxonomy on the test surface aligns the
> *test artifacts* to the accepted **draft** baseline; it does **not** finalize or freeze
> the route contract, does **not** clear any production gate, and does **not** authorize
> any route / storage / auth / consent / Freeside / package-export work. The Phase 33N
> dev/operator-only, disabled-by-default spike remains the only authorized route surface.

Phase 33Z also does **not**: mutate any runtime source
(`app/src/services/admission-wedge-spike/*`, `app/src/routes/admission-intake.ts`,
`app/src/services/straylight-recall-intake/*`); mutate the Phase 33E probe/fixture JSONs
or their validator; change any config, env, package, lockfile, CI, or generated file;
flip any draft marker (`route_contract_final`, `idempotency_final`,
`straylight_primitive_review_complete`, etc. stay `false`); or edit the adjacent
`loa-straylight` / `freeside-characters` repositories.

---

## 11. Validation

All commands were run from the repository root
(`/home/eileenspectremoon/loa-dev/loa-dixie`). Results are recorded inline in the
Phase 33Z completion report accompanying this lane. The validation set:

```bash
git status --short --branch --untracked-files=all
git diff --name-status
git diff --stat
git diff --check
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
# Negative-mutation self-check (validator must fail closed on each demonstrated leak/omission):
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# Untracked new doc fence/whitespace sanity:
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-GATE.md || test "$?" = "1"
```

Plus the following scope/staleness checks:

- **docs/test-vector/validator-only scope check** — only files under
  `docs/admission-wedge/route-contract-test-vectors/` and this `docs/*.md` doc are
  changed; no `app/`, `src/`, `tests/`, package/lockfile, config/env, CI, migration,
  runtime route handler, storage, auth/consent, or generated file is touched;
- **nothing-staged check** — `git diff --cached` is empty (no `git add`/commit/push);
- **Markdown fence sanity** on changed docs;
- **JSON parse check** for all changed vector JSON files;
- **grep/staleness checks** — confirming, after alignment: **no** stale
  current-unresolved `E,G,H,K,N,O` / `J` claim (the markers are described as preserved
  legacy vector/runtime markers, not the current primitive-review resolution); **no**
  "no completed Straylight review exists" claim (PR #65 is merged and 33U reconciled
  A–O); **no** public `admission.duplicate_replay` (and no `duplicate_replay` token) in
  the vectors; **no** `receipt_public_ref` in the route-contract test vectors; **no**
  retired `public_receipt_ref_policy` (now recursively rejected); **no**
  `admission.unsupported_transition` used for class-validation rejection; **no**
  `admission.transition_denied` (dotted) used for class-validation rejection; **no**
  `safe_reason_code` omissions (the property is required and exact on every vector); and
  **no** private receipt/audit fields (`transition_receipt`, `audit_event_class`,
  private `receipt_ref`, etc.) in the public response projections.

Both validators report **5/5 valid, 0 failures, no sixth vector**, and the
`--self-check` negative-mutation harness reports **5/5 mutations fail closed**. The
self-check confirms the strengthened validator fails closed on: a **nested**
`public_receipt_ref_policy` inside `expected_public_response`; an **omitted**
`safe_reason_code` on a null-code scenario (which must carry the literal `null`); a
`transition_receipt`, an `audit_event_class`, and a private `receipt_ref` on the public
response. (The earlier spot-checks — reintroducing `public_receipt_ref_policy`,
introducing `receipt_public_ref`, a non-null `public_receipt_ref` on a no-receipt
scenario, a dotted `admission.transition_denied` / `admission.unsupported_transition`, a
`duplicate_replay` token, and a missing `public_receipt_ref` — also continue to fail
closed.)

---

## 12. Acceptance criteria for Phase 33Z

Phase 33Z succeeds if and only if:

1. **Bounded docs + vector/validator only** — it creates this Phase 33Z doc and changes
   only the five route-contract test-vector JSONs, their validator, and their README;
   it changes **no** runtime source, test, route, store, migration, auth, consent,
   config, env, package, lockfile, CI, generated, or Phase 33E fixture file.
2. **Public receipt aligned** — the vectors carry `public_receipt_ref` (string draft
   reference or `null`), the retired `public_receipt_ref_policy` / `receipt_public_ref`
   are gone from the public surface, and the validator enforces this.
3. **Taxonomy preserved and enforced** — class-validation uses `ingress.invalid_request`;
   policy denial keeps the source-real underscored marker; the dotted draft codes and
   `admission.duplicate_replay` are rejected on the public surface.
4. **Five scenarios preserved** — no sixth; the no-sixth-vector check stands.
5. **Markers and draft flags unchanged** — `[E,G,H,K,N,O]` / `[J]` and all `false`
   draft/non-final flags are preserved; nothing is frozen.
6. **Private boundary intact** — private `TransitionReceipt` / `AuditEvent` data stays
   off the public response.
7. **Both validators green** — the Phase 33E fixture validator and the Phase 33L
   route-contract test-vector validator both pass.
8. **Next lane selected** — Phase 34A (docs/decision-only acceptance /
   implementation-readiness decomposition), with implementation explicitly not selected.
9. **Blocked lanes preserved** — no production / durable / public / Freeside / package /
   schema-freeze / auth / consent / route-contract-freeze / runtime lane is authorized.
10. **No production-readiness claim** — Phase 33Z aligns test artifacts to a **draft**
    baseline and freezes nothing.
