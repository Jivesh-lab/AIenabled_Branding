"""
tests/test_agents.py
────────────────────
Unit & integration tests for the five specialized AI agents:
1. AI Incubation Assistant
2. Application Agent
3. Mentor-Matching Agent
4. Workflow Agent
5. Monitoring Agent
"""

import pytest
from agents.incubation_assistant import run_incubation_assistant
from agents.application_agent import run_application_agent, assess_application, validate_application_data
from agents.mentor_matching import run_mentor_matching_agent, match_mentors_for_startup, EXISTING_MENTORS
from agents.workflow_agent import run_workflow_agent, coordinate_workflow_action, get_workflow_activity_history
from agents.monitoring_agent import run_monitoring_agent, evaluate_startup_health
from core.state import AgentState


def make_agent_state(**kwargs) -> AgentState:
    base: AgentState = {
        "session_id": "test-session-agent",
        "user_id": "user-test-456",
        "user_role": "student",
        "startup_id": "startup-test-789",
        "messages": [],
        "user_input": "What are the eligibility criteria for incubation?",
        "intent": None,
        "entities": {},
        "planned_agents": [],
        "active_agent": None,
        "research_output": None,
        "prototype_output": None,
        "market_output": None,
        "formation_output": None,
        "incubation_output": None,
        "investor_output": None,
        "incubation_assistant_output": None,
        "application_agent_output": None,
        "mentor_match_output": None,
        "workflow_output": None,
        "monitoring_output": None,
        "tool_results": [],
        "rag_chunks": [],
        "readiness_score": None,
        "readiness_breakdown": None,
        "final_response": None,
        "recommendations": [],
        "requires_human_review": False,
        "error": None,
        "tokens_used": 0,
        "run_metadata": {},
    }
    base.update(kwargs)
    return base


# ── 1. AI Incubation Assistant Tests ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_incubation_assistant_retrieval_and_response():
    state = make_agent_state(user_input="What are the eligibility criteria for student startups?")
    result = await run_incubation_assistant(state)

    assert result["incubation_assistant_output"] is not None
    assert result["incubation_assistant_output"]["status"] == "success"
    assert result["final_response"] is not None
    assert len(result["rag_chunks"]) > 0
    # Ensure policy content is present in retrieval
    assert any("eligibility" in c.get("title", "").lower() or "criteria" in c.get("title", "").lower() for c in result["rag_chunks"])


# ── 2. Application Agent Tests ────────────────────────────────────────────────

def test_application_agent_validation():
    # Incomplete application
    invalid_data = {
        "name": "Hi",  # too short
        "shortDescription": "Short",  # too short
        "problem": "Bad",
        "solution": "",
        "declarationAccepted": False,
    }
    validation = validate_application_data(invalid_data)
    assert validation["is_complete"] is False
    assert len(validation["missing_fields"]) >= 4

    # Valid application
    valid_data = {
        "name": "EcoPack Agritech",
        "shortDescription": "Sustainable packaging from agricultural residue and sugarcane waste",
        "problem": "Plastic waste in agricultural supply chains causes severe environmental degradation.",
        "solution": "Biodegradable composite trays with 180-day natural soil decomposition cycle.",
        "domain": "GreenTech / Materials",
        "teamMembers": [{"name": "Riya", "rollNumber": "CSE01"}],
        "declarationAccepted": True,
    }
    valid_res = validate_application_data(valid_data)
    assert valid_res["is_complete"] is True
    assert valid_res["completeness_score"] >= 80


@pytest.mark.asyncio
async def test_application_agent_never_auto_decides():
    valid_data = {
        "name": "NeuroSense AI",
        "shortDescription": "EEG-based cognitive fatigue monitor for transport drivers",
        "problem": "Long-haul drivers suffer from fatigue leading to avoidable highway collisions.",
        "solution": "Ultra-low power EEG headband paired with edge ML alert system.",
        "domain": "HealthTech / ML",
        "teamMembers": [{"name": "Arjun", "rollNumber": "ECE01"}],
        "declarationAccepted": True,
    }
    assessment = await assess_application(valid_data)

    # Mandatory human admission gate
    assert assessment.get("requires_human_admission_decision") is True
    assert assessment["validation"]["is_complete"] is True
    if assessment.get("assessment_available"):
        assert assessment["summary"]["problem"] is not None
        assert "questions_for_reviewers" in assessment
    else:
        # LLM unavailable: nothing is fabricated - no scores, summary or reviewer questions.
        for invented in ("summary", "preliminary_assessment", "questions_for_reviewers", "recommendation_summary"):
            assert invented not in assessment


# ── 3. Mentor-Matching Agent Tests ────────────────────────────────────────────

