import hmac
from fastapi import Header, HTTPException, status
from app.core.config import get_settings


def require_moderator(authorization: str | None = Header(default=None)) -> None:
    configured = get_settings().moderator_token
    if not configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Moderator access is not configured")
    scheme, separator, credential = authorization.partition(" ") if authorization else ("", "", "")
    supplied = credential.strip() if separator and scheme.lower() == "bearer" else ""
    if not hmac.compare_digest(supplied.encode(), configured.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Moderator authorization required", headers={"WWW-Authenticate": "Bearer"})
