"""
tests/test_staging_acceptance.py
─────────────────────────────────
User Acceptance & Failure Resilience Test Suite for Staging Validation.
Verifies operational failure states, security boundaries, error responses,
and leak prevention (no tokens, credentials, or stack traces leaked).
"""

import pytest
from datetime import datetime, timezone, timedelta
from jose import jwt
from fastapi.testclient import TestClient

from main import app
from config import get_settings
from core.matchmaking import InvestorCriteria, StartupCandidate, calculate_match, match_startups

client = TestClient(app)
settings = get_settings()
settings.internal_jwt_secret = "staging_internal_secret_test_key"
settings.jwt_secret = "staging_user_secret_test_key"


def create_token(
    user_id: str,
    role: str = "investor",
    permissions: list[str] = None,
    iss: str = "next-server",
    aud: str = "fastapi-internal",
    secret: str = None,
    exp_delta: int = 120
) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "permissions": permissions if permissions is not None else ["matchmake_investor"],
        "iss": iss,
        "aud": aud,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=exp_delta)
    }
    return jwt.encode(payload, secret or settings.internal_jwt_secret, algorithm="HS256")


# ==============================================================================
# Journey 1: Matchmaking with Incomplete Investor Profile & Empty Candidate Set
# ==============================================================================

def test_journey_empty_directory_graceful_handling():
    """When no approved startups exist in the incubator directory."""
    token = create_token("inv_empty_test")
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "investor": {
                "investorId": "inv_empty_test",
                "preferredSectors": ["CleanTech"],
                "preferredStages": ["prototype"],
                "investmentThesis": "Sustainable solar technologies"
            },
            "candidates": []
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["totalCandidates"] == 0
    assert data["evaluatedCandidates"] == 0
    assert data["recommendations"] == []
    # Ensure no internal error strings or traceback leaked
    assert "traceback" not in res.text.lower()


def test_journey_unapproved_startups_excluded():
    """Ensure unapproved or draft startups are dropped before scoring."""
    token = create_token("inv_filter_test")
    candidates = [
        {
            "id": "draft_startup_1",
            "name": "Secret Lab",
            "sector": "CleanTech",
            "stage": "prototype",
            "tagline": "Stealth project",
            "problem": "Unknown",
            "solution": "Unknown",
            "readinessScore": 95,
            "isApproved": False,  # Not approved!
            "status": "active"
        },
        {
            "id": "inactive_startup_2",
            "name": "Old Lab",
            "sector": "CleanTech",
            "stage": "prototype",
            "tagline": "Inactive project",
            "problem": "Old",
            "solution": "Old",
            "readinessScore": 90,
            "isApproved": True,
            "status": "inactive"  # Inactive!
        },
        {
            "id": "approved_startup_3",
            "name": "SolarSun Tech",
            "sector": "CleanTech",
            "stage": "prototype",
            "tagline": "Rooftop solar monitoring",
            "problem": "High degradation of solar cells",
            "solution": "Smart IoT monitors",
            "readinessScore": 80,
            "isApproved": True,
            "status": "active"
        }
    ]
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "investor": {
                "investorId": "inv_filter_test",
                "preferredSectors": ["CleanTech"],
                "preferredStages": ["prototype"],
                "investmentThesis": "Solar energy IoT solutions"
            },
            "candidates": candidates
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["totalCandidates"] == 3
    # Exactly 1 active approved candidate evaluated
    assert data["evaluatedCandidates"] == 1
    assert data["recommendations"][0]["startupId"] == "approved_startup_3"
    assert data["recommendations"][0]["matchScore"] >= 75


# ==============================================================================
# Failure State 1: Internal Authentication Failures & Secret Leak Prevention
# ==============================================================================

def test_failure_tampered_issuer_rejected_cleanly():
    """Token with invalid issuer must fail with 401 and no stack trace."""
    token = create_token("inv_001", iss="untrusted-attacker")
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": {"investorId": "inv_001"}, "candidates": []}
    )
    assert res.status_code == 401
    assert "Invalid or expired internal token" in res.json()["detail"]
    assert "Traceback" not in res.text
    assert settings.internal_jwt_secret not in res.text


def test_failure_tampered_audience_rejected_cleanly():
    """Token with invalid audience must fail with 401 and no stack trace."""
    token = create_token("inv_001", aud="attacker-audience")
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": {"investorId": "inv_001"}, "candidates": []}
    )
    assert res.status_code == 401
    assert "Invalid or expired internal token" in res.json()["detail"]
    assert "Traceback" not in res.text


def test_failure_expired_token_rejected_cleanly():
    """Expired token must be rejected with 401."""
    token = create_token("inv_001", exp_delta=-3600)
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": {"investorId": "inv_001"}, "candidates": []}
    )
    assert res.status_code == 401
    assert "Invalid or expired internal token" in res.json()["detail"]


def test_failure_wrong_signing_secret_rejected_cleanly():
    """Token signed with user secret instead of internal secret is rejected."""
    token = create_token("inv_001", secret=settings.jwt_secret)
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": {"investorId": "inv_001"}, "candidates": []}
    )
    assert res.status_code == 401
    assert "Invalid or expired internal token" in res.json()["detail"]


# ==============================================================================
# Failure State 2: Client Identity Tampering & Cross-User Impersonation
# ==============================================================================

def test_failure_identity_mismatch_rejected():
    """Client cannot supply victim investor ID in payload body."""
    # Attacker authenticated as inv_attacker attempts to evaluate as inv_victim
    token = create_token("inv_attacker")
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "investor": {
                "investorId": "inv_victim",
                "preferredSectors": ["FinTech"]
            },
            "candidates": []
        }
    )
    assert res.status_code == 403
    assert "Investor identity does not match token subject" in res.json()["detail"]


# ==============================================================================
# Failure State 3: Malformed Payloads & Boundary Capping
# ==============================================================================

def test_failure_malformed_payload_rejected_by_pydantic():
    """Malformed candidate data returns 422 with structured field errors."""
    token = create_token("inv_001")
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "investor": "not_an_object",  # Invalid type
            "candidates": []
        }
    )
    assert res.status_code == 422
    assert "Traceback" not in res.text


def test_failure_oversized_payload_capped():
    """Requests exceeding 150 candidates rejected with 422."""
    token = create_token("inv_001")
    candidate = {
        "id": "c_sample",
        "name": "Sample",
        "sector": "AgriTech",
        "stage": "idea",
        "readinessScore": 50,
        "isApproved": True,
        "status": "active"
    }
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "investor": {"investorId": "inv_001"},
            "candidates": [candidate] * 151
        }
    )
    assert res.status_code == 422
