-- Rename MANAGE_SUBSCRIPTIONS → subscriptions:manage for consistency
-- All other permissions use resource:action pattern (e.g. jobs:create, analytics:read)
-- Safe: ON CONFLICT DO NOTHING handles the case where the rename already happened

UPDATE "permissions"
SET "name" = 'subscriptions:manage'
WHERE "name" = 'MANAGE_SUBSCRIPTIONS';
