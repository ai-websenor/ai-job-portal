/**
 * Market salary estimation for a job an employer is posting.
 *
 * A port of `jobboard-ai-engine/app/salary/estimator.py` with the language
 * model removed. In the Python service the model did exactly two optional
 * things — map an unknown title to a role family, and write the sentence under
 * the range. Both are now deterministic TypeScript: the role family comes from
 * the static table only (a title it does not know skips that rung rather than
 * being guessed at), and the sentence is built from the method, the sample
 * size and the location. Nothing can be degraded by a model outage any more,
 * so the Python response's `degraded` flag is gone.
 *
 * Everything is compared in annual rupees, because `jobs.pay_rate` is mixed
 * (monthly, daily, weekly, hourly, yearly) and the stored integers are
 * otherwise not comparable. The answer is converted back to the rate the
 * caller asked for.
 *
 * **The ladder.** We stop at the first rung that yields at least
 * `MIN_SAMPLE` comparables:
 *
 * 1. same normalised title, same city, overlapping experience
 * 2. 60% skill overlap, same city, overlapping experience
 * 3. 60% skill overlap, nationwide
 * 4. per-skill blend across the job's top skills
 * 5. static role-family mapping, then title matching again for that family
 * 6. the curated `salary_benchmarks` table
 * 7. `insufficientData` — no number at all
 *
 * Rungs 1-2 can reach `high` confidence. Nothing below them ever exceeds
 * `medium`, because a nationwide skill blend is a weaker claim than a local
 * like-for-like comparison and the response should say so.
 */

