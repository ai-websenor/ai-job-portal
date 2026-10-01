import json
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from app.config import settings
from app.exceptions import DatabaseError

logger = logging.getLogger(__name__)

DB_CONNECT_TIMEOUT = 5
DB_STATEMENT_TIMEOUT = 30000  # 30s


@contextmanager
def get_db():
    """Get DB connection with timeout. Wraps psycopg2 errors → DatabaseError."""
    try:
        conn = psycopg2.connect(
            settings.database_url,
            connect_timeout=DB_CONNECT_TIMEOUT,
            options=f"-c statement_timeout={DB_STATEMENT_TIMEOUT}",
        )
    except psycopg2.OperationalError as e:
        logger.error("DB connection failed: %s", e)
        raise DatabaseError("Database unavailable") from e

    try:
        yield conn
        conn.commit()
    except psycopg2.OperationalError as e:
        conn.rollback()
        logger.error("DB operation failed: %s", e)
        raise DatabaseError("Database operation failed") from e
    except psycopg2.IntegrityError as e:
        conn.rollback()
        logger.warning("DB constraint violation: %s", e)
        raise DatabaseError("Data conflict") from e
    except psycopg2.Error as e:
        conn.rollback()
        logger.error("DB error: %s", e)
        raise DatabaseError("Database error") from e
    finally:
        conn.close()


def fetch_job_with_company(job_id: str) -> dict | None:
    """Fetch job details with company info."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT j.*, c.name as company_name, c.industry, c.description as company_description,
                       c.culture, c.benefits as company_benefits, c.website as company_website,
                       c.company_size, c.headquarters
                FROM jobs j
                LEFT JOIN companies c ON j.company_id = c.id
                WHERE j.id = %s
            """, (job_id,))
            return cur.fetchone()


def fetch_job_for_chat(job_id: str) -> dict | None:
    """Fetch exactly the job and company fields the chatbot is allowed to use.

    Deliberately not `SELECT j.*`: the chatbot renders whatever it receives into
    the prompt, so the column list here is the access-control boundary. It also
    carries fields the old chat context dropped on the floor — qualification,
    certification, job-level benefits, travel, deadline, status — which is why
    the bot used to claim it had no information that was sitting in the row.

    `show_salary` is returned so the caller can honour the employer's choice to
    keep the range private; salary columns are populated regardless of it.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT j.id, j.title, j.description, j.skills,
                       j.job_type, j.employment_type, j.engagement_type, j.work_mode,
                       j.experience_level, j.experience_min, j.experience_max,
                       j.location, j.city, j.state, j.country,
                       j.salary_min, j.salary_max, j.show_salary, j.pay_rate,
                       j.qualification, j.certification, j.benefits AS job_benefits,
                       j.travel_requirements, j.immigration_status,
                       j.deadline, j.is_active, j.status, j.is_urgent,
                       j.application_count, j.created_at,
                       c.name AS company_name, c.industry, c.tagline,
                       c.description AS company_description, c.mission, c.culture,
                       c.benefits AS company_benefits, c.website AS company_website,
                       c.company_size, c.company_type, c.year_established,
                       c.headquarters, c.is_verified AS company_verified,
                       cat.name AS category_name, sub.name AS sub_category_name
                FROM jobs j
                LEFT JOIN companies c ON j.company_id = c.id
                LEFT JOIN job_categories cat ON j.category_id = cat.id
                LEFT JOIN job_categories sub ON j.sub_category_id = sub.id
                WHERE j.id = %s
            """, (job_id,))
            return cur.fetchone()


