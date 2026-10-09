"""
api/rag.py
───────────
RAG knowledge base API — ingest documents and run semantic search.
"""

from __future__ import annotations

import base64
import io
from pathlib import Path

import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from db.postgres import get_db
from rag.retriever import hybrid_search
from rag.ingest import ingest_file

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/rag", tags=["rag"])


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    source_type: str | None = None


@router.post("/search")
async def search(req: SearchRequest, pool=Depends(get_db)):
    """Hybrid semantic + keyword search over the knowledge base."""
    results = await hybrid_search(req.query, top_k=req.top_k, pool=pool)
    return {"query": req.query, "results": results, "count": len(results)}


@router.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    source_type: str = Form(default="document"),
    pool=Depends(get_db),
):
    """
    Upload and ingest a document (PDF, DOCX, TXT) into the knowledge base.
    Protected — should only be called by admin users in production.
    """
    allowed_types = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    content = await file.read()
    suffix = Path(file.filename or "doc.txt").suffix

    # Write to a temp file for processing
    import tempfile, os
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        count = await ingest_file(tmp_path, source_type, pool, metadata={"original_name": file.filename})
    finally:
        os.unlink(tmp_path)

    return {"success": True, "filename": file.filename, "chunks_inserted": count}
