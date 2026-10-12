import pytest
from datetime import datetime, timezone, timedelta
from jose import jwt
from fastapi.testclient import TestClient

from main import app
from config import get_settings
from core.matchmaking import calculate_match, match_startups, InvestorCriteria, StartupCandidate

client = TestClient(app)
settings = get_settings()
settings.internal_jwt_secret = "test_internal_secret_for_jwt"

def create_match_token(user_id: str, role: str, permissions: list[str], exp_delta: int = 3600) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "iss": "next-server",
        "aud": "fastapi-internal",
        "permissions": permissions,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=exp_delta)
    }
    return jwt.encode(payload, settings.internal_jwt_secret, algorithm="HS256")

sample_investor = {
    "investorId": "investor_001",
    "isVerified": True,
    "firmName": "Alpha Ventures",
    "firmType": "vc",
    "investmentThesis": "We invest in high-readiness AgriTech, IoT, and CleanTech ventures with deep IP and autonomous drones.",
    "preferredSectors": ["AgriTech", "CleanTech"],
    "preferredStages": ["prototype", "mvp"],
    "ticketSizeMin": 2500000,
    "ticketSizeMax": 10000000
}

sample_candidates = [
    {
        "id": "startup_agri_1",
        "name": "GreenDrone AI",
        "sector": "AgriTech",
        "stage": "prototype",
        "tagline": "Autonomous multispectral drones for precision farm crop monitoring",
        "problem": "Crop yield failure due to late pest detection",
        "solution": "Autonomous drone monitoring and AI diagnostics",
        "readinessScore": 85,
        "tags": ["AgriTech", "IoT", "Drones"],
        "isApproved": True,
        "status": "active"
    },
    {
        "id": "startup_fin_2",
        "name": "PayFlow India",
        "sector": "FinTech",
        "stage": "idea",
        "tagline": "Micro-lending platform for rural shopkeepers",
        "problem": "Unbanked retail merchants",
        "solution": "Daily UPI repayment credit scoring",
        "readinessScore": 40,
        "tags": ["FinTech", "Lending"],
        "isApproved": True,
        "status": "active"
    },
    {
        "id": "startup_unapproved_3",
        "name": "Stealth Secret Tech",
        "sector": "AgriTech",
        "stage": "prototype",
        "tagline": "Unapproved stealth project",
        "problem": "Stealth",
        "solution": "Stealth",
        "readinessScore": 90,
        "isApproved": False,  # Should be excluded!
        "status": "active"
    },
    {
        "id": "startup_inactive_4",
        "name": "Dead Venture",
        "sector": "AgriTech",
        "stage": "prototype",
        "tagline": "Inactive project",
        "problem": "None",
        "solution": "None",
        "readinessScore": 90,
        "isApproved": True,
        "status": "inactive"  # Should be excluded!
    }
]

def test_missing_token_returns_401():
    res = client.post("/api/matchmaking/evaluate", json={"investor": sample_investor, "candidates": sample_candidates})
    assert res.status_code == 401

def test_missing_permission_returns_403():
    token = create_match_token("investor_001", "investor", permissions=["submit_application"])
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": sample_investor, "candidates": sample_candidates}
    )
    assert res.status_code == 403
    assert "Missing matchmake_investor permission" in res.json()["detail"]

def test_investor_identity_mismatch_returns_403():
    # Token is for investor_999, but payload claims investor_001
    token = create_match_token("investor_999", "investor", permissions=["matchmake_investor"])
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": sample_investor, "candidates": sample_candidates}
    )
    assert res.status_code == 403
    assert "Investor identity does not match token subject" in res.json()["detail"]

def test_super_admin_cannot_impersonate_another_investor():
    # Even if role is super_admin, subject must strictly match payload investorId
    token = create_match_token("admin_001", "super_admin", permissions=["matchmake_investor"])
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": sample_investor, "candidates": sample_candidates}
    )
    assert res.status_code == 403
    assert "Investor identity does not match token subject" in res.json()["detail"]

def test_successful_evaluation_filters_unapproved_and_ranks_deterministically():
    token = create_match_token("investor_001", "investor", permissions=["matchmake_investor"])
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": sample_investor, "candidates": sample_candidates}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["totalCandidatesEvaluated"] == 4
    # Only 2 candidates are approved and active
    assert data["matchedCount"] == 2
    matches = data["matches"]
    
    # startup_agri_1 must rank first with strong match
    assert matches[0]["startupId"] == "startup_agri_1"
    assert matches[0]["matchScore"] >= 75
    assert matches[0]["matchTier"] == "strong"
    assert any("Sector alignment" in r for r in matches[0]["reasons"])
    
    # startup_fin_2 should rank lower due to sector & stage mismatch
    assert matches[1]["startupId"] == "startup_fin_2"
    assert matches[1]["matchScore"] < matches[0]["matchScore"]

def test_deduplication_of_candidate_ids():
    token = create_match_token("investor_001", "investor", permissions=["matchmake_investor"])
    # Duplicate candidate with id startup_agri_1 multiple times
    duplicated_candidates = [sample_candidates[0], sample_candidates[0], sample_candidates[1]]
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": sample_investor, "candidates": duplicated_candidates}
    )
    assert res.status_code == 200
    data = res.json()
    # Total candidates submitted was 3, but unique evaluated matches must be 2
    assert data["matchedCount"] == 2
    returned_ids = [m["startupId"] for m in data["matches"]]
    assert len(returned_ids) == len(set(returned_ids))

