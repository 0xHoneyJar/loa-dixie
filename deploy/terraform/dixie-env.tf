# Dixie BFF — SSM Parameter Store Definitions
# All parameters created with PLACEHOLDER values. Operators set real values via:
#   aws ssm put-parameter --name "<path>" --value "<real-value>" --type SecureString --overwrite

# -------------------------------------------------------------------
# SecureString Parameters
# -------------------------------------------------------------------

resource "aws_ssm_parameter" "finn_url" {
  name  = "${local.ssm_prefix}/FINN_URL"
  type  = "SecureString"
  value = "PLACEHOLDER"

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "finn_ws_url" {
  name  = "${local.ssm_prefix}/FINN_WS_URL"
  type  = "SecureString"
  value = "PLACEHOLDER"

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "database_url" {
  name  = "${local.ssm_prefix}/DATABASE_URL"
  type  = "SecureString"
  value = "PLACEHOLDER"

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "redis_url" {
  name  = "${local.ssm_prefix}/REDIS_URL"
  type  = "SecureString"
  value = "PLACEHOLDER"

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "jwt_private_key" {
  name  = "${local.ssm_prefix}/DIXIE_JWT_PRIVATE_KEY"
  type  = "SecureString"
  value = "PLACEHOLDER"

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "admin_key" {
  name  = "${local.ssm_prefix}/DIXIE_ADMIN_KEY"
  type  = "SecureString"
  value = "PLACEHOLDER"

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

# -------------------------------------------------------------------
# String Parameters
# -------------------------------------------------------------------

resource "aws_ssm_parameter" "nats_url" {
  name  = "${local.ssm_prefix}/NATS_URL"
  type  = "String"
  value = "PLACEHOLDER"

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "cors_origins" {
  name  = "${local.ssm_prefix}/DIXIE_CORS_ORIGINS"
  type  = "String"
  value = "PLACEHOLDER"

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}
