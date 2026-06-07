# Phase 33H — Admission Wedge Route-Contract Acceptance / Implementation-Readiness Decision Gate

> **Phase**: 33H
> **Branch context**: `phase-33h-admission-wedge-route-contract-acceptance`
> **Related**: Dixie Phase 33A–33G (loa-dixie); freeside-characters Phases 45E–45J
> **Status**: **docs / decision-only acceptance gate.** No route, route handler,
> storage, auth, consent, probe/validator mutation, fixture JSON, package,
> lockfile, test, CI, runtime, or live integration change.
> **This is an acceptance / implementation-readiness gate, not route
> implementation.** It accepts (with two minor docs-only corrections) the Phase
> 33G route-contract design, renders an implementation-readiness verdict,
> inventories blockers, and selects the next safe lane. It changes **no** routes,
> storage, auth, probes, validator, runtime behavior, or production schema, and it
> does **not** freeze a final/production schema.

This document is the Dixie-side **acceptance / implementation-readiness decision
gate** for the Phase 33G draft route-contract design
([`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)).
It answers four questions and stops there: **(1)** does the design hold up as a
bounded docs-only draft (accept / reject / patch)? **(2)** is route
implementation anywhere close (implementation-readiness verdict)? **(3)** what
blocks implementation, and which blockers also block a docs-only next step?
**(4)** what is the safest next lane? It designs no envelope, implements no
route, mutates no probe or validator, and authorizes no live behavior.

It is modelled structurally on the Recall Wedge readiness checkpoint
([`docs/integration/phase-32f-recall-wedge-readiness-checkpoint.md`](integration/phase-32f-recall-wedge-readiness-checkpoint.md))
and executes the **docs/decision-only Phase 33H acceptance lane that Phase 33G
selected** (its §20–§21). Every assessment below is grounded read-only against
the actual Dixie repo (route seam, refusal vocabulary, auth, storage, ADRs,
probes/validator) and the freeside-characters Phase 45J artifacts; where a
claim could not be grounded, it is marked.

---

## 1. Phase title and status

- **Phase 33H — Admission Wedge route-contract acceptance / implementation-
  readiness decision gate.**
- Dixie-side **docs / decision-only**.
- Follows Dixie Phase 33G / PR #124 (route-contract design) and
  freeside-characters Phase 45J / PR #177 (Dixie v1 mirror-refresh acceptance /
  next-lane decision gate).
- This is an **acceptance / implementation-readiness gate**, not route-contract
  design and not route implementation.
- It changes **no** routes, storage, auth, consent, probes, validator, runtime
  behavior, source code, configuration, or production schema.
- It does **not** freeze a final/canonical/production schema.
- It does **not** mutate the Phase 33E probe JSONs (`hardening_phase: "33E"`,
  `dixie_admission_wedge_probe_v1`) or the validator. Per the Phase 33D §6
  invariant, any probe/validator mutation requires its own separately-gated
  phase. Phase 33H inspects them read-only.
- It applies **two minor docs-only factual corrections** to the Phase 33G design
  text (§3 below); these are wording fixes against verified repo reality, not a
  design change, and they touch no code, probe, validator, or fixture.

The audience for this document is **future Dixie phases** (primarily a possible
Phase 33I — see §10), the **Straylight (`@loa/straylight`) primitive/vocabulary
owner** (whose review remains a precondition — see §6, §8.D, §9.D), and
**freeside-characters** as an interested-but-blocked downstream consumer
(see §5.O, §12).

---

## 2. Source chain

This gate sits at the head of the Dixie route-contract ladder, one rung above the
Phase 33G design. It introduces no new contract material; it accepts/corrects the
33G design and decides the next lane.

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33A | #118 | Admission Wedge contract response / acceptance gate — accepts the *need* for a contract and draft v0 vocabulary; enumerates the core invariant and the open route-design questions. Does not freeze schema. |
| 33B | #119 | Fixture/probe ownership decision — Dixie owns the first canonical fixture/probe proposal; defines the five-scenario minimum set. Docs/decision-only. |
| 33C | #120 | Canonical fixture/probe draft v0 — five synthetic public-safe probe JSONs + dependency-free validator under `docs/admission-wedge/fixtures/`. |
| 33D | #121 | Probe hardening / contract-vocabulary-refinement gate — accepts the v0 probes; records hardening topics; decides **not** to mutate probes in 33D; recommends Phase 33E. |
| 33E | #122 | Probe hardening draft v1 / vocabulary refinement — bumps probes to `dixie_admission_wedge_probe_v1`, adds non-final markers and draft placeholders, hardens the validator; preserves all five scenarios; adds no sixth probe; freezes no schema. |
| 33F | #123 | Route-contract readiness gate — assesses the v1 probes as a mature enough *semantic* foundation to begin a docs-only design phase; names preconditions; selects Phase 33G. |
| 33G | #124 | Route-contract design — proposes (on paper) a route identity, request/response envelopes with a public/private split, an idempotency sketch, an `admission.*` refusal taxonomy, storage/auth/consent preconditions, and route-contract test vectors mapped from the five Phase 33E probes. Selects this Phase 33H acceptance gate. |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter track `dixie_admission_wedge_probe_v1`, **test-only**; v0 fails closed as `unknown_probe_version`. |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded, test-only purpose; **recommended Dixie Phase 33F as the next readiness gate** (it did **not** select Phase 33G). Authorizes no live client, no package export, no runtime wiring. |

> **Grounding note on the 45J / PR #177 citation — verified merged.** GitHub
> confirms freeside-characters **PR #177 is MERGED** (merged June 6, 2026, merge
> commit `917b6c04`,
> <https://github.com/0xHoneyJar/freeside-characters/pull/177>), one rung above
> the also-merged #176 (Phase 45I, merge `9d1c4bf`, merged June 6, 2026). The local
> `../freeside-characters` checkout is **stale** — it sits on the PR-head branch
> `phase-45j-admission-wedge-v1-mirror-refresh-acceptance` (HEAD `ec45690`, the
> PR-head commit, *not* the `917b6c04` merge) — so the local git tree is **not**
> authoritative for merged GitHub state and must not be treated as
> source-of-truth for merged-PR status. GitHub's merged state is authoritative
> for PR status, and `Phase 45J / PR #177` is valid source-chain context. No
> correction is warranted.

**Ownership posture carried by the whole chain (unchanged here):** Dixie owns the
HTTP/BFF ingress seam (route, tenant/estate binding, idempotency, refusal
mapping, no-leak projection); **Straylight (`@loa/straylight`) is the canonical
primitive/substrate owner** of the assertion-lifecycle vocabulary; Dixie consumes
and mirrors those names rather than coining its own; freeside-characters does not
own Dixie or Straylight vocabulary and keeps its proof labels local and
test-only.

---

## 3. Phase 33G acceptance decision

> **Decision: ACCEPT Phase 33G as a bounded docs-only draft route-contract
> design — with two minor docs-only factual corrections — and NOT as
> implementation-ready.**

Specifically, Phase 33H:

- **Accepts** Phase 33G as a bounded docs-only **draft** route-contract design
  (§4 lists what it provides). It is a sound, well-scoped paper proposal that
  correctly self-bounds and correctly flags its own open questions.
- **Does not accept** Phase 33G as implementation-ready (§6).
- **Does not accept** Phase 33G as a final/canonical/production schema. The 33G
  Status block and §3 already deny this; this gate concurs.
- **Does not authorize** a route / API handler.
- **Does not authorize** live admission.
- **Does not authorize** storage writes.
- **Does not authorize** auth implementation.
- **Does not authorize** Freeside Characters runtime/client work.

### 3.1 Two minor corrections applied (PATCH, narrow)

Adversarial grounding found **no forbidden over-claim** in 33G — it never claims
route implementation is authorized, the Straylight review is complete, the 33E
probes are production schema, the contract is final, or implementation-readiness
is achieved. It is scrupulously self-bounded. However, two **factual claims about
repo reality** in 33G were verifiably inaccurate, so this gate applies the
*narrowest possible* docs-only corrections to the 33G text (and records them as a
33H correction note in that doc). These are wording fixes, **not** design
changes; they touch no probe, validator, fixture, or source code:

| # | Where (33G) | Was | Corrected to | Evidence |
|---|-------------|-----|--------------|----------|
| C-1 | §11 (refusal taxonomy) | "the existing **three-part** dotted namespace (`category.specific_reason`)" | "the existing **two-part** dotted namespace … a single `ingress`/`guard`/`seam` category prefix joined by one dot to a single underscore-reason" | `app/src/services/straylight-recall-intake/refusal-mapping.ts:10-33` — every `RefusalClass` member has exactly one dot (e.g. `ingress.invalid_request` :12, `seam.class_validation_failed` :29). The pattern `category.specific_reason` is itself two-part; 33G's own proposed `admission.*` codes are all two-part. "Three-part" was wrong about the repo and self-contradictory. |
| C-2 | §9.1 (response envelope) | "the validator currently **tolerates both**" receipt spellings | The validator **pins each section to its own spelling** (`receipt_split.public_receipt_ref` and `public_response.receipt_public_ref`) and cross-checks them for equality at `validate-fixtures.mjs:324`; a `public_response` using `public_receipt_ref` would **fail**. The reconciliation debt is two distinct names across two sections, not an unvalidated field. | `validate-fixtures.mjs:321-335` reads `public_response.receipt_public_ref` only (:324) and forbids `receipt_public_ref` on no-receipt scenarios (:332-333); it never reads `public_response.public_receipt_ref`. |

Both corrections **strengthen**, not weaken, the design: the underlying §9.1
two-spelling observation is real and remains a valid reconciliation item; only
the gloss on the validator's permissiveness was wrong. The §11 taxonomy proposal
is otherwise sound.

A third item the grounding flagged — the `Phase 45J / PR #177` citation — is
**not** a defect (see §2 grounding note); it is **verified as merged via GitHub**
(PR #177, merged June 6, 2026, merge commit `917b6c04`) and is correct per the
source chain. The local freeside checkout is merely stale (on the PR-head
branch), so its git tree is not authoritative for merged-PR status. **No
correction applied.**

> **Why ACCEPT-with-corrections rather than a clean ACCEPT or a REJECT.** The
> design's *scope and structure* are sound and require no rework, so REJECT is
> unwarranted. But Loa's grounding discipline (ALWAYS cite `file:line`; never
> propagate ungrounded claims across sessions) means leaving two verifiably-false
> repo statements inside a now-*accepted* artifact is not acceptable. The fixes
> are surgical and docs-only. This is the minimal honest disposition.

---

## 4. What Phase 33G proves / provides

Phase 33G provides, **on paper only**, all of the following (each is a draft
proposal for cross-repo review, not a frozen or authorized artifact):

- a **proposed future route identity**: `POST /api/admission/intake` (draft;
  distinct from the existing `POST /api/recall/intake` seam);
- **route purpose and non-goals** (candidate admission intake / transition
  decisions; explicitly not chat ingestion, not a general memory write API);
- a **draft request envelope** (version discriminator, identity binding,
  idempotency, candidate, transition request, source/audit/client context);
- a **candidate payload boundary** (private/admission-bound; never echoed;
  bounded/sanitized before any storage; `proposed`, not recallable pre-admission);
- **transition request variants** (accept → admitted `active`; reject →
  `transition_denied`, no assertion; supersede → `(superseded, active)` pair;
  malformed → fail-closed refusal);
- a **draft response envelope** with a public/private split;
- a **public/private no-leak boundary** (validator-enforced baseline + a
  route-contract-level "storage internals" extension, explicitly flagged as not a
  named validator category);
- a **draft refusal/error taxonomy** (existing Dixie `ingress.*`/`seam.*` codes
  for shape failures + a proposed `admission.*` family);
- **draft idempotency semantics** (mandatory key, scope sketch, replay/conflict
  behavior — all draft);
- a **storage write boundary** (contract-level only; no storage designed);
- an **auth/consent boundary** (service auth required; end-user consent required
  or explicit dev-only scope; cross-user admission blocked);
- a **recall eligibility projection** (boolean `recall_eligible` + canonical
  `RecallUseInstruction`, reconciling against Recall Wedge semantics);
- **route-contract test vectors mapped from all five Phase 33E v1 probes**
  (paper-only, non-executable);
- **Straylight primitive review dependencies** (the vocabulary questions the
  review must resolve or defer);
- **Freeside Characters client implications** (no live client; reconciliation-
  bound; test-only mirror today);
- **implementation preconditions** (an enumerated list, none satisfied);
- a **next-lane proposal** (this Phase 33H acceptance gate).

Grounding confirms these provisions are accurately anchored: the route seam,
refusal codes, `dev_signature`-is-not-a-backdoor, the PostgreSQL stores being
**not** admission storage, ADR-022E (gate #8) held, and the source-chain PR
numbers (33A–33G = #118–#124; 45I = #176; 45J = #177, verified merged on GitHub
June 6, 2026) all match repo / GitHub reality.

---

## 5. What Phase 33G does not prove

Phase 33G is a docs-only design draft. It does **not** prove (and does not claim
to prove) any of the following:

- route implementation readiness;
- storage model readiness;
- auth model readiness;
- production consent readiness;
- final idempotency semantics;
- final signer/authority semantics;
- production tenant/estate/actor identity binding;
- a completed Straylight primitive review (none exists; `straylight_primitive_review_complete: false` on every probe);
- a final public/private response schema (the `public_receipt_ref` /
  `receipt_public_ref` reconciliation, §9.1, is explicitly open);
- a production refusal/error taxonomy (the `admission.*` family is draft and
  exists in **no** source — grounding confirms zero `admission.*` members in the
  `RefusalClass` union);
- an operational logging / no-leak runtime policy;
- rollback / partial-failure implementation behavior;
- Freeside live client readiness;
- Discord command safety;
- `/remember-this` UX;
- public remember-this;
- chat-to-memory safety;
- a final production schema.

---

## 6. Implementation-readiness verdict

> **Verdict: NOT implementation-ready.**

The Phase 33G design is genuinely useful — it converts the Phase 33E semantic
probes into a coherent paper contract and names its own dependencies honestly —
but route implementation is **not close**. Unresolved dependencies remain across
every load-bearing axis:

- **storage write model** — undesigned; no Admission Wedge admission/estate/
  keyring/assertion storage exists (grounding CONFIRMED: only the in-process,
  non-durable `BoundedEstateStore` exists, and the PostgreSQL governance stores
  are **not** admission storage);
- **service authentication** — no admission auth exists anywhere (grounding
  CONFIRMED);
- **end-user authorization/consent model** — none exists; or an explicit,
  marked dev-only scope must be chosen;
- **Straylight primitive review** — required and **not complete**; no completed-
  review artifact exists, and this gate does not perform or claim it;
- **idempotency finalization** — `idempotency_final: false`; keying strategy
  undecided;
- **signer/authority finalization** — `authority_binding_final: false`; field
  names draft; this is not production auth;
- **tenant/estate/actor identity binding finalization** —
  `identity_binding_final: false`; `synthetic_binding: true`; production binding
  undefined;
- **no-leak operational logging policy** — undefined at runtime;
- **migration / backward-compatibility plan** if a storage schema is needed —
  absent;
- **executable route tests** — not written (the §16 33G vectors are paper-only);
- **rollback / partial-failure plan** — not designed, not implemented.

Because all of these remain open, implementation-readiness is **not** achieved,
and no route spike, storage write, auth implementation, or live admission is
authorized.

---

## 7. Design acceptance checklist

"Accept as design?" asks whether the 33G draft is a sound paper proposal for that
area. "Implementation-ready?" asks whether that area is resolved enough to build.
For nearly every row the answer is **accept as design = yes; implementation-ready
= no / not yet**.

| Area | Accept as design? | Implementation-ready? | Notes |
|------|-------------------|-----------------------|-------|
| A. Route identity (`POST /api/admission/intake`) | Yes | No | Draft path; consistent with the `/api/<wedge>/intake` convention. No admission route exists today (grounding CONFIRMED). |
| B. Route purpose / non-goals | Yes | No | Clear purpose + non-goals; restates the core invariant and blocked list. |
| C. Request envelope | Yes (draft) | No | Field names draft; types/required-status/version discriminator are later design + Straylight review outputs. |
| D. Candidate boundary | Yes | No | Private/admission-bound, never echoed; bounding/sanitization semantics undecided. |
| E. Transition variants | Yes | No | Four variants anchored on the five probes; no transactional write path designed. |
| F. Response envelope | Yes (draft) | No | Public/private split sound; field inventory draft. |
| G. Public/private no-leak boundary | Yes | Partly (probe-shape only) | Validator deep-walks probe JSON (grounding CONFIRMED); a live serializer + runtime logging policy do not exist. "Storage internals" is a route-contract extension, correctly flagged as not a named validator category. |
| H. Refusal/error taxonomy | Yes (draft) — **corrected** | No | `ingress.*`/`seam.*` reuse is grounded; `admission.*` family is draft and in no source. **§11 "three-part" corrected to "two-part"** (§3, C-1). |
| I. Idempotency semantics | Yes (draft) | No | Mandatory-key intent sound; keying strategy undecided (`idempotency_final: false`). |
| J. Storage write boundary | Yes (contract-level) | No | Correctly designs no storage; correctly states PG stores are not admission storage and grant no write authorization. |
| K. Auth/consent boundary | Yes (draft) | No | Service-auth-≠-consent boundary correctly load-bearing; cross-user admission blocked; `dev_signature` correctly described as not-a-backdoor (grounding CONFIRMED). |
| L. Recall eligibility projection | Yes (draft) | No | Boolean + canonical `RecallUseInstruction`; reconciliation against Recall Wedge is a Straylight review item. Only `usable` / `do_not_use_for_action` actually appear in the probes (grounding); 33G does not over-claim the other two values. |
| M. Route-contract test vectors | Yes (paper) | No | All five 33E scenarios mapped; explicitly non-executable; no test file exists. |
| N. Straylight primitive review | Yes (dependency stated) | No | Required and **not complete**; no completed artifact. 33G correctly refuses to claim completion. |
| O. Freeside Characters client implications | Yes | No | Correctly says no live client; reconciliation-bound; 45J authorized no export/runtime (grounding CONFIRMED). |
| P. Implementation preconditions | Yes (enumerated) | No | None satisfied or authorized. |
| Q. Naming / vocabulary | Yes (draft) | No | Canonical names aligned where they exist; Dixie-proposed names flagged draft. §9.1 receipt-spelling reconciliation open; **§9.1 validator gloss corrected** (§3, C-2). |
| R. Final schema status | Yes (correctly **unfrozen**) | N/A | 33G freezes nothing; this gate concurs. Not a production schema. |

---

## 8. Blocker inventory

"Blocks docs-only next step?" distinguishes blockers that prevent *implementation*
from blockers that would also prevent a further *docs/decision* phase. **Almost
none block a docs-only next step** — that is precisely why a docs/decision lane
(§10) is safe.

| Blocker | Why it blocks implementation | Blocks docs-only next step? | Recommended owner | Recommended next action |
|---------|------------------------------|-----------------------------|-------------------|--------------------------|
| A. Storage model | No admission write path / schema exists; a live route would have nowhere safe to write. | No | Dixie + Straylight + ADR-022E | Design storage write semantics (candidate / transition / assertion / receipt / supersession records) in a docs-only design gate. |
| B. Service auth | No admission auth exists; a live route would be unauthenticated or ad-hoc. | No | Dixie (ingress) | Define how a calling service authenticates to an admission route (docs-only). |
| C. End-user authorization/consent | Admission is a write path; service auth ≠ consent; cross-user admission must stay blocked. | No | Dixie + Straylight + governance | Define the consent boundary **or** an explicitly-marked dev/operator-only scope (docs-only). |
| D. Straylight primitive review | Canonical vocabulary (status, transition, signer, recall-eligibility, receipts) is Straylight-owned and unreviewed for admission. | No (a docs gate can *request* it) | Straylight | Issue a primitive-review request, or governance-defer it explicitly. |
| E. Idempotency finalization | A replayed admission must not double-write/double-mint; keying undecided. | No | Dixie (ingress) | Decide candidate-id-keyed vs header-keyed vs both (docs-only). |
| F. Signer/authority finalization | Field names + binding draft; not production auth. | No | Straylight (vocabulary) + Dixie (wire) | Resolve in the primitive review + auth design (docs-only). |
| G. Tenant/estate/actor identity binding | Synthetic-only today; production binding undefined; must be session-derived. | No | Dixie (ingress) + Straylight | Confirm session-derived (no caller override) + define production binding (docs-only). |
| H. Public/private audit boundary | Probe-shape no-leak is enforced; a runtime serializer + audit boundary are undesigned. | No | Dixie | Define the public field inventory + audit-only inventory + runtime no-leak (docs-only). |
| I. Refusal/error taxonomy finalization | `admission.*` family is draft, in no source; HTTP status mappings + public/private split undecided. | No | Dixie | Finalize the admission refusal taxonomy explicitly (docs-only), grounded in the **two-part** `category.specific_reason` namespace. |
| J. Rollback / partial-failure behavior | A multi-step admission write needs defined rollback; none designed. | No | Dixie + Straylight | Design partial-failure/rollback semantics (docs-only). |
| K. Migration / backward compatibility | Any future storage schema needs a versioning/compat plan; probes are not a frozen schema. | No | Dixie + Straylight | Define versioning/compat for a future contract revision (docs-only). |
| L. Operational logging / no-leak policy | Runtime logging could leak private material the probe checks don't cover. | No | Dixie | Define logging/audit that preserves the no-leak boundary at runtime (docs-only). |
| M. Freeside Characters client contract | A downstream client cannot rely on an unaccepted, reconciliation-bound contract. | No | Dixie (contract) / freeside (consumer) | Define what a client may rely on once a contract is finalized; no runtime change now. |
| N. Route test plan | The §16 vectors are paper-only; no executable/negative/no-leak tests exist. | No (a fixture/vector *draft* is docs/test-only) | Dixie | Convert design vectors into docs-only or isolated test-only fixture vectors (no live route). |

Every blocker above blocks **implementation**; **none** blocks a further
**docs/decision** phase. The implementation-readiness verdict (§6) follows
directly from this table: the blockers are numerous and unresolved, but they are
all addressable in docs/decision lanes before any build.

---

## 9. Next-lane options

| Option | Classification | Rationale |
|--------|----------------|-----------|
| **A — Implement route/API handler now** | **Reject / blocked.** | Every §8 blocker is unresolved; §6 verdict is not-ready. Implementation would bypass storage/auth/consent/review gates. Not authorized. |
| **B — Dev/operator-only route spike** | **Premature; not selected.** | Possible *later*, but only once storage write semantics, service auth, and an explicitly-marked dev-only scope (no end-user consent) are resolved on paper. The §8 storage/auth/consent blockers are **not** sufficiently bounded yet, so this gate does **not** authorize a spike. (A future gate that *did* authorize it would still not implement it.) |
| **C — Storage/auth/consent design gate** | **Strong candidate.** | Would design the §8.A/B/C preconditions that most directly gate implementation. Docs-only. |
| **D — Straylight primitive review request** | **Strong candidate / prerequisite.** | Could focus on vocabulary, identity binding, idempotency, recall eligibility, receipts/audit (§8.D/F/G + 33G §17). A docs-only request, not the review itself. |
| **E — Route-contract hardening / acceptance patch** | **Largely satisfied here; not a standalone next lane.** | 33G had only two minor factual defects, already corrected in §3. No further design defect warrants a dedicated hardening phase. |
| **F — Route test-vector fixture draft** | **Possible non-runtime next step.** | Could convert the 33G §16 design vectors into docs-only or isolated test-only fixture vectors without implementation. Lower-leverage than C/D until preconditions are decided. |
| **G — Implementation-readiness decomposition gate** | **Recommended.** | Several preconditions (§8.A–N) need ordering into sub-lanes before any spike; one phase to decompose them keeps the work docs/decision-only and prevents premature scope expansion. |

---

## 10. Selected next lane

> **Selected: Phase 33I — Admission Wedge implementation-readiness decomposition
> gate (docs / decision-only).**

**Purpose:**

- **Decompose the remaining §8 blockers into ordered lanes** before any route
  spike, so no single later phase silently bundles storage + auth + consent +
  review + idempotency together.
- **Decide sequencing**: whether to run the **Straylight primitive review**
  (Option D) first, the **storage/auth/consent design gate** (Option C) first,
  the **route test-vector fixture draft** (Option F) first, or to defer a
  **dev/operator-only route spike** (Option B) until its preconditions are
  bounded.
- **Define acceptance criteria** for a future dev/operator-only route spike and
  **what evidence** would be required before any route handler could be built.
- **Keep docs/decision-only.**

**Why decomposition rather than a single precondition gate.** The §8 inventory
shows the blockers are *many and interdependent* (storage ↔ idempotency ↔
rollback; auth ↔ consent ↔ identity binding; all ↔ the Straylight review). No
single blocker so clearly dominates that jumping straight into one design gate is
obviously correct, and bundling them risks an over-broad phase. A decomposition
gate sequences them safely and cheaply.

**Alternatives if a reviewer judges one blocker dominant:**

- **Phase 33I — Admission Wedge storage/auth/consent precondition design gate**
  (Option C) — if storage/auth/consent is judged the dominant, must-go-first
  blocker.
- **Phase 33I — Admission Wedge Straylight primitive review request** (Option D)
  — if governance prefers to sequence the canonical-vocabulary review ahead of
  any further Dixie design work.

All three are **docs/decision-only** and authorize **no** route, storage, auth,
consent, live behavior, or schema freeze. **Route implementation is not selected
under any option.**

---

## 11. Future Phase 33I boundaries

If the **implementation-readiness decomposition gate** lane is selected,
Phase 33I is bounded as:

**Allowed**

- docs / decision-only;
- split the §8 blockers into ordered lanes / sub-phases;
- decide whether the Straylight primitive review or the storage/auth/consent
  design comes first;
- define acceptance criteria for a future dev/operator-only route spike (without
  authorizing or implementing it);
- define what evidence would be required before any route handler can be
  implemented;
- update the decision-map / provenance docs minimally.

**Blocked**

- route / API handler implementation;
- a live admission route;
- storage writes;
- migrations;
- auth implementation;
- live calls;
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
- final schema freeze (unless separately authorized).

---

## 12. What remains blocked now

Phase 33H is an acceptance / decision gate. It authorizes none of the following;
each remains blocked:

- route / API handler implementation;
- a live admission route;
- storage writes;
- migrations;
- auth implementation;
- live calls;
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
- a completed Straylight primitive review claim;
- final idempotency semantics;
- production signer / authority semantics;
- production tenant / estate / actor identity binding;
- a final route contract (33G remains a *draft design*);
- route implementation readiness.

If a later phase reaches for any of the above, it must re-open the Phase 33E
probe artifacts, the Phase 33F readiness gate, the Phase 33G design (as corrected
here), this acceptance gate, and the relevant ADRs (ADR-022E durable-store gate;
ADR-026C / ADR-026D route guardrails — Straylight-repo decision records) first;
it must not silently expand scope.

---

## 13. Success criteria for Phase 33H

This phase succeeds if:

- it accurately **accepts, rejects, or patches** Phase 33G (§3 — ACCEPT with two
  minor docs-only corrections);
- it clearly states the **implementation-readiness verdict** (§6 — not ready);
- it **inventories the blockers** (§8);
- it **selects a safe next lane** (§10 — Phase 33I decomposition gate);
- it does **not** implement or authorize live route behavior;
- it does **not** mutate code, fixtures, probes, or the validator;
- it keeps all live/runtime/implementation lanes blocked (§12);
- Codex confirms the docs/decision-only scope.

---

## 14. Cross-references

> **Phase 33H acceptance note.** Phase 33H accepts the Phase 33G draft
> route-contract design as a bounded docs-only draft (not implementation-ready,
> not a final schema), applies two minor docs-only factual corrections to the
> 33G text (refusal namespace is **two-part** not three-part; the receipt-split
> validator is **strict per-section**, not "tolerant of both"), renders a
> **not-implementation-ready** verdict, inventories the blockers, and selects a
> docs/decision-only **Phase 33I implementation-readiness decomposition gate** as
> the next lane. It implements no route, mutates no probe or validator, writes no
> storage, adds no auth, and freezes no schema.

> **Phase 33I status note (added later).** The selected next lane was executed as
> Phase 33I
> ([`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)),
> a **docs/decision-only** decomposition gate. Phase 33I carries this gate's §8
> blocker table forward 1:1 (A–N, closing none), adds two synthesis meta-blocker
> rows (O route-implementation acceptance criteria; P production-readiness
> criteria), orders the blockers into future lanes (33J Straylight primitive
> review → 33K storage/auth/consent design → 33L route test-vector fixtures →
> 33M dev/operator-only spike **authorization** → 33N possible spike, **not
> authorized**), defines the evidence required before any route handler, and
> **selects Phase 33J (Straylight primitive review request)** as the next lane —
> with 33K permitted to proceed in parallel against draft vocabulary. It
> implements no route, mutates no probe or validator, and authorizes no spike,
> storage, auth, consent, or schema freeze.

- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)
  — Phase 33G draft route-contract design accepted (with the two §3 corrections)
  and assessed here. Carries a 33H correction note in its §9.1.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md)
  — Phase 33F readiness gate that selected the 33G design lane.
- [`docs/ADMISSION-WEDGE-PROBE-HARDENING-GATE.md`](ADMISSION-WEDGE-PROBE-HARDENING-GATE.md)
  — Phase 33D hardening-decision gate + Phase 33E status note; the source of the
  draft v1 probe vocabulary.
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md)
  — the draft v1 probe set, vocabulary table, and no-leak rules; the
  `public_response` shapes the 33G §16 vectors read from. Gains a minimal 33H
  status note.
- [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the dependency-free validator (read-only; not modified). Its strict
  per-section receipt-spelling enforcement (`:321-335`) grounds correction C-2.
- [`docs/ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md`](ADMISSION-WEDGE-FIXTURE-PROBE-ALIGNMENT-DECISION.md)
  — Phase 33B Dixie-first ownership decision and the five-scenario minimum set.
- [`docs/ADMISSION-WEDGE-CONTRACT-RESPONSE.md`](ADMISSION-WEDGE-CONTRACT-RESPONSE.md)
  — Phase 33A contract response, core invariant, and open route-design questions.
- [`docs/integration/phase-32e-recall-wedge-route-contract.md`](integration/phase-32e-recall-wedge-route-contract.md)
  — the Recall Wedge route contract the 33G design is modelled on; `POST
  /api/recall/intake` is the seam the Admission route must stay distinct from.
- `app/src/routes/recall-intake.ts`,
  `app/src/services/straylight-recall-intake/refusal-mapping.ts`,
  `app/src/config.ts`, `app/src/server.ts` — inspected **read-only** to ground
  the route-seam (`POST /api/recall/intake`, mounted `server.ts:602-603`, gated on
  `config.recallIntakeEnabled` `server.ts:567`), the **two-part** refusal
  namespace (`refusal-mapping.ts:10-33`), `dev_signature` as an inert enum member
  (`recall-intake.ts:95-100,153`, not a backdoor), and the storage reality
  (PostgreSQL governance stores are **not** admission storage;
  `BoundedEstateStore` is in-process/non-durable). None is modified.
- `@loa/straylight` — canonical primitive/substrate owner of the assertion
  lifecycle and vocabulary. **No Straylight primitive review has been performed**
  (33G §17). ADR-022E (gate #8 held), ADR-026C, ADR-026D are Straylight-repo
  decision records (`loa-straylight/docs/decisions/`), cited by the Dixie chain as
  guardrails; the IDs are real, not fabricated.
- freeside-characters `docs/ADMISSION-WEDGE-DIXIE-V1-MIRROR-REFRESH-ACCEPTANCE-GATE.md`
  (Phase 45J / PR #177, **verified merged on GitHub** June 6, 2026, merge commit
  `917b6c04`) — the cross-repo acceptance that **recommended Dixie Phase 33F** as
  the next readiness gate; it did not select or authorize Phase 33G. The Freeside
  mirror/adapter proof remains **test-only**, not exported, wired to no runtime
  path (grounding CONFIRMED).
