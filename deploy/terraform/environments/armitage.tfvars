# Armitage (staging) — Variable overrides for arrakis-staging-cluster
# Usage: terraform apply -var-file=environments/armitage.tfvars

environment = "armitage"

ecs_cluster_name = "arrakis-staging-cluster"

dixie_cpu    = 256
dixie_memory = 512

ecr_repository_url = "891376933289.dkr.ecr.us-east-1.amazonaws.com/dixie-armitage"
image_tag          = "DEPLOY_SHA_REQUIRED"

vpc_id             = "vpc-0d08ce69dba7485da"
private_subnet_ids = ["subnet-0a08a8fce7004ee11", "subnet-07973b30fe8f675e7"]

alb_arn               = "arn:aws:elasticloadbalancing:us-east-1:891376933289:loadbalancer/app/arrakis-staging-alb/0d434b50265789c1"
alb_listener_arn      = "arn:aws:elasticloadbalancing:us-east-1:891376933289:listener/app/arrakis-staging-alb/0d434b50265789c1/e6ff22557f66633c"
alb_security_group_id = "sg-007cdd539bcc3360c"
alb_dns_name          = "arrakis-staging-alb-616899391.us-east-1.elb.amazonaws.com"
alb_zone_id           = "Z35SXDOTRQ7X7K"

route53_zone_id = "Z01194812Z6NUWBWMFB7T"
