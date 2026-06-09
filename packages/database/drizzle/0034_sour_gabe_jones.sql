CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "idx_work_experiences_profile" ON "work_experiences" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_work_experiences_job_title_trgm" ON "work_experiences" USING gin ("job_title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_profiles_visibility" ON "profiles" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_profiles_total_experience" ON "profiles" USING btree ("total_experience_years");--> statement-breakpoint
CREATE INDEX "idx_profiles_created_at" ON "profiles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_profiles_first_name_trgm" ON "profiles" USING gin ("first_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_profiles_last_name_trgm" ON "profiles" USING gin ("last_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_profiles_headline_trgm" ON "profiles" USING gin ("headline" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_profiles_city_trgm" ON "profiles" USING gin ("city" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_job_preferences_profile" ON "job_preferences" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_job_preferences_notice_period" ON "job_preferences" USING btree ("notice_period_days");--> statement-breakpoint
CREATE INDEX "idx_job_preferences_salary_min" ON "job_preferences" USING btree ("expected_salary_min");--> statement-breakpoint
CREATE INDEX "idx_job_preferences_salary_max" ON "job_preferences" USING btree ("expected_salary_max");--> statement-breakpoint
CREATE INDEX "idx_profile_skills_profile" ON "profile_skills" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_profile_skills_skill" ON "profile_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "idx_skills_name_trgm" ON "skills" USING gin ("name" gin_trgm_ops);