def fetch_job_screening_topics(job_id: str) -> list[str]:
    """Question text of the job's screening questions, for 'what will they ask me'.

    Missing table is tolerated: screening questions are optional context, and a
    schema drift here must not take the whole chat turn down with it.
    """
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT question FROM screening_questions
                    WHERE job_id = %s ORDER BY "order" NULLS LAST LIMIT 10
                """, (job_id,))
                return [r["question"] for r in cur.fetchall() if r.get("question")]
    except DatabaseError:
        logger.info("Screening questions unavailable for job %s", job_id)
        return []


def fetch_active_jobs(skills: list[str] = None, location: str = None,
                      experience_years: float = None, limit: int = 50,
                      exclude_user_id: str = None) -> list[dict]:
    """Fetch active jobs, optionally pre-filtered by skills/location/experience.

    `exclude_user_id` drops jobs the candidate already applied to or saved, so
    they do not take up recommendation slots.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Expired jobs used to reach the caller and get filtered out later,
            # silently shrinking a top-10 into a top-3.
            conditions = [
                "j.is_active = true",
                "j.status = 'active'",
                "(j.deadline IS NULL OR j.deadline >= NOW())",
            ]
            params = []

            if exclude_user_id:
                conditions.append("""
                    NOT EXISTS (
                        SELECT 1 FROM job_applications a
                        WHERE a.job_id = j.id AND a.job_seeker_id = %s::uuid
                    )
                    AND NOT EXISTS (
                        SELECT 1 FROM saved_jobs sj
                        WHERE sj.job_id = j.id AND sj.job_seeker_id = %s::uuid
                    )
                """)
                params.extend([exclude_user_id, exclude_user_id])

            if skills:
                # Fast path: whole-element overlap, which covers the common case
                # where the employer picked the skill from the same master list.
                #
                # Slow path: employers also type compound entries as a single
                # value — "Git & GitHub", "Angular & Node.js", "Redux / Zustand".
                # Those never equal a candidate skill, so they match nothing at
                # all without splitting them apart first.
                #
                # COST: the second branch is evaluated per row and cannot use an
                # index. Harmless while the jobs table is small; when it grows,
                # this needs the same index work as fetch_scored_jobs.
                conditions.append("""(
                    j.skills && %s::text[]
                    OR EXISTS (
                        SELECT 1
                        FROM unnest(COALESCE(j.skills, '{}'::text[])) AS js,
                             regexp_split_to_table(js, '\\s*[&/,]\\s*') AS part
                        WHERE btrim(lower(part)) <> ''
                          AND btrim(lower(part)) = ANY(%s::text[])
                    )
                )""")
                params.append(skills)
                params.append([s.lower() for s in skills])

            if location:
                conditions.append("(j.city ILIKE %s OR j.state ILIKE %s OR j.location ILIKE %s)")
                loc_pattern = f"%{location}%"
                params.extend([loc_pattern, loc_pattern, loc_pattern])

            if experience_years is not None:
                conditions.append(
                    "(j.experience_min IS NULL OR j.experience_min <= %s) AND "
                    "(j.experience_max IS NULL OR j.experience_max >= %s)"
                )
                params.extend([experience_years + 2, max(0, experience_years - 2)])

            where = " AND ".join(conditions)
            params.append(limit)

            cur.execute(f"""
                SELECT j.id, j.title, j.description, j.skills, j.location, j.city, j.state,
                       j.experience_level, j.experience_min, j.experience_max,
                       j.salary_min, j.salary_max, j.job_type, j.work_mode,
                       c.name as company_name, c.industry
                FROM jobs j
                LEFT JOIN companies c ON j.company_id = c.id
                WHERE {where}
                ORDER BY j.created_at DESC
                LIMIT %s
            """, params)
            return cur.fetchall()


