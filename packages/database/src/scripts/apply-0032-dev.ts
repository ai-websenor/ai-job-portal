/* eslint-disable no-console */
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';
import { createDatabaseClient } from '../client';

// One-off: apply migration 0032 (per-application threads) idempotently.
// Used on dev RDS where the drizzle migration journal is out of sync (db was push-managed),
// so the standard migrator cannot run. Each statement is guarded / tolerant of re-runs.
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  console.log(
    'Target host:',
    url
      .replace(/\/\/[^@]+@/, '//***@')
      .split('@')[1]
      ?.split('/')[0],
  );

  const db = createDatabaseClient(url);

  const statements: { label: string; query: ReturnType<typeof sql> }[] = [
    {
      label: 'drop old participants unique index',
      query: sql`DROP INDEX IF EXISTS "uq_message_threads_participants"`,
    },
    {
      label: 'null out orphan application_id (references deleted applications)',
      query: sql`UPDATE "message_threads" SET "application_id" = NULL
        WHERE "application_id" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "job_applications" ja WHERE ja.id = "message_threads"."application_id"
          )`,
    },
    {
      label: 'add application_id FK',
      query: sql`DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'message_threads_application_id_job_applications_id_fk'
        ) THEN
          ALTER TABLE "message_threads"
            ADD CONSTRAINT "message_threads_application_id_job_applications_id_fk"
            FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id")
            ON DELETE set null ON UPDATE no action;
        END IF;
      END $$`,
    },
    {
      label: 'partial unique on application_id',
      query: sql`CREATE UNIQUE INDEX IF NOT EXISTS "uq_message_threads_application"
        ON "message_threads" USING btree ("application_id") WHERE application_id IS NOT NULL`,
    },
    {
      label: 'index participants',
      query: sql`CREATE INDEX IF NOT EXISTS "idx_message_threads_participants"
        ON "message_threads" USING btree ("participants")`,
    },
    {
      label: 'index company_id',
      query: sql`CREATE INDEX IF NOT EXISTS "idx_message_threads_company"
        ON "message_threads" USING btree ("company_id")`,
    },
    {
      label: 'index job_id',
      query: sql`CREATE INDEX IF NOT EXISTS "idx_message_threads_job"
        ON "message_threads" USING btree ("job_id")`,
    },
  ];

  for (const { label, query } of statements) {
    try {
      await db.execute(query);
      console.log(`  ✓ ${label}`);
    } catch (err: any) {
      console.error(`  ✗ ${label}: ${err.message}`);
      throw err;
    }
  }

  console.log('\n0032 applied. Current message_threads indexes:');
  const idx = await db.execute(
    sql`SELECT indexname FROM pg_indexes WHERE tablename = 'message_threads' ORDER BY indexname`,
  );
  console.table((idx as any).rows ?? idx);
  process.exit(0);
}

run().catch((err) => {
  console.error('apply-0032 failed:', err.message);
  process.exit(1);
});
