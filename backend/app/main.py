from fastapi import FastAPI, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.database import get_db
from app.schemas.auth import (
    RegisterRequest,
    RefreshRequest,
    UserResponse,
    LoginRequest,
    TokenResponse,
)
from app.services.auth_service import register_user, authenticate_user
from app.services.token_service import (
    issue_tokens,
    rotate_refresh_token,
    revoke_refresh_token,
)
from app.api.deps import get_current_user
from app.models.user import User
from app.api.folders import router as folders_router
from app.api.library import router as library_router

from app.api.documents import router as documents_router

app = FastAPI(title=settings.app_name)

app.include_router(documents_router)
app.include_router(folders_router)
app.include_router(library_router)

@app.get("/")
def root():
    return {"message": "MemoZip API is running"}


@app.get("/api/health/db")
def database_health(db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("SELECT 1"))
    return {"database": "connected"}


@app.post(
    "/api/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(data: RegisterRequest,db: Session = Depends(get_db)):
    try:
        user = register_user(db, data)
        return UserResponse(
            id=str(user.id),
            name=user.name,
            email=user.email,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

@app.post("/api/auth/login", response_model=TokenResponse)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    data = LoginRequest(
        email=form_data.username,
        password=form_data.password,
    )

    try:
        user = authenticate_user(db, data)
        return issue_tokens(
            db,
            user,
            request.headers.get("user-agent"),
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
@app.get("/api/auth/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
    )

@app.post("/api/auth/refresh", response_model=TokenResponse)
def refresh(
    data: RefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        return rotate_refresh_token(
            db,
            data.refresh_token,
            request.headers.get("user-agent"),
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    data: RefreshRequest,
    db: Session = Depends(get_db),
):
    revoke_refresh_token(db, data.refresh_token)