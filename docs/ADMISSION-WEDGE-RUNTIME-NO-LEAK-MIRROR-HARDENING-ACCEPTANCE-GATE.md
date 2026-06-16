# Phase 46Q — Admission Wedge Runtime `no-leak.ts` Mirror Hardening Acceptance Gate

> **Phase**: 46Q
> **Branch context**: `phase-46q-admission-runtime-no-leak-acceptance`
> **Related**: Phase 46P (PR #161) **implemented** the bounded runtime `no-leak.ts` exact-key mirror
> hardening slice — the two-file slice this gate accepts; Phase 46O (PR #160,
> [`ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md))
> **authorized** that slice, measured the exact 62-key runtime/validator gap, and defined the slice's maximum
> scope (its §4 / §5 / §6 / §7 / §12); Phase 46N (PR #159,
> [`ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md))
> cleared ADR-022E gate #8 as a documentation / architecture / handoff prerequisite **only** and named the
> runtime mirror as the deferred implementation-authorization precondition; Phase 46M (PR #158,
> [`ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md))
> selected Candidate D as the production-adapter proposal input; Phase 46J (PR #155,
> [`ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md))
> added the 37 canonical/consent exact-key names to the **validator** and explicitly deferred the runtime
> mirror; Phase 33Z (PR #144) added the 25-key `TransitionReceipt` / `AuditEvent` / signer / metadata block to
> the **validator**; Phase 33N (PR #132) authored the runtime guard mirroring the **Phase 33L-original** 52-key
> denylist; Phase 33M (its §14) required the spike to inherit the Phase 33L validator denylist; Phase 33L
> (PR #130) authored the route-contract test-vector fixture + validator. Canonical Straylight
> (`@loa/straylight`) PR #65 (A–O primitive-review verdicts, **merged**); Straylight-repo ADR-022E durable-store
> gate #8 (+ sibling gates #9 / #10 / #11 / #12 / #15 / #20, **held** operatively); ADR-022D
> MVP-persistence / audit-owner invariants.
> **Status**: **docs / decision-only.** This gate adds **only this document**. It modifies **no** runtime
> source — and specifically does **not** modify `app/src/services/admission-wedge-spike/no-leak.ts` or
> `app/tests/unit/admission-wedge-spike/no-leak.test.ts` — and changes **no** route handler, storage / store
> code, DB write, migration, auth, consent, route-vector JSON, route-vector validator, route-vector README,
> Phase 33E fixture, fixture validator, other test, package export, config, env, package, lockfile, CI,
> generated file, or binary. No adjacent repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is the acceptance *decision gate* for the Phase 46P bounded runtime hardening slice.** It inspects the
> merged Phase 46P artifacts read-only, re-derives the runtime↔validator parity mechanically, re-runs the
> validators and the runtime tests to confirm green, and decides whether Phase 46P is accepted as the bounded
> runtime no-leak mirror hardening implementation. **It performs no further runtime hardening, authorizes no
> durable-store implementation, and freezes neither the route contract nor the schema.**

Every assessment below is grounded read-only against the actual Dixie repo at the time of writing: the merged
runtime guard `app/src/services/admission-wedge-spike/no-leak.ts`, its runtime test
`app/tests/unit/admission-wedge-spike/no-leak.test.ts`, its consumers
(`app/src/services/admission-wedge-spike/{index,public-response,classifier}.ts`, the route handler
`app/src/routes/admission-intake.ts`), the route-contract test-vector validator
`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`, the five
route-vector JSONs, and the predecessor gate documents (46J / 46M / 46N / 46O). The runtime↔validator key-set
comparison in §4 is a mechanically extracted, deterministic diff of the two `FORBIDDEN_PUBLIC_KEYS` sets (the
method is recorded in §13). Phase 46Q changes no technical artifact; the validators and runtime tests are run
only to confirm the already-merged artifacts are green (§13).

---

## 1. Status and verdict

Phase 46Q is the bounded, docs/decision-only **acceptance gate** for Phase 46P — the runtime `no-leak.ts`
exact-key mirror hardening slice that Phase 46O (PR #160) authorized and scoped, and that Phase 46P (PR #161)
implemented. Its purpose is to evaluate the merged Phase 46P work against the Phase 46O scope and accept or
hold it — not to perform, extend, or re-open any runtime work.

**What this phase is, stated narrowly and exactly.** Phase 46Q:

- is **docs / decision-only**;
- is an **acceptance gate for Phase 46P**;
- does **not** modify runtime code or tests — and specifically does not touch `no-leak.ts` or
  `no-leak.test.ts`;
- does **not** authorize durable-store implementation;
- does **not** authorize production admission;
- does **not** freeze the route contract or the final schema.

> **Verdict: Phase 46P is ACCEPTED as the bounded runtime `no-leak.ts` exact-key mirror hardening
> implementation.** The merged slice modified **exactly two files** — `no-leak.ts` and its test
> `no-leak.test.ts` — exactly the maximum footprint Phase 46O §12 allowed, and nothing else (§3). It brought
> the runtime `FORBIDDEN_PUBLIC_KEYS` set to **exact membership parity** with the route-contract validator's
> (both **114** keys; validator−runtime = **0**, runtime−validator = **0**, no duplicates), closing the
> Phase 46O 62-key gap (§4) by adding the 25-key Phase 33Z block + the 37-key Phase 46J block (§5). It
> preserved exact-key `Set.has` matching and added no substring / prefix / category matching (§6); the runtime
> test suite, the route-vector validators, the fixture validator, the self-check, the typecheck, and the
> touched-file lint all pass (§7 / §13). Codex accepted Phase 46P. The two alternative verdicts were considered
> and rejected: "held / needs patch" is unsupported — there is no scope overage, no parity defect, and no
> failing check; "not required" is unsupported — Phase 46O measured a real 62-key latent gap against the
> runtime guard's own "mirror the validator" contract, and Phase 46P closed exactly that gap.

**The acceptance is bounded — exactly what it covers, and exactly what it does not.** Accepting Phase 46P
accepts:

- **runtime forbidden-key parity only** — the runtime `FORBIDDEN_PUBLIC_KEYS` set now equals the validator's
  by membership (§4);
- **bounded fail-closed hardening only** — the additions are purely additive (the public surface now forbids
  *more* key names, never fewer) and exact-key (§5 / §6).

Accepting Phase 46P does **not** authorize, and is **not** to be read as authorizing: storage, DB writes,
migrations, route / API behavior changes beyond the already-merged no-leak fail-closed guard hardening,
auth / consent implementation, production admission, route-contract freeze, final schema freeze, or
durable-store implementation (§10).

---

## 2. Evidence intake

The decision is grounded in the following predecessor artifacts and source files. Each is cited read-only;
none is modified by this gate.

### 2.1 The decision chain

| Phase | PR | Artifact / contribution (relevant to the acceptance) |
|-------|----|------|
| 33L | #130 | **Route-contract test-vector fixture draft.** Authored the five non-runtime vectors + validator with the **original** `FORBIDDEN_PUBLIC_KEYS` set (52 keys). |
| 33N | #132 | **Dev/operator-only route spike.** Authored `app/src/services/admission-wedge-spike/no-leak.ts`, mirroring the then-current Phase 33L-original 52-key denylist as a dependency-free runtime module; wired it as the route's last-line public-response guard. |
| 33Z | #144 | **Route-vector alignment.** Added the 25-key `TransitionReceipt` / `AuditEvent` / signer / metadata / retired-receipt block to the **validator's** `FORBIDDEN_PUBLIC_KEYS`. The runtime mirror was not updated. |
| 46J | #155 | **Consent/storage vector & validator alignment.** Added the 37 canonical/consent exact-key names to the **validator's** `FORBIDDEN_PUBLIC_KEYS` (snake_case + camelCase); extended `--self-check` to 44/44; **explicitly deferred the runtime `no-leak.ts` mirror.** |
| 46M | #158 | **Production-adapter placement (Candidate D) + schema/migration decomposition.** Selected Candidate D as the adapter *proposal* input; preserved the runtime-mirror sequencing. |
| 46N | #159 | **Re-authored gate-clearing ADR (CLEARED, paper-level only).** Cleared ADR-022E gate #8 as a documentation / architecture / handoff prerequisite only; named the runtime mirror as the deferred implementation-authorization precondition. |
| 46O | #160 | **Runtime `no-leak.ts` exact-key mirror hardening gate.** Measured the exact **62-key** runtime/validator gap (validator 114 − runtime 52); defined the mirror boundary and the no-overmatch / test requirements; **authorized a bounded runtime hardening slice** scoped to exactly `no-leak.ts` + `no-leak.test.ts`. |
| 46P | #161 | **Bounded runtime hardening implementation.** Modified exactly two files (`no-leak.ts` + `no-leak.test.ts`); brought the runtime `FORBIDDEN_PUBLIC_KEYS` to exact validator parity (114 = 114) by adding the 62 missing keys; preserved exact-key `Set.has` matching; added the 62-key fixture, the uniqueness check, the exhaustive fail-closed sweep, the no-overmatch guards, and the builder-stays-clean checks. **Codex ACCEPTED.** |
| **46Q** | *(this doc)* | **Acceptance gate for Phase 46P.** Re-derives the parity mechanically (§4), records the accepted scope (§3) / key families (§5) / behavior (§6) / test coverage (§7), explains the latent-debt closure (§8) and the gate-#8 / Candidate D relationship (§9), preserves the blocked lanes (§10) and invariants (§11), and selects the next lane (§12). Modifies **no** runtime / test / validator / vector / fixture / source. |

### 2.2 Source / test files inspected (read-only)

- **`app/src/services/admission-wedge-spike/no-leak.ts`** (Phase 33N, hardened by Phase 46P; 287 lines). The
  runtime guard. Header (`:1-32`) records the Phase 46P parity restoration and the latent-debt framing.
  `FORBIDDEN_PUBLIC_KEYS` (`:37-175`) now holds **114** keys. Exports `findAdmissionPublicLeaks(surface)`
  (deep-walk → `string[]` of findings, `:250-281`) and `isAdmissionPublicSafe(surface)` (boolean wrapper,
  `:284-286`) — both signatures unchanged from Phase 33N. The forbidden-key check is `Set.has` on the key name
  (`:254`), the negative-assertion rule (`rendered_candidate_payload` legitimate only as boolean `false`,
  `:257-261`), the substring / pattern / UUID / opaque-run walls (`:181-218`, `:263-278`) are all unchanged.
- **`app/tests/unit/admission-wedge-spike/no-leak.test.ts`** (Phase 33N + Phase 46P; 211 lines). Retains the
  original Phase 33N block; adds the Phase 46P parity block (`:89-210`) carrying the 62-key fixture, the
  uniqueness assertion, the exhaustive per-key fail-closed sweep (top-level + nested), the four no-overmatch
  guards, and the builder-stays-clean checks over all five scenario intents (§7).
- **`docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`** (Phase 33L,
  hardened through 33Z / 46J; the source of truth). Its `FORBIDDEN_PUBLIC_KEYS` (`:272-420`) holds the **114**
  keys runtime is measured against; its `--self-check` (44/44) is the validator-side evidence. **Unchanged by
  this phase and by Phase 46P.**
- **`app/src/routes/admission-intake.ts`**, **`app/src/services/admission-wedge-spike/{index,public-response,classifier}.ts`**
  — inspected read-only to confirm Phase 46P touched none of them: the route's fail-closed send path, the
  fixed 8-field public-response allowlist, and the five-intent classifier are all unchanged. The barrel
  (`index.ts:32-35`) still re-exports exactly `findAdmissionPublicLeaks` / `isAdmissionPublicSafe`.
- **Codex review of Phase 46P** — recorded as an **ACCEPT** verdict for the slice (cited in the charter input;
  no patch was required).

---

## 3. Scope verification

Phase 46O §12 capped the slice's footprint at exactly two files. The merged Phase 46P (PR #161) honored that
cap exactly. The accepted Phase 46P scope, verified read-only against the merged commit and the working tree:

| Surface | Phase 46P change | Verified |
|---------|------------------|----------|
| `app/src/services/admission-wedge-spike/no-leak.ts` | Modified (additive: +62 keys, +tests-supporting comments) | ✓ |
| `app/tests/unit/admission-wedge-spike/no-leak.test.ts` | Modified (additive: parity test block) | ✓ |
| Any other source / test file | **None** | ✓ |
| Docs | **None** (Phase 46P added no doc) | ✓ |
| Route handlers (`admission-intake.ts`) | **None** | ✓ |
| Storage / store code | **None** | ✓ |
| Migrations | **None** | ✓ |
| DB code | **None** | ✓ |
| Auth / consent implementation | **None** | ✓ |
| Route-vector JSON (the five vectors) | **None** | ✓ |
| Route-vector validator (`validate-route-contract-test-vectors.mjs`) | **None** | ✓ |
| Route-vector README | **None** | ✓ |
| Phase 33E fixtures / fixture validator | **None** | ✓ |
| Package / lockfile / config / env | **None** | ✓ |
| CI / generated / binary | **None** | ✓ |
| Adjacent repo (`loa-straylight`, `freeside-characters`) | **None** | ✓ |

> **The slice landed at exactly the authorized footprint — two files, both additive.** Phase 46P's commit
> (`4204646f`, "fix: mirror Admission Wedge no-leak keys (#161)") shows `app/src/services/admission-wedge-spike/no-leak.ts`
> (+99 lines) and `app/tests/unit/admission-wedge-spike/no-leak.test.ts` (+132 / −1) and **no** other path.
> There was no scope creep into storage, DB, migration, auth, consent, route contract, validator, vectors, or
> packaging.

---

## 4. Runtime parity acceptance

This section is the load-bearing acceptance. It is a deterministic, mechanically extracted diff of the two
`FORBIDDEN_PUBLIC_KEYS` sets (extraction method recorded in §13), re-run this phase against the merged Phase
46P `no-leak.ts` and the unchanged validator — not an eyeballed estimate.

| Measure | Value | Accepted |
|---------|-------|----------|
| Validator `FORBIDDEN_PUBLIC_KEYS` | **114** | ✓ |
| Runtime `FORBIDDEN_PUBLIC_KEYS` | **114** | ✓ |
| Validator − runtime (keys validator forbids that runtime does not) | **0** | ✓ |
| Runtime − validator (keys runtime forbids that validator does not) | **0** | ✓ |
| Duplicate keys (either set) | **0** | ✓ |

> **Exact membership parity is achieved and accepted.** Both `FORBIDDEN_PUBLIC_KEYS` sets contain 114 unique
> keys; the symmetric difference is empty in both directions; neither set carries a duplicate. The runtime
> guard's own contract — "the denylist is MIRRORED here" (`no-leak.ts:9-11`) — and Phase 33M §14 (which
> *required* the spike to inherit the validator denylist) are now satisfied at the membership level.

**This closes the Phase 46O runtime/validator exact-key membership gap.** Phase 46O (its §3) measured the
runtime at the Phase 33L-original 52-key baseline against a 114-key validator — a **62-key** gap (validator
minus runtime). Phase 46P added exactly those 62 keys, and the re-derivation this phase confirms the gap is now
**zero** in both directions. The substring set, the pattern-name set, the negative-assertion set, `UUID_RE`,
and `MAX_OPAQUE_RUN` were already at parity before Phase 46P (Phase 46O §3.4) and remain unchanged — the only
divergence Phase 46O identified (the `FORBIDDEN_PUBLIC_KEYS` membership) is the only thing Phase 46P changed,
and it is now closed.

---

## 5. Added key families

Phase 46P added the **62** keys Phase 46O §3.2 enumerated as the validator-minus-runtime difference. They
divide into the two later-pass families. The runtime additions are snake_case **and** camelCase (so a
serializer rename cannot leak) and are matched by exact-string equality only (§6).

### 5.1 Phase 33Z block — `TransitionReceipt` / `AuditEvent` / signer / metadata / retired-receipt (25 keys)

> Runtime `no-leak.ts:59-92` (mirrors validator `:294-330`). Private `TransitionReceipt` / `AuditEvent` /
> private-receipt shapes; the transition id; signer / signature material; opaque policy detail; a raw
> `metadata` bag; and the retired `receipt_public_ref` spelling.

`receiptId`, `transition_receipt`, `transitionReceipt`, `transition_receipt_ref`, `transitionReceiptRef`,
`transition_id`, `transitionId`, `audit_event`, `auditEvent`, `audit_event_class`, `auditEventClass`,
`audit_ref`, `auditRef`, `audit_id`, `auditId`, `receipt_ref`, `receiptRef`, `private_receipt_ref`,
`privateReceiptRef`, `signer`, `signature`, `policy_details`, `policyDetails`, `metadata`,
`receipt_public_ref`.

### 5.2 Phase 46J block — canonical refs / hash-chain links / subject mapping / consent-auth family (37 keys)

> Runtime `no-leak.ts:126-174` (mirrors validator `:364-419`). The exact canonical names a future durable
> store / serializer must never emit publicly. snake_case **and** camelCase.

- **(a) canonical Assertion ref arrays:** `supersedes_refs`, `supersedesRefs`, `linked_assertion_refs`,
  `linkedAssertionRefs`.
- **(b) canonical TransitionReceipt / AuditEvent refs + hash-chain links:** `signer_refs`, `signerRefs`,
  `audit_event_ref`, `auditEventRef`, `receipt_hash`, `receiptHash`, `audit_hash`, `auditHash`,
  `previous_audit_hash`, `previousAuditHash`, `policy_decision_ref`, `policyDecisionRef`, `assertion_refs`,
  `assertionRefs`, `target_refs`, `targetRefs`.
- **(c) canonical candidate-subject mapping:** `subject_refs`, `subjectRefs`.
- **(d) consent / auth-decision key-name family:** `consent`, `consent_ref`, `consentRef`, `consent_proof`,
  `consentProof`, `consent_receipt`, `consentReceipt`, `consent_subject`, `consentSubject`, `consent_grantor`,
  `consentGrantor`, `consent_scope`, `consentScope`, `auth_decision`, `authDecision`.

> **Auditable, not merely asserted.** The Phase 46P test fixture
> (`no-leak.test.ts:106-142`, `PHASE_46P_MIRRORED_KEYS`) lists exactly these 62 keys; the test asserts the
> fixture has length **62** and **62** unique members (`:144-147`), and the §4 mechanical extraction confirms
> the merged runtime set is exactly the validator set. The 25 + 37 = 62 split is the family boundary recorded
> here and in the fixture's own section comments.

---

## 6. Runtime behavior acceptance

Accepted because each of the following is true of the merged Phase 46P `no-leak.ts`, verified read-only:

- **Runtime still uses exact-key `Set.has`.** The forbidden-key check is `FORBIDDEN_PUBLIC_KEYS.has(node.value)`
  on the object key name (`no-leak.ts:254`) — a `Set.has` exact-string test, unchanged from Phase 33N.
- **No substring / prefix / category matching was added for these exact keys.** The 62 additions are new
  members of the same exact-match `Set`; no `String.includes`, prefix test, or category bucket was introduced
  for them. (The pre-existing `FORBIDDEN_SUBSTRINGS` `includes` check applies to string *values*, not to the
  forbidden-key membership, and is unchanged.)
- **Existing substring / pattern / UUID / opaque-run walls remain preserved.** `FORBIDDEN_SUBSTRINGS`
  (`:181-195`), `FORBIDDEN_PATTERNS` (10 regexes, `:198-209`), `UUID_RE` (`:212-213`), and `MAX_OPAQUE_RUN = 24`
  (`:217-218`) are byte-for-byte unchanged and remain at validator parity.
- **The public / private guard shape remains preserved.** `walk` (`:227-242`) still yields a
  `{kind, path, value, child}` node per key and per string value at any depth (recursing arrays and nested
  objects); the guard still inspects the public surface only.
- **Fail-closed behavior remains preserved.** `findAdmissionPublicLeaks` still returns a non-empty findings
  list on any forbidden key / substring / pattern / UUID / opaque-run hit, and `isAdmissionPublicSafe` still
  returns `false` whenever findings are non-empty (`:284-286`). The route's existing send path continues to
  fail-closed on any finding or guard throw (route handler unchanged).
- **Existing exports remain preserved.** `findAdmissionPublicLeaks` and `isAdmissionPublicSafe` are the
  exact two exports, with unchanged signatures, still re-exported from the service barrel (`index.ts:32-35`).
  No new export was added; no package entrypoint re-export was added.
- **No route / API behavior changed** except the stricter fail-closed rejection that naturally results if one
  of the newly mirrored forbidden keys ever appears on a public runtime body — the route continues to
  fail-closed via the *existing* send path. No new status code, endpoint, or refusal taxonomy was introduced.

> **The slice is a copy, not a redesign — confirmed.** Phase 46P brought the runtime forbidden-key set to the
> validator (the unchanged source of truth), preserved every matching mechanism, and changed no behavior other
> than forbidding strictly more on the public surface. This is exactly what Phase 46O §4 / §6 authorized.

---

## 7. Test coverage acceptance

### 7.1 Suite-level results (re-run this phase)

| Check | Result | Accepted |
|-------|--------|----------|
| `no-leak.test.ts` (runtime no-leak test file) | **163/163 passed** | ✓ |
| Full `app/tests/unit/admission-wedge-spike/` suite | **300/300 passed** (6 files) | ✓ |
| Fixture validator (`validate-fixtures.mjs`) | **5/5 probes, 0 failures** | ✓ |
| Route-vector validator (`validate-route-contract-test-vectors.mjs`) | **5/5 vectors, 0 failures, no sixth** | ✓ |
| Route-vector self-check (`--self-check`) | **44/44** (42 fail-closed + 2 no-overmatch) | ✓ |
| Typecheck (`tsc --noEmit`) | **clean** | ✓ |
| Touched-file ESLint (`no-leak.ts` + `no-leak.test.ts`) | **clean** | ✓ |

### 7.2 Specific Phase 46P coverage accepted

The Phase 46P parity block (`no-leak.test.ts:89-210`) is accepted as covering, exactly:

- **62-key local fixture** — `PHASE_46P_MIRRORED_KEYS` (`:106-142`) copies the documented validator-minus-runtime
  gap verbatim as a local test fixture (the runtime module exports no key set and the validator is never
  imported into runtime, so there is no package / export / config change).
- **Uniqueness check** — asserts the fixture has length 62 and 62 unique members (`:144-147`).
- **Exhaustive fail-closed coverage for every newly mirrored key** — a per-key loop (`:153-167`) over the full
  62-key fixture asserts each key produces at least one `forbidden public key "<key>"` finding, with a short,
  safe-looking value so the failure is attributable to the key-name check (not a value-pattern wall).
- **Top-level and nested-depth fail-closed assertions** — each key is asserted both at the top level
  (`:154-159`) and nested under `a.b[0].c` (`:161-166`).
- **Exact-key no-overmatch guards** — `consent_assumption`, `consent_scope_assumption`, `consent_note_draft`,
  and `auth_assumption` are each asserted to produce **zero** findings (`:170-194`), proving the bare
  `consent` / `auth_decision` additions do not over-match legitimate prefix-sharing request draft markers; a
  combined request-shaped surface carrying all four at once is also asserted clean.
- **Builder-stays-clean checks over all five `buildAdmissionSpikePublicResponse` scenario intents** — a loop
  over `ADMISSION_TRANSITION_INTENTS` (pending / accept / reject / supersede / malformed, `:201-208`) classifies
  and builds each public body and asserts it produces zero findings under the now-114-key guard (no false
  positive from the newly mirrored keys).

> **The coverage is exhaustive over the mirrored set, not a spot-check.** Phase 46O §7 asked for "one
> fail-closed test per newly mirrored key — or a mechanically verified exhaustive sweep." Phase 46P chose the
> exhaustive sweep and added the no-overmatch and builder-stays-clean cases on top. This satisfies the §7
> test requirements and is accepted.

---

## 8. Latent-debt closure

Phase 46P closes the runtime no-leak mirror latent debt Phase 46O identified:

- **Phase 46O found the runtime lagged the validator by 62 keys.** The runtime guard froze at the Phase
  33L-original 52-key baseline (Phase 33N) and tracked **neither** the Phase 33Z 25-key block nor the Phase
  46J 37-key block — a 62-key mirror-fidelity drift against the guard's own "mirror the validator" contract.
- **Phase 46P restored parity.** The runtime set now equals the validator set (§4); the drift is zero in both
  directions.
- **This removes the runtime no-leak exact-key mirror blocker for later implementation-readiness work.** The
  runtime mirror was the lowest-blast-radius, longest-owed of the named implementation-authorization
  prerequisites (46N §13; 46K §7). Discharging it makes the public-surface boundary fail-closed for the
  canonical / consent / receipt / audit key names **in advance** of any durable-store serializer that could
  produce them.

**No overclaim — what this does not do:**

- It does **not** implement durable storage. The runtime mirror touches `no-leak.ts` + its test only; it
  builds no store, writes no DB, adds no migration.
- It does **not** prove all future durable-store projections are safe. It forbids a fixed key-name family on
  the public surface; a future serializer must still be written to keep private material off the public
  surface, and its safety must be proven by its own tests.
- **Future schema / migration and route / storage work still require their own no-leak / public-private
  tests.** Closing the mirror gap is a precondition, not a substitute, for the per-lane verification that
  later work owes.

---

## 9. Relationship to ADR-022E gate #8 and Candidate D

- **Phase 46N cleared ADR-022E gate #8 only as a bounded Dixie documentation / architecture / handoff
  prerequisite** (46N §1 / §9). It proposed Candidate D as the production adapter, cited the re-authored
  sibling handoff packet, and preserved the ADR-022D invariants — at the paper level only. It did **not**
  discharge the Straylight-owned operative gate, authorize implementation, or build a store.
- **Candidate D remains the adapter *proposal* input** — split storage; a Dixie route-side durable adapter for
  the Admission Wedge route-owned records, shaped as a swap-in of the canonical Straylight `StorageAdapter`
  interface, with Straylight canonical ownership / semantics / invariants preserved (46M §6; 46N §7). It is a
  proposal, not a built or authorized adapter.
- **Phase 46P / 46Q close one downstream implementation-authorization prerequisite: runtime no-leak mirror
  parity.** Clearing gate #8 at the paper level (46N) is what unblocked *asking for* the runtime-mirror lane
  (46O); Phase 46P discharged it; this gate accepts that discharge. It is one of the implementation-authorization
  preconditions (46N §11 prerequisite 9) — now satisfied.
- **This still does not authorize implementation.** Accepting the runtime mirror discharges a single
  precondition. The operative Straylight-side gate #8 is not discharged; sibling gates #9 / #10 / #12 / #20 are
  held; the implementation-authorization set (46N §11) is not complete. No durable-store build is authorized by
  this acceptance.

---

## 10. Remaining blockers

After accepting Phase 46P, the following remain **blocked** — none is unblocked by this acceptance:

- **durable-store implementation-readiness acceptance** — not ratified;
- **detailed schema / migration design** — not produced;
- **durable-store implementation** — no store, schema, table, or store code is created or authorized;
- **DB writes** — none permitted;
- **migrations** — none authored or applied;
- **route / API behavior changes beyond the bounded no-leak hardening already merged** — no new endpoints /
  statuses / refusal taxonomy;
- **auth / consent implementation** — auth is not implemented; consent is not implemented;
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

> Accepting the runtime-mirror slice authorizes **no** storage / DB / migration / auth / consent / production /
> route-contract / schema / package / Freeside / LLM work. Every lane above remains its own
> separately-authorized future gate.

---

## 11. Invariants

Phase 46Q preserves **all** of the following; accepting Phase 46P carries each forward unchanged (Phase 46P
only **strengthens** invariant 8, never weakens it):

1. **A pending candidate is not recallable.** Only active, recall-eligible assertions enter the recall
   projection.
2. **A rejected candidate creates no admitted assertion.**
3. **An accepted candidate creates / references an admitted assertion.**
4. **A superseded assertion is excluded from ordinary recall** unless explicitly requested / marked.
5. **A malformed / unsafe payload fails closed.** The classifier accepts only the five forms and fails closed
   otherwise; the route's send path fails closed on any guard finding or throw.
6. **Missing / unauthorized auth fails closed.** One stable refusal that never reveals which gate failed.
7. **Missing / invalid consent fails closed in any future production admission model.** Service-token /
   operator auth is never treated as consent.
8. **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
   material.** Enforced at the runtime layer by the public-surface deep-walk + `FORBIDDEN_PUBLIC_KEYS` +
   substring / regex / UUID / opaque-run walls, and at the contract layer by the validator (33Z + 46J).
   **Phase 46P strengthens this invariant by bringing the runtime denylist to validator parity (the 62 keys);
   it is upheld for the spike's fixed output and made fail-closed in advance for the canonical / consent
   names.**
9. **Private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private.** Forbidden
   on the public surface at any depth; lives on the private audit record / private primitives only.
10. **User chat does not become memory merely because it was said.** No Discord / freeform ingestion; no
    user-chat-as-memory path; consent never inferred from chat text.
11. **Public `remember-this` remains blocked.**
12. **Discord / freeform history ingestion remains blocked.**
13. **Production admission / storage / auth / consent remain blocked.**
14. **Route-contract freeze and final schema freeze remain blocked unless separately authorized.**
    `route_contract_final` / `schema_final` false on every vector; Phase 46Q freezes neither.

---

## 12. Next lane

The runtime no-leak mirror parity is now achieved (§4) and accepted (§1); Phase 46P's footprint, behavior, and
test coverage are verified (§3 / §6 / §7). The lowest-blast-radius implementation-authorization precondition is
discharged. What remains is the question of whether the durable-store readiness chain is now ready to authorize
the *next* concrete step.

> **Selected next lane: a docs/decision-only durable-store implementation-readiness acceptance gate.** Its
> scope is **docs / decision-only**: it inventories the implementation-authorization preconditions (46N §11;
> 46K §9) — now that the runtime no-leak mirror is discharged (this gate) — and **decides whether the chain is
> ready to authorize a future bounded dev/operator route-storage spike or a schema / migration design lane.**
> It builds no store, writes no DB, adds no migration, and authorizes no implementation by itself; it produces
> the readiness verdict (and, if not ready, the exact remaining blockers) that gates the subsequent
> spike/design lane.

**Why this lane, and why not the alternatives:**

- **Durable-store implementation-readiness acceptance gate (selected)** — its checklist criterion for the
  runtime no-leak stance (46N §11 prerequisite 9; 46K §9) was the blocker just discharged, so it is the
  natural next decision: with that precondition satisfied, does the chain now clear to authorize a bounded
  spike or a schema/migration design lane, or do other preconditions (operative Straylight gate #8, sibling
  gates) still block? It is docs/decision-only and authorizes nothing by itself.
- **Schema / migration design gate** — *downstream, not next.* It produces the final data model / migration
  plan, each canonical-store migration being "a separate ADR + sibling-repo PR under teammate review"
  (ADR-022D §7); it follows the readiness-acceptance decision.
- **Dev/operator route-storage spike authorization gate** — *downstream, not next.* A bounded storage spike
  would touch runtime; it should be authorized only after the readiness-acceptance gate confirms the
  preconditions are met.
- **Direct durable-store implementation** — *explicitly not a candidate.* No artifact authorizes it; the
  implementation-authorization prerequisites are not all satisfied (46N §11), the operative Straylight-side
  gate #8 is not discharged, and sibling gates #9 / #10 / #12 / #20 are held. It is not selected.

---

## 13. Validation

All commands were run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46Q is
docs/decision-only — it adds only this document and mutates no runtime source, test, validator, vector, or
fixture — so the validators and runtime tests are run only to confirm the already-merged Phase 46P artifacts
are green, and the runtime↔validator key diff is a read-only extraction over the two unchanged files.

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
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md || true
# Focused runtime re-validation of the merged Phase 46P slice (from app/):
npx vitest run tests/unit/admission-wedge-spike/no-leak.test.ts
npx vitest run tests/unit/admission-wedge-spike/
npx tsc --noEmit
npx eslint src/services/admission-wedge-spike/no-leak.ts tests/unit/admission-wedge-spike/no-leak.test.ts
# Runtime↔validator key-set diff method (read-only; extracts both FORBIDDEN_PUBLIC_KEYS sets and diffs):
#   validator set (114) − runtime set (114) = ∅; runtime − validator = ∅; no duplicates in either set.
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md
```

**Recorded results for this lane:**

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-ACCEPTANCE-GATE.md` is added; no runtime source (and
  specifically not `no-leak.ts`), no runtime test (and specifically not `no-leak.test.ts`), no route handler,
  no route-vector JSON, validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`, package /
  lockfile, config / env, CI, migration, or generated file is touched;
- **nothing staged / committed** — `git diff --cached --name-status` is empty; `git diff --check` and
  `git diff --cached --check` report no whitespace errors; the no-index whitespace check on the new doc reports
  no errors; `git status` shows only the untracked new doc on branch
  `phase-46q-admission-runtime-no-leak-acceptance`;
- **validators green (merged / unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes
  valid, 0 failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no
  sixth vector**; the `--self-check` harness reports **44/44** cases behaving as required (42 fail-closed
  negative mutations + 2 exact-key no-overmatch guards);
- **runtime re-validation green** — `no-leak.test.ts` reports **163/163 passed**; the full
  `app/tests/unit/admission-wedge-spike/` suite reports **300/300 passed across 6 files**; `tsc --noEmit` is
  clean; ESLint on the two Phase 46P files is clean;
- **runtime↔validator key diff (read-only)** — validator `FORBIDDEN_PUBLIC_KEYS` = **114** keys; runtime
  `FORBIDDEN_PUBLIC_KEYS` = **114** keys; validator − runtime = **0**; runtime − validator = **0**; **0**
  duplicates in either set. The substring / pattern-name / negative-assertion sets, `UUID_RE`, and
  `MAX_OPAQUE_RUN` remain at parity between the two files;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–15 exactly once
  each.

---

## 14. Corruption / duplicate guard

Phase 46Q applies an explicit corruption / duplicate guard to **this** document (carried from the Phase
46I–46O precedent):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 15.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the single fenced block is the §13
  validation command list.

---

## 15. Cross-references

- [`docs/ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md`](ADMISSION-WEDGE-RUNTIME-NO-LEAK-MIRROR-HARDENING-GATE.md)
  — Phase 46O (PR #160); the authorizing gate this acceptance closes the loop on. Measured the exact 62-key
  gap (its §3), defined the mirror boundary / no-overmatch / test requirements (its §4 / §6 / §7), and
  authorized the bounded two-file slice (its §12). **Not modified by this phase.**
- `app/src/services/admission-wedge-spike/no-leak.ts` — the merged Phase 46P runtime guard (now 114-key,
  287 lines); inspected **read-only** to re-derive the 114-key parity, the exact-key `Set.has` mechanism, the
  preserved walls, and the preserved exports. **Not modified by this phase.**
- `app/tests/unit/admission-wedge-spike/no-leak.test.ts` — the merged Phase 46P runtime no-leak test; inspected
  **read-only** to ground the §7 coverage acceptance (62-key fixture, uniqueness, exhaustive sweep,
  no-overmatch guards, builder-stays-clean checks). **Not modified by this phase.**
- [`docs/ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md`](ADMISSION-WEDGE-CONSENT-STORAGE-VECTOR-ALIGNMENT-GATE.md)
  — Phase 46J (PR #155); added the 37 canonical/consent keys to the **validator** and deferred the runtime
  mirror (the deferral Phase 46P discharged). **Not modified by this phase.**
- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-REAUTHORED-CLEARING-ADR.md)
  — Phase 46N (PR #159); cleared gate #8 at the paper level and named the runtime mirror as a deferred
  implementation-authorization precondition (its §11 prerequisite 9). **Not modified by this phase.**
- [`docs/ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-PRODUCTION-ADAPTER-SCHEMA-MIGRATION-DECOMPOSITION-GATE.md)
  — Phase 46M (PR #158); selected Candidate D as the adapter proposal input (§9). **Not modified by this
  phase.**
- `docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs` and the five
  vector JSONs — inspected **read-only** as the unchanged 114-key source of truth and the 44/44 self-check.
  **None is modified.**
- `app/src/routes/admission-intake.ts`,
  `app/src/services/admission-wedge-spike/{index,public-response,classifier}.ts` — inspected **read-only** to
  confirm Phase 46P left the route send path, the fixed 8-field public allowlist, the five-intent classifier,
  and the two-export barrel unchanged. **None is modified.**
- `@loa/straylight` — canonical primitive / substrate owner; ADR-022E durable-store gate #8 (+ sibling gates
  #9 / #10 / #11 / #12 / #15 / #20, **held** operatively) and ADR-022D receipt / audit-chain invariants are the
  decision records cited as guardrails (§9). **Not edited by this phase.**