def test_deterministic_tie_breaking():
    # Two startups with identical sector, stage, thesis, and readiness
    c1 = {
        "id": "startup_beta",
        "name": "Beta Solar",
        "sector": "CleanTech",
        "stage": "mvp",
        "tagline": "Solar grid tracking",
        "problem": "grid waste",
        "solution": "solar optimization",
        "readinessScore": 80,
        "isApproved": True,
        "status": "active"
    }
    c2 = {
        "id": "startup_alpha",
        "name": "Alpha Solar",
        "sector": "CleanTech",
        "stage": "mvp",
        "tagline": "Solar grid tracking",
        "problem": "grid waste",
        "solution": "solar optimization",
        "readinessScore": 80,
        "isApproved": True,
        "status": "active"
    }
    token = create_match_token("investor_001", "investor", permissions=["matchmake_investor"])
    
    # Run in order [c1, c2]
    res1 = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": sample_investor, "candidates": [c1, c2]}
    )
    ids1 = [m["startupId"] for m in res1.json()["matches"]]

    # Run in opposite order [c2, c1]
    res2 = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": sample_investor, "candidates": [c2, c1]}
    )
    ids2 = [m["startupId"] for m in res2.json()["matches"]]

    # Both must resolve to identical deterministic order (startup_alpha before startup_beta by ID sort)
    assert ids1 == ids2
    assert ids1[0] == "startup_alpha"
    assert ids1[1] == "startup_beta"

def test_empty_candidates_handled_gracefully():
    token = create_match_token("investor_001", "investor", permissions=["matchmake_investor"])
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": sample_investor, "candidates": []}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["matchedCount"] == 0
    assert data["matches"] == []

def test_missing_criteria_identified_without_fabrication():
    # Investor with empty criteria
    empty_criteria_investor = {
        "investorId": "investor_001",
        "isVerified": True,
        "firmName": "",
        "firmType": "angel",
        "investmentThesis": "",
        "preferredSectors": [],
        "preferredStages": [],
    }
    token = create_match_token("investor_001", "investor", permissions=["matchmake_investor"])
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": empty_criteria_investor, "candidates": [sample_candidates[0]]}
    )
    assert res.status_code == 200
    match = res.json()["matches"][0]
    # Missing criteria must explicitly report missing criteria without awarding false points
    assert any("sectors not specified" in m for m in match["missingCriteria"])
    assert any("stages not specified" in m for m in match["missingCriteria"])
    assert any("thesis narrative is blank" in m for m in match["missingCriteria"])
    # Thesis score must be 0, Sector score 0, Stage score 0
    assert match["breakdown"]["sector"] == 0
    assert match["breakdown"]["stage"] == 0
    assert match["breakdown"]["thesis"] == 0
    # Only readiness contributes: round((85/100) * 20) = 17
    assert match["matchScore"] == 17
    assert match["matchTier"] == "insufficient_data"

def test_scoring_weights_and_bounds_strictly_verified():
    inv = InvestorCriteria(
        investorId="inv_perfect",
        preferredSectors=["DeepTech"],
        preferredStages=["prototype"],
        investmentThesis="robotics artificial intelligence computer vision automation",
    )
    # Perfect startup match: 35 sector + 25 stage + 20 thesis + 20 readiness = 100
    cand_perfect = StartupCandidate(
        id="c_perfect",
        name="RoboVision",
        sector="DeepTech",
        stage="prototype",
        tagline="Advanced robotics and artificial intelligence vision",
        problem="Lack of computer vision in industrial automation robotics",
        solution="Full automation using computer vision and artificial intelligence",
        readinessScore=100,
        tags=["robotics", "automation"],
        isApproved=True,
        status="active"
    )
    result_perfect = calculate_match(inv, cand_perfect)
    assert result_perfect.matchScore == 100
    assert result_perfect.matchTier == "strong"
    assert result_perfect.breakdown["sector"] == 35
    assert result_perfect.breakdown["stage"] == 25
    assert result_perfect.breakdown["thesis"] == 20
    assert result_perfect.breakdown["readiness"] == 20

    # Test out-of-range readinessScore clamping:
    cand_clamped_high = StartupCandidate(
        id="c_high",
        name="OverClamped",
        sector="DeepTech",
        stage="prototype",
        readinessScore=999,  # Intentionally out of bounds
        isApproved=True,
        status="active"
    )
    result_high = calculate_match(inv, cand_clamped_high)
    assert result_high.breakdown["readiness"] == 20
    assert result_high.readinessScore == 100

    cand_clamped_low = StartupCandidate(
        id="c_low",
        name="UnderClamped",
        sector="Other",
        stage="concept",
        readinessScore=-50,  # Negative out of bounds
        isApproved=True,
        status="active"
    )
    result_low = calculate_match(inv, cand_clamped_low)
    assert result_low.breakdown["readiness"] == 0
    assert result_low.readinessScore == 0
    assert result_low.matchScore >= 0

def test_oversized_candidate_request_rejected():
    oversized = [sample_candidates[0]] * 151
    token = create_match_token("investor_001", "investor", permissions=["matchmake_investor"])
    res = client.post(
        "/api/matchmaking/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={"investor": sample_investor, "candidates": oversized}
    )
    assert res.status_code == 422  # Pydantic validation error for max_length exceeded
