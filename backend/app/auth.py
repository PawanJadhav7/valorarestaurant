from fastapi import Header, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

def get_current_tenant_id(
    db: Session,
    session_id: str | None,
) -> str:
    if not session_id:
        raise HTTPException(status_code=401, detail="Missing session")

    sql = text("""
        select ut.tenant_id
        from auth.user_session s
        join auth.tenant_user ut
          on ut.user_id = s.user_id
        where s.session_id = :session_id
          and s.expires_at > now()
        limit 1
    """)

    row = db.execute(sql, {"session_id": session_id}).mappings().first()

    if not row or not row["tenant_id"]:
        raise HTTPException(status_code=403, detail="Tenant not resolved")

    return str(row["tenant_id"])