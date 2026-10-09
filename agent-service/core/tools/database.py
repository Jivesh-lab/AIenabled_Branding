"""
core/tools/database.py
──────────────────────
LangChain-compatible tool for reading/writing startup & incubation data
from the PostgreSQL database.
"""

from __future__ import annotations

import json
from typing import Any

import asyncpg
import structlog
from langchain_core.tools import tool

logger = structlog.get_logger(__name__)

# Pool is injected at runtime — set by main.py after pool creation
_pool: asyncpg.Pool | None = None


def set_pool(pool: asyncpg.Pool) -> None:
    """Called from main.py after the pool is ready."""
    global _pool
    _pool = pool


def _get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialised — call set_pool() first.")
    return _pool


# ── Tools ─────────────────────────────────────────────────────────────────────

@tool
async def get_startup_info(startup_id: str) -> str:
    """
    Retrieve full startup profile from the database.
    Returns JSON string with startup fields, readiness score, and latest milestone.
    """
    pool = _get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT s.*,
                   array_agg(row_to_json(m)) FILTER (WHERE m.id IS NOT NULL) AS milestones
            FROM startups s
            LEFT JOIN milestones m ON m.startup_id = s.id
            WHERE s.id = $1
            GROUP BY s.id
            """,
            startup_id,
        )
    if not row:
        return json.dumps({"error": f"Startup {startup_id} not found"})
    return json.dumps(dict(row), default=str)


@tool
async def update_readiness_score(startup_id: str, score: int, breakdown: dict[str, Any]) -> str:
    """
    Update the startup readiness score and per-dimension breakdown.
    Score must be 0–100. Breakdown keys: research, prototype, market, business_model, team.
    """
    pool = _get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE startups
            SET readiness_score = $1, readiness_breakdown = $2, updated_at = NOW()
            WHERE id = $3
            """,
            max(0, min(100, score)),
            json.dumps(breakdown),
            startup_id,
        )
    logger.info("readiness_score_updated", startup_id=startup_id, score=score)
    return json.dumps({"success": True, "score": score, "breakdown": breakdown})


@tool
async def list_pending_applications(limit: int = 20) -> str:
    """
    List incubation applications currently under review.
    Returns JSON array of application summaries.
    """
    pool = _get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT a.id, a.status, a.completeness, a.submitted_at,
                   s.name AS startup_name, s.stage, s.sector
            FROM applications a
            JOIN startups s ON s.id = a.startup_id
            WHERE a.status = 'submitted'
            ORDER BY a.submitted_at ASC
            LIMIT $1
            """,
            limit,
        )
    return json.dumps([dict(r) for r in rows], default=str)


@tool
async def save_agent_analysis(
    startup_id: str,
    analysis_type: str,
    data: dict[str, Any],
) -> str:
    """
    Persist an agent's analysis result to the appropriate table.
    analysis_type: 'research' | 'market' | 'prototype'
    """
    table_map = {
        "research": "research_analyses",
        "market": "market_validations",
        "prototype": "prototype_evaluations",
    }
    table = table_map.get(analysis_type)
    if not table:
        return json.dumps({"error": f"Unknown analysis_type: {analysis_type}"})

    pool = _get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"""
            INSERT INTO {table} (startup_id, full_report)
            VALUES ($1, $2)
            RETURNING id
            """,
            startup_id,
            json.dumps(data),
        )
    return json.dumps({"success": True, "id": str(row["id"])})
