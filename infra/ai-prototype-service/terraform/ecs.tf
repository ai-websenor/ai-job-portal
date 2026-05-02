data "aws_caller_identity" "current" {}

locals {
  cluster_name = "ai-job-portal-${var.env}"
  log_group    = "/ecs/${var.service_name}"
  image_uri    = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com/ai-job-portal/${var.service_name}:${var.image_tag}"
}

resource "aws_cloudwatch_log_group" "task" {
  name              = local.log_group
  retention_in_days = 14
}

resource "aws_ecs_task_definition" "this" {
  family                   = "${local.cluster_name}-${var.service_name}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([{
    name      = var.service_name
    image     = local.image_uri
    essential = true
    portMappings = [{
      containerPort = var.container_port
      hostPort      = var.container_port
      protocol      = "tcp"
    }]
    environment = [
      { name = "PORT", value = tostring(var.container_port) },
    ]
    # No in-container healthCheck — ALB target-group healthcheck is the source
    # of truth. Avoids a second place to keep the path in sync.
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = local.log_group
        awslogs-region        = var.region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])

  # The image_tag flips on every CI deploy — terraform shouldn't drift.
  lifecycle {
    ignore_changes = [container_definitions]
  }
}

# Cloud Map service-discovery — registers ai-prototype-service.ai-job-portal-dev.local
resource "aws_service_discovery_service" "this" {
  name = var.service_name

  dns_config {
    namespace_id = var.cloud_map_namespace_id

    dns_records {
      type = "A"
      ttl  = 10
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = local.cluster_name
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Tasks ignore future task-def revisions — CI rolls them via update-service.
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = var.service_name
    container_port   = var.container_port
  }

  service_registries {
    registry_arn = aws_service_discovery_service.this.arn
  }

  depends_on = [aws_lb_listener_rule.this]
}
