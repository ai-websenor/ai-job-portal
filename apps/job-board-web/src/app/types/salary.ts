/**
 * Contract for the AI salary estimate endpoint (`POST /ai/salary-estimate`).
 *
 * Kept in its own file rather than bolted onto `types.ts` because the engine
 * speaks snake_case and the rest of the app speaks camelCase — mixing the two
 * conventions in one file invites someone to "fix" these names later and break
 * the wire format.
 *
 * IMPORTANT: every money figure below is expressed in the SAME unit as
 * `pay_rate` (hourly / daily / weekly / monthly / yearly). They are not lakhs
 * and not always annual. Format them with the job form's currency formatter and
 * always print the pay-rate unit next to them.
 */

export type SalaryEstimateStatus = 'ok' | 'insufficient_data';

export type SalaryConfidence = 'high' | 'medium' | 'low';

export type SalaryBasisIcon = 'experience' | 'role' | 'skills' | 'location';

export type SalaryComparisonStatus = 'below' | 'within' | 'above';

export interface SalaryBasisItem {
  icon: SalaryBasisIcon;
  label: string;
}

export interface SalaryRange {
  min: number;
  max: number;
}

export interface SalaryComparison {
  status: SalaryComparisonStatus;
  /** Signed percentage difference between the posted range and the market one. */
  delta_pct: number;
  message: string;
}

export interface SalaryEstimateResponse {
  status: SalaryEstimateStatus;
  currency: string;
  pay_rate: string;
  range: SalaryRange | null;
  typical: number | null;
  confidence: SalaryConfidence;
  /** How many live jobs the estimate is built from. Always shown to the employer. */
  sample_size: number;
  method: string;
  /** True when the range was capped to the salary slider's 2,000-200,000 bounds. */
  clamped: boolean;
  basis: SalaryBasisItem[];
  comparison: SalaryComparison | null;
  /** One-line LLM explanation. Null or hidden when `degraded` is true. */
  explanation: string | null;
  /** True when the language model was unavailable; the numbers are still valid. */
  degraded: boolean;
}

export interface SalaryEstimateRequest {
  title: string;
  skills: string[];
  experience_min: number | null;
  experience_max: number | null;
  location: string;
  job_type: string[];
  work_mode: string[];
  pay_rate: string;
  current_range: [number, number];
}
