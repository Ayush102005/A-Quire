"""struggle_monitor_additions

Revision ID: f04b3b12d3a2
Revises: 741d2a953fa1
Create Date: 2026-07-03 01:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f04b3b12d3a2"
down_revision: Union[str, Sequence[str], None] = "741d2a953fa1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "struggle_events",
        sa.Column("course_id", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "struggle_events",
        sa.Column("event_type", sa.String(length=64), nullable=False, server_default="general_confusion"),
    )
    op.add_column(
        "struggle_events",
        sa.Column("severity", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "struggle_events",
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "struggle_events",
        sa.Column("status", sa.String(length=32), nullable=False, server_default="new"),
    )
    op.add_column(
        "struggle_events",
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.add_column(
        "struggle_events",
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "mentor_interventions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("struggle_event_id", sa.Integer(), nullable=False),
        sa.Column("mentor_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["mentor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["struggle_event_id"], ["struggle_events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_mentor_interventions_struggle_event_id"),
        "mentor_interventions",
        ["struggle_event_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_mentor_interventions_mentor_id"),
        "mentor_interventions",
        ["mentor_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_mentor_interventions_mentor_id"), table_name="mentor_interventions")
    op.drop_index(op.f("ix_mentor_interventions_struggle_event_id"), table_name="mentor_interventions")
    op.drop_table("mentor_interventions")
    op.drop_column("struggle_events", "detected_at")
    op.drop_column("struggle_events", "notes")
    op.drop_column("struggle_events", "status")
    op.drop_column("struggle_events", "confidence_score")
    op.drop_column("struggle_events", "severity")
    op.drop_column("struggle_events", "event_type")
    op.drop_column("struggle_events", "course_id")
