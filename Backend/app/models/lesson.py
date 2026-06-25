# Lesson model is now defined in app.models.course for co-location with Course and Module.
# Re-export for backward compatibility.
from app.models.course import Lesson  # noqa: F401

__all__ = ["Lesson"]
