# Phase 46S — Admission Wedge Durable-Store Schema / Migration Design Gate

> **Phase**: 46S
> **Branch context**: `phase-46s-admission-durable-store-schema-migration-design`
> **Related**: Phase 46R (PR #163,
> [`ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md))
> **accepted** the durable-store implementation-readiness inventory after Phase 46Q and **selected this
> schema / migration design gate as the next lane** (its §12, Outcome A); Phase 46Q (PR #162,
> [`ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md))
> accepted the Phase 46P runtime `no-leak.ts` mirror (runtime `FORBIDDEN_PUBLIC_KEYS` 52 → 114, exact
> validator parity); Phase 46O (PR #160,
> [`ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md))
> measured the **62-key** runtime/validator gap and authorized that mirror slice; Phase 46N (PR #159,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md)
> +
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md))
> cleared ADR-022E gate #8 as a **documentation / architecture / handoff prerequisite only** (not
> operatively) and authored the active-for-downstream-gated-work handoff packet; Phase 46M (PR #158,
> [`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md))
> selected **Candidate D** (split storage) as the production-adapter proposal input and **decomposed** the
> schema families (§7) and migration requirements (§8); Phase 46K (PR #156,
> [`ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md))
> authored the §9 15-item implementation-readiness checklist; Phase 46I (PR #154,
> [`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md))
> selected split-storage Option 4 and the gate-#8 boundary; Phases 46E–46J ran the per-area storage /
> shape / auth / consent / vector-validator chain; Phases 33M–33R authorized, implemented, and accepted the
> dev/operator-only route spike (33N) and the bounded synthetic ledger (33Q); Phase 33V finalized the
> storage / auth / consent design vocabulary against the merged Straylight response; Straylight
> (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); Straylight-repo ADR-022E durable-store
> gate #8 (+ sibling gates #9 / #10 / #11 / #12 / #15 / #20, **held operatively**); ADR-022D receipt /
> audit-chain invariants.
> **Status**: **docs / decision-only.** This gate adds **only this document**. It modifies **no** runtime
> source — and specifically does **not** modify `app/src/services/admission-wedge-spike/no-leak.ts` or
> `app/tests/unit/admission-wedge-spike/no-leak.test.ts` — and changes **no** route handler, storage /
> store code, DB write, migration, auth, consent, route-vector JSON, route-vector validator, route-vector
> README, Phase 33E fixture, fixture validator, other test, package export, config, env, package, lockfile,
> CI, generated file, or binary. No adjacent repository (`loa-straylight`, `freeside-characters`) is
> touched.
> **This is a durable-store schema / migration *design* gate.** It produces, on paper, the **draft**
> durable data model, the **draft** migration plan, the rollback / partial-failure plan, the
> adapter-boundary design, the no-leak projection design, and the future validation requirements that a
> later docs-only route-storage spike authorization gate (or a schema-design acceptance gate) will need. It
> **builds no store, writes no DB, adds no migration, executes no migration, authorizes no implementation,
> implements no auth or consent, changes no route / API behavior, freezes neither the route contract nor
> the final schema, discharges no operative Straylight-side gate, and claims no production readiness.**

Every assessment below is grounded read-only against the actual Dixie repo at the time of writing: the
merged runtime guard `app/src/services/admission-wedge-spike/no-leak.ts` (114 keys), the bounded synthetic
ledger `app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`, the dev-spike public-response
builder `app/src/services/admission-wedge-spike/public-response.ts`, the route handler
`app/src/routes/admission-intake.ts`, the route-contract test-vector validator
`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs` (114 keys; 5/5
+ 44/44), the five route-vector JSONs, the Phase 33E fixtures + fixture validator (5/5), and the
predecessor gate documents (33G / 33K / 33M / 33N / 33O / 33Q / 33R / 33V / 33X / 33Y / 33Z, 46A / 46E /
46F / 46G / 46H / 46I / 46J / 46K / 46M / 46N / 46O / 46P / 46Q / 46R, and the Phase 46N handoff packet).
Phase 46S changes no technical artifact; the validators and runtime tests are run only to confirm the
already-merged artifacts remain green (§19). **The canonical Straylight `StorageAdapter` interface and the
canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes live in the adjacent
`loa-straylight` repository (e.g. `storage/types.ts:15-16`); those citations are cross-repo references, not
Dixie file:line, and the canonical field shapes are deliberately left Straylight-owned (§4, §6).**

---

## 1. Status and verdict

Phase 46S is the bounded, docs/decision-only **durable-store schema / migration design gate** that Phase
46R selected as the next lane (46R §12). Its purpose is to author, **on paper and as a draft**, the durable
data model / migration / rollback / adapter-boundary / no-leak-projection design and the future validation
requirements that a later route-storage spike authorization gate (or a schema-design acceptance gate)
depends on — without performing, executing, authorizing, or freezing anything.

**What this phase is, stated narrowly and exactly.** Phase 46S:

- is **docs / decision-only**;
- is a **schema / migration design gate**, *not* an implementation phase, *not* the durable-store
  implementation-readiness **decomposition** (that is Phase 46K), *not* the implementation-readiness
  **acceptance** (that is Phase 46R), and *not* the production-adapter placement + schema/migration
  **decomposition** (that is Phase 46M);
- does **not** modify runtime code or tests — and specifically does not touch `no-leak.ts` or
  `no-leak.test.ts`;
- does **not** create migrations and does **not** execute any migration;
- does **not** write DB code or perform any DB write;
- does **not** authorize durable-store implementation;
- does **not** authorize route / API behavior changes;
- does **not** authorize auth / consent implementation;
- does **not** authorize production admission;
- does **not** freeze the route contract;
- does **not** freeze the final schema (the design is explicitly draft / non-final — §3);
- does **not** claim production readiness;
- does **not** discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §4 / §16).

> **Verdict: the durable-store schema / migration design is DRAFTED on paper (the draft data model §6, the
> draft migration plan §7, the rollback / partial-failure plan §8, the idempotency / replay design §9, the
> adapter-boundary design §4, and the no-leak projection design §12), and is ready to support a future
> docs/decision-only schema / migration design *acceptance* gate — which itself precedes any dev/operator
> route-storage spike authorization gate. The design is draft / non-final; nothing is implemented,
> executed, frozen, or production-readied here.**

This is closest to the prompt's verdict pattern **(B)** — *"the design is drafted but requires another
gate before spike authorization"* — and not pattern (A), because the established decomposition → acceptance
→ authorization discipline (46K §4.7; the 46C → 46D and 46K → 46R precedents) and the route-storage spike's
own precondition list (§15; 46R §9; prompt §15 "Phase 46S design accepted by Codex") both require the
**draft design to be accepted** before a spike is authorized. The drafted design satisfies the "produce the
missing artifact" purpose (the durable schema / migration plan was 46R §4 row 3's open blocker) without
over-reaching into the acceptance, authorization, or freeze that later gates own.

**The alternative verdicts were considered and rejected:**

- **Pattern (A) — "drafted and ready for the route-storage spike authorization gate next"** — *rejected as
  one rung too far.* A route-storage spike persists records; authorizing it directly off an *un-accepted*
  draft design would skip the acceptance rung the chain has applied at every comparable transition (a
  decomposition or design is **accepted** before the next authorization). The spike authorization lane is
  downstream of a design-acceptance gate, not adjacent to this draft (§18).
- **Pattern (C) — "cannot yet be drafted; another blocker first"** — *rejected.* The inputs needed to draft
  the design exist and are accepted: the storage model direction (46E), the storage shape (46F), the
  split-storage topology (46I Option 4), the schema-family + migration-requirement decomposition (46M §7 /
  §8), the auth / consent decisions (46G / 46H), the design finalization vocabulary (33V), the 114-key
  no-leak boundary (46P / 46Q), and the Candidate D placement proposal input (46M). A *design* lane is not
  blocked by the operative gate #8 — it designs on paper; it executes nothing (§4).

**The design is bounded — exactly what it covers, and exactly what it does not.** This gate produces a
**draft** design only. It does **not** accept that design (a separate acceptance gate / Codex audit owns
that — §18), does **not** authorize, and is **not** to be read as authorizing: storage, DB writes,
migrations, migration execution, route / API behavior changes beyond the already-merged no-leak fail-closed
guard hardening, auth / consent implementation, production admission, route-contract freeze, final schema
freeze, the route-storage spike, or durable-store implementation (§16).

---

## 2. Evidence intake

The design is grounded in the following predecessor artifacts and source files. Each is cited read-only;
none is modified by this gate. PR numbers are git-sourced from merge-commit subjects (a Dixie convention;
not authority embedded in the gate bodies). Dixie 46-series / 33-series phase labels and the Straylight
ADR-022E "Phase 22" labels are **independent cross-repo labels**.

### 2.1 The design chain (relevant to this schema / migration design)

