from collections import defaultdict
from datetime import datetime, timezone
import hashlib
from threading import Lock
from time import time

from fastapi import HTTPException, Request, status
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.db import engine
from app.models import RateLimitWindow
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


def _build_rate_limit_upsert_stmt(
    *,
    bucket: str,
    identity_hash: str,
    window_start: int,
    expires_at: datetime,
    now: datetime,
):
    table = RateLimitWindow.__table__
    values = {
        "bucket": bucket,
        "identity_hash": identity_hash,
        "window_start": window_start,
        "hits": 1,
        "expires_at": expires_at,
        "created_at": now,
        "updated_at": now,
    }

    dialect_name = engine.dialect.name
    if dialect_name == "postgresql":
        insert_stmt = pg_insert(table).values(**values)
    elif dialect_name == "sqlite":
        insert_stmt = sqlite_insert(table).values(**values)
    else:
        return None

    return insert_stmt.on_conflict_do_update(
        index_elements=[table.c.bucket, table.c.identity_hash, table.c.window_start],
        set_={
            "hits": table.c.hits + 1,
            "expires_at": expires_at,
            "updated_at": now,
        },
    )


def _apply_database_rate_limit(bucket: str, identity: str, limit: int, window_seconds: int) -> None:
    identity_hash = hashlib.sha256(identity.encode("utf-8")).hexdigest()
    current_window = int(time() // window_seconds)
    now = datetime.now(timezone.utc)
    expires_at = datetime.fromtimestamp((current_window + 1) * window_seconds, timezone.utc)
    table = RateLimitWindow.__table__
    upsert_stmt = _build_rate_limit_upsert_stmt(
        bucket=bucket,
        identity_hash=identity_hash,
        window_start=current_window,
        expires_at=expires_at,
        now=now,
    )

    if upsert_stmt is None:
        _apply_local_rate_limit(bucket, identity, limit, window_seconds)
        return

    try:
        with engine.begin() as connection:
            connection.execute(delete(table).where(table.c.expires_at < now))
            connection.execute(upsert_stmt)
            row = connection.execute(
                select(table.c.hits, table.c.expires_at).where(
                    table.c.bucket == bucket,
                    table.c.identity_hash == identity_hash,
                    table.c.window_start == current_window,
                )
            ).first()
    except SQLAlchemyError as exc:
        log_event(
            logger,
            "rate_limit.database_fallback",
            bucket=bucket,
            identity=identity,
            error=str(exc),
        )
        _apply_local_rate_limit(bucket, identity, limit, window_seconds)
        return

    if row is None:
        _apply_local_rate_limit(bucket, identity, limit, window_seconds)
        return

    hits, row_expires_at = row
    if hits > limit:
        if row_expires_at.tzinfo is None:
            row_expires_at = row_expires_at.replace(tzinfo=timezone.utc)
        retry_after = max(1, int((row_expires_at - now).total_seconds()))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Too many requests for {bucket}. "
                f"Try again in {retry_after} seconds."
            ),
            headers={"Retry-After": str(retry_after)},
        )


def get_rate_limit_backend() -> str:
    settings = get_settings()
    if settings.redis_url:
        return "redis"
    if settings.is_production:
        return "database"
    return "memory"


def rate_limit(bucket: str, limit: int, window_seconds: int):
    def dependency(request: Request) -> None:
        identity = _request_identity(request)
        settings = get_settings()
        if settings.redis_url:
            _apply_redis_rate_limit(bucket, identity, limit, window_seconds)
            return
        if settings.is_production:
            _apply_database_rate_limit(bucket, identity, limit, window_seconds)
            return
        _apply_local_rate_limit(bucket, identity, limit, window_seconds)

    return dependency
