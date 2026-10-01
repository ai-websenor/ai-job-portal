/**
 * Unit and text normalisation for salary comparison.
 *
 * Two columns in `jobs` make naive comparison wrong, and both are handled here.
 *
 * **`pay_rate` is mixed.** `salary_min`/`salary_max` are plain integers whose
 * meaning depends on `pay_rate` — monthly for most rows, but also daily,
 * weekly, hourly and yearly. Averaging 45000 (monthly) with 1200 (daily)
 * produces a number that means nothing. Everything is therefore converted to
 * an annual figure before any arithmetic and converted back to the caller's
 * requested rate at the very end.
 *
 * **`jobs.city` is never written.** The employer job form has a single
 * free-text `location` box, so the `city` column is NULL on every row and the
 * real value looks like "Udaipur, Rajasthan, India, 313001", "Mumbai, India",
 * "Bangalore" or "udaipur ". `cityFromLocation` pulls the city back out of
 * that string. Nothing in this module may filter on `jobs.city`.
 *
 * A direct port of `jobboard-ai-engine/app/salary/units.py`.
 */

/**
 * Working-year multipliers. Deliberately conservative and fixed: they are a
 * unit conversion, not a market opinion, so they must never drift.
 */
export const PAY_RATE_MULTIPLIERS: Record<string, number> = {
  hourly: 2080, // 40h x 52 weeks
  daily: 260, // 5 days x 52 weeks
  weekly: 52,
  monthly: 12,
  yearly: 1,
};

/**
 * A NULL `pay_rate` is read as monthly: that is what the overwhelming majority
 * of the populated rows say, and the employer form defaults to it.
 */
export const DEFAULT_PAY_RATE = 'monthly';

/** Spellings seen in the wild / likely from the frontend select. */
const PAY_RATE_ALIASES: Record<string, string> = {
  hour: 'hourly',
  hr: 'hourly',
  'per hour': 'hourly',
  per_hour: 'hourly',
  hourly: 'hourly',
  day: 'daily',
  'per day': 'daily',
  per_day: 'daily',
  daily: 'daily',
  week: 'weekly',
  'per week': 'weekly',
  per_week: 'weekly',
  weekly: 'weekly',
  month: 'monthly',
  'per month': 'monthly',
  per_month: 'monthly',
  monthly: 'monthly',
  mo: 'monthly',
  year: 'yearly',
  'per year': 'yearly',
  per_year: 'yearly',
  yearly: 'yearly',
  annual: 'yearly',
  annually: 'yearly',
  'per annum': 'yearly',
  pa: 'yearly',
  ctc: 'yearly',
};

/** Collapse runs of whitespace, trim, lowercase. Python's `" ".join(s.split())`. */
function squash(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

/**
 * Map whatever arrived to one of the five known rates.
 *
 * Unknown or missing values become `DEFAULT_PAY_RATE` rather than throwing: a
 * salary estimate is advisory, and refusing to answer because an employer
 * picked an unexpected label helps nobody.
 */
export function normalisePayRate(payRate?: string | null): string {
  return PAY_RATE_ALIASES[squash(payRate)] ?? DEFAULT_PAY_RATE;
}

/** Convert a salary figure in `payRate` units into a yearly figure. */
export function annualise(
  amount: number | string | null | undefined,
  payRate?: string | null,
): number | null {
  if (amount === null || amount === undefined) return null;
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(value)) return null;
  return value * PAY_RATE_MULTIPLIERS[normalisePayRate(payRate)];
}

/**
 * Convert a yearly figure back into `payRate` units, rounded to an integer.
 *
 * Round-trips with `annualise` exactly for whole multiples, and to within a
 * rupee otherwise — the employer slider steps in thousands, so sub-rupee
 * precision is noise.
 */
export function deannualise(
  annual: number | string | null | undefined,
  payRate?: string | null,
): number | null {
  if (annual === null || annual === undefined) return null;
  const value = typeof annual === 'number' ? annual : Number(annual);
  if (!Number.isFinite(value)) return null;
  return Math.round(value / PAY_RATE_MULTIPLIERS[normalisePayRate(payRate)]);
}

// ── Location ────────────────────────────────────

/**
 * City spellings that mean the same market. Applied only when matching, never
 * when reporting, so the employer still sees the name they typed.
 */
const CITY_ALIASES: Record<string, string> = {
  bengaluru: 'bangalore',
  'bangalore urban': 'bangalore',
  bombay: 'mumbai',
  'navi mumbai': 'mumbai',
  thane: 'mumbai',
  'new delhi': 'delhi',
  'delhi ncr': 'delhi',
  ncr: 'delhi',
  gurugram: 'gurgaon',
  calcutta: 'kolkata',
  madras: 'chennai',
  trivandrum: 'thiruvananthapuram',
  pondicherry: 'puducherry',
  vizag: 'visakhapatnam',
};

