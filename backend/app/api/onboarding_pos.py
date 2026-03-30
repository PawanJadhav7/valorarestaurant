from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from sqlalchemy import text
from app.db import get_db
import logging

from app.services.pos_ingestion_service import POSIngestionService
from app.services.restaurant_metrics_service import RestaurantMetricsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


@router.post("/pos")
async def onboarding_pos(
    request: Request,
    file: UploadFile = File(None),  # only used for CSV
):
    db = next(get_db())

    try:
        form = await request.form()

        user_id = str(form.get("user_id") or "").strip()
        provider = str(form.get("provider") or "").strip().lower()
        mode = str(form.get("mode") or "").strip().lower()

        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")

        if provider not in {"csv", "square", "toast", "clover"}:
            raise HTTPException(status_code=400, detail="Invalid POS provider")

        if mode not in {"manual", "oauth"}:
            raise HTTPException(status_code=400, detail="Invalid POS mode")

        owner_row = db.execute(
            text(
                """
                SELECT tenant_id
                FROM app.tenant_user
                WHERE user_id = CAST(:user_id AS uuid)
                  AND role = 'owner'
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"user_id": user_id},
        ).mappings().first()

        if not owner_row:
            raise HTTPException(status_code=404, detail="Tenant not found")

        tenant_id = str(owner_row["tenant_id"])

        sub = db.execute(
            text(
                """
                SELECT subscription_status
                FROM app.tenant_subscription
                WHERE tenant_id = CAST(:tenant_id AS uuid)
                LIMIT 1
                """
            ),
            {"tenant_id": tenant_id},
        ).mappings().first()

        if not sub or sub["subscription_status"] not in ("trial", "active"):
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "SUBSCRIPTION_REQUIRED",
                    "message": "Please activate your plan to continue onboarding.",
                    "action": "redirect_to_subscription",
                },
            )

        pos_service = POSIngestionService(tenant_id, provider, mode)

        # ============================================================
        # -------- CSV FLOW -------- #
        # ============================================================
        if provider == "csv":
            if not file:
                raise HTTPException(status_code=400, detail="CSV file required")

            result = await pos_service.process_csv(file)

            metrics_result = RestaurantMetricsService(tenant_id).refresh()

            db.execute(
                text(
                    """
                    UPDATE app.tenant
                    SET data_ready = true
                    WHERE tenant_id = CAST(:tenant_id AS uuid)
                    """
                ),
                {"tenant_id": tenant_id},
            )

            db.execute(
                text(
                    """
                    UPDATE auth.app_user
                    SET onboarding_status = 'complete'
                    WHERE user_id = CAST(:user_id AS uuid)
                    """
                ),
                {"user_id": user_id},
            )

            db.commit()

            return {
                "ok": True,
                "flow": "csv",
                "rows_processed": result.get("rows", 0),
                "feature_rows": metrics_result.get("feature_rows", 0),
                "kpi_rows": metrics_result.get("kpi_rows", 0),
                "tenant_id": tenant_id,
                "redirect": "/restaurant",
            }

        # ============================================================
        # -------- CLOVER FLOW -------- #
        # ============================================================
        if provider == "clover":
            if mode != "oauth":
                raise HTTPException(status_code=400, detail="Clover requires OAuth mode")

            oauth_url = pos_service.get_clover_oauth_url(tenant_id)

            return {
                "ok": True,
                "flow": "clover_oauth",
                "tenant_id": tenant_id,
                "oauth_url": oauth_url,
            }

        # ============================================================
        # -------- TOAST FLOW -------- #
        # ============================================================
        if provider == "toast":
            return {
                "ok": False,
                "flow": "toast",
                "message": "Toast integration coming soon",
            }

        # ============================================================
        # -------- SQUARE FLOW -------- #
        # ============================================================
        if provider == "square":
            if mode != "oauth":
                raise HTTPException(status_code=400, detail="Square requires OAuth mode")

            oauth_url = pos_service.get_square_oauth_url(tenant_id)

            return {
                "ok": True,
                "flow": "square_oauth",
                "tenant_id": tenant_id,
                "oauth_url": oauth_url,
            }

        return {
            "ok": False,
            "flow": "unknown",
            "message": f"Provider '{provider}' not supported yet",
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()
        logger.exception("POS onboarding error")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()