"""
config/settings.py
──────────────────
Centralised, validated settings using Pydantic BaseSettings.
All values come from the .env file (or environment variables).
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Server ────────────────────────────────────────────────────────────────
    agent_service_port: int = 8000
    agent_service_host: str = "0.0.0.0"
    environment: str = "development"
    log_level: str = "info"

    # ── LLM (OpenRouter) ──────────────────────────────────────────────────────
    openrouter_api_key: str
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "meta-llama/llama-3.1-8b-instruct:free"
    openrouter_embed_model: str = "openai/text-embedding-ada-002"

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "aai_incubation"
    postgres_user: str = "aai_user"
    postgres_password: str
    database_url: str

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Auth (shared with Express) ────────────────────────────────────────────
    jwt_secret: str

    # ── SMTP ──────────────────────────────────────────────────────────────────
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    smtp_from_name: str = "AAI Incubation Centre"
    smtp_from_email: str

    # ── Web Search ────────────────────────────────────────────────────────────
    tavily_api_key: str = ""

    # ── RAG ───────────────────────────────────────────────────────────────────
    embedding_dim: int = 1536
    rag_chunk_size: int = 512
    rag_chunk_overlap: int = 50

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    max_agent_runs_per_user_per_hour: int = 20
    max_tokens_per_run: int = 4096

    # ── CORS ──────────────────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:3000"
    express_api_url: str = "http://localhost:5000"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    """Return cached Settings singleton. Use as FastAPI dependency."""
    return Settings()  # type: ignore[call-arg]
