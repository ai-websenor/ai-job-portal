-- Make created_by nullable on cms_pages table
-- This is needed because the hardcoded super_admin user does not have
-- a corresponding row in admin_users table, so we cannot enforce the FK constraint as NOT NULL.

ALTER TABLE "cms_pages" ALTER COLUMN "created_by" DROP NOT NULL;
