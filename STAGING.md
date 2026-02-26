# Staging Deployment Runbook

Operational guide for running the dixie-bff staging environment.

## 1. Prerequisites

- Docker Engine 24+ with Compose v2
- Node.js 20+ and npm
- Git (for building dixie-bff image from source)
- Access to loa-finn Docker image (`ghcr.io/0xhoneyjar/loa-finn:v3.2.0`)

## 2. Environment Setup

```bash
# Copy the example env file
cp .env.example deploy/.env.staging

# Edit and fill in required values:
#   DIXIE_JWT_PRIVATE_KEY     — generate with: openssl rand -hex 32
#   POSTGRES_PASSWORD         — strong password for PostgreSQL
#   DIXIE_ADMIN_KEY           — admin API key for health/governance endpoints
#   FINN_URL                  — loa-finn base URL (default: http://loa-finn:3000)
#   FINN_WS_URL               — loa-finn WebSocket URL (default: ws://loa-finn:3000)
#   DIXIE_CORS_ORIGINS        — comma-separated allowed origins
#   DIXIE_ALLOWLIST_PATH      — path to allowlist.json (default: /app/allowlist.json)
```

**Required variables** (must be set, no defaults):
- `DIXIE_JWT_PRIVATE_KEY`
- `POSTGRES_PASSWORD`

All 24 variables are documented in `.env.example`.

## 3. Build & Start

```bash
# Start all services (detached, wait for health)
docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging up -d --wait

# With observability (adds Grafana Tempo for tracing)
docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging --profile observability up -d --wait
```

Services started:
| Service | Port | Purpose |
|---------|------|---------|
| postgres | 5432 (internal) | Reputation + fleet + governance stores |
| redis | 6379 (internal) | Projection cache, rate limiting |
| nats | 4222 (internal) | Cross-service signal events |
| loa-finn | 3000 (internal) | Inference engine |
| dixie-bff | 3001 (host) | BFF API — the only externally exposed service |
| tempo | 4317 (internal) | Trace collector (observability profile only) |

## 4. Verify Health

```bash
# Quick health check
curl -s http://localhost:3001/api/health | jq '.status'
# Expected: "healthy"

# Full health with infrastructure details
curl -s http://localhost:3001/api/health | jq .

# Governance health (requires admin key)
curl -s -H "Authorization: Bearer $DIXIE_ADMIN_KEY" \
  http://localhost:3001/api/health/governance | jq .
```

### Expected Health Response

```json
{
  "status": "healthy",
  "services": {
    "dixie": { "status": "healthy" },
    "loa_finn": { "status": "healthy", "circuit_state": "closed" }
  },
  "infrastructure": {
    "postgresql": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "nats": { "status": "healthy" }
  }
}
```

If status is `degraded`, check which service is unhealthy via the `infrastructure` section.

## 5. Migrations

Migrations run automatically on dixie-bff startup. An advisory lock (derived from SHA-256 hash of `dixie-bff:migration`) ensures only one instance runs migrations at a time.

### Manual Migration

```bash
# Run migrations manually (if needed)
docker compose -f deploy/docker-compose.staging.yml exec dixie-bff \
  node -e "import('./dist/db/migrate.js').then(m => m.runMigrations())"
```

### Rollback Procedure

To rollback the last migration batch:

```bash
# 1. Connect to PostgreSQL
docker compose -f deploy/docker-compose.staging.yml exec postgres \
  psql -U dixie -d dixie

# 2. Check current migration state
SELECT * FROM _migrations ORDER BY applied_at DESC LIMIT 5;

# 3. Identify the migration to rollback (example: 014_fleet_tasks.sql)
# 4. Drop the tables/objects created by that migration:

-- Rollback 014_fleet_tasks
DROP TABLE IF EXISTS fleet_tasks CASCADE;
DROP INDEX IF EXISTS idx_fleet_tasks_operator_status;

-- Rollback 013_reputation_events
DROP TABLE IF EXISTS reputation_events CASCADE;
DROP TABLE IF EXISTS reputation_task_cohorts CASCADE;
DROP TABLE IF EXISTS reputation_aggregates CASCADE;

-- 5. Remove the migration record
DELETE FROM _migrations WHERE filename = '014_fleet_tasks.sql';

-- 6. Exit and restart dixie-bff (migrations will re-run if needed)
\q
```

```bash
docker compose -f deploy/docker-compose.staging.yml restart dixie-bff
```

## 6. Smoke Tests

```bash
# Install test dependencies (from project root)
npm install

# Run all 6 E2E smoke tests
npm run test:e2e

# Run a specific smoke test
npx vitest run tests/e2e/staging/smoke-health.test.ts
```

### Smoke Test Summary

| Test | Validates |
|------|-----------|
| smoke-health | Health endpoint, infrastructure deps, timestamp |
| smoke-auth | SIWE auth flow, JWT issuance, signature rejection |
| smoke-chat | Chat inference, session creation, validation |
| smoke-fleet | Fleet spawn auth, capabilities, governance |
| smoke-reputation | Reputation query, persistence across restart |
| smoke-governance | Governance health, auth enforcement |

## 7. Troubleshooting

### Service won't start

```bash
# Check container logs
docker compose -f deploy/docker-compose.staging.yml logs dixie-bff --tail=50
docker compose -f deploy/docker-compose.staging.yml logs postgres --tail=50

# Check container status
docker compose -f deploy/docker-compose.staging.yml ps
```

### PostgreSQL connection refused

```bash
# Verify postgres is running and healthy
docker compose -f deploy/docker-compose.staging.yml exec postgres pg_isready -U dixie

# Check DATABASE_URL in dixie-bff environment
docker compose -f deploy/docker-compose.staging.yml exec dixie-bff printenv DATABASE_URL
```

