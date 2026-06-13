# Phase 33S — Admission Wedge Route-Spike + Bounded-Ledger Acceptance Decomposition Gate

> **Phase**: 33S
> **Branch context**: `phase-33s-admission-decomposition-gate`
> **Related**: Dixie Phase 33A–33R (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle, signer/keyring, receipt/audit,
> and storage-adapter primitives
> **Status**: **docs / decision-only.** No source, test, route, route handler,
> storage, store code, DB write, migration, auth, consent, validator,
> probe/fixture/vector JSON, config, env, package, lockfile, CI, generated, or
> live-integration change.
> **This is a decomposition / lane-ordering gate, not implementation.** With the
> Admission Wedge **route surface** accepted (Phase 33O, on the Phase 33N spike)
> and the **synthetic stateful effect** accepted (Phase 33R, on the Phase 33Q
> bounded ledger), the next step is genuinely a *decision* among materially
> different lanes — not an obvious build. This gate reads the combined 33N/33O
> route-spike and 33Q/33R bounded-ledger evidence **read-only**, decides which of
> the Phase 33R §9 Options A–F is the safest next lane, and stops. It changes
> **no** routes, route handlers, storage, store code, auth, consent, probes,
> validator, fixtures, vectors, runtime behavior, or production schema, and it does
> **not** freeze a final/production schema, finalize the route contract, complete
> the Straylight primitive review, or authorize any production / durable / public
> lane.

This document is the Dixie-side **decomposition gate** that Phase 33R / PR #136
selected as the next lane
([`ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md:592-594`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)).
Phase 33R accepted the Phase 33Q bounded synthetic admitted-assertion ledger
**only** as a bounded, non-production, test-seam-only proof, named six plausible
next lanes (its §9 Options A–F), and observed that choosing among them "is a real
decision with materially different risk profiles"
([`:602-631`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)). Phase 33S
executes exactly that charter: it consolidates what the two accepted layers now
prove, inventories what remains unresolved, explains why route-surface +
synthetic-ledger evidence still does **not** constitute production admission,
analyses Options A–F, **selects the next lane**, records the rejected lanes and
why, and preserves every blocked lane. It designs no envelope, implements no
route, mutates no probe/validator/fixture/vector, builds no store, and authorizes
no live behavior, route spike, or storage.

Every assessment below is grounded **read-only** against the actual Dixie repo
(the merged Phase 33N route spike and Phase 33Q ledger, their config/server
wiring, the draft fixtures/vectors and their validators) and the prior docs chain
(33I/33J/33K/33M/33O/33P/33R). Where a claim could not be grounded inside the read
material — notably the Straylight-repo decision records and the freeside-characters
merge state — it is flagged.

> **This phase does not complete the Straylight primitive review.** Phase 33J
> issued the §5 review register (A–O) and **confirmed no completed Straylight
> Admission-Wedge primitive-review artifact exists**; the genuinely-unresolved rows
> (E, G, H, K, N, O) and the review-dependent/non-final row (J) remain open. Phases
> 33K–33R carried them forward unchanged — in code,
> `ADMISSION_SPIKE_UNRESOLVED_ROWS = ['E','G','H','K','N','O']` and
> `ADMISSION_SPIKE_REVIEW_DEPENDENT_ROWS = ['J']`
> ([`app/src/services/admission-wedge-spike/classifier.ts:73-74`](../app/src/services/admission-wedge-spike/classifier.ts),
> surfaced on every public response at
> [`public-response.ts:112-113`](../app/src/services/admission-wedge-spike/public-response.ts)) —
> and Phases 33O/33P/33R kept them unresolved. This gate keeps them unresolved; it
> selects a lane that **re-issues / advances** that review handoff, but it does
> **not** perform, answer, or claim to complete the review.

---

## 1. Phase title, status, and scope

- **Phase 33S — Admission Wedge route-spike + bounded-ledger acceptance
  decomposition gate.**
- Dixie-side **docs / decision-only**.
- Follows Dixie Phase 33R / PR #136 (bounded admitted-assertion ledger acceptance /
  hardening gate, commit `ae93ad3d`) and Phase 33Q / PR #135 (dev-only bounded
  synthetic admitted-assertion ledger implementation, commit `6d6f07f6`), and sits
  one rung above both the Phase 33O route-spike acceptance gate and the Phase 33R
  bounded-ledger acceptance gate on the Dixie Admission Wedge ladder.
- This is a **decomposition / lane-ordering gate**, not an acceptance gate (33O and
  33R already accepted the route surface and the synthetic ledger), not route or
  store implementation, and not a route-spike authorization (33M already authorized
  the now-implemented spike).
- It **selects the next safe lane** among the Phase 33R §9 Options A–F (§6, §7).
- It changes **no** routes, route handlers, storage, store code, auth, consent,
  validators, probes, fixture/vector JSON, source code, configuration, env,
  package files, lockfiles, CI, or production schema.
- It does **not** freeze a final/canonical/production schema, **finalize the route
  contract** (Phase 33G remains a draft design), **complete the Straylight
  primitive review** (A–O remain unresolved), or finalize idempotency / signer /
  authority / tenant-estate-actor identity-binding semantics.
- It does **not** mutate the Phase 33N route handler, the Phase 33Q ledger module,
  the spike service modules, their tests, the Phase 33E probe JSONs, the Phase 33L
  route-vector JSONs, or either docs validator. Per the Phase 33D §6 invariant —
  any probe/validator/fixture/vector mutation requires its own separately-gated
  phase — Phase 33S inspects all of them **read-only**.
- It does **not** authorize anything: not production admission, durable Admission
  Wedge storage, DB writes, migrations, production auth/consent, a public
  `remember-this`, Discord command/history ingestion, user chat becoming memory,
  Freeside Characters runtime/client integration, package exports, a final schema
  freeze, production route deployment, a completed Straylight primitive review,
  final idempotency semantics, production signer/authority semantics, or production
  tenant/estate/actor identity binding (§5, §8).

The audience for this document is **future Dixie phases** (the lanes named in §5–§7
and §11), the **Straylight (`@loa/straylight`) primitive/vocabulary owner** (whose
A–O answers remain the gating production exit criteria — §3, §6, §10), and
**freeside-characters** as an interested-but-blocked downstream consumer (§8, §10).

---

## 2. Source chain

