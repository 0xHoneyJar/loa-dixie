# Dixie BFF — CloudWatch Monitoring, SNS Alarms, Log Metric Filters

# -------------------------------------------------------------------
# SNS Topic
# -------------------------------------------------------------------

resource "aws_sns_topic" "dixie_alarms" {
  name = "${local.service_name}-alarms"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "dixie_alarm_email" {
  count     = var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.dixie_alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# -------------------------------------------------------------------
# ECS Alarms
# -------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "dixie_cpu_high" {
  alarm_name          = "${local.service_name}-cpu-high"
  alarm_description   = "Dixie CPU utilization > 80% for 15 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    ClusterName = local.ecs_cluster
    ServiceName = local.service_name
  }

  alarm_actions = [aws_sns_topic.dixie_alarms.arn]
  ok_actions    = [aws_sns_topic.dixie_alarms.arn]

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "dixie_memory_high" {
  alarm_name          = "${local.service_name}-memory-high"
  alarm_description   = "Dixie memory utilization > 80% for 15 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    ClusterName = local.ecs_cluster
    ServiceName = local.service_name
  }

  alarm_actions = [aws_sns_topic.dixie_alarms.arn]
  ok_actions    = [aws_sns_topic.dixie_alarms.arn]

  tags = local.common_tags
}

# -------------------------------------------------------------------
# ALB Alarms
# -------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "dixie_unhealthy_hosts" {
  alarm_name          = "${local.service_name}-unhealthy-hosts"
  alarm_description   = "Dixie has no healthy ALB targets for 3 minutes"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1

  dimensions = {
    TargetGroup  = aws_lb_target_group.dixie.arn_suffix
    LoadBalancer = regex("app/.*", var.alb_arn)
  }

  alarm_actions = [aws_sns_topic.dixie_alarms.arn]
  ok_actions    = [aws_sns_topic.dixie_alarms.arn]

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "dixie_finn_latency" {
  alarm_name          = "${local.service_name}-finn-latency-p95"
  alarm_description   = "Dixie ALB p95 response time > 5s for 5 minutes (Finn proxy latency)"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p95"
  threshold           = 5

  dimensions = {
    TargetGroup  = aws_lb_target_group.dixie.arn_suffix
    LoadBalancer = regex("app/.*", var.alb_arn)
  }

  alarm_actions = [aws_sns_topic.dixie_alarms.arn]
  ok_actions    = [aws_sns_topic.dixie_alarms.arn]

  tags = local.common_tags
}

# -------------------------------------------------------------------
# Redis Alarm
# -------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "dixie_redis_memory" {
  alarm_name          = "${local.service_name}-redis-memory-high"
  alarm_description   = "Dixie Redis memory usage > 70% for 15 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 70

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.dixie.id
  }

  alarm_actions = [aws_sns_topic.dixie_alarms.arn]
  ok_actions    = [aws_sns_topic.dixie_alarms.arn]

  tags = local.common_tags
}

# -------------------------------------------------------------------
# Log Metric Filters
# -------------------------------------------------------------------

resource "aws_cloudwatch_log_metric_filter" "dixie_circuit_open" {
  name           = "${local.service_name}-circuit-breaker-open"
  pattern        = "{ $.circuit_state = \"open\" }"
  log_group_name = aws_cloudwatch_log_group.dixie.name

  metric_transformation {
    name      = "CircuitBreakerOpen"
    namespace = "Dixie/${var.environment}"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "dixie_circuit_open" {
  alarm_name          = "${local.service_name}-circuit-breaker-open"
  alarm_description   = "Finn circuit breaker is open — inference requests failing"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "CircuitBreakerOpen"
  namespace           = "Dixie/${var.environment}"
  period              = 60
  statistic           = "Sum"
  threshold           = 0

  alarm_actions = [aws_sns_topic.dixie_alarms.arn]
  ok_actions    = [aws_sns_topic.dixie_alarms.arn]

  tags = local.common_tags
}

resource "aws_cloudwatch_log_metric_filter" "dixie_allowlist_denied" {
  name           = "${local.service_name}-allowlist-denied"
  pattern        = "{ $.auth_type = \"none\" && $.action = \"denied\" }"
  log_group_name = aws_cloudwatch_log_group.dixie.name

  metric_transformation {
    name      = "AllowlistDenied"
    namespace = "Dixie/${var.environment}"
    value     = "1"
  }
}