| Phase | PR | Artifact / contribution (relevant to the schema / migration design) |
|-------|----|------|
| 33G | #124 | **Route-contract design.** Drafted `POST /api/admission/intake`, the public response shape (`outcome` / `reason_code` / `public_receipt_ref` / `recall_eligible`), the `FORBIDDEN_PUBLIC_KEYS` no-leak categories, the two-part `admission.*` denial namespace, Dixie-owned endpoint idempotency, and the five transition-lifecycle states. |
| 33K | #129 | **Storage / auth / consent precondition design.** Drafted the durable storage record categories, the service-auth options A/B/C/D, the consent options A/B/C/D, the idempotency precondition, the no-leak preconditions, the threat model, and exit criteria. Froze nothing. |
| 33M | #131 | **Dev/operator route-spike authorization gate.** Authorized the 33N spike under §7–§15 constraints; the `DIXIE_ADMISSION_*_ENABLED`-style disabled-by-default env-gate pattern (checked `=== 'true'`); the §13.1 draft rollback / partial-failure policy; Storage Option A preferred, Option D (production-like durable write) not authorized. |
| 33N | #132 | **Dev/operator route spike (implementation).** `POST /api/admission/intake`, disabled-by-default behind `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`, global `/api/*` auth **and** `x-admission-service-token` + `x-admission-operator-id`; Storage Option A (no durable store, no DB, no migrations); runtime `no-leak.ts`. |
| 33O | #133 | **Route-spike acceptance gate.** Accepted 33N as a bounded dev/operator spike for MVP 2 — not production / final-schema / durable-storage / Freeside readiness. |
| 33Q | #135 | **Bounded synthetic admitted-assertion ledger (implementation).** Process-local, capacity-bounded (`maxAssertionsPerEstate` / `maxAssertionBytesPerEstate`), `(tenant_id, estate_id)`-scoped, fail-closed, synthetic-only, test-seam-only. `SyntheticAdmittedAssertion` (`assertion_status` `active`/`superseded`, `recall_eligible`, `supersedes_assertion_id` / `superseded_by_assertion_id`), `SyntheticAuditRecord` (`audit_private` always `true`, `public_audit_detail` always `false`), replay-key de-dup. Not durable storage. |
| 33R | #136 | **Bounded-ledger acceptance gate.** Accepted 33Q as a bounded, non-production, test-seam-only ledger proof — not production admission / durable storage / final schema. |
| 33V | #140 | **Storage / auth / consent design finalization.** Row J: endpoint idempotency Dixie-owned, content-addressed IDs deterministic for identical inputs, substrate performs no replay detection. Row E: `RecallDisposition` (include / mark / redact / exclude) governs per-request; `recall_eligible` is a Dixie lossy projection. Rows C/D/N: supersession re-related to `assertion_linked` + `supersedes_refs` + status transition (`assertion_superseded` is **not** a canonical `AuditEventType`; the Dixie inverse `superseded_by_assertion_id` is Dixie-local only). Row H: `SyntheticAuditRecord` split into `AuditEvent` + `TransitionReceipt`; `public_receipt_ref` adopted. Row O: ADR-022E gate #8 held. |
| 33X–33Z / 46A | #142–#146 | **Route-contract revision + vector alignment.** Standardized `public_receipt_ref` (`null` where none), retired `public_receipt_ref_policy` / `receipt_public_ref`, retired public `admission.duplicate_replay`; kept the public refusal taxonomy to the source-real `ingress.invalid_request` / `admission_transition_denied_draft_non_final` / `null`; kept exactly five vectors, no sixth; kept `route_contract_final` / `schema_final` false. |
| 46E | #150 | **Durable storage model decision.** Selected current-state projection + append-only hash-chained audit log, realized against Straylight canonical semantics; ownership split (Straylight canonical / Dixie route-local); `recall_eligible` derived, never persisted authority; §8 nine exit criteria; physical adapter placement not frozen. |
| 46F | #151 | **Storage-shape ↔ route-vector alignment (docs-only).** Durable shape maps onto the five vectors; no vector / validator change; first recorded the canonical-ref-array forbidden-key gap. |
| 46G | #152 | **Auth / identity / signer authority decision.** Option C (dev/operator) retained; Options A (bearer JWT) / B (signed envelope) recorded as production candidates; identity binding session-derived (`tenant_id` host-layer, `estate_id` / `actor_id` canonical, no caller override); signer competence policy/keyring-decided; recorded the signer / receipt / audit key-name hardening gap. |
| 46H | #153 | **Consent proof / receipt decision.** Service-auth ≠ consent; consent never inferred from chat; consent reference lives on the private audit record only; the §5 11-element consent-proof object model (draft); the §6 consent-receipt public/private boundary (a public-safe consent-receipt reference, if any, is disjoint from `public_receipt_ref`); the §7 10-case consent failure taxonomy. |
| 46I | #154 | **Durable-store design + ADR-022E gate-#8 boundary.** Selected split-storage Option 4; recorded the §5 record decomposition, the §6 ownership / adapter boundary, the §8 migration / lifecycle preconditions, and the §12 exit checklist; confirmed `recall_eligible` derived; gate #8 held. |
| 46J | #155 | **Consent / storage vector & validator alignment.** Added the 37 canonical / consent exact-key names to the **validator's** `FORBIDDEN_PUBLIC_KEYS` (snake + camel); `--self-check` 44/44; deferred the runtime mirror. |
| 46K | #156 | **Durable-store implementation-readiness DECOMPOSITION.** §9 15-item checklist (criterion 11 = runtime no-leak stance); §5 16 durable concerns; §10 10 failure / rollback concerns; §6.2 handoff-packet minimum-six contents. |
| 46M | #158 | **Production-adapter placement (Candidate D) + schema / migration DECOMPOSITION.** Selected Candidate D as the proposal input; §7 decomposed 18 schema **families** (owner / public-private / MVP-required / authoritative-vs-derived); §8 decomposed 11 migration **requirements**; gate #8 held. **This phase refines that decomposition into a field-level draft design (§5 / §6 / §7).** |
| 46N | #159 | **Re-authored gate-#8 clearing ADR — CLEARED (paper-level only) + handoff packet.** Cleared gate #8 as a documentation / architecture / handoff prerequisite only; the handoff packet is active-for-downstream-gated-work (a schema/migration design gate may **cite** it for ownership / obligations); §4 12 handoff obligations; the operative Straylight-side gate is **not** discharged. |
| 46O | #160 | **Runtime no-leak mirror hardening gate.** Measured the exact 62-key gap (validator 114 − runtime 52 = 25 [33Z] + 37 [46J]); authorized the two-file slice. |
| 46P | #161 | **Bounded runtime no-leak mirror (implementation).** Runtime `FORBIDDEN_PUBLIC_KEYS` 52 → 114; exact-key `Set.has`; exhaustive fail-closed + no-overmatch tests. |
| 46Q | #162 | **Runtime no-leak acceptance gate.** Accepted 46P (parity 114 = 114; validator − runtime = 0; runtime − validator = 0; no duplicates). |
| 46R | #163 | **Durable-store implementation-readiness ACCEPTANCE gate.** Accepted Outcome A; **selected this Phase 46S schema / migration design gate as the next lane** (its §12); named the operative gate #8 the dominant remaining blocker; named "detailed schema / migration design is missing and not frozen" (its §4) as the open artifact this gate produces. |
| **46S** | *(this doc)* | **Durable-store schema / migration design gate.** Records status / verdict (§1) and evidence (§2); fixes the design boundary (§3) and the Candidate D storage boundary (§4); refines the durable record families (§5); authors the **draft** field-level schema (§6) and migration plan (§7); designs rollback / partial-failure (§8), idempotency / replay / conflict (§9), tenant / estate / actor binding (§10), the auth / consent boundary (§11), public / private projection + no-leak (§12), recall eligibility / lifecycle (§13), and observability / private audit (§14); defines future route-storage spike preconditions (§15); preserves the non-authorizations / blockers (§16) and invariants (§17); selects the next lane (§18). Mutates **no** runtime / test / validator / vector / fixture / source. |

### 2.2 Source / test / artifact files inspected (read-only)

- **`app/src/services/admission-wedge-spike/no-leak.ts`** (Phase 33N, hardened by Phase 46P; 287 lines).
  Runtime guard; `FORBIDDEN_PUBLIC_KEYS` holds **114** keys (exact-key `Set.has`, lines 37-175); the
  substring / pattern / UUID / opaque-run walls (`FORBIDDEN_SUBSTRINGS`, `FORBIDDEN_PATTERNS`, `UUID_RE`,
  `MAX_OPAQUE_RUN = 24`) and the two exports unchanged. **Read-only.**
- **`app/src/services/admission-wedge-spike/public-response.ts`** (Phase 33N; 117 lines). The fixed,
  deterministic public-safe builder — emits a closed allowlist (`spike`, `outcome_class`, `scenario_id`,
  `recall_eligible`, `recall_projection`, `public_receipt_ref`, `safe_reason_code`, `draft_markers`); never
  incorporates request-controlled material. **Read-only.**
- **`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`** (Phase 33Q). The bounded
  synthetic ledger — `EstateSlot` (`tenant_id`, `estate_id`, `assertions`, `audit`, `replays`, `bytes`),
  capacity bounds, `SyntheticAdmittedAssertion` / `SyntheticAuditRecord` / `SyntheticAdmissionTransition` /
  `RecordOutcome`, `AdmittedScope`, scope-violation / tenant-conflict errors. **Read-only.** *(This is the
  synthetic sketch of the durable model — it is not durable and does not prove the production shape.)*
