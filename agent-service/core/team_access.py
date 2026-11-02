"""
core/team_access.py
-------------------
Asks the Node.js backend (the owner of TeamMembership) whether a user holds an ACCEPTED membership on a project.
The user id comes from the already-verified internal token, never from the request; the call is authenticated with a
short-lived service JWT. Any failure raises 503 so a lookup problem can never be read as "allowed".
"""
from datetime import datetime, timedelta, timezone

import httpx
import structlog
from fastapi import HTTPException
from jose import jwt

from config import get_settings

logger = structlog.get_logger(__name__)


def _service_token() -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": "agent-service", "iss": "agent-service", "aud": "node-internal", "iat": now, "exp": now + timedelta(seconds=60)},
        settings.internal_jwt_secret,
        algorithm="HS256",
    )


async def _lookup_membership(user_id: str, project_id: str) -> bool:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=settings.node_backend_timeout_seconds) as client:
        response = await client.get(
            f"{settings.node_backend_url.rstrip('/')}/api/team/internal/access",
            params={"projectId": project_id, "userId": user_id},
            headers={"Authorization": f"Bearer {_service_token()}"},
        )
    if response.status_code != 200:
        raise ValueError(f"unexpected status {response.status_code}")
    return response.json().get("data", {}).get("member") is True


async def has_accepted_membership(user_id: str, project_id: str) -> bool:
    try:
        return await _lookup_membership(str(user_id), str(project_id))
    except Exception as exc:  # fail closed: never treat an unverifiable membership as access
        logger.warning("team_membership_lookup_failed", error=str(exc), project_id=project_id)
        raise HTTPException(status_code=503, detail="Team membership could not be verified right now. Please try again.")
