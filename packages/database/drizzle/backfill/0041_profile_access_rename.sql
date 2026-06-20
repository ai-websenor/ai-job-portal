-- Manual migration: resume_access -> profile_access rename + plan capability flags
--
-- Run dev-RDS-first, then staging, then prod (see memory: db-migration-workflow).
-- Idempotent: safe to re-run. Renames preserve existing usage/limit data (do NOT
-- use drizzle db:push for this — it would drop+recreate the columns and lose data).

BEGIN;

-- 1. subscription_plans.resume_access_limit -> profile_access_limit
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'resume_access_limit'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'profile_access_limit'
  ) THEN
    ALTER TABLE subscription_plans RENAME COLUMN resume_access_limit TO profile_access_limit;
  END IF;
END $$;

-- 2. subscriptions.resume_access_limit -> profile_access_limit
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'resume_access_limit'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'profile_access_limit'
  ) THEN
    ALTER TABLE subscriptions RENAME COLUMN resume_access_limit TO profile_access_limit;
  END IF;
END $$;

-- 3. subscriptions.resume_access_used -> profile_access_used
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'resume_access_used'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'profile_access_used'
  ) THEN
    ALTER TABLE subscriptions RENAME COLUMN resume_access_used TO profile_access_used;
  END IF;
END $$;

-- 4. New plan capability flags + one-time tier-based backfill.
--    The backfill runs ONLY when the column is first added, so re-running this
--    script never clobbers flag values an admin has since edited.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'view_contact_allowed'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN view_contact_allowed boolean DEFAULT false;
    ALTER TABLE subscription_plans ADD COLUMN message_allowed boolean DEFAULT false;
    -- Paid plans (price > 0) get contact + message; free plans (price = 0) do not.
    UPDATE subscription_plans
      SET view_contact_allowed = (price > 0),
          message_allowed = (price > 0);
  END IF;
END $$;

COMMIT;
