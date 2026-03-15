from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import User

from .conftest import auth_headers, csrf_headers


API_PREFIX = "/api"
PLAN = "planifiweb_pro"


def _register(client: TestClient, name: str, email: str, password: str) -> str:
    response = client.post(
        f"{API_PREFIX}/auth/register",
        headers=csrf_headers(client),
        json={
            "name": name,
            "email": email,
            "password": password,
            "accept_terms": True,
            "accept_privacy": True,
        },
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_admin_can_approve_payment_and_activate_subscription(client: TestClient, test_engine):
    user_token = _register(client, "Buyer", "buyer@gmail.com", "StrongPass123")
    admin_token = _register(client, "Admin", "admin@gmail.com", "StrongPass123")

    with Session(test_engine) as session:
        admin_user = session.exec(select(User).where(User.email == "admin@gmail.com")).first()
        assert admin_user is not None
        admin_user.is_admin = True
        admin_user.subscription_status = "active"
        admin_user.active_plan = PLAN
        session.add(admin_user)
        session.commit()

    upload_response = client.post(
        f"{API_PREFIX}/payments/upload-proof",
        headers=auth_headers(user_token),
        data={"plan": PLAN},
        files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\nfake-image", "image/png")},
    )
    assert upload_response.status_code == 200
    payment_id = upload_response.json()["payment_id"]

    pending_response = client.get(
        f"{API_PREFIX}/admin/payments?status=pending",
        headers=auth_headers(admin_token),
    )
    assert pending_response.status_code == 200
    pending_payload = pending_response.json()
    pending_payments = pending_payload["items"]
    assert any(item["id"] == payment_id for item in pending_payments)
    assert any(item["has_receipt"] is True for item in pending_payments)

    review_response = client.patch(
        f"{API_PREFIX}/admin/payments/{payment_id}",
        headers=auth_headers(admin_token),
        json={"status": "approved"},
    )
    assert review_response.status_code == 200
    assert review_response.json()["status"] == "approved"
    assert review_response.json()["precheck"]["ai_verification_status"] == "likely_valid"

    with Session(test_engine) as session:
        user = session.exec(select(User).where(User.email == "buyer@gmail.com")).first()
        assert user is not None
        assert user.subscription_status == "active"
        assert user.active_plan == PLAN

    session_response = client.get(f"{API_PREFIX}/auth/me", headers=auth_headers(user_token))
    assert session_response.status_code == 200
    assert session_response.json()["daily_limit"] == 60
    assert session_response.json()["exports_enabled"] is True


def test_ai_usage_limit_for_pending_review_user(client: TestClient):
    token = _register(client, "Pending User", "pending@gmail.com", "StrongPass123")

    client.post(
        f"{API_PREFIX}/payments/upload-proof",
        headers=auth_headers(token),
        data={"plan": PLAN},
        files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\nfake-image", "image/png")},
    )

    for _ in range(3):
        response = client.post(
            f"{API_PREFIX}/ai/generate",
            headers=auth_headers(token),
            json={
                "module": "diagnostico",
                "operation": "generate_text",
                "prompt": "Genera una breve situacion de aprendizaje para primaria en Peru.",
                "system": "Eres un asistente pedagogico.",
            },
        )
        assert response.status_code == 200

    limited_response = client.post(
        f"{API_PREFIX}/ai/generate",
        headers=auth_headers(token),
        json={
            "module": "diagnostico",
            "operation": "generate_text",
            "prompt": "Una cuarta generacion para validar el limite diario del plan pendiente.",
            "system": "Eres un asistente pedagogico.",
        },
    )
    assert limited_response.status_code == 429

    usage_response = client.get(f"{API_PREFIX}/usage/me", headers=auth_headers(token))
    assert usage_response.status_code == 200
    usage_body = usage_response.json()
    assert usage_body["daily_limit"] == 3
    assert usage_body["daily_used"] == 3
    assert usage_body["remaining"] == 0


def test_admin_can_mark_approved_payment_as_fraudulent_and_suspend_user(
    client: TestClient,
    test_engine,
):
    user_token = _register(client, "Fraud Buyer", "fraudbuyer@gmail.com", "StrongPass123")
    admin_token = _register(client, "Fraud Admin", "fraudadmin@gmail.com", "StrongPass123")

    with Session(test_engine) as session:
        admin_user = session.exec(select(User).where(User.email == "fraudadmin@gmail.com")).first()
        assert admin_user is not None
        admin_user.is_admin = True
        admin_user.subscription_status = "active"
        admin_user.active_plan = PLAN
        session.add(admin_user)
        session.commit()

    upload_response = client.post(
        f"{API_PREFIX}/payments/upload-proof",
        headers=auth_headers(user_token),
        data={"plan": PLAN},
        files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\nfraud-image", "image/png")},
    )
    assert upload_response.status_code == 200
    payment_id = upload_response.json()["payment_id"]

    approve_response = client.patch(
        f"{API_PREFIX}/admin/payments/{payment_id}",
        headers=auth_headers(admin_token),
        json={"status": "approved"},
    )
    assert approve_response.status_code == 200

    fraud_response = client.patch(
        f"{API_PREFIX}/admin/payments/{payment_id}",
        headers=auth_headers(admin_token),
        json={"status": "fraudulent", "reason": "Comprobante reutilizado."},
    )
    assert fraud_response.status_code == 200
    fraud_body = fraud_response.json()
    assert fraud_body["status"] == "fraudulent"
    assert fraud_body["fraud_reason"] == "Comprobante reutilizado."

    with Session(test_engine) as session:
        user = session.exec(select(User).where(User.email == "fraudbuyer@gmail.com")).first()
        assert user is not None
        assert user.subscription_status == "suspended"
        assert user.active_plan is None


def test_admin_payments_endpoint_requires_admin(client: TestClient):
    user_token = _register(client, "Regular User", "regularuser@gmail.com", "StrongPass123")

    response = client.get(
        f"{API_PREFIX}/admin/payments",
        headers=auth_headers(user_token),
    )
    assert response.status_code == 403