import { createHash } from 'node:crypto';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { and, desc, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { CustomLogger } from '@ai-job-portal/logger';
import { Database, jobs, salaryBenchmarks } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { SalaryEstimateDto } from './dto/salary-estimate.dto';
import {
  Comparable,
  SalaryBenchmarkRow,
  SalaryPoolRow,
  benchmarkPercentiles,
  byCity,
  byExperience,
  bySkillOverlap,
  byTitle,
  perSkillBlend,
  toComparable,
} from './salary.comparables';
import { resolveRoleFamily } from './salary.role-family';
import {
  canonicalCity,
  cityFromLocation,
  deannualise,
  experienceMid,
  normalisePayRate,
  normaliseTitle,
  titleCase,
} from './salary.units';

// ── Tunables (the Python `settings.salary_*` block) ─

const CURRENCY = 'INR';

/** Comparables needed before a range is shown at all. */
const MIN_SAMPLE = 8;
/** Comparables needed before rungs 1-2 may claim high confidence. */
const HIGH_CONFIDENCE_SAMPLE = 25;
/** Rows pulled into the comparable pool. */
const POOL_SIZE = 400;
/** 6 hours — the job pool barely moves within a day. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
/**
 * What the employer's salary slider can express, per pay rate.
 *
 * It used to be a single 2,000-200,000 whatever rate was chosen, and the
 * estimate was squeezed into it — so every yearly estimate came back as
 * exactly 200,000, confidently reporting that senior engineers earn two lakh a
 * year. The estimate is no longer clamped at all; these bounds only drive the
 * `clamped` flag, which tells the UI the slider cannot represent the range.
 *
 * Mirrored in `apps/job-board-web/src/app/config/salaryBounds.ts`, which is the
 * slider's own copy. The two must agree. They are duplicated because the web
 * app sits outside the pnpm workspace and cannot import from
 * `@ai-job-portal/*`.
 */
const SLIDER_BOUNDS: Record<string, { min: number; max: number }> = {
  hourly: { min: 50, max: 10000 },
  daily: { min: 200, max: 50000 },
  weekly: { min: 1000, max: 200000 },
  monthly: { min: 2000, max: 500000 },
  yearly: { min: 25000, max: 6000000 },
};

/** Monthly is the fallback: it is what most posted jobs use. */
const DEFAULT_SLIDER_BOUNDS = SLIDER_BOUNDS.monthly;

function sliderBoundsFor(payRate: string): { min: number; max: number } {
  return SLIDER_BOUNDS[(payRate || '').toLowerCase()] ?? DEFAULT_SLIDER_BOUNDS;
}

/**
 * Experience nudge: how much one year of difference against the comparables'
 * midpoint moves the estimate, and the hard cap on the total nudge.
 */
const EXPERIENCE_STEP_PER_YEAR = 0.06;
const EXPERIENCE_CAP = 0.25;

/**
 * City tiers. A coarse cost-of-living adjustment, not market data, and only
 * ever applied when the comparables are nationwide — when they are already
 * from the same city the local market is baked into them.
 */
const CITY_CAP = 0.2;

const METRO_CITIES = new Set([
  'mumbai',
  'delhi',
  'bangalore',
  'gurgaon',
  'noida',
  'hyderabad',
  'pune',
  'chennai',
]);
const TIER_ONE_CITIES = new Set([
  'kolkata',
  'ahmedabad',
  'jaipur',
  'chandigarh',
  'kochi',
  'coimbatore',
  'indore',
  'nagpur',
  'bhubaneswar',
  'thiruvananthapuram',
  'visakhapatnam',
  'vadodara',
  'surat',
  'lucknow',
  'mysore',
  'nashik',
  'mohali',
  'bhopal',
]);
const CITY_TIER_MULTIPLIER: Record<string, number> = {
  metro: 1.15,
  tier_1: 1.0,
  tier_2: 0.85,
};

const COMPARISON_TOLERANCE_PCT = 10;

/**
 * How far the p25-p75 band may stretch before the sample stops describing one
 * role. Above SPREAD_LOW_CONFIDENCE the range is shown but never called
 * confident; above SPREAD_REJECT nothing is shown at all.
 */
const SPREAD_LOW_CONFIDENCE = 3.0;
const SPREAD_REJECT = 6.0;

const RESULT_CACHE_MAX_ENTRIES = 500;

// ── Response shape ──────────────────────────────

export type SalaryEstimateStatus = 'ok' | 'insufficientData';
export type SalaryEstimateReason =
  | 'noPricedJobs'
  | 'noComparables'
  | 'inconsistentComparables'
  | null;
export type SalaryConfidence = 'high' | 'medium' | 'low';
export type SalaryBasisIcon = 'experience' | 'role' | 'skills' | 'location';

export interface SalaryBasisItem {
  icon: SalaryBasisIcon;
  label: string;
}

export interface SalaryComparison {
  status: 'below' | 'within' | 'above';
  deltaPct: number;
  message: string;
}

export interface SalaryEstimateResult {
  status: SalaryEstimateStatus;
  reason: SalaryEstimateReason;
  currency: string;
  payRate: string;
  range: { min: number; max: number } | null;
  typical: number | null;
  confidence: SalaryConfidence;
  sampleSize: number;
  method: string;
  clamped: boolean;
  basis: SalaryBasisItem[];
  comparison: SalaryComparison | null;
  explanation: string | null;
}

/** One successful rung of the ladder. */
interface Rung {
  step: number;
  method: string;
  scope: 'city' | 'nationwide';
  roleLabel: string;
  values: number[];
  sample: Comparable[];
  percentiles: [number, number, number] | null;
  sampleSize: number;
  source: string | null;
}

interface CacheEntry<T> {
  at: number;
  value: T;
}

@Injectable()
export class SalaryService {
  private readonly logger = new CustomLogger();

  /**
   * In-process TTL caches. A plain Map with timestamps rather than a cache
   * library: the pool is small, cheap to rebuild and identical for every
   * employer, and Redis in this service is used for other things.
   */
  private poolCache: CacheEntry<Comparable[]> | null = null;
  private readonly resultCache = new Map<string, CacheEntry<SalaryEstimateResult>>();

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  // ── Entry point ───────────────────────────────

  /**
   * Return a market salary estimate for a job posting.
   *
   * `jobType` and `workMode` are accepted for forward compatibility but do not
   * narrow the comparables today: with a few dozen active jobs, filtering on
   * them as well reliably produces a sample of zero. They will start mattering
   * once the board is an order of magnitude larger.
   */
  async estimate(dto: SalaryEstimateDto, userId?: string): Promise<SalaryEstimateResult> {
    const rate = normalisePayRate(dto.payRate);

    const skills = (dto.skills ?? [])
      .map((s) => String(s ?? '').trim())
      .filter((s) => s.length > 0);
    const normTitle = normaliseTitle(dto.title);
    const city = cityFromLocation(dto.location);
    const expMin = dto.experienceMin ?? null;
    const expMax = dto.experienceMax ?? null;

    const key = this.cacheKey(normTitle, skills, city, expMin, expMax, rate);

    let core = this.cacheGet(key);
    if (!core) {
      core = await this.estimateCore(dto.title, normTitle, skills, city, expMin, expMax, rate);
      this.cachePut(key, core);
    }

    // `currentRange` only affects the comparison line, so it is deliberately
    // not part of the cache key and is recomputed on every call.
    const result: SalaryEstimateResult = { ...core, basis: [...core.basis] };
    result.comparison = result.typical
      ? this.buildComparison(dto.currentRange, result.typical)
      : null;

    this.logger.log(
      `Salary estimate for employer ${userId ?? 'unknown'}: ` +
        `${result.status}/${result.method} over ${result.sampleSize} comparables`,
    );
    return result;
  }

  /** Drop every cached estimate and the comparable pool. */
  clearCache(): void {
    this.resultCache.clear();
    this.poolCache = null;
  }

  // ── The estimate itself ───────────────────────

  /** Everything that does not depend on the employer's current slider value. */
  private async estimateCore(
    title: string,
    normTitle: string,
    skills: string[],
    city: string | null,
    expMin: number | null,
    expMax: number | null,
    rate: string,
  ): Promise<SalaryEstimateResult> {
    const pool = await this.loadPool();
    if (!pool.length) return this.insufficient(rate, 'noPricedJobs');

    const rung = await this.climb(pool, title, normTitle, skills, city, expMin, expMax);
    if (!rung) return this.insufficient(rate, 'noComparables');

    // Percentiles of the comparables' annual midpoints.
    const [p25, p50, p75] = rung.percentiles ?? [
      percentile(rung.values, 25),
      percentile(rung.values, 50),
      percentile(rung.values, 75),
    ];

    if (p25 === null || p50 === null || p75 === null) {
      return this.insufficient(rate, 'noComparables');
    }

    // Enough comparables is not the same as comparable comparables. Against
    // the live pool, "ABC Developer" in Bangalore produced a skill blend of 16
    // jobs whose p25-p75 ran 17k to 190k a month — an eleven-fold band
    // containing almost every salary on the portal. Presenting that as an
    // estimate would be worse than presenting nothing, because it looks like
    // an answer. A sample this scattered is describing the market, not the role.
    const spread = p25 > 0 ? p75 / p25 : Infinity;
    if (spread > SPREAD_REJECT) {
      this.logger.log(
        `Rejecting salary estimate: p75/p25 = ${spread.toFixed(1)} over ` +
          `${rung.sampleSize} comparables (${rung.method})`,
      );
      return this.insufficient(rate, 'inconsistentComparables', rung.sampleSize);
    }

    const factor =
      experienceFactor(experienceMid(expMin, expMax), rung.sample) *
      cityFactor(city, rung.sample, rung.scope);

    const annual = [p25 * factor, p50 * factor, p75 * factor].sort((a, b) => a - b);

    const low = Math.round(deannualise(annual[0], rate) ?? 0);
    const mid = Math.round(deannualise(annual[1], rate) ?? 0);
    const high = Math.round(deannualise(annual[2], rate) ?? 0);
    const bounds = sliderBoundsFor(rate);
    const outsideSlider = [low, mid, high].some(
      (value) => value < bounds.min || value > bounds.max,
    );

    // Rounding and clamping can cross the three over each other; the employer
    // must never see a minimum above the typical.
    const [rangeMin, typical, rangeMax] = [low, mid, high].sort((a, b) => a - b);

    let confidence = this.confidence(rung.step, rung.sampleSize);
    // A band that is merely wide rather than useless still cannot be called
    // high confidence, however many rows produced it.
    if (spread > SPREAD_LOW_CONFIDENCE) confidence = 'low';

    return {
      status: 'ok',
      reason: null,
      currency: CURRENCY,
      payRate: rate,
      range: { min: rangeMin, max: rangeMax },
      typical,
      confidence,
      sampleSize: rung.sampleSize,
      method: rung.method,
      clamped: outsideSlider,
      basis: this.buildBasis(rung, skills, city, expMin, expMax),
      comparison: null,
      explanation: buildExplanation(rung, city),
    };
  }

  /** Walk the ladder, returning the first rung with enough comparables. */
  private async climb(
    pool: Comparable[],
    title: string,
    normTitle: string,
    skills: string[],
    city: string | null,
    expMin: number | null,
    expMax: number | null,
  ): Promise<Rung | null> {
    const scope: 'city' | 'nationwide' = city ? 'city' : 'nationwide';
    const roleLabel = title.trim() || 'this role';

    // 1 — exact title, same city, overlapping experience.
    if (normTitle) {
      const matched = byExperience(byCity(byTitle(pool, normTitle), city), expMin, expMax);
      if (matched.length >= MIN_SAMPLE) {
        return rungFromJobs(1, 'titleCityExp', scope, roleLabel, matched);
      }
    }

    // 2 — skill overlap, same city, overlapping experience.
    const skillMatches = bySkillOverlap(pool, skills);
    if (skillMatches.length) {
      const sameCity = byExperience(byCity(skillMatches, city), expMin, expMax);
      if (sameCity.length >= MIN_SAMPLE) {
        return rungFromJobs(2, 'skillsCityExp', scope, roleLabel, sameCity);
      }

      // 3 — same skill overlap, drop the city. Only a distinct rung when a
      // city was actually supplied; otherwise rung 2 already was nationwide.
      if (city) {
        const nationwide = byExperience(skillMatches, expMin, expMax);
        if (nationwide.length >= MIN_SAMPLE) {
          return rungFromJobs(3, 'skillsNationwide', 'nationwide', roleLabel, nationwide);
        }
      }
    }

    // 4 — per-skill blend. Weaker: these jobs share a skill, not a shape.
    const { values, distinct } = perSkillBlend(pool, skills);
    if (distinct.length >= MIN_SAMPLE) {
      return {
        step: 4,
        method: 'skillBlend',
        scope: 'nationwide',
        roleLabel,
        values,
        sample: distinct,
        percentiles: null,
        sampleSize: distinct.length,
        source: null,
      };
    }

    // 5 — what kind of role is this, from the static table, then match titles
    // again. An unknown title simply skips this rung: nothing guesses here.
    const family = resolveRoleFamily(title);

    if (family) {
      const familyKey = normaliseTitle(family);
      const familyJobs = pool.filter(
        (c) => c.normTitle === familyKey || c.title.trim().toLowerCase().includes(family),
      );
      if (familyJobs.length) {
        const sameCity = byExperience(byCity(familyJobs, city), expMin, expMax);
        if (sameCity.length >= MIN_SAMPLE) {
          return rungFromJobs(5, 'familyCityExp', scope, titleCase(family), sameCity);
        }

        const nationwide = byExperience(familyJobs, expMin, expMax);
        if (nationwide.length >= MIN_SAMPLE) {
          return rungFromJobs(5, 'familyNationwide', 'nationwide', titleCase(family), nationwide);
        }
      }
    }

    // 6 — the curated benchmark table, the cold-start safety net.
    const lookupFamily = family || normTitle;
    if (lookupFamily) {
      const rows = await this.fetchBenchmarks(lookupFamily, city);
      const { percentiles, rowCount, source } = benchmarkPercentiles(rows, expMin, expMax);
      if (percentiles) {
        return {
          step: 6,
          method: 'benchmarkTable',
          scope: city ? 'city' : 'nationwide',
          roleLabel: family ? titleCase(family) : roleLabel,
          values: [],
          sample: [],
          percentiles,
          sampleSize: rowCount,
          source,
        };
      }
    }

    // 7 — nothing we can stand behind.
    return null;
  }

  // ── Confidence, basis, comparison ─────────────

  /** Honest confidence for a rung. Only rungs 1-2 can ever be high. */
  private confidence(step: number, sampleSize: number): SalaryConfidence {
    if (step === 6) {
      // Curated rows, not live comparables — a single attributed row is worth
      // something, two or more is worth a bit more, neither is "high".
      return sampleSize >= 2 ? 'medium' : 'low';
    }
    if (step <= 2 && sampleSize >= HIGH_CONFIDENCE_SAMPLE) return 'high';
    if (sampleSize >= MIN_SAMPLE) return 'medium';
    return 'low';
  }

  private buildBasis(
    rung: Rung,
    skills: string[],
    city: string | null,
    expMin: number | null,
    expMax: number | null,
  ): SalaryBasisItem[] {
    const basis: SalaryBasisItem[] = [];

    const years = yearsLabel(expMin, expMax);
    if (years) basis.push({ icon: 'experience', label: years });

    // Only claim a role match when one was actually found. The skills rungs
    // carry the employer's own title through unchanged, so "Closest match: ABC
    // Developer" read as though we had priced real ABC Developer postings when
    // in fact the title was never matched against anything.
    if (
      rung.method.startsWith('title') ||
      rung.method.startsWith('family') ||
      rung.method === 'benchmarkTable'
    ) {
      basis.push({ icon: 'role', label: `Closest match: ${rung.roleLabel}` });
    } else {
      basis.push({ icon: 'role', label: 'Priced on skills, not job title' });
    }

    const topSkills = skills
      .map((s) => String(s ?? '').trim())
      .filter(Boolean)
      .slice(0, 3);
    if (topSkills.length) basis.push({ icon: 'skills', label: topSkills.join(' + ') });

    if (city && rung.scope === 'city') {
      basis.push({ icon: 'location', label: `${titleCase(city)} market` });
    } else {
      basis.push({ icon: 'location', label: 'Nationwide market' });
    }

    if (rung.source) {
      basis.push({ icon: 'role', label: `Benchmark source: ${rung.source}` });
    }

    return basis;
  }

  /** How the employer's current slider position sits against the estimate. */
  private buildComparison(
    currentRange: number[] | undefined,
    typical: number,
  ): SalaryComparison | null {
    if (!currentRange || typical <= 0) return null;

    const numbers = currentRange
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v))
      .slice(0, 2);
    if (numbers.length < 2) return null;

    const low = Math.min(...numbers);
    const high = Math.max(...numbers);
    const midpoint = (low + high) / 2;
    const deltaPct = Math.round(((midpoint - typical) / typical) * 100);

    if (Math.abs(deltaPct) <= COMPARISON_TOLERANCE_PCT) {
      return {
        status: 'within',
        deltaPct,
        message: 'Your posted range is in line with similar roles.',
      };
    }

    if (deltaPct < 0) {
      return {
        status: 'below',
        deltaPct,
        message:
          `Your posted range is about ${Math.abs(deltaPct)}% below similar roles ` +
          `— you may get fewer applicants.`,
      };
    }

    return {
      status: 'above',
      deltaPct,
      message:
        `Your posted range is about ${deltaPct}% above similar roles ` +
        `— expect strong interest, but check it against your budget.`,
    };
  }

  /** The honest answer. Same key set as a successful estimate. */
  private insufficient(
    payRate: string,
    reason: SalaryEstimateReason,
    sampleSize = 0,
  ): SalaryEstimateResult {
    return {
      status: 'insufficientData',
      reason,
      currency: CURRENCY,
      payRate,
      range: null,
      typical: null,
      confidence: 'low',
      sampleSize,
      method: 'none',
      clamped: false,
      basis: [],
      comparison: null,
      explanation: null,
    };
  }

  // ── Data access ───────────────────────────────

  /**
   * All active priced jobs as comparables, cached for `CACHE_TTL_MS`.
   *
   * Deliberately unfiltered beyond "active and priced" — the ladder's title,
   * city, experience and skill narrowing all run in memory, for the reasons
   * set out at the top of `salary.comparables.ts`.
   */
  private async loadPool(): Promise<Comparable[]> {
    const now = Date.now();
    if (this.poolCache && now - this.poolCache.at < CACHE_TTL_MS) {
      return this.poolCache.value;
    }

    let rows: SalaryPoolRow[];
    try {
      rows = await this.db
        .select({
          id: jobs.id,
          title: jobs.title,
          skills: jobs.skills,
          location: jobs.location,
          experienceMin: jobs.experienceMin,
          experienceMax: jobs.experienceMax,
          salaryMin: jobs.salaryMin,
          salaryMax: jobs.salaryMax,
          payRate: jobs.payRate,
        })
        .from(jobs)
        .where(
          and(
            eq(jobs.isActive, true),
            eq(jobs.status, 'active'),
            isNotNull(jobs.salaryMin),
            isNotNull(jobs.salaryMax),
            sql`${jobs.salaryMin} > 0`,
            sql`${jobs.salaryMax} >= ${jobs.salaryMin}`,
          ),
        )
        .orderBy(desc(jobs.createdAt))
        .limit(POOL_SIZE);
    } catch (error) {
      this.logger.error(`Salary pool query failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Service temporarily unavailable');
    }

    const pool = rows.map((row) => toComparable(row)).filter((c): c is Comparable => c !== null);

    this.poolCache = { at: now, value: pool };
    this.logger.log(`Salary pool loaded: ${pool.length} priced active jobs`);
    return pool;
  }

  /**
   * Curated benchmark rows for a role family, city rows first then nationwide.
   *
   * The cold-start safety net for roles our own postings cannot price. A
   * missing or drifted table is tolerated and returns no rows: the benchmark
   * step is the last rung before "not enough data", so a failure there must
   * degrade to an honest empty answer rather than fail the request.
   */
  private async fetchBenchmarks(
    roleFamily: string,
    city: string | null,
  ): Promise<SalaryBenchmarkRow[]> {
    const family = String(roleFamily ?? '')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .join(' ');
    if (!family) return [];

    // Not alias-collapsed, matching the Python: the benchmark table is
    // admin-imported with its own city spellings, and quietly rewriting
    // "bengaluru" to "bangalore" here would match rows the importer never
    // meant to be matched.
    const normalisedCity =
      String(city ?? '')
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .join(' ') || null;

    try {
      return await this.db
        .select({
          roleFamily: salaryBenchmarks.roleFamily,
          city: salaryBenchmarks.city,
          experienceMin: salaryBenchmarks.experienceMin,
          experienceMax: salaryBenchmarks.experienceMax,
          payRate: salaryBenchmarks.payRate,
          p25: salaryBenchmarks.p25,
          p50: salaryBenchmarks.p50,
          p75: salaryBenchmarks.p75,
          source: salaryBenchmarks.source,
        })
        .from(salaryBenchmarks)
        .where(
          and(
            sql`lower(${salaryBenchmarks.roleFamily}) = ${family}`,
            normalisedCity
              ? or(
                  isNull(salaryBenchmarks.city),
                  sql`lower(${salaryBenchmarks.city}) = ${normalisedCity}`,
                )
              : undefined,
          ),
        )
        .orderBy(
          sql`(${salaryBenchmarks.city} IS NULL)`,
          sql`${salaryBenchmarks.effectiveFrom} DESC NULLS LAST`,
        )
        .limit(50);
    } catch (error) {
      this.logger.log(
        `salary_benchmarks unavailable for role_family=${family}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  // ── Result cache ──────────────────────────────
  //
  // Keyed on everything that changes the estimate except `currentRange`, which
  // only affects the comparison line and is computed fresh on every call.

  private cacheKey(
    normTitle: string,
    skills: string[],
    city: string | null,
    expMin: number | null,
    expMax: number | null,
    rate: string,
  ): string {
    const payload = JSON.stringify({
      c: city ?? '',
      e: [expMin, expMax],
      r: rate,
      s: [...new Set(skills.map((s) => s.trim().toLowerCase()).filter(Boolean))].sort(),
      t: normTitle,
    });
    return createHash('sha256').update(payload, 'utf-8').digest('hex');
  }

  private cacheGet(key: string): SalaryEstimateResult | null {
    const entry = this.resultCache.get(key);
    if (entry && Date.now() - entry.at < CACHE_TTL_MS) {
      return { ...entry.value, basis: entry.value.basis.map((b) => ({ ...b })) };
    }
    return null;
  }

  private cachePut(key: string, value: SalaryEstimateResult): void {
    if (this.resultCache.size >= RESULT_CACHE_MAX_ENTRIES) {
      const oldest = this.resultCache.keys().next();
      if (!oldest.done) this.resultCache.delete(oldest.value);
    }
    this.resultCache.set(key, {
      at: Date.now(),
      value: { ...value, basis: value.basis.map((b) => ({ ...b })) },
    });
  }
}

// ── Percentiles ───────────────────────────────────

/**
 * Linear-interpolated percentile, matching numpy's default method.
 *
 * Written out rather than pulled in: a salary estimate is not worth a new
 * dependency for.
 */
export function percentile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const ordered = values.map((v) => Number(v)).sort((a, b) => a - b);
  if (ordered.length === 1) return ordered[0];

  const position = (ordered.length - 1) * (q / 100);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return ordered[lower];
  return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower);
}

