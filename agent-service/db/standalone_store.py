"""
db/standalone_store.py
───────────────────────
SQLite fallback store for standalone development mode when PostgreSQL is offline.
Ensures application submissions, review queues, and project queries work seamlessly.
"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

DB_PATH = Path(__file__).resolve().parent.parent / "standalone_data.sqlite"

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_standalone_db() -> None:
    """Create local tables if they do not exist."""
    with get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS startups (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                tagline TEXT,
                problem TEXT,
                solution TEXT,
                stage TEXT DEFAULT 'idea',
                sector TEXT,
                status TEXT DEFAULT 'active',
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS applications (
                id TEXT PRIMARY KEY,
                startup_id TEXT NOT NULL,
                applicant_id TEXT NOT NULL,
                status TEXT DEFAULT 'submitted',
                completeness INTEGER DEFAULT 0,
                eligibility_ok INTEGER,
                documents TEXT DEFAULT '[]',
                form_data TEXT DEFAULT '{}',
                ai_summary TEXT,
                ai_feedback TEXT,
                reviewer_id TEXT,
                reviewer_comments TEXT,
                submitted_at TEXT,
                reviewed_at TEXT,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (startup_id) REFERENCES startups(id)
            );

            CREATE TABLE IF NOT EXISTS application_audit_logs (
                id TEXT PRIMARY KEY,
                application_id TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                previous_status TEXT,
                new_status TEXT,
                comments TEXT,
                created_at TEXT
            );
        """)
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(applications)").fetchall()}
        if "completeness" not in columns:
            conn.execute("ALTER TABLE applications ADD COLUMN completeness INTEGER DEFAULT 0")
        if "eligibility_ok" not in columns:
            conn.execute("ALTER TABLE applications ADD COLUMN eligibility_ok INTEGER")
        if "reviewer_comments" not in columns:
            conn.execute("ALTER TABLE applications ADD COLUMN reviewer_comments TEXT")

# Initialize on module import
init_standalone_db()

def standalone_submit_application(
    applicant_id: str,
    startup_name: str,
    tagline: str,
    problem: str,
    solution: str,
    stage: str,
    sector: str,
    documents: List[Dict[str, Any]],
    form_data: Dict[str, Any],
    ai_summary: Optional[str] = None,
    ai_feedback: Optional[str] = None,
) -> str:
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute(
            """
            SELECT a.id FROM applications a
            JOIN startups s ON s.id = a.startup_id
            WHERE a.applicant_id = ? AND lower(s.name) = lower(?)
              AND a.status IN ('submitted', 'under_review', 'revision_requested')
            LIMIT 1
            """,
            (applicant_id, startup_name),
        )
        duplicate = cursor.fetchone()
        if duplicate:
            raise HTTPException(status_code=409, detail="An active application for this idea already exists")

        startup_id = str(uuid.uuid4())
        application_id = str(uuid.uuid4())

        cursor.execute(
            """
            INSERT INTO startups (id, user_id, name, tagline, problem, solution, stage, sector, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            """,
            (startup_id, applicant_id, startup_name, tagline, problem, solution, stage, sector, now_iso, now_iso)
        )

        cursor.execute(
            """
            INSERT INTO applications (id, startup_id, applicant_id, status, completeness, documents, form_data, ai_summary, ai_feedback, submitted_at, created_at, updated_at)
            VALUES (?, ?, ?, 'submitted', 100, ?, ?, ?, ?, ?, ?, ?)
            """,
            (application_id, startup_id, applicant_id, json.dumps(documents), json.dumps(form_data), ai_summary, ai_feedback, now_iso, now_iso, now_iso)
        )
        conn.commit()

        return application_id

