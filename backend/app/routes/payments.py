import hashlib
from pathlib import Path
import re
import unicodedata

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlmodel import Session, select

from app.auth import get_current_user
from app.config import get_settings
from app.db import get_session
from app.models import Payment, User
from app.observability import get_logger, log_event
from app.plans import get_payment_plan
from app.rate_limit import rate_limit
from app.receipt_verifier import ReceiptPrecheckResult, ReceiptVerifier, get_receipt_verifier
from app.schemas import PaymentPrecheckResult, PaymentRead, PaymentUploadResponse
from app.storage import StorageService, get_storage_service

router = APIRouter(prefix="/payments", tags=["payments"])
logger = get_logger("planifiweb.payments")


def _validate_payment_file(file: UploadFile, content: bytes) -> None:
    settings = get_settings()
    content_type = (file.content_type or "").lower()
    if content_type not in settings.allowed_receipt_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Only image files are allowed.",
        )
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File cannot be empty.",
        )
    if len(content) > settings.max_receipt_file_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.max_receipt_file_mb}MB limit.",
        )


def _resolve_payment_plan_or_400(plan: str):
    payment_plan = get_payment_plan(plan)
    if payment_plan is None:
        raise HTTPException(status_code=400, detail="Invalid plan")
    return payment_plan


def _payment_to_schema(payment: Payment) -> PaymentRead:
    return PaymentRead(
        id=payment.id or 0,
        user_id=payment.user_id,
        product_code=payment.product_code,
        plan=payment.plan,
        amount=payment.amount,
        currency=payment.currency,
        status=payment.status,
        payment_method=payment.payment_method,
        has_receipt=bool(payment.receipt_key),
        created_at=payment.created_at,
        reviewed_at=payment.reviewed_at,
        reviewed_by=payment.reviewed_by,
        fraud_flagged_at=payment.fraud_flagged_at,
        fraud_flagged_by=payment.fraud_flagged_by,
        fraud_reason=payment.fraud_reason,
        precheck=_build_precheck_schema(payment),
    )


def _build_precheck_schema(payment: Payment) -> PaymentPrecheckResult:
    return PaymentPrecheckResult(
        ai_verification_status=payment.ai_verification_status,
        ai_confidence=payment.ai_confidence,
        ai_summary=payment.ai_summary or "Sin analisis disponible.",
        ai_extracted_amount=payment.ai_extracted_amount,
        ai_extracted_method=payment.ai_extracted_method,
        ai_extracted_operation_code=payment.ai_extracted_operation_code,
        ai_extracted_paid_at=payment.ai_extracted_paid_at,
        ai_extracted_destination=payment.ai_extracted_destination,
        ai_extracted_destination_name_masked=payment.ai_extracted_destination_name_masked,
        ai_extracted_phone_last3=payment.ai_extracted_phone_last3,
        ai_extracted_security_code=payment.ai_extracted_security_code,
        ai_duplicate_hash_match=payment.ai_duplicate_hash_match,
        ai_duplicate_operation_match=payment.ai_duplicate_operation_match,
    )


def _normalize_detected_method(method: str | None) -> str | None:
    if not method:
        return None
    normalized = method.strip().lower()
    if "yape" in normalized:
        return "yape"
    if "plin" in normalized:
        return "plin"
    if normalized in {"bank_transfer", "transfer", "transferencia", "banktransfer"}:
        return "bank_transfer"
    if any(token in normalized for token in {"banco", "deposito"}):
        return "bank_transfer"
    return "other"


def _append_summary(base: str, extra: str) -> str:
    if not base:
        return extra
    if extra in base:
        return base
    return f"{base} {extra}".strip()


def _mark_likely_invalid(result: ReceiptPrecheckResult, summary: str, confidence: int) -> None:
    result.ai_verification_status = "likely_invalid"
    result.ai_confidence = max(result.ai_confidence, confidence)
    result.ai_summary = _append_summary(result.ai_summary, summary)


def _normalize_masked_name(value: str | None) -> str | None:
    if not value:
        return None
    normalized = unicodedata.normalize("NFKD", value)
    normalized = normalized.encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"\s+", " ", normalized).strip().lower()
    normalized = re.sub(r"[^a-z0-9*]+", "", normalized)
    return normalized or None


