from __future__ import annotations
import logging
import os
import subprocess
import sys
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.worker.tasks.etl_insights_task.dispatch_all_insights",
    queue="beat",
    bind=True,
    max_retries=1,
)
def dispatch_all_insights(self):
    from app.db import get_db
    from sqlalchemy import text
    db = next(get_db())
    try:
        connections = db.execute(text("""
            SELECT DISTINCT tenant_id::text, location_id
            FROM restaurant.pos_connection
            WHERE status = 'active'
        """)).mappings().all()
        dispatched = 0
        for conn in connections:
            try:
                run_insights_task.apply_async(
                    kwargs={"tenant_id": conn["tenant_id"], "location_id": conn["location_id"]},
                    queue="sync",
                )
                dispatched += 1
                logger.info("Dispatched Insights tenant=%s location=%s", conn["tenant_id"], conn["location_id"])
            except Exception as e:
                logger.error("Failed to dispatch Insights tenant=%s: %s", conn["tenant_id"], str(e))
        logger.info("Dispatched %s Insights tasks", dispatched)
        return {"dispatched": dispatched}
    except Exception as e:
        logger.exception("dispatch_all_insights failed: %s", str(e))
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()


@celery_app.task(
    name="app.worker.tasks.etl_insights_task.run_insights_task",
    queue="sync",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def run_insights_task(self, *, tenant_id: str, location_id: int):
    logger.info("Running Insights tenant=%s location=%s", tenant_id, location_id)
    try:
        # ── Step 1: Generate insights ─────────────────────────────────────
        from datetime import date
        today = date.today().isoformat()
        result = subprocess.run(
            [sys.executable, "scripts/generate_insights.py",
             "--tenant-id", tenant_id,
             "--location-id", str(location_id),
             "--as-of-date", today],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Insights failed: {result.stderr}")
        logger.info("Insights done tenant=%s location=%s: %s",
                    tenant_id, location_id, result.stdout.strip().split('\n')[-1])

        # ── Step 2: Refresh materialized view ────────────────────────────
        import psycopg2
        db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+psycopg2", "postgresql")
        if db_url:
            try:
                conn = psycopg2.connect(db_url)
                conn.autocommit = True
                cur = conn.cursor()
                cur.execute("REFRESH MATERIALIZED VIEW ml.mv_valora_control_tower")
                conn.close()
                logger.info("Refreshed mv_valora_control_tower")
            except Exception as e:
                logger.warning("View refresh failed: %s", str(e))

        # ── Step 3: Fire alerts for critical/high risks ───────────────────
        try:
            _fire_alerts(tenant_id=tenant_id, location_id=location_id, as_of_date=today)
        except Exception as e:
            logger.warning("Alert delivery failed tenant=%s: %s", tenant_id, str(e))

        return {"status": "success", "tenant_id": tenant_id, "location_id": location_id}

    except Exception as e:
        logger.exception("Insights failed tenant=%s location=%s: %s", tenant_id, location_id, str(e))
        raise self.retry(exc=e, countdown=60)


def _fire_alerts(*, tenant_id: str, location_id: int, as_of_date: str):
    """
    Check ml.location_risk_daily for critical/high risks and
    deliver alerts to the tenant owner via Email + WhatsApp.
    """
    import psycopg2
    from app.services.alert_delivery_service import AlertDeliveryService, AlertPayload

    db_url = os.environ.get("DATABASE_URL", "").replace("postgresql+psycopg2", "postgresql")
    if not db_url:
        logger.warning("DATABASE_URL not set — skipping alert delivery")
        return

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        # Get risks for this tenant/location today
        cur.execute("""
            SELECT
                r.risk_type,
                r.severity_band,
                r.severity_score,
                r.impact_estimate,
                dl.location_name,
                au.full_name,
                au.email,
                au.contact
            FROM ml.location_risk_daily r
            JOIN restaurant.dim_location dl
                ON dl.location_id = r.location_id
                AND dl.tenant_id = r.tenant_id::uuid
            JOIN app.tenant_user tu
                ON tu.tenant_id = r.tenant_id::uuid
                AND tu.role = 'owner'
            JOIN auth.app_user au
                ON au.user_id = tu.user_id
            LEFT JOIN ml.insight_brief_daily ib
                ON ib.tenant_id = r.tenant_id::uuid
                AND ib.location_id = r.location_id
                AND ib.as_of_date = %(as_of_date)s::date
            WHERE r.tenant_id = %(tenant_id)s
              AND r.location_id = %(location_id)s
              AND r.day = %(as_of_date)s::date
              AND r.severity_band IN ('critical', 'high')
        """, {"tenant_id": tenant_id, "location_id": location_id, "as_of_date": as_of_date})

        risks = cur.fetchall()

        if not risks:
            logger.info("No critical/high risks for tenant=%s loc=%s — no alerts sent",
                        tenant_id[:8], location_id)
            return

        svc = AlertDeliveryService()

        for risk in risks:
            risk_type, severity_band, severity_score, impact_estimate, \
                location_name, owner_name, owner_email, owner_phone = risk

            alert = AlertPayload(
                tenant_id=tenant_id,
                location_id=location_id,
                location_name=location_name or "Unknown",
                owner_name=owner_name or "Owner",
                owner_email=owner_email,
                owner_phone=owner_phone,
                risk_type=risk_type or "unknown",
                severity_band=severity_band or "high",
                impact_estimate=float(impact_estimate or 0),
                headline=f"{(risk_type or 'risk').replace('_', ' ').title()} detected at {location_name}",
                summary=f"A {severity_band} severity {(risk_type or 'risk').replace('_', ' ')} signal "
                        f"was detected at {location_name} on {as_of_date}. "
                        f"Estimated impact: ${float(impact_estimate or 0):,.0f}.",
                recommended_action="Review your Valora AI dashboard for detailed recommendations.",
                as_of_date=as_of_date,
            )

            # Send email + WhatsApp (SMS pending verification)
            email_result = svc.send_email(alert)
            whatsapp_result = svc.send_whatsapp(alert)

            logger.info(
                "Alert fired tenant=%s loc=%s risk=%s severity=%s | email=%s whatsapp=%s",
                tenant_id[:8], location_id, risk_type, severity_band,
                email_result.get("ok"), whatsapp_result.get("ok")
            )

    finally:
        cur.close()
        conn.close()
