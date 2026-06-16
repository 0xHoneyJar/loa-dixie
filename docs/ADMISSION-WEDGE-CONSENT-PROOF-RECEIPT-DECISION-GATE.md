# Phase 46H — Admission Wedge Consent Proof / Receipt Decision Gate

> **Phase**: 46H
> **Branch context**: `phase-46h-admission-consent-proof-receipt-gate`
> **Related**: Phase 46G auth / identity / signer authority decision (PR #152,
> [`ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
> §9 / §12, which selected and scoped this gate as the next lane); Phase 46F durable storage shape
> & route-vector alignment (PR #151,
> [`ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md));
> Phase 46E durable storage model decision (PR #150); Phase 46D storage/auth/consent acceptance
> (PR #149); Phase 46C storage/auth/consent blocker decomposition (PR #148); Phase 46B
> route-contract implementation-readiness decomposition (PR #147); Phase 46A route-vector alignment
> acceptance (PR #146); Phase 33Z route-vector alignment (PR #144) + its PR #145 next-lane
> label/provenance correction; Phase 33Y route-contract revision acceptance (PR #143); Phase 33X
> route-contract revision draft (PR #142); Phase 33V storage/auth/consent design finalization
> (PR #140); Phase 33U Straylight-response intake (PR #139); Phase 33R bounded-ledger acceptance
> (PR #136); Phase 33Q bounded synthetic admitted-assertion ledger (PR #135); Phase 33P
> storage/receipt hardening (PR #134); Phase 33N dev/operator-only route spike; Phase 33M
> dev/operator route-spike authorization gate (PR #131); Phase 33K storage/auth/consent precondition
> design;
> Phase 33L route-contract test-vector fixture draft; Straylight (`@loa/straylight`) PR #65 (A–O
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
> **This is a consent proof / consent receipt *decision* gate, not implementation.** It records,
> on paper, the consent boundary, the consent-proof object model (un-frozen), the consent-receipt
> public/private boundary, the consent failure / refusal taxonomy, the interaction with the Phase
> 46G auth / identity / signer authority decision, and the public/private no-leak projection that a
> future production-admission, durable-storage, or end-user admission-UX lane must satisfy before it
> can be authorized. It selects the safest next lane (§10 / §13). It does **not** implement consent,
> **not** implement auth, **not** change the route handler, **not** implement storage, **not**
> author or apply a migration, **not** authorize DB writes, **not** clear the Straylight-repo
> ADR-022E durable-store gate #8, **not** authorize production admission, **not** open a public
> `remember-this` surface, **not** freeze the route contract, and **not** freeze the final schema.

Every assessment below is grounded read-only against the actual Dixie repo (the Phase 46G auth /
identity / signer decision, the Phase 46E durable-storage-model decision, the Phase 46F
storage-shape alignment, the Phase 46A / 46B / 46C / 46D gates, the Phase 33K precondition / 33M
authorization / 33N spike / 33P–33R storage lane, the Phase 33U / 33V chain, the **five**
route-vector JSONs, the route-vector validator and its README, and the Phase 33N spike source under
`app/src/services/admission-wedge-spike/` plus the route handler
`app/src/routes/admission-intake.ts` and the global middleware under `app/src/middleware/`) and
read-only against the **canonical** Straylight (`@loa/straylight`) substrate (`types.ts`,
`estate.ts`, `audit.ts`, `keyring.ts`, `signatures.ts`, `storage/types.ts`, and
`docs/decisions/ADR-022D…` / `ADR-022E…` / `docs/mvp/threat-model.md`). Where a claim could not be
grounded in the read material, it is marked as such.

---

## 1. Status and scope

Phase 46H is the bounded **consent proof / consent receipt decision gate** that follows, and is
named by, Phase 46G
([`ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
§9 / §12, PR #152). Phase 46G recorded the auth / identity / signer boundary and explicitly held
the **end-user authorization / consent** boundary separate from service authentication (46G §4.1),
then selected this gate: "**Select the consent proof / receipt decision gate** (docs/decision-only)
as the next lane — it is the natural successor in the established ordering (46F §14 step 4), and the
consent boundary is the tightly coupled sibling the auth decision references (46D §6 Option B)" (46G
§9). Phase 46H executes exactly that charter and stops.

**Verdict.** Phase 46H:

- is **docs / decision-only** — its only output is this decision document;
- is **not consent implementation** — no consent-proof, consent-receipt, consent-grant, or
  consent-revocation code is created or changed; the production consent model is not selected here,
  not frozen, and not built; consent is not implemented;
- is **not auth implementation** — no authentication, authorization, or credential-handling code is
  created or changed; the production caller/auth model (46G) is not built, selected here, or frozen;
- is **not identity-binding implementation** — the production tenant/estate/actor binding is not
  built; identity binding is not finalized;
- is **not signer/authority implementation** — no signer, signature, or authority-verification code
  is created; production signer semantics remain unresolved and blocked;
- is **not route/API implementation** — the Phase 33N dev/operator-only, disabled-by-default spike
  remains the only authorized route surface; nothing is added to it;
- is **not storage implementation** — no durable store, schema, table, store code, or storage write
  is created; storage is not implemented;
- is **not migration authorization** — no migration is authored, applied, or authorized; no DB
  write is authorized;
- is **not production admission** — production admission remains blocked;
- is **not a public `remember-this` surface** — no public / unauthenticated remember-this path is
  designed or authorized;
- is **not a route-contract freeze** and **not a final schema freeze** — neither is frozen.

Phase 46H additionally:

- **does not clear** the Straylight-repo ADR-022E durable-store gate #8 (or the related held gates
  #10 / #12 / #20) — deciding a consent boundary on paper is not clearing a gate; gate #8 remains
  uncleared;
- **does not modify** runtime source, the route-vector JSONs, the route-vector validator, the
  route-vector README, the Phase 33E fixtures, the Phase 33E fixture validator, validators of any
  kind, vectors, package exports, config / env, CI, migrations, generated files, binaries, or any
  adjacent repository — it changes no vector JSON and no validator;
- **declares no production readiness** of any kind.

> **A consent *decision* authorizes no runtime work.** Phase 46H records the consent boundary, the
> consent-proof object model (un-frozen), the consent-receipt public/private boundary, the consent
> failure taxonomy, the interaction with auth / identity / signer, and the public/private no-leak
> projection that a future implementation lane must satisfy. The decision is a recommendation
> recorded on paper, not built consent, an implemented consent-proof model, a frozen consent
> schema, or a cleared gate. A later, separately-gated phase must still (a) produce and accept the
> production consent-proof / consent-receipt models below, (b) clear ADR-022E gate #8 with a
> gate-clearing ADR that preserves the ADR-022D receipt/audit-chain invariants, and (c) only then
> authorize any build.

---

## 2. Source chain (evidence intake)

This gate sits one rung above the Phase 46G auth / identity / signer decision on the Dixie
route-contract ladder. It introduces no new contract or vector material; it consumes the prior
auth/consent design decisions (33K / 33M / 33V), the Phase 46G auth/identity/signer decision, the
Phase 33N spike source and its dev/operator consent-omission posture, the five existing route
vectors and their validator (the `consent_implemented: false` flag and the
`end_user_consent_model: draft_non_implemented` assumption), and the canonical Straylight
receipt/audit substrate to record the consent-proof / consent-receipt decision.

### 2.1 Dixie (loa-dixie) — the consent lanes

| Phase | PR | Artifact / contribution (relevant to consent proof / receipt) |
|-------|----|------|
| 33G | #124 | **Route-contract design.** Proposed the route identity `POST /api/admission/intake`, the public/private split, an idempotency sketch, the `admission.*` refusal taxonomy, and the storage/auth/**consent** preconditions the test vectors are drawn from. |
| 33K | #129 | **Storage/auth/consent precondition design.** Stated the **end-user consent model options** (Option A explicit end-user admission consent artifact — production-capable, high suitability, strong cross-user safety; Option B platform-mediated authorization grant — production-capable; Option C dev/operator-only omission marker — non-production only; Option D no end-user authorization — **rejected**); recommended **A or B before production user-facing admission**, **C only for a separately-authorized dev/operator spike**, **D rejected**, cross-user admission blocked without an explicit consent model (`ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md` §10); fixed the consent reference as living on the **private audit record only** (§6.9, §13). |
| 33L | #130 | **Route-contract test-vector fixture draft.** Authored the five non-runtime route-contract vectors + validator; carried the `consent_implemented: false` flag, the `end_user_consent_model: draft_non_implemented` assumption, and the per-request `consent_assumption: draft_*` marker. |
| 33M | #131 | **Dev/operator route-spike authorization gate.** Authorized the Phase 33N spike: dev/operator gate only, disabled-by-default; **Service auth ≠ end-user consent** (§12); no end-user consent model; synthetic subjects only; no cross-user admission; no automatic chat-to-memory; no public remember-this. |
| 33N | #132 | **Dev/operator-only route spike.** `POST /api/admission/intake`, disabled-by-default; the `authorizeAdmissionSpike` dev/operator gate (`auth-gate.ts`); the synthetic transition built from fixed dev constants, never request-controlled material (`admission-intake.ts:120-160`); the handler carries **no end-user consent proof** and admits only a synthetic dev marker. |
| 33P | #134 | **Storage / receipt hardening decision.** Named the validator denylist as the boundary a store-backed projection must satisfy; carried the consent/identity/signer/authority final semantics as unresolved. |
| 33Q | #135 | **Bounded synthetic admitted-assertion ledger.** Demonstrated tenant+estate scope isolation and per-estate replay-key handling over **synthetic** material only — no consent proof modelled. |
| 33R | #136 | **Bounded-ledger acceptance.** Accepted Phase 33Q only as a bounded, non-production, test-seam-only synthetic proof. |
| 33U | #139 | **Straylight-response intake.** Reconciled PR #65 A–O verdicts. Rows **F / G / J / O** held. Row B: `admitted` is a public `outcome_class`, never a status; Dixie holds **ingress refs only** — a consent reference recorded by Dixie is an ingress reference onto the canonical private records, never the canonical copy. |
| 33V | #140 | **Storage/auth/consent design finalization.** Reaffirmed service auth ≠ end-user authorization; finalized (§5) the **consent proof / receipt boundary**: a production end-user consent artifact (33K §10 A) or platform-mediated grant (B) reference **lives on the private audit record only — never a raw secret, never public**; the dev/operator omission marker is **non-production only**; Option D rejected; cross-user/cross-tenant sharing blocked by default; public remember-this, Discord history ingestion, and chat-becoming-memory all blocked (§5). Split `SyntheticAuditRecord` → `AuditEvent` + `TransitionReceipt`; adopted `public_receipt_ref`. |
| 33W–33Z | #141–#144 | **Route-contract readiness/revision/vector alignment.** Standardized `public_receipt_ref`; pinned the refusal taxonomy; aligned the five vectors + validator (`--self-check` negative-mutation harness); carried `consent_implemented: false`, `route_contract_final: false`, `schema_final: false`. |
| 33Z (corr.) | #145 | **Next-lane label/provenance correction** (34A → 46A). |
| 46A | #146 | **Route-vector alignment acceptance.** Accepted the 33Z alignment as bounded, non-runtime vector/validator alignment. |
| 46B | #147 | **Route-contract implementation-readiness decomposition.** Judged the storage/auth/**consent** cluster the upstream dependency. |
| 46C | #148 | **Storage/auth/consent blocker decomposition.** Decomposed the held storage / auth / **consent** / shared public-private blockers into ordered, separately-clearable sub-gates. |
| 46D | #149 | **Storage/auth/consent acceptance.** Ranked the candidate next lanes; noted the auth decision (Option B) is "tightly coupled to consent (C)"; sequenced the per-area gates. |
| 46E | #150 | **Durable storage model decision.** Selected the storage model direction (current-state projection + append-only hash-chained audit log on the canonical Straylight semantics/interfaces); the auth-decision and **consent** references are to be persisted privately onto that audit record (§4 item 11). |
| 46F | #151 | **Durable storage shape & route-vector alignment.** Aligned the shape onto the vectors docs-only; noted the auth/**consent** reference persistence as future work (§11). |
| 46G | #152 | **Auth / identity / signer authority decision.** Recorded the auth boundary, identity-binding, signer/authority model, replay/idempotency interaction, and public/private auth projection; held the **end-user authorization / consent** boundary separate from service authentication (§4.1); recorded the canonical signer/**consent** key-name no-leak hardening gap (§8); **selected this Phase 46H consent proof / receipt decision gate** as the next lane (§9, §12 step 4). |
| **46H** | *(this doc)* | **Consent proof / receipt decision gate.** Records the source chain (§2) and accepted facts (§3); decides the consent boundary (§4), the consent-proof object model un-frozen (§5), the consent-receipt public/private boundary (§6), the consent failure / refusal taxonomy (§7), the interaction with auth / identity / signer (§8), and the public/private no-leak projection incl. the recorded hardening gap (§9); assesses the consent-model options and selects the safest next lane (§10); restates the required invariants (§11) and the exit criteria for any future implementation lane (§12); selects the next lane and updates the ordering (§13); preserves the blocked lanes (§14). Mutates **no** vector / validator / fixture / source. |

> **PR-number provenance note.** The PR numbers above are taken from the local git merge-commit
> history (`docs: … (#NNN)` subjects) and the Phase 46A–46G source-chain tables. Phase 46G's
> `#152` is the merge commit `b25b8946 "docs: add Admission Wedge auth identity signer gate
> (#152)"`. Treat the PR numbers as git-sourced rather than as authority embedded in the gate
> bodies (each gate refers to itself only as "this doc"). Phase 33M's `#131` is grounded in the
> local merge commit `edd00123 "docs: authorize Admission Wedge route spike gate (#131)"`, whose
> diff touches the Phase 33M authorization gate
> `docs/ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md` — so **Phase 33M / PR #131
> — Admission Wedge route-spike authorization gate.**

### 2.2 Canonical Straylight substrate (`@loa/straylight`) — read-only

The receipt/audit primitives onto which a consent reference must later be recorded are **canonical
Straylight semantics**, read-only here to ground the §5 / §6 decisions. The adjacent `loa-straylight`
repo is the canonical evidence (Dixie's mirror modules are parity evidence only, never canonical
proof — ADR-022D §3).

- **The Wedge owns receipt/audit shape and signer competence; the host owns caller authentication
  — and, by extension, the consent boundary is a Dixie/Finn host concern.** ADR-022D §Decision §1 /
  §3 establish that the shape, fields, invariants, and emission rules of RecallPack, RecallReceipt,
  TransitionReceipt, AuditEvent are owned by Loa-Straylight, and the MVP endpoint host (Dixie or
  Finn) is a persistence / exposure surface for receipts and audit events, not their semantic owner
  (`loa-straylight/docs/decisions/ADR-022D-mvp-persistence-and-audit-owner.md:47-108`). The threat
  model is explicit that "the wedge does not authenticate the caller; that's an integration-layer
  concern (Dixie / Finn)" (`loa-straylight/docs/mvp/threat-model.md:180-185`). **End-user consent —
  like caller authentication — is therefore an integration-layer (Dixie/Finn host) concern; the
  Wedge owns signer competence and the receipt/audit shape onto which a consent reference is
  recorded.**
- **The canonical private records onto which a consent reference would later be recorded.**
  `TransitionReceipt` (`kind` ∈ admission / denied / challenge / revocation / forget) carries
  `transition_id`, `signer_refs` (ID[]), `audit_event_ref`, and `receipt_hash`
  (`loa-straylight/src/straylight/types.ts:364-388`); `AuditEvent` carries `signer_refs`,
  `policy_decision_ref`, `previous_audit_hash`, and `audit_hash` (the per-estate chain link)
  (`types.ts:514-529`). The `audit_hash` is computed over the event fields and `verifyChain` detects
  a broken chain (`audit.ts:13-64`, `:77-89`). A production consent reference would be recorded
  **privately** onto this audit record (33V §5), never on the public surface.
- **Signer competence is policy-decided, not a fixed list.** `SignerCompetenceRule` declares
  `required_signer_roles` / `forbid_signer_roles` over `SignerType` (`actor_controller`,
  `operator`, `runtime`, `reviewer`, `policy_service`, `admin`, `wallet`, `service_key`)
  (`types.ts:122-142`, `:185-197`); `evaluateCompetence` enforces them (`keyring.ts:77-200`).
  **Signer competence proves a signer may authorize a transition; it is distinct from consent,
  which proves the end-user/subject permitted the admission (§8).**
- **Identity, subject, and privacy are canonical.** `Assertion` carries `estate_id`, `actor_id`,
  `subject_refs`, `status` (incl. `active` / `superseded`), `supersedes_refs`,
  `linked_assertion_refs`, `privacy_scope` (`public` / `tenant` / `actor_private` / `sealed`), and
  `recall_scope` (`types.ts:86-94`, `:96`, `:145-167`). Straylight has **no `subject_actor_id`
  primitive** — the subject of an admission maps to canonical `subject_refs` (33K §11). A consent
  *subject* binds to that canonical subject reference, not to a coined field.
- **Production signature material is out of scope at MVP.** The dev signature is an explicit
  HMAC-SHA256 placeholder — a production implementation MUST replace it with
  ed25519/secp256k1/HMAC-with-real-key-material (`loa-straylight/src/straylight/signatures.ts:1-7`);
  `verifyDevSignature` checks envelope self-consistency, not caller identity or consent
  (`signatures.ts:54-74`).
- **ADR-022E gates #8 / #10 / #12 / #20 are held.** Gate #8 (production database / persistence
  substrate): a separate ADR must propose the production adapter, cite the relevant sibling-repo
  handoff packet, and preserve the ADR-022D receipt and audit-chain invariants
  (`loa-straylight/docs/decisions/ADR-022E-phase-22-deferred-features.md:57`). Gate #10 (Dixie
  boundary wiring), gate #12 (new HTTP / network surface), and gate #20 (threat-model widening) are
  held (`:59`, `:61`, `:69`). PR #65 cleared none of these gates.

### 2.3 Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts, reconciled by 33U.** PR #65
  clarified the *vocabulary / design* only; it cleared **no** independent production gate and
  authorized **no** Dixie runtime, production storage / auth / **consent**, or Freeside integration.
  The still-held rows that gate the surrounding work are **F** (production signer/authority), **G**
  (production tenant/estate/actor identity binding), **J** (endpoint idempotency keying), and **O**
  (durable store under ADR-022E gate #8) (33U §4). Consent itself is tracked through 33K §10 / 33V
  §5 rather than a single lettered row; it remains an independent unresolved gate.
- **Residual legacy marker prose.** The `[E,G,H,K,N,O]` / `[J]` marker arrays in the vector JSONs
  and the spike classifier comments are **preserved legacy vector/runtime markers, not the current
  review-state authority**; the authoritative classification lives in the route-vector README
  current-state correction
  ([`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  §7). Phase 46H preserves that distinction and mutates no technical artifact.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the freeside-characters
> 34-/45-series, and Straylight's ADR / PR labels are independent labels in separate repositories
> and must not be conflated. `46H` signals **no** new product epoch and **no** scope expansion — it
> is the same Admission Wedge arc, still docs/decision-only.

---

## 3. Starting accepted facts

These are facts **already accepted** by the chain (33K / 33M / 33U / 33V / 46C / 46D / 46E / 46F /
46G), re-verified read-only here as the baseline the §4–§10 decisions are measured against. None is
changed by this gate.

1. **The dev/operator-only spike carries no end-user consent and admits only synthetic subjects.**
   The Phase 33N spike authenticates with a dev/operator gate (`x-admission-service-token` +
   `x-admission-operator-id`; `admission-intake.ts:39`, `:44`), builds the synthetic transition from
   fixed dev constants (`SYNTH_SOURCE_CANDIDATE_ID = 'cand-synthetic-dev'`;
   `admission-intake.ts:120`, `:146-159`), and never reads request-controlled subject material or
   the global wallet (`c.get('wallet')` is never read). It carries **no end-user consent proof** and
   models **no** consent object; the dev/operator omission is the only consent posture, and it is
   non-production (33M §12; 33K §10 Option C). The route is config-gated and conditionally mounted: it
   is enabled only when `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (default off;
   `config.ts:399`), and `server.ts` mounts `/api/admission/intake` only inside the
   `if (config.admissionIntakeSpikeEnabled)` branch (`server.ts:630-646`) — so when the flag is
   off the route is not registered at all. Phase 46H does not modify this guarded, config-controlled
   route behavior.
2. **Service authentication is not end-user consent — this is a load-bearing, already-accepted
   boundary.** "Service authentication here only proves a caller MAY exercise the dev spike; it does
   NOT prove end-user/channel/tenant/surface authorization, and it does NOT implement an end-user
   consent model" (`auth-gate.ts:2-7`); restated at 33M §12, 33K §9, 33V §5, and 46G §4.1.
   Operator/dev authorization is likewise **not** production user consent (33K §10 Option C; 33M §5).
3. **The consent options are already designed (not implemented) and Option D is rejected.** 33K §10
   designed Option A (explicit end-user admission consent artifact, production-capable, strong
   cross-user safety), Option B (platform-mediated authorization grant, production-capable), Option
   C (dev/operator-only omission marker, non-production only), and Option D (no end-user
   authorization, **rejected**). The recommended posture: **require A or B before production
   user-facing admission; permit C only for a separately-authorized dev/operator spike; reject D;
   cross-user admission stays blocked without an explicit consent model** (33K §10; 33V §5 / §7).
   **Consent is not implemented.**
4. **The consent reference is private-audit-only by prior decision.** A production end-user consent
   artifact or platform-mediated grant reference "lives on the **private audit record only** — never
   a raw secret, never public" (33V §5; 33K §6.9, §13). The dev/operator omission marker is recorded
   privately and is non-production.
5. **There are exactly five route-contract vectors and one validator; both are green and
   non-runtime, and they carry the `consent_implemented: false` flag and the draft consent
   assumptions.** All five vectors validate, the no-sixth check passes, and the `--self-check`
   negative-mutation harness reports 5/5 fail-closed (§16). Every vector carries
   `consent_implemented: false` (`validate-route-contract-test-vectors.mjs:126`, enforced at
   `:484-486`); `storage_auth_consent_assumptions.end_user_consent_model` must equal
   `draft_non_implemented` (`:512`); and each `request_vector.consent_assumption` must be a `draft_*`
   marker (`:526`).
6. **The forbidden-key set denylists the auth/signer/identity/receipt families it covers — but it
   does not yet denylist the canonical consent key-name family.** The validator's
   `FORBIDDEN_PUBLIC_KEYS` forbids, as object keys on the public surface at any depth, the
   tenant/estate/candidate/actor families, the private `TransitionReceipt` / `AuditEvent` / receipt
   families, signer / signature / authority material, the idempotency keys, and tokens / secrets /
   urls / stack-traces (`validate-route-contract-test-vectors.mjs:236-330`); the runtime spike
   mirrors this set (`no-leak.ts:22-75`). The opaque-run / UUID / hex / JWT / Bearer **value** walks
   catch operational material of any novel shape (`no-leak.ts:82-110`; validator `:213-222`). This
   enforces the public/private boundary for the five current scenarios; it does **not** yet denylist
   the canonical **consent** key-name family (`consent` / `consent_ref` / `consent_proof` /
   `consent_receipt` / `consent_subject` / `consent_grantor` / `consent_scope` / `auth_decision`) —
   all are **absent** from both denylists (§9 records this gap, carried from 46G §8).
7. **Straylight owns the canonical receipt/audit substrate; Dixie owns caller authentication and
   ingress references only — including any future consent reference.** The canonical
   `TransitionReceipt` / `AuditEvent` and the hash chain are Straylight primitives (§2.2); Dixie owns
   the endpoint-local auth gate, the contract / idempotency / replay records, ingress references, and
   the public/private response projection (46E §6; 46G §3 item 6; ADR-022D §3). A production consent
   reference would be a Dixie/host-originated ingress reference recorded **privately** onto the
   canonical audit record, never the canonical copy.
8. **The production auth / identity / signer / consent / idempotency models remain unresolved and
   blocked.** Rows F / G / J / O are held (33U §4); `identity_binding_final` is false (33K §11);
   `idempotency_final` is false (33V §7); production consent Options A/B remain blocked and Option D
   remains rejected (33K §10; 33V §5 / §7); ADR-022E gate #8 is held.

> **What "accepted facts" do and do not mean.** These are **spike-posture, design-vocabulary, and
> vector-surface** facts. They do not constitute a built production consent model, an implemented
> consent-proof object, a consent-receipt projection, a frozen consent schema, or any cleared
> production gate. The §4–§10 decisions exist precisely because the accepted readiness is bounded to
> the dev/operator/spike/synthetic surface and the production consent model is still unresolved.

---

## 4. Consent boundary decisions

This section records, on paper, where the consent boundary lies and what consent must (and must not)
be. It decides nothing runtime; it fixes the boundary a future implementation lane must satisfy.

**(4.1) Service authentication is not end-user consent.** Service authentication proves a *service*
may call Dixie; it does **not** prove the end user, channel, tenant, or surface consented to the
admission, and it does **not** stand in for an end-user consent model (`auth-gate.ts:2-7`; 33K §9;
33V §5; 46G §4.1). **Decision:** the two remain separate concerns. The Phase 46G auth gate decided
the **service-authentication and identity-binding** boundary; this gate decides the **end-user
authorization / consent** boundary. A valid service credential never substitutes for consent.

**(4.2) Operator / dev authorization is not production user consent.** The `x-admission-operator-id`
allowlist and the dev service-token gate constrain *who may exercise the dev spike*; they are a
**non-production isolation mechanism**, never a production consent model (33K §10 Option C; 33M §5,
§12). **Decision:** operator/dev authorization is recorded as the **dev/operator omission marker**
(Option C) — explicit, private, non-production — and never as production user consent. For the
spike, end-user consent is **explicitly omitted** (synthetic subjects only), not satisfied.

**(4.3) Consent must bind to the relevant subject / actor / estate / tenant / caller where
applicable.** A consent proof is meaningful only when bound to *whom* the memory is about and *whose*
permission it carries. **Decision:** a production consent proof must bind to the **candidate
subject** (canonical `subject_refs`, never a coined `subject_actor_id`), the **estate** (`estate_id`,
canonical), the **actor** (`actor_id`, canonical), the **tenant** (`tenant_id`, Dixie host-layer),
and the **caller** (the session-derived authenticated principal — 46G §5), each *where applicable*
to the transition. Cross-user / cross-tenant consent that does not bind to the correct subject/estate
**fails closed** (§7). The final production binding remains unresolved (Row G held); only the boundary
is recorded.

**(4.4) Consent must distinguish its scope by transition intent.** Consent for one action is not
consent for another. **Decision:** the consent-proof model must distinguish the scopes **propose**,
**accept**, **reject**, **supersede / correct**, and **recall-use** — a proof valid for one scope is
**not** valid for another, and a scope mismatch **fails closed** (§7). This mirrors the canonical
`TransitionReceipt.kind` set (admission / denied / challenge / revocation / forget — `types.ts:364`)
and the signer-competence-per-transition model (§8), without freezing a final scope enum.

**(4.5) Consent proof must not be inferred from chat text.** A consent proof must be an explicit,
verifiable artifact (33K §10 Option A) or a platform-mediated grant reference (Option B). **Decision:**
consent is **never** inferred merely from the content of a chat message, a freeform utterance, or the
fact that something was said. Presence of text about a subject is not permission to admit memory
about that subject. The spike already enforces this by admitting only a synthetic dev marker and no
request-derived subject material (§3 item 1).

**(4.6) Public `remember-this`, freeform history ingestion, and chat-becoming-memory remain
blocked.** **Decision:** no public / unauthenticated `remember-this` surface, no Discord / freeform
history ingestion path, and no automatic chat-to-memory path is designed or authorized by this gate
(33K §12, §20; 33V §5; 33M §12; 46G §10 invariants 9–11). User chat does **not** become memory merely
because it was said; admission requires an explicit, scoped, subject-bound consent proof that does not
exist today and is not built here.

---

## 5. Consent proof object model

This section decomposes the consent-proof object **without freezing a final schema**. Every field
name below is an **explicitly draft, non-final** descriptor recorded for design legibility; none is a
frozen schema field, a route-contract field, or an authorized runtime field. No vector or validator
is changed. Where a draft maps onto a canonical Straylight primitive, the mapping is recorded so a
future lane references the canonical name rather than coining a parallel one.

| Consent-proof element (draft, un-frozen) | Decision (docs-only) | Grounding / mapping |
|---|---|---|
| **Consent subject** | Whom the memory is about. Binds to canonical `subject_refs`; **no** coined `subject_actor_id`. Private; never public. | 33K §11; 33V §7; Straylight `types.ts:155` (in the `Assertion` interface `:145-167`). |
| **Consent grantor** | Who grants permission (the subject themselves, or a platform/guardian under Option B). May differ from the subject and from the caller. Private. | 33K §10 A/B; 33V §5. |
| **Consent scope** | One of {propose, accept, reject, supersede/correct, recall-use} (draft enum, un-frozen). A proof is valid only within its scope (§4.4). Private. | 33K §10; §4.4; `types.ts:364`. |
| **Candidate reference** | The candidate the consent authorizes admission of. An **ingress reference**, not the candidate payload; the payload stays private. | 33U §4 Row B; validator `candidate_id` / `candidate_payload` forbidden public (`:238`, `:248`). |
| **Assertion / transition reference (if applicable)** | For accept / supersede / recall-use, the canonical `transition_id` / assertion ref the consent ties to. Private; never public. | `types.ts:364-388`; validator `transition_id` / `admitted_assertion_id` forbidden public. |
| **Tenant / estate / actor binding** | `tenant_id` (Dixie host-layer), `estate_id` / `actor_id` (canonical), session-derived, never body-trusted, no caller override (46G §5). All private. | 46G §5; 33K §11; validator `tenant_id` / `estate_id` / `actor_id` forbidden public. |
| **Signer / authority reference** | The competent signer that recorded the transition (`signer_refs`), distinct from the consent grantor (§8). Private; canonical Straylight ref. | §8; `types.ts:364-388`, `:514-529`. |
| **Timestamp / expiry / revocation possibility** | When granted; an optional expiry; the possibility of later revocation. The **production** expiry/revocation semantics are unresolved (parallel to 46G §4.6 expired/replayed handling); only the boundary is recorded. Private. | §6; 46G §4.6; MVP-3 forget/revoke **not** implemented. |
| **Policy decision reference** | The canonical `policy_decision_ref` the admission policy attached. Private; never public. | `types.ts:514-529`; validator `policy_reason` / `policy_details` forbidden public. |
| **Public-safe receipt reference** | At most an opaque public-safe **consent receipt reference** (draft string or `null`), disjoint from `public_receipt_ref`; carries no grantor/subject/signer/source material (§6). | §6; validator `public_receipt_ref` string-or-null (`:549-564`). |
| **Private proof material** | The consent artifact / grant material itself (signatures, secrets, raw grant). **Never** public; **never** logged raw. | 33V §5; §9; validator tokens/secrets/signature forbidden public. |
| **Audit linkage** | The reference linking the consent proof onto the **private** `AuditEvent` (and optionally the `TransitionReceipt`). Private; ingress reference, never the canonical copy. | §6; 33V §5; ADR-022D §3. |

> **Nothing in §5 is a schema.** The draft element names exist for design legibility only; Phase 46H
> freezes **no** consent schema, coins **no** runtime field, and changes **no** vector or validator.
> A future implementation lane must produce and accept the final object model, name the canonical
> mappings, and pass an extended (still no-leak-bounded) vector/validator plan (§12) before any field
> is authorized.

---

## 6. Consent receipt boundary

This section records the consent-receipt public/private boundary and how it relates to the canonical
`TransitionReceipt` and `AuditEvent`. It changes no vector and no validator.

**(6.1) What may be public-safe.** At most a single **opaque public-safe consent receipt reference**
— an explicitly draft, non-final placeholder string where one is minted, or `null` where none is —
may cross to the public surface. **Decision:** this public-safe consent receipt reference, if it
exists at all, is **disjoint from `public_receipt_ref`** (the transition receipt's public reference)
and carries **no** grantor identity, subject reference, signer reference, source material, tenant /
estate / actor id, or proof material. It is the only consent-related field that may legitimately be
caller-observable, and only if a prior gate authorizes it; this gate authorizes no runtime emission.

**(6.2) What must remain private.** **Decision:** the consent proof material itself (the artifact,
signatures, grant secret, raw grant), the consent grantor identity, the consent subject binding, the
tenant / estate / actor binding, the signer / authority reference, the policy decision reference, the
candidate / transition / assertion references, the timestamp / expiry / revocation detail, and the
audit linkage are **all private** — recorded on the canonical private records and referenced privately
by Dixie, never on the caller-observable response (33V §5; §9).

**(6.3) How a consent receipt differs from `TransitionReceipt` and `AuditEvent`.** **Decision:** the
three are distinct and do **not** collapse into one another:

- a **`TransitionReceipt`** is the canonical, Wedge-owned record of a *transition outcome* (admission
  / denied / challenge / revocation / forget) carrying `signer_refs` / `audit_event_ref` /
  `receipt_hash` (`types.ts:364-388`);
- an **`AuditEvent`** is the canonical, Wedge-owned, append-only, hash-chained record of *what
  happened*, carrying `signer_refs` / `policy_decision_ref` / `previous_audit_hash` / `audit_hash`
  (`types.ts:514-529`; `audit.ts:13-64`);
- a **consent receipt** is the record of *proof-of-permission for the admission* — a Dixie/host-layer
  concern (like caller authentication, §2.2), whose reference is recorded **privately onto the
  canonical audit record**. It answers "was this admission permitted by the subject/grantor?", which
  neither the TransitionReceipt (which records the outcome) nor the signer competence (which records
  *who may act*) answers.

**(6.4) Whether the consent receipt is standalone, linked to `TransitionReceipt`, linked to
`AuditEvent`, or both.** **Decision (docs-only):** the consent proof is **linked to the canonical
`AuditEvent` as the primary linkage** — the audit record carries a private consent reference (33V §5:
the consent reference "lives on the private audit record only") — and **may additionally be linked to
the `TransitionReceipt`** for the transition it authorizes. The **private proof material** is a
standalone private record referenced by that linkage; the **public-safe consent receipt reference**
(6.1), if minted, is a separate opaque public projection. The final linkage shape (a dedicated
canonical consent primitive vs a Dixie-local reference onto `AuditEvent`) is unresolved and is a
future Straylight/Dixie decision; only the boundary is recorded here.

**(6.5) How the public consent receipt reference avoids leaking private material.** **Decision:** the
public-safe consent receipt reference follows the same posture as `public_receipt_ref` — it is an
opaque, public-safe **draft** string built purely from the classification, carrying none of the
private estate / candidate / source / signer / grantor / subject material, and is deep-walked through
the no-leak boundary before serialization (mirroring the existing `public_receipt_ref` handling —
`public-response.ts`; validator `:549-564`; §9). No raw proof, signature, secret, or identity binding
crosses the boundary.

**(6.6) How revocation / expiry would later affect recall / admission — without implementing MVP 3.**
**Decision (boundary only):** in a future production model, a **revoked** or **expired** consent would
(a) block any *new* admission/transition that depends on it (fail closed — §7), and (b) make the
affected admitted assertion ineligible for ordinary recall or subject to mark/redact, propagated
through the same per-request `RecallDisposition` projection that already governs supersession (the
boolean collapses the mark/redact band — 33V §7; 46F §7). **This gate implements none of this.** The
MVP-3 forget / revoke / correction UI is **not** designed, authorized, or built; only the boundary —
that revocation/expiry must later be representable and must fail closed — is recorded.

---

## 7. Consent failure / refusal taxonomy

This section decomposes the consent failure cases as **decision taxonomy only**, not route
implementation. Each case is recorded with its required posture; no route handler, status code
mapping, or refusal-code string is authored or frozen here. The unifying rule is **fail closed**: any
consent failure must refuse the admission with a single stable, public-safe refusal that never reveals
which check failed or leaks private material (mirroring the spike's existing fail-closed posture —
`admission-intake.ts:277`, `:291`, `:309-332`; `auth-gate.ts:70-95`).

| # | Consent failure case | Required posture (docs-only) |
|---|---|---|
| 1 | **Missing consent proof** | No consent proof present where one is required → **fail closed**; mint no admitted assertion; no public detail of what was missing. |
| 2 | **Malformed consent proof** | Proof present but structurally invalid / unparseable → **fail closed**; treat as the malformed/unsafe family (existing `must_fail_closed` posture). |
| 3 | **Consent subject mismatch** | Proof's subject ≠ the candidate subject → **fail closed**; never admit memory about a subject the proof does not cover (cross-user safety). |
| 4 | **Consent scope mismatch** | Proof valid for one scope (e.g. propose) used for another (e.g. supersede or recall-use) → **fail closed** (§4.4). |
| 5 | **Tenant / estate / actor mismatch** | Proof's binding ≠ the session-derived bound identity → **fail closed**; cross-tenant / cross-estate consent never silently coalesces (46G §5; canonical `a.estate_id === request.estate_id` recall filter, threat-model T6). |
| 6 | **Expired consent** | Proof past its expiry → **fail closed**; the production expiry model is unresolved (parallel to 46G §4.6), so this is recorded as a required future case, not built. |
| 7 | **Revoked consent** | Proof revoked → **fail closed** for new transitions; the affected assertion treated per §6.6; MVP-3 revocation UI not implemented. |
| 8 | **Replayed or conflicting consent proof** | A reused proof under a different binding / intent, or two conflicting proofs → **fail closed**; never silently coalesce across identities or intents (mirrors the idempotency replay posture, 46G §7; ledger `replay_key_content_mismatch`). |
| 9 | **Consent proof present but signer / authority invalid** | A consent proof present, but the recording signer is not competent for the transition (`SignerCompetenceRule` / `Keyring` / policy) → **fail closed**; consent ≠ competence (§8). |
| 10 | **Consent proof private-data leak attempt** | Any path that would project consent proof material, grantor/subject identity, signatures, or secrets onto the public surface → **fail closed** to a known-safe response carrying none of the findings (§9; mirrors the runtime no-leak guard fallback, `public-response.ts`, `admission-intake.ts:266`). |

> **§7 is decision taxonomy, not implementation.** No refusal-code string, status-code mapping, or
> route handler is authored or frozen. The taxonomy records the cases a future production consent
> model must handle fail-closed; it builds none of them and changes no vector/validator. Where a case
> overlaps the existing `admission.*` refusal family (malformed/unsafe), the existing family is the
> mapping target — but the mapping is a future route-contract decision, not made here.

---

## 8. Interaction with auth / identity / signer authority (Phase 46G)

This section records how consent relates to the Phase 46G auth / identity / signer authority
decision. It decides nothing runtime; it fixes that the four concerns are distinct and must each
remain auditable without public exposure.

- **Auth identifies the caller / service.** Service authentication (46G §4) and the identity binding
  (46G §5) establish *who is calling* and *which session-derived principal / estate / actor / tenant
  they are bound to*. This answers **"who is making the request?"**
- **Signer authority validates competence.** `SignerCompetenceRule` / `Keyring` / policy decide
  *which signer roles may authorize* an admit / reject / supersede transition (46G §6;
  `keyring.ts:77-200`). This answers **"who is competent to record this transition?"**
- **Consent proves permission for a specific admission / transition boundary.** A consent proof (§5)
  establishes *that the subject / grantor permitted this admission, at this scope, for this subject*.
  This answers **"was this admission permitted?"**
- **None of these collapses into another.** A valid service credential is not consent (§4.1); an
  authorized operator is not a consenting user (§4.2); a competent signer is not a consent grantor (a
  signer may be competent to *record* a transition without the subject having *permitted* it); and a
  consent proof from a subject does not by itself make a signer competent or a caller authenticated.
  A future production admission must satisfy **all four** independently — caller authentication,
  identity binding, signer competence, and consent — and the absence of **any** fails closed.
- **All must remain auditable without exposing private material publicly.** The caller principal, the
  bound identity, the signer refs, and the consent reference are all recorded **privately** (onto the
  canonical `AuditEvent` / `TransitionReceipt` and Dixie's private records) and are all **forbidden**
  on the public surface (§9). The audit log remains append-only and hash-chained
  (`audit.ts:77-89`); a consent reference recorded onto it inherits that tamper-evidence without
  becoming public.

---

## 9. Public / private no-leak boundary

This section records the consent public/private projection. It changes no vector and no validator.

- **Public responses must leak no consent / auth / identity / signer material.** Raw consent proof,
  signatures / secrets, service tokens, auth headers, signer private material, private
  identity-binding details (tenant / estate / actor / grantor / subject), raw candidate / source
  material, private `TransitionReceipt` / `AuditEvent` material, and debug traces must **never**
  appear on a public route response. This is enforced for the current scenarios by
  `FORBIDDEN_PUBLIC_KEYS` (`validate-route-contract-test-vectors.mjs:236-330`), mirrored in the
  runtime (`no-leak.ts:22-75`), plus the substring / pattern / UUID / opaque-run **value** walls that
  catch opaque token / JWT / Bearer / UUID / long-hex / long-opaque values of any shape
  (`no-leak.ts:82-110`; validator `:213-222`). The public body is built **purely from the
  classification** plus fixed synthetic placeholders and is deep-walked through the runtime no-leak
  guard on **every** response path before serialization, failing closed to a hardcoded known-safe
  fallback that carries none of the guard's findings (`public-response.ts`;
  `admission-intake.ts:266`).
- **Public responses may include only a narrow public-safe receipt reference if allowed by prior
  gates.** The fields that legitimately cross from the private side to the public side are at most the
  transition's `public_receipt_ref` (a public-safe DRAFT string or `null`) and — only if a prior gate
  authorizes it — a disjoint public-safe **consent receipt reference** (§6.1). Neither carries any
  consent / auth / identity / signer material. No consent proof field crosses the boundary.
- **Private consent / receipt / audit material stays private.** The consent proof material, grantor /
  subject binding, signer refs, policy decision ref, and the canonical `signer_refs` /
  `audit_event_ref` / `receipt_hash` / `audit_hash` / `policy_decision_ref` are stored on the
  **private** records and referenced privately by Dixie; they belong to the private
  `expected_private_or_audit_effect` block (which the validator's public-surface walk excludes) and to
  the canonical private records, never to the caller-observable response.

> **Known canonical consent-key hardening gap (recorded, not closed here).** The current route-vector
> validator and the runtime `no-leak.ts` denylist do **not** explicitly forbid the **canonical
> consent** key names `consent`, `consent_ref`, `consent_proof`, `consent_receipt`, `consent_subject`,
> `consent_grantor`, `consent_scope`, and `auth_decision` (nor the canonical signer/receipt/audit ref
> key names `signer_refs` / `audit_event_ref` / `receipt_hash` / `audit_hash` / `policy_decision_ref`
> recorded in 46G §8) — all are **absent** from `FORBIDDEN_PUBLIC_KEYS`
> (`validate-route-contract-test-vectors.mjs:236-330`) and from `no-leak.ts:22-75`. This is the same
> latent exact-key denylist debt **46G §8 recorded**, now extended to the consent-name family. It is
> a **known hardening gap, not a current leak**, exactly parallel to the `supersedes_refs` /
> `linked_assertion_refs` gap recorded in 46F §8 / §9 and the signer/consent gap recorded in 46G §8:
> (a) the fixed public-response builder (`buildAdmissionSpikePublicResponse`, `public-response.ts`)
> emits **none** of these fields, so there is no present leak path through the serializer; and (b)
> opaque **values** carried under those names (proof blobs, grant secrets, signer ids, audit ids) of
> UUID / long-hex / long-opaque / JWT / Bearer shape would still be caught by the value-pattern walls
> (`no-leak.ts:82-110`; validator `:213-222`) — only short, safe-looking values under those exact key
> names would slip the key check. Phase 46H **records** this as future validator/runtime hardening
> (§12 exit criterion); per the charter it makes **no** Phase 46H runtime/validator mutation (this
> slice is docs-only and the fixed serializer emits none of those fields). It must **not** be read as
> a claim that the denylist already covers every future canonical consent/signer key name — it does
> not.

---

## 10. Options and selected next lane

The charter asks Phase 46H to present and assess several consent options and select the safest next
lane. Each option is assessed for what it proves and its production-readiness blockers.

### Option 1 — Continue dev/operator-only with an explicit no-production-consent claim (current posture)

The already-accepted 33K Option C posture: a dev/operator-only omission marker, synthetic subjects
only, disabled-by-default, with the explicit claim that **no production consent exists** (§3 item 1;
33M §12). **Proves:** the spike admits no real-user memory; service auth ≠ consent holds; the no-leak
boundary holds; cross-user admission stays blocked. **Does not prove:** any production consent model.
**Disposition: retained unchanged** as the only authorized consent posture; this is the safe floor.

### Option 2 — Draft consent proof / receipt vocabulary only

Record the consent-proof object model (§5) and consent-receipt boundary (§6) as **draft, un-frozen**
vocabulary so a future durable/auth/consent lane references a coherent shape. **Proves:** the consent
boundary is legible and mapped onto canonical primitives without coining parallel ones. **Blockers:**
production consent semantics (33K §10 A vs B) and the signer/authority (Row F) and identity-binding
(Row G) gates are unresolved; the durable store (gate #8) is held. **Disposition: accepted as the
recorded design *direction*** (this document is that draft vocabulary); it freezes nothing.

### Option 3 — Non-runtime consent vector / validator alignment later

Extend the route vectors / validator with consent-proof / consent-receipt fields and the consent
key-name no-leak hardening (§9) in a **future** non-runtime alignment lane (like 33Z / 46F). **Proves:**
the no-leak boundary and the `consent_implemented: false` discipline would extend to the consent
fields. **Blockers:** the consent object model must be accepted first (Option 2 → exit criteria);
doing it now would change a validator, which this docs-only gate must not. **Disposition: deferred to
a future, separately-gated non-runtime alignment lane** (the natural successor — §13).

### Option 4 — Freeside / client UX handoff later

Defer the end-user consent UX (how a real user grants / revokes consent) to a Freeside-mediated client
contract. **Proves:** nothing now. **Blockers:** the freeside-characters mirror is test-only, not
exported, not runtime-wired (45J / PR #177); the Dixie route/consent contract is not mature enough to
hand off. **Disposition: deferred to a future cross-repo handoff lane.**

### Option 5 — Production consent deferred

Do not select or build a production consent model in this gate; record the boundary and defer.
**Proves:** that the production consent decisions are scoped and their blockers named, without
overreaching. **Disposition: this is the safe decision for the production layer** — no production
consent model is selected or built here.

### Option 6 — Reject treating service-token auth as consent

Explicitly reject any future shortcut that would treat a valid service token, operator allowlist
entry, or platform service credential as standing in for end-user consent. **Proves:** the load-bearing
service-auth ≠ consent boundary (§4.1) is preserved as a hard rule, not a soft preference.
**Disposition: accepted as a binding constraint** carried into the invariants (§11) and exit criteria
(§12); Option D (no authorization) remains rejected (33K §10).

> **Selected posture and next lane (docs/decision-only):**
> **retain Option 1** (dev/operator-only, explicit no-production-consent) as the only authorized
> consent posture; **accept Option 2** as the recorded draft consent vocabulary (this document) and
> **Option 6** as a binding constraint; **defer Options 3 / 4 / 5** (non-runtime consent
> vector/validator alignment, Freeside/client UX handoff, and the production consent model) to future,
> separately-gated lanes. **Select a docs/decision-only next lane** — the **durable-store design gate
> + ADR-022E gate-#8-clearing ADR** is the next blocker in the established ordering (46G §12 step 5),
> which must persist the accepted auth/identity/signer/**consent** references; a non-runtime consent
> vector/validator alignment (Option 3) may precede it only once the consent object model (§5) is
> accepted. This selection authorizes no runtime work.

---

## 11. Required invariants preserved

Phase 46H preserves **all** of the following (each already enforced in synthetic / spike / vector
form where cited; the production consent model must carry each forward unchanged):

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
   400; one stable refusal that never reveals which gate failed; both-empty rejects all
   (`admission-intake.ts:277`, `:291`, `:309-332`; `auth-gate.ts:70-95`).
7. **Missing / invalid consent fails closed in any future production admission model.** Missing,
   malformed, subject-mismatched, scope-mismatched, expired, revoked, replayed, or
   signer-invalid consent **fails closed** and mints no admitted assertion (§7); service-token / operator
   auth is **never** treated as consent (§4.1, §4.2, §10 Option 6).
8. **The public response leaks no raw / private / audit / debug / source / auth / signer / consent
   material.** The public-surface walk + `FORBIDDEN_PUBLIC_KEYS` + substring / pattern / UUID /
   opaque-run walks (`validate-route-contract-test-vectors.mjs:236-330`, `:213-222`); runtime mirror
   (`no-leak.ts:22-110`). The canonical consent/signer key-name hardening gap is recorded, not a
   present leak (§9).
9. **Private `TransitionReceipt` / `AuditEvent` / consent proof material remains private.** Forbidden
   on the public surface at any depth; the consent reference lives on the private audit record only
   (33V §5); the canonical signer/receipt/audit refs live on the private primitives (§6, §8, §9).
10. **User chat does not become memory merely because it was said.** No Discord / freeform ingestion
    and no user-chat-as-memory path; consent is never inferred from chat text (§4.5); the spike
    accepts only a synthetic dev marker.
11. **Public `remember-this` remains blocked.** No public / unauthenticated remember-this surface is
    designed or authorized (§4.6).
12. **Discord / freeform history ingestion remains blocked.** Unchanged (§4.6).
13. **Production admission / storage / auth / consent remain blocked.** ADR-022E gate #8 held;
    `auth_implemented` / `consent_implemented` / `production_admission` / `storage_writes_performed`
    all false on every vector.
14. **Route-contract freeze and final schema freeze remain blocked.** `route_contract_final` /
    `schema_final` false on every vector; Phase 46H freezes neither, and freezes no consent schema.
15. **ADR-022E gate #8 remains uncleared.** Phase 46H is not the gate-clearing ADR and clears
    nothing.
16. **Auditability without rewriting history.** The canonical audit log is append-only, hash-chained,
    and tamper-detectable via `verifyChain`
    (`loa-straylight/src/straylight/audit.ts:77-89`; ADR-022D audit-chain invariant); a consent
    reference recorded onto it inherits that tamper-evidence (§8).

---

## 12. Exit criteria for any future implementation lane

A future lane may begin consent **implementation** only after **all** of the following are produced
and accepted. Phase 46H satisfies **none** of these (it is a decision gate); they are the bar a
downstream lane must clear:

| # | Exit criterion | Owning future gate |
|---|---|---|
| 1 | **Accepted consent-proof boundary** — the production consent-proof object model (§5) finalized with canonical mappings (subject → `subject_refs`, etc.), the production consent model selected (33K §10 A vs B), Option D kept rejected, Option C kept non-production. | Consent implementation lane. |
| 2 | **Accepted consent-receipt boundary** — the public/private split (§6), the disjoint public-safe consent receipt reference, the linkage to `AuditEvent` (primary) and optionally `TransitionReceipt`. | Consent implementation lane + Dixie public-surface design gate. |
| 3 | **Accepted consent failure taxonomy** — fail-closed for missing / malformed / subject-mismatch / scope-mismatch / tenant-estate-actor-mismatch / expired / revoked / replayed-or-conflicting / signer-invalid / leak-attempt consent (§7), mapped to the route refusal family. | Consent implementation lane + route-contract gate. |
| 4 | **Accepted public / private consent projection** — the production no-leak serializer enforcing the consent public/private boundary, **including the canonical consent/signer key-name forbidden-key hardening** (`consent` / `consent_ref` / `consent_proof` / `consent_receipt` / `consent_subject` / `consent_grantor` / `consent_scope` / `auth_decision`, today absent from the denylist — §9) once a lane emits those fields internally. | No-leak serializer design gate + validator-hardening lane. |
| 5 | **Accepted relation to `TransitionReceipt` and `AuditEvent`** — the final consent linkage shape (a dedicated canonical consent primitive vs a Dixie-local reference onto `AuditEvent`), preserving the ADR-022D receipt/audit-chain invariants (§6.3, §6.4). | Straylight ADR (if a canonical primitive) + Dixie durable-store gate. |
| 6 | **Accepted relation to auth / identity / signer authority** — consent remains distinct from caller authentication, identity binding, and signer competence; a production admission satisfies all four independently and fails closed on any (§8). | Auth implementation lane + consent implementation lane. |
| 7 | **Accepted test / vector / validator plan if needed** — extending the existing vectors and `--self-check` for the consent-proof / consent-receipt model, still no-leak-bounded, including the canonical consent key-name hardening above. | Implementation-spike readiness checklist. |
| 8 | **Accepted Freeside / client / product-surface handoff criteria if needed** — how a real user grants / revokes consent (the consent UX), deferred until a mature Dixie consent contract exists. | Freeside Characters client-contract handoff gate. |
| 9 | **Codex audit acceptance before PR** of the consent design / implementation. | The implementing lane's review/audit gate. |

> Exiting Phase 46H authorizes **no** runtime implementation. It records the consent boundary (§4),
> the consent-proof object model (§5), the consent-receipt boundary (§6), the failure taxonomy (§7),
> the interaction with auth / identity / signer (§8), the public/private projection (§9), the option
> assessment (§10), the invariants (§11), and the criteria above; the build remains blocked until a
> future, separately-gated lane satisfies them.

---

## 13. Selected next lane and dependency ordering

> **Selected next lane: a docs/decision-only lane — the durable-store design gate + ADR-022E
> gate-#8-clearing ADR (which must persist the accepted auth/identity/signer/consent references), with
> an optional preceding non-runtime consent vector/validator alignment lane once the §5 object model
> is accepted. Not runtime; not implementation.**

**Reason.** With the durable storage direction (46E) and shape (46F) decided, the auth / identity /
signer boundary recorded (46G), and the consent boundary now recorded (this gate), the
storage/auth/consent decision cluster is decomposed on paper. The remaining blocker in the established
ordering is the **durable-store design gate + ADR-022E gate-#8-clearing ADR** (46G §12 step 5), which
authors the durable data model, schema, migration scope, and rollback plan and persists the accepted
auth/identity/signer/**consent** references onto the canonical audit record. Per the charter, this
gate does **not** jump to implementation; it selects a docs/decision-only successor. A **non-runtime
consent vector/validator alignment** (§10 Option 3) may precede the durable-store gate **only** once
the §5 consent object model is accepted — and only as a non-runtime alignment, never implementation.

**Dependency ordering after Phase 46H** (carried from 46G §12; step 4 now complete):

1. Phase 46E — durable storage **model direction** decided. *(Done; PR #150.)*
2. Phase 46F — durable storage **shape & route-vector alignment** decided. *(Done; PR #151.)*
3. Phase 46G — auth / identity / signer authority decided. *(Done; PR #152.)*
4. **Phase 46H — consent proof / receipt decision.** *(This gate — docs-only; no vector/validator
   change.)*
5. **Durable-store design gate + ADR-022E gate-#8-clearing ADR** — authors the durable data model,
   schema, migration scope, rollback plan, physical adapter placement, and persists the accepted
   auth/identity/signer/consent references; clears ADR-022E gate #8 preserving the ADR-022D
   invariants. *(The build precondition; held. May be preceded by a non-runtime consent
   vector/validator alignment lane once §5 is accepted.)*
6. **Final route-contract pre-freeze gate.**
7. **Implementation-spike readiness checklist.**
8. **Bounded default-off implementation spike** — only if the checklist is satisfied.
9. **Smoke / acceptance gate.**
10. **Freeside Characters client-contract handoff** (incl. the consent UX, §12 criterion 8).

> **Implementation remains downstream.** Steps 5–10 are each held. The only step Phase 46H advances
> is **step 4** — recording the consent proof / receipt decision — which is itself docs/decision-only.
> Runtime implementation is not the next step.

---

## 14. Blocked lanes

Phase 46H is a bounded, docs/decision-only consent decision gate. It authorizes **none** of the
following; each remains **blocked** and is **not** unblocked by recording the consent decision or
selecting the next docs lane:

- production consent implementation; production consent-proof / consent-receipt model selection or
  build; consent is not implemented;
- production auth implementation; the production caller/auth model (46G); auth is not implemented;
  cross-user admission;
- production identity binding (tenant / estate / actor); identity binding is not finalized;
- production signer / authority semantics; the production signature substrate (ed25519 / secp256k1 /
  real-key HMAC);
- final idempotency / replay semantics (Dixie / endpoint-owned; undecided; Row J);
- durable Admission Wedge storage implementation (ADR-022E gate #8 held); DB writes; migrations; a
  durable data model, schema, or table definition; storage is not implemented;
- route / API handler implementation **beyond the existing Phase 33N spike**; production admission;
- public `remember-this`; Discord command / history ingestion; user chat becoming memory; consent
  inferred from chat text;
- Freeside Characters runtime / client integration; the consent UX; package exports;
- the final Dixie route contract; route-contract freeze; production route deployment;
- production readiness of any kind; final / production schema freeze; consent-schema freeze;
- LLM / voice; Finn production wiring; forget / revoke / correction UI (MVP-3-adjacent);
- **any mutation of the five route-vector JSONs, the route-vector validator, the route-vector
  README, the Phase 33E fixtures, or the Phase 33E fixture validator** (§1, §9).

> **A consent decision does not authorize runtime implementation.** Recording the consent boundary
> and selecting the next docs lane makes the next decision legible; it does **not** build consent,
> **not** implement auth, **not** bind production identity, **not** implement signer semantics,
> **not** build a store, **not** clear any production gate, **not** freeze the route contract, schema,
> or consent schema, and **not** authorize any route / storage / auth / consent / Freeside /
> package-export work. The Phase 33N dev/operator-only, disabled-by-default spike remains the only
> authorized route surface, and the do-nothing / synthetic-only posture (46E Option 6) remains in
> force.

If a later phase reaches for any of the above, it must re-open the Phase 33K precondition design, the
Phase 33M authorization gate, the Phase 33P / 33Q / 33R storage lane, the Phase 33U / 33V chain, the
Phase 46A–46G gates and this gate, and the relevant ADRs (Straylight-repo ADR-022E durable-store gate
#8 and related gates #10 / #12 / #20; ADR-022D receipt/audit-chain invariants; ADR-026C / ADR-026D
route guardrails) first; it must not silently expand scope.

---

## 15. Corruption / duplicate guard

Phase 46H applies an explicit corruption / duplicate guard to **this** document (carried from the
Phase 46E / 46F / 46G precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 18.`) appears
  exactly once.
- **Numbered sections appear once each.** Sections 1–18 each appear exactly once; the guard counts
  `^## N\.` occurrences and asserts one per number.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:"
  token, a trailing one-word report heading, prose-claim dumps, or pasted terminal transcript appears
  in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row; no
  duplicated / truncated / wrapped table fragments appear.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is the
  §16 validation command list.

The guard commands and their recorded results are in §16.

---

## 16. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase
46H is docs/decision-only — it adds only this document and mutates no vector, validator, or fixture —
so the validators are run only to confirm the unchanged artifacts remain green. The fence-balance and
negative-claim checks avoid embedding affirmative-claim substrings in prose, so they cannot
self-match.

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
grep -E "Phase 46G|Phase 46H" docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md
# Duplicate/corruption grep (advisory):
grep -nE "Claude said|Patch Report|terminal report|RESULT:|Report$" docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md || true
# Enforcing negative check — fail if any affirmative readiness / freeze / implementation /
# authorization claim appears in PROSE. The patterns are affirmative-only and word-boundaried,
# so the document's negated prose ("does not freeze …", "is not production-ready", "consent is not
# implemented", "remains uncleared") and the fenced validation commands below are deliberately
# NOT matched. It is NOT masked with `|| true`:
python3 - <<'PY'
import re
from pathlib import Path
p = Path("docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md")
patterns = [
    r"\bruntime implementation is selected\b",
    r"\bimplementation is authorized\b",
    r"\broute contract is frozen\b",
    r"\bschema is frozen\b",
    r"\bconsent schema is frozen\b",
    r"\bstorage is implemented\b",
    r"\bthe durable store is built\b",
    r"\bmigration is applied\b",
    r"\bgate #8 is cleared\b",
    r"\bis production[- ]ready\b",
    r"\bproduction[- ]readiness is (?:declared|achieved|confirmed|established|met)\b",
    r"\bdb writes? (?:is|are) authorized\b",
    r"\bvectors? (?:was|were) (?:modified|mutated|changed)\b",
    r"\bvalidator (?:was|were) (?:modified|mutated|changed)\b",
    r"\bconsent is implemented\b",
    r"\bconsent proof is implemented\b",
    r"\bconsent receipt is implemented\b",
    r"\bthe consent model is built\b",
    r"\bauth is implemented\b",
    r"\bproduction consent model is (?:selected|frozen|final|implemented|authorized|built)\b",
    r"\bservice[- ]token auth (?:is|counts as|stands in for) consent\b",
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
print("The enforcing scan found no affirmative readiness/freeze/build/authorization/consent-implementation claims outside fenced validation commands.")
PY
# Fence-balance check (dependency-free; even count = balanced; char-code form avoids embedding
# a literal triple-backtick that would unbalance this doc):
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

Recorded results for this lane (see the message body accompanying this work for the captured terminal
output):

- **docs-only scope check** — only the single new file
  `docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md` is added; no route-vector JSON,
  route-vector validator, route-vector README, Phase 33E fixture, fixture validator, `app/`, `src/`,
  `tests/`, package / lockfile, config / env, CI, migration, runtime, or generated file is touched;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no `git add` / commit /
  push);
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator reports 5/5
  probes valid, 0 failures; the route-contract test-vector validator reports 5/5 vectors valid, 0
  failures, no sixth vector; the `--self-check` negative-mutation harness reports 5/5 mutations fail
  closed;
- **self-reference label check** — `grep -E "Phase 46G|Phase 46H"` confirms both the `Phase 46G`
  (predecessor) and `Phase 46H` (self) labels are present;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the eighteen headings
  1–18 exactly once each;
- **duplicate/corruption grep** — the advisory grep finds no pasted terminal-report fragment in the
  document body;
- **negative readiness-claim check (enforcing)** — the `python3` scan excludes fenced lines and
  reports the affirmative-only, word-boundaried patterns (including consent/auth/implementation/freeze
  claims) found no match outside the fenced validation commands; the document's **negated** prose is
  correctly not matched. The scan is not masked with `|| true`;
- **fence-balance check** — the dependency-free `node -e` counter reports an even (balanced)
  triple-backtick count; the single fenced block is the validation command list above.

---

## 17. Success criteria for Phase 46H

Phase 46H succeeds if and only if:

1. **Docs / decision-only** — it creates only this Phase 46H document; it changes **no** route-vector
   JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, runtime
   source, test, route, store, migration, auth, consent, config, env, package, lockfile, CI, or
   generated file, and edits **no** adjacent repository (§1, §9).
2. **Source chain / evidence intake recorded** — the Dixie chain (33G / 33K / 33L / 33M / 33N / 33P /
   33Q / 33R / 33U / 33V / 33W–33Z → 46A → 46B → 46C → 46D → 46E → 46F → 46G → 46H), the canonical
   Straylight receipt/audit substrate, and the held ADR-022E gates are summarized (§2).
3. **Starting accepted facts recorded** — the dev/operator no-consent spike posture, service auth ≠
   consent, the 33K consent options (D rejected), the private-audit-only consent reference, the five
   green vectors with `consent_implemented: false`, and the held gates (§3).
4. **Consent boundary decided** — service auth ≠ consent; operator/dev ≠ production consent; consent
   binds to subject / estate / actor / tenant / caller; consent distinguishes propose / accept /
   reject / supersede / recall-use scopes; consent not inferred from chat; public remember-this,
   Discord ingestion, chat-as-memory blocked (§4).
5. **Consent-proof object model decomposed** — subject / grantor / scope / candidate ref / transition
   ref / identity binding / signer ref / timestamp-expiry-revocation / policy ref / public-safe
   receipt ref / private proof material / audit linkage, all draft and un-frozen (§5).
6. **Consent-receipt boundary decided** — public-safe vs private split; how it differs from
   `TransitionReceipt` / `AuditEvent`; linked to `AuditEvent` (primary) + optionally
   `TransitionReceipt`; public ref avoids leaking; revocation/expiry boundary without MVP-3 (§6).
7. **Consent failure / refusal taxonomy decomposed** — missing / malformed / subject-mismatch /
   scope-mismatch / tenant-estate-actor-mismatch / expired / revoked / replayed-or-conflicting /
   signer-invalid / leak-attempt, all fail-closed, decision taxonomy only (§7).
8. **Interaction with auth / identity / signer decided** — auth identifies caller; signer validates
   competence; consent proves permission; none collapses; all auditable without public exposure (§8).
9. **Public / private no-leak boundary decided** — no leak of consent / auth / identity / signer /
   receipt / audit / debug material; only a narrow public-safe receipt reference may cross; the
   **known canonical consent-key hardening gap** recorded rather than overclaimed, with no runtime /
   validator mutation (§9).
10. **Options assessed and safest next lane selected** — the six consent options assessed; the
    dev/operator posture retained, the draft vocabulary accepted, Option 6 binding, the production
    consent model deferred; a docs/decision-only next lane selected (§10, §13).
11. **Required invariants restated** — pending not recallable; rejected mints nothing; accepted
    creates/references; superseded excluded; malformed fails closed; missing/unauthorized auth fails
    closed; missing/invalid consent fails closed; public no-leak; private receipt/audit/consent
    private; not user-chat memory; public remember-this blocked; Discord ingestion blocked; production
    admission/storage/auth/consent blocked; route-contract + schema + consent-schema freeze blocked;
    ADR-022E gate #8 uncleared; auditability without history rewrite (§11).
12. **Exit criteria recorded** — the nine exit criteria for any future implementation lane, none
    satisfied by Phase 46H (§12).
13. **Next lane selected + ordering updated** — a docs/decision-only successor selected; the post-46H
    ordering recorded with implementation downstream (§13).
14. **Blocked lanes preserved** — no consent / auth / identity / signer / durable / DB-write /
    migration / schema / route / Freeside / package / production-readiness lane is authorized, and no
    vector / validator / fixture is mutated (§14).
15. **Corruption / duplicate guard applied** — the document passes the §15 guard, with results
    recorded in §16.
16. **No freeze, no production-readiness claim, no gate clearance** — Phase 46H freezes neither the
    route contract, the schema, nor a consent schema, declares no production readiness, and does
    **not** clear ADR-022E gate #8 (§1, §14).

---

## 18. Cross-references

- [`docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
  — Phase 46G (PR #152); its §9 / §12 selected this Phase 46H consent proof / receipt decision gate
  as the next lane, held the consent boundary separate from service authentication (§4.1), and
  recorded the canonical signer/consent key-name no-leak hardening gap (§8) this gate extends.
- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-SHAPE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 46F (PR #151); aligned the durable storage shape onto the vectors docs-only and noted the
  auth/consent reference persistence as future work.
- [`docs/ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md`](ADMISSION-WEDGE-DURABLE-STORAGE-MODEL-DECISION-GATE.md)
  — Phase 46E (PR #150); selected the storage model direction and recorded that the consent reference
  is persisted privately onto the audit record.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md)
  — Phase 46D (PR #149); noted the auth decision is "tightly coupled to consent (C)" and sequenced the
  per-area gates.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md)
  — Phase 46C (PR #148); decomposed the consent blockers into ordered sub-gates.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V (PR #140); §5 finalized the consent proof / receipt boundary (private-audit-only
  reference; dev/operator omission non-production; Option D rejected; cross-user blocked); §7 tabled
  the consent decision; adopted `public_receipt_ref`.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K (PR #129); §10 designed the consent Options A/B/C/D (A or B before production; C
  non-production; D rejected); §6.9 / §13 fixed the consent reference as private-audit-only; §11 the
  identity binding; §12 the dev/operator-only scope option.
- [`docs/ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)
  — Phase 33M (PR #131); authorized the dev/operator-only spike, Service auth ≠ end-user consent (§12), no
  end-user consent model, synthetic subjects only, no cross-user admission, no chat-to-memory, no
  public remember-this.
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U (PR #139); the A–O reconciliation (rows F / G / J / O held; Row B ingress-refs-only)
  grounding §2 / §5 / §8.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  with the five vector JSONs — inspected **read-only** to ground the `consent_implemented: false`
  flag, the `end_user_consent_model: draft_non_implemented` assumption, the `consent_assumption:
  draft_*` markers, the no-leak boundary, and the consent key-name hardening gap. **None is modified.**
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/{auth-gate,classifier,public-response,no-leak,admitted-assertion-ledger}.ts`,
  and `app/src/middleware/{allowlist,jwt}.ts` — inspected **read-only** to ground the §3 spike
  no-consent facts, the §4 boundary, the §7 fail-closed taxonomy, and the §9 no-leak projection.
  **None is modified.**
- `loa-straylight/src/straylight/{types,estate,audit,keyring,signatures}.ts`,
  `loa-straylight/src/straylight/storage/types.ts`,
  `loa-straylight/docs/decisions/{ADR-022D,ADR-022E}-…md`, and
  `loa-straylight/docs/mvp/threat-model.md` — inspected **read-only** as the **canonical** Straylight
  substrate cited in §2.2 / §5 / §6 / §8 (the `TransitionReceipt` / `AuditEvent` / `signer_refs`
  primitives; `SignerCompetenceRule` / `Keyring`; `subject_refs`; the dev-signature placeholder; the
  T5 / T6 privacy/cross-tenant invariants; ADR-022D audit-owner; ADR-022E gate #8). **Not edited by
  this phase.**
- `@loa/straylight` — canonical primitive / substrate owner; PR #65 (merged) answered the A–O
  primitive review. Straylight-repo ADR-022E (durable-store gate #8 + related gates #10 / #12 / #20,
  **held**), ADR-022D (receipt/audit-chain invariants), ADR-026C, ADR-026D are decision records cited
  as guardrails. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — the cross-repo acceptance whose
  mirror/adapter is test-only, not exported, not runtime-wired; the consent-UX / client-contract
  handoff stays deferred (§12 criterion 8). **Not edited by this phase.**
