#!/usr/bin/env python3
"""
Valora AI — Pipeline Health Check
Run this at any time to see the status of all pipeline stages.

Usage:
    python scripts/check_pipeline_health.py
    python scripts/check_pipeline_health.py --tenant-id <UUID> --location-id <ID>
"""

import asyncio
import argparse
import os
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, ".")

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
NC     = "\033[0m"

def ok(msg):    print(f"  {GREEN}✅ {msg}{NC}")
def warn(msg):  print(f"  {YELLOW}⚠️  {msg}{NC}")
def err(msg):   print(f"  {RED}❌ {msg}{NC}")
def info(msg):  print(f"  {CYAN}ℹ️  {msg}{NC}")
def head(msg):  print(f"\n{BOLD}{msg}{NC}")
def dim(msg):   print(f"  {DIM}{msg}{NC}")

# ── DB helper ─────────────────────────────────────────────────────────────────
async def get_conn():
    """Return a raw asyncpg connection using DATABASE_URL."""
    import asyncpg
    from dotenv import load_dotenv
    load_dotenv('.env.local')
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable not set")
    url = url.replace("postgresql+psycopg2", "postgresql").replace("postgres://", "postgresql://", 1)
    if "?" in url:
        url = url.split("?")[0] + "?ssl=require"
    else:
        url = url + "?ssl=require"
    return await asyncpg.connect(url)


