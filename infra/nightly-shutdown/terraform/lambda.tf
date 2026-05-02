data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/src"
  output_path = "${path.module}/build/nightly-shutdown.zip"
  excludes    = ["**/__pycache__/**", "**/*.egg-info/**"]
}

# Both lambdas share the same code zip and the same env-var set. Timeout is
# 900s (15 min, the AWS max) because RDS startup polls until "available",
# which typically takes 3-7 minutes after the start_db_instance call.
locals {
  lambda_env = {
    SHUTDOWN_ENV                = var.env
    STATE_SSM_PREFIX            = var.ssm_prefix
    RDS_DB_INSTANCE_ID          = var.rds_db_instance_id
    VALKEY_REPLICATION_GROUP_ID = var.valkey_replication_group_id
  }
}

resource "aws_lambda_function" "shutdown" {
  function_name    = "nightly-shutdown-${var.env}"
  role             = aws_iam_role.lambda.arn
  runtime          = "python3.11"
  handler          = "handlers.shutdown_handler.handler"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 900
  memory_size      = 256

  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "startup" {
  function_name    = "nightly-startup-${var.env}"
  role             = aws_iam_role.lambda.arn
  runtime          = "python3.11"
  handler          = "handlers.startup_handler.handler"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 900
  memory_size      = 256

  environment {
    variables = local.lambda_env
  }
}
