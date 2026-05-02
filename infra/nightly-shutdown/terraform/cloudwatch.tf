# Two SNS topics:
#   alerts-raw  — what the alarms publish to (raw CloudWatch JSON).
#   alerts      — what the email subscriber listens to (formatted by
#                 the alert_formatter Lambda in between).
#
# The two-topic + Lambda forwarder pattern is the AWS-native way to
# customize the SNS-to-email subject (CloudWatch's auto-generated
# subject is locked to "ALARM: <name> in <region>").

resource "aws_sns_topic" "alerts_raw" {
  name = "nightly-shutdown-${var.env}-alerts-raw"
}

resource "aws_sns_topic" "alerts" {
  name = "nightly-shutdown-${var.env}-alerts"
}

# Email subscription is created only when alert_email is non-empty so
# `terraform apply` works incrementally — first apply infra, then add
# email in tfvars and re-apply to wire the subscriber. AWS sends a
# confirmation email; click the link before relying on alerts.
resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Raw HTTPS subscription to a Slack incoming webhook. SNS posts the
# formatted message body as-is; Slack expects {"text": "..."} so
# messages will look raw. Acceptable as a minimum-viable starter — swap
# for a Lambda forwarder if the on-call team wants formatted messages.
resource "aws_sns_topic_subscription" "slack" {
  count                  = var.alert_slack_webhook_url == "" ? 0 : 1
  topic_arn              = aws_sns_topic.alerts.arn
  protocol               = "https"
  endpoint               = var.alert_slack_webhook_url
  endpoint_auto_confirms = true
}

# Formatter Lambda — subscribes to alerts_raw, parses CloudWatch alarm
# JSON, publishes a project-prefixed subject and plain-text body to
# alerts. Reuses the same zip + IAM role as the shutdown/startup
# Lambdas (iam.tf adds SNS:Publish to that role).
resource "aws_lambda_function" "alert_formatter" {
  function_name    = "nightly-shutdown-${var.env}-alert-formatter"
  role             = aws_iam_role.lambda.arn
  runtime          = "python3.11"
  handler          = "handlers.alert_formatter.handler"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      PROJECT_NAME    = "ai-job-portal"
      EMAIL_TOPIC_ARN = aws_sns_topic.alerts.arn
    }
  }
}

resource "aws_sns_topic_subscription" "formatter" {
  topic_arn = aws_sns_topic.alerts_raw.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.alert_formatter.arn
}

resource "aws_lambda_permission" "formatter_sns" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alert_formatter.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.alerts_raw.arn
}

# Alarms publish to alerts_raw — formatter routes to alerts → email.
# Both alarm_actions and ok_actions are wired so on-call gets both
# the ALARM and the RESOLVED email.
resource "aws_cloudwatch_metric_alarm" "shutdown_errors" {
  alarm_name          = "nightly-shutdown-${var.env}-errors"
  alarm_description   = "Shutdown Lambda failed at least once. Check /aws/lambda/${aws_lambda_function.shutdown.function_name}."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.shutdown.function_name
  }

  alarm_actions = [aws_sns_topic.alerts_raw.arn]
  ok_actions    = [aws_sns_topic.alerts_raw.arn]
}

resource "aws_cloudwatch_metric_alarm" "startup_errors" {
  alarm_name          = "nightly-startup-${var.env}-errors"
  alarm_description   = "Startup Lambda failed at least once. Check /aws/lambda/${aws_lambda_function.startup.function_name}."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.startup.function_name
  }

  alarm_actions = [aws_sns_topic.alerts_raw.arn]
  ok_actions    = [aws_sns_topic.alerts_raw.arn]
}
