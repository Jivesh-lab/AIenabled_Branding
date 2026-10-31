"""
Milestones + monitoring against the real standalone (SQLite) store, through the real API. Progress figures shown
on every student page come from one place, so the list summary, the milestone endpoint and monitoring are
asserted against each other here.
"""
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from config import get_settings
from core import milestones as ms
from db import standalone_store
from db.postgres import get_db
from main import app

settings = get_settings()
settings.internal_jwt_secret = "test_internal_secret_for_jwt"
client = TestClient(app)

STUDENT_PERMS = ["submit_application", "view_applications"]


def auth(user_id="stu1", role="student", permissions=None):
    token = jwt.encode(
        {
            "sub": user_id, "role": role, "iss": "next-server", "aud": "fastapi-internal",
            "permissions": permissions if permissions is not None else STUDENT_PERMS,
            "exp": datetime.utcnow() + timedelta(seconds=300),
        },
        settings.internal_jwt_secret, algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def reviewer():
    return auth("adm1", "admin", ["review_applications"])


def idea(name="Smart Irrigation Controller"):
    return {
        "name": name, "shortDescription": "Soil-moisture driven irrigation for small farms.", "department": "Electronics",
        "domain": "AgriTech", "projectType": "Hardware", "maturity": "PROTOTYPE",
        "problem": "Smallholder farmers over-water crops because they cannot measure soil moisture.",
        "affectedUsers": "Smallholder farmers in semi-arid regions.", "currentSolutions": "Manual scheduling.",
        "solution": "A low-cost sensor node that opens valves only when the soil is dry.",
        "differentiation": "Costs a tenth of commercial controllers.",
        "teamMembers": [{"id": "l", "name": "Asha", "rollNumber": "", "email": "a@example.edu", "inviteStatus": "LEAD"}],
        "technologies": ["ESP32"], "githubUrl": "", "demoUrl": "", "prototypeAvailable": "YES", "attachments": [],
        "declarationAccepted": True,
    }


@pytest.fixture(autouse=True)
def isolated_store(tmp_path, monkeypatch):
    monkeypatch.setattr(standalone_store, "DB_PATH", tmp_path / "milestones.sqlite")
    standalone_store.init_standalone_db()
    app.dependency_overrides[get_db] = lambda: None

    async def no_assessment(data):
        return {"assessment_available": False, "validation": {"is_complete": True, "completeness_score": 100}}

    import agents.application_agent as agent
    monkeypatch.setattr(agent, "assess_application", no_assessment)
    yield
    app.dependency_overrides.pop(get_db, None)


def submit(headers, name="Smart Irrigation Controller"):
    r = client.post("/api/applications/submit", json=idea(name), headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["application_id"]


def approved(headers=None, name="Smart Irrigation Controller"):
    headers = headers or auth()
    app_id = submit(headers, name)
    assert client.post(f"/api/applications/{app_id}/decide", json={"decision": "approved"}, headers=reviewer()).status_code == 200
    return app_id


def add(app_id, title="Field test", due=None, headers=None):
    body = {"title": title, **({"dueDate": due} if due else {})}
    return client.post(f"/api/applications/{app_id}/milestones", json=body, headers=headers or auth())


def project(headers, app_id):
    return next(p for p in client.get("/api/applications/", headers=headers).json()["projects"] if p["id"] == app_id)


def day(offset):
    return (ms.today_ist() + timedelta(days=offset)).isoformat()


# ── Creating and ownership ───────────────────────────────────────────────────

def test_milestones_need_an_approved_project():
    h = auth()
    app_id = submit(h)  # submitted, not approved
    assert add(app_id).status_code == 409
    listing = client.get(f"/api/applications/{app_id}/milestones", headers=h).json()
    assert listing["milestones"] == [] and listing["canEdit"] is False and listing["summary"]["progress"] is None


def test_create_list_and_validate():
    h = auth()
    app_id = approved(h)
    created = add(app_id, "Field test", day(10))
    assert created.status_code == 201
    m = created.json()["milestone"]
    assert (m["status"], m["state"], m["completionPct"], m["createdByYou"], m["completedAt"]) == ("pending", "upcoming", 0, True, None)

    listing = client.get(f"/api/applications/{app_id}/milestones", headers=h).json()
    assert [x["title"] for x in listing["milestones"]] == ["Field test"] and listing["canEdit"] is True

    assert add(app_id, "ab").status_code == 422  # too short
    assert add(app_id, "FIELD TEST").status_code == 409  # duplicate (case-insensitive): a double-click cannot double-create
    assert client.post(f"/api/applications/{app_id}/milestones", json={"title": "x" * 200}, headers=h).status_code == 422
    assert client.post(f"/api/applications/{app_id}/milestones", json={"title": "Valid title", "dueDate": "tomorrow"}, headers=h).status_code == 422
    assert len(client.get(f"/api/applications/{app_id}/milestones", headers=h).json()["milestones"]) == 1


def test_per_project_limit():
    h = auth()
    app_id = approved(h)
    for i in range(ms.MAX_MILESTONES_PER_PROJECT):
        assert add(app_id, f"Milestone number {i}").status_code == 201
    assert add(app_id, "One too many").status_code == 409


def test_another_student_cannot_read_or_change_milestones():
    owner, intruder = auth("owner"), auth("intruder")
    app_id = approved(owner)
    mid = add(app_id, "Private milestone", headers=owner).json()["milestone"]["id"]

    assert client.get(f"/api/applications/{app_id}/milestones", headers=intruder).status_code == 403
    assert add(app_id, "Hijack", headers=intruder).status_code == 403
    assert client.patch(f"/api/applications/{app_id}/milestones/{mid}", json={"status": "completed"}, headers=intruder).status_code == 403
    assert client.post(f"/api/applications/{app_id}/monitoring", json={}, headers=intruder).status_code == 403
    assert client.get("/api/applications/missing/milestones", headers=owner).status_code == 404
    # nothing changed
    assert client.get(f"/api/applications/{app_id}/milestones", headers=owner).json()["milestones"][0]["status"] == "pending"


def test_a_milestone_id_from_another_project_is_not_reachable():
    h = auth()
    first, second = approved(h, "First Project Idea"), approved(h, "Second Project Idea")
    mid = add(first, "Belongs to first", headers=h).json()["milestone"]["id"]
    assert client.patch(f"/api/applications/{second}/milestones/{mid}", json={"status": "completed"}, headers=h).status_code == 404


def test_reviewers_cannot_use_the_student_milestone_endpoints():
    h = auth()
    app_id = approved(h)
    assert client.get(f"/api/applications/{app_id}/milestones", headers=reviewer()).status_code == 403
    assert client.post(f"/api/applications/{app_id}/milestones", json={"title": "By reviewer"}, headers=reviewer()).status_code == 403


# ── Updating ─────────────────────────────────────────────────────────────────

def test_completing_records_a_completion_date_and_is_idempotent():
    h = auth()
    app_id = approved(h)
    mid = add(app_id, "Field test", day(5), h).json()["milestone"]["id"]
    done = client.patch(f"/api/applications/{app_id}/milestones/{mid}", json={"status": "completed"}, headers=h).json()["milestone"]
    assert (done["status"], done["completionPct"], done["state"]) == ("completed", 100, "completed")
    assert done["completedAt"]
    again = client.patch(f"/api/applications/{app_id}/milestones/{mid}", json={"status": "completed"}, headers=h).json()["milestone"]
    assert again["completedAt"] == done["completedAt"]  # a repeat does not move the completion date

    reopened = client.patch(f"/api/applications/{app_id}/milestones/{mid}", json={"status": "in_progress"}, headers=h).json()["milestone"]
    assert reopened["completedAt"] is None and reopened["status"] == "in_progress"


def test_unsupported_statuses_and_percentages_are_refused():
    h = auth()
    app_id = approved(h)
    mid = add(app_id, "Field test", None, h).json()["milestone"]["id"]
    for body in ({"status": "blocked"}, {"status": "overdue"}, {"completionPct": 101}, {"completionPct": -5}, {}):
        r = client.patch(f"/api/applications/{app_id}/milestones/{mid}", json=body, headers=h)
        assert r.status_code == 400, body
    still = client.get(f"/api/applications/{app_id}/milestones", headers=h).json()["milestones"][0]
    assert (still["status"], still["completionPct"]) == ("pending", 0)


def test_percentage_only_updates_derive_a_coherent_status():
    h = auth()
    app_id = approved(h)
    mid = add(app_id, "Field test", None, h).json()["milestone"]["id"]
    patch = lambda pct: client.patch(f"/api/applications/{app_id}/milestones/{mid}", json={"completionPct": pct}, headers=h).json()["milestone"]  # noqa: E731
    assert (patch(40)["status"], patch(40)["completionPct"]) == ("in_progress", 40)
    assert patch(100)["status"] == "completed"
    assert patch(0)["status"] == "pending"


# ── Progress, overdue, consistency ───────────────────────────────────────────

def test_overdue_is_derived_from_the_due_date_and_completion_clears_it():
    h = auth()
    app_id = approved(h)
    late = add(app_id, "Late one", day(-3), h).json()["milestone"]
    assert late["state"] == "overdue"
    assert project(h, app_id)["milestones"]["overdue"] == 1
    client.patch(f"/api/applications/{app_id}/milestones/{late['id']}", json={"status": "completed"}, headers=h)
    assert project(h, app_id)["milestones"]["overdue"] == 0  # finishing late is no longer overdue


def test_missing_progress_is_not_zero_and_all_pages_share_one_number():
    h = auth()
    app_id = approved(h)
    assert project(h, app_id)["milestones"]["progress"] is None  # not tracked

    a = add(app_id, "First milestone", day(5), h).json()["milestone"]["id"]
    add(app_id, "Second milestone", day(9), h)
    assert project(h, app_id)["milestones"]["progress"] == 0  # tracked, nothing done: a real zero

    client.patch(f"/api/applications/{app_id}/milestones/{a}", json={"status": "completed"}, headers=h)
    from_list = project(h, app_id)["milestones"]
    from_detail = client.get(f"/api/applications/{app_id}/milestones", headers=h).json()["summary"]
    from_monitoring = client.post(f"/api/applications/{app_id}/monitoring", json={}, headers=h).json()["milestoneSummary"]
    assert from_list == from_detail == from_monitoring
    assert from_list["progress"] == 50 and from_list["completed"] == 1 and from_list["total"] == 2


# ── Monitoring ───────────────────────────────────────────────────────────────

def test_monitoring_with_no_data_is_not_a_healthy_project():
    h = auth()
    app_id = approved(h)
    body = client.post(f"/api/applications/{app_id}/monitoring", json={}, headers=h).json()
    assert body["evaluation"]["health_status"] == "No Data"
    assert body["isOfficialStatus"] is False


def test_monitoring_findings_come_from_persisted_records_and_link_to_a_workflow():
    h = auth()
    app_id = approved(h)
    add(app_id, "Late milestone", day(-2), h)
    add(app_id, "Future milestone", day(20), h)
    body = client.post(f"/api/applications/{app_id}/monitoring", json={"tasksTotal": 4, "tasksCompleted": 1}, headers=h).json()
    evaluation = body["evaluation"]
    assert evaluation["health_status"] == "Needs Attention"
    facts = evaluation["measured_facts"]
    assert (facts["total_milestones"], facts["overdue_milestones"], facts["tasks_completed"], facts["total_tasks"]) == (2, 1, 1, 4)
    targets = {s["code"]: s["target"] for s in evaluation["ai_interpretation"]["signals"]}
    assert targets == {"overdue_milestones": "milestones", "low_task_completion": "tasks"}
    assert "progress reports" in evaluation["ai_interpretation"]["not_tracked"]


def test_monitoring_is_advice_only_and_changes_nothing():
    h = auth()
    app_id = approved(h)
    add(app_id, "Late milestone", day(-2), h)
    before = project(h, app_id)
    client.post(f"/api/applications/{app_id}/monitoring", json={}, headers=h)
    after = project(h, app_id)
    assert before == after and after["reviewStatus"] == "APPROVED"
    listing = client.get(f"/api/applications/{app_id}/milestones", headers=h).json()["milestones"]
    assert listing[0]["status"] == "pending"  # a recommendation never marks anything resolved


def test_monitoring_rejects_inconsistent_task_counts():
    h = auth()
    app_id = approved(h)
    for body in ({"tasksCompleted": 3}, {"tasksTotal": 2, "tasksCompleted": 5}, {"tasksTotal": -1}):
        assert client.post(f"/api/applications/{app_id}/monitoring", json=body, headers=h).status_code == 422
