from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from app.db import get_db

router = APIRouter(prefix="/api/user", tags=["User"])


@router.get("/tenants")
def get_user_tenants(user_id: str):
    db = next(get_db())

    try:
        rows = db.execute(
            text("""
                SELECT
                    t.tenant_id,
                    t.tenant_name,
                    tu.role
                FROM app.tenant_user tu
                JOIN app.tenant t
                  ON t.tenant_id = tu.tenant_id
                WHERE tu.user_id = CAST(:user_id AS uuid)
                ORDER BY tu.created_at DESC
            """),
            {"user_id": user_id},
        ).mappings().all()

        return {
            "ok": True,
            "tenants": [dict(r) for r in rows],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()