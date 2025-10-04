import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

// Schema exports
export * from './schema/users';
export * from './schema/jobs';
export * from './schema/applications';
export * from './schema/notifications';
export * from './schema/payments';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_job_portal';

export const client = postgres(connectionString);
export const db = drizzle(client);

// Database utilities
export * from './utils/pagination';
export * from './utils/transactions';
