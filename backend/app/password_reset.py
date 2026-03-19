from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlmodel import Session, select

from app.config import get_settings
from app.models import PasswordResetToken, User


def generate_password_reset_token() -> str:
    return secrets.token_urlsafe(32)


def hash_password_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_password_reset_record(
    session: Session,
    *,
    user: User,
    raw_token: str,
    requested_ip: str | None,
    requested_user_agent: str | None,
) -> PasswordResetToken:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.password_reset_token_ttl_minutes
    )
    record = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_password_reset_token(raw_token),
        expires_at=expires_at,
        requested_ip=requested_ip[:64] if requested_ip else None,
        requested_user_agent=requested_user_agent[:512] if requested_user_agent else None,
    )
    session.add(record)
    return record


def find_valid_password_reset_token(
    session: Session,
    *,
    raw_token: str,
) -> PasswordResetToken | None:
    hashed = hash_password_reset_token(raw_token)
    now = datetime.now(timezone.utc)
    statement = select(PasswordResetToken).where(
        PasswordResetToken.token_hash == hashed,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > now,
    )
    return session.exec(statement).first()


def invalidate_user_password_reset_tokens(
    session: Session,
    *,
    user_id: int,
    used_at: datetime,
) -> None:
    session.exec(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=used_at)
    )
