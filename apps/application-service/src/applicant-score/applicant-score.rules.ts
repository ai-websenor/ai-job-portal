/**
 * Every deterministic check, and the score.
 *
 * A TypeScript port of `jobboard-ai-engine/app/resume_score/rules.py`, kept
 * behaviour-identical so a number produced here matches the one the Python
 * engine produced for the same applicant.
 *
 * Three rules govern this module and nothing else in the feature matters as
 * much:
 *
 * * **No model runs here.** Every point in a response is counted in this file.
 *   There is no LLM anywhere in this feature; the wording below is the whole
 *   wording, so nothing can be "degraded" by a model outage.
 * * **Same input, same output.** `evaluate()` reads only the snapshot it is
 *   handed, so the same applicant scored twice gets the same number. A score
 *   that drifts on its own is a score nobody can defend.
 * * **Only job-relevant facts.** The snapshot arrives already stripped of
 *   names, gender, age, photos and addresses (see `anonymiseProfile` in
 *   `applicant-score.extract.ts`), and nothing here goes looking for them.
 *   Skills, experience, education and the quality of the document — that is
 *   the whole basis of the number.
 *
 * The 100 points split three ways, mirroring the three bars in the UI:
 *
 * | Bucket              | Points | What it measures                           |
 * |---------------------|--------|--------------------------------------------|
 * | Skills & Keywords   | 40     | share of the job's required skills present |
 * | Experience & Impact | 30     | 5 checks worth 6 points each               |
 * | Resume Quality      | 30     | 6 checks worth 5 points each               |
 *
 * Each check also emits a short, factual, third-person sentence: a
 * **strength** when it passes, a **gap** when it does not. Those are what the
 * employer reads. They are observations about fit, never advice — an employer
 * cannot edit somebody else's profile, so telling them to is noise.
 */

import { expandSkillVariants, skillOverlap } from '@ai-job-portal/common';

export const SKILL_POINTS = 40;
export const EXPERIENCE_POINTS = 30;
export const CONTENT_POINTS = 30;

/**
 * A profile that lists this many skills stops losing points when there is no
 * job to measure against. Eight is roughly where a profile starts appearing in
 * a useful spread of employer searches.
 */
const GENERIC_SKILL_TARGET = 8;

/** Word counts either side of this read as a stub or as a dissertation. */
const RESUME_MIN_WORDS = 150;
const RESUME_MAX_WORDS = 1200;

const SUMMARY_MIN_WORDS = 30;
const PROFILE_COMPLETE_PERCENT = 80;

/**
 * "Recent" is generous on purpose: career breaks, study and caring gaps are
 * common, they fall unevenly on people, and a shortlisting score is the last
 * place that should be punished.
 */
const RECENT_ROLE_DAYS = 730;

/** Default cap on how many gaps a response carries. */
export const DEFAULT_MAX_SUGGESTIONS = 6;

const ACTION_VERBS = [
  'achieved',
  'architected',
  'automated',
  'built',
  'created',
  'cut',
  'delivered',
  'designed',
  'developed',
  'directed',
  'drove',
  'engineered',
  'expanded',
  'implemented',
  'improved',
  'increased',
  'introduced',
  'launched',
  'led',
  'managed',
  'migrated',
  'optimised',
  'optimized',
  'owned',
  'rebuilt',
  'reduced',
  'refactored',
  'resolved',
  'scaled',
  'shipped',
  'simplified',
  'streamlined',
  'supported',
  'trained',
];

type Priority = 'high' | 'medium' | 'low';

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export type Band = 'excellent' | 'good' | 'fair' | 'needsWork';

/**
 * The headline describes the match, not the person. "Excellent candidate" is
 * a judgement this tool is not entitled to make; "strong match for this role"
 * is a statement about overlap, which is all it measured.
 */
const BANDS: ReadonlyArray<readonly [number, Band, string]> = [
  [85, 'excellent', 'Strong match for this role'],
  [70, 'good', 'Good match for this role'],
  [50, 'fair', 'Partial match for this role'],
  [0, 'needsWork', 'Limited match for this role'],
];

