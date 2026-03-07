from app.db import fetch_job_with_company
from app.parser.sagemaker import invoke_llm

# In-memory conversation history (session_id -> list of messages)
_sessions: dict[str, list[dict]] = {}
MAX_HISTORY = 20


def chat(job_id: str, message: str, session_id: str) -> str:
    """Handle a chat message about a specific job listing."""
    job = fetch_job_with_company(job_id)
    if not job:
        return "Sorry, I couldn't find that job listing."

    system_prompt = _build_system_prompt(job)
    history = _sessions.get(session_id, [])

    # Build conversation prompt
    conversation = system_prompt + "\n\n"
    for msg in history[-MAX_HISTORY:]:
        if msg["role"] == "user":
            conversation += f"Candidate: {msg['content']}\n"
        else:
            conversation += f"Assistant: {msg['content']}\n"
    conversation += f"Candidate: {message}\nAssistant:"

    response = invoke_llm(conversation, max_tokens=1024, temperature=0.3)
    response = response.strip()

    # Update history
    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": response})
    _sessions[session_id] = history

    return response


def _build_system_prompt(job: dict) -> str:
    company_name = job.get("company_name") or "the hiring company"
    company_desc = job.get("company_description") or ""
    culture = job.get("culture") or ""
    benefits = job.get("company_benefits") or ""
    skills = ", ".join(job.get("skills") or []) if job.get("skills") else "Not specified"
    work_mode = ", ".join(job.get("work_mode") or []) if job.get("work_mode") else "Not specified"

    salary_info = ""
    if job.get("salary_min") and job.get("salary_max"):
        salary_info = f"Salary range: {job['salary_min']} - {job['salary_max']}"

    return f"""You are a helpful job assistant for {company_name}. A candidate is viewing a job listing and has questions about it. Answer based ONLY on the information provided below. If the answer is not in the provided info, say you don't have that information.

## Job Details
- Title: {job.get('title', 'N/A')}
- Location: {job.get('location', 'N/A')} ({job.get('city', '')}, {job.get('state', '')})
- Job Type: {job.get('job_type', 'N/A')}
- Work Mode: {work_mode}
- Experience: {job.get('experience_level', 'N/A')} ({job.get('experience_min', '?')}-{job.get('experience_max', '?')} years)
- Required Skills: {skills}
- {salary_info}

## Job Description
{job.get('description', 'No description available.')}

## About {company_name}
{company_desc}
{f'Culture: {culture}' if culture else ''}
{f'Benefits: {benefits}' if benefits else ''}
{f'Industry: {job.get("industry", "")}' if job.get("industry") else ''}
{f'Size: {job.get("company_size", "")}' if job.get("company_size") else ''}
{f'HQ: {job.get("headquarters", "")}' if job.get("headquarters") else ''}

Be concise, professional, and helpful. If the candidate asks about application process, suggest they apply through the platform."""
