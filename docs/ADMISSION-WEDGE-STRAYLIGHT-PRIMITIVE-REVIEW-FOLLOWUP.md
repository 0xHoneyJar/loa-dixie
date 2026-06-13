# Phase 33T — Admission Wedge Straylight Primitive-Review Follow-Up / Consolidated Cross-Repo Review Handoff

> **Phase**: 33T
> **Branch context**: `phase-33t-admission-straylight-primitive-review-followup`
> **Related**: Dixie Phase 33A–33S (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle, recall-eligibility,
> signer/keyring, receipt/audit, and storage-adapter primitives
> **Status**: **docs / decision-only.** No source, test, route, route handler,
> storage, store code, DB write, migration, auth, consent, validator,
> probe/fixture/vector JSON, config, env, package, lockfile, CI, generated, or
> live-integration change.
> **This is a primitive-review *follow-up* / cross-repo review **request**, not a
> completed review.** Phase 33J issued an abstract §5 review register (A–O) before
> any Admission Wedge code existed. The chain has since produced a concrete,
> bounded, dev/operator-only route surface (Phase 33N) and a bounded synthetic
> admitted-assertion ledger (Phase 33Q), both accepted (Phases 33O, 33R). Phase 33S
> selected this follow-up (its Option D) as the **highest-leverage vocabulary
> prerequisite**. Phase 33T **re-issues / advances** the still-unresolved rows
> (E, G, H, K, N, O) and the review-dependent row (J) against that concrete
> evidence, turning the abstract vocabulary request into a "does this concrete
> synthetic shape match your canonical primitives?" review — and stops. It changes
> **no** routes, route handlers, storage, store code, auth, consent, probes,
> validator, fixtures, vectors, runtime behavior, or production schema; it does
> **not** freeze a final/production schema, finalize the route contract, complete
> the Straylight primitive review, or authorize any production / durable / public
> lane. It does **not** claim that resolving the Straylight review alone makes
> production admission ready, and it does **not** claim Straylight owns the endpoint
> idempotency semantics.

This document is the Dixie-side **Straylight primitive-review follow-up** that
Phase 33S / PR #137 selected as the next lane (Option D —
[`ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md:483-521`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)).
Phase 33S accepted the route surface (33N/33O) and the synthetic stateful effect
(33Q/33R), analysed the Phase 33R §9 Options A–F, **selected Option D** (advance the
Straylight review with better evidence), recorded the rejected lanes, and observed
that the Straylight primitive review (its U1) is the **highest-leverage vocabulary
prerequisite** — the upstream gate whose resolution most clarifies the downstream
design, **but not the only production gate** (the ADR-022E durable store, production
auth/consent, and final route-contract acceptance remain independent, still-held
production gates). Phase 33T executes exactly that charter: it consolidates the
concrete Dixie evidence, re-issues the unresolved review rows grounded in that
evidence, separates the cross-repo ownership boundaries, defines the expected
Straylight-side response shape, preserves every blocked lane, and selects a
docs/decision-only next lane (Phase 33U — review-response intake / lane-decision
gate). It designs no envelope, implements no route, mutates no probe / validator /
fixture / vector, builds no store, and authorizes no live behavior, route spike, or
storage.

Every assessment below is grounded **read-only** against the actual Dixie repo (the
merged Phase 33N route spike and Phase 33Q ledger, their config/server wiring, the
draft fixtures/vectors and their validators) and the prior docs chain
(33I/33J/33K/33M/33O/33P/33R/33S). The Straylight primitive citations are carried
forward from the Phase 33J §2 register against a **possibly-stale** local
`../loa-straylight` checkout, and are flagged as such (§2); they are **evidence the
review should confirm**, not a completed review.

> **This phase does not complete the Straylight primitive review.** Phase 33J
> issued the §5 review register (A–O) and **confirmed no completed Straylight
> Admission-Wedge primitive-review artifact exists**; the genuinely-unresolved rows
> (E, G, H, K, N, O) and the review-dependent / non-final row (J) remain open.
> Phases 33K–33S carried them forward unchanged — in code,
> `ADMISSION_SPIKE_UNRESOLVED_ROWS = ['E','G','H','K','N','O']` and
> `ADMISSION_SPIKE_REVIEW_DEPENDENT_ROWS = ['J']`
> ([`app/src/services/admission-wedge-spike/classifier.ts:73-74`](../app/src/services/admission-wedge-spike/classifier.ts),
> surfaced on every public response at
> [`public-response.ts:112-113`](../app/src/services/admission-wedge-spike/public-response.ts)).
> This phase keeps them unresolved; it **re-issues / advances** the review handoff,
> but it does **not** perform, answer, or claim to complete the review.
> `straylight_primitive_review_complete` stays `false` everywhere.

---

## 1. Phase title, status, and scope

- **Phase 33T — Admission Wedge Straylight primitive-review follow-up /
  consolidated cross-repo review handoff.**
- Dixie-side **docs / decision-only**.
- Follows Dixie Phase 33S / PR #137 (route-spike + bounded-ledger acceptance
  decomposition gate, commit `682abc7e`), which selected this Option-D lane and
  provisionally labelled it Phase 33T
  ([`ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md:519-521`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)).
- This is a **cross-repo review *request* / follow-up handoff**, **not** a completed
  review, an acceptance gate, a decomposition gate, route or store implementation,
  or a route-spike (re-)authorization.
- It **re-issues / advances** the Phase 33J §5 review register — specifically the
  genuinely-unresolved rows **E, G, H, K, N, O** and the review-dependent row **J** —
  grounded in the concrete Phase 33N route surface and Phase 33Q ledger (§4, §5).
- It changes **no** routes, route handlers, storage, store code, auth, consent,
  validators, probes, fixture/vector JSON, source code, configuration, env, package
  files, lockfiles, CI, or production schema.
- It does **not** freeze a final/canonical/production schema, **finalize the route
  contract** (Phase 33G remains a draft design), **complete the Straylight primitive
  review** (E, G, H, K, N, O remain unresolved; J review-dependent), or finalize
  idempotency / signer / authority / tenant-estate-actor identity-binding semantics.
- It does **not** mutate the Phase 33N route handler, the Phase 33Q ledger module,
  the spike service modules, their tests, the Phase 33E probe JSONs, the Phase 33L
  route-vector JSONs, or either docs validator. Per the Phase 33D §6 invariant — any
  probe / validator / fixture / vector mutation requires its own separately-gated
  phase — Phase 33T inspects all of them **read-only**.
- It does **not** authorize anything: not production admission, durable Admission
  Wedge storage, DB writes, migrations, production auth/consent, a public
  `remember-this`, Discord command/history ingestion, user chat becoming memory,
  Freeside Characters runtime/client integration, package exports, a final schema
  freeze, production route deployment, a completed Straylight primitive review, final
  idempotency semantics, production signer/authority semantics, or production
  tenant/estate/actor identity binding (§7, §8).
- It does **not** claim that resolving the Straylight primitive review alone makes
  production admission ready, and it does **not** claim Straylight owns the endpoint
  idempotency semantics (those are Dixie / endpoint route-contract-owned — §5 row J,
  §6, §7).

The audience for this document is the **Straylight (`@loa/straylight`)
primitive/vocabulary owner** (who must answer, rename, re-relate, or explicitly defer
the §5 rows — §9), **future Dixie phases** (primarily Phase 33U review-response
intake / lane-decision gate, which consumes any Straylight-side response — §10), and
**freeside-characters** as an interested-but-blocked downstream consumer (§6, §8).

---

## 2. Source chain

