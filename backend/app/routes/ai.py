import json

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.ai_client import AIClient, AIClientError
from app.auth import get_current_user
from app.db import get_session
from app.models import User
from app.observability import get_logger, log_event
from app.rate_limit import rate_limit
from app.schemas import AIGenerateJsonResponse, AIGenerateRequest, AIGenerateResponse
from app.subscription import enforce_ai_generation, record_ai_generation

router = APIRouter(prefix="/ai", tags=["ai"])
logger = get_logger("planifiweb.ai")


def _strip_fences(content: str) -> str:
    return content.replace("```json", "").replace("```", "").strip()


def _extract_json(content: str) -> dict:
    cleaned = _strip_fences(content)
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    if start == -1:
        raise ValueError("No JSON object found in AI response")

    depth = 0
    for index in range(start, len(cleaned)):
        char = cleaned[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                candidate = cleaned[start : index + 1]
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed
                break
    raise ValueError("AI response did not contain valid JSON")


@router.post("/generate", response_model=AIGenerateResponse)
async def generate_text(
    payload: AIGenerateRequest,
    _: None = Depends(rate_limit("ai-generate", limit=45, window_seconds=60)),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    enforce_ai_generation(session, current_user)
    client = AIClient()
    try:
        content, provider, model = await client.generate(
            prompt=payload.prompt,
            system=payload.system,
            max_tokens=payload.max_tokens,
            temperature=payload.temperature,
            json_mode=False,
        )
    except AIClientError as exc:
        log_event(
            logger,
            "ai.generate.failed",
            user_id=current_user.id,
            module=payload.module,
            operation=payload.operation,
            error=str(exc),
        )
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    usage = record_ai_generation(
        session,
        current_user,
        module=payload.module,
        operation=payload.operation,
        prompt_chars=len(payload.prompt),
        response_chars=len(content),
        was_json=False,
    )
    return AIGenerateResponse(
        content=content,
        provider=provider,
        model=model,
        usage=usage,
    )


@router.post("/generate-json", response_model=AIGenerateJsonResponse)
async def generate_json(
    payload: AIGenerateRequest,
    _: None = Depends(rate_limit("ai-generate-json", limit=45, window_seconds=60)),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    enforce_ai_generation(session, current_user)
    client = AIClient()
    try:
        content, provider, model = await client.generate(
            prompt=payload.prompt,
            system=payload.system,
            max_tokens=payload.max_tokens,
            temperature=payload.temperature,
            json_mode=True,
        )
        parsed = _extract_json(content)
    except AIClientError as exc:
        log_event(
            logger,
            "ai.generate_json.failed",
            user_id=current_user.id,
            module=payload.module,
            operation=payload.operation,
            error=str(exc),
        )
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        log_event(
            logger,
            "ai.generate_json.parse_failed",
            user_id=current_user.id,
            module=payload.module,
            operation=payload.operation,
            error=str(exc),
        )
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    usage = record_ai_generation(
        session,
        current_user,
        module=payload.module,
        operation=payload.operation,
        prompt_chars=len(payload.prompt),
        response_chars=len(content),
        was_json=True,
    )
    return AIGenerateJsonResponse(
        data=parsed,
        provider=provider,
        model=model,
        usage=usage,
    )
