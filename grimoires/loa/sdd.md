# SDD: Deploy Dixie to Armitage Ring (arrakis-staging-cluster)

**Version**: 18.0.0
**Date**: 2026-02-28
**Author**: Claude (Architecture), Merlin (Direction)
**Cycle**: cycle-018
**Status**: Approved
**PRD Reference**: PRD v18.0.0 — Deploy Dixie to Armitage Ring
**Issue**: https://github.com/0xHoneyJar/loa-dixie/issues/59

> Sources: Finn terraform (10 files, `loa-finn/infrastructure/terraform/`),
> existing `deploy/terraform/dixie.tf` (583 lines), Dixie app source,
> AWS CLI discovery (account 891376933289), `.env.example` (24 env vars)

---

## 1. Architecture Overview

### 1.1 Deployment Target

Dixie deploys as a single ECS Fargate task on `arrakis-staging-cluster`, sharing
infrastructure with Finn and other arrakis services. The terraform refactoring follows
Finn's multi-file, environment-aware pattern exactly.

```
Internet
  └─→ ALB (arrakis-staging-alb) [HTTPS :443]
       ├─→ Priority 210: finn-armitage.arrakis.community → Finn TG (:3000)
       ├─→ Priority 220: dixie-armitage.arrakis.community → Dixie TG (:3001)
       └─→ Default: arrakis-staging-api-tg

Dixie ECS Task (private subnet, port 3001)
  ├─→ Finn (via ALB DNS, port 3000) — inference requests
  ├─→ PostgreSQL (arrakis-staging-postgres RDS, port 5432)
  ├─→ Redis (dedicated ElastiCache, port 6379)
  ├─→ NATS (arrakis-staging-nats, port 4222)
  ├─→ Tempo (arrakis-staging-tempo, port 4317) — OTEL traces
  └─→ HTTPS (0.0.0.0/0, port 443) — external APIs
```

### 1.2 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Secret store | SSM Parameter Store | Finn alignment; native ECS integration; replaces existing Secrets Manager references |
| Finn connectivity | ALB routing (not service discovery) | PRD F8 Option B; simplest, proven with Finn, resolves inside VPC |
| Redis | Dedicated ElastiCache | Finn pattern; isolation, independent lifecycle, `noeviction` |
| Database | Shared RDS, dedicated `dixie` database | PRD F6; separate user/password, shared instance |
| EFS | Removed for staging | Not needed; allowlist baked into Docker image at `/app/allowlist.json` |
| Auto-scaling | Removed for staging | PRD: desired_count=1, single-writer invariant |

### 1.3 What Changes from Existing `dixie.tf`

| Aspect | Current (`dixie.tf`) | Armitage (new) |
|--------|---------------------|----------------|
| Structure | 1 monolithic file (583 lines) | 6 files following Finn pattern |
| Backend | None (freeside root module) | S3 + DynamoDB (workspace isolation) |
| Secrets | Secrets Manager | SSM Parameter Store |
| Naming | `dixie-bff` hardcoded | Environment-aware via locals |
| EFS | Required (`/data/allowlist.json`) | Removed (baked into image) |
| ALB priority | 200 (production) | 220 (staging) |
| Auto-scaling | 1-3 tasks, CPU 70% | Removed (staging: fixed count=1) |
| Hostname | `dixie.thj.dev` | `dixie-armitage.arrakis.community` |
| Finn URL | `http://finn.freeside.local:3000` | `http://finn-armitage.arrakis.community` (ALB) |
| OTEL endpoint | `http://tempo.freeside.local:4317` | `http://tempo.arrakis.local:4317` |
| Redis | None (implicit shared) | Dedicated ElastiCache |
| DB | None (implicit shared) | `DATABASE_URL` via SSM |
| NATS | None | `NATS_URL` via SSM |

---

## 2. Terraform File Structure

Following Finn's exact pattern (`loa-finn/infrastructure/terraform/`):

