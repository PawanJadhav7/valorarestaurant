from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from app.db import get_db

router = APIRouter(prefix="/api/user", tags=["User"])


class SwitchTenantRequest(BaseModel):
    user_id: str
    tenant_id: str


@router.post("/switch-tenant")
def switch_tenant(payload: SwitchTenantRequest):
    db = next(get_db())

    try:
        allowed = db.execute(
            text("""
                SELECT 1
                FROM app.tenant_user
                WHERE user_id = CAST(:user_id AS uuid)
                  AND tenant_id = CAST(:tenant_id AS uuid)
                LIMIT 1
            """),
            {
                "user_id": payload.user_id,
                "tenant_id": payload.tenant_id,
            },
        ).first()

        if not allowed:
            raise HTTPException(status_code=403, detail="Forbidden tenant")

        db.execute(
            text("""
                INSERT INTO app.user_context (user_id, tenant_id)
                VALUES (
                    CAST(:user_id AS uuid),
                    CAST(:tenant_id AS uuid)
                )
                ON CONFLICT (user_id)
                DO UPDATE SET tenant_id = EXCLUDED.tenant_id
            """),
            {
                "user_id": payload.user_id,
                "tenant_id": payload.tenant_id,
            },
        )

        db.commit()

        return {
            "ok": True,
            "tenant_id": payload.tenant_id,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()