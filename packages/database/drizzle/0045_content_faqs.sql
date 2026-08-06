-- Content Management: FAQ entries (question/answer) for CMS.
-- Additive-only and idempotent. Does NOT touch any existing table.
-- Note: cms_pages.meta_keywords and cms_pages.published_at already exist in schema;
-- this migration only adds the new faqs table.

CREATE TABLE IF NOT EXISTS "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" varchar(500) NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "faqs" ADD CONSTRAINT "faqs_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "faqs" ADD CONSTRAINT "faqs_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_faqs_category" ON "faqs" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_faqs_is_active" ON "faqs" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_faqs_sort_order" ON "faqs" ("sort_order");
