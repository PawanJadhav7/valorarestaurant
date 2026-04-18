"""
Valora AI — Alert Delivery Service
Sends alerts via Email (Resend), SMS (Twilio), and WhatsApp (Twilio)
to restaurant owners when risks are detected.
"""
from __future__ import annotations
import os
import logging
from dataclasses import dataclass
from typing import Optional

import resend
from twilio.rest import Client as TwilioClient

logger = logging.getLogger(__name__)


@dataclass
class AlertPayload:
    """Structured alert to be delivered across channels."""
    tenant_id: str
    location_id: int
    location_name: str
    owner_name: str
    owner_email: str
    owner_phone: Optional[str]          # E.164 format e.g. +18764565344
    risk_type: str
    severity_band: str                  # critical | high | watch
    impact_estimate: float
    headline: str
    summary: str
    recommended_action: Optional[str]
    as_of_date: str


def _normalize_phone(phone: str | None) -> str | None:
    """Normalize phone to E.164 format."""
    if not phone:
        return None
    digits = "".join(c for c in str(phone) if c.isdigit())
    if not digits:
        return None
    # Indian numbers (10 digits starting with valid prefix or 11 with 0)
    if len(digits) == 10 and digits[0] in "6789":
        return f"+91{digits}"
    if len(digits) == 11 and digits[0] == "0":
        return f"+91{digits[1:]}"
    # US numbers
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits[0] == "1":
        return f"+{digits}"
    return f"+{digits}"


