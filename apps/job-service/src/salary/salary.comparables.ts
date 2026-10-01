/**
 * Finding the jobs a salary estimate is actually based on.
 *
 * The pool is loaded once per request (and cached briefly, because the job
 * table barely moves within a day) and then narrowed in memory. Filtering here
 * rather than in SQL is a considered choice:
 *
 * - `jobs.city` is NULL on every row, so the city has to be parsed out of the
 *   free-text `jobs.location`, which is not something to attempt in SQL;
 * - skill matching must go through `@ai-job-portal/common`, the one shared
 *   definition of "the same skill" across salary, recommendations and resume
 *   scoring;
 * - the whole active-job table is a few dozen rows, so pulling the pool once
 *   and filtering it in memory is cheaper than six round trips.
 *
 * Every comparable carries its **annual** midpoint. Nothing downstream ever
 * sees a raw `salary_min` again, because those integers mean different things
 * on different rows.
 *
 * A direct port of `jobboard-ai-engine/app/salary/comparables.py`.
 */

import { canonicalSkill, skillOverlap } from '@ai-job-portal/common';
import {
  annualise,
  bandsOverlap,
  canonicalCity,
  cityFromLocation,
  normaliseTitle,
} from './salary.units';

/** Share of the target job's skills a comparable must also require. */
export const SKILL_OVERLAP_THRESHOLD = 0.6;

/**
 * How many of the target's skills feed the per-skill blend. Beyond the first
 * few the tail is usually "communication" and "teamwork", which price nothing.
 */
export const BLEND_TOP_SKILLS = 5;

/** One live job posting, reduced to the fields a salary estimate needs. */
export interface Comparable {
  jobId: string;
  title: string;
  normTitle: string;
  city: string | null;
  skills: string[];
  skillKeys: Set<string>;
  experienceMin: number | null;
  experienceMax: number | null;
  annualMid: number;
}

/** One raw row as the pool query returns it. */
export interface SalaryPoolRow {
  id: string | null;
  title: string | null;
  skills: string[] | null;
  location: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  payRate: string | null;
}

/** One curated benchmark row. */
export interface SalaryBenchmarkRow {
  roleFamily: string;
  city: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  payRate: string | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  source: string | null;
}

/** Turn a raw job row into a `Comparable`, or null if it cannot be priced. */
export function toComparable(row: SalaryPoolRow): Comparable | null {
  const { salaryMin, salaryMax } = row;
  if (salaryMin === null || salaryMin === undefined) return null;
  if (salaryMax === null || salaryMax === undefined) return null;

  const midpoint = (Number(salaryMin) + Number(salaryMax)) / 2;
  if (!Number.isFinite(midpoint) || midpoint <= 0) return null;

  const annual = annualise(midpoint, row.payRate);
  if (!annual || annual <= 0) return null;

  const skills = (row.skills ?? []).map((s) => String(s ?? '')).filter((s) => s.trim().length > 0);
  const title = String(row.title ?? '');

  const skillKeys = new Set<string>();
  for (const skill of skills) {
    const key = canonicalSkill(skill);
    if (key) skillKeys.add(key);
  }

  return {
    jobId: String(row.id ?? ''),
    title,
    normTitle: normaliseTitle(title),
    city: canonicalCity(cityFromLocation(row.location)),
    skills,
    skillKeys,
    experienceMin: row.experienceMin ?? null,
    experienceMax: row.experienceMax ?? null,
    annualMid: annual,
  };
}

// ── Filters ─────────────────────────────────────

/** Comparables whose normalised title matches exactly. */
export function byTitle(pool: Comparable[], normTitle: string): Comparable[] {
  if (!normTitle) return [];
  return pool.filter((c) => c.normTitle && c.normTitle === normTitle);
}

/**
 * Comparables in the same city.
 *
 * A null city means the employer gave no usable location, so there is nothing
 * to narrow by and the pool passes through untouched. The caller is
 * responsible for labelling that result as nationwide.
 */
export function byCity(pool: Comparable[], city: string | null): Comparable[] {
  const target = canonicalCity(city);
  if (!target) return [...pool];
  return pool.filter((c) => c.city === target);
}

