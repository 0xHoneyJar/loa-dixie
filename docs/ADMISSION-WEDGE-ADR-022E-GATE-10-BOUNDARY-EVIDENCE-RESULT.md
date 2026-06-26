# `loa-dixie` ADR-022E gate #10 boundary evidence / result

> **Type**: `loa-dixie` repo-local **docs-only evidence / result** artifact for the candidate ADR-022E
> **gate #10** Dixie **boundary / route-side ingress / control-plane** responsibility
> (Dixie boundary wiring, `ADR-022E:59` (sibling `loa-straylight` authority; not locally repo-relative), sibling repo).
> **Branch**: `straylight-gate10-boundary-evidence-result`.
> **Status**: docs-only. This PR adds **only this one Markdown document** under `docs/`. It changes no source,
> test, runtime, config, package, lockfile, CI, generated, hidden / workflow, memory, `.claude`, `.loa`, `.run`,
> grimoire, schema, migration, SQL, route, validator, or fixture surface, and touches no sibling repository. It
> **inspects read-only and cites** existing Dixie surfaces and **records an evidence result** — and nothing more.

---

## 1. Status / verdict

**Evidence result: `PARTIAL`.**

The Dixie-side evidence is strong, present, and citable: existing `loa-dixie` surfaces demonstrably **can carry**
route-side ingress / boundary / reference / control-plane records for the Admission Wedge — behind a default-off
dev/operator spike — **without** Dixie becoming the canonical semantic owner and **without** redefining or re-minting
Straylight canonical primitives. That half of the boundary contract is verifiable here with `file:line` precision.

It is **`PARTIAL`, not `PASS`**, for two honest reasons that this lane cannot close from inside `loa-dixie`:

1. **Cross-repo half not locally verifiable.** "**Dixie carries** references for what **Straylight defines**" has a
   Dixie side (proven here: zero local canonical definitions, type-only imports, reference-only records) and a
   Straylight side (the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` / recall-admission / estate-force
   *definitions*, plus the `ADR-022E:59` anchor itself). The Straylight side lives in the sibling repo and is **not
   citable from this checkout**, so end-to-end alignment cannot be demonstrated locally.
2. **Boundary exists only as a default-off spike.** The route-side ingress / control-plane surface is a
   disabled-by-default, triple-env-gated dev/operator **spike**. The evidence supports "Dixie **can** host the boundary
   responsibility," not "Dixie discharges it in production" — production boundary wiring stays blocked behind gate #8,
   with no `canonical-store physical host` selected.

`PARTIAL` keeps **gate #10 held**. This matches the conservative posture of the authorizing gate (PR #203) and the
sibling `loa-finn` gate #9 *runtime* evidence (PR #196), which recorded `PARTIAL` with gate #9 held. Fail-closed is the
default; absent affirmative, end-to-end, reviewed evidence meeting every pass criterion, gate #10 stays held.

---

## 2. Scope and result

- **In scope:** read-only inspection and citation of existing Dixie boundary / route-side ingress / control-plane
  surfaces; a recorded evidence result (`PASS` / `PARTIAL` / `FAIL_CLOSED`) against the PR #203 pass / fail-closed
  criteria; a return artifact for later `loa-straylight intake`.
- **Result:** `PARTIAL` — Dixie-side boundary-hosting evidence is sufficient; cross-repo and production-wiring
  completeness is not.
- **Out of scope (and unchanged by this document):** any behavior, route handler, store, schema, migration, SQL, auth,
  consent, signer, or sibling-repo change. This is an inspect-and-cite-and-record lane only.

---

## 3. Upstream authorization context

(Cross-repo references are taken as given from the requesting handoff; they are **not verified locally** and not
touched. The gate doc at
[`docs/ADMISSION-WEDGE-ADR-022E-GATE-10-BOUNDARY-EVIDENCE-LANE-AUTHORIZATION-GATE.md:49`](docs/ADMISSION-WEDGE-ADR-022E-GATE-10-BOUNDARY-EVIDENCE-LANE-AUTHORIZATION-GATE.md)
marks cross-repo refs as not verified locally.)

- **Loa-Straylight Phase 48L (merged)** recorded gate #9 owner response `ACCEPT_RECORDED`, gate #10 owner response
  `ACCEPT_RECORDED`, and the #9 / #10 owner-response routing completion `RECORDED`. **No owner-response routing remains
  open.**
- **`loa-dixie` PR #203 (merged, commit `c67b6309`)** —
  [`ADMISSION-WEDGE-ADR-022E-GATE-10-BOUNDARY-EVIDENCE-LANE-AUTHORIZATION-GATE.md`](docs/ADMISSION-WEDGE-ADR-022E-GATE-10-BOUNDARY-EVIDENCE-LANE-AUTHORIZATION-GATE.md)
  — authorized this future, separate evidence lane and decomposed what it must prove (§7), under pass / fail-closed
  criteria P-1…P-6 (§8). **This document is that evidence lane.**
- **`loa-finn` PR #196 (merged)** recorded the actual gate #9 *runtime* evidence result as `PARTIAL`; gate #9 remains
  held. This document is the matching `loa-dixie` *boundary* evidence counterpart.
- **Gate anchors (ADR-022E, sibling repo).** Gate #9 = Finn runtime wiring (`ADR-022E:58`); gate #10 = **Dixie boundary wiring**
  (`ADR-022E:59`); gate #11 = Freeside-as-consumer (`ADR-022E:60`). This document concerns **only** gate #10.

---

## 4. Evidence question

> **Evidence question.** Can `loa-dixie` provide evidence, **under teammate review**, for the ADR-022E **gate #10**
> Dixie **boundary / route-side ingress / control-plane** responsibility that Loa-Straylight needs *before* the broader
> **MVP-2** Admission Wedge **D.1 / gate #8** chain can advance?

**Recorded answer: `PARTIAL`.** Dixie can provide *Dixie-side* evidence that it can carry the boundary responsibility
without semantic-ownership creep; it cannot provide end-to-end evidence from this repo alone, and the boundary is a
default-off spike rather than production wiring. Recording this result is not a discharge of any gate.

---

## 5. Method: read-only inspection

Surfaces were located with `git grep`, `grep`, `find`, `nl -ba`, and `sed -n`, then read with the file reader. Each
citation below was opened at the cited lines and confirmed to contain what is claimed. Line numbers are
`repo-relative file:line`. Independent adversarial verification re-opened every cited range and skeptically scanned for
overclaim (canonical-ownership, redefinition, receipt re-mint, leak, behavior change, host-selection,
`production adapter` proposal, implementation authorization); no such defect was found, and the remaining
incompleteness is the cross-repo / spike-only gap recorded in §10.

---

## 6. Implicated Dixie boundary / route-side ingress / control-plane surfaces

The candidate gate #10 responsibility is implicated by exactly these existing Dixie surfaces:

- **Route-side ingress boundary** — the dev/operator-only `POST /api/admission/intake` spike route and its conditional
  mount.
- **Public / private projection + no-leak serializer** — the structural public-response builder plus the runtime
  no-leak guard on the single send path.
- **Control-plane / endpoint-local reference records** — the bounded, non-durable admitted-assertion ledger and the
  Mode 1 / Mode 2 route-storage spike stores (off the production migration path).
- **Dixie ↔ Straylight relay surfaces** — the `straylight-host` identity-relay helpers and the `straylight-recall-intake`
  capability holder / bounded guardrail store that delegate execution to Straylight.
- **Blocked-state isolation** — the canonical migration runner and the SQL-token / import scope guards that keep
  production storage / migration / DB-write paths isolated and held.

---

## 7. Evidence table (repo-relative `file:line` citations)

| # | Surface | Citation (`file:line`) | What it shows | Role |
|---|---------|------------------------|---------------|------|
| 1 | Conditional mount + spike preamble | `app/src/server.ts:643-743` | Route mounted ONLY inside `if (config.admissionIntakeSpikeEnabled)` (`app/src/server.ts:655`); when off (default) the route is **not registered at all**; preamble (`app/src/server.ts:646-654`) states "NOT production admission" and authorizes no production storage/auth/consent, Freeside, schema, or completed primitive review. | enforces boundary |
| 2 | Base env gate | `app/src/config.ts:455` | `admissionIntakeSpikeEnabled = process.env.DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` — strict literal, fail-closed default. | enforces boundary |
| 3 | Mode 1 / Mode 2 storage gates (ANDed) | `app/src/config.ts:469-470`; `app/src/server.ts:678, app/src/server.ts:691-693` | Storage spike engages only when the base gate **AND** the storage gate (and, for Mode 2, a third gate + non-empty dir) are all `=== 'true'`; storage never activates merely because route intake is enabled. | enforces boundary |
| 4 | Route module header — import discipline | `app/src/routes/admission-intake.ts:1-21` | NON-PRODUCTION dev/operator spike; imports ONLY Dixie-local primitives + `hono`; performs **NO** `@loa/straylight` import and **NO** Freeside import. | context |
| 5 | Single send path + runtime no-leak guard | `app/src/routes/admission-intake.ts:279-302` | Every public response is deep-walked through the no-leak guard before serialization; a finding or throw collapses to a hardcoded fail-closed `500` fallback that is not re-guarded and carries none of the guard's findings. | public/private projection |
| 6 | `FORBIDDEN_PUBLIC_KEYS` block | `app/src/services/admission-wedge-spike/no-leak.ts:37-175` | A `Set` of exactly **114** exact key literals (`tenant_id` (`app/src/services/admission-wedge-spike/no-leak.ts:38`) … `auth_decision`/`authDecision` (`app/src/services/admission-wedge-spike/no-leak.ts:173-174`)) blocking canonical `TransitionReceipt` / `AuditEvent` / signer / consent / ref / hash / id key names (snake + camel) from the public surface; value-pattern walls at `app/src/services/admission-wedge-spike/no-leak.ts:178-218`. | public/private projection |
| 7 | Structural public-response builder | `app/src/services/admission-wedge-spike/public-response.ts:21-24, app/src/services/admission-wedge-spike/public-response.ts:104-116` | `public_receipt_ref` is the fixed synthetic literal `admission-spike-receipt-draft` — "NOT an operational id, NOT durable — Option A mints no durable receipt"; `draft_markers` are all literal `false` (`schema_final`, `straylight_primitive_review_complete`, `idempotency_final`, …). | preserves semantics |
| 8 | Dev/operator auth gate | `app/src/services/admission-wedge-spike/auth-gate.ts:1-21, app/src/services/admission-wedge-spike/auth-gate.ts:73-95` | Dedicated `x-admission-service-token` header (not `Authorization`), layered behind — not replacing — the global `/api/*` allowlist; "does NOT prove end-user/channel/tenant/surface authorization"; fail-closed when token AND allowlist both empty; constant-time compare. | enforces boundary |
| 9 | Pure classifier — held primitive review | `app/src/services/admission-wedge-spike/classifier.ts:73-74, app/src/services/admission-wedge-spike/classifier.ts:76-90` | Strict 5-scenario schema (extra keys rejected); carries unresolved primitive-review row markers `E,G,H,K,N,O` + review-dependent `J`, explicitly **not** resolved by the spike. | preserves semantics |
| 10 | Endpoint-local ledger — non-canonical | `app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts:1-50` | In-process, capacity-bounded, NON-DURABLE; "opens NO database connection … performs NO durable write and NO migration" (`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts:28-31`); "PRECEDENT, NOT REUSE … imports NOTHING from `straylight-recall-intake/` … inherits NO Recall semantics" (`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts:36-45`); deliberately named `-ledger`, not `-store`, to satisfy the scope guard (`app/src/services/admission-wedge-spike/admitted-assertion-ledger.ts:47-50`). | carries reference |
| 11 | Mode 2 durable store — private, off-wire | `app/src/services/admission-wedge-spike/route-storage-durable-spike.ts:61-65` | The on-disk snapshot is a PRIVATE dev/operator artifact, "NEVER serialized onto the wire — … the public no-leak 114-key parity is untouched." | carries reference |
| 12 | Refusal / outcome relay — verbatim | `app/src/services/straylight-host/refusal-passthrough.ts:1-99` | Every relay helper is an identity function on a `@loa/straylight/host` type: MUST NOT mutate, MUST NOT reclassify `denied`/`refused`/`not_found`, MUST NOT synthesise success; "Dixie does not redefine the wire surface." | preserves semantics |
| 13 | Intake-deny log — reference, not re-mint | `app/src/services/straylight-host/intake-deny-log.ts:20-35` | Imports `IntakeDenyEntry` / `IntakeDenyLog` type-only from `@loa/straylight/host`; carries `wedge_audit_event_ref` as a **reference** (`app/src/services/straylight-host/intake-deny-log.ts:32`) rather than re-creating a canonical `AuditEvent`. | carries reference |
| 14 | Recall execution delegated to Straylight | `app/src/routes/recall-intake.ts:418-428` | Dixie runs ingress validation only; recall **execution** is delegated to Straylight's `handleRecallIntake` via a single isolated `EstateStore` cast; capability is minted by Straylight (`app/src/services/straylight-recall-intake/capability-holder.ts:4, app/src/services/straylight-recall-intake/capability-holder.ts:18-22` — "never synthesise `{nonce,proof}`"). | preserves semantics |
| 15 | Guardrail store, not persistence adapter | `app/src/services/straylight-recall-intake/bounded-estate-store.ts:32-43, app/src/services/straylight-recall-intake/bounded-estate-store.ts:113-116` | Canonical `Assertion` / `AuditEvent` / `TransitionReceipt` / `RecallReceipt` / `EstateTransition` are **`import type` only** from `@loa/straylight`; the local store is "Intentionally NOT the full Straylight `EstateStore` API — this is a guardrail seam, not a persistence adapter." | preserves semantics |
| 16 | Canonical migration runner — single-dir | `app/src/db/migrate.ts:22-23, app/src/db/migrate.ts:76-85` | The production runner discovers `.sql` from exactly one `migrations/` directory; `git grep` confirms it discovers **no** `aw_*` table. | blocked state |
| 17 | `aw_*` schema — reference-only, isolated | `app/src/services/admission-wedge-spike/aw-sql-isolation-spike/sql/0001_aw_isolation_spike_init.sql:49-62` | Every ref column is `VARCHAR(80)` with a `CHECK (… ~ '^awref:<kind>:…')` constraint (opaque `awref:` references, never canonical ids), and the file lives **outside** the production `migrations/` dir. | blocked state |
| 18 | Scope guards — production-write isolation | `app/tests/unit/admission-wedge-spike/scope-guards.test.ts:122-198` | A durable-write SQL-token denylist (`INSERT`/`UPDATE`/`DELETE`/`CREATE TABLE`/…/`migrate`) plus a forbidden-import scan (`pg`, `/db/(client|pool|migrate|transaction)`, `/db/migrations/`, `-store`, `@loa/straylight`, Freeside) keep the spike tree off every production write/DB/migration path. | blocked state |

---

## 8. Boundary responsibility analysis

The cited surfaces show, **on the Dixie side**, that `loa-dixie` can host the gate #10 boundary responsibility as an
ingress / reference / control-plane boundary — a `StorageAdapter`-shaped swap-in, never a parallel canonical lifecycle:

- **Ingress, fail-closed, default-off.** The only runtime entry is a conditional mount (#1–#3) that registers nothing
  unless explicit env gates are `=== 'true'`. The handler validates, authorizes (#8), bounds, classifies (#9), and
  fails closed at every step (`app/src/routes/admission-intake.ts:304-451`). This is route-side ingress wiring, not a lifecycle owner.
- **Reference, not minting.** `public_receipt_ref` is a fixed synthetic non-durable placeholder (#7); the host-side
  deny log carries `wedge_audit_event_ref` as a reference (#13); the durable store's snapshot is private and never on
  the wire (#11). Dixie **carries** references; it mints no durable / canonical receipt.
- **Control-plane only.** The auth gate is a dev/operator control-plane gate layered behind the global allowlist (#8),
  explicitly not end-user / production authority. The audit-event shape is a Dixie-local, public-safe-only log record
  (`app/src/routes/admission-intake.ts:51-72`), deliberately distinct from any canonical `AuditEvent`.
- **No parallel canonical lifecycle.** The endpoint-local ledger is non-durable, opens no DB, and reuses no Recall code
  or schema (#10); the only `aw_*` schema stores bounded opaque `awref:` references, isolated from the production
  runner (#16–#17); scope guards keep the spike off every production write path (#18).

This supports "Dixie **can** carry the boundary responsibility." It does **not** establish a production boundary, because
none exists by design — the surface is a default-off spike and gate #8 remains held.

---

## 9. Dixie-vs-Straylight semantic-boundary analysis

Carried verbatim-in-substance from the merged chain (46M §6.4 / 46N §3 / 47T §9 / PR #202 §5 / PR #203 §9):

- **Straylight defines** the canonical `Assertion`, the first-class `TransitionReceipt`, the append-only hash-chained
  `AuditEvent`, governed recall / admission semantics, and estate-force transitions. **Straylight remains the canonical
  semantic owner.**
- **Dixie carries** boundary / ingress / reference / control-plane records for what **Straylight defines** — and
  nothing more.

The Dixie-side evidence for non-ownership is strong and `file:line`-grounded:

- **Zero local canonical definitions.** `git grep -nE '(interface|type|class)\s+(Assertion|TransitionReceipt|AuditEvent|RecallReceipt|EstateTransition)' -- app/src` returns **nothing** (exit 1). Every appearance of these primitives is an `import type` from `@loa/straylight` (#15) or `@loa/straylight/host`.
- **Execution / minting stays with Straylight.** The only `@loa/straylight` value imports are Straylight-owned
  execution / minting via the recall-intake subpath — `handleRecallIntake` (#14) and `createDixieCapability`
  (`app/src/services/straylight-recall-intake/capability-holder.ts:18-22`, "never synthesise `{nonce,proof}`").
- **Relay, not redefinition.** Refusals / outcomes are relayed verbatim (#12); the spike tree imports **no**
  `@loa/straylight` or Freeside at all (#18); `draft_markers` hardcode `straylight_primitive_review_complete = false`
  (#7) and the held primitive-review rows are carried, not resolved (#9).

One bounded nuance (a populated value, **not** a redefinition): `bounded-estate-store.ts` fabricates a deterministic
`chainLink` for an `AuditEvent`-shaped value inside the non-durable seeded guardrail seam ("event_hash is computed by
Straylight in the real adapter"). The type stays type-only and the value is never persisted or surfaced publicly, so it
populates rather than redefines and does **not** make Dixie the `canonical semantic owner`.

**Conclusion.** Dixie does not redefine Straylight estate semantics and re-mints no canonical receipt — **on the Dixie
side**. The complementary claim that Dixie's references *align with what Straylight defines* depends on the upstream
canonical definitions and the `ADR-022E:59` anchor, which are **not citable from this checkout** (§10). That is why the
semantic-boundary conclusion is supportive but not end-to-end complete.

---

## 10. Pass / partial / fail-closed assessment

Assessed against the PR #203 §8 criteria (P-1…P-6), demonstrated by read-only citation:

| Criterion | Status | Basis |
|-----------|--------|-------|
| **P-1** implicated surface named with `file:line` precision | **met** | §6–§7; mount at `app/src/server.ts:655`, route at `app/src/server.ts:731-742`. |
| **P-2** Dixie can host the boundary as ingress / reference / control-plane; **Dixie carries** for **Straylight defines**; no parallel canonical lifecycle | **partial** | Dixie side met (#1–#3, #5–#8, #10–#14, #16–#18); the "for what Straylight defines" alignment is cross-repo and not locally citable. |
| **P-3** no redefinition of Straylight estate semantics; no canonical receipt re-mint | **met** | Zero local canonical definitions (`git grep` exit 1); type-only imports (#15); minting delegated (#14); `draft_markers` false (#7). |
| **P-4** boundary leaks no raw / private / audit / debug / source / auth / signer / consent / storage material (`FORBIDDEN_PUBLIC_KEYS` parity preserved) | **met** | 114-key block (#6) on the single send path (#5); structural public builder (#7); durable snapshot off-wire (#11). |
| **P-5** no behavior introduced; no prior narrow lane widened | **met** | This is a read-only citation pass; it adds, modifies, stages, or commits no behavior; scope guards remain unweakened (#18). |
| **P-6** a return artifact assembled in the form `loa-straylight` can intake | **met** | §12. |

**Why `PARTIAL` and not `PASS`.** Five of six criteria are met; P-2 is partial because the end-to-end boundary contract
has a Straylight-side half (canonical definitions + the `ADR-022E:59` anchor) that this lane cannot cite from
`loa-dixie`, and because the boundary is a default-off spike rather than production wiring. Under the rule that `PASS`
requires the cited evidence to *fully* support the required boundary responsibility without semantic-ownership creep,
the honest result is `PARTIAL`: the surfaces exist and the Dixie-side evidence is strong, but the evidence is
incomplete for an end-to-end determination.

**Why not `FAIL_CLOSED`.** No fail-closed trigger fired: no pass criterion is wholly unmet; the evidence does not imply
Dixie is the `canonical semantic owner`; it redefines no Straylight semantics and re-mints no canonical receipt; it
leaks no canonical / private material; it modifies no behavior and widens no prior narrow lane; and it attempts no
`canonical-store physical host` selection, no `production adapter` proposal, and no implementation / production
authorization.

---

## 11. Preserved blocked state

This document records evidence only. Every held / unresolved / unstarted / open state is preserved exactly:

- It **does not satisfy ADR-022E:59** by itself.
- It **does not satisfy gate #10** by itself — the result is `PARTIAL`, so **gate #10 remains held**; even a `PASS`
  would leave final posture for later `loa-straylight intake`.
- It **does not discharge gate #8** — gate #8 remains held (cleared only as a docs / architecture / handoff
  prerequisite; the operative Straylight-side discharge stays held).
- It **does not satisfy D.1** — D.1(ii), the canonical-store physical-host conjunct, remains unresolved, so D.1 remains
  not yet satisfied.
- It **does not start D.2** — D.2 remains not started, downstream of full D.1.
- It does not close **MVP-2** — MVP-2 remains open.
- It selects no **canonical-store physical host**; it proposes no **production adapter**.
- It authorizes no implementation, no production wiring, and no source / test / runtime / config / package / CI /
  schema / migration / SQL / DB-write change.
- It **does not make Dixie the canonical semantic owner** of `Assertion`, `TransitionReceipt`, `AuditEvent`, governed
  recall / admission semantics, or estate-force transitions.

---

## 12. Return artifact for `loa-straylight`

A docs-only return artifact for later `loa-straylight intake`. As with the gate #10 owner-response (which Phase 48L
intook as `ACCEPT_RECORDED`), any later intake of this *evidence* is `loa-straylight`'s own act in its own repo; this
PR makes no change to `loa-straylight` and asserts no authority over it.

```yaml
artifact: adr-022e-gate-10-dixie-boundary-evidence-result
repo: loa-dixie
branch: straylight-gate10-boundary-evidence-result
authorized_by: loa-dixie PR #203 (ADR-022E gate #10 boundary-evidence-lane authorization)
evidence_question: >-
  Can loa-dixie provide evidence, under teammate review, for the ADR-022E gate #10 Dixie
  boundary / route-side ingress / control-plane responsibility Loa-Straylight needs before
  the broader MVP-2 Admission Wedge D.1 / gate #8 chain can advance?
result: PARTIAL
criteria:
  P-1_implicated_surface: met
  P-2_boundary_without_ownership: partial   # Dixie side met; cross-repo "what Straylight defines" not locally citable
  P-3_no_redefinition_no_remint: met
  P-4_no_leak_114_key_parity: met
  P-5_no_behavior_no_widening: met
  P-6_return_artifact: met
strongest_citations:
  - app/src/server.ts:643-743            # default-off conditional mount + spike preamble
  - app/src/config.ts:455, app/src/config.ts:469-470        # strict === 'true' env gates, fail-closed
  - app/src/services/admission-wedge-spike/no-leak.ts:37-175   # 114-key FORBIDDEN_PUBLIC_KEYS block
  - app/src/routes/admission-intake.ts:279-302                 # single send path + runtime no-leak guard
  - app/src/services/admission-wedge-spike/public-response.ts:21-24, app/src/services/admission-wedge-spike/public-response.ts:104-116  # synthetic non-durable receipt, draft_markers false
  - app/src/services/straylight-host/refusal-passthrough.ts:1-99            # verbatim relay, no redefinition
  - app/src/routes/recall-intake.ts:418-428                    # recall execution delegated to Straylight
  - app/src/services/straylight-recall-intake/bounded-estate-store.ts:32-43, app/src/services/straylight-recall-intake/bounded-estate-store.ts:113-116  # type-only canonical imports; guardrail, not adapter
  - app/src/db/migrate.ts:76-85                                # production runner discovers no aw_*
  - app/src/services/admission-wedge-spike/aw-sql-isolation-spike/sql/0001_aw_isolation_spike_init.sql:49-62  # awref-only refs, isolated
  - app/tests/unit/admission-wedge-spike/scope-guards.test.ts:122-198       # SQL-token + import scope guards
local_negative_search:
  canonical_type_definitions_in_app_src: 0   # git grep interface/type/class Assertion|TransitionReceipt|AuditEvent|RecallReceipt|EstateTransition => exit 1
gaps:
  - ADR-022E:59 anchor lives in sibling loa-straylight repo; not citable from this checkout.
  - Upstream canonical primitive DEFINITIONS not inspected (lane scoped to app/src).
  - Boundary is a default-off dev/operator spike — "Dixie CAN carry," not "carries in production."
  - Runtime/integration behavior not executed (read-only inspection only).
preserved_blocked_state:
  gate_8: held
  gate_10: held
  d1_ii_canonical_store_physical_host: unresolved
  d1: not_satisfied
  d2: not_started
  mvp2: open
non_claims:
  - does not satisfy ADR-022E:59
  - does not satisfy gate #10
  - does not discharge gate #8
  - does not satisfy D.1
  - does not start D.2
  - does not close MVP-2
  - selects no canonical-store physical host
  - proposes no production adapter
  - authorizes no implementation
  - does not make Dixie the canonical semantic owner
return_path: loa-straylight may later intake this artifact and decide whether the gate #10 boundary evidence is sufficient.
```

A future positive `loa-straylight intake` would let `loa-straylight` record that the gate #10 boundary evidence was
received; it would **not** by itself satisfy `ADR-022E:59`, satisfy gate #10, discharge gate #8, satisfy D.1, start D.2,
select a `canonical-store physical host`, propose a `production adapter`, or close MVP-2.

---

## 13. Selected next step

- **`loa-straylight` intake decision.** The next step is `loa-straylight`'s own act: review this `PARTIAL` evidence and
  decide its own posture / intake. This document asserts no authority over that decision and changes nothing in
  `loa-straylight`.
- **What would move gate #10 toward `PASS`.** Closing the P-2 cross-repo gap — binding the Dixie-side references to the
  authoritative `ADR-022E:59` anchor and the upstream canonical `Assertion` / `TransitionReceipt` / `AuditEvent`
  definitions — and, downstream and separately, the operative gate-#8 discharge and the D.1(ii) canonical-store
  host-selection lane. Each is owned and sequenced outside this lane.
- **Behavior stays forbidden.** Production boundary wiring — route / API, storage, DB, migration, auth, consent, signer,
  Freeside / Finn / Straylight integration — stays forbidden until a *separate, still-later* implementation
  authorization gate opens it. This document opens nothing.