def fetch_user_profile(user_id: str) -> dict | None:
    """Fetch user profile with skills, education, experience, certs, projects, languages."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT p.*, u.email as user_email
                FROM profiles p
                JOIN users u ON p.user_id = u.id
                WHERE p.user_id = %s
            """, (user_id,))
            profile = cur.fetchone()
            if not profile:
                return None

            pid = profile["id"]

            cur.execute("""
                SELECT s.name, ps.proficiency_level, ps.years_of_experience
                FROM profile_skills ps
                JOIN skills s ON ps.skill_id = s.id
                WHERE ps.profile_id = %s
            """, (pid,))
            profile["skills"] = cur.fetchall()

            cur.execute("""
                SELECT institution, degree, field_of_study, start_date, end_date,
                       currently_studying, grade
                FROM education_records WHERE profile_id = %s ORDER BY start_date DESC
            """, (pid,))
            profile["education"] = cur.fetchall()

            cur.execute("""
                SELECT company_name, job_title, designation, employment_type,
                       location, is_current, start_date, end_date,
                       description, achievements, skills_used
                FROM work_experiences WHERE profile_id = %s ORDER BY start_date DESC
            """, (pid,))
            profile["experience"] = cur.fetchall()

            cur.execute("""
                SELECT name, issuing_organization, issue_date, expiry_date, credential_url
                FROM certifications WHERE profile_id = %s ORDER BY issue_date DESC
            """, (pid,))
            profile["certifications"] = cur.fetchall()

            cur.execute("""
                SELECT title, description, url, start_date, end_date
                FROM profile_projects WHERE profile_id = %s ORDER BY start_date DESC
            """, (pid,))
            profile["projects"] = cur.fetchall()

            cur.execute("""
                SELECT l.name, pl.proficiency
                FROM profile_languages pl
                JOIN languages l ON pl.language_id = l.id
                WHERE pl.profile_id = %s
            """, (pid,))
            profile["languages"] = cur.fetchall()

            return profile


