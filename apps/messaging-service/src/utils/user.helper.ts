import { inArray } from 'drizzle-orm';
import { Database, users, profiles, employers, companies } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePhoto: string | null;
  companyName?: string | null;
  companyLogo?: string | null;
  role?: 'candidate' | 'employer' | null;
}

export async function getUserProfiles(
  db: Database,
  userIds: string[],
  s3Service?: S3Service,
): Promise<Map<string, UserProfile>> {
  const map = new Map<string, UserProfile>();
  if (!userIds.length) return map;

  const uniqueIds = [...new Set(userIds)];

  const [userRows, profileRows, employerRows] = await Promise.all([
    db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(inArray(users.id, uniqueIds)),
    db
      .select({
        userId: profiles.userId,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        profilePhoto: profiles.profilePhoto,
      })
      .from(profiles)
      .where(inArray(profiles.userId, uniqueIds)),
    db
      .select({
        userId: employers.userId,
        firstName: employers.firstName,
        lastName: employers.lastName,
        profilePhoto: employers.profilePhoto,
        companyId: employers.companyId,
      })
      .from(employers)
      .where(inArray(employers.userId, uniqueIds)),
  ]);

  // Build display name and photo maps from profiles/employers (display source)
  const displayNameMap = new Map<string, { firstName: string | null; lastName: string | null }>();
  const photoMap = new Map<string, string | null>();
  const companyIdMap = new Map<string, string | null>();

  for (const row of profileRows) {
    if (row.firstName || row.lastName) {
      displayNameMap.set(row.userId, { firstName: row.firstName, lastName: row.lastName });
    }
    if (row.profilePhoto) {
      photoMap.set(row.userId, row.profilePhoto);
    }
  }
  // Track which users are employers vs candidates
  const employerUserIds = new Set<string>();
  const candidateUserIds = new Set<string>();

  for (const row of profileRows) {
    candidateUserIds.add(row.userId);
  }

  // Employer data fills in where profiles table has no entry
  for (const row of employerRows) {
    employerUserIds.add(row.userId);
    if (!displayNameMap.has(row.userId) && (row.firstName || row.lastName)) {
      displayNameMap.set(row.userId, { firstName: row.firstName, lastName: row.lastName });
    }
    if (row.profilePhoto && !photoMap.has(row.userId)) {
      photoMap.set(row.userId, row.profilePhoto);
    }
    if (row.companyId) {
      companyIdMap.set(row.userId, row.companyId);
    }
  }

  // Batch-fetch company names for employer participants
  const companyIds = [...new Set([...companyIdMap.values()].filter(Boolean))] as string[];
  const companyMap = new Map<string, { name: string; logoUrl: string | null }>();
  if (companyIds.length > 0) {
    const companyRows = await db
      .select({ id: companies.id, name: companies.name, logoUrl: companies.logoUrl })
      .from(companies)
      .where(inArray(companies.id, companyIds));
    for (const c of companyRows) {
      companyMap.set(c.id, { name: c.name, logoUrl: c.logoUrl });
    }
  }

  for (const user of userRows) {
    const rawPhoto = photoMap.get(user.id) ?? null;
    const displayName = displayNameMap.get(user.id);
    const companyId = companyIdMap.get(user.id);
    const company = companyId ? companyMap.get(companyId) : null;

    // Determine role: employer takes precedence (a user in both tables is an employer)
    const role = employerUserIds.has(user.id)
      ? 'employer'
      : candidateUserIds.has(user.id)
        ? 'candidate'
        : null;

    map.set(user.id, {
      id: user.id,
      firstName: displayName?.firstName || user.firstName,
      lastName: displayName?.lastName || user.lastName,
      profilePhoto: s3Service ? s3Service.getPublicUrlFromKeyOrUrl(rawPhoto) : rawPhoto,
      companyName: company?.name ?? null,
      companyLogo: company?.logoUrl
        ? s3Service
          ? s3Service.getPublicUrlFromKeyOrUrl(company.logoUrl)
          : company.logoUrl
        : null,
      role,
    });
  }

  return map;
}
