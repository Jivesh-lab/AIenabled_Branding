"""
api/chat.py
────────────
Chat endpoints — start session, stream agent tokens via SSE, get history.
"""

from __future__ import annotations

import json
import time
import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from core.orchestrator import build_orchestrator
from core.state import AgentState
from db.postgres import get_db

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

# Build the orchestrator graph once at import time
_orchestrator = build_orchestrator()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    user_id: str
    user_role: str = "student"
    message: str
    startup_id: str | None = None
    context: dict[str, Any] = {}


class ChatResponse(BaseModel):
    session_id: str
    response: str
    readiness_score: int | None = None
    readiness_breakdown: dict[str, int] | None = None
    requires_human_review: bool = False
    agent_outputs: dict[str, Any] = {}
    tokens_used: int = 0


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _log_session(
    pool: Any,
    session_id: str,
    user_id: str,
    message: str,
    response: str,
    state: AgentState,
) -> None:
    """Persist chat session and agent logs to PostgreSQL."""
    try:
        async with pool.acquire() as conn:
            # Upsert chat session
            await conn.execute(
                """
                INSERT INTO chat_sessions (id, user_id, title, messages, context)
                VALUES ($1::uuid, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE
                SET messages = chat_sessions.messages || $4,
                    updated_at = NOW()
                """,
                session_id,
                user_id,
                message[:80],
                json.dumps([
                    {"role": "user", "content": message, "timestamp": time.time()},
                    {"role": "assistant", "content": response, "timestamp": time.time()},
                ]),
                json.dumps({"startup_id": state.get("startup_id")}),
            )
            # Agent log
            await conn.execute(
                """
                INSERT INTO agent_logs (session_id, user_id, agent_name, input_text, output_text,
                                        tokens_used, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                session_id,
                user_id,
                state.get("active_agent", "orchestrator"),
                message,
                response[:4000],
                state.get("tokens_used", 0),
                "error" if state.get("error") else "success",
            )
    except Exception as exc:
        logger.error("session_log_failed", error=str(exc))


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, pool=Depends(get_db)) -> ChatResponse:
    """
    Non-streaming chat endpoint.
    Runs the full orchestrator graph and returns the complete response.
    Suitable for programmatic API calls (not the interactive chat UI).
    """
    session_id = str(uuid.uuid4())
    start_time = time.time()

    initial_state: AgentState = {
        "session_id": session_id,
        "user_id": request.user_id,
        "user_role": request.user_role,
        "startup_id": request.startup_id,
        "messages": [],
        "user_input": request.message,
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

    try:
        final_state = await _orchestrator.ainvoke(initial_state)
    except Exception as exc:
        logger.error("orchestrator_failed", error=str(exc), session=session_id)
        raise HTTPException(status_code=500, detail=f"Agent error: {str(exc)}")

    response_text = final_state.get("final_response") or "I was unable to generate a response. Please try again."
    await _log_session(pool, session_id, request.user_id, request.message, response_text, final_state)

    return ChatResponse(
        session_id=session_id,
        response=response_text,
        readiness_score=final_state.get("readiness_score"),
        readiness_breakdown=final_state.get("readiness_breakdown"),
        requires_human_review=final_state.get("requires_human_review", False),
        agent_outputs={
            k: v for k, v in {
                "research": final_state.get("research_output"),
                "prototype": final_state.get("prototype_output"),
                "market": final_state.get("market_output"),
                "formation": final_state.get("formation_output"),
                "incubation": final_state.get("incubation_output"),
                "investor": final_state.get("investor_output"),
            }.items() if v
        },
        tokens_used=final_state.get("tokens_used", 0),
    )


@router.get("/stream/{session_id}")
async def stream_chat(
    session_id: str,
    message: str,
    user_id: str,
    user_role: str = "student",
    startup_id: str | None = None,
    pool=Depends(get_db),
):
    """
    SSE streaming endpoint.
    The chat widget connects here and receives token-by-token output.
    Each event is: data: {"type": "token"|"step"|"done", "content": "..."}
    """
    initial_state: AgentState = {
        "session_id": session_id,
        "user_id": user_id,
        "user_role": user_role,
        "startup_id": startup_id,
        "messages": [],
        "user_input": message,
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

    async def event_generator():
        try:
            async for chunk in _orchestrator.astream(initial_state, stream_mode="values"):
                # Emit "thinking" step notifications
                if active := chunk.get("active_agent"):
                    yield {
                        "data": json.dumps({
                            "type": "step",
                            "content": f"Running {active} agent…",
                            "agent": active,
                        })
                    }
                # Emit final response tokens
                if final := chunk.get("final_response"):
                    yield {
                        "data": json.dumps({
                            "type": "response",
                            "content": final,
                        })
                    }

            # Final done event with score
            yield {
                "data": json.dumps({
                    "type": "done",
                    "readiness_score": chunk.get("readiness_score"),
                    "readiness_breakdown": chunk.get("readiness_breakdown"),
                    "requires_human_review": chunk.get("requires_human_review", False),
                })
            }
        except Exception as exc:
            logger.error("sse_stream_error", error=str(exc), session=session_id)
            yield {"data": json.dumps({"type": "error", "content": str(exc)})}

    return EventSourceResponse(event_generator())


@router.get("/sessions/{user_id}")
async def get_sessions(user_id: str, limit: int = 20, pool=Depends(get_db)):
    """Return a user's chat session history (most recent first)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, title, is_active, created_at, updated_at
            FROM chat_sessions
            WHERE user_id = $1
            ORDER BY updated_at DESC
            LIMIT $2
            """,
            user_id,
            limit,
        )
    return {"sessions": [dict(r) for r in rows]}


@router.get("/sessions/{user_id}/{session_id}/messages")
async def get_session_messages(user_id: str, session_id: str, pool=Depends(get_db)):
    """Return full message history for a specific session."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT messages, context FROM chat_sessions WHERE id = $1::uuid AND user_id = $2",
            session_id,
            user_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"messages": row["messages"], "context": row["context"]}
