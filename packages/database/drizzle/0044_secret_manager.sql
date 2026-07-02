-- Secret Manager (admin-managed Tier-2 credential vault).
-- Additive-only and idempotent. Does NOT touch any existing table.

CREATE TABLE IF NOT EXISTS "managed_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"label" varchar(150),
	"is_secret" boolean DEFAULT true NOT NULL,
	"value_enc" text,
	"last_four" varchar(8),
	"is_set" boolean DEFAULT false NOT NULL,
	"validation_status" varchar(20) DEFAULT 'unknown' NOT NULL,
	"last_validated_at" timestamp,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "managed_secrets_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "secret_manager_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"admin_user_id" uuid,
	"passphrase_hash" varchar(255) NOT NULL,
	"totp_secret_enc" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"recovery_email" varchar(255),
	"recovery_mobile" varchar(20),
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"last_unlock_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "secret_manager_credentials_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "managed_secrets" ADD CONSTRAINT "managed_secrets_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "secret_manager_credentials" ADD CONSTRAINT "secret_manager_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "secret_manager_credentials" ADD CONSTRAINT "secret_manager_credentials_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
