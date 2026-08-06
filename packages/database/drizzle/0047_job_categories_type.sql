-- Industry/Department master-data review: tag job_categories rows by origin,
-- mirroring skills / master_degrees / master_fields_of_study.
--   'master-typed' = admin-curated, shown in the Industry/Department dropdowns.
--   'user-typed'   = employer typed a custom value at job creation; visible on
--                    the job label immediately but hidden from dropdowns until
--                    an admin promotes it to 'master-typed'.
-- Reuses the existing "skill_type" enum. Existing rows default to master-typed.
-- Hand-written + idempotent (drizzle-kit generate is blocked by unrelated
-- pre-existing snapshot drift), safe to re-run across dev/staging/prod.
ALTER TABLE "job_categories" ADD COLUMN IF NOT EXISTS "type" "skill_type" DEFAULT 'master-typed' NOT NULL;
