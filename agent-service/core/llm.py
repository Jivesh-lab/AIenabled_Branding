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


@lru_cache(maxsize=1)
def get_llm(temperature: float = 0.2) -> ChatOpenAI:
    """
    Return a cached ChatOpenAI instance configured for OpenRouter.

    OpenRouter supports streaming natively; the SSE transport layer
    in the FastAPI route handles chunked delivery to the browser.
    """
    settings = get_settings()
    return ChatOpenAI(
        model=settings.openrouter_model,
        temperature=temperature,
        openai_api_key=settings.openrouter_api_key,
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
    return OpenAIEmbeddings(
        model=settings.openrouter_embed_model,
        openai_api_key=settings.openrouter_api_key,
        openai_api_base=settings.openrouter_base_url,
    )
