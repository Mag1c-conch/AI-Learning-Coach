"""merge heads

Revision ID: 87ba6fc0fd42
Revises: 3fc361ce5cbf, b5a1f9972d0c
Create Date: 2025-11-06 23:55:53.409564

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '87ba6fc0fd42'
down_revision = ('3fc361ce5cbf', 'b5a1f9972d0c')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
