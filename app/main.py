import re
import asyncio
import logging
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from app.config import settings
from app.extractors.pdf import extract_pages_from_pdf
from app.parser.sagemaker import invoke_mistral, invoke_mistral_raw, invoke_mistral_whole
from app.parser.token_estimator import estimate_input_tokens, estimate_output_tokens
from app.parser.job_store import create_job, get_job, add_log, update_status, set_result, set_error, to_dict, cleanup_old_jobs
from app.storage.s3 import download_from_s3, upload_to_s3
from app.models.resume import ResumeOutput
from app.chat.chatbot import chat
from app.recommendations.engine import recommend_jobs
from app.db import insert_parsed_resume, search_jobs, search_users, search_users_with_resume, fetch_job_with_company, fetch_user_profile
from app.exceptions import ExternalServiceError, DatabaseError, ExtractionError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Engine", version="0.13.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ai = APIRouter(prefix="/ai")

ALLOWED_TYPES = {
    "application/pdf": "pdf",
}
MAX_SIZE = settings.max_file_size_mb * 1024 * 1024

# Global parse concurrency — limits simultaneous background parse jobs
_parse_gate = asyncio.Semaphore(settings.max_concurrent_parses)
UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)


# ── Request Models with Validation ────────────


class S3ParseRequest(BaseModel):
    s3_key: str
    user_id: Optional[str] = None
    resume_id: Optional[str] = None
    save_to_db: bool = False

    @field_validator("s3_key")
    @classmethod
    def validate_s3_key(cls, v):
        if not v or len(v) > 1024:
            raise ValueError("s3_key must be 1-1024 characters")
        if ".." in v:
            raise ValueError("s3_key must not contain path traversal")
        return v

    @field_validator("user_id")
    @classmethod
    def validate_user_id(cls, v):
        if v is not None and not UUID_RE.match(v):
            raise ValueError("user_id must be a valid UUID")
        return v

    @field_validator("resume_id")
    @classmethod
    def validate_resume_id(cls, v):
        if v is not None and not UUID_RE.match(v):
            raise ValueError("resume_id must be a valid UUID")
        return v


class ChatRequest(BaseModel):
    job_id: str
    message: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None

    @field_validator("job_id")
    @classmethod
    def validate_job_id(cls, v):
        if not UUID_RE.match(v):
            raise ValueError("job_id must be a valid UUID")
        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError("message must not be empty")
        if len(v) > 2000:
            raise ValueError("message must be under 2000 characters")
        return v.strip()

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, v):
        if v is not None and len(v) > 128:
            raise ValueError("session_id must be under 128 characters")
        return v

    @field_validator("user_id")
    @classmethod
    def validate_user_id(cls, v):
        if v is not None and not UUID_RE.match(v):
            raise ValueError("user_id must be a valid UUID")
        return v


class ChatResponse(BaseModel):
    response: str
    messages: list[str] = []
    session_id: str
    suggestions: list[str] = []


class RecommendRequest(BaseModel):
    user_id: str
    skills: Optional[list[str]] = None
    experience_years: Optional[float] = None
    location: Optional[str] = None
    save_to_db: bool = False

    @field_validator("user_id")
    @classmethod
    def validate_user_id(cls, v):
        if not UUID_RE.match(v):
            raise ValueError("user_id must be a valid UUID")
        return v

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v):
        if v is not None:
            if len(v) > 50:
                raise ValueError("Maximum 50 skills allowed")
            v = [s.strip() for s in v if s and s.strip()]
            if any(len(s) > 100 for s in v):
                raise ValueError("Each skill must be under 100 characters")
        return v

    @field_validator("experience_years")
    @classmethod
    def validate_experience(cls, v):
        if v is not None and (v < 0 or v > 60):
            raise ValueError("experience_years must be between 0 and 60")
        return v

    @field_validator("location")
    @classmethod
    def validate_location(cls, v):
        if v is not None and len(v) > 200:
            raise ValueError("location must be under 200 characters")
        return v


