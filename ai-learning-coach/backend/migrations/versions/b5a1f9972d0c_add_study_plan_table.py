"""add study plan table

Revision ID: b5a1f9972d0c
Revises: 9b1e4c2f8a3a
Create Date: 2025-11-05

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b5a1f9972d0c"
down_revision = "9b1e4c2f8a3a"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = []
    try:
        tables = inspector.get_table_names()
    except Exception:
        tables = []

    if "study_plans" not in tables:
        op.create_table(
            "study_plans",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("week_start", sa.Date(), nullable=False),
            sa.Column("week_end", sa.Date(), nullable=False),
            sa.Column("plan_payload", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("student_id", "week_start", name="uq_study_plans_student_week"),
        )
        op.create_index("ix_study_plans_student_id", "study_plans", ["student_id"])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = []
    try:
        tables = inspector.get_table_names()
    except Exception:
        tables = []

    if "study_plans" in tables:
        op.drop_index("ix_study_plans_student_id", table_name="study_plans")
        op.drop_table("study_plans")
