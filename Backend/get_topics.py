import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine('postgresql+asyncpg://aquire:aquire@localhost:5432/aquire_db')
async_session = async_sessionmaker(engine)

async def main():
    async with async_session() as s:
        from app.models.assessment import Topic
        res = (await s.execute(select(Topic.id, Topic.name))).all()
        print("TOPICS:", res)

asyncio.run(main())
