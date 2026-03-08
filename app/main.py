import re
import logging
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from app.config import settings
from app.extractors.pdf import extract_text_from_pdf
from app.extractors.docx import extract_text_from_docx
from app.parser.sagemaker import invoke_mistral
from app.storage.s3 import download_from_s3, upload_to_s3
from app.models.resume import ResumeOutput
from app.chat.chatbot import chat
from app.recommendations.engine import recommend_jobs
from app.db import insert_parsed_resume
from app.exceptions import ExternalServiceError, DatabaseError, ExtractionError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Engine", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ai = APIRouter(prefix="/ai")

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}
MAX_SIZE = settings.max_file_size_mb * 1024 * 1024
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
    session_id: str
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
        if not v or len(v) > 128:
            raise ValueError("session_id must be 1-128 characters")
        return v

    @field_validator("user_id")
    @classmethod
    def validate_user_id(cls, v):
        if v is not None and not UUID_RE.match(v):
            raise ValueError("user_id must be a valid UUID")
        return v


class ChatResponse(BaseModel):
    response: str
    session_id: str


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
    return {"status": "ok", "version": "0.3.0"}


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
    """Upload PDF/DOCX resume, parse and return structured JSON."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}. Only PDF and DOCX allowed.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(400, f"File too large. Max {settings.max_file_size_mb}MB.")

    file_type = ALLOWED_TYPES[file.content_type]

    try:
        text = _extract_text(file_bytes, file_type)
    except ExtractionError as e:
        raise HTTPException(422, str(e))

    # S3 upload is best-effort
    s3_uploaded = True
    try:
        upload_to_s3(file_bytes, file.filename)
    except ExternalServiceError:
        logger.warning("S3 upload failed for %s, continuing with parse", file.filename)
        s3_uploaded = False

    try:
        result = invoke_mistral(text)
    except ExternalServiceError as e:
        raise HTTPException(503, str(e))

    # Check for empty parse result
    if not result.personal.name.value and not result.experience and not result.skills:
        raise HTTPException(422, "Could not extract resume data. Try a different file or format.")

    data = result.model_dump()
    data["s3_uploaded"] = s3_uploaded
    return data


@app.post("/parse-s3")
@ai.post("/parse-s3")
def parse_resume_from_s3(request: S3ParseRequest):
    """Production: parse resume from S3 key. Optionally save to DB."""
    if request.s3_key.lower().endswith(".pdf"):
        file_type = "pdf"
    elif request.s3_key.lower().endswith((".docx", ".doc")):
        file_type = "docx"
    else:
        raise HTTPException(400, "Unsupported file type. S3 key must end with .pdf or .docx")

    try:
        file_bytes = download_from_s3(request.s3_key)
    except ExternalServiceError as e:
        if "not found" in str(e).lower():
            raise HTTPException(404, str(e))
        raise HTTPException(503, str(e))

    try:
        text = _extract_text(file_bytes, file_type)
    except ExtractionError as e:
        raise HTTPException(422, str(e))

    try:
        result = invoke_mistral(text)
    except ExternalServiceError as e:
        raise HTTPException(503, str(e))

    # Check for empty parse result
    if not result.personal.name.value and not result.experience and not result.skills:
        raise HTTPException(422, "Could not extract resume data. Try a different file or format.")

    if request.save_to_db and request.user_id and request.resume_id:
        try:
            insert_parsed_resume(
                user_id=request.user_id,
                resume_id=request.resume_id,
                parsed_data=result.model_dump(),
                raw_text=text,
            )
        except DatabaseError as e:
            logger.error("Failed to save parsed resume to DB: %s", e)

    return result


# ── Chatbot ─────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
@ai.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """Chat about a job listing. Candidate asks questions about JD/company."""
    try:
        response = chat(request.job_id, request.message, request.session_id, request.user_id)
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")
    except ExternalServiceError as e:
        raise HTTPException(503, str(e))

    return ChatResponse(response=response, session_id=request.session_id)


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


# ── Router + Static ────────────────────────────

app.include_router(ai)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.mount("/ai/static", StaticFiles(directory="app/static"), name="ai-static")


# ── Helpers ─────────────────────────────────────

def _extract_text(file_bytes: bytes, file_type: str) -> str:
    """Extract text from file bytes. Raises ExtractionError."""
    if file_type == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif file_type == "docx":
        return extract_text_from_docx(file_bytes)
    else:
        raise ExtractionError(f"Unsupported file type: {file_type}")
