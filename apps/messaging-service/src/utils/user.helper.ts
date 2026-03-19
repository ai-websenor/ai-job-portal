import { inArray } from 'drizzle-orm';
import { Database, users, profiles, employers } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePhoto: string | null;
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
      })
      .from(employers)
      .where(inArray(employers.userId, uniqueIds)),
  ]);

  // Build display name and photo maps from profiles/employers (display source)
  const displayNameMap = new Map<string, { firstName: string | null; lastName: string | null }>();
  const photoMap = new Map<string, string | null>();

  for (const row of profileRows) {
    if (row.firstName || row.lastName) {
      displayNameMap.set(row.userId, { firstName: row.firstName, lastName: row.lastName });
    }
    if (row.profilePhoto) {
      photoMap.set(row.userId, row.profilePhoto);
    }
  }
  // Employer data fills in where profiles table has no entry
  for (const row of employerRows) {
    if (!displayNameMap.has(row.userId) && (row.firstName || row.lastName)) {
      displayNameMap.set(row.userId, { firstName: row.firstName, lastName: row.lastName });
    }
    if (row.profilePhoto && !photoMap.has(row.userId)) {
      photoMap.set(row.userId, row.profilePhoto);
    }
  }

  for (const user of userRows) {
    const rawPhoto = photoMap.get(user.id) ?? null;
    const displayName = displayNameMap.get(user.id);
    map.set(user.id, {
      id: user.id,
      firstName: displayName?.firstName || user.firstName,
      lastName: displayName?.lastName || user.lastName,
      profilePhoto: s3Service ? s3Service.getPublicUrlFromKeyOrUrl(rawPhoto) : rawPhoto,
    });
  }

  return map;
}
