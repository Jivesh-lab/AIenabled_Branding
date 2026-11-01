"""
agents/monitoring_agent.py
──────────────────────────
Agent 5: Monitoring Agent
Purpose: Monitor startup progress and help incubation managers intervene early.
Features:
- Tracks milestones, deadlines, overdue items, and task completion rates.
- Distinguishes measured facts (counts, dates, completions) from the rule-based interpretation of them.
- Generates transparent risk indicators: 'On Track', 'Needs Attention', 'At Risk'.
- NEVER fabricates data: with no milestones and no tasks the result is 'No Data', not 'On Track'. A figure that
  is not tracked (None) is skipped by the rules and reported as "not tracked", never defaulted to a healthy value.
- Suggests interventions as recommendations only; they are not official decisions and change no project status.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import structlog
from core.state import AgentState

logger = structlog.get_logger(__name__)

NO_DATA = "No Data"


def _signal(code: str, label: str, target: str) -> Dict[str, str]:
    """A machine-readable finding. `target` says which student workflow can address it."""
    return {"code": code, "label": label, "target": target}


def evaluate_startup_health(
    startup_name: str,
    stage: str,
    total_milestones: Optional[int] = None,
    completed_milestones: Optional[int] = None,
    overdue_milestones: Optional[int] = None,
    tasks_completed: Optional[int] = None,
    total_tasks: Optional[int] = None,
    days_since_last_report: Optional[int] = None,
    measured_metrics: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Evidence-based evaluation. Every argument except the name and stage may be None meaning "not tracked".
    """
    measured_metrics = measured_metrics or {}
    now_iso = datetime.now(timezone.utc).isoformat()

    milestones_tracked = bool(total_milestones)
    tasks_tracked = bool(total_tasks)
    milestone_pct = int(((completed_milestones or 0) / total_milestones) * 100) if milestones_tracked else None
    task_pct = int(((tasks_completed or 0) / total_tasks) * 100) if tasks_tracked else None

    # 1. Measured facts (strictly factual; None = not tracked)
    measured_facts = {
        "startup_name": startup_name,
        "stage": stage,
        "total_milestones": total_milestones if milestones_tracked else None,
        "completed_milestones": completed_milestones if milestones_tracked else None,
        "overdue_milestones": overdue_milestones if milestones_tracked else None,
        "milestone_completion_rate": milestone_pct,
        "tasks_completed": tasks_completed if tasks_tracked else None,
        "total_tasks": total_tasks if tasks_tracked else None,
        "task_completion_rate": task_pct,
        "days_since_last_progress_report": days_since_last_report,
        "reported_metrics": measured_metrics,
    }

    # No milestones and no tasks: there is nothing to assess. Missing data is not a healthy project.
    if not milestones_tracked and not tasks_tracked:
        return {
            "status": "success",
            "health_status": NO_DATA,
            "measured_facts": measured_facts,
            "ai_interpretation": {
                "health_status": NO_DATA,
                "summary": f"No milestones or tasks are recorded for {startup_name}, so its health cannot be assessed yet.",
                "risk_factors": [],
                "recommended_interventions": ["Record the project's milestones so progress can be monitored"],
                "signals": [_signal("no_data", "No milestones or tasks recorded", "milestones")],
                "requires_staff_confirmation": False,
                "evaluated_at": now_iso,
            },
        }

    overdue = overdue_milestones or 0
    risk_factors: List[str] = []
    signals: List[Dict[str, str]] = []
    recommended_interventions: List[str] = []

    # Rules
    # - At Risk:         overdue >= 2, or progress report overdue by > 30 days (when reports are tracked)
    # - Needs Attention: overdue == 1, or report > 14 days old, or task completion < 50% (when tasks exist)
    # - On Track:        none of the above AND there is data to say so
    stale_report = days_since_last_report is not None and days_since_last_report > 30
    aging_report = days_since_last_report is not None and days_since_last_report > 14
    low_tasks = task_pct is not None and task_pct < 50

    if overdue >= 2 or stale_report:
        health_status = "At Risk"
        if overdue >= 2:
            risk_factors.append(f"{overdue} milestones are past their due dates")
            signals.append(_signal("overdue_milestones", f"{overdue} overdue milestones", "milestones"))
        if stale_report:
            risk_factors.append(f"Progress report overdue by {days_since_last_report} days")
            signals.append(_signal("stale_report", "Progress report overdue", "meetings"))
        recommended_interventions.extend([
            "Schedule a milestone review with your Faculty Coordinator",
            "Review team bandwidth or lab resource bottlenecks",
            "Consider restructuring milestone deadlines with the coordinator",
        ])
    elif overdue == 1 or aging_report or low_tasks:
        health_status = "Needs Attention"
        if overdue == 1:
            risk_factors.append("1 milestone is currently overdue")
            signals.append(_signal("overdue_milestones", "1 overdue milestone", "milestones"))
        if aging_report:
            risk_factors.append(f"Last progress report submitted {days_since_last_report} days ago")
            signals.append(_signal("aging_report", "Progress report is aging", "meetings"))
        if low_tasks:
            risk_factors.append(f"Task completion rate is {task_pct}% (below 50% target)")
            signals.append(_signal("low_task_completion", f"Task completion {task_pct}%", "tasks"))
        recommended_interventions.extend([
            "Update the status of your open milestones and tasks",
            "Request a check-in meeting about the upcoming sprint",
        ])
    else:
        health_status = "On Track"
        recommended_interventions.append("Continue the current cadence and keep milestone statuses up to date")

    untracked = []
    if not milestones_tracked:
        untracked.append("milestones")
    if not tasks_tracked:
        untracked.append("tasks")
    if days_since_last_report is None:
        untracked.append("progress reports")

    parts = []
    if milestones_tracked:
        parts.append(f"milestone progress is {milestone_pct}% with {overdue} overdue item(s)")
    if tasks_tracked:
        parts.append(f"task completion is {task_pct}%")
    summary = f"{startup_name} is assessed as '{health_status}': " + " and ".join(parts) + "."
    if untracked:
        summary += f" Not tracked: {', '.join(untracked)}."

    return {
        "status": "success",
        "health_status": health_status,
        "measured_facts": measured_facts,
        "ai_interpretation": {
            "health_status": health_status,
            "summary": summary,
            "risk_factors": risk_factors,
            "recommended_interventions": recommended_interventions,
            "signals": signals,
            "not_tracked": untracked,
            "requires_staff_confirmation": health_status in ["Needs Attention", "At Risk"],
            "evaluated_at": now_iso,
        },
    }


async def run_monitoring_agent(state: AgentState) -> AgentState:
    """LangGraph node execution for Monitoring Agent. Uses only figures present in the conversation entities."""
    logger.info("monitoring_agent_start", session=state.get("session_id"))

    entities = state.get("entities", {}) or {}
    evaluation = evaluate_startup_health(
        startup_name=entities.get("startup_name") or "This venture",
        stage=entities.get("stage") or "Unknown",
        total_milestones=entities.get("total_milestones"),
        completed_milestones=entities.get("completed_milestones"),
        overdue_milestones=entities.get("overdue_milestones"),
        tasks_completed=entities.get("tasks_completed"),
        total_tasks=entities.get("total_tasks"),
        days_since_last_report=entities.get("days_since_last_report"),
        measured_metrics=entities.get("measured_metrics") or {},
    )

    state["monitoring_output"] = evaluation
    state["requires_human_review"] = evaluation["ai_interpretation"]["requires_staff_confirmation"]

    logger.info("monitoring_agent_done", health=evaluation["health_status"])
    return state
