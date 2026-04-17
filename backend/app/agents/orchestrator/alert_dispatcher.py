"""
Valora AI — AlertDispatcher
STATUS: Placeholder — Option 3 (next build)
FRAMEWORK: None (pure Python + email/push SDK)

Routes alerts from all agents to the right channel
based on severity and owner preferences.

Severity routing:
  critical  → push notification + email (immediate)
  high      → email within 1 hour
  watch     → daily digest email
  info      → dashboard only

Alert sources:
  RiskAgent         → revenue, margin, prime cost alerts
  WasteAgent        → waste spike alerts
  ChurnAgent        → high-value guest at risk
  ReorderAgent      → stockout warning
  PricingAgent      → price change opportunity

Integrations (to build):
  SendGrid / Resend → email delivery
  Firebase FCM      → push notifications
  Twilio            → SMS (premium tier)
"""

ALERT_ROUTING = {
    "critical": ["push", "email"],
    "high":     ["email"],
    "watch":    ["digest_email"],
    "info":     ["dashboard"],
}

ALERT_SOURCES = [
    "risk_agent",
    "waste_agent",
    "churn_agent",
    "reorder_agent",
    "pricing_agent",
]

STATUS = "placeholder — builds in Option 3 (alert delivery)"
