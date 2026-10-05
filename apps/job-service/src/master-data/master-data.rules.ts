/**
 * Pure rules shared by the employer-facing search and the save-time capture.
 *
 * Kept free of Nest and Drizzle on purpose: these are the parts worth testing
 * without a database, and `master-data.spec.ts` covers them directly.
 */

/** Default number of dropdown rows when the caller does not ask for a size. */
export const DEFAULT_SEARCH_LIMIT = 20;

/** Smallest useful page. */
export const MIN_SEARCH_LIMIT = 1;

/**
 * Hard ceiling. The dropdown is a typeahead, not a browse screen, and the
 * three master tables are small enough that a bigger page would only make the
 * payload slower without helping anyone pick a value.
 */
export const MAX_SEARCH_LIMIT = 50;

/**
 * Trim a caller-supplied name down to what we would store or compare.
 * Anything that is not a string becomes an empty string.
 */
export function normaliseName(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Clamp `limit` into 1..50, falling back to the default for anything that is
 * not a positive number (missing, empty, `abc`, `0`, `-5`, `NaN`).
 */
export function clampSearchLimit(raw: unknown): number {
  const parsed = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SEARCH_LIMIT;
  const whole = Math.trunc(parsed);
  if (whole < MIN_SEARCH_LIMIT) return MIN_SEARCH_LIMIT;
  if (whole > MAX_SEARCH_LIMIT) return MAX_SEARCH_LIMIT;
  return whole;
}

/**
 * Escape the characters Postgres treats as LIKE/ILIKE wildcards, so a search
 * for `100%` or `C_C` matches those literal names instead of everything.
 * Backslash is Postgres' default LIKE escape character, so no ESCAPE clause is
 * needed alongside this.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/**
 * Should a value typed on the job form become a master row?
 *
 * The same three rules the seed migration used
 * (`0049_master_job_title_qualification_certification.sql`), and for the same
 * reason: the live `jobs` table contains qualifications of "1", "3" and "34".
 * Those cannot be a qualification, and capturing them would only hand the
 * admin a review queue full of noise.
 *
 * - empty / whitespace only -> skip
 * - a single character -> skip
 * - digits only -> skip
 */
export function isCaptureableName(raw: unknown): boolean {
  const name = normaliseName(raw);
  if (name.length <= 1) return false;
  if (/^[0-9]+$/.test(name)) return false;
  return true;
}
