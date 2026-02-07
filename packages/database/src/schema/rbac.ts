import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './auth';

/**
 * RBAC Roles for fine-grained access control
 * @example
 * {
 *   id: "role-1234-5678-90ab-cdef11112222",
 *   name: "ADMIN",
 *   description: "Company administrator with full access to assigned company",
 *   permissions: ["ACCESS_ADMIN_PANEL", "CREATE_EMPLOYER", "UPDATE_COMPANY", ...],
 *   isActive: true
 * }
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    permissions: text('permissions').array(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('roles_name_unique').on(table.name)],
);

/**
 * User-Role mappings for RBAC
 * Links users to roles with optional company scoping
 * @example
 * {
 *   id: "ur-1234-5678-90ab-cdef22223333",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   roleId: "role-1234-5678-90ab-cdef11112222",
 *   companyId: "comp-1234-5678-90ab-cdef11112222", // For company-scoped admins
 *   isActive: true,
 *   grantedBy: "624ec0a4-e9e3-49b6-8de2-6ba2b6899c20",
 *   grantedAt: "2025-01-15T10:30:00Z"
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
    companyId: uuid('company_id'), // For company-scoped roles (ADMIN only)
    isActive: boolean('is_active').notNull().default(true),
    grantedBy: uuid('granted_by').references(() => users.id),
    grantedAt: timestamp('granted_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('user_roles_user_id_idx').on(table.userId),
    index('user_roles_role_id_idx').on(table.roleId),
    index('user_roles_company_id_idx').on(table.companyId),
  ],
);
