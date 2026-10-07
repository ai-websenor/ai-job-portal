/**
 * The AI settings an admin controls, shared so that the service that writes
 * them and the service that reads them cannot drift apart.
 *
 * admin-service writes these rows into `platform_settings`; job-service reads
 * them when pricing a job. Nothing else coordinates the two, so a typo in a key
 * string on either side would silently mean "setting always off" — a bug that
 * looks exactly like working software.
 */

export const AI_SETTINGS_CATEGORY = 'ai';

export const AI_SETTING_KEYS = {
  /** 'true' / 'false' — may the salary estimate fall back off-platform at all. */
  SALARY_EXTERNAL_SOURCE_ENABLED: 'ai.salary.external_source.enabled',
  /** Which source to use. Empty means none, so the fallback stays inactive. */
  SALARY_EXTERNAL_SOURCE_PROVIDER: 'ai.salary.external_source.provider',
} as const;

/**
 * Sources an admin may select.
 *
 * Deliberately empty: no provider has been chosen or built yet. The toggle is
 * therefore inert, which is the honest state rather than a half-wired
 * integration that appears to work.
 *
 * Adding one means: implement `ExternalSalaryProvider` in
 * `apps/job-service/src/salary/salary.external-source.ts`, register it there
 * under the same `id`, and add the entry here so an admin can pick it.
 */
export const EXTERNAL_SALARY_SOURCES: readonly { id: string; label: string }[] = [];

export function isKnownExternalSalarySource(id: string): boolean {
  return EXTERNAL_SALARY_SOURCES.some((source) => source.id === id);
}
