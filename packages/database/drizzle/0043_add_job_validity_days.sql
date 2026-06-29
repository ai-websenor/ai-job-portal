-- Job validity feature: number of days a job stays live.
-- jobs.validity_days: employer-chosen override per job posting.
-- subscription_plans.job_validity_days: plan default validity per posting credit.
-- Both nullable (NULL on plan = unlimited / no auto-expiry by validity).
-- Hand-written + idempotent so it is safe across dev/staging/prod regardless of
-- whether the column was already applied manually.
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "validity_days" integer;
--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "job_validity_days" integer;
