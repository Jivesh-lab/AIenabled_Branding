"""
tests/test_orchestrator.py
───────────────────────────
Unit tests for the Orchestrator intent analysis and task planning nodes.
No LLM calls — mocked via monkeypatching.
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from core.state import AgentState
from core.orchestrator import intent_analysis, task_planning, _completed_agents


def make_state(**kwargs) -> AgentState:
    base: AgentState = {
        "session_id": "test-session",
        "user_id": "user-123",
        "user_role": "student",
        "startup_id": None,
        "messages": [],
        "user_input": "Help me validate my EdTech startup idea",
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


@pytest.mark.asyncio
async def test_intent_analysis_market_validation():
    """Orchestrator should classify market-related queries correctly."""
    mock_response = MagicMock()
    mock_response.content = json.dumps({
        "intent": "market_validation",
        "entities": {"sector": "EdTech"},
        "confidence": 0.92,
        "reasoning": "User wants to validate market.",
    })

    with patch("core.orchestrator.get_llm") as mock_llm_factory:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = mock_response
        mock_llm_factory.return_value = mock_llm

        state = make_state(user_input="What is the market size for EdTech in India?")
        result = await intent_analysis(state)

    assert result["intent"] == "market_validation"
    assert result["entities"].get("sector") == "EdTech"


@pytest.mark.asyncio
async def test_intent_analysis_fallback_on_bad_json():
    """Should default to general_query if LLM returns invalid JSON."""
    mock_response = MagicMock()
    mock_response.content = "I cannot classify this."  # not JSON

    with patch("core.orchestrator.get_llm") as mock_llm_factory:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = mock_response
        mock_llm_factory.return_value = mock_llm

        state = make_state()
        result = await intent_analysis(state)

    assert result["intent"] == "general_query"
    assert result["entities"] == {}


@pytest.mark.asyncio
async def test_task_planning_startup_formation():
    """startup_formation intent should plan research + market + formation agents."""
    state = make_state(intent="startup_formation", entities={})
    result = await task_planning(state)
    assert result["planned_agents"] == ["research", "market", "formation"]


@pytest.mark.asyncio
async def test_task_planning_incubation_check():
    """incubation_check should plan all core analysis agents."""
    state = make_state(intent="incubation_check", entities={})
    result = await task_planning(state)
    assert "research" in result["planned_agents"]
    assert "incubation" in result["planned_agents"]


def test_completed_agents_tracking():
    """_completed_agents should reflect which outputs are populated."""
    state = make_state(
        research_output={"novelty_score": 70},
        market_output={"opportunity_score": 65},
    )
    completed = _completed_agents(state)
    assert "research" in completed
    assert "market" in completed
    assert "prototype" not in completed
