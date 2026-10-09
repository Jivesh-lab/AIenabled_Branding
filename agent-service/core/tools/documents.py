"""
core/tools/documents.py
─────────────────────────
Document processing tool — extract text from PDF/DOCX uploads,
generate structured reports, and analyse uploaded materials.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

import structlog
from langchain_core.tools import tool

logger = structlog.get_logger(__name__)


@tool
def extract_text_from_pdf(file_bytes_b64: str, filename: str = "doc.pdf") -> str:
    """
    Extract text from a PDF document (base64-encoded bytes).
    Returns JSON with {filename, page_count, text, word_count}.
    """
    import base64
    from pypdf import PdfReader

    raw = base64.b64decode(file_bytes_b64)
    reader = PdfReader(io.BytesIO(raw))

    pages_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages_text.append({"page": i + 1, "text": text.strip()})

    full_text = "\n\n".join(p["text"] for p in pages_text)
    return json.dumps({
        "filename": filename,
        "page_count": len(reader.pages),
        "text": full_text[:8000],          # cap at 8k chars to stay in context window
        "word_count": len(full_text.split()),
    })


@tool
def extract_text_from_docx(file_bytes_b64: str, filename: str = "doc.docx") -> str:
    """
    Extract text from a DOCX document (base64-encoded bytes).
    Returns JSON with {filename, paragraph_count, text, word_count}.
    """
    import base64
    from docx import Document

    raw = base64.b64decode(file_bytes_b64)
    doc = Document(io.BytesIO(raw))

    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    full_text = "\n".join(paragraphs)
    return json.dumps({
        "filename": filename,
        "paragraph_count": len(paragraphs),
        "text": full_text[:8000],
        "word_count": len(full_text.split()),
    })


@tool
def analyse_pitch_deck(content: str) -> str:
    """
    Analyse the textual content of a pitch deck and return structured feedback.
    content: extracted text from PDF/DOCX (use extract_text_from_pdf first).
    Returns JSON feedback on completeness and quality.
    """
    required_sections = [
        "problem", "solution", "market", "business model",
        "traction", "team", "financials", "ask"
    ]
    content_lower = content.lower()

    found = [s for s in required_sections if s in content_lower]
    missing = [s for s in required_sections if s not in content_lower]
    completeness = int((len(found) / len(required_sections)) * 100)

    return json.dumps({
        "completeness_score": completeness,
        "sections_found": found,
        "sections_missing": missing,
        "recommendation": (
            "Strong pitch deck — covers all essential sections."
            if completeness >= 80
            else f"Missing sections: {', '.join(missing)}. Add these to strengthen your pitch."
        ),
    })
