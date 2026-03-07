from docx import Document
from io import BytesIO


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file, including tables and text boxes."""
    doc = Document(BytesIO(file_bytes))
    parts = []

    # Extract paragraphs
    for p in doc.paragraphs:
        if p.text.strip():
            parts.append(p.text)

    # Extract text from tables (many resumes use table layouts)
    for table in doc.tables:
        for row in table.rows:
            row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                parts.append(row_text)

    full_text = "\n".join(parts).strip()
    if not full_text:
        raise ValueError("No text found in DOCX file.")

    return full_text
