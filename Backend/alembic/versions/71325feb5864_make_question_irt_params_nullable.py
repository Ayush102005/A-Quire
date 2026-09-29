"""make question irt params nullable

Revision ID: 71325feb5864
Revises: b2c82ba8301a
Create Date: 2026-08-23 22:47:08.929574

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '71325feb5864'
down_revision: Union[str, Sequence[str], None] = 'b2c82ba8301a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('questions', 'difficulty_b', existing_type=sa.Float(), nullable=True)
    op.alter_column('questions', 'discrimination_a', existing_type=sa.Float(), nullable=True)
    op.alter_column('questions', 'guessing_c', existing_type=sa.Float(), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('questions', 'guessing_c', existing_type=sa.Float(), nullable=False)
    op.alter_column('questions', 'discrimination_a', existing_type=sa.Float(), nullable=False)
    op.alter_column('questions', 'difficulty_b', existing_type=sa.Float(), nullable=False)
