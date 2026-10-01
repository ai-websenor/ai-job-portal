/**
 * Contract for the AI resume-scoring endpoints:
 *
 *   GET  /ai/resume-score/latest?job_id=<id>   -> the cached result, or { status: 'not_scored' }
 *   POST /ai/resume-score  { job_id, force }   -> a fresh result
 *
 * Kept separate from `types.ts` (and matching the shape of `salary.ts`) because
 * the AI engine speaks snake_case while the rest of the app speaks camelCase.
 * Mixing the two conventions in one file invites someone to "tidy" these names
 * later and quietly break the wire format.
 *
 * Every field except `status` is optional: the `not_scored` and `no_profile`
 * replies carry nothing else, so the UI must cope with a bare status.
 */

export type ResumeScoreStatus = 'ok' | 'no_profile' | 'not_scored';

export type ResumeScoreBand = 'excellent' | 'good' | 'fair' | 'needs_work';

export type ResumeScoreBreakdownKey = 'skills' | 'experience' | 'content';

export type ResumeImprovementPriority = 'high' | 'medium' | 'low';

export interface ResumeScoreBreakdownItem {
  key: ResumeScoreBreakdownKey;
  label: string;
  /** A percentage (0-100), not the points contributed to the overall score. */
  score: number;
}

export interface ResumeImprovementAction {
  label: string;
  /** Profile tab to open: 1 personal, 2 education, 3 skills, 4 experience,
   *  5 resume, 6 video resume, 7 job preferences, 8 certifications. */
  tab: number;
}

export interface ResumeImprovement {
  id: string;
  priority: ResumeImprovementPriority;
  title: string;
  description: string;
  action: ResumeImprovementAction;
}

export interface ResumeScoreTargetJob {
  id: string;
  title: string;
}

export interface ResumeScoreResumeMeta {
  name: string;
  updated_at: string;
}

export interface ResumeScoreResult {
  status: ResumeScoreStatus;
  /** Out of 100. */
  score?: number;
  band?: ResumeScoreBand;
  headline?: string;
  summary?: string;
  breakdown?: ResumeScoreBreakdownItem[];
  matched_keywords?: string[];
  missing_keywords?: string[];
  improvements?: ResumeImprovement[];
  target_job?: ResumeScoreTargetJob | null;
  resume?: ResumeScoreResumeMeta | null;
  generated_at?: string;
  /** True when the language model was unavailable. The score and the keyword
   *  lists are still accurate; only the written suggestions are the fallback
   *  wording. This must be surfaced, never hidden. */
  degraded?: boolean;
}

export interface ResumeScoreRequest {
  job_id: string | null;
  /** Skip the cache and re-run the checks. Used by the "Re-check" button. */
  force: boolean;
}
