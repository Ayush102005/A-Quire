"""
scripts/sync_transcripts.py
---------------------------
Syncs transcripts from seed_data.json into existing Lesson records
in PostgreSQL / SQLite.
"""
import asyncio
import json
from pathlib import Path
import sys

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.lesson import Lesson

DATA_FILE = backend_dir / "seed_data.json"

async def sync():
    if not DATA_FILE.exists():
        print(f"[-] {DATA_FILE} not found!")
        return

    print(f"[*] Reading {DATA_FILE}...")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    lesson_rows = data.get("lessons", [])
    async with AsyncSessionLocal() as session:
        updated = 0
        for row in lesson_rows:
            raw_t = row.get("transcript")
            if not raw_t:
                continue
            t = json.loads(raw_t) if isinstance(raw_t, str) else raw_t
            
            lesson = await session.scalar(select(Lesson).where(Lesson.id == row["id"]))
            if lesson:
                lesson.transcript = t
                if row.get("video_url"):
                    lesson.video_url = row["video_url"]
                if row.get("title"):
                    lesson.title = row["title"]
                updated += 1
                print(f"[+] Updated Lesson {lesson.id} ({lesson.title}) with {len(t)} segments")

        from app.models.module import Module
        for mod_row in data.get("modules", []):
            mod = await session.scalar(select(Module).where(Module.id == mod_row["id"]))
            if mod and mod_row.get("title"):
                mod.title = mod_row["title"]
                print(f"[+] Updated Module {mod.id} ({mod.title})")
        
        await session.commit()
        print(f"[SUCCESS] Synced transcripts for {updated} lessons!")

if __name__ == "__main__":
    asyncio.run(sync())
