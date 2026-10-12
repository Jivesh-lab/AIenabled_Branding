"""
rag/ingest.py
──────────────
Document ingestion pipeline for the knowledge base.

Pipeline:
  File (PDF/DOCX/TXT) → text extraction
                      → chunking (fixed-size with overlap)
                      → embedding (OpenRouter/OpenAI)
                      → INSERT into knowledge_base (pgvector)

Usage:
  python -m rag.ingest --file path/to/doc.pdf --source-type policy
  python -m rag.ingest --dir path/to/docs/ --source-type scheme
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
from pathlib import Path
from typing import Any

import asyncpg
import structlog

from config import get_settings
from core.llm import get_embeddings
from db.postgres import create_pool

logger = structlog.get_logger(__name__)


def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> list[str]:
    """
    Simple word-boundary chunking with overlap.
    chunk_size and overlap are in approximate word counts.
    """
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return [c for c in chunks if len(c.strip()) > 50]


def extract_text(file_path: Path) -> str:
    """Extract text from PDF, DOCX, or plain text files."""
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(file_path))
        return "\n\n".join(page.extract_text() or "" for page in reader.pages)
    elif suffix in (".docx", ".doc"):
        from docx import Document
        doc = Document(str(file_path))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    elif suffix == ".txt":
        return file_path.read_text(encoding="utf-8")
    else:
        raise ValueError(f"Unsupported file type: {suffix}")


async def ingest_file(
    file_path: Path,
    source_type: str,
    pool: asyncpg.Pool,
    metadata: dict[str, Any] | None = None,
) -> int:
    """
    Ingest a single file into the knowledge base.
    Returns the number of chunks inserted.
    """
    settings = get_settings()
    logger.info("ingest_start", file=str(file_path), source_type=source_type)

    text = extract_text(file_path)
    chunks = chunk_text(text, chunk_size=settings.rag_chunk_size, overlap=settings.rag_chunk_overlap)
    embeddings_model = get_embeddings()

    inserted = 0
    batch_size = 10
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        vectors = await embeddings_model.aembed_documents(batch)

        async with pool.acquire() as conn:
            for chunk_text_val, vector in zip(batch, vectors):
                vector_str = f"[{','.join(str(v) for v in vector)}]"
                await conn.execute(
                    """
                    INSERT INTO knowledge_base (source, source_type, title, content, embedding, metadata)
                    VALUES ($1, $2, $3, $4, $5::vector, $6)
                    """,
                    str(file_path.name),
                    source_type,
                    file_path.stem.replace("_", " ").title(),
                    chunk_text_val,
                    vector_str,
                    json.dumps(metadata or {}),
                )
                inserted += 1

        logger.info("ingest_batch", file=file_path.name, batch=i // batch_size + 1, chunks=inserted)

    logger.info("ingest_done", file=file_path.name, total_chunks=inserted)
    return inserted


async def ingest_directory(
    dir_path: Path,
    source_type: str,
    pool: asyncpg.Pool,
) -> dict[str, int]:
    """Ingest all supported files from a directory."""
    supported = {".pdf", ".docx", ".txt"}
    results = {}
    for file_path in dir_path.iterdir():
        if file_path.suffix.lower() in supported:
            try:
                count = await ingest_file(file_path, source_type, pool)
                results[file_path.name] = count
            except Exception as exc:
                logger.error("ingest_file_failed", file=str(file_path), error=str(exc))
                results[file_path.name] = -1
    return results


# ── CLI ────────────────────────────────────────────────────────────────────────

async def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest documents into RAG knowledge base")
    parser.add_argument("--file", type=Path, help="Path to a single file")
    parser.add_argument("--dir", type=Path, help="Path to a directory of files")
    parser.add_argument(
        "--source-type",
        default="document",
        choices=["document", "policy", "scheme", "report", "template"],
    )
    args = parser.parse_args()

    pool = await create_pool()
    try:
        if args.file:
            count = await ingest_file(args.file, args.source_type, pool)
            print(f"✅ Ingested {count} chunks from {args.file.name}")
        elif args.dir:
            results = await ingest_directory(args.dir, args.source_type, pool)
            for fname, count in results.items():
                status = "✅" if count >= 0 else "❌"
                print(f"{status} {fname}: {count} chunks")
        else:
            parser.print_help()
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