This gate introduces no new contract material and freezes nothing. It decomposes
the *decision* Phase 33R deferred to it (its §9 Options A–F) and orders the next
lane. It is the **second decomposition gate** on the Admission Wedge ladder,
structurally mirroring the Phase 33I implementation-readiness decomposition gate
that ordered the 33J→33N lanes the chain has since executed.

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33I | #127 | Implementation-readiness **decomposition** gate — ordered the blockers into lanes (33J → 33K → 33L → 33M → 33N); defined the evidence required before any route handler; selected 33J. ([`ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)) |
| 33J | #128 | Straylight primitive-review **request** / vocabulary-dependency gate — issued the §5 fifteen-item review register (A–O); flagged genuinely-unresolved rows **E, G, H, K, N, O** and review-dependent/non-final row **J**. **Did not complete the review** (no completed Straylight Admission-Wedge primitive-review artifact exists). ([`ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)) |
| 33K | #129 | Storage/auth/consent precondition **design** gate — designed (on paper) draft storage record categories, service-auth and consent model *options*, a dev/operator-only scope option, an idempotency precondition, a no-leak posture, and a threat model; carries A–O as exit criteria. **Implemented no storage/auth/consent.** ([`ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)) |
| 33L | #130 | Route-contract **test-vector fixture draft** — converted the Phase 33G §16 design vectors (A–E) into five non-runtime route-contract test-vector fixtures plus a Node-built-ins-only validator; carries the unresolved markers forward. **Implemented no runtime route tests and no route.** |
| 33M | #131 | Dev/operator-only route-spike **authorization** gate — authorized (did not implement) the Phase 33N spike under strict §7–§15 constraints; its §7 storage posture names **Option A (preferred) / Option B (acceptable, env-gated synthetic bounded store) / Option C (production-like, *not* authorized)**. ([`ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)) |
| 33N | #132 | Dev/operator-only route-spike **implementation** (commit `f44dd702`) — implemented the disabled-by-default `POST /api/admission/intake` route spike on **Storage Option A (no durable storage)**, the spike service modules, the gated config/server wiring, the env docs, the dev-spike runbook, and the spike tests. **Authorized no production admission, durable storage, production auth/consent, Freeside integration, or package export.** (`app/src/routes/admission-intake.ts`; `app/src/services/admission-wedge-spike/`) |
| 33O | #133 | Route-spike **acceptance** gate (commit `db14ab40`) — accepted Phase 33N **only** as a bounded, disabled-by-default, dev/operator-only route spike for MVP 2; stated it does **not** complete MVP 2; selected Phase 33P. ([`ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md)) |
| 33P | #134 | Storage / receipt hardening **decision** gate (commit `0e97758a`) — selected **Option B** for a possible future Phase 33Q (dev-only bounded synthetic admitted-assertion store); **rejected Option D** (production-like durable storage); defined the §9 proof cases, §10 receipt/audit and §11 no-leak hardening, and §12 non-final idempotency/signer/authority/binding caveats; selected Phase 33Q. **Implemented no store.** ([`ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)) |
| 33Q | #135 | Dev-only bounded synthetic admitted-assertion **ledger implementation** (commit `6d6f07f6`) — implemented a bounded, process-local, Map-backed, synthetic-only, tenant+estate-scoped, capacity-bounded, non-durable, fail-closed admitted-assertion ledger as a **route-DI / test-seam-only** instrument; proved the §9 proof cases over synthetic state behind the existing default-off gate. **`server.ts` not wired; no env flag added; no package export.** (`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`; [`docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`](admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md)) |
| 33R | #136 | Bounded-ledger **acceptance / hardening** gate (commit `ae93ad3d`) — accepted Phase 33Q **only** as a bounded, non-production, test-seam-only synthetic ledger proof for MVP 2; stated it does **not** complete MVP 2; named the §9 Options A–F; selected **this Phase 33S decomposition gate**. ([`ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)) |
| **33S** | *(this doc; docs/decision-only — not committed/merged yet)* | **Route-spike + bounded-ledger acceptance decomposition gate — consolidates the 33N/33O + 33Q/33R evidence, analyses Options A–F, and selects the next lane (Option D — Straylight primitive-review follow-up); rejects production rollout; preserves every blocked lane.** |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter track `dixie_admission_wedge_probe_v1`, **test-only**; v0 fails closed as `unknown_probe_version`. The adapter is a **pure, fixture-bound semantic mapping layer with no live Dixie call**. |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded test-only purpose; authorizes no live client, no package export, no runtime wiring; confirms **live Dixie calls: absent**. **Verified MERGED on GitHub (merged 2026-06-06).** |

> **Grounding note on the 45J / PR #177 citation.** Per the Phase 33H–33R grounding
> notes, GitHub confirms freeside-characters **PR #177 is MERGED** (merged
> 2026-06-06). The local `../freeside-characters` checkout is **stale** for PR
> status (it sits on the PR-head branch, not the merge); GitHub's merged state — not
> the local tree — remains authoritative for PR status. The Phase 33N spike and the
> Phase 33Q ledger perform **no** Freeside import or call, so this cross-repo state
> is unchanged context, not a dependency of this gate.

### Straylight (`@loa/straylight`)

The canonical primitive/substrate owner of the assertion-lifecycle,
signer/keyring, receipt/audit, and storage-adapter vocabulary. Read-only in
`../loa-straylight`. **No Straylight artifact naming an "admission wedge",
"assertion intake", or admission route/endpoint was found** (carried from 33J §2 /
33K §2 / 33M §2 / 33O §2 / 33P §2 / 33R §2); the local checkout may be stale. This
gate treats the §5/A–O review register as **unresolved**, exactly as Phases 33J–33R
did, and notes that the **durable estate store is gated by ADR-022E (held)** and
route guardrails by ADR-026C / ADR-026D (Straylight-repo decision records cited by
the Dixie chain; the IDs are real, not fabricated).

> **Cross-repo phase-numbering caution.** Dixie's 33-series and the
> freeside-characters 45-series are independent labels in separate repositories
> and must not be conflated; Dixie Phase 33A §9 listed cross-repo phase numbering
> as an **open** reconciliation item that no later phase has resolved.

---

## 3. Purpose

Phase 33S exists because Phase 33R did three things and deliberately stopped:

