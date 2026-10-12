"""
agents/formation.py
────────────────────
Startup Formation Agent

Responsibilities:
- Business model generation (Canvas)
- Revenue model selection
- Go-to-market strategy
- Legal & company formation guidance
- Pitch deck structure creation
"""

from __future__ import annotations

import json

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from core.llm import get_llm
from core.state import AgentState

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are the Startup Formation Agent at an AI-powered Incubation Centre.

Help the startup define their business model, revenue strategy, and legal setup.

Output ONLY valid JSON:
{
  "business_model": {
    "value_proposition": "...",
    "customer_segments": ["...", "..."],
    "channels": ["...", "..."],
    "revenue_streams": ["...", "..."],
    "key_resources": ["...", "..."],
    "key_activities": ["...", "..."],
    "cost_structure": ["...", "..."]
  },
  "revenue_model": {
    "primary": "SaaS | Marketplace | Freemium | B2B | B2C | ...",
    "pricing": "...",
    "unit_economics": {
      "cac_estimate": "₹X",
      "ltv_estimate": "₹Y",
      "ltv_cac_ratio": "N:1"
    }
  },
  "legal_structure": {
    "recommended_entity": "Private Limited | LLP | OPC | Partnership",
    "reason": "...",
    "registration_steps": ["...", "..."],
    "ip_considerations": "..."
  },
  "pitch_deck_outline": [
    {"slide": 1, "title": "Problem", "content_hint": "..."},
    {"slide": 2, "title": "Solution", "content_hint": "..."},
    {"slide": 3, "title": "Market Size", "content_hint": "..."},
    {"slide": 4, "title": "Business Model", "content_hint": "..."},
    {"slide": 5, "title": "Traction", "content_hint": "..."},
    {"slide": 6, "title": "Team", "content_hint": "..."},
    {"slide": 7, "title": "Financials", "content_hint": "..."},
    {"slide": 8, "title": "Ask", "content_hint": "..."}
  ],
  "model_score": 68,
  "summary": "2–3 sentence narrative"
}"""


async def run_formation_agent(state: AgentState) -> AgentState:
    """LangGraph node — startup formation and business model."""
    logger.info("formation_agent_start", session=state["session_id"])

    context = f"Startup idea: {state['user_input']}\n"
    if state.get("research_output"):
        context += f"Research: {json.dumps(state['research_output'], default=str)}\n"
    if state.get("market_output"):
        context += f"Market: {json.dumps(state['market_output'], default=str)}\n"

    llm = get_llm(temperature=0.4)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=context),
    ]
    response = await llm.ainvoke(messages)

    try:
        output = json.loads(response.content)
    except json.JSONDecodeError:
        content = response.content
        if "```" in content:
            content = content.split("```")[1].replace("json\n", "").strip()
        try:
            output = json.loads(content)
        except json.JSONDecodeError:
            output = {"summary": response.content, "model_score": 50}

    state["formation_output"] = output
    logger.info("formation_agent_done", model_score=output.get("model_score"))
    return state
