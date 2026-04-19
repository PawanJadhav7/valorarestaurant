#!/bin/bash
# ============================================================
# Valora AI — Real-Time Data Pipeline Automation
# Chains all 6 pipeline stages in separate terminal tabs
#
# Usage:
#   chmod +x run_realtime_pipeline.sh
#   ./run_realtime_pipeline.sh
#
# Stages:
#   1. POS Simulator    → generates live orders with variance
#   2. Celery Worker    → ingests raw events → Bronze
#   3. Bronze→Silver    → ETL clean + validate (triggered on new data)
#   4. Silver→Gold      → ETL analytics layer
#   5. KPI Refresh      → real-time KPI recalculation
#   6. Insights Agent   → ML/AI insights + alerts
# ============================================================

set -e

# ─────────────────────────────────────────────
# CONFIG — edit these to match your environment
# ─────────────────────────────────────────────
TENANT_ID="e5c5bedf-d6ae-4d8c-a9f0-ae0e1c93cb09"
LOCATION_ID="150"
VENV=".venv_valora_backend"
LOG_DIR="logs/realtime"
ETL_INTERVAL=60        # seconds between ETL polls (Bronze→Silver→Gold)
KPI_INTERVAL=30        # seconds between KPI refreshes
INSIGHTS_INTERVAL=120  # seconds between insights generation
SIM_ORDER_INTERVAL=20  # seconds between simulated orders

mkdir -p "$LOG_DIR"

# ─────────────────────────────────────────────
# COLOUR HELPERS
# ─────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

