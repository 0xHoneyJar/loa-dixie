# Sprint Plan: Deploy Dixie to Armitage Ring — Terraform Refactoring

**Version**: 18.0.0
**Date**: 2026-02-28
**Cycle**: cycle-018
**PRD**: v18.0.0
**SDD**: v18.0.0

> Source: PRD §4 (10 functional requirements), SDD §2-8 (terraform file structure),
> Finn terraform reference (10 files), existing dixie.tf (583 lines, monolithic production config)

---

## Sprint 1: Terraform Refactoring — Environment-Aware Multi-File Split

**Goal**: Replace the monolithic 583-line `deploy/terraform/dixie.tf` with 6 environment-aware
terraform files following Finn's exact pattern, plus an `armitage.tfvars` for staging overrides.

**Approach**: Delete `dixie.tf` entirely. Create 6 new files from scratch using Finn as the
reference implementation, adapted for Dixie's specific needs (port 3001, SSM instead of Secrets
Manager, no EFS/KMS/DynamoDB/S3, dedicated ElastiCache Redis).

### Task 1.1: Create `variables.tf` — Backend, Provider, Variables, Locals

**Description**: Create the terraform backend configuration (S3 + DynamoDB), AWS provider with
default tags, all variable definitions, environment-aware locals, and workspace safety check.

**Acceptance Criteria**:
- [ ] S3 backend: bucket `honeyjar-terraform-state`, key `loa-dixie/terraform.tfstate`, DynamoDB locks
- [ ] Workspace key prefix `env` for workspace isolation
- [ ] Provider: `us-east-1`, default tags `Project=loa-dixie`, `ManagedBy=terraform`
- [ ] Variable `environment` with validation: `["production", "armitage"]`
- [ ] Variable `image_tag` with validation: `!= "latest"`
- [ ] All 15 variables from SDD §3.3 defined
- [ ] Locals: `service_name`, `hostname`, `ssm_prefix`, `ecs_cluster`, `common_tags`
- [ ] Workspace safety check (null_resource prevents workspace/environment mismatch)
- [ ] Data sources: `aws_caller_identity`, `aws_region`

### Task 1.2: Create `dixie-ecs.tf` — IAM, Security Group, Task Definition, ECS Service

**Description**: Create IAM roles (execution + task), security group with all required rules,
CloudWatch log group, ECS task definition with environment variables and SSM secrets,
and ECS service with stop-before-start deployment.

**Acceptance Criteria**:
- [ ] Execution role with `AmazonECSTaskExecutionRolePolicy` + SSM GetParameters inline policy
- [ ] Task role with SSM read + CloudWatch logs permissions (region-conditioned)
- [ ] Security group: ingress 3001 from ALB SG; egress 443/6379/5432/4222/4317
- [ ] Redis egress as standalone `aws_security_group_rule` (breaks SG cycle with ElastiCache)
- [ ] Log group `/ecs/${local.service_name}`, 30-day retention
- [ ] Task definition: Fargate, awsvpc, parameterized CPU/memory, port 3001
- [ ] Container: 5 environment vars (NODE_ENV, DIXIE_PORT, DIXIE_ENVIRONMENT, ALLOWLIST_PATH, OTEL)
- [ ] Container: 8 SSM secrets (FINN_URL, FINN_WS_URL, DATABASE_URL, REDIS_URL, NATS_URL, JWT, ADMIN, CORS)
- [ ] Health check: `fetch('http://localhost:3001/api/health')`, startPeriod=60
- [ ] ECS service: desired_count=1, stop-before-start (100%/0%), circuit breaker + rollback
- [ ] `lifecycle { prevent_destroy = true }`
- [ ] Desired count drift alarm (single-writer invariant)

### Task 1.3: Create `dixie-alb.tf` — Target Group, Listener Rule, Route53

**Description**: Create ALB target group for port 3001, host-based listener rule at
priority 220 (staging) / 200 (production), and Route53 A record alias.

**Acceptance Criteria**:
- [ ] Target group: `local.service_name`, port 3001, HTTP, IP target type
- [ ] Health check: `/api/health`, 30s interval, 2 healthy / 3 unhealthy, matcher "200"
- [ ] Deregistration delay 30s
- [ ] Listener rule: priority 220 for staging, 200 for production (environment-conditional)
- [ ] Host header condition: `local.hostname`
- [ ] Route53 A record alias to ALB (evaluate_target_health = true)

### Task 1.4: Create `dixie-env.tf` — SSM Parameter Store Definitions

**Description**: Create all SSM Parameter Store entries with PLACEHOLDER values and
`lifecycle { ignore_changes = [value] }` so operators set real values via AWS CLI.

**Acceptance Criteria**:
- [ ] 8 SSM parameters under `${local.ssm_prefix}/` path
- [ ] SecureString for: FINN_URL, FINN_WS_URL, DATABASE_URL, REDIS_URL, DIXIE_JWT_PRIVATE_KEY, DIXIE_ADMIN_KEY
- [ ] String for: NATS_URL, DIXIE_CORS_ORIGINS
- [ ] All parameters have `lifecycle { ignore_changes = [value] }`
- [ ] All parameters tagged with Environment + Service

