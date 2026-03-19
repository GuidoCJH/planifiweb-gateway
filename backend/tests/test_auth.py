from fastapi.testclient import TestClient
from urllib.parse import parse_qs, urlparse

from .conftest import auth_headers, csrf_headers


API_PREFIX = "/api"


def test_register_login_and_me(client: TestClient):
    payload = {
        "name": "Test User",
        "email": "test@gmail.com",
        "password": "StrongPass123",
        "accept_terms": True,
        "accept_privacy": True,
    }
    register_response = client.post(
        f"{API_PREFIX}/auth/register",
        json=payload,
        headers=csrf_headers(client),
    )
    assert register_response.status_code == 200
    register_body = register_response.json()
    assert register_body["token_type"] == "bearer"
    assert "access_token" in register_body
    assert "planifiweb_session=" in register_response.headers.get("set-cookie", "")

    token = register_body["access_token"]
    me_response = client.get(f"{API_PREFIX}/auth/me", headers=auth_headers(token))
    assert me_response.status_code == 200
    me_body = me_response.json()
    assert me_body["user"]["email"] == payload["email"]
    assert "hashed_password" not in me_body["user"]
    assert me_body["subscription_status"] == "awaiting_payment"
    assert me_body["can_access_app"] is False
    assert me_body["daily_limit"] == 0
    assert me_body["legal"]["acceptance_required"] is False

    login_response = client.post(
        f"{API_PREFIX}/auth/login",
        data={"username": payload["email"], "password": payload["password"]},
        headers=csrf_headers(client),
    )
    assert login_response.status_code == 200
    assert login_response.json()["token_type"] == "bearer"


