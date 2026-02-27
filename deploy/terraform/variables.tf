# Dixie BFF — Terraform Configuration
# Environment-aware deployment following Finn's multi-file pattern.

# -------------------------------------------------------------------
# Terraform / Backend / Provider
# -------------------------------------------------------------------

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket               = "honeyjar-terraform-state"
    key                  = "loa-dixie/terraform.tfstate"
    region               = "us-east-1"
    encrypt              = true
    dynamodb_table       = "terraform-locks"
    workspace_key_prefix = "env"
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = "loa-dixie"
      ManagedBy = "terraform"
    }
  }
}

# -------------------------------------------------------------------
# Data Sources
# -------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -------------------------------------------------------------------
# Variables
# -------------------------------------------------------------------

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "armitage"], var.environment)
    error_message = "Environment must be 'production' or 'armitage'."
  }
}

variable "vpc_id" {
  description = "VPC ID for the deployment"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS task and ElastiCache placement"
  type        = list(string)
}

variable "ecr_repository_url" {
  description = "ECR repository URL for the Dixie container image"
  type        = string
}

variable "image_tag" {
  description = "Container image tag (must not be 'latest')"
  type        = string
  default     = "DEPLOY_SHA_REQUIRED"

  validation {
    condition     = var.image_tag != "latest"
    error_message = "Image tag must not be 'latest'. Use a git SHA or semver tag."
  }
}

variable "dixie_cpu" {
  description = "CPU units for the Dixie ECS task (256 staging, 1024 production)"
  type        = number
  default     = 1024
}

variable "dixie_memory" {
  description = "Memory (MiB) for the Dixie ECS task (512 staging, 2048 production)"
  type        = number
  default     = 2048
}

variable "alb_arn" {
  description = "ARN of the shared Application Load Balancer"
  type        = string
}

variable "alb_listener_arn" {
  description = "ARN of the HTTPS listener on the shared ALB"
  type        = string
}

variable "alb_security_group_id" {
  description = "Security group ID of the shared ALB"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the shared ALB"
  type        = string
}

variable "alb_zone_id" {
  description = "Route53 hosted zone ID of the shared ALB"
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS records"
  type        = string
}

variable "ecs_cluster_name" {
  description = "ECS cluster name (overrides default honeyjar-{environment})"
  type        = string
  default     = ""
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications (empty to skip)"
  type        = string
  default     = ""
}

# -------------------------------------------------------------------
# Locals
# -------------------------------------------------------------------

locals {
  service_name = var.environment == "production" ? "dixie-bff" : "dixie-${var.environment}"
  hostname     = var.environment == "production" ? "dixie.thj.dev" : "dixie-${var.environment}.arrakis.community"
  ssm_prefix   = "/dixie/${var.environment}"
  ecs_cluster  = var.ecs_cluster_name != "" ? var.ecs_cluster_name : "honeyjar-${var.environment}"

  common_tags = {
    Environment = var.environment
    Service     = "loa-dixie"
    ManagedBy   = "terraform"
  }
}

# -------------------------------------------------------------------
# Workspace Safety Check
# -------------------------------------------------------------------

resource "null_resource" "workspace_environment_check" {
  count = terraform.workspace != "default" && terraform.workspace != var.environment ? 1 : 0

  provisioner "local-exec" {
    command = "echo 'ERROR: Terraform workspace (${terraform.workspace}) does not match environment (${var.environment}). Aborting.' && exit 1"
  }
}
