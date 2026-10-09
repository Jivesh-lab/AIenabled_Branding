"""
core/state.py
─────────────
Shared LangGraph AgentState TypedDict.
Every node in every graph reads from and writes to this structure.
"""

from __future__ import annotations

from typing import Annotated, Any
from typing_extensions import TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """
    Canonical shared state flowing through all LangGraph graphs.

    Fields are cumulative — each agent appends to lists, overwrites scalars.
    """

    # ── Identity ──────────────────────────────────────────────────────────────
    session_id: str               # unique chat/task session id
    user_id: str                  # MongoDB user ObjectId
    user_role: str                # student | mentor | admin | faculty | investor
    startup_id: str | None        # UUID of attached startup (if any)

    # ── Conversation ──────────────────────────────────────────────────────────
    messages: Annotated[list, add_messages]  # LangGraph message accumulator
    user_input: str               # raw user message / task description

    # ── Orchestrator outputs ──────────────────────────────────────────────────
    intent: str | None            # classified intent label
    entities: dict[str, Any]      # extracted entities {startup, sector, ...}
    planned_agents: list[str]     # ordered list of agents to invoke
    active_agent: str | None      # currently running agent

    # ── Agent outputs (cumulative) ────────────────────────────────────────────
    research_output: dict[str, Any] | None
    prototype_output: dict[str, Any] | None
    market_output: dict[str, Any] | None
    formation_output: dict[str, Any] | None
    incubation_output: dict[str, Any] | None
    investor_output: dict[str, Any] | None

    # ── Tools / RAG ───────────────────────────────────────────────────────────
    tool_results: list[dict[str, Any]]
    rag_chunks: list[dict[str, Any]]          # retrieved knowledge base chunks

    # ── Final outputs ─────────────────────────────────────────────────────────
    readiness_score: int | None               # 0–100, auto-computed
    readiness_breakdown: dict[str, int] | None
    final_response: str | None                # human-readable answer
    recommendations: list[str]               # actionable next steps
    requires_human_review: bool              # flag for admin/mentor escalation

    # ── Metadata ──────────────────────────────────────────────────────────────
    error: str | None                         # error message if agent failed
    tokens_used: int
    run_metadata: dict[str, Any]             # timing, model, etc.
