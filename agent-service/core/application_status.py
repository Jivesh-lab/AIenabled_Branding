"""
core/application_status.py
──────────────────────────
Single definition of the application lifecycle used by both the PostgreSQL and
the standalone (SQLite) code paths, so statuses and the student-facing project
summary can never drift apart.

Lifecycle (stored lowercase, exposed UPPERCASE to the frontend):

    draft ──submit──► submitted ──► under_review ──► approved | rejected
      ▲                   │               │
      └── revision_requested ◄────────────┘   (student edits, then resubmits)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import HTTPException

from core.milestones import EMPTY_SUMMARY as EMPTY_MILESTONES, IST

DRAFT = "draft"
SUBMITTED = "submitted"
UNDER_REVIEW = "under_review"
REVISION_REQUESTED = "revision_requested"
APPROVED = "approved"
REJECTED = "rejected"

ALL_STATUSES = (DRAFT, SUBMITTED, UNDER_REVIEW, REVISION_REQUESTED, APPROVED, REJECTED)

# A student may (re)submit, or save a draft over, an application only in these states.
STUDENT_EDITABLE = (DRAFT, REVISION_REQUESTED)
# Statuses where an application is waiting on a reviewer decision.
AWAITING_REVIEW = (SUBMITTED, UNDER_REVIEW)
# Statuses that count as an active application for duplicate detection.
ACTIVE = (SUBMITTED, UNDER_REVIEW, REVISION_REQUESTED)
TERMINAL = (APPROVED, REJECTED)

DECISIONS = (APPROVED, REJECTED, REVISION_REQUESTED)


def require_student_editable(status: str, action: str) -> None:
    """Raises 409 unless a student may still edit or (re)submit an application in this status."""
    status = str(status).lower()
    if status in STUDENT_EDITABLE:
        return
    if status in AWAITING_REVIEW:
        raise HTTPException(
            status_code=409,
            detail=f"This application has already been submitted and is awaiting review; it cannot be {action} now",
        )
    raise HTTPException(status_code=409, detail=f"This application is {status} and cannot be {action}")


def _date_str(value: Any) -> Optional[str]:
    """YYYY-MM-DD in institute time (IST) from a datetime (asyncpg) or an ISO timestamp string (sqlite).

    Timestamps are stored in UTC; cutting the UTC date off would show the previous day for anything saved
    between 00:00 and 05:30 IST. Naive values are treated as UTC.
    """
    if not value:
        return None
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value[:10]
    if hasattr(value, "astimezone"):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(IST).date().isoformat()
    return str(value)[:10]


def _next_step(status: str) -> Optional[Dict[str, str]]:
    if status == DRAFT:
        return {"kind": "action", "label": "Complete your draft"}
    if status == REVISION_REQUESTED:
        return {"kind": "action", "label": "Address reviewer feedback"}
    if status in AWAITING_REVIEW:
        return {"kind": "action", "label": "Awaiting review"}
    return None


def build_history(rows: Any) -> list:
    """Student-visible status history from application_audit_logs rows (oldest first).

    The actor id is deliberately not exposed; reviewer comments are (they are addressed to the student).
    """
    history = []
    for row in rows:
        created = row["created_at"]
        history.append(
            {
                "from": str(row["previous_status"]).upper() if row["previous_status"] else None,
                "to": str(row["new_status"]).upper(),
                "at": created.isoformat() if hasattr(created, "isoformat") else created,
                "comments": row["comments"],
            }
        )
    return history


def build_form_data(
    form: Dict[str, Any], status: str, *, name: Any, tagline: Any, problem: Any, solution: Any, sector: Any, stage: Any
) -> Dict[str, Any]:
    """formData for an application: saved form fields overlaid with the startup columns.

    For a draft the saved form is authoritative: the startup row may hold the 'Untitled Draft'
    placeholder, which must not leak back into the form on resume.
    """
    overlay = {
        "name": name,
        "shortDescription": tagline,
        "problem": problem,
        "solution": solution,
        "domain": sector,
        "maturity": str(stage or "idea").upper(),
    }
    if str(status).lower() == DRAFT:
        overlay = {key: (form[key] if key in form else value) for key, value in overlay.items()}
    return {**form, **overlay}


def build_project_summary(
    *,
    app_id: Any,
    status: str,
    completeness: Optional[int],
    form: Dict[str, Any],
    name: str,
    short_description: Optional[str],
    domain: Optional[str],
    maturity: Optional[str],
    updated_at: Any,
    submitted_at: Any,
    ai_summary: Optional[str] = None,
    ai_feedback: Optional[str] = None,
    milestones: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """The shape of one item in GET /api/applications/ (StudentProject on the frontend)."""
    status = str(status).lower()
    team = form.get("teamMembers") if isinstance(form, dict) else None
    return {
        "id": str(app_id),
        "name": name,
        "shortDescription": short_description or "",
        "domain": domain or "",
        "reviewStatus": status.upper(),
        # The review pipeline currently has a single persisted reviewer group (faculty).
        "pipelinePosition": "FACULTY_REVIEW" if status in ACTIVE else None,
        "maturity": str(maturity or "idea").upper(),
        # Persisted application completeness (0-100); never a status-derived guess.
        "progress": int(completeness or 0),
        "facultyGuide": None,
        # Execution progress from persisted milestones (core/milestones.py); progress=None means "not tracked".
        "milestones": milestones if milestones is not None else dict(EMPTY_MILESTONES),
        "teamSize": len(team) if team else 0,
        "aiSummary": ai_summary,
        "aiFeedback": ai_feedback,
        "updatedAt": _date_str(updated_at or submitted_at),
        "next": _next_step(status),
    }
