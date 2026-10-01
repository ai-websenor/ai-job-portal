/**
 * Contract for the employer-facing applicant match endpoints:
 *
 *   POST /ai/applicant-scores  — bulk, one call per applicant list page
 *   POST /ai/applicant-score   — one applicant, for the detail page
 *
 * Kept separate from `types.ts` for the same reason as `salary.ts`: the engine
 * speaks snake_case while the rest of the app speaks camelCase, and mixing the
 * two in one file invites someone to "tidy" these names and break the wire
 * format.
 *
 * A note on what these numbers mean, because it matters on a hiring screen:
 * the score measures a candidate's profile against THIS job's stated
 * requirements. It is decision support for shortlisting, not a judgement of
 * the person and not a hiring recommendation. Copy in the UI must stay on that
 * side of the line.
 */

/** Overall verdict band returned by the engine. Always shown as words too. */
export type ApplicantScoreBand = 'excellent' | 'good' | 'fair' | 'needs_work';

/** Top-level outcome of a single-applicant request. */
export type ApplicantScoreStatus = 'ok' | 'no_profile' | 'not_found' | 'not_authorised';

/** Why a bulk entry came back without a number. */
export type ApplicantScoreReason = 'no_profile' | 'not_found' | 'not_authorised' | string;

/** One row of the bulk response, keyed by application id. */
export interface ApplicantScoreSummary {
  /** 0-100, or null when the candidate could not be scored. */
  score: number | null;
  band: ApplicantScoreBand | null;
  /** Present when `score` is null — explains the gap in machine terms. */
  reason?: ApplicantScoreReason;
  /** True when the language model was unavailable; the number is still valid. */
  degraded?: boolean;
}

export interface ApplicantScoresResponse {
  status: string;
  job_id: string;
  /** application id -> summary. Applications with no entry are simply unscored. */
  scores: Record<string, ApplicantScoreSummary>;
}

/** One of the three sub-scores shown as a bar on the detail panel. */
export interface ApplicantScoreBreakdownItem {
  key: string;
  label: string;
  score: number;
}

export interface ApplicantScoreCandidate {
  name: string;
  application_id: string;
}

export interface ApplicantScoreTargetJob {
  id: string;
  title: string;
}

export interface ApplicantScoreResponse {
  status: ApplicantScoreStatus;
  score: number | null;
  band: ApplicantScoreBand | null;
  headline: string | null;
  summary: string | null;
  breakdown: ApplicantScoreBreakdownItem[];
  matched_keywords: string[];
  missing_keywords: string[];
  strengths: string[];
  gaps: string[];
  candidate: ApplicantScoreCandidate | null;
  target_job: ApplicantScoreTargetJob | null;
  generated_at: string | null;
  /** True when the written commentary is missing; score and keywords still hold. */
  degraded: boolean;
}

export interface ApplicantScoreRequest {
  application_id: string;
  /** Skip any cached result and re-run the match. */
  force?: boolean;
}

/**
 * Colour bands. Deliberately driven by the number rather than by `band`, so a
 * card and the detail ring can never disagree about the colour while the
 * engine's wording evolves. The word always travels with the colour — colour
 * alone is never the signal.
 */
export type ApplicantScoreTone = 'success' | 'warning' | 'danger' | 'default';

export const getApplicantScoreTone = (score: number | null | undefined): ApplicantScoreTone => {
  if (score === null || score === undefined) return 'default';
  if (score >= 75) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
};

/**
 * Plain words for each band. Phrased as fit against the job's requirements —
 * never as a verdict on the candidate, so no "poor" and no "unqualified".
 */
export const APPLICANT_SCORE_BAND_WORD: Record<ApplicantScoreBand, string> = {
  excellent: 'Excellent match',
  good: 'Good match',
  fair: 'Fair match',
  needs_work: 'Limited match',
};

/** Fallback wording when the engine sends a number but no band. */
export const getApplicantScoreBandWord = (
  band: ApplicantScoreBand | null | undefined,
  score: number | null | undefined,
): string => {
  if (band && APPLICANT_SCORE_BAND_WORD[band]) return APPLICANT_SCORE_BAND_WORD[band];
  if (score === null || score === undefined) return 'Not scored';
  if (score >= 85) return 'Excellent match';
  if (score >= 75) return 'Good match';
  if (score >= 50) return 'Fair match';
  return 'Limited match';
};

/** The one line of context that sits next to every score in the product. */
export const APPLICANT_SCORE_CONTEXT_LINE =
  'Measures skills, experience and resume quality against this job’s requirements. It is not a hiring recommendation.';

/** Shown whenever the written commentary is unavailable. */
export const APPLICANT_SCORE_DEGRADED_NOTE =
  'AI commentary is briefly unavailable — the score and keywords are accurate.';

/** Shown when the candidate has too little profile detail to score. */
export const APPLICANT_SCORE_NO_PROFILE_NOTE =
  'This candidate hasn’t added enough profile detail to score.';
