/**
 * Everything the checks need, loaded once and shaped for comparison.
 *
 * A TypeScript port of `jobboard-ai-engine/app/resume_score/extract.py`.
 *
 * Three sources feed a score, in descending order of authority:
 *
 * 1. **The candidate's profile** — the source of truth for what they can do.
 * 2. **The resume text** — used for the document checks and as a second place
 *    to look for a skill the candidate has but did not list.
 * 3. **The job** — supplies the required skills and the experience band.
 *
 * The profile is **anonymised on the way in**. This score is shown to an
 * employer deciding who to interview, so anything that could stand in for a
 * protected characteristic is removed before the checks ever see it: name,
 * gender, date of birth, marital status, nationality, photo, video and
 * address. Contact details survive only as `'present'` or `''`, because the
 * one thing the checks ask of them is whether a reviewer could get in touch
 * at all.
 *
 * Scrubbing here rather than trusting the rules module not to look is
 * deliberate. It makes the guarantee a property of the data: `AnonymisedProfile`
 * has no key for a name, so a future check cannot accidentally reintroduce a
 * protected field by reading one.
 *
 * This module does the loading and the shaping. It makes no judgements; those
 * all live in `applicant-score.rules.ts`.
 *
 * Everything here loads in bulk — one query per table for the whole
 * shortlist — because a per-applicant round trip would turn a fifty-row
 * applicant list into hundreds of queries while somebody watches a spinner.
 */

import { inArray, eq, desc } from 'drizzle-orm';
import {
  Database,
  profiles,
  users,
  profileSkills,
  skills as skillsTable,
  educationRecords,
  workExperiences,
  jobs,
  resumes,
  parsedResumeData,
} from '@ai-job-portal/database';
import {
  AnonymisedProfile,
  EducationSnapshot,
  JobSnapshot,
  ResumeSnapshot,
  RoleSnapshot,
  ScoreInput,
} from './applicant-score.rules';

/**
 * Removed outright, and listed here so the guarantee is auditable.
 *
 * Every one of these is either a protected characteristic, a direct proxy for
 * one (a photo or a video shows age and ethnicity; an address tracks both
 * wealth and ethnicity), or a name, which is the single strongest predictor
 * of the bias this kind of tool is known to reproduce.
 *
 * `AnonymisedProfile` is built by allowlist rather than by deleting these, so
 * the list below documents the intent while the type enforces it.
 */
export const PROTECTED_FIELDS = [
  'firstName',
  'middleName',
  'lastName',
  'fullName',
  'name',
  'gender',
  'dateOfBirth',
  'dob',
  'age',
  'maritalStatus',
  'nationality',
  'citizenship',
  'religion',
  'profilePhoto',
  'photo',
  'avatar',
  'videoResumeUrl',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'country',
  'pinCode',
  'linkedinUrl',
  'githubUrl',
  'websiteUrl',
  'email',
  'alternatePhone',
  'userId',
  'id',
] as const;

/** Kept, but only as a yes/no. */
export const PRESENT = 'present';

/** The columns read out of `profiles`, before anonymising. */
interface RawProfileRow {
  profileId: string;
  userId: string;
  professionalSummary: string | null;
  totalExperienceYears: string | null;
  completionPercentage: number | null;
  phone: string | null;
  userEmail: string | null;
}

function cleanList(values: unknown): string[] {
  if (values === null || values === undefined) return [];
  const items = Array.isArray(values) ? values : [values];
  const out: string[] = [];
  for (const value of items) {
    const text = String(value ?? '').trim();
    if (text) out.push(text);
  }
  return out;
}

/**
 * `work_experiences.skills_used` is a free-text column, written either as a
 * JSON array or as a comma-separated line. Splitting it properly matters:
 * candidates routinely tag a technology on a role without adding it to the
 * skills tab, and ignoring those would report skills they already entered as
 * missing.
 */
export function parseSkillsUsed(value: unknown): string[] {
  if (Array.isArray(value)) return cleanList(value);
  const text = String(value ?? '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) return cleanList(parsed);
    } catch {
      // Not JSON after all; fall through to the separator split.
    }
  }
  return cleanList(text.split(/[,;|\n]/));
}

/**
 * Build the only view of a candidate the scoring code ever sees.
 *
 * Nothing identifying survives: the returned object carries no name, gender,
 * date of birth, photo, video or address, and the contact fields are reduced
 * to whether a reviewer could make contact.
 */
