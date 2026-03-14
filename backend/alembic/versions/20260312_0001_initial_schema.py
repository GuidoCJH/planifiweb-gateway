"""initial schema

Revision ID: 20260312_0001
Revises:
Create Date: 2026-03-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260312_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "subscription_status",
            sa.String(length=50),
            nullable=False,
            server_default="awaiting_payment",
        ),
        sa.Column(
            "subscription_scope",
            sa.String(length=50),
            nullable=False,
            server_default="planifiweb",
        ),
        sa.Column("active_plan", sa.String(length=50), nullable=True),
        sa.Column("subscription_expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_email"), "user", ["email"], unique=True)

    op.create_table(
        "payment",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_code", sa.String(length=50), nullable=False, server_default="planifiweb"),
        sa.Column("plan", sa.String(length=50), nullable=False, server_default="planifiweb_pro"),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="PEN"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("payment_method", sa.String(length=50), nullable=False),
        sa.Column("receipt_key", sa.String(length=500), nullable=False),
        sa.Column("receipt_url", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payment_user_id"), "payment", ["user_id"], unique=False)
    op.create_index(op.f("ix_payment_reviewed_by"), "payment", ["reviewed_by"], unique=False)

    op.create_table(
        "subscription",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_code", sa.String(length=50), nullable=False, server_default="planifiweb"),
        sa.Column("plan_type", sa.String(length=50), nullable=False, server_default="planifiweb_pro"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="active"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("start_date", sa.DateTime(), nullable=False),
        sa.Column("end_date", sa.DateTime(), nullable=True),
        sa.Column("source_payment_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["source_payment_id"], ["payment.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subscription_user_id"), "subscription", ["user_id"], unique=False)

    op.create_table(
        "aiusagedaily",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("usage_date", sa.Date(), nullable=False),
        sa.Column("requests_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("limit_snapshot", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("subscription_status", sa.String(length=50), nullable=False, server_default="awaiting_payment"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_aiusagedaily_user_id"), "aiusagedaily", ["user_id"], unique=False)
    op.create_index(op.f("ix_aiusagedaily_usage_date"), "aiusagedaily", ["usage_date"], unique=False)

    op.create_table(
        "aigenerationlog",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("module", sa.String(length=100), nullable=False),
        sa.Column("operation", sa.String(length=100), nullable=False),
        sa.Column("prompt_chars", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("response_chars", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("was_json", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_aigenerationlog_user_id"), "aigenerationlog", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_aigenerationlog_user_id"), table_name="aigenerationlog")
    op.drop_table("aigenerationlog")

    op.drop_index(op.f("ix_aiusagedaily_usage_date"), table_name="aiusagedaily")
    op.drop_index(op.f("ix_aiusagedaily_user_id"), table_name="aiusagedaily")
    op.drop_table("aiusagedaily")

    op.drop_index(op.f("ix_subscription_user_id"), table_name="subscription")
    op.drop_table("subscription")

    op.drop_index(op.f("ix_payment_reviewed_by"), table_name="payment")
    op.drop_index(op.f("ix_payment_user_id"), table_name="payment")
    op.drop_table("payment")

    op.drop_index(op.f("ix_user_email"), table_name="user")
    op.drop_table("user")