This gate sits one rung above the Phase 33S decomposition gate on the Dixie
Admission Wedge ladder. It introduces no new contract material and freezes nothing;
it advances the Straylight review request that 33S selected, now backed by the
concrete evidence the chain has produced since the abstract Phase 33J handoff.

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33I | #127 | Implementation-readiness **decomposition** gate — ordered the blockers into lanes (33J → 33K → 33L → 33M → 33N); selected 33J. ([`ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)) |
| 33J | #128 | Straylight primitive-review **request** / vocabulary-dependency gate — issued the §5 fifteen-item review register (A–O); flagged genuinely-unresolved rows **E, G, H, K, N, O** and review-dependent row **J**. **Did not complete the review.** ([`ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)) |
| 33K | #129 | Storage/auth/consent precondition **design** gate — drafted record categories, service-auth/consent options, idempotency precondition, no-leak posture, threat model; carries A–O as exit criteria. **Implemented no storage/auth/consent.** ([`ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)) |
| 33L | #130 | Route-contract **test-vector fixture draft** — converted the Phase 33G §16 vectors (A–E) into five non-runtime route-contract test-vector fixtures + a Node-built-ins-only validator; carries the unresolved markers forward. **No runtime route tests, no route.** |
| 33M | #131 | Dev/operator-only route-spike **authorization** gate — authorized (did not implement) the Phase 33N spike under strict §7–§15 constraints; §7 storage posture names Option A (preferred) / Option B (acceptable) / Option C (not authorized). ([`ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)) |
| 33N | #132 | Dev/operator-only route-spike **implementation** (commit `f44dd702`) — implemented the disabled-by-default `POST /api/admission/intake` route spike on **Storage Option A (no durable storage)**, the spike service modules, the gated config/server wiring, env docs, dev-spike runbook, and spike tests. **Authorized no production admission, durable storage, production auth/consent, Freeside integration, or package export.** (`app/src/routes/admission-intake.ts`; `app/src/services/admission-wedge-spike/`) |
| 33O | #133 | Route-spike **acceptance** gate (commit `db14ab40`) — accepted Phase 33N **only** as a bounded, disabled-by-default, dev/operator-only route spike for MVP 2; stated it does **not** complete MVP 2; selected Phase 33P. ([`ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md)) |
| 33P | #134 | Storage / receipt hardening **decision** gate (commit `0e97758a`) — selected **Option B** for a possible future Phase 33Q (dev-only bounded synthetic store); **rejected Option D** (production-like durable storage); defined §9 proof cases, §10 receipt/audit and §11 no-leak hardening, §12 non-final caveats; selected Phase 33Q. **Implemented no store.** ([`ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)) |
| 33Q | #135 | Dev-only bounded synthetic admitted-assertion **ledger implementation** (commit `6d6f07f6`) — a bounded, process-local, Map-backed, synthetic-only, tenant+estate-scoped, capacity-bounded, non-durable, fail-closed admitted-assertion ledger as a **route-DI / test-seam-only** instrument; proved the §9 proof cases over synthetic state behind the existing default-off gate. **`server.ts` not wired; no env flag added; no package export.** (`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`; [`docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`](admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md)) |
| 33R | #136 | Bounded-ledger **acceptance / hardening** gate (commit `ae93ad3d`) — accepted Phase 33Q **only** as a bounded, non-production, test-seam-only synthetic ledger proof for MVP 2; stated it does **not** complete MVP 2; named the §9 Options A–F; selected the Phase 33S decomposition gate. ([`ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)) |
| 33S | #137 | Route-spike + bounded-ledger acceptance **decomposition** gate (commit `682abc7e`) — consolidated the 33N/33O + 33Q/33R evidence, analysed Options A–F, **selected Option D** (Straylight primitive-review follow-up, provisional Phase 33T) as the highest-leverage vocabulary prerequisite; recorded the D→E follow-on; rejected production rollout; preserved every blocked lane. ([`ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)) |
| **33T** | *(this doc; docs/decision-only — not committed/merged yet)* | **Straylight primitive-review follow-up — re-issues/advances the §5 unresolved review rows (E, G, H, K, N, O; review-dependent J) grounded in the concrete Phase 33N route surface and Phase 33Q ledger; separates cross-repo ownership; defines the expected Straylight response shape; selects Phase 33U (review-response intake / lane-decision gate). Completes no review, authorizes no production / durable / public lane.** |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter track `dixie_admission_wedge_probe_v1`, **test-only**; v0 fails closed as `unknown_probe_version`. The adapter is a **pure, fixture-bound semantic mapping layer with no live Dixie call**. |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded test-only purpose; authorizes no live client, no package export, no runtime wiring; confirms **live Dixie calls: absent**. **Verified MERGED on GitHub (merged 2026-06-06).** |

> **Grounding note on the 45J / PR #177 citation.** Per the Phase 33H–33S grounding
> notes, GitHub confirms freeside-characters **PR #177 is MERGED** (merged
> 2026-06-06). The local `../freeside-characters` checkout is **stale** for PR status
> (it sits on the PR-head branch, not the merge); GitHub's merged state — not the
> local tree — remains authoritative. The Phase 33N spike and the Phase 33Q ledger
> perform **no** Freeside import or call, so this cross-repo state is unchanged
> context, not a dependency of this gate.

### Straylight (`@loa/straylight`)

The canonical primitive/substrate owner of the assertion-lifecycle,
recall-eligibility, signer/keyring, receipt/audit, and storage-adapter vocabulary.
Read read-only in `../loa-straylight`. The primitive sources the review should
confirm for the Admission Wedge (carried forward verbatim from Phase 33J §2, against
a possibly-stale checkout):

| Primitive | Straylight source (Phase 33J §2; may be stale) |
|-----------|-------------------|
| `AssertionStatus` (`proposed`/`active`/`contested`/`demoted`/`revoked`/`forgotten_from_recall`/`superseded`/`sealed`) | `src/straylight/types.ts:86-94` |
| `admit_assertion` transition + `EstateStore.admit()` executor (status set to `active`) | `src/straylight/types.ts:276-290`; `src/straylight/estate.ts:140-265` |
| `CandidateAssertion` (pre-admission object) | `src/straylight/types.ts:551-565` |
| Supersession (`superseded` status, `supersedes_refs`, `AssertionLinkType: supersedes`) | `src/straylight/types.ts:93,157`; arch spec `:910-921` |
| `RecallUseInstruction` (`usable`/`mark_as_contested`/`use_as_background_only`/`do_not_use_for_action`); recall eligibility = emergent `dispositionFor`, **not** a stored flag | `src/straylight/types.ts:427-442`; `src/straylight/policy.ts:187-241` |
| `SignerType` (incl. `policy_service`) + `SignerCompetenceRule`/`Keyring` | `src/straylight/types.ts:122-130,185-209` |
| `actor_id`/`estate_id` binding; `tenant_id` is **host-layer, NOT a wedge primitive**; no `subject_actor_id` (only `Assertion.subject_refs`) | `src/straylight/types.ts:145-167`; `src/straylight/host/tenancy.ts:1-57` |
| Receipts/audit (`TransitionReceipt`, `RecallReceipt`, `AuditEvent` incl. `assertion_admitted`/`transition_denied`) | `src/straylight/types.ts:364-388,469-489,495-529` |

> **Straylight grounding caveat (carried from 33J §2 / 33S §2).** These primitive
> definitions are real and citable, but they describe Straylight's **general**
> assertion lifecycle (built for the Recall Wedge). The local Straylight checkout's
> latest ADR is **ADR-030** and its HEAD is around **Phase 31F**; if
> Admission-Wedge-relevant Straylight work is newer, this checkout may be stale.
> **No** Straylight artifact naming an "admission wedge", "assertion intake", or
> admission route/endpoint was found anywhere in the repo (repo-wide search returned
> zero hits). The review request below is framed as "perform / confirm", never "we
> found your review". The durable estate store is gated by **ADR-022E (held)** and
> route guardrails by **ADR-026C / ADR-026D** — all Straylight-repo decision records
> cited by the Dixie chain; the IDs are real, not fabricated.

> **Cross-repo phase-numbering caution.** Dixie's 33-series and the
> freeside-characters 45-series are independent labels in separate repositories and
> must not be conflated.

