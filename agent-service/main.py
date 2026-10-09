"""
main.py
────────
FastAPI application entry point for the AAI Incubation Centre Agent Service.

Startup sequence:
  1. Load config (Pydantic Settings from .env)
  2. Create asyncpg PostgreSQL pool
  3. Apply database schema (idempotent)
  4. Inject pool into tool layer
  5. Register all API routers
  6. Start Uvicorn

Runs on port 8000 alongside:
  - Express backend  :5000  (auth, users, admin)
  - Next.js frontend :3000  (web UI)
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import structlog
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import chat_router, agents_router, rag_router, applications_router
from config import get_settings
from core.tools.database import set_pool
from db.postgres import apply_schema, close_pool, create_pool

logger = structlog.get_logger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start-up and shutdown logic."""
    settings = get_settings()
    logger.info("agent_service_starting", port=settings.agent_service_port, env=settings.environment)

    # Create DB pool
    pool = await create_pool()
    app.state.db_pool = pool

    # Inject pool into the database tool (used by LangChain tools)
    set_pool(pool)

    # Apply schema (CREATE IF NOT EXISTS — safe to run on every boot)
    await apply_schema(pool)

    logger.info("agent_service_ready")
    yield

    # Shutdown
    logger.info("agent_service_shutting_down")
    await close_pool(pool)


# ── App ───────────────────────────────────────────────────────────────────────

settings = get_settings()

app = FastAPI(
    title="AAI Incubation Centre — Agent Service",
    description="LangGraph-powered multi-agent AI backend for the Incubation Centre",
    version="1.0.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# ── CORS (allow Next.js frontend) ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(chat_router)
app.include_router(agents_router)
app.include_router(rag_router)
app.include_router(applications_router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["health"])
async def health():
    return {
        "status": "ok",
        "service": "agent-service",
        "version": "1.0.0",
        "environment": settings.environment,
    }


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.agent_service_host,
        port=settings.agent_service_port,
        reload=settings.is_development,
        log_level=settings.log_level,
    )
