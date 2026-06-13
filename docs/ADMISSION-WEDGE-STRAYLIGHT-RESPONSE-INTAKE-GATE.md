# Phase 33U — Admission Wedge Straylight Primitive-Review Response Intake / Lane-Decision Gate

> **Phase**: 33U
> **Branch context**: `phase-33u-admission-straylight-response-intake`
> **Related**: Dixie Phase 33A–33T (loa-dixie); freeside-characters Phases 45E–45J;
> Straylight (`@loa/straylight`) assertion-lifecycle, recall-eligibility,
> signer/keyring, receipt/audit, and storage-adapter primitives
> **Status**: **docs / decision-only.** No source, test, route, route handler,
> storage, store code, DB write, migration, auth, consent, validator,
> probe/fixture/vector JSON, config, env, package, lockfile, CI, generated, or
> live-integration change.
> **This is a review-response *intake* / lane-decision gate, not implementation.**
> Dixie Phase 33T / PR #138 (merged) re-issued the Phase 33J §5 A–O review register
> grounded in the concrete Phase 33N route surface and Phase 33Q bounded synthetic
> ledger, and **requested** a Straylight-side primitive-review answer. Straylight
> answered in **`loa-straylight` PR #65 (merged)** —
> `loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md`. Phase 33U
> **intakes that response**, reconciles each A–O disposition into the Dixie review
> register, records what is now resolved / accepted / delegated / still-held from
> Dixie's perspective, and **selects the next safe Dixie lane**, and stops. It
> implements **no** route, route handler, storage, store code, DB write, migration,
> auth, consent, runtime behaviour, package export, or Freeside integration; it does
> **not** finalize the Dixie route contract; and it does **not** make production
> admission ready.

This document is the Dixie-side **Straylight primitive-review response intake /
lane-decision gate** that Phase 33T / PR #138 selected as the next lane
([`ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md:754-784`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md)).
Phase 33T was a **request** into Straylight's ownership; it advanced the A–O review
but could not answer it. Straylight has now answered. Phase 33U executes exactly the
charter Phase 33T defined for it (§10 of that doc): it **intakes** the
Straylight-side response, reconciles each A–O disposition into the Dixie register,
records the Dixie-owned decision (or continued deferral) where the response says
*delegated-to-Dixie* or *unresolved* — **without inventing answers beyond the
Straylight response** — separates what the response resolves from the independent
production gates it does **not** clear, preserves every blocked lane, and selects a
docs/decision-only next lane. It designs no envelope, implements no route, mutates no
probe / validator / fixture / vector, builds no store, and authorizes no live
behaviour, route spike, or storage.

Every disposition below is grounded **read-only** in the actual Straylight response
(`loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md`, read in the
adjacent `../loa-straylight` checkout; **not modified**) and the prior Dixie docs
chain (33I–33T). Where the Straylight response cites Straylight source `file:line`,
those citations are **the response's own grounding** (its §3 confirmed them against
current `loa-straylight` HEAD); Phase 33U carries them forward as the response stated
them and does **not** re-derive or re-verify Straylight source independently.

> **This phase does not complete production readiness.** Resolving the Straylight
> primitive review clarifies the *design*; per the Straylight response itself, it
> does **not** clear the independent production gates. `straylight_primitive_review_complete`
> is **not** flipped to `true` by this docs/decision phase — the runtime markers
> (`app/src/services/admission-wedge-spike/`) are **not** mutated here; any change to
> those markers is a separately-gated future implementation phase. The
> vocabulary-prerequisite has been *answered by Straylight*; turning that answer into
> any code, schema, route, or marker change remains future, separately-gated work.

---

## 1. Status and scope

- **Phase 33U — Admission Wedge Straylight primitive-review response intake /
  lane-decision gate.**
- Dixie-side **docs / decision-only**.
- It **intakes the Straylight response** from `loa-straylight` PR #65 (merged) —
  `loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md` — and reconciles
  the A–O dispositions into the Dixie review register (§3, §4).
- It does **not** implement a route, route handler, storage, store code, DB write,
  migration, auth, consent, runtime behaviour, package export, or Freeside
  integration.
- It does **not** finalize the Dixie route contract (Phase 33G remains a draft
  design; `route_contract_final:false` everywhere).
- It does **not** make production admission ready, and it does **not** flip
  `straylight_primitive_review_complete` in any runtime marker (the spike service
  modules and their markers are inspected **read-only** and left unchanged).
- It changes **no** source, test, route, route handler, storage, store code,
  validator, probe/fixture/vector JSON, config, env, package, lockfile, CI, or
  generated file. The only mutations are this new decision doc and at most minimal
  cross-reference status notes on predecessor docs (§10, §9).
- It does **not** mutate the Phase 33N route handler, the Phase 33Q ledger module,
  the spike service modules, their tests, the Phase 33E probe JSONs, the Phase 33L
  route-vector JSONs, or either docs validator. Per the Phase 33D §6 invariant — any
  probe / validator / fixture / vector mutation requires its own separately-gated
  phase — Phase 33U inspects all of them **read-only**.
- It does **not invent answers beyond the Straylight response.** Where the response
  says *delegated-to-Dixie* or *unresolved*, Phase 33U records the Dixie-owned
  decision (or its continued deferral) as a Dixie-local concern — not as a Straylight
  claim, and not as a resolution Straylight did not make.

