# Dixie BFF — Dedicated ElastiCache Redis
# Following Finn's pattern: subnet group, security group, parameter group, replication group.

# -------------------------------------------------------------------
# Subnet Group
# -------------------------------------------------------------------

resource "aws_elasticache_subnet_group" "dixie" {
  name       = "${local.service_name}-redis"
  subnet_ids = var.private_subnet_ids

  tags = local.common_tags
}

# -------------------------------------------------------------------
# Security Group (ingress from ECS tasks only)
# -------------------------------------------------------------------

resource "aws_security_group" "dixie_redis" {
  name        = "${local.service_name}-redis"
  vpc_id      = var.vpc_id
  description = "Dixie dedicated ElastiCache Redis"

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    description     = "Redis from Dixie ECS tasks"
    security_groups = [aws_security_group.dixie.id]
  }

  tags = merge(local.common_tags, {
    Name = "${local.service_name}-redis"
  })
}

# -------------------------------------------------------------------
# Parameter Group (noeviction — prevent silent data loss)
# -------------------------------------------------------------------

resource "aws_elasticache_parameter_group" "dixie" {
  name   = "${local.service_name}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "noeviction"
  }

  tags = local.common_tags
}

# -------------------------------------------------------------------
# Replication Group
# -------------------------------------------------------------------

resource "aws_elasticache_replication_group" "dixie" {
  replication_group_id = local.service_name
  description          = "Dixie BFF dedicated Redis - ${var.environment}"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.environment == "production" ? "cache.t4g.small" : "cache.t4g.micro"
  num_cache_clusters   = var.environment == "production" ? 2 : 1
  parameter_group_name = aws_elasticache_parameter_group.dixie.name

  subnet_group_name  = aws_elasticache_subnet_group.dixie.name
  security_group_ids = [aws_security_group.dixie_redis.id]

  port = 6379

  # TLS + encryption
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true

  # High availability (production only)
  multi_az_enabled           = var.environment == "production" ? true : false
  automatic_failover_enabled = var.environment == "production" ? true : false

  # Snapshots
  snapshot_retention_limit = var.environment == "production" ? 7 : 1

  tags = local.common_tags
}
