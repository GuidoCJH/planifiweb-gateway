import argparse
import base64
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, urlunparse

import sqlalchemy as sa
from sqlalchemy import text


BACKUP_TABLES = [
    "user",
    "subscription",
    "payment",
    "stored_receipt",
    "aiusagedaily",
    "aigenerationlog",
    "password_reset_token",
    "rate_limit_window",
]


def normalize_sqlalchemy_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return "postgresql+psycopg2://" + url[len("postgresql://") :]
    return url


def serialize_value(value: Any) -> Any:
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, memoryview):
        value = value.tobytes()
    if isinstance(value, bytes):
        return {"base64": base64.b64encode(value).decode("ascii")}
    return value


def rows_to_jsonable(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {key: serialize_value(value) for key, value in row.items()}
        for row in rows
    ]


def fetch_rows(conn: sa.Connection, sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    return [dict(row) for row in conn.execute(text(sql), params or {}).mappings().all()]


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, payload: Any) -> None:
    ensure_parent(path)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def backup_source(conn: sa.Connection, output_path: Path) -> None:
    payload: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tables": {},
    }
    for table in BACKUP_TABLES:
        rows = fetch_rows(conn, f'SELECT * FROM "{table}" ORDER BY 1')
        payload["tables"][table] = {
            "count": len(rows),
            "rows": rows_to_jsonable(rows),
        }
    write_json(output_path, payload)


def get_admin_snapshot(conn: sa.Connection, admin_email: str) -> tuple[dict[str, Any], dict[str, Any] | None]:
    user = conn.execute(
        text(
            """
            SELECT
              id,
              email,
              name,
              hashed_password,
              is_admin,
              subscription_status,
              subscription_scope,
              active_plan,
              subscription_expires_at,
              terms_accepted_at,
              privacy_accepted_at,
              accepted_terms_version,
              accepted_privacy_version,
              created_at
            FROM "user"
            WHERE lower(email) = lower(:email)
            LIMIT 1
            """
        ),
        {"email": admin_email},
    ).mappings().first()
    if not user:
        raise SystemExit(f"No se encontró el admin {admin_email} en la base origen.")

    subscription = conn.execute(
        text(
            """
            SELECT
              id,
              user_id,
              product_code,
              plan_type,
              status,
              is_active,
              start_date,
              end_date,
              source_payment_id
            FROM subscription
            WHERE user_id = :user_id
            ORDER BY id
            LIMIT 1
            """
        ),
        {"user_id": user["id"]},
    ).mappings().first()
    return dict(user), dict(subscription) if subscription else None


def ensure_target_schema_state(conn: sa.Connection) -> None:
    count = conn.execute(text('SELECT count(*) FROM "user"')).scalar_one()
    if count != 0:
        raise SystemExit("La base destino no está vacía en la tabla user. Abortando para no mezclar datos.")


def migrate_admin(conn: sa.Connection, admin: dict[str, Any], subscription: dict[str, Any] | None) -> None:
    conn.execute(
        text(
            """
            INSERT INTO "user" (
              id,
              email,
              name,
              hashed_password,
              is_admin,
              subscription_status,
              subscription_scope,
              active_plan,
              subscription_expires_at,
              terms_accepted_at,
              privacy_accepted_at,
              accepted_terms_version,
              accepted_privacy_version,
              created_at
            ) VALUES (
              :id,
              :email,
              :name,
              :hashed_password,
              :is_admin,
              :subscription_status,
              :subscription_scope,
              :active_plan,
              :subscription_expires_at,
              :terms_accepted_at,
              :privacy_accepted_at,
              :accepted_terms_version,
              :accepted_privacy_version,
              :created_at
            )
            """
        ),
        admin,
    )

    subscription_row = subscription or {
        "id": 1,
        "user_id": admin["id"],
        "product_code": admin["subscription_scope"] or "planifiweb",
        "plan_type": admin["active_plan"] or "planifiweb_pro",
        "status": "active",
        "is_active": True,
        "start_date": admin["created_at"],
        "end_date": admin["subscription_expires_at"],
        "source_payment_id": None,
    }

    conn.execute(
        text(
            """
            INSERT INTO subscription (
              id,
              user_id,
              product_code,
              plan_type,
              status,
              is_active,
              start_date,
              end_date,
              source_payment_id
            ) VALUES (
              :id,
              :user_id,
              :product_code,
              :plan_type,
              :status,
              :is_active,
              :start_date,
              :end_date,
              :source_payment_id
            )
            """
        ),
        subscription_row,
    )

    conn.execute(
        text(
            """SELECT setval(pg_get_serial_sequence('"user"', 'id'), COALESCE((SELECT max(id) FROM "user"), 1), true)"""
        )
    )
    conn.execute(
        text(
            """SELECT setval(pg_get_serial_sequence('subscription', 'id'), COALESCE((SELECT max(id) FROM subscription), 1), true)"""
        )
    )


def validate_target(conn: sa.Connection, admin_email: str) -> None:
    user_count = conn.execute(text('SELECT count(*) FROM "user"')).scalar_one()
    admin_row = conn.execute(
        text('SELECT email, is_admin, subscription_status, active_plan FROM "user" WHERE lower(email)=lower(:email)'),
        {"email": admin_email},
    ).mappings().first()
    sub_count = conn.execute(text("SELECT count(*) FROM subscription")).scalar_one()
    if user_count != 1:
        raise SystemExit(f"Se esperaban 1 usuarios en destino y hay {user_count}.")
    if not admin_row or not admin_row["is_admin"]:
        raise SystemExit("La cuenta admin no quedó bien migrada en destino.")
    if sub_count != 1:
        raise SystemExit(f"Se esperaba 1 suscripción en destino y hay {sub_count}.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Migra solo la cuenta admin desde PostgreSQL origen a destino.")
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--target-url", required=True)
    parser.add_argument("--admin-email", required=True)
    parser.add_argument("--backup-file", required=True)
    args = parser.parse_args()

    source_engine = sa.create_engine(normalize_sqlalchemy_url(args.source_url))
    target_engine = sa.create_engine(normalize_sqlalchemy_url(args.target_url))

    with source_engine.connect() as source_conn:
        backup_source(source_conn, Path(args.backup_file))
        admin, subscription = get_admin_snapshot(source_conn, args.admin_email)

    with target_engine.begin() as target_conn:
        ensure_target_schema_state(target_conn)
        migrate_admin(target_conn, admin, subscription)

    with target_engine.connect() as target_conn:
        validate_target(target_conn, args.admin_email)

    print("Migración admin-only completada.")


if __name__ == "__main__":
    main()
