"""
app/models/metrics.py
──────────────────────
Models for system measurement and feature flags.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base

class SystemMetrics(Base):
    """
    Privacy-safe aggregate metrics for Phase 5 tracking.
    """
    __tablename__ = "system_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    context: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Optional JSON or string context")
    version: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="Algorithm or threshold version")

    def __repr__(self) -> str:
        return f"<SystemMetric name={self.metric_name} value={self.metric_value} timestamp={self.timestamp}>"


class FeatureFlag(Base):
    """
    Configuration and feature flags for controlled rollout (Phase 6).
    """
    __tablename__ = "feature_flags"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value_bool: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    value_int: Mapped[int | None] = mapped_column(Integer, nullable=True)
    value_float: Mapped[float | None] = mapped_column(Float, nullable=True)
    value_str: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<FeatureFlag key={self.key}>"