def standalone_save_draft(
    applicant_id: str,
    values: Dict[str, Any],
    step: int,
    furthest_step: int,
    application_id: Optional[str] = None,
) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        if application_id:
            cursor.execute("SELECT id, applicant_id, status FROM applications WHERE id = ?", (application_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Application not found")
            if row["applicant_id"] != applicant_id:
                raise HTTPException(status_code=403, detail="You do not own this application")
            if row["status"] in ("approved", "rejected"):
                raise HTTPException(status_code=409, detail="This application cannot be edited")
            cursor.execute(
                "UPDATE applications SET form_data = ?, status = 'draft', updated_at = ? WHERE id = ?",
                (json.dumps({**values, "_draft": {"step": step, "furthestStep": furthest_step}}), now_iso, application_id),
            )
        else:
            startup_id = str(uuid.uuid4())
            application_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO startups (id, user_id, name, tagline, problem, solution, stage, sector, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
                """,
                (startup_id, applicant_id, values.get("name") or "Untitled Draft", values.get("shortDescription", ""), values.get("problem", ""), values.get("solution", ""), str(values.get("maturity", "IDEA")).lower(), values.get("domain", ""), now_iso, now_iso),
            )
            cursor.execute(
                """
                INSERT INTO applications (id, startup_id, applicant_id, status, form_data, created_at, updated_at)
                VALUES (?, ?, ?, 'draft', ?, ?, ?)
                """,
                (application_id, startup_id, applicant_id, json.dumps({**values, "_draft": {"step": step, "furthestStep": furthest_step}}), now_iso, now_iso),
            )
        conn.commit()
        return {"application_id": application_id, "status": "draft", "values": values, "step": step, "furthestStep": furthest_step}

def standalone_update_application(application_id: str, applicant_id: str, values: Dict[str, Any], ai_feedback: Optional[str] = None) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT startup_id, applicant_id, status FROM applications WHERE id = ?", (application_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Application not found")
        if row["applicant_id"] != applicant_id:
            raise HTTPException(status_code=403, detail="You do not own this application")
        if row["status"] in ("approved", "rejected"):
            raise HTTPException(status_code=409, detail="This application cannot be resubmitted")
        cursor.execute(
            """
            UPDATE startups SET name = ?, tagline = ?, problem = ?, solution = ?, stage = ?, sector = ?, updated_at = ?
            WHERE id = ?
            """,
            (values["name"], values["shortDescription"], values["problem"], values["solution"], values["maturity"].lower(), values["domain"], now_iso, row["startup_id"]),
        )
        cursor.execute(
            """
            UPDATE applications
            SET status = 'submitted', form_data = ?, documents = ?, ai_feedback = ?, completeness = 100,
                submitted_at = ?, reviewed_at = NULL, reviewer_id = NULL, updated_at = ?
            WHERE id = ?
            """,
            (json.dumps(values), json.dumps(values.get("attachments", [])), ai_feedback, now_iso, now_iso, application_id),
        )
        conn.commit()
        return {"success": True, "application_id": application_id, "status": "submitted"}

def standalone_get_applications(applicant_id: str) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT 
                a.id as app_id, a.status as review_status, a.completeness, a.form_data, a.submitted_at, a.updated_at,
                s.id as startup_id, s.name, s.tagline as short_description, s.sector as domain, s.stage as maturity,
                s.status as pipeline_position
            FROM applications a
            JOIN startups s ON a.startup_id = s.id
            WHERE a.applicant_id = ?
            ORDER BY a.submitted_at DESC
            """,
            (applicant_id,)
        )
        rows = cursor.fetchall()
        projects = []
        for r in rows:
            form = {}
            if r['form_data']:
                try:
                    form = json.loads(r['form_data'])
                except Exception:
                    pass
            team_size = len(form.get('teamMembers', [])) if form.get('teamMembers') else 1
            sub_date = (r['updated_at'] or r['submitted_at'])[:10] if (r['updated_at'] or r['submitted_at']) else None

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
                "updatedAt": sub_date,
                "next": (
                    {"kind": "action", "label": "Complete your draft"} if r['review_status'] == 'draft'
                    else {"kind": "action", "label": "Address reviewer feedback"} if r['review_status'] == 'revision_requested'
                    else {"kind": "action", "label": "Awaiting review"} if r['review_status'] == 'submitted'
                    else None
                )
            })
        return projects

def standalone_get_application_queue() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
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
        rows = cursor.fetchall()
        queue = []
        for r in rows:
            queue.append({
                "id": str(r['app_id']),
                "startupName": r['startup_name'],
                "domain": r['domain'],
                "status": str(r['review_status']).upper(),
                "maturity": str(r['maturity']).upper(),
                "applicantId": r['applicant_id'],
                "submittedAt": r['submitted_at']
            })
        return queue

def standalone_get_application_details(application_id: str, requester_id: str, can_review: bool = False) -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT 
                a.id as app_id, a.status as review_status, a.applicant_id, a.form_data, a.documents, a.ai_summary, a.ai_feedback, a.reviewer_comments, a.submitted_at,
                s.name as startup_name, s.tagline, s.problem, s.solution, s.sector, s.stage
            FROM applications a
            JOIN startups s ON a.startup_id = s.id
            WHERE a.id = ?
            """,
            (application_id,)
        )
        record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Application not found")
        if not can_review and record["applicant_id"] != requester_id:
            raise HTTPException(status_code=403, detail="You do not have access to this application")

        form = {}
        if record['form_data']:
            try:
                form = json.loads(record['form_data'])
            except Exception:
                pass

        docs = []
        if record['documents']:
            try:
                docs = json.loads(record['documents'])
            except Exception:
                pass

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
            "submittedAt": record['submitted_at']
            ,"applicantId": record["applicant_id"]
            ,"reviewerComments": record["reviewer_comments"]
        }

def standalone_decide_application(application_id: str, decision: str, reviewer_id: str, comments: Optional[str] = None) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM applications WHERE id = ?", (application_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Application not found")

        prev_status = row['status']
        if prev_status in ['approved', 'rejected'] and decision not in ['approved', 'rejected']:
            raise HTTPException(status_code=400, detail="Cannot review a terminal application unless changing between terminal states")

        cursor.execute(
            """
            UPDATE applications 
            SET status = ?, reviewer_id = ?, reviewer_comments = ?, reviewed_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (decision, reviewer_id, comments, now_iso, now_iso, application_id)
        )

        audit_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO application_audit_logs (id, application_id, actor_id, previous_status, new_status, comments, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (audit_id, application_id, reviewer_id, prev_status, decision, comments, now_iso)
        )
        conn.commit()
        return {"success": True, "status": decision}
