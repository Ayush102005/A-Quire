from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.api.deps import get_current_user_id
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse, NotificationMarkRead
from app.utils.exceptions import NotFoundException

router = APIRouter()


@router.get(
    "",
    response_model=list[NotificationResponse],
    summary="List notifications",
)
async def list_notifications(
    skip: int = 0,
    limit: int = 20,
    unread_only: bool = False,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationResponse]:
    """
    List notifications for the authenticated user, most-recent first.

    - **unread_only**: When `true`, only return unread notifications
    """
    stmt = select(Notification).where(Notification.user_id == user_id)

    if unread_only:
        stmt = stmt.where(Notification.is_read == False)  # noqa: E712

    stmt = stmt.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
    summary="Get a notification",
)
async def get_notification(
    notification_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    """Get a single notification by ID (owner only)."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    )
    result = await db.execute(stmt)
    notification = result.scalar_one_or_none()

    if not notification:
        raise NotFoundException("Notification not found")

    return notification


@router.put(
    "/{notification_id}",
    response_model=NotificationResponse,
    summary="Mark notification read/unread",
)
async def mark_notification_read(
    notification_id: int,
    mark_read: NotificationMarkRead,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    """Toggle the read state of a notification (owner only)."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    )
    result = await db.execute(stmt)
    notification = result.scalar_one_or_none()

    if not notification:
        raise NotFoundException("Notification not found")

    notification.is_read = mark_read.is_read
    await db.commit()
    await db.refresh(notification)
    return notification


@router.post(
    "/mark-all-read",
    status_code=status.HTTP_200_OK,
    summary="Mark all notifications read",
)
async def mark_all_read(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark every unread notification for the current user as read."""
    stmt = select(Notification).where(
        Notification.user_id == user_id,
        Notification.is_read == False,  # noqa: E712
    )
    result = await db.execute(stmt)
    notifications = result.scalars().all()

    for n in notifications:
        n.is_read = True

    await db.commit()
    return {"detail": f"Marked {len(notifications)} notification(s) as read"}
