CREATE TABLE "moderation_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar(50) DEFAULT 'post' NOT NULL,
	"content_id" uuid,
	"title" varchar(255) NOT NULL,
	"content" text,
	"author" varchar(255),
	"author_email" varchar(255),
	"flagged_by" varchar(255),
	"flagged_reason" varchar(255),
	"category" varchar(100),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "moderation_flags" ADD CONSTRAINT "moderation_flags_reviewed_by_admin_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_moderation_flags_status" ON "moderation_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_moderation_flags_created_at" ON "moderation_flags" USING btree ("created_at");