"""
api/mentors.py
──────────────
Read-only lookup of an *already allocated* mentor's public profile from the existing mentor cohort
directory (agents/mentor_matching.py::EXISTING_MENTORS). DEMO ONLY: it answers only when AGENT_DEMO_MODE=true. Used by the student portal to show an
assigned mentor's expertise. It never runs matching and never returns anything for a name that is not
in the directory (no fabricated profiles).

Only the profile fields below are returned: capacity and current-load figures stay internal.
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from agents.mentor_matching import EXISTING_MENTORS
from api.auth import AuthenticatedUser, get_internal_service
from config import get_settings

router = APIRouter(prefix="/api/mentors", tags=["mentors"])


def _demo_enabled() -> bool:
    """The sample directory is for demos only. Real mentors are the portal's mentor accounts."""
    return bool(get_settings().agent_demo_mode)


def _normalise(name: str) -> str:
    return " ".join(name.lower().split())


@router.get("/lookup")
async def lookup_mentor(
    name: str = Query(..., min_length=2, max_length=120),
    current_user: AuthenticatedUser = Depends(get_internal_service),
):
    if "view_applications" not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Missing view_applications permission")

    if not _demo_enabled():
        raise HTTPException(status_code=404, detail="The sample mentor directory is switched off. Mentor profiles come from the portal's mentor accounts.")

    wanted = _normalise(name)
    for mentor in EXISTING_MENTORS:
        if _normalise(mentor["name"]) == wanted:
            return {
                "name": mentor["name"],
                "role": mentor["role"],
                "affiliation": mentor["affiliation"],
                "domains": mentor["domains"],
                "expertise": mentor["expertise"],
                "mentorType": mentor["mentor_type"],
            }
    raise HTTPException(status_code=404, detail="Mentor profile not found in the directory")
