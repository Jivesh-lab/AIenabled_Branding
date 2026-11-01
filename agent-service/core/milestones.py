"""
core/milestones.py
──────────────────
Milestone rules shared by the PostgreSQL and SQLite paths and by every student page, so the numbers can never
disagree. Pure functions: no database, no clock except the explicit `today` argument.

Persisted statuses (milestones.status): pending | in_progress | completed. "overdue" is a *display* state
derived from the due date, never something a student can set (the column allows it for legacy rows).

Progress rule (documented and the only one used anywhere):
    each milestone contributes 100 if status == completed, else its completion_pct (0-99)
    progress = round(mean of the contributions)          -> None when the project has no milestones
"None" means "not tracked" and is deliberately different from 0 (tracked, nothing done yet).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, Optional

PENDING = "pending"
IN_PROGRESS = "in_progress"
COMPLETED = "completed"
STUDENT_STATUSES = (PENDING, IN_PROGRESS, COMPLETED)

MAX_MILESTONES_PER_PROJECT = 50

IST = timezone(timedelta(hours=5, minutes=30))


def today_ist() -> date:
    return datetime.now(IST).date()


def as_date(value: Any) -> Optional[date]:
    """date from a date/datetime (asyncpg) or an ISO string (sqlite); None when absent or unparseable."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def display_state(status: str, due: Any, today: date) -> str:
    """completed | overdue | in_progress | upcoming | no_date"""
    if status == COMPLETED:
        return "completed"
    due_date = as_date(due)
    if due_date is not None and due_date < today:
        return "overdue"
    if status == IN_PROGRESS:
        return "in_progress"
    return "upcoming" if due_date is not None else "no_date"


def effective_pct(status: str, completion_pct: Any) -> int:
    if status == COMPLETED:
        return 100
    try:
        return max(0, min(99, int(completion_pct or 0)))
    except (TypeError, ValueError):
        return 0


def progress_of(rows: Iterable[Dict[str, Any]]) -> Optional[int]:
    values = [effective_pct(r["status"], r.get("completion_pct")) for r in rows]
    if not values:
        return None
    return round(sum(values) / len(values))


def summarise(rows: Iterable[Dict[str, Any]], today: date) -> Dict[str, Any]:
    rows = list(rows)
    states = [display_state(r["status"], r.get("due_date"), today) for r in rows]
    return {
        "total": len(rows),
        "completed": states.count("completed"),
        "overdue": states.count("overdue"),
        "inProgress": states.count("in_progress"),
        "upcoming": states.count("upcoming") + states.count("no_date"),
        "progress": progress_of(rows),
    }


EMPTY_SUMMARY: Dict[str, Any] = {"total": 0, "completed": 0, "overdue": 0, "inProgress": 0, "upcoming": 0, "progress": None}


def milestone_view(row: Dict[str, Any], today: date, viewer_id: str) -> Dict[str, Any]:
    status = row["status"]
    completed_at = row.get("completed_at")
    return {
        "id": str(row["id"]),
        "title": row["title"],
        "description": row.get("description") or "",
        "dueDate": as_date(row.get("due_date")).isoformat() if as_date(row.get("due_date")) else None,
        "status": status,
        "state": display_state(status, row.get("due_date"), today),
        "completionPct": effective_pct(status, row.get("completion_pct")),
        "completedAt": completed_at.isoformat() if hasattr(completed_at, "isoformat") else completed_at,
        "createdByYou": str(row.get("created_by") or "") == str(viewer_id),
    }


def resolve_update(current_status: str, current_pct: Any, status: Optional[str], pct: Optional[int]) -> tuple[str, int]:
    """
    Coherent (status, completion_pct) after a student's update. Raises ValueError with a user-facing message.
      status given:  completed -> 100, pending -> 0, in_progress -> given pct clamped to 1..99 (else keep, min 1)
      only pct:      0 -> pending, 1..99 -> in_progress, 100 -> completed
    """
    if status is not None and status not in STUDENT_STATUSES:
        raise ValueError(f"Status must be one of: {', '.join(STUDENT_STATUSES)}.")
    if pct is not None and not (0 <= pct <= 100):
        raise ValueError("Completion must be between 0 and 100.")
    if status is None and pct is None:
        raise ValueError("Provide a status or a completion percentage.")

    if status is None:
        status = PENDING if pct == 0 else COMPLETED if pct == 100 else IN_PROGRESS
        return status, pct  # type: ignore[return-value]
    if status == COMPLETED:
        return COMPLETED, 100
    if status == PENDING:
        return PENDING, 0
    base = pct if pct is not None else effective_pct(current_status, current_pct)
    return IN_PROGRESS, max(1, min(99, base))
