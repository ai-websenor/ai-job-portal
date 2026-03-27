CREATE TYPE "public"."subscription_status" AS ENUM('active', 'scheduled', 'expired', 'canceled');--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "rank" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "status" "subscription_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "previous_subscription_id" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "transition_type" varchar(20);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "carry_forward_credits" jsonb;