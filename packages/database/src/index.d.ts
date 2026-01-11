import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
export * from './schema';
import * as schema from './schema';
export declare const client: postgres.Sql<{}>;
export declare const db: PostgresJsDatabase<typeof schema>;
