# Admission Wedge — Contract Response / Acceptance Gate

> **Phase**: 33A
> **Date**: 2026-06-03
> **Title**: Admission Wedge Contract Response / Acceptance Gate
> **Branch context**: `phase-33a-admission-wedge-contract-response`
> **Related (loa-dixie)**: Phase 32E (Recall Wedge route contract), Phase 32F
> (readiness checkpoint — service-auth vs end-user authorization §7, public-bound
> minimization §8), Phase 32J/32K (seeded live estate design gate + default-off
> dev/operator seed), ADR-026C, ADR-026D, ADR-022E
> **Related (freeside-characters)**: Phase 43B (Admission Wedge design),
> Phase 43C (fixtures), Phase 44A (reducer), Phase 44C (runner), Phase 44D
> (gate), Phase 45A (Dixie contract request / handoff, PR #160)
> **Status**: **docs-only contract response / acceptance gate** (33A) —
> code-inspection-grounded. **No implementation. No live route. No storage
> writes. No admission writes. No runtime behavior change. No source/test/
> fixture/config change.** Accepts the *need* for a future Dixie-owned or
> cross-repo-owned Admission Wedge contract and a **draft v0** vocabulary; does
> **not** freeze a production schema.

This document is the Dixie-side **response** to the freeside-characters
Admission Wedge contract request (Phase 45A / PR #160). It records what Dixie is
willing to **own**, what it will **defer**, and what it explicitly **blocks**
for a future live Admission Wedge contract. It is a contract-response gate, not
an implementation. It inspects the actual Dixie + Straylight code path and stops
there.

This phase **does not** implement admission, authorize a live admission route,
write to storage, change any source/test/fixture/config, add a package export,
register a Discord command, ingest Discord history, turn user chat into memory,
expose a public `remember-this`, wire Finn into production, or freeze a
production schema. It is a single new documentation artifact.

---

## 1. Phase title and status

- **Phase 33A — Admission Wedge contract response / acceptance gate.**
- Dixie-side, **docs/contract-response only**.
- Responds to freeside-characters **Phase 45A / PR #160** (Admission Wedge
  Dixie contract request / handoff).
- **Does not implement admission.** No admission resolver, no admission write
  path, no admitted-assertion persistence is introduced.
- **Does not authorize a live route.** No `POST /api/admission/*` (or any other
  admission endpoint) is mounted, designed-to-mount, or scheduled by this doc.
- Status: **docs-only**. The only artifact produced is this Markdown file.

> **Phase-series note.** The Dixie Recall Wedge milestone occupied the `32`
> series (32A–32K). This Admission Wedge contract response opens the Dixie `33`
> series. The freeside-characters repository maintains its own phase numbering
> (e.g. its own `33A`, and the `43B–45A` Admission Wedge sequence cited above);
> Dixie `33A` and any freeside-characters `33A` are independent labels in
> separate repositories and must not be conflated. Cross-repo phase numbering
> remains an open reconciliation item (see §9).

---

## 2. Source request

freeside-characters has, across a sequence of phases, built and proved a
**local** Admission Wedge invariant and then handed a contract request to Dixie:

| freeside-characters phase | What it produced (per PR #160 handoff) |
|---------------------------|----------------------------------------|
| Phase 43B | Admission Wedge **design** — candidate→admitted transition model. |
| Phase 43C | Admission Wedge **fixtures** — recorded candidate/admission shapes. |
| Phase 44A | Admission **reducer** — pure state transition over candidate/admission events. |
| Phase 44C | Admission **runner** — drives the reducer over fixture sequences. |
| Phase 44D | Admission **gate** — local invariant enforcement / acceptance checks. |
| Phase 45A | **Handoff** — cross-repo contract request to Dixie (PR #160). |

freeside-characters has **proved the local admission invariant** within its own
repository (candidate memory is distinct from admitted memory; only an explicit
accepted transition produces admitted memory; rejected candidates never become
recallable). That local proof is necessary but **not sufficient** to authorize a
live admission seam: **live contract ownership must be decided by Dixie or by
cross-repo agreement before any implementation.** Phase 45A correctly stops at a
request and defers the ownership decision to this response.

The Phase 45A request asks Dixie to take a position on ten contract concerns,
enumerated A–J in §5 below: (A) candidate intake envelope, (B) explicit
admission transition, (C) admitted assertion shape, (D) rejection transition,
(E) supersession/correction transition, (F) admission receipt/audit fields,
(G) recall eligibility boundary, (H) service auth vs end-user authorization,
(I) storage/admission non-goals, and (J) no-leak public response requirements.

---

## 3. Dixie response stance

Dixie's position on the Phase 45A request:

1. **Dixie can be the future live intake/control-plane owner** for an Admission
   Wedge route or seam — but **only after a separately gated implementation
   phase** with its own design, review, and audit. This document does not open
   that phase.
2. **This doc accepts the need** for a Dixie-owned (or cross-repo-owned)
   Admission Wedge contract before any live implementation. The need is
   accepted; the implementation is not.
3. **This doc does not freeze a final production schema.** No field list,
   envelope, or receipt below is a frozen production contract. All are
   directional.
4. **This doc accepts a draft v0 contract vocabulary** (see §6) sufficient for
   *future* fixture/probe alignment between the two repositories — explicitly
   provisional and subject to reconciliation with existing Straylight/Dixie
   vocabulary.
5. **Live route / storage / auth implementation remains blocked** (see §8).
   Nothing here authorizes a mounted admission route, a storage write, a
   production admission, or a production consent mechanism.

The natural home for a future Dixie admission seam is the same BFF posture the
Recall Wedge already occupies: Dixie owns HTTP ingress, tenant/estate binding,
idempotency, refusal mapping, and no-leak projection; **Straylight (`@loa/
straylight`) owns the admission *semantics*** (policy resolution, signer
competence, assertion lifecycle), exactly as it owns recall semantics today.
The recall-side ownership split is documented at
`docs/integration/phase-32e-recall-wedge-route-contract.md:15-33` (§1 Source
hierarchy: Straylight owns recall semantics, Dixie consumes/serves), and the
route's import discipline that enforces it — value-importing only the seam
handler while taking all contract types type-only — is at
`app/src/routes/recall-intake.ts:30-42`. This response assumes — but does not
commit to — that same ownership split.

---

## 4. Core invariant Dixie accepts

Any future Dixie Admission Wedge contract **must preserve** the following
invariant. Dixie accepts this invariant now, independent of implementation:

1. **Candidate memory is not admitted memory.** A candidate is a proposal, not
   governed continuity.
2. **Candidate memory is not recallable as governed continuity before explicit
   admission.** A candidate must never appear in an ordinary recall result.
3. **An accepted transition creates or references an admitted assertion.**
   Acceptance is the *only* path from candidate to admitted; it is explicit,
   authority-bound, and auditable.
4. **A rejected candidate never becomes recallable.** Rejection is terminal for
   recall eligibility (subject to a future, separately-gated appeal/correction
   path — see §5.D).
5. **Supersession/correction preserves auditability while ordinary recall
   includes only the corrected active assertion.** The prior (superseded) state
   remains available for audit/provenance but is excluded from ordinary recall.
6. **Fail-closed paths must not leak raw candidate / private payload.** On any
   error, rejection, or malformed input, the public response carries a stable
   reason code and safe summary only — never the raw candidate body, private
   sentinels, internal store text, or operational identifiers.

This invariant is consistent with — and an admission-side extension of — the
Recall Wedge posture already in force: tenant/estate binding enforced at ingress
(`app/src/routes/recall-intake.ts:342-359`), a fail-closed startup key gate
(`app/src/config.ts:286-289`), and a documented no-leak boundary
(`docs/RECALL-WEDGE-SEEDED-LIVE-ESTATE-STORAGE-DESIGN.md:§7-§8`).

---

## 5. Response to each freeside-characters contract question (A–J)

Each subsection states a **draft contract *direction*** — not a final
implementation, not a frozen schema, not an authorization to build. Final field
names, types, and behaviors are deferred to a later, separately-gated phase and
must reconcile with existing Straylight/Dixie vocabulary (see §6).

### A. Candidate intake envelope

- The future route/interface **name and method can be decided later** (open
  item §9); it is **not** authorized or mounted here.
- The envelope **should carry an explicit version and kind** discriminator so
  future fixtures/probes can pin a contract version.
- **Tenant / estate / actor binding is required** and must be derived
  authoritatively from the authenticated session, not from caller-supplied
  fields — mirroring the Recall Wedge rule where `caller.tenant_id`,
  `caller.actor_id`, `request.actor_id`, and `request.estate_id` must all equal
  the session wallet or the request is refused
  (`app/src/routes/recall-intake.ts:342-359`).
- The **candidate id must be service-safe and idempotent** — a stable key that
  lets retries coalesce without minting duplicate candidates.
- **Source kind / source ref must be public-safe or audit-only-separated.** If a
  source reference could leak private material, it belongs on the audit
  boundary, not the public envelope.
- The **proposed assertion class must come from a bounded vocabulary.**
  Straylight already defines the canonical `AssertionClass` union
  (`observation, event, claim, assumption, preference, reflection, identity,
  relationship, permission, plan, action_trace, feedback_signal,
  evaluation_result, challenge, revocation, commitment` —
  `app/src/routes/recall-intake.ts:84-146`); a future admission envelope should
  validate against that union rather than invent a parallel class list.
- The **candidate payload is private / audit-boundary by default.** It is not
  echoed on any public response.
- The **public response must not echo the payload.**
- **Admission state begins as `candidate_pending`** (draft v0; reconciles to the
  canonical Straylight `proposed` status — see §6).
- **Provenance is required.**
- **Idempotency is expected** (header-keyed, as in the Recall Wedge
  `Idempotency-Key` contract — `docs/integration/phase-32e-recall-wedge-route-contract.md:§2.3`).
- **Unknown / malformed envelopes fail closed** — refused with a stable reason
  code, no payload echo (cf. `ingress.invalid_request`,
  `app/src/services/straylight-recall-intake/refusal-mapping.ts:12`).

### B. Explicit admission transition

- A **transition kind and version are required.**
- The **admission decision vocabulary** is: `accepted`, `rejected`, and
  (possibly, later) `superseded` / `corrected`. Supersession/correction is a
  *follow-on* transition over an already-admitted assertion, not a first-pass
  admission outcome.
- An **authority / signer / service actor is required.** Straylight already
  defines `SignerType` (`actor_controller, operator, runtime, reviewer,
  policy_service, admin, wallet, service_key` —
  `app/src/routes/recall-intake.ts:84-146`); a future admission transition
  should bind to that signer model.
- **Policy validation is separate from structural validation.** Structural
  (shape/schema) validation fails closed at ingress; policy validation
  (is-this-signer-competent-to-admit-this-class) is a distinct, upstream
  decision — paralleling how the Recall Wedge separates ingress refusals
  (`ingress.*`) from seam/policy refusals (`seam.*`) in
  `app/src/services/straylight-recall-intake/refusal-mapping.ts:10-33`.
- A **transition links the candidate id to the admitted assertion id when
  accepted.**
- **Rejected transitions mint no admitted assertion.**
- A **receipt / audit record is required** for every transition (accepted *or*
  rejected).
- **Fail-closed reason codes are required** for every non-accept outcome.

### C. Admitted assertion shape

- An admitted assertion should carry, at minimum: an **assertion id**;
  **actor / estate / tenant binding**; **class** and **status**; the **source
  candidate id**; the **admission transition id**; **recall eligibility**;
  **provenance**; and a **visibility / rendering class**.
- It **should align with existing Recall Wedge recall expectations where
  possible.** In particular, the post-admission status is the canonical
  Straylight `active` (not a bespoke "admitted" status), and recall filtering
  already keys off `AssertionStatus` and visibility/use signals
  (`app/src/routes/recall-intake.ts:84-146`; `RecallUseInstruction` =
  `usable | mark_as_contested | use_as_background_only | do_not_use_for_action`).
- **Final field names may be reconciled later** and should defer to the
  Straylight-owned assertion types rather than be coined Dixie-side (see §6).

### D. Rejection transition

- A **rejected candidate remains non-recallable.**
- A **rejected transition mints no admitted assertion.**
- A **rejection receipt / audit record is required.** The nearest existing
  canonical concept is the Straylight audit event `transition_denied` (i.e. an
  `admit_assertion` transition that was denied), which is the better anchor than
  a bespoke "rejected" status (see §6).
- **Appealability / deferred correction should be a later, separately-gated
  decision**, not implied now. This doc does not define an appeal path.

### E. Supersession / correction transition

- A supersession/correction transition **must reference both the superseded
  assertion and the corrected assertion.**
- **Ordinary recall includes the corrected active assertion only.**
- The **superseded prior state remains audit / provenance only** — retained for
  auditability, excluded from ordinary recall. This maps to the canonical
  Straylight `superseded` status (`app/src/routes/recall-intake.ts:84-146`); the
  "corrected active" member of the pair is simply status `active` plus a
  supersede link, **not** a new status (see §6).
- **Forget / revoke / correction UI remains out of scope** (see §8). This doc
  defines no user-facing forget, revoke, or correction surface.

### F. Admission receipt / audit fields

A future admission receipt should carry: a **receipt id**; a **decision time**;
the **service / authority actor**; a **policy decision reason**; a **candidate
ref**; an **admitted / rejected / superseded ref** (as applicable); a **recall
eligibility result**; a **public-safe summary**; and a **clear private /
audit-only details boundary**. **No raw candidate payload appears in the public
response.** This mirrors the Recall Wedge receipt posture, where Dixie passes
through a public receipt and keeps internal reason detail on the audit object
(`docs/integration/phase-32e-recall-wedge-route-contract.md:§2.1`;
`app/src/services/straylight-recall-intake/refusal-mapping.ts:177-209`).

### G. Recall eligibility boundary

Draft eligibility mapping (provisional; reconciles to canonical statuses in §6):

| Admission state (draft v0) | Recall eligibility |
|----------------------------|--------------------|
| `candidate_pending` | **Not** recall eligible. |
| Admitted active assertion (`active`) | Recall eligible **under policy**. |
| Rejected (`transition_denied`) | **Not** recall eligible. |
| Superseded (`superseded`) | **Not** ordinary-recall eligible (audit/provenance only). |
| Corrected active (`active` + supersede link) | Ordinary recall eligible. |

- **Challenged / revoked / forgotten interactions are deferred** unless existing
  Dixie/Recall semantics already define them. Straylight does already define
  `contested`, `revoked`, and `forgotten_from_recall` statuses
  (`app/src/routes/recall-intake.ts:84-146`); a future admission contract should
  reuse those rather than invent new ones, but this doc does not specify their
  admission-time behavior.

### H. Service auth vs end-user authorization

- **Service-to-service auth is not end-user consent.** This distinction is
  already load-bearing in Dixie and must not be collapsed
  (`docs/integration/phase-32f-recall-wedge-readiness-checkpoint.md:§7`).
- A **dev / operator service token can prove a service seam only** — it proves a
  calling service may invoke Dixie, not that any end user authorized the
  admission. (Cf. `STRAYLIGHT_RUNTIME_DIXIE_KEY` and `ADMIN_KEY`, which gate
  service access — `app/src/config.ts:286-289`, `app/src/routes/admin.ts:15-42`.)
- **Tenant / estate binding is required** and derives from the authenticated
  session, as in the Recall Wedge ingress guard.
- **Production end-user consent / authorization remains separate and blocked.**
  Dixie's existing end-user authorization machinery (SIWE JWT, conviction tier,
  ownership, Hounfour `AccessPolicy`) governs *recall/memory* access today
  (`app/src/routes/memory.ts:75-134`, `app/src/services/memory-auth.ts`); **no
  production end-user consent mechanism for admitting candidate memory exists.**
- **This doc does not claim production authorization is solved.**

### I. Storage / admission non-goals

This response preserves all of the following non-goals:

- **No production storage claim.** The only recall-side store today is the
  in-process, non-durable `BoundedEstateStore`
  (`app/src/services/straylight-recall-intake/bounded-estate-store.ts:1-27`); no
  database/persistence backs estate/keyring/assertion data
  (`docs/RECALL-WEDGE-SEEDED-LIVE-ESTATE-STORAGE-DESIGN.md:§3`). No admission
  store exists at all.
- **No automatic Discord chat ingestion.**
- **No public `remember-this`.**
- **No user chat becoming memory.**
- **No cross-user sharing.**
- **No live writes until separately authorized.**
- **No production auth / consent solved by this doc.**

### J. No-leak public response requirements

A future admission response must enforce:

- **Stable reason codes.**
- **Safe public summaries.**
- **No raw candidate payload.**
- **No private sentinels.**
- **No raw fixture / debug body.**
- **No stack traces.**
- **No operational secrets / IDs** (no internal store text, raw tenant ids, JWT
  material, or capability material on the public wire).
- **No source-material leakage.**
- **Unknown / malformed input fails closed** — refused with a stable code and no
  payload echo.

This admission no-leak requirement is the candidate/payload-direction analogue
of the existing Recall Wedge no-leak posture. **Note the existing posture is
nuanced and must be reconciled, not assumed:** the Recall Wedge forwards
`raw_reasons` on most denied paths by contract (Phase 32D), and *only* the
overloaded `storage_unavailable` class omits `raw_reasons` from the public body
while retaining them on the internal audit object (Phase 32K,
`app/src/services/straylight-recall-intake/refusal-mapping.ts:177-209`). A future
admission contract should decide its own public/audit split explicitly rather
than inherit the recall split by default (open item §9).

---

## 6. Draft v0 vocabulary (subject to reconciliation)

> **Draft v0 / subject to reconciliation.** The terms below are a *provisional*
> shared vocabulary to enable future cross-repo fixture/probe alignment. They
> are **not** a frozen contract and **not** Dixie-owned lifecycle authority.
> Dixie consumes and mirrors the assertion-lifecycle vocabulary through local
> route-validation arrays (`app/src/routes/recall-intake.ts:84-146`, mirrored
> from `@loa/straylight`) and type-only Straylight declarations; the route's
> only runtime value import is the seam handler from
> `@loa/straylight/runtime/recall-intake` (`app/src/routes/recall-intake.ts:30-42`),
> and the seam owns all semantic meaning. **Final naming MUST reconcile with the
> existing canonical Straylight vocabulary** rather than coin parallel Dixie
> terms. Where Straylight already has a better-established name, the canonical
> name wins.

Proposed draft-v0 terms (as requested by Phase 45A):

- `candidate_pending`
- `admitted`
- `rejected`
- `superseded`
- `corrected_active`
- `candidate_not_admitted`
- `admitted_active_assertion`
- `candidate_rejected`
- `superseded_not_ordinary_recallable`
- `corrected_active_assertion`
- `unsupported_admission_shape`
- `unsafe_candidate_payload_projection`

### 6.1 Reconciliation against existing Straylight / Dixie vocabulary

A code-grounded sweep found that **8 of the 12 proposed terms re-coin concepts
that the upstream Straylight vocabulary already names authoritatively**, and the
remaining shape/projection terms have existing Dixie *refusal/no-leak* analogues.
Final naming should reconcile as follows:

| Draft v0 term | Existing canonical / Dixie equivalent | Reconciliation direction |
|---------------|----------------------------------------|--------------------------|
| `candidate_pending` | `AssertionStatus` **`proposed`** | Adopt canonical `proposed`; do not mint `candidate_pending`. |
| `admitted` | Audit event **`assertion_admitted`** + transition **`admit_assertion`**; resulting status **`active`** | Use the event/transition names for the act; use `active` for the resulting status. No bare `admitted` status exists. |
| `rejected` | No status; nearest = audit event **`transition_denied`** | Anchor on `transition_denied` (a denied `admit_assertion`); do not invent a parallel `rejected` status. |
| `superseded` | `AssertionStatus` **`superseded`** | Exact canonical match — adopt as-is, cite Straylight as owner (not a Dixie coinage). |
| `corrected_active` | No `corrected` status; = transition (`superseded` → `active`) | Express as the (superseded, active) pair, not a new status. |
| `candidate_not_admitted` | No status; nearest = **`transition_denied`** | Synonym of `rejected`; collapse to `transition_denied`. Flag the 3-way synonym collision. |
| `admitted_active_assertion` | `AssertionStatus` **`active`** | Redundant compound — rename to `active`. |
| `candidate_rejected` | No status; nearest = **`transition_denied`** | Synonym of `rejected` — collapse to `transition_denied`. |
| `superseded_not_ordinary_recallable` | `superseded` + **`forgotten_from_recall`** / `RecallUseInstruction` | Express as `superseded` plus a recallability signal; do not mint a compound literal. |
| `corrected_active_assertion` | No status; = transition (`superseded` → `active`), status `active` | Verbose synonym of `corrected_active`; same reconciliation. |
| `unsupported_admission_shape` | Refusal-side analogues **`ingress.invalid_request`** / **`seam.class_validation_failed`** | New to the admission direction; name after the existing ingress/class-validation refusal family. |
| `unsafe_candidate_payload_projection` | Existing **`no-leak`** posture (Phase 32K projection-safety) | New to the admission direction; ground in the existing no-leak vocabulary, not a third naming style. |

**Net guidance.** Because Dixie is a *non-owning consumer* of the
assertion-lifecycle vocabulary, this doc does **not** assert authority to name
lifecycle statuses. It adopts the upstream canonical names
(`proposed | active | contested | demoted | revoked | forgotten_from_recall |
superseded | sealed`; events `assertion_admitted` / `transition_denied`;
transition `admit_assertion`; `RecallUseInstruction`) and only locally names the
HTTP-refusal-shaped and no-leak-shaped concerns it does own
(`ingress.*` / `guard.*` / `seam.*`, and the no-leak projection posture).
Canonical references: `app/src/routes/recall-intake.ts:84-146` (enum const
arrays as enforced at the Dixie ingress);
`app/src/services/straylight-recall-intake/refusal-mapping.ts:10-33` (Dixie-local
refusal classes).

---

## 7. What this response accepts

This response accepts **only**:

1. **The need for a Dixie-side or cross-repo-owned Admission Wedge contract
   before any live implementation.**
2. **The core invariant** (§4).
3. **The no-leak / fail-closed posture** (§5.J, §4.6).
4. **The need to reconcile candidate / admitted / rejected / superseded
   semantics with the Recall Wedge** and the canonical Straylight vocabulary
   (§6).
5. **That a future implementation gate may be *proposed*** after contract
   reconciliation — proposed, not authorized (§10).

It accepts nothing beyond the above.

---

## 8. What this response does NOT accept / authorize

This response explicitly **blocks** all of the following. None is authorized,
implied, or unblocked by this document:

- **Implementation in this PR.**
- **A live admission route.**
- **Storage writes.**
- **Production admission.**
- **Production auth / consent.**
- **A public `remember-this`.**
- **Discord history ingestion.**
- **User chat becoming memory.**
- **A Discord command.**
- **freeside-characters runtime changes.**
- **Package exports.**
- **LLM / voice behavior.**
- **Finn production wiring.**
- **Forget / revoke / correction UI.**
- **Any claim that a final schema or production contract is already frozen.**

To be unambiguous about current reality (code-grounded): Dixie today exposes a
**recall** route (`POST /api/recall/intake`) that is read-only, default-off, and
fail-closed; it has **no admission route, no admission concept in route code,
and no production storage** — admission semantics live upstream in
`@loa/straylight/host` (`app/src/routes/recall-intake.ts`). The dev-seeded
estate is dev/operator-only, default-off, and **not** production admission
(`app/src/services/straylight-recall-intake/dev-seeded-estate.ts:12-18`); its
seed material is synthetic and public-safe and stores no secret, private key,
live id, token, URL, or signature
(`app/src/services/straylight-recall-intake/dev-seeded-estate.ts:19-27`,
`app/src/services/straylight-recall-intake/dev-seeded-estate.ts:37-50`); and it
is non-durable — lost on restart and re-seeded next startup (`app/src/server.ts:574-585`).

---

## 9. Open questions before any live Dixie implementation

These must be resolved before any live Dixie admission implementation is
designed or authorized:

1. **Route name and method** (e.g. `POST /api/admission/...` vs a recall-seam
   extension).
2. **Exact envelope schema** (fields, types, version/kind discriminator).
3. **Exact receipt schema** (public vs audit-only field split).
4. **Source of admission authority** (which `SignerType`/role may admit which
   `AssertionClass`).
5. **Tenant / estate binding source** (confirm session-derived, no caller
   override).
6. **Idempotency key semantics** (candidate-id-keyed vs header-keyed vs both).
7. **Policy validation boundary** (what is structural vs policy; where each
   fails closed).
8. **Storage model** (durable backend remains gated by ADR-022E; the current
   store is in-process/non-durable).
9. **Audit retention** (how long, where, what is public-safe).
10. **Public / private response split** (explicitly decide the admission
    no-leak split rather than inherit the recall `raw_reasons` split — see §5.J).
11. **Interaction with the existing recall-intake classification vocabulary**
    (`ingress.*` / `guard.*` / `seam.*`, `outcome`, `reason`, canonical
    `AssertionStatus` / audit events / `RecallUseInstruction`).
12. **Rollout mode** (fixture probe first, dev/operator-only second, or a no-op
    contract test first — none authorized here).
13. **Cross-repo phase numbering reconciliation** (Dixie `33` series vs
    freeside-characters `43–45` Admission Wedge series and its own `33A`).

---

## 10. Recommended next phases (listed, NOT authorized)

The following are *listed for planning visibility only*. **None is authorized by
this document**; each requires its own separately-gated design/review/audit.

- **Phase 33B (future Dixie)** — contract fixture / probe alignment: record
  candidate/admission fixtures and align them with freeside-characters
  Phase 43C, against this accepted draft v0 vocabulary.
- **Phase 33C (future Dixie)** — no-op validator or contract tests: a
  shape/no-leak validator with no live route and no storage writes.
- **freeside-characters Phase 45C** — reconciliation against this accepted Dixie
  response (adopt canonical naming per §6; confirm the core invariant per §4).
- **Later live-route gate** — only after contract fixtures/tests *and*
  storage/auth decisions (§9) are resolved.
- **Later dev/operator candidate command** — only after a Dixie admission
  contract *and* the freeside-characters gate are both in place; never a public
  command, never Discord ingestion.

---

## 11. Cross-references

- `docs/integration/phase-32e-recall-wedge-route-contract.md` — governing Dixie
  Recall Wedge route contract (served/denied/refusal mapping, idempotency,
  non-ownership). The admission response assumes the same BFF / Straylight
  ownership split; it does not replace this contract.
- `docs/integration/phase-32f-recall-wedge-readiness-checkpoint.md` — §7
  service-auth vs end-user authorization and §8 public-bound minimization remain
  in force for any future admission work (§5.H, §5.J).
- `docs/RECALL-WEDGE-SEEDED-LIVE-ESTATE-STORAGE-DESIGN.md` — seeded-live-estate
  design gate (32J) + default-off dev/operator seed (32K); the source for "no
  production storage / no production admission" reality (§4, §8, §5.I).
- `app/src/routes/recall-intake.ts` — recall route entrypoint; canonical enum
  const arrays (`AssertionClass`, `AssertionStatus`, `SignerType`,
  `EnvironmentFrame`, …) at lines 84-146; tenant guard at 342-359. **Inspected
  read-only; not modified.**
- `app/src/services/straylight-recall-intake/refusal-mapping.ts` — Dixie-local
  refusal classes (`ingress.*` / `guard.*` / `seam.*`, lines 10-33) and the
  Phase 32K no-leak sanitization (lines 177-209). **Inspected read-only; not
  modified.**
- `app/src/services/straylight-recall-intake/bounded-estate-store.ts` —
  in-process, non-durable estate store (no persistence backend). **Inspected
  read-only; not modified.**
- `app/src/services/straylight-recall-intake/dev-seeded-estate.ts` /
  `app/src/config.ts` — default-off dev/operator seed and its fail-closed gate;
  the basis for "synthetic, no stored secret, not production admission".
  **Inspected read-only; not modified.**
- `@loa/straylight` (type-pinned dependency) — semantic owner of the assertion
  lifecycle and recall/admission policy. The canonical vocabulary in §6 is
  Straylight-owned; Dixie consumes and mirrors it (local route-validation
  arrays at `app/src/routes/recall-intake.ts:84-146` plus type-only declarations;
  the only runtime value import is the seam handler at lines 30-42) and does not
  coin parallel names.
- ADR-022E (durable-store gate, still held), ADR-026C / ADR-026D
  (capability/route guardrails) — any future admission storage/route must clear
  these.
