import asyncio
from app.db.session import AsyncSessionLocal
from app.models.lesson import Lesson
from sqlalchemy import select
from app.utils.youtube import fetch_youtube_transcript

async def run():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Lesson).where(Lesson.video_url != None).limit(1))
        l = res.scalars().first()
        if l:
            transcript = fetch_youtube_transcript(l.video_url)
            if transcript:
                l.transcript = transcript
                await db.commit()
                print(f"Updated lesson {l.id} with {len(transcript)} segments")
            else:
                print("No transcript found")
        else:
            print("No video lesson found")

asyncio.run(run())
