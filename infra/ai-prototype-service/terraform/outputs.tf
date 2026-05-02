output "ecr_repo_url" {
  value = aws_ecr_repository.this.repository_url
}

output "ecs_service_name" {
  value = aws_ecs_service.this.name
}

output "task_definition_family" {
  value = aws_ecs_task_definition.this.family
}

output "target_group_arn" {
  value = aws_lb_target_group.this.arn
}

output "cloud_map_arn" {
  value = aws_service_discovery_service.this.arn
}

output "alb_path" {
  value = var.alb_path_pattern
}

output "log_group" {
  value = aws_cloudwatch_log_group.task.name
}
