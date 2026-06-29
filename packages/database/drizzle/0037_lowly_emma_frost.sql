ALTER TYPE "public"."application_status" ADD VALUE 'interview_rescheduled' BEFORE 'interview_completed';--> statement-breakpoint
ALTER TYPE "public"."application_status" ADD VALUE 'interview_cancelled' BEFORE 'interview_completed';--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "rating" integer;