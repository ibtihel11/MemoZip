from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest

def register_user(db: Session, data: RegisterRequest) -> User:
    existing_user = db.scalar(
        select(User).where(User.email == str(data.email))
    )

    if existing_user:
        raise ValueError("Email is already registered")

    user = User(
        name=data.name.strip(),
        email=str(data.email),
        password_hash=hash_password(data.password),
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()

        existing_user = db.scalar(
            select(User).where(User.email == str(data.email))
        )

        if existing_user:
            raise ValueError("Email is already registered") from None

        raise
    except Exception:
        db.rollback()
        raise

def authenticate_user(db: Session, data: LoginRequest) -> User:
    user = db.scalar(
        select(User).where(User.email == str(data.email))
    )

    if user is None or not verify_password(data.password, user.password_hash):
        raise ValueError("Invalid email or password")

    return user