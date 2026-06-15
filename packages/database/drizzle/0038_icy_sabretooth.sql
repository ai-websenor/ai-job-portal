ALTER TYPE "public"."interview_type_enum" ADD VALUE 'other';--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "custom_type" varchar(100);--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "round_name" varchar(100);