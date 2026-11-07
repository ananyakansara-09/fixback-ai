import math
import secrets
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.models.incident import Incident, IncidentStatus
from app.schemas.incident import (
    IncidentAnalyzeRequest,
    IncidentConfirmRequest,
    IncidentResponse,
    AIDiagnosisSchema,
    IncidentAnalyzeResult,
    IncidentConfirmResult,
    PaginatedIncidentsData,
)
from app.schemas.dashboard import (
    DashboardStatsData,
    IncidentOverTimeItem,
    ActivityItem,
)
from app.services.hindsight_service import hindsight_service
from app.services.groq_service import groq_service
from app.utils.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


def generate_incident_code() -> str:
    """Generate a clean, readable incident code (e.g. INC-20261107-AB12)."""
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_hex = secrets.token_hex(2).upper()
    return f"INC-{date_str}-{random_hex}"


class IncidentService:
    """Core domain service orchestrating database operations, Hindsight recall/retention, and Groq diagnosis."""

    def analyze_incident(self, db: Session, req: IncidentAnalyzeRequest) -> IncidentAnalyzeResult:
        """Analyze an incident: creates DB record, recalls Hindsight memories, runs Groq diagnosis, and updates status."""
        code = generate_incident_code()
        # Ensure code uniqueness
        while db.query(Incident).filter(Incident.incident_code == code).first() is not None:
            code = generate_incident_code()

        incident = Incident(
            incident_code=code,
            title=req.title.strip(),
            service=req.service.strip(),
            environment=req.environment.strip(),
            error_message=req.error_message.strip(),
            logs=req.logs.strip() if req.logs else None,
            status=IncidentStatus.ANALYZING,
            memory_retained=False,
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)

        # Generate recall query from service and error
        recall_query = f"{incident.service} {incident.title} {incident.error_message[:150]}".strip()

        # Retrieve relevant memories from Hindsight
        recall_result = hindsight_service.recall_incidents(query=recall_query, limit=5)
        memories = recall_result.get("memories", [])
        hindsight_status = {
            "lookup_successful": recall_result.get("success", False),
            "memories_found": len(memories),
            "error": recall_result.get("error"),
        }

        # Send current incident and actual memories to Groq
        diagnosis: AIDiagnosisSchema = groq_service.diagnose_incident(
            title=incident.title,
            service=incident.service,
            environment=incident.environment,
            error_message=incident.error_message,
            logs=incident.logs,
            historical_memories=memories,
        )

        # Update incident record in database
        incident.ai_diagnosis = diagnosis.model_dump()
        incident.status = IncidentStatus.AWAITING_CONFIRMATION
        db.commit()
        db.refresh(incident)

        return IncidentAnalyzeResult(
            incident=IncidentResponse.model_validate(incident),
            diagnosis=diagnosis,
            historical_memories=memories,
            hindsight_status=hindsight_status,
        )

    def confirm_resolution(
        self,
        db: Session,
        incident_identifier: str,
        req: IncidentConfirmRequest,
    ) -> IncidentConfirmResult:
        """Confirm incident resolution, update PostgreSQL, and retain in Hindsight Cloud memory idempotently."""
        incident = self.get_incident_or_404(db, incident_identifier)

        # Retry-safety: if already resolved and already retained in Hindsight, return directly
        if incident.status == IncidentStatus.RESOLVED and incident.memory_retained:
            logger.info("Incident %s is already resolved and retained in memory. Returning existing record.", incident.incident_code)
            return IncidentConfirmResult(
                incident=IncidentResponse.model_validate(incident),
                memory_retained=True,
                retention_details={"status": "already_retained", "idempotent": True},
            )

        # Update incident in database
        incident.root_cause = req.root_cause.strip()
        incident.resolution = req.resolution.strip()
        incident.status = IncidentStatus.RESOLVED
        incident.resolved_at = datetime.now(timezone.utc)

        # Retain confirmed incident in Hindsight Cloud
        retention_result = hindsight_service.retain_incident(
            incident_id=str(incident.id),
            incident_code=incident.incident_code,
            service=incident.service,
            environment=incident.environment,
            error_message=incident.error_message,
            confirmed_root_cause=incident.root_cause,
            verified_resolution=incident.resolution,
        )

        was_retained = bool(retention_result.get("success", False))
        incident.memory_retained = was_retained

        db.commit()
        db.refresh(incident)

        return IncidentConfirmResult(
            incident=IncidentResponse.model_validate(incident),
            memory_retained=was_retained,
            retention_details=retention_result,
        )

    def get_incidents(
        self,
        db: Session,
        page: int = 1,
        limit: int = 10,
        search: Optional[str] = None,
        service: Optional[str] = None,
        environment: Optional[str] = None,
        status: Optional[str] = None,
    ) -> PaginatedIncidentsData:
        """Fetch paginated incidents with search and multi-attribute filters."""
        if page < 1:
            raise ValidationError("Page number must be greater than or equal to 1")
        if limit < 1 or limit > 100:
            raise ValidationError("Limit must be between 1 and 100")

        query = db.query(Incident)

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Incident.title.ilike(term),
                    Incident.error_message.ilike(term),
                    Incident.incident_code.ilike(term),
                    Incident.service.ilike(term),
                )
            )

        if service and service.strip():
            query = query.filter(Incident.service.ilike(service.strip()))

        if environment and environment.strip():
            query = query.filter(Incident.environment.ilike(environment.strip()))

        if status and status.strip():
            query = query.filter(Incident.status == status.strip().lower())

        total = query.count()
        total_pages = math.ceil(total / limit) if total > 0 else 1
        offset = (page - 1) * limit

        incidents = query.order_by(desc(Incident.created_at)).offset(offset).limit(limit).all()

        return PaginatedIncidentsData(
            items=[IncidentResponse.model_validate(inc) for inc in incidents],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    def get_incident_or_404(self, db: Session, identifier: str) -> Incident:
        """Find an incident by UUID or incident_code, or raise NotFoundError."""
        incident = None
        # Try finding by UUID if valid
        try:
            val_uuid = UUID(identifier)
            incident = db.query(Incident).filter(Incident.id == val_uuid).first()
        except (ValueError, AttributeError):
            pass

        if not incident:
            incident = db.query(Incident).filter(Incident.incident_code == identifier).first()

        if not incident:
            raise NotFoundError(f"Incident with identifier '{identifier}' was not found.")

        return incident

    def get_incident_details(self, db: Session, identifier: str) -> IncidentResponse:
        """Get full details of a specific incident."""
        incident = self.get_incident_or_404(db, identifier)
        return IncidentResponse.model_validate(incident)

    def get_dashboard_stats(self, db: Session) -> DashboardStatsData:
        """Compute real PostgreSQL dashboard metrics, status aggregations, time-series, and recent activities."""
        # 1. Status counts
        total_incidents = db.query(func.count(Incident.id)).scalar() or 0
        resolved_count = (
            db.query(func.count(Incident.id))
            .filter(Incident.status == IncidentStatus.RESOLVED)
            .scalar()
            or 0
        )
        pending_count = (
            db.query(func.count(Incident.id))
            .filter(Incident.status == IncidentStatus.AWAITING_CONFIRMATION)
            .scalar()
            or 0
        )
        analyzing_count = (
            db.query(func.count(Incident.id))
            .filter(Incident.status == IncidentStatus.ANALYZING)
            .scalar()
            or 0
        )
        retained_count = (
            db.query(func.count(Incident.id))
            .filter(Incident.memory_retained.is_(True))
            .scalar()
            or 0
        )

        incidents_by_status = {
            IncidentStatus.RESOLVED: resolved_count,
            IncidentStatus.AWAITING_CONFIRMATION: pending_count,
            IncidentStatus.ANALYZING: analyzing_count,
        }

        # 2. Incidents over time (grouped by date)
        # Using cross-db compatible date formatting
        all_incidents_dates = (
            db.query(Incident.created_at)
            .order_by(Incident.created_at.asc())
            .all()
        )
        date_counts: Dict[str, int] = {}
        for (created_at,) in all_incidents_dates:
            if created_at:
                d_str = created_at.strftime("%Y-%m-%d")
                date_counts[d_str] = date_counts.get(d_str, 0) + 1

        incidents_over_time = [
            IncidentOverTimeItem(date=d, count=c) for d, c in date_counts.items()
        ]

        # 3. Recent incidents (latest 5)
        recent_records = (
            db.query(Incident)
            .order_by(desc(Incident.created_at))
            .limit(5)
            .all()
        )
        recent_incidents = [IncidentResponse.model_validate(inc) for inc in recent_records]

        # 4. Recent activity log
        recent_activity: List[ActivityItem] = []
        for inc in recent_records:
            if inc.resolved_at:
                recent_activity.append(
                    ActivityItem(
                        id=f"act-res-{str(inc.id)[:8]}",
                        incident_code=inc.incident_code,
                        title=inc.title,
                        service=inc.service,
                        action="Resolution Confirmed & Retained",
                        timestamp=inc.resolved_at,
                        details=f"Root cause verified: {inc.root_cause[:80] if inc.root_cause else 'Confirmed'}",
                    )
                )
            recent_activity.append(
                ActivityItem(
                    id=f"act-diag-{str(inc.id)[:8]}",
                    incident_code=inc.incident_code,
                    title=inc.title,
                    service=inc.service,
                    action=f"Incident Analyzed ({inc.status})",
                    timestamp=inc.created_at,
                    details=inc.error_message[:80],
                )
            )

        # Sort activity descending by timestamp
        recent_activity.sort(key=lambda x: x.timestamp, reverse=True)
        recent_activity = recent_activity[:10]

        return DashboardStatsData(
            total_incidents=total_incidents,
            resolved_incidents=resolved_count,
            pending_incidents=pending_count,
            analyzing_incidents=analyzing_count,
            successfully_retained_memories=retained_count,
            incidents_by_status=incidents_by_status,
            incidents_over_time=incidents_over_time,
            recent_incidents=recent_incidents,
            recent_activity=recent_activity,
        )


incident_service = IncidentService()
