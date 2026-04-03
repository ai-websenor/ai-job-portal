ALTER TABLE "certifications" ALTER COLUMN "issue_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "linkedin_url" varchar(500);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "github_url" varchar(500);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "website_url" varchar(500);