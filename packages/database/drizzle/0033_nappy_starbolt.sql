CREATE TABLE "saved_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_candidates" ADD CONSTRAINT "saved_candidates_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_candidates" ADD CONSTRAINT "saved_candidates_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_candidates_employer_profile_unique" ON "saved_candidates" USING btree ("employer_id","profile_id");--> statement-breakpoint
CREATE INDEX "idx_saved_candidates_employer" ON "saved_candidates" USING btree ("employer_id");