def _masked_names_match(actual: str | None, expected: str | None) -> bool:
    actual_normalized = _normalize_masked_name(actual)
    expected_normalized = _normalize_masked_name(expected)
    if not actual_normalized or not expected_normalized:
        return False
    if actual_normalized == expected_normalized:
        return True
    actual_base = actual_normalized.replace("*", "")
    expected_base = expected_normalized.replace("*", "")
    if not expected_base:
        return False
    return actual_base.startswith(expected_base) or expected_base in actual_base


def _normalize_last3(value: str | None) -> str | None:
    if not value:
        return None
    digits = "".join(ch for ch in value if ch.isdigit())
    if not digits:
        return None
    return digits[-3:]


def _apply_local_precheck_rules(
    result: ReceiptPrecheckResult,
    *,
    duplicate_hash_match: bool,
    duplicate_operation_match: bool,
    expected_amount: float,
    expected_method: str,
    expected_destination_name_masked: str | None,
    expected_phone_last3: str | None,
    amount_tolerance: float,
) -> None:
    result.ai_duplicate_hash_match = duplicate_hash_match
    result.ai_duplicate_operation_match = duplicate_operation_match

    if duplicate_hash_match:
        _mark_likely_invalid(
            result,
            "Se detecto un archivo identico ya usado en otro comprobante.",
            100,
        )

    if duplicate_operation_match:
        _mark_likely_invalid(
            result,
            "El codigo de operacion ya fue utilizado en otro pago.",
            98,
        )

    if result.ai_extracted_amount is not None and abs(result.ai_extracted_amount - expected_amount) > amount_tolerance:
        _mark_likely_invalid(
            result,
            "El monto detectado no coincide con el valor esperado del plan.",
            95,
        )

    detected_method = _normalize_detected_method(result.ai_extracted_method)
    if detected_method:
        result.ai_extracted_method = detected_method
    if detected_method and detected_method not in {"other", expected_method}:
        _mark_likely_invalid(
            result,
            "El metodo detectado no coincide con el metodo esperado para este plan.",
            92,
        )

    if expected_method == "yape":
        detected_name = result.ai_extracted_destination_name_masked or result.ai_extracted_destination
        if detected_name and expected_destination_name_masked and not _masked_names_match(
            detected_name,
            expected_destination_name_masked,
        ):
            _mark_likely_invalid(
                result,
                f"El destino detectado no coincide con la cuenta Yape esperada ({expected_destination_name_masked}).",
                96,
            )

        detected_last3 = _normalize_last3(result.ai_extracted_phone_last3)
        expected_last3 = _normalize_last3(expected_phone_last3)
        if detected_last3 and expected_last3 and detected_last3 != expected_last3:
            _mark_likely_invalid(
                result,
                f"Los ultimos 3 digitos del destino no coinciden (esperado {expected_last3}).",
                96,
            )


def _get_payment_or_404(session: Session, payment_id: int) -> Payment:
    payment = session.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.post("/upload-proof", response_model=PaymentUploadResponse)
