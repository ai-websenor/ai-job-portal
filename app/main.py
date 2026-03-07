import json
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings
from app.extractors.pdf import extract_text_from_pdf
from app.extractors.docx import extract_text_from_docx
from app.parser.sagemaker import invoke_mistral
from app.storage.s3 import download_from_s3, upload_to_s3
from app.models.resume import ResumeOutput
from app.chat.chatbot import chat
from app.recommendations.engine import recommend_jobs
from app.db import insert_parsed_resume

app = FastAPI(title="AI Engine", version="0.2.0")

# Static files for testing UI
app.mount("/static", StaticFiles(directory="app/static"), name="static")

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}
MAX_SIZE = settings.max_file_size_mb * 1024 * 1024


# ── Health ──────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}


# ── Testing UI ──────────────────────────────────

@app.get("/ui")
def ui():
    return FileResponse("app/static/index.html")


# ── Resume Parsing ──────────────────────────────

@app.post("/parse", response_model=ResumeOutput)
async def parse_resume(file: UploadFile = File(...)):
    """Prototype: upload PDF/DOCX resume, parse and return structured JSON."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}. Only PDF and DOCX allowed.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(400, f"File too large. Max {settings.max_file_size_mb}MB.")

    file_type = ALLOWED_TYPES[file.content_type]
    text = _extract_text(file_bytes, file_type)
    upload_to_s3(file_bytes, file.filename)
    return invoke_mistral(text)


class S3ParseRequest(BaseModel):
    s3_key: str
    user_id: Optional[str] = None
    resume_id: Optional[str] = None
    save_to_db: bool = False


@app.post("/parse-s3", response_model=ResumeOutput)
def parse_resume_from_s3(request: S3ParseRequest):
    """Production: parse resume from S3 key. Optionally save to DB."""
    if request.s3_key.lower().endswith(".pdf"):
        file_type = "pdf"
    elif request.s3_key.lower().endswith((".docx", ".doc")):
        file_type = "docx"
    else:
        raise HTTPException(400, "Unsupported file type. S3 key must end with .pdf or .docx")

    file_bytes = download_from_s3(request.s3_key)

    text = _extract_text(file_bytes, file_type)
    result = invoke_mistral(text)

    if request.save_to_db and request.user_id and request.resume_id:
        insert_parsed_resume(
            user_id=request.user_id,
            resume_id=request.resume_id,
            parsed_data=result.model_dump(),
            raw_text=text,
        )

    return result


# ── Chatbot ─────────────────────────────────────

class ChatRequest(BaseModel):
    job_id: str
    message: str
    session_id: str


class ChatResponse(BaseModel):
    response: str
    session_id: str


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """Chat about a job listing. Candidate asks questions about JD/company."""
    response = chat(request.job_id, request.message, request.session_id)
    return ChatResponse(response=response, session_id=request.session_id)


# ── Job Recommendations ─────────────────────────

class RecommendRequest(BaseModel):
    user_id: Optional[str] = None
    skills: Optional[list[str]] = None
    experience_years: Optional[float] = None
    location: Optional[str] = None
    save_to_db: bool = False


@app.post("/recommend")
def recommend_endpoint(request: RecommendRequest):
    """Get job recommendations for a user or skill set."""
    if not request.user_id and not request.skills:
        raise HTTPException(400, "Provide user_id or skills")

    results = recommend_jobs(
        user_id=request.user_id,
        skills=request.skills,
        experience_years=request.experience_years,
        location=request.location,
        save_to_db=request.save_to_db,
    )
    return {"recommendations": results, "count": len(results)}


# ── Helpers ─────────────────────────────────────

def _extract_text(file_bytes: bytes, file_type: str) -> str:
    try:
        if file_type == "pdf":
            return extract_text_from_pdf(file_bytes)
        elif file_type == "docx":
            return extract_text_from_docx(file_bytes)
        else:
            raise HTTPException(400, f"Unsupported file type: {file_type}")
    except ValueError as e:
        raise HTTPException(422, str(e))
