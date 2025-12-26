import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const otps = pgTable('otps', {
  id: uuid('id').defaultRandom().primaryKey(),

  email: varchar('email', { length: 255 }).notNull(),

  otpHash: varchar('otp_hash', { length: 255 }).notNull(),

  expiresAt: timestamp('expires_at').notNull(),

  isUsed: boolean('is_used').notNull().default(false),

  createdAt: timestamp('created_at').notNull().defaultNow(),

  usedAt: timestamp('used_at'),
});

