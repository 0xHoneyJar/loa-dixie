# Admission Wedge — Draft Contract Probes (Phase 33C)

> **Phase**: 33C — Admission Wedge canonical fixture/probe draft
> **Status**: **docs + non-runtime fixture/probe only.** No live route, no
> storage, no auth, no admission writes, no runtime behavior.
> **Schema status**: **draft v0 — NOT frozen.** These probes are a *proposal*
> for cross-repo review, not a production schema.

This directory holds the first Dixie-owned **draft v0** Admission Wedge contract
probes. They are deterministic, fully synthetic, public-safe JSON files plus an
isolated, dependency-free validator. They exist to pin a *shape* for cross-repo
review — they do **not** implement admission.

## What this is (and is not)

- **Is**: a set of static JSON contract probes and an offline validator that
  checks their shape and no-leak properties.
- **Is not**: a live route, an API handler, storage, auth/consent, an admission
  implementation, a package export, or a frozen schema.

Per the [Phase 33B alignment decision](../../ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md),
**Dixie owns this first canonical probe proposal** for cross-repo review.
**Straylight (`@loa/straylight`) remains the canonical primitive / substrate
owner** of the assertion-lifecycle vocabulary; Dixie consumes and mirrors those
names rather than coining its own. **Freeside Characters should wait** for this
Dixie-authored probe set before mutating its local proof labels (fixtures,
reducer, runner) — the probes give it a canonical shape to reconcile against
rather than a guess. This work does **not** edit Freeside Characters and does
not mutate its local labels.

## Not authorized by Phase 33C

No live Dixie admission route, no production admission, no production storage, no
production auth/consent, no public `remember-this`, no Discord command, no
Discord history ingestion, no user chat becoming memory, no Freeside Characters
runtime change, no package export, no LLM/voice behavior, no Finn production
wiring, no forget/revoke/correction UI, and **no final schema freeze**.

To be unambiguous about current reality: Dixie today exposes a read-only,
default-off, fail-closed **recall** route (`POST /api/recall/intake`). It has
**no admission route, no admission concept in route code, and no production
storage**; admission semantics live upstream in `@loa/straylight`. Phase 33C
implements no runtime behavior and changes no Dixie application/source/route/
config code.

## The five probes

Each probe is a single JSON object with a shared envelope: synthetic `input`
(may carry a private `unsafe_marker:` token), a modeled transition / assertion /
recall projection, a private `audit` object, and a clean `public_response`. The
`public_response` is the only surface a caller would see, and the validator
proves it never leaks private material.

| File | Scenario | What it proves |
|------|----------|----------------|
| `candidate-pending-not-recallable.json` | A | A candidate exists as canonical `proposed`; no admission transition; no admitted assertion; `recall_eligible` is false; the payload is not echoed in the public projection. |
| `accept-candidate-to-admitted-assertion.json` | B | A candidate is accepted via an `admit_assertion` transition linking candidate → admitted assertion (canonical status `active`); it becomes recall-eligible under policy; a receipt/audit split exists; the raw payload is not echoed. |
| `reject-candidate-no-assertion.json` | C | A candidate is denied (canonical `transition_denied` audit event); **no** admitted assertion is minted; the candidate stays non-recallable; a rejection receipt exists on the audit boundary; the public response is safe. |
| `supersede-with-corrected-assertion.json` | D | A prior assertion moves to canonical `superseded`; a corrected assertion is `active`; ordinary recall includes the corrected active assertion **only**; the superseded prior remains audit/provenance only; the public response is safe. |
| `malformed-or-unsafe-payload-fail-closed.json` | E | A malformed/unsafe input fails closed with a stable reason code from the existing Dixie refusal family; **no** admitted assertion is minted; no raw payload, unsafe marker, source material, or stack trace appears in the public response. |

## Vocabulary: canonical (aligned) vs draft (proposed)

The probes **align** to canonical Straylight-owned vocabulary where it exists,
and clearly mark Dixie-proposed names as **draft**. Final naming reconciles at a
later, separately-gated phase; nothing here is frozen.

