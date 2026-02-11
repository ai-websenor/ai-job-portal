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
 * Calculates the profile completion percentage based on 7 equal-weight sections.
 * Each section = 100/7 ≈ 14.29%. Final result is rounded to nearest integer (0-100).
 *
 * Sections:
 * 1. Resume - at least one resume exists
 * 2. Personal Info - firstName, lastName, phone, headline, city all filled
 * 3. Education - at least one education record
 * 4. Skills - at least one profile skill
 * 5. Experience - at least one work experience
 * 6. Job Preferences - record exists with jobTypes and preferredLocations filled
 * 7. Certification - at least one certification
 */
export async function calculateProfileCompletion(
  db: Database,
  userId: string,
): Promise<{ percentage: number; isComplete: boolean }> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
    with: {
      resumes: { limit: 1 },
      workExperiences: { limit: 1 },
      educationRecords: { limit: 1 },
      certifications: { limit: 1 },
      profileSkills: { limit: 1 },
      jobPreferences: true,
    },
  });

  if (!profile) {
    return { percentage: 0, isComplete: false };
  }

  const TOTAL_SECTIONS = 7;
  let completedSections = 0;
  const p = profile as any;

  // 1. Resume
  if (p.resumes && p.resumes.length > 0) completedSections++;

  // 2. Personal Info - mandatory fields filled
  if (profile.firstName && profile.lastName && profile.phone && profile.headline && profile.city) {
    completedSections++;
  }

  // 3. Education
  if (p.educationRecords && p.educationRecords.length > 0) completedSections++;

  // 4. Skills
  if (p.profileSkills && p.profileSkills.length > 0) completedSections++;

  // 5. Experience
  if (p.workExperiences && p.workExperiences.length > 0) completedSections++;

  // 6. Job Preferences - record exists with required fields
  const jp = p.jobPreferences;
  if (jp) {
    const prefs = Array.isArray(jp) ? jp[0] : jp;
    if (prefs && prefs.jobTypes && prefs.preferredLocations) {
      completedSections++;
    }
  }

  // 7. Certification
  if (p.certifications && p.certifications.length > 0) completedSections++;

  const percentage = Math.round((completedSections * 100) / TOTAL_SECTIONS);
  const isComplete = completedSections === TOTAL_SECTIONS;

  return { percentage, isComplete };
}

/**
 * Recalculates and persists the profile completion percentage.
 * Updates profiles.completionPercentage and profiles.isProfileComplete.
 */
async function updateProfileCompletion(db: Database, userId: string): Promise<void> {
  const { percentage, isComplete } = await calculateProfileCompletion(db, userId);

  await db
    .update(profiles)
    .set({
      completionPercentage: percentage,
      isProfileComplete: isComplete,
    })
    .where(eq(profiles.userId, userId));
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

  await updateProfileCompletion(db, userId);
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

  await updateProfileCompletion(db, userId);
}

/**
 * Calculates total experience years by summing actual worked durations
 * from work_experiences, merging overlapping intervals to avoid double-counting.
 *
 * - Uses endDate for past jobs, current date for isCurrent jobs
 * - Skips records without startDate or with negative duration
 * - Returns value rounded to 2 decimal places
 */
export async function calculateTotalExperience(db: Database, userId: string): Promise<number> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
    columns: { id: true },
    with: {
      workExperiences: {
        columns: { startDate: true, endDate: true, isCurrent: true },
      },
    },
  });

  if (!profile) return 0;

  const p = profile as any;
  const experiences = p.workExperiences || [];
  if (experiences.length === 0) return 0;

  const today = new Date();

  // Build intervals [start, end] in milliseconds
  const intervals: { start: number; end: number }[] = [];
  for (const exp of experiences) {
    if (!exp.startDate) continue;

    const start = new Date(exp.startDate).getTime();
    let end: number;

    if (exp.endDate) {
      end = new Date(exp.endDate).getTime();
    } else if (exp.isCurrent) {
      end = today.getTime();
    } else {
      continue; // No end date and not current — skip
    }

    if (end <= start) continue; // Skip negative/zero duration

    intervals.push({ start, end });
  }

  if (intervals.length === 0) return 0;

  // Sort by start date ascending
  intervals.sort((a, b) => a.start - b.start);

  // Merge overlapping intervals
  const merged: { start: number; end: number }[] = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    const curr = intervals[i];
    if (curr.start <= last.end) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push(curr);
    }
  }

  // Sum durations and convert to years
  const totalMs = merged.reduce((sum, interval) => sum + (interval.end - interval.start), 0);
  const years = totalMs / (365.25 * 24 * 60 * 60 * 1000);

  return Math.round(years * 100) / 100;
}

/**
 * Recalculates and persists the total experience years in the profile.
 */
export async function updateTotalExperience(db: Database, userId: string): Promise<void> {
  const totalYears = await calculateTotalExperience(db, userId);

  await db
    .update(profiles)
    .set({ totalExperienceYears: totalYears.toFixed(2) })
    .where(eq(profiles.userId, userId));
}
