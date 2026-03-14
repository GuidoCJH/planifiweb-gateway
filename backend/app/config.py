from dataclasses import dataclass
from functools import lru_cache
from typing import List
from urllib.parse import urlsplit

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


@dataclass(frozen=True)
class AICandidate:
    provider: str
    model: str
    api_key: str | None
    base_url: str | None
    label: str


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_env: str = Field(default="development", alias="APP_ENV")
    secret_key: str | None = Field(default=None, alias="SECRET_KEY")
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    cors_origins: str = Field(default="http://localhost:3000,http://127.0.0.1:3000", alias="CORS_ORIGINS")
    trusted_hosts: str = Field(default="localhost,127.0.0.1", alias="TRUSTED_HOSTS")
    api_docs_enabled: bool | None = Field(default=None, alias="API_DOCS_ENABLED")
    redis_url: str | None = Field(default=None, alias="REDIS_URL")
    allowed_email_domains: str | None = Field(default=None, alias="ALLOWED_EMAIL_DOMAINS")

    access_token_expire_minutes: int = Field(
        default=60 * 24,
        alias="ACCESS_TOKEN_EXPIRE_MINUTES",
    )
    session_cookie_name: str = Field(default="planifiweb_session", alias="SESSION_COOKIE_NAME")
    session_cookie_secure: bool | None = Field(default=None, alias="SESSION_COOKIE_SECURE")
    session_cookie_samesite: str = Field(default="lax", alias="SESSION_COOKIE_SAMESITE")
    session_cookie_domain: str | None = Field(default=None, alias="SESSION_COOKIE_DOMAIN")
    sql_echo: bool = Field(default=False, alias="SQL_ECHO")

    max_receipt_file_mb: int = Field(default=5, alias="MAX_RECEIPT_FILE_MB")
    allowed_receipt_content_types: str = Field(
        default="image/jpeg,image/png,image/webp",
        alias="ALLOWED_RECEIPT_CONTENT_TYPES",
    )

    s3_endpoint_url: str | None = Field(default=None, alias="S3_ENDPOINT_URL")
    s3_region: str | None = Field(default=None, alias="S3_REGION")
    s3_bucket: str | None = Field(default=None, alias="S3_BUCKET")
    s3_access_key_id: str | None = Field(default=None, alias="S3_ACCESS_KEY_ID")
    s3_secret_access_key: str | None = Field(
        default=None,
        alias="S3_SECRET_ACCESS_KEY",
    )
    s3_public_base_url: str | None = Field(default=None, alias="S3_PUBLIC_BASE_URL")
    local_upload_dir: str = Field(default="uploads/receipts", alias="LOCAL_UPLOAD_DIR")

    ai_provider: str = Field(default="mock", alias="AI_PROVIDER")
    ai_model: str = Field(default="mock-planifiweb-1", alias="AI_MODEL")
    ai_api_key: str | None = Field(default=None, alias="AI_API_KEY")
    ai_base_url: str | None = Field(default=None, alias="AI_BASE_URL")
    ai_provider_chain: str = Field(default="groq,openrouter", alias="AI_PROVIDER_CHAIN")
    groq_api_key: str | None = Field(default=None, alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.1-8b-instant", alias="GROQ_MODEL")
    groq_base_url: str | None = Field(default="https://api.groq.com/openai/v1", alias="GROQ_BASE_URL")
    openrouter_api_keys: str | None = Field(default=None, alias="OPENROUTER_API_KEYS")
    openrouter_model: str = Field(default="openrouter/free", alias="OPENROUTER_MODEL")
    openrouter_base_url: str | None = Field(default="https://openrouter.ai/api/v1", alias="OPENROUTER_BASE_URL")
    ai_timeout_seconds: int = Field(default=60, alias="AI_TIMEOUT_SECONDS")
    public_app_url: str = Field(default="http://localhost:3000", alias="PUBLIC_APP_URL")
    legal_terms_version: str = Field(default="2026-03-13", alias="LEGAL_TERMS_VERSION")
    legal_privacy_version: str = Field(default="2026-03-13", alias="LEGAL_PRIVACY_VERSION")
    receipt_url_ttl_seconds: int = Field(default=300, alias="RECEIPT_URL_TTL_SECONDS")
    payment_precheck_enabled: bool = Field(default=False, alias="PAYMENT_PRECHECK_ENABLED")
    payment_vision_provider: str = Field(default="disabled", alias="PAYMENT_VISION_PROVIDER")
    payment_vision_model: str | None = Field(default=None, alias="PAYMENT_VISION_MODEL")
    payment_vision_api_key: str | None = Field(default=None, alias="PAYMENT_VISION_API_KEY")
    payment_vision_base_url: str | None = Field(default=None, alias="PAYMENT_VISION_BASE_URL")
    payment_vision_timeout_seconds: int = Field(default=25, alias="PAYMENT_VISION_TIMEOUT_SECONDS")
    payment_yape_destination_name_masked: str = Field(
        default="Guido Jar*",
        alias="PAYMENT_YAPE_DESTINATION_NAME_MASKED",
    )
    payment_yape_phone_last3: str = Field(default="929", alias="PAYMENT_YAPE_PHONE_LAST3")
    payment_amount_tolerance: float = Field(default=0.01, alias="PAYMENT_AMOUNT_TOLERANCE")

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def effective_database_url(self) -> str:
        if self.database_url:
            if self.database_url.startswith("postgres://"):
                return self.database_url.replace("postgres://", "postgresql://", 1)
            return self.database_url

        if self.is_production:
            raise ValueError("DATABASE_URL is required in production")

        return "sqlite:///./app.db"

    @property
    def effective_secret_key(self) -> str:
        if self.secret_key:
            return self.secret_key
        if self.is_production:
            raise ValueError("SECRET_KEY is required in production")
        return "dev-only-secret-key"

    @property
    def cors_origin_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        if self.is_production and "*" in origins:
            raise ValueError("CORS_ORIGINS cannot include '*' in production")
        return origins or ["http://localhost:3000"]

    @property
    def trusted_host_list(self) -> List[str]:
        hosts = [host.strip() for host in self.trusted_hosts.split(",") if host.strip()]
        provider_defaults = ["*.apps.run-on-seenode.com", "*.seenode.com"]
        for provider_host in provider_defaults:
            if provider_host not in hosts:
                hosts.append(provider_host)
        if self.is_production and "*" in hosts:
            raise ValueError("TRUSTED_HOSTS cannot include '*' in production")
        return hosts or ["localhost", "127.0.0.1"]

    @property
    def effective_docs_enabled(self) -> bool:
        if self.api_docs_enabled is not None:
            return self.api_docs_enabled
        return not self.is_production

    @property
    def effective_session_cookie_secure(self) -> bool:
        if self.session_cookie_secure is not None:
            return self.session_cookie_secure
        return self.is_production

    @property
    def effective_session_cookie_samesite(self) -> str:
        value = self.session_cookie_samesite.strip().lower()
        if value not in {"lax", "strict", "none"}:
            raise ValueError("SESSION_COOKIE_SAMESITE must be one of lax, strict or none")
        if self.effective_session_cookie_secure is False and value == "none":
            raise ValueError("SESSION_COOKIE_SAMESITE=none requires SESSION_COOKIE_SECURE=true")
        return value

    @property
    def effective_session_cookie_domain(self) -> str | None:
        if self.session_cookie_domain and self.session_cookie_domain.strip():
            return self.session_cookie_domain.strip()
        return None

    @property
    def session_cookie_max_age_seconds(self) -> int:
        return int(self.access_token_expire_minutes * 60)

    @property
    def allowed_origin_hosts(self) -> set[str]:
        allowed = set()
        for origin in [*self.cors_origin_list, self.public_app_url]:
            try:
                parsed = urlsplit(origin)
            except ValueError:
                continue
            if parsed.scheme and parsed.netloc:
                allowed.add(f"{parsed.scheme}://{parsed.netloc}")
        return allowed

    @property
    def allowed_receipt_types(self) -> set[str]:
        return {
            content_type.strip().lower()
            for content_type in self.allowed_receipt_content_types.split(",")
            if content_type.strip()
        }

    @property
    def allowed_email_domain_list(self) -> List[str]:
        if not self.allowed_email_domains:
            return []
        separators_normalized = self.allowed_email_domains.replace("\r", "\n").replace(",", "\n")
        return [item.strip().lower() for item in separators_normalized.split("\n") if item.strip()]

    @property
    def max_receipt_file_size(self) -> int:
        return self.max_receipt_file_mb * 1024 * 1024

    @property
    def use_s3_storage(self) -> bool:
        return bool(self.s3_bucket and self.s3_access_key_id and self.s3_secret_access_key)

    @property
    def openrouter_api_key_list(self) -> List[str]:
        if not self.openrouter_api_keys:
            return []

        separators_normalized = self.openrouter_api_keys.replace("\r", "\n").replace(",", "\n")
        return [item.strip() for item in separators_normalized.split("\n") if item.strip()]

    @property
    def has_real_ai_config(self) -> bool:
        return bool(
            self.groq_api_key
            or self.openrouter_api_key_list
            or (self.ai_provider.strip().lower() != "mock" and self.ai_api_key)
        )

    @property
    def effective_ai_provider(self) -> str:
        provider = self.ai_provider.strip().lower()
        if self.is_production and provider == "mock" and not self.has_real_ai_config:
            raise ValueError("Configure at least one real AI provider in production")
        return provider

    @property
    def effective_ai_base_url(self) -> str | None:
        if self.ai_base_url:
            return self.ai_base_url.rstrip("/")

        defaults = {
            "groq": (self.groq_base_url or "https://api.groq.com/openai/v1").rstrip("/"),
            "openai": "https://api.openai.com/v1",
            "openrouter": (self.openrouter_base_url or "https://openrouter.ai/api/v1").rstrip("/"),
            "qwen": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        }
        return defaults.get(self.effective_ai_provider)

    @property
    def ai_candidates(self) -> List[AICandidate]:
        chain = [item.strip().lower() for item in self.ai_provider_chain.split(",") if item.strip()]
        candidates: List[AICandidate] = []

        if not chain:
            chain = [self.effective_ai_provider]

        for provider in chain:
            if provider == "groq" and self.groq_api_key:
                candidates.append(
                    AICandidate(
                        provider="groq",
                        model=self.groq_model,
                        api_key=self.groq_api_key,
                        base_url=(self.groq_base_url or "https://api.groq.com/openai/v1").rstrip("/"),
                        label="groq-primary",
                    )
                )
                continue

            if provider == "openrouter" and self.openrouter_api_key_list:
                for index, api_key in enumerate(self.openrouter_api_key_list, start=1):
                    candidates.append(
                        AICandidate(
                            provider="openrouter",
                            model=self.openrouter_model,
                            api_key=api_key,
                            base_url=(self.openrouter_base_url or "https://openrouter.ai/api/v1").rstrip("/"),
                            label=f"openrouter-{index}",
                        )
                    )
                continue

            if provider == self.effective_ai_provider and self.ai_api_key:
                candidates.append(
                    AICandidate(
                        provider=provider,
                        model=self.ai_model,
                        api_key=self.ai_api_key,
                        base_url=self.effective_ai_base_url,
                        label=f"{provider}-direct",
                    )
                )

        if not candidates and self.ai_api_key and self.effective_ai_provider != "mock":
            candidates.append(
                AICandidate(
                    provider=self.effective_ai_provider,
                    model=self.ai_model,
                    api_key=self.ai_api_key,
                    base_url=self.effective_ai_base_url,
                    label=f"{self.effective_ai_provider}-direct",
                )
            )

        if not candidates:
            candidates.append(
                AICandidate(
                    provider="mock",
                    model="mock-planifiweb-1",
                    api_key=None,
                    base_url=None,
                    label="mock",
                )
            )

        return candidates

    @property
    def payment_precheck_active(self) -> bool:
        return self.payment_precheck_enabled

    @property
    def effective_payment_vision_provider(self) -> str:
        return self.payment_vision_provider.strip().lower()

    @property
    def effective_payment_vision_base_url(self) -> str | None:
        if self.payment_vision_base_url:
            return self.payment_vision_base_url.rstrip("/")

        defaults = {
            "openai": "https://api.openai.com/v1",
            "openrouter": (self.openrouter_base_url or "https://openrouter.ai/api/v1").rstrip("/"),
            "groq": (self.groq_base_url or "https://api.groq.com/openai/v1").rstrip("/"),
        }
        return defaults.get(self.effective_payment_vision_provider)

    @property
    def payment_vision_ready(self) -> bool:
        return bool(
            self.payment_precheck_active
            and self.payment_vision_api_key
            and self.payment_vision_model
            and self.effective_payment_vision_base_url
            and self.effective_payment_vision_provider not in {"", "disabled"}
        )

    @property
    def effective_payment_yape_destination_name_masked(self) -> str:
        value = self.payment_yape_destination_name_masked.strip()
        return value or "Guido Jar*"

    @property
    def effective_payment_yape_phone_last3(self) -> str:
        digits = "".join(ch for ch in self.payment_yape_phone_last3 if ch.isdigit())
        return digits[-3:] if digits else "929"

    @property
    def effective_payment_amount_tolerance(self) -> float:
        return max(float(self.payment_amount_tolerance), 0.0)


@lru_cache
def get_settings() -> Settings:
    return Settings()
