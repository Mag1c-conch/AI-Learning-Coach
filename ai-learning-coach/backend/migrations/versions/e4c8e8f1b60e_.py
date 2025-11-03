"""empty message

Revision ID: e4c8e8f1b60e
Revises: 
Create Date: 2025-10-26 16:46:53.599449

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e4c8e8f1b60e'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Make operation idempotent: only drop old column if it exists; add uploaded_at if missing
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = []
    try:
        cols = [c['name'] for c in inspector.get_columns('materials')]
    except Exception:
        cols = []

    with op.batch_alter_table('materials', schema=None) as batch_op:
        if 'uploaded_at' not in cols:
            batch_op.add_column(sa.Column('uploaded_at', sa.DateTime(), nullable=True))
        if 'upload_at' in cols:
            batch_op.drop_column('upload_at')


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = []
    try:
        cols = [c['name'] for c in inspector.get_columns('materials')]
    except Exception:
        cols = []

    with op.batch_alter_table('materials', schema=None) as batch_op:
        if 'upload_at' not in cols:
            batch_op.add_column(sa.Column('upload_at', sa.DATETIME(), nullable=True))
        if 'uploaded_at' in cols:
            batch_op.drop_column('uploaded_at')
