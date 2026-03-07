from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.extractors.pdf import extract_text_from_pdf
from app.extractors.docx import extract_text_from_docx
from app.parser.sagemaker import invoke_mistral
from app.storage.s3 import download_from_s3, upload_to_s3
from app.models.resume import ResumeOutput

app = FastAPI(title="Resume Parser", version="0.1.0")

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}
MAX_SIZE = settings.max_file_size_mb * 1024 * 1024


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse", response_model=ResumeOutput)
async def parse_resume(file: UploadFile = File(...)):
    """Upload PDF/DOCX resume, parse and return structured JSON."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}. Only PDF and DOCX allowed.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(400, f"File too large. Max {settings.max_file_size_mb}MB.")

    file_type = ALLOWED_TYPES[file.content_type]
    text = _extract_text(file_bytes, file_type)

    # Upload to S3 for permanent storage
    upload_to_s3(file_bytes, file.filename)

    return invoke_mistral(text)


class S3ParseRequest(BaseModel):
    s3_key: str


@app.post("/parse-s3", response_model=ResumeOutput)
def parse_resume_from_s3(request: S3ParseRequest):
    """Parse resume already stored in S3."""
    file_bytes = download_from_s3(request.s3_key)

    if request.s3_key.lower().endswith(".pdf"):
        file_type = "pdf"
    elif request.s3_key.lower().endswith((".docx", ".doc")):
        file_type = "docx"
    else:
        raise HTTPException(400, "Unsupported file type. S3 key must end with .pdf or .docx")

    text = _extract_text(file_bytes, file_type)
    return invoke_mistral(text)


def _extract_text(file_bytes: bytes, file_type: str) -> str:
    """Route to correct extractor based on file type."""
    try:
        if file_type == "pdf":
            return extract_text_from_pdf(file_bytes)
        elif file_type == "docx":
            return extract_text_from_docx(file_bytes)
        else:
            raise HTTPException(400, f"Unsupported file type: {file_type}")
    except ValueError as e:
        raise HTTPException(422, str(e))