// ── Adjustments ───────────────────────────────────

/**
 * Nudge for asking for more (or less) experience than the comparables.
 *
 * Linear in the year difference and capped, because a linear extrapolation
 * stops being defensible a long way from the data.
 */
export function experienceFactor(targetMid: number | null, sample: Comparable[]): number {
  if (targetMid === null) return 1.0;

  const mids = sample
    .map((c) => experienceMid(c.experienceMin, c.experienceMax))
    .filter((m): m is number => m !== null);
  if (!mids.length) return 1.0;

  const reference = percentile(mids, 50);
  if (reference === null) return 1.0;

  const raw = (targetMid - reference) * EXPERIENCE_STEP_PER_YEAR;
  return 1.0 + Math.max(-EXPERIENCE_CAP, Math.min(EXPERIENCE_CAP, raw));
}

/** Coarse tier for a city name. Unknown cities are treated as tier 2. */
export function cityTier(city: string | null): string {
  const key = canonicalCity(city);
  if (!key) return 'tier_1';
  if (METRO_CITIES.has(key)) return 'metro';
  if (TIER_ONE_CITIES.has(key)) return 'tier_1';
  return 'tier_2';
}

/**
 * Nudge for the target city against the cities the comparables came from.
 *
 * Skipped entirely when the comparables are already same-city: their salaries
 * *are* the local market, and adjusting them again would double count.
 */
