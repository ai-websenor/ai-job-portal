# Resolve ALB by name to get its SG (cleaner than hard-coding).
data "aws_lb" "this" {
  name = "ai-job-portal-${var.env}-alb"
}

# The shared task SG (sg-01402d187783a6814) only allows ALB → task on ports
# 3000-3009. Port 3011 is outside that range, so the new service is
# unreachable until we open it explicitly. Using `aws_security_group_rule`
# (not `aws_security_group`) so we add a single rule without claiming
# ownership of the shared SG itself.
resource "aws_security_group_rule" "alb_to_task" {
  type                     = "ingress"
  from_port                = var.container_port
  to_port                  = var.container_port
  protocol                 = "tcp"
  security_group_id        = var.security_group_id
  source_security_group_id = tolist(data.aws_lb.this.security_groups)[0]
  description              = "ALB to ai-prototype-service:${var.container_port}"
}

resource "aws_lb_target_group" "this" {
  name        = "${var.service_name}-${var.env}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    path                = "/ai-prototype/healthz"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  deregistration_delay = 30
}

resource "aws_lb_listener_rule" "this" {
  listener_arn = var.alb_listener_arn
  priority     = var.alb_rule_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }

  condition {
    path_pattern {
      values = [var.alb_path_pattern]
    }
  }
}
