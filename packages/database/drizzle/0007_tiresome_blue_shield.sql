ALTER TABLE "companies" ALTER COLUMN "kyc_documents" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "kyc_documents" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "is_active" boolean DEFAULT true;