export function cityFactor(
  city: string | null,
  sample: Comparable[],
  scope: 'city' | 'nationwide',
): number {
  if (scope === 'city' || !city) return 1.0;

  const sampleCities = sample.map((c) => c.city).filter((c): c is string => !!c);
  if (!sampleCities.length) return 1.0;

  const target = CITY_TIER_MULTIPLIER[cityTier(city)];
  const reference =
    sampleCities.reduce((sum, c) => sum + CITY_TIER_MULTIPLIER[cityTier(c)], 0) /
    sampleCities.length;
  if (reference <= 0) return 1.0;

  return Math.max(1.0 - CITY_CAP, Math.min(1.0 + CITY_CAP, target / reference));
}

// ── Small helpers ─────────────────────────────────

function rungFromJobs(
  step: number,
  method: string,
  scope: 'city' | 'nationwide',
  roleLabel: string,
  jobList: Comparable[],
): Rung {
  return {
    step,
    method,
    scope,
    roleLabel,
    values: jobList.map((c) => c.annualMid),
    sample: jobList,
    percentiles: null,
    sampleSize: jobList.length,
    source: null,
  };
}

/** Render a year count without a pointless trailing .0. */
function years(value: number): string {
  return String(value);
}

function yearsLabel(expMin: number | null, expMax: number | null): string | null {
  if (expMin !== null && expMax !== null) {
    return `${years(expMin)}-${years(expMax)} years experience`;
  }
  if (expMin !== null) return `${years(expMin)}+ years experience`;
  if (expMax !== null) return `Up to ${years(expMax)} years experience`;
  return null;
}

