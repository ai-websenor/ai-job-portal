/**
 * Applicant scoring — the orchestration, and nothing else.
 *
 * A TypeScript port of `jobboard-ai-engine/app/resume_score/scorer.py` and
 * `store.py`, with the LLM dropped: the Python model only reworded the
 * strengths and gaps, a complete static wording already existed for every
 * one of them, and that wording is now the only wording. Nothing can be
 * degraded by a model outage any more, so there is no `degraded` flag.
 *
 * The work is split so that the part that can fail and the part that must not
 * are never the same part:
 *
 *   the entitlement queries   answer "is this employer allowed to see this"
 *   applicant-score.extract   loads an anonymised snapshot
 *   applicant-score.rules     turns it into a score (pure, always works)
 *   the cache                 stores the result (allowed to fail)
 *
 * Only the middle step decides anything. If the cache read or write fails the
 * employer still gets the real score. Nothing between here and the number can
 * change the number.
 *
 * Two entry points, because a shortlist and a candidate page want very
 * different things:
 *
 * * `scoreApplicants` — every applicant to one job, number and band only. It
 *   may be scoring fifty people with somebody waiting on the response, so it
 *   loads in bulk and never touches the cache.
 * * `scoreApplicant` — one applicant, the full breakdown, cached.
 *
 * Neither ever accepts a candidate id from the caller. The bulk call takes a
 * job and reads its applicants; the single call takes an application id and
 * reads the candidate out of it. An employer therefore cannot score somebody
 * who did not apply to a job they are entitled to see, however the request is
 * shaped.
 */

import {
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLogger } from '@ai-job-portal/logger';
import { sql } from 'drizzle-orm';
import { Database, resumeAnalysis } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { ApplicantScoreDto, ApplicantScoresDto } from './dto';
import {
  Band,
  BreakdownBar,
  DEFAULT_MAX_SUGGESTIONS,
  JobSnapshot,
  ScoreInput,
  evaluate,
  hasAnythingToScore,
} from './applicant-score.rules';
import { loadJob, loadScoreInputs } from './applicant-score.extract';

/**
 * One shortlist page. Scoring walks several tables, so an unbounded limit
 * would let one request read the whole applicant table.
 */
export const MAX_BULK_APPLICANTS = 200;
const DEFAULT_BULK_LIMIT = 50;

/** 15 minutes — profile edits should show up quickly. */
const DEFAULT_CACHE_TTL_SECONDS = 900;

/**
 * The single refusal. "Not entitled" and "no such row" must be impossible to
 * tell apart, or a stranger can probe for valid ids; and a refusal may never
 * echo the candidate's name or id, or the job's title.
 */
const REFUSAL = 'Not found, or not available to you';

export interface BulkScoreEntry {
  score: number | null;
  band: Band | null;
  reason?: 'noProfile';
}

export interface BulkScoreResponse {
  status: 'ok';
  jobId: string;
  scores: Record<string, BulkScoreEntry>;
}

export interface CandidateRef {
  name: string;
  applicationId: string;
}

export interface TargetJobRef {
  id: string;
  title: string;
}

export interface DetailScoreResponse {
  status: 'ok' | 'noProfile';
  score?: number;
  band?: Band;
  headline?: string;
  summary?: string;
  breakdown?: BreakdownBar[];
  matchedKeywords?: string[];
  missingKeywords?: string[];
  strengths?: string[];
  gaps?: string[];
  candidate: CandidateRef;
  targetJob: TargetJobRef;
  generatedAt?: string;
}

/** What the cached blob carries beyond the plain columns. */
interface CachedMeta {
  band?: Band;
  headline?: string;
  summary?: string;
  breakdown?: BreakdownBar[];
  strengths?: string[];
  gaps?: string[];
  targetJob?: TargetJobRef;
}

interface ApplicantRow {
  application_id: string;
  candidate_user_id: string;
}

interface EntitledApplicationRow extends ApplicantRow {
  job_id: string;
  job_title: string | null;
  candidate_name: string | null;
}

