import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './auth';

/**
 * System and custom roles for RBAC
 * @example
 * {
 *   id: "r1b2a3c4-5678-9012-abcd-ef1234567890",
 *   name: "SUPER_ADMIN",
 *   description: "Full system access with all permissions",
 *   isSystemRole: true,
 *   isActive: true
 * }
 */
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  isSystemRole: boolean('is_system_role').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * System permissions for granular access control
 * @example
 * {
 *   id: "p1e2r3m4-5678-9012-abcd-ef1234567890",
 *   code: "ACCESS_ADMIN_PANEL",
 *   resource: "admin",
 *   action: "access",
 *   description: "Access to admin panel dashboard",
 *   isActive: true
 * }
 */
export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 100 }).notNull().unique(),
    resource: varchar('resource', { length: 50 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('permissions_resource_idx').on(table.resource),
    index('permissions_action_idx').on(table.action),
  ],
);

/**
 * Role-Permission mappings (many-to-many)
 * @example
 * {
 *   id: "rp123456-7890-abcd-ef12-3456789012ab",
 *   roleId: "r1b2a3c4-5678-9012-abcd-ef1234567890",
 *   permissionId: "p1e2r3m4-5678-9012-abcd-ef1234567890"
 * }
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('role_permissions_unique').on(table.roleId, table.permissionId),
    index('role_permissions_role_idx').on(table.roleId),
    index('role_permissions_permission_idx').on(table.permissionId),
  ],
);

/**
 * User-Role assignments (many-to-many)
 * @example
 * {
 *   id: "ur123456-7890-abcd-ef12-3456789012ab",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   roleId: "r1b2a3c4-5678-9012-abcd-ef1234567890",
 *   grantedBy: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *   grantedAt: "2025-01-15T10:30:00Z",
 *   expiresAt: null,
 *   isActive: true
 * }
 */
export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    grantedBy: uuid('granted_by').references(() => users.id),
    grantedAt: timestamp('granted_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('user_roles_unique').on(table.userId, table.roleId),
    index('user_roles_user_idx').on(table.userId),
    index('user_roles_role_idx').on(table.roleId),
  ],
);
