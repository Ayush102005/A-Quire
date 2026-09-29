import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.courses import _load_course

async def run():
    async with AsyncSessionLocal() as db:
        # Load course 1
        course = await _load_course(db, course_id=1, with_content=True)
        print(f"Course 1 has {len(course.modules)} modules.")
        for m in course.modules:
            print(f"Module {m.id} has {len(m.lessons)} lessons.")
            
        course.is_published = True
        await db.flush()
        print(f"After flush, course has {len(course.modules)} modules.")
        
if __name__ == "__main__":
    asyncio.run(run())