- Phase 33R **accepted Phase 33Q only as a bounded, non-production, test-seam-only
  synthetic admitted-assertion ledger proof** for MVP 2 — explicitly **not** as
  production admission, durable storage, a final schema, production route
  readiness, or Freeside/client readiness
  ([`ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md:499-503`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)).
- Phase 33R **stated Phase 33Q does not complete MVP 2** — the synthetic stateful
  effect is proven against synthetic, ephemeral, test-seam-only state, not against
  a real, durable, production store reachable by a real route
  ([`:484-493`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)).
- Phase 33R **named six plausible next lanes (Options A–F) and selected a
  decomposition gate** rather than any single lane, because with both adjacent
  layers (route surface, synthetic stateful effect) accepted, the *production* path
  beyond them is gated by at least three independent, still-held upstream gates
  (the Straylight primitive review A–O, the ADR-022E durable store, and a final
  route contract), and choosing among A–F is a real decision with materially
  different risk profiles
  ([`:592-631`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)).

This gate therefore:

- **consolidates what the two accepted layers now prove** (§4) and **what remains
  unresolved** (§5);
- **explains why route-spike + bounded-ledger evidence still does not constitute
  production admission** (§4.3);
- **analyses Phase 33R §9 Options A–F** against the grounded evidence (§6);
- **selects the next lane** (§7 — Option D, the Straylight primitive-review
  follow-up) and records the **rejected lanes and why** (§7);
- **does not implement, authorize, or schedule** any route, store, migration, auth,
  consent, public surface, or schema freeze — it preserves every blocked lane (§8).

---

## 4. What the route spike + bounded ledger now prove (33N/33O + 33Q/33R)

The two accepted layers are **complementary halves of a single intake path**, each
bounded, dev/operator-only, non-production, and proven over synthetic state only.
The **Phase 33N route spike is a real, disabled-by-default / gated runtime slice** —
it is conditionally mounted only when `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`
([`app/src/server.ts:630-646`](../app/src/server.ts)) — while the **Phase 33Q ledger
remains test-seam-only and is not wired into `server.ts`**: the
`/api/admission/intake` mount passes only `{ enabled, gate, emitAudit }` and **no
ledger** (`:630-646`). **Neither layer is active on the default server path** — the
route is unregistered unless explicitly enabled, and the ledger is never injected —
and this still does **not** amount to production admission.

### 4.1 Route surface — accepted Phase 33O (on the Phase 33N spike)

Phase 33O accepted, read-only against the merged Phase 33N source
([`ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md:154-247`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md)):

- **Default-off route registration** — the route is not registered at all unless
  `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`, with a defense-in-depth disabled
  handler check returning a leak-free 404 even if mounted (`:160-170`).
- **Dev/operator gate layered behind the global `/api/*` allowlist** — fail-closed
  with both the service token and operator-id allowlist empty; constant-time
  comparisons never reveal which gate failed (`:171-179`).
- **Dedicated `x-admission-service-token` header** — deliberately not
  `Authorization: Bearer`, because the global `/api/*` allowlist already owns
  `Authorization` and is not exempt for `/api/admission` (`:180-186`).
- **Strict synthetic five-scenario shape** — a strict Zod schema accepts only two
  minimal fields behind a required synthetic non-production marker
  (`spike: 'admission_intake_dev_spike_v0'`), maps the five draft
  `transition_intent` values 1:1 to the five frozen scenarios, adds no sixth, and
  fails closed (identical public-safe refusal) on everything else (`:187-204`).
- **Storage Option A — no durable storage** — a pure classifier + public-response
  builder that mints nothing durable; trivial rollback (`:205-210`).
- **Single guarded no-leak send path over every public response** — deep-walked
  through a runtime no-leak guard mirroring the Phase 33L validator denylist before
  serialization, with a hardcoded known-safe HTTP-500 fail-closed fallback that is
  not re-guarded (`:211-227`).
- **Every draft marker asserted false on every response** —
  `schema_final:false`, `route_contract_final:false`, `production_admission:false`,
  `straylight_primitive_review_complete:false`, `idempotency_final:false`, plus the
  carried-forward unresolved rows (E, G, H, K, N, O) and review-dependent row (J)
  (`:228-233`).

### 4.2 Synthetic stateful effect — accepted Phase 33R (on the Phase 33Q ledger)

Phase 33R accepted, read-only against the merged Phase 33Q source
([`ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md:175-393`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)):

- **The governed transition has a real, retrievable effect on synthetic state** —
  accept mints exactly one canonical-aligned `active` admitted assertion with
  `recall_eligible: true` (never a coined `admitted` status); supersession repoints
  recall to the corrected assertion while preserving the prior's provenance; and
  identity/status/provenance are observable without raw-payload persistence
  (`:183-205`).
- **Pending / rejected / malformed leave no admitted, recallable state** — rejected
  before any mutation; nothing enters the assertions Map; the route records nothing
  for pending/reject/malformed/garbage (`:208-217`).
- **Tenant + estate isolation** — fail-closed `resolveOwnedSlot`; one estate owned
  by exactly one tenant for the process life; immutable, closure-owned scope
  snapshots that cannot be re-homed by post-construction mutation (`:220-237`).
- **Finite capacity validation + replay-metadata accounting** — both caps validated
  at creation and frozen; capacity enforced as bounded rejection (not eviction);
  retained replay key + fingerprint accounted in the byte budget; oversized fields
  rejected before scan/shape/accounting (`:240-266`).
- **Atomicity / no-residue / replay de-dup / conflict fail-closed** — all checks run
  before any Map mutation; identical replays return `'replayed'` and mint nothing;
  conflicting replays throw without overwrite/fork/corruption; per-rejected-input
  zero-residue across count/bytes/audit/recall (`:268-293`).
- **Process-local ephemerality / restart no-residue** — closure-captured Maps, no
  database/file/socket/timer; a second ledger is empty (`:296-301`).
- **Synthetic-only ingress hardening (defense-in-depth floor)** — exact-key
  validation via `Reflect.ownKeys`; symbol / non-enumerable / inherited-key /
  prototype hardening; accessor/TOCTOU hardening (read-once frozen snapshot);
  synthetic-label discipline that never echoes the rejected value (`:303-327`).
- **Immutable / detached outputs + privacy-marker integrity** — frozen, detached
  audit/inspection/projection outputs; audit records frozen carrying both
  `audit_private:true` and `public_audit_detail:false`, mutation-resistant
  (`:329-343`).
