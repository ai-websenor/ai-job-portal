import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from app.config import settings


@contextmanager
def get_db():
    """Get a database connection with RealDictCursor (returns dicts)."""
    conn = psycopg2.connect(settings.database_url)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
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


def fetch_active_jobs() -> list[dict]:
    """Fetch all active jobs with company names."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT j.id, j.title, j.description, j.skills, j.location, j.city, j.state,
                       j.experience_level, j.experience_min, j.experience_max,
                       j.salary_min, j.salary_max, j.job_type, j.work_mode,
                       c.name as company_name, c.industry
                FROM jobs j
                LEFT JOIN companies c ON j.company_id = c.id
                WHERE j.is_active = true AND j.status = 'active'
                ORDER BY j.created_at DESC
            """)
            return cur.fetchall()


def fetch_user_profile(user_id: str) -> dict | None:
    """Fetch user profile with skills."""
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

            cur.execute("""
                SELECT s.name, ps.proficiency_level, ps.years_of_experience
                FROM profile_skills ps
                JOIN skills s ON ps.skill_id = s.id
                WHERE ps.profile_id = %s
            """, (profile["id"],))
            profile["skills"] = cur.fetchall()
            return profile


def insert_job_recommendations(user_id: str, recommendations: list[dict]):
    """Insert job recommendations for a user."""
    with get_db() as conn:
        with conn.cursor() as cur:
            for rec in recommendations:
                cur.execute("""
                    INSERT INTO job_recommendations (user_id, job_id, score, reason)
                    VALUES (%s, %s, %s, %s)
                """, (user_id, rec["job_id"], rec["score"], rec.get("reason", "")))


def insert_parsed_resume(user_id: str, resume_id: str, parsed_data: dict, raw_text: str):
    """Insert parsed resume data into DB."""
    import json
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
                json.dumps(parsed_data),  # full data as confidence_scores
                raw_text,
                json.dumps(parsed_data),  # full structured output
            ))
