"""
api/milestones.py
─────────────────
Student-facing milestones and project monitoring for an APPROVED application.

Ownership: every endpoint resolves the application first and requires it to belong to the caller (404 missing,
403 someone else's). Milestones live in the existing `milestones` table (PostgreSQL) / its SQLite twin, keyed by
the application's startup. Progress, overdue and summary figures come from core/milestones.py only.

Monitoring is computed on demand from persisted milestones plus the task counts the Next.js server reads from the
backend and passes in (agent-service cannot read the task store). The result is advice: it changes no status.
"""

from datetime import date, datetime, timezone
from typing import Any, Dict, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from agents.monitoring_agent import evaluate_startup_health
from api.auth import AuthenticatedUser, get_internal_service
from core import application_status as st
from core import milestones as ms
from db.postgres import get_db
from db.standalone_store import (
    standalone_create_milestone,
    standalone_list_milestones,
    standalone_owned_application,
    standalone_startup_name,
    standalone_update_milestone,
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/applications", tags=["milestones"])


class MilestoneIn(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field("", max_length=500)
    dueDate: Optional[date] = None


class MilestonePatch(BaseModel):
    status: Optional[str] = None
    completionPct: Optional[int] = None


class MonitoringIn(BaseModel):
    """Task figures read server-side by the Next.js BFF; absent means 'tasks not tracked'."""
    tasksTotal: Optional[int] = Field(None, ge=0, le=10_000)
    tasksCompleted: Optional[int] = Field(None, ge=0, le=10_000)


def _require(user: AuthenticatedUser, permission: str) -> None:
    if permission not in user.permissions:
        raise HTTPException(status_code=403, detail=f"Missing {permission} permission")


async def _owned(pool, application_id: str, user: AuthenticatedUser) -> Dict[str, Any]:
    """{startup_id, status} for the caller's own application."""
    if not pool:
        return standalone_owned_application(application_id, user.id)
    async with pool.acquire() as conn:
        record = await conn.fetchrow("SELECT startup_id, applicant_id, status FROM applications WHERE id = $1", application_id)
    if not record:
        raise HTTPException(status_code=404, detail="Application not found")
    if str(record["applicant_id"]) != str(user.id):
        raise HTTPException(status_code=403, detail="You do not own this application")
    return {"startup_id": str(record["startup_id"]), "status": record["status"]}


async def _rows(pool, startup_id: str) -> list:
    if not pool:
        return standalone_list_milestones(startup_id)
    async with pool.acquire() as conn:
        records = await conn.fetch(
            "SELECT * FROM milestones WHERE startup_id = $1::uuid ORDER BY due_date NULLS LAST, created_at", startup_id
        )
    return [dict(r) for r in records]


def _require_approved(status: str) -> None:
    if status != st.APPROVED:
        raise HTTPException(status_code=409, detail="Milestones can be added once the project is approved")


@router.get("/{application_id}/milestones")
async def list_milestones(
    application_id: str,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db),
):
    _require(current_user, "view_applications")
    owned = await _owned(pool, application_id, current_user)
    rows = await _rows(pool, owned["startup_id"])
    today = ms.today_ist()
    return {
        "milestones": [ms.milestone_view(r, today, current_user.id) for r in rows],
        "summary": ms.summarise(rows, today),
        "canEdit": owned["status"] == st.APPROVED,
    }


@router.post("/{application_id}/milestones", status_code=201)
async def create_milestone(
    application_id: str,
    payload: MilestoneIn,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db),
):
    _require(current_user, "submit_application")
    owned = await _owned(pool, application_id, current_user)
    _require_approved(owned["status"])
    title = payload.title.strip()
    if len(title) < 3:
        raise HTTPException(status_code=422, detail="Give the milestone a title of at least 3 characters")
    due = payload.dueDate.isoformat() if payload.dueDate else None

    if not pool:
        row = standalone_create_milestone(owned["startup_id"], current_user.id, title, payload.description.strip(), due)
    else:
        try:
            async with pool.acquire() as conn:
                async with conn.transaction():
                    # Serialise creates for one project so the limit and duplicate checks cannot be raced.
                    await conn.execute("SELECT pg_advisory_xact_lock(hashtext($1))", f"milestones:{owned['startup_id']}")
                    count = await conn.fetchval("SELECT count(*) FROM milestones WHERE startup_id = $1::uuid", owned["startup_id"])
                    if count >= ms.MAX_MILESTONES_PER_PROJECT:
                        raise HTTPException(status_code=409, detail=f"A project can have at most {ms.MAX_MILESTONES_PER_PROJECT} milestones")
                    if await conn.fetchval(
                        "SELECT 1 FROM milestones WHERE startup_id = $1::uuid AND lower(title) = lower($2)", owned["startup_id"], title
                    ):
                        raise HTTPException(status_code=409, detail="A milestone with this title already exists")
                    record = await conn.fetchrow(
                        """
                        INSERT INTO milestones (startup_id, title, description, due_date, status, completion_pct, created_by)
                        VALUES ($1::uuid, $2, $3, $4, 'pending', 0, $5) RETURNING *
                        """,
                        owned["startup_id"], title, payload.description.strip(), payload.dueDate, current_user.id,
                    )
            row = dict(record)
        except HTTPException:
            raise
        except Exception:
            logger.exception("milestone_create_failed", application_id=application_id)
            raise HTTPException(status_code=500, detail="Failed to save the milestone")

    return {"milestone": ms.milestone_view(row, ms.today_ist(), current_user.id)}


