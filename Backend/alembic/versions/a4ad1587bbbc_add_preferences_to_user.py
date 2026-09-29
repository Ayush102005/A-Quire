"""Add preferences to user

Revision ID: a4ad1587bbbc
Revises: 20e070b79283
Create Date: 2026-08-14 20:24:06.352065

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4ad1587bbbc'
down_revision: Union[str, Sequence[str], None] = '20e070b79283'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('preferences', sa.JSON(), nullable=True))

    op.execute("UPDATE users SET preferences = '{}' WHERE preferences IS NULL")

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('preferences', nullable=False, server_default='{}')


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('preferences')
