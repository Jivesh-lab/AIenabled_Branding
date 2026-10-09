import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import jwt
from datetime import datetime, timedelta

from api.auth import get_current_user
from api.chat import router
from config import get_settings

app = FastAPI()
app.include_router(router)
client = TestClient(app)

settings = get_settings()
# Mock settings for test
settings.jwt_secret = "test_secret_for_jwt"
settings.internal_jwt_secret = "test_internal_secret_for_jwt"

def create_token(user_id: str, role: str, exp_delta: int = 3600) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(seconds=exp_delta)
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

# We must mock get_db to avoid postgres connection in these simple auth tests
from db.postgres import get_db

async def mock_get_db():
    class MockPool:
        from contextlib import asynccontextmanager
        @asynccontextmanager
        async def acquire(self):
            class MockConn:
                async def fetch(self, *args, **kwargs): return []
                async def fetchrow(self, *args, **kwargs): return None
            yield MockConn()
    return MockPool()

app.dependency_overrides[get_db] = mock_get_db

def test_missing_token_returns_401():
    # Attempting to access protected route without token
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
    token = create_token("user123", "student", exp_delta=-3600)
    response = client.get(
        "/api/chat/sessions/user123",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    assert "Invalid or expired token" in response.json()["detail"]

def test_valid_token_accesses_own_resources():
    token = create_token("user123", "student")
    response = client.get(
        "/api/chat/sessions/user123",
        headers={"Authorization": f"Bearer {token}"}
    )
    # 200 because we mock db and return empty sessions list
    assert response.status_code == 200

def test_user_cannot_access_other_user_resources():
    token = create_token("user123", "student")
    # Trying to access user456's sessions with user123's token
    response = client.get(
        "/api/chat/sessions/user456",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    assert "Not authorized to access this user's sessions" in response.json()["detail"]

def test_admin_can_access_other_user_resources():
    token = create_token("admin999", "admin")
    response = client.get(
        "/api/chat/sessions/user456",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200

def test_internal_token_can_access_resources():
    payload = {
        "sub": "user123",
        "role": "student",
        "iss": "next-server",
        "aud": "fastapi-internal",
        "exp": datetime.utcnow() + timedelta(seconds=60)
    }
    token = jwt.encode(payload, settings.internal_jwt_secret, algorithm="HS256")
    
    response = client.get(
        "/api/chat/sessions/user123",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200

def test_internal_token_fails_with_wrong_secret():
    payload = {
        "sub": "user123",
        "role": "student",
        "iss": "next-server",
        "aud": "fastapi-internal",
        "exp": datetime.utcnow() + timedelta(seconds=60)
    }
    # Sign with the regular JWT secret instead of the internal one
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    
    response = client.get(
        "/api/chat/sessions/user123",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
