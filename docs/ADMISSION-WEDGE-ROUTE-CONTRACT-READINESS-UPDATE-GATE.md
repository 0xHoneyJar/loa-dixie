# Phase 33W — Admission Wedge Route-Contract Readiness-Update Gate

> **Phase**: 33W
> **Branch context**: `phase-33w-admission-route-contract-readiness-update`
> **Related**: Dixie Phase 33A–33V (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle, recall-eligibility,
> signer/keyring, receipt/audit, and storage-adapter primitives
> **Status**: **docs / decision-only.** No source, test, route, route handler,
> storage, store code, DB write, migration, auth, consent, validator,
> probe/fixture/vector JSON, config, env, package, lockfile, CI, generated, or
> live-integration change.
> **This is a route-contract *readiness update*, not route-contract
> finalization/freeze and not implementation.** Dixie Phase 33V / PR #140 (merged)
> finalized/refined the storage/auth/consent precondition *design* against the
> now-confirmed Straylight vocabulary (loa-straylight PR #65, merged) and **selected
> this Phase 33W lane** as the route-contract readiness-update follow-on. Phase 33W
> **reassesses** the Phase 33G route-contract draft's readiness against the
> now-confirmed vocabulary and finalized storage/auth/consent design, **separates
> what is now clarified from what remains blocked**, and **identifies exactly what
> the 33G draft must later be updated to include** — and stops. It implements
> **no** route, route handler, storage, auth, consent, migration, package export,
> runtime behaviour, or Freeside integration; it does **not** freeze/finalize the
> Dixie route contract; it does **not** mutate route vectors, fixtures, or
> validators; and it does **not** make production admission ready.

This document is the Dixie-side **route-contract readiness-update gate** that Phase
33V / PR #140 selected as the next lane
([`ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md:455-491`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)).
Phase 33F assessed the draft v1 probes as a mature enough *semantic* foundation to
begin a docs-only route-contract design; Phase 33G drafted that contract on paper
(route identity, request/response envelopes, idempotency sketch, `admission.*`
refusal taxonomy, recall-eligibility projection, test vectors); Phase 33H accepted
the 33G draft as a bounded docs-only draft — **not implementation-ready** — applied
two narrow factual corrections, and routed the chain into an implementation-readiness
decomposition (33I). The decomposition selected the Straylight primitive review (33J)
and storage/auth/consent design (33K) as the dominant prerequisites; the cross-repo
review round-trip (33T request → loa-straylight PR #65 response → 33U intake) closed
the vocabulary question; and Phase 33V finalized the storage/auth/consent design
against the confirmed vocabulary. **Phase 33W now reassesses the 33G route-contract
draft against those now-resolved inputs** — without finalizing, freezing, or
implementing it.

> **This phase does not complete production readiness.** Reassessing route-contract
> readiness against the confirmed vocabulary and finalized storage/auth/consent
> design clarifies what the route contract must later resolve; per the Straylight
> response itself and Phase 33V, it does **not** clear the independent production
> gates. ADR-022E gate #8 (durable production persistence) remains **held**;
> production auth/consent, the final Dixie route contract, the final endpoint
> idempotency semantics, production signer/authority semantics, and production
> identity binding each remain to be cleared on their own. No runtime marker is
> flipped — `route_contract_final` / `idempotency_final` / `identity_binding_final` /
> `authority_binding_final` / `straylight_primitive_review_complete` all stay
> `false`, `schema_final` / `canonical_schema` / `runtime_enabled` /
> `production_admission` stay `false`, and the Phase 33N spike service modules
> (`app/src/services/admission-wedge-spike/`) and route handler
> (`app/src/routes/admission-intake.ts`) are inspected **read-only** and left
> unchanged. Turning this updated readiness assessment into any route revision,
> code, schema, route, migration, or marker change remains future, separately-gated
> work.

Every readiness decision below is grounded against the Dixie Phase 33G draft
(read-only), the Phase 33H acceptance (read-only), and the Phase 33V finalization
(read-only), which in turn consumed the Phase 33U reconciliation of the Straylight
response (`loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md`, read in
the adjacent `../loa-straylight` checkout; **not modified**). Where this gate carries
a Straylight `file:line` citation it carries it **as Phase 33U / 33V recorded it** —
the Straylight response's own §3 confirmed those citations against current
`loa-straylight` HEAD; Phase 33W does **not** re-derive or re-verify Straylight
source independently. Where this gate cites a Dixie spike-runtime line, that line is
grounded read-only against the current working tree and named only to anchor a
readiness decision, never to authorize a change to it.

---

## 1. Status and scope

- **Phase 33W — Admission Wedge route-contract readiness-update gate.**
- Dixie-side **docs / decision-only**.
- It **updates route-contract readiness** after the Straylight primitive-review
  response (loa-straylight PR #65), the Phase 33U response intake, and the Phase 33V
  storage/auth/consent design-finalization (§2, §3, §5).
- It does **not** implement a route, route handler, storage, store code, auth,
  consent, migrations, package exports, runtime behaviour, package/schema exports, or
  Freeside integration.
- It does **not** freeze/finalize the Dixie route contract. The Phase 33G route
  contract remains a **draft design**; `route_contract_final: false` everywhere. It
  may **identify** what the 33G draft must later be updated to include (§6), but it
  does not perform that revision, and it does not absorb or finalize the
  route-contract gate.
- It does **not** make production admission ready, and it does **not** flip
  `straylight_primitive_review_complete` (or any other draft marker) in any runtime
  artifact (the Phase 33N spike service modules and their markers are inspected
  **read-only** and left unchanged).
- It does **not** mutate route-contract test vectors, fixtures, or validators. The
  Phase 33L route-contract test-vector JSONs and their validator, and the Phase 33E
  probe/fixture JSONs and their validator, are inspected **read-only** and left
  unchanged. Per the Phase 33D §6 invariant — any probe / validator / fixture /
  vector mutation requires its own separately-gated phase — Phase 33W inspects all of
  them **read-only**.
- It changes **no** source, test, route, route handler, storage, store code,
  validator, probe/fixture/vector JSON, config, env, package, lockfile, CI, or
  generated file. The only mutations are this new decision doc and at most minimal
  cross-reference status notes on predecessor docs (§10.3).
- It does **not invent answers beyond the Straylight response / Phase 33U intake /
  Phase 33V finalization.** Where a prior phase recorded a disposition as
  *delegated-to-Dixie*, *Dixie-owned-and-decided*, or *still-blocked*, Phase 33W
  records the **route-contract readiness consequence** of that disposition — it does
  **not** convert a held production gate into a cleared one, and it does **not**
  restate a Dixie projection as a canonical Straylight claim.

The audience is **future Dixie phases** (primarily the Phase 33X route-contract
revision-draft lane this gate selects — §8), with the Straylight (`@loa/straylight`)
owner and freeside-characters as interested-but-unaffected parties (this gate hands
neither any new authorization).

---

## 2. Source-chain context

Phase 33W sits one rung above the Phase 33V storage/auth/consent design-finalization
gate on the Dixie Admission Wedge ladder. It is the **route-contract
readiness-update follow-on** to the storage/auth/consent finalization, which in turn
followed the cross-repo primitive-review round-trip. It introduces no new contract
material, freezes nothing, and authorizes nothing; it reassesses the Phase 33G route
contract's readiness against the now-confirmed vocabulary and finalized
storage/auth/consent design, then selects the next lane.

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33F | #123 | Route-contract **readiness gate** — assessed the draft v1 probes as a mature enough *semantic* foundation to begin a docs-only route-contract *design*; named the Straylight-review and idempotency preconditions; selected Phase 33G. Designed nothing. The prior readiness gate this phase **updates**. |
| 33G | #124 | Route-contract **design** — proposed (on paper) a route identity (`POST /api/admission/intake`), request/response envelopes with a public/private split, an idempotency sketch, an `admission.*` refusal taxonomy, storage/auth/consent preconditions, recall-eligibility projection, and route-contract test vectors mapped from the five Phase 33E probes. The **draft this gate reassesses.** `route_contract: false` / `route_contract_final: false`. |
| 33H | #126 | Route-contract **acceptance / implementation-readiness gate** — ACCEPTed the 33G draft as a bounded docs-only draft (two narrow docs-only factual corrections: refusal namespace is **two-part** not three-part; the receipt-split validator is **strict per-section**), rendered a **NOT implementation-ready** verdict, inventoried the §8 blockers, and selected the Phase 33I decomposition gate. |
| 33I | #127 | Implementation-readiness **decomposition gate** — carried the 33H §8 blocker table forward 1:1 (A–N), added synthesis rows O (route-implementation acceptance criteria) and P (production-readiness criteria), ordered the blockers into future lanes (33J review → 33K storage/auth/consent → 33L test vectors → 33M spike authorization → 33N possible spike), and selected Phase 33J, permitting 33K in parallel against draft vocabulary. |
| 33J | #128 | Straylight primitive-review **request** — issued the A–O primitive-review request to the Straylight owner (docs/decision-only); completed no review. |
| 33K | #129 | Storage/auth/consent **precondition design** gate — designed (on paper) the storage record-shape inventory (§6), service-auth options (§9), end-user consent options (§10), idempotency precondition (§8), no-leak boundary (§7, §13), and threat model (§14), carrying the unresolved A–O review answers as **exit criteria**. |
| 33L | #130 | Route-contract **test-vector** draft — mapped the five Phase 33E probe scenarios into five docs/non-runtime route-contract test-vector JSONs + a dependency-free validator under `docs/admission-wedge/route-contract-test-vectors/`. Read-only here; **not mutated.** |
| 33M | #131 | Dev/operator-only route-spike **authorization** gate — authorized (with bounds) a disabled-by-default dev/operator route spike; implemented nothing. |
| 33N | #132 | Dev/operator-only route-spike **implementation** — disabled-by-default `POST /api/admission/intake` on **Storage Option A (no durable storage)**, fail-closed, no-leak, gated by a dev `x-admission-service-token` (not the global `/api/*` JWT allowlist); authorized no production lane. Inspected **read-only** here. |
| 33O | #133 | Route-spike **acceptance** gate — accepted 33N only as a bounded, disabled-by-default, dev/operator-only route spike; does **not** complete MVP 2. |
| 33P | #134 | Storage / receipt **hardening** decision gate — selected Option B (dev-only bounded synthetic store), rejected Option D (production-like durable storage); judged a paper re-decomposition would "add a gate without adding evidence" (§6). |
| 33Q | #135 | Dev-only bounded synthetic admitted-assertion **ledger** — process-local, Map-backed, synthetic-only, tenant+estate-scoped, capacity-bounded, non-durable, fail-closed, **test-seam-only** (not wired into `server.ts`). |
| 33R | #136 | Bounded-ledger **acceptance / hardening** gate — accepted 33Q only as a bounded, non-production, test-seam-only synthetic proof. |
| 33S | #137 | Route-spike + bounded-ledger acceptance **decomposition** gate — selected **Option D** (Straylight primitive-review follow-up) as the highest-leverage vocabulary prerequisite, and recorded the **D→E follow-on**: the storage/auth/consent finalization lane is "conditional on D, not a substitute for it." |
| 33T | #138 | Straylight primitive-review **follow-up / cross-repo review request** — re-issued the A–O register grounded in the concrete 33N route surface and 33Q ledger, defined the expected Straylight response shape, and selected Phase 33U. Completed no review. |
| **Straylight** | **`loa-straylight` PR #65 (merged)** | **Admission Wedge primitive-review *response*** — answered the 33T A–O request from the side that owns the assertion-lifecycle / recall / signer / receipt-audit / storage-adapter vocabulary; confirmed the carried-forward citations against current HEAD (its §3); coined no new canonical primitive; authorized no implementation lane in either repo. |
| 33U | #139 | Straylight response **intake / lane-decision** gate — intook the PR #65 response, reconciled **every** A–O row using only the response's dispositions (its §4), recorded the Dixie implications (its §5), preserved every blocked lane (its §7), and selected the Phase 33V storage/auth/consent design-finalization follow-on (its §6). |
| 33V | #140 | Storage/auth/consent **design-finalization** gate — consumed the 33U §4 reconciliation as exit criteria, finalized the Phase 33K storage design (§4) and auth/consent design (§5) in vocabulary-compatible terms, recorded the route-contract boundary (§6: the route-contract dependencies the finalization surfaced), tabulated final design decisions and open blockers (§7), preserved every blocked lane (§9), and **selected this Phase 33W** route-contract readiness-update follow-on (its §8). The **source-of-truth input to this gate.** |
| **33W** | *(this doc; docs/decision-only — not committed/merged yet)* | **Route-contract readiness-update gate** — reassesses the Phase 33G route-contract draft against the confirmed vocabulary and finalized storage/auth/consent design (§3), carries forward the critical constraints (§4), renders a route-contract readiness verdict (§5), checklists what the 33G draft must later be updated to include (§6), tabulates final design decisions and still-blocked areas (§7), preserves every blocked lane (§9), and selects **Phase 33X** (route-contract revision draft; docs/decision-only — §8). Completes no implementation; makes no production-readiness claim. |

### Straylight (`@loa/straylight`)

The canonical primitive/substrate owner. Its response (PR #65) **confirmed** the
33J/33T carried-forward citations against current `loa-straylight` HEAD (response §3),
coined **no** new canonical primitive, and is the first Straylight document to name
the Admission Wedge. The prior "checkout may be stale" caveat is **resolved** for the
A–O primitives by the response's own §3 confirmation (as Phase 33U / 33V recorded).
Phase 33W carries the Straylight citations exactly as Phase 33U / 33V recorded them
and does **not** re-derive Straylight source.

> **Cross-repo phase-numbering caution (unchanged).** Dixie's 33-series, the
> freeside-characters 45-series, and Straylight's ADR/phase labels are independent
> labels in separate repositories and must not be conflated.

### Freeside Characters (freeside-characters)

Unchanged context. The 45-series mirror/adapter is test-only, not exported, not
runtime-wired, with no live Dixie call (45J / PR #177, **verified merged on GitHub**
2026-06-06). This gate hands Freeside **no** new authorization and **no** client
contract; Freeside review/client-contract work remains deferred until the Dixie
route/client contract is accepted enough to hand off.

---

## 3. Readiness delta after Straylight PR #65 and Phase 33V

This table records, per route-contract area, the readiness **delta** the Straylight
response (PR #65), the Phase 33U intake, and the Phase 33V finalization produced. The
"previous state" column is the 33G-draft / 33H-acceptance posture (the last point at
which route-contract readiness was assessed — before the cross-repo review and
storage/auth/consent finalization). The "new evidence" column is what PR #65 / 33U /
33V established. **No row clears an independent production gate**; "readiness impact"
means *clarity for the future route-contract revision*, never *implementation
authorization*.

| Area | Previous state (33G draft / 33H acceptance) | New evidence from PR #65 / 33U / 33V | Readiness impact | Remaining blocker |
|------|----------------------------------------------|--------------------------------------|------------------|-------------------|
| **Endpoint idempotency** | Draft sketch (33G §12); `idempotency_final: false`; keying (candidate-id vs header vs both) undecided; 33H §8.E open. | PR #65 (row J): **no `idempotency_key` primitive in Straylight**; idempotency is host/Dixie-delegated (recall-wedge precedent ADR-026D §3.b). Content-addressed `transition_id`/`assertion_id` via `contentId(...)` over full input **including `now`** is a *distinct, narrower* concept — **not** endpoint replay/idempotency; no substrate de-dup or replay guard claimed. | **Clarified ownership, not the keying.** Endpoint idempotency is now unambiguously Dixie / endpoint-route-contract-owned; the route contract may design it without waiting on Straylight. | **Yes** — keying/replay/conflict semantics still undecided (`idempotency_final: false`); Dixie route-contract gate (33X+). |
| **Public receipt naming / `public_receipt_ref`** | Two coexisting spellings flagged as reconciliation debt (33G §9.1): `receipt_split.public_receipt_ref` vs `public_response.receipt_public_ref`; validator strict per-section, cross-checks equality (`validate-fixtures.mjs:324`); 33H corrected the "tolerates both" gloss (C-2). | PR #65 (row H): public field-naming **delegated to Dixie**; Straylight **recommends `public_receipt_ref`** (its `*_ref` convention). 33V §3/§4/§7 **adopts `public_receipt_ref`**, retires `receipt_public_ref`, keeps non-Straylight `audit_receipt` off the public surface. | **Naming target selected.** The two-spelling debt now has a chosen resolution direction (`public_receipt_ref`) the route-contract revision can standardize on. | **Yes** — the Phase 33E fixtures still carry both spellings (`public_receipt_ref` and `receipt_public_ref`), while the Phase 33L vectors use `public_receipt_ref_policy` (no `receipt_public_ref`); **none may be mutated here**; the public-envelope standardization and any fixture/vector change are separate gated lanes. |
| **Public/private response boundary** | Draft split (33G §9–§10): validator-enforced no-leak baseline + a route-contract "storage internals" extension; 33H §7.G "Partly (probe-shape only)" — no live serializer. | PR #65 (row K) + 33V §4: canonical projection rule is **`privacy_scope` + environment-frame disposition**, not a mirrored denylist alone; the Dixie denylist is **defense-in-depth**, not the canonical rule. Never-public categories confirmed (raw payload, source, signer/authority, operational ids, `tenant_id`/`estate_id`/`actor_id`, idempotency keys, storage internals, debug). | **Clarified the canonical rule.** The route contract now knows the final production serializer must be designed against `privacy_scope` + frame disposition, with the denylist as backstop. | **Yes** — a bounded, non-production Phase 33N public-response builder (`public-response.ts:95`) + guarded send path (`admission-intake.ts:247`) exist, but the final production serializer and a durable private/audit boundary remain undesigned/unbuilt; Dixie public-surface design + route contract (33X+). |
| **Recall eligibility projection** | Draft boolean `recall_eligible` + canonical `RecallUseInstruction` (33G §15); reconciliation a Straylight review item; 33H §7.L noted only `usable` / `do_not_use_for_action` actually appear in probes. | PR #65 (row E): **`RecallDisposition`** (`include`/`mark`/`redact`/`exclude`) computed **per request** by `dispositionFor(...)` from status + filters + `privacy_scope` + risk; instructions only on included/marked; redacted/excluded get none; **no universal `active ⇒ recallable`**; `superseded` *markable* only on explicit opt-in. The Dixie boolean is a **constrained Dixie projection**, not canonical status→boolean. | **Semantics resolved; projection Dixie-owned.** The route contract can state `recall_eligible` is a derived per-request projection of `RecallDisposition`, recomputed at recall time — never persisted authority, never a status→boolean rule. | No (semantics resolved; the projection is Dixie-owned and recomputed per request) — the route contract must restate it correctly, not freeze it. |
| **`assertion_superseded` / supersession vocabulary** | Draft `(superseded, active)` relation (33G §8.3); 33G referenced `supersedes_assertion_id`/`superseded_by_assertion_id`; supersession a Straylight review item. | PR #65 (rows C, D, N): **`assertion_superseded` is NOT a canonical `AuditEventType`** — drop it as canonical; re-relate Dixie-locally via `link_assertions` + `AssertionLinkType: 'supersedes'` → canonical **`assertion_linked`**, plus `superseded` status via the canonical **forward field `supersedes_refs`**; the inverse `superseded_by_assertion_id` stays **Dixie-local** (there is **no `superseded_by` field** in Straylight). Vocabulary relation only — no runtime emitter today. | **Re-relation decided.** The route contract must use `supersedes_refs` + `link_assertions`/`assertion_linked`, and mark `assertion_superseded` / `superseded_by_assertion_id` as Dixie-local projections. | No (re-relation decided) — a dedicated Straylight `assertion_superseded` event is a separate Straylight ADR (deferred); the synthetic label must be re-related before any non-spike mapping. |
| **Tenant/estate/actor binding** | Synthetic-only (33G §6 identity fields draft/provisional); `identity_binding_final: false`; must be session-derived (33H §8.G). | PR #65 (row G) + 33V §4/§5: `estate_id`/`actor_id` mirror Straylight wedge primitives; **`tenant_id` is Dixie host-layer** (not a wedge primitive); the `(tenant_id, estate_id)` ledger scope is **spike isolation, not final semantics**; "subject" → `Assertion.subject_refs` (no coined `subject_actor_id`); identity **session-derived, never body-trusted**. | **Clarified the vocabulary boundary.** The route contract can fix which IDs are wedge-primitive vs host-layer and require session-derived identity. | **Yes** (production binding) — production identity binding stays undefined (`identity_binding_final: false`); production identity-binding gate. |
| **Service auth** | Draft "service auth required" (33G §14); no admission auth exists; `dev_signature` inert enum member, not a backdoor; 33H §8.B open. | PR #65 (row F) + 33V §5: `policy_service` is a canonical `SignerType` safe to mirror; admit/reject/supersede authority is decided by **`SignerCompetenceRule` / `Keyring` / policy** (not a fixed list); `authority_*_draft` field names stay Dixie draft (`authority_binding_final: false`); the 33N dev `x-admission-service-token` gate is **non-production only**. | **Clarified the vocabulary boundary.** The route contract can reference `policy_service` / `SignerCompetenceRule` without coining a fixed authority list. | **Yes** (production semantics) — no production auth model selected; production signer/authority gate. |
| **End-user auth/consent** | Draft "end-user consent required, or explicit dev-only scope" (33G §14); no consent mechanism; service auth ≠ consent (load-bearing); 33H §8.C open. | 33V §5 (rows F, G, K): production requires an explicit consent artifact (33K §10 A) or platform-mediated grant (B); **Option D (no authorization) rejected**; consent reference is **private-audit-only**; cross-user/cross-tenant blocked by default; dev/operator omission marker is non-production. | **Clarified the design posture.** The route contract can state the consent dependency precisely (private-audit-only reference; cross-user blocked). | **Yes** — production auth/consent gate; cross-user/public admission stays blocked until a consent model is built. |
| **Durable storage / ADR-022E** | No admission storage exists; durable estate store gated by ADR-022E (held); 33H §8.A open. | PR #65 (row O) + 33V §4: **ADR-022E gate #8 (production persistence) remains held**; related held gates #10/#12/#20; the Phase 33Q synthetic ledger is process-local, non-durable, capacity-bounded, fail-closed, test-seam-only and **explicitly does not satisfy** durable persistence — a separate gate-clearing ADR is required. | **No change to authorization; the boundary is sharper.** The route contract must state durable storage is undesigned and ADR-022E gate #8-held. | **Yes** — ADR-022E gate #8 (held); future production-storage gate. |
| **Transition receipt / audit persistence** | Draft receipt split (33G §9.1/§9.2); `receipt_split` DRAFT subject to reconciliation. | PR #65 (row H) + 33V §4: the synthetic `SyntheticAuditRecord` maps to **two** distinct Straylight primitives — **`AuditEvent`** (audit half, append-only/hash-chained; canonical admission members `assertion_admitted` + `transition_denied`) + **`TransitionReceipt`** (receipt half, kinds incl. `admission`/`denied`) — keep them **unconflated**; `audit_receipt` is not a Straylight term and stays off the public surface. | **Clarified the two-primitive split.** The route contract must split receipt vs audit and keep `public_receipt_ref` carrying no operational id/audit detail. | **Yes** — the runtime audit/receipt persistence is undesigned; Dixie public-surface design + durable-store gate (ADR-022E #8 held). |
| **Failure atomicity / rollback** | Not modelled in 33G beyond a contract-level note (33G §8 closing, §19); 33H §8.J open. | 33V §4: multi-step admission **must be atomic — no partial-admission residue, fail-closed on partial commit** (design requirement, not implemented); rollback/backfill/migration are undesigned and a required input to a future durable-store ADR. | **Stated as a design requirement.** The route contract can require atomicity / no partial residue explicitly. | **Yes** — undesigned; storage/durable-store gate + route-contract gate (33X+). |
| **Route vectors / validators** | Five 33L route-contract test-vector JSONs + validator; five 33E fixtures + validator; paper/non-runtime (33H §7.M); the 33E fixtures carry both receipt spellings (`public_receipt_ref` and `receipt_public_ref`) while the 33L vectors use `public_receipt_ref_policy` (no `receipt_public_ref`). | No PR #65 / 33U / 33V change touched them — Phase 33V inspected them read-only and left them unchanged; the Phase 33D §6 no-mutation invariant stands. | **Unchanged.** The route contract revision must not be confused with vector mutation; vectors stay frozen until a separate vector-mutation lane. | **Yes** — any vector/validator change is a separate gated lane (not 33W, not 33X-as-readiness). |
| **Production readiness** | NOT implementation-ready (33H §6); every load-bearing axis open. | PR #65 §1/§7 + 33V §7: resolving the primitive review and finalizing the storage/auth/consent **design** "alone does not make production admission ready"; every production gate remains independently held. | **No change.** Production admission stays blocked under every option. | **Yes** — all of the above gates; a future production-readiness gate. |
| **Freeside integration** | No live client; reconciliation-bound; test-only mirror (33G §18, 33H §7.O). | 33V §2/§9: no client contract handed off; adapter stays test-only, not exported, not runtime-wired, no live Dixie call (45J / PR #177 merged). | **No change.** No Freeside runtime/client wiring authorized. | **Yes** — Freeside gate, after a mature Dixie contract. |

> **None of §3 is a production-readiness claim.** Each "readiness impact" records the
> *clarity* the confirmed vocabulary and finalized storage/auth/consent design give a
> future route-contract revision; every production lane remains independently gated
> (§9), exactly as the Straylight response, Phase 33U, and Phase 33V state.

---

## 4. Critical constraints carried forward

Phase 33W carries forward — **verbatim in substance** — the constraints the
Straylight response established, Phase 33U reconciled, and Phase 33V finalized. None
is a new answer; each is a constraint the future route-contract revision (33X) must
honour. They are restated here so the readiness verdict (§5) and the draft-update
checklist (§6) cannot drift from them.

**Idempotency / id-derivation:**

- **Endpoint idempotency remains Dixie / endpoint-route-contract-owned.** There is no
  `idempotency_key` primitive in Straylight; idempotency is host/Dixie-delegated per
  the recall-wedge precedent (ADR-026D §3.b).
- **Straylight content-addressed ID derivation is a distinct, narrower
  primitive-level concept**, *not* endpoint replay/idempotency: `transition_id` /
  `assertion_id` are derived via `contentId(...)` over the full input **including
  `now`**.
- **IDs are deterministic only for identical *complete* inputs** — the same candidate
  *and* the same `now`. A different `now` yields different ids.
- **No substrate de-duplication and no replay guard is claimed** — admission appends
  unconditionally; `admit()` performs no prior-id lookup; transitions/audit are
  append-only with no replay-detection step. Content-addressed id derivation is
  **not** proof of replay compatibility and must **not** be cited as substrate
  de-duplication.
- **The Dixie synthetic ledger's replay behaviour is not a Straylight replay proof.**
  The ledger's spike-scoped behaviour (identical replay mints nothing; conflicting
  replay fails closed without overwrite) is enforced by the **Dixie ledger spike**,
  not the Straylight substrate; endpoint keying remains undecided
  (`idempotency_final: false`).

**Recall eligibility:**

- **`RecallDisposition` governs recall semantics** — the canonical four-member union
  `include` / `mark` / `redact` / `exclude` returned by `dispositionFor(assertion,
  request)`, computed **per request** from status, request filters, `privacy_scope`,
  and risk profile.
- **Recall instructions apply only to included / marked items**; **redacted /
  excluded assertions receive no `RecallUseInstruction`.**
- **`active` can still be excluded** by request filters, privacy frame, or
  risk-profile checks — there is **no universal `active ⇒ recallable` rule**.
- **`superseded` can be *marked*** (background) when `include_statuses` explicitly
  opts in, otherwise it is excluded.
- **The Dixie ledger recall booleans are constrained Dixie projections**, not
  canonical Straylight status-to-boolean semantics. The synthetic ledger's
  `recall_eligible` boolean (`active ⇒ true` / `superseded ⇒ false` under default
  request conditions, grounded read-only at
  `admitted-assertion-ledger.ts:101,793,886`) is a specific, lossy Dixie projection
  of `dispositionFor` for one request frame — **not** a coined stored primitive and
  **not** a canonical status mapping.

**Supersession vocabulary:**

- **`assertion_superseded` is not a canonical Straylight `AuditEventType`.** The
  synthetic ledger emits an `assertion_superseded` label (grounded read-only at
  `admitted-assertion-ledger.ts:123,890`); it must **remain Dixie-local or be
  re-related to Straylight relation vocabulary**.
- **The normative re-relation uses existing concepts** — a `link_assertions`
  transition carrying `AssertionLinkType: 'supersedes'`, corresponding to the
  canonical **`assertion_linked`** audit-event member; plus a status transition moving
  the prior assertion to `superseded` recorded via the canonical forward field
  **`supersedes_refs`**, with the corrected assertion remaining `active`.
- **This is vocabulary relation only, not a claim that current runtime emits
  `assertion_linked`.** Straylight implements no link/supersession executor today.
- **The Dixie inverse `superseded_by_assertion_id` is Dixie-local** (grounded
  read-only at `admitted-assertion-ledger.ts:105`) — the canonical relational field
  is `supersedes_refs` (forward direction); there is **no `superseded_by` field** in
  any Straylight primitive.
- A future dedicated Straylight `assertion_superseded` event is a **separate
  Straylight ADR decision** (deferred, not blocking).

**Receipt / audit & public-field naming:**

- **Row H receipt naming is delegated to Dixie.** `SyntheticAuditRecord` maps to
  **two** distinct Straylight primitives — `AuditEvent` (audit half) +
  `TransitionReceipt` (receipt half) — not one; keep them unconflated.
- **`public_receipt_ref` is the preferred Dixie standardization target**, not a
  rejected or re-related primitive. Straylight delegates public field-naming to Dixie
  and recommends `public_receipt_ref`; Dixie adopts it, retires `receipt_public_ref`,
  and keeps the non-Straylight `audit_receipt` label off the public surface. **No
  route/schema field is frozen by 33V or 33W.**

**Storage / durable-store boundary:**

- **ADR-022E durable-store gates remain held.** Any *durable* admission store is
  governed by **ADR-022E gate #8** (production persistence, held); it is **NOT**
  authorized by this review. Related held gates: #10 (Dixie boundary wiring —
  unblocked only for the single recall-intake endpoint slice, **not** admission), #12
  (new HTTP/network surface, held), #20 (threat-model widening required before any
  such wiring).
- **Dixie's synthetic bounded ledger proof is not durable storage readiness.** The
  Phase 33Q ledger proves *vocabulary alignment and synthetic transition behaviour*,
  **not** durable persistence. Durable Admission Wedge storage stays gated behind
  ADR-022E gate #8 and requires a **separate gate-clearing ADR**.

**Route-contract ownership:**

- **Final route-contract work remains separately gated.** Endpoint idempotency is a
  Dixie route-contract responsibility; resolving the primitive review and finalizing
  the storage/auth/consent design does **not** finalize the route contract. **No
  route/schema field is frozen by 33V or 33W.**

---

## 5. Route-contract readiness verdict

> **Verdict: the Phase 33G route-contract draft is MORE READY than it was at the 33H
> acceptance — but it is NOT final/frozen, NOT implementation-ready for production,
> and the correct next step is a docs-only route-contract *revision* against the new
> constraints, not runtime implementation.**

What this means concretely:

- **More ready than at 33H, for three reasons.** (1) The **vocabulary** the 33G draft
  flagged as draft-and-Straylight-owned is now confirmed: `proposed` / `active` /
  `admit_assertion` / `assertion_admitted` / `transition_denied` stand; supersession
  is re-related to `supersedes_refs` + `link_assertions`/`assertion_linked`;
  `RecallDisposition` governs recall; `public_receipt_ref` is the preferred public
  naming target. The draft no longer has to hedge those as open Straylight questions
  — it can state them as confirmed-with-Dixie-ownership. (2) The
  **storage/auth/consent design** the 33G draft deferred is now finalized on paper
  (33V §4, §5): the route contract can cite concrete dependencies rather than
  placeholders. (3) The 33H two-spelling reconciliation debt now has a **chosen
  direction** (`public_receipt_ref`).
- **Still not final/frozen.** `route_contract_final: false` everywhere. Confirming
  the vocabulary and finalizing the storage/auth/consent design clarifies *what the
  route contract must say*; it does not decide the still-undecided route-owned
  questions — endpoint idempotency keying/replay/conflict (`idempotency_final:
  false`), the public response field set/serializer, the `admission.*` refusal
  taxonomy (still draft, in no source), session-derived production identity binding
  (`identity_binding_final: false`), and atomicity/rollback. A revision can *draft*
  these; it must not *freeze* them.
- **Not implementation-ready for production.** Every independent production gate the
  33H §6 verdict named remains held: durable storage (ADR-022E gate #8), production
  auth/consent, production signer/authority, production identity binding, and the
  final route contract itself. The Straylight response is explicit that resolving the
  primitive review "alone does not make production admission ready."
- **The next useful lane is a docs-only route-contract revision, not runtime
  implementation.** The gain available now is to *rewrite the 33G draft* so it (a)
  states the confirmed vocabulary as confirmed, (b) cites the finalized
  storage/auth/consent dependencies precisely, and (c) standardizes on
  `public_receipt_ref` — **without** mutating vectors/validators or freezing a
  schema. That is a docs-only revision (33X), not an implementation lane.

**Why not finalize the route contract now.** Finalization would require deciding the
route-owned questions above (idempotency keying, refusal taxonomy, identity binding,
atomicity/rollback) *and* clearing the held production gates (durable storage,
auth/consent). No artifact in this chain proves any of those is safe to decide or
clear today; the storage/auth/consent design is *finalized on paper*, not *built*,
and the durable-store ADR is not written. Finalizing here would freeze decisions
ahead of their evidence — exactly the move every gate in this chain has refused.

**Why not an implementation lane.** Identical reasoning to 33V §8 and 33H §6: the
Phase 33N spike (Storage Option A, disabled-by-default, dev/operator-only) is the
*only* authorized route surface, and nothing here authorizes more. The route contract
is a draft; the production gates are held; selecting implementation would bypass them.

---

## 6. What the Phase 33G route-contract draft must be updated to include

This is the checklist of required updates to the Phase 33G route-contract **draft**,
derived from the §3 delta and §4 constraints. **It is a specification of the work a
future docs-only revision (33X) must perform — Phase 33W performs none of it here.**
Each item is a docs-only draft change; **none mutates route vectors, fixtures, or
validators** (any such mutation is a separately-gated lane), and **none freezes the
final schema.**

- [ ] **Endpoint idempotency key semantics and replay/conflict behaviour.** State the
  key scope candidates (candidate-id-keyed vs header-keyed vs both — still undecided),
  identical-replay (return prior result, no re-decide), conflicting-replay (fail
  closed, `admission.idempotency_conflict`), rejected-replay (stable denied envelope),
  accepted/supersession replay (no duplicate mint), and malformed-replay (draft). Mark
  `idempotency_final: false`.
- [ ] **Explicit statement that content-addressed Straylight IDs are not endpoint
  idempotency.** State that `contentId(...)`-derived `transition_id`/`assertion_id`
  (deterministic only for identical complete inputs *including `now`*) are a distinct,
  narrower concept; no substrate de-dup / replay guard is claimed; the Dixie ledger's
  replay behaviour is a spike property, not a Straylight proof.
- [ ] **Request envelope fields and owner boundaries.** State which fields are
  wedge-primitive (`estate_id`, `actor_id`) vs Dixie host-layer (`tenant_id`), that
  "subject" maps to `Assertion.subject_refs` (no coined `subject_actor_id`), and that
  identity is **session-derived, never body-trusted**; production binding undefined
  (`identity_binding_final: false`).
- [ ] **Public response envelope using `public_receipt_ref` as the preferred target,
  without freezing the final schema.** Standardize the public-safe receipt reference
  on `public_receipt_ref`, retire `receipt_public_ref` from the public envelope, keep
  the non-Straylight `audit_receipt` off the public surface, and note `null` where no
  public receipt is minted (pending / fail-closed). **Flag that the
  Phase 33E fixtures still carry both spellings (`public_receipt_ref` and
  `receipt_public_ref`) and the Phase 33L vectors use `public_receipt_ref_policy`
  (no `receipt_public_ref`), and that aligning them is a separate vector-mutation
  lane** (not this revision).
- [ ] **Private/audit response envelope boundaries.** Split the audit half
  (`AuditEvent`, append-only/hash-chained; canonical members `assertion_admitted` /
  `transition_denied`) from the receipt half (`TransitionReceipt`, kinds incl.
  `admission` / `denied`) — keep them unconflated; full audit detail private.
- [ ] **Failure/refusal/denial taxonomy.** State the `admission.*` family is draft and
  in no source, grounded in the **two-part** `category.specific_reason` namespace
  (one dot), and does **not** silently inherit recall's `seam.*` codes; preserve
  `rejected_candidate` (class-validation failure) ≠ `denied_transition` (policy
  denial); `ingress.invalid_request` for the ingress family.
- [ ] **Pending/rejected/malformed non-recallability.** Pending candidates, rejected
  candidates, and malformed/unsafe candidates mint nothing recallable and fail closed;
  no `RecallUseInstruction` attaches.
- [ ] **Recall projection as a Dixie constrained projection, not Straylight
  status-to-boolean.** State `recall_eligible` is a derived **per-request** Dixie
  projection of `RecallDisposition` (`include`/`mark`/`redact`/`exclude`), recomputed
  at recall time — never persisted authority, never a status→boolean rule; redacted/
  excluded get no instruction; no universal `active ⇒ recallable`.
- [ ] **Supersession/correction vocabulary using Dixie-local or re-related terms.**
  Use `supersedes_refs` (canonical forward field) + `link_assertions` (link type
  `supersedes`) → canonical `assertion_linked`; mark `assertion_superseded` and the
  inverse `superseded_by_assertion_id` as **Dixie-local** projections; drop
  `assertion_superseded` as a canonical audit event; ordinary recall includes the
  corrected `active` assertion only.
- [ ] **Durable storage dependency and ADR-022E held gate.** State no durable
  admission store is designed/authorized; gated behind ADR-022E gate #8 (held);
  related gates #10/#12/#20; the Phase 33Q synthetic ledger is non-durable,
  test-seam-only, and does not satisfy this.
- [ ] **Service auth and end-user auth/consent dependencies.** State service auth
  (`policy_service` / `SignerCompetenceRule` / `Keyring` / policy; `authority_*_draft`
  names Dixie draft; `authority_binding_final: false`) is required; end-user consent
  is required for production (explicit consent artifact or platform-mediated grant;
  Option D rejected; consent reference private-audit-only); **service auth ≠ end-user
  consent**; the 33N dev `x-admission-service-token` gate is non-production only.
- [ ] **Tenant/estate/actor binding dependencies.** Restate the §6 binding ownership
  (estate/actor wedge-primitive; tenant host-layer; session-derived) as a route
  dependency, production binding undefined.
- [ ] **No-leak public response requirements.** State the canonical projection rule is
  `privacy_scope` + environment-frame disposition, with the Dixie denylist as
  defense-in-depth (not the canonical rule); never-public categories enumerated (raw
  payload, source, signer/authority, operational ids, identity ids, idempotency keys,
  storage internals, debug).
- [ ] **Atomicity/rollback/no partial-residue requirements.** State a multi-step
  admission must be atomic — no partial-admission residue, fail-closed on partial
  commit — as a design requirement.
- [ ] **Migration/backward-compatibility considerations.** Note forward-only
  migrations, backfill, and rollback are undesigned and required inputs to a future
  durable-store ADR, not this revision; probes/vectors are not a frozen schema.
- [ ] **Route vectors/validators update deferred to a separate lane.** State
  explicitly that the route-contract revision does **not** mutate the Phase 33L
  vectors, the Phase 33E fixtures, or either validator; any vector/validator change is
  a separately-gated lane subject to the Phase 33D §6 invariant.

---

## 7. Final design decisions / still blocked

Each area below carries the **Phase 33W readiness decision** (the route-contract
posture this gate now records), whether it is **still blocked**, the **owner / later
gate**, and the **implementation implication**. *Readiness decision* means "what the
route-contract revision should now commit to on paper," never "what is implemented" —
nothing is implemented, and the route contract is not frozen.

| Route-contract area | Phase 33W readiness decision | Still blocked? | Owner / later gate | Implementation implication |
|---------------------|------------------------------|:--------------:|--------------------|----------------------------|
| **Endpoint idempotency** | Dixie / endpoint-route-contract-owned; the revision drafts key semantics + replay/conflict behaviour and states content-addressed IDs are not endpoint idempotency; keying still undecided (`idempotency_final: false`). | **Yes** | Dixie route-contract gate (33X+) | Keying must be decided in a route-contract revision before any non-spike handler keys replay. |
| **Request envelope** | Revise to fix wedge-primitive vs host-layer ID ownership, `subject_refs`, and session-derived identity; no field frozen. | **Yes** (production binding) | Dixie route contract + production identity-binding gate | No wire schema is frozen; types/required-status remain revision outputs. |
| **Public response** | Standardize on `public_receipt_ref` (retire `receipt_public_ref` from the public envelope); keep `audit_receipt` off the public surface; no schema frozen; vectors unchanged. | **Yes** (final serializer + final schema) | Dixie public-surface design; route contract (33X+); separate vector-mutation lane | A bounded, non-production Phase 33N public-response builder (`public-response.ts:95`) + guarded send path (`admission-intake.ts:247`) already exist; the final production serializer still has to be designed/built; the Phase 33E fixtures keep both spellings and the Phase 33L vectors keep `public_receipt_ref_policy` (no `receipt_public_ref`) until a separate lane. |
| **Private/audit response** | Split `AuditEvent` (audit half) + `TransitionReceipt` (receipt half), unconflated; full audit detail private. | **Yes** (durable private/audit boundary) | Dixie public-surface design; durable-store gate (ADR-022E #8 held) | A bounded, non-production Phase 33N runtime serializer exists, but a durable private/audit boundary remains missing/blocked; persistence is gated. |
| **Recall projection** | `recall_eligible` is a derived per-request Dixie projection of `RecallDisposition`, recomputed at recall time — never persisted authority, never status→boolean. | No (semantics resolved; Dixie-owned) | Dixie public-surface design | No canonical or production persisted eligibility authority; recall recomputes disposition per request. (The Phase 33Q synthetic ledger stores a constrained, spike-local `recall_eligible` boolean — a non-durable, non-production projection, not durable storage or production recall authority.) |
| **Supersession vocabulary** | Use `supersedes_refs` + `link_assertions`/`assertion_linked`; `assertion_superseded` dropped as canonical, re-related Dixie-locally; inverse `superseded_by_assertion_id` stays Dixie-local. | No (re-relation decided) | Dixie-local; a dedicated Straylight event is a separate Straylight ADR (deferred) | Synthetic label must be re-related before any non-spike mapping. |
| **Storage dependency** | No durable store designed/authorized; behind ADR-022E gate #8 (held); synthetic ledger explicitly non-durable. | **Yes** | ADR-022E gate #8 (held); future production-storage gate | A durable store may not be built until a separate ADR clears gate #8. |
| **Auth/consent dependency** | Service auth via `policy_service`/`SignerCompetenceRule`/`Keyring`/policy; production consent required (artifact or platform-mediated grant; Option D rejected; private-audit-only); dev token non-production. | **Yes** (production semantics) | Production signer/authority gate; production auth/consent gate | No production auth/consent model selected; cross-user/public admission stays blocked. |
| **Identity binding** | `estate_id`/`actor_id` wedge-primitive; `tenant_id` host-layer; session-derived; production binding undefined (`identity_binding_final: false`). | **Yes** (production binding) | Production identity-binding gate | Production identity binding stays undefined; no `subject_actor_id` coined. |
| **Validators/vectors** | Unchanged; read-only; any change is a separate gated lane (Phase 33D §6 invariant). | **Yes** (mutation gated) | Separate vector/validator-mutation lane | No handler/vector change here; vectors stay frozen until a separate lane. |
| **Freeside handoff** | No client contract handed off; adapter test-only, not exported, not runtime-wired, no live Dixie call. | **Yes** | Freeside gate, after a mature Dixie contract | No Freeside runtime/client wiring authorized. |
| **Production readiness** | Not ready; the readiness update clarifies the route contract's remaining work but clears no independent production gate. | **Yes** | All of the above gates | Production admission stays blocked under every option. |

> **None of §7 is a production-readiness claim.** Each "readiness decision" records
> the *posture* the route-contract revision should adopt against the confirmed
> vocabulary and finalized storage/auth/consent design; every production lane remains
> independently gated (§9), exactly as the Straylight response, Phase 33U, and Phase
> 33V state.

---

## 8. Decision: next Dixie lane

> **Selected: Phase 33X — Admission Wedge route-contract revision draft, docs-only.**

**Reason:**

- **Phase 33W resolves the readiness-update step.** It has reassessed the 33G draft
  against the confirmed vocabulary and finalized storage/auth/consent design (§3),
  rendered the readiness verdict (§5), and specified exactly what the 33G draft must
  later be updated to include (§6).
- **The next material gain is performing that revision.** The §6 checklist is a
  concrete, bounded, docs-only worklist: rewrite the 33G route-contract draft so it
  states the confirmed vocabulary as confirmed, cites the finalized
  storage/auth/consent dependencies precisely, standardizes on `public_receipt_ref`,
  and re-relates supersession via `supersedes_refs` + `link_assertions` — **without**
  finalizing/freezing the contract, mutating vectors/validators, or implementing
  runtime behaviour.
- **This preserves separation** from (a) final route-contract acceptance (a later
  gate after the revision), (b) validator/vector mutation (a separate gated lane), (c)
  runtime implementation (blocked), and (d) production storage/auth/consent (held
  gates).
- **Implementation remains blocked** until the route contract is revised, then
  separately accepted, and the independent production gates (ADR-022E gate #8,
  production auth/consent, identity binding, signer/authority) are cleared on their
  own. So an implementation lane is **not** selected.

**Why not finalize the route contract instead (a "33X — route-contract finalization"
lane).** Finalization would require deciding the still-undecided route-owned questions
(idempotency keying, `admission.*` taxonomy, production identity binding,
atomicity/rollback) and clearing held production gates; §5 shows no artifact proves
that is safe today. A revision draft makes forward progress while keeping
finalization separately gated.

**Why not an implementation lane.** No artifact here proves implementation is now
safe. The Phase 33N spike (Storage Option A, disabled-by-default, dev/operator-only)
remains the only authorized route surface; ADR-022E gate #8 stays held; production
auth/consent, the final route contract, and final endpoint idempotency semantics each
remain to be cleared; no final schema is frozen. Selecting implementation would bypass
those gates.

**Provisional phase label.** The follow-on lane is provisionally labelled **Phase
33X**. The label is for ordering only; the route-contract revision content belongs to
that future, separately-gated docs/decision phase and is **not** drafted here. No
route, store, migration, auth, consent, public surface, Freeside wiring, package
export, route-contract freeze, vector mutation, or schema freeze is selected,
scheduled, or authorized under any option.

---

## 9. What remains blocked regardless of this readiness update (blocked lanes preserved)

Phase 33W is a docs/decision-only readiness-update gate. It authorizes none of the
following; each remains **blocked** and is **not** unblocked by updating
route-contract readiness:

- route / API handler implementation **beyond the existing Phase 33N spike**;
- production admission;
- durable Admission Wedge storage (ADR-022E gate #8 held);
- DB writes;
- production database migrations;
- auth implementation;
- production auth / consent;
- public `remember-this`;
- Discord command / history ingestion;
- user chat becoming memory;
- Freeside Characters runtime / client integration;
- package exports;
- the final Dixie route contract;
- route-contract freeze;
- route-vector mutation;
- validator mutation;
- production route deployment;
- production readiness of any kind;
- final / production schema freeze;
- LLM / voice;
- Finn production wiring;
- forget / revoke / correction UI;
- final idempotency semantics (Dixie / endpoint-owned; undecided);
- production signer / authority semantics;
- production tenant / estate / actor identity binding.

This gate also explicitly does **not**:

- mutate the Phase 33E probe JSONs, the Phase 33L route-vector JSONs, or either docs
  validator;
- mutate the Phase 33N route handler (`app/src/routes/admission-intake.ts`), the Phase
  33Q ledger module
  (`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`), or any
  spike service module / test;
- flip `route_contract_final`, `idempotency_final`, `identity_binding_final`,
  `authority_binding_final`, `straylight_primitive_review_complete`, or any other
  draft marker in any runtime artifact — the spike markers are inspected **read-only**
  and left `false`;
- change any config, env, package, lockfile, CI, or generated file;
- wire the Phase 33Q ledger into `server.ts` or add any env flag;
- claim that updating route-contract readiness makes production admission ready;
- claim Straylight owns the endpoint idempotency semantics;
- finalize or freeze the Dixie route contract.

> **On scope-expansion.** If a later phase reaches for anything in the blocked list,
> it must re-open the relevant prior gates (Phase 33F readiness, 33G design, 33H
> acceptance, 33I decomposition, 33K precondition design, 33L test-vector draft, 33M
> authorization, 33N spike, 33O acceptance, 33P storage/receipt hardening, 33Q ledger,
> 33R acceptance, 33S decomposition, 33T review request, 33U response intake, 33V
> storage/auth/consent finalization, this readiness-update gate) and the relevant
> Straylight decision records (ADR-022E durable-store gate; ADR-026C / ADR-026D route
> guardrails — the recall-intake seam, a different seam from admission) first; it must
> not silently expand scope.

---

## 10. Acceptance criteria and validation

### 10.1 Acceptance criteria for Phase 33W

Phase 33W succeeds if and only if:

1. **Docs/decision-only** — it creates this Phase 33W readiness-update doc and at most
   minimal cross-reference status notes, and changes **no** source, test, route,
   store, migration, auth, consent, validator, probe/fixture/vector JSON, config, env,
   package, lockfile, CI, or generated file.
2. **Source-chain recorded** — it records the 33F→33V chain into this gate and treats
   the Phase 33V finalization (which consumed the 33U reconciliation of Straylight PR
   #65) as the source-of-truth input (§2).
3. **Readiness delta produced** — it tabulates the per-area delta after PR #65 / 33U /
   33V, separating what is now clarified from what remains blocked (§3).
4. **Critical constraints carried forward** — it carries the idempotency/id-derivation,
   `RecallDisposition`, `assertion_superseded` re-relation, `public_receipt_ref`, and
   ADR-022E-gate-#8-held constraints without inventing answers beyond the Straylight
   response / Phase 33U / Phase 33V (§4).
5. **Route-contract readiness verdict rendered** — it states the contract is more
   ready than at 33H, not final/frozen, not implementation-ready, with a docs-only
   revision as the next step (§5), and does not claim finalization.
6. **Draft-update checklist produced** — it specifies what the 33G draft must later be
   updated to include, without mutating vectors/validators (§6).
7. **Decisions/blockers tabulated** — it records the final readiness decisions and
   still-blocked areas per route-contract area (§7).
8. **No production-readiness claim** — it does **not** flip any draft marker, does
   **not** claim the readiness update clears production admission, and does **not**
   claim Straylight owns endpoint idempotency (§1, §9).
9. **Blocked lanes preserved** — it authorizes no production / durable / public /
   Freeside / package / schema-freeze / auth / consent / route-contract-freeze /
   vector-mutation lane (§9).
10. **Next lane selected** — it selects a docs/decision-only Phase 33X route-contract
    revision-draft follow-on and explains why finalization and implementation lanes
    are not selected (§8).
11. **Validators stay green** — the Phase 33E fixture validator and the Phase 33L
    route-vector validator both pass unchanged (§10.2).

### 10.2 Validation requirements

Phase 33W is docs/decision-only; its validation is that it changed **nothing
executable** and that the two docs validators stay green:

- `git status --short --branch --untracked-files=all` shows **only** the new Phase 33W
  decision doc and at most the minimal cross-reference status notes (§10.3) — no
  source, test, validator, probe, fixture, vector, config, env, package, lockfile, CI,
  or generated file;
- `git diff --name-status` and `git diff --stat` confirm any tracked-file edits are
  confined to `docs/` Markdown;
- `git diff --check` is clean (no whitespace errors / conflict markers);
- because the new doc is untracked, a no-index whitespace check confirms it is clean:
  `git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-UPDATE-GATE.md || test "$?" = "1"`
  (the `|| test "$?" = "1"` absorbs the expected exit code 1, which signals the file
  *has content* / differs from the empty `/dev/null`, **not** a whitespace defect);
- the Phase 33E fixture validator stays green —
  `node docs/admission-wedge/fixtures/validate-fixtures.mjs` reports **5/5 probes
  valid, 0 failures**;
- the Phase 33L route-contract test-vector validator stays green —
  `node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  reports **5/5 vectors valid, 0 failures**;
- a **docs-only scope check** confirms no application-code (`src/`, `app/`, `lib/`),
  config, env, or generated path is touched;
- a **markdown fence sanity check** confirms the new doc has no unbalanced code fences;
- nothing is staged or committed by this phase (the branch's commit/merge is a
  separate, explicitly-authorized step).

> The repository package manifests define no Markdown/docs lint script; existing lint
> scripts do not target Markdown, so only diff/whitespace/scope validation and the two
> existing docs validators are applicable to this docs-only decision artifact.

### 10.3 Cross-references

- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V / PR #140, the storage/auth/consent design-finalization gate that
  finalized the §4 storage and §5 auth/consent design, recorded the §6 route-contract
  dependencies, and **selected this Phase 33W lane** (its §8). The source-of-truth
  input to this gate. **Fills its reserved Phase 33W status note (its §8 / §10.3).**
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-GATE.md)
  — Phase 33F route-contract readiness gate; the prior readiness posture this gate
  **updates** (its §4–§6 inventory, §7 review questions, §8 storage/auth/consent
  preconditions). Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-DESIGN.md)
  — Phase 33G draft route-contract design; the draft this gate reassesses and whose
  required updates §6 checklists (its §9.1 two-spelling debt, §12 idempotency, §15
  recall projection, §17 Straylight dependencies). Read-only here; **not modified** —
  the §6 updates are deferred to the Phase 33X revision lane.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-ACCEPTANCE-GATE.md)
  — Phase 33H acceptance gate; its §6 NOT-implementation-ready verdict, §8 blocker
  inventory, and two §3 corrections (two-part namespace; strict per-section validator)
  this gate's §3 delta builds on. Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I decomposition gate; its §8/blocker table (A–P) and lane ordering
  (33J→33K→33L→33M→33N) this chain executed. Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K precondition design gate; the design Phase 33V finalized and whose
  record-shapes/idempotency/auth/consent/binding the §6 dependencies cite. Read-only;
  **not modified**.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U / PR #139 response-intake gate; its §4 A–O reconciliation (rows C, D, E,
  F, G, H, J, N, O) is the upstream of this gate's §3 delta and §4 constraints.
  Read-only; **not modified**.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md)
  — Phase 33T primitive-review follow-up / cross-repo request; the A–O register the
  Straylight response answered. Read-only; **not modified**.
- [`docs/ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)
  — Phase 33S decomposition gate; recorded the D→E follow-on the chain executed.
  Read-only; **not modified**.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  / [`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs)
  — the Phase 33L route-contract test vectors and validator; both must stay green and
  unchanged (§10.2). Read-only; **not modified**.
- [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md)
  / [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  — the Phase 33E fixture set and validator; both carry the `receipt_split.public_receipt_ref`
  vs `public_response.receipt_public_ref` two-spelling reconciliation debt (README
  `:143-144,313`) and must stay green and unchanged (§10.2). Read-only; **not
  modified**.
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/` (`admitted-assertion-ledger.ts`,
  `classifier.ts`, `public-response.ts`, `no-leak.ts`, `auth-gate.ts`, `index.ts`), and
  `app/src/server.ts` — the Phase 33N spike and Phase 33Q ledger, inspected
  **read-only** to ground the §3 / §4 constraints against the concrete synthetic
  shapes (the `assertion_superseded` label at `admitted-assertion-ledger.ts:123,890`,
  the inverse `superseded_by_assertion_id` at `:105`, the `recall_eligible` boolean at
  `:101,793,886`). **None is modified by this phase**; no draft marker is flipped.
- `loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md` — the Straylight
  primitive-review response (PR #65, merged); read **read-only** in the adjacent
  `../loa-straylight` checkout; **not modified.** Its dispositions are the inputs Phase
  33U reconciled, Phase 33V finalized, and this gate's §3 / §4 carry forward.
- `@loa/straylight` — canonical primitive/substrate owner of the assertion lifecycle,
  recall-eligibility, signer/keyring, receipt/audit, and storage-adapter vocabulary.
  The durable estate store is gated by **ADR-022E** (gate #8 held); route guardrails
  by **ADR-026C / ADR-026D** (recall-intake seam only — a different seam from
  admission). **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (**verified merged on GitHub** 2026-06-06) —
  the cross-repo acceptance; its mirror/adapter proof is test-only, not exported, not
  runtime-wired, with no live Dixie call. Handed **no** new authorization by this gate.
  **Not edited by this phase.**