/**
 * Checks that describe the resume file rather than the profile. Stored in the
 * `ats_issues` column, which is what that column was always for.
 */
const ATS_CHECK_IDS = new Set([
  'upload-resume',
  'resume-too-short',
  'resume-too-long',
  'fix-inconsistent-dates',
  'add-contact-details',
]);

// -- the snapshot a score is computed from -------------------------------

/** One role from the candidate's work history, with nothing identifying. */
export interface RoleSnapshot {
  isCurrent: boolean;
  startDate: string | null;
  endDate: string | null;
  description: string;
  achievements: string;
  skillsUsed: string[];
}

/** One qualification. Only its existence is counted. */
export interface EducationSnapshot {
  institution: string;
  degree: string;
}

/**
 * The profile, after `anonymiseProfile`. There is deliberately no key here
 * for a name, a gender, a date of birth or an address: a future check cannot
 * reintroduce a protected field by reading a key that does not exist.
 *
 * `userEmail` and `phone` are the literal `'present'` or `''` and nothing
 * else, because the only question asked of them is whether a reviewer could
 * make contact.
 */
export interface AnonymisedProfile {
  userEmail: string;
  phone: string;
  professionalSummary: string;
  totalExperienceYears: number;
  completionPercentage: number;
  skills: string[];
  education: EducationSnapshot[];
  experience: RoleSnapshot[];
}

/** The columns of the job a resume is scored against. */
export interface JobSnapshot {
  id: string;
  title: string;
  skills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
}

/** The resume file, if there is one. Only its presence and text are read. */
export interface ResumeSnapshot {
  id: string;
  name: string;
}

/**
 * The immutable snapshot a score is computed from.
 *
 * `evaluate()` takes one of these and nothing else, which is what makes the
 * score reproducible: the same snapshot always yields the same number.
 */
export interface ScoreInput {
  profile: AnonymisedProfile | null;
  resume: ResumeSnapshot | null;
  job: JobSnapshot | null;
  rawText: string;
  ownedSkills: string[];
  requiredSkills: string[];
}

export interface BreakdownBar {
  key: 'skills' | 'experience' | 'content';
  label: string;
  score: number;
}

export interface EvaluateResult {
  score: number;
  band: Band;
  headline: string;
  summary: string;
  breakdown: BreakdownBar[];
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  gaps: string[];
  atsIssues: string[];
  bucketPoints: { skills: number; experience: number; content: number };
}

interface Finding {
  id: string;
  priority: Priority;
  gap: string;
  points: number;
}

// -- small helpers -------------------------------------------------------

/** One thing the applicant does not have. `points` is what it cost them. */
function finding(id: string, priority: Priority, gap: string, points: number): Finding {
  return {
    id,
    priority,
    gap: String(gap).trim().split(/\s+/).join(' '),
    points: Math.max(0, Math.trunc(points)),
  };
}

/**
 * Python's `round()`, which is round-half-to-even rather than half-up.
 *
 * It matters: `round(32.5)` is 32 in Python and 33 with `Math.round`, and a
 * bucket percentage landing on a half is routine. Reproducing the tie-break
 * keeps a score computed here equal to the one the Python engine produced.
 */
export function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

/** Python's `f"{value:g}"` — six significant digits, no trailing zeros. */
export function formatG(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) >= 1e6) return String(value);
  let text = value.toPrecision(6);
  if (text.includes('.')) {
    text = text.replace(/0+$/, '').replace(/\.$/, '');
  }
  return text;
}

const DATE_PATTERNS: Array<RegExp> = [
  /^(\d{4})-(\d{1,2})-(\d{1,2})/, // %Y-%m-%d
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // %d/%m/%Y and %m/%d/%Y share a shape
  /^(\d{4})-(\d{1,2})$/, // %Y-%m
  /^(\d{4})$/, // %Y
];

