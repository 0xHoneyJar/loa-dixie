# Phase 46U — Admission Wedge Dev/Operator Route-Storage Spike Authorization Gate

> **Phase**: 46U
> **Branch context**: `phase-46u-admission-route-storage-spike-authorization`
> **Related**: Phase 46T (PR #165,
> [`ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md))
> **accepted** the Phase 46S durable-store schema / migration design as the current **draft / non-final**
> baseline (its Verdict A) and **selected this dev/operator route-storage spike *authorization* gate as the
> next lane** (its §13); Phase 46S (PR #164,
> [`ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md))
> drafted the field-level durable schema (its §6, 13 `aw_*` tables across 11 subsections), the migration plan
> (§7), the rollback /
> partial-failure plan (§8), the idempotency / replay / conflict design (§9), the binding (§10), the auth /
> consent boundary (§11), the no-leak projection (§12), the recall lifecycle (§13), the observability (§14),
> and **the future route-storage spike preconditions (its §15)** — all explicitly draft / non-final; Phase
> 46R (PR #163,
> [`ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md))
> accepted the implementation-readiness inventory (Outcome A); Phase 46K (PR #156,
> [`ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md))
> authored the §9 15-item readiness checklist; Phase 46M (PR #158,
> [`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md))
> selected **Candidate D** (split storage) as the production-adapter proposal input; Phase 46N (PR #159,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md)
> +
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md))
> cleared ADR-022E gate #8 as a **documentation / architecture / handoff prerequisite only** (not
> operatively); Phase 46O (PR #160) measured the 62-key runtime / validator gap, Phase 46P (PR #161)
> implemented the runtime no-leak mirror (`FORBIDDEN_PUBLIC_KEYS` 52 → 114), and Phase 46Q (PR #162) accepted
> it at exact 114 = 114 parity; Phases 33M–33R authorized (33M, PR #131), implemented (33N, PR #132), and
> accepted (33O, PR #133) the dev/operator-only route spike and implemented (33Q, PR #135) and accepted (33R,
> PR #136) the bounded synthetic admitted-assertion ledger; Phase 33V (PR #140) finalized the storage / auth
> / consent design vocabulary; Phases 33X–33Z / 46A (PR #142–#146) revised the route contract and aligned the
> vectors; Straylight (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); Straylight-repo ADR-022E
> durable-store gate #8 (+ sibling gates #9 / #10 / #11 / #12 / #15 / #20, **held operatively**); ADR-022D
> receipt / audit-chain invariants.
> **Status**: **docs / decision-only.** This gate adds **only this document**. It modifies **no** runtime
> source — and specifically does **not** modify `app/src/services/admission-wedge-spike/no-leak.ts` or
> `app/tests/unit/admission-wedge-spike/no-leak.test.ts` — and changes **no** route handler, storage / store
> code, DB write, migration, SQL file, executable schema, auth, consent, route-vector JSON, route-vector
> validator, route-vector README, Phase 33E fixture, fixture validator, other test, package export, config,
> env, package, lockfile, CI, generated file, or binary. No adjacent repository (`loa-straylight`,
> `freeside-characters`) is touched.
> **This is the dev/operator route-storage spike *authorization* gate** — the rung Phase 46S §15 / §18 and
> Phase 46T §13 named as downstream of the design-acceptance gate. It **decides whether to authorize a later,
> disabled-by-default, dev/operator-only, bounded route-storage spike implementation lane** against the
> accepted Phase 46S draft design, and — where it authorizes — bounds that future lane to an exact scope and
> acceptance bar. **It is not the spike implementation.** It **builds no store, writes no DB, adds no
> migration, creates no SQL or executable schema, executes no migration, implements no auth or consent,
> changes no route / API behavior, freezes neither the route contract nor the final schema, discharges no
> operative Straylight-side gate, and claims no production readiness.**

Every assessment below is grounded read-only against the actual Dixie repo at the time of writing: the
disabled-by-default route handler `app/src/routes/admission-intake.ts` (mounts only when
`DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`; `SERVICE_TOKEN_HEADER = 'x-admission-service-token'` line 44;
`OPERATOR_ID_HEADER = 'x-admission-operator-id'` line 39), the conditional mount in `app/src/server.ts`
(`if (config.admissionIntakeSpikeEnabled)` line 630, mounting `/api/admission/intake` line 636), the env
parsing in `app/src/config.ts` (`admissionIntakeSpikeEnabled` ← `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`
line 399; `admissionIntakeSpikeServiceToken` lines 400-401; `admissionIntakeSpikeOperatorIds` line 402), the
runtime no-leak guard `app/src/services/admission-wedge-spike/no-leak.ts` (`FORBIDDEN_PUBLIC_KEYS` `new Set`
at line 37, **114** keys; `FORBIDDEN_SUBSTRINGS` line 181; `FORBIDDEN_PATTERNS` line 198; `UUID_RE` line 212;
`MAX_OPAQUE_RUN = 24` line 217), the deterministic public-response builder
`app/src/services/admission-wedge-spike/public-response.ts` (closed allowlist `spike` / `outcome_class` /
`scenario_id` / `recall_eligible` / `recall_projection` / `public_receipt_ref` / `safe_reason_code` /
`draft_markers`, lines 99-106; synthetic `SYNTHETIC_PUBLIC_RECEIPT_REF = 'admission-spike-receipt-draft'`
line 24), the classifier `app/src/services/admission-wedge-spike/classifier.ts` (the five-value
`outcome_class` union line 94; `ADMISSION_SPIKE_SHAPE_REFUSAL_CODE = 'ingress.invalid_request'` line 64;
`ADMISSION_SPIKE_DENIED_REASON_DRAFT = 'admission_transition_denied_draft_non_final'` line 68), the bounded
synthetic ledger `app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts` (`assertion_status` ∈
`active` / `superseded`; `AdmittedAssertionScopeViolationError`; `AdmittedAssertionTenantConflictError`;
per-estate capacity bounds `MAX_ASSERTIONS_CEILING` / `MAX_BYTES_CEILING`), the existing unit suite
`app/tests/unit/admission-wedge-spike/` (six files: `admitted-assertion-ledger.test.ts`, `auth-gate.test.ts`,
`classifier-scenarios.test.ts`, `config-gate.test.ts`, `no-leak.test.ts`, `scope-guards.test.ts`) and
integration suite `app/tests/integration/admission-intake/` (four files: `full-stack.test.ts`,
`registration.test.ts`, `route-gate.test.ts`, `store-coupled.test.ts`), the route-contract test-vector
validator `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs` (114
keys; 5/5 + 44/44 self-check), the five route-vector JSONs, and the Phase 33E fixtures + fixture validator
(5/5). **Phase 46U changes no technical artifact**; the validators are run only to confirm the already-merged
artifacts remain green, and the accepted Phase 46S design plus the predecessor gate documents are reviewed
read-only. **The canonical Straylight `StorageAdapter` interface and the canonical `Assertion` /
`TransitionReceipt` / `AuditEvent` field shapes live in the adjacent `loa-straylight` repository (cross-repo
references, not Dixie file:line) and remain Straylight-owned (§14).**

---

## 1. Status and verdict

Phase 46U is the bounded, docs/decision-only **dev/operator route-storage spike authorization gate** that
Phase 46T selected as the next lane (46T §13) and that Phase 46S §15 / §18 named as the rung downstream of
the schema-design-acceptance gate. Its purpose is to take the **accepted** Phase 46S draft durable-store
design and **decide** whether the accumulated evidence is sufficient to authorize a later,
disabled-by-default, dev/operator-only, bounded route-storage spike *implementation* lane — and, where it
authorizes, to bound that future lane to an exact scope, gate set, data boundary, and acceptance bar —
**without performing, executing, authorizing-into-production, freezing, or implementing anything.**

**What this phase is, stated narrowly and exactly.** Phase 46U:

- is **docs / decision-only**;
- is a **route-storage spike authorization gate**, *not* a spike implementation, *not* the schema /
  migration **design** gate (that is Phase 46S), and *not* the schema / migration **design acceptance** gate
  (that is Phase 46T);
- does **not** modify runtime code or tests — and specifically does not touch `no-leak.ts` or
  `no-leak.test.ts`;
- does **not** implement route storage and does **not** implement durable storage;
- does **not** create migrations and does **not** execute any migration;
- does **not** create SQL files or executable schema;
- does **not** write DB code or perform any DB write;
- does **not** authorize production admission;
- does **not** authorize public `remember-this`, Discord / freeform ingestion, or chat-as-memory;
- does **not** implement auth or consent;
- does **not** freeze the route contract;
- does **not** freeze the final schema;
- does **not** claim production readiness;
- does **not** discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §14);
- does **not** select direct durable-store implementation as the next lane (§17).

> **Verdict: A — a future bounded dev/operator route-storage spike *implementation* lane is AUTHORIZED.** The
> evidence (§2) is sufficient to authorize a later, **disabled-by-default**, **dev/operator-only**,
> **bounded**, **reversible**, **non-production**, **capacity-bounded**, **tenant / estate / actor isolated**
> route-storage spike implementation lane, under the strict boundaries this gate defines (§3–§16), and is
> **insufficient for any production admission, production storage, production auth / consent, public rollout,
> Freeside runtime integration, or operative Straylight-side gate discharge** (§15). The authorization is
> **bounded**: it authorizes only the future lane's *scope* to potentially include dev/operator-only
> route-storage writes and Lane-1 `aw_*` migration files — **subject to the future implementation PR and a
> separate Codex audit** — and it explicitly does **not** itself execute a migration, write a DB row,
> authorize production DB writes, authorize production migration execution, or authorize general durable-store
> implementation outside the bounded spike (§3, §7).

This maps to the prompt's verdict **(A)** — *"a future bounded dev/operator route-storage spike
implementation lane is authorized."* It rests on the strict §2 / §3 assessment: the chain's gating
preconditions for spike authorization, enumerated by Phase 46S §15, are now satisfied — most decisively the
one Phase 46S §15 / §18 and Phase 46R §9 named as the gate before spike authorization (*"Phase 46S design
accepted"*), which Phase 46T discharged with its Verdict A. The design discipline the chain has applied at
every comparable transition (decomposition → design → design-acceptance → **authorization**: 46M → 46S → 46T
→ **46U**) places the spike-authorization rung exactly here. Phase 33M is the **direct structural
precedent**: it authorized a dev/operator-only route spike (33N) under strict §7–§15 constraints, that spike
was implemented and accepted (33N / 33O), and this gate reuses that proven authorization shape, advanced one
rung to cover **route-storage**.

**The alternative verdicts were considered and rejected:**

- **Verdict (B) — "authorization held; another blocker / refinement gate is required first"** — *rejected.* A
  blocker / refinement gate would be warranted only if a required precondition were missing or the accepted
  design contained a material defect that must be fixed before even an *authorization* gate could be written.
  Neither is true. Phase 46S §15's precondition list is satisfiable: the design is accepted (46T); Candidate
  D is the proposal input (46M); the 114 / 114 no-leak boundary is in place (46P / 46Q); the bounded synthetic
  ledger (33Q) already exists as the no-migration storage mode; the disabled-by-default env-gate pattern is
  proven (33N). The open items Phase 46S deferred (the final idempotency keying strategy — Row J held; the
  final ID format; index choices; the forward-only-vs-reversible rollback choice; consent persistence) are
  **appropriately-deferred draft elements the future implementation lane owns**, not blockers to *authorizing*
  a bounded, disabled-by-default spike that can run in either storage mode (§6). The one genuine remaining
  blocker — the operative Straylight-side gate #8 (§14) — blocks *production* admission / canonical-store
  migration, not a *Dixie route-side, dev/operator-only, route-owned* spike (§7 Lane 1); it is preserved as
  blocked (§15), but it does not block this authorization.
- **Verdict (C) — "authorization partial; only a narrower follow-up design / authorization lane is allowed"**
  — *rejected.* A partial authorization would be warranted if the spike could be authorized for some surfaces
  but not others such that the remainder needed its own design rung first. The boundaries here are definable
  in full and strictly (§3–§16): the spike is dev/operator-only, disabled-by-default, bounded, reversible,
  non-production, capacity-bounded, tenant / estate / actor isolated, with a hard prohibition list (§4), a
  data boundary (§6), a migration / DB-write boundary (§7), no-leak proof obligations (§8), and an acceptance
  bar (§3.3). Nothing in the future spike's *authorized* surface needs a further design lane before it can be
  bounded — the design it implements against (46S) is already accepted. (Should the future implementation
  lane discover a specific gap when it selects its storage mode, *it* may request a scoped refinement; that is
  its call, not a precondition here.)

**The authorization is bounded — exactly what it covers, and exactly what it does not.** Accepting this
verdict authorizes only that **a later, disabled-by-default, dev/operator-only, bounded, reversible,
non-production route-storage spike implementation lane (Phase 46V, §17) may be opened**, under the §3–§16
boundaries, and that that lane's *scope* **may** include dev/operator-only route-storage writes and Lane-1
`aw_*` migration files (if it selects the durable storage mode — §6 Mode 2), **subject to its own
implementation PR and a separate Codex audit**. It does **not** authorize, and is **not** to be read as
authorizing: production admission, production storage, production DB writes, production migration execution,
general durable-store implementation outside the bounded spike, route / API behavior changes beyond the
already-merged no-leak fail-closed guard hardening and the bounded spike itself, auth / consent
implementation, public `remember-this`, Discord / freeform ingestion, chat-as-memory, Freeside runtime /
client integration, package exports, LLM / voice / Finn wiring, MVP 3 forget / revoke / correction UI, a
route-contract freeze, a final schema freeze, or the discharge of the operative Straylight-side ADR-022E gate
#8 (§15).

---

## 2. Evidence intake

The authorization is grounded in the following predecessor artifacts and source files. Each is cited
read-only; none is modified by this gate. PR numbers are git-sourced from merge-commit subjects (a Dixie
convention; not authority embedded in the gate bodies). Dixie 46-series / 33-series phase labels and the
Straylight ADR-022E "Phase 22" labels are **independent cross-repo labels**.

### 2.1 The authorization chain (relevant to this spike-authorization decision)

| Phase | PR | Artifact / contribution (relevant to the route-storage spike authorization) |
|-------|----|------|
| 33M | #131 | **Dev/operator-only route-spike *authorization* gate.** The **direct structural precedent**: authorized the 33N spike under strict §7–§15 constraints — disabled-by-default behind a `DIXIE_ADMISSION_*_ENABLED`-style flag checked `=== 'true'`, operator/service allowlist, Storage Option A (no durable store) preferred / Option B (dev-only synthetic bounded store) acceptable / Option C (production-like durable write) **not** authorized, the §13.1 draft rollback / partial-failure policy, and the §9 / §10 acceptance criteria and required tests. This gate reuses that authorization shape, advanced one rung to **route-storage**. |
| 33N | #132 | **Dev/operator route spike (implementation).** `POST /api/admission/intake`, disabled-by-default behind `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`, global `/api/*` auth **and** `x-admission-service-token` + `x-admission-operator-id`; **Storage Option A** (no durable store, no DB, no migrations); runtime `no-leak.ts`. Proves the disabled-by-default, dev/operator-only, fail-closed route surface works. |
| 33O | #133 | **Route-spike acceptance gate.** Accepted 33N as a bounded dev/operator spike for MVP 2 — explicitly **not** production / final-schema / durable-storage / Freeside readiness. Named the missing proof as the full governed transition (candidate → admitted assertion exists → status / provenance / receipt → recall includes it → pending / rejected / malformed cannot be recalled). |
| 33Q | #135 | **Bounded synthetic admitted-assertion ledger (implementation).** Process-local, capacity-bounded (`MAX_ASSERTIONS_CEILING` / `MAX_BYTES_CEILING`; per-estate budgets), `(tenant_id, estate_id)`-scoped, fail-closed, synthetic-only, test-seam-only ledger (`assertion_status` ∈ `active` / `superseded`; `AdmittedAssertionScopeViolationError` / `AdmittedAssertionTenantConflictError`; replay-key + fingerprint de-dup). **This is the no-migration, in-process storage mode (§6 Mode 1) a route-storage spike may reuse** — not durable storage. |
| 33R | #136 | **Bounded-ledger acceptance gate.** Accepted 33Q as a bounded, non-production, test-seam-only ledger proof — not production admission / durable storage / final schema. |
| 33V | #140 | **Storage / auth / consent design finalization.** Row J (endpoint idempotency Dixie-owned; content-addressed IDs ≠ endpoint idempotency; substrate performs no replay detection); Row E (`RecallDisposition` include / mark / redact / exclude; `recall_eligible` a Dixie lossy projection); Rows C/D/N (canonical supersession = `assertion_linked` + `supersedes_refs` + status transition); Row H (`AuditEvent` + `TransitionReceipt`; `public_receipt_ref` adopted); Row O (gate #8 held). |
| 33X–33Z / 46A | #142–#146 | **Route-contract revision + vector alignment.** Standardized `public_receipt_ref` (`null` where none), retired `public_receipt_ref_policy` / `receipt_public_ref`, retired public `admission.duplicate_replay`; kept the public refusal taxonomy to source-real `ingress.invalid_request` / `admission_transition_denied_draft_non_final` / `null`; kept exactly five vectors / no sixth; kept `route_contract_final` / `schema_final` false. |
| 46E / 46F | #150 / #151 | **Durable storage model + storage-shape ↔ vector alignment.** Current-state projection + append-only hash-chained audit log on Straylight canonical semantics; ownership split (Straylight canonical / Dixie route-local); `recall_eligible` derived, never persisted; durable shape maps onto the five vectors with no vector / validator change. |
| 46G / 46H | #152 / #153 | **Auth / identity / signer + consent proof / receipt decisions.** Option C (dev/operator) retained; Options A (bearer JWT) / B (signed envelope) production candidates; identity session-derived, no caller override; service auth ≠ consent; consent never inferred from chat; the 11-element consent-proof object model (draft); the 10-case consent failure taxonomy. |
| 46I | #154 | **Durable-store design + ADR-022E gate-#8 boundary.** Selected split-storage Option 4; the §5 record decomposition; the §6 ownership / adapter boundary; gate #8 held. |
| 46J | #155 | **Consent / storage vector & validator alignment.** Added the 37 canonical / consent exact-key names to the **validator's** `FORBIDDEN_PUBLIC_KEYS`; `--self-check` 44/44; deferred the runtime mirror. |
| 46K | #156 | **Durable-store implementation-readiness DECOMPOSITION.** §9 15-item readiness checklist; §5 16 durable concerns; §10 10 failure / rollback concerns. |
| 46M | #158 | **Production-adapter placement (Candidate D) + schema / migration DECOMPOSITION.** Candidate D (split storage) as proposal input; §7 18 schema families; §8 11 migration requirements; gate #8 held. |
| 46N | #159 | **Re-authored gate-#8 clearing ADR — CLEARED (paper-level only) + handoff packet.** Cleared gate #8 as a documentation / architecture / handoff prerequisite only; the operative Straylight-side gate is **not** discharged (§14). |
| 46O / 46P / 46Q | #160 / #161 / #162 | **Runtime no-leak mirror — measured, implemented, accepted.** 46O measured the 62-key gap; 46P brought runtime `FORBIDDEN_PUBLIC_KEYS` 52 → 114; 46Q accepted at parity 114 = 114. **The no-leak boundary a route-storage spike must inherit and prove over persisted / replayed records is in place at both layers.** |
| 46R | #163 | **Durable-store implementation-readiness ACCEPTANCE gate.** Accepted Outcome A; named the operative gate #8 the dominant remaining blocker; named the missing schema / migration design as the open artifact 46S produces; its §9 named "Phase 46S design accepted" as a gate before spike authorization. |
| 46S | #164 | **Durable-store schema / migration DESIGN gate.** Drafted the §6 field-level schema (13 `aw_*` tables across 11 subsections), §7 migration plan (Lane 1 Dixie route-side / Lane 2 canonical), §8 rollback / partial-failure, §9 idempotency / replay / conflict, §10 binding, §11 auth / consent, §12 no-leak projection, §13 lifecycle, §14 observability, and **§15 the future route-storage spike preconditions** — explicitly draft / non-final; verdict pattern B; selected the design-acceptance gate as the next lane. |
| 46T | #165 | **Durable-store schema / migration design ACCEPTANCE gate.** **Accepted** the Phase 46S draft design as the current draft / non-final baseline (Verdict A); confirmed it is "ready to support a future docs-only route-storage spike authorization gate"; **selected this Phase 46U authorization gate as the next lane** (its §13); preserved every blocker and invariant. |
| **46U** | *(this doc)* | **Dev/operator route-storage spike AUTHORIZATION gate.** Records status / verdict (§1) and evidence (§2); makes the authorization decision (§3); bounds the future spike's maximum scope (§4), env gates / kill switch (§5), storage mode / data boundary (§6), migration / DB-write boundary (§7), no-leak (§8), idempotency / replay / conflict (§9), isolation (§10), rollback / partial-failure / capacity (§11), auth / consent boundary (§12), route-contract / schema-freeze boundary (§13), and the Candidate D / gate-#8 boundary (§14); preserves the non-authorizations / blockers (§15) and invariants (§16); selects the next lane (§17). Mutates **no** runtime / test / validator / vector / fixture / source / migration / SQL file. |

### 2.2 Source / test / artifact files inspected (read-only)

- **`app/src/routes/admission-intake.ts`** — disabled-by-default route handler; mounts only when
  `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`; `OPERATOR_ID_HEADER = 'x-admission-operator-id'` (line 39);
  `SERVICE_TOKEN_HEADER = 'x-admission-service-token'` (line 44). **Read-only.**
- **`app/src/server.ts`** — conditional mount `if (config.admissionIntakeSpikeEnabled)` (line 630), mounting
  `/api/admission/intake` (line 636) with the `NOT production admission` marker; when the gate is off the
  route is **not registered at all**. **Read-only.**
- **`app/src/config.ts`** — `admissionIntakeSpikeEnabled` ← `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`
  (line 399); `admissionIntakeSpikeServiceToken` ← `DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN ?? ''` (lines 400-401);
  `admissionIntakeSpikeOperatorIds` ← `DIXIE_ADMISSION_INTAKE_OPERATOR_IDS` (line 402); "No production
  defaults." **Read-only. No durable-store-specific env gate exists.**
- **`app/src/services/admission-wedge-spike/no-leak.ts`** (Phase 33N, hardened by Phase 46P; 286 lines).
  `FORBIDDEN_PUBLIC_KEYS` `new Set` (line 37) holds **114** keys (exact-key `Set.has`, line 254);
  `FORBIDDEN_SUBSTRINGS` (line 181); `FORBIDDEN_PATTERNS` (line 198); `UUID_RE` (line 212); `MAX_OPAQUE_RUN =
  24` (line 217). **Read-only.**
- **`app/src/services/admission-wedge-spike/public-response.ts`** — the fixed, deterministic public-safe
  builder; emits the closed allowlist (`spike`, `outcome_class`, `scenario_id`, `recall_eligible`,
  `recall_projection`, `public_receipt_ref`, `safe_reason_code`, `draft_markers`; lines 99-106); synthetic
  `SYNTHETIC_PUBLIC_RECEIPT_REF = 'admission-spike-receipt-draft'` (line 24); never incorporates
  request-controlled material. **Read-only.**
- **`app/src/services/admission-wedge-spike/classifier.ts`** — the five-value `outcome_class` union
  (`accepted_as_proposed` / `admitted` / `denied` / `superseded_with_correction` / `refused`; line 94);
  `ADMISSION_SPIKE_SHAPE_REFUSAL_CODE = 'ingress.invalid_request'` (line 64);
  `ADMISSION_SPIKE_DENIED_REASON_DRAFT = 'admission_transition_denied_draft_non_final'` (line 68). **`admitted`
  is the public outcome *label* (line 126); `active` is the canonical assertion *status* (ledger).
  Read-only.**
- **`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts`** — the bounded synthetic ledger;
  `assertion_status` ∈ `active` / `superseded` (lines 100 / 161); `AdmittedAssertionScopeViolationError`
  (line 251); `AdmittedAssertionTenantConflictError` (line 352); per-estate capacity bounds
  (`MAX_ASSERTIONS_CEILING` line 413, `MAX_BYTES_CEILING` line 414). **The §6 Mode-1 (no-migration) storage
  shape. Read-only.**
- **`app/tests/unit/admission-wedge-spike/`** (`admitted-assertion-ledger.test.ts`, `auth-gate.test.ts`,
  `classifier-scenarios.test.ts`, `config-gate.test.ts`, `no-leak.test.ts`, `scope-guards.test.ts`) and
  **`app/tests/integration/admission-intake/`** (`full-stack.test.ts`, `registration.test.ts`,
  `route-gate.test.ts`, `store-coupled.test.ts`) — the existing dev-spike test surfaces a route-storage spike
  would extend (it does **not** mutate them here). **Read-only.**
- **`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`** — the
  non-runtime source of truth; `FORBIDDEN_PUBLIC_KEYS` holds the **114** keys; `--self-check` 44/44.
  **Read-only, unchanged.**
- **The five route-vector JSONs** and the **Phase 33E fixtures + `validate-fixtures.mjs`** — re-run green this
  phase (5/5 vectors, no sixth; 5/5 probes). **Read-only.**
- **The accepted Phase 46S design document** and the predecessor gate documents (the §2.1 chain) + the Phase
  46N handoff packet + the Phase 33M authorization gate — read-only to ground §3–§16.
- **Adjacent `loa-straylight` (cross-repo, read-only context).** The canonical `StorageAdapter` / `AuditLog`
  interface and the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes are
  Straylight-owned (cited cross-repo); their concrete field shapes are deliberately **not** redefined here
  (§14).

---

## 3. Authorization decision

### 3.1 The decision

> **Decision: AUTHORIZE a future bounded, disabled-by-default, dev/operator-only, reversible, non-production
> route-storage spike *implementation* lane (Phase 46V, §17), under the strict boundaries of §4–§16.**

This decision rests on the strict §2 assessment and on the explicit satisfaction of Phase 46S §15's
precondition list:

| Phase 46S §15 precondition | Status at Phase 46U | Source |
|---|---|---|
| Phase 46S design accepted | **Satisfied** — Phase 46T Verdict A | 46T §1 / §13 |
| schema / migration design accepted or refined | **Satisfied (as draft baseline)** — accepted draft / non-final | 46T §1 / §7 |
| exact spike storage mode selected | **Authorized as a future-lane choice** between Mode 1 (no-migration) and Mode 2 (dev/operator durable) | §6 |
| disabled-by-default env gate defined | **Required, draft proposal named** (layered on `DIXIE_ADMISSION_INTAKE_ENABLED`) | §5 |
| dev/operator-only scope defined | **Required** — `x-admission-service-token` + `x-admission-operator-id`, synthetic subjects only | §5 / §10 / §12 |
| kill switch defined | **Required** — fail-closed at startup; route not registered / durable mode not engaged unless env exactly `'true'` | §5 |
| no production admission | **Preserved as blocked** | §15 |
| isolation / idempotency / replay / capacity / rollback / persisted-no-leak tests planned | **Required as acceptance criteria** | §8–§11 |
| migration execution still blocked unless separately authorized | **Preserved** — Phase 46U authorizes only the future lane's *scope* to include dev/operator-only writes / Lane-1 migration files, subject to that lane's PR + audit; production migration execution stays blocked | §7 |
| no public `remember-this` / Discord / chat-as-memory; no production auth / consent | **Preserved as blocked** | §12 / §15 |
| separate Codex audit required for the spike | **Required** | §3.3 / §17 |

Every precondition is either satisfied or carried into §4–§16 as a binding boundary on the future lane. The
single dominant remaining blocker — the operative Straylight-side ADR-022E gate #8 — is preserved as blocked
(§14 / §15); it blocks *production* admission and any *canonical-store* (Lane-2) migration, not a Dixie
route-side, dev/operator-only, route-owned spike (Lane-1; §7), exactly as 46S §7.1 / §15 reasoned.

Concretely, this gate states:

- **Phase 46U authorizes only a future Phase 46V implementation of a disabled-by-default, dev/operator-only,
  bounded, reversible, non-production route-storage spike** bounded by §4–§16.
- **Phase 46U does not implement it.** No route handler, store, migration, SQL, executable schema, DB write,
  auth, or consent is created here.
- **Phase 46U does not authorize production** — not production admission, not production storage, not
  production auth / consent, not production DB writes, not production migration execution, not a
  production / live route, not public rollout.
- **Phase 46U does not authorize Freeside runtime / client integration, package exports, LLM / voice / Finn
  wiring, a public `remember-this`, Discord / freeform ingestion, chat-as-memory, or MVP 3 forget / revoke /
  correction UI.**
- **Phase 46U does not freeze a final / production schema and does not freeze the route contract.**
- **Phase 46U does not discharge the operative Straylight-side ADR-022E gate #8.** It is preserved as blocked
  (§14).
- **Phase 46U does not authorize Phase 46V to exceed the constraints in this document.** Anything beyond
  §4–§16 requires a separate gate.
- **Phase 46U does not select direct durable-store implementation as the next lane** (§17).

### 3.2 DB writes and migration execution — the precise statement

This is the precise statement the prompt requires, distinguishing this phase from the future lane:

- **Phase 46U itself**: executes **no** migration, writes **no** DB row, creates **no** migration file, **no**
  SQL file, and **no** executable schema. It is docs/decision-only.
- **The future Phase 46V implementation lane**: **may** include **dev/operator-only route-storage writes and
  Lane-1 `aw_*` migration files** — but **only** if it selects the durable storage mode (§6 Mode 2), **only**
  in a dev/operator environment, **only** disabled-by-default behind the env gates (§5), and **only** subject
  to its own implementation PR and a **separate Codex audit**. Phase 46U authorizes only that *scope*; it does
  **not** pre-bless any specific migration or write.
- **Production DB writes**: **blocked.** Not authorized by Phase 46U or by any future lane this gate names.
- **Production migration execution**: **blocked.** Not authorized.
- **General durable-store implementation outside the bounded spike**: **blocked.** Any production durable
  store, or any canonical-store (Lane-2) migration, remains its own separately-gated future decision behind
  the operative ADR-022E gate #8 (§7 / §14 / §15).

A future Phase 46V lane that chooses **Mode 1 (no-migration, bounded-synthetic, in-process)** writes **no**
DB and creates **no** migration file at all (§6). Mode 2 is the only path that touches durable storage, and
only under the conditions above.

### 3.3 The future spike's acceptance bar (defined here; checked by a later review / audit)

Before a future Phase 46V route-storage spike can be **accepted**, it must satisfy **all** of the following
(this gate defines them; it does not run them):

- [ ] **disabled-by-default** — every spike gate defaults off / false / empty; the route is **not registered
  at all** when `DIXIE_ADMISSION_INTAKE_ENABLED` is not exactly `'true'` (server.ts:630), and the durable
  mode (if chosen) does not engage unless its env gate is also exactly `'true'` (§5);
- [ ] **dev/operator-only auth** — service token (`x-admission-service-token`) and/or operator-id allowlist
  (`x-admission-operator-id`) preserved; **both empty → all calls rejected** (fail-closed); behind the global
  `/api/*` allowlist (defense-in-depth); no production auth / consent (§12);
- [ ] **all five Phase 33L scenarios** (pending, accept, reject, supersede, malformed) covered by tests
  **with persistence / replay exercised** for the chosen storage mode;
- [ ] **no-leak proof over persisted and replayed public responses** — every persisted / replayed public
  surface deep-walked against the §8 boundary; fail-closed on partial / failed paths (§8 / §11);
- [ ] **idempotency / replay / conflict** tested — identical replay returns the same safe result; conflicting
  replay fails closed; tenant / estate / actor-scoped; capacity-bounded (§9);
- [ ] **tenant / estate / actor isolation** tested — cross-scope reads / writes fail closed (§10);
- [ ] **rollback / partial-failure / capacity** tested — no recallable assertion unless the full transition
  succeeds; no partial residue; no duplicates; tombstone / cleanup path; capacity bounds; degraded-store
  fail-closed; safe disabled behavior; no leak during failure (§11);
- [ ] **reversibility** — explicit kill switch + a documented rollback / removal path that leaves no
  recallable residue; if Mode 2, a tested down-migration / drop-empty-table compensation (§5 / §7 / §11);
- [ ] **no production storage / DB writes / migration execution**; Mode 2's Lane-1 dev migrations only, and
  only under the env gate (§7);
- [ ] **draft markers asserted false** (`route_contract_final`, `schema_final`, `idempotency_final`, etc.);
  carried-forward unresolved markers preserved (§13);
- [ ] **no Freeside import / no package export / no Discord ingestion / no chat-as-memory** — static guards
  (§4 / §12 / §15);
- [ ] **stop before commit / PR for a separate Codex audit** — the implementation lane leaves the working
  tree for review; it does not stage, commit, push, or open a PR autonomously.

---

## 4. Future spike maximum scope

If implemented, the future Phase 46V route-storage spike is allowed to touch **only** the files required for
a disabled-by-default, dev/operator-only Admission Wedge route-storage spike, and **only** within §3–§16.

**May be touched (maximum surface — not all are required; the spike justifies what it touches):**

- **route-owned durable adapter file(s)** under `app/src/services/admission-wedge-spike/` (e.g. a route-side
  storage adapter / store module implementing the §6 boundary) — a swap-in of the canonical Straylight
  `StorageAdapter` interface behind the Dixie route boundary (Candidate D; §14), for **route-owned records
  only**;
- **the route handler** `app/src/routes/admission-intake.ts` and the **conditional mount** in
  `app/src/server.ts` — to wire the storage mode behind the existing + new env gates (additive; the
  default-off mount preserved);
- **`app/src/config.ts`** — to parse the new draft env gate(s) (§5), with **no production defaults**;
- **schema / migration file(s) for the dev/operator-only spike** — **only** if Mode 2 (durable) is selected
  and separately justified: the **Lane-1 `aw_*` create-table + index migrations** (§7), dev/operator-only,
  never production, never canonical-store (Lane-2);
- **tests** under `app/tests/unit/admission-wedge-spike/` and `app/tests/integration/admission-intake/` —
  covering persistence / replay / idempotency / conflict / isolation / rollback / partial-failure / capacity
  / no-leak over persisted and replayed responses (§8–§11);
- **no-leak tests** for persisted / replayed public responses specifically (§8);
- **config / env documentation** for the new draft gate name(s) — a runbook note (e.g. a new
  `docs/admission-wedge/PHASE-46V-*-RUNBOOK.md`, mirroring the existing
  `PHASE-33N-DEV-SPIKE-RUNBOOK.md` / `PHASE-33Q-DEV-STORE-RUNBOOK.md`) covering enable / disable / kill-switch
  / rollback;
- **rollback / removal docs** — how to fully disable and remove the spike with no durable residue.

**Must NOT be touched (hard-prohibited future spike scope):**

- the route-vector JSONs, the route-vector validator, the route-vector README, the Phase 33E fixtures, or the
  fixture validator — **any** probe / vector / validator mutation requires its own separately-gated phase
  (the Phase 33D §6 invariant);
- the canonical Straylight semantics / interfaces / invariants — the spike implements a **Dixie route-side**
  adapter only; it does **not** re-mint or redefine `Assertion` / `EstateTransition` / `TransitionReceipt` /
  `AuditEvent` / `RecallPack` / `RecallReceipt`, and does **not** rewrite the canonical hash chain (§14);
- any **Lane-2 canonical-store** migration or DB code — that is a separate ADR + sibling-repo PR under
  Straylight teammate review, behind the operative gate #8 (§7 / §14);
- production config / defaults / rollout wiring;
- the Freeside adapter / any `freeside` import / any live Freeside client path;
- package export surfaces;
- LLM / voice / Finn wiring;
- any MVP 3 forget / revoke / correction UI;
- any auth / consent **production** implementation;
- any public `remember-this`, Discord / freeform ingestion, or chat-as-memory path.

**Hard-prohibited future spike outcomes (even if implemented):** production admission rollout; public
`remember-this`; Discord / freeform ingestion; chat-as-memory; Freeside runtime / client integration; LLM /
voice / Finn wiring; package exports unless separately justified and audited; route-contract freeze; final
schema freeze; production auth / consent implementation; operative Straylight-side production gate discharge
claims.

---

## 5. Required future env gates / kill switch

If the future spike is implemented, it must satisfy **all** of the following gate requirements:

- **disabled by default** — every spike gate defaults off / false / empty; **no production default-on
  behavior** (mirrors config.ts:399-402 "No production defaults");
- **the base route gate is preserved** — the spike has **no effect** unless
  `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (the existing base layer; config.ts:399, server.ts:630). When
  it is off, the route is **not registered at all** (a request to `POST /api/admission/intake` falls through
  to the SPA);
- **a new storage-spike env gate, if the durable mode requires it** — Mode 2 (durable; §6) must engage **only
  when both** the base gate **and** a new durable-storage-spike gate are exactly `'true'`. A **draft /
  non-final** proposed name is `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED` (checked `=== 'true'`) — *this
  name is a draft proposal only; no such env gate exists in the repo today (confirmed read-only against
  config.ts), and the future implementation lane owns naming and defining it.* Mode 1 (no-migration,
  bounded-synthetic; §6) may run under the existing base gate alone, persisting nothing durable, and needs no
  new gate;
- **dev/operator-only scope** — service token checked constant-time against `x-admission-service-token`
  (`DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN`) and/or an operator-id allowlist on `x-admission-operator-id`
  (`DIXIE_ADMISSION_INTAKE_OPERATOR_IDS`), preserved or explicitly scoped; **with both empty, the enabled
  spike rejects all calls** (fail-closed; no production default), and the route remains behind the global
  `/api/*` allowlist (defense-in-depth; 33N);
- **a separate kill switch / disable path** — setting the env gate(s) to anything other than exactly `'true'`
  (or removing them) disables the spike and (Mode 2) prevents the durable store from engaging;
- **fail-closed at startup** — invalid / missing / blank / malformed env values default to disabled and never
  to a production storage path; the spike never falls back to production storage if its config is absent;
- **safe behavior when disabled / unauthorized / misconfigured** — a disabled spike leaks nothing (route not
  mounted); an unauthorized caller is denied with a stable public-safe code that never reveals which gate
  failed.

> **No final env names are invented here.** `DIXIE_ADMISSION_INTAKE_ENABLED`,
> `DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN`, and `DIXIE_ADMISSION_INTAKE_OPERATOR_IDS` are the **existing**
> gates (config.ts:399-402). `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED` is a **draft / non-final
> proposal**; the future lane may name it differently. This gate establishes no env name as final.

---

## 6. Storage mode and data boundary

The future spike must select exactly one storage mode and justify the choice:

- **Mode 1 — bounded-synthetic, no-migration, in-process (preferred / default).** Reuse the Phase 33Q
  shape (`admitted-assertion-ledger.ts`: process-local, capacity-bounded, `(tenant_id, estate_id)`-scoped,
  fail-closed, synthetic-only). **No DB writes, no migration files, nothing durable.** Rollback is trivial
  (no durable state). This is the lowest-blast-radius mode and is preferred where persistence is not strictly
  needed to exercise replay / idempotency / lifecycle.
- **Mode 2 — dev/operator-only durable (conditionally authorized).** A non-production, env-gated, Dixie
  route-side durable store running the Lane-1 `aw_*` migrations in a dev/operator environment only (§7), for
  **route-owned records only**. Permitted **only** subject to the §3.2 conditions, the §5 gates, and a
  separate Codex audit.

**What the future spike may store (route-owned Admission Wedge records, under the accepted Phase 46S draft
baseline — its §6 `aw_*` tables):**

- **candidate proposal / reference records** (`aw_candidate_ingress`) — a candidate ingress reference;
  **never** the raw payload publicly;
- **transition decision records** (`aw_admission_decision`) — the Dixie-side ingress reference to a canonical
  transition decision;
- **admitted assertion references / projections** (`aw_admitted_assertion_ref`) — an **opaque private
  reference** to the canonical `active` `Assertion`; never a parallel canonical copy;
- **receipt / public reference projections** (`aw_transition_receipt_ref` private + `aw_public_receipt_projection`
  public-safe) — the private canonical receipt reference kept strictly separate from the one public-safe
  `public_receipt_ref` value (string or `null`);
- **private audit / reference records** (`aw_audit_event_ref`) — an append-only **reference** to the
  canonical hash-chained `AuditEvent`; Dixie never rewrites the chain;
- **idempotency / replay records** (`aw_idempotency_replay`) — Dixie/endpoint-owned replay key + fingerprint,
  scoped by `(tenant_id, estate_id)`;
- **supersession / correction references** (`aw_supersession_link`) — the Dixie-local inverse link;
- **rejection / denial records** (`aw_rejection_denial`) — exposing only the outcome class `denied` + a
  public-safe `safe_reason_code`;
- **rollback / tombstone / cleanup markers** (`aw_tombstone`) — if needed (§11);
- **operational diagnostics / refusal telemetry, private only** (`aw_diagnostics`, `aw_refusal_telemetry`) —
  safe class labels only, payload-free.

**Prohibited stored material (in any mode):**

- **no raw Discord / freeform chat history** — none ingested, none stored;
- **no public raw candidate payload** — the candidate payload is private / referenced, never public;
- **no raw consent / auth tokens in public or broadly queryable records** — consent / auth material is
  private and reference-only (§12);
- **no secrets / tokens / private signer material** — forbidden public keys and forbidden private raw
  material;
- **no unbounded debug blobs** — diagnostics are private, bounded, safe-class-labelled only;
- **no production user-memory ingestion** — the spike admits nothing to production;
- **no canonical Straylight ownership transfer to Dixie** — Dixie owns route-side records and **ingress
  references** only; canonical semantics stay Straylight-owned (§14).

---

## 7. Migration / DB write boundary

Stated precisely, distinguishing this phase from the future lane and from production:

- **Phase 46U itself**: **no migration files, no SQL files, no executable schema, no DB writes, no migration
  execution.** Docs/decision-only.
- **Future spike implementation lane (Phase 46V)**: **may** create **dev/operator-only, bounded Lane-1 `aw_*`
  migration / schema / route-storage code** — but **only** if the §3.1 verdict's authorization applies (it
  does), **only** if Mode 2 is selected (§6), **only** behind the §5 env gates, **only** in a dev/operator
  environment, and **only** subject to its own PR + a separate Codex audit. The **Lane-1 (Dixie route-side)**
  migrations touch no canonical Straylight substrate; the **Lane-2 (canonical-store)** migrations are **not**
  authorized — they remain a separate ADR + sibling-repo PR under teammate review, behind the operative gate
  #8 (§14).
- **Production migrations**: **still blocked.**
- **Production DB writes**: **still blocked.**
- **Final schema freeze**: **still blocked** — `schema_final` stays false; the accepted Phase 46S §6 design is
  draft / non-final.
- **Down migration / rollback / cleanup**: **must be designed and tested** by the future lane. The Phase 46S
  §7.6 draft posture (forward-only Lane-1 migrations + drop-empty-table compensation, plus the `aw_tombstone`
  cleanup marker; the canonical chain never rolled back or rewritten) is the baseline; the future lane must
  implement and test a reversible disable / removal path either way.

> **On whether migration execution should remain blocked even in the future spike.** It need not be blocked
> *categorically*, because repo evidence supports a safe dev-only path: the Phase 46S §7.5 / §7.6 design makes
> the Lane-1 `aw_*` migrations **additive and forward-only** (new empty tables; the disabled-by-default route
> is unaffected until the durable mode is enabled), and the Phase 33Q ledger already proves a safe
> no-migration alternative. Therefore the future spike **may** choose Mode 2 (dev/operator-only durable, with
> Lane-1 migrations) **or** Mode 1 (no-migration, bounded-synthetic, in-process) — its call at implementation
> time, justified and audited. **Mode 1 is preferred where persistence is not strictly required.** What
> remains hard-blocked in **either** mode is production DB writes, production migration execution, any
> Lane-2 canonical-store migration, and any general durable-store implementation outside the bounded spike.

---

## 8. Public / private projection and no-leak requirements

The future spike must **prove** that persisted and replayed outputs remain public-safe:

- **public responses must pass the existing runtime no-leak guard** — every public body is deep-walked by
  `no-leak.ts` (the 114-key `FORBIDDEN_PUBLIC_KEYS` exact-key `Set.has` at line 37/254 + the
  `FORBIDDEN_SUBSTRINGS` (181) / `FORBIDDEN_PATTERNS` (198) / `UUID_RE` (212) / `MAX_OPAQUE_RUN = 24` (217)
  value-pattern walls); the spike adds no new public field beyond the `public-response.ts` closed allowlist;
- **persisted records must not bypass the no-leak guard** — a durable-store serializer must route every
  public projection through the guard; no persisted column crosses to the public surface except the
  public-safe `public_receipt_ref` (string or `null`) + the public-safe labels the builder already emits;
- **replayed / idempotent responses must be public-safe** — a replayed response is deep-walked exactly like a
  fresh one;
- **private receipt / audit / source / debug / auth / signer / consent / storage internals stay private** —
  every `*_row_id`, every `*_ref`, every binding id, every canonical reference, and all consent / signer /
  audit / raw payload material is private and forbidden from public projection at any depth;
- **the future spike must add its own tests** covering stored and replayed public responses, **and**
  failure / partial-write paths (§11) — fail-closed, no leak;
- **runtime no-leak parity (114 / 114, Phase 46P / 46Q) is prior evidence, not a substitute** — it proves the
  *boundary* exists at both layers; it does **not** prove a *persisted-projection* serializer is safe. That
  proof is the future spike's own obligation.

---

## 9. Idempotency / replay / conflict requirements

The future spike must **prove**:

- **identical replay returns the same safe result or safe equivalent** — an identical retry under the same
  key returns the prior public envelope (no second assertion minted); `aw_idempotency_replay`
  `replay_outcome: replayed` (46S §9);
- **conflicting replay fails closed** — a same-key / different-payload or different-identity retry fails
  closed with a stable public-safe code; the design-level conflict class is private only (never a public
  dotted `admission.*` code; §13);
- **replay scope includes tenant / estate / actor** — the replay key is unique **within** a `(tenant_id,
  estate_id)` scope and bound by identity; cross-scope keys cannot collide or replay across scopes;
- **replay key capacity limits** — the idempotency ledger is capacity-bounded (mirroring 33Q's per-estate
  budgets); inserts beyond budget fail closed (bounded rejection, no unbounded growth, no silent eviction);
- **replay TTL / retention if used** — draft / optional; if added, it must not weaken the conflict guarantee;
- **no duplicate admitted / corrected assertions on replay** — identical replay mints no second assertion;
- **no public leak in conflict response** — no idempotency key, fingerprint, or conflict detail crosses to
  the public surface;
- **no cross-tenant / cross-estate replay** — enforced by the scoped unique key (§10).

> The **final keying strategy** (candidate-id vs idempotency-header vs both), the durable replay-envelope
> shape, and the TTL policy remain **undecided** (Row J held; `idempotency_final: false`). The future spike
> may implement **draft / dev-only** idempotency behavior; it must **not** claim final idempotency.

---

## 10. Tenant / estate / actor isolation requirements

The future spike must **prove**:

- **all records scoped by tenant / estate / actor where applicable** — `tenant_id` (Dixie host-layer),
  `estate_id` / `actor_id` (canonical, session-derived) on every record; reads / writes bound to a
  `(tenant_id, estate_id)` scope (mirroring 33Q's `AdmittedScope` / `EstateSlot`);
- **cross-tenant / cross-estate / cross-actor reads / writes fail closed** — mirroring 33Q's
  `AdmittedAssertionScopeViolationError` / `AdmittedAssertionTenantConflictError` and the canonical recall
  filter; an estate is reachable only by the tenant that owns it;
- **operator synthetic authority remains dev-only** — the `x-admission-operator-id` allowlist is a
  non-precedent dev/operator isolation mechanism, **never** the production binding;
- **service auth and operator allowlist remain separate from end-user consent** — a valid service credential
  proves a service may call Dixie; it is **not** end-user authorization and **not** consent (§12);
- **no cross-user admission without an explicit future consent model** — synthetic subjects only; identity
  session-derived, never body-trusted; the candidate-subject (canonical `subject_refs`) is distinct from the
  caller-actor, and neither is body-trusted.

---

## 11. Rollback / partial failure / capacity requirements

The future spike must **prove**:

- **no recallable assertion unless the full transition succeeds** — a failed admit produces nothing
  recallable, indistinguishable for recall from a transition that never happened;
- **no partial admitted-assertion residue** — the Dixie route-side commit (candidate → decision → references
  → idempotency) is an atomic unit; a partial write leaves no durable row implying an admitted assertion;
- **no duplicate admitted / corrected assertions on retry** — enforced via the idempotency ledger (§9);
- **rollback / tombstone cleanup path** — Dixie route-owned partial rows marked via `aw_tombstone` and
  excluded from recall + public projection; the canonical chain is **never** tombstoned or rewritten by Dixie;
- **capacity bounds** — per-estate assertion-count and byte budgets (mirroring 33Q's `MAX_ASSERTIONS_CEILING`
  / `MAX_BYTES_CEILING`); inserts beyond budget fail closed;
- **oversized payload safety** — oversized / unsafe payloads fail closed before any transition (the classifier
  accepts only the five forms; `ingress.invalid_request`);
- **degraded storage behavior** — if the durable store is unavailable, the route fails closed with a safe
  refusal; it never admits, never half-admits, and never leaks (the design-level
  `admission.storage_unavailable` class is private only, never a public dotted code);
- **safe disabled behavior** — when the env gate is off, the durable mode does not engage and the route is
  not registered;
- **no public leak during failures** — every partial / failed / rolled-back path is deep-walked by the
  runtime no-leak guard and returns a stable public-safe refusal only (§8).

---

## 12. Auth / consent boundary

Preserved (none implemented by Phase 46U; none unblocked for production by the future spike):

- **the current dev/operator service-token / operator model is not production auth / consent** — it proves a
  service may *call* Dixie; it is not end-user authorization and not consent (the load-bearing 32F / 33A
  boundary, restated; 46G §4.1 / 46H §4.1);
- **service auth and end-user authorization remain separate** — no schema column conflates a service
  credential with a consent proof or an end-user authorization;
- **the production consent model remains future-gated** — Option C (dev/operator) is the only authorized
  spike posture; production Options A (bearer JWT) / B (signed envelope) and the end-user consent model are
  blocked;
- **missing / invalid consent fails closed in any future production model** — the 46H §7 10-case consent
  failure taxonomy (missing / malformed / subject-mismatch / scope-mismatch / tenant-estate-actor-mismatch /
  expired / revoked / replayed-or-conflicting / signer-invalid / leak-attempt) all fail closed and mint no
  admitted assertion; carried as a future obligation, not implemented here;
- **public `remember-this` remains blocked** — no public / unauthenticated remember-this surface;
- **Discord / freeform ingestion remains blocked** — no Discord / freeform history ingestion path;
- **chat-as-memory remains blocked** — consent is never inferred from chat text; user chat does not become
  memory merely because it was said.

---

## 13. Route-contract and schema freeze boundary

Preserved:

- **the route contract remains draft / non-final** unless separately accepted — `route_contract_final` stays
  false on every vector; Phase 46U freezes nothing;
- **the final schema remains draft / non-final** unless separately accepted — `schema_final` stays false; the
  accepted Phase 46S §6 design is explicitly draft / non-final;
- **the public response shape must not be expanded without no-leak proof and separate acceptance** — the
  future spike adds no new public field beyond the existing `public-response.ts` closed allowlist (§8);
- **source-real public `outcome_class` values remain exactly**: `accepted_as_proposed`, `admitted`, `denied`,
  `superseded_with_correction`, `refused` (classifier.ts:94-99); `admitted` / `denied` may appear elsewhere
  only as decision *examples*;
- **`active` remains the canonical assertion status, not a public `outcome_class` value** — `assertion_status`
  ∈ `active` / `superseded` (ledger); the public outcome label `admitted` and the canonical status `active`
  remain distinct, never conflated.

---

## 14. Candidate D / ADR-022E gate #8 boundary

Preserved:

- **Candidate D remains proposal input / design baseline, not implemented architecture** (46M §6; 46S §4) —
  the future spike implements within it on the Dixie route-side; it does not freeze a physical placement or
  bless a production adapter;
- **the future spike can only be a Dixie route-side, route-owned storage spike** — for the §6 route-owned
  records only; it is a swap-in of the canonical Straylight `StorageAdapter` interface behind the Dixie route
  boundary, **not** a re-implementation of canonical semantics;
- **canonical Straylight semantics / interfaces / invariants remain preserved** — the spike does not re-mint
  or redefine `Assertion` / `EstateTransition` / `TransitionReceipt` / `AuditEvent` / `RecallPack` /
  `RecallReceipt`; the hash chain and `verifyChain` tamper-detection live canonical-side; Dixie holds ingress
  references only and never rewrites the chain;
- **Phase 46N gate-#8 clearing remains a bounded Dixie documentation / architecture / handoff prerequisite
  only** — not an operative discharge;
- **no operative Straylight-side production gate discharge is claimed** — there is **no repo evidence** that
  the operative Straylight-side pathway (a Straylight teammate-reviewed separate-ADR / sibling-repo PR) has
  occurred; the operative gate #8 — and sibling gates #9 / #10 / #11 / #12 / #15 / #20 — remain **held**.
  **This remains the dominant cross-repo blocker** (46R §4 row 13) and blocks production admission and any
  Lane-2 canonical-store migration, not the Dixie route-side spike (§7).

---

## 15. Non-authorizations and blockers

After Phase 46U, the following remain **blocked**, regardless of the verdict — none is unblocked by this
authorization gate:

- **direct production durable-store implementation** — blocked (only the bounded, dev/operator-only,
  disabled-by-default spike is authorized, §3 / §6 / §7);
- **production DB writes** — blocked;
- **production migration execution** — blocked;
- **production admission** — blocked;
- **public `remember-this`** — blocked;
- **Discord / freeform ingestion** — blocked;
- **user chat becoming memory merely because it was said** — blocked; consent never inferred from chat text;
- **Freeside runtime / client integration** — blocked (Freeside stays a consumer / handoff surface, never a
  host; gate #11 held);
- **package exports** — blocked unless separately justified and audited;
- **LLM / voice / Finn runtime behavior wiring** — blocked;
- **MVP 3 forget / revoke / correction UI** — blocked (only the *representability + fail-closed* boundary is
  noted);
- **route-contract freeze** — blocked; `route_contract_final` stays false;
- **final schema freeze** — blocked; `schema_final` stays false;
- **production readiness of any kind** — not claimed;
- **operative Straylight-side ADR-022E gate #8 discharge** — not claimed (no repo evidence; §14); sibling
  gates #9 / #10 / #11 / #12 / #15 / #20 remain held.

**Blockers remaining before the future spike implementation (conditional on the §3 authorization):**

- the future Phase 46V lane must **select and justify its storage mode** (§6) and, if Mode 2, **name and
  define** the new draft durable-storage-spike env gate (§5);
- it must **add and pass** the §8–§11 tests (persisted / replayed no-leak, idempotency / replay / conflict,
  isolation, rollback / partial-failure / capacity) before acceptance (§3.3);
- it must **stop before commit / PR for a separate Codex audit** (§3.3 / §17);
- any **Lane-2 canonical-store** touch remains behind the operative gate #8 (§14) and is **not** part of the
  authorized spike.

> Authorizing this bounded spike unblocks **no** production / public / canonical-store / Freeside / LLM /
> package / freeze work. Every lane above remains its own separately-authorized future gate.

---

## 16. Invariants

Phase 46U preserves **all** of the following; the authorization carries each forward unchanged:

1. **A pending candidate is not recallable.**
2. **A rejected candidate creates no admitted assertion.**
3. **An accepted candidate creates / references an admitted assertion.**
4. **A superseded assertion is excluded from ordinary recall** unless explicitly requested / marked.
5. **A malformed / unsafe payload fails closed** (and leaves no recallable residue; only minimal private
   telemetry).
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
    `route_contract_final` / `schema_final` false on every vector; Phase 46U freezes neither.
15. **`recall_eligible` remains derived / non-authoritative** — computed at read time, never persisted as
    canonical authority, and never a column in the accepted Phase 46S §6 schema.

Also preserved (vocabulary): the **public outcome label `admitted`** and the **canonical assertion status
`active`** remain distinct, never conflated (§13).

---

## 17. Next lane

The evidence is sufficient (§2), Phase 46S §15's preconditions are satisfied or carried forward as binding
boundaries (§3), and the future spike is bounded in full (§4–§16). Direct production durable-store
implementation, production DB writes, production migration execution, production admission, and the operative
Straylight-side gate #8 all remain blocked (§15).

> **Selected next lane: Phase 46V — dev/operator route-storage spike *implementation*, a bounded
> runtime / source / test (and, if Mode 2, Lane-1 migration) slice, under the Phase 46U boundaries
> (§3–§16).**

- **What it is.** The **later spike implementation lane**, **not this phase.** It implements a single
  disabled-by-default, dev/operator-only Admission Wedge route-storage spike against the accepted Phase 46S
  draft design, selecting Mode 1 (no-migration, bounded-synthetic; preferred) or Mode 2 (dev/operator-only
  durable, with Lane-1 `aw_*` migrations) per §6 / §7.
- **What it must remain.** Disabled-by-default, dev/operator-only, bounded, reversible, non-production,
  tenant / estate / actor isolated, capacity-bounded; **no** public `remember-this`, **no** Discord /
  freeform ingestion, **no** chat-as-memory, **no** auth / consent production implementation, **no**
  route-contract freeze, **no** final schema freeze; and **separately Codex-audited** (it must stop before
  commit / PR for review).
- **Exact maximum files / surfaces.** As enumerated in §4 — route-owned durable adapter file(s), the route
  handler + conditional mount, `config.ts` env parsing, dev/operator-only Lane-1 `aw_*` migration / schema
  file(s) **only if Mode 2 is selected and justified**, tests under
  `app/tests/{unit/admission-wedge-spike,integration/admission-intake}/`, persisted / replayed no-leak tests,
  config / env documentation (a runbook note), and rollback / removal docs — and **nothing** in the
  prohibited list (§4).
- **What remains blocked regardless.** **Direct production durable-store implementation remains blocked**;
  production DB writes / production migration execution remain blocked; any Lane-2 canonical-store migration
  remains behind the operative gate #8; production admission / auth / consent, public `remember-this`,
  Discord / freeform ingestion, chat-as-memory, Freeside runtime integration, package exports, LLM / voice /
  Finn wiring, MVP 3 UI, and the route-contract / final-schema freezes all remain blocked (§15).

> **Alternatives considered.** A **route-storage spike authorization *refinement* gate** as 46V was rejected
> because the boundaries here are complete and strict (§4–§16); refinement, if the implementation lane finds a
> specific gap (e.g. when it selects Mode 2's storage shape), is its own call, not a precondition. A **further
> blocker / decomposition gate** as 46V was rejected as redundant: the blockers are decomposed (46K / 46M) and
> accepted (46R), and the design is accepted (46T); no new decomposition is owed. A **named blocker gate
> waiting on the operative Straylight gate #8** as 46V was rejected because a Dixie docs phase cannot discharge
> or productively wait-gate a cross-repo Straylight-owned operative gate, and the *Dixie route-side,
> dev/operator-only* spike is not blocked by it (§7 / §14). **Direct production durable-store implementation
> as the next lane is explicitly NOT selected** (§15).

---

## 18. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`) unless noted.
Phase 46U is docs/decision-only — it adds only this document and mutates no runtime source, test, validator,
vector, fixture, migration, or SQL file — so the validators are run only to confirm the already-merged
artifacts remain green.

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
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md || true
# Optional focused runtime re-validation of the merged dev-spike slice (from app/), as live evidence:
npx vitest run tests/unit/admission-wedge-spike/no-leak.test.ts
npx vitest run tests/unit/admission-wedge-spike/
npx tsc --noEmit
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md
```

**Recorded results for this lane:**

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md` is added; no runtime source (and
  specifically not `no-leak.ts`), no runtime test (and specifically not `no-leak.test.ts`), no route handler,
  no route-vector JSON, validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`,
  package / lockfile, config / env, CI, migration, SQL, executable schema, or generated file is touched;
- **nothing staged / committed** — `git diff --cached --name-status` is empty; `git diff --check` and
  `git diff --cached --check` report no whitespace errors; the no-index whitespace check on the new doc
  reports no errors; `git status` shows only the untracked new doc on branch
  `phase-46u-admission-route-storage-spike-authorization`;
- **validators green (merged / unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes
  valid, 0 failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no
  sixth vector**; the `--self-check` harness reports **44/44** cases behaving as required (42 fail-closed
  negative mutations + 2 exact-key no-overmatch guards);
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–20 exactly
  once each.

*(The full recorded command output is reproduced in the operator's run report accompanying this lane.)*

---

## 19. Corruption / duplicate guard

Phase 46U applies an explicit corruption / duplicate guard to **this** document (carried from the Phase
46I–46T precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 20.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is the §18
  validation command list. **No fenced block is an executable migration or runnable schema.**

---

## 20. Cross-references

- [`docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-ACCEPTANCE-GATE.md)
  — Phase 46T (PR #165); the immediate predecessor; **accepted** the Phase 46S draft design (Verdict A) and
  **selected this Phase 46U authorization gate** (its §13). **This Phase 46U decides spike authorization
  against that accepted draft baseline; it does not re-do the acceptance.** **Not modified by this phase.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-SCHEMA-MIGRATION-DESIGN-GATE.md)
  — Phase 46S (PR #164); **drafted** the §6 field-level schema (13 `aw_*` tables across 11 subsections), the §7 migration plan
  (Lane 1 / Lane 2), and **§15 the future route-storage spike preconditions** this gate satisfies / carries
  forward. **Not modified.**
- [`docs/ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)
  — Phase 33M (PR #131); the **direct structural precedent** — a dev/operator-only route-spike *authorization*
  gate whose §7–§15 scope / acceptance / test / storage / no-leak shape this gate reuses, advanced one rung to
  route-storage; its §21 / §22 record the 33N implementation and 33O acceptance. **Not modified.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-ACCEPTANCE-GATE.md)
  — Phase 46R (PR #163); accepted the readiness inventory (Outcome A); its §9 named "Phase 46S design
  accepted" as a gate before spike authorization. **Not modified.**
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md)
  — Phase 46K (PR #156); the §9 15-item readiness checklist and §10 10 failure / rollback concerns the §11
  acceptance criteria draw on. **Not modified.** *(Distinct from
  `ADMISSION-WEDGE-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`, which is Phase 33I — the route-contract
  blocker decomposition.)*
- [`docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md)
  — Phase 46M (PR #158); selected **Candidate D** and decomposed the schema families + migration requirements
  the §14 boundary preserves. **Not modified.**
- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md)
  and [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-SIBLING-HANDOFF-PACKET.md)
  — Phase 46N (PR #159); the paper-level gate-#8 clearing (documentation / architecture / handoff prerequisite
  only) and the handoff packet the §14 boundary cites. **Not modified.**
- [`docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md)
  and [`docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md)
  — Phases 46Q / 46O (PR #162 / #160); the 114 / 114 runtime ↔ validator parity the §8 no-leak requirements
  inherit as prior evidence. **Not modified.**
- [`docs/ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-BOUNDED-LEDGER-ACCEPTANCE-GATE.md)
  and [`docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`](admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md)
  — Phases 33R / 33Q; the bounded synthetic ledger (the §6 Mode-1 no-migration storage shape) and its
  acceptance. **Not modified.**
- [`docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md)
  — Phase 33N; the disabled-by-default env-gate runbook pattern the §5 gate requirements mirror. **Not
  modified.**
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  and [`docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
  and [`docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
  — Phases 33V / 46G / 46H; the idempotency (Row J), `RecallDisposition` (Row E), supersession (Rows C/D/N),
  auth / identity / signer, and consent-proof / receipt decisions the §9 / §10 / §12 boundaries preserve.
  **Not modified.**
- `app/src/routes/admission-intake.ts`, `app/src/server.ts`, `app/src/config.ts`,
  `app/src/services/admission-wedge-spike/{no-leak,public-response,classifier,admitted-assertion-ledger}.ts`,
  and the existing test suites `app/tests/unit/admission-wedge-spike/` + `app/tests/integration/admission-intake/`
  — inspected **read-only** to ground the disabled-by-default env gate (§5), the no-leak boundary (§8), the
  public allowlist + `admitted`-vs-`active` vocabulary (§13), the synthetic ledger shape (§6), and the
  isolation / capacity errors (§10 / §11). **None is modified by this phase.**
- `docs/admission-wedge/route-contract-test-vectors/` (validator + five vector JSONs + README) and
  `docs/admission-wedge/fixtures/` (validator + fixtures + README) — inspected **read-only** as the unchanged
  114-key source of truth, the five-vectors / no-sixth check, the 44/44 self-check, and the 5/5 probes.
  **None is modified.**
- `@loa/straylight` — canonical primitive / substrate owner; the `StorageAdapter` / `AuditLog` interface and
  the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes (cross-repo references, not
  Dixie artifacts); ADR-022E durable-store gate #8 (+ sibling gates #9 / #10 / #11 / #12 / #15 / #20, **held
  operatively**) and ADR-022D receipt / audit-chain invariants are the decision records cited as guardrails
  (§7 / §14). **Not edited by this phase.**
