from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from api.auth import get_internal_service, AuthenticatedUser
from db.postgres import get_db
import json

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
    
    # Extract mapped fields for startups table
    startup_name = submission.name
    tagline = submission.shortDescription
    problem = submission.problem
    solution = submission.solution
    stage = submission.maturity.lower()
    sector = submission.domain
    
    # Store unmapped fields into a flexible JSONB column (form_data)
    form_data = {
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
    
    try:
        # Single transaction to insert startup + application safely
        async with pool.acquire() as conn:
            async with conn.transaction():
                # Prevent duplicate submissions
                existing_app = await conn.fetchval(
                    """
                    SELECT id FROM applications 
                    WHERE applicant_id = $1 AND status IN ('draft', 'submitted', 'pending', 'under_review')
                    """,
                    applicant_id
                )
                
                if existing_app:
                    raise HTTPException(status_code=409, detail="You already have an active application.")

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
                    INSERT INTO applications (startup_id, applicant_id, status, documents, form_data, submitted_at)
                    VALUES ($1, $2, 'submitted', $3::jsonb, $4::jsonb, NOW())
                    RETURNING id
                    """,
                    startup_id, applicant_id, json.dumps(documents), json.dumps(form_data)
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save application")
            
    return {
        "success": True,
        "application_id": str(application_id),
        "status": "submitted"
    }

@router.get("/")
async def get_applications(
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    applicant_id = current_user.id
    
    try:
        async with pool.acquire() as conn:
            records = await conn.fetch(
                """
                SELECT 
                    a.id as app_id, a.status as review_status, a.form_data, a.submitted_at,
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
                    "pipelinePosition": str(r['pipeline_position']).upper() if r['pipeline_position'] else None,
                    "maturity": str(r['maturity']).upper(),
                    "progress": 100 if r['review_status'] == 'submitted' else 50,
                    "facultyGuide": None,
                    "teamSize": team_size,
                    "updatedAt": str(r['submitted_at'].date()) if r['submitted_at'] else "2026-09-15",
                    "next": {"kind": "action", "label": "Awaiting review"} if r['review_status'] == 'submitted' else None
                })
            return {"projects": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch applications")

@router.get("/queue")
async def get_application_queue(
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    if "review_applications" not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Missing review_applications permission")
        
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

@router.get("/{application_id}")
async def get_application_details(
    application_id: str,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db)
):
    # Depending on permissions, student can also view their own, but for this admin view:
    # Actually wait, GET /{application_id} could be called by the student. But let's require review_applications or ensure applicant_id matches.
    if "review_applications" not in current_user.permissions:
        # Check if student is the applicant
        pass # To keep it simple, we will just restrict this to review_applications as per prompt "Review endpoints must require a verified internal token containing review_applications".
        raise HTTPException(status_code=403, detail="Missing review_applications permission")
        
    try:
        async with pool.acquire() as conn:
            record = await conn.fetchrow(
                """
                SELECT 
                    a.id as app_id, a.status as review_status, a.form_data, a.documents, a.ai_summary, a.ai_feedback, a.submitted_at,
                    s.name as startup_name, s.tagline, s.problem, s.solution, s.sector, s.stage
                FROM applications a
                JOIN startups s ON a.startup_id = s.id
                WHERE a.id = $1
                """,
                application_id
            )
            
            if not record:
                raise HTTPException(status_code=404, detail="Application not found")
                
            form = {}
            if record['form_data']:
                form = json.loads(record['form_data']) if isinstance(record['form_data'], str) else record['form_data']
            
            docs = []
            if record['documents']:
                docs = json.loads(record['documents']) if isinstance(record['documents'], str) else record['documents']
                
            # Note: We need to get reviewer_comments from schema if it exists. 
            # In PostgreSQL, altering schema might not be reflected in this query unless we SELECT *.
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
                "formData": form,
                "documents": docs,
                "submittedAt": str(record['submitted_at'].isoformat()) if record['submitted_at'] else None
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
    if "review_applications" not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Missing review_applications permission")
        
    decision = payload.decision.lower()
    if decision not in ["approved", "rejected", "revision_requested"]:
        raise HTTPException(status_code=400, detail="Invalid decision")
        
    if decision == "revision_requested" and not payload.comments:
        raise HTTPException(status_code=400, detail="Revision requests require comments")
        
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                # Get current status
                current_app = await conn.fetchrow("SELECT status FROM applications WHERE id = $1", application_id)
                if not current_app:
                    raise HTTPException(status_code=404, detail="Application not found")
                    
                prev_status = current_app['status']
                
                # Check terminal states
                if prev_status in ['approved', 'rejected'] and decision not in ['approved', 'rejected']:
                    raise HTTPException(status_code=400, detail="Cannot review a terminal application unless changing between terminal states")
                    
                # Update application
                await conn.execute(
                    """
                    UPDATE applications 
                    SET status = $1, reviewer_id = $2, reviewed_at = NOW()
                    WHERE id = $3
                    """,
                    decision, current_user.id, application_id
                )
                
                # Insert audit log
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