@Injectable()
export class ApplicantScoreService {
  private readonly logger = new CustomLogger();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly config: ConfigService,
  ) {}

  // -- entitlement -------------------------------------------------------

  /**
   * The caller, as a SQL predicate.
   *
   * An `EXISTS` rather than a join, because one user account can hold more
   * than one employer row and a join would then return the same application
   * twice — quietly eating the caller's LIMIT. The caller qualifies as the
   * employer who posted the job, or as an employer at the same company as the
   * owner or as the job itself. `IN` with a NULL on the right simply does not
   * match, which is the behaviour wanted: an employer with no company shares
   * a company with nobody.
   */
  private employerPredicate(callerUserId: string) {
    return sql`
      EXISTS (
        SELECT 1 FROM employers viewer
        WHERE viewer.user_id = ${callerUserId}::uuid
          AND (
            viewer.id = owner.id
            OR (
              viewer.company_id IS NOT NULL
              AND viewer.company_id IN (owner.company_id, j.company_id)
            )
          )
      )
    `;
  }

  /** True when this employer may see the applicants to this job. */
  private async employerCanViewJob(callerUserId: string, jobId: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1
      FROM jobs j
      JOIN employers owner ON owner.id = j.employer_id
      WHERE j.id = ${jobId}::uuid
        AND ${this.employerPredicate(callerUserId)}
      LIMIT 1
    `);
    return (result as unknown as { rows: unknown[] }).rows.length > 0;
  }

  /**
   * Applicants to one job, newest first, for an employer entitled to them.
   *
   * The entitlement rule lives in the WHERE clause of the statement that
   * reads the data, rather than in a check afterwards. A check that runs once
   * the rows are already in memory is a check somebody can forget to call.
   */
  private async entitledApplicants(
    callerUserId: string,
    jobId: string,
    limit: number,
  ): Promise<ApplicantRow[]> {
    const result = await this.db.execute(sql`
      SELECT a.id AS application_id,
             a.job_seeker_id AS candidate_user_id
      FROM job_applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN employers owner ON owner.id = j.employer_id
      WHERE a.job_id = ${jobId}::uuid
        AND ${this.employerPredicate(callerUserId)}
      ORDER BY a.applied_at DESC, a.id
      LIMIT ${limit}
    `);
    return (result as unknown as { rows: ApplicantRow[] }).rows ?? [];
  }

  /**
   * One application, only if this employer is entitled to it.
   *
   * The application id carries the candidate and the job together, so the
   * caller never supplies a user id and cannot score somebody who did not
   * apply. An empty result means not entitled OR no such application —
   * deliberately the same answer.
   */
  private async entitledApplication(
    callerUserId: string,
    applicationId: string,
  ): Promise<EntitledApplicationRow | null> {
    const result = await this.db.execute(sql`
      SELECT a.id AS application_id,
             a.job_seeker_id AS candidate_user_id,
             j.id AS job_id,
             j.title AS job_title,
             NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), '') AS candidate_name
      FROM job_applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN employers owner ON owner.id = j.employer_id
      LEFT JOIN profiles p ON p.user_id = a.job_seeker_id
      WHERE a.id = ${applicationId}::uuid
        AND ${this.employerPredicate(callerUserId)}
      LIMIT 1
    `);
    const rows = (result as unknown as { rows: EntitledApplicationRow[] }).rows ?? [];
    return rows[0] ?? null;
  }

  // -- the shortlist -----------------------------------------------------

  /**
   * Score every applicant to one job, keyed by application id.
   *
   * Keyed by application id rather than candidate id because that is what the
   * applicant list rows already carry, and because it keeps candidate ids off
   * the wire entirely.
   *
   * No cache: a number is wanted for every row at once, the arithmetic is
   * deterministic and cheap, and serving half the list from a stored blob
   * written at a different moment would make two rows incomparable.
   */
  async scoreApplicants(callerUserId: string, dto: ApplicantScoresDto): Promise<BulkScoreResponse> {
    const limit = Math.max(
      1,
      Math.min(Math.trunc(Number(dto.limit) || DEFAULT_BULK_LIMIT), MAX_BULK_APPLICANTS),
    );

    if (!(await this.employerCanViewJob(callerUserId, dto.jobId))) {
      this.logger.warn(`Refused applicant scores: caller does not own job ${dto.jobId}`);
      throw new ForbiddenException(REFUSAL);
    }

    const applicants = await this.entitledApplicants(callerUserId, dto.jobId, limit);

    const scores: Record<string, BulkScoreEntry> = {};
    if (applicants.length === 0) {
      return { status: 'ok', jobId: dto.jobId, scores };
    }

    // Two loads for the whole shortlist, then pure arithmetic in memory.
    const job = await loadJob(this.db, dto.jobId);
    let inputs = new Map<string, ScoreInput>();
    try {
      inputs = await loadScoreInputs(
        this.db,
        applicants.map((row) => row.candidate_user_id),
        job,
      );
    } catch (error) {
      // Swallowing this was a mistake worth naming: a failed load made every
      // applicant render as "Not scored", which reads as "these candidates
      // have not filled in their profiles" — blaming fifteen people for one
      // broken query, and hiding the break completely. A fault on our side
      // has to look like a fault on our side, so the list can say the scores
      // are unavailable instead of quietly libelling the shortlist.
      this.logger.error(`Could not load applicant profiles for job ${dto.jobId}: ${error}`);
      throw new ServiceUnavailableException('Match scores are unavailable right now');
    }

    const maxSuggestions = this.maxSuggestions();
    for (const applicant of applicants) {
      const applicationId = String(applicant.application_id);
      const data = inputs.get(String(applicant.candidate_user_id));

      if (!data || !data.profile || !hasAnythingToScore(data)) {
        // A null, not a zero. Zero is a judgement; this is an absence of
        // anything to judge, and an employer who cannot tell the two apart
        // will skip somebody for our missing data rather than their gaps.
        scores[applicationId] = { score: null, band: null, reason: 'noProfile' };
        continue;
      }

      const result = evaluate(data, { maxSuggestions });
      scores[applicationId] = { score: result.score, band: result.band };
    }

    return { status: 'ok', jobId: dto.jobId, scores };
  }

  // -- one applicant -----------------------------------------------------

  /**
   * The full breakdown for one application.
   *
   * `force: false` serves a stored result while it is fresher than the
   * configured TTL. The cache is keyed on the candidate and the job, not on
   * the employer, so two colleagues reviewing the same shortlist share one
   * computation.
   */
  async scoreApplicant(callerUserId: string, dto: ApplicantScoreDto): Promise<DetailScoreResponse> {
    const application = await this.entitledApplication(callerUserId, dto.applicationId);
    if (!application) {
      // Not entitled and no such application are the same answer, so a
      // stranger cannot probe for valid ids. Nothing about the candidate or
      // the job reaches the response.
      this.logger.warn(`Refused applicant score for application ${dto.applicationId}`);
      throw new ForbiddenException(REFUSAL);
    }

    const candidateUserId = String(application.candidate_user_id);
    const jobId = String(application.job_id);

    // Read alongside the response, long after scoring would have run on an
    // anonymised profile. It can never reach `evaluate`, and it is never
    // written to the cache.
    const candidate: CandidateRef = {
      name: application.candidate_name || 'Applicant',
      applicationId: String(application.application_id),
    };
    const fallbackJob: TargetJobRef = { id: jobId, title: application.job_title ?? '' };

    if (!dto.force) {
      const cached = await this.readCache(candidateUserId, jobId);
      if (cached) return { ...cached, candidate };
    }

    const job = await loadJob(this.db, jobId);
    const inputs = await loadScoreInputs(this.db, [candidateUserId], job);
    const data = inputs.get(candidateUserId);

    if (!data || !data.profile || !hasAnythingToScore(data)) {
      return { status: 'noProfile', candidate, targetJob: this.targetJob(job) ?? fallbackJob };
    }

    const result = evaluate(data, { maxSuggestions: this.maxSuggestions() });
    const targetJob = this.targetJob(job) ?? fallbackJob;

    const response: DetailScoreResponse = {
      status: 'ok',
      score: result.score,
      band: result.band,
      headline: result.headline,
      summary: result.summary,
      breakdown: result.breakdown,
      matchedKeywords: result.matchedKeywords,
      missingKeywords: result.missingKeywords,
      strengths: result.strengths,
      gaps: result.gaps,
      candidate,
      targetJob,
      generatedAt: new Date().toISOString(),
    };

    await this.writeCache(data, candidateUserId, jobId, response, result.atsIssues);

    return response;
  }

  // -- helpers -----------------------------------------------------------

  private targetJob(job: JobSnapshot | null): TargetJobRef | null {
    if (!job) return null;
    return { id: String(job.id ?? ''), title: job.title ?? '' };
  }

  private maxSuggestions(): number {
    const configured = Number(this.config.get('APPLICANT_SCORE_MAX_SUGGESTIONS'));
    return Number.isFinite(configured) && configured > 0
      ? Math.trunc(configured)
      : DEFAULT_MAX_SUGGESTIONS;
  }

  private cacheTtlSeconds(): number {
    const configured = Number(this.config.get('APPLICANT_SCORE_CACHE_TTL_SECONDS'));
    return Number.isFinite(configured) && configured >= 0
      ? Math.trunc(configured)
      : DEFAULT_CACHE_TTL_SECONDS;
  }

  private parseJson<T>(value: unknown, fallback: T): T {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'object') return value as T;
    try {
      return JSON.parse(String(value)) as T;
    } catch {
      this.logger.warn('Unreadable JSON in resume_analysis; using default');
      return fallback;
    }
  }

  /**
   * The stored response, or null when there is none or it is too old.
   *
   * The age is worked out in SQL rather than against a local clock:
   * `analyzed_at` has no timezone, so comparing it in JavaScript silently
   * drifts by the server's UTC offset.
   */
  private async readCache(
    candidateUserId: string,
    jobId: string,
  ): Promise<Omit<DetailScoreResponse, 'candidate'> | null> {
    try {
      const result = await this.db.execute(sql`
        SELECT overall_score, quality_breakdown, keyword_matches, missing_keywords,
               analyzed_at,
               EXTRACT(EPOCH FROM (LOCALTIMESTAMP - analyzed_at)) AS age_seconds
        FROM resume_analysis
        WHERE user_id = ${candidateUserId}::uuid
          AND job_id = ${jobId}::uuid
        ORDER BY analyzed_at DESC
        LIMIT 1
      `);
      const row = ((result as unknown as { rows: Record<string, unknown>[] }).rows ?? [])[0];
      if (!row) return null;

      const age = Number(row.age_seconds);
      if (!Number.isFinite(age) || age > this.cacheTtlSeconds()) return null;

      const meta = this.parseJson<CachedMeta>(row.quality_breakdown, {});
      const analyzedAt = row.analyzed_at;

      return {
        status: 'ok',
        score: Number(row.overall_score ?? 0),
        band: meta.band ?? 'needsWork',
        headline: meta.headline ?? '',
        summary: meta.summary ?? '',
        breakdown: meta.breakdown ?? [],
        matchedKeywords: this.parseJson<string[]>(row.keyword_matches, []),
        missingKeywords: this.parseJson<string[]>(row.missing_keywords, []),
        strengths: meta.strengths ?? [],
        gaps: meta.gaps ?? [],
        targetJob: meta.targetJob ?? { id: '', title: '' },
        generatedAt:
          analyzedAt instanceof Date ? analyzedAt.toISOString() : String(analyzedAt ?? ''),
      };
    } catch (error) {
      this.logger.warn(`Score cache read failed: ${error}`);
      return null;
    }
  }

  /**
   * Store one analysis, in the spirit the columns were named.
   *
   * `resume_analysis.resume_id` is NOT NULL, so an applicant with no resume
   * on file cannot have a row. That is a real state, not an error: they get a
   * live score every time, just without the cache. A write failure is
   * swallowed for the same reason — losing the cache is not worth losing the
   * answer over.
   *
   * `improvements` is deliberately empty and the candidate's name is
   * deliberately absent. An employer cannot edit somebody else's profile, and
   * the row belongs to the candidate rather than to whichever employer
   * happened to look first.
   */
  private async writeCache(
    data: ScoreInput,
    candidateUserId: string,
    jobId: string,
    response: DetailScoreResponse,
    atsIssues: string[],
  ): Promise<void> {
    const resumeId = data.resume?.id;
    if (!resumeId) return;

    const bucket = (key: BreakdownBar['key']): string =>
      String((response.breakdown ?? []).find((bar) => bar.key === key)?.score ?? 0);

    const meta: CachedMeta = {
      band: response.band,
      headline: response.headline,
      summary: response.summary,
      breakdown: response.breakdown,
      strengths: response.strengths,
      gaps: response.gaps,
      targetJob: response.targetJob,
    };

    const columns = {
      resumeId,
      jobId,
      userId: candidateUserId,
      overallScore: response.score ?? 0,
      qualityScore: bucket('content'),
      atsScore: bucket('skills'),
      qualityBreakdown: JSON.stringify(meta),
      atsIssues: JSON.stringify(atsIssues),
      suggestions: JSON.stringify(response.gaps ?? []),
      keywordMatches: JSON.stringify(response.matchedKeywords ?? []),
      missingKeywords: JSON.stringify(response.missingKeywords ?? []),
      improvements: JSON.stringify([]),
      analyzedAt: new Date(),
    };

    try {
      await this.db
        .insert(resumeAnalysis)
        .values(columns)
        .onConflictDoUpdate({
          target: [resumeAnalysis.resumeId, resumeAnalysis.jobId],
          targetWhere: sql`job_id IS NOT NULL`,
          set: {
            userId: columns.userId,
            overallScore: columns.overallScore,
            qualityScore: columns.qualityScore,
            atsScore: columns.atsScore,
            qualityBreakdown: columns.qualityBreakdown,
            atsIssues: columns.atsIssues,
            suggestions: columns.suggestions,
            keywordMatches: columns.keywordMatches,
            missingKeywords: columns.missingKeywords,
            improvements: columns.improvements,
            analyzedAt: columns.analyzedAt,
          },
        });
    } catch (error) {
      this.logger.warn(`Could not store applicant analysis: ${error}`);
    }
  }
}
