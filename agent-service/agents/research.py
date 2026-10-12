"""
agents/research.py
──────────────────
Research Analysis Agent

Responsibilities:
- Understand research novelty
- Find real-world use cases
- Check existing solutions
- Suggest domains / application areas
- Output: problem definition, application areas, novelty score
"""

from __future__ import annotations

import json

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from core.llm import get_llm
from core.state import AgentState
from core.tools.search import web_search
from core.tools.database import get_startup_info, save_agent_analysis

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are the Research Analysis Agent at an AI-powered Incubation Centre.

Your job is to analyse a startup's research/idea and produce:
1. A clear problem definition
2. Real-world application areas (3–5)
3. Existing solutions in the market
4. Novelty score (0–100)
5. Suggested domains / sectors

Be concise, evidence-based, and constructive. Format output as valid JSON:
{
  "problem_definition": "...",
  "application_areas": ["...", "..."],
  "existing_solutions": [{"name": "...", "description": "...", "weakness": "..."}],
  "novelty_score": 75,
  "suggested_domains": ["...", "..."],
  "summary": "2-3 sentence narrative"
}"""


async def run_research_agent(state: AgentState) -> AgentState:
    """
    LangGraph node — run the Research Analysis Agent.
    Uses web search to ground findings, then LLM to synthesise.
    """
    logger.info("research_agent_start", session=state["session_id"])

    startup_context = ""
    if state.get("startup_id"):
        raw = await get_startup_info.ainvoke({"startup_id": state["startup_id"]})
        startup_context = f"\n\nStartup data from database:\n{raw}"

    # Ground with web search
    query = f"{state.get('user_input', '')} {state['entities'].get('sector', '')} startup competitors market"
    search_results = await web_search.ainvoke({"query": query.strip(), "max_results": 5})

    llm = get_llm(temperature=0.3)
    prompt = f"""Analyse this startup/research idea:

{state['user_input']}
{startup_context}

Market research data:
{search_results}

Entities detected: {json.dumps(state.get('entities', {}))}

Produce the research analysis JSON as specified."""

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ]

    response = await llm.ainvoke(messages)
    try:
        output = json.loads(response.content)
    except json.JSONDecodeError:
        # Extract JSON from markdown fences if present
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        try:
            output = json.loads(content)
        except json.JSONDecodeError:
            logger.warning("research_agent_parse_failed", raw=response.content[:200])
            output = {"summary": response.content, "novelty_score": 50}

    state["research_output"] = output

    # Persist to DB if we have a startup_id
    if state.get("startup_id"):
        await save_agent_analysis.ainvoke({
            "startup_id": state["startup_id"],
            "analysis_type": "research",
            "data": output,
        })

    logger.info("research_agent_done", novelty_score=output.get("novelty_score"))
    return state
