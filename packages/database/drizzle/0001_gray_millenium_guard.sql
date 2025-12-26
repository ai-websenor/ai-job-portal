CREATE TABLE IF NOT EXISTS "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"used_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "education_records" ALTER COLUMN "level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "education_records" ALTER COLUMN "start_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "work_experiences" ALTER COLUMN "start_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "resume_details" jsonb;--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "parsed_content" text;--> statement-breakpoint
ALTER TABLE "work_experiences" ADD COLUMN "duration" varchar(100);--> statement-breakpoint
ALTER TABLE "work_experiences" ADD COLUMN "is_fresher" boolean DEFAULT false;