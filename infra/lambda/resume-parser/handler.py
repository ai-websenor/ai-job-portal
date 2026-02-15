"""
Lambda handler for resume parsing.
Triggered by S3 ObjectCreated events on resumes/ prefix.

Flow:
  1. Download resume from S3
  2. Extract text (PyMuPDF for PDF, python-docx for DOCX)
  3. Call SageMaker NER endpoint for entity extraction
  4. Post-process NER output into structured resume data
  5. Write parsed data to RDS (resumes.parsed_content + profile fields)
"""

import json
import logging
import os
import re
import tempfile
from typing import Any
from urllib.parse import unquote_plus

import boto3
import fitz  # PyMuPDF
import psycopg2
from docx import Document

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Config from environment
SAGEMAKER_ENDPOINT = os.environ.get("SAGEMAKER_ENDPOINT", "resume-ner-endpoint")
DATABASE_URL = os.environ["DATABASE_URL"]

s3_client = boto3.client("s3")
sagemaker_runtime = boto3.client("sagemaker-runtime")


# ---------------------------------------------------------------------------
# Text Extraction
# ---------------------------------------------------------------------------

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using PyMuPDF."""
    doc = fitz.open(file_path)
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n".join(pages)


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX using python-docx."""
    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def extract_text(file_path: str, content_type: str) -> str:
    """Extract text based on content type."""
    if content_type == "application/pdf" or file_path.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif content_type in (
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ) or file_path.endswith((".doc", ".docx")):
        return extract_text_from_docx(file_path)
    else:
        raise ValueError(f"Unsupported content type: {content_type}")


# ---------------------------------------------------------------------------
# SageMaker NER
# ---------------------------------------------------------------------------

def invoke_ner(text: str) -> list[dict]:
    """
    Call SageMaker NER endpoint.
    Returns list of entities: [{"entity_group": "PER", "word": "John Doe", "score": 0.99}, ...]
    """
    # NER models have token limits (~512 tokens). Chunk the text.
    # For bert-base-NER, max input is ~512 tokens (~2000 chars).
    MAX_CHUNK = 1800
    chunks = [text[i : i + MAX_CHUNK] for i in range(0, len(text), MAX_CHUNK)]

    all_entities = []
    for chunk in chunks:
        try:
            response = sagemaker_runtime.invoke_endpoint(
                EndpointName=SAGEMAKER_ENDPOINT,
                ContentType="application/json",
                Body=json.dumps({"inputs": chunk}),
            )
            result = json.loads(response["Body"].read().decode("utf-8"))

            # HuggingFace pipeline returns list of entities
            if isinstance(result, list):
                # Flatten if nested (batch response)
                if result and isinstance(result[0], list):
                    for batch in result:
                        all_entities.extend(batch)
                else:
                    all_entities.extend(result)
        except Exception as e:
            logger.warning(f"NER chunk failed: {e}")
            continue

    return all_entities


# ---------------------------------------------------------------------------
# Post-processing: NER entities -> structured resume data
# ---------------------------------------------------------------------------

# Common email/phone regex
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}")

# Section header patterns
SECTION_PATTERNS = {
    "experience": re.compile(
        r"(?:work\s*)?experience|employment\s*history|professional\s*experience",
        re.IGNORECASE,
    ),
    "education": re.compile(
        r"education|academic|qualification|degree", re.IGNORECASE
    ),
    "skills": re.compile(
        r"skills|technical\s*skills|competencies|technologies|proficiencies",
        re.IGNORECASE,
    ),
    "summary": re.compile(
        r"summary|objective|profile|about\s*me|professional\s*summary",
        re.IGNORECASE,
    ),
}

# Common skill keywords (expanded at runtime from NER + regex)
KNOWN_SKILLS = {
    "python", "java", "javascript", "typescript", "react", "angular", "vue",
    "node.js", "nodejs", "express", "nestjs", "django", "flask", "spring",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ci/cd",
    "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "git", "linux", "rest", "graphql", "html", "css", "sass",
    "machine learning", "deep learning", "nlp", "pytorch", "tensorflow",
    "agile", "scrum", "jira", "figma", "photoshop",
    "c++", "c#", ".net", "rust", "go", "kotlin", "swift", "php", "ruby",
    "next.js", "fastapi", "pandas", "numpy", "spark", "hadoop", "kafka",
    "jenkins", "github actions", "circleci", "ansible", "puppet",
    "s3", "lambda", "ec2", "rds", "dynamodb", "sqs", "sns",
    "power bi", "tableau", "excel", "data analysis", "data science",
}


