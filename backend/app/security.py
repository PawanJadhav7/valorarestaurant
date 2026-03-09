from fastapi import Cookie, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db


def get_current_user_id(
    valora_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> str:
    if not valora_session:
        raise HTTPException(status_code=401, detail="Missing session")

    row = db.execute(
        text("""
            SELECT user_id
            FROM auth.user_session
            WHERE session_id = :session_id
              AND expires_at > now()
            LIMIT 1
        """),
        {"session_id": valora_session},
    ).mappings().first()

    if not row or not row["user_id"]:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return str(row["user_id"])


def get_current_tenant_id(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> str:
    row = db.execute(
        text("""
            SELECT tenant_id
            FROM app.v_user_current_tenant
            WHERE user_id = :user_id
            LIMIT 1
        """),
        {"user_id": user_id},
    ).mappings().first()

    if not row or not row["tenant_id"]:
        raise HTTPException(status_code=403, detail="Tenant not resolved")

    return str(row["tenant_id"])