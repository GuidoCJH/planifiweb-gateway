from collections import defaultdict
from threading import Lock
from time import time

from fastapi import HTTPException, Request, status
from redis import Redis
from redis.exceptions import RedisError

from app.config import get_settings
from app.observability import get_logger, log_event

_request_log: dict[tuple[str, str], list[float]] = defaultdict(list)
_lock = Lock()
_redis_client: Redis | None = None
logger = get_logger("planifiweb.rate_limit")


def _request_identity(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _get_redis_client() -> Redis | None:
    global _redis_client
    settings = get_settings()
    if not settings.redis_url:
        return None
    if _redis_client is None:
        _redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


def _apply_local_rate_limit(bucket: str, identity: str, limit: int, window_seconds: int) -> None:
    now = time()
    key = (bucket, identity)

    with _lock:
        active_hits = [hit for hit in _request_log.get(key, []) if hit > now - window_seconds]
        if len(active_hits) >= limit:
            retry_after = max(1, int(window_seconds - (now - active_hits[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Too many requests for {bucket}. "
                    f"Try again in {retry_after} seconds."
                ),
                headers={"Retry-After": str(retry_after)},
            )

        active_hits.append(now)
        _request_log[key] = active_hits


def _apply_redis_rate_limit(bucket: str, identity: str, limit: int, window_seconds: int) -> None:
    redis_client = _get_redis_client()
    if redis_client is None:
        _apply_local_rate_limit(bucket, identity, limit, window_seconds)
        return

    current_window = int(time() // window_seconds)
    key = f"rate-limit:{bucket}:{identity}:{current_window}"

    try:
        current_hits = int(redis_client.incr(key))
        if current_hits == 1:
            redis_client.expire(key, window_seconds + 1)
        if current_hits > limit:
            retry_after = max(redis_client.ttl(key), 1)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Too many requests for {bucket}. "
                    f"Try again in {retry_after} seconds."
                ),
                headers={"Retry-After": str(retry_after)},
            )
    except RedisError as exc:
        log_event(
            logger,
            "rate_limit.redis_fallback",
            bucket=bucket,
            identity=identity,
            error=str(exc),
        )
        _apply_local_rate_limit(bucket, identity, limit, window_seconds)


def get_rate_limit_backend() -> str:
    settings = get_settings()
    return "redis" if settings.redis_url else "memory"


def rate_limit(bucket: str, limit: int, window_seconds: int):
    def dependency(request: Request) -> None:
        identity = _request_identity(request)
        _apply_redis_rate_limit(bucket, identity, limit, window_seconds)

    return dependency
