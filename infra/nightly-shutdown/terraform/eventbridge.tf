resource "aws_cloudwatch_event_rule" "shutdown" {
  name                = "nightly-shutdown-${var.env}"
  description         = "Scale ${local.cluster_name} ECS services to 0 on weekday nights"
  schedule_expression = var.shutdown_cron
}

resource "aws_cloudwatch_event_rule" "startup" {
  name                = "nightly-startup-${var.env}"
  description         = "Restore ${local.cluster_name} ECS services on weekday mornings"
  schedule_expression = var.startup_cron
}

resource "aws_cloudwatch_event_target" "shutdown" {
  rule      = aws_cloudwatch_event_rule.shutdown.name
  target_id = "shutdown-lambda"
  arn       = aws_lambda_function.shutdown.arn
}

resource "aws_cloudwatch_event_target" "startup" {
  rule      = aws_cloudwatch_event_rule.startup.name
  target_id = "startup-lambda"
  arn       = aws_lambda_function.startup.arn
}

resource "aws_lambda_permission" "shutdown_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.shutdown.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.shutdown.arn
}

resource "aws_lambda_permission" "startup_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.startup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.startup.arn
}
