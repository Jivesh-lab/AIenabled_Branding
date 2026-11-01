from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.auth import AuthenticatedUser, get_internal_service
from db.postgres import get_db
from db.standalone_store import standalone_claim_events, standalone_complete_event, standalone_list_events

router = APIRouter(prefix="/api/events", tags=["events"])


class ClaimRequest(BaseModel):
    limit: int = Field(50, ge=1, le=200)


class CompleteRequest(BaseModel):
    event_id: str
    success: bool = True
    error: str | None = Field(None, max_length=1000)


def _allowed(user: AuthenticatedUser) -> None:
    if not {"view_applications", "review_applications"}.intersection(user.permissions):
        raise HTTPException(status_code=403, detail="Missing event access permission")


@router.get("")
async def list_events(
    limit: int = Query(100, ge=1, le=200),
    event_type: str | None = None,
    application_id: str | None = None,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db),
) -> dict[str, Any]:
    """Return durable lifecycle events scoped to the authenticated user or reviewer role."""
    _allowed(current_user)
    if not pool:
        return {"events": standalone_list_events(limit=limit, event_type=event_type, application_id=application_id)}

    clauses = []
    values: list[Any] = []
    if current_user.role in {"student"}:
        values.append(current_user.id)
        clauses.append(f"application_id IN (SELECT id::text FROM applications WHERE applicant_id = ${len(values)})")
    elif current_user.role == "faculty":
        # PostgreSQL applications do not currently persist coordinator ownership;
        # expose only events directly authored by this faculty user rather than leaking center-wide data.
        values.append(current_user.id)
        clauses.append(f"actor_id = ${len(values)}")
    elif current_user.role not in {"admin", "super_admin", "faculty"}:
        return {"events": []}

    if event_type:
        values.append(event_type)
        clauses.append(f"event_type = ${len(values)}")
    if application_id:
        values.append(application_id)
        clauses.append(f"application_id = ${len(values)}")

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    values.append(limit)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""SELECT event_id, event_type, aggregate_type, aggregate_id, application_id, project_id,
                       actor_id, correlation_id, idempotency_key, payload, status, attempts,
                       processed_at, last_error, created_at
                FROM domain_events {where}
                ORDER BY created_at DESC LIMIT ${len(values)}""",
            *values,
        )
    return {"events": [{**dict(row), "payload": row["payload"] or {}} for row in rows]}


@router.post("/claim")
async def claim_events(
    payload: ClaimRequest,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db),
) -> dict[str, Any]:
    """Atomically claim PostgreSQL outbox rows for the Express relay."""
    if "event_relay" not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Missing event_relay permission")
    if not pool:
        return {"events": standalone_claim_events(payload.limit)}

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """WITH candidates AS (
                 SELECT id FROM domain_events
                 WHERE (status IN ('pending', 'failed') AND next_attempt_at <= NOW())
                    OR (status = 'processing' AND updated_at < NOW() - INTERVAL '10 minutes')
                 ORDER BY created_at ASC
                 FOR UPDATE SKIP LOCKED
                 LIMIT $1
               )
               UPDATE domain_events d
               SET status = 'processing', attempts = d.attempts + 1, updated_at = NOW()
               FROM candidates c
               WHERE d.id = c.id
               RETURNING d.event_id, d.event_type, d.aggregate_type, d.aggregate_id,
                         d.application_id, d.project_id, d.actor_id, d.correlation_id,
                         d.idempotency_key, d.payload, d.attempts, d.created_at""",
            payload.limit,
        )
    return {"events": [{**dict(row), "payload": row["payload"] or {}} for row in rows]}


@router.post("/complete")
async def complete_event(
    payload: CompleteRequest,
    current_user: AuthenticatedUser = Depends(get_internal_service),
    pool=Depends(get_db),
) -> dict[str, Any]:
    """Acknowledge relay delivery only after Mongo confirms persistence."""
    if "event_relay" not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Missing event_relay permission")
    if not pool:
        return {"success": standalone_complete_event(payload.event_id, payload.success, payload.error)}

    if payload.success:
        result = await pool.execute(
            """UPDATE domain_events SET status='completed', processed_at=NOW(), last_error=NULL, updated_at=NOW()
               WHERE event_id=$1 AND status='processing'""",
            payload.event_id,
        )
    else:
        result = await pool.execute(
            """UPDATE domain_events
               SET status=CASE WHEN attempts >= max_attempts THEN 'dead_letter' ELSE 'failed' END,
                   last_error=$2, next_attempt_at=NOW() + (LEAST(60, power(2, GREATEST(attempts - 1, 0))) * INTERVAL '1 minute'),
                   updated_at=NOW()
               WHERE event_id=$1 AND status='processing'""",
            payload.event_id,
            payload.error or "Relay delivery failed",
        )
    return {"success": result.endswith("1")}
