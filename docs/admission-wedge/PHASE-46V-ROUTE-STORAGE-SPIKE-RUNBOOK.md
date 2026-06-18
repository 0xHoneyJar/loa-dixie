# Phase 46V — Admission Wedge dev/operator-only route-storage spike: enable/disable runbook

> **Phase 46W acceptance note (added later).** This Phase 46V Mode 1 route-storage spike was **ACCEPTED** as a
> bounded dev/operator-only, non-production spike proof by Phase 46W
> ([`../ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md`](../ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-ACCEPTANCE-GATE.md),
> docs/decision-only) — **Verdict A**. Acceptance is bounded: it confirms the spike proof only and authorizes
> **no** production storage / DB writes / migration execution, no Lane-2 canonical-store migration, and no
> operative Straylight-side gate discharge. The next lane is **Phase 46X — Mode 2 durable-route-storage
> enablement blocker decomposition (docs/decision-only)**.
>
> **Phase 46X decomposition note (added later).** Phase 46X
> ([`../ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md`](../ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-BLOCKER-DECOMPOSITION-GATE.md),
> docs/decision-only) decomposed the Mode 2 blocker this spike's header names
> (`app/src/services/admission-wedge-spike/route-storage-spike.ts:9-15`) — the global migration runner adopting
> any new migration into the production set, and the Phase 33N scope guards forbidding durable-write / SQL /
> migration tokens — and reached **Verdict A**: **Mode 2 remains BLOCKED**; the blocker is decomposed into
> required future gates. Phase 46X selects only a **docs/decision-only Phase 46Y migration-isolation /
> scope-guard boundary design lane** next; it authorizes **no** Mode 2 implementation, durable storage,
> migration, or production work.
>
> **Phase 46Y design note (added later).** Phase 46Y
> ([`../ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md`](../ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-MIGRATION-GUARD-DESIGN-GATE.md),
> docs/decision-only) designed the migration-isolation / scope-guard boundary on paper and reached **Verdict A**:
> it **accepts** the four-class migration classification model (P / E / T / C), the migration-isolation
> requirements, the route-owned storage boundary model, and the refined / replacement scope-guard model as a
> **docs-only precondition**, while **Mode 2 remains BLOCKED pending a later authorization gate**. It selects
> only a **docs/decision-only Phase 46Z implementation-authorization checklist lane** next. It edits no guard
> or migration runner and authorizes **no** Mode 2 implementation, durable storage, migration, or production
> work.
>
> **Phase 46Z checklist note (added later).** Phase 46Z
> ([`../ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](../ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md),
> docs/decision-only) turned the Phase 46Y boundary design into a hard, file:line-grounded
> implementation-authorization checklist and reached **Verdict A**: the design is sufficient to authorize a
> future, **separate-PR**, bounded, dev/operator-only, disabled-by-default, non-production Mode 2 implementation
> spike (**Phase 47A**), **acceptance-gated** on that checklist and **mode-contingent** (Phase 47A may fall back
> to Mode 1, as this Phase 46V spike did, if Mode 2 cannot satisfy migration isolation safely). Mode 2 itself
> **remains unimplemented**; this gate builds nothing, executes no migration, and discharges no Straylight-side
> gate. Production durable storage, Lane-2 canonical migrations, freezes, and the operative ADR-022E gate #8
> remain blocked.

> **Status:** dev/operator-only **route-storage** spike. **Draft / non-final.**
> **Disabled by default.** **NON-PRODUCTION.** Uses **Storage Mode 1** —
> no-migration, bounded-synthetic, **in-process** route-owned storage: no
> database, **no durable write**, **no migration**. Its synthetic state lives in
> JS `Map`s in a factory closure and is lost on restart (no recallable residue).
>
> Authorized **narrowly** by Phase 46U
> ([`../ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md`](../ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md)
> §3–§16). This spike does **not** authorize production storage, production DB
> writes, production migration execution, production admission, production
> auth/consent, public `remember-this`, Discord / freeform ingestion,
> chat-as-memory, Freeside runtime/client integration, a route-contract freeze, or
> a final schema freeze. It claims **no** production readiness and discharges
> **no** operative Straylight-side gate.

## What it is

A bounded, process-local, **non-durable**, tenant/estate/**actor**-scoped
route-owned store wired behind the existing `POST /api/admission/intake`
dev/operator route. When enabled (both gates below), an `accept` / `supersede`
records the **same** fixed synthetic transition the route already derives — built
from constants, never from request material — into the store, so the candidate →
admitted-assertion → recall transition's *stateful effect* can be exercised over
**synthetic material only**. The store's records and ids are **never** surfaced in
the public body; the public response is byte-identical to the no-store path.

Storage **Mode 1** was chosen over Mode 2 (durable + Lane-1 `aw_*` migrations)
because the Phase 33N scope guards forbid any durable-write / SQL / migration
token or production-store import in the spike path, and the repo's global
migration runner would adopt any new migration into the **production** set — so a
durable mode cannot be added without weakening an existing security guard. Mode 1
proves the route-owned storage semantics with the lowest blast radius (Phase 46U
§6 / §7).

It adds the **third** isolation dimension (actor) over the Phase 33Q ledger by
holding one independent bounded ledger per synthetic actor, so one actor's records
are structurally unreachable from another's.

## Default (off)

Two **independent** gates, **both** required:

- `DIXIE_ADMISSION_INTAKE_ENABLED` (the existing base route gate) — with it unset
  or not exactly `"true"`, the route is **not registered at all**.
- `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED` (the **draft / non-final** Phase
  46V storage gate) — with it unset or not exactly `"true"`, the route runs the
  **no-store** path verbatim (Phase 33N behavior; current behavior unchanged).

The storage spike **never** activates on the base route gate alone. With the
storage gate set but the base gate off, the route is not mounted and the storage
spike does nothing.

## Enable (dev/operator only)

```bash
# Required to mount the route at all (existing base gate).
export DIXIE_ADMISSION_INTAKE_ENABLED=true

# Required to engage the route-storage spike (DRAFT / non-final name).
export DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED=true

# Dev/operator credential gate (unchanged): a service token, an operator-id
# allowlist, or BOTH. With BOTH empty, the enabled route rejects ALL calls.
export DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN='<synthetic-dev-operator-token>'
export DIXIE_ADMISSION_INTAKE_OPERATOR_IDS='op-alice,op-bob'
```

`DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED` is a **draft / non-final** name
(Phase 46U §5). Do **not** commit real tokens/ids — provide them via env/secret.
The dev/operator credential is **not** production auth and is **not** consent.

## Disable / rollback / kill switch

Unset `DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED` (or set it to anything other
than `"true"`) and restart — the route reverts to the no-store path with **no**
durable state to roll back (Mode 1 persists nothing). Unset
`DIXIE_ADMISSION_INTAKE_ENABLED` to remove the endpoint entirely.

Within a running process, the store exposes a reversible **tombstone** cleanup
path: tombstoning a synthetic actor releases its state, after which the actor is
not recallable (empty projection / zero footprint / empty audit) and further
writes fail closed — no recallable residue. Because nothing is durable, a process
restart is itself a complete reset.

## Failure / capacity posture

- **degraded / failed store** → fail closed: any store throw (capacity / scope /
  conflict / tombstoned actor) collapses the request to the stable public-safe
  refusal (`400 ingress.invalid_request`), leaving the store exactly as it was
  (atomic; no partially-admitted / recallable residue) and leaking neither the
  error nor any id;
- **capacity** → bounded **rejection**, never eviction: a per-store actor cap and
  per-estate assertion-count / byte budgets; inserts beyond budget fail closed;
- **disabled / unauthorized** → safe: a disabled spike leaks nothing; an
  unauthorized caller gets a stable refusal that never reveals which gate failed.

## No-leak guarantee

Unchanged from Phase 33N: every public response is built purely from the
classified scenario plus fixed synthetic placeholders, then deep-walked by the
runtime no-leak guard (the 114-key `FORBIDDEN_PUBLIC_KEYS` + substring / regex /
UUID / opaque-run walls). Persisted and replayed public responses are deep-walked
exactly like a fresh one; store record ids, private audit fields, receipt refs,
and the synthetic actor id never appear on the wire.
