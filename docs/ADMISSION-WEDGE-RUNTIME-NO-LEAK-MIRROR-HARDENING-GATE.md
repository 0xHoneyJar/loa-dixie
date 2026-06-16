# Phase 46O — Admission Wedge Runtime `no-leak.ts` Exact-Key Mirror Hardening Gate

> **Phase**: 46O
> **Branch context**: `phase-46o-admission-runtime-no-leak-mirror-gate`
> **Related**: Phase 46N re-authored ADR-022E gate-#8 gate-clearing ADR + sibling handoff packet (PR #159,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md)
> §8 / §13, which **selected this runtime `no-leak.ts` exact-key mirror hardening gate as the next lane**);
> Phase 46M durable-store production-adapter placement + schema/migration decomposition (PR #158,
> [`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md));
> Phase 46L ADR-022E gate-#8 gate-clearing ADR (HELD) + blocker handoff packet (PR #157); Phase 46K
> durable-store implementation-readiness decomposition (PR #156,
> [`ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md));
> Phase 46J consent/storage vector & validator alignment (PR #155,
> [`ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md));
> Phase 46I durable-store design + ADR-022E gate #8 decision (PR #154); Phase 33Z route-vector alignment
> (PR #144) — which added the `TransitionReceipt` / `AuditEvent` / signer / metadata key-name block to the
> validator's `FORBIDDEN_PUBLIC_KEYS`; Phase 33N dev/operator-only route spike (PR #132,
> `app/src/services/admission-wedge-spike/no-leak.ts`) — which authored the runtime no-leak guard mirroring
> the **Phase 33L-original** denylist; Phase 33M dev/operator route-spike authorization gate (its §14, which
> *required* the runtime guard to inherit the Phase 33L validator denylist); Phase 33L route-contract
> test-vector fixture draft (PR #130). Canonical Straylight (`@loa/straylight`) PR #65 (A–O primitive-review
> verdicts, **merged**); Straylight-repo ADR-022E durable-store gate #8 (+ related gates
> #9 / #10 / #11 / #12 / #15 / #20, **held**); ADR-022D MVP-persistence / audit-owner invariants.
> **Status**: **docs / decision-only.** This gate adds **only this document**. It modifies **no** runtime
> source — and specifically does **not** modify `app/src/services/admission-wedge-spike/no-leak.ts` — and
> changes **no** route handler, storage / store code, DB write, migration, auth, consent, route-vector JSON,
> route-vector validator, route-vector README, Phase 33E fixture, fixture validator, test, package export,
> config, env, package, lockfile, CI, generated file, or binary. No adjacent repository (`loa-straylight`,
> `freeside-characters`) is touched.
> **This is the runtime `no-leak.ts` exact-key mirror hardening *decision gate*.** It inspects the actual
> runtime no-leak code and the Phase 33Z + 46J validator hardening, defines the exact safe mirror boundary,
> and decides whether the *next* lane may be a bounded runtime hardening implementation slice. **It does not
> perform the runtime hardening itself, and it does not modify `no-leak.ts`.**

Every assessment below is grounded read-only against the actual Dixie repo: the runtime guard
`app/src/services/admission-wedge-spike/no-leak.ts`, its consumers
(`app/src/services/admission-wedge-spike/index.ts`, the route handler
`app/src/routes/admission-intake.ts`, the public-response builder
`app/src/services/admission-wedge-spike/public-response.ts`), the runtime test
`app/tests/unit/admission-wedge-spike/no-leak.test.ts`, the route-contract test-vector validator
`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`, the five
route-vector JSONs, and the predecessor gate documents (46I / 46J / 46K / 46L / 46M / 46N). The
runtime↔validator key-set comparison in §3 is a mechanically extracted, deterministic diff of the two
`FORBIDDEN_PUBLIC_KEYS` sets (the method is recorded in §13). Where a claim could not be grounded in the
read material, it is marked as such. Phase 46O changes no technical artifact; the validators are run only
to confirm the unchanged artifacts remain green (§13).

---

## 1. Status and verdict

Phase 46O is the bounded, docs/decision-only **runtime `no-leak.ts` exact-key mirror hardening gate** that
Phase 46N
([`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md)
§13 step 11) named as the selected next lane after clearing ADR-022E gate #8 as a documentation /
architecture / handoff prerequisite. Its purpose is to decide *whether and how* a future bounded runtime
hardening slice may be authorized — not to perform it.

**What this phase is, stated narrowly and exactly.** Phase 46O:

- is **docs / decision-only**;
- is **not** the runtime hardening implementation;
- does **not** modify `app/src/services/admission-wedge-spike/no-leak.ts`, and modifies no runtime source;
- does **not** authorize durable-store implementation;
- does **not** authorize production admission;
- does **not** freeze the route contract or the final schema;
- determines whether a future bounded runtime no-leak mirror hardening slice is authorized, and — if so —
  defines its exact maximum scope.

