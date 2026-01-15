export declare const applicationStatusEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['applied', 'viewed', 'shortlisted', 'interview_scheduled', 'rejected', 'hired']
>;
export declare const applications: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'applications';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'applications';
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
        tableName: 'applications';
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
    jobSeekerId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'job_seeker_id';
        tableName: 'applications';
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
    status: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'status';
        tableName: 'applications';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'applied' | 'viewed' | 'shortlisted' | 'interview_scheduled' | 'rejected' | 'hired';
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: [
          'applied',
          'viewed',
          'shortlisted',
          'interview_scheduled',
          'rejected',
          'hired',
        ];
        baseColumn: never;
      },
      {},
      {}
    >;
    coverLetter: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'cover_letter';
        tableName: 'applications';
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
        tableName: 'applications';
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
    screeningAnswers: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'screening_answers';
        tableName: 'applications';
        dataType: 'json';
        columnType: 'PgJson';
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
    rating: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'rating';
        tableName: 'applications';
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
    notes: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'notes';
        tableName: 'applications';
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
    appliedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'applied_at';
        tableName: 'applications';
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
    viewedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'viewed_at';
        tableName: 'applications';
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
    updatedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'updated_at';
        tableName: 'applications';
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
export declare const interviewStatusEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['scheduled', 'confirmed', 'completed', 'rescheduled', 'canceled', 'no_show']
>;
export declare const interviews: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'interviews';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'interviews';
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
        tableName: 'interviews';
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
    interviewType: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'interview_type';
        tableName: 'interviews';
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
    scheduledAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'scheduled_at';
        tableName: 'interviews';
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
    duration: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'duration';
        tableName: 'interviews';
        dataType: 'number';
        columnType: 'PgInteger';
        data: number;
        driverParam: string | number;
        notNull: true;
        hasDefault: true;
        enumValues: undefined;
        baseColumn: never;
      },
      {},
      {}
    >;
    location: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'location';
        tableName: 'interviews';
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
    interviewerNotes: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'interviewer_notes';
        tableName: 'interviews';
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
    candidateFeedback: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'candidate_feedback';
        tableName: 'interviews';
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
    status: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'status';
        tableName: 'interviews';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'scheduled' | 'confirmed' | 'completed' | 'rescheduled' | 'canceled' | 'no_show';
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: ['scheduled', 'confirmed', 'completed', 'rescheduled', 'canceled', 'no_show'];
        baseColumn: never;
      },
      {},
      {}
    >;
    calendarEventId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'calendar_event_id';
        tableName: 'interviews';
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
    reminderSent: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'reminder_sent';
        tableName: 'interviews';
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
        tableName: 'interviews';
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
        tableName: 'interviews';
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
export declare const applicationHistory: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'application_history';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'application_history';
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
        tableName: 'application_history';
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
    changedBy: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'changed_by';
        tableName: 'application_history';
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
    previousStatus: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'previous_status';
        tableName: 'application_history';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'applied' | 'viewed' | 'shortlisted' | 'interview_scheduled' | 'rejected' | 'hired';
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: [
          'applied',
          'viewed',
          'shortlisted',
          'interview_scheduled',
          'rejected',
          'hired',
        ];
        baseColumn: never;
      },
      {},
      {}
    >;
    newStatus: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'new_status';
        tableName: 'application_history';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'applied' | 'viewed' | 'shortlisted' | 'interview_scheduled' | 'rejected' | 'hired';
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: [
          'applied',
          'viewed',
          'shortlisted',
          'interview_scheduled',
          'rejected',
          'hired',
        ];
        baseColumn: never;
      },
      {},
      {}
    >;
    comment: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'comment';
        tableName: 'application_history';
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
        tableName: 'application_history';
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
