"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailVerifications = exports.passwordResets = exports.sessions = exports.socialLogins = exports.socialProviderEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.socialProviderEnum = (0, pg_core_1.pgEnum)('social_provider', ['google', 'linkedin']);
exports.socialLogins = (0, pg_core_1.pgTable)('social_logins', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_1.users.id, { onDelete: 'cascade' }),
    provider: (0, exports.socialProviderEnum)('provider').notNull(),
    providerUserId: (0, pg_core_1.varchar)('provider_user_id', { length: 255 }).notNull(),
    accessToken: (0, pg_core_1.text)('access_token'),
    refreshToken: (0, pg_core_1.text)('refresh_token'),
    tokenExpiresAt: (0, pg_core_1.timestamp)('token_expires_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_1.users.id, { onDelete: 'cascade' }),
    token: (0, pg_core_1.varchar)('token', { length: 500 }).notNull().unique(),
    refreshToken: (0, pg_core_1.varchar)('refresh_token', { length: 500 }).unique(),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    deviceInfo: (0, pg_core_1.text)('device_info'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.passwordResets = (0, pg_core_1.pgTable)('password_resets', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_1.users.id, { onDelete: 'cascade' }),
    token: (0, pg_core_1.varchar)('token', { length: 255 }).notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.emailVerifications = (0, pg_core_1.pgTable)('email_verifications', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_1.users.id, { onDelete: 'cascade' }),
    token: (0, pg_core_1.varchar)('token', { length: 255 }).notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    verifiedAt: (0, pg_core_1.timestamp)('verified_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
//# sourceMappingURL=authentication.js.map