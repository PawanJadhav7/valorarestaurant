# backend/app/api/onboarding_tenant.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from app.db import get_db

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


class CreateTenantRequest(BaseModel):
    user_id: str
    business_name: str
    location_name: str
    state_code: str
    city: str | None = None
    address_line1: str | None = None
    postal_code: str | None = None
    timezone: str | None = "America/New_York"


@router.post("/tenant")
def create_tenant(payload: CreateTenantRequest):
    db = next(get_db())

    try:
        business_name = payload.business_name.strip()
        location_name = payload.location_name.strip()
        state_code = payload.state_code.strip().upper()
        city = payload.city.strip() if payload.city else None
        address_line1 = payload.address_line1.strip() if payload.address_line1 else None
        postal_code = payload.postal_code.strip() if payload.postal_code else None
        timezone = payload.timezone.strip() if payload.timezone else "America/New_York"

        if not business_name:
            raise HTTPException(status_code=400, detail="Business name is required")
        if not location_name:
            raise HTTPException(status_code=400, detail="Location name is required")
        if not state_code:
            raise HTTPException(status_code=400, detail="State code is required")

        existing = db.execute(
            text("""
                SELECT
                    t.tenant_id,
                    t.tenant_name,
                    l.location_id,
                    l.location_name
                FROM app.tenant_user tu
                JOIN app.tenant t
                  ON t.tenant_id = tu.tenant_id
                LEFT JOIN app.tenant_location tl
                  ON tl.tenant_id = t.tenant_id
                 AND tl.is_active = true
                LEFT JOIN app.location l
                  ON l.location_id = tl.location_id
                WHERE tu.user_id = CAST(:user_id AS uuid)
                  AND tu.role = 'owner'
                ORDER BY tl.created_at NULLS LAST
                LIMIT 1
            """),
            {"user_id": payload.user_id},
        ).mappings().first()

        if existing:
            return {
                "ok": True,
                "tenant_id": str(existing["tenant_id"]),
                "tenant_name": existing["tenant_name"],
                "location_id": str(existing["location_id"]) if existing["location_id"] else None,
                "location_name": existing["location_name"],
                "created": False,
            }

        tenant_row = db.execute(
            text("""
                INSERT INTO app.tenant (
                    tenant_name,
                    created_at
                )
                VALUES (
                    :tenant_name,
                    now()
                )
                RETURNING tenant_id, tenant_name
            """),
            {"tenant_name": business_name},
        ).mappings().first()

        if not tenant_row:
            raise HTTPException(status_code=500, detail="Failed to create tenant")

        tenant_id = str(tenant_row["tenant_id"])

        db.execute(
            text("""
                INSERT INTO app.tenant_user (
                    tenant_id,
                    user_id,
                    role,
                    created_at
                )
                VALUES (
                    CAST(:tenant_id AS uuid),
                    CAST(:user_id AS uuid),
                    'owner',
                    now()
                )
            """),
            {
                "tenant_id": tenant_id,
                "user_id": payload.user_id,
            },
        )

        location_row = db.execute(
            text("""
                INSERT INTO app.location (
                    location_name,
                    state_code,
                    city,
                    address_line1,
                    postal_code,
                    timezone,
                    is_active,
                    created_at,
                    updated_at
                )
                VALUES (
                    :location_name,
                    :state_code,
                    :city,
                    :address_line1,
                    :postal_code,
                    :timezone,
                    true,
                    now(),
                    now()
                )
                RETURNING location_id, location_name
            """),
            {
                "location_name": location_name,
                "state_code": state_code,
                "city": city,
                "address_line1": address_line1,
                "postal_code": postal_code,
                "timezone": timezone,
            },
        ).mappings().first()

        if not location_row:
            raise HTTPException(status_code=500, detail="Failed to create location")

        location_id = int(location_row["location_id"])

        db.execute(
            text("""
                INSERT INTO app.tenant_location (
                    tenant_id,
                    location_id,
                    created_at,
                    is_active
                )
                VALUES (
                    CAST(:tenant_id AS uuid),
                    :location_id,
                    now(),
                    true
                )
            """),
            {
                "tenant_id": tenant_id,
                "location_id": location_id,
            },
        )

        db.execute(
            text("""
                INSERT INTO app.user_location (
                    user_id,
                    tenant_id,
                    location_id,
                    is_active,
                    created_at
                )
                VALUES (
                    CAST(:user_id AS uuid),
                    CAST(:tenant_id AS uuid),
                    :location_id,
                    true,
                    now()
                )
            """),
            {
                "user_id": payload.user_id,
                "tenant_id": tenant_id,
                "location_id": location_id,
            },
        )

        db.execute(
            text("""
                UPDATE auth.app_user
                SET onboarding_status = 'tenant_done'
                WHERE user_id = CAST(:user_id AS uuid)
            """),
            {"user_id": payload.user_id},
        )

        db.commit()

        return {
            "ok": True,
            "tenant_id": tenant_id,
            "tenant_name": tenant_row["tenant_name"],
            "location_id": str(location_id),
            "location_name": location_row["location_name"],
            "created": True,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()