/* eslint-disable no-console */
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';
import { createDatabaseClient } from '../client';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function run() {
  const db = createDatabaseClient(process.env.DATABASE_URL!);
  const total = await db.execute(sql`SELECT count(*)::int AS c FROM message_threads`);
  const nullApp = await db.execute(
    sql`SELECT count(*)::int AS c FROM message_threads WHERE application_id IS NULL`,
  );
  const orphans = await db.execute(sql`
    SELECT count(*)::int AS c FROM message_threads mt
    WHERE mt.application_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM job_applications ja WHERE ja.id = mt.application_id)`);
  const get = (r: any) => (r.rows ?? r)[0].c;
  console.log('total threads      :', get(total));
  console.log('application_id NULL :', get(nullApp));
  console.log('orphan application_id (points to missing application):', get(orphans));
  process.exit(0);
}
run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
