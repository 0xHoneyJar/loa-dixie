# Phase 46Z — Admission Wedge Mode 2 implementation-authorization checklist gate

> **Phase**: 46Z
> **Branch context**: `phase-46z-admission-mode2-authorization-checklist-gate`
> **Related**: Phase 46Y (PR #170,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md))
> **designed**, on paper, the Mode 2 migration-isolation / scope-guard boundary (its four-class P / E / T / C
> migration model §7, migration-isolation requirements §8, storage boundary model §9, refined / replacement
> scope-guard model §10, future-implementation evidence set §11, and Codex audit checklist §12) and reached
> **Verdict A — the boundary design is accepted as a docs-only precondition; Mode 2 implementation remains
> BLOCKED pending a later authorization gate**, selecting **this Phase 46Z implementation-authorization
> *checklist* gate** (§16) next; Phase 46X (PR #169,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the Mode 2 enablement blocker (Verdict A — Mode 2 remains BLOCKED) into the §9 required-future-
> evidence set; Phase 46W (PR #168,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md))
> **accepted** the merged Phase 46V Mode 1 route-storage spike as a bounded, disabled-by-default,
> dev/operator-only, **non-production** proof; Phase 46V (PR #167,
> [`admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md))
> **implemented** Storage Mode 1 (no-migration, bounded-synthetic, in-process, route-owned) and **declined**
> Mode 2 because the two boundaries below cannot both hold while a durable migration is added without weakening
> an existing security guard; Phase 46U (PR #166,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md))
> §6 / §7 **preferred Mode 1** and **conditionally** authorized Mode 2 (dev-only durable + Lane-1 `aw_*`
> migrations) "subject to a separate Codex audit"; Phases 46T / 46S (PR #165 / #164) **accepted** and
> **drafted** the durable-store schema / migration design (13 `aw_*` tables across 11 subsections;
> `schema_final` / `route_contract_final` **false**); Phase 46N **cleared** ADR-022E gate #8 as a **Dixie
> documentation / architecture / handoff prerequisite only** while the operative Straylight-side discharge
> **remains held**; Phases 46O / 46P / 46Q restored and accepted the runtime no-leak mirror at **114 = 114**
> parity; Straylight (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); ADR-022E durable-store gate
> #8 (+ sibling gates **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only implementation-authorization checklist gate.** This gate adds **only this
> document** (plus a minimal forward-traceability status note in the immediate predecessor Phase 46Y design gate
> and the Phase 46V runbook, §20). It modifies **no** runtime source — and specifically does **not** modify
> `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`,
> `app/src/services/admission-wedge-spike/route-storage-spike.ts`, `index.ts`, `no-leak.ts`,
> `app/src/config.ts`, `app/src/routes/admission-intake.ts`, `app/src/server.ts`, or
> `app/tests/unit/admission-wedge-spike/scope-guards.test.ts` — and changes **no** route handler, storage /
> store code, DB write, migration, SQL file, executable schema, migration runner, packaging / copy runner,
> auth, consent, route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture
> validator, other test, package export, config, env, package, lockfile, CI, generated file, or binary. No
> adjacent repository (`loa-straylight`, `freeside-characters`) is touched.
> **This is the Mode 2 implementation-authorization *checklist* gate** — the docs-only rung Phase 46Y §16
> named, downstream of the 46Y boundary **design**. It **turns the Phase 46Y boundary design (§7–§12) into a
> hard, checkable implementation-authorization checklist** and **decides whether that design is precise enough
> to authorize a future, separate-PR, bounded, dev/operator-only, disabled-by-default, non-production Mode 2
> implementation spike**. **It is not the spike, it implements no Mode 2, and it builds nothing.** It **builds
> no store, writes no DB, adds no migration, creates no SQL or executable schema, executes no migration, edits
> no migration runner or packaging runner, implements no auth or consent, changes no route / API behavior,
> weakens or edits no scope guard, freezes neither the route contract nor the final schema, discharges no
> operative Straylight-side gate, and claims no production readiness.** Mode 2 itself **remains unimplemented**;
> only a future **separate** implementation lane (Phase 47A), **acceptance-gated on this checklist**, is
> authorized — and it remains blocked from production / Lane-2 / freeze / gate-#8 work in full (§19).

Every statement below is grounded **read-only** against the actual Dixie repo at authoring time: the migration
runner `app/src/db/migrate.ts`, the build-asset packager `app/scripts/copy-migrations.mjs`, the shared
migration directory `app/src/db/migrations/`, the Phase 33N static scope guards
`app/tests/unit/admission-wedge-spike/scope-guards.test.ts`, the merged Phase 46V route-storage spike
`app/src/services/admission-wedge-spike/route-storage-spike.ts`, the runtime no-leak guard `no-leak.ts`, the
env parsing in `app/src/config.ts`, the conditional mount + migrate call in `app/src/server.ts`, the Phase 46V
runbook, and the predecessor decision gates (46Y / 46X / 46W / 46V / 46U / 46T / 46S / 46N / 46O–46Q). Where a
claim could not be grounded inside the read material, it is marked as such. **The canonical Straylight
`StorageAdapter` interface and the canonical `Assertion` / `TransitionReceipt` / `AuditEvent` field shapes live
in the adjacent `loa-straylight` repository (cross-repo references, not Dixie file:line) and remain
Straylight-owned (§19).**

---

## 1. Status

Phase 46Z is the bounded, docs/decision-only **Mode 2 implementation-authorization checklist gate** named by
Phase 46Y §16. Its purpose is to take the Phase 46Y boundary design — which produced, *on paper*, the migration
classification / isolation model (46Y §7 / §8), the storage boundary model (46Y §9), and the refined /
replacement scope-guard model (46Y §10), plus a future-implementation evidence set (46Y §11) and a Codex audit
checklist (46Y §12) — and **convert it into a hard, enumerated, file:line-grounded implementation-authorization
checklist**, then **decide whether that checklist is precise enough to authorize a future, separate-PR,
bounded, dev/operator-only, disabled-by-default, non-production Mode 2 implementation spike**.

**What this phase is, stated narrowly and exactly.** Phase 46Z:

- is **docs / decision-only** — it turns the 46Y design into a checkable checklist and records the verdict;
- is an **implementation-authorization *checklist* gate**, *not* an implementation, *not* the boundary
  **design** gate (46Y), *not* the blocker-**decomposition** gate (46X), *not* the spike *acceptance* gate
  (46W), *not* the schema / migration **design** gate (46S), and *not* the schema / migration **design
  acceptance** gate (46T);
- does **not** modify runtime source or tests — and specifically does not touch `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql` migration, `route-storage-spike.ts`, `no-leak.ts`, `config.ts`,
  `admission-intake.ts`, `server.ts`, or `scope-guards.test.ts`;
- does **not** implement Mode 2, route storage, or durable storage;
- does **not** create migrations and does **not** execute any migration;
- does **not** create SQL files or executable schema;
- does **not** write DB code or perform any DB write;
- does **not** edit, weaken, add, or remove any migration runner, packaging / copy runner, or scope guard;
- does **not** change route / API behavior;
- does **not** implement or unblock auth or consent;
- does **not** authorize production admission;
- does **not** freeze the route contract;
- does **not** freeze the final schema;
- does **not** claim production readiness;
- does **not** claim or discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §12 / §19);
- **authorizes no implementation in this PR.** It authorizes only a future **separate** Phase 47A
  implementation lane, **acceptance-gated** on the §15 checklist — and that lane, if it later runs, must itself
  pass the checklist before being accepted.

> **Verdict: A — the Phase 46Y boundary design is accepted as sufficient to authorize a future, separate-PR,
> bounded, dev/operator-only, disabled-by-default, non-production Mode 2 implementation spike, *gated on the
> hard checklist in §8–§15*; Mode 2 itself remains unimplemented and is BLOCKED from production / Lane-2 /
> freeze / gate-#8 work in full.** The boundary design (46Y §7–§12) is precise enough that the proof
> obligations a Mode 2 spike must discharge can be stated as a concrete, binary, file:line-grounded checklist
> (§8–§15). The authorization is **conditional and mode-contingent**, mirroring the established Phase 46U → 46V
> precedent (46U authorized a spike that could be Mode 1 *or* Mode 2; 46V chose Mode 1 *because* Mode 2 tripped
> the existing guards): Phase 47A **may attempt** a bounded Mode 2 spike, but it is **accepted only if it proves
> every checklist item**, and if it cannot prove migration isolation and the refined-guard / gate-conjunction /
> storage-behaviour / no-leak obligations without weakening the production safety posture, it must fall back
> (as 46V did) or return for a narrower gate, and **Mode 2 stays blocked**. **This gate implements nothing,
> authorizes no durable mode in this PR, executes no migration, and discharges no Straylight-side gate.**

This maps to the prompt's recommended **Verdict A** — *Phase 46Z accepts the Phase 46Y boundary design as
sufficient to authorize a future bounded, dev/operator-only, disabled-by-default, non-production Mode 2
implementation spike* — and to the chain convention of a load-bearing decision (here: the design is sufficient
to authorize a **checklist-gated** spike) paired with the selection of a single, well-bounded next lane (§18).

**Why not the conservative alternative (Verdict B).** Verdict B — keep Mode 2 implementation blocked and select
a narrower missing-evidence gate — was genuinely considered (§16). It would be correct *if* the checklist could
not be made precise enough from current repo evidence. It can: every checklist item below is binary and
grounded in actual repo file:line (the migration runner `migrate.ts:76-85`, `199-240`, `46-54`; the ungated
call `server.ts:299-301`; the `.sql`-only build copy `copy-migrations.mjs:38-40`, `48-52`; the AND-nested base
route gate `server.ts:651` and inner storage gate `server.ts:674`; the 19-entry denylist
`scope-guards.test.ts:122-142`; the 114-key no-leak guard). The one thing Phase 46Y deliberately left open —
*which* isolation mechanism (separate directory vs manifest vs naming exclusion + dev-only runner vs env-gated
category) a future lane picks (46Y §8) — does **not** prevent a precise checklist, because the checklist states
the **mechanism-agnostic proof obligations** the chosen mechanism must satisfy (§8) rather than pre-selecting a
mechanism. Verdict B is therefore not forced; it is the documented fallback the §15 checklist itself triggers
if Phase 47A cannot satisfy migration isolation safely (§16 / §18).

---

## 2. Source chain

Phase 46Z sits at the bottom of an explicit, PR-anchored chain. Each link is read-only input here; none is
modified except the two §20 forward-traceability status notes.

- **Phase 46U / PR #166** — route-storage spike **authorization** gate, Verdict A. Preferred **Mode 1** and
  **conditionally** authorized Mode 2 (dev-only durable + Lane-1 `aw_*` migrations) "subject to a separate Codex
  audit." **Not modified.**
- **Phase 46V / PR #167** — implemented **Mode 1 exclusively**: no migrations, no SQL, no DB writes, in-process
  `Map` state, one Phase 33Q ledger per synthetic actor; the source header (`route-storage-spike.ts:9-15`) names
  the Mode 2 blocker this chain designs against. **Gains a minimal Phase 46Z status note (§20).**
- **Phase 46W / PR #168** — route-storage spike **acceptance** gate, Verdict A. Accepted Phase 46V as a bounded
  dev/operator Mode 1 proof. **Not modified.**
- **Phase 46X / PR #169** — Mode 2 enablement **blocker-decomposition** gate, Verdict A. Decomposed the blocker
  into the §9 required-future-evidence set; selected the Phase 46Y design lane. **Not modified.**
- **Phase 46Y / PR #170** — Mode 2 migration-isolation / scope-guard boundary **design** gate, Verdict A.
  Produced the §7–§12 boundary design and **selected this Phase 46Z checklist lane** (§16). **The selecting
  predecessor; gains a minimal Phase 46Z status note (§20).**
- **Phases 46S / 46T / PR #164 / #165** — drafted and accepted the durable-store schema / migration design (13
  `aw_*` tables across 11 subsections; `schema_final` / `route_contract_final` **false**). The `aw_*` table set
  the Class-E classification (46Y §7) refers to; **not modified, not frozen.**
- **Phase 46N / Candidate D (46M)** — gate #8 bounded **paper** clearing and the split-storage production-adapter
  proposal input. The §19 boundary that keeps Lane-2 canonical migrations and the operative Straylight-side
  discharge blocked; **not modified.**
- **Phases 46O / 46P / 46Q** — the **114 = 114** runtime ↔ validator no-leak parity a future Mode 2 must hold
  over stored / replayed public surfaces. **Not modified.**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner
  and the decision records cited as guardrails (§12 / §19). Cross-repo references, **not edited.**

---

## 3. Phase 46Y accepted baseline

This section answers **authorization question 1 — what exactly Phase 46Y accepted.** Phase 46Y reached
**Verdict A** and accepted, **as a docs-only precondition only**, the following paper artifacts (no code, no
guard, no runner, no migration):

1. **A four-class migration classification model** (46Y §7): **P** — normal production migrations (the existing
   `003`–`015` set, unchanged); **E** — dev/operator Admission Wedge experimental `aw_*` migrations
   (synthetic-only, non-production, the class that must NOT be auto-adopted by the production runner); **T** —
   test-only fixtures / harness schema (never production migration material); **C** — future canonical
   Straylight-store migrations (Lane-2, blocked behind gate #8). The load-bearing distinctions are **E ≠ C** and
   **E ≠ P**.
2. **Nine migration-isolation requirements** (46Y §8) a future authorization gate should demand — separate
   directory / manifest / category; an explicit env-gated dev/operator runner disabled by default; proof that
   normal startup `migrate(dbPool)` cannot adopt `aw_*`; proof that production execution cannot run the
   experimental path by accident; a rollback / drop / tombstone procedure; no raw candidate payload persistence;
   no public response expansion; no route-contract freeze; no production DB-write authorization.
3. **A storage boundary model** (46Y §9): route-owned storage only; dev/operator-only, disabled-by-default,
   non-production, synthetic-only; bounded, fail-closed, rejection-not-eviction; no raw payload persistence;
   persisted + replayed responses pass the 114-key no-leak guard; no public body expansion without a separate
   no-leak proof; module placement decided by the refined-guard model, not by widening the existing guard.
4. **A refined / replacement scope-guard model** (46Y §10): the current Phase 33N guards are correct and stay;
   Mode 2 may not be implemented by weakening them broadly; a future gate must define narrow allowlisted paths +
   negative guards that **replace, not weaken**, the blanket guard, proven against the same evasion-resistance
   bar (`scope-guards.test.ts:231-313`).
5. **A future-implementation evidence set** (46Y §11, 12 items) and a **Codex audit checklist** (46Y §12).

**Phase 46Y accepted that design as a docs-only precondition only.** It is the *paper* baseline this gate now
converts into a hard checklist. Phase 46Y built none of it.

---

## 4. What Phase 46Y still did not authorize

This section answers **authorization question 2 — what Phase 46Y still did not authorize.** Per Phase 46Y §1 /
§6 / §13 / §16 / §18, Phase 46Y explicitly did **not**:

- implement Mode 2, route storage, or durable storage;
- create or execute any migration, or create any SQL / executable schema;
- write any DB code or perform any DB write;
- edit, weaken, add, or remove any scope guard, migration runner, or packaging runner (the refined-guard and
  isolation models are **paper design only**);
- change route / API behaviour, or expand the public response body;
- implement or unblock auth or consent;
- authorize production admission, production DB writes, production migration execution, or production
  durable-store implementation;
- authorize Lane-2 canonical Straylight-store migrations or discharge the operative Straylight-side ADR-022E
  gate #8;
- freeze the route contract or the final schema, or claim production readiness;
- **authorize a future Mode 2 *implementation* lane** — it selected only this docs/decision-only Phase 46Z
  checklist gate, which is where the authorization question (sufficient → authorize a checklist-gated spike, or
  insufficient → narrower gate) is actually decided.

In short: Phase 46Y produced the *design* and stopped. The authorization decision was explicitly deferred to
this gate.

---

## 5. Current repo evidence

Read-only, confirmed at authoring time. No line number is invented; two figures were re-counted directly to
avoid drift (the **19**-entry denylist and the **13** `aw_*` tables across **11** subsections). This is the
evidence the §6 authorization question is answered against.

### 5.1 Migration runner and packaging

- **Single shared directory.** `app/src/db/migrations/` holds `003`–`015` plus three `_down` rollback files
  (`013/014/015_*_down.sql`); resolved relative to the compiled runner via `import.meta.url`
  (`migrate.ts:22-23`). **No `aw_*` migration exists today** (verified by directory listing).
- **Whole-directory discovery.** `discoverMigrations()` (`migrate.ts:76-85`) does `readdir(MIGRATIONS_DIR)` and
  returns **every** file matching `f.endsWith('.sql') && !f.includes('_down')` (`migrate.ts:79`), sorted by
  leading numeric prefix (`migrate.ts:80-84`). **No** manifest, allowlist, category, environment field, or
  per-file opt-in.
- **Ungated execution.** `migrate()` (`migrate.ts:140-254`) applies every discovered file (`migrate.ts:199-240`)
  with **no** `NODE_ENV` branch; its sole caller `server.ts:299-301` invokes `await migrate(dbPool)` at
  `server.ts:301` whenever `dbPool` is non-null (`server.ts:299`), with **no** environment / dev-operator /
  feature-flag gate.
- **Applied-tracking has no environment column.** `_migrations` (`migrate.ts:46-54`) is `(id, filename UNIQUE,
  checksum, applied_at)` — it cannot record "this migration is dev-only." Concurrency uses a Postgres advisory
  lock (`migrate.ts:153-167`); a changed already-applied file warns on checksum mismatch (`migrate.ts:203-210`).
- **Forward-only.** `_down` files are excluded from discovery (`migrate.ts:79`) and are not auto-applied
  (`migrate.ts:1-13`); any reversible Mode 2 proposal must design its own drop / down path **and** the
  operational procedure to run it.
- **Build copy filters only on `.sql`.** `copy-migrations.mjs:38-40` filters to the `.sql` files and the
  `mkdir` + `copyFile` loop (`copy-migrations.mjs:48-52`) copies every one from `src/db/migrations/` to
  `dist/db/migrations/`; it makes no dev/production distinction.

### 5.2 Scope guards (Phase 33N)

- **Scanned surface.** `SPIKE_FILES` (`scope-guards.test.ts:36`) = recursive `.ts` under
  `app/src/services/admission-wedge-spike/` (via `walkTs`, `scope-guards.test.ts:25-34`) **plus**
  `app/src/routes/admission-intake.ts` (`scope-guards.test.ts:23`); ≥5 files asserted present
  (`scope-guards.test.ts:163`). The current service dir holds 7 `.ts` files.
- **Token denylist.** `DURABLE_WRITE_DENYLIST` (`scope-guards.test.ts:122-142`) — **19** entries (re-counted) —
  applied to every spike file after parser-backed comment stripping (`scope-guards.test.ts:200-228`).
- **Import denylist.** `scope-guards.test.ts:185-198` (bare `pg`, `/db/(client|pool|migrate|transaction)`,
  `/db/migrations/`, any `/-store(\.js)?$/`, `BoundedEstateStore`) plus `169-175` (no Freeside) and `177-183`
  (no `@loa/straylight`).
- **Syntax-aware, evasion-resistant, binary.** `stripComments()` (`scope-guards.test.ts:78-118`) uses the
  TypeScript parser; the regression suite (`scope-guards.test.ts:231-313`) proves a durable-write token cannot
  hide in a string, nested template `${\`//\`}`, or regex char class `/[//]/`, and that real comments / JSDoc are
  stripped. Any match fails the test; there is **no** per-file opt-out, suppression comment, or allowlist.
- **No package export.** `scope-guards.test.ts:315-337` asserts the spike is not a package export and not
  re-exported from `src/index.ts`; `339-364` keeps the docs validator Node-built-ins-only and unwired from
  `app/`.

### 5.3 Spike storage (Phase 46V, Mode 1)

- **Mode 1 invariants.** `route-storage-spike.ts:29-35` — opens NO database connection, NO file handle, NO
  socket, NO timer; performs NO durable write and NO migration; state is JS `Map`s in a factory closure; a
  process restart leaves no recallable residue.
- **Filename discipline.** `route-storage-spike.ts:40-43` — named `*-spike.ts`, deliberately not `*-store.ts`,
  to stay inside the `/-store(\.js)?$/` import guard (`scope-guards.test.ts:191-194`).
- **Mode 2 declined, blocker stated.** `route-storage-spike.ts:9-15` records the exact Mode 2 blocker.

### 5.4 No-leak parity, vectors, fixtures, env gates

- **No-leak.** The runtime guard `no-leak.ts` mirrors the route-contract validator's `FORBIDDEN_PUBLIC_KEYS` at
  **114 = 114** parity (Phases 46O / 46P / 46Q; `no-leak.test.ts:95`). The fixed public-response builder emits an
  8-field allowlist; the 114-key guard is a defence-in-depth deep-walk so a future durable-store serializer
  cannot surface a canonical ref / hash / consent field under a short, safe-looking value.
- **Vectors / fixtures (unchanged).** Five route-vector JSONs + validator + `--self-check` (44/44); five Phase
  33E fixtures + validator (5/5). All green at authoring time (§21).
- **Two independent env gates, both required.** `DIXIE_ADMISSION_INTAKE_ENABLED` → `admissionIntakeSpikeEnabled`
  (`config.ts:428`) gates the **outer base route mount** (`server.ts:651`); the **draft / non-final**
  `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED` → `admissionIntakeStorageSpikeEnabled` (`config.ts:442-443`)
  gates the **inner storage block** (`server.ts:674`), which is **nested inside** the outer gate. Storage
  therefore engages **only on the conjunction of both gates**; with the storage gate off, the
  `routeStorageSpikeDeps` default stays the empty `{}` (`server.ts:668-673`) because the inner storage block
  (`server.ts:674`) never runs, so no store is created and no store deps are injected (the behaviour the comment
  at `server.ts:662-664` documents). **No production defaults** (`config.ts:427`, `440-443`).

> **Grounding note (AND-gate citation discipline).** A future Mode 2 AND-gate claim must cite **both** the outer
> base route gate (`server.ts:651`, `config.ts:428`) **and** the inner storage gate (`server.ts:674`,
> `config.ts:442-443`) — citing only the inner gate is insufficient (the Phase 46Y Codex PATCH made exactly this
> correction). The two are nested, not parallel: the inner storage gate is only reached when the outer base
> route gate is already true.

---

## 6. Authorization question

This gate must answer one decision, and it is the question Phase 46Y §16 deferred here:

> **Is the Phase 46Y boundary design (§7–§12) precise enough — against current repo evidence (§5) — to authorize
> a future, separate-PR, bounded, dev/operator-only, disabled-by-default, non-production Mode 2 implementation
> spike, by turning that design into a concrete, checkable authorization checklist?**

This decomposes into authorization questions 3–6:

- **(Q3) What evidence is required before any Mode 2 implementation can be authorized?** — the union of the
  migration-isolation (§8), scope-guard (§9), gate-conjunction (§10), storage-behaviour (§11), and no-leak /
  public-private (§12) checklists. Stated in full there.
- **(Q4) Is current repo evidence sufficient to authorize a later bounded dev/operator-only Mode 2
  implementation spike?** — **Yes, as a checklist-gated authorization.** The evidence (§5) is concrete enough to
  state every proof obligation as a binary, file:line-grounded checklist item. It is **not** sufficient to
  declare Mode 2 implemented, ready, or safe — those are exactly what the future spike must prove against the
  checklist before acceptance.
- **(Q5) If sufficient, what exact future implementation lane is authorized and what may it contain?** — Phase
  47A, the bounded Mode 2 implementation spike, with the narrow file-scope envelope of §13. Stated in full at
  §13 / §18.
- **(Q6) If insufficient, what blocker remains and what future docs/decision lane is required instead?** — the
  documented Verdict-B fallback (§16): a narrower **migration-isolation mechanism selection** gate (pick + review
  separate-dir vs manifest vs naming-exclusion + dev-runner vs env-category) before any implementation. This
  fallback is **not** triggered by this gate, but it is the path the §15 checklist itself forces if Phase 47A
  cannot satisfy migration isolation safely.

The answer (§7) is **Q4 = Yes (checklist-gated)** → Verdict A.

---

## 7. Checklist verdict

> **Verdict A — the Phase 46Y boundary design is sufficient to authorize a future, separate-PR, bounded,
> dev/operator-only, disabled-by-default, non-production Mode 2 implementation spike (Phase 47A),
> *acceptance-gated on the hard checklist in §8–§15*; Mode 2 itself remains unimplemented and is BLOCKED from
> production / Lane-2 / freeze / gate-#8 work in full.**

The authorization is **conditional, mode-contingent, and acceptance-gated**, exactly as the Phase 46U → 46V
precedent established:

- **Conditional.** Phase 47A is authorized to *attempt* a bounded Mode 2 spike. It is **accepted only if it
  proves every item in §8–§15.** Failure to prove migration isolation, the refined-guard model, the
  gate-conjunction, the storage behaviour, or the no-leak boundary is a **checklist failure** → the spike is
  **rejected** and Mode 2 stays blocked.
- **Mode-contingent.** Like 46U (which authorized a spike that could be Mode 1 *or* Mode 2) and 46V (which chose
  Mode 1 *because* Mode 2 tripped the guards), Phase 47A may discover that Mode 2 cannot be done safely under
  the §8–§12 obligations without weakening the production posture. If so, it must fall back (e.g. remain Mode 1)
  or return for the §16 narrower gate. The authorization does **not** force a durable path.
- **Acceptance-gated.** The §15 Codex audit checklist is the gate. Phase 47A is a **separate PR** with its own
  Codex audit; this gate does not pre-approve any specific implementation.

Rejected here: **authorize Mode 2 implementation now** (forbidden by scope — this gate builds nothing); **declare
Mode 2 ready / safe** (it is neither — the spike must prove it); **freeze the route contract or final schema**
(stays draft / non-final); **discharge gate #8** (operatively held — §19). The conservative **Verdict B**
(narrower missing-evidence gate) is the documented fallback (§16), not the chosen verdict, because the checklist
*can* be made precise from current evidence (§1 / §5 / §6).

---

## 8. Required migration-isolation evidence

**Checklist Section A — migration isolation.** A future Mode 2 implementation PR (Phase 47A) is **accepted only
if** it proves **all** of the following. Each is binary and grounded in the actual runner; the mechanism is the
implementer's choice (separate directory, manifest, naming exclusion, separate runner, or equivalent explicit
mechanism — 46Y §8), but **whatever mechanism is chosen must satisfy every item.**

- **A.1** The normal production migration runner **cannot automatically discover or execute** dev/operator
  experimental `aw_*` migrations — proven against `discoverMigrations()` (`migrate.ts:76-85`, whole-directory
  scan of `.sql && !_down`) and `migrate()` apply loop (`migrate.ts:199-240`).
- **A.2** Normal startup `migrate(dbPool)` (`server.ts:301`, inside `if (dbPool)` at `server.ts:299`) **remains
  unchanged, or is explicitly incapable** of adopting experimental Class-E material — no environment, config, or
  default under which the ungated production call adopts an `aw_*` migration.
- **A.3** Dev/operator experimental migration material is **isolated by an explicit mechanism** (separate
  directory the production scan never reads, a manifest / allowlist, a naming-convention exclusion in
  `discoverMigrations()` paired with a separate dev-only runner, an env-gated category, or equivalent) — and the
  mechanism is **named, documented, and tested**, not implicit.
- **A.4** The production copy / packaging path (`copy-migrations.mjs:38-40`, `48-52`) **cannot silently
  include** experimental material — proven the build copy does not sweep Class-E files into `dist/db/migrations/`.
- **A.5** Any experimental runner introduced is **disabled by default** and requires **explicit dev/operator env
  gating** (mirroring the Phase 46V AND-gated, disabled-by-default posture); it is **never** invoked by
  `server.ts:299-301`'s ungated production `migrate(dbPool)` call.
- **A.6** **No production migration execution is authorized** — Class-E writes are dev/operator-only,
  disabled-by-default, non-production; no production write path is opened.
- **A.7** A **rollback / drop / tombstone / cleanup path exists** for any synthetic dev/operator objects,
  including the operational procedure to run it (the forward-only runner will not auto-run a `_down` file —
  `migrate.ts:79`).

---

## 9. Required scope-guard evidence

**Checklist Section B — scope guards.** Phase 47A is **accepted only if** it proves **all** of the following,
against the Phase 33N guards (`scope-guards.test.ts`) and the refined-guard model (46Y §10):

- **B.1** Phase 33N-style guards are **replaced / refined narrowly, not weakened broadly** — the blanket guard
  is replaced by narrow allowlisted paths + negative guards; no denylist entry or import rule is simply removed
  for the whole surface.
- **B.2** Raw SQL imports remain blocked **outside** the narrow isolated surface.
- **B.3** Normal DB-runner coupling remains blocked (`/db/(client|pool|migrate|transaction)`, bare `pg` —
  `scope-guards.test.ts:185-198`) outside the narrow surface.
- **B.4** Production-store claims remain blocked.
- **B.5** Public response expansion remains blocked.
- **B.6** Unsafe storage imports remain blocked (any `/-store(\.js)?$/`, `BoundedEstateStore` —
  `scope-guards.test.ts:191-194`) outside the narrow surface.
- **B.7** Runtime route mounting outside the explicit AND-gated, disabled-by-default gates remains blocked.
- **B.8** Any new positive allowlist is **specific to the authorized Mode 2 module / path** (a named module),
  not a broadening of the existing blanket guard.
- **B.9** Negative guard tests prove forbidden paths **fail closed**, against the **same evasion-resistance bar**
  as today (`scope-guards.test.ts:231-313` — strings, nested templates, regex char classes, real comment / JSDoc
  stripping).

---

## 10. Required gate-conjunction evidence

**Checklist Section C — gate conjunction.** Phase 47A is **accepted only if** it proves **all** of the
following, citing **both** gates (see the §5.4 grounding note):

- **C.1** The **base Admission Wedge route gate** remains disabled by default — `admissionIntakeSpikeEnabled` ←
  `DIXIE_ADMISSION_INTAKE_ENABLED === 'true'` (`config.ts:428`), gating the outer mount (`server.ts:651`); no
  production default.
- **C.2** The **storage gate** remains disabled by default — `admissionIntakeStorageSpikeEnabled` ←
  `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED === 'true'` (`config.ts:442-443`), gating the inner block
  (`server.ts:674`); no production default.
- **C.3** Storage **cannot activate from the storage gate alone** — the inner storage block (`server.ts:674`) is
  nested inside the outer route gate (`server.ts:651`), so the storage gate is never even reached unless the
  base route gate is already true.
- **C.4** Storage **cannot activate from the base route gate alone** — with the storage gate off, the inner
  storage block (`server.ts:674`) never runs and the `routeStorageSpikeDeps` default stays the empty `{}`
  (`server.ts:668-673`), so no store is created and no store deps are injected (the behaviour the comment at
  `server.ts:662-664` documents); the route stays the no-store Option A path.
- **C.5** Storage engages **only on the conjunction of both gates** — proven by a registration / AND-gating test
  (the existing Phase 46V tests already assert this for Mode 1; Mode 2 must preserve it).
- **C.6** **No production defaults enable either gate** — both env reads default to `false` (`config.ts:428`,
  `442-443`).

---

## 11. Required storage-behavior evidence

**Checklist Section D — storage behaviour.** Phase 47A is **accepted only if** it proves **all** of the
following, against the storage boundary model (46Y §9) and the Phase 46V Mode 1 semantics:

- **D.1** **Route-owned storage only** — Dixie owns endpoint-local contract / idempotency / replay records,
  ingress references, and the public / private projection; **never** a parallel canonical lifecycle.
- **D.2** **Dev/operator-only synthetic data only** — no request-derived or production identity binding; fixed
  synthetic constants (cf. Phase 46V `server.ts:683-687`).
- **D.3** **No raw candidate payload persistence** — only synthetic, bounded, route-owned records.
- **D.4** **No public response body expansion** — the public envelope stays the fixed allowlist.
- **D.5** **Tenant / estate / actor isolation** — structural (separate closures / scoping), proven by tests.
- **D.6** **Idempotent replay behaviour** — repeated identical writes do not duplicate or diverge.
- **D.7** **Conflict fail-closed behaviour** — a conflicting write is rejected, not silently overwritten.
- **D.8** **Storage throw fails closed to a stable public refusal** — a store fault never leaks an internal
  error or partial state onto the wire.
- **D.9** **Bounded capacity and cleanup** — rejection-not-eviction at the cap; a working drop / cleanup path.
- **D.10** **No cross-tenant leakage.**
- **D.11** **No unsafe scope-accessor / TOCTOU regression** — the Phase 46V `snapshotActorId` discipline (read
  the actor id once, validate, key all access off the local) is preserved or strengthened.
- **D.12** **Public / private no-leak boundary preserved** (see §12).

---

## 12. Required no-leak / public-private evidence

**Checklist Section N — no-leak / public-private boundary.** This is the no-leak continuation of Section D;
its items carry the canonical `N.x` prefix referenced by §6 Q3 and the §15 Codex checklist. Phase 47A is **accepted only
if** it proves **all** of the following, against the runtime no-leak guard (`no-leak.ts`) at **114 = 114**
parity:

- **N.1** Persisted **and** replayed public responses **deep-walk the same as a fresh response** and pass the
  **114-key** no-leak guard (`no-leak.ts`; `no-leak.test.ts:95`) — store record ids, private audit fields,
  receipt refs, signer / consent internals, and synthetic actor ids **never** appear on the wire.
- **N.2** The public body **does not expand** without a separate no-leak proof; the fixed allowlist holds.
- **N.3** Private `TransitionReceipt` / `AuditEvent` / consent proof / storage material **remains private** —
  store results are not serialized onto the public surface.
- **N.4** The **114 = 114** runtime ↔ validator parity is **preserved** (a future durable serializer cannot
  surface a canonical ref / hash / consent field under a short, safe-looking value that would slip the
  value-pattern walls).
- **N.5** Lane-2 canonical Straylight-store migrations remain **blocked** — no Dixie migration authority over
  canonical `Assertion` / `TransitionReceipt` / `AuditEvent` records; each canonical migration stays a separate
  sibling-repo ADR under Straylight teammate review (ADR-022D §7; 46N). The operative Straylight-side ADR-022E
  gate #8 discharge **remains held** (a Dixie phase cannot discharge it).

---

## 13. Future implementation file-scope envelope

This section answers **authorization questions 8 and 9 — what a future implementation lane may touch, and what
remains forbidden regardless.** It applies to the **Phase 47A implementation PR only**, not to this Phase 46Z
gate (which touches nothing but this doc + two §20 notes).

### 13.1 Potentially allowed in the Phase 47A implementation PR only (not in this gate)

- A **narrowly scoped source module** for Mode 2 storage under
  `app/src/services/admission-wedge-spike/` **or** an equivalent route-owned Admission Wedge spike module
  placed per the refined-guard model (46Y §9 / §10).
- **Narrowly scoped route wiring** in `app/src/server.ts` / `app/src/routes/admission-intake.ts` **only behind
  the existing disabled-by-default AND-gated gates** (`server.ts:651` outer + `server.ts:674` inner).
- **Isolated dev/operator migration material** **only if** the accepted isolation mechanism (§8) provably
  prevents production-runner adoption (A.1–A.7) — e.g. in a separate directory the production scan never reads.
- An **env-gated, disabled-by-default dev/operator migration runner** (if the chosen mechanism uses one),
  never invoked by `server.ts:299-301`.
- **Tests** proving guard (§9), isolation (§8), gate conjunction (§10), storage behaviour (§11),
  replay / conflict / fail-closed, no-leak (§12), and tenant / estate / actor isolation.
- **Runbook docs** for dev/operator-only operation, including the rollback / drop / cleanup procedure (A.7).
- A **config field** for any new dev/operator env gate, defaulting to `false` (mirroring `config.ts:442-443`).

### 13.2 Still forbidden in the Phase 47A implementation PR (regardless)

- **Production migration runner changes** to `migrate.ts` / `server.ts:299-301` **unless explicitly justified
  and still fail-closed** — a justified change must keep production discovery / execution incapable of adopting
  Class-E material (A.1 / A.2).
- **Normal production migration files** (Class-P additions are out of scope for the Mode 2 spike).
- **Production DB writes.**
- **Production durable-store implementation.**
- **Lane-2 canonical Straylight-store migrations** (Class-C — blocked behind gate #8).
- **Auth / consent production implementation.**
- **Freeside runtime / client integration.**
- **Package exports** (the spike stays an internal service barrel — `scope-guards.test.ts:315-337`).
- **Route-contract freeze** (`route_contract_final` stays false).
- **Final schema freeze** (`schema_final` stays false).
- **Production readiness claims.**
- **Discharge of the operative Straylight-side ADR-022E gate #8.**

---

## 14. Future implementation validation matrix

This section answers **authorization question 10 — what validation matrix a future implementation lane must
satisfy.** Phase 47A is **accepted only if** all of the following hold (in addition to the §8–§12 proofs):

- **Full unit + integration suite green**, including new Mode 2 tests for migration isolation (§8),
  scope-guard refinement (§9), gate conjunction (§10), storage behaviour + replay / conflict / fail-closed
  (§11), and no-leak over persisted / replayed surfaces (§12).
- **Typecheck + lint clean.**
- **Route-vector validator still `5/5`, no sixth vector** —
  `node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`.
- **Route-vector self-check still `44/44`** (or the then-current expected equivalent) —
  `… validate-route-contract-test-vectors.mjs --self-check`.
- **Fixture validator still `5/5`** — `node docs/admission-wedge/fixtures/validate-fixtures.mjs`.
- **No-leak runtime parity preserved at `114 = 114`** (`no-leak.test.ts`).
- **No production readiness / freeze / ADR-022E-discharge overclaim** in any doc or code comment the PR adds.
- **A separate Codex audit** (§15) is run on the PR and returns ACCEPT.

---

## 15. Codex audit checklist for the later implementation PR

This section answers **authorization question 7 — the exact Codex audit checklist for the later implementation
PR.** It is a checklist for a **future** audit on the Phase 47A PR, **not** an audit run here. Copy it verbatim
into the Phase 47A audit.

```text
PHASE 47A — MODE 2 IMPLEMENTATION-SPIKE CODEX AUDIT CHECKLIST
(every item must be ACCEPT; any REJECT blocks the spike and Mode 2 stays blocked)

[ ] 1.  Branch / scope: changes confined to the authorized Mode 2 spike surface (§13.1);
        no unexpected file classes.
[ ] 2.  No unexpected file classes: no production migration file, no production DB write,
        no package export, no route-contract freeze, no final schema freeze (§13.2).
[ ] 3.  Implementation lane was explicitly authorized by Phase 46Z (this gate) — and only
        the named module(s) / mechanism(s) are touched.
[ ] 4.  Migration isolation — ACTUAL PROOF: the chosen mechanism (separate dir / manifest /
        naming exclusion + dev runner / env category) is named, documented, and tested (A.3).
[ ] 5.  Normal production runner cannot adopt experimental aw_* migrations — proven against
        discoverMigrations() (migrate.ts:76-85) and migrate() (migrate.ts:199-240) (A.1).
[ ] 6.  Normal startup migrate(dbPool) (server.ts:301, inside if(dbPool) server.ts:299) is
        unchanged or explicitly incapable of adopting Class-E material (A.2).
[ ] 7.  Packaging / copy path (copy-migrations.mjs:38-40,48-52) cannot silently include
        experimental migrations (A.4).
[ ] 8.  Both gates must be enabled for storage to engage — cite BOTH the outer base route gate
        (server.ts:651, config.ts:428) AND the inner storage gate (server.ts:674,
        config.ts:442-443) (C.1–C.6).
[ ] 9.  No gate alone can activate storage: storage gate alone (C.3) and base route gate alone
        (C.4) both leave storage inert.
[ ] 10. No raw candidate payload persistence (D.3); only synthetic, bounded, route-owned records.
[ ] 11. Public response unchanged: fixed allowlist, no body expansion (D.4 / N.2).
[ ] 12. No-leak preserved: persisted + replayed responses pass the 114-key guard (no-leak.ts;
        no-leak.test.ts:95); 114 = 114 parity intact (N.1 / N.4).
[ ] 13. Tenant / estate / actor isolation proven (D.5 / D.10).
[ ] 14. Replay / idempotency / conflict fail-closed proven (D.6 / D.7 / D.8).
[ ] 15. Bounded capacity / cleanup: rejection-not-eviction, a working drop / down / tombstone
        path + runbook (D.9 / A.7).
[ ] 16. Negative scope-guard tests: the refined guard still fails on raw SQL, production
        migration files, normal DB-runner coupling, public response expansion, unsafe storage
        imports, runtime mounting outside explicit gates, and unbounded / production storage
        claims — against the same evasion-resistance bar (scope-guards.test.ts:231-313) (B.1–B.9).
[ ] 17. Route-vector validator still 5/5, no sixth vector.
[ ] 18. Route-vector self-check still 44/44 (or current expected equivalent).
[ ] 19. Fixture validator still 5/5.
[ ] 20. No production-readiness / freeze / ADR-022E-discharge overclaim in any added doc or comment.
[ ] 21. No unsafe scope-accessor / TOCTOU regression (the snapshotActorId discipline holds) (D.11).
[ ] 22. Lane-2 canonical Straylight-store migrations remain blocked; gate #8 remains held (N.5).
```

---

## 16. Options considered

Each option is enumerated and evaluated, not implemented.

### Option A — Verdict A: accept the boundary design as sufficient; authorize a checklist-gated Phase 47A spike. **SELECTED.**

- **Would authorize.** A future, **separate-PR**, bounded, dev/operator-only, disabled-by-default,
  non-production Mode 2 implementation spike (Phase 47A), **acceptance-gated** on §8–§15. Authorizes **no**
  implementation in this PR.
- **Still blocks.** Mode 2 itself (unimplemented), production durable storage, production DB writes, production
  migration execution, Lane-2 canonical migrations, guard / runner edits, freezes, gate #8.
- **Risks.** Low–medium, and bounded by the checklist: the authorization is conditional and mode-contingent, so
  if Phase 47A cannot satisfy migration isolation safely it must fall back (as 46V did) or return for Option B.
- **Verdict.** **SELECTED (§7 / §17 / §18).** The §5 evidence is concrete enough to state every proof obligation
  as a binary, file:line-grounded checklist; the 46U → 46V precedent shows a checklist-gated, mode-contingent
  authorization is safe.

### Option B — Verdict B: keep Mode 2 implementation blocked; select a narrower missing-evidence gate. **Documented fallback, not selected.**

- **Would authorize.** A narrower **migration-isolation mechanism selection** gate (pick + security-review
  separate-dir vs manifest vs naming-exclusion + dev-runner vs env-category) before any implementation.
- **Still blocks.** Everything Option A blocks, plus the implementation spike itself.
- **Risks.** Low, but over-defers: the checklist *can* be made precise without pre-selecting the mechanism (the
  obligations are mechanism-agnostic — §8), so an extra gate adds a rung without new safety.
- **Verdict.** **Not selected — retained as the fallback.** It is exactly the path the §15 checklist forces if
  Phase 47A cannot prove migration isolation safely; it is not needed *before* authorizing the checklist-gated
  spike.

### Option C — Authorize Mode 2 implementation now (in this PR).

- **Risks.** Disqualifying. This gate is docs/decision-only; implementing Mode 2 here would build a store,
  add a migration, and edit a guard — all forbidden by scope.
- **Verdict.** **REJECTED.**

### Option D — Do nothing / re-state the design with no decision.

- **Risks.** Low, but advances nothing — Phase 46Y already invested the design; converting it to a checklist and
  deciding the authorization question is the cheapest next artifact.
- **Verdict.** **Not selected.**

---

## 17. Decision

Phase 46Z **converts the Phase 46Y boundary design (§7–§12) into the hard, file:line-grounded
implementation-authorization checklist of §8–§15**, and **decides that the design is sufficient to authorize a
future, separate-PR, bounded, dev/operator-only, disabled-by-default, non-production Mode 2 implementation spike
(Phase 47A), acceptance-gated on that checklist** (Verdict A, Option A).

This is **future-only** and **not implemented by this phase**. The authorized spike is **dev/operator-only**,
**disabled-by-default**, **non-production**, **synthetic-only**, **route-owned storage only**, with **no
production migration execution**, **no final schema freeze**, and **no route-contract freeze**. Phase 46Z
authorizes nothing beyond a checklist-gated future lane and selecting it (§18). It does **not** make Mode 2
implementation-ready, does **not** implement durable storage, does **not** discharge any Straylight-side
production gate, does **not** claim `aw_*` migrations are safe (a future implementation must prove the §8–§12
isolation / guard / gate / storage / no-leak evidence), and implies **no** change to the normal migration
runner.

**Non-authorizations and invariants preserved** (carried forward unchanged):

- **A pending candidate is not recallable.**
- **A rejected candidate creates no admitted assertion.**
- **An accepted candidate creates / references an admitted assertion.**
- **A superseded assertion is excluded from ordinary recall** unless explicitly requested / marked.
- **A malformed / unsafe payload fails closed.**
- **Missing / unauthorized auth fails closed; missing / invalid consent fails closed** in any future production
  admission model.
- **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
  material**; private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private.
- **User chat does not become memory merely because it was said.**
- **Public `remember-this`, Discord / freeform ingestion, and production admission / storage / auth / consent
  remain blocked.**
- **`active` remains the canonical assertion status, not a public `outcome_class`; `recall_eligible` remains
  derived / projection-only.**

---

## 18. Next lane

> **Selected next lane: Phase 47A — Admission Wedge Mode 2 dev/operator isolated route-storage implementation
> spike (a *separate* implementation PR, acceptance-gated on the §8–§15 checklist).**

Phase 47A, if it runs, would be a separate implementation PR and must remain:

- dev/operator-only;
- disabled by default;
- non-production;
- synthetic-only;
- route-owned storage only;
- isolated from normal production migration execution;
- fail-closed;
- bounded capacity;
- no public response expansion;
- no raw candidate payload persistence;
- no route-contract freeze;
- no final schema freeze;
- no production readiness;
- no Freeside runtime / client integration;
- no ADR-022E gate #8 discharge.

**It must pass the full §15 Codex audit checklist and the §14 validation matrix before acceptance.** If Phase
47A finds it cannot satisfy the §8 migration-isolation obligations without weakening the production safety
posture, it must **fall back** (e.g. remain Mode 1) or **return for the §16 Option B narrower
migration-isolation mechanism selection gate** — and **Mode 2 stays blocked** in that case.

**Not selected:** direct production implementation; production durable-store implementation; production DB
writes or migration execution; Mode 2 implementation **in this PR** (this gate builds nothing — §1 / §17). A
production durable-store lane, Lane-2 canonical migrations, and the operative Straylight-side gate #8 discharge
remain blocked regardless of Phase 47A (§19).

---

## 19. Preserved blocked lanes

This section answers **authorization question 11 — what remains blocked even after this authorization
checklist.** Regardless of verdict, the following remain **blocked** after Phase 46Z:

- **Mode 2 implementation itself** — unimplemented; only a checklist-gated future lane (Phase 47A) is authorized
  (§18), and it remains acceptance-gated and mode-contingent;
- production durable-store implementation;
- production DB writes;
- production migration execution;
- **Lane-2 canonical Straylight-store migrations** — each a separate sibling-repo ADR under Straylight teammate
  review (ADR-022D §7); the operative Straylight-side ADR-022E gate #8 discharge **remains held** (46N: a Dixie
  docs-only phase cannot, by itself, discharge it);
- production admission;
- public `remember-this`;
- Discord / freeform ingestion;
- user chat becoming memory merely because it was said;
- Freeside runtime / client integration;
- package exports (unless separately justified and audited);
- LLM / voice / Finn wiring;
- MVP 3 forget / revoke / correction UI;
- **route-contract freeze**;
- **final schema freeze**;
- production readiness;
- production signer / auth / consent (the dev/operator service-token / operator model is **not** production auth
  and is **not** consent; missing / invalid consent fails closed in any future production model).

**Candidate D / ADR-022E boundary preserved.** Candidate D (split-storage) remains **proposal input / design
baseline, not implemented production architecture**; Phase 46N's gate #8 clearing remains a **bounded Dixie
documentation / architecture / handoff prerequisite only**; the operative Straylight-side discharge remains
blocked unless separately evidenced (no such accepted evidence exists at authoring time).

---

## 20. Non-authorizations

Phase 46Z authorizes nothing beyond converting the Phase 46Y boundary design into a hard checklist, deciding
that the design is sufficient to authorize a **checklist-gated, separate-PR** future Mode 2 implementation
spike, and selecting that lane. It explicitly does **not** authorize, and is **not** to be read as authorizing:

- Mode 2 implementation **in this PR** (this gate is **docs/decision-only**, **builds nothing**, and authorizes
  only a **future separate** lane);
- any unconditional Mode 2 implementation (Phase 47A is **acceptance-gated** on §8–§15 and **mode-contingent**);
- production durable-store implementation;
- production DB writes;
- production migration execution;
- any change to the normal migration runner (`migrate.ts`) or its packaging (`copy-migrations.mjs`) **in this
  PR** (a future justified, fail-closed change is a §13 / §15 obligation on Phase 47A, not an authorization
  granted here);
- any weakening, editing, addition, or removal of a scope guard (`scope-guards.test.ts`) **in this PR** — the
  refined-guard model stays **paper design**;
- Lane-2 canonical Straylight-store migrations or the discharge of the operative Straylight-side ADR-022E gate
  #8;
- production admission, production signer / auth / consent;
- a route-contract freeze or a final schema freeze;
- Freeside runtime / client integration;
- any production readiness claim.

Explicitly, this gate does **not** say Mode 2 is now implemented, does **not** say Mode 2 is implementation-ready
beyond a checklist-gated attempt, does **not** say durable production storage is designed, does **not** say the
Straylight-side production gates are discharged, does **not** say `aw_*` migrations are safe until an
implementation proves isolation, and does **not** imply normal migration runner changes were made. No test is
claimed to exist that does not exist in the repo; the §8–§12 isolation tests, dev-only runner, narrow guard, and
durable substrate are **future-only** and are **not present in the repo** at authoring time.

---

## 21. Validation

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 46Z is
docs/decision-only — it adds only this document (plus the two minimal forward-traceability status notes below)
and mutates no runtime source, test, validator, vector, fixture, migration, or SQL file — so the validators are
run only to confirm the unchanged artifacts remain green.

```bash
git status --short --branch --untracked-files=all
git diff --name-status
git diff --stat
git diff --check
git diff --cached --name-status
git diff --cached --check
# Unchanged-artifact green-checks (no mutation in this phase):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# New-untracked-doc whitespace check (no-index; `|| true` because a clean file is fine):
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md || true
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md
# Scope proof — no source/test/migration/sql/config/package/CI/generated/binary file changed:
git diff --name-only HEAD -- app/ src/ '*.sql' '*.json' '*.lock' '*.yml' '*.yaml' package.json
# Overclaim scan — no production/freeze/implementation overclaim:
grep -RInE '46Z implements|46Z implemented|this PR implements|production ready|route-contract freeze|final schema freeze|ADR-022E.*discharged|current aw_\* migrations are safe|Mode 2 is implemented' docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md || true
```

**Recorded results for this lane** (run during authoring):

- **docs-only scope** — only the new file
  `docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md` is added, plus the
  two minimal forward-traceability status notes (§20 list below); no runtime source (and specifically not
  `migrate.ts`, `copy-migrations.mjs`, any `*.sql`, `route-storage-spike.ts`, `no-leak.ts`, `config.ts`,
  `admission-intake.ts`, `server.ts`, or `scope-guards.test.ts`), no runtime test, no route-vector JSON,
  validator, README, fixture, fixture validator, `app/`, `src/`, `tests/`, package / lockfile, config / env, CI,
  migration, SQL, executable schema, or generated file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth
  vector**; the `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail
  closed; 2 exact-key non-over-match guards stay clean);
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–21 exactly once
  each;
- **overclaim scan** — no positive implementation / production-readiness / freeze / gate-#8-discharge claim is
  present (only negated disclaimers, which are permitted).

**Corruption / duplicate guard** (carried from the 46I–46Y precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 21.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token,
  a trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the two fenced blocks are the §15 Codex
  checklist (a `text` block) and the §21 validation command list. **No fenced block is an executable migration
  or runnable schema.**

**Two minimal forward-traceability status notes added by this gate** (no other document is modified):

- [`docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md)
  — Phase 46Y (PR #170), the **selecting predecessor**: its §16 named this lane. **Gains a minimal Phase 46Z
  status note.**
- [`docs/admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-46V-ROUTE-STORAGE-SPIKE-RUNBOOK.md)
  — Phase 46V (PR #167), the implementation whose source header names the blocker (`route-storage-spike.ts:
  9-15`). **Gains a minimal Phase 46Z status note.**
