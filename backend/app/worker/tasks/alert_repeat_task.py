"""
Valora AI — Critical Alert Repeat Task
Re-fires unacknowledged critical alerts every 2 hours.
Checks ai.alert_delivery_log for critical alerts with no feedback response.
"""
from __future__ import annotations
import logging
import os
from datetime import datetime, timedelta, timezone

import psycopg2

from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.worker.tasks.alert_repeat_task.repeat_critical_alerts",
    queue="beat",
    bind=True,
    max_retries=1,
)
def repeat_critical_alerts(self):
    """
    Finds critical alerts delivered >2 hours ago with no owner response
    and re-sends them via Email + WhatsApp.
    """
    db_url = os.environ.get("DATABASE_URL", "").replace(
        "postgresql+psycopg2", "postgresql"
    )
    if not db_url:
        logger.warning("DATABASE_URL not set — skipping repeat alerts")
        return {"skipped": True}

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        # Find critical alerts delivered >2 hours ago with no feedback
        two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)

        cur.execute("""
            SELECT
                adl.delivery_id,
                adl.tenant_id::text,
                adl.location_id,
                adl.risk_type,
                adl.severity_band,
                adl.impact_estimate,
                adl.owner_email,
                adl.owner_phone,
                adl.as_of_date,
                dl.location_name,
                au.full_name as owner_name
            FROM ai.alert_delivery_log adl
            JOIN restaurant.dim_location dl
                ON dl.location_id = adl.location_id
                AND dl.tenant_id = adl.tenant_id
            JOIN app.tenant_user tu
                ON tu.tenant_id = adl.tenant_id
                AND tu.role = 'owner'
            JOIN auth.app_user au
                ON au.user_id = tu.user_id
                AND au.email = adl.owner_email
            LEFT JOIN ai.alert_feedback af
                ON af.delivery_id = adl.delivery_id
                AND af.response_status NOT IN ('pending')
            WHERE adl.severity_band = 'critical'
              AND adl.delivered_at <= %(two_hours_ago)s
              AND adl.delivered_at >= %(cutoff)s
              AND af.feedback_id IS NULL
            ORDER BY adl.delivered_at ASC
            LIMIT 20
        """, {
            "two_hours_ago": two_hours_ago,
            "cutoff": datetime.now(timezone.utc) - timedelta(hours=24),  # max 24h
        })

        alerts = cur.fetchall()

        if not alerts:
            logger.info("No unacknowledged critical alerts to repeat")
            return {"repeated": 0}

        from app.services.alert_delivery_service import (
            AlertDeliveryService, AlertPayload
        )
        svc = AlertDeliveryService()
        repeated = 0

        for alert_row in alerts:
            (delivery_id, tenant_id, location_id, risk_type, severity_band,
             impact_estimate, owner_email, owner_phone, as_of_date,
             location_name, owner_name) = alert_row

            alert = AlertPayload(
                tenant_id=tenant_id,
                location_id=location_id,
                location_name=location_name or "Unknown",
                owner_name=owner_name or "Owner",
                owner_email=owner_email,
                owner_phone=owner_phone,
                risk_type=risk_type or "unknown",
                severity_band="critical",
                impact_estimate=float(impact_estimate or 0),
                headline=f"[REPEAT] {(risk_type or 'risk').replace('_', ' ').title()} still unresolved at {location_name}",
                summary=(
                    f"This critical alert has not been acknowledged. "
                    f"{(risk_type or 'risk').replace('_', ' ').title()} at {location_name} "
                    f"requires immediate attention. Estimated impact: "
                    f"${float(impact_estimate or 0):,.0f}."
                ),
                recommended_action="Please review and mark as resolved in your Valora AI dashboard.",
                as_of_date=str(as_of_date),
            )

            email_result    = svc.send_email(alert)
            whatsapp_result = svc.send_whatsapp(alert)

            # Log the repeat delivery
            cur.execute("""
                INSERT INTO ai.alert_delivery_log (
                    tenant_id, location_id, as_of_date,
                    risk_type, severity_band, impact_estimate,
                    severity_score, urgency_score, impact_score,
                    final_rank, rank_threshold,
                    channels_attempted, channels_delivered,
                    email_status, whatsapp_status, sms_status,
                    owner_email, owner_phone
                ) VALUES (
                    %(tenant_id)s::uuid, %(location_id)s, %(as_of_date)s::date,
                    %(risk_type)s, 'critical', %(impact_estimate)s,
                    1.0, 1.0, %(impact_score)s,
                    1.0, 'immediate',
                    ARRAY['email','whatsapp'], %(channels_delivered)s,
                    %(email_status)s, %(whatsapp_status)s, false,
                    %(owner_email)s, %(owner_phone)s
                )
            """, {
                "tenant_id":          tenant_id,
                "location_id":        location_id,
                "as_of_date":         str(as_of_date),
                "risk_type":          risk_type,
                "impact_estimate":    float(impact_estimate or 0),
                "impact_score":       min(float(impact_estimate or 0) / 10000, 1.0),
                "channels_delivered": [
                    ch for ch, ok in [
                        ("email", email_result.get("ok")),
                        ("whatsapp", whatsapp_result.get("ok")),
                    ] if ok
                ],
                "email_status":     email_result.get("ok", False),
                "whatsapp_status":  whatsapp_result.get("ok", False),
                "owner_email":      owner_email,
                "owner_phone":      owner_phone,
            })
            conn.commit()

            logger.info(
                "Repeated critical alert tenant=%s loc=%s risk=%s | email=%s whatsapp=%s",
                tenant_id[:8], location_id, risk_type,
                email_result.get("ok"), whatsapp_result.get("ok")
            )
            repeated += 1

        return {"repeated": repeated}

    except Exception as e:
        conn.rollback()
        logger.exception("repeat_critical_alerts failed: %s", str(e))
        raise self.retry(exc=e, countdown=60)
    finally:
        cur.close()
        conn.close()