- **No-leak boundary and route-DI coupling preserved** — with no ledger injected
  (the server default) the route is byte-identical to the Phase 33N Option A path;
  internal recording stays off the public wire; a throwing ledger fails closed with
  the stable public-safe refusal and no leak (`:345-378`).

### 4.3 Why this is still not production admission

The two layers together prove that a dev/operator-only route **can** classify,
gate, fail-close, and no-leak safely (33N/33O) and that the governed transition
**can** have a real, isolated, bounded, fail-closed effect on **synthetic** state
(33Q/33R). They do **not** prove the *production* path. The gap is the full
governed transition over **real** estate —
candidate → a **durably-stored** admitted assertion with **real** status /
provenance / receipt → recall **actually** includes it → pending / rejected /
malformed candidates **durably** leave no admitted state — which remains blocked
behind at least three independent, still-held upstream gates
([`ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md:484-493,626-627`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)):

1. **The Straylight primitive review (A–O) is unresolved.** The canonical
   status/transition/signer/recall-eligibility/receipt vocabulary that real
   admitted-assertion and receipt semantics must conform to is Straylight-owned and
   unreviewed for admission; the genuinely-unresolved rows are E, G, H, K, N, O and
   the review-dependent row is J
   ([`classifier.ts:73-74`](../app/src/services/admission-wedge-spike/classifier.ts)).
2. **The durable estate store is gated by ADR-022E (held).** There is no
   authorization to write a durable admission store; the only existing
   non-durable analogue is the Recall-path in-process `BoundedEstateStore`, reused
   by the Phase 33Q ledger for its **operational shape only**, not its code, type,
   adapter, or schema
   ([`ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md:246`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)).
3. **The route contract is not final.** Phase 33G remains a *draft design*; every
   route-vector carries `route_contract_final: false`
   ([`docs/admission-wedge/route-contract-test-vectors/accept-candidate-to-admitted-assertion.json:10-19`](admission-wedge/route-contract-test-vectors/accept-candidate-to-admitted-assertion.json)).

No final schema is frozen anywhere in the chain. Every probe carries
`schema_final:false`, `canonical_schema:false`, `route_contract:false`,
`production_admission:false`, `identity_binding_final:false`, `synthetic_binding:true`,
and `straylight_primitive_review_complete:false`
([`docs/admission-wedge/fixtures/accept-candidate-to-admitted-assertion.json:6-16`](admission-wedge/fixtures/accept-candidate-to-admitted-assertion.json);
validator-enforced at
[`validate-fixtures.mjs:265-272`](admission-wedge/fixtures/validate-fixtures.mjs)),
and every route-vector and runtime response asserts the same draft markers false.

---

## 5. What remains unresolved

These are carried forward **unchanged** from Phases 33J–33R; Phase 33S **closes
none of them** — it orders the next lane that addresses the dominant one. "Docs-only
work OK?" distinguishes blockers that prevent *implementation* from those that
would also block a further *docs/decision* phase. **None blocks a docs-only next
step**, which is exactly why a decomposition lane is safe.

| # | Unresolved item | Current evidence | Owner | Docs-only work OK? |
|---|-----------------|------------------|-------|--------------------|
| **U1** | **Straylight primitive review A–O** (rows E, G, H, K, N, O unresolved; J review-dependent) — canonical assertion-lifecycle / recall-eligibility / receipt-audit / signer-authority / storage-audit-boundary vocabulary | No completed Straylight Admission-Wedge primitive-review artifact exists (33J §4); carried in code at [`classifier.ts:73-74`](../app/src/services/admission-wedge-spike/classifier.ts); `straylight_primitive_review_complete:false` enforced at [`validate-fixtures.mjs:265-272`](admission-wedge/fixtures/validate-fixtures.mjs) | **Straylight** (Dixie may *request/advance*, never *answer*) | Yes — a follow-up handoff is docs/decision-only |
| **U2** | **Durable admission storage** | No admission write path/schema; only the in-process non-durable `BoundedEstateStore` (Recall) and the process-local synthetic Phase 33Q ledger; durable estate store gated by **ADR-022E (held)** ([`ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md:246`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)) | Dixie (wire) + Straylight (ADR-022E) | Yes |
| **U3** | **Production auth + end-user consent** | Phase 33K designed service-auth and consent *options* but implemented none; the 33N/33Q gate is dev/operator-only; service auth ≠ end-user consent | Dixie (design) + cross-repo policy | Yes |
| **U4** | **Final route contract** | Phase 33G remains a draft design; `route_contract_final:false` on every vector and response | Dixie (draft) — needs U1 answers | Yes |
| **U5** | **Final idempotency semantics** | `idempotency_final:false`; candidate-id-keyed vs header-keyed vs both undecided; the 33Q replay/de-dup proof is spike-scoped only. Idempotency is **Dixie/endpoint-owned** — *absent* from Straylight, delegated to the host per ADR-026D §3.b; the §5/A–O row J asks only that Straylight **confirm the delegation / primitive compatibility**, not that it own the final endpoint semantics (33J §6 row J; 33K §5 row J) | **Dixie / endpoint route contract** (owns the semantics); Straylight (row J — confirms delegation / primitive compatibility only) | Yes |
| **U6** | **Production signer / authority semantics** | None implemented; `authority_*_draft` field names; no signer/authority binding decided | Straylight (vocabulary) + Dixie (wire) | Yes |
| **U7** | **Production tenant / estate / actor identity binding** | `identity_binding_final:false`, `synthetic_binding:true`; the 33Q tenant+estate binding is a **spike isolation mechanism**, never final semantics ([`ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md:549-554`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)) | Straylight (vocabulary) + Dixie (wire) | Yes |
| **U8** | **Freeside Characters client contract** | The 45J adapter is test-only, not exported, not runtime-wired, with no live Dixie call; 45J Option C "live client" is **Blocked** | Freeside (client) — needs an accepted Dixie contract | Yes |
| **U9** | **Production readiness / deployment criteria** | Undefined; no rollback/kill-switch/rollout/consent criteria for production admission | Dixie + cross-repo | Yes |

