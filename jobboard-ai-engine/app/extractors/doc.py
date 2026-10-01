"""Legacy .doc (binary Word 97-2003) text extraction.

The old OLE-compound .doc format cannot be read by python-docx. We shell out to
`antiword`, a tiny purpose-built .doc→text tool (installed via the Dockerfile).
Returns plain text; formatting is discarded, which is fine for resume parsing.
"""

import logging
import shutil
import subprocess
import tempfile
import os

from app.exceptions import ExtractionError

logger = logging.getLogger(__name__)

# OLE2 compound-file magic — every real .doc starts with these 8 bytes.
_OLE2_MAGIC = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"


def extract_text_from_doc(file_bytes: bytes) -> tuple[str, int]:
    """Extract text from a legacy .doc file via antiword.

    Returns (text, estimated_page_count). Raises ExtractionError on a missing
    antiword binary, an unreadable/corrupt file, or empty output.
    """
    from app.config import settings

    if not file_bytes[:8] == _OLE2_MAGIC:
        raise ExtractionError("File is not a valid .doc (Word 97-2003) document.")

    antiword = shutil.which("antiword")
    if not antiword:
        raise ExtractionError("Legacy .doc parsing is unavailable (antiword not installed).")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".doc", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        # -w 0 disables line wrapping so paragraphs stay intact for the parser.
        proc = subprocess.run(
            [antiword, "-w", "0", tmp_path],
            capture_output=True, timeout=60,
        )
    except subprocess.TimeoutExpired as e:
        raise ExtractionError("Timed out reading the .doc file.") from e
    except Exception as e:
        logger.error("DOC extraction failed: %s", e)
        raise ExtractionError("Could not read .doc file. It may be corrupted.") from e
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    if proc.returncode != 0:
        detail = proc.stderr.decode("utf-8", "ignore").strip()
        logger.error("antiword exit %s: %s", proc.returncode, detail)
        raise ExtractionError("Could not read .doc file. It may be corrupted or password-protected.")

    text = proc.stdout.decode("utf-8", "ignore").strip()
    if not text:
        raise ExtractionError("No text found in .doc file.")

    page_count = max(1, len(text) // 3000 + (1 if len(text) % 3000 else 0))
    if page_count > settings.max_resume_pages:
        raise ExtractionError(
            f"Resume is approximately {page_count} pages. Maximum supported is {settings.max_resume_pages}."
        )
    return text, page_count
