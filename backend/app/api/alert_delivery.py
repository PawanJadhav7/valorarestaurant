"""
Valora AI — Alert Delivery API
Test and trigger alert delivery via Email, SMS, WhatsApp.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user
from app.services.alert_delivery_service import AlertDeliveryService, AlertPayload

router = APIRouter(prefix="/api/alerts", tags=["Alert Delivery"])


class TestAlertRequest(BaseModel):
    channel: str = "all"          # "email" | "sms" | "whatsapp" | "all"
    severity_band: str = "high"   # "critical" | "high" | "watch"
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None


@router.post("/test-delivery")
def test_alert_delivery(
    payload: TestAlertRequest,
    user=Depends(get_current_user),
):
    """
    Test alert delivery across channels.
    Sends a sample alert to the provided email/phone or the logged-in user's contact.
    """
    svc = AlertDeliveryService()

    alert = AlertPayload(
        tenant_id=user.get("tenant_id", "test"),
        location_id=150,
        location_name="Bella Napoli",
        owner_name="Timothy Heron",
        owner_email=payload.owner_email or user.get("email", "test@valoraai.com"),
        owner_phone=payload.owner_phone or "8764565344",
        risk_type="revenue_decline",
        severity_band=payload.severity_band,
        impact_estimate=1850.00,
        headline="Revenue down 18% vs last week at Bella Napoli",
        summary=(
            "Bella Napoli generated $3,012 yesterday vs a 7-day average of $3,665. "
            "Dinner covers dropped 22% suggesting a potential operational or demand issue."
        ),
        recommended_action="Review staffing levels for dinner service and check if any menu items are out of stock.",
        as_of_date="2026-04-17",
    )

    if payload.channel == "email":
        result = svc.send_email(alert)
    elif payload.channel == "sms":
        result = svc.send_sms(alert)
    elif payload.channel == "whatsapp":
        result = svc.send_whatsapp(alert)
    else:
        result = svc.send_all(alert)

    if not result.get("ok"):
        raise HTTPException(status_code=500, detail=result)

    return {"ok": True, "alert": alert.__dict__, "delivery": result}