### Task 1.5: Create `dixie-redis.tf` — Dedicated ElastiCache

**Description**: Create dedicated ElastiCache Redis following Finn's pattern — subnet group,
security group, parameter group (noeviction), and replication group with environment-aware sizing.

**Acceptance Criteria**:
- [ ] Subnet group: `dixie-{env}-redis`, same private subnets
- [ ] Security group: ingress 6379 from ECS SG only
- [ ] Parameter group: `dixie-{env}-redis7`, family `redis7`, `maxmemory-policy=noeviction`
- [ ] Replication group: Redis 7.1, `cache.t4g.micro` staging / `cache.t4g.small` production
- [ ] Staging: single node, no Multi-AZ, no auto-failover
- [ ] Production: 2 nodes, Multi-AZ, auto-failover
- [ ] TLS in transit + encryption at rest enabled
- [ ] Snapshot: 1-day staging, 7-day production

### Task 1.6: Create `dixie-monitoring.tf` — SNS, Alarms, Metric Filters

**Description**: Create SNS alarm topic, CloudWatch alarms (CPU, memory, unhealthy hosts,
Finn latency, circuit breaker), and log metric filters.

**Acceptance Criteria**:
- [ ] SNS topic `dixie-{env}-alarms` with optional email subscription
- [ ] CPU alarm: > 80%, 300s period, 3 evaluations
- [ ] Memory alarm: > 80%, 300s period, 3 evaluations
- [ ] Unhealthy hosts alarm: < 1, 60s period, 3 evaluations
- [ ] Finn latency alarm: p95 > 5s, 60s period, 5 evaluations
- [ ] Circuit breaker metric filter + alarm: `{ $.circuit_state = "open" }`
- [ ] Allowlist denied metric filter: `{ $.auth_type = "none" && $.action = "denied" }`
- [ ] Redis memory alarm: > 70%, 300s period, 3 evaluations
- [ ] All alarms/filters use environment-aware naming

### Task 1.7: Create `environments/armitage.tfvars` — Staging Overrides

**Description**: Create the armitage.tfvars file with all staging-specific values from
AWS infrastructure discovery.

**Acceptance Criteria**:
- [ ] `environment = "armitage"`
- [ ] `ecs_cluster_name = "arrakis-staging-cluster"`
- [ ] `dixie_cpu = 256`, `dixie_memory = 512`
- [ ] ECR repository URL for `dixie-armitage`
- [ ] VPC, subnet, ALB, Route53 values from discovery (SDD §12)
- [ ] `image_tag = "DEPLOY_SHA_REQUIRED"` (must be overridden at deploy time)

### Task 1.8: Delete `dixie.tf` and Validate

**Description**: Delete the old monolithic `deploy/terraform/dixie.tf` (583 lines).
Run `terraform fmt` and `terraform validate` on the new files. Ensure no duplicate
resource names or variable redeclarations.

**Acceptance Criteria**:
- [ ] `deploy/terraform/dixie.tf` deleted
- [ ] `terraform fmt -check` passes on all new files
- [ ] `terraform validate` passes (requires `terraform init` with backend config)
- [ ] No references to Secrets Manager (replaced by SSM)
- [ ] No references to EFS (removed for staging)
- [ ] No auto-scaling resources (removed for staging)
- [ ] All resource names use `local.service_name` or `local.hostname` (not hardcoded)

---

## Sprint Scope Summary

| Metric | Value |
|--------|-------|
| Files created | 7 (6 .tf + 1 .tfvars) |
| Files deleted | 1 (dixie.tf) |
| Lines removed | ~583 |
| Lines added | ~800 (estimated) |
| AWS resources managed | ~25 (ECR repo created separately) |

## Out of Sprint Scope (Manual Operations)

These are documented in the SDD but executed manually by the operator:

1. **ECR creation**: `aws ecr create-repository --repository-name dixie-armitage`
2. **Docker build & push**: `docker build + tag + push`
3. **Database setup**: `psql` on RDS to create `dixie` database + user
4. **Terraform workspace**: `terraform workspace new armitage`
5. **SSM seeding**: `aws ssm put-parameter` for each secret
6. **Terraform apply**: `terraform apply -var-file=environments/armitage.tfvars`
7. **Finn wiring**: Update Finn's DIXIE_BASE_URL SSM + force redeploy
8. **Health verification**: `curl` both health endpoints

## Dependencies

- No code dependencies between tasks (all can be implemented in parallel)
- Task 1.8 (delete + validate) depends on Tasks 1.1-1.7 being complete

## Risk Notes

- Terraform `validate` requires `terraform init` which needs AWS credentials and the S3 backend
- The `null_resource` for workspace check requires the `hashicorp/null` provider
- ElastiCache creation takes ~10 minutes; first `terraform apply` may take a while
- NATS URL will need discovery via `aws ecs describe-tasks` after deploy
