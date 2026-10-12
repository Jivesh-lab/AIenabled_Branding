"""
api/agents.py
──────────────
Individual agent endpoints — useful for calling a single specialist agent
directly (e.g., from admin dashboard or automated triggers).
"""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from agents.research import run_research_agent
from agents.prototype import run_prototype_agent
from agents.market import run_market_agent
from agents.incubation import run_incubation_agent
from agents.investor import run_investor_agent
from core.state import AgentState
from db.postgres import get_db

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/agents", tags=["agents"])


def _base_state(user_id: str, message: str, startup_id: str | None) -> AgentState:
    return {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_role": "student",
        "startup_id": startup_id,
        "messages": [],
        "user_input": message,
        "intent": None,
        "entities": {},
        "planned_agents": [],
        "active_agent": None,
        "research_output": None,
        "prototype_output": None,
        "market_output": None,
        "formation_output": None,
        "incubation_output": None,
        "investor_output": None,
        "tool_results": [],
        "rag_chunks": [],
        "readiness_score": None,
        "readiness_breakdown": None,
        "final_response": None,
        "recommendations": [],
        "requires_human_review": False,
        "error": None,
        "tokens_used": 0,
        "run_metadata": {},
    }


class AgentRequest(BaseModel):
    user_id: str
    message: str
    startup_id: str | None = None
    entities: dict[str, Any] = {}


@router.post("/research")
async def research(req: AgentRequest):
    """Run only the Research Analysis Agent."""
    state = _base_state(req.user_id, req.message, req.startup_id)
    state["entities"] = req.entities
    result = await run_research_agent(state)
    return {"output": result["research_output"], "session_id": state["session_id"]}


@router.post("/prototype")
async def prototype(req: AgentRequest):
    """Run only the Prototype Evaluation Agent."""
    state = _base_state(req.user_id, req.message, req.startup_id)
    state["entities"] = req.entities
    result = await run_prototype_agent(state)
    return {"output": result["prototype_output"], "session_id": state["session_id"]}


@router.post("/market")
async def market(req: AgentRequest):
    """Run only the Market Validation Agent."""
    state = _base_state(req.user_id, req.message, req.startup_id)
    state["entities"] = req.entities
    result = await run_market_agent(state)
    return {"output": result["market_output"], "session_id": state["session_id"]}


@router.post("/incubation")
async def incubation(req: AgentRequest, pool=Depends(get_db)):
    """Run the Incubation Agent — triggers auto readiness score if startup_id provided."""
    state = _base_state(req.user_id, req.message, req.startup_id)
    state["entities"] = req.entities
    result = await run_incubation_agent(state)
    return {
        "output": result["incubation_output"],
        "readiness_score": result.get("readiness_score"),
        "readiness_breakdown": result.get("readiness_breakdown"),
        "session_id": state["session_id"],
    }


@router.post("/investor")
async def investor(req: AgentRequest):
    """Run the Investor Matching Agent."""
    state = _base_state(req.user_id, req.message, req.startup_id)
    state["entities"] = req.entities
    result = await run_investor_agent(state)
    return {"output": result["investor_output"], "session_id": state["session_id"]}


@router.get("/startups/{startup_id}/readiness")
async def get_readiness(startup_id: str, pool=Depends(get_db)):
    """Return the current readiness score and breakdown for a startup."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT readiness_score, readiness_breakdown, stage, name FROM startups WHERE id = $1::uuid",
            startup_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Startup not found")
    return {
        "startup_id": startup_id,
        "name": row["name"],
        "stage": row["stage"],
        "readiness_score": row["readiness_score"],
        "readiness_breakdown": row["readiness_breakdown"] or {},
    }
