import json
import logging
from app.db import (
    fetch_user_profile,
    fetch_active_jobs,
    insert_job_recommendations,
)
from app.exceptions import ExternalServiceError
from app.parser.llm import invoke_llm

logger = logging.getLogger(__name__)

# Jobs handed to the LLM. The DB pre-filter decides what is relevant; this is
# the size of the shortlist the model re-ranks.
JOB_POOL_SIZE = 30
MAX_RECOMMENDATIONS = 10

# Minimum score to show a job. A weak match is worse than one fewer result.
MIN_SCORE_THRESHOLD = 25


def recommend_jobs(user_id: str = None, skills: list[str] = None,
                   experience_years: float = None, location: str = None,
                   save_to_db: bool = False) -> dict:
    """Get job recommendations for a user or skill set.

    Returns {"recommendations": [...], "source": "matched" | "recent"}.

    `source` tells the caller what it is looking at. "matched" means the jobs
    share skills with the candidate. "recent" means nothing matched and these
    are simply recent openings — the UI must say so rather than presenting
    them as recommendations.
    """

    # Build candidate profile + collect filter skills
    filter_skills = list(skills) if skills else []
    filter_location = location
    filter_experience = experience_years

    if user_id:
        profile = fetch_user_profile(user_id)
        if not profile:
            return {"recommendations": [], "source": "matched"}
        # Merge profile skills with explicit filter skills
        profile_skills = [s["name"] for s in profile.get("skills", [])]
        # Skills named on the candidate's work history count too — job posts
        # often list tools the candidate never added to their skills section.
        for exp in profile.get("experience", []):
            profile_skills.extend(_split_skills_used(exp.get("skills_used")))
        all_skills = list(dict.fromkeys(filter_skills + profile_skills))  # dedupe, filter first
        filter_location = filter_location or profile.get("city")
        filter_experience = filter_experience or profile.get("total_experience_years")
        candidate_info = _format_profile(profile, filter_skills)
    else:
        all_skills = filter_skills
        candidate_info = _format_manual(filter_skills, filter_experience, filter_location)

    # Employers type job skills by hand, so the stored spelling rarely equals
    # the candidate's ("React" vs "ReactJS" vs "react.js"). Expanding the
    # candidate's list to the common variants lets the cheap `&&` array overlap
    # keep working instead of silently matching nothing.
    match_skills = _expand_skill_variants(all_skills)

    jobs = fetch_active_jobs(
        skills=match_skills or None,
        location=None,  # don't filter by location in DB — let LLM consider it as preference
        experience_years=filter_experience,
        exclude_user_id=user_id,
        limit=JOB_POOL_SIZE,
    )

    # Nothing shares a skill with this candidate. The old code silently swapped
    # in the 50 newest jobs and presented them as recommendations. Return recent
    # jobs too — an empty dashboard is a poor experience — but label them
    # "recent" so the UI can be honest about what they are.
    if not jobs:
        logger.info("No skill-matching jobs for user=%s — returning recent jobs", user_id)
        recent = fetch_active_jobs(
            experience_years=filter_experience,
            exclude_user_id=user_id,
            limit=MAX_RECOMMENDATIONS,
        )
        return {
            "recommendations": _plain_listings(recent, "Recent opening"),
            "source": "recent",
        }

    recommendations = _rerank(candidate_info, jobs, filter_skills, filter_location)

    # Only genuine matches are persisted. "recent" results are not
    # recommendations and must not be stored or reused as such.
    if save_to_db and user_id and recommendations:
        insert_job_recommendations(user_id, recommendations)

    return {"recommendations": recommendations, "source": "matched"}


def _rerank(candidate_info: str, jobs: list[dict], filter_skills: list[str],
            filter_location: str) -> list[dict]:
    """LLM ranks the shortlist. Falls back to DB order if the LLM is unusable."""
    jobs_text = _format_jobs(jobs)
    prompt = _build_prompt(candidate_info, jobs_text, filter_skills, filter_location)

    try:
        # priority="interactive": a user is waiting on this. The parse pool can
        # queue for minutes behind resume jobs, well past the caller's timeout.
        response = invoke_llm(prompt, max_tokens=2048, temperature=0.1,
                              priority="interactive")
    except ExternalServiceError as e:
        logger.warning("LLM re-rank unavailable (%s) — using deterministic order", e)
        return _deterministic_recommendations(jobs)

    recommendations = _parse_recommendations(response, jobs)
    if not recommendations:
        logger.warning("LLM re-rank returned nothing usable — using deterministic order")
        return _deterministic_recommendations(jobs)

    return recommendations


