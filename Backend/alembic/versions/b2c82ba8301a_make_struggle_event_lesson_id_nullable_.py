"""make struggle_event lesson_id nullable, add problem_id

Revision ID: b2c82ba8301a
Revises: b5a197b2478f
Create Date: 2026-08-23 16:33:13.458182

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c82ba8301a'
down_revision: Union[str, Sequence[str], None] = 'b5a197b2478f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('struggle_events') as batch_op:
        batch_op.add_column(sa.Column('problem_id', sa.String(length=128), nullable=True))
        batch_op.alter_column('lesson_id', existing_type=sa.INTEGER(), nullable=True)
        batch_op.create_check_constraint(
            'ck_struggle_event_exactly_one_target',
            '(lesson_id IS NOT NULL) != (problem_id IS NOT NULL)'
        )
    op.create_index(op.f('ix_struggle_events_problem_id'), 'struggle_events', ['problem_id'], unique=False)
    op.create_index('ix_struggle_student_problem', 'struggle_events', ['user_id', 'problem_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_struggle_student_problem', table_name='struggle_events')
    op.drop_index(op.f('ix_struggle_events_problem_id'), table_name='struggle_events')
    with op.batch_alter_table('struggle_events') as batch_op:
        batch_op.drop_constraint('ck_struggle_event_exactly_one_target', type_='check')
        batch_op.alter_column('lesson_id', existing_type=sa.INTEGER(), nullable=False)
        batch_op.drop_column('problem_id')
    # ### end Alembic commands ###
