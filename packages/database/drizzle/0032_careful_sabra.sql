DROP INDEX "uq_message_threads_participants";--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_message_threads_application" ON "message_threads" USING btree ("application_id") WHERE application_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_message_threads_participants" ON "message_threads" USING btree ("participants");--> statement-breakpoint
CREATE INDEX "idx_message_threads_company" ON "message_threads" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_message_threads_job" ON "message_threads" USING btree ("job_id");