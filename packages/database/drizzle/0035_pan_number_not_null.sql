-- Backfill any null pan_number values before adding NOT NULL constraint
UPDATE "companies" SET "pan_number" = 'PAN-' || SUBSTRING("id"::text, 1, 8) WHERE "pan_number" IS NULL;
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "pan_number" SET NOT NULL;
