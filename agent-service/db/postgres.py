"""
db/postgres.py
──────────────
Async PostgreSQL connection pool using asyncpg.
Provides a FastAPI lifespan-managed pool and a helper dependency.
"""

from __future__ import annotations

import asyncpg
import structlog
from fastapi import Request

from config import get_settings

logger = structlog.get_logger(__name__)


async def create_pool() -> asyncpg.Pool:
    """Create and return the asyncpg connection pool."""
    settings = get_settings()
    pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )
    logger.info("postgres_pool_created", dsn=settings.database_url.split("@")[-1])
    return pool


async def close_pool(pool: asyncpg.Pool) -> None:
    """Gracefully close the pool."""
    await pool.close()
    logger.info("postgres_pool_closed")


async def apply_schema(pool: asyncpg.Pool, schema_path: str = "db/schema.sql") -> None:
    """Apply SQL schema file (idempotent — uses CREATE IF NOT EXISTS)."""
    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()
    async with pool.acquire() as conn:
        await conn.execute(sql)
    logger.info("schema_applied", path=schema_path)


# ── FastAPI dependency ────────────────────────────────────────────────────────

async def get_db(request: Request) -> asyncpg.Pool:
    """Inject the pool from app state into route handlers."""
    return request.app.state.db_pool
