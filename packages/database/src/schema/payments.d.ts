export declare const paymentStatusEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['pending', 'success', 'failed', 'refunded']
>;
export declare const paymentMethodEnum: import('node_modules/drizzle-orm/pg-core').PgEnum<
  ['credit_card', 'debit_card', 'upi', 'netbanking', 'wallet']
>;
export declare const payments: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'payments';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'payments';
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
        tableName: 'payments';
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
    amount: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'amount';
        tableName: 'payments';
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
    currency: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'currency';
        tableName: 'payments';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    status: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'status';
        tableName: 'payments';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'pending' | 'success' | 'failed' | 'refunded';
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: ['pending', 'success', 'failed', 'refunded'];
        baseColumn: never;
      },
      {},
      {}
    >;
    paymentMethod: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'payment_method';
        tableName: 'payments';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'credit_card' | 'debit_card' | 'upi' | 'netbanking' | 'wallet';
        driverParam: string;
        notNull: false;
        hasDefault: false;
        enumValues: ['credit_card', 'debit_card', 'upi', 'netbanking', 'wallet'];
        baseColumn: never;
      },
      {},
      {}
    >;
    paymentGateway: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'payment_gateway';
        tableName: 'payments';
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
    transactionId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'transaction_id';
        tableName: 'payments';
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
    gatewayOrderId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'gateway_order_id';
        tableName: 'payments';
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
    gatewayPaymentId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'gateway_payment_id';
        tableName: 'payments';
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
    invoiceNumber: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'invoice_number';
        tableName: 'payments';
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
    invoiceUrl: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'invoice_url';
        tableName: 'payments';
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
        tableName: 'payments';
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
        tableName: 'payments';
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
        tableName: 'payments';
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
export declare const subscriptions: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'subscriptions';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'subscriptions';
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
        tableName: 'subscriptions';
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
    plan: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'plan';
        tableName: 'subscriptions';
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
    billingCycle: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'billing_cycle';
        tableName: 'subscriptions';
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
    amount: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'amount';
        tableName: 'subscriptions';
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
    currency: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'currency';
        tableName: 'subscriptions';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    startDate: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'start_date';
        tableName: 'subscriptions';
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
        tableName: 'subscriptions';
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
    autoRenew: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'auto_renew';
        tableName: 'subscriptions';
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
    jobPostingLimit: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'job_posting_limit';
        tableName: 'subscriptions';
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
    jobPostingUsed: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'job_posting_used';
        tableName: 'subscriptions';
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
    featuredJobsLimit: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'featured_jobs_limit';
        tableName: 'subscriptions';
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
    featuredJobsUsed: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'featured_jobs_used';
        tableName: 'subscriptions';
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
    createdAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'created_at';
        tableName: 'subscriptions';
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
        tableName: 'subscriptions';
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
export declare const transactionHistory: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'transaction_history';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'transaction_history';
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
    paymentId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'payment_id';
        tableName: 'transaction_history';
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
        tableName: 'transaction_history';
        dataType: 'string';
        columnType: 'PgEnumColumn';
        data: 'pending' | 'success' | 'failed' | 'refunded';
        driverParam: string;
        notNull: true;
        hasDefault: false;
        enumValues: ['pending', 'success', 'failed', 'refunded'];
        baseColumn: never;
      },
      {},
      {}
    >;
    message: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'message';
        tableName: 'transaction_history';
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
    gatewayResponse: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'gateway_response';
        tableName: 'transaction_history';
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
        tableName: 'transaction_history';
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
export declare const invoices: import('node_modules/drizzle-orm/pg-core').PgTableWithColumns<{
  name: 'invoices';
  schema: undefined;
  columns: {
    id: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'id';
        tableName: 'invoices';
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
    paymentId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'payment_id';
        tableName: 'invoices';
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
    invoiceNumber: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'invoice_number';
        tableName: 'invoices';
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
    userId: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'user_id';
        tableName: 'invoices';
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
    amount: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'amount';
        tableName: 'invoices';
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
    taxAmount: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'tax_amount';
        tableName: 'invoices';
        dataType: 'string';
        columnType: 'PgNumeric';
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
    totalAmount: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'total_amount';
        tableName: 'invoices';
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
    currency: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'currency';
        tableName: 'invoices';
        dataType: 'string';
        columnType: 'PgVarchar';
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
      },
      {},
      {}
    >;
    invoiceUrl: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'invoice_url';
        tableName: 'invoices';
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
    generatedAt: import('node_modules/drizzle-orm/pg-core').PgColumn<
      {
        name: 'generated_at';
        tableName: 'invoices';
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
