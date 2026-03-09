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


def fetch_active_jobs(skills: list[str] = None, location: str = None,
                      experience_years: float = None, limit: int = 50) -> list[dict]:
    """Fetch active jobs, optionally pre-filtered by skills/location/experience."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            conditions = ["j.is_active = true", "j.status = 'active'"]
            params = []

            if skills:
                conditions.append("j.skills && %s::text[]")
                params.append(skills)

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
                json.dumps(parsed_data.get("personal", {})),
                json.dumps(parsed_data.get("experience", [])),
                json.dumps(parsed_data.get("education", [])),
                json.dumps(parsed_data.get("skills", [])),
                json.dumps(parsed_data.get("certifications", [])),
                json.dumps(parsed_data),
                raw_text,
                json.dumps(parsed_data),
            ))