- **`app/src/routes/admission-intake.ts`** (Phase 33N). The disabled-by-default route handler — mounts only
  when `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (line 16); `SERVICE_TOKEN_HEADER = 'x-admission-service-token'`
  (line 44); fail-closed status codes `404` (disabled) / `403` (unauthorized) / `400` (malformed). **Read-only.**
- **`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`** — the
  non-runtime source of truth; `FORBIDDEN_PUBLIC_KEYS` holds the **114** keys; `--self-check` 44/44.
  **Read-only, unchanged.**
- **The five route-vector JSONs** and the **Phase 33E fixtures + `validate-fixtures.mjs`** — re-run green
  this phase (5/5 vectors, no sixth; 5/5 probes). **Read-only.**
- **Predecessor gate documents** (the §2.1 chain) and the Phase 46N handoff packet — read-only to ground
  §3–§18.
- **Adjacent `loa-straylight` (cross-repo, read-only context).** The canonical `StorageAdapter` /
  `AuditLog` interface and the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes are
  Straylight-owned (cited cross-repo, e.g. `storage/types.ts:15-16`, `types.ts:145-167` / `:364-388` /
  `:514-529`, `audit.ts:77-89`); their concrete field shapes are deliberately **not** redefined here (§4,
  §6).

---

## 3. Design boundary

This section fixes the boundary the §4–§14 design observes.

**(3.1) The design is explicitly draft / non-final.** No repo evidence authorizes a schema freeze; every
draft / non-final flag in the route vectors (`schema_final`, `route_contract_final`, `idempotency_final`,
`production_admission`, `straylight_primitive_review_complete`) is **false** and stays false. Phase 46S
therefore designs a **draft** data model whose table names, column names, key strategies, ID formats, and
indexes are **proposals, not final**, and which a later acceptance gate may revise or reject. The default
posture is draft; this gate gives no separate rationale to freeze, and freezes nothing.

**(3.2) The design is for future durable Admission Wedge *route-owned* records under Candidate D.** It
designs the records Dixie's route-side adapter would own (§4 / §5), and describes the *integration points*
onto the canonical Straylight store without redefining canonical semantics. It does **not** claim canonical
Straylight runtime implementation — those interfaces and field shapes are Straylight-owned and remain so
(§4; the `storage/types.ts:15-16` swap-in citation is a cross-repo reference, not a Dixie artifact).

**(3.3) The design distinguishes five surfaces, and keeps them separate throughout.**

- **Dixie route-owned durable records** — endpoint-local contract / idempotency / replay records, ingress
  references onto the canonical chain, the public / private projection state, and the route-local
  diagnostics. *These are what §6 designs at field level.*
- **Canonical Straylight assertion / transition / receipt / audit semantics** — the `active` `Assertion`,
  the first-class `TransitionReceipt`, the append-only hash-chained `AuditEvent`, the `StorageAdapter` /
  `AuditLog` interface, the six receipt categories. *These are Straylight-owned; §6 designs only the Dixie
  ingress-reference columns that point at them, never the canonical field shapes.*
- **Public response projection** — the narrow public-safe surface (the `public-response.ts` allowlist plus
  `public_receipt_ref`); designed for no-leak fail-closed behavior (§12).
- **Private / audit material** — consent proof, signer / authority material, raw candidate / source,
  policy detail, operational IDs; private at any depth, never public, never logged raw (§12 / §14).
- **Future Freeside / Finn / sibling projection concerns** — future-gated; Freeside is a consumer, never a
  host (gate #11); Finn hosting is future-gated (gate #9). *No design obligation is discharged for them
  here.*

**(3.4) The design distinguishes production scope from dev/operator-only spike scope.** The current
authorized surface is the Phase 33N dev/operator-only, disabled-by-default spike with Storage Option A (no
durable store). The §6 / §7 design is for a **future** durable store; nothing here makes it the current
surface, and the future route-storage spike scope (§15) is dev/operator-only and disabled-by-default,
distinct from a production rollout (which remains separately gated, §16).

---

## 4. Candidate D storage boundary

The design works within **Candidate D** (46M §6, selected as the production-adapter proposal input; cited
by 46R §6 as readiness evidence). Candidate D is a **proposal input, not implemented architecture**; this
gate designs *within* it on paper and authorizes no build.

**(4.1) What the Dixie route-side adapter would own.** A Dixie **route-side durable adapter** for the
Admission Wedge **route-owned records only**: the endpoint-local route-contract records, the idempotency /
replay records (Row J; the durable replay envelope unresolved), the ingress references onto the canonical
chain, the public / private response projection state, and the route-local private diagnostics. It is
designed as a **swap-in of the canonical Straylight `StorageAdapter` interface** (cross-repo reference
`storage/types.ts:15-16`, in `loa-straylight`), behind the Dixie route boundary.

**(4.2) What the Dixie adapter would not own.** It would **not** own a parallel canonical assertion /
transition / receipt / audit lifecycle; **not** re-mint or redefine `RecallPack` / `RecallReceipt` /
`TransitionReceipt` / `AuditEvent` (ADR-022D §1); **not** host the canonical store's authority; **not**
persist `recall_eligible` as canonical authority (it stays derived — §13); and **not** expose any canonical
/ consent key name on the public surface (§12). Canonical ownership is **not** moved into Dixie — no repo
evidence accepts that, and the handoff packet §3 keeps it Straylight-owned.

**(4.3) What Straylight still owns (and which §6 only references).** The canonical `active` `Assertion`,
the first-class `TransitionReceipt`, the append-only hash-chained `AuditEvent`, their invariants, the six
receipt categories, and the `StorageAdapter` / `AuditLog` interface — all canonical Straylight semantics.
The canonical store persists through that path; Dixie holds **ingress references only** (33U Row B). **The
canonical field shapes are Straylight-owned and are not designed here**; §6 designs only the Dixie-side
ingress-reference columns that point at canonical records (by opaque, private reference), explicitly
deferring the canonical column shapes to Straylight (the cross-repo `types.ts` field lists are context, not
a Dixie schema obligation).

**(4.4) Which records Dixie route-side storage owns vs. references vs. derives.**

| Record | Disposition under Candidate D |
|---|---|
| Candidate ingress, admission-decision projection, idempotency / replay, supersession inverse link, rejection / denial projection, route-local diagnostics, public-receipt projection | **Dixie route-side owned** (designed at field level — §6). |
| `active` `Assertion`, `EstateTransition`, `TransitionReceipt`, `AuditEvent`, `signer_refs` / `policy_decision_ref` / hash-chain links, consent-proof material | **Canonical Straylight owned**; Dixie stores an **ingress reference** only (designed as a private reference column — §6), never a parallel copy. |
| `recall_eligible`, the recall projection | **Derived** at read time from canonical status + transition history + relationships + request filters + privacy frame; never persisted as authority (§13). |

**(4.5) Finn / sibling / Freeside projection implications remain future-gated.** The canonical store's
physical hosting (Straylight process / Finn runtime / Dixie-hosted adapter) stays governed by held gates #9
(Finn wiring) / #10 (Dixie boundary wiring); the concrete external DB substrate stays a future sub-decision
under gates #12 / #20; Freeside remains a consumer / client surface with no persistence role (gate #11).
**Phase 46S designs none of those and discharges none of those gates** (§16).

---

## 5. Proposed durable record families

This section refines the **already-decomposed** record families into the set the §6 draft schema designs.
It **cites** the prior decompositions rather than re-deriving the taxonomy: Phase 46M §7 decomposed 18
schema families, Phase 46I §5 decomposed 14 durable records, and Phase 46K §5 reframed 16 durable concerns
for readiness. **Phase 46S's contribution is not a new family list — it is the field-level realization
(§6).** The table below maps each family to its owner, draft Dixie table / canonical reference, MVP-2 vs
deferred status, and the §6 design anchor. Classification columns (purpose, public/private, binding,
idempotency, recall, audit, no-leak) are inherited from 46M §7 / 46I §5 and not re-litigated.

| # | Record family | Owner | Draft Dixie table (§6) or canonical reference | MVP-2 / deferred |
|---|---|---|---|---|
| 1 | AdmissionCandidate / candidate ingress | Dixie | `aw_candidate_ingress` (draft) | MVP-2 (may be transient) |
| 2 | AdmissionDecision / transition decision projection | Dixie | `aw_admission_decision` (draft) | MVP-2 |
| 3 | AdmittedAssertionReference (route-owned ref) | Dixie ref → canonical `Assertion` | `aw_admitted_assertion_ref` (draft) | MVP-2 |
| 4 | TransitionReceipt reference projection | Dixie ref → canonical `TransitionReceipt` | `aw_transition_receipt_ref` (draft) | MVP-2 |
| 5 | AuditEventReference (audit-chain reference) | Dixie ref → canonical `AuditEvent` | `aw_audit_event_ref` (draft) | MVP-2 |
| 6 | Idempotency / replay ledger | Dixie | `aw_idempotency_replay` (draft) | MVP-2 |
| 7 | Tenant / estate / actor binding | Dixie host-layer + canonical refs | **binding columns** on each record (not a standalone table) | MVP-2 |
| 8 | ConsentProofReference / consent receipt reference | Dixie ingress ref → private audit | `aw_consent_proof_ref` (draft) | **deferred** (consent future-gated) |
| 9 | PublicReceiptReference projection | Dixie public-safe | `aw_public_receipt_projection` (draft) | MVP-2 |
| 10 | Supersession / correction link | Dixie-local inverse + canonical `supersedes_refs` | `aw_supersession_link` (draft) | MVP-2 |
| 11 | Rejection / denial record | Dixie projection (canonical `TransitionReceipt` kind `denied`) | `aw_rejection_denial` (draft) | MVP-2 |
| 12 | Malformed / unsafe refusal record | Dixie (minimal private telemetry only — §5.1) | `aw_refusal_telemetry` (draft, minimal) | MVP-2 (telemetry only) |
| 13 | Operational diagnostics / observability (private) | Dixie | `aw_diagnostics` (draft, private-only) | MVP-2 (private only) |
| 14 | Tombstone / rollback / cleanup marker | Dixie | `aw_tombstone` (draft, if needed — §8) | MVP-2 (rollback aid) |
| 15 | Privacy / risk frame inputs (referenced) | canonical / Dixie inputs | **referenced**, not a new table (frame inputs, never a baked answer) | MVP-2 |
| 16 | Retention / expiry / revocation / forget markers | cross-cutting | **representable** boundary only (no MVP-3 UI — §16) | deferred (MVP-3-adjacent) |

> **§5.1 — Whether the malformed / unsafe refusal should be recorded at all.** A malformed / unsafe payload
> **fails closed before any transition** (`admission-intake.ts` `400`; classifier accepts only the five
> forms). The design records **only minimal private telemetry** (`aw_refusal_telemetry`): a refusal
> timestamp, a safe refusal class, and the bound tenant/estate scope — **never** the candidate payload, the
> raw reason, or any request-controlled material (no candidate residue; nothing recallable; §8 / §17). If a
> later acceptance gate prefers no row at all, that is a permissible refinement; the draft default is
> minimal, payload-free telemetry so failure rates are observable privately without retaining unsafe input.

> **Per-family field-level specification** (purpose / required fields / prohibited fields / public-private /
> binding / idempotency / recall / audit / no-leak / MVP-status) is given inline in **§6** rather than
> duplicated here — §6 is where the design adds value over the 46M / 46I / 46K decompositions.

---

## 6. Draft schema design

This section provides the **draft** schema design for the Dixie route-owned tables, as structured Markdown.
**Nothing here is a migration file, a created table, or DB code; nothing is frozen; no ID format is final.**
Table and column names are **draft proposals** prefixed `aw_` (Admission Wedge) to signal draft status. The
canonical Straylight tables (`Assertion` / `EstateTransition` / `TransitionReceipt` / `AuditEvent`) are
**not** designed here — Dixie stores only an **opaque private reference** to each, and the canonical column
shapes remain Straylight-owned (§4.3).

**(6.0) Cross-cutting draft conventions.**

- **Primary keys.** Each Dixie route-owned table uses a **draft surrogate key** (`*_row_id`) that is an
  internal, **private**, opaque identifier — never exposed publicly (it is forbidden by the no-leak
  boundary at the value-pattern walls if it is UUID/opaque-shaped, and it is not in the public allowlist).
  The **final ID format is not chosen here** (46E §8; 46K §9 — undecided).
- **Canonical references.** Columns ending `_ref` hold an **opaque private reference** to a canonical
  Straylight record; they are **never** the canonical id and are **never** public (the 114-key no-leak set
  forbids `audit_event_ref`, `signer_refs`, `receipt_hash`, `audit_hash`, `previous_audit_hash`,
  `policy_decision_ref`, `assertion_refs`, `target_refs`, `subject_refs`, `supersedes_refs`,
  `linked_assertion_refs` as public keys — `no-leak.ts:133-156`).
- **Binding columns.** Every durable record carries `tenant_id` (Dixie host-layer) and `estate_id` /
  `actor_id` (canonical, session-derived); **all three are private** (forbidden public keys —
  `no-leak.ts:38-47`). Binding is session-derived, never body-trusted (§10).
- **Timestamps.** `created_at_utc` on every record; `updated_at_utc` where upsert semantics apply. Private.
- **Status enums** mirror the canonical-aligned synthetic ledger (`assertion_status` ∈ `active` /
  `superseded`; never the public `outcome_class` label `admitted`).
- **Draft / non-final.** Every column type below is a draft proposal; the only public-crossing value in the
  whole design is the public-safe `public_receipt_ref` string (or `null`) in `aw_public_receipt_projection`.

**(6.1) `aw_candidate_ingress`** *(draft; Dixie-owned; private)*

| Column | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `candidate_row_id` | opaque surrogate | PK; not-null | private | internal; never public |
| `tenant_id` | string | not-null; FK→binding | private | host-layer |
| `estate_id` | string | not-null | private | canonical, session-derived |
| `actor_id` | string | not-null | private | proposing actor; session-derived |
| `candidate_payload_ref` | opaque ref | nullable | private | reference to private payload store; **never** the raw payload publicly |
| `source_kind` | enum | not-null | private | forbidden public (`no-leak.ts:51`) |
| `ingest_status` | enum | not-null | private | `pending` / `classified` / `discarded` |
| `created_at_utc` | timestamp | not-null | private | |
| **Prohibited fields** | — | — | — | raw `candidate_payload`, raw `source_ref`, raw reasons (forbidden public keys) |

*Purpose:* stage a candidate ingress; **not** an admitted assertion (33U Row B). *Idempotency:* keyed via
`aw_idempotency_replay` (§9). *Recall:* a pending candidate is **not** recallable (§13 / §17). *Audit:*
ingress recorded privately. *MVP-2:* required if candidates are durably staged; may be transient.

**(6.2) `aw_admission_decision`** *(draft; Dixie projection of a canonical transition; private)*

| Column | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `decision_row_id` | opaque surrogate | PK; not-null | private | |
| `tenant_id` / `estate_id` / `actor_id` | string | not-null | private | binding |
| `candidate_row_id` | opaque ref | FK→`aw_candidate_ingress`; not-null | private | |
| `transition_kind` | enum | not-null | private | `admit` / `supersede` / `deny` (synthetic-ledger aligned) |
| `outcome_class` | enum | not-null | **public-safe label only** | `admitted` / `denied` / projection class — the *label* may surface, not the record |
| `admission_transition_ref` | opaque ref | nullable | private | ingress ref → canonical `EstateTransition` |
| `decided_at_utc` | timestamp | not-null | private | |
| **Prohibited fields** | — | — | — | `transition_id`, `policy_reason`, `raw_reason`, `metadata` (forbidden public keys) |

*Purpose:* record the Dixie-side ingress reference to a canonical transition decision. *Recall:* accept →
references an admitted assertion (§13). *Audit:* references the canonical `AuditEvent` via §6.5.

**(6.3) `aw_admitted_assertion_ref`** *(draft; Dixie ingress reference → canonical `Assertion`; private)*

| Column | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `assertion_ref_row_id` | opaque surrogate | PK; not-null | private | |
| `tenant_id` / `estate_id` / `actor_id` | string | not-null | private | binding |
| `decision_row_id` | opaque ref | FK→`aw_admission_decision`; not-null | private | |
| `canonical_assertion_ref` | opaque ref | not-null | private | ingress ref → canonical `active` `Assertion`; **never** public |
| `assertion_status` | enum | not-null | private (status-class label may project) | `active` / `superseded` (33Q-aligned) |
| `created_at_utc` / `updated_at_utc` | timestamp | not-null / nullable | private | upsert on status change |
| **Prohibited fields** | — | — | — | `admitted_assertion_id`, `assertion_refs`, `subject_refs` (forbidden public keys) |

*Purpose:* Dixie's route-owned reference to the canonical assertion; the canonical record stays
Straylight-owned (§4.3). *Recall:* only an `active`, recall-eligible assertion enters the recall projection
(§13). *Public:* public response exposes only the **status-class label** `active`, never the reference.

**(6.4) `aw_transition_receipt_ref` + `aw_public_receipt_projection`** *(draft; private ref + public-safe
projection)*

| Column (`aw_transition_receipt_ref`) | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `receipt_ref_row_id` | opaque surrogate | PK; not-null | private | |
| `tenant_id` / `estate_id` | string | not-null | private | binding |
| `decision_row_id` | opaque ref | FK; not-null | private | |
| `canonical_transition_receipt_ref` | opaque ref | not-null | private | ingress ref → canonical `TransitionReceipt`; never public |
| `created_at_utc` | timestamp | not-null | private | |

| Column (`aw_public_receipt_projection`) | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `public_receipt_projection_row_id` | opaque surrogate | PK; not-null | private | |
| `receipt_ref_row_id` | opaque ref | FK→`aw_transition_receipt_ref`; not-null | private | |
| `public_receipt_ref` | short public-safe string | nullable (`null` where no receipt minted) | **public-safe** | the **one** field that crosses to the public surface |
| `minted_at_utc` | timestamp | not-null | private | |

*Purpose:* keep the private canonical receipt reference (`aw_transition_receipt_ref`) strictly separate from
the one public-safe value (`public_receipt_ref`), so the public projection (§12) can mint / resolve a
public-safe reference **without** exposing an operational id. The public-safe string must be short and
**never** derived from request material or an operational id (mirrors `public-response.ts:24,44,104`). *No
durable operational receipt id ever crosses.*

**(6.5) `aw_audit_event_ref`** *(draft; Dixie ingress reference → canonical append-only `AuditEvent`;
private)*

| Column | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `audit_ref_row_id` | opaque surrogate | PK; not-null | private | |
| `tenant_id` / `estate_id` | string | not-null | private | binding |
| `decision_row_id` | opaque ref | FK; not-null | private | |
| `canonical_audit_event_ref` | opaque ref | not-null | private | ingress ref → canonical `AuditEvent`; never public at any depth |
| `created_at_utc` | timestamp | not-null | private | append-only on the Dixie side too |
| **Prohibited fields** | — | — | — | `audit_event`, `audit_event_class`, `audit_hash`, `previous_audit_hash`, `policy_decision_ref`, `signer_refs` (forbidden public keys) |

*Purpose:* Dixie's append-only reference to the canonical, hash-chained `AuditEvent`. **The hash chain and
`verifyChain` tamper-detection live on the canonical side** (cross-repo `audit.ts:77-89`; ADR-022D §4);
Dixie holds an ingress reference only and **never** rewrites the chain (§8). Append-only on the Dixie side.

**(6.6) `aw_idempotency_replay`** *(draft; Dixie-owned endpoint idempotency; private)*

| Column | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `idempotency_row_id` | opaque surrogate | PK; not-null | private | |
| `tenant_id` / `estate_id` / `actor_id` | string | not-null | private | binding (idempotency scoped by bound identity — §9 / §10) |
| `replay_key` | string | not-null; **unique** within `(tenant_id, estate_id)` | private | `idempotency_key` is a forbidden public key |
| `request_fingerprint` | opaque hash | not-null | private | detects same-key/different-payload conflict |
| `decision_row_id` | opaque ref | nullable | private | the prior result to replay |
| `replay_outcome` | enum | not-null | private | `recorded` / `replayed` (33Q `RecordOutcome`-aligned) |
| `created_at_utc` | timestamp | not-null | private | |
| **Constraints** | — | unique `(tenant_id, estate_id, replay_key)`; byte-budget accounted | — | mirrors 33Q replay-key + fingerprint accounting |

*Purpose:* Dixie/endpoint-owned idempotency (Row J; **not** Straylight content-addressed IDs — §9). *Draft
only:* the **final keying strategy** (candidate-id vs header vs both) is **undecided** (`idempotency_final:
false`, Row J held) and is **not** chosen here (§9 / §16).

**(6.7) `aw_supersession_link`** *(draft; Dixie-local inverse link; private)*

| Column | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `supersession_row_id` | opaque surrogate | PK; not-null | private | |
| `tenant_id` / `estate_id` | string | not-null | private | binding |
| `prior_assertion_ref_row_id` | opaque ref | FK→`aw_admitted_assertion_ref`; not-null | private | the superseded prior |
| `corrected_assertion_ref_row_id` | opaque ref | FK→`aw_admitted_assertion_ref`; not-null | private | the corrected active |
| `created_at_utc` | timestamp | not-null | private | |
| **Prohibited fields** | — | — | — | `supersedes_assertion_id`, `superseded_by_assertion_id`, `supersedes_refs`, `linked_assertion_refs` (forbidden public keys) |

*Purpose:* the **Dixie-local inverse** of the canonical relation. Per 33V Rows C/D/N, the canonical
supersession is `assertion_linked` + `supersedes_refs` + a status transition (`assertion_superseded` is
**not** a canonical `AuditEventType`); the Dixie `superseded_by_assertion_id` inverse is **Dixie-local
only**. The prior is flipped to `superseded` / `recall_eligible: false`; the corrected becomes the active
(§13).

**(6.8) `aw_rejection_denial`** *(draft; Dixie projection of a canonical `denied` receipt; private)*

| Column | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `denial_row_id` | opaque surrogate | PK; not-null | private | |
| `tenant_id` / `estate_id` / `actor_id` | string | not-null | private | binding |
| `candidate_row_id` | opaque ref | FK; not-null | private | |
| `denial_transition_receipt_ref` | opaque ref | nullable | private | ingress ref → canonical `TransitionReceipt` kind `denied` |
| `safe_reason_code` | short public-safe enum | not-null | **public-safe** | the source-real public code (§12.2) |
| `created_at_utc` | timestamp | not-null | private | |
| **Invariant** | — | a reject mints **no** admitted assertion | — | §13 / §17 |

*Purpose:* record a rejection / denial. *Public:* exposes only the outcome class `denied` + the public-safe
`safe_reason_code`; **never** the private reason family.

**(6.9) `aw_consent_proof_ref`** *(draft; Dixie ingress reference; private; **deferred / consent
future-gated**)*

| Column | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `consent_ref_row_id` | opaque surrogate | PK; not-null | private | |
| `tenant_id` / `estate_id` / `actor_id` | string | not-null | private | binding |
| `decision_row_id` | opaque ref | FK; not-null | private | |
| `consent_proof_ref` | opaque ref | nullable | private | reference to private consent-proof material on the **canonical audit record** |
| `consent_scope` | enum | nullable | private | `propose` / `accept` / `reject` / `supersede` / `recall-use` (46H §4.4) |
| `consent_subject_ref` | opaque ref | nullable | private | maps to canonical `subject_refs`, never a coined `subject_actor_id` |
| `created_at_utc` | timestamp | not-null | private | |
| **Prohibited fields** | — | — | — | `consent`, `consent_ref`, `consent_proof`, `consent_receipt`, `consent_subject`, `consent_grantor`, `consent_scope`, `auth_decision` (all forbidden public keys — `no-leak.ts:160-174`) |

*Purpose:* a **reference** to the consent-proof object whose 11 draft elements (46H §5: `subject_refs`,
`consent_grantor`, `consent_scope`, `candidate_ref`, `transition_ref`, `tenant_id`, `estate_id`, `actor_id`,
`signer_ref`, `policy_decision_ref`, `timestamp_utc` / `expiry_utc`, `audit_linkage`) live **privately on
the canonical audit record** (46H §6.4). *Deferred:* consent is **not** implemented; the proof object model
is **un-frozen**; this table is designed for a future production consent model and is **not** authorized to
hold production consent here (§11 / §16). A public-safe consent-receipt reference, if a future gate
authorizes one, is **disjoint** from `public_receipt_ref` (46H §6.1) and lives in a separate future
projection, not in this private table.

**(6.10) `aw_diagnostics` + `aw_refusal_telemetry`** *(draft; Dixie-owned; **private only**)*

| Column (`aw_diagnostics`) | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `diagnostic_row_id` | opaque surrogate | PK; not-null | private | |
| `tenant_id` / `estate_id` | string | not-null | private | binding |
| `event_class` | enum | not-null | private | safe class label only |
| `detail_ref` | opaque ref | nullable | private | reference to a private detail store; never raw logs / stack traces publicly |
| `created_at_utc` | timestamp | not-null | private | |

| Column (`aw_refusal_telemetry`) | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `refusal_row_id` | opaque surrogate | PK; not-null | private | |
| `tenant_id` / `estate_id` | string | not-null | private | binding (where derivable; else a safe anonymous scope) |
| `refusal_class` | enum | not-null | private | safe class; **no** candidate payload, **no** raw reason |
| `refused_at_utc` | timestamp | not-null | private | |

*Purpose:* private observability (§14). **Never public**: no logs, stack traces, private IDs, tokens, URLs,
signer material, raw reasons, raw source, or debug detail crosses (§12 / §14). The refusal telemetry is the
minimal, payload-free record discussed in §5.1.

**(6.11) `aw_tombstone`** *(draft; Dixie-owned rollback / cleanup marker; private; if needed — §8)*

| Column | Draft type | Constraints | Public/private | Notes |
|---|---|---|---|---|
| `tombstone_row_id` | opaque surrogate | PK; not-null | private | |
| `tenant_id` / `estate_id` | string | not-null | private | binding |
| `target_row_ref` | opaque ref | not-null | private | the Dixie route-owned row marked for rollback / cleanup |
| `reason_class` | enum | not-null | private | safe class (e.g. `partial_failure_cleanup`) |
| `created_at_utc` | timestamp | not-null | private | |

*Purpose:* mark a Dixie route-owned row for rollback / cleanup **without rewriting the append-only canonical
audit chain** (§8). The canonical chain is never tombstoned by Dixie; only Dixie route-owned rows are.

**(6.12) Indexes (draft).** Draft, non-final, for design legibility only: `(tenant_id, estate_id)` on every
table (isolation + scoped reads, §10); a **unique** index on `aw_idempotency_replay (tenant_id, estate_id,
replay_key)` (§9); `(decision_row_id)` on the reference tables; `(assertion_status)` on
`aw_admitted_assertion_ref` (recall projection support, §13); `(created_at_utc)` where retention / telemetry
queries are anticipated (§14). **No index is finalized; index choice is an acceptance-gate / implementation
concern.**

> **§6.13 — Illustrative non-executable draft DDL (NOT a migration; NOT executable; for legibility only).**
> The following sketch is **draft Markdown illustration**, not a migration file, not SQL to run, and not a
> frozen schema. It restates a subset of the above tables to make the field-level shape concrete. A future
> implementation lane authors real migrations separately (§7); this gate authors none.

```sql
-- NON-EXECUTABLE ILLUSTRATIVE DRAFT (Phase 46S design legibility only).
-- This is NOT a migration, NOT executed, NOT frozen. Names/types are draft proposals.
-- Dixie route-owned tables only; canonical Straylight tables are NOT defined here.
CREATE TABLE aw_admitted_assertion_ref (        -- draft; private
  assertion_ref_row_id   OPAQUE_SURROGATE PRIMARY KEY,   -- internal, never public
  tenant_id              TEXT NOT NULL,                  -- host-layer, private
  estate_id              TEXT NOT NULL,                  -- canonical, private
  actor_id               TEXT NOT NULL,                  -- session-derived, private
  decision_row_id        OPAQUE_REF NOT NULL,            -- FK aw_admission_decision
  canonical_assertion_ref OPAQUE_REF NOT NULL,           -- ingress ref -> Straylight Assertion (never public)
  assertion_status       TEXT NOT NULL,                  -- 'active' | 'superseded'
  created_at_utc         TIMESTAMP NOT NULL,
  updated_at_utc         TIMESTAMP                        -- upsert on status change
  -- UNIQUE / FK / index choices are draft (see 6.12); recall_eligible is NOT a column (derived, 13).
);
CREATE TABLE aw_idempotency_replay (            -- draft; private; Dixie-owned (Row J undecided)
  idempotency_row_id     OPAQUE_SURROGATE PRIMARY KEY,
  tenant_id              TEXT NOT NULL,
  estate_id              TEXT NOT NULL,
  actor_id               TEXT NOT NULL,
  replay_key             TEXT NOT NULL,                   -- idempotency_key is FORBIDDEN public
  request_fingerprint    OPAQUE_HASH NOT NULL,            -- same-key/diff-payload conflict detection
  decision_row_id        OPAQUE_REF,                      -- prior result to replay
  replay_outcome         TEXT NOT NULL,                   -- 'recorded' | 'replayed'
  created_at_utc         TIMESTAMP NOT NULL,
  UNIQUE (tenant_id, estate_id, replay_key)               -- draft unique constraint
);
```

> **Public field allowance vs. private forbiddance (the one boundary that matters).** Across the **entire**
> draft schema, the **only** value designed to cross to the public surface is `public_receipt_ref` (a short
> public-safe string, or `null`) in `aw_public_receipt_projection`, plus the **public-safe label** values
> (`outcome_class` ∈ `admitted` / `denied`, `safe_reason_code`, `recall_eligible` boolean, the synthetic
> recall-projection placeholders) the existing `public-response.ts` builder already emits. **Every** other
> column — all `*_row_id`, all `*_ref`, all binding ids, all canonical references, all consent / signer /
> audit material, all raw payloads / reasons / source — is **private and forbidden from public projection**
> (the 114-key no-leak boundary + the value-pattern walls). No operational id, no canonical id, and no
> private reference is ever exposed publicly (§12).

---

## 7. Migration plan

This section designs a **future** migration plan **without executing it and without creating any migration
file**. It does **not** restate the 46M §8 11-item migration *requirement checklist* or the 46I §8
*lifecycle preconditions* — it **applies** them to the §6 draft tables and makes the Dixie-vs-canonical
ownership split concrete. **Phase 46S authors no migration; each canonical-store migration remains a
"separate ADR + sibling-repo PR under teammate review" per ADR-022D §7.**

**(7.1) The two migration ownership lanes (the load-bearing split).**

- **Lane 1 — Dixie route-side migrations (designable here, authorable in a future Dixie implementation
  lane).** The §6 `aw_*` route-owned tables are Dixie-owned and would be created by Dixie-side migrations.
  These are the migrations a future Dixie implementation lane could author (after acceptance + the
  operative gate envelope), because they touch no canonical Straylight substrate.
- **Lane 2 — Canonical-store migrations (NOT authorable in Dixie; future sibling-repo work).** Any
  migration that persists `AuditEvent` / `TransitionReceipt` / `Assertion` in a runtime substrate, or
  exposes canonical receipts through a Dixie BFF surface, is — per ADR-022D §7 — a **separate ADR +
  sibling-repo PR under teammate review**, behind ADR-022E gate #8 (+ #9 / #10). **Phase 46S designs
  none of these and authorizes none.**

**(7.2) Migration ordering (draft, for the Dixie route-side lane).** A future Dixie implementation lane
would order roughly: (1) create the base tables with no FKs (`aw_candidate_ingress`,
`aw_idempotency_replay`, `aw_diagnostics`, `aw_refusal_telemetry`); (2) create the decision /
reference tables and their FKs (`aw_admission_decision`, `aw_admitted_assertion_ref`,
`aw_transition_receipt_ref`, `aw_audit_event_ref`, `aw_consent_proof_ref`); (3) create the relation /
projection tables (`aw_supersession_link`, `aw_rejection_denial`, `aw_public_receipt_projection`,
`aw_tombstone`); (4) add indexes and unique constraints (§6.12). **This ordering is draft, not a migration
script.**

**(7.3) Create-table, indexes / constraints sequence.** Tables before their FKs; the unique
`(tenant_id, estate_id, replay_key)` constraint after `aw_idempotency_replay` exists; `(tenant_id,
estate_id)` indexes with each table; status / timestamp indexes last. Draft only.

**(7.4) Backfill stance.** **No backfill.** No durable production Admission Wedge data exists (46R §4; 46M
§8 item 2). The Phase 33Q synthetic ledger is process-local, non-durable, test-seam-only and holds **no**
production state (46M §8 item 3); it is **not** a backfill source. Initial creation has **nothing to
migrate from**. A future lane must **confirm** this, not assume it.

**(7.5) Zero-downtime / compatibility stance (draft).** Because the route currently uses Storage Option A
(no durable store), introducing the Dixie route-side tables is **additive** — the disabled-by-default route
spike continues to run with no durable store until a separate spike-authorization gate enables a durable
mode. The design favors **forward-only, additive** Dixie route-side migrations (new tables, no destructive
change), so the existing dev-spike path is unaffected.

**(7.6) Rollback / down-migration stance (draft decision).** For the **Dixie route-side** lane, the draft
posture is **forward-only with a compensating cleanup** (drop the new, empty `aw_*` tables if the lane is
abandoned before any durable write) rather than reversible data migrations — because there is no production
data to preserve and the tables start empty. 46M §8 left this "forward-only OR accepted dev-only
no-migration"; this gate **drafts the choice as forward-only + drop-empty-table compensation**, explicitly
draft and subject to acceptance. The **canonical** audit chain is **never** rolled back or rewritten by any
migration (§8; ADR-022D §4 / §5).

**(7.7) Dev/operator-only spike migration stance.** A future dev/operator route-storage spike (§15) would,
if it persists at all, run the Lane-1 Dixie route-side migrations **only in a dev/operator environment**,
disabled-by-default, behind the env gate (§15), kept distinct from production (46M §8 item 10). A spike may
also choose a **no-migration, bounded-synthetic** mode (the 33Q shape) if persistence is not yet needed —
that choice is the spike-authorization gate's, not this design's.

**(7.8) Production migration stance.** Production rollout of any migration is a **distinct, later, separately
gated** decision (46M §8 item 11; §16). Reaching this design — or a future bounded dev spike — authorizes
**no** production migration and **no** production admission.

**(7.9) What must be validated before any migration execution.** (a) The schema / migration design accepted
(Codex audit; §18); (b) the operative ADR-022E gate #8 envelope addressed for any canonical-store touch
(Lane 2); (c) tenant / estate / actor isolation, idempotency / replay / capacity, rollback / partial-failure,
and persisted public / private no-leak tests planned and (later) passing (§15); (d) the dev/operator-only
boundary and kill switch defined (§15). **Migration execution remains blocked until separately authorized
(§16).**

**(7.10) What migration files a future lane would create — but does not now.** A future Dixie
implementation lane would create the Lane-1 `aw_*` create-table + index migrations; a future sibling-repo
lane would, under its own ADR + PR, handle any Lane-2 canonical-store migration. **Phase 46S creates none
of these files; this section describes them only.**

---

## 8. Rollback and partial-failure plan

This section designs rollback / partial-failure behavior for a future durable store. It implements nothing
and executes nothing; it draws on 33M §13.1 (the spike draft rollback policy), 33Q's validate-before-mutate
zero-residue semantics, and 46K §10 (the 10 unanswered failure concerns), turning them into a design
posture.

The durable design must guarantee, at minimum:

1. **No partial admitted-assertion residue.** A transition + assertion reference + receipt reference +
   audit reference either **all** commit or **none** do. A partial write leaves no durable route-owned row
   that implies an admitted assertion.
2. **No recallable assertion unless the full transition succeeds.** A failed admit produces **nothing
   recallable** — indistinguishable, for recall, from a transition that never happened (46K §10).
3. **No duplicate admitted / corrected assertions on replay.** Identical replay returns the prior result
   (no second assertion); the idempotency ledger (§9) enforces this.
4. **No premature recallability for pending / rejected / malformed candidates.** Pending is not recallable;
   rejected mints no assertion; malformed fails closed before any transition (§13 / §17).
5. **No public leak during partial failure.** A partial / failed / rolled-back path returns a **safe
   refusal** only — the public response is deep-walked by the runtime no-leak guard on **every** path
   (including partial-failure), exposing no internals (§12).
6. **Private audit consistency.** The canonical audit chain stays append-only, hash-chained, and
   tamper-detectable (`verifyChain`, cross-repo `audit.ts:77-89`; ADR-022D §4); a failed transition that
   wrote a partial Dixie route-owned row is cleaned up via a tombstone (§6.11) **without** rewriting the
   canonical chain.
7. **Cleanup / tombstone strategy.** Dixie route-owned partial rows are marked via `aw_tombstone` (§6.11)
   and excluded from recall and from public projection; the canonical chain is never tombstoned by Dixie.
8. **Transaction boundary expectations.** The Dixie route-side commit (candidate → decision → references →
   idempotency) is designed as an **atomic unit**; the canonical-side commit is Straylight-owned and behind
   its own invariants. Cross-store atomicity between the Dixie route-side store and the canonical store is
   a **design constraint the acceptance gate / implementation lane must satisfy** (e.g. only record the
   Dixie reference **after** the canonical commit confirms), not something this gate finalizes.
9. **Retry / replay / idempotency expectations.** A retried request resolves through the idempotency ledger
   to the prior result (§9); a conflicting retry (same key, different payload / identity) **fails closed**.
10. **Degraded-mode behavior.** If the durable store is unavailable, the route **fails closed** with a safe
    refusal (the design-level `admission.storage_unavailable` class is **private / design-level only** and
    never a public dotted code — §12.2); it never admits, never half-admits, and never leaks.
11. **Rollback validation tests required in future.** A future implementation lane must add rollback /
    partial-failure tests (partial write, transition-without-assertion, audit-write failure,
    consent-missing, idempotency-mismatch, signer-mismatch, cross-tenant write, capacity failure,
    no-recallable-partial, no-leak-during-failure — the 46K §10 set). **This gate plans them; it writes
    none.**

---

## 9. Idempotency / replay / conflict design

This section designs idempotency / replay / conflict handling for the durable store. It **draws an
envelope** but does **not** finalize the keying strategy (Row J held; `idempotency_final: false` — §16).

- **Endpoint idempotency remains Dixie / route-contract owned.** Idempotency is a Dixie/endpoint concern
  (33G §12; 33V Row J), realized in `aw_idempotency_replay` (§6.6). The canonical substrate performs **no**
  replay detection (33V Row J).
- **Straylight content-addressed IDs are not endpoint idempotency.** Content-addressed canonical IDs are
  deterministic for identical complete inputs but are a canonical-identity property, **not** the endpoint
  idempotency mechanism (33V Row J). The design keeps these distinct.
- **Replay key storage.** The `replay_key` + `request_fingerprint` are stored privately in
  `aw_idempotency_replay`, scoped by `(tenant_id, estate_id)` and the bound identity (§10); the
  `idempotency_key` is a forbidden public key (never surfaced).
- **Identical replay behavior.** An identical retry under the same key returns the **prior public
  envelope** unchanged (no second assertion minted; `replay_outcome: replayed`) — mirroring 33Q's `replayed`
  outcome and 33Z's "identical replay returns the prior public envelope; private telemetry only."
- **Conflict behavior.** A same-key / different-payload or different-identity retry **fails closed** — the
  design-level conflict class `admission.idempotency_conflict` is **private / design-level only** and never
  a public dotted code; the public surface returns a stable safe refusal (§12.2).
- **Duplicate request handling.** There is **no** public `admission.duplicate_replay` code (retired by
  33Z); duplicate-replay classification is **private telemetry only**.
- **Tenant / estate / actor-bound idempotency scope.** The replay key is unique **within** a
  `(tenant_id, estate_id)` scope; cross-tenant / cross-estate keys cannot collide or be replayed across
  scopes (§10).
- **Capacity limits.** The idempotency ledger is **capacity-bounded** (mirroring 33Q's
  `maxAssertionsPerEstate` / `maxAssertionBytesPerEstate`, with replay-key + fingerprint bytes accounted);
  inserts beyond the budget **fail closed** (bounded rejection, never unbounded growth, never eviction of
  existing state by default).
- **TTL / retention.** A retention / TTL policy for replay records is **draft / optional** and deferred to
  the acceptance gate; if added, it must not weaken the conflict guarantee.
- **Public / private response boundary.** No idempotency key, fingerprint, or conflict detail ever crosses
  to the public surface (§12).
- **Tests required later.** Identical-replay-returns-prior, conflict-fails-closed, capacity-fails-closed,
  cross-scope-isolation, no-public-key-leak. **Planned here; written later.**

> **Draft boundary.** The **final** keying strategy (candidate-id vs idempotency-header vs both), the
> durable replay-envelope shape, and the TTL policy are **undecided** (Row J held). This gate designs the
> envelope and the guarantees; it does **not** finalize the key (§16).

---

## 10. Tenant / estate / actor binding

This section designs the tenant / estate / actor binding the durable records carry. Production binding
semantics remain **unresolved** (Row G; `identity_binding_final: false`); the design fixes the structural
requirements without claiming final binding semantics.

- **Every durable record is tenant / estate / actor scoped where appropriate.** `tenant_id` (Dixie
  host-layer), `estate_id` / `actor_id` (canonical) are present on every §6 table (binding columns); reads
  and writes are bound to a `(tenant_id, estate_id)` scope (mirroring 33Q's `AdmittedScope` and
  `EstateSlot`).
- **Cross-tenant / cross-estate / cross-actor access fails closed.** A foreign-tenant or foreign-estate
  read/write **fails closed** (mirroring 33Q's `AdmittedAssertionScopeViolationError` / `TenantConflictError`
  and the canonical recall filter `a.estate_id === request.estate_id`); an estate is reachable **only** by
  the tenant that owns it.
- **Identity is session-derived, never body-trusted.** The binding is derived from the authenticated
  session (46G §5); the request body never overrides `tenant_id` / `estate_id` / `actor_id`. The
  candidate-subject (mapped to canonical `subject_refs`) is distinct from the caller-actor; **neither is
  body-trusted** (handoff packet §4 obligation 2).
- **Synthetic operator authority is not production authority.** The dev/operator-only scope (`x-admission-
  operator-id` allowlist; 33N) is a **non-precedent** isolation mechanism, **never** the production binding
  (46G §4.2). The production tenant / estate / actor binding is undefined and is **not** decided here.
- **Service auth and end-user authorization remain separate.** A valid service credential proves a service
  may call Dixie; it is **not** end-user authorization and **not** consent (§11; 46G §4.1).
- **Consent proof remains future-gated.** Consent binding (to `subject_refs` / `estate_id` / `actor_id` /
  `tenant_id` / caller) is designed (§6.9 / §11) but **not** implemented; consent stays future-gated.
- **Tests required later for isolation.** Cross-tenant-write-fails-closed, cross-estate-read-fails-closed,
  body-cannot-override-binding, operator-scope-is-not-production. **Planned here; written later (§15).**

---

## 11. Auth / consent boundary

This section designs schema support for **future** auth / consent **without implementing** either. Auth is
not implemented; consent is not implemented (§16).

- **Service auth vs end-user authorization are separate (load-bearing).** Service-token / operator auth is
  **never** treated as consent or as end-user authorization (46G §4.1; 46H §4.1). The schema reflects this:
  no column conflates a service credential with a consent proof or an end-user authorization.
- **Production auth model deferred.** Option C (dev/operator) is the only authorized **spike** posture;
  Options A (bearer JWT) / B (signed envelope) are **production candidates**, with the A-vs-B choice
  deferred to a future signer review (46G §4.2). The schema carries **reference** columns only — never raw
  bearer tokens, raw keys, or raw signatures (those are forbidden public keys and forbidden private raw
  material — §12 / §14).
- **Consent proof / reference fields are private or referenced, not public raw material.** The consent
  proof's 11 draft elements (46H §5) live **privately on the canonical audit record**; Dixie holds a
  private `consent_proof_ref` (§6.9). A public-safe consent-receipt reference, if a future gate authorizes
  one, is **disjoint** from `public_receipt_ref` (46H §6.1) and non-operational.
- **Missing / invalid consent fails closed in any future production admission model.** The 46H §7 10-case
  consent failure taxonomy (missing / malformed / subject-mismatch / scope-mismatch /
  tenant-estate-actor-mismatch / expired / revoked / replayed-or-conflicting / signer-invalid /
  leak-attempt) **all** fail closed and **mint no admitted assertion**; the design carries this as a
  schema-validation obligation for the future production model.
- **Public response must not expose raw consent / auth material.** No `consent*` / `auth_decision` /
  `signer*` key crosses to the public surface (the 114-key no-leak set; §12).
- **Public `remember-this` remains blocked.** No public / unauthenticated remember-this surface is designed
  or authorized (§16).
- **Discord / freeform ingestion remains blocked; chat-as-memory remains blocked.** Consent is **never**
  inferred from chat text (46H §4.5); no user-chat-as-memory path is designed (§16 / §17).

---

## 12. Public / private projection and no-leak design

This section designs the public / private projection requirements for the durable store. The runtime
`no-leak.ts` parity is now **114 / 114** (validator − runtime = 0; runtime − validator = 0; no duplicates —
§19); the validator no-leak and the runtime no-leak are **complementary**, and **future** schema / route /
storage work still owes **its own** no-leak tests.

**(12.1) Public surface = a narrow allowlist.** The public response exposes only public-safe fields — the
existing `public-response.ts` closed allowlist (`spike`, `outcome_class`, `scenario_id`, `recall_eligible`,
`recall_projection` with synthetic placeholders, `public_receipt_ref`, `safe_reason_code`, `draft_markers`).
The durable design adds **no** new public field; the only durable value that crosses is the public-safe
`public_receipt_ref` (string or `null`) projected from `aw_public_receipt_projection` (§6.4). No raw
candidate / source / reasons / debug / auth / signer / consent / storage internals are public.

**(12.2) Public denial vocabulary is the source-real set only.** Public: `ingress.invalid_request`
(malformed / class-validation), `admission_transition_denied_draft_non_final` (reject; underscored
source-real), and the literal `null` (pending / accept / supersede). The two-part dotted `admission.*`
namespace (e.g. `admission.transition_denied`, `admission.idempotency_conflict`,
`admission.storage_unavailable`, `admission.duplicate_replay`) is **design-level / private only** and is
**rejected on the public surface** (33Z; the validator rejects the dotted codes publicly). The durable
design keeps public denial vocab to the source-real underscored / `null` forms.

**(12.3) Public receipt reference, not private receipt / audit internals.** The public response may expose a
public-safe `public_receipt_ref` (if a future gate accepts it); it never exposes a private receipt id, the
canonical receipt / audit references, the transition id, signer / signature material, policy detail, or a
raw `metadata` bag (all forbidden public keys — `no-leak.ts:56-92`, `:133-156`).

**(12.4) Runtime ↔ validator complementarity.** The validator (`validate-route-contract-test-vectors.mjs`,
114 keys, `--self-check` 44/44) enforces the **contract** layer over the vector JSONs; the runtime
`no-leak.ts` (114 keys, exact-key `Set.has`, value-pattern walls) enforces the **behavior** layer over the
serialized public body. They are complementary; **neither substitutes for the other**, and **neither
substitutes for the per-lane durable-projection tests a future storage lane owes**.

**(12.5) The ref-array hardening gap is closed (do not re-flag).** The `supersedes_refs` /
`linked_assertion_refs` (and the full canonical / consent key-name family) that 46F §8 / 46I §9 recorded as
a gap are **now in the 114-key set** at both layers (added to the validator by 46J, mirrored into the
runtime by 46P). The design **inherits this as satisfied**; it does not re-open it.

**(12.6) Durable records need future projection tests; the spike must prove fail-closed over persisted /
replayed records.** A future durable-store serializer must keep private material off the public surface and
prove it with **its own** public / private no-leak and fail-closed tests over **persisted and replayed**
records — not just over the fixed dev-spike output. The route-storage spike (§15) must prove no-leak
fail-closed behavior over persisted and replayed records, including partial-failure paths (§8).

---

## 13. Recall eligibility / assertion lifecycle

This section designs recall eligibility and lifecycle semantics, preserving the chain's invariants.

- **A pending candidate is not recallable.** Only active, recall-eligible assertions enter the recall
  projection; `aw_candidate_ingress` rows in `pending` produce no recall entry.
- **A rejected candidate creates no admitted assertion.** `aw_rejection_denial` mints no assertion
  reference; nothing recallable is created.
- **An accepted candidate creates / references an admitted assertion.** `aw_admission_decision` (accept)
  references an `aw_admitted_assertion_ref` whose canonical assertion is `active`.
- **A superseded assertion is excluded from ordinary recall** unless explicitly requested / marked. The
  prior is flipped to `superseded` / `recall_eligible: false` (33Q-aligned; `aw_supersession_link`); the
  corrected active is recall-eligible if active.
- **A malformed / unsafe payload fails closed.** It produces only minimal private refusal telemetry (§5.1),
  never a recallable record.
- **Recall disposition controls recall, not merely active status.** `RecallDisposition` (include / mark /
  redact / exclude) governs per-request (33V Row E); the recall-included set is a derived, invalidatable,
  request / context-dependent projection.
- **Redacted / excluded assertions receive no recall-use instruction.** A redacted / excluded disposition
  yields no `RecallUseInstruction` to act on.
- **Public booleans are constrained projections, not canonical eligibility authority.** `recall_eligible` is
  a **derived**, **lossy**, read-time projection over canonical status + transition history + relationships
  + request filters + privacy frame + risk — **never** persisted as canonical authority, and **not** a
  column in `aw_admitted_assertion_ref` (§6.3 / §6.0). It is a constrained public signal, not the authority.

---

## 14. Observability and private audit

This section designs observability requirements. **No production observability claim is made.**

- **Private operational diagnostics live only on the private / audit surface.** `aw_diagnostics` and
  `aw_refusal_telemetry` (§6.10) are **private-only**; failure telemetry (refusal classes, conflict
  classes, capacity-rejection counts) is recorded privately by safe class label, never with payloads.
- **Public response exposes no operational detail.** No logs, stack traces, private IDs, tokens, URLs,
  signer material, raw reasons, raw source, or debug details cross to the public surface (the
  `FORBIDDEN_SUBSTRINGS` / `FORBIDDEN_PATTERNS` / `UUID_RE` / `MAX_OPAQUE_RUN` walls plus the 114-key set;
  §12).
- **Audit-chain reference strategy.** Dixie holds an append-only **reference** to the canonical
  hash-chained `AuditEvent` (`aw_audit_event_ref`, §6.5); the canonical chain's integrity (`verifyChain`)
  is Straylight-owned; Dixie never rewrites it.
- **Failure telemetry.** Duplicate-replay, conflict, capacity-rejection, degraded-mode, and partial-failure
  events are recorded as **private** telemetry (safe class labels), enabling private observability without
  leaking (mirrors 33Z's "private telemetry only" for duplicate-replay).
- **Route-storage spike validation requirements.** A future spike must demonstrate that its observability /
  telemetry surface leaks nothing on persisted / replayed / failed paths (§12 / §15).
- **No production observability claim.** This is a design; it claims no production monitoring, alerting, or
  dashboards.

---

## 15. Future route-storage spike preconditions

This section defines what must be true before a later **dev/operator route-storage spike authorization
gate** can be accepted. The spike authorization lane is **downstream** of this design lane **and** of a
design-acceptance gate (§18); this gate authorizes **no** spike. At minimum, before that future
authorization gate is accepted:

- **Phase 46S design accepted by Codex** (a separate acceptance gate / audit — §18);
- **schema / migration design accepted or further refined** (the §6 / §7 draft made final-enough for a
  bounded spike, or revised);
- **exact spike storage mode selected** — the bounded-synthetic 33Q mode (no migration) **or** a
  dev/operator-only durable mode running the Lane-1 `aw_*` migrations in a dev environment (§7.7);
- **disabled-by-default env gate defined** — building on the existing `DIXIE_ADMISSION_INTAKE_ENABLED ===
  'true'` base layer; a durable-store-specific gate (a **draft** proposal such as a
  `DIXIE_ADMISSION_*_ENABLED`-style flag checked `=== 'true'`) must be named and defined by that future
  gate — **no such durable-store gate name exists yet**, and none is established here;
- **dev/operator-only scope defined** — service token + operator allowlist (`x-admission-service-token` /
  `x-admission-operator-id`), synthetic subjects only;
- **kill switch defined** — the route must not register / the durable mode must not engage unless the env
  gate is exactly `'true'` (fail-closed at startup);
- **no production admission** — the spike admits nothing to production;
- **tenant / estate / actor isolation tests planned** (§10);
- **idempotency / replay / capacity tests planned** (§9);
- **rollback / partial-failure tests planned** (§8);
- **persisted public / private no-leak tests planned** — proving fail-closed over **persisted and replayed**
  records, including partial-failure paths (§12);
- **migration execution still blocked unless separately authorized** (§7 / §16);
- **no public `remember-this`**; **no Discord / freeform ingestion**; **no chat-as-memory**;
- **no auth / consent production implementation**;
- **separate Codex audit required** for the spike authorization gate.

> This gate **states** these preconditions; it **satisfies none of them** and **authorizes no spike**.

---

## 16. Non-authorizations and blockers

After Phase 46S, the following remain **blocked**, regardless of the verdict — none is unblocked by this
design gate:

- **direct durable-store implementation** — no store, schema, table, or store code is created or authorized
  (the §6 design is draft / on paper);
- **DB writes** — none permitted;
- **migrations** — none authored, created, or executed;
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
  fail-closed* boundary is noted, §5 / §11);
- **route-contract freeze** — `route_contract_final` stays false;
- **final schema freeze** — `schema_final` stays false; the §6 design is explicitly draft / non-final (§3);
- **production readiness of any kind** — not claimed;
- **the dev/operator route-storage spike** — not authorized (downstream of a design-acceptance gate, §18);
- **operative Straylight-side ADR-022E gate #8 discharge** — not claimed (no repo evidence; §4); sibling
  gates #9 / #10 / #11 / #12 / #15 / #20 remain held. **This remains the dominant cross-repo blocker (46R
  §4 row 13).**

> Producing this draft design authorizes **no** storage / DB / migration / migration-execution / auth /
> consent / production / route-contract / schema-freeze / package / Freeside / LLM / spike work. Every lane
> above remains its own separately-authorized future gate.

---

## 17. Invariants

Phase 46S preserves **all** of the following; the draft design carries each forward unchanged:

1. **A pending candidate is not recallable.**
2. **A rejected candidate creates no admitted assertion.**
3. **An accepted candidate creates / references an admitted assertion.**
4. **A superseded assertion is excluded from ordinary recall** unless explicitly requested / marked.
5. **A malformed / unsafe payload fails closed** (and leaves no recallable residue; only minimal private
   telemetry — §5.1).
6. **Missing / unauthorized auth fails closed** — one stable refusal that never reveals which gate failed.
7. **Missing / invalid consent fails closed in any future production admission model** (the 46H §7 10-case
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
    `route_contract_final` / `schema_final` false on every vector; Phase 46S freezes neither.
15. **`recall_eligible` remains derived / non-authoritative** — computed at read time, never persisted as
    canonical authority, and never a column in the §6 schema.

---

## 18. Next lane

The schema / migration design is drafted (§6 / §7) with its rollback (§8), idempotency (§9), binding (§10),
auth / consent (§11), no-leak (§12), lifecycle (§13), and observability (§14) designs; the verdict (§1) is
**design drafted, ready for a design-acceptance gate** (pattern B). Direct implementation, migration
execution, and the route-storage spike all remain blocked (§16).

> **Selected next lane: Phase 46T — durable-store schema / migration design *acceptance* gate,
> docs/decision-only.**

- **Scope.** Review and **accept** (or send back for refinement) the Phase 46S **draft** durable data model
  (§6), migration plan (§7), rollback / partial-failure plan (§8), idempotency / replay design (§9),
  binding (§10), auth / consent boundary (§11), no-leak projection (§12), lifecycle (§13), and observability
  (§14). Confirm the design preserves the ADR-022D invariants, keeps `recall_eligible` derived, keeps the
  five vectors / no-sixth and the 114-key no-leak boundary intact, and cites the Phase 46N handoff packet
  for ownership / obligations. Docs/decision-only.
- **Why it is next.** The chain applies a **decomposition → acceptance → authorization** discipline at
  every comparable transition (46K → 46R; 46C → 46D). A *draft* design must be **accepted** before a
  route-storage spike — which persists records — can be authorized. The route-storage spike's own
  precondition list (§15) and 46R §9 both name "Phase 46S design accepted" as the gate before spike
  authorization. Inserting the acceptance rung is the lowest-blast-radius, paper-only next step.
- **What it may authorize.** The **acceptance** (or refinement) of the design **on paper** — nothing more.
  It may sequence the subsequent dev/operator route-storage spike authorization gate.
- **What it may not authorize.** It may **not** execute migrations or DB writes; **not** implement durable
  storage, auth, or consent; **not** change route / API behavior; **not** authorize a route-storage spike
  (that is the lane *after* it); **not** discharge the operative Straylight-owned gate #8; **not** freeze
  the route contract or the final schema; **not** claim production readiness.
- **Required evidence / validation for that future lane.** It must re-confirm the five vectors / no-sixth,
  the 44/44 self-check, and the 114 / 114 runtime ↔ validator parity are green; cite the Phase 46N handoff
  packet and the ADR-022D invariants; confirm the §6 design exposes only `public_receipt_ref` (+ public-safe
  labels) publicly; and stop before commit / PR for a separate Codex audit. It remains docs/decision-only,
  mutating no runtime / test / validator / vector / fixture / source unless a still-later lane separately
  authorizes it.

> **Alternatives considered.** A **route-storage spike authorization gate** as 46T was rejected as one rung
> early (the draft design is un-accepted; §1). A **design *refinement* gate** as 46T was rejected because
> the draft is complete enough to review as-is; refinement, if needed, is the acceptance gate's call. A
> **named blocker gate** (e.g. waiting on the operative Straylight gate #8) was rejected because the
> acceptance of a paper design is not blocked by the operative gate (§4), and the operative gate is a
> cross-repo Straylight-owned lane that a Dixie docs phase cannot discharge or wait-gate productively here.

---

## 19. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46S is
docs/decision-only — it adds only this document and mutates no runtime source, test, validator, vector, or
fixture — so the validators and runtime tests are run only to confirm the already-merged artifacts are
green, and the runtime ↔ validator key diff is a read-only extraction over the two unchanged files.

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
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md || true
# Optional focused runtime re-validation of the merged Phase 46P/46Q slice (from app/), as live evidence:
npx vitest run tests/unit/admission-wedge-spike/no-leak.test.ts
npx vitest run tests/unit/admission-wedge-spike/
npx tsc --noEmit
# Runtime <-> validator key-set diff method (read-only; counts both FORBIDDEN_PUBLIC_KEYS sets):
#   validator set (114) and runtime set (114); validator - runtime = none; runtime - validator = none; no duplicates.
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md
```

