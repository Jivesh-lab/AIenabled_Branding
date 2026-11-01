from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from api.auth import get_internal_service, AuthenticatedUser
from db.postgres import get_db
from db.standalone_store import (
    standalone_submit_application,
    standalone_get_applications,
    standalone_get_application_queue,
    standalone_get_application_details,
    standalone_decide_application,
    standalone_save_draft,
    standalone_update_application,
    standalone_check_resubmittable,
)
from core import application_status as st
from core import milestones as ms
import json
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/applications", tags=["applications"])

REVIEWER_ROLES = {"admin", "super_admin", "faculty"}


class TeamMember(BaseModel):
    id: str
    name: str
    rollNumber: str
    email: str
    inviteStatus: str

class Attachment(BaseModel):
    id: str
    name: str
    sizeBytes: int

class IdeaSubmission(BaseModel):
    applicationId: Optional[str] = None
    name: str = Field(..., min_length=3, max_length=120)
    shortDescription: str = Field(..., min_length=20, max_length=300)
    department: str = Field(..., min_length=1)
    domain: str = Field(..., min_length=1)
    projectType: str
    maturity: str
    problem: str = Field(..., min_length=30, max_length=2000)
    affectedUsers: str = Field(..., min_length=10, max_length=1000)
    currentSolutions: str = Field(..., max_length=1500)
    solution: str = Field(..., min_length=30, max_length=2000)
    differentiation: str = Field(..., min_length=20, max_length=1500)
    teamMembers: List[TeamMember]
    technologies: List[str]
    githubUrl: Optional[str] = ""
    demoUrl: Optional[str] = ""
    prototypeAvailable: str
    attachments: List[Attachment]
    declarationAccepted: bool

class DraftPayload(BaseModel):
    applicationId: Optional[str] = None
    values: dict
    step: int = Field(0, ge=0, le=3)
    furthestStep: int = Field(0, ge=0, le=3)

class DecisionPayload(BaseModel):
    decision: str
    comments: Optional[str] = None


# ── Authorisation helpers ────────────────────────────────────────────────────

def _is_reviewer(user: AuthenticatedUser) -> bool:
    """Reviewers need BOTH the review permission and a reviewer role."""
    return "review_applications" in user.permissions and user.role in REVIEWER_ROLES

def _require_permission(user: AuthenticatedUser, permission: str) -> None:
    if permission not in user.permissions:
        raise HTTPException(status_code=403, detail=f"Missing {permission} permission")

def _require_reviewer(user: AuthenticatedUser) -> None:
    _require_permission(user, "review_applications")
    if user.role not in REVIEWER_ROLES:
        raise HTTPException(status_code=403, detail="Your role is not permitted to review applications")

def _ensure_owned_editable(record, applicant_id: str, action: str) -> None:
    """404 if missing, 403 if not the caller's, 409 unless still student-editable."""
    if not record:
        raise HTTPException(status_code=404, detail="Application not found")
    if str(record["applicant_id"]) != str(applicant_id):
        raise HTTPException(status_code=403, detail="You do not own this application")
    st.require_student_editable(record["status"], action)

def _completeness(values: Dict[str, Any]) -> int:
    """Rule-based completeness (persisted); used for drafts so progress is real, not guessed."""
    from agents.application_agent import validate_application_data
    try:
        return int(validate_application_data(values)["completeness_score"])
    except Exception:
        return 0

def _json(value: Any, default: Any) -> Any:
    if not value:
        return default
    return json.loads(value) if isinstance(value, str) else value


# ── Submit / resubmit ────────────────────────────────────────────────────────