The audience is **future Dixie phases** (primarily the Phase 33V lane this gate
selects — §6), with the Straylight (`@loa/straylight`) owner and freeside-characters
as interested-but-unaffected parties (this gate hands neither any new authorization).

---

## 2. Source chain

Phase 33U sits one rung above the Phase 33T review-request follow-up on the Dixie
Admission Wedge ladder, and is the intake of the cross-repo round-trip that 33T
opened. It introduces no new contract material, freezes nothing, and authorizes
nothing; it consumes the Straylight answer 33T requested and decides the next lane.

### Dixie (loa-dixie) — the chain into 33U

| Phase | PR | Artifact / contribution |
|-------|----|--------------------------|
| 33N | #132 | Dev/operator-only route-spike **implementation** (commit `f44dd702`) — disabled-by-default `POST /api/admission/intake` on **Storage Option A (no durable storage)**, fail-closed, no-leak; authorized no production lane. |
| 33O | #133 | Route-spike **acceptance** gate (commit `db14ab40`) — accepted 33N only as a bounded, disabled-by-default, dev/operator-only route spike; does **not** complete MVP 2. |
| 33P | #134 | Storage / receipt hardening **decision** gate (commit `0e97758a`) — selected Option B (dev-only bounded synthetic store), rejected Option D (production-like durable storage); judged further paper decomposition would "add a gate without adding evidence." |
| 33Q | #135 | Dev-only bounded synthetic admitted-assertion **ledger** (commit `6d6f07f6`) — process-local, Map-backed, synthetic-only, tenant+estate-scoped, capacity-bounded, non-durable, fail-closed, **test-seam-only** (not wired into `server.ts`). |
| 33R | #136 | Bounded-ledger **acceptance / hardening** gate (commit `ae93ad3d`) — accepted 33Q only as a bounded, non-production, test-seam-only synthetic proof; named §9 Options A–F. |
| 33S | #137 | Route-spike + bounded-ledger acceptance **decomposition** gate (commit `682abc7e`) — selected **Option D** (Straylight primitive-review follow-up) as the highest-leverage vocabulary prerequisite; recorded the **D→E follow-on**; rejected production rollout; preserved every blocked lane. |
| 33T | #138 | Straylight primitive-review **follow-up / cross-repo review request** (commit `097c1c05`) — re-issued the §5 / 33J A–O register (unresolved E, G, H, K, N, O; review-dependent J; aligned-draft A, B, C, D, F, I, L, M) grounded in the concrete 33N route surface and 33Q ledger; defined the expected Straylight response shape; selected **Phase 33U** (this gate). Completed no review. |
| **Straylight** | **`loa-straylight` PR #65 (merged)** | **Admission Wedge primitive-review *response*** — `loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md`. Answers the 33T A–O request from the side that owns the assertion-lifecycle / recall / signer / receipt-audit / storage-adapter vocabulary. Docs/decision-only on the Straylight side; authorizes no implementation lane in either repo. **The source-of-truth input to this gate.** |
| **33U** | *(this doc; docs/decision-only — not committed/merged yet)* | **Straylight response intake / lane-decision gate** — intakes the PR #65 response, reconciles the A–O dispositions (§4), records Dixie implications (§5), preserves every blocked lane (§7), and selects **Phase 33V** (storage/auth/consent design-finalization follow-on against the now-confirmed vocabulary — the documented D→E follow-on; docs/decision-only — §6). Completes no implementation; makes no production-readiness claim. |

### Straylight (`@loa/straylight`)

