export declare const profileSkillsRelations: import('node_modules/drizzle-orm').Relations<
  'profile_skills',
  {
    profile: import('node_modules/drizzle-orm').One<'profiles', true>;
    skill: import('node_modules/drizzle-orm').One<'skills', true>;
  }
>;
