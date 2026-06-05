import { eq, inArray } from 'drizzle-orm';
import { Database, employers, jobs } from '@ai-job-portal/database';

export type EmployerContext = {
  id: string;
  companyId: string | null;
  rbacRoleId: string | null;
};

export type JobMeta = {
  title: string;
  status: string;
  employerId: string | null;
};

export async function getEmployerContext(
  db: Database,
  userId: string,
): Promise<EmployerContext | null> {
  return (
    (await db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      columns: { id: true, companyId: true, rbacRoleId: true },
    })) ?? null
  );
}

/**
 * Batch-fetch job title + status for a set of jobIds.
 * Used to render thread cards (job title disambiguated by jobId, plus posting status).
 */
export async function getJobMeta(db: Database, jobIds: string[]): Promise<Map<string, JobMeta>> {
  const ids = [...new Set(jobIds.filter(Boolean) as string[])];
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({ id: jobs.id, title: jobs.title, status: jobs.status, employerId: jobs.employerId })
    .from(jobs)
    .where(inArray(jobs.id, ids));

  return new Map(
    rows.map((r) => [r.id, { title: r.title, status: r.status, employerId: r.employerId }]),
  );
}
