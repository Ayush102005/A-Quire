"""Add lesson_id to quiz_sessions

Revision ID: c4d5e6f7a8b9
Revises: 319cc4bdf744
Create Date: 2026-08-19 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = '319cc4bdf744'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('quiz_sessions') as batch_op:
        batch_op.add_column(
            sa.Column(
                'lesson_id', sa.Integer(), nullable=True,
                comment='Lesson this quiz was launched from, if any — nullable since the AMATTA '
                        'Topic/Question system has no inherent link to Lesson; NULL for sessions '
                        'started outside a lesson context.',
            )
        )
        batch_op.create_foreign_key(
            'fk_quiz_sessions_lesson_id_lessons', 'lessons',
            ['lesson_id'], ['id'], ondelete='SET NULL',
        )
    op.create_index(op.f('ix_quiz_sessions_lesson_id'), 'quiz_sessions', ['lesson_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_quiz_sessions_lesson_id_lessons', 'quiz_sessions', type_='foreignkey')
    op.drop_index(op.f('ix_quiz_sessions_lesson_id'), table_name='quiz_sessions')
    op.drop_column('quiz_sessions', 'lesson_id')
