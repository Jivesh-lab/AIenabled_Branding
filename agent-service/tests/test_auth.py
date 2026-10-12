import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import jwt
from datetime import datetime, timezone, timedelta

from api.auth import get_current_user, get_internal_service
from api.chat import router as chat_router
from api.applications import router as apps_router
from api.matchmaking import router as match_router
from config import get_settings

app = FastAPI()
app.include_router(chat_router)
app.include_router(apps_router)
app.include_router(match_router)
client = TestClient(app)

settings = get_settings()
settings.jwt_secret = "test_secret_for_jwt"
settings.internal_jwt_secret = "test_internal_secret_for_jwt"

def create_user_token(user_id: str, role: str, exp_delta: int = 3600) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=exp_delta)
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

def create_internal_token(
    user_id: str,
    role: str,
    permissions: list[str] = None,
    exp_delta: int = 60,
    iss: str = "next-server",
    aud: str = "fastapi-internal",
    secret: str = None
) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "permissions": permissions or [],
        "iss": iss,
        "aud": aud,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=exp_delta)
    }
    return jwt.encode(payload, secret or settings.internal_jwt_secret, algorithm="HS256")

# Mock get_db
from db.postgres import get_db

async def mock_get_db():
    class MockPool:
        from contextlib import asynccontextmanager
        @asynccontextmanager
        async def acquire(self):
            class MockConn:
                async def fetch(self, *args, **kwargs): return []
                async def fetchrow(self, *args, **kwargs): return None
                from contextlib import asynccontextmanager
                @asynccontextmanager
                async def transaction(self):
                    yield
            yield MockConn()
    return MockPool()

app.dependency_overrides[get_db] = mock_get_db


# --- User Endpoint Authentication Tests ---

def test_missing_token_returns_401():
    response = client.get("/api/chat/sessions/user123")
    assert response.status_code == 401
    assert "Authentication credentials missing" in response.json()["detail"]

def test_invalid_token_returns_401():
    response = client.get(
        "/api/chat/sessions/user123",
        headers={"Authorization": "Bearer invalid.token.here"}
    )
    assert response.status_code == 401
    assert "Invalid or expired token" in response.json()["detail"]

def test_expired_token_returns_401():
    token = create_user_token("user123", "student", exp_delta=-3600)
    response = client.get(
        "/api/chat/sessions/user123",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    assert "Invalid or expired token" in response.json()["detail"]

def test_valid_user_token_accesses_own_resources():
    token = create_user_token("user123", "student")
    response = client.get(
        "/api/chat/sessions/user123",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200

def test_user_cannot_access_other_user_resources():
    token = create_user_token("user123", "student")
    response = client.get(
        "/api/chat/sessions/user456",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    assert "Not authorized to access this user's sessions" in response.json()["detail"]

def test_admin_can_access_other_user_resources():
    token = create_user_token("admin999", "admin")
    response = client.get(
        "/api/chat/sessions/user456",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200


# --- Security Boundary & Cross-Token Acceptance Tests ---

def test_internal_token_rejected_on_user_endpoints():
    """Ordinary user endpoints MUST reject internal service tokens."""
    token = create_internal_token("user123", "student", ["matchmake_investor"])
    response = client.get(
        "/api/chat/sessions/user123",
        headers={"Authorization": f"Bearer {token}"}
    )
    # Must reject with 403 or 401
    assert response.status_code in [401, 403]
    assert "Internal service tokens cannot be used" in response.json()["detail"]

def test_user_token_rejected_on_internal_service_endpoints():
    """User JWT must NEVER be accepted by internal service endpoints."""
    token = create_user_token("inv123", "investor")
    response = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "investor": {"investorId": "inv123", "preferredSectors": ["FinTech"]},
            "candidates": []
        }
    )
    assert response.status_code == 401
    assert "Invalid or expired internal token" in response.json()["detail"]

def test_internal_token_fails_with_wrong_secret():
    """Internal token signed with wrong secret is rejected."""
    token = create_internal_token("user123", "investor", secret=settings.jwt_secret)
    response = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "investor": {"investorId": "user123", "preferredSectors": ["FinTech"]},
            "candidates": []
        }
    )
    assert response.status_code == 401

def test_internal_token_invalid_issuer_rejected():
    token = create_internal_token("user123", "investor", iss="malicious-server")
    response = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "investor": {"investorId": "user123", "preferredSectors": ["FinTech"]},
            "candidates": []
        }
    )
    assert response.status_code == 401

def test_internal_token_invalid_audience_rejected():
    token = create_internal_token("user123", "investor", aud="wrong-audience")
    response = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "investor": {"investorId": "user123", "preferredSectors": ["FinTech"]},
            "candidates": []
        }
    )
    assert response.status_code == 401

def test_permission_escalation_matchmaking_cannot_review_applications():
    """A token with 'matchmake_investor' cannot access admin review queue."""
    token = create_internal_token("inv123", "investor", permissions=["matchmake_investor"])
    response = client.get(
        "/api/applications/queue",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    assert "Missing review_applications permission" in response.json()["detail"]

def test_permission_escalation_matchmaking_cannot_submit_application():
    """A token with 'matchmake_investor' cannot submit application."""
    token = create_internal_token("inv123", "investor", permissions=["matchmake_investor"])
    valid_payload = {
        "name": "My Great Idea",
        "shortDescription": "This is a great idea that will change the world.",
        "department": "Computer Science",
        "domain": "AI/ML",
        "projectType": "Software",
        "maturity": "IDEA",
        "problem": "People don't have enough time to do things they love and are bogged down by mundane tasks.",
        "affectedUsers": "Everyone who works a 9 to 5 job.",
        "currentSolutions": "None that are good enough.",
        "solution": "We will build an AI that does all the work for you, so you can go play outside.",
        "differentiation": "Ours actually works and doesn't hallucinate.",
        "teamMembers": [],
        "technologies": ["Python", "FastAPI"],
        "githubUrl": "",
        "demoUrl": "",
        "prototypeAvailable": "NO",
        "attachments": [],
        "declarationAccepted": True
    }
    response = client.post(
        "/api/applications/submit",
        headers={"Authorization": f"Bearer {token}"},
        json=valid_payload
    )
    assert response.status_code == 403
    assert "Missing submit_application permission" in response.json()["detail"]

def test_permission_escalation_review_cannot_matchmake():
    """A token with 'review_applications' cannot run matchmaking."""
    token = create_internal_token("admin123", "admin", permissions=["review_applications"])
    response = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "investor": {"investorId": "admin123", "preferredSectors": ["FinTech"]},
            "candidates": []
        }
    )
    assert response.status_code == 403
    assert "Missing matchmake_investor permission" in response.json()["detail"]
