import logging
from docx import Document
from io import BytesIO
from app.exceptions import ExtractionError

logger = logging.getLogger(__name__)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file, including tables. Raises ExtractionError on corrupt/empty."""
    try:
        doc = Document(BytesIO(file_bytes))
    except Exception as e:
        logger.error("DOCX extraction failed: %s", e)
        raise ExtractionError("Could not read DOCX file. It may be corrupted.") from e

    parts = []
    for p in doc.paragraphs:
        if p.text.strip():
            parts.append(p.text)

    for table in doc.tables:
        for row in table.rows:
            row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                parts.append(row_text)

    full_text = "\n".join(parts).strip()
    if not full_text:
        raise ExtractionError("No text found in DOCX file.")

    return full_text
