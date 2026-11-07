import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional
from hindsight_client import Hindsight

from app.config import settings

logger = logging.getLogger(__name__)

_hindsight_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="hindsight-worker")


def _run_in_worker(fn, *args, **kwargs):
    """Run a Hindsight SDK call in a dedicated worker thread without active event loop collision."""
    future = _hindsight_executor.submit(fn, *args, **kwargs)
    return future.result()


class HindsightService:
    """Service wrapping the official Hindsight Python SDK for memory retention and recall."""

    def __init__(self) -> None:
        self.api_url = settings.HINDSIGHT_API_URL
        self.api_key = settings.HINDSIGHT_API_KEY
        self.bank_id = settings.HINDSIGHT_BANK_ID
        self.bank_name = "FixBack Engineering Memory"
        self._client: Optional[Hindsight] = None

    @property
    def client(self) -> Hindsight:
        """Get or initialize the persistent Hindsight SDK client."""
        if self._client is None:
            self._client = Hindsight(
                base_url=self.api_url,
                api_key=self.api_key,
            )
        return self._client

    def is_configured(self) -> bool:
        """Check if Hindsight API credentials are provided."""
        return bool(self.api_key and self.api_key.strip() and self.api_key != "your_hindsight_api_key")

    def initialize_bank(self) -> Dict[str, Any]:
        """Initialize the engineering memory bank in Hindsight Cloud.
        Handles the bank already existing gracefully.
        """
        if not self.is_configured():
            logger.warning("Hindsight is not configured with an API key. Skipping bank creation.")
            return {
                "success": False,
                "bank_id": self.bank_id,
                "message": "HINDSIGHT_API_KEY not configured",
            }

        try:
            # Check if bank already exists
            try:
                _run_in_worker(self.client.get_bank_config, bank_id=self.bank_id)
                logger.info("Hindsight bank '%s' already exists and is accessible.", self.bank_id)
                return {
                    "success": True,
                    "bank_id": self.bank_id,
                    "name": self.bank_name,
                    "status": "already_exists",
                }
            except Exception as check_err:
                err_str = str(check_err).lower()
                # If 404 or not found, proceed to create
                if "404" not in err_str and "not found" not in err_str:
                    logger.debug("Bank check response: %s", check_err)

            # Create bank
            response = _run_in_worker(
                self.client.create_bank,
                bank_id=self.bank_id,
                name=self.bank_name,
                mission=(
                    "FixBack Engineering Incident Memory: Retains verified historical incident root causes, "
                    "logs, and confirmed engineering resolutions to accelerate troubleshooting and avoid repeat outages."
                ),
            )
            logger.info("Successfully created Hindsight bank '%s'", self.bank_id)
            return {
                "success": True,
                "bank_id": self.bank_id,
                "name": self.bank_name,
                "status": "created",
                "details": getattr(response, "to_dict", lambda: None)(),
            }
        except Exception as exc:
            err_msg = str(exc)
            if "already exists" in err_msg.lower() or "409" in err_msg:
                logger.info("Hindsight bank '%s' already exists (conflict code handled).", self.bank_id)
                return {
                    "success": True,
                    "bank_id": self.bank_id,
                    "name": self.bank_name,
                    "status": "already_exists",
                }
            logger.error("Failed to initialize Hindsight bank '%s': %s", self.bank_id, err_msg)
            return {
                "success": False,
                "bank_id": self.bank_id,
                "error": err_msg,
            }

    def retain_incident(
        self,
        incident_id: str,
        incident_code: str,
        service: str,
        environment: str,
        error_message: str,
        confirmed_root_cause: str,
        verified_resolution: str,
    ) -> Dict[str, Any]:
        """Retain a confirmed incident resolution into Hindsight Cloud memory.
        Accepts ONLY developer-confirmed incident resolutions.
        Never retain AI-generated guesses as verified facts.
        """
        if not self.is_configured():
            logger.warning("Hindsight API key not configured. Cannot retain memory to cloud.")
            return {
                "success": False,
                "error": "Hindsight API key is not configured.",
                "bank_id": self.bank_id,
            }

        # Format structured retention document containing all mandatory fields
        content = (
            f"=== VERIFIED ENGINEERING INCIDENT RESOLUTION ===\n"
            f"Incident ID: {incident_id}\n"
            f"Incident Code: {incident_code}\n"
            f"Service: {service}\n"
            f"Environment: {environment}\n"
            f"Observed error: {error_message}\n"
            f"Confirmed root cause: {confirmed_root_cause}\n"
            f"Verified resolution: {verified_resolution}\n"
            f"Outcome: Successfully resolved in {environment}. Verified by engineering.\n"
            f"Engineering lesson: For service '{service}' experiencing error '{error_message}', "
            f"the confirmed root cause was: {confirmed_root_cause}. Remediation applied: {verified_resolution}."
        )

        metadata = {
            "incident_id": str(incident_id),
            "incident_code": incident_code,
            "service": service,
            "environment": environment,
            "verification_status": "developer_confirmed",
        }
        tags = ["incident", service.lower(), environment.lower(), "confirmed_resolution"]

        try:
            retain_resp = _run_in_worker(
                self.client.retain,
                bank_id=self.bank_id,
                content=content,
                document_id=str(incident_id),
                metadata=metadata,
                tags=tags,
            )

            is_success = getattr(retain_resp, "success", True)
            items_count = getattr(retain_resp, "items_count", 1)
            operation_id = getattr(retain_resp, "operation_id", None)

            logger.info(
                "Successfully retained incident %s in Hindsight bank '%s' (items: %s)",
                incident_code,
                self.bank_id,
                items_count,
            )
            return {
                "success": bool(is_success),
                "bank_id": self.bank_id,
                "items_count": items_count,
                "operation_id": operation_id,
            }
        except Exception as exc:
            logger.error("Hindsight retention failed for incident %s: %s", incident_code, str(exc))
            return {
                "success": False,
                "bank_id": self.bank_id,
                "error": str(exc),
            }

    def recall_incidents(self, query: str, limit: int = 5) -> Dict[str, Any]:
        """Recall historical memories relevant to an incident query.
        Returns actual recalled memories and their available types.
        Never fabricates memory results.
        """
        if not self.is_configured():
            logger.warning("Hindsight is not configured. Memory lookup skipped.")
            return {
                "success": False,
                "memories": [],
                "count": 0,
                "error": "Hindsight API key is not configured.",
            }

        if not query or not query.strip():
            return {
                "success": True,
                "memories": [],
                "count": 0,
                "error": None,
            }

        try:
            recall_resp = _run_in_worker(
                self.client.recall,
                bank_id=self.bank_id,
                query=query.strip(),
            )

            memories_list: List[Dict[str, Any]] = []
            results = getattr(recall_resp, "results", None)

            # In hindsight SDK, recall_resp can be iterable or have .results
            if results is None and hasattr(recall_resp, "__iter__"):
                results = list(recall_resp)
            elif results is None:
                results = []

            for item in results:
                memory_dict = {
                    "id": getattr(item, "id", None),
                    "content": getattr(item, "text", "") or str(item),
                    "memory_type": getattr(item, "type", None),
                    "metadata": getattr(item, "metadata", None),
                    "context": getattr(item, "context", None),
                    "tags": getattr(item, "tags", None),
                }
                memories_list.append(memory_dict)

            # Limit returned memories to requested count
            if limit and len(memories_list) > limit:
                memories_list = memories_list[:limit]

            logger.info("Recalled %d memories for query: '%s'", len(memories_list), query)
            return {
                "success": True,
                "memories": memories_list,
                "count": len(memories_list),
                "error": None,
            }
        except Exception as exc:
            logger.error("Hindsight recall failed for query '%s': %s", query, str(exc))
            return {
                "success": False,
                "memories": [],
                "count": 0,
                "error": str(exc),
            }

    def check_health(self) -> Dict[str, Any]:
        """Check Hindsight connectivity and bank status."""
        configured = self.is_configured()
        if not configured:
            return {
                "configured": False,
                "ready": False,
                "bank_id": self.bank_id,
                "message": "HINDSIGHT_API_KEY is not set or using placeholder",
            }

        try:
            _run_in_worker(self.client.get_bank_config, bank_id=self.bank_id)
            return {
                "configured": True,
                "ready": True,
                "bank_id": self.bank_id,
                "message": "Connected to Hindsight Cloud and bank is accessible",
            }
        except Exception as exc:
            return {
                "configured": True,
                "ready": False,
                "bank_id": self.bank_id,
                "message": f"Connection check failed: {str(exc)}",
            }


hindsight_service = HindsightService()
