import { Database, jobRecommendations } from '@ai-job-portal/database';
import { eq } from 'drizzle-orm';
import { Logger } from '@nestjs/common';

const logger = new Logger('RecommendationsHelper');

/**
 * Clears a candidate's stored job recommendations so the next read recomputes
 * them from the AI model.
 *
 * Recommendations are derived from skills, experience and job preferences.
 * Once stored they are served indefinitely, so without this a candidate who
 * updates their profile keeps seeing matches based on the old one.
 *
 * Services do not call each other in this architecture, so invalidation is a
 * delete against the shared table rather than a request to
 * recommendation-service. The next `GET /recommendations/jobs` finds no rows
 * and fetches fresh results.
 *
 * Failures are logged and swallowed: stale recommendations are a much smaller
 * problem than a failed profile update, and the user's actual write has
 * already succeeded by the time this runs.
 *
 * @param db Database instance
 * @param userId User ID whose recommendations should be recomputed
 */
export async function invalidateJobRecommendations(db: Database, userId: string): Promise<void> {
  try {
    await db.delete(jobRecommendations).where(eq(jobRecommendations.userId, userId));
  } catch (error) {
    logger.warn(
      `Could not clear job recommendations for user ${userId}: ${error?.message ?? error}`,
    );
  }
}