def fetch_scored_jobs(skills: list[str] = None, experience_years: float = None,
                      location: str = None, titles: list[str] = None,
                      exclude_user_id: str = None, limit: int = 30) -> list[dict]:
    """Fetch active jobs ranked by a deterministic relevance score.

    NOT WIRED IN YET — kept here as the next iteration of recommendation
    retrieval. Do not call from a request path until the following are done:

      1. Add a partial index for the scan:
         CREATE INDEX CONCURRENTLY idx_jobs_active_status
           ON jobs (is_active, status) WHERE is_active AND status = 'active';
      2. EXPLAIN ANALYZE against production-scale job counts. This scores every
         active job (no index can serve ORDER BY on a computed expression), so
         cost grows with the table — unlike the `&&` + LIMIT path in use today.
      3. Ideally a shadow run: compute alongside the live path, log both, serve
         the old one, and compare relevance and timings before switching.

    Skills are compared on a normalized form (lowercase, punctuation stripped)
    with a containment check either way, so "React"/"ReactJS"/"react.js" all
    match. Returns jobs ordered by score descending, each with `match_score`
    and `matched_skills` so callers can explain a match without an LLM.
    """
    norm_skills = _normalize_skill_list(skills)
    norm_titles = [t for t in (_normalize_text(t) for t in (titles or [])) if t]

    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            params: dict = {
                "skills": norm_skills or [""],
                "titles": norm_titles or [""],
                "exp": experience_years,
                "location": f"%{location}%" if location else None,
                "user_id": exclude_user_id,
                "limit": limit,
            }

            cur.execute("""
                WITH candidate AS (
                    SELECT %(skills)s::text[]  AS skills,
                           %(titles)s::text[]  AS titles
                ),
                scored AS (
                    SELECT j.id, j.title, j.description, j.skills, j.location,
                           j.city, j.state, j.experience_level,
                           j.experience_min, j.experience_max,
                           j.salary_min, j.salary_max, j.job_type, j.work_mode,
                           j.created_at,
                           c.name AS company_name, c.industry,
                           -- Skills on the job, normalized the same way as the candidate's
                           COALESCE((
                               SELECT array_agg(DISTINCT js.norm)
                               FROM (
                                   SELECT regexp_replace(lower(s), '[^a-z0-9]', '', 'g') AS norm
                                   FROM unnest(COALESCE(j.skills, '{}'::text[])) AS s
                               ) js
                               WHERE js.norm <> ''
                           ), '{}'::text[]) AS job_norm_skills
                    FROM jobs j
                    LEFT JOIN companies c ON j.company_id = c.id
                    WHERE j.is_active = true
                      AND j.status = 'active'
                      AND (j.deadline IS NULL OR j.deadline >= NOW())
                      AND (
                          %(user_id)s::uuid IS NULL
                          OR (
                              NOT EXISTS (
                                  SELECT 1 FROM job_applications a
                                  WHERE a.job_id = j.id AND a.job_seeker_id = %(user_id)s::uuid
                              )
                              AND NOT EXISTS (
                                  SELECT 1 FROM saved_jobs sj
                                  WHERE sj.job_id = j.id AND sj.job_seeker_id = %(user_id)s::uuid
                              )
                          )
                      )
                ),
                matched AS (
                    SELECT s.*,
                           COALESCE((
                               SELECT array_agg(DISTINCT js)
                               FROM unnest(s.job_norm_skills) AS js
                               WHERE EXISTS (
                                   SELECT 1 FROM unnest((SELECT skills FROM candidate)) AS cs
                                   WHERE cs <> ''
                                     AND (
                                         js = cs
                                         -- Substring matching only for tokens long
                                         -- enough to be meaningful: otherwise "r"
                                         -- matches "react" and "go" matches "django".
                                         OR (length(cs) >= 3 AND js LIKE '%%' || cs || '%%')
                                         OR (length(js) >= 3 AND cs LIKE '%%' || js || '%%')
                                     )
                               )
                           ), '{}'::text[]) AS matched_skills
                    FROM scored s
                )
                SELECT m.*,
                       (
                           -- Skill match (0-60): share of the job's required skills the candidate has
                           CASE
                               WHEN cardinality(m.job_norm_skills) = 0 THEN 0
                               ELSE LEAST(60, ROUND(
                                   60.0 * cardinality(m.matched_skills)
                                   / cardinality(m.job_norm_skills)
                               ))
                           END
                           -- Experience fit (0-20): inside the band, or near-miss within 2 years
                         + CASE
                               WHEN %(exp)s::numeric IS NULL THEN 10
                               WHEN (m.experience_min IS NULL OR m.experience_min <= %(exp)s::numeric)
                                AND (m.experience_max IS NULL OR m.experience_max >= %(exp)s::numeric)
                                   THEN 20
                               WHEN m.experience_min IS NOT NULL
                                AND m.experience_min - %(exp)s::numeric BETWEEN 0 AND 2
                                   THEN 8
                               ELSE 0
                           END
                           -- Location (0-10): remote always counts as a match
                         + CASE
                               WHEN 'remote' = ANY(SELECT lower(w) FROM unnest(COALESCE(m.work_mode, '{}'::text[])) AS w)
                                   THEN 10
                               WHEN %(location)s::text IS NULL THEN 5
                               WHEN m.city ILIKE %(location)s OR m.state ILIKE %(location)s
                                 OR m.location ILIKE %(location)s THEN 10
                               ELSE 0
                           END
                           -- Title/role affinity (0-10) against the candidate's current titles
                         + CASE
                               WHEN EXISTS (
                                   SELECT 1 FROM unnest((SELECT titles FROM candidate)) AS t
                                   WHERE t <> '' AND lower(m.title) LIKE '%%' || t || '%%'
                               ) THEN 10
                               ELSE 0
                           END
                       )::int AS match_score
                FROM matched m
                ORDER BY match_score DESC, m.created_at DESC
                LIMIT %(limit)s
            """, params)
            return cur.fetchall()


def _normalize_text(value: str) -> str:
    """Lowercase and collapse whitespace — used for title matching."""
    return " ".join(str(value or "").lower().split())


def _normalize_skill_list(skills: list[str] = None) -> list[str]:
    """Normalize skills to comparable keys: lowercase, alphanumerics only."""
    out = []
    for skill in skills or []:
        norm = "".join(ch for ch in str(skill).lower() if ch.isalnum())
        if norm and norm not in out:
            out.append(norm)
    return out


