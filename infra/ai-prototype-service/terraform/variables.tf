variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "aws_profile" {
  type    = string
  default = "jobportal"
}

variable "env" {
  type        = string
  default     = "dev"
  description = "Target env (dev / staging). Cluster = ai-job-portal-<env>."
}

variable "service_name" {
  type    = string
  default = "ai-prototype-service"
}

variable "container_port" {
  type    = number
  default = 3011
}

variable "cpu" {
  description = "Fargate task CPU units. 512 = 0.5 vCPU."
  type        = number
  default     = 512
}

variable "memory" {
  description = "Fargate task memory (MiB). 4096 = 4GB."
  type        = number
  default     = 4096
}

variable "alb_path_pattern" {
  description = "ALB listener-rule path pattern. Parallel to existing /ai/* (SageMaker-era ai-service)."
  type        = string
  default     = "/ai-prototype/*"
}

variable "alb_rule_priority" {
  description = "Priority on the listener. Existing /ai/* is at 10."
  type        = number
  default     = 20
}

# Discovered from auth-service. Hard-coded for the dev env to keep the terraform
# self-contained — staging will need overrides.
variable "vpc_id" {
  type    = string
  default = "vpc-020ffe005d46c7d22"
}

variable "subnet_ids" {
  type = list(string)
  default = [
    "subnet-0b6d0d9346fae035c",
    "subnet-038b33d66d11f2d29",
    "subnet-029ae2173f0ee99a9",
  ]
}

variable "security_group_id" {
  type    = string
  default = "sg-01402d187783a6814"
}

variable "alb_listener_arn" {
  type    = string
  default = "arn:aws:elasticloadbalancing:ap-south-1:868991777791:listener/app/ai-job-portal-dev-alb/ce69532a03436448/d5df515926ffb3ce"
}

variable "cloud_map_namespace_id" {
  description = "ai-job-portal-dev.local"
  type        = string
  default     = "ns-fi2dg75ofdlaqm32"
}

variable "task_execution_role_arn" {
  type    = string
  default = "arn:aws:iam::868991777791:role/ecsTaskExecutionRole"
}

variable "task_role_arn" {
  type    = string
  default = "arn:aws:iam::868991777791:role/ecsTaskRole"
}

variable "image_tag" {
  description = "ECR image tag. Bootstrap with 'placeholder' so the service can be created before the first build."
  type        = string
  default     = "placeholder"
}
