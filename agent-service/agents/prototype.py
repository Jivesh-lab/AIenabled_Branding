"""
agents/prototype.py
───────────────────
Prototype Evaluation Agent

Responsibilities:
- Assess technical feasibility
- Identify improvement areas
- Suggest MVP features
- Assign TRL (Technology Readiness Level 1–9)
- Generate development roadmap
"""

from __future__ import annotations

import json

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from core.llm import get_llm
from core.state import AgentState
from core.tools.database import save_agent_analysis

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are the Prototype Evaluation Agent at an AI-powered Incubation Centre.

Evaluate the startup's prototype or concept and output:
1. Technical feasibility score (0–100)
2. Current TRL level (1–9, Technology Readiness Level)
3. Top improvement areas (3–5 specific, actionable items)
4. MVP feature suggestions (what to build next)
5. Development roadmap (3 phases with estimated timelines)

Respond ONLY with valid JSON:
{
  "technical_feasibility": 72,
  "trl_level": 3,
  "improvement_areas": ["...", "..."],
  "mvp_features": [{"feature": "...", "priority": "high|medium|low", "reason": "..."}],
  "development_roadmap": [
    {"phase": 1, "title": "...", "duration": "6 weeks", "deliverables": ["..."]},
    {"phase": 2, "title": "...", "duration": "8 weeks", "deliverables": ["..."]},
    {"phase": 3, "title": "...", "duration": "12 weeks", "deliverables": ["..."]}
  ],
  "summary": "2-3 sentence narrative"
}

TRL Guide:
1=Basic research, 2=Concept formulated, 3=Experimental PoC,
4=Lab validation, 5=Relevant env validation, 6=Demo in relevant env,
7=System prototype, 8=System complete, 9=Proven in operations."""


async def run_prototype_agent(state: AgentState) -> AgentState:
    """LangGraph node — evaluate prototype/concept."""
    logger.info("prototype_agent_start", session=state["session_id"])

    context = state["user_input"]
    if state.get("research_output"):
        context += f"\n\nPrior research findings:\n{json.dumps(state['research_output'], default=str)}"

    llm = get_llm(temperature=0.2)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Evaluate this prototype/concept:\n\n{context}"),
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
            output = {"summary": response.content, "technical_feasibility": 50, "trl_level": 2}

    state["prototype_output"] = output

    if state.get("startup_id"):
        await save_agent_analysis.ainvoke({
            "startup_id": state["startup_id"],
            "analysis_type": "prototype",
            "data": output,
        })

    logger.info("prototype_agent_done", trl=output.get("trl_level"), feasibility=output.get("technical_feasibility"))
    return state
