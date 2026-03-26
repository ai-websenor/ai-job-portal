CREATE INDEX "idx_job_applications_applied_at" ON "job_applications" USING btree ("applied_at");--> statement-breakpoint
CREATE INDEX "idx_job_applications_applied_at_status" ON "job_applications" USING btree ("applied_at","status");--> statement-breakpoint
CREATE INDEX "idx_users_created_at" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_jobs_created_at_is_active" ON "jobs" USING btree ("created_at","is_active");--> statement-breakpoint
CREATE INDEX "idx_interviews_scheduled_at" ON "interviews" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_interviews_status" ON "interviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_interviews_scheduled_at_status_type_mode" ON "interviews" USING btree ("scheduled_at","status","interview_type","interview_mode");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payments_created_at" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_payments_status_created_at" ON "payments" USING btree ("status","created_at");