"""add file_type and week_number to materials

Revision ID: 9b1e4c2f8a3a
Revises: e4c8e8f1b60e
Create Date: 2025-10-30

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9b1e4c2f8a3a'
down_revision = 'e4c8e8f1b60e'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = []
    try:
        cols = [c['name'] for c in inspector.get_columns('materials')]
    except Exception:
        cols = []

    with op.batch_alter_table('materials') as batch_op:
        if 'file_type' not in cols:
            batch_op.add_column(sa.Column('file_type', sa.String(length=50), nullable=True))
        if 'week_number' not in cols:
            batch_op.add_column(sa.Column('week_number', sa.Integer(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = []
    try:
        cols = [c['name'] for c in inspector.get_columns('materials')]
    except Exception:
        cols = []

    with op.batch_alter_table('materials') as batch_op:
        if 'week_number' in cols:
            batch_op.drop_column('week_number')
        if 'file_type' in cols:
            batch_op.drop_column('file_type')


