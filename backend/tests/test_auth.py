from fastapi.testclient import TestClient

from .conftest import auth_headers


API_PREFIX = "/api"


def test_register_login_and_me(client: TestClient):
    payload = {
        "name": "Test User",
        "email": "test@gmail.com",
        "password": "StrongPass123",
        "accept_terms": True,
        "accept_privacy": True,
    }
    register_response = client.post(f"{API_PREFIX}/auth/register", json=payload)
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
    )
    assert login_response.status_code == 200
    assert login_response.json()["token_type"] == "bearer"


def test_register_rejects_when_legal_docs_not_accepted(client: TestClient):
    payload = {
        "name": "Test User",
        "email": "legal-missing@gmail.com",
        "password": "StrongPass123",
        "accept_terms": False,
        "accept_privacy": True,
    }
    response = client.post(f"{API_PREFIX}/auth/register", json=payload)
    assert response.status_code == 400


def test_register_accepts_non_gmail_email_by_default(client: TestClient):
    payload = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "StrongPass123",
        "accept_terms": True,
        "accept_privacy": True,
    }
    response = client.post(f"{API_PREFIX}/auth/register", json=payload)
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
        response = client.post(f"{API_PREFIX}/auth/register", json=payload)
        assert response.status_code == 422
    finally:
        monkeypatch.delenv("ALLOWED_EMAIL_DOMAINS", raising=False)
        get_settings.cache_clear()


def test_auth_me_rejects_invalid_token(client: TestClient):
    response = client.get(f"{API_PREFIX}/auth/me", headers=auth_headers("invalid-token"))
    assert response.status_code == 401
