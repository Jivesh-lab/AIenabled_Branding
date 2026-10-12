"""
core/matchmaking.py
───────────────────
Core deterministic and evidence-based matching logic for Investor <-> Startup matchmaking.
Calculates interpretable, reproducible match scores and concise explanations
using solely persisted, approved startup profile attributes and investor criteria.
"""

from __future__ import annotations

import re
from typing import Any, List, Optional, Set
from pydantic import BaseModel, Field


class StartupCandidate(BaseModel):
    id: str
    name: str
    sector: str = ""
    stage: str = ""
    tagline: str = ""
    problem: str = ""
    solution: str = ""
    readinessScore: int = 0
    tags: List[str] = Field(default_factory=list)
    tractionSummary: Optional[str] = None
    isApproved: bool = True
    status: str = "active"


class InvestorCriteria(BaseModel):
    investorId: str
    isVerified: bool = False
    firmName: str = ""
    firmType: str = "angel"
    investmentThesis: str = ""
    preferredSectors: List[str] = Field(default_factory=list)
    preferredStages: List[str] = Field(default_factory=list)
    ticketSizeMin: float = 0.0
    ticketSizeMax: float = 0.0


class ScoreBreakdown(BaseModel):
    sectorScore: int = 0
    stageScore: int = 0
    thesisScore: int = 0
    readinessScore: int = 0


class MatchDetail(BaseModel):
    startupId: str
    startupName: str
    sector: str
    stage: str
    tagline: str
    problem: str = ""
    solution: str = ""
    readinessScore: int
    tags: List[str] = Field(default_factory=list)
    matchScore: int  # strictly 0 to 100
    matchTier: str   # "strong", "partial", "insufficient_data"
    reasons: List[str]
    missingCriteria: List[str]
    breakdown: dict[str, int]
    scoreBreakdown: ScoreBreakdown


def _normalize_text(text: str) -> set[str]:
    """Tokenize and normalize text into non-stopword tokens."""
    stop_words = {
        "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
        "by", "is", "are", "was", "were", "we", "our", "you", "your", "they", "this",
        "that", "from", "as", "it", "be", "have", "has", "do", "will", "our", "all"
    }
    words = re.findall(r"\b[a-zA-Z0-9]{3,}\b", text.lower())
    return {w for w in words if w not in stop_words}


