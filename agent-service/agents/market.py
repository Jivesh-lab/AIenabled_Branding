"""
agents/market.py
─────────────────
Market Validation Agent

Responsibilities:
- Market research (TAM/SAM/SOM)
- Competitor analysis
- Target customer identification
- Problem-solution fit assessment
- Go-to-market strategy suggestions
"""

from __future__ import annotations

import json

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from core.llm import get_llm
from core.state import AgentState
from core.tools.search import web_search
from core.tools.database import save_agent_analysis

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are the Market Validation Agent at an AI-powered Incubation Centre.

Your task is to validate the market opportunity for a startup idea.

Output ONLY valid JSON:
{
  "market_size": {
    "tam": {"value": "₹500 Cr", "description": "Total Addressable Market"},
    "sam": {"value": "₹50 Cr", "description": "Serviceable Addressable Market"},
    "som": {"value": "₹5 Cr", "description": "Serviceable Obtainable Market (Year 1)"}
  },
  "competitors": [
    {"name": "...", "description": "...", "weakness": "...", "differentiator": "..."}
  ],
  "target_customers": [
    {"segment": "...", "pain_point": "...", "willingness_to_pay": "high|medium|low"}
  ],
  "problem_solution_fit": 68,
  "opportunity_score": 72,
  "go_to_market": {
    "primary_channel": "...",
    "early_adopters": "...",
    "key_partnerships": ["...", "..."]
  },
  "risks": ["...", "..."],
  "summary": "2–3 sentence narrative"
}

Use real data from the provided search results. Be realistic, not optimistic."""


async def run_market_agent(state: AgentState) -> AgentState:
    """LangGraph node — market validation."""
    logger.info("market_agent_start", session=state["session_id"])

    sector = state["entities"].get("sector", "")
    search_query = f"{state['user_input']} {sector} market size competitors India 2024"
    search_results = await web_search.ainvoke({"query": search_query, "max_results": 6})

    context = f"""Startup/Idea: {state['user_input']}
Sector: {sector}
Entities: {json.dumps(state.get('entities', {}))}

Web search results:
{search_results}"""

    if state.get("research_output"):
        context += f"\n\nResearch analysis (for context):\n{json.dumps(state['research_output'], default=str)}"

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
            output = {"summary": response.content, "opportunity_score": 50, "problem_solution_fit": 50}

    state["market_output"] = output

    if state.get("startup_id"):
        await save_agent_analysis.ainvoke({
            "startup_id": state["startup_id"],
            "analysis_type": "market",
            "data": output,
        })

    logger.info("market_agent_done", opportunity_score=output.get("opportunity_score"))
    return state
