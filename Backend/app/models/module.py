# Module model is now defined in app.models.course for co-location with Course and Lesson.
# Re-export for backward compatibility.
from app.models.course import Module  # noqa: F401

__all__ = ["Module"]
