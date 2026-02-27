# PRD: Deploy Dixie to Armitage Ring (arrakis-staging-cluster)

**Version**: 18.0.0
**Date**: 2026-02-28
**Author**: Merlin (Direction), Claude (Synthesis)
**Cycle**: cycle-018
**Status**: Approved
**Issue**: https://github.com/0xHoneyJar/loa-dixie/issues/59
**Predecessor**: cycle-017 PRD v17.0.0 (Hounfour v9 Extraction — delivered as PR comment)

> Sources: loa-dixie#59 (issue), loa-finn terraform reference (`infrastructure/terraform/`),
> AWS CLI discovery (account 891376933289), existing `deploy/terraform/dixie.tf` (583 lines),
> STAGING.md operational docs, Finn armitage.tfvars, Bridgebuilder reviews from cycles 014-016
> (staging infrastructure + Docker build fixes)

---

## 1. Problem Statement

Dixie has a working Docker image (PR #58 merged, bridge-reviewed) and a healthy local staging
stack (postgres, redis, nats, dixie-bff all verified). But Dixie is NOT deployed to the shared
cloud staging environment. Finn is deployed and healthy at `finn-armitage.arrakis.community`.
The **autopoietic feedback loop cannot close** until Finn and Dixie are wired together on the
same network — Finn needs Dixie's reputation API to route scoring decisions, and Dixie needs
Finn's inference engine for chat completions.

### What Exists Today

| Component | Status |
|-----------|--------|
| Docker image | Working (multi-stage, `npm ci`, health check, PR #58) |
| Local staging | Healthy (docker compose, 4 services, postgres+redis+nats+dixie-bff) |
| Terraform (`dixie.tf`) | 583 lines, **hardcoded to production** (`dixie.thj.dev`, freeside EFS) |
| ECS cluster | `arrakis-staging-cluster` ACTIVE (9 services, 7 tasks) |
| Finn on Armitage | Deployed, healthy at `finn-armitage.arrakis.community` |
| RDS | `arrakis-staging-postgres` AVAILABLE |
| NATS | `arrakis-staging-nats` running in cluster |
| Tempo | `arrakis-staging-tempo` running in cluster |
| Dixie ECR repo | **DOES NOT EXIST** |
| Dixie SSM params | **DO NOT EXIST** |
| Dixie ALB rule | **DOES NOT EXIST** |

### Three-Ring Deployment Model

| Ring | Name | Purpose | Gate to Next |
|------|------|---------|-------------|
| 1 | **Armitage** | Dev staging, integration testing | Manual promote |
| 2 | **Chiba** | Pre-production, load testing | Automated canary |
| 3 | **Production** | Live traffic | — |

**This PRD covers Ring 1 (Armitage) only.**

---

## 2. Goals & Success Criteria

| Criterion | Metric |
|-----------|--------|
| `dixie-armitage.arrakis.community` returns 200 | Health endpoint responds |
| Finn can reach Dixie | Finn's health shows `dixie: healthy` |
| Dixie can reach Finn | Dixie's health shows `loa_finn: healthy, circuit_state: closed` |
| Dixie can reach PostgreSQL | Health shows `postgresql: healthy` |
| Dixie can reach Redis | Health shows `redis: healthy` |
| Dixie can reach NATS | Health shows `nats: healthy` |
| Terraform is environment-aware | `armitage.tfvars` + workspace isolation |
| Zero hardcoded production values | All values from vars/SSM |
| OTEL traces flow to Tempo | Spans visible in staging Tempo |

---

## 3. Shared Infrastructure Discovery

### Available on arrakis-staging-cluster (from AWS CLI)

| Resource | Value | Notes |
|----------|-------|-------|
| ECS Cluster | `arrakis-staging-cluster` | ACTIVE, 9 services |
| VPC | `vpc-0d08ce69dba7485da` | 10.1.0.0/16 |
| Private Subnets | `subnet-0a08a8fce7004ee11`, `subnet-07973b30fe8f675e7` | From Finn's tfvars |
| ALB | `arrakis-staging-alb` | HTTPS listener active |
| ALB Listener ARN | `arn:aws:elasticloadbalancing:us-east-1:891376933289:listener/app/arrakis-staging-alb/0d434b50265789c1/e6ff22557f66633c` | |
| ALB SG | `sg-007cdd539bcc3360c` | |
| ALB DNS | `arrakis-staging-alb-616899391.us-east-1.elb.amazonaws.com` | |
| ALB Zone ID | `Z35SXDOTRQ7X7K` | |
| Route53 Zone | `Z01194812Z6NUWBWMFB7T` | `arrakis.community` |
| RDS | `arrakis-staging-postgres.cho404os6nnb.us-east-1.rds.amazonaws.com` | PostgreSQL, AVAILABLE |
| NATS | `arrakis-staging-nats` service | Running in cluster |
| Tempo | `arrakis-staging-tempo` service | OTLP on 4317 |
| PgBouncer | `arrakis-staging-pgbouncer` | Desired=1, running=0 (unhealthy) |
| Finn | `loa-finn-armitage` | Running, priority 210 |
| Account | `891376933289` | arrakis-deployer |

### Finn's ALB Routing (current state)

| Priority | Host | Target |
|----------|------|--------|
| 210 | `finn-armitage.arrakis.community` | `loa-finn-armitage` TG |
| default | * | `arrakis-staging-api-tg` |

Dixie will add **priority 220**: `dixie-armitage.arrakis.community` → dixie TG.

---

## 4. Functional Requirements

### F1: Terraform Refactoring

Refactor `deploy/terraform/dixie.tf` from monolithic production config to environment-aware
multi-environment setup following Finn's patterns:

**F1.1: Backend Configuration**
- S3 backend: `honeyjar-terraform-state` bucket
- Key: `loa-dixie/terraform.tfstate`
- DynamoDB lock: `terraform-locks`
- Workspace isolation: `env:/{workspace}/loa-dixie/terraform.tfstate`

**F1.2: Environment-Aware Locals**
```hcl
locals {
  is_production = var.environment == "production"
  service_name  = local.is_production ? "dixie-bff" : "dixie-${var.environment}"
  hostname      = local.is_production ? "dixie.thj.dev" : "dixie-${var.environment}.arrakis.community"
  ssm_prefix    = "/dixie/${var.environment}"
  log_group     = "/ecs/${local.service_name}"
}
```

**F1.3: Split Into Files** (following Finn pattern)
- `variables.tf` — all variable definitions + backend
- `dixie-ecs.tf` — task definition, service, IAM roles
- `dixie-alb.tf` — target group, listener rule, Route53
- `dixie-env.tf` — SSM Parameter Store definitions
- `dixie-monitoring.tf` — CloudWatch alarms, SNS
- `environments/armitage.tfvars` — staging overrides

### F2: ECR Repository

Create `dixie-armitage` ECR repository:
- Image scanning: enabled on push
- Tag immutability: enabled (like Finn)
- Lifecycle policy: keep last 10 images

### F3: ECS Service Configuration

**Task Definition:**
- Family: `dixie-armitage` (environment-aware)
- CPU: 256, Memory: 512 (staging sizing)
- Port: 3001 (Dixie's port, not 3000 like Finn)
- Health check: `/api/health`
- Network mode: awsvpc

**Environment Variables (from env + SSM):**

| Variable | Source | Value |
|----------|--------|-------|
| `NODE_ENV` | env | `production` |
| `DIXIE_PORT` | env | `3001` |
| `DIXIE_ENVIRONMENT` | env | `armitage` |
| `FINN_URL` | SSM | `http://<finn-service-discovery>:3000` |
| `FINN_WS_URL` | SSM | `ws://<finn-service-discovery>:3000` |
| `DATABASE_URL` | SSM (SecureString) | `postgresql://dixie:<pw>@arrakis-staging-postgres...:5432/dixie` |
| `REDIS_URL` | SSM (SecureString) | `redis://<elasticache-endpoint>:6379` |
| `NATS_URL` | SSM | `nats://<nats-service-discovery>:4222` |
| `DIXIE_JWT_PRIVATE_KEY` | SSM (SecureString) | (generated) |
| `DIXIE_ADMIN_KEY` | SSM (SecureString) | (generated) |
| `DIXIE_CORS_ORIGINS` | SSM | `https://dixie-armitage.arrakis.community` |
| `DIXIE_ALLOWLIST_PATH` | env | `/app/allowlist.json` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | env | `http://tempo.arrakis.local:4317` |

**Service Configuration:**
- Desired count: 1
- Deployment: stop-before-start (100% max, 0% min) — like Finn
- Circuit breaker: enabled with rollback
- Private subnets only, no public IP

### F4: ALB Integration

- Target group: `dixie-armitage`, port 3001, HTTP, IP target type
- Health check: `/api/health`, 30s interval, 2 healthy / 3 unhealthy
- Listener rule: priority 220, host `dixie-armitage.arrakis.community`
- Route53: A record alias to ALB

### F5: Security Groups

```
ALB (sg-007cdd539bcc3360c)
  └─→ Dixie SG: port 3001 (HTTP)

Dixie SG egress:
  ├─→ Finn: port 3000 (10.0.0.0/8) — inference requests
  ├─→ PostgreSQL: port 5432 (RDS endpoint)
  ├─→ Redis: port 6379 (ElastiCache)
  ├─→ NATS: port 4222 (staging NATS)
  ├─→ Tempo: port 4317 (OTLP)
  └─→ HTTPS: port 443 (0.0.0.0/0) — external APIs

Finn SG ingress addition:
  └─→ From Dixie SG: port 3000 (service-to-service, not via ALB)
```

### F6: Database Setup

- Create database `dixie` on `arrakis-staging-postgres` RDS instance
- Create user `dixie` with password in SSM
- Migrations run automatically on ECS task startup (advisory lock pattern)
- PgBouncer connection optional (direct RDS endpoint for now since PgBouncer is unhealthy)

### F7: Redis (ElastiCache)

Option A: **Dedicated ElastiCache** (like Finn) — `cache.t4g.micro`, single node, Redis 7.1
Option B: **Shared Redis** if one exists in the cluster

Recommendation: **Dedicated** (Finn pattern) — isolation, independent lifecycle, `noeviction` policy.

### F8: Finn↔Dixie Connectivity

After Dixie deploys:
1. Update Finn's SSM: `/loa-finn/armitage/DIXIE_BASE_URL` → `http://<dixie-service>:3001`
2. Force Finn ECS service redeployment
3. Verify bidirectional health

Service discovery options:
- **Option A**: ECS Service Connect (AWS Cloud Map) — automatic DNS
- **Option B**: Internal ALB routing — `dixie-armitage.arrakis.community` via ALB
- **Option C**: Direct IP/task discovery — fragile, not recommended

Recommendation: **Option B** (ALB routing) — simplest, already proven with Finn, works for both
internal and external traffic. Dixie's ALB hostname resolves inside the VPC too.

### F9: Docker Image Build & Push

```bash
# 1. Build from repo root
docker build -f deploy/Dockerfile -t dixie-armitage .

# 2. Tag with git SHA
docker tag dixie-armitage:latest 891376933289.dkr.ecr.us-east-1.amazonaws.com/dixie-armitage:$(git rev-parse --short HEAD)

# 3. Auth + Push
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 891376933289.dkr.ecr.us-east-1.amazonaws.com
docker push 891376933289.dkr.ecr.us-east-1.amazonaws.com/dixie-armitage:$(git rev-parse --short HEAD)
```

### F10: Monitoring & Alarms

Following Finn's pattern:
1. **Health check failure** — HealthyHostCount < 1 for 3 evaluations
2. **Finn latency** — p95 response time > 5s for 5 minutes
3. **Circuit breaker open** — log metric filter on `circuit_state = "open"`
4. **Allowlist denied spike** — > 50 denied in 5 minutes
5. **CPU/Memory high** — > 80% for 15 minutes

---

## 5. Technical Constraints

| Constraint | Rationale |
|-----------|-----------|
| Single writer (desired_count=1) | PostgreSQL migrations use advisory locks |
| Stop-before-start deployment | Prevents dual-writer WAL corruption |
| Port 3001 (not 3000) | Dixie convention, distinct from Finn |
| SSM Parameter Store (not Secrets Manager) | Align with Finn; SSM has native ECS integration |
| Immutable ECR tags | Prevents tag mutation; use git SHA |
| Private subnets only | Public access via ALB, tasks never directly exposed |
| Region-conditioned IAM | All policies condition on `us-east-1` |

---

## 6. Implementation Sequence

| Step | Description | Prereq | AWS Resources Created |
|------|-------------|--------|----------------------|
| 1 | Create ECR repository | None | ECR repo |
| 2 | Build & push Docker image | ECR repo | ECR image |
| 3 | Create database on RDS | None | PG database + user |
| 4 | Refactor terraform (split files, env-aware) | None | No AWS resources |
| 5 | Create `armitage.tfvars` | Terraform refactor | No AWS resources |
| 6 | Seed SSM parameters | None | SSM params |
| 7 | `terraform apply` | Steps 1-6 | ECS service, TG, listener rule, SG, IAM, Route53, Redis, CW |
| 8 | Verify Dixie health | Terraform apply | None |
| 9 | Wire Finn↔Dixie | Dixie healthy | SSM update + Finn redeploy |
| 10 | Verify bidirectional connectivity | Wire complete | None |

---

## 7. Scope

### In Scope (this cycle)
- Terraform refactoring for multi-environment support
- ECR repository creation
- Docker image build and push
- ECS service deployment on Armitage ring
- ALB routing + Route53 DNS
- SSM parameter seeding
- Security group configuration
- Dedicated ElastiCache Redis
- Database creation on shared RDS
- NATS connectivity
- Finn↔Dixie wiring
- Basic CloudWatch monitoring

### Out of Scope
- Ring 2 (Chiba) deployment
- Production deployment
- CI/CD pipeline automation (GitHub Actions → ECR → ECS)
- Blue-green or canary deployment strategy
- Auto-scaling beyond basic CPU tracking
- Custom domain (production `dixie.thj.dev`)
- Disaster recovery / backup strategy
- Cost monitoring / budget alerts

---

## 8. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| PgBouncer unhealthy (running=0) | LOW | CONFIRMED | Use direct RDS endpoint; investigate PgBouncer separately |
| Finn SG doesn't allow Dixie ingress | HIGH | MEDIUM | Add SG rule; may need Finn terraform change |
| SSM parameter naming conflicts | MEDIUM | LOW | Follow `/dixie/armitage/*` convention |
| NATS service discovery DNS unknown | MEDIUM | MEDIUM | Discover via ECS service describe or Cloud Map |
| Docker image larger than Finn's (different deps) | LOW | LOW | Multi-stage build already optimized |
| Migration lock timeout on first deploy | MEDIUM | LOW | Advisory lock has timeout; task will retry |

---

## 9. Cross-Repo Coordination

### Finn Changes Required
1. **SSM Parameter**: `/loa-finn/armitage/DIXIE_BASE_URL` must be set/updated
2. **Security Group**: May need ingress rule from Dixie's SG on port 3000
3. **ECS Redeploy**: Force new deployment to pick up DIXIE_BASE_URL

### Hounfour
- No changes needed — Dixie already pins `github:0xHoneyJar/loa-hounfour#b6e0027a`
- Docker image includes hounfour via npm ci (verified in PR #58)

### Local Repos Available
- `/home/merlin/Documents/thj/code/loa-finn/` — reference terraform
- `/home/merlin/Documents/thj/code/loa-hounfour/` — protocol library
- `/home/merlin/Documents/thj/code/loa-freeside/` — arrakis infrastructure reference
- `/home/merlin/Documents/thj/code/loa-beauvoir/` — personality engine
- `/home/merlin/Documents/thj/code/loa-constructs/` — Loa framework

---

## 10. References

| Reference | Location |
|-----------|----------|
| Issue #59 | `https://github.com/0xHoneyJar/loa-dixie/issues/59` |
| Finn terraform | `/home/merlin/Documents/thj/code/loa-finn/infrastructure/terraform/` |
| Finn armitage.tfvars | `loa-finn/infrastructure/terraform/environments/armitage.tfvars` |
| Dixie existing terraform | `deploy/terraform/dixie.tf` (583 lines, production-only) |
| Dixie Dockerfile | `deploy/Dockerfile` (38 lines, multi-stage) |
| Dixie STAGING.md | `STAGING.md` (375 lines, operational docs) |
| PR #58 (Docker fixes) | `https://github.com/0xHoneyJar/loa-dixie/pull/58` |
| Finn staging | `https://finn-armitage.arrakis.community` |
