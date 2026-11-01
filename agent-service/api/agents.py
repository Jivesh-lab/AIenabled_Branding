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


@router.post("/application/validate")
async def validate_application_endpoint(submission: dict[str, Any]):
    """Check applications for missing, inconsistent, or invalid information before submission."""
    from agents.application_agent import validate_application_data
    result = validate_application_data(submission)
    return {"status": "success", "validation": result}


@router.post("/application/assess")
async def assess_application_endpoint(submission: dict[str, Any]):
    """Generate application summary, transparent assessment, and reviewer questions."""
    from agents.application_agent import assess_application
    result = await assess_application(submission)
    return {"status": "success", "assessment": result}


@router.post("/mentor-match")
async def mentor_match_endpoint(req: dict[str, Any]):
    """Recommend faculty and industry mentors based on domain, stage, challenges, and expertise."""
    from agents.mentor_matching import match_mentors_for_startup
    result = match_mentors_for_startup(
        domain=req.get("domain", ""),
        stage=req.get("stage", "Prototype"),
        challenges=req.get("challenges", ""),
        requested_expertise=req.get("requestedExpertise", []),
        existing_allocations=req.get("existingAllocations", []),
    )
    return result


@router.post("/workflow/coordinate")
async def workflow_coordinate_endpoint(req: dict[str, Any]):
    """Idempotently coordinate incubation tasks, meetings, reminders, and follow-ups."""
    from agents.workflow_agent import coordinate_workflow_action
    result = await coordinate_workflow_action(
        action_type=req.get("action_type", "assign_task"),
        target_id=req.get("target_id", "default"),
        payload=req.get("payload", {}),
        actor_id=req.get("actor_id", "system"),
        actor_role=req.get("actor_role", "admin"),
    )
    return result


@router.get("/workflow/history")
async def workflow_history_endpoint(target_id: str | None = None):
    """Retrieve activity history of coordinated incubation tasks and reminders."""
    from agents.workflow_agent import get_workflow_activity_history
    history = get_workflow_activity_history(target_id)
    return {"status": "success", "history": history, "count": len(history)}


@router.post("/monitoring/status")
async def monitoring_status_endpoint(req: dict[str, Any]):
    """Evaluate milestones, overdue items, risk indicators distinguishing measured facts from AI interpretations."""
    from agents.monitoring_agent import evaluate_startup_health
    # No defaults: a figure that is not supplied is "not tracked", never an invented healthy value.
    result = evaluate_startup_health(
        startup_name=req.get("startup_name", "Incubation Project"),
        stage=req.get("stage", "Unknown"),
        total_milestones=req.get("total_milestones"),
        completed_milestones=req.get("completed_milestones"),
        overdue_milestones=req.get("overdue_milestones"),
        tasks_completed=req.get("tasks_completed"),
        total_tasks=req.get("total_tasks"),
        days_since_last_report=req.get("days_since_last_report"),
        measured_metrics=req.get("measured_metrics", {}),
    )
    return result


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