def test_mentor_matching_ranking_and_conflicts():
    # Match for an AgriTech project
    result = match_mentors_for_startup(
        domain="AgriTech / ML",
        stage="Prototype",
        challenges="Edge CNN model training on low-power devices",
        requested_expertise=["Deep Learning", "Edge AI"],
        existing_allocations=["Dr. Vikram Malhotra"],  # Should flag conflict
    )

    assert result["status"] == "success"
    assert len(result["recommendations"]) > 0

    top_mentor = result["recommendations"][0]
    assert top_mentor["match_score"] > 50

    # Ensure duplicate allocation is flagged
    vikram = next((m for m in result["recommendations"] if m["name"] == "Dr. Vikram Malhotra"), None)
    if vikram:
        assert vikram["has_conflict"] is True
        assert "already assigned" in vikram["conflict_reason"]


# ── 4. Workflow Agent Tests ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_workflow_agent_idempotency_and_history():
    payload = {
        "title": "Stage 2 Bench Review",
        "date": "2026-11-20",
        "participants": ["Dr. K. R. Raman", "Student Lead"],
        "idempotency_key": "meeting_proj123_20261120",
    }

    # First call - executes action
    res1 = await coordinate_workflow_action(
        action_type="schedule_meeting",
        target_id="proj123",
        payload=payload,
        actor_id="admin-01",
        actor_role="admin",
    )
    assert res1["success"] is True
    assert res1["deduplicated"] is False
    action_id = res1["action_id"]

    # Duplicate call - should deduplicate
    res2 = await coordinate_workflow_action(
        action_type="schedule_meeting",
        target_id="proj123",
        payload=payload,
        actor_id="admin-01",
        actor_role="admin",
    )
    assert res2["success"] is True
    assert res2["deduplicated"] is True
    assert res2["action_id"] == action_id

    # Check activity history
    history = get_workflow_activity_history("proj123")
    assert len(history) >= 1
    assert history[0]["idempotency_key"] == "meeting_proj123_20261120"


# ── 5. Monitoring Agent Tests ─────────────────────────────────────────────────

def test_monitoring_agent_evaluates_health_and_distinguishes_facts():
    # Case 1: On Track
    healthy = evaluate_startup_health(
        startup_name="AgriSense",
        stage="Prototype",
        total_milestones=4,
        completed_milestones=2,
        overdue_milestones=0,
        tasks_completed=6,
        total_tasks=8,
        days_since_last_report=5,
    )
    assert healthy["health_status"] == "On Track"
    assert healthy["measured_facts"]["overdue_milestones"] == 0
    assert healthy["ai_interpretation"]["requires_staff_confirmation"] is False

    # Case 2: At Risk
    at_risk = evaluate_startup_health(
        startup_name="DecentralHealth",
        stage="Ideation",
        total_milestones=3,
        completed_milestones=0,
        overdue_milestones=2,
        tasks_completed=1,
        total_tasks=5,
        days_since_last_report=35,
    )
    assert at_risk["health_status"] == "At Risk"
    assert at_risk["measured_facts"]["overdue_milestones"] == 2
    assert len(at_risk["ai_interpretation"]["risk_factors"]) >= 2
    assert at_risk["ai_interpretation"]["requires_staff_confirmation"] is True


def test_monitoring_agent_never_reports_missing_data_as_healthy():
    empty = evaluate_startup_health(startup_name="Ghost", stage="Idea")
    assert empty["health_status"] == "No Data"
    assert empty["measured_facts"]["total_milestones"] is None
    assert empty["ai_interpretation"]["requires_staff_confirmation"] is False
    assert empty["ai_interpretation"]["signals"][0]["code"] == "no_data"

    # Zero milestones/tasks recorded is the same as not tracked.
    zero = evaluate_startup_health(startup_name="Ghost", stage="Idea", total_milestones=0, total_tasks=0)
    assert zero["health_status"] == "No Data"


def test_monitoring_agent_skips_rules_for_untracked_figures():
    # Milestones only: an untracked task rate must not trigger "Needs Attention", nor a missing report "At Risk".
    only_milestones = evaluate_startup_health(
        startup_name="M", stage="Idea", total_milestones=3, completed_milestones=1, overdue_milestones=0
    )
    assert only_milestones["health_status"] == "On Track"
    assert "tasks" in only_milestones["ai_interpretation"]["not_tracked"]
    assert "progress reports" in only_milestones["ai_interpretation"]["not_tracked"]

    # One overdue milestone is enough to need attention, with a signal pointing at the milestones workflow.
    one_late = evaluate_startup_health(
        startup_name="M", stage="Idea", total_milestones=3, completed_milestones=1, overdue_milestones=1
    )
    assert one_late["health_status"] == "Needs Attention"
    assert [s["target"] for s in one_late["ai_interpretation"]["signals"]] == ["milestones"]


def test_monitoring_graph_node_does_not_invent_figures():
    import asyncio
    state = asyncio.run(run_monitoring_agent({"entities": {}}))
    assert state["monitoring_output"]["health_status"] == "No Data"
    assert state["monitoring_output"]["measured_facts"]["reported_metrics"] == {}
