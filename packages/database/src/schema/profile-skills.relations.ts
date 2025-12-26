import { relations } from 'drizzle-orm';
import { profileSkills, profiles, skills } from './profiles';

export const profileSkillsRelations = relations(profileSkills, ({ one }) => ({
    profile: one(profiles, {
        fields: [profileSkills.profileId],
        references: [profiles.id],
    }),
    skill: one(skills, {
        fields: [profileSkills.skillId],
        references: [skills.id],
    }),
}));
