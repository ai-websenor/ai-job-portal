-- Manual migration: one-time "profile credit" explainer acknowledgement flag.
-- Run dev-RDS-first, then staging, then prod (see memory: db-migration-workflow).
-- Idempotent: safe to re-run.

ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS profile_access_notice_ack boolean NOT NULL DEFAULT false;
