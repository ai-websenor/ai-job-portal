export declare const videoStatusEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['uploading', 'processing', 'approved', 'rejected', 'active']
>;
export declare const privacySettingEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['public', 'employers_only', 'private']
>;
export declare const moderationStatusEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['pending', 'approved', 'rejected']
>;
export declare const senderEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['user', 'bot', 'agent']
>;
export declare const videoResumes: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'video_resumes';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'video_resumes';
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
        tableName: 'video_resumes';
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
    fileName: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'file_name';
        tableName: 'video_resumes';
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
    originalUrl: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'original_url';
        tableName: 'video_resumes';
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
    processedUrls: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'processed_urls';
        tableName: 'video_resumes';
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
    thumbnailUrl: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'thumbnail_url';
        tableName: 'video_resumes';
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
    durationSeconds: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'duration_seconds';
        tableName: 'video_resumes';
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
    fileSizeMb: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'file_size_mb';
        tableName: 'video_resumes';
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
    resolution: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'resolution';
        tableName: 'video_resumes';
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
    format: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'format';
        tableName: 'video_resumes';
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
    transcription: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'transcription';
        tableName: 'video_resumes';
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
        tableName: 'video_resumes';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'rejected' | 'processing' | 'uploading' | 'approved' | 'active';
        driverParam: string;
        notNull: false;
        hasDefault: true;
        enumValues: ['uploading', 'processing', 'approved', 'rejected', 'active'];
        baseColumn: never;
      },
      {},
      {}
    >;
    privacySetting: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'privacy_setting';
        tableName: 'video_resumes';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'public' | 'private' | 'employers_only';
        driverParam: string;
        notNull: false;
        hasDefault: true;
        enumValues: ['public', 'employers_only', 'private'];
        baseColumn: never;
      },
      {},
      {}
    >;
    moderationStatus: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'moderation_status';
        tableName: 'video_resumes';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'rejected' | 'pending' | 'approved';
        driverParam: string;
        notNull: false;
        hasDefault: true;
        enumValues: ['pending', 'approved', 'rejected'];
        baseColumn: never;
      },
      {},
      {}
    >;
    moderationNotes: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'moderation_notes';
        tableName: 'video_resumes';
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
    uploadedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'uploaded_at';
        tableName: 'video_resumes';
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
    processedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'processed_at';
        tableName: 'video_resumes';
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
    approvedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'approved_at';
        tableName: 'video_resumes';
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
export declare const videoAnalytics: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'video_analytics';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'video_analytics';
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
    videoId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'video_id';
        tableName: 'video_analytics';
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
    viewerId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'viewer_id';
        tableName: 'video_analytics';
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
    viewDurationSeconds: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'view_duration_seconds';
        tableName: 'video_analytics';
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
    completed: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'completed';
        tableName: 'video_analytics';
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
    viewedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'viewed_at';
        tableName: 'video_analytics';
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
        tableName: 'video_analytics';
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
        tableName: 'video_analytics';
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
export declare const messageThreads: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'message_threads';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'message_threads';
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
    participants: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'participants';
        tableName: 'message_threads';
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
    jobId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'job_id';
        tableName: 'message_threads';
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
    applicationId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'application_id';
        tableName: 'message_threads';
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
    lastMessageAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'last_message_at';
        tableName: 'message_threads';
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
    isArchived: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'is_archived';
        tableName: 'message_threads';
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
        tableName: 'message_threads';
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
export declare const messages: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'messages';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'messages';
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
    threadId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'thread_id';
        tableName: 'messages';
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
    senderId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'sender_id';
        tableName: 'messages';
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
    recipientId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'recipient_id';
        tableName: 'messages';
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
    subject: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'subject';
        tableName: 'messages';
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
    body: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'body';
        tableName: 'messages';
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
    attachments: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'attachments';
        tableName: 'messages';
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
    isRead: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'is_read';
        tableName: 'messages';
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
    readAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'read_at';
        tableName: 'messages';
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
        tableName: 'messages';
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
export declare const chatSessions: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'chat_sessions';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'chat_sessions';
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
        tableName: 'chat_sessions';
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
    startedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'started_at';
        tableName: 'chat_sessions';
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
    endedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'ended_at';
        tableName: 'chat_sessions';
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
    messagesCount: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'messages_count';
        tableName: 'chat_sessions';
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
    escalatedToHuman: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'escalated_to_human';
        tableName: 'chat_sessions';
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
    satisfactionRating: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'satisfaction_rating';
        tableName: 'chat_sessions';
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
  };
  dialect: 'pg';
}>;
export declare const chatMessages: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'chat_messages';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'chat_messages';
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
    sessionId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'session_id';
        tableName: 'chat_messages';
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
    sender: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'sender';
        tableName: 'chat_messages';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'user' | 'bot' | 'agent';
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: ['user', 'bot', 'agent'];
        baseColumn: never;
      },
      {},
      {}
    >;
    message: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'message';
        tableName: 'chat_messages';
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
    intent: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'intent';
        tableName: 'chat_messages';
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
    confidence: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'confidence';
        tableName: 'chat_messages';
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
        tableName: 'chat_messages';
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
