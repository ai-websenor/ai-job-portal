import logging
import pdfplumber
from io import BytesIO
from app.exceptions import ExtractionError

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF. Raises ExtractionError on corrupt/empty/scanned PDFs."""
    try:
        text_parts = []
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        raise ExtractionError("Could not read PDF file. It may be corrupted or password-protected.") from e

    full_text = "\n\n".join(text_parts).strip()
    if not full_text:
        raise ExtractionError("No text found in PDF — scanned/image PDFs are not supported.")

    return full_text
