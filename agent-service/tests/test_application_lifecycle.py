"""
End-to-end lifecycle tests for student applications against the REAL standalone (SQLite) store:
draft -> resume -> submit -> review -> revision -> resubmit, plus ownership, duplicates and
reviewer authorisation. No database mocks: every assertion reads persisted rows through the API.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from config import get_settings
from db import standalone_store
from db.postgres import get_db
from main import app

settings = get_settings()
settings.internal_jwt_secret = "test_internal_secret_for_jwt"

client = TestClient(app)

STUDENT_PERMS = ["submit_application", "view_applications"]


def token(user_id, role="student", permissions=None):
    return jwt.encode(
        {
            "sub": user_id,
            "role": role,
            "iss": "next-server",
            "aud": "fastapi-internal",
            "permissions": permissions if permissions is not None else STUDENT_PERMS,
            "exp": datetime.utcnow() + timedelta(seconds=300),
        },
        settings.internal_jwt_secret,
        algorithm="HS256",
    )


def auth(user_id="stu1", role="student", permissions=None):
    return {"Authorization": f"Bearer {token(user_id, role, permissions)}"}


def reviewer(user_id="adm1", role="admin"):
    return auth(user_id, role, ["review_applications"])


def payload(**overrides):
    base = {
        "name": "Smart Irrigation Controller",
        "shortDescription": "Soil-moisture driven irrigation for small farms.",
        "department": "Electronics",
        "domain": "AgriTech",
        "projectType": "Hardware",
        "maturity": "PROTOTYPE",
        "problem": "Smallholder farmers over-water crops because they cannot measure soil moisture.",
        "affectedUsers": "Smallholder farmers in semi-arid regions.",
        "currentSolutions": "Manual scheduling.",
        "solution": "A low-cost sensor node that opens valves only when the soil is dry.",
        "differentiation": "Costs a tenth of commercial controllers.",
        "teamMembers": [
            {"id": "m1", "name": "Asha Rao", "rollNumber": "21EC001", "email": "asha@example.edu", "inviteStatus": "ACCEPTED"}
        ],
        "technologies": ["ESP32"],
        "githubUrl": "",
        "demoUrl": "",
        "prototypeAvailable": "YES",
        "attachments": [],
        "declarationAccepted": True,
    }
    base.update(overrides)
    return base


def draft_values(**overrides):
    values = payload(**overrides)
    values.pop("declarationAccepted")
    return values


@pytest.fixture(autouse=True)
def isolated_store(tmp_path, monkeypatch):
    """Fresh SQLite file per test; AI assessment stubbed (no network)."""
    monkeypatch.setattr(standalone_store, "DB_PATH", tmp_path / "lifecycle.sqlite")
    standalone_store.init_standalone_db()
    app.dependency_overrides[get_db] = lambda: None

    async def no_assessment(data):
        return {"assessment_available": False, "validation": {"is_complete": True, "completeness_score": 100}}

    import agents.application_agent as agent
    monkeypatch.setattr(agent, "assess_application", no_assessment)
    yield
    app.dependency_overrides.pop(get_db, None)


def save_draft(headers, values=None, application_id=None, step=1, furthest=1):
    body = {"values": values or draft_values(), "step": step, "furthestStep": furthest}
    if application_id:
        body["applicationId"] = application_id
    return client.post("/api/applications/draft", json=body, headers=headers)


def listing(headers):
    response = client.get("/api/applications/", headers=headers)
    assert response.status_code == 200
    return response.json()["projects"]


def audit_rows(application_id):
    with standalone_store.get_connection() as conn:
        return [
            (r["previous_status"], r["new_status"])
            for r in conn.execute(
                "SELECT previous_status, new_status FROM application_audit_logs WHERE application_id = ? ORDER BY created_at",
                (application_id,),
            )
        ]


# ── Drafts ───────────────────────────────────────────────────────────────────

def test_draft_create_resume_and_update_same_record():
    h = auth()
    created = save_draft(h, step=2, furthest=2)
    assert created.status_code == 200
    app_id = created.json()["application_id"]
    assert created.json()["status"] == "draft"

    resumed = client.get(f"/api/applications/{app_id}", headers=h).json()
    assert resumed["status"] == "DRAFT"
    assert resumed["formData"]["_draft"] == {"step": 2, "furthestStep": 2}
    assert resumed["updatedAt"]

    updated = save_draft(h, draft_values(name="Smart Irrigation Controller v2"), application_id=app_id, step=3, furthest=3)
    assert updated.status_code == 200
    assert updated.json()["application_id"] == app_id

    again = client.get(f"/api/applications/{app_id}", headers=h).json()
    assert again["formData"]["name"] == "Smart Irrigation Controller v2"  # edits survive a resume
    assert again["formData"]["_draft"]["step"] == 3
    assert len(listing(h)) == 1  # updating a draft never creates a second record


def test_draft_progress_is_persisted_completeness_not_a_guess():
    h = auth()
    full = save_draft(h, draft_values()).json()["application_id"]
    sparse = save_draft(h, {"name": "x"}).json()["application_id"]
    by_id = {p["id"]: p for p in listing(h)}
    assert by_id[full]["reviewStatus"] == "DRAFT"
    # Derived from the rule-based validation of the saved fields: the declaration is only given at
    # submission (-15) and there is no repo/demo link (-5), so a full draft is 80, not 100.
    assert by_id[full]["progress"] == 80
    assert by_id[sparse]["progress"] < by_id[full]["progress"]


# ── Validation ───────────────────────────────────────────────────────────────

def test_invalid_submission_is_rejected_and_not_persisted():
    h = auth()
    response = client.post("/api/applications/submit", json=payload(teamMembers=[]), headers=h)
    assert response.status_code == 422
    assert "At least one team member" in str(response.json()["detail"]["validation"]["missing_fields"])
    assert listing(h) == []


def test_field_level_errors_name_the_offending_field():
    response = client.post("/api/applications/submit", json=payload(name="ab"), headers=auth())
    assert response.status_code == 422
    assert any(err["loc"][-1] == "name" for err in response.json()["detail"])


def test_declaration_must_be_accepted():
    response = client.post("/api/applications/submit", json=payload(declarationAccepted=False), headers=auth())
    assert response.status_code == 400
    assert listing(auth()) == []


def test_submit_requires_submit_permission():
    response = client.post("/api/applications/submit", json=payload(), headers=auth(permissions=["view_applications"]))
    assert response.status_code == 403


# ── Submit, duplicates, double-click ─────────────────────────────────────────

def test_draft_then_submit_keeps_one_record():
    h = auth()
    app_id = save_draft(h).json()["application_id"]
    response = client.post("/api/applications/submit", json=payload(applicationId=app_id), headers=h)
    assert response.status_code == 200
    assert response.json()["application_id"] == app_id
    assert response.json()["agent_evaluation"]["assessment_available"] is False  # nothing fabricated
    (project,) = listing(h)
    assert project["id"] == app_id and project["reviewStatus"] == "SUBMITTED"
    assert audit_rows(app_id) == [("draft", "submitted")]


def test_repeated_submit_of_same_application_is_rejected():
    h = auth()
    app_id = save_draft(h).json()["application_id"]
    assert client.post("/api/applications/submit", json=payload(applicationId=app_id), headers=h).status_code == 200
    second = client.post("/api/applications/submit", json=payload(applicationId=app_id), headers=h)
    assert second.status_code == 409
    assert len(listing(h)) == 1
    assert audit_rows(app_id) == [("draft", "submitted")]  # one transition only


def test_duplicate_new_submission_with_same_name_is_rejected():
    h = auth()
    assert client.post("/api/applications/submit", json=payload(), headers=h).status_code == 200
    assert client.post("/api/applications/submit", json=payload(name="SMART IRRIGATION CONTROLLER"), headers=h).status_code == 409
    assert len(listing(h)) == 1


def test_concurrent_double_click_creates_exactly_one_submission():
    h = auth()
    app_id = save_draft(h).json()["application_id"]
    body = payload(applicationId=app_id)
    with ThreadPoolExecutor(max_workers=2) as pool:
        codes = sorted(f.result().status_code for f in [pool.submit(client.post, "/api/applications/submit", json=body, headers=h) for _ in range(2)])
    assert codes == [200, 409]
    assert audit_rows(app_id) == [("draft", "submitted")]


def test_cannot_save_draft_over_a_submitted_application():
    h = auth()
    app_id = save_draft(h).json()["application_id"]
    client.post("/api/applications/submit", json=payload(applicationId=app_id), headers=h)
    response = save_draft(h, application_id=app_id)
    assert response.status_code == 409
    assert listing(h)[0]["reviewStatus"] == "SUBMITTED"  # not regressed to DRAFT


# ── Ownership ────────────────────────────────────────────────────────────────

def test_other_student_cannot_read_edit_or_submit():
    owner, intruder = auth("owner"), auth("intruder")
    app_id = save_draft(owner).json()["application_id"]

    assert client.get(f"/api/applications/{app_id}", headers=intruder).status_code == 403
    assert save_draft(intruder, application_id=app_id).status_code == 403
    assert client.post("/api/applications/submit", json=payload(applicationId=app_id), headers=intruder).status_code == 403
    assert listing(intruder) == []
    assert listing(owner)[0]["reviewStatus"] == "DRAFT"  # untouched


def test_unknown_application_is_404():
    h = auth()
    assert client.get("/api/applications/does-not-exist", headers=h).status_code == 404
    assert save_draft(h, application_id="does-not-exist").status_code == 404
    assert client.post("/api/applications/submit", json=payload(applicationId="does-not-exist"), headers=h).status_code == 404


# ── Reviewer authorisation ───────────────────────────────────────────────────

def test_student_cannot_use_review_endpoints():
    h = auth()
    app_id = save_draft(h).json()["application_id"]
    assert client.get("/api/applications/queue", headers=h).status_code == 403
    assert client.post(f"/api/applications/{app_id}/decide", json={"decision": "approved"}, headers=h).status_code == 403
    # view_applications must not grant review rights either
    only_view = auth(permissions=["view_applications"])
    assert client.get("/api/applications/queue", headers=only_view).status_code == 403


def test_review_permission_with_non_reviewer_role_is_rejected():
    h = auth("stu1", "student", ["review_applications"])
    assert client.get("/api/applications/queue", headers=h).status_code == 403
    assert client.post("/api/applications/x/decide", json={"decision": "approved"}, headers=h).status_code == 403


def test_queue_lists_only_applications_awaiting_review():
    h = auth()
    draft_id = save_draft(h).json()["application_id"]
    submitted = client.post("/api/applications/submit", json=payload(name="Second Idea Entirely"), headers=h).json()["application_id"]
    queue = client.get("/api/applications/queue", headers=reviewer()).json()["queue"]
    assert [q["id"] for q in queue] == [submitted]
    assert draft_id not in [q["id"] for q in queue]


def test_cannot_decide_on_a_draft():
    h = auth()
    app_id = save_draft(h).json()["application_id"]
    assert client.post(f"/api/applications/{app_id}/decide", json={"decision": "approved"}, headers=reviewer()).status_code == 409


# ── Revision flow ────────────────────────────────────────────────────────────

def test_revision_request_edit_and_resubmit_same_record():
    h, rv = auth(), reviewer()
    app_id = client.post("/api/applications/submit", json=payload(), headers=h).json()["application_id"]

    needs_comment = client.post(f"/api/applications/{app_id}/decide", json={"decision": "revision_requested", "comments": "  "}, headers=rv)
    assert needs_comment.status_code == 400

    decided = client.post(f"/api/applications/{app_id}/decide", json={"decision": "revision_requested", "comments": "Add a cost breakdown."}, headers=rv)
    assert decided.status_code == 200

    seen = client.get(f"/api/applications/{app_id}", headers=h).json()
    assert seen["status"] == "REVISION_REQUESTED"
    assert seen["reviewerComments"] == "Add a cost breakdown."

    # Saving a draft while revising must NOT flip the status or lose the reviewer comments.
    assert save_draft(h, draft_values(problem="Updated problem statement that is long enough to pass."), application_id=app_id).status_code == 200
    seen = client.get(f"/api/applications/{app_id}", headers=h).json()
    assert seen["status"] == "REVISION_REQUESTED"
    assert seen["reviewerComments"] == "Add a cost breakdown."

    resubmitted = client.post("/api/applications/submit", json=payload(applicationId=app_id, differentiation="Now includes a full cost breakdown."), headers=h)
    assert resubmitted.status_code == 200
    assert resubmitted.json()["application_id"] == app_id

    projects = listing(h)
    assert len(projects) == 1 and projects[0]["id"] == app_id and projects[0]["reviewStatus"] == "SUBMITTED"
    assert audit_rows(app_id) == [
        (None, "submitted"),
        ("submitted", "revision_requested"),
        ("revision_requested", "submitted"),
    ]
    assert [q["id"] for q in client.get("/api/applications/queue", headers=rv).json()["queue"]] == [app_id]


# ── Terminal states ──────────────────────────────────────────────────────────

def test_approved_application_is_frozen_for_the_student():
    h, rv = auth(), reviewer()
    app_id = client.post("/api/applications/submit", json=payload(), headers=h).json()["application_id"]
    assert client.post(f"/api/applications/{app_id}/decide", json={"decision": "approved"}, headers=rv).status_code == 200

    assert save_draft(h, application_id=app_id).status_code == 409
    assert client.post("/api/applications/submit", json=payload(applicationId=app_id), headers=h).status_code == 409
    assert listing(h)[0]["reviewStatus"] == "APPROVED"


def test_terminal_decisions_may_only_change_between_terminal_states():
    h, rv = auth(), reviewer()
    app_id = client.post("/api/applications/submit", json=payload(), headers=h).json()["application_id"]
    client.post(f"/api/applications/{app_id}/decide", json={"decision": "approved"}, headers=rv)
    reopened = client.post(f"/api/applications/{app_id}/decide", json={"decision": "revision_requested", "comments": "x"}, headers=rv)
    assert reopened.status_code == 400
    assert client.post(f"/api/applications/{app_id}/decide", json={"decision": "rejected"}, headers=rv).status_code == 200
    assert listing(h)[0]["reviewStatus"] == "REJECTED"


# ── Status consistency ───────────────────────────────────────────────────────

def test_list_and_detail_report_the_same_status_at_every_step():
    h, rv = auth(), reviewer()
    app_id = save_draft(h).json()["application_id"]

    def agree(expected):
        assert listing(h)[0]["reviewStatus"] == expected
        assert client.get(f"/api/applications/{app_id}", headers=h).json()["status"] == expected

    agree("DRAFT")
    client.post("/api/applications/submit", json=payload(applicationId=app_id), headers=h)
    agree("SUBMITTED")
    client.post(f"/api/applications/{app_id}/decide", json={"decision": "revision_requested", "comments": "Fix it."}, headers=rv)
    agree("REVISION_REQUESTED")
    client.post("/api/applications/submit", json=payload(applicationId=app_id), headers=h)
    client.post(f"/api/applications/{app_id}/decide", json={"decision": "approved"}, headers=rv)
    agree("APPROVED")


def test_empty_draft_name_is_not_replaced_by_the_placeholder_on_resume():
    h = auth()
    app_id = save_draft(h, draft_values(name="")).json()["application_id"]
    resumed = client.get(f"/api/applications/{app_id}", headers=h).json()
    assert resumed["formData"]["name"] == ""  # not "Untitled Draft"


def test_team_lead_entry_satisfies_the_team_requirement_and_counts_in_team_size():
    """The wizard submits [lead, ...members]; a solo student (lead only) must be accepted."""
    lead = {"id": "stu1", "name": "Asha Rao", "rollNumber": "", "email": "asha@example.edu", "inviteStatus": "LEAD"}
    h = auth()
    response = client.post("/api/applications/submit", json=payload(teamMembers=[lead]), headers=h)
    assert response.status_code == 200
    (project,) = listing(h)
    assert project["teamSize"] == 1


def test_detail_includes_persisted_status_history_without_actor_ids():
    h, rv = auth(), reviewer()
    app_id = save_draft(h).json()["application_id"]
    client.post("/api/applications/submit", json=payload(applicationId=app_id), headers=h)
    client.post(f"/api/applications/{app_id}/decide", json={"decision": "revision_requested", "comments": "Add costs."}, headers=rv)

    history = client.get(f"/api/applications/{app_id}", headers=h).json()["history"]
    assert [(e["from"], e["to"]) for e in history] == [("DRAFT", "SUBMITTED"), ("SUBMITTED", "REVISION_REQUESTED")]
    assert history[-1]["comments"] == "Add costs."
    assert all("actor" not in e and "actor_id" not in e for e in history)
    assert all(e["at"] for e in history)


# ── Mentor directory lookup (Phase 4) ────────────────────────────────────────

def test_mentor_lookup_returns_public_profile_only():
    r = client.get("/api/mentors/lookup", params={"name": "dr. k. r. raman"}, headers=auth())
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Dr. K. R. Raman" and body["expertise"]
    assert "max_capacity" not in body and "current_active_projects" not in body  # internal load stays internal


def test_mentor_lookup_unknown_name_is_404_not_a_fabricated_profile():
    assert client.get("/api/mentors/lookup", params={"name": "Nobody Atall"}, headers=auth()).status_code == 404


def test_mentor_lookup_requires_a_valid_token_and_permission():
    assert client.get("/api/mentors/lookup", params={"name": "Dr. K. R. Raman"}).status_code == 401
    no_perm = auth(permissions=["submit_application"])
    assert client.get("/api/mentors/lookup", params={"name": "Dr. K. R. Raman"}, headers=no_perm).status_code == 403
