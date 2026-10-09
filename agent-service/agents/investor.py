"""
agents/investor.py
──────────────────
Investor Matching Agent

Responsibilities:
- Find suitable investors (angel, VC, govt, corporate)
- Match by domain, stage, geography
- Rank and recommend
- Prepare investor profile
- Arrange pitch meeting suggestions
"""

from __future__ import annotations

import json

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from core.llm import get_llm
from core.state import AgentState
from core.tools.search import web_search

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are the Investor Matching Agent at an AI-powered Incubation Centre in India.

Match the startup with suitable investors from the Indian ecosystem.

Output ONLY valid JSON:
{
  "matched_investors": [
    {
      "name": "...",
      "type": "angel | vc | government | corporate | family_office",
      "focus_sectors": ["...", "..."],
      "stage_preference": "pre-seed | seed | series-a | ...",
      "typical_ticket": "₹X – ₹Y",
      "match_score": 82,
      "match_reason": "...",
      "portfolio_companies": ["...", "..."],
      "contact_approach": "LinkedIn | Email | AngelList | Intro"
    }
  ],
  "pitch_preparation": {
    "key_metrics_to_highlight": ["...", "..."],
    "investor_concerns_to_address": ["...", "..."],
    "suggested_meeting_format": "..."
  },
  "investor_profile_summary": "2–3 sentence startup profile for investor outreach",
  "next_steps": ["...", "...", "..."]
}

Focus on Indian investors: Indian Angel Network, Sequoia India, Blume Ventures, 
Kalaari Capital, Nexus Venture Partners, 3one4 Capital, Elevation Capital,
govt schemes: SIDBI, NABARD, Startup India."""


async def run_investor_agent(state: AgentState) -> AgentState:
    """LangGraph node — investor discovery and matching."""
    logger.info("investor_agent_start", session=state["session_id"])

    sector = state["entities"].get("sector", "")
    stage = state["entities"].get("stage", "seed")
    search_query = f"investors {sector} startups India {stage} 2024 portfolio"
    search_results = await web_search.ainvoke({"query": search_query, "max_results": 5})

    context = f"""Startup: {state['user_input']}
Sector: {sector} | Stage: {stage}

Market analysis:
{json.dumps(state.get('market_output', {}), default=str)}

Investor search results:
{search_results}"""

    llm = get_llm(temperature=0.3)
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
            output = {"investor_profile_summary": response.content, "matched_investors": []}

    state["investor_output"] = output
    logger.info("investor_agent_done", matches=len(output.get("matched_investors", [])))
    return state
