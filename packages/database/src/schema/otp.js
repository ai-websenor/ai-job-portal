'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.otps = void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
exports.otps = (0, pg_core_1.pgTable)('otps', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
  otpHash: (0, pg_core_1.varchar)('otp_hash', { length: 255 }).notNull(),
  expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
  isUsed: (0, pg_core_1.boolean)('is_used').notNull().default(false),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  usedAt: (0, pg_core_1.timestamp)('used_at'),
});
//# sourceMappingURL=otp.js.map
