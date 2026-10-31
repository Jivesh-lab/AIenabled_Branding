from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
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
)
import json
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/applications", tags=["applications"])

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
    step: int = 0
    furthestStep: int = 0

def _can_review(user: AuthenticatedUser) -> bool:
    return "review_applications" in user.permissions or user.role in {"admin", "super_admin", "faculty"}

@router.post("/submit")
async def submit_application(
    submission: IdeaSubmission,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    if "submit_application" not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Missing submit_application permission")
    
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
    
    # Extract mapped fields for startups table
    startup_name = submission.name
    tagline = submission.shortDescription
    problem = submission.problem
    solution = submission.solution
    stage = submission.maturity.lower()
    sector = submission.domain
    
    # Store unmapped fields into a flexible JSONB column (form_data)
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
    
    # Run Application Agent to produce summary and assessment
    ai_summary_str = None
    ai_feedback_str = None
    agent_evaluation_result = {}
    try:
        from agents.application_agent import assess_application
        assessment = await assess_application(submission.model_dump())
        ai_summary_str = json.dumps(assessment.get("summary", {}))
        ai_feedback_str = json.dumps({
            "preliminary_assessment": assessment.get("preliminary_assessment", {}),
            "questions_for_reviewers": assessment.get("questions_for_reviewers", []),
            "missing_evidence": assessment.get("missing_evidence", []),
            "validation": assessment.get("validation", {}),
        })
        agent_evaluation_result = {
            "summary": assessment.get("summary", {}),
            "assessment": assessment.get("preliminary_assessment", {}),
            "questions": assessment.get("questions_for_reviewers", []),
            "missing_evidence": assessment.get("missing_evidence", []),
            "validation": assessment.get("validation", {}),
            "recommendation_summary": assessment.get("recommendation_summary", "")
        }
    except Exception as exc:
        logger.warning("application_agent_assessment_skipped", error=str(exc))
    
    if submission.applicationId:
        if not pool:
            return standalone_update_application(submission.applicationId, applicant_id, submission_data, ai_feedback_str)
        try:
            async with pool.acquire() as conn:
                record = await conn.fetchrow("SELECT startup_id, applicant_id, status FROM applications WHERE id = $1", submission.applicationId)
                if not record:
                    raise HTTPException(status_code=404, detail="Application not found")
                if str(record["applicant_id"]) != str(applicant_id):
                    raise HTTPException(status_code=403, detail="You do not own this application")
                if record["status"] in ("approved", "rejected"):
                    raise HTTPException(status_code=409, detail="This application cannot be resubmitted")
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
                    validation["completeness_score"], json.dumps(documents), json.dumps(form_data),
                    ai_summary_str, ai_feedback_str, submission.applicationId,
                )
                return {"success": True, "application_id": submission.applicationId, "status": "submitted", "agent_evaluation": agent_evaluation_result}
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to resubmit application")

    if not pool:
        application_id = standalone_submit_application(
            applicant_id=applicant_id,
            startup_name=startup_name,
            tagline=tagline,
            problem=problem,
            solution=solution,
            stage=stage,
            sector=sector,
            documents=documents,
            form_data=form_data,
            ai_summary=ai_summary_str,
            ai_feedback=ai_feedback_str,
        )
        return {
            "success": True,
            "application_id": str(application_id),
            "status": "submitted",
            "agent_evaluation": agent_evaluation_result
        }

    try:
        # Single transaction to insert startup + application safely
        async with pool.acquire() as conn:
            async with conn.transaction():
                # Multiple applications allowed per student founder
                duplicate = await conn.fetchval(
                    """
                    SELECT a.id FROM applications a
                    JOIN startups s ON s.id = a.startup_id
                    WHERE a.applicant_id = $1 AND lower(s.name) = lower($2)
                      AND a.status IN ('submitted', 'under_review', 'revision_requested')
                    LIMIT 1
                    """,
                    applicant_id, startup_name,
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
                    startup_id, applicant_id, validation["completeness_score"], json.dumps(documents), json.dumps(form_data), ai_summary_str, ai_feedback_str
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save application")
            
    return {
        "success": True,
        "application_id": str(application_id),
        "status": "submitted",
        "agent_evaluation": agent_evaluation_result
    }

@router.get("/")
async def get_applications(
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    applicant_id = current_user.id
    if not pool:
        projects = standalone_get_applications(applicant_id)
        return {"projects": projects}
    
    try:
        async with pool.acquire() as conn:
            records = await conn.fetch(
                """
                SELECT 
                    a.id as app_id, a.status as review_status, a.completeness, a.form_data, a.ai_summary, a.ai_feedback, a.submitted_at, a.updated_at,
                    s.id as startup_id, s.name, s.tagline as short_description, s.sector as domain, s.stage as maturity,
                    s.status as pipeline_position
                FROM applications a
                JOIN startups s ON a.startup_id = s.id
                WHERE a.applicant_id = $1
                ORDER BY a.submitted_at DESC
                """,
                applicant_id
            )
            
            projects = []
            for r in records:
                form = {}
                if r['form_data']:
                    form = json.loads(r['form_data']) if isinstance(r['form_data'], str) else r['form_data']
                
                team_size = len(form.get('teamMembers', [])) if form.get('teamMembers') else 1
                
                projects.append({
                    "id": str(r['app_id']),
                    "name": r['name'],
                    "shortDescription": r['short_description'],
                    "domain": r['domain'],
                    "reviewStatus": str(r['review_status']).upper(),
                    "pipelinePosition": "FACULTY_REVIEW" if r['review_status'] in ("submitted", "under_review", "revision_requested") else None,
                    "maturity": str(r['maturity']).upper(),
                    "progress": r['completeness'] if r['review_status'] == 'draft' else 100 if r['review_status'] == 'submitted' else 50,
                    "facultyGuide": None,
                    "teamSize": team_size,
                    "aiSummary": r['ai_summary'],
                    "aiFeedback": r['ai_feedback'],
                    "updatedAt": str((r['updated_at'] or r['submitted_at']).date()) if (r['updated_at'] or r['submitted_at']) else None,
                    "next": (
                        {"kind": "action", "label": "Complete your draft"} if r['review_status'] == 'draft'
                        else {"kind": "action", "label": "Address reviewer feedback"} if r['review_status'] == 'revision_requested'
                        else {"kind": "action", "label": "Awaiting review"} if r['review_status'] == 'submitted'
                        else None
                    )
                })
            return {"projects": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch applications")

@router.get("/queue")
async def get_application_queue(
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    if "review_applications" not in current_user.permissions and "view_applications" not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Missing permission to view application")
        
    if not pool:
        queue = standalone_get_application_queue()
        return {"queue": queue}

    try:
        async with pool.acquire() as conn:
            records = await conn.fetch(
                """
                SELECT 
                    a.id as app_id, a.status as review_status, a.submitted_at, a.applicant_id,
                    s.name as startup_name, s.sector as domain, s.stage as maturity
                FROM applications a
                JOIN startups s ON a.startup_id = s.id
                WHERE a.status IN ('submitted', 'under_review')
                ORDER BY a.submitted_at ASC
                """
            )
            
            queue = []
            for r in records:
                queue.append({
                    "id": str(r['app_id']),
                    "startupName": r['startup_name'],
                    "domain": r['domain'],
                    "status": str(r['review_status']).upper(),
                    "maturity": str(r['maturity']).upper(),
                    "applicantId": r['applicant_id'],
                    "submittedAt": str(r['submitted_at'].isoformat()) if r['submitted_at'] else None
                })
            return {"queue": queue}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch queue")

@router.post("/draft")
async def save_application_draft(
    payload: DraftPayload,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db),
):
    values = dict(payload.values)
    values.pop("declarationAccepted", None)
    if not pool:
        return standalone_save_draft(current_user.id, values, payload.step, payload.furthestStep, payload.applicationId)
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                application_id = payload.applicationId
                if application_id:
                    record = await conn.fetchrow("SELECT startup_id, applicant_id, status FROM applications WHERE id=$1", application_id)
                    if not record:
                        raise HTTPException(status_code=404, detail="Application not found")
                    if str(record["applicant_id"]) != str(current_user.id):
                        raise HTTPException(status_code=403, detail="You do not own this application")
                    if record["status"] in ("approved", "rejected"):
                        raise HTTPException(status_code=409, detail="This application cannot be edited")
                    await conn.execute(
                        "UPDATE applications SET status='draft', form_data=$1::jsonb, updated_at=NOW() WHERE id=$2",
                        json.dumps({**values, "_draft": {"step": payload.step, "furthestStep": payload.furthestStep}}), application_id,
                    )
                else:
                    startup_id = await conn.fetchval(
                        """
                        INSERT INTO startups (user_id, name, tagline, problem, solution, stage, sector)
                        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
                        """,
                        current_user.id, values.get("name") or "Untitled Draft", values.get("shortDescription", ""),
                        values.get("problem", ""), values.get("solution", ""), str(values.get("maturity", "IDEA")).lower(), values.get("domain", ""),
                    )
                    application_id = await conn.fetchval(
                        "INSERT INTO applications (startup_id, applicant_id, status, form_data) VALUES ($1,$2,'draft',$3::jsonb) RETURNING id",
                        startup_id, current_user.id, json.dumps({**values, "_draft": {"step": payload.step, "furthestStep": payload.furthestStep}}),
                    )
                return {"success": True, "application_id": str(application_id), "status": "draft", "values": values, "step": payload.step, "furthestStep": payload.furthestStep}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to save application draft")

@router.get("/{application_id}")
async def get_application_details(
    application_id: str,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    can_review = _can_review(current_user)
        
    if not pool:
        return standalone_get_application_details(application_id, current_user.id, can_review)

    try:
        async with pool.acquire() as conn:
            record = await conn.fetchrow(
                """
                SELECT 
                    a.id as app_id, a.status as review_status, a.form_data, a.documents, a.ai_summary, a.ai_feedback, a.reviewer_comments, a.submitted_at,
                    a.applicant_id, s.name as startup_name, s.tagline, s.problem, s.solution, s.sector, s.stage
                FROM applications a
                JOIN startups s ON a.startup_id = s.id
                WHERE a.id = $1
                """,
                application_id
            )
            
            if not record:
                raise HTTPException(status_code=404, detail="Application not found")
            if not can_review and str(record["applicant_id"]) != str(current_user.id):
                raise HTTPException(status_code=403, detail="You do not have access to this application")
                
            form = {}
            if record['form_data']:
                form = json.loads(record['form_data']) if isinstance(record['form_data'], str) else record['form_data']
            
            docs = []
            if record['documents']:
                docs = json.loads(record['documents']) if isinstance(record['documents'], str) else record['documents']
                
            return {
                "id": str(record['app_id']),
                "startup": {
                    "name": record['startup_name'],
                    "tagline": record['tagline'],
                    "problem": record['problem'],
                    "solution": record['solution'],
                    "sector": record['sector'],
                    "stage": record['stage']
                },
                "status": str(record['review_status']).upper(),
                "aiSummary": record['ai_summary'],
                "aiFeedback": record['ai_feedback'],
                "formData": {
                    **form,
                    "name": record["startup_name"],
                    "shortDescription": record["tagline"],
                    "problem": record["problem"],
                    "solution": record["solution"],
                    "domain": record["sector"],
                    "maturity": str(record["stage"]).upper(),
                },
                "documents": docs,
                "submittedAt": str(record['submitted_at'].isoformat()) if record['submitted_at'] else None
                ,"applicantId": str(record["applicant_id"])
                ,"reviewerComments": record["reviewer_comments"]
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch application details")

class DecisionPayload(BaseModel):
    decision: str
    comments: Optional[str] = None

@router.post("/{application_id}/decide")
async def decide_application(
    application_id: str,
    payload: DecisionPayload,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    if "review_applications" not in current_user.permissions and "view_applications" not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Missing permission to view application")
        
    decision = payload.decision.lower()
    if decision not in ["approved", "rejected", "revision_requested"]:
        raise HTTPException(status_code=400, detail="Invalid decision")
        
    if decision == "revision_requested" and not payload.comments:
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
                current_app = await conn.fetchrow("SELECT status FROM applications WHERE id = $1", application_id)
                if not current_app:
                    raise HTTPException(status_code=404, detail="Application not found")
                    
                prev_status = current_app['status']
                
                if prev_status in ['approved', 'rejected'] and decision not in ['approved', 'rejected']:
                    raise HTTPException(status_code=400, detail="Cannot review a terminal application unless changing between terminal states")
                    
                await conn.execute(
                    """
                    UPDATE applications 
                    SET status = $1, reviewer_id = $2, reviewer_comments = $3, reviewed_at = NOW()
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
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to submit decision")
