"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileSkillsRelations = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const profiles_1 = require("./profiles");
exports.profileSkillsRelations = (0, drizzle_orm_1.relations)(profiles_1.profileSkills, ({ one }) => ({
    profile: one(profiles_1.profiles, {
        fields: [profiles_1.profileSkills.profileId],
        references: [profiles_1.profiles.id],
    }),
    skill: one(profiles_1.skills, {
        fields: [profiles_1.profileSkills.skillId],
        references: [profiles_1.skills.id],
    }),
}));
//# sourceMappingURL=profile-skills.relations.js.map