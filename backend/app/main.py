from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.db import engine, init_db
from app.observability import configure_logging
from app.rate_limit import get_rate_limit_backend
from app.routes import admin, ai, auth, payments, subscription, usage, users
from app.security import (
    apply_security_headers,
    csrf_token_valid,
    invalid_csrf_response,
    invalid_origin_response,
    origin_allowed,
    should_enforce_csrf,
    should_enforce_origin_check,
)
from app.storage import get_storage_backend

settings = get_settings()
configure_logging()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="PLANIFIWEB Platform API",
    lifespan=lifespan,
    docs_url="/docs" if settings.effective_docs_enabled else None,
    redoc_url="/redoc" if settings.effective_docs_enabled else None,
    openapi_url="/openapi.json" if settings.effective_docs_enabled else None,
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_host_list)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Requested-With",
        "X-CSRF-Token",
    ],
)

api_prefix = "/api"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(payments.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(subscription.router, prefix=api_prefix)
app.include_router(usage.router, prefix=api_prefix)
app.include_router(ai.router, prefix=api_prefix)


@app.middleware("http")
async def harden_responses(request: Request, call_next):
    if should_enforce_origin_check(request, settings):
        origin = request.headers.get("origin")
        referer = request.headers.get("referer")
        if not ((origin and origin_allowed(origin, settings)) or (referer and origin_allowed(referer, settings))):
            return invalid_origin_response()
    if should_enforce_csrf(request, settings) and not csrf_token_valid(request, settings):
        return invalid_csrf_response()

    response = await call_next(request)
    apply_security_headers(response, settings)
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.get("/")
def read_root():
    return {"message": "PLANIFIWEB API is running"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.app_env,
        "service": "planifiweb-platform",
    }


@app.get("/ready")
def readiness_check():
    db_ready = False
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        db_ready = True
    except Exception:
        db_ready = False

    status = "ready" if db_ready else "degraded"
    payload = {
        "status": status,
        "database": "ready" if db_ready else "unavailable",
        "rate_limit_backend": get_rate_limit_backend(),
        "receipt_storage_backend": get_storage_backend(),
        "payment_precheck_enabled": settings.payment_precheck_active,
    }
    if db_ready:
        return payload
    return JSONResponse(status_code=503, content=payload)