def _deterministic_recommendations(jobs: list[dict]) -> list[dict]:
    """Recommendations without the LLM — DB order, generic reason.

    These jobs already passed the skill overlap filter, so they are relevant;
    they just are not ranked or explained as well as the LLM would.
    """
    return _plain_listings(jobs, "Matches skills on your profile",
                           score=MIN_SCORE_THRESHOLD)


def _plain_listings(jobs: list[dict], reason: str, score: int = 0) -> list[dict]:
    """Shape rows into the response contract without ranking them."""
    return [
        {
            "job_id": str(job["id"]),
            "score": score,
            "reason": reason,
            "title": job.get("title", ""),
            "company": job.get("company_name", ""),
            "location": job.get("location", ""),
            "skills": job.get("skills") or [],
        }
        for job in jobs[:MAX_RECOMMENDATIONS]
    ]


def _split_skills_used(value) -> list[str]:
    """work_experiences.skills_used is a free-text comma list."""
    if not value:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [part.strip() for part in str(value).split(",") if part.strip()]


# Suffixes employers add to the same technology. "React" is stored as "ReactJS",
# "React.js", "React JS" — all of which miss a plain `&&` overlap on "React".
_SKILL_SUFFIXES = ("js", ".js", " js", "js developer", " development")


def _expand_skill_variants(skills: list[str]) -> list[str]:
    """Expand each skill into the spellings employers commonly type.

    Expansion happens here rather than in SQL so the query keeps using the
    cheap `&&` array-overlap operator instead of normalizing every job row.
    """
    out: list[str] = []
    seen: set[str] = set()

    def add(value: str):
        # Exact dedupe only: the DB compares with `&&`, which is case-sensitive,
        # so "react" and "React" are both worth sending.
        value = value.strip()
        if value and value not in seen:
            seen.add(value)
            out.append(value)

    for skill in skills or []:
        raw = str(skill).strip()
        if not raw:
            continue

        add(raw)
        add(raw.lower())
        add(raw.title())

        # Strip a trailing variant suffix so "ReactJS" also matches "React"
        low = raw.lower()
        base = raw
        for suffix in _SKILL_SUFFIXES:
            if low.endswith(suffix) and len(low) > len(suffix) + 1:
                base = raw[: -len(suffix)].strip(" .-")
                add(base)
                add(base.lower())
                break

        # ...and add the suffixed spellings of the base form. Only for single
        # alphabetic tokens — "Machine LearningJS" and "C++JS" are noise that
        # would never match anything.
        if len(base) >= 3 and base.isalpha():
            for suffix in ("JS", "js", ".js", " JS"):
                add(f"{base}{suffix}")
                add(f"{base.lower()}{suffix.lower()}")

        # Punctuation variants: "Node.js" <-> "Nodejs", "C++"/"CPP" stay as-is
        if "." in raw:
            add(raw.replace(".", ""))
        if " " in raw:
            add(raw.replace(" ", ""))
            add(raw.replace(" ", "-"))
        if "-" in raw:
            add(raw.replace("-", " "))
            add(raw.replace("-", ""))

    # Guard the query size — a huge ANY() array is its own performance problem.
    return out[:200]


def _format_profile(profile: dict, extra_filter_skills: list[str] = None) -> str:
    skills_list = [s["name"] for s in profile.get("skills", [])]
    proficiency_detail = []
    for s in profile.get("skills", []):
        proficiency_detail.append(f"  - {s['name']} ({s.get('proficiency_level', 'N/A')}, {s.get('years_of_experience', '?')} yrs)")

    text = f"""Name: {profile.get('first_name', '')} {profile.get('last_name', '')}
Headline: {profile.get('headline', 'N/A')}
Experience: {profile.get('total_experience_years', 'N/A')} years
Location: {profile.get('city', '')}, {profile.get('state', '')}
Skills (with proficiency):
{chr(10).join(proficiency_detail) if proficiency_detail else '  Not specified'}
Summary: {profile.get('professional_summary', 'N/A')}"""

    if extra_filter_skills:
        text += f"\n\nAdditional filter preference — candidate specifically wants jobs requiring: {', '.join(extra_filter_skills)}"

    return text