def insert_job_recommendations(user_id: str, recommendations: list[dict]):
    """Insert job recommendations. Skips recs missing required keys."""
    with get_db() as conn:
        with conn.cursor() as cur:
            for rec in recommendations:
                job_id = rec.get("job_id")
                if not job_id:
                    logger.warning("Skipping rec with missing job_id: %s", rec)
                    continue
                cur.execute("""
                    INSERT INTO job_recommendations (user_id, job_id, score, reason)
                    VALUES (%s, %s, %s, %s)
                """, (user_id, job_id, rec.get("score", 0), rec.get("reason", "")))


def search_jobs(query: str, limit: int = 10) -> list[dict]:
    """Search active jobs by title or company name."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            pattern = f"%{query}%"
            cur.execute("""
                SELECT j.id, j.title, c.name AS company_name, j.location
                FROM jobs j
                LEFT JOIN companies c ON j.company_id = c.id
                WHERE j.is_active = true AND j.status = 'active'
                  AND (j.title ILIKE %s OR c.name ILIKE %s)
                ORDER BY j.title
                LIMIT %s
            """, (pattern, pattern, limit))
            return cur.fetchall()


def search_users(query: str, limit: int = 10) -> list[dict]:
    """Search candidate users by name or email."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            pattern = f"%{query}%"
            cur.execute("""
                SELECT u.id,
                       COALESCE(p.first_name, u.first_name) AS first_name,
                       COALESCE(p.last_name, u.last_name) AS last_name,
                       u.email
                FROM users u
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE u.role = 'candidate'
                  AND (
                    u.first_name ILIKE %s OR u.last_name ILIKE %s
                    OR u.email ILIKE %s
                    OR p.first_name ILIKE %s OR p.last_name ILIKE %s
                    OR CONCAT(COALESCE(p.first_name, u.first_name), ' ',
                              COALESCE(p.last_name, u.last_name)) ILIKE %s
                  )
                ORDER BY u.first_name
                LIMIT %s
            """, (pattern, pattern, pattern, pattern, pattern, pattern, limit))
            return cur.fetchall()


def search_users_with_resume(query: str, limit: int = 10) -> list[dict]:
    """Search candidate users who have a resume S3 link."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            pattern = f"%{query}%"
            cur.execute("""
                SELECT u.id,
                       COALESCE(p.first_name, u.first_name) AS first_name,
                       COALESCE(p.last_name, u.last_name) AS last_name,
                       u.email,
                       r.id AS resume_id,
                       r.file_path,
                       r.file_name
                FROM users u
                JOIN profiles p ON p.user_id = u.id
                JOIN resumes r ON r.profile_id = p.id
                WHERE u.role = 'candidate'
                  AND r.file_path IS NOT NULL
                  AND (
                    u.first_name ILIKE %s OR u.last_name ILIKE %s
                    OR u.email ILIKE %s
                    OR p.first_name ILIKE %s OR p.last_name ILIKE %s
                    OR CONCAT(COALESCE(p.first_name, u.first_name), ' ',
                              COALESCE(p.last_name, u.last_name)) ILIKE %s
                  )
                ORDER BY r.created_at DESC
                LIMIT %s
            """, (pattern, pattern, pattern, pattern, pattern, pattern, limit))
            return cur.fetchall()


def insert_parsed_resume(user_id: str, resume_id: str, parsed_data: dict, raw_text: str):
    """Insert parsed resume data into DB."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO parsed_resume_data
                    (user_id, resume_id, personal_info, work_experiences, education,
                     skills, certifications, confidence_scores, raw_text, structured_data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id, resume_id,
                json.dumps(parsed_data.get("personalDetails", {})),
                json.dumps(parsed_data.get("experienceDetails", [])),
                json.dumps(parsed_data.get("educationalDetails", [])),
                json.dumps(parsed_data.get("skills", [])),
                json.dumps(parsed_data.get("certifications", [])),
                json.dumps(parsed_data),
                raw_text,
                json.dumps(parsed_data),
            ))


