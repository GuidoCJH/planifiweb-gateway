from __future__ import annotations

from urllib.parse import quote

import httpx

from app.config import Settings, get_settings


class EmailServiceError(RuntimeError):
    pass


class EmailService:
    FALLBACK_FROM_EMAIL = "onboarding@resend.dev"

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def _require_resend(self) -> str:
        if not self.settings.resend_api_key:
            raise EmailServiceError("El servicio de correo no está configurado.")
        return self.settings.resend_api_key

    def _post_email(self, *, api_key: str, payload: dict[str, object]) -> httpx.Response:
        return httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )

    @staticmethod
    def _extract_error_detail(response: httpx.Response) -> str:
        try:
            return response.json().get("message") or response.text
        except ValueError:
            return response.text

    @staticmethod
    def _is_unverified_domain_error(detail: str) -> bool:
        return "domain is not verified" in detail.lower()

    def send_password_reset_email(
        self,
        *,
        to_email: str,
        to_name: str,
        token: str,
    ) -> None:
        api_key = self._require_resend()
        reset_url = f"{self.settings.effective_password_reset_url_base}?token={quote(token)}"
        ttl_minutes = self.settings.password_reset_token_ttl_minutes
        name = to_name.strip() or "docente"

        payload = {
            "from": f"{self.settings.resend_from_name} <{self.settings.resend_from_email}>",
            "to": [to_email],
            "subject": "Restablece tu contraseña de PLANIFIWEB",
            "html": f"""
                <div style="font-family: Arial, sans-serif; color: #10203a; line-height: 1.7;">
                  <p>Hola, {name}.</p>
                  <p>Recibimos una solicitud para restablecer tu contraseña de PLANIFIWEB.</p>
                  <p>
                    <a href="{reset_url}" style="display:inline-block;padding:12px 20px;background:#10203a;color:#f7f2e8;text-decoration:none;border-radius:999px;">
                      Restablecer contraseña
                    </a>
                  </p>
                  <p>Este enlace vence en {ttl_minutes} minutos.</p>
                  <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
                </div>
            """,
            "text": (
                f"Hola, {name}.\n\n"
                "Recibimos una solicitud para restablecer tu contraseña de PLANIFIWEB.\n\n"
                f"Usa este enlace: {reset_url}\n\n"
                f"Este enlace vence en {ttl_minutes} minutos.\n"
                "Si no solicitaste este cambio, puedes ignorar este correo.\n"
            ),
        }

        response = self._post_email(api_key=api_key, payload=payload)

        if (
            not response.is_success
            and self.settings.resend_from_email.lower() != self.FALLBACK_FROM_EMAIL
        ):
            detail = self._extract_error_detail(response)
            if self._is_unverified_domain_error(detail):
                fallback_payload = dict(payload)
                fallback_payload["from"] = (
                    f"{self.settings.resend_from_name} <{self.FALLBACK_FROM_EMAIL}>"
                )
                response = self._post_email(api_key=api_key, payload=fallback_payload)

        if not response.is_success:
            detail = self._extract_error_detail(response)
            raise EmailServiceError(f"No se pudo enviar el correo de recuperación. {detail}".strip())


def get_email_service() -> EmailService:
    return EmailService()
