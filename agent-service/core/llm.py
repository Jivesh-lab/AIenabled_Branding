"""
core/llm.py
───────────
Singleton LLM and embedding model factories.
OpenRouter is OpenAI-API-compatible — we point the base_url at it.
"""

from __future__ import annotations

from functools import lru_cache

from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from config import get_settings


class LLMNotConfigured(RuntimeError):
    """Raised when no LLM key is set. Callers fall back to rule-based behaviour and say so."""

    def __init__(self) -> None:
        super().__init__("The AI model is not configured. Add LLM_API_KEY to enable AI-written assessments and answers.")


@lru_cache(maxsize=16)
def get_llm(temperature: float = 0.2) -> ChatOpenAI:
    """
    Return a cached ChatOpenAI instance configured for OpenRouter.

    OpenRouter supports streaming natively; the SSE transport layer
    in the FastAPI route handles chunked delivery to the browser.
    """
    settings = get_settings()
    if not settings.llm_configured:
        raise LLMNotConfigured()
    return ChatOpenAI(
        model=settings.openrouter_model,
        temperature=temperature,
        openai_api_key=settings.llm_key,
        openai_api_base=settings.openrouter_base_url,
        streaming=True,
        max_tokens=settings.max_tokens_per_run,
        # OpenRouter passes these headers to the model provider
        default_headers={
            "HTTP-Referer": "https://aai-incubation.in",
            "X-Title": "AAI Incubation Centre",
        },
    )


@lru_cache(maxsize=1)
def get_embeddings() -> OpenAIEmbeddings:
    """
    Return a cached OpenAIEmbeddings instance via OpenRouter.
    Used for RAG ingestion and semantic retrieval.
    """
    settings = get_settings()
    if not settings.llm_configured:
        raise LLMNotConfigured()
    return OpenAIEmbeddings(
        model=settings.openrouter_embed_model,
        openai_api_key=settings.llm_key,
        openai_api_base=settings.openrouter_base_url,
    )