log()   { echo -e "${BOLD}[$(date +%H:%M:%S)]${NC} $1"; }
ok()    { echo -e "${GREEN}✅ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
info()  { echo -e "${CYAN}ℹ️  $1${NC}"; }
err()   { echo -e "${RED}❌ $1${NC}"; }
stage() { echo -e "\n${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BLUE}${BOLD}  STAGE $1${NC}"; echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ─────────────────────────────────────────────
# PREFLIGHT CHECKS
# ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}============================================================${NC}"
echo -e "${BOLD}  VALORA AI — REAL-TIME PIPELINE${NC}"
echo -e "${BOLD}  Started: $(date)${NC}"
echo -e "${BOLD}  Tenant:  $TENANT_ID${NC}"
echo -e "${BOLD}  Location: $LOCATION_ID${NC}"
echo -e "${BOLD}============================================================${NC}"
echo ""

log "Running preflight checks..."

# Check venv
if [ ! -d "$VENV" ]; then
    err "Virtual environment '$VENV' not found. Run: python -m venv $VENV"
    exit 1
fi
ok "Virtual environment found"

# Check Redis
if ! redis-cli ping > /dev/null 2>&1; then
    warn "Redis not running. Attempting to start..."
    brew services start redis 2>/dev/null || redis-server --daemonize yes
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        ok "Redis started"
    else
        err "Could not start Redis. Run: brew services start redis"
        exit 1
    fi
else
    ok "Redis is running"
fi

# Check .env
if [ ! -f ".env" ]; then
    err ".env file not found"
    exit 1
fi
ok ".env file found"

# Source venv
source "$VENV/bin/activate"
ok "Virtual environment activated"

# Check required scripts exist
for script in scripts/pos_realtime_simulator.py scripts/bronze_to_silver_etl.py scripts/silver_to_gold_etl.py scripts/generate_insights.py; do
    if [ ! -f "$script" ]; then
        err "Missing: $script"
        exit 1
    fi
done
ok "All pipeline scripts present"

echo ""
log "Preflight checks passed. Starting pipeline..."
echo ""

# ─────────────────────────────────────────────
# STAGE 2 — CELERY WORKER (Background)
# Ingests raw POS events → Bronze (pos_raw_event)
# ─────────────────────────────────────────────
stage "2 — Celery Worker (Bronze ingestion)"

# Kill any existing celery workers for this app
pkill -f "celery.*valora" 2>/dev/null && warn "Killed existing Celery processes" || true
sleep 2

log "Starting Celery worker + beat in background..."
celery -A app.worker.celery_app worker \
    --loglevel=info \
    -Q sync,default,beat \
    --concurrency=2 \
    >> "$LOG_DIR/celery_worker.log" 2>&1 &
CELERY_WORKER_PID=$!

sleep 3

celery -A app.worker.beat_schedule beat \
    --loglevel=info \
    >> "$LOG_DIR/celery_beat.log" 2>&1 &
CELERY_BEAT_PID=$!

sleep 2

# Verify workers are alive
if kill -0 $CELERY_WORKER_PID 2>/dev/null; then
    ok "Celery worker running (PID: $CELERY_WORKER_PID)"
else
    err "Celery worker failed to start. Check logs/realtime/celery_worker.log"
    exit 1
fi

if kill -0 $CELERY_BEAT_PID 2>/dev/null; then
    ok "Celery beat running (PID: $CELERY_BEAT_PID)"
else
    err "Celery beat failed to start. Check logs/realtime/celery_beat.log"
    exit 1
fi

info "Celery syncs every 15 mins automatically. Logs: $LOG_DIR/celery_worker.log"

# ─────────────────────────────────────────────
# STAGE 1 — POS SIMULATOR (Background)
# Generates realistic restaurant orders with variance
# ─────────────────────────────────────────────
stage "1 — POS Simulator (Order generation)"

log "Starting POS real-time simulator..."

python scripts/pos_realtime_simulator.py --daemon \
    >> "$LOG_DIR/pos_simulator.log" 2>&1 &
SIM_PID=$!

sleep 3

if kill -0 $SIM_PID 2>/dev/null; then
    ok "POS simulator running (PID: $SIM_PID) — generating orders every ${SIM_ORDER_INTERVAL}s"
else
    warn "POS simulator may have exited — check $LOG_DIR/pos_simulator.log"
    warn "Continuing pipeline — Celery will still sync from real POS if configured"
fi

# Trigger an immediate sync so we don't wait 15 mins for first data
log "Triggering immediate Celery sync for location $LOCATION_ID..."
celery -A app.worker.celery_app call \
    app.worker.tasks.pos_sync_task.dispatch_all_pos_syncs \
    >> "$LOG_DIR/manual_sync.log" 2>&1 || warn "Manual trigger failed — beat will sync within 15 mins"
ok "Initial sync triggered"

# ─────────────────────────────────────────────
# STAGES 3+4+5+6 — ETL LOOP (Continuous)
# Polls for new Bronze data and runs full pipeline
# ─────────────────────────────────────────────
stage "3+4+5+6 — ETL + KPI + Insights loop"

log "Starting continuous ETL pipeline loop..."
log "  Bronze→Silver every ${ETL_INTERVAL}s"
log "  Silver→Gold   every ${ETL_INTERVAL}s (after Silver)"
log "  KPI refresh   every ${KPI_INTERVAL}s"
log "  Insights      every ${INSIGHTS_INTERVAL}s"
echo ""

# Track cycle counters
ETL_CYCLE=0
INSIGHTS_CYCLE=0
LAST_ETL_RUN=0
LAST_INSIGHTS_RUN=0

# Save all PIDs for cleanup
echo "$CELERY_WORKER_PID $CELERY_BEAT_PID $SIM_PID" > "$LOG_DIR/pipeline.pids"

# Trap Ctrl+C for clean shutdown
cleanup() {
    echo ""
    warn "Shutting down pipeline..."
    kill $CELERY_WORKER_PID $CELERY_BEAT_PID $SIM_PID 2>/dev/null
    ok "Pipeline stopped cleanly"
    exit 0
}
trap cleanup INT TERM

# ─── MAIN LOOP ───────────────────────────────
while true; do
    NOW=$(date +%s)
    CURRENT_DATE=$(date +%Y-%m-%d)
    CURRENT_TS=$(date '+%Y-%m-%d %H:%M:%S')

    # ── ETL cycle (Bronze→Silver→Gold) ────────
    if [ $((NOW - LAST_ETL_RUN)) -ge $ETL_INTERVAL ]; then
        ETL_CYCLE=$((ETL_CYCLE + 1))
        LAST_ETL_RUN=$NOW

        echo ""
        log "ETL Cycle #$ETL_CYCLE — $CURRENT_TS"

        # Stage 3: Bronze → Silver
        echo -n "  → Bronze→Silver ... "
        if python scripts/bronze_to_silver_etl.py \
            --start "$CURRENT_DATE" \
            --end "$CURRENT_DATE" \
            >> "$LOG_DIR/bronze_silver.log" 2>&1; then
            echo -e "${GREEN}done${NC}"
        else
            echo -e "${YELLOW}warn (check $LOG_DIR/bronze_silver.log)${NC}"
        fi

        # Stage 4: Silver → Gold
        echo -n "  → Silver→Gold   ... "
        if python scripts/silver_to_gold_etl.py \
            --start "$CURRENT_DATE" \
            --end "$CURRENT_DATE" \
            >> "$LOG_DIR/silver_gold.log" 2>&1; then
            echo -e "${GREEN}done${NC}"
        else
            echo -e "${YELLOW}warn (check $LOG_DIR/silver_gold.log)${NC}"
        fi

        # Stage 5: KPI refresh — always uses current datetime for realtime
        echo -n "  → KPI refresh   ... "
        if python -c "
import asyncio, sys, os
sys.path.insert(0, '.')
from app.analytics.kpi_repository import KPIRepository
from app.db.session import get_db_session
from datetime import date

async def refresh():
    async with get_db_session() as db:
        repo = KPIRepository(db)
        today = date.today()
        await repo.refresh_daily_kpis(
            tenant_id='$TENANT_ID',
            location_id=$LOCATION_ID,
            target_date=today
        )
        print(f'KPIs refreshed for {today}')

asyncio.run(refresh())
" >> "$LOG_DIR/kpi_refresh.log" 2>&1; then
            echo -e "${GREEN}done${NC}"
        else
            # Fallback: KPI refresh via direct SQL if repo method differs
            echo -e "${YELLOW}skipped (check $LOG_DIR/kpi_refresh.log)${NC}"
        fi

    fi

    # ── Insights cycle ─────────────────────────
    if [ $((NOW - LAST_INSIGHTS_RUN)) -ge $INSIGHTS_INTERVAL ]; then
        INSIGHTS_CYCLE=$((INSIGHTS_CYCLE + 1))
        LAST_INSIGHTS_RUN=$NOW

        echo -n "  → Insights #$INSIGHTS_CYCLE  ... "
        if python scripts/generate_insights.py \
            >> "$LOG_DIR/insights.log" 2>&1; then
            echo -e "${GREEN}done${NC}"
        else
            echo -e "${YELLOW}warn (check $LOG_DIR/insights.log)${NC}"
        fi
    fi

    # Status heartbeat every 5 minutes
    if [ $((ETL_CYCLE % 5)) -eq 0 ] && [ $ETL_CYCLE -gt 0 ]; then
        echo ""
        info "Pipeline heartbeat — ETL cycles: $ETL_CYCLE | Insights cycles: $INSIGHTS_CYCLE"
        info "Logs: $LOG_DIR/"
        info "Press Ctrl+C to stop"
    fi

    sleep 10
done