The canonical primitive/substrate owner. Its response (PR #65) **confirmed** the
Phase 33J / 33T carried-forward citations against current `loa-straylight` HEAD
(response §3): for the primitives the A–O register depends on, current HEAD **matches**
the carried-forward citations, and the response is the **first** Straylight document
to name the Admission Wedge — it coins **no** new canonical primitive in doing so. The
prior "checkout may be stale" caveat (33T §2) is therefore **resolved** for the A–O
primitives by the response's own §3 confirmation.

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

## 3. Straylight response intake summary

This section records the Straylight response **as written** (PR #65). It is an
intake, not a re-interpretation: every point below is the Straylight response's own
statement, cited to its sections. Phase 33U **adds no answer Straylight did not
give**.

### 3.1 What the response is

- A **Straylight-side docs/decision-only** answer to the 33T A–O vocabulary review,
  from the side that owns the assertion-lifecycle / recall / signer / receipt-audit /
  storage-adapter vocabulary (response §1, §2).
- It **confirms** the 33J/33T carried-forward Straylight citations against current
  HEAD (response §3) — resolving the "possibly-stale checkout" caveat for the A–O
  primitives — and coins **no** new canonical primitive (response §3).
- It is **not** a production authorization: confirming canonical vocabulary clarifies
  the *design*; it does **not** clear the independent production gates. ADR-022E gate
  #8 (production persistence), gate #10 (broad Dixie boundary wiring), and gate #12
  (new network surface) remain **held** (response §1, §5.3, §7).
- It authorizes **no** Dixie endpoint, **no** route contract, **no** Freeside
  runtime/client wiring, and it does **not** claim Straylight owns endpoint
  idempotency (response §1, §2, §6).

### 3.2 Idempotency / id-derivation (response §5 row J, §5.2)

- **Endpoint idempotency remains Dixie / endpoint-route-contract-owned.** There is
  **no `idempotency_key` primitive** anywhere in Straylight; idempotency is delegated
  to the host/Dixie per the recall-wedge precedent ADR-026D §3.b.
- **Straylight content-addressed id derivation is a distinct, narrower primitive-level
  concept**, *not* endpoint replay/idempotency: `transition_id` / `assertion_id` are
  derived via `contentId(...)` over the full input **including `now`**.
- **IDs are deterministic only for identical *complete* inputs — the same candidate
  *and* the same `now`.** The same candidate admitted at a different `now` yields
  different ids.
- **No substrate-level de-duplication and no replay guard is claimed** — admission
  appends unconditionally (`appendTransition` is a plain `push`); `admit()` performs
  no prior-id lookup before minting; transitions/audit are append-only with no
  replay-detection step. Content-addressed id derivation is **not** proof of replay
  compatibility and must **not** be cited as substrate de-duplication.
- **The Dixie synthetic ledger's replay behaviour remains a Dixie-local endpoint
  concern, not a Straylight replay proof.** The ledger's spike-scoped behaviour
  (identical replay mints nothing; conflicting replay fails closed without overwrite)
  is enforced by the **Dixie ledger spike**, not the Straylight substrate; Straylight
  confirms only the **delegation / primitive-compatibility boundary**, and the
  endpoint keying remains undecided (`idempotency_final: false`).

### 3.3 Recall eligibility (response §5 row E)

- **`RecallDisposition` governs recall semantics** — the canonical primitive is the
  four-member union `include` / `mark` / `redact` / `exclude` returned by
  `dispositionFor(assertion, request)`, computed **per request** from status, request
  filters, `privacy_scope`, and risk profile.
- **Recall instructions apply only to included / marked items** — a
  `RecallUseInstruction` is attached **only** to included (`usable`) and marked items.
- **Redacted / excluded assertions receive no `RecallUseInstruction`.**
- **`active` can still be excluded** by request filters, privacy frame, or
  risk-profile checks — there is **no universal `active ⇒ recallable` rule**.
- **`superseded` can be *marked*** (background) when `include_statuses` explicitly
  opts in, otherwise it is excluded.
- **The Dixie ledger boolean is a constrained, lossy Dixie projection** of
  `dispositionFor` for one request frame (`include`/`mark` → `true`-ish vs
  `redact`/`exclude` → `false`), **not** canonical Straylight status-to-boolean
  semantics and **not** a coined stored primitive. The ledger's `active ⇒ true` /
  `superseded ⇒ false` mapping is a specific Dixie projection under default request
  conditions only.

### 3.4 `assertion_superseded` re-relation (response §5 row C, §5.1)

- **`assertion_superseded` is not a canonical Straylight `AuditEventType`** — it is
  **absent** from the enumerated members (the response lists `transition_denied`,
  `assertion_admitted`, `assertion_classified`, `assertion_linked`,
  `assertion_challenged`, `assertion_demoted`, `assertion_revoked`,
  `assertion_forgotten_from_recall`, `recall_requested`, `recall_pack_emitted`,
  `commitment_created`, `feedback_recorded`, `evaluation_recorded`). Decision:
  **REJECT as an audit-event type; RE-RELATE to existing vocabulary.**
- **The normative re-relation uses existing concepts** — a `link_assertions`
  transition carrying `AssertionLinkType: 'supersedes'`, corresponding to the
  canonical **`assertion_linked`** audit-event member; plus a status transition moving
  the prior assertion to `superseded` recorded via the canonical forward field
  **`supersedes_refs`**, with the corrected assertion remaining `active`.
- **This is vocabulary relation only, not a claim that current runtime emits
  `assertion_linked`.** Straylight implements **no link / supersession executor**
  today (`admit()` and the fixture-only `seedAssertion()` are the only executors);
  `link_assertions` / `assertion_linked` / `supersedes` are **defined vocabulary
  members with no runtime emitter**.
- **The Dixie inverse `superseded_by_assertion_id` is Dixie-local** — the canonical
  relational field is `supersedes_refs` (forward direction); there is **no
  `superseded_by` field** in any Straylight primitive.
- Whether Straylight later *coins* a dedicated `assertion_superseded` event is a
  **separate Straylight ADR decision** (response §5.1, deferred, not blocking); the
  response does **not** coin it and does **not** pre-authorize it.

### 3.5 Storage / durable-store boundary (response §5 row O, §5.3)

- **ADR-022E durable-store gates remain held where applicable.** Any *durable*
  admission store is governed by **ADR-022E gate #8** (production persistence, held);
  it is **NOT authorized** by this review. Related held gates: gate #10 (Dixie
  boundary wiring — unblocked only for the single recall-intake endpoint slice, **not**
  admission), gate #12 (new HTTP/network surface, held), gate #20 (threat-model
  widening required before any such wiring).
- **Dixie's synthetic bounded ledger proof is not durable storage readiness.** The
  Phase 33Q ledger is process-local, Map-backed, non-durable, capacity-bounded,
  fail-closed, and test-seam-only; it proves *vocabulary alignment and synthetic
  transition behaviour*, **not** durable persistence. Durable Admission Wedge storage
  stays gated behind ADR-022E gate #8 and requires a **separate gate-clearing ADR**.

### 3.6 Other intake points

- **Endpoint idempotency, the no-leak serializer, `tenant_id` binding, and the public
  receipt-field name are Dixie projections / host-layer concerns** over the confirmed
  substrate primitives (response §5 rows E, G, H, J, K).
