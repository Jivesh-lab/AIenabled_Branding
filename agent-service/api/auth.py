from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel

from config import get_settings

class AuthenticatedUser(BaseModel):
    id: str
    role: str
    permissions: list[str] = []
    is_internal: bool = False

security = HTTPBearer(auto_error=False)

def get_current_user(
    request: Request = None,
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> AuthenticatedUser:
    """Authenticates standard user requests (Express JWT). Strictly rejects internal server tokens."""
    settings = get_settings()

    if credentials:
        try:
            # Pre-check unverified claims to reject any token claiming to be internal
            unverified = jwt.get_unverified_claims(credentials.credentials)
            if unverified.get("iss") == "next-server" or unverified.get("aud") == "fastapi-internal":
                raise HTTPException(status_code=403, detail="Internal service tokens cannot be used for user endpoints")

            payload = jwt.decode(
                credentials.credentials,
                settings.jwt_secret,
                algorithms=["HS256"]
            )
            
            if payload.get("iss") == "next-server" or payload.get("aud") == "fastapi-internal":
                raise HTTPException(status_code=403, detail="Internal service tokens cannot be used for user endpoints")

            user_id = payload.get("sub")
            role = payload.get("role")
            if not user_id or not role:
                raise HTTPException(status_code=401, detail="Invalid token payload")
            return AuthenticatedUser(id=str(user_id), role=str(role), is_internal=False)
        except HTTPException:
            raise
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Development or SSE query parameter fallback (EventSource browser stream)
    if request:
        user_id = request.query_params.get("user_id")
        user_role = request.query_params.get("user_role") or "student"
        if user_id and settings.is_development:
            return AuthenticatedUser(id=str(user_id), role=str(user_role), is_internal=False)

    raise HTTPException(status_code=401, detail="Authentication credentials missing")

def get_internal_service(credentials: HTTPAuthorizationCredentials = Security(security)) -> AuthenticatedUser:
    """Authenticates server-to-server requests (Next.js internal JWT). Strictly rejects user JWTs."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication credentials missing")
    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.internal_jwt_secret,
            algorithms=["HS256"],
            audience="fastapi-internal",
            issuer="next-server"
        )
        if payload.get("iss") != "next-server" or payload.get("aud") != "fastapi-internal":
            raise HTTPException(status_code=401, detail="Invalid internal token claims")

        user_id = payload.get("sub")
        role = payload.get("role")
        permissions = payload.get("permissions", [])
        if not user_id or not role:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return AuthenticatedUser(
            id=str(user_id), 
            role=str(role), 
            permissions=permissions, 
            is_internal=True
        )
    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired internal token")
