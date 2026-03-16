from fastapi import APIRouter, Request
from sqlalchemy import text

from app.db import get_db

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.get("/me")
def get_me(request: Request):
    """
    MVP version:
    Reads tenant_id from cookie first, then header.
    Replace this later with your real auth/session system.
    """
    db = next(get_db())

    try:
        tenant_id = request.cookies.get("tenant_id") or request.headers.get("x-tenant-id")

        if not tenant_id:
            return {"ok": False, "error": "Not authenticated"}

        row = db.execute(
            text("""
                SELECT tenant_id, tenant_name
                FROM app.tenant
                WHERE tenant_id = CAST(:tenant_id AS uuid)
                LIMIT 1
            """),
            {"tenant_id": tenant_id},
        ).mappings().first()

        if not row:
            return {"ok": False, "error": "Tenant not found"}

        return {
            "ok": True,
            "tenant_id": str(row["tenant_id"]),
            "tenant_name": row["tenant_name"],
        }

    finally:
        db.close()