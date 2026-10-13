from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class InstitutionCreate(BaseModel):
    name: str
    tier: str
    mrr: float = 0.0
    status: str = "Healthy"

class InstitutionResponse(InstitutionCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
