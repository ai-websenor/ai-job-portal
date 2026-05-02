variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "aws_profile" {
  type    = string
  default = "jobportal"
}

variable "env" {
  description = "Target environment cluster (dev / staging). Cluster name is derived as ai-job-portal-<env>."
  type        = string
  default     = "dev"
}

variable "ssm_prefix" {
  description = "SSM Parameter Store prefix for persisting pre-shutdown desired-counts."
  type        = string
  default     = "/nightly-shutdown"
}

variable "shutdown_cron" {
  description = "EventBridge cron expression for shutdown. Default = 8 PM IST = 14:30 UTC, Mon-Fri."
  type        = string
  default     = "cron(30 14 ? * MON-FRI *)"
}

variable "startup_cron" {
  description = "EventBridge cron expression for startup. Default = 9 AM IST = 03:30 UTC, Mon-Fri."
  type        = string
  default     = "cron(30 3 ? * MON-FRI *)"
}

variable "rds_db_instance_id" {
  description = "RDS DB instance identifier to stop/start nightly."
  type        = string
  default     = "ai-job-portal-dev"
}

variable "valkey_replication_group_id" {
  description = "ElastiCache Valkey replication-group ID to snapshot+delete nightly."
  type        = string
  default     = "ai-job-portal-dev-valkey"
}

variable "alert_email" {
  description = "Email subscribed to the shutdown-alarms SNS topic. Empty = no email subscriber (other subscribers can be added manually). The first apply with a non-empty value will send a confirmation email — click the link before relying on the alarms."
  type        = string
  default     = "deepak.tiwari.websenor@gmail.com"
}

variable "alert_slack_webhook_url" {
  description = "Optional Slack incoming-webhook URL. If set, an https subscription is added to the SNS topic. Slack expects {\"text\": ...} so a Lambda forwarder is recommended for prettier messages — this raw subscription is a minimum-viable starting point."
  type        = string
  default     = ""
  sensitive   = true
}
