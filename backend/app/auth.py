# Author: Victor.I
import os
import secrets
import time
from datetime import UTC, datetime, timedelta
from typing import Any, Dict, Optional, Tuple

import httpx
import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .database import get_db
from .models import AuditEvent, User, UserSession

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
DEFAULT_USERS = [
    ("admin", "admin123", "admin", "Alex Chen"),
    ("analyst1", "analyst123", "analyst", "Sam Rivera"),
    ("manager1", "manager123", "manager", "Riley Morgan"),
    ("vp_acquisitions", "reosdemo1", "manager", "Jordan Lee"),
    ("ir_director", "reosdemo1", "manager", "Morgan Patel"),
    ("associate_east", "reosdemo1", "analyst", "Casey Nguyen"),
    ("controller_ops", "reosdemo1", "analyst", "Taylor Brooks"),
]
SESSION_SECRET = os.getenv("REOS_SESSION_SECRET") or secrets.token_urlsafe(48)
SESSION_TTL_HOURS = int(os.getenv("REOS_SESSION_TTL_HOURS", "8"))
ENTRA_STATE_STORE: Dict[str, Tuple[str, int]] = {}
ENTRA_AUTH_GRANTS: Dict[str, Tuple[str, int]] = {}
ENTRA_STATE_TTL_SECONDS = 600


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def microsoft_auth_configured() -> bool:
    required = [
        os.getenv("REOS_ENTRA_TENANT_ID"),
        os.getenv("REOS_ENTRA_CLIENT_ID"),
        os.getenv("REOS_ENTRA_CLIENT_SECRET"),
        os.getenv("REOS_ENTRA_REDIRECT_URI"),
        os.getenv("REOS_ENTRA_FRONTEND_CALLBACK"),
    ]
    return all(required)


def local_recovery_enabled() -> bool:
    return os.getenv("REOS_LOCAL_LOGIN_ENABLED", "false").strip().lower() == "true"


def local_bootstrap_enabled() -> bool:
    return os.getenv("REOS_ENABLE_LOCAL_BOOTSTRAP", "false").strip().lower() == "true"


def local_signup_enabled() -> bool:
    """Optional self-serve accounts for sandboxes; keep false in production."""
    return os.getenv("REOS_ALLOW_LOCAL_SIGNUP", "false").strip().lower() == "true"


def product_demo_mode() -> bool:
    """
    When true, the API surfaces demo posture (no vendor traffic) on integration catalog and auth providers.
    Does not by itself disable Ollama or local SQLite.
    """
    return os.getenv("REOS_PRODUCT_DEMO_MODE", "false").strip().lower() == "true"


def _session_expiry() -> datetime:
    return datetime.now(UTC) + timedelta(hours=SESSION_TTL_HOURS)


def _session_is_expired(expires_at: datetime) -> bool:
    value = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=UTC)
    return value <= datetime.now(UTC)


def issue_token(username: str, role: str, provider: str = "local", session_id: Optional[int] = None) -> str:
    expiry = _session_expiry()
    payload = {
        "sub": username,
        "role": role,
        "provider": provider,
        "sid": session_id,
        "exp": int(expiry.timestamp()),
        "iat": int(time.time()),
    }
    return jwt.encode(payload, SESSION_SECRET, algorithm="HS256")


def create_user_session(db: Session, user: User, provider: str) -> str:
    provisional = secrets.token_urlsafe(24)
    session = UserSession(
        user_id=user.id,
        provider=provider,
        session_token=provisional,
        expires_at=_session_expiry(),
    )
    db.add(session)
    db.flush()
    token = issue_token(user.username, user.role, provider=provider, session_id=session.id)
    session.session_token = token
    db.add(
        AuditEvent(
            actor=user.username,
            action="login",
            entity_type="session",
            entity_id=str(session.id),
            detail=f"Authenticated with provider {provider}.",
        )
    )
    db.commit()
    return token


def create_default_admin(db: Session) -> None:
    if not local_bootstrap_enabled():
        return
    for row in DEFAULT_USERS:
        username, password, role = row[0], row[1], row[2]
        display_name = row[3] if len(row) > 3 else username.replace("_", " ").title()
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            continue
        user = User(
            username=username,
            password_hash=hash_password(password),
            role=role,
            provider="local",
            email=f"{username}@local.reos",
            display_name=display_name,
        )
        db.add(user)
    db.commit()


def revoke_session(db: Session, token: str) -> None:
    session = db.query(UserSession).filter(UserSession.session_token == token).first()
    if not session or session.revoked_at:
        return
    session.revoked_at = datetime.now(UTC)
    db.add(
        AuditEvent(
            actor="system",
            action="logout",
            entity_type="session",
            entity_id=str(session.id),
            detail="Session revoked.",
        )
    )
    db.commit()


