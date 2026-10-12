"""
core/tools/search.py
─────────────────────
Web search tool using Tavily API.
Falls back to a simple Google-style scrape if Tavily key is not set.
"""

from __future__ import annotations

import json

import structlog
from langchain_core.tools import tool

logger = structlog.get_logger(__name__)


@tool
async def web_search(query: str, max_results: int = 5) -> str:
    """
    Search the web for current market data, competitor info, funding schemes,
    and industry reports relevant to a startup's domain.

    Returns JSON list of {title, url, snippet}.
    """
    from config import get_settings
    settings = get_settings()

    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            raw_results = list(ddgs.text(query, max_results=max_results))
            
        results = []
        for r in raw_results:
            results.append({
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", "")
            })
        
        return json.dumps({
            "query": query,
            "results": results,
            "answer": f"Found {len(results)} results from web search."
        })
    except Exception as e:
        logger.error("web_search_failed", error=str(e))
        return json.dumps({
            "query": query,
            "results": [],
            "answer": f"Web search failed: {str(e)}"
        })