export function anonymiseProfile(
  row: RawProfileRow | null,
  parts: {
    skills: string[];
    education: EducationSnapshot[];
    experience: RoleSnapshot[];
  },
): AnonymisedProfile | null {
  if (!row) return null;

  return {
    userEmail: String(row.userEmail ?? '').trim() ? PRESENT : '',
    phone: String(row.phone ?? '').trim() ? PRESENT : '',
    professionalSummary: row.professionalSummary ?? '',
    totalExperienceYears: Number(row.totalExperienceYears ?? 0) || 0,
    completionPercentage: Number(row.completionPercentage ?? 0) || 0,
    skills: parts.skills,
    education: parts.education,
    experience: parts.experience,
  };
}

/**
 * Every skill the profile claims, from either place: the skills tab and the
 * technologies tagged on individual roles.
 */
export function ownedSkillsOf(profile: AnonymisedProfile | null): string[] {
  if (!profile) return [];
  return [...profile.skills, ...profile.experience.flatMap((role) => role.skillsUsed)];
}

/**
 * The job's skill list.
 *
 * Only the employer's explicit `skills` array counts. Mining the description
 * for skill-shaped words would make the denominator of the score depend on
 * prose, so the same profile would score differently against two identical
 * jobs written by different recruiters.
 */
export function requiredSkillsOf(job: JobSnapshot | null): string[] {
  return cleanList(job?.skills);
}

/** The columns a resume is scored against, and nothing wider. */
export async function loadJob(db: Database, jobId: string): Promise<JobSnapshot | null> {
  const [row] = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      skills: jobs.skills,
      experienceMin: jobs.experienceMin,
      experienceMax: jobs.experienceMax,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    title: row.title ?? '',
    skills: cleanList(row.skills),
    experienceMin: row.experienceMin ?? null,
    experienceMax: row.experienceMax ?? null,
  };
}

interface ResumeRow {
  profile_id: string;
  id: string;
  name: string | null;
  raw_text: string | null;
}

/**
 * Load an anonymised snapshot for each candidate, in a fixed number of
 * queries regardless of how many candidates there are.
 *
 * `candidateUserIds` never comes from the caller of the HTTP endpoint: the
 * employer sends a job id or an application id, and the candidates are read
 * out of rows the database has already confirmed they are entitled to. By the
 * time this runs the entitlement question has been answered.
 */
