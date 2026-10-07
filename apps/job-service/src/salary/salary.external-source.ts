/**
 * The external salary source — a fallback for when the platform cannot price a
 * role from its own data.
 *
 * Why this exists: every estimate is built from jobs already posted here. On a
 * brand new production database there are none, so every employer would be told
 * "not enough data" on their first post. That is honest and useless.
 *
 * Why it is a port with no implementation: the provider has not been chosen.
 * Naming it `externalSalarySource` rather than after a vendor means picking one
 * later is a configuration change, not a rename through the codebase.
 *
 * Three rules this fallback must keep, which are the reasons the feature is
 * defensible in the first place:
 *
 *   1. **Platform data always wins.** This is consulted only when every rung of
 *      the ladder has already failed. It never overrides a real comparable.
 *   2. **It is never presented as market data.** Confidence is forced to `low`
 *      and the basis says where the figure came from, so an employer can weigh
 *      it themselves.
 *   3. **It never drives the "you are X% below market" warning.** That line
 *      claims an authority a fallback estimate does not have.
 *
 * A provider that cannot answer returns null, and the estimate stays
 * `insufficientData` — refusing remains better than inventing.
 */

/** What the estimator asks an external source for. */
export interface ExternalSalaryQuery {
  title: string;
  roleFamily: string | null;
  skills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  city: string | null;
  /** Always 'yearly' — the estimator converts to the caller's unit itself. */
  payRate: 'yearly';
  currency: string;
}

/** What a source must return. Percentiles in annual currency units. */
export interface ExternalSalaryResult {
  p25: number;
  p50: number;
  p75: number;
  /** Shown to the employer, so it must name something real and checkable. */
  sourceLabel: string;
}

/**
 * Implement one of these per provider and register it in
 * `EXTERNAL_SALARY_PROVIDERS` below.
 */
export interface ExternalSalaryProvider {
  /**
   * Matches the `ai.salary.external_source.provider` setting value, and the
   * `id` of the corresponding `EXTERNAL_SALARY_SOURCES` entry.
   */
  readonly name: string;
  /**
   * Returns null when the provider cannot answer. Must not throw — the
   * estimator treats a failure as "no answer", never as an error worth
   * failing the employer's request over.
   */
  estimate(query: ExternalSalaryQuery): Promise<ExternalSalaryResult | null>;
}

/**
 * Registered providers, keyed by the id an admin selects.
 *
 * Deliberately empty. No provider has been chosen, so the toggle currently has
 * nothing behind it — which is the honest state rather than a half-built
 * integration pretending to work.
 *
 * Adding one: implement `ExternalSalaryProvider`, register it here, and add the
 * matching entry to `EXTERNAL_SALARY_SOURCES` in
 * `packages/common/src/constants/ai-settings.ts` so it appears in the admin
 * panel's dropdown.
 */
export const EXTERNAL_SALARY_PROVIDERS: Record<string, ExternalSalaryProvider> = {};

/** The provider an admin has selected, or null when none is configured. */
export function resolveExternalSalaryProvider(
  providerName: string | null | undefined,
): ExternalSalaryProvider | null {
  const key = String(providerName ?? '').trim();
  if (!key) return null;
  return EXTERNAL_SALARY_PROVIDERS[key] ?? null;
}
