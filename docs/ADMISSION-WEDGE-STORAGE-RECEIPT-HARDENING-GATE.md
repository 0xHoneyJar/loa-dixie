# Phase 33P — Admission Wedge Storage / Receipt Hardening Decision Gate

> **Phase**: 33P
> **Branch context**: `phase-33p-admission-storage-receipt-hardening`
> **Related**: Dixie Phase 33A–33O (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle, signer/keyring, receipt/audit,
> and storage-adapter primitives
> **Status**: **docs / decision-only.** No route, route handler, storage, store
> code, DB write, migration, auth, consent, test, validator, fixture/vector JSON,
> config, package, lockfile, CI, generated, or live-integration change.
> **This is a storage/receipt-posture decision gate, not implementation.** It
> decides the storage/receipt posture for the *next* implementation lane after the
> Phase 33N no-store route spike, **selects Option B for a possible future Phase
> 33Q** (a dev-only, disabled-by-default, non-production, bounded *synthetic*
> admitted-assertion store), and **explicitly rejects production-like durable
> storage**. It implements **no** store, writes **no** storage, adds **no**
> migration, auth, or consent, changes **no** route handler, and authorizes **no**
> production behavior. It does **not** freeze a final/production schema and does
> **not** complete the Straylight primitive review.

This document is the Dixie-side **storage/receipt hardening decision gate** that
follows the Phase 33O acceptance of the Phase 33N dev/operator-only Admission
Wedge route spike (**PR #132**, commit `f44dd702`), which was accepted by Phase
33O (**PR #133**, commit `db14ab40`) **only** as a bounded, disabled-by-default,
dev/operator-only route spike on **Storage Option A — no durable storage**
([`ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md)).
It answers one question and stops there: **after the no-store spike, what is the
safest storage/receipt posture for the next implementation lane — and what would
that lane have to prove?** It implements no store, mutates no
source/test/validator/fixture/vector, writes no storage, and authorizes no live
or production behavior.

Every assessment below is grounded against the prior docs chain (33H–33O) and
the read-only Phase 33N source those gates already assessed. This gate
independently re-verifies nothing in code; it carries the Phase 33O §4 grounding
forward and reasons about the *next* posture. Where a claim is carried from a
sibling checkout or an external merge state that may be stale, that is flagged.

> **This phase does not complete the Straylight primitive review.** Phase 33J
> issued the §5 review register (A–O) and **confirmed no completed Straylight
> Admission-Wedge primitive-review artifact exists**; the genuinely-unresolved
> rows (E, G, H, K, N, O) and the review-dependent/non-final row (J) remain open.
> Phases 33K–33N carried them forward (in code:
> `ADMISSION_SPIKE_UNRESOLVED_ROWS = ['E','G','H','K','N','O']`,
> `ADMISSION_SPIKE_REVIEW_DEPENDENT_ROWS = ['J']`), and Phase 33O kept them
> **unresolved**. This gate keeps them unresolved; their disposition for any
> future synthetic store remains the **explicit, narrow, spike-scoped deferral**
> Phase 33M defined — **never** a resolution, and **never** for production.

---

## 1. Phase status

- **Phase 33P — Admission Wedge storage / receipt hardening decision gate.**
- Dixie-side **docs / decision-only**.
- Follows Dixie Phase 33O / PR #133 (route-spike acceptance gate, commit
  `db14ab40`), which accepted Phase 33N / PR #132 (commit `f44dd702`) as a bounded
  dev/operator-only route spike and selected **this** Phase 33P as the next lane
  (33O §9).
- This is a **storage/receipt posture decision gate**, not storage implementation,
  not route implementation, and not route-spike authorization (33M already did
  that for the no-store spike; this gate does **not** re-authorize it and does
  **not** authorize any new store).
- It **selects Option B** — authorize a *future* Phase 33Q dev-only, bounded,
  disabled-by-default, non-production **synthetic** admitted-assertion store — and
  **rejects Option D** (production-like durable storage) outright (§6–§8).
- Phase 33P **itself remains docs-only**: it builds **no** store, performs **no**
  storage write, adds **no** migration, and changes **no** route handler.
- It changes **no** routes, route handlers, storage, store code, auth, consent,
  validators, probes, fixture/vector JSON, source code, configuration, CI,
  lockfiles, or production schema.
- It does **not** freeze a final/canonical/production schema.
- It does **not** mutate the Phase 33N route handler, the spike service modules,
  their tests, the Phase 33E probe JSONs, the Phase 33L route-vector JSONs, or
  either docs validator. Per the Phase 33D §6 invariant — any
  probe/validator/fixture mutation requires its own separately-gated phase —
  Phase 33P inspects all of them **read-only**.
- It does **not** authorize anything beyond the bounded, future, synthetic store
  decision of §7–§8: it does **not** authorize production admission, durable
  production Admission Wedge storage, production auth/consent, a public
  `remember-this`, Discord command/history ingestion, user chat becoming memory,
  Freeside Characters runtime/client integration, or package exports (§13).

The audience for this document is **future Dixie phases** (primarily the possible
Phase 33Q named in §15), the **Straylight (`@loa/straylight`) primitive owner**
(whose A–O answers remain the gating production exit criteria), and
**freeside-characters** as an interested-but-blocked downstream consumer (§13).

---

## 2. Inputs / provenance

This gate sits one rung above the Phase 33O acceptance gate on the Dixie
Admission Wedge ladder. It introduces no new contract material and freezes
nothing; it reads the chain read-only, decides the next storage/receipt posture,
and names the next lane.

### Dixie (loa-dixie)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33I | #127 | Implementation-readiness decomposition gate — orders the blockers into lanes (33J → 33K → 33L → 33M → 33N); defines the evidence required before any route handler. ([`ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)) |
| 33J | #128 | Straylight primitive-review **request** / vocabulary-dependency gate — issues the §5 fifteen-item review register (A–O); flags genuinely-unresolved rows **E, G, H, K, N, O** and review-dependent/non-final row **J**. **Did not complete the review.** ([`ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)) |
| 33K | #129 | Storage/auth/consent precondition **design** gate — designs (on paper) the §6 draft storage record categories (6.1–6.11), service-auth and consent model *options*, a dev/operator-only scope option, an idempotency precondition, a no-leak posture, and a threat model. **Implemented no storage/auth/consent.** ([`ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)) |
| 33L | #130 | Route-contract **test-vector fixture draft** — converts the Phase 33G §16 design vectors (A–E) into five non-runtime route-contract test-vector fixtures plus a Node-built-ins-only validator. **Implemented no runtime route tests and no route.** ([`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)) |
| 33M | #131 | Dev/operator-only route-spike **authorization** gate — authorizes (does not implement) the Phase 33N spike under strict §7–§15 constraints; its §7 storage posture names **Option A (preferred) / Option B (acceptable, env-gated synthetic bounded store) / Option C (production-like, *not* authorized)**. ([`ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)) |
| 33N | #132 | Dev/operator-only route-spike **implementation** (commit `f44dd702`) — implements the disabled-by-default `POST /api/admission/intake` route spike on **Storage Option A (no durable storage)**, the spike service modules, the gated config/server wiring, the env docs, the dev-spike runbook, and the spike tests, all under the Phase 33M §7–§15 constraints. **Authorized no production admission, durable storage, production auth/consent, Freeside integration, or package export.** (`app/src/routes/admission-intake.ts`; `app/src/services/admission-wedge-spike/`; [`docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md)) |
| 33O | #133 | Route-spike **acceptance** gate (commit `db14ab40`) — accepts Phase 33N **only** as a bounded, disabled-by-default, dev/operator-only route spike for MVP 2 (the Admissible Layer); states it does **not** complete MVP 2 and authorizes no production / durable-storage / Freeside lane; selects **this** Phase 33P storage/receipt hardening decision gate (its §9). ([`ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md)) |
| **33P** | *(this doc; docs/decision-only — not committed/merged yet)* | **Storage / receipt hardening decision gate — selects Option B for a possible future Phase 33Q (dev-only bounded synthetic admitted-assertion store); rejects production-like durable storage (Option D); defines what 33Q would have to prove; preserves every blocked lane; selects Phase 33Q.** |

### Freeside Characters (freeside-characters)

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 45I | #176 | Dixie v1 mirror-refresh / adapter compatibility implementation — local mirrors and adapter track `dixie_admission_wedge_probe_v1`, **test-only**; v0 fails closed as `unknown_probe_version`. The adapter is a **pure, fixture-bound semantic mapping layer with no live Dixie call**. |
| 45J | #177 | v1 mirror-refresh acceptance / next-lane decision gate — accepts the 45I proof for its bounded test-only purpose; authorizes no live client, no package export, no runtime wiring; confirms **live Dixie calls: absent**. **Verified MERGED on GitHub (merged 2026-06-06).** |

> **Grounding note on the 45J / PR #177 citation.** GitHub confirms
> freeside-characters **PR #177 is MERGED** (merged 2026-06-06). The local
> `../freeside-characters` checkout is **stale** for PR status (it sits on the
> PR-head branch, not the merge); GitHub's merged state — not the local tree —
> remains authoritative for PR status (carried from the Phase 33H–33O grounding
> notes).

### Straylight (`@loa/straylight`)

The canonical primitive/substrate owner of the assertion-lifecycle,
signer/keyring, receipt/audit, and storage-adapter vocabulary. Read-only in
`../loa-straylight`. **No Straylight artifact naming an "admission wedge",
"assertion intake", or admission route/endpoint was found** (carried from 33J §2
/ 33K §2 / 33M §2 / 33O §2); the local checkout may be stale. This gate treats
the §5/A–O review register as **unresolved**, exactly as Phases 33J–33O did, and
notes that the **durable estate store is gated by ADR-022E (held)** and route
guardrails by ADR-026C / ADR-026D (Straylight-repo decision records).

> **Cross-repo phase-numbering caution.** Dixie's 33-series and the
> freeside-characters 45-series are independent labels in separate repositories
> and must not be conflated.

---

## 3. What Phase 33N proved

Phase 33O §4 already established these read-only against the merged Phase 33N
source; this gate carries them forward as the **floor** the next posture must
preserve. Phase 33N proved, **for a disabled-by-default, dev/operator-only,
NON-PRODUCTION route spike** — nothing more — that:

- **the route shape and gating hold.** The route is not registered unless
  `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`; even mounted, the handler re-checks
  `deps.enabled` and returns a safe 404; the dev/operator gate (dedicated
  `x-admission-service-token` + `x-admission-operator-id`) sits behind the global
  `/api/*` allowlist and fails closed when both credential sources are empty
  (33O §4);
- **the request shape is strict and synthetic.** A strict Zod schema accepts only
  the synthetic non-production marker (`spike: 'admission_intake_dev_spike_v0'`)
  plus the draft `transition_intent` discriminator, mapping the five Phase 33L
  scenarios (pending / accept / reject / supersede / malformed) 1:1 with no sixth
  scenario; everything else fails closed (33O §4);
- **Storage Option A holds — nothing durable is minted.** No DB writes, no
  migrations, no persisted candidate/assertion; **safe future-intent receipts /
  public-safe outcomes only**; rollback is trivial because there is no durable
  state (33O §4);
- **the no-leak boundary holds.** Every public response is finalized through one
  guarded send path that deep-walks the body through the runtime no-leak guard
  before serialization, mirroring the Phase 33L validator denylist, with a
  hardcoded fail-closed fallback that carries none of the guard's findings (33O §4);
- **the draft markers are asserted false on every response** (`schema_final`,
  `route_contract_final`, `production_admission`,
  `straylight_primitive_review_complete`, `idempotency_final` all false, plus the
  carried unresolved rows E, G, H, K, N, O and review-dependent row J) (33O §4);
- **the boundaries are test-guarded** — forced-leak/throwing-guard fail-closed
  across every response path, the five scenarios, the auth gate, the default-off
  posture, and parser-backed scope guards proving no durable-write/SQL, no
  Freeside import, no `@loa/straylight` import, no DB/store/migration import, and
  no package export (33O §4).

In short: Phase 33N proved the **route surface** of admission — *shape, gating,
fail-closed, no-leak* — for a synthetic, no-store, dev/operator-only slice.

---

## 4. What Phase 33N did not prove

Phase 33O §5 already enumerated this read-only; carried forward here because it
is precisely the gap this gate sequences. Phase 33N did **not** prove (and did not
claim to prove):

- **real admitted-assertion persistence** — the "admitted" outcome mints only a
  fixed synthetic public placeholder, not a stored assertion;
- **real recall eligibility from a store** — `recall_eligible` is a deterministic
  draft flag over synthetic placeholders, not a query against any store;
- **a status / provenance / receipt-like audit record that actually exists** — the
  receipt is a future-intent placeholder, not a record an admitted assertion
  carries;
- **that a pending candidate is durably *not admitted and not recallable*** — only
  the public shape of "pending" is proven, not the absence of a stored admitted
  assertion;
- **that a rejected candidate durably *creates no admitted assertion*** — proven
  only as a public outcome class, not as store state;
- **that a malformed/unsafe candidate *creates no admitted assertion*** while
  failing closed — proven as a public refusal, not as store state;
- **supersession/correction pointing recall at a corrected-active assertion while
  preserving the prior's audit/provenance** — modeled as a synthetic placeholder,
  not exercised against stored records;
- **production admission, durable Admission Wedge storage, production auth/consent,
  end-user authorization, public `remember-this`, Discord ingestion, chat-to-memory,
  Freeside runtime/client integration, or package exports** — none exists (33O §5);
- **a final/canonical/production schema, a completed Straylight primitive review,
  final idempotency, production signer/authority, production tenant/estate/actor
  binding, a final route contract, or production readiness** — every draft marker
  is false and these remain blocked (33O §5).

The common thread: Phase 33N stands in for the **governed transition's effect on
state** with deterministic synthetic placeholders. It never demonstrates that an
admitted assertion *exists*, *carries a status/provenance/receipt-like record*,
or that pending/rejected/malformed candidates *leave no admitted state* — because
there is no store to hold or deny that state.

---

## 5. Why storage/receipt hardening is the next bottleneck

The Phase 33O §6 MVP 2 gap is dominated by one missing proof: the full governed
transition

> candidate → an admitted assertion **actually exists** → that assertion **has a
> status / provenance / receipt-like record** → **recall can include it** →
> pending / rejected / malformed candidates **cannot** be recalled and **leave no
> admitted state**.

Phase 33N proved the *route surface* of this transition but stubbed every
*stateful* step with synthetic placeholders. The next bottleneck is therefore not
more route surface — it is the **smallest safe way to prove the transition has a
real effect on retrievable state** without reaching for any blocked lane.

This is genuinely a *decision* and not an obvious next step, because the obvious
move (build durable admission storage) is blocked on three independent gates that
this chain has deliberately not opened:

1. the **Straylight primitive review (A–O)** remains unresolved — in particular
   rows B (assertion lifecycle), E (recall-eligibility representation), H
   (receipt/audit relationship), K (public/private projection), and O
   (storage/audit primitive boundary) directly govern what a *real* admitted
   assertion + receipt would look like (33J §5; 33K §6);
2. the **durable estate store is gated by ADR-022E (held)** in Straylight; Dixie's
   only existing non-durable estate store is the Recall path's in-process
   `BoundedEstateStore`
   (`app/src/services/straylight-recall-intake/bounded-estate-store.ts`), and the
   PostgreSQL stores are governance/reputation/fleet — **not** admission storage
   (33I §5; 33K §6 lead-in);
3. the **route contract is not final** (`route_contract_final:false`); Phase 33G
   remains a draft design (33H), so freezing a storage schema now would freeze
   against a draft contract.

So the question is **not** "should we build admission storage?" — that is blocked.
The question is "**can we prove the transition's stateful effect against
*synthetic* state, behind the same default-off dev/operator gate, without a
schema, a migration, a real receipt, or any blocked lane?**" Sequencing that
decision as a docs-only gate — exactly as 33H→33I→…→33M sequenced the spike
authorization — is what keeps the next implementation lane from silently
acquiring durable storage, a production receipt, or a frozen schema.

---

## 6. Option analysis: A / B / C / D

The four candidate postures for the **next** implementation lane (not for Phase
33P itself, which implements nothing):

### Option A — remain no-store

Continue exactly as Phase 33N: future-intent / synthetic-placeholder outcomes
only, no store of any kind.

- **Pros:** zero new state; rollback stays trivial; no new no-leak surface; no
  risk of a synthetic store being mistaken for real storage; stays furthest from
  ADR-022E and the unresolved review.
- **Cons:** proves nothing new. The §5 bottleneck — *does the transition have a
  real effect on retrievable state?* — stays entirely unproven. The route surface
  is already accepted (33O), so another no-store lane would be redundant.
- **Verdict:** insufficient. Does not advance MVP 2; the route surface it would
  re-exercise is already proven and accepted.

### Option B — authorize a future dev-only bounded synthetic admitted-assertion store

A non-production, **disabled-by-default**, dev/operator-only, in-process/bounded
**synthetic** store (mirroring **only the operational properties** of the Recall
`BoundedEstateStore` — see the operational-property-precedent note below) that
holds only synthetic estate/actor/candidate material, exercised behind the same
default-off env + dev/operator gate, to prove the transition's stateful effect:
that an accepted candidate creates/references a synthetic admitted assertion with
a status/provenance/receipt-like audit record, that pending/rejected/malformed
leave no admitted assertion, and that supersession can repoint recall while
preserving prior provenance — **all over synthetic data, with no production
storage/auth/consent claim, no migration, and no raw payload persistence**.

- **Pros:** directly closes the §5 bottleneck against synthetic state; follows the
  Recall `BoundedEstateStore` as an **operational-property precedent only** (the
  same process-local, capacity-bounded, tenant-scoped, non-durable, fail-closed,
  testable-without-production-storage properties — **not** its code, types,
  adapters, or schema; see the operational-property-precedent note below) and reuses
  the proven Phase 33N gating + no-leak guard; needs no migration, no DB, no schema
  freeze, and no ADR-022E; keeps rollback bounded (in-process, ephemeral); the
  synthetic store is a *test/dev instrument*, not a storage product.
- **Cons:** introduces real (if ephemeral/synthetic) state and therefore a real
  partial-write/consistency surface and a new no-leak surface (status/provenance/
  receipt projections); must be bounded and fail-closed to avoid being mistaken
  for, or quietly becoming, durable storage; touches the receipt/audit vocabulary
  (rows H/K/O) that the Straylight review has not resolved, so every record it
  mints must stay explicitly synthetic and non-final.
- **Verdict:** **the smallest posture that actually advances MVP 2** while staying
  inside every existing block. Acceptable **only** as the bounded, future,
  synthetic Phase 33Q of §7–§8.

> **Operational-property precedent only — what "mirroring" / "reuses the proven
> `BoundedEstateStore` shape" means (and does not mean).** Every reference in this
> gate to a Phase 33Q synthetic store "mirroring" or following the Recall
> `BoundedEstateStore` is an **operational-property precedent only**. The
> comparison is **strictly** to these operational properties:
>
> - **process-local** (in-process; no durable backend);
> - **capacity-bounded** (a defined, fail-closed capacity limit);
> - **tenant-scoped** (synthetic estate/actor isolation);
> - **non-durable** (ephemeral; gone on process restart);
> - **fail-closed** (defined behavior at the limit and on conflict);
> - **testable without production storage** (no DB, migration, or live backend).
>
> The phrase does **not** imply, authorize, or bring nearer any of: **code reuse**;
> **type reuse**; **adapter reuse**; **schema authority**; **admission suitability**;
> **durable storage**; **production readiness**; or that **Recall store semantics
> automatically apply to the Admission Wedge**. The Recall store is cited as a
> demonstrated *operational shape* that a bounded synthetic dev instrument can match
> — **not** as a component to import, a type/schema to inherit, or an authority that
> settles any Admission Wedge semantics. A Phase 33Q store's identity, status,
> provenance, and receipt/audit semantics remain governed by the unresolved
> Straylight primitive review (A–O), exactly as §8/§10/§12 hold.

### Option C — decompose before implementation

Split storage, receipt, idempotency, signer/authority, and actor/estate binding
into smaller, separately-gated lanes before any store implementation.

- **Pros:** maximally conservative; mirrors the 33I decomposition that served this
  chain well; isolates the unresolved-review-bound concerns (idempotency J,
  signer/authority F, binding G, receipt/audit H, projection K, boundary O) into
  their own gates.
- **Cons:** the concerns are **already** decomposed at the design level — 33K §6
  inventories eleven record categories (6.1–6.11) with per-row primitive-review
  dependencies and per-row before-dev-spike vs before-production requirements, and
  33M §7/§11/§13 already separated storage posture, idempotency stance, and
  auth/consent stance. Re-decomposing on paper a third time would add a gate
  without adding evidence; the bottleneck is now *demonstration against synthetic
  state*, not further paper decomposition.
- **Verdict:** largely **already done** by 33K/33M. Its conservatism is preserved
  by folding it into Option B's boundary: the synthetic store proves only the
  bounded transition properties, and the unresolved-review-bound semantics
  (idempotency, signer/authority, binding, receipt/audit) stay **explicitly
  non-final** rather than being "decided" by the spike (§7, §12).

### Option D — production-like durable storage

A real, durable admission write path (DB tables, migrations, persisted
candidate/assertion/receipt records).

- **Pros:** none available now — it is blocked.
- **Cons:** requires the unresolved Straylight primitive review (A–O), the held
  ADR-022E durable-store gate, a final route contract, and production auth/consent
  — none of which exists. This is precisely Option C of 33M §7 ("production-like
  storage write path"), which 33M did **not** authorize.
- **Verdict:** **rejected for now. Not authorized.** Any durable production
  Admission Wedge storage requires a separate, later, explicitly-named production
  storage gate after the Straylight review and ADR-022E.

---

## 7. Selected decision

> **Decision: SELECT Option B — authorize a *possible future* Phase 33Q
> dev-only, disabled-by-default, non-production, bounded *synthetic*
> admitted-assertion store — and REJECT Option D (production-like durable storage)
> outright. Phase 33P itself remains docs/decision-only and implements no store,
> no write, no migration, no auth, no consent, and no route change.**

Concretely, this gate states:

- **Phase 33P implements nothing.** It writes no storage, builds no store code,
  adds no migration, mounts no route, and changes no handler. It is a decision
  gate only.
- **The selected posture for the next implementation lane is Option B** — a
  bounded, dev/operator-only, disabled-by-default, **non-production synthetic**
  admitted-assertion store (following the Recall `BoundedEstateStore` as an
  **operational-property precedent only** — process-local, capacity-bounded,
  tenant-scoped, non-durable, fail-closed, testable without production storage; **no**
  code/type/adapter/schema reuse, see the §6 operational-property-precedent note), so
  a later spike can exercise the candidate → admitted-assertion → recall-includes
  transition **against synthetic data only**.
- **Option A is rejected as insufficient** — it would advance nothing the
  already-accepted route surface has not proven.
- **Option C's conservatism is preserved inside Option B's boundary** — the
  unresolved-review-bound semantics (idempotency, signer/authority,
  tenant/estate/actor binding, receipt/audit) stay **explicitly non-final**; the
  store proves bounded transition properties, not final semantics (§12).
- **Option D is rejected and not authorized** — production-like durable storage
  remains blocked behind the Straylight primitive review (A–O), the held ADR-022E
  durable-store gate, a final route contract, and production auth/consent.
- **This selection does not authorize Phase 33Q to run.** Phase 33Q is authorized
  **only if** this Phase 33P doc lands cleanly and **only** within the §8
  boundary; a future Phase 33Q implementation lane must itself proceed through the
  framework's implement → review → audit cycle. This gate confers no production
  readiness, freezes no schema, and completes no Straylight review.

---

## 8. Future Phase 33Q authorization boundary

A future Phase 33Q, **if pursued**, is authorized by this gate **only** as a
dev-only bounded synthetic admitted-assertion store, and is limited to **all** of
the following — every item is a hard boundary, not a default:

- **disabled by default** (a dedicated env gate, off unless explicitly enabled,
  mirroring `config.recallIntakeEnabled` / `DIXIE_ADMISSION_INTAKE_ENABLED` / the
  Phase 32K dev-seed gate);
- **dev/operator-only** (behind the existing dev/operator + global-allowlist
  gating proven by Phase 33N; no public surface);
- **non-production**;
- **synthetic estate/actor/candidate material only** (no real user data, no real
  estate, no cross-user material);
- a **bounded admitted assertion store** (in-process / bounded; following the Recall
  `BoundedEstateStore` as an **operational-property precedent only** — process-local,
  capacity-bounded, tenant-scoped, non-durable, fail-closed, testable without
  production storage; **no** code/type/adapter/schema reuse, see the §6
  operational-property-precedent note; ephemeral, capacity-bounded);
- **no production storage claim**;
- **no production auth/consent claim**;
- **no migrations** unless a later, separately-named gate explicitly authorizes
  them;
- **no raw candidate payload persistence** (store synthetic identity/status/
  provenance references only; never the raw candidate body/source/reasons);
- **no public `remember-this`**;
- **no Discord command / history ingestion**;
- **no user chat becoming memory**;
- **no Freeside Characters runtime / client integration**;
- **no package exports** (no `src/index.ts` re-export; the service barrel stays
  internal, as in Phase 33N);
- **no final schema freeze**;
- **no completed Straylight primitive-review claim** (A–O stay unresolved; rows
  E, G, H, K, N, O and review-dependent J carried forward as draft markers);
- **no production route readiness claim**;
- **no final idempotency semantics** (`idempotency_final` stays false);
- **no final signer/authority semantics**;
- **no final tenant/estate/actor binding semantics** (`identity_binding_final`
  stays false; synthetic binding only).

In addition, a Phase 33Q must **inherit, unchanged**, the Phase 33N safety floor
(§3): disabled-by-default mount, defense-in-depth disabled check, dev/operator
gate behind the global allowlist, strict synthetic request shape, fail-closed on
everything else, the single guarded no-leak send path over **every** response
(including any new status/provenance/receipt projection), and the carried-forward
false draft markers. The synthetic store is **additive behind the gate**; it must
not weaken any Phase 33N boundary.

> **Phase 33Q is not authorized to run by this gate alone.** It is authorized
> **only if** this Phase 33P doc lands cleanly **and** the implementation stays
> within this §8 boundary. Any drift toward a blocked lane (§13) voids the
> authorization and requires a new, explicitly-named gate.

---

## 9. Required 33Q proof cases

If Phase 33Q is pursued within the §8 boundary, it would need to prove **all** of
the following, **entirely over synthetic estate/actor/candidate material** and
**without raw candidate payload persistence**:

1. **Accept → admitted assertion exists.** An accepted candidate **creates or
   references a synthetic admitted assertion** in the bounded store (candidate →
   transition → admitted assertion, with canonical-aligned `active` status — not a
   coined `admitted` status).
2. **Admitted assertion carries a status/provenance/receipt-like audit record.**
   The synthetic admitted assertion has a **status**, a **provenance** link back to
   its source candidate/transition, and a **receipt-like audit record** — all
   synthetic and explicitly non-final (not a production receipt; see §10).
3. **Pending stays not-admitted and not-recallable.** A pending candidate **creates
   no admitted assertion**, remains `proposed`/pending, and is **not** returned by
   any recall-eligibility projection over the store.
4. **Reject creates nothing and is not recallable.** A rejected candidate (explicit
   denied transition) **creates no admitted assertion** and is **not** recallable;
   the store holds no admitted state for it.
5. **Malformed/unsafe fails closed and creates nothing.** A malformed/unsafe
   candidate **fails closed** (stable public-safe refusal) and **creates no
   admitted assertion**; the store is left unchanged.
6. **Supersession/correction repoints recall while preserving prior provenance.** A
   correction can **point ordinary recall toward the corrected active assertion**
   while the **superseded prior remains audit/provenance only** — recall includes
   the corrected-active member of the `(superseded, active)` pair only, and the
   prior's audit/provenance survives.
7. **No-leak holds over the public response.** The public response **does not leak**
   private / source / debug / operational fields — no raw candidate payload, source
   material, raw reasons, private/audit fields, operational tenant/estate/actor IDs,
   idempotency keys, authority/signature material, tokens/secrets/URLs, stack
   traces/debug internals, storage internals, or long opaque IDs (§11).
8. **Bounded-store safety holds — isolation, capacity, atomicity, no residue, replay/conflict, ephemerality.**
   The bounded synthetic store must demonstrably satisfy **all** of the following,
   entirely over synthetic estate/actor/candidate material:
   - **tenant/estate isolation** — synthetic estate/actor scoping keeps one synthetic
     estate's (or actor's) admitted assertions structurally unreachable from
     another's; **no** cross-estate / cross-actor read or write;
   - **capacity-limit failure behavior** — at the bounded capacity limit the store
     fails in a **defined, tested, fail-closed** way (bounded rejection or bounded
     eviction under a stated policy) rather than growing unbounded or corrupting
     existing synthetic state;
   - **atomic partial-failure handling** — a transition whose write fails partway
     either completes **fully** or leaves the store **exactly as it was**; no
     half-applied synthetic admitted assertion;
   - **no partially admitted residue** — a failed or aborted admission leaves **no**
     partially-minted synthetic admitted assertion, status, provenance, or
     receipt/audit fragment;
   - **no residual recallable state after failed writes** — a write that fails leaves
     **nothing** any recall-eligibility projection would return; the failed candidate
     is **not** recallable;
   - **replay without duplicate assertion minting** — replaying the **same** synthetic
     request does **not** mint a second synthetic admitted assertion (spike-scoped
     de-duplication; §12);
   - **conflicting replay fails closed** — a replay that **conflicts** with prior
     synthetic state **fails closed** with a stable public-safe refusal rather than
     overwriting, forking, or corrupting state (§12);
   - **process-local ephemerality** — the store is **in-process and ephemeral**; it
     holds **no** durable backend, file, or DB handle;
   - **process restart leaves no durable admitted-assertion residue** — a synthetic
     admitted assertion created before a process restart is **gone** after it,
     proving **no** durable admitted-assertion residue survives the process;
   - **identity/status/provenance observable without raw payload persistence** — the
     synthetic admitted assertion's **identity, status, and provenance stay
     observable and testable** (that it exists, is `active`, links to its source)
     **without** the store ever persisting the raw candidate payload.
9. **The receipt/audit record explains what happened without being a production
   receipt.** A receipt/audit record can **explain the outcome** (what transition
   occurred, with what synthetic provenance) **without** claiming to be — or
   becoming — a production receipt (§10).

Each proof case must be demonstrated **behind the default-off gate**, on
synthetic material, with the Phase 33N no-leak guard applied to every public
response. None of these proof cases authorizes durable storage, a real receipt, a
final schema, or any blocked lane.

---

## 10. Receipt / audit hardening requirements

For any Phase 33Q synthetic receipt/audit record (proof cases 2 and 9), the
following are **hard requirements**, drawn from the 33K §6.6/§6.7 record shapes
and the 33E receipt-split model — all **synthetic and explicitly non-final**:

- **Public/private split preserved.** A **public-safe receipt reference** (the
  `public_receipt_ref` / `receipt_public_ref` two-spelling stays unreconciled and
  non-final) may appear on the public response **only** where a receipt is minted;
  it must be `null` for the pending and fail-closed outcomes that mint no public
  receipt (33K §6.6). The **full receipt/audit detail stays private** — never
  serialized to a public response (33K §6.7).
- **Audit record is provenance, not product.** The synthetic audit record may
  carry an `audit_event` class (e.g. `assertion_admitted` / `transition_denied`),
  a synthetic provenance link, and `audit_private: true`/`public_audit_detail:
  false` markers — but it must **explain** the outcome, not **claim** to be a
  production receipt. `production_admission` and any production-receipt claim stay
  **false**.
- **No real receipt vocabulary frozen.** The receipt/audit shape stays a **draft**
  mapping toward the Straylight receipt vocabulary (`TransitionReceipt` /
  `RecallReceipt` / `AuditEvent`), which row H (receipt/audit relationship) and row
  K (projection) of the unresolved review still govern. Phase 33Q freezes **no**
  receipt schema and **completes no** review.
- **Append-only audit posture, synthetic only.** If the synthetic store models an
  audit trail, it should mirror Dixie's existing hash-chained `AuditTrailStore`
  *pattern* as precedent only — **not** as admission storage, and over synthetic
  data only, with no durable backend and no migration.
- **No raw payload in the receipt.** The receipt/audit record references synthetic
  identity/status/provenance only; it never embeds the raw candidate payload,
  source material, or raw reasons (proof case 8; §11).

---

## 11. No-leak requirements

Any Phase 33Q public surface — including every new status/provenance/receipt
projection over the synthetic store — must pass the **same** no-leak boundary
Phase 33N proved and the Phase 33L validator denylist encodes. The public
response (and any recall-eligibility projection over the store) must **never**
include:

- raw candidate payload;
- source material / `source_ref`;
- raw reasons / `policy_reason` / private reason family;
- private / audit fields (`audit_receipt_ref`, `receipt_id`, `audit_private`,
  `audit_event` detail);
- operational tenant / estate / actor IDs;
- idempotency keys or scope;
- authority / signature material (`authority_signer_type_draft`,
  `authority_scope_draft`, signatures);
- tokens, secrets, or URLs;
- stack traces / debug internals / `file.ts:line` references;
- storage internals (store handles, capacity counters, internal seam sentinels);
- long opaque / operational IDs.

Concretely, Phase 33Q must:

- finalize **every** public response through the single guarded no-leak send path
  Phase 33N established — **including** the new store-backed status/provenance/
  receipt projections — before serialization;
- keep the **hardcoded fail-closed fallback** that carries none of the guard's
  findings if the guard reports or throws;
- build public bodies **purely** from the classified scenario plus fixed synthetic
  placeholders and **public-safe** projections of synthetic store state — never
  from request-controlled or raw stored material;
- ensure the synthetic store's **private** records (candidate refs, transition
  ids, audit detail, idempotency keys, authority material) are **structurally
  unreachable** from the public projection.

---

## 12. Idempotency / signature / authority / actor-estate-binding caveats

Phase 33Q exercises a synthetic store; it does **not** decide the
unresolved-review-bound semantics. The following stay **explicitly non-final**,
exactly as Phases 33E–33O carried them:

- **Idempotency (row J, review-dependent).** `idempotency_final` stays **false**.
  Phase 33Q **must prove spike-scoped replay/de-duplication behavior** for the
  bounded dev store: replaying the **same** synthetic request mints **no** duplicate
  synthetic admitted assertion (returns the prior synthetic result), and a
  **conflicting** replay **fails closed** with a stable public-safe refusal (proof
  case 8; §9). This **spike-scoped** duplicate/conflict proof is **required**, but it
  **does not settle final production idempotency semantics**: the **final idempotency
  semantics** (candidate-id-keyed vs header-keyed vs both, and key scope) remain
  **explicitly unresolved** and are **not** decided by Phase 33Q. Raw idempotency
  keys never appear in any public response (§11). Idempotency remains
  **Dixie/endpoint-owned** (absent from Straylight; 33K §6.8).
- **Signer / authority (rows F, M).** No production signer/authority is
  implemented. Any `authority_signer_type_draft` / `authority_scope_draft` field
  stays **draft**, with `authority_binding_final:false`; service auth is **not**
  end-user consent. Production signer/authority semantics are **not** decided by
  Phase 33Q (33K §6.2; 33M §12).
- **Tenant / estate / actor binding (row G).** Synthetic binding only;
  `identity_binding_final` stays **false**. No production tenant/estate/actor
  identity binding is decided; operational identity IDs never appear on a public
  surface (§11).
- **Recall-eligibility representation (row E) & receipt/audit + projection (rows H,
  K, O).** The synthetic store's recall-eligibility flag and receipt/audit
  projection stay **draft, review-dependent** signals over synthetic placeholders —
  not the emergent canonical disposition the unresolved Straylight review (A–O)
  must still reconcile.

In short: Phase 33Q may *exercise* these mechanisms against synthetic state to
prove the transition's stateful effect, but it **decides none of their final
semantics** — those remain gated on the Straylight primitive review and later,
separately-named gates.

---

## 13. Blocked lanes

Phase 33P is a docs/decision-only storage/receipt hardening gate. It selects only
the bounded, future, synthetic Option B of §7–§8. Each of the following remains
blocked and is **not** authorized, implemented, or the next implementation lane:

- production admission;
- durable production Admission Wedge storage;
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
- production implementation readiness.

> **On the Option B selection specifically.** This gate **authorizes only a
> bounded, dev/operator-only, disabled-by-default, non-production *synthetic*
> admitted-assertion store** as a *future* Phase 33Q, and **only** within the §8
> boundary. It does **not** authorize, imply, or bring nearer any durable
> production storage, any production admission, any migration, any production
> receipt, or any other lane above — those remain blocked. The selection is
> bounded; it is **not** a production-storage or MVP-2-completion authorization.

If a later phase reaches for anything in the blocked list, it must re-open the
Phase 33E probe artifacts, the Phase 33F readiness gate, the Phase 33G design (as
corrected by 33H), the Phase 33H acceptance gate, the Phase 33I decomposition
gate, the Phase 33J review gate, the Phase 33K precondition design gate, the Phase
33L test-vector draft, the Phase 33M authorization gate, the Phase 33O acceptance
gate, this gate, and the relevant Straylight decision records (ADR-022E
durable-store gate; ADR-026C / ADR-026D route guardrails — Straylight-repo
decision records) first; it must not silently expand scope.

---

## 14. Acceptance criteria for Phase 33P

This phase succeeds if:

- it **assesses the post-33N storage/receipt posture** read-only against the
  33H–33O chain (§3–§5) and identifies the storage/receipt bottleneck (§5);
- it makes an **explicit storage-posture decision** among Options A/B/C/D (§6 — and
  §7: **select Option B** for a possible future Phase 33Q, **reject Option D**);
- it states clearly that **Phase 33P itself implements no store** — no storage
  write, no migration, no route change, no auth/consent (§1, §7);
- it **bounds a possible future Phase 33Q** to the §8 disabled-by-default,
  dev/operator-only, non-production, synthetic, no-migration, no-raw-payload,
  no-export, no-final-anything boundary;
- it **defines the proof cases** a Phase 33Q would have to demonstrate (§9) and the
  **receipt/audit** (§10) and **no-leak** (§11) hardening requirements, with the
  idempotency/signer/authority/binding semantics held **non-final** (§12);
- it **future-gates Phase 33Q** (§7, §8, §15 — Phase 33Q is authorized only if this
  doc lands cleanly and only within the §8 boundary; it is not auto-authorized);
- it **includes bounded-store safety proof obligations** for the Phase 33Q dev
  store (§9 case 8) — specifically requiring proof of **tenant/estate isolation**,
  **capacity-limit** fail behavior, **atomic partial-failure** handling,
  **replay/conflict** behavior (no duplicate minting; conflicting replay fails
  closed), **no partially-admitted / recallable residue** after failed writes, and
  **process-restart ephemerality** (no durable admitted-assertion residue), and
  requires the §12 spike-scoped duplicate/conflict proof while leaving final
  production idempotency semantics **unresolved**;
- it **does not finalize** production storage, idempotency, signer/authority,
  tenant/estate/actor binding, the route contract, or production readiness — all
  remain held non-final (§8, §12, §13);
- it **preserves every production / public / Freeside / Discord / chat-to-memory
  block** (§13);
- it does **not** mutate source / tests / validators / probes / fixtures /
  vectors / config / package files / lockfiles / CI / migrations / generated
  files;
- it keeps **all implementation out of Phase 33P**;
- it **selects a safe next lane** (§15 — Phase 33Q, conditioned on this doc landing
  cleanly within the §8 boundary);
- Codex confirms the docs / decision-only scope.

---

## 15. Next lane

> **Likely next lane: Phase 33Q — Admission Wedge dev-only bounded admitted
> assertion store.**

**Phase 33Q is authorized only if this Phase 33P doc lands cleanly and remains
within the §8 boundary.** It is *not* automatically authorized by the selection of
Option B; the selection establishes the **posture and boundary**, and a Phase 33Q
implementation lane must:

- stay **entirely within the §8 authorization boundary** (disabled-by-default,
  dev/operator-only, non-production, synthetic-only, bounded, no-migration,
  no-raw-payload, no-export, no-final-anything);
- prove the **§9 proof cases** against synthetic state, honoring the **§10
  receipt/audit** and **§11 no-leak** requirements and the **§12** non-final
  caveats;
- inherit the **Phase 33N safety floor** unchanged (§3, §8);
- proceed through the framework's **implement → review → audit** cycle (the
  synthetic store is application code; it must not bypass the quality gates);
- **preserve every blocked lane** (§13).

If, at Phase 33Q implementation time, evidence shows the bounded synthetic store
cannot be built without touching a blocked lane (a migration, a real receipt, a
schema freeze, or a durable backend), Phase 33Q must **stop and re-gate** rather
than expand scope — falling back to a further docs-only decomposition (Option C
style) or halting until the Straylight primitive review (A–O) and ADR-022E are
resolved.

---

## 16. Cross-references

> **Phase 33R status note (added later).** Phase 33R
> ([`ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md))
> is the **docs/decision-only bounded-ledger acceptance / hardening gate** that
> accepts the Phase 33Q implementation this gate authorized. It reads this gate
> and the Phase 33Q source **read-only** — it mutates **no** source, test,
> validator, probe, fixture, or vector JSON. It **accepts Phase 33Q only as a
> bounded, non-production, test-seam-only synthetic admitted-assertion ledger
> proof** for MVP 2, confirming read-only that the implementation stays within
> this gate's §8 boundary and §9 proof cases (including the case-8 ten-bullet
> bounded-store safety obligations) and inherits the Phase 33N safety floor
> unchanged: `server.ts` unwired, no env flag, no package export, route-DI/
> test-seam-only, no raw candidate payload persisted, replay/de-dup spike-scoped,
> `idempotency_final` still false. It does **not** accept Phase 33Q as production
> admission, durable storage, a final schema, production route readiness, or
> Freeside/client integration; **Phase 33Q does not complete MVP 2**; it
> preserves every blocked lane (its §10) and keeps the Straylight primitive review
> (A–O) **unresolved**. Phase 33R selects **Phase 33S — a docs/decision-only
> route-spike + bounded-ledger acceptance decomposition gate** as the next lane
> and **does not select production rollout**.

- [`docs/ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md)
  — Phase 33O acceptance gate; its §4 (what 33N proves), §5 (what 33N does not
  prove), §6 (MVP 2 gap), and §9 (selected this Phase 33P) are the direct inputs to
  §3–§5 and §7 here. **Gains a minimal Phase 33P status note.**
- [`docs/ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)
  — Phase 33M authorization gate; its §7 storage posture (Option A/B/C) is the
  source of the A/B/C/D framing here (this gate's Option D = 33M's Option C
  "production-like storage write path", reframed and rejected), and its §11/§12/§13
  idempotency/auth/storage stances seed §10–§12. Read-only; **not modified**.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K precondition design; its §6 record categories (6.1–6.11),
  §6.6/§6.7 receipt/audit split, §6.8 idempotency record, §7 storage boundary
  rules, §8 idempotency precondition, §11 binding assumptions, and §13 no-leak
  preconditions are the design basis for §8–§12. **Gains a minimal Phase 33P
  status note.**
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)
  — Phase 33J review register (A–O); the genuinely-unresolved rows (E, G, H, K, N,
  O) and review-dependent row (J) this gate keeps unresolved and §12 holds
  non-final. Read-only; **not modified**.
- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I decomposition; its §5 blocker matrix (storage row A: only the
  non-durable `BoundedEstateStore` exists; PG stores are governance/reputation/
  fleet) grounds §5's "why storage is the bottleneck". **Gains a minimal Phase 33P
  status note.**
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  — Phase 33L route-contract test-vector fixture draft; the five vectors and the
  no-leak denylist a future Phase 33Q store-backed projection must still satisfy.
  Read-only; **gains a minimal Phase 33P status note** (it already carries the
  33M/33N/33O notes).
- [`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs)
  — the Phase 33L validator (read-only; **not modified**); its
  `FORBIDDEN_PUBLIC_KEYS`, substring/regex leak scans, and UUID / opaque-run rules
  are the denylist §11 requires a Phase 33Q to keep satisfying.
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md) /
  [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the Phase 33E draft v1 probes and their validator; the receipt-split and
  candidate→transition→admitted models §9/§10 draw on. Read-only; **not modified**
  (and, per the 33N/33O precedent, **not annotated** by this phase).
- [`docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md)
  — the Phase 33N enable/disable runbook; the operational source-of-truth for the
  env gate, dev/operator credential gates, dedicated header, and five-scenario
  mapping a Phase 33Q would extend behind the same default-off gate. Read-only;
  **not modified**.
- `app/src/routes/admission-intake.ts`, `app/src/services/admission-wedge-spike/`
  (`classifier.ts`, `public-response.ts`, `no-leak.ts`, `auth-gate.ts`,
  `index.ts`), `app/src/config.ts`, `app/src/server.ts`, `.env.example`, and the
  spike tests under `app/tests/unit/admission-wedge-spike/` and
  `app/tests/integration/admission-intake/` — the Phase 33N implementation and the
  safety floor (§3, §8) a Phase 33Q must inherit. Inspected **read-only** via the
  33O §4 grounding; **none is modified by this phase.**
- `app/src/services/straylight-recall-intake/bounded-estate-store.ts` — the
  Recall Wedge in-process, non-durable `BoundedEstateStore`; cited as an
  **operational-property precedent only** (process-local, capacity-bounded,
  tenant-scoped, non-durable, fail-closed, testable without production storage) that
  Option B / a future Phase 33Q synthetic store would follow — **not** a
  code/type/adapter/schema to reuse (§6 operational-property-precedent note).
  Inspected **read-only**; **not modified.**
- `@loa/straylight` — canonical primitive/substrate owner of the assertion
  lifecycle, signer/keyring, receipt/audit, and storage-adapter vocabulary,
  read-only in `../loa-straylight`. **No completed Straylight Admission-Wedge
  primitive review was found** (33J §4); A–O remain unresolved, deferred
  spike-scoped only. The **durable estate store is gated by ADR-022E (held)**;
  route guardrails by ADR-026C / ADR-026D. The local checkout may be stale. **Not
  edited by this phase.**
- freeside-characters Phase 45J / PR #177 (**verified merged on GitHub**
  2026-06-06) — the cross-repo acceptance; its mirror/adapter proof is a pure,
  fixture-bound semantic mapping layer with **no live Dixie call**, test-only, not
  exported, not runtime-wired (§13). **Not edited by this phase.**
