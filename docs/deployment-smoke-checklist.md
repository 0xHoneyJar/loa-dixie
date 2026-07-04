# Deployment Smoke Checklist

Production-like smoke evidence for the documented deployment surface (#245).
App tests passing is not deployment evidence — this checklist covers the
wiring that only shows up against a running stack.

## How to run

The advisory workflow **E2E Smoke Tests (Advisory)** (`.github/workflows/e2e.yml`)
runs this procedure automatically on PRs touching `app/`, `deploy/`, or
`tests/e2e/` — it is `continue-on-error: true` because it needs live staging
infrastructure (PostgreSQL, Redis, NATS, loa-finn) and will fail in a
CI-only context. For real evidence, trigger it via `workflow_dispatch` when
staging is available, or run locally:

```bash
cp .env.example deploy/.env.staging   # then fill real staging values
docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging up -d --wait
cd app && npm run test:e2e
```

## Checklist (attach output to release PRs)

| # | Check | Command / source | Pass criteria |
|---|-------|------------------|---------------|
| 1 | Compose stack converges | `docker compose ... up -d --wait` | all services healthy |
| 2 | Health | `curl -sf $BASE/api/health` | `"status": "healthy"`; `loa_finn` reachable; postgres/redis/nats healthy |
| 3 | Governance health | `curl -sf -H "Authorization: Bearer $ADMIN_KEY" $BASE/api/health/governance` | 200, no degraded governors |
| 4 | Route surface | Probe the DEPLOYED service, not the local tree: run the topology check inside the deployed image (`docker compose -f deploy/docker-compose.staging.yml exec dixie-bff npm run topology:generate`) or spot-probe one endpoint per module against `$BASE` and compare with `docs/api-topology.json` | deployed counts match the checked topology (43 active); a stale image or differently-gated build fails here |
| 5 | Dependencies | health output `infrastructure` block | postgres, redis, nats all `healthy` |
| 6 | **Payment mode** | staging env (`X402_*` / payment middleware config) + one gated route probe | state the active payment mode (enforced / shadow / disabled) explicitly in the evidence; a payment-free route responds 200 and a gated route responds 402/401 as configured |
| 7 | Protocol version | response header `X-Protocol-Version` | `8.2.0` (must match `docs/protocol-compatibility.json`) |
| 8 | E2E smoke suite | `cd app && npm run test:e2e` | green |

## Evidence template

```
Deployment smoke — <date> — <staging|prod-like> — <git sha>
Stack: converged (compose --wait)
Health: healthy (finn latency Xms) | governance: N governors healthy
Routes: 43 active / 6 planned (topology:generate)
Payment mode: <enforced|shadow|disabled> — gated route returned <402|200>
Protocol: X-Protocol-Version 8.2.0
E2E: <N> passed
```
