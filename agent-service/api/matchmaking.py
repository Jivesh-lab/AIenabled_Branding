"""
api/matchmaking.py
──────────────────
Matchmaking endpoint in the agent service.
Secured with get_internal_service and requiring 'matchmake_investor' permission.
Accepts investor criteria and candidate startups directly from the backend,
enforcing payload limits, non-empty validation, and deterministic explanations.
"""

from __future__ import annotations

from typing import List, Optional
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.auth import get_internal_service, AuthenticatedUser
from core.matchmaking import (
    InvestorCriteria,
    StartupCandidate,
    MatchDetail,
    match_startups
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/matchmaking", tags=["matchmaking"])


class MatchmakingRequest(BaseModel):
    investor: InvestorCriteria
    candidates: List[StartupCandidate] = Field(..., max_length=150)  # enforce reasonable request limit
    limit: Optional[int] = Field(default=50, ge=1, le=100)


class MatchmakingResponse(BaseModel):
    success: bool
    investorId: str
    totalCandidates: int
    evaluatedCandidates: int
    missingCriteria: List[str] = Field(default_factory=list)
    recommendations: List[MatchDetail]
    # Backward compatibility aliases
    totalCandidatesEvaluated: Optional[int] = None
    matchedCount: Optional[int] = None
    matches: Optional[List[MatchDetail]] = None


@router.post("/evaluate", response_model=MatchmakingResponse)
async def evaluate_matches(
    payload: MatchmakingRequest,
    current_user: AuthenticatedUser = Depends(get_internal_service),
):
    """
    Evaluate candidate startups against authenticated investor criteria.
    Requires internal service authentication with 'matchmake_investor' permission.
    Investor identity is strictly bound to token subject.
    """
    if "matchmake_investor" not in current_user.permissions:
        logger.warning(
            "matchmaking_forbidden",
            user_id=current_user.id,
            permissions=current_user.permissions
        )
        raise HTTPException(
            status_code=403,
            detail="Missing matchmake_investor permission"
        )

    # Strictly bind investor identity to token subject (prevent any client tampering)
    if current_user.id != payload.investor.investorId:
        logger.warning(
            "matchmaking_identity_mismatch",
            token_sub=current_user.id,
            payload_investor=payload.investor.investorId
        )
        raise HTTPException(
            status_code=403,
            detail="Investor identity does not match token subject"
        )

    # Detect global missing criteria on investor profile
    global_missing = []
    if not payload.investor.preferredSectors:
        global_missing.append("No target sectors specified.")
    if not payload.investor.preferredStages:
        global_missing.append("No venture stages specified.")
    if not payload.investor.investmentThesis.strip():
        global_missing.append("No investment thesis statement provided.")

    logger.info(
        "matchmaking_start",
        investor_id=payload.investor.investorId,
        candidates_count=len(payload.candidates),
        sectors=payload.investor.preferredSectors
    )

    try:
        ranked_matches = match_startups(payload.investor, payload.candidates)
        
        limit = payload.limit or 50
        limited_matches = ranked_matches[:limit]

        return MatchmakingResponse(
            success=True,
            investorId=payload.investor.investorId,
            totalCandidates=len(payload.candidates),
            evaluatedCandidates=len(limited_matches),
            missingCriteria=global_missing,
            recommendations=limited_matches,
            totalCandidatesEvaluated=len(payload.candidates),
            matchedCount=len(limited_matches),
            matches=limited_matches,
        )
    except Exception as exc:
        logger.error("matchmaking_error", error=str(exc))
        raise HTTPException(status_code=500, detail="Matchmaking evaluation failed")
