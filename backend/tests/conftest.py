import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("TRUSTED_HOSTS", "testserver,localhost,127.0.0.1")
os.environ.setdefault("AI_PROVIDER", "mock")


@pytest.fixture
def test_engine(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_file = tmp_path / "test.db"
    db_url = f"sqlite:///{db_file.as_posix()}"
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", db_url)
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")
    monkeypatch.setenv("TRUSTED_HOSTS", "testserver,localhost,127.0.0.1")
    monkeypatch.setenv("AI_PROVIDER", "mock")

    from app.config import get_settings

    get_settings.cache_clear()
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture
def client(test_engine):
    from app.db import get_session
    from app.main import app
    from app.rate_limit import _request_log
    from app.receipt_verifier import ReceiptPrecheckResult, ReceiptVerifier, get_receipt_verifier
    from app.storage import ReceiptAccess, StorageService, StoredFile, get_storage_service

    class FakeStorageService(StorageService):
        def upload_receipt(
            self,
            content: bytes,
            filename: str,
            content_type: str,
            user_id: int,
        ) -> StoredFile:
            return StoredFile(
                key=f"receipts/{user_id}/{filename}",
                url=f"https://cdn.example.com/receipts/{user_id}/{filename}",
            )

        def resolve_receipt(self, key: str, url: str) -> ReceiptAccess:
            return ReceiptAccess(kind="redirect", location=url)

    class FakeReceiptVerifier(ReceiptVerifier):
        async def verify_receipt(
            self,
            *,
            content: bytes,
            content_type: str,
            plan: str,
            expected_amount: float,
            expected_method: str,
        ) -> ReceiptPrecheckResult:
            return ReceiptPrecheckResult(
                ai_verification_status="likely_valid",
                ai_confidence=91,
                ai_summary="La imagen parece un comprobante legible y consistente.",
                ai_extracted_amount=expected_amount,
                ai_extracted_method=expected_method,
                ai_extracted_operation_code=f"OP-{len(content)}",
                ai_extracted_destination="Yape",
                ai_extracted_destination_name_masked="Guido Jar*",
                ai_extracted_phone_last3="929",
                ai_extracted_security_code="220",
            )

    def override_get_session():
        with Session(test_engine) as session:
            yield session

    def override_storage_service():
        return FakeStorageService()

    def override_receipt_verifier():
        return FakeReceiptVerifier()

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_storage_service] = override_storage_service
    app.dependency_overrides[get_receipt_verifier] = override_receipt_verifier
    _request_log.clear()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    _request_log.clear()



def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def fetch_csrf_token(client: TestClient) -> str:
    response = client.get("/api/auth/csrf")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload.get("csrf_token"), str)
    return payload["csrf_token"]


def csrf_headers(client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": fetch_csrf_token(client)}
