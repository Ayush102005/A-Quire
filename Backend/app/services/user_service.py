from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
from app.core.security import hash_password


class UserService:
    @staticmethod
    async def create_user(
        email: str,
        full_name: str,
        password: str,
        role: str,
        db: AsyncSession,
    ) -> User:
        """Create a new user"""
        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            role=role,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    
    @staticmethod
    async def get_user_by_email(email: str, db: AsyncSession) -> User | None:
        """Get user by email"""
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_id(user_id: int, db: AsyncSession) -> User | None:
        """Get user by ID"""
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
