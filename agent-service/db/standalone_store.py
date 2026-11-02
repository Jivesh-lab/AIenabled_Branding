"""
db/standalone_store.py
───────────────────────
SQLite fallback store for standalone development mode when PostgreSQL is offline.
Ensures application submissions, review queues, and project queries work seamlessly.

Lifecycle rules and the student-facing summary shape live in core/application_status.py
and are shared with the PostgreSQL path in api/applications.py.
"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

from core import application_status as st
from core import milestones as ms

DB_PATH = Path(__file__).resolve().parent.parent / "standalone_data.sqlite"

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
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

            CREATE TABLE IF NOT EXISTS milestones (
                id TEXT PRIMARY KEY,
                startup_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                due_date TEXT,
                status TEXT DEFAULT 'pending',
                completion_pct INTEGER DEFAULT 0,
                created_by TEXT,
                completed_at TEXT,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (startup_id) REFERENCES startups(id)
            );
            CREATE INDEX IF NOT EXISTS idx_milestones_startup ON milestones(startup_id);

            CREATE TABLE IF NOT EXISTS application_audit_logs (
                id TEXT PRIMARY KEY,
                application_id TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                previous_status TEXT,
                new_status TEXT,
                comments TEXT,
                created_at TEXT
            );
            CREATE TABLE IF NOT EXISTS domain_events (
                id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL UNIQUE,
                event_type TEXT NOT NULL,
                aggregate_type TEXT NOT NULL,
                aggregate_id TEXT NOT NULL,
                application_id TEXT,
                project_id TEXT,
                actor_id TEXT NOT NULL,
                correlation_id TEXT NOT NULL,
                idempotency_key TEXT NOT NULL UNIQUE,
                payload TEXT NOT NULL DEFAULT '{}',
                status TEXT NOT NULL DEFAULT 'pending',
                attempts INTEGER NOT NULL DEFAULT 0,
                max_attempts INTEGER NOT NULL DEFAULT 5,
                next_attempt_at TEXT NOT NULL,
                processed_at TEXT,
                last_error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

def standalone_record_domain_event(
    event_type: str,
    aggregate_type: str,
    aggregate_id: str,
    actor_id: str,
    payload: Dict[str, Any],
    application_id: Optional[str] = None,
    project_id: Optional[str] = None,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    event_id = str(uuid.uuid4())
    idempotency_key = f"{event_type}:{aggregate_id}:{payload.get('transition_id', event_id)}"
    with get_connection() as conn:
        conn.execute(
            """INSERT OR IGNORE INTO domain_events
               (id, event_id, event_type, aggregate_type, aggregate_id, application_id, project_id,
                actor_id, correlation_id, idempotency_key, payload, next_attempt_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (event_id, event_id, event_type, aggregate_type, str(aggregate_id), application_id, project_id,
             str(actor_id), event_id, idempotency_key, json.dumps(payload), now, now, now),
        )
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(applications)").fetchall()}
        if "completeness" not in columns:
            conn.execute("ALTER TABLE applications ADD COLUMN completeness INTEGER DEFAULT 0")
        if "eligibility_ok" not in columns:
            conn.execute("ALTER TABLE applications ADD COLUMN eligibility_ok INTEGER")
        if "reviewer_comments" not in columns:
            conn.execute("ALTER TABLE applications ADD COLUMN reviewer_comments TEXT")

