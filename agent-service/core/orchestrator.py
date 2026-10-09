"""
core/orchestrator.py
─────────────────────
Supervisor / Orchestrator Agent built with LangGraph.

Flow:
  user_input
    → intent_analysis   (classify intent, extract entities)
    → task_planning     (decide which agents to call and in what order)
    → agent_router      (dispatch to the correct specialist agent)
    → [specialist agents run sequentially]
    → verification      (validate outputs, flag human review if needed)
    → response_generation (compose final human-readable answer)

Each specialist agent is its own compiled LangGraph sub-graph, invoked
as a node in this orchestrator graph.
"""

from __future__ import annotations

import json
from typing import Literal

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from core.llm import get_llm
from core.state import AgentState

logger = structlog.get_logger(__name__)

# ── System prompts ─────────────────────────────────────────────────────────────

INTENT_SYSTEM = """You are the Orchestrator of an AI-powered Incubation Centre.
Analyse the user's message and respond with ONLY valid JSON in this format:
{
  "intent": "<one of: research_analysis | prototype_evaluation | market_validation |
              startup_formation | incubation_check | investor_matching | general_query>",
  "entities": {
    "startup_name": "<if mentioned>",
    "sector": "<if mentioned>",
    "stage": "<if mentioned>",
    "document_type": "<if mentioned>"
  },
  "confidence": <0.0-1.0>,
  "reasoning": "<one sentence>"
}
Do not output anything else."""

PLANNING_SYSTEM = """You are a task planner for an AI Incubation Centre.
Given the detected intent and entities, output the ORDERED list of specialist agents to invoke.
Respond ONLY with valid JSON:
{
  "planned_agents": ["<agent1>", "<agent2>"],
  "reasoning": "<brief>"
}
Available agents: research, prototype, market, formation, incubation, investor
"""

VERIFICATION_SYSTEM = """You are a quality checker for an AI Incubation Centre.
Review the agent outputs and decide:
1. Are the results complete and coherent?
2. Does this require human (admin/mentor) review?
Respond ONLY with valid JSON:
{
  "quality_ok": true|false,
  "requires_human_review": true|false,
  "issues": ["<issue1>", ...],
  "readiness_score": <0-100 or null>
}"""

RESPONSE_SYSTEM = """You are a helpful AI assistant at an Incubation Centre.
Synthesise the specialist agents' outputs into a clear, actionable response for the user.
Be encouraging but honest. Format with markdown bullet points.
Always end with 3 concrete next steps."""


# ── Node functions ─────────────────────────────────────────────────────────────

async def intent_analysis(state: AgentState) -> AgentState:
    """Classify user intent and extract key entities."""
    logger.info("orchestrator_intent", session=state["session_id"])
    llm = get_llm(temperature=0.0)
    messages = [
        SystemMessage(content=INTENT_SYSTEM),
        HumanMessage(content=state["user_input"]),
    ]
    response = await llm.ainvoke(messages)
    try:
        parsed = json.loads(response.content)
        state["intent"] = parsed.get("intent", "general_query")
        state["entities"] = parsed.get("entities", {})
    except json.JSONDecodeError:
        logger.warning("intent_parse_failed", raw=response.content)
        state["intent"] = "general_query"
        state["entities"] = {}
    return state


async def task_planning(state: AgentState) -> AgentState:
    """Decide which agents to invoke and in what order."""
    # Hardcoded rules for common intents (faster + cheaper than LLM call)
    intent_to_agents = {
        "research_analysis":     ["research"],
        "prototype_evaluation":  ["prototype"],
        "market_validation":     ["market"],
        "startup_formation":     ["research", "market", "formation"],
        "incubation_check":      ["research", "prototype", "market", "incubation"],
        "investor_matching":     ["market", "investor"],
        "general_query":         [],
    }
    state["planned_agents"] = intent_to_agents.get(state["intent"], [])
    logger.info("orchestrator_planned", agents=state["planned_agents"])
    return state


def route_to_agent(state: AgentState) -> str:
    """Conditional edge — pick next agent or go to verification."""
    remaining = [
        a for a in state["planned_agents"]
        if a not in _completed_agents(state)
    ]
    if not remaining:
        return "verification"
    next_agent = remaining[0]
    state["active_agent"] = next_agent
    logger.info("orchestrator_routing", next_agent=next_agent)
    return next_agent


def _completed_agents(state: AgentState) -> list[str]:
    """Return agents that have already produced output."""
    completed = []
    if state.get("research_output"):
        completed.append("research")
    if state.get("prototype_output"):
        completed.append("prototype")
    if state.get("market_output"):
        completed.append("market")
    if state.get("formation_output"):
        completed.append("formation")
    if state.get("incubation_output"):
        completed.append("incubation")
    if state.get("investor_output"):
        completed.append("investor")
    return completed