- **The receipt/audit split:** the synthetic `SyntheticAuditRecord` maps to **two**
  distinct Straylight primitives — `AuditEvent` (audit half) + `TransitionReceipt`
  (receipt half) — not one; standardize on **one** public field name (Straylight
  recommends `public_receipt_ref`, consistent with its `*_ref` convention and the
  deferred `public_anchor_ref`); `audit_receipt` is not a Straylight term (response §5
  row H).
- **`policy_service` is a canonical `SignerType`** safe to mirror, but **which roles
  may authorize `admit_assertion` is not a fixed list** (decided by
  `SignerCompetenceRule` / `Keyring` / policy); production signer/authority semantics
  remain an **independent unresolved gate** (response §5 row F).
- **`estate_id` / `actor_id` are wedge primitives; `tenant_id` is host-layer, not a
  wedge primitive**; there is **no `subject_actor_id` primitive** (only
  `Assertion.subject_refs`); production identity binding stays Dixie-host +
  undefined (response §5 row G).
- **The public/private projection rule is `privacy_scope` + environment-frame
  disposition**, not a mirrored denylist alone — the Dixie denylist is
  defense-in-depth, not the canonical rule (response §5 row K).

---

## 4. A–O reconciliation table

The table below reconciles **each** A–O row using **only** the dispositions the
Straylight response assigned (response §5, §8) — drawn from the four-member set
**accepted / rejected / delegated / unresolved**. Rows with more than one sub-area
carry **one disposition per sub-area** (the response's convention). The original
A–O mapping (Phase 33J §5 / 33T §5) is preserved; no row is renamed in a way that
loses it. Row C preserves `transition_denied`; the `assertion_superseded` re-relation
and the row-D inverse-field are handled as Dixie-local; row J / idempotency is
delegated to the Dixie endpoint route contract with Straylight compatibility only;
durable storage remains gated under ADR-022E where applicable.

| Row | Straylight disposition (PR #65 §5/§8) | Dixie intake / consequence | Remaining gate or owner | Phase 33U verdict |
|-----|----------------------------------------|----------------------------|-------------------------|-------------------|
| **A** — candidate / `proposed` pre-admission vocabulary | **accepted** (alignment, not production-final) | Keep `CandidateAssertion` (object) + `proposed` (status); `candidate` may remain a Dixie ingress *object* label, never a status value. The ledger's `pending ⇒ accepted_as_proposed` faithfully mirrors the pre-admission shape. | None (vocabulary) — Straylight-owned, confirmed | **Resolved (vocabulary).** Accept as-is; not a production claim. |
| **B** — admitted lifecycle (`active`) | **accepted** | Mint `active`; expose `admitted` only as a public `outcome_class`; do not coin an `admitted` status. | None (vocabulary) — Straylight-owned, confirmed | **Resolved (vocabulary).** |
| **C** — transition vocab (`admit_assertion` / `assertion_admitted` / `transition_denied`) **+ `assertion_superseded`** | **accepted** (`admit_assertion` / `assertion_admitted` / `transition_denied`) **+ rejected** (`assertion_superseded` → normative re-relation: `assertion_linked` via `link_assertions` + link type `supersedes`, plus `superseded` status via `supersedes_refs`) | Keep `admit_assertion` / `assertion_admitted` / `transition_denied`. **Drop `assertion_superseded` as a canonical audit event**; re-relate it (Dixie-local label) to `assertion_linked` + `superseded`-status — noting Straylight implements no link/supersession executor today. `transition_denied` preserved as canonical. | `assertion_superseded` re-relation is a **Dixie-local** vocabulary fix carried into the Phase 33V storage/auth/consent design-finalization follow-on; final route-contract work remains separately gated; a future dedicated Straylight event is a separate Straylight ADR (deferred) | **Resolved (vocabulary) + action item.** Accept the three; re-relate `assertion_superseded` Dixie-locally. |
| **D** — supersession relation | **accepted** | Model the relation on the canonical forward field `supersedes_refs`. The inverse `superseded_by_assertion_id` is a **Dixie-local** convenience projection (no `superseded_by` field in Straylight). Do not coin `corrected_active` (see N). | None (vocabulary) — Straylight-owned; inverse field Dixie-local | **Resolved (vocabulary).** Inverse field flagged Dixie-local. |
| **E** — recall eligibility projection | Straylight `RecallDisposition` semantics **accepted**; the boolean projection **delegated** (to Dixie) | Treat `recall_eligible` as a derived **per-request** Dixie projection of `RecallDisposition`, recomputed at recall time — **never** persisted as authority and **never** stated as a status→boolean rule. The boolean collapses the mark/redact band; that loss stays a public-surface concern. | Dixie owns the boolean projection (public surface); `RecallDisposition` semantics Straylight-owned | **Resolved (semantics) + Dixie-owned projection decision recorded.** |
| **F** — signer / authority (`policy_service`) | vocab **accepted**; **production authority semantics unresolved** | `policy_service` safe to mirror; `authority_*_draft` field names stay Dixie draft. Which roles may authorize `admit_assertion` is **not** a fixed list (policy / `SignerCompetenceRule` / `Keyring`). | **Production signer/authority semantics — independent unresolved gate** (not cleared by vocab) | **Partially resolved (vocab) + production authority HELD.** |
| **G** — tenant / estate / actor binding | Straylight ids (`estate_id` / `actor_id`) **accepted**; `tenant_id` binding **delegated**; **production binding unresolved** | `estate_id` mirrors the primitive; `tenant_id` is Dixie host-layer (so the ledger's `(tenant_id, estate_id)` scope is a *spike isolation mechanism*, not final semantics); "subject" maps to `subject_refs`, not a dedicated id; no `subject_actor_id`. | `tenant_id` binding Dixie-host; **production identity binding — independent unresolved gate** | **Partially resolved (ids) + production binding HELD.** |
| **H** — receipt / audit vocab + public/private boundary | Straylight half (`AuditEvent` + `TransitionReceipt`) **accepted**; public field name **delegated** (to Dixie) | Split `SyntheticAuditRecord` → `AuditEvent` (audit half) + `TransitionReceipt` (receipt half); do not conflate. Standardize on **one** public field name — adopt **`public_receipt_ref`** (Straylight-recommended); retire `receipt_public_ref`. `audit_receipt` is not a Straylight term; keep private audit detail unexposed. | Dixie owns the public field name; receipt/audit primitives Straylight-owned | **Resolved (primitives) + Dixie naming decision: `public_receipt_ref`.** |
| **I** — fail-closed semantics | **accepted** (alignment, not production-final) | Keep `ingress.invalid_request` as a Dixie-local ingress refusal-family draft; preserve the substrate distinction `rejected_candidate` (class-validation failure) ≠ `denied_transition` (policy denial) into any future non-ingress mapping. | None (vocabulary) — Straylight primitive + Dixie ingress | **Resolved (vocabulary).** |
| **J** — idempotency delegation | **delegated** (endpoint-owned by Dixie; content-addressed id derivation is the distinct, complementary substrate property — Straylight confirms delegation/compatibility only) | **Dixie owns the final endpoint keying** (candidate-id vs header vs both) and all endpoint replay/idempotency; it remains undecided (`idempotency_final: false`). Do **not** record Straylight as the idempotency owner. Content-addressed id derivation (deterministic only for identical complete inputs incl. `now`; no substrate de-dup) is complementary, **not** a substitute for or evidence of endpoint idempotency. | **Dixie / endpoint route contract** — endpoint idempotency semantics **undecided** (Dixie-owned) | **Delegation confirmed; endpoint idempotency HELD as Dixie-owned, undecided.** |
| **K** — public/private projection rule | Straylight rule (`privacy_scope` + frame disposition) **accepted**; serializer **delegated** (to Dixie) | Design the Dixie no-leak serializer against `privacy_scope` + frame disposition, **not** a mirrored denylist alone (the denylist is defense-in-depth). | Dixie owns the serializer implementation; canonical rule Straylight-owned | **Resolved (rule) + Dixie serializer decision recorded.** |
| **L** — candidate → assertion linkage | **accepted** | Keep candidate → transition → assertion linkage; ref field names (`source_candidate_id` / `admission_transition_id` / `admitted_assertion_id`) stay Dixie draft, mapped onto the canonical chain (`EstateTransition.target_refs` carries the minted `assertion_id`). | None (vocabulary) — Straylight-owned; field names Dixie draft | **Resolved (vocabulary).** |
| **M** — denial taxonomy | **accepted** | Bind denial to an explicit `transition_denied` + `denied` `TransitionReceipt`; the `*_draft_non_final` reason code stays Dixie draft; keep `rejected_candidate` and `denied_transition` distinct. | None (vocabulary) — Straylight-owned; reason code Dixie draft | **Resolved (vocabulary).** |
| **N** — corrected-active vs relation | **accepted** | Never coin `corrected_active` as a status; model it as the `active` side of the `(superseded, active)` supersession relation (paired with C re-relation and D), prior → `superseded` via `supersedes_refs`. | None (vocabulary) — Straylight-owned | **Resolved (vocabulary).** |
| **O** — storage / audit boundary + ADR-022E | substrate semantics **accepted**; durable store **unresolved** (ADR-022E gate #8 held) | Dixie may reference substrate semantics in a future storage design without baking draft vocabulary as final. Durable storage requires a **separate ADR** satisfying the ADR-022E gate #8 trigger; the synthetic ledger proof does **not** satisfy it. | **ADR-022E gate #8 (durable store) — HELD**; substrate semantics Straylight-owned | **Resolved (substrate boundary) + durable store HELD (ADR-022E).** |

> **None of §4 is a production-readiness claim.** Each *accepted* disposition aligns
> vocabulary only. The production lanes (durable storage, auth/consent, route
> contract, Freeside integration) remain independently gated regardless of this
> reconciliation (§7), exactly as the Straylight response states (its §5 closing
> note, §7).

### 4.1 Reconciliation summary (by resolution state, Dixie's perspective)

- **Resolved as accepted vocabulary (keep as-is, subject to non-final caveats):**
  A, B, D, I, L, M, N — and the accepted halves of C (`admit_assertion` /
  `assertion_admitted` / `transition_denied`), E (`RecallDisposition` semantics), F
  (`policy_service`), G (`estate_id` / `actor_id`), H (`AuditEvent` +
  `TransitionReceipt`), K (`privacy_scope` + frame rule), O (substrate semantics).
- **Rejected / re-related (Dixie must change):** `assertion_superseded` in C →
  re-relate Dixie-locally to `assertion_linked` + `superseded` status. This is the
  **only** rejected / re-related primitive; Row H's public receipt-field naming is
  **not** rejected — Straylight delegates it to Dixie (see the delegated bullet).
- **Delegated to Dixie (Dixie-owned, recorded as Dixie decisions, not Straylight
  claims):** E boolean projection, G `tenant_id` binding, H public receipt-field
  naming, J endpoint idempotency, K no-leak serializer. On H specifically: Straylight
  **delegates** the public field-naming decision to Dixie and merely **recommends**
  `public_receipt_ref` as its preferred `*_ref`-convention standardization target
  (consistent with the deferred `public_anchor_ref`) — a recommendation, **not** a
  rejected or re-related primitive. Dixie adopts `public_receipt_ref` (standardizing
  away from `receipt_public_ref`) and keeps the non-Straylight `audit_receipt` label
  out of the public surface.
- **Still held / unresolved (independent production gates, NOT cleared by this
  review):** F production signer/authority semantics; G production identity binding;
  J final endpoint idempotency keying (Dixie-owned, undecided); O durable store
  (ADR-022E gate #8 held). Plus the chain-level independent gates outside A–O:
  production auth/consent, final route contract, ADR-022E gates #10/#12/#20.

---

## 5. Dixie implications

The immediate implications for Dixie, drawn strictly from the Straylight response:

1. **Dixie must not use Straylight content-addressed ID behaviour as an endpoint
   replay/idempotency proof.** Content-addressed id derivation is deterministic only
   for identical complete inputs (including `now`), claims no substrate de-duplication
   and no replay guard, and is a *distinct, complementary* substrate property — never
   a substitute for, or evidence of, endpoint request idempotency (response §5.2).
2. **Dixie must keep endpoint idempotency explicit in its own route contract.**
   Endpoint keying (candidate-id vs header vs both) and all replay semantics are
   Dixie / endpoint-route-contract-owned and remain undecided (`idempotency_final:
   false`). The Dixie synthetic ledger's replay behaviour is a Dixie-local endpoint
   concern, not a Straylight replay proof (response §5 row J, §5.2).
3. **Dixie must treat recall eligibility as request/disposition-sensitive, not as a
   bare admitted/active boolean.** Recall eligibility is the emergent, per-request
   `RecallDisposition` (`include`/`mark`/`redact`/`exclude`); there is no universal
   `active ⇒ recallable` rule; `active` can be excluded by request filters, privacy,
   or risk checks, and `superseded` can be *marked* when explicitly requested
   (response §5 row E).
4. **Dixie may keep a constrained public ledger boolean only as a Dixie projection,
   if clearly documented.** `recall_eligible` is acceptable only as a lossy Dixie
   projection of `dispositionFor` for one request frame, recomputed at recall time,
   never persisted as authority and never stated as a canonical status→boolean rule
   (response §5 row E).
5. **Dixie must not treat `assertion_superseded` as canonical Straylight
   vocabulary** — it is absent from `AuditEventType` and is rejected as an audit-event
   type (response §5 row C, §5.1).
6. **Dixie should re-relate `assertion_superseded` to canonical Straylight relation
   vocabulary or keep it explicitly Dixie-local.** The normative re-relation is
   `assertion_linked` (via `link_assertions`, link type `supersedes`) + `superseded`
   status (canonical forward field `supersedes_refs`), corrected assertion `active` —
   noting Straylight emits no `assertion_linked` at runtime today, so this is
   vocabulary relation only. The inverse `superseded_by_assertion_id` stays Dixie-local
   (response §5 rows C, D, N, §5.1).
7. **Dixie must keep durable storage / auth / consent / final route contract
   independently gated.** Vocabulary alignment does not clear ADR-022E gate #8
   (durable store, held), production auth/consent, the final route contract, or the
   final endpoint idempotency semantics; the synthetic ledger proof is not durable
   storage readiness (response §5 row O, §5.3, §7).
8. **Dixie-owned naming/serializer decisions recorded (not Straylight claims):** adopt
   `public_receipt_ref` and retire `receipt_public_ref`; split `SyntheticAuditRecord`
   into `AuditEvent` + `TransitionReceipt` mappings; design the no-leak serializer
   against `privacy_scope` + frame disposition with the denylist as defense-in-depth;
   keep `tenant_id` host-layer and the `(tenant_id, estate_id)` scope a spike isolation
   mechanism (response §5 rows H, K, G).

> These implications are **design clarifications**, not authorizations. Each is an
> input to the Phase 33V storage/auth/consent design-finalization lane (§6); none
> licenses any code, schema, route, marker, or storage change in Phase 33U.

---

## 6. Decision: next Dixie lane

> **Selected: Phase 33V — Admission Wedge storage / auth / consent design-finalization
> follow-on against the now-confirmed Straylight vocabulary (docs / decision-only).**

This is the **documented D→E follow-on** that Phase 33S recorded as the
next-after-D lane
([`ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md:523-533`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md))
and that the Straylight response itself recommends as the lane after 33U (response
§9: "the documented D→E follow-on … may proceed **as a docs/design lane only**").

**Reason:**

- **Phase 33U resolves the Straylight-response *intake* step.** The cross-repo
  round-trip 33T opened is now closed: the A–O vocabulary answers are available and
  reconciled (§4).
- **The Straylight vocabulary response is now available**, so the precondition that
  blocked finalizing the Phase 33K storage/auth/consent *design* — "the design of
  U4/U5/U6/U7 cannot be made unambiguous against draft vocabulary the review may
  rename or re-relate" (33S §7) — is **removed** for the vocabulary it depended on.
  The next material gain is consuming those answers (the `assertion_superseded`
  re-relation, the `public_receipt_ref`/audit-split, the `RecallDisposition`
  projection, the `tenant_id` host-layer binding, the row-J endpoint-idempotency
  ownership, the ADR-022E gate-citation) into the storage/auth/consent design — **as
  a docs/design lane only**.
- **Production is still blocked by independent gates** that this review does not
  clear, so an implementation lane is **not** selected. The still-held gates are:
  - **ADR-022E durable-store / production storage architecture** (gate #8, held);
  - **production auth / consent**;
  - **the final Dixie route contract**;
  - **final endpoint idempotency semantics** (Dixie / endpoint-owned, undecided);
  - **production signer / authority semantics**;
  - **production tenant / estate / actor identity binding**;
  - **the public / private audit boundary** (serializer against `privacy_scope` +
    frame disposition still to be designed);
  - **rollback / partial-failure behaviour**;
  - **operational logging / no-leak policy** at production scale;
  - **migration / backward compatibility**;
  - **the Freeside client contract** — later, and only after the Dixie contract is
    mature enough to hand off.
- **Phase 33V should not implement anything.** It decomposes / finalizes the
  **storage/auth/consent** *design* against the answered vocabulary prerequisite —
  it must **not** build a store, route, auth, consent, or migration. It may **account
  for** final-route-contract dependencies where the storage/auth/consent design
  touches them, but it must **not** finalize or absorb the final route-contract gate:
  the **final Dixie route contract remains an independent, separately-gated later
  lane** (still listed among the blocked/held gates above and in §7).

**Framing nuance (surfaced, not suppressed) — "finalize design," not "re-decompose."**
Phase 33S §7 and Phase 33P explicitly warned that pure paper re-decomposition of the
storage/auth/consent preconditions "would add a gate without adding evidence" (Phase
33K already decomposed them;
[`ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md:400`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)).
Phase 33V therefore must add **evidence** — it must *finalize/refine the Phase 33K
design against the now-confirmed Straylight vocabulary* (consuming the §4 answers as
exit criteria), **not** merely re-list the same preconditions. So framed, Phase 33V
adds the vocabulary-grounded design the chain has been waiting on, rather than another
empty gate. It remains **docs/decision-only**, conditional on (and consuming) this
gate's intake, and clears **none** of the independent production gates above.

**Why not an implementation lane.** No option here proves implementation is now safe.
The Straylight response is explicit that resolving the primitive review "alone does
not make production admission ready" (response §1, §7), every implementation lane is
blocked (§7 below), no final schema is frozen, and the durable-store, auth/consent,
and final-route-contract gates each remain to be cleared on their own. Selecting an
implementation lane would bypass those gates; this gate does not, and cannot, prove
it is safe to do so.

**Provisional phase label.** The follow-on lane is provisionally labelled **Phase
33V**. The label is for ordering only; the actual storage/auth/consent
design-finalization content belongs to that future, separately-gated docs/decision
phase and is **not** designed here. No route, store, migration, auth, consent, public
surface, Freeside wiring, package export, or schema freeze is selected, scheduled, or
authorized under any option.

---

## 7. What remains blocked regardless of this intake (blocked lanes preserved)

Phase 33U is a docs/decision-only review-response intake gate. It authorizes none of
the following; each remains **blocked** and is **not** unblocked by intaking the
Straylight response:

- route / API handler implementation beyond the existing Phase 33N spike;
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
- mutate the Phase 33N route handler, the Phase 33Q ledger module, or any spike
  service module / test;
- flip `straylight_primitive_review_complete` (or any other draft marker) in any
  runtime artifact — the spike markers are inspected **read-only** and left `false`;
- change any config, env, package, lockfile, CI, or generated file;
- wire the Phase 33Q ledger into `server.ts` or add any env flag;
- claim that resolving the Straylight review alone makes production admission ready;
- claim Straylight owns the endpoint idempotency semantics.

> **On scope-expansion.** If a later phase reaches for anything in the blocked list,
> it must re-open the relevant prior gates (Phase 33I decomposition, 33J review
> request, 33K precondition design, 33L test-vector draft, 33M authorization, 33N
> spike, 33O acceptance, 33P storage/receipt hardening, 33Q ledger, 33R acceptance,
> 33S decomposition, 33T review request, this intake gate) and the relevant Straylight
> decision records (ADR-022E durable-store gate; ADR-026C / ADR-026D route guardrails)
> first; it must not silently expand scope.

---

## 8. Acceptance criteria for Phase 33U

Phase 33U succeeds if and only if:

1. **Docs/decision-only** — it creates the Phase 33U intake/lane-decision doc and at
   most minimal cross-reference status notes, and changes **no** source, test, route,
   store, migration, auth, consent, validator, probe/fixture/vector JSON, config, env,
   package, lockfile, CI, or generated file.
2. **Response recorded** — it records that the Straylight-side response exists and was
   merged in `loa-straylight` PR #65, and treats it as the source-of-truth input
   (§2, §3).
3. **A–O intaken and reconciled** — it reconciles **every** A–O row using **only** the
   Straylight response's dispositions (accepted / rejected / delegated / unresolved),
   preserving the original A–O mapping, Row C's `transition_denied`, the
   `assertion_superseded` re-relation as Dixie-local, the row-J idempotency delegation
   to the Dixie endpoint route contract, and durable storage as ADR-022E-gated (§4).
4. **No invented answers** — it records no disposition Straylight did not give; where
   the response says *delegated* or *unresolved*, it records the Dixie-owned decision
   (or continued deferral), not a Straylight claim (§3, §4, §5).
5. **Implications stated** — it states the immediate Dixie implications, including the
   idempotency, recall-eligibility, `assertion_superseded`, and durable-store
   constraints (§5).
6. **No production-readiness claim** — it does **not** flip
   `straylight_primitive_review_complete`, does **not** claim the review alone clears
   production admission, and does **not** claim Straylight owns endpoint idempotency
   (§1, §7).
7. **Blocked lanes preserved** — it authorizes no production / durable / public /
   Freeside / package / schema-freeze / auth / consent lane and selects no production
   rollout (§7).
8. **Next lane selected** — it selects a docs/decision-only Phase 33V
   storage/auth/consent design-finalization follow-on (the documented D→E follow-on),
   and explains why an implementation lane is not selected (§6).
9. **Validators stay green** — the Phase 33E fixture validator and the Phase 33L
   route-vector validator both pass unchanged (§9).

---

## 9. Validation requirements

Phase 33U is docs/decision-only; its validation is that it changed **nothing
executable** and that the two docs validators stay green. The phase succeeds only if
all of the following hold:

- `git status --short --branch --untracked-files=all` shows **only** the new Phase
  33U decision doc and at most the minimal cross-reference status notes (§10) — no
  source, test, validator, probe, fixture, vector, config, env, package, lockfile,
  CI, or generated file;
- `git diff --name-status` and `git diff --stat` confirm any tracked-file edits are
  confined to `docs/` Markdown;
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

> The repo defines **no markdown/docs lint command** (its `package.json` scripts are
> typecheck / build / test / demo / export only), so only diff/whitespace/scope
> validation and the two existing docs validators are applicable to this docs-only
> decision artifact.

---

## 10. Cross-references

> **Phase 33V status note (added later, when 33V exists).** When the Phase 33V
> storage/auth/consent design-finalization follow-on lands, add a one-line note here
> pointing to it as the lane this gate selected.

- [`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-FOLLOWUP.md)
  — Phase 33T / PR #138, the cross-repo review **request** this gate intakes the
  answer to; its §9 defined the expected Straylight response shape and its §10
  selected this Phase 33U gate. **Gains a minimal Phase 33U status note.**
- [`docs/ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-LEDGER-DECOMPOSITION-GATE.md)
  — Phase 33S decomposition gate; selected Option D (the 33T review request) and
  recorded the **D→E follow-on** (its §7) this gate now routes to as Phase 33V.
  **Gains a minimal Phase 33U status note.**
- [`docs/ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 33I decomposition gate; the structural ancestor whose §5 prerequisite
  blocker ("all ↔ the Straylight review") is the review this gate's intake closes.
  **Gains a minimal Phase 33U status note.**
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K storage/auth/consent precondition design gate; the design the selected
  Phase 33V D→E follow-on would finalize against the now-confirmed vocabulary
  (§4, §6). Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md`](ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md)
  — Phase 33P storage/receipt hardening decision gate; its "add a gate without adding
  evidence" judgement (`:400`) grounds the §6 "finalize design, not re-decompose"
  framing. Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)
  — Phase 33R bounded-ledger acceptance gate; its §4 proven list and §9 Options A–F
  are the decision space 33S analysed. Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-SPIKE-ACCEPTANCE-GATE.md)
  — Phase 33O route-spike acceptance gate. Read-only here; **not modified**.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-PRIMITIVE-REVIEW-GATE.md)
  — Phase 33J Straylight primitive-review request gate; its §5 fifteen-item register
  (A–O) is the register the Straylight response answers and this gate reconciles.
  Read-only here; **not modified**.
- [`docs/admission-wedge/fixtures/validate-fixtures.mjs`](admission-wedge/fixtures/validate-fixtures.mjs)
  / [`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs)
  — the Phase 33E fixture validator and Phase 33L route-vector validator; both must
  stay green and unchanged (§9). Read-only; **not modified**.
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/` (`admitted-assertion-ledger.ts`,
  `classifier.ts`, `public-response.ts`, `no-leak.ts`, `auth-gate.ts`, `index.ts`),
  and `app/src/server.ts` — the Phase 33N spike and Phase 33Q ledger, inspected
  **read-only** to ground the §4 reconciliation against the concrete synthetic shapes.
  **None is modified by this phase**; no draft marker is flipped.
- `loa-straylight:docs/ADMISSION-WEDGE-PRIMITIVE-REVIEW-RESPONSE.md` — **the Straylight
  primitive-review response (PR #65, merged); the source-of-truth input to this gate.**
  Read **read-only** in the adjacent `../loa-straylight` checkout; **not modified**.
  Its §3 confirms the carried-forward Straylight citations against current HEAD; its
  §5 / §8 carry the A–O dispositions reconciled in §4; its §7 lists the blocked lanes
  preserved in §7; its §9 recommends this Phase 33U intake and the subsequent D→E
  follow-on.
- `@loa/straylight` — canonical primitive/substrate owner of the assertion lifecycle,
  recall-eligibility, signer/keyring, receipt/audit, and storage-adapter vocabulary.
  The durable estate store is gated by **ADR-022E** (gate #8 held); route guardrails
  by **ADR-026C / ADR-026D** (recall-intake seam only — a different seam from
  admission). **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (**verified merged on GitHub** 2026-06-06)
  — the cross-repo acceptance; its mirror/adapter proof is test-only, not exported,
  not runtime-wired, with no live Dixie call. Handed **no** new authorization by this
  gate. **Not edited by this phase.**
