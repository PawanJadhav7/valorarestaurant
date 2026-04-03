from typing import Literal, Dict, Any
import logging
from urllib.parse import urlencode
import os
import requests
import io

import pandas as pd
from fastapi import UploadFile
from sqlalchemy import text

from app.db import get_db

logger = logging.getLogger(__name__)

POSProvider = Literal["toast", "square", "clover", "csv"]
ConnectionMode = Literal["oauth", "manual"]


class POSIngestionService:
    def __init__(self, tenant_id: str, provider: POSProvider, mode: ConnectionMode):
        self.tenant_id = tenant_id
        self.provider = provider.lower()
        self.mode = mode.lower()

        if self.provider not in {"toast", "square", "clover", "csv"}:
            raise ValueError(f"Invalid POS provider: {provider}")
        if self.mode not in {"oauth", "manual"}:
            raise ValueError(f"Invalid connection mode: {mode}")

        logger.info(
            "Initialized POSIngestionService: tenant_id=%s, provider=%s, mode=%s",
            tenant_id,
            provider,
            mode,
        )

    def start_ingestion(self) -> Dict[str, Any]:
        logger.info(
            "Starting POS ingestion for provider %s in %s mode",
            self.provider,
            self.mode,
        )
        if self.provider == "toast":
            return self._ingest_toast()
        elif self.provider == "square":
            return self._ingest_square()
        elif self.provider == "clover":
            return self._ingest_clover()
        elif self.provider == "csv":
            return self._ingest_csv()
        else:
            raise ValueError(f"Unsupported POS provider: {self.provider}")

    async def process_csv(self, file: UploadFile) -> Dict[str, Any]:
        """
        CSV onboarding path:
        - parse and validate CSV
        - map locations against restaurant.dim_location for this tenant
        - replace existing tenant raw rows (idempotent tenant-level reload)
        - load rows into restaurant.raw_restaurant_daily
        """
        if not file:
            raise ValueError("CSV file is required")

        filename = file.filename or "upload.csv"
        if not filename.lower().endswith(".csv"):
            raise ValueError("Only CSV uploads are supported")

        raw = await file.read()
        if not raw:
            raise ValueError("Uploaded CSV is empty")

        try:
            decoded = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise ValueError("CSV must be UTF-8 encoded")

        try:
            df = pd.read_csv(io.StringIO(decoded))
        except Exception as e:
            logger.error("CSV parsing failed for tenant %s: %s", self.tenant_id, e)
            raise ValueError(f"Failed to parse CSV: {e}")

        if df.empty:
            raise ValueError("Uploaded CSV contains no rows")

        original_columns = [str(c).strip() for c in df.columns.tolist()]
        df.columns = [self._normalize_col(c) for c in df.columns.tolist()]

        required_columns = {
            "location_name",
            "day",
            "revenue",
            "cogs",
            "labor",
            "fixed_costs",
            "marketing_spend",
            "interest_expense",
            "orders",
            "customers",
            "new_customers",
            "avg_inventory",
            "ar_balance",
            "ap_balance",
            "ebit",
        }

        missing = [c for c in required_columns if c not in df.columns]
        if missing:
            raise ValueError(
                f"CSV missing required columns: {', '.join(sorted(missing))}"
            )

        df = self._normalize_dataframe(df)

        db = next(get_db())
        try:
            dim_locations = db.execute(
                text(
                    """
                    select
                      location_id,
                      location_name
                    from restaurant.dim_location
                    where tenant_id = cast(:tenant_id as uuid)
                      and is_active = true
                    """
                ),
                {"tenant_id": self.tenant_id},
            ).mappings().all()

            if not dim_locations:
                raise ValueError("No active tenant locations found for this tenant")

            location_lookup = {
                self._normalize_location_name(row["location_name"]): int(row["location_id"])
                for row in dim_locations
            }

            rows_to_insert = []
            unmatched_locations = set()

            for _, row in df.iterrows():
                location_name = str(row["location_name"]).strip()
                normalized_location = self._normalize_location_name(location_name)
                location_id_bigint = location_lookup.get(normalized_location)

                if not location_id_bigint:
                    unmatched_locations.add(location_name)
                    continue

                rows_to_insert.append(
                    {
                        "tenant_id": self.tenant_id,
                        "location_id": str(location_id_bigint),
                        "location_id_bigint": location_id_bigint,
                        "location_name": location_name,
                        "day": row["day"],
                        "revenue": row["revenue"],
                        "cogs": row["cogs"],
                        "labor": row["labor"],
                        "fixed_costs": row["fixed_costs"],
                        "marketing_spend": row["marketing_spend"],
                        "interest_expense": row["interest_expense"],
                        "orders": int(row["orders"]),
                        "customers": int(row["customers"]),
                        "new_customers": int(row["new_customers"]),
                        "avg_inventory": row["avg_inventory"],
                        "ar_balance": row["ar_balance"],
                        "ap_balance": row["ap_balance"],
                        "ebit": row["ebit"],
                        "source_file": filename,
                    }
                )

            if unmatched_locations:
                raise ValueError(
                    "CSV contains location_name values not found in tenant dim_location: "
                    + ", ".join(sorted(unmatched_locations))
                )

            if not rows_to_insert:
                raise ValueError("No valid rows available for insert after validation")

            # Idempotent tenant-level reload:
            # replace all existing raw rows for this tenant with this upload.
            delete_sql = text(
                """
                delete from restaurant.raw_restaurant_daily
                where tenant_id = cast(:tenant_id as uuid)
                """
            )
            delete_res = db.execute(delete_sql, {"tenant_id": self.tenant_id})

            insert_sql = text(
                """
                insert into restaurant.raw_restaurant_daily (
                  tenant_id,
                  location_id,
                  location_id_bigint,
                  location_name,
                  day,
                  revenue,
                  cogs,
                  labor,
                  fixed_costs,
                  marketing_spend,
                  interest_expense,
                  orders,
                  customers,
                  new_customers,
                  avg_inventory,
                  ar_balance,
                  ap_balance,
                  ebit,
                  source_file
                )
                values (
                  cast(:tenant_id as uuid),
                  :location_id,
                  :location_id_bigint,
                  :location_name,
                  :day,
                  :revenue,
                  :cogs,
                  :labor,
                  :fixed_costs,
                  :marketing_spend,
                  :interest_expense,
                  :orders,
                  :customers,
                  :new_customers,
                  :avg_inventory,
                  :ar_balance,
                  :ap_balance,
                  :ebit,
                  :source_file
                )
                """
            )

            for payload in rows_to_insert:
                db.execute(insert_sql, payload)

            db.commit()

            deleted_rows = getattr(delete_res, "rowcount", None)
            logger.info(
                "CSV ingested for tenant %s: file=%s deleted_raw_rows=%s inserted_rows=%s",
                self.tenant_id,
                filename,
                deleted_rows,
                len(rows_to_insert),
            )

            return {
                "ok": True,
                "provider": "csv",
                "tenant_id": self.tenant_id,
                "filename": filename,
                "rows": int(len(rows_to_insert)),
                "deleted_raw_rows": int(deleted_rows or 0),
                "columns": original_columns,
                "normalized_columns": df.columns.tolist(),
            }

        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def _normalize_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        df["location_name"] = df["location_name"].astype(str).str.strip()
        df["day"] = pd.to_datetime(df["day"], errors="coerce").dt.date

        numeric_columns = [
            "revenue",
            "cogs",
            "labor",
            "fixed_costs",
            "marketing_spend",
            "interest_expense",
            "orders",
            "customers",
            "new_customers",
            "avg_inventory",
            "ar_balance",
            "ap_balance",
            "ebit",
        ]

        for col in numeric_columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        bad_days = df["day"].isna()
        if bad_days.any():
            raise ValueError("One or more rows have invalid day values")

        for col in numeric_columns:
            if df[col].isna().any():
                raise ValueError(f"One or more rows have invalid numeric values in '{col}'")

        int_columns = ["orders", "customers", "new_customers"]
        for col in int_columns:
            df[col] = df[col].astype(int)

        return df

    def _normalize_col(self, name: str) -> str:
        return (
            str(name)
            .strip()
            .lower()
            .replace(" ", "_")
            .replace("-", "_")
        )

    def _normalize_location_name(self, name: str) -> str:
        return " ".join(str(name).strip().lower().split())

    # ------------------ Provider-specific ingestion ------------------ #
    def _ingest_toast(self) -> Dict[str, Any]:
        logger.debug("Simulating Toast ingestion")
        return {"ok": True, "provider": "toast", "data_rows_ingested": 0}

    def _ingest_square(self) -> Dict[str, Any]:
        logger.info(
            "Starting Square ingestion for tenant %s in %s mode",
            self.tenant_id,
            self.mode,
        )

        if self.mode == "manual":
            return {
                "ok": True,
                "provider": "square",
                "mode": "manual",
                "data_rows_ingested": 0,
            }

        access_token = os.getenv("SQUARE_ACCESS_TOKEN")  # or fetch from DB
        if not access_token:
            return {
                "ok": False,
                "provider": "square",
                "error": "No Square access token found",
            }

        try:
            from app.integrations.pos.square_adapter import SquareAdapter
            adapter = SquareAdapter()

            orders, next_cursor = adapter.fetch_orders_updated_since(
                access_token=access_token,
                external_location_id=os.getenv("SQUARE_LOCATION_ID", ""),
                cursor=None,
                limit=100,
            )

            return {
                "ok": True,
                "provider": "square",
                "data_rows_ingested": len(orders),
                "next_cursor": next_cursor,
            }

        except Exception as e:
            logger.error("Square ingestion failed for tenant %s: %s", self.tenant_id, e)
            return {"ok": False, "provider": "square", "error": str(e)}

    def _ingest_clover(self) -> Dict[str, Any]:
        logger.info(
            "Starting Clover ingestion for tenant %s in %s mode",
            self.tenant_id,
            self.mode,
        )

        if self.mode == "manual":
            logger.info("Manual Clover ingestion selected")
            return {
                "ok": True,
                "provider": "clover",
                "mode": "manual",
                "data_rows_ingested": 0,
            }

        access_token = self._get_saved_access_token(self.tenant_id)
        if not access_token:
            oauth_url = self.get_clover_oauth_url(self.tenant_id)
            logger.info(
                "No Clover token for tenant %s, sending OAuth URL",
                self.tenant_id,
            )
            return {
                "ok": True,
                "provider": "clover",
                "mode": "oauth",
                "oauth_url": oauth_url,
            }

        try:
            data = self.fetch_initial_data(access_token)
            rows_ingested = self._save_orders_to_db(self.tenant_id, data)
            logger.info(
                "Ingested %s Clover orders for tenant %s",
                rows_ingested,
                self.tenant_id,
            )
            return {
                "ok": True,
                "provider": "clover",
                "data_rows_ingested": rows_ingested,
            }
        except Exception as e:
            logger.error("Clover ingestion failed for tenant %s: %s", self.tenant_id, e)
            return {"ok": False, "provider": "clover", "error": str(e)}

    def _ingest_csv(self) -> Dict[str, Any]:
        logger.debug("Simulating CSV manual ingestion")
        return {"ok": True, "provider": "csv", "data_rows_ingested": 0}

    # ---------------- Helper methods ---------------- #
    def _get_saved_access_token(self, tenant_id: str) -> str | None:
        return None

    def _save_orders_to_db(self, tenant_id: str, data: dict) -> int:
        return len(data.get("elements", []))

    # ---------------- Clover OAuth & API ---------------- #
    def get_clover_oauth_url(self, tenant_id: str) -> str:
        params = {
            "client_id": os.getenv("CLOVER_APP_ID"),
            "redirect_uri": os.getenv("CLOVER_REDIRECT_URI"),
            "response_type": "code",
            "state": tenant_id,
        }
        return f"{os.getenv('CLOVER_API_BASE')}/oauth/authorize?{urlencode(params)}"

    # ---------------- Square OAuth & API ---------------- #
    def get_square_oauth_url(self, tenant_id: str) -> str:
        params = {
            "client_id": os.getenv("SQUARE_APP_ID"),
            "scope": "MERCHANT_PROFILE_READ ORDERS_READ PAYMENTS_READ CUSTOMERS_READ ITEMS_READ",
            "session": "false",
            "state": tenant_id,
        }
        base_url = os.getenv("SQUARE_OAUTH_BASE", "https://connect.squareupsandbox.com")
        return f"{base_url}/oauth2/authorize?{urlencode(params)}"

    def exchange_code_for_token(self, code: str) -> dict:
        url = f"{os.getenv('CLOVER_API_BASE')}/oauth/token"
        data = {
            "client_id": os.getenv("CLOVER_APP_ID"),
            "client_secret": os.getenv("CLOVER_CLIENT_SECRET"),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": os.getenv("CLOVER_REDIRECT_URI"),
        }
        resp = requests.post(url, data=data)
        resp.raise_for_status()
        return resp.json()

    def fetch_initial_data(self, access_token: str):
        url = f"{os.getenv('CLOVER_API_BASE')}/v3/merchants/me/orders"
        headers = {"Authorization": f"Bearer {access_token}"}
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        return resp.json()