async def run_check(tenant_id: str, location_id: int):
    today = date.today()
    yesterday = today - timedelta(days=1)
    last_7 = today - timedelta(days=7)

    print(f"\n{BOLD}{'='*60}{NC}")
    print(f"{BOLD}  VALORA AI — PIPELINE HEALTH CHECK{NC}")
    print(f"{BOLD}  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{NC}")
    print(f"{BOLD}  Tenant:   {tenant_id}{NC}")
    print(f"{BOLD}  Location: {location_id}{NC}")
    print(f"{BOLD}{'='*60}{NC}")

    try:
        conn = await get_conn()
    except Exception as e:
        err(f"Cannot connect to database: {e}")
        sys.exit(1)

    # ── STAGE 1: Redis ────────────────────────────────────────────────────────
    head("STAGE 1 — Redis (message broker)")
    try:
        import redis
        r = redis.Redis()
        r.ping()
        ok("Redis is reachable")
        q_len = r.llen("sync") or 0
        dim(f"Queue 'sync' length: {q_len}")
    except Exception as e:
        err(f"Redis unreachable: {e}")

    # ── STAGE 2: Bronze (pos_raw_event) ───────────────────────────────────────
    head("STAGE 2 — Bronze layer (pos_raw_event)")
    try:
        row = await conn.fetchrow("""
            SELECT
                COUNT(*)                    AS total,
                COUNT(*) FILTER (WHERE status = 'new')        AS pending,
                COUNT(*) FILTER (WHERE status = 'processed')  AS processed,
                COUNT(*) FILTER (WHERE status = 'failed')     AS failed,
                MAX(received_at)            AS latest,
                COUNT(*) FILTER (WHERE received_at::date = $3) AS today_count
            FROM restaurant.pos_raw_event
            WHERE tenant_id = $1 AND location_id = $2
        """, tenant_id, location_id, today)

        if row["total"] == 0:
            warn("No Bronze records found — run POS simulator or trigger Celery sync")
        else:
            ok(f"Total records: {row['total']:,}")
            dim(f"Today: {row['today_count']} | Pending: {row['pending']} | Processed: {row['processed']} | Failed: {row['failed']}")
            if row["latest"]:
                age = datetime.now(row["latest"].tzinfo) - row["latest"]
                dim(f"Latest record: {row['latest'].strftime('%H:%M:%S')} ({int(age.total_seconds())}s ago)")
                if age.total_seconds() > 300:
                    warn("Latest Bronze record is >5 mins old — simulator or sync may be stalled")
            if row["failed"] and row["failed"] > 0:
                warn(f"{row['failed']} failed records — check pos_raw_event.error_message")
    except Exception as e:
        err(f"Bronze check failed: {e}")

    # ── STAGE 3: Silver (pos_order) ───────────────────────────────────────────
    head("STAGE 3 — Silver layer (pos_order)")
    try:
        row = await conn.fetchrow("""
            SELECT
                COUNT(*)                                       AS total,
                COUNT(*) FILTER (WHERE order_date = $3)       AS today_count,
                COUNT(*) FILTER (WHERE order_date >= $4)      AS week_count,
                MAX(order_ts)                                  AS latest,
                ROUND(AVG(net_sales)::numeric, 2)             AS avg_order
            FROM restaurant.pos_order
            WHERE tenant_id = $1 AND location_id = $2::bigint
        """, tenant_id, location_id, today, last_7)

        if row["total"] == 0:
            warn("No Silver records — run: python scripts/bronze_to_silver_etl.py")
        else:
            ok(f"Total orders: {row['total']:,}")
            dim(f"Today: {row['today_count']} | Last 7 days: {row['week_count']} | Avg order: ${row['avg_order']}")
            if row["latest"]:
                dim(f"Latest order: {row['latest'].strftime('%Y-%m-%d %H:%M:%S')}")
    except Exception as e:
        err(f"Silver check failed: {e}")

    # ── STAGE 4: Gold (fact_order) ────────────────────────────────────────────
    head("STAGE 4 — Gold layer (fact_order)")
    try:
        row = await conn.fetchrow("""
            SELECT
                COUNT(*)                                                          AS total,
                COUNT(*) FILTER (WHERE order_date = $3)                          AS today_count,
                ROUND(SUM(net_sales) FILTER (WHERE order_date = $3)::numeric, 2) AS today_revenue,
                MAX(order_date)                                                   AS latest
            FROM restaurant.fact_order
            WHERE tenant_id = $1 AND location_id = $2
        """, tenant_id, int(location_id), today)

        if row["total"] == 0:
            warn("No Gold records — run: python scripts/silver_to_gold_etl.py")
        else:
            ok(f"Total fact orders: {row['total']:,}")
            dim(f"Today: {row['today_count']} orders | Today revenue: ${row['today_revenue'] or 0:,.2f}")
            if row["latest"]:
                dim(f"Latest: {row['latest'].strftime('%Y-%m-%d %H:%M:%S')}")
    except Exception as e:
        err(f"Gold check failed: {e}")

    # ── STAGE 5: KPIs ─────────────────────────────────────────────────────────
    head("STAGE 5 — KPIs")
    try:
        # Try common KPI table names — adjust if yours differs
        for kpi_table in ["restaurant.raw_restaurant_daily"]:
            try:
                row = await conn.fetchrow(f"""
                    SELECT
                        COUNT(*)        AS periods,
                        MAX(day)   AS latest_day
                    FROM {kpi_table}
                    WHERE tenant_id = $1 AND location_id = $2
                """, tenant_id, str(location_id))

                if row["periods"] == 0:
                    warn(f"KPI table {kpi_table} is empty")
                else:
                    ok(f"KPI periods computed: {row['periods']}")
                    dim(f"Latest KPI date: {row['latest_day']}")
                    if row["latest_day"] and row["latest_day"] < today:
                        warn(f"KPIs are stale — latest is {row['latest_day']}, not today ({today})")
                break
            except Exception:
                continue
        else:
            info("KPI table not found — check kpi_repository.py for table name")
    except Exception as e:
        err(f"KPI check failed: {e}")

    # ── STAGE 6: Insights ──────────────────────────────────────────────────────
    head("STAGE 6 — Insights (ML/AI)")
    try:
        for ins_table in ["ml.insight_brief_daily"]:
            try:
                row = await conn.fetchrow(f"""
                    SELECT
                        COUNT(*)            AS total,
                        MAX(created_at)     AS latest,
                        COUNT(*) FILTER (WHERE created_at::date = $2) AS today_count
                    FROM {ins_table}
                    WHERE tenant_id = $1
                """, tenant_id, today)

                if row["total"] == 0:
                    warn(f"No insights yet — run: python scripts/generate_insights.py")
                else:
                    ok(f"Total insights: {row['total']}")
                    dim(f"Today: {row['today_count']}")
                    if row["latest"]:
                        age = datetime.now(row["latest"].tzinfo) - row["latest"]
                        dim(f"Latest: {row['latest'].strftime('%H:%M:%S')} ({int(age.total_seconds()//60)}m ago)")
                break
            except Exception:
                continue
        else:
            info("Insights table not found — check generate_insights.py for table name")
    except Exception as e:
        err(f"Insights check failed: {e}")

    # ── PIPELINE LAG ──────────────────────────────────────────────────────────
    head("PIPELINE LAG SUMMARY")
    try:
        bronze_latest = await conn.fetchval("""
            SELECT MAX(received_at) FROM restaurant.pos_raw_event
            WHERE tenant_id = $1 AND location_id = $2
        """, tenant_id, int(location_id))

        gold_latest = await conn.fetchval("""
            SELECT MAX(order_date) FROM restaurant.fact_order
        """, tenant_id, str(location_id))

        if bronze_latest and gold_latest:
            lag = bronze_latest - gold_latest
            lag_mins = int(lag.total_seconds() // 60)
            if lag_mins <= 2:
                ok(f"Pipeline lag: {lag_mins}m — real-time ✓")
            elif lag_mins <= 10:
                warn(f"Pipeline lag: {lag_mins}m — slightly behind")
            else:
                err(f"Pipeline lag: {lag_mins}m — ETL may be stalled")
        else:
            info("Not enough data to calculate lag yet")
    except Exception as e:
        dim(f"Lag check skipped: {e}")

    await conn.close()

    print(f"\n{BOLD}{'='*60}{NC}")
    print(f"{DIM}  Logs: logs/realtime/ | Re-run anytime: python scripts/check_pipeline_health.py{NC}")
    print(f"{BOLD}{'='*60}{NC}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Valora AI Pipeline Health Check")
    parser.add_argument("--tenant-id",   default="e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09")
    parser.add_argument("--location-id", type=int, default=150)
    args = parser.parse_args()

    # Load .env
    if os.path.exists(".env"):
        from dotenv import load_dotenv
        load_dotenv('.env.local')

    asyncio.run(run_check(args.tenant_id, args.location_id))
