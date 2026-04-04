# Valora AI — POS Integration Architecture

> **Production-grade multi-provider POS integration for restaurant analytics**
> Built with FastAPI · Celery · Redis · PostgreSQL (Neon) · Render

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [POS Integration Layer](#pos-integration-layer)
4. [Supported Providers](#supported-providers)
5. [Data Flow](#data-flow)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Scheduled Sync (Celery)](#scheduled-sync-celery)
9. [Webhooks](#webhooks)
10. [Environment Variables](#environment-variables)
11. [Local Development Setup](#local-development-setup)
12. [Deployment (Render)](#deployment-render)
13. [Production Checklist](#production-checklist)
14. [Adding a New POS Provider](#adding-a-new-pos-provider)
15. [Troubleshooting](#troubleshooting)

---

## System Overview

Valora AI is a multi-tenant restaurant analytics platform. The POS integration layer connects to multiple Point-of-Sale systems, syncs order data in real-time, and stores it in a canonical format for analytics.

```
Restaurant Owner
      │
      ▼
┌─────────────────────────────────────────────────┐
│                  Valora AI                       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Square  │  │  Clover  │  │  Toast (WIP) │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │           │
│       └──────────────┴───────────────┘           │
│                      │                           │
│              ┌───────▼────────┐                  │
│              │  POS Adapter   │                  │
│              │    Layer       │                  │
│              └───────┬────────┘                  │
│                      │                           │
│              ┌───────▼────────┐                  │
│              │ Canonical Order│                  │
│              │    Schema      │                  │
│              └───────┬────────┘                  │
│                      │                           │
│              ┌───────▼────────┐                  │
│              │   PostgreSQL   │                  │
│              │  (Neon DB)     │                  │
│              └────────────────┘                  │
└─────────────────────────────────────────────────┘
```

---

## Architecture Diagram

### Full System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RENDER CLOUD                              │
│                                                                  │
│  ┌──────────────────┐    ┌─────────────────┐                    │
│  │   FastAPI Web    │    │  Celery Worker  │                    │
│  │   Service        │    │  (Background)   │                    │
│  │                  │    │                 │                    │
│  │  /api/pos/       │    │  sync_orders()  │                    │
│  │  square/sync     │    │  per tenant     │                    │
│  │  clover/sync     │    │  per provider   │                    │
│  │  square/webhook  │    │                 │                    │
│  │  clover/webhook  │    └────────┬────────┘                    │
│  └────────┬─────────┘             │                             │
│           │                       │                             │
│           │         ┌─────────────▼────────────┐               │
│           │         │      Celery Beat          │               │
│           │         │   (Scheduler - 15 mins)   │               │
│           │         └─────────────┬─────────────┘               │
│           │                       │                             │
│           └───────────┬───────────┘                             │
│                       │                                         │
│              ┌────────▼────────┐                                │
│              │  Redis (Valkey) │  ◄── Message Broker            │
│              │  valora-redis   │                                │
│              └────────┬────────┘                                │
└───────────────────────┼─────────────────────────────────────────┘
                        │
          ┌─────────────▼──────────────┐
          │     Neon PostgreSQL        │
          │                            │
          │  restaurant.pos_order      │
          │  restaurant.pos_order_item │
          │  restaurant.pos_order_pay  │
          │  restaurant.pos_raw_event  │
          │  restaurant.pos_connection │
          └────────────────────────────┘
```

### Real-Time Webhook Flow

```
Square/Clover POS
      │
      │  POST (real-time event)
      ▼
  ngrok (local) / Render URL (production)
      │
      ▼
┌─────────────────────────────────┐
│   /api/pos/square/webhook       │
│   /api/pos/clover/webhook       │
│                                 │
│  1. Parse raw body              │
│  2. Extract merchant_id         │
│  3. Lookup tenant in DB         │
│  4. Verify HMAC signature       │
│  5. Save to pos_raw_event       │
│  6. Return 200 OK               │
└─────────────────────────────────┘
```

### Scheduled Sync Flow

```
Every 15 minutes
      │
      ▼
Celery Beat
      │  fires master task
      ▼
dispatch_all_pos_syncs()
      │
      │  queries pos_connection table
      │  spawns one task per active connection
      ▼
┌─────────────────────────────────────────┐
│  sync_pos_orders_task(tenant, square)   │
│  sync_pos_orders_task(tenant, clover)   │
│  sync_pos_orders_task(tenant, toast)    │
└──────────────┬──────────────────────────┘
               │
               ▼
    POSIngestionService.sync_orders()
               │
               ▼
    Adapter.fetch_orders_updated_since()
               │
               ▼
    upsert_order_graph() → PostgreSQL
```

---

## POS Integration Layer

### Adapter Pattern

Each POS provider implements the `POSAdapter` base class:

```python
class POSAdapter:
    provider_name: str

    def fetch_orders_updated_since(
        self,
        *,
        access_token: str,
        external_location_id: str,
        cursor: str | None,
        limit: int = 100,
    ) -> tuple[list[CanonicalOrder], str | None]:
        ...

    def verify_webhook_signature(
        self,
        *,
        headers: dict[str, str],
        raw_body: bytes,
        secret: str,
    ) -> bool:
        ...

    def parse_webhook(
        self,
        *,
        headers: dict[str, str],
        raw_body: bytes,
    ) -> RawWebhookEnvelope:
        ...
```

### File Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── square_sync.py          # Square sync + webhook endpoints
│   │   ├── clover_sync.py          # Clover sync + webhook endpoints
│   │   ├── onboarding_pos.py       # POS onboarding flow
│   │   └── onboarding_square_callback.py  # Square OAuth callback
│   │
│   ├── integrations/
│   │   └── pos/
│   │       ├── base.py             # POSAdapter base class
│   │       ├── schemas.py          # CanonicalOrder, CanonicalOrderItem, etc.
│   │       ├── square_adapter.py   # Square implementation
│   │       ├── clover_adapter.py   # Clover implementation
│   │       ├── toast_adapter.py    # Toast (stub - pending API access)
│   │       ├── registry.py         # POSAdapterRegistry
│   │       ├── registry_instance.py # Singleton registry with all adapters
│   │       ├── repositories.py     # DB read/write operations
│   │       └── service.py          # POSIngestionService orchestrator
│   │
│   └── worker/
│       ├── celery_app.py           # Celery configuration
│       ├── beat_schedule.py        # Beat scheduler (every 15 mins)
│       └── tasks/
│           └── pos_sync_task.py    # dispatch + sync tasks
│
├── .python-version                 # Python 3.11.9 for Render
└── requirements.txt
```

---

## Supported Providers

| Provider | Auth Type | Sync | Webhooks | Status |
|----------|-----------|------|----------|--------|
| **Square** | OAuth / API Key | ✅ Cursor-based | ✅ HMAC-SHA256 | Production |
| **Clover** | API Key | ✅ Timestamp-based | ✅ Signature | Production |
| **Toast** | API Key (partner) | ⏳ Pending | ⏳ Pending | Awaiting API access |

---

## Data Flow

### 3-Layer Architecture

```
Layer 1: RAW
─────────────
restaurant.pos_raw_event
  - Raw JSON blob from POS
  - Idempotent (payload_hash unique constraint)
  - Status: new → processed / failed

Layer 2: CANONICAL (Staging)
─────────────────────────────
restaurant.pos_order
restaurant.pos_order_item
restaurant.pos_order_payment
  - Provider-agnostic
  - No internal ID dependencies
  - Safe for all POS providers

Layer 3: ANALYTICS
───────────────────
restaurant.fact_order
restaurant.fact_order_item
  - Internal analytics schema
  - Populated via ETL from Layer 2
```

### Canonical Order Schema

```python
class CanonicalOrder(BaseModel):
    provider: str                    # "square" | "clover" | "toast"
    provider_order_id: str           # POS-specific order ID
    external_location_id: str        # POS location/merchant ID
    order_ts: datetime
    order_date: date
    order_channel: str               # "POS" | "online" | etc.
    order_status: str                # "COMPLETED" | "OPEN" | etc.
    gross_sales: Decimal
    discount_amount: Decimal
    net_sales: Decimal
    tax_amount: Decimal
    tip_amount: Decimal
    service_charge_amount: Decimal
    customer_count: int
    items: list[CanonicalOrderItem]
    payments: list[CanonicalPayment]
    discounts: list[CanonicalDiscount]
    refunds: list[CanonicalRefund]
```

---

## Database Schema

### Key Tables

```sql
-- Active POS connections per tenant
restaurant.pos_connection (
    pos_connection_id   BIGSERIAL PRIMARY KEY,
    tenant_id           UUID NOT NULL,
    location_id         BIGINT NOT NULL,
    provider            TEXT NOT NULL,          -- 'square' | 'clover' | 'toast'
    external_merchant_id TEXT,
    external_location_id TEXT,
    auth_type           TEXT,                   -- 'oauth' | 'api_key'
    api_key             TEXT,
    access_token_encrypted TEXT,
    webhook_secret_encrypted TEXT,
    status              TEXT DEFAULT 'active'
)

-- Cursor-based sync state per provider
restaurant.pos_sync_state (
    tenant_id           UUID,
    location_id         BIGINT,
    provider            TEXT,
    resource_name       TEXT,                   -- 'orders'
    cursor_value        TEXT,                   -- last sync cursor
    last_success_at     TIMESTAMPTZ
)

-- Raw event log (immutable)
restaurant.pos_raw_event (
    raw_event_id        BIGSERIAL PRIMARY KEY,
    tenant_id           UUID,
    location_id         BIGINT,
    provider            TEXT,
    event_source        TEXT,                   -- 'poll' | 'webhook'
    event_type          TEXT,                   -- 'order.sync' | 'order.updated'
    payload_json        JSONB,
    payload_hash        TEXT,
    status              TEXT,                   -- 'new' | 'processed' | 'failed'
    UNIQUE (tenant_id, location_id, provider, payload_hash)
)

-- Canonical order staging
restaurant.pos_order (
    pos_order_id        BIGSERIAL PRIMARY KEY,
    tenant_id           UUID NOT NULL,
    location_id         BIGINT NOT NULL,
    provider            TEXT NOT NULL,
    provider_order_id   TEXT NOT NULL,
    gross_sales         NUMERIC(12,2),
    net_sales           NUMERIC(12,2),
    tax_amount          NUMERIC(12,2),
    tip_amount          NUMERIC(12,2),
    UNIQUE (tenant_id, provider, provider_order_id)
)
```

---

## API Endpoints

### Square POS

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pos/square/sync` | Manually trigger Square order sync |
| `POST` | `/api/pos/square/webhook` | Receive Square webhook events |

### Clover POS

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/pos/clover/sync` | Manually trigger Clover order sync |
| `GET` | `/api/pos/clover/webhook` | Clover webhook verification |
| `POST` | `/api/pos/clover/webhook` | Receive Clover webhook events |

### Onboarding

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/onboarding/pos` | Start POS OAuth flow |
| `GET` | `/api/onboarding/square/callback` | Square OAuth callback |
| `GET` | `/api/onboarding/clover/callback` | Clover OAuth callback |

### Sync Request Body

```json
{
  "tenant_id": "41f02224-d01f-48be-b0a4-729f2244bb73",
  "location_id": 101
}
```

### Sync Response

```json
{
  "status": "success",
  "provider": "square",
  "tenant_id": "41f02224-d01f-48be-b0a4-729f2244bb73",
  "location_id": 101,
  "processed_orders": 2,
  "failed_orders": 0,
  "next_cursor": null
}
```

---

## Scheduled Sync (Celery)

### Components

| Service | Role | Command |
|---------|------|---------|
| `valora-celery-worker` | Executes sync tasks | `celery -A app.worker.celery_app worker --loglevel=info -Q sync,default,beat --concurrency=2` |
| `valora-celery-beat` | Fires tasks every 15 mins | `celery -A app.worker.beat_schedule beat --loglevel=info` |
| `valora-redis` | Message broker | Render Key Value (Valkey 8) |

### Task Flow

```
Beat (every 15 mins)
  └── dispatch_all_pos_syncs()          [queue: beat]
        └── sync_pos_orders_task()      [queue: sync]
              ├── tenant_1 + square
              ├── tenant_1 + clover
              └── tenant_2 + square
```

### Manual Trigger

```bash
celery -A app.worker.celery_app call \
  app.worker.tasks.pos_sync_task.dispatch_all_pos_syncs
```

---

## Webhooks

### Square Webhook

- **URL:** `https://valorarestaurant.onrender.com/api/pos/square/webhook`
- **Signature:** HMAC-SHA256 (`notification_url + raw_body`)
- **Header:** `x-square-hmacsha256-signature`
- **Tenant Lookup:** via `merchant_id` in payload → `pos_connection.external_merchant_id`

### Clover Webhook

- **URL:** `https://valorarestaurant.onrender.com/api/pos/clover/webhook`
- **Verification:** POST with `{"verificationCode": "..."}` → enter in dashboard
- **Signature:** HMAC-SHA256 with timestamp
- **Tenant Lookup:** via `merchantId` in payload → `pos_connection.external_merchant_id`

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://red-xxx:6379

# Square
SQUARE_APP_ID=sandbox-sq0idb-...
SQUARE_APP_SECRET=sandbox-sq0csb-...
SQUARE_ACCESS_TOKEN=EAAAl...
SQUARE_LOCATION_ID=L...
SQUARE_OAUTH_BASE=https://connect.squareupsandbox.com   # sandbox
# SQUARE_OAUTH_BASE=https://connect.squareup.com        # production
SQUARE_REDIRECT_URI=https://valorarestaurant.onrender.com/api/onboarding/square/callback
SQUARE_WEBHOOK_URL=https://valorarestaurant.onrender.com/api/pos/square/webhook
SQUARE_ENVIRONMENT=sandbox

# Clover
CLOVER_APP_ID=37BQ9W40N0XR0
CLOVER_CLIENT_SECRET=...
CLOVER_API_BASE=https://sandbox.dev.clover.com          # sandbox
# CLOVER_API_BASE=https://api.clover.com                # production
CLOVER_REDIRECT_URI=https://valorarestaurant.onrender.com/api/onboarding/clover/callback
```

---

## Local Development Setup

### Prerequisites

- Python 3.11+
- Redis (via Homebrew)
- PostgreSQL (Neon or local)

### Installation

```bash
# Clone repo
git clone https://github.com/PawanJadhav7/valorarestaurant.git
cd valorarestaurant/backend

# Create virtual environment
python -m venv .venv_valora_backend
source .venv_valora_backend/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Start Services

```bash
# Terminal 1 - FastAPI
uvicorn main:app --reload

# Terminal 2 - Redis
brew services start redis

# Terminal 3 - Celery Worker
celery -A app.worker.celery_app worker --loglevel=info -Q sync,default,beat

# Terminal 4 - Celery Beat
celery -A app.worker.beat_schedule beat --loglevel=info

# Terminal 5 - ngrok (for webhooks)
ngrok http 8000
```

### Test Endpoints

```bash
# Square sync
curl -X POST http://localhost:8000/api/pos/square/sync \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "YOUR_TENANT_ID", "location_id": 101}'

# Clover sync
curl -X POST http://localhost:8000/api/pos/clover/sync \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "YOUR_TENANT_ID", "location_id": 101}'

# Manual Celery dispatch
celery -A app.worker.celery_app call \
  app.worker.tasks.pos_sync_task.dispatch_all_pos_syncs
```

---

## Deployment (Render)

### Services

| Service | Type | Plan | Cost |
|---------|------|------|------|
| `valorarestaurant` | Web Service | Free | $0 |
| `valora-celery-worker` | Background Worker | Starter | $7/mo |
| `valora-celery-beat` | Background Worker | Starter | $7/mo |
| `valora-redis` | Key Value (Valkey) | Free | $0 |
| **Total** | | | **$14/mo** |

### Cost Optimization (Month 2+)

Combine worker + beat into one service to save $7/month:

```bash
# Single combined start command
celery -A app.worker.beat_schedule worker --beat --loglevel=info -Q sync,default,beat
```

---

## Production Checklist

### Moving from Sandbox to Production

- [ ] Change `SQUARE_OAUTH_BASE` → `https://connect.squareup.com`
- [ ] Change `CLOVER_API_BASE` → `https://api.clover.com`
- [ ] Get production Square credentials from Square Dashboard
- [ ] Get production Clover credentials (requires app review)
- [ ] Update `square_adapter.py` default `base_url`
- [ ] Update `clover_adapter.py` default `base_url`
- [ ] Update Square OAuth redirect URI in Square Dashboard
- [ ] Update Square webhook URL in Square Dashboard
- [ ] Update Clover webhook URL in Clover Developer Dashboard
- [ ] Update all `pos_connection` rows with production tokens
- [ ] Test all endpoints on production

---

## Adding a New POS Provider

1. **Create adapter** in `app/integrations/pos/`:

```python
# toast_adapter.py
class ToastAdapter(POSAdapter):
    provider_name = "toast"

    def fetch_orders_updated_since(self, ...):
        # Implement Toast API call
        ...

    def verify_webhook_signature(self, ...):
        # Implement Toast HMAC verification
        ...

    def parse_webhook(self, ...):
        # Parse Toast webhook payload
        ...
```

2. **Register** in `registry_instance.py`:

```python
from .toast_adapter import ToastAdapter
pos_registry.register(ToastAdapter())
```

3. **Create sync endpoint** `app/api/toast_sync.py` (copy from `square_sync.py`)

4. **Register router** in `main.py`

5. **Add environment variables** for new provider

6. **Test** locally → deploy to Render

---

## Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `403 Forbidden` from Square | Wrong access token or missing permissions | Re-authorize test account in Square Dashboard |
| `SSL: TLSV1_UNRECOGNIZED_NAME` | httpx SSL issue on Python 3.14 | Use `requests` library instead |
| `DATABASE_URL is not set` | Missing env var on Render | Add to Render service environment |
| `Out of memory (512MB)` | Too many Celery workers | Add `--concurrency=2` to worker command |
| `duplicate key value` | Order already synced | Expected — handled gracefully with `ON CONFLICT DO NOTHING` |
| `NotImplementedError: Toast` | Toast adapter not implemented | Gracefully skipped — awaiting API access |

### Logs

```bash
# Local Celery Worker logs
celery -A app.worker.celery_app worker --loglevel=info

# Check raw events in DB
SELECT raw_event_id, status, error_message
FROM restaurant.pos_raw_event
WHERE status = 'failed'
ORDER BY received_at DESC LIMIT 10;

# Check sync job logs
SELECT * FROM restaurant.pos_sync_job_log
ORDER BY started_at DESC LIMIT 10;
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| Apr 4, 2026 | v1.0 | Initial POS integration — Square + Clover |
| Apr 4, 2026 | v1.0 | Celery scheduled sync (every 15 mins) |
| Apr 4, 2026 | v1.0 | Square + Clover webhooks with signature verification |
| Apr 4, 2026 | v1.0 | Production deployment on Render |
| TBD | v1.1 | Toast integration (pending API access) |

---

*Built by Valora AI Engineering · April 2026*
