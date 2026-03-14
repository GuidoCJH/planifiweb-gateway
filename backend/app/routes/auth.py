from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlmodel import Session, select

from app.auth import (
    clear_session_cookie,
    create_access_token,
    get_current_user,
    get_password_hash,
    set_session_cookie,
    verify_password,
)
from app.config import get_settings
from app.db import get_session
from app.models import User
from app.normalization import normalize_email, normalize_person_name
from app.observability import get_logger, log_event
from app.rate_limit import rate_limit
from app.schemas import LegalAcceptanceRequest, SessionState, Token, UserCreate
from app.subscription import build_session_state

router = APIRouter(prefix="/auth", tags=["auth"])
logger = get_logger("planifiweb.auth")


@router.post("/register", response_model=Token)
def register(
    user_data: UserCreate,
    response: Response,
    _: None = Depends(rate_limit("register", limit=8, window_seconds=300)),
    session: Session = Depends(get_session),
):
    if not user_data.accept_terms or not user_data.accept_privacy:
        raise HTTPException(
            status_code=400,
            detail="Debes aceptar Terminos y Condiciones y Politica de Privacidad para crear la cuenta.",
        )

    normalized_email = normalize_email(user_data.email)
    statement = select(User).where(func.lower(User.email) == normalized_email)
    if session.exec(statement).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    accepted_at = datetime.now(timezone.utc)
    settings = get_settings()
    new_user = User(
        email=normalized_email,
        name=normalize_person_name(user_data.name),
        hashed_password=get_password_hash(user_data.password),
        subscription_status="awaiting_payment",
        subscription_scope="planifiweb",
        active_plan=None,
        terms_accepted_at=accepted_at,
        privacy_accepted_at=accepted_at,
        accepted_terms_version=settings.legal_terms_version,
        accepted_privacy_version=settings.legal_privacy_version,
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    log_event(
        logger,
        "auth.register.success",
        user_id=new_user.id,
        email=new_user.email,
    )

    token = create_access_token(data={"sub": new_user.email})
    set_session_cookie(response, token)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    _: None = Depends(rate_limit("login", limit=10, window_seconds=300)),
    session: Session = Depends(get_session),
):
    normalized_email = normalize_email(form_data.username)
    statement = select(User).where(func.lower(User.email) == normalized_email)
    user = session.exec(statement).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        log_event(
            logger,
            "auth.login.failed",
            email=normalized_email,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user.email})
    set_session_cookie(response, token)
    log_event(
        logger,
        "auth.login.success",
        user_id=user.id,
        email=user.email,
    )
    return Token(access_token=token)


@router.post("/logout")
def logout(response: Response):
    clear_session_cookie(response)
    log_event(logger, "auth.logout")
    return {"message": "Session closed"}


@router.get("/me", response_model=SessionState)
def read_users_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return build_session_state(session, current_user)


@router.post("/legal-acceptance", response_model=SessionState)
def accept_legal_documents(
    payload: LegalAcceptanceRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not payload.accept_terms or not payload.accept_privacy:
        raise HTTPException(
            status_code=400,
            detail="Both legal documents must be accepted to continue.",
        )

    settings = get_settings()
    accepted_at = datetime.now(timezone.utc)
    current_user.terms_accepted_at = accepted_at
    current_user.privacy_accepted_at = accepted_at
    current_user.accepted_terms_version = settings.legal_terms_version
    current_user.accepted_privacy_version = settings.legal_privacy_version
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    log_event(
        logger,
        "auth.legal.accepted",
        user_id=current_user.id,
        email=current_user.email,
        terms_version=settings.legal_terms_version,
        privacy_version=settings.legal_privacy_version,
    )
    return build_session_state(session, current_user)
