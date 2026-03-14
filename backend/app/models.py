from datetime import date, datetime, timezone
from typing import List, Optional

import sqlalchemy as sa
from sqlmodel import Field, Relationship, SQLModel


PLANIFIWEB_SCOPE = "planifiweb"
PLANIFIWEB_START_PLAN = "planifiweb_start"
PLANIFIWEB_PLAN = "planifiweb_pro"
PLANIFIWEB_INSTITUTIONAL_PLAN = "planifiweb_institucional"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, nullable=False, max_length=255)
    name: str = Field(nullable=False, max_length=120)
    hashed_password: str = Field(nullable=False, max_length=255)
    is_admin: bool = Field(default=False, nullable=False)
    subscription_status: str = Field(
        default="awaiting_payment",
        nullable=False,
        max_length=50,
    )
    subscription_scope: str = Field(
        default=PLANIFIWEB_SCOPE,
        nullable=False,
        max_length=50,
    )
    active_plan: Optional[str] = Field(default=None, nullable=True, max_length=50)
    subscription_expires_at: Optional[datetime] = Field(default=None, nullable=True)
    terms_accepted_at: Optional[datetime] = Field(default=None, nullable=True)
    privacy_accepted_at: Optional[datetime] = Field(default=None, nullable=True)
    accepted_terms_version: Optional[str] = Field(default=None, nullable=True, max_length=32)
    accepted_privacy_version: Optional[str] = Field(default=None, nullable=True, max_length=32)
    created_at: datetime = Field(default_factory=utcnow, nullable=False)

    payments: List["Payment"] = Relationship(back_populates="user")
    subscriptions: List["Subscription"] = Relationship(back_populates="user")
    daily_usage: List["AIUsageDaily"] = Relationship(back_populates="user")
    generation_logs: List["AIGenerationLog"] = Relationship(back_populates="user")


class Subscription(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", nullable=False, index=True)
    product_code: str = Field(default=PLANIFIWEB_SCOPE, nullable=False, max_length=50)
    plan_type: str = Field(default=PLANIFIWEB_PLAN, nullable=False, max_length=50)
    status: str = Field(default="active", nullable=False, max_length=50)
    is_active: bool = Field(default=True, nullable=False)
    start_date: datetime = Field(default_factory=utcnow, nullable=False)
    end_date: Optional[datetime] = Field(default=None, nullable=True)
    source_payment_id: Optional[int] = Field(default=None, foreign_key="payment.id")

    user: Optional[User] = Relationship(back_populates="subscriptions")


class Payment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", nullable=False, index=True)
    product_code: str = Field(default=PLANIFIWEB_SCOPE, nullable=False, max_length=50)
    plan: str = Field(default=PLANIFIWEB_PLAN, nullable=False, max_length=50)
    amount: float = Field(nullable=False, gt=0)
    currency: str = Field(default="PEN", nullable=False, max_length=10)
    status: str = Field(default="pending", nullable=False, max_length=20)
    payment_method: str = Field(nullable=False, max_length=50)
    receipt_key: str = Field(nullable=False, max_length=500)
    receipt_url: str = Field(nullable=False, max_length=500)
    receipt_filename: str = Field(nullable=False, max_length=255)
    receipt_content_type: str = Field(nullable=False, max_length=120)
    receipt_sha256: Optional[str] = Field(default=None, nullable=True, index=True, max_length=64)
    ai_verification_status: str = Field(default="processing", nullable=False, max_length=32)
    ai_confidence: int = Field(default=0, nullable=False)
    ai_summary: Optional[str] = Field(
        default=None,
        sa_column=sa.Column(sa.Text(), nullable=True),
    )
    ai_extracted_amount: Optional[float] = Field(default=None, nullable=True)
    ai_extracted_method: Optional[str] = Field(default=None, nullable=True, max_length=50)
    ai_extracted_operation_code: Optional[str] = Field(default=None, nullable=True, index=True, max_length=120)
    ai_extracted_paid_at: Optional[datetime] = Field(default=None, nullable=True)
    ai_extracted_destination: Optional[str] = Field(default=None, nullable=True, max_length=255)
    ai_extracted_destination_name_masked: Optional[str] = Field(default=None, nullable=True, max_length=255)
    ai_extracted_phone_last3: Optional[str] = Field(default=None, nullable=True, max_length=3)
    ai_extracted_security_code: Optional[str] = Field(default=None, nullable=True, max_length=32)
    ai_duplicate_hash_match: bool = Field(default=False, nullable=False)
    ai_duplicate_operation_match: bool = Field(default=False, nullable=False)
    ai_raw_result_json: Optional[str] = Field(
        default=None,
        sa_column=sa.Column(sa.Text(), nullable=True),
    )
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    reviewed_at: Optional[datetime] = Field(default=None, nullable=True)
    reviewed_by: Optional[int] = Field(default=None, index=True)
    fraud_flagged_at: Optional[datetime] = Field(default=None, nullable=True)
    fraud_flagged_by: Optional[int] = Field(default=None, nullable=True, index=True)
    fraud_reason: Optional[str] = Field(
        default=None,
        sa_column=sa.Column(sa.Text(), nullable=True),
    )

    user: Optional[User] = Relationship(back_populates="payments")


class AIUsageDaily(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", nullable=False, index=True)
    usage_date: date = Field(nullable=False, index=True)
    requests_count: int = Field(default=0, nullable=False)
    limit_snapshot: int = Field(default=0, nullable=False)
    subscription_status: str = Field(default="awaiting_payment", nullable=False, max_length=50)
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    user: Optional[User] = Relationship(back_populates="daily_usage")


class AIGenerationLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", nullable=False, index=True)
    module: str = Field(nullable=False, max_length=100)
    operation: str = Field(nullable=False, max_length=100)
    prompt_chars: int = Field(default=0, nullable=False)
    response_chars: int = Field(default=0, nullable=False)
    was_json: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=utcnow, nullable=False)

    user: Optional[User] = Relationship(back_populates="generation_logs")
