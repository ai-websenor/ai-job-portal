/**
 * Contract for the employer-facing applicant match endpoints:
 *
 *   POST /applications/applicant-scores  — bulk, one call per applicant list page
 *   POST /applications/applicant-score   — one applicant, for the detail page
 *
 * Kept separate from `types.ts` for the same reason as `salary.ts`: it is one
 * self-contained feature contract. Field names are camelCase, like every other
 * endpoint in this app.
 *
 * A note on what these numbers mean, because it matters on a hiring screen:
 * the score measures a candidate's profile against THIS job's stated
 * requirements. It is decision support for shortlisting, not a judgement of
 * the person and not a hiring recommendation. Copy in the UI must stay on that
 * side of the line.
 */

/** Overall verdict band returned by the backend. Always shown as words too. */
export type ApplicantScoreBand = 'excellent' | 'good' | 'fair' | 'needsWork';

/**
 * Top-level outcome of a single-applicant request. A refusal is an HTTP 403
 * rather than a status value, so it never reaches this type.
 */
export type ApplicantScoreStatus = 'ok' | 'noProfile';

/** Why a bulk entry came back without a number. */
export type ApplicantScoreReason = 'noProfile' | 'notFound';

/** One row of the bulk response, keyed by application id. */
export interface ApplicantScoreSummary {
  /** 0-100, or null when the candidate could not be scored. */
  score: number | null;
  band: ApplicantScoreBand | null;
  /** Present when `score` is null — explains the gap in machine terms. */
  reason?: ApplicantScoreReason;
}

export interface ApplicantScoresResponse {
  status: string;
  jobId: string;
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
  applicationId: string;
}

export interface ApplicantScoreTargetJob {
  id: string;
  title: string;
}

/**
 * A `noProfile` reply carries only `status`, `candidate` and `targetJob`, so
 * every scoring field below is optional — guard before reading them.
 */
export interface ApplicantScoreResponse {
  status: ApplicantScoreStatus;
  score?: number | null;
  band?: ApplicantScoreBand | null;
  headline?: string | null;
  summary?: string | null;
  breakdown?: ApplicantScoreBreakdownItem[];
  matchedKeywords?: string[];
  missingKeywords?: string[];
  strengths?: string[];
  gaps?: string[];
  candidate?: ApplicantScoreCandidate | null;
  targetJob?: ApplicantScoreTargetJob | null;
  generatedAt?: string | null;
}

export interface ApplicantScoreRequest {
  applicationId: string;
  /** Skip any cached result and re-run the match. */
  force?: boolean;
}

/**
 * Colour bands. Deliberately driven by the number rather than by `band`, so a
 * card and the detail ring can never disagree about the colour while the
 * wording evolves. The word always travels with the colour — colour alone is
 * never the signal.
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
  needsWork: 'Limited match',
};

/** Fallback wording when a number arrives without a band. */
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

/** Shown when the candidate has too little profile detail to score. */
export const APPLICANT_SCORE_NO_PROFILE_NOTE =
  'This candidate hasn’t added enough profile detail to score.';
