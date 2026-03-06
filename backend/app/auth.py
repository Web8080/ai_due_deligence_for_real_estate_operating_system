# Author: Victor.I
import secrets
from typing import Dict, Tuple

from fastapi import Header, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .models import User

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
_token_store: Dict[str, Tuple[str, str]] = {}
DEFAULT_USERS = [
    ("admin", "admin123", "admin"),
    ("analyst1", "analyst123", "analyst"),
    ("manager1", "manager123", "manager"),
]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def issue_token(username: str, role: str) -> str:
    token = secrets.token_urlsafe(32)
    _token_store[token] = (username, role)
    return token


def create_default_admin(db: Session) -> None:
    for username, password, role in DEFAULT_USERS:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            continue
        user = User(username=username, password_hash=hash_password(password), role=role)
        db.add(user)
    db.commit()


def require_auth(authorization: str = Header(default="")) -> Tuple[str, str]:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = authorization.replace("Bearer ", "", 1)
    data = _token_store.get(token)
    if not data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return data
