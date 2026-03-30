# app/schemas/alerts.py

from pydantic import BaseModel
from typing import Optional

class AlertStatusUpdateRequest(BaseModel):
    location_id: int
    risk_type: str
    day: Optional[str] = None
    status: str  # "done" | "snoozed" | "ignored"
    source: Optional[str] = None

    @property
    def is_valid_status(self) -> bool:
        return self.status in ["done", "snoozed", "ignored"]