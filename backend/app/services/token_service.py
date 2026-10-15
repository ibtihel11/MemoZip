
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User


def issue_tokens(
    db: Session,
    user: User,
    user_agent: str | None = None,
) -> dict[str, str]:
    refresh_token = create_refresh_token()

    token_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_token),
        user_agent=user_agent,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.refresh_token_expire_days),
    )

    try:
        db.add(token_record)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


def rotate_refresh_token(
    db: Session,
    raw_token: str,
    user_agent: str | None = None,
) -> dict[str, str]:
    now = datetime.now(timezone.utc)
    token_hash = hash_refresh_token(raw_token)

    token_record = db.scalar(
        select(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .with_for_update()
    )

    if (
        token_record is None
        or token_record.revoked_at is not None
        or token_record.expires_at <= now
    ):
        raise ValueError("Invalid or expired refresh token")

    user = db.get(User, token_record.user_id)

    if user is None:
        raise ValueError("Invalid or expired refresh token")

    token_record.revoked_at = now
    new_refresh_token = create_refresh_token()

    new_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(new_refresh_token),
        user_agent=user_agent,
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
    )

    try:
        db.add(new_record)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }

def revoke_refresh_token(db: Session, raw_token: str) -> None:
    token_hash = hash_refresh_token(raw_token)

    token_record = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash
        )
    )

    if token_record is not None and token_record.revoked_at is None:
        token_record.revoked_at = datetime.now(timezone.utc)

        try:
            db.commit()
        except Exception:
            db.rollback()
            raise