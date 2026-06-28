import json
import logging
from app.db import fetch_user_profile, fetch_active_jobs, insert_job_recommendations
from app.parser.llm import invoke_llm

logger = logging.getLogger(__name__)


def recommend_jobs(user_id: str = None, skills: list[str] = None,
                   experience_years: float = None, location: str = None,
                   save_to_db: bool = False) -> list[dict]:
    """Get job recommendations for a user or skill set."""

    # Build candidate profile + collect filter skills
    filter_skills = list(skills) if skills else []
    filter_location = location
    filter_experience = experience_years

    if user_id:
        profile = fetch_user_profile(user_id)
        if not profile:
            return []
        # Merge profile skills with explicit filter skills
        profile_skills = [s["name"] for s in profile.get("skills", [])]
        all_skills = list(dict.fromkeys(filter_skills + profile_skills))  # dedupe, filter first
        filter_location = filter_location or profile.get("city")
        filter_experience = filter_experience or profile.get("total_experience_years")
        candidate_info = _format_profile(profile, filter_skills)
    else:
        all_skills = filter_skills
        candidate_info = _format_manual(filter_skills, filter_experience, filter_location)

    # Pre-filter jobs in DB by skills overlap
    jobs = fetch_active_jobs(
        skills=all_skills if all_skills else None,
        location=None,  # don't filter by location in DB — let LLM consider it as preference
        experience_years=filter_experience,
        limit=50,
    )

    # Fallback: if pre-filter too restrictive, fetch without skill filter
    if len(jobs) < 10:
        jobs = fetch_active_jobs(limit=50)

    if not jobs:
        return []

    jobs_text = _format_jobs(jobs)
    prompt = _build_prompt(candidate_info, jobs_text, filter_skills, filter_location)

    response = invoke_llm(prompt, max_tokens=2048, temperature=0.1)
    recommendations = _parse_recommendations(response, jobs)

    if save_to_db and user_id and recommendations:
        insert_job_recommendations(user_id, recommendations)

    return recommendations


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

    return f"""You are a job recommendation engine. Match the candidate to the most relevant jobs.

## Candidate Profile
{candidate_info}

## Available Jobs
{jobs_text}

## Scoring Rules
1. SKILL MATCH (60% weight): Count how many of the candidate's skills match the job's required skills. Only count EXACT skill matches. A candidate with JavaScript, React, Node.js should NOT match Python/ML/TensorFlow jobs.
2. EXPERIENCE FIT (20% weight): Does the candidate's years of experience fall within the job's required range?
3. LOCATION (10% weight): Is the job in or near the candidate's city/state? Remote jobs get full location score.
4. ROLE RELEVANCE (10% weight): Does the job title/description align with the candidate's headline and summary?{priority_note}

## STRICT Rules
- Score 0-100 where 100 = perfect match
- A job requiring Python/ML/TensorFlow should score BELOW 30 for a JavaScript/React developer
- At least 50% of job's required skills must match candidate's skills for score > 60
- Do NOT hallucinate skill matches — only count skills the candidate actually has
- Return top 10 jobs sorted by score descending

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
    for rec in recs[:10]:
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
