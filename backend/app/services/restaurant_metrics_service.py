from sqlalchemy import text
from app.db import get_db


class RestaurantMetricsService:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id

    def refresh(self) -> dict:
        db = next(get_db())
        try:
            feature_res = db.execute(
                text(
                    """
                    select restaurant.refresh_location_daily_features(
                        cast(:tenant_id as uuid)
                    ) as rows
                    """
                ),
                {"tenant_id": self.tenant_id},
            ).mappings().first()

            kpi_res = db.execute(
                text(
                    """
                    select restaurant.refresh_fact_kpi_daily(
                        cast(:tenant_id as uuid)
                    ) as rows
                    """
                ),
                {"tenant_id": self.tenant_id},
            ).mappings().first()

            db.commit()

            return {
                "ok": True,
                "feature_rows": int(feature_res["rows"] or 0),
                "kpi_rows": int(kpi_res["rows"] or 0),
            }
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()