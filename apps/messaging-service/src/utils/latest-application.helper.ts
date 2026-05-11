import { and, desc, eq } from 'drizzle-orm';
import { Database, employers, jobApplications, jobs } from '@ai-job-portal/database';
import { UserProfile } from './user.helper';

export type EmployerContext = {
  id: string;
  companyId: string | null;
  rbacRoleId: string | null;
};

export type LatestApplicationSummary = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  status: string;
  appliedAt: Date;
} | null;

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

export function getCandidateParticipantId(
  participantIds: string[],
  profileMap: Map<string, UserProfile>,
  viewerUserId: string,
): string | null {
  const candidateParticipant = participantIds.find(
    (id) => profileMap.get(id)?.role === 'candidate',
  );

  if (candidateParticipant) return candidateParticipant;

  return (
    participantIds.find((id) => id !== viewerUserId && profileMap.get(id)?.role !== 'employer') ||
    null
  );
}

export async function getLatestApplicationForEmployer(
  db: Database,
  candidateUserId: string,
  employer: EmployerContext,
): Promise<LatestApplicationSummary> {
  const ownershipFilter = employer.companyId
    ? eq(jobs.companyId, employer.companyId)
    : eq(jobs.employerId, employer.id);

  const [latestApplication] = await db
    .select({
      applicationId: jobApplications.id,
      jobId: jobs.id,
      jobTitle: jobs.title,
      status: jobApplications.status,
      appliedAt: jobApplications.appliedAt,
    })
    .from(jobApplications)
    .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
    .where(and(eq(jobApplications.jobSeekerId, candidateUserId), ownershipFilter))
    .orderBy(desc(jobApplications.appliedAt))
    .limit(1);

  return latestApplication || null;
}
