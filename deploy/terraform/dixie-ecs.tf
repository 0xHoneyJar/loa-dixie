# Dixie BFF — ECS Task Definition, Service, IAM, Security Group
# Single-writer WAL architecture: desired_count=1, stop-before-start deployment.

# -------------------------------------------------------------------
# IAM — Execution Role (pulls images, reads SSM secrets)
# -------------------------------------------------------------------

resource "aws_iam_role" "dixie_execution" {
  name = "${local.service_name}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "dixie_execution" {
  role       = aws_iam_role.dixie_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "dixie_execution_ssm" {
  name = "${local.service_name}-execution-ssm"
  role = aws_iam_role.dixie_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/*"
      }
    ]
  })
}

# -------------------------------------------------------------------
# IAM — Task Role (runtime permissions for the application)
# -------------------------------------------------------------------

resource "aws_iam_role" "dixie_task" {
  name = "${local.service_name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "dixie_task_permissions" {
  name = "${local.service_name}-task-permissions"
  role = aws_iam_role.dixie_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:us-east-1:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.dixie.arn}:*"
      }
    ]
  })
}

# -------------------------------------------------------------------
# Security Group
# -------------------------------------------------------------------

resource "aws_security_group" "dixie" {
  name        = "${local.service_name}-ecs"
  vpc_id      = var.vpc_id
  description = "Dixie BFF ECS task security group"

  # Ingress from ALB on port 3001
  ingress {
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    description     = "ALB to Dixie"
    security_groups = [var.alb_security_group_id]
  }

  # Egress HTTPS (external APIs, ALB for Finn connectivity)
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    description = "HTTPS outbound (external APIs, Finn via ALB)"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress to PostgreSQL (RDS)
  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    description = "PostgreSQL RDS"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Egress to NATS
  egress {
    from_port   = 4222
    to_port     = 4222
    protocol    = "tcp"
    description = "NATS messaging"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Egress to Tempo (OTLP gRPC)
  egress {
    from_port   = 4317
    to_port     = 4317
    protocol    = "tcp"
    description = "OTLP gRPC to Tempo"
    cidr_blocks = ["10.0.0.0/8"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.service_name}-ecs"
  })
}

# Standalone rule: Redis egress (breaks SG cycle with ElastiCache SG)
resource "aws_security_group_rule" "dixie_redis_egress" {
  type                     = "egress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  description              = "Redis ElastiCache"
  security_group_id        = aws_security_group.dixie.id
  source_security_group_id = aws_security_group.dixie_redis.id
}

# -------------------------------------------------------------------
# CloudWatch Log Group
# -------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "dixie" {
  name              = "/ecs/${local.service_name}"
  retention_in_days = 30

  tags = local.common_tags
}

# -------------------------------------------------------------------
# ECS Task Definition
# -------------------------------------------------------------------

resource "aws_ecs_task_definition" "dixie" {
  family                   = local.service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.dixie_cpu
  memory                   = var.dixie_memory
  execution_role_arn       = aws_iam_role.dixie_execution.arn
  task_role_arn            = aws_iam_role.dixie_task.arn

  container_definitions = jsonencode([
    {
      name      = "dixie-bff"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "DIXIE_PORT", value = "3001" },
        { name = "DIXIE_ENVIRONMENT", value = var.environment },
        { name = "DIXIE_ALLOWLIST_PATH", value = "/app/allowlist.json" },
        { name = "OTEL_EXPORTER_OTLP_ENDPOINT", value = "http://tempo.arrakis.local:4317" }
      ]

      secrets = [
        { name = "FINN_URL", valueFrom = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/FINN_URL" },
        { name = "FINN_WS_URL", valueFrom = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/FINN_WS_URL" },
        { name = "DATABASE_URL", valueFrom = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/DATABASE_URL" },
        { name = "REDIS_URL", valueFrom = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/REDIS_URL" },
        { name = "NATS_URL", valueFrom = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/NATS_URL" },
        { name = "DIXIE_JWT_PRIVATE_KEY", valueFrom = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/DIXIE_JWT_PRIVATE_KEY" },
        { name = "DIXIE_ADMIN_KEY", valueFrom = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/DIXIE_ADMIN_KEY" },
        { name = "DIXIE_CORS_ORIGINS", valueFrom = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/DIXIE_CORS_ORIGINS" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${local.service_name}"
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "dixie"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"fetch('http://localhost:3001/api/health').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = local.common_tags
}

# -------------------------------------------------------------------
# ECS Service
# -------------------------------------------------------------------

resource "aws_ecs_service" "dixie" {
  name            = local.service_name
  cluster         = local.ecs_cluster
  task_definition = aws_ecs_task_definition.dixie.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Stop-before-start: prevent dual-writer window (WAL invariant)
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.dixie.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.dixie.arn
    container_name   = "dixie-bff"
    container_port   = 3001
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = local.common_tags
}

# -------------------------------------------------------------------
# Desired Count Drift Alarm (single-writer invariant)
# -------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "dixie_desired_count_drift" {
  alarm_name          = "${local.service_name}-desired-count-drift"
  alarm_description   = "Dixie desired count exceeds 1 — WAL single-writer invariant violated"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DesiredTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1

  dimensions = {
    ClusterName = local.ecs_cluster
    ServiceName = local.service_name
  }

  alarm_actions = [aws_sns_topic.dixie_alarms.arn]

  tags = local.common_tags
}
