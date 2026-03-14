import pytest
from fastapi import HTTPException
from sqlmodel import SQLModel, Session, create_engine

from app.config import get_settings
from app.rate_limit import _apply_database_rate_limit, get_rate_limit_backend
from app.storage import DatabaseStorageService, get_storage_backend


def test_storage_backend_uses_database_in_production_without_s3(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("S3_BUCKET", raising=False)
    monkeypatch.delenv("S3_ACCESS_KEY_ID", raising=False)
    monkeypatch.delenv("S3_SECRET_ACCESS_KEY", raising=False)
    get_settings.cache_clear()

    try:
        assert get_storage_backend() == "database"
    finally:
        get_settings.cache_clear()


def test_rate_limit_backend_uses_database_in_production_without_redis(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("REDIS_URL", raising=False)
    get_settings.cache_clear()

    try:
        assert get_rate_limit_backend() == "database"
    finally:
        get_settings.cache_clear()


def test_trusted_hosts_include_seenode_wildcards(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("TRUSTED_HOSTS", "planifiweb-api.seenode.com")
    get_settings.cache_clear()

    try:
        trusted_hosts = get_settings().trusted_host_list
        assert "*.apps.run-on-seenode.com" in trusted_hosts
        assert "*.seenode.com" in trusted_hosts
    finally:
        get_settings.cache_clear()


def test_database_storage_service_roundtrip(tmp_path):
    db_file = tmp_path / "storage.db"
    engine = create_engine(
        f"sqlite:///{db_file.as_posix()}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        service = DatabaseStorageService(session)
        stored = service.upload_receipt(
            content=b"fake-receipt-content",
            filename="receipt.png",
            content_type="image/png",
            user_id=7,
        )
        session.commit()

        access = service.resolve_receipt(stored.key, stored.url)
        assert access.kind == "inline"
        assert access.content == b"fake-receipt-content"


def test_database_rate_limit_blocks_after_limit(monkeypatch: pytest.MonkeyPatch, tmp_path):
    from app import rate_limit as rate_limit_module

    db_file = tmp_path / "ratelimit.db"
    engine = create_engine(
        f"sqlite:///{db_file.as_posix()}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    monkeypatch.setattr(rate_limit_module, "engine", engine)

    _apply_database_rate_limit("login", "127.0.0.1", limit=2, window_seconds=60)
    _apply_database_rate_limit("login", "127.0.0.1", limit=2, window_seconds=60)

    with pytest.raises(HTTPException) as exc:
        _apply_database_rate_limit("login", "127.0.0.1", limit=2, window_seconds=60)

    assert exc.value.status_code == 429