# ── Salary estimation ───────────────────────────
#
# Appended for the salary track. Both helpers read only; nothing in the salary
# feature writes to the database.


def fetch_salary_pool(limit: int = 400) -> list[dict]:
    """Every active job that carries a usable salary, as raw comparable rows.

    Deliberately unfiltered beyond "active and priced". The comparable ladder
    (title, city, experience, skill overlap) runs in Python because:

      * `jobs.city` is NULL on every row, so city has to be parsed out of the
        free-text `jobs.location` — not something to attempt in SQL;
      * skill matching must go through `app.common.skills`, which is the one
        shared definition of "the same skill" in this service;
      * the whole active-job table is a few dozen rows, so pulling the pool
        once and filtering it in memory is cheaper than six round trips.

    `limit` exists so this stays honest if the table grows by two orders of
    magnitude; it is `settings.salary_pool_size`.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT j.id, j.title, j.skills, j.location, j.state,
                       j.experience_min, j.experience_max,
                       j.salary_min, j.salary_max, j.pay_rate,
                       j.job_type, j.work_mode
                FROM jobs j
                WHERE j.is_active = true
                  AND j.status = 'active'
                  AND j.salary_min IS NOT NULL
                  AND j.salary_max IS NOT NULL
                  AND j.salary_min > 0
                  AND j.salary_max >= j.salary_min
                ORDER BY j.created_at DESC
                LIMIT %s
            """, (limit,))
            return cur.fetchall()