async def verification(state: AgentState) -> AgentState:
    """Validate agent outputs and compute readiness score."""
    if not any([
        state.get("research_output"),
        state.get("prototype_output"),
        state.get("market_output"),
    ]):
        # No specialist outputs — skip verification
        state["requires_human_review"] = False
        return state

    llm = get_llm(temperature=0.0)
    summary = {
        "research": state.get("research_output"),
        "prototype": state.get("prototype_output"),
        "market": state.get("market_output"),
    }
    messages = [
        SystemMessage(content=VERIFICATION_SYSTEM),
        HumanMessage(content=json.dumps(summary, default=str)),
    ]
    response = await llm.ainvoke(messages)
    try:
        parsed = json.loads(response.content)
        state["requires_human_review"] = parsed.get("requires_human_review", False)
        score = parsed.get("readiness_score")
        if score is not None:
            state["readiness_score"] = score
            # Compute breakdown from individual agent scores
            state["readiness_breakdown"] = _compute_breakdown(state)
    except json.JSONDecodeError:
        logger.warning("verification_parse_failed")
        state["requires_human_review"] = False
    return state


def _compute_breakdown(state: AgentState) -> dict[str, int]:
    """Derive per-dimension scores from agent outputs."""
    breakdown: dict[str, int] = {}
    if r := state.get("research_output"):
        breakdown["research"] = r.get("novelty_score", 0)
    if p := state.get("prototype_output"):
        breakdown["prototype"] = p.get("technical_feasibility", 0)
    if m := state.get("market_output"):
        breakdown["market"] = m.get("opportunity_score", 0)
    if f := state.get("formation_output"):
        breakdown["business_model"] = f.get("model_score", 0)
    return breakdown


async def response_generation(state: AgentState) -> AgentState:
    """Compose the final user-facing response."""
    llm = get_llm(temperature=0.4)

    context_parts = [f"User asked: {state['user_input']}"]
    if state.get("research_output"):
        context_parts.append(f"Research findings: {json.dumps(state['research_output'], default=str)}")
    if state.get("market_output"):
        context_parts.append(f"Market findings: {json.dumps(state['market_output'], default=str)}")
    if state.get("prototype_output"):
        context_parts.append(f"Prototype findings: {json.dumps(state['prototype_output'], default=str)}")
    if state.get("readiness_score") is not None:
        context_parts.append(f"Overall readiness score: {state['readiness_score']}/100")

    messages = [
        SystemMessage(content=RESPONSE_SYSTEM),
        HumanMessage(content="\n\n".join(context_parts)),
    ]
    response = await llm.ainvoke(messages)
    state["final_response"] = response.content
    return state


# ── Graph assembly ─────────────────────────────────────────────────────────────

def build_orchestrator() -> "CompiledGraph":
    """
    Build the Orchestrator LangGraph.
    Specialist agents are imported lazily to avoid circular imports.
    """
    from agents.research import run_research_agent
    from agents.prototype import run_prototype_agent
    from agents.market import run_market_agent
    from agents.formation import run_formation_agent
    from agents.incubation import run_incubation_agent
    from agents.investor import run_investor_agent

    graph = StateGraph(AgentState)

    # Nodes
    graph.add_node("intent_analysis", intent_analysis)
    graph.add_node("task_planning", task_planning)
    graph.add_node("agent_router_node", lambda s: s)   # passthrough, routing via edges
    graph.add_node("research", run_research_agent)
    graph.add_node("prototype", run_prototype_agent)
    graph.add_node("market", run_market_agent)
    graph.add_node("formation", run_formation_agent)
    graph.add_node("incubation", run_incubation_agent)
    graph.add_node("investor", run_investor_agent)
    graph.add_node("verification", verification)
    graph.add_node("response_generation", response_generation)

    # Entry
    graph.set_entry_point("intent_analysis")

    # Linear up to router
    graph.add_edge("intent_analysis", "task_planning")
    graph.add_edge("task_planning", "agent_router_node")

    # Conditional routing from router_node
    graph.add_conditional_edges(
        "agent_router_node",
        route_to_agent,
        {
            "research": "research",
            "prototype": "prototype",
            "market": "market",
            "formation": "formation",
            "incubation": "incubation",
            "investor": "investor",
            "verification": "verification",
        },
    )

    # After each specialist agent → back to router (loop until all done)
    for agent in ["research", "prototype", "market", "formation", "incubation", "investor"]:
        graph.add_edge(agent, "agent_router_node")

    # Verification → response → end
    graph.add_edge("verification", "response_generation")
    graph.add_edge("response_generation", END)

    return graph.compile()
