import { pgTable, uuid, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

/**
 * Profile avatars that can be selected by users
 * Managed by admins, selectable by all users
 * @example
 * {
 *   id: "avatar-1234-5678-90ab-cdef12345678",
 *   name: "Professional Avatar 1",
 *   imageUrl: "avatars/1234567890-abc123.webp",
 *   isActive: true,
 *   displayOrder: 1
 * }
 */
export const profileAvatars = pgTable('profile_avatars', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  gender: varchar('gender', { length: 20 }).default('other'),
  isActive: boolean('is_active').default(true),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
