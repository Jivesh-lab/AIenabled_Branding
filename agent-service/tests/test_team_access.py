"""
Accepted teammates can open (and read milestones of) the project they joined - through the real endpoints and the
real standalone store. Only the Node membership lookup is faked; its fail-closed wrapper is exercised for real.
"""
from datetime import datetime, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient
from jose import jwt

from config import get_settings
from core import team_access
from db import standalone_store
from db.postgres import get_db
from main import app

from tests.test_milestones_api import auth, idea, reviewer  # noqa: F401

settings = get_settings()
settings.internal_jwt_secret = "test_internal_secret_for_jwt"
client = TestClient(app)

MEMBERS: set = set()  # (user_id, project_id) pairs the fake Node backend reports as ACCEPTED


@pytest.fixture(autouse=True)
def store(tmp_path, monkeypatch):
    monkeypatch.setattr(standalone_store, "DB_PATH", tmp_path / "team.sqlite")
    standalone_store.init_standalone_db()
    app.dependency_overrides[get_db] = lambda: None
    MEMBERS.clear()

    async def fake_lookup(user_id, project_id):
        return (user_id, project_id) in MEMBERS

    monkeypatch.setattr(team_access, "_lookup_membership", fake_lookup)

    async def no_assessment(data):
        return {"assessment_available": False, "validation": {"is_complete": True, "completeness_score": 100}}

    import agents.application_agent as agent
    monkeypatch.setattr(agent, "assess_application", no_assessment)
    yield
    app.dependency_overrides.pop(get_db, None)


def approved_project():
    founder = auth("founder")
    app_id = client.post("/api/applications/submit", json=idea(), headers=founder).json()["application_id"]
    assert client.post(f"/api/applications/{app_id}/decide", json={"decision": "approved"}, headers=reviewer()).status_code == 200
    return app_id


def details(app_id, headers):
    return client.get(f"/api/applications/{app_id}", headers=headers)


def test_founder_and_reviewers_keep_access():
    app_id = approved_project()
    assert details(app_id, auth("founder")).status_code == 200
    assert details(app_id, reviewer()).status_code == 200
    assert details(app_id, auth("fac1", "faculty", ["review_applications"])).status_code == 200


def test_accepted_teammate_opens_the_same_project():
    app_id = approved_project()
    MEMBERS.add(("mate", app_id))
    founder_view = details(app_id, auth("founder")).json()
    mate_view = details(app_id, auth("mate"))
    assert mate_view.status_code == 200
    assert mate_view.json()["id"] == founder_view["id"] == app_id
    assert mate_view.json()["startup"] == founder_view["startup"]


def test_pending_declined_revoked_expired_and_unrelated_get_403():
    # Node reports only ACCEPTED memberships as members, so every other state looks like "not a member" here.
    app_id = approved_project()
    for user in ("pending", "declined", "revoked", "expired", "unrelated"):
        assert details(app_id, auth(user)).status_code == 403, user


def test_membership_is_per_project():
    first, second = approved_project(), None
    founder = auth("founder")
    second = client.post("/api/applications/submit", json=idea("Another Venture"), headers=founder).json()["application_id"]
    MEMBERS.add(("mate", first))
    assert details(first, auth("mate")).status_code == 200
    assert details(second, auth("mate")).status_code == 403


def test_non_students_never_use_membership():
    app_id = approved_project()
    MEMBERS.add(("someone", app_id))
    assert details(app_id, auth("someone", "mentor")).status_code == 403


def test_lookup_failure_fails_closed_without_leaking_data(monkeypatch):
    app_id = approved_project()

    async def boom(user_id, project_id):
        raise httpx.ConnectError("node is down")

    monkeypatch.setattr(team_access, "_lookup_membership", boom)
    r = details(app_id, auth("mate"))
    assert r.status_code == 503
    assert "startup" not in r.json() and idea()["name"] not in r.text
    assert details(app_id, auth("founder")).status_code == 200  # founder never needs the lookup


def test_teammate_reads_milestones_but_cannot_write():
    founder, mate, other = auth("founder"), auth("mate"), auth("other")
    app_id = approved_project()
    MEMBERS.add(("mate", app_id))
    assert client.post(f"/api/applications/{app_id}/milestones", json={"title": "Field test"}, headers=founder).status_code == 201

    listing = client.get(f"/api/applications/{app_id}/milestones", headers=mate)
    assert listing.status_code == 200
    assert [m["title"] for m in listing.json()["milestones"]] == ["Field test"]
    assert listing.json()["canEdit"] is False

    mid = listing.json()["milestones"][0]["id"]
    assert client.post(f"/api/applications/{app_id}/milestones", json={"title": "Sneaky one"}, headers=mate).status_code == 403
    assert client.patch(f"/api/applications/{app_id}/milestones/{mid}", json={"status": "completed"}, headers=mate).status_code == 403
    assert client.get(f"/api/applications/{app_id}/milestones", headers=other).status_code == 403


@pytest.mark.asyncio
async def test_lookup_calls_node_with_a_service_token_and_fails_closed(monkeypatch):
    monkeypatch.undo()  # use the real wrapper
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        claims = jwt.decode(request.headers["authorization"].split()[1], settings.internal_jwt_secret,
                            algorithms=["HS256"], audience="node-internal", issuer="agent-service")
        seen["sub"] = claims["sub"]
        return httpx.Response(200, json={"success": True, "data": {"member": request.url.params["userId"] == "mate"}})

    real = httpx.AsyncClient
    monkeypatch.setattr(team_access.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(handler), **kw))
    assert await team_access.has_accepted_membership("mate", "p1") is True
    assert await team_access.has_accepted_membership("nobody", "p1") is False
    assert seen["sub"] == "agent-service" and "projectId=p1" in seen["url"]

    monkeypatch.setattr(team_access.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(lambda r: httpx.Response(500)), **kw))
    with pytest.raises(Exception) as err:
        await team_access.has_accepted_membership("mate", "p1")
    assert getattr(err.value, "status_code", None) == 503
