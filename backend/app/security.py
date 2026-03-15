import secrets
from urllib.parse import urlsplit

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.responses import Response

from app.config import Settings

STATE_CHANGING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
ORIGIN_CHECK_EXEMPT_PATHS = {
    "/api/auth/login",
    "/api/auth/register",
}
CSRF_ISSUER_PATHS = {
    "/api/auth/csrf",
}
COOKIELESS_CSRF_PATHS = {
    "/api/auth/login",
    "/api/auth/register",
}


def apply_security_headers(response: Response, settings: Settings) -> None:
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")

    if settings.is_production:
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload",
        )


def origin_allowed(url: str, settings: Settings) -> bool:
    parsed = urlsplit(url)
    if not parsed.scheme or not parsed.netloc:
        return False
    origin = f"{parsed.scheme}://{parsed.netloc}"
    return origin in settings.allowed_origin_hosts


def should_enforce_origin_check(request: Request, settings: Settings) -> bool:
    if request.method.upper() not in STATE_CHANGING_METHODS:
        return False
    if not request.url.path.startswith("/api/"):
        return False
    if request.url.path in ORIGIN_CHECK_EXEMPT_PATHS:
        return False

    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        return False

    return request.cookies.get(settings.session_cookie_name) is not None


def should_enforce_csrf(request: Request, settings: Settings) -> bool:
    if request.method.upper() not in STATE_CHANGING_METHODS:
        return False
    if not request.url.path.startswith("/api/"):
        return False
    if request.url.path in CSRF_ISSUER_PATHS:
        return False

    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        return False

    if request.url.path in COOKIELESS_CSRF_PATHS:
        return True

    return request.cookies.get(settings.session_cookie_name) is not None


def csrf_token_valid(request: Request, settings: Settings) -> bool:
    cookie_token = request.cookies.get(settings.csrf_cookie_name)
    header_token = request.headers.get(settings.csrf_header_name)

    if not cookie_token or not header_token:
        return False

    return secrets.compare_digest(cookie_token, header_token)


def invalid_origin_response() -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={"detail": "Invalid request origin."},
    )


def invalid_csrf_response() -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={"detail": "Invalid CSRF token."},
    )
