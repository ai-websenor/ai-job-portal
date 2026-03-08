import json
import logging
import threading
import time
import redis
from app.config import settings
from app.db import fetch_job_with_company, fetch_user_profile
from app.parser.sagemaker import invoke_llm

logger = logging.getLogger(__name__)

MAX_HISTORY = 20
SESSION_TTL = 3600
MAX_SESSIONS = 10000

# Valkey/Redis client (lazy init)
_redis_client = None
_redis_available = None

# In-memory fallback
_sessions: dict[str, dict] = {}
_sessions_lock = threading.Lock()


def _get_redis():
    """Get Redis/Valkey client. Returns None if unavailable."""
    global _redis_client, _redis_available

    if _redis_available is False:
        return None
    if _redis_client is not None:
        return _redis_client

    if not settings.valkey_url:
        _redis_available = False
        logger.info("No VALKEY_URL configured, using in-memory sessions")
        return None

    try:
        _redis_client = redis.from_url(settings.valkey_url, decode_responses=True, socket_timeout=2)
        _redis_client.ping()
        _redis_available = True
        logger.info("Connected to Valkey session store")
        return _redis_client
    except Exception as e:
        logger.warning("Valkey unavailable, falling back to in-memory: %s", e)
        _redis_available = False
        return None


def _get_history(session_id: str) -> list[dict]:
    """Get chat history from Valkey or in-memory."""
    r = _get_redis()
    if r:
        try:
            data = r.get(f"chat:{session_id}")
            return json.loads(data) if data else []
        except Exception as e:
            logger.warning("Valkey read failed, using in-memory: %s", e)

    with _sessions_lock:
        session = _sessions.get(session_id)
        return session["messages"] if session else []


def _save_history(session_id: str, history: list[dict]):
    """Save chat history to Valkey or in-memory."""
    r = _get_redis()
    if r:
        try:
            r.setex(f"chat:{session_id}", SESSION_TTL, json.dumps(history[-MAX_HISTORY:]))
            return
        except Exception as e:
            logger.warning("Valkey write failed, using in-memory: %s", e)

    with _sessions_lock:
        _cleanup_sessions()
        if len(_sessions) >= MAX_SESSIONS and session_id not in _sessions:
            logger.warning("Max in-memory sessions reached (%d)", MAX_SESSIONS)
            return
        _sessions[session_id] = {"messages": history[-MAX_HISTORY:], "last_access": time.time()}


def _cleanup_sessions():
    """Remove expired in-memory sessions. Called inside lock."""
    now = time.time()
    expired = [sid for sid, data in _sessions.items() if now - data["last_access"] > SESSION_TTL]
    for sid in expired:
        del _sessions[sid]


def chat(job_id: str, message: str, session_id: str, user_id: str = None) -> str:
    """Handle a chat message about a specific job listing."""
    job = fetch_job_with_company(job_id)
    if not job:
        return "Sorry, I couldn't find that job listing."

    profile = None
    if user_id:
        profile = fetch_user_profile(user_id)

    system_prompt = _build_system_prompt(job, profile)
    history = _get_history(session_id)

    conversation = system_prompt + "\n\n"
    for msg in history[-MAX_HISTORY:]:
        if msg["role"] == "user":
            conversation += f"Candidate: {msg['content']}\n"
        else:
            conversation += f"Assistant: {msg['content']}\n"
    conversation += f"Candidate: {message}\nAssistant:"

    response = invoke_llm(conversation, max_tokens=1024, temperature=0.3)
    response = response.strip()

    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": response})
    _save_history(session_id, history)

    return response


def _build_system_prompt(job: dict, profile: dict = None) -> str:
    company_name = job.get("company_name") or "the hiring company"
    company_desc = job.get("company_description") or ""
    culture = job.get("culture") or ""
    benefits = job.get("company_benefits") or ""
    skills = ", ".join(job.get("skills") or []) if job.get("skills") else "Not specified"
    work_mode = ", ".join(job.get("work_mode") or []) if job.get("work_mode") else "Not specified"

    salary_info = ""
    if job.get("salary_min") and job.get("salary_max"):
        salary_info = f"Salary range: {job['salary_min']} - {job['salary_max']}"

    # Personalized or generic intro
    if profile:
        first_name = profile.get("first_name", "")
        intro = (
            f"You are a helpful job assistant for {company_name}. "
            f"{first_name} is viewing this job listing. "
            f"Personalize your responses — address them by first name, "
            f"relate their skills and experience to the job requirements. "
            f"Proactively highlight where their background is a strong match and where there might be gaps. "
            f"Answer based ONLY on the information provided below."
        )
    else:
        intro = (
            f"You are a helpful job assistant for {company_name}. "
            f"A candidate is viewing a job listing and has questions about it. "
            f"Answer based ONLY on the information provided below. "
            f"If the answer is not in the provided info, say you don't have that information."
        )

    # Candidate profile section
    candidate_section = ""
    if profile:
        skill_lines = []
        for s in profile.get("skills", []):
            skill_lines.append(
                f"  - {s['name']} ({s.get('proficiency_level', 'N/A')}, "
                f"{s.get('years_of_experience', '?')} yrs)"
            )
        candidate_section = f"""

## Candidate Profile
- Name: {profile.get('first_name', '')} {profile.get('last_name', '')}
- Headline: {profile.get('headline', 'N/A')}
- Experience: {profile.get('total_experience_years', 'N/A')} years
- Location: {profile.get('city', '')}, {profile.get('state', '')}
- Skills:
{chr(10).join(skill_lines) if skill_lines else '  Not specified'}
- Summary: {profile.get('professional_summary', 'N/A')}"""

    return f"""{intro}

## Job Details
- Title: {job.get('title', 'N/A')}
- Location: {job.get('location', 'N/A')} ({job.get('city', '')}, {job.get('state', '')})
- Job Type: {job.get('job_type', 'N/A')}
- Work Mode: {work_mode}
- Experience: {job.get('experience_level', 'N/A')} ({job.get('experience_min', '?')}-{job.get('experience_max', '?')} years)
- Required Skills: {skills}
- {salary_info}

## Job Description
{job.get('description', 'No description available.')}{candidate_section}

## About {company_name}
{company_desc}
{f'Culture: {culture}' if culture else ''}
{f'Benefits: {benefits}' if benefits else ''}
{f'Industry: {job.get("industry", "")}' if job.get("industry") else ''}
{f'Size: {job.get("company_size", "")}' if job.get("company_size") else ''}
{f'HQ: {job.get("headquarters", "")}' if job.get("headquarters") else ''}

Be concise, professional, and helpful. If the candidate asks about application process, suggest they apply through the platform."""