def require_auth(
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
    session_cookie: str | None = Cookie(default=None, alias="reos_session"),
) -> Tuple[str, str]:
    token = ""
    if authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1)
    elif session_cookie:
        token = session_cookie
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = jwt.decode(token, SESSION_SECRET, algorithms=["HS256"])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    username = payload.get("sub")
    role = payload.get("role")
    session_id = payload.get("sid")
    session = db.query(UserSession).filter(UserSession.id == session_id).first() if session_id else None
    if (
        not username
        or not role
        or not session
        or session.session_token != token
        or session.revoked_at is not None
        or _session_is_expired(session.expires_at)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return username, role


def require_roles(*allowed_roles: str):
    allowed = {role.strip().lower() for role in allowed_roles}

    def dependency(identity: tuple = Depends(require_auth)) -> tuple[str, str]:
        username, role = identity
        if role.lower() not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return username, role

    return dependency


def get_auth_providers(api_base: str) -> dict[str, Any]:
    providers = []
    if microsoft_auth_configured():
        providers.append(
            {
                "key": "microsoft",
                "label": "Microsoft 365",
                "available": True,
                "primary": True,
                "auth_url": f"{api_base}/auth/entra/start",
                "description": "Authenticate with Microsoft Entra ID and your corporate Microsoft account.",
            }
        )
    else:
        providers.append(
            {
                "key": "microsoft",
                "label": "Microsoft 365",
                "available": False,
                "primary": True,
                "auth_url": None,
                "description": "Microsoft Entra is planned for this environment and becomes active once tenant configuration is supplied.",
            }
        )
    return {
        "providers": providers,
        "local_recovery_enabled": local_recovery_enabled(),
        "local_signup_enabled": local_signup_enabled() and local_recovery_enabled(),
        "product_demo_mode": product_demo_mode(),
    }


def build_entra_authorize_url() -> str:
    tenant_id = os.getenv("REOS_ENTRA_TENANT_ID", "common")
    client_id = os.getenv("REOS_ENTRA_CLIENT_ID", "")
    redirect_uri = os.getenv("REOS_ENTRA_REDIRECT_URI", "")
    state = secrets.token_urlsafe(18)
    nonce = secrets.token_urlsafe(18)
    ENTRA_STATE_STORE[state] = (nonce, int(time.time()) + ENTRA_STATE_TTL_SECONDS)
    scope = "openid profile email User.Read"
    return (
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
        f"?client_id={client_id}"
        f"&response_type=code"
        f"&redirect_uri={redirect_uri}"
        f"&response_mode=query"
        f"&scope={scope.replace(' ', '%20')}"
        f"&state={state}"
        f"&nonce={nonce}"
    )


async def exchange_entra_code(code: str) -> dict[str, Any]:
    tenant_id = os.getenv("REOS_ENTRA_TENANT_ID", "")
    client_id = os.getenv("REOS_ENTRA_CLIENT_ID", "")
    client_secret = os.getenv("REOS_ENTRA_CLIENT_SECRET", "")
    redirect_uri = os.getenv("REOS_ENTRA_REDIRECT_URI", "")
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            token_url,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        response.raise_for_status()
        return response.json()


async def validate_entra_id_token(id_token: str, *, expected_nonce: str) -> dict[str, Any]:
    tenant_id = os.getenv("REOS_ENTRA_TENANT_ID", "")
    client_id = os.getenv("REOS_ENTRA_CLIENT_ID", "")
    issuer = f"https://login.microsoftonline.com/{tenant_id}/v2.0"
    jwks_url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    header = jwt.get_unverified_header(id_token)
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        keys = response.json().get("keys", [])
    matching_key = next((item for item in keys if item.get("kid") == header.get("kid")), None)
    if not matching_key:
        raise HTTPException(status_code=401, detail="Unable to validate Microsoft signing key")
    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(matching_key)
    claims = jwt.decode(
        id_token,
        public_key,
        algorithms=["RS256"],
        audience=client_id,
        issuer=issuer,
        options={"require": ["exp", "iat", "iss", "aud"]},
    )
    if claims.get("nonce") != expected_nonce:
        raise HTTPException(status_code=401, detail="Microsoft nonce validation failed")
    return claims


def consume_entra_state(state: str) -> str:
    record = ENTRA_STATE_STORE.pop(state, None)
    if not record:
        raise HTTPException(status_code=401, detail="Microsoft state validation failed")
    nonce, expires_at = record
    if expires_at < int(time.time()):
        raise HTTPException(status_code=401, detail="Microsoft state expired")
    return nonce


def map_entra_role(email: str) -> str:
    admin_emails = {item.strip().lower() for item in os.getenv("REOS_ENTRA_ADMIN_EMAILS", "").split(",") if item.strip()}
    manager_emails = {
        item.strip().lower() for item in os.getenv("REOS_ENTRA_MANAGER_EMAILS", "").split(",") if item.strip()
    }
    email_value = email.strip().lower()
    if email_value in admin_emails:
        return "admin"
    if email_value in manager_emails:
        return "manager"
    return "analyst"


def entra_user_allowed(email: str) -> bool:
    allowed = {
        item.strip().lower()
        for item in os.getenv("REOS_ENTRA_ALLOWED_EMAILS", "").split(",")
        if item.strip()
    }
    domains = {
        item.strip().lower()
        for item in os.getenv("REOS_ENTRA_ALLOWED_DOMAINS", "").split(",")
        if item.strip()
    }
    email_value = email.strip().lower()
    domain = email_value.split("@", 1)[1] if "@" in email_value else ""
    return email_value in allowed or (domain and domain in domains)


def issue_auth_grant(token: str) -> str:
    grant = secrets.token_urlsafe(24)
    ENTRA_AUTH_GRANTS[grant] = (token, int(time.time()) + 120)
    return grant


def consume_auth_grant(grant: str) -> str:
    record = ENTRA_AUTH_GRANTS.pop(grant, None)
    if not record:
        raise HTTPException(status_code=401, detail="Invalid authentication grant")
    token, expires_at = record
    if expires_at < int(time.time()):
        raise HTTPException(status_code=401, detail="Authentication grant expired")
    return token
