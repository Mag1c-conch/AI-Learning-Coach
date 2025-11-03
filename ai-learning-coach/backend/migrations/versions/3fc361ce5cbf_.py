"""empty message

Revision ID: 3fc361ce5cbf
Revises: e4c8e8f1b60e
Create Date: 2025-10-26 21:04:17.021974

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3fc361ce5cbf'
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

    with op.batch_alter_table('materials', schema=None) as batch_op:
        if 'file_size' not in cols:
            batch_op.add_column(sa.Column('file_size', sa.Integer(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = []
    try:
        cols = [c['name'] for c in inspector.get_columns('materials')]
    except Exception:
        cols = []

    with op.batch_alter_table('materials', schema=None) as batch_op:
        if 'file_size' in cols:
            batch_op.drop_column('file_size')
