"""database fallbacks for receipts and rate limits

Revision ID: 20260314_0005
Revises: 20260314_0004
Create Date: 2026-03-14
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260314_0005"
down_revision: Union[str, Sequence[str], None] = "20260314_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stored_receipt",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(length=255), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=120), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stored_receipt_owner_user_id"), "stored_receipt", ["owner_user_id"], unique=False)
    op.create_index(op.f("ix_stored_receipt_storage_key"), "stored_receipt", ["storage_key"], unique=True)

    op.create_table(
        "rate_limit_window",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("bucket", sa.String(length=100), nullable=False),
        sa.Column("identity_hash", sa.String(length=64), nullable=False),
        sa.Column("window_start", sa.Integer(), nullable=False),
        sa.Column("hits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "bucket",
            "identity_hash",
            "window_start",
            name="uq_rate_limit_window_bucket_identity_window",
        ),
    )
    op.create_index(op.f("ix_rate_limit_window_bucket"), "rate_limit_window", ["bucket"], unique=False)
    op.create_index(op.f("ix_rate_limit_window_expires_at"), "rate_limit_window", ["expires_at"], unique=False)
    op.create_index(op.f("ix_rate_limit_window_identity_hash"), "rate_limit_window", ["identity_hash"], unique=False)
    op.create_index(op.f("ix_rate_limit_window_window_start"), "rate_limit_window", ["window_start"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_rate_limit_window_window_start"), table_name="rate_limit_window")
    op.drop_index(op.f("ix_rate_limit_window_identity_hash"), table_name="rate_limit_window")
    op.drop_index(op.f("ix_rate_limit_window_expires_at"), table_name="rate_limit_window")
    op.drop_index(op.f("ix_rate_limit_window_bucket"), table_name="rate_limit_window")
    op.drop_table("rate_limit_window")

    op.drop_index(op.f("ix_stored_receipt_storage_key"), table_name="stored_receipt")
    op.drop_index(op.f("ix_stored_receipt_owner_user_id"), table_name="stored_receipt")
    op.drop_table("stored_receipt")
