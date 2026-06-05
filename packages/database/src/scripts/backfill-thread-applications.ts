import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';
import { createDatabaseClient } from '../client';
import { messageThreads, employers, jobApplications, jobs } from '../index';

// Load .env from repo root (script lives in src/scripts → 4 levels up)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

/**
 * One-time backfill for the "one thread per job application" migration (0032).
 *
 * Legacy threads were keyed on the candidate+employer participant pair, so a single
 * thread may have collapsed conversations about multiple jobs. Messages carry no jobId,
 * so history CANNOT be split per job retroactively. Strategy: assign each legacy thread
 * (application_id IS NULL) its latest application under the resolved company, and align
 * job_id + company_id to that application. New isolated threads form going forward.
 *
 * Run AFTER applying migration 0032, on staging first.
 *   pnpm --filter @ai-job-portal/database db:backfill-threads
 *
 * Idempotent: only touches rows where application_id IS NULL.
 */
async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const db = createDatabaseClient(databaseUrl);

  const legacy = await db.query.messageThreads.findMany({
    where: isNull(messageThreads.applicationId),
  });

  console.log(`Found ${legacy.length} legacy thread(s) without application_id`);

  let updated = 0;
  let skipped = 0;

  for (const thread of legacy) {
    const participantIds = thread.participants.split(',').filter(Boolean);

    // Identify the employer participant(s) → company; the rest is the candidate
    const emps = await db.query.employers.findMany({
      where: inArray(employers.userId, participantIds),
      columns: { userId: true, companyId: true },
    });
    const employerUserIds = new Set(emps.map((e) => e.userId));
    const candidateUserId = participantIds.find((id) => !employerUserIds.has(id));
    const companyId = thread.companyId ?? emps.find((e) => e.companyId)?.companyId ?? null;

    if (!candidateUserId || !companyId) {
      console.warn(
        `  skip thread ${thread.id}: unresolved candidate/company ` +
          `(candidate=${candidateUserId ?? 'none'}, company=${companyId ?? 'none'})`,
      );
      skipped++;
      continue;
    }

    // Latest application by this candidate under the company
    const [app] = await db
      .select({
        id: jobApplications.id,
        jobId: jobApplications.jobId,
        jobCompanyId: jobs.companyId,
      })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(and(eq(jobApplications.jobSeekerId, candidateUserId), eq(jobs.companyId, companyId)))
      .orderBy(desc(jobApplications.appliedAt))
      .limit(1);

    if (!app) {
      console.warn(`  skip thread ${thread.id}: no application found for candidate under company`);
      skipped++;
      continue;
    }

    // Guard: the chosen application may already own a thread (one-per-application unique).
    // Skip to avoid a unique violation; the thread stays legacy (NULL) and uses the fallback path.
    const taken = await db.query.messageThreads.findFirst({
      where: eq(messageThreads.applicationId, app.id),
      columns: { id: true },
    });
    if (taken) {
      console.warn(
        `  skip thread ${thread.id}: application ${app.id} already owns thread ${taken.id}`,
      );
      skipped++;
      continue;
    }

    await db
      .update(messageThreads)
      .set({ applicationId: app.id, jobId: app.jobId, companyId: app.jobCompanyId })
      .where(eq(messageThreads.id, thread.id));

    updated++;
  }

  console.log(`\nBackfill complete. updated=${updated} skipped=${skipped}`);
  console.log(
    'Verify zero NULLs remain:  ' +
      'SELECT count(*) FROM message_threads WHERE application_id IS NULL;',
  );
  process.exit(0);
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
