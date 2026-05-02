# SNS topic that fans out alarm notifications. Both Lambda-error alarms
# publish to this single topic so all subscribers (email, Slack) get every
# alert.
resource "aws_sns_topic" "alerts" {
  name = "nightly-shutdown-${var.env}-alerts"
}

# Email subscription is created only when alert_email is non-empty so
# `terraform apply` works incrementally — first apply infra, then add email
# in tfvars and re-apply to wire the subscriber. AWS sends a confirmation
# email; click the link before relying on alerts.
resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Raw HTTPS subscription to a Slack incoming webhook. SNS posts the alarm
# JSON as-is; Slack expects {"text": "..."} so messages will look raw.
# Acceptable as a minimum-viable starter — swap for a Lambda forwarder if
# the on-call team wants formatted messages.
resource "aws_sns_topic_subscription" "slack" {
  count                  = var.alert_slack_webhook_url == "" ? 0 : 1
  topic_arn              = aws_sns_topic.alerts.arn
  protocol               = "https"
  endpoint               = var.alert_slack_webhook_url
  endpoint_auto_confirms = true
}

# Lambda Errors metric — emitted by AWS Lambda for each invocation that
# raises an unhandled exception. Threshold 1 per period: a single failed
# nightly run is enough to page (these run once a day, so any failure
# matters).
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

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
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

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}
