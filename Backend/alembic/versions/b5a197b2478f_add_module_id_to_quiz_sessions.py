"""Add module_id to quiz_sessions

Revision ID: b5a197b2478f
Revises: c4d5e6f7a8b9
Create Date: 2026-08-22 13:09:15.363690

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5a197b2478f'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('quiz_sessions') as batch_op:
        batch_op.add_column(sa.Column('module_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_quiz_sessions_module_id_modules', 'modules', ['module_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_quiz_sessions_module_id'), 'quiz_sessions', ['module_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_quiz_sessions_module_id'), table_name='quiz_sessions')
    with op.batch_alter_table('quiz_sessions') as batch_op:
        batch_op.drop_constraint('fk_quiz_sessions_module_id_modules', type_='foreignkey')
        batch_op.drop_column('module_id')
