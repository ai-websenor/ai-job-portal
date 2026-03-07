import json
from app.db import fetch_user_profile, fetch_active_jobs, insert_job_recommendations
from app.parser.sagemaker import invoke_llm


def recommend_jobs(user_id: str = None, skills: list[str] = None,
                   experience_years: float = None, location: str = None,
                   save_to_db: bool = False) -> list[dict]:
    """Get job recommendations for a user or skill set."""

    # Build candidate profile
    if user_id:
        profile = fetch_user_profile(user_id)
        if not profile:
            return []
        candidate_info = _format_profile(profile)
    else:
        candidate_info = _format_manual(skills or [], experience_years, location)

    # Get all active jobs
    jobs = fetch_active_jobs()
    if not jobs:
        return []

    jobs_text = _format_jobs(jobs)
    prompt = _build_prompt(candidate_info, jobs_text, [str(j["id"]) for j in jobs])

    response = invoke_llm(prompt, max_tokens=2048, temperature=0.1)
    recommendations = _parse_recommendations(response, jobs)

    # Write to DB if requested
    if save_to_db and user_id and recommendations:
        insert_job_recommendations(user_id, recommendations)

    return recommendations


def _format_profile(profile: dict) -> str:
    skills_list = [s["name"] for s in profile.get("skills", [])]
    return f"""Name: {profile.get('first_name', '')} {profile.get('last_name', '')}
Headline: {profile.get('headline', 'N/A')}
Experience: {profile.get('total_experience_years', 'N/A')} years
Location: {profile.get('city', '')}, {profile.get('state', '')}
Skills: {', '.join(skills_list) if skills_list else 'Not specified'}
Summary: {profile.get('professional_summary', 'N/A')}"""


def _format_manual(skills: list[str], experience_years: float, location: str) -> str:
    return f"""Skills: {', '.join(skills) if skills else 'Not specified'}
Experience: {experience_years or 'N/A'} years
Location: {location or 'Not specified'}"""


def _format_jobs(jobs: list[dict]) -> str:
    lines = []
    for j in jobs:
        skills = ", ".join(j["skills"]) if j.get("skills") else "N/A"
        salary = ""
        if j.get("salary_min") and j.get("salary_max"):
            salary = f" | Salary: {j['salary_min']}-{j['salary_max']}"
        lines.append(
            f"ID: {j['id']} | {j['title']} at {j.get('company_name', 'N/A')} | "
            f"Location: {j.get('location', 'N/A')} | Experience: {j.get('experience_level', 'N/A')} "
            f"({j.get('experience_min', '?')}-{j.get('experience_max', '?')} yrs) | "
            f"Skills: {skills}{salary}"
        )
    return "\n".join(lines)


def _build_prompt(candidate_info: str, jobs_text: str, job_ids: list[str]) -> str:
    return f"""You are a job recommendation engine. Match the candidate below to the most relevant jobs.

## Candidate Profile
{candidate_info}

## Available Jobs
{jobs_text}

## Instructions
1. Analyze the candidate's skills, experience, and location
2. Score each job on relevance (0-100) based on skill match, experience fit, and location
3. Return the top 10 most relevant jobs as a JSON array
4. Return ONLY valid JSON, no explanation

## Output Format
Return a JSON array:
```json
[
  {{"job_id": "uuid", "score": 85, "reason": "Strong skill match in Python and React"}},
  ...
]
```

Return ONLY the JSON array, nothing else. Sort by score descending."""


def _parse_recommendations(text: str, jobs: list[dict]) -> list[dict]:
    """Parse LLM recommendation response."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # Find JSON array
    start = cleaned.find("[")
    end = cleaned.rfind("]") + 1
    if start == -1 or end == 0:
        return []

    try:
        recs = json.loads(cleaned[start:end])
    except json.JSONDecodeError:
        return []

    # Enrich with job details
    jobs_by_id = {str(j["id"]): j for j in jobs}
    enriched = []
    for rec in recs[:10]:
        job_id = str(rec.get("job_id", ""))
        job = jobs_by_id.get(job_id)
        if job:
            enriched.append({
                "job_id": job_id,
                "score": min(100, max(0, int(rec.get("score", 0)))),
                "reason": rec.get("reason", ""),
                "title": job.get("title", ""),
                "company": job.get("company_name", ""),
                "location": job.get("location", ""),
                "skills": job.get("skills", []),
            })

    return sorted(enriched, key=lambda x: x["score"], reverse=True)