def calculate_match(
    investor: InvestorCriteria,
    startup: StartupCandidate
) -> MatchDetail:
    """
    Deterministically computes match score (0-100) and explanations.
    
    Scoring Weights:
    - Sector alignment: 35 points
    - Stage alignment: 25 points
    - Thesis & keyword relevance: 20 points
    - Venture readiness & execution: 20 points
    
    Tiers:
    - Strong: >= 75
    - Partial: 45 to 74
    - Insufficient data: < 45
    """
    reasons: List[str] = []
    missing_criteria: List[str] = []
    breakdown: dict[str, int] = {
        "sector": 0,
        "stage": 0,
        "thesis": 0,
        "readiness": 0,
    }

    # 1. Sector Alignment (35 points)
    investor_sectors = [s.strip().lower() for s in investor.preferredSectors if s.strip()]
    startup_sector = startup.sector.strip().lower()
    startup_tags = [t.strip().lower() for t in startup.tags if t.strip()]

    if not investor_sectors:
        missing_criteria.append("Investor target sectors not specified (0/35 points).")
        breakdown["sector"] = 0
    else:
        sector_match = (
            startup_sector in investor_sectors or
            any(s in startup_sector for s in investor_sectors) or
            any(t in investor_sectors for t in startup_tags)
        )
        if sector_match:
            breakdown["sector"] = 35
            reasons.append(f"Sector alignment: '{startup.sector}' matches target sector preferences.")
        else:
            breakdown["sector"] = 0
            missing_criteria.append(f"Sector mismatch: Startup sector '{startup.sector}' is outside preferred sectors ({', '.join(investor.preferredSectors)}).")

    # 2. Stage Alignment (25 points)
    investor_stages = [stg.strip().lower() for stg in investor.preferredStages if stg.strip()]
    startup_stage = startup.stage.strip().lower()

    if not investor_stages:
        missing_criteria.append("Investor target stages not specified (0/25 points).")
        breakdown["stage"] = 0
    else:
        if startup_stage in investor_stages or any(stg in startup_stage for stg in investor_stages):
            breakdown["stage"] = 25
            reasons.append(f"Stage alignment: Startup is at stage '{startup.stage.upper()}', matching investment criteria.")
        else:
            breakdown["stage"] = 0
            missing_criteria.append(f"Stage mismatch: Startup is at stage '{startup.stage.upper()}' (target: {', '.join(investor.preferredStages)}).")

    # 3. Thesis & Keyword Semantic Overlap (20 points)
    thesis_tokens = _normalize_text(investor.investmentThesis)
    startup_text = f"{startup.tagline} {startup.problem} {startup.solution} {' '.join(startup.tags)}"
    startup_tokens = _normalize_text(startup_text)

    if not thesis_tokens:
        missing_criteria.append("Investment thesis narrative is blank (0/20 points).")
        breakdown["thesis"] = 0
    else:
        overlap = thesis_tokens.intersection(startup_tokens)
        if overlap:
            # 1 match: 10pts, 2 matches: 14pts, 3 matches: 18pts, 4+ matches: 20pts
            overlap_score = min(20, 6 + (len(overlap) * 4))
            breakdown["thesis"] = overlap_score
            matched_terms = sorted(list(overlap))[:4]
            reasons.append(f"Thesis resonance: Shared domain themes detected ({', '.join(matched_terms)}).")
        else:
            breakdown["thesis"] = 0
            missing_criteria.append("No keyword overlap with stated investment thesis.")

    # 4. Readiness & Execution Score (20 points)
    # Database readiness score is 0-100; strictly clamp and scale
    clamped_readiness = max(0, min(100, int(startup.readinessScore)))
    readiness_points = round((clamped_readiness / 100.0) * 20)
    breakdown["readiness"] = readiness_points

    if clamped_readiness >= 75:
        reasons.append(f"Strong venture maturity: High incubation readiness score ({clamped_readiness}/100).")
    elif clamped_readiness >= 50:
        reasons.append(f"Moderate venture maturity: Incubation readiness score ({clamped_readiness}/100).")
    else:
        missing_criteria.append(f"Early incubation progress: Readiness score is {clamped_readiness}/100.")

    # Calculate Total Match Score (bounded strictly [0, 100])
    total_score = max(0, min(100, sum(breakdown.values())))

    # Categorize Tier strictly per thresholds
    if total_score >= 75:
        tier = "strong"
    elif total_score >= 45:
        tier = "partial"
    else:
        tier = "insufficient_data"

    if not reasons:
        reasons.append("Approved venture meeting general incubator baseline.")

    score_breakdown = ScoreBreakdown(
        sectorScore=breakdown["sector"],
        stageScore=breakdown["stage"],
        thesisScore=breakdown["thesis"],
        readinessScore=breakdown["readiness"],
    )

    return MatchDetail(
        startupId=str(startup.id),
        startupName=startup.name,
        sector=startup.sector,
        stage=startup.stage,
        tagline=startup.tagline,
        problem=startup.problem,
        solution=startup.solution,
        readinessScore=clamped_readiness,
        tags=startup.tags,
        matchScore=total_score,
        matchTier=tier,
        reasons=reasons,
        missingCriteria=missing_criteria,
        breakdown=breakdown,
        scoreBreakdown=score_breakdown,
    )


def match_startups(
    investor: InvestorCriteria,
    candidates: List[StartupCandidate]
) -> List[MatchDetail]:
    """
    Filters candidates for approved/active status, deduplicates by ID,
    and returns sorted matches deterministically by score, readiness, and ID.
    """
    seen_ids: Set[str] = set()
    valid_candidates: List[StartupCandidate] = []
    
    for c in candidates:
        cand_id = str(c.id).strip()
        if cand_id and cand_id not in seen_ids:
            if c.isApproved and c.status.lower() == "active":
                seen_ids.add(cand_id)
                valid_candidates.append(c)

    results: List[MatchDetail] = []
    for candidate in valid_candidates:
        match_detail = calculate_match(investor, candidate)
        results.append(match_detail)

    # Strictly deterministic tie-breaking:
    # Primary: matchScore (descending)
    # Secondary: readinessScore (descending)
    # Tertiary: startupId (ascending string sort)
    results.sort(key=lambda x: (-x.matchScore, -x.readinessScore, str(x.startupId)))
    return results
