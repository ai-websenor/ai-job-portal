export declare const socialProviderEnum: import("node_modules/drizzle-orm/pg-core").PgEnum<["google", "linkedin"]>;
export declare const socialLogins: import("node_modules/drizzle-orm/pg-core").PgTableWithColumns<{
    name: "social_logins";
    schema: undefined;
    columns: {
        id: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "social_logins";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        userId: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "social_logins";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        provider: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "provider";
            tableName: "social_logins";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "google" | "linkedin";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["google", "linkedin"];
            baseColumn: never;
        }, {}, {}>;
        providerUserId: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "provider_user_id";
            tableName: "social_logins";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        accessToken: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "access_token";
            tableName: "social_logins";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        refreshToken: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "refresh_token";
            tableName: "social_logins";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tokenExpiresAt: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "token_expires_at";
            tableName: "social_logins";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "social_logins";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const sessions: import("node_modules/drizzle-orm/pg-core").PgTableWithColumns<{
    name: "sessions";
    schema: undefined;
    columns: {
        id: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "sessions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        userId: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "sessions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        token: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "token";
            tableName: "sessions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        refreshToken: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "refresh_token";
            tableName: "sessions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        ipAddress: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "ip_address";
            tableName: "sessions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        userAgent: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "user_agent";
            tableName: "sessions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        deviceInfo: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "device_info";
            tableName: "sessions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        expiresAt: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "expires_at";
            tableName: "sessions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "sessions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const passwordResets: import("node_modules/drizzle-orm/pg-core").PgTableWithColumns<{
    name: "password_resets";
    schema: undefined;
    columns: {
        id: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "password_resets";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        userId: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "password_resets";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        token: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "token";
            tableName: "password_resets";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        expiresAt: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "expires_at";
            tableName: "password_resets";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "password_resets";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const emailVerifications: import("node_modules/drizzle-orm/pg-core").PgTableWithColumns<{
    name: "email_verifications";
    schema: undefined;
    columns: {
        id: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "email_verifications";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        userId: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "email_verifications";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        token: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "token";
            tableName: "email_verifications";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        expiresAt: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "expires_at";
            tableName: "email_verifications";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        verifiedAt: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "verified_at";
            tableName: "email_verifications";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("node_modules/drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "email_verifications";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
