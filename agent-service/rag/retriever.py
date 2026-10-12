"""
rag/retriever.py
─────────────────
Vector similarity retrieval from the knowledge_base table (pgvector).
Supports hybrid retrieval: semantic (vector) + keyword (full-text search).
"""

from __future__ import annotations

import json
import re
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
    Falls back gracefully to local knowledge base keyword retrieval if DB or embeddings are unavailable.
    """
    db = pool
    if db is None:
        try:
            db = _get_pool()
        except Exception:
            db = None
    if db is not None:
        try:
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

            if rows:
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
                logger.info("rag_retrieved_db", query=query[:50], results=len(results))
                return results
        except Exception as exc:
            logger.warning("rag_db_search_failed_using_fallback", error=str(exc))

    # Local Fallback Knowledge Search
    return _local_knowledge_search(query, top_k=top_k, source_type=source_type)


def _local_knowledge_search(
    query: str,
    top_k: int = 5,
    source_type: str | None = None,
) -> list[dict[str, Any]]:
    """Deterministic token-overlap ranking over curated knowledge documents."""
    from core.knowledge_base_data import INCUBATION_KNOWLEDGE_DOCS

    query_tokens = set(re.findall(r"\w+", query.lower()))
    scored_docs = []

    for doc in INCUBATION_KNOWLEDGE_DOCS:
        if source_type and doc.get("source_type") != source_type:
            continue
        text = f"{doc.get('title', '')} {doc.get('content', '')}".lower()
        doc_tokens = set(re.findall(r"\w+", text))
        overlap = len(query_tokens.intersection(doc_tokens))
        score = overlap / max(1, len(query_tokens))
        if overlap > 0:
            scored_docs.append({
                "id": doc["id"],
                "source": doc["source"],
                "source_type": doc.get("source_type", "document"),
                "title": doc.get("title", ""),
                "content": doc.get("content", ""),
                "similarity": round(float(score), 3),
                "metadata": doc.get("metadata", {}),
            })

    scored_docs.sort(key=lambda d: d["similarity"], reverse=True)
    if not scored_docs and INCUBATION_KNOWLEDGE_DOCS:
        # Return the top default policy docs if no exact query tokens match
        return [
            {
                "id": d["id"],
                "source": d["source"],
                "source_type": d.get("source_type", "document"),
                "title": d.get("title", ""),
                "content": d.get("content", ""),
                "similarity": 0.5,
                "metadata": d.get("metadata", {}),
            }
            for d in INCUBATION_KNOWLEDGE_DOCS[:top_k]
        ]
    return scored_docs[:top_k]


async def hybrid_search(
    query: str,
    top_k: int = 5,
    pool: asyncpg.Pool | None = None,
) -> list[dict[str, Any]]:
    """
    Hybrid retrieval: semantic + BM25-style full-text search.
    Results are merged and deduplicated by id with local fallback.
    """
    semantic = await semantic_search(query, top_k=top_k, pool=pool)
    semantic_ids = {r["id"] for r in semantic}

    db = pool
    if db is None:
        try:
            db = _get_pool()
        except Exception:
            db = None
    if db is None:
        return semantic

    try:
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
        combined = semantic + fts_results
        return combined[:top_k]
    except Exception as exc:
        logger.warning("hybrid_search_fts_failed", error=str(exc))
        return semantic