**Recorded results for this lane** (the operator runs the commands above; this section records the expected
green state this docs-only phase relies on):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md` is added; no runtime source (and
  specifically not `no-leak.ts`), no runtime test (and specifically not `no-leak.test.ts`), no route
  handler, no route-vector JSON, validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`,
  package / lockfile, config / env, CI, migration, or generated file is touched;
- **nothing staged / committed** — `git diff --cached --name-status` is empty; `git diff --check` and
  `git diff --cached --check` report no whitespace errors; the no-index whitespace check on the new doc
  reports no errors; `git status` shows only the untracked new doc on branch
  `phase-46s-admission-durable-store-schema-migration-design`;
- **validators green (merged / unchanged artifacts)** — the Phase 33E fixture validator reports **5/5
  probes valid, 0 failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0
  failures, no sixth vector**; the `--self-check` harness reports **44/44** cases behaving as required (42
  fail-closed negative mutations + 2 exact-key no-overmatch guards);
- **runtime re-validation green (live evidence)** — `no-leak.test.ts` and the full
  `app/tests/unit/admission-wedge-spike/` suite pass, and `tsc --noEmit` is clean;
- **runtime ↔ validator key diff (read-only)** — validator `FORBIDDEN_PUBLIC_KEYS` = **114** keys; runtime
  `FORBIDDEN_PUBLIC_KEYS` = **114** keys; validator − runtime = **0**; runtime − validator = **0**; **0**
  duplicates in either set;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–21 exactly
  once each.

