from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlmodel import Session, select

from app.auth import (
    clear_session_cookie,
    clear_csrf_cookie,
    create_access_token,
    get_current_user,
    get_or_create_csrf_token,
    get_password_hash,
    set_session_cookie,
    verify_password,
)
from app.config import get_settings
from app.db import get_session
from app.email_service import EmailService, EmailServiceError, get_email_service
from app.models import User
from app.normalization import normalize_email, normalize_person_name
from app.observability import get_logger, log_event
from app.password_reset import (
    create_password_reset_record,
    find_valid_password_reset_token,
    generate_password_reset_token,
    invalidate_user_password_reset_tokens,
)
from app.rate_limit import rate_limit
from app.schemas import (
    CSRFTokenResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LegalAcceptanceRequest,
    MessageResponse,
    ResetPasswordRequest,
    SessionState,
    Token,
    UserCreate,
)
from app.subscription import build_session_state

router = APIRouter(prefix="/auth", tags=["auth"])
logger = get_logger("planifiweb.auth")


@router.get("/csrf", response_model=CSRFTokenResponse)
def issue_csrf_token(request: Request, response: Response):
    csrf_token = get_or_create_csrf_token(request, response)
    return CSRFTokenResponse(csrf_token=csrf_token)


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
    if not user:
        log_event(
            logger,
            "auth.login.failed",
            email=normalized_email,
            reason="email_not_found",
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Correo no registrado",
        )

    if not verify_password(form_data.password, user.hashed_password):
        log_event(
            logger,
            "auth.login.failed",
            email=normalized_email,
            user_id=user.id,
            reason="invalid_password",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta",
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
    clear_csrf_cookie(response)
    log_event(logger, "auth.logout")
    return {"message": "Session closed"}


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limit("change-password", limit=8, window_seconds=900)),
    session: Session = Depends(get_session),
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="La confirmación de contraseña no coincide.")

    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="La contraseña actual es incorrecta.")

    if verify_password(payload.new_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La nueva contraseña no puede ser igual a la actual.")

    current_user.hashed_password = get_password_hash(payload.new_password)
    session.add(current_user)
    session.commit()
    log_event(
        logger,
        "auth.password.changed",
        user_id=current_user.id,
        email=current_user.email,
    )
    return MessageResponse(message="La contraseña se actualizó correctamente.")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    email_service: EmailService = Depends(get_email_service),
    _: None = Depends(rate_limit("forgot-password", limit=5, window_seconds=900)),
    session: Session = Depends(get_session),
):
    normalized_email = normalize_email(str(payload.email))
    statement = select(User).where(func.lower(User.email) == normalized_email)
    user = session.exec(statement).first()

    generic_message = "Si el correo existe, enviaremos un enlace para restablecer la contraseña."
    if not user:
        log_event(
            logger,
            "auth.password_reset.requested",
            email=normalized_email,
            result="email_not_found",
        )
        return MessageResponse(message=generic_message)

    raw_token = generate_password_reset_token()
    create_password_reset_record(
        session,
        user=user,
        raw_token=raw_token,
        requested_ip=request.client.host if request.client else None,
        requested_user_agent=request.headers.get("user-agent"),
    )

    try:
        email_service.send_password_reset_email(
            to_email=user.email,
            to_name=user.name,
            token=raw_token,
        )
    except EmailServiceError as exc:
        session.rollback()
        log_event(
            logger,
            "auth.password_reset.email_failed",
            user_id=user.id,
            email=user.email,
            error=str(exc),
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    session.commit()
    log_event(
        logger,
        "auth.password_reset.requested",
        user_id=user.id,
        email=user.email,
        result="email_sent",
    )
    return MessageResponse(message=generic_message)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    _: None = Depends(rate_limit("reset-password", limit=10, window_seconds=900)),
    session: Session = Depends(get_session),
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="La confirmación de contraseña no coincide.")

    reset_record = find_valid_password_reset_token(session, raw_token=payload.token)
    if not reset_record:
        raise HTTPException(status_code=400, detail="El enlace de recuperación es inválido o ya venció.")

    user = session.get(User, reset_record.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="El enlace de recuperación es inválido o ya venció.")

    if verify_password(payload.new_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="La nueva contraseña no puede ser igual a la actual.")

    now = datetime.now(timezone.utc)
    user.hashed_password = get_password_hash(payload.new_password)
    invalidate_user_password_reset_tokens(session, user_id=user.id, used_at=now)
    session.add(user)
    session.commit()
    log_event(
        logger,
        "auth.password_reset.completed",
        user_id=user.id,
        email=user.email,
    )
    return MessageResponse(message="La contraseña se restableció correctamente.")


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