```
deploy/terraform/
├── variables.tf                  # Backend, provider, all variable definitions, locals
├── dixie-ecs.tf                  # IAM roles, SG, log group, task definition, ECS service
├── dixie-alb.tf                  # Target group, listener rule, Route53 DNS
├── dixie-env.tf                  # SSM Parameter Store definitions
├── dixie-redis.tf                # Dedicated ElastiCache
├── dixie-monitoring.tf           # SNS topic, CloudWatch alarms, metric filters
└── environments/
    └── armitage.tfvars           # Staging variable overrides
```

**Deleted**: `dixie.tf` (replaced by the 6 files above)

### 2.1 File Responsibilities

| File | Resources | Lines (est) |
|------|-----------|-------------|
| `variables.tf` | terraform block, provider, variables, locals, workspace check | ~130 |
| `dixie-ecs.tf` | 2 IAM roles + policies, SG + rules, log group, task def, ECS service | ~220 |
| `dixie-alb.tf` | Target group, listener rule, Route53 record | ~60 |
| `dixie-env.tf` | SSM parameters (10 params) | ~120 |
| `dixie-redis.tf` | ElastiCache replication group, subnet group, param group, SG | ~90 |
| `dixie-monitoring.tf` | SNS topic, 5 CloudWatch alarms, 2 metric filters | ~150 |
| `armitage.tfvars` | All staging overrides | ~30 |

---

## 3. Terraform Design — `variables.tf`