def _format_manual(skills: list[str], experience_years: float, location: str) -> str:
    return f"""Skills: {', '.join(skills) if skills else 'Not specified'}
Experience: {experience_years or 'N/A'} years
Location preference: {location or 'Not specified'}"""


def _format_jobs(jobs: list[dict]) -> str:
    lines = []
    for j in jobs:
        skills = ", ".join(j["skills"]) if j.get("skills") else "N/A"
        salary = ""
        if j.get("salary_min") and j.get("salary_max"):
            salary = f" | Salary: {j['salary_min']}-{j['salary_max']}"
        lines.append(
            f"ID: {j['id']} | {j['title']} at {j.get('company_name', 'N/A')} | "
            f"Location: {j.get('location', 'N/A')} | Exp: {j.get('experience_level', 'N/A')} "
            f"({j.get('experience_min', '?')}-{j.get('experience_max', '?')} yrs) | "
            f"Skills: {skills}{salary}"
        )
    return "\n".join(lines)


def _build_prompt(candidate_info: str, jobs_text: str,
                  filter_skills: list[str] = None, filter_location: str = None) -> str:
    priority_note = ""
    if filter_skills:
        priority_note += f"\n- PRIORITY: Candidate specifically requested jobs matching these skills: {', '.join(filter_skills)}. Give these skills HIGHEST weight in scoring."
    if filter_location:
        priority_note += f"\n- LOCATION PREFERENCE: Candidate prefers jobs in/near: {filter_location}. Give location match a bonus."

    return f"""You are ranking a shortlist of jobs for one candidate.

The jobs below already share at least one skill with the candidate. Order them
by true relevance and drop any that do not genuinely suit the candidate.

## Candidate Profile
{candidate_info}

## Shortlisted Jobs
{jobs_text}

## Judging Rules
1. SKILL MATCH (60% weight): only count skills the candidate actually has. A JavaScript/React developer does NOT match Python/ML/TensorFlow roles.
2. EXPERIENCE FIT (20% weight): does the candidate's experience fall in the job's range?
3. LOCATION (10% weight): same city/state, or remote, counts as a match.
4. ROLE RELEVANCE (10% weight): does the title align with the candidate's headline and past titles?{priority_note}

## STRICT Rules
- Score 0-100 where 100 = perfect match
- A single shared skill is not a match. A job needs real overlap in skills AND role to score well.
- Do NOT invent skill matches. Only cite skills listed on both the candidate and the job.
- Use ONLY the job IDs listed above. Never invent an ID.
- Return AT MOST {MAX_RECOMMENDATIONS} jobs, sorted by score descending.
- Returning fewer is correct when few jobs genuinely fit. Never pad the list.
- Omit any job you would score below {MIN_SCORE_THRESHOLD}.

## Output Format
Return ONLY a JSON array, no explanation:
[
  {{"job_id": "uuid", "score": 85, "reason": "5/6 skills match (JavaScript, React, Node.js, TypeScript, Redux). Experience fits. Location match."}},
  ...
]"""


def _parse_recommendations(text: str, jobs: list[dict]) -> list[dict]:
    """Parse LLM recommendation response."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    start = cleaned.find("[")
    end = cleaned.rfind("]") + 1
    if start == -1 or end == 0:
        logger.warning("No JSON array in recommendation response: %.200s...", text)
        return []

    try:
        recs = json.loads(cleaned[start:end])
    except json.JSONDecodeError as e:
        logger.warning("Failed to parse recommendation JSON: %s", e)
        return []

    jobs_by_id = {str(j["id"]): j for j in jobs}
    enriched = []
    for rec in recs[:MAX_RECOMMENDATIONS]:
        job_id = str(rec.get("job_id", ""))
        job = jobs_by_id.get(job_id)
        if not job:
            continue

        raw_score = rec.get("score", 0)
        try:
            score = int(float(raw_score))
        except (ValueError, TypeError):
            logger.warning("Invalid score '%s' for job %s, defaulting to 0", raw_score, job_id)
            score = 0
        score = min(100, max(0, score))

        # The prompt asks the model to omit weak matches; enforce it here too.
        if score < MIN_SCORE_THRESHOLD:
            continue

        enriched.append({
            "job_id": job_id,
            "score": score,
            "reason": str(rec.get("reason", "")),
            "title": job.get("title", ""),
            "company": job.get("company_name", ""),
            "location": job.get("location", ""),
            "skills": job.get("skills", []),
        })

    return sorted(enriched, key=lambda x: x["score"], reverse=True)