async def upload_payment_proof(
    plan: str = Form(...),
    file: UploadFile = File(...),
    _: None = Depends(rate_limit("upload-proof", limit=15, window_seconds=3600)),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    storage_service: StorageService = Depends(get_storage_service),
    receipt_verifier: ReceiptVerifier = Depends(get_receipt_verifier),
):
    if current_user.subscription_status == "suspended":
        raise HTTPException(status_code=403, detail="La cuenta esta suspendida y no puede cargar nuevos comprobantes.")

    settings = get_settings()
    normalized_plan = plan.strip().lower()
    payment_plan = _resolve_payment_plan_or_400(normalized_plan)

    content = await file.read()
    _validate_payment_file(file, content)
    receipt_sha256 = hashlib.sha256(content).hexdigest()
    stored_file = storage_service.upload_receipt(
        content=content,
        filename=file.filename or "receipt.jpg",
        content_type=(file.content_type or "application/octet-stream"),
        user_id=current_user.id or 0,
    )

    precheck_result = await receipt_verifier.verify_receipt(
        content=content,
        content_type=(file.content_type or "application/octet-stream"),
        plan=normalized_plan,
        expected_amount=payment_plan.price,
        expected_method=payment_plan.payment_method,
    )

    duplicate_hash_match = session.exec(
        select(Payment.id).where(Payment.receipt_sha256 == receipt_sha256)
    ).first() is not None
    duplicate_operation_match = False
    if precheck_result.ai_extracted_operation_code:
        duplicate_operation_match = session.exec(
            select(Payment.id).where(
                Payment.ai_extracted_operation_code == precheck_result.ai_extracted_operation_code
            )
        ).first() is not None

    _apply_local_precheck_rules(
        precheck_result,
        duplicate_hash_match=duplicate_hash_match,
        duplicate_operation_match=duplicate_operation_match,
        expected_amount=payment_plan.price,
        expected_method=payment_plan.payment_method,
        expected_destination_name_masked=settings.effective_payment_yape_destination_name_masked,
        expected_phone_last3=settings.effective_payment_yape_phone_last3,
        amount_tolerance=settings.effective_payment_amount_tolerance,
    )

    payment = Payment(
        user_id=current_user.id or 0,
        product_code=payment_plan.product_code,
        plan=payment_plan.code,
        amount=payment_plan.price,
        currency=payment_plan.currency,
        payment_method=payment_plan.payment_method,
        receipt_key=stored_file.key,
        receipt_url=stored_file.url,
        receipt_filename=file.filename or "receipt.jpg",
        receipt_content_type=(file.content_type or "application/octet-stream"),
        receipt_sha256=receipt_sha256,
        ai_verification_status=precheck_result.ai_verification_status,
        ai_confidence=precheck_result.ai_confidence,
        ai_summary=precheck_result.ai_summary,
        ai_extracted_amount=precheck_result.ai_extracted_amount,
        ai_extracted_method=precheck_result.ai_extracted_method,
        ai_extracted_operation_code=precheck_result.ai_extracted_operation_code,
        ai_extracted_paid_at=precheck_result.ai_extracted_paid_at,
        ai_extracted_destination=precheck_result.ai_extracted_destination,
        ai_extracted_destination_name_masked=precheck_result.ai_extracted_destination_name_masked,
        ai_extracted_phone_last3=precheck_result.ai_extracted_phone_last3,
        ai_extracted_security_code=precheck_result.ai_extracted_security_code,
        ai_duplicate_hash_match=precheck_result.ai_duplicate_hash_match,
        ai_duplicate_operation_match=precheck_result.ai_duplicate_operation_match,
        ai_raw_result_json=precheck_result.ai_raw_result_json,
    )
    session.add(payment)

    if current_user.subscription_status != "active":
        current_user.subscription_status = "pending_review"
        current_user.subscription_scope = payment_plan.product_code
        session.add(current_user)

    session.commit()
    session.refresh(payment)
    session.refresh(current_user)
    log_event(
        logger,
        "payments.upload_proof",
        payment_id=payment.id,
        user_id=current_user.id,
        plan=payment.plan,
        amount=payment.amount,
        payment_method=payment.payment_method,
        precheck_status=payment.ai_verification_status,
        duplicate_hash=payment.ai_duplicate_hash_match,
        duplicate_operation=payment.ai_duplicate_operation_match,
    )

    return PaymentUploadResponse(
        message="Comprobante subido exitosamente. Verificaremos tu pago pronto.",
        payment_id=payment.id or 0,
        status=payment.status,
        subscription_status=current_user.subscription_status,
        requires_manual_review=True,
        precheck=PaymentPrecheckResult(**precheck_result.as_payload()),
    )


@router.get("/history", response_model=list[PaymentRead])
def get_payment_history(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    statement = (
        select(Payment)
        .where(Payment.user_id == (current_user.id or 0))
        .order_by(Payment.created_at.desc())
    )
    payments = session.exec(statement).all()
    return [_payment_to_schema(payment) for payment in payments]


@router.get("/{payment_id}/receipt")
def get_payment_receipt(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    storage_service: StorageService = Depends(get_storage_service),
):
    payment = _get_payment_or_404(session, payment_id)
    if not current_user.is_admin and payment.user_id != (current_user.id or 0):
        raise HTTPException(status_code=403, detail="You do not have access to this receipt")

    try:
        access = storage_service.resolve_receipt(payment.receipt_key, payment.receipt_url)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Receipt file not found") from exc
    if access.kind == "redirect":
        response = RedirectResponse(access.location, status_code=307)
        response.headers["Cache-Control"] = "no-store"
        return response

    if access.kind == "inline":
        response = Response(
            content=access.content or b"",
            media_type=payment.receipt_content_type,
        )
        response.headers["Cache-Control"] = "no-store"
        response.headers["Content-Disposition"] = f'inline; filename="{payment.receipt_filename}"'
        return response

    file_path = Path(access.location)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Receipt file not found")

    response = FileResponse(
        path=file_path,
        media_type=payment.receipt_content_type,
        filename=payment.receipt_filename,
    )
    response.headers["Cache-Control"] = "no-store"
    return response