/** Comparables whose experience band overlaps the target's. */
export function byExperience(
  pool: Comparable[],
  expMin: number | null,
  expMax: number | null,
): Comparable[] {
  if (expMin === null && expMax === null) return [...pool];
  return pool.filter((c) => bandsOverlap(expMin, expMax, c.experienceMin, c.experienceMax));
}

/**
 * Comparables that require at least `threshold` of the target's skills.
 *
 * Direction matters: we ask how much of *this* job's skill list a comparable
 * also asks for. A ten-skill posting that happens to include our two is not a
 * comparable for a two-skill posting, and vice versa is exactly what we want.
 */
export function bySkillOverlap(
  pool: Comparable[],
  skills: string[],
  threshold: number = SKILL_OVERLAP_THRESHOLD,
): Comparable[] {
  const wanted = (skills ?? []).filter((s) => String(s ?? '').trim().length > 0);
  if (!wanted.length) return [];

  const keys = new Set<string>();
  for (const skill of wanted) {
    const key = canonicalSkill(skill);
    if (key) keys.add(key);
  }
  if (!keys.size) return [];

  const out: Comparable[] = [];
  for (const comparable of pool) {
    if (!comparable.skills.length) continue;
    const { matched } = skillOverlap(wanted, comparable.skills);
    if (matched.length / keys.size >= threshold) out.push(comparable);
  }
  return out;
}

// ── Per-skill blend (ladder step 4) ─────────────

/**
 * Annual values weighted by how many of the target's skills each job shares.
 *
 * For each of the target's top skills we collect every job that also requires
 * it. A job that shares three of those skills contributes its annual midpoint
 * three times, so the blend leans towards postings that look like this one
 * without ever inventing a value that is not a real posting's salary.
 *
 * Returns `{ values, distinct }`. `values` feeds the percentile maths;
 * `distinct` is the honest sample size to report.
 */
export function perSkillBlend(
  pool: Comparable[],
  skills: string[],
  topN: number = BLEND_TOP_SKILLS,
): { values: number[]; distinct: Comparable[] } {
  const wanted = (skills ?? []).filter((s) => String(s ?? '').trim().length > 0).slice(0, topN);
  if (!wanted.length) return { values: [], distinct: [] };

  const values: number[] = [];
  const distinct = new Map<string, Comparable>();

  for (const skill of wanted) {
    const key = canonicalSkill(skill);
    if (!key) continue;
    for (const comparable of pool) {
      if (comparable.skillKeys.has(key)) {
        values.push(comparable.annualMid);
        distinct.set(comparable.jobId, comparable);
      }
    }
  }

  return { values, distinct: [...distinct.values()] };
}

// ── Benchmark table (ladder step 6) ─────────────

export interface BenchmarkResult {
  percentiles: [number, number, number] | null;
  rowCount: number;
  source: string | null;
}

/**
 * Annual p25/p50/p75 from already-fetched curated benchmark rows.
 *
 * Rows whose experience band does not overlap the target's are dropped. If
 * several rows survive, their percentiles are averaged — the importer may hold
 * one row per source, and silently preferring one source over another would be
 * a hidden editorial choice.
 */
export function benchmarkPercentiles(
  rows: SalaryBenchmarkRow[],
  expMin: number | null,
  expMax: number | null,
): BenchmarkResult {
  const empty: BenchmarkResult = { percentiles: null, rowCount: 0, source: null };
  if (!rows || !rows.length) return empty;

  const usable = rows.filter(
    (row) =>
      bandsOverlap(expMin, expMax, row.experienceMin, row.experienceMax) &&
      row.p25 !== null &&
      row.p25 !== undefined &&
      row.p50 !== null &&
      row.p50 !== undefined &&
      row.p75 !== null &&
      row.p75 !== undefined,
  );
  if (!usable.length) return empty;

  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const p25 = mean(usable.map((r) => annualise(r.p25, r.payRate) as number));
  const p50 = mean(usable.map((r) => annualise(r.p50, r.payRate) as number));
  const p75 = mean(usable.map((r) => annualise(r.p75, r.payRate) as number));

  const sources = [
    ...new Set(usable.map((r) => String(r.source ?? '').trim()).filter(Boolean)),
  ].sort();
  const source = sources.length ? sources.slice(0, 2).join(', ') : null;

  return { percentiles: [p25, p50, p75], rowCount: usable.length, source };
}