def extract_contact_info(text: str) -> dict:
    """Extract email and phone from raw text using regex."""
    emails = EMAIL_RE.findall(text)
    phones = PHONE_RE.findall(text)
    return {
        "email": emails[0] if emails else None,
        "phone": phones[0].strip() if phones else None,
    }


def extract_name_from_ner(entities: list[dict]) -> str | None:
    """Extract person name from NER entities (PER tag)."""
    per_entities = [
        e for e in entities
        if e.get("entity_group", e.get("entity", "")).upper() in ("PER", "B-PER", "I-PER")
    ]
    if not per_entities:
        return None

    # Merge consecutive PER tokens into full name
    name_parts = []
    for e in per_entities:
        word = e.get("word", "").strip().replace("##", "")
        if word:
            name_parts.append(word)

    # Take the first occurrence (usually the candidate's own name at top of resume)
    full_name = " ".join(name_parts[:4])  # cap at 4 tokens
    return full_name if full_name else None


def extract_organizations(entities: list[dict]) -> list[str]:
    """Extract organization names from NER entities (ORG tag)."""
    orgs = []
    current_org = []
    for e in entities:
        tag = e.get("entity_group", e.get("entity", "")).upper()
        word = e.get("word", "").strip().replace("##", "")
        if tag in ("ORG", "B-ORG"):
            if current_org:
                orgs.append(" ".join(current_org))
            current_org = [word]
        elif tag == "I-ORG" and current_org:
            current_org.append(word)
        else:
            if current_org:
                orgs.append(" ".join(current_org))
                current_org = []
    if current_org:
        orgs.append(" ".join(current_org))

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for org in orgs:
        if org.lower() not in seen:
            seen.add(org.lower())
            unique.append(org)
    return unique


def extract_skills_from_text(text: str) -> list[str]:
    """Extract skills by matching against known skill keywords."""
    text_lower = text.lower()
    found = []
    for skill in KNOWN_SKILLS:
        # Word boundary check
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill)
    return sorted(found)


def split_sections(text: str) -> dict[str, str]:
    """Split resume text into sections based on header patterns."""
    lines = text.split("\n")
    sections: dict[str, str] = {}
    current_section = "header"
    current_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            current_lines.append("")
            continue

        matched = False
        for section_name, pattern in SECTION_PATTERNS.items():
            if pattern.search(stripped) and len(stripped) < 60:
                # Save previous section
                if current_lines:
                    sections[current_section] = "\n".join(current_lines).strip()
                current_section = section_name
                current_lines = []
                matched = True
                break

        if not matched:
            current_lines.append(stripped)

    if current_lines:
        sections[current_section] = "\n".join(current_lines).strip()

    return sections


def structure_resume(text: str, ner_entities: list[dict]) -> dict[str, Any]:
    """
    Combine NER output with regex/heuristic parsing to produce structured data.
    """
    contact = extract_contact_info(text)
    name = extract_name_from_ner(ner_entities)
    organizations = extract_organizations(ner_entities)
    skills = extract_skills_from_text(text)
    sections = split_sections(text)

    # Build experience entries from ORG entities + section text
    experience = []
    for org in organizations[:10]:  # cap at 10
        experience.append({
            "company": org,
            "title": "",  # NER doesn't reliably extract job titles
            "duration": "",
        })

    # Education: extract from education section if available
    education = []
    edu_text = sections.get("education", "")
    if edu_text:
        # Simple line-based extraction
        for line in edu_text.split("\n"):
            line = line.strip()
            if line and len(line) > 5:
                education.append({"text": line})

    return {
        "name": name,
        "email": contact["email"],
        "phone": contact["phone"],
        "summary": sections.get("summary", "")[:1000],
        "skills": skills,
        "experience": experience,
        "education": education[:10],
        "organizations": organizations,
        "sections": {k: v[:500] for k, v in sections.items()},
    }


