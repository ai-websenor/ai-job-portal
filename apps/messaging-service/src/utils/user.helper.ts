import { inArray } from 'drizzle-orm';
import { Database, users, profiles } from '@ai-job-portal/database';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePhoto: string | null;
}

export async function getUserProfiles(
  db: Database,
  userIds: string[],
): Promise<Map<string, UserProfile>> {
  const map = new Map<string, UserProfile>();
  if (!userIds.length) return map;

  const uniqueIds = [...new Set(userIds)];

  const [userRows, profileRows] = await Promise.all([
    db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(inArray(users.id, uniqueIds)),
    db
      .select({ userId: profiles.userId, profilePhoto: profiles.profilePhoto })
      .from(profiles)
      .where(inArray(profiles.userId, uniqueIds)),
  ]);

  const photoMap = new Map<string, string | null>();
  for (const row of profileRows) {
    photoMap.set(row.userId, row.profilePhoto);
  }

  for (const user of userRows) {
    map.set(user.id, {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePhoto: photoMap.get(user.id) ?? null,
    });
  }

  return map;
}