const NOT_A_CITY = new Set(['remote', 'work from home', 'wfh', 'anywhere', 'india']);

/**
 * Best-effort city from the employer's free-text location string.
 *
 * The rule is the first comma-separated token, trimmed and lowercased, which
 * covers every shape present in the data: "Udaipur, Rajasthan, India, 313001",
 * "Mumbai, India", "Bangalore", "udaipur", "Udaipur " (trailing space).
 *
 * Two guards on top of that rule:
 * - a leading token that is only digits (a stray pincode) is skipped in favour
 *   of the next token;
 * - "remote"/"work from home" is not a city, so it yields null and the
 *   estimate falls through to the nationwide step instead of matching the
 *   handful of rows that happen to say "Remote".
 */
export function cityFromLocation(location?: string | null): string | null {
  let raw = String(location ?? '');
  if (!raw.trim()) return null;

  // Employers also separate with "-", "|" and "/" — treat those as commas so
  // "Bangalore - Karnataka" does not become the city "bangalore - karnataka".
  for (const separator of ['|', '/', ' - ']) {
    raw = raw.split(separator).join(',');
  }

  for (const token of raw.split(',')) {
    const city = squash(token);
    if (!city || /^\d+$/.test(city)) continue;
    if (NOT_A_CITY.has(city)) continue;
    return city;
  }
  return null;
}

/** Collapse alternative spellings so two cities can be compared. */
export function canonicalCity(city?: string | null): string | null {
  if (!city) return null;
  const key = squash(city);
  if (!key) return null;
  return CITY_ALIASES[key] ?? key;
}

// ── Title ───────────────────────────────────────

/**
 * Seniority is already handled by the experience band, so carrying it in the
 * title only splits "Senior Java Developer" away from "Java Developer" and
 * costs a comparable we should have had.
 */
const TITLE_NOISE = new Set([
  'sr',
  'senior',
  'jr',
  'junior',
  'lead',
  'principal',
  'staff',
  'chief',
  'associate',
  'assistant',
  'trainee',
  'intern',
  'i',
  'ii',
  'iii',
  'iv',
  'fresher',
  'experienced',
  'urgent',
  'hiring',
  'immediate',
  'required',
  'the',
  'a',
  'an',
  'for',
  'of',
  'and',
]);

/**
 * Reduce a job title to a comparable key.
 *
 * Lowercased, punctuation dropped, seniority and recruiter filler removed,
 * remaining words sorted so "Developer Full Stack" equals "Full Stack
 * Developer". Returns "" when nothing meaningful is left.
 */
export function normaliseTitle(title?: string | null): string {
  const raw = String(title ?? '').toLowerCase();
  // Python's `ch.isalnum()` is Unicode-aware; the closest honest equivalent
  // here keeps letters and digits from any script.
  const cleaned = raw.replace(/[^\p{L}\p{N}]+/gu, ' ');
  const words = cleaned.split(/\s+/).filter((w) => w && !TITLE_NOISE.has(w));
  if (!words.length) return '';
  return words.sort().join(' ');
}

// ── Experience ──────────────────────────────────

/** Midpoint of an experience band, tolerating a half-filled one. */
export function experienceMid(expMin?: number | null, expMax?: number | null): number | null {
  const values = [expMin, expMax].filter(
    (v): v is number => v !== null && v !== undefined && Number.isFinite(Number(v)),
  );
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + Number(v), 0) / values.length;
}

/**
 * True when two experience bands share any years.
 *
 * An open end is treated as unbounded, and a band that is entirely missing
 * matches everything — roughly a third of rows leave experience blank, and
 * excluding them would throw away comparables we do have salaries for.
 */
export function bandsOverlap(
  aMin?: number | null,
  aMax?: number | null,
  bMin?: number | null,
  bMax?: number | null,
): boolean {
  const isSet = (v?: number | null) => v !== null && v !== undefined;

  if (!isSet(aMin) && !isSet(aMax)) return true;
  if (!isSet(bMin) && !isSet(bMax)) return true;

  const loA = isSet(aMin) ? Number(aMin) : -Infinity;
  const hiA = isSet(aMax) ? Number(aMax) : Infinity;
  const loB = isSet(bMin) ? Number(bMin) : -Infinity;
  const hiB = isSet(bMax) ? Number(bMax) : Infinity;

  return loA <= hiB && loB <= hiA;
}

/** Title-case a word sequence, as Python's `str.title()` does for our labels. */
export function titleCase(value: string): string {
  return String(value ?? '').replace(
    /\p{L}[\p{L}\p{N}']*/gu,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}
