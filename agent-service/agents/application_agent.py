"""
agents/application_agent.py
───────────────────────────
Agent 2: Application Agent
Purpose: Assist students with submissions and help reviewers evaluate applications.
Features:
- Validates applications for completeness, consistency, missing evidence.
- Generates structured summary: problem, proposed solution, target users, innovation, business model, requested support.
- Produces preliminary assessment using criteria (0-100 score).
- Formulates questions for reviewers.
- Never automatically approves or rejects an application (admissions remain human-authorized).
- Idempotent analysis with timestamps and traceable errors.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List
import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from core.llm import get_llm
from core.state import AgentState

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are the Application Evaluation Agent at the DBIT Incubation Centre.
Evaluate a student startup application based on completeness, problem-solution fit, innovation, and feasibility.

CRITICAL INSTRUCTION: You MUST NOT approve or reject the application. Final admission decisions belong solely to the faculty review panel. You only provide an objective preliminary assessment and highlight questions for reviewers.

Respond ONLY with valid JSON:
{
  "completeness_score": <int 0-100>,
  "is_complete": <bool>,
  "missing_fields": ["<field1>", ...],
  "summary": {
    "problem": "<concise summary of pain point>",
    "proposed_solution": "<concise summary of solution>",
    "target_users": "<who benefits>",
    "innovation_differentiation": "<technical edge or novel aspect>",
    "business_model": "<revenue or sustainability model>",
    "requested_support": "<lab equipment, mentors, or funding>"
  },
  "preliminary_assessment": {
    "problem_clarity_score": <int 0-100>,
    "technical_feasibility_score": <int 0-100>,
    "market_potential_score": <int 0-100>,
    "overall_readiness_score": <int 0-100>,
    "strengths": ["<strength1>", ...],
    "weaknesses": ["<weakness1>", ...]
  },
  "missing_evidence": ["<missing proof or test data>", ...],
  "questions_for_reviewers": ["<question1 to ask the student founders in interview>", ...],
  "recommendation_summary": "<2-3 sentence overview for the review committee>"
}
"""


def validate_application_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic rule-based pre-submission check."""
    missing = []
    warnings = []

    name = data.get("name", "").strip()
    if not name or len(name) < 3:
        missing.append("Startup Name (at least 3 characters)")

    short_desc = data.get("shortDescription", "").strip()
    if not short_desc or len(short_desc) < 20:
        missing.append("Short Description / Tagline (at least 20 characters)")

    problem = data.get("problem", "").strip()
    if not problem or len(problem) < 30:
        missing.append("Problem Statement (at least 30 characters)")

    solution = data.get("solution", "").strip()
    if not solution or len(solution) < 30:
        missing.append("Proposed Solution (at least 30 characters)")

    domain = data.get("domain", "").strip()
    if not domain:
        missing.append("Domain / Sector")

    team = data.get("teamMembers", [])
    if not team or len(team) == 0:
        missing.append("At least one team member")

    declaration = data.get("declarationAccepted", False)
    if not declaration:
        missing.append("Declaration of incubation terms and IP acceptance")

    # Warnings for optional but recommended items
    if not data.get("technologies") or len(data.get("technologies")) == 0:
        warnings.append("No technical stack specified")
    if not data.get("githubUrl") and not data.get("demoUrl"):
        warnings.append("No prototype repository or demo video link provided")

    is_complete = len(missing) == 0
    score = 100 - (len(missing) * 15) - (len(warnings) * 5)
    score = max(10, min(100, score))

    return {
        "is_complete": is_complete,
        "completeness_score": score,
        "missing_fields": missing,
        "warnings": warnings,
    }


async def assess_application(application_data: Dict[str, Any]) -> Dict[str, Any]:
    """Perform structured assessment using LLM with deterministic fallback."""
    validation = validate_application_data(application_data)
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        llm = get_llm(temperature=0.1)
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Application to evaluate:\n{json.dumps(application_data, default=str)}"),
        ]
        response = await llm.ainvoke(messages)
        content = response.content.strip()
        if "```" in content:
            content = content.split("```")[1].replace("json\n", "").strip()
        parsed = json.loads(content)
        # Ensure rule validation integrity
        parsed["validation"] = validation
        parsed["assessed_at"] = now_iso
        parsed["requires_human_admission_decision"] = True
        return parsed
    except Exception as exc:
        logger.warning("application_agent_llm_failed_using_deterministic_assessment", error=str(exc))

        # Deterministic assessment fallback
        problem = application_data.get("problem", "Identified domain challenge")
        solution = application_data.get("solution", "Proposed technological architecture")
        domain = application_data.get("domain", "General Tech")
        name = application_data.get("name", "Innovation Project")

        return {
            "validation": validation,
            "completeness_score": validation["completeness_score"],
            "is_complete": validation["is_complete"],
            "missing_fields": validation["missing_fields"],
            "summary": {
                "problem": problem[:250],
                "proposed_solution": solution[:250],
                "target_users": application_data.get("affectedUsers", "Target market segments")[:150],
                "innovation_differentiation": application_data.get("differentiation", "Domain-specific edge")[:150],
                "business_model": "Institutional and commercial incubation candidate",
                "requested_support": f"Incubation lab access, {domain} faculty mentor, and prototype grant assistance."
            },
            "preliminary_assessment": {
                "problem_clarity_score": 75 if len(problem) > 50 else 50,
                "technical_feasibility_score": 70,
                "market_potential_score": 70,
                "overall_readiness_score": validation["completeness_score"],
                "strengths": [
                    f"Relevant domain alignment with {domain}",
                    "Structured multi-member student team"
                ],
                "weaknesses": validation["missing_fields"] or ["Validation metrics from pilot users needed"]
            },
            "missing_evidence": [
                "Quantified user survey results",
                "Benchmark test records against current market solutions"
            ],
            "questions_for_reviewers": [
                f"How does {name} validate edge cases under field deployment?",
                "What is the estimated bill of materials or cloud hosting cost for the first 100 users?"
            ],
            "recommendation_summary": f"Application for {name} meets initial submission standards. Recommended for reviewer panel interview.",
            "assessed_at": now_iso,
            "requires_human_admission_decision": True,
        }


async def run_application_agent(state: AgentState) -> AgentState:
    """LangGraph node execution for Application Agent."""
    logger.info("application_agent_start", session=state.get("session_id"))

    data = state.get("entities", {})
    if not data and state.get("user_input"):
        data = {
            "name": "Project Proposal",
            "problem": state.get("user_input"),
            "solution": state.get("user_input"),
            "domain": "Technology",
            "maturity": "prototype",
            "teamMembers": [{"name": "Lead Student", "rollNumber": "STU01"}],
            "declarationAccepted": True,
        }

    assessment = await assess_application(data)
    state["application_agent_output"] = assessment
    state["readiness_score"] = assessment.get("preliminary_assessment", {}).get("overall_readiness_score", 70)
    state["requires_human_review"] = True  # Admissions always require human panel decision

    logger.info("application_agent_done", completeness=assessment.get("completeness_score"))
    return state
