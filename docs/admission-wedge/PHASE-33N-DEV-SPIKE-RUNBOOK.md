# Phase 33N — Admission Wedge dev/operator-only route spike: enable/disable runbook

> **Status:** dev/operator-only route **spike**. **Disabled by default.**
> **NON-PRODUCTION.** Uses **Storage Option A** — no durable Admission Wedge
> storage, no database writes, no migrations; safe future-intent receipts /
> public-safe outcomes only.
>
> Authorized **narrowly** by Phase 33M
> ([`../ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md`](../ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md)
> §7–§15). This spike does **not** authorize production admission, production
> storage/auth/consent, Freeside runtime/client integration, Discord ingestion,
> user chat becoming memory, a public `remember-this`, a final schema, or a
> completed Straylight primitive review.

## What it is

A single dev/operator-only route at `POST /api/admission/intake`, distinct from
the live `POST /api/recall/intake` seam. When enabled and authorized, it returns
a deterministic, public-safe outcome for one of the five Phase 33L route-contract
scenarios (pending / accept / reject / supersede / malformed). It mints nothing
durable.

## Default (off)

With `DIXIE_ADMISSION_INTAKE_ENABLED` unset or not exactly `"true"`, the route is
**not registered at all** — there is no `/api/admission/intake` endpoint.

## Enable (dev/operator only)

Set the env gate and **at least one** dev/operator credential gate. With the
gate enabled but **both** credential gates empty, the route rejects **all** calls
(fail-closed; no production default).

```bash
# Required to mount the route at all.
export DIXIE_ADMISSION_INTAKE_ENABLED=true

# Provide a dev/operator service token, an operator-id allowlist, or BOTH.
# (If BOTH are set, BOTH must match on each request.)
export DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN='<synthetic-dev-operator-token>'
export DIXIE_ADMISSION_INTAKE_OPERATOR_IDS='op-alice,op-bob'
```

Do **not** commit real tokens/ids — provide them via env/secret. The token is a
synthetic dev/operator credential; it is **not** production auth and carries no
production signer/authority semantics.

## Disable / rollback

Unset `DIXIE_ADMISSION_INTAKE_ENABLED` (or set it to anything other than
`"true"`) and restart. Because the spike uses **Storage Option A (no durable
storage)**, there is **no durable state to roll back** — disabling fully removes
the endpoint.

## Calling it (dev/operator example)

The body carries only a synthetic non-production marker and the draft transition
discriminator (one of the five Phase 33L `transition_intent` values). No
free-form memory/candidate payload is accepted; any other shape fails closed.

The dev/operator service token is presented in a **dedicated**
`x-admission-service-token` header (NOT `Authorization`) so it does not collide
with the global `/api/*` allowlist/JWT gate, which is not exempt for
`/api/admission`. Note the route also sits behind that global allowlist gate, so
a real (non-test) caller must additionally satisfy the allowlist (e.g. a JWT
wallet or `Bearer dxk_` api key) — the dev/operator gate is layered on top.

```bash
curl -sS -X POST http://localhost:3001/api/admission/intake \
  -H 'content-type: application/json' \
  -H 'x-admission-service-token: <synthetic-dev-operator-token>' \
  -H 'x-admission-operator-id: op-alice' \
  -d '{"spike":"admission_intake_dev_spike_v0","transition_intent":"admit_assertion_accept_draft"}'
```

| `transition_intent` | Scenario | Public outcome | Recall-eligible |
|---------------------|----------|----------------|:---------------:|
| `none_candidate_write_only_draft` | A pending | `accepted_as_proposed` (200) | no |
| `admit_assertion_accept_draft` | B accept | `admitted` (200) | yes (future-intent, draft) |
| `admit_assertion_deny_draft` | C reject | `denied` (200) | no |
| `supersede_with_correction_draft` | D supersede | `superseded_with_correction` (200) | yes (corrected active only) |
| `none_refused_at_ingress_before_transition_draft` | E malformed | `refused` (400, `ingress.invalid_request`) | no |

Anything else (missing marker, unknown intent, extra keys, free-form payload,
invalid JSON) fails closed with `400 ingress.invalid_request`. A disabled spike
returns a safe disabled refusal; an unauthorized caller returns a safe
`403 admission.unauthorized_dev_operator`.

## No-leak guarantee

Every public response is built purely from the classified scenario plus fixed
synthetic placeholders, then deep-walked by a runtime no-leak guard that mirrors
the Phase 33L route-contract validator denylist. Public responses carry no raw
candidate payload, source material, tokens, operator ids, idempotency keys,
UUIDs, long opaque ids, stack traces, or storage internals.
