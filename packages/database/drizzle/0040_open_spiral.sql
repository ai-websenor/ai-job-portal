ALTER TABLE "application_history" ADD COLUMN "event_type" varchar(64);--> statement-breakpoint
ALTER TABLE "application_history" ADD COLUMN "interview_id" uuid;--> statement-breakpoint
ALTER TABLE "application_history" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "application_history" ADD CONSTRAINT "application_history_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE set null ON UPDATE no action;