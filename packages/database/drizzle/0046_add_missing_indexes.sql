-- DB query optimization Phase 1: indexes for FK/filter columns that were
-- previously unindexed (see DOCS/technical/db-query-optimization-plan.md).
-- Hand-written + idempotent (IF NOT EXISTS), matching 0043_add_job_validity_days,
-- because `drizzle-kit generate` prompts on unrelated pre-existing schema
-- drift (subscription_plans.job_validity_days) introduced by that same
-- hand-written migration bypassing the drizzle-kit snapshot.
--
-- NOTE: these are plain CREATE INDEX (lock-taking), not CONCURRENTLY, since
-- drizzle's migrator runs each file inside a transaction and CONCURRENTLY
-- cannot run inside one. For large tables in staging/prod, consider running
-- the CONCURRENTLY-equivalent statements manually outside this migration.

CREATE INDEX IF NOT EXISTS "idx_job_categories_parent_id" ON "job_categories" ("parent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_category_relations_job_id" ON "job_category_relations" ("job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_category_relations_category_id" ON "job_category_relations" ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_screening_questions_job_id" ON "screening_questions" ("job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_saved_jobs_job_seeker_id_job_id" ON "saved_jobs" ("job_seeker_id","job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_saved_searches_user_id" ON "saved_searches" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_views_job_id" ON "job_views" ("job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_views_viewed_at" ON "job_views" ("viewed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_shares_job_id" ON "job_shares" ("job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_search_history_user_id" ON "job_search_history" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_application_history_application_id" ON "application_history" ("application_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parsed_resume_data_user_id" ON "parsed_resume_data" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_logs_user_id" ON "activity_logs" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_logs_entity_type_entity_id" ON "activity_logs" ("entity_type","entity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_logs_created_at" ON "activity_logs" ("created_at");
