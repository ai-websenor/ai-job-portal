import { relations } from 'drizzle-orm';
import { skills, profileSkills } from './profiles';

export const skillsRelations = relations(skills, ({ many }) => ({
    profileSkills: many(profileSkills),
}));