def test_login_returns_not_found_for_unknown_email(client: TestClient):
    response = client.post(
        f"{API_PREFIX}/auth/login",
        data={"username": "missing@gmail.com", "password": "StrongPass123"},
        headers=csrf_headers(client),
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Correo no registrado"


def test_login_returns_specific_message_for_wrong_password(client: TestClient):
    payload = {
        "name": "Test User",
        "email": "wrongpass@gmail.com",
        "password": "StrongPass123",
        "accept_terms": True,
        "accept_privacy": True,
    }
    client.post(
        f"{API_PREFIX}/auth/register",
        json=payload,
        headers=csrf_headers(client),
    )

    response = client.post(
        f"{API_PREFIX}/auth/login",
        data={"username": payload["email"], "password": "BadPass123"},
        headers=csrf_headers(client),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Contraseña incorrecta"


def test_register_rejects_when_legal_docs_not_accepted(client: TestClient):
    payload = {
        "name": "Test User",
        "email": "legal-missing@gmail.com",
        "password": "StrongPass123",
        "accept_terms": False,
        "accept_privacy": True,
    }
    response = client.post(
        f"{API_PREFIX}/auth/register",
        json=payload,
        headers=csrf_headers(client),
    )
    assert response.status_code == 400


def test_register_accepts_non_gmail_email_by_default(client: TestClient):
    payload = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "StrongPass123",
        "accept_terms": True,
        "accept_privacy": True,
    }
    response = client.post(
        f"{API_PREFIX}/auth/register",
        json=payload,
        headers=csrf_headers(client),
    )
    assert response.status_code == 200


def test_register_rejects_email_outside_allowlist_when_configured(
    client: TestClient,
    monkeypatch,
):
    from app.config import get_settings

    monkeypatch.setenv("ALLOWED_EMAIL_DOMAINS", "gmail.com,colegio.edu.pe")
    get_settings.cache_clear()
    try:
        payload = {
            "name": "Test User",
            "email": "test@example.com",
            "password": "StrongPass123",
            "accept_terms": True,
            "accept_privacy": True,
        }
        response = client.post(
            f"{API_PREFIX}/auth/register",
            json=payload,
            headers=csrf_headers(client),
        )
        assert response.status_code == 422
    finally:
        monkeypatch.delenv("ALLOWED_EMAIL_DOMAINS", raising=False)
        get_settings.cache_clear()


def test_auth_me_rejects_invalid_token(client: TestClient):
    response = client.get(f"{API_PREFIX}/auth/me", headers=auth_headers("invalid-token"))
    assert response.status_code == 401


def test_register_rejects_missing_csrf_token(client: TestClient):
    payload = {
        "name": "No Csrf",
        "email": "nocsrf@gmail.com",
        "password": "StrongPass123",
        "accept_terms": True,
        "accept_privacy": True,
    }
    response = client.post(f"{API_PREFIX}/auth/register", json=payload)
    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid CSRF token."


def test_change_password_requires_correct_current_password(client: TestClient):
    payload = {
        "name": "Password User",
        "email": "password-user@gmail.com",
        "password": "StrongPass123",
        "accept_terms": True,
        "accept_privacy": True,
    }
    register_response = client.post(
        f"{API_PREFIX}/auth/register",
        json=payload,
        headers=csrf_headers(client),
    )
    token = register_response.json()["access_token"]

    response = client.post(
        f"{API_PREFIX}/auth/change-password",
        json={
            "current_password": "WrongPass123",
            "new_password": "NewStrongPass123",
            "confirm_password": "NewStrongPass123",
        },
        headers={**auth_headers(token), **csrf_headers(client)},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "La contraseña actual es incorrecta."


def test_change_password_updates_login_credentials(client: TestClient):
    payload = {
        "name": "Password User",
        "email": "password-change@gmail.com",
        "password": "StrongPass123",
        "accept_terms": True,
        "accept_privacy": True,
    }
    register_response = client.post(
        f"{API_PREFIX}/auth/register",
        json=payload,
        headers=csrf_headers(client),
    )
    token = register_response.json()["access_token"]

    response = client.post(
        f"{API_PREFIX}/auth/change-password",
        json={
            "current_password": payload["password"],
            "new_password": "NewStrongPass123",
            "confirm_password": "NewStrongPass123",
        },
        headers={**auth_headers(token), **csrf_headers(client)},
    )
    assert response.status_code == 200

    old_login = client.post(
        f"{API_PREFIX}/auth/login",
        data={"username": payload["email"], "password": payload["password"]},
        headers=csrf_headers(client),
    )
    assert old_login.status_code == 401

    new_login = client.post(
        f"{API_PREFIX}/auth/login",
        data={"username": payload["email"], "password": "NewStrongPass123"},
        headers=csrf_headers(client),
    )
    assert new_login.status_code == 200


def test_password_reset_flow_sends_email_and_resets_password(client: TestClient):
    from app.email_service import get_email_service
    from app.main import app

    class FakeEmailService:
        def __init__(self):
            self.sent_urls = []

        def send_password_reset_email(self, *, to_email: str, to_name: str, token: str) -> None:
            self.sent_urls.append(
                f"https://planifiweb.guidojh.pro/restablecer-contrasena?token={token}"
            )

    fake_service = FakeEmailService()
    app.dependency_overrides[get_email_service] = lambda: fake_service
    try:
        payload = {
            "name": "Reset User",
            "email": "reset-user@gmail.com",
            "password": "StrongPass123",
            "accept_terms": True,
            "accept_privacy": True,
        }
        client.post(
            f"{API_PREFIX}/auth/register",
            json=payload,
            headers=csrf_headers(client),
        )

        forgot_response = client.post(
            f"{API_PREFIX}/auth/forgot-password",
            json={"email": payload["email"]},
            headers={**csrf_headers(client), "Origin": "http://localhost:3000"},
        )
        assert forgot_response.status_code == 200
        assert fake_service.sent_urls

        parsed = urlparse(fake_service.sent_urls[0])
        token = parse_qs(parsed.query)["token"][0]

        reset_response = client.post(
            f"{API_PREFIX}/auth/reset-password",
            json={
                "token": token,
                "new_password": "ResetStrongPass123",
                "confirm_password": "ResetStrongPass123",
            },
            headers={**csrf_headers(client), "Origin": "http://localhost:3000"},
        )
        assert reset_response.status_code == 200

        reused_response = client.post(
            f"{API_PREFIX}/auth/reset-password",
            json={
                "token": token,
                "new_password": "AnotherPass123",
                "confirm_password": "AnotherPass123",
            },
            headers={**csrf_headers(client), "Origin": "http://localhost:3000"},
        )
        assert reused_response.status_code == 400

        login_response = client.post(
            f"{API_PREFIX}/auth/login",
            data={"username": payload["email"], "password": "ResetStrongPass123"},
            headers=csrf_headers(client),
        )
        assert login_response.status_code == 200
    finally:
        app.dependency_overrides.pop(get_email_service, None)
