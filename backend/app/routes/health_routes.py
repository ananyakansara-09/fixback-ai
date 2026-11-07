from typing import Dict, Any
from fastapi import APIRouter, status

from app.database.connection import check_db_health
from app.services.hindsight_service import hindsight_service
from app.services.groq_service import groq_service
from app.schemas.incident import APIResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=APIResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Check database connectivity and report actual Hindsight Cloud and Groq AI readiness.",
)
def get_health():
    db_ok, db_message = check_db_health()
    hindsight_info = hindsight_service.check_health()
    groq_info = groq_service.check_health()

    overall_status = "healthy" if db_ok else "degraded"

    health_data = {
        "status": overall_status,
        "database": {
            "connected": db_ok,
            "message": db_message,
        },
        "hindsight": hindsight_info,
        "groq": groq_info,
    }

    return APIResponse[Dict[str, Any]](
        success=db_ok,
        message=f"FixBack AI Backend is {overall_status}",
        data=health_data,
    )
