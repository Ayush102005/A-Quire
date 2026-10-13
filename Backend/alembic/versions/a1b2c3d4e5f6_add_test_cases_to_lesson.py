from __future__ import annotations
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'a1b2c3d4e5f6'
down_revision = 'f323c1f1f0a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'lessons',
        sa.Column(
            'test_cases',
            sa.JSON().with_variant(postgresql.JSONB(), 'postgresql'),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column('lessons', 'test_cases')