# Initialize on module import
init_standalone_db()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_json(raw: Optional[str], default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except Exception:
        return default


def _audit(cursor: sqlite3.Cursor, application_id: str, actor_id: str, previous: Optional[str], new: str, comments: Optional[str], now_iso: str) -> None:
    cursor.execute(
        """
        INSERT INTO application_audit_logs (id, application_id, actor_id, previous_status, new_status, comments, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (str(uuid.uuid4()), application_id, actor_id, previous, new, comments, now_iso),
    )


def _load_owned(cursor: sqlite3.Cursor, application_id: str, applicant_id: str) -> sqlite3.Row:
    """Fetches an application the caller owns. 404 if missing, 403 if someone else's."""
    cursor.execute("SELECT id, startup_id, applicant_id, status FROM applications WHERE id = ?", (application_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    if row["applicant_id"] != applicant_id:
        raise HTTPException(status_code=403, detail="You do not own this application")
    return row


def standalone_check_resubmittable(application_id: str, applicant_id: str) -> None:
    """Cheap pre-flight (before the AI call): ownership + status. Raises HTTPException."""
    with get_connection() as conn:
        row = _load_owned(conn.cursor(), application_id, applicant_id)
        st.require_student_editable(row["status"], "resubmitted")


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
    completeness: int = 100,
    ai_summary: Optional[str] = None,
    ai_feedback: Optional[str] = None,
) -> str:
    now_iso = _now()
    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")  # serialise concurrent submits (double-click / retry)
        cursor = conn.cursor()

        active = ",".join("?" for _ in st.ACTIVE)
        cursor.execute(
            f"""
            SELECT a.id FROM applications a
            JOIN startups s ON s.id = a.startup_id
            WHERE a.applicant_id = ? AND lower(s.name) = lower(?)
              AND a.status IN ({active})
            LIMIT 1
            """,
            (applicant_id, startup_name, *st.ACTIVE),
        )
        if cursor.fetchone():
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
            VALUES (?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (application_id, startup_id, applicant_id, completeness, json.dumps(documents), json.dumps(form_data), ai_summary, ai_feedback, now_iso, now_iso, now_iso)
        )
        _audit(cursor, application_id, applicant_id, None, st.SUBMITTED, "Submitted by applicant", now_iso)
        conn.commit()
        return application_id


def standalone_save_draft(
    applicant_id: str,
    values: Dict[str, Any],
    step: int,
    furthest_step: int,
    application_id: Optional[str] = None,
    completeness: int = 0,
) -> Dict[str, Any]:
    now_iso = _now()
    stored = json.dumps({**values, "_draft": {"step": step, "furthestStep": furthest_step}})
    name = values.get("name") or "Untitled Draft"
    stage = str(values.get("maturity") or "idea").lower()
    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.cursor()
        if application_id:
            row = _load_owned(cursor, application_id, applicant_id)
            st.require_student_editable(row["status"], "edited")
            # Keeps the status as is: a revision_requested application stays revision_requested.
            cursor.execute(
                """
                UPDATE startups SET name = ?, tagline = ?, problem = ?, solution = ?, stage = ?, sector = ?, updated_at = ?
                WHERE id = ?
                """,
                (name, values.get("shortDescription", ""), values.get("problem", ""), values.get("solution", ""), stage, values.get("domain", ""), now_iso, row["startup_id"]),
            )
            cursor.execute(
                "UPDATE applications SET form_data = ?, completeness = ?, updated_at = ? WHERE id = ?",
                (stored, completeness, now_iso, application_id),
            )
            status = row["status"]
        else:
            startup_id = str(uuid.uuid4())
            application_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO startups (id, user_id, name, tagline, problem, solution, stage, sector, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
                """,
                (startup_id, applicant_id, name, values.get("shortDescription", ""), values.get("problem", ""), values.get("solution", ""), stage, values.get("domain", ""), now_iso, now_iso),
            )
            cursor.execute(
                """
                INSERT INTO applications (id, startup_id, applicant_id, status, completeness, form_data, created_at, updated_at)
                VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)
                """,
                (application_id, startup_id, applicant_id, completeness, stored, now_iso, now_iso),
            )
            status = st.DRAFT
        conn.commit()
        return {"success": True, "application_id": application_id, "status": status, "values": values, "step": step, "furthestStep": furthest_step, "updatedAt": now_iso}


def standalone_update_application(
    application_id: str,
    applicant_id: str,
    values: Dict[str, Any],
    documents: List[Dict[str, Any]],
    completeness: int = 100,
    ai_summary: Optional[str] = None,
    ai_feedback: Optional[str] = None,
) -> Dict[str, Any]:
    """Submits (draft) or resubmits (revision_requested) the SAME application record."""
    now_iso = _now()
    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.cursor()
        row = _load_owned(cursor, application_id, applicant_id)
        st.require_student_editable(row["status"], "resubmitted")
        previous = row["status"]
        cursor.execute(
            """
            UPDATE startups SET name = ?, tagline = ?, problem = ?, solution = ?, stage = ?, sector = ?, updated_at = ?
            WHERE id = ?
            """,
            (values["name"], values["shortDescription"], values["problem"], values["solution"], str(values["maturity"]).lower(), values["domain"], now_iso, row["startup_id"]),
        )
        cursor.execute(
            """
            UPDATE applications
            SET status = 'submitted', form_data = ?, documents = ?, ai_summary = ?, ai_feedback = ?, completeness = ?,
                submitted_at = ?, reviewed_at = NULL, reviewer_id = NULL, updated_at = ?
            WHERE id = ?
            """,
            (json.dumps(values), json.dumps(documents), ai_summary, ai_feedback, completeness, now_iso, now_iso, application_id),
        )
        _audit(cursor, application_id, applicant_id, previous, st.SUBMITTED,
               "Resubmitted after revision request" if previous == st.REVISION_REQUESTED else "Submitted by applicant", now_iso)
        conn.commit()
        return {"success": True, "application_id": application_id, "status": "submitted"}


def standalone_get_applications(applicant_id: str) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                a.id as app_id, a.startup_id, a.status as review_status, a.completeness, a.form_data, a.ai_summary, a.ai_feedback,
                a.submitted_at, a.updated_at,
                s.name, s.tagline as short_description, s.sector as domain, s.stage as maturity
            FROM applications a
            JOIN startups s ON a.startup_id = s.id
            WHERE a.applicant_id = ?
            ORDER BY COALESCE(a.updated_at, a.submitted_at) DESC
            """,
            (applicant_id,)
        )
        rows = cursor.fetchall()
    milestone_rows = standalone_milestone_rows([r["startup_id"] for r in rows])
    today = ms.today_ist()
    return [
        st.build_project_summary(
            app_id=r["app_id"], status=r["review_status"], completeness=r["completeness"],
            form=_load_json(r["form_data"], {}), name=r["name"], short_description=r["short_description"],
            domain=r["domain"], maturity=r["maturity"], updated_at=r["updated_at"], submitted_at=r["submitted_at"],
            ai_summary=r["ai_summary"], ai_feedback=r["ai_feedback"],
            milestones=ms.summarise(milestone_rows.get(r["startup_id"], []), today),
        )
        for r in rows
    ]


def standalone_get_application_queue(scope: str = "awaiting") -> List[Dict[str, Any]]:
    """Applications for reviewers. scope: 'awaiting' (default), 'all', or one status (approved, rejected, ...)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        statuses = _scope_statuses(scope)
        where, params = "", ()
        if statuses is not None:
            where = f"WHERE a.status IN ({','.join('?' for _ in statuses)})"
            params = tuple(statuses)
        cursor.execute(
            f"""
            SELECT
                a.id as app_id, a.status as review_status, a.submitted_at, a.updated_at, a.applicant_id,
                a.reviewer_comments,
                s.name as startup_name, s.sector as domain, s.stage as maturity
            FROM applications a
            JOIN startups s ON a.startup_id = s.id
            {where}
            ORDER BY COALESCE(a.updated_at, a.submitted_at) DESC
            """,
            params,
        )
        return [
            {
                "id": str(r["app_id"]),
                "startupName": r["startup_name"],
                "domain": r["domain"],
                "status": str(r["review_status"]).upper(),
                "maturity": str(r["maturity"]).upper(),
                "applicantId": r["applicant_id"],
                "submittedAt": r["submitted_at"],
                "updatedAt": r["updated_at"],
                "reviewerComments": r["reviewer_comments"],
            }
            for r in cursor.fetchall()
        ]


def _scope_statuses(scope: str):
    """Statuses for a queue scope; None means every submitted application (drafts are never reviewer-visible)."""
    scope = (scope or "awaiting").lower()
    if scope == "awaiting":
        return list(st.AWAITING_REVIEW)
    if scope == "all":
        return [x for x in st.ALL_STATUSES if x != st.DRAFT]
    if scope in st.ALL_STATUSES and scope != st.DRAFT:
        return [scope]
    raise HTTPException(status_code=400, detail="Unknown status filter")


def standalone_applicant_id(application_id: str) -> Optional[str]:
    """The applicant of an application, or None when it does not exist."""
    with get_connection() as conn:
        row = conn.execute("SELECT applicant_id FROM applications WHERE id = ?", (application_id,)).fetchone()
        return str(row["applicant_id"]) if row else None


def standalone_get_application_details(application_id: str, requester_id: str, can_review: bool = False, is_member: bool = False) -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                a.id as app_id, a.status as review_status, a.applicant_id, a.form_data, a.documents, a.ai_summary, a.ai_feedback,
                a.reviewer_comments, a.submitted_at, a.updated_at,
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
        if not can_review and not is_member and record["applicant_id"] != requester_id:
            raise HTTPException(status_code=403, detail="You do not have access to this application")

        form = _load_json(record["form_data"], {})
        docs = _load_json(record["documents"], [])
        cursor.execute(
            """
            SELECT previous_status, new_status, comments, created_at
            FROM application_audit_logs WHERE application_id = ? ORDER BY created_at ASC
            """,
            (application_id,),
        )
        history = st.build_history(cursor.fetchall())

        return {
            "history": history,
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
            "documents": docs,
            "submittedAt": record["submitted_at"],
            "updatedAt": record["updated_at"],
            "applicantId": record["applicant_id"],
            "reviewerComments": record["reviewer_comments"],
        }


def standalone_decide_application(application_id: str, decision: str, reviewer_id: str, comments: Optional[str] = None) -> Dict[str, Any]:
    now_iso = _now()
    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM applications WHERE id = ?", (application_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Application not found")

        prev_status = row["status"]
        if prev_status in st.TERMINAL and decision not in st.TERMINAL:
            raise HTTPException(status_code=400, detail="Cannot review a terminal application unless changing between terminal states")
        if prev_status not in st.AWAITING_REVIEW and prev_status not in st.TERMINAL:
            raise HTTPException(status_code=409, detail=f"Application is {prev_status} and is not awaiting review")

        cursor.execute(
            """
            UPDATE applications
            SET status = ?, reviewer_id = ?, reviewer_comments = ?, reviewed_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (decision, reviewer_id, comments, now_iso, now_iso, application_id)
        )
        _audit(cursor, application_id, reviewer_id, prev_status, decision, comments, now_iso)
        conn.commit()
        return {"success": True, "status": decision}


# ── Milestones (same columns as the PostgreSQL `milestones` table) ───────────

def standalone_owned_application(application_id: str, applicant_id: str) -> Dict[str, Any]:
    """The caller's own application as {startup_id, status}. 404 if missing, 403 if it is someone else's."""
    with get_connection() as conn:
        row = _load_owned(conn.cursor(), application_id, applicant_id)
        return {"startup_id": row["startup_id"], "status": row["status"]}


def standalone_application_stub(application_id: str) -> Optional[Dict[str, Any]]:
    """{startup_id, status} for any application (callers must authorise first), or None."""
    with get_connection() as conn:
        row = conn.execute("SELECT startup_id, status FROM applications WHERE id = ?", (application_id,)).fetchone()
        return {"startup_id": row["startup_id"], "status": row["status"]} if row else None


def standalone_list_milestones(startup_id: str) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM milestones WHERE startup_id = ? ORDER BY COALESCE(due_date, '9999-12-31'), created_at",
            (startup_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def standalone_create_milestone(startup_id: str, creator_id: str, title: str, description: str, due_date: Optional[str]) -> Dict[str, Any]:
    now_iso = _now()
    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        count = conn.execute("SELECT COUNT(*) FROM milestones WHERE startup_id = ?", (startup_id,)).fetchone()[0]
        if count >= ms.MAX_MILESTONES_PER_PROJECT:
            raise HTTPException(status_code=409, detail=f"A project can have at most {ms.MAX_MILESTONES_PER_PROJECT} milestones")
        duplicate = conn.execute(
            "SELECT 1 FROM milestones WHERE startup_id = ? AND lower(title) = lower(?)", (startup_id, title)
        ).fetchone()
        if duplicate:
            raise HTTPException(status_code=409, detail="A milestone with this title already exists")
        milestone_id = str(uuid.uuid4())
        conn.execute(
            """
            INSERT INTO milestones (id, startup_id, title, description, due_date, status, completion_pct, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)
            """,
            (milestone_id, startup_id, title, description, due_date, creator_id, now_iso, now_iso),
        )
        conn.commit()
        return dict(conn.execute("SELECT * FROM milestones WHERE id = ?", (milestone_id,)).fetchone())


def standalone_update_milestone(startup_id: str, milestone_id: str, status: Optional[str], pct: Optional[int]) -> Dict[str, Any]:
    now_iso = _now()
    with get_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute("SELECT * FROM milestones WHERE id = ? AND startup_id = ?", (milestone_id, startup_id)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Milestone not found")
        try:
            new_status, new_pct = ms.resolve_update(row["status"], row["completion_pct"], status, pct)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        completed_at = row["completed_at"] if new_status == ms.COMPLETED and row["completed_at"] else (now_iso if new_status == ms.COMPLETED else None)
        conn.execute(
            "UPDATE milestones SET status = ?, completion_pct = ?, completed_at = ?, updated_at = ? WHERE id = ?",
            (new_status, new_pct, completed_at, now_iso, milestone_id),
        )
        conn.commit()
        return dict(conn.execute("SELECT * FROM milestones WHERE id = ?", (milestone_id,)).fetchone())


def standalone_milestone_rows(startup_ids: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    """Milestone rows grouped by startup id, for the project list summary."""
    if not startup_ids:
        return {}
    marks = ",".join("?" for _ in startup_ids)
    with get_connection() as conn:
        rows = conn.execute(f"SELECT * FROM milestones WHERE startup_id IN ({marks})", startup_ids).fetchall()
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        grouped.setdefault(r["startup_id"], []).append(dict(r))
    return grouped


def standalone_startup_name(startup_id: str) -> Optional[str]:
    with get_connection() as conn:
        row = conn.execute("SELECT name FROM startups WHERE id = ?", (startup_id,)).fetchone()
        return row["name"] if row else None

def standalone_claim_events(limit: int = 50) -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            """SELECT id, event_id, event_type, aggregate_type, aggregate_id, application_id, project_id,
                      actor_id, correlation_id, idempotency_key, payload, attempts, created_at
               FROM domain_events
               WHERE (status IN ('pending', 'failed') AND next_attempt_at <= ?)
                  OR (status = 'processing' AND updated_at < datetime('now', '-10 minutes'))
               ORDER BY created_at ASC
               LIMIT ?""",
            (now, limit),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        if rows:
            ids = [r["id"] for r in rows]
            placeholders = ",".join("?" for _ in ids)
            conn.execute(
                f"""UPDATE domain_events
                    SET status = 'processing', attempts = attempts + 1, updated_at = ?
                    WHERE id IN ({placeholders})""",
                [now] + ids,
            )
            conn.commit()
        for r in rows:
            if isinstance(r.get("payload"), str):
                r["payload"] = _load_json(r["payload"], {})
        return rows


def standalone_complete_event(event_id: str, success: bool = True, error: Optional[str] = None) -> bool:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        if success:
            cursor = conn.execute(
                """UPDATE domain_events
                   SET status = 'completed', processed_at = ?, last_error = NULL, updated_at = ?
                   WHERE event_id = ? AND status = 'processing'""",
                (now, now, event_id),
            )
        else:
            cursor = conn.execute(
                """UPDATE domain_events
                   SET status = CASE WHEN attempts >= max_attempts THEN 'dead_letter' ELSE 'failed' END,
                       last_error = ?,
                       next_attempt_at = datetime('now', '+5 minutes'),
                       updated_at = ?
                   WHERE event_id = ? AND status = 'processing'""",
                (error or "Relay delivery failed", now, event_id),
            )
        conn.commit()
        return cursor.rowcount > 0


def standalone_list_events(limit: int = 100, event_type: Optional[str] = None, application_id: Optional[str] = None) -> List[Dict[str, Any]]:
    clauses = []
    params = []
    if event_type:
        clauses.append("event_type = ?")
        params.append(event_type)
    if application_id:
        clauses.append("application_id = ?")
        params.append(application_id)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    params.append(limit)
    with get_connection() as conn:
        cursor = conn.execute(
            f"""SELECT event_id, event_type, aggregate_type, aggregate_id, application_id, project_id,
                       actor_id, correlation_id, idempotency_key, payload, status, attempts,
                       processed_at, last_error, created_at
                FROM domain_events {where}
                ORDER BY created_at DESC LIMIT ?""",
            params,
        )
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            if isinstance(r.get("payload"), str):
                r["payload"] = _load_json(r["payload"], {})
        return rows