def fetch_salary_benchmarks(role_family: str, city: str | None = None) -> list[dict]:
    """Curated benchmark rows for a role family, city first then nationwide.

    The cold-start safety net for roles our own postings cannot price. Rows are
    admin-imported via `scripts/import_salary_benchmarks.py` and carry a
    `source`, so anything shown from here is attributable.

    A missing table is tolerated and returns no rows: the benchmark step is the
    last rung before "not enough data", and schema drift there must degrade to
    an honest empty answer rather than fail the request.
    """
    family = " ".join(str(role_family or "").strip().lower().split())
    if not family:
        return []

    normalised_city = " ".join(str(city or "").strip().lower().split()) or None

    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT role_family, city, experience_min, experience_max,
                           pay_rate, currency, p25, p50, p75, source, effective_from
                    FROM salary_benchmarks
                    WHERE lower(role_family) = %s
                      AND (
                          %s::text IS NULL
                          OR city IS NULL
                          OR lower(city) = %s::text
                      )
                    ORDER BY (city IS NULL), effective_from DESC NULLS LAST
                    LIMIT 50
                """, (family, normalised_city, normalised_city))
                return cur.fetchall()
    except DatabaseError:
        logger.info("salary_benchmarks unavailable for role_family=%s", family)
        return []


# ── Resume scoring ─────────────────────────────
#
# Appended for the resume-score feature. These four are the only database
# access the `app.resume_score` package has; everything above is untouched.


def fetch_default_resume(user_id: str) -> dict | None:
    """The resume a score should be measured against, with its parsed text.

    "Default, else most recently updated" mirrors what the profile page shows,
    so the candidate is never scored against a file they think they replaced.

    `raw_text` comes from `parsed_resume_data` and is frequently NULL: 189
    resumes exist but only 66 have been parsed. That is fine — the profile is
    the source of truth for scoring and the text is only used for the
    formatting checks, so the caller must cope with it being absent.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT r.id,
                       COALESCE(NULLIF(r.resume_name, ''), r.file_name) AS name,
                       r.updated_at,
                       d.raw_text
                FROM resumes r
                JOIN profiles p ON r.profile_id = p.id
                LEFT JOIN LATERAL (
                    SELECT raw_text
                    FROM parsed_resume_data prd
                    WHERE prd.resume_id = r.id AND prd.raw_text IS NOT NULL
                    ORDER BY prd.parsed_at DESC
                    LIMIT 1
                ) d ON TRUE
                WHERE p.user_id = %s
                ORDER BY r.is_default DESC NULLS LAST, r.updated_at DESC
                LIMIT 1
            """, (user_id,))
            return cur.fetchone()


def fetch_job_requirements(job_id: str) -> dict | None:
    """Just the columns a resume is scored against.

    Deliberately narrow rather than `SELECT j.*`: the scorer feeds some of this
    to the model when it rewrites the improvement wording, so the column list
    is the boundary of what can end up in a suggestion.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, title, skills, experience_min, experience_max,
                       qualification, certification
                FROM jobs
                WHERE id = %s
            """, (job_id,))
            return cur.fetchone()


def upsert_resume_analysis(resume_id: str, user_id: str, job_id: str | None,
                           columns: dict) -> None:
    """Write one analysis row, replacing any previous one for the same target.

    `resume_analysis` has two *partial* unique indexes — one on
    (resume_id, job_id) where job_id is not null, one on (resume_id) where it
    is null — because Postgres treats NULLs as distinct and a single index
    would let generic scores pile up without limit. ON CONFLICT has to name the
    matching predicate, so there are two statements here rather than one.
    """
    values = (
        resume_id, user_id, job_id,
        columns.get("overall_score"),
        columns.get("quality_score"),
        columns.get("quality_breakdown"),
        columns.get("ats_score"),
        columns.get("ats_issues"),
        columns.get("suggestions"),
        columns.get("keyword_matches"),
        columns.get("missing_keywords"),
        columns.get("improvements"),
        bool(columns.get("degraded")),
    )

    assignments = """
        job_id = EXCLUDED.job_id,
        user_id = EXCLUDED.user_id,
        overall_score = EXCLUDED.overall_score,
        quality_score = EXCLUDED.quality_score,
        quality_breakdown = EXCLUDED.quality_breakdown,
        ats_score = EXCLUDED.ats_score,
        ats_issues = EXCLUDED.ats_issues,
        suggestions = EXCLUDED.suggestions,
        keyword_matches = EXCLUDED.keyword_matches,
        missing_keywords = EXCLUDED.missing_keywords,
        improvements = EXCLUDED.improvements,
        degraded = EXCLUDED.degraded,
        analyzed_at = LOCALTIMESTAMP
    """

    conflict = (
        "(resume_id) WHERE job_id IS NULL" if job_id is None
        else "(resume_id, job_id) WHERE job_id IS NOT NULL"
    )

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(f"""
                INSERT INTO resume_analysis
                    (resume_id, user_id, job_id, overall_score, quality_score,
                     quality_breakdown, ats_score, ats_issues, suggestions,
                     keyword_matches, missing_keywords, improvements, degraded,
                     analyzed_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, LOCALTIMESTAMP)
                ON CONFLICT {conflict} DO UPDATE SET {assignments}
            """, values)


def fetch_resume_analysis(user_id: str, job_id: str | None = None) -> dict | None:
    """The stored analysis for this candidate and target, newest first.

    `age_seconds` comes back from the database rather than being worked out
    from the timestamp in Python: `analyzed_at` has no timezone, so comparing
    it against a local clock silently drifts by the server's UTC offset.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT *, EXTRACT(EPOCH FROM (LOCALTIMESTAMP - analyzed_at)) AS age_seconds
                FROM resume_analysis
                WHERE user_id = %s
                  AND ((%s::uuid IS NULL AND job_id IS NULL) OR job_id = %s::uuid)
                ORDER BY analyzed_at DESC
                LIMIT 1
            """, (user_id, job_id, job_id))
            return cur.fetchone()


# ---------------------------------------------------------------------------
# Employer-facing applicant scoring.
#
# Appended for `app.resume_score` in its employer mode; nothing above is
# touched. These are the only queries that decide whether an employer is
# allowed to see a candidate's score, so the rule lives in the WHERE clause of
# the statement that reads the data rather than in a Python check afterwards.
# A check that runs after the rows are already in memory is a check somebody
# can forget to call.
#
# An employer may score an applicant when BOTH hold:
#   * the job is theirs - `jobs.employer_id -> employers.id -> employers.user_id`
#     is the caller, or the caller is an employer at the same company
#     (`employers.company_id`), because team members share a company and all
#     work the same vacancies;
#   * the candidate actually applied - there is a `job_applications` row for
#     that candidate and that job. Nothing here ever takes a candidate id from
#     the caller; it always comes out of the application row.
# ---------------------------------------------------------------------------

# Joined into every query below. `owner` is whoever posted the job; the join
# is through a foreign key, so it cannot multiply rows.
_EMPLOYER_JOINS = """
    JOIN employers owner ON owner.id = j.employer_id
