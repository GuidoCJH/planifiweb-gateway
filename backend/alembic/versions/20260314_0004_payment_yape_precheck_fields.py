"""payment yape precheck fields

Revision ID: 20260314_0004
Revises: 20260313_0003
Create Date: 2026-03-14
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260314_0004"
down_revision: Union[str, Sequence[str], None] = "20260313_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payment",
        sa.Column("ai_extracted_destination_name_masked", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "payment",
        sa.Column("ai_extracted_phone_last3", sa.String(length=3), nullable=True),
    )
    op.add_column(
        "payment",
        sa.Column("ai_extracted_security_code", sa.String(length=32), nullable=True),
    )


def downgrade() -> None:
    with op.batch_alter_table("payment") as batch_op:
        batch_op.drop_column("ai_extracted_security_code")
        batch_op.drop_column("ai_extracted_phone_last3")
        batch_op.drop_column("ai_extracted_destination_name_masked")
