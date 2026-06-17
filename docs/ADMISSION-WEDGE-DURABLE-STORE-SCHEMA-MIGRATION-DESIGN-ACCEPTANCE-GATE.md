# Phase 46T — Admission Wedge Durable-Store Schema / Migration Design Acceptance Gate

> **Phase**: 46T
> **Branch context**: `phase-46t-admission-durable-store-schema-acceptance`
> **Related**: Phase 46S (PR #164,
> [`ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md))
> **drafted** the durable data model (its §6), migration plan (§7), rollback / partial-failure plan (§8),
> idempotency / replay / conflict design (§9), tenant / estate / actor binding (§10), auth / consent boundary
> (§11), public / private projection + no-leak design (§12), recall lifecycle (§13), observability / private
> audit (§14), and the future route-storage spike preconditions (§15) — **explicitly draft / non-final** —
> with verdict **pattern B** ("design drafted, ready for a design-acceptance gate") and **selected this
> acceptance gate as the next lane** (its §18); Phase 46R (PR #163,
> [`ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md))
> **accepted** the durable-store implementation-readiness inventory (Outcome A) and selected the Phase 46S
> design gate; Phase 46K (PR #156,
> [`ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md))
> authored the §9 15-item implementation-readiness checklist; Phase 46M (PR #158,
> [`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md))
> selected **Candidate D** (split storage) as the production-adapter proposal input and decomposed the 18
> schema families (§7) + 11 migration requirements (§8); Phase 46N (PR #159,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md)
> +
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md))
> cleared ADR-022E gate #8 as a **documentation / architecture / handoff prerequisite only** (not
> operatively) and authored the active-for-downstream-gated-work handoff packet; Phase 46O (PR #160) measured
> the **62-key** runtime / validator gap and authorized the no-leak mirror slice; Phase 46P (PR #161)
> implemented it (runtime `FORBIDDEN_PUBLIC_KEYS` 52 → 114); Phase 46Q (PR #162,
> [`ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md))
> accepted the mirror at exact 114 = 114 parity; Straylight (`@loa/straylight`) PR #65 (A–O primitive
> review, **merged**); Straylight-repo ADR-022E durable-store gate #8 (+ sibling gates #9 / #10 / #11 / #12 /
> #15 / #20, **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only.** This gate adds **only this document**. It modifies **no** runtime
> source — and specifically does **not** modify `app/src/services/admission-wedge-spike/no-leak.ts` or
> `app/tests/unit/admission-wedge-spike/no-leak.test.ts` — and changes **no** route handler, storage / store
> code, DB write, migration, SQL file, executable schema, auth, consent, route-vector JSON, route-vector
> validator, route-vector README, Phase 33E fixture, fixture validator, other test, package export, config,
> env, package, lockfile, CI, generated file, or binary. No adjacent repository (`loa-straylight`,
> `freeside-characters`) is touched.
> **This is the schema / migration *design* acceptance decision gate for the Admission Wedge durable-store
> chain after Phase 46S.** It reviews the Phase 46S **draft** schema / migration design and **decides whether
> to accept it as the current draft / non-final design baseline, send it back for refinement, or hold it with
> blockers.** **It builds no store, writes no DB, adds no migration, creates no SQL or executable schema,
> authorizes no implementation, implements no auth or consent, changes no route / API behavior, freezes
> neither the route contract nor the final schema, discharges no operative Straylight-side gate, and claims no
> production readiness.**

Every assessment below is grounded read-only against the actual Dixie repo at the time of writing: the
merged runtime guard `app/src/services/admission-wedge-spike/no-leak.ts` (286 lines, 114 keys) and its test
`app/tests/unit/admission-wedge-spike/no-leak.test.ts` (re-run green this phase, 163/163), the dev-spike
public-response builder `app/src/services/admission-wedge-spike/public-response.ts` (116 lines), the bounded
synthetic ledger `app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`, the admission
classifier `app/src/services/admission-wedge-spike/classifier.ts`, the disabled-by-default route handler
`app/src/routes/admission-intake.ts`, the route-contract test-vector validator
`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs` (114 keys; 5/5 +
44/44), the five route-vector JSONs, the Phase 33E fixtures + fixture validator (5/5), and the predecessor
gate documents (33G / 33K / 33M / 33N / 33O / 33Q / 33R / 33V / 33X–33Z / 46A–46S, and the Phase 46N handoff
packet). The runtime ↔ validator parity in §8 / §15 is a mechanically extracted, deterministic count of the
two `FORBIDDEN_PUBLIC_KEYS` sets (method recorded in §15). **Phase 46T changes no technical artifact**; the
validators and runtime tests are run only to confirm the already-merged artifacts remain green, and the
Phase 46S design document is reviewed read-only. **The canonical Straylight `StorageAdapter` interface and
the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes live in the adjacent
`loa-straylight` repository (cross-repo references, not Dixie file:line) and remain Straylight-owned (§5).**

---

## 1. Status and verdict

Phase 46T is the bounded, docs/decision-only **schema / migration design acceptance gate** that Phase 46S
selected as the next lane (46S §18). Its purpose is to take the Phase 46S **draft** durable-store schema /
migration design and **decide** whether it is sound, complete, and correctly bounded enough to stand as the
current **draft / non-final** design baseline — without performing, executing, authorizing, freezing, or
implementing anything.

**What this phase is, stated narrowly and exactly.** Phase 46T:

- is **docs / decision-only**;
- is an **acceptance gate for the Phase 46S schema / migration design**, *not* an implementation phase, *not*
  the schema / migration **design** gate itself (that is Phase 46S), *not* the production-adapter +
  schema/migration **decomposition** (that is Phase 46M), and *not* the readiness **acceptance** (that is
  Phase 46R);
- does **not** modify runtime code or tests — and specifically does not touch `no-leak.ts` or
  `no-leak.test.ts`;
- does **not** create migrations and does **not** execute any migration;
- does **not** create SQL files or executable schema;
- does **not** write DB code or perform any DB write;
- does **not** authorize durable-store implementation;
- does **not** authorize route / API behavior changes;
- does **not** authorize auth / consent implementation;
- does **not** authorize production admission;
- does **not** freeze the route contract;
- does **not** freeze the final schema (it accepts a draft / non-final design — §3 / §7);
- does **not** claim production readiness;
- does **not** discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §6);
- does **not** select direct durable-store implementation as the next lane (§13).

> **Verdict: A — the Phase 46S durable-store schema / migration design is ACCEPTED as the current draft /
> non-final design baseline.** It adequately covers the durable record families, the field-level draft
> schema, the primary-key and reference-key strategies, the tenant / estate / actor scoping, the idempotency
> / replay / conflict envelope, the public / private projection and no-leak boundary, the recall eligibility
> / assertion lifecycle, the auth / consent reference boundaries, the migration ordering, the rollback /
> partial-failure posture, the observability / private audit design, the route-storage spike preconditions,
> and the remaining non-authorizations — all within Candidate D and all explicitly draft / non-final. The
> accepted baseline is **ready to support a future docs-only dev/operator route-storage spike *authorization*
> gate** (which is itself only an authorization gate, not the spike — §13). **The acceptance is bounded: it
> accepts a draft baseline only — NOT final schema, NOT implementation readiness, NOT executable schema, NOT
> migration execution, NOT a route-contract freeze, and NOT a license for direct implementation.**

This maps to the prompt's verdict **(A)** — *"accepted as the current draft / non-final baseline, ready to
support a future docs-only route-storage spike authorization gate."* The design satisfies the
decomposition → design → **design-acceptance** → authorization discipline the chain has applied at every
comparable transition (46K → 46R readiness; 46C → 46D blocker; 46M decomposition → 46S design); accepting the
draft is exactly the acceptance rung 46S §1 / §18 named as required before any spike authorization.

**The alternative verdicts were considered and rejected:**

- **Verdict (B) — "accepted only with caveats; a *refinement* gate is required before spike authorization"** —
  *rejected.* A refinement gate would be warranted only if the draft contained a material design defect that
  must be fixed before even an *authorization* gate could be written. It does not. The items the 46S design
  leaves open (the final idempotency keying strategy — Row J held; the final ID format; index choices;
  consent persistence; the canonical column shapes deferred to Straylight; the forward-only-vs-reversible
  rollback choice) are **appropriately-deferred draft elements**, not defects — a *design-acceptance* gate
  accepts a **draft**, and draft-ness is the point (§3 / §7). These open items are carried forward as
  **known-open acceptance conditions** that the route-storage spike authorization gate and any later
  implementation lane own; they do not require a separate refinement rung. (Should the spike-authorization
  gate later find a specific gap, *it* may request a scoped refinement; that is its call, not a precondition
  here.)
- **Verdict (C) — "held / not accepted, with exact blockers"** — *rejected.* The design is complete across
  all 14 assessment areas (§3), correctly bounded within Candidate D (§5), preserves every ADR-022D
  invariant and the chain's recall / lifecycle / no-leak guarantees (§8–§11 / §14), and overreaches nothing
  (it freezes nothing, authorizes nothing, executes nothing). The dominant remaining blocker — the operative
  Straylight-side gate #8 (§6) — does **not** block *accepting a paper design* (it blocks *implementation*),
  exactly as 46R §5 reasoned for accepting the readiness inventory and 46S §1 reasoned for drafting the
  design. There is no blocker to *deciding* this acceptance.

**The acceptance is bounded — exactly what it covers, and exactly what it does not.** Accepting this verdict
accepts only that **the Phase 46S design is a sound, complete, correctly-bounded draft / non-final baseline**
and that **a docs-only route-storage spike *authorization* gate may be written next**. It does **not**
authorize, and is **not** to be read as authorizing: storage, DB writes, migrations, SQL / executable schema,
migration execution, route / API behavior changes beyond the already-merged no-leak fail-closed guard
hardening, auth / consent implementation, production admission, route-contract freeze, final schema freeze,
the route-storage spike itself, or durable-store implementation (§12).

---

## 2. Evidence intake

The acceptance is grounded in the following predecessor artifacts and source files. Each is cited read-only;
none is modified by this gate. PR numbers are git-sourced from merge-commit subjects (a Dixie convention; not
authority embedded in the gate bodies). Dixie 46-series / 33-series phase labels and the Straylight ADR-022E
"Phase 22" labels are **independent cross-repo labels**.

### 2.1 The design / acceptance chain (relevant to this acceptance)

| Phase | PR | Artifact / contribution (relevant to the design-acceptance decision) |
|-------|----|------|
| 33M–33R | #131–#136 | **Dev/operator route spike + bounded synthetic ledger.** Authorized (33M), implemented (33N: `POST /api/admission/intake`, disabled-by-default behind `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`, `x-admission-service-token` + `x-admission-operator-id`, Storage Option A — no durable store), and accepted (33O) the spike; implemented (33Q) and accepted (33R) the bounded, process-local, capacity-bounded, test-seam-only synthetic admitted-assertion ledger (`assertion_status` ∈ `active` / `superseded`, never a coined `admitted` status). |
| 33V | #140 | **Storage / auth / consent design finalization.** Row J (endpoint idempotency Dixie-owned; content-addressed IDs ≠ endpoint idempotency; substrate performs no replay detection); Row E (`RecallDisposition` include / mark / redact / exclude; `recall_eligible` a Dixie lossy projection); Rows C/D/N (canonical supersession = `assertion_linked` + `supersedes_refs` + status transition; `assertion_superseded` not a canonical `AuditEventType`; the Dixie inverse `superseded_by_assertion_id` is Dixie-local only); Row H (`AuditEvent` + `TransitionReceipt`; `public_receipt_ref` adopted); Row O (gate #8 held). |
| 33X–33Z / 46A | #142–#146 | **Route-contract revision + vector alignment.** Standardized `public_receipt_ref` (`null` where none), retired `public_receipt_ref_policy` / `receipt_public_ref`, retired public `admission.duplicate_replay`; kept the public refusal taxonomy to source-real `ingress.invalid_request` / `admission_transition_denied_draft_non_final` / `null`; kept exactly five vectors / no sixth; kept `route_contract_final` / `schema_final` false. |
| 46E / 46F | #150 / #151 | **Durable storage model + storage-shape ↔ vector alignment.** Current-state projection + append-only hash-chained audit log on Straylight canonical semantics; ownership split (Straylight canonical / Dixie route-local); `recall_eligible` derived, never persisted; durable shape maps onto the five vectors with no vector / validator change; first recorded the canonical-ref-array forbidden-key gap. |
| 46G / 46H | #152 / #153 | **Auth / identity / signer + consent proof / receipt decisions.** Option C (dev/operator) retained; Options A (bearer JWT) / B (signed envelope) production candidates; identity session-derived, no caller override; service auth ≠ consent; consent never inferred from chat; consent reference lives on the private audit record; the 11-element consent-proof object model (draft); the consent-receipt public/private boundary (a public-safe consent-receipt reference, if any, disjoint from `public_receipt_ref`); the 10-case consent failure taxonomy. |
| 46I | #154 | **Durable-store design + ADR-022E gate-#8 boundary.** Selected split-storage Option 4; the §5 record decomposition; the §6 ownership / adapter boundary; the §8 migration / lifecycle preconditions; the §12 exit checklist; `recall_eligible` derived; gate #8 held. |
| 46J | #155 | **Consent / storage vector & validator alignment.** Added the 37 canonical / consent exact-key names to the **validator's** `FORBIDDEN_PUBLIC_KEYS` (snake + camel); `--self-check` 44/44; deferred the runtime mirror. |
| 46K | #156 | **Durable-store implementation-readiness DECOMPOSITION.** §9 15-item checklist (criterion 11 = runtime no-leak stance); §5 16 durable concerns; §10 10 failure / rollback concerns; §6.2 handoff-packet minimum-six. |
| 46M | #158 | **Production-adapter placement (Candidate D) + schema / migration DECOMPOSITION.** Candidate D as proposal input; §7 18 schema **families**; §8 11 migration **requirements**; gate #8 held. **Phase 46S refined that decomposition into the field-level draft design this gate accepts.** |
| 46N | #159 | **Re-authored gate-#8 clearing ADR — CLEARED (paper-level only) + handoff packet.** Cleared gate #8 as a documentation / architecture / handoff prerequisite only; the active-for-downstream-gated-work handoff packet (its §4 12 obligations); the operative Straylight-side gate is **not** discharged. |
| 46O / 46P / 46Q | #160 / #161 / #162 | **Runtime no-leak mirror — measured, implemented, accepted.** 46O measured the exact 62-key gap (validator 114 − runtime 52 = 25 [33Z] + 37 [46J]); 46P brought runtime `FORBIDDEN_PUBLIC_KEYS` 52 → 114 (exact-key `Set.has`); 46Q accepted at parity 114 = 114 (validator − runtime = 0; runtime − validator = 0; no duplicates). |
| 46R | #163 | **Durable-store implementation-readiness ACCEPTANCE gate.** Accepted Outcome A; selected the Phase 46S schema / migration design gate; named the operative gate #8 the dominant remaining blocker; named "detailed schema / migration design is missing and not frozen" (its §4) as the open artifact 46S produces. |
| 46S | #164 | **Durable-store schema / migration DESIGN gate.** Drafted the §6 field-level schema (11 `aw_*` tables), the §7 migration plan, the §8 rollback / partial-failure plan, the §9 idempotency / replay / conflict design, the §10 binding, the §11 auth / consent boundary, the §12 no-leak projection, the §13 lifecycle, the §14 observability, and the §15 spike preconditions — **explicitly draft / non-final**, verdict pattern B, **selected this acceptance gate as the next lane** (its §18). Patched by Codex (`outcome_class` had used `active`); corrected to the public label `admitted` while preserving `active` only as canonical assertion status; Codex then ACCEPTED. |
| **46T** | *(this doc)* | **Durable-store schema / migration design ACCEPTANCE gate.** Records status / verdict (§1) and evidence (§2); assesses design coverage (§3); intakes the Phase 46S patch-resolution (§4); confirms the Candidate D acceptance boundary (§5), the ADR-022E gate-#8 relationship (§6), the schema / migration draft assessment (§7), the no-leak / projection assessment (§8), the idempotency / replay / binding assessment (§9), the auth / consent boundary assessment (§10), the recall lifecycle assessment (§11); preserves the remaining blockers (§12); selects the next lane (§13); and preserves the non-authorizations / invariants (§14). Mutates **no** runtime / test / validator / vector / fixture / source. |

### 2.2 Source / test / artifact files inspected (read-only)

- **`app/src/services/admission-wedge-spike/no-leak.ts`** (Phase 33N, hardened by Phase 46P; 286 lines).
  Runtime guard; `FORBIDDEN_PUBLIC_KEYS` holds **114** keys (exact-key `Set.has`; mechanically counted this
  phase, 0 duplicates); the substring / pattern / UUID / opaque-run walls and the two exports unchanged.
  **Read-only.**
- **`app/tests/unit/admission-wedge-spike/no-leak.test.ts`** — re-run green this phase (**163/163**).
  **Read-only.**
- **`app/src/services/admission-wedge-spike/public-response.ts`** (116 lines). The fixed, deterministic
  public-safe builder — emits a closed allowlist; `outcome_class: c.outcome_class` (the public label) is
  copied through from the classifier; never incorporates request-controlled material. **Read-only.**
- **`app/src/services/admission-wedge-spike/classifier.ts`** — emits `outcome_class: 'admitted'` (line 126)
  as the **public outcome label**. **Read-only.**
- **`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`** — the bounded synthetic ledger;
  `assertion_status: 'active' | 'superseded'` (lines 100 / 161); its comment (lines 86-87) states the status
  is canonical-aligned `active` (or `superseded`), **never a coined `admitted` status**. **Read-only.**
- **`app/src/routes/admission-intake.ts`** — disabled-by-default route handler; mounts only when
  `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (line 16); `OPERATOR_ID_HEADER = 'x-admission-operator-id'`
  (line 39); `SERVICE_TOKEN_HEADER = 'x-admission-service-token'` (line 44). **Read-only.**
- **`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`** — the
  non-runtime source of truth; `FORBIDDEN_PUBLIC_KEYS` holds the **114** keys (`new Set([...])`,
  mechanically counted this phase, 0 duplicates); `--self-check` 44/44. **Read-only, unchanged.**
- **The five route-vector JSONs** (incl. `accept-candidate-to-admitted-assertion.json`, whose line 24 states
  *"'admitted' is a public outcome label only, not a canonical status"* and line 41 carries
  `"outcome_class": "admitted"`) and the **Phase 33E fixtures + `validate-fixtures.mjs`** — re-run green this
  phase (5/5 vectors, no sixth; 5/5 probes). **Read-only.**
- **The Phase 46S design document** and the predecessor gate documents (the §2.1 chain) + the Phase 46N
  handoff packet — read-only to ground §3–§14.
- **Adjacent `loa-straylight` (cross-repo, read-only context).** The canonical `StorageAdapter` / `AuditLog`
  interface and the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes are
  Straylight-owned (cited cross-repo); their concrete field shapes are deliberately **not** redefined here
  (§5).

---

## 3. Phase 46S design coverage assessment

This section assesses whether the Phase 46S design adequately covers each area the acceptance must judge.
Each row is graded **ADEQUATE (draft)** — i.e. complete and correct *for a draft / non-final design baseline*
— or flags a gap. **No row is graded as final, frozen, or implementation-ready**; "adequate" means "sound
enough to accept as the draft baseline," not "ready to build."

| # | Area | 46S anchor | Assessment |
|---|------|-----------|------------|
| 1 | **Durable record families** | §5 (16 families) + §2.1 citing 46M §7 / 46I §5 / 46K §5 | **ADEQUATE (draft).** Refines the prior decompositions into the §6 design set; maps each family to owner / draft table / MVP-2-vs-deferred. Adds value via field-level realization, not a new taxonomy. |
| 2 | **Draft schema tables / collections** | §6 (11 `aw_*` tables, field-level) | **ADEQUATE (draft).** Each table has columns, draft types, constraints, public/private classification, and prohibited-field lists. `aw_` prefix signals draft status. |
| 3 | **Primary key strategy** | §6.0 (opaque private surrogate `*_row_id`) | **ADEQUATE (draft).** Surrogate keys are private / never public; the **final ID format is explicitly undecided** (46E §8 / 46K §9) — correctly left to a later lane. |
| 4 | **Reference key strategy** | §6.0 (`*_ref` = opaque private references) | **ADEQUATE (draft).** Canonical references are opaque, private, never the canonical id, never public (the 114-key set forbids the canonical ref-array names). |
| 5 | **Tenant / estate / actor scoping** | §6.0 binding columns + §10 | **ADEQUATE (draft).** Every record carries private `tenant_id` / `estate_id` / `actor_id`; session-derived, never body-trusted; cross-scope access fails closed. |
| 6 | **Idempotency / replay / conflict handling** | §9 + `aw_idempotency_replay` (§6.6) | **ADEQUATE (draft); envelope only.** Endpoint-owned; replay-key + fingerprint; identical replay returns prior; conflict fails closed; capacity-bounded. **Final keying strategy explicitly undecided** (Row J held) — correctly deferred. |
| 7 | **Public / private projection boundary** | §6.13 boundary note + §12 | **ADEQUATE (draft).** The only durable value that crosses publicly is `public_receipt_ref` (string or `null`) + the public-safe labels the existing builder already emits; everything else private. |
| 8 | **No-leak requirements** | §12 (inherits 114 / 114 parity) | **ADEQUATE (draft).** Inherits the 114-key boundary at both layers as satisfied; requires future durable-projection no-leak tests; does not claim future projections automatically safe. |
| 9 | **Recall eligibility / assertion lifecycle** | §13 | **ADEQUATE (draft).** Pending not recallable; reject mints no assertion; accept references an `active` assertion; superseded excluded unless requested/marked; `recall_eligible` derived, not a column. |
| 10 | **Auth / consent reference boundaries** | §11 + `aw_consent_proof_ref` (§6.9) | **ADEQUATE (draft).** Service auth ≠ consent; consent reference private / on canonical audit record; deferred / future-gated; 10-case fail-closed taxonomy carried as a future obligation. |
| 11 | **Migration ordering** | §7.2 / §7.3 | **ADEQUATE (draft).** Base tables → reference tables + FKs → relation / projection tables → indexes / unique constraints; explicitly draft, not a script. |
| 12 | **Rollback / partial-failure behavior** | §8 (11 guarantees) | **ADEQUATE (draft).** No partial admitted residue; nothing recallable on failed admit; no duplicates on replay; no public leak during partial failure; tombstone cleanup never rewrites the canonical chain. |
| 13 | **Observability / private audit** | §14 | **ADEQUATE (draft).** Private-only diagnostics / refusal telemetry by safe class label; no payloads; no public operational detail; canonical chain integrity Straylight-owned. |
| 14 | **Route-storage spike preconditions** | §15 | **ADEQUATE (draft).** Enumerates the preconditions a future authorization gate must satisfy; satisfies none; authorizes no spike. |
| 15 | **Remaining non-authorizations** | §16 / §17 | **ADEQUATE (draft).** Full blocker list and 15 invariants preserved; freezes / authorizes / executes nothing. |

> **What is accepted, stated exactly.** Accepting Verdict A accepts the Phase 46S design as: a **draft
> baseline only**; a **Candidate D-compatible design**; a **schema / migration planning artifact**;
> **future-input for a route-storage spike authorization gate**. It is **not** accepted as: **executable
> schema**; **migration execution**; **final schema**; or a **route-contract freeze**. The draft / deferred
> elements (final ID format, final idempotency keying, index choices, consent persistence, canonical column
> shapes, forward-only-vs-reversible rollback choice) are accepted **as appropriately deferred**, carried
> forward as known-open conditions the later authorization / implementation lanes own.

---

## 4. Phase 46S patch-resolution intake

Phase 46S underwent a Codex PATCH-then-ACCEPT cycle on a single vocabulary issue, which this acceptance gate
records and preserves:

- **Issue (Codex PATCH).** The Phase 46S draft initially used `active` for `outcome_class` — i.e. it
  conflated the **public outcome label** with the **canonical assertion status**.
- **Correction (Claude patch).** `outcome_class` was corrected to use the **public outcome label**
  `admitted`, while **`active` was preserved only as the canonical assertion status**.
- **No unsupported public vocabulary introduced.** The correction stayed within the source-real public
  vocabulary; it coined no new public outcome label and no new public denial code.
- **Codex ACCEPTED** the Phase 46S design after the patch.

**This acceptance gate preserves and confirms the vocabulary distinction, grounded in current source:**

| Concept | Token | Source evidence (read-only) |
|---|---|---|
| **Public outcome label** | `admitted` | `classifier.ts:126` (`outcome_class: 'admitted'`); copied through by `public-response.ts:100` (`outcome_class: c.outcome_class`); vector `accept-candidate-to-admitted-assertion.json:41` (`"outcome_class": "admitted"`), with line 24 stating *"'admitted' is a public outcome label only, not a canonical status."* |
| **Canonical assertion status** | `active` (or `superseded`) | `admitted-assertion-ledger.ts:100` / `:161` (`assertion_status: 'active' | 'superseded'`); the ledger comment (lines 86-87) states the status is canonical-aligned `active`, **NEVER a coined `admitted` status**. |

The distinction is **load-bearing**: `admitted` is the *act / public outcome label*; `active` is the
*resulting canonical status*. Phase 46S's §6.0 ("`assertion_status` ∈ `active` / `superseded`; never the
public `outcome_class` label `admitted`") and §6.2 (which records `outcome_class` as a public-safe **label**
only — `admitted` / `denied` appear there as admit/reject decision *examples*, not the full public
`outcome_class` vocabulary, which is the source-real five-value set `accepted_as_proposed` / `admitted` /
`denied` / `superseded_with_correction` / `refused` per `classifier.ts:94`) correctly encode this. **This gate
confirms the distinction is intact and introduces no new public vocabulary.**

---

## 5. Candidate D acceptance boundary

The Phase 46S design stays inside **Candidate D** (46M §6, selected as the production-adapter proposal input;
cited by 46R §6 and 46S §4 as design evidence). This acceptance confirms that boundary and does **not** let
the acceptance imply Dixie owns canonical Straylight semantics.

- **Split storage.** Confirmed: the design separates a Dixie route-side durable adapter (for route-owned
  records) from the canonical Straylight store (assertion / transition / receipt / audit), per 46S §4 / §5.
- **Dixie route-side durable adapter for Admission Wedge route-owned records.** Confirmed: the §6 `aw_*`
  tables are the endpoint-local contract / idempotency / replay records, the ingress references onto the
  canonical chain, the public / private projection state, and the route-local private diagnostics — and
  **nothing more**.
- **Canonical Straylight `StorageAdapter` swap-in.** Confirmed: the adapter is designed as a swap-in of the
  canonical interface (cross-repo reference), behind the Dixie route boundary — not a re-implementation of
  canonical semantics.
- **Straylight canonical semantics / interfaces / invariants preserved.** Confirmed: the design does **not**
  re-mint or redefine `Assertion` / `EstateTransition` / `TransitionReceipt` / `AuditEvent` / `RecallPack` /
  `RecallReceipt`; the canonical column shapes are deferred to Straylight (46S §4.3 / §6); the hash chain and
  `verifyChain` tamper-detection live canonical-side; Dixie holds **ingress references only** and never
  rewrites the chain.
- **Candidate D remains proposal input and design baseline, not implemented architecture.** Confirmed:
  accepting the design accepts a **draft on paper**; it builds no adapter, freezes no physical placement, and
  authorizes no construction (46S §3 / §4).
- **Sibling / Finn / Freeside projection implications remain future-gated.** Confirmed: canonical physical
  hosting stays governed by held gates #9 (Finn) / #10 (Dixie boundary); the external DB substrate stays a
  future sub-decision under gates #12 / #20; Freeside remains a consumer, never a host (gate #11). The
  acceptance discharges none of these (§12).

> **Explicit non-implication.** Accepting the Phase 46S design does **not** move canonical ownership into
> Dixie. Dixie does **not** own the canonical assertion / transition / receipt / audit semantics; it owns
> route-side records and **ingress references** only. No repo evidence accepts a parallel canonical
> lifecycle, and the Phase 46N handoff packet §3 keeps canonical ownership Straylight-owned.

---

## 6. ADR-022E gate #8 relationship

This acceptance confirms the bounded, paper-only sense in which gate #8 was cleared, and that neither the
design nor its acceptance discharges the operative gate:

- **Phase 46N cleared ADR-022E gate #8 only in a bounded Dixie-authored documentation / architecture /
  handoff-prerequisite sense** — satisfying, at the paper level, the trigger's conjuncts ((a) proposes the
  production adapter via Candidate D; (b) cites the re-authored sibling handoff packet; (c) preserves the
  ADR-022D invariants). **It did not discharge the operative Straylight-side gate** (46N §4.7).
- **Phase 46S may use that paper clearing as design evidence** — and did (46S §4 / §16), citing the handoff
  packet for ownership / obligations.
- **Phase 46T may accept the Phase 46S design as a Dixie-side draft baseline** — and does (§1) — **without**
  discharging the operative gate. Accepting a paper design is not blocked by the operative gate (it designs;
  it executes nothing), exactly as 46R §5 reasoned for the readiness inventory.
- **Neither Phase 46S nor Phase 46T discharges every operative Straylight-side production gate.** There is
  **no repo evidence** that the operative Straylight-side pathway (a Straylight teammate-reviewed
  separate-ADR / sibling-repo PR) has occurred; the operative gate #8 — and sibling gates #9 / #10 / #11 /
  #12 / #15 / #20 — remain **held**. This remains the **dominant cross-repo blocker** (46R §4 row 13).
- **Neither authorizes durable storage implementation.** Clearing the paper prerequisite and accepting the
  paper design contribute to readiness; they build nothing.

---

## 7. Schema / migration draft assessment

This section assesses the Phase 46S draft schema / migration plan and confirms its draft / non-final, no-file
character — grounded read-only.

- **Explicitly draft / non-final.** Confirmed: 46S §3.1 fixes the draft posture; every draft marker
  (`schema_final`, `route_contract_final`, `idempotency_final`, `identity_binding_final`,
  `authority_binding_final`, `production_admission`, `straylight_primitive_review_complete`) is **false** and
  stays false; table / column names are `aw_`-prefixed draft proposals.
- **No migration files were created.** Confirmed: Phase 46S added **only** its design document; no migration
  file exists. (This gate likewise creates none — §15.)
- **No SQL files were created.** Confirmed: the only SQL in the repo for this chain is the **illustrative,
  explicitly NON-EXECUTABLE** draft-DDL fenced *Markdown block* inside the 46S design doc (§6.13), clearly
  marked "NOT a migration, NOT executed, NOT frozen." No `.sql` file exists. (This gate creates none.)
- **No executable schema was created.** Confirmed: the §6 design is structured Markdown tables + one
  illustrative non-executable block; nothing is runnable.
- **No DB writes are authorized.** Confirmed (§12).
- **No migration execution is authorized.** Confirmed: 46S §7 designs a *future* plan; both the Dixie
  route-side migration lane (Lane 1) and the canonical-store migration lane (Lane 2, a separate ADR +
  sibling-repo PR per ADR-022D §7) are *described*, not authored or executed (§12).
- **Final schema freeze remains blocked.** Confirmed: `schema_final` false; accepting a draft is not a
  freeze (§1 / §14).
- **Production migration readiness is not claimed.** Confirmed (§12).
- **Future migration files require a separate implementation lane and Codex audit.** Confirmed: 46S §7.9 /
  §7.10 require acceptance + the operative gate envelope + planned-and-passing isolation / idempotency /
  rollback / no-leak tests before any migration execution; the spike preconditions (§15 of 46S) require a
  separate Codex audit.

> **Assessment.** The draft schema / migration plan is **accepted as a draft planning artifact** — sound,
> field-level, correctly bounded, and file-free. It is **not** accepted as executable schema, migration
> execution, or final schema.

---

## 8. No-leak and public / private projection assessment

This section confirms the no-leak posture the design inherits and the complementarity it preserves —
grounded read-only against the two `FORBIDDEN_PUBLIC_KEYS` sets.

- **Runtime no-leak parity from Phase 46P / 46Q is accepted as prior evidence.** Confirmed and re-derived
  this phase: runtime `no-leak.ts` `FORBIDDEN_PUBLIC_KEYS` = **114** keys (unique; 0 duplicates); validator
  `FORBIDDEN_PUBLIC_KEYS` = **114** keys (unique; 0 duplicates); validator − runtime = **0**; runtime −
  validator = **0** (§15). The Phase 46P implementation and Phase 46Q acceptance stand as merged prior
  evidence.
- **Validator no-leak and runtime no-leak remain complementary.** Confirmed: the validator
  (`validate-route-contract-test-vectors.mjs`, `--self-check` 44/44) enforces the **contract** layer over the
  vector JSONs; the runtime `no-leak.ts` (exact-key `Set.has` + substring / pattern / UUID / opaque-run
  walls) enforces the **behavior** layer over the serialized public body. Neither substitutes for the other.
- **Phase 46S does not claim future durable-store projections are automatically safe.** Confirmed: 46S §12.6
  requires a future durable-store serializer to prove no-leak fail-closed over **persisted and replayed**
  records with **its own** tests.
- **Future route / storage / persisted-replay work still requires its own public / private no-leak tests.**
  Confirmed: carried as a future obligation (46S §12 / §15; §12 of this doc).
- **Public response remains narrow and public-safe.** Confirmed: the only durable value designed to cross is
  `public_receipt_ref` (string or `null`), plus the public-safe labels the existing `public-response.ts`
  closed allowlist already emits (`outcome_class` ∈ the full source-real public set `accepted_as_proposed` /
  `admitted` / `denied` / `superseded_with_correction` / `refused` per `classifier.ts:94`, copied through the
  builder unchanged; `safe_reason_code`; `recall_eligible` boolean; synthetic recall-projection placeholders).
- **Private receipt / audit / source / debug / auth / signer / consent / storage internals remain private.**
  Confirmed: every `*_row_id`, every `*_ref`, every binding id, every canonical reference, and all consent /
  signer / audit / raw payload material is private and forbidden from public projection (the 114-key set +
  the value-pattern walls).

---

## 9. Idempotency / replay / tenant binding assessment

This section confirms the design preserves the idempotency / replay / binding guarantees:

- **Endpoint idempotency remains Dixie / route-contract owned.** Confirmed: realized in
  `aw_idempotency_replay` (46S §6.6 / §9); the canonical substrate performs no replay detection (33V Row J).
- **Straylight content-addressed IDs are not endpoint idempotency.** Confirmed: content-addressed canonical
  IDs are deterministic for identical inputs but are a canonical-identity property, kept distinct from the
  endpoint idempotency mechanism (46S §9).
- **Replay scope must bind tenant / estate / actor.** Confirmed: the `replay_key` is unique **within** a
  `(tenant_id, estate_id)` scope and bound by identity (46S §9 / §10); cross-scope keys cannot collide or be
  replayed across scopes.
- **Cross-tenant / cross-estate / cross-actor access fails closed.** Confirmed: a foreign-tenant or
  foreign-estate read / write fails closed (mirroring 33Q's `AdmittedAssertionScopeViolationError` /
  `TenantConflictError` and the canonical recall filter); identity is session-derived, never body-trusted
  (46S §10).
- **Duplicate / replay behavior remains safe.** Confirmed: identical replay returns the prior public envelope
  (no second assertion); same-key / different-payload or different-identity retry fails closed; there is no
  public `admission.duplicate_replay` code (retired by 33Z; private telemetry only) (46S §9).
- **Capacity and retention need future implementation-specific validation.** Confirmed: the idempotency
  ledger is capacity-bounded (mirroring 33Q's per-estate budgets); TTL / retention is draft / optional and
  deferred to a later lane; both require future implementation-specific tests (46S §9).

> The **final keying strategy** (candidate-id vs idempotency-header vs both), the durable replay-envelope
> shape, and the TTL policy remain **undecided** (Row J held; `idempotency_final: false`). The design draws
> the *envelope and guarantees*; it does not finalize the key — accepted as an appropriately-deferred draft
> element (§3).

---

## 10. Auth / consent boundary assessment

This section confirms the design's auth / consent boundary, all of which remains blocked from implementation:

- **Service auth and end-user authorization remain separate.** Confirmed: a valid service credential proves a
  service may call Dixie; it is **not** end-user authorization and **not** consent (46G §4.1 / 46H §4.1 / 46S
  §11). No schema column conflates them.
- **Consent proof / reference fields are private / reference-only.** Confirmed: the 11-element consent-proof
  object lives **privately on the canonical audit record**; Dixie holds a private `consent_proof_ref` (46S
  §6.9 / §11). A public-safe consent-receipt reference, if a future gate authorizes one, is **disjoint** from
  `public_receipt_ref` (46H §6.1).
- **Missing / invalid consent fails closed in the future production admission model.** Confirmed: the 10-case
  consent failure taxonomy (missing / malformed / subject-mismatch / scope-mismatch /
  tenant-estate-actor-mismatch / expired / revoked / replayed-or-conflicting / signer-invalid / leak-attempt)
  all fail closed and mint no admitted assertion (46H §7 / 46S §11), carried as a future schema-validation
  obligation.
- **Auth / consent implementation remains blocked.** Confirmed (§12): auth not implemented; consent not
  implemented; the consent proof object model un-frozen.
- **Public `remember-this` remains blocked.** Confirmed (§12): no public / unauthenticated remember-this
  surface is designed or authorized.
- **Discord / freeform ingestion remains blocked.** Confirmed (§12): no Discord / freeform history ingestion
  path is designed.
- **Chat-as-memory remains blocked.** Confirmed (§12): consent is never inferred from chat text (46H §4.5);
  user chat does not become memory merely because it was said.

---

## 11. Recall lifecycle assessment

This section confirms the design preserves the recall lifecycle invariants:

- **Pending candidate is not recallable.** Confirmed: `aw_candidate_ingress` `pending` rows produce no recall
  entry (46S §13 / §6.1).
- **Rejected candidate creates no admitted assertion.** Confirmed: `aw_rejection_denial` mints no assertion
  reference; nothing recallable (46S §13 / §6.8).
- **Accepted candidate creates / references an admitted assertion.** Confirmed: an accept references an
  `aw_admitted_assertion_ref` whose canonical assertion is `active` (46S §13 / §6.3).
- **Superseded assertion excluded from ordinary recall unless explicitly requested / marked.** Confirmed: the
  prior flips to `superseded` / `recall_eligible: false`; the corrected becomes the active (46S §13 / §6.7).
- **Malformed / unsafe payload fails closed.** Confirmed: it produces only minimal private refusal telemetry
  (`aw_refusal_telemetry`, payload-free), never a recallable record (46S §5.1 / §13).
- **Recall disposition controls recall, not merely active status.** Confirmed: `RecallDisposition` (include /
  mark / redact / exclude) governs per-request (33V Row E; 46S §13).
- **`recall_eligible` is derived / projection-only, not stored as canonical authority.** Confirmed: it is a
  derived, lossy, read-time projection — explicitly **not** a column in `aw_admitted_assertion_ref` (46S §6.0
  / §6.3 / §13).
- **Redacted / excluded assertions receive no recall-use instruction.** Confirmed: a redacted / excluded
  disposition yields no `RecallUseInstruction` (46S §13).

---

## 12. Remaining blockers

After Phase 46T, the following remain **blocked**, regardless of the verdict — none is unblocked by this
acceptance gate:

- **direct durable-store implementation** — no store, schema, table, or store code is created or authorized;
- **DB writes** — none permitted;
- **migration execution** — none authored, created, or executed;
- **route / API behavior changes** unless separately authorized — the Phase 33N dev/operator-only,
  disabled-by-default spike remains the only authorized route surface;
- **auth / consent implementation** — auth not implemented; consent not implemented;
- **production admission** — blocked;
- **public `remember-this`** — blocked;
- **Discord / freeform history ingestion** — blocked;
- **user chat becoming memory merely because it was said** — blocked; consent never inferred from chat text;
- **Freeside runtime / client integration** — blocked (Freeside stays a consumer / handoff surface, never a
  host);
- **package exports** — none;
- **LLM / voice / Finn runtime behavior wiring** — none;
- **MVP 3 forget / revoke / correction UI** — not designed or authorized (only the *representability +
  fail-closed* boundary is noted);
- **route-contract freeze** — `route_contract_final` stays false;
- **final schema freeze** — `schema_final` stays false; the accepted §6 design is explicitly draft /
  non-final;
- **production readiness of any kind** — not claimed;
- **the dev/operator route-storage spike** — not authorized (its *authorization gate* is the next lane, §13;
  the spike itself is downstream of that gate);
- **operative Straylight-side ADR-022E gate #8 discharge** — not claimed (no repo evidence; §6); sibling
  gates #9 / #10 / #11 / #12 / #15 / #20 remain held. **This remains the dominant cross-repo blocker (46R §4
  row 13).**

> Accepting this draft design baseline authorizes **no** storage / DB / migration / migration-execution / SQL
> / executable-schema / auth / consent / production / route-contract / schema-freeze / package / Freeside /
> LLM / spike work. Every lane above remains its own separately-authorized future gate.

---

## 13. Next lane

The Phase 46S schema / migration design is **accepted** as the current draft / non-final baseline (§1 / §3),
within Candidate D (§5), preserving the ADR-022D invariants, the recall / lifecycle / no-leak guarantees, and
the `admitted`-vs-`active` vocabulary distinction (§4). Direct implementation, migration execution, DB
writes, and SQL / executable schema all remain blocked (§12).

> **Selected next lane: Phase 46U — dev/operator route-storage spike *authorization* gate, docs/decision-only.**

- **Scope.** Decide **whether to authorize** a later, disabled-by-default, dev/operator-only, bounded
  route-storage spike against the accepted Phase 46S draft design — on paper, docs/decision-only. It is **an
  authorization gate, not the spike implementation.**
- **Why it is next.** The chain applies a **decomposition → design → design-acceptance → authorization**
  discipline (46M → 46S → **46T** → 46U). With the draft design now accepted (§1), the spike-authorization
  rung is the chain's own next step: Phase 46S §15 / §18 and 46R §9 both name the spike authorization gate as
  the lane **downstream of this design-acceptance gate**. It is the lowest-blast-radius, paper-only next step.
- **What it would only be (if it authorizes a spike at all).** It would decide **whether** to authorize a
  later spike; it would **not** be the spike. Any later spike it might authorize must remain:
  **non-production**; **gated** (disabled-by-default behind an env flag checked `=== 'true'`, building on the
  existing `DIXIE_ADMISSION_INTAKE_ENABLED` base — no durable-store-specific gate name exists yet, and none
  is established here); **reversible** (explicit kill switch / removal plan); **tenant / estate / actor
  isolated**; **capacity-bounded**; with **no public `remember-this`**, **no Discord / freeform ingestion**,
  **no chat-as-memory**, **no auth / consent production implementation**, **no route-contract freeze**, **no
  final schema freeze**; and **separately Codex-audited**.
- **What remains blocked regardless.** **Migration execution and DB writes remain blocked unless separately
  authorized by a later implementation lane**; the operative Straylight-side gate #8 remains the dominant
  cross-repo blocker; direct durable-store implementation is not authorized (§12).

> **Alternatives considered.** A **schema / migration design *refinement* gate** as 46U was rejected because
> the draft is complete and correctly bounded as-is (§3); the open items are appropriately-deferred draft
> elements, not defects requiring a refinement rung (a later authorization or implementation lane may request
> a scoped refinement if it finds a specific gap). A **durable-store blocker *decomposition* gate** as 46U
> was rejected as redundant: the blockers are already decomposed (46K / 46C / 46D) and accepted (46R), and no
> new decomposition is owed. A **named blocker gate waiting on the operative Straylight gate #8** was
> rejected because a Dixie docs phase cannot discharge or productively wait-gate a cross-repo Straylight-owned
> operative gate, and the authorization gate is itself docs-only and not blocked by it. **Direct durable-store
> implementation as the next lane is explicitly NOT selected** (§12).

---

## 14. Non-authorizations and invariants

After Phase 46T, the following are **preserved** (none unblocked by this acceptance gate):

- no direct durable-store implementation;
- no DB writes;
- no migration execution;
- no SQL files / executable schema;
- no route / API behavior changes;
- no auth / consent implementation;
- no production admission;
- no public `remember-this`;
- no Discord / freeform ingestion;
- no chat-as-memory;
- no Freeside runtime / client integration;
- no package exports;
- no LLM / voice / Finn wiring;
- no MVP 3 forget / revoke / correction UI;
- no route-contract freeze;
- no final schema freeze;
- no production readiness;
- no operative Straylight-side production gate discharge.

Phase 46T also preserves **all** of the following invariants; the acceptance carries each forward unchanged:

1. **A pending candidate is not recallable.**
2. **A rejected candidate creates no admitted assertion.**
3. **An accepted candidate creates / references an admitted assertion.**
4. **A superseded assertion is excluded from ordinary recall** unless explicitly requested / marked.
5. **A malformed / unsafe payload fails closed** (and leaves no recallable residue; only minimal private
   telemetry).
6. **Missing / unauthorized auth fails closed** — one stable refusal that never reveals which gate failed.
7. **Missing / invalid consent fails closed in any future production admission model** (the 10-case
   taxonomy); service-token / operator auth is never treated as consent.
8. **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
   material** — enforced at the runtime layer (deep-walk + 114-key `FORBIDDEN_PUBLIC_KEYS` + substring /
   regex / UUID / opaque-run walls) and at the contract layer (validator; 33Z + 46J).
9. **Private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private** —
   forbidden on the public surface at any depth.
10. **User chat does not become memory merely because it was said.** No Discord / freeform ingestion; no
    user-chat-as-memory path; consent never inferred from chat text.
11. **Public `remember-this` remains blocked.**
12. **Discord / freeform history ingestion remains blocked.**
13. **Production admission / storage / auth / consent remain blocked.**
14. **Route-contract freeze and final schema freeze remain blocked** unless separately authorized;
    `route_contract_final` / `schema_final` false on every vector; Phase 46T freezes neither.
15. **`recall_eligible` remains derived / non-authoritative** — computed at read time, never persisted as
    canonical authority, and never a column in the accepted §6 schema.

Also preserved (vocabulary): **public outcome label `admitted`** and **canonical assertion status `active`**
remain distinct, never conflated (§4).

---

## 15. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`) unless noted.
Phase 46T is docs/decision-only — it adds only this document and mutates no runtime source, test, validator,
vector, or fixture — so the validators and runtime tests are run only to confirm the already-merged artifacts
remain green, and the runtime ↔ validator key diff is a read-only extraction over the two unchanged files.

```bash
git status --short --branch --untracked-files=all
git diff --name-status
git diff --stat
git diff --check
git diff --cached --name-status
git diff --cached --check
# Unchanged / merged-artifact green-checks (no mutation in this phase):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# New-untracked-doc whitespace check (no-index; `|| true` because a missing/clean file is fine):
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md || true
# Focused runtime re-validation of the merged Phase 46P/46Q slice (from app/), as live evidence:
npx vitest run tests/unit/admission-wedge-spike/no-leak.test.ts
npx vitest run tests/unit/admission-wedge-spike/
npx tsc --noEmit
# Runtime <-> validator key-set diff method (read-only; counts both FORBIDDEN_PUBLIC_KEYS sets):
#   validator set (114) and runtime set (114); validator - runtime = none; runtime - validator = none; no duplicates.
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md
```

**Recorded results for this lane:**

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md` is added; no runtime source
  (and specifically not `no-leak.ts`), no runtime test (and specifically not `no-leak.test.ts`), no route
  handler, no route-vector JSON, validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`,
  package / lockfile, config / env, CI, migration, SQL, executable schema, or generated file is touched;
- **nothing staged / committed** — `git diff --cached --name-status` is empty; `git diff --check` and
  `git diff --cached --check` report no whitespace errors; the no-index whitespace check on the new doc
  reports no errors; `git status` shows only the untracked new doc on branch
  `phase-46t-admission-durable-store-schema-acceptance`;
- **validators green (merged / unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes
  valid, 0 failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no
  sixth vector**; the `--self-check` harness reports **44/44** cases behaving as required (42 fail-closed
  negative mutations + 2 exact-key no-overmatch guards);
- **runtime re-validation green (live evidence)** — `no-leak.test.ts` reports **163/163 passed**; the full
  `app/tests/unit/admission-wedge-spike/` suite reports **300/300 passed across 6 files**; `tsc --noEmit` is
  clean (exit 0);
- **runtime ↔ validator key diff (read-only)** — validator `FORBIDDEN_PUBLIC_KEYS` = **114** keys; runtime
  `FORBIDDEN_PUBLIC_KEYS` = **114** keys; validator − runtime = **0**; runtime − validator = **0**; **0**
  duplicates in either set;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–17 exactly
  once each.

---

## 16. Corruption / duplicate guard

Phase 46T applies an explicit corruption / duplicate guard to **this** document (carried from the Phase
46I–46S precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 17.`) appears exactly
  once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is the §15
  validation command list. **No fenced block is an executable migration or runnable schema.**

---

## 17. Cross-references

- [`docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md)
  — Phase 46S (PR #164); the immediate predecessor; **drafted** the schema / migration design (its §6 / §7),
  verdict pattern B, and **selected this acceptance gate** (its §18). **This Phase 46T accepts that draft
  design as the current draft / non-final baseline; it does not re-do the design.** **Not modified by this
  phase.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md)
  — Phase 46R (PR #163); accepted the readiness inventory (Outcome A) and selected the Phase 46S design gate;
  named the operative gate #8 the dominant blocker and the missing schema / migration design as the artifact
  46S produces (§2 / §6). **Not modified by this phase.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md)
  — Phase 46K (PR #156); the §9 15-item checklist, §5 16 durable concerns, and §10 10 failure / rollback
  concerns the design draws on (§2 / §3). **Not modified by this phase.** *(Distinct from
  `ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`, which is Phase 33I — the route-contract
  blocker decomposition.)*
- [`docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md)
  — Phase 46M (PR #158); selected Candidate D and **decomposed** the 18 schema families + 11 migration
  requirements that 46S refined into the accepted field-level design (§2 / §5). **Not modified by this phase.**
- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md)
  and [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md)
  — Phase 46N (PR #159); the paper-level gate-#8 clearing and the active-for-downstream-gated-work handoff
  packet (its §4 12 obligations) this acceptance cites for ownership / obligations (§5 / §6). **Not
  modified.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
  — Phase 46I (PR #154); split-storage Option 4, the record decomposition, the ownership / adapter boundary,
  the migration / lifecycle preconditions, and the exit checklist (§2 / §5). **Not modified.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md)
  and [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md)
  — Phases 46E / 46F (PR #150 / #151); the storage-model direction and storage-shape ↔ vector alignment the
  accepted design realizes (§2). **Not modified.**
- [`docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
  and [`docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
  — Phases 46G / 46H (PR #152 / #153); the auth / identity / signer and consent-proof / receipt decisions the
  §10 boundary preserves (§2 / §10). **Not modified.**
- [`docs/ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 46J (PR #155); added the 37 canonical / consent keys to the **validator** (§8). **Not modified.**
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V (PR #140); the design-finalization vocabulary (Row J idempotency, Row E `RecallDisposition`,
  Rows C/D/N supersession, Row H `AuditEvent` / `TransitionReceipt`, Row O gate #8) the §9 / §11 assessment
  consumes (§2). **Not modified.**
- [`docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md)
  and [`docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md)
  — Phases 46Q / 46O (PR #162 / #160); the 114 / 114 runtime ↔ validator parity the §8 no-leak assessment
  inherits as satisfied (§2 / §8). **Not modified.**
- `app/src/services/admission-wedge-spike/no-leak.ts`, `…/public-response.ts`, `…/classifier.ts`,
  `…/admitted-assertion-ledger.ts`, and `app/src/routes/admission-intake.ts`, plus
  `app/tests/unit/admission-wedge-spike/no-leak.test.ts` — inspected **read-only** to ground the no-leak
  boundary (§8), the public allowlist + `admitted`-vs-`active` vocabulary (§4 / §8), the synthetic ledger
  shape (§9 / §11), and the disabled-by-default route (§13). **None is modified by this phase.**
- `docs/admission-wedge/route-contract-test-vectors/` (validator + five vector JSONs + README) and
  `docs/admission-wedge/fixtures/` (validator + fixtures + README) — inspected **read-only** as the unchanged
  114-key source of truth, the five-vectors / no-sixth check, the 44/44 self-check, and the 5/5 probes.
  **None is modified.**
- `@loa/straylight` — canonical primitive / substrate owner; the `StorageAdapter` / `AuditLog` interface and
  the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes (cross-repo references, not
  Dixie artifacts); ADR-022E durable-store gate #8 (+ sibling gates #9 / #10 / #11 / #12 / #15 / #20, **held
  operatively**) and ADR-022D receipt / audit-chain invariants are the decision records cited as guardrails
  (§5 / §6 / §7). **Not edited by this phase.**
