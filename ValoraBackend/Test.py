# test_insert.py
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL is not set")

engine = create_engine(db_url, future=True)

with engine.begin() as conn:  # begin() auto-commits or rolls back
    inspector = inspect(conn)

    # Neon/Postgres: usually default schema is "public"
    if not inspector.has_table("tenant", schema="public"):
        raise SystemExit("Tenant table does not exist in schema 'public'. Run migrations first.")

    tenant_id = str(uuid.uuid4())
    conn.execute(
        text("""
            INSERT INTO tenant (tenant_id, name, status, plan, created_at)
            VALUES (:id, :name, 'active', 'starter', :created_at)
        """),
        {"id": tenant_id, "name": "Test Restaurant", "created_at": datetime.utcnow()},
    )

print("Success!")
print("tenant_id:", tenant_id)