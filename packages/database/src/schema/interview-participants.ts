import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { interviews } from './interviews';

export const interviewParticipants = pgTable('interview_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  interviewId: uuid('interview_id')
    .notNull()
    .references(() => interviews.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  role: varchar('role').notNull(), // 'employer', 'candidate', 'interviewer'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
