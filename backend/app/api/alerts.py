# app/api/alerts.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.alerts import AlertStatusUpdateRequest
from app.db import get_db

from pydantic import BaseModel
from typing import Optional

class AlertStatusDeleteRequest(BaseModel):
    location_id: int
    risk_type: str
    day: Optional[str] = None

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.post("/update-status")
def update_alert_status(
    payload: AlertStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    try:
        # validate status
        if payload.status not in {"done", "snoozed", "ignored"}:
            raise HTTPException(status_code=400, detail="Invalid status")

        # optional: parse date
        day = None
        if payload.day:
            try:
                day = datetime.fromisoformat(payload.day).date()
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid date format")

        # UPSERT logic
        result = db.execute(
            """
            INSERT INTO alert_status (
                location_id, risk_type, day, status, source, updated_at
            )
            VALUES (
                :location_id, :risk_type, :day, :status, :source, NOW()
            )
            ON CONFLICT (location_id, risk_type, day)
            DO UPDATE SET
                status = EXCLUDED.status,
                source = EXCLUDED.source,
                updated_at = NOW()
            RETURNING location_id, risk_type, status;
            """,
            {
                "location_id": payload.location_id,
                "risk_type": payload.risk_type,
                "day": day,
                "status": payload.status,
                "source": payload.source,
            },
        )

        db.commit()

        row = result.fetchone()

        return {
            "ok": True,
            "location_id": row[0],
            "risk_type": row[1],
            "status": row[2],
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
def get_alert_status(
    location_id: int | None = None,
    risk_type: str | None = None,
    day: str | None = None,
    db: Session = Depends(get_db),
):
    try:
        parsed_day = None
        if day:
            try:
                parsed_day = datetime.fromisoformat(day).date()
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid date format")

        query = """
            SELECT location_id, risk_type, day, status, source, updated_at
            FROM alert_status
            WHERE 1=1
        """
        params = {}

        if location_id is not None:
            query += " AND location_id = :location_id"
            params["location_id"] = location_id

        if risk_type is not None:
            query += " AND risk_type = :risk_type"
            params["risk_type"] = risk_type

        if parsed_day is not None:
            query += " AND day = :day"
            params["day"] = parsed_day

        query += " ORDER BY updated_at DESC"

        result = db.execute(query, params)
        rows = result.fetchall()

        items = [
            {
                "location_id": row[0],
                "risk_type": row[1],
                "day": str(row[2]) if row[2] is not None else None,
                "status": row[3],
                "source": row[4],
                "updated_at": row[5].isoformat() if row[5] is not None else None,
            }
            for row in rows
        ]

        return {
            "ok": True,
            "items": items,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def get_alert_history(
    location_id: int | None = None,
    risk_type: str | None = None,
    day: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    try:
        parsed_day = None
        if day:
            try:
                parsed_day = datetime.fromisoformat(day).date()
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid date format")

        if limit < 1 or limit > 500:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 500")

        query = """
            SELECT location_id, risk_type, day, status, source, updated_at
            FROM alert_status
            WHERE 1=1
        """
        params = {"limit": limit}

        if location_id is not None:
            query += " AND location_id = :location_id"
            params["location_id"] = location_id

        if risk_type is not None:
            query += " AND risk_type = :risk_type"
            params["risk_type"] = risk_type

        if parsed_day is not None:
            query += " AND day = :day"
            params["day"] = parsed_day

        query += " ORDER BY updated_at DESC LIMIT :limit"

        result = db.execute(query, params)
        rows = result.fetchall()

        items = [
            {
                "location_id": row[0],
                "risk_type": row[1],
                "day": str(row[2]) if row[2] is not None else None,
                "status": row[3],
                "source": row[4],
                "updated_at": row[5].isoformat() if row[5] is not None else None,
            }
            for row in rows
        ]

        return {
            "ok": True,
            "items": items,
            "count": len(items),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/status")
def delete_alert_status(
    payload: AlertStatusDeleteRequest,
    db: Session = Depends(get_db),
):
    try:
        parsed_day = None
        if payload.day:
            try:
                parsed_day = datetime.fromisoformat(payload.day).date()
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid date format")

        if parsed_day is not None:
            result = db.execute(
                """
                DELETE FROM alert_status
                WHERE location_id = :location_id
                  AND risk_type = :risk_type
                  AND day = :day
                RETURNING location_id, risk_type;
                """,
                {
                    "location_id": payload.location_id,
                    "risk_type": payload.risk_type,
                    "day": parsed_day,
                },
            )
        else:
            result = db.execute(
                """
                DELETE FROM alert_status
                WHERE location_id = :location_id
                  AND risk_type = :risk_type
                  AND day IS NULL
                RETURNING location_id, risk_type;
                """,
                {
                    "location_id": payload.location_id,
                    "risk_type": payload.risk_type,
                },
            )

        row = result.fetchone()
        db.commit()

        if not row:
            return {
                "ok": True,
                "deleted": False,
                "message": "No matching alert decision found",
            }

        return {
            "ok": True,
            "deleted": True,
            "location_id": row[0],
            "risk_type": row[1],
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))