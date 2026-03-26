ALTER TABLE "companies" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country_code" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "national_number" varchar(15);