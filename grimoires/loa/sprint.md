# Sprint Plan: Deploy Dixie to Armitage Ring

**Version**: 18.1.0
**Date**: 2026-02-27
**Cycle**: cycle-018
**PRD**: v18.0.0
**SDD**: v18.0.0

> Source: PRD §4 (10 functional requirements), SDD §9-13 (deployment sequence),
> freeside #105 (canonical deployment), dixie #59 (deployment scope),
> Finn deployment pattern (loa-finn-armitage on arrakis-staging-cluster)

---

## Sprint 1: Terraform Refactoring — Environment-Aware Multi-File Split

**Global ID**: 113
**Status**: COMPLETED (PR #60)

Replaced monolithic 583-line `dixie.tf` with 6 environment-aware terraform files + `armitage.tfvars`.
- `terraform fmt` ✓, `terraform validate` ✓, 2373 tests pass ✓

---

## Sprint 2: Armitage Deployment — ECR, Docker, Terraform Apply, SSM, Wiring

**Global ID**: 114
**Goal**: Deploy Dixie to `arrakis-staging-cluster` using the terraform from Sprint 1.
Create ECR repository, build+push Docker image, initialize terraform workspace,
seed SSM parameters, apply infrastructure, create database, and wire Finn↔Dixie.

**Branch**: `feature/dixie-mvp` (same as Sprint 1)

**Acceptance Criteria**:
- `dixie-armitage.arrakis.community` resolves and health endpoint returns 200
- ECS service `dixie-armitage` running with 1 healthy task
- Finn↔Dixie connectivity verified (bidirectional health)
- All 13 database migrations run successfully

### Task 2.1: Create ECR Repository

**Description**: Create the ECR repository for dixie-armitage with immutable tags and scan-on-push.

**Commands**:
```bash
aws ecr create-repository \
  --repository-name dixie-armitage \
  --image-scanning-configuration scanOnPush=true \
  --image-tag-mutability IMMUTABLE \
  --region us-east-1

aws ecr put-lifecycle-policy \
  --repository-name dixie-armitage \
  --lifecycle-policy-text '{"rules":[{"rulePriority":1,"description":"Keep last 10","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},"action":{"type":"expire"}}]}'
```

**Acceptance Criteria**:
- [ ] ECR repository `dixie-armitage` exists in `891376933289.dkr.ecr.us-east-1.amazonaws.com`
- [ ] Lifecycle policy retains last 10 images

### Task 2.2: Build & Push Docker Image

**Description**: Build the Docker image from loa-dixie and push to ECR with git SHA tag.

**Commands**:
```bash
IMAGE_TAG=$(git rev-parse --short HEAD)
ECR_URL="891376933289.dkr.ecr.us-east-1.amazonaws.com/dixie-armitage"

docker build -f deploy/Dockerfile -t dixie-armitage .
docker tag dixie-armitage:latest ${ECR_URL}:${IMAGE_TAG}

aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 891376933289.dkr.ecr.us-east-1.amazonaws.com

docker push ${ECR_URL}:${IMAGE_TAG}
```

**Acceptance Criteria**:
- [ ] Docker image builds successfully (tested in Sprint 1)
- [ ] Image pushed to ECR with git SHA tag (not `latest`)
- [ ] ECR scan shows no CRITICAL vulnerabilities

### Task 2.3: Create Database on RDS

**Description**: Connect to `arrakis-staging-postgres` RDS and create the `dixie` database and user.

**Steps**:
1. Discover RDS endpoint: `aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, \`staging\`)].Endpoint'`
2. Connect via PgBouncer or direct: `psql -h <endpoint> -U <admin_user> -d postgres`
3. Create database + user:
```sql
CREATE DATABASE dixie;
CREATE USER dixie WITH PASSWORD '<generated-password>';
GRANT ALL PRIVILEGES ON DATABASE dixie TO dixie;
\c dixie
GRANT ALL ON SCHEMA public TO dixie;
```

**Acceptance Criteria**:
- [ ] Database `dixie` exists on RDS
- [ ] User `dixie` can connect and create tables
- [ ] DATABASE_URL connection string verified

### Task 2.4: Initialize Terraform & Apply

**Description**: Initialize terraform workspace and apply infrastructure.

**Commands**:
```bash
cd deploy/terraform
terraform init
terraform workspace new armitage || terraform workspace select armitage

# Plan with the deployed image tag
terraform plan \
  -var-file=environments/armitage.tfvars \
  -var="image_tag=${IMAGE_TAG}"

# Review plan, then apply
terraform apply \
  -var-file=environments/armitage.tfvars \
  -var="image_tag=${IMAGE_TAG}"
```

**Acceptance Criteria**:
- [ ] `terraform init` connects to S3 backend
- [ ] Workspace `armitage` created/selected
- [ ] `terraform plan` shows ~25 resources to create
- [ ] `terraform apply` completes successfully
- [ ] ElastiCache Redis replication group created
- [ ] ECS service created (will start failing until SSM params are seeded)

### Task 2.5: Seed SSM Parameters

**Description**: Populate all 8 SSM parameters with real values. The terraform created
PLACEHOLDERs; now we set actual connection strings and secrets.

**Parameters to seed**:
```bash
SSM_PREFIX="/dixie/armitage"

# Discover values first
REDIS_ENDPOINT=$(aws elasticache describe-replication-groups \
  --replication-group-id dixie-armitage \
  --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.{Address:Address,Port:Port}' \
  --output text)

# 1. Finn URL (via ALB — not Cloud Map)
aws ssm put-parameter --name "${SSM_PREFIX}/FINN_URL" \
  --value "https://finn-armitage.arrakis.community" \
  --type SecureString --overwrite

# 2. Finn WebSocket URL
aws ssm put-parameter --name "${SSM_PREFIX}/FINN_WS_URL" \
  --value "wss://finn-armitage.arrakis.community" \
  --type SecureString --overwrite

# 3. Database URL (from Task 2.3)
aws ssm put-parameter --name "${SSM_PREFIX}/DATABASE_URL" \
  --value "postgresql://dixie:<password>@<rds-endpoint>:5432/dixie" \
  --type SecureString --overwrite

# 4. Redis URL (TLS endpoint from ElastiCache)
aws ssm put-parameter --name "${SSM_PREFIX}/REDIS_URL" \
  --value "rediss://${REDIS_ENDPOINT}:6379" \
  --type SecureString --overwrite

# 5. NATS URL (discover from ECS tasks)
NATS_TASK=$(aws ecs list-tasks --cluster arrakis-staging-cluster \
  --service-name arrakis-staging-nats --query 'taskArns[0]' --output text)
NATS_IP=$(aws ecs describe-tasks --cluster arrakis-staging-cluster \
  --tasks ${NATS_TASK} \
  --query 'tasks[0].attachments[0].details[?name==`privateIPv4Address`].value' --output text)
aws ssm put-parameter --name "${SSM_PREFIX}/NATS_URL" \
  --value "nats://${NATS_IP}:4222" \
  --type String --overwrite

# 6. JWT Private Key (generate 64-char secret)
JWT_KEY=$(openssl rand -hex 32)
aws ssm put-parameter --name "${SSM_PREFIX}/DIXIE_JWT_PRIVATE_KEY" \
  --value "${JWT_KEY}" \
  --type SecureString --overwrite

# 7. Admin Key
ADMIN_KEY=$(openssl rand -hex 32)
aws ssm put-parameter --name "${SSM_PREFIX}/DIXIE_ADMIN_KEY" \
  --value "${ADMIN_KEY}" \
  --type SecureString --overwrite

# 8. CORS Origins
aws ssm put-parameter --name "${SSM_PREFIX}/DIXIE_CORS_ORIGINS" \
  --value "https://dixie-armitage.arrakis.community" \
  --type String --overwrite
```

**Acceptance Criteria**:
- [ ] All 8 SSM parameters populated with real values
- [ ] `aws ssm get-parameters-by-path --path /dixie/armitage --recursive` returns 8 params
- [ ] DATABASE_URL connectivity verified
- [ ] Redis endpoint reachable (ElastiCache may take ~10 min)

### Task 2.6: Force ECS Deployment & Verify

**Description**: After SSM params are seeded, force a new ECS deployment so the task
picks up the real secret values. Wait for health check to pass.

**Commands**:
```bash
aws ecs update-service \
  --cluster arrakis-staging-cluster \
  --service dixie-armitage \
  --force-new-deployment

# Wait for service to stabilize
aws ecs wait services-stable \
  --cluster arrakis-staging-cluster \
  --services dixie-armitage

# Check health
curl -s https://dixie-armitage.arrakis.community/api/health | jq .
```

**Acceptance Criteria**:
- [ ] ECS service has 1 running task
- [ ] Health endpoint returns `{ "status": "healthy" }`
- [ ] CloudWatch logs show successful startup + migration run
- [ ] No circuit breaker rollbacks in deployment

### Task 2.7: Wire Finn → Dixie

**Description**: Update Finn's SSM parameter so it knows where Dixie is, then force Finn redeploy.

**Commands**:
```bash
# Set DIXIE_BASE_URL in Finn's SSM
aws ssm put-parameter \
  --name "/loa-finn/armitage/DIXIE_BASE_URL" \
  --value "https://dixie-armitage.arrakis.community" \
  --type SecureString --overwrite

# Force Finn redeploy to pick up new parameter
aws ecs update-service \
  --cluster arrakis-staging-cluster \
  --service loa-finn-armitage \
  --force-new-deployment

# Wait for Finn to stabilize
aws ecs wait services-stable \
  --cluster arrakis-staging-cluster \
  --services loa-finn-armitage
```

**Acceptance Criteria**:
- [ ] Finn SSM param `/loa-finn/armitage/DIXIE_BASE_URL` set
- [ ] Finn redeployed and healthy
- [ ] Finn health shows Dixie connectivity

### Task 2.8: End-to-End Validation

**Description**: Verify both services are healthy, DNS resolves, and bidirectional
connectivity works.

**Commands**:
```bash
# 1. DNS resolution
nslookup dixie-armitage.arrakis.community

# 2. Dixie health (should show finn: healthy, circuit_state: closed)
curl -sf https://dixie-armitage.arrakis.community/api/health | jq .

# 3. Finn health (should show dixie: connected)
curl -sf https://finn-armitage.arrakis.community/health | jq .

# 4. Dixie migrations ran
curl -sf https://dixie-armitage.arrakis.community/api/health | jq '.services'

# 5. Redis connectivity
curl -sf https://dixie-armitage.arrakis.community/api/health | jq '.infrastructure'
```

**Acceptance Criteria**:
- [ ] `dixie-armitage.arrakis.community` resolves to ALB
- [ ] Dixie health: `status: healthy`, Finn circuit closed
- [ ] Finn health: Dixie connected
- [ ] Database migrations completed (13 migrations)
- [ ] Redis connected
- [ ] No CloudWatch alarm firing

---

## Dependency Graph

```
T2.1 (ECR) ──→ T2.2 (Docker push)
T2.3 (Database) ─────────────────→ T2.5 (SSM seed)
T2.2 ──→ T2.4 (Terraform apply) → T2.5 → T2.6 (Deploy) → T2.7 (Wire Finn) → T2.8 (Validate)
```

## Risk Notes

- **ElastiCache creation**: Takes ~10-15 minutes; `terraform apply` will block
- **NATS discovery**: NATS IP may change on task restart; consider Cloud Map or service discovery
- **PgBouncer vs direct RDS**: Check if dixie should connect through PgBouncer (freeside's staging has it)
- **Health check timing**: startPeriod=60 gives migrations time, but first deploy may need patience
- **DNS propagation**: Route53 A record alias may take a few minutes to propagate
