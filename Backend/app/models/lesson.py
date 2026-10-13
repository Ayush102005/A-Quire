"""
app/models/lesson.py
─────────────────────
A Lesson belongs to a Module and contains a video and metadata.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.module import Module
    from app.models.progress import Progress
    from app.models.struggle_event import StruggleEvent


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    module_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("modules.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)

    video_url: Mapped[str | None] = mapped_column(String(2048), nullable=True, default=None)

    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    
    transcript: Mapped[list[dict] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), 
        nullable=True, 
        default=None,
        comment="JSON array of transcript segments"
    )

    order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    lesson_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="video", server_default="video",
        comment="video | dsa | jee | neet",
    )

    problem_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None,
        comment="External problem ID for DSA lessons",
    )
    
    category: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    difficulty: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    problem_statement: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    examples: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    constraints: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    approaches: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    code_solutions: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    complexity_time: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    complexity_space: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    external_links: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    # ── Study material (PDF + instructor notes) ───────────────────────────────
    pdf_path: Mapped[str | None] = mapped_column(
        String(512), nullable=True, default=None,
        comment="Path (relative to the uploads directory) to the lesson's uploaded PDF",
    )
    pdf_filename: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None,
        comment="Original filename of the uploaded PDF, for display",
    )
    test_cases: Mapped[list[dict] | None] = mapped_column(
        JSON().with_variant(JSONB, 'postgresql'),
        nullable=True,
        default=None,
    )

    notes_content: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None,
        comment="Instructor-authored reading notes for this lesson (shown to every student)",
    )

    # ── Relationships ───────────────────────────────────────────────────────
    module: Mapped[Module] = relationship("Module", back_populates="lessons", lazy="select")

    progress_records: Mapped[list[Progress]] = relationship(
        "Progress", back_populates="lesson",
        cascade="all, delete-orphan", lazy="select",
    )

    struggle_events: Mapped[list[StruggleEvent]] = relationship(
        "StruggleEvent", back_populates="lesson",
        cascade="all, delete-orphan", lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Lesson id={self.id} module_id={self.module_id} order={self.order}>"
