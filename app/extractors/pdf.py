import logging
import pypdfium2 as pdfium
from io import BytesIO
from app.exceptions import ExtractionError

logger = logging.getLogger(__name__)


# Common PDF ligature / typography substitutions that break downstream LLM
# extraction and case-sensitive section detection.
_LIGATURES = {
    "Ɵ": "ti",
    "ƫ": "tti",
    "ƞ": "tf",
    "ﬁ": "fi",
    "ﬀ": "ff",
    "ﬂ": "fl",
    "ﬃ": "ffi",
    "ﬄ": "ffl",
    "ﬅ": "ft",
    "ﬆ": "st",
}


def _unwrap_ligatures(text: str) -> str:
    if not text:
        return text
    for src, dst in _LIGATURES.items():
        if src in text:
            text = text.replace(src, dst)
    return text


def extract_pages_from_pdf(file_bytes: bytes) -> tuple[list[str], int]:
    """Extract text from PDF using pypdfium2, preserving per-page boundaries.

    Returns (pages, total_page_count). `pages` contains one cleaned string per
    source page in visual order; empty/whitespace-only pages are preserved as
    empty strings so the caller can decide how to handle them.

    Raises ExtractionError on corrupt / password-protected PDFs or when the
    page cap is exceeded.
    """
    from app.config import settings

    try:
        pdf = pdfium.PdfDocument(BytesIO(file_bytes))
        page_count = len(pdf)

        page_cap = max(settings.max_resume_pages, settings.raw_max_pages)
        if page_count > page_cap:
            pdf.close()
            raise ExtractionError(
                f"Resume has {page_count} pages. Maximum supported is {page_cap}."
            )

        pages: list[str] = []
        for page in pdf:
            textpage = page.get_textpage()
            page_text = textpage.get_text_range() or ""
            textpage.close()
            page.close()
            pages.append(_unwrap_ligatures(page_text).strip())

        pdf.close()
    except ExtractionError:
        raise
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        raise ExtractionError("Could not read PDF file. It may be corrupted or password-protected.") from e

    if not any(p for p in pages):
        raise ExtractionError("No text found in PDF — scanned/image PDFs are not supported.")

    return pages, page_count


def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
    """Back-compat wrapper: returns joined text and page count."""
    pages, page_count = extract_pages_from_pdf(file_bytes)
    full_text = "\n\n".join(p for p in pages if p).strip()
    return full_text, page_count
