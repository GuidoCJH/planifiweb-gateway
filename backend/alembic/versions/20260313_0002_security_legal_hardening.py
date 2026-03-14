"""security and legal hardening

Revision ID: 20260313_0002
Revises: 20260312_0001
Create Date: 2026-03-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260313_0002"
down_revision: Union[str, Sequence[str], None] = "20260312_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user", sa.Column("terms_accepted_at", sa.DateTime(), nullable=True))
    op.add_column("user", sa.Column("privacy_accepted_at", sa.DateTime(), nullable=True))
    op.add_column("user", sa.Column("accepted_terms_version", sa.String(length=32), nullable=True))
    op.add_column("user", sa.Column("accepted_privacy_version", sa.String(length=32), nullable=True))

    op.add_column("payment", sa.Column("receipt_filename", sa.String(length=255), nullable=True))
    op.add_column("payment", sa.Column("receipt_content_type", sa.String(length=120), nullable=True))

    op.execute("UPDATE payment SET receipt_filename = 'receipt.jpg' WHERE receipt_filename IS NULL")
    op.execute(
        "UPDATE payment SET receipt_content_type = 'application/octet-stream' "
        "WHERE receipt_content_type IS NULL"
    )

    with op.batch_alter_table("payment") as batch_op:
        batch_op.alter_column("receipt_filename", existing_type=sa.String(length=255), nullable=False)
        batch_op.alter_column("receipt_content_type", existing_type=sa.String(length=120), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("payment") as batch_op:
        batch_op.drop_column("receipt_content_type")
        batch_op.drop_column("receipt_filename")

    with op.batch_alter_table("user") as batch_op:
        batch_op.drop_column("accepted_privacy_version")
        batch_op.drop_column("accepted_terms_version")
        batch_op.drop_column("privacy_accepted_at")
        batch_op.drop_column("terms_accepted_at")
