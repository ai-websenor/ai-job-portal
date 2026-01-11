export declare const teamRoleEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['admin', 'recruiter', 'hiring_manager', 'interviewer', 'viewer']
>;
export declare const taskPriorityEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['high', 'medium', 'low']
>;
export declare const taskStatusEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['open', 'in_progress', 'completed', 'canceled']
>;
export declare const relatedToTypeEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['job', 'candidate', 'interview']
>;
export declare const entityTypeEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['candidate', 'job', 'task', 'note']
>;
export declare const teamMembersCollaboration: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'team_members_collaboration';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'team_members_collaboration';
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
    companyId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'company_id';
        tableName: 'team_members_collaboration';
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
        tableName: 'team_members_collaboration';
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
        tableName: 'team_members_collaboration';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'admin' | 'recruiter' | 'hiring_manager' | 'interviewer' | 'viewer';
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: ['admin', 'recruiter', 'hiring_manager', 'interviewer', 'viewer'];
        baseColumn: never;
      },
      {},
      {}
    >;
    permissions: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'permissions';
        tableName: 'team_members_collaboration';
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
    invitedBy: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'invited_by';
        tableName: 'team_members_collaboration';
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
    invitedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'invited_at';
        tableName: 'team_members_collaboration';
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
    joinedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'joined_at';
        tableName: 'team_members_collaboration';
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
        tableName: 'team_members_collaboration';
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
        tableName: 'team_members_collaboration';
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
export declare const tasks: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'tasks';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'tasks';
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
    companyId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'company_id';
        tableName: 'tasks';
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
    createdBy: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_by';
        tableName: 'tasks';
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
    assignedTo: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'assigned_to';
        tableName: 'tasks';
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
    title: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'title';
        tableName: 'tasks';
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
    description: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'description';
        tableName: 'tasks';
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
    relatedToType: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'related_to_type';
        tableName: 'tasks';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'candidate' | 'interview' | 'job';
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: ['job', 'candidate', 'interview'];
        baseColumn: never;
      },
      {},
      {}
    >;
    relatedToId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'related_to_id';
        tableName: 'tasks';
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
    priority: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'priority';
        tableName: 'tasks';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'low' | 'medium' | 'high';
        driverParam: string;
        notNull: false;
        hasDefault: true;
        enumValues: ['high', 'medium', 'low'];
        baseColumn: never;
      },
      {},
      {}
    >;
    status: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'status';
        tableName: 'tasks';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'completed' | 'canceled' | 'open' | 'in_progress';
        driverParam: string;
        notNull: false;
        hasDefault: true;
        enumValues: ['open', 'in_progress', 'completed', 'canceled'];
        baseColumn: never;
      },
      {},
      {}
    >;
    dueDate: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'due_date';
        tableName: 'tasks';
        dataType: 'string';
        columnType: 'PgDateString';
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
    completedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'completed_at';
        tableName: 'tasks';
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
        tableName: 'tasks';
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
        tableName: 'tasks';
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
export declare const comments: any;
export declare const activityLogs: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'activity_logs';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'activity_logs';
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
    companyId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'company_id';
        tableName: 'activity_logs';
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
        tableName: 'activity_logs';
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
    action: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'action';
        tableName: 'activity_logs';
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
    entityType: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'entity_type';
        tableName: 'activity_logs';
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
    entityId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'entity_id';
        tableName: 'activity_logs';
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
    changes: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'changes';
        tableName: 'activity_logs';
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
    ipAddress: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'ip_address';
        tableName: 'activity_logs';
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
        tableName: 'activity_logs';
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
        tableName: 'activity_logs';
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
