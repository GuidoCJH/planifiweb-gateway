from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlmodel import Session, select

from app.auth import get_current_admin
from app.db import get_session
from app.models import Payment, Subscription, User
from app.observability import get_logger, log_event
from app.rate_limit import rate_limit
from app.schemas import PaymentAdminListResponse, PaymentAdminRead, PaymentAdminSummary, PaymentReviewRequest
from app.subscription import next_billing_cycle
from app.routes.payments import _build_precheck_schema

router = APIRouter(prefix="/admin", tags=["admin"])
logger = get_logger("planifiweb.admin")


def _deactivate_active_subscriptions(session: Session, user_id: int, status_value: str) -> None:
    active_subscriptions = session.exec(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.is_active.is_(True),
        )
    ).all()
    for subscription in active_subscriptions:
        subscription.is_active = False
        subscription.status = status_value
        subscription.end_date = datetime.now(timezone.utc)
        session.add(subscription)


def _payment_to_admin_schema(payment: Payment, user: User) -> PaymentAdminRead:
    return PaymentAdminRead(
        id=payment.id or 0,
        user_id=payment.user_id,
        user_email=user.email,
        user_name=user.name,
        user_subscription_status=user.subscription_status,
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


@router.get("/payments", response_model=PaymentAdminListResponse)
def list_payments(
    status: str | None = Query(default=None, pattern="^(pending|approved|rejected|fraudulent)$"),
    precheck_status: str | None = Query(default=None, pattern="^(likely_valid|unclear|likely_invalid|unavailable|processing)$"),
    limit: int = Query(default=12, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    query: str | None = Query(default=None, min_length=2, max_length=120),
    __: None = Depends(rate_limit("admin-payments-read", limit=120, window_seconds=60)),
    ___: User = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    statement = select(Payment, User).join(User, User.id == Payment.user_id).order_by(Payment.created_at.desc())
    if status:
        statement = statement.where(Payment.status == status)
    if precheck_status:
        statement = statement.where(Payment.ai_verification_status == precheck_status)
    normalized_query = query.strip().lower() if query else None
    if normalized_query:
        like_pattern = f"%{normalized_query}%"
        statement = statement.where(
            or_(
                func.lower(User.email).like(like_pattern),
                func.lower(User.name).like(like_pattern),
                func.lower(func.coalesce(Payment.ai_extracted_operation_code, "")).like(like_pattern),
            )
        )

    total_statement = select(func.count()).select_from(Payment).join(User, User.id == Payment.user_id)
    if status:
        total_statement = total_statement.where(Payment.status == status)
    if precheck_status:
        total_statement = total_statement.where(Payment.ai_verification_status == precheck_status)
    if normalized_query:
        like_pattern = f"%{normalized_query}%"
        total_statement = total_statement.where(
            or_(
                func.lower(User.email).like(like_pattern),
                func.lower(User.name).like(like_pattern),
                func.lower(func.coalesce(Payment.ai_extracted_operation_code, "")).like(like_pattern),
            )
        )

    rows = session.exec(statement.offset(offset).limit(limit)).all()
    total = session.exec(total_statement).one()

    summary = PaymentAdminSummary(
        all=session.exec(select(func.count()).select_from(Payment)).one(),
        pending=session.exec(select(func.count()).select_from(Payment).where(Payment.status == "pending")).one(),
        approved=session.exec(select(func.count()).select_from(Payment).where(Payment.status == "approved")).one(),
        rejected=session.exec(select(func.count()).select_from(Payment).where(Payment.status == "rejected")).one(),
        fraudulent=session.exec(select(func.count()).select_from(Payment).where(Payment.status == "fraudulent")).one(),
    )

    return PaymentAdminListResponse(
        items=[_payment_to_admin_schema(payment, user) for payment, user in rows],
        total=total,
        limit=limit,
        offset=offset,
        summary=summary,
    )


@router.patch("/payments/{payment_id}", response_model=PaymentAdminRead)
def review_payment(
    payment_id: int,
    payload: PaymentReviewRequest,
    __: None = Depends(rate_limit("admin-payments-write", limit=60, window_seconds=60)),
    admin_user: User = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    payment = session.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payload.status != "fraudulent" and payment.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending payments can be approved or rejected")
    if payload.status == "fraudulent" and payment.status == "fraudulent":
        raise HTTPException(status_code=400, detail="Payment is already flagged as fraudulent")

    payment.status = payload.status
    payment.reviewed_at = datetime.now(timezone.utc)
    payment.reviewed_by = admin_user.id

    user = session.get(User, payment.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.status == "approved":
        user.subscription_status = "active"
        user.active_plan = payment.plan
        user.subscription_scope = payment.product_code
        user.subscription_expires_at = next_billing_cycle()
        payment.fraud_flagged_at = None
        payment.fraud_flagged_by = None
        payment.fraud_reason = None

        _deactivate_active_subscriptions(session, user.id or 0, "replaced")

        session.add(
            Subscription(
                user_id=user.id or 0,
                product_code=payment.product_code,
                plan_type=payment.plan,
                status="active",
                is_active=True,
                source_payment_id=payment.id,
                end_date=user.subscription_expires_at,
            )
        )
    elif payload.status == "fraudulent":
        payment.fraud_flagged_at = datetime.now(timezone.utc)
        payment.fraud_flagged_by = admin_user.id
        payment.fraud_reason = (payload.reason or payment.ai_summary or "Comprobante marcado como fraudulento.").strip()
        user.subscription_status = "suspended"
        user.active_plan = None
        user.subscription_expires_at = None
        _deactivate_active_subscriptions(session, user.id or 0, "suspended")
    else:
        if user.subscription_status != "active":
            user.subscription_status = "rejected"
            user.active_plan = None
            user.subscription_expires_at = None
        payment.fraud_flagged_at = None
        payment.fraud_flagged_by = None
        payment.fraud_reason = payload.reason or payment.fraud_reason

    session.add(payment)
    session.add(user)
    session.commit()
    session.refresh(payment)
    session.refresh(user)
    log_event(
        logger,
        "payments.review",
        admin_user_id=admin_user.id,
        payment_id=payment.id,
        status=payment.status,
        reviewed_user_id=user.id,
        fraud_reason=payment.fraud_reason,
    )

    return _payment_to_admin_schema(payment, user)
