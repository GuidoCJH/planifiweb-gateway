from fastapi.testclient import TestClient

from app.main import app
from app.receipt_verifier import ReceiptPrecheckResult, ReceiptVerifier, get_receipt_verifier

from .conftest import auth_headers, csrf_headers


API_PREFIX = "/api"
PLAN_START = "planifiweb_start"
PLAN_PRO = "planifiweb_pro"
PLAN_INSTITUTIONAL = "planifiweb_institucional"


def _register_and_get_token(client: TestClient, email: str) -> str:
    response = client.post(
        f"{API_PREFIX}/auth/register",
        headers=csrf_headers(client),
        json={
            "name": "Payment User",
            "email": email,
            "password": "StrongPass123",
            "accept_terms": True,
            "accept_privacy": True,
        },
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_upload_proof_and_history(client: TestClient):
    token = _register_and_get_token(client, "payer@gmail.com")

    upload_response = client.post(
        f"{API_PREFIX}/payments/upload-proof",
        headers=auth_headers(token),
        data={"plan": PLAN_PRO},
        files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\nfake-image", "image/png")},
    )
    assert upload_response.status_code == 200
    upload_body = upload_response.json()
    assert upload_body["status"] == "pending"
    assert upload_body["subscription_status"] == "pending_review"
    assert upload_body["requires_manual_review"] is True
    assert upload_body["precheck"]["ai_verification_status"] == "likely_valid"
    assert upload_body["precheck"]["ai_confidence"] == 91
    assert isinstance(upload_body["payment_id"], int)

    history_response = client.get(f"{API_PREFIX}/payments/history", headers=auth_headers(token))
    assert history_response.status_code == 200
    history = history_response.json()
    assert len(history) == 1
    assert history[0]["payment_method"] == "yape"
    assert history[0]["plan"] == PLAN_PRO
    assert history[0]["product_code"] == "planifiweb"
    assert history[0]["has_receipt"] is True
    assert history[0]["precheck"]["ai_verification_status"] == "likely_valid"
    assert history[0]["precheck"]["ai_duplicate_hash_match"] is False
    assert history[0]["precheck"]["ai_extracted_destination_name_masked"] == "Guido Jar*"
    assert history[0]["precheck"]["ai_extracted_phone_last3"] == "929"

    session_response = client.get(f"{API_PREFIX}/auth/me", headers=auth_headers(token))
    assert session_response.status_code == 200
    assert session_response.json()["subscription_status"] == "pending_review"
    assert session_response.json()["daily_limit"] == 3


def test_upload_rejects_invalid_content_type(client: TestClient):
    token = _register_and_get_token(client, "invalid-file@gmail.com")

    response = client.post(
        f"{API_PREFIX}/payments/upload-proof",
        headers=auth_headers(token),
        data={"plan": PLAN_PRO},
        files={"file": ("receipt.txt", b"plain-text", "text/plain")},
    )
    assert response.status_code == 400


def test_upload_ignores_client_supplied_amount_and_method(client: TestClient):
    token = _register_and_get_token(client, "wrong-method@gmail.com")

    response = client.post(
        f"{API_PREFIX}/payments/upload-proof",
        headers=auth_headers(token),
        data={"plan": PLAN_PRO, "method": "plin"},
        files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\nfake-image", "image/png")},
    )
    assert response.status_code == 200
    history_response = client.get(f"{API_PREFIX}/payments/history", headers=auth_headers(token))
    assert history_response.status_code == 200
    history = history_response.json()
    assert history[0]["amount"] == 19
    assert history[0]["payment_method"] == "yape"


def test_upload_marks_duplicate_hash_as_likely_invalid(client: TestClient):
    token = _register_and_get_token(client, "dup-hash@gmail.com")

    for _ in range(2):
        response = client.post(
            f"{API_PREFIX}/payments/upload-proof",
            headers=auth_headers(token),
            data={"plan": PLAN_PRO},
            files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\nsame-image", "image/png")},
        )
        assert response.status_code == 200

    second_payload = response.json()
    assert second_payload["precheck"]["ai_verification_status"] == "likely_invalid"
    assert second_payload["precheck"]["ai_duplicate_hash_match"] is True


def test_upload_can_return_unavailable_if_precheck_service_fails(client: TestClient):
    class UnavailableReceiptVerifier(ReceiptVerifier):
        async def verify_receipt(self, **_: object) -> ReceiptPrecheckResult:
            return ReceiptPrecheckResult(
                ai_verification_status="unavailable",
                ai_confidence=0,
                ai_summary="Proveedor de vision no disponible.",
            )

    app.dependency_overrides[get_receipt_verifier] = lambda: UnavailableReceiptVerifier()
    try:
        token = _register_and_get_token(client, "unavailable@gmail.com")
        response = client.post(
            f"{API_PREFIX}/payments/upload-proof",
            headers=auth_headers(token),
            data={"plan": PLAN_PRO},
            files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\nno-vision", "image/png")},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["precheck"]["ai_verification_status"] == "unavailable"
        assert payload["precheck"]["ai_confidence"] == 0
    finally:
        app.dependency_overrides.pop(get_receipt_verifier, None)


def test_upload_marks_amount_mismatch_as_likely_invalid(client: TestClient):
    class MismatchReceiptVerifier(ReceiptVerifier):
        async def verify_receipt(self, **_: object) -> ReceiptPrecheckResult:
            return ReceiptPrecheckResult(
                ai_verification_status="likely_valid",
                ai_confidence=80,
                ai_summary="La imagen parece valida, pero el monto detectado no coincide.",
                ai_extracted_amount=17,
                ai_extracted_method="yape",
                ai_extracted_operation_code="OP-MISMATCH",
            )

    app.dependency_overrides[get_receipt_verifier] = lambda: MismatchReceiptVerifier()
    try:
        token = _register_and_get_token(client, "mismatch@gmail.com")
        response = client.post(
            f"{API_PREFIX}/payments/upload-proof",
            headers=auth_headers(token),
            data={"plan": PLAN_PRO},
            files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\nmismatch", "image/png")},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["precheck"]["ai_verification_status"] == "likely_invalid"
    finally:
        app.dependency_overrides.pop(get_receipt_verifier, None)


def test_receipt_access_requires_owner_or_admin(client: TestClient):
    owner_token = _register_and_get_token(client, "owner@gmail.com")
    stranger_token = _register_and_get_token(client, "stranger@gmail.com")

    upload_response = client.post(
        f"{API_PREFIX}/payments/upload-proof",
        headers=auth_headers(owner_token),
        data={"plan": PLAN_PRO},
        files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\nowner-image", "image/png")},
    )
    assert upload_response.status_code == 200
    payment_id = upload_response.json()["payment_id"]

    receipt_response = client.get(
        f"{API_PREFIX}/payments/{payment_id}/receipt",
        headers=auth_headers(stranger_token),
    )
    assert receipt_response.status_code == 403


def test_cookie_authenticated_post_requires_valid_origin(client: TestClient):
    register_response = client.post(
        f"{API_PREFIX}/auth/register",
        headers=csrf_headers(client),
        json={
            "name": "Cookie User",
            "email": "cookieuser@gmail.com",
            "password": "StrongPass123",
            "accept_terms": True,
            "accept_privacy": True,
        },
    )
    assert register_response.status_code == 200

    response = client.post(
        f"{API_PREFIX}/payments/upload-proof",
        data={"plan": PLAN_PRO},
        files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\ncookie-image", "image/png")},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid request origin."


def test_cookie_authenticated_post_requires_valid_csrf_token(client: TestClient):
    register_response = client.post(
        f"{API_PREFIX}/auth/register",
        headers=csrf_headers(client),
        json={
            "name": "Cookie Csrf User",
            "email": "cookiecsrf@gmail.com",
            "password": "StrongPass123",
            "accept_terms": True,
            "accept_privacy": True,
        },
    )
    assert register_response.status_code == 200

    response = client.post(
        f"{API_PREFIX}/payments/upload-proof",
        headers={"Origin": "http://localhost:3000"},
        data={"plan": PLAN_PRO},
        files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\ncookie-csrf-image", "image/png")},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid CSRF token."


def test_upload_uses_catalog_price_per_plan(client: TestClient):
    token = _register_and_get_token(client, "plan-pricing@gmail.com")

    expected_prices = {
        PLAN_START: 9,
        PLAN_PRO: 19,
        PLAN_INSTITUTIONAL: 39,
    }

    for plan_code, expected_price in expected_prices.items():
        response = client.post(
            f"{API_PREFIX}/payments/upload-proof",
            headers=auth_headers(token),
            data={"plan": plan_code},
            files={
                "file": (
                    f"receipt-{plan_code}.png",
                    f"\x89PNG\r\n\x1a\n{plan_code}".encode("utf-8"),
                    "image/png",
                )
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["precheck"]["ai_verification_status"] == "likely_valid"

    history_response = client.get(f"{API_PREFIX}/payments/history", headers=auth_headers(token))
    assert history_response.status_code == 200
    history = history_response.json()
    by_plan = {item["plan"]: item for item in history}
    for plan_code, expected_price in expected_prices.items():
        assert by_plan[plan_code]["amount"] == expected_price


def test_upload_marks_yape_destination_mismatch_as_likely_invalid(client: TestClient):
    class DestinationMismatchVerifier(ReceiptVerifier):
        async def verify_receipt(self, **_: object) -> ReceiptPrecheckResult:
            return ReceiptPrecheckResult(
                ai_verification_status="likely_valid",
                ai_confidence=88,
                ai_summary="Comprobante legible.",
                ai_extracted_amount=19,
                ai_extracted_method="yape",
                ai_extracted_operation_code="OP-YAPE-MISMATCH-DEST",
                ai_extracted_destination_name_masked="Otro Dest*",
                ai_extracted_phone_last3="929",
            )

    app.dependency_overrides[get_receipt_verifier] = lambda: DestinationMismatchVerifier()
    try:
        token = _register_and_get_token(client, "dest-mismatch@gmail.com")
        response = client.post(
            f"{API_PREFIX}/payments/upload-proof",
            headers=auth_headers(token),
            data={"plan": PLAN_PRO},
            files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\ndest-mismatch", "image/png")},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["precheck"]["ai_verification_status"] == "likely_invalid"
    finally:
        app.dependency_overrides.pop(get_receipt_verifier, None)


def test_upload_marks_yape_phone_last3_mismatch_as_likely_invalid(client: TestClient):
    class PhoneMismatchVerifier(ReceiptVerifier):
        async def verify_receipt(self, **_: object) -> ReceiptPrecheckResult:
            return ReceiptPrecheckResult(
                ai_verification_status="likely_valid",
                ai_confidence=88,
                ai_summary="Comprobante legible.",
                ai_extracted_amount=19,
                ai_extracted_method="yape",
                ai_extracted_operation_code="OP-YAPE-MISMATCH-PHONE",
                ai_extracted_destination_name_masked="Guido Jar*",
                ai_extracted_phone_last3="111",
            )

    app.dependency_overrides[get_receipt_verifier] = lambda: PhoneMismatchVerifier()
    try:
        token = _register_and_get_token(client, "phone-mismatch@gmail.com")
        response = client.post(
            f"{API_PREFIX}/payments/upload-proof",
            headers=auth_headers(token),
            data={"plan": PLAN_PRO},
            files={"file": ("receipt.png", b"\x89PNG\r\n\x1a\nphone-mismatch", "image/png")},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["precheck"]["ai_verification_status"] == "likely_invalid"
    finally:
        app.dependency_overrides.pop(get_receipt_verifier, None)