| Concept | Term used | Ownership / status |
|---------|-----------|--------------------|
| Pre-admission candidate state | `proposed` | Canonical `AssertionStatus` (Straylight-owned) — aligned. Not the Freeside-local `candidate_pending`. |
| Admitted assertion status | `active` | Canonical `AssertionStatus` (Straylight-owned) — aligned. There is no bare `admitted` status. |
| Act of admission | transition `admit_assertion` + audit event `assertion_admitted` | Canonical (Straylight-owned) — aligned. |
| Denied admission | audit event `transition_denied` | Canonical (Straylight-owned) — aligned. Not a coined `rejected` status. |
| Correction | `(superseded, active)` pair + supersede link | Canonical statuses (Straylight-owned) — aligned. No coined `corrected_active` status. |
| Recallability signal | `RecallUseInstruction` (`usable` … `do_not_use_for_action`) | Canonical (Straylight-owned) — aligned. |
| Shape-failure reason code | `ingress.invalid_request` | Dixie-local refusal family (Dixie-owned) — aligned to existing code. |
| Class-failure reason code | `seam.class_validation_failed` | Dixie-local refusal family (Dixie-owned) — aligned to existing code. |
| Link / receipt field names | `source_candidate_id`, `admission_transition_id`, `admitted_assertion_id`, `supersedes_assertion_id`, `superseded_by_assertion_id`, `recall_use_instruction`, `rendered_candidate_payload`, `receipt_public_ref` | **DRAFT** — Dixie-proposed, subject to reconciliation. |

The pending-vs-denied distinction is preserved deliberately: a candidate with no
transition is simply `proposed` (probe A), which is **not** the same as an
explicit `transition_denied` (probe C). The probes keep these on separate
scenarios so the distinction is provable rather than collapsed.

## No-leak rules (enforced by the validator)

The validator deep-walks each `public_response` and fails if it finds any of:

- the generic synthetic `unsafe_marker:` token, or any raw candidate payload /
  source material;
- known internal/foreign sentinel forms (e.g. `BODY_OVER_CAP`,
  `runtime_seam:internal:`, `*_PRIVATE_SENTINEL`);
- stack traces, `Error:`-style prefixes, or `file.ts:line` source references;
- URLs (`http(s)://`, `ws(s)://`), bearer tokens, JWTs, `sk-` keys, or
  `-----BEGIN` PEM material;
- long opaque IDs (`0x`-hex addresses, 40+ char hex runs);
- audit-only keys (`tenant_id`, `estate_id`, `candidate_id`, `candidate_payload`,
  `raw_reasons`, `policy_reason`, `receipt_id`, …).

> **On sentinels.** No Dixie-side public leak-canary string exists in code (the
> only over-cap sentinel is an internal `Symbol`, never serialized). These probes
> therefore use a **generic synthetic `unsafe_marker:` token**, held only in the
> `input` and `audit` sections, and the validator proves it can never appear in a
> `public_response`. The Freeside-local sentinel string is **not** used here.

## Running the validator

```bash
node docs/admission-wedge/fixtures/validate-fixtures.mjs
```

The validator uses **Node built-ins only** (no package install, no network, no
storage, no env, no app/route imports). It checks that all five scenario files
exist and parse, that the shared metadata is correct (`probe_kind`,
`probe_version`, `schema_final=false`, `runtime_enabled=false`,
`production_admission=false`, `public_safe=true`), that each scenario satisfies
its invariant, and that no `public_response` leaks. It prints a deterministic
PASS/FAIL summary and exits non-zero on any failure.

## Provenance

- [`docs/ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md`](../../ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md) — Phase 33B Dixie-first ownership decision and minimum probe set (§6) / schema surfaces (§7) / vocabulary directions (§8).
- [`docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md`](../../ADMISSION-WEDGE-CONTRACT-RESPONSE.md) — Phase 33A contract response: the core invariant, draft v0 vocabulary, and reconciliation directions.
- [`docs/integration/phase-32e-recall-wedge-route-contract.md`](../../integration/phase-32e-recall-wedge-route-contract.md) — the Recall Wedge route contract and BFF/Straylight ownership split this probe set assumes (but does not mutate).
- `@loa/straylight` — semantic owner of the assertion lifecycle and the canonical vocabulary the probes align to.
