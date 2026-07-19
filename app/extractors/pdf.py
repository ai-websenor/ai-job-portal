import ctypes
import logging
import pypdfium2 as pdfium
import pypdfium2.raw as pdfium_c
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


def _extract_link_annotation_uris(pdf: pdfium.PdfDocument, page: pdfium.PdfPage) -> list[str]:
    """Read Link annotation URI targets from a page.

    Catches hyperlinks where the clickable target differs from the visible
    text (e.g. a "LinkedIn" label linking to a profile URL) — these are
    invisible to plain text extraction.
    """
    uris: list[str] = []
    try:
        annot_count = pdfium_c.FPDFPage_GetAnnotCount(page.raw)
    except Exception:
        return uris

    for i in range(annot_count):
        annot = pdfium_c.FPDFPage_GetAnnot(page.raw, i)
        if not annot:
            continue
        try:
            if pdfium_c.FPDFAnnot_GetSubtype(annot) != pdfium_c.FPDF_ANNOT_LINK:
                continue
            link = pdfium_c.FPDFAnnot_GetLink(annot)
            if not link:
                continue
            action = pdfium_c.FPDFLink_GetAction(link)
            if not action:
                continue
            if pdfium_c.FPDFAction_GetType(action) != pdfium_c.PDFACTION_URI:
                continue
            buflen = pdfium_c.FPDFAction_GetURIPath(pdf.raw, action, None, 0)
            if buflen <= 1:
                continue
            buf = ctypes.create_string_buffer(buflen)
            pdfium_c.FPDFAction_GetURIPath(pdf.raw, action, buf, buflen)
            uri = buf.raw[: buflen - 1].decode("utf-8", "replace").strip()
            if uri:
                uris.append(uri)
        except Exception as e:
            logger.debug("Link annotation read failed: %s", e)
        finally:
            pdfium_c.FPDFPage_CloseAnnot(annot)

    return uris


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
        any_real_text = False
        seen_uris: set[str] = set()
        for page in pdf:
            textpage = page.get_textpage()
            page_text = textpage.get_text_range() or ""
            page_text = _unwrap_ligatures(page_text).strip()
            if page_text:
                any_real_text = True

            # Filter link annotations: normalize mailto: to a bare address,
            # dedup across the whole document, and drop any target already
            # visible verbatim in the page text (no new information, just tokens).
            new_uris: list[str] = []
            for uri in _extract_link_annotation_uris(pdf, page):
                if uri.lower().startswith("mailto:"):
                    uri = uri[len("mailto:"):].strip()
                if not uri or uri in seen_uris or uri in page_text:
                    continue
                seen_uris.add(uri)
                new_uris.append(uri)
            if new_uris:
                page_text = (page_text + "\n\n[EMBEDDED LINKS]\n" + "\n".join(new_uris)).strip()

            textpage.close()
            page.close()
            pages.append(page_text)

        pdf.close()
    except ExtractionError:
        raise
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        raise ExtractionError("Could not read PDF file. It may be corrupted or password-protected.") from e

    # Guard against scanned/image PDFs using real extracted text only — link
    # annotations alone must not make an otherwise-textless PDF look parseable.
    if not any_real_text:
        raise ExtractionError("No text found in PDF — scanned/image PDFs are not supported.")

    return pages, page_count


def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
    """Back-compat wrapper: returns joined text and page count."""
    pages, page_count = extract_pages_from_pdf(file_bytes)
    full_text = "\n\n".join(p for p in pages if p).strip()
    return full_text, page_count
