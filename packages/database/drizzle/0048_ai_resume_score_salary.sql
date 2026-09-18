-- AI Resume Scoring & Salary Prediction
--
-- Additive only: new columns on the (previously unused) resume_analysis table
-- and a new salary_benchmarks table. Nothing is dropped or renamed, so this is
-- safe to apply to an environment that is already serving traffic.
--
-- Written by hand rather than generated because `drizzle-kit generate` stops on
-- unrelated pre-existing drift (subscription_plans.job_validity_days) and would
-- fold that ambiguity into this migration.

-- ── resume_analysis: per-job scoring ──────────────────────────────────────────

ALTER TABLE resume_analysis
  ADD COLUMN IF NOT EXISTS job_id           uuid REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id          uuid REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS overall_score    integer,
  ADD COLUMN IF NOT EXISTS missing_keywords text,
  ADD COLUMN IF NOT EXISTS improvements     text,
  ADD COLUMN IF NOT EXISTS degraded         boolean DEFAULT false;

-- One stored result per (resume, target job). A NULL job_id is the generic
-- score, and Postgres treats NULLs as distinct in a unique index, so the
-- generic row is deduped by the partial index below instead.
CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_analysis_resume_job
  ON resume_analysis (resume_id, job_id)
  WHERE job_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_analysis_resume_generic
  ON resume_analysis (resume_id)
  WHERE job_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_resume_analysis_user
  ON resume_analysis (user_id, analyzed_at DESC);

-- ── salary_benchmarks: fallback market reference ──────────────────────────────

CREATE TABLE IF NOT EXISTS salary_benchmarks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_family     varchar(150) NOT NULL,
  city            varchar(100),
  experience_min  integer,
  experience_max  integer,
  pay_rate        varchar(20)  NOT NULL DEFAULT 'yearly',
  currency        varchar(10)  NOT NULL DEFAULT 'INR',
  p25             integer      NOT NULL,
  p50             integer      NOT NULL,
  p75             integer      NOT NULL,
  source          varchar(150) NOT NULL,
  effective_from  timestamp,
  created_at      timestamp    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_lookup
  ON salary_benchmarks (role_family, city, experience_min);
