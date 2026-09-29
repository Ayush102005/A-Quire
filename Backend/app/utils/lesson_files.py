"""
app/utils/lesson_files.py
───────────────────────────
Local-disk storage for lesson PDFs (study material).

Files are saved under Backend/uploads/lesson_pdfs/, named by lesson id so a
re-upload cleanly replaces the previous file. The DB only ever stores the
resulting relative path (Lesson.pdf_path) plus the original filename
(Lesson.pdf_filename, for display) — never anything derived from untrusted
user input goes into a filesystem path.
"""
from __future__ import annotations

import re
from pathlib import Path

# Backend/uploads/lesson_pdfs — sibling of app/, not inside it, so it isn't
# swept up by anything that only expects to find source under app/.
UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent / "uploads" / "lesson_pdfs"

MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


def ensure_upload_dir() -> None:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def lesson_pdf_path(lesson_id: int) -> Path:
    """The on-disk path a given lesson's PDF is (or would be) stored at.

    Named by lesson id alone (not the uploaded filename) so re-uploads
    overwrite in place and no user-supplied string ever reaches the
    filesystem path.
    """
    return UPLOAD_ROOT / f"lesson_{lesson_id}.pdf"


def safe_display_filename(original_filename: str | None) -> str:
    """Sanitize an uploaded filename for storage/display only (never used as
    a path) — strips directory components and anything but a conservative
    character set, so it's safe to echo back in JSON/headers.
    """
    name = (original_filename or "material.pdf").strip()
    name = name.replace("\\", "/").split("/")[-1]  # drop any directory component
    name = re.sub(r"[^A-Za-z0-9 ._-]", "_", name)
    name = name[:255].strip() or "material.pdf"
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    return name


def delete_lesson_pdf(lesson_id: int) -> None:
    path = lesson_pdf_path(lesson_id)
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass
