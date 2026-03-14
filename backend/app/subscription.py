from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.config import get_settings
from app.models import (
    AIGenerationLog,
    AIUsageDaily,
    PLANIFIWEB_INSTITUTIONAL_PLAN,
    PLANIFIWEB_PLAN,
    PLANIFIWEB_SCOPE,
    PLANIFIWEB_START_PLAN,
    User,
)
from app.schemas import LegalStatus, SessionState, UsageStatus, UserPublic


@dataclass(frozen=True)
class SubscriptionPolicy:
    daily_limit: int
    exports_enabled: bool
    can_access_app: bool


POLICIES: dict[str, SubscriptionPolicy] = {
    "awaiting_payment": SubscriptionPolicy(daily_limit=0, exports_enabled=False, can_access_app=False),
    "pending_review": SubscriptionPolicy(daily_limit=3, exports_enabled=False, can_access_app=True),
    "active": SubscriptionPolicy(daily_limit=20, exports_enabled=True, can_access_app=True),
    "rejected": SubscriptionPolicy(daily_limit=0, exports_enabled=False, can_access_app=False),
    "expired": SubscriptionPolicy(daily_limit=0, exports_enabled=False, can_access_app=False),
    "suspended": SubscriptionPolicy(daily_limit=0, exports_enabled=False, can_access_app=False),
}
ADMIN_POLICY = SubscriptionPolicy(daily_limit=999, exports_enabled=True, can_access_app=True)
ACTIVE_PLAN_POLICIES: dict[str, SubscriptionPolicy] = {
    PLANIFIWEB_START_PLAN: SubscriptionPolicy(daily_limit=20, exports_enabled=True, can_access_app=True),
    PLANIFIWEB_PLAN: SubscriptionPolicy(daily_limit=60, exports_enabled=True, can_access_app=True),
    PLANIFIWEB_INSTITUTIONAL_PLAN: SubscriptionPolicy(daily_limit=200, exports_enabled=True, can_access_app=True),
}
DEFAULT_ACTIVE_POLICY = ACTIVE_PLAN_POLICIES[PLANIFIWEB_START_PLAN]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def next_billing_cycle() -> datetime:
    return utcnow() + timedelta(days=30)


def get_subscription_policy(user: User) -> SubscriptionPolicy:
    if user.is_admin:
        return ADMIN_POLICY
    if user.subscription_status == "active":
        active_plan = (user.active_plan or "").strip().lower()
        if active_plan:
            return ACTIVE_PLAN_POLICIES.get(active_plan, DEFAULT_ACTIVE_POLICY)
        return DEFAULT_ACTIVE_POLICY
    return POLICIES.get(user.subscription_status, POLICIES["awaiting_payment"])


def build_legal_status(user: User) -> LegalStatus:
    settings = get_settings()
    acceptance_required = not (
        user.terms_accepted_at
        and user.privacy_accepted_at
        and user.accepted_terms_version == settings.legal_terms_version
        and user.accepted_privacy_version == settings.legal_privacy_version
    )
    return LegalStatus(
        terms_version=settings.legal_terms_version,
        privacy_version=settings.legal_privacy_version,
        acceptance_required=acceptance_required,
        terms_accepted_at=user.terms_accepted_at,
        privacy_accepted_at=user.privacy_accepted_at,
    )


def get_or_create_daily_usage(session: Session, user: User) -> AIUsageDaily:
    today = date.today()
    usage = session.exec(
        select(AIUsageDaily).where(
            AIUsageDaily.user_id == (user.id or 0),
            AIUsageDaily.usage_date == today,
        )
    ).first()
    if usage is not None:
        return usage

    usage = AIUsageDaily(
        user_id=user.id or 0,
        usage_date=today,
        requests_count=0,
        limit_snapshot=get_subscription_policy(user).daily_limit,
        subscription_status=user.subscription_status,
    )
    session.add(usage)
    session.commit()
    session.refresh(usage)
    return usage


def build_usage_status(session: Session, user: User) -> UsageStatus:
    policy = get_subscription_policy(user)
    usage = get_or_create_daily_usage(session, user)
    usage.limit_snapshot = policy.daily_limit
    usage.subscription_status = user.subscription_status
    usage.updated_at = utcnow()
    session.add(usage)
    session.commit()
    session.refresh(usage)

    remaining = max(policy.daily_limit - usage.requests_count, 0)
    return UsageStatus(
        date=usage.usage_date,
        daily_limit=policy.daily_limit,
        daily_used=usage.requests_count,
        remaining=remaining,
        subscription_status=user.subscription_status,
        exports_enabled=policy.exports_enabled,
        can_access_app=policy.can_access_app,
    )


def build_session_state(session: Session, user: User) -> SessionState:
    usage = build_usage_status(session, user)
    legal = build_legal_status(user)
    return SessionState(
        user=UserPublic.model_validate(user),
        subscription_status=user.subscription_status,
        subscription_scope=user.subscription_scope or PLANIFIWEB_SCOPE,
        active_plan=user.active_plan,
        daily_limit=usage.daily_limit,
        daily_used=usage.daily_used,
        exports_enabled=usage.exports_enabled,
        can_access_app=usage.can_access_app,
        legal=legal,
    )


def enforce_app_access(session: Session, user: User) -> SessionState:
    session_state = build_session_state(session, user)
    if session_state.legal.acceptance_required:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accept the Terms and Privacy Policy before entering PLANIFIWEB.",
        )
    if not session_state.can_access_app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your subscription does not allow access to PLANIFIWEB yet.",
        )
    return session_state


def enforce_ai_generation(session: Session, user: User) -> SessionState:
    session_state = build_session_state(session, user)
    if session_state.legal.acceptance_required:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accept the Terms and Privacy Policy before using the AI tools.",
        )
    if not session_state.can_access_app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Complete your subscription payment before using the AI tools.",
        )
    if session_state.daily_used >= session_state.daily_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily AI limit reached ({session_state.daily_limit} requests).",
        )
    return session_state


def record_ai_generation(
    session: Session,
    user: User,
    module: str,
    operation: str,
    prompt_chars: int,
    response_chars: int,
    was_json: bool,
) -> UsageStatus:
    usage = get_or_create_daily_usage(session, user)
    policy = get_subscription_policy(user)
    usage.requests_count += 1
    usage.limit_snapshot = policy.daily_limit
    usage.subscription_status = user.subscription_status
    usage.updated_at = utcnow()
    session.add(usage)
    session.add(
        AIGenerationLog(
            user_id=user.id or 0,
            module=module,
            operation=operation,
            prompt_chars=prompt_chars,
            response_chars=response_chars,
            was_json=was_json,
        )
    )
    session.commit()
    session.refresh(usage)
    return UsageStatus(
        date=usage.usage_date,
        daily_limit=policy.daily_limit,
        daily_used=usage.requests_count,
        remaining=max(policy.daily_limit - usage.requests_count, 0),
        subscription_status=user.subscription_status,
        exports_enabled=policy.exports_enabled,
        can_access_app=policy.can_access_app,
    )