> **Why U1 is the highest-leverage vocabulary prerequisite (not the only
> production gate).** The §4.3 analysis names **three independent, still-held
> production gates** — the Straylight primitive review (U1), the ADR-022E durable
> store / production storage architecture (U2), and final route-contract acceptance
> (U4) — and production auth/consent (U3) and the final idempotency / signer /
> authority / tenant / estate / actor binding semantics (U5/U6/U7, where applicable)
> are further independent gates. Resolving U1 does **not** clear those; each remains
> an independent gate that must be cleared on its own. What U1 *does* is the
> vocabulary-prerequisite work: the storage record shapes (U2), the route contract
> (U4), idempotency *keying* (U5, whose semantics Dixie owns — see §5/U5), signer /
> authority field names (U6), and identity-binding semantics (U7) cannot be
> *designed clearly* against draft vocabulary the Straylight review may rename or
> re-relate, so U1 is the prerequisite that makes the downstream design unambiguous —
> not the lever that finalizes them. Phase 33K already **designed** the
> storage/auth/consent preconditions on paper and explicitly treats the A–O answers
> as **exit criteria**; Phase 33P observed that its conservative "decompose first"
> path was **largely already done by 33K/33M**, so re-decomposing on paper "would
> add a gate without adding evidence"
> ([`ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md:400`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)).
> U1 is therefore the **highest-leverage vocabulary prerequisite** to advance next —
> the gate whose resolution most clarifies the others — while ADR-022E durable
> storage, production auth/consent, and final route-contract acceptance remain
> independent, unresolved production gates in their own right.

---

## 6. Option analysis (Phase 33R §9 Options A–F)

Each option below is the Phase 33R §9 lane verbatim
([`ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md:602-622`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)),
assessed against the §4–§5 grounded evidence.

### Option A — Docs-only route-contract readiness update
- **What it is:** fold the 33O surface acceptance and the 33R stateful-effect
  acceptance into an updated, still-draft route-contract readiness assessment (no
  schema freeze).
- **Assessment:** safe and docs-only, but **premature and low-leverage**. The route
  contract (U4) cannot be made meaningfully more "ready" while the Straylight
  vocabulary (U1) it must conform to is unresolved — a readiness update would
  re-state draft markers without retiring any blocker. It is *contingent* on U1.
- **Verdict:** **not selected** (low-value before U1; would re-document, not
  advance).

### Option B — Narrow dev/operator route integration hardening slice
- **What it is:** a small, still-dev/operator-only, still-disabled-by-default
  implementation lane (e.g. exercising the DI seam behind the existing gate),
  selectable **only** if a narrow implementation-readiness slice is clearly
  justified and stays inside every Phase 33N/33P boundary.
- **Assessment:** this is the only **implementation** option. The recommended
  posture is docs/decision-only unless evidence *clearly* supports a narrow
  implementation-hardening lane — and it does **not**: the next material gain is
  *deciding the unresolved vocabulary* (U1), not exercising the already-accepted DI
  seam further. Phase 33R explicitly did **not** select Option B and required that
  if a later phase selects it, it must proceed through the framework's
  implement → review → audit cycle and stay inside every 33N/33P boundary
  ([`:632-634`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)).
- **Verdict:** **not selected** (no clear implementation-readiness justification;
  would advance no retired blocker; an implementation lane is not appropriate from
  a decomposition gate).

### Option C — Freeside Characters client-contract handoff
- **What it is:** a docs-only cross-repo handoff describing what (if anything) the
  accepted synthetic proofs mean for the blocked 45-series consumer, with no live
  client and no runtime wiring.
- **Assessment:** docs-only and safe, but **out of order**. A client cannot bind to
  an *unaccepted, reconciliation-bound* contract (U8 is downstream of U1 and U4); a
  handoff now would describe a contract still governed by unresolved vocabulary.
  Freeside owns the client side and 45J Option C is already Blocked; nothing forces
  this handoff before the Dixie contract stabilizes.
- **Verdict:** **not selected** (premature; downstream of U1/U4; Freeside-owned).

### Option D — Straylight primitive-review follow-up *(SELECTED — §7)*
- **What it is:** re-issue / advance the §5 A–O review handoff (rows E, G, H, K, N,
  O and review-dependent J), since those remain the gating production exit criteria
  for real admitted-assertion / receipt semantics.
- **Assessment:** targets the **highest-leverage vocabulary prerequisite (U1)** —
  the upstream Straylight primitive review whose resolution most clarifies the
  downstream design, though **not** the only production gate (ADR-022E durable
  storage, production auth/consent, and final route-contract acceptance remain
  independent, unresolved gates — §4.3, §5). It is docs/decision-only, respects the
  cross-repo ownership boundary (Dixie *requests/advances*; Straylight *answers*),
  and is now **materially richer than the abstract 33J handoff**: the review can
  point at the concrete synthetic implementation the chain has since produced (the
  Phase 33N route surface and the Phase 33Q ledger's `active`/`superseded` status
  model, recall-eligibility flag, receipt-like `SyntheticAuditRecord`, and
  replay/idempotency behavior — the latter on Dixie/endpoint-owned terms Straylight
  is asked only to confirm-compatible) and ask Straylight to confirm-or-rename each
  against canonical primitives. Resolving U1 makes the downstream *design* of
  U2/U4/U5/U6/U7 unambiguous; it does **not** by itself finalize them — each remains
  an independent gate requiring its own resolution (durable store via ADR-022E,
  consent/auth, route-contract acceptance, and the Dixie-owned idempotency/binding
  semantics).
- **Verdict:** **selected** (see §7).

### Option E — Storage / auth / consent blocker decomposition
- **What it is:** a further docs-only decomposition of the durable-storage / auth /
  consent blockers (ADR-022E, production consent), ordering them into
  separately-gated lanes.
- **Assessment:** docs-only and safe, but **largely already performed**. Phase 33K
  is the storage/auth/consent **precondition design** gate (draft record
  categories, service-auth/consent options, dev/operator scope option, idempotency
  precondition, no-leak posture, threat model), and Phase 33P explicitly judged that
  its conservative "decompose first" path was **largely already done by 33K/33M** and
  that re-decomposing "would add a gate without adding evidence"
  ([`ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md:400`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)).
  Crucially, the storage record shapes (U2), signer/authority field names (U6),
  receipt/audit split, and public/private projection rules are governed by the
  Straylight review rows (O, F-family, H, K), and idempotency keying (U5) — though
  **Dixie/endpoint-owned** — depends on the row-J **delegation confirmation** before
  it can be settled; so finalizing this decomposition **before** U1 risks rework.
