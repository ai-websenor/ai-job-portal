data "aws_caller_identity" "current" {}

locals {
  cluster_name = "ai-job-portal-${var.env}"
  cluster_arn  = "arn:aws:ecs:${var.region}:${data.aws_caller_identity.current.account_id}:cluster/${local.cluster_name}"
  service_arn  = "arn:aws:ecs:${var.region}:${data.aws_caller_identity.current.account_id}:service/${local.cluster_name}/*"
  ssm_arn      = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_prefix}/${var.env}/*"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "lambda_inline" {
  # ECS read + scale
  statement {
    actions = [
      "ecs:ListServices",
      "ecs:DescribeServices",
    ]
    resources = ["*"]
  }
  statement {
    actions   = ["ecs:UpdateService"]
    resources = [local.service_arn]
  }

  # RDS — describe is unscoped (boto requires it), stop/start scoped to our DB
  statement {
    actions   = ["rds:DescribeDBInstances"]
    resources = ["*"]
  }
  statement {
    actions = [
      "rds:StopDBInstance",
      "rds:StartDBInstance",
    ]
    resources = [
      "arn:aws:rds:${var.region}:${data.aws_caller_identity.current.account_id}:db:${var.rds_db_instance_id}"
    ]
  }

  # ElastiCache — describe/snapshot/delete/recreate. ElastiCache APIs don't
  # support resource-level scoping for most calls (* is the only valid value).
  statement {
    actions = [
      "elasticache:DescribeReplicationGroups",
      "elasticache:DescribeCacheClusters",
      "elasticache:DescribeSnapshots",
      "elasticache:CreateSnapshot",
      "elasticache:DeleteReplicationGroup",
      "elasticache:CreateReplicationGroup",
    ]
    resources = ["*"]
  }

  # SSM read/write/delete — scoped to our prefix only
  statement {
    actions = [
      "ssm:GetParameter",
      "ssm:PutParameter",
      "ssm:DeleteParameter",
    ]
    resources = [local.ssm_arn]
  }

  # CloudWatch Logs
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:*"]
  }

  # SNS Publish — used by the alert_formatter Lambda to re-publish a
  # nicely-formatted message to the email-subscribed topic.
  statement {
    actions = ["sns:Publish"]
    resources = [
      "arn:aws:sns:${var.region}:${data.aws_caller_identity.current.account_id}:nightly-shutdown-${var.env}-alerts",
    ]
  }
}

resource "aws_iam_role" "lambda" {
  name               = "nightly-shutdown-${var.env}-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy" "lambda" {
  name   = "nightly-shutdown-${var.env}-policy"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_inline.json
}
