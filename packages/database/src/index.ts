import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

// Schema exports - Export all schemas from central index
export * from './schema';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_job_portal';

export const client = postgres(connectionString);
export const db = drizzle(client);
