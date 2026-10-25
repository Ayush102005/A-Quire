"""
scripts/update_all_transcripts.py
---------------------------------
Iterates over ALL lessons in PostgreSQL / SQLite that have a `video_url`.
Fetches transcripts for each one using the configured proxy and updates the database.

Usage:
  python scripts/update_all_transcripts.py          # only updates lessons missing transcripts
  python scripts/update_all_transcripts.py --force  # re-fetches for ALL video lessons
"""
import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.lesson import Lesson
from app.utils.youtube import fetch_youtube_transcript

async def run(force: bool = False):
    async with AsyncSessionLocal() as session:
        stmt = select(Lesson).where(Lesson.video_url.isnot(None)).order_by(Lesson.id)
        result = await session.execute(stmt)
        lessons = result.scalars().all()

        print(f"[*] Found {len(lessons)} lesson(s) with video URLs in the database.")

        updated = 0
        skipped = 0
        failed = 0

        for l in lessons:
            has_existing = bool(l.transcript and len(l.transcript) > 0)
            if has_existing and not force:
                print(f"[SKIP] Lesson {l.id} ('{l.title}') already has {len(l.transcript)} segments. (Use --force to overwrite)")
                skipped += 1
                continue

            print(f"[*] Fetching transcript for Lesson {l.id} ('{l.title}') -> {l.video_url} ...")
            try:
                transcript = fetch_youtube_transcript(l.video_url)
                if transcript:
                    l.transcript = transcript
                    updated += 1
                    print(f"    [+] SUCCESS: Updated Lesson {l.id} with {len(transcript)} segments.")
                else:
                    failed += 1
                    print(f"    [-] FAILED: No transcript found or subtitles disabled for {l.video_url}")
            except Exception as e:
                failed += 1
                print(f"    [-] ERROR for Lesson {l.id}: {e}")

        await session.commit()
        print(f"\n[DONE] Finished! Updated: {updated}, Skipped: {skipped}, Failed: {failed}")

if __name__ == "__main__":
    force_flag = "--force" in sys.argv
    asyncio.run(run(force=force_flag))
