data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/src"
  output_path = "${path.module}/build/nightly-shutdown.zip"
  excludes    = ["**/__pycache__/**", "**/*.egg-info/**"]
}

resource "aws_lambda_function" "shutdown" {
  function_name = "nightly-shutdown-${var.env}"
  role          = aws_iam_role.lambda.arn
  runtime       = "python3.11"
  handler       = "handlers.shutdown_handler.handler"
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout       = 60
  memory_size   = 256

  environment {
    variables = {
      SHUTDOWN_ENV     = var.env
      STATE_SSM_PREFIX = var.ssm_prefix
    }
  }
}

resource "aws_lambda_function" "startup" {
  function_name = "nightly-startup-${var.env}"
  role          = aws_iam_role.lambda.arn
  runtime       = "python3.11"
  handler       = "handlers.startup_handler.handler"
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout       = 60
  memory_size   = 256

  environment {
    variables = {
      SHUTDOWN_ENV     = var.env
      STATE_SSM_PREFIX = var.ssm_prefix
    }
  }
}
