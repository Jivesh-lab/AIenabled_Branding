"""
agents/incubation.py
────────────────────
Incubation Agent

Responsibilities:
- Check eligibility against incubation criteria
- Evaluate application completeness
- Recommend mentors
- Define milestone plan
- Suggest resources & funding schemes
- Auto-compute startup readiness score (triggers on submission)
"""

from __future__ import annotations

import json

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from core.llm import get_llm
from core.state import AgentState
from core.tools.database import update_readiness_score

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are the Incubation Agent at an AI-powered Incubation Centre.

Evaluate whether a startup is ready for incubation and define their support plan.

Output ONLY valid JSON:
{
  "eligibility": {
    "is_eligible": true,
    "score": 78,
    "criteria_met": ["...", "..."],
    "criteria_failed": ["...", "..."],
    "conditions": ["...", "..."]
  },
  "recommended_mentors": [
    {"domain": "...", "expertise": ["...", "..."], "reason": "..."}
  ],
  "milestone_plan": [
    {"week": 4, "milestone": "...", "success_criteria": "..."},
    {"week": 8, "milestone": "...", "success_criteria": "..."},
    {"week": 12, "milestone": "...", "success_criteria": "..."},
    {"week": 24, "milestone": "...", "success_criteria": "..."}
  ],
  "funding_schemes": [
    {
      "name": "DST NIDHI Seed Fund",
      "amount": "₹5–25 Lakhs",
      "eligibility_match": "high|medium|low",
      "application_url": "..."
    }
  ],
  "resources_needed": ["...", "..."],
  "incubation_readiness": 74,
  "summary": "2–3 sentence assessment"
}

Indian funding schemes to consider: DST NIDHI, BIRAC BIG, ICMR Young Scientist,
Startup India Seed Fund, MSME Technology Development, Atal Innovation Mission."""


async def run_incubation_agent(state: AgentState) -> AgentState:
    """LangGraph node — incubation eligibility and milestone planning."""
    logger.info("incubation_agent_start", session=state["session_id"])

    context = f"Startup: {state['user_input']}\n"
    for key in ["research_output", "prototype_output", "market_output", "formation_output"]:
        if state.get(key):
            context += f"\n{key}:\n{json.dumps(state[key], default=str)}"

    llm = get_llm(temperature=0.2)
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
            output = {"summary": response.content, "incubation_readiness": 50}

    state["incubation_output"] = output

    # Auto-compute and persist the startup readiness score if we have a startup_id
    if state.get("startup_id"):
        score = output.get("incubation_readiness", state.get("readiness_score", 0))
        breakdown = {
            "research": state.get("research_output", {}).get("novelty_score", 0),
            "prototype": state.get("prototype_output", {}).get("technical_feasibility", 0),
            "market": state.get("market_output", {}).get("opportunity_score", 0),
            "business_model": state.get("formation_output", {}).get("model_score", 0),
            "incubation_eligibility": output.get("eligibility", {}).get("score", 0),
        }
        await update_readiness_score.ainvoke({
            "startup_id": state["startup_id"],
            "score": score,
            "breakdown": breakdown,
        })
        state["readiness_score"] = score
        state["readiness_breakdown"] = breakdown

    logger.info("incubation_agent_done", readiness=output.get("incubation_readiness"))
    return state
