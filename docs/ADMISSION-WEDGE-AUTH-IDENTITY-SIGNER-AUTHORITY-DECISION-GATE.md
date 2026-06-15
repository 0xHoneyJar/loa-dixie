# Phase 46G — Admission Wedge Auth / Identity / Signer Authority Decision Gate

> **Phase**: 46G
> **Branch context**: `phase-46g-admission-auth-identity-signer-gate`
> **Related**: Phase 46F durable storage shape & route-vector alignment (PR #151,
> [`ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md)
> §14, which selected and scoped this gate); Phase 46E durable storage model decision
> (PR #150); Phase 46D storage/auth/consent acceptance (PR #149); Phase 46C storage/auth/consent
> blocker decomposition (PR #148); Phase 46B route-contract implementation-readiness
> decomposition (PR #147); Phase 46A route-vector alignment acceptance (PR #146); Phase 33Z
> route-vector alignment (PR #144) + its PR #145 next-lane label/provenance correction; Phase
> 33Y route-contract revision acceptance (PR #143); Phase 33X route-contract revision draft
> (PR #142); Phase 33V storage/auth/consent design finalization (PR #140); Phase 33U
> Straylight-response intake (PR #139); Phase 33R bounded-ledger acceptance (PR #136); Phase 33Q
> bounded synthetic admitted-assertion ledger (PR #135); Phase 33P storage/receipt hardening
> (PR #134); Phase 33N dev/operator-only route spike; Phase 33M dev/operator route-spike
> authorization gate; Phase 33K storage/auth/consent precondition design; Phase 33L
> route-contract test-vector fixture draft; Straylight (`@loa/straylight`) PR #65 (A–O
> primitive-review verdicts, **merged**); Straylight-repo ADR-022E durable-store gate #8 (and
> related gates #10 / #12 / #20), **held**; Straylight-repo ADR-022D MVP-persistence /
> audit-owner invariants; ADR-026C / ADR-026D route guardrails; freeside-characters Phase 45J /
> PR #177 (Dixie v1 mirror-refresh acceptance, merged 2026-06-06).
> **Status**: **docs / decision-only.** This gate adds **only this document**. It changes
> **no** route-vector JSON, **no** route-vector validator, **no** route-vector README, **no**
> Phase 33E fixture or fixture validator, and **no** runtime source, test, route, route
> handler, storage, store code, DB write, migration, auth, consent, package export, config,
> env, package, lockfile, CI, generated file, or binary. No adjacent repository
> (`loa-straylight`, `freeside-characters`) is touched.
> **This is an auth / identity-binding / signer-authority *decision* gate, not implementation.**
> It records, on paper, the authentication boundary, the identity-binding model, the
> signer/authority model, the replay/idempotency identity interaction, and the public/private
> auth projection that a future route/API or durable-storage implementation lane must satisfy
> before it can be authorized. It selects the safest next lane (§9 / §12). It does **not**
> implement auth, **not** implement consent, **not** change the route handler, **not** implement
> storage, **not** author or apply a migration, **not** authorize DB writes, **not** clear the
> Straylight-repo ADR-022E durable-store gate #8, **not** authorize production admission, **not**
> freeze the route contract, and **not** freeze the final schema.

Every assessment below is grounded read-only against the actual Dixie repo (the Phase 46E
durable-storage-model decision, the Phase 46F storage-shape alignment, the Phase 46A / 46B / 46C
/ 46D gates, the Phase 33K precondition / 33M authorization / 33N spike / 33P–33R storage lane,
the Phase 33U / 33V chain, the **five** route-vector JSONs, the route-vector validator and its
README, and the Phase 33N spike source under `app/src/services/admission-wedge-spike/` plus the
route handler `app/src/routes/admission-intake.ts` and the global middleware under
`app/src/middleware/`) and read-only against the **canonical** Straylight (`@loa/straylight`)
substrate (`types.ts`, `estate.ts`, `audit.ts`, `keyring.ts`, `signatures.ts`,
`storage/types.ts`, and `docs/decisions/ADR-022D…` / `ADR-022E…` / `docs/mvp/threat-model.md`).
Where a claim could not be grounded in the read material, it is marked as such.

---

## 1. Status and scope

Phase 46G is the bounded **auth / identity-binding / signer-authority decision gate** that
follows, and is named by, Phase 46F
([`ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md)
§14, PR #151). Phase 46F aligned the durable storage **shape** onto the existing route vectors
(docs-only) and selected this gate as the next lane: "decide auth against the now-decided storage
shape … the production service-auth model (33K options A vs B), the session-derived
caller-identity binding with no caller override, the signer / authority model (Row F / G), the
cross-user / cross-tenant denial posture, and the endpoint-local-header ↔ global `/api/*` gate
relationship — docs/decision-only, no runtime, no auth implementation" (46F §14). Phase 46G
executes exactly that charter and stops.

**Verdict.** Phase 46G:

- is **docs / decision-only** — its only output is this decision document;
- is **not auth implementation** — no authentication, authorization, or credential-handling code
  is created or changed; the production caller/auth model is not selected here, frozen, or built;
- is **not consent implementation** — no consent proof, consent receipt, or consent-revocation
  code is created; consent is not implemented (the consent gate remains the downstream lane, §12);
- is **not identity-binding implementation** — the production tenant/estate/actor binding is not
  built; identity binding is not finalized;
- is **not signer/authority implementation** — no signer, signature, or authority-verification
  code is created; production signer semantics remain unresolved and blocked;
- is **not route/API implementation** — the Phase 33N dev/operator-only, disabled-by-default
  spike remains the only authorized route surface; nothing is added to it;
- is **not storage implementation** — no durable store, schema, table, store code, or storage
  write is created; storage is not implemented;
- is **not migration authorization** — no migration is authored, applied, or authorized;
- is **not production admission** — production admission remains blocked;
- is **not a route-contract freeze** and **not a final schema freeze** — neither is frozen.

Phase 46G additionally:

- **does not clear** the Straylight-repo ADR-022E durable-store gate #8 (or the related held
  gates #10 / #12 / #20) — deciding an auth model on paper is not clearing a gate; gate #8
  remains uncleared;
- **does not modify** runtime source, the route-vector JSONs, the route-vector validator, the
  route-vector README, the Phase 33E fixtures, the Phase 33E fixture validator, validators of any
  kind, vectors, package exports, config / env, CI, migrations, generated files, binaries, or any
  adjacent repository — it changes no vector JSON and no validator;
- **declares no production readiness** of any kind.

> **An auth/identity/signer *decision* authorizes no runtime work.** Phase 46G records the
> authentication boundary, the identity-binding model, the signer/authority model, the
> replay/idempotency identity interaction, and the public/private auth projection that a future
> implementation lane must satisfy. The decision is a recommendation recorded on paper, not built
> auth, an implemented consent model, a frozen identity binding, or a cleared gate. A later,
> separately-gated phase must still (a) produce and accept the production service-auth, consent,
> identity-binding, and signer/authority models below, (b) clear ADR-022E gate #8 with a
> gate-clearing ADR that preserves the ADR-022D receipt/audit-chain invariants, and (c) only then
> authorize any build.

---

## 2. Source chain (evidence intake)

This gate sits one rung above the Phase 46F storage-shape alignment on the Dixie route-contract
ladder. It introduces no new contract or vector material; it consumes the prior auth/consent
design decisions (33K / 33M / 33V), the Phase 33N spike auth source, the global `/api/*` auth
middleware, the five existing route vectors and their validator, and the canonical Straylight
signer/identity substrate to record the auth/identity/signer decision.

### 2.1 Dixie (loa-dixie) — the auth / identity / signer lanes

| Phase | PR | Artifact / contribution (relevant to auth / identity / signer authority) |
|-------|----|------|
| 33G | #124 | **Route-contract design.** Proposed the route identity `POST /api/admission/intake`, the public/private split, an idempotency sketch, the `admission.*` refusal taxonomy, and the storage/auth/consent preconditions the test vectors are drawn from. |
| 33K | #129 | **Storage/auth/consent precondition design.** Stated the service-auth model **options** (Option A service-to-service bearer JWT; Option B signed request envelope; Option C dev/operator-only synthetic; Option D no-auth **rejected**); recommended A or B for production, deferred to the signer review (`ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md` §9); fixed identity binding as session-derived, never body-trusted (§11); stated idempotency is Dixie/endpoint-owned with key scope including tenant/estate/subject/transition intent (§8); stated consent Options A/B required before production, Option D rejected (§10). |
| 33L | #130 | **Route-contract test-vector fixture draft.** Authored the five non-runtime route-contract vectors + validator; carried the auth/identity/signer no-leak denylist and the unresolved-review markers. |
| 33M | — | **Dev/operator route-spike authorization gate.** Authorized the Phase 33N spike: dev/operator gate only, disabled-by-default, no production auth, Service auth ≠ end-user consent (§12), idempotency draft/dev-only (§11), fail-closed on disabled/unauthorized (§9). Selected Option C only, default-off; production Options A/B await the signer review (§5). |
| 33N | #132 | **Dev/operator-only route spike.** `POST /api/admission/intake`, disabled-by-default; the `authorizeAdmissionSpike` dev/operator gate (`auth-gate.ts`); the dedicated `x-admission-service-token` + `x-admission-operator-id` headers (`admission-intake.ts:38-44`); constant-time comparison and both-empty-rejects-all fail-closed (`auth-gate.ts:70-95`). |
| 33P | #134 | **Storage / receipt hardening decision.** Named the validator denylist as the boundary a store-backed projection must satisfy; carried the final identity/idempotency/signer/authority semantics as unresolved (§8 / §12). |
| 33Q | #135 | **Bounded synthetic admitted-assertion ledger.** Demonstrated tenant+estate scope isolation (an estate cannot be re-homed to a foreign tenant — `admitted-assertion-ledger.ts:712-719`, `:1022-1028`) and per-estate replay-key handling (`:743-759`) over **synthetic** material only. |
| 33R | #136 | **Bounded-ledger acceptance.** Accepted Phase 33Q only as a bounded, non-production, test-seam-only synthetic proof. |
| 33U | #139 | **Straylight-response intake.** Reconciled PR #65 A–O verdicts. Rows **F / G / J / O** held: Row F (production signer/authority semantics — independent unresolved gate), Row G (production tenant/estate/actor identity binding — independent unresolved gate), Row J (endpoint idempotency keying — Dixie-owned, undecided), Row O (durable store under ADR-022E gate #8 — held). Row B: `admitted` is a public `outcome_class`, never a status; Dixie holds **ingress refs only**. |
| 33V | #140 | **Storage/auth/consent design finalization.** Reaffirmed service-auth ≠ end-user authorization; mirrored canonical `policy_service` `SignerType`; left admit/reject/supersede authority to `SignerCompetenceRule` / `Keyring` / policy (not a fixed list); fixed identity binding as `estate_id` / `actor_id` mirroring Straylight, `tenant_id` Dixie host-layer, `(tenant_id, estate_id)` ledger scope spike-isolation-only, subject → `subject_refs`, identity session-derived; split `SyntheticAuditRecord` → `AuditEvent` + `TransitionReceipt`; adopted `public_receipt_ref`. |
| 33W–33Z | #141–#144 | **Route-contract readiness/revision/vector alignment.** Standardized `public_receipt_ref`; pinned the refusal taxonomy; aligned the five vectors + validator (`--self-check` negative-mutation harness); carried the auth/signer/identity forbidden-key set; `route_contract_final: false`, `auth_implemented: false`, `consent_implemented: false`. |
| 33Z (corr.) | #145 | **Next-lane label/provenance correction** (34A → 46A). |
| 46A | #146 | **Route-vector alignment acceptance.** Accepted the 33Z alignment as bounded, non-runtime vector/validator alignment. |
| 46B | #147 | **Route-contract implementation-readiness decomposition.** Judged the storage/auth/consent cluster the upstream dependency. |
| 46C | #148 | **Storage/auth/consent blocker decomposition.** Decomposed the held storage / **auth (§4.2: service-auth boundary, endpoint-local header, global `/api/*` interaction, operator/dev controls, production caller identity, tenant/estate/actor binding, signer/authority model, cross-user/cross-tenant denial, replay/conflict authority, auth-decision auditability)** / consent / shared public-private blockers into ordered, separately-clearable sub-gates. |
| 46D | #149 | **Storage/auth/consent acceptance.** Ranked the candidate next lanes; **Option B (auth/identity/signer authority decision gate)** proves the production service-auth model (33K options A vs B), the identity-binding rule (Row G), and the signer/authority model (Row F), but was **deferred to step 3** of the §8 ordering — sequenced after the durable storage model gate. |
| 46E | #150 | **Durable storage model decision.** Selected the §6 model direction (current-state projection + append-only hash-chained audit log on the canonical Straylight semantics/interfaces); sequenced the auth gate downstream (§10 step 3). |
| 46F | #151 | **Durable storage shape & route-vector alignment.** Aligned the shape onto the vectors docs-only; **selected this Phase 46G auth / identity / signer authority decision gate** as the next lane (§14), against the now-decided storage shape. |
| **46G** | *(this doc)* | **Auth / identity / signer authority decision gate.** Records the source chain (§2) and accepted facts (§3); decides the auth boundary (§4), the identity-binding model (§5), the signer/authority model (§6), the replay/idempotency identity interaction (§7), and the public/private auth projection (§8); assesses the auth-model options and selects the safest next lane (§9); restates the required invariants (§10) and the exit criteria for any future implementation lane (§11); selects the next lane and updates the ordering (§12); preserves the blocked lanes (§13). Mutates **no** vector / validator / fixture / source. |

> **PR-number provenance note.** The PR numbers above are taken from the local git merge-commit
> history (`docs: … (#NNN)` subjects) and the Phase 46A–46F source-chain tables. Phase 46F's
> `#151` is the merge commit `39cae5aa "docs: add Admission Wedge storage shape vector alignment
> gate (#151)"`. Treat the PR numbers as git-sourced rather than as authority embedded in the
> gate bodies (each gate refers to itself only as "this doc"). Phase 33M carries no PR number in
> the local merge history examined here and is cited by its gate document.

### 2.2 Canonical Straylight substrate (`@loa/straylight`) — read-only

The signer/identity primitives the auth model must align to are **canonical Straylight
semantics**, read-only here to ground the §5 / §6 decisions. The adjacent `loa-straylight` repo
is the canonical evidence (Dixie's mirror modules are parity evidence only, never canonical proof
— ADR-022D §3).

- **The Wedge owns receipt/audit shape and signer competence; the host owns caller
  authentication.** ADR-022D §Decision §1 / §3 establish that "the shape, fields, invariants, and
  emission rules of RecallPack, RecallReceipt, TransitionReceipt, AuditEvent are owned by
  Loa-Straylight" and "the MVP endpoint host (Dixie or Finn) is a persistence / exposure surface
  for receipts and audit events; it is not their semantic owner"
  (`loa-straylight/docs/decisions/ADR-022D-mvp-persistence-and-audit-owner.md:47-108`). The threat
  model is explicit that "the wedge does not authenticate the caller; that's an integration-layer
  concern (Dixie / Finn)" (`loa-straylight/docs/mvp/threat-model.md:180-185`). **This fixes the
  auth boundary:** caller authentication / authorization / identity derivation is a Dixie/Finn
  host concern; signer **competence** is a Wedge concern.
- **Signer references are canonical, private, and chained into the receipt/audit hashes.**
  `TransitionReceipt` (`kind` ∈ admission / denied / challenge / revocation / forget) carries
  `transition_id`, `signer_refs` (ID[]), `audit_event_ref`, and `receipt_hash`
  (`loa-straylight/src/straylight/types.ts:364-388`); `AuditEvent` carries `signer_refs`,
  `policy_decision_ref`, `previous_audit_hash`, and `audit_hash` (the per-estate chain link)
  (`types.ts:514-529`). A competent signer for a transition becomes a `signer_ref` in both the
  receipt and the audit event — `signer_refs: candidate.signatures.map((s) => s.signer_id)`
  (`loa-straylight/src/straylight/estate.ts:160` and the replicated transition sites). The
  `audit_hash` is computed over `signer_refs` and all event fields (`audit.ts:13-64`) and
  `verifyChain` detects a broken chain (`audit.ts:77-89`).
- **Signer competence is policy-decided, not a fixed list.** `SignerCompetenceRule` declares
  `required_signer_roles` / `forbid_signer_roles` over `SignerType` (`actor_controller`,
  `operator`, `runtime`, `reviewer`, `policy_service`, `admin`, `wallet`, `service_key`)
  (`types.ts:122-142`, `:185-197`); `evaluateCompetence` enforces them
  (`keyring.ts:77-200`). **Which roles may authorize an admit / reject / supersede transition is a
  policy / keyring decision, not a constant.**
- **Identity is bound at the assertion, transition, and audit levels.** `Assertion` carries
  `estate_id`, `actor_id`, `status` (incl. `active` / `superseded`), `supersedes_refs`,
  `linked_assertion_refs`, `privacy_scope` (`public` / `tenant` / `actor_private` / `sealed`),
  and `recall_scope` (`types.ts:86-94`, `:96`, `:145-167`); `executeRecall` filters candidates
  with `a.estate_id === request.estate_id` and recall requests require non-empty `actor_id` /
  `estate_id` (`loa-straylight/docs/mvp/threat-model.md:168-185`, T6). `privacyDispositionForFrame`
  excludes `actor_private` / `sealed` from public frames and redacts `tenant` in public frames
  (`threat-model.md:148-166`, T5).
- **Production signature material is out of scope at MVP.** The dev signature is an explicit
  HMAC-SHA256 placeholder — "this is not cryptographic authority … a production implementation
  MUST replace this with ed25519/secp256k1/HMAC-with-real-key-material"
  (`loa-straylight/src/straylight/signatures.ts:1-7`); `verifyDevSignature` checks envelope
  self-consistency, not caller identity (`signatures.ts:54-74`).
- **ADR-022E gates #8 / #10 / #12 / #20 are held.** Gate #8 (production database / persistence
  substrate): "`InMemoryStorage` and `JsonlStorage` are the MVP adapters … A separate ADR
  proposes the production adapter, cites the relevant sibling-repo handoff packet, and preserves
  the ADR-022D receipt and audit-chain invariants"
  (`loa-straylight/docs/decisions/ADR-022E-phase-22-deferred-features.md:57`). Gate #10 (Dixie
  boundary wiring), gate #12 (new HTTP / network surface), and gate #20 (threat-model widening for
  the network adversary and cryptographic forgery) are held (`ADR-022E…:59`, `:61`, `:69`). PR #65
  cleared none of these gates.