@router.post("/submit")
async def submit_application(
    submission: IdeaSubmission,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    _require_permission(current_user, "submit_application")

    if not submission.declarationAccepted:
        raise HTTPException(status_code=400, detail="Declaration must be accepted")

    applicant_id = current_user.id
    submission_data = submission.model_dump()
    from agents.application_agent import validate_application_data
    validation = validate_application_data(submission_data)
    if not validation["is_complete"]:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Application is incomplete",
                "validation": validation,
            },
        )

    # Cheap ownership/status check BEFORE the (slow, billed) AI assessment, so a repeated request
    # for an already-submitted application is rejected immediately.
    if submission.applicationId:
        if not pool:
            standalone_check_resubmittable(submission.applicationId, applicant_id)
        else:
            async with pool.acquire() as conn:
                record = await conn.fetchrow(
                    "SELECT applicant_id, status FROM applications WHERE id = $1", submission.applicationId
                )
            _ensure_owned_editable(record, applicant_id, "resubmitted")

    startup_name = submission.name
    tagline = submission.shortDescription
    problem = submission.problem
    solution = submission.solution
    stage = submission.maturity.lower()
    sector = submission.domain

    # Fields without a dedicated column go into the JSONB form_data column.
    form_data = {
        "name": submission.name,
        "shortDescription": submission.shortDescription,
        "department": submission.department,
        "projectType": submission.projectType,
        "affectedUsers": submission.affectedUsers,
        "currentSolutions": submission.currentSolutions,
        "differentiation": submission.differentiation,
        "teamMembers": [m.model_dump() for m in submission.teamMembers],
        "technologies": submission.technologies,
        "githubUrl": submission.githubUrl,
        "demoUrl": submission.demoUrl,
        "prototypeAvailable": submission.prototypeAvailable,
    }
    documents = [a.model_dump() for a in submission.attachments]

    # AI assessment is advisory. If it is unavailable the submission still succeeds and the
    # response says so; no scores or summaries are invented.
    ai_summary_str = None
    ai_feedback_str = None
    agent_evaluation_result: Dict[str, Any] = {"assessment_available": False, "validation": validation}
    try:
        from agents.application_agent import assess_application
        assessment = await assess_application(submission_data)
        if assessment.get("assessment_available"):
            ai_summary_str = json.dumps(assessment.get("summary", {}))
            ai_feedback_str = json.dumps({
                "preliminary_assessment": assessment.get("preliminary_assessment", {}),
                "questions_for_reviewers": assessment.get("questions_for_reviewers", []),
                "missing_evidence": assessment.get("missing_evidence", []),
                "validation": assessment.get("validation", {}),
            })
            agent_evaluation_result = {
                "assessment_available": True,
                "summary": assessment.get("summary", {}),
                "assessment": assessment.get("preliminary_assessment", {}),
                "questions": assessment.get("questions_for_reviewers", []),
                "missing_evidence": assessment.get("missing_evidence", []),
                "validation": assessment.get("validation", {}),
                "recommendation_summary": assessment.get("recommendation_summary", ""),
            }
    except Exception as exc:
        logger.warning("application_agent_assessment_skipped", error=str(exc))

    completeness = validation["completeness_score"]

    if not pool:
        if submission.applicationId:
            standalone_update_application(
                submission.applicationId, applicant_id, submission_data, documents,
                completeness, ai_summary_str, ai_feedback_str,
            )
            application_id = submission.applicationId
        else:
            application_id = standalone_submit_application(
                applicant_id=applicant_id, startup_name=startup_name, tagline=tagline, problem=problem,
                solution=solution, stage=stage, sector=sector, documents=documents, form_data=form_data,
                completeness=completeness, ai_summary=ai_summary_str, ai_feedback=ai_feedback_str,
            )
        return {"success": True, "application_id": str(application_id), "status": "submitted", "agent_evaluation": agent_evaluation_result}

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                if submission.applicationId:
                    # Row lock: a concurrent duplicate request waits here, then sees status='submitted' and gets 409.
                    record = await conn.fetchrow(
                        "SELECT startup_id, applicant_id, status FROM applications WHERE id = $1 FOR UPDATE",
                        submission.applicationId,
                    )
                    _ensure_owned_editable(record, applicant_id, "resubmitted")
                    await conn.execute(
                        """
                        UPDATE startups SET name=$1, tagline=$2, problem=$3, solution=$4, stage=$5, sector=$6, updated_at=NOW()
                        WHERE id=$7
                        """,
                        startup_name, tagline, problem, solution, stage, sector, record["startup_id"],
                    )
                    await conn.execute(
                        """
                        UPDATE applications
                        SET status='submitted', completeness=$1, documents=$2::jsonb, form_data=$3::jsonb,
                            ai_summary=$4, ai_feedback=$5, submitted_at=NOW(), reviewed_at=NULL, reviewer_id=NULL, updated_at=NOW()
                        WHERE id=$6
                        """,
                        completeness, json.dumps(documents), json.dumps(form_data),
                        ai_summary_str, ai_feedback_str, submission.applicationId,
                    )
                    await conn.execute(
                        """
                        INSERT INTO application_audit_logs (application_id, actor_id, previous_status, new_status, comments)
                        VALUES ($1, $2, $3, 'submitted', $4)
                        """,
                        submission.applicationId, applicant_id, record["status"],
                        "Resubmitted after revision request" if record["status"] == st.REVISION_REQUESTED else "Submitted by applicant",
                    )
                    application_id = submission.applicationId
                else:
                    # Serialise concurrent first-time submits of the same idea (double-click / retry).
                    await conn.execute("SELECT pg_advisory_xact_lock(hashtext($1))", f"{applicant_id}:{startup_name.lower()}")
                    duplicate = await conn.fetchval(
                        """
                        SELECT a.id FROM applications a
                        JOIN startups s ON s.id = a.startup_id
                        WHERE a.applicant_id = $1 AND lower(s.name) = lower($2)
                          AND a.status = ANY($3::text[])
                        LIMIT 1
                        """,
                        applicant_id, startup_name, list(st.ACTIVE),
                    )
                    if duplicate:
                        raise HTTPException(status_code=409, detail="An active application for this idea already exists")

                    startup_id = await conn.fetchval(
                        """
                        INSERT INTO startups (user_id, name, tagline, problem, solution, stage, sector, status)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
                        RETURNING id
                        """,
                        applicant_id, startup_name, tagline, problem, solution, stage, sector
                    )
                    application_id = await conn.fetchval(
                        """
                        INSERT INTO applications (startup_id, applicant_id, status, completeness, eligibility_ok, documents, form_data, ai_summary, ai_feedback, submitted_at)
                        VALUES ($1, $2, 'submitted', $3, TRUE, $4::jsonb, $5::jsonb, $6, $7, NOW())
                        RETURNING id
                        """,
                        startup_id, applicant_id, completeness, json.dumps(documents), json.dumps(form_data), ai_summary_str, ai_feedback_str
                    )
                    await conn.execute(
                        """
                        INSERT INTO application_audit_logs (application_id, actor_id, previous_status, new_status, comments)
                        VALUES ($1, $2, NULL, 'submitted', 'Submitted by applicant')
                        """,
                        application_id, applicant_id,
                    )
    except HTTPException:
        raise
    except Exception:
        logger.exception("application_submit_failed", applicant_id=applicant_id)
        raise HTTPException(status_code=500, detail="Failed to save application")

    return {
        "success": True,
        "application_id": str(application_id),
        "status": "submitted",
        "agent_evaluation": agent_evaluation_result,
    }