# ---------------------------------------------------------------------------
# Database Write
# ---------------------------------------------------------------------------

def get_db_connection():
    """Parse DATABASE_URL and return psycopg2 connection."""
    # postgresql://user:pass@host:port/dbname?sslmode=require
    url = DATABASE_URL
    # Remove query params for psycopg2 kwargs extraction
    base_url = url.split("?")[0]
    params = {}
    if "?" in url:
        query = url.split("?", 1)[1]
        for pair in query.split("&"):
            if "=" in pair:
                k, v = pair.split("=", 1)
                if k == "sslmode":
                    params["sslmode"] = v

    return psycopg2.connect(base_url, **params)


def write_to_db(s3_key: str, raw_text: str, structured_data: dict):
    """
    Update resumes.parsed_content with raw text.
    Store structured JSON for downstream use.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Find resume by filePath (S3 key)
            cur.execute(
                "SELECT id, profile_id FROM resumes WHERE file_path = %s",
                (s3_key,),
            )
            row = cur.fetchone()
            if not row:
                logger.warning(f"No resume found for key: {s3_key}")
                return

            resume_id, profile_id = row

            # Update parsed_content with raw text
            cur.execute(
                "UPDATE resumes SET parsed_content = %s, updated_at = NOW() WHERE id = %s",
                (raw_text, resume_id),
            )

            # Update profile headline/summary if empty and we extracted them
            if structured_data.get("summary"):
                cur.execute(
                    """UPDATE profiles
                       SET professional_summary = COALESCE(NULLIF(professional_summary, ''), %s),
                           updated_at = NOW()
                       WHERE id = %s""",
                    (structured_data["summary"][:1000], profile_id),
                )

            conn.commit()
            logger.info(
                f"DB updated: resume={resume_id}, profile={profile_id}, "
                f"skills={len(structured_data.get('skills', []))}, "
                f"orgs={len(structured_data.get('organizations', []))}"
            )
    except Exception as e:
        conn.rollback()
        logger.error(f"DB write failed: {e}")
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Lambda Handler
# ---------------------------------------------------------------------------

def handler(event, context):
    """
    S3 event trigger handler.
    event['Records'][0]['s3'] contains bucket/key info.
    """
    logger.info(f"Event: {json.dumps(event)}")

    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = unquote_plus(record["s3"]["object"]["key"])

        logger.info(f"Processing: s3://{bucket}/{key}")

        # Skip non-resume files
        if not key.startswith("resumes/"):
            logger.info(f"Skipping non-resume key: {key}")
            continue

        # Determine content type from extension
        ext = key.rsplit(".", 1)[-1].lower()
        content_type_map = {
            "pdf": "application/pdf",
            "doc": "application/msword",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        content_type = content_type_map.get(ext, "application/pdf")

        # Download from S3
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp_path = tmp.name
            s3_client.download_file(bucket, key, tmp_path)

        try:
            # Step 1: Extract text
            raw_text = extract_text(tmp_path, content_type)
            logger.info(f"Extracted {len(raw_text)} chars from {key}")

            if not raw_text.strip():
                logger.warning(f"No text extracted from {key}")
                write_to_db(key, "", {"error": "No text extracted"})
                continue

            # Step 2: NER entity extraction
            ner_entities = []
            try:
                ner_entities = invoke_ner(raw_text)
                logger.info(f"NER returned {len(ner_entities)} entities")
            except Exception as e:
                logger.warning(f"NER failed (will continue with regex only): {e}")

            # Step 3: Structure the data
            structured = structure_resume(raw_text, ner_entities)
            logger.info(
                f"Structured: name={structured.get('name')}, "
                f"skills={len(structured.get('skills', []))}, "
                f"orgs={len(structured.get('organizations', []))}"
            )

            # Step 4: Write to DB
            write_to_db(key, raw_text, structured)

        except Exception as e:
            logger.error(f"Processing failed for {key}: {e}")
            # Still try to save raw text if extraction succeeded
            try:
                write_to_db(key, raw_text if "raw_text" in dir() else "", {})
            except Exception:
                pass
            raise
        finally:
            os.unlink(tmp_path)

    return {"statusCode": 200, "body": "OK"}
