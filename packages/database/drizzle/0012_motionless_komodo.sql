ALTER TABLE "companies" ADD COLUMN "instagram_url" varchar(500);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "gateway_payment_id" varchar(255);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "transaction_id" varchar(255);