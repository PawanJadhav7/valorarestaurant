from fastapi import APIRouter
from pydantic import BaseModel

from app.services.scheduled_subscription_change_service import (
    ScheduledSubscriptionChangeService,
)

router = APIRouter(prefix="/internal/subscription", tags=["Subscription Change Job"])


class ProcessScheduledChangesRequest(BaseModel):
    limit: int = 50


@router.post("/process-scheduled")
def process_scheduled_changes(payload: ProcessScheduledChangesRequest):
    service = ScheduledSubscriptionChangeService()
    return service.process_due_changes(limit=payload.limit)