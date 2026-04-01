import logging
import pypdfium2 as pdfium
from io import BytesIO
from app.exceptions import ExtractionError

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
    """Extract text from PDF using pypdfium2. Returns (text, page_count).

    Raises ExtractionError on corrupt/empty/scanned PDFs or if page limit exceeded.
    """
    from app.config import settings

    try:
        pdf = pdfium.PdfDocument(BytesIO(file_bytes))
        page_count = len(pdf)

        if page_count > settings.max_resume_pages:
            pdf.close()
            raise ExtractionError(
                f"Resume has {page_count} pages. Maximum supported is {settings.max_resume_pages}."
            )

        text_parts = []
        for page in pdf:
            textpage = page.get_textpage()
            page_text = textpage.get_text_range()
            textpage.close()
            page.close()
            if page_text:
                text_parts.append(page_text)

        pdf.close()
    except ExtractionError:
        raise
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        raise ExtractionError("Could not read PDF file. It may be corrupted or password-protected.") from e

    full_text = "\n\n".join(text_parts).strip()
    if not full_text:
        raise ExtractionError("No text found in PDF — scanned/image PDFs are not supported.")

    return full_text, page_count
