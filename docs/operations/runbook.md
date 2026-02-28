# Dixie Operational Runbook

> Deployment, monitoring, and troubleshooting guide for the Dixie BFF service running on the Armitage Ring staging infrastructure.

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| AWS CLI v2 | ECR auth, ECS operations, SSM parameter access | `brew install awscli` or [AWS docs](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| Docker | Build container images | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| jq | Parse JSON outputs from AWS CLI | `brew install jq` |

### Required AWS Permissions

- `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`
- `ecs:UpdateService`, `ecs:DescribeServices`, `ecs:DescribeTaskDefinition`, `ecs:RegisterTaskDefinition`, `ecs:ListTaskDefinitions`
- `ssm:GetParameter`, `ssm:GetParametersByPath`, `ssm:PutParameter`
- `logs:GetLogEvents`, `logs:FilterLogEvents` (CloudWatch)

### AWS Account & Region

- **Account**: `891376933289`
- **Region**: `us-east-1`
- **ECS Cluster**: `arrakis-staging-cluster`

---

## Deployment Procedure

### 1. Build the Docker Image

```bash
# From the repository root
docker build -f deploy/Dockerfile -t dixie-armitage:$(git rev-parse --short HEAD) .
```

The Dockerfile uses a multi-stage build:
- **deps**: Production `npm ci --omit=dev`
- **build**: Full `npm ci --include=dev` + TypeScript compilation
- **runtime**: Minimal image with non-root `dixie` user, port 3001 exposed

### 2. Authenticate with ECR

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  891376933289.dkr.ecr.us-east-1.amazonaws.com
```

### 3. Tag and Push

```bash
SHA=$(git rev-parse --short HEAD)
ECR_REPO=891376933289.dkr.ecr.us-east-1.amazonaws.com/dixie-armitage

docker tag dixie-armitage:${SHA} ${ECR_REPO}:${SHA}
docker tag dixie-armitage:${SHA} ${ECR_REPO}:latest
docker push ${ECR_REPO}:${SHA}
docker push ${ECR_REPO}:latest
```

### 4. Register New Task Definition

Update the task definition JSON with the new image tag and register a new revision:

```bash
# Get current task definition
aws ecs describe-task-definition \
  --task-definition dixie-armitage \
  --query 'taskDefinition' > /tmp/taskdef.json

# Update image in the container definition (edit /tmp/taskdef.json)
# Then register a new revision:
aws ecs register-task-definition --cli-input-json file:///tmp/taskdef.json
```

### 5. Deploy

```bash
aws ecs update-service \
  --cluster arrakis-staging-cluster \
  --service dixie-armitage \
  --force-new-deployment
```

### 6. Verify

```bash
# Watch deployment progress
aws ecs describe-services \
  --cluster arrakis-staging-cluster \
  --services dixie-armitage \
  --query 'services[0].deployments'

# Health check once the new task is running
curl -s https://dixie-armitage.arrakis.community/api/health | jq .
```

---

## SSM Parameter Reference

All environment variables are injected via AWS SSM Parameter Store. Parameters follow the path prefix `/arrakis/staging/dixie/`.

### Core

| Parameter | Env Var | Required | Default | Description |
|-----------|---------|----------|---------|-------------|
| `FINN_URL` | `FINN_URL` | Yes | -- | Finn backend URL (e.g., `http://finn-armitage.arrakis.community`) |
| `FINN_WS_URL` | `FINN_WS_URL` | No | Derived from FINN_URL | WebSocket URL for Finn; auto-derived by replacing `http://` with `ws://` |
| `DIXIE_PORT` | `DIXIE_PORT` | No | `3001` | HTTP listen port (clamped to 0-65535) |
| `NODE_ENV` | `NODE_ENV` | No | `development` | Runtime environment: `development`, `staging`, `production` |
| `LOG_LEVEL` | `LOG_LEVEL` | No | `info` | Structured log level: `debug`, `info`, `warn`, `error` |

### Security

| Parameter | Env Var | Required | Default | Description |
|-----------|---------|----------|---------|-------------|
| `DIXIE_JWT_PRIVATE_KEY` | `DIXIE_JWT_PRIVATE_KEY` | Yes (prod) | -- | HS256 secret for JWT signing. Minimum 32 characters. Empty allowed only in test mode. |
| `DIXIE_ADMIN_KEY` | `DIXIE_ADMIN_KEY` | Yes (prod) | -- | Admin API key for `/api/admin` and `/api/health/governance`. Required in production (empty key allows unauthenticated admin access). |
| `DIXIE_ALLOWLIST_PATH` | `DIXIE_ALLOWLIST_PATH` | No | `/data/allowlist.json` | Path to the JSON allowlist file for wallet-based access control |
| `DIXIE_SCHEDULE_CALLBACK_SECRET` | `DIXIE_SCHEDULE_CALLBACK_SECRET` | No | `''` | HMAC secret for verifying schedule callback requests from Finn. Empty rejects all callbacks in production. |

### Infrastructure

| Parameter | Env Var | Required | Default | Description |
|-----------|---------|----------|---------|-------------|
| `DATABASE_URL` | `DATABASE_URL` | No | `null` | PostgreSQL connection string. Null disables all DB features. |
| `REDIS_URL` | `REDIS_URL` | No | `null` | Redis connection string (dedicated ElastiCache). Null disables Redis features. |
| `NATS_URL` | `NATS_URL` | No | `null` | NATS server URL. Null disables NATS features. Currently not deployed in staging. |
| `DATABASE_POOL_SIZE` | `DATABASE_POOL_SIZE` | No | `10` | Maximum connections in the PostgreSQL connection pool (clamped to 1-100) |

### Rate Limiting

| Parameter | Env Var | Required | Default | Description |
|-----------|---------|----------|---------|-------------|
| `DIXIE_CORS_ORIGINS` | `DIXIE_CORS_ORIGINS` | No | `http://localhost:{port}` | Comma-separated allowed CORS origins |
| `DIXIE_RATE_LIMIT_RPM` | `DIXIE_RATE_LIMIT_RPM` | No | `100` | Max requests per minute per identity (clamped to 0-10000) |
| `DIXIE_RATE_LIMIT_BACKEND` | `DIXIE_RATE_LIMIT_BACKEND` | No | `memory` | Rate limit storage: `memory` or `redis`. Auto-upgrades to `redis` when `REDIS_URL` is set. |

### Memory

| Parameter | Env Var | Required | Default | Description |
|-----------|---------|----------|---------|-------------|
| `DIXIE_MEMORY_PROJECTION_TTL` | `DIXIE_MEMORY_PROJECTION_TTL` | No | `300` | Projection cache TTL in seconds (clamped to 0-86400) |
| `DIXIE_MEMORY_MAX_EVENTS` | `DIXIE_MEMORY_MAX_EVENTS` | No | `100` | Maximum events per memory query (clamped to 0-10000) |

### Governance

| Parameter | Env Var | Required | Default | Description |
|-----------|---------|----------|---------|-------------|
| `DIXIE_CONVICTION_TIER_TTL` | `DIXIE_CONVICTION_TIER_TTL` | No | `300` | Conviction tier cache TTL in seconds. 5 minutes balances freshness against Freeside API load. Invalidated on staking events. |
| `DIXIE_PERSONALITY_TTL` | `DIXIE_PERSONALITY_TTL` | No | `1800` | BEAUVOIR personality cache TTL in seconds (30 min default) |
| `DIXIE_AUTONOMOUS_PERMISSION_TTL` | `DIXIE_AUTONOMOUS_PERMISSION_TTL` | No | `300` | Autonomous permission cache TTL in seconds. Separate from conviction TTL for independent tuning of permission revocation propagation. |
| `DIXIE_AUTONOMOUS_BUDGET` | `DIXIE_AUTONOMOUS_BUDGET` | No | `100000` | Default autonomous budget in micro-USD (100000 = $0.10) |

### Observability

| Parameter | Env Var | Required | Default | Description |
|-----------|---------|----------|---------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `OTEL_EXPORTER_OTLP_ENDPOINT` | No | `null` | OpenTelemetry collector gRPC endpoint. Null disables trace export. Points to Tempo in staging. |

---

## Health Monitoring

### Endpoint

```
GET /api/health
```

No authentication required. Returns the current service health status.

### Response Schema

```json
{
  "status": "healthy | degraded | unhealthy",
  "version": "2.0.0",
  "uptime_seconds": 3600,
  "services": {
    "dixie": { "status": "healthy" },
    "loa_finn": {
      "status": "healthy | degraded | unreachable",
      "latency_ms": 12,
      "circuit_state": "CLOSED | HALF_OPEN | OPEN"
    },
    "knowledge_corpus": {
      "document_count": 42,
      "last_indexed": "2026-02-28T10:00:00Z"
    }
  },
  "infrastructure": {
    "postgresql": { "status": "healthy | unreachable", "latency_ms": 5 },
    "redis": { "status": "healthy | degraded | unreachable", "latency_ms": 2 },
    "nats": { "status": "healthy | unreachable" }
  },
  "reputation_service": {
    "initialized": true,
    "aggregate_count": 15
  },
  "governance": {
    "governor_count": 3,
    "resource_types": ["knowledge_corpus", "knowledge_governor", "fleet"],
    "health": "healthy | degraded"
  },
  "timestamp": "2026-02-28T12:00:00.000Z"
}
```

### Status Logic

| Overall Status | Condition |
|---------------|-----------|
| **healthy** | All services reachable, no degradation |
| **degraded** | Finn is degraded, OR any infrastructure service (PG, Redis, NATS) is unreachable |
| **unhealthy** | Finn is unreachable (circuit breaker OPEN) |

### Monitoring Recommendations

- Poll `/api/health` every 30 seconds
- Alert on `status: "unhealthy"` (Finn down = agent routes return 503)
- Warn on `status: "degraded"` (partial functionality available)
- Track `services.loa_finn.latency_ms` for performance regression detection
- Track `services.loa_finn.circuit_state` transitions (CLOSED -> OPEN indicates Finn instability)

---

## Troubleshooting

### PostgreSQL Connection Timeout

**Symptom**: Health check shows `postgresql.status: "unreachable"`, application logs show connection timeout errors.

**Cause**: Security group misconfiguration. The RDS security group must allow inbound connections from the ECS task security group.

**Fix**: Verify that security group `sg-08be68d1249489190` (arrakis-staging-rds) allows inbound TCP on port **5432** from security group `sg-0790b2636abe2498e` (dixie-armitage-ecs).

```bash
aws ec2 describe-security-group-rules \
  --filters Name=group-id,Values=sg-08be68d1249489190 \
  --query 'SecurityGroupRules[?FromPort==`5432`]'
```

### NATS EHOSTUNREACH

**Symptom**: Application logs show `EHOSTUNREACH` errors when connecting to NATS.

**Cause**: Expected in staging. NATS is not yet deployed to the Armitage Ring. The `NATS_URL` parameter is configured for future use but the server does not exist yet.

**Fix**: No action required. The NATS connection failure is handled gracefully -- the health endpoint reports `nats.status: "unreachable"` but does not affect overall service health unless other services are also degraded.

### Circuit Breaker Open (Finn Unreachable)

**Symptom**: Health check shows `loa_finn.circuit_state: "OPEN"`, agent routes return HTTP 503.

**Cause**: Finn is unhealthy or unreachable. The circuit breaker opens after 3 consecutive failures with a 30-second recovery window (see ADR-002).

**Diagnosis**:
1. Check Finn health directly: `curl -s https://finn-armitage.arrakis.community/health`
2. Check Finn ECS service: `aws ecs describe-services --cluster arrakis-staging-cluster --services finn-armitage`
3. Check Finn CloudWatch logs for errors

**Fix**: Resolve the Finn issue first. The circuit breaker will automatically transition to HALF_OPEN after the recovery window and attempt to reconnect.

### ECS Circuit Breaker Rollback

**Symptom**: Deployment stuck or rolled back. ECS events show deployment circuit breaker activated.

**Cause**: The new task definition revision is crashing on startup. Common causes:
- Missing or invalid SSM parameter values
- Database migration failure
- Port conflict
- Incorrect Docker image tag

**Diagnosis**:
```bash
# Check deployment events
aws ecs describe-services \
  --cluster arrakis-staging-cluster \
  --services dixie-armitage \
  --query 'services[0].events[:10]'

# Check CloudWatch logs for the failed task
aws logs filter-log-events \
  --log-group-name /ecs/dixie-armitage \
  --start-time $(date -d '10 minutes ago' +%s000) \
  --filter-pattern "ERROR"
```

**Fix**: Identify and fix the startup error, push a corrected image, and redeploy.

### High Latency to Finn

**Symptom**: `services.loa_finn.latency_ms` consistently above 500ms.

**Cause**: Network issues between ECS tasks, or Finn overloaded.

**Diagnosis**: Check if the issue is network-level (ALB latency) or application-level (Finn processing time). Compare with Finn's own health endpoint latency.

---

## Rollback Procedure

### List Available Task Definition Revisions

```bash
aws ecs list-task-definitions \
  --family-prefix dixie-armitage \
  --sort DESC \
  --query 'taskDefinitionArns[:5]'
```

### Roll Back to a Previous Revision

```bash
# Example: roll back to revision 12
aws ecs update-service \
  --cluster arrakis-staging-cluster \
  --service dixie-armitage \
  --task-definition dixie-armitage:12

# Verify the rollback
aws ecs describe-services \
  --cluster arrakis-staging-cluster \
  --services dixie-armitage \
  --query 'services[0].deployments'
```

### Emergency: Force Stop All Tasks

Only use if tasks are stuck and not draining:

```bash
aws ecs update-service \
  --cluster arrakis-staging-cluster \
  --service dixie-armitage \
  --desired-count 0

# Then bring back up with the correct task definition
aws ecs update-service \
  --cluster arrakis-staging-cluster \
  --service dixie-armitage \
  --desired-count 1 \
  --task-definition dixie-armitage:12
```

---

## Security Groups

| Name | ID | Purpose |
|------|-----|---------|
| **dixie-armitage-ecs** | `sg-0790b2636abe2498e` | ECS task security group for Dixie containers |
| **arrakis-staging-rds** | `sg-08be68d1249489190` | RDS PostgreSQL security group. Must allow inbound from `dixie-armitage-ecs` on port 5432. |
| **arrakis-staging-alb** | `sg-007cdd539bcc3360c` | ALB security group. Allows internet ingress, routes to Dixie on port 3001. |

### Required Inbound Rules

| Security Group | Source | Port | Protocol | Purpose |
|---------------|--------|------|----------|---------|
| arrakis-staging-rds | sg-0790b2636abe2498e | 5432 | TCP | Dixie ECS -> PostgreSQL |
| dixie-armitage-ecs | sg-007cdd539bcc3360c | 3001 | TCP | ALB -> Dixie container |

---

## Infrastructure IDs

| Resource | Identifier |
|----------|------------|
| **ECR Repository** | `891376933289.dkr.ecr.us-east-1.amazonaws.com/dixie-armitage` |
| **ECS Cluster** | `arrakis-staging-cluster` |
| **ECS Service** | `dixie-armitage` |
| **Task Definition Family** | `dixie-armitage` |
| **ALB** | `arrakis-staging-alb` |
| **ALB Hostname (Dixie)** | `dixie-armitage.arrakis.community` |
| **ALB Hostname (Finn)** | `finn-armitage.arrakis.community` |
| **RDS Instance** | `arrakis-staging-postgres` |
| **CloudWatch Log Group** | `/ecs/dixie-armitage` |
