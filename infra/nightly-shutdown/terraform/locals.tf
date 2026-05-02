# Per-environment identifier defaults. Lets `terraform apply -var env=staging`
# auto-resolve the right RDS instance + Valkey replication group without the
# operator having to remember every -var flag.
#
# Override is still possible: pass `-var rds_db_instance_id=...` to point at
# a non-standard instance.
locals {
  per_env_defaults = {
    dev = {
      rds_db_instance_id          = "ai-job-portal-dev"
      valkey_replication_group_id = "ai-job-portal-dev-valkey"
    }
    staging = {
      rds_db_instance_id          = "ai-job-portal-staging"
      valkey_replication_group_id = "ai-job-portal-staging-valkey"
    }
  }

  # Fall back to the per-env default only if the variable was left blank.
  rds_db_instance_id = (
    var.rds_db_instance_id != ""
    ? var.rds_db_instance_id
    : local.per_env_defaults[var.env].rds_db_instance_id
  )
  valkey_replication_group_id = (
    var.valkey_replication_group_id != ""
    ? var.valkey_replication_group_id
    : local.per_env_defaults[var.env].valkey_replication_group_id
  )
}
