import { Database, users, profiles } from '@ai-job-portal/database';
import { eq, sql } from 'drizzle-orm';

/**
 * Checks if the user has completed all mandatory onboarding steps.
 * Mandatory steps:
 * - Personal Info (Profile exists)
 * - Education (At least one record)
 * - Skills (At least one record)
 * - Experience (At least one record)
 * - Job Preferences (Record exists)
 *
 * @param db Database instance
 * @param userId User ID
 * @returns boolean
 */
export async function checkIsOnboardingCompleted(db: Database, userId: string): Promise<boolean> {
  // Fetch profile and related mandatory data
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
    with: {
      workExperiences: { limit: 1 },
      educationRecords: { limit: 1 },
      profileSkills: { limit: 1 },
      jobPreferences: true,
    },
  });

  if (!profile) return false;

  // Check mandatory steps
  const hasPersonalInfo = true; // If profile exists, step 2 is done
  const p = profile as any;
  const hasEducation = p.educationRecords && p.educationRecords.length > 0;
  const hasSkills = p.profileSkills && p.profileSkills.length > 0;
  const hasExperience = p.workExperiences && p.workExperiences.length > 0;

  // jobPreferences is a one-to-one relation in schema definitions (usually),
  // but Drizzle query with `with` might return array or object depending on relation definition.
  // Accessing it safely:
  const hasJobPreferences =
    !!p.jobPreferences && (Array.isArray(p.jobPreferences) ? p.jobPreferences.length > 0 : true);

  return hasPersonalInfo && hasEducation && hasSkills && hasExperience && hasJobPreferences;
}

/**
 * Updates the user's onboarding step and recalculates completion status.
 * onboardingStep will only increase (using GREATEST).
 * isOnboardingCompleted is recalculated based on data existence.
 *
 * @param db Database instance
 * @param userId User ID
 * @param step The step number that was just completed
 */
export async function updateOnboardingStep(
  db: Database,
  userId: string,
  step: number,
): Promise<void> {
  const isCompleted = await checkIsOnboardingCompleted(db, userId);

  await db
    .update(users)
    .set({
      onboardingStep: sql`GREATEST(${users.onboardingStep}, ${step})`,
      isOnboardingCompleted: isCompleted,
    })
    .where(eq(users.id, userId));
}

/**
 * Recalculates and updates only the isOnboardingCompleted status.
 * Use this when data is deleted (which might revert completion) but step number should not change.
 *
 * @param db Database instance
 * @param userId User ID
 */
export async function recalculateOnboardingCompletion(db: Database, userId: string): Promise<void> {
  const isCompleted = await checkIsOnboardingCompleted(db, userId);

  await db
    .update(users)
    .set({
      isOnboardingCompleted: isCompleted,
    })
    .where(eq(users.id, userId));
}
