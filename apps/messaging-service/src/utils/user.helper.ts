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
      .select({ userId: profiles.userId, profilePhoto: profiles.profilePhoto })
      .from(profiles)
      .where(inArray(profiles.userId, uniqueIds)),
    db
      .select({ userId: employers.userId, profilePhoto: employers.profilePhoto })
      .from(employers)
      .where(inArray(employers.userId, uniqueIds)),
  ]);

  // Build photo map: candidate photos from profiles, employer photos from employers
  const photoMap = new Map<string, string | null>();
  for (const row of profileRows) {
    if (row.profilePhoto) {
      photoMap.set(row.userId, row.profilePhoto);
    }
  }
  // Employer photos fill in where profiles table has no photo
  for (const row of employerRows) {
    if (row.profilePhoto && !photoMap.has(row.userId)) {
      photoMap.set(row.userId, row.profilePhoto);
    }
  }

  for (const user of userRows) {
    const rawPhoto = photoMap.get(user.id) ?? null;
    map.set(user.id, {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePhoto: s3Service ? s3Service.getPublicUrlFromKeyOrUrl(rawPhoto) : rawPhoto,
    });
  }

  return map;
}