"""

# The caller. An EXISTS rather than a join, because one user account can hold
# more than one employer row and a join would then return the same application
# twice — quietly eating the caller's LIMIT. Same employer row, or same
# company as the job's owner or as the job itself. `IN` with a NULL on the
# right simply does not match, which is the behaviour wanted: an employer with
# no company shares a company with nobody.
_EMPLOYER_PREDICATE = """
    EXISTS (
        SELECT 1 FROM employers viewer
        WHERE viewer.user_id = %s
          AND (
              viewer.id = owner.id
              OR (
                  viewer.company_id IS NOT NULL
                  AND viewer.company_id IN (owner.company_id, j.company_id)
              )
          )
    )
"""


def employer_can_view_job(employer_user_id: str, job_id: str) -> bool:
    """True when this employer may see the applicants to this job."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(f"""
                SELECT 1
                FROM jobs j
                {_EMPLOYER_JOINS}
                WHERE j.id = %s::uuid
                  AND {_EMPLOYER_PREDICATE}
                LIMIT 1
            """, (job_id, employer_user_id))
            return cur.fetchone() is not None


def fetch_job_applicants_for_employer(employer_user_id: str, job_id: str,
                                      limit: int = 50) -> list[dict]:
    """Applicants to one job, newest first, for an employer entitled to them.

    Returns the application id and the candidate's `users.id`. An empty list
    means either no applicants or no entitlement; the caller asks
    `employer_can_view_job` first so it can tell those two apart.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"""
                SELECT a.id AS application_id,
                       a.job_seeker_id AS candidate_user_id
                FROM job_applications a
                JOIN jobs j ON j.id = a.job_id
                {_EMPLOYER_JOINS}
                WHERE a.job_id = %s::uuid
                  AND {_EMPLOYER_PREDICATE}
                ORDER BY a.applied_at DESC, a.id
                LIMIT %s
            """, (job_id, employer_user_id, int(limit)))
            return cur.fetchall()


def fetch_employer_application(employer_user_id: str,
                               application_id: str) -> dict | None:
    """One application, only if this employer is entitled to it.

    The application id carries the candidate and the job together, so the
    caller never supplies a user id and cannot score somebody who did not
    apply. `None` means not entitled OR no such application - deliberately the
    same answer, so a stranger cannot probe for valid ids. `application_exists`
    separates the two for the caller that already passed the check.
    """
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"""
                SELECT a.id AS application_id,
                       a.job_seeker_id AS candidate_user_id,
                       a.applied_at,
                       j.id AS job_id,
                       j.title AS job_title,
                       NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), '')
                           AS candidate_name
                FROM job_applications a
                JOIN jobs j ON j.id = a.job_id
                {_EMPLOYER_JOINS}
                LEFT JOIN profiles p ON p.user_id = a.job_seeker_id
                WHERE a.id = %s::uuid
                  AND {_EMPLOYER_PREDICATE}
                LIMIT 1
            """, (application_id, employer_user_id))
            return cur.fetchone()


def application_exists(application_id: str) -> bool:
    """Whether an application id is real at all.

    Used only to choose between "not found" and "not authorised" in the
    response, never to release any detail about the application.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM job_applications WHERE id = %s::uuid LIMIT 1",
                (application_id,),
            )
            return cur.fetchone() is not None