# ── Health ─────────────────────────────────────

@app.get("/health")
@ai.get("/health")
def health():
    return {"status": "ok", "version": "0.13.0"}


@app.get("/favicon.ico")
@ai.get("/favicon.ico")
def favicon():
    return Response(status_code=204)


@app.get("/ui")
@ai.get("/ui")
def ui():
    return FileResponse("app/static/index.html")


@app.get("/changelog")
@ai.get("/changelog")
def changelog():
    try:
        with open("CHANGELOG.md", "r") as f:
            return Response(content=f.read(), media_type="text/plain")
    except FileNotFoundError:
        return Response(content="No changelog available.", media_type="text/plain")


# ── Resume Parsing ──────────────────────────────

@app.post("/parse")
@ai.post("/parse")
async def parse_resume(file: UploadFile = File(...)):
    """Upload PDF resume, returns job_id for async processing."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}. Only PDF is allowed.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(400, f"File too large. Max {settings.max_file_size_mb}MB.")

    file_type = ALLOWED_TYPES[file.content_type]
    filename = file.filename or "unknown"

    job_id = create_job()
    add_log(job_id, f"Received {filename} ({len(file_bytes)} bytes)")
    asyncio.create_task(_run_parse_job(job_id, file_bytes, file_type, filename))

    return {"job_id": job_id}


@app.get("/parse-status/{job_id}")
@ai.get("/parse-status/{job_id}")
def get_parse_status(job_id: str):
    """Poll parse job status, progress, logs, and result."""
    cleanup_old_jobs()
    data = to_dict(job_id)
    if not data:
        raise HTTPException(404, "Job not found")
    return data


@app.post("/parse-whole")
@ai.post("/parse-whole")
async def parse_resume_whole(file: UploadFile = File(...)):
    """Debug endpoint: send the FULL raw PDF text to the LLM in a single call.

    Synchronous (waits for LLM). Returns raw LLM text + parsed JSON + timings
    so the UI can compare quality against the chunked pipeline side-by-side.
    """
    import time as _time
    from app.parser.chunk_prompts import build_raw_whole_prompt
    from app.parser.sagemaker import invoke_llm
    from app.parser.chunked_processor import _parse_chunk_json

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}. Only PDF is allowed.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(400, f"File too large. Max {settings.max_file_size_mb}MB.")

    t0 = _time.time()
    try:
        text, page_count, _pages = await asyncio.to_thread(_extract_text, file_bytes, "pdf")
    except ExtractionError as e:
        raise HTTPException(422, str(e))
    extract_ms = int((_time.time() - t0) * 1000)

    prompt = build_raw_whole_prompt(text)
    # Output cap: ~16K tokens to cover dense resumes in one shot. Timeout uses
    # settings.raw_call_timeout_seconds (default 600s) via boto3 read_timeout.
    max_tokens = settings.output_token_ceiling  # 16000

    t1 = _time.time()
    try:
        raw = await asyncio.to_thread(invoke_llm, prompt, max_tokens, 0.1, "parse")
    except ExternalServiceError as e:
        raise HTTPException(503, str(e))
    llm_ms = int((_time.time() - t1) * 1000)

    parsed = _parse_chunk_json(raw, "parse_whole")

    return {
        "extract_ms": extract_ms,
        "llm_ms": llm_ms,
        "page_count": page_count,
        "text_chars": len(text),
        "prompt_chars": len(prompt),
        "raw_response_chars": len(raw),
        "raw_response": raw,
        "parsed": parsed,
        "parse_ok": parsed is not None,
    }


async def _run_parse_job(job_id: str, file_bytes: bytes, file_type: str, filename: str):
    """Background task: extract → estimate → parse → store result."""
    def log_fn(msg, level="info"):
        add_log(job_id, msg, level)

    def progress_fn(chunks_done, chunks_total):
        update_status(job_id, "chunking", chunks_done=chunks_done, chunks_total=chunks_total)

    # Acquire global parse slot (queues if max_concurrent_parses reached)
    async with _parse_gate:
        try:
            # Step 1: Extract text
            update_status(job_id, "extracting", current_step=1, total_steps=4)
            log_fn(f"Extracting text from {file_type.upper()}...")
            text, page_count, pages = await asyncio.to_thread(_extract_text, file_bytes, file_type)
            log_fn(f"Extracted {page_count} page(s), {len(text)} chars")

            # Step 2: S3 upload (best-effort, non-blocking)
            s3_info = None
            try:
                s3_info = await asyncio.to_thread(upload_to_s3, file_bytes, filename)
                log_fn(f"Uploaded to S3: {s3_info['key']}")
            except ExternalServiceError:
                log_fn("S3 upload failed, continuing", "warning")

            # Step 3: Estimate tokens
            update_status(job_id, "estimating", current_step=2, total_steps=4)
            input_tok = estimate_input_tokens(text)
            output_tok = estimate_output_tokens(text)
            total_tok = input_tok + output_tok
            log_fn(f"Token estimate: input ~{input_tok}, output ~{output_tok}, total ~{total_tok}")

            update_status(job_id, "chunking", current_step=3, total_steps=4, chunks_done=0, chunks_total=0)

            # Step 4: Parse via raw or chunked pipeline (controlled by settings.parse_mode)
            result = await asyncio.to_thread(_parse_resume_sync, text, pages, log_fn, progress_fn)

            update_status(job_id, "merging", current_step=4, total_steps=4)

            # Check empty — no meaningful content extracted
            has_personal = bool(result.personalDetails.firstName or result.personalDetails.headline or result.personalDetails.professionalSummary)
            if not has_personal and not result.experienceDetails and not result.skills:
                set_error(job_id, "Could not extract resume data. Try a different file or format.")
                log_fn("Parsing failed — empty result", "error")
                return

            # Step 5: Done
            update_status(job_id, "done", current_step=4, total_steps=4)
            data = result.model_dump()
            data["s3_uploaded"] = s3_info is not None
            if s3_info:
                data["s3_key"] = s3_info["key"]
                data["s3_url"] = s3_info["url"]
            set_result(job_id, data)
            log_fn("Parsing complete!", "success")

        except ExtractionError as e:
            set_error(job_id, str(e))
            log_fn(str(e), "error")
        except ExternalServiceError as e:
            set_error(job_id, str(e))
            log_fn(f"AI service error: {e}", "error")
        except Exception as e:
            logger.exception("Unexpected error in parse job %s", job_id)
            set_error(job_id, "Unexpected error during parsing")
            log_fn(f"Unexpected error: {e}", "error")


@app.post("/parse-s3")
@ai.post("/parse-s3")
async def parse_resume_from_s3(request: S3ParseRequest):
    """Production: parse resume from S3 key. Returns job_id for async processing."""
    if request.s3_key.lower().endswith(".pdf"):
        file_type = "pdf"
    else:
        raise HTTPException(400, "Unsupported file type. S3 key must end with .pdf")

    try:
        file_bytes = download_from_s3(request.s3_key)
    except ExternalServiceError as e:
        if "not found" in str(e).lower():
            raise HTTPException(404, str(e))
        raise HTTPException(503, str(e))

    job_id = create_job()
    add_log(job_id, f"Received S3 key: {request.s3_key}")
    asyncio.create_task(_run_parse_s3_job(
        job_id, file_bytes, file_type, request.s3_key,
        request.save_to_db, request.user_id, request.resume_id,
    ))

    return {"job_id": job_id}


async def _run_parse_s3_job(
    job_id: str, file_bytes: bytes, file_type: str, s3_key: str,
    save_to_db: bool, user_id: str | None, resume_id: str | None,
):
    """Background task for S3-based parsing."""
    def log_fn(msg, level="info"):
        add_log(job_id, msg, level)

    def progress_fn(chunks_done, chunks_total):
        update_status(job_id, "chunking", chunks_done=chunks_done, chunks_total=chunks_total)

    # Acquire global parse slot (queues if max_concurrent_parses reached)
    async with _parse_gate:
        try:
            update_status(job_id, "extracting", current_step=1, total_steps=4)
            log_fn(f"Extracting text from {file_type.upper()}...")
            text, page_count, pages = await asyncio.to_thread(_extract_text, file_bytes, file_type)
            log_fn(f"Extracted {page_count} page(s), {len(text)} chars")

            update_status(job_id, "estimating", current_step=2, total_steps=4)
            input_tok = estimate_input_tokens(text)
            output_tok = estimate_output_tokens(text)
            total_tok = input_tok + output_tok
            log_fn(f"Token estimate: input ~{input_tok}, output ~{output_tok}, total ~{total_tok}")

            update_status(job_id, "chunking", current_step=3, total_steps=4, chunks_done=0, chunks_total=0)

            result = await asyncio.to_thread(_parse_resume_sync, text, pages, log_fn, progress_fn)
            update_status(job_id, "merging", current_step=4, total_steps=4)

            has_personal = bool(result.personalDetails.firstName or result.personalDetails.headline or result.personalDetails.professionalSummary)
            if not has_personal and not result.experienceDetails and not result.skills:
                set_error(job_id, "Could not extract resume data. Try a different file or format.")
                log_fn("Parsing failed — empty result", "error")
                return

            # Save to DB if requested
            if save_to_db and user_id and resume_id:
                try:
                    await asyncio.to_thread(
                        insert_parsed_resume,
                        user_id=user_id,
                        resume_id=resume_id,
                        parsed_data=result.model_dump(),
                        raw_text=text,
                    )
                    log_fn("Saved to database")
                except DatabaseError as e:
                    log_fn(f"DB save failed: {e}", "warning")

            update_status(job_id, "done", current_step=4, total_steps=4)
            set_result(job_id, result.model_dump())
            log_fn("Parsing complete!", "success")

        except ExtractionError as e:
            set_error(job_id, str(e))
            log_fn(str(e), "error")
        except ExternalServiceError as e:
            set_error(job_id, str(e))
            log_fn(f"AI service error: {e}", "error")
        except Exception as e:
            logger.exception("Unexpected error in parse-s3 job %s", job_id)
            set_error(job_id, "Unexpected error during parsing")
            log_fn(f"Unexpected error: {e}", "error")


# ── Chatbot ─────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
@ai.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """Chat about a job listing. Candidate asks questions about JD/company."""
    session_id = request.session_id or f"chat-{request.job_id}-{request.user_id or 'anon'}"
    try:
        result = chat(request.job_id, request.message, session_id, request.user_id)
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")
    except ExternalServiceError as e:
        raise HTTPException(503, str(e))

    return ChatResponse(
        response=result["response"],
        messages=result.get("messages", [result["response"]]),
        session_id=session_id,
        suggestions=result.get("suggestions", []),
    )


# ── Job Recommendations ─────────────────────────

@app.post("/recommend")
@ai.post("/recommend")
def recommend_endpoint(request: RecommendRequest):
    """Get job recommendations for a user."""
    try:
        results = recommend_jobs(
            user_id=request.user_id,
            skills=request.skills,
            experience_years=request.experience_years,
            location=request.location,
            save_to_db=request.save_to_db,
        )
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")
    except ExternalServiceError as e:
        raise HTTPException(503, str(e))

    return {"recommendations": results, "count": len(results)}


# ── Search (for testing console UI) ────────────

@app.get("/search/jobs")
@ai.get("/search/jobs")
def search_jobs_endpoint(q: str = ""):
    q = q.strip()
    if len(q) < 2:
        return []
    if len(q) > 200:
        raise HTTPException(400, "Query too long")
    try:
        results = search_jobs(q, limit=10)
        return [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "company_name": r["company_name"] or "",
                "location": r["location"] or "",
            }
            for r in results
        ]
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")


@app.get("/search/users")
@ai.get("/search/users")
def search_users_endpoint(q: str = ""):
    q = q.strip()
    if len(q) < 2:
        return []
    if len(q) > 200:
        raise HTTPException(400, "Query too long")
    try:
        results = search_users(q, limit=10)
        return [
            {
                "id": str(r["id"]),
                "name": f"{r['first_name'] or ''} {r['last_name'] or ''}".strip(),
                "email": r["email"] or "",
            }
            for r in results
        ]
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")


@app.get("/search/users-with-resume")
@ai.get("/search/users-with-resume")
def search_users_with_resume_endpoint(q: str = ""):
    q = q.strip()
    if len(q) < 2:
        return []
    if len(q) > 200:
        raise HTTPException(400, "Query too long")
    try:
        results = search_users_with_resume(q, limit=10)
        out = []
        for r in results:
            # Extract S3 key from full URL: https://bucket.s3.region.amazonaws.com/resumes/xxx.pdf → resumes/xxx.pdf
            file_path = r["file_path"] or ""
            s3_key = file_path.split(".amazonaws.com/", 1)[-1] if ".amazonaws.com/" in file_path else file_path
            out.append({
                "id": str(r["id"]),
                "name": f"{r['first_name'] or ''} {r['last_name'] or ''}".strip(),
                "email": r["email"] or "",
                "s3_key": s3_key,
                "resume_id": str(r["resume_id"]),
                "file_name": r["file_name"] or "",
            })
        return out
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")


# ── Job Details (for sidebar) ──────────────────

@app.get("/job/{job_id}")
@ai.get("/job/{job_id}")
def get_job_details(job_id: str):
    if not UUID_RE.match(job_id):
        raise HTTPException(400, "Invalid job ID")
    try:
        job = fetch_job_with_company(job_id)
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "title": job.get("title"),
        "company_name": job.get("company_name"),
        "location": job.get("location"),
        "city": job.get("city"),
        "state": job.get("state"),
        "job_type": job.get("job_type"),
        "work_mode": job.get("work_mode"),
        "experience_level": job.get("experience_level"),
        "experience_min": job.get("experience_min"),
        "experience_max": job.get("experience_max"),
        "skills": job.get("skills"),
        "salary_min": job.get("salary_min"),
        "salary_max": job.get("salary_max"),
        "description": job.get("description"),
        "company_description": job.get("company_description"),
        "culture": job.get("culture"),
        "company_benefits": job.get("company_benefits"),
        "industry": job.get("industry"),
        "company_size": job.get("company_size"),
        "headquarters": job.get("headquarters"),
    }


@app.get("/user/{user_id}")
@ai.get("/user/{user_id}")
def get_user_profile(user_id: str):
    if not UUID_RE.match(user_id):
        raise HTTPException(400, "Invalid user ID")
    try:
        profile = fetch_user_profile(user_id)
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")
    if not profile:
        raise HTTPException(404, "User profile not found")
    def _fmt_date(d):
        return d.isoformat() if d else None

    return {
        "first_name": profile.get("first_name"),
        "last_name": profile.get("last_name"),
        "email": profile.get("user_email"),
        "phone": profile.get("phone"),
        "headline": profile.get("headline"),
        "professional_summary": profile.get("professional_summary"),
        "total_experience_years": profile.get("total_experience_years"),
        "city": profile.get("city"),
        "state": profile.get("state"),
        "country": profile.get("country"),
        "gender": profile.get("gender"),
        "resume_url": profile.get("resume_url"),
        "video_resume_url": profile.get("video_resume_url"),
        "visibility": profile.get("visibility"),
        "completion_percentage": profile.get("completion_percentage"),
        "skills": [
            {"name": s["name"], "proficiency": s.get("proficiency_level"), "years": s.get("years_of_experience")}
            for s in profile.get("skills", [])
        ],
        "education": [
            {
                "institution": e.get("institution"), "degree": e.get("degree"),
                "field_of_study": e.get("field_of_study"), "grade": e.get("grade"),
                "start_date": _fmt_date(e.get("start_date")), "end_date": _fmt_date(e.get("end_date")),
                "currently_studying": e.get("currently_studying"),
            }
            for e in profile.get("education", [])
        ],
        "experience": [
            {
                "company": e.get("company_name"), "title": e.get("job_title"),
                "designation": e.get("designation"), "employment_type": e.get("employment_type"),
                "location": e.get("location"), "description": e.get("description"),
                "achievements": e.get("achievements"), "skills_used": e.get("skills_used"),
                "start_date": _fmt_date(e.get("start_date")), "end_date": _fmt_date(e.get("end_date")),
                "is_current": e.get("is_current"),
            }
            for e in profile.get("experience", [])
        ],
        "certifications": [
            {
                "name": c.get("name"), "issuing_organization": c.get("issuing_organization"),
                "issue_date": _fmt_date(c.get("issue_date")), "expiry_date": _fmt_date(c.get("expiry_date")),
                "credential_url": c.get("credential_url"),
            }
            for c in profile.get("certifications", [])
        ],
        "projects": [
            {
                "title": p.get("title"), "description": p.get("description"),
                "url": p.get("url"),
                "start_date": _fmt_date(p.get("start_date")), "end_date": _fmt_date(p.get("end_date")),
            }
            for p in profile.get("projects", [])
        ],
        "languages": [
            {"name": l.get("name"), "proficiency": l.get("proficiency")}
            for l in profile.get("languages", [])
        ],
    }


# ── Router + Static ────────────────────────────

app.include_router(ai)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.mount("/ai/static", StaticFiles(directory="app/static"), name="ai-static")


# ── Helpers ─────────────────────────────────────

def _extract_text(file_bytes: bytes, file_type: str) -> tuple[str, int, list[str]]:
    """Extract text from PDF. Returns (joined_text, page_count, pages). Raises ExtractionError.

    PDF is the only supported format; DOCX is out of scope.
    """
    if file_type != "pdf":
        raise ExtractionError(f"Unsupported file type: {file_type}. Only PDF is supported.")
    pages, page_count = extract_pages_from_pdf(file_bytes)
    joined = "\n\n".join(p for p in pages if p).strip()
    return joined, page_count, pages


def _parse_resume_sync(text: str, pages: list[str], log_fn, progress_fn) -> ResumeOutput:
    """Dispatch resume parsing by settings.parse_mode.

    - "whole" (default): single LLM call. Falls back to raw chunked when text
      exceeds whole_path_max_chars or when the whole call fails to produce
      parseable JSON.
    - "raw": char-chunked partial-JSON merge (previous default).
    - "chunked": DEPRECATED per-section splitter; kept only for explicit override.
    """
    from app.parser.chunked_processor import WholeParseFailed

    mode = settings.parse_mode
    txt_len = len(text)

    if mode == "whole":
        if txt_len <= settings.whole_path_max_chars:
            log_fn(f"Using whole-document single-call path ({txt_len} chars)")
            try:
                return invoke_mistral_whole(text, log_fn, progress_fn)
            except WholeParseFailed as e:
                log_fn(f"Whole-path failed: {e} — falling back to raw chunked", "warning")
        else:
            log_fn(f"Text {txt_len} chars > whole_path_max_chars {settings.whole_path_max_chars} — using raw chunked", "info")
        return invoke_mistral_raw(pages, log_fn, progress_fn)

    if mode == "chunked":
        log_fn("Using DEPRECATED per-section chunked processing", "warning")
        return invoke_mistral(text, log_fn, progress_fn)

    log_fn(f"Using raw per-chunk processing ({len(pages)} pages)")
    return invoke_mistral_raw(pages, log_fn, progress_fn)