def _format_email_html(alert: AlertPayload) -> str:
    severity_color = {
        "critical": "#E24B4A",
        "high":     "#EF9F27",
        "watch":    "#378ADD",
    }.get(alert.severity_band, "#888780")

    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="margin-bottom:24px">
        <div style="font-size:18px;font-weight:600;color:#1a1a1a">Valora AI Alert</div>
        <div style="font-size:13px;color:#666;margin-top:4px">{alert.location_name} · {alert.as_of_date}</div>
      </div>

      <div style="background:#f8f7f4;border-radius:12px;padding:20px;margin-bottom:20px;border-left:4px solid {severity_color}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="background:{severity_color};color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;text-transform:uppercase">{alert.severity_band}</span>
          <span style="font-size:13px;color:#666">{alert.risk_type.replace("_", " ").title()}</span>
        </div>
        <div style="font-size:16px;font-weight:600;color:#1a1a1a;margin-bottom:8px">{alert.headline}</div>
        <div style="font-size:14px;color:#444;line-height:1.6">{alert.summary}</div>
      </div>

      <div style="background:#fff;border:1px solid #e8e6e0;border-radius:12px;padding:16px;margin-bottom:20px">
        <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.06em;margin-bottom:8px">Estimated Impact</div>
        <div style="font-size:24px;font-weight:600;color:#1a1a1a">${alert.impact_estimate:,.0f}</div>
      </div>

      {f'''
      <div style="background:#f0faf5;border:1px solid #9FE1CB;border-radius:12px;padding:16px;margin-bottom:20px">
        <div style="font-size:11px;text-transform:uppercase;color:#085041;letter-spacing:.06em;margin-bottom:8px">Recommended Action</div>
        <div style="font-size:14px;color:#1a1a1a;line-height:1.6">{alert.recommended_action}</div>
      </div>
      ''' if alert.recommended_action else ""}

      <div style="font-size:12px;color:#aaa;margin-top:24px;padding-top:16px;border-top:1px solid #e8e6e0">
        Valora AI · Restaurant Intelligence Platform · 
        You're receiving this because you're the owner of {alert.location_name}.
      </div>
    </div>
    """


def _format_sms(alert: AlertPayload) -> str:
    action = f"\nAction: {alert.recommended_action}" if alert.recommended_action else ""
    return (
        f"Valora AI Alert [{alert.severity_band.upper()}]\n"
        f"{alert.location_name}: {alert.headline}\n"
        f"Impact: ${alert.impact_estimate:,.0f}{action}\n"
        f"Date: {alert.as_of_date}"
    )


def _format_whatsapp(alert: AlertPayload) -> str:
    severity_emoji = {
        "critical": "🔴",
        "high":     "🟡",
        "watch":    "🔵",
    }.get(alert.severity_band, "⚪")

    action = f"\n*Recommended Action:* {alert.recommended_action}" if alert.recommended_action else ""
    return (
        f"{severity_emoji} *Valora AI Alert*\n"
        f"*{alert.location_name}* · {alert.as_of_date}\n\n"
        f"*{alert.headline}*\n"
        f"{alert.summary}\n\n"
        f"*Estimated Impact:* ${alert.impact_estimate:,.0f}"
        f"{action}"
    )


class AlertDeliveryService:
    """Delivers alerts via Email, SMS, and WhatsApp."""

    def __init__(self):
        self.resend_api_key = os.environ.get("RESEND_API_KEY")
        self.twilio_sid     = os.environ.get("TWILIO_ACCOUNT_SID")
        self.twilio_token   = os.environ.get("TWILIO_AUTH_TOKEN")
        self.from_number    = os.environ.get("TWILIO_FROM_NUMBER", "+18663109012")
        self.messaging_service_sid = os.environ.get("TWILIO_MESSAGING_SERVICE_SID", "MGf98ae954d22029c09a5e35162a597468")
        self.whatsapp_number = os.environ.get("TWILIO_WHATSAPP_NUMBER", "+14155238886")
        self.from_email     = os.environ.get("ALERT_FROM_EMAIL", "onboarding@resend.dev")

        if self.resend_api_key:
            resend.api_key = self.resend_api_key

        self._twilio: TwilioClient | None = None
        if self.twilio_sid and self.twilio_token:
            self._twilio = TwilioClient(self.twilio_sid, self.twilio_token)

    def send_email(self, alert: AlertPayload) -> dict:
        if not self.resend_api_key:
            logger.warning("RESEND_API_KEY not set — skipping email")
            return {"ok": False, "error": "RESEND_API_KEY not configured"}
        try:
            response = resend.Emails.send({
                "from":    self.from_email,
                "to":      [alert.owner_email],
                "subject": f"[{alert.severity_band.upper()}] {alert.headline} — {alert.location_name}",
                "html":    _format_email_html(alert),
            })
            logger.info("Email sent to %s | id=%s", alert.owner_email, response.get("id"))
            return {"ok": True, "channel": "email", "id": response.get("id")}
        except Exception as e:
            logger.error("Email failed for %s: %s", alert.owner_email, str(e))
            return {"ok": False, "channel": "email", "error": str(e)}

    def send_sms(self, alert: AlertPayload) -> dict:
        if not self._twilio:
            logger.warning("Twilio not configured — skipping SMS")
            return {"ok": False, "error": "Twilio not configured"}
        phone = _normalize_phone(alert.owner_phone)
        if not phone:
            return {"ok": False, "error": "No valid phone number"}
        try:
            msg = self._twilio.messages.create(
                body=_format_sms(alert),
                from_=self.from_number,
                to=phone,
            )
            logger.info("SMS sent to %s | sid=%s", phone, msg.sid)
            return {"ok": True, "channel": "sms", "sid": msg.sid}
        except Exception as e:
            logger.error("SMS failed for %s: %s", phone, str(e))
            return {"ok": False, "channel": "sms", "error": str(e)}

    def send_whatsapp(self, alert: AlertPayload) -> dict:
        if not self._twilio:
            logger.warning("Twilio not configured — skipping WhatsApp")
            return {"ok": False, "error": "Twilio not configured"}
        phone = _normalize_phone(alert.owner_phone)
        if not phone:
            return {"ok": False, "error": "No valid phone number"}
        try:
            msg = self._twilio.messages.create(
                body=_format_whatsapp(alert),
                from_=f"whatsapp:{self.whatsapp_number}",
                to=f"whatsapp:{phone}",
            )
            logger.info("WhatsApp sent to %s | sid=%s", phone, msg.sid)
            return {"ok": True, "channel": "whatsapp", "sid": msg.sid}
        except Exception as e:
            logger.error("WhatsApp failed for %s: %s", phone, str(e))
            return {"ok": False, "channel": "whatsapp", "error": str(e)}

    def send_all(self, alert: AlertPayload) -> dict:
        """Send alert across all three channels."""
        results = {
            "email":     self.send_email(alert),
            "sms":       self.send_sms(alert),
            "whatsapp":  self.send_whatsapp(alert),
        }
        all_ok = all(r.get("ok") for r in results.values())
        logger.info(
            "Alert delivery complete for %s | email=%s sms=%s whatsapp=%s",
            alert.location_name,
            results["email"].get("ok"),
            results["sms"].get("ok"),
            results["whatsapp"].get("ok"),
        )
        return {"ok": all_ok, "results": results}
