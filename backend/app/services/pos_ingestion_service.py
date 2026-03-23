# backend/app/services/pos_ingestion_service.py
from typing import Literal, Dict, Any
import logging
from urllib.parse import urlencode
import os
import requests

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

        logger.info(f"Initialized POSIngestionService: tenant_id={tenant_id}, provider={provider}, mode={mode}")

    def start_ingestion(self) -> Dict[str, Any]:
        logger.info(f"Starting POS ingestion for provider {self.provider} in {self.mode} mode")
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

    # ------------------ Provider-specific ingestion ------------------ #
    def _ingest_toast(self) -> Dict[str, Any]:
        logger.debug("Simulating Toast ingestion")
        return {"ok": True, "provider": "toast", "data_rows_ingested": 0}

    def _ingest_square(self) -> Dict[str, Any]:
        logger.debug("Simulating Square ingestion")
        return {"ok": True, "provider": "square", "data_rows_ingested": 0}

    def _ingest_clover(self) -> Dict[str, Any]:
        """
        Clover ingestion:
        - OAuth mode: generate OAuth URL if no token, otherwise fetch initial data
        - Manual mode: just return placeholder
        """
        logger.info(f"Starting Clover ingestion for tenant {self.tenant_id} in {self.mode} mode")

        if self.mode == "manual":
            logger.info("Manual Clover ingestion selected")
            return {"ok": True, "provider": "clover", "mode": "manual", "data_rows_ingested": 0}

        # OAuth mode
        access_token = self._get_saved_access_token(self.tenant_id)
        if not access_token:
            # No token yet → send OAuth URL to frontend
            oauth_url = self.get_clover_oauth_url(self.tenant_id)
            logger.info(f"No Clover token for tenant {self.tenant_id}, sending OAuth URL")
            return {"ok": True, "provider": "clover", "mode": "oauth", "oauth_url": oauth_url}

        # Token exists → fetch initial data
        try:
            data = self.fetch_initial_data(access_token)
            rows_ingested = self._save_orders_to_db(self.tenant_id, data)
            logger.info(f"Ingested {rows_ingested} Clover orders for tenant {self.tenant_id}")
            return {"ok": True, "provider": "clover", "data_rows_ingested": rows_ingested}
        except Exception as e:
            logger.error(f"Clover ingestion failed for tenant {self.tenant_id}: {e}")
            return {"ok": False, "provider": "clover", "error": str(e)}

    def _ingest_csv(self) -> Dict[str, Any]:
        logger.debug("Simulating CSV manual ingestion")
        return {"ok": True, "provider": "csv", "data_rows_ingested": 0}

    # ---------------- Helper methods ---------------- #
    def _get_saved_access_token(self, tenant_id: str) -> str | None:
        """
        TODO: Implement DB lookup to retrieve saved Clover access token for tenant.
        """
        return None  # placeholder until DB integration

    def _save_orders_to_db(self, tenant_id: str, data: dict) -> int:
        """
        TODO: Implement saving orders to DB. Return number of rows ingested.
        """
        return len(data.get("elements", []))

    # ---------------- Clover OAuth & API ---------------- #
    def get_clover_oauth_url(self, tenant_id: str) -> str:
        params = {
            "client_id": os.getenv("CLOVER_APP_ID"),
            "redirect_uri": os.getenv("CLOVER_REDIRECT_URI"),
            "response_type": "code",
            "state": tenant_id
        }
        return f"{os.getenv('CLOVER_API_BASE')}/oauth/authorize?{urlencode(params)}"

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
        data = resp.json()
        return data