/**
 * The one plain-English sentence under the range.
 *
 * In the Python service a 3B model wrote this, which is why that version had a
 * `degraded` flag and a filter throwing away any reply containing a digit. A
 * template built from the method, the sample size and the market says the same
 * thing, cannot invent a figure, and cannot be unavailable.
 */
function buildExplanation(rung: Rung, city: string | null): string {
  const where = rung.scope === 'city' && city ? `in ${titleCase(city)}` : 'across the country';
  const plural = rung.sampleSize === 1 ? '' : 's';

  switch (rung.method) {
    case 'titleCityExp':
      return (
        `A market estimate from ${rung.sampleSize} live job advert${plural} ` +
        `with a matching title ${where}.`
      );
    case 'skillsCityExp':
    case 'skillsNationwide':
      return (
        `A market estimate from ${rung.sampleSize} live job advert${plural} ` +
        `asking for a similar mix of skills ${where}.`
      );
    case 'skillBlend':
      return (
        `A market estimate from ${rung.sampleSize} live job advert${plural} ${where} ` +
        `that share some of these skills — a looser match, so treat it as a guide.`
      );
    case 'familyCityExp':
    case 'familyNationwide':
      return (
        `A market estimate from ${rung.sampleSize} live ${rung.roleLabel} ` +
        `advert${plural} ${where}.`
      );
    case 'benchmarkTable':
      return (
        `A market estimate from ${rung.sampleSize} curated benchmark ` +
        `row${plural} for ${rung.roleLabel} ${where}, because too few live ` +
        `adverts matched this role.`
      );
    default:
      return `A market estimate from ${rung.sampleSize} live job advert${plural} ${where}.`;
  }
}
