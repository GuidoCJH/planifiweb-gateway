from datetime import date, datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.config import get_settings
from app.normalization import is_allowed_email_domain, normalize_email, normalize_person_name


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    accept_terms: bool
    accept_privacy: bool

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return normalize_person_name(value)

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, value: EmailStr) -> str:
        normalized = normalize_email(str(value))
        allowed_domains = get_settings().allowed_email_domain_list
        if not is_allowed_email_domain(normalized, allowed_domains):
            if allowed_domains:
                allowed = ", ".join(f"@{domain}" for domain in allowed_domains)
                raise ValueError(f"Solo se permiten correos de estos dominios: {allowed}.")
            raise ValueError("Ingresa un correo valido para el registro.")
        return normalized


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CSRFTokenResponse(BaseModel):
    csrf_token: str


class UserPublic(BaseModel):
    id: int
    name: str
    email: EmailStr
    is_admin: bool
    subscription_status: str
    subscription_scope: str
    active_plan: Optional[str] = None
    subscription_expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("name")
    @classmethod
    def format_name(cls, value: str) -> str:
        return normalize_person_name(value)


class UsageStatus(BaseModel):
    date: date
    daily_limit: int
    daily_used: int
    remaining: int
    subscription_status: str
    exports_enabled: bool
    can_access_app: bool


class LegalStatus(BaseModel):
    terms_version: str
    privacy_version: str
    acceptance_required: bool
    terms_accepted_at: Optional[datetime] = None
    privacy_accepted_at: Optional[datetime] = None


class SessionState(BaseModel):
    user: UserPublic
    subscription_status: str
    subscription_scope: str
    active_plan: Optional[str] = None
    daily_limit: int
    daily_used: int
    exports_enabled: bool
    can_access_app: bool
    legal: LegalStatus


class SubscriptionStatusResponse(SessionState):
    pass


class PaymentPrecheckResult(BaseModel):
    ai_verification_status: str
    ai_confidence: int
    ai_summary: str
    ai_extracted_amount: Optional[float] = None
    ai_extracted_method: Optional[str] = None
    ai_extracted_operation_code: Optional[str] = None
    ai_extracted_paid_at: Optional[datetime] = None
    ai_extracted_destination: Optional[str] = None
    ai_extracted_destination_name_masked: Optional[str] = None
    ai_extracted_phone_last3: Optional[str] = None
    ai_extracted_security_code: Optional[str] = None
    ai_duplicate_hash_match: bool = False
    ai_duplicate_operation_match: bool = False


class PaymentUploadResponse(BaseModel):
    message: str
    payment_id: int
    status: str
    subscription_status: str
    requires_manual_review: bool
    precheck: PaymentPrecheckResult


class PaymentRead(BaseModel):
    id: int
    user_id: int
    product_code: str
    plan: str
    amount: float
    currency: str
    status: str
    payment_method: str
    has_receipt: bool
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    fraud_flagged_at: Optional[datetime] = None
    fraud_flagged_by: Optional[int] = None
    fraud_reason: Optional[str] = None
    precheck: PaymentPrecheckResult

    model_config = {"from_attributes": True}


class PaymentAdminRead(PaymentRead):
    user_email: EmailStr
    user_name: str
    user_subscription_status: str

    @field_validator("user_name")
    @classmethod
    def format_user_name(cls, value: str) -> str:
        return normalize_person_name(value)


class PaymentReviewRequest(BaseModel):
    status: Literal["approved", "rejected", "fraudulent"]
    reason: Optional[str] = Field(default=None, max_length=1000)


class PaymentAdminSummary(BaseModel):
    all: int
    pending: int
    approved: int
    rejected: int
    fraudulent: int


class PaymentAdminListResponse(BaseModel):
    items: list[PaymentAdminRead]
    total: int
    limit: int
    offset: int
    summary: PaymentAdminSummary


class LegalAcceptanceRequest(BaseModel):
    accept_terms: bool
    accept_privacy: bool


class AIGenerateRequest(BaseModel):
    module: str = Field(min_length=2, max_length=100)
    operation: str = Field(min_length=2, max_length=100)
    prompt: str = Field(min_length=10, max_length=40000)
    system: str = Field(default="Eres un asistente experto en planificacion curricular peruana segun el CNEB.")
    temperature: float = Field(default=0.2, ge=0, le=1.5)
    max_tokens: int = Field(default=2500, ge=256, le=6000)


class AIGenerateResponse(BaseModel):
    content: str
    provider: str
    model: str
    usage: UsageStatus


class AIGenerateJsonResponse(BaseModel):
    data: dict[str, Any]
    provider: str
    model: str
    usage: UsageStatus