# ── Student reads ────────────────────────────────────────────────────────────

@router.get("/")
async def get_applications(
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    _require_permission(current_user, "view_applications")
    applicant_id = current_user.id
    if not pool:
        return {"projects": standalone_get_applications(applicant_id)}

    try:
        async with pool.acquire() as conn:
            records = await conn.fetch(
                """
                SELECT
                    a.id as app_id, a.startup_id, a.status as review_status, a.completeness, a.form_data, a.ai_summary, a.ai_feedback,
                    a.submitted_at, a.updated_at,
                    s.name, s.tagline as short_description, s.sector as domain, s.stage as maturity
                FROM applications a
                JOIN startups s ON a.startup_id = s.id
                WHERE a.applicant_id = $1
                ORDER BY COALESCE(a.updated_at, a.submitted_at) DESC
                """,
                applicant_id
            )
            milestone_rows = await conn.fetch(
                "SELECT startup_id, status, due_date, completion_pct FROM milestones WHERE startup_id = ANY($1::uuid[])",
                [r["startup_id"] for r in records],
            ) if records else []
        by_startup: Dict[str, list] = {}
        for m in milestone_rows:
            by_startup.setdefault(str(m["startup_id"]), []).append(dict(m))
        today = ms.today_ist()
        return {
            "projects": [
                st.build_project_summary(
                    app_id=r["app_id"], status=r["review_status"], completeness=r["completeness"],
                    form=_json(r["form_data"], {}), name=r["name"], short_description=r["short_description"],
                    domain=r["domain"], maturity=r["maturity"], updated_at=r["updated_at"], submitted_at=r["submitted_at"],
                    ai_summary=r["ai_summary"], ai_feedback=r["ai_feedback"],
                    milestones=ms.summarise(by_startup.get(str(r["startup_id"]), []), today),
                )
                for r in records
            ]
        }
    except Exception:
        logger.exception("applications_list_failed", applicant_id=applicant_id)
        raise HTTPException(status_code=500, detail="Failed to fetch applications")


# ── Reviewer queue ───────────────────────────────────────────────────────────

@router.get("/queue")
async def get_application_queue(
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    _require_reviewer(current_user)

    if not pool:
        return {"queue": standalone_get_application_queue()}

    try:
        async with pool.acquire() as conn:
            records = await conn.fetch(
                """
                SELECT
                    a.id as app_id, a.status as review_status, a.submitted_at, a.applicant_id,
                    s.name as startup_name, s.sector as domain, s.stage as maturity
                FROM applications a
                JOIN startups s ON a.startup_id = s.id
                WHERE a.status = ANY($1::text[])
                ORDER BY a.submitted_at ASC
                """,
                list(st.AWAITING_REVIEW),
            )
        return {
            "queue": [
                {
                    "id": str(r["app_id"]),
                    "startupName": r["startup_name"],
                    "domain": r["domain"],
                    "status": str(r["review_status"]).upper(),
                    "maturity": str(r["maturity"]).upper(),
                    "applicantId": r["applicant_id"],
                    "submittedAt": str(r["submitted_at"].isoformat()) if r["submitted_at"] else None,
                }
                for r in records
            ]
        }
    except Exception:
        logger.exception("application_queue_failed")
        raise HTTPException(status_code=500, detail="Failed to fetch queue")


# ── Drafts ───────────────────────────────────────────────────────────────────

@router.post("/draft")
async def save_application_draft(
    payload: DraftPayload,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db),
):
    _require_permission(current_user, "submit_application")

    values = dict(payload.values)
    values.pop("declarationAccepted", None)
    completeness = _completeness(values)

    if not pool:
        return standalone_save_draft(
            current_user.id, values, payload.step, payload.furthestStep, payload.applicationId, completeness
        )

    now = datetime.now(timezone.utc)
    stored = json.dumps({**values, "_draft": {"step": payload.step, "furthestStep": payload.furthestStep}})
    name = values.get("name") or "Untitled Draft"
    stage = str(values.get("maturity") or "idea").lower()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                application_id = payload.applicationId
                if application_id:
                    record = await conn.fetchrow(
                        "SELECT startup_id, applicant_id, status FROM applications WHERE id=$1 FOR UPDATE", application_id
                    )
                    _ensure_owned_editable(record, current_user.id, "edited")
                    await conn.execute(
                        """
                        UPDATE startups SET name=$1, tagline=$2, problem=$3, solution=$4, stage=$5, sector=$6, updated_at=$7
                        WHERE id=$8
                        """,
                        name, values.get("shortDescription", ""), values.get("problem", ""), values.get("solution", ""),
                        stage, values.get("domain", ""), now, record["startup_id"],
                    )
                    # Status is left as is: a revision_requested application stays revision_requested.
                    await conn.execute(
                        "UPDATE applications SET form_data=$1::jsonb, completeness=$2, updated_at=$3 WHERE id=$4",
                        stored, completeness, now, application_id,
                    )
                    status = str(record["status"])
                else:
                    startup_id = await conn.fetchval(
                        """
                        INSERT INTO startups (user_id, name, tagline, problem, solution, stage, sector)
                        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
                        """,
                        current_user.id, name, values.get("shortDescription", ""), values.get("problem", ""),
                        values.get("solution", ""), stage, values.get("domain", ""),
                    )
                    application_id = await conn.fetchval(
                        """
                        INSERT INTO applications (startup_id, applicant_id, status, completeness, form_data)
                        VALUES ($1,$2,'draft',$3,$4::jsonb) RETURNING id
                        """,
                        startup_id, current_user.id, completeness, stored,
                    )
                    status = st.DRAFT
        return {
            "success": True, "application_id": str(application_id), "status": status, "values": values,
            "step": payload.step, "furthestStep": payload.furthestStep, "updatedAt": now.isoformat(),
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("application_draft_failed", applicant_id=current_user.id)
        raise HTTPException(status_code=500, detail="Failed to save application draft")


# ── Details ──────────────────────────────────────────────────────────────────

@router.get("/{application_id}")
async def get_application_details(
    application_id: str,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    if "view_applications" not in current_user.permissions and not _is_reviewer(current_user):
        raise HTTPException(status_code=403, detail="Missing permission to view application")
    can_review = _is_reviewer(current_user)

    if not pool:
        return standalone_get_application_details(application_id, current_user.id, can_review)

    try:
        async with pool.acquire() as conn:
            record = await conn.fetchrow(
                """
                SELECT
                    a.id as app_id, a.status as review_status, a.form_data, a.documents, a.ai_summary, a.ai_feedback,
                    a.reviewer_comments, a.submitted_at, a.updated_at,
                    a.applicant_id, s.name as startup_name, s.tagline, s.problem, s.solution, s.sector, s.stage
                FROM applications a
                JOIN startups s ON a.startup_id = s.id
                WHERE a.id = $1
                """,
                application_id
            )
            history_rows = []
            if record and (can_review or str(record["applicant_id"]) == str(current_user.id)):
                history_rows = await conn.fetch(
                    """
                    SELECT previous_status, new_status, comments, created_at
                    FROM application_audit_logs WHERE application_id = $1 ORDER BY created_at ASC
                    """,
                    application_id,
                )

        if not record:
            raise HTTPException(status_code=404, detail="Application not found")
        if not can_review and str(record["applicant_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="You do not have access to this application")

        form = _json(record["form_data"], {})
        return {
            "history": st.build_history(history_rows),
            "id": str(record["app_id"]),
            "startup": {
                "name": record["startup_name"],
                "tagline": record["tagline"],
                "problem": record["problem"],
                "solution": record["solution"],
                "sector": record["sector"],
                "stage": record["stage"],
            },
            "status": str(record["review_status"]).upper(),
            "aiSummary": record["ai_summary"],
            "aiFeedback": record["ai_feedback"],
            "formData": st.build_form_data(
                form, record["review_status"], name=record["startup_name"], tagline=record["tagline"],
                problem=record["problem"], solution=record["solution"], sector=record["sector"], stage=record["stage"],
            ),
            "documents": _json(record["documents"], []),
            "submittedAt": record["submitted_at"].isoformat() if record["submitted_at"] else None,
            "updatedAt": record["updated_at"].isoformat() if record["updated_at"] else None,
            "applicantId": str(record["applicant_id"]),
            "reviewerComments": record["reviewer_comments"],
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("application_details_failed", application_id=application_id)
        raise HTTPException(status_code=500, detail="Failed to fetch application details")


# ── Reviewer decision ────────────────────────────────────────────────────────

@router.post("/{application_id}/decide")
async def decide_application(
    application_id: str,
    payload: DecisionPayload,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    _require_reviewer(current_user)

    decision = payload.decision.lower()
    if decision not in st.DECISIONS:
        raise HTTPException(status_code=400, detail="Invalid decision")

    if decision == st.REVISION_REQUESTED and not (payload.comments and payload.comments.strip()):
        raise HTTPException(status_code=400, detail="Revision requests require comments")

    if not pool:
        return standalone_decide_application(
            application_id=application_id,
            decision=decision,
            reviewer_id=current_user.id,
            comments=payload.comments,
        )

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                current_app = await conn.fetchrow(
                    "SELECT status FROM applications WHERE id = $1 FOR UPDATE", application_id
                )
                if not current_app:
                    raise HTTPException(status_code=404, detail="Application not found")

                prev_status = current_app["status"]

                if prev_status in st.TERMINAL and decision not in st.TERMINAL:
                    raise HTTPException(status_code=400, detail="Cannot review a terminal application unless changing between terminal states")
                if prev_status not in st.AWAITING_REVIEW and prev_status not in st.TERMINAL:
                    raise HTTPException(status_code=409, detail=f"Application is {prev_status} and is not awaiting review")

                await conn.execute(
                    """
                    UPDATE applications
                    SET status = $1, reviewer_id = $2, reviewer_comments = $3, reviewed_at = NOW(), updated_at = NOW()
                    WHERE id = $4
                    """,
                    decision, current_user.id, payload.comments, application_id
                )
                await conn.execute(
                    """
                    INSERT INTO application_audit_logs (application_id, actor_id, previous_status, new_status, comments)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    application_id, current_user.id, prev_status, decision, payload.comments
                )

        return {"success": True, "status": decision}
    except HTTPException:
        raise
    except Exception:
        logger.exception("application_decision_failed", application_id=application_id)
        raise HTTPException(status_code=500, detail="Failed to submit decision")