> **Verdict: a future bounded runtime `no-leak.ts` exact-key mirror hardening slice IS AUTHORIZED as the
> next lane.** The runtime guard's `FORBIDDEN_PUBLIC_KEYS` set diverged from the route-vector validator's
> across two later hardening passes (Phase 33Z and Phase 46J) and now lacks **62** exact key names the
> validator forbids (§3). The runtime guard's own header states it *mirrors* the validator denylist
> (`no-leak.ts:9-11`), and Phase 33M §14 *required* it to inherit that denylist — so the divergence is a
> mirror-fidelity defect, not a design choice. The safe corrective is mechanical and additive: extend the
> runtime `FORBIDDEN_PUBLIC_KEYS` set to match the validator's, with matching fail-closed runtime tests,
> preserving every existing public/private behavior and the exact-key (no-overmatch) discipline (§4 / §6).
> The boundary is well-defined and low-blast-radius, so the next lane may be a **bounded runtime hardening
> implementation slice** scoped exactly per §12. (The two alternative verdicts were considered and
> rejected: "remains blocked pending more docs" is not supported — the boundary is fully defined here, no
> further analysis is owed; "not required" is not supported — the gap is real latent debt the runtime
> guard's own contract says it must not have, §3.5.)

**A correction to the inherited framing, surfaced honestly.** Phase 46N (§8) and the 46J/46K/46L charter
language describe the owed runtime work as mirroring the **37** Phase 46J canonical/consent key names. The
actual deterministic diff (§3) shows the runtime gap is **62** keys: the **37** Phase 46J names **plus a 25-
key Phase 33Z block** (`transition_receipt` / `audit_event` / signer / signature / policy-detail / metadata
/ retired-receipt key names + camelCase variants) that the runtime guard *also* never received. The runtime
froze at the Phase 33L-original 52-key baseline (Phase 33N, PR #132) and tracked **neither** subsequent
validator hardening pass. A faithful mirror therefore requires adding all 62 — not 37. This gate records
that wider scope so the future slice closes the whole gap rather than re-opening a 25-key residual. (See
§3.3 for the exact provenance split; §5 enumerates both families.)

---

## 2. Evidence intake

The decision chain is grounded in the following predecessor artifacts and source files. Each rung is cited
read-only; none is modified.

### 2.1 The decision chain

| Phase | PR | Artifact / contribution (relevant to the runtime-mirror determination) |
|-------|----|------|
| 33L | #130 | **Route-contract test-vector fixture draft.** Authored the five non-runtime vectors + validator with the **original** `FORBIDDEN_PUBLIC_KEYS` set (52 keys — the operational/private identifier + README §9 no-leak category families). |
| 33M | #131 | **Dev/operator route-spike authorization gate.** Authorized the Phase 33N spike and (§14) **required** the spike to inherit the Phase 33L validator denylist as its runtime no-leak baseline. |
| 33N | #132 | **Dev/operator-only route spike.** Authored `app/src/services/admission-wedge-spike/no-leak.ts`, MIRRORING the then-current (Phase 33L-original) 52-key denylist as a dependency-free runtime module; wired it as the route's last-line public-response guard. |
| 33Z | #144 | **Route-vector alignment.** Among other changes, added the **`TransitionReceipt` / `AuditEvent` / signer / signature / policy-detail / metadata / retired-receipt** key-name block (25 keys incl. camelCase) to the **validator's** `FORBIDDEN_PUBLIC_KEYS`. **The runtime mirror was not updated.** |
| 46I | #154 | **Durable-store design + gate #8 decision.** Carried the no-leak hardening debt; recorded that adding canonical key names *strengthens, never weakens* the no-leak boundary (its §9). |
| 46J | #155 | **Consent/storage vector & validator alignment.** Added the **37** canonical/consent exact-key names to the **validator's** `FORBIDDEN_PUBLIC_KEYS` (snake_case + camelCase); extended `--self-check` to **44/44** (42 fail-closed negative mutations + 2 exact-key no-overmatch guards); changed **no** vector JSON; **explicitly deferred the runtime `no-leak.ts` mirror** to "the future runtime durable-store lane" (its §6 / validator header `:56-58`). |
| 46K | #156 | **Implementation-readiness decomposition.** Decided the runtime no-leak mirror is an **implementation-authorization precondition**, not a gate-clearing precondition (its §7). |
| 46L | #157 | **Gate-clearing ADR (HELD).** Recorded the runtime mirror as the deferred implementation-authorization precondition (its §8). |
| 46M | #158 | **Production-adapter placement (Candidate D) + schema/migration decomposition.** Preserved and sequenced the runtime-mirror decision (its §9); modified no runtime code. |
| 46N | #159 | **Re-authored gate-clearing ADR (CLEARED, paper-level only).** §8 stated the Phase 46J validator-only distinction and verified read-only that `no-leak.ts` lists the Phase 33L families but **not** the 37 Phase 46J names, and that the gap is latent (the fixed builder emits none of them); §13 **selected this runtime `no-leak.ts` exact-key mirror hardening gate as the next lane** and named its scope question (docs-only vs bounded runtime hardening) as *this* gate's to decide. |
| **46O** | *(this doc)* | **Runtime `no-leak.ts` exact-key mirror hardening gate.** Inspects the runtime guard + validator (§2 / §3), measures the exact 62-key gap (§3), defines the mirror boundary (§4), enumerates the keys (§5), states the no-overmatch requirement (§6) and test requirements (§7), relates the work to durable-store readiness (§8) and gate #8 / Candidate D (§9), preserves the blocked lanes (§10) and invariants (§11), and **selects the bounded runtime hardening implementation slice as the next lane (§12)**. Modifies **no** runtime / validator / vector / fixture / source. |

### 2.2 Source files inspected (read-only)

- **`app/src/services/admission-wedge-spike/no-leak.ts`** (Phase 33N, PR #132; 188 lines). The runtime
  guard. Header (`:1-17`) states it is "the RUNTIME no-leak baseline the Phase 33M gate (§14) requires the
  spike to inherit from the Phase 33L route-contract test-vector validator's denylist … The denylist is
  MIRRORED here as a small, dependency-free runtime module." Exports `findAdmissionPublicLeaks(surface)`
  (deep-walk → string[] of findings) and `isAdmissionPublicSafe(surface)` (boolean wrapper). Holds
  `FORBIDDEN_PUBLIC_KEYS` (`:22-76`, **52 keys**), `NEGATIVE_ASSERTION_KEYS` (`:79`), `FORBIDDEN_SUBSTRINGS`
  (`:82-96`), `FORBIDDEN_PATTERNS` (`:99-110`), `UUID_RE` (`:113-114`), and `MAX_OPAQUE_RUN = 24`
  (`:118-119`).
- **`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`** (Phase
  33L, hardened through 33Z / 46J; 1337 lines). The non-runtime validator. Its `FORBIDDEN_PUBLIC_KEYS`
  (`:272-420`) holds **114 keys**: the 52-key 33L-original baseline + the 25-key 33Z block (`:294-330`) +
  the 37-key 46J block (`:364-419`). The 46J header (`:36-69`) and self-check (`:873-1254`, 44/44) are the
  validator-side evidence this gate measures the runtime against.
- **`app/src/routes/admission-intake.ts`** (the route handler). At `:231` the runtime no-leak guard is the
  default `noLeakGuard` (DI seam, defaulting to `findAdmissionPublicLeaks`); `sendPublicResponse`
  (`:247-270`) deep-walks **every** public body through the guard before serialization and collapses to a
  hardcoded fail-closed HTTP-500 fallback (carrying none of the guard findings) on any finding or throw.
- **`app/src/services/admission-wedge-spike/public-response.ts`** (the builder). `buildAdmissionSpikePublicResponse`
  (`:96-115`) emits a **fixed allowlist** of fields — `spike`, `outcome_class`, `scenario_id`,
  `recall_eligible`, `recall_projection`, `public_receipt_ref`, `safe_reason_code`, `draft_markers` — and
  **none** of the 62 gap keys.
- **`app/tests/unit/admission-wedge-spike/no-leak.test.ts`** (Phase 33N, PR #132; the only test currently
  covering runtime no-leak behavior). Asserts a clean public-safe body passes; spot-checks ~16 forbidden
  keys (a representative subset of the 52, **not** an exhaustive sweep, and **none** of the 62 gap keys);
  asserts the `rendered_candidate_payload`-only-as-`false` rule; spot-checks UUID / opaque-run / 0x-hex /
  url / JWT / bearer / stack-frame / substring value shapes; asserts deep array/object walking.

---

## 3. Runtime / validator gap

This section is the load-bearing comparison. It is a deterministic, mechanically extracted diff of the two
`FORBIDDEN_PUBLIC_KEYS` sets (extraction method recorded in §13), not an eyeballed estimate.

### 3.1 Which Phase 33Z + 46J additions exist in the validator

The validator's `FORBIDDEN_PUBLIC_KEYS` set contains **114** keys: the **52** Phase 33L-original keys, the
**25** Phase 33Z `TransitionReceipt` / `AuditEvent` / signer / metadata / retired-receipt keys
(validator `:294-330`), and the **37** Phase 46J canonical-ref / consent keys (validator `:364-419`). All
62 of the later-pass additions are present in the validator and proven fail-closed by the `--self-check`
harness (44/44; the 33Z block via the `transition_receipt` / `audit_event_class` / `receipt_ref` cases and
the 46J block via the 37 per-key cases + 2 no-overmatch guards).

### 3.2 Which are missing from runtime `no-leak.ts`

The runtime guard's `FORBIDDEN_PUBLIC_KEYS` set contains **52** keys — **exactly** the Phase 33L-original
baseline (verified: the runtime 52-key set and the 33L-original validator 52-key set are byte-for-byte the
same membership, and there are **zero** keys present in runtime but absent from the validator). **All 62 of
the later additions are absent from runtime:**

- **25 Phase 33Z keys missing** (the `TransitionReceipt` / `AuditEvent` / signer / signature / policy-detail
  / metadata / retired-receipt block): `receiptId`, `transition_receipt`, `transitionReceipt`,
  `transition_receipt_ref`, `transitionReceiptRef`, `transition_id`, `transitionId`, `audit_event`,
  `auditEvent`, `audit_event_class`, `auditEventClass`, `audit_ref`, `auditRef`, `audit_id`, `auditId`,
  `receipt_ref`, `receiptRef`, `private_receipt_ref`, `privateReceiptRef`, `signer`, `signature`,
  `policy_details`, `policyDetails`, `metadata`, `receipt_public_ref`.
- **37 Phase 46J keys missing** (the canonical-ref-array / signer-receipt-audit / subject-mapping /
  consent-auth family, snake_case + camelCase): `supersedes_refs`, `supersedesRefs`,
  `linked_assertion_refs`, `linkedAssertionRefs`, `signer_refs`, `signerRefs`, `audit_event_ref`,
  `auditEventRef`, `receipt_hash`, `receiptHash`, `audit_hash`, `auditHash`, `previous_audit_hash`,
  `previousAuditHash`, `policy_decision_ref`, `policyDecisionRef`, `assertion_refs`, `assertionRefs`,
  `target_refs`, `targetRefs`, `subject_refs`, `subjectRefs`, `consent`, `consent_ref`, `consentRef`,
  `consent_proof`, `consentProof`, `consent_receipt`, `consentReceipt`, `consent_subject`, `consentSubject`,
  `consent_grantor`, `consentGrantor`, `consent_scope`, `consentScope`, `auth_decision`, `authDecision`.

> **The gap is 62 keys, not 37.** The charter and Phase 46N §8 describe the owed work as mirroring the 37
> Phase 46J keys. The honest, file-grounded count is 62: the runtime guard also never received the 25-key
> Phase 33Z block. Mirroring only the 37 would leave the 25-key 33Z block as residual unmirrored debt and
> defeat the runtime guard's own "mirrors the validator denylist" contract. §5 enumerates both families; §12
> scopes the slice to close all 62.

### 3.3 Provenance — why the runtime diverged

The runtime guard was authored in Phase 33N (PR #132) and *correctly* mirrored the validator's
`FORBIDDEN_PUBLIC_KEYS` **as it stood at Phase 33L-original** (52 keys; verified identical membership). The
validator was subsequently hardened twice — at Phase 33Z (PR #144, the 25-key `TransitionReceipt` /
`AuditEvent` / signer / metadata block) and at Phase 46J (PR #155, the 37-key canonical/consent block) —
and **neither pass updated the runtime mirror** (33Z did not touch runtime source at all; 46J explicitly
deferred the runtime mirror, validator header `:56-58`). The divergence is therefore an accumulated
mirror-fidelity drift across two non-runtime hardening lanes, not a deliberate runtime design difference.

### 3.4 The runtime matching mechanism

The runtime guard uses **exact-key matching** for the forbidden-key check — identical in mechanism to the
validator. `findAdmissionPublicLeaks` deep-walks the surface (`walk`, `no-leak.ts:128-143`) yielding a
`{kind: 'key'|'value', path, value}` node per object key and per string value at any depth (recursing
through arrays and nested objects), and flags a key iff `FORBIDDEN_PUBLIC_KEYS.has(node.value)` is true
(`:155-157`) — a `Set.has` exact-string test on the **key name**, not a substring or prefix test. It is
**not** category matching and **not** object-key *substring* scanning. Alongside the exact-key check the
guard also runs (at parity with the validator, verified): `FORBIDDEN_SUBSTRINGS` (`String.includes`),
`FORBIDDEN_PATTERNS` (10 regexes: url / ws-url / jwt / openai-style-key / bearer-token / 0x-hex / long-hex /
long-opaque / stack-frame / error-prefix), `UUID_RE`, the `OPAQUE_RUN_RE` (≥24 unbroken alphanumerics, on
**values** only), and the `NEGATIVE_ASSERTION_KEYS` rule (`rendered_candidate_payload` legitimate only as
boolean `false`). **The substring set, the pattern-name set, the negative-assertion set, `UUID_RE`, and
`MAX_OPAQUE_RUN` are all at byte/structure parity between runtime and validator** — the *only* divergence is
the `FORBIDDEN_PUBLIC_KEYS` membership (the 62 keys above).

### 3.5 Is there any current runtime public leak? — No; latent debt, not a present exploit

There is **no current runtime public leak**, and the gap is **latent debt, not a present exploit**:

- The fixed public-response builder `buildAdmissionSpikePublicResponse` (`public-response.ts:96-115`) emits
  a closed allowlist of 8 fields (§2.2) and **none** of the 62 gap keys — verified by direct inspection (a
  grep of the builder for any of the 62 names returns nothing).
- The route's single send path `sendPublicResponse` (`admission-intake.ts:247-270`) deep-walks **every**
  public body through the guard and **fail-closes** to a hardcoded HTTP-500 fallback on any finding or
  guard throw, so even a hypothetical leak-shaped value is intercepted by the value-pattern walls (UUID /
  hex / opaque-run / substring), which **are** at parity.
- Therefore the 62-key gap is exploitable **only** by a *future* serializer that begins emitting one of the
  canonical / consent / receipt / audit key names under a **short, safe-looking value** (one that evades the
  value-pattern walls — e.g. `consent: "granted_draft"` or `receipt_hash: "short_hash_draft"`). No such
  serializer exists today; the spike emits a fixed allowlist. The gap is a defense-in-depth weakness that
  matures into a live risk the moment durable-store runtime code starts producing these fields internally —
  which is exactly why the mirror is owed *before* that code is authorized (§8).

> **Precise, no overclaim.** The runtime guard is presently leak-safe for the spike's fixed output. The
> 62-key divergence is real, accumulated, latent debt against the guard's own "mirror the validator"
> contract — not a present exploit. Both facts are true simultaneously, and the future slice closes the
> latent gap before it can become live.

---

## 4. Exact-key mirror boundary

This section defines what a future runtime hardening slice **may** do — its maximum allowed source change.
The slice is limited to mirroring the validator's public-forbidden key family into the runtime no-leak
protection; it changes nothing else.

A future bounded runtime hardening slice, **if authorized at its own gate**, may:

1. **Update the runtime no-leak denylist / forbidden-key set** — extend `no-leak.ts`'s
   `FORBIDDEN_PUBLIC_KEYS` to achieve **exact membership parity** with the validator's
   `FORBIDDEN_PUBLIC_KEYS`, i.e. add the 62 missing keys (the 25-key Phase 33Z block + the 37-key Phase 46J
   block, §5). The addition is **purely additive** — it forbids more on the public surface, never less.
2. **Preserve existing public/private behavior** — every body that passes today must still pass; every body
   that fails today must still fail; the public/private projection boundary, the `findAdmissionPublicLeaks`
   / `isAdmissionPublicSafe` signatures, the deep-walk semantics, and the route's fail-closed send path are
   unchanged.
3. **Preserve exact-key safety** — the added keys are matched by `Set.has` exact-string equality on the key
   name only (no substring / prefix / category matching), exactly as the existing keys are (§3.4 / §6).
4. **Add or update tests proving the new runtime no-leak keys fail closed** — per §7 (one fail-closed case
   per newly mirrored key, or a mechanically verified exhaustive sweep over the mirrored set; plus the
   no-overmatch and public-safe-preserved cases).
5. **Add no route behavior changes** except the stricter no-leak fail-closed projection/refusal that
   naturally results where one of the newly forbidden public keys appears — i.e. the route continues to
   fail-closed via the *existing* send path, now also when a body carries one of the newly mirrored keys.
   No new status codes, no new endpoints, no changed refusal taxonomy.

The slice may **not** touch: storage, DB, migration, auth, consent implementation, package files,
lockfiles, config / env, CI, generated files, the route contract, or the route-vector validator / vectors /
fixtures. Its blast radius is exactly two files: `no-leak.ts` and its test `no-leak.test.ts` (§12).

> **The mirror is a copy, not a redesign.** The validator's `FORBIDDEN_PUBLIC_KEYS` is the source of truth
> (the runtime header `:9-11` already says so, and Phase 33M §14 mandated it). The slice brings the runtime
> set back into parity with it. It introduces no new key the validator does not already forbid, and changes
> no matching mechanism.

---

## 5. Keys to consider

The authoritative source is the validator's `FORBIDDEN_PUBLIC_KEYS` set
(`validate-route-contract-test-vectors.mjs:272-420`), read this phase. A faithful mirror adds the **62**
keys below (the keys present in the validator and absent from runtime — §3.2). They divide into the two
later-pass families.

### 5.1 Phase 33Z block — `TransitionReceipt` / `AuditEvent` / signer / metadata / retired-receipt (25 keys)

> Validator `:294-330`. Private `TransitionReceipt` / `AuditEvent` / private-receipt shapes; the transition
> id; signer / signature material; opaque policy detail; a raw `metadata` bag; and the retired
> `receipt_public_ref` spelling. snake_case **and** camelCase, so a serializer rename cannot leak.

`receiptId`, `transition_receipt`, `transitionReceipt`, `transition_receipt_ref`, `transitionReceiptRef`,
`transition_id`, `transitionId`, `audit_event`, `auditEvent`, `audit_event_class`, `auditEventClass`,
`audit_ref`, `auditRef`, `audit_id`, `auditId`, `receipt_ref`, `receiptRef`, `private_receipt_ref`,
`privateReceiptRef`, `signer`, `signature`, `policy_details`, `policyDetails`, `metadata`,
`receipt_public_ref`.

### 5.2 Phase 46J block — canonical refs / hash-chain links / subject mapping / consent-auth family (37 keys)

> Validator `:364-419`. The exact canonical names a future durable store / serializer must never emit
> publicly. snake_case **and** camelCase.

- **(a) canonical Assertion ref arrays:** `supersedes_refs`, `supersedesRefs`, `linked_assertion_refs`,
  `linkedAssertionRefs`.
- **(b) canonical TransitionReceipt / AuditEvent refs + hash-chain links:** `signer_refs`, `signerRefs`,
  `audit_event_ref`, `auditEventRef`, `receipt_hash`, `receiptHash`, `audit_hash`, `auditHash`,
  `previous_audit_hash`, `previousAuditHash`, `policy_decision_ref`, `policyDecisionRef`, `assertion_refs`,
  `assertionRefs`, `target_refs`, `targetRefs`.
- **(c) canonical candidate-subject mapping:** `subject_refs`, `subjectRefs`.
- **(d) consent / auth-decision key-name family:** `consent`, `consent_ref`, `consentRef`, `consent_proof`,
  `consentProof`, `consent_receipt`, `consentReceipt`, `consent_subject`, `consentSubject`,
  `consent_grantor`, `consentGrantor`, `consent_scope`, `consentScope`, `auth_decision`, `authDecision`.

> **Do not rely on this list alone — the validator set is the source of truth.** This enumeration is the
> read-this-phase snapshot of the validator-minus-runtime difference. The future slice must re-derive the
> difference against the validator's `FORBIDDEN_PUBLIC_KEYS` at implementation time (a mechanical extraction,
> §13) and mirror **whatever** the validator then forbids, so a faithful parity check — not a hand-copied
> list — is what lands. The charter's representative key list (`supersedes_refs`, `linked_assertion_refs`,
> `signer_refs`, `audit_event_ref`, `receipt_hash`, `audit_hash`, `previous_audit_hash`,
> `policy_decision_ref`, `assertion_refs`, `target_refs`, `subject_refs`, `consent`, `consent_ref`,
> `consent_proof`, `consent_receipt`, `consent_subject`, `consent_grantor`, `consent_scope`,
> `auth_decision`) is a subset of family (a)–(d) above and is fully covered.

---

## 6. Exact-key / no-overmatch requirements

A future runtime hardening slice **must preserve no-overmatch behavior**. The added keys must be matched by
**exact-string equality only** (`Set.has` on the key name), never by prefix or substring. It must **not**
reject a legitimate longer / draft marker field merely because that field's name *contains* a forbidden key
name as a prefix or substring.

The current runtime guard already matches exactly (`FORBIDDEN_PUBLIC_KEYS.has(node.value)`, §3.4), so the
slice **preserves** this behavior rather than introducing it — but the requirement is stated so the slice
cannot regress it (e.g. by switching to a `some(k => key.includes(k))` test). The following legitimate
fields share a prefix with a forbidden key and **must stay allowed** (none is an exact member of the
forbidden set):

- `consent_assumption` — the existing `request_vector` public draft marker (shares the `consent` prefix; not
  the exact key `consent`);
- `consent_scope_assumption` — shares the `consent_scope` prefix; not the exact key `consent_scope`;
- `consent_note_draft` — shares the `consent` prefix; not an exact member;
- `auth_assumption` — the existing `request_vector` public draft marker (shares the `auth` prefix; not the
  exact key `auth_decision`).

This mirrors the validator's own discipline: the validator's `--self-check` includes **2 `mode:
'no-overmatch'` guards** (`:1234-1253`) proving the bare `consent` / `auth_decision` additions do not
over-match `consent_assumption` / `auth_assumption` / `consent_scope_assumption` / `consent_note_draft`. The
runtime slice must add the equivalent runtime assertions (§7) so the runtime guard is proven to share the
validator's exact-key, no-overmatch behavior.

> **The runtime guard's behavior here is already correct; the requirement is to keep it correct.** The slice
> adds keys to an exact-match set, which cannot by construction over-match — but the no-overmatch tests must
> be added so the property is *proven* at the runtime layer and protected against a future refactor.

---

## 7. Test requirements for future runtime hardening

The future runtime implementation slice must add or update the following tests (in
`app/tests/unit/admission-wedge-spike/no-leak.test.ts`, the existing runtime no-leak test). At minimum:

1. **One fail-closed runtime test per newly mirrored forbidden key — or a mechanically verified exhaustive
   sweep over the mirrored set.** Each of the 62 newly mirrored keys (and ideally the full mirrored set, so
   regressions in the 52 baseline keys are also caught) must be asserted to produce at least one leak
   finding when it appears as a public-surface key carrying a **short, safe-looking value** (so the failure
   is attributable to the *key-name* check, not the value-pattern walls). The cleanest form mirrors the
   validator's own approach: iterate the runtime `FORBIDDEN_PUBLIC_KEYS` set itself and assert each member
   fails closed — an exhaustive sweep that cannot silently miss a key.
2. **No-overmatch tests for exact-key, prefix-sharing legitimate fields.** Assert that `consent_assumption`,
   `consent_scope_assumption`, `consent_note_draft`, and `auth_assumption` (and any other legitimate
   prefix-sharing draft marker) produce **zero** findings (§6).
3. **Existing public-safe outputs remain allowed.** Assert the canonical clean public body — the actual
   `buildAdmissionSpikePublicResponse` shape (`spike` / `outcome_class` / `scenario_id` / `recall_eligible`
   / `recall_projection` / `public_receipt_ref` / `safe_reason_code` / `draft_markers`) — still produces
   zero findings after the additions, for every one of the five outcome classes.
4. **No raw / private / audit / debug / source / auth / signer / consent / storage material leaks.** Retain
   and (where useful) extend the existing value-shape assertions (UUID / opaque-run / 0x-hex / url / JWT /
   bearer / stack-frame / forbidden substrings) and the `rendered_candidate_payload`-only-as-`false` rule,
   so the additive key-name change is shown not to have weakened any existing value-pattern wall.
5. **Regression: the route-vector validators remain unchanged and still pass.** The slice changes no
   validator / vector / fixture; the existing `validate-route-contract-test-vectors.mjs` (5/5 + no-sixth)
   and its `--self-check` (44/44) and the fixtures validator (5/5) must still pass unchanged — confirming
   the runtime mirror was brought to the validator, not the reverse, and the validator is the unchanged
   source of truth. (Optional, recommended: a parity assertion that the runtime `FORBIDDEN_PUBLIC_KEYS`
   membership equals the validator's, so future drift in *either* direction fails a test.)
6. **No package / lock / config / CI / generated changes** unless separately justified and separately
   audited. The slice's footprint is `no-leak.ts` + `no-leak.test.ts` only.

---

## 8. Runtime no-leak relationship to durable-store work

The runtime mirror hardening is required **before implementation authorization / pre-implementation work**
for durable storage — but it is not itself any part of durable storage. Stated exactly:

- **Phase 46O does not authorize durable storage.** This gate is docs/decision-only; it authorizes a
  *future runtime no-leak slice*, nothing about storage.
- **The future runtime hardening slice, if authorized, still does not authorize durable storage.** It
  touches `no-leak.ts` + its test only (§4 / §12). It builds no store, writes no DB, adds no migration,
  implements no auth or consent, and changes no route contract.
- **Runtime mirror hardening is a prerequisite for later implementation-readiness, not implementation
  itself.** Phase 46K §7 established the runtime mirror as an *implementation-authorization precondition*
  (not a gate-clearing precondition). The reason is causal: the moment durable-store runtime code begins
  emitting canonical / consent / receipt / audit refs internally (assertion refs, hash-chain links, signer
  refs, consent proofs), the public-response serializer must already forbid those names on the public
  surface — otherwise a short, safe-looking value could slip the value-pattern walls (§3.5). So the runtime
  denylist must reach validator parity **before** any code that could produce those fields is authorized.
  Hardening the guard first makes the public-surface boundary fail-closed for the canonical/consent names in
  advance of any producer existing.

> The runtime mirror is the **lowest-blast-radius, longest-owed** of the named implementation prerequisites
> (46N §13). Discharging it first keeps the durable-store readiness chain disciplined: harden the runtime
> no-leak posture (the future slice this gate authorizes) → ratify implementation-readiness → design
> schema / migration → (only with the operative Straylight-side gate and sibling gates addressed) any build.

---

## 9. ADR-022E gate #8 / Candidate D relationship

This gate sits downstream of the Phase 46N paper-level gate-#8 clearing and upstream of any implementation
authorization. Stated exactly:

- **Phase 46N cleared ADR-022E gate #8 only as a bounded Dixie documentation / architecture / handoff
  prerequisite** (46N §1 / §9) — it proposed Candidate D as the production adapter, cited the re-authored
  sibling handoff packet, and preserved the ADR-022D invariants, at the paper level only. It did **not**
  discharge the Straylight-owned operative gate, authorize implementation, or build a store.
- **Candidate D remains the adapter *proposal* input** — split storage; a Dixie route-side durable adapter
  for the Admission Wedge route-owned records, shaped as a swap-in of the canonical Straylight
  `StorageAdapter` interface; Straylight canonical ownership / semantics / invariants preserved (46M §6;
  46N §7). It is a proposal, not a built or authorized adapter.
- **Runtime no-leak mirror hardening is downstream of the paper gate and upstream of implementation
  authorization.** Clearing gate #8 at the paper level (46N) is what unblocked *asking for* this
  runtime-mirror lane (46N §9.6); discharging the runtime mirror (the future slice) is one of the
  implementation-authorization preconditions that must land before any durable-store build (46N §11
  prerequisite 9).
- **Clearing gate #8 did not make the runtime no-leak guard complete.** Phase 46N §1 explicitly disclaimed
  this: "does **not** claim the runtime `no-leak.ts` exact-key mirror hardening is complete — it remains the
  deferred implementation-authorization precondition." This gate confirms that disclaimer with the measured
  62-key gap (§3) and authorizes the slice that closes it.

---

## 10. Non-authorizations and blockers

Phase 46O is a bounded, docs/decision-only gate. It authorizes **only** a future bounded runtime
`no-leak.ts` exact-key mirror hardening slice (scoped per §12), and authorizes **none** of the following;
each remains **blocked** and is **not** unblocked by this gate or by the slice it authorizes:

- **durable-store implementation** — no durable store, schema, table, or store code is created or
  authorized;
- **DB writes** — none permitted;
- **migrations** — none authored or applied;
- **route / API behavior changes** — beyond the future bounded no-leak fail-closed hardening (the route
  continues to fail-closed via the *existing* send path, now also when a body carries a newly mirrored
  forbidden key) **if separately authorized** at the slice's own gate; no new endpoints / statuses / refusal
  taxonomy;
- **auth / consent implementation** — auth is not implemented; consent is not implemented; Rows F / G held;
- **production admission** — remains blocked; the Phase 33N dev/operator-only, disabled-by-default spike
  remains the only authorized route surface;
- **public `remember-this`** — no public / unauthenticated remember-this surface is designed or authorized;
- **Discord / freeform history ingestion** — remains blocked;
- **user chat becoming memory merely because it was said** — consent is never inferred from chat text;
- **Freeside runtime / client integration** — Freeside stays a client / handoff surface, never a host;
- **package exports** — none;
- **LLM / voice / Finn runtime behavior wiring** — none;
- **MVP 3 forget / revoke / correction UI** — not designed or authorized;
- **route-contract freeze** — `route_contract_final` stays false; not frozen;
- **final schema freeze** — `schema_final` stays false; not frozen;
- **production readiness of any kind** — not claimed.

> Authorizing the runtime-mirror slice authorizes **no** storage / DB / migration / auth / consent /
> production / route-contract / schema / package / Freeside / LLM work. The slice's entire footprint is the
> runtime no-leak guard `no-leak.ts` and its test `no-leak.test.ts` (§12). Every lane above remains its own
> separately-authorized future gate.

---

## 11. Invariants

Phase 46O preserves **all** of the following; the future runtime-mirror slice must carry each forward
unchanged (it only **strengthens** invariant 8, never weakens it):

1. **A pending candidate is not recallable.** Only active, recall-eligible assertions enter the recall
   projection.
2. **A rejected candidate creates no admitted assertion.**
3. **An accepted candidate creates / references an admitted assertion.**
4. **A superseded assertion is excluded from ordinary recall** unless explicitly requested / marked.
5. **A malformed / unsafe payload fails closed.** The classifier accepts only the five forms and fails
   closed otherwise; the route's send path fails closed on any guard finding or throw.
6. **Missing / unauthorized auth fails closed.** Disabled → 404, unauthorized → 403, malformed → 400; one
   stable refusal that never reveals which gate failed.
7. **Missing / invalid consent fails closed in any future production admission model.** Service-token /
   operator auth is never treated as consent.
8. **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
   material.** Enforced at the runtime layer by the public-surface deep-walk + `FORBIDDEN_PUBLIC_KEYS` +
   substring / regex / UUID / opaque-run walls, and at the contract layer by the validator (hardened by 33Z
   + 46J). **The future slice strengthens this invariant by bringing the runtime denylist to validator
   parity (the 62 keys); it is currently upheld for the spike's fixed output and made fail-closed in advance
   for the canonical/consent names by the slice.**
9. **Private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private.**
   Forbidden on the public surface at any depth; lives on the private audit record / private primitives
   only.
10. **User chat does not become memory merely because it was said.** No Discord / freeform ingestion; no
    user-chat-as-memory path; consent never inferred from chat text.
11. **Public `remember-this` remains blocked.** No public / unauthenticated remember-this surface is
    designed or authorized.
12. **Discord / freeform history ingestion remains blocked.**
13. **Production admission / storage / auth / consent remain blocked.** `storage_writes_performed` /
    `auth_implemented` / `consent_implemented` / `production_admission` all false on every vector.
14. **Route-contract freeze and final schema freeze remain blocked unless separately authorized.**
    `route_contract_final` / `schema_final` false on every vector; Phase 46O freezes neither.
15. **`recall_eligible` remains derived / non-authoritative; never persisted as canonical authority.**
16. **The exact-key, no-overmatch discipline is preserved.** Forbidden keys are matched by exact-string
    equality only; legitimate prefix-sharing draft markers (`consent_assumption`, `auth_assumption`, …) stay
    allowed (§6).

---

## 12. Next lane

The charter asks Phase 46O to select a safe next lane. Because the runtime / validator gap is fully measured
(§3), the mirror boundary is fully defined (§4 / §5 / §6), and the test requirements are fully specified
(§7), no further docs-only decomposition is owed — the boundary is **not** still unclear. The verdict (§1)
authorizes the runtime hardening slice.

> **Selected next lane: a bounded runtime `no-leak.ts` exact-key mirror hardening implementation slice.** It
> brings the runtime `FORBIDDEN_PUBLIC_KEYS` set to exact parity with the validator's (adding the 62 missing
> keys — the 25-key Phase 33Z block + the 37-key Phase 46J block, §5), preserving all existing
> public/private behavior and the exact-key no-overmatch discipline, with matching fail-closed runtime tests
> (§7). It is **not** implementation of the durable store; it is **not** a build; it clears no further gate
> by being selected.

Because the selected next lane **touches runtime source**, it is a bounded runtime hardening slice, not a
docs-only lane. Its **maximum allowed scope** is, exactly:

- **runtime no-leak source and tests only** — `app/src/services/admission-wedge-spike/no-leak.ts` (extend
  `FORBIDDEN_PUBLIC_KEYS` to validator parity; purely additive) and
  `app/tests/unit/admission-wedge-spike/no-leak.test.ts` (add the §7 tests). No other source file is
  touched (`index.ts`, `public-response.ts`, `classifier.ts`, `auth-gate.ts`,
  `admitted-assertion-ledger.ts`, and the route handler `admission-intake.ts` are unchanged — the guard's
  signature and the route wiring are stable);
- **no storage**;
- **no DB**;
- **no migrations**;
- **no route contract changes** (and no route-vector JSON / validator / README / fixture changes — the
  validator stays the unchanged source of truth);
- **no auth / consent** implementation;
- **no production admission**;
- **no package / config / CI / generated changes** unless explicitly justified and **separately audited**.

Because that slice touches runtime source under the existing dev/operator-only, disabled-by-default Phase
33N spike, it should run through the normal implement → review → audit cycle (and, if the implementing lane
judges it warranted, re-affirm the Phase 33M-style dev/operator-only authorization posture for the spike) —
it does **not** re-open production admission, and it adds no capability beyond a stricter fail-closed
no-leak boundary.

**Why not the alternatives** (the other lanes the charter lists):

- **Another docs-only runtime no-leak decomposition gate** — *not selected; the boundary is not unclear.*
  §3–§7 fully specify the gap, the keys, the matching mechanism, the no-overmatch requirement, and the
  tests. A further docs-only gate would be make-work that delays a fully-specified, low-risk slice.
- **A schema / migration design gate** — *downstream, not next.* It produces the final data model / schema /
  migration plan (46M §7 / §8), each canonical-store migration being "a separate ADR + sibling-repo PR under
  teammate review" (ADR-022D §7); it follows the runtime-mirror + readiness-acceptance steps.
- **A durable-store implementation-readiness acceptance gate** — *the right eventual step, but not first.*
  Its checklist criterion for the runtime no-leak stance (46N §11 prerequisite 9; 46K §9) is unsatisfied
  until the runtime mirror lands, so the runtime slice sequences ahead of it.
- **Direct durable-store implementation** — *explicitly not a candidate.* No artifact authorizes it; the
  implementation-authorization prerequisites are unsatisfied (46N §11), the operative Straylight-side gate
  #8 is not discharged, and sibling gates #9 / #10 / #12 / #20 are held.

---

## 13. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46O is
docs/decision-only — it adds only this document and mutates no runtime source, validator, vector, or fixture
— so the validators are run only to confirm the unchanged artifacts remain green, and the runtime↔validator
key diff is a read-only extraction over the two unchanged files.

```bash
git status --short --branch --untracked-files=all
git diff --name-status
git diff --stat
git diff --check
git diff --cached --name-status
git diff --cached --check
# Unchanged-artifact green-checks (no mutation here):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# New-untracked-doc whitespace check (no-index; `|| true` because a missing/clean file is fine):
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md || true
# Runtime↔validator key-set diff method (read-only; extracts both FORBIDDEN_PUBLIC_KEYS sets and diffs):
#   the validator set (114 keys) minus the runtime set (52 keys) = the 62 keys this gate enumerates in §5;
#   the runtime set minus the validator set = ∅ (no runtime-only key); the runtime 52-key set equals the
#   Phase 33L-original (PR #130, commit 06b91282) validator 52-key set by membership.
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md
```

**Recorded results for this lane:**

- **docs-only scope** — only the new file `docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md` is
  added; no runtime source (and specifically not `no-leak.ts`), no route handler, no route-vector JSON,
  validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env,
  CI, migration, or generated file is touched;
- **nothing staged / committed** — `git diff --cached --name-status` is empty; `git diff --check` and
  `git diff --cached --check` report no whitespace errors; the no-index whitespace check on the new doc
  reports no errors;
- **both validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes
  valid, 0 failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no
  sixth vector**; the `--self-check` harness reports **44/44** cases behaving as required (42 fail-closed
  negative mutations + 2 exact-key no-overmatch guards);
- **runtime↔validator key diff (read-only)** — validator `FORBIDDEN_PUBLIC_KEYS` = **114** keys; runtime
  `FORBIDDEN_PUBLIC_KEYS` = **52** keys; validator − runtime = **62** keys (25 Phase 33Z + 37 Phase 46J,
  §5); runtime − validator = **0**; the runtime 52-key set equals the Phase 33L-original validator 52-key
  set by membership. The substring / pattern-name / negative-assertion sets, `UUID_RE`, and `MAX_OPAQUE_RUN`
  are at parity between the two files (the only divergence is the forbidden-key membership);
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–15 exactly
  once each.

---

## 14. Corruption / duplicate guard

Phase 46O applies an explicit corruption / duplicate guard to **this** document (carried from the Phase
46I–46N precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 15.`) appears exactly
  once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is the §13
  validation command list.

---

## 15. Cross-references

- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md)
  — Phase 46N (PR #159); §8 stated the Phase 46J validator-only distinction and the runtime-mirror deferral,
  and §13 step 11 **selected this runtime `no-leak.ts` exact-key mirror hardening gate as the next lane**,
  naming its docs-vs-runtime scope question as this gate's to decide.
- [`docs/ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 46J (PR #155); added the 37 canonical/consent exact-key names to the **validator** and explicitly
  deferred the runtime `no-leak.ts` mirror (the deferred work this gate scopes).
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md)
  — Phase 46K (PR #156); §7 established the runtime mirror as an implementation-authorization precondition,
  not a gate-clearing precondition.
- [`docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md)
  — Phase 46M (PR #158); selected Candidate D and decomposed the schema / migration families; preserved the
  runtime-mirror sequencing (§9).
- `app/src/services/admission-wedge-spike/no-leak.ts` — the runtime guard (Phase 33N, PR #132); inspected
  **read-only** to ground the 52-key runtime set, the exact-key matching mechanism, and the parity of the
  substring / pattern / UUID / opaque-run walls. **Not modified by this phase.**
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/{index,public-response,classifier,auth-gate,admitted-assertion-ledger}.ts`
  — inspected **read-only** to ground the guard wiring (route send path at `:247-270`), the fixed
  public-response allowlist, and the "no current leak / latent debt" finding (§3.5). **None is modified.**
- `app/tests/unit/admission-wedge-spike/no-leak.test.ts` — the only current runtime no-leak test (Phase 33N,
  PR #132); inspected **read-only** to ground the §7 test-requirements gap (it spot-checks ~16 of the 52
  keys and none of the 62 gap keys). **Not modified by this phase.**
- `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs` and the five
  vector JSONs — inspected **read-only** as the unchanged source of truth for the 114-key validator
  `FORBIDDEN_PUBLIC_KEYS` set, the 33Z block (`:294-330`), the 46J block (`:364-419`), and the 44/44
  self-check (incl. the 2 no-overmatch guards). **None is modified.**
- `@loa/straylight` — canonical primitive / substrate owner; ADR-022E durable-store gate #8 (+ sibling gates
  #9 / #10 / #11 / #12 / #15 / #20, **held** operatively) and ADR-022D receipt / audit-chain invariants are
  the decision records cited as guardrails (§8 / §9). **Not edited by this phase.**
