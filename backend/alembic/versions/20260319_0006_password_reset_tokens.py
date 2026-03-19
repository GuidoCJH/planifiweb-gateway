"""password reset tokens

Revision ID: 20260319_0006
Revises: 20260314_0005
Create Date: 2026-03-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260319_0006"
down_revision: Union[str, Sequence[str], None] = "20260314_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "password_reset_token",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("requested_ip", sa.String(length=64), nullable=True),
        sa.Column("requested_user_agent", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(op.f("ix_password_reset_token_user_id"), "password_reset_token", ["user_id"], unique=False)
    op.create_index(op.f("ix_password_reset_token_token_hash"), "password_reset_token", ["token_hash"], unique=True)
    op.create_index(op.f("ix_password_reset_token_expires_at"), "password_reset_token", ["expires_at"], unique=False)
    op.create_index(op.f("ix_password_reset_token_used_at"), "password_reset_token", ["used_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_password_reset_token_used_at"), table_name="password_reset_token")
    op.drop_index(op.f("ix_password_reset_token_expires_at"), table_name="password_reset_token")
    op.drop_index(op.f("ix_password_reset_token_token_hash"), table_name="password_reset_token")
    op.drop_index(op.f("ix_password_reset_token_user_id"), table_name="password_reset_token")
    op.drop_table("password_reset_token")