export async function loadScoreInputs(
  db: Database,
  candidateUserIds: string[],
  job: JobSnapshot | null,
): Promise<Map<string, ScoreInput>> {
  const result = new Map<string, ScoreInput>();
  const ids = [...new Set(candidateUserIds.filter(Boolean))];
  if (ids.length === 0) return result;

  const profileRows = await db
    .select({
      profileId: profiles.id,
      userId: profiles.userId,
      professionalSummary: profiles.professionalSummary,
      totalExperienceYears: profiles.totalExperienceYears,
      completionPercentage: profiles.completionPercentage,
      phone: profiles.phone,
      userEmail: users.email,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(inArray(profiles.userId, ids));

  if (profileRows.length === 0) return result;

  const profileIds = profileRows.map((row) => row.profileId);

  // Four reads, each covering the whole shortlist at once.
  const [skillRows, educationRows, experienceRows, resumeRows] = await Promise.all([
    db
      .select({ profileId: profileSkills.profileId, name: skillsTable.name })
      .from(profileSkills)
      .innerJoin(skillsTable, eq(skillsTable.id, profileSkills.skillId))
      .where(inArray(profileSkills.profileId, profileIds)),
    db
      .select({
        profileId: educationRecords.profileId,
        institution: educationRecords.institution,
        degree: educationRecords.degree,
        startDate: educationRecords.startDate,
      })
      .from(educationRecords)
      .where(inArray(educationRecords.profileId, profileIds)),
    db
      .select({
        profileId: workExperiences.profileId,
        isCurrent: workExperiences.isCurrent,
        startDate: workExperiences.startDate,
        endDate: workExperiences.endDate,
        description: workExperiences.description,
        achievements: workExperiences.achievements,
        skillsUsed: workExperiences.skillsUsed,
      })
      .from(workExperiences)
      .where(inArray(workExperiences.profileId, profileIds)),
    // "Default, else most recently updated" mirrors what the profile page
    // shows, so a candidate is never scored against a file they think they
    // replaced.
    //
    // Built with the query builder rather than raw SQL. The raw version used
    // `ANY(${profileIds}::uuid[])`, and interpolating a JS array into a sql
    // template expands it to a parameter list that Postgres reads as a record
    // — so the cast failed, and the caller turned that one broken query into
    // "no profile" for every applicant on the shortlist. The DISTINCT ON and
    // LATERAL are not worth that risk for fifteen rows; picking the best
    // resume per profile is done below, in code that cannot mistype a cast.
    db
      .select({
        profileId: resumes.profileId,
        id: resumes.id,
        resumeName: resumes.resumeName,
        fileName: resumes.fileName,
        isDefault: resumes.isDefault,
        updatedAt: resumes.updatedAt,
      })
      .from(resumes)
      .where(inArray(resumes.profileId, profileIds))
      .orderBy(desc(resumes.isDefault), desc(resumes.updatedAt)),
  ]);

  const byProfile = <T extends { profileId: string }>(rows: T[]): Map<string, T[]> => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const bucket = map.get(row.profileId);
      if (bucket) bucket.push(row);
      else map.set(row.profileId, [row]);
    }
    return map;
  };

  const skillsByProfile = byProfile(skillRows);
  const educationByProfile = byProfile(educationRows);
  const experienceByProfile = byProfile(experienceRows);

  // Rows arrive ordered default-first then most-recently-updated, so the
  // first one seen for a profile is the one that profile page shows.
  const resumeByProfile = new Map<string, ResumeRow>();
  for (const row of resumeRows) {
    if (resumeByProfile.has(row.profileId)) continue;
    resumeByProfile.set(row.profileId, {
      profile_id: row.profileId,
      id: row.id,
      name: (row.resumeName || '').trim() || row.fileName || null,
      raw_text: null,
    });
  }

  // Parsed text for just those resumes. Frequently absent — plenty have never
  // been parsed — and every check copes with that.
  const chosenResumeIds = [...resumeByProfile.values()].map((r) => r.id);
  if (chosenResumeIds.length > 0) {
    const parsed = await db
      .select({
        resumeId: parsedResumeData.resumeId,
        rawText: parsedResumeData.rawText,
        parsedAt: parsedResumeData.parsedAt,
      })
      .from(parsedResumeData)
      .where(inArray(parsedResumeData.resumeId, chosenResumeIds))
      .orderBy(desc(parsedResumeData.parsedAt));

    const textByResume = new Map<string, string>();
    for (const row of parsed) {
      if (!row.rawText || textByResume.has(row.resumeId)) continue;
      textByResume.set(row.resumeId, row.rawText);
    }
    for (const entry of resumeByProfile.values()) {
      entry.raw_text = textByResume.get(entry.id) ?? null;
    }
  }

  const requiredSkills = requiredSkillsOf(job);

  for (const row of profileRows) {
    const education: EducationSnapshot[] = (educationByProfile.get(row.profileId) ?? [])
      .slice()
      .sort((a, b) => String(b.startDate ?? '').localeCompare(String(a.startDate ?? '')))
      .map((record) => ({
        institution: record.institution ?? '',
        degree: record.degree ?? '',
      }));

    const experience: RoleSnapshot[] = (experienceByProfile.get(row.profileId) ?? [])
      .slice()
      .sort((a, b) => String(b.startDate ?? '').localeCompare(String(a.startDate ?? '')))
      .map((record) => ({
        isCurrent: Boolean(record.isCurrent),
        startDate: record.startDate ?? null,
        endDate: record.endDate ?? null,
        description: record.description ?? '',
        achievements: record.achievements ?? '',
        skillsUsed: parseSkillsUsed(record.skillsUsed),
      }));

    const profile = anonymiseProfile(row, {
      skills: cleanList((skillsByProfile.get(row.profileId) ?? []).map((s) => s.name)),
      education,
      experience,
    });

    const resumeRow = resumeByProfile.get(row.profileId);
    const resume: ResumeSnapshot | null = resumeRow
      ? { id: String(resumeRow.id), name: String(resumeRow.name ?? '') }
      : null;

    result.set(row.userId, {
      profile,
      resume,
      job,
      rawText: String(resumeRow?.raw_text ?? ''),
      ownedSkills: ownedSkillsOf(profile),
      requiredSkills,
    });
  }

  return result;
}
