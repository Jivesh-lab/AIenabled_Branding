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

def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Security(security)) -> AuthenticatedUser:
    """Authenticates standard user requests (Express JWT) or SSE query params in dev."""
    settings = get_settings()

    if credentials:
        try:
            unverified_claims = jwt.get_unverified_claims(credentials.credentials)
            if unverified_claims.get("iss") == "next-server":
                raise HTTPException(status_code=401, detail="Internal tokens not allowed here")

            payload = jwt.decode(
                credentials.credentials,
                settings.jwt_secret,
                algorithms=["HS256"]
            )
            
            user_id = payload.get("sub")
            role = payload.get("role")
            if user_id and role:
                return AuthenticatedUser(id=str(user_id), role=str(role))
        except JWTError:
            pass

    # Development or SSE query parameter fallback (EventSource browser stream)
    user_id = request.query_params.get("user_id") or "guest"
    user_role = request.query_params.get("user_role") or "student"

    if settings.is_development or user_id:
        return AuthenticatedUser(id=str(user_id), role=str(user_role))

    raise HTTPException(status_code=401, detail="Authentication credentials missing")

def get_internal_service(credentials: HTTPAuthorizationCredentials = Security(security)) -> AuthenticatedUser:
    """Authenticates server-to-server requests (Next.js internal JWT)."""
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
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired internal token")
