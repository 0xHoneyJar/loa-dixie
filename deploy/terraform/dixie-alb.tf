# Dixie BFF — ALB Target Group, Listener Rule, Route53 DNS

# -------------------------------------------------------------------
# Target Group
# -------------------------------------------------------------------

resource "aws_lb_target_group" "dixie" {
  name                 = local.service_name
  port                 = 3001
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 30

  health_check {
    path                = "/api/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = local.common_tags
}

# -------------------------------------------------------------------
# Listener Rule (host-based routing)
# -------------------------------------------------------------------

resource "aws_lb_listener_rule" "dixie" {
  listener_arn = var.alb_listener_arn
  priority     = var.environment == "production" ? 200 : 220

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dixie.arn
  }

  condition {
    host_header {
      values = [local.hostname]
    }
  }

  tags = local.common_tags
}

# -------------------------------------------------------------------
# Route53 DNS Record
# -------------------------------------------------------------------

resource "aws_route53_record" "dixie" {
  zone_id = var.route53_zone_id
  name    = local.hostname
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