**Ownership posture carried by the whole chain (unchanged here):** Dixie owns the
HTTP/BFF ingress seam (route, tenant/estate binding *as a spike isolation
mechanism*, idempotency *wire*, refusal mapping, no-leak projection) and the *draft*
route contract; **Straylight (`@loa/straylight`) is the canonical
primitive/substrate owner** of the assertion-lifecycle vocabulary; Dixie is a
**non-owning consumer** that mirrors those names rather than coining its own;
freeside-characters owns the client/Discord side and keeps its proof labels local
and test-only.

---

## 3. Why this follow-up exists

Phase 33J issued the Straylight primitive review register **before any Admission
Wedge code existed** — the only artifacts then were the Phase 33E draft probes and
the Phase 33G paper route-contract design. Its §5 register (A–O) asked abstract
vocabulary questions ("is `proposed` the canonical pre-admission status?", "how does
`recall_eligible` reconcile with the emergent `RecallUseInstruction` disposition?")
and the §6 matrix could only point at *draft probe shapes*. Phase 33J **confirmed no
completed Straylight Admission-Wedge primitive-review artifact exists** and selected
Phase 33K (storage/auth/consent precondition design) as the next lane, carrying A–O
forward as exit criteria.

The chain has since produced **concrete, bounded, dev/operator-only evidence** the
abstract handoff could not reference:

- the **Phase 33N route surface** — a real, disabled-by-default, gated runtime slice
  that classifies the five frozen scenarios, fails closed, and no-leaks every public
  response (accepted Phase 33O); and
- the **Phase 33Q bounded synthetic admitted-assertion ledger** — a process-local,
  synthetic-only, tenant+estate-scoped, bounded, non-durable, fail-closed,
  test-seam-only instrument that mints a canonical-aligned `active` admitted
  assertion on accept, repoints recall on supersession, and proves
  replay/idempotency over synthetic state (accepted Phase 33R).

Phase 33S analysed the Phase 33R §9 Options A–F and **selected Option D** — advance
the Straylight review — precisely because the follow-up is now **materially richer
than the abstract 33J handoff**: each A–O question can be grounded in a concrete
synthetic shape and the request reframed as "**does this concrete synthetic shape
match your canonical primitives — confirm, rename, re-relate, or defer?**"
([`ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md:509-515`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)).

Phase 33T therefore:

- **consolidates the concrete Dixie evidence** the chain has produced (§4);
- **re-issues / advances the still-unresolved review rows** (E, G, H, K, N, O) and
  the review-dependent row (J), grounding each in that concrete evidence with
  `file:line` citations (§5);
- **separates the cross-repo ownership boundaries** — Straylight-owned primitive
  vocabulary, Dixie-owned endpoint route contract / wire behavior, Freeside-owned
  client/Discord integration (§6);
- **states exactly what Dixie is asking Straylight to decide — and not** (§7);
- **defines the expected Straylight-side response shape** (§9);
- **preserves every blocked lane** (§8) and **selects a docs/decision-only next
  lane** (§10 — Phase 33U review-response intake / lane-decision gate).

It does **not** answer the review, does not complete it, and does not claim the
review alone clears production admission. It is the *constructive immediate
prerequisite* Phase 33S identified: it advances the Straylight review while keeping
every implementation lane stopped.

---

## 4. Concrete evidence from Dixie

The two accepted layers are **complementary halves of a single intake path**, each
bounded, dev/operator-only, non-production, and proven over synthetic state only.
**Neither is active on the default server path** — the **Phase 33N route is
conditionally mounted only when `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'**
([`app/src/server.ts:630-646`](../app/src/server.ts)), and the **Phase 33Q ledger
remains test-seam-only and is NOT wired into `server.ts`**: the
`/api/admission/intake` mount passes only `{ enabled, gate, emitAudit }` and **no
ledger** (`server.ts:635-645`). This still does **not** amount to production
admission (§4.3). The evidence below is what makes the §5 review request concrete.

### 4.1 Phase 33N route spike (accepted Phase 33O)

A real, **disabled-by-default / gated** route slice, dev/operator-only, no durable
storage, fail-closed, with a no-leak response path and every draft marker false:

- **Disabled by default / gated** — the route is not registered at all unless
  `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`
  ([`app/src/server.ts:630-646`](../app/src/server.ts)); a defense-in-depth disabled
  handler returns a leak-free 404 even if mounted
  ([`admission-intake.ts:276-281`](../app/src/routes/admission-intake.ts)).
- **Dev/operator-only, fail-closed auth** — layered behind the global `/api/*`
  allowlist, the dev gate (service token + operator-id allowlist) **fails closed
  when both are empty/unset** and uses constant-time comparisons that never reveal
  which gate failed
  ([`auth-gate.ts:66-96`](../app/src/services/admission-wedge-spike/auth-gate.ts);
  refusal at [`admission-intake.ts:286-295`](../app/src/routes/admission-intake.ts)).
  It reads a **dedicated `x-admission-service-token` header**, deliberately not
  `Authorization: Bearer`, because the global allowlist already owns `Authorization`
  and is **not exempt** for `/api/admission`
  ([`admission-intake.ts:41-44`](../app/src/routes/admission-intake.ts);
  [`auth-gate.ts:9-21`](../app/src/services/admission-wedge-spike/auth-gate.ts)).
- **Strict synthetic five-scenario shape** — a strict Zod schema accepts only two
  minimal fields (`spike: 'admission_intake_dev_spike_v0'` + a draft
  `transition_intent`) and maps the five draft intents 1:1 to the five frozen
  scenarios, adding no sixth and failing closed on everything else
  ([`classifier.ts:33-90,115-195`](../app/src/services/admission-wedge-spike/classifier.ts)).
- **Storage Option A — no durable storage** — a pure classifier + public-response
  builder that mints nothing durable; trivial rollback
  ([`classifier.ts:1-20`](../app/src/services/admission-wedge-spike/classifier.ts)).
- **No-leak response path (structural + runtime)** — the public body is built purely
  from the classification and fixed synthetic placeholders (never request-controlled
  material — [`public-response.ts:1-10,90-116`](../app/src/services/admission-wedge-spike/public-response.ts)),
  and **every** public response is deep-walked through a runtime no-leak guard
  mirroring the Phase 33L denylist before serialization, with a hardcoded
  known-safe HTTP-500 fallback that is **not** re-guarded
  ([`admission-intake.ts:247-270`](../app/src/routes/admission-intake.ts);
  [`no-leak.ts:22-76,151-182`](../app/src/services/admission-wedge-spike/no-leak.ts)).
- **Draft markers false** — every response asserts `schema_final:false`,
  `route_contract_final:false`, `production_admission:false`,
  `straylight_primitive_review_complete:false`, `idempotency_final:false`, plus the
  carried-forward unresolved rows (E, G, H, K, N, O) and review-dependent row (J)
  ([`public-response.ts:106-114`](../app/src/services/admission-wedge-spike/public-response.ts);
  rows defined at
  [`classifier.ts:73-74`](../app/src/services/admission-wedge-spike/classifier.ts)).

### 4.2 Phase 33Q bounded synthetic ledger (accepted Phase 33R)

A bounded, process-local, synthetic-only, tenant+estate-scoped, non-durable,
fail-closed admitted-assertion ledger — **test-seam-only**, **not wired into
`server.ts`**, no raw candidate payload persisted, replay/de-dup spike-scoped only:

- **Process-local, non-durable** — all state lives in JS `Map`s captured in a
  factory closure; **no** database/file/socket/timer; a second ledger is empty (the
  restart-no-residue proof)
  ([`admitted-assertion-ledger.ts:28-35,662-687`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)).
- **Synthetic-only, no raw candidate payload** — every accepted field is validated
  to a bounded synthetic-label shape **before any mutation** (type → emptiness →
  length → unsafe-marker substring denylist → label regex); there is no field named
  for a raw payload, and payload-shaped strings are *rejected*, not merely undeclared
  ([`admitted-assertion-ledger.ts:90-108,372-444,475-547`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)).
- **Tenant + estate scoped** — every read/write is bound to a `(tenant_id,
  estate_id)` scope; an estate is reachable only by its owning tenant; re-homing an
  estate to a different tenant fails closed; foreign-tenant reads return empty
  ([`admitted-assertion-ledger.ts:69-75,697-722,996-1018`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)).
- **Bounded, fail-closed** — both capacity bounds validated and frozen at creation;
  capacity enforced as bounded **rejection** (never eviction); over-capacity writes
  leave the estate exactly as it was
  ([`admitted-assertion-ledger.ts:52-67,564-600,934-955`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)).
- **Canonical-aligned status model** — `accept` mints exactly one `active` admitted
  assertion with `recall_eligible: true`, **never** a coined `admitted` status;
  supersession adds a corrected `active` assertion and moves the prior to canonical
  `superseded` (`recall_eligible: false`, retained for audit/provenance)
  ([`admitted-assertion-ledger.ts:90-108,768-828,830-932`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)).
- **Receipt-like, private audit** — each transition records a frozen, non-final
  `SyntheticAuditRecord` carrying `audit_event` (`assertion_admitted` /
  `assertion_superseded`), a private synthetic `receipt_ref`, **and both privacy
  markers** `audit_private: true` and `public_audit_detail: false`; it is **never**
  serialized to a public response
  ([`admitted-assertion-ledger.ts:119-130,646-660,796-804,889-897`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)).
- **Replay / de-dup spike-scoped only** — an identical replay returns `'replayed'`
  and mints nothing; a conflicting replay (same key, different content) throws
  without overwrite/fork; the replay key is synthetic, **not request-derived**, and
  accounted in the byte budget. Final production idempotency semantics remain
  **unresolved**
  ([`admitted-assertion-ledger.ts:147-154,265-282,729-766`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)).
- **DI-seam-only coupling** — the route touches the ledger only when **both** a
  ledger and a synthetic `(tenant, estate)` scope are injected (tests only); the
  server injects neither, so the default path is byte-identical to the Phase 33N
  Option A path, and any ledger throw fails closed to the same stable public-safe
  refusal
  ([`admission-intake.ts:85-110,335-368`](../app/src/routes/admission-intake.ts)).

### 4.3 Why this is still not production admission

Phase 33R accepted Phase 33Q **only** as a bounded, non-production, test-seam-only
synthetic proof; Phase 33S confirmed it does **not** prove the *production* path. The
gap is the full governed transition over **real** estate — candidate → a
**durably-stored** admitted assertion with **real** status / provenance / receipt →
recall **actually** includes it → pending / rejected / malformed candidates
**durably** leave no admitted state — which remains blocked behind at least three
independent, still-held upstream gates
([`ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md:284-321`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)):

1. **The Straylight primitive review (E, G, H, K, N, O; J review-dependent) is
   unresolved** — the gate this follow-up advances, but **not** the only gate.
2. **The durable estate store is gated by ADR-022E (held).**
3. **The route contract is not final** (Phase 33G remains a draft design;
   `route_contract_final:false` on every vector and response).

No final schema is frozen anywhere in the chain. Every probe carries
`schema_final:false`, `canonical_schema:false`, `route_contract:false`,
`production_admission:false`, `identity_binding_final:false`, `synthetic_binding:true`,
and `straylight_primitive_review_complete:false`
([`validate-fixtures.mjs:250-258`](admission-wedge/fixtures/validate-fixtures.mjs)
enforces the six schema/binding markers;
[`:265-272`](admission-wedge/fixtures/validate-fixtures.mjs) enforces the
`straylight_primitive_review_complete:false` marker),
and every route-vector and runtime response asserts the same draft markers false.
**Resolving the Straylight review alone does not make production admission ready.**

---

## 5. Re-issued review register (grounded in the concrete evidence)

The rows below are the Phase 33J §5 register, **re-issued / advanced** against the
§4 concrete evidence. Each is a **request** to the Straylight (`@loa/straylight`)
primitive owner; **none is answered as authoritative here**. The genuinely-unresolved
rows are **E, G, H, K, N, O**; the review-dependent / non-final row is **J**. The
**aligned-draft confirmation rows** (A candidate/`proposed` pre-admission vocabulary,
B/C lifecycle, D supersession, F signer, I fail-closed semantics, L
linkage, M denial) are restated as *concrete-shape confirmation* requests — the chain
now has a concrete synthetic shape Straylight can confirm-or-rename, rather than a
draft probe placeholder. Nothing here is marked *final*.

### 5.1 Unresolved rows (re-issued)

#### Row E — Recall eligibility representation *(unresolved)*

- **Precise question.** Is the Dixie `recall_eligible` **boolean** an acceptable
  public-safe *projection* of Straylight's recall-eligibility semantics, given that
  Straylight recall eligibility is **emergent** (computed by `dispositionFor`,
  `policy.ts:187-241`) and expressed as a four-member `RecallUseInstruction`
  (`usable` / `mark_as_contested` / `use_as_background_only` / `do_not_use_for_action`,
  `types.ts:427-442`) rather than a stored flag? Specifically: (a) confirm the
  boolean is a *projection*, not a coined stored primitive; (b) state the canonical
  mapping from the four `RecallUseInstruction` members to a public boolean (which map
  to "recallable"); (c) confirm the synthetic ledger's behavior — `active` ⇒
  `recall_eligible: true`, `superseded` ⇒ `recall_eligible: false` — is a faithful
  projection, or rename/re-relate it.
- **Concrete evidence.** Ledger: `recall_eligible` set `true` on the minted `active`
  assertion and `false` on the superseded prior
  ([`admitted-assertion-ledger.ts:793,877,883-888`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts));
  the internal recall projection includes only `active && recall_eligible`
  ([`:957-974`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)).
  Classifier: only `accept` / `supersede` are `recall_eligible`; pending / reject /
  malformed never are
  ([`classifier.ts:115-156`](../app/src/services/admission-wedge-spike/classifier.ts)).
- **Owner.** Straylight (instruction semantics) + Dixie (public boolean projection).

#### Row G — Tenant / estate / actor identity-binding vocabulary *(unresolved)*

- **Precise question.** Confirm which identifiers are **wedge primitives**
  (`estate_id`, `actor_id` — `types.ts:145-167`) versus **host-layer** (`tenant_id` —
  `host/tenancy.ts:1-57`), and confirm there is **no `subject_actor_id` primitive**
  (only `Assertion.subject_refs`). Specifically: (a) confirm `estate_id` is the wedge
  primitive the ledger's estate scope mirrors; (b) confirm `tenant_id` is host-layer
  (so the ledger's `(tenant_id, estate_id)` binding is a *spike isolation mechanism*,
  not final wedge semantics); (c) state the canonical caller-vs-subject identity
  vocabulary so a future production binding can be designed against it. Production
  identity binding is undefined (`identity_binding_final: false`).
- **Concrete evidence.** Ledger scope `{ tenant_id, estate_id }`, every access
  bound, foreign-tenant isolation fail-closed
  ([`admitted-assertion-ledger.ts:69-75,697-722`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts));
  explicitly documented as a **spike isolation mechanism, NOT final production
  binding**
  ([`:31-45`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts);
  route constants
  [`admission-intake.ts:100-110`](../app/src/routes/admission-intake.ts)). No
  tenant/estate/actor id ever reaches the public surface
  ([`no-leak.ts:22-50`](../app/src/services/admission-wedge-spike/no-leak.ts)).
- **Owner.** Straylight (`estate_id` / `actor_id`) + Dixie host (`tenant_id` /
  caller-envelope).

#### Row H — Receipt / audit vocabulary and public/private boundary *(unresolved)*

- **Precise question.** Map the Dixie receipt vocabulary to Straylight's canonical
  receipt primitives and resolve the **two-spelling debt**
  (`public_receipt_ref` vs `receipt_public_ref`) and the `audit_receipt` term.
  Specifically: (a) which Straylight primitive (`TransitionReceipt`
  `types.ts:364-388`, `RecallReceipt` `types.ts:469-489`, `AuditEvent`
  `types.ts:495-529`) does the synthetic `SyntheticAuditRecord` correspond to, if
  any; (b) pick **one** canonical public receipt field name; (c) confirm the
  public/private split — that `audit_private: true` / `public_audit_detail: false`
  records, transition ids, and private `receipt_ref`s must stay private, and that
  only a public-safe synthetic receipt reference may appear publicly.
- **Concrete evidence.** Synthetic audit record carries `audit_private: true` +
  `public_audit_detail: false` and a private `receipt_ref`, never serialized publicly
  ([`admitted-assertion-ledger.ts:110-130,646-660`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts));
  the public body carries only a fixed synthetic `public_receipt_ref` placeholder
  (or `null`)
  ([`public-response.ts:21-24,104`](../app/src/services/admission-wedge-spike/public-response.ts));
  `receipt_id` / `audit_receipt_ref` are forbidden public keys
  ([`no-leak.ts:41-42`](../app/src/services/admission-wedge-spike/no-leak.ts)).
- **Owner.** Straylight (receipt primitives) + Dixie (public projection).

#### Row K — Public / private projection boundary *(unresolved)*

- **Precise question.** Confirm the **canonical public-vs-private projection rule**
  for admission outcomes — what may *ever* leave the private boundary — so the Dixie
  runtime no-leak serializer can be designed against the canonical rule rather than
  against draft probe shapes and a mirrored denylist. Specifically: (a) confirm the
  category of fields that must never be public (raw candidate payload, source
  material, operational ids, tenant/estate/actor ids, idempotency keys,
  authority/signature material, private audit detail); (b) confirm the minimal
  public outcome surface (outcome class, public-safe scenario id, recall-eligibility
  projection, public-safe receipt reference, draft markers) is acceptable.
- **Concrete evidence.** The runtime no-leak guard's `FORBIDDEN_PUBLIC_KEYS` /
  substrings / patterns mirror the Phase 33L validator denylist
  ([`no-leak.ts:22-119,151-182`](../app/src/services/admission-wedge-spike/no-leak.ts));
  the public response is built purely from the classification + fixed synthetic
  placeholders
  ([`public-response.ts:90-116`](../app/src/services/admission-wedge-spike/public-response.ts)).
- **Owner.** Straylight (canonical rule) + Dixie (runtime serializer).

#### Row N — Corrected-active status vs. relationship *(unresolved)*

- **Precise question.** Confirm explicitly that "corrected active" is the **`active`
  member of a `(superseded, active)` relation** (`superseded` status +
  `supersedes_refs` + link type `supersedes`, `types.ts:93,157`, arch spec
  `:910-921`), **not** a standalone coined `corrected_active` status. Confirm the
  synthetic ledger's model — the corrected assertion is `active` (not a new status)
  and the prior moves to `superseded` — is the canonical relation, or re-relate it.
- **Concrete evidence.** `assertion_status: 'active' | 'superseded'` only — there is
  no `corrected_active` member; supersession sets the corrected assertion `active`
  with `supersedes_assertion_id`, and the prior `superseded` with
  `superseded_by_assertion_id`
  ([`admitted-assertion-ledger.ts:100-105,869-888`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)).
- **Owner.** Straylight.

#### Row O — Storage / audit primitive boundary *(unresolved)*

- **Precise question.** Confirm which records are **Straylight-substrate concerns**
  (assertion, transition, receipt, audit event, supersession relation — Straylight
  owns the *semantics*) versus **Dixie ingress/storage concerns** (candidate intake
  record, idempotency cache, refusal log), and confirm the **relationship to
  ADR-022E** (the held durable estate-store gate). Specifically: (a) state which of
  the synthetic ledger's record categories (`SyntheticAdmittedAssertion`,
  `SyntheticAuditRecord`, the replay-de-dup metadata) correspond to Straylight
  substrate semantics versus Dixie ingress storage; (b) confirm that any *durable*
  admission store is governed by ADR-022E and is **not** authorized by this review;
  (c) confirm the boundary so a future Dixie storage design (Phase 33K → Option E)
  can reference substrate semantics without baking draft vocabulary as final.
- **Concrete evidence.** Record categories
  ([`admitted-assertion-ledger.ts:90-130,361-370`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts));
  precedent-not-reuse boundary — mirrors only the *operational properties* of the
  Recall `BoundedEstateStore`, reuses no Recall code/type/adapter/schema, freezes no
  schema
  ([`:36-50`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)).
- **Owner.** Straylight (substrate semantics + ADR-022E) + Dixie (ingress storage).

#### Row J — Idempotency delegation boundary *(review-dependent / non-final)*

- **Precise question.** Confirm that **Straylight delegates endpoint idempotency to
  the host/Dixie** (`idempotency_key` does not exist in Straylight; delegated per
  ADR-026D §3.b), so that the **endpoint idempotency semantics are Dixie /
  endpoint-route-contract-owned**. Straylight is asked **only** to (a) confirm the
  delegation / primitive-compatibility boundary, and (b) confirm the synthetic
  ledger's spike-scoped replay/de-dup behavior (idempotent replay returns the prior
  result and mints nothing; conflicting replay fails closed) is *compatible* with the
  canonical transition primitives — **not** to own or finalize the endpoint keying
  (candidate-id vs header vs both), which remains Dixie-owned and undecided
  (`idempotency_final: false`).
- **Concrete evidence.** Spike-scoped replay key, fingerprint de-dup, replay-conflict
  fail-closed, all explicitly non-final
  ([`admitted-assertion-ledger.ts:147-154,265-282,729-766`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts));
  carried as the review-dependent row at
  [`classifier.ts:74`](../app/src/services/admission-wedge-spike/classifier.ts).
- **Owner.** **Dixie / endpoint route contract** (owns the semantics); Straylight
  (confirms delegation / primitive compatibility only).

### 5.2 Aligned-draft confirmation rows (concrete-shape confirmation)

These rows were **aligned draft** in Phase 33J §6 (the Dixie term mirrors a confirmed
Straylight primitive, pending Admission-scoped confirmation) — including row **A**
(candidate / `proposed` pre-admission vocabulary) and row **I** (fail-closed
semantics), restated here as **confirmation / alignment rows** and explicitly **not
production-final**. They are restated **only** as confirmation requests against the
concrete synthetic shape — they are **not** newly unresolved, and the production
*semantics* they feed (signer/authority → U6) remain independent unresolved gates
regardless of vocabulary alignment. **One inline exception:** the `assertion_superseded`
audit-event name in row C is a Dixie synthetic-ledger term **absent from the current
Straylight `AuditEventType`** (which carries `assertion_admitted` and
`transition_denied`, but **no** `assertion_superseded`), so for that term row C is a
genuine *accept / rename / re-relate* vocabulary question, **not** an already-aligned
confirmation.

| Row | Confirm against concrete evidence | Concrete evidence |
|-----|-----------------------------------|-------------------|
| **A. Candidate / `proposed` pre-admission vocabulary** *(confirmation / alignment — not production-final)* | Confirm `proposed` is the canonical pre-admission **status** and that `CandidateAssertion` is the pre-admission **object** — i.e. there is **no bare `candidate` status** — so the synthetic ledger's `pending` ⇒ `accepted_as_proposed` outcome (the `proposed`-state scenario, no transition) faithfully mirrors the canonical pre-admission shape, or re-relate it. *(Phase 33J row A; Straylight-owned; was "aligned draft, requires review", not production-final.)* | Pending scenario classifies to `outcome_class: 'accepted_as_proposed'` with no admitted assertion minted and `recall_eligible: false` ([`classifier.ts:116-123`](../app/src/services/admission-wedge-spike/classifier.ts)); the dev-spike intent for it is the draft `none_candidate_write_only_draft` ([`classifier.ts:39-40`](../app/src/services/admission-wedge-spike/classifier.ts)). Straylight `CandidateAssertion` `types.ts:551-565`; `AssertionStatus.proposed` `types.ts:86-94`. |
| **B. Admitted lifecycle** | Confirm the admitted status is canonically `active` and there is **no bare `admitted` status** (`admitted` is a public outcome label only). | Ledger mints `assertion_status: 'active'`; the public `outcome_class` is `admitted` ([`admitted-assertion-ledger.ts:100,792-793`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts); [`classifier.ts:94-99,124-131`](../app/src/services/admission-wedge-spike/classifier.ts)). |
| **C. Transition vocab** | Confirm `admit_assertion` (transition) and `assertion_admitted` (audit event) are canonical. **`assertion_superseded` is a Dixie synthetic-ledger term absent from the current Straylight `AuditEventType`** (`assertion_admitted` and `transition_denied` are present; `assertion_superseded` is **not**) — so this term is **not** classified as aligned/canonical: Straylight is asked to **accept, rename, or re-relate** it (e.g. to an existing event such as `assertion_linked` plus a `superseded` status transition, or to coin it). | Audit event `assertion_admitted` is canonical ([`admitted-assertion-ledger.ts:123,797`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)); the synthetic-ledger `assertion_superseded` ([`:890`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)) has **no** counterpart in Straylight `AuditEventType` (`src/straylight/types.ts:495-512`, read read-only against the possibly-stale checkout per §2 — `assertion_admitted` / `transition_denied` present, `assertion_superseded` absent). |
| **D. Supersession relation** | Confirm `(superseded, active)` is a relation/direction with `supersedes_assertion_id` / `superseded_by_assertion_id`, not a coined status (paired with row N). | Supersession ref fields ([`admitted-assertion-ledger.ts:102-105,869-888`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)). |
| **F. Signer / authority** | Confirm `policy_service` is a canonical `SignerType` member and **which signer roles may authorize `admit_assertion`**; the Dixie `authority_*_draft` **field names** stay draft and are **not** production auth. *(Production signer/authority semantics — U6 — remain an independent unresolved gate.)* | `SignerType` incl. `policy_service` `types.ts:122-130`; the spike implements **no** signer/authority binding — `authority_signer_type_draft` / `authority_scope_draft` are forbidden public keys ([`no-leak.ts:45-46`](../app/src/services/admission-wedge-spike/no-leak.ts)). |
| **I. Fail-closed semantics** *(confirmation / alignment — not production-final)* | Confirm the canonical fail-closed meaning (class-validation failure ⇒ `rejected_candidate`; policy denial ⇒ `denied_transition` receipt) and confirm that the Dixie ingress fail-closed behavior — a malformed/unsafe/unsupported shape collapsing to a single stable, public-safe `ingress.invalid_request` refusal that never reveals the hidden reason — is a faithful ingress projection of that canonical meaning, or re-relate it. The Dixie refusal-family code stays a **draft ingress reuse**, not a coined canonical primitive. *(Phase 33J row I; Straylight primitive + Dixie ingress; was "aligned draft, may proceed as route-design draft only", not production-final.)* | Malformed scenario classifies to `outcome_class: 'refused'`, HTTP 400, reusing the existing Dixie-local `ingress.invalid_request` code; a genuinely unsupported shape **throws** and the handler collapses it to the **same** public-safe refusal ([`classifier.ts:61-64,148-161,185-195`](../app/src/services/admission-wedge-spike/classifier.ts)). Straylight `rejected_candidate` / `denied_transition` (arch spec `:856-884`). |
| **L. Candidate→assertion linkage** | Confirm the candidate → transition → assertion linkage semantics; the Dixie ref **field names** (`source_candidate_id` / `admission_transition_id` / `admitted_assertion_id`) stay draft. | Linkage fields on the synthetic records ([`admitted-assertion-ledger.ts:94-99,119-127`](../app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts)). |
| **M. Denial taxonomy** | Confirm denial is an **explicit** denied transition (audit `transition_denied`, kind `denied` receipt), not a coined `rejected` status; the Dixie draft uses a clearly non-final `*_draft_non_final` reason code. | Reject classification + draft denied reason code `admission_transition_denied_draft_non_final` ([`classifier.ts:66-68,132-139`](../app/src/services/admission-wedge-spike/classifier.ts)). |

> **None of §5 is resolved here.** This section is a request register grounded in
> concrete evidence. The answers (or explicit, governance-recorded deferrals) are the
> exit criteria for treating any term as non-draft, and are the input to the future
> Phase 33U review-response intake / lane-decision gate (§10).

---

## 6. Cross-repo ownership separation

This handoff respects the standing ownership posture; **no repo owns another repo's
final contract**. The three boundaries are kept distinct so the review request lands
in the right ownership:

- **Straylight (`@loa/straylight`) — primitive / substrate vocabulary.** The
  canonical assertion-lifecycle (`AssertionStatus`, `admit_assertion`,
  `superseded`), recall-eligibility (`RecallUseInstruction`, emergent
  `dispositionFor`), signer/keyring (`SignerType`, `policy_service`), receipt/audit
  (`TransitionReceipt`, `RecallReceipt`, `AuditEvent`), and storage-adapter
  semantics — and the §5 review answers — are Straylight's to confirm, rename,
  re-relate, or defer. The durable estate store is gated by ADR-022E (held); route
  guardrails by ADR-026C / ADR-026D — all Straylight-repo decision records. This
  follow-up is a **request into Straylight's ownership**; Dixie may consolidate and
  advance it but may **not** coin canonical vocabulary or pretend to have performed
  the review.
- **Dixie (loa-dixie) — endpoint route contract / wire behavior.** Dixie owns the
  HTTP/BFF ingress seam (the dev/operator-only `POST /api/admission/intake` spike,
  the route contract draft, tenant/estate binding *as a spike isolation mechanism*,
  the **endpoint idempotency semantics** — §5 row J, refusal mapping, no-leak
  projection). Dixie does **not** own the canonical assertion-lifecycle vocabulary
  and must not coin or freeze it. **Endpoint idempotency is Dixie-owned**; Straylight
  is asked only to confirm the *delegation / primitive-compatibility* boundary, never
  to own the final endpoint keying.
- **Freeside Characters (freeside-characters) — client / Discord integration.** The
  45-series mirror/adapter is test-only, not exported, not runtime-wired, with no
  live Dixie call; 45J Option C (live client) is **Blocked**. Freeside owns whether
  and how a client binds to a Dixie contract — and only to an *accepted* one. This
  follow-up authorizes **no** Freeside runtime/client change and does **not** hand a
  client contract to Freeside; Freeside review / client-contract work remains
  **deferred** until the Dixie route/client contract is accepted enough to hand off
  (Phase 33S Option C / Option F framing —
  [`ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md:404-477`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)).

---

## 7. What Dixie is asking Straylight to decide — and not

**Dixie IS asking Straylight to:**

- confirm, rename, re-relate, or explicitly defer the §5 review rows (the
  genuinely-unresolved E, G, H, K, N, O and the review-dependent J), grounded in the
  concrete Phase 33N route surface and Phase 33Q ledger;
- confirm the aligned-draft concrete-shape rows (§5.2 — lifecycle status, transition
  vocab, supersession relation, signer membership, linkage, denial taxonomy) against
  the synthetic shape the chain has produced;
- confirm the **idempotency delegation / primitive-compatibility boundary** (row J) —
  i.e. that endpoint idempotency is delegated to the host/Dixie;
- record which Dixie draft terms may remain **app-local draft vocabulary** versus
  which **must change** to conform to canonical primitives.

**Dixie is NOT asking Straylight to:**

- implement Dixie route code, the route handler, or the route contract;
- **own the endpoint idempotency semantics** — those are Dixie / endpoint
  route-contract-owned (Straylight confirms the delegation only, §5 row J);
- authorize production / durable Admission Wedge storage (durable storage remains
  gated by ADR-022E, held);
- authorize a public `remember-this`, Discord ingestion, user chat becoming memory,
  or Freeside Characters runtime/client integration;
- bless the Phase 33E probes, the Phase 33G route contract, or any draft vocabulary
  as a **final / production schema**;
- make a **production-readiness** claim — resolving the review **does not** by itself
  clear the independent ADR-022E durable-store, production auth/consent, or final
  route-contract gates (§4.3, §8).

---

## 8. What remains blocked regardless of this handoff

Phase 33T is a docs/decision-only cross-repo review request. It authorizes none of
the following; each remains **blocked** whether or not a Straylight response arrives:

- production admission;
- durable production Admission Wedge storage;
- DB writes;
- production database migrations;
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
- final idempotency semantics (Dixie / endpoint-owned; undecided);
- production signer / authority semantics;
- production tenant / estate / actor identity binding;
- a final route contract (Phase 33G remains a *draft design*);
- route-spike re-authorization (33M already authorized the now-accepted spike; this
  gate does not widen it);
- production implementation readiness.

This gate also explicitly does **not**:

- mutate the Phase 33E probe JSONs, the Phase 33L route-vector JSONs, or either docs
  validator;
- mutate the Phase 33N route handler, the Phase 33Q ledger module, or any spike
  service module / test;
- change any config, env, package, lockfile, CI, or generated file;
- wire the Phase 33Q ledger into `server.ts` or add any env flag
  ([`app/src/server.ts:630-646`](../app/src/server.ts) remains ledger-free);
- claim the Straylight primitive review is performed, answered, or complete;
- claim that resolving the Straylight review alone makes production admission ready;
- claim Straylight owns the endpoint idempotency semantics.

> **On scope-expansion.** If a later phase reaches for anything in the blocked list,
> it must re-open the Phase 33E probe artifacts, the Phase 33F readiness gate, the
> Phase 33G design (as corrected by 33H), the Phase 33H acceptance gate, the Phase
> 33I decomposition gate, the Phase 33J review gate, the Phase 33K precondition design
> gate, the Phase 33L test-vector draft, the Phase 33M authorization gate, the Phase
> 33O route-spike acceptance gate, the Phase 33P storage/receipt hardening gate, the
> Phase 33R bounded-ledger acceptance gate, the Phase 33S decomposition gate, this
> follow-up, and the relevant Straylight decision records (ADR-022E durable-store
> gate; ADR-026C / ADR-026D route guardrails) first; it must not silently expand
> scope.

---

## 9. Expected Straylight-side response shape

This follow-up is a **request** into Straylight's ownership; the response belongs to
the Straylight repo and is not authored here. The expected (recommended) shape of a
Straylight-side response — which the future Phase 33U review-response intake gate
would consume — is:

1. **Per-area disposition.** For each §5 row, one of: **accepted vocabulary** (the
   Dixie draft term/shape conforms — keep it), **rejected vocabulary** (the term must
   change — state the canonical term), **delegated-to-Dixie** (the concern is
   host/endpoint-owned — confirm the delegation boundary), or **unresolved / deferred**
   (explicitly recorded as out of scope or pending, with a reason).
2. **Specific answers to the unresolved rows.** Direct answers (or explicit
   deferrals) to rows **E** (recall-eligibility projection), **G** (tenant/estate/actor
   binding), **H** (receipt/audit vocabulary + public/private split), **K**
   (public/private projection rule), **N** (corrected-active = `active` member of the
   `(superseded, active)` relation), **O** (storage/audit primitive boundary +
   ADR-022E relationship), and the review-dependent **J** (idempotency delegation /
   primitive-compatibility — confirming endpoint idempotency is Dixie-owned).
3. **Concrete-shape confirmations.** Confirm-or-rename the §5.2 aligned-draft /
   confirmation rows (**A** candidate/`proposed` pre-admission vocabulary, B/C/D/F,
   **I** fail-closed semantics, L/M) against the synthetic ledger's
   `accepted_as_proposed` / `active` / `superseded` model, the `ingress.invalid_request`
   fail-closed refusal, the `recall_eligible` flag, the `SyntheticAuditRecord`, and the
   linkage fields. **One term inside row C requires an explicit accept/rename/re-relate
   answer, not a confirmation:** `assertion_superseded` is a Dixie synthetic-ledger
   audit-event term **absent from the current Straylight `AuditEventType`**
   (`assertion_admitted` / `transition_denied` are present); state whether to accept,
   rename, or re-relate it.
4. **Required ADR references.** Any **ADR-022E** (durable estate store),
   **ADR-026C / ADR-026D** (route guardrails / idempotency delegation) references the
   answers depend on, so the Dixie side can cite them precisely.
5. **No production implementation claim.** The response must **not** imply that
   answering the review authorizes Dixie production admission, durable storage,
   production auth/consent, a final route contract, or any Freeside runtime
   integration — unless each lane is **separately authorized by its owning repo**
   and the applicable decision records. Straylight decisions can govern only
   Straylight-owned substrate concerns; they cannot authorize Dixie
   endpoint/auth/consent decisions or Freeside runtime integration. Answering the
   vocabulary review clarifies the *design*; it does not clear the independent
   production gates (§4.3, §8).

If **no Straylight response exists** when the next Dixie lane runs, the future Phase
33U gate must **not** invent answers (§10).

---

## 10. Decision: next Dixie lane

> **Selected: Phase 33U — Admission Wedge Straylight primitive-review response
> intake / lane-decision gate (docs / decision-only).**

**Reason:**

- Phase 33T is a **request**; it advances the Straylight review but does not — and
  cannot — answer it (the answers are Straylight-owned, §6, §7). The natural next
  Dixie lane is the one that **intakes** a Straylight-side response and decides what
  it unblocks.
- Phase 33U is **docs/decision-only** and should run **only after a Straylight-side
  response exists** (an accepted/rejected/delegated/deferred disposition per §9). If
  no response exists, Phase 33U must **not** invent answers, must **not** treat the
  absence as a resolution, and should either wait or record the continued-unresolved
  state — keeping `straylight_primitive_review_complete: false` everywhere.
- Once a response (or explicit, governance-recorded deferral) arrives, Phase 33U
  reconciles it into the review register and decides the lane after it — most likely
  the documented **D→E follow-on** (finalize the Phase 33K storage/auth/consent
  design against the confirmed vocabulary —
  [`ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md:523-533`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)),
  while the independent ADR-022E durable-store, production auth/consent, and final
  route-contract gates each remain to be cleared on their own.
- **Production implementation remains far too early** — every implementation lane is
  blocked (§8) and no final schema is frozen (§4.3).

**Provisional phase label.** The follow-on lane is provisionally labelled **Phase
33U**. The label is for ordering only; the actual response-intake content belongs to
that future, separately-gated docs/decision phase and is **not** designed here. No
route, store, migration, auth, consent, public surface, Freeside wiring, package
export, or schema freeze is selected, scheduled, or authorized under any option.

---

## 11. Acceptance criteria for Phase 33T

Phase 33T succeeds if and only if:

1. **Docs/decision-only** — it creates the Phase 33T follow-up doc and at most
   minimal cross-reference status notes, and changes **no** source, test, route,
   store, migration, auth, consent, validator, probe/fixture/vector JSON, config,
   env, package, lockfile, CI, or generated file.
2. **Consolidated, evidence-grounded re-issue (full A–O register)** — it re-issues /
   advances **every** row of the Phase 33J §5 fifteen-item register (A–O): the
   genuinely-unresolved rows (E, G, H, K, N, O) and the review-dependent row (J) in
   §5.1, and the aligned-draft / confirmation rows (**A** candidate/`proposed`
   pre-admission vocabulary, B, C, D, F, **I** fail-closed semantics, L, M) in §5.2 —
   each grounded in the **concrete** Phase 33N route surface and Phase 33Q ledger with
   `file:line` citations (§4, §5). Rows **A** and **I** are present as **confirmation /
   alignment** rows (Phase 33J labelled them "aligned draft", **not** production-final),
   not as production-final claims.
3. **Per-row disposition request** — for each row it asks Straylight to confirm,
   rename, re-relate, or explicitly defer, and records which Dixie draft terms may
   remain app-local draft versus which must change (§5, §9). In particular, the
   `assertion_superseded` audit-event name (row C) is **not** asserted as aligned or
   canonical: it is flagged as a Dixie synthetic-ledger term **absent from the current
   Straylight `AuditEventType`** and posed as an explicit accept/rename/re-relate
   question (§5.2, §9).
4. **No resolution claim** — it does **not** assert the review is complete;
   `straylight_primitive_review_complete` stays `false` everywhere; it does **not**
   claim the review alone clears production admission, and it does **not** claim
   Straylight owns endpoint idempotency (§1, §7).
5. **Ownership separated** — Straylight-owned primitive vocabulary, Dixie-owned
   endpoint route contract / wire behavior, and Freeside-owned client/Discord
   integration are kept distinct (§6).
6. **Expected response shape defined** — it states the accepted/rejected/
   delegated/unresolved disposition shape, the specific rows requiring answers, the
   required ADR references, and the no-production-implementation-claim constraint
   (§9).
7. **Preserves every blocked lane** — it authorizes no production / durable / public
   / Freeside / package / schema-freeze lane and selects no production rollout (§8).
8. **Next lane selected** — it selects a docs/decision-only Phase 33U review-response
   intake / lane-decision gate that runs only after a Straylight response exists and
   invents no answers if none does (§10).
9. **Validators stay green** — the Phase 33E fixture validator and the Phase 33L
   route-vector validator both pass unchanged (§12).

---

## 12. Validation requirements

Phase 33T is docs/decision-only; its validation is that it changed **nothing
executable** and that the two docs validators stay green. The phase succeeds only if
all of the following hold:

- `git status --short --branch --untracked-files=all` shows **only** the new Phase
  33T follow-up doc and the minimal cross-reference status notes (§13) — no source,
  test, validator, probe, fixture, vector, config, env, package, lockfile, CI, or
  generated file;
- `git diff --name-status` and `git diff --stat` confirm the edits are confined to
  `docs/` Markdown;
- `git diff --check` is clean (no whitespace errors / conflict markers);
- the Phase 33E fixture validator stays green —
  `node docs/admission-wedge/fixtures/validate-fixtures.mjs` reports **5/5 probes
  valid, 0 failures**;
- the Phase 33L route-contract test-vector validator stays green —
  `node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  reports **5/5 vectors valid, 0 failures, no sixth vector**;
- a **docs-only scope check** confirms no application-code (`src/`, `app/`, `lib/`),
  config, env, or generated path is touched;
- a **new-file whitespace check** on the created doc is clean;
- nothing is staged or committed by this phase (the branch's commit/merge is a
  separate, explicitly-authorized step).

---

## 13. Cross-references

> **Phase 33U status note (added later).** Phase 33U
> ([`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md))
> is the **docs/decision-only Straylight primitive-review response intake /
> lane-decision gate** this follow-up selected as the next lane (its §10). Straylight
> answered this review request in **`loa-straylight` PR #65 (merged)** —
> `loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md`. Phase 33U
> **intakes** that response and reconciles the A–O dispositions using **only** the
> response's accepted / rejected / delegated / unresolved verdicts: A, B, D, I, L, M,
> N accepted; C accepted except **`assertion_superseded` rejected / re-related**
> Dixie-locally to `assertion_linked` + `superseded` status; E/G/H/J/K carry
> delegated-to-Dixie projections (recall-eligibility boolean, `tenant_id` binding,
> `public_receipt_ref`, **endpoint idempotency Dixie-owned**, no-leak serializer); F
> production authority, G production identity binding, J final endpoint keying, and O
> durable store (**ADR-022E gate #8 held**) remain independent unresolved production
> gates. It records that resolving the review **does not** make production admission
> ready, flips **no** runtime marker (`straylight_primitive_review_complete` stays
> `false`), and selects **Phase 33V** (storage/auth/consent design-finalization
> follow-on — the documented D→E follow-on; docs/decision-only). It mutates **no**
> probe / validator / fixture / vector / source and keeps every implementation lane
> **blocked**.

- [`docs/ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)
  — Phase 33S decomposition gate that **selected this Option-D lane** (its §6–§7
  analysis, §7 D→E follow-on, §11 recommended acceptance criteria). Its §4 evidence
  consolidation and §5 unresolved table (U1–U9) seed §4 and §8 here. **Gains a
  minimal Phase 33T status note.**
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)
  — Phase 33J Straylight primitive-review request gate; its §5 fifteen-item register
  (A–O), the genuinely-unresolved rows (E, G, H, K, N, O), and the review-dependent
  row (J) are the register this follow-up re-issues/advances. Read-only here; **not
  modified**.
- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I decomposition gate; the first decomposition gate, structural ancestor
  of the 33S gate that selected this lane. **Gains a minimal Phase 33T status note.**
- [`docs/ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)
  — Phase 33R bounded-ledger acceptance gate; its §4 proven list grounds §4.2 and its
  §9 Options A–F are the decision space 33S analysed. Read-only here; **not
  modified**.
- [`docs/ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md)
  — Phase 33O route-spike acceptance gate; its §4 proven list grounds §4.1.
  Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)
  — Phase 33P storage/receipt hardening decision gate; its Option B selection /
  Option D rejection and ADR-022E (held) note ground §4.3 / §5 row O / §8. Read-only
  here; **not modified**.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K storage/auth/consent precondition design gate; the design the
  documented **D→E** follow-on (a future lane after Phase 33U) would finalize against
  the returned review answers. Read-only here; **not modified**.
- [`docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`](admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md)
  — the Phase 33Q dev-store runbook; the operational source-of-truth for the ledger's
  bounded, process-local, non-durable, fail-closed, test-seam-only nature. Read-only
  here; **not modified**.
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md) /
  [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the Phase 33E draft v1 probes and their validator; the `*_final:false` markers
  (and `straylight_primitive_review_complete:false` enforcement at `:265-272`) ground
  §4.3. Read-only; **not modified**.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md) /
  [`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs)
  — the Phase 33L route-vector fixtures and validator; the `route_contract_final:false`
  markers ground §4.3. Read-only; **not modified**.
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/` (`admitted-assertion-ledger.ts`,
  `classifier.ts`, `public-response.ts`, `no-leak.ts`, `auth-gate.ts`, `index.ts`),
  and `app/src/server.ts` (`:630-646`) — the Phase 33N spike and Phase 33Q ledger,
  inspected **read-only** to ground §4–§5 (default-off route, dedicated header,
  fail-closed auth, five-scenario shape, no-leak guard, the `active`/`superseded`
  status model, `recall_eligible` flag, `SyntheticAuditRecord`, replay behavior,
  carried-forward unresolved rows at `classifier.ts:73-74`, and the ledger-free
  server mount). **None is modified by this phase.**
- `@loa/straylight` — canonical primitive/substrate owner of the assertion
  lifecycle, recall-eligibility, signer/keyring, receipt/audit, and storage-adapter
  vocabulary, read-only in `../loa-straylight`. **No completed Straylight
  Admission-Wedge primitive review was found** (33J §4); E, G, H, K, N, O remain
  unresolved and J review-dependent; the durable estate store is gated by ADR-022E
  (held); route guardrails by ADR-026C / ADR-026D. The local checkout may be stale.
  **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (**verified merged on GitHub**
  2026-06-06) — the cross-repo acceptance; its mirror/adapter proof is a pure,
  fixture-bound semantic mapping layer with **no live Dixie call**, test-only, not
  exported, not runtime-wired. **Not edited by this phase.**
