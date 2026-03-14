import base64
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any

import httpx

from app.config import Settings, get_settings


@dataclass
class ReceiptPrecheckResult:
    ai_verification_status: str
    ai_confidence: int
    ai_summary: str
    ai_extracted_amount: float | None = None
    ai_extracted_method: str | None = None
    ai_extracted_operation_code: str | None = None
    ai_extracted_paid_at: datetime | None = None
    ai_extracted_destination: str | None = None
    ai_extracted_destination_name_masked: str | None = None
    ai_extracted_phone_last3: str | None = None
    ai_extracted_security_code: str | None = None
    ai_duplicate_hash_match: bool = False
    ai_duplicate_operation_match: bool = False
    ai_raw_result_json: str | None = None

    def as_payload(self) -> dict[str, Any]:
        payload = asdict(self)
        if self.ai_extracted_paid_at is not None:
            payload["ai_extracted_paid_at"] = self.ai_extracted_paid_at.isoformat()
        return payload


class ReceiptVerifier:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def unavailable(self, summary: str) -> ReceiptPrecheckResult:
        return ReceiptPrecheckResult(
            ai_verification_status="unavailable",
            ai_confidence=0,
            ai_summary=summary,
        )

    async def verify_receipt(
        self,
        *,
        content: bytes,
        content_type: str,
        plan: str,
        expected_amount: float,
        expected_method: str,
    ) -> ReceiptPrecheckResult:
        if not self.settings.payment_precheck_active:
            return self.unavailable("La prevalidacion IA esta desactivada.")
        if not self.settings.payment_vision_ready:
            return self.unavailable("La prevalidacion IA no esta configurada.")

        user_prompt = self._build_prompt(
            plan=plan,
            expected_amount=expected_amount,
            expected_method=expected_method,
        )
        image_base64 = base64.b64encode(content).decode("ascii")
        payload: dict[str, Any] = {
            "model": self.settings.payment_vision_model,
            "temperature": 0,
            "max_tokens": 700,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Eres un verificador de comprobantes de pago. "
                        "Analiza solo la imagen recibida y responde un objeto JSON valido, sin markdown."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{content_type};base64,{image_base64}",
                            },
                        },
                    ],
                },
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=self.settings.payment_vision_timeout_seconds) as client:
                response = await client.post(
                    f"{self.settings.effective_payment_vision_base_url}/chat/completions",
                    headers=self._headers(),
                    json=payload,
                )
        except (httpx.TimeoutException, httpx.RequestError) as exc:
            return self.unavailable(f"El proveedor de vision no respondio: {exc}")

        try:
            body = response.json()
        except ValueError:
            return self.unavailable(
                f"El proveedor de vision devolvio una respuesta invalida ({response.status_code})."
            )

        if not response.is_success:
            detail = (
                body.get("error", {}).get("message")
                or body.get("detail")
                or f"Error HTTP {response.status_code}"
            )
            return self.unavailable(f"El proveedor de vision fallo: {detail}")

        content_text = self._extract_content(body)
        if not content_text:
            return self.unavailable("El proveedor de vision no devolvio contenido util.")

        raw_text = content_text.strip()
        parsed = self._parse_json(raw_text)
        if parsed is None:
            return self.unavailable("La respuesta de vision no pudo interpretarse como JSON.")

        result = self._normalize_result(parsed, raw_text)
        if result.ai_verification_status not in {
            "likely_valid",
            "unclear",
            "likely_invalid",
            "unavailable",
        }:
            result.ai_verification_status = "unclear"
        result.ai_confidence = min(max(int(result.ai_confidence), 0), 100)
        return result

    def _headers(self) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.settings.payment_vision_api_key}",
            "Content-Type": "application/json",
        }
        if self.settings.effective_payment_vision_provider == "openrouter":
            headers["HTTP-Referer"] = self.settings.public_app_url
            headers["X-Title"] = "PLANIFIWEB"
        return headers

    def _build_prompt(self, *, plan: str, expected_amount: float, expected_method: str) -> str:
        expected_yape_name = self.settings.effective_payment_yape_destination_name_masked
        expected_yape_phone = self.settings.effective_payment_yape_phone_last3
        return (
            "Analiza este comprobante de pago peruano y devuelve un JSON con estas claves exactas: "
            "verification_status, confidence, summary, extracted_amount, extracted_method, "
            "operation_code, paid_at_iso, destination, destination_name_masked, phone_last3, security_code, "
            "is_receipt, legibility, manipulation_signals. "
            "Usa verification_status solo con valores likely_valid, unclear o likely_invalid. "
            "Si algo no se ve, devuelve null. "
            f"Contexto esperado: plan={plan}, monto_esperado={expected_amount:.2f} PEN, "
            f"metodo_esperado={expected_method}. "
            f"Para Yape, valida destino_nombre_esperado={expected_yape_name} y celular_esperado_ultimos3={expected_yape_phone}. "
            "Criterios: likely_valid si la imagen parece un comprobante real, el monto luce consistente, "
            "el metodo coincide o es plausible y no hay señales de manipulacion. "
            "likely_invalid si el archivo no parece comprobante, el monto es inconsistente, "
            "hay señales fuertes de edicion o el metodo detectado contradice el esperado. "
            "unclear si la imagen es parcial, borrosa o la evidencia es insuficiente. "
            "paid_at_iso debe ir en formato ISO 8601 si se puede inferir."
        )

    def _extract_content(self, body: dict[str, Any]) -> str:
        content = body.get("choices", [{}])[0].get("message", {}).get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            texts: list[str] = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text" and isinstance(item.get("text"), str):
                    texts.append(item["text"])
            return "\n".join(texts)
        return ""

    def _parse_json(self, raw_text: str) -> dict[str, Any] | None:
        for candidate in (raw_text, self._strip_code_fences(raw_text)):
            try:
                parsed = json.loads(candidate)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                return parsed
        return None

    def _strip_code_fences(self, raw_text: str) -> str:
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip(), flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        return cleaned.strip()

    def _normalize_result(
        self,
        payload: dict[str, Any],
        raw_text: str,
    ) -> ReceiptPrecheckResult:
        summary = self._coerce_text(payload.get("summary")) or "No se pudo resumir el comprobante."
        status = self._coerce_text(payload.get("verification_status")) or "unclear"
        confidence = self._coerce_int(payload.get("confidence"))
        result = ReceiptPrecheckResult(
            ai_verification_status=status,
            ai_confidence=confidence,
            ai_summary=summary,
            ai_extracted_amount=self._coerce_float(payload.get("extracted_amount")),
            ai_extracted_method=self._normalize_method(payload.get("extracted_method")),
            ai_extracted_operation_code=self._coerce_text(payload.get("operation_code")),
            ai_extracted_paid_at=self._coerce_datetime(payload.get("paid_at_iso")),
            ai_extracted_destination=self._coerce_text(payload.get("destination")),
            ai_extracted_destination_name_masked=self._coerce_text(payload.get("destination_name_masked")),
            ai_extracted_phone_last3=self._coerce_phone_last3(payload.get("phone_last3")),
            ai_extracted_security_code=self._coerce_security_code(payload.get("security_code")),
            ai_raw_result_json=raw_text,
        )
        return result

    def _coerce_text(self, value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    def _coerce_int(self, value: Any) -> int:
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return 0

    def _coerce_float(self, value: Any) -> float | None:
        if value is None or value == "":
            return None
        if isinstance(value, (int, float)):
            return float(value)
        cleaned = str(value).strip().replace("S/", "").replace("PEN", "").replace(",", ".")
        cleaned = re.sub(r"[^0-9.]+", "", cleaned)
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None

    def _coerce_datetime(self, value: Any) -> datetime | None:
        if value in (None, ""):
            return None
        text = str(value).strip()
        if not text:
            return None
        normalized = text.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None

    def _normalize_method(self, value: Any) -> str | None:
        text = self._coerce_text(value)
        if text is None:
            return None
        lowered = re.sub(r"[^a-z0-9]+", "", text.lower())
        if "yape" in lowered:
            return "yape"
        if "plin" in lowered:
            return "plin"
        if any(token in lowered for token in {"transferencia", "banktransfer", "banco", "deposito"}):
            return "bank_transfer"
        return "other"

    def _coerce_phone_last3(self, value: Any) -> str | None:
        text = self._coerce_text(value)
        if text is None:
            return None
        digits = "".join(ch for ch in text if ch.isdigit())
        if not digits:
            return None
        return digits[-3:]

    def _coerce_security_code(self, value: Any) -> str | None:
        text = self._coerce_text(value)
        if text is None:
            return None
        normalized = re.sub(r"[^a-zA-Z0-9]+", "", text)
        if not normalized:
            return None
        return normalized[:32]


def get_receipt_verifier() -> ReceiptVerifier:
    return ReceiptVerifier()
