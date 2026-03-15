import importlib
import os
from pathlib import Path

from fastapi.testclient import TestClient


def test_csrf_endpoint_sets_cookie_and_returns_token(client: TestClient):
    response = client.get("/api/auth/csrf")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["csrf_token"], str)
    assert payload["csrf_token"]
    set_cookie = response.headers.get("set-cookie", "")
    assert "planifiweb_csrf=" in set_cookie


def test_health_includes_security_headers(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert response.headers["permissions-policy"] == "camera=(), microphone=(), geolocation=()"
    assert response.headers["cross-origin-opener-policy"] == "same-origin"
    assert response.headers["cross-origin-resource-policy"] == "same-origin"


def test_production_docs_are_disabled_when_flag_is_false(tmp_path: Path):
    tracked_keys = {
        "APP_ENV": os.environ.get("APP_ENV"),
        "API_DOCS_ENABLED": os.environ.get("API_DOCS_ENABLED"),
        "DATABASE_URL": os.environ.get("DATABASE_URL"),
        "SECRET_KEY": os.environ.get("SECRET_KEY"),
        "CORS_ORIGINS": os.environ.get("CORS_ORIGINS"),
        "TRUSTED_HOSTS": os.environ.get("TRUSTED_HOSTS"),
    }

    db_file = tmp_path / "prod-security.db"
    os.environ["APP_ENV"] = "production"
    os.environ["API_DOCS_ENABLED"] = "false"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_file.as_posix()}"
    os.environ["SECRET_KEY"] = "prod-security-secret"
    os.environ["CORS_ORIGINS"] = "https://planifiweb-gateway.vercel.app"
    os.environ["TRUSTED_HOSTS"] = "testserver,localhost,127.0.0.1"

    from app.config import get_settings
    import app.main as main_module

    try:
        get_settings.cache_clear()
        main_module = importlib.reload(main_module)

        with TestClient(main_module.app) as client:
            assert client.get("/docs").status_code == 404
            assert client.get("/redoc").status_code == 404
            assert client.get("/openapi.json").status_code == 404
    finally:
        for key, value in tracked_keys.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

        get_settings.cache_clear()
        importlib.reload(main_module)