- **Verdict:** **not selected as the next lane**, but **recorded as the documented
  D→E alternative** (§7): once the Option D review answers return (or are explicitly
  deferred), an Option-E lane finalizes the 33K design against them.

### Option F — Stop and require cross-repo review before further Dixie implementation
- **What it is:** the most conservative path — halt Dixie Admission Wedge
  implementation pending cross-repo (**Straylight + Freeside**) review.
- **Assessment:** the §8 blocks already halt every *implementation* lane; no Dixie
  implementation is in flight or authorized, and Option D **keeps implementation
  stopped**. Option F is **not fully subsumed by Option D**: Option F requires *both*
  the Straylight review *and* a Freeside review, whereas Option D advances **only the
  Straylight prerequisite**. Option D **partially serves Option F's protective
  intent** — it advances the Straylight review while continuing to block
  implementation — but the **Freeside review / client-contract work is deliberately
  deferred**, because the Dixie route/client contract is **not accepted yet** and is
  not stable enough to hand off (U4/U8 — §5). A bare "stop" (Option F as written)
  would additionally forfeit the cheapest, highest-leverage docs-only action —
  *issuing the Straylight review request the stop is waiting on*.
- **Verdict:** **not selected** — not because Option F is fully served by Option D,
  but because Option D is the **constructive immediate prerequisite**: it advances
  the Straylight review and keeps implementation stopped, while Freeside
  review/client-contract work is deferred until the Dixie contract is accepted enough
  to hand off (C / the Freeside client-contract handoff remains out of order for now —
  see Option C).

---

## 7. Decision: next lane

> **Selected: Option D — Phase 33T Admission Wedge Straylight primitive-review
> follow-up / consolidated cross-repo review handoff (docs / decision-only).**

**Reason:**

- The §4.3 / §5 analysis identifies **U1 (the Straylight primitive review A–O)** as
  the **highest-leverage vocabulary prerequisite** — the upstream gate whose
  resolution most clarifies the downstream design. It is **not** the only production
  gate: the **ADR-022E durable store / production storage architecture (U2)**,
  **production auth/consent (U3)**, and **final route-contract acceptance (U4)**
  remain independent, still-held production gates, as do the final idempotency /
  signer / authority / tenant / estate / actor binding semantics (U5/U6/U7) where
  applicable. The *design* of U4/U5/U6/U7 cannot be made unambiguous against draft
  vocabulary the review may rename or re-relate — so U1 is the prerequisite that
  unblocks clearer downstream design, **not** a lever that on its own makes
  production admission ready or finalizes any of the other gates.
- Option E (storage/auth/consent decomposition) is **largely already performed** by
  Phase 33K, and Phase 33P explicitly judged further paper decomposition would "add
  a gate without adding evidence"
  ([`ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md:400`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)).
  The bottleneck is no longer *decomposing* the preconditions — it is *resolving the
  vocabulary* the preconditions depend on.
- Option D is **docs/decision-only**, matching the recommended posture (prefer a
  docs/decision-only lane unless evidence clearly supports a narrow implementation
  slice — and it does not). It carries no scheduling penalty and is the cheapest
  high-leverage action.
- Option D is now **materially richer than the abstract Phase 33J handoff**: the
  follow-up can ground each A–O question in the concrete synthetic implementation
  the chain has since produced (the Phase 33N route surface and the Phase 33Q
  ledger's canonical-aligned `active`/`superseded` model, recall-eligibility flag,
  receipt-like audit record, and replay/idempotency behavior), turning an abstract
  vocabulary request into a "does this concrete synthetic shape match your canonical
  primitives?" review.
- Production implementation remains far too early — every implementation lane is
  blocked (§8), and no final schema is frozen (§4.3).

**Provisional phase label.** The follow-up lane is provisionally labelled **Phase
33T**. The label is for ordering only; the actual review-handoff content belongs to
that future, separately-gated docs/decision phase and is not designed here.

**Documented alternative (surfaced, not suppressed) — D→E sequencing.** If a
reviewer judges the storage/auth/consent finalization more urgent, the **Option-E
lane is the documented next-after-D alternative**: it consumes the Option-D review
answers (or explicit deferrals) as **exit criteria** and finalizes the Phase 33K
design against them. Option E is **conditional on D**, not a substitute for it —
finalizing storage record shapes (U2), idempotency keying (U5 — Dixie/endpoint-owned,
but awaiting the row-J delegation confirmation), signer/authority field names (U6),
the receipt/audit split (H), and public/private projection (K) before the review
returns would risk rework. This gate does **not** select Option E
as the immediate next lane, but records it as the documented follow-on per the
Phase 33R §9 framing.

**Explicit rejected lanes (and why):**

| Option | Rejected because |
|--------|------------------|
| **A. Docs-only route-contract readiness update** | Premature and low-leverage; the route contract (U4) cannot meaningfully advance while the Straylight vocabulary (U1) it must conform to is unresolved; would re-document draft markers, not retire a blocker. |
| **B. Narrow dev/operator route integration hardening slice** | The only *implementation* option; no clear implementation-readiness justification; the next material gain is deciding the unresolved vocabulary (U1), not exercising the already-accepted DI seam further. Phase 33R did not select it; an implementation lane is not appropriate from a decomposition gate. |
| **C. Freeside Characters client-contract handoff** | Premature and out of order; a client cannot bind to an unaccepted, reconciliation-bound contract (U8 is downstream of U1/U4); Freeside owns the client side and 45J Option C is already Blocked. |
| **E. Storage / auth / consent blocker decomposition** | Largely already performed by Phase 33K; Phase 33P judged further paper decomposition would "add a gate without adding evidence"; its finalization is *downstream of and conditional on* U1. Recorded as the documented **D→E** follow-on, not the immediate next lane. |
| **F. Stop and require cross-repo review** | **Not fully subsumed by Option D** — Option F requires both Straylight *and* Freeside review, while Option D advances only the Straylight prerequisite. Not selected because Option D is the constructive immediate prerequisite: it **keeps implementation stopped** and advances the Straylight review, **partially serving** Option F's protective intent, while Freeside review / client-contract work is **deferred** until the Dixie route/client contract is accepted enough to hand off (C remains out of order). A bare stop would forfeit the cheapest docs-only action (issuing the Straylight request the stop waits on). |

