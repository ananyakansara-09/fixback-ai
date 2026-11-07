from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.incident import (
    APIResponse,
    IncidentAnalyzeRequest,
    IncidentConfirmRequest,
    IncidentAnalyzeResult,
    IncidentConfirmResult,
    IncidentResponse,
    PaginatedIncidentsData,
)
from app.services.incident_service import incident_service

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.post(
    "/analyze",
    response_model=APIResponse[IncidentAnalyzeResult],
    status_code=status.HTTP_201_CREATED,
    summary="Analyze Incident",
    description="Validate request, create incident in PostgreSQL, recall memories from Hindsight, query Groq AI SRE, and store diagnosis.",
)
def analyze_incident(
    payload: IncidentAnalyzeRequest,
    db: Session = Depends(get_db),
):
    result = incident_service.analyze_incident(db, payload)
    return APIResponse[IncidentAnalyzeResult](
        success=True,
        message="Incident analyzed and diagnosis generated successfully",
        data=result,
    )


@router.post(
    "/{incident_id}/confirm",
    response_model=APIResponse[IncidentConfirmResult],
    status_code=status.HTTP_200_OK,
    summary="Confirm Resolution",
    description="Confirm developer-verified incident root cause and resolution, update status to resolved, and retain incident in Hindsight Cloud.",
)
def confirm_resolution(
    incident_id: str,
    payload: IncidentConfirmRequest,
    db: Session = Depends(get_db),
):
    result = incident_service.confirm_resolution(db, incident_id, payload)
    retention_msg = (
        "Resolution confirmed and retained in Hindsight Cloud"
        if result.memory_retained
        else "Resolution confirmed in database, but Hindsight cloud retention was skipped or failed"
    )
    return APIResponse[IncidentConfirmResult](
        success=True,
        message=retention_msg,
        data=result,
    )


@router.get(
    "",
    response_model=APIResponse[PaginatedIncidentsData],
    status_code=status.HTTP_200_OK,
    summary="Get Incidents",
    description="Retrieve paginated list of engineering incidents with search and multi-field filters.",
)
def get_incidents(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for title, service, error message, or code"),
    service: Optional[str] = Query(None, description="Filter by service name"),
    environment: Optional[str] = Query(None, description="Filter by deployment environment"),
    status: Optional[str] = Query(None, description="Filter by status (analyzing, awaiting_confirmation, resolved)"),
    db: Session = Depends(get_db),
):
    data = incident_service.get_incidents(
        db=db,
        page=page,
        limit=limit,
        search=search,
        service=service,
        environment=environment,
        status=status,
    )
    return APIResponse[PaginatedIncidentsData](
        success=True,
        message="Incidents retrieved successfully",
        data=data,
    )


@router.get(
    "/{incident_id}",
    response_model=APIResponse[IncidentResponse],
    status_code=status.HTTP_200_OK,
    summary="Incident Details",
    description="Retrieve full incident details including AI diagnosis, confirmed resolution, and timestamps.",
)
def get_incident_details(
    incident_id: str,
    db: Session = Depends(get_db),
):
    data = incident_service.get_incident_details(db, incident_id)
    return APIResponse[IncidentResponse](
        success=True,
        message="Incident details retrieved successfully",
        data=data,
    )
