import logging
import pdfplumber
from io import BytesIO
from app.exceptions import ExtractionError

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
    """Extract text from PDF. Returns (text, page_count).

    Raises ExtractionError on corrupt/empty/scanned PDFs or if page limit exceeded.
    """
    from app.config import settings

    try:
        text_parts = []
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            if page_count > settings.max_resume_pages:
                raise ExtractionError(
                    f"Resume has {page_count} pages. Maximum supported is {settings.max_resume_pages}."
                )
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except ExtractionError:
        raise
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        raise ExtractionError("Could not read PDF file. It may be corrupted or password-protected.") from e

    full_text = "\n\n".join(text_parts).strip()
    if not full_text:
        raise ExtractionError("No text found in PDF — scanned/image PDFs are not supported.")

    return full_text, page_count
