/**
 * Contract for the salary estimate endpoint (`POST /jobs/salary-estimate`).
 *
 * Kept in its own file rather than bolted onto `types.ts` purely for size: it
 * is one self-contained feature contract. The field names are camelCase, like
 * every other endpoint in this app.
 *
 * IMPORTANT: every money figure below is expressed in the SAME unit as
 * `payRate` (hourly / daily / weekly / monthly / yearly). They are not lakhs
 * and not always annual. Format them with the job form's currency formatter and
 * always print the pay-rate unit next to them.
 */

export type SalaryEstimateStatus = 'ok' | 'insufficientData';

/** Why an estimate came back without numbers. Null whenever `status` is `ok`. */
export type SalaryEstimateReason = 'noPricedJobs' | 'noComparables' | 'inconsistentComparables';

export type SalaryConfidence = 'high' | 'medium' | 'low';

/** Which comparison the figures were built from. Diagnostic, not shown to users. */
export type SalaryEstimateMethod =
  | 'titleCityExp'
  | 'skillsCityExp'
  | 'skillsNationwide'
  | 'skillBlend'
  | 'familyCityExp'
  | 'familyNationwide'
  | 'benchmarkTable'
  | 'none';

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
  deltaPct: number;
  message: string;
}

export interface SalaryEstimateResponse {
  status: SalaryEstimateStatus;
  reason: SalaryEstimateReason | null;
  currency: string;
  payRate: string;
  range: SalaryRange | null;
  typical: number | null;
  confidence: SalaryConfidence;
  /** How many live jobs the estimate is built from. Always shown to the employer. */
  sampleSize: number;
  method: SalaryEstimateMethod;
  /** True when the range was capped to the salary slider's 2,000-200,000 bounds. */
  clamped: boolean;
  basis: SalaryBasisItem[];
  comparison: SalaryComparison | null;
  /** One line of plain wording about the range, generated from the figures. */
  explanation: string | null;
}

export interface SalaryEstimateRequest {
  title: string;
  skills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  location: string;
  jobType: string[];
  workMode: string[];
  payRate: string;
  currentRange: [number, number];
}
