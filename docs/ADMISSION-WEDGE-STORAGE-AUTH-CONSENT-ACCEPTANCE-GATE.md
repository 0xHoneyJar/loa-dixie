# Phase 46D — Admission Wedge Storage/Auth/Consent Acceptance Gate

> **Phase**: 46D
> **Branch context**: `phase-46d-admission-storage-auth-consent-acceptance`
> **Related**: Phase 46C storage/auth/consent blocker decomposition (PR #148);
> Phase 46B route-contract implementation-readiness decomposition (PR #147);
> Phase 46A route-vector alignment acceptance (PR #146); Phase 33Z route-vector
> alignment (PR #144) + its PR #145 next-lane label/provenance correction; Phase
> 33Y route-contract revision acceptance (PR #143); Phase 33X route-contract
> revision draft (PR #142); Phase 33W route-contract readiness update (PR #141);
> Phase 33V storage/auth/consent design finalization (PR #140); Phase 33U
> Straylight-response intake (PR #139); Phase 33K storage/auth/consent precondition
> design; Straylight (`@loa/straylight`) PR #65 (A–O primitive-review verdicts,
> **merged**); ADR-022E durable-store gate #8 (and related gates #10 / #12 / #20),
> **held**; ADR-022D receipt/audit-chain invariants; ADR-026C / ADR-026D route
> guardrails; freeside-characters Phase 45J / PR #177 (Dixie v1 mirror-refresh
> acceptance, merged 2026-06-06).
> **Status**: **docs / decision-only.** No source, test, route, route handler,
> storage, store code, DB write, migration, auth, consent, **route-vector JSON**,
> **route-vector validator**, **route-vector README**, **Phase 33E fixture /
> fixture validator**, package export, config, env, package, lockfile, CI,
> generated, binary, or live-integration change. No adjacent repository
> (`loa-straylight`, `freeside-characters`) is touched.
> **This is a storage/auth/consent acceptance gate, not implementation.** It
> accepts, patches, or splits the Phase 46C blocker decomposition and decides the
> safest next direction. It does **not** implement storage, **not** implement auth,
> **not** implement consent, **not** implement route / API behavior, **not**
> authorize route / API implementation, **not** authorize an implementation-spike
> checklist (unless one were explicitly selected as a future lane only — it is
> not), **not** freeze the final route contract, **not** freeze the final schema,
> and **not** declare production readiness.

Every assessment below is grounded read-only against the actual Dixie repo (the
Phase 46C decomposition gate, the Phase 46A / 46B gates, the Phase 33K precondition
design, the Phase 33U / 33V / 33W / 33X / 33Y / 33Z chain, the five route-vector
JSONs, the route-vector validator and its README, the Phase 33N spike source under
`app/src/services/admission-wedge-spike/` and `app/src/routes/admission-intake.ts`,
the spike mount in `app/src/server.ts`, the Straylight-mirror audit-adapter surface
in `app/src/services/straylight-recall-intake/bounded-estate-store.ts`, and the dev
runbooks under `docs/admission-wedge/`) and against the Straylight
(`@loa/straylight`) PR #65 verdicts as already reconciled by Dixie Phase 33U. Where
a claim could not be grounded inside the read material, it is marked as such.

---

## 1. Status and scope

Phase 46D is the bounded **storage/auth/consent acceptance gate** that follows, and
is named by, Phase 46C
([`ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md)
§7 / §8, PR #148). Phase 46C decomposed the held storage, auth, consent, and shared
public/private blockers into ordered, separately-clearable sub-gates and **selected
Phase 46D — Admission Wedge storage/auth/consent acceptance gate (docs /
decision-only; not runtime)** as the next lane: the docs/decision checkpoint that
**accepts, patches, or splits** that decomposition before any per-area decision,
route-contract freeze, or implementation. Phase 46D executes exactly that charter:
it assesses and accepts the Phase 46C decomposition, records the Phase 46C
patch-resolution, ranks the candidate next lanes, selects the next safe direction,
and stops.

Phase 46D:

- is **docs / decision-only** — it accepts / patches / splits the Phase 46C
  storage/auth/consent blocker decomposition and selects the next safe lane;
- **does not implement storage** — no durable store, schema, table, migration, or
  storage write;
- **does not implement auth** — no service-auth, signer/authority, or identity
  binding code;
- **does not implement consent** — no consent proof, receipt, or revocation code;
- **does not implement route / API behavior** and **does not authorize route / API
  implementation** (the Phase 33N dev/operator-only, disabled-by-default spike
  remains the only authorized route surface);
- **does not authorize an implementation-spike readiness checklist** — none is
  selected here, and an implementation-spike checklist remains a downstream lane;
- **does not modify** runtime source, the route-vector JSONs, the route-vector
  validator, the route-vector README, the Phase 33E fixtures, the Phase 33E fixture
  validator, validators of any kind, vectors, package exports, config / env, CI,
  migrations, generated files, binaries, or any adjacent repository
  (`loa-straylight`, `freeside-characters`);
- **does not freeze** the final route contract;
- **does not freeze** the final / canonical / production schema;
- **does not declare** production readiness of any kind.

> **An acceptance gate authorizes no runtime work.** Phase 46D accepts (or patches /
> splits) the Phase 46C decomposition as a sub-gate plan; accepting a decomposition
> is **not** clearing a gate. It does not clear ADR-022E durable-store gate #8 (or
> the related held gates #10 / #12 / #20), does not decide a durable store, an auth
> model, or a consent model, does not freeze the route contract or the schema, and
> does not authorize a route. A later, separately-gated phase must clear each
> sub-gate on its own evidence. Phase 46D's only output is this decision/status
> document; no cross-reference status note in another file was required (see §12) —
> matching the Phase 46A / 46B / 46C precedent of a single self-contained gate
> document.

---

## 2. Source chain

This gate sits one rung above the Phase 46C storage/auth/consent blocker
decomposition gate on the Dixie route-contract ladder. It introduces no new contract
or vector material; it accepts / patches / splits the storage/auth/consent
decomposition Phase 46C produced and selects what comes next.

### Dixie (loa-dixie) — the storage/auth/consent and route-contract lanes

| Phase | PR | Artifact / contribution (relevant to storage/auth/consent acceptance) |
|-------|----|------|
| 33K | — | **Storage/auth/consent precondition design.** Drafted the eleven storage record categories, the four service-auth options A/B/C/D, the four end-user consent options A/B/C/D, the idempotency precondition, the no-leak public/private preconditions, the threat model, and the exit criteria. Treated the Straylight A–O answers as exit criteria; froze nothing. |
| 33U | #139 | **Straylight-response intake.** Reconciled `@loa/straylight` PR #65's A–O verdicts (accepted / re-related / delegated / held). Rows **F (production authority), G (production identity binding), J (final endpoint idempotency keying), O (durable store under ADR-022E gate #8)** remain **held**. Cleared no independent production gate. |
| 33V | #140 | **Storage/auth/consent design finalization.** Adopted `public_receipt_ref`, retired `receipt_public_ref`; split `SyntheticAuditRecord` → `AuditEvent` + `TransitionReceipt`; drew the private/public projection boundary on `privacy_scope` + environment-frame disposition (denylist = defense-in-depth); restated "service auth ≠ end-user consent"; kept ADR-022E gate #8 **held** and migration/backfill/rollback **undesigned**. |
| 33W | #141 | **Route-contract readiness update.** Rendered the contract "more ready than 33H but NOT final/frozen, NOT implementation-ready"; defined the draft-update checklist 33X executed; kept endpoint idempotency Dixie-owned and atomicity/rollback a design requirement, not implemented. |
| 33X | #142 | **Route-contract revision draft.** Standardized the public envelope on `public_receipt_ref` (`null` where none minted); marked endpoint idempotency **Dixie-owned**; adopted the two-part `category.specific_reason` refusal taxonomy; rejected a public `admission.duplicate_replay` code; corrected the 33N spike auth layering (admission header is defense-in-depth **on top of** the global `/api/*` gate, not a replacement); `route_contract_final: false`. |
| 33Y | #143 | **Route-contract revision acceptance.** Accepted 33X as a **draft baseline** (not final / frozen, not production-ready); decided vector-readiness = ready; selected Phase 33Z. Mutated no vector / validator. |
| 33Z | #144 | **Route-vector alignment.** Replaced `public_receipt_ref_policy` with `public_receipt_ref` across the five vectors; strengthened the validator (retired-key lock, exact `safe_reason_code`, private-shape no-leak); added the `--self-check` negative-mutation harness; left the Phase 33E fixtures untouched; stayed non-runtime. |
| 33Z (corr.) | #145 | **Next-lane label/provenance correction.** Corrected the 33Z next-lane label from **Phase 34A** to **Phase 46A** because `34A` collides with the completed stack-wide Freeside Characters Phase 34A / PR #100. Label/provenance only — no vector / validator alignment change, no runtime authorized, no accepted scope reopened. |
| 46A | #146 | **Route-vector alignment acceptance.** Accepted the 33Z alignment + PR #145 correction as a bounded, non-runtime vector / validator alignment; recorded what 33Z proved and did not prove; **did not** accept implementation readiness; selected Phase 46B. |
| 46B | #147 | **Route-contract implementation-readiness decomposition.** Decomposed what remains before any route / API implementation; ranked candidate lanes; judged the storage/auth/consent cluster the upstream dependency; selected Phase 46C. Mutated no vector / validator / fixture / source. |
| 46C | #148 | **Storage/auth/consent blocker decomposition.** Decomposed the held storage (11 rows), auth (10 rows), consent (10 rows), and shared public/private (7 rows) blockers into ordered, separately-clearable sub-gates; ordered their dependencies; ranked the candidate next lanes; **selected this Phase 46D storage/auth/consent acceptance gate** (Option D). Recorded the Codex patch resolution (see §4). Mutated no vector / validator / fixture / source. |
| **46D** | *(this doc)* | **Storage/auth/consent acceptance gate.** Accepts the Phase 46C decomposition as a valid blocker decomposition baseline (§3), records the Phase 46C patch resolution (§4), makes the explicit acceptance decision (§5), analyzes and ranks the candidate next lanes (§6), selects the next safe lane (§7), updates the dependency ordering (§8), and preserves the blocked lanes (§9). Mutates no vector / validator / fixture / source. |

> **PR-number provenance note.** The PR numbers above are taken from the local git
> merge-commit history (`docs: … (#NNN)` subjects) and the Phase 46A / 46B / 46C
> source-chain tables. Phase 46C's `#148` is the merge commit
> `eb735355 "docs: decompose admission storage auth consent (#148)"`. Treat the PR
> numbers as git-sourced rather than as authority embedded in the gate bodies (each
> gate refers to itself only as "this doc").

### Upstream context preserved

- **Straylight PR #65 (merged) — A–O primitive-review verdicts.** Straylight
  answered the Dixie primitive-review request across rows A–O; **Dixie Phase 33U
  reconciled** it
  ([`ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  §4). PR #65 clarified the *vocabulary / design* only; it **cleared no independent
  production gate** and authorized **no** Dixie runtime, production storage / auth /
  consent, or Freeside integration. The still-held rows that gate this acceptance
  are **F (production authority), G (production identity binding), J (final endpoint
  idempotency keying), and O (durable store under ADR-022E gate #8)** (33U §4).
- **ADR-022E gates (Straylight-repo decision records), held.** Gate **#8**
  (production persistence) governs any durable admission store; the related gates
  **#10** (broad Dixie boundary wiring), **#12** (new network surface), and **#20**
  (threat-model widening) are likewise **held** and not cleared by PR #65 (33U §3.1).
  The ADR-022D receipt/audit-chain invariants must be preserved by any future
  gate-clearing ADR.
- **Residual legacy marker prose.** The pre-correction `[E,G,H,K,N,O]` / `[J]`
  marker arrays still present in some vector JSONs, the route-vector validator
  comments, and the Phase 33N classifier comments are **legacy textual debt only,
  not the current review-state authority**; the authoritative classification lives
  in the route-vector README current-state correction
  ([`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)).
  Phase 46D preserves that distinction and mutates no technical artifact.

> **Cross-repo phase-numbering caution.** Dixie's 33-/46-series, the
> freeside-characters 34-/45-series, and Straylight's ADR / PR labels are
> independent labels in separate repositories and must not be conflated. The Dixie
> `46A` / `46B` / `46C` / `46D` continuation past the exhausted `33` single-letter
> suffix space avoids reusing the completed Freeside Characters Phase 34A / PR #100;
> `46D` signals **no** new product epoch and **no** scope expansion — it is the same
> Admission Wedge arc, still docs/decision-only.

---

## 3. Phase 46C acceptance assessment

Phase 46D's blanket assessment is: **ACCEPT Phase 46C as a valid blocker
decomposition baseline.** Phase 46C correctly decomposed the held storage, auth,
consent, and shared public/private blockers into ordered, separately-clearable
sub-gates with per-area exit criteria. It is accepted **as that decomposition only**
— explicitly **not** as any of the following:

- **not** implementation readiness;
- **not** a final route-contract freeze;
- **not** a final schema freeze;
- **not** production readiness;
- **not** storage implementation readiness by itself;
- **not** auth implementation readiness by itself;
- **not** consent implementation readiness by itself.

Phase 46C closed **no** row as implementation readiness — every row in its §4 tables
records a blocker still open before implementation, with a gating condition
("implementation must not start until …"), and §4 states explicitly that no Phase
46C row was treated as closed implementation readiness. Phase 46D re-verifies and
preserves that: **no Phase 46C row is treated here as closed implementation
readiness either.**

### 3.1 Storage decomposition — accepted as correctly decomposed

Phase 46C's storage decomposition (§4.1) is accepted as a correct decomposition of:

- durable store architecture;
- ADR-022E durable-store gate (#8);
- admitted assertion persistence;
- candidate / proposed material persistence;
- TransitionReceipt persistence;
- AuditEvent persistence;
- public receipt reference persistence;
- idempotency / replay ledger persistence;
- rollback / recovery / migration / backfill;
- tenant isolation and cross-tenant protection;
- deletion / forgetting / revocation implications.

Accepted **as a decomposition of held storage blockers**, not as a durable-store
design, not as clearing ADR-022E gate #8, and not as storage implementation
readiness.

### 3.2 Auth decomposition — accepted as correctly decomposed

Phase 46C's auth decomposition (§4.2) is accepted as a correct decomposition of:

- service auth boundary;
- endpoint-local admission header / service token;
- global `/api/*` auth interaction;
- operator / dev-only controls;
- production caller identity;
- tenant / estate / actor binding;
- signer / authority model;
- cross-user / cross-tenant denial posture;
- replay / conflict authority;
- auth decision auditability.

Accepted **as a decomposition of held auth blockers**, not as a production auth /
identity / signer model, and not as auth implementation readiness (PR #65 rows F / G
still held).

### 3.3 Consent decomposition — accepted as correctly decomposed

Phase 46C's consent decomposition (§4.3) is accepted as a correct decomposition of:

- end-user authorization vs service authentication;
- consent proof;
- consent receipt;
- consent revocation;
- user-visible admission acknowledgement;
- public `remember-this` exclusion;
- Discord / freeform ingestion exclusion;
- Freeside Characters handoff consent boundary;
- third-party / user-sensitive candidate material;
- audit / private-public split for consent evidence.

Accepted **as a decomposition of held consent blockers**, not as a production
consent-proof / receipt / revocation model, and not as consent implementation
readiness.

### 3.4 Public/private boundary decomposition — accepted as correctly decomposed

Phase 46C's public/private boundary decomposition (§4.4) is accepted as a correct
decomposition of:

- public admission response;
- private TransitionReceipt;
- private AuditEvent;
- no-leak serializer;
- public receipt reference;
- safe reason codes;
- raw / source / debug / private field exclusion.

Accepted **as a decomposition of the shared public/private boundary**, not as a
frozen public schema, not as the production no-leak serializer, and not as
public-surface implementation readiness.

> **What this acceptance does and does not mean.** Phase 46D accepts that Phase 46C
> made the held blockers **legible and orderable**. It does not accept that any
> blocker is **cleared**. The §4 patch resolution, the §5 acceptance decision, the
> §6 option analysis, and the §7 selected lane all operate inside that boundary:
> the decomposition is accepted; the per-area decisions and everything downstream
> remain separately held.

---

## 4. Required corrections / patches from Phase 46C

Phase 46C carried a **Codex patch resolution** that corrected wording and narrowed an
over-broad blocker. Phase 46D records that resolution as accepted, re-verified
read-only against the live spike source:

1. **`/api/admission/intake` exists as the default-off Phase 33N non-production
   spike.** It mounts **only** when the spike is explicitly enabled
   (`app/src/server.ts` mounts `/api/admission/intake` under
   `config.admissionIntakeSpikeEnabled`, gated by `DIXIE_ADMISSION_INTAKE_ENABLED
   === 'true'`; the route header in `app/src/routes/admission-intake.ts` declares it
   a "dev/operator-only route SPIKE … using Storage Option A (no durable store)").
   The server logs `note: 'dev/operator-only Admission Wedge route spike enabled —
   NOT production admission'` on mount.
2. **No production admission route exists.** The spike is the only admission route
   surface; `app/src/server.ts` records the route "does NOT authorize production
   storage/auth/consent, Freeside …" — there is no production admission handler.
3. **`dev_signature` has development-only generation/verification logic.**
   `dev_signature` is an `@loa/straylight` `SignatureType` member, caller-computed
   (HMAC over the signed payload hash, per the recall-intake dev-seeded-estate path),
   marked **DEVELOPMENT-ONLY upstream**, and never stored.
4. **`dev_signature` has no production cryptographic authority.** It carries no
   production signing authority; production signer / authority remains held (PR #65
   row F), and production identity binding remains held (PR #65 row G).
5. **The nonexistent `StorageAdapter.audit_events` wording was replaced, and the
   canonical source was corrected.** The Phase 33K precondition-design phrasing
   `StorageAdapter.audit_events` does not name a live method; the corrected,
   source-real audit-adapter surface is:
   - `appendAuditEvent`
   - `listAuditEvents`
   - `getAuditTail`

   Canonical Straylight storage evidence is
   `loa-straylight/src/straylight/storage/types.ts`, which declares
   `appendAuditEvent`, `listAuditEvents`, and `getAuditTail` on the `StorageAdapter`
   interface (the append-only, hash-chained audit-events block);
   `loa-straylight/src/straylight/audit.ts` shows `AuditLog` delegates through that
   storage-adapter path (`getAuditTail` for the previous tail, `appendAuditEvent` on
   write, `listAuditEvents` on read). Dixie's
   `app/src/services/straylight-recall-intake/bounded-estate-store.ts` only mirrors
   those method names — its `MinimalStorageSurface` re-declares the trio and its
   minimal audit log manipulates local in-memory state directly rather than
   delegating through a `StorageAdapter` — so it is local Dixie mirror / parity
   evidence, **not** canonical API or `AuditLog`-delegation evidence.
6. **The unresolved blocker was narrowed.** It is **Dixie production Admission Wedge
   persistence binding for private `TransitionReceipt` / `AuditEvent` material** —
   what durable append-only, hash-chained substrate persists that material and how
   controlled access / retention is enforced — **not** whether Straylight has
   `AuditLog` / storage-adapter precedent (it does: the `appendAuditEvent` /
   `listAuditEvents` / `getAuditTail` surface above).
7. **The actual file-corruption audit passed.** Despite duplicated / corrupted
   terminal-report output observed while producing Phase 46C, the committed Phase 46C
   document itself passed its file-integrity checks (single section headings,
   balanced fences, no pasted terminal fragments). Phase 46D re-applies the same
   corruption / duplicate guard to **this** document (§10) so the same terminal-output
   artifact cannot silently corrupt the committed file.

> **These are wording / scoping corrections, not gate clearances.** Recording the
> patch resolution corrects the audit-adapter naming and narrows the persistence
> blocker; it does **not** clear ADR-022E gate #8, does **not** design a durable
> store, and does **not** authorize storage / auth / consent implementation.

---

## 5. Acceptance decision

Phase 46D makes the following explicit decision:

1. **Accept Phase 46C as the storage/auth/consent blocker decomposition baseline.**
   The storage (11), auth (10), consent (10), and public/private (7) decompositions
   are accepted as a valid, ordered, separately-clearable sub-gate plan (§3), and
   the Codex patch resolution is accepted (§4).
2. **Do not split Phase 46C retroactively.** The decomposition's clustering (storage
   ↔ idempotency ↔ rollback; auth ↔ consent ↔ identity binding; all ↔ the
   public/private no-leak boundary) is coherent and does not require retroactive
   splitting of the 46C document. The *forward* question — whether the **next lane**
   is per-area or combined — is decided in §6 / §7.
3. **Do not authorize implementation.** No storage, auth, consent, route / API, DB
   write, or migration work is authorized by accepting the decomposition.
4. **Do not jump to route-contract freeze yet.** The route-owned questions
   (idempotency keying, the dotted `admission.*` taxonomy + HTTP mapping, identity
   binding, atomicity / rollback) depend on storage / auth / consent semantics that
   remain held; a pre-freeze must follow, not precede, those per-area decisions.

**What should come next.** Because Phase 46C shows storage, auth, and consent are
**tightly coupled** — auth and consent cannot be fully accepted without first knowing
what is persisted, what is private, what is public, what is replayable, what is
revocable, and what audit material exists — Phase 46D decides the next lane should be
a **specific per-area decision gate**, not a combined storage/auth/consent mega-gate
and not implementation. Among the per-area options, **storage is the deepest
blocker**: ADR-022E durable-store gate #8 remains held, and the auth / consent /
public-private decisions all reference *what is persisted*. Phase 46D therefore
selects the **durable storage model decision gate** as the next lane (§7), keeping
the auth/identity/signer and consent proof/receipt gates downstream of it, and the
route-contract pre-freeze and implementation-spike checklist downstream of those.

This keeps the blast radius smaller than a combined storage/auth/consent acceptance
mega-gate (Option D below) while still respecting the coupling the decomposition
surfaced. **Runtime implementation is not selected as the next lane under any
option.**

---

## 6. Option analysis

Phase 46D considers eight candidate next lanes. For each: what it would prove, what
it would **not** prove, whether it is the immediate next step, and why it is
accepted / rejected / deferred. **Runtime implementation is not a candidate option —
no artifact accepted so far proves implementation is safe (§3, §9).** Every option
below begins from the same accepted premise: Phase 46C is accepted as the
decomposition baseline (§5).

### Option A — accept Phase 46C and proceed to a durable storage model decision gate

- **Proves:** the durable storage model required before any route implementation —
  what is persisted vs derived vs projected, the admitted-assertion / candidate /
  `TransitionReceipt` / `AuditEvent` / public-receipt-ref / idempotency-ledger
  persistence questions, the rollback / recovery / migration / backfill posture, the
  tenant-isolation model, and the ADR-022E gate #8 relation.
- **Does not prove:** the auth / identity / signer model or the consent
  proof / receipt model that the stored material must be bound to; storage alone
  cannot bind admitted material to an authorized actor / consenting subject.
- **Immediate next step?** **Yes.** Storage is the deepest blocker; the auth and
  consent gates both reference *what is persisted, private, public, replayable,
  revocable, and audited*, so deciding the storage model first reduces rework in the
  downstream auth / consent gates.
- **Disposition:** **ACCEPTED — selected (§7).** Smallest per-area blast radius that
  unblocks the most downstream questions.

### Option B — accept Phase 46C and proceed to an auth / identity / signer authority decision gate

- **Proves:** the production service-auth model (33K options A vs B), the production
  identity-binding rule (PR #65 row G), and the signer / authority model (PR #65 row
  F).
- **Does not prove:** the durable substrate that persists the authorized material, or
  the consent model that gates cross-user admission; auth decisions reference audit /
  identity records whose persistence the storage gate must first decide.
- **Immediate next step?** **No — deferred.** Tightly coupled to consent (C) and
  dependent on knowing what is persisted (A). Best sequenced **after** the durable
  storage model gate.
- **Disposition:** **DEFERRED** to step 3 of the §8 ordering.

### Option C — accept Phase 46C and proceed to a consent proof / receipt decision gate

- **Proves:** the production consent-proof model (33K option A artifact vs option B
  platform grant) and the consent-receipt shape / private-audit binding.
- **Does not prove:** the auth model it sits on top of, or the durable substrate that
  persists the consent evidence (consent receipts live on the private audit record,
  whose persistence the storage gate must first decide).
- **Immediate next step?** **No — deferred.** Depends on auth (B) and storage (A).
- **Disposition:** **DEFERRED** to step 4 of the §8 ordering.

### Option D — accept Phase 46C and proceed to a combined storage/auth/consent acceptance gate

- **Proves:** a single combined acceptance of the per-area decisions with one agreed
  dependency ordering and one exit-criteria set.
- **Does not prove:** it would decide all three coupled areas in one lane, which
  **widens** the blast radius and conflates the deepest blocker (storage / ADR-022E)
  with the decisions that depend on it; it would not isolate the storage decision the
  others reference.
- **Immediate next step?** **No — rejected as the next lane.** Phase 46D's whole
  charter (§5) is to prefer a **specific per-area gate** over a combined mega-gate;
  a combined gate re-couples what the decomposition deliberately ordered.
- **Disposition:** **REJECTED** as the next lane (the per-area path A → B → C is
  preferred); available as a documented alternative if a reviewer judges the coupling
  too tight to split.

### Option E — accept Phase 46C and proceed to a final route-contract pre-freeze gate

- **Proves:** that the route contract (envelopes, taxonomy, idempotency keying,
  identity binding, atomicity / rollback) is stable enough to pre-freeze.
- **Does not prove:** that the storage / auth / consent semantics it depends on are
  decided — a contract pre-frozen over unresolved semantics would fix the wrong shape
  and force rework.
- **Immediate next step?** **No — premature.** It is a downstream step in the §8
  ordering and depends on the per-area gates; the dependency order must not be
  inverted.
- **Disposition:** **DEFERRED** to step 5 of the §8 ordering.

### Option F — accept Phase 46C and proceed to an implementation-spike readiness checklist

- **Proves:** the exact evidence required before extending past the Phase 33N
  dev/operator-only spike.
- **Does not prove:** that the storage / auth / consent decisions it would reference
  are made — the checklist would otherwise reference undecided sub-gates and need
  rewriting.
- **Immediate next step?** **No — premature.** Most useful *after* the per-area
  decisions land. Phase 46D explicitly does **not** authorize an implementation-spike
  readiness checklist as the next lane.
- **Disposition:** **DEFERRED** to step 6 of the §8 ordering.

### Option G — patch / split Phase 46C further before any next lane

- **Proves:** a corrected or finer-grained 46C decomposition if the decomposition
  were found incomplete or miscut.
- **Does not prove:** any production blocker resolution; Phase 46D finds the 46C
  decomposition coherent and the Codex patch resolution (§4) already folded in, so a
  further patch / split would be churn with no decomposition gain.
- **Immediate next step?** **No — not warranted.** The decomposition is accepted as
  valid (§3 / §5); the only forward refinement needed (per-area vs combined next
  lane) is decided in §7, not by re-cutting 46C.
- **Disposition:** **REJECTED** (no retroactive split — §5 decision 2).

### Option H — stop / cross-repo review

- **Proves:** a Straylight or freeside-characters checkpoint before any further Dixie
  lane.
- **Does not prove:** it advances no Dixie decision; the primitive-vocabulary review
  (A–O) is already answered (PR #65) and reconciled (33U).
- **Immediate next step?** **No — not required now.** A production security /
  cross-repo *runtime* review remains a valid downstream gate, but it is not the
  highest-leverage immediate action.
- **Disposition:** **DEFERRED** (available at any point; not highest-leverage now).

**Ranking (for immediacy):** **A ≻ B ≈ C ≻ D ≻ E ≻ F ≻ G ≻ H.** Option A (durable
storage model decision gate) is the deepest-blocker per-area gate and is selected; B
and C are the coupled per-area gates that follow it; D (combined gate) is rejected as
the next lane because it widens blast radius; E (pre-freeze) and F (spike checklist)
are premature until the per-area gates land; G (re-split) is not warranted; H (stop)
is available but not highest-leverage. The repo evidence supports this ranking: the
deepest held gate is ADR-022E gate #8 (durable store), and the auth / consent /
public-private rows in 46C §4 each reference *what is persisted* — so storage is the
correct first per-area decision.

---

## 7. Selected next lane

> **Selected: Phase 46E — Admission Wedge durable storage model decision gate
> (docs / decision-only; not runtime).** *(Option A.)*

**Reason:**

- Phase 46D must **not** jump to runtime implementation — no artifact accepted so far
  proves implementation is safe (§3, §9), and §8 shows every implementation-adjacent
  step (auth gate, consent gate, route-contract pre-freeze, spike checklist, bounded
  spike) is held.
- A **combined storage/auth/consent acceptance mega-gate (Option D) is rejected** as
  the next lane: it would re-couple the deepest blocker (storage / ADR-022E gate #8)
  with the decisions that depend on it and **widen** the blast radius, contrary to
  Phase 46D's charter (§5) to prefer a specific per-area gate.
- **Storage is the deepest blocker.** ADR-022E durable-store gate #8 remains held,
  and the auth and consent gates both reference *what is persisted, what is private,
  what is public, what is replayable, what is revocable, and what audit material
  exists*. Those questions cannot be fully answered by an auth or consent gate run
  first; the durable storage model decision answers them and unblocks the most
  downstream work.
- An **auth / identity / signer gate (Option B)** and a **consent proof / receipt
  gate (Option C)** are therefore **deferred** to run after the storage gate, in that
  order (§8). They are not rejected — they are sequenced downstream of the storage
  decision they depend on.
- A **route-contract pre-freeze (Option E)** and an **implementation-spike readiness
  checklist (Option F)** are **premature** until the per-area decisions land, and
  remain downstream.
- **Re-splitting Phase 46C (Option G)** is not warranted (§5 decision 2), and a
  **cross-repo stop (Option H)** is available but not highest-leverage now.

**Phase 46E scope (defined here; executed only in Phase 46E):**

> **Phase 46E — Admission Wedge durable storage model decision gate. Docs /
> decision-only.**

**Allowed scope**

- docs / decision-only;
- decide the durable storage model required before Admission Wedge route
  implementation can be authorized;
- address the ADR-022E durable-store gate (#8) relation (what evidence a
  gate-clearing ADR would require, preserving the ADR-022D receipt/audit-chain
  invariants — without clearing the gate);
- define what must be **persisted** vs **derived** vs **projected**;
- define admitted-assertion persistence;
- define candidate / proposed material persistence (retention / sanitization /
  privacy);
- define `TransitionReceipt` persistence (private; write-time projection boundary);
- define `AuditEvent` persistence (append-only, hash-chained; controlled-access);
- define public receipt reference persistence (mint / resolution, or a decision not
  to mint);
- define idempotency / replay ledger persistence (Dixie / endpoint-owned);
- define the rollback / recovery / migration / backfill posture;
- define tenant isolation / cross-tenant storage protection;
- define the deletion / forgetting / revocation implications against an append-only
  audit substrate.

**Blocked scope (Phase 46E must not do any of these)**

- no implementation of any kind;
- no DB writes;
- no migrations;
- no route / API implementation;
- no package exports;
- no Freeside runtime / client integration;
- no clearing of ADR-022E gate #8 (a storage-model *decision* is not gate-clearing);
- no auth / consent implementation;
- no route-contract or schema freeze;
- no production-readiness claim.

**Caveat (surfaced, not suppressed).** Selecting Phase 46E commits to *deciding* the
durable storage model in a later, separately-gated phase; it does **not** decide that
model now, does **not** clear ADR-022E gate #8, and does **not** authorize storage
implementation, DB writes, or migrations. Phase 46E's output will be a storage-model
**decision document**, not a durable store.

**Documented alternative.** If a reviewer judges the auth / identity / signer
authority (Option B) or the consent proof / receipt (Option C) the more urgent first
per-area gate, that is recorded here as the documented alternative. Phase 46D does
**not** select it, because the storage model is the deepest blocker and the auth and
consent decisions both reference *what is persisted*; deciding storage first reduces
downstream rework. **Runtime implementation is not selected under any option.**

---

## 8. Dependency ordering after Phase 46D

With Phase 46C accepted and Phase 46E selected, the ordering of dependencies
**before** any implementation is:

1. **Phase 46D accepts the Phase 46C storage/auth/consent decomposition.** *(This
   gate.)*
2. **Phase 46E — durable storage model decision gate** *(selected next lane, §7)* —
   decides what is persisted / derived / projected and the ADR-022E gate #8 relation,
   without clearing the gate.
3. **Auth / identity / signer authority decision gate** — the production service-auth
   model, identity binding (PR #65 row G), and signer / authority (PR #65 row F),
   decided against the now-decided storage model.
4. **Consent proof / receipt decision gate** — the production consent-proof model and
   consent-receipt shape / private-audit binding, decided on top of the auth and
   storage decisions.
5. **Final route-contract pre-freeze gate** — the route-owned questions (idempotency
   keying, dotted `admission.*` taxonomy + HTTP mapping, identity binding, atomicity /
   rollback) resolved into a pre-freeze contract, *after* the storage / auth / consent
   semantics they depend on are decided.
6. **Implementation-spike readiness checklist** — the exact evidence required before
   extending past the Phase 33N dev/operator-only spike, referencing the now-concrete
   sub-gates.
7. **Bounded default-off implementation spike** — only if the checklist is satisfied;
   disabled-by-default, fail-closed, separately authorized.
8. **Smoke / acceptance gate** — validates the bounded spike against the vectors /
   acceptance criteria.
9. **Freeside Characters client-contract handoff** — only after Dixie route
   ownership, the auth / storage boundary, and the contract shape settle.

> **Implementation remains downstream, and Phase 46D does not claim the prior gates
> are satisfied — they are not.** Steps 2–9 are each held: the durable storage model
> (2) is undecided and ADR-022E gate #8 is held; the auth / consent gates (3–4) are
> held; the route-contract pre-freeze (5) depends on (2–4); the spike checklist (6)
> depends on (5); the bounded spike (7) depends on (6); the acceptance gate (8)
> depends on (7); and the Freeside handoff (9) depends on (5). The only step Phase
> 46D advances is **step 1** — accepting the decomposition and selecting Phase 46E —
> which is itself docs/decision-only. **Runtime implementation is not the next step.**

---

## 9. Blocked lanes

Phase 46D is a bounded, docs/decision-only acceptance gate. It authorizes **none** of
the following; each remains **blocked** and is **not** unblocked by accepting the
Phase 46C decomposition or selecting Phase 46E:

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

> **Acceptance does not authorize runtime implementation.** Accepting the Phase 46C
> decomposition and selecting Phase 46E makes the next decision legible; it does
> **not** decide a durable store, **not** clear any production gate, **not** freeze
> the route contract, **not** freeze the schema, and **not** authorize any route /
> storage / auth / consent / Freeside / package-export work. The Phase 33N
> dev/operator-only, disabled-by-default spike remains the only authorized route
> surface.

Phase 46D also does **not**: mutate any route-vector JSON, the route-vector
validator, the route-vector README, the Phase 33E fixtures, or the Phase 33E fixture
validator; mutate any runtime source; change any config, env, package, lockfile, CI,
or generated file; flip any draft marker (`route_contract_final`, `idempotency_final`,
`identity_binding_final`, `authority_binding_final`, `schema_final`,
`straylight_primitive_review_complete`, etc. stay `false`); or edit the adjacent
`loa-straylight` / `freeside-characters` repositories.

If a later phase reaches for any of the above, it must re-open the Phase 33K
precondition design, the Phase 33U / 33V / 33W / 33X chain, the Phase 33Y / 33Z
gates, the Phase 46A / 46B / 46C / 46D gates, and the relevant ADRs (ADR-022E
durable-store gate #8 and related gates #10 / #12 / #20; ADR-022D receipt/audit-chain
invariants; ADR-026C / ADR-026D route guardrails) first; it must not silently expand
scope.

---

## 10. Corruption / duplicate guard

Because the Phase 46C Claude terminal output exhibited duplicated / corrupted
fragments (while the committed Phase 46C document itself passed integrity — §4 item
7), Phase 46D applies an explicit corruption / duplicate guard to **this** document:

- **No duplicated section headings.** Each numbered section heading (`## 1.` …
  `## 13.`) appears exactly once.
- **Numbered sections appear once each.** Sections 1–13 each appear exactly once; the
  guard counts `^## N\.` occurrences and asserts one per number.
- **No pasted Claude terminal-report fragments.** No "Claude said", "Patch Report",
  "RESULT:", trailing "Report" headings, prose-claim dumps, or pasted terminal
  transcript appears in the document body.
- **No malformed terminal table rows.** Every Markdown table row is a well-formed
  pipe-delimited row; no duplicated / truncated / wrapped table fragments appear.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single
  fenced block is the §11 validation command list.

The guard commands and their recorded results are in §11.

---

## 11. Validation

All commands were run from the repository root
(`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46D is docs/decision-only — it
adds only this document and mutates no vector, validator, or fixture — so the
validators are run only to confirm the unchanged artifacts remain green. The
fence-balance and negative-claim checks avoid embedding affirmative-claim substrings
in prose, so they cannot self-match.

```bash
git branch --show-current
git status --short --branch --untracked-files=all
git diff --name-status
git diff --stat
git diff --check
# Untracked new doc fence/whitespace sanity:
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md || test "$?" = "1"
# Nothing-staged check (this lane stages nothing):
git diff --cached --name-status
# Unchanged-artifact green-check (no mutation here):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# Self-reference / next-lane label check (grep -E so `|` is real alternation):
grep -E "Phase 46D|Phase 46E" docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md || true
# Advisory affirmative-claim grep (|| true — matches command text in this block and
# negated-prose substrings such as "production ready" inside "production readiness";
# the enforcing scan below excludes fenced lines and is the authoritative check):
grep -E "runtime implementation is selected|implementation is authorized|route contract is frozen|schema is frozen|production ready|storage is implemented|auth is implemented|consent is implemented|DB writes are authorized|migration is authorized" docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md || true
# Duplicate/corruption grep (advisory):
grep -nE "Claude said|Patch Report|terminal report|RESULT:|Report$" docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md
# Enforcing negative check — fail if any affirmative readiness / freeze /
# implementation / authorization claim appears in PROSE. The patterns are
# affirmative-only and word-boundaried, so the document's negated prose ("does not
# freeze …", "not production-ready", "no … work is authorized") and the fenced
# validation commands below are deliberately NOT matched. This scan now covers the
# same readiness/write/migration-authorization surface as the advisory grep above,
# and is NOT masked with `|| true`:
python3 - <<'PY'
import re
from pathlib import Path
p = Path("docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md")
patterns = [
    r"\bruntime implementation is selected\b",
    r"\bimplementation is authorized\b",
    r"\broute contract is frozen\b",
    r"\bschema is frozen\b",
    r"\bstorage is implemented\b",
    r"\bauth is implemented\b",
    r"\bconsent is implemented\b",
    r"\bis production[- ]ready\b",
    r"\bdeclares production[- ]readiness\b",
    r"\bproduction[- ]readiness is (?:declared|achieved|confirmed|established|met)\b",
    r"\bdb writes? (?:is|are) authorized\b",
    r"\bmigrations? (?:is|are) authorized\b",
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
print("The enforcing scan found no affirmative readiness/freeze/write/migration authorization claims outside fenced validation commands.")
PY
# Fence-balance check (dependency-free; even count = balanced; char-code form avoids
# embedding a literal triple-backtick that would unbalance this doc):
node -e 'const fs=require("fs"); const p="docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md"; const s=fs.readFileSync(p,"utf8"); const fence=String.fromCharCode(96).repeat(3); const n=s.split(fence).length-1; if(n%2!==0){console.error("unbalanced fences: "+n); process.exit(1)} console.log("balanced fences: "+n);'
```

Recorded results for this lane:

- **docs-only scope check** — only the single new file
  `docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-ACCEPTANCE-GATE.md` is added; no
  route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture,
  fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI,
  migration, runtime, or generated file is touched;
- **nothing-staged check** — `git diff --cached --name-status` is empty (no
  `git add` / commit / push);
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator
  reports **5/5 probes valid, 0 failures**; the route-contract test-vector validator
  reports **5/5 vectors valid, 0 failures, no sixth vector**; the `--self-check`
  negative-mutation harness reports **5/5 mutations fail closed**;
- **self-reference label check** — `grep -E "Phase 46D|Phase 46E"` confirms both the
  `Phase 46D` (self) and `Phase 46E` (next-lane) labels are present;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the
  thirteen headings 1–13 exactly once each;
- **negative readiness-claim check (enforcing)** — the `python3` scan excludes fenced
  lines and reports **"The enforcing scan found no affirmative readiness/freeze/write/
  migration authorization claims outside fenced validation commands."** Its patterns
  are affirmative-only and word-boundaried and now cover readiness, DB-write
  authorization, and migration authorization as well as the freeze / implementation
  claims, so the document's **negated** prose (the clauses stating the gate does
  **not** freeze the contract, does **not** implement storage, and authorizes **no**
  write / migration work) is correctly not matched. The scan is not masked with
  `|| true`;
- **advisory affirmative-claim grep** — the `grep -E … || true` is advisory; any hits
  are (a) the needle / command text inside this fenced validation block and (b) the
  affirmative-readiness substring that also occurs inside the document's negated
  readiness prose — neither is an affirmative readiness claim; the enforcing python
  scan above is authoritative;
- **duplicate/corruption grep** — the `grep -nE "Claude said|Patch Report|…"`
  advisory check finds no pasted terminal-report fragment in the document body;
- **fence-balance check** — the dependency-free `node -e` counter reports an **even
  (balanced)** triple-backtick count; the single fenced block is the validation
  command list above, with no unterminated code fence.

---

## 12. Success criteria for Phase 46D

Phase 46D succeeds if and only if:

1. **Docs / decision-only** — it creates only this Phase 46D document; it changes
   **no** route-vector JSON, route-vector validator, route-vector README, Phase 33E
   fixture, fixture validator, runtime source, test, route, store, migration, auth,
   consent, config, env, package, lockfile, CI, or generated file, and edits **no**
   adjacent repository.
2. **Source chain recorded** — the Straylight PR #65 → 33U → 33V → 33W → 33X → 33Y →
   33Z → label-fix #145 → 46A → 46B → 46C → 46D chain, plus the ADR-022E held gates
   and the residual-legacy-marker status, is summarized (§2).
3. **Phase 46C acceptance assessment recorded** — Phase 46C is accepted as a valid
   blocker decomposition (not implementation readiness, not a contract / schema
   freeze, not production readiness, not per-area implementation readiness), with the
   storage / auth / consent / public-private decompositions explicitly accepted and
   no row treated as closed implementation readiness (§3).
4. **Phase 46C patch resolution recorded** — the Codex patch resolution (spike
   existence / default-off; no production route; `dev_signature` dev-only with no
   production authority; `StorageAdapter.audit_events` → `appendAuditEvent` /
   `listAuditEvents` / `getAuditTail`; the narrowed persistence blocker; the passed
   file-corruption audit) is recorded (§4).
5. **Acceptance decision made** — accept Phase 46C as the decomposition baseline, do
   not split it retroactively, do not authorize implementation, do not jump to a
   route-contract freeze (§5).
6. **Options analyzed and ranked** — the eight candidate next lanes (A–H) are
   analyzed for what each proves / does not prove, whether it is the immediate next
   step, and its disposition, and ranked **A ≻ B ≈ C ≻ D ≻ E ≻ F ≻ G ≻ H** (§6), with
   runtime implementation excluded.
7. **Next lane selected** — Phase 46E (Admission Wedge durable storage model decision
   gate, docs/decision-only) is selected with reasoning and scope, the documented
   alternative (Options B / C) recorded, and runtime implementation explicitly not
   selected (§7).
8. **Dependency ordering updated** — the post-46D ordering (46D → 46E storage → auth →
   consent → route-contract pre-freeze → spike checklist → bounded spike → smoke →
   Freeside handoff) is recorded, with implementation explicitly downstream (§8).
9. **Blocked lanes preserved** — no production / durable / public / Freeside /
   package / schema-freeze / auth / consent / route-contract-freeze / runtime lane is
   authorized (§9).
10. **Corruption / duplicate guard applied** — the document passes the §10 guard (no
    duplicated headings, sections 1–13 once each, no pasted terminal fragments, no
    malformed table rows, balanced fences) with results recorded in §11.
11. **No freeze, no production-readiness claim** — Phase 46D freezes neither the route
    contract nor the schema, and declares no production readiness (§1, §9).

---

## 13. Cross-references

- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-BLOCKER-DECOMPOSITION-GATE.md)
  — Phase 46C decomposition gate (PR #148); its §4 storage / auth / consent /
  public-private decomposition, §5 dependency ordering, §6 / §7 lane selection (which
  named this Phase 46D acceptance gate), and the Codex patch resolution recorded in
  §4 here.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-IMPLEMENTATION-READINESS-DECOMPOSITION-GATE.md)
  — Phase 46B decomposition gate (PR #147); its §4 readiness decomposition judged the
  storage/auth/consent cluster the upstream dependency and selected Phase 46C.
- [`docs/ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-VECTOR-ALIGNMENT-ACCEPTANCE-GATE.md)
  — Phase 46A acceptance gate (PR #146); the bounded non-runtime readiness, the
  residual-legacy-marker status, and the fixture spelling-debt status.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-PRECONDITION-DESIGN-GATE.md)
  — Phase 33K precondition design; its record categories, auth options (A/B/C/D),
  consent options (A/B/C/D), idempotency precondition, no-leak preconditions, threat
  model, and exit criteria seed the 46C decomposition this gate accepts. (It also
  carries the pre-correction `StorageAdapter.audit_events` wording that §4 narrows to
  `appendAuditEvent` / `listAuditEvents` / `getAuditTail`.)
- [`docs/ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md`](ADMISSION-WEDGE-STRAYLIGHT-RESPONSE-INTAKE-GATE.md)
  — Phase 33U Straylight-response intake (PR #139); the A–O reconciliation (rows F /
  G / J / O still held; ADR-022E gates #8 / #10 / #12 / #20 held) grounding §2 and the
  held-blocker references in §3 / §4.
- [`docs/ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md`](ADMISSION-WEDGE-STORAGE-AUTH-CONSENT-DESIGN-FINALIZATION-GATE.md)
  — Phase 33V design finalization (PR #140); the `public_receipt_ref` adoption, the
  `receipt_public_ref` retirement, the `privacy_scope` + frame-disposition projection
  boundary, the never-public categories, and the held production blockers.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-UPDATE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-READINESS-UPDATE-GATE.md)
  and [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-DRAFT.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-DRAFT.md)
  — Phase 33W (PR #141) and Phase 33X (PR #142); the route-owned questions
  (idempotency keying, two-part taxonomy, identity binding, atomicity/rollback), the
  dotted `admission.*` draft codes, and the spike auth-layering correction referenced
  in §6 / §8.
- [`docs/ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-CONTRACT-REVISION-ACCEPTANCE-GATE.md)
  — Phase 33Y revision acceptance (PR #143); accepted 33X as a draft baseline and
  selected 33Z.
- [`docs/admission-wedge/route-contract-test-vectors/README.md`](admission-wedge/route-contract-test-vectors/README.md)
  and `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`
  with the five vector JSONs — inspected **read-only** to ground §2 / §3 (the aligned
  `public_receipt_ref`, the retired-key lock, the exact `safe_reason_code` rule, the
  `FORBIDDEN_PUBLIC_KEYS` no-leak set, the `--self-check` harness, and the README
  current-state correction). None is modified.
- `docs/admission-wedge/PHASE-33N-DEV-SPIKE-RUNBOOK.md`,
  `docs/admission-wedge/PHASE-33Q-DEV-STORE-RUNBOOK.md`,
  `app/src/server.ts`, `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/{auth-gate,public-response,no-leak,classifier,admitted-assertion-ledger,index}.ts`,
  and `app/src/services/straylight-recall-intake/bounded-estate-store.ts`
  — inspected **read-only** to ground the §4 patch resolution (the disabled-by-default
  `/api/admission/intake` mount, the dedicated `x-admission-service-token` header, and
  the dev-only `dev_signature`). The `bounded-estate-store.ts` file is read only as
  Dixie **mirror / parity** evidence for the audit-adapter method names — it
  re-declares `appendAuditEvent` / `listAuditEvents` / `getAuditTail` on a minimal
  surface and manipulates local in-memory state directly. None is modified.
- `loa-straylight/src/straylight/storage/types.ts` and
  `loa-straylight/src/straylight/audit.ts` — inspected **read-only** as the
  **canonical** Straylight storage evidence cited in §4 item 5: `types.ts` declares
  `appendAuditEvent` / `listAuditEvents` / `getAuditTail` on the `StorageAdapter`
  interface, and `audit.ts` shows `AuditLog` delegating through that storage-adapter
  path. Neither adjacent-repo file is modified by this phase.
- `@loa/straylight` — canonical primitive / substrate owner; PR #65 (merged) answered
  the A–O primitive review. ADR-022E (durable-store gate #8 + related gates #10 / #12 /
  #20, **held**), ADR-022D (receipt/audit-chain invariants), ADR-026C, ADR-026D are
  Straylight-repo decision records cited as guardrails. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — the cross-repo
  acceptance whose mirror/adapter is test-only, not exported, not runtime-wired, with
  no live Dixie call; the consent-boundary handoff stays deferred. **Not edited by
  this phase.**
