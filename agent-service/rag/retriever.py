"""
rag/retriever.py
─────────────────
Vector similarity retrieval from the knowledge_base table (pgvector).
Supports hybrid retrieval: semantic (vector) + keyword (full-text search).
"""

from __future__ import annotations

import json
from typing import Any

import asyncpg
import structlog

from core.llm import get_embeddings
from core.tools.database import _get_pool

logger = structlog.get_logger(__name__)


async def semantic_search(
    query: str,
    top_k: int = 5,
    source_type: str | None = None,
    pool: asyncpg.Pool | None = None,
) -> list[dict[str, Any]]:
    """
    Embed the query and retrieve the top_k most similar knowledge base chunks.
    Uses cosine similarity with the pgvector HNSW index.
    """
    db = pool or _get_pool()
    if db is None:
        raise RuntimeError("DB pool not ready")

    embeddings = get_embeddings()
    query_vector = await embeddings.aembed_query(query)
    vector_str = f"[{','.join(str(v) for v in query_vector)}]"

    sql = """
        SELECT id, source, source_type, title, content, metadata,
               1 - (embedding <=> $1::vector) AS similarity
        FROM knowledge_base
        WHERE ($2::text IS NULL OR source_type = $2)
        ORDER BY embedding <=> $1::vector
        LIMIT $3
    """
    async with db.acquire() as conn:
        rows = await conn.fetch(sql, vector_str, source_type, top_k)

    results = []
    for row in rows:
        results.append({
            "id": str(row["id"]),
            "source": row["source"],
            "source_type": row["source_type"],
            "title": row["title"],
            "content": row["content"],
            "similarity": float(row["similarity"]),
            "metadata": row["metadata"] or {},
        })

    logger.info("rag_retrieved", query=query[:50], results=len(results))
    return results


async def hybrid_search(
    query: str,
    top_k: int = 5,
    pool: asyncpg.Pool | None = None,
) -> list[dict[str, Any]]:
    """
    Hybrid retrieval: semantic + BM25-style full-text search.
    Results are merged and deduplicated by id.
    """
    # Semantic results
    semantic = await semantic_search(query, top_k=top_k, pool=pool)
    semantic_ids = {r["id"] for r in semantic}

    # Full-text results
    db = pool or _get_pool()
    if db is None:
        return semantic

    async with db.acquire() as conn:
        fts_rows = await conn.fetch(
            """
            SELECT id, source, source_type, title, content, metadata,
                   ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) AS rank
            FROM knowledge_base
            WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
            ORDER BY rank DESC
            LIMIT $2
            """,
            query,
            top_k,
        )

    fts_results = [
        {
            "id": str(r["id"]),
            "source": r["source"],
            "source_type": r["source_type"],
            "title": r["title"],
            "content": r["content"],
            "similarity": float(r["rank"]),
            "metadata": r["metadata"] or {},
        }
        for r in fts_rows
        if str(r["id"]) not in semantic_ids
    ]

    # Merge: semantic first, then unique FTS results
    combined = semantic + fts_results
    return combined[:top_k]
