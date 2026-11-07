from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.incident import APIResponse
from app.schemas.dashboard import DashboardStatsData
from app.services.incident_service import incident_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/stats",
    response_model=APIResponse[DashboardStatsData],
    status_code=status.HTTP_200_OK,
    summary="Dashboard Statistics",
    description="Calculate live engineering incident statistics, status distributions, timeline, and recent activity from PostgreSQL.",
)
def get_dashboard_stats(db: Session = Depends(get_db)):
    data = incident_service.get_dashboard_stats(db)
    return APIResponse[DashboardStatsData](
        success=True,
        message="Dashboard statistics calculated successfully",
        data=data,
    )