/** Parse the handful of date spellings the profile tables actually hold. */
export function asDate(value: string | Date | null | undefined): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (!text) return null;
  const head = text.slice(0, 10);

  for (const pattern of DATE_PATTERNS) {
    const match = pattern.exec(head);
    if (!match) continue;
    let year: number;
    let month: number;
    let day: number;
    if (match[0].includes('/')) {
      // Ambiguous between day-first and month-first; Python tried day-first
      // first, so an unambiguous value lands the same way here.
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
      if (month > 12) [day, month] = [month, day];
    } else {
      year = Number(match[1]);
      month = match[2] ? Number(match[2]) : 1;
      day = match[3] ? Number(match[3]) : 1;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Flatten a description or achievements field, which may be a list. */
function textOf(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(textOf).join(' ');
  if (typeof value === 'object')
    return Object.values(value as object)
      .map(textOf)
      .join(' ');
  return String(value);
}

function roleText(role: RoleSnapshot): string {
  return `${textOf(role.description)} ${textOf(role.achievements)}`.trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when any spelling of `skill` appears in the resume text.
 *
 * Bounded on both sides so "R" does not match every word containing an r and
 * "Go" does not match "Google". `+` and `#` count as word characters here so
 * a bare "C" cannot match the "C" in "C++".
 */
function foundInText(skill: string, text: string): boolean {
  if (!text) return false;
  const low = text.toLowerCase();
  for (const variant of expandSkillVariants([skill])) {
    const token = variant.trim().toLowerCase();
    if (token.length < 2) continue;
    const pattern = new RegExp(`(?<![a-z0-9+#])${escapeRegExp(token)}(?![a-z0-9+#])`);
    if (pattern.test(low)) return true;
  }
  return false;
}

function toFloat(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Round a career length to something a person would say out loud.
 *
 * `totalExperienceYears` arrives as a computed decimal (14.08), which reads
 * like false precision about someone's career.
 */
export function yearsText(years: number): string {
  const value = roundHalfEven(toFloat(years) * 2) / 2;
  if (value < 1) return 'under a year';
  if (value === Math.trunc(value)) {
    return `${Math.trunc(value)} year${value !== 1 ? 's' : ''}`;
  }
  return `${formatG(value)} years`;
}

/** "A, B and 2 more" — the stable way every sentence names skills. */
function listing(values: string[], limit = 3): string {
  const shown = values.slice(0, limit).join(', ');
  const extra = values.length - limit;
  return extra > 0 ? `${shown} and ${extra} more` : shown;
}

/** Count words the way Python's `str.split()` does. */
function wordCount(value: string): number {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// -- the skills ceiling --------------------------------------------------

/**
 * A total score alone will call someone a "Good match" on the strength of a
 * long career and a tidy resume while they match two of the eight skills the
 * job actually lists. Against the live data that is not hypothetical: an
 * applicant scored 70 with experience 100, resume 100 and skills 25.
 *
 * For a tool an employer shortlists with, the skills bar is the part that
 * answers "can they do this job", so it sets a ceiling on the claim the
 * headline is allowed to make. The number still moves with every bucket;
 * what it may be *called* does not outrun the skills evidence.
 */
const SKILLS_CEILING: ReadonlyArray<readonly [number, Band | null]> = [
  [60, null], // 60%+ coverage: no ceiling
  [35, 'fair'], // 35-59%: at best a partial match
  [0, 'needsWork'], // under 35%: limited, whatever else is strong
];

const BAND_RANK: Record<Band, number> = BANDS.reduce(
  (acc, [, key], index) => {
    acc[key] = index;
    return acc;
  },
  {} as Record<Band, number>,
);

function ceilingBand(skillsPct: number | null): Band | null {
  if (skillsPct === null) return null;
  for (const [threshold, ceiling] of SKILLS_CEILING) {
    if (skillsPct >= threshold) return ceiling;
  }
  return null;
}

/**
 * Band and headline for a score, never outrunning the skills coverage.
 *
 * `skillsPct` is the Skills & Keywords bar. Pass `null` and this behaves as a
 * plain threshold lookup, which is what a score with no target job wants,
 * since there are no required skills to cover.
 */
export function bandFor(score: number, skillsPct: number | null = null): [Band, string] {
  let chosen: [Band, string] = [BANDS[BANDS.length - 1][1], BANDS[BANDS.length - 1][2]];
  for (const [threshold, key, headline] of BANDS) {
    if (score >= threshold) {
      chosen = [key, headline];
      break;
    }
  }

  const ceiling = ceilingBand(skillsPct);
  if (ceiling && BAND_RANK[chosen[0]] < BAND_RANK[ceiling]) {
    const capped = BANDS.find(([, key]) => key === ceiling)!;
    return [capped[1], capped[2]];
  }
  return chosen;
}

// -- bucket 1: skills and keywords (40) ----------------------------------

interface SkillsResult {
  earned: number;
  matched: string[];
  missing: string[];
  strengths: string[];
  findings: Finding[];
}

/** Share of the job's required skills the applicant can evidence. */
function scoreSkills(data: ScoreInput): SkillsResult {
  const findings: Finding[] = [];
  const strengths: string[] = [];
  const owned = [...data.ownedSkills];
  const required = [...data.requiredSkills];

  if (required.length === 0) {
    // No job to match against, so the question becomes "is there enough here
    // to match anything at all".
    const distinct = new Set(owned.map((skill) => skill.toLowerCase())).size;
    const earned = roundHalfEven(
      (SKILL_POINTS * Math.min(distinct, GENERIC_SKILL_TARGET)) / GENERIC_SKILL_TARGET,
    );
    if (distinct === 0) {
      findings.push(finding('no-skills', 'high', 'No skills listed on the profile.', SKILL_POINTS));
    } else if (distinct < GENERIC_SKILL_TARGET) {
      const plural = distinct !== 1 ? 's' : '';
      findings.push(
        finding(
          'few-skills',
          'medium',
          `Only ${distinct} skill${plural} listed on the profile.`,
          SKILL_POINTS - earned,
        ),
      );
    } else {
      strengths.push(`Lists ${distinct} distinct skills.`);
    }
    return { earned, matched: [], missing: [], strengths, findings };
  }

  const overlap = skillOverlap(required, owned);

  // Second chance from the resume file: a skill written up in the resume but
  // never added to the skills tab is still evidence the applicant has it. It
  // earns the point and is still worth mentioning, because the employer's own
  // candidate search reads the profile, not the PDF.
  const fromText: string[] = [];
  const stillMissing: string[] = [];
  for (const skill of overlap.missing) {
    (foundInText(skill, data.rawText) ? fromText : stillMissing).push(skill);
  }

  const matched = [...overlap.matched, ...fromText];
  const total = matched.length + stillMissing.length;
  const ratio = total ? matched.length / total : 0;
  const earned = roundHalfEven(SKILL_POINTS * ratio);

  if (matched.length) {
    strengths.push(
      `Covers ${matched.length} of the ${total} skills this job lists: ${listing(matched, 5)}.`,
    );
  }

  if (owned.length === 0) {
    findings.push(
      finding(
        'no-skills',
        'high',
        'No skills listed on the profile, so nothing this job asks for can be matched against it.',
        SKILL_POINTS - earned,
      ),
    );
  } else if (stillMissing.length) {
    findings.push(
      finding(
        'missing-skills',
        ratio < 0.6 ? 'high' : 'medium',
        `No mention of ${listing(stillMissing)}, which this job lists.`,
        SKILL_POINTS - earned,
      ),
    );
  }

  if (fromText.length) {
    findings.push(
      finding(
        'skills-only-in-resume',
        'low',
        `${listing(fromText)} appears in the resume text but not on the profile skills list.`,
        0,
      ),
    );
  }

  return { earned, matched, missing: stillMissing, strengths, findings };
}

// -- bucket 2: experience and impact (30) --------------------------------

/** Five checks worth six points each. */
function scoreExperience(
  data: ScoreInput,
  today: Date,
): { earned: number; strengths: string[]; findings: Finding[] } {
  const roles = data.profile?.experience ?? [];
  const findings: Finding[] = [];
  const strengths: string[] = [];
  const each = Math.floor(EXPERIENCE_POINTS / 5);

  if (roles.length === 0) {
    findings.push(
      finding('no-experience', 'high', 'No work history listed on the profile.', EXPERIENCE_POINTS),
    );
    return { earned: 0, strengths, findings };
  }

  let earned = 0;
  const job = data.job;
  const years = toFloat(data.profile?.totalExperienceYears);

  // 1. Inside the band the job asks for. Being over the top of the band is not
  //    rewarded and not penalised — it is simply not what was asked.
  const minimum = job?.experienceMin ?? null;
  const maximum = job?.experienceMax ?? null;
  if (minimum === null) {
    if (years > 0) {
      earned += each;
      strengths.push(`${yearsText(years)} of experience on the profile.`);
    } else {
      findings.push(
        finding(
          'add-experience-years',
          'medium',
          'The profile does not state total years of experience.',
          each,
        ),
      );
    }
  } else if (years >= toFloat(minimum)) {
    earned += each;
    const band =
      maximum !== null
        ? `${formatG(toFloat(minimum))}-${formatG(toFloat(maximum))}`
        : `${formatG(toFloat(minimum))}+`;
    strengths.push(`${yearsText(years)} of experience against the ${band} asked for.`);
  } else {
    findings.push(
      finding(
        'experience-below-band',
        'medium',
        `${yearsText(years)} of experience, against the ${formatG(toFloat(minimum))}+ this job asks for.`,
        each,
      ),
    );
  }

  // 2. A current or recent role.
  const cutoff = new Date(today.getTime() - RECENT_ROLE_DAYS * 24 * 60 * 60 * 1000);
  const recent = roles.some((role) => {
    if (role.isCurrent) return true;
    const end = asDate(role.endDate);
    return end !== null && end.getTime() >= cutoff.getTime();
  });
  if (recent) {
    earned += each;
    strengths.push('Currently in, or recently left, a listed role.');
  } else {
    findings.push(
      finding(
        'no-current-role',
        'medium',
        'The most recent listed role ended more than two years ago.',
        each,
      ),
    );
  }

  // 3. Every role dated.
  const undated = roles.filter(
    (role) => !asDate(role.startDate) || !(role.isCurrent || asDate(role.endDate)),
  );
  if (undated.length === 0) {
    earned += each;
    strengths.push(
      roles.length === 1
        ? 'The listed role carries start and end dates.'
        : `All ${roles.length} listed roles carry start and end dates.`,
    );
  } else {
    const verb = undated.length === 1 ? 'is' : 'are';
    findings.push(
      finding(
        'missing-role-dates',
        'medium',
        `${undated.length} of ${roles.length} roles ${verb} missing a start or end date.`,
        each,
      ),
    );
  }

  const body = roles.map(roleText).join(' ');

  // 4. Numbers in the descriptions — measurable results.
  if (/\d/.test(body)) {
    earned += each;
    strengths.push('Role descriptions quantify the work with figures.');
  } else {
    findings.push(
      finding(
        'quantify-achievements',
        'medium',
        'No figures in any role description, so the scale of the work is not evidenced.',
        each,
      ),
    );
  }

  // 5. Action verbs.
  const low = body.toLowerCase();
  const verbs = ACTION_VERBS.filter((verb) => new RegExp(`\\b${verb}\\b`).test(low));
  if (verbs.length >= 3) {
    earned += each;
    strengths.push('Role descriptions are written in terms of what was delivered.');
  } else {
    findings.push(
      finding(
        'add-action-verbs',
        'low',
        'Role descriptions read as a list of duties rather than results.',
        each,
      ),
    );
  }

  return { earned, strengths, findings };
}

// -- bucket 3: resume quality (30) ---------------------------------------

/**
 * Each family is a way of writing the same thing. Two or more in one document
 * is the inconsistency reviewers and resume parsers trip over.
 */
const DATE_FAMILIES: ReadonlyArray<readonly [string, RegExp]> = [
  ['slash', /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/],
  ['iso', /\b\d{4}-\d{1,2}-\d{1,2}\b/],
  ['dotted', /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/],
  ['monthName', /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/i],
  ['monthSlash', /\b\d{1,2}\/\d{4}\b/],
];

function mixedDateFormats(text: string): boolean {
  if (!text) return false;
  return DATE_FAMILIES.filter(([, pattern]) => pattern.test(text)).length >= 2;
}

/** Six checks worth five points each. */
function scoreContent(data: ScoreInput): {
  earned: number;
  strengths: string[];
  findings: Finding[];
} {
  const profile = data.profile;
  const findings: Finding[] = [];
  const strengths: string[] = [];
  const each = Math.floor(CONTENT_POINTS / 6);
  let earned = 0;

  // 1. Contact details. Only their presence is visible here — the values were
  //    replaced with a marker before this module saw them.
  const hasEmail = Boolean(String(profile?.userEmail ?? '').trim());
  const hasPhone = Boolean(String(profile?.phone ?? '').trim());
  if (hasEmail && hasPhone) {
    earned += each;
  } else {
    findings.push(
      finding(
        'add-contact-details',
        'high',
        'The profile is missing an email address or a phone number.',
        each,
      ),
    );
  }

  // 2. Professional summary.
  const summaryWords = wordCount(profile?.professionalSummary ?? '');
  if (summaryWords >= SUMMARY_MIN_WORDS) {
    earned += each;
    strengths.push(`Professional summary of ${summaryWords} words.`);
  } else if (summaryWords === 0) {
    findings.push(finding('add-summary', 'high', 'No professional summary on the profile.', each));
  } else {
    findings.push(
      finding(
        'expand-summary',
        'medium',
        `The professional summary is only ${summaryWords} words.`,
        each,
      ),
    );
  }

  // 3. Education.
  const education = profile?.education ?? [];
  if (education.length) {
    earned += each;
    const noun = education.length === 1 ? 'qualification' : 'qualifications';
    strengths.push(`${education.length} ${noun} listed.`);
  } else {
    findings.push(finding('add-education', 'medium', 'No education listed on the profile.', each));
  }

  // 4. Consistent dates in the resume file.
  if (!mixedDateFormats(data.rawText)) {
    earned += each;
  } else {
    findings.push(
      finding(
        'fix-inconsistent-dates',
        'low',
        'The resume mixes date formats, which is where parsers misread dates.',
        each,
      ),
    );
  }

  // 5. Resume present and a sensible length.
  const words = wordCount(data.rawText);
  if (!data.resume) {
    findings.push(
      finding(
        'upload-resume',
        'high',
        'No resume on file — the profile is the only thing to go on.',
        each,
      ),
    );
  } else if (!data.rawText) {
    // The file exists but has never been parsed. There is nothing to judge, so
    // the benefit of the doubt goes to the applicant rather than charging them
    // for our own parsing backlog.
    earned += each;
  } else if (words < RESUME_MIN_WORDS) {
    findings.push(
      finding(
        'resume-too-short',
        'medium',
        `The resume is about ${words} words, short for a full history.`,
        each,
      ),
    );
  } else if (words > RESUME_MAX_WORDS) {
    findings.push(
      finding(
        'resume-too-long',
        'low',
        `The resume is about ${words} words, long for a first review.`,
        each,
      ),
    );
  } else {
    earned += each;
    strengths.push(`Resume on file, about ${words} words.`);
  }

  // 6. Overall completeness, as the platform itself measures it.
  const completion = toFloat(profile?.completionPercentage);
  if (completion >= PROFILE_COMPLETE_PERCENT) {
    earned += each;
    strengths.push(`Profile is ${formatG(completion)}% complete.`);
  } else {
    findings.push(
      finding(
        'complete-profile',
        'medium',
        `The profile is only ${formatG(completion)}% complete.`,
        each,
      ),
    );
  }

  return { earned, strengths, findings };
}

// -- assembly ------------------------------------------------------------

/** Bucket score as 0-100 — the UI draws these as progress bars. */
function percent(points: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, roundHalfEven((100 * points) / total)));
}

/** Highest priority first, then biggest loss, then id so ties never wobble. */
function order(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const priority = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
    if (priority !== 0) return priority;
    if (a.points !== b.points) return b.points - a.points;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Keyed on the awarded band rather than the raw score, so the sentence can
 * never contradict the headline above it. Reading "Covers most of what this
 * role asks for" beside a skills bar of 25% is worse than saying nothing.
 */
const SUMMARY_LEAD: Record<Band, string> = {
  excellent: 'Covers nearly everything {target} asks for.',
  good: 'Covers most of what {target} asks for.',
  fair: 'Covers some of what {target} asks for.',
  needsWork: 'Misses several of the things {target} asks for.',
};

/** One or two plain sentences an employer can act on. */
export function summaryFor(band: Band, gapCount: number, hasJob: boolean): string {
  const target = hasJob ? 'this role' : 'a typical role';
  const lead = (SUMMARY_LEAD[band] ?? SUMMARY_LEAD.needsWork).replace('{target}', target);

  if (!gapCount) return `${lead} Nothing significant is missing from the application.`;
  if (gapCount === 1) return `${lead} One gap worth asking about is listed below.`;
  return `${lead} ${gapCount} gaps worth asking about are listed below.`;
}

export interface EvaluateOptions {
  /** Injectable so the "recent role" check can be tested without rewriting
   *  fixtures every two years. */
  today?: Date;
  maxSuggestions?: number;
}

/**
 * Score a snapshot. Pure: no model, no I/O, no clock beyond `today`.
 */
export function evaluate(data: ScoreInput, options: EvaluateOptions = {}): EvaluateResult {
  const today = options.today ?? new Date();
  const limit = Math.max(1, Math.trunc(options.maxSuggestions || DEFAULT_MAX_SUGGESTIONS));

  const skills = scoreSkills(data);
  const experience = scoreExperience(data, today);
  const content = scoreContent(data);

  const score = Math.max(0, Math.min(100, skills.earned + experience.earned + content.earned));
  // The skills bar caps what the headline may claim. Only when there is a
  // target job: a score with no job has no required skills to cover.
  const skillsPct = data.job ? percent(skills.earned, SKILL_POINTS) : null;
  const [band, headline] = bandFor(score, skillsPct);

  const findings = order([...skills.findings, ...experience.findings, ...content.findings]);
  const shown = findings.slice(0, limit);

  const atsIssues = findings.filter((f) => ATS_CHECK_IDS.has(f.id)).map((f) => f.id);
  const strengths = [...skills.strengths, ...experience.strengths, ...content.strengths].slice(
    0,
    limit,
  );
  const gaps = shown.map((f) => f.gap);

  return {
    score,
    band,
    headline,
    summary: summaryFor(band, gaps.length, Boolean(data.job)),
    breakdown: [
      { key: 'skills', label: 'Skills & Keywords', score: percent(skills.earned, SKILL_POINTS) },
      {
        key: 'experience',
        label: 'Experience & Impact',
        score: percent(experience.earned, EXPERIENCE_POINTS),
      },
      { key: 'content', label: 'Resume Quality', score: percent(content.earned, CONTENT_POINTS) },
    ],
    matchedKeywords: skills.matched,
    missingKeywords: skills.missing,
    strengths,
    gaps,
    atsIssues,
    bucketPoints: {
      skills: skills.earned,
      experience: experience.earned,
      content: content.earned,
    },
  };
}

/** True when there is anything at all to score. */
export function hasAnythingToScore(data: ScoreInput): boolean {
  return Boolean(data.ownedSkills.length || (data.profile?.experience ?? []).length);
}