### 3.1 Backend Configuration

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "honeyjar-terraform-state"
    key            = "loa-dixie/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
    workspace_key_prefix = "env"
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = "loa-dixie"
      ManagedBy = "terraform"
    }
  }
}
```

### 3.2 Environment-Aware Locals

```hcl
locals {
  service_name = var.environment == "production" ? "dixie-bff" : "dixie-${var.environment}"
  hostname     = var.environment == "production" ? "dixie.thj.dev" : "dixie-${var.environment}.arrakis.community"
  ssm_prefix   = "/dixie/${var.environment}"
  ecs_cluster  = var.ecs_cluster_name != "" ? var.ecs_cluster_name : "honeyjar-${var.environment}"

  common_tags = {
    Environment = var.environment
    Service     = "loa-dixie"
    ManagedBy   = "terraform"
  }
}
```

### 3.3 Variables

| Variable | Type | Default | Validation |
|----------|------|---------|------------|
| `environment` | string | `"production"` | `contains(["production", "armitage"], ...)` |
| `vpc_id` | string | — | required |
| `private_subnet_ids` | list(string) | — | required |
| `ecr_repository_url` | string | — | required |
| `image_tag` | string | `"DEPLOY_SHA_REQUIRED"` | `!= "latest"` |
| `dixie_cpu` | number | `1024` | — |
| `dixie_memory` | number | `2048` | — |
| `alb_arn` | string | — | required |
| `alb_listener_arn` | string | — | required |
| `alb_security_group_id` | string | — | required |
| `alb_dns_name` | string | — | required |
| `alb_zone_id` | string | — | required |
| `route53_zone_id` | string | — | required |
| `ecs_cluster_name` | string | `""` | — |
| `alarm_email` | string | `""` | — |

### 3.4 Workspace Safety Check

Same pattern as Finn — prevents applying production config in staging workspace:

```hcl
resource "null_resource" "workspace_environment_check" {
  count = terraform.workspace != "default" && terraform.workspace != var.environment ? 1 : 0

  provisioner "local-exec" {
    command = "echo 'ERROR: workspace (${terraform.workspace}) != environment (${var.environment})' && exit 1"
  }
}
```

---

## 4. Terraform Design — `dixie-ecs.tf`

### 4.1 IAM Roles

**Execution Role** (`dixie-{env}-ecs-task-execution`):
- `AmazonECSTaskExecutionRolePolicy` (managed)
- Inline policy: `ssm:GetParameters`, `ssm:GetParameter` scoped to `${local.ssm_prefix}/*`

**Task Role** (`dixie-{env}-ecs-task`):
- `ssm:GetParameter`, `ssm:GetParameters`, `ssm:GetParametersByPath` — scoped to `${local.ssm_prefix}/*`, region-conditioned
- `logs:CreateLogStream`, `logs:PutLogEvents` — scoped to log group

Dixie does NOT need KMS, DynamoDB, or S3 permissions (unlike Finn). Simpler IAM footprint.

### 4.2 Security Group

```
dixie-{env}-ecs SG:
  Ingress:
    - Port 3001 from ALB SG (var.alb_security_group_id)

  Egress:
    - Port 443 to 0.0.0.0/0 (HTTPS — external APIs, ALB for Finn)
    - Port 6379 to ElastiCache SG (standalone rule, breaks SG cycle)
    - Port 5432 to 10.0.0.0/8 (RDS PostgreSQL)
    - Port 4222 to 10.0.0.0/8 (NATS)
    - Port 4317 to 10.0.0.0/8 (Tempo OTLP)
```

**Note**: Finn connectivity uses ALB (HTTPS :443), not direct port 3000. This simplifies
the SG — no need for a Finn-specific egress rule or Finn SG ingress modification.

### 4.3 Task Definition

```hcl
family                   = local.service_name        # "dixie-armitage"
network_mode             = "awsvpc"
requires_compatibilities = ["FARGATE"]
cpu                      = var.dixie_cpu             # 256 for staging
memory                   = var.dixie_memory          # 512 for staging
```

**Container Definition:**

| Field | Value |
|-------|-------|
| name | `"dixie-bff"` |
| image | `"${var.ecr_repository_url}:${var.image_tag}"` |
| containerPort | `3001` |
| healthCheck | `fetch('http://localhost:3001/api/health')` |
| startPeriod | `60` (migrations may take 10-15s on first deploy) |

**Environment Variables (plaintext):**

| Name | Value |
|------|-------|
| `NODE_ENV` | `"production"` |
| `DIXIE_PORT` | `"3001"` |
| `DIXIE_ENVIRONMENT` | `var.environment` |
| `DIXIE_ALLOWLIST_PATH` | `"/app/allowlist.json"` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `"http://tempo.arrakis.local:4317"` |

**Secrets (from SSM):**

| Name | SSM Path |
|------|----------|
| `FINN_URL` | `${ssm_prefix}/FINN_URL` |
| `FINN_WS_URL` | `${ssm_prefix}/FINN_WS_URL` |
| `DATABASE_URL` | `${ssm_prefix}/DATABASE_URL` |
| `REDIS_URL` | `${ssm_prefix}/REDIS_URL` |
| `NATS_URL` | `${ssm_prefix}/NATS_URL` |
| `DIXIE_JWT_PRIVATE_KEY` | `${ssm_prefix}/DIXIE_JWT_PRIVATE_KEY` |
| `DIXIE_ADMIN_KEY` | `${ssm_prefix}/DIXIE_ADMIN_KEY` |
| `DIXIE_CORS_ORIGINS` | `${ssm_prefix}/DIXIE_CORS_ORIGINS` |

### 4.4 ECS Service

```hcl
name            = local.service_name        # "dixie-armitage"
cluster         = local.ecs_cluster          # "arrakis-staging-cluster"
desired_count   = 1                          # Single-writer invariant
launch_type     = "FARGATE"

# Stop-before-start: prevent dual-writer window
deployment_maximum_percent         = 100
deployment_minimum_healthy_percent = 0

deployment_circuit_breaker {
  enable   = true
  rollback = true
}

lifecycle {
  prevent_destroy = true
}
```

---

## 5. Terraform Design — `dixie-alb.tf`

### 5.1 Target Group

```hcl
name        = local.service_name    # "dixie-armitage"
port        = 3001
protocol    = "HTTP"
target_type = "ip"

health_check {
  path                = "/api/health"
  interval            = 30
  timeout             = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3
  matcher             = "200"
}

deregistration_delay = 30
```

No WebSocket stickiness needed for Dixie (unlike Finn which uses WebSocket for streaming).

### 5.2 Listener Rule

```hcl
listener_arn = var.alb_listener_arn
priority     = var.environment == "production" ? 200 : 220

condition {
  host_header {
    values = [local.hostname]    # "dixie-armitage.arrakis.community"
  }
}
```

Priority 220 for staging (Finn uses 210, default uses lowest priority).

### 5.3 Route53

```hcl
zone_id = var.route53_zone_id     # arrakis.community zone
name    = local.hostname           # "dixie-armitage.arrakis.community"
type    = "A"

alias {
  name                   = var.alb_dns_name
  zone_id                = var.alb_zone_id
  evaluate_target_health = true
}
```

---

## 6. Terraform Design — `dixie-env.tf`

### 6.1 SSM Parameters

All parameters use `lifecycle { ignore_changes = [value] }` — Terraform creates
the parameter with a PLACEHOLDER, then the operator sets the real value via AWS CLI.

| Parameter | Type | Initial Value | Notes |
|-----------|------|---------------|-------|
| `FINN_URL` | SecureString | PLACEHOLDER | `http://finn-armitage.arrakis.community` |
| `FINN_WS_URL` | SecureString | PLACEHOLDER | `ws://finn-armitage.arrakis.community` |
| `DATABASE_URL` | SecureString | PLACEHOLDER | `postgresql://dixie:<pw>@arrakis-staging-postgres...:5432/dixie` |
| `REDIS_URL` | SecureString | PLACEHOLDER | `rediss://` (TLS endpoint from ElastiCache) |
| `NATS_URL` | String | PLACEHOLDER | `nats://arrakis-staging-nats...:4222` |
| `DIXIE_JWT_PRIVATE_KEY` | SecureString | PLACEHOLDER | Min 32 chars, HS256 |
| `DIXIE_ADMIN_KEY` | SecureString | PLACEHOLDER | Admin API auth |
| `DIXIE_CORS_ORIGINS` | String | PLACEHOLDER | `https://dixie-armitage.arrakis.community` |

### 6.2 NATS URL Discovery

NATS runs as `arrakis-staging-nats` ECS service. Its URL needs to be discovered:
- **Option A**: ECS Service Connect (Cloud Map) — e.g., `nats://nats.arrakis.local:4222`
- **Option B**: Task IP discovery — query ECS describe-tasks for the running NATS task IP

The NATS URL will be set manually after discovery via `aws ssm put-parameter`.

---

## 7. Terraform Design — `dixie-redis.tf`

Following Finn's ElastiCache pattern exactly:

### 7.1 Resources

| Resource | Configuration |
|----------|--------------|
| Subnet group | `dixie-{env}-redis`, same private subnets |
| Security group | Ingress 6379 from ECS SG only |
| Parameter group | `dixie-{env}-redis7`, `maxmemory-policy=noeviction` |
| Replication group | `dixie-{env}`, Redis 7.1, `cache.t4g.micro` (staging) |

### 7.2 Staging vs Production

| Aspect | Staging | Production |
|--------|---------|------------|
| Node type | `cache.t4g.micro` | `cache.t4g.small` |
| Clusters | 1 | 2 |
| Multi-AZ | false | true |
| Auto-failover | false | true |
| Snapshot retention | 1 day | 7 days |
| TLS | Enabled | Enabled |
| Encryption at rest | Enabled | Enabled |

---

## 8. Terraform Design — `dixie-monitoring.tf`

### 8.1 SNS Topic

`dixie-{env}-alarms` with optional email subscription (via `var.alarm_email`).

### 8.2 CloudWatch Alarms

| Alarm | Metric | Threshold | Period | Evaluations |
|-------|--------|-----------|--------|-------------|
| CPU high | `CPUUtilization` (ECS) | > 80% | 300s | 3 |
| Memory high | `MemoryUtilization` (ECS) | > 80% | 300s | 3 |
| Unhealthy hosts | `HealthyHostCount` (ALB) | < 1 | 60s | 3 |
| Finn latency | `TargetResponseTime` (ALB) | p95 > 5s | 60s | 5 |
| Circuit breaker open | Custom metric from log filter | > 0 | 60s | 1 |
| Redis memory | `DatabaseMemoryUsagePercentage` (ElastiCache) | > 70% | 300s | 3 |

### 8.3 Log Metric Filters

| Filter | Pattern | Custom Metric |
|--------|---------|---------------|
| Circuit breaker open | `{ $.circuit_state = "open" }` | `Dixie/{env}/CircuitBreakerOpen` |
| Allowlist denied | `{ $.auth_type = "none" && $.action = "denied" }` | `Dixie/{env}/AllowlistDenied` |

---

## 9. ECR Repository

### 9.1 Creation (Manual — Step 1)

```bash
aws ecr create-repository \
  --repository-name dixie-armitage \
  --image-scanning-configuration scanOnPush=true \
  --image-tag-mutability IMMUTABLE \
  --region us-east-1
```

### 9.2 Lifecycle Policy

Keep last 10 images:
```json
{
  "rules": [{
    "rulePriority": 1,
    "description": "Keep last 10 images",
    "selection": {
      "tagStatus": "any",
      "countType": "imageCountMoreThan",
      "countNumber": 10
    },
    "action": { "type": "expire" }
  }]
}
```

### 9.3 Build & Push

```bash
docker build -f deploy/Dockerfile -t dixie-armitage .
docker tag dixie-armitage:latest 891376933289.dkr.ecr.us-east-1.amazonaws.com/dixie-armitage:$(git rev-parse --short HEAD)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 891376933289.dkr.ecr.us-east-1.amazonaws.com
docker push 891376933289.dkr.ecr.us-east-1.amazonaws.com/dixie-armitage:$(git rev-parse --short HEAD)
```

---

## 10. Database Setup

### 10.1 Create Database & User (Manual — Step 3)

Connect to RDS and run:
```sql
CREATE DATABASE dixie;
CREATE USER dixie WITH PASSWORD '<generated-password>';
GRANT ALL PRIVILEGES ON DATABASE dixie TO dixie;
\c dixie
GRANT ALL ON SCHEMA public TO dixie;
```

### 10.2 Migrations

Migrations run automatically on ECS task startup:
- Advisory lock prevents concurrent migration (safe for single-writer)
- 16 migration files (003-015) create all required tables
- Forward-only (no rollback migrations)
- Tracked in `_migrations` table with checksum verification

---

## 11. Finn Wiring (Post-Deploy)

### 11.1 Update Finn's SSM

```bash
aws ssm put-parameter \
  --name "/loa-finn/armitage/DIXIE_BASE_URL" \
  --value "https://dixie-armitage.arrakis.community" \
  --type SecureString \
  --overwrite
```

### 11.2 Force Finn Redeployment

```bash
aws ecs update-service \
  --cluster arrakis-staging-cluster \
  --service loa-finn-armitage \
  --force-new-deployment
```

### 11.3 Verify Bidirectional Health

```bash
# Dixie health: should show loa_finn: healthy, circuit_state: closed
curl https://dixie-armitage.arrakis.community/api/health | jq .

# Finn health: should show dixie: healthy (once Finn reads DIXIE_BASE_URL)
curl https://finn-armitage.arrakis.community/health | jq .
```

---

## 12. `armitage.tfvars`

```hcl
environment = "armitage"

ecs_cluster_name = "arrakis-staging-cluster"

dixie_cpu    = 256
dixie_memory = 512

ecr_repository_url = "891376933289.dkr.ecr.us-east-1.amazonaws.com/dixie-armitage"
image_tag          = "DEPLOY_SHA_REQUIRED"

vpc_id             = "vpc-0d08ce69dba7485da"
private_subnet_ids = ["subnet-0a08a8fce7004ee11", "subnet-07973b30fe8f675e7"]

alb_arn               = "arn:aws:elasticloadbalancing:us-east-1:891376933289:loadbalancer/app/arrakis-staging-alb/0d434b50265789c1"
alb_listener_arn      = "arn:aws:elasticloadbalancing:us-east-1:891376933289:listener/app/arrakis-staging-alb/0d434b50265789c1/e6ff22557f66633c"
alb_security_group_id = "sg-007cdd539bcc3360c"
alb_dns_name          = "arrakis-staging-alb-616899391.us-east-1.elb.amazonaws.com"
alb_zone_id           = "Z35SXDOTRQ7X7K"

route53_zone_id = "Z01194812Z6NUWBWMFB7T"
```

---

## 13. Implementation Sequence

| Step | Description | Terraform | Manual |
|------|-------------|-----------|--------|
| 1 | Create ECR repository | No | `aws ecr create-repository` |
| 2 | Build & push Docker image | No | `docker build + push` |
| 3 | Create database on RDS | No | `psql` SQL commands |
| 4 | Refactor terraform (split files) | Yes | Delete `dixie.tf` |
| 5 | Create `armitage.tfvars` | Yes | — |
| 6 | `terraform init` + workspace | No | CLI |
| 7 | `terraform plan` | Yes | Review |
| 8 | Seed SSM parameters | No | `aws ssm put-parameter` |
| 9 | `terraform apply` | Yes | Creates all AWS resources |
| 10 | Verify Dixie health | No | `curl` health endpoint |
| 11 | Wire Finn→Dixie SSM | No | `aws ssm put-parameter` |
| 12 | Force Finn redeploy | No | `aws ecs update-service` |
| 13 | Verify bidirectional health | No | `curl` both endpoints |

### 13.1 Sprint Implementation Note

Steps 1-3 and 8 are **manual AWS operations** that require authenticated AWS CLI access.
Steps 4-5, 7, 9 are **terraform code** that the sprint implements.
Steps 6, 10-13 are **deployment operations** that happen after code is merged.

**The sprint plan should focus on Step 4 (terraform refactoring) as the primary code deliverable.**
Steps 1-3, 6, 8-13 are operational procedures documented in the sprint but executed manually.

---

## 14. Risk Mitigations

| Risk | Mitigation |
|------|------------|
| NATS URL unknown | Discover via `aws ecs describe-tasks` for nats service; set in SSM |
| PgBouncer unhealthy | Direct RDS endpoint (skip PgBouncer for now) |
| First deploy migration slow | `startPeriod=60` gives migration time before health check starts |
| Terraform state conflict | Workspace isolation (`env:/armitage/`) prevents production collision |
| ECR image not found | `image_tag` validated `!= "latest"`; must be set at deploy time |
| Redis TLS URL format | ElastiCache outputs `rediss://` URL; app's Redis client supports `rediss://` |

---

## 15. Non-Goals (Staging)

- Auto-scaling (fixed count=1)
- EFS volume mounting (allowlist baked into image)
- DynamoDB tables (Dixie doesn't use DynamoDB)
- S3 buckets (Dixie doesn't use S3)
- KMS signing keys (Dixie doesn't use KMS directly)
- Blue/green or canary deployment
- CI/CD pipeline (manual deploy for now)

---

## 16. Cross-References

| Reference | Location |
|-----------|----------|
| PRD v18.0.0 | `grimoires/loa/prd.md` |
| Finn terraform | `/home/merlin/Documents/thj/code/loa-finn/infrastructure/terraform/` |
| Finn armitage.tfvars | `loa-finn/infrastructure/terraform/environments/armitage.tfvars` |
| Existing dixie.tf | `deploy/terraform/dixie.tf` (will be deleted) |
| Dockerfile | `deploy/Dockerfile` |
| Health endpoint | `app/src/routes/health.ts` |
| Finn client | `app/src/proxy/finn-client.ts` |
| DB client | `app/src/db/client.ts` |
| Redis client | `app/src/services/redis-client.ts` |
| NATS client | `app/src/services/signal-emitter.ts` |
| OTEL setup | `app/src/telemetry.ts` |
| .env.example | `deploy/.env.example` (24 env vars) |
