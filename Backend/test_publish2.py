import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.courses import _load_course
from app.models.module import Module
from app.models.course import Course

async def run():
    async with AsyncSessionLocal() as db:
        # Create a test course with a module
        course = Course(title="Test Course", exam_category="Test", instructor_id=1)
        db.add(course)
        await db.flush()
        
        module = Module(title="Test Module", course_id=course.id, order=1)
        db.add(module)
        await db.flush()
        
        c_id = course.id
        await db.commit()
        
    async with AsyncSessionLocal() as db:
        course = await _load_course(db, course_id=c_id, with_content=True)
        print(f"Course {c_id} has {len(course.modules)} modules.")
        
        course.is_published = True
        await db.flush()
        print(f"After flush, course {c_id} has {len(course.modules)} modules.")

if __name__ == "__main__":
    asyncio.run(run())
