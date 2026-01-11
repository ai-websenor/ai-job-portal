export declare const userRoleEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['candidate', 'employer', 'admin', 'team_member']
>;
export declare const users: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'users';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'users';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    firstName: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'first_name';
        tableName: 'users';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    lastName: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'last_name';
        tableName: 'users';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    email: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'email';
        tableName: 'users';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    password: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'password';
        tableName: 'users';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    mobile: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'mobile';
        tableName: 'users';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    role: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'role';
        tableName: 'users';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'candidate' | 'employer' | 'admin' | 'team_member';
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: ['candidate', 'employer', 'admin', 'team_member'];
        baseColumn: never;
      },
      {},
      {}
    >;
    isVerified: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'is_verified';
        tableName: 'users';
        dataType: 'boolean';
        columnType: 'PgBoolean';
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    isMobileVerified: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'is_mobile_verified';
        tableName: 'users';
        dataType: 'boolean';
        columnType: 'PgBoolean';
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    isActive: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'is_active';
        tableName: 'users';
        dataType: 'boolean';
        columnType: 'PgBoolean';
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    twoFactorSecret: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'two_factor_secret';
        tableName: 'users';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    twoFactorEnabled: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'two_factor_enabled';
        tableName: 'users';
        dataType: 'boolean';
        columnType: 'PgBoolean';
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    lastLoginAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'last_login_at';
        tableName: 'users';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'users';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    updatedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'updated_at';
        tableName: 'users';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    resumeDetails: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'resume_details';
        tableName: 'users';
        dataType: 'json';
        columnType: 'PgJsonb';
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    onboardingStep: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'onboarding_step';
        tableName: 'users';
        dataType: 'number';
        columnType: 'PgInteger';
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    isOnboardingCompleted: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'is_onboarding_completed';
        tableName: 'users';
        dataType: 'boolean';
        columnType: 'PgBoolean';
        data: boolean;
        driverParam: boolean;
        notNull: false;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
  };
  dialect: 'pg';
}>;
export declare const jobSeekers: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'job_seekers';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'job_seekers';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    userId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'user_id';
        tableName: 'job_seekers';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    firstName: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'first_name';
        tableName: 'job_seekers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    lastName: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'last_name';
        tableName: 'job_seekers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    phone: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'phone';
        tableName: 'job_seekers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    location: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'location';
        tableName: 'job_seekers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    bio: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'bio';
        tableName: 'job_seekers';
        dataType: 'string';
        columnType: 'PgText';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    resumeUrl: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'resume_url';
        tableName: 'job_seekers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    videoResumeUrl: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'video_resume_url';
        tableName: 'job_seekers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    skills: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'skills';
        tableName: 'job_seekers';
        dataType: 'array';
        columnType: 'PgArray';
        data: string[];
        driverParam: string | string[];
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: import('node_modules/drizzle-orm').Column<
          {
            name: 'skills';
            tableName: 'job_seekers';
            dataType: 'string';
            columnType: 'PgText';
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
          },
          object,
          object
        >;
      },
      {},
      {}
    >;
    profileCompleteness: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'profile_completeness';
        tableName: 'job_seekers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    isPublic: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'is_public';
        tableName: 'job_seekers';
        dataType: 'boolean';
        columnType: 'PgBoolean';
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'job_seekers';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    updatedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'updated_at';
        tableName: 'job_seekers';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
  };
  dialect: 'pg';
}>;
export declare const workExperience: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'work_experience';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'work_experience';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    jobSeekerId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'job_seeker_id';
        tableName: 'work_experience';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    company: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'company';
        tableName: 'work_experience';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    title: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'title';
        tableName: 'work_experience';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    startDate: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'start_date';
        tableName: 'work_experience';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    endDate: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'end_date';
        tableName: 'work_experience';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    isCurrent: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'is_current';
        tableName: 'work_experience';
        dataType: 'boolean';
        columnType: 'PgBoolean';
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    description: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'description';
        tableName: 'work_experience';
        dataType: 'string';
        columnType: 'PgText';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    location: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'location';
        tableName: 'work_experience';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'work_experience';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    updatedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'updated_at';
        tableName: 'work_experience';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
  };
  dialect: 'pg';
}>;
export declare const education: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'education';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'education';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    jobSeekerId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'job_seeker_id';
        tableName: 'education';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    institution: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'institution';
        tableName: 'education';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    degree: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'degree';
        tableName: 'education';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    field: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'field';
        tableName: 'education';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    startDate: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'start_date';
        tableName: 'education';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    endDate: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'end_date';
        tableName: 'education';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    description: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'description';
        tableName: 'education';
        dataType: 'string';
        columnType: 'PgText';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'education';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    updatedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'updated_at';
        tableName: 'education';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
  };
  dialect: 'pg';
}>;
export declare const subscriptionPlanEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['free', 'basic', 'premium', 'enterprise']
>;
export declare const employers: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'employers';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'employers';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    userId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'user_id';
        tableName: 'employers';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    companyName: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'company_name';
        tableName: 'employers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    companyLogo: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'company_logo';
        tableName: 'employers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    website: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'website';
        tableName: 'employers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    industry: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'industry';
        tableName: 'employers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    companySize: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'company_size';
        tableName: 'employers';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    description: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'description';
        tableName: 'employers';
        dataType: 'string';
        columnType: 'PgText';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    isVerified: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'is_verified';
        tableName: 'employers';
        dataType: 'boolean';
        columnType: 'PgBoolean';
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    subscriptionPlan: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'subscription_plan';
        tableName: 'employers';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'free' | 'basic' | 'premium' | 'enterprise';
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: ['free', 'basic', 'premium', 'enterprise'];
        baseColumn: never;
      },
      {},
      {}
    >;
    subscriptionExpiresAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'subscription_expires_at';
        tableName: 'employers';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'employers';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    updatedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'updated_at';
        tableName: 'employers';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
  };
  dialect: 'pg';
}>;
export declare const teamMembers: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'team_members';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'team_members';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    employerId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'employer_id';
        tableName: 'team_members';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    userId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'user_id';
        tableName: 'team_members';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    role: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'role';
        tableName: 'team_members';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    permissions: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'permissions';
        tableName: 'team_members';
        dataType: 'array';
        columnType: 'PgArray';
        data: string[];
        driverParam: string | string[];
        notNull: false;
        hasDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: import('node_modules/drizzle-orm').Column<
          {
            name: 'permissions';
            tableName: 'team_members';
            dataType: 'string';
            columnType: 'PgText';
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
          },
          object,
          object
        >;
      },
      {},
      {}
    >;
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'team_members';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    updatedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'updated_at';
        tableName: 'team_members';
        dataType: 'date';
        columnType: 'PgTimestamp';
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
  };
  dialect: 'pg';
}>;
