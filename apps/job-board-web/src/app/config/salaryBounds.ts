/**
 * What the salary slider can express, per pay rate.
 *
 * The slider used to be a fixed 2,000-200,000 whatever rate was selected.
 * That is a sensible monthly range and a nonsensical annual one: an employer
 * choosing "Yearly" could not state anything above two lakh a year, so every
 * senior role was unpostable at its real salary. It also made the salary
 * estimator look broken, because a correct annual estimate of 13 lakh had
 * nowhere to go.
 *
 * Ranges are deliberately generous at the top — it costs nothing to allow a
 * figure nobody uses, and costs a lost job post to forbid one somebody needs.
 *
 * `apps/job-service/src/salary/salary.units.ts` holds the same table for the
 * estimator's `clamped` flag. The two must agree. They are duplicated rather
 * than shared because this app is outside the pnpm workspace and cannot import
 * from `@ai-job-portal/*`.
 */

export interface SalaryBounds {
  min: number;
  max: number;
  step: number;
}

export const SALARY_BOUNDS: Record<string, SalaryBounds> = {
  hourly: { min: 50, max: 10000, step: 50 },
  daily: { min: 200, max: 50000, step: 200 },
  weekly: { min: 1000, max: 200000, step: 1000 },
  monthly: { min: 2000, max: 500000, step: 2000 },
  yearly: { min: 25000, max: 6000000, step: 25000 },
};

/** Monthly is the fallback: it is what most of the posted jobs use. */
export const DEFAULT_SALARY_BOUNDS = SALARY_BOUNDS.monthly;

/**
 * Bounds for a pay rate, tolerant of the shapes a form field can hold —
 * HeroUI selects have historically handed back a Set rather than a string.
 */
export function salaryBoundsFor(payRate: unknown): SalaryBounds {
  const key =
    typeof payRate === 'string'
      ? payRate
      : payRate instanceof Set
        ? String([...payRate][0] ?? '')
        : Array.isArray(payRate)
          ? String(payRate[0] ?? '')
          : '';

  return SALARY_BOUNDS[key.toLowerCase()] ?? DEFAULT_SALARY_BOUNDS;
}

/** Pull a value inside the bounds, rounded onto the slider's step. */
export function clampToSalaryBounds(value: number, bounds: SalaryBounds): number {
  const stepped = Math.round(value / bounds.step) * bounds.step;
  return Math.min(Math.max(stepped, bounds.min), bounds.max);
}

/**
 * Fit an existing range into new bounds after the pay rate changes.
 *
 * Clamped rather than converted. Converting (50,000 monthly becoming 600,000
 * yearly) assumes the employer meant to restate the same pay in new units,
 * but someone switching the rate is just as likely to be correcting the unit
 * they picked by mistake. Clamping changes the number only when it has to.
 */
export function fitRangeToBounds(range: unknown, bounds: SalaryBounds): [number, number] {
  const pair = Array.isArray(range) ? range : [];
  const low = Number(pair[0]);
  const high = Number(pair[1]);

  const min = clampToSalaryBounds(Number.isFinite(low) ? low : bounds.min, bounds);
  const max = clampToSalaryBounds(Number.isFinite(high) ? high : bounds.max, bounds);

  return min <= max ? [min, max] : [max, min];
}
