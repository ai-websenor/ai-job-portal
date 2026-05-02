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
