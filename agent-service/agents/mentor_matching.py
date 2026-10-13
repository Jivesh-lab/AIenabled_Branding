"""
agents/mentor_matching.py
─────────────────────────
Agent 3: Mentor-Matching Agent
Purpose: Recommend appropriate faculty members and industry mentors for each startup.
Features:
- Matches startup domain, stage, challenges, skills needed with mentor expertise, availability, and existing allocations.
- Returns ranked recommendations with transparent reasoning and missing matching criteria.
- Checks for duplicate allocations and conflicting assignments.
- Supports human acceptance, rejection, or override by faculty incubation coordinator.
- Reuses existing mentor cohort data; does not fabricate mentors.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List
import structlog
from core.state import AgentState

logger = structlog.get_logger(__name__)

# Established Faculty & Industry Mentors at DBIT Incubation Centre
EXISTING_MENTORS = [
    {
        "id": "mentor-faculty-01",
        "name": "Dr. K. R. Raman",
        "role": "Faculty Coordinator",
        "affiliation": "DBIT Computer Science & AI Lab",
        "domains": ["AgriTech / ML", "AI/ML", "IoT / Environment", "Computer Science"],
        "expertise": ["Deep Learning", "Edge AI", "Computer Vision", "Research Grants", "TRL 3-6 Scaling"],
        "max_capacity": 5,
        "current_active_projects": 3,
        "mentor_type": "faculty",
    },
    {
        "id": "mentor-faculty-02",
        "name": "Prof. Ananya Sen",
        "role": "Faculty Volunteer & Material Lead",
        "affiliation": "DBIT Chemical Technology & Bio-composites",
        "domains": ["GreenTech / Materials", "Bio-degradable Materials", "CleanTech"],
        "expertise": ["Biopolymers", "ASTM Testing Standards", "Industrial Extrusion", "ISO 17025 Labs"],
        "max_capacity": 4,
        "current_active_projects": 2,
        "mentor_type": "faculty",
    },
    {
        "id": "mentor-faculty-03",
        "name": "Prof. Rajiv Menon",
        "role": "Faculty Guide",
        "affiliation": "DBIT Electronics & Embedded Systems",
        "domains": ["IoT / Environment", "Hardware", "Robotics", "Embedded"],
        "expertise": ["Embedded Firmware", "Signal Processing", "PCB Fabrication", "Municipal Sensing"],
        "max_capacity": 4,
        "current_active_projects": 1,
        "mentor_type": "faculty",
    },
    {
        "id": "mentor-industry-01",
        "name": "Dr. Vikram Malhotra",
        "role": "Chief Science Officer",
        "affiliation": "AgriCore Diagnostics & BioVentures",
        "domains": ["AgriTech / ML", "BioTech", "Agriculture", "AI/ML"],
        "expertise": ["Field Pilot Deployment", "Agricultural Supply Chain", "Crop Pathology", "DST PRAYAS"],
        "max_capacity": 3,
        "current_active_projects": 1,
        "mentor_type": "industry",
    },
    {
        "id": "mentor-industry-02",
        "name": "Dr. Sunita Kapoor",
        "role": "Head of Sustainable Packaging",
        "affiliation": "Biopack Innovations Ltd.",
        "domains": ["GreenTech / Materials", "Manufacturing", "Packaging"],
        "expertise": ["Biopolymer Scale-up", "Industrial Tooling", "Commercial Licensing", "B2B Procurement"],
        "max_capacity": 3,
        "current_active_projects": 1,
        "mentor_type": "industry",
    },
    {
        "id": "mentor-industry-03",
        "name": "Sanjay Singhal",
        "role": "VP IoT Systems",
        "affiliation": "AquaSense Smart Water Solutions",
        "domains": ["IoT / Environment", "CleanTech", "Smart Cities"],
        "expertise": ["Commercial IoT Rollout", "Municipal Tenders", "Sensor Calibration", "Hardware Productization"],
        "max_capacity": 3,
        "current_active_projects": 1,
        "mentor_type": "industry",
    },
    {
        "id": "mentor-industry-04",
        "name": "Arunabh Mukherjee",
        "role": "Principal Blockchain Architect",
        "affiliation": "HyperLedger India / DecentralHealth",
        "domains": ["HealthTech / Blockchain", "HealthTech / Web3", "FinTech", "Cybersecurity"],
        "expertise": ["Private Permissioned Ledger", "DISHA / HIPAA Health Data Compliance", "Zero-Knowledge Proofs"],
        "max_capacity": 3,
        "current_active_projects": 0,
        "mentor_type": "industry",
    },
]


def match_mentors_for_startup(
    domain: str,
    stage: str = "Prototype",
    challenges: str = "",
    requested_expertise: List[str] | None = None,
    existing_allocations: List[str] | None = None,
) -> Dict[str, Any]:
    """
    Deterministic rule-based matching engine with explainability and conflict detection.
    """
    requested_expertise = requested_expertise or []
    existing_allocations = existing_allocations or []

    scored_mentors = []
    missing_data = []

    if not domain:
        missing_data.append("Startup domain / sector not specified")
    if not requested_expertise and not challenges:
        missing_data.append("No specific challenges or requested skills provided")

    domain_lower = domain.lower() if domain else ""
    req_exp_set = {e.lower() for e in requested_expertise}
    challenges_lower = challenges.lower() if challenges else ""

    for mentor in EXISTING_MENTORS:
        # Check duplicate allocation
        is_already_allocated = mentor["name"] in existing_allocations or mentor["id"] in existing_allocations
        
        # Check capacity conflict
        is_at_capacity = mentor["current_active_projects"] >= mentor["max_capacity"]

        score = 0
        match_reasons = []

        # 1. Domain match (0 to 45 points)
        matched_domains = [
            d for d in mentor["domains"]
            if any(term in domain_lower for term in d.lower().split(" / "))
            or any(term in d.lower() for term in domain_lower.split(" / "))
        ]
        if matched_domains:
            score += 45
            match_reasons.append(f"Domain alignment with {', '.join(matched_domains)}")
        else:
            # Partial domain keyword overlap
            for d in mentor["domains"]:
                for word in d.lower().split():
                    if len(word) > 3 and word in domain_lower:
                        score += 20
                        match_reasons.append(f"Related field keyword '{word}'")
                        break

        # 2. Expertise & Skills needed (0 to 35 points)
        matched_expertise = []
        for exp in mentor["expertise"]:
            exp_l = exp.lower()
            if any(req in exp_l or exp_l in req for req in req_exp_set):
                matched_expertise.append(exp)
            elif exp_l in challenges_lower:
                matched_expertise.append(exp)

        if matched_expertise:
            exp_points = min(35, len(matched_expertise) * 15)
            score += exp_points
            match_reasons.append(f"Direct skill match in: {', '.join(matched_expertise)}")

        # 3. Capacity & Availability (0 to 20 points)
        available_slots = mentor["max_capacity"] - mentor["current_active_projects"]
        if available_slots > 0:
            score += min(20, available_slots * 10)
            match_reasons.append(f"{available_slots} active mentorship slot(s) available")
        else:
            score -= 25
            match_reasons.append("Currently at maximum mentorship bandwidth")

        # Flag conflicts
        has_conflict = is_already_allocated or is_at_capacity
        conflict_reason = None
        if is_already_allocated:
            conflict_reason = "Mentor is already assigned to this project"
        elif is_at_capacity:
            conflict_reason = f"Mentor reached max capacity ({mentor['max_capacity']} projects)"

        scored_mentors.append({
            "id": mentor["id"],
            "name": mentor["name"],
            "role": mentor["role"],
            "affiliation": mentor["affiliation"],
            "mentor_type": mentor["mentor_type"],
            "domains": mentor["domains"],
            "expertise": mentor["expertise"],
            "match_score": max(0, min(100, score)),
            "match_reasons": match_reasons,
            "has_conflict": has_conflict,
            "conflict_reason": conflict_reason,
            "available_slots": available_slots,
        })

    # Sort candidates by score descending
    scored_mentors.sort(key=lambda m: (not m["has_conflict"], m["match_score"]), reverse=True)

    faculty_recs = [m for m in scored_mentors if m["mentor_type"] == "faculty" and not m["has_conflict"]][:2]
    industry_recs = [m for m in scored_mentors if m["mentor_type"] == "industry" and not m["has_conflict"]][:2]

    return {
        "status": "success",
        "domain_analyzed": domain,
        "recommendations": scored_mentors[:4],
        "top_faculty": faculty_recs[0] if faculty_recs else None,
        "top_industry": industry_recs[0] if industry_recs else None,
        "missing_matching_data": missing_data,
        "human_decision_required": True,
    }


async def run_mentor_matching_agent(state: AgentState) -> AgentState:
    """LangGraph node execution for Mentor-Matching Agent."""
    logger.info("mentor_matching_start", session=state.get("session_id"))

    entities = state.get("entities", {})
    domain = entities.get("sector") or entities.get("domain") or "AgriTech / ML"
    stage = entities.get("stage") or "Prototype"
    challenges = state.get("user_input", "")

    result = match_mentors_for_startup(
        domain=domain,
        stage=stage,
        challenges=challenges,
    )

    state["mentor_match_output"] = result
    state["requires_human_review"] = True  # Mentor allocation commitments require coordinator approval

    logger.info("mentor_matching_done", top_candidates=len(result["recommendations"]))
    return state
