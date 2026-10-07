-- AI settings: the external salary source toggle
--
-- Salary prediction is priced from the platform's own job postings. On a brand
-- new production database there are none, so every estimate would honestly but
-- unhelpfully return "not enough data". These settings control an optional
-- fallback for exactly that cold start.
--
-- Stored in the existing platform_settings key/value table rather than a new
-- one, under category 'ai', because that is what the table is for.
--
-- Named `external_salary_source`, not after whichever vendor is eventually
-- chosen. The name says what it does, so swapping providers later is a value
-- change rather than a rename across the codebase.
--
-- Both default to off and unset. The fallback does nothing until an admin
-- turns it on AND a provider is configured, so applying this migration changes
-- no behaviour whatsoever.

INSERT INTO platform_settings (key, value, data_type, category, description, is_public)
VALUES
  (
    'ai.salary.external_source.enabled',
    'false',
    'boolean',
    'ai',
    'Allow salary estimates to fall back to an external salary source when the platform has too few comparable jobs. Platform data is always tried first; the external source is only consulted when nothing on the platform can price the role.',
    false
  ),
  (
    'ai.salary.external_source.provider',
    '',
    'string',
    'ai',
    'Which external salary source to use. Empty means none is configured, in which case the fallback stays inactive even when enabled.',
    false
  )
ON CONFLICT (key) DO NOTHING;
