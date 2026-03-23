#backend/app/auth.py
from fastapi import Header, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db


def get_current_user(
    authorization: str | None = Header(default=None),
    x_session_id: str | None = Header(default=None, alias="x-session-id"),
    db: Session = Depends(get_db),
):
    session_id = x_session_id

    if not session_id and authorization and authorization.lower().startswith("bearer "):
        session_id = authorization.split(" ", 1)[1].strip()

    if not session_id:
        raise HTTPException(status_code=401, detail="Missing session")

    sql = text("""
        select
            u.user_id,
            u.email,
            uc.tenant_id as active_tenant_id,
            (
              select tu.tenant_id
              from app.tenant_user tu
              where tu.user_id = u.user_id
              order by tu.created_at desc
              limit 1
            ) as tenant_id
        from auth.user_session s
        join auth.app_user u
          on u.user_id = s.user_id
        left join app.user_context uc
          on uc.user_id = u.user_id
        where s.session_id = :session_id
          and s.expires_at > now()
        limit 1
    """)

    row = db.execute(sql, {"session_id": session_id}).mappings().first()

    if not row:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return {
        "user_id": str(row["user_id"]),
        "email": row["email"],
        "tenant_id": str(row["tenant_id"]) if row["tenant_id"] else None,
        "active_tenant_id": str(row["active_tenant_id"]) if row["active_tenant_id"] else None,
    }