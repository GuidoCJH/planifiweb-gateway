from urllib.parse import urlsplit

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.responses import Response

from app.config import Settings

STATE_CHANGING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
CSRF_EXEMPT_PATHS = {
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
    if request.url.path in CSRF_EXEMPT_PATHS:
        return False

    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        return False

    return request.cookies.get(settings.session_cookie_name) is not None


def invalid_origin_response() -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={"detail": "Invalid request origin."},
    )
