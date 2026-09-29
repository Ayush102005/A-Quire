import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.courses import _load_course
from app.schemas.course import CourseResponse

async def run():
    async with AsyncSessionLocal() as db:
        course = await _load_course(db, course_id=13, with_content=True)
        course.is_published = True
        await db.flush()
        
        # Serialize with Pydantic
        resp = CourseResponse.model_validate(course)
        print("Serialized modules count:", len(resp.modules))
        print("Serialized:", resp.model_dump_json(indent=2))

if __name__ == "__main__":
    asyncio.run(run())