**Production rollout is not selected under any option.** No implementation,
storage, migration, auth, consent, public surface, Freeside wiring, package export,
or schema freeze is selected, scheduled, or authorized.

---

## 8. Non-goals / blocked lanes

Phase 33S is a docs/decision-only decomposition gate. It authorizes none of the
following; each remains **blocked** and is **not** the next implementation lane:

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
- final idempotency semantics;
- production signer / authority semantics;
- production tenant / estate / actor identity binding;
- a final route contract (Phase 33G remains a *draft design*);
- route-spike re-authorization (33M already authorized the now-accepted spike; this
  gate does not widen it);
- production implementation readiness.

This gate also explicitly does **not**:

- mutate the Phase 33E probe JSONs, the Phase 33L route-vector JSONs, or either
  docs validator;
- mutate the Phase 33N route handler, the Phase 33Q ledger module, or any spike
  service module / test;
- change any config, env, package, lockfile, CI, or generated file;
- wire the Phase 33Q ledger into `server.ts` or add any env flag
  ([`app/src/server.ts:630-646`](../app/src/server.ts) remains ledger-free);
- claim the Straylight primitive review is performed, answered, or complete.

> **On scope-expansion.** If a later phase reaches for anything in the blocked list,
> it must re-open the Phase 33E probe artifacts, the Phase 33F readiness gate, the
> Phase 33G design (as corrected by 33H), the Phase 33H acceptance gate, the Phase
> 33I decomposition gate, the Phase 33J review gate, the Phase 33K precondition
> design gate, the Phase 33L test-vector draft, the Phase 33M authorization gate,
> the Phase 33O route-spike acceptance gate, the Phase 33P storage/receipt hardening
> gate, the Phase 33R bounded-ledger acceptance gate, this decomposition gate, and
> the relevant Straylight decision records (ADR-022E durable-store gate; ADR-026C /
> ADR-026D route guardrails) first; it must not silently expand scope.

---

## 9. Validation requirements

Phase 33S is docs/decision-only; its validation is that it changed **nothing
executable** and that the two docs validators stay green. The phase succeeds only
if all of the following hold:

- `git status --short --branch --untracked-files=all` shows **only** the new gate
  doc and the minimal cross-reference status notes (§12) — no source, test,
  validator, probe, fixture, vector, config, env, package, lockfile, CI, or
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
- nothing is staged or committed by this phase (the branch's commit/merge is a
  separate, explicitly-authorized step).

---

## 10. Cross-repo implications

This gate respects the standing ownership posture; **no repo owns another repo's
final contract**:

- **Dixie (loa-dixie) owns the route-spike / route-contract draft side.** It owns
  the HTTP/BFF ingress seam (the dev/operator-only `POST /api/admission/intake`
  spike, tenant/estate binding *as a spike isolation mechanism*, idempotency *wire*,
  refusal mapping, no-leak projection) and the *draft* route contract (Phase 33G).
  It does **not** own the canonical assertion-lifecycle vocabulary and must not coin
  or freeze it. Phase 33S keeps the route contract a draft and selects a lane that
  **requests** — never answers — the Straylight review.
- **Straylight (`@loa/straylight`) owns the primitive / substrate vocabulary.** The
  canonical assertion-lifecycle, signer/keyring, receipt/audit, and storage-adapter
  primitives — and the A–O review answers (U1) — are Straylight's to confirm,
  rename, re-relate, or defer. The selected Option D lane is a **handoff/request**
  into Straylight's ownership; Dixie may consolidate and advance it but may not
  pretend to have performed it. The durable estate store remains gated by ADR-022E
  (held), and route guardrails by ADR-026C / ADR-026D — all Straylight-repo decision
  records.
- **Freeside Characters (freeside-characters) owns the client / Discord-side
  integration.** The 45-series mirror/adapter is test-only, not exported, not
  runtime-wired, with no live Dixie call; 45J Option C (live client) is **Blocked**.
  Freeside owns whether and how a client binds to a Dixie contract — and only to an
  *accepted* one. Phase 33S authorizes no Freeside runtime/client change and
  rejected (as premature) the Option-C handoff that would describe a still-unstable
  contract to that consumer.

> **Cross-repo caution.** The Dixie 33-series and freeside-characters 45-series are
> independent labels in separate repositories and must not be conflated. The
> freeside-characters PR-status authority is GitHub's merged state, not the stale
> local checkout (§2); the Straylight local checkout may also be stale, so the
> review request is framed as "perform / confirm", never "we found your review".

---

## 11. Recommended acceptance criteria for the next phase (Option D — Phase 33T)

The selected Option-D lane is a future, separately-gated **docs/decision-only**
phase. It is **not designed here**; the following are the *recommended acceptance
criteria* a future Phase 33T would have to meet (it must implement nothing):

1. **Docs/decision-only** — no source, test, route, store, migration, auth,
   consent, validator, probe/fixture/vector, config, env, package, or generated
   change; the two docs validators stay green; `git diff --check` clean.
2. **Consolidated, evidence-grounded A–O review handoff** — re-issue / advance the
   Phase 33J §5 review register, grounding each row (especially the
   genuinely-unresolved E, G, H, K, N, O and review-dependent J) in the **concrete
   synthetic implementation** now available: the Phase 33N route surface and the
   Phase 33Q ledger's `active`/`superseded` status model, `recall_eligible` flag,
   receipt-like `SyntheticAuditRecord`, and replay/idempotency behavior — with
   `file:line` citations.
3. **Per-row disposition request** — for each A–O row, ask Straylight to **confirm,
   rename, re-relate, or explicitly defer**, and record which Dixie draft terms may
   remain app-local draft vocabulary versus which must change.
4. **No resolution claim** — it must **not** assert the review is complete; it
   issues/advances the request and records open questions. `straylight_primitive_review_complete`
   stays `false` everywhere.
5. **Exit criteria defined** — it states what a *returned* review (or an explicit,
   governance-recorded deferral) would enable: it supplies the confirmed vocabulary
   that lets the **Option-E** finalization of the Phase 33K storage/auth/consent
   design (U2/U3) and the downstream *design* of U4/U5/U6/U7 proceed unambiguously.
   It does **not** by itself clear the independent production gates — ADR-022E /
   durable store architecture, production auth/consent, and final route-contract
   acceptance remain separate gates that must each be cleared on their own (the
   idempotency / binding semantics in U5/U7 being Dixie/endpoint-owned — §5).
