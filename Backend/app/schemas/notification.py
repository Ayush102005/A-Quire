from pydantic import BaseModel
from datetime import datetime


class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: str = "info"


class NotificationCreate(NotificationBase):
    pass


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationMarkRead(BaseModel):
    is_read: bool = True
