from datetime import datetime, timedelta, timezone
from fastapi import Depends, Header, HTTPException, Request, Response, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.config import get_settings
from app.db import get_session
from app.models import User

ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire_delta = expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expire_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.effective_secret_key, algorithm=ALGORITHM)


def set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.effective_session_cookie_secure,
        samesite=settings.effective_session_cookie_samesite,
        max_age=settings.session_cookie_max_age_seconds,
        expires=settings.session_cookie_max_age_seconds,
        path="/",
        domain=settings.effective_session_cookie_domain,
    )


def clear_session_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        domain=settings.effective_session_cookie_domain,
        secure=settings.effective_session_cookie_secure,
        samesite=settings.effective_session_cookie_samesite,
        httponly=True,
    )


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def decode_access_token(token: str) -> str:
    settings = get_settings()
    credentials_exception = _credentials_exception()
    try:
        payload = jwt.decode(token, settings.effective_secret_key, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
        return email
    except JWTError as exc:
        raise credentials_exception from exc


def extract_request_token(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> str:
    if authorization:
        scheme, _, credentials = authorization.partition(" ")
        if scheme.lower() == "bearer" and credentials:
            return credentials

    settings = get_settings()
    cookie_token = request.cookies.get(settings.session_cookie_name)
    if cookie_token:
        return cookie_token

    raise _credentials_exception()


def get_current_user(
    token: str = Depends(extract_request_token),
    session: Session = Depends(get_session),
) -> User:
    email = decode_access_token(token)
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()
    if user is None:
        raise _credentials_exception()
    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
