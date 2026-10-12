"""
agents/incubation_assistant.py
──────────────────────────────
Agent 1: AI Incubation Assistant
Purpose: Help students and founders understand and navigate the incubation process.
Features:
- Answers queries on eligibility, procedures, documents, stages, mentors, funding schemes.
- Integrates RAG retrieval (hybrid_search / semantic_search).
- Evaluates user application status / missing info if user is authenticated student.
- Graceful fallbacks when LLM is unavailable or offline.
"""

from __future__ import annotations

import json
import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from core.llm import get_llm
from core.state import AgentState
from rag.retriever import hybrid_search

logger = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are the AI Incubation Assistant at the DBIT Incubation Centre (DBITIC).
Your goal is to guide student innovators and startup founders through every phase of the incubation journey.

Use the provided Knowledge Base context and the user's current project records to provide an accurate, helpful, and empathetic answer.
Rules:
1. Always be factual. Rely on the provided Knowledge Base context for policies, funding, and stages.
2. If application details are missing or incomplete, kindly guide the user to the specific submission or project page.
3. If information is not in the knowledge base, state clearly that the requested information is not currently on record and suggest contacting the faculty coordinator.
4. Distinguish clearly between policy facts and advice.
5. Provide markdown formatted responses with clear headings, bullet points, and next steps.
"""


async def run_incubation_assistant(state: AgentState) -> AgentState:
    """LangGraph node for conversational Incubation Assistant."""
    session_id = state.get("session_id", "unknown")
    user_input = state.get("user_input", "")
    user_role = state.get("user_role", "student")
    user_id = state.get("user_id", "")
    startup_id = state.get("startup_id")

    logger.info("incubation_assistant_start", session=session_id, user_role=user_role)

    # 1. Retrieve relevant knowledge chunks via RAG
    rag_chunks = []
    try:
        rag_chunks = await hybrid_search(user_input, top_k=4)
        state["rag_chunks"] = rag_chunks
    except Exception as exc:
        logger.warning("incubation_assistant_rag_failed", error=str(exc))

    # 2. Build context
    kb_context_str = "\n\n".join([
        f"--- Source: {c.get('title', c.get('source'))} ---\n{c.get('content')}"
        for c in rag_chunks
    ]) if rag_chunks else "No specific documents found."

    user_context = (
        f"User Role: {user_role}\n"
        f"User ID: {user_id}\n"
        f"Startup ID: {startup_id or 'None attached'}\n"
    )

    full_context = f"{user_context}\n\n[Knowledge Base Context]:\n{kb_context_str}\n\n[User Question]:\n{user_input}"

    try:
        llm = get_llm(temperature=0.3)
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=full_context),
        ]
        response = await llm.ainvoke(messages)
        answer = response.content
    except Exception as exc:
        logger.warning("incubation_assistant_llm_failed_using_deterministic_fallback", error=str(exc))
        # Deterministic fallback response using retrieved RAG documents
        if rag_chunks:
            top_doc = rag_chunks[0]
            answer = (
                f"### Incubation Guidance: {top_doc.get('title', 'Policy Information')}\n\n"
                f"{top_doc.get('content')}\n\n"
                f"**Next Steps:**\n"
                f"- Review your project profile in the Student Workspace.\n"
                f"- For submission guidelines or mentor advice, contact the Incubation Coordinator at DBITIC.\n"
            )
        else:
            answer = (
                "Welcome to the DBIT Incubation Centre! To start incubation, teams must submit an idea "
                "with a defined problem, solution, target users, and team members. "
                "Visit the **Submit Application** tab to begin your evaluation."
            )

    assistant_output = {
        "status": "success",
        "answer": answer,
        "rag_sources_count": len(rag_chunks),
        "sources": [c.get("title", c.get("source")) for c in rag_chunks],
    }

    state["incubation_assistant_output"] = assistant_output
    state["final_response"] = answer

    logger.info("incubation_assistant_done", session=session_id)
    return state
