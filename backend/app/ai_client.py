import json
from typing import Any

import httpx

from app.config import AICandidate, get_settings


class AIClientError(RuntimeError):
    pass


class AIClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _headers(self, candidate: AICandidate) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if candidate.provider == "mock":
            return headers
        if not candidate.api_key:
            raise AIClientError(f"Missing API key for {candidate.label}.")

        headers["Authorization"] = f"Bearer {candidate.api_key}"
        if candidate.provider == "openrouter":
            headers["HTTP-Referer"] = self.settings.public_app_url
            headers["X-Title"] = "PLANIFIWEB"
        return headers

    async def _generate_with_candidate(
        self,
        candidate: AICandidate,
        *,
        prompt: str,
        system: str,
        max_tokens: int,
        temperature: float,
        json_mode: bool,
    ) -> tuple[str, str, str]:
        if candidate.provider == "mock":
            if json_mode:
                return (
                    json.dumps(
                        {
                            "status": "mock",
                            "message": "Configura un proveedor real para respuestas de produccion.",
                            "outline": [
                                "Contextualiza la situacion de aprendizaje.",
                                "Define evidencias alineadas al CNEB.",
                                "Propone actividades evaluables.",
                            ],
                        }
                    ),
                    candidate.provider,
                    candidate.model,
                )
            return (
                "Respuesta de demostracion de PLANIFIWEB. Configura un proveedor real para produccion.",
                candidate.provider,
                candidate.model,
            )

        if not candidate.base_url:
            raise AIClientError(f"AI base URL is not configured for {candidate.label}.")

        payload: dict[str, Any] = {
            "model": candidate.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        if candidate.provider == "openrouter":
            payload["provider"] = {
                "allow_fallbacks": True,
                "sort": "throughput",
                "require_parameters": json_mode,
            }

        async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
            response = await client.post(
                f"{candidate.base_url}/chat/completions",
                headers=self._headers(candidate),
                json=payload,
            )

        try:
            data = response.json()
        except ValueError as exc:
            raise AIClientError(
                f"Invalid AI provider response from {candidate.label} ({response.status_code})."
            ) from exc

        if not response.is_success:
            detail = (
                data.get("error", {}).get("message")
                or data.get("detail")
                or f"AI provider error {response.status_code}"
            )
            raise AIClientError(f"{candidate.label}: {detail}")

        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        if not content:
            raise AIClientError(f"{candidate.label}: the AI provider returned an empty response.")
        return str(content), candidate.provider, candidate.model

    async def generate(
        self,
        *,
        prompt: str,
        system: str,
        max_tokens: int,
        temperature: float,
        json_mode: bool,
    ) -> tuple[str, str, str]:
        errors: list[str] = []

        for candidate in self.settings.ai_candidates:
            try:
                return await self._generate_with_candidate(
                    candidate,
                    prompt=prompt,
                    system=system,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    json_mode=json_mode,
                )
            except (AIClientError, httpx.TimeoutException, httpx.RequestError) as exc:
                errors.append(str(exc))
                continue

        if not errors:
            raise AIClientError("No AI provider candidates are configured.")

        raise AIClientError(
            "All configured AI providers failed. " + " | ".join(errors[:4])
        )
