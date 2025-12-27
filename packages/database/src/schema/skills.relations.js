"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillsRelations = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const profiles_1 = require("./profiles");
exports.skillsRelations = (0, drizzle_orm_1.relations)(profiles_1.skills, ({ many }) => ({
    profileSkills: many(profiles_1.profileSkills),
}));
//# sourceMappingURL=skills.relations.js.map