@router.patch("/{application_id}/milestones/{milestone_id}")
async def update_milestone(
    application_id: str,
    milestone_id: str,
    payload: MilestonePatch,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db),
):
    _require(current_user, "submit_application")
    owned = await _owned(pool, application_id, current_user)
    _require_approved(owned["status"])

    if not pool:
        row = standalone_update_milestone(owned["startup_id"], milestone_id, payload.status, payload.completionPct)
    else:
        try:
            async with pool.acquire() as conn:
                async with conn.transaction():
                    current = await conn.fetchrow(
                        "SELECT * FROM milestones WHERE id = $1::uuid AND startup_id = $2::uuid FOR UPDATE",
                        milestone_id, owned["startup_id"],
                    )
                    if not current:
                        raise HTTPException(status_code=404, detail="Milestone not found")
                    try:
                        new_status, new_pct = ms.resolve_update(current["status"], current["completion_pct"], payload.status, payload.completionPct)
                    except ValueError as exc:
                        raise HTTPException(status_code=400, detail=str(exc))
                    completed_at = (
                        (current["completed_at"] or datetime.now(timezone.utc)) if new_status == ms.COMPLETED else None
                    )
                    record = await conn.fetchrow(
                        "UPDATE milestones SET status=$1, completion_pct=$2, completed_at=$3, updated_at=NOW() WHERE id=$4::uuid RETURNING *",
                        new_status, new_pct, completed_at, milestone_id,
                    )
            row = dict(record)
        except HTTPException:
            raise
        except Exception:
            logger.exception("milestone_update_failed", application_id=application_id)
            raise HTTPException(status_code=500, detail="Failed to update the milestone")

    return {"milestone": ms.milestone_view(row, ms.today_ist(), current_user.id)}


@router.post("/{application_id}/monitoring")
async def project_monitoring(
    application_id: str,
    payload: MonitoringIn,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db),
):
    """Health assessment from persisted milestones (+ task counts passed by the BFF). Advisory; changes nothing."""
    _require(current_user, "view_applications")
    if payload.tasksCompleted is not None and (payload.tasksTotal is None or payload.tasksCompleted > payload.tasksTotal):
        raise HTTPException(status_code=422, detail="tasksCompleted cannot exceed tasksTotal")

    owned = await _owned(pool, application_id, current_user)
    rows = await _rows(pool, owned["startup_id"])
    today = ms.today_ist()
    summary = ms.summarise(rows, today)

    if not pool:
        name = standalone_startup_name(owned["startup_id"]) or "This project"
    else:
        async with pool.acquire() as conn:
            name = (await conn.fetchval("SELECT name FROM startups WHERE id = $1::uuid", owned["startup_id"])) or "This project"

    evaluation = evaluate_startup_health(
        startup_name=name,
        stage="Approved",
        total_milestones=summary["total"],
        completed_milestones=summary["completed"],
        overdue_milestones=summary["overdue"],
        tasks_completed=payload.tasksCompleted,
        total_tasks=payload.tasksTotal,
        days_since_last_report=None,  # progress reports are not persisted anywhere, so they are "not tracked"
    )
    return {
        "evaluation": evaluation,
        "milestoneSummary": summary,
        "isOfficialStatus": False,
        "note": "Automated, rule-based suggestion. It does not change the project's status and is not a reviewer decision.",
    }
