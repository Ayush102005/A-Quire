"""
app/models/mentor_intervention.py
─────────────────────────────────
Optional follow-up action records created when a struggle event needs mentor support.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.struggle_event import StruggleEvent
    from app.models.student import User


class MentorIntervention(Base):
    __tablename__ = "mentor_interventions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    struggle_event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("struggle_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    mentor_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    action: Mapped[str] = mapped_column(String(128), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", server_default="pending")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )

    struggle_event: Mapped["StruggleEvent"] = relationship(
        "StruggleEvent",
        back_populates="mentor_interventions",
        lazy="select",
    )
    mentor: Mapped["User | None"] = relationship("User", lazy="select")

    def __repr__(self) -> str:
        return (
            f"<MentorIntervention id={self.id} event={self.struggle_event_id}"
            f" status={self.status!r}>"
        )