### Migration lock timeout

If migrations hang, another instance may hold the advisory lock:

```bash
# Check for active locks
docker compose -f deploy/docker-compose.staging.yml exec postgres \
  psql -U dixie -d dixie -c "SELECT * FROM pg_locks WHERE locktype = 'advisory';"

# Force-release (if safe — ensure no migration is actually running)
# Lock ID is derived from SHA-256('dixie-bff:migration') — check migrate.ts for current value
docker compose -f deploy/docker-compose.staging.yml exec postgres \
  psql -U dixie -d dixie -c "SELECT pg_advisory_unlock_all();"
```

### Health reports "degraded"

Check which infrastructure component is unhealthy:

```bash
curl -s http://localhost:3001/api/health | jq '.infrastructure'
```

Common causes:
- **postgresql unhealthy**: Check postgres container logs, verify POSTGRES_PASSWORD matches DATABASE_URL
- **redis unhealthy**: Redis container may have run out of memory, check `docker stats`
- **nats unhealthy**: NATS container crashed, check logs
- **loa_finn unreachable**: Check loa-finn container logs, verify FINN_URL

### Traces not appearing in Tempo

Ensure the observability profile is active:

```bash
docker compose -f deploy/docker-compose.staging.yml --profile observability up -d

# Verify OTEL endpoint is configured
docker compose -f deploy/docker-compose.staging.yml exec dixie-bff \
  printenv OTEL_EXPORTER_OTLP_ENDPOINT
# Expected: http://tempo:4317
```

## 8. NATS Connection & Debugging

NATS handles cross-service signal events (fleet lifecycle, governance decisions, collective intelligence).

**Internal URL** (within compose network): `nats://nats:4222`

To enable NATS debug logging inside the container:

```bash
# Toggle debug log output on the running NATS server
docker compose -f deploy/docker-compose.staging.yml exec nats nats-server --signal ldm
```

To connect from outside the compose network, temporarily expose the port:

```yaml
# WARNING: Do NOT expose in production
nats:
  ports:
    - "4222:4222"  # NATS client
    - "8222:8222"  # NATS monitoring
```

Then use `nats-cli` to subscribe/publish:

```bash
nats sub "dixie.>" --server nats://localhost:4222
```

## 9. Cross-Service Trace Correlation

Dixie forwards `traceparent` headers to loa-finn on every request. When the
observability profile is active, a single request produces a trace spanning:

```
dixie.request → dixie.auth → dixie.finn.inference → [finn spans]
```

### Verifying End-to-End Traces

```bash
# 1. Make a request and capture the trace ID from the response header
TRACE_ID=$(curl -sI http://localhost:3001/api/health | grep -i x-trace-id | awk '{print $2}' | tr -d '\r')
echo "Trace ID: $TRACE_ID"

# 2. Query Tempo for the trace (requires observability profile)
curl -s "http://localhost:3200/api/traces/$TRACE_ID" | jq '.batches[].scopeSpans[].spans[] | {name, traceId: .traceId, spanId: .spanId, parentSpanId}'
```

### Span Types

| Span Name | Source | Key Attributes |
|-----------|--------|---------------|
| `dixie.request` | tracing middleware | method, url, status_code, duration_ms |
| `dixie.auth` | JWT middleware | auth_type, wallet_hash, tier |
| `dixie.finn.inference` | FinnClient | model, latency_ms, circuit_state |
| `dixie.reputation.update` | ReputationService | model_id, score, ema_value |
| `dixie.fleet.spawn` | AgentSpawner | task_type, cost, identity_hash |
| `dixie.governance.check` | FleetGovernor | resource_type, decision, witness_count, denial_reason |

## 10. Staging vs Production Topology

| Aspect | Staging (compose) | Production (ECS Fargate) |
|--------|-------------------|--------------------------|
| Networking | Single Docker network | VPC with private subnets |
| Scaling | Single instance per service | Auto-scaling groups |
| Secrets | `.env.staging` file | AWS SSM Parameter Store / Secrets Manager |
| Database | Compose-managed PostgreSQL (postgres) | RDS with multi-AZ |
| Redis | Compose-managed Redis (redis) | ElastiCache cluster |
| NATS | Compose-managed single node (nats) | NATS cluster (3-node) |
| Inference | loa-finn (single container) | loa-finn fleet (auto-scaled) |
| Circuit breaker | Per-process (singleton FinnClient) | Per-instance — see [ADR-002](docs/adr/002-circuit-breaker-topology.md) |
| Load balancing | Direct port mapping (3001:3001) | ALB with TLS termination |
| Traces | Tempo (local, observability profile) | AWS X-Ray or hosted Grafana Cloud |
| NATS monitoring | Port 8222 (not exposed by default) | Dedicated monitoring endpoint |

**Key differences to watch for**:
- Staging runs on a single host — no network partitions possible
- Staging uses persistent Docker volumes — production uses EBS/RDS snapshots
- Staging health checks are local — production checks traverse ALB
- Circuit breaker state is per-process — in production with multiple instances, each has independent state (see [ADR-002](docs/adr/002-circuit-breaker-topology.md))
- OTEL collector in staging is Tempo direct; production may need an OTEL Collector sidecar
- NATS monitoring (port 8222) available in staging for debugging — production uses dedicated monitoring

## 11. Teardown

```bash
# Stop all services and remove volumes (clean state)
docker compose -f deploy/docker-compose.staging.yml down -v

# Stop services but keep volumes (preserve data)
docker compose -f deploy/docker-compose.staging.yml down
```