---

## 20. Corruption / duplicate guard

Phase 46S applies an explicit corruption / duplicate guard to **this** document (carried from the Phase
46I–46R precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 21.`) appears exactly
  once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §6.13
  illustrative non-executable draft-DDL block (clearly marked) and the §19 validation command list. **No
  fenced block is an executable migration or runnable schema; the draft DDL is illustration only.**

---

## 21. Cross-references

- [`docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md)
  — Phase 46R (PR #163); the immediate predecessor; accepted the readiness inventory and **selected this
  schema / migration design gate** (its §12). **Not modified by this phase.**
- [`docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md)
  — Phase 46M (PR #158); selected Candidate D and **decomposed** the schema families (§7) and migration
  requirements (§8). **This Phase 46S refines that decomposition into a field-level draft design; it does
  not re-do the decomposition.** **Not modified by this phase.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
  — Phase 46I (PR #154); selected split-storage Option 4, the §5 record decomposition, the §6 ownership /
  adapter boundary, the §8 migration / lifecycle preconditions, and the §12 exit checklist. **Not modified.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md)
  and [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md)
  — Phases 46E / 46F (PR #150 / #151); the storage-model direction and storage-shape ↔ vector alignment the
  §6 design realizes. **Not modified.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md)
  — Phase 46K (PR #156); the §9 15-item checklist, the §5 16 durable concerns, and the §10 10 failure /
  rollback concerns the §8 design draws on. **Not modified.**
- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md)
  and [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md)
  — Phase 46N (PR #159); the paper-level gate-#8 clearing and the active-for-downstream-gated-work handoff
  packet (its §4 12 obligations) this design cites for ownership / obligations (§4 / §16). **Not modified.**
- [`docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
  and [`docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
  — Phases 46G / 46H (PR #152 / #153); the auth / identity / signer and consent-proof / receipt decisions
  the §10 / §11 boundary preserves. **Not modified.**
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V (PR #140); the design-finalization vocabulary (Row J idempotency, Row E `RecallDisposition`,
  Rows C/D/N supersession, Row H `AuditEvent` / `TransitionReceipt`, Row O gate #8) the §9 / §13 design
  consumes as final vocabulary. **Not modified.**
- [`docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md)
  and [`docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md)
  — Phases 46Q / 46O (PR #162 / #160); the 114 / 114 runtime ↔ validator parity the §12 no-leak design
  inherits as satisfied. **Not modified.**
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and the five vector JSONs + `validate-route-contract-test-vectors.mjs`, and
  [`docs/admission-wedge/fixtures/README.md`](admission-wedge/fixtures/README.md) + fixtures — inspected
  **read-only** as the unchanged 114-key source of truth, the five-vectors / no-sixth check, the 44/44
  self-check, and the 5/5 probes. **None is modified.**
- [`docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md)
  and [`docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`](admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md)
  — Phases 33N / 33Q; the disabled-by-default env-gate pattern (`DIXIE_ADMISSION_INTAKE_ENABLED`) and the
  bounded synthetic ledger shape the §6 / §9 / §15 design references. **Not modified.**
- `app/src/services/admission-wedge-spike/no-leak.ts`, `…/public-response.ts`,
  `…/admitted-assertion-ledger.ts`, and `app/src/routes/admission-intake.ts` — inspected **read-only** to
  ground the no-leak boundary (§12), the public allowlist (§6 / §12), the synthetic ledger shape (§6 / §9),
  and the disabled-by-default route (§15). **Not modified by this phase.**
- `@loa/straylight` — canonical primitive / substrate owner; the `StorageAdapter` / `AuditLog` interface and
  the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes (cross-repo references, not
  Dixie artifacts); ADR-022E durable-store gate #8 (+ sibling gates #9 / #10 / #11 / #12 / #15 / #20, **held
  operatively**) and ADR-022D receipt / audit-chain invariants are the decision records cited as guardrails
  (§4 / §7 / §8). **Not edited by this phase.**
