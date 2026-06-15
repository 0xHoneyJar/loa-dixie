# Phase 46C — Admission Wedge Storage/Auth/Consent Blocker Decomposition Gate

> **Phase**: 46C
> **Branch context**: `phase-46c-admission-storage-auth-consent-decomposition`
> **Related**: Phase 46B route-contract implementation-readiness decomposition
> (PR #147); Phase 46A route-vector alignment acceptance (PR #146); Phase 33Z
> route-vector alignment (PR #144) + its PR #145 next-lane label/provenance
> correction; Phase 33Y route-contract revision acceptance (PR #143); Phase 33X
> route-contract revision draft (PR #142); Phase 33W route-contract readiness
> update (PR #141); Phase 33V storage/auth/consent design finalization (PR #140);
> Phase 33U Straylight-response intake (PR #139); Phase 33K storage/auth/consent
> precondition design; Straylight (`@loa/straylight`) PR #65 (A–O primitive-review
> verdicts, **merged**); ADR-022E durable-store gate #8 (and related gates #10 /
> #12 / #20), **held**; ADR-026C / ADR-026D route guardrails; freeside-characters
> Phase 45J / PR #177 (Dixie v1 mirror-refresh acceptance, merged 2026-06-06).
> **Status**: **docs / decision-only.** No source, test, route, route handler,
> storage, store code, DB write, migration, auth, consent, **route-vector JSON**,
> **route-vector validator**, **Phase 33E fixture / fixture validator**, config,
> env, package, lockfile, CI, generated, or live-integration change. No adjacent
> repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is a storage/auth/consent blocker-decomposition gate, not implementation.**
> It decomposes the still-held storage, auth, and consent blockers — together with
> the public/private boundary they share — into ordered, separately-clearable
> sub-gates before any Admission Wedge route / API implementation or any
> implementation-spike readiness checklist can be authorized. It does **not**
> implement storage, **not** implement auth, **not** implement consent, **not**
> implement a route / API handler, **not** freeze the final route contract, **not**
> freeze the final schema, and **not** declare production readiness.

Every assessment below is grounded read-only against the actual Dixie repo (the
Phase 33K precondition design, the Phase 33U / 33V / 33W / 33X chain, the Phase 46A
acceptance gate, the Phase 46B decomposition gate, the five route-vector JSONs, the
route-vector validator and its README, the Phase 33N/33P/33Q spike source under
`app/src/services/admission-wedge-spike/` and `app/src/routes/admission-intake.ts`,
and the dev runbooks under `docs/admission-wedge/`) and against the Straylight
(`@loa/straylight`) PR #65 verdicts as already reconciled by Dixie Phase 33U. Where
a claim could not be grounded inside the read material, it is marked as such.

---

## 1. Status and scope

Phase 46C is the bounded **storage/auth/consent blocker-decomposition gate** that
follows, and is named by, Phase 46B
([`ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
§6 / §7, PR #147). Phase 46B ranked the candidate next lanes, judged the
**storage/auth/consent cluster** the upstream dependency for every downstream lane
(contract freeze, spike checklist, Freeside handoff), and **selected Phase 46C —
Admission Wedge storage/auth/consent blocker decomposition gate (docs / decision-only;
not runtime)** as the next safe lane. Phase 46C executes exactly that charter: it
decomposes the held storage, auth, consent, and public/private blockers into ordered
sub-gates with per-area exit criteria, decides what must be true before any
implementation, and stops.

Phase 46C:

- is **docs / decision-only** — it decomposes the storage/auth/consent blockers
  after Phase 46B and orders them into separately-clearable sub-gates;
- **does not implement storage** — no durable store, schema, table, migration, or
  storage write;
- **does not implement auth** — no service-auth, signer/authority, or identity
  binding code;
- **does not implement consent** — no consent proof, receipt, or revocation code;
- **does not implement a route / API handler** (the Phase 33N dev/operator-only,
  disabled-by-default spike remains the only authorized route surface);
- **does not modify** runtime source, the route-vector JSONs, the route-vector
  validator, the Phase 33E fixtures, the Phase 33E fixture validator, validators of
  any kind, vectors, package exports, config / env, CI, migrations, generated files,
  or any adjacent repository (`loa-straylight`, `freeside-characters`);
- **does not freeze** the final route contract;
- **does not freeze** the final / canonical / production schema;
- **does not declare** production readiness of any kind.

> **A decomposition gate authorizes no runtime work.** Phase 46C makes the held
> storage / auth / consent / public-private blockers legible and orderable; it
> clears **no** gate. It does not clear ADR-022E durable-store gate #8 (or the
> related held gates #10 / #12 / #20). Decomposing a blocker is not the same as
> clearing it: a later, separately-gated phase must clear each sub-gate on its own
> evidence. Phase 46C's only output is this decision/status document; no
> cross-reference status note in another file was required (see §12) — matching the
> Phase 46B precedent of a single self-contained gate document.

---

## 2. Source chain

This gate sits one rung above the Phase 46B implementation-readiness decomposition
gate on the Dixie route-contract ladder. It introduces no new contract or vector
material; it decomposes the storage/auth/consent cluster Phase 46B isolated as the
upstream dependency, drawing the underlying record shapes and options from the Phase
33K precondition design and the Phase 33V finalization.

### Dixie (loa-dixie) — the storage/auth/consent and route-contract lanes

| Phase | PR | Artifact / contribution (relevant to storage/auth/consent decomposition) |
|-------|----|------|
| 33K | — | **Storage/auth/consent precondition design.** Drafted the eleven storage record categories (§6.1–§6.11), the four service-auth options A/B/C/D (§9), the four end-user consent options A/B/C/D (§10), the idempotency precondition (§8), the no-leak public/private preconditions (§13), the threat model (§14), and the exit criteria (§15). Treated the Straylight A–O answers as exit criteria; froze nothing. |
| 33U | #139 | **Straylight-response intake.** Reconciled `@loa/straylight` PR #65's A–O verdicts: A, B, D, E, H, I, K, L, M, N accepted/delegated as vocabulary; C re-related (`assertion_superseded` dropped → `assertion_linked` + `superseded` via `supersedes_refs`); E/H/J/K **delegated to Dixie**; rows **F (production authority), G (production binding), J (final endpoint keying), O (durable store under ADR-022E gate #8) still held**. Cleared no independent production gate. |
| 33V | #140 | **Storage/auth/consent design finalization.** Adopted `public_receipt_ref`, retired `receipt_public_ref`; split `SyntheticAuditRecord` → `AuditEvent` + `TransitionReceipt`; drew the private/public projection boundary on `privacy_scope` + environment-frame disposition (denylist = defense-in-depth); restated "service auth ≠ end-user consent"; kept ADR-022E gate #8 **held** and migration/backfill/rollback **undesigned**. |
| 33W | #141 | **Route-contract readiness update.** Rendered the contract "more ready than 33H but NOT final/frozen, NOT implementation-ready"; defined the draft-update checklist 33X executed; kept endpoint idempotency Dixie-owned and atomicity/rollback a design requirement, not implemented. |
| 33X | #142 | **Route-contract revision draft.** Standardized the public envelope on `public_receipt_ref` (`null` where none minted); marked endpoint idempotency **Dixie-owned**; adopted the two-part `category.specific_reason` refusal taxonomy; rejected a public `admission.duplicate_replay` code; corrected the 33N spike auth layering (admission header is defense-in-depth **on top of** the global `/api/*` gate, not a replacement); `route_contract_final: false`. |
| 33Y | #143 | **Route-contract revision acceptance.** Accepted 33X as a **draft baseline** (not final / frozen, not production-ready); decided vector-readiness = ready; selected Phase 33Z. Mutated no vector / validator. |
| 33Z | #144 | **Route-vector alignment.** Replaced `public_receipt_ref_policy` with `public_receipt_ref` across the five vectors; strengthened the validator (retired-key lock, exact `safe_reason_code`, private-shape no-leak); added the `--self-check` negative-mutation harness; left the Phase 33E fixtures untouched; stayed non-runtime. |
| 33Z (corr.) | #145 | **Next-lane label/provenance correction.** Corrected the 33Z next-lane label from **Phase 34A** to **Phase 46A** because `34A` collides with the completed stack-wide Freeside Characters Phase 34A / PR #100. Label/provenance only — no vector / validator alignment change, no runtime authorized, no accepted scope reopened. |
| 46A | #146 | **Route-vector alignment acceptance.** Accepted the 33Z alignment + PR #145 correction as a bounded, non-runtime vector / validator alignment; recorded what 33Z proved and did not prove; **did not** accept implementation readiness; selected Phase 46B. |
| 46B | #147 | **Route-contract implementation-readiness decomposition.** Decomposed what remains before any route / API implementation; ranked candidate lanes; judged the storage/auth/consent cluster the upstream dependency; **selected this Phase 46C storage/auth/consent blocker decomposition gate**. Mutated no vector / validator / fixture / source. |
| **46C** | *(this doc)* | **Storage/auth/consent blocker decomposition gate.** Decomposes the held storage, auth, consent, and shared public/private blockers into ordered, separately-clearable sub-gates (§4), orders their dependencies (§5), ranks the candidate next lanes (§6), and selects the next safe direction (§7). Mutates no vector / validator / fixture / source. |

> **PR-number provenance note.** The PR numbers above are taken from the local git
> merge-commit history (`docs: … (#NNN)` subjects) and the Phase 46A / 46B
> source-chain tables. Phase 46B's `#147` is the merge commit
> `fc324f28 "docs: decompose admission route implementation readiness (#147)"`.
> Treat the PR numbers as git-sourced rather than as authority embedded in the gate
> bodies (each gate refers to itself only as "this doc").

### Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts.** Straylight
  answered the Dixie primitive-review request across rows A–O; **Dixie Phase 33U
  reconciled** it
  ([`ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  §4). PR #65 clarified the *vocabulary / design* only; it **cleared no independent
  production gate** and authorized **no** Dixie runtime, production storage / auth /
  consent, or Freeside integration. The still-held rows that gate this
  decomposition are **F (production authority), G (production identity binding), J
  (final endpoint idempotency keying), and O (durable store under ADR-022E gate
  #8)** (33U §4).
- **ADR-022E gates (Straylight-repo decision records), held.** Gate **#8**
  (production persistence) governs any durable admission store; the related gates
  **#10** (broad Dixie boundary wiring), **#12** (new network surface), and **#20**
  (threat-model widening) are likewise **held** and not cleared by PR #65 (33U §3.1).
- **Residual legacy marker prose.** The pre-correction `[E,G,H,K,N,O]` / `[J]`
  marker arrays still present in some vector JSONs, the route-vector validator
  comments, and the Phase 33N classifier comments are **legacy textual debt only,
  not the current review-state authority**; the authoritative classification lives
  in the route-vector README current-state correction
  ([`docs/admission-wedge/route-contract-test-vectors/README.md:154-158`](admission-wedge/route-contract-test-vectors/README.md)).
  Phase 46C preserves that distinction and mutates no technical artifact.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the
> freeside-characters 34-/45-series, and Straylight's ADR / PR labels are
> independent labels in separate repositories and must not be conflated. The Dixie
> `46A` / `46B` / `46C` continuation past the exhausted `33` single-letter suffix
> space avoids reusing the completed Freeside Characters Phase 34A / PR #100; `46C`
> signals **no** new product epoch and **no** scope expansion — it is the same
> Admission Wedge arc, still docs/decision-only.

---

## 3. Starting accepted facts

These are the facts **already accepted** by the chain (Phase 33Z / 46A / 46B and the
33K → 33V design lanes), re-verified here read-only as the baseline the §4
decomposition is measured against. None is changed by this gate.

1. **Phase 33Z / 46A / 46B accept only bounded, non-runtime vector/validator
   readiness.** 46A accepted the 33Z alignment as a *test-artifact* alignment to the
   33X / 33Y draft baseline, explicitly **not** as runtime-implementation readiness,
   a final route contract, a schema freeze, or production readiness
   ([46A §3](ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-ACCEPTANCE-GATE.md)); 46B did the
   same and decomposed rather than built (46B §3, §6).
2. **`public_receipt_ref` is aligned in the route vectors.** The vector-only
   `public_receipt_ref_policy` abstraction was collapsed to the source-real
   `public_receipt_ref` across all five vectors: `null` for pending / malformed
   ([`candidate-pending-not-recallable.json:43`](admission-wedge/route-contract-test-vectors/candidate-pending-not-recallable.json),
   `malformed-or-unsafe-payload-fail-closed.json:43`), and the public-safe draft
   string `"public_safe_receipt_reference_draft"` for accept / reject / supersede
   ([`accept-candidate-to-admitted-assertion.json:43`](admission-wedge/route-contract-test-vectors/accept-candidate-to-admitted-assertion.json)).
   It remains an explicitly **draft, non-final** field; the public schema is not
   frozen.
3. **Exactly five route vectors remain.** The no-sixth-vector guard stands — the
   validator's `REQUIRED` map has exactly five `scenario_id → filename` entries,
   frozen-by-count
   ([`validate-route-contract-test-vectors.mjs:98-104`, `686-687`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs)).
4. **The validator `--self-check` exists and passes fail-closed.** Five targeted
   negative mutations (nested `public_receipt_ref_policy`; omitted `safe_reason_code`
   on a `null`-code scenario; public `transition_receipt`; public
   `audit_event_class`; private `receipt_ref` on the public surface) are each
   rejected (5/5 fail closed)
   ([`validate-route-contract-test-vectors.mjs:777-820`, `864-872`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs)).
5. **Phase 33E fixtures remain untouched and the fixture spelling debt is separately
   gated.** 33Z left the Phase 33E fixtures and their validator unmodified; the
   `receipt_public_ref` vs `public_receipt_ref` two-spelling reconciliation on the
   fixture side is documented, deferred, and out of scope (46A §3 / §4).
6. **Straylight PR #65 / Dixie 33U answered and reconciled A–O.** PR #65 answered the
   fifteen primitive-review rows; Dixie 33U dispositioned each (accepted / re-related
   / delegated / held) (33U §4). The review is *answered*, not a missing artifact.
7. **The old marker arrays are legacy vector/runtime markers, not the current
   unresolved review-state.** `EXPECTED_UNRESOLVED_ROWS = [E,G,H,K,N,O]` and
   `EXPECTED_REVIEW_DEPENDENT_ROWS = [J]` are validator-enforced as *preserved
   legacy markers*
   ([`validate-route-contract-test-vectors.mjs:113-114`](admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs);
   [`README.md:154-158`](admission-wedge/route-contract-test-vectors/README.md)).
   `straylight_primitive_review_complete` stays `false` because the **independent
   production gates** remain held, not because the Straylight answer is missing
   (46A §3).
8. **Dixie production Admission Wedge persistence binding remains undesigned,
   unauthorized, and not production-ready.** No durable admission store, schema,
   table, or migration exists; ADR-022E gate #8 is **held**; the synthetic ledger
   does not satisfy it (33U §3.5, [33V §4](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)).
9. **Phase 33N has a bounded, non-production public-response builder and a guarded
   send path, but the final production serializer and durable private/audit boundary
   remain unbuilt.** `buildAdmissionSpikePublicResponse`
   ([`public-response.ts:9`](../app/src/services/admission-wedge-spike/public-response.ts))
   builds the body structurally from the classification plus fixed synthetic
   placeholders; `sendPublicResponse` is the single send path that deep-walks every
   response through the no-leak guard
   ([`admission-intake.ts:255`](../app/src/routes/admission-intake.ts)). The canonical
   production serializer (enforcing `privacy_scope` + frame disposition) and the
   durable private `TransitionReceipt` / `AuditEvent` boundary remain undesigned
   (33X §11; 33V §4).
10. **Phase 33M/33N provide spike-scoped default-off / fail-closed posture, but
    production rollback, durable-store recovery, migration/backfill, and production
    deployment controls remain open.** The route mounts only when
    `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`
    ([`admission-intake.ts:16`](../app/src/routes/admission-intake.ts)); it uses
    Storage Option A (no durable store, no DB writes, no migrations — rollback is
    trivial because there is no durable state,
    [`admission-intake.ts:6`](../app/src/routes/admission-intake.ts)); the Phase 33Q
    ledger is process-local, non-durable, test-seam-only, and adds no env flag
    ([`PHASE-33Q-DEV-STORE-RUNBOOK.md:21-28`, `92-94`](admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md)).
    Production rollback / recovery / migration / backfill stay undesigned (33V §4).

> **What "accepted facts" do and do not mean.** These are **test-artifact,
> design-vocabulary, and spike-posture** facts against a **draft** baseline. They do
> not constitute an accepted route contract, a frozen schema, a runtime serializer,
> a durable store, or any cleared production gate. The §4 decomposition exists
> precisely because the accepted readiness is bounded to the test / design / spike
> surface.

---

## 4. Storage/auth/consent blocker decomposition

The tables below decompose the held blockers into separately-clearable areas. For
each area: the **current in-repo evidence**, the **unresolved production question**,
the **decision required before any implementation**, and the **gating condition
("implementation must not start until")**. **Phase 46C closes none of these rows — it
orders them.** Where the read material yielded no in-repo design for an area, the row
says so explicitly. The four clusters share one through-line: **storage ↔ idempotency
↔ rollback**, **auth ↔ consent ↔ identity binding**, and **all ↔ the public/private
no-leak boundary** — which is why §5 orders them as a single cluster, not four
independent lanes.

### 4.1 Storage

| Blocker area | Current evidence | Unresolved production question | Required decision before implementation | Implementation must not start until |
|---|---|---|---|---|
| **Durable store architecture** | Only the in-process non-durable `BoundedEstateStore` (Recall) and the Phase 33Q synthetic, process-local, Map-backed ledger exist; no durable admission store (33K §4; `admitted-assertion-ledger.ts:28`). | What durable substrate (if any) persists admission material, and what its consistency / availability / capacity model is. | Whether a durable admission store is built at all, and its architecture (substrate, keys, indexes). | The durable-store architecture is decided and the ADR-022E gate-clearing ADR lands. |
| **ADR-022E durable-store gate #8** | 33K / 33U / 33V mark the durable store **held behind ADR-022E gate #8**; the synthetic ledger does not satisfy it; related gates #10 / #12 / #20 also held (33U §3.1, §3.5). | Whether ADR-022E gate #8 can be cleared, by what evidence, and which Straylight ADR-022D receipt/audit-chain invariants a clearing ADR must preserve. | Whether to author a gate-clearing ADR, and what it must prove. | A separate gate-clearing ADR satisfies ADR-022E gate #8 (and #10 / #12 / #20 as applicable). |
| **Admitted-assertion persistence** | Canonical `active` `Assertion` (Straylight substrate); "admitted" is a public `outcome_class`, never a status; Dixie holds ingress refs only (33K §6.3; 33V §4; 33U Row B). | Where and how admitted assertions are durably persisted, keyed, and read back; how the `active` status and `supersedes_refs` are stored. | The durable admitted-assertion persistence model and its key / supersession columns. | The durable store + ADR-022E gate clear (gated by both rows above). |
| **Candidate / proposed material persistence** | Candidate record is a private/admission-bound Dixie ingress object; raw payload never public; no record type has a payload field; raw/unsafe input fails closed with zero residue (33K §6.1; `PHASE-33Q-DEV-STORE-RUNBOOK.md:98`). | Whether candidate / proposed material is persisted at all, with what retention, sanitization, and privacy controls. | The candidate persistence + retention + sanitization policy. | The candidate retention / sanitization policy is decided alongside the durable store. |
| **TransitionReceipt persistence** | Receipt half maps to `TransitionReceipt` (kinds incl. `admission`/`denied`), private, never serialized to the caller; only a separate `public_receipt_ref` projection may be public (33U Row H; 33V §4; 33X §11). | What durable substrate persists the private `TransitionReceipt`, and how the public/private boundary is enforced at write time. | The `TransitionReceipt` persistence model and its write-time projection boundary. | The durable store + no-leak serializer decisions land (gated by the durable-store and public/private rows). |
| **AuditEvent persistence** | Audit half maps to `AuditEvent` (append-only, hash-chained); Straylight storage adapters expose `appendAuditEvent`, `listAuditEvents`, and `getAuditTail`, and `AuditLog` uses that storage-adapter path; private / controlled-access; `audit_receipt` is not a Straylight term and stays off the public surface (33K §6.7; 33U §3.6; 33V §4). | Dixie's production Admission Wedge persistence binding for private `TransitionReceipt` / `AuditEvent` material — what durable append-only, hash-chained substrate persists `AuditEvent`, and how controlled access and retention are enforced — not whether Straylight has AuditLog / storage-adapter precedent (it does). | The durable `AuditEvent` persistence + access-control + retention model. | The durable store + ADR-022E gate clear (preserving ADR-022D hash-chain invariants). |
| **Public receipt reference persistence** | `public_receipt_ref` is the single public-safe reference (Straylight-recommended, Dixie-adopted; `receipt_public_ref` retired); `null` where none minted; spike mints a fixed synthetic placeholder, not a durable receipt (33V §3/§4; `public-response.ts:21`). | Whether / how a public receipt reference is durably minted and resolvable without leaking operational ids. | The public-receipt-reference minting + resolution model (or a decision not to mint one). | The receipt/audit persistence + serializer decisions land; the field stays draft until then. |
| **Idempotency / replay ledger persistence** | Idempotency is **Dixie/endpoint-owned** (absent from Straylight); key scope sketched as tenant/estate/subject/transition-intent; identical retry → same result, conflicting retry → fail closed; no substrate de-dup; `idempotency_final: false` (33K §6.8 / §8; 33U Row J / §3.2; 33X §6). | The final idempotency key (candidate-id vs header vs both), the replay envelope, the conflict response, and the durable backing of the replay ledger. | The final idempotency keying + replay/conflict semantics + ledger backing — Dixie-owned, route-contract-bound. | The route-contract idempotency decision and the durable-store decision both land. |
| **Rollback / recovery / migration / backfill** | Multi-step admission must be atomic (design requirement, not implemented); rollback / backfill / forward-only migration are **undesigned**; the spike has no durable state to roll back (33W §3; 33V §4; `admission-intake.ts:342`). | The atomicity / partial-failure / rollback plan, the recovery model, and the forward-only migration + backfill plan for any durable admission schema. | The rollback / recovery / migration / backfill design (a required input to the durable-store ADR). | The durable-store ADR includes a rollback / recovery / migration / backfill plan. |
| **Tenant isolation & cross-tenant protection** | `tenant_id` is Dixie host-layer (not a Straylight primitive), session-derived, fail-closed when unresolved; the ledger's `(tenant_id, estate_id)` scope is a **spike isolation mechanism, not final semantics**; foreign-tenant read → empty, foreign-tenant write → `foreign_tenant` throw (33K §11; 33V §4; `admitted-assertion-ledger.ts:712`). | The production tenant / estate isolation model and the cross-tenant protection guarantee at the durable layer. | The production tenant-isolation + cross-tenant-protection semantics (beyond spike isolation). | The production identity-binding decision (§4.2) and the durable-store decision land. |
| **Deletion / forgetting / revocation (durable)** | Forget / revoke / correction storage and UI are **not designed** and stay a blocked, separately-gated lane (33K §20; 33V §9). | How a durable store supports deletion / forgetting / revocation while preserving the append-only audit chain. | Whether and how durable deletion / forgetting / revocation is modelled against an append-only audit substrate. | A dedicated forget / revoke / correction design gate lands (downstream of the durable store). |

### 4.2 Auth

| Blocker area | Current evidence | Unresolved production question | Required decision before implementation | Implementation must not start until |
|---|---|---|---|---|
| **Service auth boundary** | 33K §9 options A (bearer/JWT) and B (signed envelope) production-capable; C dev-only; D rejected; "service auth ≠ end-user consent" restated (33K §9; 33V §5). | How a calling service authenticates in production (final A-vs-B choice), and how the boundary to end-user authorization is enforced. | The production service-auth model (A or B) and the auth/consent boundary. | The production auth decision gate lands (deferred to the signer/authority review). |
| **Endpoint-local admission header / service token** | The spike reads a dedicated `x-admission-service-token` header (not `Authorization`), with optional `x-admission-operator-id`; dev/operator-only, fail-closed when unconfigured (`auth-gate.ts:9`; `admission-intake.ts:44`; 33V §5). | Whether any endpoint-local admission credential survives into production, and in what relationship to the global gate. | Whether the endpoint-local admission header is a production control or strictly a dev/operator spike control. | The production auth decision gate confirms the production caller-credential model. |
| **Global `/api/*` auth interaction** | 33X §2/§4 correct the layering: the admission header is **defense-in-depth on top of** the global `/api/*` auth (JWT wallet / `Bearer dxk_` allowlist), not a replacement; the route imports only Dixie-local primitives + hono (33X §2; `admission-intake.ts:19`). | How the production admission route composes with the global `/api/*` gate (which already owns `Authorization`). | The production layering of the admission route under the global `/api/*` gate. | The production auth decision gate resolves the layering. |
| **Operator / dev-only controls** | Disabled-by-default (mounts only at `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'`); both credential gates empty → reject all; constant-time comparisons; kill-switch via disable (`admission-intake.ts:16`; `auth-gate.ts:74`, `:51`; 33K §12). | Which dev/operator controls are retired vs retained for production, and the production kill-switch / default-off posture. | The production default-off / kill-switch posture and the disposition of dev/operator controls. | The implementation-spike readiness checklist + production deployment controls are decided. |
| **Production caller identity** | The default-off non-production admission spike exists, but no production admission route exists; identity is session-derived, never body-trusted; `dev_signature` has development-only generation/verification logic and no production cryptographic authority (33K §4; 33V §5). | The production caller-identity model (who may call, derived from what session / credential). | The production caller-identity binding rule. | The production auth + identity-binding decisions land. |
| **Tenant / estate / actor binding** | `estate_id` / `actor_id` are Straylight wedge primitives; `tenant_id` is Dixie host-layer; `subject` maps to `Assertion.subject_refs`, no `subject_actor_id` primitive; `caller_actor_id` ↔ `subject_actor_id` **unresolved**; `identity_binding_final: false` (33K §11; 33U Row G; 33V §4). | The production identity-binding rule (session-derived, no caller override) and the caller-vs-subject relationship. | The production tenant / estate / actor identity-binding semantics. | The production identity-binding decision gate lands (PR #65 row G still held). |
| **Signer / authority model** | `policy_service` is a canonical `SignerType`; admit/reject/supersede authority is decided by `SignerCompetenceRule` / `Keyring` / policy (not a fixed list); no cross-estate authority primitive in Straylight; `authority_binding_final: false` (33K §9 / §2; 33U Row F; 33V §5). | Which signer roles may authorize `admit_assertion` in production, and how cross-estate / delegated authority is modelled. | The production signer / authority binding model and its verification at admission time. | The production signer/authority decision gate lands (PR #65 row F still held). |
| **Cross-user & cross-tenant denial posture** | Cross-user admission requires an explicit consent model; Option D rejected; cross-tenant ambiguity fails closed; the Recall route rejects body identity overrides (33K §11 / §14; 33V §5). | The production cross-user / cross-tenant denial guarantee at the auth + storage layers. | The production cross-user / cross-tenant denial posture (default-deny, fail-closed). | The production auth + consent + identity-binding decisions land together. |
| **Replay / conflict authority** | Replay/double-admission is a named threat; accepted retry must not duplicate; the spike fails closed on reused key / id collision / re-supersession; no substrate replay guard — endpoint-owned (33K §14 / §8; 33U §3.2; `admitted-assertion-ledger.ts:265`). | Who owns and enforces the production replay / conflict decision, and how it binds to idempotency keying. | The production replay / conflict authority (Dixie endpoint-owned) and its idempotency binding. | The route-contract idempotency decision (§4.1) lands. |
| **Auditability of auth decisions** | Authority/signature material must never leak publicly; only a reference handle (`service_auth_context`) is retained; audit overexposure is a named threat (33K §6.9 / §7 / §14; 33V §4). | How auth / authority decisions are audited privately without leaking signer/secret material to the public surface or operational logs. | The private auth-decision audit model and its no-leak boundary. | The durable `AuditEvent` persistence + no-leak serializer decisions land. |

### 4.3 Consent

| Blocker area | Current evidence | Unresolved production question | Required decision before implementation | Implementation must not start until |
|---|---|---|---|---|
| **End-user authorization vs service authentication** | The load-bearing boundary "service auth ≠ end-user consent" (32F §7 / 33A) is restated across the chain; service auth proves only that a caller MAY call Dixie (33K §9; 33V §5; 33X §11; `auth-gate.ts:3`). | How an end user is authorized (distinct from how a service authenticates), and where each is enforced. | The two distinct decisions: service authentication model **and** end-user authorization model. | The production auth (§4.2) and consent decisions land as separate gates. |
| **Consent proof** | Option A (explicit end-user admission consent artifact) production-capable, strong cross-user safety; A or B required before production user-facing admission (33K §10; 33V §5/§7; 33X §11). | What constitutes a verifiable production consent proof, and how it is checked at admission time. | The production consent-proof model (Option A artifact or Option B platform grant). | The production consent decision gate lands. |
| **Consent receipt** | Option B (platform-mediated authorization grant) an acceptable production alternative; the grant / consent reference lives on the **private audit record only**, never public, never a raw secret (33K §10 / §6.9; 33V §5/§7). | The shape and durable home of the consent receipt / grant reference, and its private-audit binding. | The consent-receipt shape and its private-audit persistence. | The production consent decision gate + private-audit persistence (§4.1) land. |
| **Consent revocation** | Revocation falls under forget / revoke / correction, **not designed**, blocked unless a later phase designs it (33K §20; 33V §9). | How a granted consent is revoked and how revocation propagates to durable admitted material. | Whether and how consent revocation is modelled (tied to the deletion/forgetting row §4.1). | A dedicated consent-revocation / forget design gate lands. |
| **User-visible admission acknowledgement** | No user-visible acknowledgement surface is designed; the spike accepts only synthetic markers, never user messages (33X §4; `classifier.ts:185`). | Whether end users receive a visible acknowledgement of admission, and what it discloses. | Whether a user-visible acknowledgement is in scope, and its no-leak content. | A production consent + UX design gate lands (downstream). |
| **Public `remember-this` exclusion** | No public / unauthenticated `remember-this` surface is designed or authorized; an explicitly blocked lane (33K §12 / §20; 33V §5; `admission-intake.ts:11`). | (Exclusion, not a feature.) Confirm `remember-this` stays excluded until an explicit consent + auth model exists. | Confirmation that public `remember-this` remains excluded. | An explicit consent + auth model exists *and* a separate gate authorizes it. |
| **Discord / freeform ingestion exclusion** | No Discord command / history ingestion, no user-chat-as-memory; the route accepts a candidate/transition envelope, never a stream of user messages (33X §4; 33V §5; `admission-intake.ts:11`). | (Exclusion.) Confirm freeform / Discord ingestion stays excluded until a consent-bound ingestion model exists. | Confirmation that Discord / freeform ingestion remains excluded. | A consent-bound ingestion model is separately designed and authorized. |
| **Consent boundary for Freeside Characters handoff** | The Freeside client-contract handoff is **deferred** until the Dixie route/client contract matures; the adapter stays test-only, not exported, not runtime-wired, no live Dixie call (33V §5; 33U §2; 45J / PR #177). | What consent boundary a downstream Freeside client must honour once a contract is handed off. | Whether / how the consent boundary is expressed in any client-contract handoff (only after Dixie ownership settles). | The Dixie route/auth/consent boundary settles *and* a separate handoff gate lands. |
| **Third-party / user-sensitive candidate material** | Cross-user admission of others' material requires an explicit consent model; Option D rejected; cross-tenant ambiguity fails closed; raw candidate payload never public (33V §5; 33K §6.1 / §10). | How candidate material that includes third-party / user-sensitive text is consent-gated and privacy-bounded. | The consent + privacy model for third-party / user-sensitive candidate material. | The production consent decision gate + candidate-persistence policy (§4.1) land. |
| **Audit / private-public split for consent evidence** | The consent reference is recorded on the private audit record only and split from the public surface; never a raw secret, never public (33K §6.9; 33V §7; 33X §11). | How consent evidence is persisted privately and excluded from the public projection and operational logs. | The consent-evidence private-audit persistence + no-leak boundary. | The durable `AuditEvent` persistence + no-leak serializer decisions land. |

### 4.4 Public / private boundary

| Blocker area | Current evidence | Unresolved production question | Required decision before implementation | Implementation must not start until |
|---|---|---|---|---|
| **Public admission response** | The public envelope carries outcome class, `public_receipt_ref` (or `null`), a stable `safe_reason_code`, and a recall-eligibility projection; the spike builds it structurally from the classification + fixed placeholders + non-final `draft_markers` (33V §6; `public-response.ts:9`, `:106`). | The final public response field set and its canonical schema. | Whether to freeze the public response schema, and which serializer enforces it. | The final route-contract / schema lane lands (downstream of this decomposition). |
| **Private `TransitionReceipt`** | Private, full operational/audit detail (`receipt_id`, `transition_id`, `estate_id`, `actor_id`, signer/audit refs, policy, reasons); never serialized to the caller; forbidden on public projections by the validator at any depth (33X §11; `validate-route-contract-test-vectors.mjs:267-272`). | How the private `TransitionReceipt` is durably persisted and projected to the public `public_receipt_ref` at write time. | The private/public projection rule at write time and its durable backing. | The durable receipt persistence (§4.1) + serializer decisions land. |
| **Private `AuditEvent`** | Append-only, hash-chained; canonical admission members `assertion_admitted` / `transition_denied`; private / controlled-access; forbidden on public projections (33X §11; `validate-route-contract-test-vectors.mjs:273-280`). | How the private `AuditEvent` is durably persisted (hash-chained) and kept off the public surface. | The durable audit persistence + controlled-access + public-exclusion rule. | The durable `AuditEvent` persistence (§4.1) + ADR-022E gate clear land. |
| **No-leak serializer** | Canonical rule = `privacy_scope` + environment-frame disposition; Dixie denylist is **defense-in-depth, not the canonical rule**; the spike no-leak guard is the single send path but not the final serializer; serializer delegated to Dixie (33U Row K; 33V §4; 33X §11; `no-leak.ts:10`; `admission-intake.ts:255`). | What production serializer enforces the public/private boundary against `privacy_scope` + frame disposition, and how it is no-leak-tested. | The production no-leak serializer design and its test harness. | The serializer is designed (after the durable receipt/audit boundary is decided). |
| **Public receipt reference** | `public_receipt_ref` aligned across the five vectors; `null` where none minted; retired keys (`public_receipt_ref_policy`, `receipt_public_ref`) rejected at any depth; carries no operational id (33V §4; `validate-route-contract-test-vectors.mjs:177`, `:441-448`). | The production mint / resolution of the public receipt reference without operational-id leakage. | The public-receipt-reference projection rule (or a decision not to mint). | The receipt persistence + serializer decisions land; the field stays draft until then. |
| **Safe reason codes** | Exact-match per scenario (malformed → `ingress.invalid_request`; reject → `admission_transition_denied_draft_non_final`; pending/accept/supersede → literal `null`); dotted `admission.*` draft codes and any `duplicate_replay` token rejected on the public surface (`validate-route-contract-test-vectors.mjs:150-156`, `:182-186`, `:458-464`; 33X §8). | The final public refusal taxonomy (two-part `category.specific_reason`) and its HTTP-status mapping. | The final public failure taxonomy and its runtime enforcement point. | The final route-contract taxonomy lane lands. |
| **Raw / source / debug / private field exclusion** | `FORBIDDEN_PUBLIC_KEYS` forbids tenant/estate/actor ids, raw payload, idempotency keys, signer/signature, and private receipt/audit shapes; the spike rejects stack traces, tokens, UUIDs, and opaque runs ≥24 chars (`validate-route-contract-test-vectors.mjs:236-299`; `no-leak.ts:118`; 33V §4). | How the production serializer enforces never-public categories at runtime against real (non-synthetic) material. | The runtime never-public enforcement point and its coverage. | The production no-leak serializer (above) is designed and no-leak-tested. |

> Every blocker above blocks **implementation**; **none** blocks a further
> **docs/decision** phase. The decomposition is therefore safe: the blockers are
> numerous and unresolved, but all are addressable in docs/decision sub-gates before
> any build. The clustering is the one the chain has carried, which is why §5 orders
> them as a single dependency-coupled cluster rather than four independent lanes.

---

## 5. Dependency ordering

The sub-gates above are not independent: storage underpins receipt/audit/idempotency
persistence; auth underpins identity binding and consent; consent depends on auth;
and the public/private serializer depends on the receipt/audit boundary. The proposed
ordering of dependencies **before** implementation readiness is therefore:

1. **Storage/auth/consent blocker decomposition accepted** — i.e. Phase 46C is
   accepted (or patched / split) by a docs/decision acceptance gate. *(This is the
   first ordered dependency; it is the lane Phase 46C selects next — see §7.)*
2. **Per-area decision gates** — the durable-storage model (incl. ADR-022E gate #8
   clearing), the auth/identity/signer authority model, and the consent
   proof/receipt model are each decided on their own evidence. These are coupled
   (auth → identity → consent; storage → receipt/audit → idempotency) and may be
   sequenced or combined, but each must clear on its own gate.
3. **Final route-contract pre-freeze gate** — the route-owned questions (idempotency
   keying, the dotted `admission.*` taxonomy + HTTP mapping, identity binding,
   atomicity/rollback) are resolved into a pre-freeze contract, *after* the storage /
   auth / consent semantics they depend on are decided.
4. **Implementation-spike readiness checklist** — the exact evidence required before
   extending past the Phase 33N dev/operator-only spike, referencing the now-concrete
   sub-gates rather than an undifferentiated cluster.
5. **Bounded default-off implementation spike** — only if the checklist is satisfied;
   disabled-by-default, fail-closed, separately authorized.
6. **Smoke / acceptance gate** — validates the bounded spike against the vectors /
   acceptance criteria.
7. **Freeside Characters client-contract handoff** — only after Dixie route
   ownership, the auth/storage boundary, and the contract shape settle.

> **Implementation is not the immediate next step, and Phase 46C does not claim the
> prior gates are satisfied — they are not.** Steps 2–7 above are each held: the
> per-area decision gates (2) are unresolved (ADR-022E gate #8 held; production auth /
> consent / identity binding held); the route-contract pre-freeze (3) depends on (2);
> the spike checklist (4) depends on (3); the bounded spike (5) depends on (4); the
> acceptance gate (6) depends on (5); and the Freeside handoff (7) depends on (3).
> The only step Phase 46C advances toward is **step 1** — accepting / patching this
> decomposition — which is itself docs/decision-only. **Runtime implementation is
> not selected as the next step.**

---

## 6. Decision options

Phase 46C considers eight candidate next lanes. For each: what it would prove, what
it would **not** prove, and whether it is the right immediate next step. **Runtime
implementation is not a candidate option — no artifact accepted so far proves
implementation is safe (§3, §9).**

### Option A — Durable storage model decision gate

- **Proves:** an architecture for (or a decision against) a durable admission store,
  and the evidence required to clear ADR-022E gate #8.
- **Does not prove:** that the auth / consent / identity-binding semantics the store
  must enforce are decided; storage alone cannot bind admitted material to an
  authorized actor / consenting subject.
- **Immediate next step?** **No.** It is a *member* of the cluster Phase 46C just
  decomposed; running it before the decomposition is accepted risks deciding storage
  against an unaccepted blocker set. Best sequenced under step 2 of §5, after step 1.

### Option B — Auth / identity / signer authority decision gate

- **Proves:** the production service-auth model (A vs B), the identity-binding rule,
  and the signer/authority model (PR #65 rows F / G).
- **Does not prove:** the durable substrate that persists the authorized material, or
  the consent model that gates cross-user admission.
- **Immediate next step?** **No.** Same as A — a cluster member, best sequenced under
  step 2 after the decomposition is accepted; tightly coupled to consent (C) and
  storage (A).

### Option C — Consent proof / receipt decision gate

- **Proves:** the production consent-proof model (artifact or platform grant) and the
  consent-receipt shape / private-audit binding.
- **Does not prove:** the auth model it sits on top of, or the durable substrate that
  persists the consent evidence.
- **Immediate next step?** **No.** Depends on auth (B) and storage (A); a cluster
  member best sequenced under step 2 after the decomposition is accepted.

### Option D — Combined storage/auth/consent acceptance gate

- **Proves:** that the Phase 46C decomposition is **accepted, patched, or split**
  into the per-area decision gates (A / B / C) with agreed dependency ordering and
  exit criteria — the docs/decision checkpoint that makes A / B / C runnable on solid
  ground.
- **Does not prove:** it does not by itself decide any durable store, auth model, or
  consent model; it accepts / orders the decomposition, it does not clear the
  sub-gates.
- **Immediate next step?** **Yes — selected (§7).** It is step 1 of §5: the lowest-
  blast-radius docs/decision action that validates and sequences this decomposition
  before any per-area decision or implementation, and it keeps the chain
  decomposition-then-acceptance disciplined rather than jumping into a single
  per-area gate prematurely.

### Option E — Final route-contract pre-freeze gate

- **Proves:** that the route contract (envelopes, taxonomy, idempotency keying,
  identity binding, atomicity/rollback) is stable enough to pre-freeze.
- **Does not prove:** that the storage / auth / consent semantics it depends on are
  decided — a contract pre-frozen over unresolved semantics would freeze the wrong
  shape and force rework.
- **Immediate next step?** **No — premature.** It is step 3 of §5 and depends on
  step 2; the route contract is not frozen, and the dependency order must not be
  inverted.

### Option F — Implementation-spike readiness checklist

- **Proves:** the exact evidence required before extending past the Phase 33N
  dev/operator-only spike.
- **Does not prove:** that the storage / auth / consent blockers it would reference
  are decomposed and accepted — the checklist would otherwise reference an
  undifferentiated cluster and need rewriting.
- **Immediate next step?** **No — premature.** Step 4 of §5; most useful *after* the
  decomposition is accepted (D) and the per-area gates (A / B / C) are decided.

### Option G — Further vector / fixture cleanup

- **Proves:** the Phase 33E fixture two-spelling migration (`receipt_public_ref` →
  `public_receipt_ref` with the fixtures validator updated in lockstep) or residual
  legacy-marker-prose cleanup.
- **Does not prove:** it resolves no production blocker — the vectors are already
  aligned and green; this is optional polish (a route-vector / fixture change that
  would require its own separately-gated mutation phase, out of scope here).
- **Immediate next step?** **No — optional, not blocking.** Phase 46C finds no
  vector/fixture debt that blocks the storage/auth/consent decomposition.

### Option H — Stop / cross-repo review

- **Proves:** a Straylight or freeside-characters checkpoint before any further Dixie
  lane.
- **Does not prove:** it advances no Dixie decomposition; the primitive-vocabulary
  review (A–O) is already answered (PR #65) and reconciled (33U).
- **Immediate next step?** **No — not required now.** A production security /
  cross-repo *runtime* review remains a valid downstream gate, but it is not the
  highest-leverage immediate action.

**Ranking (for immediacy):** **D ≻ A ≈ B ≈ C ≻ E ≈ F ≻ G ≻ H.** Option D (accept /
patch / split this decomposition) is step 1; A / B / C are the coupled per-area gates
it sequences (step 2); E and F are premature until D and the per-area gates land
(steps 3–4); G is optional polish; H is available but not highest-leverage.

---

## 7. Selected next lane

> **Selected: Phase 46D — Admission Wedge storage/auth/consent acceptance gate
> (docs / decision-only; not runtime).** *(Option D.)*

**Reason:**

- Phase 46C must **not** jump to runtime implementation — no artifact accepted so far
  proves implementation is safe (§3, §9), and §5 shows every implementation-adjacent
  step (route-contract pre-freeze, spike checklist, bounded spike) is held.
- A **per-area decision gate run first (Options A / B / C) is premature** while this
  decomposition is unaccepted: the durable-storage, auth/identity/signer, and
  consent decisions are coupled, and deciding one before the cluster decomposition is
  accepted risks fixing a shape the acceptance gate would re-order.
- A **final route-contract pre-freeze (Option E) is premature** because the
  route-owned questions depend on storage / auth / consent semantics that are still
  held (ADR-022E gate #8 held; production auth / consent held; production identity
  binding held).
- An **implementation-spike readiness checklist (Option F) is premature** if the
  blockers it would reference are not first decomposed *and accepted*.
- **Further vector / fixture cleanup (Option G) is optional** — Phase 46C finds no
  vector/fixture debt blocking the decomposition.
- **The combined storage/auth/consent acceptance gate (Option D)** is therefore the
  safest next docs/decision-only step: it accepts, patches, or splits this
  decomposition before any per-area decision, route-contract freeze, or
  implementation readiness — the lowest-blast-radius way to validate and sequence the
  held blockers without committing to any runtime, freeze, or spike.

**Caveat (surfaced, not suppressed).** Phase 46D accepts / patches / splits and
sequences the storage / auth / consent decomposition; it does **not** clear ADR-022E
gate #8, decide a durable store, decide an auth / consent model, freeze the route
contract, or authorize a route. Accepting a decomposition is a docs/decision action
whose output is an accepted sub-gate plan, not a cleared gate. The per-area decision
gates (A / B / C) and everything downstream remain separately held.

**Documented alternative.** If a reviewer judges the decomposition already clearly
correct and wants to proceed directly to a single per-area decision gate — the
**durable storage model decision gate (Option A)**, the **auth / identity / signer
gate (Option B)**, or the **consent proof / receipt gate (Option C)** — that is
recorded here as the documented alternative. Phase 46C does **not** select it,
because accepting and sequencing the cluster first (Option D) keeps the coupled
per-area decisions from being fixed against an unaccepted blocker set. **Runtime
implementation is not selected under any option.**

---

## 8. Phase 46D scope if selected

Because §7 selects the combined acceptance gate, Phase 46D is bounded as:

> **Phase 46D — Admission Wedge storage/auth/consent acceptance gate. Docs /
> decision-only.**

**Allowed scope**

- docs / decision-only;
- **accept, patch, or split** the Phase 46C storage / auth / consent (and shared
  public/private) blocker decomposition;
- decide whether, and in what order, to proceed to:
  - a final route-contract pre-freeze gate;
  - a durable storage model decision (incl. the ADR-022E gate #8 clearing path);
  - an auth / identity / signer authority decision;
  - a consent proof / receipt decision;
  - an implementation-spike readiness checklist;
  - further vector / fixture cleanup;
  - a cross-repo review;
- record the agreed dependency ordering and per-area exit criteria.

**Blocked scope (Phase 46D must not do any of these)**

- no runtime implementation;
- no DB writes;
- no migrations;
- no package exports;
- no Freeside runtime / client integration;
- no clearing of ADR-022E gate #8 (acceptance ≠ gate-clearing);
- no auth / consent implementation;
- no route / API handler;
- no route-contract or schema freeze;
- no production-readiness claim.

**Required evidence to exit Phase 46D:** an accepted (or patched / split) sub-gate
plan for durable storage, service auth, end-user authorization, consent proof /
receipt, identity binding, signer / authority, and the public/private boundary —
each with its own exit criteria and agreed dependency ordering — consistent with the
Straylight PR #65 verdicts as reconciled by Phase 33U, plus a decision on which gate
(if any) runs next. Exiting Phase 46D authorizes **no** runtime implementation.

---

## 9. Blocked lanes

Phase 46C is a bounded, docs/decision-only decomposition gate. It authorizes **none**
of the following; each remains **blocked** and is **not** unblocked by decomposing the
storage / auth / consent blockers or selecting Phase 46D:

- route / API handler implementation **beyond the existing Phase 33N spike**;
- production admission;
- durable Admission Wedge storage implementation (ADR-022E gate #8 held);
- DB writes;
- migrations;
- auth implementation;
- production auth / consent implementation;
- public `remember-this`;
- Discord command / history ingestion;
- user chat becoming memory;
- Freeside Characters runtime / client integration;
- package exports;
- the final Dixie route contract;
- route-contract freeze;
- production route deployment;
- production readiness of any kind;
- final / production schema freeze;
- LLM / voice;
- Finn production wiring;
- forget / revoke / correction UI;
- final idempotency semantics (Dixie / endpoint-owned; undecided);
- production signer / authority semantics;
- production identity binding (tenant / estate / actor).

> **Decomposition does not authorize runtime implementation.** Ordering the held
> blockers and selecting Phase 46D makes the remaining work legible; it does **not**
> freeze the route contract, **not** freeze the schema, **not** clear any production
> gate, and **not** authorize any route / storage / auth / consent / Freeside /
> package-export work. The Phase 33N dev/operator-only, disabled-by-default spike
> remains the only authorized route surface.

Phase 46C also does **not**: mutate any route-vector JSON, the route-vector
validator, the Phase 33E fixtures, or the Phase 33E fixture validator; mutate any
runtime source; change any config, env, package, lockfile, CI, or generated file;
flip any draft marker (`route_contract_final`, `idempotency_final`,
`identity_binding_final`, `authority_binding_final`, `schema_final`,
`straylight_primitive_review_complete`, etc. stay `false`); or edit the adjacent
`loa-straylight` / `freeside-characters` repositories.

If a later phase reaches for any of the above, it must re-open the Phase 33K
precondition design, the Phase 33U / 33V / 33W / 33X chain, the Phase 33Y / 33Z
gates, the Phase 46A / 46B / 46C gates, and the relevant ADRs (ADR-022E durable-store
gate #8 and related gates #10 / #12 / #20; ADR-026C / ADR-026D route guardrails)
first; it must not silently expand scope.

---

## 10. Validation

All commands were run from the repository root
(`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46C is docs/decision-only — it
adds only this document and mutates no vector, validator, or fixture — so the
validators are run only to confirm the unchanged artifacts remain green. The
validation set (the fence-balance and negative-claim checks avoid embedding literal
triple-backtick / affirmative-claim substrings, so they cannot self-match):

```bash
git status --short --branch --untracked-files=all
git diff --name-status
git diff --stat
git diff --check
# Nothing-staged check (this lane stages nothing):
git diff --cached --name-status
# Untracked new doc fence/whitespace sanity:
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md || test "$?" = "1"
# Unchanged-artifact green-check (no mutation here):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# Self-reference / next-lane label check (grep -E so `|` is real alternation):
grep -E "Phase 46C|Phase 46D" docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md || true
# Negative check — fail if any affirmative readiness/freeze/implementation claim
# appears in PROSE. Fenced validation-command lines are excluded so the check
# cannot self-match; it is enforcing (raises SystemExit(1) on a real prose hit).
python3 - <<'PY'
from pathlib import Path
p = Path("docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md")
needles = [
    "runtime implementation is selected",
    "implementation is authorized",
    "route contract is frozen",
    "schema is frozen",
    "production ready",
    "storage is implemented",
    "auth is implemented",
    "consent is implemented",
]
fence = chr(96) * 3
inside_fence = False
hits = []
for idx, line in enumerate(p.read_text().splitlines(), 1):
    if line.strip().startswith(fence):
        inside_fence = not inside_fence
        continue
    if inside_fence:
        continue
    low = line.lower()
    if any(needle in low for needle in needles):
        hits.append((idx, line))
if hits:
    for idx, line in hits:
        print(f"{idx}: {line}")
    raise SystemExit(1)
print("No affirmative runtime/production/freeze prose claims found outside fenced validation commands.")
PY
# Fence-balance check (dependency-free; even count = balanced; char-code form
# avoids embedding a literal triple-backtick that would unbalance this doc):
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

Recorded results for this lane:

- **docs-only scope check** — only the single new file
  `docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md` is added;
  no route-vector JSON, route-vector validator, Phase 33E fixture, fixture validator,
  `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, runtime,
  or generated file is touched;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no
  `git add` / commit / push);
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator
  reports **5/5 probes valid, 0 failures**; the route-contract test-vector validator
  reports **5/5 vectors valid, 0 failures, no sixth vector**; the `--self-check`
  negative-mutation harness reports **5/5 mutations fail closed**;
- **self-reference label check** — `grep -E "Phase 46C|Phase 46D"` confirms both the
  `Phase 46C` (self) and `Phase 46D` (next-lane) labels are present;
- **negative readiness-claim check** — the `python3` check scans every line, excludes
  lines inside fenced code blocks, and reports **"No affirmative
  runtime/production/freeze prose claims found outside fenced validation commands."**
  The phrases that appear in prose are **negated** occurrences (e.g. "does not freeze
  the route contract", "does not implement storage"), which the needle list does not
  match;
- **fence-balance check** — the dependency-free `node -e` counter reports an **even
  (balanced)** triple-backtick count; the single fenced block is the validation
  command list above, with no unterminated code fence.

---

## 11. Success criteria for Phase 46C

Phase 46C succeeds if and only if:

1. **Docs / decision-only** — it creates only this Phase 46C document; it changes
   **no** route-vector JSON, route-vector validator, Phase 33E fixture, fixture
   validator, runtime source, test, route, store, migration, auth, consent, config,
   env, package, lockfile, CI, or generated file, and edits **no** adjacent
   repository.
2. **Source chain recorded** — the Straylight PR #65 → 33U → 33V → 33W → 33X → 33Y →
   33Z → label-fix #145 → 46A → 46B → 46C chain, plus the ADR-022E held gates and the
   residual-legacy-marker status, is summarized (§2).
3. **Starting accepted facts recorded** — the ten §3 facts (bounded non-runtime
   readiness, `public_receipt_ref` alignment, five vectors, the `--self-check`,
   untouched fixtures, the answered/reconciled A–O, the legacy-marker status, the
   undesigned persistence binding, the bounded spike builder, and the spike default-
   off posture) are recorded as the baseline.
4. **Blockers decomposed** — the storage (11), auth (10), consent (10), and
   public/private (7) blocker areas are decomposed into tables with current evidence,
   the unresolved production question, the needed decision, and the gating condition
   (§4), closing none of them.
5. **Dependencies ordered** — a proposed ordering of dependencies before
   implementation readiness is recorded (§5), with implementation explicitly **not**
   the immediate next step and the prior gates explicitly not claimed satisfied.
6. **Options ranked** — the eight candidate next lanes (A–H) are analyzed for what
   each would and would not prove, and ranked (§6), with runtime implementation
   excluded.
7. **Next lane selected** — Phase 46D (storage/auth/consent acceptance gate,
   docs/decision-only) is selected with reasoning, the documented alternatives
   (Options A / B / C) recorded, and runtime implementation explicitly not selected
   (§7, §8).
8. **Blocked lanes preserved** — no production / durable / public / Freeside /
   package / schema-freeze / auth / consent / route-contract-freeze / runtime lane is
   authorized (§9).
9. **No freeze, no production-readiness claim** — Phase 46C freezes neither the route
   contract nor the schema, and declares no production readiness (§1, §9).

---

## 12. Cross-references

- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 46B decomposition gate (PR #147); its §4 readiness decomposition and §6 / §7
  selection named this Phase 46C storage/auth/consent decomposition gate.
- [`docs/ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-ACCEPTANCE-GATE.md)
  — Phase 46A acceptance gate (PR #146); the bounded non-runtime readiness, the
  residual-legacy-marker status, and the fixture spelling-debt status recorded in §3.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K precondition design; its §6 record categories, §9 auth options (A/B/C/D),
  §10 consent options (A/B/C/D), §8 idempotency precondition, §13 no-leak
  preconditions, §14 threat model, and §15 exit criteria seed the §4 tables.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U Straylight-response intake (PR #139); the A–O reconciliation (rows F / G
  / J / O still held; ADR-022E gates #8 / #10 / #12 / #20 held) grounding §2 and the
  §4 held-blocker rows.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V design finalization (PR #140); the `public_receipt_ref` adoption, the
  `receipt_public_ref` retirement, the `privacy_scope` + frame-disposition projection
  boundary, the never-public categories, and the held production blockers in §4.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-UPDATE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-UPDATE-GATE.md)
  and [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-DRAFT.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-DRAFT.md)
  — Phase 33W (PR #141) and Phase 33X (PR #142); the route-owned questions (idempotency
  keying, two-part taxonomy, identity binding, atomicity/rollback), the dotted
  `admission.*` draft codes, and the spike auth-layering correction carried into §4.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-ACCEPTANCE-GATE.md)
  — Phase 33Y revision acceptance (PR #143); accepted 33X as a draft baseline and
  selected 33Z.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  with the five vector JSONs — inspected **read-only** to ground §3 / §4 (the aligned
  `public_receipt_ref`, the retired-key lock, the exact `safe_reason_code` rule, the
  `FORBIDDEN_PUBLIC_KEYS` no-leak set, the `--self-check` harness, the `FALSE_FLAGS`
  set, and the README current-state correction). None is modified.
- `docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`,
  `docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`,
  `app/src/routes/admission-intake.ts`, and
  `app/src/services/admission-wedge-spike/{auth-gate,public-response,no-leak,classifier,admitted-assertion-ledger,index}.ts`
  — inspected **read-only** to ground the spike posture in §3 / §4 (the dedicated
  `x-admission-service-token` header, the disabled-by-default mount, Storage Option A,
  the process-local non-durable ledger, the single no-leak send path, and the non-final
  `draft_markers`). None is modified.
- `@loa/straylight` — canonical primitive / substrate owner; PR #65 (merged) answered
  the A–O primitive review. ADR-022E (durable-store gate #8 + related gates #10 / #12 /
  #20, **held**), ADR-026C, ADR-026D are Straylight-repo decision records cited as
  guardrails. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — the cross-repo
  acceptance whose mirror/adapter is test-only, not exported, not runtime-wired, with
  no live Dixie call; the consent-boundary handoff in §4.3 stays deferred. **Not
  edited by this phase.**
