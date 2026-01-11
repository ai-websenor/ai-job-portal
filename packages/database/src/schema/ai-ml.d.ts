export declare const interactionTypeEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['view', 'apply', 'save', 'share', 'not_interested']
>;
export declare const userActionEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['viewed', 'applied', 'saved', 'ignored', 'not_interested']
>;
export declare const diversityLevelEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['low', 'medium', 'high']
>;
export declare const parsingStatusEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['pending', 'processing', 'completed', 'failed']
>;
export declare const userInteractions: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'user_interactions';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'user_interactions';
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
        tableName: 'user_interactions';
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
    jobId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'job_id';
        tableName: 'user_interactions';
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
    interactionType: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'interaction_type';
        tableName: 'user_interactions';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'view' | 'apply' | 'save' | 'share' | 'not_interested';
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: ['view', 'apply', 'save', 'share', 'not_interested'];
        baseColumn: never;
      },
      {},
      {}
    >;
    matchScore: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'match_score';
        tableName: 'user_interactions';
        dataType: 'string';
        columnType: 'PgNumeric';
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
    timestamp: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'timestamp';
        tableName: 'user_interactions';
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
    sessionId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'session_id';
        tableName: 'user_interactions';
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
    metadata: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'metadata';
        tableName: 'user_interactions';
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
export declare const recommendationLogs: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'recommendation_logs';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'recommendation_logs';
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
        tableName: 'recommendation_logs';
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
    jobId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'job_id';
        tableName: 'recommendation_logs';
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
    matchScore: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'match_score';
        tableName: 'recommendation_logs';
        dataType: 'string';
        columnType: 'PgNumeric';
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
    recommendationReason: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'recommendation_reason';
        tableName: 'recommendation_logs';
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
    algorithmVersion: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'algorithm_version';
        tableName: 'recommendation_logs';
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
    userAction: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'user_action';
        tableName: 'recommendation_logs';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'applied' | 'viewed' | 'not_interested' | 'saved' | 'ignored';
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: ['viewed', 'applied', 'saved', 'ignored', 'not_interested'];
        baseColumn: never;
      },
      {},
      {}
    >;
    positionInList: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'position_in_list';
        tableName: 'recommendation_logs';
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
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'recommendation_logs';
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
    actionedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'actioned_at';
        tableName: 'recommendation_logs';
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
  };
  dialect: 'pg';
}>;
export declare const userRecommendationPreferences: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'user_recommendation_preferences';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'user_recommendation_preferences';
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
        tableName: 'user_recommendation_preferences';
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
    jobTypes: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'job_types';
        tableName: 'user_recommendation_preferences';
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
    locations: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'locations';
        tableName: 'user_recommendation_preferences';
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
    salaryMin: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'salary_min';
        tableName: 'user_recommendation_preferences';
        dataType: 'string';
        columnType: 'PgNumeric';
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
    salaryMax: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'salary_max';
        tableName: 'user_recommendation_preferences';
        dataType: 'string';
        columnType: 'PgNumeric';
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
    industries: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'industries';
        tableName: 'user_recommendation_preferences';
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
    excludedCompanies: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'excluded_companies';
        tableName: 'user_recommendation_preferences';
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
    diversityLevel: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'diversity_level';
        tableName: 'user_recommendation_preferences';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'low' | 'medium' | 'high';
        driverParam: string;
        notNull: false;
        hasDefault: true;
        enumValues: ['low', 'medium', 'high'];
        baseColumn: never;
      },
      {},
      {}
    >;
    notificationEnabled: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'notification_enabled';
        tableName: 'user_recommendation_preferences';
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
    minMatchScoreForNotification: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'min_match_score_for_notification';
        tableName: 'user_recommendation_preferences';
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
    updatedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'updated_at';
        tableName: 'user_recommendation_preferences';
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
export declare const mlModels: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'ml_models';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'ml_models';
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
    modelName: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'model_name';
        tableName: 'ml_models';
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
    modelVersion: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'model_version';
        tableName: 'ml_models';
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
    algorithmType: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'algorithm_type';
        tableName: 'ml_models';
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
    parameters: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'parameters';
        tableName: 'ml_models';
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
    performanceMetrics: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'performance_metrics';
        tableName: 'ml_models';
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
    trainingDate: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'training_date';
        tableName: 'ml_models';
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
    deploymentDate: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'deployment_date';
        tableName: 'ml_models';
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
        tableName: 'ml_models';
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
    createdBy: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_by';
        tableName: 'ml_models';
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
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'ml_models';
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
export declare const parsedResumeData: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'parsed_resume_data';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'parsed_resume_data';
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
    resumeId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'resume_id';
        tableName: 'parsed_resume_data';
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
        tableName: 'parsed_resume_data';
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
    personalInfo: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'personal_info';
        tableName: 'parsed_resume_data';
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
    workExperiences: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'work_experiences';
        tableName: 'parsed_resume_data';
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
    education: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'education';
        tableName: 'parsed_resume_data';
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
    skills: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'skills';
        tableName: 'parsed_resume_data';
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
    certifications: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'certifications';
        tableName: 'parsed_resume_data';
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
    projects: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'projects';
        tableName: 'parsed_resume_data';
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
    confidenceScores: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'confidence_scores';
        tableName: 'parsed_resume_data';
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
    rawText: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'raw_text';
        tableName: 'parsed_resume_data';
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
    parsedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'parsed_at';
        tableName: 'parsed_resume_data';
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
export declare const resumeAnalysis: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'resume_analysis';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'resume_analysis';
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
    resumeId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'resume_id';
        tableName: 'resume_analysis';
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
    qualityScore: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'quality_score';
        tableName: 'resume_analysis';
        dataType: 'string';
        columnType: 'PgNumeric';
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
    qualityBreakdown: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'quality_breakdown';
        tableName: 'resume_analysis';
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
    atsScore: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'ats_score';
        tableName: 'resume_analysis';
        dataType: 'string';
        columnType: 'PgNumeric';
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
    atsIssues: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'ats_issues';
        tableName: 'resume_analysis';
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
    suggestions: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'suggestions';
        tableName: 'resume_analysis';
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
    keywordMatches: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'keyword_matches';
        tableName: 'resume_analysis';
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
    analyzedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'analyzed_at';
        tableName: 'resume_analysis';
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