6. **Preserves every blocked lane** — it authorizes no production / durable / public
   / Freeside / package / schema-freeze lane (§8), selects no production rollout, and
   does not finalize the route contract.
7. **Cross-repo ownership respected** — the handoff is a request into Straylight's
   ownership; it does not coin canonical vocabulary or claim to own the Straylight or
   Freeside final contract (§10).

---

## 12. Cross-references

> **Phase 33T status note (added later).** Phase 33T
> ([`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md))
> is the **docs/decision-only Straylight primitive-review follow-up / consolidated
> cross-repo review handoff** this gate selected as the next lane (its §7 Option D,
> §11 recommended acceptance criteria). It **re-issues / advances** the §7 / 33J A–O
> review register — the genuinely-unresolved rows (E, G, H, K, N, O) and the
> review-dependent row (J) — now grounded in the **concrete** Phase 33N route surface
> and Phase 33Q ledger (the `active`/`superseded` status model, `recall_eligible`
> flag, `SyntheticAuditRecord`, and replay/idempotency behavior) with `file:line`
> citations, turning the abstract 33J handoff into a "does this concrete synthetic
> shape match your canonical primitives?" request. It separates Straylight-owned
> primitive vocabulary from Dixie-owned endpoint route contract (endpoint idempotency
> is **Dixie-owned** — Straylight confirms delegation only) and Freeside-owned client
> integration, defines the expected Straylight response shape, and selects **Phase
> 33U** (review-response intake / lane-decision gate, which runs only after a
> Straylight response exists and invents no answers if none does). It mutates **no**
> probe / validator / fixture / vector / source, **completes no** Straylight review
> (`straylight_primitive_review_complete` stays `false`), claims **neither** that the
> review alone makes production admission ready **nor** that Straylight owns endpoint
> idempotency, freezes **no** schema, and keeps every implementation lane **blocked**.

> **Phase 33U status note (added later).** Phase 33U
> ([`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md))
> **intakes the Straylight-side answer** to the Phase 33T review request this gate
> selected (Option D). Straylight answered in **`loa-straylight` PR #65 (merged)**.
> Phase 33U reconciles the A–O dispositions using **only** the response's verdicts
> (A, B, D, I, L, M, N accepted; C accepted except `assertion_superseded`
> **rejected / re-related** Dixie-locally; E/G/H/J/K delegated-to-Dixie projections
> with **endpoint idempotency Dixie-owned**; F/G production semantics, J final
> endpoint keying, and O durable store under **ADR-022E gate #8** remain held), and
> routes to the **documented D→E follow-on** this gate recorded (§7): **Phase 33V**
> (storage/auth/consent design-finalization against the now-confirmed vocabulary,
> docs/decision-only). It records that the review answer **does not** make production
> admission ready, flips **no** runtime marker, mutates **no** probe / validator /
> fixture / vector / source, and keeps every implementation lane **blocked**.

- [`docs/ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)
  — Phase 33R bounded-ledger acceptance gate; its §4 proven list and §5 not-proven
  list seed §4, its §9 Options A–F are the decision space §6 analyses, and it
  **selected this Phase 33S decomposition gate** (§9). **Its reserved Phase 33S
  status-note placeholder (§12) is completed by this phase.**
- [`docs/ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md)
  — Phase 33O route-spike acceptance gate; its §4 proven list seeds §4.1 and its §5
  not-proven list seeds §4.3. **Gains a minimal Phase 33S status note.**
- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I decomposition gate; the structural ancestor this gate mirrors (the
  first decomposition gate, which ordered the 33J→33N lanes the chain has executed).
  **Gains a minimal Phase 33S status note.**
- [`docs/ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)
  — Phase 33P storage/receipt hardening decision gate; its Option B selection /
  Option D rejection, ADR-022E (held) note (`:246`), and "decompose first largely
  already done by 33K/33M" judgement (`:400`) ground the §6 Option E rejection.
  Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K storage/auth/consent precondition design gate; the design Option E
  would finalize once the Option D review answers return. Read-only here; **not
  modified**.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)
  — Phase 33J Straylight primitive-review request gate; its §5 fifteen-item register
  (A–O), the genuinely-unresolved rows (E, G, H, K, N, O), and the review-dependent
  row (J) are the U1 dependency the selected Option D lane re-issues/advances.
  Read-only here; **not modified**.
- [`docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`](admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md)
  — the Phase 33Q dev-store runbook; the operational source-of-truth for the
  ledger's bounded, process-local, non-durable, fail-closed, test-seam-only nature.
  Read-only here; **not modified**.
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md) /
  [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the Phase 33E draft v1 probes and their validator; the `*_final:false` markers
  (and the `straylight_primitive_review_complete:false` enforcement at `:265-272`)
  ground §4.3. Read-only; **not modified**.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md) /
  [`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs)
  — the Phase 33L route-vector fixtures and validator; the `route_contract_final:false`
  markers ground §4.3. Read-only; **not modified**.
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/` (`admitted-assertion-ledger.ts`,
  `classifier.ts`, `public-response.ts`, `no-leak.ts`, `auth-gate.ts`, `index.ts`),
  and `app/src/server.ts` (`:630-646`) — the Phase 33N spike and Phase 33Q ledger,
  inspected **read-only** to ground §4 (default-off route, dedicated header,
  five-scenario shape, carried-forward unresolved rows at `classifier.ts:73-74`, and
  the ledger-free server mount). **None is modified by this phase.**
- `@loa/straylight` — canonical primitive/substrate owner of the assertion
  lifecycle, signer/keyring, receipt/audit, and storage-adapter vocabulary,
  read-only in `../loa-straylight`. **No completed Straylight Admission-Wedge
  primitive review was found** (33J §4); A–O remain unresolved; the durable estate
  store is gated by ADR-022E (held); route guardrails by ADR-026C / ADR-026D. The
  local checkout may be stale. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (**verified merged on GitHub**
  2026-06-06) — the cross-repo acceptance; its mirror/adapter proof is a pure,
  fixture-bound semantic mapping layer with **no live Dixie call**, test-only, not
  exported, not runtime-wired. **Not edited by this phase.**