### 2.3 Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts, reconciled by 33U.** PR #65
  clarified the *vocabulary / design* only; it cleared **no** independent production gate and
  authorized **no** Dixie runtime, production storage / auth / consent, or Freeside integration.
  The still-held rows that gate this auth decision are **F** (production signer/authority), **G**
  (production tenant/estate/actor identity binding), **J** (endpoint idempotency keying), and
  **O** (durable store under ADR-022E gate #8) (33U §4).
- **Residual legacy marker prose.** The `[E,G,H,K,N,O]` / `[J]` marker arrays in the vector JSONs
  and the spike classifier comments are **preserved legacy vector/runtime markers, not the
  current review-state authority**; the authoritative classification lives in the route-vector
  README current-state correction
  ([`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  §7). Phase 46G preserves that distinction and mutates no technical artifact.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the freeside-characters
> 34-/45-series, and Straylight's ADR / PR labels are independent labels in separate
> repositories and must not be conflated. `46G` signals **no** new product epoch and **no** scope
> expansion — it is the same Admission Wedge arc, still docs/decision-only.

---

## 3. Starting accepted facts

These are facts **already accepted** by the chain (33K / 33M / 33U / 33V / 46C / 46D / 46E / 46F),
re-verified read-only here as the baseline the §4–§9 decisions are measured against. None is
changed by this gate.

1. **The dev/operator-only spike auth posture exists and is bounded.** The Phase 33N spike
   authenticates with a dev/operator gate — a dedicated `x-admission-service-token` header and an
   `x-admission-operator-id` allowlist header (`admission-intake.ts:38-44`), evaluated by
   `authorizeAdmissionSpike` with constant-time `safeEqual` comparison
   (`auth-gate.ts:33`, `:49-58`, `:78-95`), failing closed to reject all calls when both the token
   and the allowlist are empty/unset (`auth-gate.ts:70-74`). The route mounts only when
   `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (default off → route not registered;
   `admission-intake.ts:16-17`). This is "a DEV/OPERATOR-ONLY gate, NOT production auth …
   Service authentication here only proves a caller MAY exercise the dev spike; it does NOT prove
   end-user/channel/tenant/surface authorization, and it does NOT implement an end-user consent
   model" (`auth-gate.ts:2-7`).
2. **The global `/api/*` auth gate is the JWT-wallet / `Bearer dxk_` allowlist, and
   `/api/admission` is not exempt from it.** The global allowlist middleware consumes
   `Authorization` (JWT-derived wallet or `Bearer dxk_` API key) and skips only health / auth /
   admin paths — `/api/admission` is **not** on that skip set, so the admission route inherits the
   global gate (`app/src/middleware/allowlist.ts:315-320`; `app/src/middleware/jwt.ts:126-128`).
   The dedicated `x-admission-service-token` header is used **precisely because** the global
   allowlist already owns `Authorization` on `/api/*` and is not exempt for `/api/admission`;
   reusing `Authorization` would collide with that gate, so the dedicated header keeps the spike
   behind **both** the global allowlist (defense-in-depth) and the dev/operator gate
   (`auth-gate.ts:9-21`).
3. **The spike binds no request-derived identity.** The spike request body carries no
   tenant / estate / candidate ids; the synthetic transition is built from fixed dev constants
   (`SYNTH_SOURCE_CANDIDATE_ID` etc.) and never from request-controlled material
   (`admission-intake.ts:114-130`); the optional dev-only ledger records under fixed synthetic
   `(tenant_id, estate_id)` constants injected at deps-time, never derived from the request or the
   global wallet (`admission-intake.ts:100-110`). The handler never reads `c.get('wallet')`.
4. **There are exactly five route-contract vectors and one validator; both are green and
   non-runtime, and they carry the auth/identity/signer no-leak boundary.** All five vectors
   validate, the no-sixth check passes, and the `--self-check` negative-mutation harness reports
   5/5 fail-closed (§15). Every vector carries the false flags `auth_implemented: false`,
   `consent_implemented: false`, `production_admission: false`, `schema_final: false`,
   `route_contract_final: false`, `storage_writes_performed: false`
   (`validate-route-contract-test-vectors.mjs:118-129`, enforced at `:484-486`).
5. **The forbidden-key set already denylists the auth/signer/identity families it covers — but it
   is not a complete denylist of every future canonical durable/private key.** The validator's
   `FORBIDDEN_PUBLIC_KEYS` forbids — as object keys on the public surface at any depth — `signer`,
   `signature`, `signature_material`, `authority_signature`, `authority_signature_material`,
   `authority_signer_type_draft`, `authority_scope_draft`, `policy_details`, `policy_reason`,
   `private_reason_family`, `tenant_id`, `estate_id`, `candidate_id`, `proposing_actor_id`,
   `correcting_actor_id`, `caller_actor_id`, `subject_actor_id`, `actor_id`,
   `operational_tenant_estate_actor_ids`, `idempotency_key`, `idempotency_key_draft`, the private
   `TransitionReceipt` / `AuditEvent` / receipt / transition-id families, and the supersession id
   pair (`validate-route-contract-test-vectors.mjs:236-330`); the runtime spike mirrors this set
   (`no-leak.ts:22-76`). The opaque-run / UUID / hex / JWT / Bearer value walks catch operational
   material of any novel shape at the **value** level (`:213-222`; `no-leak.ts:82-110`). This
   enforces the public/private auth boundary for **the five current Admission Wedge scenarios**;
   it does **not** yet denylist every possible future canonical signer/receipt/audit/consent **key
   name** (§8 records the specific gap).
6. **Straylight owns the canonical signer/receipt/audit substrate; Dixie owns caller
   authentication and ingress references only.** The canonical `TransitionReceipt.signer_refs`,
   `AuditEvent.signer_refs`, the hash chain, and signer competence are Straylight primitives
   (§2.2); Dixie owns the endpoint-local auth gate, the contract / idempotency / replay records,
   ingress references, and the public/private response projection (46E §6; ADR-022D §3).
7. **The production auth / identity / signer / consent / idempotency models remain unresolved and
   blocked.** Rows F / G / J / O are held (33U §4); `identity_binding_final` is false (33K §11);
   `idempotency_final` is false (33V §7); production consent Options A/B remain blocked and Option
   D remains rejected (33K §10; 33V §7); ADR-022E gate #8 is held.

> **What "accepted facts" do and do not mean.** These are **spike-posture, synthetic-ledger,
> design-vocabulary, and vector-surface** facts. They do not constitute a built production auth
> model, an implemented consent model, a frozen identity binding, production signer semantics, or
> any cleared production gate. The §4–§9 decisions exist precisely because the accepted readiness
> is bounded to the dev/operator/spike/synthetic surface and the production models are still
> unresolved.

---

## 4. Auth boundary decisions

This section records, on paper, where the authentication/authorization boundary lies. It decides
nothing runtime; it fixes the boundary a future implementation lane must satisfy.

**(4.1) Service authentication versus end-user authorization — distinct, and Service auth ≠
end-user consent.** Service authentication proves a *service* may call Dixie; it does **not**
prove that the end user, channel, tenant, or surface is authorized, and it does **not** stand in
for an end-user consent model (`auth-gate.ts:2-7`; 33V §5; 33M §12). **Decision:** the two remain
separate concerns. The auth gate (this lane) decides the **service-authentication and
identity-binding** boundary; the **end-user authorization / consent** boundary is decided by the
downstream consent gate (§12). For the dev/operator spike, end-user authorization is **explicitly
excluded** (dev/operator-only; cross-user admission stays blocked), not satisfied.

**(4.2) Dev/operator-only service-token posture versus a production caller model.** The current,
already-accepted posture is **33K Option C** — a dev/operator-only synthetic service-token gate,
disabled-by-default, with no stored production secret (33M §5). The production caller models are
**33K Option A** (service-to-service bearer JWT) and **33K Option B** (signed request envelope),
both with high production suitability; **Option D (no service auth) is rejected**; the final A-vs-B
choice was deferred to the signer review (33K §9). **Decision:** continue the dev/operator-only
Option C posture for the spike unchanged; record Options A/B as the accepted **production
candidates** to be selected in a future implementation/auth gate; keep Option D rejected. The
production auth model is not selected here.

**(4.3) Route-level admission authority.** In the spike, the route is callable **only** by a
dev/operator presenting the configured service token and/or an allowlisted operator id; it is not
callable by a production caller and not by an end user (33M §7 / §12). **Decision:** route-level
admission authority remains dev/operator-only for the spike. A production route-level authority
(which authenticated caller principals may invoke admission, under which policy) is a future
decision tied to the production caller model (4.2) and the signer/authority model (§6).

**(4.4) Endpoint-local admission token / header expectations.** The spike reads a dedicated
`x-admission-service-token` header and an `x-admission-operator-id` header
(`admission-intake.ts:38-44`); comparisons are constant-time (`auth-gate.ts:49-58`, `:78-95`); an
empty token **and** empty allowlist rejects all calls (no production default;
`auth-gate.ts:70-74`). **Decision:** preserve the dedicated-header expectation. A future
production caller model may layer Option A/B credentials on top, but **must not** reuse
`Authorization` for the dev/operator token while the global allowlist owns it (4.5); any
production header/credential shape is decided in the future implementation lane.

**(4.5) Interaction with the existing global `/api/*` auth.** The global allowlist consumes
`Authorization` (JWT wallet or `Bearer dxk_` api key) and is **not** exempt for `/api/admission`
(`allowlist.ts:315-320`); the dedicated `x-admission-service-token` header therefore keeps the
spike behind **both** the global allowlist and the dev/operator gate, with no collision
(`auth-gate.ts:9-21`). **Decision:** the production admission route remains a defense-in-depth
composition — the global `/api/*` gate first, then an admission-specific authority — and the
admission-specific credential stays on a dedicated header (or an equivalent non-colliding carrier)
rather than overloading the global `Authorization` carrier.

**(4.6) Fail-closed behavior for missing, malformed, expired, replayed, or unauthorized
credentials.** Today the spike fails closed on every credential failure with a single stable
public-safe refusal that never reveals which gate failed: disabled → 404, unauthorized → 403,
malformed / oversized / parse failure → 400, and a no-leak-guard failure → a hardcoded 500
fallback (`admission-intake.ts:271-333`, `:247-270`). **Decision:** fail-closed remains the
required posture for **all** credential failures. The spike does **not** model **expired** or
**replayed** credentials today (there is no token expiry and no nonce/anti-replay on the
dev/operator token); a production auth model must add expiry and anti-replay handling, and these
remain unresolved future-implementation requirements — not decided or built here.

---

## 5. Identity-binding decisions

This section records the identity-binding model. It builds nothing; the production binding stays
unresolved (Row G held).

| Binding | Decision (docs-only) | Grounding |
|---|---|---|
| **Tenant binding** | `tenant_id` is a **Dixie host-layer** binding (resolved host-side, e.g. via a tenant resolver), **not** a Straylight primitive. In the spike it is a fixed synthetic isolation constant; the production tenant binding stays unresolved. | 33K §11; 33V §7; `admission-intake.ts:100-110`; Row G held. |
| **Estate binding** | `estate_id` **mirrors the canonical Straylight primitive** (`types.ts:147`). The synthetic ledger already enforces that an estate cannot be silently re-homed to a foreign tenant (`admitted-assertion-ledger.ts:712-719`, `:1022-1028`) — a property the production binding must preserve. | 33V §7; Straylight `types.ts:145-167`. |
| **Actor binding** | `actor_id` mirrors the canonical Straylight primitive (`types.ts:148`). `proposing_actor_id` / `correcting_actor_id` / `caller_actor_id` / `subject_actor_id` / `actor_id` are all **forbidden public keys** (`validate-route-contract-test-vectors.mjs:242-245`); the runtime mirrors them (`no-leak.ts:28-31`). | 33V §7; validator `:237-246`. |
| **Candidate subject binding** | A candidate is **not** an admitted assertion (Row B); the subject of a candidate maps to canonical `subject_refs`, **not** a coined `subject_actor_id`. Dixie holds ingress references only. | 33U §4 Row B; 33V §7. |
| **Caller actor binding** | The spike does **not** derive the caller identity from the global JWT wallet (`c.get('wallet')` is never read); the caller→actor binding for production (which authenticated principal becomes which `actor_id`) is unresolved. | `admission-intake.ts` (no wallet read); Row G held. |
| **Operator / dev-only actor constraints** | The `x-admission-operator-id` allowlist constrains the spike to allowlisted operators; this is a **non-production** isolation mechanism, never the production actor model. | `auth-gate.ts:42-47`, `:87-93`; 33M §5. |
| **Cross-tenant / cross-estate denial** | Cross-tenant / cross-estate access must **fail closed**. Canonical recall filters `a.estate_id === request.estate_id` (threat-model T6); the Dixie ledger throws `foreign_tenant` on a re-home attempt (`admitted-assertion-ledger.ts:712-719`). | threat-model T6; ledger `:712-719`. |

**(5.1) The binding-level decision.** Identity binding is **not** a single-level property; the
canonical primitives bind identity at the **assertion level** (`Assertion.estate_id` /
`actor_id`), the **transition level** (`TransitionReceipt.estate_id` / `actor_id`), and the
**receipt / audit level** (`AuditEvent.estate_id` / `actor_id` / `signer_refs`)
(`types.ts:145-167`, `:364-388`, `:514-529`). **Decision:** the production model must bind
identity at **all of these levels** — request-level (the authenticated caller principal,
**session-derived, never trusted from the request body** — 33K §11), and propagated into the
transition-level, assertion-level, and receipt/audit-level records. **No caller-supplied override
of the bound identity is permitted.** This is recorded as the required production binding; it is
not implemented here, and the final production binding remains unresolved (Row G).

---

## 6. Signer / authority model

This section records who may act and who/what produces the signed/audited artifacts. It builds no
signer code; production signer semantics remain unresolved (Row F held).

| Authority question | Decision (docs-only) | Grounding |
|---|---|---|
| **Who can propose a candidate** | A caller authenticated by the service-auth model (4.2) and authorized by policy; the **competent proposing signer** is decided by `SignerCompetenceRule` / `Keyring` / policy, **not** a fixed list. The dev spike has no proposer role (synthetic). | 33V §5; `keyring.ts:77-200`; `types.ts:185-197`. |
| **Who can accept a candidate** | The competent accepting signer per `SignerCompetenceRule` / `Keyring` / policy; `policy_service` is a safe canonical `SignerType` to mirror. Not a fixed list. | 33K §5 Row F; 33V §7. |
| **Who can reject a candidate** | Same policy/keyring-decided competence; a rejected candidate mints no admitted assertion (§10 invariant 2). | 33V §5; reject vector. |
| **Who can supersede / correct an admitted assertion** | The competent correcting signer per policy/keyring; correction is the `(superseded, active)` relation, not a coined `corrected_active` status (review row N). The prior is flipped to `superseded`. | 33V §7; 46F §8; Straylight `types.ts:145-167`. |
| **Who can produce / authorize a TransitionReceipt** | The **Wedge** emits the `TransitionReceipt`; its `signer_refs` are the `signer_id`s of the competent signers that participated (`estate.ts:160`). The host (Dixie / Finn) is a **persistence / exposure surface, not the semantic owner** (ADR-022D §1 / §3). | ADR-022D §47-108; `types.ts:364-388`; `estate.ts:160`. |
| **Who can produce / authorize an AuditEvent** | The **Wedge** emits the append-only, hash-chained `AuditEvent`; `signer_refs` are folded into the `audit_hash` chain (`audit.ts:13-64`), and a tampered chain is detectable via `verifyChain` (`audit.ts:77-89`). | ADR-022D §1; `types.ts:514-529`; `audit.ts`. |
| **Which signer references must be stored / linked later** | The canonical **private** refs: `TransitionReceipt.signer_refs` / `audit_event_ref` / `receipt_hash`, and `AuditEvent.signer_refs` / `policy_decision_ref` / `previous_audit_hash` / `audit_hash`. These persist on the canonical Straylight primitives; Dixie stores ingress references onto them, never the canonical copy. All are private and never public (§8). | `types.ts:364-388`, `:514-529`; ADR-022D §3. |

**(6.1) What remains unresolved before production signer semantics.** Production signer/authority
semantics are an **independent unresolved gate** (Row F held): which `SignerType` roles may
authorize an `admit_assertion` / reject / supersede transition is a policy / `SignerCompetenceRule`
/ `Keyring` decision still to be made; the production **signature substrate** (ed25519 /
secp256k1 / real-key HMAC) is out of scope at MVP, where only the dev HMAC-SHA256 placeholder
exists (`signatures.ts:1-7`); and **cross-estate / delegated authority** is unresolved in
Straylight (33K §5 Row F). The `authority_*_draft` field names stay **Dixie draft**, never
production names. **None of this is decided or built here.**

---

## 7. Replay / idempotency authority

This section records how auth identity interacts with replay/idempotency. It decides nothing
final; Row J (endpoint idempotency keying) is held and `idempotency_final` is false.

- **How auth identity interacts with idempotency keys.** Idempotency is **Dixie / endpoint-owned**
  (absent from Straylight; Straylight confirms delegation/compatibility only — 33U Row J). The
  endpoint key scope **should include `tenant_id` / `estate_id` / subject / transition intent**
  (33K §8). **Decision:** the production idempotency key is **scoped by the bound identity** — a
  retry under a different identity binding is a different idempotency scope, not a collision. This
  ties the idempotency authority to the §5 binding decision; the final keying (candidate-id vs
  header vs both) stays undecided (Row J).
- **Whether replay is scoped by tenant / estate / actor / caller.** In the synthetic spike ledger,
  `replay_key` handling is scoped per estate within a `(tenant_id, estate_id)` slot
  (`admitted-assertion-ledger.ts:743-759`); the production scope must additionally reflect the
  bound caller/actor per the key-scope decision above. **Decision:** production replay is scoped by
  the bound identity (tenant + estate + actor/caller + transition intent), not globally.
- **Who can replay or query a prior result.** An identical replay returns the **prior public
  envelope** (private telemetry only); there is **no public `admission.duplicate_replay` code** and
  no `duplicate_replay` token anywhere on the public surface
  (`validate-route-contract-test-vectors.mjs:23-25`, `:451-466`). **Decision:** only a caller bound
  to the same identity as the original may receive the prior result; a foreign-identity replay is
  out of scope (a different identity is a different key scope) and must fail closed if it ever
  collides.
- **Conflict semantics when the same idempotency key is used with different identity bindings.**
  In the spike, the same `replay_key` with a different content fingerprint fails closed
  (`replay_key_content_mismatch`; `admitted-assertion-ledger.ts:755-759`); conflicting retries
  "should fail closed or be explicitly deferred" (33M §11). **Decision:** a same-key / different-
  identity-binding (or different-intent) collision **fails closed** — it never silently coalesces
  across identities and never mints a duplicate assertion or correction.
- **Non-authorization of implementation.** This section authorizes **no** idempotency
  implementation. `idempotency_final` is false; Row J is held; the final endpoint keying stays a
  future Dixie-owned decision.

---

## 8. Public / private boundary

This section records the auth/identity/signer public/private projection. It changes no vector and
no validator.

- **Public responses must leak no auth/identity/signer material.** Service tokens, auth headers,
  signer / signature / authority material, private identity bindings (tenant / estate / actor
  ids), raw actor credentials, private `TransitionReceipt` / `AuditEvent` / receipt material, and
  debug traces must **never** appear on a public route response. This is enforced for the current
  scenarios by `FORBIDDEN_PUBLIC_KEYS` (`validate-route-contract-test-vectors.mjs:236-330`),
  mirrored in the runtime (`no-leak.ts:22-76`), plus the substring / pattern walls that catch
  opaque token / JWT / Bearer / UUID / long-hex / long-opaque **values** of any shape
  (`no-leak.ts:82-110`; validator `:213-222`). The public body is built **purely from the
  classification** plus fixed synthetic placeholders and is deep-walked through the runtime
  no-leak guard on **every** response path before serialization, failing closed to a hardcoded
  known-safe fallback that carries none of the guard's findings
  (`public-response.ts:1-10`, `:91-93`; `admission-intake.ts:247-270`).
- **Public responses may include only a safe public receipt reference if allowed by prior gates.**
  The single field that legitimately crosses from the private side to the public side is
  `public_receipt_ref` (a public-safe DRAFT string where minted, or `null`) — never a private
  receipt id, signer ref, or audit ref (33V §4 / §7; validator string-or-null enforcement). No
  auth/identity/signer field crosses the boundary.
- **Private `TransitionReceipt` / `AuditEvent` may need auth/signer refs later, but never
  exposed publicly.** The canonical `signer_refs` / `audit_event_ref` / `receipt_hash` /
  `audit_hash` / `policy_decision_ref` are stored on the **private** Straylight primitives and
  referenced privately by Dixie; they belong to the private `expected_private_or_audit_effect`
  block (which the validator's public-surface walk excludes) and to the canonical private records,
  never to the caller-observable response.

> **Known canonical-key hardening gap (recorded, not closed here).** The current route-vector
> validator and the runtime `no-leak.ts` denylist do **not** explicitly forbid the **canonical**
> Straylight signer/receipt/audit ref **key names** `signer_refs`, `audit_event_ref`,
> `receipt_hash`, `audit_hash`, `policy_decision_ref`, `assertion_refs`, `target_refs`, and
> `previous_audit_hash`, nor the consent key names `consent` / `consent_ref` / `auth_decision` —
> all are **absent** from `FORBIDDEN_PUBLIC_KEYS` (`validate-route-contract-test-vectors.mjs:236-330`)
> and from `no-leak.ts:22-76`. This is a **known hardening gap, not a current leak**, and is
> exactly parallel to the `supersedes_refs` / `linked_assertion_refs` gap recorded in 46F §8 / §9:
> (a) the fixed public-response builder (`buildAdmissionSpikePublicResponse`,
> `public-response.ts`) emits **none** of these fields, so there is no present leak path through
> the serializer; and (b) opaque **values** carried under those names (hashes, signer ids, audit
> ids) of UUID / long-hex / long-opaque / JWT / Bearer shape would still be caught by the
> value-pattern walls (`no-leak.ts:82-110`; validator `:213-222`) — only short, safe-looking
> values under those exact key names would slip the key check. Phase 46G records this as future
> validator/runtime hardening (§11, §11 exit criterion 8); it adds nothing here because this slice
> is docs-only and the fixed serializer emits none of those fields. It must **not** be read as a
> claim that the denylist already covers every future canonical signer/consent key name — it does
> not.

---

## 9. Options and selected next lane

The charter asks Phase 46G to present and assess several auth-model options and select the safest
next lane. Each option is assessed for what it proves and its production-readiness blockers.

### Option 1 — Continue the dev/operator-only service-token model (current posture)

The already-accepted 33K Option C posture: a dev/operator-only synthetic gate, disabled-by-default,
no stored production secret, dedicated `x-admission-service-token` + `x-admission-operator-id`
headers behind the global allowlist (§4). **Proves:** the spike is not public; the no-leak boundary
holds; defense-in-depth composition with the global gate. **Does not prove:** any production caller
model, end-user authorization, or production identity binding. **Disposition: retained unchanged**
as the only authorized route auth posture; this is the safe floor.

### Option 2 — Endpoint-local admission authority model

A production endpoint-local admission authority (an admission-specific principal / policy enforced
at the route, layered behind the global `/api/*` gate). **Proves:** route-level admission authority
distinct from the global gate. **Blockers:** depends on the production caller model (4.2) and the
signer/authority model (§6), both unresolved; needs the durable store to persist the auth decision
(ADR-022E gate #8 held). **Disposition: recorded as a production candidate, deferred.**

### Option 3 — Straylight-compatible signer-reference model

Align the Dixie auth/identity records to the canonical `signer_refs` / `SignerCompetenceRule` /
`Keyring` vocabulary so that a future durable lane stores/links the canonical private signer refs
(§6). **Proves:** vocabulary/reference compatibility with the canonical substrate; the
`policy_service` `SignerType` is safe to mirror. **Blockers:** production signer semantics (Row F)
and the production signature substrate are unresolved; the host still owns caller authentication
(ADR-022D §3). **Disposition: accepted as the reference *direction* for the future durable lane**
(records only the reference shape, not production semantics).

### Option 4 — Finn / Hounfour-mediated signer validation later

Defer production signer validation to a Finn / Hounfour-mediated path (the canonical wiring host).
**Proves:** nothing now. **Blockers:** ADR-022E gates #10 (Dixie/host boundary wiring) and #12 (new
network surface) are held; this is downstream of the durable-store gate. **Disposition: deferred to
a future, separately-gated lane.**

### Option 5 — Freeside caller / tenant-mediated model later

Defer production caller/tenant identity to a Freeside-mediated client contract (the cross-repo
consumer). **Proves:** nothing now. **Blockers:** the freeside-characters mirror is test-only, not
exported, not runtime-wired (45J / PR #177); the consent-boundary handoff stays deferred.
**Disposition: deferred to a future cross-repo handoff lane.**

### Option 6 — Production auth model deferred

Do not select a production auth model in this gate; record the boundary and defer. **Proves:** that
the production auth/identity/signer decisions are scoped and their blockers named, without
overreaching. **Disposition: this is the safe decision for the production layer** — the production
caller/auth model is not selected here.

> **Selected posture and next lane (docs/decision-only):**
> **retain Option 1** (dev/operator-only) as the only authorized route auth posture; **accept
> Option 3** as the signer-*reference* direction for the future durable lane; **defer Options 2 /
> 4 / 5 and the production auth model (Option 6)** to future, separately-gated lanes. **Select the
> consent proof / receipt decision gate** (docs/decision-only) as the next lane — it is the natural
> successor in the established ordering (46F §14 step 4), and the consent boundary is the tightly
> coupled sibling the auth decision references (46D §6 Option B). This selection authorizes no
> runtime work.

---

## 10. Required invariants preserved

Phase 46G preserves **all** of the following (each already enforced in synthetic / spike / vector
form where cited; the production auth/identity/signer model must carry each forward unchanged):

1. **A pending candidate is not recallable.** Only active, recall-eligible assertions enter the
   recall projection; the pending vector has empty recall and `public_receipt_ref: null`.
2. **A rejected candidate creates no admitted assertion.** reject vector
   `expected_private_or_audit_effect.no_admitted_assertion = true`; `synthTransitionFor` returns no
   transition for reject (`admission-intake.ts:162-167`).
3. **An accepted candidate creates / references an admitted assertion.** accept vector
   `admitted_assertion_status_class = "active"`; the candidate→transition→assertion chain intent.
4. **A superseded assertion is excluded from ordinary recall** unless explicitly requested/marked.
   Supersession flips the prior to `superseded` / `recall_eligible: false`
   (`admitted-assertion-ledger.ts:880-887`).
5. **A malformed / unsafe payload fails closed.** malformed vector `must_fail_closed = true`; the
   classifier accepts only the five forms and fails closed otherwise.
6. **Missing / unauthorized auth fails closed.** Disabled → 404, unauthorized → 403, malformed →
   400, one stable refusal that never reveals which gate failed; both-empty rejects all
   (`admission-intake.ts:271-333`; `auth-gate.ts:70-95`).
7. **The public response leaks no raw / private / audit / debug / source / auth / signer
   material.** The public-surface walk + `FORBIDDEN_PUBLIC_KEYS` + substring / pattern / UUID /
   opaque-run walks (`validate-route-contract-test-vectors.mjs:236-330`, `:213-222`); runtime
   mirror (`no-leak.ts:22-110`).
8. **Private `TransitionReceipt` / `AuditEvent` material remains private.** Forbidden on the public
   surface at any depth; the canonical signer/receipt/audit refs live on the private primitives
   (§6, §8).
9. **User chat does not become memory merely because it was said.** No Discord / freeform ingestion
   and no user-chat-as-memory path; the spike accepts only a synthetic dev-spike marker + draft
   transition discriminator.
10. **Public `remember-this` remains blocked.** No public / unauthenticated `remember-this` surface
    is designed or authorized.
11. **Discord / freeform history ingestion remains blocked.** Unchanged.
12. **Production admission / storage / auth / consent remain blocked.** ADR-022E gate #8 held;
    `auth_implemented` / `consent_implemented` / `production_admission` / `storage_writes_performed`
    all false on every vector.
13. **Route-contract freeze and final schema freeze remain blocked.** `route_contract_final` /
    `schema_final` false on every vector; Phase 46G freezes neither.
14. **ADR-022E gate #8 remains uncleared.** Phase 46G is not the gate-clearing ADR and clears
    nothing.
15. **Auditability without rewriting history.** The canonical audit log is append-only,
    hash-chained, and tamper-detectable via `verifyChain` (`loa-straylight/src/straylight/audit.ts:77-89`;
    ADR-022D audit-chain invariant).

---

## 11. Exit criteria for any future implementation lane

A future lane may begin auth / identity / signer **implementation** only after **all** of the
following are produced and accepted. Phase 46G satisfies **none** of these (it is a decision gate);
they are the bar a downstream lane must clear:

| # | Exit criterion | Owning future gate |
|---|---|---|
| 1 | **Accepted service-auth model** — the production caller model (33K Option A vs B selected), with Option D kept rejected, layered behind the global `/api/*` gate without `Authorization` collision. | Auth implementation lane. |
| 2 | **Accepted end-user authorization / consent boundary, or an explicit dev-only exclusion** — service auth ≠ end-user consent; cross-user admission stays blocked until a consent model exists. | Consent proof / receipt decision gate (the §12 next lane) + consent implementation lane. |
| 3 | **Accepted tenant / estate / actor binding model** — session-derived, no caller-supplied override; bound at request / transition / assertion / receipt / audit levels (§5). | Production identity-binding gate (Row G). |
| 4 | **Accepted signer / authority reference shape** — canonical `signer_refs` / `SignerCompetenceRule` / `Keyring` competence; the production signature substrate (ed25519 / secp256k1 / real-key HMAC); cross-estate / delegated authority resolved (§6). | Production signer/authority gate (Row F). |
| 5 | **Accepted replay / idempotency identity binding** — the final endpoint keying (candidate-id vs header vs both), scoped by the bound identity, with same-key / different-identity collisions failing closed (§7). | Route-contract idempotency decision (Row J). |
| 6 | **Accepted public / private auth projection** — the production no-leak serializer enforcing `privacy_scope` + frame disposition, **including the canonical signer/consent key-name forbidden-key hardening** (`signer_refs` / `audit_event_ref` / `receipt_hash` / `audit_hash` / `policy_decision_ref` / `consent` / `consent_ref` / `auth_decision`, today absent from the denylist) once a lane emits those fields internally (§8). | No-leak serializer design gate + validator-hardening lane. |
| 7 | **Accepted failure taxonomy** — fail-closed for missing / malformed / **expired** / **replayed** / unauthorized credentials, with expiry and anti-replay modeled (§4.6). | Auth implementation lane. |
| 8 | **Executable tests / vector / validator plan** — extending the existing vectors and `--self-check` for the auth/identity/signer model, still no-leak-bounded, including the canonical signer/consent key-name hardening above. | Implementation-spike readiness checklist. |
| 9 | **Codex audit acceptance before PR** of the auth / identity / signer design / implementation. | The implementing lane's review/audit gate. |

> Exiting Phase 46G authorizes **no** runtime implementation. It records the auth boundary (§4),
> the identity-binding model (§5), the signer/authority model (§6), the replay/idempotency
> interaction (§7), the public/private projection (§8), the option assessment (§9), the invariants
> (§10), and the criteria above; the build remains blocked until a future, separately-gated lane
> satisfies them.

---

## 12. Selected next lane and dependency ordering

> **Selected next lane: the consent proof / receipt decision gate (docs/decision-only; not
> runtime).**

**Reason.** With the durable storage direction (46E) and shape (46F) decided, and the auth /
identity / signer boundary now recorded (this gate), the remaining undecided sibling in the
storage/auth/consent cluster is **consent** — the end-user authorization boundary this gate
explicitly held separate from service authentication (§4.1). Phase 46F §14 sequenced exactly this:
the consent gate is step 4, after the auth / identity / signer gate (step 3, this gate); and 46D
§6 Option B noted the auth decision is "tightly coupled to consent (C)". The consent gate decides,
on paper, the production consent-proof model (33K §10 Option A explicit consent artifact vs Option
B platform-mediated grant; Option D rejected), the consent-receipt private-audit binding, and the
dev-only omission marker — **docs/decision-only, no runtime, no consent implementation.**

**Dependency ordering after Phase 46G** (carried from 46E §10 / 46F §14; step 3 now complete):

1. Phase 46E — durable storage **model direction** decided. *(Done; PR #150.)*
2. Phase 46F — durable storage **shape & route-vector alignment** decided. *(Done; PR #151.)*
3. **Phase 46G — auth / identity / signer authority decision.** *(This gate — docs-only; no
   vector/validator change.)*
4. **Consent proof / receipt decision gate** — the production consent-proof model and
   consent-receipt private-audit binding. *(Selected next lane.)*
5. **Durable-store design gate + ADR-022E gate-#8-clearing ADR** — authors the durable data model,
   schema, migration scope, rollback plan, physical adapter placement, and persists the accepted
   auth/identity/signer/consent references; clears ADR-022E gate #8 preserving the ADR-022D
   invariants. *(The build precondition; held.)*
6. **Final route-contract pre-freeze gate.**
7. **Implementation-spike readiness checklist.**
8. **Bounded default-off implementation spike** — only if the checklist is satisfied.
9. **Smoke / acceptance gate.**
10. **Freeside Characters client-contract handoff.**

> **Implementation remains downstream.** Steps 4–10 are each held. The only step Phase 46G advances
> is **step 3** — recording the auth / identity / signer decision — which is itself
> docs/decision-only. Runtime implementation is not the next step.

---

## 13. Blocked lanes

Phase 46G is a bounded, docs/decision-only auth/identity/signer decision gate. It authorizes
**none** of the following; each remains **blocked** and is **not** unblocked by recording the auth
decision or selecting the consent gate:

- production auth implementation; production caller/auth model selection or build; auth is not
  implemented;
- end-user authorization / consent implementation; consent is not implemented; cross-user
  admission;
- production identity binding (tenant / estate / actor); identity binding is not finalized;
- production signer / authority semantics; the production signature substrate (ed25519 /
  secp256k1 / real-key HMAC);
- final idempotency / replay semantics (Dixie / endpoint-owned; undecided; Row J);
- durable Admission Wedge storage implementation (ADR-022E gate #8 held); DB writes; migrations; a
  durable data model, schema, or table definition; storage is not implemented;
- route / API handler implementation **beyond the existing Phase 33N spike**; production admission;
- public `remember-this`; Discord command / history ingestion; user chat becoming memory;
- Freeside Characters runtime / client integration; package exports;
- the final Dixie route contract; route-contract freeze; production route deployment;
- production readiness of any kind; final / production schema freeze;
- LLM / voice; Finn production wiring; forget / revoke / correction UI (MVP-3-adjacent);
- **any mutation of the five route-vector JSONs, the route-vector validator, the route-vector
  README, the Phase 33E fixtures, or the Phase 33E fixture validator** (§1, §8).

> **An auth decision does not authorize runtime implementation.** Recording the auth / identity /
> signer boundary and selecting the consent gate makes the next decision legible; it does **not**
> build auth, **not** implement consent, **not** bind production identity, **not** implement signer
> semantics, **not** build a store, **not** clear any production gate, **not** freeze the route
> contract or schema, and **not** authorize any route / storage / auth / consent / Freeside /
> package-export work. The Phase 33N dev/operator-only, disabled-by-default spike remains the only
> authorized route surface, and the do-nothing / synthetic-only posture (46E Option 6) remains in
> force.

If a later phase reaches for any of the above, it must re-open the Phase 33K precondition design,
the Phase 33M authorization gate, the Phase 33P / 33Q / 33R storage lane, the Phase 33U / 33V
chain, the Phase 46A–46F gates and this gate, and the relevant ADRs (Straylight-repo ADR-022E
durable-store gate #8 and related gates #10 / #12 / #20; ADR-022D receipt/audit-chain invariants;
ADR-026C / ADR-026D route guardrails) first; it must not silently expand scope.

---

## 14. Corruption / duplicate guard

Phase 46G applies an explicit corruption / duplicate guard to **this** document (carried from the
Phase 46E / 46F precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 17.`) appears
  exactly once.
- **Numbered sections appear once each.** Sections 1–17 each appear exactly once; the guard counts
  `^## N\.` occurrences and asserts one per number.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:"
  token, a trailing one-word report heading, prose-claim dumps, or pasted terminal transcript
  appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row; no
  duplicated / truncated / wrapped table fragments appear.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is
  the §15 validation command list.

The guard commands and their recorded results are in §15.

---

## 15. Validation

All commands were run from the repository root
(`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46G is docs/decision-only — it adds only this
document and mutates no vector, validator, or fixture — so the validators are run only to confirm
the unchanged artifacts remain green. The fence-balance and negative-claim checks avoid embedding
affirmative-claim substrings in prose, so they cannot self-match.

```bash
git branch --show-current
git status --short --branch --untracked-files=all
git diff --check
git diff --name-status
git diff --stat
# Nothing-staged check (this lane stages nothing):
git diff --cached --name-status
git diff --cached --check
# Unchanged-artifact green-check (no mutation here):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# Self-reference / next-lane label check (grep -E so `|` is real alternation):
grep -E "Phase 46F|Phase 46G" docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md
# Duplicate/corruption grep (advisory):
grep -nE "Claude said|Patch Report|terminal report|RESULT:|Report$" docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md || true
# Enforcing negative check — fail if any affirmative readiness / freeze / implementation /
# authorization claim appears in PROSE. The patterns are affirmative-only and word-boundaried,
# so the document's negated prose ("does not freeze …", "is not production-ready", "auth is not
# implemented", "remains uncleared") and the fenced validation commands below are deliberately
# NOT matched. It is NOT masked with `|| true`:
python3 - <<'PY'
import re
from pathlib import Path
p = Path("docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md")
patterns = [
    r"\bruntime implementation is selected\b",
    r"\bimplementation is authorized\b",
    r"\broute contract is frozen\b",
    r"\bschema is frozen\b",
    r"\bstorage is implemented\b",
    r"\bthe durable store is built\b",
    r"\bmigration is applied\b",
    r"\bgate #8 is cleared\b",
    r"\bis production[- ]ready\b",
    r"\bproduction[- ]readiness is (?:declared|achieved|confirmed|established|met)\b",
    r"\bdb writes? (?:is|are) authorized\b",
    r"\bvectors? (?:was|were) (?:modified|mutated|changed)\b",
    r"\bvalidator (?:was|were) (?:modified|mutated|changed)\b",
    r"\bauth is implemented\b",
    r"\bconsent is implemented\b",
    r"\bidentity binding is (?:final|frozen|finalized|implemented)\b",
    r"\bsigner (?:authority|semantics) (?:is|are) (?:final|frozen|implemented|production[- ]ready)\b",
    r"\bproduction auth model is (?:selected|frozen|final|implemented|authorized)\b",
]
regexes = [re.compile(pat, re.IGNORECASE) for pat in patterns]
fence = chr(96) * 3
inside_fence = False
hits = []
for idx, line in enumerate(p.read_text().splitlines(), 1):
    if line.strip().startswith(fence):
        inside_fence = not inside_fence
        continue
    if inside_fence:
        continue
    if any(rx.search(line) for rx in regexes):
        hits.append((idx, line))
if hits:
    for idx, line in hits:
        print(f"{idx}: {line}")
    raise SystemExit(1)
print("The enforcing scan found no affirmative readiness/freeze/build/authorization/auth-implementation claims outside fenced validation commands.")
PY
# Fence-balance check (dependency-free; even count = balanced; char-code form avoids embedding
# a literal triple-backtick that would unbalance this doc):
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

Recorded results for this lane (see the message body accompanying this work for the captured
terminal output):

- **docs-only scope check** — only the single new file
  `docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md` is added; no route-vector
  JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, `app/`,
  `src/`, `tests/`, package / lockfile, config / env, CI, migration, runtime, or generated file is
  touched;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no `git add` / commit /
  push);
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator reports 5/5
  probes valid, 0 failures; the route-contract test-vector validator reports 5/5 vectors valid, 0
  failures, no sixth vector; the `--self-check` negative-mutation harness reports 5/5 mutations
  fail closed;
- **self-reference label check** — `grep -E "Phase 46F|Phase 46G"` confirms both the `Phase 46F`
  (predecessor) and `Phase 46G` (self) labels are present;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the seventeen
  headings 1–17 exactly once each;
- **duplicate/corruption grep** — the advisory grep finds no pasted terminal-report fragment in the
  document body;
- **negative readiness-claim check (enforcing)** — the `python3` scan excludes fenced lines and
  reports the affirmative-only, word-boundaried patterns (including auth/consent/identity/signer
  implementation claims) found no match outside the fenced validation commands; the document's
  **negated** prose is correctly not matched. The scan is not masked with `|| true`;
- **fence-balance check** — the dependency-free `node -e` counter reports an even (balanced)
  triple-backtick count; the single fenced block is the validation command list above.

---

## 16. Success criteria for Phase 46G

Phase 46G succeeds if and only if:

1. **Docs / decision-only** — it creates only this Phase 46G document; it changes **no**
   route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture
   validator, runtime source, test, route, store, migration, auth, consent, config, env, package,
   lockfile, CI, or generated file, and edits **no** adjacent repository (§1, §8).
2. **Source chain / evidence intake recorded** — the Dixie chain (33G / 33K / 33L / 33M / 33N /
   33P / 33Q / 33R / 33U / 33V / 33W–33Z → 46A → 46B → 46C → 46D → 46E → 46F → 46G), the canonical
   Straylight signer/identity substrate, and the held ADR-022E gates are summarized (§2).
3. **Starting accepted facts recorded** — the dev/operator spike posture, the global `/api/*`
   gate, the no-request-identity binding, the five green vectors, the forbidden auth/signer/identity
   fields, and the held gates (§3).
4. **Auth boundary decided** — service auth vs end-user authorization; dev/operator service-token
   vs production caller model; route-level admission authority; endpoint-local header expectations;
   global `/api/*` interaction; fail-closed taxonomy incl. the deferred expired/replayed handling
   (§4).
5. **Identity-binding model decided** — tenant / estate / actor / candidate-subject / caller-actor
   / operator-dev bindings; cross-tenant / cross-estate denial; binding at request / transition /
   assertion / receipt / audit levels, session-derived, no caller override (§5).
6. **Signer / authority model decided** — who proposes / accepts / rejects / supersedes; who
   produces / authorizes a TransitionReceipt / AuditEvent; which signer refs persist; what remains
   unresolved before production signer semantics (§6).
7. **Replay / idempotency authority decided** — auth-identity ↔ idempotency-key interaction;
   replay scoped by bound identity; who replays/queries; same-key / different-identity conflict
   fails closed; no implementation authorized (§7).
8. **Public / private boundary decided** — no leak of token / header / signer / identity / actor /
   audit / debug material; only a safe public receipt reference may cross; private receipt/audit
   refs stay private; the **known canonical signer/consent key-name hardening gap** recorded rather
   than overclaimed (§8).
9. **Options assessed and safest next lane selected** — the six auth-model options assessed; the
   dev/operator posture retained, the signer-reference direction accepted, the production auth
   model deferred; the consent gate selected (§9, §12).
10. **Required invariants restated** — pending not recallable; rejected mints nothing; accepted
    creates/references; superseded excluded; malformed fails closed; missing/unauthorized auth fails
    closed; public no-leak; private receipt/audit private; not user-chat memory; public remember-this
    blocked; Discord ingestion blocked; production admission/storage/auth/consent blocked;
    route-contract + schema freeze blocked; ADR-022E gate #8 uncleared; auditability without history
    rewrite (§10).
11. **Exit criteria recorded** — the nine exit criteria for any future implementation lane, none
    satisfied by Phase 46G (§11).
12. **Next lane selected + ordering updated** — the consent proof / receipt decision gate selected;
    the post-46G ordering recorded with implementation downstream (§12).
13. **Blocked lanes preserved** — no auth / consent / identity / signer / durable / DB-write /
    migration / schema / route / Freeside / package / production-readiness lane is authorized, and no
    vector / validator / fixture is mutated (§13).
14. **Corruption / duplicate guard applied** — the document passes the §14 guard, with results
    recorded in §15.
15. **No freeze, no production-readiness claim, no gate clearance** — Phase 46G freezes neither the
    route contract nor the schema, declares no production readiness, and does **not** clear ADR-022E
    gate #8 (§1, §13).

---

## 17. Cross-references

- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 46F (PR #151); its §14 selected this Phase 46G auth / identity / signer authority
  decision gate as the next lane and scoped it against the now-decided storage shape.
- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md)
  — Phase 46E (PR #150); selected the storage model direction and sequenced the auth gate
  downstream (§10 step 3).
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md)
  — Phase 46D (PR #149); §6 Option B described what an auth/identity/signer decision gate proves
  and deferred it to step 3 of the ordering.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md)
  — Phase 46C (PR #148); §4.2 decomposed the auth blockers into ordered sub-gates.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V (PR #140); reaffirmed service auth ≠ end-user authorization, mirrored `policy_service`,
  fixed identity binding as session-derived, split `AuditEvent` / `TransitionReceipt`.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K (PR #129); stated the service-auth Options A/B/C/D, the identity-binding rule, the
  idempotency precondition, and the consent Options A/B (D rejected).
- [`docs/ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)
  — Phase 33M; authorized the dev/operator-only spike, Option C only, default-off, Service auth ≠
  end-user consent (§12), fail-closed (§9), idempotency draft/dev-only (§11).
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U (PR #139); the A–O reconciliation (rows F / G / J / O held; Row B) grounding §2 / §5
  / §6 / §7.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  with the five vector JSONs — inspected **read-only** to ground the auth/signer/identity
  forbidden-key set, the no-leak boundary, and the false flags. **None is modified.**
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/{auth-gate,classifier,public-response,no-leak,admitted-assertion-ledger}.ts`,
  and `app/src/middleware/{allowlist,jwt}.ts` — inspected **read-only** to ground the §3 spike auth
  facts, the §4 boundary, the §5 binding, and the §7 replay handling. **None is modified.**
- `loa-straylight/src/straylight/{types,estate,audit,keyring,signatures}.ts`,
  `loa-straylight/src/straylight/storage/types.ts`,
  `loa-straylight/docs/decisions/{ADR-022D,ADR-022E}-…md`, and
  `loa-straylight/docs/mvp/threat-model.md` — inspected **read-only** as the **canonical**
  Straylight substrate cited in §2.2 / §5 / §6 / §8 (the `TransitionReceipt` / `AuditEvent` /
  `signer_refs` primitives; `SignerCompetenceRule` / `Keyring`; the dev-signature placeholder; the
  T5 / T6 privacy/cross-tenant invariants; ADR-022D audit-owner; ADR-022E gate #8). **Not edited by
  this phase.**
- `@loa/straylight` — canonical primitive / substrate owner; PR #65 (merged) answered the A–O
  primitive review. Straylight-repo ADR-022E (durable-store gate #8 + related gates #10 / #12 /
  #20, **held**), ADR-022D (receipt/audit-chain invariants), ADR-026C, ADR-026D are decision records
  cited as guardrails. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — the cross-repo acceptance whose
  mirror/adapter is test-only, not exported, not runtime-wired; the caller/tenant-mediated and
  consent-boundary handoffs stay deferred. **Not edited by this phase.**
