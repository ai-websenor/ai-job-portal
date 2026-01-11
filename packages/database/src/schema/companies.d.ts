export declare const companySizeEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['1-10', '11-50', '51-200', '201-500', '500+']
>;
export declare const companyTypeEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['startup', 'sme', 'mnc', 'government']
>;
export declare const verificationStatusEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['pending', 'verified', 'rejected']
>;
export declare const companies: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'companies';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'companies';
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
        tableName: 'companies';
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
    name: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'name';
        tableName: 'companies';
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
    slug: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'slug';
        tableName: 'companies';
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
    industry: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'industry';
        tableName: 'companies';
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
        tableName: 'companies';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: ['1-10', '11-50', '51-200', '201-500', '500+'];
        baseColumn: never;
      },
      {},
      {}
    >;
    yearEstablished: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'year_established';
        tableName: 'companies';
        dataType: 'number';
        columnType: 'PgInteger';
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    companyType: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'company_type';
        tableName: 'companies';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'startup' | 'sme' | 'mnc' | 'government';
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: ['startup', 'sme', 'mnc', 'government'];
        baseColumn: never;
      },
      {},
      {}
    >;
    website: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'website';
        tableName: 'companies';
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
        tableName: 'companies';
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
    mission: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'mission';
        tableName: 'companies';
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
    culture: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'culture';
        tableName: 'companies';
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
    benefits: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'benefits';
        tableName: 'companies';
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
    logoUrl: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'logo_url';
        tableName: 'companies';
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
    bannerUrl: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'banner_url';
        tableName: 'companies';
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
    tagline: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'tagline';
        tableName: 'companies';
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
    isVerified: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'is_verified';
        tableName: 'companies';
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
    verificationStatus: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'verification_status';
        tableName: 'companies';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'rejected' | 'pending' | 'verified';
        driverParam: string;
        notNull: false;
        hasDefault: true;
        enumValues: ['pending', 'verified', 'rejected'];
        baseColumn: never;
      },
      {},
      {}
    >;
    verificationDocuments: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'verification_documents';
        tableName: 'companies';
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
        tableName: 'companies';
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
        tableName: 'companies';
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
export declare const savedSearches: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'saved_searches';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'saved_searches';
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
        tableName: 'saved_searches';
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
    name: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'name';
        tableName: 'saved_searches';
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
    searchCriteria: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'search_criteria';
        tableName: 'saved_searches';
        dataType: 'string';
        columnType: 'PgText';
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
    alertEnabled: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'alert_enabled';
        tableName: 'saved_searches';
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
    alertFrequency: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'alert_frequency';
        tableName: 'saved_searches';
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
    alertChannels: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'alert_channels';
        tableName: 'saved_searches';
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
    lastAlertSent: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'last_alert_sent';
        tableName: 'saved_searches';
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
    isActive: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'is_active';
        tableName: 'saved_searches';
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
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'saved_searches';
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
        tableName: 'saved_searches';
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
export declare const jobViews: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'job_views';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'job_views';
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
    jobId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'job_id';
        tableName: 'job_views';
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
        tableName: 'job_views';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    viewedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'viewed_at';
        tableName: 'job_views';
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
    ipAddress: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'ip_address';
        tableName: 'job_views';
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
    userAgent: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'user_agent';
        tableName: 'job_views';
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
  };
  dialect: 'pg';
}>;
export declare const shareChannelEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['whatsapp', 'email', 'linkedin', 'twitter', 'facebook', 'copy_link']
>;
export declare const jobShares: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'job_shares';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'job_shares';
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
    jobId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'job_id';
        tableName: 'job_shares';
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
        tableName: 'job_shares';
        dataType: 'string';
        columnType: 'PgUUID';
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    shareChannel: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'share_channel';
        tableName: 'job_shares';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'email' | 'whatsapp' | 'linkedin' | 'twitter' | 'facebook' | 'copy_link';
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: ['whatsapp', 'email', 'linkedin', 'twitter', 'facebook', 'copy_link'];
        baseColumn: never;
      },
      {},
      {}
    >;
    sharedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'shared_at';
        tableName: 'job_shares';
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
export declare const applicantNotes: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'applicant_notes';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'applicant_notes';
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
    applicationId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'application_id';
        tableName: 'applicant_notes';
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
    authorId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'author_id';
        tableName: 'applicant_notes';
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
    note: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'note';
        tableName: 'applicant_notes';
        dataType: 'string';
        columnType: 'PgText';
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
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'applicant_notes';
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
        tableName: 'applicant_notes';
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
export declare const applicantTags: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'applicant_tags';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'applicant_tags';
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
    applicationId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'application_id';
        tableName: 'applicant_tags';
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
    tag: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'tag';
        tableName: 'applicant_tags';
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
    color: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'color';
        tableName: 'applicant_tags';
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
    createdBy: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_by';
        tableName: 'applicant_tags';
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
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'applicant_tags';
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
