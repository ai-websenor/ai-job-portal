output "shutdown_lambda_name" {
  value = aws_lambda_function.shutdown.function_name
}

output "startup_lambda_name" {
  value = aws_lambda_function.startup.function_name
}

output "cluster" {
  value = local.cluster_name
}

output "ssm_prefix" {
  value = "${var.ssm_prefix}/${var.env}"
}
