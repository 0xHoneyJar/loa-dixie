# Dixie BFF — ECS Task Definition, Service, ALB Rule, and supporting resources.
# Deploys onto freeside's shared infrastructure (VPC, ECS Cluster, ALB, Redis, EFS).

# -------------------------------------------------------------------
# Variables (expected from freeside's root module or terraform.tfvars)
# -------------------------------------------------------------------

variable "dixie_image" {
  description = "ECR image URI for dixie-bff"
  type        = string
}

variable "dixie_image_tag" {
  description = "Container image tag"
  type        = string
  default     = "latest"
}

variable "ecs_cluster_id" {
  description = "ECS cluster ID from freeside"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID from freeside"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for task placement"
  type        = list(string)
}

variable "alb_listener_arn" {
  description = "HTTPS ALB listener ARN from freeside"
  type        = string
}

variable "efs_id" {
  description = "EFS filesystem ID from freeside"
  type        = string
}

variable "finn_service_url" {
  description = "loa-finn internal service URL"
  type        = string
  default     = "http://finn.freeside.local:3000"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "redis_url" {
  description = "Redis connection string (Phase 2: rate limiting, caching)"
  type        = string
  default     = ""
}

variable "nats_url" {
  description = "NATS server URL (Phase 2: signal emitter)"
  type        = string
  default     = ""
}

# -------------------------------------------------------------------
# CloudWatch Log Group
# -------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "dixie" {
  name              = "/ecs/dixie"
  retention_in_days = 30

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

# -------------------------------------------------------------------
# EFS Access Point
# -------------------------------------------------------------------

resource "aws_efs_access_point" "dixie_data" {
  file_system_id = var.efs_id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/dixie-data"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }

  tags = {
    Name        = "dixie-data"
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

# -------------------------------------------------------------------
# Secrets Manager References
# -------------------------------------------------------------------

data "aws_secretsmanager_secret" "dixie_jwt_key" {
  name = "dixie/jwt-private-key"
}

data "aws_secretsmanager_secret" "dixie_admin_key" {
  name = "dixie/admin-key"
}

data "aws_secretsmanager_secret" "dixie_database_url" {
  name = "dixie/database-url"
}

# -------------------------------------------------------------------
# Security Group
# -------------------------------------------------------------------

resource "aws_security_group" "dixie" {
  name_prefix = "dixie-"
  vpc_id      = var.vpc_id
  description = "Dixie BFF security group"

  # Ingress from ALB on port 3001
  ingress {
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    description     = "ALB to Dixie"
    security_groups = [] # Populated by ALB SG reference in root module
  }

  # Egress to loa-finn
  egress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    description = "Dixie to loa-finn"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Egress HTTPS (external APIs)
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    description = "HTTPS outbound"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress to EFS
  egress {
    from_port   = 2049
    to_port     = 2049
    protocol    = "tcp"
    description = "NFS to EFS"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Egress to Tempo
  egress {
    from_port   = 4317
    to_port     = 4317
    protocol    = "tcp"
    description = "OTLP gRPC to Tempo"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Egress to PostgreSQL
  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    description = "Dixie to PostgreSQL"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Egress to Redis
  egress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    description = "Dixie to Redis"
    cidr_blocks = ["10.0.0.0/8"]
  }

  # Egress to NATS
  egress {
    from_port   = 4222
    to_port     = 4222
    protocol    = "tcp"
    description = "Dixie to NATS"
    cidr_blocks = ["10.0.0.0/8"]
  }

  tags = {
    Name        = "dixie-bff"
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

# -------------------------------------------------------------------
# IAM Role for ECS Task
# -------------------------------------------------------------------

resource "aws_iam_role" "dixie_task" {
  name = "dixie-task-role"

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

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "dixie_secrets" {
  name = "dixie-secrets-access"
  role = aws_iam_role.dixie_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          data.aws_secretsmanager_secret.dixie_jwt_key.arn,
          data.aws_secretsmanager_secret.dixie_admin_key.arn,
          data.aws_secretsmanager_secret.dixie_database_url.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role" "dixie_execution" {
  name = "dixie-execution-role"

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

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "dixie_execution" {
  role       = aws_iam_role.dixie_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# -------------------------------------------------------------------
# ECS Task Definition
# -------------------------------------------------------------------

resource "aws_ecs_task_definition" "dixie" {
  family                   = "dixie-bff"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.dixie_execution.arn
  task_role_arn            = aws_iam_role.dixie_task.arn

  volume {
    name = "dixie-data"

    efs_volume_configuration {
      file_system_id     = var.efs_id
      transit_encryption = "ENABLED"
      authorization_configuration {
        access_point_id = aws_efs_access_point.dixie_data.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "dixie-bff"
      image     = "${var.dixie_image}:${var.dixie_image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "DIXIE_PORT", value = "3001" },
        { name = "FINN_URL", value = var.finn_service_url },
        { name = "NODE_ENV", value = var.environment },
        { name = "DIXIE_ALLOWLIST_PATH", value = "/data/allowlist.json" },
        { name = "OTEL_EXPORTER_OTLP_ENDPOINT", value = "http://tempo.freeside.local:4317" },
        { name = "REDIS_URL", value = var.redis_url },
        { name = "NATS_URL", value = var.nats_url }
      ]

      secrets = [
        {
          name      = "DIXIE_JWT_PRIVATE_KEY"
          valueFrom = data.aws_secretsmanager_secret.dixie_jwt_key.arn
        },
        {
          name      = "DIXIE_ADMIN_KEY"
          valueFrom = data.aws_secretsmanager_secret.dixie_admin_key.arn
        },
        {
          name      = "DATABASE_URL"
          valueFrom = data.aws_secretsmanager_secret.dixie_database_url.arn
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "dixie-data"
          containerPath = "/data"
          readOnly      = false
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.dixie.name
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "dixie"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"fetch('http://localhost:3001/api/health').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 10
      }
    }
  ])

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

# -------------------------------------------------------------------
# ECS Service
# -------------------------------------------------------------------

resource "aws_ecs_service" "dixie" {
  name            = "dixie-bff"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.dixie.arn
  desired_count   = 1
  launch_type     = "FARGATE"

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

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

# -------------------------------------------------------------------
# ALB Target Group + Listener Rule
# -------------------------------------------------------------------

resource "aws_lb_target_group" "dixie" {
  name        = "dixie-bff"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

resource "aws_lb_listener_rule" "dixie" {
  listener_arn = var.alb_listener_arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dixie.arn
  }

  condition {
    host_header {
      values = ["dixie.thj.dev"]
    }
  }

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

# -------------------------------------------------------------------
# Auto-Scaling
# -------------------------------------------------------------------

resource "aws_appautoscaling_target" "dixie" {
  max_capacity       = 3
  min_capacity       = 1
  resource_id        = "service/${var.ecs_cluster_id}/${aws_ecs_service.dixie.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "dixie_cpu" {
  name               = "dixie-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dixie.resource_id
  scalable_dimension = aws_appautoscaling_target.dixie.scalable_dimension
  service_namespace  = aws_appautoscaling_target.dixie.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}

# -------------------------------------------------------------------
# SNS Topic for Alarms
# -------------------------------------------------------------------

resource "aws_sns_topic" "dixie_alarms" {
  name = "dixie-alarms"

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

# -------------------------------------------------------------------
# CloudWatch Alarms
# -------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "dixie_unhealthy" {
  alarm_name          = "DixieBFFUnhealthy"
  alarm_description   = "Dixie BFF health check failing for 3 consecutive evaluations"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1

  dimensions = {
    TargetGroup  = aws_lb_target_group.dixie.arn_suffix
    LoadBalancer = "" # Populated by root module
  }

  alarm_actions = [aws_sns_topic.dixie_alarms.arn]
  ok_actions    = [aws_sns_topic.dixie_alarms.arn]

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "dixie_finn_latency_high" {
  alarm_name          = "DixieFinnLatencyHigh"
  alarm_description   = "loa-finn proxy latency p95 exceeds 5 seconds for 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p95"
  threshold           = 5

  dimensions = {
    TargetGroup  = aws_lb_target_group.dixie.arn_suffix
    LoadBalancer = ""
  }

  alarm_actions = [aws_sns_topic.dixie_alarms.arn]
  ok_actions    = [aws_sns_topic.dixie_alarms.arn]

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_metric_filter" "dixie_circuit_open" {
  name           = "DixieCircuitOpen"
  pattern        = "{ $.circuit_state = \"open\" }"
  log_group_name = aws_cloudwatch_log_group.dixie.name

  metric_transformation {
    name      = "CircuitBreakerOpen"
    namespace = "Dixie/BFF"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "dixie_circuit_open" {
  alarm_name          = "DixieFinnCircuitOpen"
  alarm_description   = "Circuit breaker to loa-finn has been open for over 1 minute"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "CircuitBreakerOpen"
  namespace           = "Dixie/BFF"
  period              = 60
  statistic           = "Sum"
  threshold           = 0

  alarm_actions = [aws_sns_topic.dixie_alarms.arn]
  ok_actions    = [aws_sns_topic.dixie_alarms.arn]

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_metric_filter" "dixie_allowlist_denied" {
  name           = "DixieAllowlistDenied"
  pattern        = "{ $.auth_type = \"none\" && $.action = \"denied\" }"
  log_group_name = aws_cloudwatch_log_group.dixie.name

  metric_transformation {
    name      = "AllowlistDenied"
    namespace = "Dixie/BFF"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "dixie_allowlist_denied_spike" {
  alarm_name          = "DixieAllowlistDeniedSpike"
  alarm_description   = "More than 50 unauthorized requests denied in 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "AllowlistDenied"
  namespace           = "Dixie/BFF"
  period              = 300
  statistic           = "Sum"
  threshold           = 50

  alarm_actions = [aws_sns_topic.dixie_alarms.arn]

  tags = {
    Service     = "dixie-bff"
    Environment = var.environment
  }
}

# -------------------------------------------------------------------
# Outputs
# -------------------------------------------------------------------

output "dixie_service_url" {
  description = "Dixie BFF service URL"
  value       = "https://dixie.thj.dev"
}

output "dixie_task_definition_arn" {
  description = "ECS task definition ARN"
  value       = aws_ecs_task_definition.dixie.arn
}
