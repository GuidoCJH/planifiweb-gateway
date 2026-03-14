"""payment ai precheck and fraud review

Revision ID: 20260313_0003
Revises: 20260313_0002
Create Date: 2026-03-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260313_0003"
down_revision: Union[str, Sequence[str], None] = "20260313_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("payment", sa.Column("receipt_sha256", sa.String(length=64), nullable=True))
    op.add_column(
        "payment",
        sa.Column("ai_verification_status", sa.String(length=32), nullable=False, server_default="processing"),
    )
    op.add_column("payment", sa.Column("ai_confidence", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("payment", sa.Column("ai_summary", sa.Text(), nullable=True))
    op.add_column("payment", sa.Column("ai_extracted_amount", sa.Float(), nullable=True))
    op.add_column("payment", sa.Column("ai_extracted_method", sa.String(length=50), nullable=True))
    op.add_column("payment", sa.Column("ai_extracted_operation_code", sa.String(length=120), nullable=True))
    op.add_column("payment", sa.Column("ai_extracted_paid_at", sa.DateTime(), nullable=True))
    op.add_column("payment", sa.Column("ai_extracted_destination", sa.String(length=255), nullable=True))
    op.add_column(
        "payment",
        sa.Column("ai_duplicate_hash_match", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "payment",
        sa.Column("ai_duplicate_operation_match", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("payment", sa.Column("ai_raw_result_json", sa.Text(), nullable=True))
    op.add_column("payment", sa.Column("fraud_flagged_at", sa.DateTime(), nullable=True))
    op.add_column("payment", sa.Column("fraud_flagged_by", sa.Integer(), nullable=True))
    op.add_column("payment", sa.Column("fraud_reason", sa.Text(), nullable=True))

    op.execute(
        "UPDATE payment SET ai_verification_status = 'unavailable', ai_confidence = 0, "
        "ai_summary = 'Pago cargado antes de la prevalidacion IA.' "
        "WHERE ai_verification_status IS NULL OR ai_summary IS NULL"
    )

    op.create_index(op.f("ix_payment_receipt_sha256"), "payment", ["receipt_sha256"], unique=False)
    op.create_index(
        op.f("ix_payment_ai_extracted_operation_code"),
        "payment",
        ["ai_extracted_operation_code"],
        unique=False,
    )
    op.create_index(op.f("ix_payment_fraud_flagged_by"), "payment", ["fraud_flagged_by"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_payment_fraud_flagged_by"), table_name="payment")
    op.drop_index(op.f("ix_payment_ai_extracted_operation_code"), table_name="payment")
    op.drop_index(op.f("ix_payment_receipt_sha256"), table_name="payment")

    with op.batch_alter_table("payment") as batch_op:
        batch_op.drop_column("fraud_reason")
        batch_op.drop_column("fraud_flagged_by")
        batch_op.drop_column("fraud_flagged_at")
        batch_op.drop_column("ai_raw_result_json")
        batch_op.drop_column("ai_duplicate_operation_match")
        batch_op.drop_column("ai_duplicate_hash_match")
        batch_op.drop_column("ai_extracted_destination")
        batch_op.drop_column("ai_extracted_paid_at")
        batch_op.drop_column("ai_extracted_operation_code")
        batch_op.drop_column("ai_extracted_method")
        batch_op.drop_column("ai_extracted_amount")
        batch_op.drop_column("ai_summary")
        batch_op.drop_column("ai_confidence")
        batch_op.drop_column("ai_verification_status")
        batch_op.drop_column("receipt_sha256")
