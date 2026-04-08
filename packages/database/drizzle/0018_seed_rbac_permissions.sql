-- Seed new RBAC permissions: MANAGE_SUBSCRIPTIONS and jobs:update-status
-- Safe to run multiple times (ON CONFLICT DO NOTHING)

-- 1. Insert new permissions
INSERT INTO "permissions" ("name", "resource", "action", "description", "is_active")
VALUES
  ('MANAGE_SUBSCRIPTIONS', 'subscriptions', 'manage', 'Purchase, upgrade, cancel and manage subscription plans', true),
  ('jobs:update-status',   'jobs',          'update-status', 'Change job status between active, inactive, and hold', true)
ON CONFLICT ("name") DO NOTHING;

-- 2. Assign MANAGE_SUBSCRIPTIONS to SUPER_EMPLOYER role
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'SUPER_EMPLOYER'
  AND p.name = 'MANAGE_SUBSCRIPTIONS'
ON CONFLICT DO NOTHING;

-- 3. Assign MANAGE_SUBSCRIPTIONS to EMPLOYER role
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'EMPLOYER'
  AND p.name = 'MANAGE_SUBSCRIPTIONS'
ON CONFLICT DO NOTHING;

-- 4. Assign jobs:update-status to SUPER_EMPLOYER role
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'SUPER_EMPLOYER'
  AND p.name = 'jobs:update-status'
ON CONFLICT DO NOTHING;

-- 5. Assign jobs:update-status to EMPLOYER role
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'EMPLOYER'
  AND p.name = 'jobs:update-status'
ON CONFLICT DO NOTHING;
