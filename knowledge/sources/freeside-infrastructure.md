---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-freeside
provenance: loa-freeside-pr-76
version: "1.0.0"
tags: ["technical", "architectural"]
max_age_days: 60
---

# Freeside Infrastructure

20 Terraform modules managing the shared AWS infrastructure. From loa-freeside PR #76.

---

## 1. Module Inventory

| Module | Purpose |
|--------|---------|
| `vpc` | VPC with public/private subnets, NAT gateway |
| `ecs-cluster` | ECS Fargate cluster with capacity providers |
| `alb` | Application Load Balancer with HTTPS listeners |
| `redis` | ElastiCache Redis cluster for sessions and caching |
| `rds` | RDS PostgreSQL for persistent data |
| `nats` | NATS JetStream server on ECS |
| `kms` | KMS keys for encryption at rest |
| `cloudwatch` | Log groups, metric alarms, dashboards |
| `tempo` | Grafana Tempo for distributed tracing |
| `efs` | Elastic File System for shared volumes |
| `pgbouncer` | Connection pooler for RDS |
| `secrets` | Secrets Manager entries |
| `iam` | IAM roles and policies for ECS tasks |
| `ecr` | ECR repositories for container images |
| `route53` | DNS records for service endpoints |
| `acm` | TLS certificates |
| `waf` | Web Application Firewall rules |
| `bastion` | Bastion host for SSH access |
| `monitoring` | Composite alarms and SNS topics |
| `budgets` | AWS budget alerts |

## 2. Dixie Deployment

Dixie deploys as a new ECS service using existing shared infrastructure:
- **ALB**: New listener rule for `dixie.thj.dev` host header
- **ECS**: New task definition (CPU: 256, Memory: 512MB)
- **EFS**: New access point at `/dixie-data` for allowlist + knowledge corpus
- **CloudWatch**: New log group `/ecs/dixie`
- **Secrets Manager**: JWT private key, admin key, finn S2S key
- **ECR**: New repository `dixie-bff`

## 3. Auto-Scaling

Dixie auto-scales based on CPU utilization:
- Min: 1 task, Max: 3 tasks
- Scale up at 70% CPU, scale down at 30%
- Cooldown: 60 seconds
