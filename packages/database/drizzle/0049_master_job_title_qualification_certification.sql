-- Master lists for job title, qualification and certification
--
-- These three fields were free text on the employer job form, so the same role
-- arrived spelled several ways and nothing grouped together. They now follow
-- the pattern skills, master_degrees and job categories already use: a typed
-- value that matches nothing is kept as `user-typed` and appears immediately,
-- and an admin promotes it to `master-typed` or deactivates it later.
--
-- Additive only. The jobs table is untouched: title, qualification and
-- certification stay plain columns, so deactivating a master row can never
-- alter a job that already exists.

-- Trigram search, the same way skills already search. Harmless if present.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS master_job_titles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(255) NOT NULL,
  type       skill_type   NOT NULL DEFAULT 'user-typed',
  is_active  boolean      NOT NULL DEFAULT true,
  created_at timestamp    NOT NULL DEFAULT now(),
  updated_at timestamp    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS master_qualifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(255) NOT NULL,
  type       skill_type   NOT NULL DEFAULT 'user-typed',
  is_active  boolean      NOT NULL DEFAULT true,
  created_at timestamp    NOT NULL DEFAULT now(),
  updated_at timestamp    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS master_certifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(255) NOT NULL,
  type       skill_type   NOT NULL DEFAULT 'user-typed',
  is_active  boolean      NOT NULL DEFAULT true,
  created_at timestamp    NOT NULL DEFAULT now(),
  updated_at timestamp    NOT NULL DEFAULT now()
);

-- One row per name, case-insensitively. "Backend Developer" and "backend
-- developer" are the same entry, and the lookup on save relies on that.
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_job_titles_name_lower
  ON master_job_titles (lower(btrim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_qualifications_name_lower
  ON master_qualifications (lower(btrim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_certifications_name_lower
  ON master_certifications (lower(btrim(name)));

-- Prefix and fuzzy search, so typing "word" finds "WordPress Engineer".
CREATE INDEX IF NOT EXISTS idx_master_job_titles_name_trgm
  ON master_job_titles USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_master_qualifications_name_trgm
  ON master_qualifications USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_master_certifications_name_trgm
  ON master_certifications USING gin (name gin_trgm_ops);

-- ── Seed from the jobs already posted ────────────────────────────────────────
--
-- Seeded as `user-typed`, not `master-typed`. These values were typed into a
-- free-text box and nobody has ever reviewed them — the existing data includes
-- qualifications of "1", "3", "34" and "23e4r5t". Marking them master-typed
-- would assert an approval that never happened, and would put that rubbish in
-- the dropdown as curated master data. As user-typed they still appear (same
-- as skills), and they all land in the admin review queue, which is exactly
-- where they belong.
--
-- Values that are purely digits, or a single character, are skipped outright:
-- they cannot be a job title or a qualification, and seeding them would only
-- give the admin a queue of noise to clear.
--
-- DISTINCT ON picks one spelling per lowercased name, preferring the most
-- recently posted, which is the likeliest to be the house spelling.

INSERT INTO master_job_titles (name, type)
SELECT DISTINCT ON (lower(btrim(j.title))) btrim(j.title), 'user-typed'::skill_type
FROM jobs j
WHERE btrim(COALESCE(j.title, '')) <> ''
  AND length(btrim(j.title)) > 1
  AND btrim(j.title) !~ '^[0-9]+$'
ORDER BY lower(btrim(j.title)), j.created_at DESC
ON CONFLICT DO NOTHING;

INSERT INTO master_qualifications (name, type)
SELECT DISTINCT ON (lower(btrim(j.qualification))) btrim(j.qualification), 'user-typed'::skill_type
FROM jobs j
WHERE btrim(COALESCE(j.qualification, '')) <> ''
  AND length(btrim(j.qualification)) > 1
  AND btrim(j.qualification) !~ '^[0-9]+$'
ORDER BY lower(btrim(j.qualification)), j.created_at DESC
ON CONFLICT DO NOTHING;

INSERT INTO master_certifications (name, type)
SELECT DISTINCT ON (lower(btrim(j.certification))) btrim(j.certification), 'user-typed'::skill_type
FROM jobs j
WHERE btrim(COALESCE(j.certification, '')) <> ''
  AND length(btrim(j.certification)) > 1
  AND btrim(j.certification) !~ '^[0-9]+$'
ORDER BY lower(btrim(j.certification)), j.created_at DESC
ON CONFLICT DO NOTHING;
