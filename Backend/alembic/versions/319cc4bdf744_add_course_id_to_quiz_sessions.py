"""Add course_id to quiz_sessions

Revision ID: 319cc4bdf744
Revises: b8517327cf4d
Create Date: 2026-08-19 17:11:43.646091

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '319cc4bdf744'
down_revision: Union[str, Sequence[str], None] = 'b8517327cf4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('quiz_sessions') as batch_op:
        batch_op.add_column(
            sa.Column(
                'course_id', sa.Integer(), nullable=True,
                comment='Course this quiz was launched from, if any — nullable since the AMATTA '
                        'Topic/Question system has no inherent link to Course; NULL for sessions '
                        'started outside a course context or before this column existed.',
            )
        )
        batch_op.create_foreign_key(
            'fk_quiz_sessions_course_id_courses', 'courses',
            ['course_id'], ['id'], ondelete='SET NULL',
        )
    op.create_index(op.f('ix_quiz_sessions_course_id'), 'quiz_sessions', ['course_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_quiz_sessions_course_id_courses', 'quiz_sessions', type_='foreignkey')
    op.drop_index(op.f('ix_quiz_sessions_course_id'), table_name='quiz_sessions')
    op.drop_column('quiz_sessions', 'course_id')
